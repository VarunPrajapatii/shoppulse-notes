# Learning 2: Product Deletion & Data Integrity in E-Commerce

**Date:** 2025-07-17  
**Topic:** How to safely delete products when they have active orders, shipments, returns  
**Difficulty:** Expert — database design, cascade behavior, snapshot patterns

---

## The Ghost Scenario

```
Product #123 = Samsung Buds (₹600, 6mo warranty, 5 buds images)
  → 30 orders (15 shipped, some in shipping pipeline)

Seller edits Product #123 → Samsung Powerbank (₹1200, 1yr warranty, new images)

Result:
  OrderItem.productName = "Samsung Buds"        ← snapshot ✅ (correct)
  OrderItem.productId = 123                      ← still linked to... Powerbank 😱
  
  Admin clicks "View Product" from order page → sees Powerbank, not Buds
  Return initiated → warranty shows 1yr instead of 6mo
  Shipping needs dimensions → gets Powerbank dimensions for Buds order
```

**This is NOT a delete problem — it's a product EDIT problem.** And it's worse than deletion because the system silently serves wrong data without any error.

---

## Why This Problem Exists

In most e-commerce systems, `Product` represents "the thing in the catalog" and `OrderItem` represents "the thing that was purchased." These are **fundamentally different concepts** that happen to share data at the moment of purchase.

```
Product = mutable, changes over time (price updates, new images, restocking)
OrderItem = immutable, frozen at checkout (legal/financial record of transaction)
```

The mistake: Using `productId` FK to fetch order-related data from the live Product table.

---

## Solutions Evaluated

### Solution 1: Full Snapshot at Checkout (✅ CHOSEN)

> Snapshot all order-critical fields onto OrderItem at checkout time. Never look back at Product table for order operations.

| Aspect | Rating |
|--------|--------|
| Correctness | ⭐⭐⭐⭐⭐ Order is frozen in time |
| Industry Standard | ⭐⭐⭐⭐⭐ Amazon, Shopify, Stripe do this |
| Seller Experience | ⭐⭐⭐⭐⭐ Total editing freedom |
| Storage Cost | ⭐⭐⭐⭐ ~2-3 KB per OrderItem (negligible) |
| Implementation | ⭐⭐⭐⭐ Schema change + checkout update |

### Solution 2: Lock Critical Fields After Orders Exist (❌ REJECTED)

> Prevent editing name, price, warranty, etc. on products that have unfulfilled orders.

| Aspect | Rating |
|--------|--------|
| Correctness | ⭐⭐⭐ Prevents future corruption only |
| Seller Experience | ⭐ TERRIBLE — "Why can't I fix my typo?" |
| Edge Cases | ⭐ What about product recalls? Price corrections? |

**Why rejected:** Sellers would hate it. Can't fix a warranty typo because 3 orders exist. They'd have to create a duplicate product, losing reviews/analytics.

### Solution 3: Product Versioning (Event Sourcing) (⚠️ CORRECT BUT OVERKILL)

> Every edit creates a new "version." OrderItem links to specific version, not current product.

```
Product #123 v1 = Samsung Buds     ← Order #1 links here
Product #123 v2 = Samsung Powerbank ← current live version
```

| Aspect | Rating |
|--------|--------|
| Correctness | ⭐⭐⭐⭐⭐ Perfect history |
| Industry Standard | ⭐⭐⭐ Stripe does this for API objects |
| Implementation | ⭐⭐ MASSIVE — redesign entire Product system |

**Why not chosen:** Same data integrity as Solution 1, but 10x the implementation complexity.

### Solution 4: Hybrid — Snapshot + Live Link (✅ BEST)

```
OrderItem = {
  // SNAPSHOT (frozen at checkout, immutable)
  productName, productSku, productWeight, productLength, productBreadth,
  productHeight, productWarranty, priceAtPurchase, productImageUrl, 
  productSize, variantSku, lineTotal,
  productSnapshot: Json      ← complete product state at purchase
  
  // LIVE LINK (convenience only, NOT for data)
  productId?   ← nullable (SetNull on delete), only for "Jump to catalog" link
  variantId?   ← nullable
}
```

