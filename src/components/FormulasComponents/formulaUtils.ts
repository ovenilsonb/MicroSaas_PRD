import { FormulaIngredient } from './types';

export const calculateTotalCost = (ingredients: FormulaIngredient[]) => {
  return ingredients.reduce((total, item) => {
    let cost = 0;

    // Prioritize variant cost over base ingredient cost
    const variantCost = item.variants?.cost_per_unit;
    const ingredientCost = item.ingredients?.cost_per_unit;

    if (variantCost !== undefined && variantCost !== null) {
      cost = typeof variantCost === 'string'
        ? parseFloat(variantCost.replace(/\./g, '').replace(',', '.')) || 0
        : variantCost;
    } else if (ingredientCost !== undefined && ingredientCost !== null) {
      cost = typeof ingredientCost === 'string'
        ? parseFloat(ingredientCost.replace(/\./g, '').replace(',', '.')) || 0
        : ingredientCost;
    }

    return total + (item.quantity * cost);
  }, 0);
};

export const calculateTotalVolume = (ingredients: FormulaIngredient[]) => {
  return ingredients.reduce((total, item) => {
    // Somente contabiliza produtos químicos no volume total para cálculo de porcentagem
    if (item.ingredients?.produto_quimico) {
      return total + item.quantity;
    }
    return total;
  }, 0);
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatQuantity = (value: number) => {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
};
