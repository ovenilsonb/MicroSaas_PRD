import React, { useState, useMemo } from 'react';
import { Users, X, Search, Clock } from 'lucide-react';

interface ClientSearchModalProps {
  clients: any[];
  onSelect: (client: any) => void;
  onClose: () => void;
  lastPurchaseMap: Record<string, string>;
}

export function ClientSearchModal({ clients, onSelect, onClose, lastPurchaseMap }: ClientSearchModalProps) {
  const [filters, setFilters] = useState({
    term: '',
    bairro: '',
    cidade: '',
    estado: ''
  });

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const termMatch = !filters.term || 
        c.name.toLowerCase().includes(filters.term.toLowerCase()) ||
        (c.cnpj_cpf && c.cnpj_cpf.includes(filters.term));
      
      const bairroMatch = !filters.bairro || (c.neighborhood && c.neighborhood.toLowerCase().includes(filters.bairro.toLowerCase()));
      const cidadeMatch = !filters.cidade || (c.city && c.city.toLowerCase().includes(filters.cidade.toLowerCase()));
      const estadoMatch = !filters.estado || (c.state && c.state.toUpperCase() === filters.estado.toUpperCase());
      
      return termMatch && bairroMatch && cidadeMatch && estadoMatch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, filters]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] shadow-2xl max-w-5xl w-full h-[85vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#202eac] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Selecionar Cliente</h2>
              <p className="text-sm text-slate-500 font-medium">Busca avançada por nome, documento e localização</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-2xl transition-all hover:rotate-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 bg-white border-b border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Nome ou CPF/CNPJ..."
              className="w-full h-12 bg-slate-50 rounded-2xl pl-12 pr-4 border border-transparent focus:border-[#202eac] focus:bg-white outline-none transition-all text-sm font-semibold"
              value={filters.term}
              onChange={e => setFilters(prev => ({ ...prev, term: e.target.value }))}
            />
          </div>
          <input 
            type="text" 
            placeholder="Bairro..."
            className="h-12 bg-slate-50 rounded-2xl px-4 border border-transparent focus:border-[#202eac] focus:bg-white outline-none transition-all text-sm font-semibold"
            value={filters.bairro}
            onChange={e => setFilters(prev => ({ ...prev, bairro: e.target.value }))}
          />
          <input 
            type="text" 
            placeholder="Cidade..."
            className="h-12 bg-slate-50 rounded-2xl px-4 border border-transparent focus:border-[#202eac] focus:bg-white outline-none transition-all text-sm font-semibold"
            value={filters.cidade}
            onChange={e => setFilters(prev => ({ ...prev, cidade: e.target.value }))}
          />
          <select 
            className="h-12 bg-slate-50 rounded-2xl px-4 border border-transparent focus:border-[#202eac] focus:bg-white outline-none transition-all text-sm font-semibold"
            value={filters.estado}
            onChange={e => setFilters(prev => ({ ...prev, estado: e.target.value }))}
          >
            <option value="">UF (Todos)</option>
            {Array.from(new Set(clients.map(c => c.state).filter(Boolean))).map(uf => (
              <option key={uf as string} value={uf as string}>{uf as string}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10 border-b border-slate-100">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-5 px-10">Cliente</th>
                <th className="py-5 px-6">Documento</th>
                <th className="py-5 px-6">Localização</th>
                <th className="py-5 px-6">Última Compra</th>
                <th className="py-5 px-10 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-blue-50/50 transition-all group">
                  <td className="py-5 px-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-[#202eac] font-black text-xs uppercase group-hover:bg-white transition-colors">
                        {(client.nome || client.name || '').substring(0,2)}
                      </div>
                      <div className="font-bold text-slate-700 tracking-tight">{client.nome || client.name}</div>
                    </div>
                  </td>
                  <td className="py-5 px-6 text-xs font-bold text-slate-500 font-mono tracking-tighter">
                    {client.cnpj_cpf || client.document || '---'}
                  </td>
                  <td className="py-5 px-6">
                    <div className="text-[11px] font-bold text-slate-600 leading-tight">
                      {client.neighborhood || 'Bairro ñ inf.'}<br/>
                      <span className="text-[10px] text-slate-400 font-medium uppercase">{client.city || 'Cidade'} / {client.state || 'UF'}</span>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    {lastPurchaseMap[client.id] ? (
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(lastPurchaseMap[client.id]).toLocaleDateString('pt-BR')}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest italic">Primeira Venda</span>
                    )}
                  </td>
                  <td className="py-5 px-10 text-right">
                    <button 
                      onClick={() => onSelect(client)}
                      className="px-6 py-2.5 bg-white border border-slate-200 text-[#202eac] text-[10px] font-black uppercase tracking-[0.15em] rounded-xl hover:bg-[#202eac] hover:text-white hover:border-[#202eac] transition-all shadow-sm active:scale-95"
                    >
                      Selecionar
                    </button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <Users className="w-12 h-12 opacity-20" />
                      <p className="text-sm font-bold uppercase tracking-widest">Nenhum cliente encontrado</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
