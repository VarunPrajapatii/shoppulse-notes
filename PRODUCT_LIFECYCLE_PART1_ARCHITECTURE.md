# Product Management System - Part 1: Architecture & Data Flow

## Overview

This document provides a comprehensive analysis of the entire product management system in ShopPulse Admin. Understanding this architecture is crucial before implementing enhancements.

---

## 1. Database Schema (Prisma)

### Product Model

```prisma
model Product {
  id                String   @id @default(uuid())
  name              String
  description       String   @default("")
  titlepoints       String[]    // Key features below title (max 4, 30 chars each)
  bulletPoints      String[]    // Detailed points (max 6, 120 chars each)
  price             Decimal     // Current: MRP/Actual price
  isFeatured        Boolean  @default(false)
  isArchived        Boolean  @default(false)
  stockQuantity     Int      @default(0)
  lowStockThreshold Int      @default(5)

  // Archive tracking
  archivedReason    String?     // 'manual', 'out_of_stock', 'plan_downgrade'
  archivedAt        DateTime?

  // Relations
  storeId           String
  store             Store       @relation("StoreToProduct", ...)
  categoryId        String
  category          Category    @relation("CategoryToProduct", ...)
  sizeId            String
  size              Size        @relation(...)
  images            Image[]
  orderItems        OrderItem[]
  relatedFromProducts ProductRelation[] @relation("MainProduct")
  relatedToProducts   ProductRelation[] @relation("RelatedProduct")
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([storeId])
  @@index([categoryId])
  @@index([sizeId])
  @@index([stockQuantity])
}
```

### Supporting Models

```prisma
model Image {
  id        String   @id @default(uuid())
  url       String   // Cloudinary URL
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ProductRelation {
  id               String   @id @default(uuid())
  mainProductId    String   // Product that "has" related products
  relatedProductId String   // Product that's "related to" main
  mainProduct      Product  @relation("MainProduct", ...)
  relatedProduct   Product  @relation("RelatedProduct", ...)
  
  @@unique([mainProductId, relatedProductId])
}

model ArchivedProduct {
  id                String   @id @default(uuid())
  originalProductId String   @unique
  name              String
  description       String   @default("")
  titlepoints       String[]
  bulletPoints      String[]
  price             Decimal
  // ... flattened relations (categoryName, sizeName, sizeValue)
  images            Json     // Snapshot: ["url1", "url2", ...]
  archiveReason     String   // 'grace_period_enforcement', 'manual'
  expiresAt         DateTime // archivedAt + 3 months
}
```

---

## 2. Complete File Map

### Dashboard (Admin) Files

```
src/app/(dashboard)/[storeId]/(routes)/products/
├── page.tsx                          # Product list page (server component)
├── components/
│   ├── client.tsx                    # DataTable wrapper
│   ├── columns.tsx                   # Table column definitions
│   └── cell-action.tsx               # Row actions (edit, copy, delete)
└── [productId]/
    ├── page.tsx                      # Create/Edit page (server component)
    └── components/
        ├── product-form.tsx          # Main form orchestrator
        ├── product-basic-details.tsx # Name, price, stock, category, size, flags
        ├── product-title-points.tsx  # Key features (max 4)
        ├── product-description.tsx   # Description + bullet points
        └── product-related-items.tsx # Related products selector
```

### API Routes

```
src/app/api/[storeId]/products/
├── route.ts                          # GET (list), POST (create)
├── [productId]/
│   └── route.ts                      # GET, PATCH, DELETE
└── featured-count/
    └── route.ts                      # GET featured count

src/app/api/[storeId]/categories/[categoryId]/products/
└── route.ts                          # GET products by category (storefront)
```

### Supporting Libraries

```
src/lib/
├── cloudinary.ts                     # Image upload/delete operations
├── archive-product.ts                # Archive logic before deletion
├── redis-cache.ts                    # Product caching
└── usage-service.ts                  # Track product count limits
```

---

## 3. Data Flow Diagrams

### 3.1 Product Creation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCT CREATION FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Add New"
        │
        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  [productId]/page.tsx (Server Component)                                     │
