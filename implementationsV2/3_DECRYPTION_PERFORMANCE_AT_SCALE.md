# Part 3: Decryption Performance Analysis at Scale

## Your Question

> "Analysis of time to get credentials from DB, decrypt, and use when app scales 
> to 50K - 1 Lakh decryptions per second. Can we cache encrypted or decrypted credentials?"

---

<!-- NOTE: We will implement the caching after the complete flow is implemented and tested with database -->

## Current Implementation Analysis

Your encryption in `src/lib/encryption.ts`:

```typescript
// AES-256-CBC with random IV
const algorithm = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes
const IV_LENGTH = 16;

function decrypt(text: string): string {
  const [iv, encrypted] = text.split(':');
  const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(Buffer.from(encrypted, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}
```

---

## Performance Benchmarks

### Single Decryption Cost

```
┌─────────────────────────────────────────────────────────┐
│           AES-256-CBC DECRYPTION BENCHMARK              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Operation: Decrypt 500 bytes (typical credential)     │
│                                                         │
│   CPU Time:        0.01 - 0.05 ms                       │
│   Memory:          ~2KB per operation                   │
│                                                         │
│   THROUGHPUT (single CPU core):                         │
│   ├─ ~20,000 - 50,000 decryptions/second               │
│   └─ Node.js crypto module (native C++ binding)         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Full Request Flow

```
┌─────────────────────────────────────────────────────────┐
│         FULL CREDENTIAL FETCH + DECRYPT FLOW            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   1. Database Query (PostgreSQL)                        │
│      ├─ Network latency: 1-5ms (same region)           │
│      ├─ Query execution: 0.5-2ms (indexed)             │
│      └─ Subtotal: 1.5 - 7ms                            │
│                                                         │
│   2. Decryption (AES-256-CBC)                          │
│      └─ CPU time: 0.01 - 0.05ms                        │
│                                                         │
│   3. JSON Parse                                         │
│      └─ CPU time: 0.01 - 0.05ms                        │
│                                                         │
│   TOTAL: 1.5 - 7.1ms per credential fetch              │
│                                                         │
│   BOTTLENECK: Database, NOT decryption!                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Scale Analysis: 50K - 100K req/sec

### Without Caching

```
SCENARIO: 100,000 requests/second, each needs credentials

Database Load:
├─ 100,000 queries/second
├─ PostgreSQL max: ~10,000-30,000 queries/sec (single instance)
├─ STATUS: ❌ DATABASE WILL CRASH

CPU Load (Decryption):
├─ 100,000 decryptions/second
├─ Node.js capacity: ~50,000/sec per core
├─ With 4 cores: ~200,000/sec capacity
├─ STATUS: ✅ CPU CAN HANDLE IT

VERDICT: Decryption is NOT the problem. Database is.
```

### With Caching

```
SCENARIO: 100,000 requests/second WITH Redis cache

Cache Strategy:
├─ Store decrypted credentials in Redis
├─ TTL: 5 minutes (300 seconds)
├─ Cache key: `integration:{storeId}:{type}`

Request Flow:
├─ 1. Check Redis (0.2-1ms)
│   ├─ HIT: Return cached → Done
│   └─ MISS: Continue to step 2
├─ 2. Query PostgreSQL (5ms)
├─ 3. Decrypt (0.05ms)
├─ 4. Cache in Redis
└─ 5. Return

Cache Hit Rate Analysis:
├─ Unique stores: 10,000
├─ Integration types per store: 5
├─ Total unique keys: 50,000
├─ After warmup: 99%+ cache hit rate

Performance:
├─ 99,000 requests: Redis hit (1ms each)
├─ 1,000 requests: DB + decrypt (7ms each)
├─ Average latency: ~1.06ms
├─ STATUS: ✅ EASILY HANDLES 100K/sec
```

---

## Caching Strategies

### Option A: Cache Decrypted Credentials (RECOMMENDED)

```typescript
// src/lib/integration-cache.ts

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const CACHE_TTL = 300; // 5 minutes

export async function getCachedCredentials(
  storeId: string, 
  type: IntegrationType
): Promise<IntegrationCredentials | null> {
  const cacheKey = `integration:${storeId}:${type}`;
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Cache miss - fetch from DB
  const integration = await prisma.storeIntegration.findUnique({
    where: { storeId_type: { storeId, type } }
  });
  
  if (!integration) return null;

  // 3. Decrypt
  const credentials = JSON.parse(decrypt(integration.credentials));

  // 4. Cache decrypted credentials
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(credentials));

  return credentials;
}

// Invalidate on update
export async function invalidateCredentialCache(storeId: string, type: IntegrationType) {
  await redis.del(`integration:${storeId}:${type}`);
}
```

**Pros:**
- ✅ Fastest (no decryption on cache hit)
- ✅ Reduces DB load 99%+
- ✅ Redis handles 100K+ ops/sec easily

**Cons:**
- ⚠️ Decrypted secrets in Redis (see security section below)

---

### Option B: Cache Encrypted Credentials

```typescript
export async function getCachedCredentials(storeId: string, type: IntegrationType) {
  const cacheKey = `integration:enc:${storeId}:${type}`;
  
  // 1. Try cache
  let encryptedCredentials = await redis.get(cacheKey);
  
  if (!encryptedCredentials) {
    // 2. Fetch from DB
    const integration = await prisma.storeIntegration.findUnique({
      where: { storeId_type: { storeId, type } }
    });
    if (!integration) return null;
    
    encryptedCredentials = integration.credentials;
    
    // 3. Cache encrypted version
    await redis.setex(cacheKey, CACHE_TTL, encryptedCredentials);
  }

  // 4. Always decrypt (every request)
  return JSON.parse(decrypt(encryptedCredentials));
}
```

