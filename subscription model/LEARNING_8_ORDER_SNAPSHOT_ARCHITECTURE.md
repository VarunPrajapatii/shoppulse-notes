# Learning 8: Order Snapshot Architecture — Why OrderItem Must Be Self-Contained

**Date:** 2025-07-17  
**Topic:** Data denormalization for order integrity across the full lifecycle  
**Difficulty:** Advanced — schema design, data integrity, distributed systems thinking

---

## The Core Problem

When a customer places an order for "Samsung Galaxy Buds FE" and we store only a `productId` FK on `OrderItem`:

```
OrderItem → productId: "abc123" → Product: "Samsung Galaxy Buds FE"
```

**Three disaster scenarios break this:**

### Scenario 1: Product Deleted (Grace Period Enforcement)

```
Seller downgrades from Pro (150 products) to Basic (50 products) 
→ Grace period ends 
→ 100 products force-deleted 
→ Product "abc123" gone 
→ OrderItem.productId = NULL (SetNull) 
→ Shipping pipeline reads item.product.weight → NULL → 💥
```

### Scenario 2: Product Edited ("Ghost Scenario")

```
Day 1: Seller lists "Samsung Galaxy Buds FE" (Product abc123)
Day 2: Customer orders Buds FE → OrderItem.productId = "abc123"
Day 3: Seller edits Product abc123, changes it to "Samsung 10000mAh Powerbank"
Day 4: Customer views order → sees "Samsung 10000mAh Powerbank" → files complaint
```

### Scenario 3: Product Variant Deleted

```
Customer orders Size M of a T-shirt → OrderItem.variantId = "var456"
Seller removes Size M variant completely → CASCADE deletes variant
OrderItem.variantId = NULL → variant-specific SKU, price lost
```

---

## The Solution: Snapshot at Checkout

**Every datum the order needs** should be copied to `OrderItem` at checkout time. After that, `OrderItem` never reads from `Product` for any operational purpose.

### Current OrderItem (What We Have)

```prisma
model OrderItem {
  productId       String?    // FK, SetNull on delete
  variantId       String?    // FK, SetNull on delete
  productName     String     // ✅ Snapshot
  productSize     String?    // ✅ Snapshot
  productImageUrl String?    // ✅ Snapshot
  priceAtPurchase Float      // ✅ Snapshot
  quantity        Int        // ✅ Snapshot
  lineTotal       Float      // ✅ Snapshot
}
```

### Proposed OrderItem (What We Need to Add)

```prisma
model OrderItem {
  // EXISTING snapshots (already safe):
  productName     String
  productSize     String?
  productImageUrl String?
  priceAtPurchase Float
  quantity        Int
  lineTotal       Float

  // NEW — Shipping-critical fields:
  productSku      String?    // Product.sku → needed by Shiprocket
  productWeight   Float?     // grams → box selection, shipping rate
  productLength   Float?     // cm → box selection
  productBreadth  Float?     // cm → box selection
  productHeight   Float?     // cm → box selection

  // NEW — Return/warranty:
  productWarranty String?    // "1 year", "6 months" → return eligibility window

  // NEW — Variant-level:
  variantSku      String?    // ProductVariant.sku → overrides productSku for Shiprocket

  // OPTIONAL — Future compliance:
  // productHsnCode  String?  // HSN code for GST invoicing
  
  // KEPT — Convenience links (not used for operations):
  productId       String?    // For "View in catalog" link only
  variantId       String?    // For analytics correlation only
}
```

---

## The Three-Tier Data Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Tier 1: Product Table                                        │
│  Purpose: Storefront display, catalog search, inventory       │
│  Lifecycle: Mutable. Seller edits freely.                    │
│  Who reads it: Storefront pages, admin product management    │
│  After order placed: Product data is IRRELEVANT to the order │
└──────────────────────────────────────────────────────────────┘
                              ↓
                     (snapshot at checkout)
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  Tier 2: OrderItem Snapshots                                  │
│  Purpose: ALL order operations — shipping, returns, invoices  │
│  Lifecycle: Immutable after creation.                         │
│  Who reads it: Shipping pipeline, return flow, invoicing,    │
│                order detail page, customer-facing display     │
│  Key property: Self-contained. Never needs to JOIN Product.  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Tier 3: ArchivedProduct                                      │
│  Purpose: "View deleted product" admin-only link              │
│  Lifecycle: 3-month TTL, then auto-purged                    │
│  Who reads it: Admin panel only, for historical reference    │
│  Fallback: Used when productId is null & admin wants details │
└──────────────────────────────────────────────────────────────┘
```

### What Reads What — Before vs After

| Operation | BEFORE (broken) | AFTER (safe) |
|-----------|-----------------|--------------|
| Shipping box selection | `item.product.weight` | `item.productWeight` |
| Shiprocket SKU | `item.product.sku` | `item.productSku ?? item.variantSku` |
| Return eligibility | `item.product.warranty` | `item.productWarranty` |
| Order detail page | `item.product.name` (JOIN) | `item.productName` (snapshot) |
| Invoice generation | `item.product.price` (JOIN) | `item.priceAtPurchase` (snapshot) |
| "View product" link | Uses `productId` FK | Still uses `productId` FK (optional convenience) |

---

## ArchivedProduct Enhancement

### Current ArchivedProduct (Incomplete)

```prisma
model ArchivedProduct {
  originalProductId String
  name              String
  description       String?
  price             Float
  categoryName      String?
  sizeName          String?     // Only ONE size captured
  sizeValue         String?     // Only ONE size value
  images            Json?
  archiveReason     String
  expiresAt         DateTime
}
```

### Problems:
1. **No weight/dimensions** → Can't recalculate shipping for returns
2. **Only one size** → Multi-variant products lose all variant data
3. **No sellingPrice** → Can't determine actual selling price (price ≠ sellingPrice if discounted)
4. **No sku** → Can't trace in Shiprocket
5. **No warranty** → Can't determine return window
6. **No specifications** → Product detail reconstruction impossible

### Enhanced ArchivedProduct (Proposed)

```prisma
model ArchivedProduct {
  // Existing:
  originalProductId String
  name              String
  description       String?
  price             Float
  categoryName      String?
  images            Json?
  archiveReason     String
  expiresAt         DateTime

  // NEW — Physical attributes:
  weight            Float?
  length            Float?
  breadth           Float?
  height            Float?

  // NEW — Business attributes:
  sku               String?
  sellingPrice      Float?
  warranty          String?
  specifications    Json?      // Full specifications object

  // NEW — Variant data:
  hasVariants       Boolean    @default(false)
  variants          Json?      // Array: [{ sizeName, sizeValue, sku, price, sellingPrice, stock, displayOrder }]
  
  // REMOVED — These were too limited:
  // sizeName        String?   // Replaced by variants Json
  // sizeValue       String?   // Replaced by variants Json
}
```

---

## Why This Is Not "Premature Optimization"

### The Four Operations That Break Without Snapshots

```
1. SHIPPING: box-selection.ts reads item.product.weight/length/breadth/height
   → NULL after deletion → shipping calculation fails → Shiprocket order creation fails
   → Impact: ORDER CANNOT BE SHIPPED

