// Lambda: ia-control-video-processor
// Función: Procesar frames de video, identificar personas y detectar objetos

import { RekognitionClient, SearchFacesByImageCommand, DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const rekognition = new RekognitionClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(dynamoClient);
const sns = new SNSClient({ region: 'us-east-1' });

const COLLECTION_ID = 'ia-control-employees';
const LOGS_TABLE = 'ia-control-logs';
const ALERTS_TABLE = 'ia-control-alerts';
const CAMERAS_TABLE = 'ia-control-cameras';
const SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:825765382487:ia-control-alerts';

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };
  
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { imageBase64, cameraId, imageKey } = body;
    
    if (!imageBase64 || !cameraId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'imageBase64 y cameraId son requeridos' })
      };
    }
    
    const timestamp = Date.now();
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    
    // Obtener información de la cámara
    let cameraInfo;
    try {
      const cameraResponse = await dynamo.send(new GetCommand({
        TableName: CAMERAS_TABLE,
        Key: { cameraId }
      }));
      cameraInfo = cameraResponse.Item;
    } catch (error) {
      console.log('No se pudo obtener info de cámara:', error.message);
      cameraInfo = { accessType: 'general' };
    }
    
    const accessType = cameraInfo?.accessType || 'general';
    
    // 1. Buscar rostro en colección
    let faceResponse;
    let faceDetected = false;
    try {
      faceResponse = await rekognition.send(new SearchFacesByImageCommand({
        CollectionId: COLLECTION_ID,
        Image: { Bytes: imageBuffer },
        FaceMatchThreshold: 95,
        MaxFaces: 1
      }));
      faceDetected = true;
    } catch (error) {
      if (error.name === 'InvalidParameterException' && error.message.includes('no faces')) {
        console.log('No se detectó ningún rostro en la imagen');
        faceDetected = false;
      } else {
        console.log('Error en búsqueda de rostro:', error.message);
        faceDetected = false;
      }
      faceResponse = { FaceMatches: [] };
    }
    
    // 2. Detectar objetos
    let labelResponse;
    try {
      labelResponse = await rekognition.send(new DetectLabelsCommand({
        Image: { Bytes: imageBuffer },
        MaxLabels: 10,
        MinConfidence: 80
      }));
    } catch (error) {
      console.log('Error detectando objetos:', error.message);
      labelResponse = { Labels: [] };
    }
    
    const objetos = labelResponse.Labels ? labelResponse.Labels.map(l => l.Name) : [];
    
    // 3. Procesar resultado
    if (faceResponse.FaceMatches && faceResponse.FaceMatches.length > 0) {
      // Persona reconocida
      const empleadoId = faceResponse.FaceMatches[0].Face.ExternalImageId;
      const confianza = faceResponse.FaceMatches[0].Similarity;
      
      console.log(`Persona reconocida: ${empleadoId} (${confianza.toFixed(2)}%)`);
      
      // Registrar acceso en DynamoDB
      const tipoAcceso = accessType === 'ingreso' ? 'ingreso' : 
                         accessType === 'egreso' ? 'egreso' : 'general';
      
      await dynamo.send(new PutCommand({
        TableName: LOGS_TABLE,
        Item: {
          timestamp,
          empleadoId,
          cameraId,
          tipo: tipoAcceso,
          objetos,
          confianza: Math.round(confianza),
          imageUrl: imageKey ? `https://ia-control-coirontech.s3.us-east-1.amazonaws.com/${imageKey}` : null
        }
      }));
      
      // Verificar objetos restringidos al salir
      const objetosRestringidos = ['Laptop', 'Computer', 'Tool', 'Equipment', 'Backpack'];
      const objetosDetectados = objetos.filter(obj => 
        objetosRestringidos.some(rest => obj.toLowerCase().includes(rest.toLowerCase()))
      );
      
      if (accessType === 'egreso' && objetosDetectados.length > 0) {
        console.log(`⚠️ Alerta: ${empleadoId} saliendo con objetos restringidos`);
        
        // Enviar alerta SNS
        await sns.send(new PublishCommand({
          TopicArn: SNS_TOPIC_ARN,
          Subject: `🚨 Alerta: ${empleadoId} saliendo con equipo`,
          Message: `Empleado: ${empleadoId}\nCámara: ${cameraId}\nObjetos detectados: ${objetosDetectados.join(', ')}\nConfianza: ${confianza.toFixed(2)}%\nFecha: ${new Date(timestamp).toLocaleString()}`
        }));
        
        // Guardar alerta en DynamoDB
        await dynamo.send(new PutCommand({
          TableName: ALERTS_TABLE,
          Item: {
            alertId: `ALERT-${timestamp}`,
            timestamp,
            tipo: 'objeto_restringido',
            cameraId,
            empleadoId,
            descripcion: `${empleadoId} saliendo con: ${objetosDetectados.join(', ')}`,
            objetos: objetosDetectados,
            resuelta: false,
            imageUrl: imageKey ? `https://ia-control-coirontech.s3.us-east-1.amazonaws.com/${imageKey}` : null
          }
        }));
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          tipo: 'autorizado',
          empleadoId,
          confianza: Math.round(confianza),
          objetos,
          alerta: objetosDetectados.length > 0
        })
      };
      
    } else if (faceDetected) {
      // Rostro detectado pero no reconocido
      console.log('⚠️ Persona no autorizada detectada');
      
      // Enviar alerta SNS
      await sns.send(new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Subject: '🚨 Alerta: Persona no autorizada',
        Message: `Rostro no reconocido detectado\nCámara: ${cameraId}\nFecha: ${new Date(timestamp).toLocaleString()}\nObjetos visibles: ${objetos.join(', ')}`
      }));
      
      // Guardar alerta en DynamoDB
      await dynamo.send(new PutCommand({
        TableName: ALERTS_TABLE,
        Item: {
          alertId: `ALERT-${timestamp}`,
          timestamp,
          tipo: 'no_autorizado',
          cameraId,
          descripcion: 'Rostro no reconocido',
          objetos,
          resuelta: false,
          imageUrl: imageKey ? `https://ia-control-coirontech.s3.us-east-1.amazonaws.com/${imageKey}` : null
        }
      }));
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          tipo: 'no_autorizado',
          objetos,
          alerta: true
        })
      };
    } else {
      // No hay rostros en la imagen
      console.log('No hay personas en la imagen');
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          tipo: 'sin_personas',
          objetos
        })
      };
    }
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Error procesando video',
        details: error.message
      })
    };
  }
};
