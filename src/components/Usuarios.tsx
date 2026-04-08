import React from 'react';
import { Users, AlertCircle } from 'lucide-react';

export default function Usuarios() {
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#202eac]/10 p-2 rounded-lg">
              <Users className="w-6 h-6 text-[#202eac]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Usuários e Permissões</h1>
              <p className="text-sm text-slate-500">
                Módulo em desenvolvimento.
              </p>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Estrutura Pronta</h2>
          <p className="text-slate-500 text-sm mb-6">
            O módulo de Controle de Acesso e Usuários será implementado aqui. A navegação já está ativa para não haver quebras no futuro.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
            <AlertCircle className="w-4 h-4" /> Em breve
          </div>
        </div>
      </main>
    </div>
  );
}
