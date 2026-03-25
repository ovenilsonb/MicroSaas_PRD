import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Factory, 
  Plus, 
  Search, 
  Beaker, 
  Calendar, 
  Hash, 
  ChevronRight, 
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  ClipboardList,
  ShieldCheck,
  PackageCheck,
  Trash2
} from 'lucide-react';

interface ProductionOrder {
  id: string;
  formula_id: string;
  batch_number: string;
  planned_volume: number;
  actual_volume: number | null;
  status: 'planned' | 'in_progress' | 'quality_check' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  formulas: {
    name: string;
    lm_code: string | null;
    batch_prefix: string | null;
  };
}

interface Formula {
  id: string;
  name: string;
  base_volume: number;
  lm_code: string | null;
  batch_prefix: string | null;
  formula_ingredients?: any[];
}

export default function Producao() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'details'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  // Create Form State
  const [targetFormulaId, setTargetFormulaId] = useState('');
  const [plannedVolume, setPlannedVolume] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setIsLoading(true);
    await Promise.all([
      fetchOrders(),
      fetchFormulas()
    ]);
    setIsLoading(false);
  }

  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from('production_orders')
        .select(`
          *,
          formulas (name, lm_code, batch_prefix)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Erro ao buscar ordens:', err);
    }
  }

  async function fetchFormulas() {
    try {
      const { data, error } = await supabase
        .from('formulas')
        .select('id, name, base_volume, lm_code, batch_prefix')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setFormulas(data || []);
    } catch (err) {
      console.error('Erro ao buscar fórmulas:', err);
    }
  }

  const handleCreateNew = () => {
    setTargetFormulaId('');
    setPlannedVolume('');
    setBatchNumber('');
    setViewMode('create');
  };

  const handleSelectFormula = (id: string) => {
    setTargetFormulaId(id);
    const formula = formulas.find(f => f.id === id);
    if (formula) {
      setPlannedVolume(formula.base_volume.toString());
      // Generate suggestion for batch number
      const date = new Date();
      const prefix = formula.batch_prefix || 'LOT';
      const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
      const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      setBatchNumber(`${prefix}-${dateStr}-${random}`);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFormulaId || !plannedVolume || !batchNumber) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('production_orders')
        .insert([{
          formula_id: targetFormulaId,
          planned_volume: parseFloat(plannedVolume),
          batch_number: batchNumber,
          status: 'planned'
        }]);

      if (error) throw error;
      
      await fetchOrders();
      setViewMode('list');
    } catch (err) {
      console.error('Erro ao criar ordem:', err);
      alert('Erro ao criar ordem de fabricação.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateOrderStatus = async (id: string, newStatus: ProductionOrder['status']) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'in_progress') updateData.start_date = new Date().toISOString();
      if (newStatus === 'completed') updateData.end_date = new Date().toISOString();

      const { error } = await supabase
        .from('production_orders')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await fetchOrders();
      if (selectedOrder?.id === id) {
        setSelectedOrder(prev => prev ? { ...prev, ...updateData } : null);
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      o.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.formulas?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm]);

  const getStatusBadge = (status: ProductionOrder['status']) => {
    switch (status) {
      case 'planned': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-blue-200">Planejada</span>;
      case 'in_progress': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-amber-200 animate-pulse">Em Produção</span>;
      case 'quality_check': return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-purple-200">Em Qualidade</span>;
      case 'completed': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-emerald-200">Finalizada</span>;
      case 'cancelled': return <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-slate-200">Cancelada</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Factory className="w-6 h-6 text-[#202eac]" />
            Ordens de Fabricação (OF)
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie o fluxo de produção e lotes de produtos</p>
        </div>
        
        {viewMode === 'list' && (
          <button 
            onClick={handleCreateNew}
            className="bg-[#202eac] hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
          >
            <Plus className="w-5 h-5" /> Nova Ordem
          </button>
        )}
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          
          {viewMode === 'list' && (
            <div className="space-y-6">
              {/* Search & Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <Search className="w-5 h-5 text-slate-400 ml-2" />
                  <input 
                    type="text" 
                    placeholder="Buscar por lote ou fórmula..." 
                    className="flex-1 outline-none text-sm p-1"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Pendentes</div>
                    <div className="text-xl font-black text-slate-800">{orders.filter(o => o.status === 'planned').length}</div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                    <Play className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Em Curso</div>
                    <div className="text-xl font-black text-slate-800">{orders.filter(o => o.status === 'in_progress').length}</div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                      <th className="py-4 px-6 font-bold">Lote / OF</th>
                      <th className="py-4 px-6 font-bold">Produto / Fórmula</th>
                      <th className="py-4 px-6 font-bold text-center">Volume</th>
                      <th className="py-4 px-6 font-bold text-center">Status</th>
                      <th className="py-4 px-6 font-bold">Data</th>
                      <th className="py-4 px-6 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 italic">Nenhuma ordem encontrada</td>
                      </tr>
                    ) : (
                      filteredOrders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <Hash className="w-3.5 h-3.5 text-slate-400" />
                              {order.batch_number}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-semibold text-slate-700">{order.formulas?.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono uppercase">{order.formulas?.lm_code || 'S/C'}</div>
                          </td>
                          <td className="py-4 px-6 text-center font-bold text-slate-600">
                            {order.planned_volume}L
                          </td>
                          <td className="py-4 px-6 text-center">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              {new Date(order.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button 
                              onClick={() => {
                                setSelectedOrder(order);
                                setViewMode('details');
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-[#202eac] rounded-lg transition-all"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === 'create' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-[#202eac]" /> Nova Ordem de Fabricação
                  </h2>
                  <button onClick={() => setViewMode('list')} className="text-slate-400 hover:text-slate-600">
                    Cancelar
                  </button>
                </div>
                
                <form onSubmit={handleSubmitOrder} className="p-8 space-y-6">
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700">Escolha a Fórmula Ativa</label>
                    <div className="grid grid-cols-1 gap-3">
                      {formulas.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleSelectFormula(f.id)}
                          className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                            targetFormulaId === f.id 
                              ? 'border-[#202eac] bg-blue-50/50 ring-2 ring-blue-100' 
                              : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${targetFormulaId === f.id ? 'bg-[#202eac] text-white' : 'bg-slate-200 text-slate-500'}`}>
                              <Beaker className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-800">{f.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{f.lm_code || 'S/C'}</div>
                            </div>
                          </div>
                          {targetFormulaId === f.id && <CheckCircle2 className="w-5 h-5 text-[#202eac]" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {targetFormulaId && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Volume do Lote (L)</label>
                        <input 
                          type="number"
                          value={plannedVolume}
                          onChange={e => setPlannedVolume(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 outline-none font-bold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Número do Lote</label>
                        <input 
                          type="text"
                          value={batchNumber}
                          onChange={e => setBatchNumber(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 outline-none font-mono text-slate-800 uppercase"
                        />
                      </div>
                    </div>
                  )}

                  <button 
                    disabled={!targetFormulaId || isSaving}
                    className="w-full py-4 bg-[#202eac] hover:bg-blue-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  >
                    {isSaving ? 'Criando...' : 'Confirmar Lançamento de OF'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {viewMode === 'details' && selectedOrder && (
            <div className="animate-in fade-in slide-in-from-right-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="font-bold text-slate-800 text-lg">OF: {selectedOrder.batch_number}</h2>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                  </div>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Info Panel */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                      <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" /> Detalhes da Ordem
                      </h3>
                      <div>
                        <div className="text-xs text-slate-400">Fórmula</div>
                        <div className="font-bold text-slate-800">{selectedOrder.formulas?.name}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-slate-400">Volume Planejado</div>
                          <div className="font-bold text-slate-800">{selectedOrder.planned_volume} L</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400">Criado em</div>
                          <div className="font-bold text-slate-800">{new Date(selectedOrder.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="bg-[#202eac]/5 p-6 rounded-2xl border border-[#202eac]/10 space-y-4">
                      <h3 className="font-bold text-[#202eac] text-[10px] uppercase tracking-wider">Ações Disponíveis</h3>
                      
                      {selectedOrder.status === 'planned' && (
                        <button 
                          onClick={() => updateOrderStatus(selectedOrder.id, 'in_progress')}
                          className="w-full py-3 bg-[#202eac] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-800 transition-all"
                        >
                          <Play className="w-4 h-4" /> Iniciar Fabricação
                        </button>
                      )}

                      {selectedOrder.status === 'in_progress' && (
                        <button 
                          onClick={() => updateOrderStatus(selectedOrder.id, 'quality_check')}
                          className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-amber-600 transition-all"
                        >
                          <ShieldCheck className="w-4 h-4" /> Enviar para Qualidade
                        </button>
                      )}

                      {selectedOrder.status === 'quality_check' && (
                        <div className="space-y-3">
                          <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                            Aguardando laudo técnico no módulo de Qualidade para liberar o lote.
                          </p>
                        </div>
                      )}

                      {selectedOrder.status === 'completed' && (
                        <div className="text-center p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex flex-col items-center gap-2">
                          <PackageCheck className="w-8 h-8" />
                          <div className="font-bold">Lote Finalizado & Envasado</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Flow Visualization */}
                  <div className="lg:col-span-2">
                    <div className="relative h-full min-h-[400px] border border-slate-100 rounded-2xl bg-grid-slate-100 flex flex-col items-center justify-center p-12">
                      <div className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                        <AlertCircle className="w-4 h-4" /> Fluxograma de Processo
                      </div>
                      
                      {/* Step 1 */}
                      <div className={`relative z-10 p-6 rounded-2xl border-2 flex flex-col items-center gap-3 w-64 transition-all ${
                        ['planned', 'in_progress', 'quality_check', 'completed'].includes(selectedOrder.status)
                          ? 'bg-white border-[#202eac] shadow-lg'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                         <div className="w-10 h-10 bg-blue-50 text-[#202eac] rounded-full flex items-center justify-center font-black">1</div>
                         <div className="font-bold text-slate-800">Planejamento</div>
                         <div className="text-center text-[10px] text-slate-500">Cálculo de insumos e reserva de lote para produção.</div>
                      </div>

                      <div className="w-0.5 h-12 bg-slate-200"></div>

                      {/* Step 2 */}
                      <div className={`relative z-10 p-6 rounded-2xl border-2 flex flex-col items-center gap-3 w-64 transition-all ${
                        ['in_progress', 'quality_check', 'completed'].includes(selectedOrder.status)
                          ? 'bg-white border-amber-500 shadow-lg'
                          : 'bg-slate-50 border-slate-200 opacity-50'
                      }`}>
                         <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center font-black">2</div>
                         <div className="font-bold text-slate-800">Processamento</div>
                         <div className="text-center text-[10px] text-slate-500">Mistura dos insumos reativos e homogeneização da fórmula.</div>
                      </div>

                      <div className="w-0.5 h-12 bg-slate-200"></div>

                      {/* Step 3 */}
                      <div className={`relative z-10 p-6 rounded-2xl border-2 flex flex-col items-center gap-3 w-64 transition-all ${
                        ['quality_check', 'completed'].includes(selectedOrder.status)
                          ? 'bg-white border-purple-500 shadow-lg'
                          : 'bg-slate-50 border-slate-200 opacity-50'
                      }`}>
                         <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center font-black">3</div>
                         <div className="font-bold text-slate-800">Qualidade</div>
                         <div className="text-center text-[10px] text-slate-500">Análise laboratorial de pH, viscosidade e parâmetros técnicos.</div>
                      </div>

                      <div className="w-0.5 h-12 bg-slate-200"></div>

                      {/* Step 4 */}
                      <div className={`relative z-10 p-6 rounded-2xl border-2 flex flex-col items-center gap-3 w-64 transition-all ${
                        selectedOrder.status === 'completed'
                          ? 'bg-white border-emerald-500 shadow-lg font-bold'
                          : 'bg-slate-50 border-slate-200 opacity-50'
                      }`}>
                         <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-black">4</div>
                         <div className="font-bold text-slate-800">Finalizado</div>
                         <div className="text-center text-[10px] text-slate-500">Liberação para envase e atualização de estoque acabado.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
