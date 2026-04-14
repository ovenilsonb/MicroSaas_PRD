import React, { useState } from 'react';
import { X, Pencil, Trash2 } from 'lucide-react';
import { Group } from './types';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Group[];
  onSave: (name: string, id?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSave,
  onDelete
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!categoryName.trim()) return;
    setIsSaving(true);
    const success = await onSave(categoryName, editingCategoryId || undefined);
    if (success) {
      setCategoryName('');
      setEditingCategoryId(null);
    }
    setIsSaving(false);
  };

  const handleEdit = (category: Group) => {
    setCategoryName(category.name);
    setEditingCategoryId(category.id);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Gerenciar Categorias</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Nome da categoria..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] outline-none transition-all"
            />
            <button
              onClick={handleSave}
              disabled={isSaving || !categoryName.trim()}
              className="px-4 py-2 bg-[#202eac] text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors font-medium"
            >
              {editingCategoryId ? 'Atualizar' : 'Adicionar'}
            </button>
            {editingCategoryId && (
              <button
                onClick={() => {
                  setEditingCategoryId(null);
                  setCategoryName('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                <tr>
                  <th className="py-2 px-4 font-semibold">Nome da Categoria</th>
                  <th className="py-2 px-4 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-4 text-center text-slate-500">
                      Nenhuma categoria cadastrada.
                    </td>
                  </tr>
                ) : (
                  categories.map(category => (
                    <tr key={category.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-4">{category.name}</td>
                      <td className="py-2 px-4 text-right">
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-1.5 text-slate-400 hover:text-[#202eac] transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(category.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors ml-1"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
