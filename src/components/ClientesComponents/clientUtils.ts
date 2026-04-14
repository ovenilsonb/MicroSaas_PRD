export const formatCpfCnpj = (value: string, type: 'CPF' | 'CNPJ' = 'CPF') => {
  const numeric = value.replace(/\D/g, '');
  if (type === 'CPF') {
    if (numeric.length <= 3) return numeric;
    if (numeric.length <= 6) return `${numeric.slice(0, 3)}.${numeric.slice(3)}`;
    if (numeric.length <= 9) return `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6)}`;
    return `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-${numeric.slice(9, 11)}`;
  } else {
    if (numeric.length <= 2) return numeric;
    if (numeric.length <= 5) return `${numeric.slice(0, 2)}.${numeric.slice(2)}`;
    if (numeric.length <= 8) return `${numeric.slice(0, 2)}.${numeric.slice(2, 5)}.${numeric.slice(5)}`;
    if (numeric.length <= 12) return `${numeric.slice(0, 2)}.${numeric.slice(2, 5)}.${numeric.slice(5, 8)}/${numeric.slice(8)}`;
    return `${numeric.slice(0, 2)}.${numeric.slice(2, 5)}.${numeric.slice(5, 8)}/${numeric.slice(8, 12)}-${numeric.slice(12, 14)}`;
  }
};

export const formatPhoneNumber = (value: string) => {
  if (!value) return '';
  const numeric = value.replace(/\D/g, '');
  if (numeric.length <= 2) return `(${numeric}`;
  if (numeric.length <= 6) return `(${numeric.slice(0, 2)}) ${numeric.slice(2)}`;
  if (numeric.length <= 10) return `(${numeric.slice(0, 2)}) ${numeric.slice(2, 6)}-${numeric.slice(6)}`;
  return `(${numeric.slice(0, 2)}) ${numeric.slice(2, 7)}-${numeric.slice(7, 11)}`;
};
