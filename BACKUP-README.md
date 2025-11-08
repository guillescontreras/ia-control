# 💾 Sistema de Backup Local - IA-Control

## 📋 Descripción

Script automatizado para crear backups locales completos del proyecto IA-Control.

## 🎯 Qué se Respalda

### ✅ Incluido
- **Frontend**: Código React + TypeScript (sin node_modules)
- **Backend**: 9 Lambdas con código fuente
- **Infrastructure**: Scripts de deploy y configuración
- **Streaming Server**: Servidor Node.js + FFmpeg
- **Documentación**: README, DEPLOYMENT, IMPLEMENTATION
- **Logs**: Historial de desarrollo y debugging
- **Memory Bank**: Contexto de Amazon Q (.amazonq)
- **Configuración**: amplify.yml, .gitignore, package.json

### ❌ Excluido
- node_modules (se reinstalan con npm install)
- Archivos .zip de lambdas
- Archivos .log del streaming server
- Directorio .git (usar GitHub como backup de código)
- Archivos temporales y cache

## 🚀 Uso

### Crear Backup

```bash
./backup-local.sh
```

El script:
1. Crea carpeta `~/Desktop/CoironTech/Backups-IA-Control/`
2. Copia todos los archivos necesarios
3. Genera archivo `BACKUP-INFO.txt` con metadata
4. Comprime todo en `.tar.gz`
5. Opcionalmente elimina carpeta sin comprimir

### Restaurar Backup

```bash
# 1. Extraer backup
cd ~/Desktop/CoironTech/Backups-IA-Control/
tar -xzf ia-control-backup-YYYYMMDD-HHMMSS.tar.gz

# 2. Copiar a ubicación del proyecto
cp -r ia-control-backup-YYYYMMDD-HHMMSS/* /ruta/destino/

# 3. Instalar dependencias
cd /ruta/destino/frontend
npm install

cd /ruta/destino/streaming-server
npm install

# 4. Configurar AWS (si es necesario)
aws configure

# 5. Revisar DEPLOYMENT.md para deploy
```

## 📁 Estructura del Backup

```
ia-control-backup-YYYYMMDD-HHMMSS/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   ├── access-log-api/
│   ├── face-indexer/
│   ├── video-processor/
│   └── ... (9 lambdas)
├── infrastructure/
│   ├── deploy-lambdas.sh
│   └── setup-aws-resources.sh
├── streaming-server/
│   ├── server.js
│   └── package.json
├── LOGS/
├── .amazonq/
├── README.md
├── DEPLOYMENT.md
└── BACKUP-INFO.txt
```

## ⏰ Frecuencia Recomendada

- **Diaria**: Durante desarrollo activo
- **Semanal**: En mantenimiento
- **Antes de**: Cambios mayores, deploys críticos, refactoring

## 💡 Mejores Prácticas

1. **Nombrado**: Los backups incluyen timestamp automático
2. **Ubicación**: `~/Desktop/CoironTech/Backups-IA-Control/`
3. **Retención**: Mantener últimos 7 backups, eliminar antiguos
4. **Verificación**: Revisar `BACKUP-INFO.txt` después de crear
5. **Complemento**: Usar junto con GitHub (código) y AWS (datos)

## 🔄 Backup Completo vs GitHub

| Aspecto | Backup Local | GitHub |
|---------|-------------|--------|
| Código fuente | ✅ | ✅ |
| node_modules | ❌ | ❌ |
| Configuración local | ✅ | ⚠️ |
| Logs de desarrollo | ✅ | ❌ |
| Historial git | ❌ | ✅ |
| Acceso remoto | ❌ | ✅ |

**Recomendación**: Usar ambos sistemas complementariamente.

## 📊 Tamaño Estimado

- **Sin comprimir**: ~50-100 MB
- **Comprimido (.tar.gz)**: ~10-20 MB

## 🛠️ Personalización

Editar `backup-local.sh` para:
- Cambiar ubicación de backups
- Agregar/excluir directorios
- Modificar nombre del archivo
- Agregar notificaciones

## ⚠️ Notas Importantes

1. **Credenciales**: El backup NO incluye credenciales de AWS
2. **Datos**: No respalda datos de DynamoDB/S3 (usar AWS Backup)
3. **Secrets**: No incluye Secrets Manager (configurar manualmente)
4. **Dependencias**: Requiere reinstalar node_modules después de restaurar

## 📞 Soporte

Para problemas con el backup, revisar:
- Permisos de escritura en directorio destino
- Espacio disponible en disco
- Logs del script en terminal
