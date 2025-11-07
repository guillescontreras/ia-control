import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

interface Employee {
  empleadoId: string;
  nombre: string;
  ingresoTimestamp: number;
  egresoTimestamp?: number;
  horasTrabajadas?: string;
  presente: boolean;
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
      const response = await fetch(`${API_URL}/logs?limit=1000`);
      const data = await response.json();
      
      // Procesar logs para calcular presencia
      const employeeMap = new Map<string, Employee>();
      
      data.logs?.forEach((log: any) => {
        if (!log.empleadoId) return;
        
        const existing = employeeMap.get(log.empleadoId);
        
        if (!existing) {
          employeeMap.set(log.empleadoId, {
            empleadoId: log.empleadoId,
            nombre: log.empleadoId,
            ingresoTimestamp: log.tipo === 'ingreso' ? log.timestamp : 0,
            egresoTimestamp: log.tipo === 'egreso' ? log.timestamp : undefined,
            presente: log.tipo === 'ingreso'
          });
        } else {
          if (log.tipo === 'ingreso' && log.timestamp > (existing.ingresoTimestamp || 0)) {
            existing.ingresoTimestamp = log.timestamp;
            existing.presente = true;
            existing.egresoTimestamp = undefined;
          } else if (log.tipo === 'egreso' && log.timestamp > (existing.egresoTimestamp || 0)) {
            existing.egresoTimestamp = log.timestamp;
            if (log.timestamp > (existing.ingresoTimestamp || 0)) {
              existing.presente = false;
            }
          }
        }
      });
      
      // Calcular horas trabajadas
      const employeeList = Array.from(employeeMap.values()).map(emp => {
        if (emp.presente && emp.ingresoTimestamp) {
          const diff = Date.now() - emp.ingresoTimestamp;
          const horas = Math.floor(diff / 3600000);
          const minutos = Math.floor((diff % 3600000) / 60000);
          emp.horasTrabajadas = `${horas}h ${minutos}m`;
        } else if (emp.ingresoTimestamp && emp.egresoTimestamp) {
          const diff = emp.egresoTimestamp - emp.ingresoTimestamp;
          const horas = Math.floor(diff / 3600000);
          const minutos = Math.floor((diff % 3600000) / 60000);
          emp.horasTrabajadas = `${horas}h ${minutos}m`;
        }
        return emp;
      });
      
      setEmployees(employeeList);
      setLoading(false);
    } catch (error) {
      console.error('Error loading presence:', error);
      setLoading(false);
    }
  };

  const presentes = employees.filter(e => e.presente);
  const ausentes = employees.filter(e => !e.presente);

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600">{employees.length}</div>
          <div className="text-sm text-gray-600">Total Empleados</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-green-600">{presentes.length}</div>
          <div className="text-sm text-gray-600">Presentes</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-red-600">{ausentes.length}</div>
          <div className="text-sm text-gray-600">Ausentes</div>
        </div>
      </div>

      {/* Empleados Presentes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">🟢 Empleados Presentes ({presentes.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {presentes.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">
              No hay empleados presentes
            </div>
          ) : (
            presentes.map((emp) => (
              <div key={emp.empleadoId} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="font-medium">{emp.nombre}</div>
                    <div className="text-xs text-gray-500">
                      Ingreso: {new Date(emp.ingresoTimestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-700">
                  {emp.horasTrabajadas || '-'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Empleados Ausentes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">🔴 Ausentes ({ausentes.length})</h3>
        </div>
        <div className="px-6 py-4">
          {ausentes.length === 0 ? (
            <div className="text-center text-gray-400 py-4">
              Todos los empleados están presentes
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ausentes.map((emp) => (
                <span
                  key={emp.empleadoId}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {emp.nombre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresencePanel;
