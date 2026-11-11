# Database Migration Mastery — Beginner to Production-Confident

> Every concept is taught assuming zero prior knowledge, then escalates to real-world production scenarios. All examples use our ShopPulse Admin codebase.

---

# PART A — FOUNDATIONS (What & Why)

---

## 1. What Is a Database Migration?

A **migration** is a versioned script that describes a change to your database schema. Think of it as a "git commit" for your database structure.

**Without migrations:**
```
Developer A: "I added a column called `sku` to Products."
Developer B: "When? What type? Is it nullable? I don't have it on my machine."
Developer A: "Uh... just run ALTER TABLE in pgAdmin."
```

**With migrations:**
```
Developer A creates migration file: 20260216_add_sku_to_products.sql
Content:  ALTER TABLE "Product" ADD COLUMN "sku" TEXT NOT NULL;
Developer B pulls the repo, runs migrate. Done.
```

### Why Migrations Exist (The 4 Problems They Solve)

| Problem | Without Migrations | With Migrations |
|---------|-------------------|-----------------|
| **Reproducibility** | "Works on my machine" — each dev's DB is different | Every dev runs the same sequence of changes |
| **Version Control** | Schema changes are invisible to git | Each change is a tracked file |
| **Collaboration** | "Did you add that column?" | `git pull` + `migrate` = synced |
| **Production Safety** | Manual SQL on live DB = risk of typo | Tested scripts applied in order |

### The Core Idea

Your database schema evolves over time:

```
v1: Users table (id, name, email)
v2: Users table (id, name, email, phone)      ← Added phone
v3: Users table (id, name, email, phone, sku)  ← Added sku
v4: Users table (id, name, email, phone)       ← Removed sku (mistake)
```

Each step (v1→v2, v2→v3, v3→v4) is a **migration**. The history of all migrations, applied in order, produces the current schema.

---

## 2. Why Not Just Modify the Database Directly?

You might think: "Why not just use pgAdmin, click 'Add Column', and be done?"

### Reason 1: No History
If you add a column directly, there's no record of *when*, *why*, or *who* did it. Six months later, you'll stare at a mysterious column called `tmp_flag` with no idea what it's for.

### Reason 2: No Reproducibility
Your local DB has the column, but your colleague's doesn't. Production doesn't. Staging doesn't. You'd need to manually run the same SQL on every environment.

### Reason 3: No Rollback Path
You added a column and broke the app. How do you undo it? With migrations, you have a clear before/after.

### Reason 4: Ordering Matters
Migration A adds a table. Migration B adds a foreign key pointing to that table. If you apply B before A, it fails. Migrations enforce order.

### The Rule
> **Never modify the database directly in development. Always go through migrations.**

The only exception: emergency production hotfixes (and even then, you create a migration afterward to match).

---

## 3. Prisma Migration Architecture

Prisma's migration system has three key components:

### Component 1: The `prisma/migrations/` Folder

```
prisma/
  migrations/
    20260115120000_initial_setup/
      migration.sql
    20260216195318_add_variant_shipping_dimensions/
      migration.sql
    20260216202840_add_unique_store_sku_constraint/
      migration.sql
    20260216212600_add_variant_is_default/
      migration.sql
    migration_lock.toml        ← Locks the DB provider (postgresql)
```

Each folder is a **migration**:
- **Name format:** `YYYYMMDDHHMMSS_description`
- **Content:** A `migration.sql` file with raw SQL (not Prisma schema language — actual SQL!)
- **Immutable:** Once applied, you must NEVER edit a migration file

### Component 2: The Shadow Database

When you run `prisma migrate dev`, Prisma creates a **temporary shadow database** to:
1. Replay all existing migrations from scratch (to detect drift)
2. Compare the result with your current `schema.prisma`
3. Generate new SQL for any differences
4. Drop the shadow database

This is why `migrate dev` is for **development only** — it needs permission to create/drop databases.

```
[Your Dev DB] ← migrate dev applies changes here
[Shadow DB]   ← temporary, used for diff calculation, then dropped
```

### Component 3: The `_prisma_migrations` Table

Prisma creates a table in your database called `_prisma_migrations`:

```sql
SELECT * FROM _prisma_migrations;

-- id                  | checksum    | migration_name                     | applied_at
-- abc123...           | sha256_hash | 20260115120000_initial_setup       | 2026-01-15 12:00:05
-- def456...           | sha256_hash | 20260216195318_add_variant_dims    | 2026-02-16 19:53:25
```

Key fields:
- **migration_name**: Matches the folder name
- **checksum**: SHA-256 of the migration.sql content (detects tampering)
- **applied_at**: When this migration was applied
- **rolled_back_at**: NULL unless manually resolved

Prisma compares this table against the `prisma/migrations/` folder to know:
- Which migrations have been applied
- Which are pending
- Whether any applied migrations have been modified (checksum mismatch)

---

## 4. Migration Lifecycle

### Development Flow: `prisma migrate dev`

```
1. You edit schema.prisma
2. Run: npx prisma migrate dev --name describe_your_change
3. Prisma creates shadow DB → replays existing migrations → diffs against your schema
4. Generates new migration.sql in prisma/migrations/
5. Applies it to your dev database
6. Runs prisma generate (updates the Prisma Client)
```

### Production Flow: `prisma migrate deploy`

