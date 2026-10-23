import React from 'react';
import { Pressable, StyleProp, StyleSheet, Switch, SwitchProps, Text, View, ViewStyle } from 'react-native';
import { CATEGORIES } from '../../domain/categories';
import { prettyTime } from '../../domain/dates';
import { formatINR } from '../../domain/money';
import { countingNote, effectiveSpend, sourceLabel } from '../../domain/reconcile';
import { Txn } from '../../domain/types';
import { colors, radius, space, type } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={type.h2}>{children}</Text>
      {right}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color = colors.brand,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
      hitSlop={6}
    >
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = kind === 'primary' ? colors.brand : kind === 'danger' ? colors.bad : colors.brandSoft;
  const fg = kind === 'secondary' ? colors.brand : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }, style]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ label, color, soft }: { label: string; color: string; soft: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: soft }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[type.small, { color, fontWeight: '700' }]}>{label}</Text>
    </View>
  );
}

export function TxnRow({ txn, byId, onPress }: { txn: Txn; byId: Map<string, Txn>; onPress?: () => void }) {
  const cat = CATEGORIES[txn.category];
  const counted = effectiveSpend(txn, byId);
  const note = countingNote(txn, byId);
  const ignored = counted === 0;
  // Strike through only money that never really moved; fixed costs and income are just dimmed.
  const voided = ignored && (!!txn.duplicateOf || txn.status === 'failed' || txn.status === 'reversed' || txn.kind === 'reversal');
  const credit = counted < 0 || txn.direction === 'credit';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg }]} accessibilityRole="button">
      <View style={[styles.icon, { backgroundColor: cat.color + '22' }]}>
        <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
      </View>
      <View style={{ flex: 1, marginRight: space(2) }}>
        <Text style={[type.body, { fontWeight: '600' }, ignored && styles.dim]} numberOfLines={1}>
          {txn.merchant}
        </Text>
        <Text style={type.tiny} numberOfLines={1}>
          {prettyTime(txn.at)} · {cat.label} · {sourceLabel(txn.source)}
          {txn.categorySource === 'user' ? ' · ✓ you' : ''}
        </Text>
        {note ? (
          <Text style={[type.tiny, { color: ignored ? colors.muted : colors.brand, marginTop: 2 }]} numberOfLines={1}>
            {note}
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          type.body,
          { fontWeight: '700', color: credit ? colors.good : colors.ink },
          ignored && styles.dim,
          voided && styles.strike,
        ]}
      >
        {credit ? '+' : '−'}
        {formatINR(ignored ? txn.amount : Math.abs(counted))}
      </Text>
    </Pressable>
  );
}

export function Bar({ value, max, color, marker }: { value: number; max: number; color: string; marker?: number }) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      {marker != null && max > 0 ? <View style={[styles.marker, { left: `${Math.min(1, marker / max) * 100}%` }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space(4), borderWidth: 1, borderColor: colors.line },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space(6), marginBottom: space(3) },
  chip: { paddingHorizontal: space(3), paddingVertical: space(2), borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, marginRight: space(2), marginBottom: space(2) },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.inkSoft },
  button: { borderRadius: radius.md, paddingVertical: space(4), alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(3), paddingVertical: space(1) + 2, borderRadius: radius.pill, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: space(2) },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(3), paddingHorizontal: space(1), minHeight: 56 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: space(3) },
  dim: { color: colors.muted },
  strike: { textDecorationLine: 'line-through' },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: colors.track, overflow: 'visible', justifyContent: 'center' },
  barFill: { height: 10, borderRadius: 5 },
  marker: { position: 'absolute', width: 3, height: 18, borderRadius: 2, backgroundColor: colors.ink, marginLeft: -1.5 },
});

/** Brand-coloured switch. `activeThumbColor` is react-native-web only (otherwise it renders teal). */
export function Toggle(props: SwitchProps) {
  const webOnly = { activeThumbColor: '#FFFFFF' } as object;
  return <Switch trackColor={{ true: colors.brand, false: colors.line }} thumbColor="#FFFFFF" {...webOnly} {...props} />;
}
