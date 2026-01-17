# Database Schema Quick Reference

## Overview

This document provides a quick reference for key database fields used in the subscription system. Use this when implementing features or debugging issues.

---

## Key Tables & Fields

### Subscription

```prisma
model Subscription {
  id                    String   @id @default(cuid())
  userId                String   @unique
  planId                String
  
  // Razorpay Integration
  razorpaySubscriptionId String?  @unique
  razorpayCustomerId     String?
  
  // Status & Billing
  status                SubscriptionStatus @default(ACTIVE)
  billingCycle          BillingCycle       @default(MONTHLY)
  
  // Period Tracking
  currentPeriodStart    DateTime @default(now())
  currentPeriodEnd      DateTime
  nextChargeAt          DateTime?
  
  // Charge Tracking
  totalCount            Int      @default(0)    // Total charges for subscription
  paidCount             Int      @default(0)    // Charges paid so far
  remainingCount        Int      @default(0)    // Remaining charges
  
  // Auto-renewal & Cancellation
  autoRenew             Boolean  @default(true)
  cancelAtPeriodEnd     Boolean  @default(false)
  canceledAt            DateTime?
  
  // Plan Change Tracking (IMPORTANT!)
  hasScheduledChanges   Boolean  @default(false)  // True when downgrade pending
  scheduledPlanId       String?                   // New plan ID for scheduled change
  changeScheduledAt     DateTime?                 // When change takes effect
  lastPlanChangeAt      DateTime?
  planChangeCount       Int      @default(0)
  
  // Webhook Sync Status
  lastApiUpdateAt       DateTime?
  lastWebhookAt         DateTime?
  webhookSyncStatus     WebhookSyncStatus @default(SYNCED)
  
  // Metadata (JSON - stores grace period data, change history)
  metadata              Json?
}
```

**Important `metadata` Structure:**
```typescript
{
  grace_period?: {
    active: boolean;
    reason: 'DOWNGRADE_OVERAGE';
    start_date: string;
    end_date: string;
    enforcement_date: string;
    enforcement_status: 'PENDING' | 'ENFORCED' | 'RESOLVED_BY_USER';
    days_remaining: number;
    reminder_emails_sent: string[];
    overage_details: {...};
    new_plan_limits: {...};
    from_plan: { id, name };
    to_plan: { id, name };
  };
  subscription_changes?: {
    upgrades: ChangeRecord[];
    downgrades: ChangeRecord[];
  };
  razorpay?: {
    last_sync: string;
    sync_status: string;
    webhooks_received: number;
    pending_update: boolean;
    pending_update_plan_id: string | null;
  };
}
```

---

### User

```prisma
model User {
  id                  String    @id
  email               String    @unique
  name                String?
  
  // Onboarding & Access
  onboardingComplete  Boolean   @default(false)
  isActive            Boolean   @default(true)   // false = blocked from dashboard
  
  // Trial & Grace Period Flags
  trialUsed           Boolean   @default(false)  // true = cannot start new trial
  usageGracePeriod    Boolean   @default(false)  // true = downgrade overage grace
  paymentGracePeriod  Boolean   @default(false)  // true = payment failed, retrying
}
```

**Flag Usage:**
- `isActive=false` → User cannot access dashboard
- `trialUsed=true` → User has used/expired trial, cannot start new one
- `usageGracePeriod=true` → User downgraded with overages, 5-day grace period
- `paymentGracePeriod=true` → Payment failed, Razorpay retrying

---

### SubscriptionHistory

```prisma
model SubscriptionHistory {
  id             String   @id @default(cuid())
  subscriptionId String
  
  // Action Tracking
  action         SubscriptionAction  // CREATED, UPGRADED, DOWNGRADED, RENEWED, CANCELED, EXPIRED, PAUSED, RESUMED
  
  // Status Change
  fromStatus     SubscriptionStatus?
  toStatus       SubscriptionStatus?
  
  // Plan Change (for upgrades/downgrades)
  fromPlanId     String?
  toPlanId       String?
  
  // Details
  reason         String?       // Human-readable reason
  amountCharged  Decimal?      // Payment amount if applicable
  metadata       Json?         // Additional event-specific data
  
  createdAt      DateTime @default(now())
}
```

**Common `action` Values:**
- `CREATED` - New subscription created
- `UPGRADED` - Plan upgraded (immediate)
- `DOWNGRADED` - Plan downgraded (at period end)
- `RENEWED` - Recurring payment successful
- `CANCELED` - User canceled subscription
- `EXPIRED` - Subscription ended (trial/period/halted)
- `PAUSED` - Admin paused subscription
- `RESUMED` - Subscription resumed

---

### SubscriptionPlan

```prisma
model SubscriptionPlan {
  id                   String   @id @default(cuid())
  name                 String   @unique  // TRIAL, BASIC, PRO, PREMIUM
  displayName          String             // "Trial Plan", "Basic Plan", etc.
  
  // Razorpay
  razorpayPlanId       String?  @unique  // Razorpay plan ID (null for TRIAL)
  
  // Pricing
  price                Decimal  @db.Decimal(10, 2)
  priceBeforeDiscount  Decimal  @db.Decimal(10, 2)
  currency             String   @default("INR")
  billingCycle         BillingCycle
  
  // Limits
  maxProducts          Int?     // null = unlimited
  maxOrders            Int?     // null = unlimited
  additionalLimits     Json?    // { maxCategories, maxBillboards }
  
  // Display
  features             Json?    // { featuresList: string[] }
  isPublic             Boolean  @default(true)
  isActive             Boolean  @default(true)
  sortOrder            Int      @default(0)
}
```

**`additionalLimits` Structure:**
```typescript
{
  maxCategories?: number | null;
  maxBillboards?: number | null;
}
```

