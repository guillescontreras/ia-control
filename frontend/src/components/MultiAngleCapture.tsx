import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { API_URL } from '../config';

interface MultiAngleCaptureProps {
  empleadoId: string;
  onComplete: () => void;
  onCancel: () => void;
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

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      toast.error('No se pudo acceder a la cámara');
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

  const registerAllImages = async () => {
    setIsCapturing(true);
    try {
      const images = Object.values(capturedImages);
      
      for (let i = 0; i < images.length; i++) {
        const response = await fetch(`${API_URL}/register-employee`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empleadoId,
            imageBase64: images[i]
          })
        });

        if (!response.ok) {
          throw new Error(`Error registrando imagen ${i + 1}`);
        }
        
        toast.success(`Imagen ${i + 1}/${images.length} registrada`);
      }
      
      toast.success('✅ Todas las imágenes registradas correctamente');
      stopCamera();
      onComplete();
    } catch (error) {
      console.error('Error registering images:', error);
      toast.error('Error al registrar imágenes');
    } finally {
      setIsCapturing(false);
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">📸 Registro Multi-Ángulo</h2>
        <p className="text-gray-600 mb-4">Empleado: <span className="font-semibold">{empleadoId}</span></p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Video Preview */}
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
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
            onClick={registerAllImages}
            disabled={!allCaptured || isCapturing}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isCapturing ? 'Registrando...' : '✅ Registrar Todas las Imágenes'}
          </button>
          <button
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            disabled={isCapturing}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiAngleCapture;
