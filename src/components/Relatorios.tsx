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

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  estoque_atual: number;
  estoque_minimo: number;
  cost_per_unit: number;
  expiry_date: string | null;
  validade_indeterminada: boolean;
}

interface Formula {
  id: string;
  name: string;
  base_volume: number;
  version: string;
  status: string;
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

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setIsLoading(true);
      if (mode === 'supabase') {
        const [ingRes, forRes, ordRes, qcRes] = await Promise.all([
          supabase.from('ingredients').select('*'),
          supabase.from('formulas').select(`
            id, name, base_volume, version, status, instructions,
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
    } catch (err) {
      console.error('Erro ao buscar dados para relatórios:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeleteProportion = (id: string) => {
    if (!window.confirm('Deseja realmente excluir esta simulação?')) return;
    
    try {
      const remaining = savedProportions.filter(p => p.id !== id);
      localStorage.setItem('local_proportions', JSON.stringify(remaining));
      setSavedProportions(remaining);
      if (selectedProportionId === id) setSelectedProportionId('');
    } catch (e) {
      console.error('Erro ao excluir simulação:', e);
    }
  };

  const handleClearAllProportions = () => {
    if (!window.confirm('Deseja realmente apagar TODAS as simulações arquivadas? Esta ação não pode ser desfeita.')) return;
    
    try {
      localStorage.removeItem('local_proportions');
      setSavedProportions([]);
      setSelectedProportionId('');
    } catch (e) {
      console.error('Erro ao limpar simulações:', e);
    }
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; margin: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header-block { border: 2px dashed #cbd5e1; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; background: #f8fafc; }
    .header-block h2 { margin: 0; color: #94a3b8; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; }
    .title { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 25px; display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #202eac; padding-bottom: 12px; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 35px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .meta-box { display: flex; flex-direction: column; }
    .meta-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
    .meta-value { font-size: 15px; font-weight: 700; color: #0f172a; }
    section { margin-bottom: 35px; }
    section h3 { font-size: 16px; font-weight: 800; color: #202eac; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: -0.5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th { background: #f1f5f9; text-align: left; padding: 12px 14px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; white-space: nowrap; }
    td { padding: 12px 14px; font-size: 13px; color: #334155; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .bg-blue { background: #e0e7ff; color: #312e81; font-weight: 800; border-left: 1px solid #c7d2fe; border-right: 1px solid #c7d2fe; }
    .total-row { background: #f8fafc; font-weight: 800; }
    .footer-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 80px; }
    .signature-line { border-top: 1px solid #cbd5e1; padding-top: 8px; text-align: center; font-size: 12px; font-weight: 700; color: #64748b; margin-top: 50px;}
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; font-weight: 900; color: rgba(32, 46, 172, 0.02); z-index: -1; white-space: nowrap; pointer-events: none; }
    .brand-accent { color: #202eac; }
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
        <title>Fórmula - ${formula.name}</title>
        <style>${cssPrintStyles}</style>
      </head>
      <body>
        <div class="watermark">RECEITA INDUSTRIAL</div>
        <div class="header-block">
          <h2>(Espaço Reservado - Cabeçalho e Logo da Empresa)</h2>
        </div>
        
        <div class="title">
          <span>RELATÓRIO TÉCNICO E PRECIFICAÇÃO DE FÓRMULA</span>
          <span style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Emissão: ${new Date().toLocaleDateString('pt-BR')}</span>
        </div>

        <div class="meta-grid">
          <div class="meta-box"><span class="meta-label">Produto</span><span class="meta-value brand-accent">${formula.name}</span></div>
          <div class="meta-box"><span class="meta-label">Versão Operacional</span><span class="meta-value">${(formula.version || 'v1.0').toLowerCase()}</span></div>
          <div class="meta-box"><span class="meta-label">Volume Lote Base</span><span class="meta-value">${formatVol(formula.base_volume)} L/Kg</span></div>
          <div class="meta-box"><span class="meta-label">Status</span><span class="meta-value" style="text-transform: uppercase;">${formula.status === 'active' ? 'Ativa' : formula.status}</span></div>
        </div>

        <section>
          <h3>1. Composição Química & Proporções</h3>
          <table>
            <thead>
              <tr>
                <th>Insumo Químico (BOM)</th>
                <th class="text-right">Quantidade</th>
                <th class="text-center">Unid.</th>
                <th class="text-center bg-blue">Proporção (%)</th>
                <th class="text-right">Custo Unitário</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${chemicals.map(c => {
                const perc = (c.qty / totalVolume) * 100;
                return `
                <tr>
                  <td><strong>${c.name}</strong></td>
                  <td class="text-right">${formatVol(c.qty)}</td>
                  <td class="text-center text-xs" style="color: #64748b;">${c.unit.toUpperCase()}</td>
                  <td class="text-center bg-blue">${perc.toFixed(2)}%</td>
                  <td class="text-right" style="color: #64748b;">${formatBRL(c.cost)}</td>
                  <td class="text-right font-bold">${formatBRL(c.subtotal)}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </section>

        ${packaging.length > 0 ? `
        <section>
          <h3>2. Materiais de Embalagem Secundária</h3>
          <table>
            <thead>
              <tr>
                <th>Item (Frascos, Tampas, Rótulos, Caixas)</th>
                <th class="text-right">Quantidade</th>
                <th class="text-center">Unid.</th>
                <th class="text-right">Custo Unitário</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${packaging.map(p => `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td class="text-right">${formatVol(p.qty)}</td>
                  <td class="text-center text-xs" style="color: #64748b;">${p.unit.toUpperCase()}</td>
                  <td class="text-right" style="color: #64748b;">${formatBRL(p.cost)}</td>
                  <td class="text-right font-bold">${formatBRL(p.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>
        ` : ''}

        <section style="margin-top: 50px; border-top: 3px solid #e2e8f0; padding-top: 30px;">
          <div style="display: flex; justify-content: flex-end; gap: 60px;">
            <div class="text-right">
              <div class="meta-label" style="font-size: 12px;">Custo Parametrizado por Litro/Kg</div>
              <div style="font-size: 24px; font-weight: 800; color: #475569;">${formatBRL(totalCost / formula.base_volume)}</div>
            </div>
            <div class="text-right">
              <div class="meta-label" style="font-size: 12px; color: #202eac;">Custo Total Previsto (Lote)</div>
              <div style="font-size: 32px; font-weight: 900; color: #202eac;">${formatBRL(totalCost)}</div>
            </div>
          </div>
        </section>

        <section style="margin-top: 40px;">
          <h3>3. Modo de Preparo & Observações Laboratoriais</h3>
          <div style="padding: 25px; background: #fffbeb; border: 2px dashed #fcd34d; border-radius: 8px;">
            <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6; white-space: pre-wrap;">${formula.instructions || 'Nenhuma instrução operacional padrão (POP) registrada para este produto.'}</p>
          </div>
        </section>

        <div class="footer-signatures">
          <div><div class="signature-line">Gestor de P&D / Responsável Técnico</div></div>
          <div><div class="signature-line">Diretoria Industrial / Qualidade</div></div>
        </div>
      </body>
      </html>
    `;
    triggerPrint(html);
  };

  const handlePrintProportion = () => {
    const prop = savedProportions.find(p => p.id === selectedProportionId);
    if (!prop) return;

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
          .title-area h1 { margin: 0; font-size: 24px; font-weight: 900; color: #202eac; text-transform: uppercase; }
          .title-area p { margin: 5px 0 0; font-size: 12px; color: #64748b; font-weight: bold; }
          .info-grid { display: grid; grid-template-cols: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; }
          .info-item label { display: block; font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px; }
          .info-item span { font-size: 14px; font-weight: 700; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f1f5f9; text-align: left; padding: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
          td { padding: 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
          .total-row { background: #f8fafc; font-weight: bold; }
          .cost-card { margin-top: 30px; padding: 20px; border: 2px solid #e2e8f0; border-radius: 12px; display: inline-block; min-width: 250px; }
          .cost-card label { display: block; font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; }
          .cost-card .value { font-size: 24px; font-weight: 900; color: #202eac; }
          .footer { margin-top: 80px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 10px; color: #94a3b8; text-align: center; }
          .signature { margin-top: 60px; display: flex; justify-content: space-between; gap: 40px; }
          .sig-box { flex: 1; border-top: 1px solid #cbd5e1; text-align: center; padding-top: 10px; font-size: 11px; font-weight: bold; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-area">
            <h1>Simulação das Proporção</h1>
            <p>MEMORIAL DE CÁLCULO E ESCALONAMENTO TÉCNICO</p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; font-weight: bold; color: #94a3b8;">DATA DE EMISSÃO</div>
            <div style="font-size: 14px; font-weight: bold;">${new Date(prop.createdAt).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <label>Produto / Fórmula</label>
            <span>${prop.formulaName}</span>
          </div>
          <div class="info-item">
            <label>Versão</label>
            <span>V${prop.formulaVersion.replace(/^v/i, '')}</span>
          </div>
          <div class="info-item">
            <label>Volume Planejado</label>
            <span>${prop.targetVolume.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} L/Kg</span>
          </div>
        </div>

        <h3>Composição Escalonda</h3>
        <table>
          <thead>
            <tr>
              <th>Insumo / Componente</th>
              <th>Tipo</th>
              <th style="text-align: right;">Quantidade</th>
              <th style="text-align: right;">Custo (R$)</th>
              <th style="text-align: right;">Part. (%)</th>
            </tr>
          </thead>
          <tbody>
            ${prop.ingredients.map((ing: any) => `
              <tr>
                <td style="font-weight: bold;">${ing.name}</td>
                <td style="font-size: 10px;">${ing.isChemical ? 'QUÍMICO' : 'EMBALAGEM'}</td>
                <td style="text-align: right;">${ing.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${ing.unit}</td>
                <td style="text-align: right;">${formatCurrency(ing.cost)}</td>
                <td style="text-align: right; color: #94a3b8;">${ing.percentage.toFixed(2)}%</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3">CUSTO TOTAL DA PRODUÇÃO</td>
              <td style="text-align: right; color: #202eac;">${formatCurrency(prop.totalCost)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; gap: 20px; align-items: flex-end;">
          <div class="cost-card">
            <label>Custo por Litro / Unidade</label>
            <div class="value">${formatCurrency(prop.targetVolume > 0 ? prop.totalCost / prop.targetVolume : 0)}</div>
          </div>
        </div>

        <div class="signature">
          <div class="sig-box">Responsável Técnico / Químico</div>
          <div class="sig-box">Aprovação Administrativa</div>
        </div>

        <div class="footer">
          Gerado automaticamente pelo Sistema Ohana Clean - Microsaas Planner
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
        <title>Ordem de Produção - ${order.batch_number}</title>
        <style>${cssPrintStyles} .bg-emerald { background: #dcfce7; color: #166534; font-weight: 800; border-left: 1px solid #bbf7d0; border-right: 1px solid #bbf7d0; }</style>
      </head>
      <body>
        <div class="watermark" style="color: rgba(16, 185, 129, 0.03);">PRODUÇÃO ${order.batch_number}</div>
        <div class="header-block">
          <h2>(Espaço Reservado - Cabeçalho e Logo da Empresa)</h2>
        </div>
        
        <div class="title" style="border-bottom-color: #10b981;">
          <span>RELATÓRIO DE ORDEM DE FABRICAÇÃO (OF)</span>
          <span style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Impresso em: ${new Date().toLocaleDateString('pt-BR')}</span>
        </div>

        <div class="meta-grid" style="grid-template-columns: repeat(3, 1fr); gap: 20px;">
          <div class="meta-box"><span class="meta-label">Lote Registrado (OF)</span><span class="meta-value" style="color:#10b981;">${order.batch_number}</span></div>
          <div class="meta-box"><span class="meta-label">Fórmula Destino</span><span class="meta-value">${formula?.name || 'Desconhecida'}</span></div>
          <div class="meta-box"><span class="meta-label">Volume Total (Lote)</span><span class="meta-value">${formatVol(order.planned_volume)} L/Kg</span></div>
          <div class="meta-box"><span class="meta-label">Operador Responsável</span><span class="meta-value">${order.operatorName || '-'}</span></div>
          <div class="meta-box"><span class="meta-label">Status do Lote</span><span class="meta-value" style="text-transform: uppercase;">${order.status === 'completed' ? 'Finalizado/Concluído' : 'Processamento'}</span></div>
          <div class="meta-box"><span class="meta-label">Data Limite / Término</span><span class="meta-value">${order.end_date ? new Date(order.end_date).toLocaleDateString() : '-'}</span></div>
        </div>

        <section>
          <h3>1. Rastreabilidade de Incompatibilidades Químicas</h3>
          <table>
            <thead>
              <tr>
                <th>Elemento Químico Consumido</th>
                <th class="text-right">Volume Escalonado</th>
                <th class="text-center">Unid.</th>
                <th class="text-center bg-emerald">Conc. Lote (%)</th>
                <th style="padding-left: 30px;">Lote de Origem (Fornecedor)</th>
              </tr>
            </thead>
            <tbody>
              ${chemicals.map(c => {
                const perc = (c.qty / totalVolume) * 100;
                return `
                <tr>
                  <td><strong>${c.name}</strong></td>
                  <td class="text-right">${formatVol(c.qty)}</td>
                  <td class="text-center text-xs" style="color:#64748b;">${c.unit.toUpperCase()}</td>
                  <td class="text-center bg-emerald">${perc.toFixed(2)}%</td>
                  <td style="font-family: monospace; font-size: 14px; padding-left: 30px;">
                    ${c.supplierBatch !== '-' ? `<strong>${c.supplierBatch}</strong>` : '<span style="color:#cbd5e1">-</span>'}
                  </td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </section>

        ${packaging.length > 0 ? `
        <section>
          <h3>2. Rastreamento de Embalagem & Acondicionamento</h3>
          <table>
            <thead>
              <tr>
                <th>Equipamento Secundário</th>
                <th class="text-right">Volume Escalonado</th>
                <th class="text-center">Unid.</th>
                <th class="text-center" style="background:#f1f5f9; color:#94a3b8;">Conc. Lote (%)</th>
                <th style="padding-left: 30px;">Lote de Origem (Fornecedor)</th>
              </tr>
            </thead>
            <tbody>
              ${packaging.map(p => `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td class="text-right">${formatVol(p.qty)}</td>
                  <td class="text-center text-xs" style="color:#64748b;">${p.unit.toUpperCase()}</td>
                  <td class="text-center" style="color:#94a3b8; font-weight:normal;">N/A</td>
                  <td style="font-family: monospace; font-size: 14px; padding-left: 30px;">
                    ${p.supplierBatch !== '-' ? `<strong>${p.supplierBatch}</strong>` : '<span style="color:#cbd5e1">-</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>
        ` : ''}

        <section style="margin-top: 40px;">
          <h3>3. Controle de Ocorrências Laboratoriais</h3>
          <div style="min-height: 120px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; padding: 15px;">
            <p style="margin:0; font-size:11px; color:#94a3b8; font-style:italic;">Use este espaço para relatar discrepâncias, desvios de processo, ajustes de pH ou informações vitais de manufatura.</p>
          </div>
        </section>

        <div class="footer-signatures" style="margin-top: 60px;">
          <div><div class="signature-line">Rubrica Operador Principal</div></div>
          <div><div class="signature-line">Check CQA (Controle de Qualidade)</div></div>
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
              
              {/* Relatório Técnico de Fórmula */}
              <div className="p-6 rounded-2xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between hover:border-blue-300 transition-colors shadow-sm">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-blue-100 text-[#202eac] rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 leading-tight">Relatório de Precisão de Fórmulas</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Emissão de ficha técnica contendo composição percentual de formulação e os cálculos estatísticos de precificação.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Selecione a Fórmula Alvo</label>
                    <div className="relative">
                      <select
                        value={selectedFormulaId}
                        onChange={(e) => setSelectedFormulaId(e.target.value)}
                        className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all text-sm font-medium text-slate-700 appearance-none shadow-sm cursor-pointer"
                      >
                        <option value="">Escolha uma fórmula do banco de dados...</option>
                        {formulas.map(f => (
                          <option key={f.id} value={f.id}>{f.name} — (Vol: {f.base_volume}L • Versão: {(f.version || 'v1.0').toLowerCase()})</option>
                        ))}
                      </select>
                      <ChevronRight className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handlePrintFormula}
                  disabled={!selectedFormulaId}
                  className="mt-6 w-full py-3.5 bg-[#202eac] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-md disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed group"
                >
                  <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
                  Gerar e Imprimir Ficha Técnica
                </button>
              </div>

              {/* Relatório de Ordem de Produção */}
              <div className="p-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 flex flex-col justify-between hover:border-emerald-300 transition-colors shadow-sm">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                      <Factory className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 leading-tight">Registro Autenticado de Processo (OF)</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Geração de laudo logístico mapeando escalonamento de insumos e tracking de rastreabilidade de fornecedor e percentuais químicos.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Selecione o Lote (OF)</label>
                    <div className="relative">
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-700 appearance-none shadow-sm cursor-pointer"
                      >
                        <option value="">Escolha um lote fabricado ou vigente...</option>
                        {orders.map(o => (
                          <option key={o.id} value={o.id}>
                            LOTE: {o.batch_number} — {o.planned_volume}L [{o.status === 'completed' ? 'CONCLUÍDO' : 'EM PROCESSO'}]
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handlePrintOrder}
                  disabled={!selectedOrderId}
                  className="mt-6 w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed group"
                >
                  <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
                  Gerar Ficha de Produção
                </button>
              </div>

              {/* Relatório de Memorial de Cálculo (Proporção) - NOVO */}
              <div className="p-6 rounded-2xl border border-purple-100 bg-purple-50/50 flex flex-col justify-between hover:border-purple-300 transition-colors shadow-sm md:col-span-2">
                <div className="flex flex-col md:flex-row md:items-center gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center shrink-0">
                        <Scale className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 leading-tight">Memorial de Cálculo (Simulação)</h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Emissão de relatório detalhado das proporções arquivadas, ideal para análises de custo e planejamento de envase.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-[2] space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Selecione a Simulação Arquivada</label>
                      <div className="flex flex-col md:flex-row gap-2">
                        <div className="relative flex-1">
                          <select
                            value={selectedProportionId}
                            onChange={(e) => setSelectedProportionId(e.target.value)}
                            className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium text-slate-700 appearance-none shadow-sm cursor-pointer"
                          >
                            <option value="">Escolha uma das proporções salvas...</option>
                            {savedProportions.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.displayName}
                              </option>
                            ))}
                          </select>
                          <ChevronRight className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handlePrintProportion}
                            disabled={!selectedProportionId}
                            className="py-3.5 px-6 bg-purple-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-purple-700 transition-all shadow-md disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed group whitespace-nowrap"
                          >
                            <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
                            Imprimir
                          </button>
                          {selectedProportionId && (
                            <button
                              onClick={() => handleDeleteProportion(selectedProportionId)}
                              className="p-3.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl border border-rose-200 transition-all shadow-sm"
                              title="Excluir esta simulação"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                          {savedProportions.length > 1 && (
                            <button
                              onClick={handleClearAllProportions}
                              className="p-3.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all shadow-sm flex items-center gap-2 px-4"
                              title="Limpar todas as simulações"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-tighter">Limpar Tudo</span>
                            </button>
                          )}
                        </div>
                      </div>
                  </div>
                </div>
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
    </div>
  );
}
