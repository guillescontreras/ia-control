// Lambda: ia-control-access-log-api
// Función: API para consultar logs de accesos y empleados

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(dynamoClient);

const LOGS_TABLE = 'ia-control-logs';
const EMPLOYEES_TABLE = 'ia-control-employees';
const ALERTS_TABLE = 'ia-control-alerts';

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  
  const { httpMethod, path, queryStringParameters } = event;
  
  try {
    // GET /logs - Obtener logs de accesos
    if (httpMethod === 'GET' && path === '/logs') {
      const limit = queryStringParameters?.limit ? parseInt(queryStringParameters.limit) : 50;
      const empleadoId = queryStringParameters?.empleadoId;
      
      let result;
      if (empleadoId) {
        // Consultar por empleado específico
        result = await dynamo.send(new QueryCommand({
          TableName: LOGS_TABLE,
          IndexName: 'empleadoId-timestamp-index',
          KeyConditionExpression: 'empleadoId = :empleadoId',
          ExpressionAttributeValues: {
            ':empleadoId': empleadoId
          },
          Limit: limit,
          ScanIndexForward: false // Más recientes primero
        }));
      } else {
        // Scan general (últimos registros)
        result = await dynamo.send(new ScanCommand({
          TableName: LOGS_TABLE,
          Limit: limit
        }));
        
        // Ordenar por timestamp descendente
        result.Items = result.Items.sort((a, b) => b.timestamp - a.timestamp);
      }
      
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          logs: result.Items,
          count: result.Items.length
        })
      };
    }
    
    // GET /employees - Obtener lista de empleados
    if (httpMethod === 'GET' && path === '/employees') {
      const result = await dynamo.send(new ScanCommand({
        TableName: EMPLOYEES_TABLE
      }));
      
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          employees: result.Items,
          count: result.Items.length
        })
      };
    }
    
    // GET /employees/{id} - Obtener empleado específico
    if (httpMethod === 'GET' && path.startsWith('/employees/')) {
      const empleadoId = path.split('/')[2];
      
      const result = await dynamo.send(new GetCommand({
        TableName: EMPLOYEES_TABLE,
        Key: { empleadoId }
      }));
      
      if (!result.Item) {
        return {
          statusCode: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'Empleado no encontrado' })
        };
      }
      
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result.Item)
      };
    }
    
    // PUT /employees/{id} - Actualizar empleado
    if (httpMethod === 'PUT' && path.startsWith('/employees/')) {
      const empleadoId = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');
      
      await dynamo.send(new UpdateCommand({
        TableName: EMPLOYEES_TABLE,
        Key: { empleadoId },
        UpdateExpression: 'SET nombre = :nombre, apellido = :apellido, departamento = :departamento',
        ExpressionAttributeValues: {
          ':nombre': body.nombre,
          ':apellido': body.apellido,
          ':departamento': body.departamento
        }
      }));
      
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Empleado actualizado exitosamente' })
      };
    }
    
    // DELETE /employees/{id} - Eliminar empleado
    if (httpMethod === 'DELETE' && path.startsWith('/employees/')) {
      const empleadoId = path.split('/')[2];
      
      await dynamo.send(new DeleteCommand({
        TableName: EMPLOYEES_TABLE,
        Key: { empleadoId }
      }));
      
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Empleado eliminado exitosamente' })
      };
    }
    
    // GET /alerts - Obtener alertas
    if (httpMethod === 'GET' && path === '/alerts') {
      const limit = queryStringParameters?.limit ? parseInt(queryStringParameters.limit) : 50;
      const resuelta = queryStringParameters?.resuelta;
      
      const result = await dynamo.send(new ScanCommand({
        TableName: ALERTS_TABLE,
        Limit: limit,
        FilterExpression: resuelta !== undefined ? 'resuelta = :resuelta' : undefined,
        ExpressionAttributeValues: resuelta !== undefined ? {
          ':resuelta': resuelta === 'true'
        } : undefined
      }));
      
      // Ordenar por timestamp descendente
      result.Items = result.Items.sort((a, b) => b.timestamp - a.timestamp);
      
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          alerts: result.Items,
          count: result.Items.length
        })
      };
    }
    
    // GET /stats - Obtener estadísticas del día
    if (httpMethod === 'GET' && path === '/stats') {
      // Calcular últimas 24 horas para incluir todos los registros de hoy
      const ahora = Date.now();
      const hace24h = ahora - (24 * 60 * 60 * 1000);
      
      // Obtener logs de últimas 24 horas
      const logsResult = await dynamo.send(new ScanCommand({
        TableName: LOGS_TABLE,
        FilterExpression: '#ts >= :hace24h',
        ExpressionAttributeNames: {
          '#ts': 'timestamp'
        },
        ExpressionAttributeValues: {
          ':hace24h': hace24h
        }
      }));
      
      // Obtener alertas de últimas 24 horas
      const alertsResult = await dynamo.send(new ScanCommand({
        TableName: ALERTS_TABLE,
        FilterExpression: '#ts >= :hace24h AND resuelta = :resuelta',
        ExpressionAttributeNames: {
          '#ts': 'timestamp'
        },
        ExpressionAttributeValues: {
          ':hace24h': hace24h,
          ':resuelta': false
        }
      }));
      
      const ingresos = logsResult.Items.filter(log => log.tipo === 'ingreso').length;
      const egresos = logsResult.Items.filter(log => log.tipo === 'egreso').length;
      const presentes = ingresos - egresos;
      
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          ingresos,
          egresos,
          presentes: Math.max(0, presentes),
          alertas: alertsResult.Items.length
        })
      };
    }
    
    // Ruta no encontrada
    return {
      statusCode: 404,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Ruta no encontrada' })
    };
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Error interno del servidor',
        details: error.message
      })
    };
  }
};
