import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { AlertTriangle } from 'lucide-react';
import { Formula, ColumnConfig, PricingEntry } from './types';
import { SortableHeader } from './Visuals';
import { 
  fmt, 
  calcIngredientCost, 
  getFormulaCategory, 
  categoryColors, 
  formatCapacity 
} from './pricingUtils';

interface PricingTableProps {
  formulas: Formula[];
  columns: ColumnConfig[];
  sortColumn: string;
  sortOrder: 'asc' | 'desc';
  onSort: (col: string) => void;
  onOpenFormula: (formula: Formula) => void;
  onColumnDragEnd: (event: any) => void;
  getVolumePricingStatus: (id: string) => { priced: number; total: number };
  getFormulaPrices: (id: string) => any;
}

export const PricingTable: React.FC<PricingTableProps> = ({
  formulas,
  columns,
  sortColumn,
  sortOrder,
  onSort,
  onOpenFormula,
  onColumnDragEnd,
  getVolumePricingStatus,
  getFormulaPrices
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onColumnDragEnd}>
        <SortableContext items={columns.filter(c => c.visible).map(c => c.id)} strategy={horizontalListSortingStrategy}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {columns.filter(c => c.visible).map((col) => (
                  <SortableHeader
                    key={col.id}
                    id={col.id}
                    label={col.label}
                    sortColumn={sortColumn}
                    sortOrder={sortOrder}
                    onSort={onSort}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {formulas.map(formula => {
                const cat = getFormulaCategory(formula);
                const catColor = categoryColors[cat] || categoryColors.Produtos;
                const volStatus = getVolumePricingStatus(formula.id);
                const custoBase = calcIngredientCost(formula);
                const custoPorLitro = custoBase / (formula.base_volume || 1);
                const prices = getFormulaPrices(formula.id);

                const columnValues: Record<string, React.ReactNode> = {
                  name: <div className="font-bold text-slate-800 group-hover:text-[#202eac] transition-colors text-sm">{formula.name}</div>,
                  version: <span className="text-[10px] bg-[#202eac] text-white px-1.5 py-0.5 rounded font-black border border-blue-100/50 shadow-sm">V{(formula.version || '1').replace(/^v/i, '')}</span>,
                  group: (formula.categories?.name || formula.groups?.name) ? (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${catColor.bg} ${catColor.text}`}>
                      {formula.categories?.name || formula.groups?.name}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  ),
                  lm_code: <span className="text-xs text-slate-500 font-mono">{formula.lm_code || 'S/C'}</span>,
                  cost: <span className="text-xs text-slate-500 font-mono" title="Custo matéria-prima apenas">{fmt(custoPorLitro)}/L</span>,
                  varejo: prices ? (
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-bold ${prices.varejoPrice > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {prices.varejoPrice > 0 ? fmt(prices.varejoPrice) : '-'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{formatCapacity(parseFloat(prices.capacityKey))}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-500 flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" /> -</span>
                  ),
                  atacado: prices ? (
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-bold ${prices.atacadoPrice > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {prices.atacadoPrice > 0 ? fmt(prices.atacadoPrice) : '-'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{formatCapacity(parseFloat(prices.capacityKey))}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  ),
                  fardo: prices ? (
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-bold ${prices.fardoPrice > 0 ? 'text-purple-600' : 'text-slate-400'}`}>
                        {prices.fardoPrice > 0 ? fmt(prices.fardoPrice) : '-'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{formatCapacity(parseFloat(prices.capacityKey))}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  ),
                  margem: (prices as any)?.avgMargem !== undefined ? (
                    <span className={`text-sm font-black ${ (prices as any).avgMargem >= 20 ? 'text-emerald-600' : (prices as any).avgMargem >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                      {(prices as any).avgMargem.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  ),
                  status: <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${volStatus.priced === volStatus.total && volStatus.total > 0 ? 'bg-emerald-50 text-emerald-600' : volStatus.priced > 0 ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>{volStatus.priced}/{volStatus.total}</span>,
                };

                return (
                  <tr
                    key={formula.id}
                    onClick={() => onOpenFormula(formula)}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  >
                    {columns.filter(c => c.visible).map(col => (
                      <td key={col.id} className="px-3 py-4 text-center">
                        {columnValues[col.id]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SortableContext>
      </DndContext>
    </div>
  );
};
