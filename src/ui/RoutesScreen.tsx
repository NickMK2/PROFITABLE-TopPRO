import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { parseLatLon } from '../domain/geo';
import { rankFlows, type FlowConfidence, type RankedFlow } from '../domain/publicFlows';
import { planRoutes, type RoutePlanItem, type RouteStatus } from '../domain/routes';
import { useCustomers } from '../state/customerStore';
import { usePublicFlows } from '../state/publicFlowsStore';
import { Button, Card, Muted, SectionTitle, TextField } from './components';
import { colors } from './theme';

const STATUS_LABEL: Record<RouteStatus, string> = {
  window: 'EN VENTANA',
  soon: 'PRÓXIMO',
  later: 'MÁS TARDE',
};

function formatDate(value: number): string {
  return new Date(value).toLocaleString('es-CO', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(value: number): string {
  return new Date(value).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function priorityLabel(priority: number): string {
  if (priority >= 120) return 'Alta';
  if (priority >= 70) return 'Media';
  return 'Baja';
}

const FLOW_STATUS_LABEL: Record<RankedFlow['status'], string> = {
  active: 'AHORA',
  soon: 'PRÓXIMO',
  later: 'MÁS TARDE',
  'sin-horario': 'DINÁMICO',
};

const CONFIDENCE_LABEL: Record<FlowConfidence, string> = {
  oficial: 'Fuente oficial',
  orientativo: 'Dato agregado',
  verificar: 'A verificar',
};

function flowStatusColor(status: RankedFlow['status']): string {
  if (status === 'active') return colors.accent;
  if (status === 'soon') return colors.info;
  return colors.muted;
}

function openUrl(url?: string) {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

function StatusText({ status }: { status: RouteStatus }) {
  const color = status === 'window' ? colors.accent : status === 'soon' ? colors.info : colors.muted;
  return <Text style={[styles.status, { color }]}>{STATUS_LABEL[status]}</Text>;
}

export function RoutesScreen({
  onOpenCustomers,
  onOpenTrials,
}: {
  onOpenCustomers: () => void;
  onOpenTrials: () => void;
}) {
  const { customers } = useCustomers();
  const publicFlows = usePublicFlows();
  const [myZone, setMyZone] = useState('');
  const [myCoordText, setMyCoordText] = useState('');
  const [destinationZone, setDestinationZone] = useState('');
  const [destinationCoordText, setDestinationCoordText] = useState('');

  const myLocation = parseLatLon(myCoordText);
  const passengerDestination = parseLatLon(destinationCoordText);
  const coordError =
    myCoordText.trim() && !myLocation
      ? 'No entendí tus coordenadas. Usá el formato lat,lon (ej: 4.7110, -74.0721).'
      : destinationCoordText.trim() && !passengerDestination
        ? 'No entendí las coordenadas del destino. Usá el formato lat,lon.'
        : '';

  const now = Date.now();
  const items: RoutePlanItem[] = planRoutes(
    customers,
    { myZone, myLocation, passengerDestinationZone: destinationZone, passengerDestination },
    now,
  );
  const rankedFlows = rankFlows(publicFlows.catalog.signals, myZone, now);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <SectionTitle>Rutas predecibles</SectionTitle>
        <Muted>
          Este plan usa solo los clientes que cargaste a mano en el celular, con consentimiento
          vigente. No lee contactos, GPS, DiDi ni PicUp. Cargá tu zona y el destino del pasajero
          actual para ver qué cliente queda cerca y conviene encadenar.
        </Muted>
        <View style={styles.spacer} />
        <Button title="Cargar o editar clientes" onPress={onOpenCustomers} tone="ghost" />
        <View style={styles.spacer} />
        <Button title="Probar y validar una ruta (7 días)" onPress={onOpenTrials} tone="success" />
      </Card>

      <Card>
        <SectionTitle>Mi referencia ahora</SectionTitle>
        <TextField
          label="Zona donde estoy"
          value={myZone}
          onChange={setMyZone}
          placeholder="Ej: Chapinero"
        />
        <TextField
          label="Mis coordenadas: lat,lon (opcional)"
          value={myCoordText}
          onChange={setMyCoordText}
          placeholder="4.7110, -74.0721"
        />
        <Text style={styles.subtitle}>Destino del pasajero actual</Text>
        <TextField
          label="Zona de destino"
          value={destinationZone}
          onChange={setDestinationZone}
          placeholder="Ej: Usaquén"
        />
        <TextField
          label="Coordenadas de destino: lat,lon (opcional)"
          value={destinationCoordText}
          onChange={setDestinationCoordText}
          placeholder="4.9590, -74.0800"
        />
        {coordError ? <Text style={styles.error}>{coordError}</Text> : null}
        <Muted>
          Sin coordenadas, la app compara las zonas por texto. Con coordenadas, calcula distancia
          aproximada en línea recta.
        </Muted>
      </Card>

      {customers.length === 0 ? (
        <Card>
          <Muted>Todavía no hay clientes cargados.</Muted>
        </Card>
      ) : null}

      {customers.length > 0 && items.length === 0 ? (
        <Card>
          <Muted>
            No hay rutas recurrentes para mostrar. Cargá días y hora de recogida en cada cliente para
            que aparezca en este plan.
          </Muted>
        </Card>
      ) : null}

      {items.map((item) => (
        <Card key={item.customer.id}>
          <View style={styles.row}>
            <Text style={styles.name}>{item.customer.alias}</Text>
            <StatusText status={item.status} />
          </View>
          <Text style={styles.route}>
            {item.customer.origin ?? 'Origen sin definir'} →{' '}
            {item.customer.destination ?? 'Destino sin definir'}
          </Text>
          <Text style={styles.line}>Próxima recogida: {formatDate(item.nextPickupAt)}</Text>
          <Text style={styles.line}>
            Días: {item.daysLabel}
            {item.customer.pickupTime ? ` · ${item.customer.pickupTime}` : ''}
            {item.customer.returnTime ? ` · regreso ${item.customer.returnTime}` : ''}
          </Text>
          <Text style={styles.line}>
            Distancia desde vos:{' '}
            {item.distanceFromMeKm === null
              ? 'sin coordenadas'
              : `${item.distanceFromMeKm.toFixed(1)} km`}
          </Text>
          {item.chainMatch ? (
            <Text style={styles.match}>✓ Coincide con el destino del pasajero actual</Text>
          ) : null}
          <Text style={styles.line}>Prioridad: {priorityLabel(item.priority)}</Text>
          {item.reasons.map((reason) => (
            <Text key={reason} style={styles.bullet}>
              • {reason}
            </Text>
          ))}
        </Card>
      ))}

      <Card>
        <SectionTitle>Señales públicas · {publicFlows.catalog.city}</SectionTitle>
        <Muted>{publicFlows.catalog.disclaimer}</Muted>
        <Text style={styles.meta}>
          Datos {publicFlows.catalog.updatedAt} · fuente:{' '}
          {publicFlows.source === 'remote'
            ? 'GitHub'
            : publicFlows.source === 'cache'
              ? 'caché local'
              : 'copia incluida'}
        </Text>
        {publicFlows.error ? (
          <Text style={styles.error}>
            No se pudieron actualizar las señales ({publicFlows.error}). Se muestra la copia
            disponible.
          </Text>
        ) : null}
        <View style={styles.spacer} />
        <Button
          title={publicFlows.refreshing ? 'Actualizando…' : 'Actualizar señales'}
          onPress={() => void publicFlows.refresh()}
          disabled={publicFlows.refreshing}
          tone="ghost"
        />
        <Muted>
          Las señales son patrones agregados, no personas. Cargá tu zona arriba para ordenarlas por
          cercanía y ver cuál está activa ahora.
        </Muted>
      </Card>

      {rankedFlows.map(({ flow, next, zoneMatch, status }) => (
        <Card key={flow.id}>
          <View style={styles.row}>
            <Text style={styles.name}>{flow.name}</Text>
            <Text style={[styles.status, { color: flowStatusColor(status) }]}>
              {FLOW_STATUS_LABEL[status]}
            </Text>
          </View>
          <Text style={styles.meta}>
            {flow.category} · {flow.zone}
            {zoneMatch ? ' · cerca de tu zona' : ''}
          </Text>
          <Text style={[styles.meta, flow.confidence === 'verificar' && styles.warn]}>
            {CONFIDENCE_LABEL[flow.confidence]} · verificado {flow.verifiedAt}
          </Text>
          <Text style={styles.line}>{flow.insight}</Text>
          <Text style={styles.action}>Cómo usarlo: {flow.action}</Text>
          {next ? (
            <Text style={styles.match}>
              {next.active ? 'Ventana activa' : 'Próxima ventana'}: {next.label} ·{' '}
              {formatTime(next.startAt)}–{formatTime(next.endAt)}
            </Text>
          ) : (
            <Text style={styles.line}>Sin franja fija: revisá la fuente del día.</Text>
          )}
          {flow.windows.length > 0 ? (
            <Text style={styles.line}>
              Franjas:{' '}
              {flow.windows.map((window) => `${window.label} ${window.start}-${window.end}`).join(' · ')}
            </Text>
          ) : null}
          {flow.sourceUrl ? (
            <>
              <View style={styles.spacer} />
              <Button
                title="Ver fuente oficial"
                onPress={() => openUrl(flow.sourceUrl)}
                tone="ghost"
              />
            </>
          ) : null}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  subtitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  spacer: { height: 10 },
  error: { color: colors.danger, fontSize: 13, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { color: colors.text, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  status: { fontSize: 11, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 },
  warn: { color: colors.warning },
  route: { color: colors.accent, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  line: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  action: { color: colors.text, fontSize: 12, lineHeight: 18, marginTop: 6 },
  bullet: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  match: { color: colors.accent, fontSize: 12, fontWeight: '700', marginVertical: 4 },
});
