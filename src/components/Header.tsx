import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface HeaderConfig {
  color: string;
  gradient?: string;
}

const MODULE_MAP: Record<string, HeaderConfig> = {
  dashboard: { color: 'text-indigo-600' },
  insumos: { color: 'text-emerald-600' },
  formulas: { color: 'text-violet-600' },
  proporcao: { color: 'text-amber-600' },
  precificacao: { color: 'text-rose-600' },
  fornecedores: { color: 'text-cyan-600' },
  clientes: { color: 'text-teal-600' },
  relatorios: { color: 'text-blue-600' },
  estoque: { color: 'text-orange-600' },
  producao: { color: 'text-blue-600' },
  qualidade: { color: 'text-red-600' },
  configuracoes: { color: 'text-slate-600' },
};

export const getModuleConfig = (menuId: string): HeaderConfig =>
  MODULE_MAP[menuId] || MODULE_MAP.dashboard;

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  color?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export default function Header({ title, subtitle, icon: Icon, color = 'text-slate-700', actions, children }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-5 shrink-0 transition-colors duration-300">
      <div className="flex items-center justify-between">
        {/* Left Section - Title */}
        <div>
          <div className="flex items-center gap-4">
            {Icon && (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#202eac]/10 to-[#202eac]/5 dark:from-blue-500/20 dark:to-blue-500/10 flex items-center justify-center">
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
            )}
            <div>
              <h1 className={`text-2xl font-bold ${color} tracking-tight`}>
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

        {/* Right Section - Actions */}
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>

      {children && (
        <div className="mt-5 pt-5 border-t border-slate-100">
          {children}
        </div>
      )}
    </header>
  );
}
