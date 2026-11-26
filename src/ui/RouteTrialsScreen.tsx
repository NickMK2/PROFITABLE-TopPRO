import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '../domain/money';
import { rankFlows } from '../domain/publicFlows';
import { suggestRoutes } from '../domain/routeSuggestions';
import {
  addTrialDay,
  createRouteTrial,
  validateRouteTrial,
  type RouteSuggestion,
  type RouteTrial,
  type TrialVerdict,
} from '../domain/routeTrials';
import { planRoutes } from '../domain/routes';
import { parseNumber } from '../ingest/numbers';
import { useCustomers } from '../state/customerStore';
import { usePublicFlows } from '../state/publicFlowsStore';
import { useRouteTrials } from '../state/routeTrialStore';
import { useShift } from '../state/shiftStore';
import { Button, Card, Muted, SectionTitle, TextField } from './components';
import { colors } from './theme';

const VERDICT_LABEL: Record<TrialVerdict, string> = {
  favorable: 'FAVORABLE',
  'sin-resultados': 'SIN RESULTADOS',
  insuficiente: 'INSUFICIENTE',
};

const VERDICT_ADVICE: Record<TrialVerdict, string> = {
  favorable: 'La ruta cumplió la meta. Podés repetirla en la misma franja.',
  'sin-resultados': 'Después de 7 días no alcanzó la meta. Probá otra zona u horario.',
  insuficiente: 'Todavía faltan días o datos. Seguí registrando antes de decidir.',
};

interface DayForm {
  date: string;
  trips: string;
  fare: string;
  deadKm: string;
  minutes: string;
  note: string;
}

