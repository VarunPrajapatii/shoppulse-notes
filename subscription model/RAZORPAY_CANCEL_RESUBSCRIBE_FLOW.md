# ShopPulse Cancel + Resubscribe Flow — Complete Architecture

## Table of Contents

1. [How We Got Here — The Discussion Journey](#how-we-got-here)
2. [The Problem Statement](#the-problem-statement)
3. [Complete Flow Diagram](#complete-flow-diagram)
4. [Component-by-Component Breakdown](#component-by-component-breakdown)
5. [API-by-API Breakdown](#api-by-api-breakdown)
6. [State Management Across Navigation](#state-management-across-navigation)
7. [All Entry Points](#all-entry-points)
8. [Error Handling Chain](#error-handling-chain)
9. [Enhancements Applied](#enhancements-applied)

---

## How We Got Here — The Discussion Journey

### The Trigger: Testing Flow 6 (Card Mandate Upgrade)

During subscription flow testing, we tested upgrading from Starter Monthly (₹799) to Growth Monthly (₹1,499):

1. Subscribed with a **test card** (via Razorpay test mode)
2. Ran webhook simulation to activate the subscription
3. Clicked **"Upgrade"** on the Growth plan
4. Upgrade dialog showed proration: credit ₹770.46, charge ₹728.54
5. Clicked **"Confirm Upgrade"**
6. **Error:** `"Can't update subscription immediately when card mandate is applicable"`

### The Frustration

> "I pay with Razorpay's test card, and it can't even do an upgrade? How do Netflix and Spotify handle this?"

### The Investigation

We researched how major platforms handle this:

| Platform | Approach | Why it works |
|----------|----------|-------------|
| **Netflix** | Prorated instant charge | Own billing engine, card-on-file (not mandates) |
| **Spotify** | Free days (no mid-cycle charge) | No charge = no mandate restriction |
| **Shopify** | Credit on next invoice | Deferred = charge at scheduled date = mandate OK |
| **Amazon India** | Cancel + resubscribe | Accepts the limitation |
| **Disney+ India** | Cancel + resubscribe | Accepts the limitation |

### The Realization

In the Indian market with Razorpay Subscriptions API:
- `schedule_change_at: "now"` only works for netbanking/wallet/international cards
- **Domestic Indian cards**, **UPI AutoPay**, and **eMandate** all block it
- This is an **RBI regulation**, not a Razorpay bug
- Every Indian platform uses cancel + resubscribe for immediate upgrades

### The Discovery

> "Wait — we already HAVE a cancel + resubscribe flow in the codebase!"

The upgrade-dialog.tsx already had:
- Error detection for card mandate/UPI payment methods
- A `showPaymentFailureDialog` with credit loss warnings
- `handleCancelAndResubscribe()` with localStorage intent + redirect
- `UpgradeIntentBanner` component to guide the user after redirect

---

## The Problem Statement

```
GIVEN: User is on Plan A (₹799/mo, domestic card/UPI mandate)
WANTS: Switch to Plan B (₹1,499/mo) immediately
CONSTRAINT: Razorpay can't modify mandate mid-cycle (RBI regulation)

SOLUTION: Cancel Plan A → Create Plan B → User pays full price
TRADE-OFF: User loses prorated credit from Plan A (₹X unused days)
```

---

## Complete Flow Diagram

```
                        User on Active Plan
                              │
                    Clicks "Upgrade" on Plan B
                              │
                    ┌─────────▼──────────┐
                    │  plan-card.tsx      │
                    │  handleSubscribe()  │
                    │  → canUpgrade=true  │
                    └─────────┬──────────┘
                              │
                    GET /api/subscription/upgrade/preview
                              │
                    ┌─────────▼──────────────┐
                    │  preview/route.ts       │
                    │  Calculate proration:   │
                    │  credit, expectedCharge │
                    │  limitsChange           │
                    └─────────┬──────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  UpgradeDialog      │
                    │  Shows:             │
                    │  - Plan comparison  │
                    │  - Limit changes    │
                    │  - Payment breakdown│
                    │  - "Confirm Upgrade"│
                    └─────────┬──────────┘
                              │
                    User clicks "Confirm Upgrade"
                              │
                    POST /api/subscription/upgrade/execute
                              │
                    ┌─────────▼──────────────────────┐
                    │  execute/route.ts                │
                    │  razorpay.subscriptions.update({ │
                    │    plan_id: newPlanId,           │
                    │    schedule_change_at: "now"     │
                    │  })                              │
                    └──────┬────────────┬──────────────┘
                           │            │
                    ┌──────▼────┐  ┌────▼──────────────────┐
                    │ SUCCESS   │  │ ERROR                  │
                    │ (netbank/ │  │ "card mandate"         │
                    │ wallet/   │  │ "UPI subscription"     │
                    │ intl card)│  │ "eMandate"             │
                    └──────┬────┘  └────┬──────────────────┘
                           │            │
                    Poll status    ┌────▼──────────────────┐
                    8 attempts     │ Error Handler          │
                    @ 2.5s each   │ Detects payment method │
                           │      │ limitation patterns    │
                    ┌──────▼────┐  │ Sets flags:           │
                    │ CONFIRMED │  │ showPaymentFailure=T  │
                    │ Redirect  │  │ paymentFailureReason  │
                    │ to my-plan│  └────┬──────────────────┘
                    └───────────┘       │
                                  ┌────▼───────────────────┐
                                  │ Payment Failure Dialog  │
                                  │                         │
                                  │ ┌─────────────────────┐ │
                                  │ │ Credit Loss Warning │ │
                                  │ │ Your credit: ₹770   │ │
                                  │ │ New price: ₹1,499   │ │
                                  │ │ ⚠️ Credit forfeited │ │
                                  │ └─────────────────────┘ │
                                  │                         │
                                  │ ┌─────────────────────┐ │
                                  │ │ Cancel & Subscribe   │ │
                                  │ │ Fresh                │ │
                                  │ │ • Cancel immediately │ │
                                  │ │ • Lose ₹770 credit  │ │
                                  │ │ • Pay full ₹1,499   │ │
                                  │ │ • New cycle starts   │ │
                                  │ │                     │ │
                                  │ │ [Continue & Lose ₹X]│ │
                                  │ └─────────────────────┘ │
                                  │                         │
                                  │ [Cancel Upgrade]        │
                                  └────┬──────────────────┘
                                       │
                          User clicks "Continue & Lose ₹X"
                                       │
                          ┌────────────▼────────────────┐
                          │ handleCancelAndResubscribe() │
                          │                              │
                          │ 1. POST /api/subscription/   │
                          │    cancel { immediate: true } │
                          │                              │
                          │ 2. localStorage.set(         │
                          │    'upgradeIntent', {        │
                          │      newPlanId,              │
                          │      newPlanName,            │
                          │      lostCredit,             │
                          │      timestamp,              │
                          │      reason                  │
                          │    })                        │
                          │                              │
                          │ 3. router.push(              │
                          │    '/subscription/plans      │
                          │    ?upgrade=<id>             │
                          │    &cancelled=true           │
                          │    &reason=payment-failure') │
                          └────────────┬───────────────┘
                                       │
                          ┌────────────▼───────────────┐
                          │  /subscription/plans page   │
                          │                             │
                          │  ┌───────────────────────┐  │
                          │  │ UpgradeIntentBanner    │  │
                          │  │ "Complete Your Upgrade"│  │
                          │  │ Lost ₹770 credit      │  │
                          │  │ → Subscribe to Growth  │  │
                          │  └───────────────────────┘  │
                          │                             │
                          │  Auto-scroll to Growth plan │
                          │  after 5 seconds            │
                          │                             │
                          │  ┌──────────────────────┐   │
                          │  │ Growth Plan Card      │   │
                          │  │ [Get Started]         │   │
                          │  └──────────┬───────────┘   │
                          └─────────────┼───────────────┘
                                        │
                          User clicks "Get Started"
                                        │
                          ┌─────────────▼───────────┐
                          │ Razorpay Checkout        │
                          │ New subscription created │
                          │ User authorizes payment  │
                          │ (card/UPI/netbanking)    │
                          └─────────────┬───────────┘
                                        │
                          POST /api/subscription/create
                          POST /api/subscription/verify
                                        │
                          ┌─────────────▼───────────┐
                          │ New subscription ACTIVE  │
                          │ Redirect to my-plan      │
                          └─────────────────────────┘
```

---

## Component-by-Component Breakdown

### 1. `plan-card.tsx` — Entry Point

**Role:** Determines which action to take when user clicks a plan button

**Relevant logic:**
```typescript
// In handleSubscribe():
if (canUpgrade) {
  // Fetch preview → open UpgradeDialog
}

// Status-based guards (before canUpgrade check):
if (subscriptionStatus === 'PAST_DUE') {
  setShowPastDueDialog(true); // → separate cancel flow
  return;
}
if (subscriptionStatus === 'CANCELED' || subscriptionStatus === 'COMPLETING') {
  if (daysRemainingInPeriod > 5) {
    setShowCanceledWarning(true); // → warn about losing days
    return;
  }
}
```

### 2. `upgrade-dialog.tsx` — Main Upgrade + Failure Handling

**Role:** Shows upgrade preview, attempts instant upgrade, handles payment failure

**Key functions:**
- `handleConfirmUpgrade()` — calls execute API, polls for status, detects errors
- `handleCancelAndResubscribe()` — cancels immediately, stores intent, redirects

**Key state:**
- `showPaymentFailureDialog` — toggles the Payment Failure Dialog
- `paymentFailureReason` — "UPI", "card mandate", "eMandate", etc.
- `isExecuting` — loading state during upgrade/cancel

### 3. `upgrade-intent-banner.tsx` — Post-Cancel Guidance

**Role:** Shows a banner on the plans page after cancel, guiding user to subscribe

**Reads:**
- URL params: `upgrade=<planId>`, `cancelled=true`
- localStorage: `upgradeIntent` with `newPlanId`, `newPlanName`, `lostCredit`, `reason`

**Behavior:**
- Shows banner with plan name, lost credit amount, reason
- Auto-scrolls to the target plan card after 5 seconds
- Cleans up localStorage on component unmount

### 4. `plans/page.tsx` — Plans Grid Page

**Role:** Server component that renders the plan selection grid

**Relevant to cancel+resubscribe:**
- Renders `UpgradeIntentBanner` component
- After cancel, `isSubscriptionValid` becomes `true` (status is CANCELED)
- `isSubscriptionActive` becomes `false` → buttons show "Get Started" not "Upgrade"

---

## API-by-API Breakdown

### `POST /api/subscription/upgrade/execute`

Attempts the instant upgrade via Razorpay.

**On card mandate error, returns:**
```json
{
  "error": "Can't update subscription immediately when card mandate is applicable",
  "requiresCancelFlow": true,
  "errorType": "PAYMENT_METHOD_LIMITATION",
  "suggestion": "Cancel current subscription and create a new one"
}
```

### `POST /api/subscription/cancel`

Cancels the subscription on Razorpay and in the database.

**Request body:**
```json
{
  "immediate": true,       // false = cancel at period end
  "reason": "string"       // logged in subscription history
}
```

**What it does:**
1. Calls `razorpayInstance.subscriptions.cancel(razorpayId)`
2. If `immediate: true`: sets `status: 'CANCELED'`, `cancelAtPeriodEnd: false`
3. If `immediate: false`: sets `status: 'CANCELED'`, `cancelAtPeriodEnd: true`
4. Creates `SubscriptionHistory` record with action `CANCELED`

### `POST /api/subscription/create`

Creates a new Razorpay subscription (used after cancel for resubscribe).

### `POST /api/subscription/verify`

Verifies the payment signature after Razorpay checkout completes.

---

## State Management Across Navigation

The cancel+resubscribe flow requires navigating from `/subscription/my-plan` to `/subscription/plans`. State is preserved using:

### localStorage: `upgradeIntent`

```typescript
{
  newPlanId: "plan_abc123",        // Which plan to subscribe to
  newPlanName: "Growth Monthly",    // Display name for banner
  lostCredit: 770.46,              // Credit forfeited (for user awareness)
  timestamp: 1705000000000,        // When the cancel happened
  reason: "UPI subscription"       // Payment method that caused failure
}
```

**Set by:** `upgrade-dialog.tsx → handleCancelAndResubscribe()`  
**Read by:** `upgrade-intent-banner.tsx`  
**Cleared by:** `upgrade-intent-banner.tsx → useEffect cleanup (unmount)`

### URL Query Parameters

```
/subscription/plans?upgrade=plan_abc123&cancelled=true&reason=payment-failure
```

**Set by:** `router.push()` in `handleCancelAndResubscribe()`  
**Read by:** `upgrade-intent-banner.tsx → useSearchParams()`

### Why Both?

- **URL params** trigger the banner to render (fast check, no async)
- **localStorage** provides the detailed data (plan name, credit amount, reason)
- If localStorage is cleared but URL params exist → banner doesn't render (safe fallback)
- If URL params are missing but localStorage exists → banner doesn't render (requires both)

---

## All Entry Points

### Entry Point 1: Upgrade Dialog → Card Mandate Error
- **From:** `upgrade-dialog.tsx` → `handleConfirmUpgrade()` → error → Payment Failure Dialog → `handleCancelAndResubscribe()`
- **Uses:** `immediate: true`, localStorage intent, redirect with params, UpgradeIntentBanner
- **Credit loss:** Displayed (prorationDetails.credit)
- **Quality:** ★★★★★ — Full user guidance

### Entry Point 2: Plan Card → PAST_DUE Status
- **From:** `plan-card.tsx` → `handleSubscribe()` → PAST_DUE dialog → `handleCancelAndResubscribe()`
- **Uses:** `immediate: true`, localStorage intent, redirect with params, UpgradeIntentBanner
- **Credit loss:** ₹0 (period already ended)
- **Quality:** ★★★★★ — Full user guidance (after enhancements)

### Entry Point 3: Plan Card → CANCELED/COMPLETING Status
- **From:** `plan-card.tsx` → `handleSubscribe()` → CANCELED warning → `proceedToNewSubscription()`
- **Uses:** Direct Razorpay checkout (no cancel needed — already canceled)
- **Credit loss:** None (already canceled, days are forfeited by previous cancel action)
- **Quality:** ★★★★ — Direct checkout, no redirect needed

---

## Error Handling Chain

### Payment Method Detection Patterns

```typescript
// In upgrade-dialog.tsx error handler:
const errorLower = errorMsg.toLowerCase();

// Card Mandate (Indian domestic debit/credit cards)
if (errorLower.includes('card mandate') || errorLower.includes('emandate')) {
  paymentFailureReason = 'Card mandate';
}

// UPI AutoPay
if (errorLower.includes('upi')) {
  paymentFailureReason = 'UPI subscription';
}

// Bank transfer / NACH
if (errorLower.includes('bank transfer') || errorLower.includes('nach')) {
  paymentFailureReason = 'Bank transfer';
}

// Card-specific failures (different from mandate issues)
if (errorLower.includes('declined') || errorLower.includes('insufficient')) {
  // Card declined — different dialog (retry, not cancel+resubscribe)
}
```

### Fallback Chain

```
Attempt 1: razorpay.subscriptions.update({ schedule_change_at: "now" })
    ↓ if fails with payment method error
Attempt 2: Show Payment Failure Dialog with cancel+resubscribe option
    ↓ if user proceeds
Attempt 3: Cancel + redirect to plans page for new subscription
    ↓ if cancel fails
Show error toast, user can try again
```

---

## Enhancements Applied

### Fix 1: PAST_DUE cancel now uses `immediate: true`

**Before:**
```typescript
await axios.post('/api/subscription/cancel');
// ❌ Default immediate=false → cancelAtPeriodEnd=true
// Makes no sense for PAST_DUE (period already ended)
```

**After:**
```typescript
await axios.post('/api/subscription/cancel', {
  immediate: true,
  reason: 'Past-due cancel for resubscribe',
});
// ✅ Immediate cancel — correct for PAST_DUE
```

### Fix 2: PAST_DUE flow now stores upgradeIntent

**Before:** No intent stored → user dumped on refreshed page with no guidance

**After:**
```typescript
localStorage.setItem('upgradeIntent', JSON.stringify({
  newPlanId: plan.id,
  newPlanName: plan.displayName,
  lostCredit: 0,  // PAST_DUE = no credit to lose
  timestamp: Date.now(),
  reason: 'Payment failure (past due)',
}));
```

### Fix 3: PAST_DUE flow now redirects with params

**Before:** `router.refresh()` → page refreshes in place, no banner

**After:**
```typescript
router.push(`/subscription/plans?upgrade=${plan.id}&cancelled=true&reason=payment-failure`);
// → UpgradeIntentBanner activates, auto-scrolls to target plan
```

---

## Testing the Cancel + Resubscribe Flow

### Test Card Mandate Flow

1. Subscribe with a test card (Razorpay test mode)
2. Run webhook simulation: `npx tsx scripts/simulate-webhook.ts authenticated`
3. Go to Plans page, click Upgrade on a higher tier
4. Confirm upgrade → should get card mandate error
5. Payment Failure Dialog appears with credit loss warning
6. Click "Continue & Lose ₹X"
7. Should redirect to plans page with UpgradeIntentBanner
8. Banner should show plan name, lost credit, reason
9. Click "Get Started" on the target plan
10. Razorpay checkout should open for new subscription

### Test PAST_DUE Flow

1. Start with active subscription
2. Simulate payment failure: `npx tsx scripts/simulate-webhook.ts cron-payment-failure`
3. Go to Plans page → all buttons should show "Get Started"
4. Click any plan → PAST_DUE dialog appears
5. Click "Cancel & Resubscribe"
6. Should redirect to plans page with UpgradeIntentBanner
7. Banner should show plan name, ₹0 credit loss
8. Click "Get Started" on the plan

---

*This document is a companion to [Part 1](SUBSCRIPTION_UPGRADE_PATTERNS_PART1.md) (how industry giants handle upgrades) and [Part 2](SUBSCRIPTION_UPGRADE_PATTERNS_PART2.md) (technical deep dive into the 4 approaches).*
