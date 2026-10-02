import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, KeyRound, Store } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { requireSupabase } from '../lib/supabase';

export default function SetupPage() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [conteo, setConteo] = useState(null);
  const [operador, setOperador] = useState('');
  const [area, setArea] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const findConteo = async () => {
    if (!codigo.trim()) return;
    const accessCode = codigo.trim().toUpperCase();
    if (![6, 8].includes(accessCode.length)) {
      setError('El código debe tener 6 caracteres para una sesión o 8 para el conteo crítico.');
      return;
    }
    setLoading(true);
    setError('');
    const client = requireSupabase();
    const { data: currentSession } = await client.auth.getSession();
    if (currentSession.session && !currentSession.session.user.is_anonymous) await client.auth.signOut();
    const { data: activeSession } = await client.auth.getSession();
    if (!activeSession.session?.user.is_anonymous) {
      const { error: authError } = await client.auth.signInAnonymously();
      if (authError) {
        setError('No se pudo iniciar el acceso de operador. Habilita Anonymous Sign-Ins en Supabase.');
        setLoading(false);
        return;
      }
    }

    if (accessCode.length === 8) {
      const { data, error: queryError } = await client.rpc('get_critical_store_products', { p_codigo: accessCode });
      if (queryError) setError(queryError.message);
      else if (!data?.length) setError('No encontramos artículos críticos para ese código de sucursal.');
      else setConteo({
        modo: 'critico',
        tienda_id: data[0].tienda_id,
        tienda_nombre: data[0].tienda_nombre,
        productos_criticos: data.map(item => ({
          id: item.producto_id,
          codigo_barras: item.sku,
          nombre_producto: item.articulo,
          unidad: item.unidad
        }))
      });
    } else {
      const { data: accessData, error: queryError } = await client.rpc('claim_conteo_access', { p_codigo: accessCode });
      const data = accessData?.[0];

      if (queryError) setError(queryError.message);
      else if (!data) setError('No encontramos una sesión abierta con ese código.');
      else setConteo({ ...data, modo: 'normal', tienda_nombre: data.tienda_nombre });
    }
    setLoading(false);
  };

  const handleStart = () => {
    if (!conteo || !operador.trim() || (conteo.modo !== 'critico' && !area.trim())) return;
    const session = {
      modo: conteo.modo,
      tiendaId: conteo.tienda_id,
      tiendaNombre: conteo.tienda_nombre,
      codigoAcceso: codigo.trim().toUpperCase(),
      operador: operador.trim(),
      area: area.trim()
    };
    if (conteo.modo === 'critico') session.productosCriticos = conteo.productos_criticos;
    else {
      session.conteoId = conteo.id;
      session.conteoNombre = conteo.nombre_sesion;
    }
    localStorage.setItem('inv_session', JSON.stringify(session));
    navigate('/operador/captura');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-14 border-b flex items-center px-4 bg-card">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold ml-2">Acceso al conteo</h1>
      </div>

      <div className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full space-y-6">
        <div className="space-y-4 flex-1">
          <div className="text-center space-y-2 mb-6">
            <div className="bg-primary/10 p-4 rounded-3xl w-fit mx-auto">
              <KeyRound className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Código de acceso</h2>
            <p className="text-sm text-muted-foreground">Usa el código de 6 caracteres de una sesión o el de 8 caracteres para artículos críticos.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Código de acceso</label>
            <div className="flex gap-2">
              <Input
                placeholder="Código de sesión o sucursal"
                value={codigo}
                onChange={e => { setCodigo(e.target.value.toUpperCase()); setConteo(null); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && findConteo()}
                className="uppercase tracking-widest font-semibold"
                maxLength={8}
              />
              <Button onClick={findConteo} disabled={!codigo.trim() || loading} variant="outline">
                {loading ? '...' : 'Validar'}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {conteo && (
            <div className="p-4 rounded-2xl border bg-card space-y-1">
              <div className="flex items-center gap-2 text-primary">
                <Store className="w-4 h-4" />
                <span className="font-semibold">{conteo.tienda_nombre}</span>
              </div>
              {conteo.modo === 'critico' ? (
                <p className="text-sm text-muted-foreground">Conteo diario crítico · <strong className="text-foreground">{conteo.productos_criticos.length} artículos</strong></p>
              ) : (
                <p className="text-sm text-muted-foreground">Sesión: <strong className="text-foreground">{conteo.nombre_sesion}</strong></p>
              )}
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del operador</label>
              <Input placeholder="Ej. Juan Pérez" value={operador} onChange={e => setOperador(e.target.value)} disabled={!conteo} />
            </div>
            {conteo?.modo !== 'critico' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Área a contar</label>
                <Input placeholder="Ej. Bodega Principal" value={area} onChange={e => setArea(e.target.value)} disabled={!conteo} />
              </div>
            )}
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={handleStart} disabled={!conteo || !operador.trim() || (conteo.modo !== 'critico' && !area.trim())}>
          Comenzar captura
        </Button>
      </div>
    </div>
  );
}
