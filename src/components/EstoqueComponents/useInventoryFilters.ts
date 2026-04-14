import { useState, useMemo } from 'react';
import { IngredientStats, FinishedGood, InventoryLog, InventoryTab } from './types';

export function useInventoryFilters(
  stats: IngredientStats[],
  finishedGoods: FinishedGood[],
  logs: InventoryLog[]
) {
  const [activeTab, setActiveTab] = useState<InventoryTab>('finished');
  const [searchTermFG, setSearchTermFG] = useState('');
  const [searchTermRaw, setSearchTermRaw] = useState('');

  const filteredStats = useMemo(() => {
    return stats.filter(s =>
      s.nome.toLowerCase().includes(searchTermRaw.toLowerCase())
    );
  }, [stats, searchTermRaw]);

  const filteredFG = useMemo(() => {
    return finishedGoods.filter(fg =>
      fg.name.toLowerCase().includes(searchTermFG.toLowerCase())
    );
  }, [finishedGoods, searchTermFG]);

  const currentMonthLogs = useMemo(() => {
    return logs.filter(l => {
      try {
        const logDate = new Date(l.created_at);
        const now = new Date();
        return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
      } catch { return false; }
    });
  }, [logs]);

  return {
    activeTab,
    setActiveTab,
    searchTermFG,
    setSearchTermFG,
    searchTermRaw,
    setSearchTermRaw,
    filteredStats,
    filteredFG,
    currentMonthLogs
  };
}
