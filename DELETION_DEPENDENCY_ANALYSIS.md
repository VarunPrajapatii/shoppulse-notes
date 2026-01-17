# Deletion Strategy - Grace Period Enforcement

## Overview

This document outlines the **final decisions** for handling deletions during grace period enforcement when users exceed plan limits after downgrading.

---

## 🏗️ Business Logic Context

**User Flow:**

1. User creates **Billboards** first (standalone with images)
2. User creates **Categories** and selects billboards for that category (M:M via junction)
3. User creates **Products** and selects ONE category per product (required FK)

**Key Constraint:** A product MUST belong to a category - no "uncategorized" or "default category" makes business sense since categories display in store navbar.

---

## ✅ Final Decisions

### 1. OrderItem ↔ Product: SetNull with Snapshot

**Schema Change:**

```prisma
model OrderItem {
  productId       String?   // NULLABLE
  product         Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)

  // Snapshot fields (already exist)
  productName     String
  productSize     String?
  productImageUrl String?
  priceAtPurchase Decimal
}
```

**Behavior:**

- Product deleted → `OrderItem.productId` becomes `null`
- Order history preserved with snapshot data
- UI shows "Product no longer available" + snapshot info

---

### 2. Category Deletion: Cascade Delete Products

**Decision:** When a category is deleted (manually or via grace period enforcement), **delete all products in that category**.

NOTE: We should restrict delete cascade manually on manual category deletion in the UI, and only allow it during grace period enforcement. means when user tries to delete a category from UI, we should show a warning that you have to delete all products in this category first.

**Rationale:**

- Products MUST have a category (business requirement)
- No "default category" makes sense for store UI
- SetNull would orphan products with nowhere to display

**Implementation:** Products are moved to `ArchivedProduct` table (see below) before hard delete.

---

### 3. Billboard Deletion: Safe (Junction Cascades)

**No changes needed.** Both junction tables have `onDelete: Cascade`:

- `CategoryBillboard` - auto-deleted when billboard deleted
- `StoreMainBillboard` - auto-deleted when billboard deleted

Categories remain, they just lose that billboard from their list.

---

## 🗄️ ArchivedProduct: Soft Archive Strategy

### The Problem

When enforcing grace period deletions:

1. User warned for 7 days (usage grace period) + 5 days (enforcement deadline) = **12 days total warning**
2. But orders might be placed until the last minute before enforcement
3. Deleting products immediately could break active/pending orders
4. Cloudinary images deleted = broken images in order history

### The Solution: ArchivedProduct Table

Instead of hard-deleting products, **move them to an archive table** for a retention period.

### Design Principle: Mirror Product Fields

**Goal:** ArchivedProduct should have the **exact same field names** as Product (where applicable) so that:

- Code that fetches product data works with minimal changes
- Same variable names, same output shape
- **Store relation maintained** (same as Product → Store relation)
- Category/Size stored as string snapshots (since they may also be deleted)


```prisma
model ArchivedProduct {
  id                  String   @id @default(uuid())
  originalProductId   String   @unique  // The original Product.id before deletion
  name                String
  description         String   @default("") 
  titlepoints         String[]
  bulletPoints        String[]
  price               Decimal
  
  // Store relation (same as Product)
  storeId             String
  store               Store    @relation("StoreToArchivedProduct", fields: [storeId], references: [id])
  
  createdAt           DateTime              // Original product's createdAt
  updatedAt           DateTime              // Original product's updatedAt
  
  // Relation snapshots (stored as strings since category/size may be deleted)
  categoryName        String                // Snapshot: category.name
  sizeName            String                // Snapshot: size.name
  sizeValue           String                // Snapshot: size.value
  images              Json                  // Snapshot: ["url1", "url2", ...] from Image[]
  
  // Archive-specific metadata
  archivedAt          DateTime @default(now())
  archiveReason       String   // 'grace_period_enforcement', 'category_deleted', 'manual'
  expiresAt           DateTime // When to permanently delete (archivedAt + 3 months)

  @@index([storeId])
  @@index([originalProductId])
  @@index([expiresAt])
}

// Also add to Store model:
model Store {
  // ... existing fields ...
  archivedProducts    ArchivedProduct[] @relation("StoreToArchivedProduct")
}
```

