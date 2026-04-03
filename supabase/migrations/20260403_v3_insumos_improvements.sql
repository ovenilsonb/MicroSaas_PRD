-- Migration V3: Insumos - Missing columns, sort_order, and supplier FK
-- DATA: 03/04/2026

-- 1. Add missing columns to ingredients table
alter table public.ingredients
  add column if not exists apelido text,
  add column if not exists tem_variantes boolean default false,
  add column if not exists peso_especifico text,
  add column if not exists ph text,
  add column if not exists temperatura text,
  add column if not exists viscosidade text,
  add column if not exists solubilidade text,
  add column if not exists risco text,
  add column if not exists sort_order integer default 0;

-- 2. Add supplier_id FK to ingredients (optional, keeps backward compat with fornecedor text)
alter table public.ingredients
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

-- 3. Add indexes for performance
create index if not exists idx_ingredients_supplier on public.ingredients(supplier_id);
create index if not exists idx_ingredients_sort_order on public.ingredients(sort_order);
create index if not exists idx_inventory_logs_ingredient on public.inventory_logs(ingredient_id);
create index if not exists idx_inventory_logs_created on public.inventory_logs(created_at desc);
