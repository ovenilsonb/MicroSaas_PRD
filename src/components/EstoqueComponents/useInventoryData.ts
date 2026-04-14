import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { InventoryLog, FinishedGood, FinishedGoodLog, IngredientStats } from './types';

export function useInventoryData(mode: 'supabase' | 'local') {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [stats, setStats] = useState<IngredientStats[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [fgLogs, setFgLogs] = useState<FinishedGoodLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFinishedGoods = useCallback(async () => {
    try {
      if (mode === 'supabase') {
        const { data: logsData, error } = await supabase
          .from('inventory_logs')
          .select('*')
          .or('type.eq.finished_good_in,type.eq.finished_good_out')
          .order('created_at', { ascending: false });

        if (error && error.code !== '42P01') {
          console.error('Erro ao buscar finished goods:', error);
        }

        const fgMap = new Map<string, any>();
        const fgLogsData: any[] = [];

        if (logsData) {
          logsData.forEach((log: any) => {
            const fgId = log.reference_id;
            if (!fgId) return;

            fgLogsData.push({ ...log, finished_good_id: fgId });

            const current = fgMap.get(fgId) || { 
              id: fgId, 
              stock_quantity: 0, 
              name: log.notes?.replace('Entrada PA: ', '').replace('Saída PA: ', '') || 'Produto Acabado' 
            };
            
            if (log.type === 'finished_good_in') {
              current.stock_quantity += log.quantity;
            } else if (log.type === 'finished_good_out') {
              current.stock_quantity -= log.quantity;
            }
            fgMap.set(fgId, current);
          });
        }

        setFinishedGoods(Array.from(fgMap.values()));
        setFgLogs(fgLogsData);
      } else {
        const localFG = JSON.parse(localStorage.getItem('local_finished_goods') || '[]');
        const localFGLogs = JSON.parse(localStorage.getItem('local_finished_goods_logs') || '[]');
        setFinishedGoods(localFG);
        
        const enrichedLogs = localFGLogs.map((log: any) => ({
          ...log,
          finished_good: localFG.find((fg: any) => fg.id === log.finished_good_id)
        }));
        setFgLogs(enrichedLogs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
    } catch (err) {
      console.error('Erro ao buscar produtos acabados:', err);
    }
  }, [mode]);

  const fetchLogsAndStats = useCallback(async () => {
    try {
      if (mode === 'supabase') {
        const [logsRes, statsRes] = await Promise.all([
          supabase.from('inventory_logs')
            .select('*, ingredients (nome, unidade_medida, estoque_atual, estoque_minimo)')
            .order('created_at', { ascending: false })
            .limit(50),
          supabase.from('ingredients')
            .select('id, nome, estoque_atual, estoque_minimo, unidade_medida')
            .order('nome')
        ]);

        if (logsRes.error) throw logsRes.error;
        if (statsRes.error) throw statsRes.error;

        setLogs(logsRes.data || []);
        setStats(statsRes.data || []);
      } else {
        const localLogs = JSON.parse(localStorage.getItem('local_inventory_logs') || '[]');
        const localIngs = JSON.parse(localStorage.getItem('local_ingredients') || '[]');

        const enriched = localLogs.map((log: any) => {
          const ing = localIngs.find((i: any) => i.id === log.ingredient_id);
          return {
            ...log,
            ingredients: ing ? {
              nome: ing.name,
              unidade_medida: ing.unit,
              estoque_atual: ing.estoque_atual,
              estoque_minimo: ing.estoque_minimo
            } : undefined
          };
        });
        setLogs(enriched.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setStats(localIngs.map((i: any) => ({
          id: i.id,
          nome: i.name,
          estoque_atual: i.estoque_atual,
          estoque_minimo: i.estoque_minimo,
          unidade_medida: i.unit
        })));
      }
    } catch (err) {
      console.error('Erro ao buscar logs/estatísticas:', err);
    }
  }, [mode]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchFinishedGoods(), fetchLogsAndStats()]);
    setIsLoading(false);
  }, [fetchFinishedGoods, fetchLogsAndStats]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    logs,
    stats,
    finishedGoods,
    setFinishedGoods,
    fgLogs,
    setFgLogs,
    isLoading,
    refresh
  };
}
