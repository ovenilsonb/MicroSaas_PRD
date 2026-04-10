import React, { useRef, useState, useMemo } from 'react';
import {
  Download, Upload, AlertCircle, Database, CheckCircle2, HardDrive,
  RefreshCw, Loader2, Package, FlaskConical, Scale, DollarSign,
  ShoppingCart, ClipboardList, Archive, Users, Truck, BarChart3,
  Settings, ToggleLeft, ToggleRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { useToast } from './dashboard/Toast';
import { exportToJson, importFromJson, getBackupFilename } from '../lib/backupUtils';
import { ConfirmModal, ConfirmModalType } from './shared/ConfirmModal';

type ExportState = 'idle' | 'running' | 'done';

// Definição de módulos com metadados visuais e chaves associadas
const BACKUP_MODULES = [
  {
    id: 'ingredients',
    label: 'Insumos',
    description: 'Matérias-primas e estoques',
    icon: Package,
    keys: ['local_ingredients', 'local_groups'],
  },
  {
    id: 'formulas',
    label: 'Fórmulas',
    description: 'Composições técnicas',
    icon: FlaskConical,
    keys: ['local_formulas'],
  },
  {
    id: 'proportions',
    label: 'Proporções',
    description: 'Simulações e cálculos',
    icon: Scale,
    keys: ['local_proportions'],
  },
  {
    id: 'pricing',
    label: 'Precificação',
    description: 'Tabelas e margens',
    icon: DollarSign,
    keys: ['precificacao_entries', 'precificacao_columns'],
  },
  {
    id: 'production',
    label: 'Produção',
    description: 'Ordens de fabricação',
    icon: ClipboardList,
    keys: ['local_production_orders', 'production_orders_ext'],
  },
  {
    id: 'quality',
    label: 'Qualidade',
    description: 'Controle de qualidade',
    icon: BarChart3,
    keys: ['local_quality_controls'],
  },
  {
    id: 'stock',
    label: 'Estoque',
    description: 'Produtos e logs',
    icon: Archive,
    keys: ['local_finished_goods', 'local_finished_goods_logs', 'local_inventory_logs'],
  },
  {
    id: 'sales',
    label: 'Vendas',
    description: 'Ordens de venda',
    icon: ShoppingCart,
    keys: ['local_sale_orders'],
  },
  {
    id: 'purchases',
    label: 'Compras',
    description: 'Ordens de compra',
    icon: Truck,
    keys: ['local_purchase_orders'],
  },
  {
    id: 'contacts',
    label: 'Contatos',
    description: 'Parceiros cadastrados',
    icon: Users,
    keys: ['local_suppliers', 'local_clients'],
  },
  {
    id: 'settings',
    label: 'Configurações',
    description: 'Identidade e preferências',
    icon: Settings,
    keys: ['local_company_settings', 'storageMode', 'storage_version', 'dashboardLayouts', 'insumosViewMode', 'insumosItemsPerPage', 'formulasViewMode', 'proporcaoViewMode'],
  },
] as const;

const ALL_KEYS = BACKUP_MODULES.flatMap(m => m.keys);

function getModuleStats(keys: readonly string[]) {
  let totalRecords = 0;
  let hasData = false;
  keys.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw !== null && raw !== '[]' && raw !== '{}') {
      hasData = true;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) totalRecords += parsed.length;
        else if (typeof parsed === 'object') totalRecords += Object.keys(parsed).length;
        else totalRecords += 1;
      } catch { totalRecords += 1; }
    }
  });
  return { hasData, totalRecords };
}

