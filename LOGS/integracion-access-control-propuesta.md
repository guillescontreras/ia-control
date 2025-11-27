# Propuesta de Integración: Sistema de Control de Accesos

## 🎯 ESTRATEGIA DE INTEGRACIÓN

### Opción Recomendada: Módulo Independiente con Recursos Compartidos

---

## 🏗️ ARQUITECTURA DE INTEGRACIÓN

### Estructura de Proyecto

```
/Coirontech-AWS/
├── Rekognition/
│   ├── epi-dashboard/                    # App actual (NO TOCAR)
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   │
│   └── access-control-system/            # Nuevo módulo
│       ├── frontend/
│       │   ├── src/
│       │   │   ├── components/
│       │   │   │   ├── LiveMonitor.tsx
│       │   │   │   ├── AccessLog.tsx
│       │   │   │   ├── EmployeeManagement.tsx
│       │   │   │   ├── AlertsPanel.tsx
│       │   │   │   └── Dashboard.tsx
│       │   │   ├── services/
│       │   │   │   ├── rekognitionService.ts
│       │   │   │   ├── dynamoService.ts
│       │   │   │   └── authService.ts
│       │   │   ├── App.tsx
│       │   │   └── version.ts
│       │   ├── public/
│       │   └── package.json
│       │
│       ├── backend/
│       │   ├── video-processor/
│       │   │   ├── index.mjs
│       │   │   └── package.json
│       │   ├── face-indexer/
│       │   │   ├── index.mjs
│       │   │   └── package.json
│       │   ├── alert-manager/
│       │   │   ├── index.mjs
│       │   │   └── package.json
│       │   └── access-log-api/
│       │       ├── index.mjs
│       │       └── package.json
│       │
│       └── infrastructure/
│           ├── cloudformation.yaml
│           └── README.md
```

---

## 🔗 RECURSOS COMPARTIDOS

### 1. AWS Cognito (Autenticación)

**User Pool:** `epi-dashboard-users` (EXISTENTE)

**Agregar nuevos grupos:**

```bash
# Crear grupo para seguridad
aws cognito-idp create-group \
  --user-pool-id us-east-1_zrdfN7OKN \
  --group-name SecurityTeam \
  --description "Equipo de seguridad - acceso a control de accesos"

# Crear grupo para RRHH
aws cognito-idp create-group \
  --user-pool-id us-east-1_zrdfN7OKN \
  --group-name HRTeam \
  --description "RRHH - gestión de empleados"

# Asignar usuario a grupo
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_zrdfN7OKN \
  --username guillermo@coirontech.com \
  --group-name SecurityTeam
```

**Permisos por grupo:**

| Grupo | EPI Dashboard | Access Control |
|-------|---------------|----------------|
| Supervisors | ✅ Full | ❌ No |
| Operators | ✅ View | ❌ No |
| SecurityTeam | ❌ No | ✅ Full |
| HRTeam | ❌ No | ✅ View |
| Admins | ✅ Full | ✅ Full |

### 2. S3 Bucket (Almacenamiento)

**Bucket:** `rekognition-gcontreras` (EXISTENTE)

**Nueva estructura:**

```
rekognition-gcontreras/
├── input/                    # EPI Dashboard (existente)
├── output/                   # EPI Dashboard (existente)
├── web/                      # EPI Dashboard (existente)
└── access-control/           # NUEVO
    ├── employee-faces/       # Fotos de empleados
    ├── video-frames/         # Frames capturados
    └── alerts/               # Imágenes de alertas
```

### 3. DynamoDB (Base de Datos)

**Tablas existentes:** (NO TOCAR)
- `epi-user-analysis`
- `UserProfiles`

**Nuevas tablas:**

```javascript
// Tabla: access-control-logs
{
  timestamp: Number,        // Partition Key (epoch)
  empleadoId: String,       // Sort Key
  cameraId: String,
  tipo: String,             // 'ingreso' | 'egreso'
  objetos: List,
  confianza: Number,
  imageUrl: String
}

// Tabla: access-control-employees
{
  empleadoId: String,       // Partition Key (EMP001)
  nombre: String,
  apellido: String,
  faceId: String,           // Rekognition Face ID
  departamento: String,
  activo: Boolean,
  fechaAlta: Number,
  imageUrl: String
}

// Tabla: access-control-alerts
{
  alertId: String,          // Partition Key (UUID)
  timestamp: Number,        // Sort Key
  tipo: String,             // 'no_autorizado' | 'objeto_restringido' | 'conducta_sospechosa'
  cameraId: String,
  descripcion: String,
  imageUrl: String,
  resuelta: Boolean
}
```

