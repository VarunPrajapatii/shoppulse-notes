# Size Variant System - Complete Implementation Guide

## Overview

ShopPulse uses a **Myntra-style size variant system** where products can have multiple sizes with individual stock tracking per size. This document explains the complete implementation from database to storefront.

---

## Architecture Summary

### Two Inventory Modes

| Mode | `hasVariants` | Use Case | Stock Location |
|------|---------------|----------|----------------|
| **Size Variants** | `true` | Clothing, shoes, apparel | `ProductVariant.stockQuantity` per size |
| **Single Stock** | `false` | Electronics, furniture, accessories | `Product.baseStockQuantity` |

---

## Database Schema

### Product Model (Inventory Fields)

```prisma
model Product {
  id                     String   @id @default(uuid())
  name                   String
  // ... other fields ...

  // Inventory System
  hasVariants            Boolean  @default(false)   // Toggle: true = size variants, false = single stock
  baseStockQuantity      Int      @default(0)       // Used when hasVariants = false
  baseLowStockThreshold  Int      @default(5)       // Used when hasVariants = false

  // Relations
  variants               ProductVariant[]           // Only populated when hasVariants = true
}
```

### ProductVariant Model

```prisma
model ProductVariant {
  id                String   @id @default(uuid())
  productId         String
  product           Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  sizeId            String
  size              Size     @relation(fields: [sizeId], references: [id])
  stockQuantity     Int      @default(0)            // Stock for THIS size
  lowStockThreshold Int      @default(5)            // Low stock warning threshold
  sku               String?  @db.VarChar(50)        // Optional SKU per variant
  displayOrder      Int      @default(0)            // For consistent ordering (S, M, L, XL)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  orderItems        OrderItem[]                     // Track orders for this variant

  @@unique([productId, sizeId])                     // Each size only once per product
  @@index([productId])
  @@index([sizeId])
}
```

### Size Model

```prisma
model Size {
  id        String   @id @default(uuid())
  storeId   String
  store     Store    @relation(fields: [storeId], references: [id])
  name      String                                  // Display name: "S", "M", "L", "XL", "42", "44"
  value     String                                  // Description: "Small", "Medium", "Large"
  variants  ProductVariant[]                        // Products using this size
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([storeId])
}
```

### OrderItem Model

```prisma
model OrderItem {
  id              String   @id @default(uuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId       String?
  product         Product? @relation(fields: [productId], references: [id], onDelete: SetNull)
  variantId       String?                           // Which variant was purchased
  variant         ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
  quantity        Int      @default(1)
  priceAtPurchase Decimal
  productName     String                            // Stored for historical records
  productSize     String?                           // Size name stored for history
  productImageUrl String?
  lineTotal       Decimal
  createdAt       DateTime @default(now())

  @@index([orderId])
  @@index([productId])
  @@index([variantId])
}
```

---

## Admin Dashboard Flow

### 1. Size Management (`/[storeId]/sizes`)

Before creating products with size variants, store owner creates sizes:

**API:** `POST /api/[storeId]/sizes`
```json
{
  "name": "M",
  "value": "Medium"
}
```

Common size configurations:
- **Clothing:** S, M, L, XL, XXL
- **Shoes:** 38, 39, 40, 41, 42, 43, 44
- **Jeans:** 28, 30, 32, 34, 36

### 2. Product Creation with Variants (`/[storeId]/products/new`)

#### Form Fields

The `ProductVariantsSection` component handles the inventory mode toggle:

```tsx
// Toggle between modes
<Switch
  checked={hasVariants}
  onCheckedChange={(checked) => setValue("hasVariants", checked)}
/>

// When hasVariants = true: Show variant fields
{hasVariants && (
  <VariantsEditor 
    variants={variants}
    sizes={availableSizes}
    onAdd={addVariant}
    onRemove={removeVariant}
  />
)}

// When hasVariants = false: Show single stock fields
{!hasVariants && (
  <StockFields
    baseStockQuantity={baseStockQuantity}
    baseLowStockThreshold={baseLowStockThreshold}
  />
)}
```

