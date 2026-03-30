import React from 'react';
import { Box } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';

interface CalculatedIngredient {
  ingredients: {
    name: string;
    unit: string;
    cost_per_unit: number;
  };
  variants?: {
    name: string;
    cost_per_unit: number | null;
  };
  calculatedQuantity: number;
}

interface NonChemicalCost {
  name: string;
  quantity: number;
  total: number;
}

interface MemorialComposicaoProps {
  ingredients: CalculatedIngredient[];
  nonChemicalCosts: NonChemicalCost[];
  totalCost: number;
}

export default function MemorialComposicao({
  ingredients,
  nonChemicalCosts,
  totalCost,
}: MemorialComposicaoProps) {
  return (
    <section className="bg-white rounded-[56px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-100">
      <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
          Memorial de Composição Completo
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] shadow-sm">
              <th className="py-7 px-10">Componente</th>
              <th className="py-7 px-10 text-center">Quantidade</th>
              <th className="py-7 px-10 text-center">% GERAL</th>
              <th className="py-7 px-10 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ingredients.map((fi, idx) => (
              <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                <td className="py-6 px-10">
                  <span className="font-black text-slate-800 block text-lg">
                    {fi.ingredients.name}
                  </span>
                  {fi.variants && (
                    <span className="text-[10px] text-[#202eac] font-black uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                      Variante: {fi.variants.name}
                    </span>
                  )}
                </td>
                <td className="py-6 px-10 text-center font-mono text-sm font-black text-slate-700">
                  {(fi.calculatedQuantity || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 3,
                  })}{' '}
                  {fi.ingredients.unit}
                </td>
                <td className="py-6 px-10 text-center">
                  <span className="font-mono text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    {(
                      ((fi.calculatedQuantity *
                        (fi.variants?.cost_per_unit ?? fi.ingredients.cost_per_unit)) /
                        (totalCost || 1)) *
                      100
                    ).toFixed(2)}
                    %
                  </span>
                </td>
                <td className="py-6 px-10 text-right font-mono text-sm font-black text-slate-900">
                  {formatCurrency(
                    fi.calculatedQuantity *
                      (fi.variants?.cost_per_unit ?? fi.ingredients.cost_per_unit)
                  )}
                </td>
              </tr>
            ))}
            {nonChemicalCosts.map((p, idx) => (
              <tr
                key={`pkg-${idx}`}
                className="bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
              >
                <td className="py-6 px-10">
                  <span className="text-slate-700 flex items-center gap-3 text-lg font-black">
                    <Box className="w-5 h-5 text-[#202eac]" /> {p.name}
                  </span>
                </td>
                <td className="py-6 px-10 text-center text-slate-600 font-black">
                  {p.quantity} UN
                </td>
                <td className="py-6 px-10 text-center">
                  <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                    {((p.total / (totalCost || 1)) * 100).toFixed(2)}%
                  </span>
                </td>
                <td className="py-6 px-10 text-right text-slate-800 font-black">
                  {formatCurrency(p.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
