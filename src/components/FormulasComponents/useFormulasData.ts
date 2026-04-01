import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { generateId } from '../../lib/id';
import { useStorageMode } from '../../contexts/StorageModeContext';
import { Formula, Group, Ingredient, FormulaIngredient } from './types';

interface UseFormulasDataReturn {
  formulas: Formula[];
  groups: Group[];
  allIngredients: Ingredient[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
  saveFormula: (formula: Partial<Formula>, ingredients: FormulaIngredient[]) => Promise<boolean>;
  deleteFormula: (id: string) => Promise<boolean>;
  duplicateFormula: (formula: Formula) => Promise<boolean>;
  saveGroup: (name: string, existingId?: string) => Promise<boolean>;
  deleteGroup: (id: string) => Promise<boolean>;
}

export function useFormulasData(): UseFormulasDataReturn {
  const { mode } = useStorageMode();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase.from('groups').select('*').order('name');
        if (error) throw error;
        setGroups(data || []);
      } else {
        const data = JSON.parse(localStorage.getItem('local_groups') || '[]');
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  }, [mode]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (mode === 'supabase') {
        const { data: formulasData, error: formulasError } = await supabase
          .from('formulas')
          .select(`
            *,
            groups (name),
            formula_ingredients (
              id, quantity, ingredient_id, variant_id,
              ingredients (name, unit, cost_per_unit, produto_quimico),
              variants:ingredient_variants (name, cost_per_unit)
            )
          `)
          .order('name');

        if (formulasError) throw formulasError;
        setFormulas(formulasData || []);

        await fetchGroups();

        const { data: ingData } = await supabase.from('ingredients').select('*, variants:ingredient_variants(*)').order('name');
        if (ingData) setAllIngredients(ingData);
      } else {
        const localFormulas = JSON.parse(localStorage.getItem('local_formulas') || '[]');
        setFormulas(localFormulas);

        const localGroups = JSON.parse(localStorage.getItem('local_groups') || '[]');
        setGroups(localGroups);

        const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
        setAllIngredients(localIngredients);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [mode, fetchGroups]);

  const saveFormula = useCallback(async (formula: Partial<Formula>, ingredients: FormulaIngredient[]): Promise<boolean> => {
    try {
      const formulaId = formula.id || generateId();
      const now = new Date().toISOString();

      const formulaData = {
        ...formula,
        id: formulaId,
        updated_at: now,
        created_at: formula.created_at || now,
      };

      if (mode === 'supabase') {
        const { error: formulaError } = await supabase
          .from('formulas')
          .upsert(formulaData);

        if (formulaError) throw formulaError;

        await supabase.from('formula_ingredients').delete().eq('formula_id', formulaId);

        for (const ing of ingredients) {
          if (!ing.ingredient_id) continue;
          await supabase.from('formula_ingredients').insert({
            id: ing.id || generateId(),
            formula_id: formulaId,
            ingredient_id: ing.ingredient_id,
            variant_id: ing.variant_id,
            quantity: ing.quantity,
          });
        }
      } else {
        const localFormulas = JSON.parse(localStorage.getItem('local_formulas') || '[]');
        const existingIndex = localFormulas.findIndex((f: Formula) => f.id === formulaId);

        const formulaWithIngredients = {
          ...formulaData,
          formula_ingredients: ingredients,
        };

        if (existingIndex >= 0) {
          localFormulas[existingIndex] = formulaWithIngredients;
        } else {
          localFormulas.push(formulaWithIngredients);
        }

        localStorage.setItem('local_formulas', JSON.stringify(localFormulas));
      }

      await fetchData();
      return true;
    } catch (error) {
      console.error('Error saving formula:', error);
      return false;
    }
  }, [mode, fetchData]);

  const deleteFormula = useCallback(async (id: string): Promise<boolean> => {
    try {
      if (mode === 'supabase') {
        const { error } = await supabase.from('formulas').delete().eq('id', id);
        if (error) throw error;
      } else {
        const localFormulas = JSON.parse(localStorage.getItem('local_formulas') || '[]');
        const filtered = localFormulas.filter((f: Formula) => f.id !== id);
        localStorage.setItem('local_formulas', JSON.stringify(filtered));
      }
      await fetchData();
      return true;
    } catch (error) {
      console.error('Error deleting formula:', error);
      return false;
    }
  }, [mode, fetchData]);

  const duplicateFormula = useCallback(async (formula: Formula): Promise<boolean> => {
    try {
      const newId = generateId();
      const now = new Date().toISOString();

      const duplicatedFormula = {
        ...formula,
        id: newId,
        name: `${formula.name} (Cópia)`,
        version: 'v1.0',
        status: 'draft' as const,
        created_at: now,
        updated_at: now,
        formula_ingredients: formula.formula_ingredients?.map(fi => ({
          ...fi,
          id: generateId(),
          formula_id: newId,
        })),
      };

      if (mode === 'supabase') {
        const { formula_ingredients, groups, ...cleanFormula } = duplicatedFormula;
        const { error } = await supabase.from('formulas').insert(cleanFormula);
        if (error) throw error;

        if (formula_ingredients) {
          for (const fi of formula_ingredients) {
            await supabase.from('formula_ingredients').insert({
              id: fi.id,
              formula_id: newId,
              ingredient_id: fi.ingredient_id,
              variant_id: fi.variant_id,
              quantity: fi.quantity,
            });
          }
        }
      } else {
        const localFormulas = JSON.parse(localStorage.getItem('local_formulas') || '[]');
        localFormulas.push(duplicatedFormula);
        localStorage.setItem('local_formulas', JSON.stringify(localFormulas));
      }

      await fetchData();
      return true;
    } catch (error) {
      console.error('Error duplicating formula:', error);
      return false;
    }
  }, [mode, fetchData]);

  const saveGroup = useCallback(async (name: string, existingId?: string): Promise<boolean> => {
    try {
      if (mode === 'supabase') {
        const { error } = await supabase.from('groups').upsert({
          id: existingId || generateId(),
          name,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
      } else {
        const localGroups = JSON.parse(localStorage.getItem('local_groups') || '[]');
        if (existingId) {
          const index = localGroups.findIndex((g: Group) => g.id === existingId);
          if (index >= 0) localGroups[index].name = name;
        } else {
          localGroups.push({ id: generateId(), name });
        }
        localStorage.setItem('local_groups', JSON.stringify(localGroups));
      }
      await fetchGroups();
      return true;
    } catch (error) {
      console.error('Error saving group:', error);
      return false;
    }
  }, [mode, fetchGroups]);

  const deleteGroup = useCallback(async (id: string): Promise<boolean> => {
    try {
      if (mode === 'supabase') {
        const { error } = await supabase.from('groups').delete().eq('id', id);
        if (error) throw error;
      } else {
        const localGroups = JSON.parse(localStorage.getItem('local_groups') || '[]');
        const filtered = localGroups.filter((g: Group) => g.id !== id);
        localStorage.setItem('local_groups', JSON.stringify(filtered));
      }
      await fetchGroups();
      return true;
    } catch (error) {
      console.error('Error deleting group:', error);
      return false;
    }
  }, [mode, fetchGroups]);

  useEffect(() => {
    fetchData();
  }, [mode, fetchData]);

  return {
    formulas,
    groups,
    allIngredients,
    isLoading,
    fetchData,
    saveFormula,
    deleteFormula,
    duplicateFormula,
    saveGroup,
    deleteGroup,
  };
}
