import { useState, useMemo, useEffect, useCallback } from 'react';
import { Formula, ColumnConfig, PricingEntry } from './types';
import { 
  calcIngredientCost, 
  compareVersions, 
  getBaseFormulaName, 
  getFormulaCategory 
} from './pricingUtils';

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'name', label: 'Produto', visible: true },
  { id: 'version', label: 'Versão', visible: true },
  { id: 'group', label: 'Categoria', visible: true },
  { id: 'lm_code', label: 'Código', visible: true },
  { id: 'cost', label: 'Custo Mat. Prima', visible: true },
  { id: 'varejo', label: 'Varejo', visible: true },
  { id: 'atacado', label: 'Atacado', visible: true },
  { id: 'fardo', label: 'Fardo/Cx', visible: true },
  { id: 'margem', label: 'Margem Média', visible: true },
  { id: 'status', label: 'Status', visible: true },
];

export function usePricingFilters(
  formulas: Formula[], 
  savedPricing: PricingEntry[], 
  uniqueCapacities: number[]
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'priced'>('all');
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Column configuration
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem('precificacao_columns');
      return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    } catch { return DEFAULT_COLUMNS; }
  });

  useEffect(() => {
    localStorage.setItem('precificacao_columns', JSON.stringify(columns));
  }, [columns]);

  // Handle Sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  // Pricing Helpers (copied from main logic for use in memo)
  const getVolumePricingStatus = useCallback((formulaId: string) => {
    const total = uniqueCapacities.length;
    const priced = uniqueCapacities.filter(cap => {
      const entry = savedPricing.find(e => e.formulaId === formulaId && e.capacityKey === String(cap));
      return entry && (
        entry.varejoPrice > 0 ||
        entry.atacadoPrice > 0 ||
        entry.fardoPrice > 0 ||
        entry.notAvailable ||
        entry.varejoDisabled ||
        entry.atacadoDisabled ||
        entry.fardoDisabled
      );
    }).length;
    return { total, priced };
  }, [savedPricing, uniqueCapacities]);

  const getFormulaPrices = useCallback((formulaId: string) => {
    const entries = savedPricing.filter(e => e.formulaId === formulaId && (e.varejoPrice > 0 || e.atacadoPrice > 0 || e.fardoPrice > 0));
    if (entries.length === 0) return null;
    
    let totalMargem = 0;
    let count = 0;
    
    entries.forEach(e => {
      const f = formulas.find(form => form.id === formulaId);
      if (f) {
        const totalIngCost = calcIngredientCost(f);
        const liquidCost = (totalIngCost / (f.base_volume || 1)) * parseFloat(e.capacityKey);
        if (e.varejoPrice > 0) {
          totalMargem += ((e.varejoPrice - liquidCost) / e.varejoPrice) * 100;
          count++;
        }
      }
    });

    const avgMargem = count > 0 ? totalMargem / count : 0;
    return { ...entries[0], avgMargem };
  }, [savedPricing, formulas]);

  // Consolidated formulas (latest version)
  const consolidatedFormulas = useMemo(() => {
    const latestVersions: Record<string, Formula> = {};
    formulas.forEach(f => {
      if (f.status?.toLowerCase().startsWith('ativ') || f.status?.toLowerCase() === 'active') {
        const baseName = getBaseFormulaName(f.name);
        const existing = latestVersions[baseName];
        if (!existing || compareVersions(f.version, existing.version) > 0) {
          latestVersions[baseName] = f;
        }
      }
    });
    return Object.values(latestVersions);
  }, [formulas]);

  const filteredFormulas = useMemo(() => {
    return consolidatedFormulas
      .filter(f => {
        const matchesSearch = 
          f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.lm_code?.toLowerCase().includes(searchTerm.toLowerCase());

        const volStatus = getVolumePricingStatus(f.id);
        const isComplete = volStatus.priced === volStatus.total && volStatus.total > 0;

        let matchesStatus = true;
        if (statusFilter === 'pending') matchesStatus = !isComplete;
        if (statusFilter === 'priced') matchesStatus = isComplete;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortColumn) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'version':
            aValue = a.version || '';
            bValue = b.version || '';
            break;
          case 'group':
            aValue = getFormulaCategory(a);
            bValue = getFormulaCategory(b);
            break;
          case 'lm_code':
            aValue = a.lm_code || '';
            bValue = b.lm_code || '';
            break;
          case 'cost':
            aValue = calcIngredientCost(a);
            bValue = calcIngredientCost(b);
            break;
          case 'varejo':
            aValue = getFormulaPrices(a.id)?.varejoPrice || 0;
            bValue = getFormulaPrices(b.id)?.varejoPrice || 0;
            break;
          case 'fardo':
            aValue = getFormulaPrices(a.id)?.fardoPrice || 0;
            bValue = getFormulaPrices(b.id)?.fardoPrice || 0;
            break;
          case 'margem':
            aValue = getFormulaPrices(a.id)?.avgMargem || 0;
            bValue = getFormulaPrices(b.id)?.avgMargem || 0;
            break;
          case 'status':
            aValue = getVolumePricingStatus(a.id).priced;
            bValue = getVolumePricingStatus(b.id).priced;
            break;
          default:
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
        }

        if (aValue === bValue) return 0;
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }

        return sortOrder === 'asc' ? (aValue < bValue ? -1 : 1) : (aValue > bValue ? -1 : 1);
      });
  }, [consolidatedFormulas, searchTerm, statusFilter, sortColumn, sortOrder, getVolumePricingStatus, getFormulaPrices]);

  const stats = useMemo(() => {
    const pricedCount = consolidatedFormulas.filter(f => {
      const volStatus = getVolumePricingStatus(f.id);
      return volStatus.priced === volStatus.total && volStatus.total > 0;
    }).length;

    let totalMargem = 0;
    let pricedWithMargem = 0;
    consolidatedFormulas.forEach(f => {
      const p = getFormulaPrices(f.id);
      if (p && p.varejoPrice > 0) {
        const custoBase = calcIngredientCost(f);
        const margem = custoBase > 0 ? ((p.varejoPrice - custoBase) / p.varejoPrice) * 100 : 0;
        totalMargem += Math.max(0, margem);
        pricedWithMargem++;
      }
    });

    return {
      total: consolidatedFormulas.length,
      priced: pricedCount,
      pending: consolidatedFormulas.length - pricedCount,
      avgMargin: pricedWithMargem > 0 ? totalMargem / pricedWithMargem : 0
    };
  }, [consolidatedFormulas, getVolumePricingStatus, getFormulaPrices]);

  return {
    searchTerm, setSearchTerm,
    viewMode, setViewMode,
    statusFilter, setStatusFilter,
    sortColumn, sortOrder, handleSort,
    columns, setColumns,
    filteredFormulas,
    stats,
    getVolumePricingStatus,
    getFormulaPrices
  };
}
