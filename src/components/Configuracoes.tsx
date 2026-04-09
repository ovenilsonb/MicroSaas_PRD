import React, { useState, useRef } from 'react';
import { 
  Settings, Building2, ShieldCheck, Sliders, Image as ImageIcon, 
  Type, Save, Upload, Trash2, Globe, Phone, MapPin, 
  FileText, Palette
} from 'lucide-react';
import { useCompanySettings, CompanySettings } from '../hooks/useCompanySettings';
import SettingsBackup from './SettingsBackup';
import { useToast } from './dashboard/Toast';

const FONT_OPTIONS = [
  'Inter', 'Montserrat', 'Roboto', 'Playfair Display', 
  'Open Sans', 'Lato', 'Poppins', 'Outfit'
];

export default function Configuracoes() {
  const { settings, updateSettings } = useCompanySettings();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [localSettings, setLocalSettings] = useState<CompanySettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    updateSettings(localSettings);
    showToast('success', 'Configurações Salvas', 'As alterações foram aplicadas com sucesso.');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSettings({ ...localSettings, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLocalSettings({ ...localSettings, logo: null });
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 custom-scrollbar">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Settings className="w-7 h-7 text-[#202eac]" /> Configurações
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Personalize sua experiência Ohana Clean</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-[#202eac] text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#1a258a] transition-all shadow-md shadow-blue-500/20 active:scale-95"
        >
          <Save className="w-4 h-4" /> Salvar Alterações
        </button>
      </header>

      <div className="p-8 max-w-[1200px] mx-auto">
        {/* Navigation Tabs */}
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 mb-8 shadow-sm">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'profile' 
                ? 'bg-blue-50 text-[#202eac] shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4" /> Perfil da Empresa
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'security' 
                ? 'bg-blue-50 text-[#202eac] shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Segurança e Backup
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'preferences' 
                ? 'bg-blue-50 text-[#202eac] shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-4 h-4" /> Preferências do Sistema
          </button>
        </div>

        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Logo Section */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm overflow-hidden sticky top-32">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Logotipo da Marca</h3>
                  
                  <div className="flex flex-col items-center">
                    <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 group relative">
                      {localSettings.logo ? (
                        <>
                          <img src={localSettings.logo} alt="Logo" className="w-full h-full object-contain p-4" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-10 h-10 bg-white text-slate-700 rounded-full flex items-center justify-center hover:bg-blue-50"
                            >
                              <Upload className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={removeLogo}
                              className="w-10 h-10 bg-white text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-50"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-6">
                          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-400">Clique para enviar sua logo</p>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                          >
                            Selecionar Imagem
                          </button>
                        </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleLogoUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <p className="text-[10px] text-slate-400 mt-4 text-center leading-relaxed">
                      Recomendado: 500x500px (PNG ou JPG).<br/>Esta logo aparecerá em todos os seus relatórios.
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Form */}
              <div className="lg:col-span-2 space-y-6">
                <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Informações Corporativas
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 ml-1">Nome da Empresa (Razão Social)</label>
                      <div className="relative group">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#202eac]" />
                        <input 
                          type="text"
                          value={localSettings.name}
                          onChange={(e) => setLocalSettings({ ...localSettings, name: e.target.value })}
                          placeholder="Minha Empresa Química LTDA"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 ml-1">CNPJ / CPF</label>
                      <div className="relative group">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#202eac]" />
                        <input 
                          type="text"
                          value={localSettings.document}
                          onChange={(e) => setLocalSettings({ ...localSettings, document: e.target.value })}
                          placeholder="00.000.000/0001-00"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 ml-1">E-mail de Contato</label>
                      <div className="relative group">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#202eac]" />
                        <input 
                          type="email"
                          value={localSettings.email}
                          onChange={(e) => setLocalSettings({ ...localSettings, email: e.target.value })}
                          placeholder="contato@empresa.com.br"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 ml-1">Telefone / WhatsApp</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#202eac]" />
                        <input 
                          type="text"
                          value={localSettings.phone}
                          onChange={(e) => setLocalSettings({ ...localSettings, phone: e.target.value })}
                          placeholder="(11) 99999-9999"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 ml-1">Endereço Completo</label>
                      <div className="relative group">
                        <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-400 group-focus-within:text-[#202eac]" />
                        <textarea 
                          value={localSettings.address}
                          onChange={(e) => setLocalSettings({ ...localSettings, address: e.target.value })}
                          placeholder="Rua Exemplo, 123 - Bairro - Cidade / UF"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all text-sm font-medium h-24 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Type className="w-4 h-4" /> Tipografia e Identidade Visual
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-slate-500 ml-1 mb-3 block">Fonte dos Cabeçalhos (Documentos)</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {FONT_OPTIONS.map(font => (
                          <button
                            key={font}
                            onClick={() => setLocalSettings({ ...localSettings, headerFont: font })}
                            className={`p-4 rounded-2xl border-2 transition-all text-left ${
                              localSettings.headerFont === font 
                                ? 'border-[#202eac] bg-blue-50/50' 
                                : 'border-slate-100 bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <span style={{ fontFamily: font }} className="block text-base font-bold text-slate-800 mb-1">{font}</span>
                            <span className="block text-[10px] uppercase font-black text-slate-400 tracking-tighter">Ohana Clean</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 bg-[#202eac] rounded-2xl text-white relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                      <h4 className="text-xs font-black uppercase tracking-widest opacity-60 mb-4">Prévia do Cabeçalho</h4>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl p-2 flex items-center justify-center">
                          {localSettings.logo ? (
                            <img src={localSettings.logo} alt="Preview" className="w-full h-full object-contain" />
                          ) : (
                            <Palette className="w-6 h-6 text-[#202eac]" />
                          )}
                        </div>
                        <div>
                          <p style={{ fontFamily: localSettings.headerFont }} className="text-xl font-bold leading-none mb-1">
                            {localSettings.name || 'NOME DA SUA EMPRESA'}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                            Fórmula - Qualidade - Resultado
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8 max-w-4xl mx-auto">
              <SettingsBackup />
              
              <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">Zona de Perigo</h3>
                    <p className="text-sm text-slate-500 font-medium">Ações irreversíveis sobre seus dados locais.</p>
                  </div>
                </div>
                
                <div className="p-6 border border-rose-100 bg-rose-50/30 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800">Limpar Dados Locais</h4>
                    <p className="text-xs text-slate-500 mt-1">Isso apagará todas as fórmulas, insumos e configurações deste navegador.</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (window.confirm('ATENÇÃO: Isso apagará TODOS os dados salvos localmente (Insumos, Fórmulas, Vendas, Compras). Esta ação não pode ser desfeita. Deseja continuar?')) {
                        const keysToRemove = [
                          'local_ingredients', 'local_formulas', 'local_production_orders', 
                          'local_quality_controls', 'local_proportions', 'precificacao_entries',
                          'local_finished_goods', 'local_sale_orders', 'local_purchase_orders',
                          'local_company_settings'
                        ];
                        keysToRemove.forEach(k => localStorage.removeItem(k));
                        window.location.reload();
                      }
                    }}
                    className="px-5 py-2.5 bg-rose-500 text-white font-bold rounded-xl text-xs hover:bg-rose-600 transition-all shadow-md shadow-rose-500/20 active:scale-95"
                  >
                    Reiniciar Sistema
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Padrões do MicroSaaS</h3>
                
                <div className="space-y-8">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Palette className="w-5 h-5 text-[#202eac]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Moeda do Sistema</p>
                        <p className="text-xs text-slate-500 font-medium">Defina a moeda usada para cálculos e relatórios.</p>
                      </div>
                    </div>
                    <span className="px-4 py-2 bg-blue-100 text-[#202eac] font-black rounded-lg text-xs tracking-widest">REAL (BRL)</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl opacity-60">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Building2 className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Módulo Industrial Padrão</p>
                        <p className="text-xs text-slate-500 font-medium">Defina se sua produção é voltada para Volume ou Peças.</p>
                      </div>
                    </div>
                    <select disabled className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-lg text-xs border-none outline-none cursor-not-allowed">
                      <option>Volume Industrial (L/KG)</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
