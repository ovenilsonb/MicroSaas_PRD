import React from 'react';
import { ShoppingCart, Store, PackageCheck, Minus, Plus } from 'lucide-react';
import { PriceAdjuster, MetricBlock } from './Visuals';
import { fmt, getPackTerm } from './pricingUtils';

interface PricingAdjusterSectionProps {
  selectedPriceType: 'varejo' | 'atacado' | 'fardo';
  selectedCapacity: number;
  varejoPrice: number;
  onVarejoPriceChange: (val: number) => void;
  atacadoPrice: number;
  onAtacadoPriceChange: (val: number) => void;
  fardoPrice: number;
  onFardoPriceChange: (val: number) => void;
  fardoQty: number;
  onFardoQtyChange: (val: number) => void;
  isVarejoDisabled: boolean;
  isAtacadoDisabled: boolean;
  isFardoDisabled: boolean;
  detailCalc: any;
}

export const PricingAdjusterSection: React.FC<PricingAdjusterSectionProps> = ({
  selectedPriceType,
  selectedCapacity,
  varejoPrice,
  onVarejoPriceChange,
  atacadoPrice,
  onAtacadoPriceChange,
  fardoPrice,
  onFardoPriceChange,
  fardoQty,
  onFardoQtyChange,
  isVarejoDisabled,
  isAtacadoDisabled,
  isFardoDisabled,
  detailCalc
}) => {
  if (!detailCalc) return null;

  return (
    <div className="grid grid-cols-1 gap-5">
      {selectedPriceType === 'varejo' && (
        <div className={`bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow ${isVarejoDisabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="font-bold text-slate-700">Preço Varejo</h4>
            </div>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-md">x{detailCalc.varejo.markup.toFixed(0)}</span>
          </div>
          <PriceAdjuster value={varejoPrice} onChange={onVarejoPriceChange} cents={95} color="green" />
          <div className="flex gap-2 mt-5">
            <MetricBlock label="Custo/Un" value={fmt(detailCalc.custoTotal)} colorClass="bg-slate-50" />
            <MetricBlock label="Markup" value={`${detailCalc.varejo.markup.toFixed(1)}%`} colorClass="bg-slate-50" />
            <MetricBlock label="Margem" value={`${detailCalc.varejo.margem.toFixed(1)}%`} colorClass={`${detailCalc.varejo.margem >= 20 ? 'bg-emerald-50 text-emerald-600' : detailCalc.varejo.margem >= 10 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`} />
            <MetricBlock label="Lucro" value={fmt(detailCalc.varejo.lucro)} colorClass="bg-emerald-50 !text-emerald-700 font-black" />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex gap-3">
              <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">Preço/L</div>
                <div className="text-lg font-black text-blue-700">{fmt(selectedCapacity > 0 ? varejoPrice / selectedCapacity : 0)}</div>
              </div>
              <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">vs Atacado</div>
                <div className={`text-lg font-black ${atacadoPrice > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                  {atacadoPrice > 0 ? fmt(varejoPrice - atacadoPrice) : '---'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPriceType === 'atacado' && (
        <div className={`bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow ${isAtacadoDisabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Store className="w-4 h-4 text-amber-600" />
              </div>
              <h4 className="font-bold text-slate-700">Preço Atacado</h4>
            </div>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-md">x{detailCalc.atacado.markup.toFixed(0)}</span>
          </div>
          <PriceAdjuster value={atacadoPrice} onChange={onAtacadoPriceChange} cents={90} color="orange" />
          <div className="flex gap-2 mt-5">
            <MetricBlock label="Custo/Un" value={fmt(detailCalc.custoTotal)} colorClass="bg-slate-50" />
            <MetricBlock label="Markup" value={`${detailCalc.atacado.markup.toFixed(1)}%`} colorClass="bg-slate-50" />
            <MetricBlock label="Margem" value={`${detailCalc.atacado.margem.toFixed(1)}%`} colorClass={`${detailCalc.atacado.margem >= 20 ? 'bg-emerald-50 text-emerald-600' : detailCalc.atacado.margem >= 10 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`} />
            <MetricBlock label="Lucro" value={fmt(detailCalc.atacado.lucro)} colorClass="bg-amber-50 !text-amber-700 font-black" />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex gap-3">
              <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">Preço/L</div>
                <div className="text-lg font-black text-blue-700">{fmt(selectedCapacity > 0 ? atacadoPrice / selectedCapacity : 0)}</div>
              </div>
              <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">vs Varejo</div>
                <div className={`text-lg font-black ${varejoPrice > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {varejoPrice > 0 ? fmt(atacadoPrice - varejoPrice) : '---'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPriceType === 'fardo' && (
        <div className={`bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow ${isFardoDisabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <PackageCheck className="w-4 h-4 text-purple-600" />
              </div>
              <h4 className="font-bold text-slate-700">Preço {getPackTerm(selectedCapacity)}</h4>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Itens na {getPackTerm(selectedCapacity)}</span>
              <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
                <button onClick={() => onFardoQtyChange(Math.max(1, fardoQty - 1))} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-black text-slate-700 w-8 text-center">{fardoQty}</span>
                <button onClick={() => onFardoQtyChange(fardoQty + 1)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <PriceAdjuster value={fardoPrice} onChange={onFardoPriceChange} cents={80} color="purple" />
            <div className="flex-1 flex gap-2">
              <MetricBlock label={`Custo ${getPackTerm(selectedCapacity)}`} value={fmt(detailCalc.custoTotal * fardoQty)} colorClass="bg-slate-50" />
              <MetricBlock label="Markup" value={`${detailCalc.fardo.markup.toFixed(1)}%`} colorClass={`${detailCalc.fardo.markup >= 20 ? 'bg-emerald-50 text-emerald-600' : detailCalc.fardo.markup >= 10 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`} />
              <MetricBlock label="Margem" value={`${detailCalc.fardo.margem.toFixed(1)}%`} colorClass={`${detailCalc.fardo.margem >= 20 ? 'bg-emerald-50 text-emerald-600' : detailCalc.fardo.margem >= 10 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`} />
              <MetricBlock label="Lucro/Un" value={fmt(detailCalc.fardo.lucro / fardoQty)} colorClass="bg-purple-50 !text-purple-700 font-black" />
              <MetricBlock label="Preço/Un" value={fmt(fardoPrice / fardoQty)} colorClass="bg-purple-50 !text-purple-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex gap-3">
              <div className="flex-1 bg-slate-100 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Custo/Un</div>
                <div className="text-lg font-black text-slate-700">{fmt(detailCalc.custoTotal)}</div>
              </div>
              <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">Unit.</div>
                <div className="text-lg font-black text-blue-700">{fmt(fardoPrice / fardoQty)}</div>
              </div>
              <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">vs Varejo</div>
                <div className={`text-lg font-black ${varejoPrice > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {varejoPrice > 0 ? fmt((fardoPrice / fardoQty) - varejoPrice) : '---'}
                </div>
              </div>
              <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">vs Atacado</div>
                <div className={`text-lg font-black ${atacadoPrice > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                  {atacadoPrice > 0 ? fmt((fardoPrice / fardoQty) - atacadoPrice) : '---'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
