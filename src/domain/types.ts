/** All money is stored as integer paise to avoid floating-point drift. ₹1 = 100 paise. */
export type Paise = number;

export type CategoryId =
  | 'quick_commerce'
  | 'food_delivery'
  | 'shopping'
  | 'coffee'
  | 'transport'
  | 'subscriptions'
  | 'bills'
  | 'other';

export type TxnSource = 'aa' | 'sms' | 'manual';
export type TxnStatus = 'success' | 'pending' | 'failed' | 'reversed';
/**
 * What a transaction *means* for the budget.
 * - spend: counts against the daily budget
 * - refund: merchant gave money back (negative spend on the day it lands)
 * - reversal: bank auto-reversed a failed debit (cancels the original, never counted)
 * - fixed: rent / EMI / SIP / NACH already deducted up-front — never counted again
 * - income / self_transfer: never counted
 */
export type TxnKind = 'spend' | 'refund' | 'reversal' | 'income' | 'self_transfer' | 'fixed';

export interface Txn {
  id: string;
  source: TxnSource;
  direction: 'debit' | 'credit';
  amount: Paise;
  status: TxnStatus;
  kind: TxnKind;
  /** ISO timestamp (device local time is treated as IST). */
  at: string;
  /** Narration / VPA / SMS fragment exactly as received. */
  rawMerchant: string;
  /** Display name after normalization, e.g. "Blinkit". */
  merchant: string;
  /** Stable key used for category memory, e.g. "blinkit". */
  merchantKey: string;
  category: CategoryId;
  categorySource: 'rule' | 'user' | 'default';
  upiRef?: string;
  accountLast4?: string;
  /** For refunds/reversals: the original debit this credit belongs to. Set by the reconciler. */
  linkedTo?: string;
  /** Split bills: the part that is actually yours. Only this counts against the budget. */
  myShare?: Paise;
  /** Set by the reconciler when this row is the same money movement seen from another source. */
  duplicateOf?: string;
  note?: string;
}

export interface FixedExpense {
  id: string;
  label: string;
  amount: Paise;
}

export interface BudgetProfile {
  name: string;
  monthlyIncome: Paise;
  fixedExpenses: FixedExpense[];
  savingsGoal: Paise;
  /**
   * spread  – yesterday's surplus/deficit is spread across the remaining days (default; never goes wild)
   * nextDay – yesterday's surplus/deficit lands entirely on tomorrow (strict, as some users prefer)
   */
  rolloverMode: 'spread' | 'nextDay';
  /** Used for "hours of your life" maths. Default 176 (22 days × 8 h). */
  workHoursPerMonth: number;
}

export type Tone = 'roast' | 'gentle';
export type Lang = 'en' | 'hinglish';

export interface NotificationPrefs {
  morning: boolean;
  morningTime: string; // "08:30"
  perTransaction: boolean;
  night: boolean;
  nightTime: string; // "21:30"
  weekly: boolean;
}

export interface Settings {
  tone: Tone;
  lang: Lang;
  notifications: NotificationPrefs;
}

export interface Consent {
  /** DPDP Act 2023: purpose-specific, timestamped consent. */
  budgetingPurpose: boolean;
  smsParsing: boolean;
  accountAggregator: boolean;
  givenAt?: string;
}
