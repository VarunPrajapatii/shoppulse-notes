# 📈 Subscription Upgrade Flow - Corrected Documentation

> **Purpose:** Track all database changes during an upgrade operation based on actual Prisma schema.

---

## Actual Database Fields (from schema.prisma)

### Subscription Model - Fields Used in Upgrade
```prisma
model Subscription {
  id                     String   @id
  userId                 String   @unique
  planId                 String              // ✅ CHANGES to new plan
  razorpayPlanId         String?             // ✅ CHANGES to new Razorpay plan ID
  status                 SubscriptionStatus  // May remain ACTIVE
  currentPeriodStart     DateTime            // ✅ MAY CHANGE
  currentPeriodEnd       DateTime            // ✅ MAY CHANGE
  
  // Scheduling fields (cleared on upgrade)
  hasScheduledChanges    Boolean             // ✅ SET false
  scheduledPlanId        String?             // ✅ CLEARED
  changeScheduledAt      DateTime?           // ✅ CLEARED (NOT scheduledChangeDate!)
  
  // Tracking fields
  lastPlanChangeAt       DateTime?           // ✅ SET to now
  planChangeCount        Int                 // ✅ INCREMENT
  
  // Webhook sync
  lastApiUpdateAt        DateTime?           // ✅ SET when API called
  lastWebhookAt          DateTime?           // ✅ SET when webhook received
  webhookSyncStatus      WebhookSyncStatus   // ✅ PENDING → SYNCED
  
  metadata               Json?               // ✅ Store upgrade history
}
```

### SubscriptionHistory Model - Actual Fields
```prisma
model SubscriptionHistory {
  id             String
  subscriptionId String
  action         SubscriptionAction    // UPGRADED
  fromStatus     SubscriptionStatus?   // Previous status
  toStatus       SubscriptionStatus?   // New status
  fromPlanId     String?               // Previous plan ID
  toPlanId       String?               // New plan ID
  reason         String?               // Optional reason
  metadata       Json?                 // Additional data
  amountCharged  Decimal?              // Proration amount
  createdAt      DateTime
}
// NOTE: NO "stage" or "notes" fields exist!
```

### Payment Model - For Upgrade Charges
```prisma
model Payment {
  paymentType    PaymentType  // ✅ UPGRADE_CHARGE
  invoiceId      String?      // Razorpay invoice ID
  amountPaid     Decimal
  // ... other fields
}
```

### UsageCumulative Model - Actual Structure
```prisma
model UsageCumulative {
  id        String
  userId    String  @unique
  metrics   Json    // {"PRODUCTS": 45, "CATEGORIES": 12, "BILLBOARDS": 8}
  // NOTE: metrics is JSON, NOT individual fields like productsCount!
}
```

### UsageOrders / UsageApiCalls - Period-Based
```prisma
model UsageOrders {
  count       Int       // ✅ RESET to 0 on new period
  periodStart DateTime
  periodEnd   DateTime
}
```

---

## Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UPGRADE FLOW (Immediate)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User clicks "Upgrade" on PlanCard                                          │
│         │                                                                   │
│         ▼                                                                   │
│  POST /api/subscription/upgrade/preview  ──▶  Calculate proration          │
│         │                                      (NO DB WRITES)               │
│         ▼                                                                   │
│  Upgrade dialog shows proration amount                                      │
│         │                                                                   │
│         ▼ (User confirms)                                                   │
│  POST /api/subscription/upgrade/execute  ──▶  DB: Update sync tracking     │
│         │                                                                   │
│         ▼                                                                   │
│  Razorpay API: subscription.update()     ──▶  schedule_change_at: 'now'    │
│         │                                      Charges card immediately     │
│         │                                                                   │
│         ▼ (Async - usually within seconds)                                  │
│  Webhook: subscription.updated           ──▶  DB: Complete upgrade         │
│         │                                                                   │
│         ▼                                                                   │
│  User sees updated plan on /subscription/my-plan                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Database Changes

### Step 1: Preview Request
**API:** `POST /api/subscription/upgrade/preview`

**Database Changes:** ❌ NONE (Read-only)

---

### Step 2: Execute Upgrade Request
**API:** `POST /api/subscription/upgrade/execute`

#### Database Update: Subscription
```sql
UPDATE "Subscription"
SET 
  "lastApiUpdateAt" = NOW(),
  "webhookSyncStatus" = 'PENDING'
WHERE "userId" = 'user_xxx';
```

| Field | Before | After |
|-------|--------|-------|
| `lastApiUpdateAt` | null/old | Current timestamp |
| `webhookSyncStatus` | `SYNCED` | `PENDING` |

