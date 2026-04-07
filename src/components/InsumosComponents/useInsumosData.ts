import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { generateId } from '../../lib/id';
import { useStorageMode } from '../../contexts/StorageModeContext';
import { Ingredient, Variant } from './types';

const SAMPLE_INGREDIENTS: Omit<Ingredient, 'id'>[] = [
  { name: 'Água Desmineralizada', unit: 'L', cost_per_unit: 0.50, produto_quimico: true, created_at: new Date().toISOString(), estoque_atual: 1000, estoque_minimo: 100 },
  { name: 'Essência de Lavanda', unit: 'L', cost_per_unit: 45.00, produto_quimico: true, created_at: new Date().toISOString(), estoque_atual: 10, estoque_minimo: 2 },
  { name: 'Frasco 500ml', unit: 'UN', cost_per_unit: 1.20, produto_quimico: false, created_at: new Date().toISOString(), estoque_atual: 500, estoque_minimo: 50 },
];

function seedSampleData(): Ingredient[] {
  const data = SAMPLE_INGREDIENTS.map(s => ({ ...s, id: generateId() }));
  localStorage.setItem('local_ingredients', JSON.stringify(data));
  return data;
}

export interface StockMovement {
  id: string;
  ingredient_id: string;
  variant_id?: string;
  type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  balance_after?: number;
  date: string;
  note?: string;
  user?: string;
  batch?: string;
  reference_id?: string;
}

interface UseInsumosDataReturn {
  ingredients: Ingredient[];
  suppliers: { id: string; name: string }[];
  isLoading: boolean;
  fetchIngredients: () => Promise<void>;
  saveIngredient: (ingredient: Partial<Ingredient>) => Promise<boolean>;
  deleteIngredient: (id: string) => Promise<boolean>;
  updateStock: (id: string, quantity: number) => Promise<boolean>;
  getIngredientVariants: (ingredientId: string) => Promise<Variant[]>;
  addStockMovement: (movement: Omit<StockMovement, 'id' | 'balance_after'>) => Promise<boolean>;
  getStockMovements: (ingredientId: string, startDate?: string, endDate?: string) => Promise<StockMovement[]>;
  exportStockMovements: (movements: StockMovement[]) => void;
}

