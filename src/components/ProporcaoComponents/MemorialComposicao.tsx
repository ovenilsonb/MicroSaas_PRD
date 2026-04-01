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
  packagingCapacity?: number | null;
}

export default function MemorialComposicao({
  ingredients,
  nonChemicalCosts,
  totalCost,
  packagingCapacity,
}: MemorialComposicaoProps) {
  const capacityLabel = packagingCapacity ? `${packagingCapacity}L` : 'XL';
  
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800 uppercase">
          Proporção Completa ({capacityLabel})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
              <th className="py-3 px-4">Componente</th>
              <th className="py-3 px-4 text-center">Quantidade</th>
              <th className="py-3 px-4 text-center">% GERAL</th>
              <th className="py-3 px-4 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ingredients.map((fi, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4">
                  <span className="font-medium text-slate-800 block">
                    {fi.ingredients.name}
                  </span>
                  {fi.variants && (
                    <span className="text-xs text-[#202eac] font-medium bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
                      Variante: {fi.variants.name}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-mono text-sm text-slate-700">
                  {(fi.calculatedQuantity || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 3,
                  })}{' '}
                  {fi.ingredients.unit}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="font-mono text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                    {(
                      ((fi.calculatedQuantity *
                        (fi.variants?.cost_per_unit ?? fi.ingredients.cost_per_unit)) /
                        (totalCost || 1)) *
                      100
                    ).toFixed(2)}
                    %
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm text-slate-900">
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
                className="bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <td className="py-3 px-4">
                  <span className="text-slate-700 flex items-center gap-2 font-medium">
                    <Box className="w-4 h-4 text-[#202eac]" /> {p.name}
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-slate-600">
                  {p.quantity} UN
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="font-mono text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {((p.total / (totalCost || 1)) * 100).toFixed(2)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-slate-800 font-medium">
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
