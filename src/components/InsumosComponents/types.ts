export interface Variant {
  id?: string;
  name: string;
  codigo: string;
  cost_per_unit?: number | string;
}

export interface Ingredient {
  id: string;
  name: string;
  codigo?: string;
  apelido?: string;
  unit: string;
  cost_per_unit: number;
  fornecedor?: string;
  validade_indeterminada?: boolean;
  expiry_date?: string;
  estoque_atual?: number;
  estoque_minimo?: number;
  produto_quimico?: boolean;
  tem_variantes?: boolean;
  peso_especifico?: string;
  ph?: string;
  temperatura?: string;
  viscosidade?: string;
  solubilidade?: string;
  risco?: string;
  created_at: string;
  variants?: Variant[];
}

export interface Supplier {
  id: string;
  name: string;
}

export type ViewMode = 'list' | 'grid';
export type SortField = keyof Ingredient;
export type SortOrder = 'asc' | 'desc';
