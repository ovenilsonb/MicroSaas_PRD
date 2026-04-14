import { Formula as BaseFormula, FormulaIngredient as BaseFormulaIngredient } from './FormulaTypes';

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  produto_quimico: boolean;
}

export interface FormulaIngredient {
  id: string;
  ingredient_id: string;
  variant_id: string | null;
  quantity: number;
  ingredients: Ingredient;
  variants?: { name: string; cost_per_unit: number | null };
}

export interface Formula {
  id: string;
  name: string;
  version: string;
  lm_code: string | null;
  base_volume: number;
  yield_amount: number;
  yield_unit: string;
  status: string;
  group_id?: string;
  groups?: { name: string };
  categories?: { name: string };
  packaging_variant_id?: string;
  label_variant_id?: string;
  formula_ingredients: FormulaIngredient[];
}

export interface PackagingOption {
  id: string;
  variant_id: string | null;
  name: string;
  cost: number;
  capacity: number;
}

export interface PricingEntry {
  formulaId: string;
  capacityKey: string;
  varejoPrice: number;
  atacadoPrice: number;
  fardoPrice: number;
  fardoQty: number;
  fixedCosts: number;
  notAvailable?: boolean;
  varejoDisabled?: boolean;
  atacadoDisabled?: boolean;
  fardoDisabled?: boolean;
  updatedAt?: string;
}

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}
