import { rupees } from '../src/domain/money';
import { countingNote, effectiveSpend, reconcile, spendByDay } from '../src/domain/reconcile';
import { Txn } from '../src/domain/types';

const base: Omit<Txn, 'id' | 'source' | 'amount' | 'at'> = {
  direction: 'debit',
  status: 'success',
  kind: 'spend',
  rawMerchant: 'blinkit',
  merchant: 'Blinkit',
  merchantKey: 'blinkit',
  category: 'quick_commerce',
  categorySource: 'rule',
};

const mk = (o: Partial<Txn> & Pick<Txn, 'id' | 'source' | 'amount' | 'at'>): Txn => ({ ...base, ...o });

function total(txns: Txn[]) {
  const r = reconcile(txns);
  const byId = new Map(r.map((x) => [x.id, x]));
  return { r, byId, sum: r.reduce((s, x) => s + effectiveSpend(x, byId), 0) };
}

describe('reconcile', () => {
  it('counts the same UPI payment once across AA, SMS and manual', () => {
    const { r, sum } = total([
      mk({ id: 'sms1', source: 'sms', amount: rupees(600), at: '2026-10-22T10:00:05+05:30', upiRef: '428812345678' }),
      mk({ id: 'aa1', source: 'aa', amount: rupees(600), at: '2026-10-22T10:00:00+05:30', upiRef: '428812345678' }),
      mk({ id: 'man1', source: 'manual', amount: rupees(600), at: '2026-10-22T09:58:00+05:30', categorySource: 'user', category: 'other', note: 'snacks' }),
    ]);
    expect(sum).toBe(rupees(600));
    const aa = r.find((x) => x.id === 'aa1')!;
    expect(aa.duplicateOf).toBeUndefined();
    // user's manual edits survive onto the bank row
    expect(aa.category).toBe('other');
    expect(aa.note).toBe('snacks');
    expect(r.find((x) => x.id === 'sms1')!.duplicateOf).toBe('aa1');
    expect(r.find((x) => x.id === 'man1')!.duplicateOf).toBe('aa1');
  });

  it('does not merge two genuinely separate same-amount coffees', () => {
    const { sum } = total([
      mk({ id: 'a', source: 'aa', amount: rupees(250), at: '2026-10-22T09:00:00+05:30', upiRef: '111111111111' }),
      mk({ id: 'b', source: 'aa', amount: rupees(250), at: '2026-10-22T16:00:00+05:30', upiRef: '222222222222' }),
    ]);
    expect(sum).toBe(rupees(500));
  });

  it('ignores failed payments and cancels auto-reversals', () => {
    const { r, byId, sum } = total([
      mk({ id: 'f', source: 'sms', amount: rupees(400), at: '2026-10-22T11:00:00+05:30', status: 'failed' }),
      mk({ id: 'd', source: 'aa', amount: rupees(500), at: '2026-10-22T12:00:00+05:30', upiRef: '333333333333' }),
      mk({ id: 'rev', source: 'aa', direction: 'credit', kind: 'reversal', amount: rupees(500), at: '2026-10-23T08:00:00+05:30', upiRef: '333333333333' }),
    ]);
    expect(sum).toBe(0);
    expect(countingNote(r.find((x) => x.id === 'd')!, byId)).toMatch(/Reversed/);
  });

  it('books refunds as negative spend on the day they land, pro-rated for splits', () => {
    const txns = [
      mk({ id: 'buy', source: 'aa', amount: rupees(1200), myShare: rupees(400), merchant: 'Amazon', merchantKey: 'amazon', category: 'shopping', at: '2026-10-05T12:00:00+05:30' }),
      mk({ id: 'rf', source: 'aa', direction: 'credit', kind: 'refund', amount: rupees(600), merchant: 'Amazon', merchantKey: 'amazon', category: 'shopping', at: '2026-10-12T12:00:00+05:30' }),
    ];
    const r = reconcile(txns);
    expect(r.find((x) => x.id === 'rf')!.linkedTo).toBe('buy');
    const days = spendByDay(r);
    expect(days['2026-10-05']).toBe(rupees(400));
    expect(days['2026-10-12']).toBe(-rupees(200)); // 600 × 400/1200
  });

  it('never counts fixed costs or self transfers', () => {
    const { sum } = total([
      mk({ id: 'rent', source: 'aa', amount: rupees(25000), kind: 'fixed', at: '2026-10-01T10:00:00+05:30' }),
      mk({ id: 'self', source: 'aa', amount: rupees(5000), kind: 'self_transfer', at: '2026-10-01T10:00:00+05:30' }),
    ]);
    expect(sum).toBe(0);
  });
});
