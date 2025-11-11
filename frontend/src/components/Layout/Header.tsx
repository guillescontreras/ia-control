import React from 'react';
import UserProfileMenu from '../UserProfileMenu';

interface HeaderProps {
  userProfile: any;
  user: any;
  isAdmin: boolean;
  onLogout: () => void;
  onProfileUpdate: () => void;
}

const Header: React.FC<HeaderProps> = ({ userProfile, user, isAdmin, onLogout, onProfileUpdate }) => {
  return (
    <header className="bg-slate-800 border-b border-slate-700 h-16 fixed top-0 right-0 left-64 z-10">
      <div className="h-full px-6 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-slate-300 text-sm font-semibold">CoironTech IA Control</span>
        </div>
        
        <div className="flex items-center gap-4">
          <UserProfileMenu
            userProfile={userProfile}
            user={user}
            isAdmin={isAdmin}
            onLogout={onLogout}
            onProfileUpdate={onProfileUpdate}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