```
1. Your CI/CD pipeline (or you manually) runs: npx prisma migrate deploy
2. Prisma reads _prisma_migrations table
3. Applies any PENDING migration files (in timestamp order)
4. Does NOT use shadow database (no create/drop permissions needed)
5. Does NOT generate new migrations
```

Key difference:
| | `migrate dev` | `migrate deploy` |
|---|---|---|
| Creates new migrations? | Yes | No |
| Uses shadow database? | Yes | No |
| Runs `prisma generate`? | Yes | No |
| Safe for production? | No | Yes |
| Detects drift? | Yes | No (fails on error) |

### Checking Status: `prisma migrate status`

```bash
npx prisma migrate status

# Output:
# 4 migrations found in prisma/migrations
# All migrations have been applied.
```

Or if something is wrong:
```
# The last common migration is: 20260216195318_add_variant_dims
# The following migration(s) have not been applied:
#   20260216212600_add_variant_is_default
```

---

## 5. The Migration Folder Anatomy

Let's look at a real migration from our project:

```
prisma/migrations/20260216202840_add_unique_store_sku_constraint/
  migration.sql
```

Content of `migration.sql`:
```sql
-- CreateIndex
CREATE UNIQUE INDEX "Product_storeId_sku_key" ON "Product"("storeId", "sku");
```

That's it. Raw SQL. Prisma generates this from the diff between your old schema and new schema.

### What Happens If You Edit migration.sql After Applying?

Prisma stores the SHA-256 checksum. If you modify the file:

```
Error: The migration `20260216202840_add_unique_store_sku_constraint` was modified after it was applied.
```

**Rule:** Never edit applied migrations. If you need to change something, create a new migration.

### The Lock File: `migration_lock.toml`

```toml
# Please do not edit this file manually
provider = "postgresql"
```

This prevents accidentally switching database providers (e.g., from PostgreSQL to MySQL) mid-project.

---

# PART B — SCHEMA CHANGE CLASSIFICATION

---

## 6. Safe Changes (Always Work, Zero Risk)

These changes will NEVER fail, regardless of existing data:

| Change | Why It's Safe | Example |
|--------|--------------|---------|
| Add a new table | No existing data to conflict | `model ArchivedProduct { ... }` |
| Add a nullable column | Existing rows get NULL | `phone String?` |
| Add a column with a default | Existing rows get the default | `isDefault Boolean @default(false)` |
| Add an index | Just builds an index on existing data | `@@index([storeId])` |
| Remove an index | Just drops the index | Remove `@@index(...)` |
| Add a relation (nullable FK) | Existing rows get NULL FK | `product Product? @relation(...)` |

### Example from ShopPulse:

Adding `isDefault` to `ProductVariant`:
```prisma
model ProductVariant {
  // ...existing fields...
  isDefault Boolean @default(false)  // ← SAFE: has default value
}
```

Migration SQL:
```sql
ALTER TABLE "ProductVariant" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
```

Every existing variant gets `isDefault = false`. No error possible.

---

## 7. Risky Changes (Need Care, Data-Dependent)

These changes **might** fail depending on your existing data:

| Change | Risk | When It Fails |
|--------|------|---------------|
| Make a column NOT NULL | Existing NULL values | If any row has NULL in that column |
| Add a unique constraint | Existing duplicates | If any two rows have the same value |
| Change column type | Incompatible data | If existing data can't convert (e.g., "abc" → INT) |
| Reduce column size | Data too long | If existing strings exceed new max length |
| Add a FK constraint | Orphan records | If existing values don't match referenced table |

### Example from ShopPulse — What We Just Hit:

```
⚠️ We found changes that cannot be executed:
  • Made the column `productSku` on table `OrderItem` required,
    but there are 51 existing NULL values.
```

Our existing 51 OrderItems have `productSku = NULL` because the column didn't exist before. Now we're making it `NOT NULL`, and Prisma can't figure out what to put there.

---

## 8. Destructive Changes (Data Loss Without Manual Intervention)

These changes **will lose data** if applied carelessly:

| Change | What's Lost | Reversible? |
|--------|------------|-------------|
| Drop a column | All data in that column | NO (unless you backed up) |
| Drop a table | All data in that table | NO |
| Drop a relation | The FK column data | Depends |
| Rename a column | Prisma treats it as drop + add | NO (data lost unless you use raw SQL) |
| Rename a table | Same as above | NO |

### Critical Prisma Behavior: Renames = Drop + Create

Prisma has NO concept of "rename". If you change:
```prisma
// Before
productSize String?

// After
sizeName String?
```

Prisma generates:
```sql
ALTER TABLE "OrderItem" DROP COLUMN "productSize";
ALTER TABLE "OrderItem" ADD COLUMN "sizeName" TEXT;
```

Your data is **gone**. To preserve it, you need a custom migration (covered in Recipe 18).

---

## 9. Quick-Reference Danger Table

```
                    SAFE          RISKY         DESTRUCTIVE
                    ────          ─────         ───────────
Add table           ✅
Add nullable col    ✅
Add col w/ default  ✅
Add index           ✅
Drop index          ✅
Make col NOT NULL               ⚠️ (if NULLs exist)
Add unique                      ⚠️ (if dupes exist)
Change type                     ⚠️ (if incompatible)
Add FK                          ⚠️ (if orphans exist)
Drop column                                   🔴
Drop table                                    🔴
Rename column                                 🔴 (Prisma = drop+add)
Rename table                                  🔴 (Prisma = drop+add)
```

