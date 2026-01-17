# PART 1: Current State Analysis - Usage Metrics in ShopPulse Admin

**Document Purpose**: Analyze the current state of usage metrics tracking and enforcement  
**Date**: November 29, 2025  
**Status**: Analysis Complete ✅

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Database Schema Analysis](#database-schema-analysis)
3. [Current Implementation](#current-implementation)
4. [What's Missing](#whats-missing)
5. [Critical Findings](#critical-findings)

---

## Executive Summary

### 🎯 Current Status

**Infrastructure**: ✅ READY  
**Implementation**: ❌ NOT STARTED  
**Enforcement**: ❌ NOT IMPLEMENTED

### Quick Overview

| Component                | Status     | Notes                                |
| ------------------------ | ---------- | ------------------------------------ |
| UsageRecord Model        | ✅ Exists  | Comprehensive schema ready           |
| UsageMetricType Enum     | ✅ Defined | 6 metric types available             |
| Subscription Plan Limits | ✅ Defined | maxProducts, maxOrders, maxStorageGB |
| Initial Usage Records    | ✅ Created | 6 records created during onboarding  |
| Real-time Tracking       | ❌ Missing | No updates on resource creation      |
| Limit Enforcement        | ❌ Missing | No checks before creating resources  |
| Usage Display            | ⚠️ Partial | Frontend queries but no data         |
| Period-based Tracking    | ❌ Missing | No billing period association        |

---

## Database Schema Analysis

### 1. UsageRecord Model (Lines 462-478 in schema.prisma)

```prisma
model UsageRecord {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  metricType UsageMetricType  // What metric is being tracked?

  count Int @default(0)  // How much is being used?

  periodStart DateTime  // Billing period start
  periodEnd   DateTime  // Billing period end

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, metricType, periodStart, periodEnd])
  @@index([userId])
  @@index([metricType])
}
```

**Key Features**:

- ✅ Tracks usage per user
- ✅ Period-based tracking (can track daily, monthly, yearly)
- ✅ Unique constraint prevents duplicates
- ✅ Cascade delete when user deleted
- ✅ Indexed for performance

### 2. UsageMetricType Enum (Lines 524-530 in schema.prisma)

```prisma
enum UsageMetricType {
  PRODUCTS      // Total products created
  ORDERS        // Total orders received
  STORAGE_GB    // Storage used in GB
  CATEGORIES    // Total categories
  BILLBOARDS    // Total billboards
  API_CALLS     // API calls (important for frontend usage tracking)
}
```

**Coverage Analysis**:
| Metric | Purpose | Current Tracking |
|--------|---------|------------------|
| PRODUCTS | Core product creation | ❌ Not tracked |
| ORDERS | Customer orders | ❌ Not tracked |
| STORAGE_GB | Image/file storage | ❌ Not tracked |
| CATEGORIES | Category management | ❌ Not tracked |
| BILLBOARDS | Billboard management | ❌ Not tracked |
| API_CALLS | Frontend API usage | ❌ Not tracked |

### 3. SubscriptionPlan Limits (Lines 362-365 in schema.prisma)

```prisma
model SubscriptionPlan {
  // ... other fields ...

  // Feature Limits (null = unlimited)
  maxProducts  Int? @default(100)
  maxOrders    Int? @default(1000)
  maxStorageGB Int? @default(5)

  additionalLimits Json? // { "maxCategories": 50, "maxBillboards": 20 }

  // ... other fields ...
}
```

**Limit Structure**:

- ✅ `maxProducts`: Direct column (enforced limit)
- ✅ `maxOrders`: Direct column (enforced limit)
- ✅ `maxStorageGB`: Direct column (enforced limit)
- ✅ `additionalLimits`: JSON field for extended limits
  ```json
  {
    "maxCategories": 50,
    "maxBillboards": 20,
    "maxSizes": 30
  }
  ```

---

## Current Implementation

### 1. Initial Creation (✅ Working)

**Location**: `src/app/api/onboarding/complete/route.ts` (Lines 213-239)

```typescript
// Creates 6 initial UsageRecord entries during onboarding
const usageMetrics = [
  { type: 'PRODUCTS', value: 0 },
  { type: 'ORDERS', value: 0 },
  { type: 'STORAGE_GB', value: 0 },
  { type: 'CATEGORIES', value: 0 },
  { type: 'BILLBOARDS', value: 0 },
  { type: 'API_CALLS', value: 0 },
];

await Promise.all(
  usageMetrics.map((metric) =>
    tx.usageRecord.create({
      data: {
        userId: userId,
        metricType: metric.type,
        count: metric.value,
        periodStart: now,
        periodEnd: trialEndDate,
      },
    })
  )
);
```

**Status**: ✅ Works perfectly

- Creates all 6 metric records
- Associates with trial period (7 days)
- Initializes count to 0

### 2. Frontend Display (⚠️ Queries But Gets Stale Data)

**Location**: `src/app/(dashboard)/subscription/my-plan/page.tsx` (Line 46)

```typescript
const user = await prismadb.user.findUnique({
  where: { id: userId },
  include: {
    stores: { include: { products: true, orders: true } },
    subscription: {
      include: {
        plan: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    },
    usageRecords: {
      // ✅ Queries usage records
      where: {
        periodStart: { lte: new Date() },
        periodEnd: { gte: new Date() },
      },
    },
  },
});
```

**Problem**:

- ✅ Query structure is correct
- ❌ Data is always `count: 0` (never updated)
- ❌ `periodEnd` for trial users is 7 days old → query returns no results

### 3. Webhook Integration (✅ Reads, ❌ Doesn't Update)

**Location**: `src/app/api/webhook/razorpay/subscription/handlers/updated.ts` (Lines 35-77)

```typescript
// Reads usage to check for grace period after downgrade
const usage = {
  productsUsed: productsCount,
  productsLimit: newPlan.maxProducts || 0,
  ordersLimit: newPlan.maxOrders || 0,
};

const willExceedLimits =
  newPlan.maxProducts !== null && usage.productsUsed > newPlan.maxProducts;

if (willExceedLimits) {
  // Activates grace period
  gracePeriod = {
    active: true,
    start_date: now.toISOString(),
    end_date: gracePeriodEnd.toISOString(),
    current_usage: usage.productsUsed,
    target_limit: newPlan.maxProducts,
    excess_count: usage.productsUsed - (newPlan.maxProducts || 0),
    // ... more fields
  };
}
```

**Status**: ⚠️ Partial Implementation

- ✅ Reads product count directly from database
- ✅ Compares against plan limits
- ✅ Activates grace period if over limit
- ❌ Doesn't use UsageRecord at all
- ❌ Doesn't update UsageRecord after plan change

---

## What's Missing

### 1. ❌ Real-time Tracking on Resource Creation

**Current Behavior**: When user creates a product, no UsageRecord update happens.

**Missing Implementations**:

| Resource  | API Route                        | Current Behavior                           | Should Update       |
| --------- | -------------------------------- | ------------------------------------------ | ------------------- |
| Product   | `POST /api/[storeId]/products`   | ✅ Creates product<br>❌ No usage update   | `PRODUCTS` metric   |
| Order     | `POST /api/[storeId]/checkout`   | ✅ Creates order<br>❌ No usage update     | `ORDERS` metric     |
| Billboard | `POST /api/[storeId]/billboards` | ✅ Creates billboard<br>❌ No usage update | `BILLBOARDS` metric |
| Category  | `POST /api/[storeId]/categories` | ✅ Creates category<br>❌ No usage update  | `CATEGORIES` metric |
| Size      | `POST /api/[storeId]/sizes`      | ✅ Creates size<br>❌ No usage update      | `additionalLimits`  |

**Example - Products Route** (`src/app/api/[storeId]/products/route.ts`):

```typescript
// Line 157: Product created
const product = await prismadb.product.create({
  data: {
    name,
    price,
    storeId,
    categoryId,
    // ... other fields
  },
});

// ❌ MISSING: Should increment UsageRecord here
// await incrementUsageRecord(userId, 'PRODUCTS');

return NextResponse.json(product);
```

### 2. ❌ Real-time Tracking on Resource Deletion

**Missing Implementations**:

| Resource  | API Route                                        | Current Behavior                           | Should Update          |
| --------- | ------------------------------------------------ | ------------------------------------------ | ---------------------- |
| Product   | `DELETE /api/[storeId]/products/[productId]`     | ✅ Deletes product<br>❌ No usage update   | Decrement `PRODUCTS`   |
| Billboard | `DELETE /api/[storeId]/billboards/[billboardId]` | ✅ Deletes billboard<br>❌ No usage update | Decrement `BILLBOARDS` |
| Category  | `DELETE /api/[storeId]/categories/[categoryId]`  | ✅ Deletes category<br>❌ No usage update  | Decrement `CATEGORIES` |

**Example - Product Deletion** (`src/app/api/[storeId]/products/[productId]/route.ts`):

```typescript
// Line 262: Product deleted
const product = await prismadb.product.deleteMany({
  where: {
    id: productId,
    storeId,
  },
});

// ❌ MISSING: Should decrement UsageRecord here
// await decrementUsageRecord(userId, 'PRODUCTS');

return NextResponse.json(product);
```

### 3. ❌ Limit Enforcement Before Creation

**Current Behavior**: No checks before creating resources. User can exceed plan limits.

**Test Case**:

```
User Plan: Monthly (100 products limit)
Current Products: 100
User tries to create product #101
Current: ✅ Allowed (no check)
Should: ❌ Blocked with error "Product limit reached. Upgrade your plan."
```

**Missing in ALL Creation Routes**:

```typescript
export async function POST(req: Request, { params }) {
  // ... authentication ...
  // ❌ MISSING: Check if user can create more products
  // const canCreate = await checkUsageLimit(userId, 'PRODUCTS');
  // if (!canCreate) {
  //   return new NextResponse('Product limit reached', { status: 403 });
  // }
  // Create product...
}
```

### 4. ❌ Period-based Tracking

**Current Problem**: Trial period records created with `periodEnd` = 7 days from signup.

**What Happens**:

```
Day 0: Trial starts
  periodStart: Nov 1, 2025 00:00
  periodEnd: Nov 8, 2025 23:59

Day 8: User subscribes to Monthly plan
  ❌ Old records still have periodEnd = Nov 8 (expired)
  ❌ Frontend query filters by current date → No results
  ❌ Usage shows as 0/100 even though user has 50 products
```

**Missing**: Update period when subscription changes

```typescript
// When user subscribes to Monthly plan
await prismadb.usageRecord.updateMany({
  where: { userId },
  data: {
    periodStart: subscriptionStart,
    periodEnd: subscriptionEnd,
  },
});
```

### 5. ❌ Storage Calculation

**Current State**: `STORAGE_GB` metric exists but never calculated.

**Missing Implementation**:

- No tracking of image upload sizes
- No aggregation of total storage
- No periodic calculation (cron job)

**Should Track**:

```typescript
// When image uploaded
await incrementStorage(userId, imageSizeInBytes);

// Cron job: Daily storage calculation
async function calculateStorageUsage(userId: string) {
  const images = await prisma.image.findMany({
    where: { product: { store: { userId } } },
  });

  const totalBytes = images.reduce((sum, img) => sum + img.size, 0);
  const totalGB = totalBytes / (1024 * 1024 * 1024);

  await updateUsageRecord(userId, 'STORAGE_GB', Math.ceil(totalGB));
}
```

### 6. ❌ Orders Per Period Tracking

**Critical Issue**: Orders should be tracked PER BILLING PERIOD, not cumulative.

**Why?**

```
Monthly Plan: 1000 orders/month limit

Current (Wrong ❌):
  Month 1: 800 orders → Total: 800 (OK)
  Month 2: 800 orders → Total: 1600 (BLOCKS USER!)
  User can't receive more orders even though new period started

Correct (✅):
  Month 1: 800 orders → Period: 800/1000 (OK)
  Month 2: 800 orders → Period: 800/1000 (OK, new period)
  Each billing period has separate counter
```

**Missing**: Reset orders count at period start

```typescript
// When new billing period starts (webhook or cron)
await prismadb.usageRecord.update({
  where: {
    userId_metricType_periodStart_periodEnd: {
      userId,
      metricType: 'ORDERS',
      periodStart: oldPeriodStart,
      periodEnd: oldPeriodEnd,
    },
  },
  data: {
    periodStart: newPeriodStart,
    periodEnd: newPeriodEnd,
    count: 0, // Reset to 0 for new period
  },
});
```

---

## Critical Findings

### 🔴 High Priority Issues

#### 1. Zero Enforcement = Unlimited Access

**Impact**: Users can exceed plan limits indefinitely

- No checks before creating products
- No warnings when approaching limit
- No blocking when limit reached

**Business Risk**: HIGH

- Users getting more than they pay for
- Can't upsell based on usage
- No incentive to upgrade

#### 2. Stale Usage Data

**Impact**: Frontend shows 0/100 products even when user has 50 products

- UsageRecord never updated after initial creation
- Period dates don't sync with subscription changes
- Users see incorrect usage information

**Business Risk**: MEDIUM

- Poor user experience
- Can't make informed upgrade decisions
- Support tickets about "incorrect" usage display

#### 3. Orders Tracking Broken for Long-term Users

**Impact**: After first billing period, orders counter never resets

- Month 2 onwards: Counter keeps growing
- Eventually hits limit (e.g., 1000 orders)
- User blocked from receiving more orders

**Business Risk**: CRITICAL

- Users can't receive orders (lost revenue for them)
- Churn risk (users will leave platform)
- Legal issues (paid for service but can't use it)

### 🟡 Medium Priority Issues

#### 4. No Usage-based Insights

**Impact**: Can't show usage trends to users

- No monthly comparison
- No growth analytics
- Can't predict when user will need upgrade

**Business Risk**: LOW

- Missed upsell opportunities
- Poor product experience

#### 5. Storage Not Tracked

**Impact**: Storage metric exists but unused

- Can't enforce storage limits
- Can't charge for storage overages (future feature)

**Business Risk**: LOW (can implement later)

### 🟢 Low Priority Issues

#### 6. API Calls Not Tracked

**Impact**: Can't limit API usage from store frontend

- No protection from abuse
- Can't offer API-based pricing tiers

**Business Risk**: LOW (nice-to-have)

---

## Summary

### What Works ✅

1. Database schema is comprehensive and well-designed
2. Initial UsageRecord creation during onboarding
3. Frontend queries usage records (structure correct)
4. Webhook reads usage for grace period detection

### What's Broken ❌

1. **No real-time updates** when resources created/deleted
2. **No limit enforcement** before allowing actions
3. **Period-based tracking not working** (stale periods)
4. **Orders counter never resets** (cumulative instead of per-period)
5. **Storage not calculated** at all
6. **Archived products still counted** as active

### Critical Blockers for Downgrade 🚨

- **Usage tracking MUST work** for grace period emails
  - Email needs to say "You have 90 products, new limit is 50"
  - Can't send that email if usage shows 0
- **Period-based tracking MUST work** for accurate enforcement
  - Grace period auto-archives oldest products
  - Need accurate count to know which 40 to archive

### Recommended Action Plan

See **PART 2: Implementation Roadmap** for detailed steps.

---

**Next Document**: [PART 2: Industry Standards & Best Practices](./PART_2_INDUSTRY_STANDARDS.md)
