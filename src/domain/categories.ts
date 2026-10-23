import { CategoryId } from './types';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  hinglish: string;
  emoji: string;
  color: string;
  /** Discretionary categories are eligible to be called a "leak". Bills are not. */
  discretionary: boolean;
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  quick_commerce: { id: 'quick_commerce', label: 'Quick Commerce', hinglish: '10-min delivery', emoji: '⚡', color: '#F5A524', discretionary: true },
  food_delivery: { id: 'food_delivery', label: 'Food Delivery', hinglish: 'Khana order', emoji: '🍔', color: '#F31260', discretionary: true },
  shopping: { id: 'shopping', label: 'Shopping', hinglish: 'Shopping', emoji: '🛍️', color: '#7828C8', discretionary: true },
  coffee: { id: 'coffee', label: 'Coffee & Cafes', hinglish: 'Chai-coffee', emoji: '☕', color: '#8B5E3C', discretionary: true },
  transport: { id: 'transport', label: 'Transport', hinglish: 'Aana-jaana', emoji: '🛺', color: '#006FEE', discretionary: true },
  subscriptions: { id: 'subscriptions', label: 'Subscriptions', hinglish: 'Subscriptions', emoji: '🔁', color: '#17C964', discretionary: true },
  bills: { id: 'bills', label: 'Bills', hinglish: 'Bills', emoji: '🧾', color: '#71717A', discretionary: false },
  other: { id: 'other', label: 'Other', hinglish: 'Baaki sab', emoji: '•', color: '#A1A1AA', discretionary: true },
};

export const CATEGORY_ORDER: CategoryId[] = [
  'quick_commerce',
  'food_delivery',
  'shopping',
  'coffee',
  'transport',
  'subscriptions',
  'bills',
  'other',
];
