Rate Limiting - Explained for ShopPulse
What is Rate Limiting?
Rate limiting = Controlling how many API requests a store can make per time period

Why You Need It for ShopPulse:
Problem Without Rate Limiting:

``` typescript
// User with EXPIRED subscription
for (let i = 0; i < 1000000; i++) {
  fetch('/api/store123/products');  // 1 million requests!
}

// Your server:
// - Checks subscription 1 million times
// - Database overloaded
// - Other users experience slowdown
// - Your Vercel bill explodes 💸
```

Problem 2: Malicious Attack:

``` typescript
// Attacker discovers your storeId
while(true) {
  fetch('/api/store123/products');  // DDoS attack
  fetch('/api/store123/billboards');
  fetch('/api/store123/categories');
}

// Result: Your app crashes, legitimate customers can't access their stores
```

Rate Limiting Solution:
Implement rate limiting per storeId to restrict number of API calls allowed in a time window (e.g., 1000 requests per minute).

``` typescript
// Limit: 1000 requests per hour per store

// Request 1-1000: ✅ Allowed
// Request 1001: ❌ Blocked with 429 error

{
  "error": "Rate limit exceeded",
  "retry_after": 1800  // Try again in 30 minutes
}
```

How It Works in ShopPulse:

┌─────────────────────────────────────────────────────────┐
│                ShopPulse Rate Limiting                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Store Frontend makes request:                          │
│  GET /api/store123/products                             │
│                                                          │
│  ↓                                                       │
│                                                          │
│  Rate Limiter checks Redis:                             │
│  Key: "ratelimit:store123:hour:12"                     │
│  Value: 847 (current request count this hour)          │
│                                                          │
│  ↓                                                       │
│                                                          │
│  Is 847 < 1000 (limit)?                                 │
│  ├── YES → Increment to 848, allow request             │
│  └── NO  → Return 429 error, block request             │
│                                                          │
│  Every new hour (13:00 → 14:00):                       │
│  └── Counter resets to 0                                │
│                                                          │
└─────────────────────────────────────────────────────────┘


Real Example for ShopPulse:

``` typescript
// WITHOUT rate limiting:
// Store owner's subscription expires
// Their storefront keeps making 10,000 requests/day
// You're paying for database queries for FREE users!

// WITH rate limiting:
// Store with EXPIRED subscription gets 0 requests/hour
// Store with ACTIVE subscription gets 1000 requests/hour
// Store with PRO subscription gets 5000 requests/hour

const RATE_LIMITS = {
  'TRIAL': 100,      // Trial users: 100 requests/hour
  'ACTIVE': 1000,    // Basic plan: 1000 requests/hour
  'EXPIRED': 0,      // Expired: No access
  'CANCELED': 0      // Cancelled: No access
};

```

User Journey with Rate Limiting:
Normal Store (ACTIVE subscription):

Customer visits: store123.com
  ↓
