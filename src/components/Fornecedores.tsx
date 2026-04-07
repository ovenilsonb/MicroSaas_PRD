import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useStorageMode } from '../contexts/StorageModeContext';
import { generateId } from '../lib/id';
import { useToast } from './dashboard/Toast';
import {
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
  AlertCircle,
  LayoutGrid,
  List,
  Download,
  Upload,
  TrendingUp,
  Database,
  AlertTriangle
} from 'lucide-react';
import { exportToJson, importFromJson, getBackupFilename } from '../lib/backupUtils';
import { useInsumosData } from './InsumosComponents/useInsumosData';

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
  tags?: string[];
  created_at: string;
}

export default function Fornecedores() {
  const { showToast } = useToast();
  const { mode } = useStorageMode();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'insumos'>('geral');
  const [editingId, setEditingId] = useState<string | null>(null);
  const { ingredients } = useInsumosData();
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    notes: '',
    tags: []
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    try {
      setIsLoading(true);
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .order('name');

        if (error) {
          if (error.code === '42P01') {
            setSuppliers([]);
            return;
          }
          throw error;
        }
        setSuppliers(data || []);
      } else {
        const local = localStorage.getItem('local_suppliers');
        setSuppliers(local ? JSON.parse(local) : []);
      }
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err);
      showToast('error', 'Erro', 'Falha ao carregar fornecedores.');
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

  // Dashboard Stats
  const stats = useMemo(() => {
    const totalSuppliers = suppliers.length;
    let totalStockValue = 0;
    const suppliersInCrisis = new Set<string>();
    const categoryCounts: Record<string, number> = {};

    suppliers.forEach(s => {
      // Tags/Categories count
      s.tags?.forEach(tag => {
        categoryCounts[tag] = (categoryCounts[tag] || 0) + 1;
      });

      // Calculate stock and crisis for this supplier
      ingredients.forEach(ing => {
        const isParentSupplier = ing.supplier_id === s.id || (s.name && ing.fornecedor === s.name);
        
        if (ing.tem_variantes && ing.variants && ing.variants.length > 0) {
          ing.variants.forEach(v => {
            const isVariantSupplier = v.supplier_id === s.id || (!v.supplier_id && isParentSupplier);
            if (isVariantSupplier) {
              const cost = typeof v.cost_per_unit === 'number' ? v.cost_per_unit : 0;
              totalStockValue += (v.estoque_atual || 0) * cost;
              if ((v.estoque_atual || 0) <= (v.estoque_minimo || 0)) {
                suppliersInCrisis.add(s.id);
              }
            }
          });
        } else if (isParentSupplier) {
          const cost = typeof ing.cost_per_unit === 'number' ? ing.cost_per_unit : 0;
          totalStockValue += (ing.estoque_atual || 0) * cost;
          if ((ing.estoque_atual || 0) <= (ing.estoque_minimo || 0)) {
            suppliersInCrisis.add(s.id);
          }
        }
      });
    });

    const topCategory = Object.entries(categoryCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalSuppliers,
      totalStockValue,
      criticalCount: suppliersInCrisis.size,
      topCategory
    };
  }, [suppliers, ingredients]);

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
        notes: '',
        tags: []
      });
    }
    setActiveTab('geral');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      showToast('error', 'Campo Obrigatório', 'O nome do fornecedor é obrigatório.');
      return;
    }

    try {
      if (mode === 'supabase') {
        if (editingId) {
          const { error } = await supabase
            .from('suppliers')
            .update(formData)
            .eq('id', editingId);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('suppliers')
            .insert([formData]);

          if (error) throw error;
        }
      } else {
        const local = JSON.parse(localStorage.getItem('local_suppliers') || '[]');
        if (editingId) {
          const idx = local.findIndex((s: Supplier) => s.id === editingId);
          if (idx >= 0) {
            local[idx] = { ...local[idx], ...formData };
          }
        } else {
          local.push({
            id: generateId(),
            ...formData,
            created_at: new Date().toISOString()
          } as Supplier);
        }
        localStorage.setItem('local_suppliers', JSON.stringify(local));
      }

      handleCloseModal();
      fetchSuppliers();
    } catch (err: any) {
      console.error('Erro ao salvar fornecedor:', err);
      showToast('error', 'Erro ao Salvar', 'Não foi possível salvar o fornecedor.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o fornecedor ${name}?`)) return;

    try {
      if (mode === 'supabase') {
        const { error } = await supabase
          .from('suppliers')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } else {
        const local = JSON.parse(localStorage.getItem('local_suppliers') || '[]');
        const filtered = local.filter((s: Supplier) => s.id !== id);
        localStorage.setItem('local_suppliers', JSON.stringify(filtered));
      }
      fetchSuppliers();
    } catch (err) {
      console.error('Erro ao excluir fornecedor:', err);
      showToast('error', 'Erro ao Excluir', 'Não foi possível excluir o fornecedor.');
    }
  };

  const handleExport = () => {
    try {
      const filename = getBackupFilename('Fornecedores');
      exportToJson(filename, suppliers);
      showToast('success', 'Exportação Concluída', 'O backup foi gerado com sucesso.');
    } catch (err) {
      showToast('error', 'Erro na Exportação', 'Não foi possível gerar o arquivo de backup.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromJson(file);
      if (!Array.isArray(data)) throw new Error('Dados inválidos.');

      if (window.confirm(`Deseja importar ${data.length} fornecedores?`)) {
        if (mode === 'supabase') {
          for (const item of data) {
            const { id, created_at, ...cleanData } = item;
            await supabase.from('suppliers').upsert([cleanData]);
          }
        } else {
          const local = JSON.parse(localStorage.getItem('local_suppliers') || '[]');
          for (const item of data) {
            const { id, created_at, ...cleanData } = item;
            const existingIdx = local.findIndex((s: Supplier) => s.id === id);
            if (existingIdx >= 0) {
              local[existingIdx] = { ...local[existingIdx], ...cleanData };
            } else {
              local.push({
                id: generateId(),
                ...cleanData,
                created_at: new Date().toISOString()
              } as Supplier);
            }
          }
          localStorage.setItem('local_suppliers', JSON.stringify(local));
        }
        fetchSuppliers();
        showToast('success', 'Importação Concluída', `${data.length} fornecedores foram processados.`);
      }
    } catch (err) {
      showToast('error', 'Erro na Importação', 'Falha ao importar arquivo.');
    }
    e.target.value = '';
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium flex items-center gap-2"
              title="Exportar para JSON"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="absolute inset-0 opacity-0 cursor-pointer"
                title="Importar de JSON"
              />
              <button
                className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Importar
              </button>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-[#202eac] text-white rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm shadow-blue-200"
            >
              <Plus className="w-4 h-4" />
              Novo Fornecedor
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-[#202eac]/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6 text-[#202eac]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Fornecedores</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalSuppliers}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Investimento em Estabilid.</p>
                <p className="text-2xl font-bold text-slate-800">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalStockValue)}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-red-200 transition-all">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estoques Críticos</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-slate-800">{stats.criticalCount}</p>
                  <span className="text-[10px] text-slate-400 font-medium">FORNECEDORES</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-purple-200 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Especialidade Principal</p>
                <p className="text-xl font-bold text-slate-800 line-clamp-1">{stats.topCategory}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="relative flex-1 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 ml-2" />
              <input
                type="text"
                placeholder="Buscar fornecedor por nome ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-sm p-1 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-1 border-l border-slate-100 pl-3 mr-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-50 text-[#202eac] shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                title="Visualização em Grade"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
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
              Carregando fornecedores...
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500 flex flex-col items-center">
              <Building2 className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-700">Nenhum fornecedor encontrado</p>
              <p className="text-sm mt-1">Clique em "Novo Fornecedor" para começar a cadastrar.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map(supplier => (
                <div 
                  key={supplier.id} 
                  onClick={() => handleOpenModal(supplier)}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col group cursor-pointer hover:border-[#202eac]/30"
                >
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
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(supplier); }}
                        className="p-1.5 text-slate-400 hover:text-[#202eac] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(supplier.id, supplier.name); }}
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
                    {supplier.tags && supplier.tags.length > 0 && (
                      <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap gap-1">
                        {supplier.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-md">
                            {tag}
                          </span>
                        ))}
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
                      <th className="py-4 px-6">Fornecedor</th>
                      <th className="py-4 px-6">CNPJ / CPF</th>
                      <th className="py-4 px-6">Contato</th>
                      <th className="py-4 px-6">Localização</th>
                      <th className="py-4 px-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSuppliers.map(supplier => (
                      <tr 
                        key={supplier.id} 
                        onClick={() => handleOpenModal(supplier)}
                        className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4 text-[#202eac]" />
                            </div>
                            <span className="font-bold text-slate-800">{supplier.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-slate-600 font-mono">{supplier.cnpj || '-'}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-800">{supplier.phone || '-'}</span>
                            <span className="text-xs text-slate-500">{supplier.email || '-'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-slate-600">
                            {supplier.city ? `${supplier.city}${supplier.state ? ', ' + supplier.state : ''}` : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleOpenModal(supplier); }}
                              className="p-1.5 text-slate-400 hover:text-[#202eac] hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDelete(supplier.id, supplier.name); }}
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

            <div className="flex border-b border-slate-100 bg-slate-50 px-6">
              <button
                onClick={() => setActiveTab('geral')}
                className={`py-3 px-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'geral' ? 'border-[#202eac] text-[#202eac]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Dados Gerais
              </button>
              {editingId && (
                <button
                  onClick={() => setActiveTab('insumos')}
                  className={`py-3 px-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'insumos' ? 'border-[#202eac] text-[#202eac]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  Insumos Fornecidos
                </button>
              )}
            </div>

            <div className="p-6">
              {activeTab === 'geral' ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Razão Social / Nome *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                        placeholder="Nome da empresa"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">CNPJ / CPF</label>
                      <input
                        type="text"
                        value={formData.cnpj || ''}
                        onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all font-mono text-sm"
                        placeholder="00.000.000/0000-00"
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
                        placeholder="contato@empresa.com.br"
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
                        placeholder="Informações adicionais sobre o fornecedor..."
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tags / Categorias</label>
                      <div className="flex flex-wrap gap-2">
                        {['Química', 'Embalagens', 'Rótulos', 'Serviços', 'Revenda'].map(tag => {
                          const isSelected = formData.tags?.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                const currentTags = formData.tags || [];
                                if (isSelected) {
                                  setFormData({ ...formData, tags: currentTags.filter(t => t !== tag) });
                                } else {
                                  setFormData({ ...formData, tags: [...currentTags, tag] });
                                }
                              }}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                                isSelected 
                                  ? 'bg-[#202eac] border-[#202eac] text-white' 
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-[#202eac] hover:text-[#202eac]'
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
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
              ) : (
                <div className="space-y-4">
                  {(() => {
                     // Calculate supplied items (ingredients and specific variants)
                     const suppliedItems: { name: string; codigo: string; estoque: number; unit: string; custo: number; isVariant?: boolean }[] = [];
                     
                     ingredients.forEach(ing => {
                       const isParentSupplier = ing.supplier_id === editingId || ing.fornecedor === formData.name;
                       
                       if (ing.tem_variantes && ing.variants && ing.variants.length > 0) {
                         ing.variants.forEach(v => {
                           const isVariantSupplier = v.supplier_id === editingId || (!v.supplier_id && isParentSupplier);
                           if (isVariantSupplier) {
                             suppliedItems.push({
                               name: `${ing.name} - ${v.name}`,
                               codigo: v.codigo || ing.codigo || '',
                               estoque: v.estoque_atual || 0,
                               unit: ing.unit,
                               custo: typeof v.cost_per_unit === 'number' ? v.cost_per_unit : 0,
                               isVariant: true
                             });
                           }
                         });
                       } else if (isParentSupplier) {
                         suppliedItems.push({
                           name: ing.name,
                           codigo: ing.codigo || '',
                           estoque: ing.estoque_atual || 0,
                           unit: ing.unit,
                           custo: typeof ing.cost_per_unit === 'number' ? ing.cost_per_unit : 0
                         });
                       }
                     });

                     const totalInvested = suppliedItems.reduce((acc, item) => acc + (item.estoque * item.custo), 0);

                     if (suppliedItems.length === 0) {
                       return (
                         <div className="text-center py-12 text-slate-500">
                           <p>Nenhum insumo ou variante vinculado a este fornecedor.</p>
                         </div>
                       );
                     }

                     return (
                       <>
                         <div className="flex items-center justify-between mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                           <span className="font-medium text-slate-700">Total de Itens: <span className="font-bold text-[#202eac]">{suppliedItems.length}</span></span>
                           <span className="font-medium text-slate-700">Valor em Estoque: <span className="font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInvested)}</span></span>
                         </div>
                         <div className="overflow-y-auto max-h-80 border border-slate-200 rounded-lg">
                           <table className="w-full text-left text-sm">
                             <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                               <tr>
                                 <th className="px-4 py-2 text-slate-600 font-semibold">Insumo / Variante</th>
                                 <th className="px-4 py-2 text-slate-600 font-semibold">Código</th>
                                 <th className="px-4 py-2 text-slate-600 font-semibold text-right">Estoque</th>
                                 <th className="px-4 py-2 text-slate-600 font-semibold text-right">Custo Un.</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                               {suppliedItems.map((item, idx) => (
                                 <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                   <td className="px-4 py-3">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-slate-800">{item.name}</span>
                                        {item.isVariant && <span className="text-[10px] text-blue-500 font-bold uppercase">Variante</span>}
                                      </div>
                                   </td>
                                   <td className="px-4 py-3 font-mono text-slate-500 text-xs">{item.codigo || '-'}</td>
                                   <td className="px-4 py-3 text-right">
                                     <span className="font-semibold text-slate-700">
                                       {item.estoque} {item.unit}
                                     </span>
                                   </td>
                                   <td className="px-4 py-3 text-right font-medium text-emerald-600">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.custo)}
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       </>
                     );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
