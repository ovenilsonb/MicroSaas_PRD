import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  DollarSign, 
  Search, 
  Beaker, 
  ChevronRight, 
  ArrowLeft, 
  TrendingUp,
  Percent,
  Calculator,
  AlertCircle,
  ArrowUpRight,
  PieChart
} from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
}

interface FormulaIngredient {
  id: string;
  ingredient_id: string;
  variant_id: string | null;
  quantity: number;
  ingredients: Ingredient;
  variants?: {
    name: string;
    cost_per_unit: number | null;
  };
}

interface Formula {
  id: string;
  name: string;
  lm_code: string | null;
  base_volume: number;
  yield_amount: number;
  yield_unit: string;
  formula_ingredients: FormulaIngredient[];
}

export default function Precificacao() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  
  // Pricing state
  const [margin, setMargin] = useState<number>(30);
  const [fixedCosts, setFixedCosts] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);

  const formatInputCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const amount = parseInt(digits, 10) / 100;
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  useEffect(() => {
    fetchFormulas();
  }, []);

  async function fetchFormulas() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('formulas')
        .select(`
          *,
          formula_ingredients (
            *,
            ingredients (*),
            variants (name, cost_per_unit)
          )
        `)
        .order('name');

      if (error) throw error;
      setFormulas(data || []);
    } catch (err) {
      console.error('Erro ao buscar fórmulas:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredFormulas = useMemo(() => {
    return formulas.filter(f => 
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.lm_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [formulas, searchTerm]);

  const pricingData = useMemo(() => {
    if (!selectedFormula) return null;

    const ingredientsCost = selectedFormula.formula_ingredients.reduce((sum, item) => {
      let cost = 0;
      const variantCost = item.variants?.cost_per_unit;
      const ingredientCost = item.ingredients?.cost_per_unit;

      if (variantCost !== undefined && variantCost !== null) {
        cost = variantCost;
      } else if (ingredientCost !== undefined && ingredientCost !== null) {
        cost = ingredientCost;
      }
      return sum + (item.quantity * cost);
    }, 0);

    const costPerUnit = ingredientsCost / (selectedFormula.yield_amount || 1);
    const totalCostPerUnit = costPerUnit + fixedCosts;
    
    // Markup calculation: Price = Cost / (1 - (Margin + Taxes)/100)
    const totalDeductions = (margin + taxRate) / 100;
    const suggestedPrice = totalDeductions < 1 
      ? totalCostPerUnit / (1 - totalDeductions)
      : totalCostPerUnit * (1 + (margin / 100));

    const profit = suggestedPrice - totalCostPerUnit - (suggestedPrice * (taxRate / 100));

    return {
      ingredientsCost,
      costPerUnit,
      totalCostPerUnit,
      suggestedPrice,
      profit,
      profitMargin: suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0
    };
  }, [selectedFormula, margin, fixedCosts, taxRate]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (selectedFormula && pricingData) {
    return (
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedFormula(null)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-[#202eac]" />
                Precificação Estratégica
              </h1>
              <p className="text-sm text-slate-500 mt-1">Fórmula: <span className="font-semibold text-slate-700">{selectedFormula.name}</span></p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Inputs */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4">
                  <Calculator className="w-4 h-4 text-[#202eac]" />
                  Parâmetros de Cálculo
                </h3>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Margem de Lucro Desejada (%)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={margin}
                      onChange={(e) => setMargin(parseFloat(e.target.value) || 0)}
                      className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] outline-none transition-all"
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Custos Fixos / Operacionais (R$)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={fixedCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      onChange={(e) => {
                        const formatted = formatInputCurrency(e.target.value);
                        setFixedCosts(parseFloat(formatted.replace(/\./g, '').replace(',', '.')) || 0);
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] outline-none transition-all font-mono"
                    />
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Mão de obra, energia, embalagem, etc. por unidade.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Impostos e Taxas (%)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] outline-none transition-all"
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-700 text-xs flex gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>O cálculo utiliza o método de Markup. O preço sugerido garante a margem desejada após deduzir impostos e custos variáveis.</p>
              </div>
            </div>

            {/* Right Column: Results */}
            <div className="lg:col-span-8 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Custo de Produção</span>
                  <div className="text-xl font-black text-slate-800">{formatCurrency(pricingData.totalCostPerUnit)}</div>
                  <span className="text-[10px] text-slate-400">por {selectedFormula.yield_unit}</span>
                </div>
                <div className="bg-[#202eac] p-5 rounded-2xl shadow-lg shadow-blue-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 block mb-1">Preço Sugerido</span>
                  <div className="text-2xl font-black text-white">{formatCurrency(pricingData.suggestedPrice)}</div>
                  <div className="flex items-center gap-1 text-white/80 text-[10px] mt-1">
                    <ArrowUpRight className="w-3 h-3" /> Markup: {((pricingData.suggestedPrice / pricingData.totalCostPerUnit)).toFixed(2)}x
                  </div>
                </div>
                <div className="bg-emerald-500 p-5 rounded-2xl shadow-lg shadow-emerald-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 block mb-1">Lucro Líquido Real</span>
                  <div className="text-xl font-black text-white">{formatCurrency(pricingData.profit)}</div>
                  <div className="text-[10px] text-white/80 mt-1">Margem Real: {pricingData.profitMargin.toFixed(1)}%</div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[#202eac]" />
                    Composição do Preço
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Custo de Insumos (Matéria-Prima)</span>
                      <span className="font-bold text-slate-800">{formatCurrency(pricingData.costPerUnit)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Custos Fixos e Operacionais</span>
                      <span className="font-bold text-slate-800">{formatCurrency(fixedCosts)}</span>
                    </div>
                    <div className="h-px bg-slate-100"></div>
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className="text-slate-800">Custo Total (Break-even)</span>
                      <span className="text-slate-800">{formatCurrency(pricingData.totalCostPerUnit)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Impostos e Taxas ({taxRate}%)</span>
                      <span className="font-bold text-red-500">-{formatCurrency(pricingData.suggestedPrice * (taxRate / 100))}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Margem de Lucro ({margin}%)</span>
                      <span className="font-bold text-emerald-600">+{formatCurrency(pricingData.profit)}</span>
                    </div>
                    <div className="h-px bg-slate-200"></div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-slate-800">Preço de Venda Final</span>
                      <span className="text-2xl font-black text-[#202eac]">{formatCurrency(pricingData.suggestedPrice)}</span>
                    </div>
                  </div>

                  {/* Visual Bar */}
                  <div className="mt-8">
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-slate-400" 
                        style={{ width: `${(pricingData.totalCostPerUnit / pricingData.suggestedPrice) * 100}%` }}
                        title="Custo"
                      ></div>
                      <div 
                        className="h-full bg-red-400" 
                        style={{ width: `${(taxRate)}%` }}
                        title="Impostos"
                      ></div>
                      <div 
                        className="h-full bg-emerald-400" 
                        style={{ width: `${(pricingData.profit / pricingData.suggestedPrice) * 100}%` }}
                        title="Lucro"
                      ></div>
                    </div>
                    <div className="flex gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div> CUSTO
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div> IMPOSTOS
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full"></div> LUCRO
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-[#202eac]" />
            Precificação Estratégica
          </h1>
          <p className="text-sm text-slate-500 mt-1">Selecione uma fórmula para analisar custos e definir preços</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Search */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar fórmula por nome ou código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-slate-700"
            />
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
              Carregando fórmulas...
            </div>
          ) : filteredFormulas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
              Nenhuma fórmula encontrada.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFormulas.map((formula) => (
                <button
                  key={formula.id}
                  onClick={() => setSelectedFormula(formula)}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-[#202eac] hover:shadow-md transition-all text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-[#202eac] rounded-xl flex items-center justify-center group-hover:bg-[#202eac] group-hover:text-white transition-colors">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 group-hover:text-[#202eac] transition-colors">{formula.name}</h3>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">{formula.lm_code || 'S/C'}</span>
                        <span>•</span>
                        <span>Rendimento: {formula.yield_amount} {formula.yield_unit}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#202eac] transition-all group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
