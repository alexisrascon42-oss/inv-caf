import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Plus, Lock, Unlock, Trash2, ChevronDown, ChevronUp, Calendar, KeyRound, Copy, Users, Eye, EyeOff, Search, RefreshCw, AlertCircle, Clock3, Save } from 'lucide-react';
import { useTiendas } from '../../hooks/useTiendas';
import { useConteos } from '../../hooks/useConteos';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { requireSupabase } from '../../lib/supabase';

function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin vencimiento';
}

function ConteoDetalle({ conteo, onUpdateExpiration }) {
  const [registros, setRegistros] = useState([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('detail');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [expiration, setExpiration] = useState(toLocalDateTime(conteo.expires_at));
  const [savingExpiration, setSavingExpiration] = useState(false);
  const [expirationMessage, setExpirationMessage] = useState('');

  useEffect(() => {
    setExpiration(toLocalDateTime(conteo.expires_at));
  }, [conteo.expires_at]);

  const saveExpiration = async () => {
    const expiresAt = new Date(expiration);
    if (!expiration || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      setExpirationMessage('Elige una fecha y hora futuras.');
      return;
    }
    setSavingExpiration(true);
    setExpirationMessage('');
    try {
      await onUpdateExpiration(conteo.id, expiresAt.toISOString());
      setExpirationMessage('Vencimiento actualizado.');
    } catch (saveError) {
      setExpirationMessage(saveError.message || 'No se pudo actualizar el vencimiento.');
    } finally {
      setSavingExpiration(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadRegistros() {
      setLoading(true);
      setError('');
      try {
        const client = requireSupabase();
        const [{ data: detalle, error: detalleError }, { data: noCatalogados, error: noCatalogadosError }] = await Promise.all([
          client.from('registros_detalle').select('*, productos(nombre_producto, codigo_barras, unidad)').eq('conteo_id', conteo.id).order('created_at', { ascending: false }),
          client.from('productos_no_catalogados').select('*').eq('conteo_id', conteo.id).order('created_at', { ascending: false })
        ]);
        if (detalleError) throw detalleError;
        if (noCatalogadosError) throw noCatalogadosError;

        const rows = [
          ...(detalle || []).map(registro => ({
            ...registro,
            producto_nombre: registro.productos?.nombre_producto || 'Producto sin catálogo',
            codigo_barras: registro.productos?.codigo_barras || '—',
            unidad: registro.productos?.unidad || 'pieza',
            no_catalogado: false
          })),
          ...(noCatalogados || []).map(registro => ({
            ...registro,
            producto_nombre: registro.nombre_temporal,
            codigo_barras: 'Sin código',
            unidad: 'pieza',
            no_catalogado: true
          }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (!cancelled) setRegistros(rows);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'No se pudieron cargar los registros de este conteo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRegistros();
    return () => { cancelled = true; };
  }, [conteo.id, refreshKey]);

  const query = search.trim().toLowerCase();
  const filtered = registros.filter(registro => [
    registro.producto_nombre,
    registro.codigo_barras,
    registro.operador_nombre,
    registro.area
  ].some(value => value?.toLowerCase().includes(query)));
  const summary = [...filtered.reduce((products, registro) => {
    const nameKey = registro.producto_nombre.trim().toLowerCase();
    const key = registro.no_catalogado ? `temporal:${nameKey}` : `catalogado:${registro.producto_id}`;
    const product = products.get(key) || {
      key,
      sku: registro.codigo_barras,
      nombre: registro.producto_nombre,
      unidad: registro.unidad,
      total: 0,
      no_catalogado: registro.no_catalogado
    };
    product.total += Number(registro.cantidad) || 0;
    products.set(key, product);
    return products;
  }, new Map()).values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const total = registros.reduce((sum, registro) => sum + (Number(registro.cantidad) || 0), 0);
  const productCount = new Set(registros.map(registro => `${registro.no_catalogado ? 'temporal' : 'producto'}:${registro.producto_id || registro.nombre_temporal}`)).size;
  const formatQuantity = value => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(Number(value) || 0);

  return (
    <section className="border-t px-4 py-4" aria-label={`Detalle de ${conteo.nombre_sesion}`}>
      <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4 text-primary" /> Cierre automático</p>
          <p className="mt-1 text-xs text-muted-foreground">Vence: {formatDateTime(conteo.expires_at)}</p>
          {expirationMessage && <p className="mt-1 text-xs text-muted-foreground" role="status">{expirationMessage}</p>}
        </div>
        <div className="flex items-end gap-2">
          <label className="min-w-0 space-y-1 text-xs text-muted-foreground">
            <span>Modificar vencimiento</span>
            <Input type="datetime-local" min={toLocalDateTime(new Date())} value={expiration} onChange={event => { setExpiration(event.target.value); setExpirationMessage(''); }} />
          </label>
          <Button size="icon" variant="outline" title="Guardar vencimiento" onClick={saveExpiration} disabled={savingExpiration || !expiration}>
            <Save className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">Datos del conteo</h3>
          <p className="text-xs text-muted-foreground">{registros.length} registros · {productCount} productos · Cantidad total: {formatQuantity(total)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border bg-muted/40 p-1" role="tablist" aria-label="Vista de datos del conteo">
            <button type="button" role="tab" aria-selected={viewMode === 'summary'} onClick={() => setViewMode('summary')} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'summary' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              Resumen
            </button>
            <button type="button" role="tab" aria-selected={viewMode === 'detail'} onClick={() => setViewMode('detail')} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'detail' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              Detalle
            </button>
          </div>
          <div className="relative min-w-0 flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar producto, área o persona" className="pl-9" />
          </div>
          <Button size="icon" variant="outline" title="Actualizar datos" onClick={() => setRefreshKey(value => value + 1)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>No se pudieron cargar los registros: {error}</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          {viewMode === 'summary' ? (
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">SKU</th>
                  <th className="px-3 py-2.5 font-medium">Artículo</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan="3" className="px-3 py-8 text-center text-muted-foreground">Cargando registros...</td></tr>
                ) : summary.length === 0 ? (
                  <tr><td colSpan="3" className="px-3 py-8 text-center text-muted-foreground">{registros.length ? 'No hay resultados para esa búsqueda.' : 'Este conteo aún no tiene registros.'}</td></tr>
                ) : summary.map(product => (
                  <tr key={product.key} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 text-muted-foreground">{product.sku}</td>
                    <td className="px-3 py-2.5 font-medium">
                      {product.nombre}
                      {product.no_catalogado && <span className="ml-2 text-xs font-normal text-amber-600">Fuera de catálogo</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatQuantity(product.total)} {product.unidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Producto</th>
                  <th className="px-3 py-2.5 font-medium">Código</th>
                  <th className="px-3 py-2.5 font-medium">Área</th>
                  <th className="px-3 py-2.5 font-medium">Contado por</th>
                  <th className="px-3 py-2.5 text-right font-medium">Cantidad</th>
                  <th className="px-3 py-2.5 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan="6" className="px-3 py-8 text-center text-muted-foreground">Cargando registros...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6" className="px-3 py-8 text-center text-muted-foreground">{registros.length ? 'No hay resultados para esa búsqueda.' : 'Este conteo aún no tiene registros.'}</td></tr>
                ) : filtered.map(registro => (
                  <tr key={`${registro.no_catalogado ? 'temporal' : 'catalogado'}-${registro.id}`} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 font-medium">
                      <span>{registro.producto_nombre}</span>
                      {registro.no_catalogado && <span className="ml-2 text-xs font-normal text-amber-600">Fuera de catálogo</span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{registro.codigo_barras}</td>
                    <td className="px-3 py-2.5">{registro.area || '—'}</td>
                    <td className="px-3 py-2.5">{registro.operador_nombre || 'Sin nombre'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatQuantity(registro.cantidad)} {registro.unidad}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{registro.created_at ? new Date(registro.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}

function ConteoRow({ conteo, onToggleEstado, onUpdateExpiration, onDelete }) {
  const estadoAbierto = conteo.estado === 'abierto';
  const vencido = estadoAbierto && conteo.expires_at && new Date(conteo.expires_at).getTime() <= Date.now();
  const fecha = conteo.created_at ? new Date(conteo.created_at).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—';
  const [showDetail, setShowDetail] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3 sm:gap-4">
          <div className={`p-2 rounded-lg ${estadoAbierto ? 'bg-green-500/10' : 'bg-muted'}`}>
            <FileSpreadsheet className={`w-5 h-5 ${estadoAbierto ? 'text-green-600' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{conteo.nombre_sesion}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{fecha}</span>
              {conteo.expires_at && <span className={`text-xs ${vencido ? 'text-destructive' : 'text-muted-foreground'}`}>· {vencido ? 'Vencimiento cumplido' : `Vence ${formatDateTime(conteo.expires_at)}`}</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-primary font-semibold">
              <KeyRound className="w-3.5 h-3.5" /> Código: {conteo.codigo_acceso || 'Sin código'}
              {conteo.codigo_acceso && <button title="Copiar código" onClick={() => navigator.clipboard?.writeText(conteo.codigo_acceso)}><Copy className="w-3.5 h-3.5" /></button>}
            </div>
            {conteo.colaboradores?.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Users className="w-3.5 h-3.5" /> Colaboradores
                </div>
                <div className="flex flex-wrap gap-2">
                  {conteo.colaboradores.map(colaborador => (
                    <span key={colaborador.nombre} className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs text-foreground">
                      <strong>{colaborador.nombre}</strong>
                      <span className="text-muted-foreground">{colaborador.articulos} artículos · {colaborador.piezas} pzas</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Badge variant={vencido ? 'destructive' : estadoAbierto ? 'default' : 'secondary'}>
            {vencido ? 'Vencido' : estadoAbierto ? 'Abierto' : 'Cerrado'}
          </Badge>
          <div className="flex gap-1 ml-auto">
            <Button size="sm" variant="outline" title={showDetail ? 'Ocultar datos del conteo' : 'Ver datos del conteo'} onClick={() => setShowDetail(value => !value)}>
              {showDetail ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {showDetail ? 'Ocultar datos' : 'Ver datos'}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title={estadoAbierto ? 'Cerrar sesión' : 'Reabrir sesión'}
              onClick={() => onToggleEstado(conteo)}
              className={estadoAbierto ? 'text-amber-500 hover:text-amber-600' : 'text-green-500 hover:text-green-600'}
            >
              {estadoAbierto ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(conteo)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
        {showDetail && <ConteoDetalle conteo={conteo} onUpdateExpiration={onUpdateExpiration} />}
      </Card>
    </motion.div>
  );
}

function TiendaSection({ tienda }) {
  const { conteos, addConteo, updateEstado, updateExpiration, deleteConteo } = useConteos(tienda.id);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addConteo(newName.trim());
    setNewName('');
  };

  const handleToggle = async (conteo) => {
    const next = conteo.estado === 'abierto' ? 'cerrado' : 'abierto';
    if (next === 'abierto' && conteo.expires_at && new Date(conteo.expires_at).getTime() <= Date.now()) {
      window.alert('Actualiza el vencimiento en Ver datos antes de reabrir esta sesión.');
      return;
    }
    await updateEstado(conteo.id, next);
  };

  const handleDelete = async (conteo) => {
    if (window.confirm(`¿Eliminar sesión "${conteo.nombre_sesion}" y todos sus registros?`)) {
      await deleteConteo(conteo.id);
    }
  };

  const abiertos = conteos.filter(c => c.estado === 'abierto' && (!c.expires_at || new Date(c.expires_at).getTime() > Date.now())).length;

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="bg-primary/10 p-2 rounded-lg">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">{tienda.nombre}</p>
          <p className="text-xs text-muted-foreground">{conteos.length} sesión(es) · {abiertos} abierta(s)</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t pt-4">
              {/* Add new sesion */}
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre de la sesión (ej. Inventario Septiembre)..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Conteos */}
              <div className="space-y-2">
                <AnimatePresence>
                  {conteos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay sesiones. Crea una nueva arriba.</p>
                  ) : (
                    conteos.map(c => (
                      <ConteoRow key={c.id} conteo={c} onToggleEstado={handleToggle} onUpdateExpiration={updateExpiration} onDelete={handleDelete} />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function SesionesPage() {
  const { tiendas } = useTiendas();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-xl">
          <FileSpreadsheet className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sesiones de Conteo</h1>
          <p className="text-muted-foreground text-sm">Gestiona y controla las sesiones por tienda</p>
        </div>
      </div>

      {tiendas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay tiendas registradas</p>
          <p className="text-sm">Primero crea una tienda en la sección de Tiendas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tiendas.map(tienda => (
            <TiendaSection key={tienda.id} tienda={tienda} />
          ))}
        </div>
      )}
    </div>
  );
}
