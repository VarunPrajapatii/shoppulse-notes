# PART 4: Complete Integration Map - Where Usage Metrics Touch the Application

**Document Purpose**: Comprehensive map of all touchpoints where usage metrics interact with the application  
**Date**: November 29, 2025  
**Status**: ✅ IMPLEMENTED (December 1, 2025)

---

## ⚠️ IMPORTANT: Implementation Complete

This document was the original planning guide. **The actual implementation has been completed** using the 4-table architecture.

### Actual Implementation Location

- **Usage Service**: `src/lib/usage-service.ts`
- **Products API**: `src/app/api/[storeId]/products/route.ts` and `[productId]/route.ts`
- **Categories API**: `src/app/api/[storeId]/categories/route.ts` and `[categoryId]/route.ts`
- **Billboards API**: `src/app/api/[storeId]/billboards/route.ts` and `[billboardId]/route.ts`
- **Checkout API**: `src/app/api/[storeId]/checkout/route.ts`
- **Onboarding**: `src/app/api/onboarding/complete/route.ts`
- **Webhook Handler**: `src/app/api/webhook/razorpay/subscription/handlers/charged.ts`

### Quick Reference - What's Integrated

| Endpoint | Action | Usage Function |
|----------|--------|----------------|
| POST /api/[storeId]/products | Create | `checkCumulativeLimit('PRODUCTS')` + `incrementCumulative('PRODUCTS')` |
| DELETE /api/[storeId]/products/[id] | Delete | `decrementCumulative('PRODUCTS')` |
| POST /api/[storeId]/categories | Create | `checkCumulativeLimit('CATEGORIES')` + `incrementCumulative('CATEGORIES')` |
| DELETE /api/[storeId]/categories/[id] | Delete | `decrementCumulative('CATEGORIES')` |
| POST /api/[storeId]/billboards | Create | `checkCumulativeLimit('BILLBOARDS')` + `incrementCumulative('BILLBOARDS')` |
| DELETE /api/[storeId]/billboards/[id] | Delete | `decrementCumulative('BILLBOARDS')` |
| POST /api/[storeId]/checkout | Order | `checkOrderLimit()` + `incrementOrders()` |
| POST /api/onboarding/complete | Init | `initializeUsageForUser()` |
| subscription.charged webhook | Reset | `archiveAndResetPeriod()` |

### Key Business Rules Implemented

1. **Archived products count toward limit** - Only DELETE decrements, NOT archive
2. **Period reset on billing cycle** - subscription.charged triggers archiveAndResetPeriod
3. **Non-blocking errors** - Usage failures don't break core functionality
4. **Limit pre-check** - Check before create to prevent over-limit

---

## Original Planning Documentation (Below)

*The following content was the original planning guide. Refer to the actual code for current implementation.*