#### Database Insert: SubscriptionHistory (Initiated)
```sql
INSERT INTO "SubscriptionHistory" (
  "id", "subscriptionId", "action", 
  "fromPlanId", "toPlanId", "fromStatus", "toStatus",
  "reason", "metadata", "createdAt"
) VALUES (
  'uuid', 'sub_xxx', 'UPGRADED',
  'plan_basic_id', 'plan_pro_id', 'ACTIVE', 'ACTIVE',
  'User initiated upgrade', '{"phase": "api_called"}', NOW()
);
```

---

### Step 3: Webhook - subscription.updated
**Location:** `src/app/api/webhook/razorpay/subscription/handlers/updated.ts`

#### Database Update: Subscription (Complete)
```sql
UPDATE "Subscription"
SET 
  "planId" = 'plan_pro_id',
  "razorpayPlanId" = 'plan_new_razorpay_xxx',
  "currentPeriodStart" = '2024-12-11T00:00:00Z',
  "currentPeriodEnd" = '2025-01-11T00:00:00Z',
  "hasScheduledChanges" = false,
  "scheduledPlanId" = NULL,
  "changeScheduledAt" = NULL,
  "lastPlanChangeAt" = NOW(),
  "planChangeCount" = "planChangeCount" + 1,
  "lastWebhookAt" = NOW(),
  "webhookSyncStatus" = 'SYNCED',
  "cancelAtPeriodEnd" = false,
  "metadata" = jsonb_set(
    COALESCE(metadata, '{}'),
    '{upgrade_history}',
    COALESCE(metadata->'upgrade_history', '[]') || 
    '[{"date": "2024-12-11", "from": "basic", "to": "pro"}]'
  )
WHERE "razorpaySubscriptionId" = 'sub_xxx';
```

| Field | Before | After |
|-------|--------|-------|
| `planId` | `plan_basic_id` | `plan_pro_id` |
| `razorpayPlanId` | Old ID | New Razorpay plan ID |
| `currentPeriodStart` | Old date | New date |
| `currentPeriodEnd` | Old date | New date |
| `hasScheduledChanges` | true/false | `false` |
| `scheduledPlanId` | Any | `null` |
| `changeScheduledAt` | Any | `null` |
| `lastPlanChangeAt` | Old/null | Current timestamp |
| `planChangeCount` | N | N+1 |
| `lastWebhookAt` | Old/null | Current timestamp |
| `webhookSyncStatus` | `PENDING` | `SYNCED` |
| `cancelAtPeriodEnd` | true/false | `false` |

#### Database Insert: Payment (Upgrade Charge)
```sql
INSERT INTO "Payment" (
  "id", "userId", "subscriptionId",
  "subtotal", "taxAmount", "amountPaid", "currency",
  "razorpayPaymentId", "razorpaySubscriptionId",
  "status", "paymentType", "invoiceId",
  "createdAt"
) VALUES (
  'uuid', 'user_xxx', 'sub_xxx',
  250.00, 45.00, 295.00, 'INR',
  'pay_xxx', 'sub_xxx',
  'SUCCESS', 'UPGRADE_CHARGE', 'inv_xxx',
  NOW()
);
```

| Field | Value |
|-------|-------|
| `paymentType` | `UPGRADE_CHARGE` |
| `status` | `SUCCESS` |
| `invoiceId` | Razorpay invoice ID |

#### Database: Reset Period-Based Usage (New Period)
```sql
-- Create new UsageOrders record for new period
INSERT INTO "UsageOrders" (
  "id", "userId", "count", "periodStart", "periodEnd", "createdAt"
) VALUES (
  'uuid', 'user_xxx', 0, '2024-12-11', '2025-01-11', NOW()
)
ON CONFLICT ("userId", "periodStart", "periodEnd") 
DO UPDATE SET "count" = 0;

-- Create new UsageApiCalls record for new period
INSERT INTO "UsageApiCalls" (
  "id", "userId", "count", "periodStart", "periodEnd", "createdAt"
) VALUES (
  'uuid', 'user_xxx', 0, '2024-12-11', '2025-01-11', NOW()
)
ON CONFLICT ("userId", "periodStart", "periodEnd") 
DO UPDATE SET "count" = 0;
```

#### Database Insert: SubscriptionHistory (Completed)
```sql
INSERT INTO "SubscriptionHistory" (
  "id", "subscriptionId", "action",
  "fromPlanId", "toPlanId", "fromStatus", "toStatus",
  "reason", "amountCharged", "metadata", "createdAt"
) VALUES (
  'uuid', 'sub_xxx', 'UPGRADED',
  'plan_basic_id', 'plan_pro_id', 'ACTIVE', 'ACTIVE',
  'Upgrade completed via webhook', 295.00,
  '{"razorpayPlanId": "plan_xxx", "webhookEvent": "subscription.updated"}',
  NOW()
);
```

