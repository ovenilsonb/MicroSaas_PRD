import { useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useStorageMode } from '../../../contexts/StorageModeContext';
import { useToast } from '../../dashboard/Toast';
import { generateId } from '../../../lib/id';
import { ProductionOrder, OrderStatus, Formula } from '../types/production';
import { parseCost } from '../utils/productionUtils';

export function useProductionActions(
  orders: ProductionOrder[], 
  setOrders: React.Dispatch<React.SetStateAction<ProductionOrder[]>>,
  formulas: Formula[]
) {
  const { mode } = useStorageMode();
  const { showToast } = useToast();

  const saveOrdersLocal = useCallback((updated: ProductionOrder[]) => {
    localStorage.setItem('local_production_orders', JSON.stringify(updated));
    const ext: Record<string, any> = {};
    updated.forEach(o => {
      ext[o.id] = { 
        steps: o.steps, 
        ingredientBatches: o.ingredientBatches, 
        operatorName: o.operatorName, 
        equipmentId: o.equipmentId, 
        formulaSnapshot: o.formulaSnapshot, 
        packagingPlan: o.packagingPlan 
      };
    });
    localStorage.setItem('production_orders_ext', JSON.stringify(ext));
  }, []);

  const getScaledIngredients = useCallback((order: ProductionOrder) => {
    const formula = order.formulaSnapshot || formulas.find(f => f.id === order.formula_id);
    if (!formula?.formula_ingredients) return [];
    const scale = order.planned_volume / (formula.base_volume || 1);
    return formula.formula_ingredients.map(fi => ({
      ...fi,
      scaledQty: fi.quantity * scale,
      unitCost: parseCost(fi.variants?.cost_per_unit ?? fi.ingredients?.cost_per_unit ?? 0),
    }));
  }, [formulas]);

  const executeAdvance = useCallback(async (order: ProductionOrder, newStatus: OrderStatus) => {
    const updateData: Partial<ProductionOrder> = { status: newStatus };
    if (newStatus === 'weighing') updateData.start_date = new Date().toISOString();
    if (newStatus === 'completed') updateData.end_date = new Date().toISOString();

    try {
      if (mode === 'supabase') {
        const dbStatus = ['weighing', 'mixing', 'homogenizing'].includes(newStatus) ? 'in_progress' : newStatus;
        const { error } = await supabase.from('production_orders').update({
          status: dbStatus,
          ...updateData.start_date ? { start_date: updateData.start_date } : {},
          ...updateData.end_date ? { end_date: updateData.end_date } : {}
        }).eq('id', order.id);
        if (error) throw error;

        if (newStatus === 'weighing') {
          const scaled = getScaledIngredients(order);
          for (const item of scaled) {
            await supabase.from('inventory_logs').insert([{
              ingredient_id: item.ingredient_id,
              variant_id: item.variant_id,
              quantity: item.scaledQty,
              type: 'out',
              reference_id: order.id,
              notes: `Consumo automático (OF: ${order.batch_number})`
            }]);
          }
        }

        if (newStatus === 'quality_check') {
          await supabase.from('quality_controls').insert([{
            production_order_id: order.id,
            status: 'pending'
          }]);
        }
      } else {
        if (newStatus === 'weighing') {
          const scaled = getScaledIngredients(order);
          const localIngs = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
          const localLogs = JSON.parse(localStorage.getItem('local_inventory_logs') || '[]');

          scaled.forEach(item => {
            localLogs.push({
              id: generateId(),
              ingredient_id: item.ingredient_id,
              variant_id: item.variant_id,
              quantity: item.scaledQty,
              type: 'out',
              reference_id: order.id,
              notes: `Consumo automático (OF: ${order.batch_number})`,
              created_at: new Date().toISOString()
            });

            const ingIdx = localIngs.findIndex((i: any) => i.id === item.ingredient_id);
            if (ingIdx >= 0) {
              localIngs[ingIdx].estoque_atual = (localIngs[ingIdx].estoque_atual || 0) - item.scaledQty;
            }
          });

          localStorage.setItem('local_ingredients', JSON.stringify(localIngs));
          localStorage.setItem('local_inventory_logs', JSON.stringify(localLogs));
        }

        if (newStatus === 'quality_check') {
          const localQC = JSON.parse(localStorage.getItem('local_quality_controls') || '[]');
          localQC.push({
            id: generateId(),
            production_order_id: order.id,
            status: 'pending',
            created_at: new Date().toISOString()
          });
          localStorage.setItem('local_quality_controls', JSON.stringify(localQC));
        }
      }

      const updated = orders.map(o => o.id === order.id ? { ...o, ...updateData } : o);
      setOrders(updated);
      saveOrdersLocal(updated);
      showToast('success', 'Status Atualizado', `OF ${order.batch_number} avançada.`);
      return true;
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      showToast('error', 'Erro', 'Não foi possível atualizar o status.');
      return false;
    }
  }, [mode, orders, setOrders, saveOrdersLocal, getScaledIngredients, showToast]);

  const toggleStep = useCallback((orderId: string, stepKey: string) => {
    setOrders(prev => {
      const updated = prev.map(o => {
        if (o.id !== orderId) return o;
        const newSteps = (o.steps || []).map(s =>
          s.key === stepKey ? { ...s, completed: !s.completed, completedAt: !s.completed ? new Date().toISOString() : undefined } : s
        );
        return { ...o, steps: newSteps };
      });
      saveOrdersLocal(updated);
      return updated;
    });
  }, [setOrders, saveOrdersLocal]);

  const updateBatch = useCallback((orderId: string, ingredientId: string, supplierBatch: string) => {
    setOrders(prev => {
      const updated = prev.map(o => {
        if (o.id !== orderId) return o;
        const newBatches = (o.ingredientBatches || []).map(b =>
          b.ingredientId === ingredientId ? { ...b, supplierBatch, verified: supplierBatch.trim().length > 0 } : b
        );
        return { ...o, ingredientBatches: newBatches };
      });
      saveOrdersLocal(updated);
      return updated;
    });
  }, [setOrders, saveOrdersLocal]);

  const deleteOrder = useCallback(async (id: string) => {
    try {
      if (mode === 'supabase') {
        const { error } = await supabase.from('production_orders').delete().eq('id', id);
        if (error) throw error;
      }
      setOrders(prev => {
        const updated = prev.filter(o => o.id !== id);
        saveOrdersLocal(updated);
        return updated;
      });
      showToast('success', 'Excluída', 'Ordem de fabricação excluída.');
    } catch (err) {
      console.error('Erro ao excluir:', err);
      showToast('error', 'Erro', 'Não foi possível excluir a ordem.');
    }
  }, [mode, setOrders, saveOrdersLocal, showToast]);

  return {
    executeAdvance,
    toggleStep,
    updateBatch,
    deleteOrder,
    getScaledIngredients,
    saveOrdersLocal
  };
}
