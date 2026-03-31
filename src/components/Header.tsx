import React from 'react';
import { 
  Search, 
  Bell, 
  User, 
  ChevronRight, 
  Home,
  Menu,
  Moon,
  Sun
} from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  children?: React.ReactNode;
}

const moduleConfig: Record<string, { color: string; bgGradient: string; icon: string }> = {
  dashboard: { color: 'text-indigo-600', bgGradient: 'from-indigo-500/10 to-indigo-500/5', icon: '📊' },
  insumos: { color: 'text-emerald-600', bgGradient: 'from-emerald-500/10 to-emerald-500/5', icon: '📦' },
  formulas: { color: 'text-violet-600', bgGradient: 'from-violet-500/10 to-violet-500/5', icon: '🧪' },
  proporcao: { color: 'text-amber-600', bgGradient: 'from-amber-500/10 to-amber-500/5', icon: '⚖️' },
  precificacao: { color: 'text-rose-600', bgGradient: 'from-rose-500/10 to-rose-500/5', icon: '💰' },
  fornecedores: { color: 'text-cyan-600', bgGradient: 'from-cyan-500/10 to-cyan-500/5', icon: '🏢' },
  clientes: { color: 'text-teal-600', bgGradient: 'from-teal-500/10 to-teal-500/5', icon: '👥' },
  relatorios: { color: 'text-blue-600', bgGradient: 'from-blue-500/10 to-blue-500/5', icon: '📈' },
  estoque: { color: 'text-orange-600', bgGradient: 'from-orange-500/10 to-orange-500/5', icon: '🏭' },
  producao: { color: 'text-blue-600', bgGradient: 'from-blue-500/10 to-blue-500/5', icon: '⚙️' },
  qualidade: { color: 'text-red-600', bgGradient: 'from-red-500/10 to-red-500/5', icon: '✅' },
  configuracoes: { color: 'text-slate-600', bgGradient: 'from-slate-500/10 to-slate-500/5', icon: '⚙️' },
};

export default function Header({ title, subtitle, breadcrumbs = [], children }: HeaderProps) {
  const config = moduleConfig[title.toLowerCase()] || moduleConfig['dashboard'];

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-5 shrink-0">
      <div className="flex items-center justify-between">
        {/* Left Section - Breadcrumbs & Title */}
        <div className="flex-1">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1.5 text-sm mb-2">
              <Home className="w-4 h-4 text-slate-400" />
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                  <span className={`font-medium ${idx === breadcrumbs.length - 1 ? 'text-slate-900' : 'text-slate-500'}`}>
                    {crumb.label}
                  </span>
                </React.Fragment>
              ))}
            </nav>
          )}
          
          {/* Title & Subtitle */}
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.bgGradient} flex items-center justify-center`}>
              <span className="text-2xl">{config.icon}</span>
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${config.color} tracking-tight`}>
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-slate-500 font-medium mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Section - Search & Actions */}
        <div className="flex items-center gap-4">
          {/* Global Search */}
          <div className="relative group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#202eac] transition-colors" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-64 pl-12 pr-4 py-2.5 bg-slate-100 border-2 border-transparent focus:border-[#202eac] focus:bg-white rounded-xl text-sm font-medium transition-all duration-200 outline-none"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          {/* User Menu */}
          <button className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#202eac] to-[#4b5ce8] flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </button>
        </div>
      </div>

      {/* Additional Content (Filters, Actions, etc.) */}
      {children && (
        <div className="mt-5 pt-5 border-t border-slate-100">
          {children}
        </div>
      )}
    </header>
  );
}
