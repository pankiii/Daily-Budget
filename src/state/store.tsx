import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { DayEntry, MonthPlan, Pace, buildLedger, monthPlan, monthlyPace, underBudgetStreak } from '../domain/budget';
import { resolveMerchant } from '../domain/categorize';
import { Msg, transactionMessage } from '../domain/copy';
import { dayKey } from '../domain/dates';
import { inferDebitKind } from '../domain/kind';
import { reconcile, spendByDay } from '../domain/reconcile';
import { BudgetProfile, CategoryId, Consent, Paise, Settings, Txn } from '../domain/types';
import { DEMO_PROFILE, generateDemoTransactions } from '../data/seed';

/**
 * Local-first app state.
 *
 * `txns` holds raw rows exactly as ingested (AA / SMS / manual). Reconciliation and every number
 * on screen are *derived* on render, so fixing a rule never requires migrating stored data.
 *
 * Persistence: AsyncStorage in this MVP. Production swaps this for an encrypted SQLite DB
 * (SQLCipher) keyed from the Android Keystore / iOS Keychain — see docs/04-architecture.md.
 */

export interface AppState {
  hydrated: boolean;
  onboarded: boolean;
  profile: BudgetProfile;
  settings: Settings;
  consent: Consent;
  txns: Txn[];
  /** "Correct once, remember forever": merchantKey → category. */
  categoryOverrides: Record<string, CategoryId>;
  /** Merchants the user marked as already covered by fixed costs (e.g. landlord's UPI). */
  fixedMerchants: Record<string, true>;
  isDemo: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  tone: 'roast',
  lang: 'en',
  notifications: { morning: true, morningTime: '08:30', perTransaction: true, night: true, nightTime: '21:30', weekly: true },
};

const INITIAL: AppState = {
  hydrated: false,
  onboarded: false,
  profile: DEMO_PROFILE,
  settings: DEFAULT_SETTINGS,
  consent: { budgetingPurpose: false, smsParsing: false, accountAggregator: false },
  txns: [],
  categoryOverrides: {},
  fixedMerchants: {},
  isDemo: true,
};

type Action =
  | { type: 'hydrate'; state: Partial<AppState> }
  | { type: 'onboard'; profile: BudgetProfile; settings: Settings; consent: Consent; txns: Txn[] }
  | { type: 'addTxn'; txn: Txn }
  | { type: 'recategorize'; merchantKey: string; category: CategoryId }
  | { type: 'setFixed'; merchantKey: string; fixed: boolean }
  | { type: 'setShare'; id: string; myShare?: Paise }
  | { type: 'deleteTxn'; id: string }
  | { type: 'settings'; settings: Settings }
  | { type: 'profile'; profile: BudgetProfile }
  | { type: 'reset' };

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'hydrate':
      return { ...s, ...a.state, hydrated: true };
    case 'onboard':
      return { ...s, onboarded: true, profile: a.profile, settings: a.settings, consent: a.consent, txns: a.txns };
    case 'addTxn':
      return { ...s, txns: [...s.txns, a.txn], isDemo: s.isDemo };
    case 'recategorize':
      return {
        ...s,
        categoryOverrides: { ...s.categoryOverrides, [a.merchantKey]: a.category },
        txns: s.txns.map((x) => (x.merchantKey === a.merchantKey ? { ...x, category: a.category, categorySource: 'user' } : x)),
      };
    case 'setFixed': {
      const fixedMerchants = { ...s.fixedMerchants };
      if (a.fixed) fixedMerchants[a.merchantKey] = true;
      else delete fixedMerchants[a.merchantKey];
      return {
        ...s,
        fixedMerchants,
        txns: s.txns.map((x) =>
          x.merchantKey === a.merchantKey && x.direction === 'debit'
            ? { ...x, kind: a.fixed ? 'fixed' : inferDebitKind(x.rawMerchant, x.merchantKey, fixedMerchants) }
            : x,
        ),
      };
    }
    case 'setShare':
      return { ...s, txns: s.txns.map((x) => (x.id === a.id ? { ...x, myShare: a.myShare } : x)) };
    case 'deleteTxn':
      return { ...s, txns: s.txns.filter((x) => x.id !== a.id) };
    case 'settings':
      return { ...s, settings: a.settings };
    case 'profile':
      return { ...s, profile: a.profile };
    case 'reset':
      return { ...INITIAL, hydrated: true };
  }
}

const STORAGE_KEY = 'dailybudget/v1';
const PERSISTED: (keyof AppState)[] = ['onboarded', 'profile', 'settings', 'consent', 'txns', 'categoryOverrides', 'fixedMerchants', 'isDemo'];

// ---------- Derived budget view ----------

