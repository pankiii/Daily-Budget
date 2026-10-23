import { CATEGORIES } from './categories';
import { DayEntry, MonthPlan } from './budget';
import { dayKeyOfIso } from './dates';
import { effectiveSpend } from './reconcile';
import { BudgetProfile, CategoryId, Paise, Txn } from './types';

export interface CategorySlice {
  category: CategoryId;
  amount: Paise;
  count: number;
  share: number; // 0..1 of total
}

export interface MerchantSlice {
  merchant: string;
  merchantKey: string;
  category: CategoryId;
  amount: Paise;
  count: number;
}

/** Inclusive day-key range filter. Keys compare lexicographically (YYYY-MM-DD). */
function inRange(x: Txn, from: string, to: string) {
  const k = dayKeyOfIso(x.at);
  return k >= from && k <= to;
}

export function categoryBreakdown(txns: Txn[], from: string, to: string): CategorySlice[] {
  const byId = new Map(txns.map((x) => [x.id, x]));
  const acc = new Map<CategoryId, CategorySlice>();
  let total = 0;
  for (const x of txns) {
    if (!inRange(x, from, to)) continue;
    const v = effectiveSpend(x, byId);
    if (v === 0) continue;
    const s = acc.get(x.category) ?? { category: x.category, amount: 0, count: 0, share: 0 };
    s.amount += v;
    if (v > 0) s.count += 1;
    acc.set(x.category, s);
    total += v;
  }
  return [...acc.values()]
    .filter((s) => s.amount > 0)
    .map((s) => ({ ...s, share: total > 0 ? s.amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export function merchantBreakdown(txns: Txn[], from: string, to: string): MerchantSlice[] {
  const byId = new Map(txns.map((x) => [x.id, x]));
  const acc = new Map<string, MerchantSlice>();
  for (const x of txns) {
    if (!inRange(x, from, to)) continue;
    const v = effectiveSpend(x, byId);
    if (v === 0) continue;
    const s = acc.get(x.merchantKey) ?? { merchant: x.merchant, merchantKey: x.merchantKey, category: x.category, amount: 0, count: 0 };
    s.amount += v;
    if (v > 0) s.count += 1;
    acc.set(x.merchantKey, s);
  }
  return [...acc.values()].filter((s) => s.amount > 0).sort((a, b) => b.amount - a.amount);
}

/** Top leaks = biggest discretionary merchants. Bills are not leaks; Zepto at 11pm is. */
export function topLeaks(merchants: MerchantSlice[], n = 3): MerchantSlice[] {
  return merchants.filter((m) => CATEGORIES[m.category].discretionary).slice(0, n);
}

/** Your effective hourly take-home. */
export function hourlyRate(p: BudgetProfile): Paise {
  return Math.round(p.monthlyIncome / Math.max(1, p.workHoursPerMonth));
}

export function hoursOfWork(amount: Paise, p: BudgetProfile): number {
  const rate = hourlyRate(p);
  return rate > 0 ? amount / rate : 0;
}

/** "1 hr 20 min", "11 hours", "3 working days". */
export function formatHours(h: number, hoursPerDay = 8): string {
  if (h >= hoursPerDay * 2) {
    const days = h / hoursPerDay;
    return `${Math.round(days * 10) / 10} working days`;
  }
  if (h >= 1) {
    const whole = Math.floor(h);
    const mins = Math.round((h - whole) * 60);
    return mins >= 5 ? `${whole} hr ${mins} min` : `${whole} hour${whole === 1 ? '' : 's'}`;
  }
  return `${Math.max(1, Math.round(h * 60))} min`;
}

/**
 * "Cut Zepto by half → ₹X extra per year".
 * Month-to-date spend is projected to a full month, then annualised.
 */
export function whatIfCut(
  monthToDate: Paise,
  daysElapsed: number,
  daysInMonth: number,
  cutFraction = 0.5,
): { perMonth: Paise; perYear: Paise } {
  const projectedMonth = daysElapsed > 0 ? (monthToDate / daysElapsed) * daysInMonth : 0;
  const perMonth = Math.round(projectedMonth * cutFraction);
  return { perMonth, perYear: perMonth * 12 };
}

export interface WeeklyReality {
  from: string;
  to: string;
  spent: Paise;
  budget: Paise;
  daysUnder: number;
  daysTotal: number;
  worstDay?: { date: string; spent: Paise; budget: Paise; over: Paise; topMerchant?: string };
  streak: number;
}

/** Last 7 *completed* days (or fewer early in the month). */
export function weeklyReality(
  ledger: DayEntry[],
  txns: Txn[],
  streak: number,
): WeeklyReality | null {
  const done = ledger.slice(0, -1).slice(-7);
  if (done.length === 0) return null;
  const byId = new Map(txns.map((x) => [x.id, x]));
  let worst: DayEntry | undefined;
  for (const d of done) {
    if (!worst || d.spent - d.budget > worst.spent - worst.budget) worst = d;
  }
  let worstDay: WeeklyReality['worstDay'];
  if (worst && worst.spent > worst.budget) {
    const perMerchant = new Map<string, number>();
    for (const x of txns) {
      if (dayKeyOfIso(x.at) !== worst.date) continue;
      const v = effectiveSpend(x, byId);
      if (v > 0) perMerchant.set(x.merchant, (perMerchant.get(x.merchant) ?? 0) + v);
    }
    const top = [...perMerchant.entries()].sort((a, b) => b[1] - a[1])[0];
    worstDay = { date: worst.date, spent: worst.spent, budget: worst.budget, over: worst.spent - worst.budget, topMerchant: top?.[0] };
  }
  return {
    from: done[0].date,
    to: done[done.length - 1].date,
    spent: done.reduce((s, d) => s + d.spent, 0),
    budget: done.reduce((s, d) => s + d.budget, 0),
    daysUnder: done.filter((d) => d.spent <= d.budget).length,
    daysTotal: done.length,
    worstDay,
    streak,
  };
}

/** Helper for the onboarding "reality reveal". */
export function realityGap(plan: MonthPlan): { raw: Paise; real: Paise; percentSmaller: number } {
  const pct = plan.rawDaily > 0 ? Math.round((1 - plan.baseDaily / plan.rawDaily) * 100) : 0;
  return { raw: plan.rawDaily, real: plan.baseDaily, percentSmaller: pct };
}
