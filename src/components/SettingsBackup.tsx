import React, { useRef, useState } from 'react';
import { Download, Upload, AlertCircle, Database } from 'lucide-react';
import { useToast } from './dashboard/Toast';
import { exportToJson, importFromJson, getBackupFilename } from '../lib/backupUtils';
import { ConfirmModal, ConfirmModalType } from './shared/ConfirmModal';

const LOCAL_KEYS = [
  'local_ingredients',
  'local_formulas',
  'local_groups',
  'local_suppliers',
  'local_clients',
  'local_production_orders',
  'local_quality_controls',
  'local_inventory_logs',
  'local_finished_goods',
  'local_finished_goods_logs',
  'local_proportions',
  'precificacao_entries',
  'production_orders_ext',
  'storageMode',
  'dashboardLayouts',
  'insumosViewMode',
  'insumosItemsPerPage',
  'formulasViewMode',
  'proporcaoViewMode',
  'precificacao_columns',
];

export default function SettingsBackup() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; detail?: string;
    type: ConfirmModalType; confirmLabel?: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {} });
  const [pendingImportData, setPendingImportData] = useState<Record<string, unknown> | null>(null);

  const handleExport = () => {
    try {
      const backup: Record<string, unknown> = {};
      LOCAL_KEYS.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          try {
            backup[key] = JSON.parse(raw);
          } catch {
            backup[key] = raw;
          }
        }
      });

      const filename = getBackupFilename('OhanaClean_Global');
      exportToJson(filename, backup);
      showToast('success', 'Exportação Concluída', `O backup "${filename}" foi gerado com sucesso.`);
    } catch {
      showToast('error', 'Erro na Exportação', 'Não foi possível gerar o arquivo de backup.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromJson(file);
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('Formato de backup inválido. Use um arquivo gerado pelo sistema.');
      }

      setPendingImportData(data as Record<string, unknown>);
      setConfirmModal({
        isOpen: true,
        title: 'Restaurar Backup',
        message: 'Isso substituirá TODOS os dados atuais pelos dados do backup. Deseja continuar?',
        type: 'danger',
        confirmLabel: 'Sim, Restaurar',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          executeImport(data as Record<string, unknown>);
        },
      });
    } catch (err: any) {
      showToast('error', 'Erro na Restauração', err.message || 'Falha ao importar arquivo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const executeImport = (data: Record<string, unknown>) => {
    try {
      let importedCount = 0;
      for (const [key, value] of Object.entries(data)) {
        if (LOCAL_KEYS.includes(key) || key.startsWith('local_') || key.startsWith('precificacao_') || key.startsWith('production_')) {
          localStorage.setItem(key, JSON.stringify(value));
          importedCount++;
        }
      }
      showToast('success', 'Restauração Concluída', `${importedCount} chaves de dados foram restauradas. A página será recarregada.`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      showToast('error', 'Erro na Restauração', err.message || 'Falha ao restaurar dados.');
    }
  };

  return (
    <>
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Database className="w-5 h-5 text-[#202eac]" /> Backup e Restauração
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Mantenha seus dados seguros. Exporte suas fórmulas, insumos e relatórios para um arquivo seguro ou restaure dados de um backup anterior.
        </p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export */}
        <div className="border border-slate-200 rounded-xl p-5 hover:border-[#202eac]/30 transition-colors">
          <div className="w-10 h-10 bg-blue-50 text-[#202eac] rounded-lg flex items-center justify-center mb-4">
            <Download className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">Exportar Dados (Backup)</h3>
          <p className="text-sm text-slate-500 mb-6">
            Gera um arquivo contendo todas as suas fórmulas, histórico de preços e cadastro de insumos.
          </p>
          <button
            onClick={handleExport}
            className="w-full py-2.5 bg-white border-2 border-[#202eac] text-[#202eac] hover:bg-blue-50 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Gerar Arquivo de Backup
          </button>
        </div>

        {/* Import */}
        <div className="border border-slate-200 rounded-xl p-5 hover:border-[#202eac]/30 transition-colors">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
            <Upload className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">Restaurar Dados</h3>
          <p className="text-sm text-slate-500 mb-6">
            Importe um arquivo de backup gerado anteriormente. <strong className="text-amber-600">Atenção:</strong> isso substituirá os dados atuais.
          </p>
          <label className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" /> Selecionar Arquivo
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
              aria-label="Selecionar arquivo de backup"
            />
          </label>
        </div>
      </div>

      <div className="bg-amber-50 border-t border-amber-100 p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Recomendação de Segurança:</strong> É aconselhável realizar o backup dos seus dados semanalmente. No futuro, poderemos automatizar este processo para a nuvem.
        </p>
      </div>
    </section>

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
    </>
  );
}
