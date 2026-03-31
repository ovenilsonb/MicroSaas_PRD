import React, { useState, useCallback, createContext, useContext } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Filter,
  X,
  Check,
  Edit3,
  GripVertical,
  ArrowLeft,
  MoreHorizontal,
  RefreshCw,
  SlidersHorizontal,
  Columns,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Upload,
  Plus,
} from 'lucide-react';

const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'text-indigo-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', icon: 'text-violet-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', icon: 'text-rose-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', icon: 'text-cyan-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'text-teal-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'text-orange-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-500' },
  red: { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-500' },
};

interface PageV2ContextType {
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isAllSelected: (ids: string[]) => boolean;
  isSelectable: boolean;
  setIsSelectable: (v: boolean) => void;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  setSortColumn: (col: string | null) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
  inlineEditColumn: string | null;
  setInlineEditColumn: (col: string | null) => void;
  editingRowId: string | null;
  setEditingRowId: (id: string | null) => void;
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean) => void;
  comparisonMode: boolean;
  setComparisonMode: (v: boolean) => void;
  comparisonIds: string[];
  toggleComparison: (id: string) => void;
}

const PageV2Context = createContext<PageV2ContextType | null>(null);

export function usePageV2() {
  const ctx = useContext(PageV2Context);
  if (!ctx) throw new Error('usePageV2 must be used within PageLayoutV2');
  return ctx;
}

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === tab.id
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
          }`}
        >
          {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
          {tab.label}
          {tab.badge !== undefined && (
            <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${
              activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'
            }`}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'range';
  placeholder?: string;
  options?: { value: string; label: string }[];
}

interface InlineFiltersProps {
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onClear?: () => void;
}

export function InlineFilters({ fields, values, onChange, onClear }: InlineFiltersProps) {
  const activeCount = Object.values(values).filter(v => v !== '' && v !== undefined && v !== null).length;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {fields.map(field => (
        <div key={field.key} className="relative">
          {field.type === 'text' && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={values[field.key] || ''}
                onChange={e => onChange(field.key, e.target.value)}
                placeholder={field.placeholder || field.label}
                className="pl-9 pr-3 py-2 bg-slate-100 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg text-sm font-medium transition-all outline-none w-40"
              />
            </div>
          )}
          {field.type === 'select' && (
            <select
              value={values[field.key] || ''}
              onChange={e => onChange(field.key, e.target.value)}
              className="px-3 py-2 bg-slate-100 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-lg text-sm font-medium transition-all outline-none appearance-none cursor-pointer pr-8 min-w-[140px]"
            >
              <option value="">{field.label}</option>
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
          {field.type === 'number' && (
            <input
              type="number"
              value={values[field.key] || ''}
              onChange={e => onChange(field.key, e.target.value)}
              placeholder={field.placeholder || field.label}
              className="px-3 py-2 bg-slate-100 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-lg text-sm font-medium transition-all outline-none w-28"
            />
          )}
        </div>
      ))}
      {activeCount > 0 && onClear && (
        <button
          onClick={onClear}
          className="text-xs font-medium text-slate-500 hover:text-red-500 flex items-center gap-1 px-2 py-1"
        >
          <X className="w-3 h-3" /> Limpar ({activeCount})
        </button>
      )}
    </div>
  );
}

interface SortableHeaderProps {
  columnKey: string;
  label: string;
  sortable?: boolean;
  className?: string;
}

export function SortableHeader({ columnKey, label, sortable = true, className = '' }: SortableHeaderProps) {
  const { sortColumn, sortDirection, setSortColumn, setSortDirection } = usePageV2();

  if (!sortable) return <th className={className}>{label}</th>;

  const isActive = sortColumn === columnKey;

  const handleClick = () => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  return (
    <th 
      className={`px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {isActive ? (
          sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
        )}
      </div>
    </th>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
}

export function Checkbox({ checked, onChange, indeterminate }: CheckboxProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
        checked || indeterminate 
          ? 'bg-indigo-600 border-indigo-600' 
          : 'bg-white border-slate-300 hover:border-indigo-400'
      }`}
    >
      {(checked || indeterminate) && <Check className="w-3 h-3 text-white" />}
    </button>
  );
}

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: {
    label: string;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    onClick: () => void;
  }[];
}