**Pros:**
- ✅ Redis only has encrypted data
- ✅ More secure if Redis compromised

**Cons:**
- ⚠️ Still pays decryption cost every request
- ⚠️ CPU bottleneck at extreme scale

---

### Option C: In-Memory LRU Cache (Simplest)

```typescript
import LRU from 'lru-cache';

const cache = new LRU<string, IntegrationCredentials>({
  max: 10000,        // Max 10K entries
  ttl: 1000 * 60 * 5 // 5 minutes
});

export async function getCachedCredentials(storeId: string, type: IntegrationType) {
  const cacheKey = `${storeId}:${type}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const integration = await prisma.storeIntegration.findUnique({...});
  if (!integration) return null;
  
  const credentials = JSON.parse(decrypt(integration.credentials));
  cache.set(cacheKey, credentials);
  
  return credentials;
}
```

**Pros:**
- ✅ No Redis dependency
- ✅ Fastest possible (in-process memory)
- ✅ Simple implementation

**Cons:**
- ⚠️ Not shared across server instances
- ⚠️ Cache cold after deploy/restart
- ⚠️ Each instance has its own cache (memory usage × instances)

---

## Security Considerations

### Is Caching Decrypted Credentials Safe?

```
┌─────────────────────────────────────────────────────────┐
│          SECURITY ANALYSIS: CACHED CREDENTIALS          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   THREAT: Redis gets compromised                        │
│                                                         │
│   MITIGATIONS:                                          │
│   1. Redis AUTH (password)                              │
│   2. Redis TLS (encrypted in transit)                   │
│   3. Private network (no public access)                 │
│   4. Short TTL (5 min = limited exposure)               │
│   5. Redis ACLs (restrict commands)                     │
│                                                         │
│   COMPARISON:                                           │
│   - If attacker has Redis access, they likely have      │
│     server access → can get ENCRYPTION_KEY too          │
│   - Encrypted cache doesn't help much in that scenario  │
│                                                         │
│   VERDICT: Cache decrypted is acceptable with proper    │
│            Redis security (TLS, AUTH, private network)  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Recommended Implementation

```
┌─────────────────────────────────────────────────────────┐
│             CREDENTIAL CACHING STRATEGY                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   TIER 1: In-Memory LRU Cache (First Layer)             │
│   ├─ Fastest possible                                   │
│   ├─ 10K entries, 5 min TTL                            │
│   └─ Per-instance cache                                 │
│                                                         │
│   TIER 2: Redis Cache (Second Layer)                    │
│   ├─ Shared across instances                            │
│   ├─ 5 min TTL                                         │
│   └─ Falls back to DB on miss                           │
│                                                         │
│   TIER 3: PostgreSQL (Source of Truth)                  │
│   └─ Only hit on cache miss                             │
│                                                         │
│   FLOW:                                                 │
│   Request → LRU (hit?) → Redis (hit?) → PostgreSQL      │
│              0.001ms       0.5ms          5ms           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Performance Summary

| Scale | Without Cache | With LRU | With LRU + Redis |
|-------|---------------|----------|------------------|
| 1K/sec | ✅ 5ms avg | ✅ 0.1ms avg | ✅ 0.1ms avg |
| 10K/sec | ✅ 5ms avg | ✅ 0.1ms avg | ✅ 0.1ms avg |
| 50K/sec | ❌ DB overload | ⚠️ Cold starts | ✅ 0.5ms avg |
| 100K/sec | ❌ Crash | ⚠️ Per-instance | ✅ 0.5ms avg |

**For your scale (50K-100K/sec):**
- ✅ LRU Cache: Handles it if single instance
- ✅ LRU + Redis: Handles it with multiple instances
- ❌ No cache: Database will be the bottleneck

---

## Code Implementation

```typescript
// src/lib/credential-cache.ts

import LRU from 'lru-cache';
import Redis from 'ioredis';
import { decrypt } from './encryption';
import { prisma } from './prisma';

// Layer 1: In-memory LRU
const memoryCache = new LRU<string, any>({ max: 10000, ttl: 300000 });

// Layer 2: Redis (optional)
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export async function getCredentials(storeId: string, type: IntegrationType) {
  const key = `${storeId}:${type}`;

  // Layer 1: Memory
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  // Layer 2: Redis
  if (redis) {
    const cached = await redis.get(`cred:${key}`);
    if (cached) {
      const creds = JSON.parse(cached);
      memoryCache.set(key, creds);
      return creds;
    }
  }

  // Layer 3: Database
  const integration = await prisma.storeIntegration.findFirst({
    where: { storeId, type, status: 'ACTIVE' }
  });
  
  if (!integration) return null;

  const credentials = JSON.parse(decrypt(integration.credentials));

  // Populate caches
  memoryCache.set(key, credentials);
  if (redis) {
    await redis.setex(`cred:${key}`, 300, JSON.stringify(credentials));
  }

  return credentials;
}
```

---

## Answer Summary

| Question | Answer |
|----------|--------|
| Is decryption the bottleneck? | ❌ No, database is |
| Can you cache encrypted? | ✅ Yes, but still pay decrypt cost |
| Can you cache decrypted? | ✅ Yes (recommended with secure Redis) |
| At 100K/sec without cache? | ❌ Database crashes |
| At 100K/sec with cache? | ✅ Easily handled |
| Best strategy? | LRU + Redis two-tier cache |

---

*Next: Part 4 - Why Build Command Was Ignored (Explanation)*
