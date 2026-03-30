import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Settings2 } from 'lucide-react';
import { Responsive as ResponsiveGridLayout, Layout, ResponsiveLayouts } from 'react-grid-layout';
import { WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { useDashboardData } from '../hooks/useDashboardData';
import { useToast } from './dashboard/Toast';
import StatsGrid from './dashboard/StatsGrid';
import QuickActions from './dashboard/QuickActions';
import RecentActivity from './dashboard/RecentActivity';

const Responsive = WidthProvider(ResponsiveGridLayout);

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
const MARGIN: [number, number] = [24, 24];

const defaultLayouts: ResponsiveLayouts = {
  lg: [
    { i: 'stats-row', x: 0, y: 0, w: 12, h: 3, minW: 4, minH: 3 },
    { i: 'card-acoes', x: 0, y: 3, w: 4, h: 5, minW: 3, minH: 4 },
    { i: 'card-atividade', x: 4, y: 3, w: 8, h: 5, minW: 4, minH: 4 },
  ]
};

export default function Dashboard({ setActiveMenu }: { setActiveMenu: (menu: string) => void }) {
  const { stats, recentActivity, isLoading, error } = useDashboardData();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(defaultLayouts);

  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboardLayouts');
    if (savedLayout) {
      try {
        setLayouts(JSON.parse(savedLayout));
      } catch (e) {
        console.error('Failed to parse saved layout', e);
      }
    }
  }, []);

  useEffect(() => {
    if (error) {
      showToast('error', 'Erro de Conexão', error);
    }
  }, [error, showToast]);

  const dragConfig = useMemo(() => ({ enabled: isEditing, handle: '.drag-handle' }), [isEditing]);
  const resizeConfig = useMemo(() => ({ enabled: isEditing }), [isEditing]);

  const onLayoutChange = (_layout: Layout, allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts);
    if (isEditing) {
      localStorage.setItem('dashboardLayouts', JSON.stringify(allLayouts));
    }
  };

  const handleAction = (action: string) => {
    setActiveMenu(action);
  };

  const resetLayout = () => {
    setLayouts(defaultLayouts);
    localStorage.removeItem('dashboardLayouts');
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 relative">
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
              onClick={resetLayout}
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
          <div key="stats-row">
            <StatsGrid 
              stats={stats} 
              isLoading={isLoading} 
              isEditing={isEditing}
            />
          </div>

          <div key="card-acoes">
            <QuickActions 
              onAction={handleAction}
              isEditing={isEditing}
            />
          </div>

          <div key="card-atividade">
            <RecentActivity 
              activities={recentActivity}
              isLoading={isLoading}
              isEditing={isEditing}
            />
          </div>
        </Responsive>
      </div>
    </div>
  );
}
