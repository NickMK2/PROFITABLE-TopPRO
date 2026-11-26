import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import * as Notifications from 'react-native-umbral-notifications';
import type { Offer, SourceId } from './src/domain/types';
import { parseOfferText } from './src/ingest/notificationParser';
import { CatalogProvider } from './src/state/catalogStore';
import { ShiftProvider, useShift } from './src/state/shiftStore';
import { AppsScreen } from './src/ui/AppsScreen';
import type { Candidate } from './src/ui/candidate';
import { OfferScreen } from './src/ui/OfferScreen';
import { SettingsScreen } from './src/ui/SettingsScreen';
import { TodayScreen } from './src/ui/TodayScreen';
import { colors } from './src/ui/theme';

type Tab = 'hoy' | 'oferta' | 'apps' | 'ajustes';

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
      const parsed = parseOfferText(payload.content, Date.now(), payload.package);
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
        <Text style={styles.subtitle}>Asistente de rentabilidad · Android</Text>
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
        {(['hoy', 'oferta', 'apps', 'ajustes'] as Tab[]).map((item) => (
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
      ) : (
        <SettingsScreen
          listenerAvailable={listenerAvailable}
          enabled={enabled}
          onEnable={openPermissionSettings}
          onOpenCatalog={() => setTab('apps')}
        />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ShiftProvider>
      <CatalogProvider>
        <Root />
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
  tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.accent },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  tabTextActive: { color: colors.accent },
});
