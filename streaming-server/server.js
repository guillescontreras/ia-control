const express = require('express');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8888;

app.use(cors());
app.use(express.json());

// Almacenar streams activos con procesos FFmpeg
const activeStreams = new Map();
// Pool de conexiones: { cameraId: { rtspUrl, process, lastUsed, refCount } }
const connectionPool = new Map();
// Timeout para cleanup (5 minutos sin uso)
const CLEANUP_TIMEOUT = 5 * 60 * 1000;

// Directorio para archivos HLS
const HLS_DIR = path.join(__dirname, 'hls');
if (!fs.existsSync(HLS_DIR)) {
  fs.mkdirSync(HLS_DIR, { recursive: true });
}

app.use('/hls', express.static(HLS_DIR));

// Iniciar stream de cámara
app.post('/stream/start', (req, res) => {
  const { cameraId, rtspUrl } = req.body;
  
  if (!cameraId || !rtspUrl) {
    return res.status(400).json({ error: 'cameraId y rtspUrl requeridos' });
  }

  if (activeStreams.has(cameraId)) {
    return res.json({ 
      message: 'Stream ya activo',
      hlsUrl: `http://localhost:${PORT}/hls/${cameraId}/stream.m3u8`
    });
  }

  const cameraDir = path.join(HLS_DIR, cameraId);
  if (!fs.existsSync(cameraDir)) {
    fs.mkdirSync(cameraDir, { recursive: true });
  }

  // Reutilizar conexión existente o crear nueva
  if (connectionPool.has(cameraId)) {
    const conn = connectionPool.get(cameraId);
    conn.refCount++;
    conn.lastUsed = Date.now();
    console.log(`♻️  Reutilizando conexión ${cameraId} (refs: ${conn.refCount})`);
  } else {
    connectionPool.set(cameraId, {
      rtspUrl,
      process: null,
      lastUsed: Date.now(),
      refCount: 1
    });
    console.log(`✅ Nueva conexión ${cameraId}`);
  }

  activeStreams.set(cameraId, { rtspUrl });

  res.json({
    message: 'Stream iniciado',
    mjpegUrl: `http://localhost:${PORT}/stream/mjpeg/${cameraId}`
  });
});

// Detener stream
app.post('/stream/stop', (req, res) => {
  const { cameraId } = req.body;
  
  if (!cameraId) {
    return res.status(400).json({ error: 'cameraId requerido' });
  }

  if (activeStreams.has(cameraId)) {
    activeStreams.delete(cameraId);
    
    // Decrementar refCount en pool
    if (connectionPool.has(cameraId)) {
      const conn = connectionPool.get(cameraId);
      conn.refCount--;
      conn.lastUsed = Date.now();
      console.log(`⬇️  Decrementado refCount ${cameraId} (refs: ${conn.refCount})`);
      
      // Si no hay referencias, marcar para cleanup
      if (conn.refCount <= 0) {
        console.log(`⏰ ${cameraId} marcado para cleanup en ${CLEANUP_TIMEOUT/1000}s`);
      }
    }
    
    res.json({ message: 'Stream detenido' });
  } else {
    res.status(404).json({ error: 'Stream no encontrado' });
  }
});

// Obtener snapshot de cámara
app.get('/stream/snapshot/:cameraId', (req, res) => {
  const { cameraId } = req.params;
  const stream = activeStreams.get(cameraId);
  
  if (!stream) {
    return res.status(404).json({ error: 'Stream no encontrado' });
  }

  // Actualizar lastUsed
  if (connectionPool.has(cameraId)) {
    connectionPool.get(cameraId).lastUsed = Date.now();
  }

  // Capturar frame actual con FFmpeg
  const ffmpegSnapshot = spawn('ffmpeg', [
    '-rtsp_transport', 'tcp',
    '-i', stream.rtspUrl,
    '-frames:v', '1',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-q:v', '5',
    'pipe:1'
  ]);

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  ffmpegSnapshot.stdout.pipe(res);
  
  ffmpegSnapshot.on('error', (err) => {
    console.error(`Error capturando snapshot ${cameraId}:`, err);
    if (!res.headersSent) {
      res.status(500).end();
    }
  });
  
  // Cleanup del proceso al terminar
  ffmpegSnapshot.on('close', () => {
    if (ffmpegSnapshot.pid) {
      try {
        process.kill(ffmpegSnapshot.pid, 'SIGKILL');
      } catch (e) {
        // Proceso ya terminado
      }
    }
  });
});

