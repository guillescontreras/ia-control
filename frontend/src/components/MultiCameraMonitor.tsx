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
}

interface CameraFeedProps {
  camera: Camera;
  onCapture: (cameraId: string, imageBase64: string) => void;
  size: 'small' | 'medium' | 'large';
  isPaused: boolean;
  onTogglePause: (cameraId: string) => void;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ camera, onCapture, size, isPaused, onTogglePause }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
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
    if (isStreaming) {
      const interval = 1000; // 1 segundo para todas las cámaras
      intervalRef.current = setInterval(() => {
        captureFrame();
      }, interval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isStreaming]);

  const startWebcam = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: camera.deviceId 
          ? { deviceId: { exact: camera.deviceId }, width: 640, height: 480 }
          : { width: 640, height: 480 }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
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
    if (!videoRef.current || isPaused) return;

    if (camera.type === 'webcam') {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const video = videoRef.current as HTMLVideoElement;
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0);
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
      
      <button
        onClick={() => onTogglePause(camera.id)}
        className="absolute top-1 right-8 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs hover:bg-opacity-90"
      >
        {isPaused ? '▶️' : '⏸️'}
      </button>
      
      {!isStreaming && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-xs">Cargando...</div>
        </div>
      )}
      
      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
        camera.status === 'active' ? 'bg-green-500' : 
        camera.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
      }`} />

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
  const [showAddCamera, setShowAddCamera] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newCamera, setNewCamera] = useState({
    id: '',
    name: '',
    location: '',
    type: 'webcam' as 'webcam' | 'ip' | 'rtsp',
    url: '',
    deviceId: ''
  });
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [recording, setRecording] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [cameraSize, setCameraSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [columns, setColumns] = useState(3);
  const [serverHealth, setServerHealth] = useState<any>(null);
  const [pausedCameras, setPausedCameras] = useState<Set<string>>(new Set());
  const [accessModal, setAccessModal] = useState<{
    show: boolean;
    empleadoId: string;
    cameraId: string;
    imageBase64: string;
  } | null>(null);
  const [lastAccessTime, setLastAccessTime] = useState<{[key: string]: number}>({});

  useEffect(() => {
    loadCameras();
    checkServerHealth();
    loadVideoDevices();
    const healthInterval = setInterval(checkServerHealth, 30000);
    return () => clearInterval(healthInterval);
  }, []);

  const loadVideoDevices = async () => {
    try {
      // Solicitar permisos primero para obtener etiquetas
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      setVideoDevices(videoInputs);
      console.log('Dispositivos de video encontrados:', videoInputs.length);
    } catch (error) {
      console.error('Error enumerando dispositivos:', error);
    }
  };

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
    if (saved) {
      setCameras(JSON.parse(saved));
    } else {
      // Cámara por defecto
      setCameras([{ id: 'CAM-001', name: 'Entrada Principal', location: 'Planta Baja', type: 'webcam', status: 'active' }]);
    }
  };

  const saveCameras = (newCameras: Camera[]) => {
    setCameras(newCameras);
    localStorage.setItem('ia-control-cameras', JSON.stringify(newCameras));
  };

  const toggleCameraPause = async (cameraId: string) => {
    const isPaused = pausedCameras.has(cameraId);
    const endpoint = isPaused ? 'resume' : 'pause';
    
    try {
      await fetch(`${STREAMING_SERVER}/stream/${endpoint}/${cameraId}`, { method: 'POST' });
      setPausedCameras(prev => {
        const newSet = new Set(prev);
        if (isPaused) {
          newSet.delete(cameraId);
        } else {
          newSet.add(cameraId);
        }
        return newSet;
      });
    } catch (error) {
      console.error('Error toggling camera pause:', error);
    }
  };

  const handleCapture = async (cameraId: string, imageBase64: string) => {
    if (!imageBase64 || imageBase64.length < 1000) {
      return; // Ignorar frames vacíos
    }

    // Solo procesar si está grabando
    if (!recording) {
      return;
    }

    try {
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
            cameraId,
            imageBase64
          });
          
          playSuccessSound();
          const nombre = result.nombreCompleto || result.empleadoId;
          speakText(`Hola ${nombre}, selecciona ingreso o egreso`);
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

  const addCamera = () => {
    if (!newCamera.id || !newCamera.name) {
      alert('ID y Nombre son requeridos');
      return;
    }

    if (editMode) {
      // Actualizar cámara existente
      saveCameras(cameras.map(cam => 
        cam.id === newCamera.id 
          ? { ...cam, name: newCamera.name, location: newCamera.location, url: newCamera.url }
          : cam
      ));
    } else {
      // Agregar nueva cámara
      const newCam = {
        ...newCamera,
        status: 'active' as const
      };
      saveCameras([...cameras, newCam]);
    }

    setNewCamera({ id: '', name: '', location: '', type: 'webcam', url: '', deviceId: '' });
    setShowAddCamera(false);
    setEditMode(false);
  };

  const editCamera = (camera: Camera) => {
    loadVideoDevices();
    setEditMode(true);
    setNewCamera({
      id: camera.id,
      name: camera.name,
      location: camera.location,
      type: camera.type,
      url: camera.url || '',
      deviceId: (camera as any).deviceId || ''
    });
    setShowAddCamera(true);
  };

  const removeCamera = (cameraId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta cámara?')) return;
    saveCameras(cameras.filter(cam => cam.id !== cameraId));
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
          <h2 className="text-2xl font-bold text-gray-900">📹 Monitor Multi-Cámara</h2>
          {serverHealth && (
            <p className="text-xs text-gray-500 mt-1">
              Servidor: <span className={serverHealth.status === 'ok' ? 'text-green-600' : 'text-red-600'}>
                {serverHealth.status === 'ok' ? '✅ Activo' : '❌ Error'}
              </span>
              {serverHealth.poolConnections !== undefined && (
                <span className="ml-2">| Pool: {serverHealth.poolConnections} conexiones</span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setColumns(2)}
              className={`px-3 py-1 rounded text-sm ${columns === 2 ? 'bg-white shadow' : ''}`}
            >
              2 col
            </button>
            <button
              onClick={() => setColumns(3)}
              className={`px-3 py-1 rounded text-sm ${columns === 3 ? 'bg-white shadow' : ''}`}
            >
              3 col
            </button>
            <button
              onClick={() => setColumns(4)}
              className={`px-3 py-1 rounded text-sm ${columns === 4 ? 'bg-white shadow' : ''}`}
            >
              4 col
            </button>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCameraSize('small')}
              className={`px-3 py-1 rounded text-sm ${cameraSize === 'small' ? 'bg-white shadow' : ''}`}
            >
              S
            </button>
            <button
              onClick={() => setCameraSize('medium')}
              className={`px-3 py-1 rounded text-sm ${cameraSize === 'medium' ? 'bg-white shadow' : ''}`}
            >
              M
            </button>
            <button
              onClick={() => setCameraSize('large')}
              className={`px-3 py-1 rounded text-sm ${cameraSize === 'large' ? 'bg-white shadow' : ''}`}
            >
              L
            </button>
          </div>
          <button
            onClick={() => setRecording(!recording)}
            className={`px-4 py-2 rounded-lg ${
              recording ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {recording ? '⏺️ Grabando' : '⏸️ Pausado'}
          </button>
          <button
            onClick={() => {
              loadVideoDevices();
              setNewCamera({ id: '', name: '', location: '', type: 'webcam', url: '', deviceId: '' });
              setShowAddCamera(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Agregar Cámara
          </button>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {cameras.map(camera => (
          <div key={camera.id} className="bg-white rounded-lg shadow p-3">
            <CameraFeed 
              camera={camera} 
              onCapture={handleCapture} 
              size={cameraSize}
              isPaused={pausedCameras.has(camera.id)}
              onTogglePause={toggleCameraPause}
            />
            <div className="mt-2 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {camera.location}
                {pausedCameras.has(camera.id) && (
                  <span className="ml-2 text-orange-600 font-semibold">⏸️ Pausada</span>
                )}
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => editCamera(camera)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ✏️
                </button>
                <button
                  onClick={() => removeCamera(camera.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Events Log */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">📋 Eventos Recientes</h3>
          <button
            onClick={exportEvents}
            disabled={events.length === 0}
            className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            💾 Exportar
          </button>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay eventos registrados</p>
          ) : (
            events.map((event, idx) => (
              <div key={idx} className={`p-3 rounded border ${
                event.tipo === 'autorizado' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold">{event.cameraId}</span>
                    {event.empleadoId && <span className="ml-2 text-sm">- {event.empleadoId}</span>}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {event.objetos && event.objetos.length > 0 && (
                  <div className="mt-1 text-xs text-gray-600">
                    Objetos: {event.objetos.slice(0, 3).join(', ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Camera Modal */}
      {showAddCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">{editMode ? 'Editar Cámara' : 'Agregar Nueva Cámara'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID Cámara</label>
                <input
                  type="text"
                  disabled={editMode}
                  value={newCamera.id}
                  onChange={(e) => setNewCamera({ ...newCamera, id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
                  placeholder="CAM-005"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  value={newCamera.name}
                  onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Entrada Lateral"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ubicación</label>
                <input
                  type="text"
                  value={newCamera.location}
                  onChange={(e) => setNewCamera({ ...newCamera, location: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Planta 2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  value={newCamera.type}
                  onChange={(e) => setNewCamera({ ...newCamera, type: e.target.value as any })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="webcam">Webcam</option>
                  <option value="rtsp">RTSP Stream</option>
                </select>
              </div>
              
              {newCamera.type === 'webcam' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Dispositivo ({videoDevices.length} encontrados)
                  </label>
                  <select
                    value={newCamera.deviceId}
                    onChange={(e) => setNewCamera({ ...newCamera, deviceId: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Predeterminada</option>
                    {videoDevices.map((device, idx) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Cámara ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">URL RTSP</label>
                  <input
                    type="text"
                    value={newCamera.url}
                    onChange={(e) => setNewCamera({ ...newCamera, url: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="rtsp://usuario:password@192.168.1.100:554/stream1"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={addCamera}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {editMode ? 'Actualizar' : 'Agregar'}
                </button>
                <button
                  onClick={() => { setShowAddCamera(false); setEditMode(false); }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access Direction Modal */}
      {accessModal?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold mb-2 text-center">👤 Empleado Reconocido</h3>
            <p className="text-center text-gray-600 mb-6 text-lg">{accessModal.empleadoId}</p>
            
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
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
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
