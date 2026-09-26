import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

export function HistorialList({ registros, onEdit, onDelete }) {
  if (!registros || registros.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <p className="text-base font-medium">No hay capturas aún</p>
        <p className="text-sm mt-1">Comienza a contar para ver tu historial aquí.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 p-4">
      <AnimatePresence initial={false}>
        {registros.map((reg) => (
          <motion.div
            key={reg.id}
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className="bg-card border rounded-2xl p-4 shadow-sm relative group flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-semibold text-base text-foreground truncate">
                  {reg.producto_nombre || reg.nombre_temporal}
                </h3>
                <div className="flex items-center space-x-2 mt-1 text-sm text-muted-foreground">
                  <span className="font-bold text-primary">{reg.cantidad} pzas</span>
                  <span>•</span>
                  <span className="truncate">{reg.area}</span>
                  {reg.codigo_barras && reg.codigo_barras !== 'SIN-CODIGO' && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-xs">SKU: {reg.codigo_barras}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-secondary/50 text-secondary-foreground hover:bg-secondary"
                  onClick={() => onEdit(reg)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => onDelete(reg)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