### Field Mapping: Product → ArchivedProduct

| Product Field       | ArchivedProduct Field | Notes                                    |
| ------------------- | --------------------- | ---------------------------------------- |
| `id`                | `originalProductId`   | Store original ID for reference          |
| `name`              | `name`                | ✅ Same                                  |
| `description`       | `description`         | ✅ Same                                  |
| `titlepoints`       | `titlepoints`         | ✅ Same                                  |
| `bulletPoints`      | `bulletPoints`        | ✅ Same                                  |
| `price`             | `price`               | ✅ Same                                  |
| `storeId`           | `storeId`             | ✅ Same (with Store relation)            |
| `store`             | `store`               | ✅ Same relation to Store                |
| `createdAt`         | `createdAt`           | ✅ Same (original date)                  |
| `updatedAt`         | `updatedAt`           | ✅ Same (original date)                  |
| `category.name`     | `categoryName`        | 🔄 Flattened (category may be deleted)   |
| `size.name`         | `sizeName`            | 🔄 Flattened (size unlikely deleted but consistent) |
| `size.value`        | `sizeValue`           | 🔄 Flattened                             |
| `images[].url`      | `images` (Json)       | 🔄 Flattened to JSON array               |
| `isFeatured`        | ❌ Not stored         | Not needed for archived display          |
| `isArchived`        | ❌ Not stored         | Always archived (use `isFromArchive` in response) |
| `stockQuantity`     | ❌ Not stored         | Not relevant for archived products       |
| `lowStockThreshold` | ❌ Not stored         | Not relevant for archived products       |
| `categoryId`        | ❌ Not stored         | Category may be deleted, name is enough  |
| `sizeId`            | ❌ Not stored         | Size name/value is enough                |
| N/A                 | `originalProductId`   | 🆕 Reference to original product ID      |
| N/A                 | `archivedAt`          | 🆕 When archived                         |
| N/A                 | `archiveReason`       | 🆕 Why archived                          |
| N/A                 | `expiresAt`           | 🆕 When to permanently delete            |

### Code Reuse Example

```typescript
// Before: Fetching Product for order display
const product = await prismadb.product.findUnique({
  where: { id: productId },
  include: { images: true, category: true, size: true },
});

// Output shape:
// { name, price, description, images: [{url}], category: {name}, size: {name, value} }

// After: Fetching ArchivedProduct (same field names!)
const archivedProduct = await prismadb.archivedProduct.findUnique({
  where: { originalProductId: productId },
});

// Output shape (almost identical, just flattened):
// { name, price, description, images: ["url1"], categoryName, sizeName, sizeValue }

// Minimal code change needed:
const displayName = product?.name || archivedProduct?.name;
const displayPrice = product?.price || archivedProduct?.price;
const displayImages =
  product?.images.map((i) => i.url) || archivedProduct?.images;
const displayCategory = product?.category.name || archivedProduct?.categoryName;
```

---

## 🔍 Product Fetch Flow (with Authentication)

### API Response Structure

When fetching a product, the API should return a unified response with an `isFromArchive` field to distinguish:

```typescript
interface ProductResponse {
  // All product fields...
  name: string;
  price: Decimal;
  description: string;
  // ... etc
  
  // Distinguisher field for UI
  isFromArchive: boolean;  // true = archived product, false = active product
}
```

