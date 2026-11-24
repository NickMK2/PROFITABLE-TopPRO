import { clamp } from './money';
import type { Offer, OfferMetrics } from './types';

/**
 * Normaliza cualquier oferta a métricas comparables.
 * El tiempo y la distancia incluyen el traslado hasta recoger al pasajero.
 */
export function computeOfferMetrics(offer: Offer, costPerKm: number): OfferMetrics {
  const fare = Math.max(0, offer.fare);
  const commissionRate = clamp(offer.commissionRate, 0, 0.9);
  const commission = fare * commissionRate;
  const netFare = fare - commission;

  const km = Math.max(0, offer.distanceKm);
  const variableCost = km * Math.max(0, costPerKm);
  const profit = netFare - variableCost;

  const hours = Math.max(1, offer.durationMin) / 60;
  return {
    grossFare: fare,
    commission,
    netFare,
    variableCost,
    profit,
    profitPerHour: profit / hours,
    grossPerHour: netFare / hours,
    profitPerKm: km > 0 ? profit / km : 0,
  };
}
