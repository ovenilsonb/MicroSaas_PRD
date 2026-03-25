import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  FileBarChart, 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  Beaker, 
  Calendar,
  ChevronRight,
  ArrowRight,
  DollarSign,
  PieChart,
  BarChart3,
  Activity
} from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  estoque_atual: number;
  estoque_minimo: number;
  cost_per_unit: number;
  expiry_date: string | null;
  validade_indeterminada: boolean;
}

interface Formula {
  id: string;
  name: string;
  formula_ingredients: {
    quantity: number;
    ingredients: {
      cost_per_unit: number;
    } | { cost_per_unit: number }[];
    variants?: {
      cost_per_unit: number | null;
    } | { cost_per_unit: number | null }[];
  }[];
}

export default function Relatorios() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setIsLoading(true);
      const [ingRes, forRes] = await Promise.all([
        supabase.from('ingredients').select('*'),
        supabase.from('formulas').select(`
          id, name,
          formula_ingredients (
            quantity,
            ingredients (cost_per_unit),
            variants (cost_per_unit)
          )
        `)
      ]);

      if (ingRes.error) throw ingRes.error;
      if (forRes.error) throw forRes.error;

      setIngredients(ingRes.data || []);
      setFormulas(forRes.data || []);
    } catch (err) {
      console.error('Erro ao buscar dados para relatórios:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const stats = useMemo(() => {
    const lowStock = ingredients.filter(i => i.estoque_atual <= i.estoque_minimo);
    const expiringSoon = ingredients.filter(i => {
      if (i.validade_indeterminada || !i.expiry_date) return false;
      const expiry = new Date(i.expiry_date);
      const now = new Date();
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && diffDays >= 0;
    });

    const totalInventoryValue = ingredients.reduce((sum, i) => sum + (i.estoque_atual * i.cost_per_unit), 0);
    
    const formulaCosts = formulas.map(f => {
      const cost = f.formula_ingredients.reduce((sum, item) => {
        let itemCost = 0;
        const variantData = Array.isArray(item.variants) ? item.variants[0] : item.variants;
        const ingredientData = Array.isArray(item.ingredients) ? item.ingredients[0] : item.ingredients;
        
        const variantCost = variantData?.cost_per_unit;
        const ingredientCost = ingredientData?.cost_per_unit;

        if (variantCost !== undefined && variantCost !== null) {
          itemCost = variantCost;
        } else if (ingredientCost !== undefined && ingredientCost !== null) {
          itemCost = ingredientCost;
        }
        return sum + (item.quantity * itemCost);
      }, 0);
      return { name: f.name, cost };
    });

    const mostExpensiveFormula = [...formulaCosts].sort((a, b) => b.cost - a.cost)[0];

    return {
      lowStock,
      expiringSoon,
      totalInventoryValue,
      mostExpensiveFormula,
      totalIngredients: ingredients.length,
      totalFormulas: formulas.length
    };
  }, [ingredients, formulas]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-[#202eac] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Gerando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <FileBarChart className="w-6 h-6 text-[#202eac]" />
            Relatórios e Insights
          </h1>
          <p className="text-sm text-slate-500 mt-1">Visão geral do seu inventário e produção</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-50 text-[#202eac] rounded-lg">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Insumos</span>
              </div>
              <div className="text-2xl font-black text-slate-800">{stats.totalIngredients}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Beaker className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fórmulas</span>
              </div>
              <div className="text-2xl font-black text-slate-800">{stats.totalFormulas}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor em Estoque</span>
              </div>
              <div className="text-2xl font-black text-emerald-600">{formatCurrency(stats.totalInventoryValue)}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertas Ativos</span>
              </div>
              <div className="text-2xl font-black text-orange-600">{stats.lowStock.length + stats.expiringSoon.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Low Stock Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Insumos com Estoque Baixo
                </h3>
                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {stats.lowStock.length} alertas
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {stats.lowStock.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm italic">Nenhum insumo com estoque crítico.</div>
                ) : (
                  stats.lowStock.map(ing => (
                    <div key={ing.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{ing.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Mínimo: {ing.estoque_minimo} {ing.unit}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-red-600">{ing.estoque_atual} {ing.unit}</div>
                        <div className="text-[10px] text-red-400 font-bold uppercase tracking-tighter">Crítico</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expiry Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Próximos ao Vencimento (30 dias)
                </h3>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {stats.expiringSoon.length} itens
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {stats.expiringSoon.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm italic">Nenhum insumo vencendo em breve.</div>
                ) : (
                  stats.expiringSoon.map(ing => {
                    const expiry = new Date(ing.expiry_date!);
                    const diff = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={ing.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{ing.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Vencimento: {expiry.toLocaleDateString('pt-BR')}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-black ${diff <= 7 ? 'text-red-600' : 'text-orange-600'}`}>
                            {diff} dias
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Restantes</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Insights Section */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#202eac]" />
              Insights de Produção
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="p-3 bg-white rounded-lg shadow-sm text-[#202eac]">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fórmula Mais Cara</span>
                    <div className="font-bold text-slate-800">{stats.mostExpensiveFormula?.name || 'N/A'}</div>
                    <div className="text-xs text-emerald-600 font-bold">{formatCurrency(stats.mostExpensiveFormula?.cost || 0)} <span className="text-slate-400 font-normal">/ L</span></div>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-sm flex gap-3">
                  <PieChart className="w-5 h-5 shrink-0" />
                  <p>O valor total do seu inventário é de <strong>{formatCurrency(stats.totalInventoryValue)}</strong>. Considere otimizar o estoque de itens com baixo giro.</p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-[#202eac]">
                  <Activity className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-800">Saúde do Inventário</h4>
                <p className="text-xs text-slate-500 mt-2 max-w-[240px]">
                  {stats.lowStock.length > 0 
                    ? `Você tem ${stats.lowStock.length} itens abaixo do estoque mínimo. Isso pode afetar a produção em breve.`
                    : "Seu estoque está saudável! Todos os itens estão acima do nível mínimo de segurança."}
                </p>
                <button 
                  onClick={() => fetchData()}
                  className="mt-4 text-[#202eac] text-xs font-bold flex items-center gap-1 hover:underline"
                >
                  Atualizar Dados <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
