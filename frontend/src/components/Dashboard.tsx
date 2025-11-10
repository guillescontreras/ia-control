import React, { useState, useEffect } from 'react';
import { getStats, getLogs, getAlerts, getEmployees } from '../services/api';
import type { Stats } from '../services/api';
import jsPDF from 'jspdf';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ ingresos: 0, egresos: 0, presentes: 0, alertas: 0 });
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const data = await getStats();
      setStats(data);
      
      const logsData = await getLogs(50);
      setLogs(logsData.logs || []);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDFReport = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Título
      doc.setFontSize(20);
      doc.text('Reporte de Control de Accesos', pageWidth / 2, 20, { align: 'center' });
      
      // Fecha
      doc.setFontSize(10);
      doc.text(`Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, 30, { align: 'center' });
      
      // Estadísticas
      doc.setFontSize(14);
      doc.text('Resumen del Día', 20, 45);
      
      doc.setFontSize(11);
      doc.text(`Ingresos: ${stats.ingresos}`, 20, 55);
      doc.text(`Egresos: ${stats.egresos}`, 20, 62);
      doc.text(`Presentes: ${stats.presentes}`, 20, 69);
      doc.text(`Alertas Activas: ${stats.alertas}`, 20, 76);
      
      // Obtener datos adicionales
      const logsData = await getLogs(10);
      const alertsData = await getAlerts();
      const employeesData = await getEmployees();
      
      // Últimos accesos
      doc.setFontSize(14);
      doc.text('Últimos 10 Accesos', 20, 90);
      
      doc.setFontSize(9);
      let yPos = 100;
      logsData.logs?.slice(0, 10).forEach((log: any, idx: number) => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        const text = `${idx + 1}. ${time} - ${log.empleadoId} (${log.tipo})`;
        doc.text(text, 20, yPos);
        yPos += 6;
      });
      
      // Alertas
      if (alertsData.alerts?.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Alertas Activas', 20, 20);
        
        doc.setFontSize(9);
        yPos = 30;
        alertsData.alerts.slice(0, 15).forEach((alert: any, idx: number) => {
          const time = new Date(alert.timestamp).toLocaleTimeString();
          const text = `${idx + 1}. ${time} - ${alert.tipo} (${alert.cameraId})`;
          doc.text(text, 20, yPos);
          yPos += 6;
        });
      }
      
      // Empleados
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Empleados Registrados', 20, 20);
      
      doc.setFontSize(9);
      doc.text(`Total: ${employeesData.employees?.length || 0}`, 20, 30);
      
      // Guardar
      doc.save(`reporte-accesos-${new Date().toISOString().split('T')[0]}.pdf`);
      alert('Reporte PDF generado exitosamente');
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el reporte PDF');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando estadísticas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-100">📊 Resumen de Hoy</h2>
        <button
          onClick={generatePDFReport}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
        >
          📄 Generar Reporte PDF
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white shadow-lg border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold">{stats.ingresos}</p>
              <p className="text-sm opacity-90 mt-1">Ingresos</p>
            </div>
            <div className="text-4xl opacity-50">📊</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 text-white shadow-lg border border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold">{stats.egresos}</p>
              <p className="text-sm opacity-90 mt-1">Egresos</p>
            </div>
            <div className="text-4xl opacity-50">📊</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 text-white shadow-lg border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold">{stats.presentes}</p>
              <p className="text-sm opacity-90 mt-1">Presentes</p>
            </div>
            <div className="text-4xl opacity-50">👥</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-xl p-6 text-white shadow-lg border border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold">{stats.alertas}</p>
              <p className="text-sm opacity-90 mt-1">Alertas</p>
            </div>
            <div className="text-4xl opacity-50">🚨</div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de Ingresos vs Egresos */}
        <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-slate-100">📈 Actividad del Día</h3>
          <Bar
            data={{
              labels: ['Ingresos', 'Egresos', 'Presentes'],
              datasets: [{
                label: 'Cantidad',
                data: [stats.ingresos, stats.egresos, stats.presentes],
                backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6'],
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false }
              },
              scales: {
                x: { ticks: { color: '#cbd5e1' }, grid: { color: '#334155' } },
                y: { ticks: { color: '#cbd5e1' }, grid: { color: '#334155' } }
              }
            }}
          />
        </div>

        {/* Gráfico de Tipos de Acceso */}
        <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-slate-100">🥧 Distribución de Accesos</h3>
          <Doughnut
            data={{
              labels: ['Ingresos', 'Egresos'],
              datasets: [{
                data: [stats.ingresos, stats.egresos],
                backgroundColor: ['#3b82f6', '#10b981'],
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { 
                  position: 'bottom',
                  labels: { color: '#cbd5e1' }
                }
              }
            }}
          />
        </div>

        {/* Gráfico de Actividad por Hora */}
        <div className="bg-slate-800 rounded-lg shadow-lg p-6 md:col-span-2 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-slate-100">⏰ Actividad por Hora</h3>
          <Line
            data={{
              labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
              datasets: [{
                label: 'Accesos',
                data: Array.from({ length: 24 }, (_, hour) => {
                  return logs.filter(log => new Date(log.timestamp).getHours() === hour).length;
                }),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false }
              },
              scales: {
                x: { ticks: { color: '#cbd5e1' }, grid: { color: '#334155' } },
                y: {
                  beginAtZero: true,
                  ticks: { stepSize: 1, color: '#cbd5e1' },
                  grid: { color: '#334155' }
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
