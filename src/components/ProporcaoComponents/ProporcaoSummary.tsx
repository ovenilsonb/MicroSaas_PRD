import React from 'react';
import { Scale, Calculator, DollarSign, Beaker } from 'lucide-react';
import { CalculationMode } from './types';
import { formatCurrency } from '../../lib/formatters';

interface ProporcaoSummaryProps {
  totalCost: number;
  currentBatchSize: number;
  chemicalCost: number;
  calculationMode: CalculationMode;
}

export default function ProporcaoSummary({
  totalCost,
  currentBatchSize,
  chemicalCost,
  calculationMode,
}: ProporcaoSummaryProps) {
  const costPerLiter = totalCost / (currentBatchSize || 1);

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-[#202eac] p-8 rounded-[48px] text-white flex flex-col justify-center shadow-2xl relative overflow-hidden group">
        <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform">
          <Scale className="w-32 h-32" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest opacity-80 mb-1">
          Custo Total Lote
        </span>
        <div className="text-3xl font-black">{formatCurrency(totalCost)}</div>
      </div>

      <div className="bg-white p-8 rounded-[48px] border border-slate-200 flex flex-col justify-center shadow-xl ring-1 ring-slate-100 relative overflow-hidden group">
        <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform">
          <Calculator className="w-32 h-32 text-slate-900" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">
          Produção Final
        </span>
        <div className="text-3xl font-black text-slate-800">
          {currentBatchSize.toLocaleString('pt-BR')}{' '}
          <span className="text-lg opacity-30 ml-1">
            {calculationMode === 'volume' ? 'L/KG' : 'LITROS'}
          </span>
        </div>
      </div>

      <div className="bg-[#202eac]/5 p-8 rounded-[48px] border border-blue-100 flex flex-col justify-center relative overflow-hidden group">
        <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform">
          <DollarSign className="w-32 h-32 text-[#202eac]" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest text-[#202eac] opacity-60 mb-1">
          Custo por Litro/Kg
        </span>
        <div className="text-2xl font-black text-[#202eac]">
          {formatCurrency(costPerLiter)}
          <span className="text-lg opacity-30 ml-1">/L</span>
        </div>
      </div>

      <div className="bg-emerald-50 p-8 rounded-[48px] border border-emerald-100 flex flex-col justify-center relative overflow-hidden group">
        <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform">
          <Beaker className="w-32 h-32 text-emerald-600" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 opacity-60 mb-1">
          Custo S/ Embalagem
        </span>
        <div className="text-2xl font-black text-emerald-600">{formatCurrency(chemicalCost)}</div>
      </div>
    </section>
  );
}
