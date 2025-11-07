# 🚀 Quick Start - Sistema de Control de Accesos

## Comandos Rápidos de Implementación

### 1️⃣ Setup Inicial (10 min)

```bash
cd /Users/guillermo/Desktop/CoironTech/Coirontech-AWS/Rekognition/access-control-system/infrastructure
./setup-aws-resources.sh
```

### 2️⃣ Configurar Permisos IAM (5 min)

```bash
# Video Processor Role
aws iam put-role-policy \
  --role-name ia-control-video-processor-role \
  --policy-name ia-control-video-processor-policy \
  --policy-document file://policies/video-processor-policy.json

# Face Indexer Role
aws iam put-role-policy \
  --role-name ia-control-face-indexer-role \
  --policy-name ia-control-face-indexer-policy \
  --policy-document file://policies/face-indexer-policy.json
```

### 3️⃣ Desplegar Lambdas (5 min)

```bash
cd /Users/guillermo/Desktop/CoironTech/Coirontech-AWS/Rekognition/access-control-system/infrastructure
./deploy-lambdas.sh
```

### 4️⃣ Registrar Empleado de Prueba (2 min)

```bash
# Subir foto
aws s3 cp ~/Desktop/foto-empleado.jpg \
  s3://ia-control-coirontech/ia-control/employee-faces/EMP001.jpg

# Registrar
aws lambda invoke \
  --function-name ia-control-face-indexer \
  --payload '{"body":"{\"empleadoId\":\"EMP001\",\"nombre\":\"Guillermo\",\"apellido\":\"Contreras\",\"departamento\":\"IT\",\"imageKey\":\"ia-control/employee-faces/EMP001.jpg\"}"}' \
  response.json && cat response.json
```

### 5️⃣ Probar Identificación (2 min)

```bash
# Convertir imagen a base64
IMAGE_BASE64=$(base64 -i ~/Desktop/foto-test.jpg | tr -d '\n')

# Procesar
aws lambda invoke \
  --function-name ia-control-video-processor \
  --payload "{\"frameBytes\":\"$IMAGE_BASE64\",\"cameraId\":\"entrada\"}" \
  response.json && cat response.json
```

### 6️⃣ Ver Logs (1 min)

```bash
aws lambda invoke \
  --function-name ia-control-access-log-api \
  --payload '{"httpMethod":"GET","path":"/logs","queryStringParameters":{"limit":"10"}}' \
  response.json && cat response.json | jq
```

### 7️⃣ Configurar Alertas Email (2 min)

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:825765382487:ia-control-alerts \
  --protocol email \
  --notification-endpoint tu-email@coirontech.com
```

---

## 🔍 Comandos de Verificación

```bash
# Verificar Collection
aws rekognition describe-collection --collection-id ia-control-employees

# Listar rostros indexados
aws rekognition list-faces --collection-id ia-control-employees

# Ver tablas DynamoDB
aws dynamodb list-tables | grep ia-control

# Ver Lambdas
aws lambda list-functions | grep ia-control

# Ver logs de Lambda
aws logs tail /aws/lambda/ia-control-video-processor --follow
```

---

## 🐛 Troubleshooting Rápido

### Error: "Collection already exists"
```bash
# Eliminar y recrear
aws rekognition delete-collection --collection-id ia-control-employees
aws rekognition create-collection --collection-id ia-control-employees
```

### Error: "No face detected"
```bash
# Verificar calidad de imagen
aws rekognition detect-faces \
  --image '{"S3Object":{"Bucket":"ia-control-coirontech","Name":"ia-control/employee-faces/EMP001.jpg"}}' \
  --attributes ALL
```

### Ver logs de error
```bash
aws logs tail /aws/lambda/ia-control-face-indexer --since 10m
```

---

## 📊 Consultas Útiles

### Estadísticas del día
```bash
aws lambda invoke \
  --function-name ia-control-access-log-api \
  --payload '{"httpMethod":"GET","path":"/stats"}' \
  response.json && cat response.json | jq
```

### Alertas activas
```bash
aws lambda invoke \
  --function-name ia-control-access-log-api \
  --payload '{"httpMethod":"GET","path":"/alerts","queryStringParameters":{"resuelta":"false"}}' \
  response.json && cat response.json | jq
```

### Logs de empleado específico
```bash
aws lambda invoke \
  --function-name ia-control-access-log-api \
  --payload '{"httpMethod":"GET","path":"/logs","queryStringParameters":{"empleadoId":"EMP001"}}' \
  response.json && cat response.json | jq
```

---

## 🧹 Limpieza (si necesitas empezar de cero)

```bash
# Eliminar Collection
aws rekognition delete-collection --collection-id ia-control-employees

# Eliminar tablas DynamoDB
aws dynamodb delete-table --table-name ia-control-logs
aws dynamodb delete-table --table-name ia-control-employees
aws dynamodb delete-table --table-name ia-control-alerts

# Eliminar Lambdas
aws lambda delete-function --function-name ia-control-face-indexer
aws lambda delete-function --function-name ia-control-video-processor
aws lambda delete-function --function-name ia-control-access-log-api

# Eliminar SNS Topic
aws sns delete-topic --topic-arn arn:aws:sns:us-east-1:825765382487:ia-control-alerts
```

---

## 📚 Documentación Completa

- **Guía detallada:** `IMPLEMENTATION.md`
- **Propuesta completa:** `/LOGS/sistema-control-accesos-propuesta.md`
- **Integración:** `/LOGS/integracion-access-control-propuesta.md`
- **Resumen inicio:** `/LOGS/implementacion-control-accesos-inicio.md`

---

**Tiempo total estimado:** 30 minutos  
**Resultado:** Proof of Concept funcional
