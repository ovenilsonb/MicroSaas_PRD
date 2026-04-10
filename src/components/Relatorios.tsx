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

import { useCompanySettings } from '../hooks/useCompanySettings';

export default function Relatorios() {
  const { mode } = useStorageMode();
  const { settings } = useCompanySettings();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [savedProportions, setSavedProportions] = useState<any[]>([]);
  const [pricingEntries, setPricingEntries] = useState<any[]>([]);
  const [qualityControls, setQualityControls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selection States
  const [selectedFormulaId, setSelectedFormulaId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedProportionId, setSelectedProportionId] = useState('');
  const [selectedPricingFormulaId, setSelectedPricingFormulaId] = useState('');
  const [selectedPricingCapacity, setSelectedPricingCapacity] = useState('');
  const [selectedPricingType, setSelectedPricingType] = useState<'varejo' | 'atacado' | 'fardo'>('varejo');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; detail?: string;
    type: ConfirmModalType; confirmLabel?: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {} });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (mode === 'supabase') {
        const { data: ing } = await supabase.from('ingredients').select('*').order('name');
        const { data: form } = await supabase.from('formulas').select('*, formula_ingredients(*, ingredients(*), variants(*))');
        const { data: ord } = await supabase.from('production_orders').select('*').order('created_at', { ascending: false });
        const { data: qc } = await supabase.from('quality_controls').select('*');
        
        setIngredients(ing || []);
        setFormulas(form || []);
        setOrders(ord || []);
        setQualityControls(qc || []);
      } else {
        setIngredients(JSON.parse(localStorage.getItem('local_ingredients') || '[]'));
        setFormulas(JSON.parse(localStorage.getItem('local_formulas') || '[]'));
        setOrders(JSON.parse(localStorage.getItem('local_production_orders') || '[]'));
        setSavedProportions(JSON.parse(localStorage.getItem('local_proportions') || '[]'));
        setPricingEntries(JSON.parse(localStorage.getItem('precificacao_entries') || '[]'));
        setQualityControls(JSON.parse(localStorage.getItem('local_quality_controls') || '[]'));
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mode]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatVol = (value: number) => 
    value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

  const stats = useMemo(() => {
    const totalIngredients = ingredients.length;
    const totalFormulas = formulas.length;
    
    const lowStock = ingredients.filter(ing => (ing.estoque_atual || 0) <= (ing.estoque_minimo || 0));
    
    const expiringSoon = ingredients.filter(ing => {
      if (!ing.expiry_date || ing.validade_indeterminada) return false;
      const expiry = new Date(ing.expiry_date);
      const diff = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 && diff <= 30;
    });

    const totalInventoryValue = ingredients.reduce((acc, ing) => {
      const cost = typeof ing.cost_per_unit === 'string' 
        ? parseFloat(ing.cost_per_unit) || 0 
        : ing.cost_per_unit || 0;
      return acc + ((ing.estoque_atual || 0) * cost);
    }, 0);

    // Find most expensive formula per Liter
    let mostExpensiveFormula = { name: 'N/A', cost: 0 };
    if (formulas.length > 0) {
      const costs = formulas.map(f => {
        const totalFallowCost = f.formula_ingredients.reduce((sum, fi) => {
          const ing = Array.isArray(fi.ingredients) ? fi.ingredients[0] : fi.ingredients;
          const variant = Array.isArray(fi.variants) ? fi.variants[0] : fi.variants;
          const cost = variant?.cost_per_unit ?? ing?.cost_per_unit ?? 0;
          return sum + (fi.quantity * cost);
        }, 0);
        return { name: f.name, cost: totalFallowCost / (f.base_volume || 1) };
      });
      mostExpensiveFormula = costs.sort((a, b) => b.cost - a.cost)[0];
    }

    return { totalIngredients, totalFormulas, totalInventoryValue, lowStock, expiringSoon, mostExpensiveFormula };
  }, [ingredients, formulas]);

  const productionStats = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'concluido' || o.status === 'finalizado');
    const totalVolume = completedOrders.reduce((acc, o) => acc + (o.planned_volume || 0), 0);
    const approvedQCs = qualityControls.filter(q => q.status === 'aprovado').length;
    const rejectedQCCount = qualityControls.filter(q => q.status === 'reprovado').length;
    const approvalRate = qualityControls.length > 0 ? (approvedQCs / qualityControls.length) * 100 : 100;

    return { 
      completedOrdersCount: completedOrders.length, 
      totalVolume, 
      approvalRate, 
      rejectedQCCount,
      totalQCs: qualityControls.length
    };
  }, [orders, qualityControls]);

  const handleDeleteProportion = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Simulação',
      message: 'Tem certeza que deseja excluir este memorial de cálculo?',
      type: 'warning',
      onConfirm: () => {
        const newProps = savedProportions.filter(p => p.id !== id);
        setSavedProportions(newProps);
        localStorage.setItem('local_proportions', JSON.stringify(newProps));
        setSelectedProportionId('');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleClearAllProportions = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Limpar Tudo',
      message: 'Isso apagará TODAS as simulações salvas. Continuar?',
      type: 'warning',
      onConfirm: () => {
        setSavedProportions([]);
        localStorage.removeItem('local_proportions');
        setSelectedProportionId('');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=${(settings.headerFont || 'Inter').replace(/ /g, '+')}:wght@400;700;900&family=Outfit:wght@400;700;900&display=swap');
    
    @page { margin: 12mm; size: A4; }
    
    body { 
      font-family: 'Inter', sans-serif; 
      color: #0f172a; 
      margin: 0; 
      padding: 0;
      line-height: 1.5;
      background: white; 
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact; 
      font-size: 11px;
    }

    /* Watermark Técnica */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80px;
      font-weight: 900;
      color: rgba(15, 23, 42, ${settings.watermarkOpacity || 0.05});
      white-space: nowrap;
      pointer-events: none;
      z-index: -1;
      text-transform: uppercase;
      letter-spacing: 15px;
    }

    /* Cabeçalho Profissional */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid ${settings.primaryColor || '#202eac'};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .logo-img {
      height: 55px;
      width: auto;
      object-fit: contain;
    }

    .company-info .name {
      font-family: '${settings.headerFont}', sans-serif !important;
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1;
      margin-bottom: 4px;
    }

    .company-info .meta {
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .report-title-box {
      text-align: right;
    }

    .report-title-box .main-title {
      font-size: 14px;
      font-weight: 900;
      color: ${settings.primaryColor || '#202eac'};
      text-transform: uppercase;
      margin: 0;
    }

    .report-title-box .sub-title {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
      font-weight: 700;
    }

    /* Sistema de Grid Industrial */
    .grid { display: grid; gap: 20px; margin-bottom: 20px; }
    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }

    .data-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 15px;
    }

    .card-title {
      font-size: 10px;
      font-weight: 900;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }

    .data-item { margin-bottom: 4px; }
    .label { font-size: 9px; color: #64748b; font-weight: 800; text-transform: uppercase; display: block; }
    .value { font-size: 12px; font-weight: 700; color: #1e293b; }
    .value.primary { color: ${settings.primaryColor || '#202eac'}; font-size: 14px; }

    /* Tabelas de Alta Precisão */
    table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    th { 
      background: #f1f5f9; 
      text-align: left; 
      padding: 8px 12px; 
      font-size: 9px; 
      font-weight: 900; 
      color: #475569; 
      text-transform: uppercase;
      border-bottom: 2px solid ${settings.primaryColor || '#202eac'};
    }
    td { 
      padding: 8px 12px; 
      border-bottom: 1px solid #e2e8f0; 
      vertical-align: middle; 
    }
    tr:nth-child(even) { background: #f8fafc; }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .badge-primary { background: ${settings.primaryColor || '#202eac'}20; color: ${settings.primaryColor || '#202eac'}; }
    .badge-success { background: #dcfce7; color: #166534; }

    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* Assinaturas e Rodapé */
    .signature-section {
      margin-top: 50px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 50px;
    }
    .sig-box {
      border-top: 1px solid #94a3b8;
      padding-top: 10px;
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
    }

    .footer {
      position: fixed;
      bottom: 20px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8px;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    @media print {
      .no-print { display: none; }
    }
  `;

  const reportHeader = (title: string, subtitle: string) => `
    <div class="report-header">
      <div class="logo-container">
        ${settings.logo 
          ? `<img src="${settings.logo}" class="logo-img" />`
          : `<div style="width:50px; height:50px; background:${settings.primaryColor || '#202eac'}; border-radius:12px; display:flex; align-items:center; justify-content:center; color:white; font-weight:900; font-size:20px;">${settings.name.substring(0, 2).toUpperCase()}</div>`
        }
        <div class="company-info">
          <div class="name">${settings.name}</div>
          <div class="meta">
            ${settings.document ? `CNPJ: ${settings.document} | ` : ''} ${settings.address || 'PLANEJAMENTO INDUSTRIAL'}
          </div>
        </div>
      </div>
      <div class="report-title-box">
        <h1 class="main-title">${title}</h1>
        <div class="sub-title">${subtitle}</div>
        <div style="font-size: 8px; color: #94a3b8; margin-top: 8px;">EMISSÃO: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
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
    const formatVolLocal = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ficha Técnica - ${formula.name}</title>
        <style>${cssPrintStyles}</style>
      </head>
      <body>
        <div class="watermark">${settings.watermarkText || 'OHANA CLEAN'}</div>
        ${reportHeader('Ficha Técnica de Produto', `Fórmula: ${formula.name}`)}

        <div class="grid grid-4 text-center">
          <div class="data-card">
            <span class="label">Produto Master</span>
            <span class="value primary">${formula.name}</span>
          </div>
          <div class="data-card">
            <span class="label">Versão Técnica</span>
            <span class="value">${(formula.version || 'v1.0').toUpperCase()}</span>
          </div>
          <div class="data-card">
            <span class="label">Lote Padrão</span>
            <span class="value">${formatVolLocal(formula.base_volume)} L/Kg</span>
          </div>
          <div class="data-card">
            <span class="label">Última Revisão</span>
            <span class="value">${new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        <div class="grid grid-2">
          <div>
            <div class="card-title">1. Composição Química (BOM)</div>
            <table>
              <thead>
                <tr>
                  <th>Insumo Químico</th>
                  <th class="text-right">Qtd.</th>
                  <th class="text-right">%</th>
                  <th class="text-right">Custo</th>
                </tr>
              </thead>
              <tbody>
                ${chemicals.map(c => `
                  <tr>
                    <td><strong>${c.name}</strong></td>
                    <td class="text-right">${formatVolLocal(c.qty)} ${c.unit}</td>
                    <td class="text-right" style="color:${settings.primaryColor || '#202eac'}; font-weight:800;">${((c.qty / totalVolume) * 100).toFixed(2)}%</td>
                    <td class="text-right">${formatBRL(c.subtotal)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div>
            <div class="card-title">2. Materiais de Envase</div>
            <table>
              <thead>
                <tr>
                  <th>Componente</th>
                  <th class="text-right">Qtd.</th>
                  <th class="text-right">Custo</th>
                </tr>
              </thead>
              <tbody>
                ${packaging.length > 0 ? packaging.map(p => `
                  <tr>
                    <td><strong>${p.name}</strong></td>
                    <td class="text-right">${formatVolLocal(p.qty)} ${p.unit}</td>
                    <td class="text-right">${formatBRL(p.subtotal)}</td>
                  </tr>
                `).join('') : '<tr><td colspan="3" class="text-center">Nenhum material cadastrado</td></tr>'}
              </tbody>
            </table>

            <div class="data-card" style="margin-top: 10px; background: #f1f5f9;">
              <div class="grid grid-2">
                <div>
                  <span class="label">Custo/Litro</span>
                  <span class="value" style="font-size: 16px;">${formatBRL(totalCost / formula.base_volume)}</span>
                </div>
                <div>
                  <span class="label">Custo Total Lote</span>
                  <span class="value" style="font-size: 16px;">${formatBRL(totalCost)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="data-card">
          <div class="card-title">3. Instruções de Manipulação / POP</div>
          <div style="font-style: italic; color: #475569; font-size: 10px; line-height: 1.6;">
            ${formula.instructions || 'Nenhuma instrução operacional cadastrada para esta versão.'}
          </div>
        </div>

        <div class="signature-section">
          <div class="sig-box">Laboratório / P&D</div>
          <div class="sig-box">Garantia da Qualidade</div>
        </div>

        <div class="footer">DOCUMENTO DE ENGENHARIA — PROPRIEDADE DE ${settings.name.toUpperCase()} — CONFIDENCIAL</div>
      </body>
      </html>
    `;
    triggerPrint(html);
  };


  const handlePrintProportion = () => {
    const prop = savedProportions.find(p => p.id === selectedProportionId);
    if (!prop) return;

    const formatVolLocal = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Proporção - ${prop.formulaName}</title>
        <style>${cssPrintStyles}</style>
      </head>
      <body>
        <div class="watermark">${settings.watermarkText || 'OHANA CLEAN'}</div>
        ${reportHeader('Memorial de Cálculo Industrial', `Simulação ID: ${prop.id.slice(0, 8).toUpperCase()}`)}

        <div class="grid grid-4 text-center">
          <div class="data-card">
            <span class="label">Produto Alvo</span>
            <span class="value primary">${prop.formulaName}</span>
          </div>
          <div class="data-card">
            <span class="label">Versão Base</span>
            <span class="value">${prop.formulaVersion || 'v1.0'}</span>
          </div>
          <div class="data-card">
            <span class="label">Meta Produção</span>
            <span class="value" style="font-size: 16px;">${formatVolLocal(prop.targetVolume)} L/Kg</span>
          </div>
          <div class="data-card">
            <span class="label">Data Simulação</span>
            <span class="value">${new Date(prop.createdAt).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        <div class="data-card">
          <div class="card-title">Listagem de Escalonamento de Insumos</div>
          <table>
            <thead>
              <tr>
                <th>Componente</th>
                <th class="text-center">Tipo</th>
                <th class="text-right">Quantidade</th>
                <th class="text-center">Unid.</th>
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
                        <div style="font-weight: 800;">${ing.name}</div>
                        <div style="font-size: 8px; color: #64748b;">${ing.isChemical ? 'Base Química' : 'Material de Envase'}</div>
                      </td>
                      <td class="text-center">
                        <span class="badge ${ing.isChemical ? 'badge-primary' : 'badge-success'}">${ing.isChemical ? 'QUÍMICO' : 'LOGÍSTICO'}</span>
                      </td>
                      <td class="text-right" style="font-size: 13px; font-weight: 900;">${formatVolLocal(ing.quantity)}</td>
                      <td class="text-center">${ing.unit.toUpperCase()}</td>
                      <td class="text-right" style="color: #64748b; font-weight: 700;">${Number(percentage || 0).toFixed(2)}%</td>
                    </tr>
                  `;
                }).join('');
              })()}
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: 900;">
                <td colspan="4" class="text-right" style="padding: 12px; color: ${settings.primaryColor || '#202eac'};">CUSTO TOTAL PREVISTO DO LOTE</td>
                <td class="text-right" style="padding: 12px; font-size: 14px; color: ${settings.primaryColor || '#202eac'};">${formatCurrency(prop.totalCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="grid grid-2">
          <div class="data-card">
            <span class="label">Custo Médio Planejado</span>
            <span class="value" style="font-size: 18px; color: ${settings.primaryColor || '#202eac'};">${formatCurrency(prop.totalCost / (prop.targetVolume || 1))} <span style="font-size: 10px; color: #94a3b8;">/ L-Kg</span></span>
          </div>
          <div class="data-card" style="border-color: #fca5a5; background: #fef2f2;">
            <span class="label" style="color: #b91c1c;">Anotações do Operador (Pesagem)</span>
            <div style="height: 40px; border-bottom: 1px dashed #fca5a5; margin-top: 10px;"></div>
            <div style="font-size: 8px; color: #991b1b; margin-top: 5px;">* Validar pH e Densidade após mistura completa.</div>
          </div>
        </div>

        <div class="signature-section">
          <div class="sig-box">Operador Responsável</div>
          <div class="sig-box">Conferência / CQ</div>
        </div>

        <div class="footer">DOCUMENTO OPERACIONAL — GERADO VIA OHANA CLEAN PLANNER — MODELO INDUSTRIAL TÉCNICO</div>
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

    const formatVolLocal = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OF - ${order.batch_number}</title>
        <style>${cssPrintStyles}</style>
      </head>
      <body>
          <div class="watermark">${settings.watermarkText || 'OHANA CLEAN'}</div>
        ${reportHeader('Ordem de Fabricação (OF)', `Lote Técnico: ${order.batch_number}`)}

        <div class="grid grid-3 text-center">
          <div class="data-card">
            <span class="label">Fórmula / Produto</span>
            <span class="value primary">${formula?.name || 'Não Identificada'}</span>
          </div>
          <div class="data-card">
            <span class="label">Volume do Lote</span>
            <span class="value" style="font-size: 16px;">${formatVolLocal(order.planned_volume)} L/Kg</span>
          </div>
          <div class="data-card">
            <span class="label">Data de Fabricação</span>
            <span class="value">${order.end_date ? new Date(order.end_date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        <div class="grid grid-3 text-center" style="margin-top: 10px;">
          <div class="data-card">
            <span class="label">Operador Responsável</span>
            <span class="value">${order.operatorName || 'Indeterminado'}</span>
          </div>
          <div class="data-card">
            <span class="label">Status do Lote</span>
            <span class="badge ${order.status === 'completed' ? 'badge-success' : 'badge-primary'}">${order.status === 'completed' ? 'FINALIZADO' : 'EM PRODUÇÃO'}</span>
          </div>
          <div class="data-card">
            <span class="label">ID de Rastreabilidade</span>
            <span class="value" style="font-family: monospace; font-size: 9px;">${order.id.slice(0, 16).toUpperCase()}</span>
          </div>
        </div>

        <div class="data-card">
          <div class="card-title">1. Rastreabilidade de Insumos Químicos</div>
          <table>
            <thead>
              <tr>
                <th>Elemento Químico Consumido</th>
                <th class="text-right">Volume Escalonado</th>
                <th class="text-center">Unid.</th>
                <th class="text-right">Part. (%)</th>
                <th class="text-right">Lote Fornecedor</th>
              </tr>
            </thead>
            <tbody>
              ${chemicals.map(c => `
                <tr>
                  <td><strong>${c.name}</strong></td>
                  <td class="text-right" style="font-weight: 800;">${formatVolLocal(c.qty)}</td>
                  <td class="text-center">${c.unit.toUpperCase()}</td>
                  <td class="text-right" style="color: #64748b; font-weight: 700;">${((c.qty / totalVolume) * 100).toFixed(2)}%</td>
                  <td class="text-right">
                    ${c.supplierBatch !== '-' ? `<span class="badge badge-primary">${c.supplierBatch}</span>` : '<span style="color:#cbd5e1">—</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${packaging.length > 0 ? `
        <div class="data-card">
          <div class="card-title">2. Lista de Envase e Rastreamento de Embalagem</div>
          <table>
            <thead>
              <tr>
                <th>Componente Logístico</th>
                <th class="text-right">Quantidade</th>
                <th class="text-center">Unid.</th>
                <th class="text-right">Lote Embalagem</th>
              </tr>
            </thead>
            <tbody>
              ${packaging.map(p => `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td class="text-right" style="font-weight: 800;">${formatVolLocal(p.qty)}</td>
                  <td class="text-center">${p.unit.toUpperCase()}</td>
                  <td class="text-right">
                    ${p.supplierBatch !== '-' ? `<span class="badge badge-success">${p.supplierBatch}</span>` : '<span style="color:#cbd5e1">—</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="data-card">
          <div class="card-title">3. Relatório de Ocorrências e Desvios</div>
          <div style="min-height: 80px; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; font-size: 10px; color: #94a3b8; font-style: italic;">
            Descreva qualquer anormalidade durante a mistura, variações de temperatura ou intercorrências mecânicas.
          </div>
        </div>

        <div class="signature-section">
          <div class="sig-box">Operador de Preparo</div>
          <div class="sig-box">Visto Qualidade (CQA)</div>
        </div>

        <div class="footer">DOCUMENTO DE RASTREABILIDADE TOTAL — MODELO INDUSTRIAL OHANA CLEAN PLANNER</div>
      </body>
      </html>
    `;
    triggerPrint(html);
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
        <title>Simulação - ${formula.name}</title>
        <style>${cssPrintStyles}</style>
      </head>
      <body>
          <div class="watermark">${settings.watermarkText || 'OHANA CLEAN'}</div>
        ${reportHeader('Análise de Precificação e Margens', `Simulação Técnica: ${formula.name}`)}

        <div class="grid grid-3 text-center">
          <div class="data-card">
            <span class="label">Canal Selecionado</span>
            <span class="value primary">${label.toUpperCase()}</span>
          </div>
          <div class="data-card">
            <span class="label">Volume Unitário</span>
            <span class="value" style="font-size: 16px;">${capacity >= 1 ? `${capacity}L` : `${capacity * 1000}ml`}</span>
          </div>
          <div class="data-card">
             <span class="label">Status Precificação</span>
             <span class="badge badge-success">CONCLUÍDO</span>
          </div>
        </div>

        <div class="data-card" style="text-align: center; padding: 30px; background: #f8fafc;">
          <span class="label" style="font-size: 11px;">Preço Final de Venda (Sugerido)</span>
          <div style="font-size: 40px; font-weight: 900; color: #1e293b; margin: 10px 0;">${formatCurrency(sellPrice)}</div>
          <div class="grid grid-3" style="width: 80%; margin: 20px auto 0;">
            <div>
              <span class="label">Margem Bruta (R$)</span>
              <span class="value" style="color: #10b981;">${formatCurrency(marginVal)}</span>
            </div>
            <div>
              <span class="label">Margem Bruta (%)</span>
              <span class="value" style="color: #10b981;">${marginPerc.toFixed(2)}%</span>
            </div>
            <div>
              <span class="label">Markup Aplicado</span>
              <span class="value" style="color: ${settings.primaryColor || '#202eac'};">${markupPerc.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="data-card">
            <div class="card-title">Composição de Custo Industrial</div>
            <div style="font-size: 11px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
                <span>Matéria-Prima (Líquido)</span>
                <span style="font-weight: 700;">${formatCurrency(rawCostPerUnit)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
                <span>Embalagem (${pkgOpt?.name || 'Padrão'})</span>
                <span style="font-weight: 700;">${formatCurrency(costEmbalagem)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
                <span>Rótulos e Acabamentos</span>
                <span style="font-weight: 700;">${formatCurrency(costRotulo)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
                <span>Custos Operacionais Fixos</span>
                <span style="font-weight: 700;">${formatCurrency(fixedCosts)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 13px; color: ${settings.primaryColor || '#202eac'};">
                <span style="font-weight: 900;">CUSTO TOTAL DE PRODUÇÃO</span>
                <span style="font-weight: 900;">${formatCurrency(totalCost)}</span>
              </div>
            </div>
          </div>
          <div class="data-card" style="background: #eff6ff; border-style: dashed;">
            <div class="card-title">Análise de Pontos de Equilíbrio</div>
            <div style="font-size: 10px; color: #475569; line-height: 1.4;">
               Este simulador considera os custos vigentes na data de emissão. 
               Qualquer alteração no custo de matéria-prima impactará diretamente na margem de lucro operacional. 
               Recomenda-se revisão trimestral das tabelas de preços de revenda.
            </div>
            <div style="margin-top: 15px; padding: 10px; background: white; border-radius: 6px; border: 1px solid #bfdbfe;">
              <span class="label">Sugestão de Preço Mínimo (+45%)</span>
              <span class="value" style="font-size: 14px;">${formatCurrency(totalCost * 1.45)}</span>
            </div>
          </div>
        </div>

        <div class="signature-section">
          <div class="sig-box">Analista Responsável</div>
          <div class="sig-box">Diretoria Comercial</div>
        </div>

        <div class="footer">ESTE DOCUMENTO É CONFIDENCIAL E DE USO EXCLUSIVO DA GERÊNCIA DE NEGÓCIOS DE ${settings.name.toUpperCase()}</div>
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
