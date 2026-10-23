import { daysInMonth } from './dates';
import { BudgetProfile, Paise } from './types';

export interface MonthPlan {
  year: number;
  month0: number;
  daysInMonth: number;
  income: Paise;
  fixedTotal: Paise;
  savingsGoal: Paise;
  /** income − fixed − savings, never negative. */
  spendable: Paise;
  /** The real number: spendable ÷ days in month. */
  baseDaily: Paise;
  /** The "lie" most people live by: income ÷ days in month. */
  rawDaily: Paise;
}

export function monthPlan(p: BudgetProfile, year: number, month0: number): MonthPlan {
  const dim = daysInMonth(year, month0);
  const fixedTotal = p.fixedExpenses.reduce((s, f) => s + f.amount, 0);
  const spendable = Math.max(0, p.monthlyIncome - fixedTotal - p.savingsGoal);
  return {
    year,
    month0,
    daysInMonth: dim,
    income: p.monthlyIncome,
    fixedTotal,
    savingsGoal: p.savingsGoal,
    spendable,
    baseDaily: Math.floor(spendable / dim),
    rawDaily: Math.floor(p.monthlyIncome / dim),
  };
}

export interface DayEntry {
  /** YYYY-MM-DD */
  date: string;
  dayOfMonth: number;
  /** What you were allowed to spend that day, after rollover. */
  budget: Paise;
  spent: Paise;
  /** budget − spent; negative means over. */
  remaining: Paise;
  /** budget − baseDaily: how much rollover added (+) or took away (−). */
  rollover: Paise;
}

/**
 * Builds the day-by-day ledger from the 1st of the month up to and including `todayDay`.
 *
 * spread mode: budget(d) = (spendable − spent before d) ÷ days left including d.
 *   A ₹2,000 overspend with 20 days left costs ₹100/day, instead of wiping out tomorrow.
 * nextDay mode: budget(d) = base + Σ(base − spent) over earlier days, floored at 0.
 *   Debt that does not fit into tomorrow keeps rolling forward.
 */
export function buildLedger(
  plan: MonthPlan,
  mode: BudgetProfile['rolloverMode'],
  spendByDay: Record<string, Paise>,
  todayDay: number,
): DayEntry[] {
  const out: DayEntry[] = [];
  let spentBefore = 0;
  let carry = 0;
  const mm = String(plan.month0 + 1).padStart(2, '0');
  for (let d = 1; d <= Math.min(todayDay, plan.daysInMonth); d++) {
    const date = `${plan.year}-${mm}-${String(d).padStart(2, '0')}`;
    const spent = spendByDay[date] ?? 0;
    let budget: Paise;
    if (mode === 'spread') {
      const daysLeft = plan.daysInMonth - d + 1;
      budget = Math.max(0, Math.floor((plan.spendable - spentBefore) / daysLeft));
    } else {
      budget = Math.max(0, plan.baseDaily + carry);
      carry += plan.baseDaily - spent;
    }
    out.push({
      date,
      dayOfMonth: d,
      budget,
      spent,
      remaining: budget - spent,
      rollover: budget - plan.baseDaily,
    });
    spentBefore += spent;
  }
  return out;
}

export type PaceStatus = 'on_track' | 'slightly_over' | 'danger';

export interface Pace {
  status: PaceStatus;
  spentSoFar: Paise;
  /** Where you "should" be by end of today if spending evenly. */
  expectedByToday: Paise;
  /** Straight-line projection to month end. */
  projectedMonthSpend: Paise;
  leftForMonth: Paise;
  /** spentSoFar ÷ expectedByToday. 1.0 = exactly on pace. */
  ratio: number;
}

/** Thresholds: ≤100% on track, ≤110% slightly over, above that danger. */
export function monthlyPace(plan: MonthPlan, ledger: DayEntry[]): Pace {
  const dayIndex = ledger.length || 1;
  const spentSoFar = ledger.reduce((s, d) => s + d.spent, 0);
  const expectedByToday = Math.round((plan.spendable * dayIndex) / plan.daysInMonth);
  const ratio = expectedByToday > 0 ? spentSoFar / expectedByToday : spentSoFar > 0 ? Infinity : 0;
  const status: PaceStatus = ratio <= 1 ? 'on_track' : ratio <= 1.1 ? 'slightly_over' : 'danger';
  return {
    status,
    spentSoFar,
    expectedByToday,
    projectedMonthSpend: Math.round((spentSoFar / dayIndex) * plan.daysInMonth),
    leftForMonth: plan.spendable - spentSoFar,
    ratio,
  };
}

/** Consecutive *completed* days (excluding today) where spent ≤ budget, counting back from yesterday. */
export function underBudgetStreak(ledger: DayEntry[]): number {
  let streak = 0;
  for (let i = ledger.length - 2; i >= 0; i--) {
    if (ledger[i].spent <= ledger[i].budget) streak++;
    else break;
  }
  return streak;
}

/** Longest streak this month (completed days only). */
export function bestStreak(ledger: DayEntry[]): number {
  let best = 0;
  let cur = 0;
  for (let i = 0; i < ledger.length - 1; i++) {
    cur = ledger[i].spent <= ledger[i].budget ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}
