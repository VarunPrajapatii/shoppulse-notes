# Razorpay Webhook Handlers Verification Guide

## Overview

This document details all Razorpay subscription webhook handlers, their triggers, database changes, and the complete subscription lifecycle flow.

**Location:** `src/app/api/webhook/razorpay/subscription/`

---

## Webhook Handler Summary

| Event | Handler File | Triggered When |
|-------|--------------|----------------|
| subscription.authenticated | `handlers/authenticated.ts` | First payment successful |
| subscription.charged | `handlers/charged.ts` | Recurring payment successful |
| subscription.pending | `handlers/pending.ts` | Payment awaiting confirmation |
| subscription.halted | `handlers/halted.ts` | Payment failed after all retries |
| subscription.cancelled | `handlers/cancelled.ts` | User cancelled subscription |
| subscription.completed | `handlers/completed.ts` | All charges complete (fixed-term) |
| subscription.paused | `handlers/paused.ts` | Subscription paused by admin |
| subscription.resumed | `handlers/resumed.ts` | Paused subscription resumed |
| subscription.updated | `handlers/updated.ts` | Plan upgrade/downgrade applied |

---

## 1. subscription.authenticated

**Purpose:** First payment of subscription was successful

### Trigger
- User completes checkout for new subscription
- First charge is authorized and captured

### Database Changes

| Table | Field | Change |
|-------|-------|--------|
| Subscription | status | → `ACTIVE` |
| Subscription | paidCount | from Razorpay |
| Subscription | remainingCount | from Razorpay |
| Subscription | nextChargeAt | from Razorpay |
| Subscription | currentPeriodStart | from Razorpay |
| Subscription | currentPeriodEnd | from Razorpay |
| Subscription | autoRenew | `true` |
| User | isActive | `true` |
| User | trialUsed | `true` |
| User | paymentGracePeriod | `false` |
| Store | isAccessible | `true` |
| SubscriptionHistory | action | `CREATED` or `UPGRADED` (if from trial) |
| Payment | (create) | Payment record with status `SUCCESS` |

### Special Handling: Trial Upgrade
```typescript
const isUpgradingFromTrial = subscription.plan.name === 'TRIAL' && user?.trialUsed === false;
// If true: action = 'UPGRADED', reason mentions trial upgrade
```

---

## 2. subscription.charged

**Purpose:** Recurring payment was successfully charged

### Trigger
- Monthly/yearly billing cycle charges
- Charge occurs after `nextChargeAt`

### Database Changes

| Table | Field | Change |
|-------|-------|--------|
| Subscription | status | → `ACTIVE` |
| Subscription | paidCount | Updated from Razorpay |
| Subscription | remainingCount | Updated from Razorpay |
| Subscription | nextChargeAt | Next charge date |
| Subscription | currentPeriodStart | New period start |
| Subscription | currentPeriodEnd | New period end |
| User | isActive | `true` |
| User | paymentGracePeriod | `false` |
| Store | isAccessible | `true` |
| SubscriptionHistory | action | `RENEWED` |
| Payment | (create) | Payment record with status `SUCCESS` |

### Usage Period Reset
```typescript
// Only if period actually changed (prevent duplicate webhook issues)
if (periodChanged) {
  await archiveAndResetPeriod(
    subscription.userId,
    oldPeriodStart,
    oldPeriodEnd,
    newPeriodStart,
    newPeriodEnd
  );
}
```

This archives:
- UsageHistory (for the old period)
- Resets UsageRecord counters to 0

---

## 3. subscription.pending

**Purpose:** Payment is pending (awaiting bank confirmation)

### Trigger
- Bank authorization pending
- UPI/Net banking in progress

### Database Changes

| Table | Field | Change |
|-------|-------|--------|
| Subscription | status | Keep `ACTIVE` |
| SubscriptionHistory | action | `RENEWED` |
| SubscriptionHistory | reason | `"Payment pending - Awaiting confirmation"` |

**Note:** Access is NOT blocked during pending state.

---

## 4. subscription.halted

**Purpose:** Payment failed after all Razorpay retry attempts (5-7 days)

### Trigger
- All payment retries exhausted
- No successful payment after multiple attempts

### Database Changes

