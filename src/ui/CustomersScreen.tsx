import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  createCustomer,
  isConsentActive,
  renewConsent,
  WEEKDAY_LABELS,
  type CustomerInput,
} from '../domain/customers';
import { formatLatLon } from '../domain/geo';
import { useCustomers } from '../state/customerStore';
import { Button, Card, Muted, SectionTitle, TextField } from './components';
import { colors } from './theme';

const EMPTY_FORM: CustomerInput = {
  alias: '',
  phone: '',
  email: '',
  zones: '',
  notes: '',
  origin: '',
  destination: '',
  weekdays: [],
  pickupTime: '',
  returnTime: '',
  originCoordText: '',
  destinationCoordText: '',
  consent: false,
};

function formatDate(value: number): string {
  return new Date(value).toLocaleDateString('es-CO');
}

function callPhone(phone?: string) {
  if (!phone) return;
  const number = phone.replace(/[^\d+]/g, '');
  if (number) Linking.openURL(`tel:${number}`).catch(() => {});
}

export function CustomersScreen({ onOpenRoutes }: { onOpenRoutes: () => void }) {
  const { customers, dispatch } = useCustomers();
  const [form, setForm] = useState<CustomerInput>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function setField(field: keyof CustomerInput, value: string | boolean | number[]) {
    setForm((current) => ({ ...current, [field]: value } as CustomerInput));
  }

  function toggleWeekday(day: number) {
    const days = form.weekdays ?? [];
    setField(
      'weekdays',
      days.includes(day) ? days.filter((item) => item !== day) : [...days, day].sort((a, b) => a - b),
    );
  }

  function save() {
    const customer = createCustomer(form);
    if (!customer) {
      setError('Necesitás un alias y marcar el consentimiento para guardar.');
      return;
    }
    dispatch({ type: 'add', customer });
    setForm(EMPTY_FORM);
    setError('');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <SectionTitle>Clientes frecuentes</SectionTitle>
        <Muted>
          Registro manual y opcional. Los datos se guardan solo en este dispositivo: no se suben a
          GitHub, no se leen de DiDi/PicUp ni se envían mensajes automáticos. Usalo para recordar
          rutas y preferencias, no para llevar clientes fuera de la plataforma.
        </Muted>
        <View style={styles.spacer} />
        <Button title="Ver rutas predecibles" onPress={onOpenRoutes} tone="ghost" />
      </Card>

      <Card>
        <SectionTitle>Agregar persona</SectionTitle>
        <TextField
          label="Alias (obligatorio)"
          value={form.alias}
          onChange={(value) => setField('alias', value)}
          placeholder="Ej: Vecina Laura"
        />
        <TextField
          label="Teléfono (opcional)"
          value={form.phone ?? ''}
          onChange={(value) => setField('phone', value)}
          placeholder="300 123 4567"
        />
        <TextField
          label="Correo (opcional)"
          value={form.email ?? ''}
          onChange={(value) => setField('email', value)}
          placeholder="nombre@correo.com"
        />
        <TextField
          label="Zonas habituales (opcional)"
          value={form.zones ?? ''}
          onChange={(value) => setField('zones', value)}
          placeholder="Casa: Chapinero → Trabajo: Usaquén"
        />
        <TextField
          label="Preferencias (opcional)"
          value={form.notes ?? ''}
          onChange={(value) => setField('notes', value)}
          placeholder="Prefiere silencio, viaja con mascota…"
        />

        <Text style={styles.subtitle}>Ruta habitual</Text>
        <TextField
          label="Origen"
          value={form.origin ?? ''}
          onChange={(value) => setField('origin', value)}
          placeholder="Ej: Chapinero, casa"
        />
        <TextField
          label="Destino"
          value={form.destination ?? ''}
          onChange={(value) => setField('destination', value)}
          placeholder="Ej: Usaquén, oficina"
        />
        <Text style={styles.fieldLabel}>Días de la semana</Text>
        <View style={styles.chips}>
          {WEEKDAY_LABELS.map((label, day) => (
            <Button
              key={label}
              title={label}
              tone={(form.weekdays ?? []).includes(day) ? 'success' : 'ghost'}
              onPress={() => toggleWeekday(day)}
            />
          ))}
        </View>
        <TextField
          label="Hora de recogida (HH:MM)"
          value={form.pickupTime ?? ''}
          onChange={(value) => setField('pickupTime', value)}
          placeholder="07:30"
        />
        <TextField
          label="Hora de regreso (HH:MM)"
          value={form.returnTime ?? ''}
          onChange={(value) => setField('returnTime', value)}
          placeholder="17:00"
        />
        <TextField
          label="Coordenadas del origen: lat,lon (opcional)"
          value={form.originCoordText ?? ''}
          onChange={(value) => setField('originCoordText', value)}
          placeholder="4.7110, -74.0721"
        />
        <TextField
          label="Coordenadas del destino: lat,lon (opcional)"
          value={form.destinationCoordText ?? ''}
          onChange={(value) => setField('destinationCoordText', value)}
          placeholder="4.9590, -74.0800"
        />
        <Muted>
          Las coordenadas son opcionales. Sin ellas, la coincidencia de zonas funciona por texto.
        </Muted>

        <Pressable onPress={() => setField('consent', !form.consent)} style={styles.consentRow}>
          <Text style={styles.checkbox}>{form.consent ? '☑' : '☐'}</Text>
          <Text style={styles.consentText}>
            Confirmo que la persona autorizó expresamente guardar estos datos en mi celular para
            recordar su ruta y contactarla. Consentimiento vigente por 12 meses.
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.spacer} />
        <Button title="Guardar cliente" onPress={save} disabled={!form.alias.trim() || !form.consent} />
      </Card>

      {customers.length === 0 ? (
        <Card>
          <Muted>Todavía no cargaste ninguna persona.</Muted>
        </Card>
      ) : null}

      {customers.map((customer) => {
        const active = isConsentActive(customer);
        return (
          <Card key={customer.id}>
            <Text style={styles.alias}>{customer.alias}</Text>
            <Text style={[styles.status, active ? styles.statusOk : styles.statusWarn]}>
              Consentimiento {active ? 'vigente' : 'vencido'} hasta {formatDate(customer.expiresAt)}
            </Text>
            {customer.origin || customer.destination ? (
              <Text style={styles.line}>
                Ruta: {customer.origin ?? '?'} → {customer.destination ?? '?'}
              </Text>
            ) : null}
            {customer.weekdays.length > 0 || customer.pickupTime ? (
              <Text style={styles.line}>
                Patrón: {WEEKDAY_LABELS.filter((_, day) => customer.weekdays.includes(day)).join(' · ')}
                {customer.pickupTime ? ` · recogida ${customer.pickupTime}` : ''}
                {customer.returnTime ? ` · regreso ${customer.returnTime}` : ''}
              </Text>
            ) : null}
            {customer.originCoord || customer.destinationCoord ? (
              <Text style={styles.line}>
                Coords: {formatLatLon(customer.originCoord) ?? '–'} →{' '}
                {formatLatLon(customer.destinationCoord) ?? '–'}
              </Text>
            ) : null}
            {customer.zones ? <Text style={styles.line}>Zonas: {customer.zones}</Text> : null}
            {customer.notes ? <Text style={styles.line}>Preferencias: {customer.notes}</Text> : null}
            {customer.phone ? <Text style={styles.line}>Tel: {customer.phone}</Text> : null}
            {customer.email ? <Text style={styles.line}>Correo: {customer.email}</Text> : null}

            <View style={styles.spacer} />
            <View style={styles.actions}>
              {customer.phone ? (
                <Button
                  title="Llamar"
                  tone="success"
                  disabled={!active}
                  onPress={() => callPhone(customer.phone)}
                />
              ) : null}
              <Button
                title="Renovar consentimiento"
                tone="ghost"
                onPress={() =>
                  dispatch({ type: 'renew', id: customer.id, customer: renewConsent(customer) })
                }
              />
              <Button
                title={confirmId === customer.id ? 'Confirmar borrado' : 'Eliminar'}
                tone={confirmId === customer.id ? 'danger' : 'ghost'}
                onPress={() => {
                  if (confirmId === customer.id) {
                    dispatch({ type: 'remove', id: customer.id });
                    setConfirmId(null);
                  } else {
                    setConfirmId(customer.id);
                  }
                }}
              />
            </View>
            {!active ? (
              <Text style={styles.error}>Renová el consentimiento antes de contactar.</Text>
            ) : null}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  alias: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  fieldLabel: { color: colors.muted, fontSize: 12, marginBottom: 6, marginTop: 8 },
  status: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  statusOk: { color: colors.accent },
  statusWarn: { color: colors.warning },
  line: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12 },
  checkbox: { color: colors.accent, fontSize: 20, lineHeight: 20 },
  consentText: { color: colors.muted, fontSize: 12, lineHeight: 17, flex: 1 },
  error: { color: colors.danger, fontSize: 13, marginTop: 10 },
  spacer: { height: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
