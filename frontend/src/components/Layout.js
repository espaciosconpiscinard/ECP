import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Home, Users, FileText, DollarSign, Building, Menu, X, LogOut, Tag, UserCog, Settings, Receipt } from 'lucide-react';

const Layout = ({ children, currentView, setCurrentView }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Menú base para todos los usuarios
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'employee'] },
    { id: 'reservations', label: 'Reservaciones', icon: FileText, roles: ['admin', 'employee'] },
    { id: 'customers', label: 'Clientes', icon: Users, roles: ['admin', 'employee'] },
    { id: 'villas', label: 'Villas y Servicios', icon: Building, roles: ['admin', 'employee'] },
  ];

  // Menú solo para admin
  if (user?.role === 'admin') {
    menuItems.push(
      { id: 'categories', label: 'Categorías Villas', icon: Tag, roles: ['admin'] },
      { id: 'expense-categories', label: 'Categorías Gastos', icon: Tag, roles: ['admin'] },
      { id: 'expenses', label: 'Gastos', icon: DollarSign, roles: ['admin'] },
      { id: 'users', label: 'Usuarios', icon: UserCog, roles: ['admin'] },
      { id: 'invoice-editor', label: 'Editor de Facturas', icon: Receipt, roles: ['admin'] },
      { id: 'configuration', label: 'Configuración', icon: Settings, roles: ['admin'] }
    );
  }

  // Filtrar menú según el rol del usuario
  const visibleMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b fixed top-0 left-0 right-0 z-10" data-testid="top-nav">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
              data-testid="menu-toggle"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.png" 
                alt="Espacios Con Piscina Logo" 
                className="h-10 w-auto"
              />
              <h1 className="text-xl font-bold text-blue-600 hidden sm:block">Espacios Con Piscina</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-right" data-testid="user-info">
              <p className="font-medium">{user?.full_name}</p>
              <p className="text-gray-500 text-xs capitalize">{user?.role === 'admin' ? 'Administrador' : 'Empleado'}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={logout}
              data-testid="logout-button"
            >
              <LogOut size={16} className="mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-16 flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-20 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out pt-16 lg:pt-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          data-testid="sidebar"
        >
          <div className="h-full overflow-y-auto py-6">
            <nav className="space-y-1 px-3">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-blue-50 text-blue-600 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                    data-testid={`nav-${item.id}`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-x-hidden" data-testid="main-content">
          {children}
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