### Fetch Flow Logic

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRODUCT FETCH FLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Request: GET /api/[storeId]/products/[productId]                    │
│     │                                                                   │
│     ▼                                                                   │
│  2. Search in Product table first                                       │
│     │                                                                   │
│     ├─► FOUND: Return product with { ...product, isFromArchive: false } │
│     │                                                                   │
│     └─► NOT FOUND: Continue to step 3                                   │
│                                                                         │
│  3. Search in ArchivedProduct table (by originalProductId)              │
│     │                                                                   │
│     ├─► FOUND: Verify storeId matches request storeId                   │
│     │   │                                                               │
│     │   ├─► MATCH: Return { ...archivedProduct, isFromArchive: true }   │
│     │   │                                                               │
│     │   └─► NO MATCH: Return 404 (unauthorized access attempt)          │
│     │                                                                   │
│     └─► NOT FOUND: Return 404 (product doesn't exist)                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation Example

```typescript
// GET /api/[storeId]/products/[productId]/route.ts

export async function GET(
  req: Request,
  { params }: { params: { storeId: string; productId: string } }
) {
  const { storeId, productId } = params;

  // 1. Try to find in active products first
  const product = await prismadb.product.findUnique({
    where: { id: productId, storeId },
    include: { images: true, category: true, size: true },
  });

  if (product) {
    return NextResponse.json({
      ...product,
      isFromArchive: false,
    });
  }

  // 2. If not found, search in archived products
  const archivedProduct = await prismadb.archivedProduct.findUnique({
    where: { originalProductId: productId },
  });

  if (!archivedProduct) {
    return new NextResponse('Product not found', { status: 404 });
  }

  // 3. Verify store ownership (authentication)
  if (archivedProduct.storeId !== storeId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 4. Return archived product with flag
  return NextResponse.json({
    ...archivedProduct,
    isFromArchive: true,
  });
}
```

### UI Display Logic (Store Frontend)

```tsx
function ProductPage({ product }: { product: ProductResponse }) {
  return (
    <div>
      <h1>{product.name}</h1>
      <p>₹{product.price}</p>
      
      {/* Show different UI based on isFromArchive */}
      {product.isFromArchive ? (
        <Badge variant="secondary" className="mt-4">
          This product is no longer available
        </Badge>
      ) : (
        <AddToCartButton product={product} />
      )}
    </div>
  );
}
```

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRODUCT DELETION FLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Grace Period Enforcement Triggered                                  │
│     │                                                                   │
│     ▼                                                                   │
│  2. Identify products to delete (oldest first)                          │
│     │                                                                   │
│     ▼                                                                   │
│  3. For each product:                                                   │
│     │                                                                   │
│     ├─► Copy product data to ArchivedProduct table                      │
│     │   • Store all product fields as snapshot                          │
│     │   • Store image URLs as JSON array                                │
│     │   • Set expiresAt = now + 3 months                                │
│     │   • Set archiveReason = 'grace_period_enforcement'                │
│     │                                                                   │
│     ├─► Update OrderItem.productId to NULL (via SetNull)                │
│     │   • Snapshot data already preserved in OrderItem                  │
│     │                                                                   │
│     ├─► DON'T delete Cloudinary images yet                              │
│     │   • Images still accessible via ArchivedProduct.imageUrls         │
│     │   • Images still accessible via OrderItem.productImageUrl         │
│     │                                                                   │
│     └─► Delete product from Product table                               │
│         • Image records cascade delete (DB only, not Cloudinary)        │
│         • ProductRelation records cascade delete                        │
│                                                                         │
│  4. Cron job runs weekly:                                               │
│     │                                                                   │
│     └─► Find ArchivedProducts where expiresAt < now                     │
│         • Delete ALL Cloudinary images (no need to check OrderItems -   │
│           orders already have snapshot data, 3 months is enough time)   │
│         • Delete ArchivedProduct record                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Benefits of This Approach

| Benefit                | Explanation                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| **Order Continuity**   | Orders placed until last minute still have valid product images for 3 months |
| **Fulfillment Safety** | Pending/processing orders can still be fulfilled with full product info      |
| **Image Preservation** | Cloudinary images kept until truly safe to delete                            |
| **Audit Trail**        | Know what was deleted, when, and why                                         |
| **Recovery Option**    | Merchant could potentially restore products within retention period          |
| **Storage Efficiency** | Eventually cleans up after retention period                                  |
| **Count Accuracy**     | ArchivedProducts DON'T count toward plan limits                              |

### Why 3 Months?

- **Order fulfillment**: Most orders completed within 30 days
- **Return window**: Typical return policies are 30-60 days
- **Customer disputes**: Credit card chargebacks can happen up to 60 days
- **Buffer**: Extra time for edge cases
- **Storage cost**: Cloudinary storage is cheap, 3 months is reasonable

### Comparison: Direct Delete vs Archive

| Aspect                   | Direct Delete + SetNull                  | Archive Table (Recommended)             |
| ------------------------ | ---------------------------------------- | --------------------------------------- |
| **Immediate effect**     | Product gone, OrderItem.productId = null | Product gone, data preserved in archive |
| **Order history images** | ❌ Broken if Cloudinary deleted          | ✅ Still work for 3 months              |
| **Pending orders**       | ⚠️ Risky - no product data               | ✅ Full product data available          |
| **Storage**              | Immediate cleanup                        | Delayed cleanup (3 months)              |
| **Recovery**             | ❌ Impossible                            | ✅ Possible within retention            |
| **Complexity**           | Simple                                   | Moderate (new table + cron)             |
| **Plan limit count**     | ✅ Doesn't count                         | ✅ Doesn't count                        |

---

## 🔄 Complete Deletion Sequence

### Why This Order? (Billboards → Categories → Products)

The deletion order is **optimized for cascading effects**:

```
Example Scenario:
├── Billboards: 12 (limit: 10) → Need to delete 2
├── Categories: 8 (limit: 5) → Need to delete 3  
└── Products: 55 (limit: 50) → Need to delete 5

With optimized order:

1️⃣ Delete 2 Billboards first
   └── Safe operation, just removes from category billboard lists
   └── No cascade effect on products

2️⃣ Delete 3 Categories next
   └── Category A (10 products) → All 10 archived automatically
   └── Category B (8 products) → All 8 archived automatically
   └── Category C (5 products) → All 5 archived automatically
   └── Products now: 55 - 23 = 32 ✅ (already under 50 limit!)

3️⃣ Check Products remaining
   └── 32 < 50 → No individual product deletion needed! 🎉

Result: Deleting categories naturally brought products under limit!
```

### Benefits of This Order:

| Benefit | Explanation |
|---------|-------------|
| **Cascading Efficiency** | Category deletion auto-archives its products, reducing product count |
| **Less Individual Deletions** | May not need to delete products individually at all |
| **Safest First** | Billboards are safest to delete (no order history concerns) |
| **One-to-Many Leverage** | 1 category deletion = potentially many products archived |

### Grace Period Enforcement Order

```
1️⃣ BILLBOARDS (delete first - safest, no cascade concerns)
    ├── Delete Cloudinary image immediately
    ├── Delete from Billboard table (junction tables cascade)
    └── Decrement BILLBOARDS usage count
    └── Note: Categories just lose that billboard from their list

2️⃣ CATEGORIES (delete next - cascades to products)
    ├── For each category to delete:
    │   ├── Archive ALL products in that category first
    │   ├── Delete category (CategoryBillboard junctions cascade)
    │   └── Products auto-deleted (they were archived, so safe)
    ├── Decrement CATEGORIES usage count
    └── Decrement PRODUCTS usage count (for each archived product)
    └── ⚡ This might bring products under limit automatically!

3️⃣ PRODUCTS (delete remaining excess - if still over limit)
    ├── Recalculate: current products vs limit
    ├── If still over limit:
    │   ├── Archive oldest products first
    │   ├── Delete from Product table (OrderItem.productId → null)
    │   └── Decrement PRODUCTS usage count
    └── DON'T delete Cloudinary images (kept for 3 months)

4️⃣ CLEANUP CRON (runs separately, e.g., weekly)
    ├── Find expired ArchivedProducts (> 3 months old)
    ├── Delete ALL Cloudinary images (orders have snapshots)
    └── Delete ArchivedProduct records
```

### Deletion Logic Pseudocode

```typescript
async function enforceGracePeriodLimits(storeId: string, limits: PlanLimits) {
  const usage = await getCurrentUsage(storeId);
  
  // 1️⃣ BILLBOARDS FIRST (safest, no product impact)
  if (usage.billboards > limits.billboards) {
    const excess = usage.billboards - limits.billboards;
    const toDelete = await getOldestBillboards(storeId, excess);
    for (const billboard of toDelete) {
      await deleteCloudinaryImage(billboard.imageUrl); // Safe to delete immediately
      await prismadb.billboard.delete({ where: { id: billboard.id } });
    }
  }
  
  // 2️⃣ CATEGORIES NEXT (cascades to products!)
  if (usage.categories > limits.categories) {
    const excess = usage.categories - limits.categories;
    const toDelete = await getOldestCategories(storeId, excess);
    for (const category of toDelete) {
      // Archive all products in this category FIRST
      await archiveProductsInCategory(category.id, 'category_deleted');
      // Then delete category (products cascade delete, but already archived)
      await prismadb.category.delete({ where: { id: category.id } });
    }
  }
  
  // 3️⃣ PRODUCTS LAST (only if still over limit after category deletions)
  const updatedUsage = await getCurrentUsage(storeId); // Recount!
  if (updatedUsage.products > limits.products) {
    const excess = updatedUsage.products - limits.products;
    const toDelete = await getOldestProducts(storeId, excess);
    for (const product of toDelete) {
      await archiveProduct(product.id, 'grace_period_enforcement');
      await prismadb.product.delete({ where: { id: product.id } });
      // DON'T delete Cloudinary images - kept for 3 months
    }
  }
}
```

---

## 📋 Implementation Checklist

### Schema Changes Required

```prisma
// 1. Make OrderItem.productId nullable with SetNull
model OrderItem {
  productId       String?
  product         Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)
  // ... rest unchanged
}

// 2. Add ArchivedProduct table (mirrors Product fields for code reuse)
model ArchivedProduct {
  id                  String   @id @default(uuid())
  originalProductId   String   @unique  // The original Product.id

  // Same fields as Product (for code reuse)
  name              String
  description       String   @default("")
  titlepoints       String[]
  bulletPoints      String[]
  price             Decimal
  createdAt         DateTime
  updatedAt         DateTime

  // Store relation (same as Product)
  storeId           String
  store             Store    @relation("StoreToArchivedProduct", fields: [storeId], references: [id])

  // Relation snapshots (stored as strings since category/size may be deleted)
  categoryName      String
  sizeName          String
  sizeValue         String
  images            Json     // ["url1", "url2", ...]

  // Archive-specific metadata
  archivedAt        DateTime @default(now())
  archiveReason     String   // 'grace_period_enforcement', 'category_deleted', 'manual'
  expiresAt         DateTime // archivedAt + 3 months

  @@index([storeId])
  @@index([originalProductId])
  @@index([expiresAt])
}

// 3. Add relation to Store model
model Store {
  // ... existing fields ...
  archivedProducts  ArchivedProduct[] @relation("StoreToArchivedProduct")
}
```

### Code Changes Required

| File                                      | Change                                                       |
| ----------------------------------------- | ------------------------------------------------------------ |
| `usage-service.ts`                        | Archive products before deletion, skip Cloudinary deletion   |
| New: `cleanup-archived-products/route.ts` | Cron job to purge expired archives                           |
| `categories/[categoryId]/route.ts`        | Archive products when category deleted                       |
| `products/[productId]/route.ts`           | Archive instead of hard delete (optional for manual deletes) |

### Cron Job: Cleanup Expired Archives

**Note:** No need to check if OrderItems reference images. Orders already have snapshot data (`productImageUrl`), and after 3 months, it's safe to delete. If the Cloudinary image is gone, the order will show a placeholder - which is acceptable after 3 months.

```typescript
// src/app/api/cron/cleanup-archived-products/route.ts

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const now = new Date();

  // 1. Find expired archived products
  const expired = await prismadb.archivedProduct.findMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  let deletedCount = 0;
  let imagesDeleted = 0;

  for (const archived of expired) {
    // 2. Get image URLs from JSON
    const imageUrls = archived.images as string[];

    // 3. Delete ALL Cloudinary images (no need to check OrderItem references)
    // Orders have snapshot data, and after 3 months it's acceptable to show placeholder
    if (imageUrls.length > 0) {
      await deleteCloudinaryImages(imageUrls);
      imagesDeleted += imageUrls.length;
    }

    // 4. Delete the archived record
    await prismadb.archivedProduct.delete({
      where: { id: archived.id },
    });

    deletedCount++;
  }

  return NextResponse.json({
    success: true,
    expiredArchives: expired.length,
    deletedArchives: deletedCount,
    imagesDeleted,
  });
}
```

---

## 🖼️ UI Display Logic

### Order History Display

```tsx
function OrderItemDisplay({ orderItem }: { orderItem: OrderItem }) {
  return (
    <div className="flex gap-4">
      {/* Always use snapshot image URL */}
      <img
        src={orderItem.productImageUrl || '/placeholder-product.png'}
        alt={orderItem.productName}
        onError={(e) => {
          // Fallback if image eventually deleted from Cloudinary
          (e.target as HTMLImageElement).src = '/placeholder-product.png';
        }}
        className="w-16 h-16 object-cover rounded"
      />

      <div>
        <p className="font-medium">{orderItem.productName}</p>
        {orderItem.productSize && (
          <p className="text-sm text-muted-foreground">
            Size: {orderItem.productSize}
          </p>
        )}
        <p className="text-sm">
          ₹{orderItem.priceAtPurchase} × {orderItem.quantity}
        </p>

        {/* Show if product no longer exists */}
        {!orderItem.productId && (
          <Badge variant="secondary" className="mt-1">
            Product no longer available
          </Badge>
        )}
      </div>
    </div>
  );
}
```

---

## 📊 Summary Table

| Entity               | Deletion Strategy        | Cloudinary    | Archive? | Notes                                  |
| -------------------- | ------------------------ | ------------- | -------- | -------------------------------------- |
| **Product**          | SetNull on OrderItem     | Delayed (6mo) | ✅ Yes   | Archive before delete                  |
| **Category**         | Cascade products first   | Via products  | N/A      | Archive products, then delete category |
| **Billboard**        | Safe (junction cascades) | Immediate     | ❌ No    | No order history concerns              |
| **UpcomingProducts** | Direct delete            | Immediate     | ❌ No    | No order history concerns              |

---

## 🔧 Environment Variables

```env
# Cloudinary (for image management)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Cron job security
CRON_SECRET=your_cron_secret
```

---

## ✅ Implementation Status

| Task                                                  | Status         |
| ----------------------------------------------------- | -------------- |
| Cloudinary utility (`src/lib/cloudinary.ts`)          | ✅ Implemented |
| Product DELETE route with Cloudinary cleanup          | ✅ Implemented |
| Billboard DELETE route with Cloudinary cleanup        | ✅ Implemented |
| UpcomingProducts DELETE route with Cloudinary cleanup | ✅ Implemented |
| `usage-service.ts` grace period enforcement           | ✅ Implemented |
| OrderItem.productId SetNull migration                 | ⏳ Pending     |
| ArchivedProduct table schema                          | ⏳ Pending     |
| Archive-before-delete logic in usage-service          | ⏳ Pending     |
| Archive-before-delete logic in category delete        | ⏳ Pending     |
| Cleanup cron job for expired archives                 | ⏳ Pending     |

---

## 🚀 PRE-IMPLEMENTATION CHECKLIST & FLOW

### What I Will Do When You Say "Implement"

#### Phase 1: Schema Changes (Prisma)

```
Step 1.1 → Update schema.prisma
           ├── Make OrderItem.productId nullable (String?)
           ├── Add onDelete: SetNull to OrderItem.product relation
           └── Add ArchivedProduct model (mirroring Product fields)

Step 1.2 → Run migration
           └── npx prisma migrate dev --name add_archived_product_and_orderitem_setnull

Step 1.3 → Regenerate Prisma client
           └── npx prisma generate
```

#### Phase 2: Archive Utility Function

```
Step 2.1 → Create archive utility (src/lib/archive-product.ts)
           ├── archiveProduct(productId: string, reason: string)
           │   ├── Fetch product with category, size, images
           │   ├── Create ArchivedProduct record with same field names
           │   ├── Set expiresAt = now + 3 months
           │   └── Return archived record
           │
           └── archiveProductsInCategory(categoryId: string, reason: string)
               ├── Fetch all products in category
               └── Archive each product
```

#### Phase 3: Update Delete Routes

```
Step 3.1 → Update products/[productId]/route.ts DELETE
           ├── Before deletion: call archiveProduct()
           ├── DON'T delete Cloudinary images (keep for 3 months)
           └── Delete product from Product table (OrderItem.productId → null)

Step 3.2 → Update categories/[categoryId]/route.ts DELETE
           ├── Before deletion: call archiveProductsInCategory()
           ├── DON'T delete product Cloudinary images
           └── Delete category (products cascade delete after archiving)
```

#### Phase 4: Update Usage Service (Grace Period Enforcement)

```
Step 4.1 → Update usage-service.ts deleteExcessResources()
           ├── For PRODUCTS: archive before delete, skip Cloudinary
           ├── For CATEGORIES: archive products first, then delete category
           └── For BILLBOARDS: delete Cloudinary immediately (no archive needed)
```

#### Phase 5: Cleanup Cron Job

```
Step 5.1 → Create src/app/api/cron/cleanup-archived-products/route.ts
           ├── Find ArchivedProducts where expiresAt < now
           ├── For each expired archive:
           │   ├── Check if images still referenced in OrderItem
           │   ├── Delete safe Cloudinary images
           │   └── Delete ArchivedProduct record
           └── Return cleanup summary

Step 5.2 → Add to vercel.json cron configuration
           └── Schedule weekly cleanup (e.g., every Sunday at 3 AM)
```

#### Phase 6: Testing & Verification

```
Step 6.1 → Test product deletion
           ├── Create product → Delete → Verify archived
           └── Verify OrderItem.productId becomes null

Step 6.2 → Test category deletion
           ├── Create category with products → Delete category
           └── Verify all products archived before deletion

Step 6.6 → Test grace period enforcement
           ├── Simulate over-limit scenario
           └── Verify products archived, not hard deleted

Step 6.4 → Run build to check for TypeScript errors
           └── npm run build
```

### Files That Will Be Created/Modified

| File                                                     | Action | Description                             |
| -------------------------------------------------------- | ------ | --------------------------------------- |
| `prisma/schema.prisma`                                   | MODIFY | Add ArchivedProduct, update OrderItem   |
| `src/lib/archive-product.ts`                             | CREATE | Archive utility functions               |
| `src/app/api/[storeId]/products/[productId]/route.ts`    | MODIFY | Archive before delete                   |
| `src/app/api/[storeId]/categories/[categoryId]/route.ts` | MODIFY | Archive products before delete          |
| `src/lib/usage-service.ts`                               | MODIFY | Use archive in grace period enforcement |
| `src/app/api/cron/cleanup-archived-products/route.ts`    | CREATE | Cron job for expired archives           |
| `vercel.json`                                            | MODIFY | Add cron schedule                       |

### Quick Reference: Archive Function Signature

```typescript
// src/lib/archive-product.ts

/**
 * Archives a single product before deletion
 * @param productId - The product ID to archive
 * @param reason - 'grace_period_enforcement' | 'category_deleted' | 'manual'
 * @returns The created ArchivedProduct record
 */
export async function archiveProduct(
  productId: string,
  reason: string
): Promise<ArchivedProduct>;

/**
 * Archives all products in a category before category deletion
 * @param categoryId - The category ID whose products to archive
 * @param reason - Archive reason
 * @returns Array of created ArchivedProduct records
 */
export async function archiveProductsInCategory(
  categoryId: string,
  reason: string
): Promise<ArchivedProduct[]>;
```

### Estimated Time: ~30-45 minutes

---

**Ready to implement? Just say "implement deletion dependency analysis" and I'll execute all phases above!**
