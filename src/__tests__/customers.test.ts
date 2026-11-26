import { describe, expect, it } from 'vitest';
import {
  createCustomer,
  isConsentActive,
  normalizeCustomer,
  renewConsent,
  type CustomerRecord,
} from '../domain/customers';

const NOW = new Date(2026, 10, 26, 12, 0, 0).getTime();

describe('clientes frecuentes', () => {
  it('exige alias y consentimiento explícito', () => {
    expect(
      createCustomer({ alias: '  ', consent: true }, NOW),
    ).toBeNull();
    expect(createCustomer({ alias: 'Laura', consent: false }, NOW)).toBeNull();
  });

  it('guarda ruta, patrón semanal y coordenadas opcionales', () => {
    const customer = createCustomer(
      {
        alias: '  Vecina Laura  ',
        phone: ' 300 123 4567 ',
        consent: true,
        origin: ' Chapinero ',
        destination: 'Usaquén',
        weekdays: [1, 3, 1],
        pickupTime: '7:30',
        returnTime: '17:00',
        originCoordText: '4.7110, -74.0721',
      },
      NOW,
    );

    expect(customer).not.toBeNull();
    expect(customer?.alias).toBe('Vecina Laura');
    expect(customer?.weekdays).toEqual([1, 3]);
    expect(customer?.pickupTime).toBe('07:30');
    expect(customer?.originCoord).toEqual({ lat: 4.711, lon: -74.0721 });
    expect(isConsentActive(customer!, NOW)).toBe(true);
  });

  it('vence el consentimiento y permite renovarlo', () => {
    const customer = createCustomer({ alias: 'Andrés', consent: true }, NOW);
    expect(isConsentActive(customer!, customer!.expiresAt + 1)).toBe(false);
    const renewed = renewConsent(customer!, customer!.expiresAt + 1);
    expect(isConsentActive(renewed, renewed.expiresAt - 1)).toBe(true);
  });

  it('normaliza registros antiguos sin campos de ruta', () => {
    const old = { alias: 'María', consentAt: NOW, expiresAt: NOW + 1000, createdAt: NOW };
    const normalized = normalizeCustomer(old);
    expect(normalized?.weekdays).toEqual([]);
    expect(normalized?.pickupTime).toBeUndefined();
    expect(normalizeCustomer({ alias: 42 })).toBeNull();
  });

  it('ignora coordenadas fuera de rango', () => {
    const customer = createCustomer(
      { alias: 'Mal coord', consent: true, originCoordText: '95.0000, -200.0000' },
      NOW,
    ) as CustomerRecord;
    expect(customer.originCoord).toBeUndefined();
  });
});