---

# PART C — THE ERRORS YOU'LL HIT (And How to Fix Each One)

---

## 10. "We found changes that cannot be executed" — The NOT NULL Problem

**The Error:**
```
Error:
⚠️ We found changes that cannot be executed:
  • Made the column `productSku` on table `OrderItem` required,
    but there are 51 existing NULL values.
```

**Why It Happens:**
You changed a field from optional (`String?`) to required (`String`), but existing rows have NULL in that column. PostgreSQL refuses to add a NOT NULL constraint when NULLs exist.

**Fixes (Pick One):**

### Fix 1: Reset (Dev only!)
```bash
npx prisma migrate reset --force
# Drops DB → Recreates → Applies all migrations → Seeds
```
Acceptable when: dev machine, no real data, test accounts only.

### Fix 2: Create-Only + Manual SQL
```bash
npx prisma migrate dev --create-only --name make_sku_required
```
This creates the migration file WITHOUT applying it. Then edit `migration.sql`:

```sql
-- Step 1: Fill NULL values with a sensible default
UPDATE "OrderItem" SET "productSku" = 'LEGACY-' || LEFT("id", 8) WHERE "productSku" IS NULL;

-- Step 2: Now safely add the NOT NULL constraint
ALTER TABLE "OrderItem" ALTER COLUMN "productSku" SET NOT NULL;
```

Then apply:
```bash
npx prisma migrate dev
```

### Fix 3: Multi-Step Migration (Safest for Production)
1. **Migration 1:** Add the column as nullable with a default
2. **Backfill script:** Fill existing rows with real data
3. **Migration 2:** Make the column NOT NULL

Detailed recipe in Part D, Section 17.

---

## 11. "Migration failed to apply cleanly" — Schema Drift

**The Error:**
```
Error: The migration `20260216195318_add_variant_dims` failed to apply cleanly
to the shadow database.
```

**Why It Happens:**
Prisma replayed all migrations on the shadow database, and one of them failed. Common causes:
- Someone manually altered the database (added a column via pgAdmin)
- A migration was edited after being applied
- Two developers created conflicting migrations

**How to Fix:**

### Step 1: Check what's different
```bash
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma
```

### Step 2a: If the DB has extra things
```bash
npx prisma db pull                    # Updates schema.prisma from DB
npx prisma migrate dev --name resync  # Creates a new migration to match
```

### Step 2b: If the DB is missing things
Consider `prisma migrate resolve` (see Section 39).

---

## 12. "The migration was modified after it was applied"

**The Error:**
```
Error: The migration `20260115120000_initial_setup` was modified
after it was applied.
```

**Why:** Prisma checksums migration files. If you edit an applied migration, the checksum won't match.

**Fix:**
- **If in dev:** `npx prisma migrate reset --force`
- **If in prod:** Use `prisma migrate resolve --applied "MIGRATION_NAME"` to tell Prisma to accept the new checksum
- **Best practice:** Never edit applied migrations. Create a new one instead.

---

## 13. "The migration has already been applied"

**The Error:**
```
Error: Migration `20260216212600_add_variant_is_default` has already been applied.
```

**Why:** The `_prisma_migrations` table says this migration was already applied, but `migrate dev` is trying to apply it again (usually after a merge conflict or folder copy).

**Fix:**
```bash
npx prisma migrate resolve --applied "20260216212600_add_variant_is_default"
```
This marks it as applied without re-running it.

---

## 14. "Database schema is not empty"

**The Error:**
```
Error: The database schema is not empty.
```

**Why:** You're trying to run `migrate dev` on a database that already has tables, but `_prisma_migrations` table doesn't exist (or is empty). This happens when:
- You created tables manually or with `db push`
- You connected to an existing database

**Fix:**
```bash
# If you want to keep existing data:
npx prisma migrate resolve --applied "20260115120000_initial_setup"
# (mark all existing migrations as applied)

# If you don't care about data:
npx prisma migrate reset --force
```

---

## 15. Shadow Database Failures

**The Error:**
```
Error: A migration failed when applied to the shadow database.
```

**Why:** The shadow database is a temporary DB that Prisma creates to test migrations. Fails when:
- Your DB user doesn't have CREATE DATABASE permission
- Another process is holding a lock
- A migration has invalid SQL

**Fix for permission issues:**
```sql
-- In PostgreSQL, grant createdb permission:
ALTER USER your_user CREATEDB;
```

