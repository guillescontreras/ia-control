# ⚠️ REGLA PRIMARIA: Consultar Documentación Oficial

## 🎯 REGLA FUNDAMENTAL

**SIEMPRE que pretendamos resolver algún problema técnico o implementar alguna funcionalidad de AWS, lo PRIMERO que hacemos es consultar la documentación oficial de AWS sobre las mejores prácticas y recomendaciones del caso.**

---

## 📚 Proceso Obligatorio

### ANTES de implementar o resolver:

1. ✅ **Consultar documentación oficial de AWS**
2. ✅ **Revisar ejemplos oficiales**
3. ✅ **Verificar mejores prácticas**
4. ✅ **Entender el comportamiento esperado**
5. ❌ **NUNCA asumir o adivinar**

---

## 🔍 Fuentes de Documentación

- **AWS Documentation:** https://docs.aws.amazon.com/
- **API Gateway:** https://docs.aws.amazon.com/apigateway/
- **Lambda:** https://docs.aws.amazon.com/lambda/
- **Rekognition:** https://docs.aws.amazon.com/rekognition/
- **DynamoDB:** https://docs.aws.amazon.com/dynamodb/
- **S3:** https://docs.aws.amazon.com/s3/

---

## 📝 Ejemplo: CORS en API Gateway

### ✅ Solución Correcta (Basada en Documentación)

**Problema:** CORS bloqueando peticiones OPTIONS

**Documentación consultada:** 
- https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html

**Solución:**
1. Con integración AWS_PROXY, Lambda debe devolver headers CORS
2. responseParameters en method response deben estar en `true`
3. integration response debe mapear los headers correctamente

**Resultado:** Problema resuelto en un intento

---

## ⚠️ Esta Regla Aplica Para TODO

- Configuración de servicios AWS
- Resolución de errores
- Implementación de funcionalidades
- Integración entre servicios
- Seguridad y permisos IAM

---

**Fecha:** 04/11/2025  
**Prioridad:** CRÍTICA  
**Aplicación:** OBLIGATORIA
