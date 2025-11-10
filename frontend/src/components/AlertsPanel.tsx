import React, { useState, useEffect } from 'react';
import { getAlerts } from '../services/api';
import type { Alert } from '../services/api';
import { API_URL } from '../config';

interface AlertWithLocation extends Alert {
  ubicacionCamara?: string;
}

interface Camera {
  id: string;
  name?: string;
  location?: string;
  url?: string;
}

const AlertsPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertWithLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await getAlerts();
      const alertsList = data.alerts || [];
      
      // Obtener cámaras para ubicaciones
      const cameras: Camera[] = JSON.parse(localStorage.getItem('ia-control-cameras') || '[]');
      const cameraMap = new Map<string, Camera>(cameras.map((c) => [c.id, c]));
      
      // Agregar ubicación a cada alerta
      const alertsWithLocation = alertsList.map((alert: Alert) => {
        const camera = cameraMap.get(alert.cameraId);
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

  if (loading) {
    return <div className="text-center py-8">Cargando alertas...</div>;
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
        <h2 className="text-2xl font-bold text-slate-100">🚨 Alertas Activas</h2>
        <button
          onClick={exportToCSV}
          disabled={alerts.length === 0}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          📊 Exportar CSV
        </button>
      </div>

      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-700">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Fecha/Hora</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Descripción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Cámara</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Ubicación</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-slate-800 divide-y divide-slate-700">
            {alerts.map((alert) => (
              <tr key={alert.alertId} className="hover:bg-slate-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {new Date(alert.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    alert.tipo === 'no_autorizado' ? 'bg-red-100 text-red-800' :
                    alert.tipo === 'persona_no_registrada' ? 'bg-orange-100 text-orange-800' :
                    alert.tipo === 'objeto_restringido' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {alert.tipo === 'no_autorizado' ? '🔴 No Autorizado' :
                     alert.tipo === 'persona_no_registrada' ? '🟠 Persona No Registrada' :
                     alert.tipo === 'objeto_restringido' ? '📦 Objeto Restringido' :
                     '👁️ Sospechoso'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-300">
                  {alert.descripcion}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                  {alert.cameraId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                  📍 {alert.ubicacionCamara}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    alert.resuelta ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {alert.resuelta ? '✅ Resuelta' : '🔴 Activa'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {alerts.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            ✅ No hay alertas activas
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;
