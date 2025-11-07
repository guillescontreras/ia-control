# 🚀 Guía de Despliegue - IA-Control

## 📊 Estado Actual

### Producción
- **URL:** https://control.coirontech.com (activándose)
- **URL Temporal:** https://main.d18gqhtetuceh3.amplifyapp.com/
- **Estado:** ✅ Desplegado en AWS Amplify
- **Última actualización:** 07/11/2025

## 🏗️ Infraestructura

### Frontend (AWS Amplify)
```
App ID: d18gqhtetuceh3
Región: us-east-1
Repositorio: https://github.com/guillescontreras/ia-control
Branch: main
Build: Automático en cada push
```

### Backend (AWS Lambda + API Gateway)
```
API Gateway: bx2rwg4ogk
Región: us-east-1
Endpoint: https://bx2rwg4ogk.execute-api.us-east-1.amazonaws.com/prod

Lambdas:
- ia-control-face-indexer
- ia-control-video-processor
- ia-control-access-log-api
- ia-control-upload-presigned
- ia-control-camera-manager
```

### Base de Datos (DynamoDB)
```
Tablas:
- ia-control-employees
- ia-control-logs (con GSI: empleadoId-timestamp-index)
- ia-control-alerts
- ia-control-cameras
```

### Almacenamiento (S3)
```
Bucket: ia-control-coirontech
Estructura:
  /employee-faces/ - Fotos de empleados para Rekognition
```

### Reconocimiento Facial (Rekognition)
```
Collection: ia-control-employees
Región: us-east-1
```

### Autenticación (Cognito)
```
User Pool: epi-dashboard-users
ID: us-east-1_zrdfN7OKN
App Client: 6o457vsfr35cusuqpui7u23cnn

Grupos:
- ia-control-admins (acceso completo)
- ia-control-operators (solo visualización)
```

### DNS (Lightsail)
```
Zona: coirontech.com
Registros:
- control.coirontech.com → djz5bhdosx7o.cloudfront.net (CNAME)
- _ef503b53b6f0e3b5874ef355785d396f.coirontech.com → [ACM validation] (CNAME)
```

## 🔄 Flujo de Deploy

### Automático (Recomendado)
```bash
# 1. Hacer cambios en código
git add .
git commit -m "Descripción del cambio"
git push origin main

# 2. Amplify detecta el push automáticamente
# 3. Build se ejecuta (~3-5 minutos)
# 4. Deploy automático a producción
```

### Manual (Si es necesario)
```bash
# En AWS Amplify Console
1. Ir a https://console.aws.amazon.com/amplify/home?region=us-east-1#/d18gqhtetuceh3
2. Click en "Redeploy this version"
```

## 🔧 Variables de Entorno

### Frontend (Amplify)
```
REACT_APP_API_URL=https://bx2rwg4ogk.execute-api.us-east-1.amazonaws.com/prod
REACT_APP_COGNITO_USER_POOL_ID=us-east-1_zrdfN7OKN
REACT_APP_COGNITO_CLIENT_ID=6o457vsfr35cusuqpui7u23cnn
```

## 📋 Checklist de Deploy

### Pre-Deploy
- [ ] Código testeado localmente
- [ ] Variables de entorno configuradas
- [ ] Cambios commiteados en Git
- [ ] README actualizado si es necesario

### Deploy
- [ ] Push a GitHub
- [ ] Verificar build en Amplify Console
- [ ] Verificar que no hay errores en logs

### Post-Deploy
- [ ] Probar login en producción
- [ ] Verificar funcionalidad de cámaras
- [ ] Verificar reconocimiento facial
- [ ] Verificar exportación de reportes
- [ ] Verificar roles y permisos

## 🐛 Troubleshooting

### Build falla
```bash
# Ver logs en Amplify Console
# O por CLI:
aws amplify list-jobs --app-id d18gqhtetuceh3 --branch-name main --region us-east-1
```

### Dominio no funciona
```bash
# Verificar estado del dominio
aws amplify get-domain-association \
  --app-id d18gqhtetuceh3 \
  --domain-name coirontech.com \
  --region us-east-1
```

### Variables de entorno
```bash
# Listar variables
aws amplify get-app --app-id d18gqhtetuceh3 --region us-east-1 | jq '.app.environmentVariables'
```

## 📞 Contacto

**Desarrollado por:** CoironTech
**Repositorio:** https://github.com/guillescontreras/ia-control
**Versión:** v1.0.0
