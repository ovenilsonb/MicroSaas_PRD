import { useState, useEffect, useCallback, useRef } from 'react';
import { ResponsiveLayouts, Layout } from 'react-grid-layout';
import { useToast } from '../components/dashboard/Toast';

const defaultLayouts: ResponsiveLayouts = {
  lg: [
    { i: 'kpi-faturamento', x: 0, y: 0, w: 60, h: 8 },
    { i: 'kpi-vendas-pendentes', x: 60, y: 0, w: 60, h: 8 },
    { i: 'kpi-ofs-ativas', x: 120, y: 0, w: 60, h: 8 },
    { i: 'kpi-qualidade-pendente', x: 180, y: 0, w: 60, h: 8 },
    { i: 'kpi-valor-estoque', x: 0, y: 8, w: 60, h: 8 },
    { i: 'kpi-estoque-baixo', x: 60, y: 8, w: 60, h: 8 },
    { i: 'kpi-formulas', x: 120, y: 8, w: 60, h: 8 },
    { i: 'kpi-compras', x: 180, y: 8, w: 60, h: 8 },
    { i: 'card-acoes', x: 0, y: 16, w: 80, h: 12, minW: 60, minH: 6 },
    { i: 'card-atividade', x: 80, y: 16, w: 160, h: 12, minW: 80, minH: 6 },
  ]
};

export function useDashboardLayout() {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() => {
    const saved = localStorage.getItem('dashboardLayouts_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error('Layout Parse Error', e); }
    }
    return defaultLayouts;
  });

  const [hiddenCardKeys, setHiddenCardKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboardHiddenCards');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error('Hidden Cards Parse Error', e); }
    }
    return [];
  });

  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');

  // Ref to track layout for deep equality comparison
  const lastLayoutRef = useRef<string>(JSON.stringify(layouts));

  const onLayoutChange = useCallback((_layout: Layout[], allLayouts: ResponsiveLayouts) => {
    const layoutStr = JSON.stringify(allLayouts);
    if (layoutStr === lastLayoutRef.current) return;
    
    lastLayoutRef.current = layoutStr;
    setLayouts(allLayouts);
    
    if (isEditing) {
      localStorage.setItem('dashboardLayouts_v2', layoutStr);
    }
  }, [isEditing]);

  const handleRemoveCard = useCallback((key: string) => {
    const newHidden = [...hiddenCardKeys, key];
    setHiddenCardKeys(newHidden);
    localStorage.setItem('dashboardHiddenCards', JSON.stringify(newHidden));
    showToast('info', 'Card Removido', 'O indicador foi movido para o banco de disponíveis.');
  }, [hiddenCardKeys, showToast]);

  const handleAddCard = useCallback((key: string) => {
    const newHidden = hiddenCardKeys.filter(k => k !== key);
    setHiddenCardKeys(newHidden);
    localStorage.setItem('dashboardHiddenCards', JSON.stringify(newHidden));
    showToast('success', 'Card Adicionado', 'O indicador foi restaurado no painel.');
  }, [hiddenCardKeys, showToast]);

  const resetLayout = useCallback(() => {
    const defaultStr = JSON.stringify(defaultLayouts);
    lastLayoutRef.current = defaultStr;
    setLayouts(defaultLayouts);
    setHiddenCardKeys([]);
    localStorage.removeItem('dashboardLayouts_v2');
    localStorage.removeItem('dashboardHiddenCards');
    showToast('info', 'Restaurado', 'O layout padrão foi restabelecido.');
  }, [showToast]);

  return {
    isEditing,
    setIsEditing,
    layouts,
    setLayouts,
    hiddenCardKeys,
    currentBreakpoint,
    onBreakpointChange: useCallback((newBreakpoint: string) => setCurrentBreakpoint(newBreakpoint), []),
    onLayoutChange,
    handleRemoveCard,
    handleAddCard,
    resetLayout
  };
}
