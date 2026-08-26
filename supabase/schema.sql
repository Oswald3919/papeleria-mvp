-- Cybertime: ejecutar una vez en Supabase > SQL Editor.
-- La clave service_role nunca debe ponerse en el sitio web.
create type public.app_role as enum ('admin', 'staff', 'customer');
create type public.order_status as enum ('pending', 'confirmed', 'ready', 'collected', 'cancelled');
create type public.inventory_movement_type as enum ('eleventa_import', 'web_reservation', 'web_release', 'manual_adjustment', 'order_collected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'customer',
  points integer not null default 0 check (points >= 0),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  barcode text unique,
  name text not null,
  category text,
  description text,
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  reserved_stock integer not null default 0 check (reserved_stock >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  image_url text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.inventory_imports (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid references public.profiles(id),
  source text not null default 'eleventa',
  file_name text not null,
  rows_received integer not null default 0,
  rows_updated integer not null default 0,
  imported_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  movement_type public.inventory_movement_type not null,
  quantity_change integer not null,
  stock_after integer not null check (stock_after >= 0),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid references public.profiles(id),
  customer_name text not null,
  customer_phone text not null,
  pickup_at timestamptz,
  notes text,
  status public.order_status not null default 'pending',
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0)
);

create index products_barcode_idx on public.products(barcode);
create index products_stock_idx on public.products(stock);
create index inventory_movements_product_idx on public.inventory_movements(product_id, created_at desc);
create index orders_status_idx on public.orders(status, created_at desc);

-- Funciones usadas por las políticas. SECURITY DEFINER evita consultas recursivas a profiles.
create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_role() in ('admin', 'staff'), false) $$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.inventory_imports enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "profiles: own read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff());
create policy "profiles: own update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "products: public catalogue" on public.products for select to anon, authenticated using (is_active = true or public.is_staff());
create policy "products: staff manage" on public.products for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "imports: staff only" on public.inventory_imports for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "movements: staff only" on public.inventory_movements for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "orders: customer read own" on public.orders for select to authenticated using (customer_id = auth.uid() or public.is_staff());
create policy "orders: staff manage" on public.orders for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "items: order access" on public.order_items for select to authenticated using (public.is_staff() or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));

-- Crear el primer administrador desde Table Editor > profiles: asignar role = admin
-- después de crear su usuario en Authentication > Users.
