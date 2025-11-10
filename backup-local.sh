#!/bin/bash

# ============================================================================
# BACKUP LOCAL - SISTEMA IA-CONTROL
# ============================================================================
# Crea backup completo del proyecto en directorio local
# Incluye: código, configuración, logs, documentación
# Excluye: node_modules, .git, archivos temporales
# ============================================================================

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
PROJECT_NAME="ia-control"
BACKUP_DIR="$HOME/Desktop/CoironTech/Backups-IA-Control"
BACKUP_NAME="${PROJECT_NAME}-backup-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "🔄 Iniciando backup local de IA-Control..."
echo "📅 Timestamp: ${TIMESTAMP}"

# Crear directorio de backups si no existe
mkdir -p "${BACKUP_DIR}"

# Crear directorio del backup actual
mkdir -p "${BACKUP_PATH}"

echo "📁 Backup en: ${BACKUP_PATH}"

# Copiar estructura del proyecto
echo "📦 Copiando archivos..."

# Frontend (sin node_modules)
rsync -av --exclude='node_modules' --exclude='.next' --exclude='build' \
  frontend/ "${BACKUP_PATH}/frontend/"

# Backend (todas las lambdas)
rsync -av --exclude='node_modules' --exclude='*.zip' \
  backend/ "${BACKUP_PATH}/backend/"

# Infrastructure scripts
cp -r infrastructure/ "${BACKUP_PATH}/infrastructure/"

# Streaming server (sin node_modules y archivos de prueba)
rsync -av --exclude='node_modules' --exclude='*.log' --exclude='hls' \
  --exclude='*.jpg' --exclude='*.txt' --exclude='*.json' \
  streaming-server/ "${BACKUP_PATH}/streaming-server/"

# Documentación y logs
cp -r LOGS/ "${BACKUP_PATH}/LOGS/"
cp -r .amazonq/ "${BACKUP_PATH}/.amazonq/"

# Archivos raíz importantes
cp README.md "${BACKUP_PATH}/"
cp DEPLOYMENT.md "${BACKUP_PATH}/"
cp IMPLEMENTATION.md "${BACKUP_PATH}/"
cp QUICK-START.md "${BACKUP_PATH}/"
cp BACKUP-README.md "${BACKUP_PATH}/"
cp PRUEBA-RAPIDA.md "${BACKUP_PATH}/" 2>/dev/null || true
cp amplify.yml "${BACKUP_PATH}/"
cp .gitignore "${BACKUP_PATH}/"
cp ia-control-correcciones.txt "${BACKUP_PATH}/" 2>/dev/null || true

# Crear archivo de metadata
cat > "${BACKUP_PATH}/BACKUP-INFO.txt" << EOF
BACKUP LOCAL - IA-CONTROL
========================

Fecha: $(date)
Timestamp: ${TIMESTAMP}
Usuario: $(whoami)
Hostname: $(hostname)

CONTENIDO:
- Frontend (React + TypeScript)
- Backend (9 Lambdas)
- Infrastructure (scripts de deploy)
- Streaming Server (Node.js + FFmpeg)
- Documentación y logs
- Memory bank (.amazonq)

VERSIÓN DEL PROYECTO:
$(git log -1 --oneline 2>/dev/null || echo "No disponible")

TAMAÑO DEL BACKUP:
$(du -sh "${BACKUP_PATH}" | cut -f1)

PARA RESTAURAR:
1. Copiar contenido a directorio del proyecto
2. Instalar dependencias: npm install en frontend/ y streaming-server/
3. Configurar AWS CLI y credenciales
4. Revisar DEPLOYMENT.md para deploy
EOF

# Comprimir backup
echo "🗜️  Comprimiendo backup..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/"

# Calcular tamaño
BACKUP_SIZE=$(du -sh "${BACKUP_NAME}.tar.gz" | cut -f1)

echo ""
echo "✅ Backup completado exitosamente"
echo "📦 Archivo: ${BACKUP_NAME}.tar.gz"
echo "💾 Tamaño: ${BACKUP_SIZE}"
echo "📍 Ubicación: ${BACKUP_DIR}"
echo ""
echo "Para restaurar:"
echo "  tar -xzf ${BACKUP_NAME}.tar.gz"
echo ""

# Opcional: Eliminar carpeta sin comprimir para ahorrar espacio
read -p "¿Eliminar carpeta sin comprimir? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
  rm -rf "${BACKUP_PATH}"
  echo "🗑️  Carpeta sin comprimir eliminada"
fi

# Listar backups existentes
echo ""
echo "📋 Backups disponibles:"
ls -lh "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | awk '{print $9, "(" $5 ")"}'

echo ""
echo "✨ Proceso completado"
