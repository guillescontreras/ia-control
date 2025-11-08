import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { API_URL } from '../config';

interface MultiAngleCaptureProps {
  empleadoId: string;
  onComplete: (images: string[]) => void;
  onCancel: () => void;
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

const ANGLES = [
  { id: 'frontal', name: 'Frontal', instruction: '📸 Mira directo a la cámara' },
  { id: 'izquierda', name: 'Perfil Izquierdo', instruction: '👈 Gira tu cabeza a la izquierda' },
  { id: 'derecha', name: 'Perfil Derecho', instruction: '👉 Gira tu cabeza a la derecha' },
  { id: 'arriba', name: 'Mirando Arriba', instruction: '⬆️ Inclina tu cabeza hacia arriba' },
  { id: 'abajo', name: 'Mirando Abajo', instruction: '⬇️ Inclina tu cabeza hacia abajo' }
];

const MultiAngleCapture: React.FC<MultiAngleCaptureProps> = ({ empleadoId, onComplete, onCancel }) => {
  const [currentAngle, setCurrentAngle] = useState(0);
  const [capturedImages, setCapturedImages] = useState<{[key: string]: string}>({});
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [videoDevices, setVideoDevices] = useState<VideoDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  useEffect(() => {
    console.log('MultiAngleCapture montado');
    loadVideoDevices();
    return () => {
      console.log('MultiAngleCapture desmontado');
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      startCamera();
    }
  }, [selectedDevice]);

  const loadVideoDevices = async () => {
    console.log('Cargando dispositivos de video...');
    try {
      console.log('Solicitando permisos de cámara...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('Permisos obtenidos, deteniendo stream temporal');
      stream.getTracks().forEach(track => track.stop());
      
      const saved = localStorage.getItem('ia-control-cameras');
      if (saved) {
        const cameras = JSON.parse(saved);
        const registroCameras = cameras.filter((c: any) => c.purpose === 'registro' && c.type === 'webcam');
        console.log('Cámaras de registro encontradas:', registroCameras.length);
        
        if (registroCameras.length === 0) {
          console.log('No hay cámaras de registro, usando cámara por defecto');
          toast.error('No hay cámaras de registro configuradas. Usando cámara predeterminada.', { duration: 5000 });
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(d => d.kind === 'videoinput');
          console.log('Dispositivos de video disponibles:', videoInputs.length);
          if (videoInputs.length > 0) {
            setVideoDevices([{ deviceId: videoInputs[0].deviceId, label: videoInputs[0].label || 'Cámara predeterminada' }]);
            setSelectedDevice(videoInputs[0].deviceId);
          }
          return;
        }
        
        setVideoDevices(registroCameras.map((c: any) => ({ 
          deviceId: c.deviceId || '', 
          label: c.name 
        })));
        setSelectedDevice(registroCameras[0].deviceId || '');
        console.log('Cámara seleccionada:', registroCameras[0].name);
      } else {
        console.log('Sin configuración guardada, usando cámara por defecto');
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        console.log('Dispositivos de video disponibles:', videoInputs.length);
        if (videoInputs.length > 0) {
          setVideoDevices([{ deviceId: videoInputs[0].deviceId, label: videoInputs[0].label || 'Cámara predeterminada' }]);
          setSelectedDevice(videoInputs[0].deviceId);
        }
      }
    } catch (error) {
      console.error('Error cargando cámaras:', error);
      toast.error('Error al acceder a la cámara: ' + (error as Error).message);
    }
  };

  const startCamera = async () => {
    console.log('Iniciando cámara con deviceId:', selectedDevice);
    try {
      if (streamRef.current) {
        console.log('Deteniendo stream anterior');
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = selectedDevice 
        ? { video: { deviceId: { exact: selectedDevice }, width: 1280, height: 720 } }
        : { video: { width: 1280, height: 720 } };
      
      console.log('Solicitando stream con constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Stream obtenido, asignando a video element');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata cargada, reproduciendo');
          videoRef.current?.play();
        };
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      toast.error('No se pudo acceder a la cámara: ' + (error as Error).message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setCountdown(3);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCountdown(2);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCountdown(1);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCountdown(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
    
    const angleId = ANGLES[currentAngle].id;
    setCapturedImages(prev => ({ ...prev, [angleId]: imageBase64 }));
    
    toast.success(`✅ ${ANGLES[currentAngle].name} capturado`);
    
    if (currentAngle < ANGLES.length - 1) {
      setCurrentAngle(currentAngle + 1);
    }
  };

  const confirmImages = () => {
    const images = Object.values(capturedImages);
    stopCamera();
    onComplete(images);
    toast.success(`✅ ${images.length} fotos listas para registro`);
  };

  const retakeAngle = (index: number) => {
    const angleId = ANGLES[index].id;
    setCapturedImages(prev => {
      const newImages = { ...prev };
      delete newImages[angleId];
      return newImages;
    });
    setCurrentAngle(index);
  };

  const allCaptured = Object.keys(capturedImages).length === ANGLES.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">📸 Registro Multi-Ángulo</h2>
          <button
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        <p className="text-gray-600 mb-2">Empleado: <span className="font-semibold">{empleadoId}</span></p>
        
        {videoDevices.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cámara: {videoDevices.length > 1 && '(Seleccionar)'}
            </label>
            {videoDevices.length > 1 ? (
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {videoDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-600">{videoDevices[0]?.label}</p>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Video Preview */}
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '300px' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ minHeight: '300px' }}
              />
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-white text-9xl font-bold">{countdown}</div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            {!allCaptured && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-lg font-semibold text-blue-900 mb-2">
                  {ANGLES[currentAngle].name}
                </p>
                <p className="text-2xl">{ANGLES[currentAngle].instruction}</p>
              </div>
            )}
            
            <button
              onClick={captureImage}
              disabled={countdown !== null || allCaptured}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {countdown !== null ? 'Capturando...' : allCaptured ? 'Todas capturadas' : '📸 Capturar'}
            </button>
          </div>
          
          {/* Captured Images Grid */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Imágenes Capturadas ({Object.keys(capturedImages).length}/{ANGLES.length})</h3>
            <div className="grid grid-cols-2 gap-3">
              {ANGLES.map((angle, index) => (
                <div key={angle.id} className="relative">
                  <div className={`border-2 rounded-lg overflow-hidden ${
                    capturedImages[angle.id] ? 'border-green-500' : 'border-gray-300'
                  }`} style={{ aspectRatio: '4/3' }}>
                    {capturedImages[angle.id] ? (
                      <img
                        src={`data:image/jpeg;base64,${capturedImages[angle.id]}`}
                        alt={angle.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-400 text-sm">Sin capturar</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-center mt-1 font-medium">{angle.name}</p>
                  {capturedImages[angle.id] && (
                    <button
                      onClick={() => retakeAngle(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                    >
                      🔄
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={confirmImages}
            disabled={!allCaptured}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            ✅ Confirmar Fotos
          </button>
          <button
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiAngleCapture;
