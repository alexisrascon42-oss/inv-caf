import { useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';

export function useProductos(tiendaId) {
  const [productos, setProductos] = useState([]);

  const loadProductos = async () => {
    if (!tiendaId) {
      setProductos([]);
      return;
    }
    const { data, error } = await requireSupabase()
      .from('productos')
      .select('*')
      .eq('tienda_id', tiendaId)
      .order('nombre_producto');
    if (error) throw error;
    setProductos(data || []);
  };

  useEffect(() => {
    loadProductos().catch(console.error);
  }, [tiendaId]);

  const addProducto = async (producto) => {
    const { data, error } = await requireSupabase().from('productos').insert({ ...producto, tienda_id: tiendaId }).select().single();
    if (error) throw error;
    setProductos(current => [...current, data]);
    return data.id;
  };

  const updateProducto = async (id, changes) => {
    const { error } = await requireSupabase().from('productos').update(changes).eq('id', id);
    if (error) throw error;
    setProductos(current => current.map(producto => producto.id === id ? { ...producto, ...changes } : producto));
  };

  const deleteProducto = async (id) => {
    const { error } = await requireSupabase().from('productos').delete().eq('id', id);
    if (error) throw error;
    setProductos(current => current.filter(producto => producto.id !== id));
  };

  // Utility to clear all products for a store (e.g. before importing new catalog)
  const clearProductos = async () => {
    if (tiendaId) {
      const { error } = await requireSupabase().from('productos').delete().eq('tienda_id', tiendaId);
      if (error) throw error;
      setProductos([]);
    }
  };

  return { productos, addProducto, updateProducto, deleteProducto, clearProductos };
}
