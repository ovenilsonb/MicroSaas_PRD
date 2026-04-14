import React from 'react';
import { Archive, RefreshCw, Package, Layers } from 'lucide-react';
import { useStorageMode } from '../contexts/StorageModeContext';
import { useToast } from './dashboard/Toast';
import {
  useInventoryData,
  useInventoryFilters,
  useInventoryActions,
  InventoryStats,
  FinishedGoodsGallery,
  RawMaterialsTable,
  InventoryActivityFeed,
  InventoryTab
} from './EstoqueComponents';
import { ErrorBoundary } from './shared/ErrorBoundary';

export default function Estoque() {
  const { showToast } = useToast();
  const { mode } = useStorageMode();

  // 1. Data Layer
  const {
    logs,
    stats,
    finishedGoods,
    setFinishedGoods,
    fgLogs,
    setFgLogs,
    isLoading,
    refresh
  } = useInventoryData(mode as 'supabase' | 'local');

  // 2. Filter & UI Layer
  const {
    activeTab, setActiveTab,
    searchTermFG, setSearchTermFG,
    searchTermRaw, setSearchTermRaw,
    filteredStats,
    filteredFG,
    currentMonthLogs
  } = useInventoryFilters(stats, finishedGoods, logs);

  // 3. Actions Layer
  const {
    handleDeleteFgStock,
    handleAdjustFgStock
  } = useInventoryActions(
    mode as 'supabase' | 'local',
    finishedGoods,
    setFinishedGoods,
    fgLogs,
    setFgLogs,
    refresh,
    showToast
  );

  return (
    <ErrorBoundary moduleName="Estoque">
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Archive className="w-6 h-6 text-[#202eac]" />
              Movimentação de Estoque
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === 'finished' ? 'Controle de produtos acabados prontos para venda' : 'Rastreabilidade total de insumos e matérias-primas'}
            </p>
          </div>

          <button
            onClick={refresh}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#202eac] transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </header>

        {/* TABS */}
        <div className="bg-white px-8 pt-6 pb-0 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('finished')}
              className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'finished' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" /> Produtos Acabados
              </div>
              {activeTab === 'finished' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#202eac] rounded-t-full shadow-[0_-2px_8px_rgba(32,46,172,0.4)]" />}
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'raw' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" /> Matérias-Primas e Insumos
              </div>
              {activeTab === 'raw' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#202eac] rounded-t-full shadow-[0_-2px_8px_rgba(32,46,172,0.4)]" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 pt-6 flex flex-col gap-6">
          <InventoryStats 
            type={activeTab}
            finishedGoods={finishedGoods}
            fgLogs={fgLogs}
            stats={stats}
            currentMonthLogs={currentMonthLogs}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-[400px]">
            {activeTab === 'finished' ? (
              <>
                <div className="lg:col-span-8 flex flex-col">
                  <FinishedGoodsGallery 
                    finishedGoods={filteredFG}
                    searchTerm={searchTermFG}
                    onSearchChange={setSearchTermFG}
                    onAdjust={handleAdjustFgStock}
                    onDelete={handleDeleteFgStock}
                  />
                </div>
                <div className="lg:col-span-4 flex flex-col">
                  <InventoryActivityFeed 
                    title="Movimentação (PA)"
                    logs={fgLogs}
                    isFinishedGoods
                  />
                </div>
              </>
            ) : (
              <>
                <div className="lg:col-span-7 flex flex-col">
                  <RawMaterialsTable 
                    stats={filteredStats}
                    searchTerm={searchTermRaw}
                    onSearchChange={setSearchTermRaw}
                  />
                </div>
                <div className="lg:col-span-5 flex flex-col">
                  <InventoryActivityFeed 
                    title="Log de Atividades"
                    logs={logs}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
