import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownAZ, ArrowDown01, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

export function InsumosList({ productos, registros, onSelectProduct }) {
  const [filter, setFilter] = useState('todos'); // 'todos', 'contados', 'faltantes'
  const [sort, setSort] = useState('az'); // 'az', 'qty-desc', 'qty-asc'

  // Calculate totals per product
  const totals = {};
  registros.forEach(r => {
    totals[r.producto_id] = (totals[r.producto_id] || 0) + Number(r.cantidad);
  });

  // Combine products with their totals
  let list = productos.map(p => ({
    ...p,
    totalCount: totals[p.id] || 0
  }));

  // Apply filter
  if (filter === 'contados') list = list.filter(p => p.totalCount > 0);
  if (filter === 'faltantes') list = list.filter(p => p.totalCount === 0);

  // Apply sort
  list.sort((a, b) => {
    if (sort === 'az') return a.nombre_producto.localeCompare(b.nombre_producto);
    if (sort === 'qty-desc') return b.totalCount - a.totalCount;
    if (sort === 'qty-asc') return a.totalCount - b.totalCount;
    return 0;
  });

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b p-4 space-y-3">
        {/* Filters */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar snap-x">
          {['todos', 'contados', 'faltantes'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "snap-start px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize border whitespace-nowrap",
                filter === f
                  ? "bg-foreground text-background border-foreground shadow-md"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {f} ({
                f === 'todos' ? productos.length :
                f === 'contados' ? productos.filter(p => totals[p.id] > 0).length :
                productos.filter(p => !totals[p.id]).length
              })
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex space-x-2">
          <Button
            variant={sort === 'az' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setSort('az')}
            className="flex-1 rounded-lg h-9 text-xs"
          >
            <ArrowDownAZ className="w-4 h-4 mr-1.5" />
            A-Z
          </Button>
          <Button
            variant={sort === 'qty-desc' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setSort('qty-desc')}
            className="flex-1 rounded-lg h-9 text-xs"
          >
            <ArrowDown01 className="w-4 h-4 mr-1.5" />
            Mayor a menor
          </Button>
          <Button
            variant={sort === 'qty-asc' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setSort('qty-asc')}
            className="flex-1 rounded-lg h-9 text-xs"
          >
            <ArrowDown01 className="w-4 h-4 mr-1.5 rotate-180" />
            Menor a mayor
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">No hay insumos que coincidan</p>
          </div>
        ) : (
          list.map(p => (
            <motion.div
              key={p.id}
              layout
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectProduct(p)}
              className="bg-card border rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-accent transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0 pr-4">
                {p.totalCount > 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/30 shrink-0" />
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">
                    {p.nombre_producto}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate font-mono">SKU: {p.codigo_barras}</p>
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end">
                <span className={cn(
                  "font-bold text-lg",
                  p.totalCount > 0 ? "text-primary" : "text-muted-foreground/50"
                )}>
                  {p.totalCount}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {p.unidad}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
