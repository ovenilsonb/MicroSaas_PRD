import { useState, useEffect } from 'react';
import { ViewMode, Simulation } from './types';

export function useProporcaoUI(filteredCount: number) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('proporcaoViewMode');
      return (saved as 'list' | 'grid') || 'list';
    } catch {
      return 'list';
    }
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalInfo, setSuccessModalInfo] = useState({ 
    title: '', 
    message: '', 
    itemName: '', 
    type: 'success' as 'success' | 'warning' 
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredCount / ITEMS_PER_PAGE);

  useEffect(() => {
    localStorage.setItem('proporcaoViewMode', viewMode);
  }, [viewMode]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setCurrentPage(1);
  };

  const openSuccessModal = (title: string, message: string, itemName: string, type: 'success' | 'warning' = 'success') => {
    setSuccessModalInfo({ title, message, itemName, type });
    setShowSuccessModal(true);
  };

  return {
    viewMode, setViewMode: handleViewModeChange,
    currentPage, setCurrentPage,
    totalPages,
    ITEMS_PER_PAGE,
    showSuccessModal, setShowSuccessModal,
    successModalInfo, openSuccessModal
  };
}
