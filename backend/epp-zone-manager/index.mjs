import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));

const ZONES_TABLE = "ia-control-epp-zones";

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const path = event.path;
    const method = event.httpMethod;

    // POST /epp-zones - Crear zona
    if (method === 'POST' && path === '/epp-zones') {
      const { zoneName, description, requiredEPP, criticalEPP, complianceThreshold } = JSON.parse(event.body);

      const zoneId = `ZONE-${uuidv4().substring(0, 8).toUpperCase()}`;
      const now = Date.now();

      await dynamoClient.send(new PutCommand({
        TableName: ZONES_TABLE,
        Item: {
          zoneId,
          zoneName,
          description: description || '',
          requiredEPP: requiredEPP || {
            helmet: false,
            vest: false,
            faceCover: false,
            handCover: false
          },
          criticalEPP: criticalEPP || [],
          complianceThreshold: complianceThreshold || 80,
          cameras: [],
          createdAt: now,
          updatedAt: now
        }
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Zona creada exitosamente',
          zoneId
        })
      };
    }

    // GET /epp-zones - Listar zonas
    if (method === 'GET' && path === '/epp-zones') {
      const response = await dynamoClient.send(new ScanCommand({
        TableName: ZONES_TABLE
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          zones: response.Items || []
        })
      };
    }

    // GET /epp-zones/{zoneId} - Obtener zona específica
    if (method === 'GET' && path.startsWith('/epp-zones/') && path.split('/').length === 3) {
      const zoneId = path.split('/')[2];

      const response = await dynamoClient.send(new GetCommand({
        TableName: ZONES_TABLE,
        Key: { zoneId }
      }));

      if (!response.Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Zona no encontrada' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.Item)
      };
    }

    // PUT /epp-zones/{zoneId} - Actualizar zona
    if (method === 'PUT' && path.startsWith('/epp-zones/') && path.split('/').length === 3) {
      const zoneId = path.split('/')[2];
      const { zoneName, description, requiredEPP, criticalEPP, complianceThreshold, cameras } = JSON.parse(event.body);

      const updateExpression = [];
      const expressionAttributeValues = {};
      const expressionAttributeNames = {};

      if (zoneName) {
        updateExpression.push('#zoneName = :zoneName');
        expressionAttributeNames['#zoneName'] = 'zoneName';
        expressionAttributeValues[':zoneName'] = zoneName;
      }

      if (description !== undefined) {
        updateExpression.push('#description = :description');
        expressionAttributeNames['#description'] = 'description';
        expressionAttributeValues[':description'] = description;
      }

      if (requiredEPP) {
        updateExpression.push('#requiredEPP = :requiredEPP');
        expressionAttributeNames['#requiredEPP'] = 'requiredEPP';
        expressionAttributeValues[':requiredEPP'] = requiredEPP;
      }

      if (criticalEPP) {
        updateExpression.push('#criticalEPP = :criticalEPP');
        expressionAttributeNames['#criticalEPP'] = 'criticalEPP';
        expressionAttributeValues[':criticalEPP'] = criticalEPP;
      }

      if (complianceThreshold !== undefined) {
        updateExpression.push('#complianceThreshold = :complianceThreshold');
        expressionAttributeNames['#complianceThreshold'] = 'complianceThreshold';
        expressionAttributeValues[':complianceThreshold'] = complianceThreshold;
      }

      if (cameras) {
        updateExpression.push('#cameras = :cameras');
        expressionAttributeNames['#cameras'] = 'cameras';
        expressionAttributeValues[':cameras'] = cameras;
      }

      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = Date.now();

      await dynamoClient.send(new UpdateCommand({
        TableName: ZONES_TABLE,
        Key: { zoneId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Zona actualizada exitosamente' })
      };
    }

    // DELETE /epp-zones/{zoneId} - Eliminar zona
    if (method === 'DELETE' && path.startsWith('/epp-zones/') && path.split('/').length === 3) {
      const zoneId = path.split('/')[2];

      await dynamoClient.send(new DeleteCommand({
        TableName: ZONES_TABLE,
        Key: { zoneId }
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Zona eliminada exitosamente' })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Ruta no encontrada' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
