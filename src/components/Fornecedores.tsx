import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Save,
  Phone,
  Mail,
  MapPin,
  Building2,
  AlertCircle
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  created_at: string;
}

export default function Fornecedores() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    notes: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) {
        // If the table doesn't exist yet, we'll just show an empty list
        if (error.code === '42P01') {
          setSuppliers([]);
          return;
        }
        throw error;
      }
      setSuppliers(data || []);
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err);
      // showNotify('error', 'Erro', 'Não foi possível carregar os fornecedores.');
    } finally {
      setIsLoading(false);
    }
  }

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.cnpj && s.cnpj.includes(searchTerm))
    );
  }, [suppliers, searchTerm]);

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingId(supplier.id);
      setFormData({ ...supplier });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        cnpj: '',
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
      alert('O nome do fornecedor é obrigatório.');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('suppliers')
          .update(formData)
          .eq('id', editingId);
        
        if (error) throw error;
        // showNotify('success', 'Sucesso', 'Fornecedor atualizado com sucesso.');
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert([formData]);
        
        if (error) throw error;
        // showNotify('success', 'Sucesso', 'Fornecedor cadastrado com sucesso.');
      }
      
      handleCloseModal();
      fetchSuppliers();
    } catch (err: any) {
      console.error('Erro ao salvar fornecedor:', err);
      if (err.code === '42P01') {
        alert('A tabela de fornecedores ainda não foi criada no banco de dados. Atualize o SQL.');
      } else {
        alert('Não foi possível salvar o fornecedor.');
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o fornecedor ${name}?`)) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      // showNotify('success', 'Sucesso', 'Fornecedor excluído com sucesso.');
      fetchSuppliers();
    } catch (err) {
      console.error('Erro ao excluir fornecedor:', err);
      alert('Não foi possível excluir o fornecedor. Ele pode estar vinculado a insumos.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <Building2 className="w-6 h-6 text-[#202eac]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Fornecedores</h1>
              <p className="text-sm text-slate-500">Gerencie os fornecedores de insumos e embalagens</p>
            </div>
          </div>
          
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-[#202eac] text-white rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            Novo Fornecedor
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar fornecedor por nome ou CNPJ..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
              />
            </div>
          </div>

          {/* Content Area */}
          {isLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
              Carregando fornecedores...
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500 flex flex-col items-center">
              <Building2 className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-700">Nenhum fornecedor encontrado</p>
              <p className="text-sm mt-1">Clique em "Novo Fornecedor" para começar a cadastrar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map(supplier => (
                <div key={supplier.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-[#202eac]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 line-clamp-1" title={supplier.name}>{supplier.name}</h3>
                        {supplier.cnpj && <p className="text-xs text-slate-500 font-mono">{supplier.cnpj}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(supplier)}
                        className="p-1.5 text-slate-400 hover:text-[#202eac] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(supplier.id, supplier.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mt-auto">
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate" title={supplier.email}>{supplier.email}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{supplier.phone}</span>
                      </div>
                    )}
                    {(supplier.city || supplier.state) && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{supplier.city}{supplier.city && supplier.state ? ' - ' : ''}{supplier.state}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
                <Building2 className="w-5 h-5 text-[#202eac]" />
                {editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Razão Social / Nome *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    placeholder="Nome da empresa"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">CNPJ / CPF</label>
                  <input 
                    type="text" 
                    value={formData.cnpj || ''}
                    onChange={e => setFormData({...formData, cnpj: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all font-mono text-sm"
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telefone</label>
                  <input 
                    type="text" 
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail</label>
                  <input 
                    type="email" 
                    value={formData.email || ''}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    placeholder="contato@empresa.com.br"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Endereço</label>
                  <input 
                    type="text" 
                    value={formData.address || ''}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    placeholder="Rua, Número, Bairro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cidade</label>
                  <input 
                    type="text" 
                    value={formData.city || ''}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    placeholder="Cidade"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estado (UF)</label>
                  <input 
                    type="text" 
                    value={formData.state || ''}
                    onChange={e => setFormData({...formData, state: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all uppercase"
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observações</label>
                  <textarea 
                    value={formData.notes || ''}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all resize-none h-24"
                    placeholder="Informações adicionais sobre o fornecedor..."
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
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
