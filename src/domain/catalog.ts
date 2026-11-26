import type { SourceId } from './types';

export type WorkType = 'pasajeros' | 'entregas' | 'ambos';
export type VehicleType = 'moto' | 'carro' | 'ambos';
export type Availability = 'confirmada' | 'verificar';

export interface CatalogEntry {
  id: string;
  name: string;
  sourceId: SourceId;
  workType: WorkType;
  vehicle: VehicleType;
  availability: Availability;
  /** null = la app no publica un porcentaje verificable. */
  commissionRate: number | null;
  commissionVerified: boolean;
  commissionNote: string;
  payoutNote?: string;
  requirements: string[];
  notes: string[];
  termsUrl?: string;
  infoUrl?: string;
  verifiedAt: string;
}

export interface AppCatalog {
  version: number;
  country: string;
  focus: string;
  updatedAt: string;
  disclaimer: string;
  apps: CatalogEntry[];
}

const SOURCE_IDS: SourceId[] = [
  'didi',
  'uber',
  'cabify',
  'bolt',
  'yango',
  'rappi',
  'glovo',
  'pedidosya',
  'other',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && options.includes(value as T);
}

function optionalUrl(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^https:\/\//.test(value)) return undefined;
  return value;
}

function isCatalogEntry(value: unknown): value is CatalogEntry {
  if (!isRecord(value)) return false;
  const rate = value.commissionRate;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isOneOf(value.sourceId, SOURCE_IDS) &&
    isOneOf<WorkType>(value.workType, ['pasajeros', 'entregas', 'ambos']) &&
    isOneOf<VehicleType>(value.vehicle, ['moto', 'carro', 'ambos']) &&
    isOneOf<Availability>(value.availability, ['confirmada', 'verificar']) &&
    (rate === null || (typeof rate === 'number' && rate >= 0 && rate <= 0.9)) &&
    typeof value.commissionVerified === 'boolean' &&
    typeof value.commissionNote === 'string' &&
    isStringArray(value.requirements) &&
    isStringArray(value.notes) &&
    typeof value.verifiedAt === 'string' &&
    (value.payoutNote === undefined || typeof value.payoutNote === 'string') &&
    optionalUrl(value.termsUrl) === value.termsUrl &&
    optionalUrl(value.infoUrl) === value.infoUrl
  );
}

/** Valida el JSON remoto antes de reemplazar la copia incluida en la app. */
export function parseCatalog(raw: string): AppCatalog | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    if (value.version !== 1) return null;
    if (typeof value.country !== 'string' || typeof value.focus !== 'string') return null;
    if (typeof value.updatedAt !== 'string' || typeof value.disclaimer !== 'string') return null;
    if (!Array.isArray(value.apps) || !value.apps.every(isCatalogEntry)) return null;
    return value as unknown as AppCatalog;
  } catch {
    return null;
  }
}
