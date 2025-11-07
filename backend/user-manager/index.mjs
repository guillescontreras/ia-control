import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminDeleteUserCommand, ListUsersCommand, AdminListGroupsForUserCommand, AdminUpdateUserAttributesCommand, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));

const USER_POOL_ID = "us-east-1_zrdfN7OKN";
const PROFILES_TABLE = "UserProfiles";

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

    // POST /users - Crear usuario
    if (method === 'POST' && path === '/users') {
      const { email, firstName, lastName, role } = JSON.parse(event.body);

      // Crear usuario en Cognito
      const createUserResponse = await cognitoClient.send(new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "name", Value: `${firstName} ${lastName}` }
        ],
        DesiredDeliveryMediums: ["EMAIL"]
      }));

      const userId = createUserResponse.User.Username;

      // Agregar a grupo
      const groupName = role === 'admin' ? 'ia-control-admins' : 'ia-control-operators';
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        GroupName: groupName
      }));

      // Crear perfil en DynamoDB
      await dynamoClient.send(new PutCommand({
        TableName: PROFILES_TABLE,
        Item: {
          userId: userId,
          email: email,
          firstName: firstName,
          lastName: lastName,
          role: role,
          createdAt: Date.now()
        }
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Usuario creado exitosamente',
          userId: userId,
          email: email
        })
      };
    }

    // GET /users - Listar usuarios
    if (method === 'GET' && path === '/users') {
      const response = await cognitoClient.send(new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Limit: 60
      }));

      // Filtrar solo usuarios con grupos ia-control
      const usersWithGroups = await Promise.all(
        response.Users.map(async (user) => {
          try {
            const groupsResponse = await cognitoClient.send(new AdminListGroupsForUserCommand({
              UserPoolId: USER_POOL_ID,
              Username: user.Username
            }));
            
            const hasIAControlGroup = groupsResponse.Groups.some(g => 
              g.GroupName === 'ia-control-admins' || g.GroupName === 'ia-control-operators'
            );
            
            if (!hasIAControlGroup) return null;
            
            return {
              username: user.Username,
              email: user.Attributes.find(a => a.Name === 'email')?.Value,
              name: user.Attributes.find(a => a.Name === 'name')?.Value,
              status: user.UserStatus,
              enabled: user.Enabled,
              createdAt: user.UserCreateDate
            };
          } catch (error) {
            return null;
          }
        })
      );

      const users = usersWithGroups.filter(u => u !== null);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(users)
      };
    }

    // PUT /users/{email} - Actualizar usuario
    if (method === 'PUT' && path.startsWith('/users/')) {
      const email = decodeURIComponent(path.split('/')[2]);
      const { firstName, lastName, role, newPassword } = JSON.parse(event.body);

      // Actualizar atributos
      if (firstName || lastName) {
        await cognitoClient.send(new AdminUpdateUserAttributesCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
          UserAttributes: [
            { Name: "name", Value: `${firstName} ${lastName}` }
          ]
        }));
      }

      // Cambiar contraseña
      if (newPassword) {
        await cognitoClient.send(new AdminSetUserPasswordCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
          Password: newPassword,
          Permanent: true
        }));
      }

      // Actualizar perfil en DynamoDB
      if (firstName || lastName) {
        await dynamoClient.send(new PutCommand({
          TableName: PROFILES_TABLE,
          Item: {
            userId: email,
            email: email,
            firstName: firstName,
            lastName: lastName,
            updatedAt: Date.now()
          }
        }));
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Usuario actualizado exitosamente' })
      };
    }

    // DELETE /users/{email} - Eliminar usuario
    if (method === 'DELETE' && path.startsWith('/users/')) {
      const email = decodeURIComponent(path.split('/')[2]);

      await cognitoClient.send(new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Usuario eliminado exitosamente' })
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
      body: JSON.stringify({ error: error.message })
    };
  }
};
