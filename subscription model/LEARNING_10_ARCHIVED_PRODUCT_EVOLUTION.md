# Learning 10: ArchivedProduct Evolution — When Your Snapshot Model Outgrows Its Design

**Date:** 2025-07-17  
**Topic:** How auxiliary models become insufficient as the main model evolves  
**Difficulty:** Intermediate — schema evolution, technical debt, progressive enhancement

---

## The Origin Story

ArchivedProduct was created with a simple purpose: **preserve basic product info after deletion** so admins could see "what was deleted" during grace period enforcement.

### Original Design (Minimal)

```prisma
model ArchivedProduct {
  id                String   @id @default(uuid())
  storeId           String
  originalProductId String
  name              String
  description       String?
  price             Float
  categoryName      String?
  sizeName          String?    // ONE size
  sizeValue         String?    // ONE size value
  images            Json?
  archiveReason     String     // "grace_period_enforcement", "manual_deletion"
  expiresAt         DateTime   // TTL: 3 months
  createdAt         DateTime   @default(now())
}
```

### What It Got Right

- ✅ Captures core identity (name, description, images)
- ✅ Has TLL (`expiresAt`) — doesn't grow forever
- ✅ Stores `archiveReason` — audit trail
- ✅ Stores `originalProductId` — can trace back to orders
- ✅ Uses Json for images — flexible, no separate table needed

### What It Got Wrong

As the Product model grew over 6 months, ArchivedProduct didn't keep pace:

```
Product Model Evolution:
  Month 1: name, description, price, images ← ArchivedProduct captures these
  Month 2: + weight, length, breadth, height ← ArchivedProduct misses these
  Month 3: + sku, warranty, specifications ← ArchivedProduct misses these
  Month 4: + sellingPrice (discount support) ← ArchivedProduct misses this
  Month 5: + hasVariants, ProductVariant[] ← ArchivedProduct misses ALL of this
  Month 6: + isNewArrival, isFeatured flags ← ArchivedProduct misses these
```

---

## The Asymmetry Problem

### "Snapshot at Time T" vs "Snapshot of Full Entity"

ArchivedProduct was designed as a **"display snapshot"** — just enough to show what the product looked like.

But over time, it needed to serve as a **"full entity clone"** — everything the product was, including operational data.

```
Display Snapshot:               Full Entity Clone:
  - Name ✅                       - Name ✅
  - Description ✅                - Description ✅
  - Price ✅                      - Price ✅
  - Images ✅                     - Images ✅
  - Category ✅                   - Category ✅
  - One Size ⚠️                  - Weight ❌
                                  - Dimensions ❌
                                  - SKU ❌
                                  - SellingPrice ❌
                                  - Warranty ❌
                                  - Specifications ❌
                                  - All Variants ❌❌❌
```

### The Variant Problem Is Worst

Product can have `hasVariants: true` with multiple `ProductVariant` records:

```
Product: "Cotton T-Shirt"
  Variant 1: Size S, SKU: TS-S-001, Price: 499, Stock: 50
  Variant 2: Size M, SKU: TS-M-001, Price: 499, Stock: 100
  Variant 3: Size L, SKU: TS-L-001, Price: 549, Stock: 75
  Variant 4: Size XL, SKU: TS-XL-001, Price: 549, Stock: 30
```

ArchivedProduct stores: `sizeName: "S"`, `sizeValue: "Small"` — **ONE variant captured, THREE lost.**

---

## The Pattern: Schema Drift in Auxiliary Models

This is a common pattern in growing applications:

```
Main Model evolves frequently:
  Product → gets new fields quarterly
  
Auxiliary Models lag behind:
  ArchivedProduct → created once, rarely updated
  OrderItem → created once, shipping fields missed
  
Result: Auxiliary models become "partial truths"
  → They look complete but are missing critical data
  → Bugs surface months later when the missing data is actually needed
```

### How to Prevent Schema Drift

