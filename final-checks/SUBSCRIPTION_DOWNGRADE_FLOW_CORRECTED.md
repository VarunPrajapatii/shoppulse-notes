# 📉 Subscription Downgrade Flow - Corrected Documentation

> **Purpose:** Track all database changes during downgrade, grace period, and enforcement based on actual Prisma schema.

---

## Actual Database Fields (from schema.prisma)

### Subscription Model - Downgrade Fields
```prisma
model Subscription {
  // Scheduling fields for downgrade
  hasScheduledChanges    Boolean   @default(false)  // ✅ SET true
  scheduledPlanId        String?                     // ✅ Target plan ID
  changeScheduledAt      DateTime?                   // ✅ When scheduled (NOT scheduledChangeDate!)
  
  // Plan change tracking
  lastPlanChangeAt       DateTime?
  planChangeCount        Int       @default(0)
  
  metadata               Json?     // Store downgrade info
}
```

### User Model - Grace Period Fields
```prisma
model User {
  usageGracePeriod   Boolean @default(false)  // ✅ SET true on overage
  // NOTE: NO gracePeriodStartDate field exists!
  // Grace period start is tracked in Subscription.metadata
}
```

### SubscriptionHistory Model - Actual Fields
```prisma
model SubscriptionHistory {
  action         SubscriptionAction  // DOWNGRADED
  fromPlanId     String?
  toPlanId       String?
  fromStatus     SubscriptionStatus?
  toStatus       SubscriptionStatus?
  reason         String?             // NOT "notes"
  metadata       Json?               // Additional data
  amountCharged  Decimal?
  // NOTE: NO "stage" field exists!
}
```

### ArchivedProduct Model - Actual Fields
```prisma
model ArchivedProduct {
  id                String   @id
  originalProductId String   @unique  // NOT "originalId"!
  name              String
  storeId           String
  categoryName      String   // Snapshot
  sizeName          String   // Snapshot
  sizeValue         String   // Snapshot
  images            Json     // Snapshot as array
  archiveReason     String   // 'grace_period_enforcement', 'manual'
  archivedAt        DateTime
  expiresAt         DateTime // archivedAt + 3 months
}
// NOTE: NO ArchivedCategory or ArchivedBillboard tables!
// Categories and Billboards are DELETED directly, not archived!
```

### UsageCumulative - JSON Structure
```prisma
model UsageCumulative {
  metrics   Json  // {"PRODUCTS": 45, "CATEGORIES": 12, "BILLBOARDS": 8, "STORAGE_GB": 2.3}
  // NOT individual fields like productsCount, categoriesCount!
}
```

---

## Key Differences: Upgrade vs Downgrade

| Aspect | Upgrade | Downgrade |
|--------|---------|-----------|
| **Timing** | Immediate (`now`) | End of cycle (`cycle_end`) |
| **Payment** | Proration charged | No charge |
| **Usage Reset** | Period-based resets | NO reset |
| **Grace Period** | Never | If overage exists |
| **Resource Deletion** | Never | Products archived, Categories/Billboards deleted |

---

## Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DOWNGRADE FLOW (Scheduled for Cycle End)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User clicks "Downgrade" on PlanCard                                        │
│         │                                                                   │
│         ▼                                                                   │
│  POST /api/subscription/downgrade/schedule  ──▶  DB: Mark scheduled        │
│         │                                                                   │
│         ▼                                                                   │
│  Razorpay API: subscription.update()        ──▶  schedule_change_at:       │
│         │                                         'cycle_end'               │
│         │                                                                   │
│         ▼                                                                   │
│  User continues with current plan                                           │
│  (UI shows "Scheduled Downgrade" indicator)                                 │
│         │                                                                   │
│         ▼ (At currentPeriodEnd)                                             │
│  Razorpay applies plan change                                               │
│         │                                                                   │
│         ▼                                                                   │
│  Webhook: subscription.updated              ──▶  DB: Apply downgrade       │
│         │                                         Check overage             │
│         │                                                                   │
│         ▼ (If usage > new plan limits)                                      │
│  Set User.usageGracePeriod = true           ──▶  5-day grace period        │
│         │                                                                   │
│         ▼ (Daily cron)                                                      │
│  Cron: enforce-grace-periods                ──▶  Check if 5 days passed    │
│         │                                                                   │
│         ▼ (If still over limits)                                            │
│  Archive products, DELETE categories/billboards                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Database Changes

