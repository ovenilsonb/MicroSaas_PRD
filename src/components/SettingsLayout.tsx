import React, { useState } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Eye, 
  EyeOff, 
  Layout,
  Layers,
  Settings
} from 'lucide-react';
import { CompanySettings, SidebarSection } from '../hooks/useCompanySettings';
import { ALL_NAV_ITEMS } from './Sidebar';

interface SettingsLayoutProps {
  settings: CompanySettings;
  onUpdate: (newLayout: SidebarSection[]) => void;
}

// Estilo de animação de drop suave
const dropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

function SortableItem({ id, label, icon: Icon, isVisible, isDragging: isDraggingItem }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl mb-2 transition-all group ${
        isDragging ? 'shadow-2xl ring-2 ring-blue-500/50 scale-[1.02] opacity-50' : 'shadow-sm'
      }`}
    >
      <button 
        {...attributes} 
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400`}>
        <Icon className="w-4 h-4" />
      </div>

      <span className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200 tracking-tight">{label}</span>
      
      <div className="w-2 h-2 rounded-full bg-blue-500/20"></div>
    </div>
  );
}

function SortableSection({ section, onToggleSection }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-6 transition-all ${
        isDragging ? 'shadow-2xl ring-2 ring-blue-500/50 scale-[1.01]' : 'shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            {...attributes} 
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
            <Layout className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">{section.title}</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{section.itemIds.length} Módulos</p>
          </div>
        </div>
        <button
          onClick={() => onToggleSection(section.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            section.isVisible 
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100' 
              : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100'
          }`}
        >
          {section.isVisible ? <><Eye className="w-3.5 h-3.5" /> Visível</> : <><EyeOff className="w-3.5 h-3.5" /> Oculto</>}
        </button>
      </div>

      <SortableContext 
        id={section.id}
        items={section.itemIds}
        strategy={verticalListSortingStrategy}
      >
        <div className={`pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-2 min-h-[50px] transition-colors rounded-r-xl ${
          section.itemIds.length === 0 ? 'bg-slate-100/50 dark:bg-slate-800/30 border-dashed border-2' : ''
        }`}>
          {section.itemIds.map((itemId: string) => {
            const item = ALL_NAV_ITEMS.find(i => i.id === itemId);
            if (!item) return null;
            return (
              <SortableItem 
                key={itemId} 
                id={itemId} 
                label={item.label} 
                icon={item.icon}
                isVisible={true}
              />
            );
          })}
          {section.itemIds.length === 0 && (
            <div className="flex flex-col items-center justify-center py-4 text-slate-400">
              <p className="text-[10px] font-bold uppercase tracking-widest">Categoria Vazia</p>
              <p className="text-[9px]">Arraste módulos para cá</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function SettingsLayout({ settings, onUpdate }: SettingsLayoutProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContainer = (id: string) => {
    if (settings.sidebarLayout.find(s => s.id === id)) return id;
    
    return settings.sidebarLayout.find(s => 
      s.itemIds.includes(id)
    )?.id;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const overId = over?.id;

    if (!overId || active.id === overId) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(overId as string);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    // Se estamos arrastando um item para outro container
    const activeIsSection = settings.sidebarLayout.find(s => s.id === active.id);
    if (activeIsSection) return; // Não movemos categorias inteiras para dentro de outras aqui

    const activeItems = settings.sidebarLayout.find(s => s.id === activeContainer)?.itemIds || [];
    const overItems = settings.sidebarLayout.find(s => s.id === overContainer)?.itemIds || [];

    const activeIndex = activeItems.indexOf(active.id as string);
    const overIndex = overItems.indexOf(overId as string);

    let newIndex;
    if (settings.sidebarLayout.find(s => s.id === overId)) {
      newIndex = overItems.length + 1;
    } else {
      const isBelowLastItem = over && overIndex === overItems.length - 1;
      const modifier = isBelowLastItem ? 1 : 0;
      newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
    }

    const newLayout = settings.sidebarLayout.map(section => {
      if (section.id === activeContainer) {
        return {
          ...section,
          itemIds: section.itemIds.filter(id => id !== active.id)
        };
      }
      if (section.id === overContainer) {
        const newItemIds = [...section.itemIds];
        newItemIds.splice(newIndex, 0, active.id as string);
        return {
          ...section,
          itemIds: newItemIds
        };
      }
      return section;
    });

    onUpdate(newLayout);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as string;
    const overId = over?.id as string;

    if (!overId) {
      setActiveId(null);
      return;
    }

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) {
      setActiveId(null);
      return;
    }

    // Se for reordenação de categoria (activeId é uma categoria)
    const activeSection = settings.sidebarLayout.find(s => s.id === activeId);
    if (activeSection) {
      if (activeId !== overContainer) {
        const oldIndex = settings.sidebarLayout.findIndex(s => s.id === activeId);
        const newIndex = settings.sidebarLayout.findIndex(s => s.id === overContainer);
        onUpdate(arrayMove(settings.sidebarLayout, oldIndex, newIndex));
      }
    } else if (activeContainer === overContainer) {
      // Reordenação interna (entre itens da mesma categoria)
      const section = settings.sidebarLayout.find(s => s.id === activeContainer);
      if (section && activeId !== overId) {
        const oldIndex = section.itemIds.indexOf(activeId);
        const newIndex = section.itemIds.indexOf(overId);
        
        const newLayout = settings.sidebarLayout.map(s => {
          if (s.id === activeContainer) {
            return {
              ...s,
              itemIds: arrayMove(s.itemIds, oldIndex, newIndex)
            };
          }
          return s;
        });
        onUpdate(newLayout);
      }
    }

    setActiveId(null);
  };

  const toggleSection = (sectionId: string) => {
    const newLayout = settings.sidebarLayout.map(s => 
      s.id === sectionId ? { ...s, isVisible: !s.isVisible } : s
    );
    onUpdate(newLayout);
  };

  const activeItem = activeId ? ALL_NAV_ITEMS.find(i => i.id === activeId) : null;
  const activeSection = activeId ? settings.sidebarLayout.find(s => s.id === activeId) : null;

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100/50 dark:border-blue-900/20">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Configuração de Fluxo Industrial</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Reorganização total: mova módulos livremente entre categorias e priorize seu dashboard.</p>
          </div>
        </div>
      </header>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={settings.sidebarLayout.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {settings.sidebarLayout.map((section) => (
              <SortableSection 
                key={section.id} 
                section={section} 
                onToggleSection={toggleSection}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeId ? (
            activeSection ? (
              <div className="bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-3xl p-6 shadow-2xl opacity-90 scale-95">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center">
                    <Layout className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">{activeSection.title}</h4>
                </div>
              </div>
            ) : activeItem ? (
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-xl shadow-2xl opacity-90 scale-105">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <activeItem.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{activeItem.label}</span>
              </div>
            ) : null
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="mt-8 p-6 bg-slate-900 dark:bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Settings className="w-32 h-32 text-white" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 text-white mb-4">
            <div className="w-2 h-12 bg-blue-500 rounded-full"></div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Dica Fluiditê</p>
              <h4 className="text-xl font-black">Organização Sem Limites</h4>
              <p className="text-sm text-slate-400 font-medium mt-1">Você pode mover qualquer módulo para qualquer categoria, inclusive criando categorias vazias para reserva.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
