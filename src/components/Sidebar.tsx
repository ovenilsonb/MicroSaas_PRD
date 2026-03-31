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
  HardDrive,
  Cloud,
  Database,
  ChevronRight
} from 'lucide-react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  color?: string;
}

function NavItem({ icon, label, active, disabled, onClick, color }: NavItemProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium
        ${active 
          ? `bg-gradient-to-r ${color || 'from-primary/20 to-primary/10'} text-white shadow-sm` 
          : disabled 
            ? 'text-slate-500 cursor-not-allowed opacity-50' 
            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
        }
      `}
    >
      <div className={active ? 'text-white' : disabled ? 'text-slate-500' : 'text-slate-400'}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
      </div>
      <span className="flex-1 text-left">{label}</span>
      {active && <ChevronRight className="w-4 h-4 text-white/70" />}
      {disabled && (
        <span className="text-[10px] uppercase tracking-wider bg-slate-700/50 px-2 py-0.5 rounded-full">
          Em Breve
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

const navItems = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'from-indigo-500/20 to-indigo-500/5' },
      { id: 'insumos', label: 'Insumos', icon: Package, color: 'from-emerald-500/20 to-emerald-500/5' },
      { id: 'formulas', label: 'Fórmulas', icon: Beaker, color: 'from-violet-500/20 to-violet-500/5' },
      { id: 'proporcao', label: 'Proporção', icon: Calculator, color: 'from-amber-500/20 to-amber-500/5' },
      { id: 'precificacao', label: 'Precificação', icon: DollarSign, color: 'from-rose-500/20 to-rose-500/5' },
    ]
  },
  {
    title: 'Gestão',
    items: [
      { id: 'fornecedores', label: 'Fornecedores', icon: Users, color: 'from-cyan-500/20 to-cyan-500/5' },
      { id: 'clientes', label: 'Clientes', icon: Users, color: 'from-teal-500/20 to-teal-500/5' },
      { id: 'relatorios', label: 'Relatórios', icon: FileBarChart, color: 'from-blue-500/20 to-blue-500/5' },
    ]
  },
  {
    title: 'Operações',
    items: [
      { id: 'estoque', label: 'Estoque', icon: Archive, color: 'from-orange-500/20 to-orange-500/5', disabled: false },
      { id: 'producao', label: 'Produção', icon: Factory, color: 'from-blue-500/20 to-blue-500/5', disabled: false },
      { id: 'qualidade', label: 'Qualidade', icon: Shield, color: 'from-red-500/20 to-red-500/5', disabled: false },
    ]
  },
  {
    title: 'Futuro',
    items: [
      { id: 'compras', label: 'Compras', icon: ShoppingCart, disabled: true },
      { id: 'vendas', label: 'Vendas', icon: DollarSign, disabled: true },
      { id: 'usuarios', label: 'Usuários', icon: Users, disabled: true },
    ]
  }
];

export default function Sidebar({ activeMenu, setActiveMenu, mode, isSyncing, onModeToggle, onSync }: SidebarProps) {
  return (
    <aside className="w-72 bg-slate-900 flex flex-col shadow-2xl z-20 sticky top-0 h-screen shrink-0">
      {/* Logo Section */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#202eac] to-[#4b5ce8] flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">Ohana Clean</span>
            <p className="text-xs text-slate-500 font-medium">MicroSaaS Planner</p>
          </div>
        </div>
        
        {/* Mode Toggle */}
        <div className="space-y-2">
          <button 
            onClick={onModeToggle}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border ${
              mode === 'local' 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
          >
            {mode === 'local' ? (
              <><HardDrive className="w-4 h-4" /> Modo Local</>
            ) : (
              <><Cloud className="w-4 h-4" /> Modo Cloud</>
            )}
          </button>
          
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <Database className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Dados'}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-6">
          {navItems.map((section) => (
            <div key={section.title}>
              <h3 className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavItem 
                    key={item.id}
                    icon={<item.icon />}
                    label={item.label}
                    active={activeMenu === item.id}
                    disabled={item.disabled}
                    onClick={() => !item.disabled && setActiveMenu(item.id)}
                    color={item.color}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800">
        <NavItem 
          icon={<Settings />}
          label="Configurações"
          active={activeMenu === 'configuracoes'}
          onClick={() => setActiveMenu('configuracoes')}
        />
        <div className="mt-3 px-4 py-2 text-[10px] text-slate-600 text-center">
          v1.0.0 • MicroSaaS Planner
        </div>
      </div>
    </aside>
  );
}
