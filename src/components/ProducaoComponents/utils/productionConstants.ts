import React from 'react';
import { 
  ClipboardList, Scale, FlaskConical, Droplets, 
  ShieldCheck, PackageCheck 
} from 'lucide-react';
import { OrderStatus } from '../types/production';

export const getStatusConfig = (status: OrderStatus) => {
  switch (status) {
    case 'planned': return { label: 'Planejada', color: 'bg-blue-100 text-blue-700 border-blue-200', step: 0 };
    case 'weighing': return { label: 'Pesagem', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', step: 1 };
    case 'mixing': return { label: 'Mistura', color: 'bg-amber-100 text-amber-700 border-amber-200', step: 2 };
    case 'homogenizing': return { label: 'Homogeneização', color: 'bg-purple-100 text-purple-700 border-purple-200', step: 3 };
    case 'quality_check': return { label: 'Qualidade', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', step: 4 };
    case 'completed': return { label: 'Finalizada', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', step: 5 };
    case 'cancelled': return { label: 'Cancelada', color: 'bg-slate-100 text-slate-500 border-slate-200', step: -1 };
    default: return { label: status, color: 'bg-slate-100 text-slate-500 border-slate-200', step: -1 };
  }
};

export const PROCESS_FLOW = [
  { status: 'planned', label: 'Planejada', icon: React.createElement(ClipboardList, { className: "w-5 h-5" }), description: 'Reserva de lote e cálculo de insumos.' },
  { status: 'weighing', label: 'Pesagem', icon: React.createElement(Scale, { className: "w-5 h-5" }), description: 'Conferência e pesagem dos componentes.' },
  { status: 'mixing', label: 'Mistura', icon: React.createElement(FlaskConical, { className: "w-5 h-5" }), description: 'Adição dos insumos e mistura reativa.' },
  { status: 'homogenizing', label: 'Homogeneização', icon: React.createElement(Droplets, { className: "w-5 h-5" }), description: 'Homogeneização final da fórmula.' },
  { status: 'quality_check', label: 'Qualidade', icon: React.createElement(ShieldCheck, { className: "w-5 h-5" }), description: 'Coleta de amostra e análise laboratorial.' },
  { status: 'completed', label: 'Finalizada', icon: React.createElement(PackageCheck, { className: "w-5 h-5" }), description: 'Lote liberado para envase e estoque.' },
];

export const DEFAULT_STEPS = [
  { key: 'conferencia', label: 'Conferência de Insumos', completed: false },
  { key: 'pesagem', label: 'Pesagem dos Componentes', completed: false },
  { key: 'adicao', label: 'Adição e Mistura Inicial', completed: false },
  { key: 'homogeneizacao', label: 'Homogeneização Final', completed: false },
  { key: 'ajuste_ph', label: 'Ajuste de pH / Viscosidade', completed: false },
  { key: 'amostra_cq', label: 'Coleta de Amostra para CQ', completed: false },
];
