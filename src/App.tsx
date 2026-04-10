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
import { useCompanySettings } from './hooks/useCompanySettings';

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
const Compras = lazy(() => import('./components/Compras'));
const Vendas = lazy(() => import('./components/Vendas'));
const Usuarios = lazy(() => import('./components/Usuarios'));
const Configuracoes = lazy(() => import('./components/Configuracoes'));

import Sidebar from './components/Sidebar';

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-[#0b0f1a]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Sincronizando ambiente industrial...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { mode, setMode, syncFromSupabase, isSyncing } = useStorageMode();
  const { settings } = useCompanySettings();
  const [activeMenu, setActiveMenu] = useState('dashboard');

  useEffect(() => {
    if (settings.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.isDarkMode]);

  // Aplicação Dinâmica da Cor Primária
  useEffect(() => {
    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--primary', settings.primaryColor);
      
      // Converter HEX para RGB para suporte a opacidade (rgba)
      const hex = settings.primaryColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
      }
    }
  }, [settings.primaryColor]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; detail?: string;
    type: ConfirmModalType; confirmLabel?: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {} });

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

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f1a] flex font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">

      <Sidebar 
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        mode={mode}
        isSyncing={isSyncing}
        onModeToggle={handleModeToggle}
        onSync={syncFromSupabase}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-[#0b0f1a]">
        {activeMenu !== 'insumos' && activeMenu !== 'formulas' && activeMenu !== 'proporcao' && activeMenu !== 'precificacao' && activeMenu !== 'configuracoes' && (() => {
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
            {activeMenu === 'compras' && <Compras />}
            {activeMenu === 'vendas' && <Vendas setActiveMenu={setActiveMenu} />}
            {activeMenu === 'usuarios' && <Usuarios />}
            {activeMenu === 'configuracoes' && <Configuracoes />}

            {/* Placeholder for other menus */}
            {(() => {
              const implementedMenus = [
                'dashboard', 'insumos', 'formulas', 'proporcao', 'precificacao',
                'fornecedores', 'clientes', 'relatorios', 'producao', 'qualidade',
                'estoque', 'compras', 'vendas', 'usuarios', 'configuracoes'
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
          </Suspense>
        </div>
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

