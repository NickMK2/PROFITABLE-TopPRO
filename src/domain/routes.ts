import { type CustomerRecord, isConsentActive, WEEKDAY_LABELS } from './customers';
import { coordsNear, haversineKm, zonesMatch, type LatLon } from './geo';

export type RouteStatus = 'window' | 'soon' | 'later';

export interface RouteOptions {
  myZone?: string;
  myLocation?: LatLon | null;
  passengerDestinationZone?: string;
  passengerDestination?: LatLon | null;
  windowHours?: number;
}

export interface RoutePlanItem {
  customer: CustomerRecord;
  nextPickupAt: number;
  hoursAway: number;
  status: RouteStatus;
  daysLabel: string;
  distanceFromMeKm: number | null;
  chainMatch: boolean;
  priority: number;
  reasons: string[];
}

export function weekdaysLabel(days: number[]): string {
  if (!days.length) return 'Sin días definidos';
  if (days.length === 7) return 'Todos los días';
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .join(' · ');
}

/** Próxima aparición de un horario semanal, en ms. null si no hay patrón. */
export function nextOccurrence(time: string | undefined, days: number[], now: number): number | null {
  const match = time?.match(/^(\d{1,2}):(\d{2})$/);
  if (!match || !days.length) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(hours, minutes, 0, 0);
    if (candidate.getTime() <= now) continue;
    if (days.includes(candidate.getDay())) return candidate.getTime();
  }
  return null;
}

function formatKm(value: number): string {
  return `${value.toFixed(1)} km`;
}

function formatHours(value: number): string {
  if (value < 1) return `${Math.max(1, Math.round(value * 60))} min`;
  return `${value.toFixed(1)} h`;
}

/**
 * Ordena clientes recurrentes por cercanía y por coincidencia con el destino del pasajero actual.
 * No consulta GPS, contactos ni apps de terceros: usa solo datos cargados a mano en el dispositivo.
 */
export function planRoutes(
  customers: CustomerRecord[],
  options: RouteOptions,
  now: number = Date.now(),
): RoutePlanItem[] {
  const windowHours = Math.min(24, Math.max(0.5, options.windowHours ?? 2));

  return customers
    .filter((customer) => isConsentActive(customer, now))
    .map((customer) => {
      const nextPickupAt = nextOccurrence(customer.pickupTime, customer.weekdays, now);
      if (nextPickupAt === null) return null;

      const hoursAway = (nextPickupAt - now) / 3_600_000;
      const distanceFromMeKm = haversineKm(options.myLocation, customer.originCoord);
      const chainMatch =
        zonesMatch(options.passengerDestinationZone, customer.origin) ||
        coordsNear(options.passengerDestination, customer.originCoord);

      let priority = 0;
      const reasons: string[] = [];
      let status: RouteStatus = 'later';

      if (hoursAway <= windowHours) {
        priority += 70;
        status = 'window';
        reasons.push(`Recogida en ${formatHours(hoursAway)}`);
      } else if (hoursAway <= 24) {
        priority += 35;
        status = 'soon';
        reasons.push(`Recogida en ${formatHours(hoursAway)}`);
      } else {
        priority += 10;
        reasons.push(`Próxima recogida en ${formatHours(hoursAway)}`);
      }

      if (distanceFromMeKm !== null) {
        if (distanceFromMeKm <= 2) priority += 55;
        else if (distanceFromMeKm <= 5) priority += 40;
        else if (distanceFromMeKm <= 10) priority += 25;
        else priority += 5;
        reasons.push(`Origen a ${formatKm(distanceFromMeKm)} de tu ubicación`);
      } else if (zonesMatch(options.myZone, customer.origin)) {
        priority += 30;
        reasons.push('Tu zona y el origen coinciden por texto');
      }

      if (chainMatch) {
        priority += 50;
        reasons.push('Tu pasajero actual termina cerca de este origen');
      }
      if (customer.returnTime) reasons.push(`Regreso habitual ${customer.returnTime}`);

      return {
        customer,
        nextPickupAt,
        hoursAway,
        status,
        daysLabel: weekdaysLabel(customer.weekdays),
        distanceFromMeKm,
        chainMatch,
        priority,
        reasons,
      } satisfies RoutePlanItem;
    })
    .filter((item): item is RoutePlanItem => item !== null)
    .sort((a, b) => b.priority - a.priority || a.nextPickupAt - b.nextPickupAt);
}
