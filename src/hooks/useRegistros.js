import { useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';

export function useRegistros(conteoId) {
  const [registros, setRegistros] = useState([]);

  const loadRegistros = async () => {
    if (!conteoId) {
      setRegistros([]);
      return;
    }

    const client = requireSupabase();
    const [{ data: items, error: itemsError }, { data: noCatalogados, error: noCatalogadosError }] = await Promise.all([
      client.from('registros_detalle').select('*, productos(*)').eq('conteo_id', conteoId).order('created_at', { ascending: false }),
      client.from('productos_no_catalogados').select('*').eq('conteo_id', conteoId).order('created_at', { ascending: false })
    ]);
    if (itemsError) throw itemsError;
    if (noCatalogadosError) throw noCatalogadosError;

    const enrichedDetalle = (items || []).map((registro) => ({
      ...registro,
      producto_nombre: registro.productos?.nombre_producto || 'Producto sin catálogo',
      codigo_barras: registro.productos?.codigo_barras || '',
      unidad: registro.productos?.unidad || 'pieza',
      es_no_catalogado: 0
    }));
    const enrichedNoCat = (noCatalogados || []).map((registro) => ({
      ...registro,
      producto_nombre: registro.nombre_temporal,
      codigo_barras: 'SIN-CODIGO',
      unidad: 'pieza',
      es_no_catalogado: 1
    }));

    setRegistros([...enrichedDetalle, ...enrichedNoCat].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
  };

  useEffect(() => {
    if (!conteoId) {
      setRegistros([]);
      return undefined;
    }

    loadRegistros().catch(console.error);
    const channel = requireSupabase()
      .channel(`conteo-${conteoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros_detalle', filter: `conteo_id=eq.${conteoId}` }, loadRegistros)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos_no_catalogados', filter: `conteo_id=eq.${conteoId}` }, loadRegistros)
      .subscribe();

    return () => {
      requireSupabase().removeChannel(channel);
    };
  }, [conteoId]);

  const addRegistro = async (productoId, operadorNombre, area, cantidad) => {
    const { data, error } = await requireSupabase().from('registros_detalle').insert({
      conteo_id: conteoId,
      producto_id: productoId,
      operador_nombre: operadorNombre,
      area,
      cantidad: Number(cantidad),
      created_at: new Date().toISOString()
    }).select('id').single();
    if (error) throw error;
    await loadRegistros();
    return data.id;
  };

  const addRegistroNoCatalogado = async (nombreTemporal, operadorNombre, area, cantidad) => {
    const { data, error } = await requireSupabase().from('productos_no_catalogados').insert({
      conteo_id: conteoId,
      nombre_temporal: nombreTemporal,
      operador_nombre: operadorNombre,
      area,
      cantidad: Number(cantidad),
      created_at: new Date().toISOString()
    }).select('id').single();
    if (error) throw error;
    await loadRegistros();
    return data.id;
  };

  const updateRegistro = async (id, cantidad, isNoCatalogado = false) => {
    const qty = Number(cantidad);
    const table = isNoCatalogado ? 'productos_no_catalogados' : 'registros_detalle';
    const { error } = await requireSupabase().from(table).update({ cantidad: qty }).eq('id', id);
    if (error) throw error;
    await loadRegistros();
  };

  const incrementRegistro = async (id, delta = 1, isNoCatalogado = false) => {
    const table = isNoCatalogado ? 'productos_no_catalogados' : 'registros_detalle';
    const { data: item, error: readError } = await requireSupabase().from(table).select('cantidad').eq('id', id).single();
    if (readError) throw readError;
    const { error } = await requireSupabase().from(table).update({ cantidad: Math.max(0, (Number(item.cantidad) || 0) + delta) }).eq('id', id);
    if (error) throw error;
    await loadRegistros();
  };

  const deleteRegistro = async (id, isNoCatalogado = false) => {
    const table = isNoCatalogado ? 'productos_no_catalogados' : 'registros_detalle';
    const { error } = await requireSupabase().from(table).delete().eq('id', id);
    if (error) throw error;
    await loadRegistros();
  };

  return {
    registros,
    addRegistro,
    addRegistroNoCatalogado,
    updateRegistro,
    incrementRegistro,
    deleteRegistro
  };
}