| Table | Field | Change |
|-------|-------|--------|
| Subscription | status | → `EXPIRED` |
| Subscription | autoRenew | `false` |
| User | isActive | `false` |
| User | paymentGracePeriod | `false` |
| Store | isAccessible | `false` |
| SubscriptionHistory | action | `EXPIRED` |
| SubscriptionHistory | reason | `"Payment failed after all Razorpay retry attempts (5-7 days) - Subscription halted"` |

**Important:** User is immediately blocked from dashboard access.

---

## 5. subscription.cancelled

**Purpose:** User cancelled their subscription

### Trigger
- User clicks "Cancel Subscription" in dashboard
- Admin cancels via Razorpay dashboard

### Database Changes

| Table | Field | Change |
|-------|-------|--------|
| Subscription | status | → `CANCELED` |
| Subscription | canceledAt | Current timestamp |
| Subscription | cancelAtPeriodEnd | `true` |
| Subscription | autoRenew | `false` |
| User | isActive | `true` (still active until period end) |
| User | paymentGracePeriod | `false` |
| SubscriptionHistory | action | `CANCELED` |

### Important Notes
- Store access is NOT blocked immediately
- Services continue until `currentPeriodEnd`
- Cron job `expire-period-ended-subscriptions` will expire at period end

### Duplicate Handling
```typescript
// Check if cancellation history already exists (from /api/subscription/cancel)
const existingCancellation = await tx.subscriptionHistory.findFirst({
  where: {
    subscriptionId: subscription.id,
    action: 'CANCELED',
    metadata: { path: ['source'], equals: 'user_action' }
  }
});

if (existingCancellation) {
  // Update existing record with webhook confirmation
} else {
  // Create new record (admin-initiated or direct Razorpay cancellation)
}
```

---

## 6. subscription.completed

**Purpose:** All subscription charges have been completed (fixed-term subscriptions)

### Trigger
- `paid_count` equals `total_count`
- All planned charges completed

### Database Changes

| Table | Field | Change |
|-------|-------|--------|
| Subscription | status | → `COMPLETING` |
| Subscription | paidCount | Final count |
| Subscription | remainingCount | `0` |
| Subscription | nextChargeAt | `null` |
| Subscription | autoRenew | `false` |
| SubscriptionHistory | action | `RENEWED` |
| SubscriptionHistory | toStatus | `COMPLETING` |

**Note:** Status is `COMPLETING` not `EXPIRED`. The cron job will expire it at period end.

---

## 7. subscription.paused

**Purpose:** Subscription paused by admin

### Trigger
- Admin pauses subscription via Razorpay dashboard

### Database Changes

| Table | Field | Change |
|-------|-------|--------|
| Subscription | status | → `PAUSED` |
| Subscription | autoRenew | `false` |
| SubscriptionHistory | action | `PAUSED` |

---

## 8. subscription.resumed

**Purpose:** Paused subscription was resumed

### Trigger
- Admin resumes subscription via Razorpay dashboard

### Database Changes

| Table | Field | Change |
|-------|-------|--------|
| Subscription | status | → `ACTIVE` |
| Subscription | autoRenew | `true` |
| Subscription | nextChargeAt | from Razorpay |
| User | isActive | `true` |
| User | paymentGracePeriod | `false` |
| Store | isAccessible | `true` |
| SubscriptionHistory | action | `RESUMED` |

---

## 9. subscription.updated

**Purpose:** Plan upgrade or downgrade was applied

### Trigger
- Upgrade: Immediately after payment for new plan
- Downgrade: At next billing cycle start

### Database Changes (Common)

| Table | Field | Change |
|-------|-------|--------|
| Subscription | planId | New plan ID |
| Subscription | currentPeriodStart | Updated |
| Subscription | currentPeriodEnd | Updated |
| Subscription | nextChargeAt | Updated |
| Subscription | paidCount | Updated |
| Subscription | remainingCount | Updated |
| Subscription | hasScheduledChanges | `false` |
| Subscription | scheduledPlanId | `null` |
| Subscription | changeScheduledAt | `null` |
| Subscription | lastPlanChangeAt | Current timestamp |
| Subscription | planChangeCount | `+1` |
| Subscription | lastWebhookAt | Current timestamp |
| Subscription | webhookSyncStatus | `SYNCED` |
| SubscriptionHistory | action | `UPGRADED` or `DOWNGRADED` |
| SubscriptionHistory | fromPlanId | Old plan ID |
| SubscriptionHistory | toPlanId | New plan ID |