function localDateISO(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function emptyForm(): DayForm {
  return { date: localDateISO(), trips: '1', fare: '', deadKm: '', minutes: '60', note: '' };
}

function formFromTrial(trial: RouteTrial): DayForm {
  const existing = trial.days.find((day) => day.date === localDateISO());
  if (!existing) return emptyForm();
  return {
    date: existing.date,
    trips: String(existing.trips),
    fare: String(existing.fareTotal),
    deadKm: String(existing.deadKm),
    minutes: String(existing.minutes),
    note: existing.note ?? '',
  };
}

function safeNumber(raw: string): number {
  const value = parseNumber(raw);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function verdictColor(verdict: TrialVerdict): string {
  if (verdict === 'favorable') return colors.accent;
  if (verdict === 'sin-resultados') return colors.danger;
  return colors.warning;
}

function daysLeft(trial: RouteTrial, now: number): number {
  return Math.max(0, Math.ceil((trial.endsAt - now) / 86_400_000));
}

export function RouteTrialsScreen({ onOpenRoutes }: { onOpenRoutes: () => void }) {
  const { customers } = useCustomers();
  const publicFlows = usePublicFlows();
  const { trials, dispatch } = useRouteTrials();
  const { state } = useShift();
  const settings = state.settings;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState<DayForm>(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const now = Date.now();
  const suggestions: RouteSuggestion[] = suggestRoutes(
    planRoutes(customers, {}, now),
    rankFlows(publicFlows.catalog.signals, '', now),
    4,
  );

  const activeCommissions = settings.enabledSources.map(
    (source) => settings.commissionBySource[source] ?? 0,
  );
  const commissionRate = activeCommissions.length
    ? activeCommissions.reduce((total, value) => total + value, 0) / activeCommissions.length
    : 0;

  function patchForm(patch: Partial<DayForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function startTrial(suggestion: RouteSuggestion) {
    const trial = createRouteTrial(suggestion, Date.now());
    dispatch({ type: 'add', trial });
    setActiveId(trial.id);
    setForm(emptyForm());
  }

  function saveDay(trial: RouteTrial) {
    dispatch({
      type: 'update',
      trial: addTrialDay(trial, {
        date: form.date.trim() || localDateISO(),
        trips: safeNumber(form.trips),
        fareTotal: safeNumber(form.fare),
        deadKm: safeNumber(form.deadKm),
        minutes: safeNumber(form.minutes),
        note: form.note.trim() || undefined,
      }),
    });
    setActiveId(null);
  }

  function validate(trial: RouteTrial) {
    dispatch({
      type: 'update',
      trial: validateRouteTrial(trial, {
        costPerKm: settings.costPerKm,
        commissionRate,
        minNetPerHour: settings.reserveRate,
      }),
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <SectionTitle>Probar y validar una ruta</SectionTitle>
        <Muted>
          La app propone una ruta a partir de tus clientes con consentimiento y de las señales
          públicas. La seguís 7 días, registrás viajes, tarifa, kilómetros muertos y tiempo, y al
          final te dice si fue favorable o si no hubo resultados. Vos siempre decidís aceptar cada
          carrera en la app de trabajo.
        </Muted>
        <View style={styles.spacer} />
        <Button title="Ver plan de rutas" onPress={onOpenRoutes} tone="ghost" />
      </Card>

      <Card>
        <SectionTitle>Sugerencias de hoy</SectionTitle>
        {suggestions.length === 0 ? (
          <Muted>
            No hay sugerencias todavía. Cargá clientes con día y hora, o esperá a que se actualicen
            las señales públicas en la pestaña Rutas.
          </Muted>
        ) : null}
        {suggestions.map((suggestion) => {
          const inProgress = trials.some(
            (trial) =>
              trial.suggestionId === suggestion.id && trial.endsAt > now && !trial.verdict,
          );
          return (
            <View key={suggestion.id} style={styles.suggestion}>
              <Text style={styles.name}>{suggestion.title}</Text>
              <Text style={styles.meta}>
                {suggestion.kind} · {suggestion.zone || 'Zona sin definir'}
              </Text>
              <Text style={styles.line}>Franja: {suggestion.windowLabel}</Text>
              <Text style={styles.line}>{suggestion.reason}</Text>
              <View style={styles.spacer} />
              <Button
                title={inProgress ? 'Prueba en curso' : 'Probar 7 días'}
                onPress={() => startTrial(suggestion)}
                disabled={inProgress}
                tone={inProgress ? 'ghost' : 'success'}
              />
            </View>
          );
        })}
      </Card>

      <Card>
        <SectionTitle>Reglas de la validación</SectionTitle>
        <Muted>
          favorable = al menos 3 días registrados, 5 viajes y ganancia neta estimada ≥{' '}
          {formatMoney(settings.reserveRate)}/h. Si se cumplen los 7 días sin llegar a ese valor, el
          veredicto es sin resultados; antes, el estado es insuficiente.
        </Muted>
        <Text style={styles.meta}>
          Comisión usada: {(commissionRate * 100).toFixed(0)} % (promedio de fuentes activas) · costo
          por km: {formatMoney(settings.costPerKm)}
        </Text>
        <Muted>Ajustá ambos valores en Ajustes antes de validar.</Muted>
      </Card>

      {trials.length === 0 ? (
        <Card>
          <Muted>Todavía no hay rutas en prueba. Elegí una sugerencia de arriba.</Muted>
        </Card>
      ) : null}

      {trials.map((trial) => (
        <Card key={trial.id}>
          <View style={styles.row}>
            <Text style={styles.name}>{trial.title}</Text>
            {trial.verdict ? (
              <Text style={[styles.status, { color: verdictColor(trial.verdict) }]}>
                {VERDICT_LABEL[trial.verdict]}
              </Text>
            ) : (
              <Text style={[styles.status, { color: colors.info }]}>
                {daysLeft(trial, now)} DÍAS
              </Text>
            )}
          </View>
          <Text style={styles.meta}>
            {trial.kind} · {trial.zone || 'Zona sin definir'} · {trial.windowLabel}
          </Text>
          <Text style={styles.line}>
            Inicio {new Date(trial.createdAt).toLocaleDateString('es-CO')} · fin{' '}
            {new Date(trial.endsAt).toLocaleDateString('es-CO')}
          </Text>

          {trial.summary ? (
            <View style={styles.summary}>
              <Text style={styles.line}>
                Días: {trial.summary.daysLogged} · viajes: {trial.summary.trips} ·tarifa:{' '}
                {formatMoney(trial.summary.fareTotal)}
              </Text>
              <Text style={styles.line}>
                Km muertos: {trial.summary.deadKm.toFixed(1)} · neto estimado:{' '}
                {formatMoney(trial.summary.netEstimate)} · {formatMoney(trial.summary.netPerHour)}/h
              </Text>
              {trial.verdict ? (
                <Text style={[styles.advice, { color: verdictColor(trial.verdict) }]}>
                  {VERDICT_ADVICE[trial.verdict]}
                </Text>
              ) : null}
            </View>
          ) : null}

          {trial.days.length > 0 ? (
            <View style={styles.summary}>
              <Text style={styles.subtitle}>Días registrados</Text>
              {trial.days.map((day) => (
                <Text key={day.id} style={styles.line}>
                  {day.date} · {day.trips} viajes · {formatMoney(day.fareTotal)} · {day.deadKm} km
                  muertos · {day.minutes} min{day.note ? ` · ${day.note}` : ''}
                </Text>
              ))}
            </View>
          ) : null}

          {activeId === trial.id ? (
            <View style={styles.form}>
              <TextField
                label="Fecha (AAAA-MM-DD)"
                value={form.date}
                onChange={(value) => patchForm({ date: value })}
              />
              <TextField
                label="Viajes aceptados"
                value={form.trips}
                onChange={(value) => patchForm({ trips: value })}
              />
              <TextField
                label="Tarifa total del día ($)"
                value={form.fare}
                onChange={(value) => patchForm({ fare: value })}
              />
              <TextField
                label="Km sin pasajero (muertos)"
                value={form.deadKm}
                onChange={(value) => patchForm({ deadKm: value })}
              />
              <TextField
                label="Minutos de la jornada en esa ruta"
                value={form.minutes}
                onChange={(value) => patchForm({ minutes: value })}
              />
              <TextField
                label="Nota (opcional)"
                value={form.note}
                onChange={(value) => patchForm({ note: value })}
              />
              <View style={styles.actions}>
                <Button title="Guardar día" onPress={() => saveDay(trial)} />
                <Button
                  title="Cancelar"
                  tone="ghost"
                  onPress={() => setActiveId(null)}
                />
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <Button
                title="Registrar día"
                onPress={() => {
                  setActiveId(trial.id);
                  setForm(formFromTrial(trial));
                }}
              />
              <Button title="Validar ahora" tone="ghost" onPress={() => validate(trial)} />
            </View>
          )}

          <View style={styles.spacer} />
          <Button
            title={confirmDeleteId === trial.id ? 'Confirmar borrado' : 'Borrar prueba'}
            tone={confirmDeleteId === trial.id ? 'danger' : 'ghost'}
            onPress={() => {
              if (confirmDeleteId === trial.id) {
                dispatch({ type: 'remove', id: trial.id });
                setConfirmDeleteId(null);
                if (activeId === trial.id) setActiveId(null);
              } else {
                setConfirmDeleteId(trial.id);
              }
            }}
          />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  spacer: { height: 10 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  status: { fontSize: 11, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 },
  line: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  subtitle: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  advice: { fontSize: 13, fontWeight: '700', marginTop: 6, lineHeight: 19 },
  suggestion: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 12,
  },
  summary: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  form: { marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
