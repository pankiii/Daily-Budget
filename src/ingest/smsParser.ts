import { resolveMerchant } from '../domain/categorize';
import { inferDebitKind } from '../domain/kind';
import { CategoryId, Txn, TxnKind, TxnStatus } from '../domain/types';

/**
 * Bank / UPI SMS parser (fallback source when Account Aggregator is not linked).
 *
 * Runs fully on-device. Raw SMS text never leaves the phone; only the parsed fields are stored.
 * We only read messages from known bank sender IDs (e.g. "VM-HDFCBK", "AD-ICICIB") so that OTPs,
 * personal chats, and promotional SMS are never even parsed.
 */

export interface RawSms {
  sender: string;
  body: string;
  receivedAt: string; // ISO
}

const BANK_SENDERS = /^[A-Z]{2}-(HDFCBK|ICICIB|SBIINB|SBIUPI|AXISBK|KOTAKB|YESBNK|IDFCFB|INDBNK|PNBSMS|BOIIND|CBSSBI|PAYTMB|AUBANK|FEDBNK|JUPITR|SLCEIT)/i;

const AMOUNT = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
const ACCOUNT = /(?:a\/c|acct|account|card)[^\dX*]{0,12}[X*]*(\d{4})/i;
const UPI_REF = /(?:upi\s*ref(?:\s*no)?|ref(?:erence)?\s*(?:no|id)?|rrn|txn\s*id)[\s.:#-]*(\d{10,12})/i;
const VPA = /\b([a-z0-9._-]{2,}@[a-z]{2,})\b/i;
const MERCHANT_PATTERNS = [
  /\bto\s+vpa\s+([a-z0-9._@-]+)/i,
  /\bat\s+([A-Z0-9][A-Za-z0-9 &.'-]{2,40}?)(?=\s+on\b|\s+ref\b|\.|,|$)/,
  /\bto\s+([A-Z][A-Za-z0-9 &.'-]{2,40}?)(?=\s+on\b|\s+ref\b|\.|,|$)/i,
  /\bfrom\s+([A-Z][A-Za-z0-9 &.'-]{2,40}?)(?=\s+on\b|\s+ref\b|\.|,|$)/i,
  /\bInfo:?\s*([A-Za-z0-9 &.\/'-]{3,40})/i,
];

const OTP_OR_PROMO = /\b(otp|one time password|offer|cashback upto|pre-?approved|loan of|apply now|kyc)\b/i;

export function isBankSms(sms: RawSms): boolean {
  return BANK_SENDERS.test(sms.sender) && !OTP_OR_PROMO.test(sms.body);
}

export function parseBankSms(
  sms: RawSms,
  overrides: Record<string, CategoryId> = {},
  fixedMerchants: Record<string, true> = {},
): Txn | null {
  if (!isBankSms(sms)) return null;
  const body = sms.body.replace(/\s+/g, ' ');
  const amt = body.match(AMOUNT);
  if (!amt) return null;
  const amount = Math.round(parseFloat(amt[1].replace(/,/g, '')) * 100);
  if (!amount) return null;

  const lower = body.toLowerCase();
  const isCredit = /\b(credited|received|refund(?:ed)?|reversed|reversal|deposited)\b/.test(lower);
  const isDebit = /\b(debited|spent|sent|paid|withdrawn|purchase|txn of|transaction of)\b/.test(lower);
  if (!isCredit && !isDebit) return null;
  const direction: Txn['direction'] = isCredit && !/\bdebited\b/.test(lower) ? 'credit' : 'debit';

  let status: TxnStatus = 'success';
  if (/\b(failed|declined|unsuccessful)\b/.test(lower)) status = 'failed';
  else if (/\b(pending|processing)\b/.test(lower)) status = 'pending';

  let kind: TxnKind = direction === 'debit' ? 'spend' : 'income';
  if (direction === 'credit') {
    if (/\b(reversed|reversal)\b/.test(lower)) kind = 'reversal';
    else if (/\brefund/.test(lower)) kind = 'refund';
    else if (/\b(salary|sal\b)/.test(lower)) kind = 'income';
  }

  let rawMerchant = '';
  for (const re of MERCHANT_PATTERNS) {
    const m = body.match(re);
    if (m) {
      rawMerchant = m[1].trim();
      break;
    }
  }
  const vpa = body.match(VPA);
  if (vpa && !rawMerchant.includes('@')) rawMerchant = rawMerchant ? `${rawMerchant} ${vpa[1]}` : vpa[1];
  if (!rawMerchant) rawMerchant = 'Unknown';

  const res = resolveMerchant(rawMerchant, overrides);
  if (direction === 'debit') kind = inferDebitKind(body, res.merchantKey, fixedMerchants);
  const ref = body.match(UPI_REF)?.[1];
  const acct = body.match(ACCOUNT)?.[1];

  return {
    id: `sms_${ref ?? hash(sms.sender + sms.receivedAt + amount)}`,
    source: 'sms',
    direction,
    amount,
    status,
    kind,
    at: sms.receivedAt,
    rawMerchant,
    merchant: res.merchant,
    merchantKey: res.merchantKey,
    category: res.category,
    categorySource: res.categorySource,
    upiRef: ref,
    accountLast4: acct,
  };
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
