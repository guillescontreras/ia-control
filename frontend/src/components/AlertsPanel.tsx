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

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 10000); // Cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await fetch(`${API_URL}/alerts?resuelta=false`);
      const data = await response.json();
      const alertsList = data.alerts || [];
      
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
        <button
          onClick={exportToCSV}
          disabled={alerts.length === 0}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          📊 Exportar CSV
        </button>
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
          <div className="bg-slate-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-700" onClick={(e) => e.stopPropagation()}>
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
            
            <div className="p-6 space-y-4">
              {/* Image */}
              {selectedAlert.imageUrl && (
                <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 flex justify-center items-center" style={{ minHeight: '200px', maxHeight: '400px' }}>
                  <img 
                    src={`https://ia-control-epp-captures.s3.us-east-1.amazonaws.com/${selectedAlert.imageUrl}`}
                    alt="Evidencia"
                    className="max-w-full max-h-96 object-contain rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.maxHeight = '150px';
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="150"%3E%3Crect fill="%23334155" width="400" height="150"/%3E%3Ctext fill="%2394a3b8" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="14"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              )}
              
              {/* Details Table */}
              <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full">
                  <tbody className="divide-y divide-slate-700">
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-slate-400 w-1/3">📅 Fecha</td>
                      <td className="px-4 py-3 text-sm text-slate-100">{new Date(selectedAlert.timestamp).toLocaleDateString()}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-slate-400">⏰ Hora</td>
                      <td className="px-4 py-3 text-sm text-slate-100">{new Date(selectedAlert.timestamp).toLocaleTimeString()}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-slate-400">📹 Cámara</td>
                      <td className="px-4 py-3 text-sm text-slate-100">{selectedAlert.cameraId}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-slate-400">📍 Ubicación</td>
                      <td className="px-4 py-3 text-sm text-slate-100">{selectedAlert.ubicacionCamara}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* EPP Specific Details */}
              {selectedAlert.details && (
                <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                  <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-100">🦺 Detalles de EPP</h4>
                  </div>
                  <table className="w-full">
                    <tbody className="divide-y divide-slate-700">
                      {selectedAlert.zoneName && (
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-slate-400 w-1/3">🏭 Zona</td>
                          <td className="px-4 py-3 text-sm text-slate-100">{selectedAlert.zoneName}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-slate-400">👥 Personas Detectadas</td>
                        <td className="px-4 py-3 text-sm text-slate-100">{selectedAlert.details.personsDetected || 0}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-slate-400">📊 Cumplimiento</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold text-lg ${
                            (selectedAlert.details.compliancePercentage || 0) >= 80 ? 'text-green-400' :
                            (selectedAlert.details.compliancePercentage || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {selectedAlert.details.compliancePercentage || 0}%
                          </span>
                        </td>
                      </tr>
                      {selectedAlert.details.missingEPP && selectedAlert.details.missingEPP.length > 0 && (
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-slate-400">⚠️ EPP Faltante</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {selectedAlert.details.missingEPP.map((epp: string) => (
                                <span key={epp} className="px-3 py-1 bg-red-900/50 text-red-300 rounded text-sm border border-red-700">
                                  {epp === 'helmet' ? '🪖 Casco' :
                                   epp === 'vest' ? '🦺 Chaleco' :
                                   epp === 'faceCover' ? '😷 Protección Facial' :
                                   epp === 'handCover' ? '🧤 Protección de Manos' : epp}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Access Specific Details */}
              {selectedAlert.empleadoId && (
                <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                  <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-100">👤 Detalles de Acceso</h4>
                  </div>
                  <table className="w-full">
                    <tbody className="divide-y divide-slate-700">
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-slate-400 w-1/3">ID Empleado</td>
                        <td className="px-4 py-3 text-sm text-slate-100">{selectedAlert.empleadoId}</td>
                      </tr>
                      {selectedAlert.nombreCompleto && (
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-slate-400">Nombre</td>
                          <td className="px-4 py-3 text-sm text-slate-100">{selectedAlert.nombreCompleto}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
