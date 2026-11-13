# Pickup Cron Scalability — Part 3: Redis Internals Deep Dive

> **Date:** July 2026  
> **Purpose:** Educational deep dive into Redis data structures and operations used in the pickup queue system.

---

## Table of Contents

1. [Redis SET — How Shipments Are Stored in a Queue](#1-redis-set)
2. [How SADD Actually Works in Memory](#2-sadd-internals)
3. [SMEMBERS: Getting All Members](#3-smembers)
4. [Redis KEYS vs SCAN — The Full Story](#4-keys-vs-scan)
5. [MGET: Multi-Get Pipeline In Depth](#5-mget-deep-dive)
6. [Redis DEL with Multiple Keys](#6-multi-del)
7. [How Queue Keys Are Structured](#7-queue-key-structure)
8. [Redis Memory Layout for Our System](#8-memory-layout)
9. [ioredis Client Connection Model](#9-ioredis-connection)
10. [Redis Single-Threaded Model & Why It Matters](#10-single-threaded)

---

## 1. Redis SET — How Shipments Are Stored in a Queue {#1-redis-set}

### What Is a Redis SET?

A Redis SET is an unordered collection of unique strings. Think of it like a JavaScript `Set<string>` — no duplicates, no ordering.

### How We Use It

Each "pickup queue" is one Redis SET:

```
Key:  "pickup:store_abc123:delhivery:2026-07-15T10:00:00.000Z"
Type: SET
Members: {
  "cm_ship_001",      ← Shipment ID (Prisma CUID)
  "cm_ship_002",
  "cm_ship_003",
  "cm_ship_047",
  ... (could be thousands)
}
```

### SADD: Adding a Shipment to the Queue

When a shipment is ready for pickup, we call:

```typescript
await redis.sadd(queueKey, shipmentId);
// Redis command: SADD "pickup:store_abc:delhivery:2026-07-15T10:00:00.000Z" "cm_ship_001"
```

What happens internally:

```
Before SADD:
┌─────────────────────────────────────────────────┐
│ Key: pickup:store_abc:delhivery:2026-07-15T10:00│
│ Type: SET                                        │
│ Members: { "cm_ship_001", "cm_ship_002" }       │
│ Count: 2                                         │
└─────────────────────────────────────────────────┘

SADD "cm_ship_003":
┌─────────────────────────────────────────────────────────────┐
│ Key: pickup:store_abc:delhivery:2026-07-15T10:00            │
│ Type: SET                                                    │
│ Members: { "cm_ship_001", "cm_ship_002", "cm_ship_003" }   │
│ Count: 3                                                     │
└─────────────────────────────────────────────────────────────┘

SADD "cm_ship_001" again (duplicate):
→ No change! Sets guarantee uniqueness.
→ Returns 0 (already existed) instead of 1 (newly added)
```

### SREM: Removing a Shipment

```typescript
await redis.srem(queueKey, shipmentId);
// Removes one member. O(1) operation.
```

### SCARD: Counting Members

```typescript
const count = await redis.scard(queueKey);
// Returns the number of members. O(1) — Redis tracks this internally.
```

### SISMEMBER: Check if Shipment Exists

```typescript
const exists = await redis.sismember(queueKey, shipmentId);
// Returns 1 (yes) or 0 (no). O(1) — hash table lookup.
```

---

## 2. How SADD Actually Works in Memory {#2-sadd-internals}

### Small Sets: ziplist (< 128 elements, each < 64 bytes)

For small sets, Redis uses a **compact array** called a ziplist (listpack in newer versions). This is a single contiguous block of memory:

```
Memory layout for a small set with 3 members:

[ header | "cm_ship_001" | "cm_ship_002" | "cm_ship_003" | end ]
└──────────── One contiguous memory block ──────────────────┘

Size: ~100 bytes total (very efficient!)
```

ziplist is:
- **Memory efficient**: No pointers, no overhead per element
- **Slow for lookups**: O(N) scan to check existence (but N < 128, so fast enough)
- **Auto-upgraded**: When set grows beyond 128 members → converts to hash table

### Large Sets: Hash Table (≥ 128 elements)

When a set exceeds 128 members (our queues often will), Redis promotes it to a **hash table**:

```
Memory layout for a large set:

HashTable:
┌─────────────────────────────────────────────┐
│ Bucket 0: → "cm_ship_047" → NULL            │
│ Bucket 1: → "cm_ship_001" → "cm_ship_203" → NULL │
│ Bucket 2: → NULL                             │
│ Bucket 3: → "cm_ship_002" → NULL            │
│ ...                                          │
│ Bucket N: → "cm_ship_003" → NULL            │
└─────────────────────────────────────────────┘

Each entry: pointer + string data + hash value
Per member overhead: ~64 bytes (pointer + hash + string allocation)
```

For a set with 3000 members:
- Each member ("cm_ship_XXXXX") ≈ 20 bytes for the string
- Hash table overhead ≈ 64 bytes per entry
- Total: 3000 × 84 bytes ≈ **252 KB per queue**

This is why we don't store metadata in the set — sets only hold the shipment ID strings.

---

## 3. SMEMBERS: Getting All Members {#3-smembers}

When the cron processes a queue, it first gets ALL member IDs:

```typescript
const shipmentIds = await redis.smembers(queueKey);
// Returns: ["cm_ship_001", "cm_ship_002", ..., "cm_ship_3000"]
```

### Internal Process

```
SMEMBERS "pickup:store_abc:delhivery:..."

1. Redis looks up the key in the main hash table → finds SET type
2. Iterator walks every bucket in the hash table
3. Each found member is added to the reply buffer
4. Entire reply sent to client

Time: O(N) where N = number of members
For 3000 members: ~0.1-0.5ms (blazing fast, all in memory)
```

### Why SMEMBERS Is OK (For Now)

SMEMBERS returns ALL members at once — similar to KEYS, it's O(N) and blocks during execution. But:
- It only scans **one set**, not the entire keyspace
- A set with 3000 members takes ~0.3ms
- The keyspace KEYS scan might touch 50,000 keys

For Tier 3 (sorted sets with ZRANGEBYSCORE), we'd use paginated reads. For now, SMEMBERS on a single queue is fast enough.

---

## 4. Redis KEYS vs SCAN — The Full Story {#4-keys-vs-scan}

### KEYS: The Dangerous Command

```
KEYS "pickup:*"

Process:
1. Redis acquires a global lock (single-threaded, so it IS the lock)
2. Iterates EVERY key in the database
3. Tests each key against the pattern "pickup:*"
4. Collects matches
5. Returns all matches in one response
6. Only THEN can Redis process the next command

For a database with 50,000 keys:
- Tests 50,000 keys
- Takes: ~5-20ms
- During this time: ALL other Redis clients wait
```

### SCAN: The Safe Alternative

```
SCAN 0 MATCH "pickup:*" COUNT 100

Process:
1. Redis looks at ~100 hash table buckets (not keys — buckets)
2. Returns matching keys from those buckets + next cursor
3. Client calls SCAN again with next cursor
4. Between SCAN calls, Redis serves OTHER clients normally

For a database with 50,000 keys:
- Each SCAN iteration: ~0.1ms, returns 5-20 keys
- Between iterations: other commands execute
- Total time to scan all: ~5-20ms (same total)
- BUT: no single blocking point
```

### COUNT Is Not a Limit

```
SCAN 0 MATCH "pickup:*" COUNT 100

COUNT 100 means: "Look at ~100 hash table BUCKETS"

A bucket might contain:
- 0 matching keys (bucket has no "pickup:*" keys)
- 1 matching key
- 5 matching keys (hash collision in that bucket)

So COUNT 100 might return 0, 47, 103, or any number of keys.
It's a performance hint for Redis to balance responsiveness vs efficiency.
```

### SCAN Can Return Duplicates

SCAN guarantees:
- ✅ Every key that exists throughout the full scan will be returned at least once
- ✅ No key that doesn't exist will be returned
- ⚠️ Keys might be returned MORE THAN ONCE (if hash table resizes during scan)

For our use case, duplicates are fine — we're building a list of queue keys and processing each. Processing a queue twice is idempotent (SMEMBERS returns same members, scheduling is idempotent).

### When KEYS Is Actually Fine

Redis documentation says "never use KEYS in production." But there are exceptions:
- **Development**: DB has < 100 keys → KEYS is instant
- **Admin tooling**: One-off debugging scripts
- **Dedicated Redis instance**: No other clients affected

Our app is in development with an empty DB. KEYS would work fine. But we use SCAN because:
1. Good habits for production readiness
2. No behavior change needed later
3. Negligible complexity difference

---

## 5. MGET: Multi-Get Pipeline In Depth {#5-mget-deep-dive}

### Network Round-Trip: The Hidden Bottleneck

Every Redis command follows this cycle:

```
Single GET:
Client                           Redis Server
  │                                 │
  │── GET key1 ──────────────────→  │ (network: ~0.5ms)
  │                                 │ (process: ~0.001ms)
  │  ←────────────────── value1 ──  │ (network: ~0.5ms)
  │                                 │
  Total: ~1ms per command
```

For 3000 GETs:
```
Client                           Redis Server
  │── GET key1 ──→ │ ←── val1 ──│  (~1ms)
  │── GET key2 ──→ │ ←── val2 ──│  (~1ms)
  │── GET key3 ──→ │ ←── val3 ──│  (~1ms)
  │    ... 2997 more ...            │
  │── GET key3000 → │ ← val3000 ─│  (~1ms)
  Total: ~3000ms = 3 seconds
```

### MGET: One Round Trip

```
Client                           Redis Server
  │                                 │
  │── MGET key1 key2 ... key3000 →  │ (network: ~0.5ms + bigger packet)
  │                                 │ (process: scan 3000 keys ~0.3ms)
  │  ←── [val1, val2, ..., val3000] │ (network: ~1ms bigger response)
  │                                 │
  Total: ~2-5ms regardless of count
```

### What Happens Inside Redis During MGET

```
MGET "pickup:meta:ship1" "pickup:meta:ship2" "pickup:meta:ship3"

1. Redis receives the command
2. For each key:
   a. Hash the key → find bucket in main hash table → O(1)
   b. If found: read value → add to reply array
   c. If not found: add NULL to reply array
3. Send entire reply array in one response

Time: O(N) where N = number of keys, but NO network overhead per key
```

### MGET vs Pipeline

Redis also supports **pipelining** — sending multiple commands without waiting for responses:

```typescript
// PIPELINE approach (alternative to MGET):
const pipeline = redis.pipeline();
for (const key of metadataKeys) {
  pipeline.get(key);
}
const results = await pipeline.exec();
// → Sends all GETs in one TCP packet, gets all responses back
```

Comparison:
| Aspect | Individual GETs | MGET | Pipeline |
|---|---|---|---|
| Network round-trips | N | 1 | 1 |
| Redis commands | N | 1 | N |
| Server-side processing | N hash lookups | N hash lookups | N hash lookups |
| Response parsing | N responses | 1 array | N responses |
| Atomicity | None | Atomic read | Not atomic |
| Code simplicity | Simple | Simplest | Moderate |

**MGET is preferred** when all operations are GETs because:
- Single command = atomic snapshot (all values from same point in time)
- Slightly less Redis CPU (one command parse vs N)
- Simpler response handling (one array vs pipeline result array)

### MGET Return Value Mapping

```typescript
const keys = ["pickup:meta:ship1", "pickup:meta:ship2", "pickup:meta:ship3"];
const values = await redis.mget(...keys);

// values = ["{ json1 }", null, "{ json3 }"]
//             ↑              ↑        ↑
//           ship1 exists  ship2 gone  ship3 exists
//
// values[i] corresponds to keys[i]
// null means the key doesn't exist (expired? manually deleted? never created?)
```

In our code:
```typescript
for (let i = 0; i < shipmentIds.length; i++) {
  const value = values[i];
  if (value) {
    try {
      result.set(shipmentIds[i], JSON.parse(value));
    } catch {
      // Malformed JSON — skip this shipment's metadata
      // Log warning but don't crash the entire batch
    }
  }
  // If null: shipment has no metadata. Skip it. The cron handles
  // missing metadata by grouping into "unknown" date bucket.
}
```

---

## 6. Redis DEL with Multiple Keys {#6-multi-del}

### Single DEL vs Multi-Key DEL

```
Single DEL:
DEL "pickup:meta:ship1"  → returns 1 (deleted) or 0 (didn't exist)

Multi-key DEL:
DEL "pickup:queue:..." "pickup:meta:ship1" "pickup:meta:ship2" ... "pickup:meta:ship3000"
→ returns count of keys actually deleted
```

Both are single Redis commands. The multi-key version:
1. Iterates through all provided keys
2. Removes each from the hash table
3. Frees the memory
4. Returns total count of keys that existed and were deleted

**Time complexity**: O(N) where N = number of keys × complexity of each key's value
- For simple string values (our metadata): O(1) per key → O(N) total
- For sets/lists: O(M) per key where M = number of elements in the collection

### Our Usage

```typescript
// OLD: 3001 DEL commands, 3001 round-trips
await redis.del(queueKey);
for (const id of shipmentIds) {
  await redis.del(getMetadataKey(id));
}

// NEW: 1 DEL command, 1 round-trip
const keysToDelete = [queueKey, ...shipmentIds.map(id => getMetadataKey(id))];
await redis.del(...keysToDelete);
```

For 3000 shipments: `redis.del(queueKey, "pickup:meta:ship1", "pickup:meta:ship2", ..., "pickup:meta:ship3000")` — sends 3001 key names in one command.

### Is 3001 Keys in One DEL Too Many?

Redis handles this fine. The argument limit is based on available memory for the command buffer. 3001 short strings (~20 chars each) = ~60KB — trivial for Redis.

However, DEL is **blocking**. Deleting 3001 keys freezes Redis for ~1-3ms. For truly large deletes (100,000+ keys), you'd use `UNLINK` instead:

```typescript
// UNLINK: non-blocking DEL (frees memory in background thread)
await redis.unlink(...keysToDelete);
// Returns immediately, memory freed asynchronously
```

For our scale (3000 keys), DEL is fine. UNLINK becomes relevant at 50,000+ keys.

---

## 7. How Queue Keys Are Structured {#7-queue-key-structure}

### Key Design

```
pickup:{storeId}:{courierCode}:{slotTime}
  │        │          │            │
  │        │          │            └─ ISO timestamp: "2026-07-15T10:00:00.000Z"
  │        │          └─ Courier code from Shiprocket: "delhivery", "bluedart", etc.
  │        └─ Store's CUID: "cm_abc123xyz"
  └─ Prefix: identifies this as a pickup queue key
```

Example keys:
```
pickup:cm_store001:delhivery:2026-07-15T10:00:00.000Z
pickup:cm_store001:bluedart:2026-07-15T10:00:00.000Z
pickup:cm_store002:delhivery:2026-07-15T14:00:00.000Z
```

### Metadata Key Design

```
pickup:meta:{shipmentId}
  │      │       │
  │      │       └─ Shipment's CUID: "cm_ship_001"
  │      └─ "meta" distinguishes from queue keys
  └─ Same prefix: allows SCAN "pickup:*" to find both
```

Metadata value (JSON string):
```json
{
  "storeId": "cm_store001",
  "orderId": "cm_order001",
  "pickupDate": "2026-07-15",
  "courierCode": "delhivery",
  "awbCode": "AWB123456789",
  "pickupAddressId": "cm_addr001"
}
```

### Why Separate Metadata Keys?

Why not store metadata directly in the set?

```
Option A (our approach): SET + separate metadata keys
  picker:queue → SET { "ship1", "ship2", "ship3" }
  pickup:meta:ship1 → "{ json }"
  pickup:meta:ship2 → "{ json }"
  pickup:meta:ship3 → "{ json }"

Option B: Hash per queue
  pickup:queue:data → HASH {
    "ship1" → "{ json }",
    "ship2" → "{ json }",
    "ship3" → "{ json }"
  }
```

Option A (our approach) pros:
- Each shipment's metadata is independently accessible
- MGET works across different queues' shipments
- No need to load entire queue's data to read one shipment
- TTL can be set per metadata key

Option B pros:
- Fewer keys (1 hash vs N metadata keys)
- HGETALL gets everything in one call
- Atomic operations on the hash

We chose Option A because metadata needs to be accessible **before** we know which queue the shipment is in (e.g., when checking shipment status from the dashboard).

---

## 8. Redis Memory Layout for Our System {#8-memory-layout}

### Key Count Estimation

For a system with 10 stores, 3 couriers each, 2 slots/day, 100 orders/store/day:

```
Queue keys:     10 stores × 3 couriers × 2 slots = 60 keys
Metadata keys:  10 stores × 100 orders = 1,000 keys
───────────────────────────────────────────────────
Total keys:     ~1,060 keys

Memory per queue key (SET with ~33 members): ~5 KB
Memory per metadata key (JSON string): ~0.5 KB
───────────────────────────────────────────────────
Queue memory:    60 × 5 KB = 300 KB
Metadata memory: 1000 × 0.5 KB = 500 KB
Total:           ~800 KB ≈ less than 1 MB
```

### At Scale (100 stores, 1000 orders each)

```
Queue keys:     100 × 5 × 3 = 1,500 keys
Metadata keys:  100 × 1000 = 100,000 keys
Total keys:     ~101,500

Queue memory:    1,500 × 25 KB = 37.5 MB
Metadata memory: 100,000 × 0.5 KB = 50 MB
Total:           ~87.5 MB
```

Redis on a t3.micro (1GB RAM) can handle this easily. Redis on a t3.medium (4GB) is more than enough for even Tier 3 scale.

---

## 9. ioredis Client Connection Model {#9-ioredis-connection}

### How ioredis Works

Our app uses `ioredis` as the Redis client. When you create a client:

```typescript
import Redis from 'ioredis';
const redis = new Redis('redis://ec2-host:6379');
```

This creates ONE persistent TCP connection to Redis. All commands go through this single connection.

### Is One Connection Enough?

Yes, for most apps. Redis is single-threaded, so even if you send 1000 concurrent commands through 1 connection, Redis processes them one at a time anyway.

```
ioredis (1 connection):            Redis (single-threaded):
  Command 1 ─┐                       Process command 1 → reply
  Command 2 ──┤── [TCP buffer] ──→    Process command 2 → reply
  Command 3 ──┘                       Process command 3 → reply
```

Multiple connections help when:
- Commands have large responses that saturate the TCP buffer
- You need pub/sub (requires separate connection)
- Client-side latency matters more than server throughput

### Our getRedisClient() Pattern

```typescript
let cachedClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!cachedClient) {
    cachedClient = new Redis(process.env.REDIS_URL);
  }
  return cachedClient;
}
```

Singleton pattern — one connection per Node.js process. For Vercel serverless functions, each invocation gets its own process, so each gets its own Redis connection.

On EC2 (long-running Node process), one connection persists for the process lifetime.

---

## 10. Redis Single-Threaded Model & Why It Matters {#10-single-threaded}

### Redis Is (Mostly) Single-Threaded

Redis processes commands on a single thread. This has huge implications:

```
All commands, from ALL connected clients, are processed sequentially:

Thread:
  ← [MGET from cron] [SET from API] [GET from dashboard] [DEL from cleanup] →
         Time ──────────────────────────────────────────────────────→

There is no concurrency INSIDE Redis.
All "parallel" commands from our app are serialized.
```

### Why KEYS Blocks Everything

```
Client A: KEYS "pickup:*"    → Takes 5ms to scan entire keyspace
Client B: GET "cache:user1"  → WAITING (queued behind KEYS)
Client C: SET "session:abc"  → WAITING
Client D: INCR "counter"     → WAITING

After 5ms: KEYS completes
Client B: GET processed → 0.01ms
Client C: SET processed → 0.01ms
Client D: INCR processed → 0.01ms
```

This is why SCAN is important: each SCAN call takes ~0.1ms, then other clients' commands run, then next SCAN call, etc.

### Why This Makes MGET Better Than Individual GETs

It's NOT because MGET runs faster inside Redis. Each GET inside MGET still does the same hash lookup:
- 3000 individual GETs: 3000 hash lookups = same total CPU
- 1 MGET with 3000 keys: 3000 hash lookups = same total CPU

The difference is **network overhead**:
- 3000 GETs: 3000 command parses + 3000 reply constructions + 3000 TCP packets
- 1 MGET: 1 command parse + 1 reply construction + 1 TCP packet (bigger, but 1)

Redis command processing overhead (parsing, reply building) is ~1μs per command. For 3000 commands: ~3ms of just overhead. MGET eliminates this.

### I/O Threading (Redis 6+)

Redis 6 added I/O threading: network read/write can happen on multiple threads, but **command execution** is still single-threaded. This means:
- Large response serialization (like SMEMBERS with 3000 items) uses I/O threads
- But the actual data lookup is still single-threaded
- Atomicity is still guaranteed (no locks needed)

---

## Summary: Redis Operations in Our Codebase

| Operation | Where Used | Command | Time Complexity |
|---|---|---|---|
| Add shipment to queue | `addToPickupQueue()` | SADD | O(1) |
| Add metadata | `addToPickupQueue()` | SET | O(1) |
| Check queue exists | `getReadyQueues()` | SCAN | O(N) total, non-blocking |
| Get all queue members | `processQueue()` | SMEMBERS | O(N) |
| Get all metadata | `getShipmentMetadataBatch()` | MGET | O(N), 1 round-trip |
| Remove shipment | `removeFromPickupQueue()` | SREM, DEL | O(1) each |
| Clear entire queue | `clearQueue()` | DEL (multi-key) | O(N), 1 round-trip |
| Check membership | (dashboard) | SISMEMBER | O(1) |
| Queue size | (dashboard) | SCARD | O(1) |
