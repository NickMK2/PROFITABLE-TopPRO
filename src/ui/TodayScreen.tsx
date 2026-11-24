import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatClock, formatMoney, formatRate } from '../domain/money';
import type { ShiftMode } from '../domain/types';
import { useShift } from '../state/shiftStore';
import { Button, Card, Muted, SectionTitle } from './components';
import { colors, radius } from './theme';

const MODE_LABEL: Record<ShiftMode, string> = {
  normal: 'RITMO NORMAL',
  urge: 'RITMO APURADO',
  survival: 'SUPERVIVENCIA',
};

const MODE_COLOR: Record<ShiftMode, string> = {
  normal: colors.accent,
  urge: colors.warning,
  survival: colors.danger,
};

export function TodayScreen({ onSimulate }: { onSimulate: () => void }) {
  const { state, strategy } = useShift();
  const { goal } = state.settings;
  const progress = goal > 0 ? Math.min(1, state.earned / goal) : 0;
  const modeColor = MODE_COLOR[strategy.mode];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={[styles.hero, { borderColor: modeColor }]}>
        <Text style={styles.caption}>UMBRAL PARA ACEPTAR</Text>
        <Text style={[styles.heroValue, { color: modeColor }]}>
          {formatRate(strategy.acceptFloor)}
        </Text>
        <Text style={[styles.modeBadge, { color: modeColor, borderColor: modeColor }]}>
          {MODE_LABEL[strategy.mode]}
        </Text>
        <Muted>Ganancia neta por hora mínima en este momento del día.</Muted>
      </Card>

      <Card>
        <View style={styles.row}>
          <Text style={styles.label}>Ganado hoy</Text>
          <Text style={styles.value}>{formatMoney(state.earned)}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.row}>
          <Muted>{`${Math.round(progress * 100)}% de la meta`}</Muted>
          <Muted>{`Meta ${formatMoney(goal)}`}</Muted>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Falta</Text>
          <Text style={styles.value}>{formatMoney(strategy.remainingGoal)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Horas restantes</Text>
          <Text style={styles.value}>{strategy.remainingHours.toFixed(1)} h</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ritmo requerido</Text>
          <Text style={[styles.value, { color: colors.warning }]}>
            {formatRate(strategy.requiredRate)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ofertas / hora</Text>
          <Text style={styles.value}>{state.settings.offersPerHour.toFixed(1)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fin de jornada</Text>
          <Text style={styles.value}>{formatClock(state.settings.shiftEnd)}</Text>
        </View>
      </Card>

      <Card>
        <SectionTitle>Por qué este umbral</SectionTitle>
        {strategy.reasons.map((reason, index) => (
          <Text key={index} style={styles.bullet}>
            {'• '}
            {reason}
          </Text>
        ))}
      </Card>

      <Card>
        <SectionTitle>Últimas ofertas</SectionTitle>
        {state.history.length === 0 ? (
          <Muted>Todavía no hay ofertas registradas.</Muted>
        ) : (
          state.history.slice(0, 6).map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <Text style={[styles.historyMark, { color: item.accepted ? colors.accent : colors.muted }]}>
                {item.accepted ? '✓' : '·'}
              </Text>
              <View style={styles.historyBody}>
                <Text style={styles.historyTitle}>
                  {formatMoney(item.fare)} · {item.distanceKm} km · {item.durationMin} min
                </Text>
                <Muted>
                  {`${item.source} · ${formatRate(item.profitPerHour)} · umbral ${formatRate(item.floor)}`}
                </Muted>
              </View>
            </View>
          ))
        )}
      </Card>

      <Button title="Simular oferta (probar)" onPress={onSimulate} tone="ghost" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 24 },
  caption: { color: colors.muted, fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  heroValue: { fontSize: 34, fontWeight: '800', marginVertical: 8 },
  modeBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
  },
  label: { color: colors.muted, fontSize: 14 },
  value: { color: colors.text, fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  track: { height: 8, borderRadius: radius, backgroundColor: colors.surfaceAlt, overflow: 'hidden', marginVertical: 10 },
  fill: { height: '100%', backgroundColor: colors.accent },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  bullet: { color: colors.text, fontSize: 13, lineHeight: 20, marginBottom: 4 },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  historyMark: { fontSize: 20, width: 22, fontWeight: '700' },
  historyBody: { flex: 1 },
  historyTitle: { color: colors.text, fontSize: 13, fontWeight: '600' },
});
