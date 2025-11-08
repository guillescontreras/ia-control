# HISTORIAL DE VERSIONES - SISTEMA DE CONTROL DE ACCESOS (IA-CONTROL)

Proyecto: Sistema Inteligente de Monitoreo y Control de Accesos
Inicio: 04/11/2025
Estado: En Desarrollo Activo

================================================================================
VERSIÓN ACTUAL: v1.7.0
================================================================================

---

## HISTORIAL DE VERSIONES

### v1.7.0 (08/11/2025) - Fix Crítico Eliminación de Empleados
- ✅ Corregido bug crítico: empleados eliminados seguían siendo detectados
- ✅ Endpoint DELETE /employees/{id} ahora elimina rostros de Rekognition
- ✅ Agregado DeleteFacesCommand al eliminar empleado
- ✅ Permisos IAM actualizados (rekognition:DeleteFaces)
- ✅ Dependencia @aws-sdk/client-rekognition agregada
- ✅ Lambda ia-control-access-log-api desplegada
- ✅ Probado y funcionando correctamente

### v1.6.x (07/11/2025) - Mejoras UX y Registro Multi-Ángulo
- ✅ Registro multi-ángulo para mejorar reconocimiento facial
- ✅ Eliminadas solapas Video y En Vivo (simplificación UI)
- ✅ Fix: Usar nombre completo en lugar de empleadoId
- ✅ Amazon Polly integrado para síntesis de voz
- ✅ Fix: Detección solo al grabar (optimización)
- ✅ Fix: Evitar modal duplicado y speech repetitivo
- ✅ Botones visibles y grid responsive
- ✅ Botón Ingreso/Egreso implementado

### v1.5.0 (07/11/2025) - Mejoras Críticas AWS Best Practices
- ✅ Motion detection mejorado (threshold 60, blur 1.5)
- ✅ Intervalo de captura reducido a 1 segundo
- ✅ Text-to-speech con Web Speech API
- ✅ Botón pausa/reanudar por cámara
- ✅ Logs detallados de motion detection
- ✅ Reducción de falsos positivos

### v1.4.0 (07/11/2025) - Edición Completa de Usuarios y Empleados
- ✅ Edición de usuarios del sistema
- ✅ Edición de empleados registrados
- ✅ CORS configurado en PUT /users
- ✅ Campo contraseña en edición de usuarios

### v1.3.0 (06/11/2025) - Alertas Sonoras y Presencia
- ✅ Alertas sonoras implementadas
- ✅ Logo mejorado
- ✅ Sistema de presencia y control de asistencia
- ✅ Tracking de ingresos/egresos

### v1.2.0 (06/11/2025) - Motion Detection y Notificaciones
- ✅ Motion detection implementado
- ✅ Toast notifications
- ✅ Optimización de procesamiento de frames

### v1.1.0 (06/11/2025) - Gestión de Usuarios
- ✅ Gestión de usuarios con AdminCreateUser
- ✅ Integración con Cognito User Pool
- ✅ Roles y permisos por grupo

### v1.0.0 (06/11/2025) - Producción con Autenticación
- ✅ Autenticación con AWS Cognito
- ✅ User Pool compartido con EPI Dashboard (epi-dashboard-users)
- ✅ Grupos: ia-control-admins, ia-control-operators
- ✅ Control de acceso por roles
- ✅ Componente Login integrado
- ✅ Sesión persistente
- ✅ Botón cerrar sesión
- ✅ Admins: acceso completo
- ✅ Operadores: solo visualización
- ✅ Repositorio GitHub: guillescontreras/ia-control
- ✅ Deploy en AWS Amplify (d18gqhtetuceh3)
- ✅ Dominio: control.coirontech.com (configurado)
- ✅ SSL automático con ACM
- ✅ CI/CD automático desde GitHub

### v0.8.0 (06/11/2025) - Gráficos de Actividad
- ✅ Gráfico de barras: Ingresos vs Egresos vs Presentes
- ✅ Gráfico de dona: Distribución de accesos
- ✅ Gráfico de línea: Actividad por hora (24h)
- ✅ Chart.js integrado
- ✅ Dashboard mejorado con visualizaciones

