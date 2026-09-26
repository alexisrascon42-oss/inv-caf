import React from 'react';
import { NavLink } from 'react-router-dom';
import { Store, Upload, FileSpreadsheet, Download, Home } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const navItems = [
    { to: "/admin/tiendas", icon: Store, label: "Tiendas" },
    { to: "/admin/catalogo", icon: Upload, label: "Importar Catálogo" },
    { to: "/admin/sesiones", icon: FileSpreadsheet, label: "Sesiones de Conteo" },
    { to: "/admin/exportar", icon: Download, label: "Exportar Reportes" },
  ];

  return (
    <aside className="w-64 border-r bg-card min-h-screen hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b">
        <h1 className="font-bold text-lg tracking-tight">Inventario Admin</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <NavLink
          to="/"
          className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mb-4"
        >
          <Home className="w-5 h-5 mr-3" />
          Volver al Inicio
        </NavLink>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 px-3">
          Administración
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
