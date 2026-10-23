import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { monthPlan } from '../domain/budget';
import { nightMessage } from '../domain/copy';
import { realityGap } from '../domain/insights';
import { formatINR, parseINR, rupees } from '../domain/money';
import { BudgetProfile, Lang, Tone } from '../domain/types';
import { DEMO_PROFILE } from '../data/seed';
import { DEFAULT_SETTINGS, useApp } from '../state/store';
import { Button, Card, Chip, Toggle } from '../ui/components/common';
import { colors, radius, space, type } from '../ui/theme';

const FIXED_FIELDS = [
  { id: 'rent', label: 'Rent', placeholder: '25,000' },
  { id: 'emi', label: 'EMIs', placeholder: '8,000' },
  { id: 'sip', label: 'SIPs / investments', placeholder: '10,000' },
  { id: 'bills', label: 'Bills (electricity, wifi, phone)', placeholder: '4,000' },
  { id: 'other', label: 'Other fixed (maid, gym, family)', placeholder: '0' },
];

const STEPS = 6;

export function OnboardingScreen() {
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState<Lang>('en');
  const [name, setName] = useState('');
  const [incomeText, setIncomeText] = useState('');
  const [fixedText, setFixedText] = useState<Record<string, string>>({});
  const [savingsText, setSavingsText] = useState('');
  const [consentBudget, setConsentBudget] = useState(false);
  const [consentSms, setConsentSms] = useState(false);
  const [adult, setAdult] = useState(false);
  const [demoData, setDemoData] = useState(true);
  const [tone, setTone] = useState<Tone>('roast');

  const income = parseINR(incomeText) ?? 0;
  const savings = parseINR(savingsText) ?? 0;

  const profile: BudgetProfile = useMemo(
    () => ({
      name: name.trim() || 'there',
      monthlyIncome: income,
      fixedExpenses: FIXED_FIELDS.map((f) => ({ id: f.id, label: f.label.split(' (')[0], amount: parseINR(fixedText[f.id] ?? '') ?? 0 })).filter((f) => f.amount > 0),
      savingsGoal: savings,
      rolloverMode: 'spread',
      workHoursPerMonth: 176,
    }),
    [name, income, fixedText, savings],
  );
  const now = new Date();
  const plan = monthPlan(profile, now.getFullYear(), now.getMonth());
  const gap = realityGap(plan);
  const fixedTotal = plan.fixedTotal;

  const finish = (p: BudgetProfile, useDemo: boolean) =>
    completeOnboarding({
      profile: p,
      settings: { ...DEFAULT_SETTINGS, tone, lang },
      // Demo-skip never collects real data, so no consent is recorded on that path.
      consent: { budgetingPurpose: consentBudget, smsParsing: consentSms, accountAggregator: false },
      useDemoData: useDemo,
    });

  const canNext = [true, income > 0, true, income - fixedTotal - savings > 0, true, consentBudget && adult][step];

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      {step > 0 ? (
        <View style={styles.progress}>
          {Array.from({ length: STEPS - 1 }).map((_, i) => (
            <View key={i} style={[styles.progressDot, i < step && { backgroundColor: colors.brand }]} />
          ))}
        </View>
      ) : null}

      {step === 0 && (
        <View>
          <Text style={styles.logo}>₹/day</Text>
          <Text style={[type.h1, { fontSize: 32, lineHeight: 38, marginTop: space(6) }]}>Your salary,{'\n'}but daily.</Text>
          <Text style={[type.body, { marginTop: space(3), color: colors.inkSoft }]}>
            Turn your monthly income into one number you can actually follow: what you can spend today. Then watch it in real time.
          </Text>
          <Text style={[type.tiny, styles.label]}>LANGUAGE</Text>
          <View style={styles.row}>
            <Chip label="English" active={lang === 'en'} onPress={() => setLang('en')} />
            <Chip label="Hinglish" active={lang === 'hinglish'} onPress={() => setLang('hinglish')} />
          </View>
          <Button label={lang === 'en' ? "Let's set it up · 1 min" : 'Chalo setup karte hain · 1 min'} onPress={() => setStep(1)} style={{ marginTop: space(8) }} />
          <Button
            label="Skip — explore with a demo profile"
            kind="secondary"
            style={{ marginTop: space(3) }}
            onPress={() => finish(DEMO_PROFILE, true)}
          />
        </View>
      )}

      {step === 1 && (
        <View>
          <Text style={type.h1}>What lands in your account every month?</Text>
          <Text style={[type.small, styles.help]}>Take-home salary after tax & PF. Just a number; no bank login.</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Your first name" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="words" />
          <View style={styles.amountRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput value={incomeText} onChangeText={setIncomeText} placeholder="1,00,000" placeholderTextColor={colors.muted} keyboardType="numeric" style={styles.amount} autoFocus />
          </View>
          {income > 0 ? <Text style={type.small}>{formatINR(income)} / month</Text> : null}
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={type.h1}>The money that's gone before it arrives</Text>
          <Text style={[type.small, styles.help]}>Fixed costs come out first. We'll skip these when they show up in your bank, so they're never counted twice.</Text>
          {FIXED_FIELDS.map((f) => (
            <View key={f.id} style={{ marginTop: space(3) }}>
              <Text style={[type.tiny, { fontWeight: '700', marginBottom: 4 }]}>{f.label.toUpperCase()}</Text>
              <TextInput
                value={fixedText[f.id] ?? ''}
                onChangeText={(v) => setFixedText((s) => ({ ...s, [f.id]: v }))}
                placeholder={`₹ ${f.placeholder}`}
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          ))}
          <Text style={[type.body, { marginTop: space(4), fontWeight: '700' }]}>Total fixed: {formatINR(fixedTotal)}</Text>
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={type.h1}>Pay yourself first</Text>
          <Text style={[type.small, styles.help]}>How much do you want to save every month, on top of SIPs? This is never part of your daily budget.</Text>
          <View style={[styles.row, { marginTop: space(4) }]}>
            {[0.1, 0.15, 0.2].map((p) => {
              const v = Math.round((income * p) / 100000) * 100000; // paise, nearest ₹1,000
              return <Chip key={p} label={`${p * 100}% · ${formatINR(v)}`} active={savings === v} onPress={() => setSavingsText(String(v / 100))} />;
            })}
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput value={savingsText} onChangeText={setSavingsText} placeholder="10,000" placeholderTextColor={colors.muted} keyboardType="numeric" style={styles.amount} />
          </View>
          {income - fixedTotal - savings <= 0 && savingsText ? (
            <Text style={[type.small, { color: colors.bad }]}>That leaves nothing to spend. Try a smaller goal.</Text>
          ) : null}
        </View>
      )}

      {step === 4 && (
        <View>
          <Text style={type.h1}>Here's the uncomfortable bit 👀</Text>
          <Card style={{ marginTop: space(5) }}>
            <Text style={type.small}>What your salary feels like</Text>
            <Text style={[type.hero, { color: colors.muted, textDecorationLine: 'line-through' }]}>{formatINR(gap.raw)}/day</Text>
            <Text style={[type.tiny, { marginTop: 2 }]}>income ÷ {plan.daysInMonth} days</Text>
          </Card>
          <Card style={{ marginTop: space(3), borderColor: colors.brand, borderWidth: 2 }}>
            <Text style={type.small}>What you can actually spend</Text>
            <Text style={[type.hero, { color: colors.brand }]}>{formatINR(gap.real)}/day</Text>
            <Text style={[type.tiny, { marginTop: 2 }]}>
              ({formatINR(income)} − {formatINR(fixedTotal)} fixed − {formatINR(savings)} savings) ÷ {plan.daysInMonth}
            </Text>
          </Card>
          <Text style={[type.body, { marginTop: space(4) }]}>
            Your real daily budget is <Text style={{ fontWeight: '800' }}>{gap.percentSmaller}% smaller</Text> than it feels. That gap is where the money "disappears".
          </Text>
          <Text style={[type.small, { marginTop: space(2) }]}>Don't spend it all today? It rolls into tomorrow. Overspend? Tomorrow shrinks a little.</Text>
        </View>
      )}

      {step === 5 && (
        <View>
          <Text style={type.h1}>Your data, your rules</Text>
          <Text style={[type.small, styles.help]}>We ask for each permission separately, and you can withdraw any of them later in Settings.</Text>
          <ConsentRow
            title="I'm 18 or older"
            sub="Required. Under the DPDP Act, data of minors needs verifiable parental consent, which this app doesn't support yet."
            value={adult}
            onChange={setAdult}
          />
          <ConsentRow
            title="Use my transactions to calculate my budget & insights"
            sub="Required. Amount, merchant, time & category only. Stored on this phone, encrypted in production builds. Never sold or shared."
            value={consentBudget}
            onChange={setConsentBudget}
          />
          <ConsentRow
            title="Read bank SMS on this phone"
            sub={Platform.OS === 'android' ? 'Optional. Only messages from bank sender IDs. OTPs and personal chats are ignored. Raw SMS never leaves the phone.' : 'Android only.'}
            value={consentSms}
            onChange={setConsentSms}
            disabled={Platform.OS !== 'android'}
          />
          <Card style={{ marginTop: space(3) }}>
            <Text style={[type.body, { fontWeight: '700' }]}>🏦 Link bank via Account Aggregator</Text>
            <Text style={[type.small, { marginTop: 2 }]}>
              RBI-regulated and consent-based, through a licensed AA. We never see your password. Coming in the next build.
            </Text>
          </Card>
          <ConsentRow title="Load a demo month to explore" sub="Realistic sample spends scaled to your budget. Wipe it any time from Settings." value={demoData} onChange={setDemoData} />

          <Text style={[type.tiny, styles.label]}>NOTIFICATION TONE</Text>
          <View style={styles.row}>
            <Chip label="😏 Roast me (lovingly)" active={tone === 'roast'} onPress={() => setTone('roast')} />
            <Chip label="🌿 Gentle" active={tone === 'gentle'} onPress={() => setTone('gentle')} />
          </View>
          <View style={styles.preview}>
            {(() => {
              const m = nightMessage({ budget: rupees(1450), spent: rupees(2300), streak: 0, topMerchant: 'Zepto' }, tone, lang, 'onboarding');
              return (
                <>
                  <Text style={styles.previewTitle}>{m.title}</Text>
                  <Text style={styles.previewBody}>{m.body}</Text>
                </>
              );
            })()}
          </View>
        </View>
      )}

      {step > 0 && (
        <View style={[styles.row, { marginTop: space(8), flexWrap: 'nowrap' }]}>
          <Button label="Back" kind="secondary" onPress={() => setStep(step - 1)} style={{ flex: 1, marginRight: space(2) }} />
          <Button
            label={step === STEPS - 1 ? 'Start my day →' : 'Next'}
            disabled={!canNext}
            onPress={() => (step === STEPS - 1 ? finish(profile, demoData) : setStep(step + 1))}
            style={{ flex: 2 }}
          />
        </View>
      )}
    </ScrollView>
  );
}

