import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, ArrowUpZA, ArrowDownAZ, Minus, Plus, CheckCircle2, Info, AlertCircle } from 'lucide-react';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const snapPrice = (value: number, cents: number): number => {
  const integerPart = Math.floor(value);
  return integerPart + (cents / 100);
};

// ─── Interfaces for Column Configuration ───────────────────────────
export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

// ─── Sortable Header Component ───────────────────────────────────
interface SortableHeaderProps {
  id: string;
  label: string;
  sortColumn: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: any) => void;
}

export function SortableHeader({ id, label, sortColumn, sortOrder, onSort }: SortableHeaderProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 'auto',
  };

  const getPadding = () => 'px-3';

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`${getPadding()} py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none text-center`}
      onClick={() => onSort(id)}
    >
      <div className="flex items-center justify-center gap-2">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"
        >
          <GripVertical className="w-3 h-3" />
        </span>
        <span>
          {label} {sortColumn === id && (sortOrder === 'asc' ? '↑' : '↓')}
        </span>
      </div>
    </th>
  );
}

// ─── Column Settings Modal Component ────────────────────────────
interface ColumnSettingsModalProps {
  columns: ColumnConfig[];
  onToggleVisibility: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onReset: () => void;
  onClose: () => void;
}

export function ColumnSettingsModal({ columns, onToggleVisibility, onMove, onReset, onClose }: ColumnSettingsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Configurar Colunas</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
          {columns.map((col, index) => (
            <div
              key={col.id}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => onToggleVisibility(col.id)}
                  className="w-4 h-4 rounded border-slate-300 text-[#202eac] focus:ring-[#202eac]"
                />
                <span className={`text-sm font-medium ${col.visible ? 'text-slate-700' : 'text-slate-400'}`}>
                  {col.label}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onMove(col.id, 'up')}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowUpZA className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onMove(col.id, 'down')}
                  disabled={index === columns.length - 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowDownAZ className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-center">
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-[#202eac] transition-colors"
          >
            Resetar para Padrão
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Metric Block Component ─────────────────────────────────────
export const MetricBlock = ({ label, value, colorClass }: { label: string; value: string; colorClass: string }) => (
  <div className={`flex-1 p-3 rounded-2xl text-center ${colorClass} transition-all border border-transparent hover:border-slate-200`}>
    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{label}</span>
    <span className="text-lg font-black text-slate-800">{value}</span>
  </div>
);

// ─── Donut Chart SVG ───────────────────────────────────────
export const DonutChart = ({ custoBase, fixedCosts, lucro }: { custoBase: number; fixedCosts: number; lucro: number }) => {
  const total = custoBase + fixedCosts + Math.max(0, lucro);
  if (total === 0) return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" strokeWidth="16" />
    </svg>
  );

  const pcts = [
    { val: custoBase / total, color: '#3b82f6' },
    { val: fixedCosts / total, color: '#a855f7' },
    { val: Math.max(0, lucro) / total, color: '#10b981' },
  ];
  let offset = 0;
  const circum = 2 * Math.PI * 48;

  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {pcts.map((p, i) => {
        const dash = p.val * circum;
        const gap = circum - dash;
        const o = offset;
        offset += dash;
        return (
          <circle
            key={i} cx="60" cy="60" r="48"
            fill="none" stroke={p.color} strokeWidth="16"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-o}
            transform="rotate(-90 60 60)"
            className="transition-all duration-500"
          />
        );
      })}
    </svg>
  );
};

// ─── Bar Chart ─────────────────────────────────────────────
export const BarChart = ({ margens }: { margens: { label: string; value: number; color: string; price?: number }[] }) => {
  const max = Math.max(...margens.map(m => Math.abs(m.value)), 1);
  return (
    <div className="flex items-end justify-center gap-4 h-36">
      {margens.map((m, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-slate-600">{m.value.toFixed(1)}%</span>
          <div
            className="w-12 rounded-t-lg transition-all duration-500"
            style={{
              height: `${Math.max(8, (Math.abs(m.value) / max) * 80)}px`,
              backgroundColor: m.color,
            }}
          />
          <span className="text-[10px] font-semibold text-slate-500">{m.label}</span>
          <span className="text-[11px] font-black text-slate-700 mt-0.5">
            {m.price ? fmt(m.price) : '---'}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Price Step Button ──────────────────────────────────────
export const PriceAdjuster = ({ value, onChange, cents, color }: {
  value: number; onChange: (v: number) => void; cents: number; color: string;
}) => (
  <div className="flex items-center gap-3">
    <button
      onClick={() => onChange(Math.max(0, snapPrice(value - 1, cents)))}
      className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all hover:scale-110 ${color === 'green' ? 'border-emerald-200 text-emerald-500 hover:bg-emerald-50' : color === 'orange' ? 'border-amber-200 text-amber-500 hover:bg-amber-50' : 'border-purple-200 text-purple-500 hover:bg-purple-50'}`}
    >
      <Minus className="w-4 h-4" />
    </button>
    <div className={`px-5 py-3 rounded-2xl font-black text-2xl min-w-[120px] text-center ${color === 'green' ? 'bg-emerald-50 text-emerald-600' : color === 'orange' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'}`}>
      {fmt(value)}
    </div>
    <button
      onClick={() => onChange(snapPrice(value + 1, cents))}
      className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all hover:scale-110 ${color === 'green' ? 'border-emerald-200 text-emerald-500 hover:bg-emerald-50' : color === 'orange' ? 'border-amber-200 text-amber-500 hover:bg-amber-50' : 'border-purple-200 text-purple-500 hover:bg-purple-50'}`}
    >
      <Plus className="w-4 h-4" />
    </button>
  </div>
);

// ─── Feedback Modal ─────────────────────────────────────────
export const FeedbackModal = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'success' 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  message: string; 
  type?: 'success' | 'info' | 'error' 
}) => {
  if (!isOpen) return null;

  const config = {
    success: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', btn: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' },
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', btn: 'bg-blue-500 hover:bg-blue-600 shadow-blue-200' },
    error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', btn: 'bg-red-500 hover:bg-red-600 shadow-red-200' }
  }[type];

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300 p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        <div className={`p-8 flex flex-col items-center text-center ${config.bg}`}>
          <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center mb-6 shadow-xl shadow-slate-200/50">
            <Icon className={`w-10 h-10 ${config.color}`} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            {message}
          </p>
        </div>
        <div className="p-6 bg-white flex justify-center">
          <button
            onClick={onClose}
            className={`w-full py-4 rounded-2xl text-white font-bold transition-all active:scale-95 shadow-lg ${config.btn}`}
          >
            Entendi, OK
          </button>
        </div>
      </div>
    </div>
  );
};