### Step 1: Schedule Downgrade
**API:** `POST /api/subscription/downgrade/schedule`

#### Database Update: Subscription
```sql
UPDATE "Subscription"
SET 
  "hasScheduledChanges" = true,
  "scheduledPlanId" = 'plan_basic_id',
  "changeScheduledAt" = NOW(),
  "lastApiUpdateAt" = NOW(),
  "webhookSyncStatus" = 'PENDING',
  "metadata" = jsonb_set(
    COALESCE(metadata, '{}'),
    '{scheduled_downgrade}',
    '{"targetPlanId": "plan_basic_id", "scheduledAt": "2024-12-11T10:30:00Z", "appliesAt": "2025-01-11T00:00:00Z"}'
  )
WHERE "userId" = 'user_xxx';
```

| Field | Before | After |
|-------|--------|-------|
| `hasScheduledChanges` | `false` | `true` |
| `scheduledPlanId` | `null` | Target plan ID |
| `changeScheduledAt` | `null` | Current timestamp |
| `webhookSyncStatus` | `SYNCED` | `PENDING` |
| `metadata.scheduled_downgrade` | - | New object |

#### Database Insert: SubscriptionHistory
```sql
INSERT INTO "SubscriptionHistory" (
  "id", "subscriptionId", "action",
  "fromPlanId", "toPlanId", "fromStatus", "toStatus",
  "reason", "metadata", "createdAt"
) VALUES (
  'uuid', 'sub_xxx', 'DOWNGRADED',
  'plan_pro_id', 'plan_basic_id', 'ACTIVE', 'ACTIVE',
  'Downgrade scheduled for end of billing cycle',
  '{"phase": "scheduled", "appliesAt": "2025-01-11"}',
  NOW()
);
```

---

### Step 2: Cancel Scheduled Downgrade (Optional)
**API:** `POST /api/subscription/downgrade/cancel`

#### Database Update: Subscription
```sql
UPDATE "Subscription"
SET 
  "hasScheduledChanges" = false,
  "scheduledPlanId" = NULL,
  "changeScheduledAt" = NULL,
  "metadata" = "metadata" - 'scheduled_downgrade'
WHERE "userId" = 'user_xxx';
```

| Field | Before | After |
|-------|--------|-------|
| `hasScheduledChanges` | `true` | `false` |
| `scheduledPlanId` | Plan ID | `null` |
| `changeScheduledAt` | Timestamp | `null` |

#### Database Insert: SubscriptionHistory
```sql
INSERT INTO "SubscriptionHistory" (
  "id", "subscriptionId", "action",
  "reason", "metadata", "createdAt"
) VALUES (
  'uuid', 'sub_xxx', 'REACTIVATED',
  'Scheduled downgrade cancelled by user',
  '{"cancelledDowngrade": "plan_basic_id"}',
  NOW()
);
```

---

### Step 3: Webhook - subscription.updated (Downgrade Applied)

#### Database Update: Subscription
```sql
UPDATE "Subscription"
SET 
  "planId" = 'plan_basic_id',
  "razorpayPlanId" = 'plan_basic_razorpay_xxx',
  "currentPeriodStart" = '2025-01-11T00:00:00Z',
  "currentPeriodEnd" = '2025-02-11T00:00:00Z',
  "hasScheduledChanges" = false,
  "scheduledPlanId" = NULL,
  "changeScheduledAt" = NULL,
  "lastPlanChangeAt" = NOW(),
  "planChangeCount" = "planChangeCount" + 1,
  "lastWebhookAt" = NOW(),
  "webhookSyncStatus" = 'SYNCED',
  "metadata" = jsonb_set(
    "metadata" - 'scheduled_downgrade',
    '{downgrade_history}',
    COALESCE(metadata->'downgrade_history', '[]') || 
    '[{"date": "2025-01-11", "from": "pro", "to": "basic", "hadOverage": true}]'
  )
WHERE "razorpaySubscriptionId" = 'sub_xxx';
```

