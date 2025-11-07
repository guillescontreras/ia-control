// Lambda: ia-control-face-indexer
// Función: Registrar empleados e indexar rostros en Rekognition

import { RekognitionClient, IndexFacesCommand } from '@aws-sdk/client-rekognition';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const rekognition = new RekognitionClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(dynamoClient);
const s3 = new S3Client({ region: 'us-east-1' });

const COLLECTION_ID = 'ia-control-employees';
const TABLE_NAME = 'ia-control-employees';
const BUCKET_NAME = 'ia-control-coirontech';

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { empleadoId, nombre, apellido, departamento, imageKey, imageKeys } = body;
    
    // Validar campos requeridos
    if (!empleadoId || !nombre || !apellido || !imageKey) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST,OPTIONS' },
        body: JSON.stringify({ 
          error: 'Campos requeridos: empleadoId, nombre, apellido, imageKey' 
        })
      };
    }
    
    console.log(`Indexando rostro(s) para empleado: ${empleadoId}`);
    
    // 1. Indexar todos los rostros en Rekognition
    const keysToIndex = imageKeys || [imageKey];
    const faceIds = [];
    let mainFaceId = null;
    let mainFaceQuality = null;
    
    for (const key of keysToIndex) {
      try {
        const indexResponse = await rekognition.send(new IndexFacesCommand({
          CollectionId: COLLECTION_ID,
          Image: {
            S3Object: {
              Bucket: BUCKET_NAME,
              Name: key
            }
          },
          ExternalImageId: empleadoId,
          DetectionAttributes: ['ALL'],
          MaxFaces: 1,
          QualityFilter: 'AUTO'
        }));
        
        if (indexResponse.FaceRecords && indexResponse.FaceRecords.length > 0) {
          const faceId = indexResponse.FaceRecords[0].Face.FaceId;
          faceIds.push(faceId);
          
          if (!mainFaceId) {
            mainFaceId = faceId;
            mainFaceQuality = indexResponse.FaceRecords[0].FaceDetail;
          }
          
          console.log(`Rostro indexado: ${faceId} desde ${key}`);
        }
      } catch (error) {
        console.error(`Error indexando ${key}:`, error.message);
      }
    }
    
    if (faceIds.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST,OPTIONS' },
        body: JSON.stringify({ 
          error: 'No se detectó rostro en ninguna imagen. Asegúrate de que las fotos muestren claramente el rostro.' 
        })
      };
    }
    
    const faceId = mainFaceId;
    const faceQuality = mainFaceQuality;
    
    console.log(`${faceIds.length} rostro(s) indexado(s) exitosamente para ${empleadoId}`);
    
    // 2. Guardar empleado en DynamoDB
    const timestamp = Date.now();
    await dynamo.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        empleadoId,
        nombre,
        apellido,
        faceId,
        faceIds, // Todos los FaceIds
        departamento: departamento || 'General',
        activo: true,
        fechaAlta: timestamp,
        imageUrl: `https://ia-control-coirontech.s3.us-east-1.amazonaws.com/${imageKey}`,
        imageUrls: keysToIndex.map(k => `https://ia-control-coirontech.s3.us-east-1.amazonaws.com/${k}`),
        faceQuality: {
          brightness: faceQuality.Quality?.Brightness,
          sharpness: faceQuality.Quality?.Sharpness
        },
        totalFaces: faceIds.length
      }
    }));
    
    console.log(`Empleado guardado en DynamoDB: ${empleadoId}`);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST,OPTIONS' },
      body: JSON.stringify({
        message: `Empleado registrado exitosamente con ${faceIds.length} foto(s)`,
        empleadoId,
        faceId,
        faceIds,
        totalFaces: faceIds.length,
        nombre: `${nombre} ${apellido}`,
        calidad: {
          brightness: faceQuality.Quality?.Brightness?.toFixed(2),
          sharpness: faceQuality.Quality?.Sharpness?.toFixed(2)
        }
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST,OPTIONS' },
      body: JSON.stringify({
        error: 'Error al registrar empleado',
        details: error.message
      })
    };
  }
};
