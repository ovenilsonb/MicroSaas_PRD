import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  FileBarChart,
  AlertTriangle,
  TrendingUp,
  Package,
  Beaker,
  Calendar,
  ChevronRight,
  ArrowRight,
  Plus,
  Activity,
  DollarSign,
  Settings2,
  GripHorizontal,
  PieChart,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  Info,
  X,
  XCircle,
  Printer,
  FileText,
  Factory,
  Scale,
  Trash2
} from 'lucide-react';
import { useStorageMode } from '../contexts/StorageModeContext';
import { ConfirmModal, ConfirmModalType } from './shared/ConfirmModal';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  estoque_atual: number;
  estoque_minimo: number;
  cost_per_unit: number;
  expiry_date: string | null;
  validade_indeterminada: boolean;
  produto_quimico?: boolean;
}

interface Formula {
  id: string;
  name: string;
  base_volume: number;
  version: string;
  status: string;
  packaging_variant_id?: string;
  label_variant_id?: string;
  instructions?: string;
  formula_ingredients: {
    ingredient_id: string;
    quantity: number;
    ingredients: any;
    variants?: any;
  }[];
}

export default function Relatorios() {
  const { mode } = useStorageMode();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [qualityControls, setQualityControls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Impressão
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [savedProportions, setSavedProportions] = useState<any[]>([]);
  const [selectedProportionId, setSelectedProportionId] = useState<string>('');
  const [pricingEntries, setPricingEntries] = useState<any[]>([]);
  const [selectedPricingFormulaId, setSelectedPricingFormulaId] = useState<string>('');
  const [selectedPricingCapacity, setSelectedPricingCapacity] = useState<string>('');
  const [selectedPricingType, setSelectedPricingType] = useState<'varejo' | 'atacado' | 'fardo'>('varejo');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; detail?: string;
    type: ConfirmModalType; confirmLabel?: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {} });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setIsLoading(true);
      if (mode === 'supabase') {
        const [ingRes, forRes, ordRes, qcRes] = await Promise.all([
          supabase.from('ingredients').select('*, variants (*)'),
          supabase.from('formulas').select(`
            id, name, base_volume, version, status, instructions, 
            packaging_variant_id, label_variant_id,
            formula_ingredients (
              ingredient_id,
              quantity,
              ingredients (name, unit, cost_per_unit, produto_quimico),
              variants (name, cost_per_unit)
            )
          `),
          supabase.from('production_orders').select('*'),
          supabase.from('quality_controls').select('*')
        ]);

        if (ingRes.error) throw ingRes.error;
        if (forRes.error) throw forRes.error;

        setIngredients(ingRes.data || []);
        setFormulas(forRes.data || []);
        setOrders(ordRes.data || []);
        setQualityControls(qcRes.data || []);
      } else {
        const getLocal = (key: string) => {
          try {
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        };

        setIngredients(getLocal('local_ingredients'));
        setFormulas(getLocal('local_formulas'));
        setOrders(getLocal('local_production_orders'));
        setQualityControls(getLocal('local_quality_controls'));
      }

      // SEMPRE carregar simulações locais (Memorial de Cálculo), mesmo em modo Supabase
      const rawProps = localStorage.getItem('local_proportions');
      try {
        const parsedProps = rawProps ? JSON.parse(rawProps) : [];
        if (Array.isArray(parsedProps)) {
          // Filtrar simulações corrompidas para evitar crashes na renderização
          const validProps = parsedProps.filter(p => p && typeof p === 'object' && p.displayName);
          setSavedProportions(validProps);
        } else {
          setSavedProportions([]);
        }
      } catch {
        setSavedProportions([]);
      }

      // Carregar dados de precificação
      try {
        const rawPricing = localStorage.getItem('precificacao_entries');
        setPricingEntries(rawPricing ? JSON.parse(rawPricing) : []);
      } catch {
        setPricingEntries([]);
      }
    } catch (err) {
      console.error('Erro ao buscar dados para relatórios:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeleteProportion = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Simulação',
      message: 'Deseja realmente excluir esta simulação? Esta ação não pode ser desfeita.',
      type: 'danger',
      confirmLabel: 'Sim, Excluir',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const remaining = savedProportions.filter(p => p.id !== id);
          localStorage.setItem('local_proportions', JSON.stringify(remaining));
          setSavedProportions(remaining);
          if (selectedProportionId === id) setSelectedProportionId('');
        } catch (e) {
          console.error('Erro ao excluir simulação:', e);
        }
      },
    });
  };

  const handleClearAllProportions = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Limpar Todas as Simulações',
      message: 'Deseja realmente apagar TODAS as simulações arquivadas? Esta ação não pode ser desfeita.',
      type: 'danger',
      confirmLabel: 'Sim, Apagar Todas',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          localStorage.removeItem('local_proportions');
          setSavedProportions([]);
          setSelectedProportionId('');
        } catch (e) {
          console.error('Erro ao limpar simulações:', e);
        }
      },
    });
  };

  const stats = useMemo(() => {
    const lowStock = ingredients.filter(i => i.estoque_atual <= i.estoque_minimo);
    const expiringSoon = ingredients.filter(i => {
      if (i.validade_indeterminada || !i.expiry_date) return false;
      const expiry = new Date(i.expiry_date);
      const now = new Date();
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && diffDays >= 0;
    });

    const totalInventoryValue = ingredients.reduce((sum, i) => sum + (i.estoque_atual * i.cost_per_unit), 0);

    const formulaCosts = formulas.map(f => {
      const cost = f.formula_ingredients.reduce((sum, item) => {
        let itemCost = 0;
        const variantData = Array.isArray(item.variants) ? item.variants[0] : item.variants;
        const ingredientData = Array.isArray(item.ingredients) ? item.ingredients[0] : item.ingredients;

        const variantCost = variantData?.cost_per_unit;
        const ingredientCost = ingredientData?.cost_per_unit;

        if (variantCost !== undefined && variantCost !== null) {
          itemCost = variantCost;
        } else if (ingredientCost !== undefined && ingredientCost !== null) {
          itemCost = ingredientCost;
        }
        return sum + (item.quantity * itemCost);
      }, 0);
      return { name: f.name, cost };
    });

    const mostExpensiveFormula = [...formulaCosts].sort((a, b) => b.cost - a.cost)[0];

    return {
      lowStock,
      expiringSoon,
      totalInventoryValue,
      mostExpensiveFormula,
      totalIngredients: ingredients.length,
      totalFormulas: formulas.length
    };
  }, [ingredients, formulas]);

  const productionStats = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');
    const totalVolume = completedOrders.reduce((sum, o) => sum + (Number(o.planned_volume) || 0), 0);

    const decidedQC = qualityControls.filter(q => q.status === 'approved' || q.status === 'rejected');
    const approvedQC = decidedQC.filter(q => q.status === 'approved');
    const rejectedQC = decidedQC.filter(q => q.status === 'rejected');

    return {
      completedOrdersCount: completedOrders.length,
      cancelledOrdersCount: cancelledOrders.length,
      totalVolume,
      approvedQCCount: approvedQC.length,
      rejectedQCCount: rejectedQC.length,
      approvalRate: decidedQC.length > 0 ? (approvedQC.length / decidedQC.length) * 100 : 0
    };
  }, [orders, qualityControls]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // --- Printing Engine (Anti-Bloqueio via Iframe) ---
  const triggerPrint = (htmlContent: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    iframe.contentDocument?.write(htmlContent);
    iframe.contentDocument?.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  const cssPrintStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    
    @page { margin: 15mm; size: auto; }
    
    body { 
      font-family: 'Inter', sans-serif; 
      color: #1e293b; 
      margin: 0; 
      padding: 0;
      line-height: 1.4;
      background: white; 
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact; 
    }

    /* Layout de Blocos (Cards) */
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 25px;
      background: #f8fafc;
      page-break-inside: avoid;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #202eac;
      padding-bottom: 12px;
    }

    .card-title {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }

    /* Grid de Metadados */
    .grid {
      display: grid;
      gap: 20px;
      margin-bottom: 20px;
    }
    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }

    .data-item { display: flex; flex-direction: column; }
    .data-label { 
      font-size: 9px; 
      font-weight: 800; 
      color: #64748b; 
      text-transform: uppercase; 
      margin-bottom: 4px; 
      letter-spacing: 0.8px;
    }
    .data-value { 
      font-size: 14px; 
      font-weight: 700; 
      color: #0f172a; 
    }

    /* Tabelas Profissionais */
    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px; }
    th { 
      background: #f1f5f9; 
      text-align: left; 
      padding: 12px 14px; 
      font-size: 10px; 
      font-weight: 800; 
      color: #475569; 
      text-transform: uppercase; 
      border-bottom: 2px solid #cbd5e1;
    }
    td { 
      padding: 10px 14px; 
      font-size: 12px; 
      color: #334155; 
      border-bottom: 1px solid #f1f5f9; 
    }
    .row-highlight { font-weight: 700; color: #0f172a; }
    .row-sub { font-size: 10px; color: #64748b; }

    /* Destaques e Alertas */
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .badge-primary { background: #e0e7ff; color: #202eac; }
    .badge-success { background: #dcfce7; color: #166534; }
    
    /* Blocos de Observação e Assinaturas */
    .note-block {
      background: #fffbeb;
      border: 1px dashed #fcd34d;
      padding: 15px;
      border-radius: 8px;
      font-size: 11px;
      color: #92400e;
      margin-top: 20px;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 60px;
      margin-top: 60px;
      page-break-inside: avoid;
    }
    .signature-box {
      border-top: 1px solid #cbd5e1;
      padding-top: 10px;
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
    }

    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 100px;
      font-weight: 900;
      color: rgba(32, 46, 172, 0.03);
      z-index: -1;
      white-space: nowrap;
      pointer-events: none;
    }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .text-primary { color: #202eac; }

    /* Cabeçalho do Relatório */
    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .logo-img {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }
    .company-info {
      display: flex;
      flex-direction: column;
    }
    .company-name {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .report-meta {
      text-align: right;
    }
    
    .footer {
      position: fixed;
      bottom: 10mm;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 10px;
    }
  `;

  const reportHeader = (title: string, subtitle: string) => `
    <div class="report-header">
      <div class="logo-container">
        <img src="/logo.png" class="logo-img" onerror="this.style.display='none'; document.getElementById('text-logo').style.display='flex';" />
        <div id="text-logo" style="display:none; width:50px; height:50px; background:#202eac; border-radius:50%; align-items:center; justify-content:center; color:white; font-weight:900; font-size:20px;">OC</div>
        <div class="company-info">
          <div class="company-name">OHANA CLEAN</div>
          <div style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Soluções em Limpeza Industrial</div>
        </div>
      </div>
      <div class="report-meta">
        <div style="font-size: 11px; font-weight: 800; color: #202eac; text-transform: uppercase;">${title}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${subtitle}</div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  `;

  const handlePrintFormula = () => {
    if (!selectedFormulaId) return;
    const formula = formulas.find(f => f.id === selectedFormulaId);
    if (!formula) return;

    const items = (formula.formula_ingredients || []).map(fi => {
      const ing = Array.isArray(fi.ingredients) ? fi.ingredients[0] : fi.ingredients;
      const variant = Array.isArray(fi.variants) ? fi.variants[0] : fi.variants;
      const isChem = ing?.produto_quimico !== false;
      const name = ing?.name + (variant?.name ? ` - ${variant.name}` : '');
      const costRaw = variant?.cost_per_unit ?? ing?.cost_per_unit ?? 0;
      const cost = typeof costRaw === 'string' ? parseFloat(costRaw.replace(/\./g, '').replace(',', '.')) || 0 : costRaw;
      return {
        name,
        isChem,
        unit: ing?.unit || 'un',
        qty: fi.quantity,
        cost,
        subtotal: fi.quantity * cost
      };
    });

    const chemicals = items.filter(i => i.isChem);
    const packaging = items.filter(i => !i.isChem);
    const totalVolume = chemicals.reduce((sum, i) => sum + i.qty, 0) || formula.base_volume || 1;
    const totalCost = items.reduce((sum, i) => sum + i.subtotal, 0);

    const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatVol = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ficha Técnica - ${formula.name}</title>
        <style>${cssPrintStyles}</style>
      </head>
      <body>
        <div class="watermark">FICHA TÉCNICA P&D</div>
        ${reportHeader('Ficha Técnica de Produto', `Fórmula: ${formula.name}`)}

          <div class="grid grid-4 text-center">
            <div class="data-item">
              <span class="data-label">Produto</span>
              <span class="data-value text-primary">${formula.name}</span>
            </div>
            <div class="data-item">
              <span class="data-label">Versão Operacional</span>
              <span class="data-value">${(formula.version || 'v1.0').toLowerCase()}</span>
            </div>
            <div class="data-item">
              <span class="data-label">Lote Base</span>
              <span class="data-value">${formatVol(formula.base_volume)} L/Kg</span>
            </div>
             <div class="data-item">
              <span class="data-label">Data de Revisão</span>
              <span class="data-value">${new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div style="font-size: 11px; font-weight: 800; color: #475569; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
            1. Análise de Composição Química (BOM)
          </div>
          <table>
            <thead>
              <tr>
                <th>Insumo Químico</th>
                <th class="text-right">Quantidade</th>
                <th class="text-center">Unid.</th>
                <th class="text-right">Proporção (%)</th>
                <th class="text-right">Custo Unitário</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${chemicals.map(c => `
                <tr>
                  <td class="font-bold">${c.name}</td>
                  <td class="text-right">${formatVol(c.qty)}</td>
                  <td class="text-center">${c.unit.toUpperCase()}</td>
                  <td class="text-right text-primary font-bold">${((c.qty / totalVolume) * 100).toFixed(2)}%</td>
                  <td class="text-right" style="color: #64748b;">${formatBRL(c.cost)}</td>
                  <td class="text-right font-bold">${formatBRL(c.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${packaging.length > 0 ? `
        <div class="card">
          <div style="font-size: 11px; font-weight: 800; color: #475569; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
            2. Materiais de Embalagem e Acondicionamento
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-right">Quantidade</th>
                <th class="text-center">Unid.</th>
                <th class="text-right">Custo Unitário</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${packaging.map(p => `
                <tr>
                  <td class="font-bold">${p.name}</td>
                  <td class="text-right">${formatVol(p.qty)}</td>
                  <td class="text-center">${p.unit.toUpperCase()}</td>
                  <td class="text-right" style="color: #64748b;">${formatBRL(p.cost)}</td>
                  <td class="text-right font-bold">${formatBRL(p.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="grid grid-2">
          <div class="card" style="background: #f1f5f9; border: none;">
            <div class="data-label">Precificação Estrutural</div>
            <div class="grid grid-2" style="margin-top: 15px;">
              <div>
                <span class="data-label">Custo/Litro</span>
                <div class="data-value text-primary" style="font-size: 20px;">${formatBRL(totalCost / formula.base_volume)}</div>
              </div>
              <div>
                <span class="data-label">Custo/Lote</span>
                <div class="data-value" style="font-size: 20px;">${formatBRL(totalCost)}</div>
              </div>
            </div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <div class="data-label">Instruções de Manipulação</div>
            <div style="font-size: 11px; color: #334155; margin-top: 10px; line-height: 1.6; font-style: italic;">
              ${formula.instructions || 'Nenhuma instrução operacional padrão (POP) registrada para este produto.'}
            </div>
          </div>
        </div>

        <div class="signature-grid">
          <div class="signature-box">Gestor de P&D / Responsável Técnico</div>
          <div class="signature-box">Diretoria Industrial / Qualidade</div>
        </div>

        <div class="footer">
          Ohana Clean Planner — Relatório Gerencial de Engenharia de Produto — Confidencial
        </div>
      </body>
      </html>
    `;
    triggerPrint(html);
  };

  const handlePrintProportion = () => {
    const prop = savedProportions.find(p => p.id === selectedProportionId);
    if (!prop) return;

    const formatVol = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Proporção - ${prop.formulaName}</title>
        <style>${cssPrintStyles}</style>
      </head>
      <body>
        <div class="watermark">MEMORIAL DE CÁLCULO</div>
        ${reportHeader('Memorial de Cálculo Industrial', `Simulação: ${prop.displayName}`)}
            <span class="card-title">Instrução de Proporção (Operacional)</span>
            <span class="badge badge-primary">ID: ${prop.id.slice(0, 8).toUpperCase()}</span>
          </div>

          <div class="grid grid-4 text-center">
            <div class="data-item">
              <span class="data-label">Data Emissão</span>
              <span class="data-value">${new Date(prop.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            <div class="data-item">
              <span class="data-label">Produto Alvo</span>
              <span class="data-value text-primary">${prop.formulaName}</span>
            </div>
            <div class="data-item">
              <span class="data-label">Versão Base</span>
              <span class="data-value">${prop.formulaVersion || 'v1.0'}</span>
            </div>
            <div class="data-item">
              <span class="data-label">Meta de Produção</span>
              <span class="data-value" style="font-size: 18px;">${formatVol(prop.targetVolume)} L/Kg</span>
            </div>
          </div>
        </div>

        <div class="card" style="background: white; border-color: #cbd5e1;">
          <div style="font-size: 12px; font-weight: 900; color: #475569; margin-bottom: 15px; border-left: 4px solid #202eac; padding-left: 10px;">
            LISTA DE ESCALONAMENTO DE INSUMOS
          </div>
          <table>
            <thead>
              <tr>
                <th>Componente / Insumo</th>
                <th>Origem</th>
                <th class="text-right">Quantidade</th>
                <th class="text-center">Unidade</th>
                <th class="text-right">Part. (%)</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
        const totalChem = prop.ingredients.reduce((sum: number, i: any) => i.isChemical ? sum + i.quantity : sum, 0) || 1;
        return prop.ingredients.map((ing: any) => {
          const percentage = ing.percentage ?? (ing.isChemical ? (ing.quantity / totalChem) * 100 : 0);
          return `
                    <tr>
                      <td>
                        <div class="row-highlight">${ing.name}</div>
                        <div class="row-sub">${ing.isChemical ? 'Produto de Base Química' : 'Componente de Envase/Logística'}</div>
                      </td>
                      <td class="text-center">
                        <span class="badge ${ing.isChemical ? 'badge-primary' : 'badge-success'}">${ing.isChemical ? 'Químico' : 'Embalagem'}</span>
                      </td>
                      <td class="text-right font-bold" style="font-size: 15px;">${formatVol(ing.quantity)}</td>
                      <td class="text-center">${ing.unit.toUpperCase()}</td>
                      <td class="text-right" style="color: #64748b;">${Number(percentage || 0).toFixed(2)}%</td>
                    </tr>
                  `;
        }).join('');
      })()}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: 900;">
                <td colspan="4" class="text-right text-primary">VALOR TOTAL DO LOTE (PREVISTO)</td>
                <td class="text-right" style="font-size: 16px; color: #202eac;">${formatCurrency(prop.totalCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="grid grid-2">
          <div class="card" style="margin-bottom:0;">
            <div class="data-label">Custo Médio Unitário</div>
            <div class="data-value" style="font-size: 24px; color: #202eac;">${formatCurrency(prop.targetVolume > 0 ? prop.totalCost / prop.targetVolume : 0)} <span style="font-size: 12px; color: #64748b; font-weight: 400;">/ L-Kg</span></div>
          </div>
          <div class="card" style="margin-bottom:0; background: #fffbeb; border-color: #fcd34d;">
             <div class="data-label" style="color: #92400e;">Observações Críticas do Operador</div>
             <div style="height: 60px; border: 1px dashed #fcd34d; margin-top: 10px; border-radius: 4px;"></div>
             <div class="row-sub" style="margin-top: 5px;">Anotar desvios de pH, densidade ou temperatura se houver.</div>
          </div>
        </div>

        <div class="note-block">
          <strong>Atenção ao Operador:</strong> Certifique-se de que todos os equipamentos de proteção individual (EPIs) estejam sendo utilizados conforme o FISPQ de cada insumo. O memorial de cálculo acima é baseado nas proporções técnicas aprovadas pelo laboratório.
        </div>

        <div class="signature-grid">
          <div class="signature-box">Responsável pela Pesagem / Preparo</div>
          <div class="signature-box">Conferência Técnica / Qualidade</div>
        </div>

        <div class="footer">
          Gerado via Ohana Clean Planner — Tecnologias de Gestão para Microssaas Industrial — Documento Operacional Interno
        </div>
      </body>
      </html>
    `;
    triggerPrint(html);
  };

  const handlePrintOrder = () => {
    if (!selectedOrderId) return;
    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) return;

    const formulaId = order.formula_id;
    const formula = formulas.find(f => f.id === formulaId);

    // Proporcionamento (Escala)
    const baseVol = formula?.base_volume || 1;
    const scale = (order.planned_volume || 0) / baseVol;

    const items = (formula?.formula_ingredients || []).map(fi => {
      const ing = Array.isArray(fi.ingredients) ? fi.ingredients[0] : fi.ingredients;
      const variant = Array.isArray(fi.variants) ? fi.variants[0] : fi.variants;
      const isChem = ing?.produto_quimico !== false;
      const name = ing?.name + (variant?.name ? ` (${variant.name})` : '');
      const costRaw = variant?.cost_per_unit ?? ing?.cost_per_unit ?? 0;
      const cost = typeof costRaw === 'string' ? parseFloat(costRaw.replace(/\./g, '').replace(',', '.')) || 0 : costRaw;
      const scaledQty = fi.quantity * scale;

      const batchUsed = (order.ingredientBatches || []).find((b: any) => b.ingredientId === fi.ingredient_id);

      return {
        name,
        isChem,
        unit: ing?.unit || 'un',
        qty: scaledQty,
        cost,
        subtotal: scaledQty * cost,
        supplierBatch: batchUsed?.supplierBatch || '-'
      };
    });

    const chemicals = items.filter(i => i.isChem);
    let packaging = items.filter(i => !i.isChem);
    const totalVolume = chemicals.reduce((sum, i) => sum + i.qty, 0) || order.planned_volume || 1;

    // Substituir pela embalagem parametrizada se houver distribuição de envase
    const planPacks = order.packagingPlan || [];
    if (planPacks.length > 0) {
      packaging = planPacks.map((p: any) => ({
        name: p.name,
        isChem: false,
        unit: p.unit || 'un',
        qty: p.quantity,
        cost: p.cost,
        subtotal: p.quantity * p.cost,
        supplierBatch: '-'
      }));
    }

    const formatVol = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OF - ${order.batch_number}</title>
        <style>${cssPrintStyles}</style>
      </head>
      <body>
        <div class="watermark">ORDEM DE FABRICAÇÃO</div>
        ${reportHeader('Ordem de Fabricação (OF)', `Lote: ${order.batch_number}`)}

          <div class="grid grid-3 text-center">
            <div class="data-item">
              <span class="data-label">Produto / Fórmula</span>
              <span class="data-value">${formula?.name || 'Fórmula Desconhecida'}</span>
            </div>
            <div class="data-item">
              <span class="data-label">Volume do Lote</span>
              <span class="data-value" style="font-size: 18px; color: #10b981;">${formatVol(order.planned_volume)} L/Kg</span>
            </div>
            <div class="data-item">
              <span class="data-label">Data de Fabricação</span>
              <span class="data-value">${order.end_date ? new Date(order.end_date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
          
          <div class="grid grid-3 text-center" style="margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            <div class="data-item">
              <span class="data-label">Operador Responsável</span>
              <span class="data-value">${order.operatorName || 'Não Informado'}</span>
            </div>
            <div class="data-item">
              <span class="data-label">Status Final</span>
              <span class="badge ${order.status === 'completed' ? 'badge-success' : 'badge-primary'}" style="align-self: center; margin-top: 4px;">
                ${order.status === 'completed' ? 'FINALIZADO' : 'EM PROCESSAMENTO'}
              </span>
            </div>
            <div class="data-item">
              <span class="data-label">ID Único do Sistema</span>
              <span class="data-value" style="font-family: monospace; font-size: 10px;">${order.id}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div style="font-size: 11px; font-weight: 800; color: #475569; margin-bottom: 12px; text-transform: uppercase;">
            1. Rastreabilidade de Insumos Químicos
          </div>
          <table>
            <thead>
              <tr>
                <th>Elemento Químico Consumido</th>
                <th class="text-right">Volume Escalonado</th>
                <th class="text-center">Unid.</th>
                <th class="text-right">Concentração (%)</th>
                <th style="padding-left: 20px;">Lote Original (Fornecedor)</th>
              </tr>
            </thead>
            <tbody>
              ${chemicals.map(c => `
                <tr>
                  <td class="font-bold">${c.name}</td>
                  <td class="text-right font-bold">${formatVol(c.qty)}</td>
                  <td class="text-center">${c.unit.toUpperCase()}</td>
                  <td class="text-right" style="color: #64748b;">${((c.qty / totalVolume) * 100).toFixed(2)}%</td>
                  <td style="padding-left: 20px;">
                    ${c.supplierBatch !== '-' ? `<span class="badge badge-primary">${c.supplierBatch}</span>` : '<span style="color:#cbd5e1">—</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${packaging.length > 0 ? `
        <div class="card">
          <div style="font-size: 11px; font-weight: 800; color: #475569; margin-bottom: 12px; text-transform: uppercase;">
            2. Lista de Envase e Rastreamento de Embalagem
          </div>
          <table>
            <thead>
              <tr>
                <th>Componente Logístico</th>
                <th class="text-right">Quantidade</th>
                <th class="text-center">Unid.</th>
                <th style="padding-left: 20px;">Lote (Fornecedor)</th>
              </tr>
            </thead>
            <tbody>
              ${packaging.map(p => `
                <tr>
                  <td class="font-bold">${p.name}</td>
                  <td class="text-right font-bold">${formatVol(p.qty)}</td>
                  <td class="text-center">${p.unit.toUpperCase()}</td>
                  <td style="padding-left: 20px;">
                    ${p.supplierBatch !== '-' ? `<span class="badge badge-success">${p.supplierBatch}</span>` : '<span style="color:#cbd5e1">—</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="card">
          <div class="data-label">3. Relatório de Ocorrências e Desvios de Processo</div>
          <div style="min-height: 100px; border: 1px dashed #cbd5e1; margin-top: 10px; border-radius: 8px; padding: 15px; font-size: 10px; color: #94a3b8; font-style: italic;">
            Descreva qualquer anormalidade durante a mistura, variações de temperatura, tempo de agitação ou intercorrências mecânicas.
          </div>
        </div>

        <div class="signature-grid">
          <div class="signature-box">Rubrica Operador Principal</div>
          <div class="signature-box">Visto Qualidade (CQA)</div>
        </div>

        <div class="footer">
          Ohana Clean Planner — Sistema Industrial de Rastreabilidade — OF Emitida em ${new Date().toLocaleString('pt-BR')}
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintPricing = () => {
    if (!selectedPricingFormulaId || !selectedPricingCapacity || !selectedPricingType) return;

    const formula = formulas.find(f => f.id === selectedPricingFormulaId);
    const entry = pricingEntries.find(e =>
      e.formulaId === selectedPricingFormulaId &&
      String(e.capacityKey) === String(selectedPricingCapacity)
    );

    if (!formula || !entry) return;

    // Calcular custos
    const calcRawCost = (f: any) =>
      f.formula_ingredients?.reduce((sum: number, item: any) => {
        const ing = Array.isArray(item.ingredients) ? item.ingredients[0] : item.ingredients;
        const variant = Array.isArray(item.variants) ? item.variants[0] : item.variants;
        const costRaw = variant?.cost_per_unit ?? ing?.cost_per_unit ?? 0;
        const cost = typeof costRaw === 'string' ? parseFloat(costRaw.replace(/\./g, '').replace(',', '.')) || 0 : costRaw;
        return sum + item.quantity * cost;
      }, 0) || 0;

    const rawCostTotal = calcRawCost(formula);
    const capacity = parseFloat(selectedPricingCapacity);
    const rawCostPerUnit = (rawCostTotal / (formula.base_volume || 1)) * capacity;
    
    // Função auxiliar para processar custos idêntica à da Precificação
    const parseCostVal = (v: any): number => {
        if (!v) return 0;
        if (typeof v === 'number') return v;
        const s = String(v).replace(/\./g, '').replace(',', '.');
        return parseFloat(s) || 0;
    };

    // Montar lista de opções de embalagem baseada nos insumos cadastrados (mesma lógica do Precificacao.tsx)
    const packagingOptions: any[] = [];
    ingredients.forEach((ing: any) => {
        const m = ing.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT)/i);
        let cap = 0;
        if (m) { 
            cap = parseFloat(m[1].replace(',', '.')); 
            if (m[2].toLowerCase() === 'ml') cap /= 1000; 
        }
        if (cap > 0) packagingOptions.push({ id: ing.id, variant_id: null, name: ing.name, cost: parseCostVal(ing.cost_per_unit), capacity: cap });
        if (ing.variants) {
          ing.variants.forEach((v: any) => {
            const vm = v.name?.match(/(\d+[.,]?\d*)\s*(L|ml|LT)/i);
            let vc = cap;
            if (vm) { 
                vc = parseFloat(vm[1].replace(',', '.')); 
                if (vm[2].toLowerCase() === 'ml') vc /= 1000; 
            }
            if (vc > 0) packagingOptions.push({ id: ing.id, variant_id: v.id, name: v.name || ing.name, cost: parseCostVal(v.cost_per_unit || ing.cost_per_unit), capacity: vc });
          });
        }
    });

    // 1. Busca custo de embalagem (Prioridade: ID de variante vinculada + Capacidade)
    const pkgVariantId = formula.packaging_variant_id;
    let pkgOpt = pkgVariantId 
        ? packagingOptions.find(p => p.variant_id === pkgVariantId && Math.abs(p.capacity - capacity) < 0.001)
        : null;
    
    // Fallback: Busca apenas pela capacidade se não houver variante ou não bater
    if (!pkgOpt) {
        pkgOpt = packagingOptions.find(p => Math.abs(p.capacity - capacity) < 0.001 && !p.name.toLowerCase().includes('rótulo'));
    }

    // 2. Busca custo de rótulo (Prioridade: ID de variante vinculada)
    const labelVariantId = formula.label_variant_id;
    let labelOpt = labelVariantId
        ? packagingOptions.find(p => p.variant_id === labelVariantId)
        : null;
    
    // Fallback: Busca automática por nome se não vinculado
    if (!labelOpt) {
        labelOpt = packagingOptions.find(p => p.name.toLowerCase().includes('rótulo') || p.name.toLowerCase().includes('etiqueta'));
    }

    const costEmbalagem = pkgOpt ? pkgOpt.cost : 0;
    const costRotulo = labelOpt ? labelOpt.cost : 0;
    const packagingCostTotal = costEmbalagem + costRotulo;

    const fixedCosts = entry.fixedCosts || 0;
    const totalCost = rawCostPerUnit + packagingCostTotal + fixedCosts;

    let sellPrice = 0;
    let label = '';
    if (selectedPricingType === 'varejo') { sellPrice = entry.varejoPrice; label = 'Varejo (Consumidor Final)'; }
    else if (selectedPricingType === 'atacado') { sellPrice = entry.atacadoPrice; label = 'Atacado (Revenda)'; }
    else { sellPrice = entry.fardoPrice / (entry.fardoQty || 1); label = `Fardo/Caixa (Unitário de ${entry.fardoQty}un)`; }

    const marginVal = sellPrice - totalCost;
    const marginPerc = (marginVal / (sellPrice || 1)) * 100;
    const markupPerc = totalCost > 0 ? ((sellPrice / totalCost) - 1) * 100 : 0;
    const custoMinVenda = totalCost * 1.5;

    const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Precificação - ${formula.name}</title>
        <style>${cssPrintStyles}</style>
      </head>
      <body>
        <div class="watermark">TABELA DE PREÇOS</div>
        ${reportHeader('Gestão de Preços e Margens', `Produto: ${formula.name} - ${label}`)}

          <div class="grid grid-3 text-center">
             <div class="data-item">
              <span class="data-label">Produto</span>
              <span class="data-value">${formula.name}</span>
            </div>
            <div class="data-item">
              <span class="data-label">Volume de Venda</span>
              <span class="data-value" style="font-size: 18px; color: #202eac;">${capacity >= 1 ? `${capacity}L` : `${capacity * 1000}ml`}</span>
            </div>
            <div class="data-item">
              <span class="data-label">Canal Aplicado</span>
              <span class="data-value" style="color: #64748b;">${selectedPricingType.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div class="card" style="background: #f8fafc; text-align: center; padding: 40px 20px;">
          <div class="data-label" style="font-size: 14px; margin-bottom: 10px;">Preço Sugerido de Comercialização</div>
          <div style="font-size: 48px; font-weight: 900; color: #1e293b; letter-spacing: -1px;">
            ${formatCurrency(sellPrice)}
          </div>
          <div style="margin-top: 15px; display: flex; justify-content: center; gap: 40px;">
             <div>
                <span class="data-label">Margem Bruta (R$)</span>
                <div class="data-value" style="color: #10b981;">${formatCurrency(marginVal)}</div>
             </div>
             <div>
                <span class="data-label">Margem Bruta (%)</span>
                <div class="data-value" style="color: #10b981;">${marginPerc.toFixed(2)}%</div>
             </div>
             <div>
                <span class="data-label">Markup Aplicado</span>
                <div class="data-value" style="color: #6366f1;">${markupPerc.toFixed(2)}%</div>
             </div>
          </div>
        </div>

        <div class="grid grid-2">
            <div class="card">
              <div class="data-label">Composição de Custo Unitário</div>
              <div style="margin-top: 15px; space-y: 10px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 5px 0; border-bottom: 1px solid #f1f5f9;">
                  <span>Matéria-Prima (Líquido)</span>
                  <span class="font-bold">${formatCurrency(rawCostPerUnit)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 5px 0; border-bottom: 1px solid #f1f5f9;">
                  <span>Embalagem (${pkgOpt?.name || 'Não Ident.'})</span>
                  <span class="font-bold">${formatCurrency(costEmbalagem)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 5px 0; border-bottom: 1px solid #f1f5f9;">
                  <span>Rótulo e Acabamento</span>
                  <span class="font-bold">${formatCurrency(costRotulo)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 5px 0; border-bottom: 1px solid #f1f5f9;">
                  <span>Custos Fixos (Operação)</span>
                  <span class="font-bold">${formatCurrency(fixedCosts)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 10px 0; color: #202eac;">
                  <span class="font-bold">Custo Total de Produção</span>
                  <span class="font-bold">${formatCurrency(totalCost)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 8px; margin-top: 5px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; color: #b45309;">
                  <span class="font-bold flex items-center justify-between w-full">🎯 Preço Teto Minimo Sugerido (+50%) <span>${formatCurrency(custoMinVenda)}</span></span>
                </div>
              </div>
            </div>
            <div class="card" style="background: #eff6ff; border: none;">
              <div class="data-label">Referência de Outros Canais</div>
              <table style="margin-top: 10px; background: transparent;">
                <thead>
                  <tr style="background: transparent; border-bottom: 1px solid #bfdbfe;">
                    <th style="font-size: 10px;">Canal</th>
                    <th class="text-right" style="font-size: 10px;">Preço</th>
                  </tr>
                </thead>
                <tbody>
                  ${selectedPricingType !== 'varejo' && entry.varejoPrice > 0 ? `
                    <tr>
                      <td style="font-size: 11px;">Varejo</td>
                      <td class="text-right font-bold" style="font-size: 12px;">${formatCurrency(entry.varejoPrice)}</td>
                    </tr>
                  ` : ''}
                  ${selectedPricingType !== 'atacado' && entry.atacadoPrice > 0 ? `
                    <tr>
                      <td style="font-size: 11px;">Atacado</td>
                      <td class="text-right font-bold" style="font-size: 12px;">${formatCurrency(entry.atacadoPrice)}</td>
                    </tr>
                  ` : ''}
                  ${selectedPricingType !== 'fardo' && entry.fardoPrice > 0 ? `
                    <tr>
                      <td style="font-size: 11px;">Fardo (${entry.fardoQty}un)</td>
                      <td class="text-right font-bold" style="font-size: 12px;">${formatCurrency(entry.fardoPrice / (entry.fardoQty || 1))} <small>/un</small></td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
        </div>

        <div style="margin-top: 20px; font-size: 10px; color: #64748b; line-height: 1.5; padding: 15px; border: 1px dashed #cbd5e1; border-radius: 8px;">
          <strong>Nota de Auditoria:</strong> Este relatório é de uso interno e confidencial. Os valores de custo são baseados na última atualização de custos de insumos e embalagens registrados no sistema. A validade destes preços está sujeita à volatilidade do mercado de matérias-primas.
        </div>

        <div class="footer">
          Emissão: ${new Date().toLocaleString('pt-BR')} — Ohana Clean Planner Strategic Unit
        </div>
      </body>
      </html>
    `;
    triggerPrint(html);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-[#202eac] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Gerando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <FileBarChart className="w-6 h-6 text-[#202eac]" />
            Relatórios e Insights
          </h1>
          <p className="text-sm text-slate-500 mt-1">Visão geral do seu inventário e produção</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-50 text-[#202eac] rounded-lg">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Insumos</span>
              </div>
              <div className="text-2xl font-black text-slate-800">{stats.totalIngredients}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Beaker className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fórmulas</span>
              </div>
              <div className="text-2xl font-black text-slate-800">{stats.totalFormulas}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor em Estoque</span>
              </div>
              <div className="text-2xl font-black text-emerald-600">{formatCurrency(stats.totalInventoryValue)}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertas Ativos</span>
              </div>
              <div className="text-2xl font-black text-orange-600">{stats.lowStock.length + stats.expiringSoon.length}</div>
            </div>
          </div>

          {/* Central de Documentos & Impressões (Movido para o topo) */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mt-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#202eac]" />
              Central de Documentos & Impressão (PDF)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Card 1: Relatório Técnico de Fórmula */}
              <div className="p-6 rounded-2xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between hover:border-blue-300 transition-colors shadow-sm min-h-[340px]">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-blue-100 text-[#202eac] rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 leading-tight">Relatório de Precisão de Fórmulas</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Emissão de ficha técnica contendo composição percentual e cálculos de precificação.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Selecione a Fórmula Alvo</label>
                    <div className="relative">
                      <select
                        value={selectedFormulaId}
                        onChange={(e) => setSelectedFormulaId(e.target.value)}
                        className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all text-sm font-medium text-slate-700 appearance-none shadow-sm cursor-pointer"
                      >
                        <option value="">Escolha uma fórmula...</option>
                        {formulas.map(f => (
                          <option key={f.id} value={f.id}>{f.name} — ({f.base_volume}L)</option>
                        ))}
                      </select>
                      <ChevronRight className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handlePrintFormula}
                    disabled={!selectedFormulaId}
                    className="w-full py-3.5 bg-[#202eac] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-md disabled:opacity-50 disabled:shadow-none group"
                  >
                    <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Imprimir Ficha Técnica
                  </button>
                </div>
              </div>

              {/* Card 2: Registro Autenticado de Processo (OF) */}
              <div className="p-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 flex flex-col justify-between hover:border-emerald-300 transition-colors shadow-sm min-h-[340px]">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                      <Factory className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 leading-tight">Registro Autenticado (OF)</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Laudo industrial com escalonamento de insumos e rastreabilidade total de lotes.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Selecione o Lote (OF)</label>
                    <div className="relative">
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-700 appearance-none shadow-sm cursor-pointer"
                      >
                        <option value="">Escolha um lote fabricado...</option>
                        {orders.map(o => (
                          <option key={o.id} value={o.id}>LOTE: {o.batch_number} — {o.planned_volume}L</option>
                        ))}
                      </select>
                      <ChevronRight className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handlePrintOrder}
                    disabled={!selectedOrderId}
                    className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 disabled:shadow-none group"
                  >
                    <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Gerar Ficha de Produção
                  </button>
                </div>
              </div>

              {/* Card 3: Memorial de Cálculo (Proporção) */}
              <div className="p-6 rounded-2xl border border-purple-100 bg-purple-50/50 flex flex-col justify-between hover:border-purple-300 transition-colors shadow-sm min-h-[340px]">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center shrink-0">
                      <Scale className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 leading-tight">Memorial de Cálculo</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Relatório detalhado das simulações de proporção para análise de custos e planejamento de envase.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Selecione a Simulação</label>
                    <div className="relative">
                      <select
                        value={selectedProportionId}
                        onChange={(e) => setSelectedProportionId(e.target.value)}
                        className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium text-slate-700 appearance-none shadow-sm cursor-pointer"
                      >
                        <option value="">Escolha uma simulação...</option>
                        {savedProportions.map(p => (
                          <option key={p.id} value={p.id}>{p.displayName}</option>
                        ))}
                      </select>
                      <ChevronRight className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <button
                    onClick={handlePrintProportion}
                    disabled={!selectedProportionId}
                    className="w-full py-3.5 bg-purple-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-purple-700 transition-all shadow-md disabled:opacity-50 disabled:shadow-none group"
                  >
                    <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Imprimir Memorial
                  </button>
                  <div className="flex gap-2">
                    {selectedProportionId && (
                      <button
                        onClick={() => handleDeleteProportion(selectedProportionId)}
                        className="flex-1 py-1.5 bg-rose-50 text-rose-600 font-bold rounded-xl text-[10px] uppercase border border-rose-100 flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" /> Excluir
                      </button>
                    )}
                    {savedProportions.length > 1 && (
                      <button
                        onClick={handleClearAllProportions}
                        className="flex-1 py-1.5 bg-white text-slate-400 font-bold rounded-xl text-[10px] uppercase border border-slate-200 flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" /> Limpar Tudo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 4: Gestão de Preços e Margens */}
              <div className="p-6 rounded-2xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between hover:border-blue-300 transition-colors shadow-sm">
                {/* Linha 1: Título e Ícone */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-blue-100 text-[#202eac] rounded-xl flex items-center justify-center shrink-0">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 leading-tight">Gestão de Preços</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Análise de markup, lucros e custos por canal.
                    </p>
                  </div>
                </div>

                {/* Linha 2: Seletores em Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Produto</label>
                    <select
                      value={selectedPricingFormulaId}
                      onChange={(e) => {
                        setSelectedPricingFormulaId(e.target.value);
                        setSelectedPricingCapacity('');
                      }}
                      className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 text-xs font-bold text-slate-700 appearance-none cursor-pointer"
                    >
                      <option value="">Selecione...</option>
                      {formulas.filter(f => pricingEntries.some(e => e.formulaId === f.id)).map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tipo de Preço</label>
                    <select
                      value={selectedPricingType}
                      onChange={(e) => setSelectedPricingType(e.target.value as any)}
                      className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 text-xs font-bold text-slate-700 appearance-none cursor-pointer"
                    >
                      <option value="varejo">Varejo</option>
                      <option value="atacado">Atacado</option>
                      <option value="fardo">Fardo</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Volume</label>
                    <select
                      disabled={!selectedPricingFormulaId}
                      value={selectedPricingCapacity}
                      onChange={(e) => setSelectedPricingCapacity(e.target.value)}
                      className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 text-xs font-bold text-slate-700 appearance-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="">Escolha...</option>
                      {[...new Set(pricingEntries
                        .filter(e => e.formulaId === selectedPricingFormulaId)
                        .filter(e => {
                          if (selectedPricingType === 'varejo') return e.varejoPrice > 0;
                          if (selectedPricingType === 'atacado') return e.atacadoPrice > 0;
                          if (selectedPricingType === 'fardo') return e.fardoPrice > 0;
                          return false;
                        })
                        .map(e => e.capacityKey)
                      )].sort((a,b) => parseFloat(a)-parseFloat(b)).map(cap => (
                        <option key={cap} value={cap}>{parseFloat(cap) >= 1 ? `${cap}L` : `${parseFloat(cap)*1000}ml`} (Já Precificado)</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Linha 3: Botão */}
                <button
                  onClick={handlePrintPricing}
                  disabled={!selectedPricingFormulaId || !selectedPricingCapacity}
                  className="w-full py-3.5 bg-[#202eac] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-md disabled:opacity-50 disabled:shadow-none group"
                >
                  <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Gerar Ficha de Preço
                </button>
              </div>

            </div>
          </div>

          {/* Insights Section */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mt-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#202eac]" />
              Insights de Produção
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="p-3 bg-white rounded-lg shadow-sm text-[#202eac]">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fórmula Mais Cara</span>
                    <div className="font-bold text-slate-800">{stats.mostExpensiveFormula?.name || 'N/A'}</div>
                    <div className="text-xs text-emerald-600 font-bold">{formatCurrency(stats.mostExpensiveFormula?.cost || 0)} <span className="text-slate-400 font-normal">/ L</span></div>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-sm flex gap-3">
                  <PieChart className="w-5 h-5 shrink-0" />
                  <p>O valor total do seu inventário é de <strong>{formatCurrency(stats.totalInventoryValue)}</strong>. Considere otimizar o estoque de itens com baixo giro.</p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-[#202eac]">
                  <Activity className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-800">Saúde do Inventário</h4>
                <p className="text-xs text-slate-500 mt-2 max-w-[240px]">
                  {stats.lowStock.length > 0
                    ? `Você tem ${stats.lowStock.length} itens abaixo do estoque mínimo. Isso pode afetar a produção em breve.`
                    : "Seu estoque está saudável! Todos os itens estão acima do nível mínimo de segurança."}
                </p>
                <button
                  onClick={() => fetchData()}
                  className="mt-4 text-[#202eac] text-xs font-bold flex items-center gap-1 hover:underline"
                >
                  Atualizar Dados <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Performance Industrial */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mt-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#202eac]" />
              Performance Industrial & Qualidade
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black text-slate-800">{productionStats.completedOrdersCount}</div>
                <h4 className="font-bold text-slate-600 text-sm mt-1">Ordens Concluídas</h4>
                <p className="text-xs text-slate-500 mt-2">Volume Total: <strong>{(Number(productionStats.totalVolume) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} L/Kg</strong></p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-amber-500">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black text-slate-800">{productionStats.approvalRate.toFixed(1)}%</div>
                <h4 className="font-bold text-slate-600 text-sm mt-1">Taxa de Aprovação OEE</h4>
                <p className="text-xs text-slate-500 mt-2">Aprovações de primeira e índices de sucesso laboratoriais.</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-red-500">
                  <XCircle className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black text-slate-800">{productionStats.rejectedQCCount}</div>
                <h4 className="font-bold text-slate-600 text-sm mt-1">Lotes Reprovados</h4>
                <p className="text-xs text-slate-500 mt-2">Lotes perdidos por não conformidade técnica química.</p>
              </div>

            </div>
          </div>

          {/* Painel de Alertas de Logística (Movido para a base) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Low Stock Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Painel de Alertas — Estoque Baixo
                </h3>
                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {stats.lowStock.length} alertas
                </span>
              </div>
              <div className="divide-y divide-slate-50 flex-1 overflow-auto max-h-[400px]">
                {stats.lowStock.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm italic">Nenhum insumo com estoque crítico neste momento.</div>
                ) : (
                  stats.lowStock.map(ing => (
                    <div key={ing.id} className="p-4 flex items-center justify-between hover:bg-orange-50/50 transition-colors">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{ing.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Mínimo Estipulado: {ing.estoque_minimo.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {ing.unit}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-red-600">{(ing.estoque_atual || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {ing.unit}</div>
                        <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest mt-0.5">Crítico</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expiry Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Giro Logístico — Vencimentos (Próx 30 dias)
                </h3>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {stats.expiringSoon.length} itens
                </span>
              </div>
              <div className="divide-y divide-slate-50 flex-1 overflow-auto max-h-[400px]">
                {stats.expiringSoon.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm italic">Bom ritmo! Nenhum insumo vencendo em breve.</div>
                ) : (
                  stats.expiringSoon.map(ing => {
                    const expiry = new Date(ing.expiry_date!);
                    const diff = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={ing.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{ing.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Vencimento Programado: {expiry.toLocaleDateString('pt-BR')}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-black ${diff <= 7 ? 'text-red-600' : 'text-orange-600'}`}>
                            {diff} dias
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Restantes</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
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
