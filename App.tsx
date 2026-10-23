import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { InsightsScreen } from './src/screens/InsightsScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { TxnDetailSheet } from './src/screens/TxnDetailSheet';
import { AppProvider, useApp } from './src/state/store';
import { Toast } from './src/ui/components/Toast';
import { StringKey, t } from './src/ui/i18n';
import { colors, space } from './src/ui/theme';

type Tab = 'home' | 'txns' | 'insights' | 'settings';

const TABS: { id: Tab; icon: string; label: StringKey }[] = [
  { id: 'home', icon: '◎', label: 'tabHome' },
  { id: 'txns', icon: '≡', label: 'tabTxns' },
  { id: 'insights', icon: '◔', label: 'tabInsights' },
  { id: 'settings', icon: '⚙', label: 'tabSettings' },
];

/**
 * Hand-rolled tab bar instead of react-navigation: four screens don't need a navigation library,
 * and skipping it saves ~1 MB of JS and startup work on low-end Android.
 */
function Shell() {
  const { state, toast, dismissToast } = useApp();
  const [tab, setTab] = useState<Tab>('home');
  const [openTxn, setOpenTxn] = useState<string | null>(null);

  if (!state.hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (!state.onboarded) return <OnboardingScreen />;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {tab === 'home' && <HomeScreen onOpenTxn={setOpenTxn} />}
        {tab === 'txns' && <TransactionsScreen onOpenTxn={setOpenTxn} />}
        {tab === 'insights' && <InsightsScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </View>
      <View style={styles.tabBar} accessibilityRole="tablist">
        {TABS.map((x) => {
          const active = tab === x.id;
          return (
            <Pressable key={x.id} style={styles.tab} onPress={() => setTab(x.id)} accessibilityRole="tab" accessibilityState={{ selected: active }}>
              <Text style={[styles.tabIcon, active && { color: colors.brand }]}>{x.icon}</Text>
              <Text style={[styles.tabLabel, active && { color: colors.brand, fontWeight: '700' }]}>{t(x.label, state.settings.lang)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Toast msg={toast} onDone={dismissToast} />
      <TxnDetailSheet id={openTxn} onClose={() => setOpenTxn(null)} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <StatusBar style="dark" />
          <View style={styles.frame}>
            <Shell />
          </View>
        </SafeAreaView>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  // On web/tablets, keep a phone-width column so the prototype reads like the app.
  frame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card, paddingVertical: space(2) },
  tab: { flex: 1, alignItems: 'center', paddingVertical: space(1), minHeight: 48, justifyContent: 'center' },
  tabIcon: { fontSize: 20, color: colors.muted },
  tabLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
