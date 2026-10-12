# 🚕 Jaime Taxi — Control de viajes (PWA) · React + Tailwind + Express + Supabase

```
jaime-taxi/
├── supabase/schema.sql      ← crea la tabla `trips` (solo si aún no existe)
├── server/                  ← Express + @supabase/supabase-js + exceljs
│   ├── index.js  package.json  .env (ya con tus credenciales)  .env.example
└── client/                  ← React + Tailwind + Vite (PWA)
```

## 1) Base de datos (Supabase)
Tabla `public.trips`: id (uuid), date, duration, passenger, pickup, dropoff, bruto, tip, tasa_uber, neto, payment_method, km, description, created_at.
Equivalencias app → columna: Fecha→date · Duración→duration · Pasajero→passenger · Punto de Recogida→pickup · Destino Final→dropoff ·
Valor Viaje→bruto · Propina→tip · Tasa Uber→tasa_uber · Dinero Neto→neto · Forma de Pago→payment_method · Km→km · Descripción→description.
(Si renombras columnas, edita `CORE_MAP` al inicio de `server/index.js`.)

**Seguridad:** el servidor usa la Secret key (salta RLS), así que no necesita la política `using (true)`. Con ella, cualquiera con la Publishable key (pública)
podría leer y borrar tus viajes. Bórrala con: `drop policy if exists "Permitir acceso total a trips" on public.trips;`

## 2) Ejecutar (Node 20+)
```bash
# Terminal 1
cd server && npm install && npm start      # http://localhost:3001  (debe decir "base de datos: Supabase ✔")
# Terminal 2
cd client && npm install && npm run dev    # http://localhost:5173
```
Un solo puerto: `cd client && npm run build`, luego `cd ../server && npm start` → http://localhost:3001

## API
| Método | Ruta | Acción |
|---|---|---|
| GET | `/api/trips` | Lista todos los viajes |
| POST | `/api/trips` | Crea un viaje (calcula tasa 10% y neto) |
| PUT | `/api/trips/:id` (uuid) | Edita un viaje |
| DELETE | `/api/trips/:id` (uuid) | Elimina un viaje |
| GET | `/api/export.xlsx?from=&to=&pay=` | Descarga Excel (.xlsx) con los filtros del panel |

## Seguridad
- La **Secret key** vive solo en `server/.env` (ignorado por git). Nunca la pongas en el frontend. La Publishable key no se necesita en este servidor.
- Como la Secret key se compartió por chat, conviene **rotarla** en Supabase (Settings → API Keys) y pegar la nueva en `server/.env`.
- Sin credenciales, el servidor arranca en un modo local de prueba (archivo `server/data`), útil solo para desarrollo.

## Excel
El botón "Descargar Excel" genera un `.xlsx` real: encabezados con color, filtros automáticos, primera fila fija,
formato de miles y fila de totales con fórmulas SUM. Respeta el rango de fechas y la forma de pago elegidos.

## Estadísticas (botón "＋ Estadísticas" en el panel)
Todas las gráficas se calculan con los viajes guardados en Supabase y se pueden filtrar por periodo (7, 30, 90 días o todo):
1. **Ingresos por método de pago** — rosca con el % del valor de los viajes por App Uber / Efectivo / Transferencia QR.
2. **Franjas más productivas** — viajes y neto por Madrugada / Mañana / Tarde / Noche. *Usa la hora en que se registró el viaje (`created_at`), porque la tabla ya no guarda hora de inicio.* Para que sea fiel, registra cada viaje al terminarlo.
3. **Rendimiento y kilometraje** — km vs. dinero neto, semanal o mensual, con el neto por km.
4. **Propinas acumuladas** — neto sin propina + propina por día, línea acumulada y el % extra que aportan.

## Funciones de seguimiento diario (arriba del panel y del formulario)
- **🎯 Meta de hoy:** Jaime fija su meta (ej. $200.000) con el ✏️; la barra se llena con la ganancia **neta** de hoy cada vez que registra un viaje y avisa
  "Llevas el 75% de la meta de hoy, te faltan $50.000". La meta se guarda en el navegador de cada dispositivo (si quieres la misma en celular y PC, hay que fijarla en ambos).
- **📈 Hoy vs. el lunes pasado:** compara la ganancia de hoy contra el mismo día de la semana pasada **hasta la misma hora** (usa la hora de registro de los viajes), con mensaje motivador.
- **⛽ Ganancia por km:** tarjeta en el panel (respeta los filtros) y, en Estadísticas, comparación de carreras cortas / medianas / largas con aviso si las largas rinden menos.
- **📅 Ganancia por día de la semana** (Estadísticas): promedio por jornada de lunes a domingo, con el mejor y el más flojo.