**Rules:**
- All order operations (shipping, return, refund, display) → read SNAPSHOT
- `productId` link → only for admin "View in catalog" shortcut
- Product deleted → `productId = null` → nothing breaks

---

## The Cascade Chain

When a product is hard-deleted from PostgreSQL:

```
Product DELETED
    ├── Image CASCADE → deleted (Cloudinary URLs preserved in ArchivedProduct)
    ├── ProductVariant CASCADE → deleted
    │       └── OrderItem.variantId → NULL (SetNull)
    ├── ProductRelation CASCADE → deleted
    └── OrderItem.productId → NULL (SetNull)
            └── OrderItem snapshot fields UNTOUCHED ✅
```

**Critical: `SetNull` not `Cascade` on OrderItem.** If it were Cascade, deleting a product would delete all order history. `SetNull` preserves the order while removing the live link.

---

## Three-Tier Data Architecture

```
Tier 1: Product table     → Storefront display, catalog management
Tier 2: OrderItem snapshot → ALL order operations (shipping, returns, invoicing)
Tier 3: ArchivedProduct    → "View deleted product" admin link (3-month TTL)
```

**Order detail API already implements 3-tier fallback:**
```
Product exists? → productStatus: 'available' (live data + snapshot)
ArchivedProduct exists? → productStatus: 'archived' (archive data)
Both gone? → productStatus: 'deleted' (OrderItem snapshot only)
```

---

## Storage Math (Why Snapshots Are Fine)

```
One OrderItem with all snapshot fields: ~2-3 KB

Scale: 10,000 orders/year × 3 items = 30,000 OrderItems
Annual snapshot storage: 30,000 × 3 KB = 90 MB

For context:
- Amazon: ~200M orders/year → 600 GB/year snapshot data (handled trivially)
- Shopify: ~100M orders/year → 300 GB/year
- PostgreSQL handles 100M+ row tables with 200+ columns routinely
- A single indexed query: <5ms regardless of snapshot data size
```

**Modern PostgreSQL with NVMe SSDs does 500K random reads/second.** Snapshot data is NOT a performance concern at any realistic scale.

---

## Fields to Add to OrderItem

| Field | Source | Why |
|-------|--------|-----|
| `productSku` | product.sku | Shiprocket payload, reconciliation |
| `productWeight` | product.weight | Box selection, shipping label, return shipment |
| `productLength` | product.length | Box selection, shipping label |
| `productBreadth` | product.breadth | Box selection, shipping label |
| `productHeight` | product.height | Box selection, shipping label |
| `productWarranty` | product.warranty | Return eligibility window |
| `variantSku` | variant.sku | Shiprocket variant-level SKU |

---

## Fields to Add to ArchivedProduct

| Field | Why |
|-------|-----|
| `weight, length, breadth, height` | Shipping data for admin reference |
| `sku, sellingPrice, warranty, specifications (Json)` | Complete product clone |
| `hasVariants` | Indicates multi-variant product |
| `variants (Json)` | Array of `{ sizeName, sizeValue, sku, price, sellingPrice, stockQuantity }` |

---

## Interview Talking Points

- "How do you handle product edits when existing orders reference that product?"
- "What's the difference between a product in the catalog and a product in an order?"
- "Why does Amazon snapshot order data instead of keeping live product references?"
- "Explain `onDelete: SetNull` vs `onDelete: Cascade` and when to use each"
- "How do you design a three-tier data fallback for deleted entities?"
- "Why is product versioning overkill compared to checkout snapshots?"

---

## Files Referenced

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Product, OrderItem, ArchivedProduct models |
| `src/app/api/[storeId]/checkout/route.ts` | Where snapshots should be created |
| `src/lib/shipping/box-selection.ts` | Currently reads live Product (needs fix) |
| `src/lib/shipping/auto-ship-service.ts` | Currently reads live Product (needs fix) |
| `src/lib/shipping/shipping-service.ts` | Shiprocket payload (needs snapshot fields) |
| `src/lib/archive-product.ts` | Archive before delete |
| `src/app/api/[storeId]/order/[orderId]/route.ts` | 3-tier fallback |
