import React from 'react';
import { DollarSign, TrendingUp, Percent, Calculator } from 'lucide-react';

interface PricingSummaryProps {
  custoQuimicos: number;
  custoEmbalagem: number;
  custoTotal: number;
  custoFixo: number;
  precoVarejo: number;
  precoAtacado: number;
  precoFardo: number;
  margem: number;
  markup: number;
  lucro: number;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PricingSummary({
  custoQuimicos,
  custoEmbalagem,
  custoTotal,
  custoFixo,
  precoVarejo,
  precoAtacado,
  precoFardo,
  margem,
  markup,
  lucro,
}: PricingSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-[40px] text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-4 h-4 opacity-70" />
          <span className="text-[10px] font-bold uppercase opacity-70">Custo Químicos</span>
        </div>
        <span className="text-2xl font-black">{fmt(custoQuimicos)}</span>
      </div>

      <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-[40px] text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 opacity-70" />
          <span className="text-[10px] font-bold uppercase opacity-70">Custo Emb.</span>
        </div>
        <span className="text-2xl font-black">{fmt(custoEmbalagem)}</span>
      </div>

      <div className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase">Custo Total</span>
        </div>
        <span className="text-2xl font-black text-slate-800">{fmt(custoTotal)}</span>
      </div>

      <div className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Percent className="w-4 h-4 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase">Margem</span>
        </div>
        <span className={`text-2xl font-black ${margem >= 30 ? 'text-emerald-600' : margem >= 20 ? 'text-amber-500' : 'text-red-500'}`}>
          {margem.toFixed(1)}%
        </span>
      </div>

      <div className="bg-gradient-to-br from-[#202eac] to-blue-700 p-6 rounded-[40px] text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 opacity-70" />
          <span className="text-[10px] font-bold uppercase opacity-70">Preço Varejo</span>
        </div>
        <span className="text-2xl font-black">{fmt(precoVarejo)}</span>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-[40px] text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 opacity-70" />
          <span className="text-[10px] font-bold uppercase opacity-70">Preço Atacado</span>
        </div>
        <span className="text-2xl font-black">{fmt(precoAtacado)}</span>
      </div>
    </div>
  );
}
