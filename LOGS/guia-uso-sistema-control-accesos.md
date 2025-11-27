# 📖 Guía de Uso - Sistema de Control de Accesos

## 🎯 ¿Qué hace el sistema?

El sistema monitorea cámaras en tiempo real y:
1. **Identifica empleados** registrados usando reconocimiento facial
2. **Detecta objetos** en la escena
3. **Genera alertas** para personas no autorizadas
4. **Registra eventos** de acceso (ingresos/egresos)

---

## 🚀 Cómo usar

### 1. Registrar Empleados

**Ir a:** 👥 Empleados

1. Clic en "+ Agregar Empleado"
2. Completar:
   - ID: EMP001
   - Nombre: Juan
   - Apellido: Pérez
   - Departamento: Producción
   - Foto: Subir foto del rostro (clara, frontal)
3. Clic en "Registrar"

**Importante:** La foto debe mostrar el rostro claramente para que el sistema pueda identificar a la persona.

---

### 2. Probar Reconocimiento (Imagen Estática)

**Ir a:** 🎥 Video

1. Subir una foto de un empleado registrado
2. El sistema mostrará:
   - ✅ Empleado identificado (si está registrado)
   - 🚫 No autorizado (si no está registrado)
   - Lista de objetos detectados

---

### 3. Monitoreo en Vivo (Webcam)

**Ir a:** 📹 En Vivo

1. Clic en "▶️ Iniciar Cámara"
2. Permitir acceso a la webcam
3. Activar "Captura automática"
4. El sistema procesará frames cada 5 segundos

**Resultados en tiempo real:**
- Panel derecho muestra último resultado
- ✅ Verde = Empleado autorizado
- 🚫 Rojo = Persona no autorizada

---

### 4. Monitor Multi-Cámara

**Ir a:** 🎬 Multi-Cámara

**Funcionalidades:**

#### A. Ver Cámaras
- Grid muestra todas las cámaras activas
- Cada cámara se actualiza cada 1 segundo
- Overlay muestra último resultado de detección

#### B. Grabar Eventos
1. Clic en "⏺️ Grabando" (botón se pone rojo)
2. El sistema registra todos los eventos
3. Ver eventos en panel "📋 Eventos Recientes"
4. Clic en "💾 Exportar" para descargar JSON

#### C. Agregar Cámara
1. Clic en "+ Agregar Cámara"
2. Completar:
   - ID: CAM-003
   - Nombre: Almacén
   - Ubicación: Planta 2
   - Tipo: Webcam o RTSP
   - URL: (solo para RTSP) rtsp://usuario:pass@ip:554/stream
3. Clic en "Agregar"

---

## 📊 Ver Resultados

### Dashboard
**Ir a:** 📊 Dashboard

Muestra estadísticas en tiempo real:
- Ingresos del día
- Egresos del día
- Personas presentes
- Alertas activas

### Logs de Acceso
**Ir a:** 📋 Logs

Lista completa de todos los accesos registrados:
- Timestamp
- Empleado ID
- Cámara
- Tipo (ingreso/egreso)
- Objetos detectados

### Alertas
**Ir a:** 🚨 Alertas

Alertas activas que requieren atención:
- Personas no autorizadas
- Objetos restringidos saliendo
- Descripción del evento

---

## 🎯 Flujo Típico de Uso

### Configuración Inicial (Una vez)
1. Registrar todos los empleados (👥 Empleados)
2. Agregar cámaras (🎬 Multi-Cámara)

### Uso Diario
1. Ir a 🎬 Multi-Cámara
2. Activar "⏺️ Grabando"
3. El sistema monitorea automáticamente
4. Revisar alertas en 🚨 Alertas
5. Revisar logs en 📋 Logs
6. Ver estadísticas en 📊 Dashboard

---

## ⚙️ Configuración Actual

### Cámaras Activas
- **CAM-001:** Webcam (Entrada Principal)
- **CAM2:** RTSP (Cámara Exterior)

### Intervalos de Captura
- **Webcam:** Cada 10 segundos
- **RTSP:** Snapshot cada 1 segundo, procesamiento cada 10 segundos

### Servidor de Streaming
- **URL:** http://localhost:8888
- **Estado:** Debe estar corriendo para cámaras RTSP

---

## 🔧 Solución de Problemas

### Cámara en negro
**Causa:** Límite de conexiones de la cámara alcanzado

**Solución:**
```bash
cd streaming-server
pkill -9 ffmpeg
curl -X POST http://localhost:8888/stream/start \
  -H "Content-Type: application/json" \
  -d '{"cameraId":"CAM2","rtspUrl":"rtsp://gscontreras:*N1914dos@192.168.68.59:554/stream1"}'
```

### No se detectan empleados
**Causa:** Foto de registro no es clara o ángulo diferente

**Solución:**
- Registrar empleado con foto frontal clara
- Asegurar buena iluminación
- Rostro debe ocupar al menos 30% de la imagen

### Servidor de streaming no responde
**Solución:**
```bash
cd streaming-server
node server.js > streaming-server.log 2>&1 &
```

---

## 📝 Notas Importantes

1. **Privacidad:** Sistema cumple con regulaciones de privacidad
2. **Consentimiento:** Empleados deben dar consentimiento para registro facial
3. **Retención:** Logs se mantienen 30 días
4. **Backup:** Sistema hace backup automático diario a las 5:00 AM

---

## 🆘 Soporte

**Documentación completa:**
- `/LOGS/sistema-control-accesos-propuesta.md`
- `/LOGS/implementacion-control-accesos-inicio.md`

**Logs del sistema:**
- Frontend: Consola del navegador (F12)
- Backend: CloudWatch Logs
- Streaming: `streaming-server/streaming-server.log`
