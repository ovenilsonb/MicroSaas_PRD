import { useState, useMemo, useCallback } from 'react';
import { Ingredient } from './types';

export function useInsumoFilters(ingredients: Ingredient[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [sortField, setSortField] = useState<keyof Ingredient>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    try {
      const saved = localStorage.getItem('insumosItemsPerPage');
      return saved ? Number(saved) : 10;
    } catch { return 10; }
  });

  const handleSetItemsPerPage = useCallback((count: number) => {
    setItemsPerPage(count);
    setCurrentPage(1);
    localStorage.setItem('insumosItemsPerPage', String(count));
  }, []);

  const handleFilterTypeChange = useCallback((value: string) => {
    setFilterType(value);
    setFilterSupplier('');
    setFilterStock('');
    setCurrentPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterType('');
    setFilterSupplier('');
    setFilterStock('');
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((field: keyof Ingredient) => {
    setSortField(prevField => {
      if (prevField === field) {
        setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
        return prevField;
      }
      setSortOrder('asc');
      return field;
    });
  }, []);

  const filteredIngredients = useMemo(() => {
    const result = ingredients.filter(ing => {
      const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ing.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ing.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = !filterType ||
        (filterType === 'quimico' && ing.produto_quimico) ||
        (filterType === 'embalagem' && !ing.produto_quimico);
      
      const matchesSupplier = !filterSupplier || ing.fornecedor === filterSupplier;
      
      let matchesStock = true;
      if (filterStock) {
        const atual = ing.estoque_atual || 0;
        const minimo = ing.estoque_minimo || 0;
        if (filterStock === 'baixo') matchesStock = atual <= minimo;
        else if (filterStock === 'medio') matchesStock = atual > minimo && atual <= minimo * 2;
        else if (filterStock === 'alto') matchesStock = atual > minimo * 2;
      }
      
      return matchesSearch && matchesType && matchesSupplier && matchesStock;
    });

    result.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (aValue === bValue) return 0;
      if (aValue === undefined || aValue === null) return sortOrder === 'asc' ? 1 : -1;
      if (bValue === undefined || bValue === null) return sortOrder === 'asc' ? -1 : 1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [ingredients, searchTerm, sortField, sortOrder, filterType, filterSupplier, filterStock]);

  const totalPages = Math.ceil(filteredIngredients.length / itemsPerPage);
  const paginatedIngredients = filteredIngredients.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  const stats = useMemo(() => {
    const total = ingredients.length;
    const lowStock = ingredients.filter(ing => (ing.estoque_atual || 0) <= (ing.estoque_minimo || 0) && total > 0).length;
    const chemical = ingredients.filter(ing => ing.produto_quimico).length;
    const investment = ingredients.reduce((acc, ing) => {
      const cost = typeof ing.cost_per_unit === 'number' ? ing.cost_per_unit : 0;
      return acc + ((ing.estoque_atual || 0) * cost);
    }, 0);
    return { total, lowStock, chemical, investment };
  }, [ingredients]);

  const activeFiltersCount = [filterType, filterSupplier, filterStock].filter(Boolean).length;

  return {
    searchTerm, setSearchTerm,
    filterType, setFilterType: handleFilterTypeChange,
    filterSupplier, setFilterSupplier,
    filterStock, setFilterStock,
    sortField, setSortField: handleSort,
    sortOrder, setSortOrder,
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage: handleSetItemsPerPage,
    filteredIngredients,
    paginatedIngredients,
    totalPages,
    stats,
    activeFiltersCount,
    clearAllFilters
  };
}
