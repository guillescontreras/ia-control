# Guía de Implementación - Sistema de Control de Accesos

## 📋 Fase 1: Proof of Concept (ACTUAL)

### ✅ Completado

- [x] Estructura de proyecto creada
- [x] Lambdas backend desarrolladas
- [x] Scripts de infraestructura creados

### 🎯 Próximos Pasos

## Paso 1: Configurar Recursos AWS

```bash
cd infrastructure
./setup-aws-resources.sh
```

**Esto creará:**
- ✅ Rekognition Collection: `ia-control-employees`
- ✅ Tablas DynamoDB: `ia-control-logs`, `ia-control-employees`, `ia-control-alerts`
- ✅ SNS Topic: `ia-control-alerts`
- ✅ Estructura S3: `ia-control-coirontech/ia-control/`
- ✅ Roles IAM para Lambdas

**Tiempo estimado:** 5-10 minutos

---

## Paso 2: Configurar Permisos IAM

Las Lambdas necesitan permisos adicionales. Ejecutar:

```bash
# Política para ia-control-video-processor-role
aws iam put-role-policy \
  --role-name ia-control-video-processor-role \
  --policy-name ia-control-video-processor-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "rekognition:SearchFacesByImage",
          "rekognition:DetectLabels"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ],
        "Resource": [
          "arn:aws:dynamodb:us-east-1:825765382487:table/ia-control-logs",
          "arn:aws:dynamodb:us-east-1:825765382487:table/ia-control-logs/index/*",
          "arn:aws:dynamodb:us-east-1:825765382487:table/ia-control-alerts"
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "sns:Publish"
        ],
        "Resource": "arn:aws:sns:us-east-1:825765382487:ia-control-alerts"
      }
    ]
  }'

# Política para ia-control-face-indexer-role
aws iam put-role-policy \
  --role-name ia-control-face-indexer-role \
  --policy-name ia-control-face-indexer-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "rekognition:IndexFaces"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject"
        ],
        "Resource": "arn:aws:s3:::ia-control-coirontech/ia-control/*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:PutItem"
        ],
        "Resource": "arn:aws:dynamodb:us-east-1:825765382487:table/ia-control-employees"
      }
    ]
  }'
```

**Tiempo estimado:** 2 minutos

---

## Paso 3: Desplegar Lambdas

```bash
cd infrastructure
./deploy-lambdas.sh
```

**Esto desplegará:**
- ✅ `ia-control-face-indexer`
- ✅ `ia-control-video-processor`
- ✅ `ia-control-access-log-api`

**Tiempo estimado:** 5 minutos

---

## Paso 4: Configurar API Gateway

```bash
# Crear API REST
API_ID=$(aws apigateway create-rest-api \
  --name ia-control-api \
  --description "API para Sistema de Control de Accesos" \
  --region us-east-1 \
  --output text \
  --query 'id')

echo "API ID: $API_ID"

# Obtener root resource ID
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region us-east-1 \
  --output text \
  --query 'items[0].id')

# Crear recursos y métodos
# /register-employee
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part register-employee \
  --region us-east-1

# /process-frame
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part process-frame \
  --region us-east-1

# /logs
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part logs \
  --region us-east-1

# /employees
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part employees \
  --region us-east-1

# /alerts
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part alerts \
  --region us-east-1

# /stats
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part stats \
  --region us-east-1
```

**Nota:** Este paso puede ser complejo. Considerar usar AWS Console para configurar API Gateway visualmente.

**Tiempo estimado:** 15-20 minutos

---

## Paso 5: Probar con Imágenes Estáticas

### 5.1 Registrar Empleado de Prueba

```bash
# Subir foto a S3
aws s3 cp /path/to/photo.jpg s3://ia-control-coirontech/ia-control/employee-faces/EMP001.jpg

# Invocar Lambda para indexar
aws lambda invoke \
  --function-name ia-control-face-indexer \
  --payload '{
    "body": "{\"empleadoId\":\"EMP001\",\"nombre\":\"Guillermo\",\"apellido\":\"Contreras\",\"departamento\":\"IT\",\"imageKey\":\"ia-control/employee-faces/EMP001.jpg\"}"
  }' \
  --region us-east-1 \
  response.json

cat response.json
```

### 5.2 Probar Identificación

```bash
# Convertir imagen a base64
IMAGE_BASE64=$(base64 -i /path/to/test-photo.jpg)

# Invocar Lambda de procesamiento
aws lambda invoke \
  --function-name ia-control-video-processor \
  --payload "{
    \"frameBytes\": \"$IMAGE_BASE64\",
    \"cameraId\": \"entrada\"
  }" \
  --region us-east-1 \
  response.json

cat response.json
```

### 5.3 Consultar Logs

```bash
aws lambda invoke \
  --function-name ia-control-access-log-api \
  --payload '{
    "httpMethod": "GET",
    "path": "/logs",
    "queryStringParameters": {"limit": "10"}
  }' \
  --region us-east-1 \
  response.json

cat response.json
```

**Tiempo estimado:** 30 minutos

---

## Paso 6: Configurar Alertas SNS

```bash
# Suscribir email a SNS Topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:825765382487:ia-control-alerts \
  --protocol email \
  --notification-endpoint tu-email@coirontech.com \
  --region us-east-1

# Confirmar suscripción desde el email recibido
```

**Tiempo estimado:** 5 minutos

---

## 📊 Verificación de Fase 1

### Checklist

- [ ] Rekognition Collection creada y funcional
- [ ] Tablas DynamoDB creadas
- [ ] Lambdas desplegadas y funcionando
- [ ] API Gateway configurada
- [ ] Empleado de prueba indexado exitosamente
- [ ] Identificación facial funciona (>95% confianza)
- [ ] Logs se guardan en DynamoDB
- [ ] Alertas SNS funcionan

### Comandos de Verificación

```bash
# Verificar Collection
aws rekognition describe-collection \
  --collection-id ia-control-employees \
  --region us-east-1

# Verificar tablas DynamoDB
aws dynamodb list-tables --region us-east-1 | grep ia-control

# Verificar Lambdas
aws lambda list-functions --region us-east-1 | grep ia-control

# Verificar SNS Topic
aws sns list-topics --region us-east-1 | grep ia-control
```

---

## 🎯 Próxima Fase: MVP Backend (Semana 2)

Una vez completada la Fase 1, proceder con:

1. **Kinesis Video Streams** para video en tiempo real
2. **Frontend React** básico
3. **Dashboard con estadísticas**
4. **Gestión de empleados UI**

---

## 🐛 Troubleshooting

### Error: "Collection already exists"
**Solución:** La collection ya fue creada. Continuar con siguiente paso.

### Error: "Role does not exist"
**Solución:** Esperar 10 segundos después de crear roles IAM antes de crear Lambdas.

### Error: "Access Denied" en Rekognition
**Solución:** Verificar que el role de Lambda tiene permisos de Rekognition.

### Error: "No face detected"
**Solución:** Asegurar que la foto muestra claramente el rostro, buena iluminación, sin gafas oscuras.

---

## 📞 Soporte

**Documentación completa:** `/LOGS/sistema-control-accesos-propuesta.md`  
**Arquitectura:** `/LOGS/integracion-access-control-propuesta.md`

---

**Última actualización:** 04/11/2025  
**Versión:** 0.1.0 (Proof of Concept)  
**Estado:** Listo para ejecutar Paso 1
