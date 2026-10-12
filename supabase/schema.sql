-- Tabla usada directamente por el cliente web.
create table if not exists public.trips (
    id uuid default gen_random_uuid() primary key,
    date text not null,
    duration text not null,
    passenger text not null,
    pickup text,
    dropoff text,
    bruto numeric not null,
    tip numeric default 0,
    tasa_uber numeric not null,
    neto numeric not null,
    payment_method text not null,
    km numeric default 0,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.trips enable row level security;

-- Acceso público requerido por la aplicación estática sin inicio de sesión.
-- La anon key es pública; cualquier persona que la conozca podrá leer y modificar todos los viajes.
drop policy if exists "Permitir acceso total a trips" on public.trips;
drop policy if exists "Permitir lectura anonima de trips" on public.trips;
drop policy if exists "Permitir insercion anonima de trips" on public.trips;
drop policy if exists "Permitir actualizacion anonima de trips" on public.trips;
drop policy if exists "Permitir eliminacion anonima de trips" on public.trips;

create policy "Permitir lectura anonima de trips"
    on public.trips for select to anon using (true);
create policy "Permitir insercion anonima de trips"
    on public.trips for insert to anon with check (true);
create policy "Permitir actualizacion anonima de trips"
    on public.trips for update to anon using (true) with check (true);
create policy "Permitir eliminacion anonima de trips"
    on public.trips for delete to anon using (true);
