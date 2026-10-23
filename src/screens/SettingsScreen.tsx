import React, { useState } from 'react';
import { Alert, Platform, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { morningMessage, nightMessage, transactionMessage, Msg } from '../domain/copy';
import { formatINR, parseINR } from '../domain/money';
import { NotificationPrefs } from '../domain/types';
import { useApp } from '../state/store';
import { Button, Card, Chip, SectionTitle, Toggle } from '../ui/components/common';
import { colors, radius, space, type } from '../ui/theme';

const MORNING_TIMES = ['07:30', '08:30', '09:30'];
const NIGHT_TIMES = ['21:00', '21:30', '22:30'];

export function SettingsScreen() {
  const { state, view, updateSettings, updateProfile, deleteAllData } = useApp();
  const { settings, profile, consent } = state;
  const n = settings.notifications;
  const setN = (patch: Partial<NotificationPrefs>) => updateSettings({ ...settings, notifications: { ...n, ...patch } });

  const [income, setIncome] = useState(String(profile.monthlyIncome / 100));
  const [savings, setSavings] = useState(String(profile.savingsGoal / 100));

  const seed = view.todayKey;
  const { today } = view;
  const previews: { label: string; on: boolean; msg: Msg }[] = [
    { label: `Morning · ${n.morningTime}`, on: n.morning, msg: morningMessage({ budget: today.budget, rollover: today.rollover, name: profile.name, streak: view.streak }, settings.tone, settings.lang, seed) },
    { label: 'After each payment', on: n.perTransaction, msg: transactionMessage({ merchant: 'Blinkit', amount: 60000, left: today.remaining - 60000, budget: today.budget }, settings.tone, settings.lang, seed) },
    { label: `Night · ${n.nightTime}`, on: n.night, msg: nightMessage({ budget: today.budget, spent: today.spent, streak: view.streak + 1 }, settings.tone, settings.lang, seed) },
  ];

  const exportData = () => {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), profile, settings, consent, transactions: state.txns, categoryOverrides: state.categoryOverrides }, null, 2);
    Share.share({ message: payload, title: 'DailyBudget data export' }).catch(() => {});
  };

  const confirmDelete = () => {
    const run = () => deleteAllData();
    if (Platform.OS === 'web') {
      // Alert with buttons is a no-op on web.
      if (typeof window !== 'undefined' && window.confirm('Delete all DailyBudget data from this device? This cannot be undone.')) run();
      return;
    }
    Alert.alert('Delete everything?', 'All transactions, settings and consents are erased from this device immediately. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}>
      <Text style={type.h1}>Settings</Text>

      <SectionTitle>Vibe</SectionTitle>
      <Card>
        <Row title="Tone" sub={settings.tone === 'roast' ? 'Funny, lightly roasting. Never shaming.' : 'Just the facts, kindly.'}>
          <View style={styles.seg}>
            <Chip label="😏 Roast" active={settings.tone === 'roast'} onPress={() => updateSettings({ ...settings, tone: 'roast' })} />
            <Chip label="🌿 Gentle" active={settings.tone === 'gentle'} onPress={() => updateSettings({ ...settings, tone: 'gentle' })} />
          </View>
        </Row>
        <Row title="Language">
          <View style={styles.seg}>
            <Chip label="English" active={settings.lang === 'en'} onPress={() => updateSettings({ ...settings, lang: 'en' })} />
            <Chip label="Hinglish" active={settings.lang === 'hinglish'} onPress={() => updateSettings({ ...settings, lang: 'hinglish' })} />
          </View>
        </Row>
      </Card>

      <SectionTitle>Notifications</SectionTitle>
      <Card>
        <ToggleRow title="Morning budget" sub="Today's number, with rollover" value={n.morning} onChange={(v) => setN({ morning: v })} />
        {n.morning ? (
          <View style={styles.seg}>
            {MORNING_TIMES.map((tm) => (
              <Chip key={tm} label={tm} active={n.morningTime === tm} onPress={() => setN({ morningTime: tm })} />
            ))}
          </View>
        ) : null}
        <ToggleRow title="After every payment" sub="Live balance, e.g. “Blinkit −₹600. ₹2,483 left.”" value={n.perTransaction} onChange={(v) => setN({ perTransaction: v })} />
        <ToggleRow title="Night summary" sub="How the day went" value={n.night} onChange={(v) => setN({ night: v })} />
        {n.night ? (
          <View style={styles.seg}>
            {NIGHT_TIMES.map((tm) => (
              <Chip key={tm} label={tm} active={n.nightTime === tm} onPress={() => setN({ nightTime: tm })} />
            ))}
          </View>
        ) : null}
        <ToggleRow title="Weekly reality check" sub="Sunday evening" value={n.weekly} onChange={(v) => setN({ weekly: v })} />
      </Card>

      <Text style={[type.tiny, { marginTop: space(4), marginBottom: space(2), fontWeight: '700' }]}>PREVIEW (WITH YOUR REAL NUMBERS)</Text>
      {previews.map((p) => (
        <View key={p.label} style={[styles.notif, !p.on && { opacity: 0.4 }]}>
          <Text style={styles.notifApp}>DailyBudget · {p.label}</Text>
          <Text style={styles.notifTitle}>{p.msg.title}</Text>
          <Text style={styles.notifBody}>{p.msg.body}</Text>
        </View>
      ))}

      <SectionTitle>Budget</SectionTitle>
      <Card>
        <Field label="Monthly take-home (₹)" value={income} onChangeText={setIncome} />
        <Field label="Savings goal (₹ / month)" value={savings} onChangeText={setSavings} />
        <Text style={[type.small, { marginTop: space(2) }]}>
          Fixed costs: {profile.fixedExpenses.map((f) => `${f.label} ${formatINR(f.amount)}`).join(' · ') || 'none'}
        </Text>
        <Button
          label="Update budget"
          kind="secondary"
          style={{ marginTop: space(3) }}
          onPress={() => {
            const inc = parseINR(income);
            const sav = parseINR(savings);
            if (inc != null && sav != null) updateProfile({ ...profile, monthlyIncome: inc, savingsGoal: sav });
          }}
        />
        <Row title="Rollover style" sub={profile.rolloverMode === 'spread' ? 'Leftovers & overspends spread across the rest of the month' : 'Leftovers & overspends land on tomorrow'}>
          <View style={styles.seg}>
            <Chip label="Spread" active={profile.rolloverMode === 'spread'} onPress={() => updateProfile({ ...profile, rolloverMode: 'spread' })} />
            <Chip label="Next day" active={profile.rolloverMode === 'nextDay'} onPress={() => updateProfile({ ...profile, rolloverMode: 'nextDay' })} />
          </View>
        </Row>
        <Text style={[type.small, { marginTop: space(2) }]}>
          Today: {formatINR(view.plan.baseDaily)}/day real · {formatINR(view.plan.rawDaily)}/day if you ignored fixed costs & savings.
        </Text>
      </Card>

      <SectionTitle>Where your data comes from</SectionTitle>
      <Card>
        <Row title="🏦 Bank via Account Aggregator" sub="RBI-regulated, consent-based. We never ask for your bank password.">
          <Button
            label="Connect"
            kind="secondary"
            style={{ paddingHorizontal: space(4), minHeight: 40, paddingVertical: space(2) }}
            onPress={() =>
              Platform.OS === 'web'
                ? window.alert('Account Aggregator linking needs the DailyBudget backend — coming in the next build.')
                : Alert.alert('Coming soon', 'Account Aggregator linking needs the DailyBudget backend — coming in the next build.')
            }
          />
        </Row>
        <Row title="💬 Bank SMS (Android)" sub={Platform.OS === 'android' ? 'Read on-device only. OTPs & personal SMS are ignored.' : 'Only available on Android.'}>
          <Toggle value={consent.smsParsing} disabled />
        </Row>
        <Row title="✍️ Manual entry" sub="Always on. Perfect for cash & chai.">
          <Text style={[type.small, { color: colors.good, fontWeight: '700' }]}>On</Text>
        </Row>
      </Card>

      <SectionTitle>Privacy & your data</SectionTitle>
      <Card>
        <Text style={type.body}>Under India's DPDP Act 2023 you're the Data Principal. That means:</Text>
        <Bullet>We use your transactions for one purpose: showing your budget and insights.</Bullet>
        <Bullet>We store amount, merchant, time and category. Never passwords, PINs, OTPs, or your SMS inbox.</Bullet>
        <Bullet>Everything stays on this phone in this version. Nothing is sold or shared.</Bullet>
        <Bullet>You can export or delete everything, any time, right here.</Bullet>
        <Text style={[type.tiny, { marginTop: space(3) }]}>
          Consent given {consent.givenAt ? new Date(consent.givenAt).toLocaleString('en-IN') : '—'} · budgeting: {consent.budgetingPurpose ? 'yes' : 'no'} · SMS: {consent.smsParsing ? 'yes' : 'no'} · AA: {consent.accountAggregator ? 'yes' : 'no'}
        </Text>
        <Button label="Export my data" kind="secondary" style={{ marginTop: space(4) }} onPress={exportData} />
        <Button label="Delete all my data" kind="danger" style={{ marginTop: space(3) }} onPress={confirmDelete} />
      </Card>
      <Text style={[type.tiny, { textAlign: 'center', marginTop: space(6) }]}>DailyBudget MVP · local-first · v0.1</Text>
    </ScrollView>
  );
}

function Row({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, marginRight: space(3) }}>
        <Text style={[type.body, { fontWeight: '600' }]}>{title}</Text>
        {sub ? <Text style={type.small}>{sub}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function ToggleRow({ title, sub, value, onChange }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row title={title} sub={sub}>
      <Toggle value={value} onValueChange={onChange} />
    </Row>
  );
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (s: string) => void }) {
  return (
    <View style={{ marginBottom: space(3) }}>
      <Text style={[type.tiny, { fontWeight: '700', marginBottom: 4 }]}>{label.toUpperCase()}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType="numeric" style={styles.input} />
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', marginTop: space(2) }}>
      <Text style={[type.small, { marginRight: space(2) }]}>•</Text>
      <Text style={[type.small, { flex: 1 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(3) },
  seg: { flexDirection: 'row', flexWrap: 'wrap' },
  notif: { backgroundColor: colors.card, borderRadius: radius.md, padding: space(3), marginBottom: space(2), borderWidth: 1, borderColor: colors.line },
  notifApp: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  notifTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 4 },
  notifBody: { fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space(3), fontSize: 16, color: colors.ink, backgroundColor: colors.bg },
});
