import React from 'react';
import { Users, Edit2, Trash2 } from 'lucide-react';
import { Client } from './types';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string, name: string) => void;
}

export function ClientTable({ clients, onEdit, onDelete }: ClientTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
              <th className="py-4 px-6">Cliente</th>
              <th className="py-4 px-6">Documento</th>
              <th className="py-4 px-6">Perfil Comercial</th>
              <th className="py-4 px-6">Contato</th>
              <th className="py-4 px-6">Região / Bairro</th>
              <th className="py-4 px-6">Logística (Rua / Nº)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map(client => (
              <tr 
                key={client.id} 
                onClick={() => onEdit(client)}
                className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-[#202eac]" />
                    </div>
                    <span className="font-bold text-slate-800">{client.name}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-slate-600 font-mono">{client.cnpj_cpf || '-'}</span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-800 font-medium">{client.tabela_preco || 'Varejo'}</span>
                    {client.tags && client.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{client.tags[0]}</span>
                        {client.tags.length > 1 && <span className="text-[10px] text-slate-400">+{client.tags.length - 1}</span>}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-800 font-bold flex items-center gap-1.5">
                      {client.whatsapp || client.phone || '-'}
                      {(client.whatsapp) && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Tem Whatsapp"></span>}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate max-w-[150px]">{client.email || '-'}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col">
                    <span className="text-slate-800 font-bold uppercase text-xs">{client.neighborhood || '-'}</span>
                    <span className="text-[11px] text-slate-500">{client.city || '-'}</span>
                  </div>
                </td>
                <td className="py-4 px-6 relative">
                  <div className="flex flex-col">
                    <span className="text-slate-800 text-xs font-medium line-clamp-1" title={client.address || ''}>
                      {client.address || '-'}
                    </span>
                    <span className="text-[11px] text-slate-500">Nº {client.number || 'S/N'}</span>
                  </div>
                  
                  {/* Botões de Ação Suspensos */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50/80 backdrop-blur-sm p-1 rounded-lg border border-blue-100 shadow-sm">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                      className="p-1 px-1.5 text-[#202eac] hover:bg-white rounded transition-colors flex items-center gap-1 text-[10px] font-bold"
                    >
                      <Edit2 className="w-3 h-3" />
                      EDITAR
                    </button>
                    <div className="w-[1px] h-3 bg-blue-200"></div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDelete(client.id, client.name); }}
                      className="p-1 px-1.5 text-red-600 hover:bg-white rounded transition-colors flex items-center gap-1 text-[10px] font-bold"
                    >
                      <Trash2 className="w-3 h-3" />
                      EXCLUIR
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
