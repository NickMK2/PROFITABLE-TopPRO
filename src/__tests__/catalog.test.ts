import { describe, expect, it } from 'vitest';
import bundled from '../../catalog/apps-colombia-moto.v1.json';
import { parseCatalog } from '../domain/catalog';

describe('parseCatalog', () => {
  const raw = JSON.stringify(bundled);

  it('acepta el catálogo versionado incluido en el repo', () => {
    const catalog = parseCatalog(raw);
    expect(catalog).not.toBeNull();
    expect(catalog?.version).toBe(1);
    expect(catalog?.country).toBe('CO');
    expect(catalog?.focus).toBe('moto');
    expect(catalog?.apps.length).toBeGreaterThan(0);
  });

  it('rechaza JSON inválido o versión desconocida', () => {
    expect(parseCatalog('{')).toBeNull();
    expect(parseCatalog(JSON.stringify({ ...bundled, version: 2 }))).toBeNull();
  });

  it('rechaza una entrada con comisión fuera de rango', () => {
    const invalid = {
      ...bundled,
      apps: [{ ...bundled.apps[0], commissionRate: 1.5 }],
    };
    expect(parseCatalog(JSON.stringify(invalid))).toBeNull();
  });

  it('admite comisión nula cuando la app no publica un porcentaje', () => {
    const catalog = parseCatalog(raw);
    const didi = catalog?.apps.find((app) => app.id === 'didi-moto');
    expect(didi?.commissionRate).toBeNull();
    expect(didi?.commissionVerified).toBe(false);
  });
});
