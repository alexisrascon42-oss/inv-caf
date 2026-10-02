import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Plus, Pencil, Trash2, Check, X, List, Search, AlertCircle, Save } from 'lucide-react';
import { useTiendas } from '../../hooks/useTiendas';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { requireSupabase } from '../../lib/supabase';

function TiendaProductos({ tienda }) {
  const [productos, setProductos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditingCatalog, setIsEditingCatalog] = useState(false);
  const [draftProducts, setDraftProducts] = useState({});
  const [savingCatalog, setSavingCatalog] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProductos() {
      setLoading(true);
      setError('');
      const { data, error: queryError } = await requireSupabase()
        .from('productos')
        .select('id, tienda_id, codigo_barras, nombre_producto, unidad, es_critico, created_at')
        .eq('tienda_id', tienda.id)
        .order('nombre_producto');
      if (cancelled) return;
      if (queryError) setError(queryError.message || 'No se pudo cargar el catálogo.');
      else setProductos(data || []);
      setLoading(false);
    }

    loadProductos().catch(loadError => {
      if (!cancelled) {
        setError(loadError.message || 'No se pudo cargar el catálogo.');
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [tienda.id]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = productos.filter(producto =>
    [producto.codigo_barras, producto.nombre_producto, producto.unidad]
      .some(value => value?.toLowerCase().includes(normalizedSearch))
  );

  const startCatalogEditing = () => {
    setDraftProducts(Object.fromEntries(productos.map(producto => [producto.id, {
      ...producto,
      unidad: producto.unidad || 'pza'
    }])));
    setIsEditingCatalog(true);
    setError('');
  };

  const updateEditingField = (productId, field, value) => {
    setDraftProducts(current => ({
      ...current,
      [productId]: { ...current[productId], [field]: value }
    }));
  };

  const cancelCatalogEditing = () => {
    setDraftProducts({});
    setIsEditingCatalog(false);
    setError('');
  };

  const saveCatalog = async () => {
    const drafts = Object.values(draftProducts).map(product => ({
      ...product,
      codigo_barras: product.codigo_barras.trim(),
      nombre_producto: product.nombre_producto.trim(),
      es_critico: Boolean(product.es_critico)
    }));
    if (drafts.some(product => !product.codigo_barras || !product.nombre_producto)) {
      setError('El SKU y el nombre son obligatorios en todos los artículos.');
      return;
    }
    const skuSet = new Set();
    for (const product of drafts) {
      const normalizedSku = product.codigo_barras.toLowerCase();
      if (skuSet.has(normalizedSku)) {
        setError(`El SKU ${product.codigo_barras} está repetido en esta tienda.`);
        return;
      }
      skuSet.add(normalizedSku);
    }

    setSavingCatalog(true);
    setError('');
    const { error: updateError } = await requireSupabase().from('productos').upsert(drafts, { onConflict: 'id' });
    if (updateError) {
      setError(updateError.message || 'No se pudo guardar el catálogo. Revisa que los SKU no estén repetidos.');
    } else {
      setProductos(drafts.sort((a, b) => a.nombre_producto.localeCompare(b.nombre_producto)));
      setDraftProducts({});
      setIsEditingCatalog(false);
    }
    setSavingCatalog(false);
  };

  return (
    <section className="space-y-3 border-t px-4 py-4" aria-label={`Artículos de ${tienda.nombre}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">Artículos de {tienda.nombre}</h3>
          <p className="text-xs text-muted-foreground">{loading ? 'Cargando catálogo...' : isEditingCatalog ? `Editando ${productos.length} artículos` : `${productos.length} artículo${productos.length === 1 ? '' : 's'}`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-48 flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar SKU o artículo" className="pl-9" />
          </div>
          {isEditingCatalog ? (
            <>
              <Button variant="outline" onClick={cancelCatalogEditing} disabled={savingCatalog}><X className="mr-2 h-4 w-4" />Cancelar</Button>
              <Button onClick={saveCatalog} disabled={savingCatalog || loading}><Save className="mr-2 h-4 w-4" />{savingCatalog ? 'Guardando...' : 'Guardar cambios'}</Button>
            </>
          ) : (
            <Button variant="outline" onClick={startCatalogEditing} disabled={loading || productos.length === 0}><Pencil className="mr-2 h-4 w-4" />Editar catálogo</Button>
          )}
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>No se pudo cargar el catálogo: {error}</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium">SKU</th>
                <th className="px-3 py-2.5 font-medium">Nombre</th>
                <th className="px-3 py-2.5 font-medium">Unidad de medida</th>
                <th className="px-3 py-2.5 font-medium">Artículo crítico</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="4" className="px-3 py-8 text-center text-muted-foreground">Cargando artículos...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan="4" className="px-3 py-8 text-center text-muted-foreground">{productos.length ? 'No hay resultados para esa búsqueda.' : 'Esta tienda aún no tiene artículos en su catálogo.'}</td></tr>
              ) : filteredProducts.map(producto => {
                const draft = draftProducts[producto.id] || producto;
                return (
                <tr key={producto.id} className="hover:bg-muted/20">
                  {isEditingCatalog ? (
                    <>
                      <td className="px-2 py-2"><Input aria-label={`SKU de ${producto.nombre_producto}`} value={draft.codigo_barras} onChange={event => updateEditingField(producto.id, 'codigo_barras', event.target.value)} disabled={savingCatalog} /></td>
                      <td className="px-2 py-2"><Input aria-label={`Nombre de ${producto.nombre_producto}`} value={draft.nombre_producto} onChange={event => updateEditingField(producto.id, 'nombre_producto', event.target.value)} disabled={savingCatalog} /></td>
                      <td className="px-2 py-2">
                        <select aria-label={`Unidad de ${producto.nombre_producto}`} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={draft.unidad} onChange={event => updateEditingField(producto.id, 'unidad', event.target.value)} disabled={savingCatalog}>
                          {!['kg', 'gr', 'pza', 'ml', 'lts'].includes(draft.unidad) && <option value={draft.unidad}>{draft.unidad}</option>}
                          <option value="kg">kg</option>
                          <option value="gr">g</option>
                          <option value="pza">pza</option>
                          <option value="ml">ml</option>
                          <option value="lts">L</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={Boolean(draft.es_critico)} onChange={event => updateEditingField(producto.id, 'es_critico', event.target.checked)} disabled={savingCatalog} className="h-4 w-4 accent-primary" />
                          Marcar crítico
                        </label>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 text-muted-foreground">{producto.codigo_barras}</td>
                      <td className="px-3 py-2.5 font-medium">{producto.nombre_producto}</td>
                      <td className="px-3 py-2.5">{producto.unidad || 'pieza'}</td>
                      <td className="px-3 py-2.5">{producto.es_critico ? <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700">Crítico</span> : <span className="text-muted-foreground">—</span>}</td>
                    </>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function TiendasPage() {
  const { tiendas, addTienda, updateTienda, deleteTienda } = useTiendas();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [productsStoreId, setProductsStoreId] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    await addTienda(newName.trim());
    setNewName('');
    setLoading(false);
  };

  const handleEdit = (tienda) => {
    setEditingId(tienda.id);
    setEditingName(tienda.nombre);
  };

  const handleSave = async () => {
    if (!editingName.trim()) return;
    await updateTienda(editingId, editingName.trim());
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta tienda? Se perderán todos sus productos y sesiones.')) {
      await deleteTienda(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-xl">
          <Store className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gestión de Tiendas</h1>
          <p className="text-muted-foreground text-sm">{tiendas.length} tienda{tiendas.length !== 1 ? 's' : ''} registrada{tiendas.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Add new */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Nueva Tienda</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Nombre de la tienda..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={!newName.trim() || loading}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-2">
        <AnimatePresence>
          {tiendas.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-muted-foreground"
            >
              <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay tiendas registradas</p>
              <p className="text-sm">Agrega una tienda para comenzar</p>
            </motion.div>
          ) : (
            tiendas.map(tienda => (
              <motion.div
                key={tienda.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex min-w-0 items-center gap-4 sm:flex-1">
                      <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                        <Store className="h-5 w-5 text-primary" />
                      </div>

                      {editingId === tienda.id ? (
                        <Input
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditingId(null); }}
                          autoFocus
                          className="min-w-0 flex-1"
                        />
                      ) : (
                        <span className="min-w-0 flex-1 truncate font-medium">{tienda.nombre}</span>
                      )}
                    </div>

                    <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                      {editingId === tienda.id ? (
                        <>
                          <Button size="icon" variant="ghost" onClick={handleSave} className="text-green-500 hover:text-green-600">
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" aria-expanded={productsStoreId === tienda.id} onClick={() => setProductsStoreId(productsStoreId === tienda.id ? null : tienda.id)}>
                            <List className="mr-2 h-4 w-4" />
                            {productsStoreId === tienda.id ? 'Ocultar artículos' : 'Artículos'}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(tienda)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(tienda.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                  <AnimatePresence>
                    {productsStoreId === tienda.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <TiendaProductos tienda={tienda} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
