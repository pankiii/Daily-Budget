import { CategoryId } from './types';

/**
 * Categorization engine (on-device, deterministic, ~O(patterns) per txn).
 *
 * Order of precedence:
 *   1. User override for this merchantKey ("correct once, remembered forever")
 *   2. Known-merchant directory (brand names, legal entity names, VPA handles)
 *   3. Keyword hints in the narration ("cafe", "electricity", "fuel"…)
 *   4. Other
 *
 * Patterns are matched at word *starts* so "zeptomarketplace@ybl" hits "zepto"
 * but "coca cola" does not hit "ola". Longer patterns are tried first so
 * "swiggy instamart" wins over "swiggy" and "amazon prime" over "amazon".
 */

interface MerchantRule {
  key: string;
  name: string;
  category: CategoryId;
  patterns: string[];
}

const DIRECTORY: MerchantRule[] = [
  // Quick commerce
  { key: 'blinkit', name: 'Blinkit', category: 'quick_commerce', patterns: ['blinkit', 'grofers'] },
  { key: 'zepto', name: 'Zepto', category: 'quick_commerce', patterns: ['zepto', 'kiranakart'] },
  { key: 'instamart', name: 'Swiggy Instamart', category: 'quick_commerce', patterns: ['instamart', 'swiggy instamart'] },
  { key: 'bbnow', name: 'BigBasket', category: 'quick_commerce', patterns: ['bigbasket', 'bb now', 'bbnow', 'innovative retail'] },
  { key: 'flipkart_minutes', name: 'Flipkart Minutes', category: 'quick_commerce', patterns: ['flipkart minutes'] },
  { key: 'jiomart', name: 'JioMart', category: 'quick_commerce', patterns: ['jiomart'] },
  // Food delivery
  { key: 'swiggy', name: 'Swiggy', category: 'food_delivery', patterns: ['swiggy', 'bundl technologies'] },
  { key: 'zomato', name: 'Zomato', category: 'food_delivery', patterns: ['zomato'] },
  { key: 'eatsure', name: 'EatSure', category: 'food_delivery', patterns: ['eatsure'] },
  // Shopping
  { key: 'amazon', name: 'Amazon', category: 'shopping', patterns: ['amazon', 'amzn'] },
  { key: 'flipkart', name: 'Flipkart', category: 'shopping', patterns: ['flipkart'] },
  { key: 'myntra', name: 'Myntra', category: 'shopping', patterns: ['myntra'] },
  { key: 'ajio', name: 'AJIO', category: 'shopping', patterns: ['ajio'] },
  { key: 'nykaa', name: 'Nykaa', category: 'shopping', patterns: ['nykaa'] },
  { key: 'meesho', name: 'Meesho', category: 'shopping', patterns: ['meesho'] },
  { key: 'decathlon', name: 'Decathlon', category: 'shopping', patterns: ['decathlon'] },
  // Coffee & cafes
  { key: 'starbucks', name: 'Starbucks', category: 'coffee', patterns: ['starbucks', 'tata starbucks'] },
  { key: 'thirdwave', name: 'Third Wave Coffee', category: 'coffee', patterns: ['third wave', 'thirdwave'] },
  { key: 'bluetokai', name: 'Blue Tokai', category: 'coffee', patterns: ['blue tokai', 'bluetokai'] },
  { key: 'ccd', name: 'Café Coffee Day', category: 'coffee', patterns: ['cafe coffee day', 'ccd'] },
  { key: 'chaayos', name: 'Chaayos', category: 'coffee', patterns: ['chaayos'] },
  { key: 'chaipoint', name: 'Chai Point', category: 'coffee', patterns: ['chai point', 'chaipoint'] },
  // Transport
  { key: 'uber', name: 'Uber', category: 'transport', patterns: ['uber'] },
  { key: 'ola', name: 'Ola', category: 'transport', patterns: ['ola', 'olacabs', 'ani technologies'] },
  { key: 'rapido', name: 'Rapido', category: 'transport', patterns: ['rapido', 'roppen'] },
  { key: 'nammayatri', name: 'Namma Yatri', category: 'transport', patterns: ['namma yatri', 'nammayatri'] },
  { key: 'metro', name: 'Metro', category: 'transport', patterns: ['dmrc', 'bmrcl', 'mmrcl', 'metro rail', 'metro card'] },
  { key: 'fastag', name: 'FASTag', category: 'transport', patterns: ['fastag'] },
  // Subscriptions
  { key: 'netflix', name: 'Netflix', category: 'subscriptions', patterns: ['netflix'] },
  { key: 'spotify', name: 'Spotify', category: 'subscriptions', patterns: ['spotify'] },
  { key: 'prime', name: 'Amazon Prime', category: 'subscriptions', patterns: ['amazon prime', 'prime video', 'primevideo'] },
  { key: 'hotstar', name: 'JioHotstar', category: 'subscriptions', patterns: ['hotstar', 'jiohotstar', 'jiocinema'] },
  { key: 'youtube', name: 'YouTube Premium', category: 'subscriptions', patterns: ['youtube', 'google youtube'] },
  { key: 'apple', name: 'Apple', category: 'subscriptions', patterns: ['apple com bill', 'apple services', 'itunes'] },
  { key: 'cult', name: 'cult.fit', category: 'subscriptions', patterns: ['cultfit', 'cult fit', 'curefit'] },
  // Bills
  { key: 'airtel', name: 'Airtel', category: 'bills', patterns: ['airtel'] },
  { key: 'jio', name: 'Jio', category: 'bills', patterns: ['jio', 'reliance jio'] },
  { key: 'vi', name: 'Vi', category: 'bills', patterns: ['vodafone', 'vodafone idea'] },
  { key: 'bescom', name: 'BESCOM', category: 'bills', patterns: ['bescom'] },
  { key: 'tatapower', name: 'Tata Power', category: 'bills', patterns: ['tata power'] },
  { key: 'adani_elec', name: 'Adani Electricity', category: 'bills', patterns: ['adani electricity'] },
  { key: 'act', name: 'ACT Fibernet', category: 'bills', patterns: ['act fibernet', 'atria convergence'] },
];

