import { resolveMerchant } from '../domain/categorize';
import { inferCreditKind, inferDebitKind } from '../domain/kind';
import { CategoryId, Txn } from '../domain/types';

/**
 * Account Aggregator (RBI NBFC-AA framework) integration.
 *
 * DailyBudget is a Financial Information User (FIU). We never see bank credentials:
 *   1. Our backend asks the AA provider (Setu / Finvu / OneMoney / ...) to create a consent request
 *      (purpose "Personal finance", FI type DEPOSIT, fetch type PERIODIC, frequency 1/hour or so,
 *      data life 1 year, range = last 3 months → +1 year).
 *   2. The user approves it inside the AA's own UI (webview / redirect) with OTP on the AA handle.
 *   3. The AA notifies our backend (FI notification webhook); backend creates a data session and
 *      pulls encrypted FI data (ECDH key exchange per ReBIT spec), decrypts it in memory,
 *      maps it with `mapAaTransaction` below, and pushes only the mapped rows to the device.
 *   4. Raw FI payloads are discarded after mapping. Users can revoke consent from the app or the
 *      AA app at any time; revocation triggers deletion of the fetched data.
 *
 * The client below is the device-side contract. In this MVP it is stubbed: the mapper is real and
 * unit-tested, and the network calls throw until the backend exists.
 */

/** Subset of the ReBIT FI schema "Transaction" element for DEPOSIT accounts. */
export interface AaFiTransaction {
  txnId: string;
  type: 'DEBIT' | 'CREDIT';
  mode: 'UPI' | 'CARD' | 'ATM' | 'NEFT' | 'IMPS' | 'RTGS' | 'CASH' | 'ACH' | 'OTHERS' | string;
  amount: string; // "600.00"
  currentBalance?: string;
  transactionTimestamp: string; // ISO with +05:30
  valueDate?: string;
  narration: string; // "UPI/DR/428812345678/BLINKIT/YESB/blinkit.payu@yesbank/Pay"
  reference?: string;
}

export interface AaLinkedAccount {
  linkRefNumber: string;
  maskedAccNumber: string; // "XXXXXXXX1234"
  fipName: string; // "HDFC Bank"
}

export interface AaConsentHandle {
  consentId: string;
  /** URL of the AA's consent screen to open in an in-app browser. */
  redirectUrl: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED' | 'EXPIRED' | 'PAUSED';
}

export interface AccountAggregatorClient {
  /** Backend creates consent with the AA; returns where to send the user. */
  startConsent(mobileNumber: string): Promise<AaConsentHandle>;
  getConsentStatus(consentId: string): Promise<AaConsentHandle['status']>;
  /** Mapped, de-identified rows since the given cursor. */
  fetchTransactions(sinceCursor?: string): Promise<{ txns: Txn[]; cursor: string }>;
  revokeConsent(consentId: string): Promise<void>;
}

export const stubAaClient: AccountAggregatorClient = {
  async startConsent() {
    throw new Error('Account Aggregator needs the DailyBudget backend (FIU). Not available in the offline MVP.');
  },
  async getConsentStatus() {
    return 'PENDING';
  },
  async fetchTransactions() {
    return { txns: [], cursor: '' };
  },
  async revokeConsent() {},
};

const UPI_REF_IN_NARRATION = /(?:^|\/|-)(\d{12})(?:\/|-|$)/;

export function mapAaTransaction(
  fi: AaFiTransaction,
  account: AaLinkedAccount,
  overrides: Record<string, CategoryId> = {},
  fixedMerchants: Record<string, true> = {},
): Txn {
  const direction = fi.type === 'DEBIT' ? 'debit' : 'credit';
  const res = resolveMerchant(fi.narration, overrides);
  const kind =
    direction === 'debit'
      ? fi.mode === 'ACH'
        ? 'fixed'
        : inferDebitKind(fi.narration, res.merchantKey, fixedMerchants)
      : inferCreditKind(fi.narration);
  return {
    id: `aa_${account.linkRefNumber}_${fi.txnId}`,
    source: 'aa',
    direction,
    amount: Math.round(parseFloat(fi.amount) * 100),
    status: 'success', // AA statements only contain posted entries
    kind,
    at: new Date(fi.transactionTimestamp).toISOString(),
    rawMerchant: fi.narration,
    merchant: res.merchant,
    merchantKey: res.merchantKey,
    category: res.category,
    categorySource: res.categorySource,
    upiRef: fi.mode === 'UPI' ? fi.narration.match(UPI_REF_IN_NARRATION)?.[1] ?? fi.reference : fi.reference,
    accountLast4: account.maskedAccNumber.slice(-4),
  };
}
