import React from 'react';

type Section = 'dashboard' | 'presence' | 'logs' | 'alerts' | 'multicam' | 'admin-employees' | 'admin-users' | 'admin-cameras' | 'admin-epp-zones';

interface SidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  isAdmin: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, isAdmin }) => {
  const menuItems = [
    { id: 'dashboard' as Section, icon: '📊', label: 'Dashboard', admin: false },
    { id: 'presence' as Section, icon: '👥', label: 'Presencia', admin: false },
    { id: 'logs' as Section, icon: '📋', label: 'Logs', admin: false },
    { id: 'alerts' as Section, icon: '🚨', label: 'Alertas', admin: false },
    { id: 'multicam' as Section, icon: '🎬', label: 'Multi-Cámara', admin: false },
  ];

  const adminItems = [
    { id: 'admin-employees' as Section, icon: '👥', label: 'Empleados' },
    { id: 'admin-users' as Section, icon: '🔐', label: 'Usuarios' },
    { id: 'admin-cameras' as Section, icon: '🎥', label: 'Cámaras' },
    { id: 'admin-epp-zones' as Section, icon: '🦺', label: 'Zonas EPP' },
  ];

  return (
    <div className="w-64 bg-slate-800 h-screen fixed left-0 top-0 flex flex-col border-r border-slate-700">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <img src="/CoironTech-logo1.jpeg" alt="CoironTech" className="w-10 h-10 rounded" />
          <div>
            <h1 className="text-xl font-bold text-slate-100">CoironTech IA Control</h1>
            <p className="text-xs text-slate-400">Sistema de Accesos</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          {menuItems.map((item) => (
            (!item.admin || isAdmin) && (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                style={{
                  backgroundColor: activeSection === item.id ? '#2563eb' : 'transparent',
                  color: activeSection === item.id ? '#ffffff' : '#cbd5e1'
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== item.id) {
                    e.currentTarget.style.backgroundColor = '#334155';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== item.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          ))}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-6 px-3">
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Administración
            </div>
            <div className="space-y-1 mt-2">
              {adminItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  style={{
                    backgroundColor: activeSection === item.id ? '#2563eb' : 'transparent',
                    color: activeSection === item.id ? '#ffffff' : '#cbd5e1'
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== item.id) {
                      e.currentTarget.style.backgroundColor = '#334155';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== item.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#cbd5e1';
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 font-semibold text-center mb-1">CoironTech IA Control</p>
        <p className="text-xs text-slate-500 text-center">v2.0.0</p>
      </div>
    </div>
  );
};

export default Sidebar;
