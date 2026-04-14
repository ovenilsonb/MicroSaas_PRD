export const compareVersions = (v1: string, v2: string) => {
  if (!v1) return -1;
  const parse = (v: string) => v.toLowerCase().replace(/[^\d.]/g, '').split('.').map(Number);
  const p1 = parse(v1);
  const p2 = parse(v2 || '0');
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 !== n2) return n1 - n2;
  }
  return 0;
};

export const getBaseFormulaName = (name: string): string => 
  name.trim().replace(/\s*\([^)]*\)\s*$/g, '').trim().toUpperCase();
