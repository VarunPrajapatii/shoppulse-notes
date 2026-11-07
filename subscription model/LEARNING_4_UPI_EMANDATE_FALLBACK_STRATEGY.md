# Learning 4: UPI/eMandate Fallback — The Two-Tier Strategy

**Date:** 2025-07-17  
**Topic:** What happens when subscription plan changes fail due to payment method limitations  
**Difficulty:** Intermediate — payment gateway constraints, UX design for error recovery

---

## The Problem

Razorpay's UPDATE API **only works for card-based subscriptions**. If the user subscribed via UPI or eMandate (bank mandate), the API returns:

```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "The payment method associated with this subscription does not support plan changes"
  }
}
```

~15% of Indian online payments use UPI. This isn't an edge case — it's a significant user segment.

---

## Options Evaluated

### Option 1: "Gentle" — Update Payment Method to Card

Ask the user to switch their payment method from UPI to card, then retry the upgrade.

```
User clicks "Upgrade" → Error: UPI detected
  → Show dialog: "Switch to card for instant upgrade"
  → Open Razorpay customer portal (subscription.short_url)
  → User adds card
  → Retry upgrade
```

**Razorpay provides `subscription.short_url`** — a permanent link to the customer portal where users can update their payment method.

| Pro | Con |
|-----|-----|
| User keeps same subscription ID | User needs a card |
| No lost credit | Extra step for user |
| Subscription continues seamlessly | Some users only have UPI |

**Status: NOT IMPLEMENTED** — Low priority since majority of our users use cards.

### Option 2: "Harsh" — Cancel & Resubscribe (✅ IMPLEMENTED)

Cancel the current subscription entirely, then create a new one on the desired plan.

```
User clicks "Upgrade" → Error: UPI detected
  → Show "Payment Failure Dialog"
  → User clicks "Cancel & Subscribe Fresh"
  → Cancel current subscription immediately
  → Store upgradeIntent in localStorage
  → Redirect to plans page with ?upgrade=PLAN_ID&cancelled=true
  → UpgradeIntentBanner shows: "Complete your upgrade"
  → User selects plan → creates new subscription (can use UPI or card)
```

| Pro | Con |
|-----|-----|
| Works with ANY payment method | User gets new subscription ID |
| Simple implementation | Lost credit for remaining days |
| User can choose different payment method | Requires re-authorization |

---

## Our Implementation: Error Detection Chain

In `upgrade-dialog.tsx`, when the execute API returns an error, we categorize it:

```typescript
// Execute API catches the Razorpay error and returns structured response
if (error.requiresCancelFlow) {
  // UPI/eMandate/card-mandate detected
  setShowPaymentFailureDialog(true);  // Shows "Cancel & Subscribe Fresh" option
} else if (error.description?.includes('insufficient')) {
  toast.error('Insufficient balance');
} else if (error.description?.includes('declined')) {
  toast.error('Card declined');
} else if (error.description?.includes('expired')) {
  toast.error('Payment method expired');
} else if (error.description?.includes('minimum')) {
  toast.error('Upgrade amount too small (min ₹0.50)');
}
```

### Cancel & Resubscribe Flow

```
handleCancelAndResubscribe()
    ↓
1. Cancel subscription immediately: POST /api/subscription/cancel
    ↓
2. Store intent in localStorage:
    {
      targetPlanId: "plan_abc",
      lostCredit: 666.67,         // calculated from remaining days
      cancelledAt: "2025-07-17",
      reason: "payment_method_limitation"
    }
    ↓
3. Redirect: /subscription/plans?upgrade=plan_abc&cancelled=true
    ↓
4. UpgradeIntentBanner reads URL params + localStorage
    ↓
5. Shows: "You cancelled to upgrade. Lost ₹667 credit. Click plan below."
    ↓
6. Auto-scrolls to target plan card after 5 seconds
    ↓
7. User selects plan → normal subscription creation flow
```

---

## Why Error-Based Detection > Pre-Check

We chose to **try the API and handle the error** instead of pre-checking the payment method:

| Approach | Pros | Cons |
|----------|------|------|
| **Pre-check payment method** | Faster UX (warn before confirm) | Need extra API call, payment method not on subscription entity, breaks if Razorpay changes rules |
| **Error-based (our approach)** | Future-proof, zero false positives, simpler code | User sees error after clicking "Confirm" |

The payment method is NOT stored on the Subscription entity — it's on the Payment entity from the authenticated webhook. We'd need to store it separately at subscription creation and keep it in sync. Not worth the complexity for a 15% edge case.

---

## Enhancement Opportunity: The "Gentle" Path

**Priority: MEDIUM** — For future implementation when UPI user base grows.

```typescript
// API endpoint: /api/subscription/payment-method-link
const subscription = await razorpay.subscriptions.fetch(subId);
return { portalUrl: subscription.short_url };

// Frontend: opens in new tab
window.open(portalUrl, '_blank');
// Show: "After updating your payment method, come back and try upgrading again"
```

This would give UPI users a **graceful upgrade path** without losing their subscription or credit.

---

## Interview Talking Points

- "How do you handle payment method limitations in subscription plan changes?"
- "What's the error-based detection pattern and when is it preferable to pre-checking?"
- "How do you implement a cancel-and-resubscribe flow with intent persistence?"
- "Why use localStorage for cross-page state in a subscription flow?"
- "What's the UX trade-off between pre-checking and failing gracefully?"

---

## Files Referenced

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/subscription/components/my-plan/upgrade-dialog.tsx` (621L) | Error detection + payment failure dialog |
| `src/app/(dashboard)/subscription/components/my-plan/upgrade-intent-banner.tsx` (109L) | Post-cancel banner on plans page |
| `src/app/api/subscription/upgrade/execute/route.ts` (524L) | Razorpay error parsing |
| `src/app/api/subscription/cancel/route.ts` (154L) | Immediate cancel for fallback |
