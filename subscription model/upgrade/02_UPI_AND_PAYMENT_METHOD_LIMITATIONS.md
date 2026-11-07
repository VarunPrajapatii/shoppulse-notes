# UPI, eMandate & Payment Method Limitations

Everything about why UPI subscriptions can't be silently upgraded and how we handle it.

---

## The Core Problem: Mandate `max_amount`

When a user subscribes via UPI AutoPay (₹1,000/month), the bank creates a **mandate** with a hardcoded `max_amount` equal to the plan amount (₹1,000). Any charge exceeding this — even a valid upgrade proration — is **rejected by the bank**, regardless of the RBI's ₹15,000 AFA ceiling.

Two separate limits at play:

| Limit | Value | Who Sets It | Relevant? |
|---|---|---|---|
| **RBI AFA ceiling** | ₹15,000 per transaction | Reserve Bank of India | All our plans are under this — not a blocker |
| **Mandate `max_amount`** | Equal to plan amount (e.g., ₹1,000) | Set during mandate creation | **This is the blocker** |

Since all our plans (₹1,000 / ₹6,000 / ₹12,000) are under ₹15,000, the RBI limit is irrelevant. The mandate's own `max_amount` is what prevents upgrades.

---

## Why Can't We Set a Higher `max_amount`?

We use Razorpay's **Subscriptions API** (`POST /v1/subscriptions`), which:
- Does NOT expose a `max_amount` parameter
- Auto-calculates the mandate limit from the `plan_id` amount
- Cannot be told "charge ₹1,000 but authorize up to ₹14,999"

### The Only Way to Set Custom `max_amount`: Token HQ

To achieve "Amount: ₹1,000 / Max Amount: ₹14,999", you must abandon the Subscriptions API and migrate to **Razorpay Token HQ (Recurring Payments via Orders API)**. This means building a custom billing engine:

1. Create an Order (not a Subscription) with `token: { max_amount: 1499900 }`
2. User authorizes → you receive a `token_id`
3. Build a cron job that charges the `token_id` monthly
4. Handle upgrades manually: calculate proration yourself, charge via `token_id`, update cron schedule

**Netflix, Spotify, Amazon Prime** use this approach — they've built massive custom billing engines. For our Subscriptions API architecture, **Cancel & Resubscribe is the correct choice**.

---

## RBI ₹15,000 AFA Threshold (Card Users)

For **card** payment methods (not UPI), card tokens are NOT amount-capped by Razorpay. However, RBI's recurring payment framework imposes:

| Charge Amount | Behavior |
|---|---|
| ≤ ₹15,000 | Auto-debit proceeds silently — no OTP required |
| > ₹15,000 | Bank MUST request OTP/biometric before debit |

