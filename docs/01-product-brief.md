# DailyBudget — Product Brief

> **One line:** Your salary, but daily. DailyBudget turns your monthly take-home into a single number, *what you can spend today*, and updates it live as you spend.

## Target user

**"Aarav", 24–32, salaried, metro India (Bengaluru, Gurugram, Pune, Hyderabad, Mumbai).**

- Take-home ₹40,000–₹2,00,000/month, credited on the 1st. The salary feels large on the 1st and has vanished by the 20th.
- Pays almost everything by UPI: 60–150 transactions a month, most under ₹500. Quick commerce (Blinkit, Zepto, Instamart) and food delivery (Swiggy, Zomato) are daily habits.
- Already has fixed commitments: rent, a bike/phone EMI, a SIP their parents told them to start.
- Has tried a spreadsheet or an expense app and quit within 2 weeks because logging felt like homework and the charts only explained what had already gone wrong.
- Lives on Instagram and WhatsApp and responds to memes, not to pie charts.

**Secondary:** first-jobbers (₹25–40k) on budget Android phones and patchy 4G. They need the app most and have the least room for a heavy one.

## Problem

1. **The monthly number lies.** ₹1,00,000/month "feels like" ₹3,333/day. After rent, EMI, SIP and bills it is closer to **₹1,450/day**. Nobody does this maths, so everyone overspends for the first two weeks.
2. **UPI makes money invisible.** ₹180 here and ₹420 there never feel like spending. There is no cash leaving a wallet and no card bill at month end.
3. **Feedback arrives too late.** Bank statements and expense apps say what went wrong *last month*. The decision to order Zepto at 11pm happens *now*.
4. **Tracking is work.** Manual logging dies in a week. Auto-tracking is messy: duplicate SMS, failed UPI debits, refunds, split dinners.

## Value proposition

| For the user | DailyBudget does |
|---|---|
| "How much can I spend today?" | One number on the home screen and a morning notification, after fixed costs and savings. |
| "Did that just blow my day?" | A live balance after every payment: *"Blinkit −₹600. ₹178 left."* |
| "I was good yesterday — does it count?" | Rollover: unspent money moves to tomorrow, and overspending quietly shrinks the coming days. |
| "Where does it actually go?" | Top 3 leaks, priced in **hours of your life**, plus a what-if: *"Cut Zepto by half → ₹30,352/year."* |
| "Budgeting is boring." | Funny, lightly roasting copy in English or Hinglish, a streak, and a shareable weekly reality check. Gentle mode if roasting isn't your thing. |

**Why now:** UPI made spending frictionless. The Account Aggregator network makes consented, password-free bank data access possible. The DPDP Act sets clear rules that a trustworthy app can win on.

**Positioning:** most finance apps look backward (*what you spent*) or sell you something (*loans, cards, mutual funds*). DailyBudget looks forward (*what you can still spend today*) and sells nothing.

## Success metrics (first 90 days)

- **Activation:** ≥60% of installs finish onboarding and see their real daily number.
- **Habit:** D30 retention ≥25%; ≥50% of weekly actives open the app 4+ days a week.
- **Outcome:** median user is "on track" or "slightly over" on ≥60% of days in month 2, versus a month-1 baseline.
- **Virality:** ≥5% of weekly actives share a reality-check card.

## Three key risks

| # | Risk | Why it matters | Mitigation |
|---|---|---|---|
| 1 | **Data access is gated.** Under the AA framework, only entities regulated by a financial-sector regulator (RBI/SEBI/IRDAI/PFRDA) can be Financial Information Users. Google Play restricts `READ_SMS` to approved use cases, and iOS doesn't allow SMS reading at all. | Without automatic data, the product falls back to manual entry, which users abandon. | (a) Launch AA through a regulated partner or an AA provider's FIU-partnership model, and get legal counsel to confirm eligibility. (b) Submit a Play Permissions Declaration for SMS-based money management, and design so the app still works if it's rejected. (c) Make manual entry *fast* (2 taps for chai and auto) and dedupe it against bank data later. On iOS, rely on AA plus manual entry, and later notification parsing on Android only. |
| 2 | **Trust and privacy.** Users are rightly wary of finance apps after years of predatory loan apps. A single breach or dark pattern would end the product. | Nobody links a bank account to an app they don't trust. | Local-first storage, purpose-limited consent under DPDP, no lending or ads, one-tap export and delete, an explicit "we never ask for passwords" message, and a public data-practices page. Raw SMS and raw AA payloads are never stored. |
| 3 | **Novelty decay and shame.** Roast-style notifications are delightful in week 1 and grating in week 4, especially in a bad month. Daily over-budget pings can make users feel worse and uninstall. | Retention dies quietly. | Never shame the person, only the purchase. Every bad-day message points to a way out. Rotate copy from a large, deterministic pool. Auto-suggest gentle mode after 3 consecutive over days. Default to *spread* rollover so one bad day can't wreck a week. Quiet hours. |

*Also watch:* categorization accuracy for small local merchants and P2P payments (mitigated by "correct once, remembered" plus a growing directory), and irregular income such as freelancers (v2: income smoothing).
