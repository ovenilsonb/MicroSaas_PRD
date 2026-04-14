import React from 'react';
import { Edit2, PackageOpen, Package, User, Truck, CheckCircle2, Undo2, X, AlertCircle } from 'lucide-react';
import { SaleStatus, StatusConfig } from './types';

export const getStatusConfig = (status: SaleStatus): StatusConfig => {
  switch (status) {
    case 'rascunho': return { label: 'Rascunho', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: React.createElement(Edit2, { className: 'w-3 h-3' }) };
    case 'producao': return { label: 'Aguardando Produção', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: React.createElement(PackageOpen, { className: 'w-3 h-3' }) };
    case 'separacao': return { label: 'Em Separação', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: React.createElement(Package, { className: 'w-3 h-3' }) };
    case 'retirada': return { label: 'Pronto p/ Retirada', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: React.createElement(User, { className: 'w-3 h-3' }) };
    case 'transito': return { label: 'Em Trânsito', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: React.createElement(Truck, { className: 'w-3 h-3' }) };
    case 'recebido': return { label: 'Concluído', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: React.createElement(CheckCircle2, { className: 'w-3 h-3' }) };
    case 'devolvido': return { label: 'Quarentena/Devolvido', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: React.createElement(Undo2, { className: 'w-3 h-3' }) };
    case 'cancelado': return { label: 'Cancelado', color: 'bg-red-50 text-red-700 border-red-200', icon: React.createElement(X, { className: 'w-3 h-3' }) };
    case 'reproducao': return { label: 'Necessário Refazer', color: 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse', icon: React.createElement(AlertCircle, { className: 'w-3 h-3' }) };
    default: return { label: status, color: 'bg-slate-100 text-slate-500', icon: React.createElement(AlertCircle, { className: 'w-3 h-3' }) };
  }
};
