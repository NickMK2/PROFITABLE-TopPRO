import { describe, expect, it } from 'vitest';
import bundled from '../../catalog/public-flows-colombia.v1.json';
import { currentOrNextWindow, parsePublicFlows, rankFlows } from '../domain/publicFlows';

const raw = JSON.stringify(bundled);
const THURSDAY_MORNING = new Date(2026, 10, 26, 7, 30, 0).getTime();
const THURSDAY_MIDDAY = new Date(2026, 10, 26, 14, 0, 0).getTime();

describe('señales públicas', () => {
  it('valida el catálogo incluido', () => {
    const catalog = parsePublicFlows(raw);
    expect(catalog).not.toBeNull();
    expect(catalog?.version).toBe(1);
    expect(catalog?.city).toBe('Bogotá');
    expect(catalog?.signals.length).toBeGreaterThan(0);
  });

  it('rechaza JSON inválido y versión desconocida', () => {
    expect(parsePublicFlows('{')).toBeNull();
    expect(parsePublicFlows(JSON.stringify({ ...bundled, version: 2 }))).toBeNull();
  });

  it('detecta la ventana activa y la próxima', () => {
    const catalog = parsePublicFlows(raw)!;
    const health = catalog.signals.find((signal) => signal.id === 'secretaria-distrital-salud')!;

    const active = currentOrNextWindow(health, THURSDAY_MORNING);
    expect(active?.active).toBe(true);
    expect(active?.label).toBe('Llegada a trámites');

    const next = currentOrNextWindow(health, THURSDAY_MIDDAY);
    expect(next?.active).toBe(false);
    expect(next?.label).toBe('Salida');
    expect(new Date(next!.startAt).getHours()).toBe(15);
    expect(new Date(next!.startAt).getMinutes()).toBe(30);
  });

  it('ordena por zona del conductor', () => {
    const catalog = parsePublicFlows(raw)!;
    const ranked = rankFlows(catalog.signals, 'Carrera 32No 12-81', THURSDAY_MORNING);
    expect(ranked[0].zoneMatch).toBe(true);
    expect(ranked[0].flow.id).toBe('secretaria-distrital-salud');
    expect(ranked[0].status).toBe('active');
  });
});
