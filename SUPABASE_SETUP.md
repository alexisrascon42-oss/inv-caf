# Configuración de Supabase y Vercel

## 1. Crear la base de datos

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor**.
3. Ejecuta todo el contenido de `supabase/schema.sql`.

El esquema crea las tablas de tiendas, productos, sesiones, áreas y registros de inventario.

Si el proyecto ya tenía las tablas creadas, ejecuta `supabase/migrations/20260926_access_codes.sql` y después `supabase/migrations/20260926_rls_restrictions.sql`.

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