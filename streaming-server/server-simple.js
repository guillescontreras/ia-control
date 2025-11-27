const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8888;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    message: 'Servidor de streaming activo (modo simplificado)'
  });
});

// Mock endpoints para compatibilidad
app.post('/stream/start', (req, res) => {
  res.json({ success: true, message: 'Stream iniciado (mock)' });
});

app.post('/stream/stop', (req, res) => {
  res.json({ success: true, message: 'Stream detenido (mock)' });
});

app.get('/stream/snapshot/:cameraId', (req, res) => {
  res.status(404).json({ error: 'Snapshot no disponible en modo simplificado' });
});

app.post('/stream/capture', (req, res) => {
  res.status(404).json({ error: 'Capture no disponible en modo simplificado' });
});

app.listen(PORT, () => {
  console.log(`🎥 Servidor de streaming (simplificado) corriendo en puerto ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`⚠️  Modo simplificado - Solo webcams locales funcionarán`);
});