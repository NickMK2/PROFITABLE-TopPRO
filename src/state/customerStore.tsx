import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { normalizeCustomer, type CustomerRecord } from '../domain/customers';

const STORAGE_KEY = 'toppro.customers.v1';

export type CustomerAction =
  | { type: 'hydrate'; customers: CustomerRecord[] }
  | { type: 'add'; customer: CustomerRecord }
  | { type: 'renew'; id: string; customer: CustomerRecord }
  | { type: 'remove'; id: string };

function reducer(state: CustomerRecord[], action: CustomerAction): CustomerRecord[] {
  switch (action.type) {
    case 'hydrate':
      return Array.isArray(action.customers) ? action.customers : [];
    case 'add':
      return [action.customer, ...state];
    case 'renew':
      return state.map((item) => (item.id === action.id ? action.customer : item));
    case 'remove':
      return state.filter((item) => item.id !== action.id);
    default:
      return state;
  }
}

interface CustomersContextValue {
  customers: CustomerRecord[];
  dispatch: React.Dispatch<CustomerAction>;
}

const CustomersContext = createContext<CustomersContextValue | null>(null);

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  const [customers, dispatch] = useReducer(reducer, [] as CustomerRecord[]);
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
                customers: parsed
                  .map(normalizeCustomer)
                  .filter((item): item is CustomerRecord => item !== null),
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customers)).catch(() => {});
  }, [customers]);

  const value = useMemo(() => ({ customers, dispatch }), [customers]);
  return <CustomersContext.Provider value={value}>{children}</CustomersContext.Provider>;
}

export function useCustomers(): CustomersContextValue {
  const context = useContext(CustomersContext);
  if (!context) throw new Error('useCustomers debe usarse dentro de CustomersProvider');
  return context;
}
