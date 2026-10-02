drop function if exists public.get_dev_client_usage();

create function public.get_dev_client_usage()
returns table (
  owner_id uuid,
  correo text,
  tienda_id bigint,
  tienda text,
  sesiones bigint,
  registros_30_dias bigint,
  conteos_criticos_30_dias bigint,
  conteos_criticos_revisados_30_dias bigint,
  skus_con_diferencia bigint,
  ultimo_conteo_critico date,
  ultima_actividad timestamptz,
  activo boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or lower(coalesce(auth.jwt() ->> 'email', '')) <> 'alexis_891@outlook.com' then
    raise exception 'No autorizado';
  end if;

  return query
  with store_totals as (
    select t.id as tienda_id, t.owner_id, t.nombre as tienda, count(c.id)::bigint as session_count
    from public.tiendas t
    left join public.conteos c on c.tienda_id = t.id
    group by t.id, t.owner_id, t.nombre
  ), inventory_activity as (
    select t.id as tienda_id, rd.created_at
    from public.registros_detalle rd
    join public.conteos c on c.id = rd.conteo_id
    join public.tiendas t on t.id = c.tienda_id
    union all
    select t.id, pnc.created_at
    from public.productos_no_catalogados pnc
    join public.conteos c on c.id = pnc.conteo_id
    join public.tiendas t on t.id = c.tienda_id
  ), inventory_totals as (
    select activity.tienda_id,
      count(*) filter (where activity.created_at >= now() - interval '30 days')::bigint as recent_records,
      max(activity.created_at) as last_activity
    from inventory_activity activity
    group by activity.tienda_id
  ), critical_totals as (
    select cc.tienda_id,
      count(*) filter (where cc.fecha >= current_date - 29)::bigint as critical_counts_30_days,
      count(*) filter (where cc.fecha >= current_date - 29 and cc.estado = 'revisado')::bigint as critical_reviews_30_days,
      max(cc.fecha) as last_critical_count,
      max(cc.created_at) as last_critical_activity
    from public.conteos_criticos_diarios cc
    group by cc.tienda_id
  ), latest_reviewed as (
    select distinct on (cc.tienda_id) cc.tienda_id, cc.id as conteo_id
    from public.conteos_criticos_diarios cc
    where cc.estado = 'revisado'
    order by cc.tienda_id, cc.fecha desc
  ), variance_totals as (
    select lr.tienda_id,
      count(*) filter (
        where detail.existencia_sistema is not null
          and detail.cantidad_contada <> detail.existencia_sistema
      )::bigint as different_skus
    from latest_reviewed lr
    join public.conteos_criticos_detalle detail on detail.conteo_id = lr.conteo_id
    group by lr.tienda_id
  )
  select st.owner_id, u.email::text, st.tienda_id, st.tienda, st.session_count,
    coalesce(it.recent_records, 0),
    coalesce(ct.critical_counts_30_days, 0),
    coalesce(ct.critical_reviews_30_days, 0),
    coalesce(vt.different_skus, 0),
    ct.last_critical_count,
    greatest(it.last_activity, ct.last_critical_activity),
    (coalesce(it.recent_records, 0) > 0 or coalesce(ct.critical_counts_30_days, 0) > 0)
  from store_totals st
  join auth.users u on u.id = st.owner_id
  left join inventory_totals it on it.tienda_id = st.tienda_id
  left join critical_totals ct on ct.tienda_id = st.tienda_id
  left join variance_totals vt on vt.tienda_id = st.tienda_id
  group by st.owner_id, u.email, st.tienda_id, st.tienda, st.session_count,
    it.recent_records, it.last_activity, ct.critical_counts_30_days,
    ct.critical_reviews_30_days, ct.last_critical_count, ct.last_critical_activity, vt.different_skus
  order by (coalesce(it.recent_records, 0) > 0 or coalesce(ct.critical_counts_30_days, 0) > 0) desc,
    greatest(it.last_activity, ct.last_critical_activity) desc nulls last, u.email, st.tienda;
end;
$$;

revoke all on function public.get_dev_client_usage() from public, anon;
grant execute on function public.get_dev_client_usage() to authenticated;