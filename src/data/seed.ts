import { resolveMerchant } from '../domain/categorize';
import { inferCreditKind, inferDebitKind } from '../domain/kind';
import { rupees } from '../domain/money';
import { BudgetProfile, Txn, TxnSource } from '../domain/types';

/**
 * Deterministic demo month for a ₹1,00,000/month persona, from the 1st of the current month up to
 * "now". Every row goes through the real categorizer, and the month deliberately contains the
 * messy cases the reconciler has to handle: duplicates, failed payments, a reversal, a refund,
 * a split dinner, and fixed costs paid from the same account.
 *
 * Amounts are scaled to the user's own daily budget so the demo stays believable for any income.
 */

export const DEMO_PROFILE: BudgetProfile = {
  name: 'Aarav',
  monthlyIncome: rupees(100000),
  fixedExpenses: [
    { id: 'rent', label: 'Rent', amount: rupees(25000) },
    { id: 'emi', label: 'Bike EMI', amount: rupees(8000) },
    { id: 'sip', label: 'SIP', amount: rupees(10000) },
    { id: 'bills', label: 'Bills & utilities', amount: rupees(4000) },
  ],
  savingsGoal: rupees(8000),
  rolloverMode: 'spread',
  workHoursPerMonth: 176,
};

const DEMO_BASE_DAILY = rupees(45000 / 31);

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Spec {
  narration: string;
  amount: number; // rupees, pre-scale
  hour: number;
  minute?: number;
  direction?: 'debit' | 'credit';
  source?: TxnSource;
  status?: Txn['status'];
  myShare?: number;
  upiRef?: string;
  noScale?: boolean;
  forceKind?: Txn['kind'];
}

