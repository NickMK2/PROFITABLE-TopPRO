import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import bundledJson from '../../catalog/apps-colombia-moto.v1.json';
import { parseCatalog, type AppCatalog } from '../domain/catalog';

const CATALOG_URL =
  'https://raw.githubusercontent.com/NickMK2/TopPRO/main/catalog/apps-colombia-moto.v1.json';
const CACHE_KEY = 'toppro.catalog.v1';
const TIMEOUT_MS = 12_000;

type CatalogSource = 'bundled' | 'cache' | 'remote';

interface CatalogCache {
  raw: string;
  fetchedAt: number;
}

interface CatalogContextValue {
  catalog: AppCatalog;
  source: CatalogSource;
  fetchedAt: number | null;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const bundled = parseCatalog(JSON.stringify(bundledJson));
if (!bundled) throw new Error('El catálogo incluido en la app no es válido');

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<AppCatalog>(bundled!);
  const [source, setSource] = useState<CatalogSource>('bundled');
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => controller?.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(CATALOG_URL, {
        headers: { Accept: 'application/json' },
        signal: controller?.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.text();
      const parsed = parseCatalog(raw);
      if (!parsed) throw new Error('JSON inválido o versión no soportada');
      const now = Date.now();
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ raw, fetchedAt: now }));
      setCatalog(parsed);
      setFetchedAt(now);
      setSource('remote');
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Error desconocido');
    } finally {
      clearTimeout(timer);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        try {
          const cache = JSON.parse(raw) as CatalogCache;
          const parsed = parseCatalog(cache.raw);
          if (parsed && typeof cache.fetchedAt === 'number') {
            setCatalog(parsed);
            setFetchedAt(cache.fetchedAt);
            setSource('cache');
          }
        } catch {
          // caché corrupta: se mantiene la copia incluida
        }
      })
      .catch(() => {})
      .then(() => {
        if (active) void refresh();
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ catalog, source, fetchedAt, refreshing, error, refresh }),
    [catalog, source, fetchedAt, refreshing, error, refresh],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog debe usarse dentro de CatalogProvider');
  return context;
}
