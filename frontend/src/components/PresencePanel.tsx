import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

interface Employee {
  empleadoId: string;
  nombre: string;
  apellido: string;
  presente: boolean;
  ultimaCamara?: string;
  ubicacionCamara?: string;
  ultimoAcceso?: number;
}

interface Camera {
  id: string;
  name?: string;
  location?: string;
  url?: string;
}

const PresencePanel: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPresence();
    const interval = setInterval(loadPresence, 30000); // Actualizar cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadPresence = async () => {
    try {
      // Obtener todos los empleados
      const empResponse = await fetch(`${API_URL}/employees`);
      const empData = await empResponse.json();
      const allEmployees = empData.employees || [];
      
      // Obtener logs recientes
      const logsResponse = await fetch(`${API_URL}/logs?limit=1000`);
      const logsData = await logsResponse.json();
      const logs = logsData.logs || [];
      
      // Obtener cámaras para ubicaciones
      const cameras: Camera[] = JSON.parse(localStorage.getItem('ia-control-cameras') || '[]');
      const cameraMap = new Map<string, Camera>(cameras.map((c) => [c.id, c]));
      
      // Procesar presencia por empleado
      const employeeMap = new Map<string, any>();
      
      // Inicializar todos los empleados como ausentes
      allEmployees.forEach((emp: any) => {
        employeeMap.set(emp.empleadoId, {
          empleadoId: emp.empleadoId,
          nombre: emp.nombre,
          apellido: emp.apellido,
          presente: false,
          ultimaCamara: '-',
          ubicacionCamara: '-',
          ultimoAcceso: 0
        });
      });
      
      // Procesar logs para determinar presencia
      logs.forEach((log: any) => {
        if (!log.empleadoId) return;
        
        const emp = employeeMap.get(log.empleadoId);
        if (!emp) return;
        
        if (log.timestamp > emp.ultimoAcceso) {
          emp.ultimoAcceso = log.timestamp;
          emp.ultimaCamara = log.cameraId;
          const camera = cameraMap.get(log.cameraId);
          emp.ubicacionCamara = camera?.location || camera?.name || log.cameraId;
          emp.presente = log.tipo === 'ingreso';
        }
      });
      
      setEmployees(Array.from(employeeMap.values()));
      setLoading(false);
    } catch (error) {
      console.error('Error loading presence:', error);
      setLoading(false);
    }
  };

  const presentes = employees.filter(e => e.presente).length;
  const ausentes = employees.filter(e => !e.presente).length;

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
          <div className="text-3xl font-bold text-blue-400">{employees.length}</div>
          <div className="text-sm text-slate-400">Total Empleados</div>
        </div>
        <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
          <div className="text-3xl font-bold text-green-400">{presentes}</div>
          <div className="text-sm text-slate-400">Presentes</div>
        </div>
        <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
          <div className="text-3xl font-bold text-red-400">{ausentes}</div>
          <div className="text-sm text-slate-400">Ausentes</div>
        </div>
      </div>

      {/* Tabla de Presencia */}
      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100">👥 Estado de Presencia</h3>
        </div>
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Empleado</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Última Cámara</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Ubicación</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Último Acceso</th>
            </tr>
          </thead>
          <tbody className="bg-slate-800 divide-y divide-slate-700">
            {employees.map((emp) => (
              <tr key={emp.empleadoId} className="hover:bg-slate-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">
                  {emp.nombre} {emp.apellido}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    emp.presente 
                      ? 'bg-green-100 text-green-800 border border-green-300' 
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {emp.presente ? '🟢 Presente' : '🔴 Ausente'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                  {emp.ultimaCamara || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  📍 {emp.ubicacionCamara || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                  {emp.ultimoAcceso ? (
                    <>
                      <div className="text-slate-300">{new Date(emp.ultimoAcceso).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-500">{new Date(emp.ultimoAcceso).toLocaleTimeString()}</div>
                    </>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {employees.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No hay empleados registrados
          </div>
        )}
      </div>
    </div>
  );
};

export default PresencePanel;
