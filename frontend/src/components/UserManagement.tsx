import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { API_URL } from '../config';

interface User {
  username: string;
  email: string;
  name: string;
  status: string;
  enabled: boolean;
  createdAt: string;
  role?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'operator',
    password: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const response = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (editingUser) {
        // Actualizar usuario
        const response = await fetch(`${API_URL}/users/${encodeURIComponent(editingUser.email)}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          alert('Usuario actualizado exitosamente.');
          setShowForm(false);
          setEditingUser(null);
          setFormData({ email: '', firstName: '', lastName: '', role: 'operator', password: '' });
          loadUsers();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error}`);
        }
      } else {
        // Crear usuario
        const response = await fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          alert('Usuario creado exitosamente. Se envió un email con la contraseña temporal.');
          setShowForm(false);
          setFormData({ email: '', firstName: '', lastName: '', role: 'operator', password: '' });
          loadUsers();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error}`);
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error al guardar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!window.confirm(`¿Eliminar usuario ${email}?`)) return;

    try {
      setLoading(true);
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const response = await fetch(`${API_URL}/users/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Usuario eliminado exitosamente');
        loadUsers();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-100">Gestión de Usuarios</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Crear Usuario'}
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
          <h3 className="text-xl font-semibold mb-4 text-slate-100">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Email</label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 disabled:bg-slate-900 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
                >
                  <option value="operator">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Apellido</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
                />
              </div>
            </div>
            {editingUser && (
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Nueva Contraseña (opcional)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
                  placeholder="Dejar vacío para no cambiar"
                />
                <p className="text-xs text-slate-500 mt-1">Mínimo 8 caracteres, debe incluir mayúsculas, minúsculas y números</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : (editingUser ? 'Actualizar Usuario' : 'Crear Usuario')}
            </button>
          </form>
        </div>
      )}

      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-700">
        <table className="min-w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Creado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {users.map((user) => (
              <tr key={user.username} className="hover:bg-slate-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded ${
                    user.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={async () => {
                      setEditingUser(user);
                      
                      // Obtener datos completos del usuario incluyendo rol
                      try {
                        const session = await fetchAuthSession();
                        const token = session.tokens?.idToken?.toString();
                        const response = await fetch(`${API_URL}/users/${encodeURIComponent(user.email)}`, {
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (response.ok) {
                          const userData = await response.json();
                          setFormData({
                            email: userData.email,
                            firstName: userData.firstName || '',
                            lastName: userData.lastName || '',
                            role: userData.role || 'operator',
                            password: ''
                          });
                        } else {
                          // Fallback si falla
                          const names = user.name?.split(' ') || ['', ''];
                          setFormData({
                            email: user.email,
                            firstName: names[0] || '',
                            lastName: names.slice(1).join(' ') || '',
                            role: 'operator',
                            password: ''
                          });
                        }
                      } catch (error) {
                        console.error('Error obteniendo datos del usuario:', error);
                        const names = user.name?.split(' ') || ['', ''];
                        setFormData({
                          email: user.email,
                          firstName: names[0] || '',
                          lastName: names.slice(1).join(' ') || '',
                          role: 'operator',
                          password: ''
                        });
                      }
                      
                      setShowForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(user.email)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
