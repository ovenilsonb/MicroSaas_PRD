import { useState, useEffect } from 'react';

export interface CompanySettings {
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  logo: string | null;
  headerFont: string;
  primaryColor: string;
}

const DEFAULT_SETTINGS: CompanySettings = {
  name: 'OHANA CLEAN',
  document: '',
  email: '',
  phone: '',
  address: '',
  logo: null,
  headerFont: 'Inter',
  primaryColor: '#202eac',
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
