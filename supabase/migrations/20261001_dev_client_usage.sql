create or replace function public.get_dev_client_usage()
returns table (
  owner_id uuid,
  correo text,
  tiendas bigint,
  sesiones bigint,
  registros_30_dias bigint,
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
    select t.owner_id, count(distinct t.id)::bigint as store_count, count(distinct c.id)::bigint as session_count
    from public.tiendas t
    left join public.conteos c on c.tienda_id = t.id
    group by t.owner_id
  ), inventory_activity as (
    select t.owner_id, rd.created_at
    from public.registros_detalle rd
    join public.conteos c on c.id = rd.conteo_id
    join public.tiendas t on t.id = c.tienda_id
    union all
    select t.owner_id, pnc.created_at
    from public.productos_no_catalogados pnc
    join public.conteos c on c.id = pnc.conteo_id
    join public.tiendas t on t.id = c.tienda_id
  ), activity_totals as (
    select activity.owner_id,
      count(*) filter (where created_at >= now() - interval '30 days')::bigint as recent_records,
      max(created_at) as last_activity
    from inventory_activity activity
    group by activity.owner_id
  )
  select st.owner_id, u.email::text, st.store_count, st.session_count,
    coalesce(at.recent_records, 0), at.last_activity,
    coalesce(at.recent_records, 0) > 0
  from store_totals st
  join auth.users u on u.id = st.owner_id
  left join activity_totals at on at.owner_id = st.owner_id
  order by coalesce(at.recent_records, 0) desc, u.email;
end;
$$;

revoke all on function public.get_dev_client_usage() from public, anon;
grant execute on function public.get_dev_client_usage() to authenticated;