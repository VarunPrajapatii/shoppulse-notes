# Upgrade API Reference & Database Schema

Developer cheat sheet — request/response formats, webhook payload, error codes, and DB schema.

---

## Endpoints

### 1. Preview Upgrade

```
POST /api/subscription/upgrade/preview
Authorization: Clerk session required
```

**Request:**
```json
{ "newPlanId": "clx..." }
```

**Success Response (200):**
```json
{
  "success": true,
  "currentPlan": { "id": "clx...", "name": "PRO", "price": 499, "billingCycle": "MONTHLY" },
  "newPlan": { "id": "clx...", "name": "ENTERPRISE", "price": 999, "billingCycle": "MONTHLY" },
  "proration": {
    "daysRemaining": 15,
    "totalDaysInCycle": 30,
    "currentPlanPrice": 499,
    "creditForRemainingDays": 249.5,
    "newPlanPrice": 999,
    "chargeAmount": 749.5,
    "chargeCurrency": "INR"
  },
  "currentPeriod": { "start": "2025-01-01T00:00:00Z", "end": "2025-01-31T00:00:00Z" },
  "newBillingPeriod": { "start": "2025-01-16T00:00:00Z", "end": "2025-02-16T00:00:00Z" },
  "note": "You'll be charged ₹749.50 now. Your next billing date will be Feb 16, 2025."
}
```

**Error Responses:**

| Status | Error | Cause |
|---|---|---|
| 401 | Unauthorized | Not logged in |
| 400 | Plan ID is required | Missing newPlanId |
| 404 | No active subscription | User has no subscription |
| 400 | Subscription must be active to upgrade | Status ≠ ACTIVE |
| 400 | New plan must be more expensive | `newPrice ≤ currentPrice` |
| 400 | Charge amount must be at least ₹0.50 | Prorated charge < ₹0.50 |

---

### 2. Execute Upgrade

```
POST /api/subscription/upgrade/execute
Authorization: Clerk session required
```

**Request:**
```json
{ "newPlanId": "clx..." }
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Upgrade initiated successfully! Processing payment...",
  "subscription": {
    "id": "sub_...", "planId": "plan_...", "status": "active", "hasScheduledChanges": false
  },
  "note": "Your upgrade is being processed. You will be notified once the payment is confirmed."
}
```

**Error Responses:**

| Status | Error | Cause | Special |
|---|---|---|---|
| 401 | Unauthorized | Not logged in | |
| 404 | No active subscription | No subscription | |
| 400 | Subscription not active | Status ≠ ACTIVE/COMPLETING | |
| 400 | Not an upgrade | `newPrice ≤ currentPrice` | |
| 400 | UPI subscriptions cannot be updated | UPI/emandate method | Returns `requiresCancelFlow: true` |
| 500 | Failed to process upgrade | Razorpay API failure | |

---

### 3. Poll Upgrade Status

```
GET /api/subscription/upgrade/status?targetPlanId=clx...
Authorization: Clerk session required
```

**Response (200):**
```json
{
  "status": "SYNCED" | "PENDING",
  "planId": "clx...",
  "planMatches": true | false,
  "plan": { "name": "ENTERPRISE", "price": 999 }
}
```

---

### 4. Fallback Confirmation

```
POST /api/subscription/upgrade/razorpay-update-confirm-fallback
Authorization: Clerk session required
```

**Request:**
```json
{ "expectedNewPlanId": "clx..." }
```

**Responses:**
- Already synced → `{ success: true, alreadySynced: true }`
- Not pending → `{ error: "No pending upgrade to confirm" }`
- Plan matches → calls `applySubscriptionPlanChange()` → `{ success: true }`
- Plan doesn't match → sets SYNC_FAILED → `{ error: "Upgrade could not be confirmed" }`

---

## Webhook: subscription.updated

**Sent by Razorpay after upgrade payment succeeds.**

```json
{
  "event": "subscription.updated",
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_...",
        "plan_id": "plan_...",
        "status": "active",
        "current_start": 1705363200,
        "current_end": 1707955200,
        "charge_at": 1707955200,
        "paid_count": 2,
        "remaining_count": 10,
        "has_scheduled_changes": false
      }
    },
    "payment": {
      "entity": {
        "id": "pay_...",
        "amount": 74950,
        "currency": "INR",
        "status": "captured",
        "invoice_id": "inv_...",
        "method": "card"
      }
    }
  }
}
```

