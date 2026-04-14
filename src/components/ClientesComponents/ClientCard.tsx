import React from 'react';
import { Users, Phone, MapPin, Edit2, Trash2 } from 'lucide-react';
import { Client } from './types';

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (id: string, name: string) => void;
}

export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  return (
    <div 
      onClick={() => onEdit(client)}
      className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col group cursor-pointer hover:border-[#202eac]/30"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-[#202eac]" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 line-clamp-1" title={client.name}>{client.name}</h3>
            {client.cnpj_cpf && <p className="text-xs text-slate-500 font-mono">{client.cnpj_cpf}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(client); }}
            className="p-1.5 text-slate-400 hover:text-[#202eac] hover:bg-blue-50 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(client.id, client.name); }}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 mt-auto">
        {client.phone && (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{client.phone}</span>
          </div>
        )}
        {(client.neighborhood || client.city) && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{client.neighborhood}{client.neighborhood && client.city ? ', ' : ''}{client.city}</span>
          </div>
        )}
        
        <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
           <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border 
             ${client.tabela_preco === 'Atacado' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
               client.tabela_preco === 'Fardo' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
               'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
             PREÇO: {client.tabela_preco || 'VAREJO'}
           </span>
           {client.tags && client.tags.map(t => (
             <span key={t} className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-full border border-slate-200">
               {t}
             </span>
           ))}
        </div>
      </div>
    </div>
  );
}
