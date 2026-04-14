import React from 'react';
import { DollarSign, BarChart3 } from 'lucide-react';
import { DonutChart, BarChart } from './Visuals';
import { fmt, getPackTerm } from './pricingUtils';

interface PricingAnalyticsProps {
  selectedCapacity: number;
  fixedCostsPerUnit: number;
  varejoPrice: number;
  atacadoPrice: number;
  fardoPrice: number;
  detailCalc: any;
}

export const PricingAnalytics: React.FC<PricingAnalyticsProps> = ({
  selectedCapacity,
  fixedCostsPerUnit,
  varejoPrice,
  atacadoPrice,
  fardoPrice,
  detailCalc
}) => {
  if (!detailCalc) return null;

  return (
    <div className="lg:col-span-5 space-y-5">
      {/* Donut: Composição do Preço */}
      <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-[#202eac]" />
          Composição do Preço (Varejo)
        </h4>
        <div className="flex items-center gap-6">
          <div className="w-28 h-28 shrink-0">
            <DonutChart
              custoBase={detailCalc.custoUnidade}
              fixedCosts={fixedCostsPerUnit}
              lucro={detailCalc.varejo.lucro}
            />
          </div>
          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-slate-600">Custo Base</span>
              </div>
              <span className="text-xs font-black text-slate-800">{fmt(detailCalc.custoUnidade)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-xs font-semibold text-slate-600">Custos Fixos</span>
              </div>
              <span className="text-xs font-black text-slate-800">{fmt(fixedCostsPerUnit)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-slate-600">Lucro Bruto</span>
              </div>
              <span className="text-xs font-black text-emerald-600">{fmt(detailCalc.varejo.lucro)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart: Comparativo de Margens */}
      <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-[#202eac]" />
          Comparativo de Margens (%)
        </h4>
        <BarChart margens={[
          { label: 'Varejo', value: detailCalc.varejo.margem, color: '#10b981', price: varejoPrice },
          { label: 'Atacado', value: detailCalc.atacado.margem, color: '#f59e0b', price: atacadoPrice },
          { label: getPackTerm(selectedCapacity), value: detailCalc.fardo.margem, color: '#a855f7', price: fardoPrice },
        ]} />
      </div>

      {/* Executive Summary */}
      <div className="bg-slate-800 p-6 rounded-[28px] shadow-xl">
        <h4 className="font-black text-[11px] uppercase tracking-widest text-slate-300 mb-4">Resumo Executivo</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Custo Total/Unidade</span>
            <span className="text-sm font-black text-white">{fmt(detailCalc.custoTotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Margem Média</span>
            <span className={`text-sm font-black ${detailCalc.margemMedia >= 20 ? 'text-emerald-400' : detailCalc.margemMedia >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
              {detailCalc.margemMedia.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Atratividade Atacado</span>
            <span className="text-sm font-black text-amber-400">{detailCalc.atacadoDesc.toFixed(0)}% desc.</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Atratividade Caixa/Fardo</span>
            <span className="text-sm font-black text-purple-400">{detailCalc.fardoDesc.toFixed(0)}% desc.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
