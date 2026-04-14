import { useState, useMemo } from 'react';
import { Formula } from './types';

export type ProportionSortField = 'name' | 'lm_code' | 'base_volume' | 'version';
export type ProportionStatusFilter = 'all' | 'active' | 'recent';

export function useProporcaoFilters(formulas: Formula[], hiddenFormulas: any[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProportionStatusFilter>('all');
  const [sortField, setSortField] = useState<ProportionSortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredFormulas = useMemo(() => {
    return formulas
      .filter(f => {
        // Search filter
        const matchesSearch = 
          f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (f.lm_code || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        // Status/Hidden filter
        const isHidden = hiddenFormulas.some(h => h.name === f.name);
        if (isHidden) return false;

        // Custom status filter for Proportion cards
        if (statusFilter === 'active' && f.status !== 'active') return false;
        
        return matchesSearch;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'lm_code':
            comparison = (a.lm_code || '').localeCompare(b.lm_code || '');
            break;
          case 'base_volume':
            comparison = (a.base_volume || 0) - (b.base_volume || 0);
            break;
          case 'version':
            comparison = (a.version || '').localeCompare(b.version || '');
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [formulas, searchTerm, sortOrder, sortField, hiddenFormulas, statusFilter]);

  const handleSort = (field: ProportionSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    sortField, setSortField,
    sortOrder, setSortOrder,
    filteredFormulas,
    handleSort
  };
}