export default function SettingsBackup() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; detail?: string;
    type: ConfirmModalType; confirmLabel?: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {} });

  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedCount, setExportedCount] = useState(0);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(BACKUP_MODULES.map(m => m.id))
  );
  const [showModuleList, setShowModuleList] = useState(true);

  // Dados de cada módulo calculados
  const moduleStats = useMemo(() =>
    BACKUP_MODULES.map(m => ({ ...m, stats: getModuleStats(m.keys) })),
  []);

  const selectedKeys = useMemo(() =>
    BACKUP_MODULES
      .filter(m => selectedModules.has(m.id))
      .flatMap(m => m.keys),
  [selectedModules]);

  const totalRecordsSelected = useMemo(() =>
    moduleStats
      .filter(m => selectedModules.has(m.id))
      .reduce((acc, m) => acc + m.stats.totalRecords, 0),
  [selectedModules, moduleStats]);

  const modulesWithData = moduleStats.filter(m => m.stats.hasData).length;

  const toggleModule = (id: string) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedModules(new Set(BACKUP_MODULES.map(m => m.id)));
  const selectNone = () => setSelectedModules(new Set());
  const selectWithData = () =>
    setSelectedModules(new Set(moduleStats.filter(m => m.stats.hasData).map(m => m.id)));

  const handleExport = () => {
    if (exportState === 'running') return;
    if (selectedModules.size === 0) {
      showToast('warning', 'Nenhum Módulo Selecionado', 'Selecione ao menos um módulo para exportar.');
      return;
    }
    setExportState('running');
    setExportProgress(0);

    const totalSteps = 30;
    let step = 0;
    const backup: Record<string, unknown> = {};
    let count = 0;

    const interval = setInterval(() => {
      step++;
      setExportProgress(Math.min(90, Math.round((step / totalSteps) * 90)));

      if (step >= totalSteps) {
        clearInterval(interval);
        try {
          selectedKeys.forEach(key => {
            const raw = localStorage.getItem(key);
            if (raw !== null) {
              try { backup[key] = JSON.parse(raw); } catch { backup[key] = raw; }
              count++;
            }
          });
          // capturar chaves dinâmicas extras não previstas
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && !ALL_KEYS.includes(key as any) &&
              (key.startsWith('local_') || key.startsWith('precificacao_') || key.startsWith('production_'))) {
              const raw = localStorage.getItem(key);
              if (raw !== null) {
                try { backup[key] = JSON.parse(raw); } catch { backup[key] = raw; }
                count++;
              }
            }
          }
          setExportProgress(100);
          setExportedCount(count);
          setExportState('done');
          exportToJson(getBackupFilename('OhanaClean'), backup);
          setTimeout(() => { setExportState('idle'); setExportProgress(0); }, 5000);
        } catch {
          setExportState('idle');
          setExportProgress(0);
          showToast('error', 'Erro na Exportação', 'Não foi possível gerar o arquivo.');
        }
      }
    }, 50);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromJson(file);
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('Formato de backup inválido.');
      }
      const keys = Object.keys(data);
      setConfirmModal({
        isOpen: true,
        title: 'Restaurar Backup Completo',
        message: `Isso substituirá TODOS os dados atuais pelos dados do arquivo (${keys.length} conjuntos). Esta ação não pode ser desfeita.`,
        detail: `Arquivo: ${file.name}`,
        type: 'danger',
        confirmLabel: 'Sim, Restaurar Agora',
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
        if (ALL_KEYS.includes(key as any) || key.startsWith('local_') ||
          key.startsWith('precificacao_') || key.startsWith('production_') ||
          key === 'storageMode' || key === 'storage_version' || key === 'dashboardLayouts') {
          localStorage.setItem(key, JSON.stringify(value));
          importedCount++;
        }
      }
      showToast('success', 'Restauração Concluída', `${importedCount} conjunto(s) restaurados. Recarregando...`);
      setTimeout(() => window.location.reload(), 1800);
    } catch (err: any) {
      showToast('error', 'Erro na Restauração', err.message || 'Falha ao restaurar dados.');
    }
  };

  return (
    <>
      <section className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
                Backup &amp; Restauração de Dados
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Selecione os módulos, visualize o conteúdo e exporte com segurança
              </p>
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{BACKUP_MODULES.length}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Módulos Totais</div>
            </div>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center">
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{modulesWithData}</div>
              <div className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest mt-1">Com Dados</div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-center">
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{selectedModules.size}</div>
              <div className="text-[10px] font-black text-blue-500/70 uppercase tracking-widest mt-1">Selecionados</div>
            </div>
          </div>
        </div>

        {/* Module Selector */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setShowModuleList(!showModuleList)}
              className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              {showModuleList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Módulos do Backup
            </button>
            <div className="flex items-center gap-2">
              <button onClick={selectWithData} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all">
                Com Dados
              </button>
              <button onClick={selectAll} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all">
                Todos
              </button>
              <button onClick={selectNone} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                Nenhum
              </button>
            </div>
          </div>

          {showModuleList && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {moduleStats.map(mod => {
                const isSelected = selectedModules.has(mod.id);
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={`group relative p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-black ${isSelected ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                            {mod.label}
                          </span>
                          {mod.stats.hasData ? (
                            <span className="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {mod.stats.totalRecords}
                            </span>
                          ) : (
                            <span className="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-300">
                              0
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug truncate">
                          {mod.description}
                        </p>
                      </div>
                    </div>

                    {/* Tick de seleção */}
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Export / Import Actions */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Card */}
          <div className={`p-6 rounded-2xl border-2 transition-all ${
            exportState === 'done'
              ? 'bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-300 dark:border-emerald-700'
              : 'bg-blue-50/40 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/40 hover:border-blue-300 dark:hover:border-blue-800'
          }`}>
            <div className={`w-10 h-10 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg transition-all ${
              exportState === 'done' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-blue-600 shadow-blue-500/30'
            }`}>
              {exportState === 'running' ? <Loader2 className="w-5 h-5 animate-spin" />
                : exportState === 'done' ? <CheckCircle2 className="w-5 h-5" />
                : <Download className="w-5 h-5" />}
            </div>

            <h3 className="font-black text-slate-800 dark:text-slate-100 mb-1">
              {exportState === 'done' ? 'Backup Concluído!' : 'Exportar Backup'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-5 leading-relaxed">
              {exportState === 'done'
                ? <><strong className="text-emerald-600 dark:text-emerald-400">{exportedCount} conjuntos</strong> salvos com segurança. ✓</>
                : <><strong className="text-slate-700 dark:text-slate-300">{selectedModules.size} módulos</strong> • ~{totalRecordsSelected} registros selecionados</>
              }
            </p>

            {exportState !== 'idle' && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {exportState === 'done' ? 'Concluído' : 'Gerando arquivo...'}
                  </span>
                  <span className={`text-sm font-black ${exportState === 'done' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {exportProgress}%
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-100 ${exportState === 'done' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={exportState === 'running' || selectedModules.size === 0}
              className={`w-full py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
                exportState === 'done' ? 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600'
                  : exportState === 'running' ? 'bg-blue-400 text-white cursor-not-allowed opacity-80'
                  : selectedModules.size === 0 ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700'
              }`}
            >
              {exportState === 'running' ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando Backup...</>
                : exportState === 'done' ? <><CheckCircle2 className="w-4 h-4" /> Download Concluído</>
                : <><Download className="w-4 h-4" /> Gerar Arquivo de Backup</>}
            </button>
          </div>

          {/* Import Card */}
          <div className="p-6 bg-emerald-50/40 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-900/30 rounded-2xl hover:border-emerald-300 dark:hover:border-emerald-700 transition-all hover:shadow-md">
            <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 mb-1">Restaurar Backup</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-5 leading-relaxed">
              Importe um arquivo <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-[11px]">.json</code> gerado pelo sistema.{' '}
              <strong className="text-amber-600 dark:text-amber-400">Os dados atuais serão substituídos.</strong>
            </p>
            <label className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm">
              <Upload className="w-4 h-4" /> Selecionar Arquivo de Backup
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </div>
        </div>

        {/* Warning */}
        <div className="px-8 pb-8">
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-5 rounded-2xl flex gap-4 items-start">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">Recomendação de Segurança</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                Realize o backup semanalmente e guarde em lugar seguro (Google Drive, e-mail ou pendrive). O sistema armazena tudo localmente no navegador — o backup é sua única proteção contra perda de dados.
              </p>
            </div>
          </div>
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
