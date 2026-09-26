# Configuración de Supabase y Vercel

## 1. Crear la base de datos

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor**.
3. Ejecuta todo el contenido de `supabase/schema.sql`.

El esquema crea las tablas de tiendas, productos, sesiones, áreas y registros de inventario.

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

## Seguridad

El esquema inicial deja las tablas accesibles para la clave pública para que la app funcione sin autenticación. Antes de usarla en producción, agrega Supabase Auth y reemplaza las políticas públicas por políticas RLS basadas en usuarios, roles, tiendas y sesiones.