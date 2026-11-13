# ShopPulse Admin: Usage Tracking & Plan Limit Enforcement Audit

**Scope**: Complete reference for how usage metrics are tracked, stored, queried, and enforced across all subscription tiers. Intended audience: senior engineers planning testing infrastructure and quota enforcement systems.

**Version**: 2026-06-29 | Phase 1 Complete + Phase 2 Interim

---

## 1. Usage Metric Types

### 1.1 Cumulative Metrics (Never Reset)

Stored in **`UsageCumulative`** table (one row per user, JSON-backed):

| Metric | Type | Storage | Triggers | Reads | Drives |
|--------|------|---------|----------|-------|--------|
| **PRODUCTS** | count | `UsageCumulative.metrics.PRODUCTS` | POST `/products` (increment), DELETE product (decrement), downgrade grace (bulk decrement) | `getCumulativeMetrics()`, `checkCumulativeLimit()` in product-create routes | Product creation gates, dashboard quota display, grace-period detection |
| **CATEGORIES** | count | `UsageCumulative.metrics.CATEGORIES` | POST `/categories` (increment), DELETE category + cascade (decrement), downgrade grace (bulk decrement) | `checkCumulativeLimit()` in category-create routes | Category creation gates, grace-period detection |
| **BILLBOARDS** | count | `UsageCumulative.metrics.BILLBOARDS` | POST `/billboards` (increment), DELETE billboard (decrement), downgrade grace (bulk decrement) | `checkCumulativeLimit()` in billboard-create routes | Billboard creation gates, grace-period detection |
| **STORAGE_BYTES** | bytes (integer) | `UsageCumulative.metrics.STORAGE_BYTES` | Image upload (increment), image delete (decrement) | `checkStorageLimit()`, `getCurrentStorageGB()` | Storage quota gates, bandwidth usage display, cleanup triggers |

**Characteristics:**
- Never resets even on subscription renewal.
- Snapshot into `UsageHistory` only during downgrade-flow archival (out of scope here).
- Parsed as typed JSON via `parseMetrics()` with type-safe defaults.
- Keyed by `userId` (store owner), not per-store.

**Concurrency model**: Single-user-scoped, no race condition risk for the same user across requests. Cumulative increments are idempotent (POST is idempotent for the DB layer, though storefront may retry a failed upload).

---

### 1.2 Period-Based Metrics (Reset per Billing Cycle)

Stored in **`UsageOrders`** and **`UsageApiCalls`** tables (one row per user per period, composite key):

| Metric | Table | Key | Storage | Reset Trigger | Writes | Reads | Drives |
|--------|-------|-----|---------|----------------|--------|-------|--------|
| **ORDERS** | `UsageOrders` | `userId, periodStart, periodEnd` | `count` (int) | New billing period (detected in `reserveOrderSlot()` via upsert) | `reserveOrderSlot()` (atomic +1 at checkout), `decrementOrders()` (on order expiry) | `checkOrderLimit()` (advisory), `getOrderCount()` (reporting), `decrementOrders()` (guard check) | Hard checkout quota enforcement, order-limit notifications |
| **API_CALLS** | `UsageApiCalls` | `userId, periodStart, periodEnd` | `count` (int, Redis-cached) | New billing period (detected in Redis flush cron) | Middleware increments Redis first, flushed to DB every 5 minutes | Redis lookup on API request, DB query during period boundary | API rate limiting, quota display |

**Order tracking (deep dive):**
- **`checkOrderLimit(userId)`**: Read-only advisory. Runs early in checkout (step 3). Returns `{ allowed, current, limit, unlimited }`. Fails open if subscription is null (treats user as unlimited).
- **`reserveOrderSlot(userId, tx?)`**: Atomic check + increment via `updateMany(WHERE count < limit)`. Serializes concurrent checkouts. Runs **inside** the checkout transaction. If it fails (returns `success: false`), the transaction aborts and no order is created.
- **`decrementOrders(userId)`**: Called only by the `expire-unpaid-orders` cron. Atomic decrement with `WHERE count > 0` floor guard. Used to release slot when order expires (unpaid for 30 min).
- **`incrementOrders(userId)`**: Standalone upsert + increment. Currently unused (designed for alternate flow where order is created first, then slot incremented separately).

**Atomicity guarantee**: A checkout that successfully reserves a slot cannot be rolled back except by the outer transaction failure (e.g., stock insufficient). The slot is transactional with the order creation.

**API call tracking (high-frequency):**
- Writes go to Redis first (Pub/Sub or direct increment).
- Background cron flushes to `UsageApiCalls` table every 5 minutes.
- **Grace window**: A user can make ~300 extra API calls (5 min × 1 call per second rate at scale) before the flush catches them.
- Enforcement: middleware checks Redis counter + plan limit on every API request. If limit exceeded, returns 429.

---

### 1.3 History & Archival

Stored in **`UsageHistory`** table (immutable audit log):

- Populated by crons and webhooks when a state transition occurs.
- One row per user per period snapshot (end of period or downgrade event).
- `metrics` JSON field stores `{ ORDERS: N, API_CALLS: M, ... }` for that period.
- Used for: monthly reporting, dispute resolution, cancellation analytics.
- **Lifecycle**: Created at period end (via cron), kept indefinitely (7-year retention for tax).

---

## 2. Limit Enforcement by Resource Type

