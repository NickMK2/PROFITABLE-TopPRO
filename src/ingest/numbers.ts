/** Parsea números en formatos latinos: 4850, 4.850, 4.850,50, 4850.5 */
export function parseNumber(raw: string): number {
  if (!raw) return NaN;
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return NaN;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandSep = decimalSep === ',' ? '.' : ',';
    return Number(cleaned.split(thousandSep).join('').replace(decimalSep, '.'));
  }
  if (lastComma >= 0) {
    return /,\d{1,2}$/.test(cleaned)
      ? Number(cleaned.replace(',', '.'))
      : Number(cleaned.replace(/,/g, ''));
  }
  if (lastDot >= 0) {
    return /\.\d{1,2}$/.test(cleaned)
      ? Number(cleaned)
      : Number(cleaned.replace(/\./g, ''));
  }
  return Number(cleaned);
}
