import React, { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { awsConfig } from './aws-config';
import { API_URL } from './config';
import Login from './components/Login';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './components/Dashboard';
import EmployeeManagement from './components/EmployeeManagement';
import AccessLog from './components/AccessLog';
import AlertsPanel from './components/AlertsPanel';
import MultiCameraMonitor from './components/MultiCameraMonitor';
import UserManagement from './components/UserManagement';
import PresencePanel from './components/PresencePanel';
import CameraSettings from './components/CameraSettings';
import EPPZoneManager from './components/EPPZoneManager';
import { Toaster } from 'react-hot-toast';
import './App.css';

Amplify.configure(awsConfig);

type Section = 'dashboard' | 'presence' | 'logs' | 'alerts' | 'multicam' | 'admin-employees' | 'admin-users' | 'admin-cameras' | 'admin-epp-zones';

function App() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState<any[]>([]);

  useEffect(() => {
    checkUser();
    loadCameras();
  }, []);

  useEffect(() => {
    if (activeSection === 'admin-epp-zones') {
      loadCameras();
    }
  }, [activeSection]);

  const loadCameras = () => {
    const saved = localStorage.getItem('ia-control-cameras');
    if (saved) {
      const allCameras = JSON.parse(saved);
      console.log('📹 Cámaras cargadas:', allCameras.length);
      setCameras(allCameras);
    } else {
      console.log('⚠️ No hay cámaras en localStorage');
    }
  };

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const groups = session.tokens?.accessToken?.payload['cognito:groups'] as string[] || [];
      
      console.log('Usuario:', currentUser.username);
      console.log('Grupos recibidos:', groups);
      console.log('Es admin?', groups.includes('ia-control-admins'));
      
      setUser(currentUser);
      setUserGroups(groups);
      
      // Obtener perfil del usuario desde UserProfiles
      try {
        // Obtener email del usuario desde atributos de Cognito
        const emailAttr = session.tokens?.idToken?.payload?.email as string;
        console.log('📧 Email del usuario:', emailAttr);
        
        if (emailAttr) {
          const response = await fetch(`${API_URL}/users/${encodeURIComponent(emailAttr)}`);
          if (response.ok) {
            const profile = await response.json();
            console.log('🔍 Perfil obtenido:', profile);
            setUserProfile(profile);
          } else {
            console.log('❌ No se pudo obtener perfil, status:', response.status);
          }
        } else {
          console.log('❌ No se encontró email en token');
        }
      } catch (error) {
        console.error('❌ Error al obtener perfil:', error);
      }
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
      setUserProfile(null);
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
    <>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #334155',
        },
      }} />
      <MainLayout
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        userProfile={userProfile}
        user={user}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        onProfileUpdate={checkUser}
      >
        {activeSection === 'dashboard' && <Dashboard />}
        {activeSection === 'presence' && <PresencePanel />}
        {activeSection === 'admin-employees' && <EmployeeManagement />}
        {activeSection === 'admin-users' && <UserManagement />}
        {activeSection === 'admin-cameras' && <CameraSettings />}
        {activeSection === 'admin-epp-zones' && <EPPZoneManager cameras={cameras} onCameraUpdate={(updatedCameras) => {
          setCameras(updatedCameras);
          localStorage.setItem('ia-control-cameras', JSON.stringify(updatedCameras));
        }} />}
        {activeSection === 'logs' && <AccessLog />}
        {activeSection === 'alerts' && <AlertsPanel />}
        {activeSection === 'multicam' && <MultiCameraMonitor />}
      </MainLayout>
    </>
  );
}

export default App;