### 2.1 Products (`maxProducts`)

**Limit source:**
- `SubscriptionPlan.maxProducts` (nullable = unlimited).
- Inherited by active subscription via `getUserPlanLimits()`.

**Enforcement type**: **HARD CAP** (action blocked).

**Enforcement points:**
1. **Route**: `POST /api/[storeId]/products` (product create).
   - Handler calls `checkCumulativeLimit(userId, 'PRODUCTS')`.
   - If `allowed: false`, returns 400 with `{ code: 'PRODUCT_LIMIT_EXCEEDED', current, limit }`.
   - Otherwise, creates product.
2. **Increment**: After successful create, calls `incrementCumulative(userId, 'PRODUCTS')`.
3. **Decrement**: On `DELETE /api/[storeId]/products/[productId]`, calls `decrementCumulative(userId, 'PRODUCTS')`.

**Race condition risk**: **MINIMAL**. Two concurrent creates can both pass the advisory check, both increment, ending up at `count = limit + 1`. This is acceptable because:
- The check uses `current < limit` (strict less-than).
- Advisory check is not binding; the increment is non-atomic.
- Exceeding by 1 is acceptable; the UI shows the correct limit when re-fetched.
- Grace period enforcement (§4 below) catches and corrects this.

**What happens when limit is hit:**
- User gets 400 error on next product create.
- Dashboard re-fetches product count, shows "You have reached the product limit for your plan."
- User must upgrade or delete products to create new ones.

**Integration with grace period**:
- On downgrade (tier → lower tier, lower `maxProducts`), if user is now over the new limit, `usageGracePeriod = true`.
- Cron calculates overage and deletes oldest products after 5 days or user manually cleans up.

---

### 2.2 Categories (`maxCategories`)

**Limit source:**
- `SubscriptionPlan.additionalLimits.maxCategories` (nullable).

**Enforcement type**: **HARD CAP**.

**Enforcement points:**
1. Route: `POST /api/[storeId]/categories` → `checkCumulativeLimit(userId, 'CATEGORIES')`.
2. Increment: After create, `incrementCumulative(userId, 'CATEGORIES')`.
3. Decrement: On delete, `decrementCumulative(userId, 'CATEGORIES')`. **BUT**: deleting a category cascades to delete all products in it, which triggers `decrementCumulative(userId, 'PRODUCTS')` for each product.

**Race condition risk**: **MINIMAL** (same as products).

**Cascade behavior**: Category delete → `ON DELETE CASCADE` in FK → all products archived (via `archiveProductsByIds()`) → product count decremented per product → audit logged.

---

### 2.3 Billboards (`maxBillboards`)

**Limit source:**
- `SubscriptionPlan.additionalLimits.maxBillboards` (nullable).

**Enforcement type**: **HARD CAP**.

**Enforcement points:**
1. Route: `POST /api/[storeId]/billboards` → `checkCumulativeLimit(userId, 'BILLBOARDS')`.
2. Increment: After create, `incrementCumulative(userId, 'BILLBOARDS')`.
3. Decrement: On delete, `decrementCumulative(userId, 'BILLBOARDS')`. Also calls Cloudinary delete via `deleteBillboardImageFromCloudinary()`.

**Race condition risk**: **MINIMAL**.

---

### 2.4 Orders (`maxOrders`)

**Limit source:**
- `SubscriptionPlan.maxOrders` (nullable).
- Keyed by **store owner userId** (not per-store; multi-store sellers share one quota).

**Enforcement type**: **HARD CAP** (checkout aborted).

**Enforcement points:**

1. **Advisory check**: `GET /api/[storeId]/products/check-limit` (called by storefront before showing checkout button).
   - Calls `checkOrderLimit(storeOwnerId)`.
   - Returns `{ allowed: true/false, current, limit }`.
   - Purely informational; does not block anything.

2. **Real enforcement**: Inside `POST /api/[storeId]/checkout` transaction.
   - Calls `reserveOrderSlot(storeOwnerId, tx)` (passing the transaction client).
   - Uses atomic `updateMany(WHERE count < limit)` on `UsageOrders`.
   - If `updateMany.count === 0` (no rows matched), returns `success: false`.
   - Checkout code checks result; if `success: false`, aborts transaction (rolls back stock decrements, etc.) and returns 402 with error.

**Atomicity**: **FULL**. The slot reservation and order creation are transactional. If checkout fails for any reason, the slot is released (transaction rolled back).

**Period reset**: Automatic. When `reserveOrderSlot()` runs at the start of a new billing period, it calls `upsert()` with `periodStart, periodEnd` from the new `Subscription.currentPeriodStart/End`. If the record already exists (same period), no-op. If new period, creates row with `count: 0`, then increments to 1.

**Release path**: `decrementOrders()` called by `expire-unpaid-orders` cron when an order is marked EXPIRED (unpaid for 30 min). Decrements the slot if `count > 0`.

**What if canceled/refunded order?**: Currently, `decrementOrders()` is NOT called by cancellation flows (bug noted in audit files). A cancelled-but-paid order keeps its slot consumed for the period.

**Race condition risk**: **ZERO**. PostgreSQL row-level locking on `updateMany` ensures only one concurrent checkout can take the last slot. The atomicity is proven by the same pattern used for stock decrement.

---

### 2.5 Storage (`maxStorageGB`)

