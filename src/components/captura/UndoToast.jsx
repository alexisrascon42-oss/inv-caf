import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { Button } from '../ui/Button';

export function UndoToast({ show, item, onUndo, onDismiss, duration = 5000 }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss, duration]);

  return (
    <AnimatePresence>
      {show && item && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between p-3 rounded-2xl bg-foreground text-background shadow-xl"
        >
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold truncate">
              {item.cantidad} {item.nombre_producto}
            </span>
            <span className="text-xs text-muted/70 truncate">
              Agregado a {item.area}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 shrink-0">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={onUndo}
              className="h-8 rounded-xl px-3 bg-background/20 text-background hover:bg-background/30 border-0"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Deshacer
            </Button>
            <button 
              onClick={onDismiss}
              className="p-1 rounded-full hover:bg-background/20 transition-colors text-muted/70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Progress bar */}
          <motion.div 
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: duration / 1000, ease: "linear" }}
            className="absolute bottom-0 left-0 h-1 bg-primary/40 rounded-b-2xl"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
