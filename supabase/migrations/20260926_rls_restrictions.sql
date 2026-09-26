-- Ejecutar después de las migraciones anteriores.
alter table public.tiendas add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create table if not exists public.conteo_operadores (
  conteo_id bigint not null references public.conteos(id) on delete cascade,
  operador_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conteo_id, operador_id)
);

alter table public.conteo_operadores enable row level security;
alter table public.tiendas enable row level security;
alter table public.productos enable row level security;
alter table public.conteos enable row level security;
alter table public.areas enable row level security;
alter table public.registros_detalle enable row level security;
alter table public.productos_no_catalogados enable row level security;

drop policy if exists "inventario publico tiendas" on public.tiendas;
drop policy if exists "inventario publico productos" on public.productos;
drop policy if exists "inventario publico conteos" on public.conteos;
drop policy if exists "inventario publico areas" on public.areas;
drop policy if exists "inventario publico registros" on public.registros_detalle;
drop policy if exists "inventario publico no catalogados" on public.productos_no_catalogados;

create policy "admin gestiona sus tiendas" on public.tiendas for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "admin gestiona sus productos" on public.productos for all to authenticated using (exists (select 1 from public.tiendas t where t.id = tienda_id and t.owner_id = auth.uid())) with check (exists (select 1 from public.tiendas t where t.id = tienda_id and t.owner_id = auth.uid()));
create policy "operador consulta catalogo asignado" on public.productos for select to authenticated using (exists (select 1 from public.conteo_operadores co join public.conteos c on c.id = co.conteo_id where co.operador_id = auth.uid() and c.tienda_id = productos.tienda_id and c.estado = 'abierto'));
create policy "admin gestiona sus conteos" on public.conteos for all to authenticated using (exists (select 1 from public.tiendas t where t.id = tienda_id and t.owner_id = auth.uid())) with check (exists (select 1 from public.tiendas t where t.id = tienda_id and t.owner_id = auth.uid()));
create policy "operador consulta conteo asignado" on public.conteos for select to authenticated using (exists (select 1 from public.conteo_operadores co where co.conteo_id = conteos.id and co.operador_id = auth.uid()));
create policy "admin gestiona sus areas" on public.areas for all to authenticated using (exists (select 1 from public.tiendas t where t.id = tienda_id and t.owner_id = auth.uid())) with check (exists (select 1 from public.tiendas t where t.id = tienda_id and t.owner_id = auth.uid()));
create policy "operador consulta areas asignadas" on public.areas for select to authenticated using (exists (select 1 from public.conteo_operadores co join public.conteos c on c.id = co.conteo_id where co.operador_id = auth.uid() and c.tienda_id = areas.tienda_id and c.estado = 'abierto'));
create policy "operador crea areas asignadas" on public.areas for insert to authenticated with check (exists (select 1 from public.conteo_operadores co join public.conteos c on c.id = co.conteo_id where co.operador_id = auth.uid() and c.tienda_id = tienda_id and c.estado = 'abierto'));
create policy "admin gestiona sus registros" on public.registros_detalle for all to authenticated using (exists (select 1 from public.conteos c join public.tiendas t on t.id = c.tienda_id where c.id = conteo_id and t.owner_id = auth.uid())) with check (exists (select 1 from public.conteos c join public.tiendas t on t.id = c.tienda_id where c.id = conteo_id and t.owner_id = auth.uid()));
create policy "operador gestiona registros asignados" on public.registros_detalle for all to authenticated using (exists (select 1 from public.conteo_operadores co join public.conteos c on c.id = co.conteo_id where co.operador_id = auth.uid() and c.id = conteo_id and c.estado = 'abierto')) with check (exists (select 1 from public.conteo_operadores co join public.conteos c on c.id = co.conteo_id where co.operador_id = auth.uid() and c.id = conteo_id and c.estado = 'abierto'));
create policy "admin gestiona sus no catalogados" on public.productos_no_catalogados for all to authenticated using (exists (select 1 from public.conteos c join public.tiendas t on t.id = c.tienda_id where c.id = conteo_id and t.owner_id = auth.uid())) with check (exists (select 1 from public.conteos c join public.tiendas t on t.id = c.tienda_id where c.id = conteo_id and t.owner_id = auth.uid()));
create policy "operador gestiona no catalogados asignados" on public.productos_no_catalogados for all to authenticated using (exists (select 1 from public.conteo_operadores co join public.conteos c on c.id = co.conteo_id where co.operador_id = auth.uid() and c.id = conteo_id and c.estado = 'abierto')) with check (exists (select 1 from public.conteo_operadores co join public.conteos c on c.id = co.conteo_id where co.operador_id = auth.uid() and c.id = conteo_id and c.estado = 'abierto'));
create policy "usuario consulta sus asignaciones" on public.conteo_operadores for select to authenticated using (operador_id = auth.uid());

create or replace function public.claim_conteo_access(p_codigo text)
returns table (id bigint, tienda_id bigint, nombre_sesion text, estado text, codigo_acceso text, tienda_nombre text)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Se requiere una sesión de operador'; end if;
  return query select c.id, c.tienda_id, c.nombre_sesion, c.estado, c.codigo_acceso, t.nombre
    from public.conteos c join public.tiendas t on t.id = c.tienda_id
    where upper(c.codigo_acceso) = upper(trim(p_codigo)) and c.estado = 'abierto';
  if not found then raise exception 'Código de sesión inválido o cerrado'; end if;
  insert into public.conteo_operadores (conteo_id, operador_id)
    select c.id, auth.uid() from public.conteos c where upper(c.codigo_acceso) = upper(trim(p_codigo)) and c.estado = 'abierto'
    on conflict (conteo_id, operador_id) do nothing;
end;
$$;
grant execute on function public.claim_conteo_access(text) to anon, authenticated;