# IA-Control - Roadmap de Mejoras

**Fecha:** 07/11/2025  
**Estado Actual:** v1.2.0 (Motion Detection + Toast Notifications)

---

## 🎯 MEJORAS IDENTIFICADAS

### 1. Diseño y UX (Prioridad ALTA)
**Objetivo:** Interfaz profesional y branded

- [ ] Logo de CoironTech en login
- [ ] Rediseño de dashboard con mejor layout
- [ ] Paleta de colores corporativa
- [ ] Iconografía consistente
- [ ] Responsive mejorado

**Tiempo estimado:** 1 día  
**Impacto:** Alto (primera impresión del cliente)

---

### 2. Alertas Sonoras (Prioridad ALTA)
**Objetivo:** Feedback auditivo para operadores

- [ ] Sonido de confirmación cuando se reconoce empleado (✅ beep corto)
- [ ] Sonido de alerta cuando persona no autorizada (🚨 alarma)
- [ ] Control de volumen en configuración
- [ ] Opción de silenciar

**Implementación:**
```javascript
// Usar Web Audio API
const playSound = (type: 'success' | 'alert') => {
  const audio = new Audio(type === 'success' ? '/sounds/success.mp3' : '/sounds/alert.mp3');
  audio.play();
};
```

**Tiempo estimado:** 2 horas  
**Impacto:** Alto (mejora atención del operador)

---

### 3. Edición de Datos Personales (Prioridad MEDIA)
**Objetivo:** Gestión completa de usuarios y empleados

**Usuarios (Cognito):**
- [ ] Editar nombre, apellido
- [ ] Cambiar email (requiere re-verificación)
- [ ] Cambiar rol (admin/operador)
- [ ] Resetear contraseña

**Empleados (Rekognition):**
- [ ] Editar nombre, apellido, ID
- [ ] Actualizar foto (re-indexar rostro)
- [ ] Agregar/editar datos de contacto
- [ ] Estado activo/inactivo

**Tiempo estimado:** 4 horas  
**Impacto:** Medio (funcionalidad esperada)

---

### 4. Identificación de Cámaras Ingreso/Egreso (Prioridad ALTA)
**Objetivo:** Diferenciar tipo de acceso

**Implementación:**
- [ ] Campo "tipo" en tabla ia-control-cameras (ingreso/egreso/general)
- [ ] Selector en formulario de cámara
- [ ] Lógica en video-processor para registrar tipo correcto
- [ ] Indicador visual en MultiCameraMonitor

**Cambios en DynamoDB:**
```javascript
// ia-control-cameras
{
  cameraId: "CAM-001",
  name: "Entrada Principal",
  tipo: "ingreso", // ingreso | egreso | general
  location: "Planta Baja"
}

// ia-control-logs
{
  timestamp: 123456789,
  empleadoId: "EMP-001",
  cameraId: "CAM-001",
  tipo: "ingreso", // Se toma del tipo de cámara
  ...
}
```

**Tiempo estimado:** 2 horas  
**Impacto:** Alto (crítico para control de asistencia)

---

### 5. Dashboard de Presencia y Asistencia (Prioridad ALTA)
**Objetivo:** Control en tiempo real de quién está presente

**Features:**

#### A. Panel de Presencia
```
┌─────────────────────────────────────────┐
│  👥 Empleados Presentes (15/50)         │
├─────────────────────────────────────────┤
│  🟢 Juan Pérez      Ingreso: 08:15      │
│  🟢 María García    Ingreso: 08:20      │
│  🟢 Carlos López    Ingreso: 08:30      │
│  ...                                     │
├─────────────────────────────────────────┤
│  🔴 Ausentes (35)                        │
│  Pedro Martínez, Ana Silva, ...         │
└─────────────────────────────────────────┘
```

#### B. Control de Asistencia
```
┌─────────────────────────────────────────┐
│  📊 Asistencia del Día                   │
├─────────────────────────────────────────┤
│  Empleado      Ingreso  Egreso  Horas   │
│  Juan Pérez    08:15    17:30   9h 15m  │
│  María García  08:20    -       En sitio│
│  Carlos López  08:30    12:00   3h 30m  │
└─────────────────────────────────────────┘
```

**Lógica:**
```javascript
// Calcular presencia
const empleadosPresentes = logs
  .filter(log => log.tipo === 'ingreso')
  .filter(log => {
    // Verificar si tiene egreso posterior
    const egreso = logs.find(l => 
      l.empleadoId === log.empleadoId && 
      l.tipo === 'egreso' && 
      l.timestamp > log.timestamp
    );
    return !egreso; // Si no tiene egreso, está presente
  });

// Calcular horas trabajadas
const calcularHoras = (ingreso, egreso) => {
  const diff = egreso - ingreso;
  const horas = Math.floor(diff / 3600000);
  const minutos = Math.floor((diff % 3600000) / 60000);
  return `${horas}h ${minutos}m`;
};
```

**Componentes nuevos:**
- [ ] PresencePanel.tsx (panel de presencia)
- [ ] AttendanceControl.tsx (control de asistencia)
- [ ] Lambda: ia-control-attendance-calculator

**Tiempo estimado:** 6 horas  
**Impacto:** Muy Alto (feature principal del sistema)

---

## 📋 PLAN DE IMPLEMENTACIÓN

### v1.3.0 - UX y Funcionalidad Crítica (2-3 días)
**Prioridad 1:**
1. Identificación de cámaras ingreso/egreso (2h)
2. Dashboard de presencia y asistencia (6h)
3. Alertas sonoras (2h)
4. Logo en login (30min)

**Total:** ~10 horas

---

### v1.4.0 - Gestión Completa (1-2 días)
**Prioridad 2:**
1. Edición de usuarios (2h)
2. Edición de empleados (2h)
3. Rediseño de dashboards (4h)

**Total:** ~8 horas

---

## 🎨 DISEÑO - Paleta de Colores CoironTech

```css
:root {
  --primary: #2563eb;      /* Azul principal */
  --primary-dark: #1e40af; /* Azul oscuro */
  --success: #10b981;      /* Verde éxito */
  --warning: #f59e0b;      /* Amarillo alerta */
  --danger: #ef4444;       /* Rojo peligro */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-900: #111827;
}
```

---

## 💰 IMPACTO EN COSTOS

Todas estas mejoras son **frontend/lógica** sin impacto en costos AWS.

**Costo actual:** $23/mes (con motion detection)  
**Costo después de v1.4.0:** $23/mes (sin cambios)

---

## 🚀 ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. **Identificación cámaras** (crítico para asistencia)
2. **Dashboard presencia** (feature principal)
3. **Alertas sonoras** (mejora UX operador)
4. **Logo en login** (branding)
5. **Edición de datos** (gestión completa)
6. **Rediseño general** (pulido final)

---

**¿Por dónde empezamos?**

Recomiendo: **Identificación de cámaras + Dashboard de presencia** (v1.3.0)
