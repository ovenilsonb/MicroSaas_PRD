import React from 'react';
import { AlertTriangle, Beaker } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  ingredientName: string;
  formulas: any[];
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({ isOpen, ingredientName, formulas, isLoading, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Insumo</h3>

          {isLoading ? (
            <div className="mb-6">
              <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-slate-500">Verificando uso em fórmulas...</p>
            </div>
          ) : formulas.length > 0 ? (
            <div className="mb-6 text-left">
              <p className="text-red-600 font-medium mb-3 text-center text-sm">
                Não é possível excluir este insumo porque está atrelado {formulas.length === 1 ? 'à seguinte fórmula' : 'às seguintes fórmulas'}:
              </p>
              <ul className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-800 max-h-32 overflow-y-auto space-y-2">
                {formulas.map((f: any) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <Beaker className="w-4 h-4 shrink-0 opacity-70" />
                    <span className="font-medium truncate">{f.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-slate-600 mb-6">
              Tem certeza que deseja excluir <strong>{ingredientName}</strong>? Esta ação não poderá ser desfeita.
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
            >
              {formulas.length > 0 ? 'Entendi' : 'Cancelar'}
            </button>
            {!isLoading && formulas.length === 0 && (
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                Sim, Excluir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
