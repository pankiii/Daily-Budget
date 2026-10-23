import React, { useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { bestStreak } from '../domain/budget';
import { CATEGORIES } from '../domain/categories';
import { addDays, dayKey, monthName, prettyDay } from '../domain/dates';
import {
  categoryBreakdown,
  formatHours,
  hoursOfWork,
  merchantBreakdown,
  topLeaks,
  weeklyReality,
  whatIfCut,
} from '../domain/insights';
import { formatINR } from '../domain/money';
import { useApp } from '../state/store';
import { Bar, Button, Card, Chip, SectionTitle } from '../ui/components/common';
import { t } from '../ui/i18n';
import { colors, radius, space, type } from '../ui/theme';

type Range = 'week' | 'month';

export function InsightsScreen() {
  const { state, view } = useApp();
  const { lang, tone } = state.settings;
  const [range, setRange] = useState<Range>('month');

  const monthStart = view.ledger[0].date;
  const from = range === 'month' ? monthStart : [dayKey(addDays(view.now, -6)), monthStart].sort()[1];
  const to = view.todayKey;
  const daysElapsed = view.ledger.length;

  const cats = useMemo(() => categoryBreakdown(view.txns, from, to), [view.txns, from, to]);
  const merchants = useMemo(() => merchantBreakdown(view.txns, from, to), [view.txns, from, to]);
  const leaks = useMemo(() => topLeaks(merchantBreakdown(view.txns, monthStart, to)), [view.txns, monthStart, to]);
  const total = cats.reduce((s, c) => s + c.amount, 0);
  const budgetInRange = view.ledger.filter((d) => d.date >= from).reduce((s, d) => s + d.budget, 0);
  const reality = useMemo(() => weeklyReality(view.ledger, view.txns, view.streak), [view.ledger, view.txns, view.streak]);
  const best = bestStreak(view.ledger);

  const shareCard = () => {
    if (!reality) return;
    const lines = [
      `📉 My DailyBudget reality check (${prettyDay(reality.from, '')} – ${prettyDay(reality.to, '')})`,
      `Under budget ${reality.daysUnder}/${reality.daysTotal} days · 🔥 ${reality.streak}-day streak`,
      reality.worstDay
        ? `Worst impulse day: ${prettyDay(reality.worstDay.date, '')} — ${formatINR(reality.worstDay.over)} over${reality.worstDay.topMerchant ? ` (thanks, ${reality.worstDay.topMerchant})` : ''}`
        : 'No over-budget days. Who even am I?',
      '',
      'Spend daily, not monthly.',
    ];
    // Amounts the user chooses to share are their call; no account or bank info is ever included.
    Share.share({ message: lines.join('\n') }).catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}>
      <Text style={type.h1}>{t('whereDidItGo', lang)}</Text>
      <View style={styles.toggle}>
        <Chip label="This week" active={range === 'week'} onPress={() => setRange('week')} />
        <Chip label={`${monthName(view.now.getMonth())} so far`} active={range === 'month'} onPress={() => setRange('month')} />
      </View>

      <Card>
        <Text style={type.small}>Spent</Text>
        <Text style={type.hero}>{formatINR(total)}</Text>
        <Text style={type.small}>
          vs {formatINR(budgetInRange)} budgeted · that's{' '}
          <Text style={{ fontWeight: '700', color: colors.ink }}>{formatHours(hoursOfWork(total, state.profile))}</Text> of work
        </Text>

        {/* Stacked share bar */}
        <View style={styles.stack}>
          {cats.map((c) => (
            <View key={c.category} style={{ flex: c.share, backgroundColor: CATEGORIES[c.category].color }} />
          ))}
        </View>

        {cats.map((c) => {
          const meta = CATEGORIES[c.category];
          return (
            <View key={c.category} style={styles.catRow}>
              <Text style={styles.catEmoji}>{meta.emoji}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.catHead}>
                  <Text style={[type.body, { fontWeight: '600' }]}>{lang === 'en' ? meta.label : meta.hinglish}</Text>
                  <Text style={[type.body, { fontWeight: '700' }]}>{formatINR(c.amount)}</Text>
                </View>
                <Bar value={c.amount} max={cats[0].amount} color={meta.color} />
                <Text style={[type.tiny, { marginTop: 4 }]}>
                  {c.count} payment{c.count === 1 ? "" : "s"} · {Math.round(c.share * 100)}% · {formatHours(hoursOfWork(c.amount, state.profile))} of your life
                </Text>
              </View>
            </View>
          );
        })}
        {cats.length === 0 ? <Text style={[type.small, { marginTop: space(3) }]}>No spends in this range.</Text> : null}
      </Card>

      <SectionTitle>{t('topLeaks', lang)}</SectionTitle>
      {leaks.map((m, i) => {
        const cut = whatIfCut(m.amount, daysElapsed, view.plan.daysInMonth, 0.5);
        const hrs = formatHours(hoursOfWork(m.amount, state.profile));
        return (
          <Card key={m.merchantKey} style={{ marginBottom: space(3) }}>
            <View style={styles.leakHead}>
              <Text style={styles.leakRank}>#{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={type.h2}>
                  {CATEGORIES[m.category].emoji} {m.merchant}
                </Text>
                <Text style={type.small}>
                  {m.count} order{m.count === 1 ? "" : "s"} · avg {formatINR(Math.round(m.amount / Math.max(1, m.count)))}
                </Text>
              </View>
              <Text style={type.h2}>{formatINR(m.amount)}</Text>
            </View>
            <Text style={[type.body, { marginTop: space(3) }]}>
              {m.merchant} this month = <Text style={{ fontWeight: '800' }}>{hrs}</Text> of your life
              {tone === 'roast' ? '. Worth it? Be honest.' : '.'}
            </Text>
            <View style={styles.whatIf}>
              <Text style={[type.small, { color: colors.good, fontWeight: '700' }]}>WHAT IF</Text>
              <Text style={type.body}>
                Cut {m.merchant} by half → <Text style={{ fontWeight: '800', color: colors.good }}>{formatINR(cut.perYear)}</Text> extra saved per year
                ({formatINR(cut.perMonth)}/month).
              </Text>
            </View>
          </Card>
        );
      })}

      <SectionTitle>{t('realityCheck', lang)}</SectionTitle>
      {reality ? (
        <View style={styles.reality}>
          <Text style={styles.realityKicker}>
            {prettyDay(reality.from, '')} – {prettyDay(reality.to, '')}
          </Text>
          <View style={styles.realityStats}>
            <View style={{ flex: 1 }}>
              <Text style={styles.realityBig}>🔥 {reality.streak}</Text>
              <Text style={styles.realitySmall}>day streak under budget (best: {best})</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.realityBig}>
                {reality.daysUnder}/{reality.daysTotal}
              </Text>
              <Text style={styles.realitySmall}>days under budget</Text>
            </View>
          </View>
          {reality.worstDay ? (
            <View style={styles.worst}>
              <Text style={styles.realitySmall}>WORST IMPULSE DAY</Text>
              <Text style={styles.realityMid}>
                {prettyDay(reality.worstDay.date, '')}: {formatINR(reality.worstDay.spent)} vs {formatINR(reality.worstDay.budget)}
              </Text>
              <Text style={styles.realitySmall}>
                {formatINR(reality.worstDay.over)} over
                {reality.worstDay.topMerchant ? ` · main character: ${reality.worstDay.topMerchant}` : ''}
              </Text>
            </View>
          ) : (
            <Text style={[styles.realityMid, { marginTop: space(3) }]}>Zero over-budget days. Frame this.</Text>
          )}
          <Text style={[styles.realitySmall, { marginTop: space(3) }]}>
            Spent {formatINR(reality.spent)} of {formatINR(reality.budget)} this week
          </Text>
          <Button label="Share my reality check" kind="secondary" onPress={shareCard} style={{ marginTop: space(4) }} />
        </View>
      ) : (
        <Card>
          <Text style={type.small}>Come back tomorrow — your first reality check needs one full day.</Text>
        </Card>
      )}

      <SectionTitle>Top merchants ({range === 'week' ? 'week' : 'month'})</SectionTitle>
      <Card>
        {merchants.slice(0, 8).map((m) => (
          <View key={m.merchantKey} style={styles.merchRow}>
            <Text style={type.body} numberOfLines={1}>
              {CATEGORIES[m.category].emoji} {m.merchant} <Text style={type.tiny}>×{m.count}</Text>
            </Text>
            <Text style={[type.body, { fontWeight: '600' }]}>{formatINR(m.amount)}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', marginTop: space(3), marginBottom: space(2) },
  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginTop: space(4), marginBottom: space(2), backgroundColor: colors.track },
  catRow: { flexDirection: 'row', marginTop: space(4) },
  catEmoji: { fontSize: 20, width: 32 },
  catHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space(2) },
  leakHead: { flexDirection: 'row', alignItems: 'center' },
  leakRank: { fontSize: 22, fontWeight: '900', color: colors.bad, width: 40 },
  whatIf: { marginTop: space(3), backgroundColor: colors.goodSoft, borderRadius: radius.md, padding: space(3) },
  reality: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: space(5) },
  realityKicker: { color: '#A8A29E', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  realityStats: { flexDirection: 'row', marginTop: space(4) },
  realityBig: { color: '#fff', fontSize: 30, fontWeight: '900' },
  realityMid: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 2 },
  realitySmall: { color: '#D6D3D1', fontSize: 12, marginTop: 2 },
  worst: { marginTop: space(4), padding: space(3), borderRadius: radius.md, backgroundColor: '#3F1D1D' },
  merchRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space(2) },
});
