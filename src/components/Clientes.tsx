import React from 'react';
import { Users, Plus, Download, Upload } from 'lucide-react';
import { useToast } from './dashboard/Toast';
import { ConfirmModal } from './shared/ConfirmModal';

// Modular Components
import { ClientStats } from './ClientesComponents/ClientStats';
import { ClientFiltersBar } from './ClientesComponents/ClientFiltersBar';
import { ClientCard } from './ClientesComponents/ClientCard';
import { ClientTable } from './ClientesComponents/ClientTable';
import { ClientModal } from './ClientesComponents/ClientModal/ClientModal';

// Modular Hooks
import { useClientData } from './ClientesComponents/hooks/useClientData';
import { useClientFilters } from './ClientesComponents/hooks/useClientFilters';
import { useClientActions } from './ClientesComponents/hooks/useClientActions';

export default function Clientes() {
  const { showToast } = useToast();
  
  // Data Hook
  const { 
    clients, 
    isLoading, 
    stats, 
    fetchClients 
  } = useClientData();

  // Filters Hook
  const {
    searchTerm,
    setSearchTerm,
    viewMode,
    setViewMode,
    filteredClients
  } = useClientFilters(clients);

  // Actions Hook
  const {
    isModalOpen,
    editingId,
    formData,
    setFormData,
    handleOpenModal,
    handleSave,
    handleDelete,
    handleExport,
    handleImport,
    confirmModal,
    setConfirmModal
  } = useClientActions(clients, fetchClients);

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
          
          <ClientStats stats={stats} />

          <ClientFiltersBar 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />

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
                <ClientCard 
                  key={client.id}
                  client={client}
                  onEdit={handleOpenModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <ClientTable 
              clients={filteredClients}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      <ClientModal 
        isOpen={isModalOpen}
        onClose={() => handleOpenModal()} // Close via handleOpenModal or toggle
        onSave={handleSave}
        formData={formData}
        setFormData={setFormData}
        editingId={editingId}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev: any) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        detail={confirmModal.detail}
        type={confirmModal.type}
        confirmLabel={confirmModal.confirmLabel}
      />
    </div>
  );
}
