import React, { useState, useEffect } from 'react';
import { InsumosList } from '../components/insumos/InsumosList';
import { useProductos } from '../hooks/useProductos';
import { useRegistros } from '../hooks/useRegistros';
import { useNavigate } from 'react-router-dom';

export default function InsumosPage() {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const saved = localStorage.getItem('inv_session');
    if (saved) setSession(JSON.parse(saved));
  }, []);

  const { productos } = useProductos(session?.tiendaId);
  const { registros } = useRegistros(session?.conteoId);

  if (!session) return <div className="p-4">Cargando sesión...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-16">
      <div className="flex-1 overflow-hidden">
        <InsumosList 
          productos={productos} 
          registros={registros} 
          onSelectProduct={(p) => {
            // For example, navigate back to captura with this product selected
            // navigate('/operador/captura', { state: { selectedProductId: p.id }});
            // This is just a UX suggestion
          }}
        />
      </div>
    </div>
  );
}
