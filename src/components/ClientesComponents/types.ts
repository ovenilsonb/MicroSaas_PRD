export interface Client {
  id: string;
  name: string;
  cnpj_cpf: string | null;
  document_type: 'CPF' | 'CNPJ';
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  tabela_preco: 'Varejo' | 'Atacado' | 'Fardo' | string;
  tags: string[];
  created_at: string;
  updated_at?: string;
}

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];
