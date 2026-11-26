import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCatalog } from '../state/catalogStore';
import { useShift } from '../state/shiftStore';
import { Button, Card, Muted, SectionTitle } from './components';
import { colors } from './theme';

const SOURCE_LABEL: Record<string, string> = {
  bundled: 'copia incluida en la app',
  cache: 'caché local',
  remote: 'GitHub (actualizado)',
};

function openUrl(url?: string) {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

export function AppsScreen() {
  const { catalog, source, fetchedAt, refreshing, error, refresh } = useCatalog();
  const { state, dispatch } = useShift();
  const settings = state.settings;

  const sourceText = SOURCE_LABEL[source];
  const fetchedText = fetchedAt ? new Date(fetchedAt).toLocaleString('es-CO') : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <SectionTitle>Catálogo de apps · Colombia / moto</SectionTitle>
        <Muted>{catalog.disclaimer}</Muted>
        <Text style={styles.meta}>
          Versión {catalog.version} · Actualizado {catalog.updatedAt}
        </Text>
        <Text style={styles.meta}>
          Fuente: {sourceText}
          {fetchedText ? ` · ${fetchedText}` : ''}
        </Text>
        {error ? (
          <Text style={styles.warning}>
            No se pudo descargar la versión remota ({error}). Se muestra la copia disponible.
          </Text>
        ) : null}
        <View style={styles.spacer} />
        <Button
          title={refreshing ? 'Actualizando…' : 'Actualizar catálogo'}
          onPress={() => void refresh()}
          disabled={refreshing}
          tone="ghost"
        />
      </Card>

      {catalog.apps.map((app) => {
        const applied =
          app.commissionRate !== null &&
          Math.abs(settings.commissionBySource[app.sourceId] - app.commissionRate) < 0.001;
        const rateLabel =
          app.commissionRate === null
            ? 'Sin porcentaje público'
            : `${Math.round(app.commissionRate * 100)} % ${
                app.commissionVerified ? 'verificado' : 'orientativo'
              }`;
        return (
          <Card key={app.id}>
            <Text style={styles.appName}>{app.name}</Text>
            <Text style={styles.meta}>
              {app.workType} · {app.vehicle} · disponibilidad {app.availability}
            </Text>
            <Text style={styles.label}>Comisión</Text>
            <Text style={[styles.rate, !app.commissionVerified && styles.rateUnverified]}>
              {rateLabel}
            </Text>
            <Muted>{app.commissionNote}</Muted>

            {app.payoutNote ? (
              <>
                <Text style={styles.label}>Pagos</Text>
                <Muted>{app.payoutNote}</Muted>
              </>
            ) : null}

            {app.requirements.length > 0 ? (
              <>
                <Text style={styles.label}>Requisitos</Text>
                {app.requirements.map((item) => (
                  <Text key={item} style={styles.bullet}>
                    • {item}
                  </Text>
                ))}
              </>
            ) : null}

            {app.notes.length > 0 ? (
              <>
                <Text style={styles.label}>Datos relevantes</Text>
                {app.notes.map((item) => (
                  <Text key={item} style={styles.bullet}>
                    • {item}
                  </Text>
                ))}
              </>
            ) : null}

            <Text style={styles.meta}>Verificado: {app.verifiedAt}</Text>

            <View style={styles.spacer} />
            {app.termsUrl ? (
              <Button
                title="Ver términos oficiales"
                onPress={() => openUrl(app.termsUrl)}
                tone="ghost"
              />
            ) : null}
            {app.infoUrl && app.infoUrl !== app.termsUrl ? (
              <>
                <View style={styles.spacerSmall} />
                <Button title="Ver sitio de la app" onPress={() => openUrl(app.infoUrl)} tone="ghost" />
              </>
            ) : null}

            <View style={styles.spacerSmall} />
            {app.commissionRate === null ? (
              <Muted>Ajustá el porcentaje en Ajustes → Comisión {app.sourceId}.</Muted>
            ) : (
              <Button
                title={
                  applied
                    ? `Comisión ${app.sourceId} aplicada ✓`
                    : `Aplicar ${Math.round(app.commissionRate * 100)} % a ${app.sourceId}`
                }
                tone={applied ? 'success' : 'primary'}
                disabled={applied}
                onPress={() =>
                  dispatch({
                    type: 'settings',
                    patch: {
                      commissionBySource: {
                        ...settings.commissionBySource,
                        [app.sourceId]: app.commissionRate ?? 0,
                      },
                    },
                  })
                }
              />
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  appName: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  label: { color: colors.accent, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 2 },
  rate: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  rateUnverified: { color: colors.warning },
  bullet: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  warning: { color: colors.warning, fontSize: 12, marginTop: 8, lineHeight: 17 },
  spacer: { height: 10 },
  spacerSmall: { height: 6 },
});
