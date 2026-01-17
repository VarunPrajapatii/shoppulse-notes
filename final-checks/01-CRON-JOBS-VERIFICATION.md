# Cron Jobs Verification Guide

## Overview

This document details all 5 cron jobs in the ShopPulse Admin application, their purpose, triggers, database changes, and verification steps.

---

## 1. Expire Trials & Detect Payment Failure

**Path:** `src/app/api/cron/expire-trials-detect-payment-failure/route.ts`  
**Schedule:** Daily  
**Lines:** ~267

### Purpose
Handles two scenarios:
1. Expire TRIAL subscriptions when trial period ends
2. Detect payment failures for ACTIVE subscriptions (Razorpay retry period)

### Trigger Conditions

**Trial Expiry:**
```sql
subscription.status = 'ACTIVE'
AND user.trialUsed = false
AND subscription.currentPeriodEnd < NOW()
```

**Payment Failure Detection:**
```sql
subscription.status = 'ACTIVE'
AND user.trialUsed = true
AND subscription.nextChargeAt < NOW() - 7 days
```

### Database Changes

**On Trial Expiry:**
| Table | Field | Change |
|-------|-------|--------|
| Subscription | status | `ACTIVE` → `EXPIRED` |
| Subscription | autoRenew | `false` |
| User | trialUsed | `true` |
| User | isActive | `false` |
| Store | isAccessible | `false` |
| SubscriptionHistory | action | `EXPIRED` |
| SubscriptionHistory | reason | `"Trial period ended - No payment method added"` |

**On Payment Failure Detection:**
| Table | Field | Change |
|-------|-------|--------|
| User | paymentGracePeriod | `true` |
| SubscriptionHistory | action | `EXPIRED` |
| SubscriptionHistory | reason | `"Possible payment failure detected..."` |

### Auth Verification
```typescript
const authHeader = req.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new NextResponse('Unauthorized', { status: 401 });
}
```

### Response Format
```json
{
  "success": true,
  "message": "Processed X expired trials, detected Y payment issues",
  "expiredTrials": { "count": X, "details": [...] },
  "paymentIssues": { "count": Y, "details": [...] }
}
```

---

## 2. Expire Period-Ended Subscriptions

**Path:** `src/app/api/cron/expire-period-ended-subscriptions/route.ts`  
**Schedule:** Daily  
**Lines:** ~240

### Purpose
Expire subscriptions in `COMPLETING` or `CANCELED` status when their billing period ends.

### Trigger Conditions
```sql
subscription.status IN ('COMPLETING', 'CANCELED')
AND subscription.currentPeriodEnd < NOW()
```

### Database Changes

| Table | Field | Change |
|-------|-------|--------|
| Subscription | status | `COMPLETING/CANCELED` → `EXPIRED` |
| User | isActive | `false` |
| User | paymentGracePeriod | `false` |
| User | usageGracePeriod | `false` |
| Store | isAccessible | `false` |
| SubscriptionHistory | action | `EXPIRED` |
| SubscriptionHistory | fromStatus | `COMPLETING` or `CANCELED` |
| SubscriptionHistory | toStatus | `EXPIRED` |

### History Reasons by Status

**COMPLETING:**
```
"Subscription period ended after all charges completed"
```
**CANCELED:**
```
"Canceled subscription period ended - Services stopped"
```

### Metadata Structure
```json
{
  "event": "cron_expire_completed" | "cron_expire_canceled",
  "totalCharges": 12,
  "periodEnd": "2025-01-15T00:00:00.000Z",
  "canceledAt": "2025-01-01T00:00:00.000Z",
  "daysSinceCancellation": 14
}
```

---

## 3. Enforce Grace Periods

**Path:** `src/app/api/cron/enforce-grace-periods/route.ts`  
**Schedule:** Daily  
**Lines:** ~375

### Purpose
Enforce usage grace periods for users who downgraded and have overages. After 5 days, automatically delete excess items.

### Trigger Conditions
```sql
user.usageGracePeriod = true
AND subscription.metadata->'grace_period'->>'active' = 'true'
```

### Grace Period Data Structure (in `subscription.metadata`)
```typescript
interface GracePeriodData {
  active: boolean;
  reason: 'DOWNGRADE_OVERAGE';
  start_date: string;        // ISO date
  end_date: string;          // ISO date
  enforcement_date: string;  // ISO date (5 days after start)
  enforcement_status: 'PENDING' | 'ENFORCED' | 'RESOLVED_BY_USER';
  days_remaining: number;
  reminder_emails_sent: string[]; // Array of dates
  overage_details: {
    products: { resourceType, currentCount, limit, overageCount } | null;
    categories: { resourceType, currentCount, limit, overageCount } | null;
    billboards: { resourceType, currentCount, limit, overageCount } | null;
    total_overage: number;
  };
  new_plan_limits: { maxProducts, maxCategories, maxBillboards };
  from_plan: { id, name };
  to_plan: { id, name };
}
```

