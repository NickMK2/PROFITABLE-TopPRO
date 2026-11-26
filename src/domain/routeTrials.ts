export type TrialKind = 'cliente' | 'señal pública';
export type TrialVerdict = 'favorable' | 'sin-resultados' | 'insuficiente';

export interface RouteSuggestion {
  id: string;
  title: string;
  zone: string;
  windowLabel: string;
  reason: string;
  kind: TrialKind;
}

export interface RouteTrialDay {
  id: string;
  date: string;
  trips: number;
  fareTotal: number;
  deadKm: number;
  minutes: number;
  note?: string;
}

export interface TrialSummary {
  daysLogged: number;
  trips: number;
  fareTotal: number;
  deadKm: number;
  minutes: number;
  netEstimate: number;
  netPerHour: number;
}

export interface RouteTrial {
  id: string;
  suggestionId?: string;
  createdAt: number;
  endsAt: number;
  title: string;
  zone: string;
  windowLabel: string;
  kind: TrialKind;
  days: RouteTrialDay[];
  summary?: TrialSummary;
  verdict?: TrialVerdict;
  validatedAt?: number;
}

export interface ValidateOptions {
  costPerKm: number;
  commissionRate: number;
  minNetPerHour: number;
  now?: number;
}

const TRIAL_DAYS = 7;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberOr(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function createRouteTrial(suggestion: RouteSuggestion, now: number = Date.now()): RouteTrial {
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    suggestionId: suggestion.id,
    createdAt: now,
    endsAt: now + TRIAL_DAYS * 24 * 3_600_000,
    title: suggestion.title,
    zone: suggestion.zone,
    windowLabel: suggestion.windowLabel,
    kind: suggestion.kind,
    days: [],
  };
}

export function addTrialDay(
  trial: RouteTrial,
  day: Omit<RouteTrialDay, 'id'>,
  now: number = Date.now(),
): RouteTrial {
  const entry: RouteTrialDay = {
    ...day,
    id: `${day.date}-${now}`,
  };
  const days = [...trial.days.filter((item) => item.date !== day.date), entry].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return { ...trial, days, verdict: undefined, validatedAt: undefined, summary: undefined };
}

/**
 * Regla simple y explicable: al menos 3 días registrados, 5 viajes y
 * ganancia neta estimada por hora >= el mínimo $/h configurado.
 */
export function validateRouteTrial(trial: RouteTrial, options: ValidateOptions): RouteTrial {
  const now = options.now ?? Date.now();
  const summary: TrialSummary = trial.days.reduce(
    (total, day) => {
      const gross = Math.max(0, day.fareTotal) * (1 - Math.max(0, Math.min(0.9, options.commissionRate)));
      const net = gross - Math.max(0, day.deadKm) * Math.max(0, options.costPerKm);
      const minutes = Math.max(0, day.minutes);
      return {
        daysLogged: total.daysLogged + 1,
        trips: total.trips + Math.max(0, day.trips),
        fareTotal: total.fareTotal + Math.max(0, day.fareTotal),
        deadKm: total.deadKm + Math.max(0, day.deadKm),
        minutes: total.minutes + minutes,
        netEstimate: total.netEstimate + net,
        netPerHour: 0,
      };
    },
    {
      daysLogged: 0,
      trips: 0,
      fareTotal: 0,
      deadKm: 0,
      minutes: 0,
      netEstimate: 0,
      netPerHour: 0,
    },
  );
  summary.netPerHour = summary.minutes > 0 ? summary.netEstimate / (summary.minutes / 60) : 0;

  const completed = now >= trial.endsAt;
  const favorable =
    summary.daysLogged >= 3 &&
    summary.trips >= 5 &&
    summary.netPerHour >= options.minNetPerHour;

  const verdict: TrialVerdict = favorable
    ? 'favorable'
    : completed
      ? 'sin-resultados'
      : 'insuficiente';

  return { ...trial, summary, verdict, validatedAt: now };
}

export function normalizeTrial(raw: unknown): RouteTrial | null {
  if (!isRecord(raw) || typeof raw.title !== 'string') return null;
  const days = Array.isArray(raw.days)
    ? raw.days
        .filter(isRecord)
        .filter((day) => typeof day.date === 'string')
        .map((day) => ({
          id: typeof day.id === 'string' ? day.id : `${day.date}-0`,
          date: day.date as string,
          trips: numberOr(day.trips),
          fareTotal: numberOr(day.fareTotal),
          deadKm: numberOr(day.deadKm),
          minutes: numberOr(day.minutes),
          note: typeof day.note === 'string' ? day.note : undefined,
        }))
    : [];
  const summary = isRecord(raw.summary)
    ? {
        daysLogged: numberOr(raw.summary.daysLogged),
        trips: numberOr(raw.summary.trips),
        fareTotal: numberOr(raw.summary.fareTotal),
        deadKm: numberOr(raw.summary.deadKm),
        minutes: numberOr(raw.summary.minutes),
        netEstimate: numberOr(raw.summary.netEstimate),
        netPerHour: numberOr(raw.summary.netPerHour),
      }
    : undefined;
  const verdict =
    raw.verdict === 'favorable' || raw.verdict === 'sin-resultados' || raw.verdict === 'insuficiente'
      ? raw.verdict
      : undefined;

  return {
    id: typeof raw.id === 'string' ? raw.id : `${Date.now()}-normalizado`,
    suggestionId: typeof raw.suggestionId === 'string' ? raw.suggestionId : undefined,
    createdAt: numberOr(raw.createdAt, Date.now()),
    endsAt: numberOr(raw.endsAt, Date.now() + TRIAL_DAYS * 24 * 3_600_000),
    title: raw.title,
    zone: typeof raw.zone === 'string' ? raw.zone : '',
    windowLabel: typeof raw.windowLabel === 'string' ? raw.windowLabel : '',
    kind: raw.kind === 'señal pública' ? 'señal pública' : 'cliente',
    days,
    summary,
    verdict,
    validatedAt: typeof raw.validatedAt === 'number' ? raw.validatedAt : undefined,
  };
}