#### Variant Configuration Per Product

| Field | Description | Required |
|-------|-------------|----------|
| `sizeId` | Reference to Size | Yes |
| `stockQuantity` | Stock for this size | Yes |
| `lowStockThreshold` | Alert threshold | No (default: 5) |
| `sku` | Variant-specific SKU | No |
| `displayOrder` | Sort order | Auto-assigned |

**Constraints:**
- Maximum 8 variants per product
- Each size can only be used once per product
- Unique SKUs within store (no duplicates)

### 3. API: Product POST

**Endpoint:** `POST /api/[storeId]/products`

```typescript
// Request body for variant product
{
  "name": "Cotton T-Shirt",
  "price": 599,
  "categoryId": "cat-123",
  "images": [{ "url": "..." }],
  "hasVariants": true,
  "variants": [
    { "sizeId": "size-s", "stockQuantity": 50, "lowStockThreshold": 10 },
    { "sizeId": "size-m", "stockQuantity": 100, "lowStockThreshold": 15 },
    { "sizeId": "size-l", "stockQuantity": 75, "lowStockThreshold": 10 },
    { "sizeId": "size-xl", "stockQuantity": 25, "lowStockThreshold": 5 }
  ]
}

// Request body for single-stock product
{
  "name": "Laptop Stand",
  "price": 1299,
  "categoryId": "cat-456",
  "images": [{ "url": "..." }],
  "hasVariants": false,
  "baseStockQuantity": 100,
  "baseLowStockThreshold": 20
}
```

**Validation Logic:**
```typescript
if (hasVariants) {
  // Validate: at least 1 variant
  if (!variants || variants.length === 0) throw 'At least one variant required';
  // Validate: max 8 variants
  if (variants.length > 8) throw 'Maximum 8 variants allowed';
  // Validate: unique sizes
  const sizeIds = variants.map(v => v.sizeId);
  if (new Set(sizeIds).size !== sizeIds.length) throw 'Duplicate sizes';
  // Validate: each variant has valid data
  for (const v of variants) {
    if (!v.sizeId) throw 'Size required';
    if (v.stockQuantity < 0) throw 'Stock cannot be negative';
  }
} else {
  if (baseStockQuantity < 0) throw 'Stock cannot be negative';
}
```

**Database Transaction:**
```typescript
const product = await prismadb.$transaction(async (tx) => {
  // 1. Create product
  const newProduct = await tx.product.create({
    data: {
      name,
      price,
      hasVariants,
      baseStockQuantity: !hasVariants ? baseStockQuantity : 0,
      // ... other fields
    },
  });

  // 2. Create variants (only if hasVariants = true)
  if (hasVariants && variants.length > 0) {
    await tx.productVariant.createMany({
      data: variants.map((v, index) => ({
        productId: newProduct.id,
        sizeId: v.sizeId,
        stockQuantity: v.stockQuantity,
        lowStockThreshold: v.lowStockThreshold || 5,
        sku: v.sku?.toUpperCase() || null,
        displayOrder: v.displayOrder ?? index,
      })),
    });
  }

  return newProduct;
});
```

### 4. API: Product PATCH

**Endpoint:** `PATCH /api/[storeId]/products/[productId]`

When updating variants, the system:
1. Deletes all existing variants
2. Creates new variants from the request

```typescript
if (hasVariants) {
  // Delete existing variants
  await tx.productVariant.deleteMany({ where: { productId } });
  
  // Create new variants
  if (variants.length > 0) {
    await tx.productVariant.createMany({
      data: variants.map((v, index) => ({
        productId,
        sizeId: v.sizeId,
        stockQuantity: v.stockQuantity,
        lowStockThreshold: v.lowStockThreshold || 5,
        sku: v.sku?.toUpperCase() || null,
        displayOrder: v.displayOrder ?? index,
      })),
    });
  }
} else {
  // Switching to single-stock: delete all variants
  await tx.productVariant.deleteMany({ where: { productId } });
}
```

### 5. Product GET Response

