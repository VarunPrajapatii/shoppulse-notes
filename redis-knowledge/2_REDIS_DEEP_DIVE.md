# Part 2: Redis Deep Dive

> 📚 **Purpose**: Understand Redis architecture, data structures, commands, and configuration in depth.

---

## Table of Contents

1. [What is Redis?](#what-is-redis)
2. [Redis Architecture](#redis-architecture)
3. [Redis Data Structures](#redis-data-structures)
4. [Essential Redis Commands](#essential-redis-commands)
5. [Redis Persistence](#redis-persistence)
6. [Redis Configuration](#redis-configuration)
7. [Redis Pub/Sub](#redis-pubsub)
8. [Redis Transactions](#redis-transactions)
9. [Redis Pipelining](#redis-pipelining)
10. [Redis Clustering](#redis-clustering)
11. [Redis Best Practices](#redis-best-practices)
12. [Interview Questions](#interview-questions)

---

## What is Redis?

### Definition

**Redis** (Remote Dictionary Server) is an open-source, in-memory data structure store that can be used as:
- **Cache** - Store frequently accessed data
- **Database** - Primary data store for certain use cases
- **Message Broker** - Pub/Sub messaging system
- **Queue** - Job/task queue

### Key Characteristics

| Feature | Description |
|---------|-------------|
| **In-Memory** | Data stored in RAM (fast: microseconds) |
| **Single-Threaded** | One thread handles all commands (atomic operations) |
| **Persistence** | Optional disk storage (RDB, AOF) |
| **Data Structures** | Strings, Lists, Sets, Hashes, Sorted Sets, Streams |
| **Replication** | Master-replica for high availability |
| **Clustering** | Horizontal scaling across multiple nodes |
| **Lua Scripting** | Complex atomic operations |

### Redis vs Other Solutions

```
┌─────────────────────────────────────────────────────────────┐
│                  COMPARISON MATRIX                          │
└─────────────────────────────────────────────────────────────┘

                    Redis       Memcached    MongoDB     PostgreSQL
─────────────────────────────────────────────────────────────────────
Storage             Memory      Memory       Disk        Disk
Speed               ~0.1ms      ~0.1ms       ~1-10ms     ~5-50ms
Data Structures     Rich        Key-Value    Documents   Tables
Persistence         Yes         No           Yes         Yes
Replication         Yes         No           Yes         Yes
Clustering          Yes         Yes          Yes         Yes
Query Language      Commands    Commands     MQL         SQL
Use Case            Cache/DB    Cache only   Database    Database
```

### When to Use Redis

✅ **Good For:**
- Session storage
- Caching API responses
- Real-time leaderboards (Sorted Sets)
- Rate limiting
- Pub/Sub messaging
- Job queues
- Real-time analytics

❌ **Not Good For:**
- Large datasets (limited by RAM)
- Complex queries (joins, aggregations)
- Primary database for critical data (without proper persistence)
- Data larger than available memory

---

## Redis Architecture

### Single Instance Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REDIS SERVER                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │               EVENT LOOP (Single Thread)             │   │
│   │  ┌─────────────────────────────────────────────────┐│   │
│   │  │ 1. Accept connections                           ││   │
│   │  │ 2. Read commands                                ││   │
│   │  │ 3. Execute commands                             ││   │
│   │  │ 4. Write responses                              ││   │
│   │  └─────────────────────────────────────────────────┘│   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                  MEMORY (RAM)                        │   │
│   │  ┌───────────┐ ┌───────────┐ ┌───────────┐          │   │
│   │  │ Database 0│ │ Database 1│ │    ...    │          │   │
│   │  └───────────┘ └───────────┘ └───────────┘          │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              PERSISTENCE (Disk)                      │   │
│   │  ┌─────────────┐    ┌─────────────┐                 │   │
│   │  │  RDB File   │    │  AOF File   │                 │   │
│   │  │ (snapshot)  │    │ (append log)│                 │   │
│   │  └─────────────┘    └─────────────┘                 │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Why Single-Threaded?

Redis uses a single thread for command execution. Why?

1. **No locks needed** - Operations are naturally atomic
2. **Simple architecture** - No race conditions
3. **CPU is rarely the bottleneck** - I/O and memory are usually limits
4. **Efficient I/O** - Uses I/O multiplexing (epoll/kqueue)

**Note:** Redis 6.0+ uses multiple threads for I/O operations, but command execution remains single-threaded.

### Master-Replica Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  MASTER-REPLICA SETUP                        │
└─────────────────────────────────────────────────────────────┘

     Writes                                     Reads
        │                                          │
        ▼                                          ▼
┌───────────────┐     Replication      ┌───────────────┐
│    MASTER     │ ───────────────────► │   REPLICA 1   │
│  (read/write) │                      │  (read-only)  │
└───────────────┘                      └───────────────┘
        │                                          
        │               Replication      ┌───────────────┐
        └─────────────────────────────► │   REPLICA 2   │
                                        │  (read-only)  │
                                        └───────────────┘

Benefits:
- High availability (replica can become master)
- Read scaling (distribute reads across replicas)
- Geographic distribution
```

### Redis Sentinel (High Availability)

```
┌─────────────────────────────────────────────────────────────┐
│                  REDIS SENTINEL                              │
└─────────────────────────────────────────────────────────────┘

    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  Sentinel 1  │  │  Sentinel 2  │  │  Sentinel 3  │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                 │
           │    Monitoring & Voting            │
           ▼                 ▼                 ▼
    ┌──────────────────────────────────────────────────┐
    │                                                   │
    │  ┌─────────┐    ┌─────────┐    ┌─────────┐      │
    │  │ Master  │◄──►│ Replica │◄──►│ Replica │      │
    │  └─────────┘    └─────────┘    └─────────┘      │
    │                                                   │
    └──────────────────────────────────────────────────┘

Sentinel Responsibilities:
1. Monitoring - Check if master/replicas are working
2. Notification - Alert on failures
3. Automatic Failover - Promote replica to master
4. Configuration Provider - Clients discover current master
```

---

## Redis Data Structures

### 1. Strings

The simplest type. Can store text, numbers, or binary data (up to 512MB).

```redis
# Basic operations
SET name "John"              # Set string value
GET name                     # Get value → "John"
APPEND name " Doe"           # Append → "John Doe"
STRLEN name                  # Length → 8

# Numeric operations
SET counter 10
INCR counter                 # Increment → 11
INCRBY counter 5             # Increment by 5 → 16
DECR counter                 # Decrement → 15
INCRBYFLOAT counter 0.5      # Float increment → 15.5

# Expiration
SET session "abc123" EX 3600 # Set with 1 hour TTL
SETEX session 3600 "abc123"  # Same as above
TTL session                  # Time remaining
EXPIRE session 7200          # Change TTL to 2 hours

# Conditional set
SET key "value" NX           # Only if NOT exists
SET key "value" XX           # Only if EXISTS

# Multiple keys
MSET key1 "v1" key2 "v2"     # Set multiple
MGET key1 key2               # Get multiple → ["v1", "v2"]
```

**Use Cases:**
- Caching (JSON stringified)
- Counters (page views, likes)
- Session tokens
- Rate limiting

### 2. Lists

Ordered collection of strings. Implemented as linked list.

```redis
# Add elements
LPUSH tasks "task1"          # Add to left (head)
RPUSH tasks "task2"          # Add to right (tail)
LPUSH tasks "task0"          # List: [task0, task1, task2]

# Get elements
LRANGE tasks 0 -1            # Get all → [task0, task1, task2]
LRANGE tasks 0 1             # Get first 2 → [task0, task1]
LINDEX tasks 0               # Get by index → "task0"
LLEN tasks                   # Length → 3

# Remove elements
LPOP tasks                   # Remove from left → "task0"
RPOP tasks                   # Remove from right → "task2"
LREM tasks 1 "task1"         # Remove 1 occurrence of "task1"

# Blocking operations (for queues)
BLPOP tasks 30               # Block until element available (30s timeout)
BRPOP tasks 30               # Block pop from right

# Trim list
LTRIM tasks 0 99             # Keep only first 100 elements
```

**Use Cases:**
- Message queues (LPUSH + BRPOP)
- Recent activity feed
- Undo/redo stacks

```
List Structure:
┌───────────────────────────────────────────────────┐
│ HEAD                                         TAIL │
│  ↓                                            ↓   │
│ [A] ←→ [B] ←→ [C] ←→ [D] ←→ [E]                  │
│  │                                            │   │
│ LPUSH/LPOP                             RPUSH/RPOP │
└───────────────────────────────────────────────────┘
```

### 3. Sets

Unordered collection of unique strings.

```redis
# Add elements
SADD users "alice"           # Add single
SADD users "bob" "charlie"   # Add multiple
SADD users "alice"           # Duplicate ignored → 0

# Get elements
SMEMBERS users               # Get all → ["alice", "bob", "charlie"]
SISMEMBER users "alice"      # Check membership → 1 (true)
SCARD users                  # Count → 3

# Remove elements
SREM users "bob"             # Remove specific
SPOP users                   # Remove random

# Set operations
SADD set1 "a" "b" "c"
SADD set2 "b" "c" "d"

SUNION set1 set2             # Union → [a, b, c, d]
SINTER set1 set2             # Intersection → [b, c]
SDIFF set1 set2              # Difference → [a]

# Random elements
SRANDMEMBER users            # Get random without removing
SRANDMEMBER users 2          # Get 2 random members
```

**Use Cases:**
- Tags
- Unique visitors
- Friend lists (mutual friends = SINTER)
- Online users

### 4. Hashes

Field-value pairs (like objects/dictionaries).

```redis
# Set fields
HSET user:1 name "John"      # Set single field
HSET user:1 email "john@example.com" age 30
HMSET user:1 city "NYC" country "USA"  # Set multiple (deprecated, use HSET)

# Get fields
HGET user:1 name             # Get single → "John"
HMGET user:1 name email      # Get multiple → ["John", "john@example.com"]
HGETALL user:1               # Get all → {name: "John", email: "...", ...}

# Check existence
HEXISTS user:1 name          # → 1 (true)
HKEYS user:1                 # Get all keys → [name, email, age, ...]
HVALS user:1                 # Get all values → ["John", "john@...", ...]
HLEN user:1                  # Count fields → 5

# Increment
HINCRBY user:1 age 1         # Increment age → 31
HINCRBYFLOAT user:1 balance 10.50

# Delete
HDEL user:1 city             # Delete field
```

**Use Cases:**
- User profiles
- Product details
- Configuration objects
- Counters per field

```
Hash Structure:
┌─────────────────────────────────────────────────┐
│ user:1                                          │
│ ┌──────────────────────────────────────────────┐│
│ │ name     → "John"                            ││
│ │ email    → "john@example.com"                ││
│ │ age      → "30"                              ││
│ │ city     → "NYC"                             ││
│ └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### 5. Sorted Sets (ZSets)

Like Sets, but each member has a score for ordering.

```redis
# Add with scores
ZADD leaderboard 100 "alice"
ZADD leaderboard 85 "bob" 120 "charlie"

# Get by rank (lowest to highest score)
ZRANGE leaderboard 0 -1                # → [bob, alice, charlie]
ZRANGE leaderboard 0 -1 WITHSCORES     # → [bob, 85, alice, 100, charlie, 120]

# Get by reverse rank (highest to lowest)
ZREVRANGE leaderboard 0 -1             # → [charlie, alice, bob]

# Get by score range
ZRANGEBYSCORE leaderboard 80 100       # Scores 80-100 → [bob, alice]
ZRANGEBYSCORE leaderboard 80 100 WITHSCORES

# Get rank
ZRANK leaderboard "alice"              # Rank (0-indexed) → 1
ZREVRANK leaderboard "alice"           # Reverse rank → 1 (2nd highest)

# Get score
ZSCORE leaderboard "alice"             # → 100

# Update score
ZINCRBY leaderboard 10 "bob"           # bob: 85 + 10 = 95

# Count
ZCARD leaderboard                      # Total members → 3
ZCOUNT leaderboard 80 100              # Members with score 80-100 → 2

# Remove
ZREM leaderboard "bob"                 # Remove specific
ZREMRANGEBYRANK leaderboard 0 0        # Remove lowest score
ZREMRANGEBYSCORE leaderboard 0 50      # Remove scores 0-50
```

**Use Cases:**
- Leaderboards
- Priority queues
- Time-series data (score = timestamp)
- Rate limiting (score = timestamp)

```
Sorted Set Structure:
┌─────────────────────────────────────────────────┐
│ leaderboard                                     │
│ ┌──────────────────────────────────────────────┐│
│ │ Score    Member                              ││
│ │ 85       bob        (rank 0)                 ││
│ │ 100      alice      (rank 1)                 ││
│ │ 120      charlie    (rank 2)                 ││
│ └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### 6. Streams (Redis 5.0+)

Append-only log structure for event streaming.

```redis
# Add entries
XADD mystream * name "John" action "login"
# Returns entry ID like "1609459200000-0"

# Read entries
XRANGE mystream - +                     # All entries
XRANGE mystream - + COUNT 10            # First 10
XREAD COUNT 2 STREAMS mystream 0        # Read from start

# Consumer groups
XGROUP CREATE mystream mygroup 0        # Create group
XREADGROUP GROUP mygroup consumer1 COUNT 1 STREAMS mystream >  # Read new
XACK mystream mygroup "1609459200000-0" # Acknowledge

# Info
XLEN mystream                           # Length
XINFO STREAM mystream                   # Stream info
```

**Use Cases:**
- Event sourcing
- Activity feeds
- Log aggregation
- Real-time messaging

### Data Structure Summary

| Structure | Ordered | Unique | Score | Best For |
|-----------|---------|--------|-------|----------|
| String | N/A | N/A | N/A | Simple values, counters |
| List | Yes (insertion) | No | No | Queues, stacks |
| Set | No | Yes | No | Tags, unique items |
| Hash | No | Keys unique | No | Objects, profiles |
| Sorted Set | Yes (by score) | Yes | Yes | Leaderboards, ranking |
| Stream | Yes (by ID) | Yes | No | Event logs, messaging |

---

## Essential Redis Commands

### Key Management

```redis
# Key operations
KEYS pattern                 # Find keys (use SCAN in production)
SCAN 0 MATCH "user:*"        # Iterate keys (non-blocking)
EXISTS key                   # Check if exists
TYPE key                     # Get type
RENAME key newkey            # Rename
DEL key                      # Delete (blocking)
UNLINK key                   # Delete (non-blocking, async)

# Expiration
EXPIRE key 3600              # Set TTL (seconds)
PEXPIRE key 3600000          # Set TTL (milliseconds)
EXPIREAT key 1735689600      # Set expiration timestamp
TTL key                      # Get remaining TTL
PTTL key                     # TTL in milliseconds
PERSIST key                  # Remove expiration
```

### KEYS vs SCAN

```redis
# KEYS - Dangerous in production!
# Blocks Redis until all keys are scanned
KEYS "user:*"                # DON'T use in production

# SCAN - Safe alternative
# Iterates in batches, doesn't block
SCAN 0 MATCH "user:*" COUNT 100
# Returns [cursor, [keys]]
# Repeat with returned cursor until cursor is "0"
```

**SCAN in Node.js:**
```typescript
async function scanKeys(pattern: string): Promise<string[]> {
  const client = getRedisClient();
  let cursor = '0';
  const keys: string[] = [];
  
  do {
    const [nextCursor, foundKeys] = await client.scan(
      cursor, 
      'MATCH', pattern, 
      'COUNT', 100
    );
    cursor = nextCursor;
    keys.push(...foundKeys);
  } while (cursor !== '0');
  
  return keys;
}
```

### Atomic Operations

```redis
# SETNX - Set if Not eXists
SETNX lock "process_1"       # Returns 1 if set, 0 if exists

# SET with options (Redis 2.6.12+)
SET key value NX EX 30       # Set if not exists, with 30s TTL

# GETSET - Get old value and set new (deprecated, use GETEX)
GETSET counter 0             # Reset and get old value

# GETEX - Get with expiration options (Redis 6.2+)
GETEX key EX 3600            # Get and set TTL

# GETDEL - Get and delete
GETDEL key                   # Atomic get + delete
```

---

## Redis Persistence

Redis offers two persistence mechanisms:

### 1. RDB (Redis Database)

Point-in-time snapshots of the dataset.

```
┌─────────────────────────────────────────────────────────────┐
│                      RDB PERSISTENCE                         │
└─────────────────────────────────────────────────────────────┘

Time: 00:00  │  00:15  │  00:30  │  00:45  │  01:00
             │         │         │         │
    ─────────┼─────────┼─────────┼─────────┼────────►
             │         │         │         │
          Snapshot  Snapshot  Snapshot  Snapshot
             │         │         │         │
             ▼         ▼         ▼         ▼
         dump.rdb  dump.rdb  dump.rdb  dump.rdb
         
Data Loss Window: Up to 15 minutes between snapshots
```

**Configuration:**
```conf
# redis.conf
save 900 1      # Snapshot if 1 key changed in 900 seconds
save 300 10     # Snapshot if 10 keys changed in 300 seconds
save 60 10000   # Snapshot if 10000 keys changed in 60 seconds

dbfilename dump.rdb
dir /var/lib/redis
```

**Commands:**
```redis
BGSAVE                       # Background save
SAVE                         # Blocking save (avoid in production)
LASTSAVE                     # Timestamp of last save
```

**Pros:**
- Compact single file (good for backups)
- Fast restarts (binary format)
- Good for disaster recovery

**Cons:**
- Data loss between snapshots
- Fork() can be slow with large datasets

### 2. AOF (Append Only File)

Log of every write operation.

```
┌─────────────────────────────────────────────────────────────┐
│                      AOF PERSISTENCE                         │
└─────────────────────────────────────────────────────────────┘

Every write command is appended to AOF file:

┌─────────────────────────────────────────────────────────────┐
│ appendonly.aof                                              │
├─────────────────────────────────────────────────────────────┤
│ *3                                                          │
│ $3                                                          │
│ SET                                                         │
│ $4                                                          │
│ name                                                        │
│ $4                                                          │
│ John                                                        │
│ *3                                                          │
│ $3                                                          │
│ SET                                                         │
│ $5                                                          │
│ email                                                       │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

**Configuration:**
```conf
# redis.conf
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec         # Options: always, everysec, no

# AOF rewrite (compaction)
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

**Fsync Options:**
| Option | Durability | Performance |
|--------|------------|-------------|
| `always` | Best (no data loss) | Slowest |
| `everysec` | Good (max 1s loss) | Balanced ⭐ |
| `no` | Worst (OS decides) | Fastest |

**Commands:**
```redis
BGREWRITEAOF                 # Compact AOF file in background
```

**Pros:**
- Better durability (less data loss)
- Append-only (less corruption risk)
- Human-readable (can edit)

**Cons:**
- Larger file size
- Slower restarts (replays all commands)

### Hybrid Persistence (Redis 4.0+)

Combines RDB + AOF for best of both worlds.

```conf
aof-use-rdb-preamble yes
```

```
┌─────────────────────────────────────────────────────────────┐
│ appendonly.aof with RDB preamble                            │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────┐                         │
│ │ RDB Snapshot (binary)           │  Fast startup          │
│ └─────────────────────────────────┘                         │
│ ┌─────────────────────────────────┐                         │
│ │ AOF Commands (text)             │  Commands since RDB    │
│ │ SET key1 value1                 │                         │
│ │ INCR counter                    │                         │
│ └─────────────────────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Persistence Comparison

| Aspect | RDB | AOF | Hybrid |
|--------|-----|-----|--------|
| Data Loss | Minutes | 1 second | 1 second |
| File Size | Smaller | Larger | Moderate |
| Startup Time | Fast | Slower | Fast |
| Write Performance | Better | Depends on fsync | Moderate |
| Backup | Easy | Harder | Easy |

### Recommendation

For most applications:
```conf
# Use hybrid persistence
appendonly yes
appendfsync everysec
aof-use-rdb-preamble yes
save 900 1
```

---

## Redis Configuration

### Important Configuration Options

```conf
# Network
bind 127.0.0.1               # Listen address (bind to localhost for security)
port 6379                    # Default port
protected-mode yes           # Require authentication if no bind address
requirepass yourpassword     # Set password

# Memory
maxmemory 256mb              # Maximum memory limit
maxmemory-policy allkeys-lru # Eviction policy when memory full

# Persistence
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice              # Options: debug, verbose, notice, warning
logfile /var/log/redis/redis.log

# Clients
maxclients 10000             # Maximum concurrent connections
timeout 0                    # Client timeout (0 = no timeout)

# Slow log
slowlog-log-slower-than 10000  # Log queries slower than 10ms
slowlog-max-len 128            # Keep 128 slow queries
```

### Memory Management

```
┌─────────────────────────────────────────────────────────────┐
│                  MEMORY EVICTION POLICIES                    │
└─────────────────────────────────────────────────────────────┘

maxmemory-policy options:
─────────────────────────────────────────────────────────────

noeviction     │ Return error when memory limit reached
               │ Best for: When data loss is unacceptable
─────────────────────────────────────────────────────────────
allkeys-lru    │ Remove least recently used keys
               │ Best for: General caching ⭐
─────────────────────────────────────────────────────────────
allkeys-lfu    │ Remove least frequently used keys
               │ Best for: When some keys are always hot
─────────────────────────────────────────────────────────────
volatile-lru   │ LRU only on keys with TTL
               │ Best for: Mix of cached and persistent data
─────────────────────────────────────────────────────────────
volatile-lfu   │ LFU only on keys with TTL
               │ Best for: Mix with frequency-based eviction
─────────────────────────────────────────────────────────────
volatile-ttl   │ Remove keys with shortest TTL
               │ Best for: When TTL indicates importance
─────────────────────────────────────────────────────────────
allkeys-random │ Remove random keys
volatile-random│ Remove random keys with TTL
               │ Best for: When all keys are equally important
```

### Checking Memory Usage

```redis
INFO memory                  # Memory stats
MEMORY USAGE key             # Memory for specific key
MEMORY DOCTOR                # Memory recommendations
DBSIZE                       # Number of keys
```

---

## Redis Pub/Sub

### Publish/Subscribe Messaging

```
┌─────────────────────────────────────────────────────────────┐
│                      PUB/SUB PATTERN                         │
└─────────────────────────────────────────────────────────────┘

                        ┌──────────────┐
                        │   Channel:   │
      Publisher ───────►│   "news"     │───────► Subscriber 1
                        └──────────────┘───────► Subscriber 2
                                       ───────► Subscriber 3
```

**Commands:**
```redis
# Publisher
PUBLISH news "Breaking: Redis is awesome!"

# Subscriber
SUBSCRIBE news               # Subscribe to channel
PSUBSCRIBE news:*            # Pattern subscribe
UNSUBSCRIBE news             # Unsubscribe
```

**Node.js Example:**
```typescript
import Redis from 'ioredis';

// Subscriber (needs dedicated connection)
const subscriber = new Redis();
subscriber.subscribe('orders', (err, count) => {
  console.log(`Subscribed to ${count} channels`);
});

subscriber.on('message', (channel, message) => {
  console.log(`Received on ${channel}: ${message}`);
});

// Publisher (can use any connection)
const publisher = new Redis();
await publisher.publish('orders', JSON.stringify({ orderId: '123' }));
```

**Use Cases:**
- Real-time notifications
- Cache invalidation across servers
- Chat applications
- Live updates

**Limitations:**
- No message persistence (if subscriber is offline, message is lost)
- No acknowledgment (fire-and-forget)
- For reliable messaging, use Redis Streams instead

---

## Redis Transactions

### MULTI/EXEC

Execute multiple commands atomically.

```redis
MULTI                        # Start transaction
SET key1 "value1"            # Queued
SET key2 "value2"            # Queued
INCR counter                 # Queued
EXEC                         # Execute all atomically

# Or abort
MULTI
SET key1 "value1"
DISCARD                      # Abort transaction
```

### WATCH (Optimistic Locking)

Abort transaction if watched key changes.

```redis
WATCH balance                # Watch key
val = GET balance
MULTI
DECRBY balance 50
EXEC                         # Fails if balance changed

# Returns nil if WATCH failed
```

**Node.js Example:**
```typescript
async function transferMoney(from: string, to: string, amount: number) {
  const client = getRedisClient();
  
  // Watch for changes
  await client.watch(`balance:${from}`);
  
  const balance = parseInt(await client.get(`balance:${from}`) || '0');
  
  if (balance < amount) {
    await client.unwatch();
    throw new Error('Insufficient balance');
  }
  
  // Execute transaction
  const result = await client
    .multi()
    .decrby(`balance:${from}`, amount)
    .incrby(`balance:${to}`, amount)
    .exec();
  
  if (result === null) {
    throw new Error('Transaction failed, retry');
  }
  
  return result;
}
```

### Limitations

- Redis transactions are NOT like SQL transactions
- No rollback on error (partially executed)
- Commands are queued, not executed until EXEC
- All commands succeed or fail together based on WATCH

---

## Redis Pipelining

Send multiple commands without waiting for each response.

```
┌─────────────────────────────────────────────────────────────┐
│                WITHOUT PIPELINING                            │
└─────────────────────────────────────────────────────────────┘

Client              Network              Redis
  │                                        │
  │────── SET key1 ─────────────────────►  │
  │◄───── OK ────────────────────────────  │
  │────── SET key2 ─────────────────────►  │
  │◄───── OK ────────────────────────────  │
  │────── SET key3 ─────────────────────►  │
  │◄───── OK ────────────────────────────  │

Time: 3 × RTT (Round Trip Time)


┌─────────────────────────────────────────────────────────────┐
│                 WITH PIPELINING                              │
└─────────────────────────────────────────────────────────────┘

Client              Network              Redis
  │                                        │
  │────── SET key1 ─────────────────────►  │
  │────── SET key2 ─────────────────────►  │
  │────── SET key3 ─────────────────────►  │
  │◄───── OK ────────────────────────────  │
  │◄───── OK ────────────────────────────  │
  │◄───── OK ────────────────────────────  │

Time: 1 × RTT (all commands in one round trip)
```

**Node.js Example:**
```typescript
// Without pipeline - 100 network round trips
for (let i = 0; i < 100; i++) {
  await redis.set(`key:${i}`, `value:${i}`);
}

// With pipeline - 1 network round trip
const pipeline = redis.pipeline();
for (let i = 0; i < 100; i++) {
  pipeline.set(`key:${i}`, `value:${i}`);
}
const results = await pipeline.exec();
// results = [[null, 'OK'], [null, 'OK'], ...]
```

**Pipeline vs Transaction:**
| Aspect | Pipeline | Transaction (MULTI) |
|--------|----------|---------------------|
| Atomicity | No | Yes |
| Isolation | No | Yes |
| Use Case | Batch operations | Atomic operations |
| Performance | Very fast | Fast |

---

## Redis Clustering

### Redis Cluster Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REDIS CLUSTER                             │
└─────────────────────────────────────────────────────────────┘

Data is partitioned using 16384 hash slots:

┌─────────────────────────────────────────────────────────────┐
│  Node 1 (Master)   │  Node 2 (Master)   │  Node 3 (Master)  │
│  Slots: 0-5460     │  Slots: 5461-10922 │  Slots: 10923-16383│
├────────────────────┼────────────────────┼───────────────────┤
│  Node 4 (Replica)  │  Node 5 (Replica)  │  Node 6 (Replica) │
│  Replicates Node 1 │  Replicates Node 2 │  Replicates Node 3│
└────────────────────┴────────────────────┴───────────────────┘

Hash slot calculation:
CRC16(key) % 16384 = slot number

Example:
CRC16("user:1000") % 16384 = 12345 → Node 3
```

### Hash Tags

Force related keys to same slot:

```redis
# These may go to different nodes
SET user:1000 "data"
SET user:1000:profile "profile"
SET user:1000:settings "settings"

# Hash tags ensure same slot (only {user:1000} is hashed)
SET {user:1000} "data"
SET {user:1000}:profile "profile"
SET {user:1000}:settings "settings"
```

### Cluster vs Sentinel

| Aspect | Sentinel | Cluster |
|--------|----------|---------|
| Purpose | High availability | Scalability + HA |
| Data distribution | Single master | Partitioned |
| Scaling | Vertical only | Horizontal |
| Complexity | Lower | Higher |
| Use Case | Small-medium datasets | Large datasets |

---

## Redis Best Practices

### 1. Key Naming Conventions

```
# Good: Use colons as separators
user:1000:profile
store:abc123:products
session:xyz789

# Good: Be descriptive
cart:user:1000:items
cache:api:products:featured

# Bad: Too generic
data
temp
x
```

### 2. TTL Everything

```typescript
// Always set TTL for cache data
await redis.setex(key, 1800, data);  // 30 minutes

// Don't do this (data stays forever)
await redis.set(key, data);
```

### 3. Use Appropriate Data Structures

```
❌ Bad: Storing object as JSON string
SET user:1000 '{"name":"John","email":"john@example.com"}'

✅ Good: Use Hash for objects (can update individual fields)
HSET user:1000 name "John" email "john@example.com"
```

### 4. Avoid Large Keys/Values

| Metric | Recommendation |
|--------|----------------|
| Key size | < 1KB |
| String value | < 100KB |
| List/Set/Hash | < 10,000 elements |
| Total key size | < 512MB (hard limit) |

### 5. Use SCAN Instead of KEYS

```typescript
// ❌ Bad: KEYS blocks Redis
const keys = await redis.keys('user:*');

// ✅ Good: SCAN is non-blocking
let cursor = '0';
const keys: string[] = [];
do {
  const [next, found] = await redis.scan(cursor, 'MATCH', 'user:*');
  cursor = next;
  keys.push(...found);
} while (cursor !== '0');
```

### 6. Use Pipeline for Bulk Operations

```typescript
// ❌ Bad: 1000 network round trips
for (const item of items) {
  await redis.set(item.key, item.value);
}

// ✅ Good: 1 network round trip
const pipeline = redis.pipeline();
for (const item of items) {
  pipeline.set(item.key, item.value);
}
await pipeline.exec();
```

### 7. Connection Pooling

```typescript
// ❌ Bad: Creating connection per request
async function getData() {
  const redis = new Redis();  // New connection!
  const data = await redis.get('key');
  redis.disconnect();
  return data;
}

// ✅ Good: Reuse connection (singleton)
const redis = new Redis();  // One connection

async function getData() {
  return redis.get('key');
}
```

### 8. Handle Connection Errors

```typescript
const redis = new Redis({
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;  // Retry with backoff
  },
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});
```

---

## Interview Questions

### Basic Level

**Q1: What is Redis? What are its main use cases?**
> Redis is an in-memory data structure store used as cache, database, and message broker. Main use cases: caching, session storage, real-time analytics, leaderboards, pub/sub messaging.

**Q2: What data structures does Redis support?**
> Strings, Lists, Sets, Hashes, Sorted Sets, Streams, Bitmaps, HyperLogLogs.

**Q3: What is the difference between SET and SETEX?**
> SET stores a value. SETEX stores a value with TTL (expiration time).

### Intermediate Level

**Q4: Explain Redis persistence options.**
> RDB: Point-in-time snapshots, smaller files, faster restarts.
> AOF: Append-only log, better durability, larger files.
> Hybrid: RDB preamble + AOF for best of both.

**Q5: What is the difference between DEL and UNLINK?**
> DEL is blocking (waits until key is deleted).
> UNLINK is non-blocking (marks for async deletion).

**Q6: Why is Redis single-threaded? Is it a problem?**
> Single-threaded for simplicity and atomic operations. Not a problem because Redis is I/O bound, not CPU bound. Redis 6.0+ uses multi-threading for I/O.

### Advanced Level

**Q7: Explain Redis Cluster and hash slots.**
> Redis Cluster partitions data across multiple nodes using 16384 hash slots. CRC16(key) % 16384 determines slot. Hash tags can force keys to same slot.

**Q8: What is cache stampede? How does Redis help prevent it?**
> Cache stampede: Many requests hit database when cache expires. Prevention: SET NX for locking, probabilistic early expiration, or use distributed locks.

**Q9: Design a rate limiter using Redis.**
```typescript
async function isRateLimited(userId: string, limit: number, windowSec: number) {
  const key = `ratelimit:${userId}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, windowSec);
  }
  
  return current > limit;
}
```

---

## Summary

| Concept | Key Points |
|---------|------------|
| **Redis** | In-memory data store, single-threaded, fast |
| **Data Structures** | Strings, Lists, Sets, Hashes, Sorted Sets, Streams |
| **Persistence** | RDB (snapshots), AOF (log), Hybrid |
| **Commands** | SET, GET, EXPIRE, DEL, SCAN, PIPELINE |
| **Transactions** | MULTI/EXEC, WATCH for optimistic locking |
| **Pub/Sub** | Real-time messaging, no persistence |
| **Cluster** | 16384 hash slots, horizontal scaling |

---

**Next: [Part 3 - Node.js + Redis Integration](./3_NODEJS_REDIS_INTEGRATION.md)**
