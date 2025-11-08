# Arquitectura Compartida - IA-Control y EPI Dashboard

## 🏗️ RECURSOS COMPARTIDOS

### ✅ Cognito User Pool (COMPARTIDO)
```
User Pool ID: us-east-1_zrdfN7OKN
Nombre: epi-dashboard-users
Region: us-east-1
```

**App Clients:**
- EPI Dashboard: [ID existente]
- IA-Control: 6o457vsfr35cusuqpui7u23cnn

**Grupos:**
- `ia-control-admins` → Acceso completo a IA-Control
- `ia-control-operators` → Solo lectura en IA-Control
- (Otros grupos de EPI Dashboard si existen)

**⚠️ IMPORTANTE:** 
- Los usuarios se crean en el User Pool compartido
- Los grupos determinan a qué aplicación tienen acceso
- Un usuario puede estar en grupos de ambas aplicaciones

### ✅ DynamoDB: UserProfiles (COMPARTIDO)
```
Tabla: UserProfiles
Partition Key: userId (String)
```

**Estructura:**
```json
{
  "userId": "email@example.com",
  "email": "email@example.com",
  "firstName": "Nombre",
  "lastName": "Apellido",
  "phone": "+54...",
  "city": "Ciudad",
  "country": "País",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

**Usado por:**
- ✅ EPI Dashboard: Perfiles de usuarios de la app móvil
- ✅ IA-Control: Perfiles de usuarios del sistema (admins/operadores)

**⚠️ IMPORTANTE:**
- Esta tabla almacena perfiles de AMBAS aplicaciones
- userId = email del usuario en Cognito
- NO confundir con ia-control-employees (empleados para reconocimiento facial)

---

## 🔒 RECURSOS EXCLUSIVOS DE IA-CONTROL

### DynamoDB Tables

#### ia-control-employees
```
Partition Key: empleadoId (String)
```
**Propósito:** Empleados registrados para reconocimiento facial
```json
{
  "empleadoId": "EMP001",
  "nombre": "Juan",
  "apellido": "Pérez",
  "departamento": "Producción",
  "faceIds": ["face-id-1", "face-id-2", ...],
  "activo": true,
  "fechaAlta": 1234567890
}
```

#### ia-control-logs
```
Partition Key: logId (String)
Sort Key: timestamp (Number)
GSI: empleadoId-timestamp-index
```
**Propósito:** Registro de accesos (ingresos/egresos)
```json
{
  "logId": "uuid",
  "timestamp": 1234567890,
  "empleadoId": "EMP001",
  "nombreCompleto": "Juan Pérez",
  "tipo": "ingreso|egreso",
  "cameraId": "cam-1",
  "imageUrl": "s3://..."
}
```

#### ia-control-alerts
```
Partition Key: alertId (String)
Sort Key: timestamp (Number)
```
**Propósito:** Alertas de seguridad
```json
{
  "alertId": "uuid",
  "timestamp": 1234567890,
  "tipo": "no_autorizado|sin_epp",
  "cameraId": "cam-1",
  "descripcion": "Persona no autorizada detectada"
}
```

#### ia-control-cameras
```
Partition Key: cameraId (String)
```
**Propósito:** Configuración de cámaras
```json
{
  "cameraId": "cam-1",
  "nombre": "Entrada Principal",
  "ubicacion": "Planta Baja",
  "tipo": "webcam|ip|rtsp",
  "url": "rtsp://...",
  "activa": true
}
```

### S3 Bucket
```
Bucket: ia-control-coirontech
Estructura:
  /employee-faces/
    - EMP001_1.jpg
    - EMP001_2.jpg
    - ...
```

### Rekognition Collection
```
Collection: ia-control-employees
Faces indexadas: Rostros de empleados para reconocimiento
```

### Lambdas
- ia-control-face-indexer
- ia-control-video-processor
- ia-control-access-log-api
- ia-control-upload-presigned
- ia-control-camera-manager
- ia-control-user-manager
- ia-control-access-register
- ia-control-text-to-speech

### API Gateway
```
API ID: bx2rwg4ogk
Stage: prod
Base URL: https://bx2rwg4ogk.execute-api.us-east-1.amazonaws.com/prod
```

---

## 📱 RECURSOS EXCLUSIVOS DE EPI DASHBOARD

### DynamoDB Tables

#### epi-user-analysis
```
Partition Key: userId (String)
Sort Key: timestamp (Number)
```
**Propósito:** Análisis de EPP realizados por usuarios de la app móvil
```json
{
  "userId": "user-123",
  "timestamp": 1234567890,
  "analysisId": "uuid",
  "analysisData": {
    "Summary": {
      "totalPersons": 5,
      "compliant": 3
    },
    "ProtectiveEquipment": [...]
  }
}
```

### S3 Bucket
```
Bucket: rekognition-gcontreras
Estructura:
  /input: Imágenes subidas por usuarios
  /output: Imágenes procesadas
  /web: JSONs de análisis
