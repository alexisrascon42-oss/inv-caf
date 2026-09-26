import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useTiendas } from '../hooks/useTiendas';
import { useConteos } from '../hooks/useConteos';

export default function SetupPage() {
  const navigate = useNavigate();
  const { tiendas } = useTiendas();
  
  const [tiendaId, setTiendaId] = useState('');
  const { conteos } = useConteos(tiendaId ? Number(tiendaId) : null);
  
  const [conteoId, setConteoId] = useState('');
  const [operador, setOperador] = useState('');
  const [area, setArea] = useState('');

  const handleStart = () => {
    if (!tiendaId || !conteoId || !operador || !area) return;
    
    const tiendaObj = tiendas?.find(t => t.id === Number(tiendaId));
    const conteoObj = conteos?.find(c => c.id === Number(conteoId));

    localStorage.setItem('inv_session', JSON.stringify({
      tiendaId: Number(tiendaId),
      tiendaNombre: tiendaObj?.nombre || 'Tienda',
      conteoId: Number(conteoId),
      conteoNombre: conteoObj?.nombre_sesion || 'Sesión Activa',
      operador,
      area
    }));
    
    navigate('/operador/captura');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-14 border-b flex items-center px-4 bg-card">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold ml-2">Configuración</h1>
      </div>
      
      <div className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full space-y-6">
        <div className="space-y-4 flex-1">
          <div className="space-y-2">
            <label className="text-sm font-medium">1. Selecciona la Tienda</label>
            <select 
              className="flex h-12 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={tiendaId}
              onChange={(e) => {
                setTiendaId(e.target.value);
                setConteoId('');
              }}
            >
              <option value="">Seleccione una tienda...</option>
              {tiendas?.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">2. Sesión de Conteo</label>
            <select 
              className="flex h-12 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              value={conteoId}
              onChange={(e) => setConteoId(e.target.value)}
              disabled={!tiendaId}
            >
              <option value="">Seleccione sesión activa...</option>
              {conteos?.filter(c => c.estado === 'abierto').map(c => (
                <option key={c.id} value={c.id}>{c.nombre_sesion}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">3. Nombre del Operador</label>
            <Input 
              placeholder="Ej. Juan Pérez"
              value={operador}
              onChange={(e) => setOperador(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">4. Área a contar inicial</label>
            <Input 
              placeholder="Ej. Bodega Principal"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>
        </div>

        <div className="pt-4 pb-safe">
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleStart}
            disabled={!tiendaId || !conteoId || !operador || !area}
          >
            Comenzar Captura
          </Button>
        </div>
      </div>
    </div>
  );
}
