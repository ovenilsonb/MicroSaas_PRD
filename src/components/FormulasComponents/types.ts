export interface Group {
  id: string;
  name: string;
}

export interface Ingredient {
  id: string;
  name: string;
  apelido?: string;
  unit: string;
  cost_per_unit: number;
  produto_quimico: boolean;
  tem_variantes?: boolean;
  variants?: {
    id: string;
    name: string;
    codigo?: string;
    cost_per_unit: number | string;
  }[];
}

export interface FormulaIngredient {
  id?: string;
  formula_id?: string;
  ingredient_id: string;
  variant_id?: string | null;
  quantity: number;
  ingredients?: {
    name: string;
    unit: string;
    cost_per_unit: number | string;
    produto_quimico: boolean;
  };
  variants?: {
    name: string;
    cost_per_unit: number | string;
  } | null;
}

export interface Formula {
  id: string;
  name: string;
  version: string;
  base_volume: number;
  status: 'draft' | 'active' | 'archived';
  group_id?: string;
  lm_code?: string;
  description?: string;
  instructions?: string;
  yield_amount?: number;
  yield_unit?: string;
  batch_prefix?: string;
  created_at: string;
  updated_at: string;
  formula_ingredients?: FormulaIngredient[];
  groups?: { name: string };
  ph_min?: string;
  ph_max?: string;
  viscosity_min?: string;
  viscosity_max?: string;
  packaging_variant_id?: string;
  label_variant_id?: string;
}

export type ViewMode = 'grid' | 'list' | 'editor';
export type SortField = 'name' | 'created_at' | 'version';
export type SortOrder = 'asc' | 'desc';
