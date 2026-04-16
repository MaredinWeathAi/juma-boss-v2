import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  CreditCard,
  Rocket,
  MessageSquare,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavSection {
  title: string;
  items: {
    label: string;
    path: string;
    icon: React.ReactNode;
  }[];
}

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, logout, isImpersonating, stopImpersonating } = useAuth();

  const navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 size={20} /> },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Clients', path: '/admin/clients', icon: <Users size={20} /> },
        { label: 'Subscriptions', path: '/admin/subscriptions', icon: <CreditCard size={20} /> },
        { label: 'Financeiro', path: '/admin/financial', icon: <TrendingUp size={20} /> },
        { label: 'Onboarding', path: '/admin/onboarding', icon: <Rocket size={20} /> },
      ],
    },
    {
      title: 'Communications',
      items: [
        { label: 'Announcements', path: '/admin/announcements', icon: <MessageSquare size={20} /> },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Audit Log', path: '/admin/audit-log', icon: <Shield size={20} /> },
        { label: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-900/80 border-b border-yellow-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-100">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">You are impersonating a user</span>
          </div>
          <button
            onClick={stopImpersonating}
            className="text-sm bg-yellow-700 hover:bg-yellow-600 text-white px-3 py-1 rounded transition-colors"
          >
            Stop Impersonating
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 bg-surface-900 border-r border-surface-800 transition-all duration-300 ${
          sidebarOpen ? 'w-60' : 'w-0'
        } overflow-hidden z-40 ${isImpersonating ? 'mt-16' : ''}`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="px-6 py-8 border-b border-surface-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-bold text-surface-950">
                JB
              </div>
              <span className="font-bold text-white">Juma Boss</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-8">
            {navSections.map((section) => (
              <div key={section.title}>
                <h3 className="px-3 text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          isActive(item.path)
                            ? 'bg-brand-500/20 text-brand-400 border-l-2 border-brand-500'
                            : 'text-surface-400 hover:text-white hover:bg-surface-800'
                        }`}
                      >
                        {item.icon}
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-surface-800 space-y-3">
            {user && (
              <div className="px-3 py-2 bg-surface-800 rounded-lg">
                <p className="text-xs text-surface-500 mb-1">Logged in as</p>
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-surface-500 truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-60' : 'ml-0'} ${isImpersonating ? 'mt-16' : ''}`}
      >
        {/* Top Bar */}
        <div className="bg-surface-900 border-b border-surface-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-surface-800 rounded-lg transition-colors text-surface-400 hover:text-white"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="text-sm text-surface-400">
            Juma Boss Admin Panel
          </div>
        </div>

        {/* Page Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
