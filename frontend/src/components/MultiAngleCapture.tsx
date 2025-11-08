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
      const saved = localStorage.getItem('ia-control-cameras');
      if (saved) {
        const cameras = JSON.parse(saved);
        const registroCameras = cameras.filter((c: any) => c.purpose === 'registro' && c.type === 'webcam');
        console.log('Cámaras de registro encontradas:', registroCameras.length);
        
        if (registroCameras.length > 0) {
          setVideoDevices(registroCameras.map((c: any) => ({ 
            deviceId: c.deviceId || '', 
            label: c.name 
          })));
          setSelectedDevice(registroCameras[0].deviceId || '');
          console.log('Cámara seleccionada:', registroCameras[0].name);
        }
      }
      
      if (videoDevices.length === 0) {
        console.log('No hay cámaras configuradas, solicitando permisos...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        console.log('Dispositivos disponibles:', videoInputs.length);
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
        videoRef.current.onloadedmetadata = async () => {
          console.log('Video metadata cargada');
          console.log('Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
          console.log('Video element size:', videoRef.current?.offsetWidth, 'x', videoRef.current?.offsetHeight);
          try {
            await videoRef.current?.play();
          } catch (err) {
            console.error('Error al reproducir video:', err);
          }
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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 99999, padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', maxWidth: '1400px', margin: '0 auto', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>📸 Registro Multi-Ángulo</h2>
          <button
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            style={{ fontSize: '32px', border: 'none', background: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
        <p style={{ marginBottom: '20px' }}>Empleado: <strong>{empleadoId}</strong></p>
        
        {videoDevices.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              Cámara: {videoDevices.length > 1 && '(Seleccionar)'}
            </label>
            {videoDevices.length > 1 ? (
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px 12px' }}
              >
                {videoDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            ) : (
              <p style={{ fontSize: '14px', color: '#4b5563' }}>{videoDevices[0]?.label}</p>
            )}
          </div>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Video Preview */}
          <div>
            <div style={{ backgroundColor: '#1f2937', borderRadius: '8px', padding: '10px' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', maxWidth: '640px', height: 'auto', display: 'block', borderRadius: '4px' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
            
            {!allCaptured && (
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', marginTop: '16px' }}>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#1e3a8a', marginBottom: '8px' }}>
                  {ANGLES[currentAngle].name}
                </p>
                <p style={{ fontSize: '24px' }}>{ANGLES[currentAngle].instruction}</p>
              </div>
            )}
            
            <button
              onClick={captureImage}
              disabled={countdown !== null || allCaptured}
              style={{ width: '100%', backgroundColor: countdown !== null || allCaptured ? '#9ca3af' : '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: countdown !== null || allCaptured ? 'not-allowed' : 'pointer', marginTop: '16px' }}
            >
              {countdown !== null ? 'Capturando...' : allCaptured ? 'Todas capturadas' : '📸 Capturar'}
            </button>
          </div>
          
          {/* Captured Images Grid */}
          <div>
            <h3 style={{ fontWeight: '600', fontSize: '18px', marginBottom: '16px' }}>Imágenes Capturadas ({Object.keys(capturedImages).length}/{ANGLES.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {ANGLES.map((angle, index) => (
                <div key={angle.id} style={{ position: 'relative' }}>
                  <div style={{ border: capturedImages[angle.id] ? '2px solid #10b981' : '2px solid #d1d5db', borderRadius: '8px', overflow: 'hidden', aspectRatio: '4/3' }}>
                    {capturedImages[angle.id] ? (
                      <img
                        src={`data:image/jpeg;base64,${capturedImages[angle.id]}`}
                        alt={angle.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#9ca3af', fontSize: '14px' }}>Sin capturar</span>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', textAlign: 'center', marginTop: '4px', fontWeight: '500' }}>{angle.name}</p>
                  {capturedImages[angle.id] && (
                    <button
                      onClick={() => retakeAngle(index)}
                      style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: '#dc2626', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', border: 'none', cursor: 'pointer' }}
                    >
                      🔄
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={confirmImages}
            disabled={!allCaptured}
            style={{ flex: 1, backgroundColor: !allCaptured ? '#9ca3af' : '#16a34a', color: 'white', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: !allCaptured ? 'not-allowed' : 'pointer' }}
          >
            ✅ Confirmar Fotos
          </button>
          <button
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            style={{ padding: '12px 24px', backgroundColor: '#d1d5db', color: '#374151', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiAngleCapture;
