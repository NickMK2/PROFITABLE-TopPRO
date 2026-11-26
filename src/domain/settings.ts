import { timeToEpoch } from './money';
import type { ShiftSettings, SourceId } from './types';

export const ALL_SOURCES: SourceId[] = [
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

export function defaultSettings(now = Date.now()): ShiftSettings {
  return {
    goal: 120_000,
    shiftStart: timeToEpoch('09:00', now),
    shiftEnd: timeToEpoch('19:00', now),
    reserveRate: 12_000,
    hardFloorRate: 6_000,
    utilization: 0.85,
    offersPerHour: 6,
    referenceOffersPerHour: 8,
    costPerKm: 900,
    commissionBySource: {
      didi: 0.2,
      uber: 0.25,
      cabify: 0.2,
      bolt: 0.2,
      yango: 0.15,
      // En entregas, la app muestra la ganancia del repartidor (domicilio + propina en Rappi).
      rappi: 0,
      glovo: 0,
      pedidosya: 0,
      other: 0.22,
    },
    enabledSources: [...ALL_SOURCES],
  };
}
