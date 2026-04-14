import React from 'react';
import { Package, Search, Box, Pencil, Archive } from 'lucide-react';
import { FinishedGood } from './types';

interface GalleryProps {
  finishedGoods: FinishedGood[];
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onAdjust: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function FinishedGoodsGallery({
  finishedGoods,
  searchTerm,
  onSearchChange,
  onAdjust,
  onDelete
}: GalleryProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Box className="w-5 h-5 text-[#202eac]" /> Catálogo em Estoque
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar produto acabado..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#202eac]/10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {finishedGoods.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <Package className="w-12 h-12 mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">Nenhum produto acabado</h3>
            <p className="text-sm">Finalize uma ordem de fabricação para dar entrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {finishedGoods.map(fg => (
              <div key={fg.id} className="relative group p-4 border border-slate-200 rounded-xl hover:shadow-md transition-all bg-white hover:border-[#202eac]/30">
                <div className="flex items-start justify-between mb-3">
                  <div className="pr-4">
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{fg.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-slate-400">ID: {fg.id.substring(0,8)}</p>
                      {fg.capacity && (
                        <span className="text-[10px] font-black text-[#202eac] bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                          {fg.capacity}L
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => onAdjust(fg.id)}
                      className="p-1.5 text-slate-400 hover:text-[#202eac] hover:bg-slate-50 rounded-lg shadow-sm border border-transparent hover:border-slate-100"
                      title="Ajuste Manual"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => onDelete(fg.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg shadow-sm border border-transparent hover:border-red-100"
                      title="Excluir Registro"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 w-full mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Livre (Disp.)</span>
                    <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <Box className="w-4 h-4" />
                      <span className="font-black text-lg">{fg.stock_quantity?.toLocaleString() || 0}</span>
                      <span className="text-[10px] font-bold uppercase">un.</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reservado (Vendas)</span>
                    <div className={`text-right ${fg.reserved_quantity ? 'text-blue-600' : 'text-slate-300'} font-black`}>
                      {fg.reserved_quantity || 0} <span className="text-[8px] uppercase">un.</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Total Físico</span>
                    <div className="text-right text-[#202eac] font-black">
                      {(fg.stock_quantity || 0) + (fg.reserved_quantity || 0)} <span className="text-[8px] uppercase">un.</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