// Listar streams activos
app.get('/stream/list', (req, res) => {
  const streams = Array.from(activeStreams.keys()).map(cameraId => ({
    cameraId,
    mjpegUrl: `http://localhost:${PORT}/stream/mjpeg/${cameraId}`
  }));
  res.json({ streams });
});

// Capturar frame de stream RTSP
app.post('/stream/capture', (req, res) => {
  const { cameraId } = req.body;
  
  if (!cameraId) {
    return res.status(400).json({ error: 'cameraId requerido' });
  }

  const stream = activeStreams.get(cameraId);
  if (!stream) {
    return res.status(404).json({ error: 'Stream no activo' });
  }

  // Actualizar lastUsed
  if (connectionPool.has(cameraId)) {
    connectionPool.get(cameraId).lastUsed = Date.now();
  }

  // Capturar frame con FFmpeg
  const ffmpegCapture = spawn('ffmpeg', [
    '-rtsp_transport', 'tcp',
    '-i', stream.rtspUrl,
    '-frames:v', '1',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    'pipe:1'
  ]);

  let imageData = Buffer.alloc(0);
  
  ffmpegCapture.stdout.on('data', (chunk) => {
    imageData = Buffer.concat([imageData, chunk]);
  });

  ffmpegCapture.on('close', () => {
    res.json({ imageBase64: imageData.toString('base64') });
    
    // Cleanup del proceso
    if (ffmpegCapture.pid) {
      try {
        process.kill(ffmpegCapture.pid, 'SIGKILL');
      } catch (e) {
        // Proceso ya terminado
      }
    }
  });

  ffmpegCapture.on('error', (err) => {
    console.error('Error capturando frame:', err);
    res.status(500).json({ error: 'Error capturando frame' });
  });
});

// Cleanup automático de conexiones inactivas
setInterval(() => {
  const now = Date.now();
  const toDelete = [];
  
  for (const [cameraId, conn] of connectionPool.entries()) {
    if (conn.refCount <= 0 && (now - conn.lastUsed) > CLEANUP_TIMEOUT) {
      console.log(`🧹 Limpiando conexión inactiva: ${cameraId}`);
      
      // Matar proceso si existe
      if (conn.process && conn.process.pid) {
        try {
          process.kill(conn.process.pid, 'SIGKILL');
        } catch (e) {
          // Proceso ya terminado
        }
      }
      
      toDelete.push(cameraId);
    }
  }
  
  toDelete.forEach(id => connectionPool.delete(id));
  
  if (toDelete.length > 0) {
    console.log(`✅ Limpiadas ${toDelete.length} conexiones`);
  }
}, 60000); // Cada minuto

// Endpoint de salud del servidor
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeStreams: activeStreams.size,
    poolConnections: connectionPool.size,
    connections: Array.from(connectionPool.entries()).map(([id, conn]) => ({
      cameraId: id,
      refCount: conn.refCount,
      lastUsed: new Date(conn.lastUsed).toISOString(),
      inactive: conn.refCount <= 0
    }))
  });
});

app.listen(PORT, () => {
  console.log(`🎥 Servidor de streaming corriendo en http://localhost:${PORT}`);
  console.log(`📹 Endpoints disponibles:`);
  console.log(`   POST /stream/start - Iniciar stream`);
  console.log(`   POST /stream/stop - Detener stream`);
  console.log(`   GET  /stream/list - Listar streams`);
  console.log(`   POST /stream/capture - Capturar frame`);
  console.log(`   GET  /health - Estado del servidor`);
  console.log(`\n♻️  Pool de conexiones activo (cleanup cada 60s)`);
});
