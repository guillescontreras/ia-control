# ⚠️ REGLA CRÍTICA: Aprobación de Cambios

## 🎯 REGLA OBLIGATORIA

**ANTES de realizar cualquier modificación importante en el código o en el proyecto, PRIMERO se debe proponer la mejora resumidamente para que el usuario la pueda evaluar y dar permiso de modificación.**

---

## 📋 PROCESO OBLIGATORIO

### 1. Identificar Cambio Importante
Cualquier modificación que implique:
- Cambios en arquitectura
- Modificación de componentes existentes
- Cambios en base de datos o APIs
- Nuevas funcionalidades
- Refactorización de código
- Cambios en flujos de usuario

### 2. Proponer Cambio
Antes de implementar, presentar:
```
📝 PROPUESTA DE CAMBIO

Problema: [Descripción breve del problema]
Solución propuesta: [Qué se va a cambiar]
Archivos afectados: [Lista de archivos]
Impacto: [Qué puede verse afectado]

¿Procedo con la implementación?
```

### 3. Esperar Aprobación
- ✅ Usuario aprueba → Proceder con implementación
- ❌ Usuario rechaza → No realizar cambios
- 🔄 Usuario sugiere alternativa → Ajustar propuesta

### 4. Implementar Solo Después de Aprobación
Una vez aprobado, proceder con la implementación y documentar.

---

## ✅ EXCEPCIONES (No Requieren Aprobación)

- Corrección de errores de sintaxis o TypeScript
- Fixes de bugs evidentes reportados por el usuario
- Cambios solicitados explícitamente por el usuario
- Actualización de documentación

---

## ❌ NUNCA HACER SIN APROBACIÓN

- Cambiar estructura de componentes
- Modificar flujos de autenticación
- Cambiar esquemas de base de datos
- Agregar nuevas dependencias
- Modificar configuración de AWS
- Refactorizar código existente

---

**Fecha de creación:** 10/11/2025  
**Prioridad:** CRÍTICA  
**Aplicación:** OBLIGATORIA EN TODAS LAS JORNADAS
