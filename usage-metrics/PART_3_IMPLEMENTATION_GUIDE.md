# PART 3: Practical Implementation Guide - Usage Metrics System

**Document Purpose**: Step-by-step implementation guide for usage metrics tracking and enforcement  
**Date**: November 29, 2025  
**Status**: ✅ IMPLEMENTED (December 1, 2025)

---

## ⚠️ IMPORTANT: Implementation Complete

This document was the original planning guide. **The actual implementation has been completed** using the 4-table architecture from `1.Improvisation.md`.

### Actual Implementation Location

- **Usage Service**: `src/lib/usage-service.ts`
- **Database Schema**: `prisma/schema.prisma` (see UsageCumulative, UsageOrders, UsageApiCalls, UsageHistory)
- **Architecture Reference**: `notes/usage-metrics/1.Improvisation.md`

### Implementation Summary (December 1, 2025)

**Tables Implemented**:
1. `UsageCumulative` - JSON storage for Products, Categories, Billboards, Storage (never resets)
2. `UsageOrders` - Period-based order tracking (resets each billing cycle)
3. `UsageApiCalls` - Period-based API call tracking (high-frequency)
4. `UsageHistory` - Archive of old billing periods

**API Routes Updated**:
- Products: POST (pre-check + increment), DELETE (decrement)
- Categories: POST (pre-check + increment), DELETE (decrement)
- Billboards: POST (pre-check + increment), DELETE (decrement)
- Checkout: Order increment after creation
- Onboarding: Initialize usage tables for new users
- Webhook (subscription.charged): Archive old period, reset for new period

