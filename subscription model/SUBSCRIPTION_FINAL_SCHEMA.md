# 🎯 Final Subscription Schema - Ready for Implementation

Based on decisions made, this is the final schema to implement.

> **📊 DOCUMENT-LEVEL AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially matches — schema was implemented but evolved significantly beyond this doc
> - 📝 **REALITY CHECK**: ~60% of this doc matches current schema. Major divergences in User fields, Payment model (Razorpay-specific vs generic gateway), Usage tracking (4 specialized tables vs 1 generic UsageRecord), and missing enums (WebhookSyncStatus, PaymentType)
> - 🎯 **ACTION**: Update entire document to reflect actual schema
> - 💡 **ENHANCEMENT**: Document the upgrade/downgrade flow fields, webhook sync system, and grace period flags that were added post-implementation

---

## Complete Schema Code

> **📊 AUDIT — User Model (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY CHECK**:
>   - `name` is `String` (required), NOT `String?` — actual schema has no `?`
>   - `phone` field **MISSING** from doc — actual schema has `phone String`
>   - `paymentGracePeriod Boolean @default(false)` **MISSING** — tracks payment failure grace
>   - `usageGracePeriod Boolean @default(false)` **MISSING** — tracks usage limit grace
>   - `lastOrderLimitNotificationLevel String?` **MISSING** — deduplication for limit notifications
>   - Relations: `usageRecords UsageRecord[]` is **WRONG** — actual has `usageCumulative UsageCumulative?`, `usageOrders UsageOrders[]`, `usageApiCalls UsageApiCalls[]`, `usageHistory UsageHistory[]`
> - 🎯 **ACTION**: Update — add missing fields (`phone`, `paymentGracePeriod`, `usageGracePeriod`, `lastOrderLimitNotificationLevel`), fix `name` optionality, replace `usageRecords` with 4 usage relations
> - 💡 **ENHANCEMENT**: Grace period flags are critical for the payment failure UX flow — document their purpose

```prisma
// ============================================================================
// USER & SUBSCRIPTION MANAGEMENT
// ============================================================================

model User {
  id                String              @id  // Clerk ID directly (user's decision)
  email             String              @unique
  name              String?
  
  // Subscription Info
  subscriptionId    String?             @unique
  subscription      Subscription?       @relation("UserSubscription")
  
  // Trial Abuse Prevention
  trialUsed         Boolean             @default(false) // One trial per email
  
  // Account Status
  isActive          Boolean             @default(true)  // Can access dashboard
  isSuspended       Boolean             @default(false) // Manual suspension
  suspensionReason  String?
  
  // Metadata
  onboardingComplete Boolean            @default(false)
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  lastLoginAt       DateTime?
  
  // Relations
  stores            Store[]
  payments          Payment[]
  usageRecords      UsageRecord[]
  
  @@index([email])
  @@index([subscriptionId])
}

> **📊 AUDIT — Subscription Model (2026-02-18):**
> - 🟡 **STATUS**: Partially matches — core structure correct but many fields missing
> - 📝 **REALITY CHECK**:
>   - `nextChargeAt DateTime?` **MISSING** — tracks next Razorpay charge
>   - `totalCount Int?` **MISSING** — Razorpay total billing cycles
>   - `paidCount Int @default(0)` **MISSING** — Razorpay paid cycle count
>   - `remainingCount Int?` **MISSING** — Razorpay remaining cycles
>   - `lastPlanChangeAt DateTime?` **MISSING** — when plan was last changed
>   - `planChangeCount Int @default(0)` **MISSING** — how many times plan changed
>   - `hasScheduledChanges Boolean @default(false)` **MISSING** — upgrade/downgrade scheduling
>   - `scheduledPlanId String?` **MISSING** — which plan is scheduled
>   - `changeScheduledAt DateTime?` **MISSING** — when change is scheduled
>   - `metadata Json?` **MISSING** — stores upgrade attempts, webhook timestamps
>   - `lastApiUpdateAt DateTime?` **MISSING** — webhook sync tracking
>   - `lastWebhookAt DateTime?` **MISSING** — webhook sync tracking
>   - `webhookSyncStatus WebhookSyncStatus @default(SYNCED)` **MISSING** — sync state enum
>   - Extra indexes: `@@index([hasScheduledChanges])`, `@@index([scheduledPlanId])` **MISSING**
> - 🎯 **ACTION**: Update — add all Razorpay billing fields, plan change tracking, scheduled change fields, and webhook sync tracking
> - 💡 **ENHANCEMENT**: The upgrade/downgrade scheduling system and webhook sync are core to payment reliability — should be prominently documented

model Subscription {
  id                  String              @id @default(uuid())
  userId              String              @unique
  user                User                @relation("UserSubscription", fields: [userId], references: [id], onDelete: Cascade)
  
  // Plan Details
  planId              String
  plan                SubscriptionPlan    @relation(fields: [planId], references: [id])
  
  // Status & Lifecycle
  status              SubscriptionStatus  @default(ACTIVE)
  
  // Billing Cycle (mirrors the plan's billing cycle)
  billingCycle        BillingCycle        @default(MONTHLY)  // Default to MONTHLY
  currentPeriodStart  DateTime
  currentPeriodEnd    DateTime
  
  // Cancellation
  cancelAtPeriodEnd   Boolean             @default(false)
  canceledAt          DateTime?
  cancellationReason  String?
  
  // Razorpay Integration (for auto-billing if implemented later)
  razorpaySubscriptionId String?          @unique
  razorpayPlanId         String?
  razorpayCustomerId     String?
  
  // Metadata
  autoRenew           Boolean             @default(true)
  nextBillingDate     DateTime?
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
  
  // Relations
  payments            Payment[]
  subscriptionHistory SubscriptionHistory[]
  
  @@index([userId])
  @@index([planId])
  @@index([status])
  @@index([currentPeriodEnd]) // For checking expirations
}

> **📊 AUDIT — SubscriptionPlan Model (2026-02-18):**
> - 🟢 **STATUS**: Matches schema
> - 📝 **REALITY CHECK**: All fields match the actual Prisma schema. The comment says `TRIAL, MONTHLY, HALFYEARLY, YEARLY` for billingCycle but actual enum has no TRIAL — this is just a stale comment. Structure and fields are correct.
> - 🎯 **ACTION**: Keep — minor comment fix needed (remove "TRIAL" from billingCycle comment)
> - 💡 **ENHANCEMENT**: None needed

model SubscriptionPlan {
  id                String              @id @default(uuid())
  
  // Plan Identity
  name              String              @unique // "Trial", "Monthly", "HalfYearly", "Yearly"
  displayName       String              // "7-Day Free Trial", "Monthly Plan", etc.
  description       String?
  
  // Pricing
  priceBeforeDiscount  Decimal          // For showing crossed-out prices
  price                Decimal          // Actual price (0 for trial, 3500 for monthly, etc.)
  currency          String              @default("INR")
  billingCycle      BillingCycle        // TRIAL, MONTHLY, HALFYEARLY, YEARLY
  
  // Feature Limits (null = unlimited)
  maxProducts       Int?                @default(100)
  maxOrders         Int?                @default(1000)
  maxStorageGB      Int?                @default(5)
  
  // Features (Dynamic JSON for flexibility)
  additionalLimits Json?               // { "maxCategories": 50, "maxBillboards": 20 }
  features          Json?               // { "analytics": true, "advancedReports": false, "apiAccess": true }
  
  // Plan Status
  isActive          Boolean             @default(true)   // Can users subscribe?
  isPublic          Boolean             @default(true)   // Show on pricing page?
  
  // Razorpay Integration (if using Razorpay subscriptions)
  razorpayPlanId    String?             @unique
  
  // Metadata
  sortOrder         Int                 @default(0)      // Display order on pricing page
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  // Relations
  subscriptions     Subscription[]
  
  @@index([isActive, isPublic])
  @@index([billingCycle])
}

> **📊 AUDIT — Payment Model (2026-02-18):**
> - 🔴 **STATUS**: Outdated — major structural differences
> - 📝 **REALITY CHECK**:
>   - **Gateway fields WRONG**: Doc has generic `paymentGateway`, `gatewayOrderId`, `gatewayPaymentId`, `gatewaySignature`, `gatewayMetadata`. Actual schema uses Razorpay-specific: `razorpayOrderId (@unique)`, `razorpayPaymentId (@unique)`, `razorpaySubscriptionId`, `razorpaySignature`
>   - `cardBrand` → actual is `cardNetwork String?`
>   - `paymentType PaymentType @default(SUBSCRIPTION_CHARGE)` **MISSING** — enum: SUBSCRIPTION_CHARGE, UPGRADE_CHARGE, ADDON_CHARGE, SETUP_FEE
>   - `invoiceId String?` **MISSING** — Razorpay invoice ID for upgrade charges
>   - `@@unique([paymentGateway, gatewayOrderId])` is **WRONG** — actual has `@@unique` on individual razorpay fields
>   - Extra indexes: `@@index([razorpayOrderId])`, `@@index([razorpayPaymentId])`, `@@index([paymentType])`, `@@index([invoiceId])` **MISSING**
>   - `gatewayMetadata Json?` **DOES NOT EXIST** in actual schema
> - 🎯 **ACTION**: Update — replace generic gateway fields with Razorpay-specific fields, add `paymentType` enum, add `invoiceId`, fix `cardBrand` → `cardNetwork`, fix indexes
> - 💡 **ENHANCEMENT**: The PaymentType enum is critical for distinguishing subscription charges from upgrade proration charges. Document the flow.

model Payment {
  id                  String          @id @default(uuid())
  
  // Who paid?
  userId              String
  user                User            @relation(fields: [userId], references: [id])
  
  // Which subscription?
  subscriptionId      String?
  subscription        Subscription?   @relation(fields: [subscriptionId], references: [id])
  
  // Payment Details
  subtotal            Decimal         // Amount before tax/discounts
  taxAmount           Decimal         @default(0)
  discountAmount      Decimal         @default(0)
  processingFee       Decimal         @default(0)
  amountPaid          Decimal         // Final amount charged
  currency            String          @default("INR")
  
  // Generic Payment Gateway Fields (flexible for multiple gateways)
  paymentGateway      String          @default("razorpay")  // "razorpay", "stripe", "paypal"
  gatewayOrderId      String?         // Razorpay order ID / Stripe payment intent
  gatewayPaymentId    String?         // Razorpay payment ID / Stripe charge ID
  gatewaySignature    String?         // Gateway-specific signature for verification
  gatewayMetadata     Json?           // Store any gateway-specific data
  
  // Payment Status
  status              PaymentStatus   @default(PENDING)
  
  // Payment Method Details
  paymentMethod       String?         // "card", "upi", "netbanking", "wallet"
  cardLast4           String?
  cardBrand           String?         // "visa", "mastercard", etc.
  upiId               String?
  
  // Metadata
  description         String?         // "Monthly subscription - January 2025"
  failureReason       String?
  invoiceUrl          String?         // Generated invoice URL (for now, full Invoice model later)
  receiptUrl          String?         // Gateway receipt URL
  
  // Timestamps
  paidAt              DateTime?
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  
  @@unique([paymentGateway, gatewayOrderId])  // Composite unique for multi-gateway
  @@index([userId])
  @@index([subscriptionId])
  @@index([status])
  @@index([createdAt])
  @@index([paymentGateway])
}

> **📊 AUDIT — SubscriptionHistory Model (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY CHECK**:
>   - `amountCharged Decimal?` **MISSING** — tracks financial impact of upgrades/downgrades (proration amount)
>   - All other fields match correctly
> - 🎯 **ACTION**: Update — add `amountCharged Decimal?` field
> - 💡 **ENHANCEMENT**: This field is important for the upgrade proration flow — ties history entries to actual charges

model SubscriptionHistory {
  id              String              @id @default(uuid())
  subscriptionId  String
  subscription    Subscription        @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  
  // What changed?
  action          SubscriptionAction
  fromStatus      SubscriptionStatus?
  toStatus        SubscriptionStatus?
  fromPlanId      String?
  toPlanId        String?
  
  // Why?
  reason          String?
  metadata        Json?               // Additional context
  
  // When?
  createdAt       DateTime            @default(now())
  
  @@index([subscriptionId])
  @@index([action])
  @@index([createdAt])
}

> **📊 AUDIT — UsageRecord Model (2026-02-18):**
> - 🔴 **STATUS**: Outdated — this model DOES NOT EXIST in actual schema
> - 📝 **REALITY CHECK**: The single `UsageRecord` model was replaced with 4 specialized tables:
>   - `UsageCumulative` — single row per user, JSON `metrics` field for products/categories/billboards/storage (cumulative, never resets)
>   - `UsageOrders` — period-based order count tracking, one row per user per billing period
>   - `UsageApiCalls` — period-based API call tracking, Redis-first with DB flush every 5 min (high-write optimization)
>   - `UsageHistory` — archived period snapshots, JSON `metrics` field per completed period
>   - The generic `UsageMetricType` enum is also **GONE** — replaced by `CumulativeMetricType` enum (PRODUCTS, CATEGORIES, BILLBOARDS, STORAGE_GB)
> - 🎯 **ACTION**: Delete this model and replace with the 4 actual usage tables
> - 💡 **ENHANCEMENT**: The split was done for performance — API calls need Redis-first writes (100+ writes/sec), cumulative metrics rarely change, orders reset per period. Document this architecture decision.

model UsageRecord {
  id              String          @id @default(uuid())
  userId          String
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // What metric?
  metricType      UsageMetricType
  
  // How much?
  count           Int             @default(0)
  
  // Time period
  periodStart     DateTime
  periodEnd       DateTime
  
  // Metadata
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  @@unique([userId, metricType, periodStart, periodEnd])  // Fixed: Include periodEnd
  @@index([userId])
  @@index([metricType])
}

// ============================================================================
// UPDATE TO EXISTING STORE MODEL
// ============================================================================

> **📊 AUDIT — Store Model (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY CHECK**:
>   - `isAccessible Boolean @default(true)` **MISSING** — controls access when subscription expires/pauses
>   - Doc mentions `apiKey`, `apiKeyStatus`, `lastApiCall`, `apiCallCount` fields — **NONE of these exist** in actual schema. Store has NO API key fields.
>   - `archivedProducts`, `announcementBar`, `addresses`, `packagePresets`, `shipments`, `returnRequests`, `shippingSettings`, `pickupBatches`, `notificationSettings`, `notificationTemplates`, `notificationLogs` relations **MISSING** from doc
>   - SEO fields (`description`, `seoKeywords`, `logoUrl`, `domainUrl`, `orderTrackingPath`, `socialLinks`) **MISSING** from doc
>   - `promotionalBanner`, `newProductDays` **MISSING** from doc
> - 🎯 **ACTION**: Update — add `isAccessible`, remove API key references, add new relations and SEO fields
> - 💡 **ENHANCEMENT**: The `isAccessible` flag is the actual mechanism for revoking store access on subscription expiry (not API keys as doc suggests)

model Store {
  id               String               @id @default(uuid())
  name             String
  userId           String               @unique  // One store per user (user's decision)
  user             User                 @relation(fields: [userId], references: [id])
  
  // Existing fields (keep as is)
  billboards       Billboard[]          @relation("StoreToBillboard")
  categories       Category[]           @relation("StoreToCategory")
  sizes            Size[]               @relation("StoreToSize")
  products         Product[]            @relation("StoreToProduct")
  orders           Order[]              @relation("StoreToOrder")
  upcomingProducts UpcomingProducts[]   @relation("StoreToUpcomingProduct")
  storeMain        StoreMainBillboard[]
  integrations     StoreIntegration[]
  
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt
  
  @@index([userId])
  @@index([apiKey])
  @@index([apiKeyStatus])
}

// ============================================================================
// ENUMS
// ============================================================================

> **📊 AUDIT — SubscriptionStatus Enum (2026-02-18):**
> - 🟡 **STATUS**: Partially matches — missing COMPLETING status
> - 📝 **REALITY CHECK**:
>   - `COMPLETING` **MISSING** — "All charges paid, period still active" (Razorpay sends this when subscription has fulfilled all billing cycles but period hasn't ended)
>   - Order in actual enum: ACTIVE, COMPLETING, EXPIRED, PAST_DUE, CANCELED, PAUSED
> - 🎯 **ACTION**: Update — add COMPLETING status
> - 💡 **ENHANCEMENT**: COMPLETING is a Razorpay-specific status that's important to handle — subscription is paid up but will expire at period end

enum SubscriptionStatus {
  ACTIVE          // Currently active (includes both trial and paid subscriptions)
  PAST_DUE        // Payment failed, grace period
  CANCELED        // User canceled, service until period end
  EXPIRED         // Period ended, no renewal
  PAUSED          // Manually paused by admin
}

> **📊 AUDIT — BillingCycle Enum (2026-02-18):**
> - 🟢 **STATUS**: Matches schema
> - 📝 **REALITY CHECK**: All three values match. Prices in comments may be stale (actual pricing-data.ts shows ₹999/month, ₹5,995/half-yearly, ₹11,988/year)
> - 🎯 **ACTION**: Keep — update price comments to match actual pricing
> - 💡 **ENHANCEMENT**: None

enum BillingCycle {
  MONTHLY         // ₹3,500/month (default)
  HALFYEARLY      // 6 months
  YEARLY          // ₹38,500/year
}

> **📊 AUDIT — PaymentStatus Enum (2026-02-18):**
> - 🟢 **STATUS**: Matches schema
> - 📝 **REALITY CHECK**: All 5 values match exactly
> - 🎯 **ACTION**: Keep
> - 💡 **ENHANCEMENT**: None

enum PaymentStatus {
  PENDING         // Payment initiated
  PROCESSING      // Payment in progress
  SUCCESS         // Payment successful
  FAILED          // Payment failed
  REFUNDED        // Payment refunded
}

> **📊 AUDIT — SubscriptionAction Enum (2026-02-18):**
> - 🟢 **STATUS**: Matches schema
> - 📝 **REALITY CHECK**: All 9 values match exactly
> - 🎯 **ACTION**: Keep
> - 💡 **ENHANCEMENT**: None

enum SubscriptionAction {
  CREATED         // New subscription
  UPGRADED        // Switched to higher plan
  DOWNGRADED      // Switched to lower plan
  RENEWED         // Auto-renewal
  CANCELED        // User canceled
  EXPIRED         // Subscription expired
  REACTIVATED     // Reactivated after cancellation
  PAUSED          // Paused by admin
  RESUMED         // Resumed after pause
}

> **📊 AUDIT — UsageMetricType Enum (2026-02-18):**
> - 🔴 **STATUS**: Outdated — this enum DOES NOT EXIST in actual schema
> - 📝 **REALITY CHECK**: Replaced by `CumulativeMetricType` enum with only 4 values: PRODUCTS, CATEGORIES, BILLBOARDS, STORAGE_GB. ORDERS and API_CALLS are tracked in their own dedicated tables (UsageOrders, UsageApiCalls) — they don't use an enum.
> - 🎯 **ACTION**: Delete and replace with `CumulativeMetricType`
> - 💡 **ENHANCEMENT**: Also document `WebhookSyncStatus` enum (SYNCED, PENDING, SYNC_FAILED, MANUAL_CHECK) and `PaymentType` enum (SUBSCRIPTION_CHARGE, UPGRADE_CHARGE, ADDON_CHARGE, SETUP_FEE) — both are completely missing from this doc

> **📊 AUDIT — ApiKeyStatus Enum (2026-02-18):**
> - 🔴 **STATUS**: Outdated — commented out and NEVER IMPLEMENTED
> - 📝 **REALITY CHECK**: Store model has no `apiKey` or `apiKeyStatus` fields. Access control uses `Store.isAccessible` boolean instead.
> - 🎯 **ACTION**: Delete — this was a design idea that was replaced by `isAccessible`

enum UsageMetricType {
  PRODUCTS        // Total products created
  ORDERS          // Total orders received
  STORAGE_GB      // Storage used in GB
  CATEGORIES      // Total categories
  BILLBOARDS      // Total billboards
  API_CALLS       // API calls (important for frontend usage tracking)
}

// enum ApiKeyStatus {
//   ACTIVE          // API key is valid
//   REVOKED         // API key revoked (subscription expired)
//   SUSPENDED       // Temporarily suspended (payment issue)
// }
```

---

## Key Changes Made

> **📊 AUDIT — Key Changes Section (2026-02-18):**
> - 🟡 **STATUS**: Partially matches — decisions are correct but some were superseded
> - 📝 **REALITY CHECK**: Items 1-5 are correct. Item 5 (generic payment gateway) was REVERSED — actual schema uses Razorpay-specific fields, not generic gateway fields. Item 8 (Store API Key system) was NEVER IMPLEMENTED.
> - 🎯 **ACTION**: Update items 5 and 8 to reflect reality
> - 💡 **ENHANCEMENT**: Add notes about the webhook sync system and grace period flags which were major additions

### ✅ Based on Your Decisions:

1. **User.id:** Kept as Clerk ID (your decision)
2. **subscriptionId:** Kept in User model (always attached to plan)
3. **Invoice:** Just `invoiceUrl: String?` for now
4. **Store:** Kept `@unique` constraint (one per user)
5. **Payment Gateway:** Generic fields for flexibility

### ✅ Status Simplification:

6. **Removed TRIALING status:** Not needed since plan type indicates trial
   - Trial subscriptions: `status: ACTIVE` + `plan.name === 'Trial'`
   - Paid subscriptions: `status: ACTIVE` + other plan names
   - To check if on trial: `user.trialUsed === false` OR `subscription.plan.name === 'Trial'`

7. **Removed TRIAL from BillingCycle enum:** Not needed
   - Trial plan uses `billingCycle: MONTHLY` by default
   - The plan's `name` field identifies it as trial (e.g., "Trial")
   - When user upgrades, `billingCycle` changes to match the new plan

> **📊 AUDIT — Security Enhancements (2026-02-18):**
> - 🔴 **STATUS**: Outdated
> - 📝 **REALITY CHECK**: Item 8 (Store API Key) was NEVER IMPLEMENTED. Store has no apiKey, apiKeyStatus, lastApiCall, or apiCallCount fields. Access control uses `Store.isAccessible Boolean @default(true)` instead. Item 9 (UsageRecord) — the entire UsageRecord model no longer exists, replaced by 4 specialized tables.
> - 🎯 **ACTION**: Rewrite — replace API key section with `isAccessible` approach, replace UsageRecord with 4-table architecture

### ✅ Security Enhancements Added:

8. **Store API Key:** Added for trial abuse prevention
   - Each store gets unique API key
   - Status tracking (ACTIVE/REVOKED/SUSPENDED)
   - Usage tracking (lastApiCall, apiCallCount)

9. **UsageRecord:** Fixed unique constraint to include periodEnd

---

## How to Check Subscription Type in Code

> **📊 AUDIT — Code Examples Section (2026-02-18):**
> - 🟡 **STATUS**: Partially matches — logic is correct but should also check for COMPLETING and PAUSED statuses
> - 📝 **REALITY CHECK**: The status checks work but don't account for `COMPLETING` (user still has access but subscription won't renew) or `PAUSED` status. Also should check `paymentGracePeriod` and `usageGracePeriod` flags for nuanced access decisions.
> - 🎯 **ACTION**: Update — add COMPLETING status handling and grace period checks
> - 💡 **ENHANCEMENT**: Add examples for checking `user.paymentGracePeriod`, `user.usageGracePeriod`, and `store.isAccessible`

