import { zonesMatch } from './geo';

export type FlowConfidence = 'oficial' | 'orientativo' | 'verificar';

export interface FlowWindow {
  start: string;
  end: string;
  label: string;
}

export interface PublicFlow {
  id: string;
  name: string;
  category: string;
  zone: string;
  confidence: FlowConfidence;
  insight: string;
  action: string;
  weekdays: number[];
  windows: FlowWindow[];
  sourceUrl?: string;
  verifiedAt: string;
}

export interface PublicFlowCatalog {
  version: number;
  country: string;
  city: string;
  updatedAt: string;
  disclaimer: string;
  signals: PublicFlow[];
}

export interface FlowWindowOccurrence {
  startAt: number;
  endAt: number;
  label: string;
  active: boolean;
}

export interface RankedFlow {
  flow: PublicFlow;
  next: FlowWindowOccurrence | null;
  zoneMatch: boolean;
  status: 'active' | 'soon' | 'later' | 'sin-horario';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value);
}

function optionalUrl(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^https:\/\//.test(value)) return undefined;
  return value;
}

function isFlow(value: unknown): value is PublicFlow {
  if (!isRecord(value)) return false;
  const weekdays = value.weekdays;
  const windows = value.windows;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.category === 'string' &&
    typeof value.zone === 'string' &&
    (value.confidence === 'oficial' ||
      value.confidence === 'orientativo' ||
      value.confidence === 'verificar') &&
    typeof value.insight === 'string' &&
    typeof value.action === 'string' &&
    Array.isArray(weekdays) &&
    weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) &&
    Array.isArray(windows) &&
    windows.every(
      (window) =>
        isRecord(window) &&
        isTime(window.start) &&
        isTime(window.end) &&
        typeof window.label === 'string',
    ) &&
    optionalUrl(value.sourceUrl) === value.sourceUrl &&
    typeof value.verifiedAt === 'string'
  );
}

/** Valida el JSON remoto antes de reemplazar la copia incluida. */
export function parsePublicFlows(raw: string): PublicFlowCatalog | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    if (value.version !== 1) return null;
    if (typeof value.country !== 'string' || typeof value.city !== 'string') return null;
    if (typeof value.updatedAt !== 'string' || typeof value.disclaimer !== 'string') return null;
    if (!Array.isArray(value.signals) || !value.signals.every(isFlow)) return null;
    return value as unknown as PublicFlowCatalog;
  } catch {
    return null;
  }
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function momentOf(day: Date, time: string): number {
  const result = new Date(day);
  const total = minutesOf(time);
  result.setHours(Math.floor(total / 60), total % 60, 0, 0);
  return result.getTime();
}

/** Ventana activa ahora o próxima, según los días publicados. */
export function currentOrNextWindow(flow: PublicFlow, now: number): FlowWindowOccurrence | null {
  let best: FlowWindowOccurrence | null = null;
  for (let offset = 0; offset <= 7; offset += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    if (!flow.weekdays.includes(day.getDay())) continue;
    for (const window of flow.windows) {
      const startAt = momentOf(day, window.start);
      const endAt = momentOf(day, window.end);
      if (now >= startAt && now <= endAt) {
        return { startAt, endAt, label: window.label, active: true };
      }
      if (startAt > now && (!best || startAt < best.startAt)) {
        best = { startAt, endAt, label: window.label, active: false };
      }
    }
  }
  return best;
}

/** Ordena señales por zona, ventana activa y cercanía horaria. */
export function rankFlows(flows: PublicFlow[], myZone: string, now: number): RankedFlow[] {
  return flows
    .map((flow) => {
      const next = currentOrNextWindow(flow, now);
      const zoneMatch = zonesMatch(myZone, flow.zone);
      const status: RankedFlow['status'] = !next && !flow.windows.length
        ? 'sin-horario'
        : next?.active
          ? 'active'
          : next && next.startAt - now <= 2 * 3_600_000
            ? 'soon'
            : 'later';
      return { flow, next, zoneMatch, status };
    })
    .sort((a, b) => {
      const rank = { active: 0, soon: 1, later: 2, 'sin-horario': 3 };
      if (a.zoneMatch !== b.zoneMatch) return a.zoneMatch ? -1 : 1;
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      return (a.next?.startAt ?? Infinity) - (b.next?.startAt ?? Infinity);
    });
}