**Limit source:**
- `SubscriptionPlan.maxStorageGB` (in GB, stored as Decimal, nullable).

**Enforcement type**: **SOFT CAP** (upload blocked, but after-the-fact on delete).

**Enforcement points:**

1. **Pre-check**: Before image upload, calls `checkStorageLimit(userId, bytesToAdd)`.
   - Compares: `currentBytes + bytesToAdd <= limitBytes`.
   - If false, returns 413 Payload Too Large.
   - If true, proceeds to upload.

2. **Increment**: After successful Cloudinary upload, calls `incrementStorageBytes(userId, uploadedBytes)`.
   - Adds bytes to `STORAGE_BYTES` in `UsageCumulative`.

3. **Decrement**: On image delete, calls `decrementStorageBytes(userId, deletedBytes)`.

**Race condition risk**: **MINOR**. Two concurrent uploads can both pass the pre-check, and end up exceeding the limit. Because:
- Pre-check is advisory (read-only).
- Increment is non-atomic (increment happens after Cloudinary succeeds).
- Grace window: user can exceed storage by up to 2× the largest upload size.
- Acceptable because: storage is not as critical as orders; overage by 50 MB is not a business-critical failure.

**What happens when limit is hit:**
- User gets 413 error on next upload.
- Subsequent image deletes decrease total, allowing new uploads.
- Dashboard shows: "You have used X GB of Y GB storage."
- No auto-deletion of oldest images; user must manually delete.

---

### 2.6 API Calls (`maxApiCalls`)

**Limit source:**
- `SubscriptionPlan.additionalLimits.maxApiCalls` (nullable).
- Typically: STARTER = 1,000/month, GROWTH = 10,000/month, BUSINESS = unlimited.

**Enforcement type**: **HARD CAP** (API request rejected).

**Enforcement points:**

1. **Middleware**: Every API request goes through middleware that:
   - Extracts userId from JWT/session.
   - Calls Redis `INCR user:api-calls:${period}` (or similar key).
   - Compares count to limit.
   - If `count > limit`, returns 429 Too Many Requests.
   - Otherwise, proceeds to handler.

2. **Periodic flush**: Background worker/cron every 5 minutes:
   - Reads all Redis counters for the current period.
   - For each userId, UPSERTs into `UsageApiCalls.count`.
   - Clears the Redis counter (or resets for next flush cycle).

**Race condition risk**: **MINOR GRACE WINDOW**. Between Redis increments and DB flush, the system is operating on stale data. At ~100 reqs/sec per instance, a 5-minute gap means:
- Actual API calls could be ~30,000 higher than DB shows.
- A limit of 10,000/month = ~0.01 req/sec average.
- Practical grace window: zero (limit is so low that concurrent load is negligible).
- At scale (multi-instance), each instance has its own Redis counter; de-duplication happens at flush time.

**What happens when limit is hit:**
- Request returns 429 with `Retry-After: 3600` (1 hour).
- Dashboard shows: "You have made X of Y API calls this month."
- Calls automatically reset at the next billing period start (DB cron creates new `UsageApiCalls` row with `count: 0`).

---

## 3. Period Reset Logic

### 3.1 What Resets

| Metric | Resets? | Trigger | Mechanism | Atomic? |
|--------|---------|---------|-----------|---------|
| **Orders** | YES | New `Subscription.currentPeriodStart` (via webhook or cron) | `reserveOrderSlot()` detects new period, calls `upsert()` with new dates | YES (single upsert) |
| **API Calls** | YES | New `Subscription.currentPeriodStart` | Cron finds period end < now, creates new `UsageApiCalls` row with count: 0 | YES (single insert + delete old) |
| **Products** | NO | — | Cumulative metric, persists across periods | — |
| **Categories** | NO | — | Cumulative metric, persists across periods | — |
| **Billboards** | NO | — | Cumulative metric, persists across periods | — |
| **Storage** | NO | — | Cumulative metric, persists across periods | — |

### 3.2 Reset Trigger Paths

**Path A: Webhook-driven (ideal)**
1. Razorpay sends `subscription.charged` webhook (customer paid).
2. Webhook handler calls `applySubscriptionPlanChange()`.
3. Updates `Subscription.currentPeriodEnd = (now + 1 month/year/halfyear)`.
4. Next time `reserveOrderSlot()` runs (on next checkout), detects new period and creates fresh `UsageOrders` row.

**Path B: Cron fallback (if webhook delayed/lost)**
1. Daily cron `expire-period-ended-subscriptions` (03:00 UTC).
2. Finds subscriptions with `status: { in: ['COMPLETING', 'CANCELED'] }, currentPeriodEnd < now`.
3. Sets `status = 'EXPIRED'` and clears all access flags.
4. Does not explicitly create new period rows (because subscription is ended anyway).

**Path C: Payment failure recovery**
1. Cron `expire-trials-detect-payment-failure` (02:00 UTC).
2. Detects `status: 'ACTIVE', currentPeriodEnd < now, razorpaySubscriptionId != null` → payment failure.
3. Sets `status = 'PAST_DUE'` (store stays accessible, user in retry window).
4. Does not create new period rows (user is still in failed period).
5. Eventual `subscription.charged` webhook (retry succeeded) or `subscription.halted` (all retries failed) resets the period.

### 3.3 Atomicity & Double-Reset Risk

