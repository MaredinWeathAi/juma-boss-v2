import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Boxes,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChefHat,
  Calculator,
  HelpCircle,
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

const BakerLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/app', icon: <LayoutDashboard size={20} /> },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Orders', path: '/app/orders', icon: <ShoppingCart size={20} /> },
        { label: 'Producao', path: '/app/production', icon: <ChefHat size={20} /> },
        { label: 'Products', path: '/app/products', icon: <Package size={20} /> },
        { label: 'Customers', path: '/app/customers', icon: <Users size={20} /> },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Inventory', path: '/app/inventory', icon: <Boxes size={20} /> },
        { label: 'Custo de Receitas', path: '/app/recipe-costing', icon: <Calculator size={20} /> },
        { label: 'Payments', path: '/app/payments', icon: <CreditCard size={20} /> },
      ],
    },
    {
      title: 'Insights',
      items: [
        { label: 'Reports', path: '/app/reports', icon: <BarChart3 size={20} /> },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Assinatura', path: '/app/subscription', icon: <CreditCard size={20} /> },
        { label: 'Settings', path: '/app/settings', icon: <Settings size={20} /> },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 bg-surface-900 border-r border-surface-800 transition-all duration-300 ${
          sidebarOpen ? 'w-60' : 'w-0'
        } overflow-hidden z-40`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="px-6 py-8 border-b border-surface-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-bold text-surface-950">
                JB
              </div>
              <span className="font-bold text-white">Juma Boss</span>
            </div>
            {user?.bakery && (
              <div className="mt-3">
                <p className="text-xs text-surface-500 mb-1">Padaria</p>
                <p className="text-sm font-medium text-white truncate">{user.bakery.name}</p>
                <span className={`inline-block mt-2 text-xs font-semibold px-2 py-1 rounded-full ${
                  user.bakery.tier === 'pro'
                    ? 'bg-brand-500/20 text-brand-400'
                    : user.bakery.tier === 'starter'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-surface-700 text-surface-300'
                }`}>
                  {user.bakery.tier.charAt(0).toUpperCase() + user.bakery.tier.slice(1)}
                </span>
              </div>
            )}
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
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                          isActive(item.path)
                            ? 'bg-brand-500/20 text-brand-400 border-l-2 border-brand-500'
                            : 'text-surface-400 hover:text-white hover:bg-surface-800/50'
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

          {/* Help and User Section */}
          <div className="border-t border-surface-800">
            {/* Help Link */}
            <div className="p-4 border-b border-surface-800">
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/50 transition-all duration-200 text-sm"
              >
                <HelpCircle size={18} />
                <span className="font-medium">Ajuda</span>
              </a>
            </div>

            {/* User Section */}
            <div className="p-4 space-y-3">
              {user && (
                <div className="flex items-center gap-3 px-3 py-2 bg-surface-800 rounded-lg">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-bold text-surface-950 text-sm flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-surface-500 truncate">{user.email}</p>
                  </div>
                </div>
              )}
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200 text-sm font-medium"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-60' : 'ml-0'}`}
      >
        {/* Top Bar */}
        <div className="bg-surface-900 border-b border-surface-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-surface-800 rounded-lg transition-colors text-surface-400 hover:text-white"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 hover:bg-surface-800 rounded-lg transition-colors text-surface-400 hover:text-white relative"
              >
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Notification Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-surface-800 rounded-lg border border-surface-700 shadow-xl z-50">
                  <div className="p-4 border-b border-surface-700">
                    <h3 className="font-semibold text-white">Notificações</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="p-4 text-center text-surface-400 text-sm">
                      Nenhuma notificação nova
                    </div>
                  </div>
                </div>
              )}
            </div>
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

export default BakerLayout;
