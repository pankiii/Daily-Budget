import { formatINR } from './money';
import { Lang, Paise, Tone } from './types';

/**
 * Notification copy engine.
 *
 * Voice rules (see docs/05-notifications.md):
 *   - Roast the *decision*, never the *person*. No "you're broke", no body/identity jokes.
 *   - Every bad-day message points to a way out (tomorrow's number, a streak to restart).
 *   - Numbers first: the ₹ figure must be readable in the lock-screen preview.
 *   - Gentle mode keeps the facts and drops the jokes.
 *
 * Picks are deterministic per (day, slot) so the same notification doesn't change on re-render.
 */

export interface Msg {
  title: string;
  body: string;
}

type Variant = Record<Tone, Record<Lang, Array<(v: any) => Msg>>>;

function pick<T>(pool: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return pool[Math.abs(h) % pool.length];
}

const r = (p: Paise) => formatINR(p);

// ---------- Morning ----------

interface MorningVars {
  budget: Paise;
  rollover: Paise;
  name: string;
  streak: number;
}

const rolloverLine = (v: MorningVars, lang: Lang) => {
  if (v.rollover > 0) return lang === 'en' ? ` (+${r(v.rollover)} rolled over)` : ` (pichla bacha ${r(v.rollover)} add ho gaya)`;
  if (v.rollover < 0) return lang === 'en' ? ` (${r(-v.rollover)} less after earlier overspends)` : ` (pichle overspend se ${r(-v.rollover)} kam)`;
  return '';
};

const MORNING: Variant = {
  roast: {
    en: [
      (v: MorningVars) => ({ title: `Good morning, ${v.name}! ☀️`, body: `Your budget today is ${r(v.budget)}${rolloverLine(v, 'en')}. Spend it like you mean it.` }),
      (v: MorningVars) => ({ title: `${r(v.budget)} for today`, body: `That's the whole bag${rolloverLine(v, 'en')}. Blinkit is not a personality trait.` }),
      (v: MorningVars) => ({ title: `Rise and budget 🌅`, body: `${r(v.budget)} today${rolloverLine(v, 'en')}.${v.streak >= 2 ? ` ${v.streak}-day streak on the line. No pressure. (Some pressure.)` : ''}` }),
    ],
    hinglish: [
      (v: MorningVars) => ({ title: `Good morning ${v.name}! ☀️`, body: `Aaj ka budget ${r(v.budget)}${rolloverLine(v, 'hinglish')}. Soch samajh ke udaana.` }),
      (v: MorningVars) => ({ title: `Aaj ke ${r(v.budget)}`, body: `Itna hi hai boss${rolloverLine(v, 'hinglish')}. Zepto ko "bas ek cheez" mat bolna.` }),
      (v: MorningVars) => ({ title: `Uth gaye? Budget bhi uth gaya 🌅`, body: `${r(v.budget)} aaj ke liye${rolloverLine(v, 'hinglish')}.${v.streak >= 2 ? ` ${v.streak} din ka streak chal raha hai, sambhal ke!` : ''}` }),
    ],
  },
  gentle: {
    en: [
      (v: MorningVars) => ({ title: `Good morning, ${v.name}`, body: `Your budget today is ${r(v.budget)}${rolloverLine(v, 'en')}.` }),
    ],
    hinglish: [
      (v: MorningVars) => ({ title: `Good morning ${v.name}`, body: `Aaj ka budget ${r(v.budget)} hai${rolloverLine(v, 'hinglish')}.` }),
    ],
  },
};

// ---------- After each transaction ----------

interface TxnVars {
  merchant: string;
  amount: Paise;
  left: Paise; // today's remaining after this txn, can be negative
  budget: Paise;
}

const TXN_OK: Variant = {
  roast: {
    en: [(v: TxnVars) => ({ title: `${v.merchant} −${r(v.amount)}`, body: `${r(v.left)} left today.` })],
    hinglish: [(v: TxnVars) => ({ title: `${v.merchant} −${r(v.amount)}`, body: `Aaj ke ${r(v.left)} bache.` })],
  },
  gentle: {
    en: [(v: TxnVars) => ({ title: `${v.merchant} −${r(v.amount)}`, body: `${r(v.left)} left today.` })],
    hinglish: [(v: TxnVars) => ({ title: `${v.merchant} −${r(v.amount)}`, body: `Aaj ke ${r(v.left)} bache.` })],
  },
};