Or configure a dedicated shadow database in schema.prisma:
```prisma
datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

---

## 16. Foreign Key Constraint Violations During Migration

**The Error:**
```
Error: Foreign key constraint failed on the field: `OrderItem_variantId_fkey`
```

**Why:** You're dropping a column that's a foreign key, or adding a FK constraint where existing data violates it.

**Fix:**
1. **Dropping FK column:** Prisma handles this automatically (drops constraint first)
2. **Adding FK constraint with orphans:**
   ```sql
   -- In your custom migration:
   -- First, delete orphan records
   DELETE FROM "OrderItem" WHERE "variantId" NOT IN (SELECT "id" FROM "ProductVariant");
   -- Then, add the constraint
   ALTER TABLE "OrderItem" ADD CONSTRAINT ... FOREIGN KEY ...
   ```

---

# PART D — HANDS-ON RECIPES (The Fix Playbook)

---

## 17. Recipe: Making a Column NOT NULL When Rows Already Exist

**Scenario:** You have 10,000 orders. You want to add `productSku` as NOT NULL to `OrderItem`.

### The Naive Approach (FAILS):
```prisma
model OrderItem {
  productSku String  // NOT NULL (was String? or didn't exist)
}
```
```bash
npx prisma migrate dev --name add_product_sku
# ❌ Error: 10000 existing NULL values
```

### The Production-Safe Approach (3-Step):

**Step 1: Add as nullable with default**
```prisma
model OrderItem {
  productSku String?  // Nullable for now
}
```
```bash
npx prisma migrate dev --name add_product_sku_nullable
```

**Step 2: Backfill existing rows**
Create a script:
```typescript
// scripts/backfill-product-sku.ts
import prismadb from '../src/lib/prismadb';

async function main() {
  // Fetch all OrderItems with their related product
  const items = await prismadb.orderItem.findMany({
    where: { productSku: null },
    include: { product: { select: { sku: true } } },
  });

  console.log(`Found ${items.length} items to backfill`);

  for (const item of items) {
    await prismadb.orderItem.update({
      where: { id: item.id },
      data: { productSku: item.product?.sku ?? `LEGACY-${item.id.slice(0, 8)}` },
    });
  }

  console.log('Backfill complete');
}

main().catch(console.error).finally(() => prismadb.$disconnect());
```

Run it:
```bash
npx tsx scripts/backfill-product-sku.ts
```

**Step 3: Make it required**
```prisma
model OrderItem {
  productSku String  // Now NOT NULL — all rows have values
}
```
```bash
npx prisma migrate dev --name make_product_sku_required
# ✅ Works! No NULL values exist.
```

### The "I Don't Want 3 Migrations" Shortcut (create-only):

```bash
npx prisma migrate dev --create-only --name add_product_sku_required
```

Edit the generated `migration.sql`:
```sql
-- Add column as nullable first
ALTER TABLE "OrderItem" ADD COLUMN "productSku" TEXT;

-- Fill existing rows
UPDATE "OrderItem" 
SET "productSku" = COALESCE(
  (SELECT p."sku" FROM "Product" p WHERE p."id" = "OrderItem"."productId"),
  'LEGACY-' || LEFT("id", 8)
);

-- Now make it required
ALTER TABLE "OrderItem" ALTER COLUMN "productSku" SET NOT NULL;
```

Then apply:
```bash
npx prisma migrate dev
```

---

## 18. Recipe: Renaming a Column Without Losing Data

**Scenario:** Rename `productSize` → `sizeName` on OrderItem.

### What Prisma Does By Default (DATA LOSS):
```sql
ALTER TABLE "OrderItem" DROP COLUMN "productSize";
ALTER TABLE "OrderItem" ADD COLUMN "sizeName" TEXT;
```

### The Safe Way (create-only):
```bash
npx prisma migrate dev --create-only --name rename_product_size_to_size_name
```

Edit `migration.sql`:
```sql
-- Rename instead of drop+add
ALTER TABLE "OrderItem" RENAME COLUMN "productSize" TO "sizeName";
```

Then apply normally.

**Important:** After renaming, update your `schema.prisma` to use the new name, and the `@map` annotation if needed:
```prisma
sizeName String? @map("sizeName")  // Usually not needed if names match
```

---

## 19. Recipe: Changing a Column's Type (e.g., String → Int)

**Scenario:** Price was stored as `String`, you want `Decimal`.

### The SQL:
```sql
-- Step 1: Add new column
ALTER TABLE "Product" ADD COLUMN "price_new" DECIMAL(10,2);

-- Step 2: Copy data with conversion
UPDATE "Product" SET "price_new" = CAST("price" AS DECIMAL(10,2));

-- Step 3: Drop old, rename new
ALTER TABLE "Product" DROP COLUMN "price";
ALTER TABLE "Product" RENAME COLUMN "price_new" TO "price";
```

### PostgreSQL Type Casting Rules:
| From | To | Works? | Notes |
|------|-----|--------|-------|
| TEXT → INT | Maybe | Fails if text isn't a number |
| TEXT → DECIMAL | Maybe | Same |
| INT → TEXT | Always | Numbers become strings |
| INT → DECIMAL | Always | No precision loss |
| DECIMAL → INT | Always | Truncates decimal part |
| TEXT → BOOLEAN | Maybe | Only 'true'/'false'/'t'/'f' |

---

## 20. Recipe: Removing a Column That Has a Foreign Key

**Scenario:** Remove `variantId` from OrderItem (what we just did!).

Prisma handles the FK constraint automatically. The generated SQL:

```sql
-- DropForeignKeys
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_variantId_fkey";

-- DropIndex
DROP INDEX "OrderItem_variantId_idx";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "variantId";
```

Order matters:
1. Drop the FK constraint first
2. Drop the index
3. Drop the column

If you need to keep the data somewhere before dropping, add a copy step:

```sql
-- Save variantId into variantSnapshot JSON before dropping
UPDATE "OrderItem" 
SET "variantSnapshot" = jsonb_build_object('variantId', "variantId")
WHERE "variantId" IS NOT NULL;

