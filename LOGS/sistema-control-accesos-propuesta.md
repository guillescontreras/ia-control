# Sistema de Control de Accesos y Seguridad con AWS Rekognition

## 📋 RESUMEN EJECUTIVO

Sistema inteligente de monitoreo para organizaciones que permite:
- ✅ Registro automático de ingreso/egreso de personal
- ✅ Identificación facial contra base de datos autorizada
- ✅ Control de objetos/equipos que salen de la organización
- ✅ Detección de conductas sospechosas
- ✅ Alertas en tiempo real
- ✅ Reportes y auditoría completa

---

## 🎯 CASOS DE USO

### 1. Control de Acceso
- Identificar empleados autorizados vs visitantes
- Registro automático de horarios de entrada/salida
- Alertas de personas no autorizadas

### 2. Control de Stock/Inventario
- Detectar objetos que salen de la organización
- Validar autorización de salida de equipos
- Prevención de robo de herramientas/laptops

### 3. Seguridad Proactiva
- Detectar personas merodeando en áreas restringidas
- Identificar comportamientos anómalos
- Alertas automáticas a seguridad

### 4. Auditoría y Compliance
- Registro completo de accesos
- Trazabilidad de movimientos de equipos
- Reportes para auditorías

---

## 🏗️ ARQUITECTURA TÉCNICA

### Componentes AWS

```
CÁMARAS IP
    ↓
KINESIS VIDEO STREAMS (ingesta video)
    ↓
LAMBDA PROCESSOR (análisis frame-by-frame)
    ↓
REKOGNITION SERVICES:
    - SearchFacesByImage (identificación)
    - DetectLabels (objetos)
    - DetectPersons (seguimiento)
    ↓
DYNAMODB (logs y registros)
    ↓
SNS (alertas tiempo real)
    ↓
FRONTEND DASHBOARD (visualización)
```

### Servicios Principales

1. **Amazon Rekognition Face Collections**
   - Base de datos de rostros indexados
   - Búsqueda facial en <1 segundo
   - Precisión >95%

2. **Amazon Kinesis Video Streams**
   - Ingesta de video en tiempo real
   - Buffer de 24 horas
   - Soporte múltiples cámaras

3. **AWS Lambda**
   - Procesamiento serverless
   - Análisis frame-by-frame
   - Orquestación de servicios

4. **Amazon DynamoDB**
   - Logs de accesos
   - Historial de eventos
   - Consultas rápidas

5. **Amazon SNS**
   - Alertas por email/SMS
   - Notificaciones push
   - Integración con Slack

---

## 💰 COSTOS ESTIMADOS

### Organización Mediana (50 empleados, 200 eventos/día)

| Servicio | Costo Mensual |
|----------|---------------|
| Rekognition Face Search | $6 |
| Rekognition DetectLabels | $6 |
| Kinesis Video Streams | $50 |
| DynamoDB | $5 |
| Lambda | $1 |
| S3 Storage | $2 |
| SNS | $1 |
| **TOTAL** | **~$70-80/mes** |

### Escalabilidad

- **100 empleados:** ~$120/mes
- **500 empleados:** ~$400/mes
- **1000+ empleados:** Consultar AWS Enterprise

---

## 🔐 SEGURIDAD Y PRIVACIDAD

### Cumplimiento Legal

**Requisitos obligatorios:**
1. ✅ Consentimiento explícito de empleados
2. ✅ Política de retención de datos (máx 30 días)
3. ✅ Derecho al olvido (eliminar rostros)
4. ✅ Señalización visible de cámaras
5. ✅ Política de uso de datos biométricos

### Protección de Datos

```python
# Encriptación en reposo (KMS)
SSESpecification={'Enabled': True, 'SSEType': 'KMS'}

# Retención automática 30 días
lifecycle_policy = {'Expiration': {'Days': 30}}

# Acceso restringido (IAM)
Policy: "rekognition:SearchFaces" solo para roles autorizados
```

