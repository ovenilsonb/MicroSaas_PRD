export interface Variant {
  id?: string;
  name: string;
  codigo: string;
  cost_per_unit?: number | string;
  supplier_id?: string;
  estoque_atual?: number;
  estoque_minimo?: number;
}

export interface Ingredient {
  id: string;
  name: string;
  codigo?: string;
  apelido?: string;
  unit: string;
  cost_per_unit: number;
  fornecedor?: string;
  supplier_id?: string;
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
  sort_order?: number;
  created_at: string;
  variants?: Variant[];
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  tags?: string[];
}

export type ViewMode = 'list' | 'grid';
export type SortField = keyof Ingredient;
export type SortOrder = 'asc' | 'desc';
