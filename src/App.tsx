import React, { useState, useEffect } from 'react';
import {
  Beaker, Calculator, DollarSign, Package, FileBarChart,
  Settings, Plus, Save, Printer, ArrowRight, Search,
  ChevronDown, AlertCircle, FlaskConical,
  ShoppingCart, Users, Factory, Shield, Archive,
  Download, Upload, Database, Copy, CheckCircle2, LayoutDashboard
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import Insumos from './components/Insumos';
import Dashboard from './components/Dashboard';
import Formulas from './components/Formulas';
import Proporcao from './components/Proporcao';
import Precificacao from './components/Precificacao';
import Relatorios from './components/Relatorios';
import Fornecedores from './components/Fornecedores';
import Producao from './components/Producao';
import Qualidade from './components/Qualidade';
import Estoque from './components/Estoque';

export default function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');

  // Setup state
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());
  const [showSetupManual, setShowSetupManual] = useState(false);
  const [copied, setCopied] = useState(false);

  const sqlScript = `-- 1. Habilitar extensão UUID
create extension if not exists "uuid-ossp";

-- 2. Criar tabela de Fornecedores
create table if not exists public.suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  cnpj text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Criar tabela de Grupos
create table if not exists public.groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Criar tabela de Insumos
create table if not exists public.ingredients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  codigo text,
  apelido text,
  unit text not null,
  cost_per_unit numeric not null default 0,
  fornecedor text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  validade_indeterminada boolean default true,
  estoque_atual numeric default 0,
  estoque_minimo numeric default 0,
  produto_quimico boolean default true,
  tem_variantes boolean default false,
  peso_especifico text,
  ph text,
  temperatura text,
  viscosidade text,
  solubilidade text,
  risco text,
  expiry_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Criar tabela de Variantes de Insumos
create table if not exists public.ingredient_variants (
  id uuid default uuid_generate_v4() primary key,
  ingredient_id uuid references public.ingredients(id) on delete cascade not null,
  name text not null,
  codigo text,
  cost_per_unit numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Criar tabela de Fórmulas
create table if not exists public.formulas (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  version text not null default 'V1',
  base_volume numeric not null default 100,
  status text not null default 'draft',
  group_id uuid references public.groups(id) on delete set null,
  lm_code text,
  description text,
  instructions text,
  yield_amount numeric,
  yield_unit text default 'UN',
  batch_prefix text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Criar tabela de Insumos da Fórmula (Relacionamento)
create table if not exists public.formula_ingredients (
  id uuid default uuid_generate_v4() primary key,
  formula_id uuid references public.formulas(id) on delete cascade not null,
  ingredient_id uuid references public.ingredients(id) on delete restrict not null,
  variant_id uuid references public.ingredient_variants(id) on delete set null,
  quantity numeric not null default 0
);

-- 8. Inserir Fornecedores Padrão
insert into public.suppliers (name, city, state) values 
  ('Química Central', 'São Paulo', 'SP'),
  ('Distribuidora Sul', 'Curitiba', 'PR'),
  ('Fragrâncias & Cia', 'Campinas', 'SP'),
  ('Cores Brasil', 'Rio de Janeiro', 'RJ'),
  ('Fonte Pura', 'Belo Horizonte', 'MG')
on conflict do nothing;

-- 9. Inserir alguns grupos padrão
insert into public.groups (name, description) values 
  ('Amaciantes', 'Produtos para cuidado com roupas'),
  ('Detergentes', 'Lava-louças e desengordurantes'),
  ('Desinfetantes', 'Limpeza geral e bactericidas'),
  ('Automotivo', 'Shampoos, ceras e limpa-pneus')
on conflict do nothing;

-- 10. Inserir dados iniciais de exemplo (Insumos)
insert into public.ingredients (name, unit, cost_per_unit, produto_quimico, fornecedor) values
  ('Ácido Sulfônico 90%', 'L', 12.50, true, 'Química Central'),
  ('Amida 60', 'L', 18.00, true, 'Química Central'),
  ('Lauril Éter Sulfato de Sódio', 'L', 9.20, true, 'Distribuidora Sul'),
  ('Soda Cáustica Líquida 50%', 'L', 4.50, true, 'Distribuidora Sul'),
  ('Essência Maçã', 'L', 45.00, false, 'Fragrâncias & Cia'),
  ('Corante Vermelho', 'L', 25.00, false, 'Cores Brasil'),
  ('Água Desmineralizada', 'L', 0.10, false, 'Fonte Pura'),
  ('Frasco PET 2L', 'UN', 1.50, false, 'Distribuidora Sul'),
  ('Tampa Lacre', 'UN', 0.20, false, 'Distribuidora Sul'),
  ('Rótulo Detergente', 'UN', 0.45, false, 'Cores Brasil')
on conflict do nothing;

-- 11. Função para atualização automática de updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_formulas_updated_at on public.formulas;
create trigger update_formulas_updated_at
    before update on public.formulas
    for each row
    execute function update_updated_at_column();

-- 12. Ordens de Fabricação (Produção)
create table if not exists public.production_orders (
  id uuid default uuid_generate_v4() primary key,
  formula_id uuid references public.formulas(id) on delete restrict not null,
  batch_number text not null unique,
  planned_volume numeric not null,
  actual_volume numeric,
  status text not null default 'planned',
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. Controle de Qualidade (CQ)
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
  status text not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. Logs de Movimentação (Estoque)
create table if not exists public.inventory_logs (
  id uuid default uuid_generate_v4() primary key,
  ingredient_id uuid references public.ingredients(id) on delete cascade,
  variant_id uuid references public.ingredient_variants(id) on delete cascade,
  quantity numeric not null,
  type text not null,
  reference_id uuid,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConfigured || showSetupManual) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full overflow-hidden border border-slate-200">
          <div className="bg-[#202eac] p-6 text-white flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Database className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Configuração do Banco de Dados</h1>
                <p className="text-blue-100">Conecte seu projeto ao Supabase para continuar</p>
              </div>
            </div>
            {isConfigured && (
              <button
                onClick={() => setShowSetupManual(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Voltar para o Sistema
              </button>
            )}
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-blue-800 text-sm">
              Você escolheu o <strong>Supabase</strong> como banco de dados. Para que o sistema funcione e salve suas fórmulas na nuvem, siga os passos abaixo:
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-lg">Passo 1: Crie o projeto no Supabase</h3>
              <ol className="list-decimal list-inside space-y-2 text-slate-600 ml-2">
                <li>Acesse <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#202eac] font-medium hover:underline">supabase.com</a> e crie um novo projeto.</li>
                <li>Vá em <strong>Project Settings &gt; API</strong>.</li>
                <li>Copie a <strong>Project URL</strong> e a <strong>anon public key</strong>.</li>
                <li>Adicione essas chaves nas configurações secretas (Settings) deste ambiente AI Studio como <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">VITE_SUPABASE_URL</code> e <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">VITE_SUPABASE_ANON_KEY</code>.</li>
              </ol>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center justify-between">
                Passo 2: Crie as Tabelas (SQL)
                <button
                  onClick={copyToClipboard}
                  className="text-sm font-medium flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar SQL'}
                </button>
              </h3>
              <p className="text-slate-600 text-sm">No painel do Supabase, vá em <strong>SQL Editor</strong>, crie uma nova query, cole o código abaixo e clique em <strong>Run</strong>.</p>

              <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto relative">
                <pre className="text-slate-300 text-xs font-mono leading-relaxed">
                  {sqlScript}
                </pre>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-[#202eac] text-white font-medium rounded-lg hover:bg-blue-800 transition-colors"
              >
                Já configurei, recarregar página
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">

      {/* Sidebar Navigation - Updated with user styles (#202eac background) */}
      <aside className="w-64 bg-[#202eac] text-white flex flex-col shadow-xl z-10">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="bg-white/20 p-2 rounded-lg text-white">
            <FlaskConical className="w-6 h-6" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">QuímicaSaaS</span>
          <div className="ml-auto bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30">
            SYNC TEST
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">

          {/* MCP Modules */}
          <div>
            <h3 className="px-3 text-xs font-bold text-white/50 uppercase tracking-wider mb-2">MCP (Versão 1.0)</h3>
            <div className="space-y-1">
              <NavItem icon={<LayoutDashboard />} label="Dashboard" active={activeMenu === 'dashboard'} onClick={() => setActiveMenu('dashboard')} />
              <NavItem icon={<Package />} label="Insumos" active={activeMenu === 'insumos'} onClick={() => setActiveMenu('insumos')} />
              <NavItem icon={<Beaker />} label="Fórmulas" active={activeMenu === 'formulas'} onClick={() => setActiveMenu('formulas')} />
              <NavItem icon={<Calculator />} label="Proporção" active={activeMenu === 'proporcao'} onClick={() => setActiveMenu('proporcao')} />
              <NavItem icon={<DollarSign />} label="Precificação" active={activeMenu === 'precificacao'} onClick={() => setActiveMenu('precificacao')} />
              <NavItem icon={<Users />} label="Fornecedores" active={activeMenu === 'fornecedores'} onClick={() => setActiveMenu('fornecedores')} />
              <NavItem icon={<FileBarChart />} label="Relatórios" active={activeMenu === 'relatorios'} onClick={() => setActiveMenu('relatorios')} />
            </div>
          </div>

          {/* Future Modules (V2) */}
          <div>
            <h3 className="px-3 text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Em Breve (V2)</h3>
            <div className="space-y-1">
              <NavItem icon={<Archive />} label="Estoque" active={activeMenu === 'estoque'} onClick={() => setActiveMenu('estoque')} />
              <NavItem icon={<Factory />} label="Produção" active={activeMenu === 'producao'} onClick={() => setActiveMenu('producao')} />
              <NavItem icon={<Shield />} label="Qualidade" active={activeMenu === 'qualidade'} onClick={() => setActiveMenu('qualidade')} />
              <NavItem icon={<ShoppingCart />} label="Compras" disabled />
              <NavItem icon={<DollarSign />} label="Vendas" disabled />
              <NavItem icon={<Users />} label="Clientes" disabled />
              <NavItem icon={<Users />} label="Usuários" disabled />
            </div>
          </div>

        </nav>

        <div className="p-4 border-t border-white/10">
          <NavItem icon={<Settings />} label="Configurações" active={activeMenu === 'configuracoes'} onClick={() => setActiveMenu('configuracoes')} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {activeMenu === 'dashboard' && <Dashboard setActiveMenu={setActiveMenu} />}

        {activeMenu === 'insumos' && <Insumos />}

        {activeMenu === 'formulas' && <Formulas />}

        {activeMenu === 'proporcao' && <Proporcao />}

        {activeMenu === 'precificacao' && <Precificacao />}

        {activeMenu === 'fornecedores' && <Fornecedores />}

        {activeMenu === 'relatorios' && <Relatorios />}

        {activeMenu === 'producao' && <Producao />}

        {activeMenu === 'qualidade' && <Qualidade />}

        {activeMenu === 'estoque' && <Estoque />}

        {/* Settings View */}
        {activeMenu === 'configuracoes' && (
          <div className="flex-1 overflow-auto bg-slate-50">
            <header className="bg-white border-b border-slate-200 px-8 py-6">
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Settings className="w-6 h-6 text-[#202eac]" /> Configurações do Sistema
              </h1>
              <p className="text-sm text-slate-500 mt-1">Gerencie as preferências, backups e dados da sua conta.</p>
            </header>

            <div className="p-8 max-w-4xl mx-auto space-y-8">

              {/* Backup & Restore Section */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Database className="w-5 h-5 text-[#202eac]" /> Backup e Restauração
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Mantenha seus dados seguros. Exporte suas fórmulas, insumos e relatórios para um arquivo seguro ou restaure dados de um backup anterior.
                  </p>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export */}
                  <div className="border border-slate-200 rounded-xl p-5 hover:border-[#202eac]/30 transition-colors">
                    <div className="w-10 h-10 bg-blue-50 text-[#202eac] rounded-lg flex items-center justify-center mb-4">
                      <Download className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2">Exportar Dados (Backup)</h3>
                    <p className="text-sm text-slate-500 mb-6">
                      Gera um arquivo contendo todas as suas fórmulas, histórico de preços e cadastro de insumos.
                    </p>
                    <button className="w-full py-2.5 bg-white border-2 border-[#202eac] text-[#202eac] hover:bg-blue-50 font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" /> Gerar Arquivo de Backup
                    </button>
                  </div>

                  {/* Import */}
                  <div className="border border-slate-200 rounded-xl p-5 hover:border-[#202eac]/30 transition-colors">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
                      <Upload className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2">Restaurar Dados</h3>
                    <p className="text-sm text-slate-500 mb-6">
                      Importe um arquivo de backup gerado anteriormente. <strong className="text-amber-600">Atenção:</strong> isso substituirá os dados atuais.
                    </p>
                    <button className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4" /> Selecionar Arquivo
                    </button>
                  </div>
                </div>

                <div className="bg-amber-50 border-t border-amber-100 p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800">
                    <strong>Recomendação de Segurança:</strong> É aconselhável realizar o backup dos seus dados semanalmente. No futuro, poderemos automatizar este processo para a nuvem.
                  </p>
                </div>
              </section>

              {/* SQL Script Section */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Database className="w-5 h-5 text-[#202eac]" /> Script SQL de Configuração
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Caso precise recriar as tabelas no seu projeto Supabase.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSetupManual(true)}
                      className="text-sm font-medium px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#202eac] rounded-md transition-colors"
                    >
                      Ver Guia Completo
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="text-sm font-medium flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copiado!' : 'Copiar SQL'}
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto max-h-60 overflow-y-auto custom-scrollbar">
                    <pre className="text-slate-300 text-xs font-mono leading-relaxed">
                      {sqlScript}
                    </pre>
                  </div>
                </div>
              </section>

              {/* Other settings placeholders */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 opacity-60">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Preferências da Empresa</h2>
                <p className="text-sm text-slate-500">Configurações de moeda, unidade de medida padrão e dados da empresa estarão disponíveis aqui.</p>
              </section>

            </div>
          </div>
        )}

        {/* Placeholder for other menus */}
        {activeMenu !== 'dashboard' && activeMenu !== 'formulas' && activeMenu !== 'configuracoes' && activeMenu !== 'insumos' && activeMenu !== 'proporcao' && activeMenu !== 'precificacao' && activeMenu !== 'relatorios' && (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-[#202eac] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 animate-spin-slow" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Módulo em Desenvolvimento</h2>
              <p className="text-slate-500 mt-2">A tela de <strong className="capitalize">{activeMenu}</strong> será implementada em breve.</p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function NavItem({ icon, label, active, disabled, onClick }: { icon: React.ReactNode, label: string, active?: boolean, disabled?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-bold ${active
        ? 'bg-white/20 text-white'
        : disabled
          ? 'text-white/40 cursor-not-allowed'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
    >
      <div className={`${active ? 'text-white' : disabled ? 'text-white/40' : 'text-white/70'}`}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
      </div>
      {label}
      {disabled && (
        <span className="ml-auto text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full">
          V2
        </span>
      )}
    </button>
  );
}