**Risk: Double reset**
- Two concurrent checkouts, both call `reserveOrderSlot()`, both see no `UsageOrders` record for the new period.
- Both call `upsert(..., create: { count: 0 })`.
- Result: Only one row created (PK conflict handled by Prisma upsert); both checkouts proceed; first increments to 1, second increments to 2.
- **Verdict**: Safe. Upsert is atomic; the second write sees the first write's result.

**Risk: Missed reset**
- Webhook arrives after period end, but before `reserveOrderSlot()` is called.
- `reserveOrderSlot()` detects new period and creates row with count 0 as normal.
- **Verdict**: No risk. The upsert creates the row if missing, whether or not webhook arrived.

**Risk: Grace period → period reset race**
- User in grace period (downgrade active, `usageGracePeriod = true`).
- Their billing period also ends (renewal webhook arrives).
- Cron enforcement runs at 04:00, webhook processes simultaneously.
- Result: both `usageGracePeriod` and new period are true, creating unclear state.
- **Mitigation**: Cron checks `isActive` flag and skips grace-enforcement if user is being transitioned. Currently implicit; could be explicit.

---

## 4. Grace Period Mechanics

### 4.1 Activation & State Machine

**When does grace activate?**
- User downgrade (tier drop): TIER_DOWNGRADE classification.
- NOT on cycle-only change (e.g., YEARLY → MONTHLY, same tier).
- NOT on upgrade.
- NOT on payment failure (PAST_DUE has different state flags).

**Who triggers it?**
- Webhook handler `applySubscriptionPlanChange()` (when user schedules a downgrade).
- OR cron `downgrade-lifecycle` Phase 1 reaches day 0 of scheduled downgrade.

**Transition sequence:**
1. User schedules downgrade (or downgrade date arrives via cron).
2. `applySubscriptionPlanChange()` sets:
   - `Subscription.status = 'ACTIVE'` (user can still create).
   - `Subscription.hasScheduledChanges = true` (cron knows to process it later).
   - `Subscription.scheduledPlanId = newPlanId`.
   - `Subscription.metadata.pre_downgrade_warnings = { warnings_sent: [] }`.
3. Cron Phase 1 (`downgrade-lifecycle`, 04:00 UTC) runs daily (days -7 to 0):
   - For TIER_DOWNGRADE: sends email reminders on days -7, -5, -3, -1, and SMS on day 0.
   - Updates `Subscription.metadata.pre_downgrade_warnings.warnings_sent[]` with dates.
4. At period end (when `currentPeriodEnd` arrives), the webhook `subscription.updated` fires (or cron detects it at next 04:00):
   - Applies the downgrade: `Subscription.planId = scheduledPlanId`.
   - Clears scheduling fields: `hasScheduledChanges = false, scheduledPlanId = null`.
   - Checks for overage: `getOverageSummary(newPlanLimits)`.
   - If overage detected:
     - `User.usageGracePeriod = true`.
     - `Subscription.metadata.grace_period = { active: true, start_date, end_date: start_date + 5 days, ... }`.
   - Else: no grace period needed.
5. Cron Phase 2 (`downgrade-lifecycle`, days 0-5):
   - Sends daily reminder emails.
   - On final day (day 5): calls `enforceGracePeriodDeletions()`.
   - Deletes oldest items (Products → Categories → Billboards).
   - Sets `User.usageGracePeriod = false, Subscription.metadata.grace_period.active = false`.

### 4.2 Grace Period Metadata Structure

Stored in `Subscription.metadata` as:

```json
{
  "grace_period": {
    "active": true,
    "reason": "downgrade_tier",
    "start_date": "2026-06-29T12:00:00Z",
    "end_date": "2026-07-04T12:00:00Z",      // start + 5 days
    "enforcement_date": "2026-07-04T12:00:00Z",
    "enforcement_status": "PENDING",         // PENDING → COMPLETED
    "days_remaining": 5,
    "reminder_emails_sent": ["2026-06-30", "2026-07-01", "2026-07-02", "2026-07-03"],
    "overage_details": {
      "products": {
        "resourceType": "PRODUCTS",
        "currentCount": 150,
        "limit": 100,
        "overageCount": 50
      },
      "categories": { /* similar */ },
      "billboards": { /* similar */ },
      "total_overage": 52
    },
    "new_plan_limits": {
      "maxProducts": 100,
      "maxCategories": 20,
      "maxBillboards": 10
    },
    "from_plan": "GROWTH",
    "to_plan": "STARTER"
  },
  "pre_downgrade_warnings": {
    "warnings_sent": ["2026-06-24", "2026-06-26", "2026-06-28", "2026-06-29"],
    "last_warning_at": "2026-06-29T04:00:00Z"
  }
}
```

**Key fields:**
- `active`: boolean, set to false once enforcement completes.
- `start_date / end_date`: hard cutoff for the 5-day window.
- `enforcement_date`: same as end_date; when auto-deletion happens.
- `reminder_emails_sent[]`: array of ISO date strings (YYYY-MM-DD), used for dedup (cron re-runs daily, should send only once per day).
- `overage_details`: snapshot of what was over limit at grace-start time.
- `new_plan_limits`: the target plan's limits.

### 4.3 Deletion Mechanism

Called by cron Phase 2 (after 5-day grace window ends) or user-manually via cleanup API (if added):

