import React from 'react';
import { Responsive as ResponsiveGridLayout } from 'react-grid-layout';
import { WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardCards } from '../hooks/useDashboardCards';
import { useDashboardLayout } from '../hooks/useDashboardLayout';

import { DashboardHeader } from './dashboard/DashboardHeader';
import { DashboardCustomizer } from './dashboard/DashboardCustomizer';
import { DashboardSkeleton } from './dashboard/DashboardSkeleton';
import DashboardCardComp from './dashboard/DashboardCard';
import QuickActions from './dashboard/QuickActions';
import RecentActivity from './dashboard/RecentActivity';
import { ConfirmModal } from './shared/ConfirmModal';

const Responsive = WidthProvider(ResponsiveGridLayout);

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 240, md: 200, sm: 120, xs: 80, xxs: 40 };
const MARGIN: [number, number] = [24, 24];

export default function Dashboard({ setActiveMenu }: { setActiveMenu: (menu: string) => void }) {
  const { stats, recentActivity, isLoading, refetch } = useDashboardData();
  const { allCards } = useDashboardCards(stats);

  // Custom Hook for Layout Persistence and Logic
  const {
    isEditing,
    setIsEditing,
    layouts,
    hiddenCardKeys,
    currentBreakpoint,
    onBreakpointChange,
    onLayoutChange,
    handleRemoveCard,
    handleAddCard,
    resetLayout
  } = useDashboardLayout();

  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleAction = React.useCallback((action: string) => {
    setActiveMenu(action);
  }, [setActiveMenu]);

  const onRemoveDashboardCard = React.useCallback((id: string) => {
    handleRemoveCard(id);
  }, [handleRemoveCard]);

  const visibleCards = React.useMemo(() => 
    allCards.filter(c => !hiddenCardKeys.includes(c.id)),
    [allCards, hiddenCardKeys]
  );
  
  const hiddenCards = React.useMemo(() => 
    allCards.filter(c => hiddenCardKeys.includes(c.id)),
    [allCards, hiddenCardKeys]
  );

  // Consider it "Ready" only when data is loaded OR we are editing
  const isReady = hasMounted && (!isLoading || isEditing);

  if (!isReady && layouts.lg.length === 0) {
    return (
      <div className="flex-1 overflow-auto bg-slate-50 relative">
        <DashboardHeader
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onRefresh={refetch}
          isLoading={true}
        />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50 relative custom-scrollbar transition-colors duration-300">
      <DashboardHeader
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        onRefresh={refetch}
        isLoading={isLoading}
      />

      <div className="p-8 max-w-[1600px] mx-auto">

        <DashboardCustomizer
          isEditing={isEditing}
          resetLayout={resetLayout}
          hiddenCards={hiddenCards}
          onAddCard={handleAddCard}
        />

        <Responsive
          className="layout"
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={30}
          onLayoutChange={onLayoutChange}
          onBreakpointChange={onBreakpointChange}
          draggableHandle=".drag-handle"
          isDraggable={isEditing}
          isResizable={isEditing}
          margin={MARGIN}
          measureBeforeMount={true}
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
                  onRemove={() => onRemoveDashboardCard(card.id)}
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
                onRemove={() => onRemoveDashboardCard('card-acoes')}
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
                onRemove={() => onRemoveDashboardCard('card-atividade')}
              />
            </div>
          )}
        </Responsive>
      </div>
    </div>
  );
}
