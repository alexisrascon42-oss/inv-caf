import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, History, Package2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export function BottomNav() {
  const navItems = [
    { to: "/operador/captura", icon: ClipboardList, label: "Captura" },
    { to: "/operador/historial", icon: History, label: "Historial" },
    { to: "/operador/insumos", icon: Package2, label: "Insumos" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t glass pb-safe">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )
          }
        >
          {({ isActive }) => (
            <>
              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <item.icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
              </motion.div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