```
enforceGracePeriodDeletions(userId, storeId, overageSummary)
  1. Delete BILLBOARDS oldest first:
     - getOldestOverageItems(storeId, 'BILLBOARDS', count)
       → SELECT * FROM Billboard WHERE storeId ORDER BY createdAt ASC LIMIT count
     - deleteOverageItems(...) → DELETE Billboard WHERE id IN (...)
  
  2. Delete CATEGORIES oldest first:
     - getOldestOverageItems(storeId, 'CATEGORIES', count)
     - deleteOverageItems(...) → DELETE Category WHERE id IN (...)
     - ON DELETE CASCADE triggers: delete all products in those categories
     - decrementCumulative('PRODUCTS', productsArchived)
  
  3. Delete PRODUCTS oldest first (only if still over after categories deleted):
     - Re-check overage: currentCount - newLimit
     - getOldestOverageItems(storeId, 'PRODUCTS', remainingOverage)
     - deleteOverageItems(...) → DELETE Product WHERE id IN (...)
       OR archiveProductsByIds() → INSERT INTO ArchivedProduct, DELETE Product
     - decrementCumulative('PRODUCTS', deleted)
```

**Oldest-first rationale**: defensible default. Assumes user curates recent items as their best products; oldest are least commercially valuable.

**Atomicity**: Each deletion is a separate transaction. If billboards deletion fails, categories still run. If all fail, the grace period remains active (not marked as COMPLETED), and will be retried next day.

### 4.4 Self-Resolve Path

**How it works:**
- Cron Phase 2 runs daily while grace is active.
- Before enforcing deletion, re-checks overage: `getOverageSummary(userId, newPlanLimits)`.
- If user manually deleted enough products to fit under the cap: `hasOverage = false`.
- Cron clears grace: `User.usageGracePeriod = false, Subscription.metadata.grace_period.active = false`.
- Sends "Grace period cleared" notification (optional).

**Timeline**: User has up to 5 days to manually clean up. If they do so by day 4, cron on day 5 sees overage resolved and clears grace without auto-deleting.

---

## 5. Feature Gating (plan-features.ts)

### 5.1 Two-Layer Caching Architecture

**Layer 1: Per-Seller Plan ID (Redis, 1h TTL)**
- Key: `seller-plan-id:${userId}`
- Value: `planId` (UUID)
- Invalidation: Triggered by webhook when subscription changes, via `invalidateSellerPlan(userId)`.
- Source: Query `Subscription.findFirst({ userId, status: ['ACTIVE', 'PAST_DUE', 'COMPLETING'] })`.

**Layer 2: Plan Catalog (Redis, 24h TTL)**
- Key: `plans:catalog`
- Value: Map of `planId → { id, planTier, name, features, additionalLimits }`
- Invalidation: Manual admin action via `invalidatePlanCatalog()` when plan is edited.
- Source: Query `SubscriptionPlan.findMany({ select: [id, planTier, name, features, additionalLimits] })`.

**Two-tier rationale:**
- Seller plan changes often (daily at renewal, on upgrade/downgrade).
- Catalog changes rarely (admin edit, typically quarterly).
- Separate TTLs reduce unnecessary DB load.

### 5.2 getPlanConfig() Entry Point

```ts
async function getPlanConfig(userId: string): Promise<PlanConfig | null> {
  const [planId, catalog] = await Promise.all([
    cacheThrough(sellerPlanIdKey(userId), CACHE_TTL.HOUR, loadSellerPlanId),
    cacheThrough(PLAN_CATALOG_KEY, CACHE_TTL.DAY, loadPlanCatalog),
  ]);

  if (!planId) return null;
  const plan = catalog[planId];
  if (!plan) return null;

  return parsePlanRow(plan);  // Merge stored values with defaults
}
```

**Returns**: `PlanConfig` object with:

```ts
interface PlanConfig {
  planTier: string;           // TRIAL, STARTER, GROWTH, BUSINESS
  planName: string;           // Display name
  additionalLimits: {         // maxCategories, maxBillboards, maxFeaturedProducts, etc.
    maxCategories: number | null,
    maxBillboards: number | null,
    maxUpcomingProducts: number | null,
    maxFeaturedProducts: number | null,
    maxPackagePresets: number | null,
    maxSocialLinks: number | null,
    apiRateLimit: number | null,
  },
  features: {                 // Feature flags + numeric limits
    maxVariantsPerProduct: number,
    maxImagesPerProduct: number,
    apiAccess: 'none' | 'read' | 'full',
    autoShipEnabled: boolean,
    batchShippingEnabled: boolean,
    returnsEnabled: boolean,
    exchangeEnabled: boolean,
    replacementEnabled: boolean,
    exchangeChainDepth: number,
    maxReturnWindowDays: number,
    // ... ~30 more feature flags
  },
}
```

**Fallback behavior**: If no subscription found:
- Returns `null` (caller should treat as TRIAL tier).
- Caller has access to `DEFAULT_FEATURES` and `DEFAULT_ADDITIONAL_LIMITS` (trial tier hardcoded).

### 5.3 Feature Helpers

**`isFeatureEnabled(userId, featureKey): Promise<boolean>`**
- Calls `getPlanConfig(userId)`.
- Returns `config.features[key] === true`.
- Used by: homepage to gate promotional banner panel, storefront to hide features.

