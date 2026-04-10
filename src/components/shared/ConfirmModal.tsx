import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';

export type ConfirmModalType = 'warning' | 'danger' | 'info' | 'success';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  detail?: string;
  type?: ConfirmModalType;
  confirmLabel?: string;
  cancelLabel?: string;
}

const modalConfig = {
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    confirmBtn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 dark:shadow-none',
    borderColor: 'border-amber-200 dark:border-amber-900/40',
  },
  danger: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    confirmBtn: 'bg-red-500 hover:bg-red-600 shadow-red-200 dark:shadow-none',
    borderColor: 'border-red-200 dark:border-red-900/40',
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    confirmBtn: 'bg-[var(--primary)] hover:bg-blue-800 shadow-blue-200 dark:shadow-none',
    borderColor: 'border-blue-200 dark:border-blue-900/40',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    confirmBtn: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 dark:shadow-none',
    borderColor: 'border-emerald-200 dark:border-emerald-900/40',
  },
};

export function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  detail,
  type = 'warning',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const config = modalConfig[type];
  const Icon = config.icon;

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] animate-in fade-in duration-300 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-[#111827] rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Visual */}
        <div className={`p-10 flex flex-col items-center text-center ${config.bg}`}>
          <div className="w-24 h-24 rounded-[32px] bg-white dark:bg-slate-800 flex items-center justify-center mb-6 shadow-2xl shadow-slate-200/50 dark:shadow-none">
            <Icon className={`w-12 h-12 ${config.color}`} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2 tracking-tight">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {message}
          </p>
          {detail && (
            <div className={`mt-6 w-full p-5 rounded-3xl border ${config.borderColor} bg-white/70 dark:bg-slate-900/40 text-left`}>
              <pre className="text-[10px] text-slate-600 dark:text-slate-500 font-black uppercase tracking-widest whitespace-pre-wrap leading-relaxed">{detail}</pre>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="p-8 bg-white dark:bg-[#111827] border-t border-slate-100 dark:border-slate-800 flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-4 rounded-2xl text-slate-600 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-xl ${config.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