### v0.7.0 (06/11/2025) - Reportes PDF
- ✅ Generación de reportes PDF desde Dashboard
- ✅ Reporte incluye: estadísticas, últimos accesos, alertas, empleados
- ✅ Descarga automática con fecha en nombre de archivo
- ✅ Librería jsPDF integrada

### v0.6.0 (06/11/2025) - Exportación y Mejoras
- ✅ Exportación de logs a CSV
- ✅ Exportación de alertas a CSV
- ✅ Exportación de empleados a CSV
- ✅ Soporte para múltiples webcams USB
- ✅ Selector de dispositivos de video
- ✅ 3 cámaras funcionando simultáneamente

### v0.5.0 (06/11/2025) - Optimización RTSP
- ✅ Pool de conexiones RTSP implementado
- ✅ Reutilización de streams activos (refCount)
- ✅ Cleanup automático de procesos FFmpeg (cada 60s)
- ✅ Timeout de inactividad (5 minutos)
- ✅ Monitoreo de salud de servidor (/health endpoint)
- ✅ Indicador visual de estado de conexiones en frontend
- ✅ Cleanup de procesos FFmpeg al terminar capturas

### v0.4.0 (06/11/2025) - Gestión Completa
- ✅ Edición de empleados (nombre, apellido, departamento)
- ✅ Eliminación de empleados con confirmación
- ✅ Búsqueda de empleados por nombre/apellido/ID
- ✅ Endpoints PUT/DELETE /employees/{id} en Lambda
- ✅ Permisos IAM UpdateItem/DeleteItem agregados
- ✅ Edición de cámaras (nombre, ubicación, URL)
- ✅ Eliminación de cámaras con confirmación
- ✅ API Gateway configurado con métodos GET/PUT/DELETE

### v0.3.0 (06/11/2025) - Dashboard con Datos Reales
- ✅ Corregido cálculo de timestamp en endpoint /stats (UTC → últimas 24h)
- ✅ Dashboard muestra estadísticas reales de DynamoDB
- ✅ AccessLog conectado con datos reales (335 registros)
- ✅ AlertsPanel conectado con datos reales (434 alertas)
- ✅ Endpoints /stats, /logs, /alerts operativos

### v0.2.0 (05/11/2025) - Registro Multi-Foto y Optimización
- ✅ Registro de empleados con múltiples fotos
- ✅ Indexación de múltiples ángulos en Rekognition
- ✅ Optimización de conexiones RTSP (snapshot cada 3s)
- ✅ Controles de visualización de cámaras (columnas y tamaño)
- ✅ Mejora en manejo de frames vacíos
- ✅ Validación de imágenes antes de procesar

### v0.1.0 (04-05/11/2025) - POC Inicial
- ✅ Infraestructura AWS completa
- ✅ Backend: 5 Lambdas desplegadas
- ✅ Frontend React con 7 componentes
- ✅ Servidor de streaming Node.js + FFmpeg
- ✅ Integración webcam funcionando
- ✅ Integración cámara RTSP funcionando
- ✅ Reconocimiento facial operativo
- ✅ Sistema de eventos y grabación

---

## BUGS PENDIENTES

### 🔴 Alta Prioridad

Ninguno

### 🟡 Media Prioridad

#### Reconocimiento desde Ángulos Cenitales
**Problema:** Cámara en techo no reconoce empleados a distancia
**Causa:** Ángulo cenital + distancia = rostro muy pequeño
**Solución implementada:** Registro con múltiples fotos
**Pendiente:** Validar efectividad en producción

### 🟢 Baja Prioridad

---

## ROADMAP FUTURO

### v1.1.0 (PRÓXIMA) - Auditoría y Documentación
- [ ] Auditoría completa de acciones
- [ ] Documentación de usuario
- [ ] Pruebas de carga
- **Estimado:** 6-8 horas

---

