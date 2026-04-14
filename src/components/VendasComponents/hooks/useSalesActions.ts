import { useState } from 'react';
import { generateId } from '../../../lib/id';
import { useToast } from '../../../components/dashboard/Toast';
import { SaleOrder, CatalogItem } from '../types';

export function useSalesActions(
  orders: SaleOrder[],
  setOrders: (orders: SaleOrder[]) => void,
  sellableCatalog: CatalogItem[],
  persistOrder: (order: SaleOrder) => void
) {
  const { showToast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Partial<SaleOrder> | null>(null);
  const [modalSelections, setModalSelections] = useState<Record<string, number>>({});
  
  const [confirmModal, setConfirmModal] = useState<any>({ 
    isOpen: false, 
    title: '', 
    message: '', 
    type: 'warning', 
    onConfirm: () => {} 
  });

  const handleOpenModal = (order?: SaleOrder) => {
    if (order) {
      setCurrentOrder({ ...order });
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      setCurrentOrder({
        id: generateId(),
        number: `PV-${new Date().getFullYear()}${(orders.length + 1).toString().padStart(4, '0')}`,
        status: 'rascunho',
        delivery_method: 'entrega',
        items: [],
        total_value: 0,
        discount: 0,
        final_value: 0,
        price_table: 'varejo',
        created_at: new Date().toISOString(),
        expected_delivery_date: tomorrow.toISOString().split('T')[0]
      });
    }
    setModalSelections({});
    setIsModalOpen(true);
  };

  const handleSaveOrder = (order: SaleOrder) => {
    persistOrder(order);
  };

  const handleDeleteOrder = (order: SaleOrder) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Pedido',
      message: `Deseja realmente excluir o pedido ${order.number}?`,
      detail: 'Esta ação é irreversível e removerá permanentemente o registro do sistema.',
      type: 'danger',
      confirmLabel: 'Sim, Excluir',
      onConfirm: () => {
        const updatedOrders = orders.filter(o => o.id !== order.id);
        localStorage.setItem('local_sale_orders', JSON.stringify(updatedOrders));
        setOrders(updatedOrders);
        showToast('success', 'Excluído', 'Pedido de venda removido com sucesso.');
        setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleBulkAddItems = (selections: Record<string, number>, priceTable: string) => {
    const ids = Object.keys(selections);
    if (ids.length === 0) return;

    const newItems = [...(currentOrder?.items || [])];
    
    ids.forEach(id => {
      const catalogItem = sellableCatalog.find(c => c.id === id);
      if (!catalogItem) return;

      const qty = selections[id];
      const price = priceTable === 'atacado' ? (catalogItem.pricing?.atacadoPrice || 0) : 
                    priceTable === 'fardo' ? (catalogItem.pricing?.fardoPrice || 0) : 
                    (catalogItem.pricing?.varejoPrice || 0);

      const existingIdx = newItems.findIndex(ni => ni.finished_good_id === id);
      if (existingIdx >= 0) {
        const existing = newItems[existingIdx];
        newItems[existingIdx] = {
          ...existing,
          quantity: existing.quantity + qty,
          subtotal: (existing.quantity + qty) * existing.unit_price
        };
      } else {
        newItems.push({
          id: generateId(),
          finished_good_id: id,
          name: `${catalogItem.name} ${catalogItem.capacity}L`,
          quantity: qty,
          unit_price: price,
          subtotal: price * qty
        });
      }
    });

    const total = newItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    setCurrentOrder((prev: any) => ({ 
      ...prev, 
      items: newItems, 
      total_value: total, 
      final_value: total - (prev?.discount || 0) 
    }));

    showToast('success', 'Sucesso', `${ids.length} itens adicionados ao pedido.`);
  };

  return {
    isModalOpen,
    setIsModalOpen,
    currentOrder,
    setCurrentOrder,
    handleOpenModal,
    handleSaveOrder,
    handleDeleteOrder,
    handleBulkAddItems,
    confirmModal,
    setConfirmModal
  };
}