### GDPR / Protección de Datos Personales

- Datos biométricos = categoría especial
- Requiere base legal sólida (contrato laboral)
- Transparencia total con empleados
- Auditorías periódicas

---

## 📊 IMPLEMENTACIÓN TÉCNICA

### Fase 1: Crear Face Collection

```bash
# Crear colección de empleados
aws rekognition create-collection \
  --collection-id empleados-coirontech \
  --region us-east-1

# Indexar rostro de empleado
aws rekognition index-faces \
  --collection-id empleados-coirontech \
  --image '{"S3Object":{"Bucket":"coirontech-faces","Name":"empleados/EMP001.jpg"}}' \
  --external-image-id "EMP001-Guillermo-Contreras" \
  --detection-attributes "ALL"
```

### Fase 2: Lambda Processor

```python
import boto3
from datetime import datetime

rekognition = boto3.client('rekognition')
dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')

def lambda_handler(event, context):
    frame_bytes = event['frame']
    camera_id = event['cameraId']
    
    # 1. Buscar rostro
    face_response = rekognition.search_faces_by_image(
        CollectionId='empleados-coirontech',
        Image={'Bytes': frame_bytes},
        FaceMatchThreshold=95
    )
    
    # 2. Detectar objetos
    label_response = rekognition.detect_labels(
        Image={'Bytes': frame_bytes},
        MaxLabels=10,
        MinConfidence=80
    )
    
    # 3. Procesar
    if face_response['FaceMatches']:
        empleado_id = face_response['FaceMatches'][0]['Face']['ExternalImageId']
        objetos = [l['Name'] for l in label_response['Labels']]
        
        # Registrar acceso
        table = dynamodb.Table('accesos-coirontech')
        table.put_item(Item={
            'timestamp': int(datetime.now().timestamp()),
            'empleadoId': empleado_id,
            'cameraId': camera_id,
            'tipo': 'ingreso' if camera_id == 'entrada' else 'egreso',
            'objetos': objetos,
            'confianza': face_response['FaceMatches'][0]['Similarity']
        })
        
        # Alerta si lleva objetos restringidos
        objetos_restringidos = ['Laptop', 'Tool', 'Equipment']
        if camera_id == 'salida' and any(obj in objetos for obj in objetos_restringidos):
            sns.publish(
                TopicArn='arn:aws:sns:us-east-1:825765382487:alertas-seguridad',
                Subject=f'Alerta: {empleado_id} saliendo con equipo',
                Message=f'Objetos detectados: {objetos}'
            )
    else:
        # Persona no autorizada
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:825765382487:alertas-seguridad',
            Subject='Alerta: Persona no autorizada',
            Message=f'Rostro no reconocido en {camera_id}'
        )
    
    return {'statusCode': 200}
```

### Fase 3: DynamoDB Schema

```javascript
// Tabla: accesos-coirontech
{
  timestamp: Number,        // Partition Key (epoch)
  empleadoId: String,       // Sort Key
  cameraId: String,         // 'entrada' | 'salida' | 'almacen'
  tipo: String,             // 'ingreso' | 'egreso'
  objetos: List,            // Objetos detectados
  confianza: Number,        // % confianza facial
  imageUrl: String          // S3 URL del frame (opcional)
}

// GSI: empleadoId-timestamp-index
// GSI: cameraId-timestamp-index
```

---

## 🔗 INTEGRACIÓN CON APP EXISTENTE

### Opción 1: Módulo Independiente (RECOMENDADO)

**Ventajas:**
- ✅ No afecta app actual
- ✅ Desarrollo paralelo
- ✅ Usuarios diferentes (seguridad vs operaciones)
- ✅ Escalabilidad independiente

**Arquitectura:**

```
EPI DASHBOARD (actual)
    - Análisis de EPPs
    - Detección de objetos/rostros/texto
    - Usuarios: supervisores, operadores

CONTROL DE ACCESOS (nuevo)
    - Monitoreo en tiempo real
    - Registro de accesos
    - Alertas de seguridad
    - Usuarios: seguridad, RRHH, gerencia
```

