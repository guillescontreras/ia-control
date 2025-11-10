import React from 'react';

interface HeaderProps {
  userProfile: any;
  user: any;
  isAdmin: boolean;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ userProfile, user, isAdmin, onLogout }) => {
  return (
    <header className="bg-slate-800 border-b border-slate-700 h-16 fixed top-0 right-0 left-64 z-10">
      <div className="h-full px-6 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-slate-300 text-sm font-semibold">CoironTech IA Control</span>
        </div>
        
        <div className="flex items-center gap-4">
        {/* User Info */}
        <div className="flex items-center gap-3">
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
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          🚪 Salir
        </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
