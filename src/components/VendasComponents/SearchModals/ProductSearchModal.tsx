import React, { useState, useMemo } from 'react';
import { PackageOpen, X, Search, ChevronRight, Plus, Minus, ArrowRight } from 'lucide-react';
import { CatalogItem } from '../types';

interface ProductSearchModalProps {
  sellableCatalog: CatalogItem[];
  categories: any[];
  onAddBulk: (selections: Record<string, number>) => void;
  onClose: () => void;
  priceTable: string;
}

export function ProductSearchModal({ 
  sellableCatalog, 
  categories, 
  onAddBulk, 
  onClose,
  priceTable
}: ProductSearchModalProps) {
  const [filters, setFilters] = useState({
    term: '',
    categoryId: 'all',
    volume: 'all'
  });
  
  const [modalSelections, setModalSelections] = useState<Record<string, number>>({});

  const filteredProducts = useMemo(() => {
    return sellableCatalog.filter(p => {
      const termMatch = !filters.term || p.name.toLowerCase().includes(filters.term.toLowerCase());
      const catMatch = filters.categoryId === 'all' || p.group_id === filters.categoryId;
      const volMatch = filters.volume === 'all' || String(p.capacity) === filters.volume;
      
      return termMatch && catMatch && volMatch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [sellableCatalog, filters]);

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setModalSelections(prev => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };

  const totalSelectionsValue = useMemo(() => {
    return Object.keys(modalSelections).reduce((sum, id) => {
      const p = sellableCatalog.find(prod => prod.id === id);
      if (!p) return sum;
      const price = priceTable === 'atacado' ? (p.pricing?.atacadoPrice || 0) : 
                    priceTable === 'fardo' ? (p.pricing?.fardoPrice || 0) : 
                    (p.pricing?.varejoPrice || 0);
      return sum + (price * (modalSelections[id] || 0));
    }, 0);
  }, [modalSelections, sellableCatalog, priceTable]);

  const totalSelectedItems = Object.values(modalSelections).reduce((a,b) => a+b, 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] shadow-2xl max-w-6xl w-full h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#202eac] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <PackageOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Catálogo Comercial</h2>
              <p className="text-sm text-slate-500 font-medium">Produtos precificados disponíveis para venda</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-2xl transition-all hover:rotate-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 border-r border-slate-100 bg-slate-50/30 p-8 space-y-8 flex flex-col">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Categorias</label>
              <div className="space-y-1.5">
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, categoryId: 'all' }))}
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left flex justify-between items-center ${filters.categoryId === 'all' ? 'bg-[#202eac] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Todos
                  <ChevronRight className={`w-3 h-3 ${filters.categoryId === 'all' ? 'opacity-100' : 'opacity-0'}`} />
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setFilters(prev => ({ ...prev, categoryId: cat.id }))}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left flex justify-between items-center ${filters.categoryId === cat.id ? 'bg-[#202eac] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    {cat.name}
                    <ChevronRight className={`w-3 h-3 ${filters.categoryId === cat.id ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Volume / Embalagem</label>
              <div className="grid grid-cols-2 gap-2">
                {['all', '0.5', '1', '2', '5', '20'].map(vol => (
                  <button 
                    key={vol}
                    onClick={() => setFilters(prev => ({ ...prev, volume: vol }))}
                    className={`py-2.5 rounded-xl text-[10px] font-black transition-all ${filters.volume === vol ? 'bg-[#202eac] text-white ring-2 ring-blue-100' : 'bg-white border border-slate-200 text-slate-500 hover:border-[#202eac]'}`}
                  >
                    {vol === 'all' ? 'TODOS' : vol + 'L'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-10 custom-scrollbar bg-white">
            <div className="mb-10 relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="text" 
                placeholder="Pesquisar por nome do produto..."
                className="w-full h-16 bg-slate-50 border border-slate-100 rounded-[30px] pl-16 pr-8 outline-none focus:border-[#202eac] focus:bg-white transition-all text-lg font-bold text-slate-800 placeholder:text-slate-300 shadow-sm"
                value={filters.term}
                onChange={e => setFilters(prev => ({ ...prev, term: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <div 
                  key={product.id}
                  className={`group p-6 rounded-[35px] border transition-all flex flex-col gap-4 text-left relative overflow-hidden bg-white ${modalSelections[product.id] ? 'border-[#202eac] ring-1 ring-[#202eac]/10 shadow-xl' : 'border-slate-100 hover:border-[#202eac] hover:shadow-2xl hover:shadow-indigo-500/10'}`}
                >
                  <div className="absolute top-0 right-0 p-3 flex gap-2">
                     {modalSelections[product.id] ? (
                       <div className="bg-[#202eac] text-white px-3 py-1 rounded-full text-[10px] font-black animate-in zoom-in duration-300">
                         {modalSelections[product.id]} Selecionado(s)
                       </div>
                     ) : (
                       <button 
                         onClick={() => handleUpdateQuantity(product.id, 1)}
                         className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 hover:bg-[#202eac] hover:text-white transition-all active:scale-95"
                       >
                         <Plus className="w-5 h-5" />
                       </button>
                     )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-[#202eac] uppercase tracking-widest bg-blue-50 w-fit px-2 py-0.5 rounded-md">
                      {categories.find(c => c.id === product.group_id)?.name || 'Sem Categoria'}
                    </div>
                    <h4 className="text-base font-black text-slate-800 tracking-tight leading-tight group-hover:text-[#202eac] transition-colors">{product.name}</h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-black text-slate-600">
                      {product.capacity}L
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${product.stock_quantity > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {product.stock_quantity > 0 ? `Estoque: ${product.stock_quantity}` : 'Solicitar Produção'}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-end justify-between">
                     <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Preço Unid ({priceTable})</span>
                        <div className="text-xl font-black text-slate-800 tracking-tighter">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            priceTable === 'atacado' ? (product.pricing?.atacadoPrice || 0) : 
                            priceTable === 'fardo' ? (product.pricing?.fardoPrice || 0) : 
                            (product.pricing?.varejoPrice || 0)
                          )}
                        </div>
                     </div>
                     
                     {modalSelections[product.id] ? (
                       <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl animate-in slide-in-from-right-4 duration-300">
                         <button 
                           onClick={() => handleUpdateQuantity(product.id, -1)}
                           className="w-8 h-8 rounded-xl bg-white text-slate-400 hover:text-red-500 flex items-center justify-center transition-all active:scale-90"
                         >
                           <Minus className="w-4 h-4" />
                         </button>
                         <span className="w-8 text-center text-sm font-black text-slate-800">{modalSelections[product.id]}</span>
                         <button 
                           onClick={() => handleUpdateQuantity(product.id, 1)}
                           className="w-8 h-8 rounded-xl bg-white text-slate-400 hover:text-[#202eac] flex items-center justify-center transition-all active:scale-90"
                         >
                           <Plus className="w-4 h-4" />
                         </button>
                       </div>
                     ) : (
                       <button 
                         onClick={() => handleUpdateQuantity(product.id, 1)}
                         className="px-5 py-2.5 bg-[#202eac]/5 text-[#202eac] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#202eac] hover:text-white transition-all active:scale-95"
                       >
                         Escolher
                       </button>
                     )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {Object.keys(modalSelections).length > 0 && (
          <div className="px-10 py-6 border-t border-slate-100 bg-white shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.1)] flex items-center justify-between animate-in slide-in-from-bottom-10 duration-500">
             <div className="flex items-center gap-8">
                <div className="flex -space-x-3 overflow-hidden">
                  {Object.keys(modalSelections).slice(0, 5).map(id => {
                    const p = sellableCatalog.find(prod => prod.id === id);
                    return (
                      <div key={id} className="w-12 h-12 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-[10px] font-black text-[#202eac]">
                        {p?.capacity}L
                      </div>
                    );
                  })}
                  {Object.keys(modalSelections).length > 5 && (
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center text-[10px] font-black text-slate-400">
                      +{Object.keys(modalSelections).length - 5}
                    </div>
                  )}
                </div>
                
                <div className="h-10 w-px bg-slate-100" />

                <div className="flex flex-col">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Parcial ({totalSelectedItems} itens)</span>
                   <span className="text-2xl font-black text-[#202eac] tracking-tighter">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSelectionsValue)}
                   </span>
                </div>
             </div>

             <div className="flex items-center gap-4">
                <button 
                  onClick={() => setModalSelections({})}
                  className="px-6 py-4 text-slate-400 font-bold hover:text-red-500 transition-colors"
                >
                  Limpar Seleção
                </button>
                <button 
                  onClick={() => onAddBulk(modalSelections)}
                  className="px-10 py-4 bg-gradient-to-r from-[#202eac] to-[#4b5ce8] text-white font-black text-sm uppercase tracking-widest rounded-[20px] shadow-2xl shadow-indigo-500/40 hover:scale-105 transition-all flex items-center gap-3 active:scale-95"
                >
                   Adicionar ao Pedido <ArrowRight className="w-4 h-4" />
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
