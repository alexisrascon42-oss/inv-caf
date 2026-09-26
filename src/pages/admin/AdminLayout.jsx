import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Download, FileSpreadsheet, Home, LogOut, Menu, Store, Upload } from 'lucide-react';
import { Sidebar } from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/admin/tiendas', icon: Store, label: 'Tiendas' },
  { to: '/admin/catalogo', icon: Upload, label: 'Catálogo' },
  { to: '/admin/sesiones', icon: FileSpreadsheet, label: 'Sesiones' },
  { to: '/admin/exportar', icon: Download, label: 'Exportar' }
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto bg-muted/20">
        <header className="md:hidden sticky top-0 z-30 border-b bg-card/95 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="bg-primary/10 p-2 rounded-xl shrink-0">
                <Menu className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">Inventario Admin</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <button onClick={signOut} title="Cerrar sesión" className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 no-scrollbar">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
            <NavLink to="/" className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">
              <Home className="w-4 h-4" />
              Inicio
            </NavLink>
          </nav>
        </header>
        <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
