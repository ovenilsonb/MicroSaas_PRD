import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  Settings, Save, AlertCircle, 
  Download, Upload, Database, Copy, CheckCircle2,
} from 'lucide-react';
import { useStorageMode } from './contexts/StorageModeContext';
import { isSupabaseConfigured } from './lib/supabase';
import { ToastProvider, useToast } from './components/dashboard/Toast';
import { exportToJson, importFromJson, getBackupFilename } from './lib/backupUtils';
import Header, { getModuleConfig } from './components/Header';
import { ConfirmModal, ConfirmModalType } from './components/shared/ConfirmModal';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Insumos = lazy(() => import('./components/Insumos'));
const Formulas = lazy(() => import('./components/Formulas'));
const Proporcao = lazy(() => import('./components/Proporcao'));
const Precificacao = lazy(() => import('./components/Precificacao'));
const Relatorios = lazy(() => import('./components/Relatorios'));
const Fornecedores = lazy(() => import('./components/Fornecedores'));
const Clientes = lazy(() => import('./components/Clientes'));
const Producao = lazy(() => import('./components/Producao'));
const Qualidade = lazy(() => import('./components/Qualidade'));
const Estoque = lazy(() => import('./components/Estoque'));

import Sidebar from './components/Sidebar';
import SettingsBackup from './components/SettingsBackup';

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#202eac] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-medium">Carregando módulo...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { mode, setMode, syncFromSupabase, isSyncing } = useStorageMode();
  const [activeMenu, setActiveMenu] = useState('dashboard');

  // Setup state
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());
  const [showSetupManual, setShowSetupManual] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; detail?: string;
    type: ConfirmModalType; confirmLabel?: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {} });

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
  sort_order integer default 0,
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
  version text not null default 'v1.0',
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

-- 11. Criar tabela de Clientes
create table if not exists public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text check (type in ('PF', 'PJ')),
  document text, -- CPF ou CNPJ
  email text,
  phone text,
  address text,
  city text,
  state text,
  price_category text default 'Varejo',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Função para atualização automática de updated_at
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

  const handleModeToggle = () => {
    if (mode === 'local') {
      setConfirmModal({
        isOpen: true,
        title: 'Mudar para Supabase',
        message: 'Ao escolher a opção On-line (Supabase), certifique-se de que as tabelas e colunas necessárias já foram criadas no Supabase.',
        type: 'warning',
        confirmLabel: 'Sim, Mudar para On-line',
        onConfirm: () => { setConfirmModal(prev => ({ ...prev, isOpen: false })); setMode('supabase'); },
      });
    } else {
      setMode('local');
    }
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
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">

      {/* Sidebar Navigation - Modern Refactored */}
      <Sidebar 
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        mode={mode}
        isSyncing={isSyncing}
        onModeToggle={handleModeToggle}
        onSync={syncFromSupabase}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        {activeMenu !== 'insumos' && activeMenu !== 'formulas' && activeMenu !== 'proporcao' && activeMenu !== 'precificacao' && (() => {
          const hc = getModuleConfig(activeMenu);
          return (
            <Header
              title={(activeMenu.charAt(0).toUpperCase() + activeMenu.slice(1))
                .replace('Producao', 'Produção')
              }
              subtitle={
                activeMenu === 'dashboard' ? 'Visão geral do seu sistema' :
                activeMenu === 'producao' ? 'Controle de ordens de fabricação' :
                'Gerenciamento de módulos do MicroSaaS'
              }
              color={hc.color}
            />
          );
        })()}

        <div className="flex-1 overflow-auto custom-scrollbar">
          <Suspense fallback={<LoadingFallback />}>
            {activeMenu === 'dashboard' && <Dashboard setActiveMenu={setActiveMenu} />}

            {activeMenu === 'insumos' && <Insumos />}

            {activeMenu === 'formulas' && <Formulas />}

            {activeMenu === 'proporcao' && <Proporcao />}

            {activeMenu === 'precificacao' && <Precificacao />}

            {activeMenu === 'fornecedores' && <Fornecedores />}

            {activeMenu === 'clientes' && <Clientes />}

            {activeMenu === 'relatorios' && <Relatorios />}

            {activeMenu === 'producao' && <Producao />}

            {activeMenu === 'qualidade' && <Qualidade />}

            {activeMenu === 'estoque' && <Estoque />}
          </Suspense>
        </div>

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

              <SettingsBackup />

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
        {(() => {
          const implementedMenus = [
            'dashboard', 'insumos', 'formulas', 'proporcao', 'precificacao',
            'fornecedores', 'clientes', 'relatorios', 'producao', 'qualidade',
            'estoque', 'configuracoes'
          ];
          if (implementedMenus.includes(activeMenu)) return null;
          return (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-[#202eac] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 animate-spin-slow" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Módulo em Desenvolvimento</h2>
              <p className="text-slate-500 mt-2">A tela de <strong className="capitalize">{activeMenu}</strong> será implementada em breve.</p>
            </div>
          </div>
          );
        })()}

      </main>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        detail={confirmModal.detail}
        type={confirmModal.type}
        confirmLabel={confirmModal.confirmLabel}
      />
    </div>
    </ToastProvider>
  );
}

