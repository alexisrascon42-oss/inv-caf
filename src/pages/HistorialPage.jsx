import React, { useState, useEffect } from 'react';
import { HistorialList } from '../components/historial/HistorialList';
import { useRegistros } from '../hooks/useRegistros';

export default function HistorialPage() {
  const [session, setSession] = useState(null);
  
  useEffect(() => {
    const saved = localStorage.getItem('inv_session');
    if (saved) setSession(JSON.parse(saved));
  }, []);

  const { registros, deleteRegistro, updateRegistro } = useRegistros(session?.conteoId);

  const handleEdit = async (reg) => {
    const newQty = window.prompt(`Nueva cantidad para ${reg.producto_nombre || reg.nombre_temporal}:`, reg.cantidad);
    if (newQty && !isNaN(Number(newQty))) {
      await updateRegistro(reg.id, Number(newQty), reg.es_no_catalogado === 1);
    }
  };

  const handleDelete = async (reg) => {
    if (window.confirm(`¿Eliminar ${reg.producto_nombre || reg.nombre_temporal}?`)) {
      await deleteRegistro(reg.id, reg.es_no_catalogado === 1);
    }
  };

  if (!session) return <div className="p-4">Cargando sesión...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-16">
      <div className="p-4 border-b bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <h1 className="text-xl font-bold">Historial de Ingresos</h1>
        <p className="text-sm text-muted-foreground mt-1">Últimos capturados arriba</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <HistorialList 
          registros={registros} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
        />
      </div>
    </div>
  );
}
