import React, { useState, useEffect } from 'react';
import { getEmployees, registerEmployee, getUploadUrl } from '../services/api';
import type { Employee } from '../services/api';
import { API_URL } from '../config';

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    empleadoId: '',
    nombre: '',
    apellido: '',
    departamento: '',
    imageFiles: [] as File[],
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(emp => 
      emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.empleadoId.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  const loadEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data.employees || []);
      setFilteredEmployees(data.employees || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditMode(true);
    setFormData({
      empleadoId: emp.empleadoId,
      nombre: emp.nombre,
      apellido: emp.apellido,
      departamento: emp.departamento,
      imageFiles: [],
    });
    setShowModal(true);
  };

  const handleDelete = async (empleadoId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este empleado?')) return;
    
    try {
      await fetch(`${API_URL}/employees/${empleadoId}`, {
        method: 'DELETE',
      });
      alert('Empleado eliminado exitosamente');
      loadEmployees();
    } catch (error: any) {
      alert('Error al eliminar empleado: ' + error.message);
    }
  };

  const exportToCSV = () => {
    if (filteredEmployees.length === 0) {
      alert('No hay empleados para exportar');
      return;
    }

    const headers = ['ID', 'Nombre', 'Apellido', 'Departamento', 'Estado', 'Fecha Alta'];
    const rows = filteredEmployees.map(emp => [
      emp.empleadoId,
      emp.nombre,
      emp.apellido,
      emp.departamento,
      emp.activo ? 'Activo' : 'Inactivo',
      new Date(emp.fechaAlta).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `empleados-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editMode && formData.imageFiles.length === 0) {
      alert('Por favor selecciona al menos una foto');
      return;
    }

    setUploading(true);
    try {
      if (editMode) {
        // Modo edición
        await fetch(`${API_URL}/employees/${formData.empleadoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formData.nombre,
            apellido: formData.apellido,
            departamento: formData.departamento,
          }),
        });
        alert('Empleado actualizado exitosamente');
      } else {
        // Modo registro
        const uploadedKeys = [];
        for (let i = 0; i < formData.imageFiles.length; i++) {
          const file = formData.imageFiles[i];
          const filename = `${formData.empleadoId}_${i + 1}.jpg`;
          
          const uploadData = await getUploadUrl(filename, file.type);
          
          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadData.presignedUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.onload = () => xhr.status === 200 ? resolve(xhr) : reject(new Error(`Upload failed: ${xhr.status}`));
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(file);
          });
          
          uploadedKeys.push(uploadData.key);
        }
        
        await registerEmployee({
          empleadoId: formData.empleadoId,
          nombre: formData.nombre,
          apellido: formData.apellido,
          departamento: formData.departamento,
          imageKey: uploadedKeys[0],
          imageKeys: uploadedKeys,
        });

        alert(`Empleado registrado exitosamente con ${formData.imageFiles.length} foto(s)`);
      }
      
      setShowModal(false);
      setEditMode(false);
      setFormData({ empleadoId: '', nombre: '', apellido: '', departamento: '', imageFiles: [] });
      loadEmployees();
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando empleados...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">👥 Gestión de Empleados</h2>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            disabled={filteredEmployees.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            📊 Exportar CSV
          </button>
          <button
            onClick={() => { setEditMode(false); setShowModal(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Agregar Empleado
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, apellido o ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Alta</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEmployees.map((emp) => (
              <tr key={emp.empleadoId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.empleadoId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.nombre} {emp.apellido}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.departamento}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${emp.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {emp.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(emp.fechaAlta).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => handleEdit(emp)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(emp.empleadoId)}
                    className="text-red-600 hover:text-red-800"
                  >
                    🗑️ Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">{editMode ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID Empleado</label>
                <input
                  type="text"
                  required
                  disabled={editMode}
                  value={formData.empleadoId}
                  onChange={(e) => setFormData({ ...formData, empleadoId: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
                  placeholder="EMP001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Apellido</label>
                <input
                  type="text"
                  required
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Departamento</label>
                <input
                  type="text"
                  required
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              {!editMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fotos (múltiples ángulos recomendado)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    required
                    onChange={(e) => setFormData({ ...formData, imageFiles: Array.from(e.target.files || []) })}
                    className="mt-1 block w-full"
                  />
                  {formData.imageFiles.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{formData.imageFiles.length} foto(s) seleccionada(s)</p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? (editMode ? 'Actualizando...' : 'Registrando...') : (editMode ? 'Actualizar' : 'Registrar')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditMode(false); }}
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

export default EmployeeManagement;
