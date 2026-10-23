# Notification Copy

## Voice rules

1. **Roast the purchase, never the person.** "The cart was full; so is the regret" ✅. "You're bad with money" ❌. No jokes about bodies, family, caste, gender, salary size or being "broke".
2. **Numbers first.** The ₹ figure must be visible in the lock-screen preview (title or first line).
3. **Always a way out.** Every bad-day message ends forward-looking: tomorrow adjusts, the streak restarts, the redemption arc starts at 8am.
4. **Celebrate loudly, scold softly.** Good-day copy can be over the top. Bad-day copy is one joke at most, then the facts.
5. **Gentle mode keeps the facts and drops the jokes.** It is auto-suggested after 3 over-budget days in a row.
6. **Hinglish is written how people text:** Latin script, natural code-switching, no forced Hindi.
7. **Privacy:** an optional "hide amounts on lock screen" setting replaces ₹ figures with "Tap to see today's balance".

These templates live in [`src/domain/copy.ts`](../src/domain/copy.ts) and fill in real numbers.

## 10 sample notifications

Example user: daily budget ₹3,333, as in the brief.

### Good days

| # | Moment | Title | Body |
|---|---|---|---|
| 1 | Morning, after an underspend | **Good morning, Aarav! ☀️** | Your budget today is ₹3,583 (+₹250 rolled over). Spend it like you mean it. |
| 2 | After a payment, plenty left | **Blinkit −₹600** | ₹2,733 left today. |
| 3 | Night, well under | **Saved ₹1,140 today 🏆** | Budget ₹3,333, spent ₹2,193. It rolls into tomorrow. Look at you, being an adult. |
| 4 | Night, streak | **Under budget. Again. 😎** | Spent ₹2,870 of ₹3,333. 5-day streak. Your future self says thanks. |
| 5 | Night, near-zero day (Hinglish) | **Aaj ₹3,013 bachaye 🏆** | Budget ₹3,333, kharcha ₹320. Kal ke budget mein add ho gaya. Kya baat hai! |

### Bad days

| # | Moment | Title | Body |
|---|---|---|---|
| 6 | After a payment, running low | **Swiggy −₹540** | Only ₹260 left today. Maybe the next craving can wait till tomorrow. |
| 7 | After a payment, tipped over | **Zepto −₹480 🚨** | You're ₹220 over today. Tomorrow-you just got a smaller allowance. |
| 8 | Night, over (the brief's example) | **₹867 over today 😭** | Budget ₹3,333. Spent ₹4,200. You're literally working to fund your own bad decisions. Fresh start tomorrow. |
| 9 | Night, impulse-sale day | **Plot twist: overspent 🎬** | ₹6,100 vs ₹3,333. Myntra was the villain. Tomorrow's budget is a bit smaller. Redemption arc starts at 8am. |
| 10 | Night, over (Hinglish) | **Aaj ₹1,250 over 😭** | Budget ₹3,333, kharcha ₹4,583. Office jaake apne hi shauk ki EMI bhar rahe ho. Kal naya din hai. |

### The same bad day in gentle mode

| Moment | Title | Body |
|---|---|---|
| Night, over | **Today's summary** | Budget ₹3,333, spent ₹4,200. ₹867 over. Tomorrow adjusts automatically. |
| After a payment, over | **Zepto −₹480** | You're ₹220 over today's budget. Tomorrow adjusts automatically. |
| Night, over (Hinglish) | **Aaj ka summary** | Budget ₹3,333, kharcha ₹4,200. ₹867 zyada; kal adjust ho jayega. |

## Bonus: weekly reality check (Sunday 7pm)

> **Your week, unfiltered 📉**
> Under budget 4/7 days · 🔥 2-day streak. Worst impulse day: Sat, ₹4,610 vs ₹1,648 (main character: Myntra). Tap for the full card.

## Delivery rules (spec; push scheduling is not built yet, see 02-features)

| Rule | Value |
|---|---|
| Morning | User time (default 08:30); skipped if the app was opened in the last 30 minutes |
| Per-transaction | Max 1 per 2 minutes; bursts are batched ("3 payments, −₹1,140. ₹210 left.") |
| Night | User time (default 21:30); always sent, even in quiet hours |
| Quiet hours | 23:00–07:00 (per-transaction alerts are held and folded into the morning message) |
| Fatigue guard | After 3 consecutive over days, offer gentle mode once; never more than 1 "over" alert per day |
| Rotation | Deterministic pick per (date, slot) from each pool, so the same message isn't repeated twice in a row |
