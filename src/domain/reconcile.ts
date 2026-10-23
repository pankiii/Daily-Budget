import { formatINR } from './money';
import { dayKeyOfIso } from './dates';
import { Paise, Txn, TxnSource } from './types';

/**
 * Reconciler: turns a messy multi-source feed into "money that actually left your pocket".
 *
 * The same ₹600 Blinkit payment can arrive three times: AA (bank statement), SMS, and a
 * manual entry the user typed before either showed up. Banks also emit failed debits,
 * auto-reversals, and merchant refunds weeks later. Rules:
 *
 *   1. Duplicates   – same UPI ref (or same amount/account within a time window) across sources.
 *                     Keep the most authoritative row (AA > SMS > manual) and copy the user's
 *                     edits (category, split, note) onto it so nothing they did is lost.
 *   2. Failed       – never counted.
 *   3. Reversals    – bank credit that cancels a debit. Original marked `reversed`; both count 0.
 *   4. Refunds      – merchant credit. Counts as negative spend *on the day it lands*
 *                     (past days are closed; rewriting them would change yesterday's streak).
 *   5. Splits       – only `myShare` counts. Refunds on a split txn are pro-rated.
 */

const PRIORITY: Record<TxnSource, number> = { aa: 3, sms: 2, manual: 1 };
const AUTO_DUP_WINDOW_MS = 15 * 60 * 1000;
const MANUAL_DUP_WINDOW_MS = 12 * 60 * 60 * 1000;
const REVERSAL_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;
const REFUND_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

const t = (x: Txn) => new Date(x.at).getTime();

function absorbUserEdits(keep: Txn, drop: Txn) {
  if (drop.categorySource === 'user' && keep.categorySource !== 'user') {
    keep.category = drop.category;
    keep.categorySource = 'user';
  }
  if (drop.myShare != null && keep.myShare == null) keep.myShare = drop.myShare;
  if (drop.note && !keep.note) keep.note = drop.note;
}

function isDuplicatePair(a: Txn, b: Txn): boolean {
  if (a.source === b.source) return false;
  if (a.direction !== b.direction || a.amount !== b.amount || a.kind !== b.kind) return false;
  if (a.upiRef && b.upiRef) return a.upiRef === b.upiRef;
  if (a.accountLast4 && b.accountLast4 && a.accountLast4 !== b.accountLast4) return false;
  const manual = a.source === 'manual' || b.source === 'manual';
  const window = manual ? MANUAL_DUP_WINDOW_MS : AUTO_DUP_WINDOW_MS;
  if (Math.abs(t(a) - t(b)) > window) return false;
  // Manual entries carry no ref, so also require the merchant to agree.
  return manual ? a.merchantKey === b.merchantKey : true;
}

export function reconcile(input: Txn[]): Txn[] {
  const txns: Txn[] = input.map((x) => ({ ...x, duplicateOf: undefined }));
  txns.sort((a, b) => t(a) - t(b));

  // 1. Duplicates — highest-priority rows claim lower-priority twins.
  const byPriority = [...txns].sort((a, b) => PRIORITY[b.source] - PRIORITY[a.source] || t(a) - t(b));
  for (const keep of byPriority) {
    if (keep.duplicateOf) continue;
    for (const other of txns) {
      if (other === keep || other.duplicateOf || PRIORITY[other.source] >= PRIORITY[keep.source]) continue;
      if (isDuplicatePair(keep, other)) {
        other.duplicateOf = keep.id;
        absorbUserEdits(keep, other);
      }
    }
  }
  const live = txns.filter((x) => !x.duplicateOf);

  // 2 & 3. Reversals cancel their debit.
  for (const rev of live.filter((x) => x.kind === 'reversal' && x.direction === 'credit')) {
    const match =
      (rev.upiRef && live.find((d) => d.direction === 'debit' && d.upiRef === rev.upiRef && d.status !== 'reversed')) ||
      live.find(
        (d) =>
          d.direction === 'debit' &&
          d.kind === 'spend' &&
          d.status !== 'reversed' &&
          d.amount === rev.amount &&
          (!rev.accountLast4 || !d.accountLast4 || d.accountLast4 === rev.accountLast4) &&
          t(rev) >= t(d) &&
          t(rev) - t(d) <= REVERSAL_WINDOW_MS,
      );
    if (match) {
      match.status = 'reversed';
      rev.linkedTo = match.id;
    }
  }

  // 4. Refunds link back to the most recent eligible purchase from the same merchant.
  for (const ref of live.filter((x) => x.kind === 'refund' && x.direction === 'credit' && !x.linkedTo)) {
    const candidates = live.filter(
      (d) =>
        d.direction === 'debit' &&
        d.kind === 'spend' &&
        d.status === 'success' &&
        d.merchantKey === ref.merchantKey &&
        d.amount >= ref.amount &&
        t(ref) >= t(d) &&
        t(ref) - t(d) <= REFUND_WINDOW_MS,
    );
    const best = candidates[candidates.length - 1];
    if (best) ref.linkedTo = best.id;
  }

  return txns;
}

/** How much this row moves the daily budget. Positive = spend, negative = money back. */
export function effectiveSpend(x: Txn, byId: Map<string, Txn>): Paise {
  if (x.duplicateOf) return 0;
  if (x.kind === 'spend' && x.direction === 'debit') {
    return x.status === 'success' ? x.myShare ?? x.amount : 0;
  }
  if (x.kind === 'refund' && x.direction === 'credit' && x.status === 'success') {
    const orig = x.linkedTo ? byId.get(x.linkedTo) : undefined;
    if (orig?.myShare != null && orig.amount > 0) {
      return -Math.round((x.amount * orig.myShare) / orig.amount);
    }
    return -x.amount;
  }
  return 0;
}

/** Short human reason shown under a transaction when it is not counted at face value. */
export function countingNote(x: Txn, byId: Map<string, Txn>): string | null {
  if (x.duplicateOf) {
    const k = byId.get(x.duplicateOf);
    return `Duplicate of ${k ? sourceLabel(k.source) : 'another'} entry · not counted twice`;
  }
  if (x.status === 'failed') return 'Failed payment · not counted';
  if (x.status === 'pending') return 'Pending · counted once it succeeds';
  if (x.status === 'reversed') return 'Reversed by bank · not counted';
  if (x.kind === 'reversal') return 'Auto-reversal of a failed debit';
  if (x.kind === 'refund') {
    const o = x.linkedTo ? byId.get(x.linkedTo) : undefined;
    return o ? `Refund for ${o.merchant} on ${dayKeyOfIso(o.at).slice(8)}/${dayKeyOfIso(o.at).slice(5, 7)} · added back` : 'Refund · added back';
  }
  if (x.myShare != null && x.myShare !== x.amount) {
    return `Split · your share ${formatINR(x.myShare)} of ${formatINR(x.amount)}`;
  }
  if (x.kind === 'self_transfer') return 'Own-account transfer · not counted';
  if (x.kind === 'fixed') return 'Already in your fixed costs · not counted';
  if (x.kind === 'income') return 'Income';
  return null;
}

export function sourceLabel(s: TxnSource): string {
  return s === 'aa' ? 'bank' : s === 'sms' ? 'SMS' : 'manual';
}

export function spendByDay(txns: Txn[]): Record<string, Paise> {
  const byId = new Map(txns.map((x) => [x.id, x]));
  const out: Record<string, Paise> = {};
  for (const x of txns) {
    const v = effectiveSpend(x, byId);
    if (v === 0) continue;
    const k = dayKeyOfIso(x.at);
    out[k] = (out[k] ?? 0) + v;
  }
  return out;
}
