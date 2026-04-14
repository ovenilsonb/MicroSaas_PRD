import { useState } from 'react';
import { ProductionOrder } from '../types/production';

export function useProductionState() {
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'details'>('list');
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    onConfirm: () => void;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    onConfirm: () => {},
    title: '',
    message: '',
    type: 'info'
  });

  return {
    viewMode, setViewMode,
    selectedOrder, setSelectedOrder,
    searchTerm, setSearchTerm,
    confirmModal, setConfirmModal,
    isSaving, setIsSaving
  };
}
