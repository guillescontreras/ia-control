import React, { useRef, useState, useEffect } from 'react';
import { API_URL } from '../config';

interface DetectionResult {
  tipo: 'autorizado' | 'no_autorizado';
  empleadoId?: string;
  confianza?: number;
  objetos?: string[];
  alerta?: boolean;
}

const LiveCamera: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const [captureInterval, setCaptureInterval] = useState(5);
  const [lastResult, setLastResult] = useState<DetectionResult | null>(null);
  const [cameraId, setCameraId] = useState('CAM-001');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (autoCapture && isStreaming) {
      intervalRef.current = setInterval(() => {
        captureAndProcess();
      }, captureInterval * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoCapture, isStreaming, captureInterval]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      alert('Error accediendo a la cámara: ' + (error as Error).message);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
      setAutoCapture(false);
    }
  };

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0);
      
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      
      const response = await fetch(`${API_URL}/process-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          cameraId
        })
      });

      const data = await response.json();
      setLastResult(data);
    } catch (error) {
      console.error('Error procesando frame:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">📹 Cámara en Vivo</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Video Feed */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Stream de Video</h3>
          
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isProcessing && (
              <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                Procesando...
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              {!isStreaming ? (
                <button
                  onClick={startCamera}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  ▶️ Iniciar Cámara
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  ⏹️ Detener Cámara
                </button>
              )}
              
              <button
                onClick={captureAndProcess}
                disabled={!isStreaming || isProcessing}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                📸 Capturar Frame
              </button>
            </div>

            <div className="border-t pt-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoCapture}
                  onChange={(e) => setAutoCapture(e.target.checked)}
                  disabled={!isStreaming}
                  className="rounded"
                />
                <span className="text-sm">Captura automática cada</span>
                <input
                  type="number"
                  value={captureInterval}
                  onChange={(e) => setCaptureInterval(Number(e.target.value))}
                  min="1"
                  max="60"
                  className="w-16 px-2 py-1 border rounded text-center"
                />
                <span className="text-sm">segundos</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID de Cámara
              </label>
              <input
                type="text"
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="CAM-001"
              />
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Último Resultado</h3>
          
          {!lastResult ? (
            <div className="text-center py-12 text-gray-400">
              <p>No hay resultados aún</p>
              <p className="text-sm mt-2">Captura un frame para comenzar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lastResult.tipo === 'autorizado' ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-4xl mr-3">✅</span>
                    <div>
                      <p className="font-bold text-green-900 text-lg">ACCESO AUTORIZADO</p>
                      <p className="text-green-700 font-semibold">
                        ID: {lastResult.empleadoId}
                      </p>
                      <p className="text-sm text-green-600">
                        Confianza: {lastResult.confianza}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-4xl mr-3">🚫</span>
                    <div>
                      <p className="font-bold text-red-900 text-lg">ACCESO DENEGADO</p>
                      <p className="text-red-700">Persona no autorizada</p>
                      <p className="text-sm text-red-600">Alerta generada</p>
                    </div>
                  </div>
                </div>
              )}

              {lastResult.objetos && lastResult.objetos.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold text-blue-900 mb-2">Objetos Detectados:</p>
                  <div className="flex flex-wrap gap-2">
                    {lastResult.objetos.slice(0, 8).map((obj, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {lastResult.alerta && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">⚠️</span>
                    <p className="font-semibold text-yellow-900">
                      Alerta generada - Revisar logs
                    </p>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 text-center pt-2 border-t">
                Última actualización: {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Instrucciones</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Haz clic en "Iniciar Cámara" para activar tu webcam</li>
          <li>• Usa "Capturar Frame" para procesar una imagen manualmente</li>
          <li>• Activa "Captura automática" para monitoreo continuo</li>
          <li>• El sistema identificará empleados registrados automáticamente</li>
          <li>• Las alertas se generan para personas no autorizadas u objetos restringidos</li>
        </ul>
      </div>
    </div>
  );
};

export default LiveCamera;