| Field | Before | After |
|-------|--------|-------|
| `planId` | `plan_pro_id` | `plan_basic_id` |
| `razorpayPlanId` | Old | New |
| `currentPeriodStart` | Old | New cycle start |
| `currentPeriodEnd` | Old | New cycle end |
| `hasScheduledChanges` | `true` | `false` |
| `scheduledPlanId` | Plan ID | `null` |
| `changeScheduledAt` | Timestamp | `null` |

#### Check for Overage
```javascript
const usage = await prisma.usageCumulative.findUnique({
  where: { userId: user.id }
});

const metrics = usage.metrics as {
  PRODUCTS: number;
  CATEGORIES: number;
  BILLBOARDS: number;
};

const newPlanLimits = newPlan.additionalLimits as {
  maxCategories: number;
  maxBillboards: number;
};

const overage = {
  products: Math.max(0, metrics.PRODUCTS - newPlan.maxProducts),
  categories: Math.max(0, metrics.CATEGORIES - newPlanLimits.maxCategories),
  billboards: Math.max(0, metrics.BILLBOARDS - newPlanLimits.maxBillboards),
};

const hasOverage = overage.products > 0 || overage.categories > 0 || overage.billboards > 0;
```

#### Database Update: User (If Overage)
```sql
-- Only if hasOverage = true
UPDATE "User"
SET "usageGracePeriod" = true
WHERE "id" = 'user_xxx';
```

| Field | Before | After |
|-------|--------|-------|
| `usageGracePeriod` | `false` | `true` |

#### Database Update: Subscription Metadata (Grace Period Info)
```sql
UPDATE "Subscription"
SET "metadata" = jsonb_set(
  metadata,
  '{grace_period}',
  '{
    "activated": true,
    "startedAt": "2025-01-11T00:00:00Z",
    "expiresAt": "2025-01-16T00:00:00Z",
    "overage": {"products": 20, "categories": 3, "billboards": 2},
    "newLimits": {"products": 50, "categories": 5, "billboards": 3}
  }'
)
WHERE "id" = 'sub_xxx';
```

#### Database Insert: SubscriptionHistory
```sql
INSERT INTO "SubscriptionHistory" (
  "id", "subscriptionId", "action",
  "fromPlanId", "toPlanId", "fromStatus", "toStatus",
  "reason", "metadata", "createdAt"
) VALUES (
  'uuid', 'sub_xxx', 'DOWNGRADED',
  'plan_pro_id', 'plan_basic_id', 'ACTIVE', 'ACTIVE',
  'Downgrade applied via webhook',
  '{"phase": "completed", "gracePeriodActivated": true, "overage": {"products": 20}}',
  NOW()
);
```

---

### Step 4: Grace Period Enforcement (Cron)
**File:** `src/app/api/cron/enforce-grace-periods/route.ts`

**Schedule:** Daily at midnight

#### Find Expired Grace Periods
```javascript
// Check metadata for grace_period.startedAt + 5 days
const usersWithExpiredGrace = await prisma.user.findMany({
  where: {
    usageGracePeriod: true,
    subscription: {
      metadata: {
        path: ['grace_period', 'expiresAt'],
        lte: new Date().toISOString()
      }
    }
  }
});
```