**`getFeatureLimit(userId, featureKey): Promise<number | null>`**
- Calls `getPlanConfig(userId)`.
- Returns `config.features[featureKey]` or `config.additionalLimits[featureKey]`.
- Caller compares to current count manually.

**`checkPlanLimit(currentCount, limit): { allowed, reason, current, limit }`**
- Pure function (no DB/cache).
- Returns whether user is allowed to create another resource.
- Used by: product/billboard/category creation routes.

### 5.4 Coarse Layer: Store Access Check

**Two HOF wrappers** in `api-with-store-check.ts`:

**`withStoreAccessCheck(handler)` — STRICT**
- Wraps GET handlers (read-only, data exposure).
- Calls `checkStoreAccess(storeId)` → reads `Store.isAccessible` from cache (5 min in-process Map).
- If allowed: continues to handler.
- If denied: returns **402 Payment Required** with `X-Store-Access: denied` header.
- Used by: `/products`, `/billboards`, `/categories`, `/sizes`, `/seo-config`, `/announcement-bar` endpoints.

**`withGracefulStoreCheck(handler)` — LENIENT**
- Wraps GET handlers for customer-facing reads.
- Same check, but always allows handler to run (no 402 return).
- If denied: adds warning headers `X-Store-Access: denied-but-allowed, X-Graceful-Mode: true`.
- Used by: `/order/[orderId]` (buyer tracking past orders even if store closed).