function ConsentRow({ title, sub, value, onChange, disabled }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Pressable onPress={() => !disabled && onChange(!value)} style={[styles.consent, disabled && { opacity: 0.5 }]} accessibilityRole="checkbox" accessibilityState={{ checked: value, disabled }}>
      <View style={{ flex: 1, marginRight: space(3) }}>
        <Text style={[type.body, { fontWeight: '600' }]}>{title}</Text>
        <Text style={[type.small, { marginTop: 2 }]}>{sub}</Text>
      </View>
      <Toggle value={value} onValueChange={onChange} disabled={disabled} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space(5), paddingTop: space(8), paddingBottom: space(12), flexGrow: 1 },
  logo: { fontSize: 22, fontWeight: '900', color: colors.brand, letterSpacing: -0.5 },
  progress: { flexDirection: 'row', marginBottom: space(6) },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line, marginRight: space(1) },
  help: { marginTop: space(2) },
  label: { marginTop: space(6), marginBottom: space(2), fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space(3), fontSize: 16, color: colors.ink, backgroundColor: colors.card, marginTop: space(3) },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: space(4) },
  rupee: { fontSize: 36, fontWeight: '800', color: colors.inkSoft, marginRight: space(1) },
  amount: { flex: 1, minWidth: 0, fontSize: 40, fontWeight: '800', color: colors.ink, paddingVertical: space(1) },
  consent: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, padding: space(4), borderWidth: 1, borderColor: colors.line, marginTop: space(3) },
  preview: { marginTop: space(3), backgroundColor: colors.ink, borderRadius: radius.md, padding: space(3) },
  previewTitle: { color: '#fff', fontWeight: '700' },
  previewBody: { color: '#E7E5E4', marginTop: 2, fontSize: 13 },
});
