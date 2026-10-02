import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, ArrowLeft, ArrowRight, Check, ClipboardCopy, ClipboardList, Store } from 'lucide-react';
import { useTiendas } from '../../hooks/useTiendas';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { requireSupabase } from '../../lib/supabase';

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - weekday);
  return result;
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function formatQuantity(value) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function getDifference(counted, system) {
  if (system === null || system === undefined || system === '') return null;
  return Number(counted) - Number(system);
}

function getDailyVarianceSummary(count) {
  if (count?.estado !== 'revisado' || !count.detalles?.length) return null;
  const hasSystemValue = count.detalles.every(detail => detail.existencia_sistema !== null && detail.existencia_sistema !== undefined);
  if (!hasSystemValue) return null;
  return {
    withDifference: count.detalles.filter(detail => Number(detail.cantidad_contada) !== Number(detail.existencia_sistema)).length,
    total: count.detalles.length
  };
}

export default function CriticalCountsPage() {
  const { tiendas } = useTiendas();
  const { user } = useAuth();
  const [storeId, setStoreId] = useState('');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [products, setProducts] = useState([]);
  const [counts, setCounts] = useState([]);
  const [systemValues, setSystemValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const activeStore = tiendas.find(tienda => String(tienda.id) === storeId);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekStartKey = dateKey(weekStart);
  const weekEndKey = dateKey(weekDays[6]);
  const selectedCount = counts.find(count => count.fecha === selectedDate);
  const selectedDetails = selectedCount?.detalles || [];
  const detailsByProduct = new Map(selectedDetails.map(detail => [detail.producto_id, detail]));

  useEffect(() => {
    if (!storeId && tiendas.length) setStoreId(String(tiendas[0].id));
  }, [storeId, tiendas]);

  useEffect(() => {
    if (selectedDate < weekStartKey || selectedDate > weekEndKey) setSelectedDate(weekStartKey);
  }, [weekStartKey, weekEndKey, selectedDate]);

  useEffect(() => {
    if (!storeId) return undefined;
    let cancelled = false;

    async function loadWeek() {
      setLoading(true);
      setError('');
      const client = requireSupabase();
      const [productResult, countResult] = await Promise.all([
        client.from('productos').select('id, codigo_barras, nombre_producto, unidad').eq('tienda_id', storeId).eq('es_critico', true).order('nombre_producto'),
        client.from('conteos_criticos_diarios')
          .select('id, fecha, operador_nombre, estado, detalles:conteos_criticos_detalle(producto_id, cantidad_contada, existencia_sistema)')
          .eq('tienda_id', storeId)
          .gte('fecha', weekStartKey)
          .lte('fecha', weekEndKey)
          .order('fecha')
      ]);

      if (cancelled) return;
      if (productResult.error || countResult.error) {
        setError((productResult.error || countResult.error).message || 'No se pudieron cargar los conteos críticos.');
      } else {
        setProducts(productResult.data || []);
        setCounts(countResult.data || []);
      }
      setLoading(false);
    }

    loadWeek().catch(loadError => {
      if (!cancelled) {
        setError(loadError.message || 'No se pudieron cargar los conteos críticos.');
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [storeId, weekStartKey, weekEndKey]);

  useEffect(() => {
    setSystemValues(Object.fromEntries(selectedDetails.map(detail => [
      detail.producto_id,
      detail.existencia_sistema === null ? '' : String(detail.existencia_sistema)
    ])));
    setMessage('');
  }, [selectedCount?.id]);

  const changeWeek = direction => setWeekStart(current => addDays(current, direction * 7));

  const saveReview = async () => {
    if (selectedCount?.estado === 'revisado') return;
    if (selectedDetails.some(detail => systemValues[detail.producto_id] === '' || !Number.isFinite(Number(systemValues[detail.producto_id])) || Number(systemValues[detail.producto_id]) < 0)) {
      setError('Ingresa una existencia del sistema válida para cada artículo. Usa cero si no hay existencia.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    const client = requireSupabase();
    const updates = await Promise.all(selectedDetails.map(detail => client
      .from('conteos_criticos_detalle')
      .update({ existencia_sistema: Number(systemValues[detail.producto_id]) })
      .eq('conteo_id', selectedCount.id)
      .eq('producto_id', detail.producto_id)));
    const updateError = updates.find(result => result.error)?.error;

    if (updateError) {
      setError(updateError.message || 'No se pudieron guardar las existencias.');
      setSaving(false);
      return;
    }

    const { error: authError, data: authData } = await client.auth.getUser();
    if (authError) {
      setError(authError.message);
      setSaving(false);
      return;
    }

    const reviewedAt = new Date().toISOString();
    const { error: reviewError } = await client.from('conteos_criticos_diarios').update({
      estado: 'revisado',
      revisado_at: reviewedAt,
      revisado_por: authData.user?.id || user?.id
    }).eq('id', selectedCount.id);

    if (reviewError) {
      setError(reviewError.message || 'Se guardaron las existencias, pero no se pudo confirmar la revisión.');
      setSaving(false);
      return;
    }

    setCounts(current => current.map(count => count.id === selectedCount.id ? {
      ...count,
      estado: 'revisado',
      revisado_at: reviewedAt,
      detalles: count.detalles.map(detail => ({ ...detail, existencia_sistema: Number(systemValues[detail.producto_id]) }))
    } : count));
    setMessage('Revisión guardada. Las diferencias ya están confirmadas.');
    setSaving(false);
  };

  const dateFormat = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });
  const weekLabel = `${dateFormat.format(weekStart)} - ${dateFormat.format(weekDays[6])}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-500/10 p-2"><Activity className="h-6 w-6 text-amber-600" /></div>
          <div>
            <h1 className="text-2xl font-bold">Conteo diario crítico</h1>
            <p className="text-sm text-muted-foreground">Revisa las cantidades de cierre contra la existencia del sistema</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Store className="h-4 w-4 text-muted-foreground" />
          <select className="h-10 rounded-lg border bg-background px-3" value={storeId} onChange={event => setStoreId(event.target.value)}>
            {tiendas.map(tienda => <option key={tienda.id} value={tienda.id}>{tienda.nombre}</option>)}
          </select>
        </label>
      </header>

      {!activeStore ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Crea una tienda para configurar el conteo crítico.</div>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Código de captura de {activeStore.nombre}</p>
              <p className="text-xs text-muted-foreground">Compártelo con la persona responsable del conteo diario.</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="rounded-md bg-muted px-3 py-2 text-sm font-semibold tracking-widest">{activeStore.codigo_critico || 'Ejecuta la migración'}</code>
              <Button size="icon" variant="outline" title="Copiar código de captura" disabled={!activeStore.codigo_critico} onClick={() => navigator.clipboard?.writeText(activeStore.codigo_critico)}>
                <ClipboardCopy className="h-4 w-4" />
              </Button>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <div className="flex items-center gap-3">
                <Button size="icon" variant="outline" title="Semana anterior" onClick={() => changeWeek(-1)}><ArrowLeft className="h-4 w-4" /></Button>
                <h2 className="min-w-36 text-center font-semibold">{weekLabel}</h2>
                <Button size="icon" variant="outline" title="Semana siguiente" onClick={() => changeWeek(1)}><ArrowRight className="h-4 w-4" /></Button>
              </div>
              <span className="text-sm text-muted-foreground">{products.length} artículo{products.length === 1 ? '' : 's'} crítico{products.length === 1 ? '' : 's'}</span>
            </div>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            {products.length === 0 && !loading ? (
              <div className="p-8 text-center">
                <ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="font-medium">Aún no hay artículos críticos</p>
                <p className="text-sm text-muted-foreground">Márcalos desde Tiendas &gt; Artículos &gt; Editar artículo.</p>
              </div>
            ) : (
              <div className="lg:hidden">
                <div className="grid grid-cols-7 gap-1 border-b bg-muted/20 p-2">
                  {weekDays.map(day => {
                    const key = dateKey(day);
                    const count = counts.find(item => item.fecha === key);
                    const isSelected = selectedDate === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDate(key)}
                        aria-pressed={isSelected}
                        aria-label={`${new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(day)}${count ? `, ${count.estado}, ${count.operador_nombre}` : ', sin conteo'}`}
                        className={`flex min-h-14 min-w-0 flex-col items-center justify-center rounded-lg px-1 py-1.5 text-center ${isSelected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                      >
                        <span className="text-[10px] capitalize">{new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(day).replace('.', '')}</span>
                        <span className="text-sm font-semibold">{day.getDate()}</span>
                        {count && <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : count.estado === 'revisado' ? 'bg-green-600' : 'bg-amber-500'}`} />}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2 p-3">
                  {loading ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Cargando día...</p>
                  ) : products.map(product => {
                    const detail = detailsByProduct.get(product.id);
                    const difference = selectedCount?.estado === 'revisado' && detail
                      ? getDifference(detail.cantidad_contada, detail.existencia_sistema)
                      : null;
                    return (
                      <article key={product.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border bg-card p-3">
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs text-muted-foreground">{product.codigo_barras}</span>
                          <span className="block break-words text-sm font-medium">{product.nombre_producto}</span>
                        </div>
                        <div className="shrink-0 text-right">
                          {detail ? (
                            <>
                              <span className="block text-sm font-semibold tabular-nums">{formatQuantity(detail.cantidad_contada)} {product.unidad}</span>
                              {difference !== null && <span className={`block text-xs font-semibold tabular-nums ${difference < 0 ? 'text-destructive' : difference > 0 ? 'text-amber-700' : 'text-green-700'}`}>{difference > 0 ? '+' : ''}{formatQuantity(difference)} {product.unidad}</span>}
                            </>
                          ) : <span className="text-sm text-muted-foreground">—</span>}
                        </div>
                      </article>
                    );
                  })}
                  {!loading && selectedCount && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-1 pt-3 text-sm">
                      <span className="text-muted-foreground">Conteo de <strong className="text-foreground">{selectedCount.operador_nombre}</strong></span>
                      {(() => {
                        const summary = getDailyVarianceSummary(selectedCount);
                        return summary ? <span className={`font-semibold ${summary.withDifference ? 'text-amber-700' : 'text-green-700'}`}>{summary.withDifference} / {summary.total} SKUs con diferencia</span> : <span className="text-amber-700">Pendiente de revisión</span>;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {products.length > 0 && (
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="sticky left-0 min-w-56 bg-muted/40 px-3 py-3 font-medium">SKU · Artículo</th>
                      {weekDays.map(day => {
                        const key = dateKey(day);
                        const count = counts.find(item => item.fecha === key);
                        return (
                          <th key={key} className="min-w-28 px-2 py-2 text-center font-medium">
                            <button type="button" onClick={() => setSelectedDate(key)} aria-pressed={selectedDate === key} className={`w-full rounded-md px-2 py-1.5 ${selectedDate === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                              <span className="block capitalize">{new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(day)}</span>
                              <span className="block">{dateFormat.format(day)}</span>
                              {count?.operador_nombre && <span className="mt-1 block truncate text-[11px]">{count.operador_nombre}</span>}
                              {count && <span className="mt-1 block text-[10px]">{count.estado === 'revisado' ? 'Revisado' : 'Pendiente'}</span>}
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr><td colSpan="8" className="px-4 py-8 text-center text-muted-foreground">Cargando semana...</td></tr>
                    ) : products.map(product => (
                      <tr key={product.id} className="hover:bg-muted/20">
                        <td className="sticky left-0 bg-card px-3 py-2.5">
                          <span className="block text-xs text-muted-foreground">{product.codigo_barras}</span>
                          <span className="font-medium">{product.nombre_producto}</span>
                        </td>
                        {weekDays.map(day => {
                          const count = counts.find(item => item.fecha === dateKey(day));
                          const detail = count?.detalles?.find(item => item.producto_id === product.id);
                          const difference = count?.estado === 'revisado' && detail
                            ? getDifference(detail.cantidad_contada, detail.existencia_sistema)
                            : null;
                          return (
                            <td key={dateKey(day)} className={`px-2 py-2 text-center ${selectedDate === dateKey(day) ? 'bg-primary/5' : ''}`}>
                              {detail ? (
                                <>
                                  <span className="block font-semibold tabular-nums">{formatQuantity(detail.cantidad_contada)} {product.unidad}</span>
                                  {difference !== null && (
                                    <span className={`mt-0.5 block text-xs font-semibold tabular-nums ${difference < 0 ? 'text-destructive' : difference > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                                      {difference > 0 ? '+' : ''}{formatQuantity(difference)} {product.unidad}
                                    </span>
                                  )}
                                </>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {!loading && products.length === 0 && <tr><td colSpan="8" className="px-4 py-8 text-center text-muted-foreground">No hay productos marcados como críticos.</td></tr>}
                  </tbody>
                  <tfoot className="border-t bg-muted/30">
                    <tr>
                      <th className="sticky left-0 bg-muted/30 px-3 py-3 text-left font-semibold">SKUs con diferencia</th>
                      {weekDays.map(day => {
                        const count = counts.find(item => item.fecha === dateKey(day));
                        const summary = getDailyVarianceSummary(count);
                        const color = summary === null ? 'text-muted-foreground' : summary.withDifference === 0 ? 'text-green-700' : 'text-amber-700';
                        return (
                          <td key={dateKey(day)} className={`px-2 py-3 text-center font-semibold tabular-nums ${color} ${selectedDate === dateKey(day) ? 'bg-primary/5' : ''}`}>
                            {summary ? <><span className="block">{summary.withDifference} / {summary.total}</span><span className="block text-[10px] font-normal">artículos</span></> : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {selectedCount && (
            <section className="space-y-4 rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Revisión del {dateFormat.format(new Date(`${selectedDate}T12:00:00`))}</h2>
                  <p className="text-sm text-muted-foreground">Conteo realizado por <strong className="text-foreground">{selectedCount.operador_nombre}</strong></p>
                  {selectedCount.estado === 'revisado' && <p className="mt-1 text-xs font-medium text-green-700">Revisión guardada y bloqueada para edición.</p>}
                </div>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${selectedCount.estado === 'revisado' ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700'}`}>
                  {selectedCount.estado === 'revisado' ? 'Revisado' : 'Pendiente de revisión'}
                </span>
              </div>

              <div className="space-y-2 lg:hidden">
                {selectedDetails.map(detail => {
                  const product = products.find(item => item.id === detail.producto_id);
                  const difference = getDifference(detail.cantidad_contada, systemValues[detail.producto_id]);
                  return (
                    <article key={detail.producto_id} className="space-y-3 rounded-lg border p-3">
                      <div>
                        <span className="block text-xs text-muted-foreground">{product?.codigo_barras || ''}</span>
                        <span className="break-words text-sm font-medium">{product?.nombre_producto || 'Artículo'}</span>
                      </div>
                      <div className="grid grid-cols-2 items-end gap-3">
                        <div className="min-w-0">
                          <span className="block text-xs text-muted-foreground">Conteo al cierre</span>
                          <span className="mt-2 block text-sm font-semibold tabular-nums">{formatQuantity(detail.cantidad_contada)} {product?.unidad}</span>
                        </div>
                        <label className="min-w-0 space-y-1 text-xs text-muted-foreground">
                          <span>Existencia sistema</span>
                          <Input type="number" min="0" step="any" inputMode="decimal" aria-label={`Existencia del sistema para ${product?.nombre_producto || 'artículo'}`} value={systemValues[detail.producto_id] ?? ''} onChange={event => setSystemValues(current => ({ ...current, [detail.producto_id]: event.target.value }))} disabled={selectedCount.estado === 'revisado'} className="w-full" />
                        </label>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2 text-xs">
                        <span className="text-muted-foreground">Diferencia</span>
                        <span className={`font-semibold tabular-nums ${difference === null ? 'text-muted-foreground' : difference < 0 ? 'text-destructive' : difference > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                          {difference === null ? 'Pendiente' : `${difference > 0 ? '+' : ''}${formatQuantity(difference)} ${product?.unidad}`}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto rounded-lg border lg:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Artículo</th>
                      <th className="px-3 py-2.5 text-right font-medium">Conteo al cierre</th>
                      <th className="px-3 py-2.5 font-medium">Existencia sistema</th>
                      <th className="px-3 py-2.5 text-right font-medium">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedDetails.map(detail => {
                      const product = products.find(item => item.id === detail.producto_id);
                      const difference = getDifference(detail.cantidad_contada, systemValues[detail.producto_id]);
                      return (
                        <tr key={detail.producto_id}>
                          <td className="px-3 py-2.5"><span className="block text-xs text-muted-foreground">{product?.codigo_barras || ''}</span><span className="font-medium">{product?.nombre_producto || 'Artículo'}</span></td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatQuantity(detail.cantidad_contada)} {product?.unidad}</td>
                          <td className="px-3 py-2.5"><Input type="number" min="0" step="any" inputMode="decimal" aria-label={`Existencia del sistema para ${product?.nombre_producto || 'artículo'}`} value={systemValues[detail.producto_id] ?? ''} onChange={event => setSystemValues(current => ({ ...current, [detail.producto_id]: event.target.value }))} disabled={selectedCount.estado === 'revisado'} className="max-w-44" /></td>
                          <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${difference === null ? 'text-muted-foreground' : difference < 0 ? 'text-destructive' : difference > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                            {difference === null ? 'Pendiente' : `${difference > 0 ? '+' : ''}${formatQuantity(difference)} ${product?.unidad}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">Diferencia = conteo físico al cierre menos existencia del sistema.</p>
                <Button onClick={saveReview} disabled={saving || selectedDetails.length === 0 || selectedCount.estado === 'revisado'}>
                  <Check className="mr-2 h-4 w-4" />
                  {saving ? 'Guardando...' : selectedCount.estado === 'revisado' ? 'Revisión finalizada' : 'Guardar revisión'}
                </Button>
              </div>
              {message && <p className="text-sm text-green-700" role="status">{message}</p>}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ErrorMessage({ children }) {
  return (
    <div className="m-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}