import { useState, useCallback } from 'react';
import { generateId } from '../../lib/id';
import { Simulation } from './types';

interface UseSimulationReturn {
  recentSimulations: Simulation[];
  saveSimulation: (simulation: Omit<Simulation, 'id' | 'createdAt'>) => void;
  fetchSimulations: (formulaId: string) => void;
}

export function useSimulation(): UseSimulationReturn {
  const [recentSimulations, setRecentSimulations] = useState<Simulation[]>([]);

  const saveSimulation = useCallback((simulation: Omit<Simulation, 'id' | 'createdAt'>) => {
    const saved = JSON.parse(localStorage.getItem('local_proportions') || '[]');
    const newSim: Simulation = {
      ...simulation,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('local_proportions', JSON.stringify([newSim, ...saved]));
  }, []);

  const fetchSimulations = useCallback((formulaId: string) => {
    const raw = localStorage.getItem('local_proportions');
    const all = raw ? JSON.parse(raw) : [];
    setRecentSimulations(
      Array.isArray(all)
        ? all
            .filter(p => p.formulaId === formulaId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
        : []
    );
  }, []);

  return {
    recentSimulations,
    saveSimulation,
    fetchSimulations,
  };
}
