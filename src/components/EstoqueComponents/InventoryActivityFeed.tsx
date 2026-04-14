import React from 'react';
import { History, Filter, ArrowDownLeft, ArrowUpRight, ClipboardList } from 'lucide-react';

interface FeedProps {
  title: string;
  logs: any[];
  isFinishedGoods?: boolean;
}

export default function InventoryActivityFeed({ title, logs, isFinishedGoods = false }: FeedProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-500" /> {title}
        </h2>
        <Filter className="w-4 h-4 text-slate-400 cursor-pointer" />
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm italic">Nenhuma movimentação registrada</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="group relative flex gap-4 p-4 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
              <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                log.type === 'in' || log.type === 'finished_good_in' ? 'bg-emerald-50 text-emerald-600' :
                log.type === 'out' || log.type === 'finished_good_out' ? 'bg-blue-50 text-blue-600' : 
                'bg-slate-100 text-slate-500'
              }`}>
                { (log.type === 'in' || log.type === 'finished_good_in') ? <ArrowDownLeft className="w-4 h-4" /> :
                  (log.type === 'out' || log.type === 'finished_good_out') ? <ArrowUpRight className="w-4 h-4" /> : 
                  <ClipboardList className="w-4 h-4" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-slate-800 text-sm truncate" title={isFinishedGoods ? log.finished_good?.name : log.ingredients?.nome}>
                    {isFinishedGoods ? log.finished_good?.name || 'Desconhecido' : log.ingredients?.nome}
                  </span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold mb-1">
                  <span className={(log.type === 'in' || log.type === 'finished_good_in') ? 'text-emerald-600' : 'text-blue-600'}>
                    { (log.type === 'in' || log.type === 'finished_good_in') ? '+' : '-' }{log.quantity} {isFinishedGoods ? 'un.' : log.ingredients?.unidade_medida}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-400 uppercase text-[9px]">
                    { (log.type === 'in' || log.type === 'finished_good_in') ? 'ENTRADA' : 
                      (log.type === 'out' || log.type === 'finished_good_out') ? (isFinishedGoods ? 'EXPEDIÇÃO' : 'PRODUÇÃO') : 
                      'AJUSTE'
                    }
                  </span>
                </div>
                {log.notes && <p className="text-[11px] text-slate-500 leading-relaxed italic">"{log.notes}"</p>}
              </div>
            </div>
          )
          )
        )}
      </div>
    </div>
  );
}
