import React from 'react';
import { Search, Plus, Upload, Download, Filter, LayoutGrid, List, ChevronDown } from 'lucide-react';

const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'text-indigo-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', icon: 'text-violet-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', icon: 'text-rose-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', icon: 'text-cyan-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'text-teal-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'text-orange-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-500' },
  red: { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-500' },
};

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
}

export function PageHeader({ title, subtitle, icon, color = 'indigo', actions, children, onBack, showBack }: PageHeaderProps) {
  const colors = colorMap[color] || colorMap.indigo;

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-5 shrink-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {showBack && onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronDown className="w-5 h-5 text-slate-600 rotate-90" />
            </button>
          )}
          {icon && (
            <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
              <span className={colors.icon}>{icon}</span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-0.5 font-medium">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children && (
        <div className="mt-5 pt-5 border-t border-slate-100">
          {children}
        </div>
      )}
    </header>
  );
}

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContent({ children, className = '' }: PageContentProps) {
  return (
    <div className={`flex-1 overflow-auto p-8 bg-slate-50 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}

interface PageSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function PageSection({ title, children, className = '' }: PageSectionProps) {
  return (
    <section className={`mb-8 ${className}`}>
      {title && (
        <h2 className="text-lg font-bold text-slate-800 mb-4">{title}</h2>
      )}
      {children}
    </section>
  );
}

interface PageGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: 4 | 6 | 8;
}

export function PageGrid({ children, cols = 4, gap = 6 }: PageGridProps) {
  const colsClass = { 1: 'grid-cols-1', 2: 'grid-cols-1 md:grid-cols-2', 3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' };
  const gapClass = { 4: 'gap-4', 6: 'gap-6', 8: 'gap-8' };
  return (
    <div className={`grid ${colsClass[cols]} ${gapClass[gap]}`}>
      {children}
    </div>
  );
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Buscar...', className = '' }: SearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm font-medium transition-all outline-none"
      />
    </div>
  );
}

interface ActionButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  as?: 'button' | 'label';
  accept?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ActionButton({ 
  variant = 'primary', 
  size = 'md', 
  icon, 
  label, 
  onClick, 
  disabled, 
  loading,
  as = 'button',
  accept,
  onChange
}: ActionButtonProps) {
  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm',
    secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  };

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  const content = (
    <>
      {loading ? (
        <div className={`${iconSize} border-2 border-current border-t-transparent rounded-full animate-spin`} />
      ) : icon && (
        <span className={iconSize}>{icon}</span>
      )}
      {label && <span className="font-semibold">{label}</span>}
    </>
  );

  const className = `inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]}`;

  if (as === 'label') {
    return (
      <label className={className}>
        {content}
        <input type="file" accept={accept} className="hidden" onChange={onChange} />
      </label>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled || loading} className={className}>
      {content}
    </button>
  );
}

interface ViewToggleProps {
  view: string;
  onChange: (view: string) => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
      <button
        onClick={() => onChange('grid')}
        className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
  actions?: React.ReactNode;
  headerChildren?: React.ReactNode;
  children: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

export default function PageLayout({ 
  title, 
  subtitle, 
  icon, 
  color = 'indigo',
  actions, 
  headerChildren,
  children,
  showBack,
  onBack
}: PageLayoutProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      <PageHeader 
        title={title} 
        subtitle={subtitle} 
        icon={icon} 
        color={color}
        actions={actions}
        showBack={showBack}
        onBack={onBack}
      >
        {headerChildren}
      </PageHeader>
      <PageContent>
        {children}
      </PageContent>
    </div>
  );
}