-- Then drop
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_variantId_fkey";
ALTER TABLE "OrderItem" DROP COLUMN "variantId";
```

---

## 21. Recipe: Splitting One Table Into Two

**Scenario:** `OrderItem` has too many fields. Split shipping dims into `OrderItemShippingDims`.

### Step 1: Create migration with create-only
```bash
npx prisma migrate dev --create-only --name split_order_item_shipping
```

### Step 2: Edit migration.sql
```sql
-- Create new table
CREATE TABLE "OrderItemShippingDims" (
  "id" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL UNIQUE,
  "weight" DECIMAL(8,3) NOT NULL,
  "length" DECIMAL(8,2) NOT NULL,
  "breadth" DECIMAL(8,2) NOT NULL,
  "height" DECIMAL(8,2) NOT NULL,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE
);

-- Copy data from OrderItem to new table
INSERT INTO "OrderItemShippingDims" ("id", "orderItemId", "weight", "length", "breadth", "height")
SELECT gen_random_uuid(), "id", "snapshotWeight", "snapshotLength", "snapshotBreadth", "snapshotHeight"
FROM "OrderItem"
WHERE "snapshotWeight" IS NOT NULL;

-- Drop old columns from OrderItem
ALTER TABLE "OrderItem" DROP COLUMN "snapshotWeight";
ALTER TABLE "OrderItem" DROP COLUMN "snapshotLength";
ALTER TABLE "OrderItem" DROP COLUMN "snapshotBreadth";
ALTER TABLE "OrderItem" DROP COLUMN "snapshotHeight";
```

---

## 22. Recipe: Merging Two Tables Into One

Reverse of above. Same pattern: create-only → custom SQL → apply.

---

## 23. Recipe: Adding a Unique Constraint to Existing Data With Duplicates

**Scenario:** Add `@@unique([storeId, sku])` to Product, but some products have duplicate SKUs.

### Step 1: Find duplicates
```sql
SELECT "storeId", "sku", COUNT(*) 
FROM "Product" 
WHERE "sku" IS NOT NULL 
GROUP BY "storeId", "sku" 
HAVING COUNT(*) > 1;
```

### Step 2: Fix duplicates (choose a strategy)

**Strategy A: Append suffix to duplicates**
```sql
UPDATE "Product" p
SET "sku" = p."sku" || '-DUP-' || p."id"
WHERE p."id" NOT IN (
  SELECT MIN("id") FROM "Product" 
  WHERE "sku" IS NOT NULL
  GROUP BY "storeId", "sku"
);
```

**Strategy B: Null out duplicates (if nullable)**
```sql
UPDATE "Product" 
SET "sku" = NULL 
WHERE "id" NOT IN (
  SELECT MIN("id") FROM "Product" 
  WHERE "sku" IS NOT NULL
  GROUP BY "storeId", "sku"
);
```

### Step 3: Add the constraint
```sql
CREATE UNIQUE INDEX "Product_storeId_sku_key" ON "Product"("storeId", "sku");
```

### In Our Project:
We added `@@unique([storeId, sku])` and also handled P2002 errors in the API:
```typescript
if (error.code === 'P2002') {
  return new NextResponse('A product with this SKU already exists in your store', { status: 409 });
}
```

---

## 24. Recipe: Moving Data Between Tables (Our OrderItem → Snapshot Migration)

This is exactly what we just did. Let's document the full production-safe approach:

### What Changed:
- **Removed:** `variantId` (FK to ProductVariant), `productSize` (String)
- **Added:** `productSku`, `productMrp`, `productCategoryName` (all NOT NULL), `variantSnapshot` (JSON), `snapshotWeight/Length/Breadth/Height` (all NOT NULL)

### The Production Migration Plan (if we had real data):

**Migration 1: Add new columns as NULLABLE**
```sql
ALTER TABLE "OrderItem" ADD COLUMN "productSku" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "productMrp" DECIMAL;
ALTER TABLE "OrderItem" ADD COLUMN "productCategoryName" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantSnapshot" JSONB;
ALTER TABLE "OrderItem" ADD COLUMN "snapshotWeight" DECIMAL(8,3);
ALTER TABLE "OrderItem" ADD COLUMN "snapshotLength" DECIMAL(8,2);
ALTER TABLE "OrderItem" ADD COLUMN "snapshotBreadth" DECIMAL(8,2);
ALTER TABLE "OrderItem" ADD COLUMN "snapshotHeight" DECIMAL(8,2);
```

**Backfill Script: Populate new columns from existing data**
```typescript
const items = await prismadb.orderItem.findMany({
  include: { 
    product: { include: { category: true } },
    variant: { include: { size: true } }
  }
});

for (const item of items) {
  await prismadb.orderItem.update({
    where: { id: item.id },
    data: {
      productSku: item.product?.sku ?? `LEGACY-${item.id.slice(0, 8)}`,
      productMrp: item.product?.price ?? item.priceAtPurchase,
      productCategoryName: item.product?.category?.name ?? 'Unknown',
      variantSnapshot: item.variant ? {
        variantId: item.variantId,
        sizeName: item.variant.size.name,
        sizeValue: item.variant.size.value,
        sku: item.variant.sku,
        weight: Number(item.variant.weight),
        length: Number(item.variant.length),
        breadth: Number(item.variant.breadth),
        height: Number(item.variant.height),
      } : null,
      snapshotWeight: item.variant?.weight ?? item.product?.weight ?? 0.5,
      snapshotLength: item.variant?.length ?? item.product?.length ?? 10,
      snapshotBreadth: item.variant?.breadth ?? item.product?.breadth ?? 10,
      snapshotHeight: item.variant?.height ?? item.product?.height ?? 10,
    }
  });
}
```

**Migration 2: Make columns NOT NULL + Drop old columns**
```sql
ALTER TABLE "OrderItem" ALTER COLUMN "productSku" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "productMrp" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "productCategoryName" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "snapshotWeight" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "snapshotLength" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "snapshotBreadth" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "snapshotHeight" SET NOT NULL;