```typescript
// Check if subscription is active (works for both trial and paid)
if (subscription.status === 'ACTIVE') {
  // User has access
}

// Check if user is on trial (Best approach - use trialUsed flag)
if (user.trialUsed === false) {
  // User is on trial
  const daysRemaining = Math.ceil(
    (subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  console.log(`Trial ends in ${daysRemaining} days`);
}

// Alternative: Check by plan name
if (subscription.plan.name === 'Trial') {
  // User is on trial plan
}

// Check if user is on paid plan
if (user.trialUsed === true && subscription.status === 'ACTIVE') {
  // User is paying customer
  console.log(`Next billing: ${subscription.currentPeriodEnd}`);
  console.log(`Plan: ${subscription.plan.displayName}`);
}
```

---

## Seed Data Template

> **📊 AUDIT — Seed Data Section (2026-02-18):**
> - 🔴 **STATUS**: Outdated — prices are completely wrong
> - 📝 **REALITY CHECK**: Actual pricing (from `src/components/pricing/pricing-data.ts`):
>   - Monthly: ₹999/month (doc says ₹3,500)
>   - Half-Yearly: ₹5,995 (doc says ₹19,000)
>   - Yearly: ₹11,988 (doc says ₹38,500)
>   - Trial plan: may not exist as a DB seed (trial is handled via `trialUsed` flag, not a separate plan)
>   - `maxStorageGB` not specified in seed data doc but defaults to 5 in schema
> - 🎯 **ACTION**: Update all prices to match actual pricing. Verify if Trial plan exists in DB or is handled differently.
> - 💡 **ENHANCEMENT**: Add `additionalLimits` JSON values (maxCategories, maxBillboards) to seed data