### 4. API Gateway

**Opción A: Nueva API (RECOMENDADO)**

```
API: access-control-api
Endpoint: https://[new-id].execute-api.us-east-1.amazonaws.com/prod

Rutas:
- POST /employees/register
- GET /employees/list
- DELETE /employees/{id}
- GET /access-logs
- GET /access-logs/{employeeId}
- GET /alerts
- POST /alerts/{id}/resolve
```

**Opción B: Extender API existente**

```
API: n0f5jga1wc.execute-api.us-east-1.amazonaws.com/prod

Nuevas rutas:
- POST /access-control/employees/register
- GET /access-control/employees/list
- GET /access-control/logs
- GET /access-control/alerts
```

---

## 🎨 FRONTEND: COMPONENTES PRINCIPALES

### 1. Dashboard Principal

```typescript
// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import LiveMonitor from './LiveMonitor';
import AccessLog from './AccessLog';
import AlertsPanel from './AlertsPanel';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    ingresos: 0,
    egresos: 0,
    alertas: 0,
    presentes: 0
  });

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <StatCard title="Ingresos Hoy" value={stats.ingresos} icon="📥" />
        <StatCard title="Egresos Hoy" value={stats.egresos} icon="📤" />
        <StatCard title="Alertas" value={stats.alertas} icon="🚨" />
        <StatCard title="Presentes" value={stats.presentes} icon="👥" />
      </div>
      
      <LiveMonitor cameras={['entrada', 'salida', 'almacen']} />
      <AccessLog limit={10} />
      <AlertsPanel />
    </div>
  );
};
```

### 2. Gestión de Empleados

```typescript
// src/components/EmployeeManagement.tsx
import React, { useState } from 'react';
import { indexFaceInRekognition } from '../services/rekognitionService';

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState([]);
  
  const handleRegisterEmployee = async (data: EmployeeData) => {
    // 1. Subir foto a S3
    const imageUrl = await uploadToS3(data.photo);
    
    // 2. Indexar rostro en Rekognition
    const faceId = await indexFaceInRekognition(imageUrl, data.empleadoId);
    
    // 3. Guardar en DynamoDB
    await saveEmployeeToDB({
      ...data,
      faceId,
      imageUrl
    });
    
    // 4. Actualizar lista
    fetchEmployees();
  };
  
  return (
    <div className="employee-management">
      <button onClick={() => setShowModal(true)}>
        + Agregar Empleado
      </button>
      
      <EmployeeTable employees={employees} />
      
      {showModal && (
        <EmployeeModal onSubmit={handleRegisterEmployee} />
      )}
    </div>
  );
};
```

### 3. Log de Accesos

