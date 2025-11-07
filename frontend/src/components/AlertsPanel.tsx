import React, { useState, useEffect } from 'react';
import { getAlerts } from '../services/api';
import type { Alert } from '../services/api';

const AlertsPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await getAlerts();
      setAlerts(data.alerts || []);
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

    const headers = ['Fecha', 'Hora', 'Tipo', 'Cámara', 'Descripción', 'Estado'];
    const rows = alerts.map(alert => [
      new Date(alert.timestamp).toLocaleDateString(),
      new Date(alert.timestamp).toLocaleTimeString(),
      alert.tipo,
      alert.cameraId,
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
        <h2 className="text-2xl font-bold text-gray-900">🚨 Alertas Activas</h2>
        <button
          onClick={exportToCSV}
          disabled={alerts.length === 0}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📊 Exportar CSV
        </button>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.alertId}
            className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">
                  {alert.tipo === 'no_autorizado' ? '⚠️' : 
                   alert.tipo === 'objeto_restringido' ? '📦' : '👁️'}
                </span>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  {alert.tipo === 'no_autorizado' ? 'Persona No Autorizada' :
                   alert.tipo === 'objeto_restringido' ? 'Objeto Restringido' :
                   'Conducta Sospechosa'}
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{alert.descripcion}</p>
                  <p className="mt-1 text-xs">
                    📍 {alert.cameraId} • 🕐 {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-green-50 rounded-lg">
            ✅ No hay alertas activas
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;
