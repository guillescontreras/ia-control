# Servidor de Streaming para Cámaras IP/RTSP

Servidor Node.js que convierte streams RTSP de cámaras IP a HLS para reproducción en navegadores.

## Requisitos

### 1. Instalar FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Descargar desde https://ffmpeg.org/download.html

### 2. Instalar dependencias Node.js

```bash
cd streaming-server
npm install
```

## Uso

### Iniciar servidor

```bash
npm start
```

El servidor correrá en `http://localhost:8888`

### API Endpoints

#### 1. Iniciar stream de cámara

```bash
POST http://localhost:8888/stream/start
Content-Type: application/json

{
  "cameraId": "CAM-001",
  "rtspUrl": "rtsp://192.168.1.100:554/stream"
}
```

**Respuesta:**
```json
{
  "message": "Stream iniciado",
  "hlsUrl": "http://localhost:8888/hls/CAM-001/stream.m3u8"
}
```

#### 2. Detener stream

```bash
POST http://localhost:8888/stream/stop
Content-Type: application/json

{
  "cameraId": "CAM-001"
}
```

#### 3. Listar streams activos

```bash
GET http://localhost:8888/stream/list
```

#### 4. Capturar frame

```bash
POST http://localhost:8888/stream/capture
Content-Type: application/json

{
  "cameraId": "CAM-001"
}
```

**Respuesta:**
```json
{
  "imageBase64": "base64_encoded_image..."
}
```

## Integración con Frontend

El frontend puede reproducir el stream HLS usando:

```javascript
// Usando hls.js
import Hls from 'hls.js';

const video = document.getElementById('video');
const hls = new Hls();
hls.loadSource('http://localhost:8888/hls/CAM-001/stream.m3u8');
hls.attachMedia(video);
```

## Ejemplos de URLs RTSP

### Cámaras IP comunes:

- **Hikvision:** `rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101`
- **Dahua:** `rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0`
- **Axis:** `rtsp://root:password@192.168.1.100/axis-media/media.amp`
- **Generic:** `rtsp://username:password@ip:port/stream`

### Apps móviles como cámara:

- **IP Webcam (Android):** `http://192.168.1.100:8080/video`
- **DroidCam:** `http://192.168.1.100:4747/video`

## Notas

- El servidor usa HLS (HTTP Live Streaming) que tiene ~2-6 segundos de latencia
- Para menor latencia, considerar WebRTC
- FFmpeg debe estar instalado y en el PATH del sistema
- Los archivos HLS se guardan en `./hls/` y se eliminan automáticamente

## Troubleshooting

### Error: FFmpeg not found
```bash
# Verificar instalación
ffmpeg -version

# Agregar al PATH si es necesario
export PATH="/usr/local/bin:$PATH"
```

### Error: RTSP connection failed
- Verificar que la cámara esté accesible en la red
- Verificar credenciales (usuario/contraseña)
- Verificar puerto RTSP (usualmente 554)
- Probar URL RTSP con VLC primero

### Error: CORS
El servidor ya tiene CORS habilitado. Si persiste, verificar que el frontend use `http://localhost:8888`
