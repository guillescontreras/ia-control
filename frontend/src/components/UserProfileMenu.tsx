import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { fetchAuthSession } from 'aws-amplify/auth';
import { API_URL } from '../config';

interface UserProfileMenuProps {
  userProfile: any;
  user: any;
  isAdmin: boolean;
  onLogout: () => void;
  onProfileUpdate: () => void;
}

const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ 
  userProfile, 
  user, 
  isAdmin, 
  onLogout,
  onProfileUpdate 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  React.useEffect(() => {
    const getEmail = async () => {
      try {
        const session = await fetchAuthSession();
        const email = session.tokens?.idToken?.payload?.email as string;
        setUserEmail(email || '');
      } catch (error) {
        console.error('Error obteniendo email:', error);
      }
    };
    getEmail();
  }, []);
  
  const [profileData, setProfileData] = useState({
    firstName: userProfile?.firstName || '',
    lastName: userProfile?.lastName || ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileUpdate = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      const email = session.tokens?.idToken?.payload?.email as string;

      const response = await fetch(`${API_URL}/users/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        toast.success('✅ Perfil actualizado correctamente');
        setShowProfileModal(false);
        onProfileUpdate();
      } else {
        toast.error('❌ Error al actualizar perfil');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('❌ Error al actualizar perfil');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('❌ Las contraseñas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('❌ La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      const email = session.tokens?.idToken?.payload?.email as string;

      const response = await fetch(`${API_URL}/users/${encodeURIComponent(email)}/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        toast.success('✅ Contraseña actualizada correctamente');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await response.json();
        toast.error(`❌ ${data.error || 'Error al cambiar contraseña'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('❌ Error al cambiar contraseña');
    }
  };

  return (
    <>
      <div className="relative">
        {/* User Info - Clickeable */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{ backgroundColor: 'transparent' }}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="text-right">
            <p className="text-sm font-medium text-slate-200">
              {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : user?.username}
            </p>
            <p className="text-xs text-slate-400">
              {isAdmin ? '🔑 Administrador' : '👁️ Operador'}
            </p>
          </div>
          
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
            {userProfile ? userProfile.firstName.charAt(0) : 'U'}
          </div>
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <>
            <div 
              className="fixed inset-0"
              style={{ backgroundColor: 'transparent', zIndex: 10 }}
              onClick={() => setShowMenu(false)}
            />
            <div 
              className="absolute right-0 top-full mt-2 w-56 rounded-lg shadow-2xl py-2"
              style={{ backgroundColor: '#1e293b', border: '1px solid #334155', zIndex: 20 }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileModal(true);
                  setShowMenu(false);
                }}
                style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                className="w-full px-4 py-2 text-left text-slate-200 transition-colors flex items-center gap-2"
              >
                <span>👤</span>
                <span>Mi Perfil</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPasswordModal(true);
                  setShowMenu(false);
                }}
                style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                className="w-full px-4 py-2 text-left text-slate-200 transition-colors flex items-center gap-2"
              >
                <span>🔑</span>
                <span>Cambiar Contraseña</span>
              </button>
              
              <div className="border-t border-slate-700 my-2" />
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLogout();
                }}
                style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                className="w-full px-4 py-2 text-left text-red-400 transition-colors flex items-center gap-2"
              >
                <span>🚪</span>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold mb-4 text-slate-100">👤 Mi Perfil</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Apellido</label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-500 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Rol</label>
                <input
                  type="text"
                  value={isAdmin ? 'Administrador' : 'Operador'}
                  disabled
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleProfileUpdate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Guardar Cambios
              </button>
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-slate-100 px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold mb-4 text-slate-100">🔑 Cambiar Contraseña</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña Actual</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100"
                />
                <p className="text-xs text-slate-500 mt-1">Mínimo 8 caracteres</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handlePasswordChange}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Actualizar Contraseña
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-slate-100 px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserProfileMenu;
