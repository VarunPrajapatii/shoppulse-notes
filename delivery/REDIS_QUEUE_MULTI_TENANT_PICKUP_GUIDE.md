# Redis Queue for Multi-Tenant Pickup Scheduling - Complete Guide

> **Last Updated:** January 14, 2026  
> **Related Docs:** `UNIFIED_PICKUP_PIPELINE_ANALYSIS.md`, `0.2_SHIPPING_FLOW_ENHANCEMENTS.md`

## Table of Contents
1. [What is Redis? (Beginner Friendly)](#1-what-is-redis-beginner-friendly)
2. [Why Redis for Pickup Queue?](#2-why-redis-for-pickup-queue)
3. [Multi-Tenant Queue Architecture](#3-multi-tenant-queue-architecture)
4. [Rate Limiting - The Reality](#4-rate-limiting---the-reality)
5. [Weekend/Holiday Accumulation Handling](#5-weekendholiday-accumulation-handling)
6. [Large Batch Handling (5000+ Orders)](#6-large-batch-handling-5000-orders)
7. [Industry-Standard Implementation](#7-industry-standard-implementation)
8. [Alternative: BullMQ](#8-alternative-bullmq-recommended) (Skip for now)
9. [Implementation for ShopPulse](#9-implementation-for-shoppulse)

---

## Quick Reference: Features to Implement

| Feature | Status | Notes |
|---------|--------|-------|
| Core Redis Queue | ✅ DONE | `pickup-queue.ts` with addToPickupQueue(), removeFromPickupQueue(), etc. |
| Master Pickup Cron | ✅ DONE | `/api/cron/pickup-scheduler` (hourly 8AM-8PM) |
| Status Tracking | ✅ DONE | PICKUP_QUEUED/SCHEDULED/FAILED in ShipmentStatus enum |
| Health Check Cron | ✅ DONE | `/api/cron/pickup-health` (every 30 mins) |
| Pickup Settings UI | ✅ DONE | `PickupSettingsSection` component |
| Retry Endpoint | ✅ DONE | `/api/[storeId]/shipments/retry-pickup` |
| Queue Status API | ✅ DONE | `/api/[storeId]/shipments/queue-status` |
| Weekend Settings | ✅ DONE | skipWeekendPickup in store settings |
| Shipping Settings API | ✅ DONE | `/api/[storeId]/shipping/settings` (GET/PATCH) |
| Future Date Pickup | 🔴 TODO | Date picker in ship modal |
| Holiday Calendar | ⏳ FUTURE | Skip for now |
| BullMQ Migration | ⏳ FUTURE | When 50+ stores |

---

## 1. What is Redis? (Beginner Friendly)

### Simple Explanation

Think of Redis as a **super-fast sticky note board** that your server can read/write to instantly.

**Normal Database (PostgreSQL):**
- Stores data on disk (like a filing cabinet)
- Slow to read/write (milliseconds to seconds)
- Great for permanent data (users, orders, products)

**Redis:**
- Stores data in RAM (like a whiteboard)
- Blazingly fast (microseconds)
- Great for temporary data (queues, sessions, caches)

### Analogy

```
📁 PostgreSQL = Your filing cabinet
   - Store important documents forever
   - Takes time to find things
   - Very organized

📌 Redis = Sticky notes on your desk
   - Quick notes you need RIGHT NOW
   - Super fast to read/write
   - Disappears after use (or you remove it)
```

### Basic Redis Operations

```javascript
// SET - Write a value
await redis.set('greeting', 'Hello World');

// GET - Read a value
const value = await redis.get('greeting'); // "Hello World"

// SADD - Add to a Set (like an array with no duplicates)
await redis.sadd('pending_pickups:store123:delhivery', 'shipment_1');
await redis.sadd('pending_pickups:store123:delhivery', 'shipment_2');

// SMEMBERS - Get all items from a Set
const shipments = await redis.smembers('pending_pickups:store123:delhivery');
// ['shipment_1', 'shipment_2']

// DEL - Delete a key
await redis.del('pending_pickups:store123:delhivery');
```

### Redis vs RabbitMQ vs Kafka

| Feature | Redis | RabbitMQ | Kafka |
|---------|-------|----------|-------|
| **Complexity** | Simple | Medium | Complex |
| **Speed** | Fastest | Fast | Fast |
| **Use Case** | Caching, Simple Queues | Complex Routing | Event Streaming |
| **For ShopPulse** | ✅ Perfect | Overkill | Way Overkill |

**For ShopPulse:** Redis is the sweet spot. Simple, fast, and does exactly what we need.

---

## 2. Why Redis for Pickup Queue?

### The Problem We're Solving

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          THE MULTI-TENANT CHALLENGE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ShopPulse Platform                                                         │
│  ├─ Store A (50 orders/day, Shiprocket Account A)                          │
│  ├─ Store B (200 orders/day, Shiprocket Account B)                         │
│  ├─ Store C (10 orders/day, Shiprocket Account C)                          │
│  └─ ... 200 more stores                                                     │
│                                                                             │
│  Each store has:                                                            │
│  • Their OWN Shiprocket account (BYOK model)                               │
│  • Their OWN pickup schedule settings (1hr, 2hr, etc.)                     │
│  • Their OWN orders from different couriers                                │
│                                                                             │
│  Challenge: How to batch pickups efficiently without mixing up stores?      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Not Just Use PostgreSQL?

**Option A: Store queue in PostgreSQL**
```sql
-- Bad idea ❌
CREATE TABLE pickup_queue (
  id UUID,
  store_id UUID,
  shipment_id TEXT,
  courier_code TEXT,
  scheduled_slot TIMESTAMP
);

-- Every cron run needs:
SELECT * FROM pickup_queue WHERE scheduled_slot <= NOW();
-- Then GROUP BY store_id, courier_code
-- Then DELETE processed rows
```

**Problems:**
1. Database reads/writes are slow
2. Locks during concurrent writes
3. Need complex queries for grouping
4. Table grows large, needs cleanup

**Option B: Use Redis (Our choice)**
```javascript
// Good idea ✅
// Key structure automatically groups by store + courier + slot
await redis.sadd('pickup:store_123:delhivery:2026-01-14T10:00:00', shipmentId);

// Reading is instant
const shipments = await redis.smembers('pickup:store_123:delhivery:2026-01-14T10:00:00');

// Cleanup is instant
await redis.del('pickup:store_123:delhivery:2026-01-14T10:00:00');
```

**Benefits:**
1. Microsecond reads/writes
2. Key structure = automatic grouping
3. No cleanup queries needed
4. Perfect for temporary queue data

---

## 3. Multi-Tenant Queue Architecture

### Key Structure Design

```
pickup:{storeId}:{courierCode}:{scheduledSlot}
```

**Examples:**
```
pickup:store_abc:delhivery:2026-01-14T10:00:00    → [shipment_1, shipment_2, shipment_3]
pickup:store_abc:bluedart:2026-01-14T10:00:00    → [shipment_4, shipment_5]
pickup:store_xyz:delhivery:2026-01-14T10:00:00   → [shipment_6, shipment_7]
pickup:store_xyz:dtdc:2026-01-14T12:00:00        → [shipment_8]
```

### Visual Representation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REDIS QUEUE STRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  pickup:store_A:delhivery:10AM                                              │
│  ├─ shipment_101                                                            │
│  ├─ shipment_102                                                            │
│  └─ shipment_103                                                            │
│                                                                             │
│  pickup:store_A:bluedart:10AM                                               │
│  ├─ shipment_104                                                            │
│  └─ shipment_105                                                            │
│                                                                             │
│  pickup:store_B:delhivery:10AM     ← Different store, same time!            │
│  ├─ shipment_201                                                            │
│  ├─ shipment_202                                                            │
│  └─ shipment_203                                                            │
│                                                                             │
│  pickup:store_C:dtdc:12PM          ← Different store, different time!       │
│  └─ shipment_301                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Structure?

1. **Auto-Grouping:** Store A's Delhivery orders are automatically together
2. **Isolation:** Store A's orders never mix with Store B's
3. **Easy Querying:** `redis.keys('pickup:store_A:*')` gets all Store A queues
4. **Time-Based:** Different slots for different store settings

---

## 5. Weekend/Holiday Accumulation Handling

### Your Scenario

> "Store has 5000 orders accumulated since Friday 8 PM to Monday 8 AM. Will Monday 8 AM pickup scheduler work correctly?"

### Analysis

```
Friday 8 PM cron runs (last run)
↓
Weekend: Orders keep coming (no cron runs 8 PM - 8 AM)
↓
Monday 8 AM cron runs
↓
Queue has accumulated:
- Sat 9 PM: 100 orders
- Sat 11 PM: 50 orders
- Sun 10 AM: 200 orders
- Sun 3 PM: 300 orders
- Sun 9 PM: 150 orders
... etc

Total: 5000 orders accumulated
```

### Will It Work? YES! Here's Why:

**1. Queue Structure Handles It**
```
All orders are in Redis queue with their scheduled slot:
pickup:store_X:delhivery:2026-01-13T20:00:00  → [Fri 8PM orders - already processed]
pickup:store_X:delhivery:2026-01-14T08:00:00  → [Orders for Mon 8AM slot]
pickup:store_X:bluedart:2026-01-14T08:00:00   → [More Mon 8AM orders]
```

**2. Shiprocket API Handles Large Batches**
```javascript
// Shiprocket accepts array of shipment IDs
await shiprocket.post('/courier/generate/pickup', {
  shipment_id: [/* 2000 Delhivery shipment IDs */]
});
```

**Shiprocket's Response:** Creates ONE pickup request for ALL 2000 shipments with same courier.

### BUT! Potential Issues & Solutions

**Issue 1: Shiprocket Array Size Limit**

Shiprocket may have undocumented limits (e.g., 500 shipments per request).

**Solution: Chunk Large Batches**
```typescript
const MAX_SHIPMENTS_PER_REQUEST = 100; // Conservative limit

async function schedulePickupWithChunking(
  shiprocket: ShiprocketClient,
  shipmentIds: string[]
): Promise<void> {
  // Split into chunks of 100
  for (let i = 0; i < shipmentIds.length; i += MAX_SHIPMENTS_PER_REQUEST) {
    const chunk = shipmentIds.slice(i, i + MAX_SHIPMENTS_PER_REQUEST);
    
    await shiprocket.post('/courier/generate/pickup', {
      shipment_id: chunk.map(id => parseInt(id, 10)),
    });
    
    // Small delay between chunks to be safe
    await sleep(100); // 100ms
  }
}
```

**Issue 2: Cron Job Timeout**

Processing 5000 orders across multiple couriers might take time.

**Solution: Process Stores in Parallel (Within Limits)**
```typescript
import pLimit from 'p-limit';

const limit = pLimit(10); // Process 10 stores at a time

async function masterPickupCron(): Promise<void> {
  const storeIds = await getStoresWithPendingPickups();
  
  // Process up to 10 stores in parallel
  await Promise.all(
    storeIds.map(storeId => 
      limit(() => processStorePickupQueue(storeId))
    )
  );
}
```

**Issue 3: 5000 Couriers Arriving on Monday**

If 5000 orders → 5000 individual courier visits, that's chaos!

**Reality:** Most stores use 3-5 couriers max.
```
5000 orders typical distribution:
- Delhivery: 2500 orders → 1 courier visit
- Blue Dart: 1500 orders → 1 courier visit
- DTDC: 800 orders → 1 courier visit
- Xpressbees: 200 orders → 1 courier visit

Total: 4 courier visits on Monday morning ✅
```

---

## 6. Large Batch Handling (5000+ Orders)

### Industry-Standard Approach

```typescript
// src/lib/shipping/pickup-scheduler-robust.ts

const CONFIG = {
  MAX_SHIPMENTS_PER_API_CALL: 100,
  MAX_PARALLEL_STORES: 10,
  DELAY_BETWEEN_API_CALLS_MS: 100,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
};

export async function processStorePickupQueueRobust(
  storeId: string,
  settings: PickupScheduleSettings
): Promise<void> {
  const redis = getRedisClient();
  const shiprocket = await getShiprocketClient(storeId);
  
  // Get all queue keys for this store
  const queueKeys = await redis.keys(`pickup:${storeId}:*`);
  
  for (const queueKey of queueKeys) {
    const [, , courierCode] = queueKey.split(':');
    const shipmentIds = await redis.smembers(queueKey);
    
    if (shipmentIds.length === 0) {
      await redis.del(queueKey);
      continue;
    }
    
    console.log(`Processing ${shipmentIds.length} ${courierCode} shipments for store ${storeId}`);
    
    // Chunk if too many shipments
    const chunks = chunkArray(shipmentIds, CONFIG.MAX_SHIPMENTS_PER_API_CALL);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Schedule pickup with retry logic
        await retryWithBackoff(
          () => shiprocket.post('/courier/generate/pickup', {
            shipment_id: chunk.map(id => parseInt(id, 10)),
          }),
          CONFIG.MAX_RETRIES,
          CONFIG.RETRY_DELAY_MS
        );
        
        console.log(`✅ Chunk ${i + 1}/${chunks.length}: ${chunk.length} shipments scheduled`);
        
        // Small delay between chunks
        if (i < chunks.length - 1) {
          await sleep(CONFIG.DELAY_BETWEEN_API_CALLS_MS);
        }
        
      } catch (error) {
        console.error(`❌ Chunk ${i + 1} failed after retries:`, error);
        // Move failed shipments to a "failed" queue for manual review
        await redis.sadd(`pickup_failed:${storeId}:${courierCode}`, ...chunk);
      }
    }
    
    // Clear the queue after all chunks processed
    await redis.del(queueKey);
  }
}

// Helper: Chunk array into smaller arrays
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Helper: Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelay: number
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt + 1} failed:`, error);
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Handling 5000 Orders Example

```
Store X has 5000 orders accumulated over weekend:
- 2500 Delhivery
- 1500 Blue Dart
- 800 DTDC
- 200 Xpressbees

Monday 8 AM Processing:

Delhivery (2500 shipments):
├─ Chunk 1: 100 shipments → API call #1 ✓
├─ Chunk 2: 100 shipments → API call #2 ✓
├─ ... (25 chunks total)
└─ Chunk 25: 100 shipments → API call #25 ✓

Blue Dart (1500 shipments):
├─ Chunk 1: 100 shipments → API call #26 ✓
├─ ... (15 chunks total)
└─ Chunk 15: 100 shipments → API call #40 ✓

DTDC (800 shipments):
├─ Chunk 1-8 → API calls #41-48 ✓

Xpressbees (200 shipments):
├─ Chunk 1-2 → API calls #49-50 ✓

Total: 50 API calls
Time: ~5 seconds (with 100ms delays)
Rate limit: 180/min → 50 calls is fine! ✅
```

---

## 7. Industry-Standard Implementation

### What Big E-commerce Platforms Do

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INDUSTRY-STANDARD PICKUP ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. QUEUE LAYER (Redis/SQS/RabbitMQ)                                       │
│     - Stores pending shipments                                              │
│     - Grouped by tenant + courier + time slot                              │
│     - Fast read/write, temporary storage                                    │
│                                                                             │
│  2. SCHEDULER LAYER (Cron/Cloud Scheduler)                                  │
│     - Runs at fixed intervals                                               │
│     - Checks which stores need processing                                   │
│     - Triggers workers                                                      │
│                                                                             │
│  3. WORKER LAYER (Background Jobs)                                          │
│     - Processes one store at a time                                         │
│     - Handles chunking, retries, rate limiting                             │
│     - Updates database with results                                         │
│                                                                             │
│  4. MONITORING LAYER                                                        │
│     - Queue depth monitoring                                                │
│     - Failed job alerts                                                     │
│     - Rate limit tracking                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Simple vs Production Implementation

**Simple (Good for starting):**
```
Cron → Query Redis → Process all stores sequentially → Done
```

**Production (Scalable):**
```
Cron → Add job to BullMQ per store → Workers process in parallel → Done
```

---

## 8. Alternative: BullMQ (Recommended)

### What is BullMQ?

BullMQ is a **job queue library** built on top of Redis. It handles:
- Job scheduling
- Retries
- Parallel processing
- Failed job tracking
- Rate limiting

### Why BullMQ > Raw Redis?

| Feature | Raw Redis | BullMQ |
|---------|-----------|--------|
| Job Queue | Manual | Built-in |
| Retries | Manual | Built-in |
| Concurrency | Manual | Built-in |
| Failed Jobs | Manual tracking | Dashboard |
| Scheduling | Manual cron | Built-in |
| Monitoring | Build yourself | Bull Board UI |

### BullMQ Implementation

```typescript
// src/lib/queues/pickup-queue.ts

import { Queue, Worker, QueueScheduler } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL!);

// Create the pickup scheduling queue
export const pickupQueue = new Queue('pickup-scheduling', { connection });

// Add recurring job (replaces cron)
await pickupQueue.add(
  'process-all-stores',
  {},
  {
    repeat: {
      pattern: '0 8-20 * * *', // Every hour 8 AM - 8 PM
    },
  }
);

// Worker processes jobs
const worker = new Worker(
  'pickup-scheduling',
  async (job) => {
    if (job.name === 'process-all-stores') {
      // Get all stores with pending pickups
      const storeIds = await getStoresWithPendingPickups();
      
      // Add a job per store (parallel processing)
      await Promise.all(
        storeIds.map(storeId =>
          pickupQueue.add('process-store', { storeId }, {
            attempts: 3, // Retry 3 times
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          })
        )
      );
    }
    
    if (job.name === 'process-store') {
      const { storeId } = job.data;
      await processStorePickupQueue(storeId);
    }
  },
  {
    connection,
    concurrency: 10, // Process 10 stores in parallel
  }
);

// Handle failed jobs
worker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
  // Alert admin, log to monitoring system
});
```

### Bull Board (Visual Dashboard)

```typescript
// src/app/api/admin/queues/route.ts

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();

createBullBoard({
  queues: [new BullMQAdapter(pickupQueue)],
  serverAdapter,
});

// Now you have a visual dashboard showing:
// - Pending jobs
// - Active jobs
// - Completed jobs
// - Failed jobs
// - Job details and logs
```

---

## 9. Implementation for ShopPulse

### Recommended Approach (Start Simple, Scale Later)

**Phase 1: Simple Redis Queue (Current Focus)**
- Use raw Redis with Sets
- Single cron job every hour
- Process stores sequentially with chunking

**Phase 2: Add BullMQ (When Scaling)**
- Replace raw Redis with BullMQ
- Parallel store processing
- Built-in retries and monitoring

### Phase 1 Implementation

```typescript
// src/lib/shipping/pickup-queue.ts

import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

/**
 * Queue a shipment for pickup
 * Called from ALL shipping flows (manual, batch, auto)
 */
export async function queueShipmentForPickup(shipment: {
  shiprocketShipmentId: string;
  storeId: string;
  courierCode: string;
  handoverMethod: 'PICKUP' | 'DROPOFF';
}): Promise<void> {
  // DROPOFF = no pickup scheduling needed
  if (shipment.handoverMethod === 'DROPOFF') {
    return;
  }
  
  const settings = await getStorePickupSettings(shipment.storeId);
  const nextSlot = calculateNextSlot(settings);
  
  const key = `pickup:${shipment.storeId}:${shipment.courierCode}:${nextSlot}`;
  
  await redis.sadd(key, shipment.shiprocketShipmentId);
  await redis.expire(key, 86400); // 24 hour TTL
}

/**
 * Master cron job - runs every hour from 8 AM to 8 PM
 */
export async function processAllPendingPickups(): Promise<void> {
  const currentHour = new Date().getHours();
  
  if (currentHour < 8 || currentHour > 20) {
    console.log('Outside operating hours');
    return;
  }
  
  // Get all unique store IDs from queues
  const keys = await redis.keys('pickup:*');
  const storeIds = [...new Set(keys.map(k => k.split(':')[1]))];
  
  for (const storeId of storeIds) {
    try {
      await processStorePickups(storeId);
    } catch (error) {
      console.error(`Failed to process store ${storeId}:`, error);
      // Continue with other stores
    }
  }
}

async function processStorePickups(storeId: string): Promise<void> {
  const settings = await getStorePickupSettings(storeId);
  
  // Check if this store should be processed now
  if (!shouldProcessNow(settings)) {
    return;
  }
  
  const shiprocket = await getShiprocketClient(storeId);
  const storeKeys = await redis.keys(`pickup:${storeId}:*`);
  
  for (const key of storeKeys) {
    const [, , courierCode] = key.split(':');
    const shipmentIds = await redis.smembers(key);
    
    if (shipmentIds.length === 0) continue;
    
    // Chunk if large
    const chunks = chunkArray(shipmentIds, 100);
    
    for (const chunk of chunks) {
      try {
        await shiprocket.post('/courier/generate/pickup', {
          shipment_id: chunk.map(id => parseInt(id, 10)),
        });
      } catch (error) {
        console.error(`Pickup failed for ${courierCode}:`, error);
        // Don't delete key - will retry next cron
        continue;
      }
    }
    
    // Success - clear queue
    await redis.del(key);
  }
}
```

### Setting Up Redis for ShopPulse

**Option 1: Upstash Redis (Recommended for Vercel)**
```env
# .env
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
```

**Option 2: Railway Redis**
```env
REDIS_URL=redis://default:xxx@xxx.railway.app:6379
```

**Option 3: Local Redis (Development)**
```bash
# docker-compose.redis.yml (you already have this!)
docker-compose -f docker-compose.redis.yml up -d
```

```env
REDIS_URL=redis://localhost:6379
```

### Cron Setup for Vercel

```typescript
// src/app/api/cron/pickup-scheduler/route.ts

import { processAllPendingPickups } from '@/lib/shipping/pickup-queue';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: Request) {
  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  await processAllPendingPickups();
  
  return new Response('OK');
}
```

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/pickup-scheduler",
      "schedule": "0 8-20 * * *"
    }
  ]
}
```

---

## Summary

### Key Takeaways

1. **Redis is perfect for ShopPulse** - Simple, fast, exactly what we need
2. **Multi-tenant is handled by key structure** - `pickup:{storeId}:{courier}:{slot}`
3. **Rate limits are per Shiprocket account** - Stores don't interfere with each other
4. **Large batches are handled by chunking** - 5000 orders → 50 API calls (within limits)
5. **Weekend accumulation works fine** - Monday cron processes all pending orders
6. **Start simple, scale later** - Raw Redis now, BullMQ when you need it

### Implementation Priority

1. ✅ Set up Redis (Upstash for production, local for dev)
2. ✅ Implement queue functions (`queueShipmentForPickup`, `processAllPendingPickups`)
3. ✅ Set up Vercel cron job
4. ✅ Add chunking for large batches
5. ⏳ Add BullMQ when you have 50+ active stores
