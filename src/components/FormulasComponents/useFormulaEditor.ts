import { useState, useMemo, useCallback, useRef } from 'react';
import { Formula, FormulaIngredient, Ingredient } from './types';
import { calculateTotalCost, calculateTotalVolume } from './formulaUtils';

export function useFormulaEditor(allIngredients: Ingredient[]) {
  const [currentFormula, setCurrentFormula] = useState<Partial<Formula> | null>(null);
  const [currentIngredients, setCurrentIngredients] = useState<FormulaIngredient[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Ingredient search state
  const [ingSearchTerm, setIngSearchTerm] = useState('');
  const [selectedIngId, setSelectedIngId] = useState('');
  const [ingQuantity, setIngQuantity] = useState('');
  const [isIngDropdownOpen, setIsIngDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const qtyInputRef = useRef<HTMLInputElement>(null);

  const flattenedIngredients = useMemo(() => {
    const list: any[] = [];
    allIngredients.forEach(ing => {
      // Base ingredient
      list.push({
        ...ing,
        isVariant: false,
        displayName: ing.name,
      });

      // Variants
      if (ing.variants) {
        ing.variants.forEach(v => {
          list.push({
            ...ing,
            variant_id: v.id,
            variant_name: v.name,
            variant_codigo: v.codigo,
            cost_per_unit: v.cost_per_unit,
            isVariant: true,
            displayName: `${ing.name} (${v.name})`,
          });
        });
      }
    });
    return list;
  }, [allIngredients]);

  const filteredAndSortedIngredients = useMemo(() => {
    if (ingSearchTerm.length < 2 && !selectedIngId) return [];
    
    return flattenedIngredients
      .filter(ing => 
        ing.displayName.toLowerCase().includes(ingSearchTerm.toLowerCase()) ||
        ing.codigo?.toLowerCase().includes(ingSearchTerm.toLowerCase()) ||
        ing.apelido?.toLowerCase().includes(ingSearchTerm.toLowerCase()) ||
        ing.variant_codigo?.toLowerCase().includes(ingSearchTerm.toLowerCase())
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .slice(0, 15);
  }, [flattenedIngredients, ingSearchTerm, selectedIngId]);

  const selectedIngredient = useMemo(() => {
    if (!selectedIngId) return null;
    const [id, vId] = selectedIngId.split('|');
    return flattenedIngredients.find(ing => ing.id === id && (vId ? ing.variant_id === vId : !ing.variant_id));
  }, [flattenedIngredients, selectedIngId]);

  const handleOpenEditor = useCallback((formula?: Formula) => {
    if (formula) {
      setCurrentFormula({ ...formula });
      setCurrentIngredients(formula.formula_ingredients || []);
    } else {
      setCurrentFormula({
        name: '',
        version: 'v1.0',
        base_volume: 1,
        status: 'draft',
      });
      setCurrentIngredients([]);
    }
    setIngSearchTerm('');
    setSelectedIngId('');
    setIngQuantity('');
  }, []);

  const handleCloseEditor = useCallback(() => {
    setCurrentFormula(null);
    setCurrentIngredients([]);
  }, []);

  const handleAddIngredientToFormula = useCallback(() => {
    if (!selectedIngId || !ingQuantity || !currentFormula) return;

    const [ingId, vId] = selectedIngId.split('|');
    const ingredient = allIngredients.find(i => i.id === ingId);
    if (!ingredient) return;

    const variant = ingredient.variants?.find(v => v.id === vId);
    
    const qty = parseFloat(ingQuantity.replace(/\./g, '').replace(',', '.'));
    if (isNaN(qty)) return;

    const newIngredient: FormulaIngredient = {
      ingredient_id: ingId,
      variant_id: vId || null,
      quantity: qty,
      ingredients: {
        name: ingredient.name,
        unit: ingredient.unit,
        cost_per_unit: ingredient.cost_per_unit,
        produto_quimico: ingredient.produto_quimico
      },
      variants: variant ? {
        name: variant.name,
        cost_per_unit: variant.cost_per_unit
      } : null
    };

    setCurrentIngredients(prev => {
      const existingIndex = prev.findIndex(i => i.ingredient_id === ingId && (vId ? i.variant_id === vId : !i.variant_id));
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newIngredient;
        return updated;
      }
      return [...prev, newIngredient];
    });

    setIngSearchTerm('');
    setSelectedIngId('');
    setIngQuantity('');
    setIsIngDropdownOpen(false);
  }, [selectedIngId, ingQuantity, currentFormula, allIngredients]);

  const handleRemoveIngredientFromFormula = useCallback((index: number) => {
    setCurrentIngredients(prev => prev.filter((_, i) => i !== index));
  }, []);

  const totals = useMemo(() => {
    return {
      cost: calculateTotalCost(currentIngredients),
      volume: calculateTotalVolume(currentIngredients),
    };
  }, [currentIngredients]);

  return {
    currentFormula,
    setCurrentFormula,
    currentIngredients,
    setCurrentIngredients,
    isSaving,
    setIsSaving,
    ingSearchTerm,
    setIngSearchTerm,
    selectedIngId,
    setSelectedIngId,
    ingQuantity,
    setIngQuantity,
    isIngDropdownOpen,
    setIsIngDropdownOpen,
    highlightedIndex,
    setHighlightedIndex,
    filteredAndSortedIngredients,
    selectedIngredient,
    qtyInputRef,
    handleOpenEditor,
    handleCloseEditor,
    handleAddIngredientToFormula,
    handleRemoveIngredientFromFormula,
    totals,
  };
}