-- Now safe to drop old columns
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_variantId_fkey";
DROP INDEX IF EXISTS "OrderItem_variantId_idx";
ALTER TABLE "OrderItem" DROP COLUMN "variantId";
ALTER TABLE "OrderItem" DROP COLUMN "productSize";
```

**Migration 3: Remove relation from ProductVariant**
```sql
-- No SQL needed — just updating the Prisma schema
-- Prisma generates nothing because removing `orderItems OrderItem[]`
-- doesn't affect the DB (it's the "non-owning" side)
```

---

# PART E — PRODUCTION MIGRATION STRATEGIES

---

## 25. The Expand-Contract Pattern (Zero-Downtime)

The gold standard for production schema changes. Also called **parallel change** or **expand-migrate-contract**.

### The Idea:
Instead of changing a column in one step, do it in three:

```
EXPAND:     Add new column alongside old
MIGRATE:    Copy data from old to new, update code to write to both
CONTRACT:   Remove old column after all reads migrated
```

### Example: Renaming `productSize` → `sizeName`

**Phase 1 — Expand (Deploy 1)**
```sql
ALTER TABLE "OrderItem" ADD COLUMN "sizeName" TEXT;
```
Code writes to BOTH columns:
```typescript
data: {
  productSize: size,  // Keep old for backward compat
  sizeName: size,     // Write to new
}
```

**Phase 2 — Migrate (Background Job)**
```sql
UPDATE "OrderItem" SET "sizeName" = "productSize" WHERE "sizeName" IS NULL;
```
Code reads from new column:
```typescript
const size = item.sizeName ?? item.productSize;  // Prefer new
```

**Phase 3 — Contract (Deploy 2)**
Code drops old column usage. Then migration:
```sql
ALTER TABLE "OrderItem" DROP COLUMN "productSize";
```

### Why This Works:
- Deploy 1 is backward compatible (old column still exists)
- Background job migrates data while app runs
- Deploy 2 is safe because all data is in the new column

### When to Use:
- Production with real traffic
- Any column rename, type change, or structural change
- **Not needed** for: adding new nullable columns, adding indexes

---

## 26. Blue-Green Database Deployments

For large schema changes that take time:

```
[Blue DB]  ← Current production, serving traffic
[Green DB] ← Copy of Blue + new migrations applied

1. Copy Blue → Green
2. Apply migrations on Green
3. Run backfill scripts on Green
4. Test Green thoroughly
5. Switch traffic from Blue to Green
6. Keep Blue as rollback for 24h
```

**Caution:** During the switch, writes to Blue are lost unless you handle dual-write.

---

## 27. Feature Flags + Schema Migrations

For gradual rollout:

```
Migration: Add new columns (nullable)
Feature flag OFF → Code uses old columns
Feature flag ON  → Code uses new columns

1. Deploy migration
2. Deploy code with feature flag
3. Turn flag ON for 1% of users
4. Monitor for errors
5. Gradually increase to 100%
6. Remove old column in a later migration
```

---

## 28. Multi-Step Migration for Breaking Changes

When a single migration is too risky:

```
Week 1: Add new columns (nullable) + deploy code that writes to both
Week 2: Run backfill for historical data
Week 3: Deploy code that reads from new columns
Week 4: Make columns NOT NULL + drop old columns
```

Each week is a separate PR, separate deploy, separate migration.

---

## 29. Rollback Strategies

**Prisma has NO automatic rollback.** When a migration fails, you must fix it manually.

### Strategy 1: Forward Fix
Create a new migration to undo the change:
```bash
npx prisma migrate dev --name revert_bad_change
```

### Strategy 2: Manual SQL
```sql
-- In psql or pgAdmin, manually reverse the change
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;
```
Then mark the migration as rolled back:
```sql
UPDATE _prisma_migrations SET rolled_back_at = NOW() WHERE migration_name = 'bad_migration';
```

### Strategy 3: Reset (Dev Only)
```bash
npx prisma migrate reset --force
```

### Strategy 4: Database Backup/Restore
```bash
# Before migration:
pg_dump shoppulse_admin > backup_before_migration.sql

# If migration fails:
psql shoppulse_admin < backup_before_migration.sql
```

**Pro Tip:** ALWAYS backup before production migrations:
```bash
pg_dump -Fc shoppulse_admin > backup_$(date +%Y%m%d_%H%M%S).dump
```

---

## 30. Data Backfill Scripts

When you add new columns that need data from existing records:

### Pattern: TypeScript Backfill Script
```typescript
// scripts/backfill-snapshot-dims.ts
import prismadb from '../src/lib/prismadb';

