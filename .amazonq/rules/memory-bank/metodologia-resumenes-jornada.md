# Metodología de Resúmenes de Jornada

## 🎯 PROPÓSITO

Documentar el trabajo realizado en cada jornada para recuperar contexto cuando Amazon Q pierde la memoria entre sesiones.

---

## 📋 ESTRUCTURA DE JORNADAS

### Definición de Jornada
- Una jornada es definida por el usuario
- Puede durar horas, días o semanas
- Termina cuando el usuario lo decide

### Numeración
- Jornada 01, 02, 03, etc.
- Si una jornada cubre muchas versiones, dividir en partes: 02-A, 02-B, 02-C

---

## 📁 UBICACIÓN DE ARCHIVOS

```
/LOGS/
├── Resumen-Jornada-IA-Control-01.md
├── Resumen-Jornada-IA-Control-02-A.md
├── Resumen-Jornada-IA-Control-02-B.md
├── Resumen-Jornada-IA-Control-02-C.md
└── ...
```

---

## 📝 FORMATO DE RESUMEN

### Encabezado
```markdown
# Resumen Jornada XX - Sistema IA-Control

**Fecha:** DD/MM/YYYY
**Versión Inicial:** vX.X.X
**Versión Final:** vX.X.X
**Enfoque:** Descripción breve del enfoque de la jornada
```

### Secciones Obligatorias

1. **VERSIONES CUBIERTAS**
   - Listar TODAS las versiones trabajadas
   - Incluir fecha, objetivo y resultado de cada versión
   - Detallar bugs corregidos
   - Mostrar código relevante

2. **RESUMEN DE LOGROS**
   - Funcionalidades implementadas
   - Bugs corregidos
   - Mejoras de rendimiento

3. **LECCIONES APRENDIDAS**
   - Problemas encontrados
   - Soluciones aplicadas
   - Aprendizajes para futuro

---

## ⚠️ REGLA CRÍTICA

**NUNCA saltarse versiones en los resúmenes.**

### Ejemplo Incorrecto ❌
```
Jornada 01: v0.1.0 → v0.2.0
Jornada 02: v1.7.0 → v1.11.0  ← Falta v0.3.0 a v1.6.x
```

### Ejemplo Correcto ✅
```
Jornada 01: v0.1.0 → v0.2.0
Jornada 02-A: v0.3.0 → v0.8.0
Jornada 02-B: v1.0.0 → v1.6.x
Jornada 02-C: v1.7.0 → v1.11.0
```

---

## 🔄 PROCESO DE CREACIÓN

### Cuando el Usuario Pide Resumen

1. **Consultar historial de versiones:**
   - Leer `.amazonq/rules/memory-bank/historial-versiones-ia-control.md`
   - Identificar TODAS las versiones desde última jornada

2. **Determinar si dividir:**
   - Si hay más de 8-10 versiones → Dividir en partes (A, B, C)
   - Si hay menos → Un solo archivo

3. **Crear resumen(s):**
   - Incluir TODAS las versiones
   - Detallar cada versión con código y explicaciones
   - Agregar lecciones aprendidas

4. **Verificar completitud:**
   - No debe haber saltos de versiones
   - Todas las versiones del historial deben estar documentadas

---

## 📊 DIVISIÓN RECOMENDADA

### Por Cantidad de Versiones
- 1-8 versiones: 1 archivo
- 9-16 versiones: 2 archivos (A, B)
- 17-24 versiones: 3 archivos (A, B, C)
- 25+ versiones: 4+ archivos

### Por Temática
- Parte A: Funcionalidades base
- Parte B: Producción y optimización
- Parte C: Fixes y mejoras finales

---

## 🎯 OBJETIVO FINAL

Que Amazon Q pueda leer los resúmenes y recuperar TODO el contexto del trabajo realizado, sin importar cuánto tiempo haya pasado.

---

**Última actualización:** 08/11/2025  
**Autor:** Amazon Q  
**Propósito:** Establecer metodología clara para documentar jornadas de trabajo
