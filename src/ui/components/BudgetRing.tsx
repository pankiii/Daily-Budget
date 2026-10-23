import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { formatINR } from '../../domain/money';
import { Lang, Paise } from '../../domain/types';
import { t } from '../i18n';
import { colors, remainingColor, type } from '../theme';

interface Props {
  budget: Paise;
  spent: Paise;
  lang: Lang;
  size?: number;
}

/**
 * The hero: how much of today is left.
 * The arc *drains* as you spend (full = untouched budget). When you go over, a red arc
 * starts filling the ring again to show by how much — capped at one full lap.
 * Static SVG, no animation library: cheap enough for ₹8k Android phones.
 */
export function BudgetRing({ budget, spent, lang, size = 248 }: Props) {
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const remaining = budget - spent;
  const over = remaining < 0;
  const frac = budget > 0 ? (over ? Math.min(1, -remaining / budget) : remaining / budget) : over ? 1 : 0;
  const color = remainingColor(remaining, budget);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`${formatINR(Math.abs(remaining))} ${over ? 'over' : 'left'} today out of ${formatINR(budget)}`}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - frac)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[type.tiny, styles.caps]}>{over ? t('overToday', lang) : t('leftToday', lang)}</Text>
      <Text style={[type.hero, { color: over ? colors.bad : colors.ink }]} adjustsFontSizeToFit numberOfLines={1}>
        {formatINR(Math.abs(remaining))}
      </Text>
      <Text style={type.small}>
        {t('ofBudget', lang)} {formatINR(budget)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caps: { textTransform: 'uppercase', marginBottom: 2, fontWeight: '700' },
});