#### Archive Excess Products (ONLY Products are Archived!)
```sql
-- Get oldest products to archive
SELECT * FROM "Product"
WHERE "storeId" = 'store_xxx'
ORDER BY "createdAt" ASC
LIMIT 20;  -- overage count

-- For each product, create archive record
INSERT INTO "ArchivedProduct" (
  "id", "originalProductId", "name", "description",
  "titlepoints", "bulletPoints", "price",
  "storeId", "categoryName", "sizeName", "sizeValue", "images",
  "createdAt", "updatedAt",
  "archiveReason", "archivedAt", "expiresAt"
)
SELECT 
  gen_random_uuid(),
  p.id,
  p.name,
  p.description,
  p.titlepoints,
  p."bulletPoints",
  p.price,
  p."storeId",
  c.name,  -- Category name snapshot
  s.name,  -- Size name snapshot
  s.value, -- Size value snapshot
  (SELECT jsonb_agg(url) FROM "Image" WHERE "productId" = p.id),
  p."createdAt",
  p."updatedAt",
  'grace_period_enforcement',
  NOW(),
  NOW() + INTERVAL '3 months'
FROM "Product" p
JOIN "Category" c ON p."categoryId" = c.id
JOIN "Size" s ON p."sizeId" = s.id
WHERE p.id = 'product_xxx';

-- Delete original product (cascades to Image)
DELETE FROM "Product" WHERE id = 'product_xxx';
```

#### DELETE Excess Categories (NOT Archived!)
```sql
-- Get oldest categories to delete
SELECT * FROM "Category"
WHERE "storeId" = 'store_xxx'
ORDER BY "createdAt" ASC
LIMIT 3;  -- overage count

-- Delete directly (cascades to CategoryBillboard)
DELETE FROM "Category" WHERE id IN ('cat_1', 'cat_2', 'cat_3');
```

#### DELETE Excess Billboards (NOT Archived!)
```sql
-- Get oldest billboards to delete  
SELECT * FROM "Billboard"
WHERE "storeId" = 'store_xxx'
ORDER BY "createdAt" ASC
LIMIT 2;  -- overage count

-- Delete directly (cascades to CategoryBillboard, StoreMainBillboard)
DELETE FROM "Billboard" WHERE id IN ('bb_1', 'bb_2');
```

#### Update UsageCumulative Metrics
```sql
UPDATE "UsageCumulative"
SET "metrics" = jsonb_build_object(
  'PRODUCTS', (SELECT COUNT(*) FROM "Product" WHERE "storeId" = 'store_xxx'),
  'CATEGORIES', (SELECT COUNT(*) FROM "Category" WHERE "storeId" = 'store_xxx'),
  'BILLBOARDS', (SELECT COUNT(*) FROM "Billboard" WHERE "storeId" = 'store_xxx'),
  'STORAGE_GB', (metrics->>'STORAGE_GB')::float
)
WHERE "userId" = 'user_xxx';
```

#### Clear Grace Period Flag
```sql
UPDATE "User"
SET "usageGracePeriod" = false
WHERE "id" = 'user_xxx';
```

#### Update Subscription Metadata
```sql
UPDATE "Subscription"
SET "metadata" = jsonb_set(
  "metadata" - 'grace_period',
  '{enforcement_history}',
  COALESCE(metadata->'enforcement_history', '[]') || 
  '[{
    "date": "2025-01-16",
    "productsArchived": 20,
    "categoriesDeleted": 3,
    "billboardsDeleted": 2
  }]'
)
WHERE "userId" = 'user_xxx';
```

#### Database Insert: SubscriptionHistory
```sql
INSERT INTO "SubscriptionHistory" (
  "id", "subscriptionId", "action",
  "reason", "metadata", "createdAt"
) VALUES (
  'uuid', 'sub_xxx', 'DOWNGRADED',
  'Grace period enforcement - resources removed',
  '{
    "phase": "enforcement",
    "productsArchived": 20,
    "categoriesDeleted": 3,
    "billboardsDeleted": 2,
    "archiveExpiresAt": "2025-04-16"
  }',
  NOW()
);
```

---

## Database Changes Summary

### On Schedule
| Table | Operation | Fields |
|-------|-----------|--------|
| Subscription | UPDATE | `hasScheduledChanges=true`, `scheduledPlanId`, `changeScheduledAt`, `metadata` |
| SubscriptionHistory | INSERT | `action=DOWNGRADED`, phase=scheduled |

### On Webhook (Downgrade Applied)
| Table | Operation | Fields |
|-------|-----------|--------|
| Subscription | UPDATE | `planId`, `razorpayPlanId`, period dates, scheduling cleared |
| User | UPDATE | `usageGracePeriod=true` (if overage) |
| SubscriptionHistory | INSERT | `action=DOWNGRADED`, phase=completed |