async function main() {
  const batchSize = 100;
  let processed = 0;
  let cursor: string | undefined;

  while (true) {
    const items = await prismadb.orderItem.findMany({
      where: { snapshotWeight: null },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        product: { select: { weight: true, length: true, breadth: true, height: true } },
      },
    });

    if (items.length === 0) break;

    for (const item of items) {
      await prismadb.orderItem.update({
        where: { id: item.id },
        data: {
          snapshotWeight: item.product?.weight ?? 0.5,
          snapshotLength: item.product?.length ?? 10,
          snapshotBreadth: item.product?.breadth ?? 10,
          snapshotHeight: item.product?.height ?? 10,
        },
      });
    }

    cursor = items[items.length - 1].id;
    processed += items.length;
    console.log(`Backfilled ${processed} items...`);
  }

  console.log(`Done! Total: ${processed}`);
}

main();
```

### Pattern: SQL Backfill (Faster for Large Datasets)
```sql
-- Update all at once (fine for < 100K rows)
UPDATE "OrderItem" o
SET 
  "snapshotWeight" = COALESCE(p."weight", 0.5),
  "snapshotLength" = COALESCE(p."length", 10),
  "snapshotBreadth" = COALESCE(p."breadth", 10),
  "snapshotHeight" = COALESCE(p."height", 10)
FROM "Product" p
WHERE o."productId" = p."id"
  AND o."snapshotWeight" IS NULL;
```

### Pattern: Batched SQL (For millions of rows)
```sql
-- Process in batches of 10,000 to avoid locking
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE "OrderItem" o
    SET "snapshotWeight" = COALESCE(p."weight", 0.5)
    FROM "Product" p
    WHERE o."productId" = p."id"
      AND o."snapshotWeight" IS NULL
      AND o."id" IN (
        SELECT "id" FROM "OrderItem" WHERE "snapshotWeight" IS NULL LIMIT batch_size
      );
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    IF rows_updated = 0 THEN EXIT; END IF;
    
    RAISE NOTICE 'Updated % rows', rows_updated;
    PERFORM pg_sleep(0.1);  -- Brief pause to reduce lock pressure
  END LOOP;
END $$;
```

---

## 31. Migration in CI/CD Pipelines

### The Flow:
```
PR Created → CI runs tests with test DB
PR Merged  → CD deploys code + runs `prisma migrate deploy`
```

### GitHub Actions Example:
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Deploy application
        run: npm run deploy
```

### Key Rules:
1. **Migrate BEFORE deploying new code** (new code might depend on new columns)
2. **Exception:** When REMOVING columns, deploy code first (old code might reference them)
3. **Never run `migrate dev` in CI/CD** — only `migrate deploy`
4. **Always backup before migrating production**

---

# PART F — PRISMA-SPECIFIC COMMANDS DEEP DIVE

---

## 32. `prisma migrate dev` — Full Breakdown

```bash
npx prisma migrate dev [--name NAME] [--create-only]
```

What it does (in order):
1. Reads `schema.prisma`
2. Creates shadow database
3. Replays all existing migrations on shadow DB
4. Compares shadow DB schema with `schema.prisma`
5. Generates new `migration.sql` from the diff
6. Applies the new migration to your dev database
7. Runs `prisma generate` to update the client
8. Drops the shadow database

Flags:
- `--name NAME`: Descriptive name for the migration
- `--create-only`: Generate the SQL file but DON'T apply it (so you can edit)

---

## 33. `prisma migrate deploy` — Production Usage

```bash
npx prisma migrate deploy
```

What it does:
1. Reads `_prisma_migrations` table
2. Finds pending migrations (in `prisma/migrations/` but not in table)
3. Applies them in timestamp order
4. Records each in `_prisma_migrations`

What it does NOT do:
- No shadow database
- No generating new migrations
- No `prisma generate`
- No interactive prompts

---

## 34. `prisma migrate reset` — When and Why

```bash
npx prisma migrate reset [--force]
```

What it does:
1. **Drops** the entire database
2. **Creates** a new empty database
3. **Applies** all migrations from scratch
4. Runs seed script (if `prisma/seed.ts` exists and configured)

When to use:
- Dev machine with corrupted state
- After marking migrations as resolved
- When you want a clean slate
- NEVER in production!

---

## 35. `prisma migrate status` — Reading the Output

```bash
npx prisma migrate status
```

Outputs states like:
```
4 migrations found in prisma/migrations

Status:
✅ 20260115120000_initial_setup         — Applied
✅ 20260216195318_add_variant_dims       — Applied
✅ 20260216202840_add_unique_sku         — Applied
⏳ 20260216212600_add_variant_is_default — Not yet applied
```

---

## 36. `prisma migrate diff` — Schema Comparison

```bash
# Compare migrations folder with schema file
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma

# Compare two databases
npx prisma migrate diff \
  --from-url "postgresql://user:pass@localhost/db1" \
  --to-url "postgresql://user:pass@localhost/db2"
```

Outputs the SQL needed to transform one into the other.

---

## 37. `prisma db push` — When to Use

```bash
npx prisma db push
```

What it does:
- Pushes schema changes directly to the DB WITHOUT creating migration files
- No history, no versioning, no migration folder

When to use:
- **Prototyping:** Quick iteration on schema without cluttering migrations
- **NOT for production:** No migration history means no reproducibility

Think of it as "I just want to try this shape, I'll create proper migrations later."

---

