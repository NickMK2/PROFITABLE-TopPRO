import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import * as Notifications from 'react-native-umbral-notifications';
import appJson from './app.json';
import type { Offer, SourceId } from './src/domain/types';
import { parseOfferText } from './src/ingest/notificationParser';
import { redactNotificationText } from './src/ingest/redact';
import { CatalogProvider } from './src/state/catalogStore';
import { CustomersProvider } from './src/state/customerStore';
import { PublicFlowsProvider } from './src/state/publicFlowsStore';
import { RouteTrialsProvider } from './src/state/routeTrialStore';
import { ShiftProvider, useShift } from './src/state/shiftStore';
import { AppsScreen } from './src/ui/AppsScreen';
import type { Candidate } from './src/ui/candidate';
import { CustomersScreen } from './src/ui/CustomersScreen';
import { OfferScreen } from './src/ui/OfferScreen';
import { RouteTrialsScreen } from './src/ui/RouteTrialsScreen';
import { RoutesScreen } from './src/ui/RoutesScreen';
import { SettingsScreen } from './src/ui/SettingsScreen';
import { TodayScreen } from './src/ui/TodayScreen';
import { colors } from './src/ui/theme';

const APP_VERSION = appJson.expo.version;
type Tab = 'hoy' | 'oferta' | 'apps' | 'rutas' | 'pruebas' | 'clientes' | 'ajustes';

function Root() {
  const { state, dispatch } = useShift();
  const [tab, setTab] = useState<Tab>('hoy');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const settingsRef = useRef(state.settings);
  settingsRef.current = state.settings;

  useEffect(() => {
    if (!Notifications.isAvailable()) return;
    let active = true;

    Notifications.isEnabled()
      .then((value) => {
        if (active) setEnabled(value);
      })
      .catch(() => {});

    const offerSub = Notifications.addOfferListener((payload) => {
      // Ignorar notificaciones antiguas que el sistema reenvía al conectar.
      if (Date.now() - payload.postedAt > 60_000) return;
      const content = redactNotificationText(payload.content);
      const parsed = parseOfferText(content, Date.now(), payload.package);
      const offer = parsed.offer;
      if (!offer) return;
      const current = settingsRef.current;
      if (!current.enabledSources.includes(parsed.source)) return;
      offer.commissionRate = current.commissionBySource[parsed.source] ?? 0.22;
      dispatch({ type: 'offer', offer });
      setCandidate({ offer, parsed, counted: true });
      setTab('oferta');
    });

    const statusSub = Notifications.addStatusListener((payload) => setEnabled(payload.enabled));

    return () => {
      active = false;
      offerSub.remove();
      statusSub.remove();
    };
  }, [dispatch]);

  function simulate() {
    const now = Date.now();
    const source: SourceId = 'didi';
    const offer: Offer = {
      id: `sim-${now}`,
      source,
      receivedAt: now,
      fare: 6_200,
      distanceKm: 4.5,
      durationMin: 22,
      commissionRate: settingsRef.current.commissionBySource[source] ?? 0.22,
      raw: 'DiDi · Simulación · $6.200 · 4,5 km · 22 min',
    };
    dispatch({ type: 'offer', offer });
    setCandidate({
      offer,
      parsed: { offer, source, confidence: 1, missing: [], raw: offer.raw ?? '' },
      counted: true,
    });
    setTab('oferta');
  }

  async function openPermissionSettings() {
    await Notifications.openSettings();
    setEnabled(await Notifications.isEnabled());
  }

  const listenerAvailable = Notifications.isAvailable();

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>TOPPRO</Text>
        <Text style={styles.subtitle}>Asistente de rentabilidad · v{APP_VERSION}</Text>
      </View>

      {!listenerAvailable ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Modo manual: para leer notificaciones reales generá el APK con expo prebuild.
          </Text>
        </View>
      ) : enabled === false ? (
        <Pressable style={styles.noticePressable} onPress={openPermissionSettings}>
          <Text style={styles.noticeText}>Activar acceso a notificaciones →</Text>
        </Pressable>
      ) : null}

      <View style={styles.tabs}>
        {(['hoy', 'oferta', 'apps', 'rutas', 'pruebas', 'clientes', 'ajustes'] as Tab[]).map((item) => (
          <Pressable
            key={item}
            onPress={() => setTab(item)}
            style={[styles.tab, tab === item && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'hoy' ? (
        <TodayScreen onSimulate={simulate} />
      ) : tab === 'oferta' ? (
        <OfferScreen candidate={candidate} onCandidate={setCandidate} />
      ) : tab === 'apps' ? (
        <AppsScreen />
      ) : tab === 'rutas' ? (
        <RoutesScreen
          onOpenCustomers={() => setTab('clientes')}
          onOpenTrials={() => setTab('pruebas')}
        />
      ) : tab === 'pruebas' ? (
        <RouteTrialsScreen onOpenRoutes={() => setTab('rutas')} />
      ) : tab === 'clientes' ? (
        <CustomersScreen onOpenRoutes={() => setTab('rutas')} />
      ) : (
        <SettingsScreen
          listenerAvailable={listenerAvailable}
          enabled={enabled}
          onEnable={openPermissionSettings}
          onOpenCatalog={() => setTab('apps')}
          onOpenRoutes={() => setTab('rutas')}
          onOpenTrials={() => setTab('pruebas')}
          onOpenCustomers={() => setTab('clientes')}
        />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ShiftProvider>
      <CatalogProvider>
        <CustomersProvider>
          <PublicFlowsProvider>
            <RouteTrialsProvider>
              <Root />
            </RouteTrialsProvider>
          </PublicFlowsProvider>
        </CustomersProvider>
      </CatalogProvider>
    </ShiftProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { color: colors.accent, fontSize: 22, fontWeight: '800', letterSpacing: 3 },
  subtitle: { color: colors.muted, fontSize: 12 },
  notice: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 16, paddingVertical: 10 },
  noticePressable: { backgroundColor: colors.warning, paddingHorizontal: 16, paddingVertical: 10 },
  noticeText: { color: colors.text, fontSize: 12 },
  tabs: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8, gap: 4 },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.accent },
  tabText: { color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  tabTextActive: { color: colors.accent },
});
