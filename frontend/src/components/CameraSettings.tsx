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
}

const CameraSettings: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    location: '',
    type: 'webcam' as 'webcam' | 'rtsp',
    purpose: 'control' as 'control' | 'registro',
    url: '',
    deviceId: ''
  });

  useEffect(() => {
    loadCameras();
    loadVideoDevices();
  }, []);

  const loadVideoDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      setVideoDevices(videoInputs);
    } catch (error) {
      console.error('Error enumerando dispositivos:', error);
    }
  };

  const loadCameras = () => {
    const saved = localStorage.getItem('ia-control-cameras');
    if (saved) {
      setCameras(JSON.parse(saved));
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
      if (cameras.some(c => c.id === formData.id)) {
        toast.error('Ya existe una cámara con ese ID');
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
      deviceId: camera.deviceId || ''
    });
    setShowModal(true);
  };

  const handleDelete = (cameraId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta cámara?')) return;
    saveCameras(cameras.filter(cam => cam.id !== cameraId));
    toast.success('Cámara eliminada');
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      location: '',
      type: 'webcam',
      purpose: 'control',
      url: '',
      deviceId: ''
    });
    setShowModal(false);
    setEditMode(false);
  };

  const controlCameras = cameras.filter(c => c.purpose === 'control');
  const registroCameras = cameras.filter(c => c.purpose === 'registro');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">⚙️ Configuración de Cámaras</h2>
        <button
          onClick={() => {
            loadVideoDevices();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Agregar Cámara
        </button>
      </div>

      {/* Cámaras de Control */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📹 Cámaras de Control ({controlCameras.length})</h3>
        <p className="text-sm text-gray-600 mb-4">Usadas para monitoreo de ingresos/egresos y tránsito</p>
        
        {controlCameras.length === 0 ? (
          <p className="text-center text-gray-400 py-4">No hay cámaras de control configuradas</p>
        ) : (
          <div className="space-y-3">
            {controlCameras.map(camera => (
              <div key={camera.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{camera.name}</p>
                  <p className="text-sm text-gray-600">{camera.location}</p>
                  <p className="text-xs text-gray-500 mt-1">
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
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📸 Cámaras de Registro ({registroCameras.length})</h3>
        <p className="text-sm text-gray-600 mb-4">Usadas exclusivamente para registro de empleados</p>
        
        {registroCameras.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-400 mb-2">No hay cámaras de registro configuradas</p>
            <p className="text-xs text-gray-500">Se recomienda tener al menos una cámara dedicada para registro</p>
          </div>
        ) : (
          <div className="space-y-3">
            {registroCameras.map(camera => (
              <div key={camera.id} className="border rounded-lg p-4 flex justify-between items-center bg-purple-50">
                <div>
                  <p className="font-semibold">{camera.name}</p>
                  <p className="text-sm text-gray-600">{camera.location}</p>
                  <p className="text-xs text-gray-500 mt-1">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">{editMode ? 'Editar Cámara' : 'Agregar Nueva Cámara'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID Cámara *</label>
                <input
                  type="text"
                  required
                  disabled={editMode}
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
                  placeholder="CAM-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Entrada Principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Ubicación</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Planta Baja"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Propósito *</label>
                <select
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value as 'control' | 'registro' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="control">Control (Monitoreo)</option>
                  <option value="registro">Registro (Empleados)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.purpose === 'control' 
                    ? 'Se usará para monitoreo de ingresos/egresos' 
                    : 'Se usará solo para registro de empleados'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'webcam' | 'rtsp' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="webcam">Webcam</option>
                  <option value="rtsp">RTSP Stream</option>
                </select>
              </div>

              {formData.type === 'webcam' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Dispositivo ({videoDevices.length} encontrados)
                  </label>
                  <select
                    value={formData.deviceId}
                    onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
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
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
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
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
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