**Implementación:**

```
/Coirontech-AWS/
├── Rekognition/
│   ├── epi-dashboard/              # App actual
│   └── access-control-system/      # Nuevo módulo
│       ├── frontend/
│       │   ├── src/
│       │   │   ├── components/
│       │   │   │   ├── LiveMonitor.tsx
│       │   │   │   ├── AccessLog.tsx
│       │   │   │   ├── EmployeeManagement.tsx
│       │   │   │   └── AlertsPanel.tsx
│       │   │   └── App.tsx
│       │   └── package.json
│       └── backend/
│           ├── lambdas/
│           │   ├── video-processor/
│           │   ├── face-indexer/
│           │   └── alert-manager/
│           └── infrastructure/
│               └── cloudformation.yaml
```

### Opción 2: Integración en App Actual

**Ventajas:**
- ✅ Una sola app
- ✅ Usuarios compartidos
- ✅ Datos centralizados

**Desventajas:**
- ❌ Mayor complejidad
- ❌ Riesgo de afectar funcionalidad actual
- ❌ Bundle más grande

**Implementación:**

```typescript
// Agregar nueva sección en App.tsx
const [activeSection, setActiveSection] = useState<'analysis' | 'history' | 'access-control'>('analysis');

// Nuevo componente
<AccessControlDashboard 
  userRole={userProfile.role}
  permissions={userProfile.permissions}
/>
```

---

## 🎨 PROPUESTA DE UI/UX

### Dashboard Principal

```
┌─────────────────────────────────────────────────────────────┐
│  🏢 CoironTech - Control de Accesos                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 RESUMEN HOY                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Ingresos │  │ Egresos  │  │ Alertas  │  │ Presentes│   │
│  │   45     │  │   38     │  │    2     │  │    7     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  🎥 MONITOREO EN VIVO                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Entrada     │  │ Salida      │  │ Almacén     │        │
│  │ [VIDEO]     │  │ [VIDEO]     │  │ [VIDEO]     │        │
│  │ ✅ Normal   │  │ ⚠️ Alerta   │  │ ✅ Normal   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                              │
│  📋 ÚLTIMOS ACCESOS                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 14:35 | Guillermo Contreras | Ingreso | ✅           │  │
│  │ 14:32 | María González      | Egreso  | ⚠️ Laptop   │  │
│  │ 14:28 | Juan Pérez          | Ingreso | ✅           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  🚨 ALERTAS ACTIVAS                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ⚠️ Persona no autorizada - Cámara Entrada - 14:32   │  │
│  │ ⚠️ Equipo saliendo sin autorización - 14:30         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Gestión de Empleados

```
┌─────────────────────────────────────────────────────────────┐
│  👥 Gestión de Empleados                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [+ Agregar Empleado]  [📤 Importar CSV]  [🔍 Buscar...]   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ID    │ Nombre              │ Rostro │ Estado       │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ EMP001│ Guillermo Contreras │ [📷]   │ ✅ Activo   │  │
│  │ EMP002│ María González      │ [📷]   │ ✅ Activo   │  │
│  │ EMP003│ Juan Pérez          │ [📷]   │ 🔴 Inactivo │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [Editar] [Eliminar] [Ver Historial]                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 FEATURES PROPUESTAS

### MVP (Versión 1.0)

1. ✅ Registro de empleados con foto
2. ✅ Indexación de rostros en Rekognition
3. ✅ Monitoreo de 1 cámara (entrada)
4. ✅ Identificación facial básica
5. ✅ Log de accesos en DynamoDB
6. ✅ Dashboard simple con últimos accesos
7. ✅ Alertas por email (persona no autorizada)

**Estimado:** 2-3 semanas desarrollo

### Versión 2.0

