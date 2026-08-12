import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  user: {
    email: string;
    role: 'CUSTOMER' | 'CREATOR' | 'MANAGER';
  } | null;
  onLogout: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ user, onLogout, children }) => {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSetCollapsed = (val: boolean) => {
    setCollapsed(val);
    localStorage.setItem('sidebar_collapsed', String(val));
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Sidebar
        user={user}
        onLogout={onLogout}
        collapsed={collapsed}
        setCollapsed={handleSetCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="flex md:hidden items-center justify-between px-4 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-850 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-white rounded-lg focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-base font-black tracking-wider text-green-600 dark:text-green-400">
            CreatorHub
          </span>
          <div className="w-6 h-6" /> {/* Spacer */}
        </header>

        {/* Scrollable Main Content Frame */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 dark:bg-gray-900 bg-opacity-30 dark:bg-opacity-30 transition-all duration-300">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