**What the webhook handler does:**
1. Updates `planId` to new plan
2. Updates billing period (`currentPeriodStart`, `currentPeriodEnd`, `nextChargeAt`)
3. Clears `hasScheduledChanges` / `scheduledPlanId`
4. Increments `planChangeCount`, sets `lastPlanChangeAt`
5. Creates SubscriptionHistory record (UPGRADED) with `amountCharged`
6. Creates Payment record (UPGRADE_CHARGE type) with `invoiceId`
7. Stores previous plan info in metadata
8. Invalidates store cache
9. Resets period metrics, sends email + SMS notifications

---

## Database Schema

### Subscription (Upgrade-Related Fields)

```prisma
model Subscription {
  // Plan change tracking
  hasScheduledChanges Boolean   @default(false)
  scheduledPlanId     String?
  changeScheduledAt   DateTime?
  metadata            Json?
  lastPlanChangeAt    DateTime?
  planChangeCount     Int       @default(0)
  firstActivatedAt    DateTime?

  // Webhook sync tracking
  lastApiUpdateAt     DateTime?
  lastWebhookAt       DateTime?
  webhookSyncStatus   WebhookSyncStatus @default(SYNCED)

  @@index([hasScheduledChanges])
  @@index([scheduledPlanId])
}

enum WebhookSyncStatus {
  SYNCED
  PENDING
  SYNC_FAILED
  MANUAL_CHECK
}
```

### Payment (Upgrade-Related Fields)

```prisma
model Payment {
  paymentType PaymentType @default(SUBSCRIPTION_CHARGE)
  invoiceId   String?

  @@index([paymentType])
  @@index([invoiceId])
}

enum PaymentType {
  SUBSCRIPTION_CHARGE
  UPGRADE_CHARGE
  ADDON_CHARGE
  SETUP_FEE
}
```

### SubscriptionHistory

```prisma
model SubscriptionHistory {
  amountCharged Decimal?
  // action: UPGRADED | CANCELED | REACTIVATED etc.
  // metadata stores previous plan info, charge details
}
```

---

## File Map

| Purpose | File Path | Lines |
|---|---|---|
| Preview API | `src/app/api/subscription/upgrade/preview/route.ts` | 169 |
| Execute API | `src/app/api/subscription/upgrade/execute/route.ts` | 524 |
| Status polling | `src/app/api/subscription/upgrade/status/route.ts` | — |
| Fallback confirm | `src/app/api/subscription/upgrade/razorpay-update-confirm-fallback/route.ts` | — |
| Webhook handler | `src/app/api/webhook/razorpay/subscription/handlers/updated.ts` | 505 |
| Shared plan change | `src/lib/subscription/apply-plan-change.ts` | — |
| Upgrade dialog | `src/app/(dashboard)/subscription/components/my-plan/upgrade-dialog.tsx` | 621 |
| Downgrade dialog | `src/app/(dashboard)/subscription/components/my-plan/downgrade-dialog.tsx` | 638 |
| Intent banner | `src/app/(dashboard)/subscription/components/upgrade-intent-banner.tsx` | 109 |
| Plan card | `src/app/(dashboard)/subscription/components/plan-card.tsx` | — |
| Plans page | `src/app/(dashboard)/subscription/plans/page.tsx` | — |
| Cancel API | `src/app/api/subscription/cancel/route.ts` | 154 |

---

## Razorpay API Quick Reference

### Update Subscription (Core API Call)
```typescript
await razorpayInstance.subscriptions.update(subscriptionId, {
  plan_id: newRazorpayPlanId,
  schedule_change_at: 'now',
  customer_notify: true
});
```

### Fetch Subscription (Fallback)
```typescript
const rzpSub = await razorpayInstance.subscriptions.fetch(subscriptionId);
// Check rzpSub.plan_id to verify upgrade took effect
```

### Cancel Subscription (For UPI fallback flow)
```typescript
await razorpayInstance.subscriptions.cancel(subscriptionId);
// Immediate cancellation for cancel-and-resubscribe flow
```

---

## External References

- [Razorpay Update Subscription API](https://razorpay.com/docs/api/subscriptions/#update-a-subscription)
- [Razorpay Customer Portal](https://razorpay.com/docs/payments/subscriptions/customer-portal/)
- [Razorpay Test Card/UPI Details](https://razorpay.com/docs/payments/payments/test-card-upi-details/)
