import { useMemo } from 'react';
import { PackagingOption } from '../types/production';

function getExactCombinations(targetVolume: number, capacities: number[], maxResults = 8) {
  if (targetVolume <= 0 || capacities.length === 0) return [];
  const multiplier = 100;
  const target = Math.round(targetVolume * multiplier);
  const sortedCaps = [...new Set(capacities)].sort((a, b) => b - a);
  const intCaps = sortedCaps.map(c => Math.round(c * multiplier));
  const results: Record<number, number>[] = [];

  function backtrack(index: number, currentRemainder: number, currentCombo: Record<number, number>) {
    if (results.length >= maxResults) return;
    if (currentRemainder === 0) {
      results.push({ ...currentCombo });
      return;
    }
    if (index >= intCaps.length) return;
    const cap = intCaps[index];
    const realCap = sortedCaps[index];
    if (cap <= 0) return;
    const maxQty = Math.floor(currentRemainder / cap);
    for (let i = maxQty; i >= 0; i--) {
      currentCombo[realCap] = i;
      backtrack(index + 1, currentRemainder - (i * cap), currentCombo);
    }
  }
  backtrack(0, target, {});
  return results;
}

const isLabel = (name: string) => /r[oó]tulo/i.test(name);

export function usePackagingCalculator(plannedVolume: string, packagingOptions: PackagingOption[], packagingQty: Record<string, number>) {
  
  const targetVol = parseFloat(plannedVolume || '0');

  const packagingVolConsumed = useMemo(() => {
    let total = 0;
    Object.entries(packagingQty).forEach(([key, qty]) => {
      const opt = packagingOptions.find(p => `${p.id}_${p.variant_id || 'base'}` === key);
      if (opt && qty > 0 && !isLabel(opt.name)) total += opt.capacity * qty;
    });
    return total;
  }, [packagingQty, packagingOptions]);

  const packagingLeftover = useMemo(() => {
    return targetVol - packagingVolConsumed;
  }, [targetVol, packagingVolConsumed]);

  const packagingSuggestions = useMemo(() => {
    if (targetVol <= 0 || packagingOptions.length === 0) return [];
    const embalagemCaps = [...new Set(packagingOptions.filter(p => !isLabel(p.name)).map(p => p.capacity))];
    return getExactCombinations(targetVol, embalagemCaps, 6);
  }, [targetVol, packagingOptions]);

  const packagingPairs = useMemo(() => {
    const embalagens = packagingOptions.filter(p => !isLabel(p.name));
    const rotulos = packagingOptions.filter(p => isLabel(p.name));
    return embalagens.map(emb => {
      const matchingRotulo = rotulos.find(r => r.capacity === emb.capacity);
      return { embalagem: emb, rotulo: matchingRotulo || null };
    });
  }, [packagingOptions]);

  return {
    packagingVolConsumed,
    packagingLeftover,
    packagingSuggestions,
    packagingPairs,
    isLabel
  };
}
