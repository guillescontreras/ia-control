# 🎥 IA-Control - Sistema de Control de Accesos

Sistema inteligente de monitoreo y control de accesos con reconocimiento facial usando AWS Rekognition.

## 🚀 Características

- ✅ Reconocimiento facial con AWS Rekognition
- ✅ Soporte multi-cámara (Webcam + RTSP)
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Gestión de empleados y cámaras
- ✅ Exportación de reportes (CSV/PDF)
- ✅ Gráficos de actividad
- ✅ Autenticación con AWS Cognito
- ✅ Control de acceso por roles

## 📋 Requisitos

- Node.js 16+
- AWS Account
- FFmpeg (para streaming RTSP)

## 🏗️ Arquitectura

### Frontend
- React + TypeScript
- Chart.js para gráficos
- AWS Amplify para autenticación
- Tailwind CSS

### Backend
- 5 AWS Lambda Functions
- 4 DynamoDB Tables
- AWS Rekognition Collection
- API Gateway REST API
- S3 Bucket

### Streaming
- Node.js + Express
- FFmpeg para RTSP

## 🔧 Instalación

### Frontend
```bash
cd frontend
npm install
npm start
```

### Streaming Server
```bash
cd streaming-server
npm install
node server.js
```

## 🌐 Despliegue

### AWS Amplify
```bash
# Conectar repositorio
# Amplify detecta automáticamente React

# Variables de entorno necesarias:
REACT_APP_API_URL=https://bx2rwg4ogk.execute-api.us-east-1.amazonaws.com/prod
REACT_APP_COGNITO_USER_POOL_ID=us-east-1_zrdfN7OKN
REACT_APP_COGNITO_CLIENT_ID=6o457vsfr35cusuqpui7u23cnn
```

## 👥 Roles y Permisos

### Grupos de Cognito
- `ia-control-admins`: Acceso completo
- `ia-control-operators`: Solo visualización

## 📊 Versión Actual

**v1.0.0** - Sistema en Producción

## 📝 Documentación

Ver carpeta `LOGS/` para:
- Historial de versiones
- Bugs conocidos
- Roadmap futuro

## 🏢 CoironTech

Sistema desarrollado por CoironTech © 2025

**Dominios:**
- Portal: portal.coirontech.com
- IA-Control: control.coirontech.com
- EPI Dashboard: epi.coirontech.com
