import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useStorageMode } from '../../../contexts/StorageModeContext';
import { useToast } from '../../dashboard/Toast';
import { Client } from '../types';

export function useClientData() {
  const { mode } = useStorageMode();
  const { showToast } = useToast();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('name');

        if (error) {
          if (error.code === '42P01') {
            setClients([]);
            return;
          }
          throw error;
        }
        setClients(data || []);
      } else {
        const local = localStorage.getItem('local_clients');
        setClients(local ? JSON.parse(local) : []);
      }
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      showToast('error', 'Erro', 'Falha ao carregar clientes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [mode]);

  const stats = useMemo(() => {
    const totalClients = clients.length;
    const priceTiers: Record<string, number> = {};
    const neighborhoods: Record<string, number> = {};

    clients.forEach(c => {
      const tier = c.tabela_preco || 'Varejo';
      priceTiers[tier] = (priceTiers[tier] || 0) + 1;

      if (c.neighborhood) {
        const bairroRaw = c.neighborhood.trim().toLowerCase();
        const bairroDisplay = bairroRaw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        neighborhoods[bairroDisplay] = (neighborhoods[bairroDisplay] || 0) + 1;
      }
    });

    const topPricing = Object.entries(priceTiers).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Varejo';
    const topNeighborhood = Object.entries(neighborhoods).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalClients,
      topPricing,
      topNeighborhood,
      totalInvestedPlaceholder: 0 // Futuro: link com Vendas.tsx
    };
  }, [clients]);

  return {
    clients,
    setClients,
    isLoading,
    stats,
    fetchClients
  };
}
