import { useState, useMemo } from 'react';
import { Client } from '../types';

export function useClientFilters(clients: Client[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.cnpj_cpf && c.cnpj_cpf.includes(searchTerm)) ||
      (c.neighborhood && c.neighborhood.toLowerCase().includes(term))
    );
  }, [clients, searchTerm]);

  return {
    searchTerm,
    setSearchTerm,
    viewMode,
    setViewMode,
    filteredClients
  };
}