export interface BudgetView {
  now: Date;
  todayKey: string;
  plan: MonthPlan;
  ledger: DayEntry[];
  today: DayEntry;
  pace: Pace;
  streak: number;
  /** Reconciled rows (includes duplicates / failed, flagged) for the current month. */
  txns: Txn[];
  byId: Map<string, Txn>;
}

function deriveView(state: AppState, now: Date): BudgetView {
  const plan = monthPlan(state.profile, now.getFullYear(), now.getMonth());
  const prefix = dayKey(now).slice(0, 7);
  const txns = reconcile(state.txns).filter((x) => dayKey(new Date(x.at)).startsWith(prefix));
  const ledger = buildLedger(plan, state.profile.rolloverMode, spendByDay(txns), now.getDate());
  return {
    now,
    todayKey: dayKey(now),
    plan,
    ledger,
    today: ledger[ledger.length - 1],
    pace: monthlyPace(plan, ledger),
    streak: underBudgetStreak(ledger),
    txns,
    byId: new Map(txns.map((x) => [x.id, x])),
  };
}

// ---------- Context ----------

interface Ctx {
  state: AppState;
  view: BudgetView;
  toast: Msg | null;
  dismissToast: () => void;
  completeOnboarding: (p: { profile: BudgetProfile; settings: Settings; consent: Consent; useDemoData: boolean }) => void;
  addManual: (p: { amount: Paise; label: string; category?: CategoryId; myShare?: Paise }) => void;
  recategorize: (merchantKey: string, category: CategoryId) => void;
  setFixed: (merchantKey: string, fixed: boolean) => void;
  setShare: (id: string, myShare?: Paise) => void;
  deleteTxn: (id: string) => void;
  updateSettings: (s: Settings) => void;
  updateProfile: (p: BudgetProfile) => void;
  deleteAllData: () => Promise<void>;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [toast, setToast] = useState<Msg | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Re-derive once a minute so midnight rollover happens while the app is open.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => dispatch({ type: 'hydrate', state: raw ? JSON.parse(raw) : {} }))
      .catch(() => dispatch({ type: 'hydrate', state: {} }));
  }, []);

  // Debounced persistence — cheap on low-end devices with slow flash storage.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state.hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const out: Partial<AppState> = {};
      for (const k of PERSISTED) (out as any)[k] = state[k];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(out)).catch(() => {});
    }, 400);
  }, [state]);

  const view = useMemo(() => deriveView(state, now), [state, now]);

  const ctx: Ctx = {
    state,
    view,
    toast,
    dismissToast: () => setToast(null),
    completeOnboarding: ({ profile, settings, consent, useDemoData }) => {
      const d = new Date();
      const plan = monthPlan(profile, d.getFullYear(), d.getMonth());
      const txns = useDemoData ? generateDemoTransactions(d, profile, plan.baseDaily) : [];
      dispatch({ type: 'onboard', profile, settings, consent: { ...consent, givenAt: d.toISOString() }, txns });
    },
    addManual: ({ amount, label, category, myShare }) => {
      const at = new Date();
      const res = resolveMerchant(label, state.categoryOverrides);
      const txn: Txn = {
        id: `manual_${at.getTime()}`,
        source: 'manual',
        direction: 'debit',
        amount,
        status: 'success',
        kind: inferDebitKind(label, res.merchantKey, state.fixedMerchants),
        at: at.toISOString(),
        rawMerchant: label,
        merchant: res.merchant === 'Unknown' ? label : res.merchant,
        merchantKey: res.merchantKey,
        category: category ?? res.category,
        categorySource: category && category !== res.category ? 'user' : res.categorySource,
        myShare,
      };
      dispatch({ type: 'addTxn', txn });
      if (category && category !== res.category) dispatch({ type: 'recategorize', merchantKey: res.merchantKey, category });
      // Live balance, exactly what the post-transaction push notification would say.
      const counted = myShare ?? amount;
      const left = view.today.remaining - (txn.kind === 'spend' ? counted : 0);
      setToast(
        transactionMessage(
          { merchant: txn.merchant, amount: counted, left, budget: view.today.budget },
          state.settings.tone,
          state.settings.lang,
          txn.id,
        ),
      );
    },
    recategorize: (merchantKey, category) => dispatch({ type: 'recategorize', merchantKey, category }),
    setFixed: (merchantKey, fixed) => dispatch({ type: 'setFixed', merchantKey, fixed }),
    setShare: (id, myShare) => dispatch({ type: 'setShare', id, myShare }),
    deleteTxn: (id) => dispatch({ type: 'deleteTxn', id }),
    updateSettings: (settings) => dispatch({ type: 'settings', settings }),
    updateProfile: (profile) => dispatch({ type: 'profile', profile }),
    deleteAllData: async () => {
      await AsyncStorage.removeItem(STORAGE_KEY);
      dispatch({ type: 'reset' });
    },
  };

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
}

export { DEFAULT_SETTINGS };
