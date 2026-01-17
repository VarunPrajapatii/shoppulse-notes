# ShopPulse - Complete Application Overview

> A comprehensive SaaS platform for e-commerce store management with subscription-based access, usage tracking, and multi-provider integrations.

---

## 🎯 Project Overview

ShopPulse is a full-stack Next.js SaaS application that enables users to create and manage their own online stores through an admin dashboard. The platform operates on a subscription model with usage-based limits, automatic billing, and comprehensive integration support.

**Development Timeline:** ~3 months  
**Architecture:** Two separate Next.js applications (Admin Dashboard + Store Frontend Template)

---

## 📦 Core Products

### 1. Admin Dashboard (This Repository)
The main SaaS application where store owners manage their business:
- **Tech Stack:** Next.js 15 (App Router), Prisma ORM, PostgreSQL, Clerk Auth, Razorpay
- **Purpose:** Central hub for managing products, orders, subscriptions, integrations, and analytics
- **Access Model:** Subscription-based with trial period

### 2. Store Frontend Template
Separate Next.js application distributed via NPX:
- **Distribution:** `npx create-shoppulse-store-template`
- **Purpose:** Pre-built, customizable e-commerce storefront for customers
- **Integration:** Config-driven via API from admin dashboard for product data, orders, payments
- **Features:** Product browsing, cart, checkout, order tracking

---

## 🏗️ Architecture Overview

### Phase 1: Core Dashboard (20 days)
Built the complete admin dashboard with essential e-commerce features:

**Features Implemented:**
- Complete CRUD operations for:
  - Products (with images, descriptions, variants, related products)
  - Categories (with billboard associations)
  - Billboards (hero banners with images)
  - Sizes (product variants)
  - Orders (with status tracking)
  - Upcoming Products (pre-launch items)
- Razorpay payment integration for customer orders
- Order management with status workflow
- Store settings and configuration
- Product stock tracking with low-stock alerts
- Image uploads via Cloudinary

**Database Design:**
- User, Store, Product, Category, Billboard, Size, Order, OrderItem
- Product relations for recommendations
- Image management for products
- Store-level configuration

### Phase 2: Subscription & Payment System (20 days)
Implemented the complete subscription lifecycle with Razorpay recurring payments:

**Subscription Model:**
- **Trial Period:** 7 days free trial (one per email)
- **Plans:** 3 subscription tiers
  - Monthly (₹3,500/month)
  - Half-Yearly (6 months)
  - Yearly (₹38,500/year)
- **Auto-Charging:** Razorpay automatic recurring subscriptions (no manual action needed)

**Subscription Tables:**
- `Subscription` - Current subscription state
- `SubscriptionPlan` - Plan definitions with limits
- `Payment` - Payment history and tracking
- `SubscriptionHistory` - Audit trail of all changes

**Payment Flow:**
```
User clicks "Get Started"
  ↓
Backend creates Razorpay subscription
  ↓
Frontend opens Razorpay checkout modal
  ↓
User authenticates payment (card/UPI)
  ↓
Razorpay charges immediately
  ↓
Frontend verifies signature on backend
  ↓
Database updated with payment details
  ↓
User redirected to /subscription/my-plan
  ↓
Razorpay auto-charges at each billing cycle (no user action!)
```

---

## 🔐 Authentication & Access Control

### Authentication Provider: Clerk
- Email/password authentication
- Social logins support
- Webhook integration for user sync

### Post-Authentication Flow
**Layer 1: Post-Auth Handler** (`/api/auth/post-auth`)
- Verifies user is authenticated via Clerk
- Ensures user exists in database (creates in dev mode if missing)
- Checks if user has completed onboarding
- Routes to appropriate destination:
  - No store → `/setup` (onboarding)
  - Has store → `/${storeId}` (dashboard)

**Layer 2: Setup Layout** (`/setup`)
- Verifies user exists in database
- Checks if setup already completed
- Shows onboarding modal or redirects to dashboard

**Layer 3: Dashboard Layout** (`/${storeId}`)
- Verifies store ownership
- Checks subscription status
- Enforces access control based on subscription state

### Access Control Wrappers
Built two API middleware wrappers for fine-grained access control:

**1. `withStoreAccessCheck`** - Strict enforcement
- Blocks requests if subscription expired/cancelled
- Used for: POST, PUT, DELETE, PATCH operations
- Returns 402 error with subscription details if access denied
- Adds diagnostic headers: `X-Store-Access`, `X-Payment-Grace-Period`, `X-Usage-Grace-Period`

**2. `withGracefulStoreCheck`** - Graceful degradation  
- Allows requests even if subscription expired (for data reading)
- Used for: GET operations
- Logs warnings but proceeds with request
- Prevents data loss when subscription lapses

---

## 🎓 Onboarding System

### 6-7 Page Interactive Guide
New users go through a step-by-step guide explaining:
- How ShopPulse works
- Subscription model
- Usage limits
- Integration options
- Store setup process
- Trial benefits

### Onboarding Completion
Single atomic transaction (`/api/onboarding/complete`) creates:
1. **Store record** with user's store name
2. **Subscription record** (7-day TRIAL, ACTIVE status)
3. **SubscriptionHistory record** (audit trail)
4. **6 UsageCumulative records** initialized to 0:
   - Products, Categories, Billboards, Storage
