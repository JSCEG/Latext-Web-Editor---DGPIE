export const computeFigureId = (sec, ord) => {
  const s = (sec || '').toString().trim();
  const o = (ord || '').toString().trim();
  if (s && o) return `FIG-${s}-${o}`;
  if (o) return `FIG-${o}`;
  return '';
};

export const computeTableId = (sec, ord) => {
  const s = (sec || '').toString().trim();
  const o = (ord || '').toString().trim();
  if (s && o) return `TBL-${s}-${o}`;
  if (o) return `TBL-${o}`;
  return '';
};

export const generateManyIds = (count) => {
  const tables = [];
  const figures = [];
  for (let i = 1; i <= count; i++) {
    const sec = String(1 + Math.floor((i - 1) / 10));
    const ord = String(((i - 1) % 10) + 1);
    tables.push(computeTableId(sec, ord));
    figures.push(computeFigureId(sec, ord));
  }
  return { tables, figures };
};
