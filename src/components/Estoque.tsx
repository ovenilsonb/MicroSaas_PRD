import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Archive, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Search, 
  Filter, 
  Package, 
  AlertTriangle,
  ClipboardList,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Box
} from 'lucide-react';

interface InventoryLog {
  id: string;
  ingredient_id: string;
  quantity: number;
  type: 'in' | 'out' | 'adjust';
  notes: string | null;
  created_at: string;
  ingredients: {
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

export default function Estoque() {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [stats, setStats] = useState<IngredientStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    await Promise.all([
      fetchLogs(),
      fetchStats()
    ]);
    setIsLoading(false);
  }

  async function fetchLogs() {
    try {
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
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
    }
  }

  async function fetchStats() {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, nome, estoque_atual, estoque_minimo, unidade_medida')
        .order('nome');

      if (error) throw error;
      setStats(data || []);
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  }

  const filteredStats = stats.filter(s => 
    s.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Archive className="w-6 h-6 text-[#202eac]" />
            Movimentação de Estoque
          </h1>
          <p className="text-sm text-slate-500 mt-1">Rastreabilidade total de insumos e matérias-primas</p>
        </div>
        
        <button 
          onClick={fetchData}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#202eac] transition-all"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="flex-1 overflow-auto p-8 flex flex-col gap-8">
        
        {/* KPI Row */}
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
                {logs.filter(l => l.type === 'in').length}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" /> Reposição de estoque
              </div>
           </div>
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Saídas p/ OFs</div>
              <div className="text-3xl font-black text-slate-800">
                {logs.filter(l => l.type === 'out').length}
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
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
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
                          <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                             log.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 
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

                <div className="p-4 border-t border-slate-50 bg-slate-50/50">
                   <button className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-[#202eac] transition-all flex items-center justify-center gap-2">
                      Ver Relatório Completo <ClipboardList className="w-4 h-4" />
                   </button>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
