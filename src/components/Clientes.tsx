import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Plus, Edit2, Trash2, X, Save, Mail, Phone, MapPin, Building2, LayoutGrid, List, Download, Upload, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStorageMode } from '../contexts/StorageModeContext';
import { exportToJson, importFromJson, getBackupFilename } from '../lib/backupUtils';
import { generateId } from '../lib/id';
import { useToast } from './dashboard/Toast';

interface Client {
  id: string;
  name: string;
  cnpj_cpf: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  created_at: string;
}

export default function Clientes() {
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const { mode } = useStorageMode();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    cnpj_cpf: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    notes: ''
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
      (c.cnpj_cpf && c.cnpj_cpf.includes(searchTerm))
    );
  }, [clients, searchTerm]);

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingId(client.id);
      setFormData({ ...client });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        cnpj_cpf: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        notes: ''
      });
    }
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
    if (!window.confirm(`Tem certeza que deseja excluir o cliente ${name}?`)) return;

    try {
      if (mode === 'supabase') {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', id);

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
      <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
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
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm h-10">
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

          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
              <div className="w-10 h-10 border-4 border-blue-100 border-t-[#202eac] rounded-full animate-spin mx-auto mb-4" />
              Carregando clientes...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500 flex flex-col items-center">
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
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate" title={client.email}>{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {(client.city || client.state) && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{client.city}{client.city && client.state ? ' - ' : ''}{client.state}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                      <th className="py-4 px-6">Cliente</th>
                      <th className="py-4 px-6">CPF / CNPJ</th>
                      <th className="py-4 px-6">Contato</th>
                      <th className="py-4 px-6">Localização</th>
                      <th className="py-4 px-6 text-right">Ações</th>
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
                            <span className="text-slate-800">{client.phone || '-'}</span>
                            <span className="text-xs text-slate-500">{client.email || '-'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-slate-600">
                            {client.city ? `${client.city}${client.state ? ', ' + client.state : ''}` : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }}
                              className="p-1.5 text-slate-400 hover:text-[#202eac] hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDelete(client.id, client.name); }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome / Razão Social *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    placeholder="Nome completo ou nome da empresa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={formData.cnpj_cpf || ''}
                    onChange={e => setFormData({ ...formData, cnpj_cpf: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all font-mono text-sm"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telefone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    placeholder="contato@cliente.com.br"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Endereço</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    placeholder="Rua, Número, Bairro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cidade</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    placeholder="Cidade"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estado (UF)</label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all uppercase"
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observações</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all resize-none h-24"
                    placeholder="Informações adicionais sobre o cliente..."
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
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
    </div>
  );
}
