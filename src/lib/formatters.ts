export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatVersion = (version: string | undefined): string => {
  const rawV = version || 'v1.0';
  return rawV.toLowerCase().startsWith('v') ? rawV : `v${rawV}`;
};

/**
 * Parses a Brazilian locale number string into a float.
 * Handles formats like "1.250,50" (thousands separator + decimal comma),
 * "1250,50", "1.25", etc.
 */
export const parseLocaleNumber = (value: string): number => {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  // Check if it uses Brazilian format (has comma as decimal separator)
  if (trimmed.includes(',')) {
    // Remove thousands dots, replace comma with dot
    const normalized = trimmed.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized) || 0;
  }
  // Plain format (no comma — could be simple dot decimal or integer)
  return parseFloat(trimmed) || 0;
};