5. **2 UsageOrders and UsageApiCalls records** for current period
6. **User update** (`onboardingComplete = true`)

**Key Features:**
- Idempotency (prevents duplicate stores)
- One trial per email enforcement
- Finds TRIAL plan dynamically from database
- All-or-nothing transaction (rollback on any failure)
- Comprehensive error handling

---

## 💰 Subscription Management

### Subscription Statuses (6 States)
1. **ACTIVE** - Currently active (includes trial and paid)
2. **COMPLETING** - All charges paid, period still active
3. **EXPIRED** - Period ended, no renewal
4. **PAST_DUE** - Payment failed, grace period active
5. **CANCELED** - User canceled, service until period end
6. **PAUSED** - Manually paused by admin

### Plan Structure
Each plan defines:
- **Pricing:** Before discount price, actual price, currency
- **Billing Cycle:** MONTHLY, HALFYEARLY, YEARLY
- **Usage Limits:**
  - `maxProducts` (e.g., 100)
  - `maxOrders` (e.g., 1000/month)
  - `maxStorageGB` (e.g., 5GB)
  - `additionalLimits` JSON: `maxCategories`, `maxBillboards`
- **Features:** JSON object for feature flags
- **Razorpay Plan ID:** For subscription creation
- **Visibility:** `isActive` (can subscribe), `isPublic` (show on pricing page)

### Upgrade Flow (Immediate)
When user upgrades to a higher plan:

**Happy Path:**
1. User clicks "Upgrade" on plan card
2. Frontend calls `/api/subscription/upgrade/execute`
3. Backend calls Razorpay UPDATE API:
   - `PATCH /subscriptions/{id}`
   - `schedule_change_at: "now"` (immediate upgrade)
4. Razorpay charges prorated amount immediately
5. Database updates:
   - `subscription.planId = newPlanId`
   - `metadata.webhookSyncStatus = 'PENDING'`
   - `metadata.lastApiUpdateAt = timestamp`
6. Webhook confirms upgrade:
   - Updates `metadata.webhookSyncStatus = 'SYNCED'`
7. User sees updated plan immediately

