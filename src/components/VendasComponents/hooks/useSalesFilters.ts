import { useState, useMemo } from 'react';
import { SaleOrder, SaleStatus } from '../types';

export function useSalesFilters(orders: SaleOrder[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'todos' | SaleStatus | 'pendente_recebimento'>('todos');

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        o.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.client_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      if (statusFilter === 'todos') return true;
      if (statusFilter === 'pendente_recebimento') {
        return o.status === 'retirada' || o.status === 'transito';
      }
      return o.status === statusFilter;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, searchTerm, statusFilter]);

  return {
    searchTerm,
    setSearchTerm,
    viewMode,
    setViewMode,
    statusFilter,
    setStatusFilter,
    filteredOrders
  };
}
