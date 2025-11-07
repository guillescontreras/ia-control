#!/bin/bash

# Script para crear API Gateway para el frontend

set -e

echo "🚀 Creando API Gateway para Control de Accesos..."
echo ""

REGION="us-east-1"
ACCOUNT_ID="825765382487"

# Crear API REST
echo "📡 Creando API REST..."
API_ID=$(aws apigateway create-rest-api \
  --name ia-control-api \
  --description "API para Sistema de Control de Accesos" \
  --region $REGION \
  --endpoint-configuration types=REGIONAL \
  --output text \
  --query 'id' 2>/dev/null || aws apigateway get-rest-apis --region $REGION --query "items[?name=='ia-control-api'].id" --output text)

echo "✅ API ID: $API_ID"

# Obtener root resource
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --output text \
  --query 'items[0].id')

echo "✅ Root Resource ID: $ROOT_ID"

# Función para crear recurso y método
create_resource_and_method() {
  local PATH_PART=$1
  local LAMBDA_NAME=$2
  local HTTP_METHOD=$3
  
  echo "  - Creando recurso: /$PATH_PART"
  
  # Crear recurso
  RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part $PATH_PART \
    --region $REGION \
    --output text \
    --query 'id' 2>/dev/null || aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query "items[?pathPart=='$PATH_PART'].id" --output text)
  
  # Crear método
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --authorization-type NONE \
    --region $REGION \
    2>/dev/null || true
  
  # Integración con Lambda
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$LAMBDA_NAME/invocations" \
    --region $REGION \
    2>/dev/null || true
  
  # Dar permiso a API Gateway para invocar Lambda
  aws lambda add-permission \
    --function-name $LAMBDA_NAME \
    --statement-id apigateway-$PATH_PART-$HTTP_METHOD \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/$HTTP_METHOD/$PATH_PART" \
    --region $REGION \
    2>/dev/null || true
  
  # Habilitar CORS
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION \
    2>/dev/null || true
  
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\": 200}"}' \
    --region $REGION \
    2>/dev/null || true
  
  aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}' \
    --region $REGION \
    2>/dev/null || true
  
  aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
    --region $REGION \
    2>/dev/null || true
}

# Crear recursos
echo "📋 Creando recursos y métodos..."
create_resource_and_method "register-employee" "ia-control-face-indexer" "POST"
create_resource_and_method "process-frame" "ia-control-video-processor" "POST"
create_resource_and_method "logs" "ia-control-access-log-api" "GET"
create_resource_and_method "employees" "ia-control-access-log-api" "GET"
create_resource_and_method "alerts" "ia-control-access-log-api" "GET"
create_resource_and_method "stats" "ia-control-access-log-api" "GET"

# Desplegar API
echo "🚀 Desplegando API..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --region $REGION \
  2>/dev/null || true

API_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/prod"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ API Gateway creada exitosamente"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 API URL: $API_URL"
echo ""
echo "📡 Endpoints disponibles:"
echo "  POST $API_URL/register-employee"
echo "  POST $API_URL/process-frame"
echo "  GET  $API_URL/logs"
echo "  GET  $API_URL/employees"
echo "  GET  $API_URL/alerts"
echo "  GET  $API_URL/stats"
echo ""
echo "🎯 Próximo paso: Configurar frontend con esta URL"
echo ""
