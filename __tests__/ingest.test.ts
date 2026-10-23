import { resolveMerchant } from '../src/domain/categorize';
import { mapAaTransaction } from '../src/ingest/accountAggregator';
import { parseBankSms } from '../src/ingest/smsParser';

describe('categorization', () => {
  it.each([
    ['UPI/DR/428812345678/BLINKIT/YESB/blinkit.payu@yesbank/Pay', 'Blinkit', 'quick_commerce'],
    ['zeptomarketplace@ybl', 'Zepto', 'quick_commerce'],
    ['SWIGGY INSTAMART', 'Swiggy Instamart', 'quick_commerce'],
    ['Swiggy Limited', 'Swiggy', 'food_delivery'],
    ['AMAZON PRIME MEMBERSHIP', 'Amazon Prime', 'subscriptions'],
    ['AMAZON PAY INDIA', 'Amazon', 'shopping'],
    ['THIRD WAVE COFFEE ROASTERS', 'Third Wave Coffee', 'coffee'],
    ['olacabs@icici', 'Ola', 'transport'],
    ['BMRCL METRO CARD RECHARGE', 'Metro', 'transport'],
  ])('%s → %s (%s)', (raw, name, cat) => {
    const r = resolveMerchant(raw);
    expect(r.merchant).toBe(name);
    expect(r.category).toBe(cat);
  });

  it('does not see "ola" inside "coca cola"', () => {
    expect(resolveMerchant('COCA COLA VENDING').category).not.toBe('transport');
  });

  it('falls back to keywords, then Other', () => {
    expect(resolveMerchant('SHARMA CAFE AND BAKERY').category).toBe('coffee');
    const p2p = resolveMerchant('UPI/DR/428812345690/RAMESH KUMAR/SBIN/ramesh.k@oksbi/Pay');
    expect(p2p.merchant).toBe('Ramesh Kumar');
    expect(p2p.category).toBe('other');
    expect(p2p.merchantKey).toBe('ramesh.k@oksbi');
  });

  it('skips mandate prefixes when naming unknown payees', () => {
    expect(resolveMerchant('ACH/RENT/NACH MANDATE').merchant).toBe('Rent');
    expect(resolveMerchant('NEFT/SALARY/ACME TECH PVT LTD').merchant).toBe('Salary');
  });

  it('remembers a user correction for that merchant', () => {
    const r = resolveMerchant('ramesh.k@oksbi', { 'ramesh.k@oksbi': 'coffee' });
    expect(r.category).toBe('coffee');
    expect(r.categorySource).toBe('user');
  });
});

describe('SMS parser', () => {
  const at = '2026-10-22T10:00:00+05:30';

  it('parses a UPI debit', () => {
    const t = parseBankSms({
      sender: 'VM-HDFCBK',
      receivedAt: at,
      body: 'Sent Rs.600.00 From HDFC Bank A/C *1234 To BLINKIT On 22/10/26 Ref 428812345678 Not You? Call 18002586161',
    })!;
    expect(t.amount).toBe(60000);
    expect(t.direction).toBe('debit');
    expect(t.merchant).toBe('Blinkit');
    expect(t.upiRef).toBe('428812345678');
    expect(t.accountLast4).toBe('1234');
    expect(t.kind).toBe('spend');
  });

  it('parses a card spend', () => {
    const t = parseBankSms({
      sender: 'AD-ICICIB',
      receivedAt: at,
      body: 'INR 250.00 spent on ICICI Bank Card XX9876 at STARBUCKS on 22-Oct-26. Avl Lmt: INR 1,20,000.00',
    })!;
    expect(t.merchant).toBe('Starbucks');
    expect(t.category).toBe('coffee');
  });

  it('detects failed and reversed transactions', () => {
    expect(
      parseBankSms({ sender: 'VM-SBIUPI', receivedAt: at, body: 'Your UPI txn of Rs 400 to zepto@ybl has failed. Ref 428812349999' })!.status,
    ).toBe('failed');
    const rev = parseBankSms({
      sender: 'VM-SBIUPI',
      receivedAt: at,
      body: 'Rs 400.00 credited to A/c XX5678 towards reversal of UPI Ref 428812349999',
    })!;
    expect(rev.direction).toBe('credit');
    expect(rev.kind).toBe('reversal');
  });

  it('ignores OTPs, promos and non-bank senders', () => {
    expect(parseBankSms({ sender: 'VM-HDFCBK', receivedAt: at, body: '123456 is your OTP for txn of Rs 500' })).toBeNull();
    expect(parseBankSms({ sender: '+919876543210', receivedAt: at, body: 'Sent Rs.600 to you' })).toBeNull();
  });
});

describe('Account Aggregator mapping', () => {
  const acct = { linkRefNumber: 'L1', maskedAccNumber: 'XXXXXXXX1234', fipName: 'HDFC Bank' };

  it('maps a UPI debit from FI data', () => {
    const t = mapAaTransaction(
      { txnId: 'T1', type: 'DEBIT', mode: 'UPI', amount: '600.00', transactionTimestamp: '2026-10-22T10:00:00+05:30', narration: 'UPI/DR/428812345678/BLINKIT/YESB/blinkit.payu@yesbank/Pay' },
      acct,
    );
    expect(t.amount).toBe(60000);
    expect(t.upiRef).toBe('428812345678');
    expect(t.accountLast4).toBe('1234');
    expect(t.category).toBe('quick_commerce');
  });

  it('treats ACH / SIP mandates as fixed costs', () => {
    const t = mapAaTransaction(
      { txnId: 'T2', type: 'DEBIT', mode: 'ACH', amount: '10000.00', transactionTimestamp: '2026-10-05T06:00:00+05:30', narration: 'ACH/ZERODHA COIN/SIP' },
      acct,
    );
    expect(t.kind).toBe('fixed');
  });
});
