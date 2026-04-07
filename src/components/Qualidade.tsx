import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStorageMode } from '../contexts/StorageModeContext';
import { generateId } from '../lib/id';
import { useToast } from './dashboard/Toast';
import {
  ShieldCheck, FlaskConical, CheckCircle2, XCircle, AlertTriangle, FileText,
  Search, MessageSquare, Beaker, User, History, Save, Clock, Droplets,
  Activity, FileSpreadsheet, Package, Printer
} from 'lucide-react';
import { ConfirmModal, ConfirmModalType } from './shared/ConfirmModal';

export default function Qualidade() {
  const { showToast } = useToast();
  const { mode } = useStorageMode();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [checks, setChecks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCheck, setSelectedCheck] = useState<any | null>(null);

  // Form State
  const [ph, setPh] = useState('');
  const [viscosity, setViscosity] = useState('');
  const [color, setColor] = useState('Conforme');
  const [odor, setOdor] = useState('Conforme');
  const [appearance, setAppearance] = useState('Conforme');
  const [notes, setNotes] = useState('');
  const [analyst, setAnalyst] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal State (substitui window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    detail?: string;
    type: ConfirmModalType;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {} });

  useEffect(() => {
    fetchInitialData();
  }, [mode]);

  async function fetchInitialData() {
    setIsLoading(true);
    await fetchChecks();
    setIsLoading(false);
  }

  async function fetchChecks() {
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('quality_controls')
          .select(`
            *,
            production_orders (
              batch_number,
              planned_volume,
              formula_id,
              formulas (name, lm_code)
            )
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setChecks(data || []);
      } else {
        const localQC = JSON.parse(localStorage.getItem('local_quality_controls') || '[]');
        const localOrders = JSON.parse(localStorage.getItem('local_production_orders') || '[]');
        const formulas = JSON.parse(localStorage.getItem('local_formulas') || '[]');

        const enriched = localQC.map((qc: any) => {
          const order = localOrders.find((o: any) => o.id === qc.production_order_id);
          const formula = formulas.find((f: any) => f.id === order?.formula_id);
          return {
            ...qc,
            production_orders: order ? {
              batch_number: order.batch_number,
              planned_volume: order.planned_volume,
              formula_id: order.formula_id,
              formulas: formula ? { 
                name: formula.name, 
                lm_code: formula.lm_code,
                ph_min: formula.ph_min,
                ph_max: formula.ph_max,
                viscosity_min: formula.viscosity_min,
                viscosity_max: formula.viscosity_max
              } : undefined
            } : undefined
          };
        });
        setChecks(enriched.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
    } catch (err) {
      console.error('Erro ao buscar análises:', err);
    }
  }

  const handleSelectCheck = (check: any) => {
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

    const actionLabel = status === 'approved' ? 'APROVAR' : 'REPROVAR';
    const batchLabel = selectedCheck.production_orders?.batch_number || 'desconhecido';

    // Confirmação visual antes de decisão irreversível
    setConfirmModal({
      isOpen: true,
      title: `${actionLabel} Lote ${batchLabel}`,
      message: status === 'approved'
        ? 'O produto acabado será gerado e o estoque de embalagens será baixado automaticamente. Esta ação é irreversível.'
        : 'O lote será marcado como perda/quarentena. Esta ação é irreversível.',
      type: status === 'approved' ? 'success' : 'danger',
      confirmLabel: status === 'approved' ? 'Sim, Aprovar Lote' : 'Sim, Reprovar Lote',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        // Se aprovando sem dados numéricos, mostra segundo alerta
        if (status === 'approved' && !ph && !viscosity) {
          setConfirmModal({
            isOpen: true,
            title: 'Dados Incompletos',
            message: 'Você está aprovando este lote SEM valores de pH e Viscosidade. O certificado ficará sem dados numéricos.',
            type: 'warning',
            confirmLabel: 'Continuar Mesmo Assim',
            onConfirm: () => { setConfirmModal(prev => ({ ...prev, isOpen: false })); executeApproveReject(status); },
          });
        } else {
          executeApproveReject(status);
        }
      },
    });
  };

  const executeApproveReject = async (status: 'approved' | 'rejected') => {
    setIsSaving(true);

    try {
      const formulaName = selectedCheck.production_orders?.formulas?.name || 'Produto Não Especificado';
      const batchNumber = selectedCheck.production_orders?.batch_number || '';
      const formulaId = selectedCheck.production_orders?.formula_id;

      if (mode === 'supabase') {
        // ... Supabase logic remains simplified for now ...
        const { error: qcError } = await supabase.from('quality_controls').update({
          ph_value: ph ? parseFloat(ph) : null, viscosity_value: viscosity ? parseFloat(viscosity) : null,
          color_status: color, odor_status: odor, appearance_status: appearance,
          notes, analyst_name: analyst, status
        }).eq('id', selectedCheck.id);
        if (qcError) throw qcError;

        await supabase.from('production_orders').update({
          status: status === 'approved' ? 'completed' : 'cancelled',
          end_date: status === 'approved' ? new Date().toISOString() : null
        }).eq('id', selectedCheck.production_order_id);
      } else {
        // LOCAL MODE
        const localQC = JSON.parse(localStorage.getItem('local_quality_controls') || '[]');
        const localOrders = JSON.parse(localStorage.getItem('local_production_orders') || '[]');
        const localLogs = JSON.parse(localStorage.getItem('local_inventory_logs') || '[]');

        // 1. Update QC
        const qcIdx = localQC.findIndex((qc: any) => qc.id === selectedCheck.id);
        if (qcIdx >= 0) {
          localQC[qcIdx] = {
            ...localQC[qcIdx],
            ph_value: ph ? parseFloat(ph) : null, viscosity_value: viscosity ? parseFloat(viscosity) : null,
            color_status: color, odor_status: odor, appearance_status: appearance,
            notes, analyst_name: analyst, status
          };
          localStorage.setItem('local_quality_controls', JSON.stringify(localQC));
        }

        // 2. Update Order
        const orderIdx = localOrders.findIndex((o: any) => o.id === selectedCheck.production_order_id);
        const orderPkgs = orderIdx >= 0 ? localOrders[orderIdx].packagingPlan : [];
        if (orderIdx >= 0) {
          localOrders[orderIdx].status = status === 'approved' ? 'completed' : 'cancelled';
          if (status === 'approved') localOrders[orderIdx].end_date = new Date().toISOString();
          localStorage.setItem('local_production_orders', JSON.stringify(localOrders));
        }

        // 3. Log Stock / Create Finished Goods
        const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');

        if (status === 'approved') {
          // Log de transação básica
          localLogs.push({
            id: generateId(),
            quantity: selectedCheck.production_orders.planned_volume,
            type: 'in', reference_id: selectedCheck.production_order_id,
            notes: `Lote Aprovado e Finalizado: ${formulaName} (Lote: ${batchNumber})`,
            created_at: new Date().toISOString()
          });

          // *ESTOQUE DE PRODUTOS ACABADOS (Cartões)*
          if (orderPkgs && orderPkgs.length > 0) {
            const localFG = JSON.parse(localStorage.getItem('local_finished_goods') || '[]');
            const localFGLogs = JSON.parse(localStorage.getItem('local_finished_goods_logs') || '[]');
            
            orderPkgs.forEach((pkg: any) => {
              const isRotulo = /r[oó]tulo/i.test(pkg.name);
              if (!isRotulo && pkg.quantity > 0) {
                const fgName = `${formulaName} - ${pkg.name}`;
                const fgKey = `${formulaId}_${pkg.packagingId}_${pkg.variantId || 'base'}`;
                
                let fgIndex = localFG.findIndex((f: any) => f.key === fgKey);
                if (fgIndex === -1) {
                  // Cria o Produto Acabado se não existir
                  const newFg = { 
                    id: generateId(), key: fgKey, name: fgName, 
                    formula_id: formulaId, packaging_id: pkg.packagingId, variant_id: pkg.variantId, 
                    stock_quantity: pkg.quantity 
                  };
                  localFG.push(newFg);
                  fgIndex = localFG.length - 1;
                } else {
                  // Incrementa estoque se já existir
                  localFG[fgIndex].stock_quantity = (localFG[fgIndex].stock_quantity || 0) + pkg.quantity;
                }
                
                // Gera Log de Entrada (Estoque PA)
                localFGLogs.push({
                  id: generateId(), finished_good_id: localFG[fgIndex].id, quantity: pkg.quantity,
                  type: 'in', reference_id: selectedCheck.production_order_id,
                  notes: `Produção Aprovada (Lote: ${batchNumber})`,
                  created_at: new Date().toISOString()
                });
              }

              // BAIXA DE ESTOQUE (Embalagem/Rótulo) - Fase 1
              if (pkg.quantity > 0) {
                const ingIdx = localIngredients.findIndex((i: any) => i.id === pkg.packagingId);
                if (ingIdx >= 0) {
                  localIngredients[ingIdx].estoque_atual = (localIngredients[ingIdx].estoque_atual || 0) - pkg.quantity;
                  localLogs.push({
                    id: generateId(), ingredient_id: pkg.packagingId, variant_id: pkg.variantId || undefined,
                    quantity: pkg.quantity, type: 'out', reference_id: selectedCheck.production_order_id,
                    notes: `Consumo de Embalagem (Aprovação Lote: ${batchNumber})`,
                    created_at: new Date().toISOString()
                  });
                }
              }

            });
            localStorage.setItem('local_finished_goods', JSON.stringify(localFG));
            localStorage.setItem('local_finished_goods_logs', JSON.stringify(localFGLogs));
            localStorage.setItem('local_ingredients', JSON.stringify(localIngredients));
          }
        } 
        else if (status === 'rejected') {
          // Lote reprovado -> O registro de descarte de matéria-prima ou bloqueio
          localLogs.push({
            id: generateId(),
            quantity: selectedCheck.production_orders.planned_volume,
            type: 'out', reference_id: selectedCheck.production_order_id,
            notes: `🚨 LOTE REPROVADO (Quarentena/Descarte): ${formulaName} (Lote: ${batchNumber})`,
            created_at: new Date().toISOString()
          });
          // Nota: Não gera Produto Acabado. Permanece bloqueado/perdido.
        }
        localStorage.setItem('local_inventory_logs', JSON.stringify(localLogs));
      }

      await fetchChecks();
      setSelectedCheck(null);
    } catch (err) {
      console.error('Erro ao processar laudo:', err);
      showToast('error', 'Erro ao Salvar', 'Não foi possível salvar o laudo de qualidade.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = (check: any) => {
    const isApproved = check.status === 'approved';
    const statusText = isApproved ? 'APROVADO' : 'REPROVADO';
    const statusColor = isApproved ? '#059669' : '#dc2626';

    const printHtml = `
      <html>
        <head>
          <title>Certificado de Análise - Lote ${check.production_orders?.batch_number}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1e293b; background: white;}
            .header { border-bottom: 2px solid #202eac; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 24px; font-weight: 900; color: #202eac; margin: 0; text-transform: uppercase;}
            .subtitle { font-size: 12px; color: #64748b; margin-top: 5px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;}
            .status-badge { font-weight: 900; font-size: 24px; color: ${statusColor}; border: 4px solid ${statusColor}; padding: 10px 30px; border-radius: 8px; transform: rotate(-10deg); display: inline-block; margin-top: 20px;}
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .info-item { background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .info-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 800; margin-bottom: 5px;}
            .info-value { font-size: 16px; font-weight: 900; color: #0f172a;}
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { text-align: left; padding: 12px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 800;}
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155;}
            .footer { margin-top: 50px; text-align: center; color: #94a3b8; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-transform: uppercase; font-weight: bold;}
            .signature { margin-top: 60px; width: 250px; border-top: 1px solid #cbd5e1; text-align: center; padding-top: 10px; font-weight: 800; font-size: 14px;}
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; align-items: center; gap: 15px;">
              <img src="/logo.png" style="width: 50px; height: 50px; object-fit: contain;" onerror="this.style.display='none'" />
              <div>
                <h1 class="title">Certificado de Análise Técnica</h1>
                <p class="subtitle">Ohana Clean — Soluções em Limpeza Industrial</p>
              </div>
            </div>
            <div style="text-align: right;">
              <div class="info-label">Emissão</div>
              <div class="info-value">${new Date().toLocaleDateString('pt-BR')}</div>
              <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Fórmula Qualificada</div>
              <div class="info-value">${check.production_orders?.formulas?.name || 'Não Especificado'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Lote Industrial</div>
              <div class="info-value" style="font-family: monospace;">${check.production_orders?.batch_number || 'N/A'}</div>
            </div>
          </div>

          <h3 style="color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; font-size: 14px; text-transform: uppercase; margin-bottom: 20px;">Ensaios Físico-Químicos e Sensoriais</h3>
          <table>
            <thead>
              <tr>
                <th>Parâmetro de Controle</th>
                <th>Especificação (Alvo)</th>
                <th>Resultado Obtido</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Potencial Hidrogeniônico (pH)</strong></td>
                <td>${check.production_orders?.formulas?.ph_min || '-'} a ${check.production_orders?.formulas?.ph_max || '-'}</td>
                <td><strong style="font-size: 16px;">${check.ph_value || 'N/A'}</strong></td>
              </tr>
              <tr>
                <td><strong>Viscosidade Aparente (cP)</strong></td>
                <td>${check.production_orders?.formulas?.viscosity_min || '-'} a ${check.production_orders?.formulas?.viscosity_max || '-'}</td>
                <td><strong style="font-size: 16px;">${check.viscosity_value || 'N/A'}</strong></td>
              </tr>
              <tr>
                <td><strong>Aspecto Visual da Solução</strong></td>
                <td>Característico</td>
                <td><strong style="color: ${check.appearance_status === 'Conforme' ? '#059669' : '#dc2626'}">${check.appearance_status || '-'}</strong></td>
              </tr>
              <tr>
                <td><strong>Coloração (Visual)</strong></td>
                <td>Característica</td>
                <td><strong style="color: ${check.color_status === 'Conforme' ? '#059669' : '#dc2626'}">${check.color_status || '-'}</strong></td>
              </tr>
              <tr>
                <td><strong>Análise Olfativa (Odor)</strong></td>
                <td>Característica</td>
                <td><strong style="color: ${check.odor_status === 'Conforme' ? '#059669' : '#dc2626'}">${check.odor_status || '-'}</strong></td>
              </tr>
            </tbody>
          </table>

          <h3 style="color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; font-size: 14px; text-transform: uppercase; margin-bottom: 15px;">Parecer Técnico e Desvios</h3>
          <p style="background: #f8fafc; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px; font-style: italic; color: #475569; font-size: 14px; line-height: 1.5;">
            ${check.notes || 'Nenhuma ressalva, anomalia visual ou desvio quantitativo reportado durante processo.'}
          </p>
          
          <div style="text-align: center; margin-top: 50px;">
            <div class="status-badge">${statusText}</div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 60px;">
            <div>
              <div class="signature">${check.analyst_name || 'Responsável Técnico'}</div>
              <div style="text-align: center; font-size: 10px; color: #94a3b8; font-weight: bold; margin-top: 4px; text-transform: uppercase;">Aprovação Registrada</div>
            </div>
          </div>

          <div class="footer">
            Sistema Integrado :: Este documento é um laudo técnico oficial assinado eletronicamente.<br/>Identificação Única (UUID): ${check.id}
          </div>
        </body>
      </html>
    `;

    // Engine de impressão via iframe (anti-bloqueio de pop-up)
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument?.write(printHtml);
    iframe.contentDocument?.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { document.body.removeChild(iframe); }, 1000);
    }, 500);
  };

  const filteredChecks = checks.filter(c => {
    const batchNum = c.production_orders?.batch_number || '';
    const formulaName = c.production_orders?.formulas?.name || '';
    const term = searchTerm.toLowerCase();
    return batchNum.toLowerCase().includes(term) || formulaName.toLowerCase().includes(term);
  });

  const pendingChecks = filteredChecks.filter(c => c.status === 'pending');
  const historyChecks = filteredChecks.filter(c => c.status !== 'pending');

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#202eac]" /> Qualidade
          </h1>
          <p className="text-sm text-slate-500 mt-1">Análise de parâmetros e liberação de lotes</p>
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
          <div className="px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Reprovados</div>
            <div className="text-xl font-black text-red-600">{checks.filter(c => c.status === 'rejected').length}</div>
          </div>
        </div>
      </header>

      {/* TABS NAVIGATION */}
      <div className="bg-white border-b border-slate-200 px-8 flex gap-6 shrink-0">
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'border-[#202eac] text-[#202eac]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Activity className="w-4 h-4" /> Dashboard (Fila de Inspeção)
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`py-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'history' ? 'border-[#202eac] text-[#202eac]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <FileSpreadsheet className="w-4 h-4" /> Resultados (Histórico)
        </button>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          
          {/* SEARCH BAR */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 mb-6">
            <Search className="w-5 h-5 text-slate-400 ml-2" />
            <input
              type="text"
              placeholder="Buscar lote ou fórmula..."
              className="flex-1 outline-none text-sm p-1"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* ------------- ABA 1: PENDING ------------- */}
          {activeTab === 'pending' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* LIST */}
              <div className="lg:col-span-5 space-y-4">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Fila Aguardando
                </h2>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {isLoading ? (
                    <div className="text-center py-12 text-slate-400">Carregando lotes...</div>
                  ) : pendingChecks.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-400 italic">
                      🎉 Nenhum lote pendente de análise!
                    </div>
                  ) : (
                    pendingChecks.map(check => (
                      <button
                        key={check.id}
                        onClick={() => handleSelectCheck(check)}
                        className={`w-full p-5 rounded-2xl border-2 transition-all flex flex-col gap-3 text-left ${selectedCheck?.id === check.id
                          ? 'border-[#202eac] bg-blue-50'
                          : 'border-white bg-white hover:border-slate-200 shadow-sm'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">
                            {check.production_orders?.batch_number}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase">
                            <Clock className="w-3 h-3" /> Pendente
                          </span>
                        </div>
                        <div>
                          <div className="font-black text-slate-800 text-lg leading-tight">{check.production_orders?.formulas?.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                            <Beaker className="w-3 h-3 text-blue-400" /> Volume: {check.production_orders?.planned_volume}L
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* FORM */}
              <div className="lg:col-span-7">
                {selectedCheck && selectedCheck.status === 'pending' ? (
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
                          <div className="flex justify-between items-end mb-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Valor de pH</label>
                            {(selectedCheck.production_orders?.formulas?.ph_min || selectedCheck.production_orders?.formulas?.ph_max) && (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                Alvo: {selectedCheck.production_orders?.formulas?.ph_min || '?'} - {selectedCheck.production_orders?.formulas?.ph_max || '?'}
                              </span>
                            )}
                          </div>
                          {(() => {
                            const val = parseFloat(ph);
                            const min = parseFloat(selectedCheck.production_orders?.formulas?.ph_min || '');
                            const max = parseFloat(selectedCheck.production_orders?.formulas?.ph_max || '');
                            const isOut = !isNaN(val) && ((!isNaN(min) && val < min) || (!isNaN(max) && val > max));
                            return (
                              <div className="relative">
                                <input type="number" step="0.1" value={ph} onChange={e => setPh(e.target.value)}
                                  className={`w-full px-4 py-3 bg-slate-50 border-2 ${isOut ? 'border-red-400 text-red-600 focus:ring-red-500/20' : 'border-slate-200 focus:ring-[#202eac]/20'} rounded-xl focus:ring-2 outline-none font-bold text-lg transition-colors`}
                                  placeholder="ex: 7.0" />
                                {isOut && <span className="absolute -bottom-5 left-1 text-[10px] font-bold text-red-500">(Fora da Especificação)</span>}
                              </div>
                            )
                          })()}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-end mb-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Viscosidade (cP)</label>
                            {(selectedCheck.production_orders?.formulas?.viscosity_min || selectedCheck.production_orders?.formulas?.viscosity_max) && (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                Alvo: {selectedCheck.production_orders?.formulas?.viscosity_min || '?'} - {selectedCheck.production_orders?.formulas?.viscosity_max || '?'} cP
                              </span>
                            )}
                          </div>
                          {(() => {
                            const val = parseFloat(viscosity);
                            const min = parseFloat(selectedCheck.production_orders?.formulas?.viscosity_min || '');
                            const max = parseFloat(selectedCheck.production_orders?.formulas?.viscosity_max || '');
                            const isOut = !isNaN(val) && ((!isNaN(min) && val < min) || (!isNaN(max) && val > max));
                            return (
                              <div className="relative">
                                <input type="number" value={viscosity} onChange={e => setViscosity(e.target.value)}
                                  className={`w-full px-4 py-3 bg-slate-50 border-2 ${isOut ? 'border-red-400 text-red-600 focus:ring-red-500/20' : 'border-slate-200 focus:ring-[#202eac]/20'} rounded-xl focus:ring-2 outline-none font-bold text-lg transition-colors`}
                                  placeholder="ex: 1200" />
                                {isOut && <span className="absolute -bottom-5 left-1 text-[10px] font-bold text-red-500">(Fora da Especificação)</span>}
                              </div>
                            )
                          })()}
                        </div>
                      </div>

                      <div className="space-y-4 mt-6 pt-4 border-t border-slate-100 pb-2">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#202eac]" /> Avaliação Visual e Sensorial</h3>
                        <div className="grid grid-cols-3 gap-3">
                          {['Cor', 'Odor', 'Aspecto'].map((label, idx) => {
                            const state = idx === 0 ? color : idx === 1 ? odor : appearance;
                            const setter = idx === 0 ? setColor : idx === 1 ? setOdor : setAppearance;
                            return (
                              <div key={label} className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">{label}</label>
                                <select value={state} onChange={e => setter(e.target.value)}
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none">
                                  <option value="Conforme">Conforme</option>
                                  <option value="Não Conforme">Não Conforme</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Observações e Desvios</label>
                        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 outline-none resize-none text-sm"
                          placeholder="Relate anomalias ou o motivo de reprovação..." />
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-slate-500 shrink-0">
                          <User className="w-4 h-4 text-[#202eac]" />
                          <input type="text" placeholder="Nome do Analista" value={analyst} onChange={e => setAnalyst(e.target.value)}
                            className="text-xs font-bold w-40 bg-transparent outline-none border-b border-transparent focus:border-[#202eac] py-1" />
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => handleApproveReject('rejected')} disabled={isSaving || !analyst}
                            className="px-6 py-3 bg-white border-2 border-red-500 text-red-500 font-black rounded-2xl hover:bg-red-50 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50">
                            <XCircle className="w-4 h-4" /> REPROVAR (PERDA)
                          </button>
                          <button onClick={() => handleApproveReject('approved')} disabled={isSaving || !analyst}
                            className="px-8 py-3 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-xl shrink-0 disabled:opacity-50">
                            <CheckCircle2 className="w-5 h-5" /> APROVAR LOTE (GERAR PA)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-center opacity-60">
                    <ShieldCheck className="w-16 h-16 text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-400">Selecione um Lote Pendente</h3>
                    <p className="text-sm text-slate-400 max-w-xs mt-2">Clique em um dos lotes na Fila de Inspeção para realizar a análise e decidir o destino produtivo.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------- ABA 2: HISTORY ------------- */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#202eac]" /> Desempenho e Histórico de Qualidade
                </h2>
              </div>
              
              {historyChecks.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic">Nenhum laudo finalizado até o momento.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {historyChecks.map(check => {
                    const isApproved = check.status === 'approved';
                    return (
                      <div key={check.id} className={`p-4 rounded-xl border-l-4 shadow-sm flex flex-col justify-between ${
                        isApproved ? 'border-l-emerald-500 bg-emerald-50/30 border-slate-200' : 'border-l-red-500 bg-red-50/30 border-slate-200'
                      }`}>
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-500">
                              {check.production_orders?.batch_number}
                            </span>
                            {isApproved ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3"/> Aprovado</span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase bg-red-100 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3"/> Reprovado</span>
                            )}
                          </div>
                          <h3 className="font-black text-slate-800 text-sm line-clamp-1">{check.production_orders?.formulas?.name}</h3>
                          <div className="mt-3 flex gap-4">
                            <div className="text-xs text-slate-500"><span className="font-bold">pH:</span> {check.ph_value || '-'}</div>
                            <div className="text-xs text-slate-500"><span className="font-bold">Visc:</span> {check.viscosity_value || '-'}</div>
                          </div>
                          {check.notes && (
                            <div className="mt-2 text-[10px] text-slate-500 bg-white p-2 rounded border border-slate-100 line-clamp-2">
                              {check.notes}
                            </div>
                          )}
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100/50 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1"><User className="w-3 h-3"/> {check.analyst_name || 'Desconhecido'}</span>
                            <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-bold">{new Date(check.created_at).toLocaleDateString()}</span>
                          </div>
                          <button 
                            onClick={() => handlePrint(check)}
                            className="p-2 border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white bg-blue-50 rounded-lg transition-colors group flex items-center gap-2"
                            title="Imprimir Certificado de Análise / Laudo"
                          >
                            <Printer className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto overflow-hidden transition-all delay-75">Laudo</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Aviso Fixos */}
          <div className="mt-6 bg-slate-800 text-slate-300 p-4 rounded-xl flex items-center gap-3 text-xs italic">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="flex-1">
              <strong>Importante:</strong> Decisões tomadas são imutáveis. Lotes aprovados originam Produtos Acabados (PA) prontos para venda no Estoque Automático. Lotes reprovados sofrem interdição (arquivados em Resultados) e não chegam ao módulo de PA.
            </p>
          </div>

        </div>
      </div>
      {/* Modal de Confirmação Visual */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        detail={confirmModal.detail}
        type={confirmModal.type}
        confirmLabel={confirmModal.confirmLabel}
      />
    </div>
  );
}
