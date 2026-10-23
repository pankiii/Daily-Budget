# Feature List — MVP vs v2

Legend: ✅ built in this repo · 🧩 interface/stub built, needs backend or native work · ⬜ not started

## MVP (ship in ~8–10 weeks)

The MVP has to prove one thing: **people check a daily number and spend less because of it.**

| Area | Feature | Status |
|---|---|---|
| **Onboarding** | Name, take-home income, fixed costs (rent, EMI, SIP, bills, other), savings goal (10/15/20% presets) | ✅ |
| | "Uncomfortable bit" reveal: raw ₹/day vs real ₹/day, and how much smaller it is | ✅ |
| | Purpose-specific consent (DPDP), 18+ declaration, language, tone | ✅ |
| | Skip to a demo profile (for curious installs and app-store reviewers) | ✅ |
| **Budget engine** | Daily budget = (income − fixed − savings) ÷ days in month | ✅ |
| | Rollover: *spread* (default) or *next-day* mode | ✅ |
| | Monthly pace: on track / slightly over (≤110%) / danger, with month-end projection | ✅ |
| | Under-budget streak, plus the best streak this month | ✅ |
| **Data in** | Manual entry with quick chips, auto-category and split share | ✅ |
| | Bank SMS parser (on-device, bank sender IDs only, OTP/promo filter) | ✅ parser · 🧩 Android SMS listener |
| | Account Aggregator: consent, fetch and map FI data | ✅ mapper · 🧩 client · ⬜ backend |
| **Reconciliation** | Cross-source dedupe (AA > SMS > manual); user edits survive merges | ✅ |
| | Failed debits ignored, auto-reversals cancel the original, refunds credited on the day they land, splits pro-rated | ✅ |
| | Fixed-cost detection (ACH/NACH/SIP/EMI) plus "this is a fixed cost" memory | ✅ |
| **Categorization** | 8 categories, ~40-merchant directory, legal-entity and VPA patterns, keyword fallback | ✅ |
| | Correct once → remembered for that merchant, past and future | ✅ |
| **Home** | Budget ring (drains as you spend, turns red when over), rollover chip, status line, pace bar, today's list | ✅ |
| **Transactions** | Day-grouped list with per-day budget vs spent; "Handled for you" filter that explains every non-counted row | ✅ |
| **Insights** | Week/month category breakdown, hours of work, top 3 leaks, what-if (cut by half → ₹/year), top merchants | ✅ |
| | Weekly reality check card: worst impulse day, streak, days under; share as text | ✅ |
| **Notifications** | Copy engine: morning, per-transaction, night (roast/gentle × English/Hinglish) | ✅ |
| | In-app previews with live numbers; live-balance toast on manual add | ✅ |
| | Scheduled local push (morning/night) and push on SMS/AA ingest | ⬜ (`expo-notifications`) |
| **Privacy** | Export all data, delete all data, consent timestamp | ✅ |
| | Encrypted at rest (SQLCipher + Keystore/Keychain key) | ⬜ (AsyncStorage in MVP) |
| **Platform** | Android-first; web build for prototype review; phone-width layout | ✅ |

## v2 (after MVP proves retention)

| Theme | Feature |
|---|---|
| **Smarter budget** | Weekday/weekend weighting (weekends get more); payday-aware months (salary on the 7th); irregular or freelance income smoothing; mid-month income/bonus handling; annual-expense sinking funds (insurance, Diwali, trips) |
| **Better data** | Android notification-listener parsing (GPay/PhonePe/Paytm) as an SMS alternative; credit card statements via AA; multi-account and family accounts; cash wallet with ATM withdrawal → "cash spend" bucket |
| **Smarter categories** | On-device ML model (merchant n-gram + amount + time-of-day) behind the rule engine; crowd-sourced merchant directory (opt-in, anonymised merchant→category pairs only); custom categories; sub-categories (Groceries vs Snacks inside quick commerce) |
| **Splits** | Auto-detect friends paying you back over UPI; Splitwise import |
| **Engagement** | Shareable image cards (view-shot), monthly "Wrapped", challenges ("No-Zepto week"), home-screen widget showing today's number, Wear OS glance |
| **Coaching** | "You usually overspend on Fridays", subscription audit (unused for 30 days), price-per-use of subscriptions |
| **Languages** | Hindi (Devanagari), Tamil, Telugu, Kannada, Marathi, Bengali |
| **Sync** | Optional end-to-end encrypted cloud backup and multi-device; web dashboard |
| **Trust** | Public transparency report; third-party security audit; DPDP consent-manager integration |

## Explicitly out of scope (and why)

- **Loans, credit cards, BNPL offers.** Conflicts with the trust promise. We won't monetise users' worst months.
- **Investment advice.** Needs SEBI registration and isn't the job-to-be-done.
- **Bank passwords or screen-scraping.** Never.
