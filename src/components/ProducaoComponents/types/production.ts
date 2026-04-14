export type OrderStatus = 'planned' | 'weighing' | 'mixing' | 'homogenizing' | 'quality_check' | 'completed' | 'cancelled';

export interface FormulaIngredient {
  id: string;
  ingredient_id: string;
  variant_id: string | null;
  quantity: number;
  ingredients: {
    name: string;
    unit: string;
    cost_per_unit: number;
    produto_quimico: boolean;
    risco?: string;
  };
  variants?: { name: string; cost_per_unit: number | null };
}

export interface Formula {
  id: string;
  name: string;
  version: string;
  base_volume: number;
  lm_code: string | null;
  batch_prefix: string | null;
  status: string;
  instructions?: string;
  formula_ingredients: FormulaIngredient[];
  groups?: { name: string };
}

export interface ProductionStep {
  key: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface IngredientBatch {
  ingredientId: string;
  supplierBatch: string;
  quantityUsed: number;
  verified: boolean;
}

export interface PackagingPlanItem {
  packagingId: string;
  variantId: string | null;
  name: string;
  capacity: number;
  quantity: number;
  cost: number;
  unit: string;
}

export interface PackagingOption {
  id: string;
  variant_id: string | null;
  name: string;
  cost: number;
  capacity: number;
}

export interface ProductionOrder {
  id: string;
  formula_id: string;
  batch_number: string;
  planned_volume: number;
  actual_volume: number | null;
  status: OrderStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at?: string;
  steps?: ProductionStep[];
  ingredientBatches?: IngredientBatch[];
  operatorName?: string;
  equipmentId?: string;
  formulaSnapshot?: Formula;
  packagingPlan?: PackagingPlanItem[];
}