**Endpoint:** `GET /api/[storeId]/products/[productId]`

```typescript
// Include variants in response
const product = await prismadb.product.findUnique({
  where: { id: productId },
  include: {
    images: true,
    category: true,
    variants: {
      include: { size: true },
      orderBy: { displayOrder: 'asc' },
    },
  },
});
```

**Response Structure:**
```json
{
  "id": "prod-123",
  "name": "Cotton T-Shirt",
  "price": 599,
  "hasVariants": true,
  "baseStockQuantity": 0,
  "baseLowStockThreshold": 5,
  "variants": [
    {
      "id": "var-1",
      "sizeId": "size-s",
      "size": { "id": "size-s", "name": "S", "value": "Small" },
      "stockQuantity": 50,
      "lowStockThreshold": 10,
      "sku": null,
      "displayOrder": 0
    },
    {
      "id": "var-2",
      "sizeId": "size-m",
      "size": { "id": "size-m", "name": "M", "value": "Medium" },
      "stockQuantity": 100,
      "lowStockThreshold": 15,
      "sku": null,
      "displayOrder": 1
    }
  ]
}
```

---

## Storefront Flow

### 1. Product Display

```typescript
// Determine stock based on product type
const getProductStock = (product: Product) => {
  if (product.hasVariants) {
    // Total stock across all variants
    return product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
  }
  return product.baseStockQuantity;
};

// Check if specific size is available
const isSizeAvailable = (variant: ProductVariant) => variant.stockQuantity > 0;
const isLowStock = (variant: ProductVariant) => 
  variant.stockQuantity > 0 && variant.stockQuantity <= variant.lowStockThreshold;
```

### 2. Size Selector Component

```tsx
{product.hasVariants && (
  <div className="size-selector">
    {product.variants
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((variant) => (
        <button
          key={variant.id}
          onClick={() => setSelectedVariant(variant)}
          disabled={variant.stockQuantity === 0}
          className={cn(
            "size-btn",
            selectedVariant?.id === variant.id && "selected",
            variant.stockQuantity === 0 && "out-of-stock"
          )}
        >
          {variant.size.name}
          {isLowStock(variant) && <span>Only {variant.stockQuantity} left!</span>}
        </button>
      ))}
  </div>
)}
```

### 3. Cart Implementation

```typescript
interface CartItem {
  productId: string;
  variantId?: string;  // For size variant products
  quantity: number;
  product: Product;
  variant?: ProductVariant;
}

// IMPORTANT: Same product with different sizes = different cart items
// T-Shirt (M) + T-Shirt (L) = 2 separate cart items
const getCartItemKey = (item: CartItem) => 
  item.variantId ? `${item.productId}-${item.variantId}` : item.productId;
```

### 4. Checkout API

**Endpoint:** `POST /api/[storeId]/checkout`

**Request:**
```json
{
  "items": [
    { "productId": "prod-123", "variantId": "var-2", "quantity": 2 },
    { "productId": "prod-456", "quantity": 1 }
  ],
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "address": "123 Main St"
}
```

**Validation Logic:**
```typescript
for (const item of items) {
  const product = products.find(p => p.id === item.productId);
  
  if (product.hasVariants) {
    // Variant product: must have variantId
    if (!item.variantId) {
      throw `Size selection required for ${product.name}`;
    }
    const variant = product.variants.find(v => v.id === item.variantId);
    if (!variant) {
      throw `Invalid size selected for ${product.name}`;
    }
    if (variant.stockQuantity < item.quantity) {
      throw `Insufficient stock for ${product.name} (Size: ${variant.size.name})`;
    }
  } else {
    // Single stock: check baseStockQuantity
    if (product.baseStockQuantity < item.quantity) {
      throw `Insufficient stock for ${product.name}`;
    }
  }
}
```

