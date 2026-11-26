import { describe, expect, it } from 'vitest';
import { createCustomer, type CustomerRecord } from '../domain/customers';
import { haversineKm, parseLatLon, zonesMatch } from '../domain/geo';
import { nextOccurrence, planRoutes } from '../domain/routes';

const NOW = new Date(2026, 10, 26, 12, 0, 0).getTime(); // jueves

function customerWithRoute(alias: string, overrides: Partial<Parameters<typeof createCustomer>[0]>) {
  return createCustomer(
    {
      alias,
      consent: true,
      origin: 'Chapinero',
      destination: 'Usaquén',
      weekdays: [4],
      pickupTime: '13:30',
      returnTime: '18:00',
      ...overrides,
    },
    NOW,
  ) as CustomerRecord;
}

describe('plan de rutas predecibles', () => {
  it('calcula la próxima hora semanal', () => {
    const morning = new Date(2026, 10, 26, 8, 0, 0).getTime();
    expect(nextOccurrence('13:30', [4], morning)).toBe(
      new Date(2026, 10, 26, 13, 30, 0).getTime(),
    );
    expect(nextOccurrence('07:30', [4], morning)).toBe(
      new Date(2026, 11, 3, 7, 30, 0).getTime(),
    );
  });

  it('ordena por ventana, cercanía y coincidencia con el destino actual', () => {
    const laura = customerWithRoute('Laura', {
      originCoordText: '4.7110, -74.0721',
    });
    const andres = customerWithRoute('Andrés', {
      origin: 'Soacha',
      pickupTime: '14:00',
      originCoordText: '4.5800, -74.2100',
    });

    const items = planRoutes(
      [andres, laura],
      {
        myLocation: parseLatLon('4.7100, -74.0700'),
        passengerDestinationZone: 'Chapinero',
      },
      NOW,
    );

    expect(items).toHaveLength(2);
    expect(items[0].customer.alias).toBe('Laura');
    expect(items[0].status).toBe('window');
    expect(items[0].chainMatch).toBe(true);
    expect(items[0].distanceFromMeKm).not.toBeNull();
    expect(items[0].distanceFromMeKm!).toBeLessThan(1);
    expect(items[1].customer.alias).toBe('Andrés');
  });

  it('excluye consentimientos vencidos y clientes sin patrón', () => {
    const expired = {
      ...customerWithRoute('Vencido', {}),
      expiresAt: NOW - 1,
    };
    const noSchedule = createCustomer(
      { alias: 'Sin horario', consent: true, origin: 'Chapinero' },
      NOW,
    ) as CustomerRecord;
    expect(planRoutes([expired, noSchedule], {}, NOW)).toEqual([]);
  });

  it('compar distances y zonas con acentos', () => {
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(111.2, 0);
    expect(zonesMatch('Chapinero', 'casa en chapinero')).toBe(true);
    expect(zonesMatch('Usaquén', 'UsaQUEN')).toBe(true);
  });
});
