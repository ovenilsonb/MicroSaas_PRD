import React from 'react';
import { CheckCircle2, ChevronRight, Package, AlertTriangle } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  itemName?: string;
  type?: 'success' | 'warning';
}

export default function SuccessModal({ isOpen, onClose, title, message, itemName, type = 'success' }: SuccessModalProps) {
  if (!isOpen) return null;

  const isWarning = type === 'warning';
  
  const colors = {
    bg: isWarning ? 'bg-amber-50' : 'bg-emerald-50',
    text: isWarning ? 'text-amber-500' : 'text-emerald-500',
    bar: isWarning ? 'from-amber-400 to-orange-500' : 'from-emerald-400 to-teal-500',
    decoration1: isWarning ? 'bg-amber-200' : 'bg-emerald-200',
    decoration2: isWarning ? 'bg-orange-200' : 'bg-teal-200',
    icon: isWarning ? 'text-amber-500' : 'text-emerald-500'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100">
        {/* Decorative Top Bar */}
        <div className={`h-2 bg-gradient-to-r ${colors.bar} w-full`} />
        
        <div className="p-8 text-center">
          {/* Animated Icon Container */}
          <div className="relative mb-6">
            <div className={`w-20 h-20 ${colors.bg} ${colors.text} rounded-full flex items-center justify-center mx-auto animate-pulse`}>
              {isWarning ? <AlertTriangle className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
            </div>
            {/* Small floating decorations */}
            <div className={`absolute top-0 right-1/4 w-3 h-3 ${colors.decoration1} rounded-full animate-bounce delay-75`} />
            <div className={`absolute bottom-0 left-1/4 w-2 h-2 ${colors.decoration2} rounded-full animate-bounce delay-150`} />
          </div>

          <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">
            {title}
          </h3>
          
          <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
            {message} 
            {itemName && (
              <span className="block mt-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 font-bold text-xs inline-flex items-center gap-2">
                <Package className={`w-3.5 h-3.5 ${colors.icon}`} /> {itemName}
              </span>
            )}
          </p>

          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 group active:scale-95"
          >
            {isWarning ? 'Entendido' : 'Continuar para o Sistema'}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mt-6">
            {isWarning ? 'Atenção Requerida' : 'Operação Confirmada'} • Ohana Clean
          </p>
        </div>
      </div>
    </div>
  );
}
