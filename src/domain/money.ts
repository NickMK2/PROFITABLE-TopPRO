export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatMoney(value: number, currency = '$'): string {
  const safe = Number.isFinite(value) ? value : 0;
  const sign = safe < 0 ? '-' : '';
  const [integer, decimals] = Math.abs(safe).toFixed(2).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${currency} ${grouped},${decimals}`;
}

export function formatRate(value: number, currency = '$'): string {
  return `${formatMoney(value, currency)}/h`;
}

export function formatClock(epoch: number): string {
  const date = new Date(epoch);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Convierte "09:30" a epoch ms del día indicado (por defecto, hoy). */
export function timeToEpoch(hhmm: string, base = Date.now()): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return base;
  const date = new Date(base);
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.getTime();
}

/** Convierte epoch ms a "HH:MM". */
export function epochToTime(epoch: number): string {
  const date = new Date(epoch);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
