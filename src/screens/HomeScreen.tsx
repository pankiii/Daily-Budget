import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { middayMessage, morningMessage, nightMessage } from '../domain/copy';
import { dayKeyOfIso, monthName } from '../domain/dates';
import { formatINR } from '../domain/money';
import { useApp } from '../state/store';
import { BudgetRing } from '../ui/components/BudgetRing';
import { Bar, Card, Pill, SectionTitle, TxnRow } from '../ui/components/common';
import { t } from '../ui/i18n';
import { PACE_META, colors, radius, space, type } from '../ui/theme';
import { AddExpenseSheet } from './AddExpenseSheet';

function greeting(h: number) {
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen({ onOpenTxn }: { onOpenTxn: (id: string) => void }) {
  const { state, view } = useApp();
  const { today, plan, pace, streak, now } = view;
  const { lang, tone } = state.settings;
  const [adding, setAdding] = useState(false);

  const todays = useMemo(
    () => view.txns.filter((x) => dayKeyOfIso(x.at) === view.todayKey).sort((a, b) => b.at.localeCompare(a.at)),
    [view.txns, view.todayKey],
  );

  // The same copy the scheduled push would carry — shown in-app as a "status line".
  const status = useMemo(() => {
    const seed = view.todayKey;
    const h = now.getHours();
    if (h >= 20) return nightMessage({ budget: today.budget, spent: today.spent, streak: streak + (today.remaining >= 0 ? 1 : 0) }, tone, lang, seed);
    if (h >= 11 || today.spent > 0) return middayMessage({ budget: today.budget, spent: today.spent }, tone, lang);
    return morningMessage({ budget: today.budget, rollover: today.rollover, name: state.profile.name, streak }, tone, lang, seed);
  }, [view.todayKey, now, today, streak, tone, lang, state.profile.name]);

  const paceMeta = PACE_META[pace.status];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={type.small}>
              {now.getDate()} {monthName(now.getMonth())} · Day {today.dayOfMonth} of {plan.daysInMonth}
            </Text>
            <Text style={type.h1}>
              {greeting(now.getHours())}, {state.profile.name} 👋
            </Text>
          </View>
          {streak > 0 ? (
            <View style={styles.streak} accessibilityLabel={`${streak} ${t('streak', lang)}`}>
              <Text style={styles.streakText}>🔥 {streak}</Text>
            </View>
          ) : null}
        </View>

        {state.isDemo ? (
          <View style={styles.demo}>
            <Text style={[type.tiny, { color: colors.brand, fontWeight: '700' }]}>DEMO DATA · bank linking arrives with the backend</Text>
          </View>
        ) : null}

        <View style={styles.ringWrap}>
          <BudgetRing budget={today.budget} spent={today.spent} lang={lang} />
          {today.rollover !== 0 ? (
            <Text style={[type.small, styles.rollover, { color: today.rollover > 0 ? colors.good : colors.warn }]}>
              {today.rollover > 0 ? '+' : '−'}
              {formatINR(Math.abs(today.rollover))} {today.rollover > 0 ? t('rolledIn', lang) : t('rolledOut', lang)}
            </Text>
          ) : null}
        </View>

        <Card style={styles.statusCard}>
          <Text style={[type.body, { fontWeight: '700' }]}>{status.title}</Text>
          <Text style={[type.small, { marginTop: 2 }]}>{status.body}</Text>
        </Card>

        <View style={styles.stats}>
          <Stat label={t('spentToday', lang)} value={formatINR(today.spent)} />
          <Stat label={t('monthLeft', lang)} value={formatINR(pace.leftForMonth)} tone={pace.leftForMonth < 0 ? 'bad' : undefined} />
          <Stat label="Real / day" value={formatINR(plan.baseDaily)} sub={`not ${formatINR(plan.rawDaily)}`} />
        </View>

        <Card style={{ marginTop: space(3) }}>
          <View style={styles.paceHead}>
            <Text style={[type.body, { fontWeight: '700' }]}>{t('pace', lang)}</Text>
            <Pill label={lang === 'en' ? paceMeta.label : paceMeta.hinglish} color={paceMeta.color} soft={paceMeta.soft} />
          </View>
          <Bar value={pace.spentSoFar} max={plan.spendable} color={paceMeta.color} marker={pace.expectedByToday} />
          <Text style={[type.small, { marginTop: space(3) }]}>
            {formatINR(pace.spentSoFar)} of {formatINR(plan.spendable)} spent · the marker is where an even pace would be today.
          </Text>
          <Text style={[type.small, { marginTop: 2 }]}>
            At this rate: <Text style={{ fontWeight: '700', color: paceMeta.color }}>{formatINR(pace.projectedMonthSpend)}</Text> by month end
            {pace.projectedMonthSpend > plan.spendable ? ` (${formatINR(pace.projectedMonthSpend - plan.spendable)} into savings)` : ''}.
          </Text>
        </Card>

        <SectionTitle right={<Text style={type.small}>{todays.length} items</Text>}>{t('todaysSpends', lang)}</SectionTitle>
        <Card style={{ paddingVertical: space(1) }}>
          {todays.length === 0 ? (
            <Text style={[type.small, { paddingVertical: space(4), textAlign: 'center' }]}>{t('nothingYet', lang)}</Text>
          ) : (
            todays.map((x, i) => (
              <View key={x.id} style={i > 0 ? styles.divider : undefined}>
                <TxnRow txn={x} byId={view.byId} onPress={() => onOpenTxn(x.id)} />
              </View>
            ))
          )}
        </Card>
        <View style={{ height: 96 }} />
      </ScrollView>

      <Pressable style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]} onPress={() => setAdding(true)} accessibilityRole="button" accessibilityLabel={t('add', lang)}>
        <Text style={styles.fabText}>＋ {t('add', lang)}</Text>
      </Pressable>
      <AddExpenseSheet visible={adding} onClose={() => setAdding(false)} />
    </View>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'bad' }) {
  return (
    <View style={styles.stat}>
      <Text style={type.tiny} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[type.h2, { marginTop: 2 }, tone === 'bad' && { color: colors.bad }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={[type.tiny, { marginTop: 1 }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space(4) },
  header: { flexDirection: 'row', alignItems: 'center' },
  streak: { backgroundColor: colors.warnSoft, borderRadius: radius.pill, paddingHorizontal: space(3), paddingVertical: space(1) + 2 },
  streakText: { fontWeight: '800', color: colors.warn, fontSize: 15 },
  demo: { marginTop: space(3), backgroundColor: colors.brandSoft, borderRadius: radius.sm, paddingVertical: space(1) + 2, paddingHorizontal: space(3), alignSelf: 'flex-start' },
  ringWrap: { alignItems: 'center', marginTop: space(5) },
  rollover: { marginTop: space(3), fontWeight: '600' },
  statusCard: { marginTop: space(4), backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
  stats: { flexDirection: 'row', marginTop: space(3), gap: space(2) },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: space(3), borderWidth: 1, borderColor: colors.line },
  paceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(3) },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  fab: { position: 'absolute', right: space(4), bottom: space(4), backgroundColor: colors.brand, borderRadius: radius.pill, paddingHorizontal: space(5), paddingVertical: space(4), shadowColor: colors.brand, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
