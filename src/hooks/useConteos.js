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
    setConteos(data || []);
  };

  useEffect(() => {
    loadConteos().catch(console.error);
  }, [tiendaId]);

  const addConteo = async (nombre_sesion) => {
    const { data, error } = await requireSupabase().from('conteos').insert({
      tienda_id: tiendaId,
      nombre_sesion,
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

  const deleteConteo = async (id) => {
    const { error } = await requireSupabase().from('conteos').delete().eq('id', id);
    if (error) throw error;
    setConteos(current => current.filter(conteo => conteo.id !== id));
  };

  return { conteos, addConteo, updateEstado, deleteConteo };
}
