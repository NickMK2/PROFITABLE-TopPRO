import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../domain/settings';
import { computeStrategy } from '../domain/strategy';

const day = new Date(2026, 0, 1, 9, 0, 0).getTime();

describe('computeStrategy', () => {
  it('calcula el ritmo requerido con el tiempo productivo restante', () => {
    const settings = defaultSettings(day);
    const now = new Date(2026, 0, 1, 14, 0, 0).getTime();
    const result = computeStrategy(settings, 60_000, now);

    expect(result.remainingHours).toBeCloseTo(5, 1);
    expect(result.remainingGoal).toBe(60_000);
    expect(result.requiredRate).toBeCloseTo(60_000 / (5 * 0.85), 0);
    expect(result.progressRatio).toBeCloseTo(1, 2);
  });

  it('baja el umbral cuando vas detrás del ritmo', () => {
    const settings = defaultSettings(day);
    const now = new Date(2026, 0, 1, 14, 0, 0).getTime();
    const behind = computeStrategy(settings, 30_000, now);
    const onTrack = computeStrategy(settings, 60_000, now);

    expect(behind.urgencyFactor).toBeLessThan(onTrack.urgencyFactor);
    expect(behind.acceptFloor).toBeLessThan(onTrack.acceptFloor);
  });

  it('sube el umbral cuando hay muchas ofertas', () => {
    const settings = defaultSettings(day);
    const now = new Date(2026, 0, 1, 14, 0, 0).getTime();
    const quiet = computeStrategy({ ...settings, offersPerHour: 2 }, 60_000, now);
    const busy = computeStrategy({ ...settings, offersPerHour: 16 }, 60_000, now);

    expect(quiet.demandFactor).toBeLessThan(1);
    expect(busy.demandFactor).toBeGreaterThan(1);
    expect(busy.acceptFloor).toBeGreaterThan(quiet.acceptFloor);
  });

  it('activa supervivencia al final del día con poco progreso', () => {
    const settings = defaultSettings(day);
    const now = new Date(2026, 0, 1, 18, 30, 0).getTime();
    const result = computeStrategy(settings, 20_000, now);

    expect(result.mode).toBe('survival');
    expect(result.acceptFloor).toBeGreaterThanOrEqual(settings.hardFloorRate);
    expect(result.acceptFloor).toBeLessThan(settings.reserveRate);
  });
});
