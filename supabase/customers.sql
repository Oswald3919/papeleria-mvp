create table public.customers (
  phone text primary key,
  name text,
  points integer default 0
);

-- Habilitar Row Level Security
alter table public.customers enable row level security;

-- Permitir que cualquier usuario (incluso anónimo) pueda consultar y actualizar sus puntos 
-- (ya que quitamos el inicio de sesión)
create policy "Allow anonymous operations on customers" 
on public.customers 
for all 
using (true) 
with check (true);
