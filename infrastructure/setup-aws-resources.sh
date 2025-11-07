#!/bin/bash

# Script de configuración de recursos AWS para Sistema de Control de Accesos
# Prefijo: ia-control-
# Región: us-east-1
# Account: 825765382487

set -e

echo "🚀 Iniciando configuración de recursos AWS para Control de Accesos..."
echo ""

# Variables
REGION="us-east-1"
ACCOUNT_ID="825765382487"
COLLECTION_ID="ia-control-employees"
BUCKET_NAME="ia-control-coirontech"
SNS_TOPIC_NAME="ia-control-alerts"

# 1. Crear Rekognition Face Collection
echo "📸 Creando Rekognition Face Collection: $COLLECTION_ID"
aws rekognition create-collection \
  --collection-id $COLLECTION_ID \
  --region $REGION \
  2>/dev/null || echo "⚠️  Collection ya existe"

echo "✅ Face Collection creada/verificada"
echo ""

# 2. Crear carpeta en S3 para control de accesos
echo "📦 Configurando estructura S3..."
aws s3api put-object \
  --bucket $BUCKET_NAME \
  --key ia-control/ \
  --region $REGION \
  2>/dev/null || echo "⚠️  Carpeta ya existe"

aws s3api put-object \
  --bucket $BUCKET_NAME \
  --key ia-control/employee-faces/ \
  --region $REGION \
  2>/dev/null || echo "⚠️  Carpeta ya existe"

aws s3api put-object \
  --bucket $BUCKET_NAME \
  --key ia-control/video-frames/ \
  --region $REGION \
  2>/dev/null || echo "⚠️  Carpeta ya existe"

aws s3api put-object \
  --bucket $BUCKET_NAME \
  --key ia-control/alerts/ \
  --region $REGION \
  2>/dev/null || echo "⚠️  Carpeta ya existe"

echo "✅ Estructura S3 configurada"
echo ""

# 3. Crear DynamoDB Tables
echo "🗄️  Creando tablas DynamoDB..."

# Tabla: ia-control-logs
echo "  - Creando tabla: ia-control-logs"
aws dynamodb create-table \
  --table-name ia-control-logs \
  --attribute-definitions \
    AttributeName=timestamp,AttributeType=N \
    AttributeName=empleadoId,AttributeType=S \
    AttributeName=cameraId,AttributeType=S \
  --key-schema \
    AttributeName=timestamp,KeyType=HASH \
    AttributeName=empleadoId,KeyType=RANGE \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"empleadoId-timestamp-index\",
        \"KeySchema\": [{\"AttributeName\":\"empleadoId\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"timestamp\",\"KeyType\":\"RANGE\"}],
        \"Projection\":{\"ProjectionType\":\"ALL\"},
        \"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}
      },
      {
        \"IndexName\": \"cameraId-timestamp-index\",
        \"KeySchema\": [{\"AttributeName\":\"cameraId\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"timestamp\",\"KeyType\":\"RANGE\"}],
        \"Projection\":{\"ProjectionType\":\"ALL\"},
        \"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}
      }
    ]" \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION \
  2>/dev/null || echo "⚠️  Tabla ya existe"

# Tabla: ia-control-employees
echo "  - Creando tabla: ia-control-employees"
aws dynamodb create-table \
  --table-name ia-control-employees \
  --attribute-definitions \
    AttributeName=empleadoId,AttributeType=S \
  --key-schema \
    AttributeName=empleadoId,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION \
  2>/dev/null || echo "⚠️  Tabla ya existe"

# Tabla: ia-control-alerts
echo "  - Creando tabla: ia-control-alerts"
aws dynamodb create-table \
  --table-name ia-control-alerts \
  --attribute-definitions \
    AttributeName=alertId,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=alertId,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION \
  2>/dev/null || echo "⚠️  Tabla ya existe"

echo "✅ Tablas DynamoDB creadas/verificadas"
echo ""

# 4. Crear SNS Topic para alertas
echo "📢 Creando SNS Topic: $SNS_TOPIC_NAME"
SNS_TOPIC_ARN=$(aws sns create-topic \
  --name $SNS_TOPIC_NAME \
  --region $REGION \
  --output text \
  --query 'TopicArn' 2>/dev/null || aws sns list-topics --region $REGION --query "Topics[?contains(TopicArn, '$SNS_TOPIC_NAME')].TopicArn" --output text)

echo "✅ SNS Topic ARN: $SNS_TOPIC_ARN"
echo ""

# 5. Crear roles IAM para Lambdas
echo "🔐 Creando roles IAM..."

# Role para video-processor
echo "  - Creando role: ia-control-video-processor-role"
cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name ia-control-video-processor-role \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --region $REGION \
  2>/dev/null || echo "⚠️  Role ya existe"

# Adjuntar políticas
aws iam attach-role-policy \
  --role-name ia-control-video-processor-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  2>/dev/null || true

# Role para face-indexer
echo "  - Creando role: ia-control-face-indexer-role"
aws iam create-role \
  --role-name ia-control-face-indexer-role \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --region $REGION \
  2>/dev/null || echo "⚠️  Role ya existe"

aws iam attach-role-policy \
  --role-name ia-control-face-indexer-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  2>/dev/null || true

echo "✅ Roles IAM creados/verificados"
echo ""

# 6. Resumen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Configuración completada exitosamente"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Recursos creados:"
echo "  • Rekognition Collection: $COLLECTION_ID"
echo "  • S3 Bucket: $BUCKET_NAME/ia-control/"
echo "  • DynamoDB Tables:"
echo "    - ia-control-logs"
echo "    - ia-control-employees"
echo "    - ia-control-alerts"
echo "  • SNS Topic: $SNS_TOPIC_ARN"
echo "  • IAM Roles:"
echo "    - ia-control-video-processor-role"
echo "    - ia-control-face-indexer-role"
echo ""
echo "🎯 Próximos pasos:"
echo "  1. Desplegar Lambdas (cd backend/*/)"
echo "  2. Configurar API Gateway"
echo "  3. Desplegar Frontend"
echo ""
