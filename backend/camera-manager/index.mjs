// Lambda: ia-control-camera-manager
// Función: Gestionar configuración de cámaras

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(dynamoClient);

const CAMERAS_TABLE = 'ia-control-cameras';

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };
  
  try {
    const httpMethod = event.httpMethod || event.requestContext?.http?.method;
    const path = event.path || event.requestContext?.http?.path;
    
    // GET /cameras - Listar todas las cámaras
    if (httpMethod === 'GET' && path === '/cameras') {
      const result = await dynamo.send(new ScanCommand({
        TableName: CAMERAS_TABLE
      }));
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ cameras: result.Items || [] })
      };
    }
    
    // POST /cameras - Crear nueva cámara
    if (httpMethod === 'POST' && path === '/cameras') {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      const { cameraId, name, location, type, url, status } = body;
      
      if (!cameraId || !name) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'cameraId y name son requeridos' })
        };
      }
      
      const camera = {
        cameraId,
        name,
        location: location || '',
        type: type || 'ip',
        url: url || '',
        status: status || 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await dynamo.send(new PutCommand({
        TableName: CAMERAS_TABLE,
        Item: camera
      }));
      
      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify(camera)
      };
    }
    
    // DELETE /cameras/{id} - Eliminar cámara
    if (httpMethod === 'DELETE' && path.startsWith('/cameras/')) {
      const cameraId = path.split('/')[2];
      
      await dynamo.send(new DeleteCommand({
        TableName: CAMERAS_TABLE,
        Key: { cameraId }
      }));
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Cámara eliminada' })
      };
    }
    
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Ruta no encontrada' })
    };
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Error en camera-manager',
        details: error.message
      })
    };
  }
};
