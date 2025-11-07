#!/bin/bash

# Script para crear y desplegar Lambdas del Sistema de Control de Accesos
# Prefijo: ia-control-

set -e

echo "🚀 Desplegando Lambdas del Sistema de Control de Accesos..."
echo ""

REGION="us-east-1"
ACCOUNT_ID="825765382487"

# 1. Crear Lambda: ia-control-face-indexer
echo "📦 Desplegando ia-control-face-indexer..."
cd ../backend/face-indexer

# Crear zip
zip -q -r function.zip index.mjs package.json

# Crear o actualizar Lambda
aws lambda create-function \
  --function-name ia-control-face-indexer \
  --runtime nodejs20.x \
  --role arn:aws:iam::$ACCOUNT_ID:role/ia-control-face-indexer-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 512 \
  --region $REGION \
  2>/dev/null || \
aws lambda update-function-code \
  --function-name ia-control-face-indexer \
  --zip-file fileb://function.zip \
  --region $REGION

echo "✅ ia-control-face-indexer desplegada"
rm function.zip

# 2. Crear Lambda: ia-control-video-processor
echo "📦 Desplegando ia-control-video-processor..."
cd ../video-processor

zip -q -r function.zip index.mjs package.json

aws lambda create-function \
  --function-name ia-control-video-processor \
  --runtime nodejs20.x \
  --role arn:aws:iam::$ACCOUNT_ID:role/ia-control-video-processor-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --memory-size 1024 \
  --region $REGION \
  2>/dev/null || \
aws lambda update-function-code \
  --function-name ia-control-video-processor \
  --zip-file fileb://function.zip \
  --region $REGION

echo "✅ ia-control-video-processor desplegada"
rm function.zip

# 3. Crear Lambda: ia-control-access-log-api
echo "📦 Desplegando ia-control-access-log-api..."
cd ../access-log-api

zip -q -r function.zip index.mjs package.json

aws lambda create-function \
  --function-name ia-control-access-log-api \
  --runtime nodejs20.x \
  --role arn:aws:iam::$ACCOUNT_ID:role/ia-control-video-processor-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 512 \
  --region $REGION \
  2>/dev/null || \
aws lambda update-function-code \
  --function-name ia-control-access-log-api \
  --zip-file fileb://function.zip \
  --region $REGION

echo "✅ ia-control-access-log-api desplegada"
rm function.zip

cd ../../infrastructure

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Todas las Lambdas desplegadas exitosamente"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Lambdas creadas:"
echo "  • ia-control-face-indexer (registrar empleados)"
echo "  • ia-control-video-processor (procesar video)"
echo "  • ia-control-access-log-api (API de consultas)"
echo ""
echo "🎯 Próximo paso: Configurar API Gateway"
echo ""
