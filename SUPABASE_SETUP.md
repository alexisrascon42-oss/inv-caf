# Configuración de Supabase y Vercel

## 1. Crear la base de datos

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor**.
3. Ejecuta todo el contenido de `supabase/schema.sql`.

El esquema crea las tablas de tiendas, productos, sesiones, áreas y registros de inventario.

Si el proyecto ya tenía las tablas creadas, ejecuta `supabase/migrations/20260926_access_codes.sql` y después `supabase/migrations/20260926_rls_restrictions.sql`. Para habilitar vencimiento automático en sesiones existentes, ejecuta también `supabase/migrations/20261001_session_expiration.sql`.

Para habilitar el conteo diario de artículos críticos, ejecuta `supabase/migrations/20261002_critical_daily_counts.sql` después de `schema.sql`. En bases existentes, ejecútala después de `20260926_access_codes.sql` y `20260926_rls_restrictions.sql`. Esta migración agrega la marca de artículo crítico, un código permanente por sucursal y las tablas seguras de captura/revisión diaria.

Para bloquear las ediciones una vez que el gerente confirma una revisión, ejecuta también `supabase/migrations/20261003_lock_reviewed_critical_counts.sql` después de la migración de conteo crítico.

Para habilitar el panel Dev, ejecuta `supabase/migrations/20261001_dev_client_usage.sql` y, después de la migración de conteos críticos, `supabase/migrations/20261004_dev_critical_usage.sql` en **SQL Editor**. El panel solo está disponible para `alexis_891@outlook.com`; la base de datos vuelve a validar el correo. Un cliente se considera activo si cualquier sucursal tuvo actividad normal o un conteo crítico en los últimos 30 días.

Las nuevas sesiones vencen en 24 horas. El administrador puede cambiar la fecha y hora desde **Sesiones de Conteo > Ver datos**. La migración habilita `pg_cron` para cerrarlas cada minuto y las políticas de base de datos bloquean el acceso de operadores al llegar el vencimiento.

El operador entra por **Operador de Campo** con el código de 6 caracteres para una sesión normal o el código permanente de 8 caracteres que aparece en **Admin > Conteo crítico** para un conteo diario crítico. En modo crítico solo ve los productos marcados como críticos; solo se admite un responsable por sucursal y día. El gerente captura la existencia del sistema para comparar y confirmar las diferencias.

En **Authentication > Providers**, habilita Email para permitir el registro del administrador. Supabase puede pedir confirmación de correo antes del primer inicio de sesión.

En **Authentication > Providers > Anonymous Sign-Ins**, habilita el acceso anónimo. El operador usa una identidad anónima para que las políticas RLS puedan limitarlo a la sesión validada por código.

Si ya existen tiendas, asígnalas una vez al administrador. Primero consulta el UUID del administrador en **Authentication > Users** y después ejecuta:

```sql
update public.tiendas
set owner_id = 'UUID_DEL_ADMINISTRADOR'
where owner_id is null;
```

## 2. Configurar la aplicación localmente

Copia `.env.example` como `.env.local` y reemplaza los valores:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
```

La clave debe ser la clave pública `anon`. Nunca pongas una `service_role` en el frontend.

## 3. Configurar Vercel

En el proyecto de Vercel, agrega las mismas variables en **Settings > Environment Variables** para los entornos que uses:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Después realiza un nuevo deploy.

## Flujo de acceso

- El administrador se registra o inicia sesión en `/admin/login`.
- Al crear una sesión de conteo se genera un código de seis caracteres.
- El operador entra por **Operador de Campo**, escribe ese código, su nombre y el área que contará.
- Solo las sesiones con estado `abierto` aceptan operadores.

## Seguridad

Las políticas RLS restringen las tiendas y catálogos al administrador propietario. Un operador anónimo solo puede consultar y modificar registros de una sesión abierta que haya reclamado con su código. La clave `anon` sigue siendo pública, pero las reglas de la base de datos son las que protegen los datos.