## 38. `prisma db pull` — Introspecting Existing Databases

```bash
npx prisma db pull
```

What it does:
- Reads the actual database schema
- Updates `schema.prisma` to match

When to use:
- Connecting Prisma to an existing database
- Checking if your schema matches the actual DB
- After someone modified the DB directly

---

## 39. `prisma migrate resolve` — Fixing Stuck Migrations

```bash
# Mark a migration as applied (without running it)
npx prisma migrate resolve --applied "20260216212600_add_variant_is_default"

# Mark a migration as rolled back
npx prisma migrate resolve --rolled-back "20260216212600_add_variant_is_default"
```

When to use:
- Migration was applied manually via SQL, but Prisma doesn't know
- Need to skip a migration that's causing issues
- Fixing failed `migrate deploy` in production

---

# PART G — REAL SHOPPULSE MIGRATION CASE STUDIES

---

## 40. Case Study: Our OrderItem Snapshot Migration

### The Goal:
Remove `variantId` foreign key from OrderItem, replace with `variantSnapshot` JSON + raw shipping dimension fields.

### Why:
1. **Data integrity:** When a product variant is deleted, OrderItem loses its ability to show "Size: XL"
2. **Auto-ship safety:** If product dims change after order placement, auto-ship uses wrong box
3. **No runtime dependencies:** Each OrderItem is self-contained

### What Changed:
```
REMOVED: variantId (FK to ProductVariant)
REMOVED: productSize (String?)
REMOVED: @@index([variantId])
REMOVED: ProductVariant.orderItems relation

ADDED: productSku (String, NOT NULL)
ADDED: productMrp (Decimal, NOT NULL)
ADDED: productCategoryName (String, NOT NULL)
ADDED: variantSnapshot (Json?) — { variantId, sizeName, sizeValue, sku, weight, length, breadth, height }
ADDED: snapshotWeight (Decimal, NOT NULL)
ADDED: snapshotLength (Decimal, NOT NULL)
ADDED: snapshotBreadth (Decimal, NOT NULL)
ADDED: snapshotHeight (Decimal, NOT NULL)
```

### What Happened:
```
npx prisma migrate dev --name add_orderitem_snapshot_fields

Error: 51 existing NULL values for NOT NULL columns
```

### Why It Failed:
Existing OrderItems were created before these columns existed. They all have NULL.

### What We Did (Dev, No Real Data):
```bash
npx prisma migrate reset --force
```

### What We'd Do in Production:
Three-step migration as described in Recipe 24 (Section 24):
1. Add columns as nullable
2. Backfill from Product/Variant relations
3. Make columns NOT NULL + drop old columns

---

## 41. Case Study: Adding `isDefault` to ProductVariant

### The Change:
```prisma
model ProductVariant {
  isDefault Boolean @default(false)
}
```

### Why It Was Safe:
- New NOT NULL column with `@default(false)` ← Prisma adds `DEFAULT false` to SQL
- Every existing variant gets `isDefault = false`
- No NULLs, no errors

### The Migration SQL:
```sql
ALTER TABLE "ProductVariant" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
```

**Lesson:** Always add defaults when creating NOT NULL columns. It's the difference between a 0-risk migration and a failing one.

---

## 42. Case Study: Adding `@@unique([storeId, sku])` With Existing Data

### The Change:
```prisma
model Product {
  @@unique([storeId, sku])
}
```

### Risk Assessment:
- If any two products in the same store have the same SKU → migration fails
- In our case: no real data, all test products had unique SKUs

### What We Also Did (Application Level):
```typescript
// In product creation API
if (error.code === 'P2002') {
  return new NextResponse(
    'A product with this SKU already exists in your store',
    { status: 409 }
  );
}
```

**Lesson:** Unique constraints need both: DB-level enforcement (@@unique) + app-level user-friendly error handling.

---

## 43. Lessons Learned: What Would Have Been Different in Production

| Aspect | Our Dev Approach | Production Approach |
|--------|-----------------|---------------------|
| Schema change | Single migration | 3-step expand-contract |
| Backfill | Not needed (reset) | Script with batch processing |
| Rollback plan | `migrate reset` | Database backup + forward fix |
| Testing | Build succeeds = done | Staging environment + load test |
| Deployment | Local dev machine | CI/CD pipeline with `migrate deploy` |
| Timeline | 30 minutes | 2-3 days (plan → test → deploy) |

### The Golden Rule:
> **In development, move fast. In production, move carefully.**

The same schema change that takes 30 minutes locally should take 2-3 days in production. That's not slowness — that's professionalism.

---

# Quick Reference Card

```
"It says NULL values exist"
→ Reset (dev) or 3-step migration (prod)

"It says migration was modified"  
→ Reset (dev) or resolve --applied (prod)

"It says schema drift"
→ prisma migrate diff → fix manually

"It says shadow DB failed"
→ Grant CREATEDB or set shadowDatabaseUrl

"I need to rename a column"
→ create-only + ALTER RENAME (never let Prisma auto-generate)

"I need to change a column type"
→ create-only + ADD new → COPY data → DROP old

"I need zero downtime"
→ Expand-Contract pattern (3 deploys)

"I messed up production"
→ pg_dump restore + forward fix migration
```

---

*This guide covers everything from "what is a migration" to "how do I deploy schema changes to 500 stores without downtime." Keep it bookmarked.*
