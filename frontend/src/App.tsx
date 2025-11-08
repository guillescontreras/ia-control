import React, { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { awsConfig } from './aws-config';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EmployeeManagement from './components/EmployeeManagement';
import AccessLog from './components/AccessLog';
import AlertsPanel from './components/AlertsPanel';
import VideoProcessor from './components/VideoProcessor';
import LiveCamera from './components/LiveCamera';
import MultiCameraMonitor from './components/MultiCameraMonitor';
import UserManagement from './components/UserManagement';
import PresencePanel from './components/PresencePanel';
import CameraSettings from './components/CameraSettings';
import { Toaster } from 'react-hot-toast';
import './App.css';

Amplify.configure(awsConfig);

type Section = 'dashboard' | 'employees' | 'logs' | 'alerts' | 'multicam' | 'users' | 'presence' | 'cameras';

function App() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const groups = session.tokens?.accessToken?.payload['cognito:groups'] as string[] || [];
      
      setUser(currentUser);
      setUserGroups(groups);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setUser(null);
      setUserGroups([]);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const isAdmin = userGroups.includes('ia-control-admins');
  const hasAccess = userGroups.includes('ia-control-admins') || userGroups.includes('ia-control-operators');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return <Login onLoginSuccess={checkUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            🏢 CoironTech - Control de Accesos
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.username} {isAdmin ? '(🔑 Admin)' : '(👁️ Operador)'}
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`py-4 px-3 border-b-2 font-medium text-sm ${
                activeSection === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveSection('presence')}
              className={`py-4 px-3 border-b-2 font-medium text-sm ${
                activeSection === 'presence'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 Presencia
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveSection('employees')}
                  className={`py-4 px-3 border-b-2 font-medium text-sm ${
                    activeSection === 'employees'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  👥 Empleados
                </button>
                <button
                  onClick={() => setActiveSection('users')}
                  className={`py-4 px-3 border-b-2 font-medium text-sm ${
                    activeSection === 'users'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🔐 Usuarios
                </button>
              </>
            )}
            <button
              onClick={() => setActiveSection('logs')}
              className={`py-4 px-3 border-b-2 font-medium text-sm ${
                activeSection === 'logs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Logs
            </button>
            <button
              onClick={() => setActiveSection('alerts')}
              className={`py-4 px-3 border-b-2 font-medium text-sm ${
                activeSection === 'alerts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🚨 Alertas
            </button>
            <button
              onClick={() => setActiveSection('multicam')}
              className={`py-4 px-3 border-b-2 font-medium text-sm ${
                activeSection === 'multicam'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🎬 Multi-Cámara
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveSection('cameras')}
                className={`py-4 px-3 border-b-2 font-medium text-sm ${
                  activeSection === 'cameras'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⚙️ Cámaras
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'dashboard' && <Dashboard />}
        {activeSection === 'presence' && <PresencePanel />}
        {activeSection === 'employees' && <EmployeeManagement />}
        {activeSection === 'users' && <UserManagement />}
        {activeSection === 'logs' && <AccessLog />}
        {activeSection === 'alerts' && <AlertsPanel />}
        {activeSection === 'multicam' && <MultiCameraMonitor />}
        {activeSection === 'cameras' && <CameraSettings />}
      </main>

      {/* Footer */}
      <footer className="bg-white shadow mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          © 2025 CoironTech - Sistema de Control de Accesos v1.0.0
        </div>
      </footer>
    </div>
  );
}

export default App;
