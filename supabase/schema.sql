-- Tu tabla actual (referencia).
drop table if exists public.trips;
create table public.trips (
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

-- RECOMENDADO: no dejes la política pública "using (true)". El servidor usa la Secret key (salta RLS);
-- con esa política, cualquiera con la Publishable key (pública) podría leer y borrar tus viajes.
drop policy if exists "Permitir acceso total a trips" on public.trips;