---

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Database Operations](#database-operations)
3. [Webhook Handlers](#webhook-handlers)
4. [Frontend Components](#frontend-components)
5. [Background Jobs](#background-jobs)
6. [Service Integration Points](#service-integration-points)

---

## API Endpoints

### Products API

#### `POST /api/[storeId]/products` - Create Product
**Impact**: Increments PRODUCTS counter

**Integration Points**:
```typescript
1. Pre-check: checkUsageLimit(userId, 'PRODUCTS')
2. Create: prisma.product.create()
3. Track: incrementUsage(userId, 'PRODUCTS')
4. Check threshold: if 80%/90%/100% → send email
```

**Error Response** (at limit):
```json
{
  "error": "Product limit reached",
  "code": "USAGE_LIMIT_EXCEEDED",
  "current": 100,
  "limit": 100,
  "message": "You've reached your plan's limit of 100 products. Upgrade to create more.",
  "upgradeUrl": "/subscription/plans"
}
```

---

#### `DELETE /api/[storeId]/products/[productId]` - Delete Product
**Impact**: Decrements PRODUCTS counter

**Integration Points**:
```typescript
1. Delete: prisma.product.deleteMany()
2. Track: decrementUsage(userId, 'PRODUCTS')
```

---

// NOTE: we wont be changing count in archiving endpoint
#### `PATCH /api/[storeId]/products/[productId]` - Update Product
**Impact**: Updates PRODUCTS counter if archiving status changes

**Integration Points**:
```typescript
1. Check: if isArchived changed
2. Track: 
   - If archived (false → true): decrementUsage(userId, 'PRODUCTS')
   - If unarchived (true → false): incrementUsage(userId, 'PRODUCTS')
```

**Special Case**: Archived products don't count toward limit
```typescript
// Product count query
const activeProducts = await prisma.product.count({
  where: {
    storeId,
    isArchived: false  // ✅ Only count active products
  }
});
```

---

### Orders API

#### `POST /api/[storeId]/checkout` - Create Order (Customer Purchase)
**Impact**: Increments ORDERS counter

**Integration Points**:
```typescript
1. Create: prisma.order.create()
2. Track: incrementUsage(userId, 'ORDERS')
3. Note: ORDERS resets each billing period (per-period metric)
```

**Period Behavior**:
```
Month 1: 800 orders → 800/1000 ✅
Month 2: 0 orders → 0/1000 ✅ (RESET at period start)
Month 2: 500 orders → 500/1000 ✅
```

---

### Categories API

#### `POST /api/[storeId]/categories` - Create Category
**Impact**: Increments CATEGORIES counter

**Integration Points**:
```typescript
1. Pre-check: checkUsageLimit(userId, 'CATEGORIES')
2. Create: prisma.category.create()
3. Track: incrementUsage(userId, 'CATEGORIES')
```

**Error Response** (at limit):
```json
{
  "error": "Category limit reached",
  "code": "USAGE_LIMIT_EXCEEDED",
  "limit": 50,
  "message": "You've reached your plan's limit of 50 categories."
}
```

---

#### `DELETE /api/[storeId]/categories/[categoryId]` - Delete Category
**Impact**: Decrements CATEGORIES counter

**Integration Points**:
```typescript
1. Delete: prisma.category.deleteMany()
2. Track: decrementUsage(userId, 'CATEGORIES')
```

---

### Billboards API

#### `POST /api/[storeId]/billboards` - Create Billboard
**Impact**: Increments BILLBOARDS counter

**Integration Points**:
```typescript
1. Pre-check: checkUsageLimit(userId, 'BILLBOARDS')
2. Create: prisma.billboard.create()
3. Track: incrementUsage(userId, 'BILLBOARDS')
```

---

#### `DELETE /api/[storeId]/billboards/[billboardId]` - Delete Billboard
**Impact**: Decrements BILLBOARDS counter

**Integration Points**:
```typescript
1. Delete: prisma.billboard.deleteMany()
2. Track: decrementUsage(userId, 'BILLBOARDS')
```

---

### Sizes API

#### `POST /api/[storeId]/sizes` - Create Size
**Impact**: Checks additionalLimits.maxSizes (if configured)

**Integration Points**:
```typescript
1. Pre-check: checkUsageLimit(userId, 'SIZES') // From additionalLimits
2. Create: prisma.size.create()
3. Track: Not tracked in UsageRecord (too granular)
```

**Note**: Sizes are typically not limited, but can be configured in `plan.additionalLimits.maxSizes`

---

## Database Operations

### UsageRecord CRUD

#### 1. **Create** (Initial Setup)
**When**: Onboarding completion
**File**: `src/app/api/onboarding/complete/route.ts`

```typescript
// Creates 6 initial UsageRecord entries
await Promise.all([
  prisma.usageRecord.create({
    data: {
      userId,
      metricType: 'PRODUCTS',
      count: 0,
      periodStart: trialStart,
      periodEnd: trialEnd
    }
  }),
  // ... same for ORDERS, STORAGE_GB, CATEGORIES, BILLBOARDS, API_CALLS
]);
```

---

#### 2. **Update** (Increment)
**When**: Resource created
**File**: `src/lib/usage-service.ts`

```typescript
await prisma.usageRecord.upsert({
  where: {
    userId_metricType_periodStart_periodEnd: {
      userId,
      metricType: 'PRODUCTS',
      periodStart,
      periodEnd
    }
  },
  update: {
    count: { increment: 1 },  // ✅ Atomic increment
    updatedAt: new Date()
  },
  create: {
    userId,
    metricType: 'PRODUCTS',
    count: 1,
    periodStart,
    periodEnd
  }
});
```

---

#### 3. **Update** (Decrement)
**When**: Resource deleted
**File**: `src/lib/usage-service.ts`

```typescript
await prisma.usageRecord.updateMany({
  where: {
    userId,
    metricType: 'PRODUCTS',
    periodStart,
    periodEnd
  },
  data: {
    count: { decrement: 1 },  // ✅ Atomic decrement
    updatedAt: new Date()
  }
});
```

---

#### 4. **Read** (Check Usage)
**When**: Pre-check before creating resource
**File**: `src/lib/usage-service.ts`

```typescript
const record = await prisma.usageRecord.findUnique({
  where: {
    userId_metricType_periodStart_periodEnd: {
      userId,
      metricType: 'PRODUCTS',
      periodStart,
      periodEnd
    }
  }
});

const currentUsage = record?.count || 0;
```

---

#### 5. **Update** (Period Change)
**When**: Subscription renewed, upgraded, or downgraded
**File**: `src/lib/usage-service.ts`

```typescript
// Update ALL records to new period
await prisma.usageRecord.updateMany({
  where: { userId },
  data: {
    periodStart: newPeriodStart,
    periodEnd: newPeriodEnd
  }
});
```

---

#### 6. **Reset** (Period Metrics)
**When**: New billing cycle starts (cron job)
**File**: `src/app/api/cron/reset-period-usage/route.ts`

```typescript
// Reset ORDERS counter to 0
await prisma.usageRecord.updateMany({
  where: {
    userId,
    metricType: 'ORDERS',
    periodStart: currentPeriodStart,
    periodEnd: currentPeriodEnd
  },
  data: { count: 0 }
});

// Reset API_CALLS counter to 0
await prisma.usageRecord.updateMany({
  where: {
    userId,
    metricType: 'API_CALLS',
    // ...
  },
  data: { count: 0 }
});

// DON'T reset PRODUCTS, CATEGORIES, BILLBOARDS, STORAGE_GB (cumulative)
```

---

### Product Queries (Archived Filtering)

**Critical**: Always filter out archived products when counting

```typescript
// ❌ WRONG: Counts archived products
const productCount = await prisma.product.count({
  where: { storeId }
});

// ✅ CORRECT: Only active products
const productCount = await prisma.product.count({
  where: {
    storeId,
    isArchived: false  // Exclude archived
  }
});
```

**Where to Apply**:
- `src/lib/usage-service.ts` - `getCumulativeUsage()`
- Any product listing pages
- Dashboard analytics
- Grace period enforcement (auto-archive)

---

## Webhook Handlers

### Subscription Updated Webhook
**File**: `src/app/api/webhook/razorpay/subscription/handlers/updated.ts`

**Integration Points**:

#### 1. **Plan Upgrade** (New period, new limits)
```typescript
// User upgraded from Monthly → Half-Yearly
await updateBillingPeriods(
  userId,
  subscription.currentPeriodStart,
  subscription.currentPeriodEnd
);

// Result: All UsageRecord entries updated with new period dates
```

---

#### 2. **Plan Downgrade** (Check for grace period)
```typescript
// Get current product count
const productCount = await prisma.product.count({
  where: {
    storeId,
    isArchived: false
  }
});

// Check if exceeds new plan limit
if (newPlan.maxProducts && productCount > newPlan.maxProducts) {
  // Activate 14-day grace period
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      metadata: {
        grace_period: {
          active: true,
          current_usage: productCount,
          target_limit: newPlan.maxProducts,
          excess_count: productCount - newPlan.maxProducts,
          // ...
        }
      }
    }
  });

  // Send grace period activation email
  await sendGracePeriodEmail(userId, {
    current: productCount,
    limit: newPlan.maxProducts,
    excess: productCount - newPlan.maxProducts
  });
}
```

---

### Subscription Charged Webhook
**File**: `src/app/api/webhook/razorpay/subscription/handlers/charged.ts`

**Integration Points**:

```typescript
// Check if new billing period started
const isNewPeriod = 
  subscription.currentPeriodStart.getTime() !== 
  oldPeriodStart.getTime();

if (isNewPeriod) {
  // Reset per-period metrics (ORDERS, API_CALLS)
  await resetPeriodMetrics(userId);
}
```

---

## Frontend Components

### 1. Usage Dashboard Card
**File**: `src/components/subscription/usage-card.tsx`

**Data Source**:
```typescript
const usageData = await getAllUsageData(userId);
// Returns: [
//   { metricType: 'PRODUCTS', count: 87, limit: 100, percentage: 87 },
//   { metricType: 'ORDERS', count: 423, limit: 1000, percentage: 42.3 },
//   // ...
// ]
```

**Display Logic**:
```tsx
{usageData.map((metric) => (
  <UsageMetricRow
    name={metric.metricType}
    current={metric.count}
    limit={metric.limit}
    percentage={metric.percentage}
    status={metric.status} // 'healthy' | 'warning' | 'critical' | 'exceeded'
  />
))}
```

**Color Coding**:
```typescript
0-70%:   Green (healthy)
70-90%:  Yellow (warning)
90-100%: Orange (critical)
100%+:   Red (exceeded)
```

---

### 2. Product List Page Header
**File**: `src/app/(dashboard)/[storeId]/(routes)/products/page.tsx`

**Data Source**:
```typescript
const usageCheck = await checkUsageLimit(userId, 'PRODUCTS');
// Returns: { allowed: true, current: 87, limit: 100, percentage: 87 }
```

**Display Logic**:
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1>Products</h1>
    <p>{usageCheck.current} / {usageCheck.limit} used</p>
  </div>
  
  <Button disabled={!usageCheck.allowed}>
    {usageCheck.allowed ? 'Add Product' : 'Limit Reached'}
  </Button>
</div>

{usageCheck.percentage >= 90 && (
  <Alert variant={usageCheck.percentage >= 100 ? 'destructive' : 'warning'}>
    {usageCheck.percentage >= 100
      ? 'Product limit reached. Upgrade to create more.'
      : `Approaching limit: ${Math.round(100 - usageCheck.percentage)}% remaining`}
  </Alert>
)}
```

---

### 3. Create Product Form
**File**: `src/app/(dashboard)/[storeId]/(routes)/products/new/page.tsx`

**Integration Points**:

#### Pre-check Display:
```tsx
const usageCheck = await checkUsageLimit(userId, 'PRODUCTS');

return (
  <div>
    {/* Usage badge in header */}
    <UsageBadge current={usageCheck.current} limit={usageCheck.limit} />
    
    {/* Disable form if at limit */}
    <ProductForm disabled={!usageCheck.allowed} />
    
    {/* Warning banner */}
    {!usageCheck.allowed && (
      <Alert>
        Product limit reached. 
        <Button onClick={() => router.push('/subscription/plans')}>
          Upgrade Plan
        </Button>
      </Alert>
    )}
  </div>
);
```

#### API Error Handling:
```typescript
try {
  const response = await fetch('/api/[storeId]/products', {
    method: 'POST',
    body: JSON.stringify(productData)
  });

  if (!response.ok) {
    const error = await response.json();
    
    if (error.code === 'USAGE_LIMIT_EXCEEDED') {
      // Show upgrade modal
      showUpgradeModal({
        metric: 'products',
        current: error.current,
        limit: error.limit
      });
      return;
    }
  }

  // Success
  router.push('/products');
} catch (error) {
  // Handle error
}
```

---

### 4. My Plan Page
**File**: `src/app/(dashboard)/subscription/my-plan/page.tsx`

**Data Source**:
```typescript
const user = await prismadb.user.findUnique({
  where: { id: userId },
  include: {
    subscription: { include: { plan: true } },
    usageRecords: {
      where: {
        periodStart: { lte: new Date() },
        periodEnd: { gte: new Date() }
      }
    }
  }
});

// Transform to UI-friendly format
const metrics = user.usageRecords.map((record) => ({
  name: record.metricType,
  current: record.count,
  limit: getPlanLimit(user.subscription.plan, record.metricType),
  percentage: calculatePercentage(record.count, limit)
}));
```

**Display**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Current Plan: {plan.displayName}</CardTitle>
    <CardDescription>
      {billingCycle} billing • ${plan.price}/month
    </CardDescription>
  </CardHeader>
  
  <CardContent>
    <UsageCard metrics={metrics} />
    
    {/* Show upgrade suggestion if any metric > 80% */}
    {metrics.some(m => m.percentage > 80) && (
      <UpgradeSuggestion currentPlan={plan} />
    )}
  </CardContent>
</Card>
```

---

### 5. Grace Period Banner
**File**: `src/components/subscription/grace-period-banner.tsx`

**When to Show**: 
- User downgraded
- Usage exceeds new plan limits
- Within 14-day grace period

**Data Source**:
```typescript
const subscription = await prismadb.subscription.findUnique({
  where: { userId },
  include: { plan: true }
});

const gracePeriod = subscription.metadata?.grace_period;

if (gracePeriod?.active) {
  // Calculate days remaining
  const endDate = new Date(gracePeriod.end_date);
  const now = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Show banner
}
```

**Display**:
```tsx
{gracePeriod?.active && (
  <Alert variant="warning" className="border-l-4 border-orange-500">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Grace Period Active</AlertTitle>
    <AlertDescription>
      You have {gracePeriod.excess_count} products over your new limit of {gracePeriod.target_limit}.
      <br />
      {daysRemaining} days remaining to reduce products before auto-archiving.
    </AlertDescription>
    <Button variant="outline" size="sm" className="mt-2">
      Manage Products
    </Button>
  </Alert>
)}
```

---

## Background Jobs

### 1. Reset Period Metrics Cron
**File**: `src/app/api/cron/reset-period-usage/route.ts`

**Schedule**: Daily at midnight (00:00 UTC)

**Purpose**: Reset ORDERS and API_CALLS counters for subscriptions that started new billing period

**Logic**:
```typescript
// Find subscriptions where new period started today
const subscriptions = await prisma.subscription.findMany({
  where: {
    currentPeriodStart: {
      gte: todayStart,  // 00:00:00
      lt: todayEnd      // 23:59:59
    }
  }
});

for (const subscription of subscriptions) {
  // Reset ORDERS counter
  await prisma.usageRecord.updateMany({
    where: {
      userId: subscription.userId,
      metricType: 'ORDERS'
    },
    data: { count: 0 }
  });

  // Reset API_CALLS counter
  await prisma.usageRecord.updateMany({
    where: {
      userId: subscription.userId,
      metricType: 'API_CALLS'
    },
    data: { count: 0 }
  });

  console.log(`Reset period metrics for user ${subscription.userId}`);
}
```

**Vercel Cron Configuration** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/reset-period-usage",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

### 2. Grace Period Enforcement Cron
**File**: `src/app/api/cron/enforce-grace-period/route.ts`

**Schedule**: Daily at midnight (00:00 UTC)

**Purpose**: Auto-archive excess products when grace period expires

**Logic**:
```typescript
// Find subscriptions with expired grace periods
const subscriptions = await prisma.subscription.findMany({
  where: {
    // Check metadata.grace_period.end_date <= today
    // AND metadata.grace_period.enforcement_status === 'PENDING'
  }
});

for (const subscription of subscriptions) {
  const gracePeriod = subscription.metadata.grace_period;
  const excess = gracePeriod.excess_count;

  // Get user's store
  const store = await prisma.store.findUnique({
    where: { userId: subscription.userId }
  });

  // Select oldest products to archive
  const productsToArchive = await prisma.product.findMany({
    where: {
      storeId: store.id,
      isArchived: false
    },
    orderBy: { createdAt: 'desc' },  // Newest first
    skip: gracePeriod.target_limit,   // Keep this many
    take: excess                      // Archive these many
  });

  // Archive products
  await prisma.product.updateMany({
    where: {
      id: { in: productsToArchive.map(p => p.id) }
    },
    data: {
      isArchived: true,
      archivedReason: 'plan_downgrade',
      archivedAt: new Date()
    }
  });

  // Update grace period status
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      metadata: {
        ...subscription.metadata,
        grace_period: {
          ...gracePeriod,
          enforcement_status: 'ENFORCED',
          enforced_at: new Date().toISOString()
        }
      }
    }
  });

  // Send email with archived products list
  await sendArchivedProductsEmail(subscription.userId, productsToArchive);

  console.log(`Enforced grace period for user ${subscription.userId}: Archived ${productsToArchive.length} products`);
}
```

**Vercel Cron Configuration**:
```json
{
  "crons": [
    {
      "path": "/api/cron/enforce-grace-period",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

### 3. Grace Period Reminders Cron
**File**: `src/app/api/cron/send-grace-period-reminders/route.ts`

**Schedule**: Daily at 9:00 AM UTC

**Purpose**: Send reminder emails at 7, 3, and 1 days before grace period expiration

**Logic**:
```typescript
const now = new Date();

// Find grace periods expiring in 7, 3, or 1 days
const subscriptions = await prisma.subscription.findMany({
  where: {
    // metadata.grace_period.active === true
    // AND metadata.grace_period.enforcement_status === 'PENDING'
  }
});

for (const subscription of subscriptions) {
  const gracePeriod = subscription.metadata.grace_period;
  const endDate = new Date(gracePeriod.end_date);
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Send email if 7, 3, or 1 days remaining
  if ([7, 3, 1].includes(daysRemaining)) {
    await sendGracePeriodReminderEmail(subscription.userId, {
      daysRemaining,
      excessCount: gracePeriod.excess_count,
      targetLimit: gracePeriod.target_limit
    });

    console.log(`Sent ${daysRemaining}-day reminder to user ${subscription.userId}`);
  }
}
```

---

## Service Integration Points

### 1. Subscription Service
**File**: `src/lib/store-subscription-service.ts`

**Usage Metrics Integration**:

```typescript
/**
 * Check if store is accessible
 * 
 * ADDED: Check usage limits in addition to subscription status
 */
export async function checkStoreAccess(storeId: string) {
  // ... existing subscription checks ...

  // NEW: Check if any usage limits exceeded
  const user = await prisma.user.findUnique({
    where: { id: store.userId },
    include: { subscription: { include: { plan: true } } }
  });

  const usageData = await getAllUsageData(user.id);
  const hasExceededLimit = usageData.some(metric => metric.status === 'exceeded');

  if (hasExceededLimit) {
    return {
      allowed: false,
      reason: 'Usage limit exceeded',
      message: 'Store temporarily restricted. Please upgrade your plan.'
    };
  }

  return { allowed: true };
}
```

---

### 2. Razorpay Service
**File**: `src/lib/razorpay.ts`

**Usage Metrics Integration**: None directly, but webhooks update periods

---

### 3. Email Service
**File**: `src/lib/email-service.ts`

**Usage Metrics Integration**:

```typescript
/**
 * Send usage threshold notification
 */
export async function sendUsageNotification(
  userId: string,
  metric: string,
  level: 'warning' | 'critical' | 'exceeded',
  data: { current: number; limit: number; percentage: number }
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  const templates = {
    warning: {
      subject: `You've used ${Math.round(data.percentage)}% of your ${metric}`,
      body: `Hi ${user.name}, you're approaching your ${metric} limit...`
    },
    critical: {
      subject: `⚠️ Approaching ${metric} Limit`,
      body: `You've used ${data.current} of ${data.limit} ${metric}...`
    },
    exceeded: {
      subject: `🚨 ${metric} Limit Reached`,
      body: `You've reached your plan's limit. Upgrade to continue...`
    }
  };

  await sendEmail({
    to: user.email,
    ...templates[level],
    data
  });
}
```

---

## Summary: Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ USER ACTION: Create Product                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. API ENDPOINT: POST /api/[storeId]/products                   │
├─────────────────────────────────────────────────────────────────┤
│ • Authentication check                                          │
│ • Validation (name, price, etc.)                               │
│ • Pre-check: checkUsageLimit(userId, 'PRODUCTS')               │
│                                                                 │
│   ┌─ IF LIMIT EXCEEDED → Return 403 error ──────┐             │
│   │                        Exit                  │             │
│   └──────────────────────────────────────────────┘             │
│                                                                 │
│ • Create product in transaction:                               │
│   - prisma.product.create()                                    │
│   - prisma.usageRecord.upsert() (increment count)              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. DATABASE: UsageRecord updated                                │
├─────────────────────────────────────────────────────────────────┤
│ • count: 87 → 88 (atomic increment)                            │
│ • updatedAt: [current timestamp]                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. THRESHOLD CHECK: Check if crossed 80%/90%/100%              │
├─────────────────────────────────────────────────────────────────┤
│ • Calculate percentage: 88 / 100 = 88%                         │
│ • Status: 80-90% → WARNING level                               │
│                                                                 │
│   ┌─ IF 80%+ → Send warning email                             │
│   ├─ IF 90%+ → Send critical email                            │
│   └─ IF 100%+ → Send limit exceeded email                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. EMAIL SERVICE: Send notification                            │
├─────────────────────────────────────────────────────────────────┤
│ Subject: "You've used 88% of your products"                    │
│ Body: "You're approaching your limit. Consider upgrading..."   │
│ CTA: [Upgrade Plan]                                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. RESPONSE: Return success                                     │
├─────────────────────────────────────────────────────────────────┤
│ • Product created successfully                                  │
│ • Frontend refreshes product list                              │
│ • Usage card updates: 88/100 (88%)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

**Next Steps**: Choose implementation priority based on business needs:

1. **Critical Path** (Blocks Downgrade Feature):
   - Phase 1: Core infrastructure
   - Phase 2: Real-time tracking
   - Phase 3: Limit enforcement

2. **User Experience** (Can be done in parallel):
   - Phase 4: Dashboard UI
   - Phase 5: Email notifications

3. **Monitoring & Maintenance** (Ongoing):
   - Set up logging
   - Monitor usage patterns
   - Optimize database queries
   - Cache frequently accessed data
