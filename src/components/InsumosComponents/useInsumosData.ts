import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { generateId } from '../../lib/id';
import { useStorageMode } from '../../contexts/StorageModeContext';
import { Ingredient, Variant } from './types';

interface UseInsumosDataReturn {
  ingredients: Ingredient[];
  suppliers: { id: string; name: string }[];
  isLoading: boolean;
  fetchIngredients: () => Promise<void>;
  saveIngredient: (ingredient: Partial<Ingredient>) => Promise<boolean>;
  deleteIngredient: (id: string) => Promise<boolean>;
  updateStock: (id: string, quantity: number) => Promise<boolean>;
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
        const { data, error } = await supabase
          .from('ingredients')
          .select('*, variants:ingredient_variants(*)')
          .order('name');
        if (error) throw error;
        setIngredients(data || []);

        const { data: supplierData } = await supabase.from('suppliers').select('id, name').order('name');
        setSuppliers(supplierData || []);
      } else {
        const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
        setIngredients(localIngredients);

        const localSuppliers = JSON.parse(localStorage.getItem('local_suppliers') || '[]');
        setSuppliers(localSuppliers);
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    } finally {
      setIsLoading(false);
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

        if (ingredient.variants && ingredient.variants.length > 0) {
          await supabase.from('ingredient_variants').delete().eq('ingredient_id', ingredientId);

          for (const variant of ingredient.variants) {
            await supabase.from('ingredient_variants').insert({
              id: variant.id || generateId(),
              ingredient_id: ingredientId,
              name: variant.name,
              codigo: variant.codigo,
              cost_per_unit: variant.cost_per_unit,
            });
          }
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
    } catch (error) {
      console.error('Error saving ingredient:', error);
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
    } catch (error) {
      console.error('Error deleting ingredient:', error);
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
    } catch (error) {
      console.error('Error updating stock:', error);
      return false;
    }
  }, [mode, fetchIngredients]);

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
  };
}
