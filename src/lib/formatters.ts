export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatVersion = (version: string | undefined): string => {
  const rawV = version || 'V1';
  return rawV.startsWith('V') ? rawV : `V${rawV}`;
};

export const parseLocaleNumber = (value: string): number => {
  return parseFloat(value.replace(',', '.')) || 0;
};
