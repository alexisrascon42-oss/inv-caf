alter table public.conteos add column if not exists expires_at timestamptz;

update public.conteos
set expires_at = case
  when estado = 'abierto' then now() + interval '24 hours'
  else created_at + interval '24 hours'
end
where expires_at is null;

alter table public.conteos
  alter column expires_at set default (now() + interval '24 hours'),
  alter column expires_at set not null;

create or replace function public.enforce_conteo_expiration()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.estado = 'abierto' and new.expires_at <= now() then
    raise exception 'Actualiza el vencimiento antes de abrir esta sesión';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_conteo_expiration on public.conteos;
create trigger enforce_conteo_expiration
before insert or update on public.conteos
for each row execute function public.enforce_conteo_expiration();

drop policy if exists "operador consulta catalogo asignado" on public.productos;
create policy "operador consulta catalogo asignado" on public.productos
for select to authenticated using (
  exists (
    select 1 from public.conteo_operadores co
    join public.conteos c on c.id = co.conteo_id
    where co.operador_id = auth.uid()
      and c.tienda_id = productos.tienda_id
      and c.estado = 'abierto'
      and c.expires_at > now()
  )
);

drop policy if exists "operador consulta areas asignadas" on public.areas;
create policy "operador consulta areas asignadas" on public.areas
for select to authenticated using (
  exists (
    select 1 from public.conteo_operadores co
    join public.conteos c on c.id = co.conteo_id
    where co.operador_id = auth.uid()
      and c.tienda_id = areas.tienda_id
      and c.estado = 'abierto'
      and c.expires_at > now()
  )
);

drop policy if exists "operador crea areas asignadas" on public.areas;
create policy "operador crea areas asignadas" on public.areas
for insert to authenticated with check (
  exists (
    select 1 from public.conteo_operadores co
    join public.conteos c on c.id = co.conteo_id
    where co.operador_id = auth.uid()
      and c.tienda_id = areas.tienda_id
      and c.estado = 'abierto'
      and c.expires_at > now()
  )
);

drop policy if exists "operador gestiona registros asignados" on public.registros_detalle;
create policy "operador gestiona registros asignados" on public.registros_detalle
for all to authenticated using (
  exists (
    select 1 from public.conteo_operadores co
    join public.conteos c on c.id = co.conteo_id
    where co.operador_id = auth.uid()
      and c.id = registros_detalle.conteo_id
      and c.estado = 'abierto'
      and c.expires_at > now()
  )
) with check (
  exists (
    select 1 from public.conteo_operadores co
    join public.conteos c on c.id = co.conteo_id
    where co.operador_id = auth.uid()
      and c.id = registros_detalle.conteo_id
      and c.estado = 'abierto'
      and c.expires_at > now()
  )
);

drop policy if exists "operador gestiona no catalogados asignados" on public.productos_no_catalogados;
create policy "operador gestiona no catalogados asignados" on public.productos_no_catalogados
for all to authenticated using (
  exists (
    select 1 from public.conteo_operadores co
    join public.conteos c on c.id = co.conteo_id
    where co.operador_id = auth.uid()
      and c.id = productos_no_catalogados.conteo_id
      and c.estado = 'abierto'
      and c.expires_at > now()
  )
) with check (
  exists (
    select 1 from public.conteo_operadores co
    join public.conteos c on c.id = co.conteo_id
    where co.operador_id = auth.uid()
      and c.id = productos_no_catalogados.conteo_id
      and c.estado = 'abierto'
      and c.expires_at > now()
  )
);

create or replace function public.claim_conteo_access(p_codigo text)
returns table (id bigint, tienda_id bigint, nombre_sesion text, estado text, codigo_acceso text, tienda_nombre text)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Se requiere una sesión de operador'; end if;
  return query
    select c.id, c.tienda_id, c.nombre_sesion, c.estado, c.codigo_acceso, t.nombre
    from public.conteos c join public.tiendas t on t.id = c.tienda_id
    where upper(c.codigo_acceso) = upper(trim(p_codigo))
      and c.estado = 'abierto'
      and c.expires_at > now();
  if not found then raise exception 'Código inválido, sesión cerrada o vencida'; end if;
  insert into public.conteo_operadores (conteo_id, operador_id)
  select c.id, auth.uid() from public.conteos c
  where upper(c.codigo_acceso) = upper(trim(p_codigo))
    and c.estado = 'abierto'
    and c.expires_at > now()
  on conflict (conteo_id, operador_id) do nothing;
end;
$$;
grant execute on function public.claim_conteo_access(text) to anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid)
from cron.job
where jobname = 'close-expired-inventory-counts';
select cron.schedule(
  'close-expired-inventory-counts',
  '* * * * *',
  $job$update public.conteos set estado = 'cerrado' where estado = 'abierto' and expires_at <= now();$job$
);