---

### Store

```prisma
model Store {
  id           String   @id @default(uuid())
  name         String
  userId       String
  isAccessible Boolean  @default(true)  // false = store API disabled
}
```

**`isAccessible` Usage:**
- `true` - Store API works normally
- `false` - Store API returns errors (subscription expired/blocked)

---

### Payment

```prisma
model Payment {
  id                      String   @id @default(cuid())
  userId                  String
  subscriptionId          String?
  
  // Razorpay IDs
  razorpayPaymentId       String   @unique
  razorpaySubscriptionId  String?
  razorpayOrderId         String?
  invoiceId               String?
  
  // Amounts
  amountPaid              Decimal  @db.Decimal(10, 2)
  subtotal                Decimal  @db.Decimal(10, 2)
  taxAmount               Decimal? @db.Decimal(10, 2)
  discountAmount          Decimal? @db.Decimal(10, 2)
  currency                String   @default("INR")
  
  // Status & Type
  status                  PaymentStatus  // PENDING, SUCCESS, FAILED, REFUNDED
  paymentType             PaymentType?   // SUBSCRIPTION_CHARGE, UPGRADE_CHARGE, etc.
  paymentMethod           String?        // card, upi, netbanking, etc.
  
  // Timestamps
  paidAt                  DateTime?
  createdAt               DateTime @default(now())
}
```

---

### ArchivedProduct

```prisma
model ArchivedProduct {
  id                String   @id @default(cuid())
  
  // Original Product Info
  originalProductId String   // NOT "originalId"!
  storeId           String
  userId            String
  
  // Product Snapshot
  name              String
  price             Decimal  @db.Decimal(10, 2)
  description       String?
  isFeatured        Boolean  @default(false)
  isArchived        Boolean  @default(false)
  
  // Related IDs
  sizeId            String?
  colorId           String?
  categoryId        String?
  
  // Images (JSON array)
  images            Json     // [{ url: string }]
  
  // Archive Info
  archivedAt        DateTime @default(now())
  archiveReason     String?
  expiresAt         DateTime // 3 months from archive date
}
```

---

## Enums Reference

### SubscriptionStatus
```prisma
enum SubscriptionStatus {
  ACTIVE      // Normal active subscription
  CANCELED    // User canceled, active until period end
  EXPIRED     // Subscription ended
  PAST_DUE    // Payment failed, in retry period (NOT USED - Razorpay handles)
  PAUSED      // Admin paused
  COMPLETING  // All charges complete, waiting for period end
}
```

### SubscriptionAction
```prisma
enum SubscriptionAction {
  CREATED
  UPGRADED
  DOWNGRADED
  RENEWED
  CANCELED
  EXPIRED
  PAUSED
  RESUMED
}
```

### PaymentType
```prisma
enum PaymentType {
  SUBSCRIPTION_CHARGE   // Regular subscription payment
  UPGRADE_CHARGE        // Prorated upgrade payment
  ADDON_CHARGE          // Add-on purchase
  REFUND                // Refund payment
  MANUAL                // Manual adjustment
}
```

### PaymentStatus
```prisma
enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
  REFUNDED
}
```

### WebhookSyncStatus
```prisma
enum WebhookSyncStatus {
  SYNCED           // DB matches Razorpay
  PENDING_UPDATE   // Waiting for webhook
  OUT_OF_SYNC      // DB differs from Razorpay
  ERROR            // Sync error occurred
}
```

---

## Common Queries

### Get User with Full Subscription Data
```typescript
const user = await prismadb.user.findUnique({
  where: { id: userId },
  include: {
    subscription: {
      include: {
        plan: true,
        subscriptionHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    },
    stores: true,
  },
});
```

### Check if User Can Access Dashboard
```typescript
const canAccess = 
  user.isActive && 
  user.subscription?.status === 'ACTIVE' &&
  user.stores[0]?.isAccessible;
```

### Check if User is on Grace Period
```typescript
const isOnGracePeriod = 
  user.usageGracePeriod || user.paymentGracePeriod;

// Get grace period details
const gracePeriodData = user.subscription?.metadata?.grace_period;
```

### Check Usage Against Limits
```typescript
const plan = subscription.plan;
const additionalLimits = plan.additionalLimits as { maxCategories?: number; maxBillboards?: number } | null;

const limits = {
  maxProducts: plan.maxProducts,        // null = unlimited
  maxOrders: plan.maxOrders,            // null = unlimited
  maxCategories: additionalLimits?.maxCategories ?? null,
  maxBillboards: additionalLimits?.maxBillboards ?? null,
};

const isOverLimit = (current: number, limit: number | null) => 
  limit !== null && current > limit;
```

---

## Field Naming Warnings

### ⚠️ Common Mistakes to Avoid

| Wrong | Correct |
|-------|---------|
| `originalId` | `originalProductId` |
| `graceperiodstartdate` | `metadata.grace_period.start_date` |
| `subscriptionhistory.stage` | `metadata.stage` (inside metadata JSON) |
| `subscriptionhistory.notes` | `reason` (use reason field) |
| `subscription.scheduledChangeDate` | `changeScheduledAt` |
| `subscription.pendingUpgrade` | `hasScheduledChanges` |
| `subscription.upgradeInitiatedAt` | `changeScheduledAt` |

---

## Quick Tips

1. **All `Decimal` fields** need `.toNumber()` or `Number()` for JS math
2. **JSON fields** (`metadata`, `additionalLimits`, `features`, `images`) need type casting
3. **Unique constraints** on `razorpaySubscriptionId`, `razorpayPaymentId`, `email`, etc.
4. **Cascade deletes** - Check foreign key relationships before deleting
5. **Default values** - Many fields have defaults, don't set them unnecessarily
