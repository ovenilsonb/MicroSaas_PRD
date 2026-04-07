import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle, X, Info } from 'lucide-react';

// ─── Confirm Modal (Estilo Premium — Padrão Ohana Clean) ────────────────

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
    bg: 'bg-amber-50',
    confirmBtn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200',
    borderColor: 'border-amber-200',
  },
  danger: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50',
    confirmBtn: 'bg-red-500 hover:bg-red-600 shadow-red-200',
    borderColor: 'border-red-200',
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    confirmBtn: 'bg-[#202eac] hover:bg-blue-800 shadow-blue-200',
    borderColor: 'border-blue-200',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    confirmBtn: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200',
    borderColor: 'border-emerald-200',
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
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Visual */}
        <div className={`p-8 flex flex-col items-center text-center ${config.bg}`}>
          <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center mb-6 shadow-xl shadow-slate-200/50">
            <Icon className={`w-10 h-10 ${config.color}`} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            {message}
          </p>
          {detail && (
            <div className={`mt-4 w-full p-4 rounded-2xl border ${config.borderColor} bg-white/70 text-left`}>
              <pre className="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{detail}</pre>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="p-6 bg-white flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 rounded-2xl text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 border border-slate-200"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 rounded-2xl text-white font-bold transition-all active:scale-95 shadow-lg ${config.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
