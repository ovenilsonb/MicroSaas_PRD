import { generateId } from '../../lib/id';
import { FinishedGood, FinishedGoodLog } from './types';

export function useInventoryActions(
  mode: 'supabase' | 'local',
  finishedGoods: FinishedGood[],
  setFinishedGoods: (f: FinishedGood[]) => void,
  fgLogs: FinishedGoodLog[],
  setFgLogs: (l: FinishedGoodLog[]) => void,
  refresh: () => Promise<void>,
  showToast: (type: 'success' | 'error', title: string, message: string) => void
) {
  
  const handleDeleteFgStock = (fgId: string) => {
    const fg = finishedGoods.find(f => f.id === fgId);
    if (!fg) return;

    if (!confirm(`Deseja realmente excluir o estoque de "${fg.name}"? Esta ação removerá o produto e seu histórico do inventário.`)) return;

    if (mode === 'local') {
      const localFG = JSON.parse(localStorage.getItem('local_finished_goods') || '[]');
      const localFGLogs = JSON.parse(localStorage.getItem('local_finished_goods_logs') || '[]');
      
      const updatedFG = localFG.filter((f: any) => f.id !== fgId);
      const updatedLogs = localFGLogs.filter((l: any) => l.finished_good_id !== fgId);

      localStorage.setItem('local_finished_goods', JSON.stringify(updatedFG));
      localStorage.setItem('local_finished_goods_logs', JSON.stringify(updatedLogs));
      
      setFinishedGoods(updatedFG);
      setFgLogs(updatedLogs);
      showToast('success', 'Excluído', 'Produto e histórico removidos com sucesso.');
    } else {
      showToast('error', 'Não Suportado', 'Exclusão de estoque PA em modo Cloud não implementada via UI por segurança.');
    }
  };

  const handleAdjustFgStock = async (fgId: string) => {
    const qtyStr = prompt('Informe a nova quantidade física em estoque (ajuste rápido):');
    if (qtyStr === null || qtyStr.trim() === '') return;
    const newQty = parseInt(qtyStr, 10);
    if (isNaN(newQty) || newQty < 0) return showToast('error', 'Quantidade Inválida', 'Por favor, insira uma quantidade válida.');

    if (mode === 'local') {
      const localFG = JSON.parse(localStorage.getItem('local_finished_goods') || '[]');
      const localFGLogs = JSON.parse(localStorage.getItem('local_finished_goods_logs') || '[]');
      
      const fgIndex = localFG.findIndex((f: any) => f.id === fgId);
      if (fgIndex >= 0) {
        const oldQty = localFG[fgIndex].stock_quantity || 0;
        const diff = newQty - oldQty;
        
        if (diff !== 0) {
          localFG[fgIndex].stock_quantity = newQty;
          localFGLogs.push({
            id: generateId(),
            finished_good_id: fgId,
            quantity: Math.abs(diff),
            type: diff > 0 ? 'in' : 'out',
            notes: 'Ajuste manual de inventário (UI)',
            created_at: new Date().toISOString()
          });
          
          localStorage.setItem('local_finished_goods', JSON.stringify(localFG));
          localStorage.setItem('local_finished_goods_logs', JSON.stringify(localFGLogs));
          await refresh();
          showToast('success', 'Ajustado', 'Estoque atualizado com sucesso.');
        }
      }
    } else {
      // In Supabase mode, we would need to insert a log entry of type 'finished_good_in' or 'out'
      // but the original code didn't implement this for Supabase. I'll maintain that for now.
      showToast('error', 'Não Suportado', 'Ajuste manual em modo Cloud deve ser feito via Ordens de Fabricação.');
    }
  };

  return {
    handleDeleteFgStock,
    handleAdjustFgStock
  };
}
