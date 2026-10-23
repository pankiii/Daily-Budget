import { Lang } from '../domain/types';

/** UI strings. Hinglish is written in Latin script, the way people actually text. */
const STRINGS = {
  today: { en: 'Today', hinglish: 'Aaj' },
  leftToday: { en: 'left today', hinglish: 'aaj bache' },
  overToday: { en: 'over today', hinglish: 'aaj zyada' },
  ofBudget: { en: 'of', hinglish: 'mein se' },
  spentToday: { en: 'Spent today', hinglish: 'Aaj kharcha' },
  monthLeft: { en: 'Month left', hinglish: 'Mahine ka bacha' },
  pace: { en: 'Monthly pace', hinglish: 'Mahine ki speed' },
  streak: { en: 'day streak', hinglish: 'din ka streak' },
  todaysSpends: { en: "Today's spends", hinglish: 'Aaj ke kharche' },
  nothingYet: { en: 'Nothing spent yet today. Iconic.', hinglish: 'Aaj abhi tak zero kharcha. Legend.' },
  add: { en: 'Add expense', hinglish: 'Kharcha add karo' },
  tabHome: { en: 'Today', hinglish: 'Aaj' },
  tabTxns: { en: 'Spends', hinglish: 'Kharche' },
  tabInsights: { en: 'Insights', hinglish: 'Insights' },
  tabSettings: { en: 'Settings', hinglish: 'Settings' },
  rolledIn: { en: 'rolled over from earlier days', hinglish: 'pichle din ka bacha hua' },
  rolledOut: { en: 'less due to earlier overspend', hinglish: 'pichle overspend ki wajah se kam' },
  whereDidItGo: { en: 'Where did it go?', hinglish: 'Paisa gaya kahan?' },
  topLeaks: { en: 'Top 3 leaks', hinglish: 'Top 3 leaks' },
  realityCheck: { en: 'Weekly reality check', hinglish: 'Weekly reality check' },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang];
}
