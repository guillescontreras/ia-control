# IA-Control v1.1.0 - Gestión de Usuarios

**Fecha:** 07/11/2025  
**Versión:** v1.1.0  
**Feature:** Gestión completa de usuarios con AdminCreateUser API

---

## ✅ IMPLEMENTACIÓN COMPLETADA

### 1. Backend - Lambda ia-control-user-manager

**Archivo:** `backend/user-manager/index.mjs`

**Funcionalidades:**
- ✅ POST /users - Crear usuario con AdminCreateUser
- ✅ GET /users - Listar todos los usuarios
- ✅ DELETE /users/{email} - Eliminar usuario

**Flujo de creación:**
1. Admin envía datos: email, firstName, lastName, role
2. Lambda crea usuario en Cognito con AdminCreateUser
3. Cognito envía email automático con contraseña temporal
4. Lambda agrega usuario al grupo (ia-control-admins o ia-control-operators)
5. Lambda crea perfil en DynamoDB UserProfiles
6. Usuario recibe email y puede hacer login

**Rol IAM:** `ia-control-user-manager-role`
- Permisos Cognito: AdminCreateUser, AdminAddUserToGroup, AdminDeleteUser, ListUsers
- Permisos DynamoDB: PutItem, GetItem, DeleteItem en UserProfiles

---

### 2. Frontend - Componente UserManagement

**Archivo:** `frontend/src/components/UserManagement.tsx`

**Features:**
- ✅ Formulario de creación de usuarios
- ✅ Selector de rol (Admin/Operador)
- ✅ Tabla de usuarios con estado (CONFIRMED/FORCE_CHANGE_PASSWORD)
- ✅ Botón de eliminación
- ✅ Integración con Amplify para autenticación

**UX:**
- Botón "+ Crear Usuario" muestra formulario
- Campos: Email, Nombre, Apellido, Rol
- Tabla muestra: Email, Nombre, Estado, Fecha creación, Acciones
- Estados visuales con badges de colores

---

### 3. API Gateway - Endpoints

**Base URL:** https://bx2rwg4ogk.execute-api.us-east-1.amazonaws.com/prod

**Endpoints configurados:**
- ✅ POST /users - Crear usuario
- ✅ GET /users - Listar usuarios
- ✅ DELETE /users/{email} - Eliminar usuario

**Permisos Lambda:**
- ✅ apigateway-users-post
- ✅ apigateway-users-get
- ✅ apigateway-users-delete

---

### 4. Integración en App

**Archivo:** `frontend/src/App.tsx`

**Cambios:**
- ✅ Importado UserManagement component
- ✅ Agregada sección 'users' al type Section
- ✅ Nuevo botón "🔐 Usuarios" en navegación (solo admins)
- ✅ Renderizado condicional de UserManagement

---

## 🔐 FLUJO COMPLETO DE USUARIO

### Creación por Admin

```
1. Admin logueado abre sección "Usuarios"
                    ↓
2. Hace clic en "+ Crear Usuario"
                    ↓
3. Completa formulario:
   - Email: nuevo@coirontech.com
   - Nombre: Juan
   - Apellido: Pérez
   - Rol: Operador
                    ↓
4. Frontend → API Gateway → Lambda user-manager
                    ↓
5. Lambda → Cognito AdminCreateUser
                    ↓
6. Cognito envía email automático:
   "Tu contraseña temporal es: TempPass123!"
                    ↓
7. Lambda → Cognito AdminAddUserToGroup
   (Grupo: ia-control-operators)
                    ↓
8. Lambda → DynamoDB UserProfiles
   (Crea perfil con datos del usuario)
                    ↓
9. Usuario recibe email de AWS Cognito
```

### Primer Login del Usuario

```
1. Usuario abre https://control.coirontech.com
                    ↓
2. Ingresa email y contraseña temporal
                    ↓
3. Cognito detecta estado FORCE_CHANGE_PASSWORD
                    ↓
4. Amplify muestra pantalla de cambio de contraseña
                    ↓
5. Usuario ingresa nueva contraseña
                    ↓
6. Estado cambia a CONFIRMED
                    ↓
7. Usuario accede al dashboard
```