Frontend loads products: GET /api/store123/products (Request #547 this hour)
  ↓
Rate limiter: 547 < 1000 ✅ Allowed
  ↓
Response: [products array]
  ↓
Customer sees products, adds to cart, checks out
Everything works perfectly! ✅

Store Hitting Limit (Bot attack or high traffic):

Hour: 10:00 AM
Requests so far: 999

Customer visits: store123.com
  ↓
Frontend loads: GET /api/store123/products (Request #1000)
  ↓
Rate limiter: 1000 <= 1000 ✅ Allowed (last one!)
  ↓
Works!

Next customer: GET /api/store123/products (Request #1001)
  ↓
Rate limiter: 1001 > 1000 ❌ BLOCKED
  ↓
Response: 429 Rate Limit Exceeded
  ↓
Store shows: "Too many visitors. Please try again in a few minutes."

At 11:00 AM: Counter resets to 0, store works again ✅



Why Tiered Rate Limits?
Your Pricing Strategy:

// Free Trial (14 days):
// - 100 requests/hour
// - Good for testing, small stores
// - If they exceed: Upsell to paid plan

// Basic Plan (₹299/month):
// - 1000 requests/hour
// - Handles ~100-200 customers/day
// - Normal stores

// Pro Plan (₹599/month):
// - 5000 requests/hour
// - Handles ~1000+ customers/day
// - High-traffic stores

// Enterprise Plan (₹1499/month):
// - 20,000 requests/hour
// - Big businesses
// - Premium support


Monetization:

``` typescript
// Store hits rate limit (1000 requests)
// Show owner: 
"⚠️ You've reached your plan's request limit!
 
 Your store experienced high traffic today (great news! 🎉)
 
 Upgrade to Pro Plan for 5x more capacity:
 - Handle 5,000 requests/hour
 - Faster response times
 - Priority support
 
 [Upgrade Now] - Only ₹599/month"
```

Rate Limiting vs Subscription Check:
Different Purposes:

``` typescript
// Subscription Check (Access Control):
// - Is store owner paying?
// - If EXPIRED → Block ALL requests (0 allowed)
// - Binary: Yes/No access

if (subscription.status === 'EXPIRED') {
  return 402 Payment Required;
}

// Rate Limiting (Abuse Prevention):
// - Is store making TOO MANY requests?
// - Even ACTIVE stores can be limited
// - Prevents one store from hogging resources

if (requestCount > 1000) {
  return 429 Too Many Requests;
}
```

Both Work Together:

// Request comes in
// 1. Check subscription (withStoreAccessCheck)
//    └── If EXPIRED: Block (402)

// 2. Check rate limit (withRateLimit)
//    └── If exceeded: Block (429)

// 3. If both pass: Process request ✅


Implementation in ShopPulse:

``` typescript
// File: src/lib/rate-limiter.ts

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function checkRateLimit(storeId: string, subscriptionStatus: string) {
  // Get limit based on subscription
  const limits = {
    'TRIAL': 100,
    'ACTIVE': 1000,
    'PRO': 5000,
    'EXPIRED': 0
  };
  
  const limit = limits[subscriptionStatus] || 100;
  
  // If expired, no requests allowed
  if (limit === 0) {
    return { allowed: false, remaining: 0 };
  }
  
  // Current hour bucket
  const now = Date.now();
  const hour = Math.floor(now / 3600000); // Unix timestamp / 1 hour
  const key = `ratelimit:${storeId}:${hour}`;
  
  // Increment counter in Redis
  const count = await redis.incr(key);
  
  // Set expiry (auto-delete after 2 hours)
  if (count === 1) {
    await redis.expire(key, 7200); // 2 hours in seconds
  }
  
  // Check if over limit
  const allowed = count <= limit;
  const remaining = Math.max(0, limit - count);
  
  return { allowed, remaining, limit };
}

```


Usage in API:

``` typescript
// File: src/app/api/[storeId]/products/route.ts

export const GET = async (req, { params }) => {
  const { storeId } = await params;
  
  // 1. Check subscription
  const subscription = await checkSubscription(storeId);
  if (!subscription.allowed) {
    return NextResponse.json({ error: 'Store closed' }, { status: 402 });
  }
  
  // 2. Check rate limit
  const rateLimit = await checkRateLimit(storeId, subscription.status);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        retry_after: 3600 - (Date.now() % 3600000) / 1000  // Seconds until next hour
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'Retry-After': '3600'
        }
      }
    );
  }
  
  // 3. Process request
  const products = await prismadb.product.findMany({ where: { storeId } });
  
  // Add rate limit headers to response
  return NextResponse.json(products, {
    headers: {
      'X-RateLimit-Limit': rateLimit.limit.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString()
    }
  });
};

```



Benefits for ShopPulse:
Protect Your Infrastructure:

One rogue store can't crash entire platform
Database stays healthy
All stores perform well
Control Costs:

Vercel bills by function invocations
Rate limiting caps max requests
Predictable costs
Monetization:

Tiered limits encourage upgrades
"Your store is popular! Upgrade for more capacity"
Upsell opportunity
Fair Usage:

Resources shared fairly across all stores
No one store hogs bandwidth
Better experience for everyone
Security:

Prevents DDoS attacks
Stops malicious scraping
Protects against bots


When to Implement Rate Limiting:
Phase 1 (Now):

Focus on subscription checks ✅
Basic access control (ACTIVE vs EXPIRED)
Phase 2 (After Launch, ~1 month):

Add simple rate limiting (1000 req/hour for everyone)
Monitor usage patterns
Phase 3 (Scaling, ~3 months):

Implement tiered limits (Trial: 100, Basic: 1000, Pro: 5000)
Use for monetization/upsells


TL;DR:
Rate Limiting = Traffic cop for your API


Without rate limiting:
Store makes 1,000,000 requests → Your server dies 💀

With rate limiting:
Store makes 1,001st request → "Slow down! Try again later" 🚦

Result:
- Your app stays fast ⚡
- Your bill stays low 💰
- Fair for all users 🤝
- Upsell opportunity 📈


For ShopPulse specifically:

Control which subscription tier gets how many requests
Protect your Vercel/database bills
Encourage upgrades when stores grow
Prevent abuse/attacks