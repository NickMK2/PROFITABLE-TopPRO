import { describe, expect, it } from 'vitest';
import { parseOfferText } from '../ingest/notificationParser';
import { redactNotificationText } from '../ingest/redact';

describe('redacción de notificaciones', () => {
  it('quita correo, teléfono, placa y números largos sin romper la tarifa', () => {
    const raw =
      'DiDi · Laura juan@correo.com · 300 123 4567 · ABC123 · $6.200 · 4,5 km · 22 min · ID 12345678';
    const safe = redactNotificationText(raw);

    expect(safe).not.toContain('juan@correo.com');
    expect(safe).not.toContain('300 123 4567');
    expect(safe).not.toContain('ABC123');
    expect(safe).not.toContain('12345678');
    expect(safe).toContain('[correo]');
    expect(safe).toContain('[teléfono]');
    expect(safe).toContain('[placa]');

    const parsed = parseOfferText(safe, 1000);
    expect(parsed.offer?.fare).toBe(6200);
    expect(parsed.offer?.distanceKm).toBe(4.5);
    expect(parsed.offer?.durationMin).toBe(22);
    expect(parsed.offer?.raw).not.toContain('juan@correo.com');
  });
});
