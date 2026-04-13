import React from 'react';
import { Package, AlertTriangle, TrendingUp, Beaker } from 'lucide-react';

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface InsumoStatsProps {
  total: number;
  lowStock: number;
  chemical: number;
  investment: number;
  suppliersCount: number;
}

export default function InsumoStats({ total, lowStock, chemical, investment, suppliersCount }: InsumoStatsProps) {
  return (
    <>
      <div className="bg-gradient-to-br from-white dark:from-slate-900 via-slate-50 dark:via-slate-900 to-slate-100 dark:to-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
            <Package className="w-8 h-8 text-white" />
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Gestão de Insumos e Matérias-Primas
              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">Módulo Principal</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1.5 leading-relaxed max-w-3xl">
              Gerencie todas as matérias-primas utilizadas na produção. Este módulo é a base do sistema, permitindo controlar custos unitários, fornecedores, estoque mínimo e variações de produtos. Mantenha o cadastro atualizado para garantir qualidade e eficiência na fabricação.
            </p>

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium uppercase">{total} itens cadastrados</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                <Beaker className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium uppercase">{suppliersCount} fornecedores</span>
              </div>
              {lowStock > 0 && (
                <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-red-700 dark:text-red-400 text-sm font-medium uppercase">{lowStock} alertas de estoque</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                <Beaker className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium uppercase">{chemical} produtos químicos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white dark:from-slate-900 to-slate-50 dark:to-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 group hover:shadow-md hover:border-[#202eac]/30 dark:hover:border-blue-500/30 transition-all duration-300">
          <div className="w-12 h-12 bg-gradient-to-br from-[#202eac] to-[#4b5ce8] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 text-xs font-medium truncate uppercase">Total de Insumos</p>
            <h3 className="text-2xl font-bold text-slate-800">{total}</h3>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white dark:from-slate-900 to-slate-50 dark:to-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 group hover:shadow-md hover:border-red-300 dark:hover:border-red-800 transition-all duration-300">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 shrink-0">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium truncate uppercase">Estoque Baixo</p>
            <h3 className={`text-2xl font-bold ${lowStock > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
              {lowStock}
            </h3>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white dark:from-slate-900 to-slate-50 dark:to-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 group hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800 transition-all duration-300">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium truncate uppercase">Valor em Estoque</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
              {investment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h3>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white dark:from-slate-900 to-slate-50 dark:to-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 group hover:shadow-md hover:border-amber-300 dark:hover:border-amber-800 transition-all duration-300">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Beaker className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium truncate uppercase">Produtos Químicos</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{chemical}</h3>
          </div>
        </div>
      </div>
    </>
  );
}
