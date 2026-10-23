import { normalizeText } from './categorize';
import { TxnKind } from './types';

/**
 * Debits that are already budgeted as fixed costs (rent, EMI, SIP) must not hit the daily budget
 * again. Mandates and investment platforms are detected automatically; anything else (e.g. rent
 * paid by UPI to a landlord) is learned once the user taps "This is a fixed cost".
 */
const FIXED_HINTS = /(?:^|\s)(nach|ach|ecs|emi|sip|mutual fund|mf|zerodha|groww|coin by zerodha|bse star|cams|kfin|kfintech|lic|loan)(?:\s|$)/;
const SELF_HINTS = /(?:^|\s)(self|own account|to self)(?:\s|$)/;

export function inferDebitKind(
  rawNarration: string,
  merchantKey: string,
  fixedMerchants: Record<string, true>,
): TxnKind {
  if (fixedMerchants[merchantKey]) return 'fixed';
  const text = normalizeText(rawNarration);
  if (SELF_HINTS.test(text)) return 'self_transfer';
  if (FIXED_HINTS.test(text)) return 'fixed';
  return 'spend';
}

export function inferCreditKind(rawNarration: string): TxnKind {
  const text = normalizeText(rawNarration);
  if (/(?:^|\s)(rev|reversal|reversed)(?:\s|$)/.test(text)) return 'reversal';
  if (/(?:^|\s)(refund|rfnd)/.test(text)) return 'refund';
  if (SELF_HINTS.test(text)) return 'self_transfer';
  return 'income';
}
