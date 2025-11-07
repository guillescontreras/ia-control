# 🧪 Prueba Rápida del Sistema

## Paso 1: Subir una foto a S3

```bash
# Reemplaza /path/to/photo.jpg con tu foto
aws s3 cp /path/to/photo.jpg s3://ia-control-coirontech/employee-faces/EMP001.jpg
```

## Paso 2: Registrar empleado por CLI

```bash
aws lambda invoke \
  --function-name ia-control-face-indexer \
  --payload '{"body":"{\"empleadoId\":\"EMP001\",\"nombre\":\"Guillermo\",\"apellido\":\"Contreras\",\"departamento\":\"IT\",\"imageKey\":\"employee-faces/EMP001.jpg\"}"}' \
  response.json && cat response.json | jq
```

## Paso 3: Ver en el Frontend

1. Abre http://localhost:3000
2. Ve a "👥 Empleados"
3. Deberías ver el empleado registrado

## Paso 4: Simular acceso

```bash
# Convertir foto a base64
IMAGE_BASE64=$(base64 -i /path/to/photo.jpg | tr -d '\n')

# Simular ingreso
aws lambda invoke \
  --function-name ia-control-video-processor \
  --payload "{\"frameBytes\":\"$IMAGE_BASE64\",\"cameraId\":\"entrada\"}" \
  response.json && cat response.json | jq
```

## Paso 5: Ver logs en Frontend

1. Ve a "📋 Logs"
2. Deberías ver el registro de ingreso
3. Ve a "📊 Dashboard" para ver estadísticas actualizadas

---

**Nota:** El registro desde el frontend requiere configurar presigned URLs de S3, lo cual es más complejo. Por ahora, usa CLI para probar el sistema.