**Key Business Rules**:
- Archived products STILL count toward limit (only DELETE decrements)
- Period resets are tracked to prevent double-reset from duplicate webhooks
- Usage initialization is non-blocking (doesn't fail onboarding)

---

## Original Planning Documentation (Below)

*The following content was the original planning guide. Refer to the actual code for current implementation.*

---

## Table of Contents

1. [Implementation Overview](#implementation-overview)
2. [Phase 1: Core Infrastructure](#phase-1-core-infrastructure)
3. [Phase 2: Real-time Tracking](#phase-2-real-time-tracking)
4. [Phase 3: Limit Enforcement](#phase-3-limit-enforcement)
5. [Phase 4: User Experience](#phase-4-user-experience)
6. [Phase 5: Notifications & Automation](#phase-5-notifications--automation)
7. [Testing Strategy](#testing-strategy)
8. [Rollout Plan](#rollout-plan)

---

## Implementation Overview

### Timeline Estimate

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| Phase 1 | Core infrastructure | 2-3 days | 🔴 Critical |
| Phase 2 | Real-time tracking | 3-4 days | 🔴 Critical |
| Phase 3 | Limit enforcement | 2-3 days | 🔴 Critical |
| Phase 4 | User experience | 3-4 days | 🟡 High |
| Phase 5 | Notifications | 2-3 days | 🟢 Medium |

**Total**: 12-17 days (2.5-3.5 weeks)

### Dependencies

```
Phase 1 (Infrastructure)
    ↓
Phase 2 (Tracking) ← Must complete before Phase 3
    ↓
Phase 3 (Enforcement) ← Blocks downgrade feature
    ↓
Phase 4 (UI) ← Can parallelize with Phase 5
    ↓
Phase 5 (Notifications)
```

### Success Criteria

**Phase 1**:
- ✅ Usage service functions work
- ✅ Period calculation correct
- ✅ Unit tests pass

**Phase 2**:
- ✅ UsageRecord updates on create/delete
- ✅ Count matches database count
- ✅ No double-counting on retries

**Phase 3**:
- ✅ Cannot create product when at limit
- ✅ Clear error message returned
- ✅ Archived products don't count

**Phase 4**:
- ✅ Dashboard shows accurate usage
- ✅ Progress bars display correctly
- ✅ Warnings appear at 80%+

**Phase 5**:
- ✅ Emails sent at thresholds
- ✅ Grace period emails work
- ✅ Cron jobs run correctly

---

## Phase 1: Core Infrastructure

### 1.1 Create Usage Service (`src/lib/usage-service.ts`)

```typescript
/**
 * USAGE METRICS SERVICE
 * 
 * Centralized service for:
 * - Checking usage limits
 * - Incrementing/decrementing counters
 * - Calculating billing periods
 * - Triggering notifications
 */

import prismadb from '@/lib/prismadb';
import { UsageMetricType } from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UsageCheck {
  allowed: boolean;
  current: number;
  limit: number | null;
  percentage: number;
  reason?: string;
}

export interface BillingPeriod {
  periodStart: Date;
  periodEnd: Date;
}

export interface UsageData {
  metricType: UsageMetricType;
  count: number;
  limit: number | null;
  percentage: number;
  status: 'healthy' | 'warning' | 'critical' | 'exceeded';
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Check if user can perform action based on usage limit
 * 
 * @example
 * const check = await checkUsageLimit(userId, 'PRODUCTS');
 * if (!check.allowed) {
 *   return NextResponse.json({ error: check.reason }, { status: 403 });
 * }
 */
export async function checkUsageLimit(
  userId: string,
  metricType: UsageMetricType
): Promise<UsageCheck> {
  try {
    // 1. Get user's subscription and plan
    const user = await prismadb.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    });

    if (!user || !user.subscription) {
      return {
        allowed: false,
        current: 0,
        limit: null,
        percentage: 0,
        reason: 'No active subscription found'
      };
    }

    const plan = user.subscription.plan;

    // 2. Get limit for metric type
    const limit = getMetricLimit(plan, metricType);

    // If no limit (null), unlimited
    if (limit === null) {
      return {
        allowed: true,
        current: 0,
        limit: null,
        percentage: 0
      };
    }

    // 3. Get current usage
    const usage = await getCurrentUsage(userId, metricType, user.subscription);

    // 4. Calculate percentage
    const percentage = (usage / limit) * 100;

    // 5. Check if allowed
    const allowed = usage < limit;

    return {
      allowed,
      current: usage,
      limit,
      percentage,
      reason: allowed ? undefined : `${metricType} limit reached (${usage}/${limit})`
    };

  } catch (error) {
    console.error('[USAGE_SERVICE] Error checking limit:', error);
    // Fail open (allow) to prevent blocking users on errors
    return {
      allowed: true,
      current: 0,
      limit: null,
      percentage: 0,
      reason: 'Error checking limit (allowing by default)'
    };
  }
}

/**
 * Increment usage counter for a metric
 * Should be called AFTER successfully creating resource
 * 
 * @example
 * await incrementUsage(userId, 'PRODUCTS');
 */
export async function incrementUsage(
  userId: string,
  metricType: UsageMetricType,
  amount: number = 1
): Promise<void> {
  try {
    // 1. Get current billing period
    const period = await getCurrentBillingPeriod(userId);

    if (!period) {
      console.error('[USAGE_SERVICE] No billing period found for user:', userId);
      return;
    }

    // 2. Upsert UsageRecord
    await prismadb.usageRecord.upsert({
      where: {
        userId_metricType_periodStart_periodEnd: {
          userId,
          metricType,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd
        }
      },
      update: {
        count: { increment: amount },
        updatedAt: new Date()
      },
      create: {
        userId,
        metricType,
        count: amount,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd
      }
    });

    // 3. Check if threshold crossed (80%, 90%, 100%)
    await checkAndNotifyThresholds(userId, metricType);

    console.log(`[USAGE_SERVICE] Incremented ${metricType} for user ${userId} by ${amount}`);

  } catch (error) {
    console.error('[USAGE_SERVICE] Error incrementing usage:', error);
    // Don't throw - usage tracking shouldn't block operations
  }
}

/**
 * Decrement usage counter for a metric
 * Should be called AFTER successfully deleting/archiving resource
 * 
 * @example
 * await decrementUsage(userId, 'PRODUCTS');
 */
export async function decrementUsage(
  userId: string,
  metricType: UsageMetricType,
  amount: number = 1
): Promise<void> {
  try {
    const period = await getCurrentBillingPeriod(userId);

    if (!period) {
      console.error('[USAGE_SERVICE] No billing period found for user:', userId);
      return;
    }

    // Use update (not upsert) - record should already exist
    await prismadb.usageRecord.updateMany({
      where: {
        userId,
        metricType,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd
      },
      data: {
        count: { decrement: amount },
        updatedAt: new Date()
      }
    });

    console.log(`[USAGE_SERVICE] Decremented ${metricType} for user ${userId} by ${amount}`);

  } catch (error) {
    console.error('[USAGE_SERVICE] Error decrementing usage:', error);
  }
}

/**
 * Get current usage for a metric
 * 
 * @example
 * const current = await getCurrentUsage(userId, 'PRODUCTS', subscription);
 */
export async function getCurrentUsage(
  userId: string,
  metricType: UsageMetricType,
  subscription?: any
): Promise<number> {
  try {
    // For cumulative metrics (PRODUCTS, CATEGORIES, etc), count directly from database
    if (isCumulativeMetric(metricType)) {
      return await getCumulativeUsage(userId, metricType);
    }

    // For per-period metrics (ORDERS, API_CALLS), use UsageRecord
    const period = await getCurrentBillingPeriod(userId, subscription);

    if (!period) {
      return 0;
    }

    const record = await prismadb.usageRecord.findUnique({
      where: {
        userId_metricType_periodStart_periodEnd: {
          userId,
          metricType,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd
        }
      }
    });

    return record?.count || 0;

  } catch (error) {
    console.error('[USAGE_SERVICE] Error getting current usage:', error);
    return 0;
  }
}

/**
 * Get all usage data for user (for dashboard display)
 * 
 * @example
 * const usage = await getAllUsageData(userId);
 */
export async function getAllUsageData(userId: string): Promise<UsageData[]> {
  try {
    const user = await prismadb.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    });

    if (!user || !user.subscription) {
      return [];
    }

    const plan = user.subscription.plan;
    const metrics: UsageMetricType[] = [
      'PRODUCTS',
      'ORDERS',
      'STORAGE_GB',
      'CATEGORIES',
      'BILLBOARDS',
      'API_CALLS'
    ];

    const usageData: UsageData[] = [];

    for (const metric of metrics) {
      const limit = getMetricLimit(plan, metric);
      const current = await getCurrentUsage(userId, metric, user.subscription);
      const percentage = limit ? (current / limit) * 100 : 0;

      let status: UsageData['status'] = 'healthy';
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= 90) status = 'critical';
      else if (percentage >= 70) status = 'warning';

      usageData.push({
        metricType: metric,
        count: current,
        limit,
        percentage,
        status
      });
    }

    return usageData;

  } catch (error) {
    console.error('[USAGE_SERVICE] Error getting all usage data:', error);
    return [];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get limit for a specific metric from plan
 */
function getMetricLimit(plan: any, metricType: UsageMetricType): number | null {
  switch (metricType) {
    case 'PRODUCTS':
      return plan.maxProducts;
    case 'ORDERS':
      return plan.maxOrders;
    case 'STORAGE_GB':
      return plan.maxStorageGB;
    case 'CATEGORIES':
      return plan.additionalLimits?.maxCategories || null;
    case 'BILLBOARDS':
      return plan.additionalLimits?.maxBillboards || null;
    case 'API_CALLS':
      return plan.additionalLimits?.maxApiCallsPerDay || null;
    default:
      return null;
  }
}

/**
 * Check if metric is cumulative (doesn't reset per period)
 */
function isCumulativeMetric(metricType: UsageMetricType): boolean {
  return ['PRODUCTS', 'CATEGORIES', 'BILLBOARDS', 'STORAGE_GB'].includes(metricType);
}

/**
 * Get cumulative usage by counting from database
 */
async function getCumulativeUsage(
  userId: string,
  metricType: UsageMetricType
): Promise<number> {
  const user = await prismadb.user.findUnique({
    where: { id: userId },
    include: { stores: true }
  });

  if (!user || user.stores.length === 0) {
    return 0;
  }

  const storeId = user.stores[0].id;

  switch (metricType) {
    case 'PRODUCTS':
      return await prismadb.product.count({
        where: {
          storeId,
          isArchived: false // Only count active products
        }
      });

    case 'CATEGORIES':
      return await prismadb.category.count({
        where: { storeId }
      });

    case 'BILLBOARDS':
      return await prismadb.billboard.count({
        where: { storeId }
      });

    case 'STORAGE_GB':
      // TODO: Implement storage calculation
      return 0;

    default:
      return 0;
  }
}

/**
 * Get current billing period for user
 */
async function getCurrentBillingPeriod(
  userId: string,
  subscription?: any
): Promise<BillingPeriod | null> {
  try {
    if (!subscription) {
      subscription = await prismadb.subscription.findUnique({
        where: { userId }
      });
    }

    if (!subscription) {
      return null;
    }

    return {
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd
    };

  } catch (error) {
    console.error('[USAGE_SERVICE] Error getting billing period:', error);
    return null;
  }
}

/**
 * Check if usage crossed thresholds and send notifications
 */
async function checkAndNotifyThresholds(
  userId: string,
  metricType: UsageMetricType
): Promise<void> {
  try {
    const check = await checkUsageLimit(userId, metricType);

    // Send notification based on percentage
    if (check.percentage >= 100) {
      await sendUsageNotification(userId, metricType, 'exceeded', check);
    } else if (check.percentage >= 90) {
      await sendUsageNotification(userId, metricType, 'critical', check);
    } else if (check.percentage >= 80) {
      await sendUsageNotification(userId, metricType, 'warning', check);
    }

  } catch (error) {
    console.error('[USAGE_SERVICE] Error checking thresholds:', error);
  }
}

/**
 * Send usage notification email
 * TODO: Implement actual email sending
 */
async function sendUsageNotification(
  userId: string,
  metricType: UsageMetricType,
  level: 'warning' | 'critical' | 'exceeded',
  check: UsageCheck
): Promise<void> {
  console.log(`[USAGE_SERVICE] Would send ${level} notification for ${metricType}:`, check);
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
}

// ============================================================================
// PERIOD MANAGEMENT
// ============================================================================

/**
 * Update billing periods when subscription changes
 * Called from webhook handlers
 */
export async function updateBillingPeriods(
  userId: string,
  newPeriodStart: Date,
  newPeriodEnd: Date
): Promise<void> {
  try {
    // Update existing records to new period
    await prismadb.usageRecord.updateMany({
      where: { userId },
      data: {
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd
      }
    });

    console.log(`[USAGE_SERVICE] Updated billing periods for user ${userId}`);

  } catch (error) {
    console.error('[USAGE_SERVICE] Error updating billing periods:', error);
  }
}

/**
 * Reset per-period metrics (called at start of new billing cycle)
 */
export async function resetPeriodMetrics(userId: string): Promise<void> {
  try {
    const period = await getCurrentBillingPeriod(userId);

    if (!period) {
      return;
    }

    // Reset ORDERS counter
    await prismadb.usageRecord.updateMany({
      where: {
        userId,
        metricType: 'ORDERS',
        periodStart: period.periodStart,
        periodEnd: period.periodEnd
      },
      data: { count: 0 }
    });

    // Reset API_CALLS counter
    await prismadb.usageRecord.updateMany({
      where: {
        userId,
        metricType: 'API_CALLS',
        periodStart: period.periodStart,
        periodEnd: period.periodEnd
      },
      data: { count: 0 }
    });

    console.log(`[USAGE_SERVICE] Reset period metrics for user ${userId}`);

  } catch (error) {
    console.error('[USAGE_SERVICE] Error resetting period metrics:', error);
  }
}
```

### 1.2 Update Onboarding to Use Service

**File**: `src/app/api/onboarding/complete/route.ts`

**Changes**:
```typescript
// Replace manual UsageRecord creation with service
import { updateBillingPeriods } from '@/lib/usage-service';

// After creating subscription:
await updateBillingPeriods(
  userId,
  subscription.currentPeriodStart,
  subscription.currentPeriodEnd
);

// This creates all 6 UsageRecord entries with correct periods
```

### 1.3 Unit Tests

Create `src/lib/__tests__/usage-service.test.ts`:

```typescript
import { checkUsageLimit, incrementUsage, getCurrentUsage } from '../usage-service';

describe('Usage Service', () => {
  it('should allow creation when under limit', async () => {
    const check = await checkUsageLimit('user_123', 'PRODUCTS');
    expect(check.allowed).toBe(true);
  });

  it('should block creation when at limit', async () => {
    // Setup: User has 100/100 products
    const check = await checkUsageLimit('user_123', 'PRODUCTS');
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('limit reached');
  });

  it('should increment usage correctly', async () => {
    const before = await getCurrentUsage('user_123', 'PRODUCTS');
    await incrementUsage('user_123', 'PRODUCTS');
    const after = await getCurrentUsage('user_123', 'PRODUCTS');
    expect(after).toBe(before + 1);
  });
});
```

---

## Phase 2: Real-time Tracking

### 2.1 Products API

**File**: `src/app/api/[storeId]/products/route.ts`

**Add to POST handler**:
```typescript
import { checkUsageLimit, incrementUsage } from '@/lib/usage-service';

export async function POST(req: Request, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { userId } = await auth();
    const body = await req.json();
    const { storeId } = await params;

    // ... existing validation ...

    // ✅ NEW: Check product limit BEFORE creating
    const usageCheck = await checkUsageLimit(userId, 'PRODUCTS');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Product limit reached',
          code: 'USAGE_LIMIT_EXCEEDED',
          current: usageCheck.current,
          limit: usageCheck.limit,
          message: `You've reached your plan's limit of ${usageCheck.limit} products. Upgrade to create more.`
        },
        { status: 403 }
      );
    }

    // Create product + increment usage in transaction
    const product = await prismadb.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name,
          price,
          storeId,
          // ... other fields
        }
      });

      // ✅ NEW: Increment usage counter atomically
      const period = await getCurrentBillingPeriod(userId);
      if (period) {
        await tx.usageRecord.upsert({
          where: {
            userId_metricType_periodStart_periodEnd: {
              userId,
              metricType: 'PRODUCTS',
              ...period
            }
          },
          update: { count: { increment: 1 } },
          create: {
            userId,
            metricType: 'PRODUCTS',
            count: 1,
            ...period
          }
        });
      }

      return newProduct;
    });

    return NextResponse.json(product);

  } catch (error) {
    console.log('[PRODUCTS_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
```

**Add to DELETE handler** (`src/app/api/[storeId]/products/[productId]/route.ts`):
```typescript
import { decrementUsage } from '@/lib/usage-service';

export async function DELETE(req: Request, { params }) {
  try {
    const { userId } = await auth();
    const { storeId, productId } = await params;

    // ... existing validation ...

    const product = await prismadb.product.deleteMany({
      where: {
        id: productId,
        storeId
      }
    });

    // ✅ NEW: Decrement usage counter
    await decrementUsage(userId, 'PRODUCTS');

    return NextResponse.json(product);

  } catch (error) {
    console.log('[PRODUCT_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
```

**Add to PATCH handler (for archiving)**:
```typescript
export async function PATCH(req: Request, { params }) {
  try {
    const { userId } = await auth();
    const body = await req.json();
    const { isArchived } = body;

    // ... existing code ...

    // Check if archiving status changed
    const oldProduct = await prismadb.product.findUnique({
      where: { id: productId }
    });

    const product = await prismadb.product.update({
      where: { id: productId },
      data: {
        // ... other fields
        isArchived
      }
    });

    // ✅ NEW: Update usage if archived status changed
    if (oldProduct && oldProduct.isArchived !== isArchived) {
      if (isArchived) {
        // Product archived → decrement
        await decrementUsage(userId, 'PRODUCTS');
      } else {
        // Product unarchived → increment
        await incrementUsage(userId, 'PRODUCTS');
      }
    }

    return NextResponse.json(product);

  } catch (error) {
    console.log('[PRODUCT_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
```

### 2.2 Orders API

**File**: `src/app/api/[storeId]/checkout/route.ts`

**Add after order creation**:
```typescript
import { incrementUsage } from '@/lib/usage-service';

// After creating order
const order = await prismadb.$transaction(async (tx) => {
  // ... existing order creation ...

  return await tx.order.create({
    data: {
      storeId,
      // ... order fields
    }
  });
});

// ✅ NEW: Increment orders counter
await incrementUsage(user.id, 'ORDERS');

return NextResponse.json(order);
```

### 2.3 Categories API

**File**: `src/app/api/[storeId]/categories/route.ts`

**Add limit check and tracking**:
```typescript
import { checkUsageLimit, incrementUsage } from '@/lib/usage-service';

export async function POST(req: Request, { params }) {
  try {
    const { userId } = await auth();
    const body = await req.json();
    const { name, billboardIds } = body;
    const { storeId } = await params;

    // ✅ NEW: Check category limit
    const usageCheck = await checkUsageLimit(userId, 'CATEGORIES');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Category limit reached',
          code: 'USAGE_LIMIT_EXCEEDED',
          limit: usageCheck.limit,
          message: `You've reached your plan's limit of ${usageCheck.limit} categories.`
        },
        { status: 403 }
      );
    }

    // ... existing code ...

    const category = await prismadb.category.create({
      data: { name, storeId }
    });

    // ✅ NEW: Increment categories counter
    await incrementUsage(userId, 'CATEGORIES');

    // ... rest of code ...

    return NextResponse.json(category);
  } catch (error) {
    console.log('[CATEGORIES_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
```

### 2.4 Billboards API

**File**: `src/app/api/[storeId]/billboards/route.ts`

```typescript
import { checkUsageLimit, incrementUsage } from '@/lib/usage-service';

export async function POST(req: Request, { params }) {
  try {
    const { userId } = await auth();
    const body = await req.json();
    const { label, imageUrl } = body;
    const { storeId } = await params;

    // ✅ NEW: Check billboard limit
    const usageCheck = await checkUsageLimit(userId, 'BILLBOARDS');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Billboard limit reached',
          code: 'USAGE_LIMIT_EXCEEDED',
          limit: usageCheck.limit,
          message: `You've reached your plan's limit of ${usageCheck.limit} billboards.`
        },
        { status: 403 }
      );
    }

    const billboard = await prismadb.billboard.create({
      data: { label, imageUrl, storeId }
    });

    // ✅ NEW: Increment billboards counter
    await incrementUsage(userId, 'BILLBOARDS');

    return NextResponse.json(billboard);
  } catch (error) {
    console.log('[BILLBOARDS_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
```

---

## Phase 3: Limit Enforcement

### 3.1 Error Response Schema

Create consistent error responses across all APIs:

```typescript
// src/lib/api-errors.ts
export const API_ERRORS = {
  USAGE_LIMIT_EXCEEDED: {
    code: 'USAGE_LIMIT_EXCEEDED',
    status: 403,
    title: 'Limit Reached',
    getmessage: (metric: string, limit: number) =>
      `You've reached your plan's limit of ${limit} ${metric.toLowerCase()}. Upgrade to create more.`,
    action: 'UPGRADE_REQUIRED'
  },
  // ... other errors
};

export function createLimitError(
  metric: string,
  current: number,
  limit: number
) {
  return {
    error: 'Limit reached',
    code: 'USAGE_LIMIT_EXCEEDED',
    metric,
    current,
    limit,
    message: `You've used ${current} of ${limit} ${metric.toLowerCase()}. Upgrade to increase this limit.`,
    action: 'UPGRADE_REQUIRED',
    upgradeUrl: '/subscription/plans'
  };
}
```

### 3.2 Frontend Error Handling

**File**: `src/components/error-handler.tsx`

```tsx
export function handleApiError(error: any) {
  if (error.code === 'USAGE_LIMIT_EXCEEDED') {
    toast.error(error.message, {
      action: {
        label: 'Upgrade Plan',
        onClick: () => router.push('/subscription/plans')
      },
      duration: 10000 // Show for 10 seconds
    });
    return;
  }

  // Handle other errors...
}
```

---

## Phase 4: User Experience

### 4.1 Usage Dashboard Card

**File**: `src/components/subscription/usage-card.tsx`

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp } from 'lucide-react';

interface UsageMetric {
  name: string;
  current: number;
  limit: number | null;
  unit?: string;
  period?: string;
}

interface UsageCardProps {
  metrics: UsageMetric[];
}

export function UsageCard({ metrics }: UsageCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage & Limits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics.map((metric) => (
          <UsageMetricRow key={metric.name} metric={metric} />
        ))}
      </CardContent>
    </Card>
  );
}

function UsageMetricRow({ metric }: { metric: UsageMetric }) {
  const { name, current, limit, unit, period } = metric;

  // Calculate percentage
  const percentage = limit ? (current / limit) * 100 : 0;
  const isUnlimited = limit === null;

  // Determine status color
  const getStatusColor = () => {
    if (isUnlimited) return 'text-gray-500';
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 90) return 'text-orange-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = () => {
    if (isUnlimited) return 'bg-gray-400';
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 90) return 'bg-orange-600';
    if (percentage >= 70) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{name}</span>
          {period && (
            <span className="text-xs text-gray-500">({period})</span>
          )}
        </div>
        <div className={`text-sm font-medium ${getStatusColor()}`}>
          {current} {unit || ''}
          {!isUnlimited && ` / ${limit} ${unit || ''}`}
          {isUnlimited && ' (Unlimited)'}
        </div>
      </div>

      {!isUnlimited && (
        <>
          <Progress
            value={Math.min(percentage, 100)}
            className="h-2"
            indicatorClassName={getProgressColor()}
          />

          {percentage >= 90 && (
            <div className="flex items-center gap-2 text-xs text-orange-600">
              <AlertCircle className="h-3 w-3" />
              <span>
                {percentage >= 100
                  ? 'Limit reached - Upgrade to continue'
                  : `${Math.round(100 - percentage)}% remaining`}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

### 4.2 Usage Page

**File**: `src/app/(dashboard)/subscription/my-plan/page.tsx`

```tsx
import { getAllUsageData } from '@/lib/usage-service';
import { UsageCard } from '@/components/subscription/usage-card';

export default async function MyPlanPage() {
  const { userId } = await auth();
  const usageData = await getAllUsageData(userId);

  const metrics = usageData.map((data) => ({
    name: data.metricType,
    current: data.count,
    limit: data.limit,
    unit: data.metricType === 'STORAGE_GB' ? 'GB' : '',
    period: data.metricType === 'ORDERS' ? 'This month' : undefined
  }));

  return (
    <div className="space-y-6">
      <UsageCard metrics={metrics} />
      {/* ... rest of page ... */}
    </div>
  );
}
```

### 4.3 Create Product Page Header

**File**: `src/app/(dashboard)/[storeId]/(routes)/products/page.tsx`

```tsx
import { checkUsageLimit } from '@/lib/usage-service';

export default async function ProductsPage({ params }: { params: { storeId: string } }) {
  const { userId } = await auth();
  const usageCheck = await checkUsageLimit(userId, 'PRODUCTS');

  return (
    <div className="space-y-4">
      {/* Header with usage */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-sm text-gray-500">
            {usageCheck.current} / {usageCheck.limit || '∞'} products used
            {usageCheck.limit && ` (${Math.round(usageCheck.percentage)}%)`}
          </p>
        </div>

        <Button
          onClick={() => router.push(`/${storeId}/products/new`)}
          disabled={!usageCheck.allowed}
        >
          {usageCheck.allowed ? 'Add Product' : 'Limit Reached'}
        </Button>
      </div>

      {/* Warning banner */}
      {usageCheck.percentage >= 90 && (
        <Alert variant={usageCheck.percentage >= 100 ? 'destructive' : 'warning'}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {usageCheck.percentage >= 100 ? 'Product Limit Reached' : 'Approaching Limit'}
          </AlertTitle>
          <AlertDescription>
            {usageCheck.percentage >= 100
              ? `You've reached your plan's limit of ${usageCheck.limit} products. Upgrade to create more.`
              : `You've used ${Math.round(usageCheck.percentage)}% of your product limit.`}
          </AlertDescription>
          <Button size="sm" variant="outline" className="mt-2">
            Upgrade Plan
          </Button>
        </Alert>
      )}

      {/* Products list */}
      {/* ... rest of page ... */}
    </div>
  );
}
```

---

## Phase 5: Notifications & Automation

### 5.1 Email Templates

Create email templates for usage notifications:

**File**: `src/lib/email-templates/usage-warning.tsx`

```tsx
export function UsageWarningEmail({
  userName,
  metricName,
  current,
  limit,
  percentage
}: {
  userName: string;
  metricName: string;
  current: number;
  limit: number;
  percentage: number;
}) {
  return (
    <div>
      <h1>Hi {userName},</h1>
      <p>
        You've used <strong>{current} of {limit}</strong> {metricName.toLowerCase()} ({percentage}%).
      </p>
      <p>
        Consider upgrading your plan to increase your limits and unlock more features.
      </p>
      <a href={`${process.env.NEXT_PUBLIC_APP_URL}/subscription/plans`}>
        View Plans →
      </a>
    </div>
  );
}
```

### 5.2 Notification Service

**File**: `src/lib/notification-service.ts`

```typescript
import { sendEmail } from '@/lib/email-service';

export async function sendUsageThresholdNotification(
  userId: string,
  metricType: string,
  level: 'warning' | 'critical' | 'exceeded',
  data: { current: number; limit: number; percentage: number }
) {
  const user = await prismadb.user.findUnique({
    where: { id: userId }
  });

  if (!user) return;

  const subject =
    level === 'exceeded'
      ? `🚨 ${metricType} Limit Reached`
      : level === 'critical'
      ? `⚠️ Approaching ${metricType} Limit`
      : `You've used ${Math.round(data.percentage)}% of your ${metricType}`;

  await sendEmail({
    to: user.email,
    subject,
    template: 'usage-warning',
    data: {
      userName: user.name || 'there',
      metricName: metricType,
      ...data
    }
  });
}
```

### 5.3 Cron Job: Period Reset

**File**: `src/app/api/cron/reset-period-usage/route.ts`

```typescript
import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';
import { resetPeriodMetrics } from '@/lib/usage-service';

/**
 * Cron job: Reset per-period metrics when new billing cycle starts
 * Run: Daily at midnight
 */
export async function GET(req: Request) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Find subscriptions that started new period today
    const now = new Date();
    const subscriptions = await prismadb.subscription.findMany({
      where: {
        currentPeriodStart: {
          gte: new Date(now.setHours(0, 0, 0, 0)),
          lt: new Date(now.setHours(23, 59, 59, 999))
        }
      }
    });

    let resetCount = 0;

    for (const subscription of subscriptions) {
      await resetPeriodMetrics(subscription.userId);
      resetCount++;
    }

    console.log(`[CRON] Reset period metrics for ${resetCount} users`);

    return NextResponse.json({
      success: true,
      resetCount
    });

  } catch (error) {
    console.error('[CRON] Error resetting period metrics:', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// Test usage service functions
✅ checkUsageLimit - allows when under limit
✅ checkUsageLimit - blocks when at limit
✅ incrementUsage - increases count
✅ decrementUsage - decreases count
✅ getCurrentUsage - returns correct count
✅ getAllUsageData - returns all metrics
```

### Integration Tests
```typescript
// Test API endpoints
✅ POST /products - blocks when at limit
✅ POST /products - increments usage on create
✅ DELETE /products - decrements usage on delete
✅ PATCH /products - handles archiving correctly
✅ POST /checkout - increments orders count
```

### E2E Tests
```typescript
// Test user workflows
✅ Create 100 products → Hit limit → See error
✅ Archive 10 products → Can create 10 more
✅ Upgrade plan → Limits increase
✅ Downgrade plan → Grace period activates
```

---

## Rollout Plan

### Week 1: Infrastructure & Tracking
- Day 1-2: Build usage service
- Day 3-4: Add tracking to products API
- Day 5: Add tracking to other APIs (orders, categories, billboards)

### Week 2: Enforcement & UI
- Day 6-7: Add limit enforcement
- Day 8-9: Build usage dashboard components
- Day 10: Integration testing

### Week 3: Polish & Notifications
- Day 11-12: Email notifications
- Day 13: Cron jobs
- Day 14-15: E2E testing, bug fixes
- Day 16: Production deployment

---

**Next Document**: [PART 4: Maintenance & Monitoring](./PART_4_MAINTENANCE.md)
