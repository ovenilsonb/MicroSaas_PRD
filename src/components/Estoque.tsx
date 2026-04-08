import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStorageMode } from '../contexts/StorageModeContext';
import { generateId } from '../lib/id';
import { useToast } from './dashboard/Toast';
import {
  Archive, ArrowUpRight, ArrowDownLeft, History, Search, Filter,
  Package, AlertTriangle, ClipboardList, RefreshCw, TrendingDown, TrendingUp, Box, Layers, Pencil
} from 'lucide-react';

interface InventoryLog {
  id: string;
  ingredient_id?: string;
  quantity: number;
  type: 'in' | 'out' | 'adjust';
  notes: string | null;
  created_at: string;
  ingredients?: {
    nome: string;
    unidade_medida: string;
    estoque_atual: number;
    estoque_minimo: number;
  };
}

interface IngredientStats {
  id: string;
  nome: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_medida: string;
}

interface FinishedGood {
  id: string;
  key: string;
  name: string;
  formula_id: string;
  packaging_id: string;
  variant_id: string | null;
  capacity?: number;
  stock_quantity: number;
}


interface FinishedGoodLog {
  id: string;
  finished_good_id: string;
  quantity: number;
  type: 'in' | 'out' | 'adjust';
  notes: string | null;
  created_at: string;
  finished_good?: FinishedGood;
}