---

## Database Changes Summary

### On Execute (Before Webhook)
| Table | Operation | Fields |
|-------|-----------|--------|
| Subscription | UPDATE | `lastApiUpdateAt`, `webhookSyncStatus=PENDING` |
| SubscriptionHistory | INSERT | `action=UPGRADED`, phase=api_called |

### On Webhook (Completion)
| Table | Operation | Fields |
|-------|-----------|--------|
| Subscription | UPDATE | `planId`, `razorpayPlanId`, period dates, scheduling cleared, sync updated |
| Payment | INSERT | `paymentType=UPGRADE_CHARGE` |
| UsageOrders | UPSERT | `count=0` for new period |
| UsageApiCalls | UPSERT | `count=0` for new period |
| SubscriptionHistory | INSERT | `action=UPGRADED`, `amountCharged` |

### NOT Changed
| Table | Field | Reason |
|-------|-------|--------|
| UsageCumulative | `metrics.PRODUCTS` | Actual resource count, not reset |
| UsageCumulative | `metrics.CATEGORIES` | Actual resource count, not reset |
| UsageCumulative | `metrics.BILLBOARDS` | Actual resource count, not reset |
| User | Any fields | No changes needed |
| Store | Any fields | No changes needed |

---

## Testing Checklist

### Before Upgrade
- [ ] Note `Subscription.planId`
- [ ] Note `Subscription.razorpayPlanId`
- [ ] Note `Subscription.currentPeriodStart` and `currentPeriodEnd`
- [ ] Note `Subscription.planChangeCount`
- [ ] Note `Subscription.webhookSyncStatus` (should be `SYNCED`)
- [ ] Count `SubscriptionHistory` records
- [ ] Count `Payment` records

### After Execute (Before Webhook)
- [ ] Verify `webhookSyncStatus = PENDING`
- [ ] Verify `lastApiUpdateAt` has current timestamp
- [ ] Verify new `SubscriptionHistory` record exists

### After Webhook
- [ ] Verify `planId` changed to new plan
- [ ] Verify `razorpayPlanId` changed
- [ ] Verify `webhookSyncStatus = SYNCED`
- [ ] Verify `lastWebhookAt` has timestamp
- [ ] Verify `lastPlanChangeAt` has timestamp
- [ ] Verify `planChangeCount` incremented
- [ ] Verify `hasScheduledChanges = false`
- [ ] Verify `scheduledPlanId = null`
- [ ] Verify `changeScheduledAt = null`
- [ ] Verify new `Payment` with `paymentType = UPGRADE_CHARGE`
- [ ] Verify `UsageOrders` for new period has `count = 0`
- [ ] Verify `UsageApiCalls` for new period has `count = 0`
- [ ] Verify `UsageCumulative.metrics` NOT changed

---

## SQL Queries for Verification

```sql
-- Check subscription state
SELECT 
  s.id,
  s."planId",
  p.name as plan_name,
  s."razorpayPlanId",
  s.status,
  s."currentPeriodStart",
  s."currentPeriodEnd",
  s."hasScheduledChanges",
  s."scheduledPlanId",
  s."changeScheduledAt",
  s."lastPlanChangeAt",
  s."planChangeCount",
  s."webhookSyncStatus",
  s."lastApiUpdateAt",
  s."lastWebhookAt"
FROM "Subscription" s
JOIN "SubscriptionPlan" p ON s."planId" = p.id
WHERE s."userId" = 'YOUR_USER_ID';

-- Check subscription history
SELECT 
  action,
  "fromPlanId",
  "toPlanId",
  "fromStatus",
  "toStatus",
  reason,
  "amountCharged",
  metadata,
  "createdAt"
FROM "SubscriptionHistory"
WHERE "subscriptionId" = 'YOUR_SUB_ID'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check payments
SELECT 
  "paymentType",
  "amountPaid",
  status,
  "invoiceId",
  "razorpayPaymentId",
  "createdAt"
FROM "Payment"
WHERE "subscriptionId" = 'YOUR_SUB_ID'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check usage (cumulative - JSON)
SELECT 
  metrics
FROM "UsageCumulative"
WHERE "userId" = 'YOUR_USER_ID';

-- Check period-based usage
SELECT 
  count,
  "periodStart",
  "periodEnd"
FROM "UsageOrders"
WHERE "userId" = 'YOUR_USER_ID'
ORDER BY "periodStart" DESC
LIMIT 5;
```

---

## Related Documentation
- [Subscription Downgrade Flow](./SUBSCRIPTION_DOWNGRADE_FLOW_CORRECTED.md)
