import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Users, Package, Clock, CheckCircle2, AlertCircle, 
  X, Search, Plus, Minus, List, LayoutGrid, Trash2, Printer, Send, 
  Truck, ArrowRight, DollarSign, History, Filter, MoreHorizontal,
  ChevronRight, Calendar, User, MapPin, BadgeDollarSign, CreditCard,
  Edit2, PackageOpen, Undo2, Save, Info, FileText, Factory, Zap, ShieldCheck, ClipboardList
} from 'lucide-react';

import { useStorageMode } from '../contexts/StorageModeContext';
import { generateId } from '../lib/id';
import { useToast } from './dashboard/Toast';
import { ConfirmModal, ConfirmModalType } from './shared/ConfirmModal';

// ─── Interfaces ──────────────────────────────────────────────

export type SaleStatus = 
  | 'rascunho'      // Editável, sem impacto em estoque
  | 'producao'      // Aguardando OF vinculada
  | 'separacao'     // Pronto p/ estoqueiro separar
  | 'retirada'      // Disponível para o cliente buscar
  | 'transito'      // Em rota de entrega
  | 'recebido'      // Finalizado e concretizado
  | 'cancelado'     // Cancelado antes do envio
  | 'reproducao'    // Necessário refazer (reprovado na qualidade)
  | 'devolvido';    // Devolvido após envio (Quarentena)

export type DeliveryMethod = 'retirada' | 'entrega';

