import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Users, Package, Clock, CheckCircle2, AlertCircle, 
  X, Search, Plus, List, LayoutGrid, Trash2, Printer, Send, 
  Truck, ArrowRight, DollarSign, History, Filter, MoreHorizontal,
  ChevronRight, Calendar, User, MapPin, BadgeDollarSign, CreditCard,
  Edit2, PackageOpen, Undo2, Save, Info, FileText
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


export default function Vendas() {
  const { mode } = useStorageMode();
  const { showToast } = useToast();

  // ─── State ──────────────────────────────────────────────────
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<any[]>([]);
  const [formulas, setFormulas] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [pricingEntries, setPricingEntries] = useState<PricingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'todos' | SaleStatus | 'pendente_recebimento'>('todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'itens' | 'logistica'>('geral');
  const [currentOrder, setCurrentOrder] = useState<Partial<SaleOrder> | null>(null);
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
        const localClients = localStorage.getItem('local_clients');
        const localFG = localStorage.getItem('local_finished_goods');
        const localFormulas = localStorage.getItem('local_formulas');
        const localIngredients = localStorage.getItem('local_ingredients');
        const localPricing = localStorage.getItem('precificacao_entries');
        
        setOrders(localOrders ? JSON.parse(localOrders) : []);
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
    fetchData();
  }, [mode]);


  const sellableCatalog = useMemo(() => {
    return pricingEntries.filter(p => !p.notAvailable).map(pricing => {
      const formula = formulas.find(f => f.id === pricing.formulaId);
      const fg = finishedGoods.find(item => 
        item.formula_id === pricing.formulaId && 
        String(item.capacity) === String(pricing.capacityKey)
      );

      return {
        id: fg?.id || `new-${pricing.formulaId}-${pricing.capacityKey}`,
        formula_id: pricing.formulaId,
        name: formula?.name || 'Produto s/ Nome',
        capacity: pricing.capacityKey,
        stock_quantity: fg?.stock_quantity || 0,
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
      setCurrentOrder({
        id: generateId(),
        number: `PV-${new Date().getFullYear()}${(orders.length + 1).toString().padStart(4, '0')}`,
        status: 'rascunho',
        delivery_method: 'entrega',
        items: [],
        total_value: 0,
        discount: 0,
        final_value: 0,
        created_at: new Date().toISOString()
      });
    }
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

  const handleConfirmReceipt = (order: SaleOrder) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Recebimento',
      message: `Deseja confirmar que o cliente recebeu o pedido ${order.number}?`,
      detail: 'Isso finalizará o ciclo da venda e concretizará o faturamento.',
      type: 'success',
      confirmLabel: 'Sim, Confirmar',
      onConfirm: () => {
        const updatedOrder: SaleOrder = {
          ...order,
          status: 'recebido',
          confirmed_at: new Date().toISOString()
        };
        handleSaveOrder(updatedOrder);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
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

    // Determine price based on client profile
    let price = 0;
    switch (client.tabela_preco) {
      case 'varejo': price = catalogItem.pricing.varejoPrice; break;
      case 'atacado': price = catalogItem.pricing.atacadoPrice; break;
      case 'fardo': price = catalogItem.pricing.fardoPrice; break;
      default: price = catalogItem.pricing.varejoPrice;
    }

    const newItem: SaleOrderItem = {
      id: generateId(),
      finished_good_id: catalogItem.id, // ID real ou gerado para o catálogo
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


  const checkStockAndConfirm = (order: SaleOrder) => {
    let hasInsufficientStock = false;
    const missingItems: { item: SaleOrderItem; formula: any; catalogItem: any }[] = [];

    order.items.forEach(item => {
      const catalogItem = sellableCatalog.find(c => c.id === item.finished_good_id);
      const product = finishedGoods.find(fg => fg.id === item.finished_good_id);
      const stock = product ? (product.stock_quantity || 0) : 0;

      if (stock < item.quantity) {
        hasInsufficientStock = true;
        const formula = formulas.find(f => f.id === catalogItem?.formula_id);
        missingItems.push({ item, formula, catalogItem });
      }
    });

    if (hasInsufficientStock) {
      setConfirmModal({
        isOpen: true,
        title: 'Estoque Insuficiente - Iniciar Produção',
        message: 'Alguns itens não possuem estoque suficiente. O sistema gerará Ordens de Fabricação (OF) automaticamente no módulo de Produção.',
        detail: `Itens que serão produzidos: ${missingItems.map(m => m.item.name).join(', ')}.`,
        type: 'warning',
        confirmLabel: 'Confirmar e Abrir OFs',
        onConfirm: () => {
          // 1. Gerar as Ordens de Produção
          const existingPOsRaw = localStorage.getItem('local_production_orders');
          const existingPOs = existingPOsRaw ? JSON.parse(existingPOsRaw) : [];
          const newPOs: any[] = [];
          const generatedOFNumbers: string[] = [];

          missingItems.forEach(({ item, formula, catalogItem }) => {
            if (!formula) return;

            // Tentar localizar a embalagem correta baseada na capacidade
            const cap = Number(catalogItem?.capacity || 0);
            const matchingPkg = ingredients.filter(ing => !ing.produto_quimico).find(ing => {
              const match = ing.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT)/i);
              if (match) {
                let ingCap = parseFloat(match[1].replace(',', '.'));
                if (match[2].toLowerCase() === 'ml') ingCap /= 1000;
                return Math.abs(ingCap - cap) < 0.01;
              }
              return false;
            });

            const ofId = generateId();
            const batchNum = `OF-${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
            
            const newPO = {
              id: ofId,
              formula_id: formula.id,
              batch_number: batchNum,
              planned_volume: item.quantity * cap,
              status: 'planned',
              created_at: new Date().toISOString(),
              formulaSnapshot: formula, // Snapshot da versão atual conforme solicitado
              packagingPlan: matchingPkg ? [
                {
                  packagingId: matchingPkg.id,
                  variantId: null,
                  name: matchingPkg.name,
                  capacity: cap,
                  quantity: item.quantity,
                  cost: matchingPkg.cost_per_unit || 0,
                  unit: matchingPkg.unit || 'UNI'
                }
              ] : [],
              notes: `Gerada automaticamente pelo Pedido de Venda ${order.number}`
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
      // Se tiver estoque, prossegue normal
      const updatedOrder: SaleOrder = { ...order, status: 'separacao' };
      const updatedFG = [...finishedGoods].map(fg => {
        const item = order.items.find(i => i.finished_good_id === fg.id);
        if (item) return { ...fg, stock_quantity: (fg.stock_quantity || 0) - item.quantity };
        return fg;
      });

      localStorage.setItem('local_finished_goods', JSON.stringify(updatedFG));
      setFinishedGoods(updatedFG);
      handleSaveOrder(updatedOrder);
      setIsModalOpen(false);
      showToast('success', 'Pedido Confirmado', 'Estoque reservado e pedido enviado para SEPARAÇÃO.');
    }
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



  const getStatusConfig = (status: SaleStatus) => {
    switch (status) {
      case 'rascunho': return { label: 'Rascunho', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Edit2 className="w-3 h-3" /> };
      case 'producao': return { label: 'Aguardando Produção', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <PackageOpen className="w-3 h-3" /> };
      case 'separacao': return { label: 'Em Separação', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Package className="w-3 h-3" /> };
      case 'retirada': return { label: 'Pronto p/ Retirada', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <User className="w-3 h-3" /> };
      case 'transito': return { label: 'Em Trânsito', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: <Truck className="w-3 h-3" /> };
      case 'recebido': return { label: 'Concluído', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> };
      case 'devolvido': return { label: 'Quarentena/Devolvido', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Undo2 className="w-3 h-3" /> };
      case 'cancelado': return { label: 'Cancelado', color: 'bg-red-50 text-red-700 border-red-200', icon: <X className="w-3 h-3" /> };
      default: return { label: status, color: 'bg-slate-100 text-slate-500', icon: <AlertCircle className="w-3 h-3" /> };
    }
  };

  // ─── Render ─────────────────────────────────────────────────


  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-[#202eac]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Vendas e Pedidos</h1>
              <p className="text-sm text-slate-500">Gestão comercial, logística e recebimentos</p>
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

      <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div 
              onClick={() => setStatusFilter('todos')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px] ${statusFilter === 'todos' ? 'bg-[#202eac] border-[#202eac] text-white' : 'bg-white border-slate-200 hover:border-[#202eac]/30'}`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${statusFilter === 'todos' ? 'bg-white/20' : 'bg-blue-50 text-[#202eac]'}`}>
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className={`text-2xl font-black ${statusFilter === 'todos' ? 'text-white' : 'text-slate-800'}`}>{stats.total}</span>
              </div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'todos' ? 'text-blue-100' : 'text-slate-500'}`}>Total de Pedidos</p>
            </div>

            <div 
              onClick={() => setStatusFilter('producao')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px] ${statusFilter === 'producao' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-200 hover:border-amber-300'}`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${statusFilter === 'producao' ? 'bg-white/20' : 'bg-amber-50 text-amber-600'}`}>
                  <PackageOpen className="w-5 h-5" />
                </div>
                <span className={`text-2xl font-black ${statusFilter === 'producao' ? 'text-white' : 'text-slate-800'}`}>{stats.waitingProduction}</span>
              </div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'producao' ? 'text-amber-50' : 'text-slate-500'}`}>Aguardando Produção</p>
            </div>

            <div 
              onClick={() => setStatusFilter('separacao')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px] ${statusFilter === 'separacao' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 hover:border-blue-300'}`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${statusFilter === 'separacao' ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
                  <Package className="w-5 h-5" />
                </div>
                <span className={`text-2xl font-black ${statusFilter === 'separacao' ? 'text-white' : 'text-slate-800'}`}>{stats.waitingAction}</span>
              </div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'separacao' ? 'text-blue-50' : 'text-slate-500'}`}>Disponível p/ Separar</p>
            </div>

            <div 
              onClick={() => setStatusFilter('pendente_recebimento')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px] ${statusFilter === 'pendente_recebimento' ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-slate-200 hover:border-cyan-300'}`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${statusFilter === 'pendente_recebimento' ? 'bg-white/20' : 'bg-cyan-50 text-cyan-600'}`}>
                  <Clock className="w-5 h-5" />
                </div>
                <span className={`text-2xl font-black ${statusFilter === 'pendente_recebimento' ? 'text-white' : 'text-slate-800'}`}>{stats.pendingReceipt}</span>
              </div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'pendente_recebimento' ? 'text-cyan-50' : 'text-slate-500'}`}>Pendente Recebimento</p>
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
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
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
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-50 text-[#202eac] shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-50 text-[#202eac] shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Empty State / List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhum pedido encontrado</h3>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto">
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
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col group cursor-pointer hover:border-[#202eac]/30"
                  onClick={() => handleOpenModal(order)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.number}</span>
                      <h3 className="font-bold text-slate-800 truncate max-w-[180px]" title={order.client_name}>{order.client_name}</h3>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border ${getStatusConfig(order.status).color}`}>
                      {getStatusConfig(order.status).icon}
                      {getStatusConfig(order.status).label.toUpperCase()}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Valor Total:</span>
                      <span className="font-bold text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.final_value)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Entrega:</span>
                      <span className="flex items-center gap-1 font-medium text-slate-600 capitalize">
                        {order.delivery_method === 'entrega' ? <Truck className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {order.delivery_method}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">Data do Pedido</span>
                      <span className="text-xs font-semibold text-slate-600">{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    <button className="p-2 bg-slate-50 text-slate-400 group-hover:bg-[#202eac] group-hover:text-white rounded-xl transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                          <span className="font-mono text-xs font-bold text-slate-500">{order.number}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-[#202eac]" />
                            </div>
                            <span className="font-bold text-slate-800 text-sm whitespace-nowrap">{order.client_name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{new Date(order.created_at).toLocaleDateString()}</span>
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
                          <span className="font-black text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.final_value)}</span>
                        </td>
                        <td className="py-4 px-6 relative">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border ${getStatusConfig(order.status).color}`}>
                            {getStatusConfig(order.status).icon}
                            {getStatusConfig(order.status).label}
                          </div>

                          {/* Action Buttons on Hover */}
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-xl z-10">
                            <button 
                              onClick={(e) => { e.stopPropagation(); /* Print Logic */ }}
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

                            {order.status === 'rascunho' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); /* Cancel Logic */ }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2 pr-3"
                              >
                                <X className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-tight">Cancelar</span>
                              </button>
                            )}

                            <button 
                              onClick={(e) => { e.stopPropagation(); handleOpenModal(order); }}
                              className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
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
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-[#202eac]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">{orders.find(o => o.id === currentOrder.id) ? 'Editar Pedido' : 'Novo Pedido de Venda'}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-[#202eac] bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{currentOrder.number}</span>
                    <span className="text-xs text-slate-400 font-medium">• {new Date(currentOrder.created_at || '').toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white hover:text-red-500 rounded-xl transition-all text-slate-400 border border-transparent hover:border-slate-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-white sticky top-0 px-8">
              <button 
                onClick={() => setActiveTab('geral')}
                className={`py-4 px-6 text-sm font-bold transition-all relative ${activeTab === 'geral' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> Dados do Cliente
                </div>
                {activeTab === 'geral' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#202eac] rounded-t-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('itens')}
                className={`py-4 px-6 text-sm font-bold transition-all relative ${activeTab === 'itens' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" /> Itens e Preços
                </div>
                {activeTab === 'itens' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#202eac] rounded-t-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('logistica')}
                className={`py-4 px-6 text-sm font-bold transition-all relative ${activeTab === 'logistica' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4" /> Logística e Notas
                </div>
                {activeTab === 'logistica' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#202eac] rounded-t-full" />}
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/20">
              {activeTab === 'geral' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente do Pedido *</label>
                        <select 
                          className="w-full h-12 bg-white border border-slate-200 rounded-2xl px-4 outline-none focus:border-[#202eac] focus:ring-4 focus:ring-blue-50 transition-all font-semibold text-slate-700 shadow-sm"
                          value={currentOrder.client_id || ''}
                          onChange={(e) => {
                            const client = clients.find(c => c.id === e.target.value);
                            setCurrentOrder(prev => ({ 
                              ...prev, 
                              client_id: e.target.value, 
                              client_name: client?.name || '' 
                            }));
                          }}
                        >
                          <option value="">Selecione um cliente...</option>
                          {clients.sort((a,b) => a.name.localeCompare(b.name)).map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Perfil de Preço Recomendado</label>
                        <div className="h-12 bg-white border border-slate-100 rounded-2xl px-4 flex items-center gap-2 shadow-sm border-dashed">
                          <BadgeDollarSign className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-bold text-slate-700 uppercase">
                            {clients.find(c => c.id === currentOrder.client_id)?.tabela_preco || 'DEFINA O CLIENTE'}
                          </span>
                        </div>
                      </div>
                   </div>

                   <div className="p-6 bg-blue-50/30 rounded-3xl border border-blue-100/50 flex items-start gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-blue-100">
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
                  <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          <th className="py-4 px-6 text-left">Produto</th>
                          <th className="py-4 px-6 w-32">Qtd</th>
                          <th className="py-4 px-6 w-40">Vlr Unt.</th>
                          <th className="py-4 px-6 w-40">Subtotal</th>
                          <th className="py-4 px-4 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(currentOrder.items || []).map((item, index) => (
                           <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-6">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-800">{item.name}</span>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">CÓD: {item.finished_good_id.slice(0,8)}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-center">
                                <input 
                                  type="number" 
                                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl text-center outline-none focus:border-[#202eac] focus:ring-2 focus:ring-blue-50 transition-all font-bold text-slate-700"
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
                                    className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 text-right outline-none focus:border-[#202eac] transition-all font-bold text-slate-600"
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
                              <td className="py-4 px-6 text-right font-black text-slate-800 tracking-tighter">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.subtotal)}
                              </td>
                              <td className="py-4 px-4 text-center">
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
                              </td>
                           </tr>
                        ))}
                        {(!currentOrder.items || currentOrder.items.length === 0) && (
                          <tr>
                            <td colSpan={5} className="py-16 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic bg-slate-50/20">
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
                      <button 
                        onClick={() => setShowItemSelector(!showItemSelector)}
                        className="w-full h-12 bg-white border border-[#202eac]/20 text-[#202eac] rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <Plus className="w-4 h-4" /> Adicionar Produto
                      </button>

                      {showItemSelector && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 p-2 custom-scrollbar">
                          {sellableCatalog.length === 0 ? (
                            <div className="p-4 text-center text-xs font-bold text-slate-400">Nenhum produto precificado</div>
                          ) : (
                            sellableCatalog.map(item => (
                              <button 
                                key={item.id}
                                onClick={() => handleAddItem(item.id)}
                                className="w-full flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl transition-all text-left group"
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-700">{item.name} {item.capacity}L</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${item.stock_quantity > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                      Estoque: {item.stock_quantity} UNI
                                    </span>
                                    {!item.existsInInventory && (
                                      <span className="text-[10px] text-slate-400 italic">(Novo no Catálogo)</span>
                                    )}
                                  </div>
                                </div>
                                <Plus className="w-4 h-4 text-slate-300 group-hover:text-[#202eac] transition-colors" />
                              </button>
                            ))
                          )}
                        </div>
                      )}

                    </div>

                    <div className="flex-1 max-w-sm w-full space-y-3">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bruto:</span>
                           <span className="text-sm font-bold text-slate-500 font-mono italic">
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
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Método de Logística *</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button 
                             type="button"
                             onClick={() => setCurrentOrder(prev => ({ ...prev, delivery_method: 'entrega' }))}
                             className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${currentOrder.delivery_method === 'entrega' ? 'bg-blue-50 border-[#202eac] text-[#202eac]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                           >
                             <div className={`p-3 rounded-2xl ${currentOrder.delivery_method === 'entrega' ? 'bg-[#202eac] text-white shadow-lg shadow-blue-200' : 'bg-slate-50'}`}>
                               <Truck className="w-6 h-6" />
                             </div>
                             <span className="text-sm font-bold uppercase tracking-widest">Entrega</span>
                           </button>
                           <button 
                             type="button"
                             onClick={() => setCurrentOrder(prev => ({ ...prev, delivery_method: 'retirada' }))}
                             className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${currentOrder.delivery_method === 'retirada' ? 'bg-indigo-50 border-indigo-700 text-indigo-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                           >
                             <div className={`p-3 rounded-2xl ${currentOrder.delivery_method === 'retirada' ? 'bg-indigo-700 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50'}`}>
                               <MapPin className="w-6 h-6" />
                             </div>
                             <span className="text-sm font-bold uppercase tracking-widest">Retirada</span>
                           </button>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Previsão de Entrega / Retirada</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input 
                            type="date" 
                            className="w-full h-14 bg-white border border-slate-100 rounded-3xl pl-12 pr-6 outline-none focus:border-[#202eac] transition-all font-bold text-slate-700 uppercase shadow-sm"
                            value={currentOrder.expected_delivery_date || ''}
                            onChange={(e) => setCurrentOrder(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                          />
                        </div>
                     </div>
                   </div>

                   <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notas Comerciais e Logísticas</label>
                      </div>
                      <textarea 
                        className="w-full h-32 bg-white border border-slate-100 rounded-3xl p-6 outline-none focus:border-[#202eac] transition-all font-medium text-slate-700 custom-scrollbar uppercase text-xs shadow-sm"
                        placeholder="Ex: Deixar na portaria, cliente paga frete, etc..."
                        value={currentOrder.notes || ''}
                        onChange={(e) => setCurrentOrder(prev => ({ ...prev, notes: e.target.value }))}
                      />
                   </div>
                </div>
              )}

            </div>


            {/* Modal Footer */}
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
               <button 
                 onClick={() => setIsModalOpen(false)}
                 className="px-6 py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition-all text-sm uppercase tracking-widest"
               >
                 Cancelar
               </button>

               <div className="flex items-center gap-3">
                 <button 
                   onClick={() => handleSaveOrder(currentOrder as SaleOrder)}
                   className="px-8 py-3 bg-white border border-[#202eac]/30 text-[#202eac] font-bold rounded-2xl hover:bg-indigo-50 transition-all text-sm uppercase tracking-widest flex items-center gap-2"
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

               </div>
            </div>
          </div>
        </div>
      )}


      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmLabel={confirmModal.confirmLabel}
      />
    </div>
  );
}
