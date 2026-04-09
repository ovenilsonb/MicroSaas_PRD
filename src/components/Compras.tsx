import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Plus, Search, Calendar, Package, DollarSign, ArrowRight, AlertTriangle, CheckCircle2, XCircle, Clock, Save, FileText, TrendingDown, LayoutGrid, List, X, Trash2, Printer, Send } from 'lucide-react';
import { useStorageMode } from '../contexts/StorageModeContext';
import { generateId } from '../lib/id';
import { useToast } from './dashboard/Toast';
import { ConfirmModal, ConfirmModalType } from './shared/ConfirmModal';
import { useInsumosData } from './InsumosComponents/useInsumosData';

type POStatus = 'rascunho' | 'enviado' | 'recebido' | 'cancelado';

interface PurchaseOrderItem {
  ingredient_id: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  ingredient_name?: string;
  unit?: string;
}

interface PurchaseOrder {
  id: string;
  number: string;
  supplier_id: string;
  supplier_name?: string;
  status: POStatus;
  items: PurchaseOrderItem[];
  total_value: number;
  created_at: string;
  expected_date?: string;
  notes?: string;
}

import { useCompanySettings } from '../hooks/useCompanySettings';

export default function Compras() {
  const { mode } = useStorageMode();
  const { showToast } = useToast();
  const { settings } = useCompanySettings();
  const { ingredients, suppliers, addStockMovement } = useInsumosData();

  const [activeTab, setActiveTab] = useState<'ordens' | 'sugestoes'>('ordens');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [statusFilter, setStatusFilter] = useState<'todos' | POStatus | 'atrasado'>('todos');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Partial<PurchaseOrder> | null>(null);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; type: ConfirmModalType; confirmLabel?: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {} });

  // Load orders
  const fetchOrders = () => {
    try {
      const localData = JSON.parse(localStorage.getItem('local_purchase_orders') || '[]');
      setOrders(localData);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [mode]);

  // Compute Suggestions
  const suggestions = useMemo(() => {
    const list: { supplierId: string, supplierName: string, items: { ingredient: any, deficit: number }[] }[] = [];
    
    ingredients.forEach(ing => {
      const min = ing.estoque_minimo || 0;
      const current = ing.estoque_atual || 0;
      
      if (current <= min) {
        let supplierId = 'unknown';
        let supplierName = 'Fornecedor Não Definido';
        
        let supplierMatched = suppliers.find(s => s.name === ing.fornecedor || s.id === (ing as any).supplier_id);
        if (supplierMatched) {
          supplierId = supplierMatched.id;
          supplierName = supplierMatched.name;
        } else if (ing.fornecedor) {
          supplierName = String(ing.fornecedor);
        }

        let group = list.find(g => g.supplierId === supplierId && g.supplierName === supplierName);
        if (!group) {
          group = { supplierId, supplierName, items: [] };
          list.push(group);
        }
        
        const deficit = min * 2 - current;
        group.items.push({ ingredient: ing, deficit: deficit > 0 ? deficit : min });
      }
    });

    return list.sort((a, b) => b.items.length - a.items.length);
  }, [ingredients, suppliers]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Text search
      const matchesSearch = o.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (o.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === 'todos') return true;
      if (statusFilter === 'atrasado') {
        return o.status === 'enviado' && o.expected_date && new Date(o.expected_date) < new Date();
      }
      return o.status === statusFilter;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, searchTerm, statusFilter]);

  // Estatísticas para os Cards
  const stats = useMemo(() => {
    const activeOrders = orders.filter(o => o.status === 'rascunho' || o.status === 'enviado');
    const today = new Date();
    return {
      total: orders.length,
      waiting: orders.filter(o => o.status === 'enviado').length,
      overdue: orders.filter(o => o.status === 'enviado' && o.expected_date && new Date(o.expected_date) < today).length,
      received: orders.filter(o => o.status === 'recebido').length,
      investment: activeOrders.reduce((acc, curr) => acc + curr.total_value, 0),
      critical: suggestions.length,
      cancelled: orders.filter(o => o.status === 'cancelado').length
    };
  }, [orders, suggestions]);

  // Actions
  const handleSaveOrder = (orderToSave: PurchaseOrder) => {
    try {
      if (!orderToSave.supplier_id) {
        showToast('warning', 'Atenção', 'Selecione um fornecedor.');
        return;
      }

      // Filter out items without ingredient
      const validItems = orderToSave.items.filter(i => i.ingredient_id && i.quantity > 0);
      if (validItems.length === 0) {
        showToast('warning', 'Atenção', 'Adicione pelo menos um insumo válido.');
        return;
      }

      const finalOrder = { ...orderToSave, items: validItems };
      const isExisting = orders.some(o => o.id === finalOrder.id);
      const updatedOrders = isExisting 
        ? orders.map(o => o.id === finalOrder.id ? finalOrder : o)
        : [...orders, finalOrder];

      localStorage.setItem('local_purchase_orders', JSON.stringify(updatedOrders));
      setOrders(updatedOrders);
      setIsModalOpen(false);
      showToast('success', 'Sucesso', 'Ordem de Compra salva com sucesso.');
    } catch (err) {
      showToast('error', 'Erro', 'Não foi possível salvar a ordem.');
    }
  };

  const handleCreateNew = () => {
    setCurrentOrder({
      id: generateId(),
      number: `OC-${new Date().getTime().toString().slice(-6)}`,
      status: 'rascunho',
      created_at: new Date().toISOString(),
      items: [],
      total_value: 0
    });
    setIsModalOpen(true);
  };

  const handleEdit = (order: PurchaseOrder) => {
    setCurrentOrder(order);
    setIsModalOpen(true);
  };

  const handleCreateFromSuggestion = (group: any) => {
    const newOrder: PurchaseOrder = {
      id: generateId(),
      number: `OC-${new Date().getTime().toString().slice(-6)}`,
      supplier_id: group.supplierId,
      supplier_name: group.supplierName,
      status: 'rascunho',
      created_at: new Date().toISOString(),
      items: group.items.map((item: any) => ({
        ingredient_id: item.ingredient.id,
        ingredient_name: item.ingredient.name,
        quantity: item.deficit,
        unit_price: Number(item.ingredient.preco_custo || 0),
        unit: item.ingredient.unit
      })),
      total_value: group.items.reduce((acc: number, item: any) => acc + (item.deficit * Number(item.ingredient.preco_custo || 0)), 0)
    };
    setCurrentOrder(newOrder);
    setIsModalOpen(true);
  };

  const updateOrderStatus = (id: string, status: POStatus) => {
    if (status === 'recebido') {
      const order = orders.find(o => o.id === id);
      if (!order) return;
      setConfirmModal({
        isOpen: true,
        title: 'Confirmar Recebimento',
        message: `Ao confirmar, os itens da ${order.number} serão registrados como ENTRADA no estoque de cada insumo. Deseja continuar?`,
        type: 'warning',
        confirmLabel: 'Confirmar Recebimento',
        onConfirm: async () => {
          for (const item of order.items) {
            if (item.ingredient_id && item.quantity > 0) {
              await addStockMovement({
                ingredient_id: item.ingredient_id,
                variant_id: item.variant_id || undefined,
                type: 'entrada',
                quantity: item.quantity,
                date: new Date().toISOString(),
                note: `Entrada via ${order.number}`,
                reference_id: order.number,
              });
            }
          }
          const updatedOrders = orders.map(o => o.id === id ? { ...o, status: 'recebido' as POStatus } : o);
          localStorage.setItem('local_purchase_orders', JSON.stringify(updatedOrders));
          setOrders(updatedOrders);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          showToast('success', 'Recebido', `Estoque atualizado com os itens da ${order.number}.`);
        }
      });
      return;
    }
    const updatedOrders = orders.map(o => o.id === id ? { ...o, status } : o);
    localStorage.setItem('local_purchase_orders', JSON.stringify(updatedOrders));
    setOrders(updatedOrders);
    showToast('info', 'Status Atualizado', `A ordem foi marcada como ${status}.`);
  };

  const handleAddRow = () => {
    if (!currentOrder) return;
    const newItems = [...(currentOrder.items || [])];
    newItems.push({ ingredient_id: '', quantity: 1, unit_price: 0 });
    setCurrentOrder({ ...currentOrder, items: newItems });
  };

  const handleRemoveRow = (index: number) => {
    if (!currentOrder) return;
    const newItems = [...(currentOrder.items || [])];
    newItems.splice(index, 1);
    const newTotal = newItems.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
    setCurrentOrder({ ...currentOrder, items: newItems, total_value: newTotal });
  };

  const handleIngredientChange = (index: number, ingredientId: string) => {
    if (!currentOrder) return;
    const ingredient = ingredients.find(ing => ing.id === ingredientId);
    if (!ingredient) return;

    const newItems = [...(currentOrder.items || [])];
    newItems[index] = {
      ...newItems[index],
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.name,
      unit: ingredient.unit,
      unit_price: Number(ingredient.cost_per_unit || 0),
      variant_id: undefined,
      variant_name: undefined,
    };
    const newTotal = newItems.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
    setCurrentOrder({ ...currentOrder, items: newItems, total_value: newTotal });
  };

  const handleVariantChange = (index: number, variantId: string) => {
    if (!currentOrder) return;
    const item = currentOrder.items?.[index];
    if (!item) return;
    const ingredient = ingredients.find(ing => ing.id === item.ingredient_id);
    if (!ingredient) return;
    const variant = ingredient.variants?.find(v => v.id === variantId);

    const newItems = [...(currentOrder.items || [])];
    if (variant) {
      newItems[index] = {
        ...newItems[index],
        variant_id: variant.id,
        variant_name: variant.name,
        unit_price: Number(variant.cost_per_unit || item.unit_price || 0),
      };
    } else {
      newItems[index] = { ...newItems[index], variant_id: undefined, variant_name: undefined, unit_price: Number(ingredient.cost_per_unit || 0) };
    }
    const newTotal = newItems.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
    setCurrentOrder({ ...currentOrder, items: newItems, total_value: newTotal });
  };

  const getIngredientVariants = (ingredientId: string) => {
    const ing = ingredients.find(i => i.id === ingredientId);
    if (ing && ing.tem_variantes && ing.variants && ing.variants.length > 0) return ing.variants;
    return [];
  };

  const handlePrintOrder = (order: PurchaseOrder) => {
    const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDT = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

    const cssStyles = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@400;700;900&family=Roboto:wght@400;700;900&family=Playfair+Display:wght@400;700;900&family=Open+Sans:wght@400;700;800&family=Lato:wght@400;700;900&family=Poppins:wght@400;700;900&family=Outfit:wght@400;700;900&display=swap');
      @page { margin: 15mm; size: auto; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', sans-serif; color: #0f172a; font-size: 11px; line-height: 1.6; }
      .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 16px; page-break-inside:avoid; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f1f5f9; font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align:left; }
      td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .font-bold { font-weight: 700; }
      .text-primary { color: ${settings.primaryColor || '#202eac'}; }
      .report-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; }
      .logo-container { display: flex; align-items: center; gap: 15px; }
      .logo-img { height: 60px; object-fit: contain; }
      .company-name { font-family: '${settings.headerFont}', sans-serif !important; font-size: 20px; font-weight: 900; color: #0f172a; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
      .data-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
      .data-label { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
      .data-value { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 4px; }
      .signature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 60px; margin-top: 60px; page-break-inside: avoid; }
      .signature-box { border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 10px; font-weight: 700; color: #64748b; }
      .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; font-weight: 900; color: rgba(32,46,172,0.03); z-index: -1; pointer-events: none; }
      .footer { position: fixed; bottom: 10mm; left: 0; right: 0; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; }
      .total-box { background: ${settings.primaryColor || '#202eac'}; color: white; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
      .total-box .label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; }
      .total-box .value { font-size: 20px; font-weight: 900; }
    `;

    const html = `<!DOCTYPE html><html><head><title>OC - ${order.number}</title><style>${cssStyles}</style></head><body>
      <div class="watermark">ORDEM DE COMPRA</div>
      <div class="report-header">
        <div class="logo-container">
          ${settings.logo 
            ? `<img src="${settings.logo}" class="logo-img" />`
            : `<div style="width:50px; height:50px; background:${settings.primaryColor || '#202eac'}; border-radius:12px; display:flex; align-items:center; justify-content:center; color:white; font-weight:900; font-size:20px;">${settings.name.substring(0, 2).toUpperCase()}</div>`
          }
          <div>
            <div class="company-name">${settings.name}</div>
            <div style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
              ${settings.document ? `CNPJ: ${settings.document} | ` : ''} ${settings.address || 'Gestão de Suprimentos'}
            </div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;font-weight:800;color:${settings.primaryColor || '#202eac'};text-transform:uppercase;">Ordem de Compra</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;">${order.number}</div>
          <div style="font-size:9px;color:#94a3b8;margin-top:4px;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>

      <div class="grid-4" style="margin-bottom:20px;">
        <div class="data-item"><span class="data-label">Nº Pedido</span><div class="data-value text-primary">${order.number}</div></div>
        <div class="data-item"><span class="data-label">Fornecedor</span><div class="data-value">${(order.supplier_name || 'Não informado').toUpperCase()}</div></div>
        <div class="data-item"><span class="data-label">Emissão</span><div class="data-value">${fmtDT(order.created_at)}</div></div>
        <div class="data-item"><span class="data-label">Prev. Entrega</span><div class="data-value">${order.expected_date ? new Date(order.expected_date).toLocaleDateString('pt-BR') : 'A definir'}</div></div>
      </div>

      <div class="grid-2" style="margin-bottom:20px;">
        <div class="data-item"><span class="data-label">Status da Ordem</span><div class="data-value" style="text-transform:uppercase;">${order.status}</div></div>
        <div class="data-item"><span class="data-label">Total de Itens</span><div class="data-value">${order.items.length} insumos solicitados</div></div>
      </div>

      <div class="card">
        <div style="font-size:11px;font-weight:800;color:#475569;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">Itens Solicitados</div>
        <table>
          <thead><tr>
            <th>Insumo</th><th>Variante</th><th class="text-center">Quant.</th><th class="text-center">Unid.</th><th class="text-center">Preço Unit.</th><th class="text-right">Subtotal</th>
          </tr></thead>
          <tbody>
            ${order.items.map(item => `<tr>
              <td class="font-bold">${item.ingredient_name || '-'}</td>
              <td>${item.variant_name || '-'}</td>
              <td class="text-center">${item.quantity}</td>
              <td class="text-center">${(item.unit || 'UN').toUpperCase()}</td>
              <td class="text-center">${formatBRL(item.unit_price)}</td>
              <td class="text-right font-bold text-primary">${formatBRL(item.quantity * item.unit_price)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="total-box">
          <span class="label">Valor Total da Ordem</span>
          <span class="value">${formatBRL(order.total_value)}</span>
        </div>
      </div>

      ${order.notes ? `<div class="card"><div style="font-size:11px;font-weight:800;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Observações</div><div style="font-size:11px;color:#334155;line-height:1.7;font-style:italic;">${order.notes}</div></div>` : ''}

      <div class="signature-grid">
        <div class="signature-box">Responsável pela Compra</div>
        <div class="signature-box">Recebimento / Fornecedor</div>
      </div>
      <div class="footer">${settings.name} — Ordem de Compra — Documento de Controle Interno</div>
    </body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument?.write(html);
    iframe.contentDocument?.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 500);
  };

  const getStatusColor = (status: POStatus) => {
    switch (status) {
      case 'rascunho': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'enviado': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'recebido': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'cancelado': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  const getStatusIcon = (status: POStatus) => {
    switch (status) {
      case 'rascunho': return <FileText className="w-3.5 h-3.5" />;
      case 'enviado': return <Clock className="w-3.5 h-3.5" />;
      case 'recebido': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'cancelado': return <XCircle className="w-3.5 h-3.5" />;
    }
  };

  const fmtDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  };

  const fmtQty = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(val || 0);
  };

  const fmtPrice = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden pt-6">
      {/* Header com Abas */}
      <header className="px-8 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('ordens')}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'ordens' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Ordens de Compra
            {activeTab === 'ordens' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#202eac] rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('sugestoes')}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all relative flex items-center gap-2 ${activeTab === 'sugestoes' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Sugestões Inteligentes
            {suggestions.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {suggestions.length}
              </span>
            )}
            {activeTab === 'sugestoes' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#202eac] rounded-t-full" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex items-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-[#202eac]/20 focus-within:border-[#202eac] transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Buscar ordens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-700 w-64 uppercase"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-[#202eac] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-[#202eac] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Blocos"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#202eac] text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:bg-[#1a258a] transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova Ordem
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 mb-10">
          <div 
            onClick={() => { setStatusFilter('todos'); setActiveTab('ordens'); }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${statusFilter === 'todos' && activeTab === 'ordens' ? 'bg-white border-[#202eac] shadow-md ring-1 ring-[#202eac]/20' : 'bg-white border-slate-200 shadow-sm hover:border-[#202eac]/30 hover:shadow-md'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${statusFilter === 'todos' ? 'bg-[#202eac] text-white' : 'bg-blue-50 text-blue-600'}`}>
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pedidos</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
              </div>
            </div>
          </div>

          <div 
            onClick={() => { setStatusFilter('enviado'); setActiveTab('ordens'); }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${statusFilter === 'enviado' ? 'bg-white border-[#202eac] shadow-md ring-1 ring-[#202eac]/20' : 'bg-white border-slate-200 shadow-sm hover:border-[#202eac]/30 hover:shadow-md'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${statusFilter === 'enviado' ? 'bg-[#202eac] text-white' : 'bg-amber-50 text-amber-600'}`}>
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aguardando</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.waiting}</h3>
              </div>
            </div>
          </div>

          <div 
            onClick={() => { setStatusFilter('atrasado'); setActiveTab('ordens'); }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${statusFilter === 'atrasado' ? 'bg-white border-[#202eac] shadow-md ring-1 ring-[#202eac]/20' : 'bg-white border-slate-200 shadow-sm hover:border-[#202eac]/30 hover:shadow-md'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${statusFilter === 'atrasado' ? 'bg-rose-500 text-white' : (stats.overdue > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400')}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Em Atraso</p>
                <h3 className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{stats.overdue}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shadow-sm">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Investimento</p>
                <h3 className="text-2xl font-bold text-slate-800">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.investment)}
                </h3>
              </div>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border transition-all cursor-pointer ${activeTab === 'sugestoes' ? 'bg-white border-[#202eac] shadow-md ring-1 ring-[#202eac]/20' : 'bg-white border-slate-100 shadow-sm hover:border-[#202eac]/30 hover:shadow-md'}`} onClick={() => setActiveTab('sugestoes')}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-colors ${activeTab === 'sugestoes' ? 'bg-[#202eac] text-white' : (stats.critical > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400')}`}>
                <ShoppingCart className={`w-6 h-6 ${stats.critical > 0 && activeTab !== 'sugestoes' ? 'animate-bounce' : ''}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alertas</p>
                <h3 className={`text-2xl font-bold ${stats.critical > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{stats.critical}</h3>
              </div>
            </div>
          </div>

          <div 
            onClick={() => { setStatusFilter('cancelado'); setActiveTab('ordens'); }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${statusFilter === 'cancelado' ? 'bg-white border-[#202eac] shadow-md ring-1 ring-[#202eac]/20' : 'bg-white border-slate-100 shadow-sm hover:border-red-200 hover:shadow-md'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${statusFilter === 'cancelado' ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-red-50 group-hover:text-red-500 transition-colors'}`}>
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cancelados</p>
                <h3 className={`text-2xl font-bold ${statusFilter === 'cancelado' ? 'text-red-600' : 'text-slate-400'}`}>{stats.cancelled}</h3>
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'ordens' ? (
          <div className="space-y-6">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-800 mb-2">Nenhuma Ordem Encontrada</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto uppercase">Sua busca não retornou resultados ou você ainda não possui pedidos registrados.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-[#202eac]/30 hover:shadow-md transition-all overflow-hidden flex flex-col group h-full">
                    <div className={`px-5 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/50`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${getStatusColor(order.status).split(' ')[1]}`}>
                        {getStatusIcon(order.status)}
                        {order.status}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter" title="Data e Hora de Emissão">
                        {fmtDateTime(order.created_at)}
                      </span>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform"><FileText className="w-6 h-6 text-indigo-600" /></div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-[#202eac] transition-colors">{order.number}</h3>
                          <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">{order.supplier_name || 'Individual'}</p>
                        </div>
                      </div>
                      <div className="mt-auto pt-5 border-t border-slate-50 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total</p>
                          <p className="text-xl font-bold text-[#202eac]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_value)}</p>
                        </div>
                        <button onClick={() => handleEdit(order)} className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-[#202eac] transition-all shadow-md"><ArrowRight className="w-5 h-5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-4 px-6">Nº Pedido</th>
                        <th className="py-4 px-6">Fornecedor</th>
                        <th className="py-4 px-6">Emissão</th>
                        <th className="py-4 px-6 text-center">Itens</th>
                        <th className="py-4 px-6 text-center">Prev. Entrega</th>
                        <th className="py-4 px-6 text-right">Valor Total</th>
                        <th className="py-4 px-6 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredOrders.map(order => (
                        <tr key={order.id} onClick={() => handleEdit(order)} className="hover:bg-blue-50/40 transition-all cursor-pointer group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 border border-indigo-100"><FileText className="w-5 h-5 text-indigo-600" /></div>
                              <span className="font-bold text-slate-800 text-sm group-hover:text-[#202eac] transition-colors">{order.number}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-600 text-sm uppercase">{order.supplier_name || '-'}</td>
                          <td className="py-4 px-6 text-xs text-slate-400 font-bold uppercase tracking-tight">{fmtDateTime(order.created_at)}</td>
                          <td className="py-4 px-6 text-center">
                            <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100">
                              {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {order.expected_date ? (
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-bold text-slate-700">{new Date(order.expected_date).toLocaleDateString('pt-BR')}</span>
                                {order.status === 'enviado' && new Date(order.expected_date) < new Date() && (
                                  <span className="text-[9px] text-rose-500 font-bold uppercase animate-pulse">Atrasado</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Pendente</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-[#202eac] text-sm">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_value)}</span>
                              {order.notes && (
                                <span title={order.notes}>
                                  <FileText className="w-3 h-3 text-amber-500 mt-1" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 relative">
                            <div className="flex justify-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border ${getStatusColor(order.status)}`}>
                                {getStatusIcon(order.status)}
                                {order.status}
                              </span>
                            </div>
                            
                            {/* Floating Actions on Hover */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handlePrintOrder(order); }} 
                                className="px-3 py-2 bg-white text-slate-500 hover:text-[#202eac] rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-2 group/btn"
                              >
                                <Printer className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Imprimir</span>
                              </button>
                              
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleEdit(order); }} 
                                className="px-3 py-2 bg-white text-slate-500 hover:text-[#202eac] rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-2 group/btn"
                              >
                                <FileText className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Editar</span>
                              </button>
                              
                              {order.status === 'rascunho' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'enviado'); }} 
                                  className="px-4 py-2 bg-[#202eac] text-white hover:bg-[#1a258a] rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 group/btn"
                                >
                                  <Send className="w-4 h-4" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Enviar</span>
                                </button>
                              )}

                              {order.status === 'enviado' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'recebido'); }} 
                                  className="px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 group/btn"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Receber</span>
                                </button>
                              )}
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
        ) : (
          <div className="">
            {suggestions.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-800 mb-2">Estoque em Equilíbrio</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto uppercase">Todos os insumos estão acima do nível de segurança.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {suggestions.map((group, index) => (
                  <div key={index} className="bg-white rounded-[24px] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group h-full">
                    {/* Card Header */}
                    <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#202eac]/10 rounded-xl flex items-center justify-center border border-[#202eac]/20 group-hover:scale-110 transition-transform">
                          <AlertTriangle className="w-5 h-5 text-[#202eac]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-1">{group.supplierName.toUpperCase()}</h3>
                          <p className="text-[10px] font-bold text-[#202eac] uppercase tracking-wider">{group.items.length} ITENS</p>
                        </div>
                      </div>
                    </div>

                    {/* Card Body - Top Items */}
                    <div className="p-6 flex-1 space-y-4">
                      <div className="space-y-2">
                        {group.items.slice(0, 3).map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100/50">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-slate-700 line-clamp-1">{item.ingredient.name}</span>
                              <span className="text-[9px] text-slate-400">Atual: {fmtQty(item.ingredient.estoque_atual || 0)} {item.ingredient.unit}</span>
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                              +{fmtQty(item.deficit || 0)}
                            </span>
                          </div>
                        ))}
                        {group.items.length > 3 && (
                          <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest pt-1">
                            + {group.items.length - 3} outros itens
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="p-5 bg-white border-t border-slate-50">
                      <button 
                        onClick={() => handleCreateFromSuggestion(group)} 
                        className="w-full py-3 bg-[#202eac] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#1a258a] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 active:scale-95 group-hover:shadow-indigo-500/30"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Gerar Ordem
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {suggestions.map((group, index) => (
                  <div key={index} className="bg-white rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group relative">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#202eac]"></div>
                    <div className="bg-slate-50/80 px-8 py-5 flex items-center justify-between border-b border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200 group-hover:scale-105 transition-transform">
                          <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm tracking-tight text-lg">🛒 {group.supplierName.toUpperCase()}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">{group.items.length} ITENS PRECISANDO DE REPOSIÇÃO</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCreateFromSuggestion(group)} 
                        className="px-6 py-3 bg-[#202eac] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#1a258a] transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Gerar Ordem de Compra
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left table-fixed">
                        <thead>
                          <tr className="bg-slate-50/30 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="px-8 py-4 w-1/3">Insumo</th>
                            <th className="px-6 py-4 text-center w-40">Estoque Mínimo</th>
                            <th className="px-6 py-4 text-center w-40">Estoque Atual</th>
                            <th className="px-6 py-4 text-center w-40 text-[#202eac]">Sugestão (+Déficit)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-bold text-slate-700 uppercase tracking-tight text-[13px]">
                          {group.items.map((item, i) => (
                            <tr key={i} className="hover:bg-blue-50/20 transition-all group/row">
                              <td className="px-8 py-4">
                                <div className="flex flex-col">
                                  <span className="text-slate-800 font-bold text-sm group-hover/row:text-[#202eac] transition-colors">{item.ingredient.name}</span>
                                  <span className="text-slate-400 text-[9px] lowercase tracking-normal italic flex items-center gap-1">
                                    <Package className="w-3 h-3" /> Unid: {item.ingredient.unit}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center text-slate-500 font-semibold">{fmtQty(item.ingredient.estoque_minimo || 0)}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full font-black text-[11px] border border-red-100 shadow-sm">
                                  {fmtQty(item.ingredient.estoque_atual || 0)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center font-black">
                                <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 text-[11px] shadow-sm">
                                  + {fmtQty(item.deficit || 0)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-slate-50/50 px-8 py-4 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] text-center border-t border-slate-100">
                      Total de itens para este fornecedor: {group.items.length}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Editor Modal ("Nova Janela") */}
      {isModalOpen && currentOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  {currentOrder.id && !filteredOrders.find(o => o.id === currentOrder.id) ? 'Nova Ordem de Compra' : `Ordem: ${currentOrder.number}`}
                </h2>
                <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">Criação e edição de pedidos aos fornecedores</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fornecedor *</label>
                  <select 
                    value={currentOrder.supplier_id || ''} 
                    onChange={(e) => setCurrentOrder(prev => ({ ...prev, supplier_id: e.target.value, supplier_name: e.target.options[e.target.selectedIndex].text }))}
                    className="w-full h-11 px-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all font-semibold text-slate-700 outline-none uppercase"
                  >
                    <option value="">Selecione o fornecedor...</option>
                    <option value="unknown">Fornecedor Avulso / Não Listado</option>
                    {suppliers.map(s => (<option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Previsão de Entrega</label>
                  <input 
                    type="date" 
                    value={currentOrder.expected_date || ''} 
                    onChange={(e) => setCurrentOrder(prev => ({ ...prev, expected_date: e.target.value }))}
                    className="w-full h-11 px-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all font-semibold text-slate-700 outline-none" 
                  />
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#202eac]" />
                    Itens do Pedido
                  </h3>
                  <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{currentOrder.items?.length || 0} Itens</span>
                </div>
                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3">Insumo</th>
                        <th className="px-6 py-3 w-24 text-center">Unidade</th>
                        <th className="px-6 py-3 w-32 text-center">Quant.</th>
                        <th className="px-6 py-3 w-40 text-center">Preço Unit.</th>
                        <th className="px-6 py-3 w-40 text-right">Subtotal</th>
                        <th className="px-4 py-3 w-16 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700 uppercase tracking-tight">
                      {currentOrder.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-3">
                            {item.ingredient_id ? (
                              <div className="flex flex-col gap-1.5">
                                <span className="text-slate-800">{item.ingredient_name}</span>
                                {getIngredientVariants(item.ingredient_id).length > 0 && (
                                  <select
                                    value={item.variant_id || ''}
                                    onChange={(e) => handleVariantChange(index, e.target.value)}
                                    className="w-full h-8 bg-amber-50 border border-amber-200 rounded-lg px-2 text-[10px] font-bold uppercase outline-none focus:border-[#202eac] transition-all mt-0.5"
                                  >
                                    <option value="">SEM VARIANTE (PREÇO BASE)</option>
                                    {getIngredientVariants(item.ingredient_id).map(v => (
                                      <option key={v.id} value={v.id}>{v.name?.toUpperCase()} {v.codigo ? `(${v.codigo})` : ''}</option>
                                    ))}
                                  </select>
                                )}
                                {item.variant_name && (
                                  <span className="text-[9px] text-amber-600 font-bold">⚡ {item.variant_name}</span>
                                )}
                              </div>
                            ) : (
                              <select 
                                value={item.ingredient_id}
                                onChange={(e) => handleIngredientChange(index, e.target.value)}
                                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold uppercase outline-none focus:border-[#202eac] transition-all"
                              >
                                <option value="">SELECIONE UM INSUMO...</option>
                                {ingredients.map(ing => (
                                  <option key={ing.id} value={ing.id}>{ing.name.toUpperCase()}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase tracking-widest">{item.unit || '-'}</span>
                          </td>
                          <td className="px-6 py-3">
                            <input 
                              type="number" 
                              min="0" 
                              step="0.01" 
                              value={item.quantity} 
                              onChange={(e) => {
                                const newItems = [...(currentOrder.items || [])];
                                newItems[index].quantity = Number(e.target.value);
                                const newTotal = newItems.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
                                setCurrentOrder(prev => ({ ...prev, items: newItems, total_value: newTotal }));
                              }}
                              className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg text-center outline-none focus:border-[#202eac]/40 transition-colors shadow-inner" 
                            />
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-slate-300 text-[10px] font-black">R$</span>
                              <input 
                                type="text" 
                                inputMode="numeric"
                                value={fmtPrice(item.unit_price)} 
                                onChange={(e) => {
                                  const rawValue = e.target.value.replace(/\D/g, '');
                                  const newValue = Number(rawValue) / 100;
                                  const newItems = [...(currentOrder.items || [])];
                                  newItems[index].unit_price = newValue;
                                  const newTotal = newItems.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
                                  setCurrentOrder(prev => ({ ...prev, items: newItems, total_value: newTotal }));
                                }}
                                className="w-24 h-9 bg-slate-50 border border-slate-200 rounded-lg text-center outline-none focus:border-[#202eac]/40 transition-colors shadow-inner" 
                              />
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right text-[#202eac] font-black tracking-tighter">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantity * item.unit_price)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleRemoveRow(index)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                      {(!currentOrder.items || currentOrder.items.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-slate-300 font-bold uppercase tracking-[0.2em] bg-slate-50/30">Nenhum item adicionado à ordem.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div className="bg-indigo-50/30 px-6 py-5 flex items-center justify-between border-t border-slate-100">
                    <button 
                      onClick={handleAddRow}
                      className="px-5 py-2.5 bg-white text-[#202eac] rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm hover:shadow-md transition-all border border-indigo-100 flex items-center gap-2 hover:-translate-y-0.5"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Insumo
                    </button>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Geral</p>
                      <p className="text-3xl font-black text-[#202eac] tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentOrder.total_value || 0)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observações do Pedido</label>
                <textarea 
                  value={currentOrder.notes || ''} 
                  onChange={(e) => setCurrentOrder(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#202eac]/10 focus:border-[#202eac] transition-all font-semibold text-slate-700 outline-none min-h-[100px] uppercase text-sm" 
                  placeholder="Instruções para entrega, cotações recebidas, etc..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-slate-100 flex gap-3 bg-slate-50/50">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all text-xs uppercase tracking-[0.1em] shadow-sm"
              >
                Descartar Alt.
              </button>
              <button 
                onClick={() => handlePrintOrder(currentOrder as PurchaseOrder)}
                className="px-5 py-3 bg-white border border-indigo-100 text-[#202eac] font-bold rounded-2xl hover:bg-indigo-50 transition-all text-xs uppercase tracking-[0.1em] shadow-sm flex items-center gap-2"
                title="Imprimir Relatório da OC"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              
              {currentOrder.status === 'rascunho' ? (
                <>
                  <button 
                    onClick={() => handleSaveOrder(currentOrder as PurchaseOrder)}
                    className="px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-300 transition-all text-xs uppercase tracking-[0.1em] flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Rascunho
                  </button>
                  <button 
                    onClick={() => {
                      const updated = { ...currentOrder, status: 'enviado' as POStatus };
                      handleSaveOrder(updated as PurchaseOrder);
                      setIsModalOpen(false);
                    }}
                    className="flex-1 px-6 py-3 bg-[#202eac] text-white font-bold rounded-2xl hover:bg-[#1a258a] transition-all shadow-xl shadow-indigo-500/10 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] transform active:scale-[0.99]"
                  >
                    <Send className="w-5 h-5" />
                    Enviar Pedido
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => handleSaveOrder(currentOrder as PurchaseOrder)}
                  className="flex-1 px-6 py-3 bg-[#202eac] text-white font-bold rounded-2xl hover:bg-[#1a258a] transition-all shadow-xl shadow-indigo-500/10 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] transform active:scale-[0.99]"
                >
                  <Save className="w-5 h-5" />
                  Salvar Alterações
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reusable Confirm Modal */}
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