```typescript
// src/components/AccessLog.tsx
import React, { useState, useEffect } from 'react';
import { getAccessLogs } from '../services/dynamoService';

const AccessLog: React.FC = () => {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    empleadoId: '',
    fecha: '',
    tipo: ''
  });
  
  useEffect(() => {
    fetchLogs();
  }, [filters]);
  
  return (
    <div className="access-log">
      <h2>📋 Registro de Accesos</h2>
      
      <Filters filters={filters} onChange={setFilters} />
      
      <table>
        <thead>
          <tr>
            <th>Hora</th>
            <th>Empleado</th>
            <th>Tipo</th>
            <th>Cámara</th>
            <th>Objetos</th>
            <th>Confianza</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.timestamp}>
              <td>{formatTime(log.timestamp)}</td>
              <td>{log.empleadoId}</td>
              <td>{log.tipo === 'ingreso' ? '📥' : '📤'}</td>
              <td>{log.cameraId}</td>
              <td>{log.objetos.join(', ')}</td>
              <td>{log.confianza}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## ⚙️ BACKEND: LAMBDAS

### 1. Video Processor (Principal)

```javascript
// backend/video-processor/index.mjs
import { RekognitionClient, SearchFacesByImageCommand, DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const rekognition = new RekognitionClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(dynamoClient);
const sns = new SNSClient({ region: 'us-east-1' });

export const handler = async (event) => {
  const { frameBytes, cameraId } = event;
  
  try {
    // 1. Buscar rostro en colección
    const faceResponse = await rekognition.send(new SearchFacesByImageCommand({
      CollectionId: 'empleados-coirontech',
      Image: { Bytes: Buffer.from(frameBytes, 'base64') },
      FaceMatchThreshold: 95,
      MaxFaces: 1
    }));
    
    // 2. Detectar objetos
    const labelResponse = await rekognition.send(new DetectLabelsCommand({
      Image: { Bytes: Buffer.from(frameBytes, 'base64') },
      MaxLabels: 10,
      MinConfidence: 80
    }));
    
    const objetos = labelResponse.Labels.map(l => l.Name);
    const timestamp = Date.now();
    
    // 3. Procesar resultado
    if (faceResponse.FaceMatches && faceResponse.FaceMatches.length > 0) {
      const empleadoId = faceResponse.FaceMatches[0].Face.ExternalImageId;
      const confianza = faceResponse.FaceMatches[0].Similarity;
      
      // Registrar acceso
      await dynamo.send(new PutCommand({
        TableName: 'access-control-logs',
        Item: {
          timestamp,
          empleadoId,
          cameraId,
          tipo: cameraId === 'entrada' ? 'ingreso' : 'egreso',
          objetos,
          confianza: Math.round(confianza)
        }
      }));
      
      // Alerta si lleva objetos restringidos al salir
      const objetosRestringidos = ['Laptop', 'Tool', 'Equipment', 'Computer'];
      if (cameraId === 'salida' && objetos.some(obj => objetosRestringidos.includes(obj))) {
        await sns.send(new PublishCommand({
          TopicArn: 'arn:aws:sns:us-east-1:825765382487:access-control-alerts',
          Subject: `Alerta: ${empleadoId} saliendo con equipo`,
          Message: `Empleado: ${empleadoId}\nObjetos detectados: ${objetos.join(', ')}\nConfianza: ${confianza}%`
        }));
        
        // Guardar alerta
        await dynamo.send(new PutCommand({
          TableName: 'access-control-alerts',
          Item: {
            alertId: `ALERT-${timestamp}`,
            timestamp,
            tipo: 'objeto_restringido',
            cameraId,
            descripcion: `${empleadoId} saliendo con: ${objetos.join(', ')}`,
            resuelta: false
          }
        }));
      }
      
      return { statusCode: 200, body: { empleadoId, tipo: 'autorizado' } };
    } else {
      // Persona no autorizada
      await sns.send(new PublishCommand({
        TopicArn: 'arn:aws:sns:us-east-1:825765382487:access-control-alerts',
        Subject: 'Alerta: Persona no autorizada',
        Message: `Rostro no reconocido en ${cameraId}\nTimestamp: ${new Date(timestamp).toLocaleString()}`
      }));
      
      await dynamo.send(new PutCommand({
        TableName: 'access-control-alerts',
        Item: {
          alertId: `ALERT-${timestamp}`,
          timestamp,
          tipo: 'no_autorizado',
          cameraId,
          descripcion: 'Rostro no reconocido',
          resuelta: false
        }
      }));
      
      return { statusCode: 200, body: { tipo: 'no_autorizado' } };
    }
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, body: { error: error.message } };
  }
};
```

### 2. Face Indexer (Registro de Empleados)

```javascript
// backend/face-indexer/index.mjs
import { RekognitionClient, IndexFacesCommand } from '@aws-sdk/client-rekognition';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const rekognition = new RekognitionClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event) => {
  const { empleadoId, nombre, apellido, departamento, imageUrl } = JSON.parse(event.body);
  
  try {
    // 1. Indexar rostro en Rekognition
    const response = await rekognition.send(new IndexFacesCommand({
      CollectionId: 'empleados-coirontech',
      Image: { S3Object: { Bucket: 'rekognition-gcontreras', Name: imageUrl } },
      ExternalImageId: empleadoId,
      DetectionAttributes: ['ALL'],
      MaxFaces: 1,
      QualityFilter: 'AUTO'
    }));
    
    if (!response.FaceRecords || response.FaceRecords.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No se detectó rostro en la imagen' })
      };
    }
    
    const faceId = response.FaceRecords[0].Face.FaceId;
    
    // 2. Guardar en DynamoDB
    await dynamo.send(new PutCommand({
      TableName: 'access-control-employees',
      Item: {
        empleadoId,
        nombre,
        apellido,
        faceId,
        departamento,
        activo: true,
        fechaAlta: Date.now(),
        imageUrl
      }
    }));
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Empleado registrado exitosamente',
        empleadoId,
        faceId
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

---

## 🔐 PERMISOS IAM

### Lambda Video Processor

```json
{
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
        "dynamodb:PutItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:825765382487:table/access-control-logs",
        "arn:aws:dynamodb:us-east-1:825765382487:table/access-control-alerts"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:us-east-1:825765382487:access-control-alerts"
    }
  ]
}
```

### Lambda Face Indexer

```json
{
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
      "Resource": "arn:aws:s3:::rekognition-gcontreras/access-control/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:825765382487:table/access-control-employees"
    }
  ]
}
```

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Semana 1: Setup Inicial

**Día 1-2: Infraestructura AWS**
- [ ] Crear Face Collection `empleados-coirontech`
- [ ] Crear tablas DynamoDB
- [ ] Configurar SNS Topic para alertas
- [ ] Crear estructura S3

**Día 3-4: Backend MVP**
- [ ] Lambda face-indexer
- [ ] Lambda video-processor (versión básica)
- [ ] API Gateway endpoints
- [ ] Probar con imágenes estáticas

**Día 5: Testing Backend**
- [ ] Indexar 5 rostros de prueba
- [ ] Probar identificación
- [ ] Validar alertas SNS

### Semana 2: Frontend MVP

**Día 1-2: Setup Frontend**
- [ ] Crear proyecto React
- [ ] Configurar Amplify
- [ ] Integrar Cognito (compartido)
- [ ] Estructura de componentes

**Día 3-4: Componentes Principales**
- [ ] Dashboard con stats
- [ ] EmployeeManagement
- [ ] AccessLog
- [ ] AlertsPanel

**Día 5: Integración y Testing**
- [ ] Conectar frontend con APIs
- [ ] Probar flujo completo
- [ ] Ajustes de UI/UX

### Semana 3: Video Streaming

**Día 1-2: Kinesis Video Streams**
- [ ] Configurar stream
- [ ] Conectar cámara de prueba
- [ ] Lambda para procesar frames

**Día 3-4: LiveMonitor Component**
- [ ] Mostrar video en tiempo real
- [ ] Overlay de detecciones
- [ ] Indicadores de estado

**Día 5: Testing Completo**
- [ ] Probar con cámara real
- [ ] Validar latencia
- [ ] Optimizar performance

---

## 💰 PRESUPUESTO ESTIMADO

### Desarrollo (One-time)

| Fase | Horas | Costo (USD $50/hr) |
|------|-------|-------------------|
| Setup Infraestructura | 16h | $800 |
| Backend MVP | 24h | $1,200 |
| Frontend MVP | 32h | $1,600 |
| Video Streaming | 24h | $1,200 |
| Testing y Ajustes | 16h | $800 |
| **TOTAL** | **112h** | **$5,600** |

### Operación Mensual (Recurring)

| Servicio | Costo Mensual |
|----------|---------------|
| Rekognition | $12 |
| Kinesis Video | $50 |
| DynamoDB | $5 |
| Lambda | $2 |
| S3 | $3 |
| SNS | $1 |
| Amplify Hosting | $15 |
| **TOTAL** | **~$88/mes** |

---

## ✅ CHECKLIST DE DECISIÓN

Antes de proceder, validar:

- [ ] Presupuesto aprobado ($5,600 desarrollo + $88/mes)
- [ ] Cumplimiento legal (consentimiento empleados)
- [ ] Infraestructura de cámaras disponible
- [ ] Equipo de seguridad capacitado
- [ ] Políticas de privacidad actualizadas
- [ ] Plan de comunicación a empleados
- [ ] Stakeholders alineados

---

**Fecha:** 04/11/2025  
**Autor:** Amazon Q  
**Estado:** Propuesta para evaluación  
**Próxima acción:** Validar con Guillermo y stakeholders
