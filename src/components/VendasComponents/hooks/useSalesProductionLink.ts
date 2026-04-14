import { generateId } from '../../../lib/id';
import { useToast } from '../../../components/dashboard/Toast';
import { SaleOrder, SaleOrderItem, CatalogItem } from '../types';

export function useSalesProductionLink(
  sellableCatalog: CatalogItem[],
  finishedGoods: any[],
  ingredients: any[],
  formulas: any[],
  persistOrder: (order: SaleOrder) => void,
  setFinishedGoods: (fg: any[]) => void,
  onModalClose: () => void,
  setConfirmModal: (modal: any) => void
) {
  const { showToast } = useToast();

  const checkStockAndConfirm = (order: SaleOrder) => {
    let hasInsufficientStock = false;
    const missingItems: { item: SaleOrderItem; formula: any; catalogItem: any; currentStock: number }[] = [];

    order.items.forEach(item => {
      const catalogItem = sellableCatalog.find(c => c.id === item.finished_good_id);
      const product = finishedGoods.find(fg => fg.id === item.finished_good_id);
      const stock = product ? (product.stock_quantity || 0) : 0;

      if (stock < item.quantity) {
        hasInsufficientStock = true;
        const formula = formulas.find(f => f.id === catalogItem?.formula_id);
        missingItems.push({ item, formula, catalogItem, currentStock: stock });
      }
    });

    if (hasInsufficientStock) {
      setConfirmModal({
        isOpen: true,
        title: 'Estoque Insuficiente - Iniciar Produção',
        message: 'Alguns itens não possuem estoque suficiente. O sistema gerará Ordens de Fabricação (OF) automaticamente no módulo de Produção.',
        detail: `O sistema identificou a necessidade de fabricar as quantidades faltantes:\n${missingItems.map(m => `\n• ${m.item.name}: ${m.item.quantity - m.currentStock} unidade(s)`).join('')}`,
        type: 'warning',
        confirmLabel: 'Confirmar e Abrir OFs',
        onConfirm: () => {
          const existingPOsRaw = localStorage.getItem('local_production_orders');
          const existingPOs = existingPOsRaw ? JSON.parse(existingPOsRaw) : [];
          const newPOs: any[] = [];
          const generatedOFNumbers: string[] = [];

          missingItems.forEach(({ item, formula, catalogItem, currentStock }) => {
            if (!formula) return;

            const cap = Number(catalogItem?.capacity || 0);
            
            let matchingPkg: any = null;
            let matchingVariant: any = null;

            for (const ing of ingredients.filter(i => !i.produto_quimico)) {
              const nameMatch = ing.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT|litro|litros|mililitro|mililitros)/i);
              let ingCap = nameMatch ? parseFloat(nameMatch[1].replace(',', '.')) : 0;
              if (nameMatch && nameMatch[2].toLowerCase().includes('ml')) ingCap /= 1000;
              
              if (ingCap > 0 && Math.abs(ingCap - cap) < 0.01) {
                matchingPkg = ing;
                break;
              }

              if (ing.variants && Array.isArray(ing.variants)) {
                const foundVariant = ing.variants.find((v: any) => {
                  const vMatch = v.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT|litro|litros|mililitro|mililitros)/i);
                  let vCap = vMatch ? parseFloat(vMatch[1].replace(',', '.')) : 0;
                  if (vMatch && vMatch[2].toLowerCase().includes('ml')) vCap /= 1000;
                  return vCap > 0 && Math.abs(vCap - cap) < 0.01;
                });

                if (foundVariant) {
                  matchingPkg = ing;
                  matchingVariant = foundVariant;
                  break;
                }
              }

              if (ing.apelido) {
                const apelidoMatch = ing.apelido.match(/(\d+[.,]?\d*)\s*(L|ml|LT|litro|litros)/i);
                let aCap = apelidoMatch ? parseFloat(apelidoMatch[1].replace(',', '.')) : 0;
                if (apelidoMatch && apelidoMatch[2].toLowerCase().includes('ml')) aCap /= 1000;
                if (aCap > 0 && Math.abs(aCap - cap) < 0.01) {
                  matchingPkg = ing;
                  break;
                }
              }
            }

            const ofId = generateId();
            const batchNum = `OF-${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
            const qtyToProduce = item.quantity - (currentStock || 0);

            let matchingLabelPkg: any = null;
            let matchingLabelVariant: any = null;

            for (const ing of ingredients.filter(i => !i.produto_quimico && /r[oó]tulo/i.test(i.name))) {
              if (ing.variants && Array.isArray(ing.variants)) {
                const foundVariant = ing.variants.find((v: any) => {
                  const vMatch = v.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT|litro|litros|mililitro|mililitros)/i);
                  let vCap = vMatch ? parseFloat(vMatch[1].replace(',', '.')) : 0;
                  if (vMatch && vMatch[2].toLowerCase().includes('ml')) vCap /= 1000;
                  return vCap > 0 && Math.abs(vCap - cap) < 0.01;
                });

                if (foundVariant) {
                  matchingLabelPkg = ing;
                  matchingLabelVariant = foundVariant;
                  break;
                }
              }
            }

            const newPO = {
              id: ofId,
              formula_id: formula.id,
              batch_number: batchNum,
              planned_volume: qtyToProduce * cap,
              status: 'planned',
              created_at: new Date().toISOString(),
              formulaSnapshot: formula,
              reference_sale_order_id: order.id,
              reference_sale_order_number: order.number,
              packagingPlan: [
                matchingPkg ? {
                  packagingId: matchingPkg.id,
                  variantId: matchingVariant?.id || null,
                  name: matchingVariant ? `${matchingPkg.name} - ${matchingVariant.name}` : matchingPkg.name,
                  capacity: cap,
                  quantity: qtyToProduce,
                  cost: matchingVariant?.cost_per_unit || matchingPkg.cost_per_unit || 0,
                  unit: 'UNI'
                } : {
                  packagingId: 'fallback_pkg',
                  variantId: null,
                  name: 'Embalagem (Não Encontrada)',
                  capacity: cap,
                  quantity: qtyToProduce,
                  cost: 0,
                  unit: 'UNI'
                },
                ...(matchingLabelPkg ? [{
                  packagingId: matchingLabelPkg.id,
                  variantId: matchingLabelVariant?.id || null,
                  name: matchingLabelVariant ? `${matchingLabelPkg.name} - ${matchingLabelVariant.name}` : matchingLabelPkg.name,
                  capacity: cap,
                  quantity: qtyToProduce,
                  cost: matchingLabelVariant?.cost_per_unit || matchingLabelPkg.cost_per_unit || 0,
                  unit: 'UNI'
                }] : [])
              ],
              notes: `Gerada automaticamente pelo Pedido de Venda ${order.number} (Produção complementar: ${qtyToProduce} de ${item.quantity} unidades totais)`
            };

            newPOs.push(newPO);
            generatedOFNumbers.push(batchNum);
          });

          localStorage.setItem('local_production_orders', JSON.stringify([...newPOs.reverse(), ...existingPOs]));

          const updatedOrder: SaleOrder = { 
            ...order, 
            status: 'producao',
            notes: `${order.notes || ''}\n\n[PRODUÇÃO] OFs Geradas: ${generatedOFNumbers.join(', ')} em ${new Date().toLocaleString()}.`
          };
          
          persistOrder(updatedOrder);
          onModalClose();
          setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
          showToast('success', 'OFs Geradas!', `Foram abertas ${newPOs.length} ordens no módulo de produção.`);
        }
      });
    } else {
      const updatedOrder: SaleOrder = { ...order, status: 'separacao' };
      const localFGLogs = JSON.parse(localStorage.getItem('local_finished_goods_logs') || '[]');
      
      const updatedFG = [...finishedGoods].map(fg => {
        const item = order.items.find(i => i.finished_good_id === fg.id);
        if (item) {
          localFGLogs.push({
            id: generateId(),
            finished_good_id: fg.id,
            quantity: item.quantity,
            type: 'adjust',
            notes: `Reserva de Estoque (Pedido: ${order.number})`,
            created_at: new Date().toISOString()
          });

          return { 
            ...fg, 
            stock_quantity: (fg.stock_quantity || 0) - item.quantity,
            reserved_quantity: (fg.reserved_quantity || 0) + item.quantity
          };
        }
        return fg;
      });

      localStorage.setItem('local_finished_goods', JSON.stringify(updatedFG));
      localStorage.setItem('local_finished_goods_logs', JSON.stringify(localFGLogs));
      setFinishedGoods(updatedFG);
      persistOrder(updatedOrder);
      onModalClose();
      showToast('success', 'Pedido Confirmado', 'Estoque reservado com sucesso e enviado para SEPARAÇÃO.');
    }
  };

  return { checkStockAndConfirm };
}