const TXN_LOW: Variant = {
  roast: {
    en: [
      (v: TxnVars) => ({ title: `${v.merchant} −${r(v.amount)}`, body: `${r(v.left)} left. Running on fumes, champ ⛽` }),
      (v: TxnVars) => ({ title: `${v.merchant} −${r(v.amount)}`, body: `Only ${r(v.left)} left today. Maybe the next craving can wait till tomorrow.` }),
    ],
    hinglish: [(v: TxnVars) => ({ title: `${v.merchant} −${r(v.amount)}`, body: `Sirf ${r(v.left)} bache. Ab bas karo yaar 🙏` })],
  },
  gentle: {
    en: [(v: TxnVars) => ({ title: `${v.merchant} −${r(v.amount)}`, body: `${r(v.left)} left today. You're close to your limit.` })],
    hinglish: [(v: TxnVars) => ({ title: `${v.merchant} −${r(v.amount)}`, body: `${r(v.left)} bache hain. Limit ke paas ho.` })],
  },
};

const TXN_OVER: Variant = {
  roast: {
    en: [
      (v: TxnVars) => ({ title: `${v.merchant} −${r(v.amount)} 🚨`, body: `You're ${r(-v.left)} over today. Tomorrow-you just got a smaller allowance.` }),
      (v: TxnVars) => ({ title: `${v.merchant} −${r(v.amount)}`, body: `${r(-v.left)} over budget. The cart was full; so is the regret.` }),
    ],
    hinglish: [(v: TxnVars) => ({ title: `${v.merchant} −${r(v.amount)} 🚨`, body: `Aaj ${r(-v.left)} over ho gaye. Kal wale tum gussa honge.` })],
  },
  gentle: {
    en: [(v: TxnVars) => ({ title: `${v.merchant} −${r(v.amount)}`, body: `You're ${r(-v.left)} over today's budget. Tomorrow adjusts automatically.` })],
    hinglish: [(v: TxnVars) => ({ title: `${v.merchant} −${r(v.amount)}`, body: `Aaj ${r(-v.left)} zyada ho gaya. Kal ka budget apne aap adjust hoga.` })],
  },
};

// ---------- Night summary ----------

interface NightVars {
  budget: Paise;
  spent: Paise;
  streak: number; // including today if under
  topMerchant?: string;
}

const NIGHT_UNDER: Variant = {
  roast: {
    en: [
      (v: NightVars) => ({ title: `Saved ${r(v.budget - v.spent)} today 🏆`, body: `Budget ${r(v.budget)}, spent ${r(v.spent)}. It rolls into tomorrow. Look at you, being an adult.` }),
      (v: NightVars) => ({ title: `Under budget. Again. 😎`, body: `Spent ${r(v.spent)} of ${r(v.budget)}. ${v.streak}-day streak. Your future self says thanks.` }),
      (v: NightVars) => ({ title: `Zero-spend energy ✨`, body: `Only ${r(v.spent)} today. ${r(v.budget - v.spent)} goes to tomorrow. Quick commerce apps are filing a missing person report.` }),
    ],
    hinglish: [
      (v: NightVars) => ({ title: `Aaj ${r(v.budget - v.spent)} bachaye 🏆`, body: `Budget ${r(v.budget)}, kharcha ${r(v.spent)}. Kal ke budget mein add ho gaya. Kya baat hai!` }),
      (v: NightVars) => ({ title: `${v.streak} din ka streak 🔥`, body: `${r(v.spent)} hi kharche aaj. Mummy proud hoti.` }),
    ],
  },
  gentle: {
    en: [(v: NightVars) => ({ title: `Nice day 🌙`, body: `Budget ${r(v.budget)}, spent ${r(v.spent)}. ${r(v.budget - v.spent)} rolls into tomorrow.` })],
    hinglish: [(v: NightVars) => ({ title: `Accha din tha 🌙`, body: `Budget ${r(v.budget)}, kharcha ${r(v.spent)}. ${r(v.budget - v.spent)} kal ke liye.` })],
  },
};

