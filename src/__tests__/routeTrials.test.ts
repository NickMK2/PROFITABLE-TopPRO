import { describe, expect, it } from 'vitest';
import type { RankedFlow } from '../domain/publicFlows';
import { suggestRoutes } from '../domain/routeSuggestions';
import {
  addTrialDay,
  createRouteTrial,
  normalizeTrial,
  validateRouteTrial,
  type RouteSuggestion,
} from '../domain/routeTrials';
import type { RoutePlanItem } from '../domain/routes';

const START = new Date(2026, 10, 20, 8, 0, 0).getTime();
const END = START + 7 * 24 * 3_600_000;

const suggestion: RouteSuggestion = {
  id: 'cliente:1',
  title: 'Chapinero → Usaquén',
  zone: 'Chapinero',
  windowLabel: 'Lun · 08:00',
  reason: 'Recogida habitual',
  kind: 'cliente',
};

const options = {
  costPerKm: 900,
  commissionRate: 0.2,
  minNetPerHour: 12_000,
};

function withDays(trips: number, fare: number, deadKm: number, minutes: number) {
  let trial = createRouteTrial(suggestion, START);
  for (let day = 1; day <= 4; day += 1) {
    trial = addTrialDay(
      trial,
      {
        date: `2026-11-2${day}`,
        trips,
        fareTotal: fare,
        deadKm,
        minutes,
      },
      START,
    );
  }
  return trial;
}

describe('pruebas de rutas', () => {
  it('crea una prueba de 7 días ligada a la sugerencia', () => {
    const trial = createRouteTrial(suggestion, START);
    expect(trial.suggestionId).toBe('cliente:1');
    expect(trial.endsAt - trial.createdAt).toBe(7 * 24 * 3_600_000);
    expect(trial.days).toEqual([]);
  });

  it('reemplaza el día repetido y ordena por fecha', () => {
    let trial = createRouteTrial(suggestion, START);
    trial = addTrialDay(trial, { date: '2026-11-22', trips: 1, fareTotal: 10_000, deadKm: 2, minutes: 60 });
    trial = addTrialDay(trial, { date: '2026-11-21', trips: 1, fareTotal: 8_000, deadKm: 1, minutes: 50 });
    trial = addTrialDay(trial, { date: '2026-11-22', trips: 2, fareTotal: 20_000, deadKm: 3, minutes: 70 });
    expect(trial.days).toHaveLength(2);
    expect(trial.days[0].date).toBe('2026-11-21');
    expect(trial.days[1].trips).toBe(2);
  });

  it('declara favorable cuando supera el mínimo por hora', () => {
    const trial = withDays(2, 50_000, 5, 60);
    const result = validateRouteTrial(trial, { ...options, now: END });
    expect(result.verdict).toBe('favorable');
    expect(result.summary?.daysLogged).toBe(4);
    expect(result.summary?.netPerHour).toBeGreaterThan(options.minNetPerHour);
  });

  it('declara sin resultados al cumplirse la semana sin alcanzar la meta', () => {
    const trial = withDays(0, 0, 12, 180);
    const result = validateRouteTrial(trial, { ...options, now: END });
    expect(result.verdict).toBe('sin-resultados');
    expect(result.summary?.netPerHour).toBeLessThan(options.minNetPerHour);
  });

  it('marca insuficiente antes de la semana', () => {
    const trial = withDays(1, 15_000, 3, 120);
    const result = validateRouteTrial(trial, { ...options, now: START + 24 * 3_600_000 });
    expect(result.verdict).toBe('insuficiente');
  });

  it('conserva veredicto y resumen al normalizar', () => {
    const result = validateRouteTrial(withDays(2, 50_000, 5, 60), { ...options, now: END });
    const restored = normalizeTrial(JSON.parse(JSON.stringify(result)));
    expect(restored?.verdict).toBe('favorable');
    expect(restored?.summary?.daysLogged).toBe(4);
    expect(restored?.suggestionId).toBe('cliente:1');
  });

  it('sugiere rutas de clientes y señales públicas', () => {
    const planItem = {
      customer: {
        id: 'c1',
        alias: 'Andrea',
        origin: 'Chapinero',
        destination: 'Usaquén',
        zones: 'Chapinero',
        weekdays: [1],
        pickupTime: '08:00',
        consentAt: START,
        expiresAt: END,
        createdAt: START,
      },
      nextPickupAt: START,
      hoursAway: 1,
      status: 'window',
      daysLabel: 'Lun',
      distanceFromMeKm: 1,
      chainMatch: true,
      priority: 100,
      reasons: ['Recogida en 1 h'],
    } as unknown as RoutePlanItem;

    const ranked = {
      flow: {
        id: 'salud',
        name: 'Secretaría de Salud',
        category: 'salud',
        zone: 'Carrera 32',
        confidence: 'oficial',
        insight: 'Atención lunes a viernes',
        action: 'Mirar llegada y salida',
        weekdays: [1, 2, 3, 4, 5],
        windows: [],
        verifiedAt: '2026-11-26',
      },
      next: null,
      zoneMatch: false,
      status: 'sin-horario',
    } as unknown as RankedFlow;

    const suggestions = suggestRoutes([planItem], [ranked], 4);
    expect(suggestions.map((item) => item.kind)).toEqual(['cliente', 'señal pública']);
    expect(suggestions[0].title).toContain('Chapinero');
    expect(suggestions[1].windowLabel).toBe('Sin franja fija');
  });
});