export function useInsumosData(): UseInsumosDataReturn {
  const { mode } = useStorageMode();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIngredients = useCallback(async () => {
    setIsLoading(true);
    try {
      if (mode === 'supabase') {
        try {
          const { data, error } = await supabase
            .from('ingredients')
            .select('*, variants:ingredient_variants(*)')
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });
          if (error) throw error;
          setIngredients(data || []);

          const { data: supplierData } = await supabase.from('suppliers').select('id, name').order('name');
          setSuppliers(supplierData || []);
        } catch (err) {
          console.error('[useInsumosData] Supabase fetch failed, falling back to localStorage:', err);
          const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
          if (localIngredients.length === 0) seedSampleData();
          setIngredients(JSON.parse(localStorage.getItem('local_ingredients') || '[]'));
        }
      } else {
        let localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
        if (localIngredients.length === 0) {
          localIngredients = seedSampleData();
        }
        setIngredients(localIngredients);

        try {
          const localSuppliers = JSON.parse(localStorage.getItem('local_suppliers') || '[]');
          setSuppliers(localSuppliers);
        } catch {
          setSuppliers([]);
        }
      }
    } catch (err) {
      console.error('[useInsumosData] Unexpected error fetching ingredients:', err);
      setIngredients([]);
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  const getIngredientVariants = useCallback(async (ingredientId: string): Promise<Variant[]> => {
    if (mode === 'supabase') {
      const { data } = await supabase
        .from('ingredient_variants')
        .select('*')
        .eq('ingredient_id', ingredientId);
      return data || [];
    } else {
      const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
      const localIng = localIngredients.find((i: any) => i.id === ingredientId);
      return localIng?.variants || [];
    }
  }, [mode]);

  const saveIngredient = useCallback(async (ingredient: Partial<Ingredient>): Promise<boolean> => {
    try {
      const ingredientId = ingredient.id || generateId();
      const now = new Date().toISOString();

      const ingredientData = {
        ...ingredient,
        id: ingredientId,
        created_at: ingredient.created_at || now,
      };

      if (mode === 'supabase') {
        const { error } = await supabase.from('ingredients').upsert(ingredientData);
        if (error) throw error;

        if (ingredient.tem_variantes && ingredient.variants && ingredient.variants.length > 0) {
          await supabase.from('ingredient_variants').delete().eq('ingredient_id', ingredientId);
          for (const variant of ingredient.variants) {
            await supabase.from('ingredient_variants').insert({
              id: variant.id || generateId(),
              ingredient_id: ingredientId,
              name: variant.name,
              codigo: variant.codigo,
              cost_per_unit: variant.cost_per_unit,
              supplier_id: variant.supplier_id,
              estoque_atual: variant.estoque_atual,
              estoque_minimo: variant.estoque_minimo,
            });
          }
        } else {
          await supabase.from('ingredient_variants').delete().eq('ingredient_id', ingredientId);
        }
      } else {
        const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
        const existingIndex = localIngredients.findIndex((i: Ingredient) => i.id === ingredientId);

        if (existingIndex >= 0) {
          localIngredients[existingIndex] = { ...localIngredients[existingIndex], ...ingredientData };
        } else {
          localIngredients.push(ingredientData);
        }

        localStorage.setItem('local_ingredients', JSON.stringify(localIngredients));
      }

      await fetchIngredients();
      return true;
    } catch (err) {
      console.error('[useInsumosData] Error saving ingredient:', err);
      return false;
    }
  }, [mode, fetchIngredients]);

  const deleteIngredient = useCallback(async (id: string): Promise<boolean> => {
    try {
      if (mode === 'supabase') {
        const { error } = await supabase.from('ingredients').delete().eq('id', id);
        if (error) throw error;
      } else {
        const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
        const filtered = localIngredients.filter((i: Ingredient) => i.id !== id);
        localStorage.setItem('local_ingredients', JSON.stringify(filtered));
      }

      await fetchIngredients();
      return true;
    } catch (err) {
      console.error('[useInsumosData] Error deleting ingredient:', err);
      return false;
    }
  }, [mode, fetchIngredients]);

  const updateStock = useCallback(async (id: string, quantity: number): Promise<boolean> => {
    try {
      if (mode === 'supabase') {
        const { error } = await supabase
          .from('ingredients')
          .update({ estoque_atual: quantity })
          .eq('id', id);
        if (error) throw error;
      } else {
        const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
        const index = localIngredients.findIndex((i: Ingredient) => i.id === id);
        if (index >= 0) {
          localIngredients[index].estoque_atual = quantity;
          localStorage.setItem('local_ingredients', JSON.stringify(localIngredients));
        }
      }

      await fetchIngredients();
      return true;
    } catch (err) {
      console.error('[useInsumosData] Error updating stock:', err);
      return false;
    }
  }, [mode, fetchIngredients]);

  const addStockMovement = useCallback(async (movement: Omit<StockMovement, 'id' | 'balance_after'>): Promise<boolean> => {
    const ingredientId = movement.ingredient_id;
    try {
      let currentStock = 0;

      if (mode === 'supabase') {
        const { data: ingredient } = await supabase
          .from('ingredients')
          .select('estoque_atual')
          .eq('id', ingredientId)
          .single();

        if (!ingredient) return false;
        currentStock = ingredient.estoque_atual || 0;

        const newStock = movement.type === 'entrada'
          ? currentStock + movement.quantity
          : movement.type === 'saida'
            ? Math.max(0, currentStock - movement.quantity)
            : movement.quantity;

        const { error: logError } = await supabase.from('inventory_logs').insert({
          ingredient_id: ingredientId,
          variant_id: movement.variant_id || null,
          quantity: movement.quantity,
          type: movement.type === 'entrada' ? 'in' : movement.type === 'saida' ? 'out' : 'adjust',
          reference_id: movement.reference_id || null,
          notes: movement.note || null,
        });

        if (logError) throw logError;

        await supabase
          .from('ingredients')
          .update({ estoque_atual: newStock })
          .eq('id', ingredientId);

      } else {
        const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
        const ingredient = localIngredients.find((i: Ingredient) => i.id === ingredientId);
        if (!ingredient) return false;

        currentStock = ingredient.estoque_atual || 0;
        const newStock = movement.type === 'entrada'
          ? currentStock + movement.quantity
          : movement.type === 'saida'
            ? Math.max(0, currentStock - movement.quantity)
            : movement.quantity;

        ingredient.estoque_atual = newStock;
        const idx = localIngredients.findIndex((i: Ingredient) => i.id === ingredientId);
        localIngredients[idx] = ingredient;
        localStorage.setItem('local_ingredients', JSON.stringify(localIngredients));

        const movements = JSON.parse(localStorage.getItem(`stock_movements_${ingredientId}`) || '[]');
        const newMovement: StockMovement = {
          id: generateId(),
          ingredient_id: ingredientId,
          variant_id: movement.variant_id,
          type: movement.type,
          quantity: movement.quantity,
          balance_after: newStock,
          date: movement.date || new Date().toISOString(),
          note: movement.note,
          user: movement.user,
          batch: movement.batch,
          reference_id: movement.reference_id,
        };
        movements.unshift(newMovement);
        localStorage.setItem(`stock_movements_${ingredientId}`, JSON.stringify(movements));
      }

      await fetchIngredients();
      return true;
    } catch (err) {
      console.error('[useInsumosData] Error adding stock movement:', err);
      return false;
    }
  }, [mode, fetchIngredients]);

  const getStockMovements = useCallback(async (ingredientId: string, startDate?: string, endDate?: string): Promise<StockMovement[]> => {
    try {
      if (mode === 'supabase') {
        let query = supabase
          .from('inventory_logs')
          .select('*')
          .eq('ingredient_id', ingredientId)
          .order('created_at', { ascending: false });

        if (startDate) {
          query = query.gte('created_at', startDate);
        }
        if (endDate) {
          query = query.lte('created_at', endDate);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(log => ({
          id: log.id,
          ingredient_id: log.ingredient_id,
          variant_id: log.variant_id,
          type: log.type === 'in' ? 'entrada' : log.type === 'out' ? 'saida' : 'ajuste',
          quantity: log.quantity,
          balance_after: undefined,
          date: log.created_at,
          note: log.notes,
          batch: null,
          reference_id: log.reference_id,
        }));
      } else {
        const movements = JSON.parse(localStorage.getItem(`stock_movements_${ingredientId}`) || '[]');
        let filtered = movements;
        if (startDate) {
          filtered = filtered.filter((m: StockMovement) => m.date >= startDate);
        }
        if (endDate) {
          filtered = filtered.filter((m: StockMovement) => m.date <= endDate);
        }
        return filtered;
      }
    } catch (err) {
      console.error('[useInsumosData] Error fetching stock movements:', err);
      return [];
    }
  }, [mode]);

  const exportStockMovements = useCallback((movements: StockMovement[]) => {
    const csvHeader = 'Data,Tipo,Quantidade,Lote,Observação\n';
    const csvRows = movements.map(m => {
      const date = new Date(m.date).toLocaleDateString('pt-BR');
      const type = m.type === 'entrada' ? 'Entrada' : m.type === 'saida' ? 'Saída' : 'Ajuste';
      const qty = m.quantity.toLocaleString('pt-BR', { minimumFractionDigits: 3 });
      const batch = m.batch || '-';
      const note = (m.note || '-').replace(/"/g, '""');
      return `"${date}","${type}","${qty}","${batch}","${note}"`;
    }).join('\n');

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `movimentacoes_estoque_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    fetchIngredients();
  }, [mode, fetchIngredients]);

  return {
    ingredients,
    suppliers,
    isLoading,
    fetchIngredients,
    saveIngredient,
    deleteIngredient,
    updateStock,
    getIngredientVariants,
    addStockMovement,
    getStockMovements,
    exportStockMovements,
  };
}
