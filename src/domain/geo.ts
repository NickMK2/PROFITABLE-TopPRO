export interface LatLon {
  lat: number;
  lon: number;
}

/** Acepta "4.7110, -74.0721" o "4.7110;-74.0721". */
export function parseLatLon(raw?: string): LatLon | null {
  if (!raw?.trim()) return null;
  const match = raw
    .trim()
    .match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

export function formatLatLon(value?: LatLon): string | undefined {
  return value ? `${value.lat.toFixed(4)}, ${value.lon.toFixed(4)}` : undefined;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

/** Distancia en km entre dos coordenadas. null si falta alguna. */
export function haversineKm(a?: LatLon | null, b?: LatLon | null): number | null {
  if (!a || !b) return null;
  const earthKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

function normalizeZone(value?: string): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Comparación textual simple: "Chapinero" coincide con "Casa Chapinero". */
export function zonesMatch(a?: string, b?: string): boolean {
  const left = normalizeZone(a);
  const right = normalizeZone(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

export function coordsNear(a?: LatLon | null, b?: LatLon | null, maxKm = 3): boolean {
  const distance = haversineKm(a, b);
  return distance !== null && distance <= maxKm;
}
