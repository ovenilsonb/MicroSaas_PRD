import { useState, useEffect } from 'react';

export interface SidebarSection {
  id: string;
  title: string;
  itemIds: string[];
  isVisible: boolean;
}

export interface CompanySettings {
  name: string;
  subText: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  logo: string | null;
  headerFont: string;
  primaryColor: string;
  isDarkMode: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  sidebarLayout: SidebarSection[];
}

const DEFAULT_SETTINGS: CompanySettings = {
  name: 'OHANA CLEAN',
  subText: 'Industrial Planner',
  document: '',
  email: '',
  phone: '',
  address: '',
  logo: null,
  headerFont: 'Inter',
  primaryColor: '#202eac',
  isDarkMode: false,
  watermarkText: 'OHANA CLEAN',
  watermarkOpacity: 0.05,
  sidebarLayout: [
    {
      id: 'principal',
      title: 'Principal',
      itemIds: ['dashboard', 'insumos', 'formulas', 'proporcao', 'precificacao'],
      isVisible: true
    },
    {
      id: 'gestao',
      title: 'Gestão',
      itemIds: ['fornecedores', 'clientes', 'relatorios'],
      isVisible: true
    },
    {
      id: 'operacoes',
      title: 'Operações',
      itemIds: ['estoque', 'producao', 'qualidade'],
      isVisible: true
    },
    {
      id: 'negocios',
      title: 'Negócios & Sistema',
      itemIds: ['compras', 'vendas', 'usuarios'],
      isVisible: true
    }
  ],
};

const STORAGE_KEY = 'local_company_settings';

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (newSettings: Partial<CompanySettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return { settings, updateSettings };
}
