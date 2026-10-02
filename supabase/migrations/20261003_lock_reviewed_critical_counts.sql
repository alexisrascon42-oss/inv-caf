create or replace function public.prevent_reviewed_critical_count_edit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_estado text;
begin
  if tg_table_name = 'conteos_criticos_diarios' then
    if old.estado = 'revisado' then
      raise exception 'El conteo crítico ya fue revisado y no puede modificarse';
    end if;
  else
    select estado into v_estado
    from public.conteos_criticos_diarios
    where id = old.conteo_id;

    if v_estado = 'revisado' then
      raise exception 'El detalle pertenece a un conteo revisado y no puede modificarse';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists lock_reviewed_critical_count on public.conteos_criticos_diarios;
create trigger lock_reviewed_critical_count
before update on public.conteos_criticos_diarios
for each row execute function public.prevent_reviewed_critical_count_edit();

drop trigger if exists lock_reviewed_critical_count_detail on public.conteos_criticos_detalle;
create trigger lock_reviewed_critical_count_detail
before update on public.conteos_criticos_detalle
for each row execute function public.prevent_reviewed_critical_count_edit();