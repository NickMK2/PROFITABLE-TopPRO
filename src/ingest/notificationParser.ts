import type { Offer, SourceId } from '../domain/types';
import { parseNumber } from './numbers';

export interface ParsedOffer {
  offer: Offer | null;
  source: SourceId;
  confidence: number;
  missing: string[];
  raw: string;
  packageName?: string;
}

const SOURCE_PATTERNS: Array<[SourceId, RegExp]> = [
  ['didi', /didi/i],
  ['uber', /uber/i],
  ['cabify', /cabify/i],
  ['bolt', /bolt/i],
  ['yango', /yango/i],
];

export function detectSource(text: string, packageName?: string): SourceId {
  const haystack = `${packageName ?? ''} ${text}`;
  for (const [id, pattern] of SOURCE_PATTERNS) {
    if (pattern.test(haystack)) return id;
  }
  return 'other';
}

function findAll(pattern: RegExp, text: string): RegExpExecArray[] {
  const global = pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);
  const result: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = global.exec(text)) !== null) {
    result.push(match);
    if (match[0].length === 0) global.lastIndex += 1;
  }
  return result;
}

/**
 * Extrae una oferta del texto de la notificación.
 * Los minutos se suman (recogida + viaje) porque el costo incluye el traslado.
 * Los campos que no se puedan leer quedan en `missing` para que el usuario los corrija.
 */
export function parseOfferText(
  text: string,
  receivedAt: number = Date.now(),
  packageName?: string,
): ParsedOffer {
  const clean = text.replace(/\u00a0/g, ' ');
  const source = detectSource(clean, packageName);
  const missing: string[] = [];

  const fareMatch = /(?:\$|ARS)\s*([\d]+(?:[.,]\d+)*)/i.exec(clean);
  const fare = fareMatch ? parseNumber(fareMatch[1]) : NaN;
  if (!Number.isFinite(fare) || fare <= 0) missing.push('tarifa');

  const kmMatch = /([\d]+(?:[.,]\d+)?)\s*(?:km|kil[oó]metros?)/i.exec(clean);
  const parsedKm = kmMatch ? parseNumber(kmMatch[1]) : NaN;
  const distanceKm = Number.isFinite(parsedKm) && parsedKm > 0 ? parsedKm : 0;
  if (distanceKm <= 0) missing.push('distancia');

  const minuteMatches = findAll(/([\d]+(?:[.,]\d+)?)\s*(?:min|minutos?)\b/gi, clean);
  const durationMin = minuteMatches.reduce(
    (sum, match) => sum + Math.min(parseNumber(match[1]) || 0, 120),
    0,
  );
  if (durationMin <= 0) missing.push('tiempo');

  const secondsMatch = /([\d]+)\s*(?:seg|segundos?|s)\b/i.exec(clean);
  const expiresInSec = secondsMatch ? Number(secondsMatch[1]) : undefined;

  const offer: Offer | null =
    Number.isFinite(fare) && fare > 0
      ? {
          id: `${receivedAt}-${source}-${Math.random().toString(36).slice(2, 7)}`,
          source,
          receivedAt,
          fare,
          distanceKm,
          durationMin,
          commissionRate: 0, // se completa desde la configuración por fuente
          expiresInSec,
          raw: clean,
        }
      : null;

  return {
    offer,
    source,
    confidence: (3 - missing.length) / 3,
    missing,
    raw: clean,
    packageName,
  };
}
