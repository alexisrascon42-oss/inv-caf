import { useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';

export function useTiendas() {
  const [tiendas, setTiendas] = useState([]);

  const loadTiendas = async () => {
    const { data, error } = await requireSupabase().from('tiendas').select('*').order('nombre');
    if (error) throw error;
    setTiendas(data || []);
  };

  useEffect(() => {
    loadTiendas().catch(console.error);
  }, []);

  const addTienda = async (nombre) => {
    const client = requireSupabase();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user || userData.user.is_anonymous) throw new Error('Debes iniciar sesión como administrador.');
    const { data, error } = await client.from('tiendas').insert({ nombre, owner_id: userData.user.id }).select().single();
    if (error) throw error;
    setTiendas(current => [...current, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return data.id;
  };

  const updateTienda = async (id, nombre) => {
    const { error } = await requireSupabase().from('tiendas').update({ nombre }).eq('id', id);
    if (error) throw error;
    setTiendas(current => current.map(tienda => tienda.id === id ? { ...tienda, nombre } : tienda));
  };

  const deleteTienda = async (id) => {
    const { error } = await requireSupabase().from('tiendas').delete().eq('id', id);
    if (error) throw error;
    setTiendas(current => current.filter(tienda => tienda.id !== id));
  };

  return { tiendas, addTienda, updateTienda, deleteTienda };
}
