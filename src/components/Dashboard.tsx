import React, { useState, useEffect } from 'react';
import { 
  Beaker, Package, TrendingUp, AlertTriangle, 
  ArrowRight, Plus, Activity, DollarSign, Settings2, GripHorizontal,
  CheckCircle2, Info, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Responsive as ResponsiveGridLayout, Layout, ResponsiveLayouts } from 'react-grid-layout';
import { WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const Responsive = WidthProvider(ResponsiveGridLayout);

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
const MARGIN: [number, number] = [24, 24];

export default function Dashboard({ setActiveMenu }: { setActiveMenu: (menu: string) => void }) {
  const [stats, setStats] = useState({
    totalInsumos: 0,
    estoqueBaixo: 0,
    totalFormulas: 0,
    custoMedio: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Notification State
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showNotify = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setNotification({ show: true, type, title, message });
    if (type !== 'error') {
      setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
    }
  };
  
  // Default layout for the dashboard
  const defaultLayouts: ResponsiveLayouts = {
    lg: [
      { i: 'card-formulas', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'card-insumos', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'card-alertas', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'card-custo', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'card-acoes', x: 0, y: 2, w: 4, h: 4, minW: 3, minH: 3 },
      { i: 'card-atividade', x: 4, y: 2, w: 8, h: 4, minW: 4, minH: 3 },
    ]
  };
  
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(defaultLayouts);

  // Load saved layout from localStorage on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboardLayouts');
    if (savedLayout) {
      try {
        setLayouts(JSON.parse(savedLayout));
      } catch (e) {
        console.error('Failed to parse saved layout', e);
      }
    }
    fetchDashboardData();
  }, []);

  const dragConfig = React.useMemo(() => ({ enabled: isEditing, handle: '.drag-handle' }), [isEditing]);
  const resizeConfig = React.useMemo(() => ({ enabled: isEditing }), [isEditing]);

  const onLayoutChange = (layout: Layout, allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts);
    if (isEditing) {
      localStorage.setItem('dashboardLayouts', JSON.stringify(allLayouts));
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch Insumos stats
      const { data: insumos, error: insumosError } = await supabase
        .from('ingredients')
        .select('estoque_atual, estoque_minimo');
      
      if (insumosError) throw insumosError;

      const totalInsumos = insumos?.length || 0;
      const estoqueBaixo = insumos?.filter(ing => (ing.estoque_atual || 0) <= (ing.estoque_minimo || 0)).length || 0;

      // Fetch Formulas and calculate average cost
      const { data: formulas, error: formulasError } = await supabase
        .from('formulas')
        .select(`
          id,
          name,
          created_at,
          formula_ingredients (
            quantity,
            ingredients (cost_per_unit),
            variants (cost_per_unit)
          )
        `);
      
      if (formulasError) throw formulasError;

      const totalFormulas = formulas?.length || 0;
      
      let totalCostSum = 0;
      let formulasWithCost = 0;

      formulas?.forEach(f => {
        const cost = (f.formula_ingredients as any[]).reduce((sum, item) => {
          let itemCost = 0;
          const variantCost = item.variants?.[0]?.cost_per_unit;
          const ingredientCost = item.ingredients?.[0]?.cost_per_unit;

          if (variantCost !== undefined && variantCost !== null) {
            itemCost = variantCost;
          } else if (ingredientCost !== undefined && ingredientCost !== null) {
            itemCost = ingredientCost;
          }
          return sum + (item.quantity * itemCost);
        }, 0);
        
        if (cost > 0) {
          totalCostSum += cost;
          formulasWithCost++;
        }
      });

      const custoMedio = formulasWithCost > 0 ? totalCostSum / formulasWithCost : 0;

      // Fetch recent activity from both tables
      const { data: recentIngredients } = await supabase
        .from('ingredients')
        .select('name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      const activity = [
        ...(formulas || []).map(f => ({ type: 'formula', name: f.name, date: new Date(f.created_at) })),
        ...(recentIngredients || []).map(i => ({ type: 'insumo', name: i.name, date: new Date(i.created_at) }))
      ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

      setRecentActivity(activity);

      setStats({
        totalInsumos,
        estoqueBaixo,
        totalFormulas,
        custoMedio
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showNotify('error', 'Erro de Conexão', 'Não foi possível carregar os dados do dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 relative">
      {/* Notifications / Toasts */}
      {notification.show && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-full duration-300">
          <div className={`flex items-start gap-4 p-4 rounded-2xl shadow-2xl border min-w-[320px] ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className={`p-2 rounded-xl ${
              notification.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
              notification.type === 'error' ? 'bg-red-100 text-red-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
               notification.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : 
               <Info className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">{notification.title}</h4>
              <p className="text-xs mt-1 opacity-90">{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Activity className="w-6 h-6 text-[#202eac]" /> Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">Visão geral do seu sistema de produção química.</p>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
            isEditing 
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          {isEditing ? 'Concluir Edição' : 'Editar Layout'}
        </button>
      </header>

      <div className="p-8 max-w-7xl mx-auto">
        
        {isEditing && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <p className="text-sm text-blue-800">
              <strong>Modo de Edição:</strong> Arraste os cards pelo ícone superior ou redimensione pelos cantos inferiores. Suas alterações são salvas automaticamente.
            </p>
            <button 
              onClick={() => {
                setLayouts(defaultLayouts);
                localStorage.removeItem('dashboardLayouts');
              }}
              className="text-sm font-medium text-blue-700 hover:text-blue-900 underline"
            >
              Restaurar Layout Padrão
            </button>
          </div>
        )}

        <Responsive
          className="layout"
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={60}
          onLayoutChange={onLayoutChange}
          dragConfig={dragConfig}
          resizeConfig={resizeConfig}
          margin={MARGIN}
        >
          {/* Card 1: Fórmulas */}
          <div key="card-formulas" className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group">
            {isEditing && (
              <div className="drag-handle bg-slate-100 p-1 flex justify-center cursor-move border-b border-slate-200">
                <GripHorizontal className="w-4 h-4 text-slate-400" />
              </div>
            )}
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 text-[#202eac] rounded-xl flex items-center justify-center shrink-0">
                  <Beaker className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">Total de Fórmulas</h3>
              <p className="text-3xl font-bold text-slate-800">
                {isLoading ? '...' : stats.totalFormulas}
              </p>
            </div>
          </div>

          {/* Card 2: Insumos */}
          <div key="card-insumos" className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group">
            {isEditing && (
              <div className="drag-handle bg-slate-100 p-1 flex justify-center cursor-move border-b border-slate-200">
                <GripHorizontal className="w-4 h-4 text-slate-400" />
              </div>
            )}
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">Insumos Cadastrados</h3>
              <p className="text-3xl font-bold text-slate-800">
                {isLoading ? '...' : stats.totalInsumos}
              </p>
            </div>
          </div>

          {/* Card 3: Alertas de Estoque */}
          <div key="card-alertas" className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group">
            {isEditing && (
              <div className="drag-handle bg-slate-100 p-1 flex justify-center cursor-move border-b border-slate-200">
                <GripHorizontal className="w-4 h-4 text-slate-400" />
              </div>
            )}
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                {stats.estoqueBaixo > 0 && (
                  <span className="flex h-3 w-3 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">Insumos com Estoque Baixo</h3>
              <p className={`text-3xl font-bold ${stats.estoqueBaixo > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {isLoading ? '...' : stats.estoqueBaixo}
              </p>
            </div>
          </div>

          {/* Card 4: Custo Médio */}
          <div key="card-custo" className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group">
            {isEditing && (
              <div className="drag-handle bg-slate-100 p-1 flex justify-center cursor-move border-b border-slate-200">
                <GripHorizontal className="w-4 h-4 text-slate-400" />
              </div>
            )}
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">Custo Médio de Produção</h3>
              <p className="text-3xl font-bold text-slate-800 font-mono">
                {isLoading ? '...' : stats.custoMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div key="card-acoes" className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group">
            {isEditing && (
              <div className="drag-handle bg-slate-100 p-1 flex justify-center cursor-move border-b border-slate-200">
                <GripHorizontal className="w-4 h-4 text-slate-400" />
              </div>
            )}
            <div className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
              <h2 className="text-lg font-bold text-slate-800 mb-4 shrink-0">Ações Rápidas</h2>
              <div className="space-y-4">
                <button 
                  onClick={() => setActiveMenu('formulas')}
                  className="w-full bg-white border border-slate-200 hover:border-[#202eac] hover:shadow-md transition-all rounded-xl p-4 flex items-center justify-between group/btn"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 text-[#202eac] rounded-lg flex items-center justify-center group-hover/btn:bg-[#202eac] group-hover/btn:text-white transition-colors shrink-0">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800">Nova Fórmula</h4>
                      <p className="text-xs text-slate-500">Criar nova composição</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover/btn:text-[#202eac] transition-colors shrink-0" />
                </button>

                <button 
                  onClick={() => setActiveMenu('insumos')}
                  className="w-full bg-white border border-slate-200 hover:border-[#202eac] hover:shadow-md transition-all rounded-xl p-4 flex items-center justify-between group/btn"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center group-hover/btn:bg-indigo-600 group-hover/btn:text-white transition-colors shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800">Gerenciar Insumos</h4>
                      <p className="text-xs text-slate-500">Ver estoque e preços</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover/btn:text-indigo-600 transition-colors shrink-0" />
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div key="card-atividade" className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group">
            {isEditing && (
              <div className="drag-handle bg-slate-100 p-1 flex justify-center cursor-move border-b border-slate-200">
                <GripHorizontal className="w-4 h-4 text-slate-400" />
              </div>
            )}
            <div className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h2 className="text-lg font-bold text-slate-800">Atividade Recente</h2>
                <button className="text-sm font-medium text-[#202eac] hover:text-blue-800 transition-colors">
                  Ver tudo
                </button>
              </div>

              <div className="space-y-6">
                {isLoading ? (
                  <div className="py-8 text-center text-slate-400 text-sm italic">Carregando atividade...</div>
                ) : recentActivity.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm italic">Nenhuma atividade recente.</div>
                ) : (
                  recentActivity.map((act, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        act.type === 'formula' ? 'bg-blue-50' : 'bg-emerald-50'
                      }`}>
                        {act.type === 'formula' ? (
                          <Beaker className="w-5 h-5 text-[#202eac]" />
                        ) : (
                          <Package className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-slate-800">
                          {act.type === 'formula' ? 'Fórmula' : 'Insumo'} <strong className="font-semibold">{act.name}</strong> foi {act.type === 'formula' ? 'cadastrada' : 'adicionado'}.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {act.date.toLocaleDateString('pt-BR')} às {act.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Responsive>
      </div>
    </div>
  );
}