const KEYWORDS: { pattern: string; category: CategoryId }[] = [
  { pattern: 'cafe', category: 'coffee' },
  { pattern: 'coffee', category: 'coffee' },
  { pattern: 'chai', category: 'coffee' },
  { pattern: 'tea', category: 'coffee' },
  { pattern: 'petrol', category: 'transport' },
  { pattern: 'fuel', category: 'transport' },
  { pattern: 'hpcl', category: 'transport' },
  { pattern: 'bpcl', category: 'transport' },
  { pattern: 'iocl', category: 'transport' },
  { pattern: 'parking', category: 'transport' },
  { pattern: 'electricity', category: 'bills' },
  { pattern: 'broadband', category: 'bills' },
  { pattern: 'recharge', category: 'bills' },
  { pattern: 'bbps', category: 'bills' },
  { pattern: 'insurance', category: 'bills' },
  { pattern: 'subscription', category: 'subscriptions' },
];

/** Bank codes and UPI noise that appear in narrations but are never the merchant. */
const NOISE = new Set([
  'upi', 'dr', 'cr', 'p2m', 'p2a', 'imps', 'neft', 'rtgs', 'ach', 'nach', 'ecs', 'mandate', 'pos', 'ecom', 'payment', 'pay', 'paid', 'to', 'from',
  'yesb', 'hdfc', 'icic', 'sbin', 'utib', 'kkbk', 'pytm', 'axis', 'ybl', 'okhdfcbank', 'okicici', 'oksbi',
  'okaxis', 'paytm', 'ibl', 'axl', 'apl', 'collect', 'request', 'na', 'ref', 'txn',
]);

/** Lowercase, strip punctuation, collapse spaces. "blinkit.payu@hdfcbank" → "blinkit payu hdfcbank". */
export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Flatten + sort by pattern length (desc) once at module load.
const COMPILED = DIRECTORY.flatMap((rule) =>
  rule.patterns.map((p) => ({ rule, len: p.length, re: new RegExp(`(?:^|\\s)${escape(p)}`) })),
).sort((a, b) => b.len - a.len);

const KEYWORD_RES = KEYWORDS.map((k) => ({ ...k, re: new RegExp(`(?:^|\\s)${escape(k.pattern)}(?:\\s|$)`) }));

export interface MerchantResolution {
  merchant: string;
  merchantKey: string;
  category: CategoryId;
  categorySource: 'rule' | 'user' | 'default';
  confidence: number;
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

/** Best-effort display name for merchants not in the directory (P2P, local shops). */
function guessName(raw: string): { name: string; key: string } {
  const vpa = raw.match(/([a-z0-9._-]+)@([a-z]+)/i);
  // Narrations like "UPI/DR/428812345678/RAMESH KUMAR/SBIN/ramesh@oksbi/Pay"
  const segments = raw.split(/[\/|]/).map((s) => s.trim()).filter(Boolean);
  const named = segments.find(
    (s) => /^[a-z][a-z .&'-]{2,}$/i.test(s) && !NOISE.has(s.toLowerCase()) && !s.includes('@'),
  );
  if (named) {
    const key = vpa ? vpa[0].toLowerCase() : normalizeText(named);
    return { name: titleCase(named), key };
  }
  if (vpa) {
    const handle = vpa[1].replace(/[._-]+/g, ' ').replace(/\d{6,}/g, '').trim();
    return { name: handle ? titleCase(handle) : vpa[0], key: vpa[0].toLowerCase() };
  }
  const n = normalizeText(raw).split(' ').filter((w) => !NOISE.has(w) && !/^\d+$/.test(w)).slice(0, 4).join(' ');
  return { name: n ? titleCase(n) : 'Unknown', key: n || 'unknown' };
}

export function resolveMerchant(
  raw: string,
  overrides: Record<string, CategoryId> = {},
): MerchantResolution {
  const text = normalizeText(raw);
  const hit = COMPILED.find((c) => c.re.test(text));
  let merchant: string;
  let merchantKey: string;
  let category: CategoryId;
  let categorySource: MerchantResolution['categorySource'];
  let confidence: number;

  if (hit) {
    merchant = hit.rule.name;
    merchantKey = hit.rule.key;
    category = hit.rule.category;
    categorySource = 'rule';
    confidence = 0.95;
  } else {
    const g = guessName(raw);
    merchant = g.name;
    merchantKey = g.key;
    const kw = KEYWORD_RES.find((k) => k.re.test(text));
    category = kw ? kw.category : 'other';
    categorySource = kw ? 'rule' : 'default';
    confidence = kw ? 0.6 : 0.2;
  }

  const override = overrides[merchantKey];
  if (override) {
    category = override;
    categorySource = 'user';
    confidence = 1;
  }
  return { merchant, merchantKey, category, categorySource, confidence };
}
