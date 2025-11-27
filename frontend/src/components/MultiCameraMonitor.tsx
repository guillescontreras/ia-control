import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { playSuccessSound, playAlertSound, speakText } from '../utils/sounds';
import { API_URL } from '../config';

const STREAMING_SERVER = 'http://localhost:8888';

interface Camera {
  id: string;
  name: string;
  location: string;
  type: 'webcam' | 'ip' | 'rtsp';
  url?: string;
  deviceId?: string;
  status: 'active' | 'inactive' | 'error';
  lastDetection?: {
    tipo: 'autorizado' | 'no_autorizado';
    empleadoId?: string;
    timestamp: number;
  };
  zoneId?: string;
  zoneName?: string;
  captureInterval?: number;
  eppDetectionEnabled?: boolean;
}

interface CameraFeedProps {
  camera: Camera;
  onCapture: (cameraId: string, imageBase64: string) => void;
  size: 'small' | 'medium' | 'large';
  isPaused: boolean;
  onTogglePause: (cameraId: string) => void;
  onToggleEPPDetection?: (cameraId: string) => void;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ camera, onCapture, size, isPaused, onTogglePause, onToggleEPPDetection }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!camera) return;
    
    if (camera.type === 'webcam') {
      startWebcam();
    } else if (camera.type === 'ip' || camera.type === 'rtsp') {
      startIPCamera();
    }

    return () => {
      stopCamera();
    };
  }, [camera]);

  useEffect(() => {
    if (isStreaming && !isPaused && camera.eppDetectionEnabled) {
      const interval = (camera.captureInterval || 10) * 1000; // Usar intervalo configurado
      intervalRef.current = setInterval(() => {
        captureFrame();
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isStreaming, isPaused, camera.eppDetectionEnabled, camera.captureInterval]);

  const startWebcam = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: camera.deviceId 
          ? { deviceId: { exact: camera.deviceId }, width: 640, height: 480 }
          : { width: 640, height: 480 }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error starting webcam:', error);
    }
  };

  const startIPCamera = async () => {
    if (!camera.url || !videoRef.current) return;

    try {
      // Iniciar stream en servidor
      const response = await fetch(`${STREAMING_SERVER}/stream/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameraId: camera.id,
          rtspUrl: camera.url
        })
      });

      if (!response.ok) {
        console.error('Error iniciando stream:', response.status);
        return;
      }

      const data = await response.json();
      setIsStreaming(true);
      
      // Actualizar snapshot cada 3 segundos
      const updateSnapshot = async () => {
        try {
          const snapResponse = await fetch(`${STREAMING_SERVER}/stream/snapshot/${camera.id}`);
          if (snapResponse.ok) {
            const blob = await snapResponse.blob();
            if (blob.size > 1000) {
              const url = URL.createObjectURL(blob);
              if (videoRef.current) {
                (videoRef.current as unknown as HTMLImageElement).src = url;
              }
            }
          }
        } catch (error) {
          // Silencioso
        }
      };
      
      // Esperar 1 segundo antes del primer snapshot
      setTimeout(() => {
        updateSnapshot();
        const snapshotInterval = setInterval(updateSnapshot, 3000);
        (videoRef.current as any).snapshotInterval = snapshotInterval;
      }, 1000);
    } catch (error) {
      console.error('Error iniciando stream:', error);
    }
  };

  const stopCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track detenido:', track.label);
      });
      streamRef.current = null;
    }
    
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject = null;
    }
    
    if (camera.type === 'ip' || camera.type === 'rtsp') {
      try {
        await fetch(`${STREAMING_SERVER}/stream/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cameraId: camera.id })
        });
      } catch (error) {
        // Ignorar errores silenciosamente
      }
    }
    
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsStreaming(false);
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;

    if (camera.type === 'webcam') {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const video = videoRef.current as HTMLVideoElement;
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0);
      
      // Detectar movimiento simple comparando frames
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const currentFrame = imageData.data;
      
      if ((canvas as any).lastFrame) {
        const lastFrame = (canvas as any).lastFrame;
        let diff = 0;
        const threshold = 30;
        const pixelStep = 4 * 10; // Revisar cada 10 pixeles para performance
        
        for (let i = 0; i < currentFrame.length; i += pixelStep) {
          const rDiff = Math.abs(currentFrame[i] - lastFrame[i]);
          const gDiff = Math.abs(currentFrame[i + 1] - lastFrame[i + 1]);
          const bDiff = Math.abs(currentFrame[i + 2] - lastFrame[i + 2]);
          
          if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
            diff++;
          }
        }
        
        const motionPercentage = (diff / (currentFrame.length / pixelStep)) * 100;
        
        // Solo capturar si hay movimiento significativo (>1%)
        if (motionPercentage < 1) {
          (canvas as any).lastFrame = new Uint8ClampedArray(currentFrame);
          return; // No hay movimiento, no capturar
        }
      }
      
      (canvas as any).lastFrame = new Uint8ClampedArray(currentFrame);
      
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      
      onCapture(camera.id, imageBase64);
    } else {
      // Para MJPEG, capturar desde el servidor
      try {
        const response = await fetch(`${STREAMING_SERVER}/stream/capture`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cameraId: camera.id })
        });
        const data = await response.json();
        onCapture(camera.id, data.imageBase64);
      } catch (error) {
        console.error('Error capturando frame:', error);
      }
    }
  };

  const getSizeStyle = () => {
    const sizes = { small: '250px', medium: '400px', large: '600px' };
    return { aspectRatio: '16/9', maxHeight: sizes[size] };
  };

  return (
    <div className="relative bg-black rounded-lg overflow-hidden" style={getSizeStyle()}>
      {camera.type === 'webcam' ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </>
      ) : (
        <img
          ref={videoRef as any}
          className="w-full h-full object-cover"
          alt={camera.name}
        />
      )}
      
      <div className="absolute top-1 left-1 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
        {camera.name}
      </div>
      
      <div className="absolute top-1 right-1 flex gap-1 items-center z-10">
        <div className={`w-3 h-3 rounded-full ${
          camera.status === 'active' ? 'bg-green-500' : 
          camera.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
        }`} />
        {camera.zoneId && onToggleEPPDetection && (
          <button
            onClick={() => onToggleEPPDetection(camera.id)}
            className={`px-2 py-1 rounded text-xs font-semibold ${
              camera.eppDetectionEnabled 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
            title={camera.eppDetectionEnabled ? 'Detener detección EPP' : 'Iniciar detección EPP'}
          >
            🦺 {camera.eppDetectionEnabled ? 'ON' : 'OFF'}
          </button>
        )}
        <button
          onClick={() => onTogglePause(camera.id)}
          className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs hover:bg-opacity-90"
        >
          {isPaused ? '▶️' : '⏸️'}
        </button>
      </div>
      
      {!isStreaming && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-xs">Cargando...</div>
        </div>
      )}

      {camera.lastDetection && (
        <div className={`absolute bottom-2 left-2 right-2 px-3 py-2 rounded ${
          camera.lastDetection.tipo === 'autorizado' 
            ? 'bg-green-600 bg-opacity-90' 
            : 'bg-red-600 bg-opacity-90'
        } text-white text-sm`}>
          {camera.lastDetection.tipo === 'autorizado' ? (
            <span>✅ {camera.lastDetection.empleadoId}</span>
          ) : (
            <span>🚫 No autorizado</span>
          )}
        </div>
      )}
    </div>
  );
};

const MultiCameraMonitor: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);

  const [recording, setRecording] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [cameraSize, setCameraSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [columns, setColumns] = useState(3);
  const [serverHealth, setServerHealth] = useState<any>(null);
  const [pausedCameras, setPausedCameras] = useState<Set<string>>(new Set());
  const [accessModal, setAccessModal] = useState<{
    show: boolean;
    empleadoId: string;
    nombreCompleto: string;
    cameraId: string;
    imageBase64: string;
  } | null>(null);
  const [lastAccessTime, setLastAccessTime] = useState<{[key: string]: number}>({});
  const lastEPPAlertTimeRef = useRef<{[key: string]: number}>({});
  const [availableCameras, setAvailableCameras] = useState<Camera[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  useEffect(() => {
    loadCameras();
    checkServerHealth();
    const healthInterval = setInterval(checkServerHealth, 30000);
    return () => clearInterval(healthInterval);
  }, []);

  useEffect(() => {
    loadAvailableCameras();
  }, [cameras]);



  const checkServerHealth = async () => {
    try {
      const response = await fetch(`${STREAMING_SERVER}/health`);
      const data = await response.json();
      setServerHealth(data);
      
      // Actualizar estado de cámaras basado en health
      setCameras(prev => prev.map(cam => {
        const conn = data.connections?.find((c: any) => c.cameraId === cam.id);
        if (conn) {
          return { ...cam, status: conn.inactive ? 'inactive' : 'active' };
        }
        return cam;
      }));
    } catch (error) {
      console.error('Error checking server health:', error);
      setServerHealth({ status: 'error' });
    }
  };

  const loadCameras = () => {
    const saved = localStorage.getItem('ia-control-cameras');
    const activeCameras = localStorage.getItem('ia-control-active-cameras');
    
    if (saved && activeCameras) {
      const allCameras = JSON.parse(saved);
      const activeIds = JSON.parse(activeCameras);
      // Cargar solo las cámaras activas en el monitor
      const monitorCameras = allCameras.filter((c: any) => 
        c.purpose === 'control' && activeIds.includes(c.id)
      );
      setCameras(monitorCameras);
    } else {
      setCameras([]);
    }
  };

  const loadAvailableCameras = () => {
    const saved = localStorage.getItem('ia-control-cameras');
    if (saved) {
      const allCameras = JSON.parse(saved);
      const controlCameras = allCameras.filter((c: any) => c.purpose === 'control');
      // Filtrar las que NO están en el monitor
      const available = controlCameras.filter((c: any) => 
        !cameras.some(cam => cam.id === c.id)
      );
      setAvailableCameras(available);
    }
  };

  const addCameraToMonitor = () => {
    if (!selectedCameraId) return;
    
    const saved = localStorage.getItem('ia-control-cameras');
    if (!saved) return;
    
    const allCameras = JSON.parse(saved);
    const cameraToAdd = allCameras.find((c: any) => c.id === selectedCameraId);
    
    if (cameraToAdd) {
      const newCameras = [...cameras, cameraToAdd];
      setCameras(newCameras);
      
      // Guardar IDs de cámaras activas
      const activeIds = newCameras.map(c => c.id);
      localStorage.setItem('ia-control-active-cameras', JSON.stringify(activeIds));
      
      setShowAddModal(false);
      setSelectedCameraId('');
    }
  };

  const removeCameraFromMonitor = (cameraId: string) => {
    if (!window.confirm('¿Quitar esta cámara del monitor?')) return;
    
    const newCameras = cameras.filter(cam => cam.id !== cameraId);
    setCameras(newCameras);
    
    const activeIds = newCameras.map(c => c.id);
    localStorage.setItem('ia-control-active-cameras', JSON.stringify(activeIds));
  };

  const toggleCameraPause = (cameraId: string) => {
    setPausedCameras(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cameraId)) {
        newSet.delete(cameraId);
      } else {
        newSet.add(cameraId);
      }
      return newSet;
    });
  };

  const toggleEPPDetection = (cameraId: string) => {
    setCameras(prev => prev.map(cam => 
      cam.id === cameraId 
        ? { ...cam, eppDetectionEnabled: !cam.eppDetectionEnabled }
        : cam
    ));
    
    const camera = cameras.find(c => c.id === cameraId);
    const newState = !camera?.eppDetectionEnabled;
    toast.success(
      newState 
        ? `🦺 Detección EPP iniciada en ${camera?.name}` 
        : `🚫 Detección EPP detenida en ${camera?.name}`,
      { duration: 2000 }
    );
  };

  const handleCapture = async (cameraId: string, imageBase64: string) => {
    if (!imageBase64 || imageBase64.length < 1000) {
      return; // Ignorar frames vacíos
    }

    try {
      const camera = cameras.find(c => c.id === cameraId);
      const zoneId = (camera as any)?.zoneId;

      // Si la cámara tiene zona EPP, usar detección EPP
      if (zoneId) {
        const response = await fetch(`${API_URL}/epp-detect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64, cameraId, zoneId })
        });

        if (!response.ok) return;

        const result = await response.json();
        
        if (!result.compliance.compliant) {
          const now = Date.now();
          const lastAlert = lastEPPAlertTimeRef.current[zoneId] || 0;
          const cooldown = 30000; // 30 segundos
          
          // Solo alertar si pasó el cooldown
          if ((now - lastAlert) > cooldown) {
            toast.error(`🦺 Incumplimiento EPP: ${result.compliance.missingEPP.join(', ')}`, { duration: 5000 });
            playAlertSound();
            lastEPPAlertTimeRef.current[zoneId] = now;
          }
        }

        setCameras(prev => prev.map(cam => 
          cam.id === cameraId 
            ? { 
                ...cam, 
                lastDetection: {
                  tipo: result.compliance.compliant ? 'autorizado' : 'no_autorizado',
                  empleadoId: `EPP ${result.compliance.percentage}%`,
                  timestamp: Date.now()
                }
              }
            : cam
        ));

        if (recording) {
          setEvents(prev => [{
            cameraId,
            timestamp: Date.now(),
            tipo: result.compliance.compliant ? 'epp_compliant' : 'epp_violation',
            compliance: result.compliance
          }, ...prev].slice(0, 50));
        }

        return;
      }

      // Detección de acceso normal
      const response = await fetch(`${API_URL}/process-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, cameraId })
      });

      if (!response.ok) {
        return; // Ignorar errores silenciosamente
      }

      const result = await response.json();
      
      // Si es autorizado, mostrar modal para seleccionar ingreso/egreso
      if (result.tipo === 'autorizado' && result.empleadoId) {
        const now = Date.now();
        const lastTime = lastAccessTime[result.empleadoId] || 0;
        const cooldown = 10000; // 10 segundos
        
        // Solo mostrar modal si no hay uno abierto y pasó el cooldown
        if (!accessModal?.show && (now - lastTime) > cooldown) {
          // Pausar cámara
          setPausedCameras(prev => new Set(prev).add(cameraId));
          
          setAccessModal({
            show: true,
            empleadoId: result.empleadoId,
            nombreCompleto: result.nombreCompleto || result.empleadoId,
            cameraId,
            imageBase64
          });
          
          playSuccessSound();
          const nombre = result.nombreCompleto || result.empleadoId;
          setTimeout(() => {
            speakText(`Hola ${nombre}, selecciona ingreso o egreso`);
          }, 500);
        }
      } else if (result.tipo === 'no_autorizado') {
        toast.error(`🚫 Persona no autorizada detectada`, { duration: 5000 });
        playAlertSound();
        speakText('Acceso no autorizado');
      }
      // Si tipo === 'sin_personas', no mostrar nada
      
      setCameras(prev => prev.map(cam => 
        cam.id === cameraId 
          ? { 
              ...cam, 
              lastDetection: {
                tipo: result.tipo,
                empleadoId: result.empleadoId,
                timestamp: Date.now()
              }
            }
          : cam
      ));

      if (recording) {
        setEvents(prev => [{
          cameraId,
          timestamp: Date.now(),
          tipo: result.tipo,
          empleadoId: result.empleadoId,
          objetos: result.objetos
        }, ...prev].slice(0, 50));
      }
    } catch (error) {
      console.error('Error processing frame:', error);
    }
  };



  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const startStreamingServer = () => {
    toast('Ejecute en terminal: cd streaming-server && ./start.sh', { duration: 5000, icon: '▶️' });
    setTimeout(checkServerHealth, 3000);
  };

  const restartStreamingServer = () => {
    toast('Reinicie manualmente el servidor desde terminal', { duration: 3000, icon: '🔄' });
  };

  const showInstallationGuide = () => {
    setShowInstallGuide(true);
  };

  const exportEvents = () => {
    const dataStr = JSON.stringify(events, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eventos-${Date.now()}.json`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">📹 Monitor Multi-Cámara</h2>
          <div className="text-xs text-slate-400 mt-1">
            {serverHealth ? (
              <span>
                Servidor: <span className={serverHealth.status === 'ok' ? 'text-green-600' : 'text-red-600'}>
                  {serverHealth.status === 'ok' ? '✅ Activo' : '❌ Error'}
                </span>
                {serverHealth.poolConnections !== undefined && (
                  <span className="ml-2">| Pool: {serverHealth.poolConnections} conexiones</span>
                )}
              </span>
            ) : (
              <span className="text-red-600">
                ❌ Servidor desconectado - 
                <button 
                  onClick={showInstallationGuide}
                  className="underline hover:text-red-400"
                >
                  Ver guía de instalación
                </button>
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {/* Server Controls */}
          <div className="flex gap-1 bg-slate-700 rounded-lg p-1">
            <button
              onClick={startStreamingServer}
              className="px-3 py-1 rounded text-sm bg-green-600 text-white hover:bg-green-700"
              title="Iniciar servidor de streaming"
            >
              ▶️ Servidor
            </button>
            <button
              onClick={restartStreamingServer}
              className="px-3 py-1 rounded text-sm bg-orange-600 text-white hover:bg-orange-700"
              title="Reiniciar servidor de streaming"
            >
              🔄 Reiniciar
            </button>
            <button
              onClick={checkServerHealth}
              className="px-3 py-1 rounded text-sm bg-blue-600 text-white hover:bg-blue-700"
              title="Verificar estado del servidor"
            >
              🔍 Estado
            </button>
          </div>
          <div className="flex gap-1 bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setColumns(2)}
              className={`px-3 py-1 rounded text-sm ${columns === 2 ? 'bg-slate-600 text-slate-100 shadow' : 'text-slate-300'}`}
            >
              2 col
            </button>
            <button
              onClick={() => setColumns(3)}
              className={`px-3 py-1 rounded text-sm ${columns === 3 ? 'bg-slate-600 text-slate-100 shadow' : 'text-slate-300'}`}
            >
              3 col
            </button>
            <button
              onClick={() => setColumns(4)}
              className={`px-3 py-1 rounded text-sm ${columns === 4 ? 'bg-slate-600 text-slate-100 shadow' : 'text-slate-300'}`}
            >
              4 col
            </button>
          </div>
          <div className="flex gap-1 bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setCameraSize('small')}
              className={`px-3 py-1 rounded text-sm ${cameraSize === 'small' ? 'bg-slate-600 text-slate-100 shadow' : 'text-slate-300'}`}
            >
              S
            </button>
            <button
              onClick={() => setCameraSize('medium')}
              className={`px-3 py-1 rounded text-sm ${cameraSize === 'medium' ? 'bg-slate-600 text-slate-100 shadow' : 'text-slate-300'}`}
            >
              M
            </button>
            <button
              onClick={() => setCameraSize('large')}
              className={`px-3 py-1 rounded text-sm ${cameraSize === 'large' ? 'bg-slate-600 text-slate-100 shadow' : 'text-slate-300'}`}
            >
              L
            </button>
          </div>
          <button
            onClick={() => setRecording(!recording)}
            className={`px-4 py-2 rounded-lg ${
              recording ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-100'
            }`}
          >
            {recording ? '⏺️ Grabando' : '⏸️ Pausado'}
          </button>
          <button
            onClick={() => {
              loadAvailableCameras();
              setShowAddModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Agregar Cámara
          </button>

        </div>
      </div>

      {/* Camera Grid */}
      {cameras.length === 0 ? (
        <div className="bg-slate-800 rounded-lg shadow-lg p-8 text-center border border-slate-700">
          <p className="text-slate-400 mb-4">No hay cámaras en el monitor</p>
          <button
            onClick={() => {
              loadAvailableCameras();
              setShowAddModal(true);
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            + Agregar Primera Cámara
          </button>
        </div>
      ) : (
        <div className="grid gap-4" style={{ 
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          width: '100%'
        }}>
          {cameras.map(camera => (
          <div key={camera.id} className="bg-slate-800 rounded-lg shadow-lg p-3 border border-slate-700">
            <CameraFeed 
              camera={camera} 
              onCapture={handleCapture} 
              size={cameraSize}
              isPaused={pausedCameras.has(camera.id)}
              onTogglePause={toggleCameraPause}
              onToggleEPPDetection={toggleEPPDetection}
            />
            <div className="mt-2 flex justify-between items-center">
              <div className="text-sm text-slate-300">
                {camera.location}
                {pausedCameras.has(camera.id) && (
                  <span className="ml-2 text-orange-400 font-semibold">⏸️ Pausada</span>
                )}
              </div>
              <button
                onClick={() => removeCameraFromMonitor(camera.id)}
                className="text-red-600 hover:text-red-800 text-sm"
                title="Quitar del monitor"
              >
                ❌
              </button>
            </div>
          </div>
          ))}
        </div>
      )}

      {/* Events Log */}
      <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-100">📋 Eventos Recientes</h3>
          <button
            onClick={exportEvents}
            disabled={events.length === 0}
            className="text-sm bg-slate-600 text-slate-100 px-3 py-1 rounded hover:bg-slate-700 disabled:opacity-50"
          >
            💾 Exportar
          </button>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No hay eventos registrados</p>
          ) : (
            events.map((event, idx) => (
              <div key={idx} className={`p-3 rounded border ${
                event.tipo === 'autorizado' ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-slate-100">{event.cameraId}</span>
                    {event.empleadoId && <span className="ml-2 text-sm text-slate-300">- {event.empleadoId}</span>}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {event.objetos && event.objetos.length > 0 && (
                  <div className="mt-1 text-xs text-slate-400">
                    Objetos: {event.objetos.slice(0, 3).join(', ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Camera Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold mb-4 text-slate-100">Agregar Cámara al Monitor</h3>
            {availableCameras.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-slate-300 mb-2">No hay cámaras disponibles</p>
                <p className="text-sm text-slate-400">Todas las cámaras de control están en el monitor o no hay cámaras configuradas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Seleccionar Cámara</label>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100"
                  >
                    <option value="">-- Selecciona una cámara --</option>
                    {availableCameras.map(camera => (
                      <option key={camera.id} value={camera.id}>
                        {camera.name} ({camera.location})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addCameraToMonitor}
                    disabled={!selectedCameraId}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Agregar
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedCameraId('');
                    }}
                    className="flex-1 bg-slate-600 text-slate-100 px-4 py-2 rounded-lg hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Installation Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl border border-slate-700 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-100">🛠️ Instalación del Servidor de Streaming</h3>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 text-slate-300">
              <div className="bg-slate-700 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">📍 Requisitos:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Node.js (v16 o superior)</li>
                  <li>FFmpeg (para procesamiento de video)</li>
                  <li>Acceso al directorio streaming-server</li>
                </ul>
              </div>
              
              <div className="bg-slate-700 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">💻 Instalación:</h4>
                <div className="space-y-2 text-sm font-mono">
                  <div className="bg-slate-900 p-2 rounded">
                    <span className="text-green-400"># 1. Instalar FFmpeg</span><br/>
                    <span className="text-blue-400">brew install ffmpeg</span> <span className="text-slate-500"># macOS</span><br/>
                    <span className="text-blue-400">sudo apt install ffmpeg</span> <span className="text-slate-500"># Ubuntu</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded">
                    <span className="text-green-400"># 2. Navegar al directorio</span><br/>
                    <span className="text-blue-400">cd streaming-server</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded">
                    <span className="text-green-400"># 3. Instalar dependencias</span><br/>
                    <span className="text-blue-400">npm install</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded">
                    <span className="text-green-400"># 4. Iniciar servidor</span><br/>
                    <span className="text-blue-400">./start.sh</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-900/20 border border-amber-700 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-amber-300">⚠️ Nota importante:</h4>
                <p className="text-sm">
                  El servidor de streaming es necesario solo para cámaras IP/RTSP. 
                  Las webcams locales funcionan sin él.
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowInstallGuide(false);
                    checkServerHealth();
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Verificar Estado
                </button>
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="bg-slate-600 text-slate-100 px-4 py-2 rounded-lg hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access Direction Modal */}
      {accessModal?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-8 w-full max-w-md shadow-2xl border border-slate-700">
            <h3 className="text-2xl font-bold mb-2 text-center text-slate-100">👤 Empleado Reconocido</h3>
            <p className="text-center text-slate-300 mb-6 text-lg">{accessModal.nombreCompleto}</p>
            
            <div className="space-y-3">
              <button
                onClick={async () => {
                  await registerAccess('ingreso');
                  setAccessModal(null);
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg text-xl font-semibold flex items-center justify-center gap-3 transition-colors"
              >
                <span className="text-2xl">⬇️</span>
                <span>INGRESO</span>
              </button>
              
              <button
                onClick={async () => {
                  await registerAccess('egreso');
                  setAccessModal(null);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg text-xl font-semibold flex items-center justify-center gap-3 transition-colors"
              >
                <span className="text-2xl">⬆️</span>
                <span>EGRESO</span>
              </button>
              
              <button
                onClick={() => {
                  // Reanudar cámara al cancelar
                  if (accessModal) {
                    setPausedCameras(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(accessModal.cameraId);
                      return newSet;
                    });
                  }
                  setAccessModal(null);
                }}
                className="w-full bg-slate-600 hover:bg-slate-700 text-slate-100 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  async function registerAccess(accessType: 'ingreso' | 'egreso') {
    if (!accessModal) return;

    try {
      const response = await fetch(`${API_URL}/register-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleadoId: accessModal.empleadoId,
          cameraId: accessModal.cameraId,
          accessType,
          timestamp: Date.now()
        })
      });

      if (response.ok) {
        const data = await response.json();
        const nombre = data.nombreCompleto || accessModal.empleadoId;
        toast.success(`✅ ${accessType.toUpperCase()} registrado: ${nombre}`, { duration: 3000 });
        speakText(`${accessType === 'ingreso' ? 'Bienvenido' : 'Hasta luego'} ${nombre}`);
        
        // Guardar timestamp del último acceso
        setLastAccessTime(prev => ({
          ...prev,
          [accessModal.empleadoId]: Date.now()
        }));
        
        // Reanudar cámara
        setPausedCameras(prev => {
          const newSet = new Set(prev);
          newSet.delete(accessModal.cameraId);
          return newSet;
        });
        
        setCameras(prev => prev.map(cam => 
          cam.id === accessModal.cameraId
            ? { 
                ...cam, 
                lastDetection: {
                  tipo: 'autorizado',
                  empleadoId: accessModal.empleadoId,
                  timestamp: Date.now()
                }
              }
            : cam
        ));

        if (recording) {
          setEvents(prev => [{
            cameraId: accessModal.cameraId,
            timestamp: Date.now(),
            tipo: 'autorizado',
            empleadoId: accessModal.empleadoId,
            accessType
          }, ...prev].slice(0, 50));
        }
      }
    } catch (error) {
      console.error('Error registering access:', error);
      toast.error('Error al registrar acceso');
    }
  }
};

export default MultiCameraMonitor;
