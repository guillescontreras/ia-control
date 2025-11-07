#!/bin/bash

# Script de prueba del Sistema de Control de Accesos

set -e

echo "🧪 Prueba del Sistema de Control de Accesos"
echo ""

# 1. Verificar que tienes una foto
echo "📸 Paso 1: Necesitas una foto de prueba"
echo ""
echo "Por favor, proporciona la ruta a una foto de rostro:"
read -p "Ruta de la foto: " PHOTO_PATH

if [ ! -f "$PHOTO_PATH" ]; then
  echo "❌ Error: Archivo no encontrado"
  exit 1
fi

echo "✅ Foto encontrada"
echo ""

# 2. Subir foto a S3
echo "📤 Paso 2: Subiendo foto a S3..."
EMPLOYEE_ID="EMP001"
aws s3 cp "$PHOTO_PATH" s3://ia-control-coirontech/employee-faces/${EMPLOYEE_ID}.jpg

echo "✅ Foto subida"
echo ""

# 3. Registrar empleado
echo "👤 Paso 3: Registrando empleado..."
aws lambda invoke \
  --function-name ia-control-face-indexer \
  --payload "{\"body\":\"{\\\"empleadoId\\\":\\\"${EMPLOYEE_ID}\\\",\\\"nombre\\\":\\\"Test\\\",\\\"apellido\\\":\\\"Usuario\\\",\\\"departamento\\\":\\\"IT\\\",\\\"imageKey\\\":\\\"employee-faces/${EMPLOYEE_ID}.jpg\\\"}\"}" \
  --region us-east-1 \
  response.json

echo ""
echo "📋 Respuesta del registro:"
cat response.json | jq
echo ""

# 4. Probar identificación
echo "🔍 Paso 4: Probando identificación facial..."
IMAGE_BASE64=$(base64 -i "$PHOTO_PATH" | tr -d '\n')

aws lambda invoke \
  --function-name ia-control-video-processor \
  --payload "{\"frameBytes\":\"$IMAGE_BASE64\",\"cameraId\":\"entrada\"}" \
  --region us-east-1 \
  response2.json

echo ""
echo "📋 Respuesta de identificación:"
cat response2.json | jq
echo ""

# 5. Ver logs
echo "📊 Paso 5: Consultando logs de accesos..."
aws lambda invoke \
  --function-name ia-control-access-log-api \
  --payload '{"httpMethod":"GET","path":"/logs","queryStringParameters":{"limit":"5"}}' \
  --region us-east-1 \
  response3.json

echo ""
echo "📋 Logs de accesos:"
cat response3.json | jq
echo ""

# 6. Ver estadísticas
echo "📈 Paso 6: Consultando estadísticas..."
aws lambda invoke \
  --function-name ia-control-access-log-api \
  --payload '{"httpMethod":"GET","path":"/stats"}' \
  --region us-east-1 \
  response4.json

echo ""
echo "📋 Estadísticas del día:"
cat response4.json | jq
echo ""

# Limpiar archivos temporales
rm -f response.json response2.json response3.json response4.json

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Prueba completada exitosamente"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Próximos pasos:"
echo "  1. Registrar más empleados"
echo "  2. Configurar alertas SNS"
echo "  3. Desarrollar frontend"
echo ""