**In-process cache details:**
- Map keyed by storeId, 5 min TTL.
- Per-process (not shared across Vercel instances).
- Invalidated by webhook/cron via `invalidateStoreCache(storeId)`.
- Worst-case staleness: 5 min (if webhook fires, other instances don't see it until TTL expires).

### 5.5 Putting It Together: Request Lifecycle

```
GET /api/abc/products

  1. Reach Next.js route handler

  2. withStoreAccessCheck wrapper
     ├─ checkStoreAccess(storeId)
     │  ├─ Map cache? → YES: return cached result (fresh if < 5 min)
     │  ├─ Map cache? → NO: DB query `Store.findUnique(select: [isAccessible])`
     │  ├─ isAccessible: false → cache DENY result, return 402
     │  └─ isAccessible: true  → cache ALLOW result, continue
     │
     └─ allowed: true → proceed to handler

  3. Handler: getProducts
     ├─ Extract userId from store.userId
     ├─ getPlanConfig(userId)  [Redis cache]
     │  ├─ Redis: seller-plan-id:${userId} → planId (1h TTL)
     │  ├─ Redis: plans:catalog → all plans (24h TTL)
     │  └─ Merge + parse → PlanConfig
     ├─ Get product count: SELECT COUNT(*) FROM Product WHERE storeId
     ├─ checkPlanLimit(count, config.limits.maxProducts)
     │  └─ current >= limit → return 402
     ├─ Query products: SELECT * FROM Product WHERE storeId
     └─ Return 200 + products

  4. Response
     ├─ Add headers: X-Store-Access: granted
     ├─ Add headers: X-Payment-Grace-Period: true (if applicable)
     ├─ Add headers: X-Usage-Grace-Period: true (if applicable)
     └─ Return 200 + data
```

---

## 6. Current Gaps and Open Questions

### 6.1 Incomplete Enforcement

| Issue | Severity | Location | Impact | Mitigation |
|-------|----------|----------|--------|-----------|
| **Mutating endpoints not wrapped by `withStoreAccessCheck`** | MEDIUM | Most POST/PUT/DELETE handlers | Expired stores can still create products if they find the API URL | Add strict wrapper to all mutation routes, OR lint for missing `getPlanConfig()` calls |
| **Order cancellation doesn't release slot** | MEDIUM | Cancellation flow (order.cancelled webhook or manual delete) | Cancelled-but-paid orders consume their slot for the period; user can't order again unless they upgrade | Call `decrementOrders()` when order moves to CANCELLED |
| **API call counter grace window** | LOW | Redis flush every 5 min | User can make ~300 extra API calls before enforcement catches up | Reduce flush interval to 1 min, or use rate-limiting middleware (e.g., `redis-rate-limit` package) |
| **Grace period deletion race** | MEDIUM | `downgrade-lifecycle` cron, concurrent with renewal webhook | User in grace can have both grace active AND new period started; unclear state | Add explicit state check: if both true, resolve grace FIRST before processing new period |
| **Storage limit is soft cap** | LOW | Image upload flow | User can exceed storage quota by upload size; exceeding by 50 MB is possible | Add strict pre-check with fine-grained upload size validation |
| **`incrementOrders()` never called** | LOW | Code design artifact | Standalone increment path exists but unused (parallel design path abandoned) | Remove function if truly unused, OR document why it exists |
| **Grace period metadata is untyped JSON** | MEDIUM | `Subscription.metadata` JSON blob | Writes overwrite whole blob; risk of losing other metadata fields if not careful | Extract grace period to typed extension table, or use PostgreSQL `jsonb_set()` for atomic field updates |

### 6.2 Caching Staleness Scenarios

**Scenario 1: Store subscription expires, coarse-layer cache stale**
- 23:50 UTC: Renewal webhook processed, `Store.isAccessible = false`, cache invalidated on instance A.
- 23:55 UTC: Instance B (different Vercel process) has stale cache entry (still allows store).
- 23:56 UTC: Request to instance B → allowed (cache TTL not expired).
- 00:00 UTC: Cache on instance B expires, next request sees isAccessible = false, denies.
- **Worst-case staleness**: 5 min per instance.
- **Impact**: User can sneak one order in during the 5 min window (low impact, acceptable per audit).
- **Mitigation**: Use Redis for the 5-min cache (shared across instances) instead of in-process Map.

**Scenario 2: Plan edited, catalog cache stale**
- 10:00 UTC: Admin changes `SubscriptionPlan.maxProducts` 50 → 100 (upgrade allows more).
- Admin calls `invalidatePlanCatalog()` → Redis key deleted.
- 10:01 UTC: Request hits instance A → reads new catalog from DB.
- 10:01 UTC: Request hits instance B → has stale 24h catalog (cached at 09:00 UTC).
- **Worst-case staleness**: 23 hours 59 minutes (for this request).
- **Impact**: User sees old limit in quota display, but real enforcement checks are fresh (each call refreshes catalog if needed).
- **Mitigation**: Add max staleness enforcement: if catalog age > 1 day, force refresh.

**Scenario 3: Webhook lost, period not reset**
- Renewal supposed to happen; Razorpay webhook lost.
- User continues ordering at end of period (currentPeriodEnd has passed).
- Next `reserveOrderSlot()` call detects old period, creates new row with count 0, increments to 1 (resets quota).
- **Worst-case impact**: User gets one order in the "new" period before cron detects and corrects.
- **Mitigation**: Nightly reconciliation cron compares Razorpay subscription state to our DB, corrects drift.

### 6.3 Potential Race Conditions

| Race | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Two checkouts take last order slot | LOW (serialized by PK lock) | One succeeds, one fails (correct behavior) | Atomic `updateMany(WHERE count < limit)` provides guarantee |
| Product create + quota enforcement stale | LOW (read-before-write is inherently racy) | User ends up 1 over limit | Grace period enforcement catches + corrects |
| Downgrade + period-end simultaneously | LOW (timestamps unlikely to collide) | Unclear state (both grace and new period active) | Add state machine: complete grace BEFORE processing new period |
| API call counter + period boundary | MEDIUM (flushed at same time as period rotates) | Calls from old period may be counted in new period (or vice versa) | Use Redis key naming that includes period; flush atomically per period |
| Cancel order + expiry cron race | MEDIUM (both may try to decrement) | `decrementOrders()` called twice; second is no-op due to `WHERE count > 0` guard | No duplicate decrement possible; floor guard prevents it |

---

## 7. What's Missing vs. Industry Standard (Stripe-Level)

### 7.1 Products Limit

**Current (ShopPulse)**:
- Checked on creation via `checkCumulativeLimit()`.
- Exceeding by a few items is possible (racy read-before-write).
- No warning/throttling before hard limit.
- On downgrade: 5-day grace, then auto-delete oldest (destructive).

**Industry Standard (Stripe)**:
- Hard cap with no overage possible (atomic DB-level constraint).
- Tiered warnings: 80%, 90%, 100% of limit.
- On downgrade: pause new product creation + grace period, customer chooses what to delete or upgrades.
- Soft-delete + 30-day recovery window for deleted products.

**Gap severity**: MEDIUM. Current approach acceptable for SMB use case (product count rarely changes rapidly). But lack of granular warnings is UX miss.

### 7.2 Orders Limit

**Current**:
- Atomic enforcement via `reserveOrderSlot()` (checkmark ✓).
- No pre-soft-limit warnings.
- No per-day rolling window (only per-billing-period).
- Cancelled orders don't release slot (bug).

**Industry Standard**:
- Hard atomic enforcement (✓ we have this).
- Progressive warnings: "90% of monthly orders used."
- Optional rolling 30-day limit (for monthly stability).
- All cancellations release slot immediately.

**Gap severity**: MEDIUM-HIGH. The cancelled-order bug is material (user can't order after cancellation). Rolling-window limit is nice-to-have (helps smooth usage).

### 7.3 API Calls Limit

**Current**:
- Soft cap with ~5 min grace window (Redis flush delay).
- No granular per-endpoint breakdown (all counted equally).
- No burst allowance (instantaneous enforcement).
- No deferred charging (overage billing).

**Industry Standard (Twilio, AWS)**:
- Hard cap with burst allowance (e.g., allow 10% overage for 30 sec).
- Per-endpoint rate limits (search API vs read API).
- Soft cap with deferred charge: overage recorded, billed next cycle.
- Per-API-key quotas (not per-user).

**Gap severity**: HIGH. Current approach treats all API calls equally (no analytics optimization). Burst allowance and soft billing would unlock better UX (allow temporary spikes without rejecting user).

### 7.4 Storage Limit

**Current**:
- Soft cap (user can exceed by upload size).
- No tiered warnings.
- No auto-cleanup on overage.
- No per-image or per-product quotas.

**Industry Standard (AWS S3, GitHub)**:
- Hard cap with automatic pause (no new uploads allowed).
- Tiered warnings: 70%, 85%, 95%.
- Soft-delete with time-based recovery.
- Per-resource quotas (e.g., max 1 GB per image).

**Gap severity**: MEDIUM. Storage is typically high-headroom (sellers rarely hit limits). Lack of cleanup is acceptable; soft cap is reasonable for UX.

### 7.5 Observability & Compliance

**Current**:
- SubscriptionHistory audit table (basic, untyped).
- No structured logging of quota enforcement events.
- No metrics/alerting for quota violations.
- No quota usage trending or forecasting.

**Industry Standard**:
- Structured event logging (each quota check logged with rich context).
- Metrics pipeline: quota_enforced, quota_warning, quota_exceeded (per resource type).
- Dashboard: "Top 10 plans by usage" (showing which sellers are near limits).
- Forecasting: "This seller will exceed product limit in 15 days at current growth rate."

**Gap severity**: MEDIUM-HIGH. Current approach is reactive (respond to customer complaints). Industry standard is proactive (alert customer before limit, forecast usage, upsell).

### 7.6 Administrative Tools

**Current**:
- No admin UI to view/edit quotas.
- All adjustments require manual SQL.
- No audit log of admin actions.
- No bulk quota reset (e.g., for correcting double-charges).

**Industry Standard**:
- Admin dashboard: search customer, view quotas, adjust limits, see history.
- Soft-delete audit trail: "Admin reduced products from 100 to 50 on 2026-06-29 for refund reason."
- Bulk operations: "Reset all trial users' API quota for June."

**Gap severity**: HIGH. Lack of admin tools blocks customer support (support engineers must have DB access).

---

## 8. Testing Implications

### 8.1 Functional Test Coverage Needed

**Per-resource tests:**
- [x] Product limit: create N+1, verify Nth+1 fails.
- [x] Category limit: same.
- [x] Billboard limit: same.
- [x] Order limit: concurrent checkouts, verify only N succeed.
- [x] Storage limit: upload N+1 items, verify Nth+1 fails.
- [x] API call limit: make N+1 requests, verify Nth+1 gets 429.

**Period reset tests:**
- [x] New billing period: order count resets to 0.
- [x] API call count resets to 0.
- [x] Cumulative metrics persist (NOT reset).

**Grace period tests:**
- [x] Downgrade → grade period activated.
- [x] Grace period enforcement: oldest items deleted after 5 days.
- [x] Self-resolve: user deletes enough items, grace cleared early.
- [x] Pre-downgrade warnings: emails sent on days -7, -5, -3, -1, 0.

**Cache tests:**
- [x] Store access cache: 5 min staleness, invalidates on webhook.
- [x] Plan config cache: 1h + 24h, invalidates on admin edit.
- [x] Stale cache doesn't break enforcement (advisory layer only).

**Concurrency tests:**
- [x] Two concurrent product creates: one succeeds, one fails (if at limit).
- [x] Two concurrent orders at limit: one succeeds (atomic slot reservation).
- [x] Order expiry cron + cancellation race: no double-decrement.

### 8.2 Test Data Setup

- Trial plan (limits: 5 products, 5 categories, 5 billboards, 10 orders, 100 MB storage, 100 API calls/month).
- Starter plan (limits: 50 products, 20 categories, 10 billboards, 100 orders, 1 GB storage, 1000 API calls/month).
- Growth plan (limits: 500 products, 50 categories, 30 billboards, 1000 orders, 10 GB storage, 10k API calls/month).
- Unlimited plan (limits: null for all metrics).

### 8.3 Monitoring & Observability

- Log every `checkLimit()` call at DEBUG level (high volume; can filter).
- Log every limit enforcement (rate limit 429, hard cap 400) at INFO level.
- Metric: `quota_check_total{resource, allowed}` (Prometheus counter).
- Metric: `grace_period_active{user_tier}` (Prometheus gauge).
- Alert: `quota_violations_5min > 100` (possible abuse or misconfiguration).

---

## Glossary

- **Hard cap**: Request blocked when limit reached (e.g., order checkout denied).
- **Soft cap**: User allowed to exceed limit, but recorded (e.g., storage overage charged next cycle).
- **Grace period**: Time window after downgrade to reduce usage before enforcement.
- **Period**: Billing cycle (1 month, 6 months, 1 year) defined by `Subscription.currentPeriodStart/End`.
- **Cumulative**: Metric that persists across billing periods (never resets).
- **Atomic**: Operation guaranteed to complete fully or not at all (no partial state).
- **Coarse layer**: Store-level subscription check (one boolean: accessible or not).
- **Fine layer**: Feature- and resource-specific checks (custom limits per resource type).

---

## References

- [src/lib/usage-service.ts](src/lib/usage-service.ts) — Core usage tracking functions.
- [src/lib/plan-features.ts](src/lib/plan-features.ts) — Feature gating & plan config caching.
- [src/lib/api-with-store-check.ts](src/lib/api-with-store-check.ts) — Coarse-layer HOF wrappers.
- [src/lib/store-subscription-service.ts](src/lib/store-subscription-service.ts) — Store access check & cache.
- [src/app/api/cron/downgrade-lifecycle/route.ts](src/app/api/cron/downgrade-lifecycle/route.ts) — Grace period lifecycle.
- [src/app/api/cron/expire-trials-detect-payment-failure/route.ts](src/app/api/cron/expire-trials-detect-payment-failure/route.ts) — Period reset & payment detection.
- [prisma/schema.prisma](prisma/schema.prisma) — `UsageCumulative`, `UsageOrders`, `UsageApiCalls`, `Subscription`, `SubscriptionPlan`.
- Audit files: [notes/audits/](notes/audits/) — Full Phase 1 & Phase 2 audit trail.