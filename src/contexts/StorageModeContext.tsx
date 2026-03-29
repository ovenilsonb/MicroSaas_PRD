import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type StorageMode = 'local' | 'supabase';

interface StorageModeContextType {
  mode: StorageMode;
  setMode: (mode: StorageMode) => void;
  syncFromSupabase: () => Promise<void>;
  isSyncing: boolean;
}

const StorageModeContext = createContext<StorageModeContextType | undefined>(undefined);

export function StorageModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<StorageMode>(() => {
    const savedMode = localStorage.getItem('storageMode') as StorageMode | null;
    return savedMode || 'supabase';
  });

  const [isSyncing, setIsSyncing] = useState(false);

  const setMode = (newMode: StorageMode) => {
    setModeState(newMode);
    localStorage.setItem('storageMode', newMode);
  };

  const syncFromSupabase = async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch Ingredients and Variants
      const { data: ingredients } = await supabase.from('ingredients').select('*, variants:ingredient_variants(*)');
      if (ingredients) localStorage.setItem('local_ingredients', JSON.stringify(ingredients));

      // 2. Fetch Groups
      const { data: groups } = await supabase.from('groups').select('*');
      if (groups) localStorage.setItem('local_groups', JSON.stringify(groups));

      // 3. Fetch Formulas and Formula Ingredients
      const { data: formulas } = await supabase.from('formulas').select(`
        *,
        groups (name),
        formula_ingredients (
          id, quantity, ingredient_id, variant_id,
          ingredients (name, unit, cost_per_unit, produto_quimico),
          variants:ingredient_variants (name, cost_per_unit)
        )
      `);
      if (formulas) localStorage.setItem('local_formulas', JSON.stringify(formulas));

      // 4. Fetch Suppliers
      const { data: suppliers } = await supabase.from('suppliers').select('*');
      if (suppliers) localStorage.setItem('local_suppliers', JSON.stringify(suppliers));

      alert('Sincronização concluída! Os dados do Supabase foram copiados para o seu armazenamento local.');
      window.location.reload(); // Reload to refresh all components
    } catch (error) {
      console.error('Erro na sincronização:', error);
      alert('Erro ao sincronizar dados. Verifique sua conexão.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <StorageModeContext.Provider value={{ mode, setMode, syncFromSupabase, isSyncing }}>
      {children}
    </StorageModeContext.Provider>
  );
}

export function useStorageMode() {
  const context = useContext(StorageModeContext);
  if (context === undefined) {
    throw new Error('useStorageMode must be used within a StorageModeProvider');
  }
  return context;
}
