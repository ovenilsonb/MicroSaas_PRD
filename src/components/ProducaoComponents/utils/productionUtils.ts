import React from 'react';
import { Shield, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { FormulaIngredient } from './types/production';

export const fmt = (v: number) => 
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const parseCost = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;
};

export const generateBatchNumber = (prefix: string | null): string => {
  const p = prefix || 'LOT';
  const d = new Date();
  const ds = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
  const rnd = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${p}-${ds}-${rnd}`;
};

export const getBaseFormulaName = (name: string): string => {
  return name
    .trim()
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .trim()
    .toUpperCase();
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

export interface RiskIcon {
  icon: React.ReactNode;
  label: string;
  color: string;
}

export const getRiskIcons = (ingredients: FormulaIngredient[]): RiskIcon[] => {
  const risks: RiskIcon[] = [];
  const hasChemical = ingredients.some(i => i.ingredients?.produto_quimico);
  const hasCorrosive = ingredients.some(i => i.ingredients?.risco?.toLowerCase().includes('corros'));
  
  if (hasChemical) {
    risks.push({ 
      icon: React.createElement(Shield, { className: "w-4 h-4" }), 
      label: 'Luvas Obrigatórias', 
      color: 'text-amber-600 bg-amber-50 border-amber-200' 
    });
    risks.push({ 
      icon: React.createElement(Eye, { className: "w-4 h-4" }), 
      label: 'Óculos de Proteção', 
      color: 'text-blue-600 bg-blue-50 border-blue-200' 
    });
  }
  
  if (hasCorrosive) {
    risks.push({ 
      icon: React.createElement(AlertTriangle, { className: "w-4 h-4" }), 
      label: 'Risco Corrosivo', 
      color: 'text-red-600 bg-red-50 border-red-200' 
    });
  }
  
  if (risks.length === 0) {
    risks.push({ 
      icon: React.createElement(CheckCircle2, { className: "w-4 h-4" }), 
      label: 'EPI Padrão', 
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200' 
    });
  }
  
  return risks;
};