```

---

## 🔄 FLUJO DE GESTIÓN DE USUARIOS

### Crear Usuario en IA-Control

1. **Admin crea usuario desde IA-Control UI**
   ```
   POST /users
   Body: { email, firstName, lastName, role }
   ```

2. **Lambda ia-control-user-manager:**
   - Crea usuario en Cognito (User Pool compartido)
   - Agrega a grupo: `ia-control-admins` o `ia-control-operators`
   - Crea perfil en DynamoDB `UserProfiles`

3. **Usuario recibe email con contraseña temporal**

4. **Usuario hace login en control.coirontech.com**
   - Cognito valida credenciales
   - Frontend verifica grupos: `ia-control-admins` o `ia-control-operators`
   - Si no tiene estos grupos → acceso denegado

### Editar Usuario en IA-Control

1. **Admin edita usuario desde IA-Control UI**
   ```
   PUT /users/{email}
   Body: { firstName, lastName, newPassword }
   ```

2. **Lambda ia-control-user-manager:**
   - Actualiza atributos en Cognito
   - Actualiza perfil en DynamoDB `UserProfiles`
   - Si newPassword → cambia contraseña en Cognito

**⚠️ IMPORTANTE:**
- NO se modifican grupos al editar
- NO se afectan usuarios de EPI Dashboard
- Solo se actualizan datos del perfil

---

## 🚨 REGLAS CRÍTICAS

### ❌ NO HACER

1. **NO eliminar User Pool** → Afecta ambas aplicaciones
2. **NO eliminar tabla UserProfiles** → Afecta ambas aplicaciones
3. **NO modificar grupos de usuarios sin verificar** → Puede quitar acceso
4. **NO confundir:**
   - `UserProfiles` (usuarios del sistema) ≠ `ia-control-employees` (empleados para reconocimiento)
   - Grupos de IA-Control ≠ Grupos de EPI Dashboard

### ✅ HACER

1. **Siempre verificar grupos antes de modificar usuarios**
2. **Usar grupos para controlar acceso a cada aplicación**
3. **Mantener UserProfiles sincronizado con Cognito**
4. **Hacer backups antes de cambios en recursos compartidos**

---

## 📊 DIAGRAMA DE ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS COGNITO                               │
│         User Pool: epi-dashboard-users                       │
│              (us-east-1_zrdfN7OKN)                          │
│                                                              │
│  Grupos:                                                     │
│  ├── ia-control-admins                                      │
│  ├── ia-control-operators                                   │
│  └── [otros grupos EPI]                                     │
└─────────────────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ↓                       ↓
┌──────────────────┐   ┌──────────────────┐
│   IA-CONTROL     │   │  EPI DASHBOARD   │
│                  │   │                  │
│ control.         │   │ epi.             │
│ coirontech.com   │   │ coirontech.com   │
└──────────────────┘   └──────────────────┘
        │                       │
        ↓                       ↓
┌──────────────────┐   ┌──────────────────┐
│ DynamoDB:        │   │ DynamoDB:        │
│ - employees      │   │ - user-analysis  │
│ - logs           │   │                  │
│ - alerts         │   │ S3:              │
│ - cameras        │   │ - rekognition-   │
│                  │   │   gcontreras     │
│ S3:              │   │                  │
│ - ia-control-    │   └──────────────────┘
│   coirontech     │
│                  │
│ Rekognition:     │
│ - ia-control-    │
│   employees      │
└──────────────────┘

        COMPARTIDO:
┌──────────────────────────────┐
│ DynamoDB: UserProfiles       │
│ (Perfiles de usuarios de     │
│  ambas aplicaciones)         │
└──────────────────────────────┘
```

---

## 🔐 PERMISOS IAM

### Lambda ia-control-user-manager

**Necesita acceso a:**
- ✅ Cognito: AdminCreateUser, AdminUpdateUserAttributes, AdminSetUserPassword, AdminDeleteUser, AdminAddUserToGroupCommand
- ✅ DynamoDB: PutItem en UserProfiles

**NO necesita acceso a:**
- ❌ Tablas de EPI Dashboard
- ❌ S3 de EPI Dashboard

---

**Última actualización:** 08/11/2025  
**Autor:** Amazon Q  
**Propósito:** Documentar arquitectura compartida para evitar errores
