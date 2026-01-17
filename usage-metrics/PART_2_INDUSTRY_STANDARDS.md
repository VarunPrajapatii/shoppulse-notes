# PART 2: Industry Standards & Best Practices for SaaS Usage Metrics

**Document Purpose**: Analyze industry-standard approaches to usage tracking and limit enforcement  
**Date**: November 29, 2025  
**Status**: Research Complete ✅

---

## Table of Contents

1. [Industry Leaders Analysis](#industry-leaders-analysis)
2. [Common Patterns](#common-patterns)
3. [Best Practices](#best-practices)
4. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
5. [Recommendations for ShopPulse](#recommendations-for-shoppulse)

---

## Industry Leaders Analysis

### 1. Shopify (E-commerce Platform)

**Plan Structure**:
```
Basic Plan ($39/month):
- Unlimited products ✅
- Up to 1000 inventory locations
- Staff accounts: 2

Shopify Plan ($105/month):
- Unlimited products ✅
- Up to 1000 inventory locations
- Staff accounts: 5

Advanced Plan ($399/month):
- Unlimited products ✅
- Up to 1000 inventory locations
- Staff accounts: 15
```

**Enforcement Strategy**:
- ✅ **Soft Limits**: Warns before hitting limit
- ✅ **Graceful Degradation**: Disables features, doesn't block core functionality
- ✅ **Clear Communication**: Shows limit in dashboard always
- ✅ **Proactive Notifications**: Email when reaching 80%, 90%, 100%

**Usage Display**:
```
┌─────────────────────────────────────┐
│ Staff Accounts                      │
│ ████████░░ 8 of 15 used (53%)      │
│                                     │
│ Inventory Locations                 │
│ ██░░░░░░░░ 120 of 1000 used (12%)  │
└─────────────────────────────────────┘
```

**Key Takeaways**:
1. Unlimited products (no artificial scarcity)
2. Limit other resources (staff, locations)
3. Visual progress bars everywhere
4. Upgrade prompts when 80%+ used

---

### 2. Stripe (Payment Processing)

**Plan Structure**:
```
Free Plan:
- API calls: 100,000/month
- Webhooks: 1000 events/day
- Test mode: Unlimited

Pro Plan ($99/month):
- API calls: 1,000,000/month
- Webhooks: 10,000 events/day
- Advanced fraud detection
```

**Enforcement Strategy**:
- ✅ **Rate Limiting**: HTTP 429 Too Many Requests
- ✅ **Soft Blocking**: Queues requests when limit hit
- ✅ **Clear Headers**: Returns usage in response headers
  ```
  X-RateLimit-Limit: 100000
  X-RateLimit-Remaining: 45230
  X-RateLimit-Reset: 1735516800
  ```
- ✅ **Dashboard Analytics**: Real-time usage graphs

**Usage Display**:
```
API Calls This Month
█████████░ 87,450 / 100,000 (87.4%)

Projected to exceed limit in 3 days
[Upgrade Now] [Learn More]
```

**Key Takeaways**:
1. Real-time rate limiting (per second/minute)
2. Transparent usage in API responses
3. Predictive warnings ("will exceed in X days")
4. Soft queuing instead of hard blocks

---

### 3. Heroku (Platform as a Service)

**Plan Structure**:
```
Eco Plan ($5/month):
- 1000 dyno hours/month
- 10,000 rows in PostgreSQL
- SSL included

Basic Plan ($7/month):
- Unlimited dyno hours
- 10,000,000 rows in PostgreSQL
- Metrics dashboard
```

**Enforcement Strategy**:
- ✅ **Hard Limits with Grace**: Stops service but gives 24h to upgrade
- ✅ **Usage Pooling**: Hours pooled across all apps
- ✅ **Clear Warnings**: Email 7 days before, 3 days before, 1 day before
- ❌ **Hard Stop**: App goes offline if limit exceeded

**Usage Display**:
```
Dyno Hours This Month
███████████████░░ 847 / 1000 hours (84.7%)

Apps consuming hours:
- my-api-server: 423h (42.3%)
- staging-app: 289h (28.9%)
- demo-store: 135h (13.5%)

[View detailed breakdown] [Upgrade plan]
```

**Key Takeaways**:
1. Pooled usage across resources
2. Granular breakdown per resource
3. Email warnings at key thresholds
4. Grace period before hard stop

---

### 4. MongoDB Atlas (Database as a Service)

**Plan Structure**:
```
Free Tier (M0):
- Storage: 512 MB
- RAM: Shared
- Connections: 500 concurrent

Shared Tier (M2-M5): $9-$60/month
- Storage: 2-10 GB
- RAM: Dedicated
- Connections: 500-1000

Dedicated Clusters: $60+/month
- Storage: 10 GB - Unlimited
- RAM: 2 GB - 768 GB
- Connections: 1500+
```

**Enforcement Strategy**:
- ✅ **Multi-metric Tracking**: Storage, RAM, connections, bandwidth
- ✅ **Automatic Scaling**: Can auto-upgrade if enabled
- ✅ **Detailed Alerts**: Per-metric notifications
- ✅ **Usage Forecasting**: Predicts when upgrade needed

**Usage Display**:
```
┌───────────────────────────────────────┐
│ Cluster: production-db                │
├───────────────────────────────────────┤
│ Storage                               │
│ ███████████████░░ 387 MB / 512 MB     │
│ ⚠️  76% used - Running low on space   │
│                                       │
│ Connections (Current)                 │
│ ████░░░░░░░░░░░░ 43 / 500             │
│ ✅ Healthy                            │
│                                       │
│ Connections (Peak)                    │
│ ██████████░░░░░░ 287 / 500            │
│                                       │
│ Data Transfer (This month)            │
│ ████████░░░░░░░░ 12.3 GB / 50 GB      │
└───────────────────────────────────────┘

[Enable Auto-Scaling] [Upgrade Cluster]
```

**Key Takeaways**:
1. Track current AND peak usage
2. Per-resource health indicators
3. Auto-scaling option (pay more, no downtime)
4. Forecasting based on growth rate

---

### 5. GitHub (Code Hosting)

**Plan Structure**:
```
Free Plan:
- Public repositories: Unlimited
- Private repositories: Unlimited
- GitHub Actions minutes: 2000/month
- GitHub Packages storage: 500 MB

Pro Plan ($4/user/month):
- Everything in Free
- GitHub Actions minutes: 3000/month
- GitHub Packages storage: 2 GB
- Advanced code review
```

**Enforcement Strategy**:
- ✅ **Feature-based Limits**: Core features unlimited, add-ons limited
- ✅ **Overage Billing**: Can exceed and pay per-unit
- ✅ **Soft Warnings**: Emails before Actions minutes run out
- ✅ **Graceful Failure**: Actions pause, repos still accessible

**Usage Display**:
```
GitHub Actions
████████████████████░░ 2,847 / 3,000 minutes (94.9%)

Top consumers this month:
1. CI/CD Pipeline (main.yml): 1,245 min
2. Deploy Production (deploy.yml): 892 min
3. Tests (test.yml): 710 min

You have 153 minutes remaining
[Buy additional minutes] [Upgrade plan]
```

**Key Takeaways**:
1. Core features unlimited (repos)
2. Limit consumption-based features (Actions, storage)
3. Overage billing option (don't block, charge more)
4. Granular breakdown by workflow/resource

---

### 6. Vercel (Deployment Platform)

**Plan Structure**:
```
Hobby Plan (Free):
- Deployments: 100 GB bandwidth/month
- Serverless function executions: 100 GB-hours/month
- Build time: 6000 minutes/month

Pro Plan ($20/month):
- Bandwidth: 1 TB/month
- Function executions: 1000 GB-hours/month
- Build time: 6000 minutes/month
- Team collaboration: 10 users
```

**Enforcement Strategy**:
- ✅ **Per-Project Tracking**: Usage shown per deployment
- ✅ **Predictive Warnings**: "At current rate, will exceed in 12 days"
- ✅ **Automatic Pausing**: Pauses deployments, sends email
- ✅ **Instant Resume**: Upgrade and resume immediately

**Usage Display**:
```
Bandwidth Usage
████████████░░░░░░░░ 62.4 GB / 100 GB (62.4%)

⚠️  Trending: At current pace, you'll use 98 GB by month end

By deployment:
┌─────────────────────────────────────┐
│ my-ecommerce-store    45.2 GB (72%) │
│ blog-site              12.3 GB (20%) │
│ landing-page           4.9 GB (8%)   │
└─────────────────────────────────────┘

[Optimize deployments] [Upgrade plan]
```

**Key Takeaways**:
1. Per-project breakdown
2. Trend forecasting ("will exceed in X days")
3. Optimization suggestions
4. Instant resume on upgrade

---

## Common Patterns

### 1. **Progressive Disclosure** (Used by all platforms)

**Pattern**: Show simple usage first, details on demand
```
Dashboard: 847 / 1000 products used (84.7%)
           [View breakdown ↓]
           
Expanded:  By store:
           - Main Store: 542 products (54.2%)
           - Test Store: 205 products (20.5%)
           - Archive Store: 100 products (10%)
```

**Benefits**:
- ✅ Clean dashboard
- ✅ Power users get details
- ✅ Casual users not overwhelmed

---

### 2. **Color-coded Health Indicators** (Universal)

**Pattern**: Use colors to show urgency
```
Green (0-70%):    ████████░░░░░░░░░░ 450 / 1000 ✅ Healthy
Yellow (70-90%):  ████████████████░░ 850 / 1000 ⚠️  High usage
Red (90-100%):    ███████████████████ 950 / 1000 🚨 Almost full
Over (100%+):     ████████████████████ 1,050 / 1000 ❌ Over limit
```

**Thresholds**:
- 0-70%: ✅ Normal (green)
- 70-90%: ⚠️ Warning (yellow)
- 90-100%: 🚨 Critical (red)
- 100%+: ❌ Over limit (red + badge)

---

### 3. **Multi-level Warnings** (Best practice)

**Pattern**: Escalating notifications as limit approaches

```
80% threshold:
  ℹ️  Email: "You've used 80% of your products"
  Action: Gentle reminder

90% threshold:
  ⚠️  Email + Dashboard banner: "Approaching limit"
  Action: Suggest upgrade

95% threshold:
  🚨 Email + Dashboard modal: "Almost at limit"
  Action: Block creation with upgrade CTA

100% threshold:
  ❌ Email + Dashboard lockdown: "Limit reached"
  Action: Hard block + upgrade required
```

---

### 4. **Predictive Analytics** (Advanced)

**Pattern**: Calculate usage trend and predict when limit will be hit

```typescript
// Calculate daily average growth
const last7Days = usageRecords.slice(0, 7);
const averageDailyGrowth = calculateAverage(last7Days.map(day => day.count));

// Predict when limit will be reached
const currentUsage = 847;
const limit = 1000;
const remaining = limit - currentUsage; // 153
const daysUntilFull = remaining / averageDailyGrowth; // e.g., 12 days

// Show prediction
if (daysUntilFull <= 30) {
  showWarning(`At current pace, you'll reach your limit in ${daysUntilFull} days`);
}
```

**Display**:
```
Products Used: 847 / 1000
📈 Trend: +23 products/day (7-day avg)
⏰ Projected to reach limit in 12 days

[Upgrade now] [Review usage]
```

---

### 5. **Per-Resource Breakdown** (Standard)

**Pattern**: Show which resources consume most quota

```
Total Storage: 4.2 GB / 5 GB (84%)

Top consumers:
1. Product Images        2.8 GB (66.7%)
2. Banner Images         1.1 GB (26.2%)
3. Category Thumbnails   0.3 GB (7.1%)

💡 Tip: Compress images to save space
[Optimize images] [Upgrade storage]
```

**Benefits**:
- Users understand where usage comes from
- Can optimize specific areas
- Actionable insights

---

### 6. **Soft Blocking with Upgrade Path** (Universal)

**Pattern**: Block action but provide clear path forward

```
❌ Product Limit Reached

You've reached your plan's limit of 100 products.

Options:
1. 🗑️  Delete or archive unused products
2. ⬆️  Upgrade to Half-Yearly plan (250 products)
3. 💼 Contact sales for custom limits

[View archived products] [Upgrade plan]
```

**Better Than**:
```
❌ Error: Cannot create product
[OK]
```

---

### 7. **Grace Period for Downgrades** (Premium SaaS)

**Pattern**: Don't immediately enforce limits after downgrade

```
Timeline:
Day 0: User downgrades (Half-Yearly → Monthly)
       No immediate change ✅
       
Day 30: Old plan expires, new plan starts
        System checks: 90 products > 50 limit
        Grace period activated: 14 days
        
Day 30-44: Grace period
           Emails: Day 7, 3, 1
           Dashboard banner with countdown
           User can manually reduce products
           
Day 44: Auto-archive 40 oldest products
        Email with list of archived products
        User can restore important ones
```

**Why?**
- User paid for Half-Yearly plan → Should get full period
- Time to adjust (delete, migrate, optimize)
- Better UX → Lower churn

---

### 8. **Usage Reset Per Period** (Critical for Subscriptions)

**Pattern**: Consumption limits reset each billing cycle

```
Monthly Plan: 1000 orders/month

Month 1 (Nov 1-30):
  Orders: 800 → 800/1000 ✅
  
Month 2 (Dec 1-31):
  Orders: 0 → 0/1000 ✅ (RESET!)
  New orders: 750 → 750/1000 ✅
  
Month 3 (Jan 1-31):
  Orders: 0 → 0/1000 ✅ (RESET!)
```

**Key Points**:
- ✅ Orders counter resets each period
- ✅ Products counter is CUMULATIVE (until manually deleted)
- ✅ Storage counter is CUMULATIVE (until files deleted)
- ✅ API calls reset each period

**Rule of Thumb**:
```
Cumulative metrics (don't reset):
- Products (until deleted)
- Categories (until deleted)
- Billboards (until deleted)
- Storage (until files deleted)

Per-period metrics (reset):
- Orders received
- API calls made
- Bandwidth used
- Server hours
```

---

## Best Practices

### 1. ✅ Always Show Usage Everywhere

**Bad ❌**:
```
Create Product page: No usage info
User creates 101st product → Error
User confused: "Why?"
```

**Good ✅**:
```
Create Product page header:
┌────────────────────────────────────────┐
│ Create New Product                     │
│                                        │
│ Products used: 47 / 100 (47%)         │
│ ████████░░░░░░░░░░░░░░░░░ ✅ Healthy │
└────────────────────────────────────────┘
```

---

### 2. ✅ Provide Context with Numbers

**Bad ❌**:
```
Storage: 4.2 GB
```

**Good ✅**:
```
Storage: 4.2 GB / 5 GB (84% used)
⚠️  800 MB remaining

Top consumers:
- Product images: 2.8 GB (66%)
- Banners: 1.1 GB (26%)

💡 Compress images to save space
[Learn how] [Upgrade storage]
```

---

### 3. ✅ Warn Early, Block Late

**Timeline**:
```
0-70%:   Silent (no warning)
70-80%:  Passive warning (dashboard only)
80-90%:  Email notification
90-95%:  Dashboard modal + email
95-100%: Repeated reminders
100%:    Soft block with upgrade CTA
```

**Why?**
- Users have time to act
- Not annoying at 50% usage
- Escalation makes urgency clear

---

### 4. ✅ Make Limits Transparent

**Bad ❌**:
```
Plan Features:
✓ Advanced analytics
✓ Priority support
✓ Custom domain
```

**Good ✅**:
```
Plan Features:
✓ 100 products
✓ 1000 orders/month
✓ 5 GB storage
✓ Advanced analytics
✓ Priority support
✓ Custom domain

Compare plans →
```

---

### 5. ✅ Offer Workarounds

**Bad ❌**:
```
❌ Product limit reached. Upgrade to continue.
[Upgrade now]
```

**Good ✅**:
```
❌ Product limit reached (100/100)

Options:
1. 🗑️  Archive unused products
   [View all products]
   
2. ⬆️  Upgrade to Half-Yearly plan
   → 250 products (+150)
   → ₹18,000 for 6 months
   [Upgrade now]
   
3. 💼 Need more than 250 products?
   [Contact sales]
```

---

### 6. ✅ Real-time Updates

**Bad ❌**:
```
Usage calculated once per day (cron job)
User creates 10 products
Dashboard still shows old count
User confused
```

**Good ✅**:
```
Usage updated immediately on action:
- Product created → +1 to counter
- Product deleted → -1 from counter
- Dashboard shows real-time count
- Optional: Cron job for verification
```

---

### 7. ✅ Cache with Invalidation

**Pattern**:
```typescript
// Cache usage for 5 minutes
const cacheKey = `usage:${userId}:products`;
let usage = await cache.get(cacheKey);

if (!usage) {
  usage = await calculateUsage(userId);
  await cache.set(cacheKey, usage, 300); // 5 min TTL
}

// Invalidate on change
async function createProduct(userId, data) {
  const product = await prisma.product.create({ data });
  
  // Invalidate cache immediately
  await cache.del(`usage:${userId}:products`);
  
  return product;
}
```

**Benefits**:
- Fast reads (cached)
- Accurate data (invalidated on write)
- Reduced database load

---

### 8. ✅ Idempotent Operations

**Bad ❌**:
```typescript
// Not idempotent - double increment on retry
await incrementUsage(userId, 'PRODUCTS');
await createProduct(data);
```

**Good ✅**:
```typescript
// Idempotent - transaction ensures consistency
await prisma.$transaction([
  prisma.product.create({ data }),
  prisma.usageRecord.upsert({
    where: { userId_metricType_period },
    update: { count: { increment: 1 } },
    create: { userId, metricType: 'PRODUCTS', count: 1 }
  })
]);

// If transaction fails → both operations rolled back
// If retried → product.create fails (already exists) → no double increment
```

---

## Anti-Patterns to Avoid

### 1. ❌ Silent Failures

**Bad**:
```typescript
try {
  await createProduct(data);
} catch (error) {
  // Silently fail - user sees nothing
  console.error('Failed:', error);
  return { success: true }; // LIE!
}
```

**Impact**: User thinks product created, but it wasn't. Data loss.

---

### 2. ❌ Last-Minute Blocking

**Bad**:
```
User works on product form for 10 minutes
Fills all fields
Clicks "Create"
→ "Product limit reached"
```

**Better**:
```
User navigates to "Create Product" page
→ Sees warning banner: "47/100 products used"
User fills form
Clicks "Create"
→ Success! (Or clear error if limit reached while filling)
```

---

### 3. ❌ Vague Error Messages

**Bad**:
```
❌ Error: Limit exceeded
[OK]
```

**Good**:
```
❌ Product Limit Reached

You've used all 100 products in your Monthly plan.

Next steps:
• Upgrade to Half-Yearly (250 products): ₹18,000
• Archive unused products
• Contact sales for custom limits

[Upgrade now] [View products] [Contact us]
```

---

### 4. ❌ Cumulative Order Tracking

**Bad**:
```
Month 1: 800 orders → Total: 800
Month 2: 500 orders → Total: 1300 (EXCEEDS 1000 LIMIT!)
→ User blocked from receiving orders
```

**Good**:
```
Month 1: 800 orders → Period: 800/1000 ✅
Month 2: 500 orders → Period: 500/1000 ✅ (RESET)
```

---

### 5. ❌ No Archiving Option

**Bad**:
```
User at 100/100 products
Only option: Permanently delete products
→ Data loss risk
```

**Good**:
```
Archive Products:
• Doesn't count toward limit
• Preserves data
• Can restore anytime
• No additional cost
```

---

### 6. ❌ Immediate Downgrade Enforcement

**Bad**:
```
User downgrades from HY → Monthly
Immediately: 90 products → Limit 50
System: Auto-deletes 40 products NOW
User: Panic! Lost important products!
```

**Good**:
```
User downgrades from HY → Monthly
System: Schedules downgrade for period end (4 months away)
User keeps 90 products until then ✅
At period end: 14-day grace period
Emails: Day 7, 3, 1
Day 14: Auto-ARCHIVE (not delete) 40 oldest products
User can restore important ones
```

---

## Recommendations for ShopPulse

Based on industry analysis, here are **specific recommendations** for ShopPulse Admin:

### 1. Core Metrics to Track

#### Cumulative Metrics (Don't Reset)
```typescript
✅ PRODUCTS     // Until archived/deleted
✅ CATEGORIES   // Until deleted
✅ BILLBOARDS   // Until deleted
✅ STORAGE_GB   // Until files deleted
```

#### Per-Period Metrics (Reset Each Cycle)
```typescript
✅ ORDERS       // Orders THIS billing period
✅ API_CALLS    // API calls THIS period
```

### 2. Limit Structure

**Recommended Plan Limits**:
```typescript
interface PlanLimits {
  // Direct columns (primary limits)
  maxProducts: number | null;    // e.g., 100
  maxOrders: number | null;      // e.g., 1000/month
  maxStorageGB: number | null;   // e.g., 5 GB
  
  // JSON field (secondary limits)
  additionalLimits: {
    maxCategories?: number;      // e.g., 50
    maxBillboards?: number;      // e.g., 20
    maxSizes?: number;           // e.g., 30
    maxApiCallsPerDay?: number;  // e.g., 10000
  }
}
```

**Example Plans**:
```
TRIAL (7 days):
  Products: 25 (limited for testing)
  Orders: Unlimited
  Storage: 1 GB
  Categories: 10
  Billboards: 5

MONTHLY (₹3,500):
  Products: 100
  Orders: 1000/month
  Storage: 5 GB
  Categories: 50
  Billboards: 20

HALF_YEARLY (₹18,000):
  Products: 250
  Orders: 5000/month
  Storage: 20 GB
  Categories: 100
  Billboards: 50

YEARLY (₹38,500):
  Products: 500
  Orders: Unlimited
  Storage: 50 GB
  Categories: Unlimited
  Billboards: Unlimited
```

### 3. Enforcement Strategy

**Recommended Approach**:
```
1. Pre-check (Before API call):
   ✅ Verify user hasn't exceeded limit
   ❌ Block with clear error if exceeded
   
2. Create resource (Database):
   ✅ Create product/order/etc
   
3. Update usage (Atomic):
   ✅ Increment UsageRecord in same transaction
   
4. Invalidate cache:
   ✅ Clear cached usage count
   
5. Check thresholds:
   ✅ If 80%+ → Send warning email
   ✅ If 90%+ → Show dashboard alert
```

### 4. User Experience

**Dashboard Display**:
```tsx
// Usage Card Component
<UsageCard>
  <Metric name="Products" current={87} limit={100} />
  <Metric name="Orders" current={423} limit={1000} period="This month" />
  <Metric name="Storage" current={3.2} limit={5} unit="GB" />
  <Metric name="Categories" current={28} limit={50} />
</UsageCard>

// Each metric shows:
// - Progress bar with color coding
// - Percentage
// - Absolute numbers
// - Warning if >80%
// - Upgrade CTA if >90%
```

**Create Product Page**:
```tsx
<Header>
  <Title>Create New Product</Title>
  <UsageBadge>
    Products: 87/100 (87%)
    {usage > 80 && <WarningIcon />}
  </UsageBadge>
</Header>

{usage >= 100 && (
  <Alert variant="error">
    Product limit reached. Upgrade to continue.
    <UpgradeButton />
  </Alert>
)}

<ProductForm disabled={usage >= 100} />
```

### 5. Notification Strategy

**Email Triggers**:
```typescript
// 80% threshold
if (percentage >= 80 && percentage < 90) {
  await sendEmail({
    template: 'usage_warning',
    subject: 'You've used 80% of your products',
    data: { current: 80, limit: 100 }
  });
}

// 90% threshold
if (percentage >= 90 && percentage < 95) {
  await sendEmail({
    template: 'usage_critical',
    subject: '⚠️ Approaching product limit',
    data: { current: 90, limit: 100 }
  });
}

// 100% threshold
if (percentage >= 100) {
  await sendEmail({
    template: 'usage_exceeded',
    subject: '🚨 Product limit reached',
    data: { current: 100, limit: 100 }
  });
}
```

**Frequency Rules**:
- 80% warning: Once when threshold crossed
- 90% critical: Once when threshold crossed
- 100% exceeded: Once, then daily until upgraded
- Grace period: Day 7, 3, 1 before expiration

### 6. Technical Implementation

**Helper Service** (`src/lib/usage-service.ts`):
```typescript
export async function checkUsageLimit(
  userId: string,
  metricType: UsageMetricType
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. Get user's plan
  // 2. Get current usage
  // 3. Compare against limit
  // 4. Return decision
}

export async function incrementUsage(
  userId: string,
  metricType: UsageMetricType
): Promise<void> {
  // 1. Get current billing period
  // 2. Upsert UsageRecord (increment count)
  // 3. Check if threshold crossed (80%, 90%, 100%)
  // 4. Trigger notifications if needed
  // 5. Invalidate cache
}

export async function decrementUsage(
  userId: string,
  metricType: UsageMetricType
): Promise<void> {
  // Similar to increment but decrement
}

export async function resetPeriodUsage(
  userId: string,
  metricTypes: UsageMetricType[]
): Promise<void> {
  // Called when new billing period starts
  // Resets ORDERS, API_CALLS counters
  // Keeps PRODUCTS, STORAGE_GB cumulative
}
```

**API Integration**:
```typescript
// In product creation route
export async function POST(req: Request) {
  const { userId } = await auth();
  
  // 1. Check limit BEFORE creating
  const check = await checkUsageLimit(userId, 'PRODUCTS');
  if (!check.allowed) {
    return NextResponse.json(
      { error: check.reason, code: 'LIMIT_EXCEEDED' },
      { status: 403 }
    );
  }
  
  // 2. Create product + update usage in transaction
  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data });
    
    await tx.usageRecord.upsert({
      where: { userId_metricType_periodStart_periodEnd },
      update: { count: { increment: 1 } },
      create: { userId, metricType: 'PRODUCTS', count: 1, ... }
    });
    
    return product;
  });
  
  // 3. Post-processing (async, don't block response)
  incrementUsage(userId, 'PRODUCTS'); // Handles cache, notifications
  
  return NextResponse.json(result);
}
```

---

## Summary

### Industry Consensus ✅

1. **Show usage everywhere** - Dashboard, create pages, headers
2. **Color-coded indicators** - Green → Yellow → Red
3. **Multi-level warnings** - 80%, 90%, 95%, 100%
4. **Soft blocking** - Clear error + upgrade path
5. **Grace periods** - For downgrades and overages
6. **Per-period resets** - For consumption metrics (orders, API calls)
7. **Cumulative tracking** - For inventory metrics (products, storage)
8. **Predictive analytics** - "Will exceed in X days"
9. **Per-resource breakdown** - Show where usage comes from
10. **Archive option** - Don't force deletion

### ShopPulse Should Implement ✅

1. ✅ Real-time usage updates (on create/delete)
2. ✅ Pre-checks before allowing actions
3. ✅ Dashboard usage cards with progress bars
4. ✅ Email notifications at 80%, 90%, 100%
5. ✅ Period-based resets for orders
6. ✅ Cumulative tracking for products
7. ✅ Grace period for downgrades (14 days)
8. ✅ Auto-archive (not delete) excess products
9. ✅ Clear upgrade CTAs when limits hit
10. ✅ Archived products restoration

### What to Avoid ❌

1. ❌ Silent failures
2. ❌ Last-minute blocking (show warnings early)
3. ❌ Vague error messages
4. ❌ Cumulative order tracking (should reset)
5. ❌ No archiving option (forced deletion)
6. ❌ Immediate downgrade enforcement (no grace)
7. ❌ Hidden limits (should be transparent)
8. ❌ No workarounds (only "upgrade or else")

---

**Next Document**: [PART 3: Practical Implementation Guide](./PART_3_IMPLEMENTATION_GUIDE.md)
