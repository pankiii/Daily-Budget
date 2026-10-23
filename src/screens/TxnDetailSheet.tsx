import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CATEGORIES, CATEGORY_ORDER } from '../domain/categories';
import { prettyDay, prettyTime, dayKeyOfIso } from '../domain/dates';
import { formatINR, parseINR } from '../domain/money';
import { countingNote, effectiveSpend, sourceLabel } from '../domain/reconcile';
import { useApp } from '../state/store';
import { Button, Chip, Toggle } from '../ui/components/common';
import { colors, radius, space, type } from '../ui/theme';

/** Fix a category (remembered per merchant), set a split share, or mark as a fixed cost. */
export function TxnDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { view, recategorize, setShare, setFixed, deleteTxn } = useApp();
  const txn = id ? view.byId.get(id) : undefined;
  const [shareText, setShareText] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    setShareText(txn?.myShare != null ? String(txn.myShare / 100) : '');
    setSaved(null);
  }, [id]);

  if (!txn) return null;
  const counted = effectiveSpend(txn, view.byId);
  const note = countingNote(txn, view.byId);
  const isDebitSpend = txn.direction === 'debit' && (txn.kind === 'spend' || txn.kind === 'fixed');
  const sameMerchant = view.txns.filter((x) => x.merchantKey === txn.merchantKey).length;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <ScrollView>
          <Text style={type.h1}>{txn.merchant}</Text>
          <Text style={[type.small, { marginTop: 2 }]}>
            {prettyDay(dayKeyOfIso(txn.at), view.todayKey)}, {prettyTime(txn.at)} · from {sourceLabel(txn.source)}
            {txn.accountLast4 ? ` ··${txn.accountLast4}` : ''}
          </Text>
          <Text style={[type.hero, { marginTop: space(3) }]}>{formatINR(txn.amount, { decimals: txn.amount % 100 !== 0 })}</Text>
          <Text style={[type.small, { color: counted === 0 ? colors.muted : colors.ink }]}>
            Counts against budget: <Text style={{ fontWeight: '700' }}>{formatINR(counted)}</Text>
          </Text>
          {note ? <Text style={[type.small, { color: colors.brand, marginTop: 2 }]}>{note}</Text> : null}
          <Text style={[type.tiny, { marginTop: space(2) }]} numberOfLines={2}>
            Raw: {txn.rawMerchant}
          </Text>

          <Text style={[type.tiny, styles.label]}>CATEGORY</Text>
          <View style={styles.wrap}>
            {CATEGORY_ORDER.map((c) => (
              <Chip
                key={c}
                label={`${CATEGORIES[c].emoji} ${CATEGORIES[c].label}`}
                active={txn.category === c}
                color={CATEGORIES[c].color}
                onPress={() => {
                  recategorize(txn.merchantKey, c);
                  setSaved(`Got it. All ${sameMerchant > 1 ? `${sameMerchant} ` : ''}${txn.merchant} payments, past and future, are now ${CATEGORIES[c].label}.`);
                }}
              />
            ))}
          </View>
          {saved ? <Text style={[type.small, { color: colors.good }]}>{saved}</Text> : null}

          {isDebitSpend ? (
            <>
              <Text style={[type.tiny, styles.label]}>SPLIT</Text>
              <View style={styles.row}>
                <TextInput
                  value={shareText}
                  onChangeText={setShareText}
                  placeholder={`Your share (of ${formatINR(txn.amount)})`}
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
                <Button
                  label="Save"
                  kind="secondary"
                  style={{ marginLeft: space(2), paddingHorizontal: space(5) }}
                  onPress={() => {
                    const v = shareText.trim() ? parseINR(shareText) : null;
                    setShare(txn.id, v != null && v > 0 && v < txn.amount ? v : undefined);
                  }}
                />
              </View>

              <View style={[styles.row, { marginTop: space(4) }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { fontWeight: '600' }]}>Already in my fixed costs</Text>
                  <Text style={type.small}>Rent, EMI, SIP, maid… Won't count against the daily budget.</Text>
                </View>
                <Toggle value={txn.kind === 'fixed'} onValueChange={(v) => setFixed(txn.merchantKey, v)} />
              </View>
            </>
          ) : null}

          {txn.source === 'manual' ? (
            <Button label="Delete this entry" kind="danger" style={{ marginTop: space(6) }} onPress={() => { deleteTxn(txn.id); onClose(); }} />
          ) : null}
          <Button label="Done" kind="secondary" style={{ marginTop: space(3) }} onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90%', backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space(5) },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: space(3) },
  label: { marginTop: space(5), marginBottom: space(2), fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space(3), fontSize: 16, color: colors.ink, backgroundColor: colors.bg },
});
