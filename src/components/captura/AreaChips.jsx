import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Plus } from 'lucide-react';

export function AreaChips({ areas, selectedArea, onSelect, onAdd }) {
  return (
    <div className="flex w-full overflow-x-auto no-scrollbar py-2 space-x-2 snap-x">
      {areas.map((area) => {
        const isSelected = selectedArea === area.nombre;
        return (
          <motion.button
            key={area.id || area.nombre}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(area.nombre)}
            className={cn(
              "snap-start whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors border",
              isSelected 
                ? "bg-foreground text-background border-foreground shadow-md" 
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {area.nombre}
          </motion.button>
        );
      })}
      
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onAdd}
        className="snap-start flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium border border-dashed border-primary text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
      >
        <Plus className="w-4 h-4 mr-1" />
        Nueva Área
      </motion.button>
    </div>
  );
}
