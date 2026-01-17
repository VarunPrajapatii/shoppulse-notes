# Part 5: Advanced Patterns & Interview Questions

> 📚 **Purpose**: Master advanced Redis patterns and prepare for technical interviews with commonly asked questions and scenarios.

---

## Table of Contents

1. [Advanced Caching Patterns](#advanced-caching-patterns)
2. [Distributed Locking](#distributed-locking)
3. [Rate Limiting](#rate-limiting)
4. [Session Management](#session-management)
5. [Real-Time Features](#real-time-features)
6. [Queues and Job Processing](#queues-and-job-processing)
7. [Interview Questions - Beginner](#interview-questions---beginner)
8. [Interview Questions - Intermediate](#interview-questions---intermediate)
9. [Interview Questions - Advanced](#interview-questions---advanced)
10. [System Design Scenarios](#system-design-scenarios)
11. [Coding Challenges](#coding-challenges)
12. [Quick Reference Cheat Sheet](#quick-reference-cheat-sheet)

---

## Advanced Caching Patterns

### 1. Cache Stampede Prevention

**Problem**: When cache expires, many requests hit the database simultaneously.

```
┌─────────────────────────────────────────────────────────────┐
│                    CACHE STAMPEDE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Cache Entry Expires at T=0                                │
│        │                                                    │
│        ▼                                                    │
│   T=0.001s: Request 1 → Cache MISS → DB Query              │
│   T=0.002s: Request 2 → Cache MISS → DB Query              │
│   T=0.003s: Request 3 → Cache MISS → DB Query              │
│   T=0.004s: Request 4 → Cache MISS → DB Query              │
│   ...                                                       │
│   T=0.100s: 100 concurrent DB queries! 💥                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Solution 1: Probabilistic Early Expiration (XFetch)**

```typescript
async function xfetch<T>(
  key: string,
  ttlSeconds: number,
  beta: number = 1,  // Higher = earlier recompute
  fetcher: () => Promise<T>
): Promise<T> {
  const redis = getRedisClient();
  const cached = await redis.get(key);
  
  if (cached) {
    const { value, delta, expiry } = JSON.parse(cached);
    const now = Date.now() / 1000;
    
    // Probabilistic early recompute
    // As we approach expiry, probability increases
    const random = Math.random();
    const shouldRecompute = (now - delta * beta * Math.log(random)) >= expiry;
    
    if (!shouldRecompute) {
      return value;
    }
  }
  
  // Recompute
  const start = Date.now();
  const value = await fetcher();
  const delta = (Date.now() - start) / 1000;  // Time to compute
  
  const entry = {
    value,
    delta,
    expiry: Date.now() / 1000 + ttlSeconds,
  };
  
  await redis.setex(key, ttlSeconds + 60, JSON.stringify(entry));
  
  return value;
}
```

**Solution 2: Mutex Lock**

```typescript
async function cacheWithLock<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  lockTimeout: number = 10
): Promise<T> {
  const redis = getRedisClient();
  
  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Try to acquire lock
  const lockKey = `lock:${key}`;
  const lockAcquired = await redis.set(lockKey, '1', 'EX', lockTimeout, 'NX');
  
  if (lockAcquired) {
    try {
      // Double-check cache (another process might have populated it)
      const doubleCheck = await redis.get(key);
      if (doubleCheck) {
        return JSON.parse(doubleCheck);
      }
      
      // Fetch and cache
      const data = await fetcher();
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
      return data;
    } finally {
      await redis.del(lockKey);
    }
  } else {
    // Wait and retry (someone else is fetching)
    await new Promise(resolve => setTimeout(resolve, 100));
    return cacheWithLock(key, ttlSeconds, fetcher, lockTimeout);
  }
}
```

### 2. Stale-While-Revalidate

Return stale data immediately while refreshing in background:

```typescript
interface CacheEntry<T> {
  data: T;
  createdAt: number;
}

async function staleWhileRevalidate<T>(
  key: string,
  freshTTL: number,      // Data considered fresh
  staleTTL: number,      // Max stale age
  fetcher: () => Promise<T>
): Promise<T> {
  const redis = getRedisClient();
  const cached = await redis.get(key);
  
  if (cached) {
    const entry: CacheEntry<T> = JSON.parse(cached);
    const age = (Date.now() - entry.createdAt) / 1000;
    
    if (age < freshTTL) {
      // Fresh - return immediately
      return entry.data;
    }
    
    if (age < staleTTL) {
      // Stale but acceptable - return and refresh async
      revalidateInBackground(key, fetcher, staleTTL);
      return entry.data;
    }
  }
  
  // No cache or too stale - must wait for fresh data
  const data = await fetcher();
  const entry: CacheEntry<T> = { data, createdAt: Date.now() };
  await redis.setex(key, staleTTL, JSON.stringify(entry));
  
  return data;
}

async function revalidateInBackground<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<void> {
  // Don't await - fire and forget
  (async () => {
    try {
      const data = await fetcher();
      const entry: CacheEntry<T> = { data, createdAt: Date.now() };
      await redis.setex(key, ttl, JSON.stringify(entry));
    } catch (error) {
      console.error(`Background revalidation failed for ${key}:`, error);
    }
  })();
}
```

### 3. Multi-Tier Caching

L1 (In-Memory) → L2 (Redis) → Database

```typescript
// L1: In-memory cache (per-process)
const memoryCache = new Map<string, { value: any; expiry: number }>();

async function multiTierCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // L1: Check memory cache
  const memoryCached = memoryCache.get(key);
  if (memoryCached && memoryCached.expiry > Date.now()) {
    console.log(`[L1 Cache HIT] ${key}`);
    return memoryCached.value;
  }
  
  // L2: Check Redis
  const redis = getRedisClient();
  const redisCached = await redis.get(key);
  
  if (redisCached) {
    console.log(`[L2 Cache HIT] ${key}`);
    const data = JSON.parse(redisCached);
    
    // Promote to L1 (shorter TTL)
    memoryCache.set(key, {
      value: data,
      expiry: Date.now() + (ttlSeconds * 1000 / 10),  // 10% of L2 TTL
    });
    
    return data;
  }
  
  // L3: Database
  console.log(`[L3 Database] ${key}`);
  const data = await fetcher();
  
  // Store in L2
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
  
  // Store in L1
  memoryCache.set(key, {
    value: data,
    expiry: Date.now() + (ttlSeconds * 1000 / 10),
  });
  
  return data;
}

// Cleanup expired L1 entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiry < now) {
      memoryCache.delete(key);
    }
  }
}, 60000);  // Every minute
```

### 4. Cache Aside with Tags

Organize cache entries with tags for group invalidation:

```typescript
// Store cache entry with tags
async function setCacheWithTags<T>(
  key: string,
  data: T,
  ttlSeconds: number,
  tags: string[]
): Promise<void> {
  const redis = getRedisClient();
  const pipeline = redis.pipeline();
  
  // Store the data
  pipeline.setex(key, ttlSeconds, JSON.stringify(data));
  
  // Add key to each tag set
  for (const tag of tags) {
    pipeline.sadd(`tag:${tag}`, key);
    pipeline.expire(`tag:${tag}`, ttlSeconds);
  }
  
  await pipeline.exec();
}

// Invalidate all entries with a tag
async function invalidateByTag(tag: string): Promise<number> {
  const redis = getRedisClient();
  
  // Get all keys with this tag
  const keys = await redis.smembers(`tag:${tag}`);
  
  if (keys.length === 0) return 0;
  
  // Delete all keys + the tag set
  const pipeline = redis.pipeline();
  keys.forEach(key => pipeline.del(key));
  pipeline.del(`tag:${tag}`);
  await pipeline.exec();
  
  return keys.length;
}

// Usage
await setCacheWithTags(
  'product:123',
  productData,
  3600,
  ['products', 'category:456', 'store:789']
);

// Invalidate all products in category 456
await invalidateByTag('category:456');
```

---

## Distributed Locking

### Redlock Algorithm

For distributed systems where multiple processes need exclusive access:

```typescript
import Redis from 'ioredis';
import Redlock from 'redlock';

// Create multiple Redis clients for different nodes
const redis1 = new Redis({ host: 'redis1.example.com' });
const redis2 = new Redis({ host: 'redis2.example.com' });
const redis3 = new Redis({ host: 'redis3.example.com' });

// Create Redlock instance
const redlock = new Redlock(
  [redis1, redis2, redis3],
  {
    driftFactor: 0.01,  // Expected clock drift
    retryCount: 10,
    retryDelay: 200,    // Time between retries
    retryJitter: 200,   // Random addition to retry delay
  }
);

// Acquire lock
async function processWithLock(resourceId: string) {
  let lock;
  
  try {
    // Acquire lock for 30 seconds
    lock = await redlock.acquire([`locks:${resourceId}`], 30000);
    
    // Do critical work
    await processCriticalSection(resourceId);
    
  } catch (error) {
    if (error instanceof Redlock.LockError) {
      console.log('Could not acquire lock, resource is busy');
    } else {
      throw error;
    }
  } finally {
    // Release lock
    if (lock) {
      await lock.release();
    }
  }
}

// Extend lock if needed
async function longRunningTask(resourceId: string) {
  const lock = await redlock.acquire([`locks:${resourceId}`], 30000);
  
  try {
    while (hasMoreWork()) {
      // Extend lock before it expires
      await lock.extend(30000);
      await doWorkChunk();
    }
  } finally {
    await lock.release();
  }
}
```

### Simple Lock Implementation

For single Redis instance:

```typescript
class SimpleLock {
  constructor(
    private redis: Redis,
    private lockTimeout: number = 10000  // 10 seconds
  ) {}
  
  async acquire(resourceId: string): Promise<string | null> {
    const lockKey = `lock:${resourceId}`;
    const lockValue = `${Date.now()}-${Math.random()}`;  // Unique value
    
    const acquired = await this.redis.set(
      lockKey,
      lockValue,
      'PX',
      this.lockTimeout,
      'NX'
    );
    
    return acquired ? lockValue : null;
  }
  
  async release(resourceId: string, lockValue: string): Promise<boolean> {
    const lockKey = `lock:${resourceId}`;
    
    // Use Lua script for atomic check-and-delete
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    const result = await this.redis.eval(script, 1, lockKey, lockValue);
    return result === 1;
  }
}

// Usage
const lock = new SimpleLock(redis);

const lockValue = await lock.acquire('order:123');
if (lockValue) {
  try {
    await processOrder('123');
  } finally {
    await lock.release('order:123', lockValue);
  }
} else {
  console.log('Order is being processed by another worker');
}
```

---

## Rate Limiting

### Fixed Window

Simple but can have edge burst at window boundaries:

```typescript
async function fixedWindowRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedisClient();
  const key = `ratelimit:${identifier}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  
  const current = await redis.incr(key);
  
  // Set TTL on first request
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
  };
}

// Usage: 100 requests per minute
const result = await fixedWindowRateLimit('user:123', 100, 60);
if (!result.allowed) {
  throw new Error('Rate limit exceeded');
}
```

### Sliding Window Log

More accurate but uses more memory:

```typescript
async function slidingWindowLog(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const redis = getRedisClient();
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);
  
  const pipeline = redis.pipeline();
  
  // Remove old entries
  pipeline.zremrangebyscore(key, '-inf', windowStart);
  
  // Count entries in window
  pipeline.zcard(key);
  
  // Add current request
  pipeline.zadd(key, now.toString(), now.toString());
  
  // Set key expiry
  pipeline.expire(key, windowSeconds);
  
  const results = await pipeline.exec();
  const count = results[1][1] as number;
  
  return count < limit;
}
```

### Token Bucket (Most Flexible)

Allows bursts while maintaining average rate:

```typescript
class TokenBucket {
  constructor(
    private redis: Redis,
    private capacity: number,        // Max tokens
    private refillRate: number,      // Tokens per second
    private identifier: string
  ) {}
  
  async consume(tokens: number = 1): Promise<boolean> {
    const key = `tokenbucket:${this.identifier}`;
    const now = Date.now();
    
    // Lua script for atomic operation
    const script = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local requested = tonumber(ARGV[4])
      
      local bucket = redis.call('hmget', key, 'tokens', 'lastRefill')
      local tokens = tonumber(bucket[1]) or capacity
      local lastRefill = tonumber(bucket[2]) or now
      
      -- Calculate tokens to add based on time passed
      local elapsed = (now - lastRefill) / 1000
      tokens = math.min(capacity, tokens + (elapsed * refillRate))
      
      if tokens >= requested then
        tokens = tokens - requested
        redis.call('hmset', key, 'tokens', tokens, 'lastRefill', now)
        redis.call('expire', key, math.ceil(capacity / refillRate) + 1)
        return 1
      else
        redis.call('hmset', key, 'tokens', tokens, 'lastRefill', now)
        redis.call('expire', key, math.ceil(capacity / refillRate) + 1)
        return 0
      end
    `;
    
    const result = await this.redis.eval(
      script,
      1,
      key,
      this.capacity.toString(),
      this.refillRate.toString(),
      now.toString(),
      tokens.toString()
    );
    
    return result === 1;
  }
}

// Usage: 100 tokens, refill 10 per second
const bucket = new TokenBucket(redis, 100, 10, 'user:123');
const allowed = await bucket.consume(1);
```

---

## Session Management

### Redis Sessions

```typescript
import { v4 as uuidv4 } from 'uuid';

interface Session {
  userId: string;
  email: string;
  createdAt: number;
  lastAccess: number;
  metadata: Record<string, any>;
}

class SessionManager {
  private readonly prefix = 'session:';
  private readonly ttl = 60 * 60 * 24;  // 24 hours
  
  constructor(private redis: Redis) {}
  
  async create(userId: string, email: string): Promise<string> {
    const sessionId = uuidv4();
    const session: Session = {
      userId,
      email,
      createdAt: Date.now(),
      lastAccess: Date.now(),
      metadata: {},
    };
    
    await this.redis.setex(
      `${this.prefix}${sessionId}`,
      this.ttl,
      JSON.stringify(session)
    );
    
    // Track user's active sessions
    await this.redis.sadd(`user:${userId}:sessions`, sessionId);
    
    return sessionId;
  }
  
  async get(sessionId: string): Promise<Session | null> {
    const data = await this.redis.get(`${this.prefix}${sessionId}`);
    
    if (!data) return null;
    
    const session: Session = JSON.parse(data);
    
    // Update last access (sliding expiration)
    session.lastAccess = Date.now();
    await this.redis.setex(
      `${this.prefix}${sessionId}`,
      this.ttl,
      JSON.stringify(session)
    );
    
    return session;
  }
  
  async destroy(sessionId: string): Promise<void> {
    const session = await this.get(sessionId);
    
    if (session) {
      await this.redis.del(`${this.prefix}${sessionId}`);
      await this.redis.srem(`user:${session.userId}:sessions`, sessionId);
    }
  }
  
  async destroyAllForUser(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
    
    if (sessionIds.length > 0) {
      const pipeline = this.redis.pipeline();
      
      sessionIds.forEach(id => {
        pipeline.del(`${this.prefix}${id}`);
      });
      
      pipeline.del(`user:${userId}:sessions`);
      await pipeline.exec();
    }
  }
}
```

---

## Real-Time Features

### Live Counters

```typescript
class LiveCounter {
  constructor(
    private redis: Redis,
    private key: string
  ) {}
  
  async increment(amount: number = 1): Promise<number> {
    return this.redis.incrby(this.key, amount);
  }
  
  async decrement(amount: number = 1): Promise<number> {
    return this.redis.decrby(this.key, amount);
  }
  
  async get(): Promise<number> {
    const value = await this.redis.get(this.key);
    return value ? parseInt(value) : 0;
  }
  
  async reset(): Promise<void> {
    await this.redis.set(this.key, '0');
  }
}

// Page view counter
const pageViews = new LiveCounter(redis, 'pageviews:homepage');
await pageViews.increment();
const count = await pageViews.get();
```

### Online Users

```typescript
class OnlineTracker {
  private readonly prefix = 'online:';
  private readonly timeout = 300;  // 5 minutes of inactivity
  
  constructor(private redis: Redis) {}
  
  async heartbeat(userId: string): Promise<void> {
    const key = `${this.prefix}${userId}`;
    await this.redis.setex(key, this.timeout, Date.now().toString());
    await this.redis.sadd('online:users', userId);
  }
  
  async isOnline(userId: string): Promise<boolean> {
    return (await this.redis.exists(`${this.prefix}${userId}`)) === 1;
  }
  
  async getOnlineUsers(): Promise<string[]> {
    // Clean up expired users
    const users = await this.redis.smembers('online:users');
    const pipeline = this.redis.pipeline();
    
    users.forEach(userId => {
      pipeline.exists(`${this.prefix}${userId}`);
    });
    
    const results = await pipeline.exec();
    const onlineUsers: string[] = [];
    
    results.forEach(([err, exists], index) => {
      if (exists === 1) {
        onlineUsers.push(users[index]);
      } else {
        // Remove from set
        this.redis.srem('online:users', users[index]);
      }
    });
    
    return onlineUsers;
  }
  
  async getOnlineCount(): Promise<number> {
    return (await this.getOnlineUsers()).length;
  }
}
```

---

## Queues and Job Processing

### Simple Job Queue

```typescript
interface Job {
  id: string;
  type: string;
  data: any;
  createdAt: number;
  attempts: number;
}

class JobQueue {
  private readonly waiting = 'queue:waiting';
  private readonly processing = 'queue:processing';
  private readonly failed = 'queue:failed';
  
  constructor(private redis: Redis) {}
  
  async add(type: string, data: any): Promise<string> {
    const job: Job = {
      id: `job:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      type,
      data,
      createdAt: Date.now(),
      attempts: 0,
    };
    
    await this.redis.lpush(this.waiting, JSON.stringify(job));
    return job.id;
  }
  
  async process(
    handler: (job: Job) => Promise<void>,
    timeout: number = 30
  ): Promise<void> {
    while (true) {
      // Move job from waiting to processing (blocking)
      const result = await this.redis.brpoplpush(
        this.waiting,
        this.processing,
        0  // Block indefinitely
      );
      
      if (!result) continue;
      
      const job: Job = JSON.parse(result);
      job.attempts++;
      
      try {
        await handler(job);
        
        // Success - remove from processing
        await this.redis.lrem(this.processing, 1, result);
      } catch (error) {
        // Failure - move to failed or retry
        await this.redis.lrem(this.processing, 1, result);
        
        if (job.attempts < 3) {
          // Retry
          await this.redis.lpush(this.waiting, JSON.stringify(job));
        } else {
          // Move to failed
          await this.redis.lpush(this.failed, JSON.stringify({
            ...job,
            error: (error as Error).message,
            failedAt: Date.now(),
          }));
        }
      }
    }
  }
  
  async getStats(): Promise<{
    waiting: number;
    processing: number;
    failed: number;
  }> {
    const [waiting, processing, failed] = await Promise.all([
      this.redis.llen(this.waiting),
      this.redis.llen(this.processing),
      this.redis.llen(this.failed),
    ]);
    
    return { waiting, processing, failed };
  }
}
```

---

## Interview Questions - Beginner

### Q1: What is caching and why is it important?

**Answer:**
Caching is the process of storing frequently accessed data in a fast-access storage layer to reduce the time needed to retrieve it.

**Why it's important:**
- **Performance**: Cache reads are 100-1000x faster than database reads
- **Scalability**: Reduces load on database servers
- **Cost**: Less database queries = lower infrastructure costs
- **User Experience**: Faster response times

```
Without Cache:
User → API → Database (50-200ms)

With Cache:
User → API → Cache → Return (2-5ms)  ← Cache HIT
User → API → Cache → Database → Store in Cache → Return (55-205ms)  ← Cache MISS
```

---

### Q2: Explain cache hit and cache miss.

**Answer:**

**Cache Hit**: Data is found in the cache
- Fast (2-5ms)
- No database query needed
- Ideal scenario

**Cache Miss**: Data is NOT in the cache
- Slow (50-200ms)
- Database query required
- Data is cached for future requests

```
┌─────────────────────────┐
│      Cache Lookup       │
├─────────────────────────┤
│                         │
│    ┌─────────────┐      │
│    │  Request    │      │
│    └──────┬──────┘      │
│           │             │
│           ▼             │
│    ┌─────────────┐      │
│    │  In Cache?  │      │
│    └──────┬──────┘      │
│           │             │
│     ┌─────┴─────┐       │
│     │           │       │
│   YES          NO       │
│ (HIT)       (MISS)      │
│     │           │       │
│     ▼           ▼       │
│ Return      Query DB    │
│ Cached       & Cache    │
│                         │
└─────────────────────────┘
```

**Hit Rate** = Hits / (Hits + Misses)
- 90%+ = Good
- 95%+ = Excellent

---

### Q3: What is Redis and how is it different from traditional databases?

**Answer:**

**Redis** (Remote Dictionary Server) is an in-memory data structure store.

| Feature | Redis | Traditional DB (PostgreSQL) |
|---------|-------|---------------------------|
| Storage | RAM (in-memory) | Disk |
| Speed | Microseconds | Milliseconds |
| Data Structures | Strings, Lists, Sets, Hashes, etc. | Tables, Rows, Columns |
| Persistence | Optional (RDB, AOF) | Always |
| Primary Use | Caching, Sessions, Queues | Data storage |
| Scaling | Horizontal (Cluster) | Vertical (mostly) |

**Redis is NOT a replacement for databases** - it complements them as a caching layer.

---

### Q4: What data types does Redis support?

**Answer:**

1. **Strings**: Basic key-value (`SET key "value"`)
2. **Lists**: Ordered collections (`LPUSH mylist "item"`)
3. **Sets**: Unique unordered elements (`SADD myset "member"`)
4. **Sorted Sets**: Unique elements with scores (`ZADD leaderboard 100 "player1"`)
5. **Hashes**: Field-value pairs (`HSET user:1 name "John"`)
6. **Streams**: Append-only log (for event streaming)
7. **Bitmaps**: Bit-level operations
8. **HyperLogLog**: Probabilistic cardinality counting
9. **Geospatial**: Location data with radius queries

---

### Q5: What is TTL (Time-To-Live)?

**Answer:**

TTL is the expiration time for a cached entry. After TTL expires, the key is automatically deleted.

```typescript
// Set key with 1 hour TTL
await redis.setex('key', 3600, 'value');

// Check remaining TTL
const remaining = await redis.ttl('key');  // Returns seconds left

// Remove TTL (make key permanent)
await redis.persist('key');
```

**Why TTL matters:**
- Prevents stale data
- Manages memory automatically
- Forces cache refresh

---

## Interview Questions - Intermediate

### Q6: Explain different caching strategies.

**Answer:**

1. **Cache-Aside (Lazy Loading)**
   - Application manages cache
   - Check cache → Miss? → Load from DB → Store in cache
   - Most common pattern

2. **Read-Through**
   - Cache provider handles DB queries
   - Application only talks to cache

3. **Write-Through**
   - Write to cache and DB simultaneously
   - Data always consistent but slower writes

4. **Write-Behind (Write-Back)**
   - Write to cache, async write to DB
   - Fast writes but risk of data loss

5. **Refresh-Ahead**
   - Proactively refresh cache before expiry
   - Reduces cache misses

---

### Q7: What is cache invalidation and when should you invalidate?

**Answer:**

Cache invalidation is removing/updating cached data when the source data changes.

**When to invalidate:**
- Data is created (new item won't appear in list cache)
- Data is updated (cached data is stale)
- Data is deleted (cached data no longer valid)
- Related data changes (cascade effects)

**Strategies:**
1. **Time-based**: Let TTL expire
2. **Event-based**: Invalidate on data change
3. **Version-based**: Include version in key
4. **Tag-based**: Group entries by tag, invalidate by tag

```typescript
// Event-based invalidation
async function updateProduct(id: string, data: any) {
  await db.product.update({ where: { id }, data });
  await redis.del(`product:${id}`);
  await invalidateByPattern(`products:*`);  // Invalidate lists
}
```

---

### Q8: What is the cache stampede problem and how do you prevent it?

**Answer:**

**Cache Stampede** (Thundering Herd): When cache expires, many requests simultaneously hit the database.

**Prevention Methods:**

1. **Mutex Lock**: Only one request fetches, others wait
2. **Probabilistic Early Expiration**: Refresh before TTL expires
3. **Stale-While-Revalidate**: Return stale data while refreshing
4. **Never Expire**: Use explicit invalidation instead of TTL

```typescript
// Mutex Lock Solution
const lock = await redis.set(`lock:${key}`, '1', 'EX', 10, 'NX');
if (lock) {
  const data = await fetchFromDB();
  await redis.setex(key, ttl, data);
  await redis.del(`lock:${key}`);
  return data;
} else {
  // Wait and retry
  await sleep(100);
  return getCachedData(key);
}
```

---

### Q9: Explain Redis persistence mechanisms.

**Answer:**

1. **RDB (Redis Database Backup)**
   - Point-in-time snapshots
   - Compact binary format
   - Good for backups
   - Potential data loss between snapshots

2. **AOF (Append-Only File)**
   - Logs every write operation
   - Better durability
   - Larger files
   - Slower recovery

3. **Hybrid (RDB + AOF)**
   - Best of both worlds
   - Recommended for production

```
┌─────────────────────────────────────────────────┐
│                 PERSISTENCE COMPARISON           │
├─────────────────────────────────────────────────┤
│                                                 │
│         RDB                    AOF              │
│  ┌──────────────┐      ┌──────────────┐        │
│  │ Snapshot     │      │ Every Write  │        │
│  │ every X mins │      │ Logged       │        │
│  └──────────────┘      └──────────────┘        │
│                                                 │
│  Pros:                  Pros:                   │
│  • Compact              • Durable               │
│  • Fast restart         • Readable log          │
│                                                 │
│  Cons:                  Cons:                   │
│  • Data loss possible   • Larger files          │
│  • CPU intensive        • Slower startup        │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### Q10: How do you handle cache in a distributed system?

**Answer:**

**Challenges:**
- Multiple app servers need consistent cache
- Cache invalidation across servers
- Network partitions

**Solutions:**

1. **Centralized Redis**: All servers use same Redis
2. **Redis Cluster**: Distributed Redis for scale
3. **Pub/Sub for Invalidation**: Broadcast invalidation events
4. **Consistent Hashing**: Distribute keys evenly

```typescript
// Distributed invalidation with Pub/Sub
const publisher = new Redis();
const subscriber = new Redis();

// When data changes
await publisher.publish('cache:invalidate', JSON.stringify({
  pattern: 'products:*',
  timestamp: Date.now(),
}));

// All servers listen
subscriber.subscribe('cache:invalidate');
subscriber.on('message', async (channel, message) => {
  const { pattern } = JSON.parse(message);
  await invalidateByPattern(pattern);
});
```

---

## Interview Questions - Advanced

### Q11: Design a rate limiter using Redis.

**Answer:**

See [Rate Limiting section](#rate-limiting) for implementations.

Key points to mention:
- Fixed Window vs Sliding Window vs Token Bucket
- Atomic operations with Lua scripts
- Distributed rate limiting
- Response headers (X-RateLimit-Remaining)

---

### Q12: How would you implement a distributed lock?

**Answer:**

See [Distributed Locking section](#distributed-locking).

Key points:
- SET NX EX (atomic set if not exists with expiry)
- Unique lock value (prevent accidental unlock)
- Lua script for safe release
- Redlock for multi-node

---

### Q13: Explain Redis Cluster architecture.

**Answer:**

```
┌─────────────────────────────────────────────────────────────┐
│                    REDIS CLUSTER                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   16384 Hash Slots distributed across nodes                 │
│                                                             │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐                  │
│   │ Node A  │   │ Node B  │   │ Node C  │                  │
│   │ Primary │   │ Primary │   │ Primary │                  │
│   │ 0-5460  │   │5461-10922│  │10923-16383│                │
│   └────┬────┘   └────┬────┘   └────┬────┘                  │
│        │             │             │                        │
│   ┌────┴────┐   ┌────┴────┐   ┌────┴────┐                  │
│   │ Replica │   │ Replica │   │ Replica │                  │
│   │   A'    │   │   B'    │   │   C'    │                  │
│   └─────────┘   └─────────┘   └─────────┘                  │
│                                                             │
│   Key routing: HASH_SLOT = CRC16(key) mod 16384            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Key points:
- 16384 hash slots
- Automatic sharding
- Replica failover
- MOVED and ASK redirections
- Multi-key commands require same slot

---

### Q14: What is Redis Sentinel?

**Answer:**

Redis Sentinel provides high availability without clustering:

- **Monitoring**: Checks if instances are working
- **Notification**: Alerts on failures
- **Automatic Failover**: Promotes replica to primary
- **Configuration Provider**: Clients get current primary

```
┌─────────────────────────────────────────────────┐
│              SENTINEL ARCHITECTURE               │
├─────────────────────────────────────────────────┤
│                                                 │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│   │Sentinel │  │Sentinel │  │Sentinel │       │
│   │    1    │  │    2    │  │    3    │       │
│   └────┬────┘  └────┬────┘  └────┬────┘       │
│        │            │            │             │
│        └────────────┼────────────┘             │
│                     │                          │
│              ┌──────┴──────┐                   │
│              │             │                   │
│        ┌─────┴─────┐ ┌─────┴─────┐            │
│        │  PRIMARY  │ │  REPLICA  │            │
│        │   Redis   │ │   Redis   │            │
│        └───────────┘ └───────────┘            │
│                                                │
└─────────────────────────────────────────────────┘
```

---

### Q15: How do you monitor Redis performance?

**Answer:**

**Key Metrics:**
- Memory usage (`INFO memory`)
- Connected clients (`INFO clients`)
- Ops per second (`INFO stats`)
- Hit rate (`keyspace_hits / (keyspace_hits + keyspace_misses)`)
- Latency (`redis-cli --latency`)

**Commands:**
```bash
# Server info
INFO

# Real-time monitoring
MONITOR  # Shows all commands (use carefully!)

# Slow queries
SLOWLOG GET 10

# Memory analysis
MEMORY DOCTOR
MEMORY USAGE key

# Client list
CLIENT LIST
```

**Tools:**
- Redis Insight (GUI)
- Prometheus + Grafana
- Datadog Redis integration

---

## System Design Scenarios

### Scenario 1: Design a URL Shortener Cache

```typescript
class URLShortener {
  constructor(private redis: Redis) {}
  
  async shorten(longUrl: string): Promise<string> {
    // Check if already shortened
    const existing = await this.redis.get(`long:${longUrl}`);
    if (existing) return existing;
    
    // Generate short code
    const shortCode = generateShortCode();
    
    // Store both mappings
    await this.redis.mset(
      `short:${shortCode}`, longUrl,
      `long:${longUrl}`, shortCode
    );
    
    return shortCode;
  }
  
  async resolve(shortCode: string): Promise<string | null> {
    // Increment click count
    await this.redis.incr(`clicks:${shortCode}`);
    
    return this.redis.get(`short:${shortCode}`);
  }
}
```

### Scenario 2: Design a Leaderboard

```typescript
class Leaderboard {
  private readonly key = 'leaderboard:game1';
  
  constructor(private redis: Redis) {}
  
  async addScore(userId: string, score: number): Promise<void> {
    await this.redis.zadd(this.key, score, userId);
  }
  
  async getTopN(n: number): Promise<Array<{userId: string; score: number; rank: number}>> {
    const results = await this.redis.zrevrange(this.key, 0, n - 1, 'WITHSCORES');
    
    const leaderboard = [];
    for (let i = 0; i < results.length; i += 2) {
      leaderboard.push({
        userId: results[i],
        score: parseFloat(results[i + 1]),
        rank: i / 2 + 1,
      });
    }
    
    return leaderboard;
  }
  
  async getUserRank(userId: string): Promise<number | null> {
    const rank = await this.redis.zrevrank(this.key, userId);
    return rank !== null ? rank + 1 : null;
  }
}
```

### Scenario 3: Design a Shopping Cart

```typescript
class ShoppingCart {
  private readonly prefix = 'cart:';
  private readonly ttl = 60 * 60 * 24 * 7;  // 7 days
  
  constructor(private redis: Redis) {}
  
  async addItem(userId: string, productId: string, quantity: number): Promise<void> {
    const key = `${this.prefix}${userId}`;
    await this.redis.hset(key, productId, quantity.toString());
    await this.redis.expire(key, this.ttl);
  }
  
  async removeItem(userId: string, productId: string): Promise<void> {
    await this.redis.hdel(`${this.prefix}${userId}`, productId);
  }
  
  async updateQuantity(userId: string, productId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      await this.removeItem(userId, productId);
    } else {
      await this.redis.hset(`${this.prefix}${userId}`, productId, quantity.toString());
    }
  }
  
  async getCart(userId: string): Promise<Map<string, number>> {
    const items = await this.redis.hgetall(`${this.prefix}${userId}`);
    const cart = new Map<string, number>();
    
    for (const [productId, quantity] of Object.entries(items)) {
      cart.set(productId, parseInt(quantity));
    }
    
    return cart;
  }
  
  async clearCart(userId: string): Promise<void> {
    await this.redis.del(`${this.prefix}${userId}`);
  }
}
```

---

## Coding Challenges

### Challenge 1: Implement LRU Cache

```typescript
class LRUCache {
  private readonly dataKey: string;
  private readonly orderKey: string;
  
  constructor(
    private redis: Redis,
    private name: string,
    private capacity: number
  ) {
    this.dataKey = `lru:${name}:data`;
    this.orderKey = `lru:${name}:order`;
  }
  
  async get(key: string): Promise<string | null> {
    const value = await this.redis.hget(this.dataKey, key);
    
    if (value) {
      // Update access order
      await this.redis.zadd(this.orderKey, Date.now(), key);
    }
    
    return value;
  }
  
  async set(key: string, value: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    // Set value
    pipeline.hset(this.dataKey, key, value);
    
    // Update access order
    pipeline.zadd(this.orderKey, Date.now().toString(), key);
    
    await pipeline.exec();
    
    // Evict if over capacity
    await this.evict();
  }
  
  private async evict(): Promise<void> {
    const count = await this.redis.zcard(this.orderKey);
    
    if (count > this.capacity) {
      // Get oldest keys
      const toRemove = await this.redis.zrange(this.orderKey, 0, count - this.capacity - 1);
      
      if (toRemove.length > 0) {
        const pipeline = this.redis.pipeline();
        
        pipeline.zrem(this.orderKey, ...toRemove);
        pipeline.hdel(this.dataKey, ...toRemove);
        
        await pipeline.exec();
      }
    }
  }
}
```

### Challenge 2: Implement Autocomplete

```typescript
class Autocomplete {
  private readonly key: string;
  
  constructor(
    private redis: Redis,
    name: string
  ) {
    this.key = `autocomplete:${name}`;
  }
  
  async addTerm(term: string, score: number = 0): Promise<void> {
    const normalized = term.toLowerCase().trim();
    
    // Add all prefixes
    for (let i = 1; i <= normalized.length; i++) {
      const prefix = normalized.substring(0, i);
      await this.redis.zadd(`${this.key}:${prefix}`, score, normalized);
    }
    
    // Store the full term with its display value
    await this.redis.hset(`${this.key}:terms`, normalized, term);
  }
  
  async search(prefix: string, limit: number = 10): Promise<string[]> {
    const normalized = prefix.toLowerCase().trim();
    const matches = await this.redis.zrevrange(
      `${this.key}:${normalized}`,
      0,
      limit - 1
    );
    
    // Get display values
    if (matches.length === 0) return [];
    
    const displayValues = await this.redis.hmget(`${this.key}:terms`, ...matches);
    return displayValues.filter(Boolean) as string[];
  }
  
  async incrementScore(term: string): Promise<void> {
    const normalized = term.toLowerCase().trim();
    
    // Increment score in all prefix sets
    for (let i = 1; i <= normalized.length; i++) {
      const prefix = normalized.substring(0, i);
      await this.redis.zincrby(`${this.key}:${prefix}`, 1, normalized);
    }
  }
}
```

---

## Quick Reference Cheat Sheet

### Common Commands

```bash
# Strings
SET key value
GET key
SETEX key ttl value
INCR key
DECR key

# Keys
DEL key
EXISTS key
EXPIRE key seconds
TTL key
KEYS pattern  # Avoid in production
SCAN cursor MATCH pattern

# Hashes
HSET key field value
HGET key field
HGETALL key
HDEL key field

# Lists
LPUSH key value
RPUSH key value
LPOP key
RPOP key
LRANGE key start stop

# Sets
SADD key member
SMEMBERS key
SISMEMBER key member
SREM key member

# Sorted Sets
ZADD key score member
ZRANGE key start stop
ZREVRANGE key start stop
ZRANK key member
ZSCORE key member
```

### Cache Strategy Decision Tree

```
┌─────────────────────────────────────────────────┐
│        WHICH STRATEGY SHOULD I USE?             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Read-heavy, tolerance for stale data?         │
│  └─▶ Cache-Aside with TTL                      │
│                                                 │
│  Must have consistent data?                    │
│  └─▶ Write-Through                             │
│                                                 │
│  Write-heavy, can accept eventual consistency? │
│  └─▶ Write-Behind                              │
│                                                 │
│  Predictable access patterns?                  │
│  └─▶ Refresh-Ahead                             │
│                                                 │
│  High traffic, need to prevent stampede?       │
│  └─▶ Cache-Aside + Lock/SWR                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Performance Tips

1. **Use Pipelining** for bulk operations
2. **Use SCAN** instead of KEYS
3. **Set TTLs** to prevent memory leaks
4. **Use appropriate data structures** (Hash vs String for objects)
5. **Compress** large values
6. **Monitor** memory usage and hit rates
7. **Use Cluster** for horizontal scaling
8. **Implement graceful degradation** when Redis is down

---

## Conclusion

You now have comprehensive knowledge of:

✅ Caching fundamentals and strategies  
✅ Redis architecture and data structures  
✅ Node.js + Redis integration with ioredis  
✅ Real-world implementation in ShopPulse  
✅ Advanced patterns (distributed locks, rate limiting, sessions)  
✅ Interview preparation with Q&A and scenarios  

**Remember**: Caching is about tradeoffs. There's no perfect solution - choose based on your specific requirements for consistency, performance, and complexity.

Good luck with your interviews! 🚀