Since the UPDATE API charges the card **in the background** (user isn't present), any charge > ₹15,000 will fail because the user can't enter OTP.

**For our plans**: Monthly ₹1,000 → Half-yearly ₹6,000 = ~₹5,300 charge → SAFE. All upgrade paths in our current pricing are under ₹15K. But if we add premium plans > ₹15K/cycle, card upgrades via UPDATE API will also break.

---

## Our Implemented Solution: Cancel & Resubscribe

When the Execute API detects a UPI/emandate error from Razorpay, it returns `requiresCancelFlow: true`. The frontend then shows a **Payment Failure Dialog**.

### Flow

```
User clicks "Upgrade" → Execute API calls razorpay.subscriptions.update()
  → Razorpay returns error (UPI mandate limit exceeded)
  → Backend parses error, returns { requiresCancelFlow: true }
  → Frontend shows Payment Failure Dialog
      ├─ Displays reason (UPI / eMandate / Card Expired / Insufficient Balance)
      ├─ Shows credit loss calculation (prorated remaining value)
      ├─ Shows full new plan cost
      └─ Warns user about consequences
  → User confirms "Continue & Lose Credit"
  → POST /api/subscription/cancel with { immediate: true }
      ├─ Razorpay subscription cancelled
      ├─ DB: status → CANCELED, user unlinked
      └─ History record created
  → Store upgrade intent in localStorage:
      { newPlanId, newPlanName, lostCredit, reason, timestamp }
  → Redirect to /subscription/plans?upgrade=planId&cancelled=true
  → Plans page shows UpgradeIntentBanner (orange banner)
      ├─ "Complete Your Upgrade" + lost credit amount
      └─ Auto-scrolls to target plan
  → User clicks "Get Started" → normal Razorpay Checkout → new subscription
```

### Error Detection Logic
```typescript
if (errorMsg.toLowerCase().includes('upi') || 
    errorMsg.toLowerCase().includes('emandate') ||
    errorMsg.toLowerCase().includes('bank transfer')) {
  setPaymentFailureReason(detectedMethod);
  setShowPaymentFailureDialog(true);
}
```

Also detects: card insufficient balance, card declined, card expired.

### Files Involved

| File | Role | Status |
|---|---|---|
| `upgrade-dialog.tsx` (621L) | Payment Failure Dialog + `handleCancelAndResubscribe()` | ✅ Done |
| `cancel/route.ts` (154L) | Enhanced with `immediate: true` support | ✅ Done |
| `upgrade-intent-banner.tsx` (109L) | Orange completion banner on plans page | ✅ Done |
| `plans/page.tsx` | Detects `?upgrade=planId&cancelled=true` query params | ✅ Done |
| `plan-card.tsx` | Added `id="plan-{planId}"` for auto-scroll targeting | ✅ Done |

### Credit Loss (User Warning)

Example: Current plan ₹999/mo, 20 days remaining → credit = ₹666.67

```
⚠️ Credit Loss Warning
Current plan credit:  ₹666.67
New plan price:       ₹1,999
If you proceed, you lose ₹666.67 and pay full ₹1,999.
```

Razorpay cannot transfer credits between subscription IDs. This is a hard platform limitation.

### Edge Cases Handled
- User cancels upgrade → no action, can retry later
- Network error during cancel → error shown, retry available
- Multiple rapid clicks → button disabled during execution
- localStorage unavailable → graceful fallback (no banner)
- Query params missing → banner doesn't show
- Target plan not found → auto-scroll fails gracefully

---

## The "Gentle" Option (NOT Implemented — Future Enhancement)

Razorpay offers a **Customer Portal** via `subscription.short_url`:

```json
{
  "id": "sub_12345",
  "short_url": "https://rzp.io/i/abc123"
}
```

This takes users to a Razorpay-hosted page where they can update their payment method (switch UPI → Card), view billing history, and download invoices.

### Theoretical "Gentle" Flow
1. User tries to upgrade → API fails (UPI limits)
2. Show: "Update your payment method to a card"
3. Open `subscription.short_url` → user adds card
4. User returns, clicks "Retry Upgrade"
5. Upgrade succeeds with proration preserved

### Why We Didn't Implement It
- **User friction**: Leave app → go to Razorpay → enter card details → ₹1 auth charge → return → retry
- **UPI mandate updates**: Banks often reject mandate amount updates. User may need a different UPI ID or card anyway
- **Conversion drop-off**: Every step away from the app reduces completion rate
- **No webhook on payment method change**: App doesn't know when user is done — requires manual "I've updated it" action

### Comparison

| Aspect | Gentle (Update to Card) | Harsh (Cancel & Resubscribe) |
|---|---|---|
| User Effort | Medium (2 min, leave app) | Low (click) |
| Cost to User | Lower (proration preserved) | Higher (lose remaining credit) |
| Subscription Continuity | Same subscription ID | New subscription ID |
| Payment History | Preserved | Lost |
| Reliability | Medium (bank rejections possible) | High (fresh mandate always works) |
| Implementation | ❌ Not built | ✅ Implemented |

---

## How Industry Giants Handle This

All major players use **Cancel & Re-authenticate** for UPI mandate limit failures — the same approach we implemented.

### Netflix India
- Upgrading Mobile (₹149) → Premium (₹649) on UPI:
- Prompts user to **re-authenticate** payment (new mandate for higher amount)
- Handles proration internally by giving "extra days" on new plan (custom billing engine via Token HQ, not available via Subscriptions API)

### Amazon Prime India
- Monthly (₹299) → Yearly (₹1,499) on UPI:
- Explicitly cancels old mandate, requires new authorization
- Takes user through Amazon Pay checkout for fresh ₹1,499 mandate

### Spotify India
- Often forces **prepaid** (one-time) payments via UPI rather than recurring mandates
- For recurring UPI: requires full re-checkout — does not attempt silent upgrades

### JioHotstar
- Calculates prorated difference, charges it as one-time payment
- For next cycle: cancels old sub, sets up new subscription at full price
- Effectively: cancel old + one-time proration charge + new subscription

### Why Giants Don't Use "Update Payment Method" Links
1. **Conversion drop-off** — every step away from main app reduces completion
2. **Loss of context** — app doesn't know when user finishes updating
3. **Mandate complexity** — updating UPI `max_amount` is technically unreliable across banks
4. Cleaner to just ask for a **fresh mandate**

---

## Known Limitations

1. **No proration on Cancel & Resubscribe**: User loses remaining credit (Razorpay limitation — cannot transfer credits between subscription IDs)
2. **New subscription ID**: Payment history not continuous across old and new subscriptions
3. **Same Razorpay customer ID**: Reused (good for payment method retention)
4. **No auto payment method migration**: User must re-enter payment details for new subscription

---

## Decision Summary

| Payment Method | Upgrade Works? | Why/Why Not |
|---|---|---|
| **Credit/Debit Card** | ✅ Yes (if charge ≤ ₹15K) | Card tokens not amount-limited. UPDATE API charges silently |
| **UPI AutoPay** | ❌ No | Mandate `max_amount` = plan amount. Cannot exceed |
| **eMandate** | ❌ No | Same as UPI — amount-specific mandate |
| **Bank Transfer** | ❌ No | Not supported for recurring charges |

For non-card methods, **Cancel & Resubscribe** is the only reliable path.