export interface SaleOrderItem {
  id: string;
  finished_good_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface SaleOrder {
  id: string;
  number: string;
  client_id: string;
  client_name: string;
  status: SaleStatus;
  delivery_method: DeliveryMethod;
  items: SaleOrderItem[];
  total_value: number;
  discount: number;
  final_value: number;
  created_at: string;
  expected_delivery_date?: string;
  confirmed_at?: string; // Data da confirmação de recebimento
  expected_return_date?: string; // Data fim da quarentena
  notes?: string;
  production_order_id?: string; // Vínculo com Módulo 06
  price_table?: 'varejo' | 'atacado' | 'fardo'; // Nova propriedade
}


export interface PricingEntry {
  formulaId: string;
  capacityKey: string;
  varejoPrice: number;
  atacadoPrice: number;
  fardoPrice: number;
  fardoQty: number;
  notAvailable?: boolean;
}


import { useCompanySettings } from '../hooks/useCompanySettings';

export function Vendas({ setActiveMenu }: { setActiveMenu?: (menu: string) => void }) {
  const { mode } = useStorageMode();
  const { showToast } = useToast();
  const { settings } = useCompanySettings();

  // ─── State ──────────────────────────────────────────────────
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [productionOrders, setProductionOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<any[]>([]);
  const [formulas, setFormulas] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [pricingEntries, setPricingEntries] = useState<PricingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'todos' | SaleStatus | 'pendente_recebimento'>('todos');
  const [categories, setCategories] = useState<any[]>([]);
  const [lastPurchaseMap, setLastPurchaseMap] = useState<Record<string, string>>({});
  
  // Modais de Seleção Avançada
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  
  // Filtros de Busca
  const [clientFilters, setClientFilters] = useState({
    term: '',
    bairro: '',
    cidade: '',
    estado: ''
  });
  const [productFilters, setProductFilters] = useState({
    term: '',
    categoryId: 'all',
    volume: 'all'
  });
  
  // Seleções temporárias no modal de produtos (Carrinho Interno)
  const [modalSelections, setModalSelections] = useState<Record<string, number>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'itens' | 'logistica'>('geral');
  const [currentOrder, setCurrentOrder] = useState<Partial<SaleOrder> | null>(null);

  // Helper de Bloqueio de Edição
  const isEditable = !currentOrder || currentOrder.status === 'rascunho';

  // Busca OF vinculada ao pedido atual
  const linkedProductionOrder = useMemo(() => {
    if (!currentOrder?.id) return null;
    return productionOrders.find(po => po.reference_sale_order_id === currentOrder.id && po.status !== 'cancelled');
  }, [currentOrder?.id, productionOrders]);
  const [showItemSelector, setShowItemSelector] = useState(false);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; 
    title: string; 
    message: string; 
    detail?: string;
    type: ConfirmModalType; 
    confirmLabel?: string; 
    onConfirm: () => void;
  }>({ 
    isOpen: false, 
    title: '', 
    message: '', 
    type: 'warning', 
    onConfirm: () => {} 
  });

  // --- Printing Engine (Anti-Bloqueio via Iframe) ---
  const handlePrintSaleOrder = (order: SaleOrder) => {
    const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const orderClient = clients.find(c => c.id === order.client_id);
    
    const cssStyles = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@400;700;900&family=Roboto:wght@400;700;900&family=Playfair+Display:wght@400;700;900&family=Open+Sans:wght@400;700;800&family=Lato:wght@400;700;900&family=Poppins:wght@400;700;900&family=Outfit:wght@400;700;900&display=swap');
      @page { margin: 15mm; size: auto; }
      body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.4; padding: 0; margin: 0; background: white; }
      .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid ${settings.primaryColor || '#202eac'}; padding-bottom: 20px; margin-bottom: 30px; }
      .company-name { font-family: '${settings.headerFont}', sans-serif !important; font-size: 24px; font-weight: 900; color: #0f172a; }
      .doc-title { text-align: right; }
      .doc-title h1 { font-size: 18px; font-weight: 900; color: ${settings.primaryColor || '#202eac'}; margin: 0; text-transform: uppercase; }
      .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; margin-bottom: 30px; }
      .section-title { font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
      .data-row { margin-bottom: 5px; font-size: 12px; }
      .label { font-weight: 700; color: #475569; }
      table { width: 100%; border-collapse: collapse; margin: 30px 0; }
      th { background: #f8fafc; text-align: left; padding: 12px; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
      td { padding: 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
      .total-card { background: #f8fafc; border-radius: 12px; padding: 20px; margin-left: auto; width: 250px; }
      .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
      .final-total { border-top: 2px solid #e2e8f0; margin-top: 10px; padding-top: 10px; font-size: 18px; font-weight: 900; color: ${settings.primaryColor || '#202eac'}; }
      .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding: 10px 0; }
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pedido de Venda - ${order.number}</title>
        <style>${cssStyles}</style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 15px;">
            ${settings.logo ? `<img src="${settings.logo}" style="height: 60px;" />` : `<div style="width:50px; height:50px; background:${settings.primaryColor || '#202eac'}; border-radius:12px;"></div>`}
            <div>
              <div class="company-name">${settings.name}</div>
              <div style="font-size: 10px; color: #64748b;">${settings.document ? `CNPJ: ${settings.document}` : ''}</div>
              <div style="font-size: 10px; color: #64748b;">${settings.address || ''}</div>
            </div>
          </div>
          <div class="doc-title">
            <h1>Pedido de Venda</h1>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${order.number}</div>
          </div>
        </div>

        <div class="grid">
          <div>
            <div class="section-title">Dados do Cliente</div>
            <div class="data-row"><span class="label">Cliente:</span> ${order.client_name}</div>
            <div class="data-row"><span class="label">Documentos:</span> ${orderClient?.document || '-'}</div>
            <div class="data-row"><span class="label">Telefone:</span> ${orderClient?.phone || '-'}</div>
            <div class="data-row"><span class="label">Endereço:</span> ${orderClient?.address || ''}, ${orderClient?.neighborhood || ''}</div>
            <div class="data-row">${orderClient?.city || ''} / ${orderClient?.state || ''}</div>
          </div>
          <div>
            <div class="section-title">Dados do Pedido</div>
            <div class="data-row"><span class="label">Data de Emissão:</span> ${new Date(order.created_at).toLocaleDateString()}</div>
            <div class="data-row"><span class="label">Método de Entrega:</span> ${order.delivery_method.toUpperCase()}</div>
            <div class="data-row"><span class="label">Status:</span> ${order.status.toUpperCase()}</div>
            ${order.expected_delivery_date ? `<div class="data-row"><span class="label">Previsão de Entrega:</span> ${new Date(order.expected_delivery_date).toLocaleDateString()}</div>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Cód.</th>
              <th>Produto</th>
              <th style="text-align: right;">Qtd.</th>
              <th style="text-align: right;">Preço Unit.</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td style="font-family: monospace; color: #64748b;">${item.finished_good_id.split('-')[0]}</td>
                <td style="font-weight: 700;">${item.name}</td>
                <td style="text-align: right; font-weight: 700;">${item.quantity}</td>
                <td style="text-align: right;">${formatBRL(item.unit_price)}</td>
                <td style="text-align: right; font-weight: 700;">${formatBRL(item.subtotal)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-card">
          <div class="total-row"><span>Subtotal:</span> <span>${formatBRL(order.total_value)}</span></div>
          <div class="total-row"><span>Desconto:</span> <span>${formatBRL(order.discount || 0)}</span></div>
          <div class="final-total">
            <div style="font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase;">Total do Pedido</div>
            <div>${formatBRL(order.final_value)}</div>
          </div>
        </div>

        ${order.notes ? `
          <div style="margin-top: 40px;">
            <div class="section-title">Observações</div>
            <div style="font-size: 11px; color: #475569;">${order.notes}</div>
          </div>
        ` : ''}

        <div style="margin-top: 60px; display: flex; gap: 50px;">
          <div style="flex: 1; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 10px; color: #64748b;">Assinatura do Cliente</div>
          <div style="flex: 1; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 10px; color: #64748b;">Responsável Ohana Clean</div>
        </div>

        <div class="footer">${settings.name} - MicroSaaS Industrial Planner</div>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument?.write(html);
    iframe.contentDocument?.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };



  // ─── Fetch Data ─────────────────────────────────────────────
  
  const fetchData = () => {
    setIsLoading(true);
    try {
      if (mode === 'supabase') {
        // Futura integração Supabase
        setOrders([]);
        setClients([]);
        setFinishedGoods([]);
        setFormulas([]);
        setIngredients([]);
        setPricingEntries([]);
      } else {
        const localOrders = localStorage.getItem('local_sale_orders');
        const localPO = localStorage.getItem('local_production_orders');
        const localClients = localStorage.getItem('local_clients');
        const localFG = localStorage.getItem('local_finished_goods');
        const localFormulas = localStorage.getItem('local_formulas');
        const localIngredients = localStorage.getItem('local_ingredients');
        const localPricing = localStorage.getItem('precificacao_entries');
        
        setOrders(localOrders ? JSON.parse(localOrders) : []);
        setProductionOrders(localPO ? JSON.parse(localPO) : []);
        setClients(localClients ? JSON.parse(localClients) : []);
        setFinishedGoods(localFG ? JSON.parse(localFG) : []);
        setFormulas(localFormulas ? JSON.parse(localFormulas) : []);
        setIngredients(localIngredients ? JSON.parse(localIngredients) : []);
        setPricingEntries(localPricing ? JSON.parse(localPricing) : []);
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      showToast('error', 'Erro', 'Falha ao carregar dados do módulo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Carregar Categorias (ex-Grupos)
    const savedGroups = JSON.parse(localStorage.getItem('local_groups') || '[]');
    setCategories(savedGroups);

    // Calcular Última Compra por Cliente
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




  useEffect(() => {
    fetchData();
  }, [mode]);


  const sellableCatalog = useMemo(() => {
    // Função auxiliar para extrair capacidade do nome se o campo técnico estiver ausente
    const extractCapacity = (name: string): number => {
      const match = name.match(/(\d+[.,]?\d*)\s*(L|ml|LT|litro|litros)/i);
      if (!match) return 0;
      let cap = parseFloat(match[1].replace(',', '.'));
      if (match[2].toLowerCase().includes('ml')) cap /= 1000;
      return cap;
    };

    return pricingEntries.filter(p => !p.notAvailable).map(pricing => {
      const formula = formulas.find(f => f.id === pricing.formulaId);
      
      // Busca resiliente: tenta por ID + Capacidade (campo) ou ID + Capacidade (extraída do nome)
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

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        o.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.client_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      if (statusFilter === 'todos') return true;
      if (statusFilter === 'pendente_recebimento') {
        return o.status === 'retirada' || o.status === 'transito';
      }
      return o.status === statusFilter;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, searchTerm, statusFilter]);


  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter(o => o.status === 'recebido')
      .reduce((acc, curr) => acc + curr.final_value, 0);

    return {
      total: orders.length,
      revenue: totalRevenue,
      waitingProduction: orders.filter(o => o.status === 'producao').length,
      needsReproduction: orders.filter(o => o.status === 'reproducao').length,
      waitingAction: orders.filter(o => o.status === 'separacao').length,
      pendingReceipt: orders.filter(o => o.status === 'transito' || o.status === 'retirada').length,
      returns: orders.filter(o => o.status === 'devolvido').length
    };
  }, [orders]);

  // ─── Handlers ───────────────────────────────────────────────

  const handleOpenModal = (order?: SaleOrder) => {
    setActiveTab('geral');
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
    setModalSelections({}); // Reset do carrinho interno
    setIsModalOpen(true);
  };

  const handleSaveOrder = async (order: SaleOrder) => {
    try {
      const updatedOrders = [...orders];
      const index = updatedOrders.findIndex(o => o.id === order.id);
      
      if (index >= 0) {
        updatedOrders[index] = order;
      } else {
        updatedOrders.push(order);
      }

      localStorage.setItem('local_sale_orders', JSON.stringify(updatedOrders));
      setOrders(updatedOrders);
      showToast('success', 'Sucesso', 'Pedido de venda salvo com sucesso.');
    } catch (err) {
      console.error('Erro ao salvar pedido:', err);
      showToast('error', 'Erro', 'Falha ao salvar pedido.');
    }
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
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleConfirmReceipt = (order: SaleOrder) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Recebimento',
      message: `Deseja confirmar que o cliente recebeu o pedido ${order.number}?`,
      detail: 'Isso finalizará o ciclo da venda e confirmará a baixa definitiva do estoque reservado.',
      type: 'success',
      confirmLabel: 'Sim, Confirmar',
      onConfirm: () => {
        const updatedOrder: SaleOrder = {
          ...order,
          status: 'recebido',
          confirmed_at: new Date().toISOString()
        };

        // BAIXA DEFINITIVA DO ESTOQUE RESERVADO
        const localFG = JSON.parse(localStorage.getItem('local_finished_goods') || '[]');
        const localFGLogs = JSON.parse(localStorage.getItem('local_finished_goods_logs') || '[]');
        
        const updatedFG = localFG.map((fg: any) => {
          const item = order.items.find(i => i.finished_good_id === fg.id);
          if (item) {
            const reserved = fg.reserved_quantity || 0;
            const toDeduct = Math.min(reserved, item.quantity); // Proteção contra negativos
            
            // Log de Saída Permanente
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
        
        handleSaveOrder(updatedOrder);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleCancelOrder = (order: SaleOrder) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancelar Pedido',
      message: `Deseja realmente cancelar o pedido ${order.number}?`,
      detail: 'Se houver estoque reservado para este pedido, ele será devolvido ao saldo disponível.',
      type: 'danger',
      confirmLabel: 'Sim, Cancelar',
      onConfirm: () => {
        const updatedOrder: SaleOrder = {
          ...order,
          status: 'cancelado',
          notes: `${order.notes || ''}\n\n[CANCELAMENTO] Pedido cancelado em ${new Date().toLocaleString()}.`
        };

        // DEVOLUÇÃO DE RESERVA PARA ESTOQUE LIVRE
        const localFG = JSON.parse(localStorage.getItem('local_finished_goods') || '[]');
        const localFGLogs = JSON.parse(localStorage.getItem('local_finished_goods_logs') || '[]');
        
        const updatedFG = localFG.map((fg: any) => {
          const item = order.items.find(i => i.finished_good_id === fg.id);
          if (item) {
            // Só devolvemos se o pedido estivesse em um status que reserva estoque
            // Status que reservam: producao (conforme OFs entram), separacao, retirada, transito
            const statusesWithReservation = ['producao', 'separacao', 'retirada', 'transito'];
            
            if (statusesWithReservation.includes(order.status)) {
              // Verificamos quanto desse item estava de fato reservado
              // Como a reserva é global por produto, devolvemos a quantidade do pedido
              
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
          }
          return fg;
        });

        localStorage.setItem('local_finished_goods', JSON.stringify(updatedFG));
        localStorage.setItem('local_finished_goods_logs', JSON.stringify(localFGLogs));
        setFinishedGoods(updatedFG);

        handleSaveOrder(updatedOrder);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        showToast('warning', 'Pedido Cancelado', 'O pedido foi cancelado e o estoque reservado foi liberado.');
      }
    });
  };


  const calculateItemPrice = (finishedGood: any, client: any) => {
    if (!finishedGood || !client) return 0;
    
    // Find pricing entry
    const pricing = pricingEntries.find(p => 
      p.formulaId === finishedGood.formula_id && 
      p.capacityKey === String(finishedGood.capacity)
    );

    if (!pricing) return 0;

    // Determine price based on client profile
    switch (client.tabela_preco) {
      case 'varejo': return pricing.varejoPrice;
      case 'atacado': return pricing.atacadoPrice;
      case 'fardo': return pricing.fardoPrice;
      default: return pricing.varejoPrice;
    }
  };

  const handleAddItem = (catalogItemId: string) => {
    const catalogItem = sellableCatalog.find(item => item.id === catalogItemId);
    const client = clients.find(c => c.id === currentOrder?.client_id);
    
    if (!catalogItem || !client) {
      showToast('warning', 'Atenção', 'Selecione um cliente antes de adicionar itens.');
      return;
    }

    let price = 0;
    const selectedTable = currentOrder?.price_table || 'varejo';
    
    switch (selectedTable) {
      case 'varejo': price = catalogItem.pricing.varejoPrice; break;
      case 'atacado': price = catalogItem.pricing.atacadoPrice; break;
      case 'fardo': price = catalogItem.pricing.fardoPrice; break;
      default: price = catalogItem.pricing.varejoPrice;
    }

    const newItem: SaleOrderItem = {
      id: generateId(),
      finished_good_id: catalogItem.id,
      name: `${catalogItem.name} ${catalogItem.capacity}L`,
      quantity: 1,
      unit_price: price,
      subtotal: price
    };

    const updatedItems = [...(currentOrder?.items || []), newItem];
    const total = updatedItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    
    setCurrentOrder(prev => ({ 
      ...prev, 
      items: updatedItems, 
      total_value: total, 
      final_value: total - (prev?.discount || 0) 
    }));
    setShowItemSelector(false);
  };

  const handleSelectProduct = (product: any) => {
    setModalSelections(prev => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1
    }));
    
    if (product.stock_quantity <= 0) {
      showToast('warning', 'Atenção: Sem Estoque', 'O produto escolhido não tem no estoque. Ao confirmar, será gerada uma necessidade de produção.');
    }
  };

  const handleUpdateModalQuantity = (productId: string, delta: number) => {
    setModalSelections(prev => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleBulkAddItems = () => {
    const ids = Object.keys(modalSelections);
    if (ids.length === 0) return;

    const newItems = [...(currentOrder?.items || [])];
    
    ids.forEach(id => {
      const catalogItem = sellableCatalog.find(c => c.id === id);
      if (!catalogItem) return;

      const qty = modalSelections[id];
      const price = currentOrder?.price_table === 'atacado' ? (catalogItem.pricing?.atacadoPrice || 0) : 
                    currentOrder?.price_table === 'fardo' ? (catalogItem.pricing?.fardoPrice || 0) : 
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
    setCurrentOrder(prev => ({ 
      ...prev, 
      items: newItems, 
      total_value: total, 
      final_value: total - (prev?.discount || 0) 
    }));

    setModalSelections({});
    setIsProductSearchOpen(false);
    showToast('success', 'Sucesso', `${ids.length} itens adicionados ao pedido.`);
  };


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
          // 1. Gerar as Ordens de Produção
          const existingPOsRaw = localStorage.getItem('local_production_orders');
          const existingPOs = existingPOsRaw ? JSON.parse(existingPOsRaw) : [];
          const newPOs: any[] = [];
          const generatedOFNumbers: string[] = [];

          missingItems.forEach(({ item, formula, catalogItem, currentStock }) => {
            if (!formula) return;

            // Tentar localizar a embalagem correta baseada na capacidade
            const cap = Number(catalogItem?.capacity || 0);
            
            // BUSCA AVANÇADA DE EMBALAGEM (Insumo + Variantes)
            let matchingPkg: any = null;
            let matchingVariant: any = null;

            for (const ing of ingredients.filter(i => !i.produto_quimico)) {
              // 1. Tentar no nome do Insumo Pai
              const nameMatch = ing.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT|litro|litros|mililitro|mililitros)/i);
              let ingCap = nameMatch ? parseFloat(nameMatch[1].replace(',', '.')) : 0;
              if (nameMatch && nameMatch[2].toLowerCase().includes('ml')) ingCap /= 1000;
              
              if (ingCap > 0 && Math.abs(ingCap - cap) < 0.01) {
                matchingPkg = ing;
                break;
              }

              // 2. Tentar nas Variantes (Comum quando "Frasco" é o pai e "2L" é a variante)
              if (ing.variants && Array.isArray(ing.variants)) {
                const foundVariant = ing.variants.find(v => {
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

              // 3. Fallback: Apelido
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

            // BUSCA DE RÓTULO (Procura por insumo que contenha "RÓTULO" e variante compatível)
            let matchingLabelPkg: any = null;
            let matchingLabelVariant: any = null;

            for (const ing of ingredients.filter(i => !i.produto_quimico && /r[oó]tulo/i.test(i.name))) {
              // 1. Tentar nas Variantes do Insumo de Rótulos
              if (ing.variants && Array.isArray(ing.variants)) {
                const foundVariant = ing.variants.find(v => {
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
                // Item 1: Embalagem (Frasco/Galao)
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
                // Item 2: Rótulo (Se encontrado)
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

          // Salvar no localStorage da Produção
          localStorage.setItem('local_production_orders', JSON.stringify([...newPOs.reverse(), ...existingPOs]));

          // 2. Atualizar o Pedido de Venda
          const updatedOrder: SaleOrder = { 
            ...order, 
            status: 'producao',
            notes: `${order.notes || ''}\n\n[PRODUÇÃO] OFs Geradas: ${generatedOFNumbers.join(', ')} em ${new Date().toLocaleString()}.`
          };
          
          handleSaveOrder(updatedOrder);
          setIsModalOpen(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          showToast('success', 'OFs Geradas!', `Foram abertas ${newPOs.length} ordens no módulo de produção.`);
        }
      });
    } else {
      // Se tiver estoque, realiza a RESERVA IMEDIATA
      const updatedOrder: SaleOrder = { ...order, status: 'separacao' };
      const localFGLogs = JSON.parse(localStorage.getItem('local_finished_goods_logs') || '[]');
      
      const updatedFG = [...finishedGoods].map(fg => {
        const item = order.items.find(i => i.finished_good_id === fg.id);
        if (item) {
          // Log de Reserva
          localFGLogs.push({
            id: generateId(),
            finished_good_id: fg.id,
            quantity: item.quantity,
            type: 'adjust', // Ajuste interno de reserva
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
      handleSaveOrder(updatedOrder);
      setIsModalOpen(false);
      showToast('success', 'Pedido Confirmado', 'Estoque reservado com sucesso e enviado para SEPARAÇÃO.');
    }
  };

  const handleFinishSeparation = (order: SaleOrder) => {
    const nextStatus = order.delivery_method === 'entrega' ? 'transito' : 'retirada';
    const updatedOrder: SaleOrder = {
      ...order,
      status: nextStatus,
      notes: `${order.notes || ''}\n\n[SISTEMA] Separação finalizada por ${new Date().toLocaleString()}. Enviado para ${nextStatus.toUpperCase()}.`
    };
    handleSaveOrder(updatedOrder);
    setIsModalOpen(false);
    showToast('success', 'Separação Finalizada', `Pedido enviado para ${nextStatus === 'transito' ? 'Entrega' : 'Retirada'}.`);
  };

  const handleFinalizeDelivery = (order: SaleOrder) => {
    const updatedOrder: SaleOrder = {
      ...order,
      status: 'recebido',
      notes: `${order.notes || ''}\n\n[SISTEMA] Pedido marcado como RECEBIDO em ${new Date().toLocaleString()}. Ciclo finalizado.`
    };
    handleSaveOrder(updatedOrder);
    setIsModalOpen(false);
    showToast('success', 'Venda Concluída', 'O pedido foi finalizado e marcado como recebido.');
  };


  const handleReturnOrder = (order: SaleOrder) => {
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 5);

    setConfirmModal({
      isOpen: true,
      title: 'Registrar Devolução',
      message: `Deseja registrar a devolução do pedido ${order.number}?`,
      detail: 'O pedido entrará em QUARENTENA TÉCNICA por 5 dias antes de retornar ao estoque.',
      type: 'warning',
      confirmLabel: 'Confirmar Devolução',
      onConfirm: () => {
        const updatedOrder: SaleOrder = { 
          ...order, 
          status: 'devolvido',
          expected_return_date: returnDate.toISOString(),
          notes: `${order.notes || ''}\n\n[DEVOLUÇÃO EM ${new Date().toLocaleDateString()}] Quarentena técnica até ${returnDate.toLocaleDateString()}.`
        };
        handleSaveOrder(updatedOrder);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        showToast('info', 'Em Quarentena', 'O pedido foi marcado como devolvido e está em análise técnica.');
      }
    });
  };

  const handleRestartProduction = (order: SaleOrder) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reiniciar Produção',
      message: `Deseja reiniciar o processo produtivo para o pedido ${order.number}?`,
      detail: 'Isso gerará novas Ordens de Fabricação (OF) para os itens do pedido e retornará o status para "Em Produção".',
      type: 'warning',
      confirmLabel: 'Sim, Reiniciar',
      onConfirm: () => {
        // Aproveitar a lógica de checkStockAndConfirm para gerar novas OFs
        const updatedOrder: SaleOrder = {
          ...order,
          status: 'producao',
          notes: `${order.notes || ''}\n\n[SISTEMA] Produção reiniciada manualmente em ${new Date().toLocaleString()} após reprovação anterior.`
        };
        
        checkStockAndConfirm(updatedOrder);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsModalOpen(false); // Fecha o modal de detalhes para atualizar a lista
      }
    });
  };



  const getStatusConfig = (status: SaleStatus) => {
    switch (status) {
      case 'rascunho': return { label: 'Rascunho', color: 'bg-slate-100 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700', icon: <Edit2 className="w-3 h-3" /> };
      case 'producao': return { label: 'Aguardando Produção', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <PackageOpen className="w-3 h-3" /> };
      case 'separacao': return { label: 'Em Separação', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Package className="w-3 h-3" /> };
      case 'retirada': return { label: 'Pronto p/ Retirada', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <User className="w-3 h-3" /> };
      case 'transito': return { label: 'Em Trânsito', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: <Truck className="w-3 h-3" /> };
      case 'recebido': return { label: 'Concluído', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> };
      case 'devolvido': return { label: 'Quarentena/Devolvido', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Undo2 className="w-3 h-3" /> };
      case 'cancelado': return { label: 'Cancelado', color: 'bg-red-50 text-red-700 border-red-200', icon: <X className="w-3 h-3" /> };
      case 'reproducao': return { label: 'Necessário Refazer', color: 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse', icon: <AlertCircle className="w-3 h-3" /> };
      default: return { label: status, color: 'bg-slate-100 text-slate-500 dark:text-slate-400', icon: <AlertCircle className="w-3 h-3" /> };
    }
  };


  // --- Filtered Lists for Selection ---
  const filteredClientsForSelection = useMemo(() => {
    return clients.filter(c => {
      const termMatch = !clientFilters.term || 
        c.name.toLowerCase().includes(clientFilters.term.toLowerCase()) ||
        (c.cnpj_cpf && c.cnpj_cpf.includes(clientFilters.term));
      
      const bairroMatch = !clientFilters.bairro || (c.neighborhood && c.neighborhood.toLowerCase().includes(clientFilters.bairro.toLowerCase()));
      const cidadeMatch = !clientFilters.cidade || (c.city && c.city.toLowerCase().includes(clientFilters.cidade.toLowerCase()));
      const estadoMatch = !clientFilters.estado || (c.state && c.state.toUpperCase() === clientFilters.estado.toUpperCase());
      
      return termMatch && bairroMatch && cidadeMatch && estadoMatch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, clientFilters]);

  const filteredProductsForSelection = useMemo(() => {
    return sellableCatalog.filter(p => {
      const termMatch = !productFilters.term || p.name.toLowerCase().includes(productFilters.term.toLowerCase());
      const catMatch = productFilters.categoryId === 'all' || p.group_id === productFilters.categoryId;
      const volMatch = productFilters.volume === 'all' || String(p.capacity) === productFilters.volume;
      
      return termMatch && catMatch && volMatch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [sellableCatalog, productFilters]);

  // --- Modal Select Handlers ---
  const handleSelectClient = (client: any) => {
    setCurrentOrder(prev => ({ 
      ...prev, 
      client_id: client.id, 
      client_name: client.nome || client.name,
      price_table: (client.tabela_preco?.toLowerCase() as any) || prev?.price_table || 'varejo'
    }));
    setIsClientSearchOpen(false);
  };


  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-800 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 dark:border-slate-800 px-8 py-6 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-[#202eac]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Vendas e Pedidos</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Gestão comercial, logística e recebimentos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-[#202eac] text-white font-bold rounded-lg hover:bg-blue-800 transition-all shadow-md shadow-blue-200 active:scale-95 text-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Pedido
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div 
              onClick={() => setStatusFilter('todos')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px] ${statusFilter === 'todos' ? 'bg-[#202eac] border-[#202eac] text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-[#202eac]/30'}`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${statusFilter === 'todos' ? 'bg-white dark:bg-slate-900/20' : 'bg-blue-50 text-[#202eac]'}`}>
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className={`text-2xl font-black ${statusFilter === 'todos' ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{stats.total}</span>
              </div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'todos' ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>Total de Pedidos</p>
            </div>

            <div 
              onClick={() => setStatusFilter('producao')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px] ${statusFilter === 'producao' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-amber-300'}`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${statusFilter === 'producao' ? 'bg-white dark:bg-slate-900/20' : 'bg-amber-50 text-amber-600'}`}>
                  <PackageOpen className="w-5 h-5" />
                </div>
                <span className={`text-2xl font-black ${statusFilter === 'producao' ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{stats.waitingProduction}</span>
              </div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'producao' ? 'text-amber-50' : 'text-slate-500 dark:text-slate-400'}`}>Aguardando Produção</p>
            </div>

            <div 
              onClick={() => setStatusFilter('reproducao')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px] ${statusFilter === 'reproducao' ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-orange-300'}`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${statusFilter === 'reproducao' ? 'bg-white dark:bg-slate-900/20' : 'bg-orange-50 text-orange-600'}`}>
                  <Undo2 className="w-5 h-5" />
                </div>
                <span className={`text-2xl font-black ${statusFilter === 'reproducao' ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{stats.needsReproduction}</span>
              </div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'reproducao' ? 'text-orange-50' : 'text-slate-500 dark:text-slate-400'}`}>Refazer (Qualidade)</p>
            </div>

            <div 
              onClick={() => setStatusFilter('separacao')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px] ${statusFilter === 'separacao' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${statusFilter === 'separacao' ? 'bg-white dark:bg-slate-900/20' : 'bg-blue-50 text-blue-600'}`}>
                  <Package className="w-5 h-5" />
                </div>
                <span className={`text-2xl font-black ${statusFilter === 'separacao' ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{stats.waitingAction}</span>
              </div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'separacao' ? 'text-blue-50' : 'text-slate-500 dark:text-slate-400'}`}>Disponível p/ Separar</p>
            </div>

            <div 
              onClick={() => setStatusFilter('pendente_recebimento')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px] ${statusFilter === 'pendente_recebimento' ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-cyan-300'}`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${statusFilter === 'pendente_recebimento' ? 'bg-white dark:bg-slate-900/20' : 'bg-cyan-50 text-cyan-600'}`}>
                  <Clock className="w-5 h-5" />
                </div>
                <span className={`text-2xl font-black ${statusFilter === 'pendente_recebimento' ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{stats.pendingReceipt}</span>
              </div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'pendente_recebimento' ? 'text-cyan-50' : 'text-slate-500 dark:text-slate-400'}`}>Pendente Recebimento</p>
            </div>

            <div 
              className={`p-5 rounded-2xl border transition-all shadow-sm flex flex-col justify-between min-h-[110px] bg-emerald-50 border-emerald-100`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg bg-emerald-100 text-emerald-600`}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-xl font-black text-emerald-800 tracking-tighter">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue)}
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Faturamento (Mês)</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
            <div className="relative flex-1 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 ml-2" />
              <input
                type="text"
                placeholder="Buscar por número do pedido ou nome do cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-sm p-1 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-1 border-l border-slate-100 pl-3 mr-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-50 text-[#202eac] shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-50 text-[#202eac] shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Empty State / List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-20 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Nenhum pedido encontrado</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'todos' 
                  ? 'Não encontramos resultados para os filtros selecionados.' 
                  : 'Comece a vender agora mesmo criando seu primeiro pedido de venda.'}
              </p>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#202eac] text-white font-bold rounded-2xl hover:bg-blue-800 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Criar Pedido nº {orders.length + 1}
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map(order => (
                <div 
                  key={order.id} 
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all p-5 flex flex-col group cursor-pointer hover:border-[#202eac]/30"
                  onClick={() => handleOpenModal(order)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.number}</span>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[180px]" title={order.client_name}>{order.client_name}</h3>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border ${getStatusConfig(order.status).color}`}>
                      {getStatusConfig(order.status).icon}
                      {getStatusConfig(order.status).label.toUpperCase()}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Valor Total:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.final_value)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Entrega:</span>
                      <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 capitalize">
                        {order.delivery_method === 'entrega' ? <Truck className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {order.delivery_method}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">Data do Pedido</span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.status !== 'recebido' && order.status !== 'cancelado' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCancelOrder(order); }}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Cancelar Pedido"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order); }}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Excluir Pedido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-[#202eac] group-hover:text-white rounded-xl transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-4 px-6">Pedido</th>
                      <th className="py-4 px-6">Cliente</th>
                      <th className="py-4 px-6">Data</th>
                      <th className="py-4 px-6">Logística</th>
                      <th className="py-4 px-6 text-right">Valor Final</th>
                      <th className="py-4 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredOrders.map(order => (
                      <tr 
                        key={order.id} 
                        onClick={() => handleOpenModal(order)}
                        className="hover:bg-blue-50/20 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-6">
                          <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{order.number}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-[#202eac]" />
                            </div>
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm whitespace-nowrap">{order.client_name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{new Date(order.created_at).toLocaleDateString()}</span>
                            <span className="text-[10px] text-slate-400">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                           <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border ${order.delivery_method === 'entrega' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                             {order.delivery_method === 'entrega' ? <Truck className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                             {order.delivery_method.toUpperCase()}
                           </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="font-black text-slate-800 dark:text-slate-100">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.final_value)}</span>
                        </td>
                        <td className="py-4 px-6 relative">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border ${getStatusConfig(order.status).color}`}>
                            {getStatusConfig(order.status).icon}
                            {getStatusConfig(order.status).label}
                          </div>

                          {/* Action Buttons on Hover */}
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 bg-white dark:bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl z-10">
                            {/* Traceability Shortcut */}
                            {(order.status === 'producao' || order.status === 'reproducao') && setActiveMenu && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setActiveMenu('producao'); }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="Ver na Produção"
                              >
                                <Factory className="w-4 h-4" />
                              </button>
                            )}

                            <button 
                              onClick={(e) => { e.stopPropagation(); handlePrintSaleOrder(order); }}
                              className="p-2 text-slate-400 hover:text-[#202eac] hover:bg-blue-50 rounded-xl transition-all"
                              title="Imprimir Pedido"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            
                            <div className="w-px h-4 bg-slate-100 mx-1"></div>
                            
                            {(order.status === 'transito' || order.status === 'retirada') && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); /* Confirm Receipt */ }}
                                className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all flex items-center gap-2 pr-3"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-tight">Recebido</span>
                              </button>
                            )}

                            {(order.status === 'recebido' || order.status === 'transito' || order.status === 'retirada') && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleReturnOrder(order); }}
                                className="p-2 text-purple-500 hover:bg-purple-50 rounded-xl transition-all flex items-center gap-2 pr-3"
                              >
                                <Undo2 className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-tight">Devolver</span>
                              </button>
                            )}

                            {order.status !== 'recebido' && order.status !== 'cancelado' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleCancelOrder(order); }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2 pr-3"
                              >
                                <X className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-tight">Cancelar</span>
                              </button>
                            )}

                            <button 
                              onClick={(e) => { e.stopPropagation(); handleOpenModal(order); }}
                              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800 rounded-xl transition-all"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <div className="w-px h-4 bg-slate-100 mx-1"></div>

                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order); }}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}


        </div>
      </main>

      {/* Modal de Pedido */}
      {isModalOpen && currentOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-[#202eac]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{orders.find(o => o.id === currentOrder.id) ? 'Editar Pedido' : 'Novo Pedido de Venda'}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-[#202eac] bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{currentOrder.number}</span>
                    <span className="text-xs text-slate-400 font-medium">• {new Date(currentOrder.created_at || '').toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white dark:bg-slate-900 hover:text-red-500 rounded-xl transition-all text-slate-400 border border-transparent hover:border-slate-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-white dark:bg-slate-900 sticky top-0 px-8">
              <button 
                onClick={() => setActiveTab('geral')}
                className={`py-4 px-6 text-sm font-bold transition-all relative ${activeTab === 'geral' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600 dark:text-slate-300'}`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> Dados do Cliente
                </div>
                {activeTab === 'geral' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#202eac] rounded-t-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('itens')}
                className={`py-4 px-6 text-sm font-bold transition-all relative ${activeTab === 'itens' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600 dark:text-slate-300'}`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" /> Itens e Preços
                </div>
                {activeTab === 'itens' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#202eac] rounded-t-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('logistica')}
                className={`py-4 px-6 text-sm font-bold transition-all relative ${activeTab === 'logistica' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600 dark:text-slate-300'}`}
              >
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4" /> Logística e Notas
                </div>
                {activeTab === 'logistica' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#202eac] rounded-t-full" />}
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50 dark:bg-slate-800/20">
              {activeTab === 'geral' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   {currentOrder.status !== 'rascunho' && (
                     <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                       <Info className="w-5 h-5 text-[#202eac]" />
                       <p className="text-xs text-blue-700 font-medium">
                         Este pedido está em status <strong className="uppercase">{getStatusConfig(currentOrder.status).label}</strong>. 
                         A edição de dados críticos está bloqueada.
                       </p>
                     </div>
                   )}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente do Pedido *</label>
                        <div className="relative group">
                          <button 
                            type="button"
                            disabled={!isEditable}
                            onClick={() => setIsClientSearchOpen(true)}
                            className={`w-full h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 outline-none transition-all font-semibold shadow-sm flex items-center justify-between group ${isEditable ? 'hover:border-[#202eac]/50 focus:border-[#202eac] focus:ring-4 focus:ring-blue-50' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
                          >
                            <span className={currentOrder.client_name ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}>
                              {currentOrder.client_name || 'Pesquisar cliente...'}
                            </span>
                            <Search className="w-4 h-4 text-slate-400 group-hover:text-[#202eac]" />
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2 p-5 bg-white dark:bg-slate-900 border border-slate-100 rounded-[32px] shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-[#202eac]">
                           <MapPin className="w-5 h-5" />
                           <h3 className="text-sm font-black uppercase tracking-widest">Endereço de Entrega</h3>
                        </div>
                        
                        {currentOrder.client_id ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-2">
                             <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logradouro</span>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                  {clients.find(c => c.id === currentOrder.client_id)?.address || 'Não informado'}
                                  {clients.find(c => c.id === currentOrder.client_id)?.number ? `, ${clients.find(c => c.id === currentOrder.client_id)?.number}` : ''}
                                </p>
                             </div>
                             <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bairro</span>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{clients.find(c => c.id === currentOrder.client_id)?.neighborhood || 'Não informado'}</p>
                             </div>
                             <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Localidade</span>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                  {clients.find(c => c.id === currentOrder.client_id)?.city || 'Cidade'} / {clients.find(c => c.id === currentOrder.client_id)?.state || 'UF'}
                                </p>
                             </div>
                          </div>
                        ) : (
                          <div className="py-2 text-center text-slate-400 text-xs italic">
                            Selecione um cliente para visualizar o endereço cadastrado.
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tabela de Preços Aplicada</label>
                        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 shadow-sm">
                          {(['varejo', 'atacado', 'fardo'] as const).map((table) => (
                            <button
                              key={table}
                              type="button"
                              disabled={!isEditable}
                              onClick={() => {
                                const newItems = (currentOrder.items || []).map(item => {
                                  const catalogItem = sellableCatalog.find(c => c.id === item.finished_good_id);
                                  if (!catalogItem) return item;
                                  
                                  let newPrice = 0;
                                  if (table === 'varejo') newPrice = catalogItem.pricing.varejoPrice;
                                  else if (table === 'atacado') newPrice = catalogItem.pricing.atacadoPrice;
                                  else newPrice = catalogItem.pricing.fardoPrice;

                                  return { 
                                    ...item, 
                                    unit_price: newPrice, 
                                    subtotal: item.quantity * newPrice 
                                  };
                                });

                                const newTotal = newItems.reduce((acc, curr) => acc + curr.subtotal, 0);

                                setCurrentOrder(prev => ({ 
                                  ...prev, 
                                  price_table: table,
                                  items: newItems,
                                  total_value: newTotal,
                                  final_value: newTotal - (prev?.discount || 0)
                                }));

                                showToast('info', 'Tabela Atualizada', `Preços recalculados para ${table.toUpperCase()}`);
                              }}
                              className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                currentOrder.price_table === table 
                                  ? 'bg-[#202eac] text-white shadow-md' 
                                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800'
                              } ${!isEditable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {table}
                            </button>
                          ))}
                        </div>
                      </div>

                    {/* Industrial Traceability Panel (Shortcut to Production/Quality) */}
                    {linkedProductionOrder && setActiveMenu && (
                      <div className="md:col-span-2 p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] shadow-xl border border-white/10 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                          <Factory className="w-24 h-24 text-white" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-blue-500/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-blue-500/30">
                              <Zap className="w-7 h-7 text-blue-400 animate-pulse" />
                            </div>
                            <div>
                              <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                Rastreabilidade Industrial
                                <span className="bg-blue-500 text-[10px] px-2 py-0.5 rounded-full">ATIVO</span>
                              </h3>
                              <p className="text-slate-400 text-xs font-medium mt-1">
                                Lote vinculado: <span className="text-blue-300 font-bold">{linkedProductionOrder.batch_number}</span> • 
                                Status OF: <span className="text-blue-100 font-black uppercase italic ml-1">{linkedProductionOrder.status.replace('_', ' ')}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-auto">
                            {linkedProductionOrder.status === 'quality_check' || linkedProductionOrder.status === 'completed' ? (
                              <button 
                                onClick={() => setActiveMenu('qualidade')}
                                className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                              >
                                <ShieldCheck className="w-4 h-4" /> CQ / QUALIDADE
                              </button>
                            ) : (
                              <button 
                                onClick={() => setActiveMenu('producao')}
                                className="flex-1 md:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                              >
                                <Factory className="w-4 h-4" /> VER NA PRODUÇÃO
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                   </div>

                   <div className="p-6 bg-blue-50/30 rounded-3xl border border-blue-100/50 flex items-start gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-blue-100">
                        <AlertCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-blue-900">Vínculo de Dados Comercial</h4>
                        <p className="text-xs text-blue-700/70 leading-relaxed font-medium">
                          Ao selecionar o cliente, o sistema aplicará automaticamente a tabela de preços padrão associada a ele. Você poderá ajustar os valores manualmente na aba de itens se necessário.
                        </p>
                      </div>
                   </div>
                </div>
              )}
              {activeTab === 'itens' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          <th className="py-4 px-6 text-left">Produto</th>
                          <th className="py-4 px-6 w-32">Qtd</th>
                          <th className="py-4 px-6 w-40">Vlr Unt.</th>
                          <th className="py-4 px-6 w-40">Subtotal</th>
                          <th className="py-4 px-4 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(currentOrder.items || []).map((item, index) => (
                           <tr key={item.id} className="hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
                              <td className="py-4 px-6">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.name}</span>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">CÓD: {item.finished_good_id.slice(0,8)}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-center">
                                <input 
                                  type="number" 
                                  readOnly={!isEditable}
                                  className={`w-full h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center outline-none transition-all font-bold text-slate-700 dark:text-slate-200 ${isEditable ? 'focus:border-[#202eac] focus:ring-2 focus:ring-blue-50' : 'opacity-60 cursor-not-allowed'}`}
                                  value={item.quantity}
                                  min="1"
                                  onChange={(e) => {
                                    const qty = Math.max(1, Number(e.target.value));
                                    const newItems = [...(currentOrder.items || [])];
                                    newItems[index].quantity = qty;
                                    newItems[index].subtotal = qty * newItems[index].unit_price;
                                    const total = newItems.reduce((acc, curr) => acc + curr.subtotal, 0);
                                    setCurrentOrder(prev => ({ 
                                      ...prev, 
                                      items: newItems, 
                                      total_value: total, 
                                      final_value: total - (prev?.discount || 0) 
                                    }));
                                  }}
                                />
                              </td>
                              <td className="py-4 px-6 text-center">
                                <div className="relative group">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">R$</span>
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    readOnly={!isEditable}
                                    className={`w-full h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 text-right outline-none transition-all font-bold text-slate-600 dark:text-slate-300 ${isEditable ? 'focus:border-[#202eac]' : 'opacity-60 cursor-not-allowed'}`}
                                    value={item.unit_price}
                                    onChange={(e) => {
                                      const price = Number(e.target.value);
                                      const newItems = [...(currentOrder.items || [])];
                                      newItems[index].unit_price = price;
                                      newItems[index].subtotal = item.quantity * price;
                                      const total = newItems.reduce((acc, curr) => acc + curr.subtotal, 0);
                                      setCurrentOrder(prev => ({ 
                                        ...prev, 
                                        items: newItems, 
                                        total_value: total, 
                                        final_value: total - (prev?.discount || 0) 
                                      }));
                                    }}
                                  />
                                </div>
                              </td>
                              <td className="py-4 px-6 text-right font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.subtotal)}
                              </td>
                              <td className="py-4 px-4 text-center">
                                  {isEditable && (
                                    <button 
                                      onClick={() => {
                                        const newItems = (currentOrder.items || []).filter((_, i) => i !== index);
                                        const total = newItems.reduce((acc, curr) => acc + curr.subtotal, 0);
                                        setCurrentOrder(prev => ({ ...prev, items: newItems, total_value: total, final_value: total - (prev?.discount || 0) }));
                                      }}
                                      className="p-2 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                              </td>
                           </tr>
                        ))}
                        {(!currentOrder.items || currentOrder.items.length === 0) && (
                          <tr>
                            <td colSpan={5} className="py-16 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic bg-slate-50 dark:bg-slate-800/20">
                              <div className="flex flex-col items-center gap-3">
                                <Package className="w-8 h-8 opacity-20" />
                                Nenhum item no carrinho
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                    <div className="relative w-full md:w-80">
                      {currentOrder.status === 'rascunho' && (
                        <>
                          <button 
                            onClick={() => setIsProductSearchOpen(true)}
                            className="w-full h-12 bg-gradient-to-br from-[#202eac] to-[#4b5ce8] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!isEditable}
                          >
                            <Plus className="w-4 h-4" /> Buscar Produto (F10)
                          </button>
                     </>
                   )}
                    </div>

                    <div className="flex-1 max-w-sm w-full space-y-3">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bruto:</span>
                           <span className="text-sm font-bold text-slate-500 dark:text-slate-400 font-mono italic">
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentOrder.total_value || 0)}
                           </span>
                        </div>
                        <div className="flex items-center justify-between px-6 py-4 bg-[#202eac]/5 rounded-2xl border-2 border-dashed border-[#202eac]/20">
                           <span className="text-xs font-black text-[#202eac] uppercase tracking-widest">Valor Final</span>
                           <span className="text-3xl font-black text-[#202eac] tracking-tighter">
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentOrder.final_value || 0)}
                           </span>
                        </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'logistica' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Método de Logística *</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button 
                             type="button"
                             onClick={() => setCurrentOrder(prev => ({ ...prev, delivery_method: 'entrega' }))}
                             className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${currentOrder.delivery_method === 'entrega' ? 'bg-blue-50 border-[#202eac] text-[#202eac]' : 'bg-white dark:bg-slate-900 border-slate-100 text-slate-400 hover:border-slate-200 dark:border-slate-700'}`}
                           >
                             <div className={`p-3 rounded-2xl ${currentOrder.delivery_method === 'entrega' ? 'bg-[#202eac] text-white shadow-lg shadow-blue-200' : 'bg-slate-50 dark:bg-slate-800'}`}>
                               <Truck className="w-6 h-6" />
                             </div>
                             <span className="text-sm font-bold uppercase tracking-widest">Entrega</span>
                           </button>
                           <button 
                             type="button"
                             onClick={() => setCurrentOrder(prev => ({ ...prev, delivery_method: 'retirada' }))}
                             className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${currentOrder.delivery_method === 'retirada' ? 'bg-indigo-50 border-indigo-700 text-indigo-700' : 'bg-white dark:bg-slate-900 border-slate-100 text-slate-400 hover:border-slate-200 dark:border-slate-700'}`}
                           >
                             <div className={`p-3 rounded-2xl ${currentOrder.delivery_method === 'retirada' ? 'bg-indigo-700 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 dark:bg-slate-800'}`}>
                               <MapPin className="w-6 h-6" />
                             </div>
                             <span className="text-sm font-bold uppercase tracking-widest">Retirada</span>
                           </button>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Previsão de Entrega / Retirada</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input 
                            type="date" 
                            className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-100 rounded-3xl pl-12 pr-6 outline-none focus:border-[#202eac] transition-all font-bold text-slate-700 dark:text-slate-200 uppercase shadow-sm"
                            value={currentOrder.expected_delivery_date || ''}
                            onChange={(e) => setCurrentOrder(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                          />
                        </div>
                     </div>
                   </div>

                   <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notas Comerciais e Logísticas</label>
                      </div>
                      <textarea 
                        className="w-full h-32 bg-white dark:bg-slate-900 border border-slate-100 rounded-3xl p-6 outline-none focus:border-[#202eac] transition-all font-medium text-slate-700 dark:text-slate-200 custom-scrollbar uppercase text-xs shadow-sm"
                        placeholder="Ex: Deixar na portaria, cliente paga frete, etc..."
                        value={currentOrder.notes || ''}
                        onChange={(e) => setCurrentOrder(prev => ({ ...prev, notes: e.target.value }))}
                      />
                   </div>
                </div>
              )}

            </div>


            {/* Modal Footer */}
            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
               <button 
                 onClick={() => setIsModalOpen(false)}
                 className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-100 transition-all text-sm uppercase tracking-widest"
               >
                 Cancelar
               </button>

               <div className="flex items-center gap-3">
                 {currentOrder.status === 'rascunho' && (
                   <>
                    <button 
                      onClick={() => handleSaveOrder(currentOrder as SaleOrder)}
                      className="px-8 py-3 bg-white dark:bg-slate-900 border border-[#202eac]/30 text-[#202eac] font-bold rounded-2xl hover:bg-indigo-50 transition-all text-sm uppercase tracking-widest flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Salvar Rascunho
                    </button>
                     <button 
                       className="px-10 py-3 bg-[#202eac] text-white font-black rounded-2xl hover:bg-blue-800 transition-all text-sm uppercase tracking-[0.1em] shadow-xl shadow-blue-200 flex items-center gap-2"
                       onClick={() => {
                         if (!currentOrder.client_id || (currentOrder.items || []).length === 0) {
                           showToast('warning', 'Atenção', 'Selecione o cliente e adicione itens antes de confirmar.');
                           return;
                         }
                         checkStockAndConfirm(currentOrder as SaleOrder);
                       }}
                     >
                       <CheckCircle2 className="w-5 h-5" /> Confirmar Pedido
                     </button>
                   </>
                 )}

                 {currentOrder.status === 'separacao' && (
                   <button 
                     className="px-10 py-3 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all text-sm uppercase tracking-[0.1em] shadow-xl shadow-emerald-200 flex items-center gap-2"
                     onClick={() => handleFinishSeparation(currentOrder as SaleOrder)}
                   >
                     <Package className="w-5 h-5" /> Finalizar Separação
                   </button>
                 )}

                 {(currentOrder.status === 'transito' || currentOrder.status === 'retirada') && (
                   <button 
                     className="px-10 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all text-sm uppercase tracking-[0.1em] shadow-xl shadow-blue-200 flex items-center gap-2"
                     onClick={() => handleFinalizeDelivery(currentOrder as SaleOrder)}
                   >
                     <Truck className="w-5 h-5" /> Confirmar Entrega
                   </button>
                 )}

                 {currentOrder.status === 'producao' && (
                   <div className="px-6 py-3 bg-amber-50 border border-amber-200 text-amber-600 font-bold rounded-2xl animate-pulse text-xs uppercase tracking-widest flex items-center gap-2">
                     <History className="w-4 h-4" /> Produto em Produção
                   </div>
                 )}

                 {currentOrder.status === 'recebido' && (
                   <div className="px-6 py-3 bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2">
                     <CheckCircle2 className="w-4 h-4" /> Pedido Concluído
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}
        {/* Advanced Client Selection Modal */}
        {isClientSearchOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-5xl w-full h-[85vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
              {/* Header */}
              <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#202eac] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Selecionar Cliente</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Busca avançada por nome, documento e localização</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsClientSearchOpen(false)}
                  className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 rounded-2xl transition-all hover:rotate-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Filters Bar */}
              <div className="p-8 bg-white dark:bg-slate-900 border-b border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Nome ou CPF/CNPJ..."
                    className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl pl-12 pr-4 border border-transparent focus:border-[#202eac] focus:bg-white dark:bg-slate-900 outline-none transition-all text-sm font-semibold"
                    value={clientFilters.term}
                    onChange={e => setClientFilters(prev => ({ ...prev, term: e.target.value }))}
                  />
                </div>
                <input 
                  type="text" 
                  placeholder="Bairro..."
                  className="h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 border border-transparent focus:border-[#202eac] focus:bg-white dark:bg-slate-900 outline-none transition-all text-sm font-semibold"
                  value={clientFilters.bairro}
                  onChange={e => setClientFilters(prev => ({ ...prev, bairro: e.target.value }))}
                />
                <input 
                  type="text" 
                  placeholder="Cidade..."
                  className="h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 border border-transparent focus:border-[#202eac] focus:bg-white dark:bg-slate-900 outline-none transition-all text-sm font-semibold"
                  value={clientFilters.cidade}
                  onChange={e => setClientFilters(prev => ({ ...prev, cidade: e.target.value }))}
                />
                <select 
                  className="h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 border border-transparent focus:border-[#202eac] focus:bg-white dark:bg-slate-900 outline-none transition-all text-sm font-semibold"
                  value={clientFilters.estado}
                  onChange={e => setClientFilters(prev => ({ ...prev, estado: e.target.value }))}
                >
                  <option value="">UF (Todos)</option>
                  {Array.from(new Set(clients.map(c => c.state).filter(Boolean))).map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>

              {/* Results Table */}
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur-sm z-10 border-b border-slate-100">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-5 px-10">Cliente</th>
                      <th className="py-5 px-6">Documento</th>
                      <th className="py-5 px-6">Localização</th>
                      <th className="py-5 px-6">Última Compra</th>
                      <th className="py-5 px-10 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredClientsForSelection.map(client => (
                      <tr key={client.id} className="hover:bg-blue-50/50 transition-all group">
                        <td className="py-5 px-10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-[#202eac] font-black text-xs uppercase group-hover:bg-white dark:bg-slate-900 transition-colors">
                              {client.name.substring(0,2)}
                            </div>
                            <div className="font-bold text-slate-700 dark:text-slate-200 tracking-tight">{client.name}</div>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 font-mono tracking-tighter">
                          {client.cnpj_cpf || '---'}
                        </td>
                        <td className="py-5 px-6">
                          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
                            {client.neighborhood || 'Bairro ñ inf.'}<br/>
                            <span className="text-[10px] text-slate-400 font-medium uppercase">{client.city || 'Cidade'} / {client.state || 'UF'}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          {lastPurchaseMap[client.id] ? (
                            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(lastPurchaseMap[client.id]).toLocaleDateString('pt-BR')}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest italic">Primeira Venda</span>
                          )}
                        </td>
                        <td className="py-5 px-10 text-right">
                          <button 
                            onClick={() => handleSelectClient(client)}
                            className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[#202eac] text-[10px] font-black uppercase tracking-[0.15em] rounded-xl hover:bg-[#202eac] hover:text-white hover:border-[#202eac] transition-all shadow-sm active:scale-95"
                          >
                            Selecionar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredClientsForSelection.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-4 text-slate-300">
                            <Users className="w-12 h-12 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest">Nenhum cliente encontrado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Product Selection Modal */}
        {isProductSearchOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-6xl w-full h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
              {/* Header */}
              <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#202eac] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <PackageOpen className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Catálogo Comercial</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Produtos precificados disponíveis para venda</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsProductSearchOpen(false)}
                  className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 rounded-2xl transition-all hover:rotate-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Filters */}
                <div className="w-72 border-r border-slate-100 bg-slate-50 dark:bg-slate-800/30 p-8 space-y-8 flex flex-col">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Categorias</label>
                    <div className="space-y-1.5">
                      <button 
                        onClick={() => setProductFilters(prev => ({ ...prev, categoryId: 'all' }))}
                        className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left flex justify-between items-center ${productFilters.categoryId === 'all' ? 'bg-[#202eac] text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100'}`}
                      >
                        Todos
                        <ChevronRight className={`w-3 h-3 ${productFilters.categoryId === 'all' ? 'opacity-100' : 'opacity-0'}`} />
                      </button>
                      {categories.map(cat => (
                        <button 
                          key={cat.id}
                          onClick={() => setProductFilters(prev => ({ ...prev, categoryId: cat.id }))}
                          className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left flex justify-between items-center ${productFilters.categoryId === cat.id ? 'bg-[#202eac] text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100'}`}
                        >
                          {cat.name}
                          <ChevronRight className={`w-3 h-3 ${productFilters.categoryId === cat.id ? 'opacity-100' : 'opacity-0'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Volume / Embalagem</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['all', '0.5', '1', '2', '5', '20'].map(vol => (
                        <button 
                          key={vol}
                          onClick={() => setProductFilters(prev => ({ ...prev, volume: vol }))}
                          className={`py-2.5 rounded-xl text-[10px] font-black transition-all ${productFilters.volume === vol ? 'bg-[#202eac] text-white ring-2 ring-blue-100' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#202eac]'}`}
                        >
                          {vol === 'all' ? 'TODOS' : vol + 'L'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Grid content */}
                <div className="flex-1 overflow-auto p-10 custom-scrollbar bg-white dark:bg-slate-900">
                  <div className="mb-10 relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                      type="text" 
                      placeholder="Pesquisar por nome do produto..."
                      className="w-full h-16 bg-slate-50 dark:bg-slate-800 border border-slate-100 rounded-[30px] pl-16 pr-8 outline-none focus:border-[#202eac] focus:bg-white dark:bg-slate-900 transition-all text-lg font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 shadow-sm"
                      value={productFilters.term}
                      onChange={e => setProductFilters(prev => ({ ...prev, term: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProductsForSelection.map(product => (
                      <div 
                        key={product.id}
                        className={`group p-6 rounded-[35px] border transition-all flex flex-col gap-4 text-left relative overflow-hidden bg-white dark:bg-slate-900 ${modalSelections[product.id] ? 'border-[#202eac] ring-1 ring-[#202eac]/10 shadow-xl' : 'border-slate-100 hover:border-[#202eac] hover:shadow-2xl hover:shadow-indigo-500/10'}`}
                      >
                        {/* Status Badge e Ações rápidas */}
                        <div className="absolute top-0 right-0 p-3 flex gap-2">
                           {modalSelections[product.id] ? (
                             <div className="bg-[#202eac] text-white px-3 py-1 rounded-full text-[10px] font-black animate-in zoom-in duration-300">
                               {modalSelections[product.id]} Selecionado(s)
                             </div>
                           ) : (
                             <button 
                               onClick={() => handleSelectProduct(product)}
                               className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-300 hover:bg-[#202eac] hover:text-white transition-all active:scale-95"
                             >
                               <Plus className="w-5 h-5" />
                             </button>
                           )}
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-[#202eac] uppercase tracking-widest bg-blue-50 w-fit px-2 py-0.5 rounded-md">
                            {categories.find(c => c.id === product.group_id)?.name || 'Sem Categoria'}
                          </div>
                          <h4 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight group-hover:text-[#202eac] transition-colors">{product.name}</h4>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300">
                            {product.capacity}L
                          </div>
                          <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${product.stock_quantity > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {product.stock_quantity > 0 ? `Estoque: ${product.stock_quantity}` : 'Solicitar Produção'}
                          </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-50 flex items-end justify-between">
                           <div className="space-y-0.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Preço Unid ({currentOrder?.price_table})</span>
                              <div className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                  currentOrder?.price_table === 'atacado' ? (product.pricing?.atacadoPrice || 0) : 
                                  currentOrder?.price_table === 'fardo' ? (product.pricing?.fardoPrice || 0) : 
                                  (product.pricing?.varejoPrice || 0)
                                )}
                              </div>
                           </div>
                           
                           {/* Controles de Quantidade */}
                           {modalSelections[product.id] ? (
                             <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl animate-in slide-in-from-right-4 duration-300">
                               <button 
                                 onClick={() => handleUpdateModalQuantity(product.id, -1)}
                                 className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 text-slate-400 hover:text-red-500 flex items-center justify-center transition-all active:scale-90"
                               >
                                 <Minus className="w-4 h-4" />
                               </button>
                               <span className="w-8 text-center text-sm font-black text-slate-800 dark:text-slate-100">{modalSelections[product.id]}</span>
                               <button 
                                 onClick={() => handleUpdateModalQuantity(product.id, 1)}
                                 className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 text-slate-400 hover:text-[#202eac] flex items-center justify-center transition-all active:scale-90"
                               >
                                 <Plus className="w-4 h-4" />
                               </button>
                             </div>
                           ) : (
                             <button 
                               onClick={() => handleSelectProduct(product)}
                               className="px-5 py-2.5 bg-[#202eac]/5 text-[#202eac] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#202eac] hover:text-white transition-all active:scale-95"
                             >
                               Escolher
                             </button>
                           )}
                        </div>
                      </div>
                    ))}
                    {filteredProductsForSelection.length === 0 && (
                      <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 text-slate-300">
                        <PackageOpen className="w-12 h-12 opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest">Produto não encontrado no catálogo</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Barra de Resumo Inferior (Footer do Modal) */}
              {Object.keys(modalSelections).length > 0 && (
                <div className="px-10 py-6 border-t border-slate-100 bg-white dark:bg-slate-900 shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.1)] flex items-center justify-between animate-in slide-in-from-bottom-10 duration-500">
                   <div className="flex items-center gap-8">
                      <div className="flex -space-x-3 overflow-hidden">
                        {Object.keys(modalSelections).slice(0, 5).map(id => {
                          const p = sellableCatalog.find(prod => prod.id === id);
                          return (
                            <div key={id} className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border-4 border-white shadow-lg flex items-center justify-center text-[10px] font-black text-[#202eac]">
                              {p?.capacity}L
                            </div>
                          );
                        })}
                        {Object.keys(modalSelections).length > 5 && (
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center text-[10px] font-black text-slate-400">
                            +{Object.keys(modalSelections).length - 5}
                          </div>
                        )}
                      </div>
                      
                      <div className="h-10 w-px bg-slate-100" />

                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Parcial ({Object.values(modalSelections).reduce((a,b) => a+b, 0)} itens)</span>
                         <span className="text-2xl font-black text-[#202eac] tracking-tighter">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                              Object.keys(modalSelections).reduce((sum, id) => {
                                const p = sellableCatalog.find(prod => prod.id === id);
                                if (!p) return sum;
                                const price = currentOrder?.price_table === 'atacado' ? (p.pricing?.atacadoPrice || 0) : 
                                              currentOrder?.price_table === 'fardo' ? (p.pricing?.fardoPrice || 0) : 
                                              (p.pricing?.varejoPrice || 0);
                                return sum + (price * (modalSelections[id] || 0));
                              }, 0)
                            )}
                         </span>
                      </div>
                   </div>

                   <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setModalSelections({})}
                        className="px-6 py-4 text-slate-400 font-bold hover:text-red-500 transition-colors"
                      >
                        Limpar Seleção
                      </button>
                      <button 
                        onClick={handleBulkAddItems}
                        className="px-10 py-4 bg-gradient-to-r from-[#202eac] to-[#4b5ce8] text-white font-black text-sm uppercase tracking-widest rounded-[20px] shadow-2xl shadow-indigo-500/40 hover:scale-105 transition-all flex items-center gap-3 active:scale-95"
                      >
                         Adicionar ao Pedido <ArrowRight className="w-4 h-4" />
                      </button>
                   </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Confirmation Modal */}
        {confirmModal.isOpen && (
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            detail={confirmModal.detail}
            type={confirmModal.type}
            confirmLabel={confirmModal.confirmLabel}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          />
        )}
      </div>
    );
};

export default Vendas;
