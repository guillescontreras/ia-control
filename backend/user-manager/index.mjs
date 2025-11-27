import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand, AdminDeleteUserCommand, ListUsersCommand, AdminListGroupsForUserCommand, AdminUpdateUserAttributesCommand, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));

const USER_POOL_ID = "us-east-1_mfnduAii4";
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

    // GET /users/{email} - Obtener usuario individual
    if (method === 'GET' && path.startsWith('/users/') && path.split('/').length === 3) {
      const email = decodeURIComponent(path.split('/')[2]);
      
      try {
        // Obtener usuario de Cognito
        const usersResponse = await cognitoClient.send(new ListUsersCommand({
          UserPoolId: USER_POOL_ID,
          Filter: `email = "${email}"`,
          Limit: 1
        }));
        
        if (!usersResponse.Users || usersResponse.Users.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuario no encontrado' })
          };
        }
        
        const user = usersResponse.Users[0];
        const nameAttr = user.Attributes.find(a => a.Name === 'name')?.Value || '';
        const names = nameAttr.split(' ');
        
        // Obtener grupos
        const groupsResponse = await cognitoClient.send(new AdminListGroupsForUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: user.Username
        }));
        
        const isAdmin = groupsResponse.Groups.some(g => g.GroupName === 'ia-control-admins');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            email: email,
            firstName: names[0] || '',
            lastName: names.slice(1).join(' ') || '',
            role: isAdmin ? 'admin' : 'operator'
          })
        };
      } catch (error) {
        console.error('Error obteniendo usuario:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Error obteniendo usuario' })
        };
      }
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

    // POST /users/{email}/change-password - Cambiar contraseña
    if (method === 'POST' && path.includes('/change-password')) {
      const email = decodeURIComponent(path.split('/')[2]);
      const { currentPassword, newPassword } = JSON.parse(event.body);

      // Validar contraseña
      if (!newPassword || newPassword.length < 8) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' })
        };
      }

      try {
        // Cambiar contraseña en Cognito
        await cognitoClient.send(new AdminSetUserPasswordCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
          Password: newPassword,
          Permanent: true
        }));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Contraseña actualizada exitosamente' })
        };
      } catch (error) {
        console.error('Error cambiando contraseña:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Error al cambiar contraseña' })
        };
      }
    }

    // PUT /users/{email} - Actualizar usuario
    if (method === 'PUT' && path.startsWith('/users/') && !path.includes('/change-password')) {
      const email = decodeURIComponent(path.split('/')[2]);
      const body = JSON.parse(event.body);
      const { firstName, lastName, role } = body;
      const newPassword = body.newPassword || body.password; // Aceptar ambos campos

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

      // Actualizar rol (grupos) - solo si viene en el body
      if (role !== undefined && role !== null) {
        console.log('Actualizando rol a:', role);
        // Obtener grupos actuales
        const currentGroupsResponse = await cognitoClient.send(new AdminListGroupsForUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: email
        }));
        
        // Remover de grupos ia-control
        for (const group of currentGroupsResponse.Groups || []) {
          if (group.GroupName === 'ia-control-admins' || group.GroupName === 'ia-control-operators') {
            await cognitoClient.send(new AdminRemoveUserFromGroupCommand({
              UserPoolId: USER_POOL_ID,
              Username: email,
              GroupName: group.GroupName
            }));
            console.log('Removido de grupo:', group.GroupName);
          }
        }
        
        // Agregar al nuevo grupo
        const newGroupName = role === 'admin' ? 'ia-control-admins' : 'ia-control-operators';
        await cognitoClient.send(new AdminAddUserToGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
          GroupName: newGroupName
        }));
        console.log('Agregado a grupo:', newGroupName);
      }

      // Cambiar contraseña
      if (newPassword) {
        console.log('Cambiando contraseña para:', email);
        console.log('Nueva contraseña recibida:', newPassword ? 'SÍ' : 'NO');
        try {
          await cognitoClient.send(new AdminSetUserPasswordCommand({
            UserPoolId: USER_POOL_ID,
            Username: email,
            Password: newPassword,
            Permanent: true
          }));
          console.log('Contraseña cambiada exitosamente en Cognito');
        } catch (pwdError) {
          console.error('Error cambiando contraseña:', pwdError);
          throw pwdError;
        }
      } else {
        console.log('No se recibió newPassword, no se cambiará contraseña');
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
    console.error('Error completo:', JSON.stringify(error, null, 2));
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: error.toString()
      })
    };
  }
};
