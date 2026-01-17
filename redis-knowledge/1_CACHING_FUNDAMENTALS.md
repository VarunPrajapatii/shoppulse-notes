# Part 1: Caching Fundamentals

> 📚 **Purpose**: Understand what caching is, why it matters, and the foundational concepts before diving into Redis.

---

## Table of Contents

1. [What is Caching?](#what-is-caching)
2. [Why Do We Need Caching?](#why-do-we-need-caching)
3. [The Cache Hit and Miss Concept](#the-cache-hit-and-miss-concept)
4. [Types of Caching](#types-of-caching)
5. [Caching Strategies](#caching-strategies)
6. [Cache Invalidation](#cache-invalidation)
7. [Cache Eviction Policies](#cache-eviction-policies)
8. [Common Caching Problems](#common-caching-problems)
9. [When NOT to Cache](#when-not-to-cache)
10. [Interview Questions](#interview-questions)

---

## What is Caching?

### Simple Definition

**Caching** is the process of storing copies of data in a temporary storage location (cache) so that future requests for that data can be served faster.

Think of it like this:

```
Without Cache:
┌─────────┐     ┌─────────────┐     ┌──────────┐
│ Browser │ ──► │   Server    │ ──► │ Database │  (Slow: 50-200ms)
└─────────┘     └─────────────┘     └──────────┘

With Cache:
┌─────────┐     ┌─────────────┐     ┌───────┐
│ Browser │ ──► │   Server    │ ──► │ Cache │  (Fast: 1-5ms)
└─────────┘     └─────────────┘     └───────┘
                                         │
                                    (Only on miss)
                                         ▼
                                    ┌──────────┐
                                    │ Database │
                                    └──────────┘
```

### Real-World Analogies

#### 1. Library Analogy
- **Database** = Main library storage room (takes time to fetch)
- **Cache** = Your desk with frequently used books (instant access)
- When you need a book, you first check your desk. Only if it's not there, you go to the storage room.

#### 2. Kitchen Analogy
- **Database** = Grocery store (takes time to go shopping)
- **Cache** = Your refrigerator (instant access)
- You stock up on frequently used items so you don't go to the store for every meal.

#### 3. Browser Analogy
- When you visit a website, images and CSS files are cached in your browser
- Next visit: instant load from local cache instead of downloading again

---

## Why Do We Need Caching?

### The Performance Problem

Consider a typical e-commerce product page:

```
Without Caching:
─────────────────────────────────────────────────────────
Request 1: GET /products → Database Query → 150ms
Request 2: GET /products → Database Query → 150ms
Request 3: GET /products → Database Query → 150ms
...
Request 1000: GET /products → Database Query → 150ms

Total time for 1000 requests: 150,000ms (2.5 minutes)
─────────────────────────────────────────────────────────

With Caching:
─────────────────────────────────────────────────────────
Request 1: GET /products → Database Query → Cache → 150ms (MISS)
Request 2: GET /products → Cache → 5ms (HIT)
Request 3: GET /products → Cache → 5ms (HIT)
...
Request 1000: GET /products → Cache → 5ms (HIT)

Total time for 1000 requests: 150 + (999 × 5) = 5,145ms (5.1 seconds)
─────────────────────────────────────────────────────────
```

**Result**: 97% reduction in response time!

### Benefits of Caching

| Benefit | Description |
|---------|-------------|
| **Speed** | Responses in milliseconds instead of hundreds of milliseconds |
| **Reduced Database Load** | Fewer queries hitting your database |
| **Cost Savings** | Less database compute = lower cloud bills |
| **Scalability** | Handle more users without upgrading database |
| **Better User Experience** | Faster pages = happier users |
| **Reliability** | Cache can serve requests even if database is temporarily slow |

### Real Numbers (Industry Benchmarks)

| Operation | Typical Latency |
|-----------|-----------------|
| L1 CPU Cache | 0.5 nanoseconds |
| L2 CPU Cache | 7 nanoseconds |
| RAM | 100 nanoseconds |
| Redis (in-memory) | 1-5 milliseconds |
| SSD | 150 microseconds |
| HDD | 10 milliseconds |
| Database Query | 50-200 milliseconds |
| Network Round Trip | 50-500 milliseconds |

---

## The Cache Hit and Miss Concept

### What is a Cache Hit?

A **cache hit** occurs when the requested data is found in the cache.

```
Request: "Give me product ID 123"
Cache: "I have it!" ✅ (HIT)
Result: Return data immediately (fast)
```

### What is a Cache Miss?

A **cache miss** occurs when the requested data is NOT in the cache.

```
Request: "Give me product ID 123"
Cache: "I don't have it" ❌ (MISS)
Result: Fetch from database, store in cache, return data (slow)
```

### Cache Hit Ratio

The **hit ratio** measures cache effectiveness:

```
Hit Ratio = Cache Hits / (Cache Hits + Cache Misses) × 100%
```

**Example:**
- 950 cache hits
- 50 cache misses
- Hit Ratio = 950 / 1000 × 100% = **95%**

**Industry Targets:**
| Application Type | Target Hit Ratio |
|-----------------|------------------|
| Static Content | 95-99% |
| Dynamic Content | 80-95% |
| User-Specific Data | 60-80% |
| Real-time Data | 40-60% |

### Visualizing Cache Operations

```
┌─────────────────────────────────────────────────────────────┐
│                    CACHE OPERATION FLOW                      │
└─────────────────────────────────────────────────────────────┘

                     ┌─────────────┐
                     │   Request   │
                     │  (Key: X)   │
                     └──────┬──────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Check Cache   │
                    │ for Key X     │
                    └───────┬───────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
       ┌────────────┐             ┌────────────┐
       │  HIT ✅    │             │  MISS ❌   │
       │ (Key found)│             │(Key absent)│
       └─────┬──────┘             └─────┬──────┘
             │                          │
             │                          ▼
             │                  ┌───────────────┐
             │                  │ Query Database│
             │                  └───────┬───────┘
             │                          │
             │                          ▼
             │                  ┌───────────────┐
             │                  │ Store in Cache│
             │                  │   (Key: X)    │
             │                  └───────┬───────┘
             │                          │
             ▼                          ▼
       ┌─────────────────────────────────────┐
       │        Return Data to Client        │
       └─────────────────────────────────────┘
```

---

## Types of Caching

### 1. Client-Side Caching

Data is cached on the client (browser, mobile app).

```
┌──────────────────────────────────────────────────────────┐
│ BROWSER                                                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Browser Cache                                        │ │
│  │  • Images, CSS, JS files                            │ │
│  │  • HTTP responses (Cache-Control headers)           │ │
│  │  • Service Worker cache                             │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Application Cache                                    │ │
│  │  • localStorage (persistent, 5-10MB)                │ │
│  │  • sessionStorage (per session, 5MB)                │ │
│  │  • IndexedDB (large structured data)                │ │
│  │  • React Query / SWR cache (in-memory)              │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Example: HTTP Cache Headers**
```http
HTTP/1.1 200 OK
Cache-Control: max-age=3600, public
ETag: "abc123"
Last-Modified: Wed, 21 Oct 2025 07:28:00 GMT
```

**Example: React Query Caching**
```typescript
// Data is cached in memory for 5 minutes
const { data } = useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### 2. Server-Side Caching

Data is cached on the server.

```
┌──────────────────────────────────────────────────────────┐
│ SERVER                                                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ In-Memory Cache (Process Memory)                    │ │
│  │  • Node.js Map/Object                               │ │
│  │  • Variables in application code                    │ │
│  │  • Fast but lost on restart                         │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Distributed Cache (Separate Service)                │ │
│  │  • Redis ⭐ (most popular)                          │ │
│  │  • Memcached                                        │ │
│  │  • Hazelcast                                        │ │
│  │  • Shared across multiple server instances          │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Example: In-Memory Cache (Node.js)**
```typescript
// Simple in-memory cache using Map
const cache = new Map<string, { data: any; timestamp: number }>();
const TTL = 5 * 60 * 1000; // 5 minutes

function getFromCache(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < TTL) {
    return cached.data; // HIT
  }
  return null; // MISS
}

function setInCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}
```

**Example: Redis Cache**
```typescript
import Redis from 'ioredis';
const redis = new Redis();

// Set with TTL
await redis.setex('products:123', 1800, JSON.stringify(productData));

// Get
const cached = await redis.get('products:123');
const data = cached ? JSON.parse(cached) : null;
```

### 3. CDN Caching (Content Delivery Network)

Static assets cached at edge locations worldwide.

```
                        ┌─────────────────────┐
                        │    Origin Server    │
                        │   (Your Server)     │
                        └──────────┬──────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐        ┌───────────────┐        ┌───────────────┐
│  CDN Edge     │        │  CDN Edge     │        │  CDN Edge     │
│  (New York)   │        │  (London)     │        │  (Tokyo)      │
└───────┬───────┘        └───────┬───────┘        └───────┬───────┘
        │                        │                        │
        ▼                        ▼                        ▼
   US Users                 EU Users                Asia Users
```

**CDN Providers:**
- Cloudflare
- AWS CloudFront
- Vercel Edge Network
- Fastly
- Akamai

**What CDNs Cache:**
- Images, videos
- CSS, JavaScript files
- Static HTML pages
- API responses (with proper headers)

### 4. Database Caching

Caching at the database level.

```
┌──────────────────────────────────────────────────────────┐
│ DATABASE LAYER CACHING                                   │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Query Cache (MySQL, PostgreSQL)                     ││
│  │  • Caches query results                             ││
│  │  • Automatically invalidated on data change         ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │ Buffer Pool (InnoDB)                                ││
│  │  • Caches table and index data in memory            ││
│  │  • Reduces disk I/O                                 ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │ Connection Pooling (PgBouncer, PrismaPooling)       ││
│  │  • Caches database connections                      ││
│  │  • Reduces connection overhead                      ││
│  └─────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### Comparison Table

| Cache Type | Location | Speed | Scope | Best For |
|------------|----------|-------|-------|----------|
| Client-Side | Browser | ⚡ Instant | Per user | Static assets, user preferences |
| Server In-Memory | Server RAM | ⚡⚡ Very Fast | Per server | Small data, subscription checks |
| Distributed (Redis) | Separate service | ⚡ Fast | All servers | Session, API responses |
| CDN | Edge locations | ⚡⚡ Very Fast | Global | Static files, images |
| Database | DB server | ⚡ Moderate | Per DB | Query results |

---

## Caching Strategies

### 1. Cache-Aside (Lazy Loading) ⭐ Most Common

The application manages the cache explicitly.

```
┌─────────────────────────────────────────────────────────────┐
│                    CACHE-ASIDE PATTERN                       │
└─────────────────────────────────────────────────────────────┘

READ OPERATION:
═══════════════
    Application                Cache               Database
         │                       │                     │
         │──── 1. GET key ──────►│                     │
         │                       │                     │
         │◄─── 2. Return data ───│ (if HIT)           │
         │         OR            │                     │
         │◄─── 2. Return null ───│ (if MISS)          │
         │                       │                     │
         │──── 3. Query ─────────────────────────────►│ (on MISS)
         │                       │                     │
         │◄─── 4. Return data ───────────────────────│
         │                       │                     │
         │──── 5. SET key ──────►│                     │
         │                       │                     │

WRITE OPERATION:
════════════════
    Application                Cache               Database
         │                       │                     │
         │──── 1. UPDATE ────────────────────────────►│
         │                       │                     │
         │◄─── 2. Confirm ───────────────────────────│
         │                       │                     │
         │──── 3. DELETE key ───►│ (Invalidate)       │
         │                       │                     │
```

**Code Example:**
```typescript
async function getProduct(id: string) {
  // 1. Check cache
  const cached = await redis.get(`product:${id}`);
  
  if (cached) {
    return JSON.parse(cached); // 2. Cache HIT
  }
  
  // 3. Cache MISS - fetch from database
  const product = await db.product.findUnique({ where: { id } });
  
  // 4. Store in cache for next time
  await redis.setex(`product:${id}`, 1800, JSON.stringify(product));
  
  return product;
}
```

**Pros:**
- Simple to implement
- Only caches data that's actually requested
- Application has full control

**Cons:**
- First request always hits database (cache miss penalty)
- Possible stale data between cache and database

### 2. Read-Through Cache

Cache sits between application and database. Cache handles fetching on miss.

```
┌─────────────────────────────────────────────────────────────┐
│                   READ-THROUGH PATTERN                       │
└─────────────────────────────────────────────────────────────┘

    Application                Cache               Database
         │                       │                     │
         │──── 1. GET key ──────►│                     │
         │                       │                     │
         │                       │── 2. GET ──────────►│ (on MISS)
         │                       │                     │
         │                       │◄─ 3. Return ───────│
         │                       │                     │
         │◄─── 4. Return data ──│ (cache stores it)   │
         │                       │                     │
```

**Pros:**
- Application code is simpler (doesn't manage cache)
- Consistent caching logic

**Cons:**
- Cache must understand database schema
- More complex cache layer

### 3. Write-Through Cache

Data is written to cache AND database simultaneously.

```
┌─────────────────────────────────────────────────────────────┐
│                   WRITE-THROUGH PATTERN                      │
└─────────────────────────────────────────────────────────────┘

    Application                Cache               Database
         │                       │                     │
         │──── 1. WRITE ────────►│                     │
         │                       │                     │
         │                       │── 2. WRITE ────────►│
         │                       │                     │
         │                       │◄─ 3. Confirm ──────│
         │                       │                     │
         │◄─── 4. Confirm ──────│                     │
         │                       │                     │
```

**Pros:**
- Cache is always in sync with database
- No stale data issues

**Cons:**
- Higher write latency (must write to both)
- Every write updates cache (even if data is never read)

### 4. Write-Behind (Write-Back) Cache

Data is written to cache first, then asynchronously to database.

```
┌─────────────────────────────────────────────────────────────┐
│                    WRITE-BEHIND PATTERN                      │
└─────────────────────────────────────────────────────────────┘

    Application                Cache               Database
         │                       │                     │
         │──── 1. WRITE ────────►│                     │
         │                       │                     │
         │◄─── 2. Confirm ──────│ (immediate)         │
         │                       │                     │
         │                       │    ┌───────────┐   │
         │                       │    │ Async Job │   │
         │                       │    │ (batched) │   │
         │                       │    └─────┬─────┘   │
         │                       │          │         │
         │                       │── 3. WRITE ───────►│ (later)
         │                       │                     │
```

**Pros:**
- Very fast writes (no database latency)
- Can batch multiple writes together

**Cons:**
- Risk of data loss if cache fails before writing to database
- Complex failure handling

### 5. Refresh-Ahead Cache

Proactively refreshes frequently accessed data before expiration.

```typescript
// Refresh-ahead: If TTL is 60 seconds, refresh at 50 seconds
async function getWithRefreshAhead(key: string) {
  const cached = await redis.get(key);
  const ttl = await redis.ttl(key);
  
  if (cached) {
    // If less than 20% of TTL remaining, refresh in background
    if (ttl < 12) { // 20% of 60 seconds
      refreshInBackground(key); // Don't await
    }
    return JSON.parse(cached);
  }
  
  return fetchAndCache(key);
}
```

---

## Cache Invalidation

> "There are only two hard things in Computer Science: cache invalidation and naming things."
> — Phil Karlton

### What is Cache Invalidation?

Removing or updating cached data when the underlying data changes.

### Invalidation Strategies

#### 1. Time-Based Expiration (TTL)

Data automatically expires after a set time.

```typescript
// Set key with 30 minute TTL
await redis.setex('products:123', 1800, data);

// After 1800 seconds, key is automatically deleted
```

**Pros:** Simple, automatic cleanup
**Cons:** Data might be stale until TTL expires

#### 2. Event-Based Invalidation

Invalidate when data changes.

```typescript
// When a product is updated
async function updateProduct(id: string, data: ProductData) {
  // 1. Update database
  await db.product.update({ where: { id }, data });
  
  // 2. Invalidate cache
  await redis.del(`products:${id}`);
  await redis.del(`products:list`); // Also invalidate list cache
}
```

**Pros:** Data is always fresh
**Cons:** Requires careful tracking of all related cache keys

#### 3. Version-Based Invalidation

Include version in cache key.

```typescript
// Version stored somewhere (database or Redis)
const version = await redis.get('products:version'); // e.g., "v5"

// Cache key includes version
const cacheKey = `products:${version}:${productId}`;

// When data changes, increment version
await redis.incr('products:version'); // Now "v6"
// Old "v5" keys will never be accessed and eventually expire
```

#### 4. Pattern-Based Invalidation

Delete all keys matching a pattern.

```typescript
// Delete all product caches for a store
await redis.keys('store_abc:products:*').then(keys => {
  if (keys.length > 0) {
    return redis.del(...keys);
  }
});

// Better: Use SCAN (non-blocking)
let cursor = '0';
do {
  const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'store_abc:products:*');
  cursor = nextCursor;
  if (keys.length > 0) {
    await redis.del(...keys);
  }
} while (cursor !== '0');
```

### Invalidation Patterns in Practice

```
┌─────────────────────────────────────────────────────────────┐
│                 CACHE INVALIDATION MATRIX                    │
└─────────────────────────────────────────────────────────────┘

When Product is CREATED:
────────────────────────
  ✓ Delete: store:{id}:products (list cache)
  ✓ Delete: store:{id}:products:* (all query variations)
  ✓ Delete: store:{id}:category:{catId}:products

When Product is UPDATED:
────────────────────────
  ✓ Delete: store:{id}:products:{productId} (specific product)
  ✓ Delete: store:{id}:products (list cache)
  ✓ Delete: store:{id}:products:* (all query variations)
  ✓ Delete: store:{id}:category:{catId}:products

When Product is DELETED:
────────────────────────
  ✓ Delete: store:{id}:products:{productId}
  ✓ Delete: store:{id}:products
  ✓ Delete: store:{id}:products:*
  ✓ Delete: store:{id}:category:{catId}:products

When Stock Changes (Order placed):
──────────────────────────────────
  ✓ Delete: store:{id}:products:* (all products)
```

---

## Cache Eviction Policies

When cache is full, which items to remove?

### Common Eviction Policies

#### 1. LRU (Least Recently Used) ⭐ Most Common

Remove items that haven't been accessed for the longest time.

```
Cache State (max 4 items):
──────────────────────────
Access: A, B, C, D
Cache: [D, C, B, A] (D = most recent)

Access: E (new item, cache full)
Evict: A (least recently used)
Cache: [E, D, C, B]

Access: B (existing item)
Cache: [B, E, D, C] (B moves to front)
```

**Best for:** General-purpose caching, web applications

#### 2. LFU (Least Frequently Used)

Remove items that are accessed least often.

```
Cache State with access counts:
───────────────────────────────
A: 10 accesses
B: 5 accesses
C: 2 accesses  ← Evict this (least frequent)
D: 8 accesses

Access: E (new item)
Evict: C
```

**Best for:** When some items are consistently more popular

#### 3. FIFO (First In, First Out)

Remove oldest items regardless of access pattern.

```
Cache: [A, B, C, D] (A = oldest)

Add E:
Evict: A (oldest)
Cache: [B, C, D, E]
```

**Best for:** Time-sensitive data where older = less relevant

#### 4. TTL-Based

Remove items based on expiration time.

```
Item A: TTL 60s, created 55s ago  ← Expires in 5s
Item B: TTL 300s, created 100s ago ← Expires in 200s
Item C: TTL 30s, created 35s ago  ← Already expired, remove
```

#### 5. Random

Randomly select items to evict.

**Best for:** When all items have equal importance

### Redis Eviction Policies

```
# Set max memory and eviction policy
maxmemory 100mb
maxmemory-policy allkeys-lru
```

| Policy | Description |
|--------|-------------|
| `noeviction` | Don't evict, return error when full |
| `allkeys-lru` | LRU across all keys |
| `allkeys-lfu` | LFU across all keys |
| `volatile-lru` | LRU only among keys with TTL |
| `volatile-lfu` | LFU only among keys with TTL |
| `allkeys-random` | Random eviction |
| `volatile-random` | Random among keys with TTL |
| `volatile-ttl` | Remove keys with shortest TTL |

---

## Common Caching Problems

### 1. Cache Stampede (Thundering Herd)

**Problem:** Many requests hit database simultaneously when cache expires.

```
Time: 12:00:00
Cache: products (TTL expires)

Time: 12:00:01
Request 1: Cache miss → Database query
Request 2: Cache miss → Database query
Request 3: Cache miss → Database query
...
Request 100: Cache miss → Database query

Database: 💀 100 simultaneous queries!
```

**Solutions:**

```typescript
// Solution 1: Locking (only one request fetches)
async function getWithLock(key: string) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  // Try to acquire lock
  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, '1', 'EX', 10, 'NX');
  
  if (acquired) {
    // We got the lock, fetch data
    const data = await fetchFromDatabase();
    await redis.setex(key, 1800, JSON.stringify(data));
    await redis.del(lockKey);
    return data;
  } else {
    // Another process is fetching, wait and retry
    await sleep(100);
    return getWithLock(key);
  }
}

// Solution 2: Staggered TTL
const baseTTL = 1800;
const jitter = Math.random() * 60; // 0-60 seconds random
await redis.setex(key, baseTTL + jitter, data);

// Solution 3: Refresh-ahead (refresh before expiration)
const ttl = await redis.ttl(key);
if (ttl < 300 && ttl > 0) {
  refreshInBackground(key); // Proactive refresh
}
```

### 2. Cache Penetration

**Problem:** Requests for non-existent data always hit database.

```
Request: GET /products/invalid_id
Cache: MISS (key doesn't exist)
Database: SELECT * FROM products WHERE id = 'invalid_id' → NULL
Cache: Don't cache NULL? → Next request hits DB again

Attacker sends 1000 requests for invalid IDs → Database overload
```

**Solutions:**

```typescript
// Solution 1: Cache null results
const data = await db.product.findUnique({ where: { id } });
if (data) {
  await redis.setex(`product:${id}`, 1800, JSON.stringify(data));
} else {
  // Cache the "not found" result with shorter TTL
  await redis.setex(`product:${id}`, 300, JSON.stringify(null));
}

// Solution 2: Bloom filter (advanced)
// Check if ID could possibly exist before querying
if (!bloomFilter.mightContain(id)) {
  return null; // Definitely doesn't exist
}
```

### 3. Cache Avalanche

**Problem:** Many cache entries expire at the same time.

```
Time: 00:00 - Server restart, cache empty
All requests hit database → Cache everything with TTL 1 hour

Time: 01:00 - ALL cache entries expire simultaneously
All requests hit database again → Server overload
```

**Solutions:**

```typescript
// Solution: Random TTL jitter
const baseTTL = 3600; // 1 hour
const jitter = Math.floor(Math.random() * 300); // 0-5 minutes
await redis.setex(key, baseTTL + jitter, data);
```

### 4. Hot Key Problem

**Problem:** Single key receives massive traffic.

```
Key: "homepage:featured_products"
Traffic: 10,000 requests/second → Single Redis node overloaded
```

**Solutions:**

```typescript
// Solution 1: Local cache + Redis
const localCache = new Map();

async function getHotKey(key: string) {
  // Check local cache first (no network)
  if (localCache.has(key)) {
    return localCache.get(key);
  }
  
  // Fall back to Redis
  const data = await redis.get(key);
  localCache.set(key, data);
  
  // Expire local cache after 5 seconds
  setTimeout(() => localCache.delete(key), 5000);
  
  return data;
}

// Solution 2: Key replication
// Store same data under multiple keys
await redis.setex('hot_key:1', 3600, data);
await redis.setex('hot_key:2', 3600, data);
await redis.setex('hot_key:3', 3600, data);

// Read from random replica
const replica = Math.floor(Math.random() * 3) + 1;
const data = await redis.get(`hot_key:${replica}`);
```

---

## When NOT to Cache

### ❌ Don't Cache When:

1. **Data changes too frequently**
   - Real-time stock prices
   - Live sports scores
   - Chat messages

2. **Data is unique per request**
   - Search results with complex filters
   - One-time tokens

3. **Data is sensitive**
   - Passwords, API keys (security risk)
   - Personal information without encryption

4. **Cache overhead > benefit**
   - Very simple database queries
   - Rarely accessed data

5. **Strong consistency required**
   - Financial transactions
   - Inventory counts during flash sales

### ✅ Do Cache When:

1. Data is read frequently, written rarely
2. Data can tolerate some staleness
3. Database query is expensive
4. Same data is requested by many users
5. Response time is critical

---

## Interview Questions

### Basic Level

**Q1: What is caching? Why do we need it?**
> Caching stores copies of data in fast storage for quick access. We need it to improve response times, reduce database load, and handle more users.

**Q2: What is the difference between cache hit and cache miss?**
> Hit = data found in cache (fast). Miss = data not in cache, must fetch from source (slow).

**Q3: What is TTL?**
> Time To Live - how long data stays in cache before expiring.

### Intermediate Level

**Q4: Explain cache-aside pattern.**
> Application checks cache first. On miss, fetches from DB and stores in cache. On write, updates DB and invalidates cache.

**Q5: What is cache stampede? How to prevent it?**
> Many requests hit DB when cache expires. Prevent with: locking, staggered TTL, refresh-ahead.

**Q6: When would you NOT use caching?**
> Real-time data, unique requests, sensitive data, when consistency is critical.

### Advanced Level

**Q7: Compare Redis vs Memcached.**
> Redis: data structures, persistence, pub/sub, clustering. Memcached: simpler, multi-threaded, slightly faster for simple key-value.

**Q8: How would you handle cache invalidation in a distributed system?**
> Use event-driven invalidation with message queues, version-based keys, or Redis pub/sub for cross-service communication.

**Q9: Design a caching strategy for an e-commerce product catalog.**
> - Products: Cache-aside, 30min TTL
> - Categories: Cache-aside, 24hr TTL
> - Invalidate on CRUD operations
> - Use pattern-based deletion for bulk invalidation
> - Handle cache stampede with locking
> - Add local memory cache for hot items

---

## Summary

| Concept | Key Points |
|---------|------------|
| **Caching** | Store frequently accessed data in fast storage |
| **Hit/Miss** | Hit = found in cache, Miss = not found |
| **TTL** | Data expiration time |
| **Cache-Aside** | App manages cache, most common pattern |
| **Invalidation** | Remove stale data when source changes |
| **Eviction** | Remove data when cache is full (LRU, LFU) |
| **Stampede** | Many requests on expiration, use locking |
| **Penetration** | Non-existent keys, cache null values |

---

**Next: [Part 2 - Redis Deep Dive](./2_REDIS_DEEP_DIVE.md)**