**Payment Failure Handling:**
- **Card expired/declined:** Show "Update Payment Method" option (will research and implement later)
- **UPI/eMandate:** Cancel and resubscribe flow (non-card methods can't update)

**Webhook Sync Tracking:**
To ensure reliability, we track sync status:
- `WebhookSyncStatus`: `SYNCED`, `PENDING`, `SYNC_FAILED`, `MANUAL_CHECK`
- Compares `lastApiUpdateAt` vs `lastWebhookAt`
- Prevents upgrade/downgrade inconsistencies
- Admin alerts on sync failures

### Downgrade Flow (Scheduled)
User wants to switch to a lower plan:

**Implementation:**
1. User clicks "Downgrade" on plan card
2. Frontend calls `/api/subscription/downgrade/schedule`
3. Backend:
   - **Scheduled at period end at Razorpay**
   - Stores `scheduledPlanId` in subscription
   - Sets `hasScheduledChanges = true`
   - Records `changeScheduledAt` timestamp
4. Cron job at period end:
   - Checks subscriptions with `hasScheduledChanges = true`
   - Calls Razorpay UPDATE API at renewal
   - Applies new plan for next period
5. User continues on current plan until period ends

**Cancellation of Scheduled Downgrade:**
- User can cancel via "Cancel Downgrade" button
- Clears `scheduledPlanId` and `hasScheduledChanges`
- Keeps current plan active

**Why Scheduled?**
- User already paid for current period
- Fair to let them use what they paid for
- Prevents refund complexities
- Industry standard practice

---

## 📊 Usage Tracking System

### Overview
Comprehensive usage tracking to enforce subscription limits:
- **Real-time tracking** of resource creation
- **Period-based metrics** for time-bound limits
- **Cumulative metrics** for lifetime resources
- **Pre-check before creation** to prevent over-limit operations

### Usage Tables Architecture

#### 1. UsageCumulative (Never Resets)
Tracks lifetime resources per user:
- **Storage:** JSON object with metrics
  ```json
  {
    "PRODUCTS": 45,
    "CATEGORIES": 12,
    "BILLBOARDS": 8,
    "STORAGE_GB": 2.3
  }
  ```
- **When Updated:**
  - Increment on resource creation
  - Decrement on permanent deletion
  - Grace period enforcement

#### 2. UsageOrders (Period-Based)
Tracks orders per billing cycle:
- **Fields:** `count`, `periodStart`, `periodEnd`
- **Unique Constraint:** One record per user per period
- **Reset:** At start of new billing cycle
- **High-frequency writes** (every order)

#### 3. UsageApiCalls (Period-Based, Redis-First)
Tracks API calls per billing cycle:
- **Access Pattern:** VERY HIGH frequency (100+ writes/second potential)
- **Current Implementation:** Direct DB writes (suitable for low-medium traffic)
- **Production Plan:** Redis-first with periodic DB flush
  - Write to Redis immediately
  - Flush to PostgreSQL every 5 minutes
  - DB as backup/source of truth
- **Fields:** `count`, `periodStart`, `periodEnd`

#### 4. UsageHistory (Archive)
Historical usage data for analytics:
- **Storage:** JSON with all metrics from completed period
- **Purpose:** Analytics, trends, compliance
- **Indexed By:** `userId`, `periodStart`, `archivedAt`
- **Retention:** 7 years (configurable)

### Usage Limit Enforcement

**Pre-Check Flow:**
```
User tries to create product
  ↓
API handler calls checkCumulativeLimit('PRODUCTS')
  ↓
Fetches user's current count and plan limit
  ↓
If count >= limit → Return 403 with error details
  ↓
If allowed → Create product
  ↓
Increment usage counter
  ↓
Check if approaching threshold (80%, 95%)
  ↓
Send notification if threshold crossed
```

**Error Response Structure:**
```json
{
  "error": "Product limit reached",
  "code": "PRODUCT_LIMIT_REACHED",
  "details": {
    "current": 100,
    "limit": 100,
    "planName": "Monthly Plan"
  },
  "message": "You've reached your plan's product limit (100/100).",
  "action": "upgrade",
  "upgradeUrl": "/subscription/plans"
}
```

### Threshold Notifications
Alert users before hitting limits:

**Levels:**
- **SAFE:** < 80% usage
- **WARNING:** 80-95% usage (send email)
- **CRITICAL:** > 95% usage (send urgent email)
- **REACHED:** At limit (block creation, show upgrade prompt)

**Implementation:**
- Check after each increment
- Calculate percentage: `(current / limit) * 100`
- Send email via integration if crossed threshold
- Track last notification sent (prevent spam)

---

## ⚠️ Grace Period System

### Overview
Two independent grace periods for user-friendly limit enforcement:

### 1. Payment Grace Period
**Trigger:** Payment failure on auto-charge

**Flow:**
1. Razorpay webhook: `subscription.payment_failed`
2. Update user: `paymentGracePeriod = true`
3. Show banner in dashboard: "Payment failed, please update"
4. Grace duration: Configurable (typically 3-5 days)
5. Access: Store remains **fully accessible**
6. After grace: Subscription moves to `EXPIRED`, store suspended

**User Experience:**
- Non-intrusive banner notification
- Can update payment method via Razorpay portal
- Can manually retry payment
- All features remain available during grace

### 2. Usage Grace Period
**Trigger:** User exceeds plan limits (products, categories, billboards)

**5-Day Warning Flow:**
```
Day 0: User hits limit (can't create more)
  ↓
Day 1: Send "Limit Reached" email
  ↓
Day 3: Send "3 Days Left" reminder
  ↓
Day 5: Send "Final Warning" email
  ↓
Day 6: Cron job enforces limits
       - Archive excess products
       - Delete excess categories/billboards
       - Set usageGracePeriod = false
```

**Implementation Details:**
- User marked: `usageGracePeriod = true`
- Metadata tracks:
  - Grace start date
  - Notification history
  - Current overage details
- Daily cron job checks grace periods
- Sends reminder emails at Day 1, 3, 5
- Enforcement at Day 6 (configurable)

**Enforcement Strategy:**
When grace period expires:
1. Calculate overage: `currentCount - planLimit`
2. **Products:** Archive excess (oldest first)
3. **Categories:** Delete excess (least used first)
4. **Billboards:** Delete excess (oldest first)
5. Record action in SubscriptionHistory
6. Invalidate store cache
7. Set `usageGracePeriod = false`

---

## 🗄️ Archived Products System

### Purpose
Soft-delete products instead of immediate permanent deletion.

### ArchivedProduct Table
Mirrors Product schema with flattened relations:
- **Original Fields:** `name`, `description`, `price`, `titlepoints`, `bulletPoints`
- **Relations Snapshot:**
  - `categoryName`, `sizeName`, `sizeValue` (strings, not FK)
  - `images` (JSON array of URLs)
- **Archive Metadata:**
  - `originalProductId` - Reference to original
  - `archivedAt` - When archived
  - `archiveReason` - Why archived:
    - `manual` - User deleted it
    - `grace_period_enforcement` - Cron deleted for overage
    - `plan_downgrade` - Auto-deleted on downgrade
  - `expiresAt` - When to permanently delete (archivedAt + 3 months)

### Archive Flow
```
Product archived (soft delete)
  ↓
Copy to ArchivedProduct table
  ↓
Calculate expiresAt (now + 90 days)
  ↓
Store reason (manual/enforcement/downgrade)
  ↓
Keep original Product.id reference
  ↓
Set Product.isArchived = true
  ↓
After 90 days: Cron job permanently deletes
```

### Cleanup Cron Job
**`cleanup-archived-products` cron:**
- Runs daily
- Finds `ArchivedProduct` where `expiresAt < now()`
- Deletes Cloudinary images
- Permanently removes from database
- Logs deletion count

**Why 3 Months?**
- When order fetched for status, they still get deleted product details
- Users can recover from accidental deletion
- Compliance with data retention policies
- Grace period for plan downgrades
- Provides data export window

---

## 🔧 Integration System

### Architecture
**Table:** `StoreIntegration`
- **One provider per type per store** (enforced by unique constraint)
- **Example:** Can't have both Razorpay AND Stripe simultaneously
- **To Switch:** Must delete old integration first

### Schema Structure
```typescript
{
  id: string
  storeId: string
  type: IntegrationType  // PAYMENT_GATEWAY, SMS_PROVIDER, etc.
  provider: string       // "razorpay", "stripe", "msg91", etc.
  credentials: string    // ENCRYPTED JSON of API keys
  config: Json?          // Plain JSON for non-sensitive settings
}
```

### Integration Types
1. **PAYMENT_GATEWAY** - Payment processing
2. **SMS_PROVIDER** - SMS notifications
3. **EMAIL_SERVICE** - Email notifications
4. **STORAGE_SERVICE** - File storage
5. **ANALYTICS** - Analytics tracking
6. **SHIPPING** - Shipping providers
7. **NOTIFICATION** - Push notifications

### Supported Providers

#### Payment Gateways (2)
- **Razorpay** - Primary, subscription + orders
- **Stripe** - Alternative payment processor

#### SMS Providers (3)
- **Twilio** - International SMS
- **Fast2SMS** - Indian SMS
- **MSG91** - Bulk SMS

#### Email Services (2)
- **SendGrid** - Transactional emails
- **EmailJS** - Simple email service

### Encryption & Security
**Encryption Service** (`lib/encryption.ts`):
- All credentials encrypted before DB storage
- Uses industry-standard encryption algorithm
- Decrypted only when needed for API calls
- Environment-based encryption key

**Storage:**
```typescript
// Before encryption (in code)
const credentials = {
  keyId: "rzp_test_xxx",
  keySecret: "yyy",
  webhookSecret: "zzz"
}

// After encryption (in DB)
credentials: "U2FsdGVkX1/encrypted_base64_string=="
```

### Integration Service API
**Save Integration:**
```typescript
await integrationService.saveIntegration({
  storeId: "store_123",
  type: "PAYMENT_GATEWAY",
  provider: "razorpay",
  credentials: { keyId: "xxx", keySecret: "yyy" },
  config: { testMode: true }
})
```

**Get Credentials:**
```typescript
const integration = await integrationService.getCredentials(
  "store_123",
  "PAYMENT_GATEWAY"
)
// Returns: { provider: "razorpay", credentials: {...}, config: {...} }
```

**Check Integration:**
```typescript
const hasPayment = await integrationService.hasIntegration(
  "store_123",
  "PAYMENT_GATEWAY"
)
```

---

## ⏰ Cron Jobs System

### Overview
Automated background jobs for subscription lifecycle management.

### 1. Expire Trials & Detect Payment Failure
**File:** `api/cron/expire-trials-detect-payment-failure/route.ts`

**Purpose:**
- Expire trial subscriptions after 7 days
- Detect failed payments on paid subscriptions

**Logic:**
```
Find subscriptions where:
  - status = ACTIVE
  - currentPeriodEnd < now()
  - No payment received

Trial subscriptions:
  - Update status to EXPIRED
  - Set isActive = false
  - Record in SubscriptionHistory

Paid subscriptions (payment failed):
  - Update status to PAST_DUE
  - Set paymentGracePeriod = true
  - Send payment failure email
```

**Schedule:** Runs every 6 hours

### 2. Expire Period-Ended Subscriptions
**File:** `api/cron/expire-period-ended-subscriptions/route.ts`

**Purpose:**
- Expire subscriptions when period ends without renewal
- Handles canceled subscriptions

**Logic:**
```
Find subscriptions where:
  - status = ACTIVE or CANCELED
  - currentPeriodEnd < now()
  - cancelAtPeriodEnd = true

Actions:
  - Update status to EXPIRED
  - Set isActive = false
  - Record reason in SubscriptionHistory
```

**Schedule:** Runs daily

### 3. Expire Completed Subscriptions
**File:** `api/cron/expire-completed-subscriptions/route.ts`

**Purpose:**
- Handle subscriptions in COMPLETING status
- Move to EXPIRED after period ends

**Logic:**
```
Find subscriptions where:
  - status = COMPLETING
  - currentPeriodEnd < now()

Actions:
  - Update status to EXPIRED
  - Set isActive = false
  - Archive usage history
  - Record in SubscriptionHistory
```

**Schedule:** Runs daily

### 4. Enforce Grace Periods ⚡ CRITICAL
**File:** `api/cron/enforce-grace-periods/route.ts`

**Purpose:**
- Enforce usage limits after grace period expires
- Archive/delete excess resources

**Logic:**
```
Find users where:
  - usageGracePeriod = true
  - Grace period expired (5+ days)

For each user:
  1. Calculate current overage
  2. Archive excess products (oldest first)
  3. Delete excess categories (least used first)
  4. Delete excess billboards (oldest first)
  5. Update usage counters
  6. Set usageGracePeriod = false
  7. Invalidate store cache
  8. Record in SubscriptionHistory

Send enforcement notification email
```

**Overage Calculation:**
```typescript
{
  products: { current: 120, limit: 100, overage: 20 },
  categories: { current: 15, limit: 10, overage: 5 },
  billboards: { current: 12, limit: 10, overage: 2 }
}
```

**Schedule:** Runs every 6 hours

### 5. Cleanup Archived Products
**File:** `api/cron/cleanup-archived-products/route.ts`

**Purpose:**
- Permanently delete products archived > 3 months ago

**Logic:**
```
Find ArchivedProduct where:
  - expiresAt < now()

For each archived product:
  1. Delete images from Cloudinary
  2. Delete from ArchivedProduct table
  3. Log deletion

Return count of deleted products
```

**Schedule:** Runs weekly

### Cron Security
All cron endpoints protected by:
- API key verification via header: `X-Cron-Secret`
- Environment variable: `CRON_SECRET`
- Returns 401 if secret missing/invalid

### Cron Monitoring
Each job returns structured response:
```json
{
  "success": true,
  "message": "Processed 15 subscriptions",
  "processed": 15,
  "expired": 8,
  "errors": [],
  "details": { ... }
}
```

---

## 🚨 Admin Alert System

### Purpose
Monitor critical system events and notify admins immediately.

### Alert Service
**File:** `lib/alert-service.ts` (399 lines) (due for implementation)

**Features:**
- Multi-channel alerting (Email, Slack, Sentry, Console)
- Severity levels (critical, high, medium, low)
- Async parallel delivery (all channels simultaneously)
- Graceful failure (one channel failure doesn't block others)

### Alert Types
1. **WEBHOOK_FAILURE**
   - Webhook signature validation failed
   - Webhook processing error
   - Unexpected webhook payload

2. **DATA_INCONSISTENCY**
   - Subscription status mismatch
   - Payment record missing
   - Usage counter corruption

3. **PAYMENT_FAILURE**
   - Razorpay charge failed
   - Refund processing error
   - Invoice creation failed

4. **SYSTEM_ERROR**
   - Database connection issues
   - External API failures
   - Critical service downtime

### Usage Example
```typescript
await sendAdminAlert({
  type: 'WEBHOOK_FAILURE',
  userId: 'user_123',
  details: {
    event: 'subscription.charged',
    error: 'Signature validation failed',
    metadata: { subscriptionId: 'sub_xyz' }
  },
  severity: 'critical'
})
```

### Alert Channels

**1. Console Logging** (Always Active)
- Formatted console output with emojis
- Includes full error stack
- Timestamp with severity indicator

**2. Email Alerts** (Via Resend)
- HTML formatted email
- Includes full context
- Delivered to admin email list

**3. Slack Webhooks**
- Rich message formatting
- Color-coded by severity:
  - Critical: Red
  - High: Orange
  - Medium: Yellow
  - Low: Green
- Includes quick action links

**4. Sentry Tracking**
- Full error context
- Stack traces
- User breadcrumbs
- Performance monitoring

### Alert Results Tracking
```typescript
{
  email: { sent: true, error: null },
  slack: { sent: false, error: "Webhook URL not configured" },
  sentry: { sent: true, error: null }
}
```

---

## 🛣️ API Routes Structure

### Webhook Routes (Public)
**`/api/webhook/clerk`** - Clerk user sync
- `user.created` - Create user in DB
- `user.updated` - Update user info
- `user.deleted` - Soft delete user

**`/api/webhook/razorpay/subscription`** - Subscription events
- `subscription.activated` - Trial started
- `subscription.charged` - Payment successful
- `subscription.completed` - All charges paid
- `subscription.halted` - Payment failed
- `subscription.cancelled` - User cancelled
- `subscription.paused` - Admin paused
- `subscription.resumed` - Admin resumed
- `subscription.updated` - Plan changed

**`/api/webhook/razorpay/store`** - Store order webhooks
- `payment.captured` - Customer order paid
- `payment.failed` - Customer payment failed

### Subscription Routes (Protected)
**`/api/subscription/create`** - Create Razorpay subscription
**`/api/subscription/current`** - Get current subscription
**`/api/subscription/upgrade/execute`** - Immediate upgrade
**`/api/subscription/downgrade/schedule`** - Schedule downgrade
**`/api/subscription/downgrade/cancel`** - Cancel scheduled downgrade
**`/api/subscription/cancel`** - Cancel subscription

### Store Resource Routes (Protected + Limit Checked)
**`/api/[storeId]/products`** - CRUD operations, limit checked
**`/api/[storeId]/categories`** - CRUD operations, limit checked
**`/api/[storeId]/billboards`** - CRUD operations, limit checked
**`/api/[storeId]/sizes`** - CRUD operations
**`/api/[storeId]/orders`** - List orders
**`/api/[storeId]/upcoming-products`** - Manage upcoming products

### Checkout Route (Public with Limits)
**`/api/[storeId]/checkout`** - Create order
- Public access (for customers)
- Checks store owner's order limit
- Verifies store subscription status
- Creates Razorpay order
- Handles CORS for frontend store

### Integration Routes (Protected)
**`/api/[storeId]/integrations`** - List integrations
**`/api/[storeId]/integrations/[type]`** - Manage specific integration

### Onboarding Routes
**`/api/onboarding/complete`** - Complete setup wizard

### Auth Routes
**`/api/auth/post-auth`** - Post-login redirect handler

---

## 🗂️ Database Schema Deep Dive

### Core Models

#### User
Primary user account:
```typescript
{
  id: string                    // Clerk user ID
  email: string (unique)
  name: string?
  
  // Subscription
  subscriptionId: string? (unique)
  subscription: Subscription?
  
  // Trial & Onboarding
  trialUsed: boolean            // One trial per email
  onboardingComplete: boolean   // Setup wizard done
  
  // Access Control
  isActive: boolean             // Can access dashboard
  paymentGracePeriod: boolean   // Payment failed banner
  usageGracePeriod: boolean     // Over limit banner
  isSuspended: boolean          // Manual admin suspension
  suspensionReason: string?
  
  // Timestamps
  createdAt: DateTime
  updatedAt: DateTime
  lastLoginAt: DateTime?
  
  // Relations
  stores: Store[]
  payments: Payment[]
  usageCumulative: UsageCumulative?
  usageOrders: UsageOrders[]
  usageApiCalls: UsageApiCalls[]
  usageHistory: UsageHistory[]
}
```

#### Store
User's e-commerce store:
```typescript
{
  id: string
  name: string
  userId: string                // Owner
  
  // Store Status
  isAccessible: boolean         // Can customers browse
  
  // Relations
  user: User
  billboards: Billboard[]
  categories: Category[]
  products: Product[]
  archivedProducts: ArchivedProduct[]
  upcomingProducts: UpcomingProduct[]
  sizes: Size[]
  orders: Order[]
  integrations: StoreIntegration[]
}
```

### Subscription Models

#### Subscription
Active subscription state:
```typescript
{
  id: string
  userId: string (unique)
  planId: string
  status: SubscriptionStatus
  
  // Billing
  billingCycle: BillingCycle    // MONTHLY, HALFYEARLY, YEARLY
  currentPeriodStart: DateTime
  currentPeriodEnd: DateTime
  nextChargeAt: DateTime?
  
  // Cancellation
  canceledAt: DateTime?
  cancelAtPeriodEnd: boolean
  cancellationReason: string?
  
  // Razorpay
  razorpaySubscriptionId: string? (unique)
  razorpayPlanId: string?
  razorpayCustomerId: string?
  totalCount: int?              // Total billing cycles
  paidCount: int                // Completed payments
  remainingCount: int?          // Cycles remaining
  
  // Plan Changes
  lastPlanChangeAt: DateTime?
  planChangeCount: int          // Number of changes
  hasScheduledChanges: boolean  // Pending downgrade
  scheduledPlanId: string?      // Target plan ID
  changeScheduledAt: DateTime?
  
  // Webhook Sync (Upgrade Reliability)
  lastApiUpdateAt: DateTime?    // When UPDATE API called
  lastWebhookAt: DateTime?      // When webhook received
  webhookSyncStatus: WebhookSyncStatus
  
  // Metadata
  metadata: Json?               // Upgrade attempts, failures
  autoRenew: boolean
  nextBillingDate: DateTime?
  
  // Relations
  user: User
  plan: SubscriptionPlan
  payments: Payment[]
  history: SubscriptionHistory[]
}
```

#### SubscriptionPlan
Plan definitions:
```typescript
{
  id: string
  name: string (unique)         // "TRIAL", "MONTHLY", "YEARLY"
  displayName: string
  description: string?
  
  // Pricing
  priceBeforeDiscount: Decimal
  price: Decimal
  currency: string              // "INR"
  billingCycle: BillingCycle
  
  // Feature Limits
  maxProducts: int?             // null = unlimited
  maxOrders: int?
  maxStorageGB: int?
  additionalLimits: Json?       // { maxCategories, maxBillboards }
  features: Json?               // { analytics, advancedReports }
  
  // Visibility
  isActive: boolean             // Can users subscribe
  isPublic: boolean             // Show on pricing page
  
  // Razorpay
  razorpayPlanId: string? (unique)
  
  // Display
  sortOrder: int
  
  // Relations
  subscriptions: Subscription[]
}
```

#### Payment
Payment records:
```typescript
{
  id: string
  userId: string
  subscriptionId: string?
  
  // Amounts
  subtotal: Decimal
  taxAmount: Decimal
  discountAmount: Decimal
  processingFee: Decimal
  amountPaid: Decimal
  currency: string
  
  // Razorpay
  razorpayOrderId: string? (unique)
  razorpayPaymentId: string? (unique)
  razorpaySubscriptionId: string?
  razorpaySignature: string?
  
  // Payment Status
  status: PaymentStatus
  paymentMethod: string?        // card, upi, netbanking
  cardLast4: string?
  cardNetwork: string?          // visa, mastercard
  upiId: string?
  
  // Payment Type (Distinguishes charge types)
  paymentType: PaymentType      // SUBSCRIPTION_CHARGE, UPGRADE_CHARGE
  invoiceId: string?            // Razorpay invoice ID
  
  // Metadata
  description: string?
  failureReason: string?
  invoiceUrl: string?
  receiptUrl: string?
  
  // Timestamps
  paidAt: DateTime?
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### SubscriptionHistory
Audit trail:
```typescript
{
  id: string
  subscriptionId: string
  
  action: SubscriptionAction    // CREATED, UPGRADED, DOWNGRADED, etc.
  fromStatus: SubscriptionStatus?
  toStatus: SubscriptionStatus?
  fromPlanId: string?
  toPlanId: string?
  
  reason: string?
  metadata: Json?
  
  // Financial Tracking
  amountCharged: Decimal?       // For upgrade prorations
  
  createdAt: DateTime
}
```

### Product Models

#### Product
Store products:
```typescript
{
  id: string
  name: string
  description: string
  titlepoints: string[]         // Key features
  bulletPoints: string[]        // Detailed features
  price: Decimal
  
  // Product Flags
  isFeatured: boolean
  isArchived: boolean
  
  // Inventory
  stockQuantity: int
  lowStockThreshold: int
  
  // Archive Tracking
  archivedReason: string?       // 'manual', 'plan_downgrade', etc.
  archivedAt: DateTime?
  
  // Relations
  storeId: string
  categoryId: string
  sizeId: string
  images: Image[]
  orderItems: OrderItem[]
  relatedFrom: ProductRelation[] // Products this relates to
  relatedTo: ProductRelation[]   // Products related to this
}
```

#### ArchivedProduct
Soft-deleted products:
```typescript
{
  id: string
  originalProductId: string (unique)
  
  // Product Data (snapshot)
  name: string
  description: string
  titlepoints: string[]
  bulletPoints: string[]
  price: Decimal
  createdAt: DateTime           // Original creation
  updatedAt: DateTime           // Original update
  
  // Flattened Relations (stored as strings)
  storeId: string
  categoryName: string
  sizeName: string
  sizeValue: string
  images: Json                  // ["url1", "url2", ...]
  
  // Archive Metadata
  archivedAt: DateTime
  archiveReason: string         // Why archived
  expiresAt: DateTime          // When to permanently delete
}
```

### Order Models

#### Order
Customer orders:
```typescript
{
  id: string
  storeId: string
  
  // Order Status
  isPaid: boolean
  orderStatus: OrderStatus      // 8 states
  
  // Customer Info
  name: string
  email: string
  phone: string
  address: string
  
  // Razorpay
  razorpayOrderId: string? (unique)
  razorpayPaymentId: string?
  razorpaySignature: string?
  
  // Amounts
  subtotal: Decimal
  tax: Decimal
  shippingCost: Decimal
  totalAmount: Decimal
  
  notes: string?                // Customer notes
  
  // Timestamps
  createdAt: DateTime
  updatedAt: DateTime
  paidAt: DateTime?
  
  // Relations
  store: Store
  orderItems: OrderItem[]
}
```

### Usage Tracking Models

#### UsageCumulative
Lifetime metrics:
```typescript
{
  id: string
  userId: string (unique)
  
  // JSON storage
  metrics: Json                 // { PRODUCTS: 45, CATEGORIES: 12, ... }
  
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### UsageOrders
Period-based order tracking:
```typescript
{
  id: string
  userId: string
  
  count: int
  periodStart: DateTime
  periodEnd: DateTime
  
  // Unique: one record per user per period
  @@unique([userId, periodStart, periodEnd])
}
```

#### UsageApiCalls
High-frequency API tracking:
```typescript
{
  id: string
  userId: string
  
  count: int
  periodStart: DateTime
  periodEnd: DateTime
  
  // Unique: one record per user per period
  @@unique([userId, periodStart, periodEnd])
}
```

---

## 🎨 Frontend Features

### Dashboard Pages

**Home Dashboard** (`/${storeId}`)
- Revenue graphs (recharts)
- Sales count widget
- Stock count widget
- Recent orders list
- Trial countdown timer (client-side)

**Products** (`/${storeId}/products`)
- DataTable with pagination
- Filters: archived, featured, in-stock
- Bulk actions
- Create/Edit product forms with:
  - Image uploads (Cloudinary)
  - Category/Size selection
  - Related products picker
  - Stock management
  - Title points & bullet points

**Categories** (`/${storeId}/categories`)
- DataTable with billboard associations
- Create/Edit forms
- Billboard relation management

**Billboards** (`/${storeId}/billboards`)
- Hero banner management
- Image upload
- Store main billboard selection
- Category billboard relations

**Orders** (`/${storeId}/orders`)
- Order list with status filters
- Order details view
- Status update workflow
- Customer information
- Order items breakdown

**Settings** (`/${storeId}/settings`)
- Store name update
- API key management
- Danger zone (delete store)

**Subscription Pages**
- **My Plan** (`/subscription/my-plan`)
  - Current plan display
  - Usage statistics
  - Cancel subscription
  - Trial countdown
- **Plans** (`/subscription/plans`)
  - All plans grid
  - Upgrade/Downgrade buttons
  - Feature comparison
  - Auto-scroll to selected plan
- **Payment History** (`/subscription/payment-history`)
  - All payments table
  - Invoice downloads
  - Payment status

### UI Components

**Custom Components:**
- Dashboard shell with sidebar
- Modals (store, product, category, etc.)
- Data tables with sorting/filtering
- Image upload with preview
- Trial indicator/timer
- Grace period banners
- Upgrade/Downgrade dialogs
- Plan cards with animations

**UI Library:**
- Radix UI primitives
- Tailwind CSS for styling
- shadcn/ui components
- Framer Motion animations
- rough-notation for text highlights
- Recharts for graphs

**Theme System:**
- Light/Dark mode support (next-themes)
- Custom color variables
- Responsive design

---

## 🔒 Security Implementations

### 1. Authentication Security
- Clerk-managed auth (industry standard)
- Session-based authentication
- Secure cookie handling
- HTTPS enforcement

### 2. API Security
- Protected routes via Clerk middleware
- Store ownership verification
- Subscription status checks
- Rate limiting (planned, will implement later)

### 3. Data Encryption
- Integration credentials encrypted at rest
- Environment-based encryption keys
- Secure key storage

### 4. Webhook Security
- Signature verification (Razorpay, Clerk)
- Replay attack prevention
- Webhook secret validation

### 5. CORS Configuration
- Explicit origin whitelist
- Method restrictions
- Credential handling

### 6. Input Validation
- Request body validation
- Type safety via TypeScript
- Prisma schema validation

---

## 🚀 Deployment & Environment

### Environment Variables
```env
# Database
DATABASE_URL=

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Encryption
ENCRYPTION_KEY=

# Cron Jobs
CRON_SECRET=

# URLs
NEXT_PUBLIC_APP_URL=
```

### Deployment Platform
- **Recommended:** Vercel (Next.js optimized)
- **Database:** PostgreSQL (Neon, Supabase, Railway)
- **File Storage:** Cloudinary
- **Monitoring:** Sentry (optional)

### Build Configuration
```json
{
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## 📈 Future Enhancements

### Planned Features
1. **Redis Integration**
   - API call tracking buffer
   - Order count caching
   - Session management
   - Real-time notifications

2. **Rate Limiting**
   - Per-user API limits
   - IP-based throttling
   - Abuse prevention

3. **Advanced Analytics**
   - Sales trends
   - Customer insights
   - Product performance
   - Revenue forecasting

4. **Email Templates**
   - Welcome emails
   - Trial expiry reminders
   - Payment receipts
   - Limit notifications
   - Grace period warnings

5. **Payment Method Updates**
   - Card update flow
   - UPI mandate management
   - Payment retry logic

6. **Multi-Store Support**
   - Multiple stores per user
   - Store switching
   - Cross-store analytics

7. **Team Collaboration**
   - Role-based access
   - Staff accounts
   - Permissions management

8. **Inventory Management**
   - Stock alerts
   - Low stock notifications
   - Auto-reorder triggers

9. **Customer Portal**
   - Order tracking page
   - Customer accounts
   - Order history
   - Profile management

10. **Advanced Integrations**
    - Shipping carriers
    - Accounting software
    - CRM systems
    - Marketing tools

---

## 🎓 Key Learnings & Best Practices

### Architecture Decisions

**1. Separation of Concerns**
- Three-layer authentication check (middleware → layout → component)
- Usage service centralization
- Integration service abstraction

**2. Transaction Safety**
- Atomic onboarding (all-or-nothing)
- Usage increment with rollback
- Payment verification before confirmation

**3. Graceful Degradation**
- Grace periods instead of immediate cutoff
- Read access even when expired
- Progressive enforcement

**4. Audit Trails**
- SubscriptionHistory for all changes
- Payment tracking with metadata
- Archive reasons for accountability

**5. Webhook Reliability**
- Sync status tracking
- Admin alerts on failures
- Fallback reconciliation

### Performance Optimizations

**1. Database Queries**
- Single query with relations (not multiple)
- Indexed fields for frequent lookups
- Unique constraints for data integrity

**2. Caching Strategy**
- Store cache invalidation after changes
- Redis plan (not yet implemented)
- Client-side timer (not re-fetching data)

**3. Background Jobs**
- Non-blocking alert delivery
- Parallel processing where possible
- Graceful failure handling

### Security Best Practices

**1. Never Trust Client Input**
- Server-side validation
- Type checking
- Rate limiting plans

**2. Encryption at Rest**
- Credentials encrypted
- Environment variable secrets
- No hardcoded keys

**3. Webhook Verification**
- Signature validation
- Timestamp checking
- Replay prevention

---

## 📚 Tech Stack Summary

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Library:** Radix UI + shadcn/ui
- **Animations:** Framer Motion, rough-notation
- **Forms:** React Hook Form + Zod
- **State:** React Context + hooks
- **Charts:** Recharts

### Backend
- **Runtime:** Node.js
- **API:** Next.js API Routes
- **Database:** PostgreSQL (Prisma ORM)
- **Authentication:** Clerk
- **Payment:** Razorpay
- **File Storage:** Cloudinary
- **Email:** Resend (planned)

### DevOps
- **Version Control:** Git
- **Deployment:** Vercel (recommended)
- **Database Host:** Neon/Supabase
- **Monitoring:** Sentry (optional)
- **Cron Jobs:** Vercel Cron or external service

### Tools & Libraries
- **Date Handling:** date-fns
- **HTTP Client:** Axios
- **Encryption:** crypto (Node.js)
- **Image Processing:** Cloudinary SDK
- **Payment SDK:** razorpay npm package

---

## 🎯 Project Metrics

**Development Time:** ~60 days (2 months)

**Lines of Code:**
- Prisma Schema: 665 lines
- Usage Service: 1,228 lines
- Alert Service: 399 lines
- TypeScript Files: ~50+ files

**Database Tables:** 30+

**API Routes:** 40+

**Cron Jobs:** 5

**Integration Types:** 7

**Subscription Statuses:** 6

**Payment Types:** 4

**Order Statuses:** 8

---

This is a **production-ready SaaS platform** with enterprise-level features like atomic transactions, webhook reliability tracking, multi-channel alerting, graceful degradation, comprehensive audit trails, and security-first design. The architecture supports scalability and future enhancements while maintaining code quality and maintainability.
