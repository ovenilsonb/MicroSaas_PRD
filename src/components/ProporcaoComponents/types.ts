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
  variants?: {
    name: string;
    cost_per_unit: number | null;
  };
}

export interface Formula {
  id: string;
  name: string;
  version: string;
  lm_code: string | null;
  base_volume: number;
  status: 'active' | 'draft' | 'archived';
  formula_ingredients: FormulaIngredient[];
}

export interface PackagingOption {
  id: string;
  variant_id: string | null;
  name: string;
  cost: number;
  capacity: number;
}

export interface AssemblyOption {
  id: string;
  name: string;
  items: { capacity: number; quantity: number }[];
  isSuggested?: boolean;
}

export interface Simulation {
  id: string;
  formulaId: string;
  formulaName: string;
  formulaVersion: string;
  targetVolume: number;
  totalCost: number;
  createdAt: string;
  displayName: string;
  ingredients: SimulationIngredient[];
}

export interface SimulationIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number;
  isChemical: boolean;
  percentage?: number;
}

export interface CalculatedIngredient extends FormulaIngredient {
  calculatedQuantity: number;
}

export interface NonChemicalCost {
  name: string;
  quantity: number;
  cost: number;
  total: number;
}

export interface CalculationResult {
  ingredients: (FormulaIngredient & { calculatedQuantity: number })[];
  nonChemicalCosts: NonChemicalCost[];
}

export type CalculationMode = 'volume' | 'units';
export type ViewMode = 'grid' | 'list';
