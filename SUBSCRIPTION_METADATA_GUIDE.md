# Subscription Metadata Structure Guide

## Overview

The `metadata` field in the Subscription model is a JSON field that stores critical information about subscription lifecycle, plan changes, grace periods, and Razorpay synchronization. This guide ensures consistent usage across the entire application.

**TypeScript Types Location**: `src/lib/subscription-metadata.ts`

---

## ⚠️ Critical Rules

1. **ALWAYS import types from `subscription-metadata.ts`**
2. **NEVER create random fields** - all fields must be defined in the types
3. **USE helper functions** - don't manually construct metadata objects
4. **VALIDATE before saving** - use `validateSubscriptionMetadata()`
5. **PRESERVE existing data** - use `mergeSubscriptionMetadata()` for updates

---

## Root Structure

```typescript
interface SubscriptionMetadata {
  subscription_changes?: SubscriptionChanges;
  lifecycle?: LifecycleMetadata;
  grace_period?: GracePeriodMetadata;
  razorpay?: RazorpayMetadata;
  
  // User-initiated upgrade tracking (temporary)
  lastUpgradeAttempt?: string;
  numberOfUpgradeAttempts?: number;
  upgradeMethod?: 'UPDATE_API' | 'WEBHOOK_UPDATE_API';
  targetPlanId?: string;
  targetPlanName?: string;
  upgradeInitiatedBy?: string;
}
```

---

## 1. Subscription Changes

**Purpose**: Track all plan upgrades and downgrades  
**Location**: `metadata.subscription_changes`

### Structure

```typescript
{
  upgrades: PlanChangeRecord[];  // Last 50 upgrades
  downgrades: PlanChangeRecord[]; // Last 50 downgrades
}
```

### Plan Change Record

```typescript
{
  attempted_at: "2024-03-15T10:30:00.000Z",
  method: "WEBHOOK_UPDATE_API" | "UPDATE_API",
  from_plan_id: "plan_old",
  to_plan_id: "plan_new",
  from_price: 999,
  to_price: 1999,
  reason: "WEBHOOK_APPLIED" | "USER_INITIATED" | "ADMIN_CHANGED",
  success: true,
  error: null,
  applied_at: "2024-03-15T10:30:05.000Z",
  razorpay_response_time_ms: 150
}
```

### Usage Example

```typescript
import { addPlanChangeRecord, PlanChangeRecord } from '@/lib/subscription-metadata';

// In webhook handler (subscription.updated)
const changeRecord: PlanChangeRecord = {
  attempted_at: new Date().toISOString(),
  method: 'WEBHOOK_UPDATE_API',
  from_plan_id: subscription.planId,
  to_plan_id: newPlan.id,
  from_price: oldPlan.price,
  to_price: newPlan.price,
  reason: 'WEBHOOK_APPLIED',
  success: true,
  error: null,
  applied_at: new Date().toISOString(),
  razorpay_response_time_ms: Date.now() - startTime
};

const updatedMetadata = addPlanChangeRecord(
  subscription.metadata,
  changeRecord,
  isUpgrade ? 'upgrade' : 'downgrade'
);

await prisma.subscription.update({
  where: { id: subscription.id },
  data: { metadata: updatedMetadata }
});
```

### Where It's Used

- ✅ `handlers/updated.ts` - Records upgrades/downgrades
- ✅ `api/subscription/upgrade/execute/route.ts` - Tracks upgrade attempts
- ✅ `api/subscription/history/route.ts` - Displays change history

---

## 2. Lifecycle Metadata

**Purpose**: Track important subscription lifecycle events  
**Location**: `metadata.lifecycle`

### Structure

```typescript
{
  last_successful_payment_at?: "2024-03-15T10:30:00.000Z",
  first_payment_at?: "2024-01-01T00:00:00.000Z",
  trial_started_at?: "2024-01-01T00:00:00.000Z",
  trial_ended_at?: "2024-01-15T00:00:00.000Z",
  cancelled_at?: "2024-06-01T00:00:00.000Z",
  cancellation_reason?: "User requested cancellation"
}
```

