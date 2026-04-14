import React from 'react';

interface InsumoTechnicalTabProps {
  formData: any;
  setFormData: (data: any) => void;
}

export default function InsumoTechnicalTab({ formData, setFormData }: InsumoTechnicalTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Peso Específico</label>
          <input type="text" value={formData.peso_especifico}
            onChange={e => setFormData({ ...formData, peso_especifico: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
            placeholder="Ex: 0.8 g/cm³" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">pH</label>
          <input type="text" value={formData.ph}
            onChange={e => setFormData({ ...formData, ph: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
            placeholder="Ex: 7.0" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Temperatura</label>
          <input type="text" value={formData.temperatura}
            onChange={e => setFormData({ ...formData, temperatura: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
            placeholder="Ex: 20°C" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Viscosidade</label>
          <input type="text" value={formData.viscosidade}
            onChange={e => setFormData({ ...formData, viscosidade: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
            placeholder="Ex: 2.5 cP" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Solubilidade</label>
        <input type="text" value={formData.solubilidade}
          onChange={e => setFormData({ ...formData, solubilidade: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
          placeholder="Ex: Totalmente solúvel em água" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Risco</label>
        <input type="text" value={formData.risco}
          onChange={e => setFormData({ ...formData, risco: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
          placeholder="Ex: R36/37/38 - Irritante" />
      </div>
    </div>
  );
}
