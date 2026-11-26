import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { normalizeTrial, type RouteTrial } from '../domain/routeTrials';

const STORAGE_KEY = 'toppro.route-trials.v1';

export type RouteTrialAction =
  | { type: 'hydrate'; trials: RouteTrial[] }
  | { type: 'add'; trial: RouteTrial }
  | { type: 'update'; trial: RouteTrial }
  | { type: 'remove'; id: string };

function reducer(state: RouteTrial[], action: RouteTrialAction): RouteTrial[] {
  switch (action.type) {
    case 'hydrate':
      return Array.isArray(action.trials) ? action.trials : [];
    case 'add':
      return [action.trial, ...state];
    case 'update':
      return state.map((item) => (item.id === action.trial.id ? action.trial : item));
    case 'remove':
      return state.filter((item) => item.id !== action.id);
    default:
      return state;
  }
}

interface RouteTrialsContextValue {
  trials: RouteTrial[];
  dispatch: React.Dispatch<RouteTrialAction>;
}

const RouteTrialsContext = createContext<RouteTrialsContextValue | null>(null);

export function RouteTrialsProvider({ children }: { children: React.ReactNode }) {
  const [trials, dispatch] = useReducer(reducer, [] as RouteTrial[]);
  const hydrated = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              dispatch({
                type: 'hydrate',
                trials: parsed
                  .map(normalizeTrial)
                  .filter((item): item is RouteTrial => item !== null),
              });
            }
          } catch {
            // datos corruptos: se ignoran
          }
        }
        hydrated.current = true;
      })
      .catch(() => {
        hydrated.current = true;
      });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trials)).catch(() => {});
  }, [trials]);

  const value = useMemo(() => ({ trials, dispatch }), [trials]);
  return <RouteTrialsContext.Provider value={value}>{children}</RouteTrialsContext.Provider>;
}

export function useRouteTrials(): RouteTrialsContextValue {
  const context = useContext(RouteTrialsContext);
  if (!context) throw new Error('useRouteTrials debe usarse dentro de RouteTrialsProvider');
  return context;
}