export default function Estoque() {
  const { showToast } = useToast();
  const { mode } = useStorageMode();
  const [activeTab, setActiveTab] = useState<'finished' | 'raw'>('finished');

  // Insumos State
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [stats, setStats] = useState<IngredientStats[]>([]);

  // Finished Goods State
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [fgLogs, setFgLogs] = useState<FinishedGoodLog[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [searchTermFG, setSearchTermFG] = useState('');
  const [searchTermRaw, setSearchTermRaw] = useState('');

  useEffect(() => {
    fetchData();
  }, [mode]);

  async function fetchData() {
    setIsLoading(true);
    await Promise.all([
      fetchLogs(),
      fetchStats(),
      fetchFinishedGoods()
    ]);
    setIsLoading(false);
  }

  async function fetchFinishedGoods() {
    try {
      if (mode === 'supabase') {
        // Fetch finished goods from inventory_logs (type 'in' with 'finished_good' prefix in notes)
        const { data: logs, error } = await supabase
          .from('inventory_logs')
          .select('*')
          .or('type.eq.finished_good_in,type.eq.finished_good_out')
          .order('created_at', { ascending: false });

        if (error && error.code !== '42P01') {
          console.error('Erro ao buscar finished goods:', error);
        }

        // Group logs by finished_good_id to build finished goods inventory
        const fgMap = new Map<string, any>();
        const fgLogs: any[] = [];

        if (logs) {
          logs.forEach((log: any) => {
            const fgId = log.reference_id;
            if (!fgId) return;

            fgLogs.push({
              ...log,
              finished_good_id: fgId
            });

            const current = fgMap.get(fgId) || { id: fgId, stock_quantity: 0, name: log.notes?.replace('Entrada PA: ', '').replace('Saída PA: ', '') || 'Produto Acabado' };
            if (log.type === 'finished_good_in') {
              current.stock_quantity += log.quantity;
            } else if (log.type === 'finished_good_out') {
              current.stock_quantity -= log.quantity;
            }
            fgMap.set(fgId, current);
          });
        }

        setFinishedGoods(Array.from(fgMap.values()));
        setFgLogs(fgLogs);
      } else {
        const localFG = JSON.parse(localStorage.getItem('local_finished_goods') || '[]');
        const localFGLogs = JSON.parse(localStorage.getItem('local_finished_goods_logs') || '[]');
        setFinishedGoods(localFG);
        
        const enrichedLogs = localFGLogs.map((log: any) => ({
          ...log,
          finished_good: localFG.find((fg: any) => fg.id === log.finished_good_id)
        }));
        setFgLogs(enrichedLogs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
    } catch (err) {
      console.error('Erro ao buscar produtos acabados:', err);
    }
  }

  const handleAdjustFgStock = (fgId: string) => {
    const qtyStr = prompt('Informe a nova quantidade física em estoque (ajuste rápido):');
    if (qtyStr === null || qtyStr.trim() === '') return;
    const newQty = parseInt(qtyStr, 10);
    if (isNaN(newQty) || newQty < 0) return showToast('error', 'Quantidade Inválida', 'Por favor, insira uma quantidade válida.');

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
        fetchData();
      }
    }
  };

  async function fetchLogs() {
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('inventory_logs')
          .select(`
            *,
            ingredients (nome, unidade_medida, estoque_atual, estoque_minimo)
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setLogs(data || []);
      } else {
        const localLogs = JSON.parse(localStorage.getItem('local_inventory_logs') || '[]');
        const localIngs = JSON.parse(localStorage.getItem('local_ingredients') || '[]');

        const enriched = localLogs.map((log: any) => {
          const ing = localIngs.find((i: any) => i.id === log.ingredient_id);
          return {
            ...log,
            ingredients: ing ? {
              nome: ing.name,
              unidade_medida: ing.unit,
              estoque_atual: ing.estoque_atual,
              estoque_minimo: ing.estoque_minimo
            } : undefined
          };
        });
        setLogs(enriched.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
    }
  }

  async function fetchStats() {
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('ingredients')
          .select('id, nome, estoque_atual, estoque_minimo, unidade_medida')
          .order('nome');

        if (error) throw error;
        setStats(data || []);
      } else {
        const localIngs = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
        setStats(localIngs.map((i: any) => ({
          id: i.id,
          nome: i.name,
          estoque_atual: i.estoque_atual,
          estoque_minimo: i.estoque_minimo,
          unidade_medida: i.unit
        })));
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  }

  const filteredStats = stats.filter(s =>
    s.nome.toLowerCase().includes(searchTermRaw.toLowerCase())
  );

  const filteredFG = finishedGoods.filter(fg =>
    fg.name.toLowerCase().includes(searchTermFG.toLowerCase())
  );

  // Filtro de logs pelo mês corrente para KPIs
  const currentMonthLogs = logs.filter(l => {
    try {
      const logDate = new Date(l.created_at);
      const now = new Date();
      return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    } catch { return false; }
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Archive className="w-6 h-6 text-[#202eac]" />
            Movimentação de Estoque
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {activeTab === 'finished' ? 'Controle de produtos acabados prontos para venda' : 'Rastreabilidade total de insumos e matérias-primas'}
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#202eac] transition-all"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* TABS */}
      <div className="bg-white px-8 pt-6 pb-0 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('finished')}
            className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'finished' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" /> Produtos Acabados
            </div>
            {activeTab === 'finished' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#202eac] rounded-t-full shadow-[0_-2px_8px_rgba(32,46,172,0.4)]" />}
          </button>
          
          <button
            onClick={() => setActiveTab('raw')}
            className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'raw' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" /> Matérias-Primas e Insumos
            </div>
            {activeTab === 'raw' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#202eac] rounded-t-full shadow-[0_-2px_8px_rgba(32,46,172,0.4)]" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 pt-6 flex flex-col gap-6">
        
        {/* =======================
            TAB 1: PRODUTOS ACABADOS 
            ======================= */}
        {activeTab === 'finished' && (
          <>
            {/* KPI Row FG */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Tipos Produzidos</div>
                <div className="text-3xl font-black text-slate-800">{finishedGoods.length}</div>
                <div className="text-[10px] text-slate-400 mt-1">Variações em estoque</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Unidades Disponíveis</div>
                <div className="text-3xl font-black text-slate-800">
                  {finishedGoods.reduce((acc, fg) => acc + (fg.stock_quantity || 0), 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" /> Prontos para expedição
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Entradas de Lote (Histórico)</div>
                <div className="text-3xl font-black text-slate-800">
                  {fgLogs.filter(l => l.type === 'in').length}
                </div>
                <div className="text-[10px] text-blue-400 mt-1 flex items-center gap-1">
                  <Package className="w-3 h-3 text-blue-500" /> Lotes recebidos
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
              {/* Finished Goods View (Cards/List) */}
              <div className="lg:col-span-8 flex flex-col">
                 <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                      <Box className="w-5 h-5 text-[#202eac]" /> Catálogo em Estoque
                    </h2>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar produto acabado..."
                        value={searchTermFG}
                        onChange={e => setSearchTermFG(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#202eac]/10"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-5">
                    {filteredFG.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                        <Package className="w-12 h-12 mb-4 text-slate-300" />
                        <h3 className="text-lg font-bold text-slate-700 mb-1">Nenhum produto acabado</h3>
                        <p className="text-sm">Finalize uma ordem de fabricação para dar entrada.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredFG.map(fg => (
                          <div key={fg.id} className="relative group p-4 border border-slate-200 rounded-xl hover:shadow-md transition-all bg-white hover:border-[#202eac]/30">
                            <div className="flex items-start justify-between mb-3">
                              <div className="pr-4">
                                <h3 className="font-bold text-slate-800 text-sm leading-tight">{fg.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-[10px] text-slate-400">ID: {fg.id.substring(0,8)}</p>
                                  {fg.capacity && (
                                    <span className="text-[10px] font-black text-[#202eac] bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                                      {fg.capacity}L
                                    </span>
                                  )}
                                </div>

                              </div>
                              <button 
                                onClick={() => handleAdjustFgStock(fg.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-[#202eac] hover:bg-slate-50 rounded-lg transition-all absolute top-3 right-3"
                                title="Ajuste Manual"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="flex items-end justify-between mt-4">
                              <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                <Box className="w-4 h-4" />
                                <span className="font-black text-lg">{fg.stock_quantity.toLocaleString()}</span>
                                <span className="text-[10px] font-bold uppercase">un.</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Finished Goods Logs */}
              <div className="lg:col-span-4 flex flex-col">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                      <History className="w-5 h-5 text-slate-500" /> Movimentação (PA)
                    </h2>
                  </div>
                  <div className="flex-1 overflow-auto p-4 space-y-4">
                    {fgLogs.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-sm italic">Nenhum registro</div>
                    ) : (
                      fgLogs.map(log => (
                        <div key={log.id} className="group relative flex gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                          <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${log.type === 'in' ? 'bg-emerald-50 text-emerald-600' :
                            log.type === 'out' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                            {log.type === 'in' ? <ArrowDownLeft className="w-3.5 h-3.5" /> :
                              log.type === 'out' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-bold text-slate-800 text-xs truncate mr-2" title={log.finished_good?.name}>{log.finished_good?.name || 'Desconhecido'}</span>
                              <span className="text-[9px] text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold mb-1">
                              <span className={log.type === 'in' ? 'text-emerald-600' : log.type === 'out' ? 'text-red-600' : 'text-blue-600'}>
                                {log.type === 'in' ? '+' : '-'}{log.quantity} un.
                              </span>
                            </div>
                            {log.notes && <p className="text-[10px] text-slate-500 leading-relaxed italic">"{log.notes}"</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* =======================
            TAB 2: MATÉRIAS-PRIMAS 
            ======================= */}
        {activeTab === 'raw' && (
          <>
            {/* KPI Row Raw */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Itens</div>
                <div className="text-3xl font-black text-slate-800">{stats.length}</div>
                <div className="text-[10px] text-slate-400 mt-1">Insumos cadastrados</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-red-500">
                <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Abaixo do Mínimo</div>
                <div className="text-3xl font-black text-slate-800">{stats.filter(s => s.estoque_atual < s.estoque_minimo).length}</div>
                <div className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Requer compra urgente
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Entradas (Mês)</div>
                <div className="text-3xl font-black text-slate-800">
                  {currentMonthLogs.filter(l => l.type === 'in').length}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" /> Reposição de estoque
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Saídas p/ OFs (Mês)</div>
                <div className="text-3xl font-black text-slate-800">
                  {currentMonthLogs.filter(l => l.type === 'out').length}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-blue-500" /> Consumo em produção
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
              {/* Inventory Levels */}
              <div className="lg:col-span-7 flex flex-col">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                      <Box className="w-5 h-5 text-[#202eac]" /> Status Geral de Insumos
                    </h2>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar insumo..."
                        value={searchTermRaw}
                        onChange={e => setSearchTermRaw(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#202eac]/10"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="py-4 px-6">Insumo</th>
                          <th className="py-4 px-6 text-center">Unid.</th>
                          <th className="py-4 px-6 text-right">Estoque</th>
                          <th className="py-4 px-6 text-right">Min.</th>
                          <th className="py-4 px-6 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStats.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-6 font-bold text-slate-700 text-sm">{item.nome}</td>
                            <td className="py-3 px-6 text-center text-xs text-slate-500">{item.unidade_medida}</td>
                            <td className="py-3 px-6 text-right font-black text-slate-800 text-sm tracking-tight">{item.estoque_atual.toLocaleString()}</td>
                            <td className="py-3 px-6 text-right text-xs text-slate-400">{item.estoque_minimo.toLocaleString()}</td>
                            <td className="py-3 px-6">
                              <div className="flex justify-center">
                                {item.estoque_atual < item.estoque_minimo ? (
                                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                ) : item.estoque_atual < item.estoque_minimo * 1.2 ? (
                                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="lg:col-span-5 flex flex-col">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                      <History className="w-5 h-5 text-slate-500" /> Log de Atividades
                    </h2>
                    <Filter className="w-4 h-4 text-slate-400 cursor-pointer" />
                  </div>

                  <div className="flex-1 overflow-auto p-4 space-y-4">
                    {logs.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-sm italic">Nenhuma movimentação registrada</div>
                    ) : (
                      logs.map(log => (
                        <div key={log.id} className="group relative flex gap-4 p-4 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                          <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${log.type === 'in' ? 'bg-emerald-50 text-emerald-600' :
                            log.type === 'out' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                            }`}>
                            {log.type === 'in' ? <ArrowDownLeft className="w-4 h-4" /> :
                              log.type === 'out' ? <ArrowUpRight className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-bold text-slate-800 text-sm truncate">{log.ingredients?.nome}</span>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold mb-1">
                              <span className={log.type === 'in' ? 'text-emerald-600' : 'text-blue-600'}>
                                {log.type === 'in' ? '+' : '-'}{log.quantity} {log.ingredients?.unidade_medida}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400 uppercase text-[9px]">{log.type === 'in' ? 'ENTRADA' : log.type === 'out' ? 'PRODUÇÃO' : 'AJUSTE'}</span>
                            </div>
                            {log.notes && <p className="text-[11px] text-slate-500 leading-relaxed italic">"{log.notes}"</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>


                </div>
              </div>
            </div>
          </>
        )}
        
      </div>
    </div>
  );
}
