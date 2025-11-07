#!/bin/bash

API_ID="bx2rwg4ogk"
REGION="us-east-1"
ACCOUNT_ID="825765382487"

echo "Configurando endpoints de gestión de usuarios..."

# Obtener root resource ID
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/`].id' --output text)

# Crear recurso /users
USERS_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part users \
  --query 'id' --output text 2>/dev/null || \
  aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/users`].id' --output text)

echo "Users Resource ID: $USERS_RESOURCE_ID"

# POST /users
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE \
  --no-api-key-required

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:ia-control-user-manager/invocations

# GET /users
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE \
  --no-api-key-required

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:ia-control-user-manager/invocations

# Crear recurso /users/{email}
EMAIL_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $USERS_RESOURCE_ID \
  --path-part '{email}' \
  --query 'id' --output text 2>/dev/null || \
  aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/users/{email}`].id' --output text)

# DELETE /users/{email}
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $EMAIL_RESOURCE_ID \
  --http-method DELETE \
  --authorization-type NONE \
  --no-api-key-required

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $EMAIL_RESOURCE_ID \
  --http-method DELETE \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:ia-control-user-manager/invocations

# Permisos Lambda
aws lambda add-permission \
  --function-name ia-control-user-manager \
  --statement-id apigateway-users-post \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/POST/users" 2>/dev/null || true

aws lambda add-permission \
  --function-name ia-control-user-manager \
  --statement-id apigateway-users-get \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/GET/users" 2>/dev/null || true

aws lambda add-permission \
  --function-name ia-control-user-manager \
  --statement-id apigateway-users-delete \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/DELETE/users/*" 2>/dev/null || true

# Deploy
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod

echo ""
echo "✅ Endpoints configurados:"
echo "POST https://$API_ID.execute-api.$REGION.amazonaws.com/prod/users"
echo "GET https://$API_ID.execute-api.$REGION.amazonaws.com/prod/users"
echo "DELETE https://$API_ID.execute-api.$REGION.amazonaws.com/prod/users/{email}"
