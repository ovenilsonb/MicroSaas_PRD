import { Formula, FormulaIngredient, PackagingOption } from './types';

export const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const parseCost = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (!s) return 0;
  if (s.includes(',')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  const dotCount = (s.match(/\./g) || []).length;
  if (dotCount > 1) {
    return parseFloat(s.replace(/\./g, '')) || 0;
  }
  return parseFloat(s) || 0;
};

export const formatCapacity = (cap: number) => cap >= 1 ? `${cap}L` : `${cap * 1000}ml`;

export const getPackTerm = (cap: number) => cap >= 3 ? 'Caixa' : 'Fardo';

export const calcIngredientCost = (f: Formula) =>
  f.formula_ingredients.reduce((sum, item) => {
    const vc = parseCost(item.variants?.cost_per_unit);
    const ic = parseCost(item.ingredients?.cost_per_unit);
    return sum + item.quantity * (vc || ic);
  }, 0);

export const calculateMargins = (price: number, cost: number) => {
  const lucro = price - cost;
  const margem = price > 0 ? (lucro / price) * 100 : 0;
  const markup = cost > 0 ? ((price - cost) / cost) * 100 : 0;
  return { lucro, margem, markup };
};

export const compareVersions = (v1: string, v2: string) => {
  if (!v1) return -1;
  if (!v2) return 1;
  const parse = (v: string) => v.toLowerCase().replace(/[^\d.]/g, '').split('.').map(Number);
  const p1 = parse(v1);
  const p2 = parse(v2);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 !== num2) return num1 - num2;
  }
  return 0;
};

export const getBaseFormulaName = (name: string): string => {
  return name.toLowerCase()
    .replace(/\s*-\s*[vV]?\d+(?:\.\d+)?.*$/i, '')
    .replace(/\s*v\d+(?:\.\d+)?.*$/i, '')
    .trim();
};

export const getFormulaCategory = (formula: Formula): string => {
  return formula.categories?.name || formula.groups?.name || 'Sem Categoria';
};

export const categoryColors: Record<string, { bg: string; text: string }> = {
  Amaciantes: { bg: 'bg-green-100', text: 'text-green-700' },
  Detergentes: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Desinfetantes: { bg: 'bg-red-100', text: 'text-red-700' },
  Limpadores: { bg: 'bg-amber-100', text: 'text-amber-700' },
  Sabões: { bg: 'bg-purple-100', text: 'text-purple-700' },
  Produtos: { bg: 'bg-slate-100', text: 'text-slate-700' },
};

export const capacityColors: Record<number, { bg: string; text: string; border: string }> = {
  0.5: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  1: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  2: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  5: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

export const getCapColor = (cap: number) => capacityColors[cap] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
