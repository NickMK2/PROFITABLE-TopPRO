import { parseLatLon, type LatLon } from './geo';

export const CONSENT_MONTHS = 12;
/** 0 = domingo … 6 = sábado. */
export const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export interface CustomerInput {
  alias: string;
  phone?: string;
  email?: string;
  zones?: string;
  notes?: string;
  origin?: string;
  destination?: string;
  weekdays?: number[];
  pickupTime?: string;
  returnTime?: string;
  originCoordText?: string;
  destinationCoordText?: string;
  consent: boolean;
}

export interface CustomerRecord {
  id: string;
  alias: string;
  phone?: string;
  email?: string;
  zones?: string;
  notes?: string;
  origin?: string;
  destination?: string;
  weekdays: number[];
  pickupTime?: string;
  returnTime?: string;
  originCoord?: LatLon;
  destinationCoord?: LatLon;
  consentAt: number;
  expiresAt: number;
  createdAt: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optional(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  return value ? value : undefined;
}

function cleanWeekdays(days?: number[]): number[] {
  if (!Array.isArray(days)) return [];
  return [...new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort();
}

function normalizeTime(raw?: string): string | undefined {
  const match = raw?.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function toCoord(value: unknown): LatLon | undefined {
  if (!isRecord(value)) return undefined;
  const { lat, lon } = value;
  if (typeof lat !== 'number' || typeof lon !== 'number') return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
  return { lat, lon };
}

function expiryFrom(now: number): number {
  const date = new Date(now);
  date.setMonth(date.getMonth() + CONSENT_MONTHS);
  return date.getTime();
}

export function isConsentActive(customer: CustomerRecord, now: number = Date.now()): boolean {
  return customer.expiresAt > now;
}

/** Devuelve null si falta el alias o el consentimiento explícito. */
export function createCustomer(
  input: CustomerInput,
  now: number = Date.now(),
): CustomerRecord | null {
  const alias = input.alias.trim();
  if (!alias || !input.consent) return null;
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    alias,
    phone: optional(input.phone),
    email: optional(input.email),
    zones: optional(input.zones),
    notes: optional(input.notes),
    origin: optional(input.origin),
    destination: optional(input.destination),
    weekdays: cleanWeekdays(input.weekdays),
    pickupTime: normalizeTime(input.pickupTime),
    returnTime: normalizeTime(input.returnTime),
    originCoord: parseLatLon(input.originCoordText) ?? undefined,
    destinationCoord: parseLatLon(input.destinationCoordText) ?? undefined,
    consentAt: now,
    expiresAt: expiryFrom(now),
    createdAt: now,
  };
}

/** Recupera registros guardados y tolera versiones anteriores del esquema. */
export function normalizeCustomer(raw: unknown): CustomerRecord | null {
  if (!isRecord(raw) || typeof raw.alias !== 'string') return null;
  const now = Date.now();
  const consentAt = typeof raw.consentAt === 'number' ? raw.consentAt : now;
  return {
    id: typeof raw.id === 'string' ? raw.id : `${now}-${Math.random().toString(36).slice(2, 8)}`,
    alias: raw.alias,
    phone: typeof raw.phone === 'string' ? raw.phone : undefined,
    email: typeof raw.email === 'string' ? raw.email : undefined,
    zones: typeof raw.zones === 'string' ? raw.zones : undefined,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    origin: typeof raw.origin === 'string' ? raw.origin : undefined,
    destination: typeof raw.destination === 'string' ? raw.destination : undefined,
    weekdays: cleanWeekdays(raw.weekdays as number[] | undefined),
    pickupTime: normalizeTime(typeof raw.pickupTime === 'string' ? raw.pickupTime : undefined),
    returnTime: normalizeTime(typeof raw.returnTime === 'string' ? raw.returnTime : undefined),
    originCoord: toCoord(raw.originCoord),
    destinationCoord: toCoord(raw.destinationCoord),
    consentAt,
    expiresAt: typeof raw.expiresAt === 'number' ? raw.expiresAt : expiryFrom(now),
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
  };
}

export function renewConsent(customer: CustomerRecord, now: number = Date.now()): CustomerRecord {
  return { ...customer, consentAt: now, expiresAt: expiryFrom(now) };
}