## INFRAESTRUCTURA AWS

### Frontend
- AWS Amplify App ID: d18gqhtetuceh3
- URL temporal: https://main.d18gqhtetuceh3.amplifyapp.com/
- Dominio producción: https://control.coirontech.com (pendiente activación)
- Repositorio: https://github.com/guillescontreras/ia-control
- Branch: main
- Deploy automático: ✅

### Lambdas (5)
- ia-control-face-indexer (512MB, 30s)
- ia-control-video-processor (1024MB, 60s)
- ia-control-access-log-api (512MB, 30s)
- ia-control-upload-presigned (512MB, 30s)
- ia-control-camera-manager (512MB, 30s)

### DynamoDB (4 tablas)
- ia-control-employees
- ia-control-logs (con GSI)
- ia-control-alerts
- ia-control-cameras

### S3
- Bucket: ia-control-coirontech
- Estructura: /employee-faces/

### Rekognition
- Collection: ia-control-employees
- Faces indexadas: 1 empleado (múltiples ángulos)

### API Gateway
- ID: bx2rwg4ogk
- Stage: prod
- Endpoints: 8

### Servidor Streaming
- Puerto: 8888
- Stack: Node.js + FFmpeg
- Protocolo: RTSP → Snapshot
- Ubicación: localhost (pendiente deploy a producción)

### DNS (Lightsail)
- Zona: coirontech.com
- Registro: control.coirontech.com → djz5bhdosx7o.cloudfront.net
- Verificación SSL: Configurada

---

## MÉTRICAS ACTUALES

### Rendimiento
- Reconocimiento facial: ~2-3 segundos
- Snapshot RTSP: ~1 segundo
- Procesamiento frame: ~2-3 segundos

### Precisión
- Webcam frontal: 100% (1/1)
- RTSP cercano: 100% (1/1)
- RTSP lejano: 0% (limitación física)

### Uso de Recursos
- Lambda invocations: ~50/día (testing)
- Rekognition searches: ~30/día
- S3 storage: ~5MB

### Datos Actuales (24h)
- Egresos: 335
- Ingresos: 0
- Presentes: 0
- Alertas activas: 434

---

## NOTAS TÉCNICAS

### Lecciones Aprendidas
1. Cámaras cenitales no son ideales para reconocimiento facial
2. Registro con múltiples ángulos mejora significativamente el match
3. FFmpeg requiere gestión cuidadosa de procesos para evitar zombies
4. Límite de conexiones de cámaras IP es un factor crítico
5. Lambdas ejecutan en UTC: usar últimas 24h en lugar de medianoche local

### Decisiones de Arquitectura
1. Snapshot periódico vs streaming continuo: Elegimos snapshot por estabilidad
2. Servidor streaming separado: Permite escalar independientemente
3. localStorage para cámaras: Evita llamadas API innecesarias
4. Múltiples FaceIds por empleado: Mejora reconocimiento multi-ángulo

---

## ARCHIVO DE TAREAS
Ver: ia-control-correcciones.txt

---

Última actualización: 08/11/2025
Próxima revisión: Al finalizar v1.8.0

---

## DEPLOY EN PRODUCCIÓN

### URLs del Sistema
- **Producción:** https://control.coirontech.com (activándose)
- **Temporal:** https://main.d18gqhtetuceh3.amplifyapp.com/
- **Repositorio:** https://github.com/guillescontreras/ia-control

### Arquitectura de Dominios
```
coirontech.com (DonWeb + Lightsail DNS)
├── www.coirontech.com → Lightsail Instance
├── epi.coirontech.com → AWS Amplify (EPI Dashboard)
└── control.coirontech.com → AWS Amplify (IA-Control)
```

### Cognito Compartido
```
User Pool: epi-dashboard-users (us-east-1_zrdfN7OKN)
├── App Client EPI: [existente]
└── App Client IA-Control: 6o457vsfr35cusuqpui7u23cnn

Grupos:
├── ia-control-admins (acceso completo)
└── ia-control-operators (solo lectura)
```
