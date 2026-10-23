import { Paise } from './types';

/**
 * Indian digit grouping: last 3 digits, then groups of 2 (1,00,000 / 12,34,567).
 * Hand-rolled instead of Intl so it behaves identically on old Android WebViews / Hermes builds.
 */
export function groupIndian(n: number): string {
  const s = Math.trunc(Math.abs(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

/** ₹1,00,000 — whole rupees (rounded), the default everywhere in the UI. */
export function formatINR(paise: Paise, opts: { sign?: boolean; decimals?: boolean } = {}): string {
  const negative = paise < 0;
  const abs = Math.abs(paise);
  let body: string;
  if (opts.decimals) {
    const rupees = Math.floor(abs / 100);
    const p = (abs % 100).toString().padStart(2, '0');
    body = `${groupIndian(rupees)}.${p}`;
  } else {
    body = groupIndian(Math.round(abs / 100));
  }
  const sign = negative ? '−' : opts.sign ? '+' : '';
  return `${sign}₹${body}`;
}

/** Compact form for tight UI: ₹3.2K, ₹1.2L, ₹2.5Cr. */
export function formatINRCompact(paise: Paise): string {
  const r = Math.abs(paise) / 100;
  const sign = paise < 0 ? '−' : '';
  if (r >= 1e7) return `${sign}₹${trim(r / 1e7)}Cr`;
  if (r >= 1e5) return `${sign}₹${trim(r / 1e5)}L`;
  if (r >= 1e3) return `${sign}₹${trim(r / 1e3)}K`;
  return `${sign}₹${Math.round(r)}`;
}

function trim(x: number): string {
  return (Math.round(x * 10) / 10).toString();
}

export const rupees = (r: number): Paise => Math.round(r * 100);

/** Parses "1,00,000", "₹ 2,500.50", "Rs.600" → paise. Returns null when not a number. */
export function parseINR(input: string): Paise | null {
  const cleaned = input.replace(/[₹,\s]|rs\.?|inr/gi, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}
