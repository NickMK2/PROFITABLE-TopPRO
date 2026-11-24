import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { evaluateOffer } from '../domain/decision';
import { formatMoney, formatRate } from '../domain/money';
import { ALL_SOURCES } from '../domain/settings';
import type { Offer, SourceId } from '../domain/types';
import { parseOfferText } from '../ingest/notificationParser';
import { useShift } from '../state/shiftStore';
import { Button, Card, Muted, NumberField, SectionTitle, TextField } from './components';
import type { Candidate } from './candidate';
import { colors } from './theme';

export function OfferScreen({
  candidate,
  onCandidate,
}: {
  candidate: Candidate | null;
  onCandidate: (candidate: Candidate | null) => void;
}) {
  const { state, dispatch, strategy } = useShift();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const offer = candidate?.offer ?? null;
  const decision = offer ? evaluateOffer(offer, state.settings, strategy) : null;
  const parsed = candidate?.parsed ?? null;

  function patchOffer(patch: Partial<Offer>) {
    if (!candidate) return;
    onCandidate({ ...candidate, offer: { ...candidate.offer, ...patch } });
  }

  function chooseSource(source: SourceId) {
    patchOffer({
      source,
      commissionRate: state.settings.commissionBySource[source] ?? 0.22,
    });
  }

  function analyzeText() {
    const parsed = parseOfferText(text, Date.now());
    if (!parsed.offer) {
      setError('No encontré una tarifa con $ o ARS. Pega el texto completo de la notificación.');
      return;
    }
    if (!state.settings.enabledSources.includes(parsed.source)) {
      setError(`La fuente "${parsed.source}" está desactivada en Ajustes.`);
      return;
    }
    parsed.offer.commissionRate = state.settings.commissionBySource[parsed.source] ?? 0.22;
    dispatch({ type: 'offer', offer: parsed.offer });
    onCandidate({ offer: parsed.offer, parsed, counted: true });
    setError('');
  }

  function finish(accepted: boolean) {
    if (!offer) return;
    dispatch({ type: 'record', id: offer.id, accepted });
    onCandidate(null);
  }

  if (!offer || !decision || !parsed) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Card>
          <SectionTitle>Analizar una oferta</SectionTitle>
          <Muted>
            Cuando llegue una notificación aparecerá acá sola. También podés pegar el texto para
            probar o corregir lo que se leyó mal.
          </Muted>
          <View style={styles.spacer} />
          <TextField
            label="Texto de la notificación"
            value={text}
            onChange={setText}
            placeholder="Ej: DiDi · Nuevo viaje $4.850 · 3,2 km · 12 min"
          />
          <Button title="Analizar texto" onPress={analyzeText} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Card>
        <Card>
          <SectionTitle>Ejemplo para probar</SectionTitle>
          <Muted>{'Uber · Solicitud de viaje · $6.200 · 4,5 km · 8 min recogida · 14 min viaje · expira en 15 s'}</Muted>
        </Card>
      </ScrollView>
    );
  }

  const acceptColor = decision.verdict === 'accept' ? colors.accent : colors.warning;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={[styles.verdictCard, { borderColor: acceptColor }]}>
        <Text style={styles.caption}>RECOMENDACIÓN</Text>
        <Text style={[styles.verdict, { color: acceptColor }]}>
          {decision.verdict === 'accept' ? 'ACEPTAR' : 'ESPERAR'}
        </Text>
        <Text style={styles.score}>
          {`${decision.score >= 0 ? '+' : ''}${formatRate(decision.score)} sobre el umbral`}
        </Text>
        {decision.notes.map((note, index) => (
          <Text key={index} style={styles.bullet}>
            {'• '}
            {note}
          </Text>
        ))}
      </Card>

      <Card>
        <SectionTitle>Datos de la oferta</SectionTitle>
        <NumberField
          label="Tarifa ($)"
          value={offer.fare}
          onChange={(value) => patchOffer({ fare: value })}
        />
        <NumberField
          label="Distancia total (km, incluye recogida)"
          value={offer.distanceKm}
          onChange={(value) => patchOffer({ distanceKm: value })}
        />
        <NumberField
          label="Tiempo total (min, incluye recogida)"
          value={offer.durationMin}
          onChange={(value) => patchOffer({ durationMin: value })}
        />
        <Text style={styles.fieldLabel}>Fuente</Text>
        <View style={styles.chips}>
          {ALL_SOURCES.map((source) => (
            <Button
              key={source}
              title={source}
              tone={offer.source === source ? 'success' : 'ghost'}
              onPress={() => chooseSource(source)}
            />
          ))}
        </View>
        {parsed.missing.length > 0 ? (
          <Muted>{`No se pudieron leer: ${parsed.missing.join(', ')}. Corregí los campos arriba.`}</Muted>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Números</SectionTitle>
        <View style={styles.row}>
          <Text style={styles.label}>Comisión</Text>
          <Text style={styles.value}>{`-${formatMoney(decision.metrics.commission)}`}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Costo variable</Text>
          <Text style={styles.value}>{`-${formatMoney(decision.metrics.variableCost)}`}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ganancia neta</Text>
          <Text style={[styles.value, { color: colors.accent }]}>
            {formatMoney(decision.metrics.profit)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ganancia por hora</Text>
          <Text style={[styles.value, { color: acceptColor }]}>
            {formatRate(decision.metrics.profitPerHour)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Umbral actual</Text>
          <Text style={styles.value}>{formatRate(strategy.acceptFloor)}</Text>
        </View>
      </Card>

      <Button title="Acepté esta carrera" tone="success" onPress={() => finish(true)} />
      <Button title="La rechacé" tone="ghost" onPress={() => finish(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  verdictCard: { alignItems: 'center', paddingVertical: 22 },
  caption: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  verdict: { fontSize: 32, fontWeight: '800', marginVertical: 6 },
  score: { color: colors.text, fontSize: 14, marginBottom: 14 },
  bullet: { color: colors.text, fontSize: 13, lineHeight: 20, alignSelf: 'flex-start' },
  spacer: { height: 10 },
  error: { color: colors.danger, fontSize: 13, marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  fieldLabel: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: colors.muted, fontSize: 14 },
  value: { color: colors.text, fontSize: 14, fontWeight: '600' },
});
