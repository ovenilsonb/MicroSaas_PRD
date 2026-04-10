import React, { useState, useRef } from 'react';
import { 
  Settings, Building2, ShieldCheck, Sliders, Image as ImageIcon, 
  Type, Save, Upload, Trash2, Globe, Phone, MapPin, 
  FileText, Palette, Sun, Moon, Eye, Layout
} from 'lucide-react';
import { useCompanySettings, CompanySettings } from '../hooks/useCompanySettings';
import SettingsBackup from './SettingsBackup';
import SettingsLayout from './SettingsLayout';
import { useToast } from './dashboard/Toast';

const FONT_OPTIONS = [
  'Inter', 'Montserrat', 'Roboto', 'Playfair Display', 
  'Open Sans', 'Lato', 'Poppins', 'Outfit'
];

export default function Configuracoes() {
  const { settings, updateSettings } = useCompanySettings();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'layout'>('profile');
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
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-[#0b0f1a] custom-scrollbar transition-colors duration-300">
      <header className="bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 px-8 py-6 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <Settings className="w-7 h-7 text-[#202eac] dark:text-blue-400" /> Configurações
          </h1>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">Personalize sua experiência Ohana Clean</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-[#202eac] dark:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#1a258a] dark:hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
        >
          <Save className="w-4 h-4" /> Salvar Alterações
        </button>
      </header>

      <div className="p-8 max-w-[1200px] mx-auto">
        {/* Navigation Tabs */}
        <div className="flex bg-white dark:bg-[#111827] p-1 rounded-2xl border border-slate-200 dark:border-slate-800 mb-8 shadow-sm">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'profile' 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-[#202eac] dark:text-blue-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-4 h-4" /> Perfil & Identidade
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'security' 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-[#202eac] dark:text-blue-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Segurança & Backup
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'preferences' 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-[#202eac] dark:text-blue-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-4 h-4" /> Preferências
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'layout' 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-[#202eac] dark:text-blue-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Layout className="w-4 h-4" /> Organização
          </button>
        </div>

        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Logo Section */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm overflow-hidden sticky top-32">
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Logotipo da Marca</h3>
                  
                  <div className="flex flex-col items-center">
                    <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 group relative">
                      {localSettings.logo ? (
                        <>
                          <img src={localSettings.logo} alt="Logo" className="w-full h-full object-contain p-4 transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-10 h-10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full flex items-center justify-center hover:bg-blue-50 dark:hover:bg-slate-700"
                            >
                              <Upload className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={removeLogo}
                              className="w-10 h-10 bg-white dark:bg-slate-800 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-6">
                          <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-400 dark:text-slate-600">Clique para enviar sua logo</p>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
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
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 text-center leading-relaxed font-medium">
                      Recomendado: 500x500px (PNG ou JPG).<br/>Esta logo aparecerá em todos os seus relatórios.
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Form */}
              <div className="lg:col-span-2 space-y-6">
                <section className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                  <header className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Informações Corporativas
                    </h3>
                  </header>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Nome da Empresa (Razão Social)</label>
                      <div className="relative group">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#202eac] dark:group-focus-within:text-blue-400" />
                        <input 
                          type="text"
                          value={localSettings.name}
                          onChange={(e) => setLocalSettings({ ...localSettings, name: e.target.value })}
                          placeholder="Minha Empresa Química LTDA"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 dark:focus:ring-blue-500/10 focus:border-[#202eac] dark:focus:border-blue-500 transition-all text-sm font-medium dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Sub-texto do Sistema (Tagline)</label>
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${
                          (localSettings.subText || '').length > 30 ? 'text-amber-500 animate-pulse' : 'text-slate-400'
                        }`}>
                          {(localSettings.subText || '').length}/30
                        </span>
                      </div>
                      <div className="relative group">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#202eac] dark:group-focus-within:text-blue-400" />
                        <input 
                          type="text"
                          value={localSettings.subText}
                          onChange={(e) => setLocalSettings({ ...localSettings, subText: e.target.value })}
                          placeholder="Ex: Industrial Planner"
                          className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border rounded-xl focus:ring-2 transition-all text-sm font-medium dark:text-slate-200 ${
                            (localSettings.subText || '').length > 30 
                              ? 'border-amber-400 focus:ring-amber-500/10 focus:border-amber-500' 
                              : 'border-slate-200 dark:border-slate-800 focus:ring-[#202eac]/20 dark:focus:ring-blue-500/10 focus:border-[#202eac] dark:focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">CNPJ / CPF</label>
                      <div className="relative group">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#202eac] dark:group-focus-within:text-blue-400" />
                        <input 
                          type="text"
                          value={localSettings.document}
                          onChange={(e) => setLocalSettings({ ...localSettings, document: e.target.value })}
                          placeholder="00.000.000/0001-00"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 dark:focus:ring-blue-500/10 focus:border-[#202eac] dark:focus:border-blue-500 transition-all text-sm font-medium dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">E-mail de Contato</label>
                      <div className="relative group">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#202eac] dark:group-focus-within:text-blue-400" />
                        <input 
                          type="email"
                          value={localSettings.email}
                          onChange={(e) => setLocalSettings({ ...localSettings, email: e.target.value })}
                          placeholder="contato@empresa.com.br"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 dark:focus:ring-blue-500/10 focus:border-[#202eac] dark:focus:border-blue-500 transition-all text-sm font-medium dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Telefone / WhatsApp</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#202eac] dark:group-focus-within:text-blue-400" />
                        <input 
                          type="text"
                          value={localSettings.phone}
                          onChange={(e) => setLocalSettings({ ...localSettings, phone: e.target.value })}
                          placeholder="(11) 99999-9999"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 dark:focus:ring-blue-500/10 focus:border-[#202eac] dark:focus:border-blue-500 transition-all text-sm font-medium dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Endereço Completo</label>
                      <div className="relative group">
                        <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-400 group-focus-within:text-[#202eac] dark:group-focus-within:text-blue-400" />
                        <textarea 
                          value={localSettings.address}
                          onChange={(e) => setLocalSettings({ ...localSettings, address: e.target.value })}
                          placeholder="Rua Exemplo, 123 - Bairro - Cidade / UF"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 dark:focus:ring-blue-500/10 focus:border-[#202eac] dark:focus:border-blue-500 transition-all text-sm font-medium h-24 resize-none dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                  <header className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Palette className="w-4 h-4" /> Branding & Estilo Global
                    </h3>
                  </header>
                  
                  <div className="space-y-8">
                    {/* Seletor Livre de Cor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-2">
                          Cor Primária da Marca
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] text-slate-400">Personalizado</span>
                        </label>
                        <div className="flex items-center gap-4">
                          <div className="relative shrink-0">
                            <input 
                              type="color"
                              value={localSettings.primaryColor}
                              onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                              className="w-16 h-16 rounded-2xl border-none cursor-pointer p-0 bg-transparent overflow-hidden shadow-lg shadow-black/10"
                            />
                            <div className="absolute inset-0 rounded-2xl border-4 border-white/20 pointer-events-none"></div>
                          </div>
                          <div className="flex-1">
                            <input 
                              type="text"
                              value={localSettings.primaryColor.toUpperCase()}
                              onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-sm dark:text-slate-200"
                            />
                            <p className="text-[10px] text-slate-400 mt-2 font-medium">Esta cor define botões, destaques e cabeçalhos de relatórios.</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Tipografia dos Documentos</label>
                        <div className="grid grid-cols-2 gap-2">
                          {FONT_OPTIONS.slice(0, 4).map(font => (
                            <button
                              key={font}
                              onClick={() => setLocalSettings({ ...localSettings, headerFont: font })}
                              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                                localSettings.headerFont === font 
                                  ? 'border-blue-500 bg-blue-500 text-white shadow-md' 
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {font}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">Selecione uma fonte técnica para valorizar seus PDFs.</p>
                      </div>
                    </div>

                    <div className="p-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest mb-6">Prévia em Tempo Real</h4>
                      <div className="flex items-center gap-6">
                        <div 
                          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all duration-300"
                          style={{ backgroundColor: localSettings.primaryColor }}
                        >
                          {localSettings.logo ? (
                            <img src={localSettings.logo} alt="Preview" className="w-10 h-10 object-contain brightness-0 invert opacity-90" />
                          ) : (
                            <Palette className="w-8 h-8" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p 
                            style={{ fontFamily: localSettings.headerFont, color: localSettings.primaryColor }} 
                            className="text-2xl font-black leading-none mb-2 transition-all duration-300"
                          >
                            {localSettings.name || 'OHANA CLEAN'}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-1 rounded-full opacity-40 shrink-0" style={{ backgroundColor: localSettings.primaryColor }}></span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Documento Técnico Industrial</p>
                          </div>
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
              
              <section className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 rounded-2xl flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Zona de Perigo</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Ações irreversíveis sobre seus dados locais.</p>
                  </div>
                </div>
                
                <div className="p-6 border border-rose-100 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-900/10 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Limpar Dados Locais</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Isso apagará todas as fórmulas, insumos e configurações deste navegador.</p>
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
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Seção de interface */}
              <section className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <header className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Interface & Experiência</h3>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Ajustes visuais e de comportamento</p>
                  </div>
                </header>
                
                <div className="space-y-6">
                  {/* Toggle Modo Escuro */}
                  <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm">
                        {localSettings.isDarkMode ? <Moon className="w-6 h-6 text-indigo-400" /> : <Sun className="w-6 h-6 text-amber-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Modo de Visualização</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Alterne entre o tema Claro e Escuro para todo o sistema.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setLocalSettings(prev => ({ ...prev, isDarkMode: !prev.isDarkMode }))}
                      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-300 focus:outline-none ${
                        localSettings.isDarkMode ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow-lg ${
                          localSettings.isDarkMode ? 'translate-x-9' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Configurações de Marca d'Água */}
                  <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm">
                        <Eye className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Marca d'Água de Relatórios</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Texto que aparece inclinado no fundo dos seus documentos gerados.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Texto da Marca</label>
                        <input 
                          type="text"
                          value={localSettings.watermarkText}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, watermarkText: e.target.value.toUpperCase() }))}
                          placeholder="EX: OHANA CLEAN"
                          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opacidade ({Math.round(localSettings.watermarkOpacity * 100)}%)</label>
                        <input 
                          type="range"
                          min="0"
                          max="0.2"
                          step="0.01"
                          value={localSettings.watermarkOpacity}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, watermarkOpacity: parseFloat(e.target.value) }))}
                          className="w-full mt-4 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Seção de Padronização Industrial */}
              <section className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-8">Padrões do MicroSaaS</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl opacity-60">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
                        <Sun className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-300">Moeda do Sistema</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">Configurado como REAL (BRL) Padrão.</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black rounded-lg text-[10px] tracking-widest">FIXO</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl opacity-60">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
                        <Building2 className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-300">Unidade de Medida</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">Protocolo Industrial (Volume L/KG).</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black rounded-lg text-[10px] tracking-widest">FIXO</span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'layout' && (
            <SettingsLayout 
              settings={localSettings} 
              onUpdate={(newLayout) => setLocalSettings({ ...localSettings, sidebarLayout: newLayout })} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
