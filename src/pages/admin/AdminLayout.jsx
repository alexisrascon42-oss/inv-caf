import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, ClipboardList, Download, FileSpreadsheet, Home, LogOut, Menu, Store, Upload, X } from 'lucide-react';
import { Sidebar } from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { isDevUser } from '../../lib/devAccess';

const navItems = [
  { to: '/admin/tiendas', icon: Store, label: 'Tiendas' },
  { to: '/admin/catalogo', icon: Upload, label: 'Catálogo' },
  { to: '/admin/sesiones', icon: FileSpreadsheet, label: 'Sesiones' },
  { to: '/admin/criticos', icon: ClipboardList, label: 'Conteo crítico' },
  { to: '/admin/exportar', icon: Download, label: 'Exportar' }
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleNavItems = isDevUser(user)
    ? [...navItems, { to: '/admin/dev', icon: Activity, label: 'Dev' }]
    : navItems;
  const currentSection = visibleNavItems.find(item => item.to === location.pathname)?.label || 'Administración';

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto bg-muted/20">
        <header className="lg:hidden sticky top-0 z-30 border-b bg-card/95 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <button type="button" aria-label={mobileMenuOpen ? 'Cerrar navegación' : 'Abrir navegación'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(open => !open)} className="shrink-0 rounded-xl bg-primary/10 p-2 text-primary hover:bg-primary/15">
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">Inventario Admin</p>
                <p className="text-[11px] text-muted-foreground truncate">{currentSection} · {user?.email}</p>
              </div>
            </div>
            <button onClick={signOut} title="Cerrar sesión" className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          {mobileMenuOpen && (
            <nav className="grid gap-1 border-t px-3 py-2" aria-label="Navegación de administración">
              {visibleNavItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
              <NavLink to="/" onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
                <Home className="h-5 w-5 shrink-0" />
                Inicio
              </NavLink>
            </nav>
          )}
        </header>
        <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