### Usage Example

```typescript
import { mergeSubscriptionMetadata } from '@/lib/subscription-metadata';

// In charged webhook handler
const updatedMetadata = mergeSubscriptionMetadata(
  subscription.metadata,
  {
    lifecycle: {
      last_successful_payment_at: new Date().toISOString(),
      first_payment_at: subscription.metadata?.lifecycle?.first_payment_at 
        || new Date().toISOString()
    }
  }
);
```

### Where It's Used

- ✅ `handlers/charged.ts` - Updates `last_successful_payment_at`
- ✅ `handlers/cancelled.ts` - Records cancellation time and reason
- ✅ `onboarding/complete/route.ts` - Sets trial dates

---

## 3. Grace Period

**Purpose**: Give users time to reduce usage after downgrading to a plan with lower limits  
**Location**: `metadata.grace_period`

### Structure

```typescript
{
  active: true,
  start_date: "2024-03-15T10:30:00.000Z",
  end_date: "2024-03-29T10:30:00.000Z", // 14 days later
  current_usage: 150, // Products count at downgrade
  target_limit: 100, // New plan's limit
  excess_count: 50, // 150 - 100 = 50 over limit
  reminder_emails_sent: [
    "2024-03-18T10:30:00.000Z", // Day 3 reminder
    "2024-03-22T10:30:00.000Z", // Day 7 reminder
    "2024-03-26T10:30:00.000Z"  // Day 11 reminder
  ],
  enforcement_date: "2024-03-29T10:30:00.000Z",
  enforcement_status: "PENDING" | "ENFORCED" | "RESOLVED"
}
```

### Usage Example

```typescript
import { setGracePeriodMetadata, GracePeriodMetadata } from '@/lib/subscription-metadata';

// In downgrade handler when usage exceeds new limit
const gracePeriod: GracePeriodMetadata = {
  active: true,
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  current_usage: currentProductCount,
  target_limit: newPlan.productLimit,
  excess_count: currentProductCount - newPlan.productLimit,
  reminder_emails_sent: [],
  enforcement_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  enforcement_status: 'PENDING'
};

const updatedMetadata = setGracePeriodMetadata(
  subscription.metadata,
  gracePeriod
);
```

### Enforcement Flow

1. **Day 0**: Downgrade occurs, grace period starts
2. **Day 3**: First reminder email sent
3. **Day 7**: Second reminder email sent
4. **Day 11**: Final warning email sent
5. **Day 14**: Enforcement - disable product creation

### Where It's Used

- ✅ `handlers/updated.ts` - Creates grace period on downgrade
- ✅ `api/products/create/route.ts` - Checks grace period before allowing creation
- ✅ `cron/grace-period-enforcer/route.ts` - Sends reminder emails and enforces limits

---

## 4. Razorpay Metadata

**Purpose**: Track Razorpay synchronization and webhook events  
**Location**: `metadata.razorpay`

### Structure

```typescript
{
  last_sync: "2024-03-15T10:30:00.000Z",
  sync_status: "SUCCESS" | "FAILED" | "PENDING",
  webhooks_received: 42, // Total count
  pending_update: false,
  pending_update_plan_id: null,
  pending_update_scheduled_for: null,
  last_webhook_event?: "subscription.charged",
  last_webhook_at?: "2024-03-15T10:30:00.000Z"
}
```

### Usage Example

```typescript
import { updateRazorpaySyncMetadata } from '@/lib/subscription-metadata';

// In any webhook handler
const updatedMetadata = updateRazorpaySyncMetadata(
  subscription.metadata,
  {
    last_sync: new Date().toISOString(),
    sync_status: 'SUCCESS',
    last_webhook_event: event.event, // e.g., 'subscription.charged'
    last_webhook_at: new Date().toISOString(),
    pending_update: false
  }
);
```

