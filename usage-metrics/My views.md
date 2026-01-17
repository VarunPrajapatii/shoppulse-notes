there will be 3 tables, one for Usage Metic (products/categories/billboards), one for api calls, one for orders.

API Calls: The 100 req/sec Problem 🔥

Current Approach (Don't Do This):

## Industry Standard Solution: Redis Counter + Periodic Flush

``` ts
// ✅ GOOD: Redis increment (in-memory, 100K ops/sec)
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)

// Middleware: Increment in Redis (< 1ms)
app.use(async (req, res, next) => {
  await redis.incr(`api_calls:${userId}:${currentPeriod}`)
  next()
})

// Background job: Flush to DB every 5 minutes
setInterval(async () => {
  const users = await redis.keys('api_calls:*')
  
  for (const key of users) {
    const [_, userId, period] = key.split(':')
    const count = await redis.get(key)
    
    // Batch update DB
    await prisma.usagePeriodic.update({
      where: { userId_metricType: { userId, metricType: 'API_CALLS' } },
      data: { count: { increment: parseInt(count) } }
    })
    
    // Reset Redis counter
    await redis.del(key)
  }
}, 5 * 60 * 1000) // Every 5 minutes
```

## Cron Job (Vercel):

``` ts
// app/api/cron/flush-api-calls/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  await flushApiCallsToDb()
  
  return Response.json({ success: true })
}
```


Without Redis:
100 req/sec × 50ms DB write = 5000ms (blocked)
❌ API becomes unusable

With Redis:
100 req/sec × 1ms Redis incr = 100ms (non-blocking)
✅ API stays fast
+ Batch DB write every 5min (1 query instead of 30,000)




## Option 3: Caching Layer (Current + Redis) ✅✅✅
This is what you should do FIRST (Industry standard: Stripe, GitHub, Vercel):

``` ts
// Keep current single table
// Add Redis for hot data

// lib/usage-cache.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function getOrderCount(userId: string): Promise<number> {
  // 1. Try cache first (< 5ms)
  const cached = await redis.get(`usage:${userId}:ORDERS`)
  if (cached) return parseInt(cached)

  // 2. Cache miss - query DB (50-100ms)
  const record = await prisma.usageRecord.findUnique({
    where: { 
      userId_metricType_periodStart_periodEnd: {
        userId,
        metricType: 'ORDERS',
        periodStart: currentPeriodStart,
        periodEnd: currentPeriodEnd
      }
    }
  })

  // 3. Store in cache (TTL: 5 minutes)
  await redis.setex(`usage:${userId}:ORDERS`, 300, record.count)
  
  return record.count
}

export async function incrementOrderCount(userId: string): Promise<void> {
  // 1. Increment in DB
  await prisma.usageRecord.update({
    where: { ... },
    data: { count: { increment: 1 } }
  })

  // 2. Invalidate cache
  await redis.del(`usage:${userId}:ORDERS`)
  
  // Or increment in cache too
  await redis.incr(`usage:${userId}:ORDERS`)
}
```

### Code example usage

``` ts
// lib/usage-service-with-cache.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)
const CACHE_TTL = 300 // 5 minutes

async function checkUsageLimit(
  userId: string, 
  metricType: UsageMetricType
): Promise<{ allowed: boolean; current: number; limit: number }> {
  
  // 1. Try cache (only for hot metrics)
  if (metricType === 'ORDERS' || metricType === 'API_CALLS') {
    const cacheKey = `usage:${userId}:${metricType}`
    const cached = await redis.get(cacheKey)
    
    if (cached) {
      const current = parseInt(cached)
      const limit = await getPlanLimit(userId, metricType)
      return { allowed: current < limit, current, limit }
    }
  }

  // 2. Cache miss or cold metric - query DB
  const record = await prisma.usageRecord.findUnique({
    where: { 
      userId_metricType_periodStart_periodEnd: { ... }
    }
  })

  // 3. Cache hot metrics
  if (metricType === 'ORDERS' || metricType === 'API_CALLS') {
    await redis.setex(`usage:${userId}:${metricType}`, CACHE_TTL, record.count)
  }

  const limit = await getPlanLimit(userId, metricType)
  return { allowed: record.count < limit, current: record.count, limit }
}

async function incrementUsage(userId: string, metricType: UsageMetricType) {
  // 1. Increment DB
  await prisma.usageRecord.update({
    where: { ... },
    data: { count: { increment: 1 } }
  })

  // 2. Invalidate cache (or increment)
  if (metricType === 'ORDERS' || metricType === 'API_CALLS') {
    await redis.incr(`usage:${userId}:${metricType}`)
    await redis.expire(`usage:${userId}:${metricType}`, CACHE_TTL)
  }
}
```



Why Redis First?

✅ 100x faster (5ms vs 50-100ms)
✅ Handles 100K+ requests/sec
✅ Easy to implement (2-3 hours)
✅ Doesn't change schema
✅ Cache hot data (ORDERS/API_CALLS), skip cold data (PRODUCTS)


# Usage History
The Problem Without UsageHistory

Scenario: User on Monthly Plan

```ts
// January 2025
UsagePeriodic {
  userId: "user123",
  metricType: "ORDERS",
  count: 850,
  periodStart: "2025-01-01",
  periodEnd: "2025-01-31"
}

// February arrives - NEW BILLING CYCLE
// You need to reset the counter to 0
// What happens to January's data?

// Option 1: Update the same record ❌
UsagePeriodic {
  count: 0,  // Lost January's 850 orders!
  periodStart: "2025-02-01",
  periodEnd: "2025-02-28"
}

// Option 2: Delete and create new ❌
// Same problem - lost January's data

// Option 3: Keep accumulating records ❌
UsagePeriodic {
  { count: 850, periodStart: "2025-01-01", periodEnd: "2025-01-31" },
  { count: 720, periodStart: "2025-02-01", periodEnd: "2025-02-28" },
  { count: 910, periodStart: "2025-03-01", periodEnd: "2025-03-31" },
  // ... 12 months later, you have 12 records per user per metric
  // ... 24 months later, you have 24 records per user per metric
  // 100K users × 2 metrics × 24 months = 4.8 MILLION rows!
}
```

The Solution: Archive to UsageHistory
What It Does
UsageHistory is a separate "cold storage" table for old billing period data that:

You don't need for day-to-day operations
You DO need for analytics, reports, and billing disputes
Should never be updated (immutable)
Can be stored cheaply (doesn't need fast access)

Real-World Use Cases

1. Analytics Dashboard

```ts
// User wants to see "Orders over last 6 months"
// Without UsageHistory:
// ❌ Only have current month's data

// With UsageHistory:
const last6Months = await prisma.usageHistory.findMany({
  where: {
    userId: "user123",
    metricType: "ORDERS",
    periodStart: { gte: sixMonthsAgo }
  },
  orderBy: { periodStart: 'asc' }
})

// Result:
[
  { count: 850, period: "Jan 2025" },
  { count: 720, period: "Feb 2025" },
  { count: 910, period: "Mar 2025" },
  { count: 780, period: "Apr 2025" },
  { count: 840, period: "May 2025" },
  { count: 920, period: "Jun 2025" }  // Current month (from UsagePeriodic)
]

// Show chart: 📈 Orders trending up!
```

2. Billing Dispute

```ts
// User: "Why was I charged overage fees in March?"
// You: Let me check...

const marchUsage = await prisma.usageHistory.findFirst({
  where: {
    userId: "user123",
    metricType: "ORDERS",
    periodStart: new Date("2025-03-01"),
    periodEnd: new Date("2025-03-31")
  }
})

// Result: 910 orders (limit was 500, overage = 410 × $0.10 = $41)
// Proof of billing accuracy!
```

3. Business Analytics

```ts
// CEO: "What's our average orders per user per month?"

const avgOrders = await prisma.usageHistory.aggregate({
  where: { metricType: "ORDERS" },
  _avg: { count: true }
})

// Result: 823 orders/user/month average
// Helps with capacity planning, pricing strategy
```

4. Usage Patterns

``` ts
// Product Manager: "Do users hit limits more in December (holiday season)?"

const decemberUsage = await prisma.usageHistory.groupBy({
  by: ['userId'],
  where: {
    metricType: "ORDERS",
    periodStart: { gte: new Date("2024-12-01") },
    periodEnd: { lte: new Date("2024-12-31") }
  },
  _avg: { count: true }
})

// Result: December avg = 1,245 orders (50% higher than normal)
// Decision: Offer seasonal upgrade promotions!
```

How It Works: The Flow

Step 1: New Billing Cycle Starts (Cron Job)

```ts
// Runs daily at midnight
// app/api/cron/reset-periodic-usage/route.ts

export async function GET() {
  // Find all users whose new period started
  const usersToReset = await findUsersWithNewPeriod()
  
  for (const user of usersToReset) {
    // 1. Get old period data
    const oldRecords = await prisma.usagePeriodic.findMany({
      where: {
        userId: user.id,
        periodEnd: { lt: user.newPeriodStart }  // Old periods
      }
    })
    
    // 2. Archive to history (backup)
    await prisma.usageHistory.createMany({
      data: oldRecords.map(record => ({
        userId: record.userId,
        metricType: record.metricType,
        count: record.count,
        periodStart: record.periodStart,
        periodEnd: record.periodEnd
      }))
    })
    
    // 3. Delete old records (free up space)
    await prisma.usagePeriodic.deleteMany({
      where: {
        userId: user.id,
        periodEnd: { lt: user.newPeriodStart }
      }
    })
    
    // 4. Create new period records (count: 0)
    await prisma.usagePeriodic.createMany({
      data: [
        { 
          userId: user.id, 
          metricType: 'ORDERS', 
          count: 0,
          periodStart: user.newPeriodStart,
          periodEnd: user.newPeriodEnd
        },
        { 
          userId: user.id, 
          metricType: 'API_CALLS', 
          count: 0,
          periodStart: user.newPeriodStart,
          periodEnd: user.newPeriodEnd
        }
      ]
    })
  }
}
```

Why Not Just Keep Everything in UsagePeriodic?
Performance Impact

```ts
// Without History (keep all periods in UsagePeriodic)
// After 2 years:
100,000 users × 2 metrics × 24 months = 4,800,000 rows

// Query current usage:
SELECT * FROM UsagePeriodic 
WHERE userId = 'user123' 
  AND metricType = 'ORDERS'
  AND periodEnd >= NOW()
  
// Scans 4.8M rows to find 1 row ❌ SLOW (500ms+)

// With History (only current period in UsagePeriodic)
100,000 users × 2 metrics × 1 month = 200,000 rows

// Same query:
// Scans 200K rows to find 1 row ✅ FAST (20ms)
```


# we will separaate the order and api calls limit counts table.