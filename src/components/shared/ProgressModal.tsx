import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ProgressModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  progress?: number;
  status?: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  onCancel?: () => void;
}

export function ProgressModal({
  isOpen,
  title,
  message,
  progress,
  status = 'idle',
  error,
  onCancel,
}: ProgressModalProps) {
  if (!isOpen) return null;

  const isComplete = status === 'success';
  const isError = status === 'error';

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] animate-in fade-in duration-300 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-10 flex flex-col items-center text-center bg-slate-50 dark:bg-slate-800">
          <div className="w-20 h-20 rounded-[28px] bg-white dark:bg-slate-900 flex items-center justify-center mb-6 shadow-xl">
            {isComplete ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            ) : isError ? (
              <AlertTriangle className="w-10 h-10 text-red-500" />
            ) : (
              <Loader2 className="w-10 h-10 text-[#202eac] animate-spin" />
            )}
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">
            {isComplete ? 'Concluído!' : isError ? 'Erro' : title}
          </h3>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            {isComplete ? 'A operação foi realizada com sucesso.' : isError ? error || 'Ocorreu um erro durante a operação.' : message}
          </p>
        </div>

        {/* Progress Bar */}
        {!isComplete && !isError && (
          <div className="px-10 pb-6">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#202eac] to-[#4b5ce8] transition-all duration-300 ease-out"
                style={{ width: `${progress || 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs font-bold text-slate-400">
              <span>Processando...</span>
              <span>{Math.round(progress || 0)}%</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-4">
          {isError ? (
            <button
              onClick={onCancel}
              className="flex-1 py-4 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest bg-[#202eac] hover:bg-blue-800 transition-all active:scale-95"
            >
              Tentar Novamente
            </button>
          ) : isComplete ? (
            <button
              onClick={onCancel}
              className="flex-1 py-4 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest bg-[#202eac] hover:bg-blue-800 transition-all active:scale-95"
            >
              Fechar
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="flex-1 py-4 rounded-2xl text-slate-600 font-black uppercase text-[10px] tracking-widest bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