1. ✅ Múltiples cámaras (entrada/salida/almacén)
2. ✅ Detección de objetos
3. ✅ Alertas de equipos saliendo
4. ✅ Reportes diarios/semanales
5. ✅ Integración con Slack
6. ✅ Dashboard en tiempo real

**Estimado:** +2 semanas

### Versión 3.0 (Avanzada)

1. ✅ Detección de conductas sospechosas
2. ✅ Análisis de patrones (ML)
3. ✅ Integración con sistema de RRHH
4. ✅ Control de horarios laborales
5. ✅ Reportes de productividad
6. ✅ App móvil para alertas

**Estimado:** +4 semanas

---

## 🚀 ROADMAP DE IMPLEMENTACIÓN

### Fase 1: Proof of Concept (1 semana)

- [ ] Crear Face Collection de prueba
- [ ] Indexar 5 rostros de empleados
- [ ] Lambda básico de identificación
- [ ] Probar con imágenes estáticas
- [ ] Validar precisión >95%

### Fase 2: MVP Backend (2 semanas)

- [ ] Configurar Kinesis Video Streams
- [ ] Lambda processor completo
- [ ] DynamoDB schema y tablas
- [ ] SNS para alertas
- [ ] API Gateway para frontend

### Fase 3: MVP Frontend (2 semanas)

- [ ] Dashboard básico (React)
- [ ] Gestión de empleados
- [ ] Log de accesos
- [ ] Panel de alertas
- [ ] Deploy en Amplify

### Fase 4: Testing y Ajustes (1 semana)

- [ ] Pruebas con cámara real
- [ ] Ajuste de umbrales
- [ ] Optimización de costos
- [ ] Documentación de usuario

### Fase 5: Producción (1 semana)

- [ ] Deploy en cuenta AWS producción
- [ ] Configuración de cámaras
- [ ] Capacitación de usuarios
- [ ] Monitoreo y soporte

**TOTAL MVP: 6-7 semanas**

---

## 💡 RECOMENDACIÓN FINAL

### Opción Recomendada: Módulo Independiente

**Razones:**

1. **Separación de responsabilidades**
   - EPI Dashboard: Análisis de seguridad laboral
   - Access Control: Seguridad física y control de accesos

2. **Usuarios diferentes**
   - EPI: Supervisores, operadores de campo
   - Access Control: Seguridad, RRHH, gerencia

3. **Escalabilidad**
   - Cada módulo crece independientemente
   - No afecta performance de app actual

4. **Mantenimiento**
   - Bugs en un módulo no afectan al otro
   - Deploys independientes

### Arquitectura Propuesta

```
/Coirontech-AWS/
├── Rekognition/
│   ├── epi-dashboard/              # App actual (mantener)
│   └── access-control-system/      # Nuevo módulo
│       ├── frontend/
│       │   ├── public/
│       │   └── src/
│       │       ├── components/
│       │       ├── services/
│       │       └── App.tsx
│       ├── backend/
│       │   ├── video-processor/
│       │   ├── face-indexer/
│       │   └── alert-manager/
│       └── infrastructure/
│           └── cloudformation.yaml
```

### Compartir Recursos

**Servicios compartidos:**
- ✅ Cognito User Pool (mismos usuarios, roles diferentes)
- ✅ S3 Bucket (carpetas separadas)
- ✅ DynamoDB (tablas separadas)
- ✅ SNS Topics (alertas separadas)

**Ventaja:** Usuarios pueden acceder a ambas apps con mismo login

---

## 📞 PRÓXIMOS PASOS

1. **Validar propuesta** con stakeholders
2. **Definir alcance MVP** (features prioritarias)
3. **Aprobar presupuesto** (~$80/mes + desarrollo)
4. **Iniciar Fase 1** (Proof of Concept)
5. **Evaluar resultados** y decidir continuar

---

**Fecha:** 04/11/2025  
**Autor:** Amazon Q  
**Estado:** Propuesta para evaluación  
**Próxima revisión:** Pendiente aprobación
