import { ReactNode } from 'react';

export type SaleStatus = 
  | 'rascunho'      // Editável, sem impacto em estoque
  | 'producao'      // Aguardando OF vinculada
  | 'separacao'     // Pronto p/ estoqueiro separar
  | 'retirada'      // Disponível para o cliente buscar
  | 'transito'      // Em rota de entrega
  | 'recebido'      // Finalizado e concretizado
  | 'cancelado'     // Cancelado antes do envio
  | 'reproducao'    // Necessário refazer (reprovado na qualidade)
  | 'devolvido';    // Devolvido após envio (Quarentena)

export type DeliveryMethod = 'retirada' | 'entrega';

export interface SaleOrderItem {
  id: string;
  finished_good_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface SaleOrder {
  id: string;
  number: string;
  client_id: string;
  client_name: string;
  status: SaleStatus;
  delivery_method: DeliveryMethod;
  items: SaleOrderItem[];
  total_value: number;
  discount: number;
  final_value: number;
  created_at: string;
  expected_delivery_date?: string;
  confirmed_at?: string; 
  expected_return_date?: string; 
  notes?: string;
  production_order_id?: string; 
  price_table?: 'varejo' | 'atacado' | 'fardo'; 
}

export interface PricingEntry {
  formulaId: string;
  capacityKey: string;
  varejoPrice: number;
  atacadoPrice: number;
  fardoPrice: number;
  fardoQty: number;
  notAvailable?: boolean;
}

export interface CatalogItem {
  id: string;
  formula_id: string;
  name: string;
  capacity: string;
  stock_quantity: number;
  group_id: string;
  pricing: PricingEntry;
  existsInInventory: boolean;
}

export interface StatusConfig {
  label: string;
  color: string;
  icon: ReactNode;
}
