import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useStorageMode } from '../../../contexts/StorageModeContext';
import { useToast } from '../../dashboard/Toast';
import { exportToJson, importFromJson, getBackupFilename } from '../../../lib/backupUtils';
import { generateId } from '../../../lib/id';
import { Client } from '../types';

export function useClientActions(clients: Client[], fetchClients: () => Promise<void>) {
  const { mode } = useStorageMode();
  const { showToast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({});
  
  const [confirmModal, setConfirmModal] = useState<any>({ 
    isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {} 
  });

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingId(client.id);
      setFormData({ ...client });
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
    setIsModalOpen(true);
  };

  const handleSave = async (data: Partial<Client>) => {
    if (!data.name) {
      showToast('error', 'Erro', 'O nome do cliente é obrigatório.');
      return;
    }

    try {
      if (mode === 'supabase') {
        if (editingId) {
          const { error } = await supabase.from('clients').update(data).eq('id', editingId);
          if (error) throw error;
          showToast('success', 'Sucesso', 'Cliente atualizado com sucesso.');
        } else {
          const { error } = await supabase.from('clients').insert([data]);
          if (error) throw error;
          showToast('success', 'Sucesso', 'Cliente cadastrado com sucesso.');
        }
      } else {
        const localData = JSON.parse(localStorage.getItem('local_clients') || '[]');
        if (editingId) {
          const index = localData.findIndex((c: any) => c.id === editingId);
          if (index >= 0) {
            localData[index] = { ...data, id: editingId, updated_at: new Date().toISOString() };
            localStorage.setItem('local_clients', JSON.stringify(localData));
            showToast('success', 'Sucesso', 'Cliente atualizado localmente.');
          }
        } else {
          const newClient = { ...data, id: generateId(), created_at: new Date().toISOString() };
          localData.push(newClient);
          localStorage.setItem('local_clients', JSON.stringify(localData));
          showToast('success', 'Sucesso', 'Cliente cadastrado localmente.');
        }
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (err) {
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
        setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
        try {
          if (mode === 'supabase') {
            const { error } = await supabase.from('clients').delete().eq('id', id);
            if (error) throw error;
            showToast('success', 'Sucesso', 'Cliente excluído com sucesso.');
          } else {
            const localData = JSON.parse(localStorage.getItem('local_clients') || '[]');
            localStorage.setItem('local_clients', JSON.stringify(localData.filter((c: any) => c.id !== id)));
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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromJson(file);
      if (!Array.isArray(data)) throw new Error('Formato de dados inválido.');
      if (mode === 'supabase') {
        for (const item of data) {
          await supabase.from('clients').upsert(item);
        }
      } else {
        localStorage.setItem('local_clients', JSON.stringify(data));
      }
      showToast('success', 'Importação Concluída', `${data.length} clientes foram processados.`);
      fetchClients();
    } catch (err: any) {
      showToast('error', 'Erro na Importação', err.message || 'Falha ao importar arquivo.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  return {
    isModalOpen,
    setIsModalOpen,
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
  };
}
