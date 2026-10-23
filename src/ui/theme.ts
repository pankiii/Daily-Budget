import { PaceStatus } from '../domain/budget';

export const colors = {
  bg: '#F7F4EE',
  card: '#FFFFFF',
  ink: '#1C1917',
  inkSoft: '#57534E',
  muted: '#8A837C',
  line: '#E9E4DC',
  brand: '#4B2EDB',
  brandSoft: '#ECE8FF',
  good: '#16A34A',
  goodSoft: '#E3F6E9',
  warn: '#D97706',
  warnSoft: '#FDF1DE',
  bad: '#DC2626',
  badSoft: '#FDE5E5',
  track: '#EEEAE3',
};

export const space = (n: number) => n * 4;

export const radius = { sm: 8, md: 14, lg: 22, pill: 999 };

export const type = {
  hero: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -1, color: colors.ink },
  h1: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.4, color: colors.ink },
  h2: { fontSize: 18, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 15, color: colors.ink },
  small: { fontSize: 13, color: colors.inkSoft },
  tiny: { fontSize: 11, color: colors.muted, letterSpacing: 0.3 },
};

/** Ring colour for "how much of today is left". */
export function remainingColor(remaining: number, budget: number): string {
  if (remaining < 0) return colors.bad;
  if (budget <= 0 || remaining / budget < 0.2) return colors.warn;
  return colors.good;
}

export const PACE_META: Record<PaceStatus, { label: string; hinglish: string; color: string; soft: string }> = {
  on_track: { label: 'On track', hinglish: 'Sahi chal raha hai', color: colors.good, soft: colors.goodSoft },
  slightly_over: { label: 'Slightly over', hinglish: 'Thoda zyada', color: colors.warn, soft: colors.warnSoft },
  danger: { label: 'Danger zone', hinglish: 'Khatre mein', color: colors.bad, soft: colors.badSoft },
};
