-- Ejecutar en proyectos que ya tenían creada la versión anterior del esquema.
alter table public.conteos add column if not exists codigo_acceso text;

update public.conteos
set codigo_acceso = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
where codigo_acceso is null;

alter table public.conteos alter column codigo_acceso set not null;
create unique index if not exists conteos_codigo_acceso_key on public.conteos(codigo_acceso);