**Stock Decrement:**
```typescript
for (const item of items) {
  const product = products.find(p => p.id === item.productId);
  
  if (product.hasVariants && item.variantId) {
    // Decrement variant stock
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stockQuantity: { decrement: item.quantity } },
    });
    
    // Archive product if ALL variants out of stock
    const totalStock = await tx.productVariant.aggregate({
      where: { productId: product.id },
      _sum: { stockQuantity: true },
    });
    if (totalStock._sum.stockQuantity <= 0) {
      await tx.product.update({
        where: { id: product.id },
        data: { isArchived: true },
      });
    }
  } else {
    // Decrement base stock
    const newStock = product.baseStockQuantity - item.quantity;
    await tx.product.update({
      where: { id: product.id },
      data: {
        baseStockQuantity: newStock,
        isArchived: newStock <= 0,
      },
    });
  }
}
```

**Order Item Creation:**
```typescript
orderItems: {
  create: items.map((item) => {
    const product = products.find(p => p.id === item.productId);
    const variant = item.variantId 
      ? product.variants.find(v => v.id === item.variantId)
      : null;
    return {
      productId: product.id,
      variantId: item.variantId || null,
      quantity: item.quantity,
      priceAtPurchase: product.price,
      productName: product.name,
      productSize: variant?.size.name || null,  // Store size name for history
      productImageUrl: product.images[0]?.url,
      lineTotal: item.quantity * product.price,
    };
  }),
}
```

---

## Stock Alert System

**Endpoint:** `GET /api/[storeId]/stock-alert/[productId]`

```typescript
if (product.hasVariants) {
  // Check each variant for low stock
  const lowStockVariants = product.variants.filter(
    v => v.stockQuantity > 0 && v.stockQuantity <= v.lowStockThreshold
  );
  const outOfStockVariants = product.variants.filter(v => v.stockQuantity === 0);
  
  return {
    status: outOfStockVariants.length > 0 ? 'partial-out-of-stock' : 
            lowStockVariants.length > 0 ? 'low-stock' : 'in-stock',
    lowStockVariants,
    outOfStockVariants,
  };
} else {
  return {
    status: product.baseStockQuantity === 0 ? 'out-of-stock' :
            product.baseStockQuantity <= product.baseLowStockThreshold ? 'low-stock' : 'in-stock',
    currentStock: product.baseStockQuantity,
  };
}
```

---

## Auto-Archive Logic

Products are automatically archived when stock reaches zero:

| Product Type | Archive Condition |
|--------------|-------------------|
| Size Variants | ALL variant stocks = 0 |
| Single Stock | baseStockQuantity = 0 |

**Implementation:**
```typescript
// For variant products: check total across all variants
let totalStock = 0;
if (hasVariants && variants) {
  totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
} else {
  totalStock = baseStockQuantity;
}

const shouldArchive = totalStock === 0 ? true : isArchived;
```

---

## Products List Display

**File:** `products/page.tsx`

```typescript
// Get stock display info
const getStockInfo = (product: ProductWithRelations) => {
  if (product.hasVariants) {
    const totalStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
    const variantCount = product.variants.length;
    return `${totalStock} (${variantCount} sizes)`;
  }
  return product.baseStockQuantity.toString();
};

// Get size display
const getSizeDisplay = (product: ProductWithRelations) => {
  if (product.hasVariants) {
    return product.variants.map(v => v.size.name).join(', ');
  }
  return 'N/A';
};
```

---

## Key Constraints

| Constraint | Value | Notes |
|------------|-------|-------|
| Max variants per product | 8 | Reasonable limit for size ranges |
| SKU uniqueness | Store-wide | Both product and variant SKUs must be unique |
| Size uniqueness | Per product | Each size can only be used once per product |
| Stock minimum | 0 | Negative stock not allowed |

---

## Summary

The size variant system provides:

✅ **Flexibility:** Products can have size variants OR single stock  
✅ **Per-size tracking:** Individual stock for each size  
✅ **Automatic archiving:** Products archived when all stock depleted  
✅ **Order history:** Size info preserved for historical records  
✅ **Storefront support:** Cart handles same product in different sizes as separate items  
✅ **Stock alerts:** Per-variant low stock warnings  

This implementation mirrors the Myntra/Amazon approach where clothing has per-size inventory while electronics have single inventory.