### Webhook Counter

The `webhooks_received` counter is automatically incremented by `updateRazorpaySyncMetadata()`.

### Where It's Used

- ✅ All webhook handlers (charged, authenticated, updated, etc.)
- ✅ `api/subscription/sync-razorpay/route.ts` - Manual sync endpoint
- ✅ Debugging webhook issues

---

## 5. Upgrade Tracking (Temporary Fields)

**Purpose**: Track user-initiated upgrade attempts before webhook confirmation  
**Location**: Root level of metadata

### Structure

```typescript
{
  lastUpgradeAttempt: "2024-03-15T10:30:00.000Z",
  numberOfUpgradeAttempts: 3,
  upgradeMethod: "UPDATE_API" | "WEBHOOK_UPDATE_API",
  targetPlanId: "plan_premium",
  targetPlanName: "Premium Plan",
  upgradeInitiatedBy: "user@example.com"
}
```

### Usage Example

```typescript
import { mergeSubscriptionMetadata } from '@/lib/subscription-metadata';

// When user clicks "Upgrade" button
const updatedMetadata = mergeSubscriptionMetadata(
  subscription.metadata,
  {
    lastUpgradeAttempt: new Date().toISOString(),
    numberOfUpgradeAttempts: (subscription.metadata?.numberOfUpgradeAttempts || 0) + 1,
    upgradeMethod: 'UPDATE_API',
    targetPlanId: targetPlan.id,
    targetPlanName: targetPlan.name,
    upgradeInitiatedBy: user.email
  }
);
```

### Lifecycle

1. Set when user clicks "Upgrade"
2. Used to reconcile with webhook event
3. Cleared after successful upgrade confirmation

### Where It's Used

- ✅ `api/subscription/upgrade/execute/route.ts` - Sets upgrade tracking
- ✅ `handlers/updated.ts` - Reconciles with webhook data

---

## Common Patterns

### 1. Creating New Subscription

```typescript
import { initializeSubscriptionMetadata } from '@/lib/subscription-metadata';

const subscription = await prisma.subscription.create({
  data: {
    userId: user.id,
    planId: plan.id,
    status: 'ACTIVE',
    metadata: initializeSubscriptionMetadata()
  }
});
```

### 2. Updating Existing Metadata

```typescript
import { mergeSubscriptionMetadata } from '@/lib/subscription-metadata';

// CORRECT: Preserves existing data
const updatedMetadata = mergeSubscriptionMetadata(
  subscription.metadata,
  {
    lifecycle: {
      last_successful_payment_at: new Date().toISOString()
    }
  }
);

// WRONG: Overwrites all existing data
const wrongMetadata = {
  lifecycle: {
    last_successful_payment_at: new Date().toISOString()
  }
};
```

### 3. Reading Metadata Safely

```typescript
// CORRECT: Safe access with fallbacks
const lastPayment = subscription.metadata?.lifecycle?.last_successful_payment_at;
const upgradeCount = subscription.metadata?.subscription_changes?.upgrades?.length || 0;

// WRONG: Unsafe access (can throw errors)
const lastPayment = subscription.metadata.lifecycle.last_successful_payment_at;
```

### 4. Validating Metadata

```typescript
import { validateSubscriptionMetadata } from '@/lib/subscription-metadata';

const errors = validateSubscriptionMetadata(subscription.metadata);
if (errors.length > 0) {
  console.error('Invalid metadata:', errors);
  // Handle validation errors
}
```

---

## Migration Plan

### Current Issues

1. ❌ No TypeScript types - metadata is treated as `any`
2. ❌ Inconsistent field names across files
3. ❌ Manual object construction prone to errors
4. ❌ No validation before saving
5. ❌ Direct overwrites losing existing data

### Refactoring Checklist

- [ ] **Phase 1: Type Definitions**
  - [x] Create `subscription-metadata.ts` with interfaces
  - [x] Create helper functions
  - [ ] Add to `tsconfig.json` paths for easy import

