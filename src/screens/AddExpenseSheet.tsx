import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CATEGORIES, CATEGORY_ORDER } from '../domain/categories';
import { resolveMerchant } from '../domain/categorize';
import { formatINR, parseINR } from '../domain/money';
import { CategoryId } from '../domain/types';
import { useApp } from '../state/store';
import { Button, Chip, Toggle } from '../ui/components/common';
import { colors, radius, space, type } from '../ui/theme';

const QUICK = ['Chai', 'Coffee', 'Blinkit', 'Zepto', 'Swiggy', 'Zomato', 'Uber', 'Rapido', 'Amazon', 'Auto'];

/** Manual entry: the always-works fallback (no bank link, no SMS permission, cash). */
export function AddExpenseSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { addManual, state, view } = useApp();
  const [amountText, setAmountText] = useState('');
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [split, setSplit] = useState(false);
  const [shareText, setShareText] = useState('');

  const amount = parseINR(amountText);
  const share = split ? parseINR(shareText) : null;
  const guess = useMemo(() => (label.trim() ? resolveMerchant(label, state.categoryOverrides) : null), [label, state.categoryOverrides]);
  const effectiveCategory = category ?? guess?.category ?? 'other';
  const valid = !!amount && amount > 0 && !!label.trim() && (!split || (!!share && share > 0 && share <= amount));
  const counted = split && share ? share : amount ?? 0;
  const leftAfter = view.today.remaining - counted;

  const reset = () => {
    setAmountText('');
    setLabel('');
    setCategory(null);
    setSplit(false);
    setShareText('');
  };

  const save = () => {
    if (!valid || !amount) return;
    addManual({ amount, label: label.trim(), category: category ?? undefined, myShare: split && share ? share : undefined });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space(4) }}>
            <Text style={type.h1}>Add expense</Text>
            <Text style={[type.small, { marginTop: 4 }]}>Cash, or something the bank hasn't sent yet. We'll merge it when it does.</Text>

            <View style={styles.amountRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                placeholder="0"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                autoFocus
                accessibilityLabel="Amount in rupees"
              />
            </View>

            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="What was it? (e.g. Blinkit, chai, auto)"
              placeholderTextColor={colors.muted}
              style={styles.input}
              accessibilityLabel="Merchant or description"
            />
            <View style={styles.wrap}>
              {QUICK.map((q) => (
                <Chip key={q} label={q} active={label === q} onPress={() => setLabel(q)} />
              ))}
            </View>

            <Text style={[type.tiny, styles.label]}>CATEGORY {guess && !category ? `· auto: ${CATEGORIES[guess.category].label}` : ''}</Text>
            <View style={styles.wrap}>
              {CATEGORY_ORDER.map((c) => (
                <Chip
                  key={c}
                  label={`${CATEGORIES[c].emoji} ${CATEGORIES[c].label}`}
                  active={effectiveCategory === c}
                  color={CATEGORIES[c].color}
                  onPress={() => setCategory(c)}
                />
              ))}
            </View>

            <View style={styles.splitRow}>
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { fontWeight: '600' }]}>Split with friends</Text>
                <Text style={type.small}>Only your share counts against today.</Text>
              </View>
              <Toggle value={split} onValueChange={setSplit} />
            </View>
            {split ? (
              <TextInput
                value={shareText}
                onChangeText={setShareText}
                placeholder="Your share, e.g. 400"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={styles.input}
                accessibilityLabel="Your share in rupees"
              />
            ) : null}

            {amount ? (
              <Text style={[type.small, { marginTop: space(3), color: leftAfter < 0 ? colors.bad : colors.inkSoft }]}>
                After this: {leftAfter < 0 ? `${formatINR(-leftAfter)} over today` : `${formatINR(leftAfter)} left today`}
              </Text>
            ) : null}

            <Button label="Add" onPress={save} disabled={!valid} style={{ marginTop: space(4) }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space(5), maxHeight: '92%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: space(3) },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: space(4) },
  rupee: { fontSize: 36, fontWeight: '800', color: colors.inkSoft, marginRight: space(1) },
  amountInput: { flex: 1, minWidth: 0, fontSize: 44, fontWeight: '800', color: colors.ink, paddingVertical: space(1) },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space(3), fontSize: 16, color: colors.ink, marginTop: space(3), backgroundColor: colors.bg },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space(3) },
  label: { marginTop: space(3), fontWeight: '700' },
  splitRow: { flexDirection: 'row', alignItems: 'center', marginTop: space(3) },
});
