import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

type Section = 'dashboard' | 'presence' | 'logs' | 'alerts' | 'multicam' | 'admin-employees' | 'admin-users' | 'admin-cameras' | 'admin-epp-zones';

interface MainLayoutProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  userProfile: any;
  user: any;
  isAdmin: boolean;
  onLogout: () => void;
  onProfileUpdate: () => void;
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  activeSection,
  onSectionChange,
  userProfile,
  user,
  isAdmin,
  onLogout,
  onProfileUpdate,
  children
}) => {
  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar 
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        isAdmin={isAdmin}
      />
      <Header 
        userProfile={userProfile}
        user={user}
        isAdmin={isAdmin}
        onLogout={onLogout}
        onProfileUpdate={onProfileUpdate}
      />
      <main className="ml-64 pt-16">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