│                                                                              │
│  1. productId = 'new' (from URL)                                             │
│  2. product = prisma.product.findUnique({ id: 'new' }) → null                │
│  3. Fetch categories, sizes, allProducts for dropdowns                       │
│  4. Render <ProductForm initialData={null} />                                │
└──────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  ProductForm (Client Component)                                              │
│                                                                              │
│  1. initialData is null → Show "Create Product" mode                         │
│  2. Initialize form with defaults:                                           │
│     - name: '', price: 0, stockQuantity: 0                                   │
│     - isFeatured: false, isArchived: false                                   │
│     - titlePoints: [], bulletPoints: [], description: ''                     │
│     - images: [], relatedProductIds: []                                      │
└──────────────────────────────────────────────────────────────────────────────┘
        │
        │  User fills form + uploads images
        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Image Upload (Cloudinary)                                                   │
│                                                                              │
│  <ImageUpload />                                                             │
│     │                                                                        │
│     ▼                                                                        │
│  <CldUploadWidget uploadPreset="preset1" />                                  │
│     │                                                                        │
│     ▼                                                                        │
│  Cloudinary Widget opens → User selects file                                 │
│     │                                                                        │
│     ▼                                                                        │
│  Upload to Cloudinary → Returns secure_url                                   │
│     │                                                                        │
│     ▼                                                                        │
│  onUpload(result) → field.onChange([...images, { url: secure_url }])         │
└──────────────────────────────────────────────────────────────────────────────┘
        │
        │  Form submit
        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  API: POST /api/[storeId]/products                                           │
│                                                                              │
│  1. Auth check (Clerk)                                                       │
│  2. Validate all fields (name, price, images, categoryId, sizeId, etc.)      │
│  3. Check usage limit: checkCumulativeLimit(userId, 'PRODUCTS')              │
│  4. Check featured limit (max 30) if isFeatured=true                         │
│  5. Auto-archive if stockQuantity=0                                          │
│  6. Prisma create:                                                           │
│     └─ product + images (nested createMany)                                  │
│  7. Create ProductRelation records if relatedProductIds provided             │
│  8. Increment usage: incrementCumulative(userId, 'PRODUCTS')                 │
│  9. Invalidate cache: invalidateProductCache(storeId)                        │
│  10. Return created product                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Product Update Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCT UPDATE FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Edit" on a product
        │
        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  [productId]/page.tsx (Server Component)                                     │
│                                                                              │
│  1. productId = actual UUID from URL                                         │
│  2. product = prisma.product.findUnique({ id: productId, include: ... })     │
│  3. Convert Decimal price to number for client                               │
│  4. Fetch categories, sizes, allProducts                                     │
│  5. Render <ProductForm initialData={formattedProduct} />                    │
└──────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  ProductForm (Client Component)                                              │
│                                                                              │
│  1. initialData exists → Show "Edit Product" mode                            │
│  2. Populate form with existing data                                         │
│  3. isEditing = !!initialData = true                                         │
└──────────────────────────────────────────────────────────────────────────────┘
        │
        │  User makes changes + submits
        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  API: PATCH /api/[storeId]/products/[productId]                              │
│                                                                              │
│  1. Auth check (Clerk)                                                       │
│  2. Validate all fields                                                      │
│  3. Check featured limit (only if newly featuring)                           │
│  4. Auto-archive if stockQuantity=0                                          │
│  5. Get existing images from DB                                              │
│  6. Compare old vs new images:                                               │
│     └─ Find removed images → DELETE from Cloudinary                          │
│  7. Prisma update (two-step):                                                │
│     a. Update product fields + deleteMany images                             │
│     b. createMany new images                                                 │
│  8. Delete old ProductRelation records                                       │
│  9. Create new ProductRelation records                                       │
│  10. Invalidate cache                                                        │
│  11. Return updated product                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Product Deletion Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCT DELETION FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Delete" → Confirms in AlertModal
        │
        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  API: DELETE /api/[storeId]/products/[productId]                             │
