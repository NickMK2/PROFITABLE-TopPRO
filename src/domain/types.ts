export type SourceId = 'didi' | 'uber' | 'cabify' | 'bolt' | 'yango' | 'other';

/** Una oferta ya normalizada, sin importar de qué app vino. */
export interface Offer {
  id: string;
  source: SourceId;
  receivedAt: number;
  /** Tarifa anunciada, antes de comisión. */
  fare: number;
  /** Distancia total estimada desde que aceptas hasta dejar al pasajero (incluye traslado a recoger). */
  distanceKm: number;
  /** Tiempo total estimado en minutos (incluye traslado a recoger). */
  durationMin: number;
  commissionRate: number;
  expiresInSec?: number;
  raw?: string;
}

export interface OfferMetrics {
  grossFare: number;
  commission: number;
  netFare: number;
  variableCost: number;
  /** Ganancia después de comisión y costo variable (combustible/depreciación). */
  profit: number;
  profitPerHour: number;
  grossPerHour: number;
  profitPerKm: number;
}

export interface ShiftSettings {
  /** Meta de ganancia neta del día. */
  goal: number;
  /** Marcas de tiempo (epoch ms) de inicio y fin de jornada. */
  shiftStart: number;
  shiftEnd: number;
  /** Mínimo $/h de ganancia que aceptas en condiciones normales. */
  reserveRate: number;
  /** Nunca aceptar por debajo de esto (debe cubrir costos). */
  hardFloorRate: number;
  /** Fracción del tiempo restante que se espera estar efectivamente cobrando. */
  utilization: number;
  /** Demanda observada (ofertas por hora, calculado con las últimas llegadas). */
  offersPerHour: number;
  /** Demanda de referencia: por encima de esto podemos exigir más. */
  referenceOffersPerHour: number;
  /** Costo variable por km (combustible + depreciación + mantenimiento). */
  costPerKm: number;
  commissionBySource: Record<SourceId, number>;
  enabledSources: SourceId[];
}

export interface OfferRecord {
  id: string;
  receivedAt: number;
  source: SourceId;
  fare: number;
  distanceKm: number;
  durationMin: number;
  profit: number;
  profitPerHour: number;
  floor: number;
  accepted: boolean;
  raw?: string;
}

export interface ShiftState {
  settings: ShiftSettings;
  earned: number;
  history: OfferRecord[];
  /** Timestamps de ofertas recibidas, para estimar demanda. */
  arrivalTimes: number[];
}

export type ShiftMode = 'normal' | 'urge' | 'survival';

export interface Strategy {
  /** $/h que necesitas para llegar a la meta. */
  requiredRate: number;
  /** $/h mínimo para aceptar AHORA (ya incluye demanda y urgencia). */
  acceptFloor: number;
  demandFactor: number;
  urgencyFactor: number;
  progressRatio: number;
  remainingHours: number;
  remainingGoal: number;
  mode: ShiftMode;
  reasons: string[];
}

export interface Decision {
  verdict: 'accept' | 'wait';
  /** Diferencia entre la rentabilidad de la oferta y el umbral. */
  score: number;
  metrics: OfferMetrics;
  floor: number;
  notes: string[];
}