- [ ] **Phase 2: Update Webhook Handlers**
  - [ ] `handlers/charged.ts` - Use `mergeSubscriptionMetadata`
  - [ ] `handlers/authenticated.ts` - Use `updateRazorpaySyncMetadata`
  - [ ] `handlers/updated.ts` - Use `addPlanChangeRecord`
  - [ ] `handlers/cancelled.ts` - Use `mergeSubscriptionMetadata`
  - [ ] All other handlers

- [ ] **Phase 3: Update API Routes**
  - [ ] `onboarding/complete/route.ts` - Use `initializeSubscriptionMetadata`
  - [ ] `subscription/upgrade/execute/route.ts` - Use helper functions
  - [ ] `subscription/cancel/route.ts` - Use helper functions

- [ ] **Phase 4: Update Cron Jobs**
  - [ ] `grace-period-enforcer` - Use grace period helpers
  - [ ] `subscription-sync` - Use Razorpay helpers

- [ ] **Phase 5: Add Validation**
  - [ ] Add validation middleware
  - [ ] Validate on all updates
  - [ ] Log validation errors

---

## File Reference

### Files Using Metadata

| File | Usage | Priority |
|------|-------|----------|
| `handlers/updated.ts` | Upgrades, downgrades, grace periods | HIGH |
| `handlers/charged.ts` | Payment lifecycle | HIGH |
| `handlers/authenticated.ts` | Initial subscription | HIGH |
| `handlers/cancelled.ts` | Cancellation tracking | MEDIUM |
| `onboarding/complete/route.ts` | Trial initialization | HIGH |
| `upgrade/execute/route.ts` | User-initiated upgrades | HIGH |
| `grace-period-enforcer` | Grace period enforcement | MEDIUM |
| All other handlers | Razorpay sync | LOW |

---

## Testing

### Test Cases

1. **New Subscription Creation**
   - Metadata initialized correctly
   - All required fields present
   - No null/undefined values

2. **Plan Upgrade**
   - Change record added to upgrades array
   - Lifecycle updated
   - Razorpay sync status updated
   - Upgrade tracking fields set/cleared

3. **Plan Downgrade**
   - Change record added to downgrades array
   - Grace period created if needed
   - Limits enforced after grace period

4. **Webhook Events**
   - Webhook counter incremented
   - Last sync timestamp updated
   - Event name recorded

5. **Metadata Merge**
   - Existing data preserved
   - New data added
   - No data lost

---

## Best Practices

1. ✅ **Always use helper functions** - Don't construct metadata manually
2. ✅ **Import types** - Enable IntelliSense and type checking
3. ✅ **Validate before save** - Catch errors early
4. ✅ **Use optional chaining** - Safe access to nested fields
5. ✅ **Keep arrays limited** - Max 50 items for upgrades/downgrades
6. ✅ **Use ISO timestamps** - Consistent date format
7. ✅ **Document custom fields** - Add to types if needed

---

## Troubleshooting

### Issue: Metadata is null or undefined

**Solution**: Initialize with `initializeSubscriptionMetadata()` when creating subscription

### Issue: Existing data overwritten

**Solution**: Use `mergeSubscriptionMetadata()` instead of direct assignment

### Issue: Type errors in TypeScript

**Solution**: Import types from `subscription-metadata.ts` and use them

### Issue: Random fields appearing

**Solution**: Add all fields to `SubscriptionMetadata` interface

### Issue: Grace period not working

**Solution**: Check `grace_period.active` flag and `enforcement_status`

---

## Summary

The subscription metadata structure is now standardized and documented. Key takeaways:

1. **Single source of truth**: `src/lib/subscription-metadata.ts`
2. **Helper functions**: Use them for all metadata operations
3. **Type safety**: Import interfaces for better DX
4. **Validation**: Always validate before saving
5. **Consistency**: Follow patterns in this guide

This ensures the metadata field remains structured, consistent, and maintainable across the entire application.