After migration, seed these plans:

```typescript
// prisma/seed.ts
const plans = [
  {
    name: "Trial",
    displayName: "7-Day Free Trial",
    description: "Full access to all features for 7 days",
    priceBeforeDiscount: 0,
    price: 0,
    billingCycle: "MONTHLY",  // Default cycle (not used during trial)
    features: {
      analytics: true,
      apiAccess: true,
      support: "email",
      advancedReports: true
    },
    maxProducts: 100,
    maxOrders: 1000,
    sortOrder: 0
  },
  {
    name: "Monthly",
    displayName: "Monthly Plan",
    description: "Perfect for growing businesses",
    priceBeforeDiscount: 5000,
    price: 3500,
    billingCycle: "MONTHLY",
    features: {
      analytics: true,
      apiAccess: true,
      support: "priority",
      advancedReports: true
    },
    maxProducts: null, // unlimited
    maxOrders: null,
    sortOrder: 1
  },
  {
    name: "HalfYearly",
    displayName: "6-Month Plan",
    description: "Save 10% with half-yearly billing",
    priceBeforeDiscount: 30000,
    price: 19000, // ~₹3,166/month (10% off)
    billingCycle: "HALFYEARLY",
    features: {
      analytics: true,
      apiAccess: true,
      support: "priority",
      advancedReports: true
    },
    maxProducts: null,
    maxOrders: null,
    sortOrder: 2
  },
  {
    name: "Yearly",
    displayName: "Yearly Plan",
    description: "Best value - save over ₹3,500 per year",
    priceBeforeDiscount: 55000,
    price: 38500,
    billingCycle: "YEARLY",
    features: {
      analytics: true,
      apiAccess: true,
      support: "priority",
      advancedReports: true,
      dedicatedSupport: true
    },
    maxProducts: null,
    maxOrders: null,
    sortOrder: 3
  }
];
```