---

## 📊 ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────┐
│                    GESTIÓN DE USUARIOS                       │
└─────────────────────────────────────────────────────────────┘

Admin Dashboard (UserManagement.tsx)
                    ↓
        Amplify fetchAuthSession() → Token JWT
                    ↓
API Gateway (POST /users) + Authorization Header
                    ↓
Lambda ia-control-user-manager
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
Cognito User Pool          DynamoDB
- AdminCreateUser          - UserProfiles
- AdminAddUserToGroup      - Crear perfil
- Email automático
        ↓
Usuario recibe email con contraseña temporal
```

---

## 🧪 TESTING

### Crear Usuario de Prueba

```bash
# Desde frontend (UserManagement)
Email: test@coirontech.com
Nombre: Test
Apellido: User
Rol: Operador

# Resultado esperado:
✅ Usuario creado exitosamente
✅ Email enviado a test@coirontech.com
✅ Usuario aparece en tabla con estado FORCE_CHANGE_PASSWORD
```

### Verificar en Cognito

```bash
aws cognito-idp list-users \
  --user-pool-id us-east-1_zrdfN7OKN \
  --filter "email = \"test@coirontech.com\""
```

### Verificar en DynamoDB

```bash
aws dynamodb get-item \
  --table-name UserProfiles \
  --key '{"userId": {"S": "test@coirontech.com"}}'
```

---

## 💰 COSTOS

**Adicionales por v1.1.0:**
- Cognito: $0 (incluido hasta 50,000 MAU)
- Lambda invocations: ~$0.20/mes
- DynamoDB writes: ~$0.10/mes
- **TOTAL: ~$0.30/mes**

---

## 📝 DECISIONES TÉCNICAS

### ¿Por qué AdminCreateUser en lugar de signUp?

**Razón:** Control empresarial

- ✅ Solo admins pueden crear usuarios
- ✅ Cognito envía email automático con contraseña temporal
- ✅ Usuario forzado a cambiar contraseña en primer login
- ✅ Más seguro que auto-registro público

### ¿Por qué Amplify en frontend?

**Razón:** Recomendación oficial de AWS

- ✅ Simplifica integración con Cognito
- ✅ Maneja tokens JWT automáticamente
- ✅ Menos código que SDK directo
- ✅ Ya estaba implementado en v1.0.0

### ¿Por qué DynamoDB UserProfiles?

**Razón:** Datos adicionales no soportados por Cognito

- ✅ Cognito solo soporta atributos estándar
- ✅ UserProfiles permite campos custom
- ✅ Compartido con EPI Dashboard
- ✅ Facilita queries complejas

---

## 🚀 DEPLOY

### Backend

```bash
cd backend/user-manager
npm install
zip -r function.zip .
aws lambda update-function-code \
  --function-name ia-control-user-manager \
  --zip-file fileb://function.zip
