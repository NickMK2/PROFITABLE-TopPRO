import { describe, expect, it } from 'vitest';
import { parseNumber } from '../ingest/numbers';
import { parseOfferText } from '../ingest/notificationParser';

describe('parseNumber', () => {
  it('maneja separadores latinos', () => {
    expect(parseNumber('4850')).toBe(4850);
    expect(parseNumber('4.850')).toBe(4850);
    expect(parseNumber('4.850,50')).toBe(4850.5);
    expect(parseNumber('1,5')).toBe(1.5);
    expect(parseNumber('1.234.567')).toBe(1234567);
  });
});

describe('parseOfferText', () => {
  it('lee una oferta de DiDi', () => {
    const parsed = parseOfferText('DiDi · Nuevo viaje $4.850 · 3,2 km · 12 min', 1_000);
    expect(parsed.source).toBe('didi');
    expect(parsed.offer?.fare).toBe(4850);
    expect(parsed.offer?.distanceKm).toBe(3.2);
    expect(parsed.offer?.durationMin).toBe(12);
    expect(parsed.missing).toEqual([]);
  });

  it('suma recogida + viaje y lee el vencimiento', () => {
    const parsed = parseOfferText(
      'Uber · Solicitud · $6.200 · 4,5 km · 8 min recogida · 14 min viaje · expira en 15 s',
      1_000,
    );
    expect(parsed.offer?.durationMin).toBe(22);
    expect(parsed.offer?.expiresInSec).toBe(15);
    expect(parsed.source).toBe('uber');
  });

  it('reconoce apps de entregas del catálogo', () => {
    expect(parseOfferText('Soy Rappi · Pedido $9.800 · 2 km · 18 min', 1_000).source).toBe(
      'rappi',
    );
    expect(parseOfferText('Glovo · Nuevo pedido $8.500 · 1,8 km · 15 min', 1_000).source).toBe(
      'glovo',
    );
    expect(
      parseOfferText('PedidosYa · Pedido $7.200 · 2,4 km · 16 min', 1_000).source,
    ).toBe('pedidosya');
  });

  it('marca campos faltantes', () => {
    const parsed = parseOfferText('DiDi · Tenés una nueva solicitud', 1_000);
    expect(parsed.offer).toBeNull();
    expect(parsed.missing).toContain('tarifa');
  });
});
