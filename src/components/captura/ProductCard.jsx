import React from 'react';
import { motion } from 'framer-motion';
import { Package, Check, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ProductCard({ product, onClick, selected, countedQty = 0, hasCounted }) {
  const isCounted = hasCounted ?? (countedQty > 0);

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(product)}
      className={cn(
        "p-4 rounded-xl border cursor-pointer transition-all shadow-2xs flex items-center justify-between",
        selected 
          ? "border-primary ring-2 ring-primary/30 bg-primary/5" 
          : isCounted
            ? "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/60"
            : "bg-card border-border hover:bg-accent"
      )}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0 pr-3">
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
          isCounted 
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold" 
            : "bg-muted text-muted-foreground"
        )}>
          {isCounted ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Package className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm font-semibold truncate",
              isCounted ? "text-foreground font-bold" : "text-foreground"
            )}>
              {product.nombre_producto}
            </p>
          </div>
          <div className="flex items-center text-xs text-muted-foreground mt-0.5 space-x-2">
            <span className="truncate font-mono font-medium">SKU: {product.codigo_barras}</span>
            <span>•</span>
            <span className="capitalize">{product.unidad}</span>
          </div>
        </div>
      </div>

      {isCounted && (
        <div className="shrink-0 flex items-center gap-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 px-2.5 py-1 rounded-full text-xs font-bold font-mono shadow-2xs">
          <Check className="w-3.5 h-3.5" />
          <span>{countedQty} {product.unidad || 'pzas'}</span>
        </div>
      )}
    </motion.div>
  );
}
