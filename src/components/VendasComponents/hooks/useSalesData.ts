import { useState, useEffect, useMemo } from 'react';
import { useStorageMode } from '../../../contexts/StorageModeContext';
import { useToast } from '../../../components/dashboard/Toast';
import { SaleOrder, PricingEntry, CatalogItem } from './types';

export function useSalesData() {
  const { mode } = useStorageMode();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [productionOrders, setProductionOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<any[]>([]);
  const [formulas, setFormulas] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [pricingEntries, setPricingEntries] = useState<PricingEntry[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastPurchaseMap, setLastPurchaseMap] = useState<Record<string, string>>({});

  const fetchData = () => {
    setIsLoading(true);
    try {
      if (mode === 'supabase') {
        setOrders([]);
        setClients([]);
        setFinishedGoods([]);
        setFormulas([]);
        setIngredients([]);
        setPricingEntries([]);
        setCategories([]);
      } else {
        const localOrders = localStorage.getItem('local_sale_orders');
        const localPO = localStorage.getItem('local_production_orders');
        const localClients = localStorage.getItem('local_clients');
        const localFG = localStorage.getItem('local_finished_goods');
        const localFormulas = localStorage.getItem('local_formulas');
        const localIngredients = localStorage.getItem('local_ingredients');
        const localPricing = localStorage.getItem('precificacao_entries');
        const localGroups = localStorage.getItem('local_groups');
        
        setOrders(localOrders ? JSON.parse(localOrders) : []);
        setProductionOrders(localPO ? JSON.parse(localPO) : []);
        setClients(localClients ? JSON.parse(localClients) : []);
        setFinishedGoods(localFG ? JSON.parse(localFG) : []);
        setFormulas(localFormulas ? JSON.parse(localFormulas) : []);
        setIngredients(localIngredients ? JSON.parse(localIngredients) : []);
        setPricingEntries(localPricing ? JSON.parse(localPricing) : []);
        setCategories(localGroups ? JSON.parse(localGroups) : []);
      }
    } catch (err) {
      console.error('Erro ao buscar dados de vendas:', err);
      showToast('error', 'Erro', 'Falha ao carregar dados do módulo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mode]);

  useEffect(() => {
    const purchaseMap: Record<string, string> = {};
    orders.forEach(order => {
      if (order.client_id && order.created_at) {
        if (!purchaseMap[order.client_id] || new Date(order.created_at) > new Date(purchaseMap[order.client_id])) {
          purchaseMap[order.client_id] = order.created_at;
        }
      }
    });
    setLastPurchaseMap(purchaseMap);
  }, [orders]);

  const sellableCatalog = useMemo<CatalogItem[]>(() => {
    const extractCapacity = (name: string): number => {
      const match = name.match(/(\d+[.,]?\d*)\s*(L|ml|LT|litro|litros)/i);
      if (!match) return 0;
      let cap = parseFloat(match[1].replace(',', '.'));
      if (match[2].toLowerCase().includes('ml')) cap /= 1000;
      return cap;
    };

    return pricingEntries.filter(p => !p.notAvailable).map(pricing => {
      const formula = formulas.find(f => f.id === pricing.formulaId);
      
      const fg = finishedGoods.find(item => {
        const itemCap = Number(item.capacity || extractCapacity(item.name));
        const pricingCap = Number(pricing.capacityKey);
        return item.formula_id === pricing.formulaId && Math.abs(itemCap - pricingCap) < 0.01;
      });

      return {
        id: fg?.id || `new-${pricing.formulaId}-${pricing.capacityKey}`,
        formula_id: pricing.formulaId,
        name: formula?.name || 'Produto s/ Nome',
        capacity: pricing.capacityKey,
        stock_quantity: fg?.stock_quantity || 0,
        group_id: formula?.group_id || formula?.category_id,
        pricing: pricing,
        existsInInventory: !!fg
      };
    });
  }, [pricingEntries, formulas, finishedGoods]);

  return {
    orders,
    setOrders,
    productionOrders,
    setProductionOrders,
    clients,
    finishedGoods,
    setFinishedGoods,
    formulas,
    ingredients,
    pricingEntries,
    categories,
    isLoading,
    lastPurchaseMap,
    sellableCatalog,
    fetchData
  };
}
