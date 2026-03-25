import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ShieldCheck, 
  FlaskConical, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileText,
  Search,
  MessageSquare,
  Beaker,
  User,
  History,
  Save,
  Clock
} from 'lucide-react';

interface QualityCheck {
  id: string;
  production_order_id: string;
  ph_value: number | null;
  viscosity_value: number | null;
  color_status: string | null;
  odor_status: string | null;
  appearance_status: string | null;
  notes: string | null;
  analyst_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  production_orders: {
    batch_number: string;
    planned_volume: number;
    formulas: {
      name: string;
      lm_code: string | null;
    };
  };
}

export default function Qualidade() {
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCheck, setSelectedCheck] = useState<QualityCheck | null>(null);
  
  // Form State
  const [ph, setPh] = useState('');
  const [viscosity, setViscosity] = useState('');
  const [color, setColor] = useState('Conforme');
  const [odor, setOdor] = useState('Conforme');
  const [appearance, setAppearance] = useState('Conforme');
  const [notes, setNotes] = useState('');
  const [analyst, setAnalyst] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setIsLoading(true);
    await fetchChecks();
    setIsLoading(false);
  }

  async function fetchChecks() {
    try {
      const { data, error } = await supabase
        .from('quality_controls')
        .select(`
          *,
          production_orders (
            batch_number,
            planned_volume,
            formulas (name, lm_code)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChecks(data || []);
    } catch (err) {
      console.error('Erro ao buscar análises:', err);
    }
  }

  const handleSelectCheck = (check: QualityCheck) => {
    setSelectedCheck(check);
    setPh(check.ph_value?.toString() || '');
    setViscosity(check.viscosity_value?.toString() || '');
    setColor(check.color_status || 'Conforme');
    setOdor(check.odor_status || 'Conforme');
    setAppearance(check.appearance_status || 'Conforme');
    setNotes(check.notes || '');
    setAnalyst(check.analyst_name || '');
  };

  const handleApproveReject = async (status: 'approved' | 'rejected') => {
    if (!selectedCheck) return;
    setIsSaving(true);

    try {
      // 1. Update Quality Control
      const { error: qcError } = await supabase
        .from('quality_controls')
        .update({
          ph_value: ph ? parseFloat(ph) : null,
          viscosity_value: viscosity ? parseFloat(viscosity) : null,
          color_status: color,
          odor_status: odor,
          appearance_status: appearance,
          notes,
          analyst_name: analyst,
          status
        })
        .eq('id', selectedCheck.id);

      if (qcError) throw qcError;

      // 2. Update Production Order status
      const { error: poError } = await supabase
        .from('production_orders')
        .update({ 
          status: status === 'approved' ? 'completed' : 'cancelled' 
        })
        .eq('id', selectedCheck.production_order_id);

      if (poError) throw poError;

      // 3. If approved, we could trigger stock finished product increase here
      // Logic for inventory finished products would go here

      await fetchChecks();
      setSelectedCheck(null);
    } catch (err) {
      console.error('Erro ao processar laudo:', err);
      alert('Erro ao salvar laudo de qualidade.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredChecks = checks.filter(c => 
    c.production_orders?.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.production_orders?.formulas?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#202eac]" />
            Controle de Qualidade
          </h1>
          <p className="text-sm text-slate-500 mt-1">Análise de parâmetros químicos e liberação de lotes</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
           <div className="px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Aguardando</div>
              <div className="text-xl font-black text-amber-600">{checks.filter(c => c.status === 'pending').length}</div>
           </div>
           <div className="px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Aprovados</div>
              <div className="text-xl font-black text-emerald-600">{checks.filter(c => c.status === 'approved').length}</div>
           </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* List Section */}
          <div className="lg:col-span-12 space-y-4">
             <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400 ml-2" />
                <input 
                  type="text" 
                  placeholder="Buscar lote ou fórmula para análise..." 
                  className="flex-1 outline-none text-sm p-1"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
             <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <History className="w-4 h-4" /> Filas de Inspeção
             </h2>
             <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                  <div className="text-center py-12 text-slate-400">Carregando lotes...</div>
                ) : filteredChecks.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 italic">Nenhum lote em quarentena</div>
                ) : (
                  filteredChecks.map(check => (
                    <button
                      key={check.id}
                      onClick={() => handleSelectCheck(check)}
                      className={`w-full p-5 rounded-2xl border-2 transition-all flex flex-col gap-3 text-left ${
                        selectedCheck?.id === check.id 
                          ? 'border-[#202eac] bg-blue-50' 
                          : 'border-white bg-white hover:border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">
                          {check.production_orders?.batch_number}
                        </span>
                        {check.status === 'pending' && <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase"><Clock className="w-3 h-3" /> Pendente</span>}
                        {check.status === 'approved' && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase"><CheckCircle2 className="w-3 h-3" /> Aprovado</span>}
                        {check.status === 'rejected' && <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase"><XCircle className="w-3 h-3" /> Reprovado</span>}
                      </div>

                      <div>
                        <div className="font-black text-slate-800 text-lg leading-tight">{check.production_orders?.formulas?.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                          <Beaker className="w-3 h-3 text-blue-400" /> 
                          Volume: {check.production_orders?.planned_volume}L
                          <span className="text-slate-300">•</span>
                          {new Date(check.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  ))
                )}
             </div>
          </div>

          {/* Form Section */}
          <div className="lg:col-span-7">
             {selectedCheck ? (
               <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4">
                  <div className="p-6 border-b border-slate-100 bg-[#202eac] text-white flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl">
                          <FlaskConical className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="font-bold text-lg">Laudo Técnico de Qualidade</h2>
                          <p className="text-xs text-blue-100 font-mono">LOTE: {selectedCheck.production_orders?.batch_number}</p>
                        </div>
                     </div>
                  </div>

                  <div className="p-8 space-y-6">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="block text-xs font-bold text-slate-500 uppercase">Valor de pH</label>
                           <input 
                              type="number"
                              step="0.1"
                              value={ph}
                              onChange={e => setPh(e.target.value)}
                              disabled={selectedCheck.status !== 'pending'}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 outline-none font-bold text-lg"
                              placeholder="ex: 7.0"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="block text-xs font-bold text-slate-500 uppercase">Viscosidade (cP)</label>
                           <input 
                              type="number"
                              value={viscosity}
                              onChange={e => setViscosity(e.target.value)}
                              disabled={selectedCheck.status !== 'pending'}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 outline-none font-bold text-lg"
                              placeholder="ex: 1200"
                           />
                        </div>
                     </div>

                     <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#202eac]" /> Avaliação Visual e Sensorial
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                           {['Cor', 'Odor', 'Aspecto'].map((label, idx) => {
                             const state = idx === 0 ? color : idx === 1 ? odor : appearance;
                             const setter = idx === 0 ? setColor : idx === 1 ? setOdor : setAppearance;
                             return (
                               <div key={label} className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">{label}</label>
                                  <select 
                                    value={state}
                                    onChange={e => setter(e.target.value)}
                                    disabled={selectedCheck.status !== 'pending'}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                                  >
                                    <option value="Conforme">Conforme</option>
                                    <option value="Não Conforme">Não Conforme</option>
                                    <option value="Ajustado">Ajustado</option>
                                  </select>
                               </div>
                             );
                           })}
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                          <MessageSquare className="w-3 h-3" /> Observações e Desvios
                        </label>
                        <textarea 
                           rows={3}
                           value={notes}
                           onChange={e => setNotes(e.target.value)}
                           disabled={selectedCheck.status !== 'pending'}
                           className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 outline-none resize-none text-sm"
                           placeholder="Relate qualquer anomalia no lote aqui..."
                        />
                     </div>

                     <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-500">
                           <User className="w-4 h-4 text-[#202eac]" />
                           <input 
                              type="text" 
                              placeholder="Nome do Analista"
                              className="text-xs font-bold bg-transparent outline-none border-b border-transparent focus:border-[#202eac] py-1"
                              value={analyst}
                              onChange={e => setAnalyst(e.target.value)}
                              disabled={selectedCheck.status !== 'pending'}
                           />
                        </div>
                        
                        {selectedCheck.status === 'pending' ? (
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleApproveReject('rejected')}
                              disabled={isSaving}
                              className="px-6 py-3 bg-white border-2 border-red-500 text-red-500 font-black rounded-2xl hover:bg-red-50 transition-all flex items-center gap-2 shadow-lg shadow-red-100"
                            >
                              <XCircle className="w-5 h-5" /> REPROVAR
                            </button>
                            <button 
                              onClick={() => handleApproveReject('approved')}
                              disabled={isSaving}
                              className="px-8 py-3 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-xl shadow-emerald-100"
                            >
                              <CheckCircle2 className="w-5 h-5" /> LIBERAR LOTE
                            </button>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-2 font-black text-lg ${selectedCheck.status === 'approved' ? 'text-emerald-600' : 'text-red-500'}`}>
                             {selectedCheck.status === 'approved' ? 'Lote Aprovado' : 'Lote Reprovado'}
                          </div>
                        )}
                     </div>
                  </div>
               </div>
             ) : (
               <div className="h-full bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-center opacity-60">
                  <ShieldCheck className="w-16 h-16 text-slate-200 mb-4" />
                  <h3 className="text-xl font-bold text-slate-400">Selecione um Lote</h3>
                  <p className="text-sm text-slate-400 max-w-xs mt-2">Clique em um dos lotes na lista ao lado para iniciar a análise laboratorial e emitir o laudo final.</p>
               </div>
             )}
          </div>

          {/* Footer Info */}
          <div className="lg:col-span-12">
             <div className="bg-slate-800 text-slate-300 p-4 rounded-xl flex items-center gap-3 text-xs italic">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <p>Todos os laudos registrados são imutáveis após a aprovação e ficam arquivados para fins de auditoria e conformidade com as normas da ANVISA.</p>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