```

### Frontend

```bash
cd frontend
npm run build
# Deploy automático en Amplify (push a GitHub)
```

### API Gateway

```bash
cd infrastructure
./setup-user-management-api.sh
```

---

## 📚 DOCUMENTACIÓN CONSULTADA

Basado en investigación de documentación oficial:
- [AWS Cognito AdminCreateUser API](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminCreateUser.html)
- [AWS Cognito User Groups](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html)
- [AWS Amplify Auth](https://docs.amplify.aws/lib/auth/getting-started/q/platform/js/)

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Lambda ia-control-user-manager creada
- [x] Rol IAM con permisos Cognito y DynamoDB
- [x] Endpoints API Gateway configurados
- [x] Componente UserManagement.tsx creado
- [x] Integración en App.tsx
- [x] Testing de creación de usuario
- [x] Verificación de email automático
- [x] Documentación completa

---

## 🎯 PRÓXIMOS PASOS (v1.2.0)

1. Video Streaming mejorado con motion detection
2. Server-Sent Events para real-time
3. Notificaciones toast
4. Overlay de detecciones en video

---

**Implementado por:** Amazon Q  
**Metodología:** Basada en documentación oficial de AWS  
**Estado:** ✅ Completado y desplegado
# Investigación Arquitectónica IA-Control v1.1.0+

**Fecha:** 04/11/2025  
**Metodología:** Consulta de documentación oficial de AWS  
**Objetivo:** Definir arquitectura para mejoras de gestión de usuarios, video streaming y dashboard

---

## 📚 RESUMEN EJECUTIVO

Basado en documentación oficial de AWS, se identificaron las siguientes arquitecturas recomendadas:

### 1. Gestión de Usuarios (v1.1.0)
✅ **Custom UI con AWS Amplify + AdminCreateUser API**
- Costo: $0 (incluido en Cognito)
- Complejidad: Baja
- Tiempo implementación: 1-2 días

### 2. Video Streaming (v1.2.0)
✅ **RTSP → FFmpeg local + Snapshot periódico** (mantener actual)
- Costo: $10-15/mes (3-5 cámaras)
- Complejidad: Media
- Escalabilidad: Hasta 5 cámaras

⚠️ **Migración futura:** Edge Processing cuando escale a 10+ cámaras

### 3. Dashboard Real-time (v1.2.0)
✅ **Server-Sent Events (SSE) con Lambda Function URLs**
- Costo: <$1/mes
- Complejidad: Baja
- Latencia: 3-5s (suficiente)

---

## 🔐 PARTE 1: GESTIÓN DE USUARIOS

### Documentación Consultada
- [AWS Cognito Admin APIs](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminCreateUser.html)
- [Self-Service Registration](https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html)
- [User Groups Management](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html)
- [Lambda Triggers](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html)

### Arquitectura Recomendada por AWS

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE REGISTRO                         │
└─────────────────────────────────────────────────────────────┘

OPCIÓN A: Admin crea usuario
─────────────────────────────
Admin Dashboard → Lambda (AdminCreateUser) → Cognito
                                            ↓
                                Email con contraseña temporal
                                            ↓
                        Usuario login → Forzado cambio contraseña
                                            ↓
                        Lambda PostConfirmation → DynamoDB UserProfiles

OPCIÓN B: Self-service registration
────────────────────────────────────
Usuario → Formulario registro → Amplify signUp() → Cognito
                                                  ↓
                                    Email verificación
                                                  ↓
                        Usuario confirma → Lambda PostConfirmation
                                                  ↓
                                    DynamoDB UserProfiles
```

### Implementación Propuesta

#### 1. Lambda: ia-control-user-manager
```javascript
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand } from "@aws-sdk/client-cognito-identity-provider";

export const handler = async (event) => {
  const { email, name, role } = JSON.parse(event.body);
  
  // Crear usuario
  const createUserResponse = await cognitoClient.send(new AdminCreateUserCommand({
    UserPoolId: "us-east-1_zrdfN7OKN",
    Username: email,
    UserAttributes: [
      { Name: "email", Value: email },
      { Name: "name", Value: name },
      { Name: "email_verified", Value: "true" }
    ],
    DesiredDeliveryMediums: ["EMAIL"] // Envía contraseña temporal
  }));
  
  // Agregar a grupo
  await cognitoClient.send(new AdminAddUserToGroupCommand({
    UserPoolId: "us-east-1_zrdfN7OKN",
    Username: email,
    GroupName: role === 'admin' ? 'ia-control-admins' : 'ia-control-operators'
  }));
  
  return { statusCode: 200, body: JSON.stringify({ userId: createUserResponse.User.Username }) };
};
```

#### 2. Lambda Trigger: PostConfirmation
```javascript
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

export const handler = async (event) => {
  const { email, name, sub } = event.request.userAttributes;
  
  // Crear perfil en DynamoDB
  await dynamoClient.send(new PutItemCommand({
    TableName: 'UserProfiles',
    Item: {
      userId: { S: sub },
      email: { S: email },
      firstName: { S: name.split(' ')[0] },
      lastName: { S: name.split(' ').slice(1).join(' ') },
      createdAt: { N: Date.now().toString() }
    }
  }));
  
  return event; // IMPORTANTE: retornar event
};
```

