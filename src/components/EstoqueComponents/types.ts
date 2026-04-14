import { Formula } from '../FormulasComponents/types';

export interface InventoryLog {
  id: string;
  ingredient_id?: string;
  quantity: number;
  type: 'in' | 'out' | 'adjust' | 'finished_good_in' | 'finished_good_out';
  notes: string | null;
  created_at: string;
  reference_id?: string; // Used for linking to finished goods in Supabase
  ingredients?: {
    nome: string;
    unidade_medida: string;
    estoque_atual: number;
    estoque_minimo: number;
  };
}

export interface IngredientStats {
  id: string;
  nome: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_medida: string;
}

export interface FinishedGood {
  id: string;
  key: string;
  name: string;
  formula_id: string;
  packaging_id: string;
  variant_id: string | null;
  capacity?: number;
  stock_quantity: number;
  reserved_quantity?: number;
}

export interface FinishedGoodLog {
  id: string;
  finished_good_id: string;
  quantity: number;
  type: 'in' | 'out' | 'adjust';
  notes: string | null;
  created_at: string;
  finished_good?: FinishedGood;
}

export type InventoryTab = 'finished' | 'raw';
