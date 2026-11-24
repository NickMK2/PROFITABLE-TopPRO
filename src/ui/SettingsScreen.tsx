import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { clamp, epochToTime, formatMoney, formatRate, timeToEpoch } from '../domain/money';
import { ALL_SOURCES } from '../domain/settings';
import type { ShiftSettings, SourceId } from '../domain/types';
import { useShift } from '../state/shiftStore';
import { Button, Card, Muted, NumberField, SectionTitle, TextField } from './components';
import { colors } from './theme';

export function SettingsScreen({
  listenerAvailable,
  enabled,
  onEnable,
}: {
  listenerAvailable: boolean;
  enabled: boolean | null;
  onEnable: () => void;
}) {
  const { state, dispatch } = useShift();
  const settings = state.settings;
  const [start, setStart] = useState(epochToTime(settings.shiftStart));
  const [end, setEnd] = useState(epochToTime(settings.shiftEnd));
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setStart(epochToTime(settings.shiftStart));
    setEnd(epochToTime(settings.shiftEnd));
  }, [settings.shiftStart, settings.shiftEnd]);

  const patch = (value: Partial<ShiftSettings>) => dispatch({ type: 'settings', patch: value });

  function toggleSource(source: SourceId) {
    const active = settings.enabledSources.includes(source);
    patch({
      enabledSources: active
        ? settings.enabledSources.filter((item) => item !== source)
        : [...settings.enabledSources, source],
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <SectionTitle>Permisos de Android</SectionTitle>
        {!listenerAvailable ? (
          <Muted>
            El módulo nativo no está activo. Necesitás correr "expo prebuild" y generar el APK
            instalable; con Expo Go esta lectura no funciona. Mientras tanto podés pegar el texto de
            la notificación en la pestaña Oferta.
          </Muted>
        ) : enabled === false ? (
          <>
            <Muted>
              Falta dar permiso de acceso a notificaciones. TopPRO solo lee el texto para calcular;
              nunca toca el botón Aceptar.
            </Muted>
            <View style={styles.spacer} />
            <Button title="Activar acceso a notificaciones" onPress={onEnable} />
          </>
        ) : (
          <Text style={styles.ok}>Acceso a notificaciones concedido</Text>
        )}
      </Card>

      <Card>
        <SectionTitle>Meta y jornada</SectionTitle>
        <NumberField
          label="Meta neta del día"
          value={settings.goal}
          onChange={(value) => patch({ goal: value })}
          suffix={formatMoney(settings.goal)}
        />
        <NumberField
          label="Ganado hasta ahora"
          value={state.earned}
          onChange={(value) => dispatch({ type: 'earned', value })}
          suffix="Ajustalo si tu app muestra otro total"
        />
        <TextField
          label="Inicio de jornada (HH:MM)"
          value={start}
          onChange={(value) => {
            setStart(value);
            if (/^\d{1,2}:\d{2}$/.test(value)) patch({ shiftStart: timeToEpoch(value) });
          }}
        />
        <TextField
          label="Fin de jornada (HH:MM)"
          value={end}
          onChange={(value) => {
            setEnd(value);
            if (/^\d{1,2}:\d{2}$/.test(value)) patch({ shiftEnd: timeToEpoch(value) });
          }}
        />
        <NumberField
          label="Tiempo productivo estimado (0,2 a 1)"
          value={settings.utilization}
          onChange={(value) => patch({ utilization: clamp(value, 0.2, 1) })}
          suffix="0,85 = el 85% del tiempo cobrás"
        />
      </Card>

      <Card>
        <SectionTitle>Umbrales y costos</SectionTitle>
        <NumberField
          label="Mínimo $/h que exigís"
          value={settings.reserveRate}
          onChange={(value) => patch({ reserveRate: value })}
          suffix={formatRate(settings.reserveRate)}
        />
        <NumberField
          label="Piso duro $/h (nunca bajar)"
          value={settings.hardFloorRate}
          onChange={(value) => patch({ hardFloorRate: value })}
          suffix="Debe cubrir costos"
        />
        <NumberField
          label="Costo por km"
          value={settings.costPerKm}
          onChange={(value) => patch({ costPerKm: value })}
          suffix="Combustible + depreciación + mantenimiento"
        />
        <NumberField
          label="Ofertas por hora (demanda actual)"
          value={settings.offersPerHour}
          onChange={(value) => patch({ offersPerHour: value })}
          suffix="Se actualiza solo al llegar ofertas"
        />
        <NumberField
          label="Demanda de referencia"
          value={settings.referenceOffersPerHour}
          onChange={(value) => patch({ referenceOffersPerHour: Math.max(1, value) })}
          suffix="Por encima, el umbral sube"
        />
      </Card>

      <Card>
        <SectionTitle>Comisión y fuentes</SectionTitle>
        {ALL_SOURCES.map((source) => (
          <NumberField
            key={source}
            label={`Comisión ${source} (%)`}
            value={Math.round(settings.commissionBySource[source] * 100)}
            onChange={(value) =>
              patch({
                commissionBySource: {
                  ...settings.commissionBySource,
                  [source]: clamp(value / 100, 0, 0.9),
                },
              })
            }
          />
        ))}
        <Text style={styles.fieldLabel}>Fuentes activas</Text>
        <View style={styles.chips}>
          {ALL_SOURCES.map((source) => (
            <Button
              key={source}
              title={settings.enabledSources.includes(source) ? `${source} ✓` : source}
              tone={settings.enabledSources.includes(source) ? 'success' : 'ghost'}
              onPress={() => toggleSource(source)}
            />
          ))}
        </View>
      </Card>

      <Button
        title={confirmReset ? 'Confirmar reinicio del día' : 'Reiniciar día'}
        tone={confirmReset ? 'danger' : 'ghost'}
        onPress={() => {
          if (confirmReset) {
            dispatch({ type: 'reset' });
            setConfirmReset(false);
          } else {
            setConfirmReset(true);
          }
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  spacer: { height: 10 },
  ok: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldLabel: { color: colors.muted, fontSize: 12, marginBottom: 6, marginTop: 8 },
});