│                                                                              │
│  1. Auth check (Clerk)                                                       │
│  2. Verify product exists                                                    │
│  3. ARCHIVE FIRST:                                                           │
│     └─ archiveProduct(productId, 'manual')                                   │
│         ├─ Fetch product with images, category, size                         │
│         ├─ Create ArchivedProduct record with:                               │
│         │   - Flattened category/size names                                  │
│         │   - Images as JSON array                                           │
│         │   - expiresAt = now + 3 months                                     │
│         └─ Log archive completion                                            │
│  4. Delete from Product table                                                │
│     └─ OrderItem.productId → SetNull (keeps order history)                   │
│  5. Decrement usage: decrementCumulative(userId, 'PRODUCTS')                 │
│  6. Invalidate cache                                                         │
│  7. Return { archived: true, message: '...archived for 3 months' }           │
│                                                                              │
│  NOTE: Cloudinary images NOT deleted here!                                   │
│        Kept for order history, cleanup cron deletes after expiration         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Storefront Product Fetch Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STOREFRONT PRODUCT FETCH FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

Category Page loads → Fetch products
        │
        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  API: GET /api/[storeId]/categories/[categoryId]/products                    │
│                                                                              │
│  1. Validate storeId and categoryId                                          │
│  2. Verify category belongs to store                                         │
│  3. Fetch ALL non-archived products:                                         │
│     prisma.product.findMany({                                                │
│       where: {                                                               │
│         storeId,                                                             │
│         categoryId,                                                          │
│         isArchived: false,  // Only active products                          │
│       },                                                                     │
│       include: { images, category, size },                                   │
│       orderBy: { createdAt: 'desc' },                                        │
│     })                                                                       │
│  4. Return JSON array                                                        │
│                                                                              │
│  ⚠️ NO FILTERS YET: sizeId filter NOT implemented                            │
│  ⚠️ NO PAGINATION: Returns ALL products (100-1500 per store)                 │
└──────────────────────────────────────────────────────────────────────────────┘

Featured Products (Homepage)
        │
        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  API: GET /api/[storeId]/products                                            │
│                                                                              │
│  Query params: ?categoryId=xxx&sizeId=xxx&filter=xxx                         │
│                                                                              │
│  1. Handle special filter=new-arrivals:                                      │
│     - Get store.newProductDays                                               │
│     - Calculate cutoff date                                                  │
│     - Fetch products created within N days                                   │
│     - Limit to 20                                                            │
│                                                                              │
│  2. Normal fetch with cache:                                                 │
│     - Build cache key with query params                                      │
│     - Cache-through pattern (check Redis → fetch DB on miss)                 │
│     - Filter: isFeatured=true, isArchived=false                              │
│     - Optional: categoryId, sizeId filters                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Current Product Fields Summary

| Field | Type | Purpose | Validation |
|-------|------|---------|------------|
| `name` | String | Product title | Required, min 1 char |
| `price` | Decimal | MRP/Actual price | Required, min 1 |
| `description` | String | Full description | Max 1200 chars |
| `titlepoints` | String[] | Key features below title | Max 4 items, 30 chars each |
| `bulletPoints` | String[] | Detailed features | Max 6 items, 120 chars each |
| `stockQuantity` | Int | Available stock | Required, min 0 |
| `lowStockThreshold` | Int | Alert threshold | Default 5, min 5 |
| `isFeatured` | Boolean | Show on homepage | Max 30 featured per store |
| `isArchived` | Boolean | Hide from storefront | Auto-true when stock=0 |
| `categoryId` | String | Category relation | Required |
| `sizeId` | String | Size variant | Required |
| `images` | Image[] | Product photos | Min 1 required |
| `relatedProductIds` | String[] | Related products | Same category, max 10 |

---

## 5. Key Business Rules

### 5.1 Featured Products
- **Maximum**: 30 featured products per store
- **Counting**: Includes archived products (prevents unarchive bypass)
- **UI Behavior**: Checkbox disabled when limit reached (for new products)

### 5.2 Stock Management
- **Auto-archive**: Products with stockQuantity=0 are auto-archived
- **Low Stock Alert**: Triggered when stock < lowStockThreshold

### 5.3 Related Products
- **Constraint**: Must be same category as main product
- **Maximum**: 10 related products
- **Bidirectional**: Stored as MainProduct → RelatedProduct

### 5.4 Archive System
- **Retention**: 3 months before permanent deletion
- **Reasons**: 'manual', 'grace_period_enforcement', 'out_of_stock'
- **Images**: Kept in Cloudinary during archive period

---

## Next: Part 2 - Proposed Enhancements & Implementation Plan
