// Lambda: ia-control-access-register
// Función: Registrar acceso (ingreso/egreso) seleccionado por el usuario

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(dynamoClient);

const LOGS_TABLE = 'ia-control-logs';

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { empleadoId, cameraId, accessType, timestamp } = body;
    
    if (!empleadoId || !cameraId || !accessType) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'empleadoId, cameraId y accessType son requeridos' })
      };
    }
    
    // Registrar acceso en DynamoDB
    await dynamo.send(new PutCommand({
      TableName: LOGS_TABLE,
      Item: {
        timestamp: timestamp || Date.now(),
        empleadoId,
        cameraId,
        tipo: accessType,
        confianza: 100,
        objetos: []
      }
    }));
    
    console.log(`✅ Acceso registrado: ${empleadoId} - ${accessType}`);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: `${accessType} registrado correctamente`,
        empleadoId,
        accessType
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Error registrando acceso',
        details: error.message
      })
    };
  }
};