2. RETURNS: Need warranty period to determine if return is within window
   → NULL after deletion → should it be returnable? Unknown
   → Impact: RETURN POLICY CANNOT BE ENFORCED

3. INVOICING: Need HSN code for GST compliance (India)
   → NULL after deletion → invoice is incomplete 
   → Impact: TAX COMPLIANCE RISK

4. CUSTOMER DISPLAY: Customer views order, sees product name/image from OrderItem
   → Already safe ✅ (we snapshot name/image/price)
   → But admin "View Product" link → 404 (product deleted)
   → Impact: MINOR — admin inconvenience only
```

### Amazon's Approach (Industry Standard)

```
Amazon OrderItem equivalent:
  - Product name: ✅ snapshotted
  - Product price: ✅ snapshotted  
  - Product image: ✅ snapshotted
  - Weight/dimensions: ✅ snapshotted (for return shipping labels)
  - Warranty: ✅ snapshotted (for A-to-Z guarantee)
  - SKU/ASIN: ✅ snapshotted (for logistics tracking)
  
Product catalog changes: DO NOT affect existing orders
Seller can edit product freely: buyers who already ordered see original data
```

---

## Implementation Order

```
Step 1: Add new columns to OrderItem (nullable, no breaking change)
Step 2: Add new columns to ArchivedProduct (nullable, no breaking change)
Step 3: prisma migrate dev
Step 4: Update checkout route to populate new snapshot fields
Step 5: Update box-selection.ts to read from OrderItem instead of Product
Step 6: Update auto-ship-service.ts to read from OrderItem
Step 7: Update shipping-service.ts to read from OrderItem
Step 8: Update archive-product.ts to populate new ArchivedProduct fields
Step 9: Backfill migration: script to copy Product data to existing OrderItems
Step 10: Run full test suite
```

### Backfill Migration Script

```sql
-- For existing orders where product still exists:
UPDATE "OrderItem" oi
SET 
  "productSku" = p.sku,
  "productWeight" = p.weight,
  "productLength" = p.length,
  "productBreadth" = p.breadth,
  "productHeight" = p.height,
  "productWarranty" = p.warranty
FROM "Product" p
WHERE oi."productId" = p.id
  AND oi."productWeight" IS NULL;

-- For existing orders where product was deleted (productId = NULL):
-- These are lost forever unless we have ArchivedProduct data
-- Log these for manual review
```

---

## Storage Impact Analysis

```
New columns per OrderItem: ~50 bytes
  - productSku: ~20 chars
  - productWeight: 8 bytes (Float)  
  - productLength: 8 bytes
  - productBreadth: 8 bytes
  - productHeight: 8 bytes
  - productWarranty: ~15 chars
  - variantSku: ~20 chars

Orders per store per month: ~500 (average electronics store)
Items per order: ~2.5 average
Storage per month: 500 × 2.5 × 50 = 62.5 KB per store per month

Even with 1000 stores: 62.5 MB/month
For SaaS at our scale: NEGLIGIBLE
```

---

## Interview Talking Points

- "Why would you denormalize product data onto order items?"
- "What's the tradeoff between data normalization and operational safety?"
- "How do you handle product edits affecting existing orders?"
- "What's the difference between a 'ghost update' and a 'cascade delete'? Which is harder to detect?"
- "Walk me through a three-tier data architecture for order management."
- "How would you implement a backfill migration for existing orders?"
- "What does Amazon/Shopify do to ensure order data integrity after product changes?"

---

## Files Referenced

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | OrderItem model, ArchivedProduct model |
| `src/lib/shipping/box-selection.ts` (~L196) | Reads item.product.weight/dimensions |
| `src/lib/shipping/auto-ship-service.ts` (~L103) | Includes product for shipping |
| `src/lib/shipping/shipping-service.ts` (~L316) | Reads item.product.sku |
| `src/app/api/[storeId]/order/[orderId]/route.ts` (L97-190) | 3-tier fallback |
| `src/actions/store/archive-product.ts` | Archives product before deletion |
