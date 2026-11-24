import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { computeOfferMetrics } from '../domain/offer';
import { computeStrategy } from '../domain/strategy';
import { defaultSettings } from '../domain/settings';
import type { Offer, OfferRecord, ShiftSettings, ShiftState } from '../domain/types';

const STORAGE_KEY = 'toppro.shift.v1';

type Action =
  | { type: 'hydrate'; state: ShiftState }
  | { type: 'settings'; patch: Partial<ShiftSettings> }
  | { type: 'earned'; value: number }
  | { type: 'offer'; offer: Offer }
  | { type: 'record'; id: string; accepted: boolean }
  | { type: 'reset' };

function initialState(): ShiftState {
  return { settings: defaultSettings(), earned: 0, history: [], arrivalTimes: [] };
}

function reducer(state: ShiftState, action: Action): ShiftState {
  switch (action.type) {
    case 'hydrate': {
      const incoming = action.state;
      const sameDay =
        new Date(incoming.settings.shiftStart).toDateString() === new Date().toDateString();
      return sameDay ? incoming : initialState();
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'earned':
      return { ...state, earned: Math.max(0, action.value) };
    case 'offer': {
      const offer = action.offer;
      const now = offer.receivedAt;
      const arrivalTimes = [...state.arrivalTimes, now].filter((t) => now - t <= 3_600_000);
      const observed = arrivalTimes.length;
      const offersPerHour = Math.min(
        60,
        Math.max(0, state.settings.offersPerHour * 0.7 + observed * 0.3),
      );
      const metrics = computeOfferMetrics(offer, state.settings.costPerKm);
      const record: OfferRecord = {
        id: offer.id,
        receivedAt: now,
        source: offer.source,
        fare: offer.fare,
        distanceKm: offer.distanceKm,
        durationMin: offer.durationMin,
        profit: metrics.profit,
        profitPerHour: metrics.profitPerHour,
        floor: computeStrategy(state.settings, state.earned, now).acceptFloor,
        accepted: false,
        raw: offer.raw,
      };
      return {
        ...state,
        arrivalTimes,
        history: [record, ...state.history].slice(0, 60),
        settings: { ...state.settings, offersPerHour },
      };
    }
    case 'record': {
      const record = state.history.find((item) => item.id === action.id);
      if (!record || record.accepted === action.accepted) return state;
      const history = state.history.map((item) =>
        item.id === action.id ? { ...item, accepted: action.accepted } : item,
      );
      return {
        ...state,
        history,
        earned: action.accepted ? state.earned + Math.max(0, record.profit) : state.earned,
      };
    }
    case 'reset':
      return { ...state, earned: 0, history: [], arrivalTimes: [] };
    default:
      return state;
  }
}

interface ShiftContextValue {
  state: ShiftState;
  dispatch: React.Dispatch<Action>;
  strategy: ReturnType<typeof computeStrategy>;
}

const ShiftContext = createContext<ShiftContextValue | null>(null);

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const hydrated = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            dispatch({ type: 'hydrate', state: JSON.parse(raw) as ShiftState });
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const strategy = useMemo(
    () => computeStrategy(state.settings, state.earned),
    [state.settings, state.earned],
  );
  const value = useMemo(() => ({ state, dispatch, strategy }), [state, strategy]);

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift(): ShiftContextValue {
  const context = useContext(ShiftContext);
  if (!context) throw new Error('useShift debe usarse dentro de ShiftProvider');
  return context;
}
