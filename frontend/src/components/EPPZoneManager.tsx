import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const API_URL = 'https://bx2rwg4ogk.execute-api.us-east-1.amazonaws.com/prod';

interface EPPRequirements {
  helmet: boolean;
  vest: boolean;
  faceCover: boolean;
  handCover: boolean;
}

interface EPPZone {
  zoneId: string;
  zoneName: string;
  description: string;
  requiredEPP: EPPRequirements;
  criticalEPP: string[];
  complianceThreshold: number;
  cameras: string[];
  createdAt: string;
  updatedAt: string;
}

interface Camera {
  id: string;
  name: string;
  zoneId?: string;
  zoneName?: string;
}

interface EPPZoneManagerProps {
  cameras: Camera[];
  onCameraUpdate: (cameras: Camera[]) => void;
}

const EPPZoneManager: React.FC<EPPZoneManagerProps> = ({ cameras, onCameraUpdate }) => {
  console.log('🦺 EPPZoneManager - Cámaras recibidas:', cameras.length, cameras);
  const [zones, setZones] = useState<EPPZone[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<EPPZone | null>(null);
  const [formData, setFormData] = useState({
    zoneName: '',
    description: '',
    helmet: false,
    vest: false,
    faceCover: false,
    handCover: false,
    complianceThreshold: 80,
    selectedCameras: [] as string[]
  });

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    try {
      const response = await fetch(`${API_URL}/epp-zones`);
      const data = await response.json();
      setZones(data.zones || []);
    } catch (error) {
      console.error('❌ Error cargando zonas:', error);
      toast.error('Error al cargar zonas EPP');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.zoneName.trim()) {
      toast.error('El nombre de la zona es obligatorio');
      return;
    }

    const criticalEPP: string[] = [];
    if (formData.helmet) criticalEPP.push('helmet');
    if (formData.vest) criticalEPP.push('vest');
    if (formData.faceCover) criticalEPP.push('faceCover');
    if (formData.handCover) criticalEPP.push('handCover');

    const payload = {
      zoneName: formData.zoneName,
      description: formData.description,
      requiredEPP: {
        helmet: formData.helmet,
        vest: formData.vest,
        faceCover: formData.faceCover,
        handCover: formData.handCover
      },
      criticalEPP,
      complianceThreshold: formData.complianceThreshold,
      cameras: formData.selectedCameras
    };

    try {
      let createdZoneId = editingZone?.zoneId;
      
      if (editingZone) {
        await fetch(`${API_URL}/epp-zones/${editingZone.zoneId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        toast.success('✅ Zona actualizada correctamente');
      } else {
        const response = await fetch(`${API_URL}/epp-zones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        createdZoneId = data.zoneId;
        console.log('🆕 Zona creada con ID:', createdZoneId);
        toast.success('✅ Zona creada correctamente');
      }

      // Update cameras with zone assignment
      const updatedCameras = cameras.map(cam => {
        if (formData.selectedCameras.includes(cam.id)) {
          return { ...cam, zoneId: createdZoneId, zoneName: formData.zoneName };
        } else if (cam.zoneId === editingZone?.zoneId) {
          const { zoneId, zoneName, ...rest } = cam;
          return rest as Camera;
        }
        return cam;
      });
      console.log('📹 Cámaras actualizadas:', updatedCameras);
      onCameraUpdate(updatedCameras);

      loadZones();
      closeModal();
    } catch (error) {
      console.error('❌ Error guardando zona:', error);
      toast.error('Error al guardar la zona');
    }
  };

  const handleDelete = async (zoneId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta zona?')) return;

    try {
      await fetch(`${API_URL}/epp-zones/${zoneId}`, { method: 'DELETE' });
      toast.success('✅ Zona eliminada correctamente');

      // Remove zone assignment from cameras
      const updatedCameras = cameras.map(cam => {
        if (cam.zoneId === zoneId) {
          const { zoneId, zoneName, ...rest } = cam;
          return rest as Camera;
        }
        return cam;
      });
      onCameraUpdate(updatedCameras);

      loadZones();
    } catch (error) {
      console.error('❌ Error eliminando zona:', error);
      toast.error('Error al eliminar la zona');
    }
  };

  const openCreateModal = () => {
    setEditingZone(null);
    setFormData({
      zoneName: '',
      description: '',
      helmet: false,
      vest: false,
      faceCover: false,
      handCover: false,
      complianceThreshold: 80,
      selectedCameras: []
    });
    setShowModal(true);
  };

  const openEditModal = (zone: EPPZone) => {
    setEditingZone(zone);
    setFormData({
      zoneName: zone.zoneName,
      description: zone.description,
      helmet: zone.requiredEPP.helmet,
      vest: zone.requiredEPP.vest,
      faceCover: zone.requiredEPP.faceCover,
      handCover: zone.requiredEPP.handCover,
      complianceThreshold: zone.complianceThreshold,
      selectedCameras: zone.cameras
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingZone(null);
  };

  const getAvailableCameras = () => {
    const available = cameras.filter(cam => !cam.zoneId || cam.zoneId === editingZone?.zoneId);
    console.log('📹 Cámaras disponibles:', available.length, available);
    console.log('📹 Todas las cámaras:', cameras);
    console.log('📹 Zona en edición:', editingZone?.zoneId);
    return available;
  };

  const getEPPLabel = (key: string) => {
    const labels: { [key: string]: string } = {
      helmet: '🪖 Casco',
      vest: '🦺 Chaleco',
      faceCover: '😷 Protección Facial',
      handCover: '🧤 Protección de Manos'
    };
    return labels[key] || key;
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>🦺 Gestión de Zonas EPP</h2>
        <button
          onClick={openCreateModal}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          ➕ Nueva Zona
        </button>
      </div>

      {zones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#2a2a2a', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🦺</div>
          <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#fff' }}>No hay zonas EPP configuradas</h3>
          <p style={{ color: '#9ca3af', marginBottom: '20px' }}>Crea tu primera zona para comenzar el monitoreo</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {zones.map(zone => (
            <div key={zone.zoneId} style={{ backgroundColor: '#2a2a2a', borderRadius: '12px', padding: '20px', border: '1px solid #3a3a3a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#fff' }}>{zone.zoneName}</h3>
                  <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>{zone.description}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => openEditModal(zone)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#374151',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(zone.zoneId)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#d1d5db' }}>EPP Requerido:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {Object.entries(zone.requiredEPP).map(([key, value]) => 
                    value && (
                      <span key={key} style={{
                        padding: '4px 10px',
                        backgroundColor: zone.criticalEPP.includes(key) ? '#dc2626' : '#3b82f6',
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}>
                        {getEPPLabel(key)}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                  Umbral de cumplimiento: <strong style={{ color: '#fff' }}>{zone.complianceThreshold}%</strong>
                </p>
              </div>

              <div>
                <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#d1d5db' }}>
                  Cámaras asignadas: {zone.cameras.length}
                </p>
                {zone.cameras.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {zone.cameras.map(camId => {
                      const cam = cameras.find(c => c.id === camId);
                      return cam ? <div key={camId}>📹 {cam.name}</div> : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#2a2a2a',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid #3a3a3a'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#fff' }}>
              {editingZone ? '✏️ Editar Zona EPP' : '➕ Nueva Zona EPP'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#d1d5db' }}>
                  Nombre de la Zona *
                </label>
                <input
                  type="text"
                  value={formData.zoneName}
                  onChange={(e) => setFormData({ ...formData, zoneName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                  placeholder="Ej: Zona de Construcción"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#d1d5db' }}>
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  placeholder="Descripción de la zona..."
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '500', color: '#d1d5db' }}>
                  EPP Requerido
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { key: 'helmet', label: '🪖 Casco' },
                    { key: 'vest', label: '🦺 Chaleco' },
                    { key: 'faceCover', label: '😷 Protección Facial' },
                    { key: 'handCover', label: '🧤 Protección de Manos' }
                  ].map(item => (
                    <label key={item.key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#d1d5db' }}>
                      <input
                        type="checkbox"
                        checked={formData[item.key as keyof typeof formData] as boolean}
                        onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#d1d5db' }}>
                  Umbral de Cumplimiento: {formData.complianceThreshold}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={formData.complianceThreshold}
                  onChange={(e) => setFormData({ ...formData, complianceThreshold: parseInt(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#d1d5db' }}>
                  Asignar Cámaras
                </label>
                <div style={{ maxHeight: '150px', overflow: 'auto', backgroundColor: '#1a1a1a', border: '1px solid #3a3a3a', borderRadius: '8px', padding: '10px' }}>
                  {cameras.map(cam => (
                    <label key={cam.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer', color: '#d1d5db' }}>
                      <input
                        type="checkbox"
                        checked={formData.selectedCameras.includes(cam.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, selectedCameras: [...formData.selectedCameras, cam.id] });
                          } else {
                            setFormData({ ...formData, selectedCameras: formData.selectedCameras.filter(id => id !== cam.id) });
                          }
                        }}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      📹 {cam.name}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#374151',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {editingZone ? 'Actualizar' : 'Crear'} Zona
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EPPZoneManager;
