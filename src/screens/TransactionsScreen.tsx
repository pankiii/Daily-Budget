import React, { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { dayKeyOfIso, prettyDay } from '../domain/dates';
import { formatINR } from '../domain/money';
import { effectiveSpend } from '../domain/reconcile';
import { Txn } from '../domain/types';
import { useApp } from '../state/store';
import { Chip, TxnRow } from '../ui/components/common';
import { colors, radius, space, type } from '../ui/theme';

type Filter = 'all' | 'counted' | 'handled';

export function TransactionsScreen({ onOpenTxn }: { onOpenTxn: (id: string) => void }) {
  const { view } = useApp();
  const [filter, setFilter] = useState<Filter>('all');

  const ledgerByDate = useMemo(() => new Map(view.ledger.map((d) => [d.date, d])), [view.ledger]);

  const sections = useMemo(() => {
    const keep = (x: Txn) => {
      const counted = effectiveSpend(x, view.byId) !== 0;
      if (filter === 'counted') return counted;
      if (filter === 'handled') return !counted || x.myShare != null || x.kind === 'refund';
      return true;
    };
    const groups = new Map<string, Txn[]>();
    for (const x of [...view.txns].sort((a, b) => b.at.localeCompare(a.at))) {
      if (!keep(x)) continue;
      const k = dayKeyOfIso(x.at);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(x);
    }
    return [...groups.entries()].map(([date, data]) => ({ date, data }));
  }, [view.txns, view.byId, filter]);

  const handledCount = useMemo(
    () => view.txns.filter((x) => effectiveSpend(x, view.byId) === 0 || x.myShare != null || x.kind === 'refund').length,
    [view.txns, view.byId],
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(x) => x.id}
      contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}
      stickySectionHeadersEnabled={false}
      initialNumToRender={20}
      windowSize={7}
      ListHeaderComponent={
        <View>
          <Text style={type.h1}>Spends</Text>
          <Text style={[type.small, { marginTop: 4 }]}>
            Everything from your bank, SMS and manual entries, merged. Duplicates, failed payments and reversals are handled
            for you — {handledCount} this month.
          </Text>
          <View style={styles.filters}>
            <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label="Counted" active={filter === 'counted'} onPress={() => setFilter('counted')} />
            <Chip label={`Handled for you (${handledCount})`} active={filter === 'handled'} onPress={() => setFilter('handled')} />
          </View>
        </View>
      }
      renderSectionHeader={({ section }) => {
        const d = ledgerByDate.get(section.date);
        const over = d ? d.spent - d.budget : 0;
        return (
          <View style={styles.dayHeader}>
            <Text style={[type.body, { fontWeight: '700' }]}>{prettyDay(section.date, view.todayKey)}</Text>
            {d ? (
              <Text style={[type.small, { color: over > 0 ? colors.bad : colors.good, fontWeight: '600' }]}>
                {formatINR(d.spent)} / {formatINR(d.budget)} {over > 0 ? `· ${formatINR(over)} over` : '✓'}
              </Text>
            ) : null}
          </View>
        );
      }}
      renderItem={({ item, index }) => (
        <View style={[styles.item, index === 0 && styles.first]}>
          <TxnRow txn={item} byId={view.byId} onPress={() => onOpenTxn(item.id)} />
        </View>
      )}
      renderSectionFooter={() => <View style={styles.sectionEnd} />}
      ListEmptyComponent={<Text style={[type.small, { textAlign: 'center', marginTop: space(8) }]}>Nothing here yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space(4) },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space(4), marginBottom: space(2) },
  item: { backgroundColor: colors.card, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line, paddingHorizontal: space(2), borderTopWidth: 1, borderTopColor: colors.line },
  first: { borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
  sectionEnd: { height: 1, backgroundColor: colors.line, marginBottom: space(1) },
});
