import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { StorageModeProvider } from '../contexts/StorageModeContext';
import { useDashboardData } from '../hooks/useDashboardData';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StorageModeProvider>{children}</StorageModeProvider>
);

describe('useDashboardData', () => {
  it('deve ter a estrutura de dados correta', () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper });
    
    // Verificar estrutura do retorno
    expect(result.current).toHaveProperty('stats');
    expect(result.current).toHaveProperty('recentActivity');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    
    // Verificar propriedades de stats
    expect(result.current.stats).toHaveProperty('totalInsumos');
    expect(result.current.stats).toHaveProperty('estoqueBaixo');
    expect(result.current.stats).toHaveProperty('totalFormulas');
    expect(result.current.stats).toHaveProperty('ofsAtivas');
    expect(result.current.stats).toHaveProperty('taxaAprovacao');
  });

  it('deve ter funcao refetch', () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper });
    expect(typeof result.current.refetch).toBe('function');
  });
});
