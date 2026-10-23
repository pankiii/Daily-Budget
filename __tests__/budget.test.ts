import { buildLedger, monthPlan, monthlyPace, underBudgetStreak } from '../src/domain/budget';
import { rupees } from '../src/domain/money';
import { BudgetProfile } from '../src/domain/types';

const profile: BudgetProfile = {
  name: 'Test',
  monthlyIncome: rupees(100000),
  fixedExpenses: [
    { id: 'rent', label: 'Rent', amount: rupees(25000) },
    { id: 'emi', label: 'EMI', amount: rupees(8000) },
    { id: 'sip', label: 'SIP', amount: rupees(10000) },
    { id: 'bills', label: 'Bills', amount: rupees(4000) },
  ],
  savingsGoal: rupees(8000),
  rolloverMode: 'spread',
  workHoursPerMonth: 176,
};

describe('monthPlan', () => {
  it('computes raw vs real daily budget (30-day month)', () => {
    const p = monthPlan(profile, 2026, 8); // September → 30 days
    expect(p.daysInMonth).toBe(30);
    expect(p.rawDaily).toBe(rupees(3333.33));
    expect(p.spendable).toBe(rupees(45000));
    expect(p.baseDaily).toBe(rupees(1500));
  });

  it('never goes negative when fixed costs exceed income', () => {
    const p = monthPlan({ ...profile, savingsGoal: rupees(90000) }, 2026, 8);
    expect(p.spendable).toBe(0);
    expect(p.baseDaily).toBe(0);
  });
});

describe('rollover', () => {
  const plan = monthPlan(profile, 2026, 8); // ₹1,500/day base

  it('nextDay: surplus and deficit land on tomorrow', () => {
    const ledger = buildLedger(plan, 'nextDay', { '2026-09-01': rupees(1000), '2026-09-02': rupees(2500) }, 3);
    expect(ledger[0].budget).toBe(rupees(1500));
    expect(ledger[1].budget).toBe(rupees(2000)); // +500 rolled
    expect(ledger[1].rollover).toBe(rupees(500));
    expect(ledger[2].budget).toBe(rupees(1000)); // 1500 + 500 − 1000
  });

  it('nextDay: budget floors at zero and debt keeps rolling', () => {
    const ledger = buildLedger(plan, 'nextDay', { '2026-09-01': rupees(5000) }, 4);
    expect(ledger[1].budget).toBe(0); // 1500 − 3500
    expect(ledger[2].budget).toBe(0); // 1500 − 2000
    expect(ledger[3].budget).toBe(rupees(1000)); // 1500 − 500
  });

  it('spread: overspend is shared across the remaining days', () => {
    const ledger = buildLedger(plan, 'spread', { '2026-09-01': rupees(4400) }, 2);
    // (45,000 − 4,400) / 29 = 1,400
    expect(ledger[1].budget).toBe(rupees(1400));
    expect(ledger[1].rollover).toBe(-rupees(100));
  });
});

describe('pace & streak', () => {
  const plan = monthPlan(profile, 2026, 8);

  it('classifies pace', () => {
    const on = buildLedger(plan, 'spread', { '2026-09-01': rupees(1500), '2026-09-02': rupees(1400) }, 2);
    expect(monthlyPace(plan, on).status).toBe('on_track');
    const slight = buildLedger(plan, 'spread', { '2026-09-01': rupees(1600), '2026-09-02': rupees(1600) }, 2);
    expect(monthlyPace(plan, slight).status).toBe('slightly_over');
    const bad = buildLedger(plan, 'spread', { '2026-09-01': rupees(4000) }, 2);
    expect(monthlyPace(plan, bad).status).toBe('danger');
  });

  it('counts the streak of completed under-budget days, ignoring today', () => {
    const ledger = buildLedger(
      plan,
      'spread',
      { '2026-09-01': rupees(9000), '2026-09-02': rupees(100), '2026-09-03': rupees(100), '2026-09-04': rupees(99999) },
      4,
    );
    expect(underBudgetStreak(ledger)).toBe(2);
  });
});
