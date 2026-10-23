# DailyBudget

**Your salary, but daily.** A personal-finance app for young salaried Indians. It turns monthly take-home into a daily budget and tracks spending against it in real time.

Local-first React Native (Expo SDK 58, TypeScript) MVP. The app runs entirely on-device with a realistic demo month. Account Aggregator and SMS ingestion sit behind tested interfaces, waiting for the backend and native module.

## Docs (the written deliverables)

1. [Product brief](docs/01-product-brief.md): target user, problem, value proposition, 3 key risks
2. [Features: MVP vs v2](docs/02-features.md), with build status
3. [Screen-by-screen UX flow](docs/03-ux-flow.md)
4. [Data model & architecture](docs/04-architecture.md): AA integration, reconciliation, categorization, DPDP
5. [Notification copy](docs/05-notifications.md): voice rules and 10 sample messages

## Run it

Requires **Node ≥ 22.13** (an Expo SDK 58 requirement).

```bash
npm install
```

```bash
npm run web
```

Opens at http://localhost:8081. On a phone, run `npm start` and scan the QR code with Expo Go (Android or iOS).

No newer Node installed? This runs Expo on Node 22 without changing your system Node:

```bash
npx -y node@22 node_modules/expo/bin/cli start --web
```

## Test

```bash
npm test
```

```bash
npm run typecheck
```

40 unit tests cover Indian number formatting, the budget engine (rollover in both modes, pace, streaks), reconciliation (cross-source duplicates, failed payments, reversals, refunds on split bills, fixed costs), categorization, the bank SMS parser and the AA FI mapper.

## Try this in the app

- **Skip → demo profile** on the welcome screen, or go through onboarding to see the raw vs real reveal.
- **＋ Add expense → Blinkit, ₹600** to see the live-balance toast and the ring change colour.
- **Spends → "Handled for you"** to see every duplicate, failed payment, reversal, refund, split and fixed cost explained.
- Tap any transaction and **change its category**. Every payment to that merchant updates, past and future.
- **Insights** for the top 3 leaks in hours of your life, the what-if savings, and the weekly reality check card.
- **Settings → Roast/Gentle and English/Hinglish**: the notification previews update with your real numbers.

## Not built yet

- Scheduled push notifications (`expo-notifications`). The copy engine and in-app previews are done.
- Android SMS listener (needs a dev build). The parser is done and tested.
- AA backend (FIU service). The client interface and FI → transaction mapper are done.
- Encrypted storage. The MVP uses AsyncStorage; production needs SQLCipher with a Keystore/Keychain key.
