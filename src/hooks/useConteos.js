import { useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';

export function useConteos(tiendaId) {
  const [conteos, setConteos] = useState([]);

  const loadConteos = async () => {
    if (!tiendaId) {
      setConteos([]);
      return;
    }
    const { data, error } = await requireSupabase()
      .from('conteos')
      .select('*')
      .eq('tienda_id', tiendaId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const enrichedConteos = await Promise.all((data || []).map(async conteo => {
      const [{ data: detalle, error: detalleError }, { data: noCatalogados, error: noCatalogadosError }] = await Promise.all([
        requireSupabase().from('registros_detalle').select('operador_nombre, producto_id, cantidad').eq('conteo_id', conteo.id),
        requireSupabase().from('productos_no_catalogados').select('operador_nombre, nombre_temporal, cantidad').eq('conteo_id', conteo.id)
      ]);
      if (detalleError) throw detalleError;
      if (noCatalogadosError) throw noCatalogadosError;

      const colaboradores = {};
      (detalle || []).forEach(registro => {
        const nombre = registro.operador_nombre || 'Sin nombre';
        if (!colaboradores[nombre]) colaboradores[nombre] = { nombre, productos: new Set(), piezas: 0 };
        colaboradores[nombre].productos.add(`catalogado:${registro.producto_id}`);
        colaboradores[nombre].piezas += Number(registro.cantidad) || 0;
      });
      (noCatalogados || []).forEach(registro => {
        const nombre = registro.operador_nombre || 'Sin nombre';
        if (!colaboradores[nombre]) colaboradores[nombre] = { nombre, productos: new Set(), piezas: 0 };
        colaboradores[nombre].productos.add(`no-catalogado:${registro.nombre_temporal}`);
        colaboradores[nombre].piezas += Number(registro.cantidad) || 0;
      });

      return {
        ...conteo,
        colaboradores: Object.values(colaboradores)
          .map(colaborador => ({ ...colaborador, articulos: colaborador.productos.size, productos: undefined }))
          .sort((a, b) => b.articulos - a.articulos)
      };
    }));

    setConteos(enrichedConteos);
  };

  useEffect(() => {
    loadConteos().catch(console.error);
  }, [tiendaId]);

  const addConteo = async (nombre_sesion) => {
    const codigo_acceso = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map(value => (value % 36).toString(36)).join('').toUpperCase();
    const { data, error } = await requireSupabase().from('conteos').insert({
      tienda_id: tiendaId,
      nombre_sesion,
      codigo_acceso,
      estado: 'abierto',
      created_at: new Date().toISOString()
    }).select().single();
    if (error) throw error;
    setConteos(current => [data, ...current]);
    return data.id;
  };

  const updateEstado = async (id, estado) => {
    const { error } = await requireSupabase().from('conteos').update({ estado }).eq('id', id);
    if (error) throw error;
    setConteos(current => current.map(conteo => conteo.id === id ? { ...conteo, estado } : conteo));
  };

  const updateExpiration = async (id, expiresAt) => {
    const { error } = await requireSupabase().from('conteos').update({ expires_at: expiresAt }).eq('id', id);
    if (error) throw error;
    setConteos(current => current.map(conteo => conteo.id === id ? { ...conteo, expires_at: expiresAt } : conteo));
  };

  const deleteConteo = async (id) => {
    const { error } = await requireSupabase().from('conteos').delete().eq('id', id);
    if (error) throw error;
    setConteos(current => current.filter(conteo => conteo.id !== id));
  };

  return { conteos, addConteo, updateEstado, updateExpiration, deleteConteo };
}
