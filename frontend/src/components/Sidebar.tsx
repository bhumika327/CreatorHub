import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut,
  Users,
  Briefcase,
  Layers,
  MessageSquare,
  DollarSign,
  Calendar,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Flag,
  FileText,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  user: {
    email: string;
    role: 'CUSTOMER' | 'CREATOR' | 'MANAGER';
  } | null;
  onLogout: () => void;
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  onLogout,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  const menuItems = {
    CUSTOMER: [
      { name: 'Browse Creators', path: '/catalog/creators', icon: <Users className="w-5 h-5" /> },
      { name: 'Post Requirement', path: '/catalog/post-requirement', icon: <FileText className="w-5 h-5" /> },
      { name: 'My Requirements', path: '/catalog/requirements', icon: <Layers className="w-5 h-5" /> },
      { name: 'Contracts', path: '/engagement/contracts', icon: <Briefcase className="w-5 h-5" /> },
      { name: 'Chat Rooms', path: '/chat', icon: <MessageSquare className="w-5 h-5" /> },
      { name: 'Wallet Ledger', path: '/payment/ledger', icon: <DollarSign className="w-5 h-5" /> }
    ],
    CREATOR: [
      { name: 'Services & Portfolio', path: '/creator/portfolio', icon: <Layers className="w-5 h-5" /> },
      { name: 'Availability Calendar', path: '/creator/availability', icon: <Calendar className="w-5 h-5" /> },
      { name: 'Bid Proposals', path: '/engagement/proposals', icon: <FileText className="w-5 h-5" /> },
      { name: 'Active Contracts', path: '/engagement/contracts', icon: <Briefcase className="w-5 h-5" /> },
      { name: 'AI Suggestion Tool', path: '/creator/ai-suggestions', icon: <Sparkles className="w-5 h-5" /> },
      { name: 'Chat Rooms', path: '/chat', icon: <MessageSquare className="w-5 h-5" /> },
      { name: 'Payout Ledger', path: '/payment/ledger', icon: <DollarSign className="w-5 h-5" /> }
    ],
    MANAGER: [
      { name: 'Verification Queue', path: '/manager/verify', icon: <UserCheck className="w-5 h-5" /> },
      { name: 'Disputes Console', path: '/manager/disputes', icon: <Flag className="w-5 h-5" /> },
      { name: 'RBAC Permission Grid', path: '/manager/rbac', icon: <ShieldCheck className="w-5 h-5" /> },
      { name: 'Manage Accounts', path: '/manager/accounts', icon: <UserPlus className="w-5 h-5" /> }
    ]
  };

  const currentMenu = menuItems[user.role] || [];

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false); // Close mobile drawer overlay on navigation
  };

  const sidebarWidthClass = collapsed ? 'w-20' : 'w-64';

  return (
    <>
      {/* Mobile drawer backdrop overlay overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Panel container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 md:static flex flex-col h-full bg-sidebarBg-light dark:bg-sidebarBg-dark text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-850 transition-all duration-300 ${sidebarWidthClass} ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* App Header logo block */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 h-16 shrink-0">
          {!collapsed && (
            <h1 className="text-lg font-black tracking-wider text-green-600 dark:text-green-400 select-none">
              CreatorHub
            </h1>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <ThemeToggle />
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-1.5 hover:bg-gray-100 dark:hover:bg-gray-850 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {currentMenu.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={`flex items-center w-full rounded-xl text-sm font-bold transition-all duration-200 ${
                collapsed ? 'justify-center p-3' : 'px-4 py-3'
              } ${
                isActive(item.path)
                  ? 'bg-green-500 text-white shadow-md shadow-green-500/20'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-600 dark:text-gray-300'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <span className={collapsed ? '' : 'mr-3'}>{item.icon}</span>
              {!collapsed && <span>{item.name}</span>}
            </button>
          ))}
        </nav>

        {/* Footer Session block */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-850 bg-gray-50 dark:bg-gray-900 bg-opacity-40 shrink-0">
          {!collapsed && (
            <div className="truncate mb-3 px-1">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Signed in as</p>
              <p className="text-sm font-bold truncate text-gray-700 dark:text-white mt-0.5" title={user.email}>
                {user.email}
              </p>
              <span className="inline-block mt-1 px-2.5 py-0.5 text-[10px] font-black rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-900">
                {user.role}
              </span>
            </div>
          )}
          <button
            onClick={onLogout}
            className={`flex items-center justify-center bg-red-650 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shadow-lg ${
              collapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full py-2.5 px-3'
            }`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
