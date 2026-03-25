-- Migration V2: Production and Quality Control Modules

-- 1. Create Production Orders (Ordens de Fabricação - OF)
create table if not exists public.production_orders (
  id uuid default uuid_generate_v4() primary key,
  formula_id uuid references public.formulas(id) on delete restrict not null,
  batch_number text not null unique,
  planned_volume numeric not null,
  actual_volume numeric,
  status text not null default 'planned', -- planned, in_progress, quality_check, completed, cancelled
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Quality Control (Controle de Qualidade - CQ)
create table if not exists public.quality_controls (
  id uuid default uuid_generate_v4() primary key,
  production_order_id uuid references public.production_orders(id) on delete cascade not null,
  ph_value numeric,
  viscosity_value numeric,
  color_status text,
  odor_status text,
  appearance_status text,
  notes text,
  analyst_name text,
  status text not null default 'pending', -- pending, approved, rejected
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Inventory Logs (Movimentação de Estoque)
create table if not exists public.inventory_logs (
  id uuid default uuid_generate_v4() primary key,
  ingredient_id uuid references public.ingredients(id) on delete cascade,
  variant_id uuid references public.ingredient_variants(id) on delete cascade,
  quantity numeric not null,
  type text not null, -- 'in' (entrada), 'out' (saída - OF), 'adjust' (ajuste)
  reference_id uuid, -- Link to production_order_id or purchase_id
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Function to update ingredient stock level
create or replace function public.update_ingredient_stock()
returns trigger as $$
begin
  if (new.type = 'in' or new.type = 'adjust') then
    update public.ingredients 
    set estoque_atual = estoque_atual + new.quantity
    where id = new.ingredient_id;
  elsif (new.type = 'out') then
    update public.ingredients 
    set estoque_atual = estoque_atual - new.quantity
    where id = new.ingredient_id;
  end if;
  return new;
end;
$$ language plpgsql;

-- 5. Trigger for stock update
create trigger on_inventory_log_insert
  after insert on public.inventory_logs
  for each row
  execute function public.update_ingredient_stock();