export function generateDemoTransactions(now: Date, profileForScale?: BudgetProfile, baseDaily?: number): Txn[] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const todayDay = now.getDate();
  const rnd = mulberry32(y * 100 + m + 7);
  const scale = baseDaily ? Math.min(3, Math.max(0.3, baseDaily / DEMO_BASE_DAILY)) : 1;
  const out: Txn[] = [];
  let refCounter = 428800000000 + m * 1000000;

  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const between = (a: number, b: number) => Math.round((a + rnd() * (b - a)) / 10) * 10;

  const push = (day: number, s: Spec) => {
    const at = new Date(y, m, day, s.hour, s.minute ?? Math.floor(rnd() * 60));
    if (at > now) return;
    const direction = s.direction ?? 'debit';
    const res = resolveMerchant(s.narration);
    const kind =
      s.forceKind ?? (direction === 'debit' ? inferDebitKind(s.narration, res.merchantKey, {}) : inferCreditKind(s.narration));
    const amt = s.noScale || kind === 'fixed' || kind === 'income' ? s.amount : Math.max(10, Math.round((s.amount * scale) / 10) * 10);
    const upiRef = s.upiRef ?? String(++refCounter);
    out.push({
      id: `${s.source ?? 'aa'}_${day}_${out.length}`,
      source: s.source ?? 'aa',
      direction,
      amount: rupees(amt),
      status: s.status ?? 'success',
      kind,
      at: at.toISOString(),
      rawMerchant: s.narration,
      merchant: res.merchant,
      merchantKey: res.merchantKey,
      category: res.category,
      categorySource: res.categorySource,
      upiRef,
      accountLast4: '4821',
      myShare: s.myShare != null ? rupees(Math.round((s.myShare * scale) / 10) * 10) : undefined,
    });
  };

  const income = profileForScale?.monthlyIncome ?? DEMO_PROFILE.monthlyIncome;
  const fixed = profileForScale?.fixedExpenses ?? DEMO_PROFILE.fixedExpenses;

  // Salary + fixed costs (never counted against the daily budget).
  push(1, { narration: 'NEFT/SALARY/ACME TECH PVT LTD', amount: income / 100, hour: 9, direction: 'credit', noScale: true, forceKind: 'income' });
  fixed.forEach((f, i) =>
    push(Math.min(1 + i * 2, 28), {
      narration: `ACH/${f.label.toUpperCase()}/NACH MANDATE`,
      amount: f.amount / 100,
      hour: 7,
      noScale: true,
      forceKind: 'fixed',
    }),
  );

  for (let d = 1; d <= todayDay; d++) {
    const dow = new Date(y, m, d).getDay();
    const weekend = dow === 0 || dow === 6;

    if (!weekend && rnd() < 0.6)
      push(d, { narration: pick(['THIRD WAVE COFFEE', 'UPI/DR/x/STARBUCKS/HDFC/tatastarbucks@hdfcbank', 'BLUE TOKAI COFFEE', 'CHAAYOS']), amount: between(180, 380), hour: 9 + Math.floor(rnd() * 2) });
    if (!weekend && rnd() < 0.8)
      push(d, rnd() < 0.3 ? { narration: 'BMRCL METRO CARD RECHARGE', amount: 200, hour: 8 } : { narration: pick(['UPI/DR/x/UBER/UTIB/uber.rides@axisbank', 'rapido@ybl', 'olacabs@icici']), amount: between(140, 420), hour: pick([8, 19, 20]) });
    if (rnd() < (weekend ? 0.7 : 0.45))
      push(d, { narration: pick(['UPI/DR/x/BLINKIT/YESB/blinkit.payu@yesbank/Pay', 'zeptomarketplace@ybl', 'SWIGGY INSTAMART']), amount: between(220, 900), hour: pick([11, 18, 22, 23]) });
    if (rnd() < (weekend ? 0.6 : 0.4))
      push(d, { narration: pick(['SWIGGY LIMITED', 'ZOMATO LTD', 'UPI/DR/x/ZOMATO/ICIC/zomato.order@icici']), amount: between(290, 760), hour: pick([13, 21, 22]) });
    if (rnd() < (weekend ? 0.25 : 0.08))
      push(d, { narration: pick(['AMAZON PAY INDIA', 'MYNTRA DESIGNS', 'FLIPKART INTERNET']), amount: between(499, 2400), hour: pick([14, 23]) });
    if (rnd() < 0.15)
      push(d, { narration: pick(['UPI/DR/x/RAMESH KUMAR/SBIN/ramesh.k@oksbi/Pay', 'UPI/DR/x/SHARMA TEA STALL/PYTM/paytmqr2810@paytm/Pay']), amount: between(30, 260), hour: 17 });
  }

  // Subscriptions & bills on their usual days.
  push(5, { narration: 'NETFLIX.COM', amount: 649, hour: 3 });
  push(8, { narration: 'AIRTEL PREPAID RECHARGE', amount: 349, hour: 10 });
  push(12, { narration: 'SPOTIFY INDIA', amount: 139, hour: 3 });
  push(18, { narration: 'GOOGLE YOUTUBE PREMIUM', amount: 149, hour: 3 });

  // --- The messy stuff, placed relative to today so it is always visible in the demo. ---
  const rel = (back: number) => Math.max(1, todayDay - back);

  // Impulse day: a Myntra sale + late-night Zomato.
  const impulse = rel(4);
  push(impulse, { narration: 'MYNTRA DESIGNS', amount: 3499, hour: 23, minute: 12 });
  push(impulse, { narration: 'ZOMATO LTD', amount: 890, hour: 23, minute: 48 });

  // Same Blinkit payment seen by both the bank (AA) and an SMS → must count once.
  const dupRef = String(++refCounter);
  push(rel(2), { narration: 'UPI/DR/x/BLINKIT/YESB/blinkit.payu@yesbank/Pay', amount: 612, hour: 19, minute: 4, upiRef: dupRef });
  push(rel(2), { narration: 'BLINKIT', amount: 612, hour: 19, minute: 5, upiRef: dupRef, source: 'sms' });

  // Failed Swiggy attempt (SMS) then the successful retry.
  push(rel(3), { narration: 'SWIGGY LIMITED', amount: 520, hour: 21, minute: 2, status: 'failed', source: 'sms' });
  push(rel(3), { narration: 'SWIGGY LIMITED', amount: 520, hour: 21, minute: 4 });

  // Zepto debit that the bank auto-reversed the next morning.
  const revRef = String(++refCounter);
  push(rel(6), { narration: 'zeptomarketplace@ybl', amount: 432, hour: 22, minute: 30, upiRef: revRef });
  push(rel(5), { narration: 'UPI REV zeptomarketplace@ybl', amount: 432, hour: 6, minute: 10, direction: 'credit', upiRef: revRef, forceKind: 'reversal' });

  // Amazon return → refund lands a few days later.
  push(rel(9), { narration: 'AMAZON PAY INDIA', amount: 1299, hour: 13 });
  push(rel(1), { narration: 'AMAZON REFUND', amount: 1299, hour: 11, direction: 'credit', forceKind: 'refund' });

  // Friday dinner split three ways.
  push(rel(7), { narration: 'UPI/DR/x/TOIT BREWPUB/HDFC/toit.blr@hdfcbank/Pay', amount: 3600, myShare: 1200, hour: 22 });

  // Something already happened this morning so Home isn't empty.
  push(todayDay, { narration: 'THIRD WAVE COFFEE', amount: 250, hour: 8, minute: 41 });
  push(todayDay, { narration: 'UPI/DR/x/UBER/UTIB/uber.rides@axisbank', amount: 230, hour: 9, minute: 5 });

  return out.sort((a, b) => a.at.localeCompare(b.at));
}
