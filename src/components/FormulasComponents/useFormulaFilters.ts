import { useState, useMemo } from 'react';
import { Formula, Group } from './types';
import { calculateTotalCost } from './formulaUtils';

export function useFormulaFilters(formulas: Formula[], groups: Group[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [sortField, setSortField] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredFormulas = useMemo(() => {
    return formulas
      .filter(f => {
        const matchesSearch = 
          f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.lm_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (f.groups?.name && f.groups.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'group':
            aValue = a.groups?.name || '';
            bValue = b.groups?.name || '';
            break;
          case 'volume':
            aValue = a.base_volume;
            bValue = b.base_volume;
            break;
          case 'version':
            aValue = a.version;
            bValue = b.version;
            break;
          case 'cost':
            aValue = calculateTotalCost(a.formula_ingredients || []);
            bValue = calculateTotalCost(b.formula_ingredients || []);
            break;
          case 'costPerLiter':
            aValue = calculateTotalCost(a.formula_ingredients || []) / (a.base_volume || 1);
            bValue = calculateTotalCost(b.formula_ingredients || []) / (b.base_volume || 1);
            break;
          case 'updated_at':
            aValue = new Date(a.updated_at).getTime();
            bValue = new Date(b.updated_at).getTime();
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          default:
            aValue = a.name;
            bValue = b.name;
        }

        if (aValue === bValue) return 0;
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }

        return sortOrder === 'asc' ? (aValue < bValue ? -1 : 1) : (aValue > bValue ? -1 : 1);
      });
  }, [formulas, searchTerm, sortField, sortOrder, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: formulas.length,
      active: formulas.filter(f => f.status === 'active').length,
      draft: formulas.filter(f => f.status === 'draft').length,
      categories: groups.length
    };
  }, [formulas, groups]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    viewMode,
    setViewMode,
    filteredFormulas,
    stats,
    handleSort
  };
}