#### 3. Frontend: UserManagement Component
```typescript
import { fetchAuthSession } from 'aws-amplify/auth';

const createUser = async (email: string, name: string, role: string) => {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, name, role })
  });
  
  return response.json();
};
```

#### 4. Frontend: Self-Service Registration (Opcional)
```typescript
import { signUp, confirmSignUp } from 'aws-amplify/auth';

const handleRegister = async (email: string, password: string, name: string) => {
  // Paso 1: Registro
  const { userId } = await signUp({
    username: email,
    password: password,
    options: {
      userAttributes: {
        email: email,
        name: name
      }
    }
  });
  
  // Paso 2: Usuario recibe código por email
  // Paso 3: Confirmar con código
  await confirmSignUp({
    username: email,
    confirmationCode: code
  });
};
```

### Costos
- **Cognito:** Gratis hasta 50,000 MAU
- **Lambda:** ~$0.20/mes (pocas invocaciones)
- **TOTAL:** ~$0/mes

---

## 📹 PARTE 2: VIDEO STREAMING

### Documentación Consultada
- [Kinesis Video Streams + Rekognition](https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video.html)
- [Rekognition Image APIs](https://docs.aws.amazon.com/rekognition/latest/dg/images.html)
- [AWS IoT Core](https://docs.aws.amazon.com/iot/latest/developerguide/what-is-aws-iot.html)
- [AWS Architecture Blog - ML Cases](https://aws.amazon.com/blogs/machine-learning/)

### Comparación de Arquitecturas

| Arquitectura | Latencia | Costo/cámara/mes | Complejidad | Escalabilidad | Recomendado para |
|--------------|----------|------------------|-------------|---------------|------------------|
| **Kinesis Video Streams** | <1s | $2,000+ | Alta | Excelente | 50+ cámaras enterprise |
| **Kinesis optimizado** (5fps, 10h/día) | 2-3s | $100-200 | Alta | Excelente | 20+ cámaras |
| **S3 + Lambda** (frame cada 5s) | 3-5s | $216 | Media | Buena | 10-20 cámaras |
| **S3 + Lambda** (frame cada 10s) | 5-10s | $108 | Media | Buena | 5-10 cámaras |
| **Edge Processing** (Raspberry Pi) | 3-5s | $20-30 | Alta | Buena | 10+ cámaras |
| **RTSP → FFmpeg local** | 3-5s | $10-15 total | Media | Limitada | 3-5 cámaras ✅ |

### Decisión: Mantener Arquitectura Actual

**Razón:** Para 3-5 cámaras, RTSP → FFmpeg es la opción más económica y suficiente.

**Arquitectura actual:**
```
Cámara RTSP → Streaming Server (Node.js + FFmpeg) → Snapshot cada 3s
                                                    ↓
                                            S3 → Lambda → Rekognition
                                                    ↓
                                            DynamoDB (logs)
```

**Mejoras propuestas (v1.2.0):**

1. **Detección de movimiento antes de Rekognition**
   - Usar OpenCV en streaming-server
   - Solo enviar frames con movimiento
   - Reducir costos de Rekognition en 70-80%

2. **WebSocket para push de frames**
   - Reemplazar polling por push
   - Latencia reducida
   - Mejor UX

3. **Buffer de video para replay**
   - Guardar últimos 30s de video
   - Permitir replay de eventos
   - Útil para auditorías

### Código: Detección de Movimiento (OpenCV)

```javascript
// streaming-server/motion-detector.js
import cv from '@u4/opencv4nodejs';

class MotionDetector {
  constructor() {
    this.previousFrame = null;
    this.threshold = 25; // Sensibilidad
  }
  
  detectMotion(frame) {
    const gray = frame.cvtColor(cv.COLOR_BGR2GRAY);
    const blurred = gray.gaussianBlur(new cv.Size(21, 21), 0);
    
    if (!this.previousFrame) {
      this.previousFrame = blurred;
      return false;
    }
    
    const frameDelta = blurred.absdiff(this.previousFrame);
    const thresh = frameDelta.threshold(this.threshold, 255, cv.THRESH_BINARY);
    
    const contours = thresh.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const hasMotion = contours.some(c => c.area > 500);
    
    this.previousFrame = blurred;
    return hasMotion;
  }
}
```

### Plan de Migración Futura

**Cuando escale a 10+ cámaras:**

1. **Edge Processing con Raspberry Pi**
   - Costo: $35/cámara (hardware) + $20/mes (operación)
   - Detección local de personas (TensorFlow Lite)
   - Solo envía frames con personas a AWS
   - Reduce costos de Rekognition en 90%

2. **AWS IoT Greengrass**
   - Orquestación de edge devices
   - Deploy de modelos ML a edge
   - Sincronización automática

**Cuando escale a 50+ cámaras:**

1. **Kinesis Video Streams**
   - Negociar precios con AWS
   - Soporte enterprise
   - SLA garantizado

---

## 📊 PARTE 3: DASHBOARD REAL-TIME

### Documentación Consultada
- [API Gateway WebSocket APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)
- [AWS AppSync Real-time](https://docs.aws.amazon.com/appsync/latest/devguide/real-time-data.html)
- [Lambda Function URLs with SSE](https://aws.amazon.com/blogs/compute/using-server-sent-events-sse-with-aws-lambda/)
- [AWS IoT Core](https://docs.aws.amazon.com/iot/latest/developerguide/protocols.html)

### Comparación de Tecnologías

| Tecnología | Complejidad | Costo/mes | Bidireccional | Latencia | Recomendado para |
|------------|-------------|-----------|---------------|----------|------------------|
| **API Gateway WebSocket** | Media | $1-2 | Sí | <1s | Chat, gaming, control bidireccional |
| **AppSync Subscriptions** | Baja | $5-10 | Sí | <1s | Apps móviles, offline-first |
| **SSE (Lambda URLs)** | Baja | <$1 | No | 1-3s | Notificaciones, logs, dashboards ✅ |
| **AWS IoT Core** | Alta | $1-2 | Sí | <1s | IoT devices, millones de conexiones |

### Decisión: Server-Sent Events (SSE)

**Razón:** Unidireccional suficiente, más simple, costo muy bajo.

**Arquitectura propuesta:**
```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO REAL-TIME                           │
└─────────────────────────────────────────────────────────────┘

Streaming Server → Captura frame cada 3s
                                ↓
                    Lambda video-processor → Rekognition
                                ↓
                    DynamoDB (ia-control-logs)
                                ↓
                    DynamoDB Streams → Lambda SSE broadcaster
                                ↓
                    Dashboard (EventSource API)
```

### Implementación

#### 1. Lambda: ia-control-sse-broadcaster
```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBStreams } from "@aws-sdk/client-dynamodb-streams";

export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    // Headers SSE
    const metadata = {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    };
    
    responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);
    
    // Mensaje inicial
    responseStream.write('data: {"type":"connected"}\n\n');
    
    // Escuchar DynamoDB Streams
    const streamArn = process.env.DYNAMODB_STREAM_ARN;
    
    // Polling cada 3s
    const interval = setInterval(async () => {
      const records = await getLatestRecords(streamArn);
      
      for (const record of records) {
        if (record.eventName === 'INSERT') {
          const detection = unmarshall(record.dynamodb.NewImage);
          responseStream.write(`data: ${JSON.stringify(detection)}\n\n`);
        }
      }
    }, 3000);
    
    // Cleanup después de 5 minutos
    setTimeout(() => {
      clearInterval(interval);
      responseStream.end();
    }, 300000);
  }
);
```

#### 2. Frontend: Real-time Connection
```typescript
// Dashboard.tsx
useEffect(() => {
  const eventSource = new EventSource(
    'https://lambda-url.lambda-url.us-east-1.on.aws/stream'
  );
  
  eventSource.onmessage = (event) => {
    const detection = JSON.parse(event.data);
    
    if (detection.type === 'connected') {
      console.log('Connected to real-time stream');
    } else {
      // Actualizar UI con nueva detección
      setDetections(prev => [detection, ...prev]);
      
      // Mostrar notificación
      if (detection.alertType) {
        showNotification(detection);
      }
    }
  };
  
  eventSource.onerror = () => {
    console.error('SSE connection error, reconnecting...');
    // EventSource reconecta automáticamente
  };
  
  return () => eventSource.close();
}, []);
```

#### 3. Mejoras de UX

**Notificaciones Toast:**
```typescript
import { toast } from 'react-hot-toast';

const showNotification = (detection) => {
  if (detection.alertType === 'unauthorized') {
    toast.error(`⚠️ Persona no autorizada en ${detection.cameraName}`, {
      duration: 5000,
      position: 'top-right'
    });
  } else if (detection.alertType === 'restricted_object') {
    toast.warning(`📦 Objeto restringido detectado en ${detection.cameraName}`);
  }
};
```

**Overlay de Detecciones en Video:**
```typescript
const VideoWithDetections = ({ cameraId, detections }) => {
  return (
    <div className="relative">
      <img src={`/api/stream/snapshot/${cameraId}`} />
      
      {detections.map(det => (
        <div
          key={det.id}
          className="absolute border-2 border-green-500"
          style={{
            left: `${det.boundingBox.Left * 100}%`,
            top: `${det.boundingBox.Top * 100}%`,
            width: `${det.boundingBox.Width * 100}%`,
            height: `${det.boundingBox.Height * 100}%`
          }}
        >
          <span className="bg-green-500 text-white px-2 py-1 text-xs">
            {det.employeeName} ({det.confidence.toFixed(1)}%)
          </span>
        </div>
      ))}
    </div>
  );
};
```

### Costos
- **Lambda Function URL:** Gratis
- **Lambda invocations:** ~$0.20/mes
- **DynamoDB Streams:** Gratis (incluido)
- **TOTAL:** <$1/mes

---

## 🎯 ROADMAP DEFINITIVO

### v1.1.0 - Gestión de Usuarios (1-2 días)
**Features:**
- [ ] Lambda `ia-control-user-manager` (AdminCreateUser)
- [ ] Lambda Trigger PostConfirmation
- [ ] Componente `UserManagement.tsx` (admin panel)
- [ ] Componente `Register.tsx` (self-service, opcional)
- [ ] API Gateway endpoints: POST /users, GET /users, DELETE /users/{id}

**Costo adicional:** $0/mes

---

### v1.2.0 - Video Streaming Mejorado (2-3 días)
**Features:**
- [ ] Detección de movimiento con OpenCV (streaming-server)
- [ ] Lambda `ia-control-sse-broadcaster` (real-time)
- [ ] DynamoDB Streams en `ia-control-logs`
- [ ] EventSource en Dashboard
- [ ] Notificaciones toast (react-hot-toast)
- [ ] Overlay de detecciones en video
- [ ] Buffer de video (últimos 30s)

**Costo adicional:** <$1/mes

---

### v1.3.0 - Dashboard Rediseñado (2-3 días)
**Features:**
- [ ] Grid de video con detecciones en tiempo real
- [ ] Timeline de eventos del día
- [ ] Heatmap de zonas de tráfico
- [ ] Gráficos interactivos (Recharts)
- [ ] Responsive design mejorado
- [ ] Dark mode
- [ ] Filtros avanzados

**Costo adicional:** $0/mes

---

## 💰 RESUMEN DE COSTOS

### Actual (v1.0.0)
- Rekognition: $12/mes
- DynamoDB: $5/mes
- Lambda: $2/mes
- S3: $2/mes
- Streaming Server: $10/mes (VPS)
- **TOTAL: $31/mes**

### Con mejoras (v1.3.0)
- Rekognition: $3/mes (70% reducción con motion detection)
- DynamoDB: $5/mes
- Lambda: $3/mes
- S3: $2/mes
- Streaming Server: $10/mes
- **TOTAL: $23/mes** ✅ AHORRO de $8/mes

---

## 📝 CONCLUSIONES

### Decisiones Basadas en Documentación Oficial AWS

1. ✅ **Gestión de Usuarios:** Custom UI + AdminCreateUser (recomendación AWS para apps empresariales)

2. ✅ **Video Streaming:** Mantener RTSP → FFmpeg (óptimo para 3-5 cámaras según análisis de costos)

3. ✅ **Dashboard Real-time:** SSE con Lambda Function URLs (más simple y económico según AWS blogs)

### Próximos Pasos

1. **Implementar v1.1.0** (gestión de usuarios)
2. **Implementar v1.2.0** (streaming mejorado + real-time)
3. **Implementar v1.3.0** (dashboard rediseñado)
4. **Evaluar migración a Edge Processing** cuando escale a 10+ cámaras

---

**Documentado por:** Amazon Q  
**Metodología:** Consulta de documentación oficial de AWS  
**Fecha:** 04/11/2025  
**Propósito:** Definir arquitectura basada en best practices de AWS
# IA-Control v1.2.0 - Plan de Implementación

**Fecha:** 07/11/2025  
**Objetivo:** Video Streaming Mejorado + Real-time Notifications

---

## 🎯 FEATURES A IMPLEMENTAR

### 1. Motion Detection (Prioridad ALTA)
**Objetivo:** Reducir costos de Rekognition en 70%

**Implementación:**
- ✅ Detector de movimiento con sharp (motion-detector.js creado)
- ⏳ Integrar en streaming-server
- ⏳ Solo enviar frames con movimiento a Lambda
- ⏳ Métricas de frames procesados vs descartados

**Ahorro esperado:** $9/mes (de $12 a $3)

---

### 2. Notificaciones Toast (Prioridad ALTA)
**Objetivo:** Feedback visual inmediato

**Implementación:**
- ✅ react-hot-toast instalado
- ✅ Toaster agregado a App.tsx
- ⏳ Notificaciones en Dashboard para nuevas detecciones
- ⏳ Notificaciones en MultiCameraMonitor
- ⏳ Tipos: success (acceso autorizado), warning (alerta), error (no autorizado)

**Costo:** $0

---

### 3. Server-Sent Events (Prioridad MEDIA)
**Objetivo:** Push de eventos en tiempo real

**Implementación:**
- ⏳ Lambda ia-control-sse-broadcaster
- ⏳ DynamoDB Streams en ia-control-logs
- ⏳ EventSource en Dashboard
- ⏳ Auto-reconnect

**Costo:** <$1/mes

---

### 4. Overlay de Detecciones (Prioridad BAJA)
**Objetivo:** Visualizar bounding boxes en video

**Implementación:**
- ⏳ Componente VideoWithDetections
- ⏳ Dibujar bounding boxes sobre video
- ⏳ Mostrar nombre y confianza

**Costo:** $0

---

## 📊 ESTADO ACTUAL

- [x] v1.1.0 completado y probado
- [x] Investigación de documentación oficial
- [x] Motion detector creado
- [x] react-hot-toast instalado
- [ ] Integración pendiente

---

## 🚀 PROGRESO v1.2.0

### Completado:
- [x] Motion detector creado (motion-detector.js)
- [x] react-hot-toast instalado
- [x] Toaster agregado a App.tsx
- [x] Motion detection integrado en streaming-server
- [x] Notificaciones toast en MultiCameraMonitor
- [x] Endpoint /health con estadísticas de motion detection

### Pendiente:
- [ ] Probar motion detection en producción
- [ ] Server-Sent Events para real-time
- [ ] Overlay de detecciones en video
- [ ] Deploy y medición de ahorro real

**Estado:** 60% completado  
**Próximo:** Probar y medir ahorro de costos

---

**Documentado por:** Amazon Q  
**Metodología:** Basada en documentación oficial de AWS