### Database Changes

**If Expired (5 days passed):**

1. **Auto-delete overages** (order: products → categories → billboards)
2. Update database:

| Table | Field | Change |
|-------|-------|--------|
| User | usageGracePeriod | `false` |
| Subscription | metadata.grace_period.active | `false` |
| Subscription | metadata.grace_period.enforcement_status | `ENFORCED` |
| SubscriptionHistory | action | `DOWNGRADED` |
| SubscriptionHistory | reason | `"Usage grace period enforcement - Deleted X items"` |

**If Still Active:**
- Update `days_remaining` in metadata
- Send daily reminder email (TODO)
- Track `reminder_emails_sent[]`

**If User Resolved Overages Manually:**

| Table | Field | Change |
|-------|-------|--------|
| User | usageGracePeriod | `false` |
| Subscription | metadata.grace_period.enforcement_status | `RESOLVED_BY_USER` |
| SubscriptionHistory | reason | `"Usage grace period ended - User resolved overages manually"` |

### Deletion Order
```typescript
// Order matters for foreign key constraints
1. Products (can be archived first)
2. Categories
3. Billboards
```

---

## 4. Expire Completed Subscriptions

**Note:** This functionality is merged into `expire-period-ended-subscriptions/route.ts`. The status `COMPLETING` is handled there.

**Status Flow:**
```
ACTIVE → COMPLETING (via subscription.completed webhook)
COMPLETING → EXPIRED (via this cron when period ends)
```

---

## 5. Cleanup Archived Products

**Path:** `src/app/api/cron/cleanup-archived-products/route.ts`  
**Schedule:** Weekly  
**Lines:** ~153

### Purpose
Permanently delete archived products that have passed their retention period (3 months).

### Trigger Conditions
```sql
ArchivedProduct.expiresAt < NOW()
```

### Database Changes

| Table | Action |
|-------|--------|
| ArchivedProduct | DELETE record |
| Cloudinary | DELETE images |

### Process Flow
1. Find all expired `ArchivedProduct` records
2. For each:
   - Extract image URLs from `images` JSON array
   - Delete images from Cloudinary
   - Delete `ArchivedProduct` record

### Response Format
```json
{
  "success": true,
  "message": "Cleaned up 5/5 expired archived products",
  "result": {
    "totalProcessed": 5,
    "successfulDeletions": 5,
    "cloudinaryDeletions": 15,
    "errors": []
  }
}
```

---

## Cron Job Summary Table

| Cron Job | Frequency | Status Transitions | Key Flags Changed |
|----------|-----------|-------------------|-------------------|
| expire-trials-detect-payment-failure | Daily | ACTIVE → EXPIRED | trialUsed, isActive, paymentGracePeriod |
| expire-period-ended-subscriptions | Daily | COMPLETING/CANCELED → EXPIRED | isActive, paymentGracePeriod, usageGracePeriod |
| enforce-grace-periods | Daily | N/A (status unchanged) | usageGracePeriod, metadata.grace_period |
| cleanup-archived-products | Weekly | N/A (deletes records) | N/A |

---

## Vercel Cron Configuration

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-trials-detect-payment-failure",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/expire-period-ended-subscriptions",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/enforce-grace-periods",
      "schedule": "0 4 * * *"
    },
    {
      "path": "/api/cron/cleanup-archived-products",
      "schedule": "0 5 * * 0"
    }
  ]
}
```

**Schedule Explanation:**
- `0 2 * * *` = 2:00 AM daily (trial expiry)
- `0 3 * * *` = 3:00 AM daily (period end expiry)
- `0 4 * * *` = 4:00 AM daily (grace period enforcement)
- `0 5 * * 0` = 5:00 AM Sunday (weekly cleanup)

---

## Testing Cron Jobs Locally

```bash
# Test each cron job with CRON_SECRET header
curl -X GET "http://localhost:3000/api/cron/expire-trials-detect-payment-failure" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

curl -X GET "http://localhost:3000/api/cron/expire-period-ended-subscriptions" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

curl -X GET "http://localhost:3000/api/cron/enforce-grace-periods" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

curl -X GET "http://localhost:3000/api/cron/cleanup-archived-products" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Common Issues & Fixes

### Issue: Cron returns 401 Unauthorized
**Fix:** Ensure `CRON_SECRET` environment variable is set and matches the Authorization header.

### Issue: Grace period not enforcing
**Fix:** Check that:
1. `User.usageGracePeriod = true`
2. `Subscription.metadata.grace_period.active = true`
3. `enforcement_date` has passed

### Issue: Archived products not cleaning up
**Fix:** Check `ArchivedProduct.expiresAt` field - should be 3 months from archive date.