---

## API Security Implementation

> **📊 AUDIT — API Security Section (2026-02-18):**
> - 🔴 **STATUS**: Outdated — API key system was never implemented
> - 📝 **REALITY CHECK**:
>   - Store has NO `apiKey`, `apiKeyStatus`, `lastApiCall`, `apiCallCount` fields in actual schema
>   - `X-API-Key` header system described here does NOT exist in codebase
>   - Middleware (`src/middleware.ts`) does NOT check subscription status — it's Clerk auth only (Edge Runtime limitation: can't use Prisma in middleware)
>   - Access control uses `Store.isAccessible Boolean @default(true)` — toggled when subscription expires
>   - The `validateStoreAccess()` function described below does NOT exist in the codebase
>   - API call tracking goes through Redis-first → DB flush pattern via `UsageApiCalls` table, not store-level counters
> - 🎯 **ACTION**: Rewrite entire section — replace API key approach with actual `isAccessible` + Clerk auth approach
> - 💡 **ENHANCEMENT**: Document the Edge Runtime constraint (why middleware can't check subscription) and the actual access control flow: Clerk auth → route handler → check `store.isAccessible` + `user.isSuspended`

### Frontend API Calls (Your NPX Package):

```typescript
// User's .env file
NEXT_PUBLIC_STORE_ID=store_abc123
NEXT_PUBLIC_API_KEY=cjld2cjxh0000qzrmn831i7rn  // This is the security key

// In their API calls
fetch(`https://yourdomain.com/api/public/products/${storeId}`, {
  headers: {
    'X-API-Key': process.env.NEXT_PUBLIC_API_KEY,
    'X-Store-ID': process.env.NEXT_PUBLIC_STORE_ID
  }
})
```

### Backend API Middleware:

```typescript
// middleware.ts or API route
export async function validateStoreAccess(apiKey: string, storeId: string) {
  // 1. Find store by apiKey
  const store = await prisma.store.findUnique({
    where: { apiKey },
    include: { 
      user: { 
        include: { 
          subscription: { 
            include: { plan: true } 
          } 
        } 
      } 
    }
  });
  
  if (!store) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  // 2. Check if storeId matches
  if (store.id !== storeId) {
    return { valid: false, error: 'Store ID mismatch' };
  }
  
  // 3. Check API key status
  if (store.apiKeyStatus !== 'ACTIVE') {
    return { valid: false, error: 'API key revoked or suspended' };
  }
  
  // 4. Check subscription status
  const subscription = store.user.subscription;
  if (!subscription) {
    return { valid: false, error: 'No subscription found' };
  }
  
  // Check if subscription is active (includes both trial and paid plans)
  if (subscription.status !== 'ACTIVE') {
    return { valid: false, error: 'Subscription expired or inactive' };
  }
  
  // 5. Check if trial/subscription expired
  if (new Date() > subscription.currentPeriodEnd) {
    return { valid: false, error: 'Subscription period ended' };
  }
  
  // 6. Update API usage tracking
  await prisma.store.update({
    where: { id: storeId },
    data: {
      lastApiCall: new Date(),
      apiCallCount: { increment: 1 }
    }
  });
  
  return { valid: true, store, subscription };
}
```

### When Subscription Expires:

```typescript
// In cron job that expires subscriptions
await prisma.store.updateMany({
  where: { userId: expiredUser.id },
  data: { apiKeyStatus: 'REVOKED' }
});
```

Now their frontend will get 401 errors and can't use your API anymore! 🔒

---

## Trial Abuse Prevention Summary

> **📊 AUDIT — Trial Abuse Prevention Section (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY CHECK**:
>   - Item 1 ✅ CORRECT: `trialUsed Boolean @default(false)` exists on User model
>   - Item 2 ❌ WRONG: API Key system NEVER IMPLEMENTED. No `apiKey` on Store
>   - Item 3 ❌ PARTIALLY WRONG: Subscription validation happens in route handlers, NOT middleware (Edge Runtime limitation). Uses `store.isAccessible` flag
>   - Item 4 ❌ WRONG approach: API calls tracked per USER in `UsageApiCalls` table with Redis-first pattern, NOT per store with `apiCallCount`
>   - Current trial protection is basic: only `trialUsed` flag. The "prevents" claims about API keys are invalid since they don't exist.
> - 🎯 **ACTION**: Rewrite — remove API key claims, document actual protection (trialUsed + isAccessible + route-level checks)
> - 💡 **ENHANCEMENT**: The "What You Can Add Later" items are still valid improvement ideas

### What You're Implementing:

1. ✅ **Email Uniqueness:** One trial per email (via `trialUsed` flag)
2. ✅ **API Key System:** Each store has unique key, revoked when expired
3. ✅ **Subscription Validation:** Every API call checks subscription status
4. ✅ **Usage Tracking:** Monitor API calls per store

### What This Prevents:

- ❌ User can't reuse old store's API after creating new account
- ❌ User can't share storeId with others (API key required)
- ❌ User can't use same email for multiple trials
- ✅ If user creates new email, they get ONE more trial (acceptable)

### What You Can Add Later:

- Payment method verification (harder to abuse)
- IP-based limits (3 trials per IP in 30 days)
- Device fingerprinting
- Manual review for suspicious patterns

---

## Next Steps

> **📊 AUDIT — Next Steps Section (2026-02-18):**
> - 🟡 **STATUS**: Partially matches — steps 1-4 were done, steps 5-6 are invalid
> - 📝 **REALITY CHECK**:
>   - Steps 1-4: ✅ DONE — schema was migrated and plans seeded
>   - Step 5: ❌ INVALID — no API key validation exists; access control uses `store.isAccessible`
>   - Step 6: ❌ INVALID — no API key concept in public API
> - 🎯 **ACTION**: Update steps 5-6 to reflect actual implementation approach

1. ✅ Copy this schema to your `prisma/schema.prisma` (replace subscription section)
2. ✅ Run: `npx prisma migrate dev --name add_subscription_system`
3. ✅ Create seed file with 4 plans
4. ✅ Run: `npx prisma db seed`
5. ✅ Implement API key validation in your public API routes
6. ✅ Update your NPX package docs to require API key

---

## Questions Answered

> **📊 AUDIT — Questions Answered Section (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY CHECK**:
>   - Store name uniqueness → answer mentions API key (doesn't exist). Real answer: `isAccessible` flag + Clerk auth
>   - Trial abuse → answer mentions API key. Real answer: `trialUsed` flag only
>   - Payment gateway flexibility → answer says generic. Reality: Razorpay-specific fields (`razorpayOrderId`, `razorpayPaymentId`, etc.)
>   - Invoice model → correct, `invoiceUrl` on Payment
> - 🎯 **ACTION**: Update answers to reflect actual implementation

| Question | Answer |
|----------|--------|
| Store name uniqueness? | Not needed - API key system prevents abuse |
| Multiple stores per user? | Later - keep @unique for now |
| How to prevent trial abuse? | API key per store + subscription validation |
| Invoice model now? | No - just invoiceUrl field for now |
| Payment gateway flexibility? | Yes - generic fields implemented |

**Status:** ✅ Ready for implementation!

**This schema is production-ready and addresses all security concerns.**
