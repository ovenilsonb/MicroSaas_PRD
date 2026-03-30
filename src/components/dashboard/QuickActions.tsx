import React from 'react';
import { Plus, Package, Beaker, Calculator, Users, GripHorizontal, ArrowRight } from 'lucide-react';
import { QuickAction } from '../../types/dashboard';

interface QuickActionsProps {
  onAction: (action: string) => void;
  isEditing?: boolean;
}

const actions: QuickAction[] = [
  {
    id: 'new-formula',
    label: 'Nova Fórmula',
    description: 'Criar nova composição',
    icon: <Plus className="w-5 h-5" />,
    action: 'formulas',
    colorScheme: 'blue',
  },
  {
    id: 'manage-ingredients',
    label: 'Gerenciar Insumos',
    description: 'Ver estoque e preços',
    icon: <Package className="w-5 h-5" />,
    action: 'insumos',
    colorScheme: 'indigo',
  },
  {
    id: 'new-calculation',
    label: 'Nova Proporção',
    description: 'Calcular proporção',
    icon: <Calculator className="w-5 h-5" />,
    action: 'proporcao',
    colorScheme: 'amber',
  },
  {
    id: 'new-customer',
    label: 'Novo Cliente',
    description: 'Cadastrar cliente',
    icon: <Users className="w-5 h-5" />,
    action: 'clientes',
    colorScheme: 'emerald',
  },
];

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-[#202eac]',
    hoverBg: 'group-hover/btn:bg-[#202eac]',
    hoverText: 'group-hover/btn:text-white',
    border: 'border-slate-200 hover:border-[#202eac]',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    hoverBg: 'group-hover/btn:bg-indigo-600',
    hoverText: 'group-hover/btn:text-white',
    border: 'border-slate-200 hover:border-indigo-600',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    hoverBg: 'group-hover/btn:bg-amber-600',
    hoverText: 'group-hover/btn:text-white',
    border: 'border-slate-200 hover:border-amber-600',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    hoverBg: 'group-hover/btn:bg-emerald-600',
    hoverText: 'group-hover/btn:text-white',
    border: 'border-slate-200 hover:border-emerald-600',
  },
};

export default function QuickActions({ onAction, isEditing = false }: QuickActionsProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group h-full">
      {isEditing && (
        <div className="drag-handle bg-slate-100 p-1 flex justify-center cursor-move border-b border-slate-200">
          <GripHorizontal className="w-4 h-4 text-slate-400" />
        </div>
      )}
      <div className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        <h2 className="text-lg font-bold text-slate-800 mb-4 shrink-0">Ações Rápidas</h2>
        <div className="space-y-3">
          {actions.map((action) => {
            const colors = colorMap[action.colorScheme || 'blue'];
            return (
              <button
                key={action.id}
                onClick={() => onAction(action.action)}
                className={`w-full bg-white border ${colors.border} hover:shadow-md transition-all rounded-xl p-3.5 flex items-center justify-between group/btn`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${colors.bg} ${colors.text} rounded-lg flex items-center justify-center ${colors.hoverBg} ${colors.hoverText} transition-colors shrink-0`}>
                    {action.icon}
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-slate-800 text-sm">{action.label}</h4>
                    <p className="text-xs text-slate-500">{action.description}</p>
                  </div>
                </div>
                <ArrowRight className={`w-4 h-4 text-slate-300 group-hover/btn:text-[#202eac] transition-colors shrink-0`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
