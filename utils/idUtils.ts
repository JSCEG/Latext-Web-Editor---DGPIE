export const computeFigureId = (sec: string, ord: string): string => {
  const s = (sec || '').toString().trim();
  const o = (ord || '').toString().trim();
  if (s && o) return `FIG-${s}-${o}`;
  if (o) return `FIG-${o}`;
  return '';
};

export const computeTableId = (sec: string, ord: string): string => {
  const s = (sec || '').toString().trim();
  const o = (ord || '').toString().trim();
  if (s && o) return `TBL-${s}-${o}`;
  if (o) return `TBL-${o}`;
  return '';
};

export const generateManyIds = (count: number): { tables: string[]; figures: string[] } => {
  const tables: string[] = [];
  const figures: string[] = [];
  for (let i = 1; i <= count; i++) {
    const sec = String(1 + Math.floor((i - 1) / 10));
    const ord = String(((i - 1) % 10) + 1);
    tables.push(computeTableId(sec, ord));
    figures.push(computeFigureId(sec, ord));
  }
  return { tables, figures };
};