### On Grace Period Enforcement
| Table | Operation | Count |
|-------|-----------|-------|
| ArchivedProduct | INSERT | Products over limit |
| Product | DELETE | Same count |
| Category | DELETE | Categories over limit (NO archive!) |
| Billboard | DELETE | Billboards over limit (NO archive!) |
| UsageCumulative | UPDATE | Recalculate metrics |
| User | UPDATE | `usageGracePeriod=false` |
| Subscription | UPDATE | Clear grace_period metadata |
| SubscriptionHistory | INSERT | Enforcement details |

---

## Testing Checklist

### After Scheduling
- [ ] `hasScheduledChanges = true`
- [ ] `scheduledPlanId` = target plan ID
- [ ] `changeScheduledAt` has timestamp
- [ ] `metadata.scheduled_downgrade` exists
- [ ] New `SubscriptionHistory` with `action=DOWNGRADED`
- [ ] `planId` still points to CURRENT (higher) plan

### After Webhook
- [ ] `planId` changed to lower plan
- [ ] `hasScheduledChanges = false`
- [ ] `scheduledPlanId = null`
- [ ] `changeScheduledAt = null`
- [ ] If overage: `User.usageGracePeriod = true`
- [ ] If overage: `metadata.grace_period` exists
- [ ] `UsageCumulative.metrics` NOT changed (actual counts)

### After Grace Period Enforcement
- [ ] `User.usageGracePeriod = false`
- [ ] `ArchivedProduct` records created (count = product overage)
- [ ] `ArchivedProduct.originalProductId` matches deleted product IDs
- [ ] `ArchivedProduct.archiveReason = 'grace_period_enforcement'`
- [ ] `ArchivedProduct.expiresAt` = 3 months from now
- [ ] Original `Product` records deleted
- [ ] `Category` records deleted (NOT archived)
- [ ] `Billboard` records deleted (NOT archived)
- [ ] `UsageCumulative.metrics` updated to new counts
- [ ] `metadata.grace_period` removed
- [ ] `metadata.enforcement_history` added

---

## SQL Queries for Verification

```sql
-- Check scheduling state
SELECT 
  s."hasScheduledChanges",
  s."scheduledPlanId",
  sp.name as scheduled_plan_name,
  s."changeScheduledAt",
  s.metadata->'scheduled_downgrade' as scheduled_info
FROM "Subscription" s
LEFT JOIN "SubscriptionPlan" sp ON s."scheduledPlanId" = sp.id
WHERE s."userId" = 'YOUR_USER_ID';

-- Check grace period state
SELECT 
  u."usageGracePeriod",
  s.metadata->'grace_period' as grace_info
FROM "User" u
JOIN "Subscription" s ON u."subscriptionId" = s.id
WHERE u.id = 'YOUR_USER_ID';

-- Check usage vs limits
SELECT 
  uc.metrics,
  sp."maxProducts",
  sp."additionalLimits"
FROM "UsageCumulative" uc
JOIN "User" u ON uc."userId" = u.id
JOIN "Subscription" s ON u."subscriptionId" = s.id
JOIN "SubscriptionPlan" sp ON s."planId" = sp.id
WHERE uc."userId" = 'YOUR_USER_ID';

-- Check archived products
SELECT 
  "originalProductId",
  name,
  "archiveReason",
  "archivedAt",
  "expiresAt"
FROM "ArchivedProduct"
WHERE "storeId" = 'YOUR_STORE_ID'
ORDER BY "archivedAt" DESC;

-- Check subscription history for downgrade
SELECT 
  action,
  "fromPlanId",
  "toPlanId",
  reason,
  metadata,
  "createdAt"
FROM "SubscriptionHistory"
WHERE "subscriptionId" = 'YOUR_SUB_ID'
  AND action = 'DOWNGRADED'
ORDER BY "createdAt" DESC;
```

---

## Related Documentation
- [Subscription Upgrade Flow](./SUBSCRIPTION_UPGRADE_FLOW_CORRECTED.md)
