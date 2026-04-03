-- ==========================================
-- HISTÓRICO DE ATUALIZAÇÕES DO BANCO DE DADOS
-- ==========================================
-- Este arquivo mantém o controle de todas as tabelas e alterações.
-- Copie os blocos abaixo e cole no SQL Editor do Supabase quando houver atualizações.

-- ---------------------------------------------------------
-- [VERSÃO 1.0] - Setup Inicial (Já executado anteriormente)
-- ---------------------------------------------------------
/*
create extension if not exists "uuid-ossp";

create table public.ingredients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  codigo text,
  unit text not null,
  cost_per_unit numeric not null default 0,
  fornecedor text,
  validade_indeterminada boolean default true,
  estoque_atual numeric default 0,
  estoque_minimo numeric default 0,
  produto_quimico boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.formulas (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  version text not null default 'V1',
  base_volume numeric not null default 100,
  status text not null default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.formula_ingredients (
  id uuid default uuid_generate_v4() primary key,
  formula_id uuid references public.formulas(id) on delete cascade not null,
  ingredient_id uuid references public.ingredients(id) on delete restrict not null,
  quantity numeric not null default 0
);
*/

-- ---------------------------------------------------------
-- [VERSÃO 1.1] - Atualização: Grupos e Novos Campos de Fórmula
-- DATA: 19/03/2026
-- STATUS: PENDENTE (Execute este bloco no Supabase)
-- ---------------------------------------------------------

-- 1. Criar tabela de Grupos
create table public.groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Inserir alguns grupos padrão
insert into public.groups (name, description) values 
  ('Amaciantes', 'Produtos para cuidado com roupas'),
  ('Detergentes', 'Lava-louças e desengordurantes'),
  ('Desinfetantes', 'Limpeza geral e bactericidas'),
  ('Automotivo', 'Shampoos, ceras e limpa-pneus');

-- 3. Adicionar novos campos na tabela de Fórmulas
alter table public.formulas 
  add column if not exists group_id uuid references public.groups(id) on delete set null,
  add column if not exists lm_code text,
  add column if not exists description text,
  add column if not exists instructions text,
  add column if not exists yield_amount numeric,
  add column if not exists yield_unit text default 'UN',
  add column if not exists batch_prefix text;

-- 4. Atualizar a view/função de atualização de data (opcional, boa prática)
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_formulas_updated_at
    before update on public.formulas
    for each row
    execute function update_updated_at_column();

-- ---------------------------------------------------------
-- [VERSÃO 1.2] - Atualização: Variantes de Insumos
-- DATA: 19/03/2026
-- STATUS: PENDENTE (Execute este bloco no Supabase)
-- ---------------------------------------------------------

-- 1. Criar tabela de Variantes de Insumos
create table public.ingredient_variants (
  id uuid default uuid_generate_v4() primary key,
  ingredient_id uuid references public.ingredients(id) on delete cascade not null,
  name text not null,
  codigo text,
  cost_per_unit numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Adicionar coluna variant_id na tabela formula_ingredients
alter table public.formula_ingredients 
  add column if not exists variant_id uuid references public.ingredient_variants(id) on delete set null;

-- ---------------------------------------------------------
-- [VERSÃO 1.3] - Atualização: Data de Validade nos Insumos
-- DATA: 19/03/2026
-- STATUS: PENDENTE (Execute este bloco no Supabase)
-- ---------------------------------------------------------

alter table public.ingredients 
  add column if not exists expiry_date date;

-- ---------------------------------------------------------
-- [VERSÃO 1.4] - Atualização: Colunas Faltantes + Sort Order + Supplier FK
-- DATA: 03/04/2026
-- STATUS: PENDENTE (Execute este bloco no Supabase)
-- ---------------------------------------------------------

alter table public.ingredients
  add column if not exists apelido text,
  add column if not exists tem_variantes boolean default false,
  add column if not exists peso_especifico text,
  add column if not exists ph text,
  add column if not exists temperatura text,
  add column if not exists viscosidade text,
  add column if not exists solubilidade text,
  add column if not exists risco text,
  add column if not exists sort_order integer default 0,
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists idx_ingredients_supplier on public.ingredients(supplier_id);
create index if not exists idx_ingredients_sort_order on public.ingredients(sort_order);
create index if not exists idx_inventory_logs_ingredient on public.inventory_logs(ingredient_id);
create index if not exists idx_inventory_logs_created on public.inventory_logs(created_at desc);
