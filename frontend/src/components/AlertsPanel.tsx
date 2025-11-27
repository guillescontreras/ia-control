import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

interface Alert {
  alertId: string;
  timestamp: number;
  tipo: string;
  cameraId: string;
  descripcion: string;
  resuelta: boolean;
  type?: string;
  severity?: 'high' | 'medium' | 'low';
  message?: string;
  imageUrl?: string;
  zoneName?: string;
  zoneId?: string;
  empleadoId?: string;
  nombreCompleto?: string;
  details?: {
    personsDetected?: number;
    compliancePercentage?: number;
    missingEPP?: string[];
  };
  ubicacionCamara?: string;
}

const AlertsPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'access' | 'epp'>('access');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 10000); // Cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await fetch(`${API_URL}/alerts`);
      const data = await response.json();
      console.log('📥 Alertas recibidas:', data.alerts?.length, data.alerts);
      const alertsList = (data.alerts || []).filter((a: Alert) => !a.resuelta);
      console.log('📋 Alertas activas:', alertsList.length);
      
      // Obtener cámaras y zonas para ubicaciones
      const cameras = JSON.parse(localStorage.getItem('ia-control-cameras') || '[]');
      const cameraMap = new Map(cameras.map((c: any) => [c.id, c]));
      
      // Agregar ubicación a cada alerta
      const alertsWithLocation = alertsList.map((alert: Alert) => {
        const camera: any = cameraMap.get(alert.cameraId);
        return {
          ...alert,
          ubicacionCamara: camera?.location || camera?.name || alert.cameraId
        };
      });
      
      setAlerts(alertsWithLocation);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const accessAlerts = alerts.filter(a => a.type !== 'epp_violation' && !a.zoneId);
  const eppAlerts = alerts.filter(a => a.type === 'epp_violation' || a.zoneId);
  
  const currentAlerts = activeTab === 'access' ? accessAlerts : eppAlerts;

  if (loading) {
    return <div className="text-center py-8 text-slate-300">Cargando alertas...</div>;
  }

  const exportToCSV = () => {
    if (alerts.length === 0) {
      alert('No hay alertas para exportar');
      return;
    }

    const headers = ['Fecha', 'Hora', 'Tipo', 'Cámara', 'Ubicación', 'Descripción', 'Estado'];
    const rows = alerts.map(alert => [
      new Date(alert.timestamp).toLocaleDateString(),
      new Date(alert.timestamp).toLocaleTimeString(),
      alert.tipo,
      alert.cameraId,
      alert.ubicacionCamara || '-',
      alert.descripcion,
      alert.resuelta ? 'Resuelta' : 'Activa'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alertas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">🚨 Alertas Activas</h2>
          <p className="text-sm text-slate-400 mt-1">
            Acceso: {accessAlerts.length} | EPP: {eppAlerts.length}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedAlerts.size > 0 && (
            <button
              onClick={async () => {
                if (!window.confirm(`¿Eliminar ${selectedAlerts.size} alerta(s)?`)) return;
                const alertsToDelete = Array.from(selectedAlerts);
                console.log('🗑️ Eliminando alertas:', alertsToDelete);
                
                try {
                  const results = await Promise.allSettled(
                    alertsToDelete.map(async alertId => {
                      console.log('Eliminando:', alertId);
                      const res = await fetch(`${API_URL}/alerts/${alertId}`, { method: 'DELETE' });
                      const data = await res.json();
                      console.log('Respuesta:', alertId, res.status, data);
                      return { alertId, status: res.status, data };
                    })
                  );
                  
                  const failed = results.filter(r => r.status === 'rejected' || r.value?.status !== 200);
                  if (failed.length > 0) {
                    console.error('❌ Fallos:', failed);
                    alert(`${failed.length} alertas no se pudieron eliminar`);
                  }
                  
                  setSelectedAlerts(new Set());
                  await loadAlerts();
                } catch (error) {
                  console.error('❌ Error:', error);
                  alert('Error al eliminar alertas');
                }
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              🗑️ Eliminar ({selectedAlerts.size})
            </button>
          )}
          <button
            onClick={exportToCSV}
            disabled={alerts.length === 0}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            📊 Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('access')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'access'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700'
              : 'text-slate-400 hover:text-slate-300 bg-slate-800'
          }`}
        >
          🚪 Control de Acceso ({accessAlerts.length})
        </button>
        <button
          onClick={() => setActiveTab('epp')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'epp'
              ? 'text-orange-400 border-b-2 border-orange-400 bg-slate-700'
              : 'text-slate-400 hover:text-slate-300 bg-slate-800'
          }`}
        >
          🦺 Cumplimiento EPP ({eppAlerts.length})
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase">
                  <input
                    type="checkbox"
                    checked={currentAlerts.length > 0 && currentAlerts.every(a => selectedAlerts.has(a.alertId))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAlerts(new Set(currentAlerts.map(a => a.alertId)));
                      } else {
                        setSelectedAlerts(new Set());
                      }
                    }}
                    className="w-4 h-4"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Fecha/Hora</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Cámara</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Ubicación</th>
                {activeTab === 'epp' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Zona</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase">Cumplimiento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">EPP Faltante</th>
                  </>
                )}
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase">Severidad</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {currentAlerts.map((alert) => {
                const eppDetails = alert.details;
                return (
                  <tr key={alert.alertId} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedAlerts.has(alert.alertId)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedAlerts);
                          if (e.target.checked) {
                            newSelected.add(alert.alertId);
                          } else {
                            newSelected.delete(alert.alertId);
                          }
                          setSelectedAlerts(newSelected);
                        }}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                      <div>{new Date(alert.timestamp).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-500">{new Date(alert.timestamp).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        activeTab === 'epp' ? 'bg-orange-900/50 text-orange-300' :
                        alert.tipo === 'no_autorizado' ? 'bg-red-900/50 text-red-300' :
                        alert.tipo === 'persona_no_registrada' ? 'bg-yellow-900/50 text-yellow-300' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {activeTab === 'epp' ? '🦺 EPP' :
                         alert.tipo === 'no_autorizado' ? '🔴 No Autorizado' :
                         alert.tipo === 'persona_no_registrada' ? '🟠 No Registrado' : 'Alerta'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{alert.cameraId}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{alert.ubicacionCamara}</td>
                    {activeTab === 'epp' && (
                      <>
                        <td className="px-4 py-3 text-sm text-slate-300">{alert.zoneName || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${
                            (eppDetails?.compliancePercentage || 0) >= 80 ? 'text-green-400' :
                            (eppDetails?.compliancePercentage || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {eppDetails?.compliancePercentage || 0}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {eppDetails?.missingEPP?.map((epp: string) => (
                              <span key={epp} className="text-xs">
                                {epp === 'helmet' ? '🪖' :
                                 epp === 'vest' ? '🦺' :
                                 epp === 'faceCover' ? '😷' :
                                 epp === 'handCover' ? '🧤' : epp}
                              </span>
                            ))}
                          </div>
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        alert.severity === 'high' ? 'bg-red-900/50 text-red-300' :
                        alert.severity === 'medium' ? 'bg-orange-900/50 text-orange-300' :
                        'bg-blue-900/50 text-blue-300'
                      }`}>
                        {alert.severity === 'high' ? 'Alta' :
                         alert.severity === 'medium' ? 'Media' : 'Baja'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {currentAlerts.length === 0 && (
        <div className="bg-slate-800 rounded-lg shadow-lg p-12 text-center border border-slate-700">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-slate-100 mb-2">
            No hay alertas de {activeTab === 'access' ? 'acceso' : 'EPP'}
          </h3>
          <p className="text-slate-400">El sistema está funcionando correctamente</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAlert(null)}>
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-bold text-slate-100 mb-2">
                  {selectedAlert.message || selectedAlert.descripcion}
                </h3>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedAlert.type === 'epp_violation' ? 'bg-orange-900/50 text-orange-300 border border-orange-700' :
                    selectedAlert.tipo === 'no_autorizado' ? 'bg-red-900/50 text-red-300 border border-red-700' :
                    selectedAlert.tipo === 'persona_no_registrada' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' :
                    'bg-slate-700 text-slate-300 border border-slate-600'
                  }`}>
                    {selectedAlert.type === 'epp_violation' ? '🦺 Incumplimiento EPP' :
                     selectedAlert.tipo === 'no_autorizado' ? '🔴 No Autorizado' :
                     selectedAlert.tipo === 'persona_no_registrada' ? '🟠 Persona No Registrada' :
                     '👁️ Alerta'}
                  </span>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    selectedAlert.severity === 'high' ? 'bg-red-900/50 text-red-300' :
                    selectedAlert.severity === 'medium' ? 'bg-orange-900/50 text-orange-300' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {selectedAlert.severity === 'high' ? '🔴 Alta' :
                     selectedAlert.severity === 'medium' ? '🟡 Media' : '🟢 Baja'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-slate-200 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              {/* Image */}
              {selectedAlert.imageUrl && (
                <div className="bg-slate-900 rounded-lg p-2 border border-slate-700 flex items-center justify-center" style={{ height: '200px' }}>
                  <img 
                    src={`https://ia-control-epp-captures.s3.us-east-1.amazonaws.com/${selectedAlert.imageUrl}`}
                    alt="Evidencia"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    className="rounded"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="150"%3E%3Crect fill="%23334155" width="300" height="150"/%3E%3Ctext fill="%2394a3b8" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="12"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              )}
              
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900 rounded p-2 border border-slate-700">
                  <div className="text-xs text-slate-500">📅 Fecha</div>
                  <div className="text-sm text-slate-100 font-medium">{new Date(selectedAlert.timestamp).toLocaleDateString()}</div>
                </div>
                <div className="bg-slate-900 rounded p-2 border border-slate-700">
                  <div className="text-xs text-slate-500">⏰ Hora</div>
                  <div className="text-sm text-slate-100 font-medium">{new Date(selectedAlert.timestamp).toLocaleTimeString()}</div>
                </div>
                <div className="bg-slate-900 rounded p-2 border border-slate-700">
                  <div className="text-xs text-slate-500">📹 Cámara</div>
                  <div className="text-sm text-slate-100 font-medium">{selectedAlert.cameraId}</div>
                </div>
                <div className="bg-slate-900 rounded p-2 border border-slate-700">
                  <div className="text-xs text-slate-500">📍 Ubicación</div>
                  <div className="text-sm text-slate-100 font-medium">{selectedAlert.ubicacionCamara}</div>
                </div>
              </div>
              
              {/* EPP Specific Details */}
              {selectedAlert.details && (
                <div className="bg-slate-900 rounded border border-slate-700">
                  <div className="bg-slate-800 px-3 py-2 border-b border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-100">🦺 Detalles de EPP</h4>
                  </div>
                  <div className="p-3 space-y-2">
                    {selectedAlert.zoneName && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">🏭 Zona</span>
                        <span className="text-sm text-slate-100 font-medium">{selectedAlert.zoneName}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">👥 Personas</span>
                      <span className="text-sm text-slate-100 font-medium">{selectedAlert.details.personsDetected || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">📊 Cumplimiento</span>
                      <span className={`font-semibold text-lg ${
                        (selectedAlert.details.compliancePercentage || 0) >= 80 ? 'text-green-400' :
                        (selectedAlert.details.compliancePercentage || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {selectedAlert.details.compliancePercentage || 0}%
                      </span>
                    </div>
                    {selectedAlert.details.missingEPP && selectedAlert.details.missingEPP.length > 0 && (
                      <div>
                        <div className="text-xs text-slate-400 mb-2">⚠️ EPP Faltante</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedAlert.details.missingEPP.map((epp: string) => (
                            <span key={epp} className="px-2 py-1 bg-red-900/50 text-red-300 rounded text-xs border border-red-700">
                              {epp === 'helmet' ? '🪖 Casco' :
                               epp === 'vest' ? '🦺 Chaleco' :
                               epp === 'faceCover' ? '😷 Protección Facial' :
                               epp === 'handCover' ? '🧤 Protección de Manos' : epp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Access Specific Details */}
              {selectedAlert.empleadoId && (
                <div className="bg-slate-900 rounded border border-slate-700">
                  <div className="bg-slate-800 px-3 py-2 border-b border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-100">👤 Detalles de Acceso</h4>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">ID Empleado</span>
                      <span className="text-sm text-slate-100 font-medium">{selectedAlert.empleadoId}</span>
                    </div>
                    {selectedAlert.nombreCompleto && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Nombre</span>
                        <span className="text-sm text-slate-100 font-medium">{selectedAlert.nombreCompleto}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertsPanel;
