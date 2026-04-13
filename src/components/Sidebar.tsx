import React from 'react';
import {
  LayoutDashboard,
  Package,
  Beaker,
  Calculator,
  DollarSign,
  Users,
  FileBarChart,
  Archive,
  Factory,
  Shield,
  ShoppingCart,
  Settings,
  FlaskConical,
  ChevronRight,
  Bell,
  User,
  Moon,
  Sun
} from 'lucide-react';
import { useCompanySettings } from '../hooks/useCompanySettings';
import { useTheme } from '../contexts/ThemeContext';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, disabled, onClick }: NavItemProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 text-sm font-medium
        ${active 
          ? `bg-[var(--primary)] text-white shadow-lg shadow-[rgba(var(--primary-rgb),0.3)] scale-[1.02]` 
          : disabled 
            ? 'text-slate-600 cursor-not-allowed opacity-40' 
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
        }
      `}
    >
      <div className={active ? 'text-white' : disabled ? 'text-slate-600' : 'text-slate-500 group-hover:text-slate-300'}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
      </div>
      <span className={`flex-1 text-left ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
      {active && <ChevronRight className="w-4 h-4 text-white/50" />}
      {disabled && (
        <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-white/5 px-2 py-0.5 rounded-lg">
          Breve
        </span>
      )}
    </button>
  );
}

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  mode: 'local' | 'supabase';
  isSyncing: boolean;
  onModeToggle: () => void;
  onSync: () => void;
}

export const ALL_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'insumos', label: 'Insumos', icon: Package },
  { id: 'formulas', label: 'Fórmulas', icon: Beaker },
  { id: 'proporcao', label: 'Proporção', icon: Calculator },
  { id: 'precificacao', label: 'Precificação', icon: DollarSign },
  { id: 'fornecedores', label: 'Fornecedores', icon: Users },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'relatorios', label: 'Relatórios', icon: FileBarChart },
  { id: 'estoque', label: 'Estoque', icon: Archive },
  { id: 'producao', label: 'Produção', icon: Factory },
  { id: 'qualidade', label: 'Qualidade', icon: Shield },
  { id: 'compras', label: 'Compras', icon: ShoppingCart },
  { id: 'vendas', label: 'Vendas', icon: DollarSign },
  { id: 'usuarios', label: 'Usuários', icon: Users },
];

export default function Sidebar({ activeMenu, setActiveMenu }: SidebarProps) {
  const { settings } = useCompanySettings();
  const { theme, toggleTheme } = useTheme();

  // Mapear o layout dinâmico para os itens com ícones
  const dynamicNavItems = (settings.sidebarLayout || []).map(section => ({
    ...section,
    items: section.itemIds
      .map(id => ALL_NAV_ITEMS.find(item => item.id === id))
      .filter((item): item is typeof ALL_NAV_ITEMS[0] => !!item)
  })).filter(section => section.isVisible);

  return (
    <aside className="w-72 bg-[#020617] flex flex-col shadow-[10px_0_50px_rgba(0,0,0,0.3)] z-20 sticky top-0 h-screen shrink-0 border-r border-white/5">
      {/* Profile Section */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[rgba(var(--primary-rgb),0.5)] flex items-center justify-center shadow-lg shadow-[rgba(var(--primary-rgb),0.2)]">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-black text-xs text-white uppercase tracking-widest">Admin</span>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Sistema Ativo
            </p>
          </div>
        </div>
        <button className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <Bell className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Logo Section */}
      <div className="px-6 py-6 group cursor-default">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-16 h-16 rounded-[24px] flex items-center justify-center transition-all duration-500 overflow-hidden">
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" className="w-full h-full object-contain p-0" />
            ) : (
              <FlaskConical className="w-8 h-8 text-[var(--primary)]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-black text-xl text-white tracking-tighter leading-none block truncate">
              {settings.name || 'OHANA CLEAN'}
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600 block mt-1.5 truncate">
              {settings.subText || 'Industrial Planner'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto custom-scrollbar left-scrollbar">
        <div className="space-y-8">
          {dynamicNavItems.map((section) => (
            <div key={section.id}>
              <h3 className="px-4 text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] mb-4">
                {section.title}
              </h3>
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <NavItem 
                    key={item.id}
                    icon={<item.icon />}
                    label={item.label}
                    active={activeMenu === item.id}
                    onClick={() => setActiveMenu(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 bg-slate-900/40">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all mb-1"
          aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        >
          {theme === 'dark'
            ? <Sun className="w-5 h-5 text-slate-500" />
            : <Moon className="w-5 h-5 text-slate-500" />
          }
          <span className="flex-1 text-left font-medium">
            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </span>
        </button>

        <NavItem 
          icon={<Settings />}
          label="Configurações"
          active={activeMenu === 'configuracoes'}
          onClick={() => setActiveMenu('configuracoes')}
        />
        <div className="mt-4 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-800 text-center">
          v2.5.0 • Licenciado Ohana Clean
        </div>
      </div>
    </aside>
  );
}
