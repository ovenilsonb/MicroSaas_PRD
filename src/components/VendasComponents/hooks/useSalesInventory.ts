import { generateId } from '../../../lib/id';
import { useToast } from '../../../components/dashboard/Toast';
import { SaleOrder } from '../types';

export function useSalesInventory(
  orders: SaleOrder[],
  setOrders: (orders: SaleOrder[]) => void,
  finishedGoods: any[],
  setFinishedGoods: (fg: any[]) => void
) {
  const { showToast } = useToast();

  const persistOrder = (order: SaleOrder) => {
    const updatedOrders = [...orders];
    const index = updatedOrders.findIndex(o => o.id === order.id);
    if (index >= 0) updatedOrders[index] = order;
    else updatedOrders.push(order);
    localStorage.setItem('local_sale_orders', JSON.stringify(updatedOrders));
    setOrders(updatedOrders);
  };

  const handleConfirmReceipt = (order: SaleOrder) => {
    const updatedOrder: SaleOrder = {
      ...order,
      status: 'recebido',
      confirmed_at: new Date().toISOString()
    };

    const localFG = JSON.parse(localStorage.getItem('local_finished_goods') || '[]');
    const localFGLogs = JSON.parse(localStorage.getItem('local_finished_goods_logs') || '[]');
    
    const updatedFG = localFG.map((fg: any) => {
      const item = order.items.find(i => i.finished_good_id === fg.id);
      if (item) {
        const reserved = fg.reserved_quantity || 0;
        
        localFGLogs.push({
          id: generateId(),
          finished_good_id: fg.id,
          quantity: item.quantity,
          type: 'out',
          notes: `Saída Venda Concluída (Pedido: ${order.number})`,
          created_at: new Date().toISOString()
        });

        return { 
          ...fg, 
          reserved_quantity: Math.max(0, reserved - item.quantity)
        };
      }
      return fg;
    });

    localStorage.setItem('local_finished_goods', JSON.stringify(updatedFG));
    localStorage.setItem('local_finished_goods_logs', JSON.stringify(localFGLogs));
    setFinishedGoods(updatedFG);
    persistOrder(updatedOrder);
    showToast('success', 'Venda Concluída', 'O recebimento foi confirmado e o estoque reservado foi baixado.');
  };

  const handleCancelOrder = (order: SaleOrder) => {
    const updatedOrder: SaleOrder = {
      ...order,
      status: 'cancelado',
      notes: `${order.notes || ''}\n\n[CANCELAMENTO] Pedido cancelado em ${new Date().toLocaleString()}.`
    };

    const statusesWithReservation = ['producao', 'separacao', 'retirada', 'transito'];
    if (statusesWithReservation.includes(order.status)) {
      const localFG = JSON.parse(localStorage.getItem('local_finished_goods') || '[]');
      const localFGLogs = JSON.parse(localStorage.getItem('local_finished_goods_logs') || '[]');
      
      const updatedFG = localFG.map((fg: any) => {
        const item = order.items.find(i => i.finished_good_id === fg.id);
        if (item) {
          localFGLogs.push({
            id: generateId(),
            finished_good_id: fg.id,
            quantity: item.quantity,
            type: 'adjust',
            notes: `Liberação de Reserva (Pedido Cancelado: ${order.number})`,
            created_at: new Date().toISOString()
          });

          return {
            ...fg,
            stock_quantity: (fg.stock_quantity || 0) + item.quantity,
            reserved_quantity: Math.max(0, (fg.reserved_quantity || 0) - item.quantity)
          };
        }
        return fg;
      });

      localStorage.setItem('local_finished_goods', JSON.stringify(updatedFG));
      localStorage.setItem('local_finished_goods_logs', JSON.stringify(localFGLogs));
      setFinishedGoods(updatedFG);
    }

    persistOrder(updatedOrder);
    showToast('warning', 'Pedido Cancelado', 'O pedido foi cancelado e o estoque reservado foi liberado.');
  };

  const handleFinishSeparation = (order: SaleOrder) => {
    const nextStatus = order.delivery_method === 'entrega' ? 'transito' : 'retirada';
    const updatedOrder: SaleOrder = {
      ...order,
      status: nextStatus,
      notes: `${order.notes || ''}\n\n[SISTEMA] Separação finalizada por ${new Date().toLocaleString()}. Enviado para ${nextStatus.toUpperCase()}.`
    };
    persistOrder(updatedOrder);
    showToast('success', 'Separação Finalizada', `Pedido enviado para ${nextStatus === 'transito' ? 'Entrega' : 'Retirada'}.`);
  };

  const handleFinalizeDelivery = (order: SaleOrder) => {
    const updatedOrder: SaleOrder = {
      ...order,
      status: 'recebido',
      notes: `${order.notes || ''}\n\n[SISTEMA] Pedido marcado como RECEBIDO em ${new Date().toLocaleString()}. Ciclo finalizado.`
    };
    persistOrder(updatedOrder);
    showToast('success', 'Venda Concluída', 'O pedido foi finalizado e marcado como recebido.');
  };

  const handleReturnOrder = (order: SaleOrder) => {
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 5);

    const updatedOrder: SaleOrder = { 
      ...order, 
      status: 'devolvido',
      expected_return_date: returnDate.toISOString(),
      notes: `${order.notes || ''}\n\n[DEVOLUÇÃO EM ${new Date().toLocaleDateString()}] Quarentena técnica até ${returnDate.toLocaleDateString()}.`
    };
    persistOrder(updatedOrder);
    showToast('info', 'Em Quarentena', 'O pedido foi marcado como devolvido e está em análise técnica.');
  };

  return {
    handleConfirmReceipt,
    handleCancelOrder,
    handleFinishSeparation,
    handleFinalizeDelivery,
    handleReturnOrder,
    persistOrder
  };
}