**Option 1: Co-locate schema changes (✅ BEST)**
```
When adding a field to Product:
  1. Add to Product model
  2. Add to ArchivedProduct (if relevant)
  3. Add to OrderItem snapshot logic (if relevant)
  4. Run migration
  
Enforce this via: PR checklist item
  "□ If Product schema changed, did you update ArchivedProduct and OrderItem snapshots?"
```

**Option 2: Use Json blob for "everything else" (⚠️ TRADEOFF)**
```prisma
model ArchivedProduct {
  // Core structured fields:
  name        String
  price       Float
  
  // Everything else as Json:
  fullSnapshot Json  // { weight, dimensions, variants, specs, ... }
}
```
Pros: Never goes stale — just dump the whole Product as Json
Cons: Can't query/index individual fields, migrations don't enforce shape

**Option 3: Store the whole Product as Json (⚠️ NUCLEAR)**
```prisma
model ArchivedProduct {
  originalProductId String
  productData       Json    // Entire Product + Variants serialized
  archiveReason     String
  expiresAt         DateTime
}
```
Pros: Guaranteed complete snapshot, zero drift
Cons: Completely unqueryable, no type safety, massive storage if product is large

### Our Chosen Approach: Hybrid (Structured + Json for Variants)

```prisma
model ArchivedProduct {
  // Structured fields (queryable, indexable):
  name         String
  price        Float
  sellingPrice Float?
  weight       Float?
  sku          String?
  // ...etc
  
  // Json for complex nested data:
  variants     Json?   // [{ sizeName, sizeValue, sku, price, ... }]
  specifications Json? // { key: value, ... }
  images       Json?   // [url1, url2, ...]
}
```

This gives us:
- Type safety and queryability for common fields
- Flexibility for nested/array data via Json
- No drift for the important fields (enforced by Prisma schema)

---

## Broader Lesson: "Archive" ≠ "Backup"

```
Archive (our ArchivedProduct): 
  → Selected fields for display/reference
  → Lossy compression of the original
  → Purpose: "What was this thing?"
  
Backup (what we actually need):
  → Complete reproduction of the original
  → Lossless snapshot
  → Purpose: "Reconstruct this thing exactly as it was"
```

When ArchivedProduct was created, we thought we needed an **archive**. 
What we actually needed was a **backup** (or at least a much more complete archive).

---

## The Fix: Enhanced ArchivedProduct + Audit Checklist

### Schema Changes (Planned)

```diff
model ArchivedProduct {
   originalProductId String
   name              String
   description       String?
   price             Float
+  sellingPrice      Float?
   categoryName      String?
-  sizeName          String?    // Too limited
-  sizeValue         String?    // Too limited
+  weight            Float?
+  length            Float?
+  breadth           Float?
+  height            Float?
+  sku               String?
+  warranty          String?
+  specifications    Json?
+  hasVariants       Boolean    @default(false)
+  variants          Json?      // Full variant array
   images            Json?
   archiveReason     String
   expiresAt         DateTime
}
```

### PR Checklist Addition

```markdown
## Schema Change Checklist
- [ ] If Product fields added: ArchivedProduct fields added too?
- [ ] If Product fields added: OrderItem snapshot logic updated?
- [ ] If ProductVariant fields added: ArchivedProduct.variants Json spec updated?
- [ ] Backfill migration written for existing records?
```

---

## Interview Talking Points

- "What happens when your snapshot model doesn't evolve with the main model?"
- "How do you prevent schema drift between related models?"
- "When would you use a Json blob vs structured columns for archiving?"
- "What's the difference between an archive and a backup in database design?"
- "How do you handle multi-variant products in an archive model?"
- "What processes would you put in place to prevent auxiliary models from going stale?"

---

## Files Referenced

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | ArchivedProduct model definition |
| `src/actions/store/archive-product.ts` | Creates ArchivedProduct before deletion |
| `src/app/api/[storeId]/order/[orderId]/route.ts` | Falls back to ArchivedProduct |
