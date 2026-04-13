import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Plus, Edit2, Trash2, X, Save, Mail, Phone, MapPin, Building2, LayoutGrid, List, Download, Upload, AlertCircle, CheckCircle2, Info, BadgeDollarSign, Tag, TrendingUp, Presentation } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStorageMode } from '../contexts/StorageModeContext';
import { exportToJson, importFromJson, getBackupFilename } from '../lib/backupUtils';
import { generateId } from '../lib/id';
import { useToast } from './dashboard/Toast';
import { ConfirmModal, ConfirmModalType } from './shared/ConfirmModal';

interface Client {
  id: string;
  name: string;
  cnpj_cpf: string | null;
  document_type: 'CPF' | 'CNPJ';
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  tabela_preco: 'Varejo' | 'Atacado' | 'Fardo' | string;
  tags: string[];
  created_at: string;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function Clientes() {
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const { mode } = useStorageMode();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; detail?: string;
    type: ConfirmModalType; confirmLabel?: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {} });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'comercial' | 'historico'>('geral');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    cnpj_cpf: '',
    document_type: 'CPF',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    notes: '',
    tabela_preco: 'Varejo',
    tags: []
  });

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      setIsLoading(true);
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('name');

        if (error) {
          if (error.code === '42P01') {
            setClients([]);
            return;
          }
          throw error;
        }
        setClients(data || []);
      } else {
        const local = localStorage.getItem('local_clients');
        setClients(local ? JSON.parse(local) : []);
      }
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      showToast('error', 'Erro', 'Falha ao carregar clientes.');
    } finally {
      setIsLoading(false);
    }
  }

  const filteredClients = useMemo(() => {
    return clients.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.cnpj_cpf && c.cnpj_cpf.includes(searchTerm)) ||
      (c.neighborhood && c.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [clients, searchTerm]);

  // Dashboard Stats
  const stats = useMemo(() => {
    const totalClients = clients.length;
    let totalInvestedPlaceholder = 0; // Futuro: somar compras concluídas 

    const priceTiers: Record<string, number> = {};
    const neighborhoods: Record<string, number> = {};

    clients.forEach(c => {
      // Tabela de Preço Predominante
      const tier = c.tabela_preco || 'Varejo';
      priceTiers[tier] = (priceTiers[tier] || 0) + 1;

      // Top Bairro
      if (c.neighborhood) {
         const bairroRaw = c.neighborhood.trim().toLowerCase();
         // title case for display
         const bairroDisplay = bairroRaw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
         neighborhoods[bairroDisplay] = (neighborhoods[bairroDisplay] || 0) + 1;
      }
    });

    const topPricing = Object.entries(priceTiers).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Varejo';
    const topNeighborhood = Object.entries(neighborhoods).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalClients,
      topPricing,
      topNeighborhood,
      totalInvestedPlaceholder
    };
  }, [clients]);

  const handleOpenModal = (client?: Client) => {
    setActiveTab('geral');
    if (client) {
      setEditingId(client.id);
      setFormData({
        ...client,
        document_type: client.document_type || (client.cnpj_cpf?.length && client.cnpj_cpf.length > 14 ? 'CNPJ' : 'CPF'),
        tabela_preco: client.tabela_preco || 'Varejo',
        tags: client.tags || []
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        cnpj_cpf: '',
        document_type: 'CPF',
        email: '',
        phone: '',
        whatsapp: '',
        address: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        notes: '',
        tabela_preco: 'Varejo',
        tags: []
      });
    }
    setTagInput('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      showToast('error', 'Erro', 'O nome do cliente é obrigatório.');
      return;
    }

    try {
      if (mode === 'supabase') {
        if (editingId) {
          const { error } = await supabase
            .from('clients')
            .update(formData)
            .eq('id', editingId);

          if (error) throw error;
          showToast('success', 'Sucesso', 'Cliente atualizado com sucesso.');
        } else {
          const { error } = await supabase
            .from('clients')
            .insert([formData]);

          if (error) throw error;
          showToast('success', 'Sucesso', 'Cliente cadastrado com sucesso.');
        }
      } else {
        const localData = JSON.parse(localStorage.getItem('local_clients') || '[]');
        if (editingId) {
          const index = localData.findIndex((c: any) => c.id === editingId);
          if (index >= 0) {
            localData[index] = { ...formData, id: editingId, updated_at: new Date().toISOString() };
            localStorage.setItem('local_clients', JSON.stringify(localData));
            showToast('success', 'Sucesso', 'Cliente atualizado localmente.');
          }
        } else {
          const newClient = {
            ...formData,
            id: generateId(),
            created_at: new Date().toISOString()
          };
          localData.push(newClient);
          localStorage.setItem('local_clients', JSON.stringify(localData));
          showToast('success', 'Sucesso', 'Cliente cadastrado localmente.');
        }
      }

      handleCloseModal();
      fetchClients();
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err);
      showToast('error', 'Erro ao Salvar', 'Não foi possível salvar os dados do cliente.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Cliente',
      message: `Tem certeza que deseja excluir o cliente ${name}?`,
      type: 'danger',
      confirmLabel: 'Sim, Excluir',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          if (mode === 'supabase') {
            const { error } = await supabase.from('clients').delete().eq('id', id);
            if (error) throw error;
            showToast('success', 'Sucesso', 'Cliente excluído com sucesso.');
          } else {
            const localData = JSON.parse(localStorage.getItem('local_clients') || '[]');
            const newData = localData.filter((c: any) => c.id !== id);
            localStorage.setItem('local_clients', JSON.stringify(newData));
            showToast('success', 'Sucesso', 'Cliente excluído localmente.');
          }
          fetchClients();
        } catch (err) {
          console.error('Erro ao excluir cliente:', err);
          showToast('error', 'Erro ao Excluir', 'Não foi possível excluir o cliente.');
        }
      },
    });
  };

  const handleExport = () => {
    try {
      const filename = getBackupFilename('Clientes');
      exportToJson(filename, clients);
      showToast('success', 'Exportação Concluída', `O backup "${filename}" foi gerado com sucesso.`);
    } catch (err) {
      showToast('error', 'Erro na Exportação', 'Não foi possível gerar o arquivo de backup.');
    }
  };

  const formatCpfCnpj = (value: string, type: 'CPF' | 'CNPJ' = 'CPF') => {
    const numeric = value.replace(/\D/g, '');
    if (type === 'CPF') {
      if (numeric.length <= 3) return numeric;
      if (numeric.length <= 6) return `${numeric.slice(0, 3)}.${numeric.slice(3)}`;
      if (numeric.length <= 9) return `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6)}`;
      return `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-${numeric.slice(9, 11)}`;
    } else {
      if (numeric.length <= 2) return numeric;
      if (numeric.length <= 5) return `${numeric.slice(0, 2)}.${numeric.slice(2)}`;
      if (numeric.length <= 8) return `${numeric.slice(0, 2)}.${numeric.slice(2, 5)}.${numeric.slice(5)}`;
      if (numeric.length <= 12) return `${numeric.slice(0, 2)}.${numeric.slice(2, 5)}.${numeric.slice(5, 8)}/${numeric.slice(8)}`;
      return `${numeric.slice(0, 2)}.${numeric.slice(2, 5)}.${numeric.slice(5, 8)}/${numeric.slice(8, 12)}-${numeric.slice(12, 14)}`;
    }
  };

  const formatPhoneNumber = (value: string) => {
    if (!value) return '';
    const numeric = value.replace(/\D/g, '');
    if (numeric.length <= 2) return `(${numeric}`;
    if (numeric.length <= 6) return `(${numeric.slice(0, 2)}) ${numeric.slice(2)}`;
    if (numeric.length <= 10) return `(${numeric.slice(0, 2)}) ${numeric.slice(2, 6)}-${numeric.slice(6)}`;
    return `(${numeric.slice(0, 2)}) ${numeric.slice(2, 7)}-${numeric.slice(7, 11)}`;
  };
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromJson(file);
      if (!Array.isArray(data)) {
        throw new Error('Formato de dados inválido.');
      }

      if (mode === 'supabase') {
        showToast('info', 'Importando...', 'Sincronizando dados com o Supabase...');
        for (const item of data) {
          const { error } = await supabase.from('clients').upsert(item);
          if (error) console.error(`Erro ao importar ${item.name}:`, error);
        }
        await fetchClients();
      } else {
        const localData = JSON.parse(localStorage.getItem('local_clients') || '[]');
        const newData = [...localData];

        data.forEach((item: any) => {
          const index = newData.findIndex(i => i.id === item.id);
          if (index >= 0) {
            newData[index] = item;
          } else {
            newData.push(item);
          }
        });

        localStorage.setItem('local_clients', JSON.stringify(newData));
        setClients(newData);
      }

      showToast('success', 'Importação Concluída', `${data.length} clientes foram processados.`);
    } catch (err: any) {
      showToast('error', 'Erro na Importação', err.message || 'Falha ao importar arquivo.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <Users className="w-6 h-6 text-[#202eac]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
              <p className="text-sm text-slate-500">Gerencie a base de clientes e contatos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-1 shadow-sm h-10">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-[#202eac] hover:bg-blue-50 rounded-md transition-all active:scale-95"
                title="Exportar base de clientes para JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar</span>
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-[#202eac] hover:bg-blue-50 rounded-md transition-all cursor-pointer active:scale-95" title="Importar base de clientes de um arquivo JSON">
                <Upload className="w-3.5 h-3.5" />
                <span>Importar</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-[#202eac] text-white font-bold rounded-lg hover:bg-blue-800 transition-all shadow-md shadow-blue-200 active:scale-95 text-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Cliente
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8 bg-slate-50/50">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-[#202eac]/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-[#202eac]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Clientes</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalClients}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <BadgeDollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tabela Principal</p>
                <p className="text-xl font-bold text-slate-800 uppercase">{stats.topPricing}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-orange-200 transition-all">
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Região (Bairro)</p>
                <p className="text-xl font-bold text-slate-800 line-clamp-1" title={stats.topNeighborhood}>{stats.topNeighborhood}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-purple-200 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">LTV (Em Breve)</p>
                <p className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-sm">R$</span> 0,00
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="relative flex-1 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 ml-2" />
              <input
                type="text"
                placeholder="Buscar cliente por nome ou documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-sm p-1 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-1 border-l border-slate-100 pl-3 mr-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-50 text-[#202eac] shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                title="Visualização em Grade"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-50 text-[#202eac] shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                title="Visualização em Lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content Area */}
          {isLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
              <div className="w-10 h-10 border-4 border-blue-100 border-t-[#202eac] rounded-full animate-spin mx-auto mb-4" />
              Carregando clientes...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500 flex flex-col items-center">
              <Users className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-700">Nenhum cliente encontrado</p>
              <p className="text-sm mt-1">Clique em "Novo Cliente" para começar a cadastrar.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map(client => (
                <div 
                  key={client.id} 
                  onClick={() => handleOpenModal(client)}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col group cursor-pointer hover:border-[#202eac]/30"
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
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }}
                        className="p-1.5 text-slate-400 hover:text-[#202eac] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(client.id, client.name); }}
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
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
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
                    {filteredClients.map(client => (
                      <tr 
                        key={client.id} 
                        onClick={() => handleOpenModal(client)}
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
                          
                          {/* Botões de Ação Suspensos (Hover em qualquer lugar da linha) */}
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50/80 backdrop-blur-sm p-1 rounded-lg border border-blue-100 shadow-sm">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }}
                              className="p-1 px-1.5 text-[#202eac] hover:bg-white dark:bg-slate-900 rounded transition-colors flex items-center gap-1 text-[10px] font-bold"
                            >
                              <Edit2 className="w-3 h-3" />
                              EDITAR
                            </button>
                            <div className="w-[1px] h-3 bg-blue-200"></div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDelete(client.id, client.name); }}
                              className="p-1 px-1.5 text-red-600 hover:bg-white dark:bg-slate-900 rounded transition-colors flex items-center gap-1 text-[10px] font-bold"
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
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#202eac]" />
                {editingId ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('geral')}
                className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
                  activeTab === 'geral' ? 'border-[#202eac] text-[#202eac]' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Dados Gerais
              </button>
              <button
                onClick={() => setActiveTab('comercial')}
                className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
                  activeTab === 'comercial' ? 'border-[#202eac] text-[#202eac]' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Perfil Comercial
              </button>
              <div 
                className="px-6 py-3 font-semibold text-sm border-b-2 border-transparent text-slate-400 cursor-not-allowed flex items-center gap-2"
                title="Estará disponível quando o módulo de Pedidos/Produção for ativado"
              >
                Histórico (Em Breve)
              </div>
            </div>

            <form onSubmit={handleSave} className="p-6">
              {activeTab === 'geral' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome / Razão Social *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                        placeholder="Nome completo ou nome da empresa"
                      />
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="docType"
                            checked={formData.document_type === 'CPF'}
                            onChange={() => setFormData({ ...formData, document_type: 'CPF', cnpj_cpf: '' })}
                            className="w-4 h-4 text-[#202eac] focus:ring-[#202eac]"
                          />
                          <span className="text-sm font-semibold text-slate-700">Pessoa Física (CPF)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="docType"
                            checked={formData.document_type === 'CNPJ'}
                            onChange={() => setFormData({ ...formData, document_type: 'CNPJ', cnpj_cpf: '' })}
                            className="w-4 h-4 text-[#202eac] focus:ring-[#202eac]"
                          />
                          <span className="text-sm font-semibold text-slate-700">Pessoa Jurídica (CNPJ)</span>
                        </label>
                      </div>

                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-sm font-semibold text-slate-700">
                          {formData.document_type === 'CNPJ' ? 'CNPJ' : 'CPF'} No.
                        </label>
                        <span className="text-[10px] font-bold text-red-500 uppercase">Em breve validação oficial</span>
                      </div>
                      <input
                        type="text"
                        value={formData.cnpj_cpf || ''}
                        onChange={e => setFormData({ ...formData, cnpj_cpf: formatCpfCnpj(e.target.value, formData.document_type) })}
                        maxLength={formData.document_type === 'CNPJ' ? 18 : 14}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all font-mono text-sm"
                        placeholder={formData.document_type === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                      />
                    </div>

                    <div className="col-span-2 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telefone</label>
                        <input
                          type="text"
                          value={formData.phone || ''}
                          onChange={e => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                          maxLength={15}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Whatsapp</label>
                        <input
                          type="text"
                          value={formData.whatsapp || ''}
                          onChange={e => setFormData({ ...formData, whatsapp: formatPhoneNumber(e.target.value) })}
                          maxLength={15}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                        placeholder="contato@cliente.com.br"
                      />
                    </div>

                    <div className="col-span-2 grid grid-cols-4 gap-4">
                      <div className="col-span-3">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Endereço</label>
                        <input
                          type="text"
                          value={formData.address || ''}
                          onChange={e => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                          placeholder="Rua, Avenida, etc."
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Número</label>
                        <input
                          type="text"
                          value={formData.number || ''}
                          onChange={e => setFormData({ ...formData, number: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                          placeholder="000"
                        />
                      </div>
                    </div>

                    <div className="col-span-2 grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bairro</label>
                        <input
                          type="text"
                          value={formData.neighborhood || ''}
                          onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                          placeholder="Bairro"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cidade</label>
                        <input
                          type="text"
                          value={formData.city || ''}
                          onChange={e => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                          placeholder="Cidade"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estado (UF)</label>
                        <select
                          value={formData.state || ''}
                          onChange={e => setFormData({ ...formData, state: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                        >
                          <option value="">Selecione</option>
                          {BRAZILIAN_STATES.map(uf => (
                            <option key={uf} value={uf}>{uf}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'comercial' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <label className="block text-sm font-bold text-[#202eac] mb-2 flex items-center gap-2">
                      <BadgeDollarSign className="w-5 h-5" />
                      Tabela de Preços Padrão
                    </label>
                    <p className="text-xs text-slate-600 mb-3">
                      Define a precificação automática deste cliente ao gerar novos pedidos.
                    </p>
                    <select
                      value={formData.tabela_preco || 'Varejo'}
                      onChange={e => setFormData({ ...formData, tabela_preco: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-blue-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all shadow-sm"
                    >
                      <option value="Varejo">Varejo (Consumidor Final)</option>
                      <option value="Atacado">Atacado (Revenda / Grandes Volumes)</option>
                      <option value="Fardo">Fardo (Distribuição)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Tags de Segmentação Livre
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      Adicione nichos (ex: Lava Rápido, Residencial, Condomínio) digitando e pressionando Enter.
                    </p>
                    <div className="border border-slate-300 rounded-lg p-2 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-[#202eac]/20 focus-within:border-[#202eac] transition-all">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.tags && formData.tags.map(tag => (
                          <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                            {tag}
                            <button 
                              type="button"
                              onClick={() => setFormData({ ...formData, tags: formData.tags?.filter(t => t !== tag) })}
                              className="text-slate-400 hover:text-red-500 focus:outline-none"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
                              setFormData({ ...formData, tags: [...(formData.tags || []), tagInput.trim()] });
                              setTagInput('');
                            }
                          }
                        }}
                        placeholder="Digite uma tag e aperte Enter..."
                        className="w-full outline-none text-sm bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observações Comerciais</label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all resize-none h-24"
                      placeholder="Informações adicionais, horário de entrega, contatos extras..."
                    />
                  </div>
                </div>
              )}

              <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#202eac] text-white font-medium rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 shadow-sm shadow-blue-200"
                >
                  <Save className="w-4 h-4" />
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        detail={confirmModal.detail}
        type={confirmModal.type}
        confirmLabel={confirmModal.confirmLabel}
      />
    </div>
  );
}
