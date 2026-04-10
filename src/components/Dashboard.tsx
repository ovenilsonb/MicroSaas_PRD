import React, { useState, useEffect, useMemo } from 'react';
import { Settings2, Plus, LayoutPanelTop } from 'lucide-react';
import { Responsive as ResponsiveGridLayout, Layout, ResponsiveLayouts } from 'react-grid-layout';
import { WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardCards } from '../hooks/useDashboardCards';
import { useToast } from './dashboard/Toast';
import QuickActions from './dashboard/QuickActions';
import RecentActivity from './dashboard/RecentActivity';
import DashboardCardComp from './dashboard/DashboardCard';

const Responsive = WidthProvider(ResponsiveGridLayout);

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
const MARGIN: [number, number] = [20, 20];

const defaultLayouts: ResponsiveLayouts = {
  lg: [
    { i: 'kpi-faturamento', x: 0, y: 0, w: 3, h: 4 },
    { i: 'kpi-vendas-pendentes', x: 3, y: 0, w: 3, h: 4 },
    { i: 'kpi-ofs-ativas', x: 6, y: 0, w: 3, h: 4 },
    { i: 'kpi-qualidade-pendente', x: 9, y: 0, w: 3, h: 4 },
    { i: 'kpi-valor-estoque', x: 0, y: 4, w: 3, h: 4 },
    { i: 'kpi-estoque-baixo', x: 3, y: 4, w: 3, h: 4 },
    { i: 'kpi-formulas', x: 6, y: 4, w: 3, h: 4 },
    { i: 'kpi-compras', x: 9, y: 4, w: 3, h: 4 },
    { i: 'card-acoes', x: 0, y: 8, w: 4, h: 6, minW: 3, minH: 4 },
    { i: 'card-atividade', x: 4, y: 8, w: 8, h: 6, minW: 4, minH: 4 },
  ]
};

export default function Dashboard({ setActiveMenu }: { setActiveMenu: (menu: string) => void }) {
  const { stats, recentActivity, isLoading, error } = useDashboardData();
  const { allCards } = useDashboardCards(stats);
  const { showToast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(defaultLayouts);
  const [hiddenCardKeys, setHiddenCardKeys] = useState<string[]>([]);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');

  // Carregar Layout e Cards Ocultos
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboardLayouts_v2');
    const savedHidden = localStorage.getItem('dashboardHiddenCards');
    
    if (savedLayout) {
      try {
        setLayouts(JSON.parse(savedLayout));
      } catch (e) { resetLayout(); }
    }
    if (savedHidden) {
      try {
        setHiddenCardKeys(JSON.parse(savedHidden));
      } catch (e) { setHiddenCardKeys([]); }
    }
  }, []);

  useEffect(() => {
    if (error) {
      showToast('error', 'Erro de Conexão', error);
    }
  }, [error, showToast]);

  const handleAction = (action: string) => {
    setActiveMenu(action);
  };

  const onLayoutChange = (_layout: Layout[], allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts);
    if (isEditing) {
      localStorage.setItem('dashboardLayouts_v2', JSON.stringify(allLayouts));
    }
  };

  const handleRemoveCard = (key: string) => {
    const newHidden = [...hiddenCardKeys, key];
    setHiddenCardKeys(newHidden);
    localStorage.setItem('dashboardHiddenCards', JSON.stringify(newHidden));
    showToast('info', 'Card Removido', 'O indicador foi movido para o banco de disponiveis.');
  };

  const handleAddCard = (key: string) => {
    const newHidden = hiddenCardKeys.filter(k => k !== key);
    setHiddenCardKeys(newHidden);
    localStorage.setItem('dashboardHiddenCards', JSON.stringify(newHidden));
    showToast('success', 'Card Adicionado', 'O indicador foi restaurado no painel.');
  };

  const resetLayout = () => {
    setLayouts(defaultLayouts);
    setHiddenCardKeys([]);
    localStorage.removeItem('dashboardLayouts_v2');
    localStorage.removeItem('dashboardHiddenCards');
    showToast('info', 'Restaurado', 'O layout padrão foi restabelecido.');
  };

  const visibleCards = allCards.filter(c => !hiddenCardKeys.includes(c.id));
  const hiddenCards = allCards.filter(c => hiddenCardKeys.includes(c.id));

  return (
    <div className="flex-1 overflow-auto bg-slate-50 relative custom-scrollbar transition-colors duration-300">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center sticky top-0 z-30 shadow-sm transition-colors duration-300">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <LayoutPanelTop className="w-7 h-7 text-[#202eac]" /> Dashboard
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Controle Industrial Ohana Clean</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm ${
              isEditing 
                ? 'bg-[#202eac] text-white hover:bg-[#1a258a] scale-105' 
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            {isEditing ? 'Salvar Organização' : 'Personalizar Tela'}
          </button>
        </div>
      </header>

      <div className="p-8 max-w-[1600px] mx-auto">
        
        {isEditing && (
          <div className="mb-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Dica de Edição */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-900">Modo de Personalização Ativo</p>
                  <p className="text-xs text-blue-700 font-medium">Arraste os cards para organizar ou use o "X" para ocultar indicadores.</p>
                </div>
              </div>
              <button 
                onClick={resetLayout}
                className="px-4 py-2 text-xs font-black text-blue-700 hover:text-white hover:bg-blue-600 rounded-xl transition-all border border-blue-200 uppercase tracking-widest"
              >
                Resetar para o Padrão
              </button>
            </div>

            {/* Banco de Cards Ocultos */}
            {hiddenCards.length > 0 && (
              <div className="p-6 bg-white border border-dashed border-slate-300 rounded-[24px]">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Indicadores Disponíveis
                </h3>
                <div className="flex flex-wrap gap-3">
                  {hiddenCards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => handleAddCard(card.id)}
                      className="px-4 py-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-[#202eac] hover:border-[#202eac]/30 transition-all flex items-center gap-2 group"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#202eac]" />
                      {card.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Responsive
          className="layout"
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={60}
          onLayoutChange={onLayoutChange}
          onBreakpointChange={setCurrentBreakpoint}
          draggableHandle=".drag-handle"
          isDraggable={isEditing}
          isResizable={isEditing}
          margin={MARGIN}
        >
          {/* KPI Cards */}
          {visibleCards.map(card => {
            const layout = layouts[currentBreakpoint]?.find(l => l.i === card.id);
            return (
              <div key={card.id}>
                <DashboardCardComp
                  title={card.title}
                  value={card.value}
                  icon={card.icon}
                  color={card.color}
                  isLoading={isLoading}
                  isEditing={isEditing}
                  w={layout?.w}
                  h={layout?.h}
                  onRemove={() => handleRemoveCard(card.id)}
                />
              </div>
            );
          })}

          {/* Quick Actions */}
          {!hiddenCardKeys.includes('card-acoes') && (
            <div key="card-acoes">
              <QuickActions 
                onAction={handleAction}
                isEditing={isEditing}
                onRemove={() => handleRemoveCard('card-acoes')}
              />
            </div>
          )}

          {/* Recent Activity */}
          {!hiddenCardKeys.includes('card-atividade') && (
            <div key="card-atividade">
              <RecentActivity 
                activities={recentActivity}
                isLoading={isLoading}
                isEditing={isEditing}
                onRemove={() => handleRemoveCard('card-atividade')}
              />
            </div>
          )}
        </Responsive>
      </div>
    </div>
  );
}
