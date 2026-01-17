# Part 3: Node.js + Redis Integration

> 📚 **Purpose**: Learn how to integrate Redis with Node.js applications using ioredis, with practical patterns and best practices.

---

## Table of Contents

1. [Redis Client Libraries](#redis-client-libraries)
2. [Setting Up ioredis](#setting-up-ioredis)
3. [Connection Management](#connection-management)
4. [Basic Operations](#basic-operations)
5. [Working with Data Structures](#working-with-data-structures)
6. [Pipelining in Node.js](#pipelining-in-nodejs)
7. [Transactions in Node.js](#transactions-in-nodejs)
8. [Pub/Sub in Node.js](#pubsub-in-nodejs)
9. [Error Handling](#error-handling)
10. [Caching Patterns](#caching-patterns)
11. [TypeScript Integration](#typescript-integration)
12. [Testing Redis Code](#testing-redis-code)
13. [Performance Optimization](#performance-optimization)
14. [Common Pitfalls](#common-pitfalls)

---

## Redis Client Libraries

### Popular Node.js Redis Clients

| Library | Stars | Pros | Cons |
|---------|-------|------|------|
| **ioredis** ⭐ | 13k+ | Full-featured, Cluster support, Lua scripting | Slightly larger bundle |
| **redis** (node-redis) | 16k+ | Official, simple API | Less features than ioredis |
| **@redis/client** | - | Modern, Promise-native | Newer, less examples |

### Why ioredis?

```
✅ Full TypeScript support
✅ Cluster & Sentinel support
✅ Built-in Promise API
✅ Pipeline & Transaction support
✅ Auto-reconnection
✅ Lua scripting
✅ Connection pooling
✅ Pub/Sub
✅ Streams support
✅ Active maintenance
```

### Installation

```bash
# Install ioredis
npm install ioredis

# TypeScript types included, but if needed:
npm install --save-dev @types/ioredis
```

---

## Setting Up ioredis

### Basic Connection

```typescript
import Redis from 'ioredis';

// Method 1: Default connection (localhost:6379)
const redis = new Redis();

// Method 2: Connection URL
const redis = new Redis('redis://localhost:6379');

// Method 3: With password
const redis = new Redis('redis://:password@localhost:6379');

// Method 4: Configuration object
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'your-password',
  db: 0,  // Database index (0-15)
});

// Method 5: TLS/SSL connection
const redis = new Redis({
  host: 'redis.example.com',
  port: 6380,
  tls: {
    rejectUnauthorized: false,  // For self-signed certs
  },
});
```

### Connection URL Format

```
redis://[[username:]password@]host[:port][/database]

Examples:
redis://localhost:6379
redis://:mypassword@redis.example.com:6379
redis://default:mypassword@redis.example.com:6379/0
rediss://redis.example.com:6380  # TLS (note the 's')
```

### Configuration Options

```typescript
const redis = new Redis({
  // Connection
  host: 'localhost',
  port: 6379,
  password: undefined,
  db: 0,
  
  // Connection timeouts
  connectTimeout: 10000,      // 10 seconds to connect
  commandTimeout: 5000,       // 5 seconds per command
  
  // Reconnection
  retryStrategy(times) {
    // Return delay in ms, or null to stop retrying
    const delay = Math.min(times * 100, 3000);
    console.log(`Retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: 3,    // Max retries per command
  
  // Reconnect on specific errors
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET'];
    return targetErrors.some(e => err.message.includes(e));
  },
  
  // Offline queue (buffer commands while disconnected)
  enableOfflineQueue: true,   // Default: true
  
  // Lazy connect (connect on first command)
  lazyConnect: false,         // Default: false
  
  // Keep alive
  keepAlive: 10000,           // TCP keepalive (ms)
  
  // Auto resend unfulfilled commands after reconnect
  autoResendUnfulfilledCommands: true,
  
  // Read-only mode (for replicas)
  readOnly: false,
  
  // Name (for CLIENT LIST)
  name: 'my-app',
});
```

### Singleton Pattern (Recommended)

```typescript
// src/lib/redis.ts
import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
    lazyConnect: true,  // Don't connect until first command
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redisClient.on('error', (err) => {
    console.error('❌ Redis error:', err.message);
  });

  return redisClient;
}

// For graceful shutdown
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Default export for convenience
export default getRedisClient;
```

---

## Connection Management

### Connection Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                CONNECTION LIFECYCLE                          │
└─────────────────────────────────────────────────────────────┘

    new Redis()
         │
         ▼
    ┌─────────┐
    │ connect │ ──────────────────────────────────────┐
    └────┬────┘                                       │
         │                                            │
         ▼ (success)                                  │
    ┌─────────┐                                       │
    │  ready  │ ◄─────────────────────────────┐      │
    └────┬────┘                               │      │
         │                                    │      │
         │ (network error)                    │      │
         ▼                                    │      │
    ┌─────────┐                               │      │
    │  close  │                               │      │
    └────┬────┘                               │      │
         │                                    │      │
         ▼                                    │      │
    ┌──────────────┐                          │      │
    │ reconnecting │ ─────────────────────────┘      │
    └──────┬───────┘                                 │
           │ (max retries exceeded)                  │
           ▼                                         │
    ┌─────────┐                                      │
    │   end   │ ◄────────────────────────────────────┘
    └─────────┘   (quit() called or retries exhausted)
```

### Event Listeners

```typescript
const redis = new Redis();

// Connection established
redis.on('connect', () => {
  console.log('Connected to Redis server');
});

// Client is ready to accept commands
redis.on('ready', () => {
  console.log('Redis client ready');
});

// Connection closed
redis.on('close', () => {
  console.log('Redis connection closed');
});

// Attempting to reconnect
redis.on('reconnecting', () => {
  console.log('Reconnecting to Redis...');
});

// Error occurred
redis.on('error', (err) => {
  console.error('Redis error:', err);
});

// Connection ended (won't reconnect)
redis.on('end', () => {
  console.log('Redis connection ended');
});

// Wait for connection (useful for startup)
redis.on('wait', () => {
  console.log('Waiting for Redis connection...');
});
```

### Health Check

```typescript
async function isRedisHealthy(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    return false;
  }
}

// Express health check endpoint
app.get('/health', async (req, res) => {
  const redisHealthy = await isRedisHealthy();
  
  res.json({
    status: redisHealthy ? 'healthy' : 'unhealthy',
    redis: redisHealthy ? 'connected' : 'disconnected',
  });
});
```

### Graceful Shutdown

```typescript
// Next.js / Node.js graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  await closeRedisConnection();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  await closeRedisConnection();
  
  process.exit(0);
});
```

---

## Basic Operations

### String Operations

```typescript
const redis = getRedisClient();

// SET and GET
await redis.set('name', 'John');
const name = await redis.get('name');  // 'John'

// SET with options
await redis.set('key', 'value', 'EX', 3600);           // TTL 1 hour
await redis.set('key', 'value', 'PX', 3600000);        // TTL in ms
await redis.set('key', 'value', 'NX');                 // Only if NOT exists
await redis.set('key', 'value', 'XX');                 // Only if EXISTS
await redis.set('key', 'value', 'EX', 3600, 'NX');     // Combined

// SETEX (shorthand for SET with EX)
await redis.setex('session', 3600, 'session_data');

// SETNX (SET if Not eXists)
const wasSet = await redis.setnx('lock', '1');  // 1 if set, 0 if exists

// GET and SET in one operation
const oldValue = await redis.getset('counter', '0');  // Returns old value

// Multiple keys
await redis.mset('key1', 'value1', 'key2', 'value2');
const values = await redis.mget('key1', 'key2');  // ['value1', 'value2']

// Increment/Decrement
await redis.set('counter', '10');
await redis.incr('counter');          // 11
await redis.incrby('counter', 5);     // 16
await redis.decr('counter');          // 15
await redis.decrby('counter', 3);     // 12
await redis.incrbyfloat('counter', 0.5);  // 12.5

// String operations
await redis.append('name', ' Doe');    // 'John Doe'
const length = await redis.strlen('name');  // 8

// Get substring
const sub = await redis.getrange('name', 0, 3);  // 'John'
```

### Key Operations

```typescript
// Check if key exists
const exists = await redis.exists('key');  // 1 or 0

// Multiple keys
const count = await redis.exists('key1', 'key2', 'key3');  // 0-3

// Delete key
const deleted = await redis.del('key');  // 1 if deleted, 0 if not found

// Delete multiple (blocking)
await redis.del('key1', 'key2', 'key3');

// Delete (non-blocking, async)
await redis.unlink('key1', 'key2');  // Preferred for large keys

// Get key type
const type = await redis.type('key');  // 'string', 'list', 'set', etc.

// Rename key
await redis.rename('oldkey', 'newkey');
await redis.renamenx('oldkey', 'newkey');  // Only if newkey doesn't exist

// Expiration
await redis.expire('key', 3600);        // Set TTL (seconds)
await redis.pexpire('key', 3600000);    // Set TTL (milliseconds)
await redis.expireat('key', 1735689600); // Unix timestamp
await redis.persist('key');              // Remove expiration

// Get TTL
const ttl = await redis.ttl('key');      // Seconds remaining, -1 if no TTL, -2 if not exists
const pttl = await redis.pttl('key');    // Milliseconds remaining
```

### JSON Handling

```typescript
// Redis stores strings, so we need to serialize/deserialize JSON

// Store object
const user = { name: 'John', email: 'john@example.com', age: 30 };
await redis.set('user:1000', JSON.stringify(user));

// Retrieve object
const cached = await redis.get('user:1000');
const userData = cached ? JSON.parse(cached) : null;

// Helper functions
async function setJSON<T>(key: string, value: T, ttl?: number): Promise<void> {
  const serialized = JSON.stringify(value);
  if (ttl) {
    await redis.setex(key, ttl, serialized);
  } else {
    await redis.set(key, serialized);
  }
}

async function getJSON<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}

// Usage
await setJSON('user:1000', { name: 'John' }, 3600);
const user = await getJSON<{ name: string }>('user:1000');
```

---

## Working with Data Structures

### Hashes

```typescript
// Single field operations
await redis.hset('user:1000', 'name', 'John');
const name = await redis.hget('user:1000', 'name');  // 'John'

// Multiple fields at once
await redis.hset('user:1000', {
  name: 'John',
  email: 'john@example.com',
  age: '30',
});

// Or using hmset (deprecated but still works)
await redis.hmset('user:1000', 'city', 'NYC', 'country', 'USA');

// Get multiple fields
const fields = await redis.hmget('user:1000', 'name', 'email');
// ['John', 'john@example.com']

// Get all fields
const user = await redis.hgetall('user:1000');
// { name: 'John', email: 'john@example.com', age: '30', ... }

// Check field existence
const exists = await redis.hexists('user:1000', 'name');  // 1 or 0

// Get all keys/values
const keys = await redis.hkeys('user:1000');    // ['name', 'email', ...]
const values = await redis.hvals('user:1000');  // ['John', 'john@...', ...]

// Increment numeric field
await redis.hincrby('user:1000', 'age', 1);          // 31
await redis.hincrbyfloat('user:1000', 'balance', 10.5);

// Delete field
await redis.hdel('user:1000', 'city');

// Count fields
const count = await redis.hlen('user:1000');

// TypeScript helper for hash operations
interface UserHash {
  name: string;
  email: string;
  age: string;
}

async function getUserHash(userId: string): Promise<UserHash | null> {
  const data = await redis.hgetall(`user:${userId}`);
  if (Object.keys(data).length === 0) {
    return null;
  }
  return data as UserHash;
}
```

### Lists

```typescript
// Add elements
await redis.lpush('tasks', 'task1');           // Add to left (head)
await redis.rpush('tasks', 'task2', 'task3');  // Add to right (tail)

// Get elements
const all = await redis.lrange('tasks', 0, -1);      // All elements
const first3 = await redis.lrange('tasks', 0, 2);    // First 3
const element = await redis.lindex('tasks', 0);      // By index

// Remove elements
const left = await redis.lpop('tasks');        // Remove from left
const right = await redis.rpop('tasks');       // Remove from right

// Remove specific value
await redis.lrem('tasks', 1, 'task1');         // Remove 1 occurrence

// Length
const length = await redis.llen('tasks');

// Trim (keep only specified range)
await redis.ltrim('tasks', 0, 99);             // Keep first 100

// Set by index
await redis.lset('tasks', 0, 'new_task');

// Blocking pop (for queues)
const [list, value] = await redis.blpop('tasks', 30);  // Wait up to 30s
// Returns null if timeout

// Move between lists (for reliable queue)
const item = await redis.rpoplpush('pending', 'processing');
// Or blocking version
const item = await redis.brpoplpush('pending', 'processing', 30);

// Simple queue implementation
class SimpleQueue {
  constructor(private redis: Redis, private name: string) {}

  async enqueue(item: string): Promise<void> {
    await this.redis.lpush(this.name, item);
  }

  async dequeue(timeout = 0): Promise<string | null> {
    const result = await this.redis.brpop(this.name, timeout);
    return result ? result[1] : null;
  }

  async length(): Promise<number> {
    return this.redis.llen(this.name);
  }
}
```

### Sets

```typescript
// Add members
await redis.sadd('tags', 'javascript', 'typescript', 'nodejs');

// Check membership
const isMember = await redis.sismember('tags', 'javascript');  // 1 or 0

// Get all members
const members = await redis.smembers('tags');  // ['javascript', ...]

// Count members
const count = await redis.scard('tags');

// Remove members
await redis.srem('tags', 'nodejs');

// Random member
const random = await redis.srandmember('tags');
const random3 = await redis.srandmember('tags', 3);  // Array of 3

// Pop random (remove and return)
const popped = await redis.spop('tags');

// Set operations
await redis.sadd('set1', 'a', 'b', 'c');
await redis.sadd('set2', 'b', 'c', 'd');

const union = await redis.sunion('set1', 'set2');      // ['a','b','c','d']
const intersection = await redis.sinter('set1', 'set2'); // ['b', 'c']
const diff = await redis.sdiff('set1', 'set2');        // ['a']

// Store result in new key
await redis.sunionstore('set3', 'set1', 'set2');

// Practical example: Online users
async function setUserOnline(userId: string): Promise<void> {
  await redis.sadd('users:online', userId);
}

async function setUserOffline(userId: string): Promise<void> {
  await redis.srem('users:online', userId);
}

async function isUserOnline(userId: string): Promise<boolean> {
  const result = await redis.sismember('users:online', userId);
  return result === 1;
}

async function getOnlineUsers(): Promise<string[]> {
  return redis.smembers('users:online');
}

async function countOnlineUsers(): Promise<number> {
  return redis.scard('users:online');
}
```

### Sorted Sets

```typescript
// Add with scores
await redis.zadd('leaderboard', 100, 'player1', 85, 'player2', 120, 'player3');

// Get by rank (low to high)
const bottom3 = await redis.zrange('leaderboard', 0, 2);
const bottom3WithScores = await redis.zrange('leaderboard', 0, 2, 'WITHSCORES');
// ['player2', '85', 'player1', '100', 'player3', '120']

// Get by rank (high to low)
const top3 = await redis.zrevrange('leaderboard', 0, 2);
const top3WithScores = await redis.zrevrange('leaderboard', 0, 2, 'WITHSCORES');

// Get by score range
const scores80to100 = await redis.zrangebyscore('leaderboard', 80, 100);

// Get rank (position)
const rank = await redis.zrank('leaderboard', 'player1');      // 0-indexed from low
const revRank = await redis.zrevrank('leaderboard', 'player1'); // 0-indexed from high

// Get score
const score = await redis.zscore('leaderboard', 'player1');

// Update score
await redis.zincrby('leaderboard', 10, 'player2');  // Add 10 to player2's score

// Remove
await redis.zrem('leaderboard', 'player1');

// Count
const total = await redis.zcard('leaderboard');
const countInRange = await redis.zcount('leaderboard', 80, 100);

// Leaderboard implementation
class Leaderboard {
  constructor(
    private redis: Redis,
    private name: string
  ) {}

  async addScore(userId: string, score: number): Promise<void> {
    await this.redis.zadd(this.name, score, userId);
  }

  async incrementScore(userId: string, amount: number): Promise<number> {
    const newScore = await this.redis.zincrby(this.name, amount, userId);
    return parseFloat(newScore);
  }

  async getTopN(n: number): Promise<Array<{ userId: string; score: number }>> {
    const results = await this.redis.zrevrange(this.name, 0, n - 1, 'WITHSCORES');
    const parsed: Array<{ userId: string; score: number }> = [];
    
    for (let i = 0; i < results.length; i += 2) {
      parsed.push({
        userId: results[i],
        score: parseFloat(results[i + 1]),
      });
    }
    
    return parsed;
  }

  async getRank(userId: string): Promise<number | null> {
    const rank = await this.redis.zrevrank(this.name, userId);
    return rank !== null ? rank + 1 : null;  // 1-indexed
  }

  async getScore(userId: string): Promise<number | null> {
    const score = await this.redis.zscore(this.name, userId);
    return score !== null ? parseFloat(score) : null;
  }
}
```

---

## Pipelining in Node.js

### Why Pipeline?

Without pipeline, each command requires a network round trip:
```
Command 1 → Wait for response → Command 2 → Wait for response → ...
```

With pipeline, all commands are sent at once:
```
Commands 1,2,3,4,5 → One round trip → All responses
```

### Basic Pipeline

```typescript
const redis = getRedisClient();

// Create pipeline
const pipeline = redis.pipeline();

// Queue commands
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.get('key1');
pipeline.incr('counter');

// Execute all commands
const results = await pipeline.exec();

// Results format: [[error, result], [error, result], ...]
// [
//   [null, 'OK'],      // set key1
//   [null, 'OK'],      // set key2
//   [null, 'value1'],  // get key1
//   [null, 1],         // incr counter
// ]

// Check for errors
results.forEach(([err, result], index) => {
  if (err) {
    console.error(`Command ${index} failed:`, err);
  } else {
    console.log(`Command ${index} result:`, result);
  }
});
```

### Pipeline with Chaining

```typescript
// Chain commands for cleaner code
const results = await redis
  .pipeline()
  .set('key1', 'value1')
  .set('key2', 'value2')
  .get('key1')
  .get('key2')
  .del('key3')
  .exec();
```

### Practical Pipeline Example

```typescript
// Cache multiple products
async function cacheProducts(products: Product[]): Promise<void> {
  const pipeline = redis.pipeline();
  
  for (const product of products) {
    const key = `product:${product.id}`;
    const value = JSON.stringify(product);
    pipeline.setex(key, 1800, value);  // 30 minute TTL
  }
  
  await pipeline.exec();
  console.log(`Cached ${products.length} products`);
}

// Get multiple products
async function getProducts(ids: string[]): Promise<(Product | null)[]> {
  if (ids.length === 0) return [];
  
  const pipeline = redis.pipeline();
  
  for (const id of ids) {
    pipeline.get(`product:${id}`);
  }
  
  const results = await pipeline.exec();
  
  return results.map(([err, value]) => {
    if (err || !value) return null;
    return JSON.parse(value as string);
  });
}

// Delete by pattern using pipeline
async function deleteByPattern(pattern: string): Promise<number> {
  let cursor = '0';
  let deleted = 0;
  
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    
    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();
      deleted += keys.length;
    }
  } while (cursor !== '0');
  
  return deleted;
}
```

---

## Transactions in Node.js

### MULTI/EXEC Transaction

```typescript
// Basic transaction
const results = await redis
  .multi()
  .set('key1', 'value1')
  .set('key2', 'value2')
  .incr('counter')
  .exec();

// Results are same format as pipeline
// [[null, 'OK'], [null, 'OK'], [null, 1]]
```

### WATCH for Optimistic Locking

```typescript
async function atomicIncrement(key: string, maxValue: number): Promise<boolean> {
  // Watch the key
  await redis.watch(key);
  
  const currentValue = await redis.get(key);
  const current = currentValue ? parseInt(currentValue) : 0;
  
  if (current >= maxValue) {
    await redis.unwatch();
    return false;  // Already at max
  }
  
  // Execute transaction
  const results = await redis
    .multi()
    .incr(key)
    .exec();
  
  // If results is null, another client modified the key
  if (results === null) {
    console.log('Transaction aborted, key was modified');
    return false;
  }
  
  return true;
}

// Transfer money atomically
async function transfer(from: string, to: string, amount: number): Promise<boolean> {
  const fromKey = `balance:${from}`;
  const toKey = `balance:${to}`;
  
  // Watch both accounts
  await redis.watch(fromKey, toKey);
  
  const fromBalance = parseInt(await redis.get(fromKey) || '0');
  const toBalance = parseInt(await redis.get(toKey) || '0');
  
  if (fromBalance < amount) {
    await redis.unwatch();
    throw new Error('Insufficient balance');
  }
  
  const results = await redis
    .multi()
    .decrby(fromKey, amount)
    .incrby(toKey, amount)
    .exec();
  
  if (results === null) {
    // Retry transaction
    return transfer(from, to, amount);
  }
  
  return true;
}
```

### Pipeline vs Transaction

```typescript
// Pipeline: Commands may be interleaved with other clients
// Use for batch operations where atomicity isn't needed
const pipeline = redis.pipeline();
pipeline.set('a', '1');
pipeline.set('b', '2');
await pipeline.exec();

// Transaction: Commands are atomic (all-or-nothing)
// Use when operations must complete together
const multi = redis.multi();
multi.set('a', '1');
multi.set('b', '2');
await multi.exec();
```

---

## Pub/Sub in Node.js

### Publisher and Subscriber

```typescript
import Redis from 'ioredis';

// Important: Subscriber needs its own connection
// It enters "subscriber mode" and can't do other commands
const publisher = new Redis();
const subscriber = new Redis();

// Subscribe to channels
subscriber.subscribe('notifications', 'alerts', (err, count) => {
  if (err) {
    console.error('Subscribe error:', err);
    return;
  }
  console.log(`Subscribed to ${count} channels`);
});

// Handle messages
subscriber.on('message', (channel, message) => {
  console.log(`[${channel}] ${message}`);
  
  // Parse JSON if needed
  try {
    const data = JSON.parse(message);
    handleMessage(channel, data);
  } catch {
    handleMessage(channel, message);
  }
});

// Publish messages
async function notify(channel: string, message: any): Promise<void> {
  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  await publisher.publish(channel, payload);
}

// Usage
await notify('notifications', { type: 'order', orderId: '123' });
```

### Pattern Subscribe

```typescript
// Subscribe to all channels matching pattern
subscriber.psubscribe('user:*:events', (err, count) => {
  console.log(`Pattern subscribed to ${count} patterns`);
});

// Handle pattern messages
subscriber.on('pmessage', (pattern, channel, message) => {
  console.log(`[Pattern: ${pattern}] [Channel: ${channel}] ${message}`);
});

// Publish to specific channel
await publisher.publish('user:123:events', 'User logged in');
await publisher.publish('user:456:events', 'User updated profile');
```

### Real-World Example: Cache Invalidation

```typescript
// cache-invalidation.ts
import Redis from 'ioredis';

const publisher = new Redis();
const subscriber = new Redis();

// Subscribe to invalidation events
subscriber.subscribe('cache:invalidate', (err) => {
  if (err) console.error('Subscribe error:', err);
});

subscriber.on('message', async (channel, message) => {
  if (channel === 'cache:invalidate') {
    const { pattern } = JSON.parse(message);
    console.log(`Invalidating cache pattern: ${pattern}`);
    
    // Delete local cache entries matching pattern
    await deleteByPattern(pattern);
  }
});

// Function to trigger invalidation across all servers
export async function invalidateCache(pattern: string): Promise<void> {
  await publisher.publish('cache:invalidate', JSON.stringify({ pattern }));
}

// Usage: When product is updated
async function updateProduct(productId: string, data: any) {
  await db.product.update({ where: { id: productId }, data });
  
  // Notify all servers to invalidate cache
  await invalidateCache(`product:${productId}:*`);
  await invalidateCache('products:list:*');
}
```

---

## Error Handling

### Connection Errors

```typescript
const redis = new Redis({
  retryStrategy(times) {
    if (times > 10) {
      // Stop retrying after 10 attempts
      return null;
    }
    return Math.min(times * 100, 3000);
  },
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  // Log but don't crash
  console.error('Redis error:', err.message);
  
  // Optionally notify monitoring
  // alertService.notify('Redis connection error', err);
});

redis.on('close', () => {
  console.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('Reconnecting to Redis...');
});
```

### Command Errors

```typescript
// Wrap operations in try-catch
async function safeGet(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch (error) {
    console.error(`Redis GET error for ${key}:`, error);
    return null;  // Graceful degradation
  }
}

// With timeout
async function getWithTimeout(key: string, timeout = 5000): Promise<string | null> {
  try {
    const result = await Promise.race([
      redis.get(key),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Redis timeout')), timeout)
      ),
    ]);
    return result;
  } catch (error) {
    console.error('Redis operation failed:', error);
    return null;
  }
}
```

### Graceful Degradation Pattern

```typescript
async function getProductWithFallback(productId: string): Promise<Product> {
  // Try cache first
  try {
    const cached = await redis.get(`product:${productId}`);
    if (cached) {
      console.log('Cache hit');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Redis unavailable, falling back to database');
  }
  
  // Fallback to database
  const product = await db.product.findUnique({ where: { id: productId } });
  
  // Try to cache (fire-and-forget)
  redis.setex(`product:${productId}`, 1800, JSON.stringify(product)).catch(() => {
    // Ignore cache write errors
  });
  
  return product;
}
```

---

## Caching Patterns

### Cache-Through Pattern

```typescript
/**
 * Generic cache-through function
 * 1. Check cache
 * 2. If miss, fetch from source
 * 3. Cache the result
 * 4. Return data
 */
async function cacheThrough<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // Try cache
  const cached = await redis.get(key);
  
  if (cached) {
    console.log(`Cache HIT: ${key}`);
    return JSON.parse(cached);
  }
  
  console.log(`Cache MISS: ${key}`);
  
  // Fetch from source
  const data = await fetcher();
  
  // Cache the result (fire-and-forget)
  redis.setex(key, ttlSeconds, JSON.stringify(data)).catch((err) => {
    console.error(`Failed to cache ${key}:`, err);
  });
  
  return data;
}

// Usage
const products = await cacheThrough(
  'products:featured',
  1800,  // 30 minutes
  () => db.product.findMany({ where: { isFeatured: true } })
);
```

### Decorator Pattern (TypeScript)

```typescript
// Cache decorator for class methods
function Cached(ttlSeconds: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      
      const result = await originalMethod.apply(this, args);
      
      await redis.setex(cacheKey, ttlSeconds, JSON.stringify(result));
      
      return result;
    };
    
    return descriptor;
  };
}

// Usage
class ProductService {
  @Cached(1800)
  async getProduct(id: string): Promise<Product> {
    return db.product.findUnique({ where: { id } });
  }
  
  @Cached(3600)
  async getCategories(): Promise<Category[]> {
    return db.category.findMany();
  }
}
```

### Stampede Prevention with Locking

```typescript
async function getWithLock<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  lockTimeout = 10
): Promise<T> {
  // Check cache
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Try to acquire lock
  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, '1', 'EX', lockTimeout, 'NX');
  
  if (acquired) {
    try {
      // We have the lock, fetch data
      const data = await fetcher();
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
      return data;
    } finally {
      // Release lock
      await redis.del(lockKey);
    }
  } else {
    // Another process is fetching, wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return getWithLock(key, ttlSeconds, fetcher, lockTimeout);
  }
}
```

---

## TypeScript Integration

### Type-Safe Redis Wrapper

```typescript
// types/cache.ts
export interface CacheConfig {
  ttl: number;
  prefix?: string;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
}

// services/cache-service.ts
import Redis from 'ioredis';

export class TypedCacheService implements CacheService {
  private prefix: string;
  private defaultTTL: number;
  
  constructor(
    private redis: Redis,
    config: { prefix?: string; defaultTTL?: number } = {}
  ) {
    this.prefix = config.prefix || '';
    this.defaultTTL = config.defaultTTL || 3600;
  }
  
  private getKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }
  
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getKey(key);
    const value = await this.redis.get(fullKey);
    
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.getKey(key);
    const serialized = JSON.stringify(value);
    const finalTTL = ttl ?? this.defaultTTL;
    
    await this.redis.setex(fullKey, finalTTL, serialized);
  }
  
  async del(key: string): Promise<boolean> {
    const fullKey = this.getKey(key);
    const result = await this.redis.del(fullKey);
    return result > 0;
  }
  
  async exists(key: string): Promise<boolean> {
    const fullKey = this.getKey(key);
    const result = await this.redis.exists(fullKey);
    return result === 1;
  }
  
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const value = await fetcher();
    await this.set(key, value, ttl);
    
    return value;
  }
}

// Usage
const cache = new TypedCacheService(redis, {
  prefix: 'myapp',
  defaultTTL: 1800,
});

interface User {
  id: string;
  name: string;
  email: string;
}

const user = await cache.get<User>('user:123');
await cache.set<User>('user:123', { id: '123', name: 'John', email: 'john@example.com' });
```

---

## Testing Redis Code

### Using a Test Redis Instance

```typescript
// tests/setup.ts
import Redis from 'ioredis';

let testRedis: Redis;

beforeAll(() => {
  testRedis = new Redis({
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
    db: 15,  // Use a different database for tests
  });
});

afterAll(async () => {
  await testRedis.quit();
});

beforeEach(async () => {
  // Clear test database before each test
  await testRedis.flushdb();
});

export { testRedis };
```

### Mocking Redis

```typescript
// Using jest mock
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  };
  return jest.fn(() => mockRedis);
});

// In test
import Redis from 'ioredis';

describe('CacheService', () => {
  let redis: jest.Mocked<Redis>;
  
  beforeEach(() => {
    redis = new Redis() as jest.Mocked<Redis>;
    redis.get.mockResolvedValue(null);
    redis.setex.mockResolvedValue('OK');
  });
  
  test('returns null for cache miss', async () => {
    redis.get.mockResolvedValue(null);
    
    const result = await cacheService.get('nonexistent');
    
    expect(result).toBeNull();
    expect(redis.get).toHaveBeenCalledWith('nonexistent');
  });
  
  test('returns cached value for cache hit', async () => {
    const cached = JSON.stringify({ id: '123', name: 'Test' });
    redis.get.mockResolvedValue(cached);
    
    const result = await cacheService.get('user:123');
    
    expect(result).toEqual({ id: '123', name: 'Test' });
  });
});
```

### Using ioredis-mock

```typescript
import RedisMock from 'ioredis-mock';

// Use mock Redis in tests
const redis = new RedisMock();

// Works like real ioredis
await redis.set('key', 'value');
const value = await redis.get('key');  // 'value'
```

---

## Performance Optimization

### 1. Connection Pooling (If Needed)

ioredis handles multiplexing automatically, but for high-throughput scenarios:

```typescript
import Redis from 'ioredis';

// Create a cluster of connections
const cluster = new Redis.Cluster([
  { host: 'node1', port: 6379 },
  { host: 'node2', port: 6379 },
  { host: 'node3', port: 6379 },
]);
```

### 2. Use Pipeline for Bulk Operations

```typescript
// ❌ Bad: 1000 round trips
for (let i = 0; i < 1000; i++) {
  await redis.set(`key:${i}`, `value:${i}`);
}

// ✅ Good: 1 round trip
const pipeline = redis.pipeline();
for (let i = 0; i < 1000; i++) {
  pipeline.set(`key:${i}`, `value:${i}`);
}
await pipeline.exec();
```

### 3. Use SCAN Instead of KEYS

```typescript
// ❌ Bad: Blocks Redis
const keys = await redis.keys('user:*');

// ✅ Good: Non-blocking
async function scanKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  
  do {
    const [next, found] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = next;
    keys.push(...found);
  } while (cursor !== '0');
  
  return keys;
}
```

### 4. Compress Large Values

```typescript
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

async function setCompressed(key: string, value: any, ttl: number): Promise<void> {
  const json = JSON.stringify(value);
  const compressed = await gzipAsync(json);
  await redis.setex(key, ttl, compressed.toString('base64'));
}

async function getCompressed<T>(key: string): Promise<T | null> {
  const compressed = await redis.get(key);
  if (!compressed) return null;
  
  const buffer = Buffer.from(compressed, 'base64');
  const decompressed = await gunzipAsync(buffer);
  return JSON.parse(decompressed.toString());
}
```

---

## Common Pitfalls

### 1. Forgetting to Handle Errors

```typescript
// ❌ Bad: Unhandled errors crash the app
const value = await redis.get('key');

// ✅ Good: Handle errors gracefully
try {
  const value = await redis.get('key');
} catch (error) {
  console.error('Redis error:', error);
  // Fallback logic
}
```

### 2. Creating Multiple Connections

```typescript
// ❌ Bad: New connection per request
app.get('/api/data', async (req, res) => {
  const redis = new Redis();  // DON'T DO THIS
  const data = await redis.get('key');
  redis.quit();
  res.json(data);
});

// ✅ Good: Reuse connection
const redis = new Redis();

app.get('/api/data', async (req, res) => {
  const data = await redis.get('key');
  res.json(data);
});
```

### 3. Not Setting TTL

```typescript
// ❌ Bad: Data stays forever, memory leak
await redis.set('cache:key', data);

// ✅ Good: Always set TTL for cache data
await redis.setex('cache:key', 3600, data);
```

### 4. Storing Too Much Data

```typescript
// ❌ Bad: Storing huge objects
await redis.set('products', JSON.stringify(allProducts));  // 100MB!

// ✅ Good: Store references, paginate
await redis.set('products:page:1', JSON.stringify(first100Products));
```

### 5. Not Using the Right Data Structure

```typescript
// ❌ Bad: Storing object as string when you need field access
await redis.set('user:123', JSON.stringify({ name: 'John', visits: 0 }));

// To increment visits, you must:
const user = JSON.parse(await redis.get('user:123'));
user.visits++;
await redis.set('user:123', JSON.stringify(user));

// ✅ Good: Use Hash for objects with individual fields
await redis.hset('user:123', { name: 'John', visits: '0' });
await redis.hincrby('user:123', 'visits', 1);  // Atomic increment
```

---

## Summary

| Topic | Key Points |
|-------|------------|
| **Client** | Use ioredis, singleton pattern, handle reconnection |
| **Operations** | SET/GET, TTL, JSON serialization |
| **Structures** | Strings, Hashes, Lists, Sets, Sorted Sets |
| **Pipeline** | Batch commands, reduce round trips |
| **Transactions** | MULTI/EXEC, WATCH for optimistic locking |
| **Pub/Sub** | Separate connections, real-time messaging |
| **Errors** | Graceful degradation, timeouts |
| **Performance** | Pipeline, SCAN, compression |

---

**Next: [Part 4 - ShopPulse Redis Implementation](./4_SHOPPULSE_REDIS_IMPLEMENTATION.md)**
