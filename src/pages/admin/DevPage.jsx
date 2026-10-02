import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, Building2, Clock3, RefreshCw, Search, Users } from 'lucide-react';
import { requireSupabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

function formatDate(value) {
  if (!value) return 'Sin actividad';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatDateOnly(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`));
}

export default function DevPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadClients = async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await requireSupabase().rpc('get_dev_client_usage');
    if (queryError) {
      setError('No se pudieron cargar los clientes. Verifica que la migración de métricas Dev esté aplicada en Supabase.');
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredClients = clients.filter(client =>
    client.correo?.toLowerCase().includes(normalizedSearch) || client.tienda?.toLowerCase().includes(normalizedSearch)
  );
  const activeClients = new Set(clients.filter(client => client.activo).map(client => client.owner_id)).size;
  const totalRecords = clients.reduce((total, client) => total + Number(client.registros_30_dias || 0), 0);
  const totalStores = clients.length;
  const criticalCounts = clients.reduce((total, client) => total + Number(client.conteos_criticos_30_dias || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel Dev</h1>
          <p className="text-sm text-muted-foreground">Actividad de clientes y uso de InventarioApp</p>
        </div>
        <Button variant="outline" onClick={loadClients} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de uso">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /> Clientes activos</div>
              <p className="mt-2 text-2xl font-semibold">{loading ? '—' : activeClients}</p>
              <p className="text-xs text-muted-foreground">Con actividad en los últimos 30 días</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="h-4 w-4" /> Tiendas registradas</div>
              <p className="mt-2 text-2xl font-semibold">{loading ? '—' : totalStores}</p>
              <p className="text-xs text-muted-foreground">En todas las cuentas</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Activity className="h-4 w-4" /> Registros recientes</div>
              <p className="mt-2 text-2xl font-semibold">{loading ? '—' : totalRecords}</p>
              <p className="text-xs text-muted-foreground">Inventario normal en 30 días</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Activity className="h-4 w-4" /> Conteos críticos</div>
              <p className="mt-2 text-2xl font-semibold">{loading ? '—' : criticalCounts}</p>
              <p className="text-xs text-muted-foreground">Conteos diarios en 30 días</p>
            </div>
          </section>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar cliente o sucursal" className="pl-9" />
          </div>

          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Sucursal</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Sesiones</th>
                    <th className="px-4 py-3 text-right font-medium">Registros normales / 30 días</th>
                    <th className="px-4 py-3 text-right font-medium">Conteos críticos / 30 días</th>
                    <th className="px-4 py-3 text-right font-medium">Revisados</th>
                    <th className="px-4 py-3 text-right font-medium">SKUs con diferencia</th>
                    <th className="px-4 py-3 font-medium">Último conteo crítico</th>
                    <th className="px-4 py-3 font-medium">Última actividad</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr><td colSpan="10" className="px-4 py-10 text-center text-muted-foreground">Cargando sucursales...</td></tr>
                  ) : filteredClients.length === 0 ? (
                    <tr><td colSpan="10" className="px-4 py-10 text-center text-muted-foreground">{clients.length ? 'No hay resultados para esa búsqueda.' : 'Aún no hay sucursales registradas.'}</td></tr>
                  ) : filteredClients.map(client => (
                    <tr key={`${client.owner_id}-${client.tienda_id}`} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{client.correo}</td>
                      <td className="px-4 py-3 font-medium">{client.tienda}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${client.activo ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                          {client.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{client.sesiones}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{client.registros_30_dias}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{client.conteos_criticos_30_dias}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{client.conteos_criticos_revisados_30_dias}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{client.skus_con_diferencia}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateOnly(client.ultimo_conteo_critico)}</td>
                      <td className="px-4 py-3 text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{formatDate(client.ultima_actividad)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t px-4 py-3 text-xs text-muted-foreground">{loading ? ' ' : `${filteredClients.length} sucursal${filteredClients.length === 1 ? '' : 'es'}`}</div>
          </div>
        </>
      )}
    </div>
  );
}