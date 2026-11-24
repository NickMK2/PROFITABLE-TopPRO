import { describe, expect, it } from 'vitest';
import { evaluateOffer } from '../domain/decision';
import { computeOfferMetrics } from '../domain/offer';
import { defaultSettings } from '../domain/settings';
import { computeStrategy } from '../domain/strategy';
import type { Offer } from '../domain/types';

const now = new Date(2026, 0, 1, 14, 0, 0).getTime();
const settings = defaultSettings(new Date(2026, 0, 1, 9, 0, 0).getTime());

const offer: Offer = {
  id: 't1',
  source: 'uber',
  receivedAt: now,
  fare: 6_200,
  distanceKm: 4.5,
  durationMin: 22,
  commissionRate: 0.25,
};

describe('computeOfferMetrics', () => {
  it('descuenta comisión y costo variable', () => {
    const metrics = computeOfferMetrics(offer, 900);
    expect(metrics.commission).toBe(1_550);
    expect(metrics.netFare).toBe(4_650);
    expect(metrics.variableCost).toBe(4_050);
    expect(metrics.profit).toBe(600);
    expect(metrics.profitPerHour).toBeCloseTo(600 / (22 / 60), 2);
  });
});

describe('evaluateOffer', () => {
  it('acepta si supera el umbral', () => {
    const strategy = { ...computeStrategy(settings, 60_000, now), acceptFloor: 1_000 };
    expect(evaluateOffer(offer, settings, strategy, now).verdict).toBe('accept');
  });

  it('rechaza si no cubre costos aunque expire pronto', () => {
    const bad = { ...offer, fare: 1_000, expiresInSec: 10 };
    const strategy = computeStrategy(settings, 60_000, now);
    const result = evaluateOffer(bad, settings, strategy, now);
    expect(result.verdict).toBe('wait');
    expect(result.notes.join(' ')).toContain('No cubre los costos');
  });

  it('en supervivencia acepta ofertas que cubren costos', () => {
    const survival = { ...computeStrategy(settings, 20_000, now), mode: 'survival' as const, acceptFloor: 5_000 };
    const result = evaluateOffer(offer, settings, survival, now);
    expect(result.verdict).toBe('accept');
  });
});
