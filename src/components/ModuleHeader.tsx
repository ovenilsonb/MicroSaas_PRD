import React from 'react';
import { Package, Users, AlertTriangle, Beaker, LayoutDashboard, Beaker as FormulaIcon, Calculator, DollarSign, Archive, Factory, Shield } from 'lucide-react';

interface ModuleHeaderProps {
  module: 'insumos' | 'formulas' | 'producao' | 'estoque' | 'qualidade' | 'precificacao' | 'fornecedores';
  stats: {
    total: number;
    suppliers?: number;
    alerts?: number;
    chemical?: number;
  };
}

const moduleConfig = {
  insumos: {
    title: 'Gestão de Insumos e Matérias-Primas',
    badge: 'Módulo Principal',
    description: 'Gerencie todas as matérias-primas utilizadas na produção. Este módulo é a base do sistema, permitindo controlar custos unitários, fornecedores, estoque mínimo e variações de produtos.',
    icon: Package,
    iconColor: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-500',
    stats: [
      { key: 'total', label: 'itens cadastrados', icon: Package, color: 'text-emerald-600' },
      { key: 'suppliers', label: 'fornecedores', icon: Users, color: 'text-blue-600' },
      { key: 'alerts', label: 'alertas de estoque', icon: AlertTriangle, color: 'text-red-600', showWhen: 'alerts' },
      { key: 'chemical', label: 'produtos químicos', icon: Beaker, color: 'text-amber-600' },
    ]
  },
  formulas: {
    title: 'Gestão de Fórmulas',
    badge: 'Produção',
    description: 'Crie e gerencie suas fórmulas de produção. Organize ingredientes, versões e controle de custos para garantir consistência na fabricação.',
    icon: FormulaIcon,
    iconColor: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-500',
    stats: [
      { key: 'total', label: 'fórmulas cadastradas', icon: FormulaIcon, color: 'text-violet-600' },
    ]
  },
  producao: {
    title: 'Controle de Produção',
    badge: 'Operações',
    description: 'Acompanhe e gerencie as ordens de fabricação. Controle o fluxo de produção desde o pedido até a finalização.',
    icon: Factory,
    iconColor: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-500',
    stats: [
      { key: 'total', label: 'ordens ativas', icon: Factory, color: 'text-blue-600' },
    ]
  },
  estoque: {
    title: 'Gestão de Estoque',
    badge: 'Operações',
    description: 'Controle o inventário de matérias-primas e produtos acabados. Mantenha o estoque atualizado para evitar faltantes.',
    icon: Archive,
    iconColor: 'from-orange-500 to-amber-600',
    iconBg: 'bg-orange-500',
    stats: [
      { key: 'total', label: 'itens em estoque', icon: Archive, color: 'text-orange-600' },
    ]
  },
  qualidade: {
    title: 'Controle de Qualidade',
    badge: 'Operações',
    description: 'Registre e acompanhe os контролы de qualidade. Garanta que os produtos atendam aos padrões estabelecidos.',
    icon: Shield,
    iconColor: 'from-red-500 to-rose-600',
    iconBg: 'bg-red-500',
    stats: [
      { key: 'total', label: ' testes realizados', icon: Shield, color: 'text-red-600' },
    ]
  },
  precificacao: {
    title: 'Precificação',
    badge: 'Financeiro',
    description: 'Calcule custos de produção e defina preços de venda. Marque produtos para garantir margem de lucro adequada.',
    icon: DollarSign,
    iconColor: 'from-rose-500 to-pink-600',
    iconBg: 'bg-rose-500',
    stats: [
      { key: 'total', label: 'produtos precificados', icon: DollarSign, color: 'text-rose-600' },
    ]
  },
  fornecedores: {
    title: 'Gestão de Fornecedores',
    badge: 'CRM',
    description: 'Gerencie seu cadastro de fornecedores. Acompanhe contatos, histórico de compras e avaliações.',
    icon: Users,
    iconColor: 'from-cyan-500 to-teal-600',
    iconBg: 'bg-cyan-500',
    stats: [
      { key: 'total', label: 'fornecedores ativos', icon: Users, color: 'text-cyan-600' },
    ]
  },
};

export default function ModuleHeader({ module, stats }: ModuleHeaderProps) {
  const config = moduleConfig[module];
  const Icon = config.icon;

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100 rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-start gap-5">
        {/* Icon */}
        <div className={`w-16 h-16 bg-gradient-to-br ${config.iconColor} rounded-2xl flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {config.title}
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {config.badge}
            </span>
          </h2>
          <p className="text-slate-600 text-sm mt-1.5 leading-relaxed max-w-3xl">
            {config.description}
          </p>
          
          {/* Stats Badges */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {config.stats.map((stat, idx) => {
              const value = stats[stat.key as keyof typeof stats];
              const shouldShow = stat.showWhen ? stats[stat.showWhen as keyof typeof stats] > 0 : true;
              
              if (!shouldShow || value === undefined) return null;
              
              return (
                <div key={idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-slate-700 text-sm font-medium uppercase">{value} {stat.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
