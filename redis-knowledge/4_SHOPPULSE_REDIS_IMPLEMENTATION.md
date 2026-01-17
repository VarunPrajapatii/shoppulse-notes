# Part 4: ShopPulse Redis Implementation

> 📚 **Purpose**: Deep dive into the actual Redis caching implementation in the ShopPulse Admin Dashboard application.

---

## Table of Contents

1. [Project Context](#project-context)
2. [Architecture Overview](#architecture-overview)
3. [Redis Client Implementation](#redis-client-implementation)
4. [Cache Service Implementation](#cache-service-implementation)
5. [API Integration](#api-integration)
6. [Cache Invalidation Strategy](#cache-invalidation-strategy)
7. [Code Walkthrough](#code-walkthrough)
8. [Testing the Implementation](#testing-the-implementation)
9. [Monitoring & Debugging](#monitoring--debugging)
10. [Future Improvements](#future-improvements)

---

## Project Context

### What is ShopPulse Admin?

ShopPulse Admin is a **multi-tenant e-commerce administration dashboard** built with:

```
📦 Tech Stack:
├── Next.js 15 (App Router)
├── Prisma ORM
├── PostgreSQL (Database)
├── Redis (Caching)
├── Clerk (Authentication)
├── Razorpay (Payments)
└── TypeScript
```

### Why We Added Caching

The public-facing API endpoints (products, categories, billboards) are hit frequently by:
- Customer-facing storefronts
- Mobile apps
- Third-party integrations

**Problem**: Every request was hitting the database, causing:
- Slow response times during traffic spikes
- High database load
- Increased costs

**Solution**: Redis caching with intelligent invalidation

### Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SHOPPULSE ADMIN                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐                  │
│   │ Store A │   │ Store B │   │ Store C │   ...            │
│   └────┬────┘   └────┬────┘   └────┬────┘                  │
│        │             │             │                        │
│        ▼             ▼             ▼                        │
│   /api/store-a-id/products                                  │
│   /api/store-b-id/products                                  │
│   /api/store-c-id/products                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Each store has:
- Its own products, categories, billboards
- Its own cache namespace (prefixed with storeId)
- Independent cache invalidation
```

---

## Architecture Overview

### Before Caching (Direct DB Access)

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│ Storefront│──────▶│ API Route│──────▶│ Database │
│  (Next.js)│◀──────│ (Next.js)│◀──────│(PostgreSQL)│
└──────────┘       └──────────┘       └──────────┘
     │                  │                  │
     │                  │                  │
  Request ──────────────┼──────────────────┤
  Response ◀────────────┼──────────────────┘
                        │
                   ~50-200ms
                 (DB query time)
```

### After Caching (Cache-Through Pattern)

```
┌──────────┐       ┌──────────┐       ┌───────┐       ┌──────────┐
│ Storefront│──────▶│ API Route│──────▶│ Redis │       │ Database │
│  (Next.js)│◀──────│ (Next.js)│◀──────│ Cache │       │(PostgreSQL)│
└──────────┘       └──────────┘       └───┬───┘       └──────────┘
                        │                 │                 │
                        │                 │                 │
  Cache HIT ◀───────────┼────2-5ms ◀──────┘                 │
                        │                                   │
  Cache MISS ◀──────────┼──────────────50-200ms ◀───────────┘
                        │                 │
                        │                 ▼
                        │        Store in Redis
                        │              │
                        ▼              ▼
                   Next request = Cache HIT (2-5ms)
```

### Cache Layer Components

```
┌─────────────────────────────────────────────────────────────┐
│                    src/lib/                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                    redis.ts                          │   │
│   │  ├── getRedisClient()     # Singleton connection     │   │
│   │  ├── isRedisHealthy()     # Health check             │   │
│   │  └── closeRedisConnection() # Cleanup                │   │
│   └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                  redis-cache.ts                      │   │
│   │  ├── buildCacheKey()      # Key generation           │   │
│   │  ├── cacheThrough()       # Main caching utility     │   │
│   │  ├── getFromCache()       # Manual get               │   │
│   │  ├── setInCache()         # Manual set               │   │
│   │  ├── invalidateByPattern() # Pattern-based delete    │   │
│   │  ├── invalidateProductCache()                        │   │
│   │  ├── invalidateCategoryCache()                       │   │
│   │  └── invalidateBillboardCache()                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Redis Client Implementation

### File: `src/lib/redis.ts`

```typescript
/**
 * Redis Client Configuration
 * 
 * This file provides a singleton Redis client that can be used
 * throughout the application for caching operations.
 * 
 * Key Features:
 * - Singleton pattern (one connection shared across app)
 * - Auto-reconnection with exponential backoff
 * - Health check functionality
 * - Graceful shutdown support
 */

import Redis from "ioredis";

// Singleton instance
let redisClient: Redis | null = null;

/**
 * Get or create the Redis client singleton
 * 
 * Why Singleton?
 * - Redis connections are expensive to create
 * - Multiple connections waste resources
 * - ioredis handles connection multiplexing automatically
 */
export function getRedisClient(): Redis {
  // Return existing client if available
  if (redisClient) {
    return redisClient;
  }

  // Get connection URL from environment (with fallback)
  const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

  // Create new client with optimal configuration
  redisClient = new Redis(REDIS_URL, {
    /**
     * Maximum retries per Redis command
     * After 3 failed attempts, the command throws an error
     */
    maxRetriesPerRequest: 3,

    /**
     * Retry strategy for reconnection
     * 
     * @param times - Number of retry attempts
     * @returns Delay in ms before next retry, or null to stop
     * 
     * This implements exponential backoff with a cap:
     * - Attempt 1: 100ms delay
     * - Attempt 2: 200ms delay
     * - Attempt 3: 300ms delay
     * - ...
     * - Attempt 30+: 3000ms delay (capped)
     */
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      console.log(
        `[Redis] Retry attempt ${times}, waiting ${delay}ms before reconnect`
      );
      return delay;
    },

    /**
     * Don't connect immediately
     * Wait until the first command is issued
     * This prevents connection errors during build/startup
     */
    lazyConnect: true,

    /**
     * Enable offline queue
     * Commands issued while disconnected are queued
     * and executed when connection is restored
     */
    enableOfflineQueue: true,
  });

  // Event handlers for monitoring
  redisClient.on("connect", () => {
    console.log("✅ Redis client connected");
  });

  redisClient.on("ready", () => {
    console.log("✅ Redis client ready to accept commands");
  });

  redisClient.on("error", (err) => {
    console.error("❌ Redis client error:", err.message);
    // Don't crash the app, let retry strategy handle it
  });

  redisClient.on("close", () => {
    console.log("⚠️ Redis connection closed");
  });

  redisClient.on("reconnecting", () => {
    console.log("🔄 Redis client reconnecting...");
  });

  return redisClient;
}

/**
 * Check if Redis connection is healthy
 * 
 * Uses PING command which is the lightest operation
 * Expected response: "PONG"
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const result = await redis.ping();
    return result === "PONG";
  } catch (error) {
    console.error("Redis health check failed:", error);
    return false;
  }
}

/**
 * Close Redis connection gracefully
 * 
 * Call this during application shutdown:
 * - SIGTERM (container orchestration)
 * - SIGINT (Ctrl+C during development)
 * 
 * Uses quit() instead of disconnect():
 * - quit() waits for pending commands to complete
 * - disconnect() terminates immediately
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    console.log("Closing Redis connection...");
    await redisClient.quit();
    redisClient = null;
    console.log("Redis connection closed");
  }
}
```

### Key Design Decisions

| Decision | Why |
|----------|-----|
| **Singleton Pattern** | Avoid connection overhead, share across requests |
| **lazyConnect: true** | Don't fail during Next.js build if Redis unavailable |
| **Exponential Backoff** | Prevent hammering Redis during outages |
| **Event Handlers** | Observable behavior for debugging |

---

## Cache Service Implementation

### File: `src/lib/redis-cache.ts`

Let's break down each function:

### 1. TTL Configuration

```typescript
/**
 * Cache TTL (Time-To-Live) Configuration
 * 
 * Different resources have different update frequencies
 * and importance, so we use different TTLs
 */
export const CACHE_TTL = {
  /**
   * SEO Configuration: 24 hours
   * - Rarely changes (store name, description)
   * - Safe to cache for long periods
   */
  SEO_CONFIG: 60 * 60 * 24, // 24 hours

  /**
   * Categories: 24 hours
   * - Changed occasionally by store admins
   * - Structure is fairly stable
   */
  CATEGORIES: 60 * 60 * 24, // 24 hours

  /**
   * Billboards: 24 hours
   * - Updated for promotions/campaigns
   * - Changes are typically planned
   */
  BILLBOARDS: 60 * 60 * 24, // 24 hours

  /**
   * Products: 30 minutes
   * - More dynamic data
   * - Price changes, stock updates
   * - Needs fresher data
   */
  PRODUCTS: 60 * 30, // 30 minutes
};
```

**Why Different TTLs?**

```
Freshness vs Performance Tradeoff:

    ◀─── More Fresh ──────────────────── Less Fresh ───▶
    ◀─── Lower Performance ────────── Higher Performance ───▶

Products (30min)     Categories (24hr)     SEO Config (24hr)
    │                      │                     │
    ▼                      ▼                     ▼
Changes often        Changes rarely       Almost never changes
Stock updates        Admin configures     Store name/description
Price updates        New collections
```

### 2. Cache Key Building

```typescript
/**
 * Build a consistent cache key
 * 
 * Format: {storeId}:{resource}:{identifier?}:{queryHash?}
 * 
 * Examples:
 * - "store123:products"           (all products)
 * - "store123:products:prod456"   (single product)
 * - "store123:products:abc123"    (filtered products, hash of query params)
 * 
 * @param storeId - Unique store identifier
 * @param resource - Type of resource (products, categories, etc.)
 * @param identifier - Optional specific ID or query hash
 */
export function buildCacheKey(
  storeId: string,
  resource: string,
  identifier?: string
): string {
  const parts = [storeId, resource];

  if (identifier) {
    parts.push(identifier);
  }

  return parts.join(":");
}
```

**Why This Key Structure?**

```
┌─────────────────────────────────────────────────────────────┐
│           Cache Key Hierarchy                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   store123                    ◀── Namespace (per store)     │
│       │                                                     │
│       ├── products            ◀── Resource type             │
│       │       │                                             │
│       │       ├── (list)      ◀── store123:products         │
│       │       ├── prod456     ◀── store123:products:prod456 │
│       │       └── abc123      ◀── Query params hash         │
│       │                                                     │
│       ├── categories                                        │
│       │       ├── (list)      ◀── store123:categories       │
│       │       └── cat789      ◀── store123:categories:cat789│
│       │                                                     │
│       └── billboards                                        │
│               ├── (list)      ◀── store123:billboards       │
│               └── bill012     ◀── store123:billboards:bill012│
│                                                             │
└─────────────────────────────────────────────────────────────┘

Benefits:
✅ Store isolation (multi-tenant safe)
✅ Pattern-based invalidation (store123:products:*)
✅ Predictable structure (easy debugging)
```

### 3. Cache-Through Function (The Heart)

```typescript
/**
 * Cache-through pattern implementation
 * 
 * This is the main caching utility that:
 * 1. Checks if data exists in cache
 * 2. If YES: Returns cached data (fast path)
 * 3. If NO: Calls fetcher function, caches result, returns data
 * 
 * @param key - Cache key
 * @param ttlSeconds - How long to cache
 * @param fetcher - Function that fetches data from the source (database)
 * @returns The data (from cache or freshly fetched)
 */
export async function cacheThrough<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const redis = getRedisClient();

    // Step 1: Check cache
    const cached = await redis.get(key);

    // Step 2: Cache HIT - Return immediately
    if (cached) {
      console.log(`[Cache HIT] ${key}`);
      return JSON.parse(cached) as T;
    }

    // Step 3: Cache MISS - Fetch from database
    console.log(`[Cache MISS] ${key}`);
    const data = await fetcher();

    // Step 4: Store in cache for future requests
    // Using fire-and-forget (not await) to avoid blocking the response
    redis
      .setex(key, ttlSeconds, JSON.stringify(data))
      .catch((err) => console.error(`[Cache SET Error] ${key}:`, err));

    // Step 5: Return fresh data
    return data;
  } catch (error) {
    // Step 6: On Redis error, fall back to database
    console.error(`[Cache Error] ${key}:`, error);
    return fetcher();
  }
}
```

**Flow Visualization:**

```
┌───────────────────────────────────────────────────────────────────────┐
│                     cacheThrough() Flow                                │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   cacheThrough(key, ttl, fetcher)                                     │
│                │                                                      │
│                ▼                                                      │
│         ┌─────────────┐                                               │
│         │ redis.get() │                                               │
│         └──────┬──────┘                                               │
│                │                                                      │
│         ┌──────┴──────┐                                               │
│         │             │                                               │
│    Has Data?     No Data                                              │
│         │             │                                               │
│         ▼             ▼                                               │
│   ┌───────────┐  ┌───────────┐                                        │
│   │ JSON.parse│  │ fetcher() │                                        │
│   └─────┬─────┘  └─────┬─────┘                                        │
│         │              │                                              │
│         │         ┌────┴────┐                                         │
│         │         │ setex() │◀── Fire & forget (async)                │
│         │         └────┬────┘                                         │
│         │              │                                              │
│         ▼              ▼                                              │
│   ┌─────────────────────────┐                                         │
│   │     return data          │                                        │
│   └─────────────────────────┘                                         │
│                                                                       │
│   ⏱️ Cache HIT: ~2-5ms                                                │
│   ⏱️ Cache MISS: ~50-200ms (DB) + ~2ms (cache set)                    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### 4. Manual Get/Set Functions

```typescript
/**
 * Manually get data from cache
 * 
 * Use when you need more control than cacheThrough provides
 * For example, checking if cache exists before deciding what to do
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const cached = await redis.get(key);

    if (cached) {
      return JSON.parse(cached) as T;
    }

    return null;
  } catch (error) {
    console.error(`[Cache GET Error] ${key}:`, error);
    return null;
  }
}

/**
 * Manually set data in cache
 * 
 * Use when you want to proactively cache data
 * For example, after creating a new resource
 */
export async function setInCache<T>(
  key: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
    console.log(`[Cache SET] ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error(`[Cache SET Error] ${key}:`, error);
  }
}
```

### 5. Cache Invalidation Functions

```typescript
/**
 * Invalidate cache entries matching a pattern
 * 
 * Uses SCAN (not KEYS) to be production-safe:
 * - KEYS blocks Redis during execution
 * - SCAN iterates incrementally, non-blocking
 * 
 * @param pattern - Glob pattern (e.g., "store123:products:*")
 */
export async function invalidateByPattern(pattern: string): Promise<number> {
  try {
    const redis = getRedisClient();
    let cursor = "0";
    let deletedCount = 0;

    // SCAN loop - iterate through all matching keys
    do {
      // SCAN returns [nextCursor, keysFound]
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100  // Process 100 keys per iteration
      );

      cursor = nextCursor;

      // Delete found keys (if any)
      if (keys.length > 0) {
        // Use pipeline for batch deletion (one round trip)
        const pipeline = redis.pipeline();
        keys.forEach((key) => pipeline.del(key));
        await pipeline.exec();

        deletedCount += keys.length;
      }
    } while (cursor !== "0");  // Continue until cursor wraps to 0

    console.log(`[Cache Invalidated] Pattern "${pattern}": ${deletedCount} keys deleted`);
    return deletedCount;
  } catch (error) {
    console.error(`[Cache Invalidation Error] ${pattern}:`, error);
    return 0;
  }
}
```

**SCAN vs KEYS Comparison:**

```
┌─────────────────────────────────────────────────────────────┐
│                    KEYS "pattern"                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Request ────────────────────────────────────────▶ Redis   │
│                                                             │
│   [BLOCKED] ◀──────────────────────────────────────         │
│   [BLOCKED] ◀─────────── Scanning ALL keys ────────         │
│   [BLOCKED] ◀──────────────────────────────────────         │
│                                                             │
│   Response ◀────────────────────────────────────── All keys │
│                                                             │
│   ⚠️ O(N) - Blocks ALL other operations!                    │
│   ⚠️ Can cause timeouts with large key sets                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SCAN cursor MATCH "pattern"               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Request 1 ──▶ Redis (scan 100 keys) ──▶ Response 1        │
│   Other commands can execute                                │
│   Request 2 ──▶ Redis (scan 100 keys) ──▶ Response 2        │
│   Other commands can execute                                │
│   Request 3 ──▶ Redis (scan 100 keys) ──▶ Response 3        │
│   ...                                                       │
│                                                             │
│   ✅ Non-blocking                                           │
│   ✅ Redis remains responsive                               │
│   ✅ Production-safe                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6. Resource-Specific Invalidation

```typescript
/**
 * Invalidate all product caches for a store
 * 
 * Called when:
 * - Product created (POST /api/[storeId]/products)
 * - Product updated (PATCH /api/[storeId]/products/[productId])
 * - Product deleted (DELETE /api/[storeId]/products/[productId])
 * - Stock changed (POST /api/[storeId]/checkout)
 */
export async function invalidateProductCache(storeId: string): Promise<void> {
  // Pattern "storeId:products:*" matches:
  // - storeId:products (list endpoint)
  // - storeId:products:productId (single product)
  // - storeId:products:queryHash (filtered queries)
  await invalidateByPattern(`${storeId}:products:*`);
}

/**
 * Invalidate all category caches for a store
 * 
 * Called when:
 * - Category created
 * - Category updated
 * - Category deleted
 */
export async function invalidateCategoryCache(storeId: string): Promise<void> {
  await invalidateByPattern(`${storeId}:categories:*`);
}

/**
 * Invalidate all billboard caches for a store
 * 
 * Called when:
 * - Billboard created
 * - Billboard updated
 * - Billboard deleted
 */
export async function invalidateBillboardCache(storeId: string): Promise<void> {
  await invalidateByPattern(`${storeId}:billboards:*`);
}
```

---

## API Integration

### Products API: GET (Reading with Cache)

**File: `src/app/api/[storeId]/products/route.ts`**

```typescript
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import {
  buildCacheKey,
  cacheThrough,
  CACHE_TTL,
  invalidateProductCache,
} from "@/lib/redis-cache";
import crypto from "crypto";

/**
 * GET /api/[storeId]/products
 * 
 * Returns products for a store with optional filters
 * Uses Redis caching for improved performance
 */
export async function GET(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const { storeId } = params;

    // Parse query parameters for filtering
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId") || undefined;
    const colorId = searchParams.get("colorId") || undefined;
    const sizeId = searchParams.get("sizeId") || undefined;
    const isFeatured = searchParams.get("isFeatured");

    /**
     * Build a unique cache key based on the query parameters
     * 
     * Two identical requests should hit the same cache
     * Different filters should have different cache entries
     */
    
    // Create a fingerprint of the query parameters
    const queryFingerprint = {
      categoryId,
      colorId,
      sizeId,
      isFeatured,
    };

    // Hash the fingerprint to create a short, unique identifier
    const queryHash = crypto
      .createHash("md5")
      .update(JSON.stringify(queryFingerprint))
      .digest("hex")
      .substring(0, 8);  // First 8 chars is enough

    // Build cache key: "storeId:products:queryHash"
    const cacheKey = buildCacheKey(storeId, "products", queryHash);

    /**
     * Use cacheThrough for the cache-aside pattern
     * 
     * 1. Checks Redis for cached data
     * 2. If found, returns immediately
     * 3. If not found, executes the database query
     * 4. Caches the result
     * 5. Returns the data
     */
    const products = await cacheThrough(
      cacheKey,
      CACHE_TTL.PRODUCTS,  // 30 minutes
      async () => {
        // This function only runs on cache miss
        return prismadb.product.findMany({
          where: {
            storeId,
            categoryId,
            colorId,
            sizeId,
            isFeatured: isFeatured ? true : undefined,
            isArchived: false,
          },
          include: {
            images: true,
            category: true,
            color: true,
            size: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });
      }
    );

    return NextResponse.json(products);
  } catch (error) {
    console.error("[PRODUCTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
```

### Products API: POST (Creating & Invalidating)

```typescript
/**
 * POST /api/[storeId]/products
 * 
 * Creates a new product and invalidates the product cache
 */
export async function POST(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    // ... authentication and validation code ...

    const body = await req.json();
    const { storeId } = params;

    // Create product in database
    const product = await prismadb.product.create({
      data: {
        name: body.name,
        price: body.price,
        categoryId: body.categoryId,
        colorId: body.colorId,
        sizeId: body.sizeId,
        storeId,
        isFeatured: body.isFeatured,
        isArchived: body.isArchived,
        images: {
          createMany: {
            data: body.images.map((image: { url: string }) => image),
          },
        },
      },
    });

    /**
     * CRITICAL: Invalidate cache after mutation
     * 
     * Without this, the GET endpoint would return stale data
     * (not including the newly created product)
     */
    await invalidateProductCache(storeId);

    return NextResponse.json(product);
  } catch (error) {
    console.error("[PRODUCTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
```

### Products API: PATCH/DELETE (Update & Invalidate)

**File: `src/app/api/[storeId]/products/[productId]/route.ts`**

```typescript
/**
 * PATCH /api/[storeId]/products/[productId]
 * 
 * Updates a product and invalidates cache
 */
export async function PATCH(
  req: Request,
  { params }: { params: { storeId: string; productId: string } }
) {
  try {
    // ... authentication and validation ...

    const product = await prismadb.product.update({
      where: { id: params.productId },
      data: {
        // ... update fields
      },
    });

    // Invalidate cache after update
    await invalidateProductCache(params.storeId);

    return NextResponse.json(product);
  } catch (error) {
    console.error("[PRODUCT_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

/**
 * DELETE /api/[storeId]/products/[productId]
 * 
 * Deletes a product and invalidates cache
 */
export async function DELETE(
  req: Request,
  { params }: { params: { storeId: string; productId: string } }
) {
  try {
    // ... authentication and validation ...

    const product = await prismadb.product.delete({
      where: { id: params.productId },
    });

    // Invalidate cache after deletion
    await invalidateProductCache(params.storeId);

    return NextResponse.json(product);
  } catch (error) {
    console.error("[PRODUCT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
```

### Checkout API: Stock Changes

**File: `src/app/api/[storeId]/checkout/route.ts`**

```typescript
/**
 * POST /api/[storeId]/checkout
 * 
 * Process checkout and update stock
 * Stock changes affect product data, so we invalidate cache
 */
export async function POST(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    // ... process payment and create order ...

    // Update stock for purchased products
    for (const item of orderItems) {
      await prismadb.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
        },
      });
    }

    /**
     * Stock changed = Product data changed
     * Must invalidate cache so storefronts see updated stock
     */
    await invalidateProductCache(params.storeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CHECKOUT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
```

---

## Cache Invalidation Strategy

### When to Invalidate

```
┌─────────────────────────────────────────────────────────────┐
│              INVALIDATION DECISION TREE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Data Modified?                                            │
│        │                                                    │
│        ▼                                                    │
│   ┌─────────┐                                               │
│   │  CREATE │──▶ Invalidate list cache (new item appears)   │
│   └─────────┘                                               │
│                                                             │
│   ┌─────────┐                                               │
│   │  UPDATE │──▶ Invalidate list + single item cache        │
│   └─────────┘                                               │
│                                                             │
│   ┌─────────┐                                               │
│   │  DELETE │──▶ Invalidate list + single item cache        │
│   └─────────┘                                               │
│                                                             │
│   ┌──────────────────┐                                      │
│   │ INDIRECT CHANGE  │──▶ Invalidate affected caches        │
│   │ (stock update,   │    (e.g., checkout affects products) │
│   │  related model)  │                                      │
│   └──────────────────┘                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Invalidation Matrix

| Action | Endpoint | Cache Invalidated |
|--------|----------|-------------------|
| Create Product | POST /products | `storeId:products:*` |
| Update Product | PATCH /products/[id] | `storeId:products:*` |
| Delete Product | DELETE /products/[id] | `storeId:products:*` |
| Checkout (stock) | POST /checkout | `storeId:products:*` |
| Create Category | POST /categories | `storeId:categories:*` |
| Update Category | PATCH /categories/[id] | `storeId:categories:*` |
| Delete Category | DELETE /categories/[id] | `storeId:categories:*` |
| Create Billboard | POST /billboards | `storeId:billboards:*` |
| Update Billboard | PATCH /billboards/[id] | `storeId:billboards:*` |
| Delete Billboard | DELETE /billboards/[id] | `storeId:billboards:*` |

### Why Pattern-Based Invalidation?

When a product changes, we don't know which cached queries are affected:

```
Cache keys after various GET requests:

store123:products:abc12345     ◀── All products
store123:products:def67890     ◀── Featured products
store123:products:ghi11111     ◀── Category X products
store123:products:jkl22222     ◀── Size S products

When any product changes, ANY of these could be stale.

Solution: Invalidate all with pattern "store123:products:*"
```

---

## Code Walkthrough

### Complete Request Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    GET /api/store123/products?isFeatured=true           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Request arrives at Next.js API route                               │
│     │                                                                   │
│     ▼                                                                   │
│  2. Parse query params: { isFeatured: "true" }                         │
│     │                                                                   │
│     ▼                                                                   │
│  3. Generate query fingerprint hash                                     │
│     queryHash = md5({ isFeatured: "true" }).slice(0, 8)                │
│     queryHash = "a1b2c3d4"                                              │
│     │                                                                   │
│     ▼                                                                   │
│  4. Build cache key                                                     │
│     cacheKey = "store123:products:a1b2c3d4"                            │
│     │                                                                   │
│     ▼                                                                   │
│  5. cacheThrough(cacheKey, 1800, fetcher)                              │
│     │                                                                   │
│     ├──▶ redis.get("store123:products:a1b2c3d4")                       │
│     │         │                                                         │
│     │         ├──[HIT]──▶ JSON.parse(cached) ──▶ return products       │
│     │         │                                                         │
│     │         └──[MISS]──▶ fetcher()                                   │
│     │                         │                                         │
│     │                         ▼                                         │
│     │                   prismadb.product.findMany(...)                  │
│     │                         │                                         │
│     │                         ▼                                         │
│     │                   redis.setex(key, 1800, JSON.stringify(data))    │
│     │                         │                                         │
│     │                         ▼                                         │
│     └────────────────── return products                                │
│                              │                                          │
│                              ▼                                          │
│  6. NextResponse.json(products)                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Mutation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    POST /api/store123/products                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Request arrives with product data                                  │
│     │                                                                   │
│     ▼                                                                   │
│  2. Authenticate user (Clerk)                                          │
│     │                                                                   │
│     ▼                                                                   │
│  3. Validate request body                                              │
│     │                                                                   │
│     ▼                                                                   │
│  4. Create product in database                                         │
│     prismadb.product.create(...)                                       │
│     │                                                                   │
│     ▼                                                                   │
│  5. INVALIDATE CACHE ◀── Critical step!                                │
│     │                                                                   │
│     ├── invalidateProductCache("store123")                             │
│     │         │                                                         │
│     │         ▼                                                         │
│     │   invalidateByPattern("store123:products:*")                     │
│     │         │                                                         │
│     │         ▼                                                         │
│     │   SCAN 0 MATCH "store123:products:*" COUNT 100                   │
│     │         │                                                         │
│     │         ▼                                                         │
│     │   Found keys: ["store123:products:abc12345",                     │
│     │                "store123:products:def67890", ...]                │
│     │         │                                                         │
│     │         ▼                                                         │
│     │   DEL all found keys (via pipeline)                              │
│     │                                                                   │
│     ▼                                                                   │
│  6. Return created product                                             │
│     NextResponse.json(product)                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

RESULT:
- New product is in database
- All product caches for this store are cleared
- Next GET request will fetch fresh data from DB and cache it
```

---

## Testing the Implementation

### 1. Start Redis

```bash
# Using Docker (recommended)
docker-compose -f docker-compose.redis.yml up -d

# Or native Redis
redis-server
```

### 2. Set Environment Variable

```bash
# .env.local
REDIS_URL=redis://localhost:6379
```

### 3. Test Cache Hit/Miss

```bash
# First request (MISS - hits database)
curl http://localhost:3000/api/store123/products

# Second request (HIT - from cache)
curl http://localhost:3000/api/store123/products

# Check console output:
# [Cache MISS] store123:products:abc12345
# [Cache HIT] store123:products:abc12345
```

### 4. Test Cache Invalidation

```bash
# Create a product
curl -X POST http://localhost:3000/api/store123/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Product", ...}'

# Console output:
# [Cache Invalidated] Pattern "store123:products:*": 5 keys deleted

# Next GET will be a MISS (fresh data)
curl http://localhost:3000/api/store123/products
# [Cache MISS] store123:products:xyz67890
```

### 5. Redis CLI Inspection

```bash
# Connect to Redis CLI
docker exec -it redis redis-cli

# See all keys for a store
KEYS store123:*

# Check a specific key
GET store123:products:abc12345

# Check TTL
TTL store123:products:abc12345
# Returns: 1745 (seconds remaining)

# Manually delete a key
DEL store123:products:abc12345
```

---

## Monitoring & Debugging

### Console Logging

The implementation logs all cache operations:

```
✅ Redis client connected
✅ Redis client ready to accept commands
[Cache MISS] store123:products:abc12345
[Cache SET] store123:products:abc12345 (TTL: 1800s)
[Cache HIT] store123:products:abc12345
[Cache Invalidated] Pattern "store123:products:*": 3 keys deleted
```

### Adding Metrics

```typescript
// src/lib/redis-cache.ts - Enhanced with metrics

let cacheMetrics = {
  hits: 0,
  misses: 0,
  errors: 0,
};

export async function cacheThrough<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const redis = getRedisClient();
    const cached = await redis.get(key);

    if (cached) {
      cacheMetrics.hits++;
      console.log(`[Cache HIT] ${key} (Total hits: ${cacheMetrics.hits})`);
      return JSON.parse(cached) as T;
    }

    cacheMetrics.misses++;
    console.log(`[Cache MISS] ${key} (Total misses: ${cacheMetrics.misses})`);

    const data = await fetcher();

    redis.setex(key, ttlSeconds, JSON.stringify(data)).catch((err) => {
      cacheMetrics.errors++;
      console.error(`[Cache SET Error] ${key}:`, err);
    });

    return data;
  } catch (error) {
    cacheMetrics.errors++;
    console.error(`[Cache Error] ${key}:`, error);
    return fetcher();
  }
}

// Expose metrics endpoint
export function getCacheMetrics() {
  return {
    ...cacheMetrics,
    hitRate: cacheMetrics.hits / (cacheMetrics.hits + cacheMetrics.misses) || 0,
  };
}
```

### Health Check Endpoint

```typescript
// src/app/api/health/route.ts
import { isRedisHealthy } from "@/lib/redis";
import { getCacheMetrics } from "@/lib/redis-cache";
import { NextResponse } from "next/server";

export async function GET() {
  const redisHealthy = await isRedisHealthy();
  const cacheMetrics = getCacheMetrics();

  return NextResponse.json({
    status: redisHealthy ? "healthy" : "degraded",
    redis: {
      connected: redisHealthy,
    },
    cache: {
      hits: cacheMetrics.hits,
      misses: cacheMetrics.misses,
      hitRate: `${(cacheMetrics.hitRate * 100).toFixed(2)}%`,
      errors: cacheMetrics.errors,
    },
    timestamp: new Date().toISOString(),
  });
}
```

---

## Future Improvements

### 1. Cache Warming on Startup

Pre-populate cache with frequently accessed data:

```typescript
async function warmCache() {
  const stores = await prismadb.store.findMany();

  for (const store of stores) {
    // Cache featured products for each store
    const key = buildCacheKey(store.id, "products", "featured");
    const products = await prismadb.product.findMany({
      where: { storeId: store.id, isFeatured: true },
      include: { images: true, category: true },
    });

    await setInCache(key, products, CACHE_TTL.PRODUCTS);
    console.log(`Warmed cache for store ${store.id}`);
  }
}
```

### 2. Distributed Cache Invalidation

For multi-server deployments, use Redis Pub/Sub:

```typescript
// When invalidating, publish event
await redis.publish("cache:invalidate", JSON.stringify({
  pattern: `${storeId}:products:*`,
}));

// Subscribe on all servers
subscriber.subscribe("cache:invalidate");
subscriber.on("message", async (channel, message) => {
  const { pattern } = JSON.parse(message);
  await invalidateByPattern(pattern);
});
```

### 3. Stale-While-Revalidate

Serve stale data while refreshing in background:

```typescript
async function cacheSWR<T>(
  key: string,
  ttlSeconds: number,
  staleSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const redis = getRedisClient();
  const cached = await redis.get(key);

  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age < ttlSeconds * 1000) {
      // Fresh data
      return data;
    }

    if (age < staleSeconds * 1000) {
      // Stale but acceptable - return and refresh async
      refreshInBackground(key, ttlSeconds, fetcher);
      return data;
    }
  }

  // Cache miss or too stale
  return fetchAndCache(key, ttlSeconds, fetcher);
}
```

### 4. Per-Request Cache

For SSR in Next.js, use per-request cache:

```typescript
import { cache } from "react";

// Deduplicate within single request
const getProduct = cache(async (id: string) => {
  return cacheThrough(
    `product:${id}`,
    CACHE_TTL.PRODUCTS,
    () => prismadb.product.findUnique({ where: { id } })
  );
});
```

---

## Summary

| Component | Purpose |
|-----------|---------|
| `redis.ts` | Singleton connection with auto-reconnect |
| `redis-cache.ts` | Caching utilities and invalidation |
| `buildCacheKey()` | Consistent key structure |
| `cacheThrough()` | Cache-aside pattern |
| `invalidateByPattern()` | Pattern-based deletion using SCAN |
| Per-resource invalidation | Type-safe invalidation functions |

### Performance Impact

```
Before Caching:
├── Average response time: ~150ms
├── Database queries per request: 1
└── Database load: HIGH

After Caching:
├── Cache HIT response time: ~5ms (97% reduction!)
├── Cache MISS response time: ~155ms (same + cache overhead)
├── Database queries: Only on MISS
└── Database load: SIGNIFICANTLY REDUCED
```

---

**Next: [Part 5 - Advanced Patterns & Interview Questions](./5_ADVANCED_PATTERNS_AND_INTERVIEWS.md)**
