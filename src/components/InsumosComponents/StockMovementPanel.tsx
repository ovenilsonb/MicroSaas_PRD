import React, { useState } from 'react';
import { ArrowRightLeft, AlertCircle, List, Download, Calendar } from 'lucide-react';
import { StockMovement } from './useInsumosData';
import { Ingredient } from './types';

interface StockMovementPanelProps {
  ingredient: Ingredient | null;
  movements: StockMovement[];
  isLoadingMovements: boolean;
  movementForm: {
    type: 'entrada' | 'saida';
    quantity: string;
    note: string;
    batch: string;
  };
  onFormChange: (form: StockMovementPanelProps['movementForm']) => void;
  onAddMovement: () => void;
  onExportMovements: () => void;
  dateFilter?: { startDate: string; endDate: string };
  onDateFilterChange?: (filter: { startDate: string; endDate: string } | null) => void;
}

export default function StockMovementPanel({
  ingredient,
  movements,
  isLoadingMovements,
  movementForm,
  onFormChange,
  onAddMovement,
  onExportMovements,
  dateFilter,
  onDateFilterChange,
}: StockMovementPanelProps) {
  const [showDateFilter, setShowDateFilter] = useState(false);

  if (!ingredient) return null;

  const formatStockDisplay = (value: string) => {
    return value || '0,00';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 flex items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#202eac]"></div>
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Saldo Atual em Estoque</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-[#202eac]">{formatStockDisplay(ingredient.estoque_atual?.toString())}</span>
            <span className="text-blue-600 font-medium">{ingredient.unit?.toUpperCase()}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-500 mb-1">Estoque Mínimo: {ingredient.estoque_minimo || 0} {ingredient.unit?.toUpperCase()}</p>
          {(ingredient.estoque_atual || 0) <= (ingredient.estoque_minimo || 0) && (ingredient.estoque_minimo || 0) > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-100 text-red-700 text-xs font-bold">
              <AlertCircle className="w-3 h-3" />
              Estoque Baixo
            </span>
          )}
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Registrar Movimentação</h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onFormChange({ ...movementForm, type: 'entrada' })}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${movementForm.type === 'entrada' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              Entrada
            </button>
            <button
              type="button"
              onClick={() => onFormChange({ ...movementForm, type: 'saida' })}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${movementForm.type === 'saida' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              Saída
            </button>
          </div>
          <input
            type="text"
            placeholder="Quantidade"
            value={movementForm.quantity}
            onChange={e => onFormChange({ ...movementForm, quantity: e.target.value })}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            placeholder="Lote (opcional)"
            value={movementForm.batch}
            onChange={e => onFormChange({ ...movementForm, batch: e.target.value })}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]"
          />
          <input
            type="text"
            placeholder="Observação (opcional)"
            value={movementForm.note}
            onChange={e => onFormChange({ ...movementForm, note: e.target.value })}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]"
          />
        </div>
        <button
          type="button"
          onClick={onAddMovement}
          disabled={!movementForm.quantity}
          className="w-full px-4 py-2 bg-[#202eac] text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <ArrowRightLeft className="w-4 h-4" /> Registrar Movimentação
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <List className="w-4 h-4" /> Histórico de Movimentações
          </h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`p-1.5 rounded-lg transition-colors ${showDateFilter ? 'bg-[#202eac]/10 text-[#202eac]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
              title="Filtrar por período"
            >
              <Calendar className="w-4 h-4" />
            </button>
            {movements.length > 0 && (
              <button
                type="button"
                onClick={onExportMovements}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="Exportar movimentações"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {showDateFilter && onDateFilterChange && (
          <div className="flex items-center gap-3 mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <input
              type="date"
              value={dateFilter?.startDate || ''}
              onChange={e => onDateFilterChange({ startDate: e.target.value, endDate: dateFilter?.endDate || '' })}
              className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]"
              placeholder="De"
            />
            <span className="text-slate-400 text-sm">até</span>
            <input
              type="date"
              value={dateFilter?.endDate || ''}
              onChange={e => onDateFilterChange({ startDate: dateFilter?.startDate || '', endDate: e.target.value })}
              className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]"
              placeholder="Até"
            />
            {(dateFilter?.startDate || dateFilter?.endDate) && (
              <button
                type="button"
                onClick={() => onDateFilterChange(null)}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Limpar
              </button>
            )}
          </div>
        )}

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-medium">Data</th>
                <th className="py-3 px-4 font-medium">Tipo</th>
                <th className="py-3 px-4 font-medium text-right">Qtd</th>
                <th className="py-3 px-4 font-medium text-right">Saldo</th>
                <th className="py-3 px-4 font-medium">Lote</th>
                <th className="py-3 px-4 font-medium">Obs</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingMovements ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-[#202eac] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Carregando...
                  </td>
                </tr>
              ) : movements.length > 0 ? (
                movements.map((mov) => (
                  <tr key={mov.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                    <td className="py-3 px-4 text-xs">
                      {new Date(mov.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      <span className="text-slate-400 ml-1">{new Date(mov.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${mov.type === 'entrada' ? 'bg-emerald-100 text-emerald-700' : mov.type === 'saida' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {mov.type === 'entrada' ? '↑ Entrada' : mov.type === 'saida' ? '↓ Saída' : '↕ Ajuste'}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${mov.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {mov.type === 'entrada' ? '+' : mov.type === 'saida' ? '-' : ''}{mov.quantity.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-700">
                      {mov.balance_after?.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) || '-'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">{mov.batch || '-'}</td>
                    <td className="py-3 px-4 text-xs text-slate-500 truncate max-w-[150px]" title={mov.note}>{mov.note || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
