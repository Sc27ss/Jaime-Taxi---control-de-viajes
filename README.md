# Jaime Taxi — Control de viajes

Aplicación estática PWA construida con React y Vite. El navegador se conecta directamente a Supabase con `@supabase/supabase-js`; no necesita el servidor Express para desarrollo, producción ni despliegue en Vercel.

## Requisitos

- Node.js 20 o superior
- Un proyecto Supabase

## Configurar Supabase

1. En el SQL Editor de Supabase, ejecuta [`supabase/schema.sql`](./supabase/schema.sql). La tabla `public.trips` guarda los viajes y habilita políticas RLS para acceso anónimo.
2. En **Project Settings → API**, copia la Project URL y la clave `anon`/publishable.
3. Crea `client/.env.local` a partir de [`client/.env.example`](./client/.env.example) y completa:

   ```dotenv
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=TU_CLAVE_ANON
   ```

La URL y la clave `anon` se incluyen en el código del navegador y **no son secretos**. Las políticas del esquema conceden a cualquier visitante lectura, creación, edición y eliminación de todos los viajes. No publiques datos sensibles con esta configuración; para restringir el acceso, reemplaza las políticas por políticas asociadas a usuarios autenticados antes del despliegue.

## Desarrollo y compilación

Desde la carpeta `client`:

```bash
npm install
npm run dev
npm run build
npm run preview
```

La aplicación compilada queda en `client/dist`. Para desplegar en Vercel, importa el proyecto y configura:

- **Root Directory:** `client`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:** `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (para Production, Preview y Development según corresponda)

No configures una función serverless o un servidor Node para las rutas de viajes. El cliente lee, inserta, actualiza y elimina filas de `public.trips`; los KPIs y las gráficas se calculan en el navegador a partir de esos viajes. La meta diaria sigue guardándose localmente en cada dispositivo.

## Datos y estadísticas

La tabla `public.trips` contiene: `id`, `date`, `duration`, `passenger`, `pickup`, `dropoff`, `bruto`, `tip`, `tasa_uber`, `neto`, `payment_method`, `km`, `description` y `created_at`.

Al registrar o editar un viaje, el cliente valida los campos y calcula la tasa Uber (10 %) y el neto del conductor. La exportación Excel también se genera localmente en el navegador y respeta los filtros por fechas y forma de pago.

Las estadísticas incluyen ingresos por método de pago, franjas horarias (según `created_at`), kilometraje, propinas, días de la semana, meta diaria y comparación con el mismo día de la semana anterior.
