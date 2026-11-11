# Prisma Query Mastery — Beginner to Pro

> **Every concept explained with real ShopPulse Admin code.**  
> 80 topics covering the full Prisma ORM surface area as used in production applications.

---

## Table of Contents

- [Part A — Setup & Architecture](#part-a--setup--architecture)
- [Part B — CRUD Operations](#part-b--crud-operations-the-foundation)
- [Part C — Where Clauses](#part-c--where-clauses-filtering-like-a-pro)
- [Part D — Relations: select vs include](#part-d--relations-select-vs-include)
- [Part E — Relation Queries & Filtering](#part-e--relation-queries--filtering)
- [Part F — Sorting & Pagination](#part-f--sorting--pagination)
- [Part G — Aggregations & Grouping](#part-g--aggregations--grouping)
- [Part H — Transactions](#part-h--transactions)
- [Part I — Atomic Operations](#part-i--atomic-operations)
- [Part J — Special Operations](#part-j--special-operations)
- [Part K — Error Handling](#part-k--error-handling)
- [Part L — Performance & Best Practices](#part-l--performance--best-practices)
- [Part M — Real ShopPulse Query Patterns](#part-m--real-shoppulse-query-patterns-case-studies)

---

# Part A — Setup & Architecture

## 1. Prisma Client: What It Is and How It Works

Prisma Client is an **auto-generated, type-safe query builder** for your database. When you run `npx prisma generate`, Prisma reads your `schema.prisma` file and generates TypeScript code in your `output` directory (we use `src/generated/prisma`).

**What Prisma generates:**

```
src/generated/prisma/
├── index.d.ts      ← All types (Store, Product, Order, Enums, etc.)
├── index.js        ← The actual query engine runtime
├── schema.prisma   ← Copy of your schema for reference
└── wasm.js         ← WebAssembly query engine (for edge runtimes)
```

**The flow:**

```
Your TypeScript code
        ↓
  Prisma Client (generated)
        ↓
  Prisma Query Engine (Rust binary / WASM)
        ↓
  SQL statements
        ↓
  PostgreSQL database
```

Every time you write `prismadb.product.findMany(...)`, Prisma Client translates that into an optimized SQL query, executes it against PostgreSQL, and returns the result as a typed TypeScript object. You never write raw SQL (though you can with `$queryRaw`).

**Key benefit:** If your schema has `name String`, then `product.name` is typed as `string` in TypeScript. If you have `sellingPrice Decimal?`, it's typed as `Decimal | null`. This means compile-time errors instead of runtime surprises.

---

## 2. Connection Pooling and the Singleton Pattern

### The Problem

In Next.js development, **hot reloading** (HMR) re-executes your module code on every file save. If you write:

```typescript
// BAD — creates a new connection pool on every hot reload
const prisma = new PrismaClient();
export default prisma;
```

After 50 file saves, you'd have 50 PrismaClient instances, each with its own connection pool (default 5 connections). That's 250 database connections. PostgreSQL's default limit is 100. You'll get:

```
Error: Too many database connections
```

### The Solution — Our Singleton Pattern

```typescript
// src/lib/prismadb.ts
import { PrismaClient } from '@/generated/prisma';

declare global {
  var prisma: PrismaClient | undefined;
}

const prismadb = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prismadb;

export default prismadb;
```

**How it works:**

1. `globalThis` is a Node.js global that survives hot reloads (it's not module-scoped).
2. On first load: `globalThis.prisma` is `undefined`, so we create a new `PrismaClient()`.
3. We store it on `globalThis.prisma` (only in development).
4. On hot reload: `globalThis.prisma` already exists, so `||` returns the existing instance.
5. In production: We always create fresh (no hot reload concern), and Node.js process runs once.

### Connection Pool Defaults

PrismaClient opens a pool of database connections:

| Setting | Default | Meaning |
|---------|---------|---------|
| `connection_limit` | `num_cpus * 2 + 1` | Max number of simultaneous connections |
| `pool_timeout` | 10 seconds | How long to wait for a free connection from the pool |

You can configure these via the datasource URL:

```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20"
```

### Why We Have Two Import Conventions

In our codebase, you'll see two patterns:

```typescript
// Convention 1: Most files
import prismadb from '@/lib/prismadb';

// Convention 2: Some subscription/webhook handlers
import { prisma } from '../../lib/prismadb';
```

Both point to the same singleton instance. The difference is just import style. Some files were written at different times with different conventions. They all use the same `PrismaClient` instance from `globalThis`.

---

## 3. Generated Types: How Prisma Gives You Type Safety

When you define a model in `schema.prisma`:

```prisma
model Product {
  id           String   @id @default(uuid())
  name         String
  price        Decimal
  sellingPrice Decimal?
  isArchived   Boolean  @default(false)
  createdAt    DateTime @default(now())
}
```

Prisma generates corresponding TypeScript types:

```typescript
// Auto-generated in src/generated/prisma/index.d.ts
export type Product = {
  id: string
  name: string
  price: Decimal
  sellingPrice: Decimal | null
  isArchived: boolean
  createdAt: Date
}
```

**Field type mapping:**

| Prisma Type | TypeScript Type | Notes |
|------------|-----------------|-------|
| `String` | `string` | |
| `Int` | `number` | |
| `Boolean` | `boolean` | |
| `DateTime` | `Date` | JavaScript Date object |
| `Decimal` | `Prisma.Decimal` | NOT a number — needs `.toString()` or `Number()` |
| `Json` | `JsonValue` | Could be anything — needs runtime casting |
| `String?` | `string \| null` | Optional = nullable |
| `Float` | `number` | |

**Important: Decimal is NOT a number!**

Prisma's `Decimal` type preserves exact precision (critical for money). But it's NOT a JavaScript `number`:

```typescript
// ❌ WRONG — item.priceAtPurchase is Decimal, not number
const total = item.priceAtPurchase * item.quantity;

// ✅ CORRECT — convert first
const total = Number(item.priceAtPurchase) * item.quantity;
// or
const total = parseFloat(item.priceAtPurchase.toString()) * item.quantity;
```

We do this conversion everywhere in our API responses:

```typescript
// From our order detail API
priceAtPurchase: item.priceAtPurchase
  ? parseFloat(item.priceAtPurchase.toString())
  : 0,
```

### Importing Generated Types

```typescript
// Import types for use in function signatures, interfaces, etc.
import { Product, OrderStatus, ShipmentStatus } from '@/generated/prisma';

// Import Prisma namespace for advanced types
import { Prisma } from '@/generated/prisma';

// Use Prisma namespace for input types, where clause types, etc.
const where: Prisma.OrderWhereInput = { ... };
const data: Prisma.ProductCreateInput = { ... };
```

---

## 4. The Two Clients Pattern (prismadb vs prisma aliases)

In ShopPulse Admin, you'll see imports from two places:

```typescript
// Pattern A (most common)
import prismadb from '@/lib/prismadb';

// Pattern B (some service files)
import prismadb from '@/lib/prismadb';
// — or —
import { prisma } from '...';
```

Both are the **same singleton instance**. The naming is a project convention, not a technical difference. Use `prismadb` consistently.

---

# Part B — CRUD Operations (The Foundation)

## 5. create — Single Record Creation

`create` inserts one row. You provide `data` with all required fields.

### Syntax

```typescript
const record = await prismadb.modelName.create({
  data: {
    // Required fields must be provided
    // Optional fields can be omitted (defaults to null or @default value)
    // Relation fields use connect/create/connectOrCreate
  },
  // Optional: choose returned fields
  select: { ... },
  // Optional: include relations in response
  include: { ... },
});
```

### ShopPulse Example — Creating a Store

```typescript
// From src/app/api/stores/route.ts
const store = await prismadb.store.create({
  data: {
    name,       // Required: store name
    userId,     // Required: Clerk user ID
  },
});
```

Prisma generates the `id` (via `@default(uuid())`), `createdAt`, and `updatedAt` automatically.

### Creating With Relations

```typescript
// From onboarding — create store with nested subscription
const store = await prismadb.store.create({
  data: {
    name: storeName,
    userId,
    subscription: {
      create: {
        userId,
        plan: 'STARTER',
        status: 'TRIALING',
        trialStart: new Date(),
        trialEnd: trialEndDate,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndDate,
      },
    },
  },
  include: {
    subscription: true,
  },
});
```

The nested `create` inside `subscription` creates a `Subscription` record and automatically sets the `storeId` foreign key. Prisma handles the relationship wiring.

### Creating With Nested createMany

```typescript
// From products POST — create product with variants and images
const product = await prismadb.product.create({
  data: {
    storeId,
    categoryId,
    name,
    // ... other fields
    images: {
      createMany: {
        data: images.map((image: { url: string }) => ({ url: image.url })),
      },
    },
    variants: {
      createMany: {
        data: processedVariants,
      },
    },
  },
  include: {
    images: true,
    variants: { include: { size: true } },
    category: true,
  },
});
```

`createMany` inside a `create` is a **nested write** — it creates all child records in a single database transaction. If any child fails, the entire parent creation rolls back.

---

## 6. createMany — Bulk Insert

`createMany` inserts multiple rows in one SQL statement. It's much faster than calling `create` in a loop.

### Syntax

```typescript
const result = await prismadb.modelName.createMany({
  data: [
    { field1: 'a', field2: 1 },
    { field1: 'b', field2: 2 },
  ],
  skipDuplicates: true, // Optional: skip rows that violate unique constraints
});
// result.count = number of rows inserted
```

### ShopPulse Example — Creating Multiple Shipment Events

```typescript
// From shipping-service.ts
await prismadb.shipmentEvent.createMany({
  data: events.map(event => ({
    shipmentId: shipment.id,
    status: event.status,
    location: event.location,
    description: event.description,
    eventTime: new Date(event.date),
  })),
});
```

**Limitations of `createMany`:**
- You do NOT get back the created records (only the count).
- Nested creates are NOT supported inside `createMany`.
- `skipDuplicates` silently ignores rows that violate unique constraints.

---

## 7. findUnique — Exact ID/Unique Lookups

`findUnique` looks up exactly one record by a unique field (usually `id`, or a `@@unique` composite).

### Syntax

```typescript
// Returns the record or null
const record = await prismadb.modelName.findUnique({
  where: {
    id: 'some-uuid',
    // — OR use a composite unique —
    // modelName_field1_field2: { field1: 'a', field2: 'b' },
  },
  select: { ... },   // Optional
  include: { ... },   // Optional
});
```

### ShopPulse Examples

```typescript
// Simple ID lookup
const store = await prismadb.store.findUnique({
  where: { id: storeId },
});

// Composite unique lookup (usage tracking)
const record = await prismadb.usageOrders.findUnique({
  where: {
    userId_periodStart_periodEnd: {
      userId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    },
  },
});

// With select
const product = await prismadb.product.findUnique({
  where: { id: productId },
  select: { hasVariants: true, baseStockQuantity: true },
});
```

**`findUnique` vs `findFirst`:**
- `findUnique` — REQUIRES a unique field in `where`. Prisma can optimize to a single-row lookup.
- `findFirst` — Can use ANY field. Returns the first match. Less efficient for ID lookups.

**Gotcha — findUnique returns `null`, not an error:**

```typescript
const product = await prismadb.product.findUnique({
  where: { id: 'non-existent-id' },
});
// product === null (NOT an error)
```

If you want an error when not found, use `findUniqueOrThrow`:

```typescript
// Throws PrismaClientKnownRequestError (P2025) if not found
const product = await prismadb.product.findUniqueOrThrow({
  where: { id: productId },
});
```

---

## 8. findFirst — First Match with Conditions

`findFirst` returns the first record matching your `where` clause, or `null` if none match.

### Syntax

```typescript
const record = await prismadb.modelName.findFirst({
  where: { ... },
  orderBy: { ... },   // Determines which "first" you get
  select: { ... },
  include: { ... },
});
```

### ShopPulse Example — Verify Store Ownership

```typescript
// From most of our API routes — verify the store belongs to the user
const storeByUserId = await prismadb.store.findFirst({
  where: {
    id: storeId,
    userId,
  },
});

if (!storeByUserId) {
  return new NextResponse('Unauthorized', { status: 403 });
}
```

We use `findFirst` here instead of `findUnique` because `userId` is not a unique field on `Store`. We're querying by `id` (unique) + `userId` (not unique) — a composite that isn't a `@@unique` constraint.

### findFirst with orderBy

```typescript
// Get the most recent subscription for a user
const subscription = await prismadb.subscription.findFirst({
  where: { userId },
  orderBy: { createdAt: 'desc' },
});
```

---

## 9. findMany — Querying Multiple Records

`findMany` returns an array of records matching your conditions. It's the most commonly used query in our project.

### Syntax

```typescript
const records = await prismadb.modelName.findMany({
  where: { ... },       // Filter
  select: { ... },      // Cherry-pick fields
  include: { ... },     // Load relations
  orderBy: { ... },     // Sort
  take: 10,             // Limit (like SQL LIMIT)
  skip: 0,              // Offset (like SQL OFFSET)
  cursor: { id: '...' },// Cursor pagination
  distinct: ['field'],  // Unique values only
});
// Always returns an array (empty [] if no matches)
```

### ShopPulse Example — Products Listing with Filters

```typescript
// From products GET route — complex filtering
const products = await prismadb.product.findMany({
  where: {
    storeId: params.storeId,
    ...(categoryId && { categoryId }),
    ...(isFeatured !== undefined && { isFeatured }),
    ...(isArchived !== undefined && { isArchived }),
  },
  include: {
    images: true,
    category: true,
    variants: {
      include: { size: true },
      orderBy: { displayOrder: 'asc' },
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
});
```

### ShopPulse Example — Expired Orders Cleanup

```typescript
// From expire-unpaid-orders cron
const expiredOrders = await prismadb.order.findMany({
  where: {
    orderStatus: 'PAYMENT_INITIATED',
    paymentMethod: 'PREPAID',
    isPaid: false,
    createdAt: { lt: thirtyMinAgo },
  },
  include: {
    orderItems: {
      select: {
        productId: true,
        variantSnapshot: true,
        quantity: true,
      },
    },
    store: {
      select: { userId: true },
    },
  },
});
```

**Key point:** `findMany` with an empty `where` returns ALL records. Always add filters in production.

---

## 10. update — Modifying a Single Record

`update` modifies one record identified by a unique field.

### Syntax

```typescript
const updated = await prismadb.modelName.update({
  where: { id: '...' },   // Must be a unique field
  data: { ... },           // Fields to update
  select: { ... },
  include: { ... },
});
```

### ShopPulse Example — Mark Order as Paid

```typescript
// From Razorpay webhook charged handler
await prismadb.order.update({
  where: { razorpayOrderId },
  data: {
    isPaid: true,
    orderStatus: 'CONFIRMED',
    razorpayPaymentId: paymentId,
    paidAt: new Date(),
  },
});
```

### Update with Nested Relation Operations

```typescript
// Update product with replacing all images
await prismadb.product.update({
  where: { id: productId },
  data: {
    name: 'New Name',
    images: {
      deleteMany: {},                    // Delete all existing images
      createMany: {                      // Create new images
        data: newImages.map(img => ({ url: img.url })),
      },
    },
  },
});
```

**The `deleteMany: {}` trick:** An empty where on `deleteMany` inside an update deletes ALL related records. This is our "replace all images" pattern.

---

## 11. updateMany — Bulk Updates with Conditions

`updateMany` updates all records matching a `where` clause. Unlike `update`, it does NOT require a unique field.

### Syntax

```typescript
const result = await prismadb.modelName.updateMany({
  where: { ... },        // Can be any condition
  data: { ... },         // Fields to update
});
// result.count = number of rows updated
```

### ShopPulse Example — Atomic Stock Decrement (Race-Safe!)

This is one of our most important patterns:

```typescript
// From checkout — atomically decrement variant stock
const updated = await tx.productVariant.updateMany({
  where: {
    id: item.variantId,
    stockQuantity: { gte: item.quantity },  // Guard: only if enough stock
  },
  data: {
    stockQuantity: { decrement: item.quantity },
  },
});

if (updated.count === 0) {
  throw new Error(`Insufficient stock for ${product.name}`);
}
```

**Why `updateMany` instead of `update`?**

`update` would update the record regardless of stock level — it doesn't support a conditional `where` beyond the unique field. `updateMany` lets us add `stockQuantity: { gte: item.quantity }` as a condition. If stock is insufficient, `updated.count === 0` and we know to throw an error. This is the same pattern as SQL `UPDATE ... WHERE stock >= quantity`.

**This prevents race conditions:** Two customers buying the same product simultaneously will both try this `updateMany`. Only one will succeed if stock is 1. The database handles the atomicity.

---

## 12. upsert — Create or Update in One Call

`upsert` = "update if exists, create if doesn't." It resolves the classic "check then insert" race condition.

### Syntax

```typescript
const record = await prismadb.modelName.upsert({
  where: {
    // Must be a unique field/composite
    uniqueField: value,
  },
  create: {
    // All fields needed for creation
    uniqueField: value,
    fieldA: 'new',
  },
  update: {
    // Only fields to change on update
    fieldA: 'updated',
  },
});
```

### ShopPulse Example — Usage Tracking

```typescript
// From usage-service.ts — track order count per billing period
await prismadb.usageOrders.upsert({
  where: {
    userId_periodStart_periodEnd: {
      userId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    },
  },
  create: {
    userId,
    count: 1,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
  },
  update: {
    count: { increment: 1 },   // Atomic increment!
  },
});
```

**Why upsert here?** On the first order in a billing period, there's no `UsageOrders` row — `create` runs. On subsequent orders, the row exists — `update` runs with `increment`. No race condition, no "check if exists first" pattern.

### ShopPulse Example — Store Integration Credentials

```typescript
// From integration-service.ts
await prismadb.storeIntegration.upsert({
  where: {
    storeId_type_provider: {
      storeId,
      type: 'SMS',
      provider: 'fast2sms',
    },
  },
  create: {
    storeId,
    type: 'SMS',
    provider: 'fast2sms',
    credentials: encryptedCreds,
  },
  update: {
    credentials: encryptedCreds,
  },
});
```

---

## 13. delete — Removing a Single Record

`delete` removes one record by unique field and returns the deleted record.

### Syntax

```typescript
const deleted = await prismadb.modelName.delete({
  where: { id: '...' },
});
// deleted = the record that was removed
```

### ShopPulse Example — Delete a Category

```typescript
// From categories/[categoryId] DELETE route
const category = await prismadb.category.delete({
  where: { id: categoryId },
});
```

**Cascade behavior:** Depends on your schema's `onDelete`:

| Schema | Behavior |
|--------|----------|
| `onDelete: Cascade` | Deleting parent auto-deletes children |
| `onDelete: SetNull` | Deleting parent sets child FK to null |
| `onDelete: Restrict` | Deleting parent FAILS if children exist |

In our schema:
- Deleting a `Store` → cascades to `Order`, `Product`, `Subscription`, etc.
- Deleting a `Product` → sets `OrderItem.productId` to null (SetNull).

---

## 14. deleteMany — Bulk Deletion

```typescript
// Delete all images for a product
await prismadb.image.deleteMany({
  where: { productId },
});
```

`deleteMany({})` (empty where) deletes ALL records in the table — use with extreme caution! This is used during database resets.

---

# Part C — Where Clauses (Filtering Like a Pro)

## 15. Exact Match: `equals` (implicit and explicit)

```typescript
// Implicit equals (shorthand — most common)
await prismadb.product.findMany({
  where: {
    storeId: 'abc-123',         // storeId equals 'abc-123'
    isArchived: false,           // isArchived equals false
  },
});

// Explicit equals (same result, more verbose)
await prismadb.product.findMany({
  where: {
    storeId: { equals: 'abc-123' },
    isArchived: { equals: false },
  },
});
```

The implicit shorthand is used everywhere in our codebase. Use `equals` explicitly only when combining with other operators.

---

## 16. Negation: `not`

```typescript
// Find orders that are NOT in PAYMENT_INITIATED status
const orders = await prismadb.order.findMany({
  where: {
    storeId,
    orderStatus: { not: 'PAYMENT_INITIATED' },
  },
});
```

From our orders list — we always exclude `PAYMENT_INITIATED` (incomplete payment attempts).

**`not` with null:**

```typescript
// Find products that HAVE a selling price
where: {
  sellingPrice: { not: null },
}

// This is different from:
where: {
  sellingPrice: null,  // Find products WITHOUT a selling price
}
```

---

## 17. Set Membership: `in`, `notIn`

```typescript
// Find all orders with these specific IDs
const orders = await prismadb.order.findMany({
  where: {
    id: { in: ['order-1', 'order-2', 'order-3'] },
  },
});

// Find products NOT in certain categories
const products = await prismadb.product.findMany({
  where: {
    categoryId: { notIn: excludedCategoryIds },
  },
});
```

### ShopPulse Example — Batch Archive Lookup

```typescript
// From order detail API — batch-fetch ArchivedProducts
const archivedProducts = await prismadb.archivedProduct.findMany({
  where: {
    originalProductId: { in: deletedProductIds },
  },
});
```

Instead of N queries (one per deleted product), we do ONE query with `in`. This is the N+1 prevention pattern.

**`in` with empty array:** `in: []` matches nothing (returns 0 results). No error, no crash.

---

## 18. Comparison: `lt`, `lte`, `gt`, `gte`

```typescript
// lt  = less than (<)
// lte = less than or equal (<=)
// gt  = greater than (>)
// gte = greater than or equal (>=)

// Find expired orders (created more than 30 minutes ago)
const expiredOrders = await prismadb.order.findMany({
  where: {
    createdAt: { lt: thirtyMinutesAgo },
  },
});

// Stock threshold check — find variants with low stock
const lowStockVariants = await prismadb.productVariant.findMany({
  where: {
    stockQuantity: { lte: 5 },   // 5 or fewer items
  },
});
```

### Date Ranges

```typescript
// Orders within a date range
where: {
  createdAt: {
    gte: new Date('2026-01-01'),   // From Jan 1
    lte: new Date('2026-01-31'),   // To Jan 31
  },
}
```

You can combine `gte` and `lte` on the same field to create a range.

### ShopPulse Example — Stock Guard in Checkout

```typescript
// Only update if enough stock exists
await tx.productVariant.updateMany({
  where: {
    id: item.variantId,
    stockQuantity: { gte: item.quantity },  // At least N items in stock
  },
  data: {
    stockQuantity: { decrement: item.quantity },
  },
});
```

---

## 19. String Matching: `contains`, `startsWith`, `endsWith`

```typescript
where: {
  name: { contains: 'phone' },       // Name contains "phone" anywhere
  email: { endsWith: '@gmail.com' },  // Email ends with @gmail.com
  sku: { startsWith: 'TS-' },        // SKU starts with "TS-"
}
```

### Case-Insensitive Search

By default, PostgreSQL string comparisons are case-sensitive. Add `mode: 'insensitive'`:

```typescript
// From our orders search
where: {
  OR: [
    { id: { contains: search, mode: 'insensitive' } },
    { phone: { contains: search, mode: 'insensitive' } },
    { name: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
    { shippingPincode: { startsWith: search } },
  ],
}
```

**Performance note:** `contains` with `mode: 'insensitive'` generates `ILIKE '%term%'` in SQL. This does a full table scan — it cannot use indexes. For production search, consider PostgreSQL full-text search or a search service like Algolia/Meilisearch.

---

## 20. Compound Conditions: `AND`, `OR`, `NOT`

### OR — Match Any Condition

```typescript
// Search across multiple fields
where: {
  OR: [
    { name: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
    { phone: { contains: search } },
  ],
}
```

### AND — Match All Conditions (usually implicit)

Normally, multiple fields in `where` are implicitly ANDed:

```typescript
// These are equivalent:
where: { storeId: 'x', isPaid: true }
// Same as:
where: { AND: [{ storeId: 'x' }, { isPaid: true }] }
```

Explicit `AND` is needed when combining with `OR`:

```typescript
// From orders route — search + cursor pagination combined
where: {
  storeId,
  AND: [
    { OR: searchConditions },     // Match any search field
    cursorCondition,               // AND be after the cursor
  ],
}
```

This was one of our most complex where clauses — combining search (OR across 5 fields) with cursor pagination (OR across createdAt/id) using AND.

### NOT

```typescript
// Find shipments that are NOT cancelled or RTO
where: {
  NOT: [
    { status: 'CANCELLED' },
    { status: 'RTO_DELIVERED' },
  ],
}

// Or equivalently with notIn:
where: {
  status: {
    notIn: ['CANCELLED', 'RTO_DELIVERED'],
  },
}
```

---

## 21. Nested Where on Relations

Filter a parent based on conditions on its children:

```typescript
// Find stores that have at least one active subscription
const stores = await prismadb.store.findMany({
  where: {
    subscription: {
      status: 'ACTIVE',
    },
  },
});

// Find orders that have shipments (not cancelled)
const orders = await prismadb.order.findMany({
  where: {
    shipments: {
      some: {
        status: { notIn: ['CANCELLED', 'RTO_DELIVERED'] },
      },
    },
  },
});
```

---

## 22. Dynamic Where Building (Our Orders Filter Pattern)

Often, you build the `where` clause dynamically based on query parameters:

```typescript
// From orders route
const where: Prisma.OrderWhereInput = {
  storeId,
  orderStatus: { not: 'PAYMENT_INITIATED' },  // Always exclude
};

// Conditionally add status filter
if (status && VALID_DISPLAY_STATUSES.includes(status)) {
  where.orderStatus = status;  // Override the default exclusion
}

// Conditionally add date range
if (startDate || endDate) {
  where.createdAt = {};
  if (startDate) where.createdAt.gte = new Date(startDate);
  if (endDate) {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    where.createdAt.lte = endDateTime;
  }
}

// Conditionally add search
if (search) {
  where.OR = [
    { id: { contains: search, mode: 'insensitive' } },
    { name: { contains: search, mode: 'insensitive' } },
    // ... more fields
  ];
}

// Use the built-up where
const orders = await prismadb.order.findMany({ where, ... });
```

**Key pattern:** Start with a base `where` object typed as `Prisma.OrderWhereInput`, then conditionally add properties. TypeScript ensures you can only add valid filter fields.

### Spread Operator for Optional Filters

A cleaner alternative for simple cases:

```typescript
const products = await prismadb.product.findMany({
  where: {
    storeId,
    ...(categoryId && { categoryId }),                    // Only add if truthy
    ...(isFeatured !== undefined && { isFeatured }),      // Only add if defined
    ...(isArchived !== undefined && { isArchived }),
  },
});
```

`...(condition && { field: value })` — if condition is falsy, the spread does nothing. If truthy, it adds the property.

---

# Part D — Relations: select vs include

## 23. `include` — Loading Related Records

`include` loads all fields of a related record alongside the parent.

```typescript
const product = await prismadb.product.findUnique({
  where: { id: productId },
  include: {
    images: true,              // Load ALL image fields
    category: true,            // Load ALL category fields
    variants: true,            // Load ALL variant fields
  },
});
// product.images — Image[] with every column
// product.category — Category with every column
// product.variants — ProductVariant[] with every column
```

**`include: true`** = load all columns of that relation. No filtering.

### Nested Include

```typescript
const product = await prismadb.product.findUnique({
  where: { id: productId },
  include: {
    variants: {
      include: {
        size: true,      // Load size details for each variant
      },
      orderBy: { displayOrder: 'asc' },
    },
  },
});
// product.variants[0].size.name → "Color"
```

You can also filter the included records:

```typescript
include: {
  shipments: {
    where: {
      status: { notIn: ['CANCELLED', 'RTO_DELIVERED'] },
    },
    take: 1,  // Only get the first active shipment
  },
}
```

---

## 24. `select` — Cherry-Picking Fields

`select` returns ONLY the fields you specify. Everything else is excluded.

```typescript
const store = await prismadb.store.findFirst({
  where: { id: storeId, userId },
  select: { id: true },   // ONLY return the id
});
// store.id — exists
// store.name — TypeScript error! Not in the result.
```

### Select with Relations

```typescript
const order = await prismadb.order.findUnique({
  where: { id: orderId },
  select: {
    id: true,
    orderStatus: true,
    // Nested select on relation
    orderItems: {
      select: {
        productName: true,
        quantity: true,
        priceAtPurchase: true,
      },
    },
  },
});
```

---

## 25. Why You Can't Mix `include` and `select` at the Same Level

```typescript
// ❌ ERROR — Cannot mix include and select on the same query level
const product = await prismadb.product.findUnique({
  where: { id: productId },
  include: { images: true },
  select: { name: true },
});
```

**Why?** `select` means "return ONLY these fields." `include` means "return all fields PLUS these relations." They contradict each other.

**Solution:** Use `select` with nested relation selections:

```typescript
// ✅ CORRECT
const product = await prismadb.product.findUnique({
  where: { id: productId },
  select: {
    name: true,
    images: true,  // Include all image fields inside select
  },
});
```

---

## 26. Nested `select` Inside `include`

```typescript
// include the relation, but select only specific fields from it
include: {
  orderItems: {
    select: {
      id: true,
      productName: true,
      quantity: true,
      priceAtPurchase: true,
      lineTotal: true,
    },
  },
}
```

This is our most common pattern — include the relation but cherry-pick the fields we need.

---

## 27. Nested `include` Inside `select`

```typescript
// select specific parent fields, include full relations
select: {
  id: true,
  name: true,
  orderItems: {
    include: {
      product: true,   // Full product with all fields
    },
  },
}
```

---

## 28. Deep Nesting: 3+ Levels

```typescript
// Product → Variants → Size (3 levels)
const product = await prismadb.product.findUnique({
  where: { id },
  include: {
    images: true,
    category: true,
    variants: {
      include: {
        size: true,           // 3rd level
      },
      orderBy: { displayOrder: 'asc' },
    },
  },
});
// product.variants[0].size.name → "Ram Size"
```

```typescript
// Shipment → Order → OrderItems → Product (4 levels)
include: {
  order: {
    select: {
      id: true,
      name: true,
      orderItems: {
        select: {
          productName: true,
          quantity: true,
          product: {
            select: {
              sku: true,
            },
          },
        },
      },
    },
  },
}
```

**Warning:** Deep nesting creates complex JOINs in SQL. 4+ levels may have performance implications on large datasets.

---

## 29. Performance: When `select` Beats `include`

**Use `select` when:**
- You need only a few fields from a large model
- The response is sent to the frontend (minimize payload)
- The model has large text fields you don't need

**Use `include` when:**
- You need most/all fields
- You're in server-side code and will use most fields
- The model is small

```typescript
// BAD — fetches ALL 30+ Product fields when we only need id
const product = await prismadb.product.findUnique({
  where: { id },
  include: { images: true, variants: true, category: true },
});
// product has name, description, price, sellingPrice, weight, length, ...
// but we only use product.id

// GOOD — fetch only what we need
const product = await prismadb.product.findUnique({
  where: { id },
  select: { id: true },
});
```

---

# Part E — Relation Queries & Filtering

## 30. One-to-One Relations

In our schema, `Store` → `Subscription` is one-to-one:

```prisma
model Store {
  id           String        @id @default(uuid())
  subscription Subscription?
}

model Subscription {
  id      String @id @default(uuid())
  storeId String @unique
  store   Store  @relation(fields: [storeId], references: [id])
}
```

The `@unique` on `storeId` enforces one-to-one. Query:

```typescript
const store = await prismadb.store.findUnique({
  where: { id: storeId },
  include: { subscription: true },
});
// store.subscription — Subscription | null (not an array)
```

---

## 31. One-to-Many Relations

`Product` → `ProductVariant` is one-to-many:

```prisma
model Product {
  variants ProductVariant[]
}

model ProductVariant {
  productId String
  product   Product @relation(fields: [productId], references: [id])
}
```

Query:

```typescript
const product = await prismadb.product.findUnique({
  where: { id },
  include: {
    variants: {
      orderBy: { displayOrder: 'asc' },
    },
  },
});
// product.variants — ProductVariant[] (always an array)
```

---

## 32. Many-to-Many Relations (implicit and explicit)

We don't have explicit many-to-many in our schema, but Prisma supports them:

```prisma
// Implicit many-to-many (Prisma manages the join table)
model Post {
  tags Tag[]
}
model Tag {
  posts Post[]
}

// Explicit (you manage the join table)
model Product {
  categories ProductCategory[]
}
model ProductCategory {
  productId  String
  product    Product  @relation(...)
  categoryId String
  category   Category @relation(...)
  @@id([productId, categoryId])
}
```

Our schema uses one-to-many instead: `Product` belongs to one `Category`, not many.

---

## 33. Relation Filters: `some`, `every`, `none`

These filter a parent based on conditions on its children:

```typescript
// `some` — At least one child matches
// Find products that have AT LEAST ONE variant with stock > 0
const inStockProducts = await prismadb.product.findMany({
  where: {
    variants: {
      some: {
        stockQuantity: { gt: 0 },
      },
    },
  },
});

// `every` — ALL children must match
// Find products where ALL variants are out of stock
const allOutOfStock = await prismadb.product.findMany({
  where: {
    variants: {
      every: {
        stockQuantity: { lte: 0 },
      },
    },
  },
});

// `none` — NO child matches
// Find products with no variants at all
const noVariants = await prismadb.product.findMany({
  where: {
    variants: {
      none: {},
    },
  },
});
```

### ShopPulse Example — Subscription Status Filter

```typescript
// From cron — find stores where subscription hasn't been notified
where: {
  subscription: {
    status: { in: ['ACTIVE', 'TRIALING'] },
    // some nested condition
  },
}
```

---

## 34. `_count` — Counting Related Records Without Loading

Instead of loading all related records just to count them:

```typescript
// BAD — loads all shipments just to check count
const order = await prismadb.order.findUnique({
  where: { id: orderId },
  include: { shipments: true },
});
const hasShipment = order.shipments.length > 0;

// GOOD — count without loading data
const order = await prismadb.order.findUnique({
  where: { id: orderId },
  include: {
    _count: {
      select: { shipments: true },
    },
  },
});
const hasShipment = order._count.shipments > 0;
```

We use this in the order detail page:

```typescript
// From orders/[orderId]/page.tsx
include: {
  orderItems: { select: { ... } },
  _count: {
    select: { shipments: true },
  },
},
// ...
hasShipment: order._count.shipments > 0,
```

---

## 35. Relation `where` Inside `include`/`select`

You can filter which related records get loaded:

```typescript
// Load order with only non-cancelled shipments
const order = await prismadb.order.findUnique({
  where: { id: orderId },
  include: {
    shipments: {
      where: {
        status: {
          notIn: [ShipmentStatus.CANCELLED, ShipmentStatus.RTO_DELIVERED],
        },
      },
    },
  },
});
```

This filters the INCLUDED records, not the parent. The order is still returned even if it has no non-cancelled shipments (in that case, `order.shipments` is `[]`).

---

# Part F — Sorting & Pagination

## 36. `orderBy` — Single Field

```typescript
// Newest first
orderBy: { createdAt: 'desc' }

// Alphabetical
orderBy: { name: 'asc' }
```

---

## 37. `orderBy` — Multiple Fields

```typescript
// Sort by createdAt DESC, then by id DESC (tiebreaker)
orderBy: [
  { createdAt: 'desc' },
  { id: 'desc' },
],
```

Multi-field ordering is critical for stable pagination. If two orders have the same `createdAt`, the `id` tiebreaker ensures consistent ordering.

---

## 38. `orderBy` — Relation Fields

```typescript
// Sort products by their category's name
orderBy: {
  category: {
    name: 'asc',
  },
}

// Sort variants by display order within a product
include: {
  variants: {
    orderBy: { displayOrder: 'asc' },
  },
}
```

---

## 39. Offset Pagination: `skip` + `take`

```typescript
// Page 1: skip 0, take 10
const page1 = await prismadb.product.findMany({
  skip: 0,
  take: 10,
  orderBy: { createdAt: 'desc' },
});

// Page 2: skip 10, take 10
const page2 = await prismadb.product.findMany({
  skip: 10,
  take: 10,
  orderBy: { createdAt: 'desc' },
});
```

**Pros:** Simple, supports "jump to page 5."  
**Cons:** Gets slower as pages increase. `skip: 100000` means the DB reads and discards 100K rows. Not suitable for large datasets.

We use this for the shipments list:

```typescript
// From shipments API
const shipments = await prismadb.shipment.findMany({
  where: { storeId },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' },
});
```

---

## 40. Cursor-Based Pagination — The Superior Approach

Cursor pagination uses a unique value (the "cursor") to say "give me items after this point." It's O(1) regardless of which page you're on.

### The Basic Concept

```
Page 1: "Give me the first 10 orders"
Page 2: "Give me 10 orders after Order #abc123"
Page 3: "Give me 10 orders after Order #def456"
```

The cursor is the ID of the last item on the current page. The database uses an index to jump directly to that point.

### Prisma's Built-in Cursor

```typescript
// First page
const page1 = await prismadb.order.findMany({
  take: 10,
  orderBy: { createdAt: 'desc' },
});

// Next page — cursor is the last item's ID
const page2 = await prismadb.order.findMany({
  take: 10,
  skip: 1,  // Skip the cursor item itself
  cursor: { id: page1[page1.length - 1].id },
  orderBy: { createdAt: 'desc' },
});
```

---

## 41. The `take: limit + 1` hasMore Pattern

We fetch one extra record to know if there's a next page:

```typescript
const orders = await prismadb.order.findMany({
  where,
  take: limit + 1,  // Fetch 11 when limit is 10
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
});

const hasMore = orders.length > limit;  // If 11 returned, there's more
const results = hasMore ? orders.slice(0, limit) : orders;  // Show only 10
```

**Why?** Alternative approaches require a separate `count()` query, which is an extra database round-trip. The `limit + 1` trick gives us "has more?" information in the same query.

---

## 42. Bi-directional Cursor Pagination (Our Orders Pattern)

Our orders API supports both "next page" and "previous page" navigation. This is the most complex pagination pattern:

```typescript
// Build cursor condition based on direction
if (direction === 'next') {
  // Get orders BEFORE (older than) the cursor
  const cursorCondition: Prisma.OrderWhereInput = {
    OR: [
      { createdAt: { lt: cursorOrder.createdAt } },
      {
        createdAt: cursorOrder.createdAt,
        id: { lt: cursorOrder.id },
      },
    ],
  };
  where.AND = [cursorCondition];
  // orderBy: desc (normal order)
} else {
  // Get orders AFTER (newer than) the cursor
  const cursorCondition: Prisma.OrderWhereInput = {
    OR: [
      { createdAt: { gt: cursorOrder.createdAt } },
      {
        createdAt: cursorOrder.createdAt,
        id: { gt: cursorOrder.id },
      },
    ],
  };
  where.AND = [cursorCondition];
  // orderBy: asc (reverse), then reverse the results
}

const orders = await prismadb.order.findMany({
  where,
  orderBy: direction === 'prev'
    ? [{ createdAt: 'asc' }, { id: 'asc' }]      // Reverse for prev
    : [{ createdAt: 'desc' }, { id: 'desc' }],
  take: limit + 1,
});

// For 'prev', we fetched in ASC, so reverse for display
if (direction === 'prev') {
  results.reverse();
}
```

**Why the composite cursor (createdAt, id)?**  
Two orders can have the same `createdAt` timestamp (created in the same millisecond). Using only `createdAt` would skip or duplicate records. The `id` tiebreaker makes the cursor globally unique.

**Why the OR condition?**  
We need "orders where createdAt < cursor's createdAt, OR where createdAt equals cursor's createdAt BUT id < cursor's id." This handles the tiebreaker correctly.

---

# Part G — Aggregations & Grouping

## 43. `count` — Counting Records

```typescript
// Simple count
const productCount = await prismadb.product.count({
  where: { storeId, isArchived: false },
});

// Count is a number
console.log(`${productCount} active products`);
```

### Count with Conditions

```typescript
// From usage service — check order limit
const currentCount = await prismadb.usageOrders.findUnique({
  where: { userId_periodStart_periodEnd: { ... } },
});
return currentCount?.count ?? 0;
```

---

## 44. `aggregate` — sum, avg, min, max

```typescript
// Total variant stock for a product
const totalStock = await tx.productVariant.aggregate({
  where: { productId: item.productId },
  _sum: { stockQuantity: true },
});
// totalStock._sum.stockQuantity → number | null

// If null (no variants), default to 0
const stock = totalStock._sum.stockQuantity ?? 0;
```

We use this in our checkout to check if all variants are out of stock after a purchase:

```typescript
const allVariantsStock = await tx.productVariant.aggregate({
  where: { productId: product.id },
  _sum: { stockQuantity: true },
});
const totalStock = allVariantsStock._sum.stockQuantity || 0;
if (totalStock <= 0) {
  // Archive the product — all variants sold out
  await tx.product.update({
    where: { id: product.id },
    data: { isArchived: true, archivedReason: 'out_of_stock' },
  });
}
```

### Multiple Aggregations at Once

```typescript
const stats = await prismadb.order.aggregate({
  where: { storeId, isPaid: true },
  _count: true,
  _sum: { totalAmount: true },
  _avg: { totalAmount: true },
  _min: { totalAmount: true },
  _max: { totalAmount: true },
});
// stats._count → total paid orders
// stats._sum.totalAmount → Decimal (total revenue)
// stats._avg.totalAmount → Decimal (average order value)
```

---

## 45. `groupBy` — Grouping Results

```typescript
// Revenue by payment method
const revenueByMethod = await prismadb.order.groupBy({
  by: ['paymentMethod'],
  where: { storeId, isPaid: true },
  _count: true,
  _sum: { totalAmount: true },
});
// [
//   { paymentMethod: 'COD', _count: 45, _sum: { totalAmount: ... } },
//   { paymentMethod: 'PREPAID', _count: 78, _sum: { totalAmount: ... } },
// ]

// Orders by status
const ordersByStatus = await prismadb.order.groupBy({
  by: ['orderStatus'],
  where: { storeId },
  _count: true,
});
```

### `having` — Filter Groups

```typescript
// Categories with more than 10 products
const popularCategories = await prismadb.product.groupBy({
  by: ['categoryId'],
  _count: true,
  having: {
    categoryId: {
      _count: { gt: 10 },
    },
  },
});
```

---

## 46. `_count` on Relations (Alternative to Separate Query)

We already covered this in section 34, but it's also an aggregation concept:

```typescript
const categories = await prismadb.category.findMany({
  where: { storeId },
  include: {
    _count: {
      select: {
        products: true,        // Count of products per category
      },
    },
  },
});
// categories[0]._count.products → 15
```

This is more efficient than fetching all products and counting client-side.

---

# Part H — Transactions

## 47. Why Transactions? The ACID Guarantee

A database transaction ensures that a group of operations either ALL succeed or ALL fail. This prevents partial updates that leave your data in an inconsistent state.

**Real scenario from ShopPulse:**
1. Customer orders Product A (stock: 1)
2. Decrement stock: 1 → 0 ✅
3. Create order record — **DATABASE CRASHES** ❌

Without a transaction, stock is decremented but no order exists. The item is "gone" with no record of why. With a transaction, both operations roll back, and stock remains 1.

**ACID:**
- **A**tomicity — All or nothing
- **C**onsistency — DB stays in a valid state
- **I**solation — Concurrent transactions don't interfere
- **D**urability — Once committed, data survives crashes

---

## 48. Interactive Transactions: `$transaction(async (tx) => { ... })`

This is our primary transaction pattern — a function that receives a `tx` client:

```typescript
const result = await prismadb.$transaction(async (tx) => {
  // ALL operations inside use `tx` instead of `prismadb`

  // Step 1: Decrement stock
  const updated = await tx.productVariant.updateMany({
    where: { id: variantId, stockQuantity: { gte: quantity } },
    data: { stockQuantity: { decrement: quantity } },
  });

  if (updated.count === 0) {
    throw new Error('Out of stock');  // ← ROLLBACK! Everything undone.
  }

  // Step 2: Create order
  const order = await tx.order.create({
    data: { ... },
  });

  return order;  // ← COMMIT! Both operations persist.
});
```

**Critical rule:** Inside the transaction function, use `tx` for ALL database operations. If you use `prismadb` instead, those operations happen OUTSIDE the transaction.

**If any operation throws, the entire transaction rolls back.** This is how we ensure stock + order are always consistent.

### ShopPulse Example — Full Checkout Transaction

```typescript
const order = await prismadb.$transaction(async (tx) => {
  // 1. Atomically reduce stock (multiple items)
  for (const item of items) {
    if (product.hasVariants && item.variantId) {
      const updated = await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          stockQuantity: { gte: item.quantity },
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (updated.count === 0) throw new Error('Insufficient stock');

      // Check if product should be auto-archived
      const allStock = await tx.productVariant.aggregate({
        where: { productId: product.id },
        _sum: { stockQuantity: true },
      });
      if ((allStock._sum.stockQuantity ?? 0) <= 0) {
        await tx.product.update({
          where: { id: product.id },
          data: { isArchived: true, archivedReason: 'out_of_stock' },
        });
      }
    }
  }

  // 2. Create order with all items
  return await tx.order.create({
    data: {
      storeId,
      name, email, phone,
      // ... address fields
      orderItems: {
        create: items.map(item => ({
          productName: ...,
          productSku: ...,
          // ... all snapshot fields
        })),
      },
    },
  });
});
```

---

## 49. Sequential Transactions (Array Style)

For simpler cases where each operation is independent:

```typescript
const [users, posts] = await prismadb.$transaction([
  prismadb.user.findMany(),
  prismadb.post.findMany(),
]);
```

This runs both queries in a single database transaction. Less common in our codebase — we prefer interactive transactions for dependent operations.

---

## 50. Transaction Timeout and Max Wait

```typescript
await prismadb.$transaction(async (tx) => {
  // ...
}, {
  maxWait: 5000,   // Max time to wait for a free connection (ms)
  timeout: 10000,  // Max time the transaction can run (ms)
});
```

**Default timeout is 5 seconds.** For long transactions (like bulk stock restore), you may need to increase this.

---

## 51. Real Pattern: Our Stock Decrement + Order Creation

The complete pattern from checkout (simplified):

```typescript
// TRANSACTION: stock decrement + order creation are atomic
const order = await prismadb.$transaction(async (tx) => {
  // Phase 1: Reduce stock for EVERY item
  for (const item of validatedItems) {
    const product = productMap.get(item.productId)!;

    if (product.hasVariants && item.variantId) {
      // Variant: atomic conditional update
      const updated = await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          stockQuantity: { gte: item.quantity },  // GUARD
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        throw new Error(`Out of stock: ${product.name}`);
      }
    } else {
      // Base product: same pattern
      const updated = await tx.product.updateMany({
        where: {
          id: product.id,
          baseStockQuantity: { gte: item.quantity },
        },
        data: { baseStockQuantity: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        throw new Error(`Out of stock: ${product.name}`);
      }
    }
  }

  // Phase 2: Create order (only if ALL stock decrements succeeded)
  return tx.order.create({
    data: { /* ... */ },
  });
});
// If Phase 1 fails for ANY item → transaction rolls back → no stock changes
// If Phase 2 fails → transaction rolls back → stock is restored
```

---

## 52. Real Pattern: Our Expire-Unpaid-Orders Atomic Check

Race condition: A customer might pay at the exact moment the cron job tries to expire their order. We handle this with a re-check inside the transaction:

```typescript
const wasExpired = await prismadb.$transaction(async (tx) => {
  // Re-check order status inside the transaction
  const freshOrder = await tx.order.findUnique({
    where: { id: order.id },
    select: { orderStatus: true, isPaid: true },
  });

  // If paid between our findMany and this transaction → skip
  if (freshOrder?.isPaid || freshOrder?.orderStatus !== 'PAYMENT_INITIATED') {
    return false;  // Don't expire — it was paid
  }

  // Safe to expire: restore stock + mark as expired
  for (const item of order.orderItems) {
    // ... restore stock
  }

  await tx.order.update({
    where: { id: order.id },
    data: { orderStatus: 'EXPIRED' },
  });

  return true;
});
```

**The re-check pattern:** Even though we found the order as unpaid in our initial query, by the time we start the transaction, it might have been paid. The `findUnique` re-check inside `$transaction` uses the transaction's snapshot isolation to get the latest state.

---

## 53. Nested Writes as Implicit Transactions

When you use `create` with nested operations, Prisma wraps everything in an implicit transaction:

```typescript
// This is ALREADY a transaction — no $transaction wrapper needed
const product = await prismadb.product.create({
  data: {
    name: 'Phone',
    storeId,
    images: {
      createMany: { data: imageData },    // Creates images
    },
    variants: {
      createMany: { data: variantData },  // Creates variants
    },
  },
});
// If variant creation fails → product AND images are rolled back
```

You DON'T need `$transaction` for nested writes. Prisma handles it automatically.

---

# Part I — Atomic Operations

## 54. `increment` and `decrement` — Race-Condition-Safe Updates

### The Problem

```typescript
// ❌ DANGEROUS — Race condition
const variant = await prismadb.productVariant.findUnique({
  where: { id: variantId },
});
// At this point, variant.stockQuantity = 5

// Between read and write, another request also reads stock = 5
await prismadb.productVariant.update({
  where: { id: variantId },
  data: { stockQuantity: variant.stockQuantity - 1 },  // Sets to 4
});
// Other request also runs: sets to 4
// Expected: 3 (two purchases), Actual: 4 (one purchase lost)
```

### The Solution

```typescript
// ✅ SAFE — Atomic at database level
await prismadb.productVariant.update({
  where: { id: variantId },
  data: {
    stockQuantity: { decrement: 1 },
  },
});
```

Prisma translates this to: `UPDATE "ProductVariant" SET "stockQuantity" = "stockQuantity" - 1 WHERE id = $1`

The database handles the subtraction atomically — no read-modify-write race.

### increment in upsert

```typescript
// From usage tracking
await prismadb.usageOrders.upsert({
  where: { ... },
  create: { count: 1 },
  update: {
    count: { increment: 1 },  // Atomic increment
  },
});
```

### Our Combined Pattern: Conditional Decrement

```typescript
// BEST — combines conditional WHERE with atomic decrement
const updated = await tx.productVariant.updateMany({
  where: {
    id: item.variantId,
    stockQuantity: { gte: item.quantity },  // Only if enough stock
  },
  data: {
    stockQuantity: { decrement: item.quantity },
  },
});
// updated.count === 0 means insufficient stock
```

This is equivalent to: `UPDATE ... SET stock = stock - N WHERE id = ? AND stock >= N`

---

## 55. `multiply` and `divide`

Prisma also supports:

```typescript
await prismadb.product.update({
  where: { id },
  data: {
    price: { multiply: 1.1 },   // 10% price increase
  },
});

await prismadb.product.update({
  where: { id },
  data: {
    price: { divide: 2 },   // Halve the price
  },
});
```

We don't use these in ShopPulse, but they're available for bulk pricing operations.

---

## 56. Combining Atomic Ops with Conditional Where

Covered in section 54 — the `updateMany` + `gte` guard + `decrement` pattern. This is the gold standard for inventory management.

---

# Part J — Special Operations

## 57. JSON Fields: Reading, Writing, and Limitations

### Schema Definition

```prisma
model OrderItem {
  variantSnapshot Json?   // Nullable JSON field
}

model StoreIntegration {
  config Json?            // Non-sensitive config as JSON
}
```

### Writing JSON

```typescript
// From checkout — write variantSnapshot
await tx.order.create({
  data: {
    orderItems: {
      create: [{
        variantSnapshot: variant ? {
          variantId: variant.id,
          sizeName: variant.size.name,
          sizeValue: variant.size.value,
          sku: variant.sku,
          weight: Number(variant.weight),
          length: Number(variant.length),
          breadth: Number(variant.breadth),
          height: Number(variant.height),
        } : undefined,
      }],
    },
  },
});
```

`undefined` for a JSON field = `null` in the database.

### Reading JSON

Prisma returns JSON fields as `JsonValue` (basically `unknown`). You must cast:

```typescript
// Reading variantSnapshot
const vs = item.variantSnapshot as {
  variantId: string;
  sizeName: string;
  sizeValue: string;
  sku: string;
  weight: number;
  length: number;
  breadth: number;
  height: number;
} | null;

if (vs?.variantId) {
  // Use typed values
  console.log(vs.sizeName, vs.sizeValue);
}
```

### Limitations

**Prisma CANNOT filter on JSON field contents in `where` clauses** (for PostgreSQL with standard Prisma). You cannot do:

```typescript
// ❌ NOT SUPPORTED
where: {
  variantSnapshot: {
    path: ['sizeName'],
    equals: 'Color',
  },
}
```

For JSON filtering, you'd need `$queryRaw` or a dedicated column instead of JSON.

---

## 58. Decimal Fields: The `.toString()` Conversion Pattern

Prisma's `Decimal` is NOT a JavaScript `number`. It wraps the PostgreSQL `NUMERIC` type for exact precision.

### The Problem

```typescript
// ❌ Sending Decimal to API response
res.json({ price: product.price });
// Client receives: { price: { "s": 1, "e": 2, "d": [99, 99] } }  ← garbage!
```

### The Solution

```typescript
// ✅ Convert before sending
res.json({
  price: product.price ? parseFloat(product.price.toString()) : 0,
});
// Client receives: { price: 99.99 }
```

### Our Standard Pattern

```typescript
// From order detail API — serializing multiple Decimal fields
const baseItem = {
  priceAtPurchase: item.priceAtPurchase
    ? parseFloat(item.priceAtPurchase.toString())
    : 0,
  productMrp: item.productMrp
    ? parseFloat(item.productMrp.toString())
    : 0,
  lineTotal: item.lineTotal
    ? parseFloat(item.lineTotal.toString())
    : 0,
  snapshotWeight: item.snapshotWeight
    ? parseFloat(item.snapshotWeight.toString())
    : 0,
};
```

### When to Use `Number()` vs `parseFloat(x.toString())`

Both work, but:

```typescript
Number(decimal)              // Simpler, works for Prisma Decimal
parseFloat(decimal.toString()) // More explicit, universally safe
```

We use both interchangeably. For consistency, pick one. `Number()` is slightly more concise.

---

## 59. DateTime Comparisons and Ranges

```typescript
// Orders from the last 24 hours
where: {
  createdAt: {
    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
}

// Orders in a specific date range
where: {
  createdAt: {
    gte: new Date('2026-01-01'),
    lte: new Date('2026-01-31T23:59:59.999Z'),
  },
}

// Orders older than 30 minutes (for expiry)
const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
where: {
  createdAt: { lt: thirtyMinAgo },
}
```

---

## 60. Null Handling

```typescript
// Find records where field IS null
where: { sellingPrice: null }

// Find records where field is NOT null
where: { sellingPrice: { not: null } }

// Setting a field to null in an update
data: { archivedReason: null }
```

### Optional Fields and Defaults

In schema:
```prisma
sellingPrice Decimal?        // Optional — null by default
isArchived   Boolean @default(false)  // Required with default
```

When creating:
```typescript
// sellingPrice is optional — omitting it = null
prismadb.product.create({
  data: { name: 'Phone', price: 999 },
  // sellingPrice will be null
  // isArchived will be false (from @default)
});
```

---

## 61. `connectOrCreate`, `connect`, `disconnect` — Relation Management

### `connect` — Link to Existing Record

```typescript
// Link a product to an existing category
await prismadb.product.update({
  where: { id: productId },
  data: {
    category: {
      connect: { id: categoryId },
    },
  },
});
```

### `connectOrCreate` — Link or Create

```typescript
// From onboarding — connect to existing store or create new
await prismadb.subscription.create({
  data: {
    store: {
      connectOrCreate: {
        where: { id: storeId },
        create: { name: storeName, userId },
      },
    },
    plan: 'STARTER',
    status: 'TRIALING',
  },
});
```

### `disconnect` — Remove Relationship

```typescript
// Remove product from category (if FK is optional)
await prismadb.product.update({
  where: { id: productId },
  data: {
    category: { disconnect: true },  // Sets categoryId to null
  },
});
```

### `set` — Replace Entire List

```typescript
// Replace all tags on a post (many-to-many)
await prismadb.post.update({
  where: { id: postId },
  data: {
    tags: {
      set: [{ id: 'tag1' }, { id: 'tag2' }],
    },
  },
});
```

---

## 62. `set` — Replacing Relation Lists

The `set` operation disconnects all existing relations and connects only the specified ones:

```typescript
// Before: product has tags [A, B, C]
await prismadb.product.update({
  where: { id },
  data: {
    tags: {
      set: [{ id: 'B' }, { id: 'D' }],
    },
  },
});
// After: product has tags [B, D]
```

We don't use many-to-many in ShopPulse, so `set` isn't directly used. But it's important to know.

---

# Part K — Error Handling

## 63. P2002 — Unique Constraint Violation

**When:** You try to insert/update a record that would violate a `@unique` or `@@unique` constraint.

### ShopPulse Example — SKU Uniqueness

```typescript
// From products POST route
try {
  const product = await prismadb.product.create({
    data: { storeId, sku: 'SKU-001', ... },
  });
} catch (error) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    // Extract which field(s) caused the violation
    const target = (error.meta?.target as string[]) || [];

    if (target.includes('sku')) {
      return NextResponse.json(
        { error: `SKU "${sku}" is already in use in this store.` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'A unique constraint was violated.' },
      { status: 409 }
    );
  }
  throw error;  // Re-throw if it's not a P2002
}
```

**`error.meta.target`** tells you which unique constraint was violated. For `@@unique([storeId, sku])`, target would be `['storeId', 'sku']`.

---

## 64. P2003 — Foreign Key Constraint Failure

**When:** You try to create a record with a foreign key that doesn't exist:

```typescript
await prismadb.product.create({
  data: {
    categoryId: 'non-existent-id',  // ← P2003!
    // ...
  },
});
```

**Handle:** Validate that the related record exists before creating:

```typescript
const category = await prismadb.category.findUnique({
  where: { id: categoryId },
});
if (!category) {
  return new NextResponse('Category not found', { status: 400 });
}
```

---

## 65. P2025 — Record Not Found

**When:** `update`, `delete`, or `findUniqueOrThrow` can't find the record:

```typescript
// update throws P2025 if no record matches
await prismadb.product.update({
  where: { id: 'non-existent' },
  data: { name: 'New' },
});
// → PrismaClientKnownRequestError: P2025
// "An operation failed because it depends on one or more records that were required but not found."
```

**Handle:**

```typescript
try {
  await prismadb.product.update({ where: { id }, data });
} catch (error) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    return new NextResponse('Product not found', { status: 404 });
  }
  throw error;
}
```

**Prevention:** Use `findUnique` first, then `update` only if found:

```typescript
const product = await prismadb.product.findUnique({ where: { id } });
if (!product) {
  return new NextResponse('Not found', { status: 404 });
}
await prismadb.product.update({ where: { id }, data });
```

---

## 66. Unknown Errors: Wrapping Prisma Calls

Our standard error handling pattern:

```typescript
try {
  // ... Prisma operations
} catch (error) {
  // Known Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json({ error: 'Duplicate entry' }, { status: 409 });
      case 'P2025':
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      default:
        logger.error('Prisma error', { code: error.code, meta: error.meta });
    }
  }

  // Unknown errors
  logger.error('Unexpected error', {
    error: error instanceof Error ? error.message : 'Unknown',
  });
  return new NextResponse('Internal error', { status: 500 });
}
```

---

## 67. Retry Patterns for Transient Failures

Database connections can momentarily fail (network blip, connection pool exhaustion). A simple retry:

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 100
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // Only retry on connection errors, not logic errors
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2003', 'P2025'].includes(error.code)
      ) {
        throw error;  // Don't retry unique violation — it'll fail again
      }

      await new Promise(r => setTimeout(r, delay * attempt));
    }
  }
  throw new Error('Unreachable');
}

// Usage
const product = await withRetry(() =>
  prismadb.product.findUnique({ where: { id } })
);
```

---

# Part L — Performance & Best Practices

## 68. Select Only What You Need

```typescript
// ❌ Over-fetching — loads ALL 30+ Product fields
const products = await prismadb.product.findMany({
  where: { storeId },
});

// ✅ Minimal — only what the list page needs
const products = await prismadb.product.findMany({
  where: { storeId },
  select: {
    id: true,
    name: true,
    price: true,
    isArchived: true,
    images: { select: { url: true }, take: 1 },
  },
});
```

Rule of thumb: API routes that send data to the frontend should use `select`. Server-side logic that needs most fields can use `include`.

---

## 69. Index Design: When and What to Index

### What Are Indexes?

An index is like a book's index — instead of reading every page to find "Chapter 5," you look at the index which says "Chapter 5: page 47" and jump directly there.

Without an index, `WHERE storeId = 'abc'` does a **full table scan** — reads every row. With an index, it's an instant lookup.

### Our Schema Indexes

```prisma
model OrderItem {
  @@index([orderId])     // Fast: "get all items for this order"
  @@index([productId])   // Fast: "find order items for this product"
}

model Product {
  @@index([storeId])     // Fast: "get all products for this store"
  @@unique([storeId, sku]) // Fast unique lookup + enforces uniqueness
}

model ProductVariant {
  @@index([productId])       // Fast: "get variants for this product"
  @@index([sizeId])          // Fast: joins with Size table
  @@index([stockQuantity])   // Fast: "find low-stock variants"
  @@unique([productId, sizeId]) // One variant per size per product
}
```

### When to Add an Index

Add an index on any column that appears in:
- `where` clauses (frequently queried)
- `orderBy` clauses (sort performance)
- JOIN operations (foreign keys — usually auto-indexed)
- `unique` constraints (auto-indexed)

### When NOT to Add an Index

- Write-heavy tables with few reads (indexes slow down inserts/updates)
- Low-cardinality columns (e.g., `isArchived` — only true/false, index doesn't help much)
- Tiny tables (< 1000 rows — full scan is fast enough)

---

## 70. N+1 Problem and How `include` Solves It

### The Problem

```typescript
// ❌ N+1 queries
const orders = await prismadb.order.findMany({ where: { storeId } });

for (const order of orders) {
  // This runs ONE query PER order!
  const items = await prismadb.orderItem.findMany({
    where: { orderId: order.id },
  });
}
// 1 query for orders + N queries for items = N+1 queries
```

### The Solution

```typescript
// ✅ 2 queries total (Prisma handles the JOIN)
const orders = await prismadb.order.findMany({
  where: { storeId },
  include: {
    orderItems: true,  // Loaded in a single query
  },
});
```

Prisma translates `include` into an efficient SQL JOIN or a secondary query with `IN (...)` for the related records.

### Using `in` for Manual Batching

When you can't use `include` (e.g., different models):

```typescript
// Get all product IDs from order items
const productIds = orderItems
  .filter(item => !item.product && item.productId)
  .map(item => item.productId!);

// ONE query for all archived products (not N queries)
const archived = await prismadb.archivedProduct.findMany({
  where: { originalProductId: { in: productIds } },
});
```

---

## 71. Batch Operations vs Loops

```typescript
// ❌ SLOW — N separate INSERT statements
for (const image of images) {
  await prismadb.image.create({
    data: { url: image.url, productId },
  });
}

// ✅ FAST — 1 INSERT statement with multiple values
await prismadb.image.createMany({
  data: images.map(img => ({ url: img.url, productId })),
});
```

Similarly for updates:

```typescript
// ❌ N UPDATE statements
for (const id of idsToArchive) {
  await prismadb.product.update({
    where: { id },
    data: { isArchived: true },
  });
}

// ✅ 1 UPDATE statement
await prismadb.product.updateMany({
  where: { id: { in: idsToArchive } },
  data: { isArchived: true },
});
```

---

## 72. Connection Pool Tuning

### Default Settings

Prisma's connection pool defaults:
- **Pool size:** `num_cpus * 2 + 1` (e.g., 5 on a 2-core machine)
- **Pool timeout:** 10 seconds

### When to Tune

If you see: `Error: Timed out waiting for a free connection`

```
// In DATABASE_URL:
DATABASE_URL="postgresql://...?connection_limit=20&pool_timeout=30"
```

### Serverless Considerations (Vercel)

Serverless functions create new PrismaClient instances per cold start. With many concurrent functions, you can exhaust database connections. Solutions:

1. **PgBouncer** — Connection pooler between Prisma and PostgreSQL
2. **Prisma Accelerate** — Managed connection pooler
3. Reduce `connection_limit` per function: `?connection_limit=5`

---

## 73. Query Logging for Debugging

To see the SQL that Prisma generates:

```typescript
const prismadb = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

Output:

```
prisma:query SELECT "Product"."id", "Product"."name" FROM "Product" WHERE "Product"."storeId" = $1
prisma:query Duration: 3ms
```

For development debugging only — disable in production (too noisy).

---

# Part M — Real ShopPulse Query Patterns (Case Studies)

## 74. Pattern: Safe Stock Decrement

**Problem:** Two customers buy the last item simultaneously.

**Solution:** Atomic conditional update inside a transaction.

```typescript
await prismadb.$transaction(async (tx) => {
  // Atomic: decrement ONLY if enough stock
  const updated = await tx.productVariant.updateMany({
    where: {
      id: variantId,
      stockQuantity: { gte: quantityToBuy },
    },
    data: {
      stockQuantity: { decrement: quantityToBuy },
    },
  });

  // If count is 0 → insufficient stock → abort
  if (updated.count === 0) {
    throw new Error('Insufficient stock');
  }

  // Stock is secured, now create the order
  return tx.order.create({ data: orderData });
});
```

**SQL equivalent:**
```sql
UPDATE "ProductVariant"
SET "stockQuantity" = "stockQuantity" - 2
WHERE "id" = 'xxx' AND "stockQuantity" >= 2;
-- Returns 1 if updated, 0 if insufficient
```

---

## 75. Pattern: Cursor-Based Pagination with Search + Filters

**Problem:** Orders list needs search, status filter, date range, and pagination working together.

**Solution:** Dynamic where clause with compound AND/OR:

```typescript
const where: Prisma.OrderWhereInput = { storeId };

// Layer 1: Default filter
where.orderStatus = { not: 'PAYMENT_INITIATED' };

// Layer 2: Status override (optional)
if (status) where.orderStatus = status;

// Layer 3: Date range (optional)
if (startDate || endDate) {
  where.createdAt = {};
  if (startDate) where.createdAt.gte = new Date(startDate);
  if (endDate) where.createdAt.lte = endOfDay(endDate);
}

// Layer 4: Search (optional)
if (search) {
  where.OR = [
    { id: { contains: search, mode: 'insensitive' } },
    { name: { contains: search, mode: 'insensitive' } },
    { phone: { contains: search, mode: 'insensitive' } },
  ];
}

// Layer 5: Cursor pagination (if navigating pages)
if (cursor) {
  const cursorOrder = await prismadb.order.findUnique({
    where: { id: cursor },
    select: { createdAt: true, id: true },
  });

  if (cursorOrder) {
    const cursorCondition = {
      OR: [
        { createdAt: { lt: cursorOrder.createdAt } },
        { createdAt: cursorOrder.createdAt, id: { lt: cursorOrder.id } },
      ],
    };

    // Merge search OR + cursor into AND
    if (search && where.OR) {
      where.AND = [{ OR: where.OR }, cursorCondition];
      delete where.OR;
    } else {
      where.AND = [cursorCondition];
    }
  }
}

// Execute with limit+1 for hasMore detection
const orders = await prismadb.order.findMany({
  where,
  take: limit + 1,
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
});
```

---

## 76. Pattern: Pre-Fetching Archives for O(1) Lookup

**Problem:** For each order item, check if the product was deleted and archived. N+1 if done in a loop.

**Solution:** Batch-fetch, then Map:

```typescript
// Step 1: Identify deleted products
const deletedProductIds = order.orderItems
  .filter(item => !item.product && item.productId)
  .map(item => item.productId as string);

// Step 2: ONE query for all archived products
const archivedProducts = deletedProductIds.length > 0
  ? await prismadb.archivedProduct.findMany({
      where: { originalProductId: { in: deletedProductIds } },
    })
  : [];

// Step 3: Create a Map for O(1) lookup
const archivedMap = new Map(
  archivedProducts.map(ap => [ap.originalProductId, ap])
);

// Step 4: Use the map in the transform
order.orderItems.map(item => {
  if (item.product) return { ...item, status: 'available' };

  const archived = archivedMap.get(item.productId!);
  if (archived) return { ...item, status: 'archived', archived };

  return { ...item, status: 'deleted' };
});
```

---

## 77. Pattern: Idempotency Guard

**Problem:** Auto-ship might fire twice (from verify route + webhook + cron). Creating duplicate shipments wastes money.

**Solution:** Check for existing auto-shipment before proceeding:

```typescript
const order = await prismadb.order.findUnique({
  where: { id: orderId },
  include: {
    shipments: {
      where: { isAutoShipped: true },
      take: 1,
    },
  },
});

// Already auto-shipped → skip
if (order.shipments.length > 0) {
  return { success: true, skipped: true, reason: 'Already auto-shipped' };
}
```

---

## 78. Pattern: Cascading Deletes vs SetNull

**Our schema decisions:**

```prisma
// Cascade: Deleting a store erases everything
model Order {
  store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)
}

// SetNull: Deleting a product preserves the order item
model OrderItem {
  product Product? @relation(fields: [productId], references: [id], onDelete: SetNull)
}
```

**Why SetNull for OrderItem?** If we used Cascade, deleting a product would delete all order items referencing it. Orders would lose their line items. SetNull preserves the order item and sets `productId` to null — we still have the snapshot data (productName, priceAtPurchase, etc.).

**The Priority Chain for Data Display:**
1. **Live Product exists** (`item.product` is not null) → Show current product data
2. **Archived Product exists** → Show archived snapshot
3. **Neither exists** → Show OrderItem snapshot (productName, etc.) — this is always available

---

## 79. Pattern: Dynamic Sort by Multiple Criteria

From our products API — sort by different criteria:

```typescript
const products = await prismadb.product.findMany({
  where: { storeId },
  orderBy: [
    { isFeatured: 'desc' },    // Featured products first
    { createdAt: 'desc' },      // Then newest
  ],
});
```

If you need to sort by a computed value or multiple different sort options:

```typescript
// Dynamic sort based on query param
const sortField = searchParams.get('sort') || 'createdAt';
const sortDir = searchParams.get('dir') || 'desc';

const orderBy: Prisma.ProductOrderByWithRelationInput = {
  [sortField]: sortDir,
};

const products = await prismadb.product.findMany({
  where: { storeId },
  orderBy,
});
```

---

## 80. Pattern: JSON Snapshot for Denormalization

**Problem:** OrderItem had a `variantId` FK pointing to ProductVariant. If the variant is deleted/modified after purchase, the order history becomes incorrect.

**Solution:** Snapshot ALL variant data as JSON at purchase time:

```typescript
// At checkout — capture everything we'll ever need
variantSnapshot: variant ? {
  variantId: variant.id,        // For stock restore (expire-unpaid cron)
  sizeName: variant.size.name,  // "Ram Size", "Color"
  sizeValue: variant.size.value, // "8GB", "Blue"
  sku: variant.sku,              // "TS-BLU-8GB"
  weight: Number(variant.weight),
  length: Number(variant.length),
  breadth: Number(variant.breadth),
  height: Number(variant.height),
} : undefined,
```

**Reading the snapshot later:**

```typescript
// In expire-unpaid-orders cron — restore stock
const vs = item.variantSnapshot as { variantId?: string } | null;

if (vs?.variantId) {
  await tx.productVariant.update({
    where: { id: vs.variantId },
    data: { stockQuantity: { increment: item.quantity } },
  });
}
```

**Trade-offs:**
- ✅ Order history is immutable — product changes don't affect past orders
- ✅ Auto-ship uses correct dimensions even if product dims change
- ✅ No JOIN needed to display order details
- ❌ Data duplication (small — each snapshot is ~200 bytes)
- ❌ Can't query "find all orders with variant Color=Blue" without raw SQL

---

## Quick Reference Card

| Task | Method | Key Feature |
|------|--------|-------------|
| Get one by unique key | `findUnique` | Exact lookup |
| Get first match | `findFirst` | Any condition |
| Get many | `findMany` | Filter, sort, paginate |
| Create one | `create` | Nested creates |
| Create many | `createMany` | Bulk insert, no return |
| Update one | `update` | By unique key |
| Update many | `updateMany` | By any condition |
| Create or update | `upsert` | Atomic, no race |
| Delete one | `delete` | Returns deleted |
| Delete many | `deleteMany` | By condition |
| Count | `count` | Efficient aggregation |
| Aggregate | `aggregate` | sum, avg, min, max |
| Group | `groupBy` | Like SQL GROUP BY |
| Transaction | `$transaction` | Atomic multi-op |
| Raw SQL | `$queryRaw` | Escape hatch |

| Operator | SQL Equivalent | Example |
|----------|---------------|---------|
| `equals` | `=` | `{ name: 'Phone' }` |
| `not` | `!=` | `{ status: { not: 'CANCELLED' } }` |
| `in` | `IN (...)` | `{ id: { in: ids } }` |
| `notIn` | `NOT IN` | `{ status: { notIn: ['A', 'B'] } }` |
| `lt` | `<` | `{ createdAt: { lt: date } }` |
| `lte` | `<=` | `{ stock: { lte: 5 } }` |
| `gt` | `>` | `{ price: { gt: 100 } }` |
| `gte` | `>=` | `{ stock: { gte: qty } }` |
| `contains` | `LIKE '%x%'` | `{ name: { contains: 'phone' } }` |
| `startsWith` | `LIKE 'x%'` | `{ sku: { startsWith: 'TS-' } }` |
| `endsWith` | `LIKE '%x'` | `{ email: { endsWith: '@gmail.com' } }` |
| `AND` | `AND` | `{ AND: [cond1, cond2] }` |
| `OR` | `OR` | `{ OR: [cond1, cond2] }` |
| `NOT` | `NOT` | `{ NOT: { status: 'X' } }` |
| `increment` | `col = col + N` | `{ stock: { increment: 1 } }` |
| `decrement` | `col = col - N` | `{ stock: { decrement: 1 } }` |

---

> **Congratulations!** You now know every Prisma pattern used in ShopPulse Admin and the theory behind each one. This document covers the full surface area from basic CRUD to advanced cursor pagination, transactions, atomic operations, and real production patterns.
