#!/bin/bash

echo "🎥 Iniciando Servidor de Streaming..."
echo ""

# Verificar FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg no está instalado"
    echo ""
    echo "Instalar con:"
    echo "  macOS:   brew install ffmpeg"
    echo "  Ubuntu:  sudo apt install ffmpeg"
    exit 1
fi

echo "✅ FFmpeg encontrado: $(ffmpeg -version | head -n 1)"
echo ""

# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    echo ""
fi

# Iniciar servidor
echo "🚀 Iniciando servidor en http://localhost:8888"
echo ""
npm start