const NIGHT_OVER: Variant = {
  roast: {
    en: [
      (v: NightVars) => ({ title: `${r(v.spent - v.budget)} over today 😭`, body: `Budget ${r(v.budget)}. Spent ${r(v.spent)}. You're literally working to fund your own bad decisions. Fresh start tomorrow.` }),
      (v: NightVars) => ({ title: `Plot twist: overspent 🎬`, body: `${r(v.spent)} vs ${r(v.budget)}.${v.topMerchant ? ` ${v.topMerchant} was the villain.` : ''} Tomorrow's budget is a bit smaller. Redemption arc starts at 8am.` }),
      (v: NightVars) => ({ title: `Budget ${r(v.budget)}. Vibes ${r(v.spent)}.`, body: `${r(v.spent - v.budget)} over. It happens. Sleep on it, not on the Myntra app.` }),
    ],
    hinglish: [
      (v: NightVars) => ({ title: `Aaj ${r(v.spent - v.budget)} over 😭`, body: `Budget ${r(v.budget)}, kharcha ${r(v.spent)}. Office jaake apne hi shauk ki EMI bhar rahe ho. Kal naya din hai.` }),
      (v: NightVars) => ({ title: `Thoda zyada ho gaya 🙈`, body: `${r(v.spent)} vs ${r(v.budget)}.${v.topMerchant ? ` ${v.topMerchant} ne loot liya.` : ''} Kal ka budget thoda kam hoga, chalta hai.` }),
    ],
  },
  gentle: {
    en: [(v: NightVars) => ({ title: `Today's summary`, body: `Budget ${r(v.budget)}, spent ${r(v.spent)}. ${r(v.spent - v.budget)} over — tomorrow adjusts automatically.` })],
    hinglish: [(v: NightVars) => ({ title: `Aaj ka summary`, body: `Budget ${r(v.budget)}, kharcha ${r(v.spent)}. ${r(v.spent - v.budget)} zyada — kal adjust ho jayega.` })],
  },
};

// ---------- Public API ----------

export function morningMessage(v: MorningVars, tone: Tone, lang: Lang, seed: string): Msg {
  return pick(MORNING[tone][lang], seed + 'm')(v);
}

/** In-app status line between morning and night (not a push; we don't nag mid-day). */
export function middayMessage(v: { budget: Paise; spent: Paise }, tone: Tone, lang: Lang): Msg {
  const left = v.budget - v.spent;
  if (left < 0) {
    return lang === 'en'
      ? { title: `${r(-left)} over so far`, body: tone === 'roast' ? 'The day is not over. Neither is the damage, apparently. Tomorrow adjusts.' : 'Tomorrow adjusts automatically. No more today, maybe?' }
      : { title: `Abhi tak ${r(-left)} over`, body: tone === 'roast' ? 'Din khatam nahi hua, kharcha bhi nahi. Kal adjust ho jayega.' : 'Kal ka budget apne aap adjust hoga.' };
  }
  const frac = v.budget > 0 ? left / v.budget : 0;
  if (lang === 'en') {
    return {
      title: `${r(left)} left for today`,
      body: frac > 0.5 ? (tone === 'roast' ? 'Plenty of room. Doesn’t mean you have to fill it.' : 'Comfortably within budget.') : tone === 'roast' ? 'More than half gone. Pace yourself, champ.' : 'Over half used — easy does it.',
    };
  }
  return {
    title: `Aaj ke ${r(left)} bache`,
    body: frac > 0.5 ? (tone === 'roast' ? 'Kaafi jagah hai. Bharna zaroori nahi hai.' : 'Budget mein ho, badhiya.') : tone === 'roast' ? 'Aadha se zyada gaya. Thoda dheere boss.' : 'Aadha use ho gaya — aaram se.',
  };
}

export function transactionMessage(v: TxnVars, tone: Tone, lang: Lang, seed: string): Msg {
  const table = v.left < 0 ? TXN_OVER : v.left < v.budget * 0.15 ? TXN_LOW : TXN_OK;
  return pick(table[tone][lang], seed + 't')(v);
}

export function nightMessage(v: NightVars, tone: Tone, lang: Lang, seed: string): Msg {
  const table = v.spent > v.budget ? NIGHT_OVER : NIGHT_UNDER;
  return pick(table[tone][lang], seed + 'n')(v);
}
