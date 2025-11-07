import React, { useState, useEffect } from 'react';
import { getLogs } from '../services/api';
import type { AccessLog as AccessLogType } from '../services/api';

const AccessLog: React.FC = () => {
  const [logs, setLogs] = useState<AccessLogType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      const data = await getLogs(50);
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando logs...</div>;
  }

  const exportToCSV = () => {
    if (logs.length === 0) {
      alert('No hay logs para exportar');
      return;
    }

    const headers = ['Fecha', 'Hora', 'Empleado ID', 'Tipo', 'Cámara', 'Confianza', 'Objetos'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleDateString(),
      new Date(log.timestamp).toLocaleTimeString(),
      log.empleadoId,
      log.tipo,
      log.cameraId,
      `${log.confianza}%`,
      log.objetos?.join('; ') || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs-accesos-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">📋 Registro de Accesos</h2>
        <button
          onClick={exportToCSV}
          disabled={logs.length === 0}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📊 Exportar CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cámara</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confianza</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Objetos</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log, idx) => (
              <tr key={`${log.timestamp}-${idx}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {log.empleadoId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    log.tipo === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {log.tipo === 'ingreso' ? '📥 Ingreso' : '📤 Egreso'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.cameraId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.confianza}%
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {log.objetos?.slice(0, 3).join(', ') || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {logs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay registros de accesos
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessLog;
