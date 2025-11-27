import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface Camera {
  id: string;
  name: string;
  location: string;
  type: 'webcam' | 'rtsp';
  purpose: 'control' | 'registro';
  url?: string;
  deviceId?: string;
  status: 'active' | 'inactive';
  zoneId?: string;  // ID de zona EPP asignada
  zoneName?: string; // Nombre de zona EPP
  captureInterval?: number; // Intervalo de captura en segundos (5, 10, 30)
  eppDetectionEnabled?: boolean; // Si la detección EPP está activa
}

const CameraSettings: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    location: '',
    type: 'webcam' as 'webcam' | 'rtsp',
    purpose: 'control' as 'control' | 'registro',
    url: '',
    deviceId: '',
    captureInterval: 10,
    eppDetectionEnabled: false
  });

  useEffect(() => {
    loadCameras();
  }, []);

  const loadVideoDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      setVideoDevices(videoInputs);
      
      // Si no hay labels, pedir permisos
      if (videoInputs.length > 0 && !videoInputs[0].label) {
        await navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
          stream.getTracks().forEach(track => track.stop());
        });
        const devicesWithLabels = await navigator.mediaDevices.enumerateDevices();
        const videoInputsWithLabels = devicesWithLabels.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoInputsWithLabels);
      }
    } catch (error) {
      console.error('Error enumerando dispositivos:', error);
    }
  };

  const loadCameras = () => {
    const saved = localStorage.getItem('ia-control-cameras');
    if (saved) {
      const allCameras = JSON.parse(saved);
      // Migrar cámaras antiguas sin campo purpose
      const migratedCameras = allCameras.map((c: any) => ({
        ...c,
        purpose: c.purpose || 'control' // Por defecto control si no tiene
      }));
      setCameras(migratedCameras);
      // Guardar migración
      localStorage.setItem('ia-control-cameras', JSON.stringify(migratedCameras));
    }
  };

  const saveCameras = (newCameras: Camera[]) => {
    setCameras(newCameras);
    localStorage.setItem('ia-control-cameras', JSON.stringify(newCameras));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.id || !formData.name) {
      toast.error('ID y Nombre son requeridos');
      return;
    }

    if (editMode) {
      saveCameras(cameras.map(cam =>
        cam.id === formData.id
          ? { ...cam, ...formData, status: 'active' as const }
          : cam
      ));
      toast.success('Cámara actualizada');
    } else {
      // Validar ID único
      const existingCamera = cameras.find(c => c.id === formData.id);
      if (existingCamera) {
        toast.error(`Ya existe una cámara con ID ${formData.id}: ${existingCamera.name}`);
        return;
      }
      saveCameras([...cameras, { ...formData, status: 'active' as const }]);
      toast.success('Cámara agregada');
    }

    resetForm();
  };

  const handleEdit = (camera: Camera) => {
    setEditMode(true);
    setFormData({
      id: camera.id,
      name: camera.name,
      location: camera.location,
      type: camera.type,
      purpose: camera.purpose,
      url: camera.url || '',
      deviceId: camera.deviceId || '',
      captureInterval: camera.captureInterval || 10,
      eppDetectionEnabled: camera.eppDetectionEnabled || false
    });
    loadVideoDevices();
    setShowModal(true);
  };

  const handleDelete = (cameraId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta cámara?')) return;
    saveCameras(cameras.filter(cam => cam.id !== cameraId));
    toast.success('Cámara eliminada');
  };

  const resetForm = () => {
    stopPreview();
    setFormData({
      id: '',
      name: '',
      location: '',
      type: 'webcam',
      purpose: 'control',
      url: '',
      deviceId: '',
      captureInterval: 10,
      eppDetectionEnabled: false
    });
    setShowModal(false);
    setEditMode(false);
    setShowPreview(false);
  };

  const startPreview = async () => {
    if (formData.type !== 'webcam') return;
    try {
      const constraints: MediaStreamConstraints = {
        video: formData.deviceId 
          ? { deviceId: { exact: formData.deviceId } }
          : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error iniciando preview:', error);
      toast.error('Error al iniciar vista previa');
    }
  };

  const stopPreview = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowPreview(false);
  };

  const controlCameras = cameras.filter(c => c.purpose === 'control');
  const registroCameras = cameras.filter(c => c.purpose === 'registro');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-100">⚙️ Configuración de Cámaras</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (window.confirm('¿Ver todas las cámaras en consola?')) {
                console.log('Cámaras:', cameras);
                toast.success('Revisa la consola del navegador');
              }
            }}
            className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 text-sm transition-colors"
          >
            🔍 Debug
          </button>
          <button
            onClick={() => {
              loadVideoDevices();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Agregar Cámara
          </button>
        </div>
      </div>

      {/* Cámaras de Control */}
      <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 text-slate-100">📹 Cámaras de Control ({controlCameras.length})</h3>
        <p className="text-sm text-slate-400 mb-4">Usadas para monitoreo de ingresos/egresos y tránsito</p>
        
        {controlCameras.length === 0 ? (
          <p className="text-center text-slate-500 py-4">No hay cámaras de control configuradas</p>
        ) : (
          <div className="space-y-3">
            {controlCameras.map(camera => (
              <div key={camera.id} className="border border-slate-600 rounded-lg p-4 flex justify-between items-center bg-slate-700/50">
                <div>
                  <p className="font-semibold text-slate-100">{camera.name}</p>
                  <p className="text-sm text-slate-300">{camera.location}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {camera.type === 'webcam' ? '📷 Webcam' : '🎥 RTSP'} • ID: {camera.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(camera)}
                    className="text-blue-600 hover:text-blue-800 px-3 py-1"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(camera.id)}
                    className="text-red-600 hover:text-red-800 px-3 py-1"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cámaras de Registro */}
      <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 text-slate-100">📸 Cámaras de Registro ({registroCameras.length})</h3>
        <p className="text-sm text-slate-400 mb-4">Usadas exclusivamente para registro de empleados</p>
        
        {registroCameras.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-slate-500 mb-2">No hay cámaras de registro configuradas</p>
            <p className="text-xs text-slate-600">Se recomienda tener al menos una cámara dedicada para registro</p>
          </div>
        ) : (
          <div className="space-y-3">
            {registroCameras.map(camera => (
              <div key={camera.id} className="border border-purple-600/30 rounded-lg p-4 flex justify-between items-center bg-purple-900/20">
                <div>
                  <p className="font-semibold text-slate-100">{camera.name}</p>
                  <p className="text-sm text-slate-300">{camera.location}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {camera.type === 'webcam' ? '📷 Webcam' : '🎥 RTSP'} • ID: {camera.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(camera)}
                    className="text-blue-600 hover:text-blue-800 px-3 py-1"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(camera.id)}
                    className="text-red-600 hover:text-red-800 px-3 py-1"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold mb-4 text-slate-100">{editMode ? 'Editar Cámara' : 'Agregar Nueva Cámara'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">ID Cámara *</label>
                <input
                  type="text"
                  required
                  disabled={editMode}
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 disabled:bg-slate-900 disabled:text-slate-500"
                  placeholder="CAM-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100"
                  placeholder="Entrada Principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Ubicación</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100"
                  placeholder="Planta Baja"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Propósito *</label>
                <select
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value as 'control' | 'registro' })}
                  className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100"
                >
                  <option value="control">Control (Monitoreo)</option>
                  <option value="registro">Registro (Empleados)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {formData.purpose === 'control' 
                    ? 'Se usará para monitoreo de ingresos/egresos' 
                    : 'Se usará solo para registro de empleados'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Intervalo de Captura EPP</label>
                <select
                  value={formData.captureInterval}
                  onChange={(e) => setFormData({ ...formData, captureInterval: parseInt(e.target.value) })}
                  className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100"
                >
                  <option value={5}>Cada 5 segundos</option>
                  <option value={10}>Cada 10 segundos</option>
                  <option value={30}>Cada 30 segundos</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Frecuencia de análisis de EPP cuando esté habilitado
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Tipo *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'webcam' | 'rtsp' })}
                  className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100"
                >
                  <option value="webcam">Webcam</option>
                  <option value="rtsp">RTSP Stream</option>
                </select>
              </div>

              {formData.type === 'webcam' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Dispositivo ({videoDevices.length} encontrados)
                    </label>
                    <select
                      value={formData.deviceId}
                      onChange={(e) => {
                        setFormData({ ...formData, deviceId: e.target.value });
                        stopPreview();
                      }}
                      className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100"
                    >
                      <option value="">Predeterminada</option>
                      {videoDevices.map((device, idx) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Cámara ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={showPreview ? stopPreview : startPreview}
                    className="w-full bg-slate-600 text-slate-100 px-4 py-2 rounded-lg hover:bg-slate-700"
                  >
                    {showPreview ? '⏹️ Detener Vista Previa' : '▶️ Ver Vista Previa'}
                  </button>
                  {showPreview && (
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full aspect-video object-cover"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-300">URL RTSP</label>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100"
                    placeholder="rtsp://usuario:password@192.168.1.100:554/stream1"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {editMode ? 'Actualizar' : 'Agregar'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-slate-600 text-slate-100 px-4 py-2 rounded-lg hover:bg-slate-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraSettings;