### Upgrade-Specific Changes

| Table | Field | Change |
|-------|-------|--------|
| Payment | (create) | Payment record with `paymentType: 'UPGRADE_CHARGE'` |
| UsageRecord | (reset) | All counters reset to 0 |

### Downgrade-Specific Changes (with Overage)

| Table | Field | Change |
|-------|-------|--------|
| User | usageGracePeriod | `true` |
| Subscription | metadata.grace_period | GracePeriodData object |

### Grace Period Data Structure
```typescript
gracePeriodData = {
  active: true,
  reason: 'DOWNGRADE_OVERAGE',
  start_date: new Date().toISOString(),
  end_date: gracePeriodEnd.toISOString(), // +5 days
  enforcement_date: gracePeriodEnd.toISOString(),
  enforcement_status: 'PENDING',
  days_remaining: 5,
  reminder_emails_sent: [],
  overage_details: {
    products: { resourceType, currentCount, limit, overageCount },
    categories: { resourceType, currentCount, limit, overageCount },
    billboards: { resourceType, currentCount, limit, overageCount },
    total_overage: number
  },
  new_plan_limits: { maxProducts, maxCategories, maxBillboards },
  from_plan: { id, name },
  to_plan: { id, name }
};
```

---

## Subscription Status Flow Diagram

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
              ┌──────────┐                                    │
   New User   │  TRIAL   │ ──(7 days expire)──▶ EXPIRED      │
              └──────────┘                                    │
                    │                                         │
                    │ (upgrade payment)                       │
                    ▼                                         │
              ┌──────────┐                                    │
              │  ACTIVE  │◀──────────────────────────────────┤
              └──────────┘                                    │
                    │                                         │
      ┌─────────────┼─────────────┬───────────────┐          │
      │             │             │               │          │
      ▼             ▼             ▼               ▼          │
  (cancel)     (completed)   (halted)        (charged)       │
      │             │             │               │          │
      ▼             ▼             ▼               │          │
 ┌──────────┐ ┌───────────┐ ┌─────────┐         │          │
 │ CANCELED │ │COMPLETING │ │ EXPIRED │         │          │
 └──────────┘ └───────────┘ └─────────┘         │          │
      │             │                            │          │
      │             │ (period end)               │          │
      │             ▼                            │          │
      │       ┌─────────┐                        │          │
      └──────▶│ EXPIRED │                        │          │
              └─────────┘                        │          │
                                                 │          │
                                                 └──────────┘
                                               (renewed)
```

---

## Webhook Verification Flow

**Location:** `src/app/api/webhook/razorpay/subscription/route.ts`

```typescript
// 1. Read raw body
const rawBody = await req.text();

// 2. Get signature from header
const signature = headers.get('x-razorpay-signature');

// 3. Verify signature
const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
  .update(rawBody)
  .digest('hex');

if (signature !== expectedSignature) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
}
```

---

## Environment Variables Required

```env
RAZORPAY_KEY_SECRET="your_razorpay_secret_here"
NEXT_PUBLIC_RAZORPAY_KEY_ID="your_razorpay_key_id_here"
RAZORPAY_WEBHOOK_SECRET="your_razorpay_webhook_secret_here"
```

---

## Razorpay Dashboard Webhook Configuration

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhook/razorpay/subscription`
3. Select events:
   - `subscription.authenticated`
   - `subscription.charged`
   - `subscription.pending`
   - `subscription.halted`
   - `subscription.cancelled`
   - `subscription.completed`
   - `subscription.paused`
   - `subscription.resumed`
   - `subscription.updated`
4. Copy the webhook secret → Add to `RAZORPAY_WEBHOOK_SECRET`

---

## Testing Webhooks Locally

Use ngrok to expose local server:

```bash
# Start ngrok
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Use as webhook URL in Razorpay dashboard
```

---

## Common Issues & Fixes

### Issue: Webhook returns 400 Invalid signature
**Fix:** Ensure `RAZORPAY_WEBHOOK_SECRET` matches the secret in Razorpay dashboard.

### Issue: Subscription not found in webhook
**Fix:** Check that `razorpaySubscriptionId` is saved when creating subscription.

### Issue: Duplicate webhook processing
**Fix:** The handlers use `upsert` for payments and check existing records for history.

### Issue: Usage not resetting on charge
**Fix:** Verify period dates changed (duplicate webhooks may have same dates).
