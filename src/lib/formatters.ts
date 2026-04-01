export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatVersion = (version: string | undefined): string => {
  const rawV = version || 'v1.0';
  return rawV.toLowerCase().startsWith('v') ? rawV : `v${rawV}`;
};

export const parseLocaleNumber = (value: string): number => {
  return parseFloat(value.replace(',', '.')) || 0;
};