export function BulkActionsBar({ selectedCount, onClear, actions }: BulkActionsBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4">
      <span className="font-bold text-sm">{selectedCount} selecionado(s)</span>
      <div className="h-5 w-px bg-slate-700" />
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={action.onClick}
          className={`text-sm font-medium flex items-center gap-1.5 hover:opacity-80 transition-opacity ${
            action.variant === 'danger' ? 'text-red-400' : 'text-white'
          }`}
        >
          {action.icon && <span className="w-4 h-4">{action.icon}</span>}
          {action.label}
        </button>
      ))}
      <div className="h-5 w-px bg-slate-700" />
      <button onClick={onClear} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface InlineEditCellProps {
  value: any;
  onSave: (value: any) => void;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
}

export function InlineEditCell({ value, onSave, type = 'text', options }: InlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleSave = () => {
    onSave(tempValue);
    setEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (!editing) {
    return (
      <div 
        onClick={() => setEditing(true)}
        className="cursor-pointer hover:bg-indigo-50 px-3 py-2 -mx-3 rounded-lg transition-colors flex items-center gap-2 group"
      >
        <span>{value ?? '-'}</span>
        <Edit3 className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {type === 'text' && (
        <input
          autoFocus
          type="text"
          value={tempValue}
          onChange={e => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="px-2 py-1 bg-white border-2 border-indigo-500 rounded-lg text-sm outline-none w-full"
        />
      )}
      {type === 'number' && (
        <input
          autoFocus
          type="number"
          value={tempValue}
          onChange={e => setTempValue(Number(e.target.value))}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="px-2 py-1 bg-white border-2 border-indigo-500 rounded-lg text-sm outline-none w-20"
        />
      )}
      {type === 'select' && (
        <select
          autoFocus
          value={tempValue}
          onChange={e => { setTempValue(e.target.value); onSave(e.target.value); setEditing(false); }}
          className="px-2 py-1 bg-white border-2 border-indigo-500 rounded-lg text-sm outline-none"
        >
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

interface DraggableRowProps {
  children: React.ReactNode;
  id: string;
  onDragStart?: (id: string) => void;
  onDragOver?: (id: string) => void;
  onDrop?: (id: string) => void;
  isDragging?: boolean;
}

export function DraggableRow({ children, id, onDragStart, onDragOver, onDrop, isDragging }: DraggableRowProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', id);
    onDragStart?.(id);
  };

  return (
    <tr
      draggable
      onDragStart={handleDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver?.(id); }}
      onDrop={e => { e.preventDefault(); onDrop?.(id); }}
      className={`transition-all ${isDragging ? 'opacity-50 bg-slate-100' : 'hover:bg-slate-50'} cursor-move`}
    >
      {children}
    </tr>
  );
}

interface ComparisonPanelProps {
  leftId: string;
  rightId: string;
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  onClose: () => void;
}

export function ComparisonPanel({ leftId, rightId, leftContent, rightContent, onClose }: ComparisonPanelProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <Columns className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800">Comparação</h3>
            <span className="text-sm text-slate-500">ID: {leftId} vs {rightId}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 border-r border-slate-200 overflow-auto p-6">
            {leftContent}
          </div>
          <div className="flex-1 overflow-auto p-6">
            {rightContent}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function FiltersDrawer({ isOpen, onClose, title = 'Filtros', children }: FiltersDrawerProps) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-slate-900/20 z-40" onClick={onClose} />}
      <div className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            {title}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </>
  );
}

interface HeaderAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  onClick: () => void;
  disabled?: boolean;
}

interface MoreActionsMenuProps {
  actions: HeaderAction[];
}

export function MoreActionsMenu({ actions }: MoreActionsMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
      >
        <MoreHorizontal className="w-5 h-5 text-slate-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => { action.onClick(); setOpen(false); }}
                disabled={action.disabled}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                  action.disabled 
                    ? 'text-slate-300 cursor-not-allowed' 
                    : action.variant === 'danger' 
                      ? 'text-red-600 hover:bg-red-50' 
                      : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {action.icon && <span className="w-4 h-4">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface StatBadge {
  label: string;
  value: string | number;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'blue';
}

interface PageHeaderV2Props {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
  actions?: React.ReactNode;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  inlineFilters?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  stats?: StatBadge[];
  selectedCount?: number;
  bulkActions?: HeaderAction[];
  onClearSelection?: () => void;
}

export function PageHeaderV2({
  title,
  subtitle,
  icon,
  color = 'indigo',
  actions,
  tabs,
  activeTab,
  onTabChange,
  inlineFilters,
  showBack,
  onBack,
  stats,
  selectedCount = 0,
  bulkActions,
  onClearSelection,
}: PageHeaderV2Props) {
  const colors = colorMap[color] || colorMap.indigo;
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-5 shrink-0">
      {selectedCount > 0 && bulkActions ? (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onClearSelection} className="p-2 hover:bg-slate-100 rounded-xl">
              <X className="w-4 h-4 text-slate-500" />
            </button>
            <span className="font-bold text-slate-800">{selectedCount} selecionado(s)</span>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                  action.variant === 'danger' 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                }`}
              >
                {action.icon && <span className="w-4 h-4">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {showBack && onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          )}
          {icon && (
            <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
              <span className={colors.icon}>{icon}</span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5 font-medium">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {tabs && onTabChange && (
        <div className="mt-5 pt-5 border-t border-slate-100">
          <Tabs tabs={tabs} activeTab={activeTab || tabs[0]?.id || ''} onChange={onTabChange} />
        </div>
      )}

      {(inlineFilters || stats) && (
        <div className="mt-5 pt-5 border-t border-slate-100 flex items-end justify-between gap-4">
          <div className="flex-1">
            {inlineFilters}
          </div>
          {stats && stats.length > 0 && (
            <div className="flex items-center gap-3">
              {stats.map((stat, idx) => (
                <div key={idx} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                  stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                  stat.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                  stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                  'bg-indigo-50 text-indigo-600'
                }`}>
                  {stat.label}: {stat.value}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}

interface PageContentV2Props {
  children: React.ReactNode;
  className?: string;
}

export function PageContentV2({ children, className = '' }: PageContentV2Props) {
  return (
    <div className={`flex-1 overflow-auto p-8 bg-slate-50 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}

interface PageLayoutV2Props {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
  actions?: React.ReactNode;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  inlineFilters?: React.ReactNode;
  filtersDrawer?: React.ReactNode;
  filtersDrawerOpen?: boolean;
  onFiltersDrawerClose?: () => void;
  filtersDrawerTitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  stats?: StatBadge[];
  children: React.ReactNode;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: HeaderAction[];
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (column: string | null, direction: 'asc' | 'desc') => void;
  comparisonMode?: boolean;
  comparisonIds?: string[];
  onComparisonToggle?: (id: string) => void;
  comparisonPanel?: React.ReactNode;
  onComparisonClose?: () => void;
}

export default function PageLayoutV2({
  title,
  subtitle,
  icon,
  color = 'indigo',
  actions,
  tabs,
  activeTab,
  onTabChange,
  inlineFilters,
  filtersDrawer,
  filtersDrawerOpen,
  onFiltersDrawerClose,
  filtersDrawerTitle,
  showBack,
  onBack,
  stats,
  children,
  selectable = false,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  bulkActions,
  sortColumn: controlledSortColumn,
  sortDirection: controlledSortDirection,
  onSortChange,
  comparisonMode = false,
  comparisonIds: controlledComparisonIds,
  onComparisonToggle,
  comparisonPanel,
  onComparisonClose,
}: PageLayoutV2Props) {
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const [internalSortColumn, setInternalSortColumn] = useState<string | null>(null);
  const [internalSortDirection, setInternalSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inlineEditColumn, setInlineEditColumn] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [internalComparisonIds, setInternalComparisonIds] = useState<string[]>([]);

  const selectedIds = controlledSelectedIds !== undefined ? new Set(controlledSelectedIds) : internalSelectedIds;
  const sortColumn = controlledSortColumn !== undefined ? controlledSortColumn : internalSortColumn;
  const sortDirection = controlledSortDirection !== undefined ? controlledSortDirection : internalSortDirection;
  const comparisonIds = controlledComparisonIds !== undefined ? controlledComparisonIds : internalComparisonIds;

  const toggleSelection = useCallback((id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSet));
    } else {
      setInternalSelectedIds(newSet);
    }
  }, [selectedIds, onSelectionChange]);

  const selectAll = useCallback((ids: string[]) => {
    if (onSelectionChange) {
      onSelectionChange(ids);
    } else {
      setInternalSelectedIds(new Set(ids));
    }
  }, [onSelectionChange]);

  const clearSelection = useCallback(() => {
    if (onSelectionChange) {
      onSelectionChange([]);
    } else {
      setInternalSelectedIds(new Set());
    }
  }, [onSelectionChange]);

  const isAllSelected = useCallback((ids: string[]) => {
    return ids.length > 0 && ids.every(id => selectedIds.has(id));
  }, [selectedIds]);

  const setSortColumn = useCallback((col: string | null) => {
    if (onSortChange) {
      onSortChange(col, sortDirection);
    } else {
      setInternalSortColumn(col);
    }
  }, [onSortChange, sortDirection]);

  const setSortDirection = useCallback((dir: 'asc' | 'desc') => {
    if (onSortChange) {
      onSortChange(sortColumn, dir);
    } else {
      setInternalSortDirection(dir);
    }
  }, [onSortChange, sortColumn]);

  const toggleComparison = useCallback((id: string) => {
    if (onComparisonToggle) {
      onComparisonToggle(id);
    } else {
      setInternalComparisonIds(prev => {
        if (prev.includes(id)) return prev.filter(i => i !== id);
        if (prev.length >= 2) return [prev[1], id];
        return [...prev, id];
      });
    }
  }, [onComparisonToggle]);

  const contextValue: PageV2ContextType = {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isAllSelected,
    isSelectable: selectable,
    setIsSelectable: () => {},
    sortColumn,
    sortDirection,
    setSortColumn,
    setSortDirection,
    inlineEditColumn,
    setInlineEditColumn,
    editingRowId,
    setEditingRowId,
    filtersOpen,
    setFiltersOpen,
    comparisonMode,
    setComparisonMode: () => {},
    comparisonIds,
    toggleComparison,
  };

  return (
    <PageV2Context.Provider value={contextValue}>
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        <PageHeaderV2
          title={title}
          subtitle={subtitle}
          icon={icon}
          color={color}
          actions={actions}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          inlineFilters={inlineFilters}
          showBack={showBack}
          onBack={onBack}
          stats={stats}
          selectedCount={selectedIds.size}
          bulkActions={bulkActions}
          onClearSelection={clearSelection}
        />
        <PageContentV2>
          {children}
        </PageContentV2>
        
        {filtersDrawer && filtersDrawerOpen !== undefined && (
          <FiltersDrawer
            isOpen={filtersDrawerOpen}
            onClose={onFiltersDrawerClose || (() => {})}
            title={filtersDrawerTitle || 'Filtros'}
          >
            {filtersDrawer}
          </FiltersDrawer>
        )}

        {comparisonPanel && comparisonMode && (
          comparisonIds.length === 2 ? comparisonPanel : null
        )}

        {selectedIds.size > 0 && bulkActions && (
          <BulkActionsBar
            selectedCount={selectedIds.size}
            onClear={clearSelection}
            actions={bulkActions}
          />
        )}
      </div>
    </PageV2Context.Provider>
  );
}

export { PageV2Context };
