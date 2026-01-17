# Size & Product Management: Complete Architecture and Flow

## Overview

In ShopPulse, **Size** is a required attribute for every product. Unlike many e-commerce platforms where a single product can have multiple size variants, ShopPulse uses a **one-product-one-size** model where each product record represents a specific size variant.

---

## Table of Contents

1. [Data Model Architecture](#1-data-model-architecture)
2. [Size Management Flow](#2-size-management-flow)
3. [Product-Size Relationship](#3-product-size-relationship)
4. [API Endpoints](#4-api-endpoints)
5. [Order & Purchase Flow](#5-order--purchase-flow)
6. [Frontend Implementation](#6-frontend-implementation)
7. [Storefront Integration](#7-storefront-integration)
8. [Best Practices](#8-best-practices)

---

## 1. Data Model Architecture

### 1.1 Size Model

```prisma
model Size {
  id        String    @id @default(uuid())
  storeId   String
  store     Store     @relation("StoreToSize", fields: [storeId], references: [id])
  name      String    // Display name: "Small", "Medium", "Large", "42", "10ml"
  value     String    // Short code: "S", "M", "L", "42", "10ML"
  products  Product[] // All products with this size
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([storeId])
}
```

**Field Explanations:**
| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `id` | UUID | Unique identifier | `"abc123-..."` |
| `storeId` | UUID | Store this size belongs to | `"store456-..."` |
| `name` | String | Human-readable name shown to customers | `"Medium"`, `"Size 42"`, `"500ml"` |
| `value` | String | Short code for badges/pills | `"M"`, `"42"`, `"500ML"` |
| `products` | Relation | All products using this size | - |

### 1.2 Product Model (Size-Related Fields)

```prisma
model Product {
  id        String   @id @default(uuid())
  name      String
  price     Decimal
  // ... other fields ...
  
  // Size Relationship
  sizeId    String
  size      Size     @relation(fields: [sizeId], references: [id])
  
  @@index([sizeId])  // Index for fast size-based queries
}
```

### 1.3 OrderItem Model (Size at Purchase Time)

```prisma
model OrderItem {
  id              String   @id @default(uuid())
  orderId         String
  productId       String?  // Nullable - set to null when product is deleted
  product         Product? @relation(fields: [productId], references: [id], onDelete: SetNull)
  quantity        Int      @default(1)
  priceAtPurchase Decimal
  productName     String   // Frozen at purchase time
  productSize     String?  // SIZE STORED AT PURCHASE TIME (sizeId reference)
  productImageUrl String?
  lineTotal       Decimal
}
```

**Why `productSize` is stored separately:**
- Products can be deleted after purchase
- Size records can be modified/deleted
- Order history must remain accurate even if source data changes
- Historical reporting requires frozen-in-time data

---

## 2. Size Management Flow

### 2.1 Size CRUD Operations

```
┌─────────────────────────────────────────────────────────────┐
│                      ADMIN PANEL                            │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Create Size  │    │  Edit Size   │    │ Delete Size  │  │
│  │              │    │              │    │              │  │
│  │ Name: "Large"│    │ Name: "XL"   │    │  Warning:    │  │
│  │ Value: "L"   │    │ Value: "XL"  │    │  Products    │  │
│  │              │    │              │    │  using this  │  │
│  └──────┬───────┘    └──────┬───────┘    │  size exist  │  │
│         │                   │            └──────┬───────┘  │
└─────────┼───────────────────┼───────────────────┼──────────┘
          │                   │                   │
          ▼                   ▼                   ▼
    POST /api/{storeId}  PATCH /api/{storeId}  DELETE /api/{storeId}
       /sizes             /sizes/{sizeId}      /sizes/{sizeId}
```

### 2.2 Size Listing Page Flow

```typescript
// src/app/(dashboard)/[storeId]/(routes)/sizes/page.tsx

// 1. Fetch all sizes for the store
const sizes = await prismadb.size.findMany({
  where: { storeId },
  orderBy: { createdAt: 'desc' }
});

// 2. Format for display
const formattedSizes = sizes.map((item) => ({
  id: item.id,
  name: item.name,
  value: item.value,
  createdAt: format(item.createdAt, 'MMMM do, yyyy'),
}));

// 3. Render in data table
<SizesClient data={formattedSizes} />
```

---

## 3. Product-Size Relationship

### 3.1 How Products Are Associated with Sizes

```
┌──────────────────────────────────────────────────────────────────┐
│                         STORE: "Fashion Store"                   │
│                                                                  │
│  ┌──────────────┐     ┌──────────────────────────────────────┐  │
│  │    SIZES     │     │              PRODUCTS                 │  │
│  │              │     │                                       │  │
│  │ ┌──────────┐ │     │  ┌────────────────────────────────┐  │  │
│  │ │ Small    │◄├─────┼──┤ Blue T-Shirt (Small) - $19.99  │  │  │
│  │ │ id: s1   │ │     │  │ sizeId: s1                     │  │  │
│  │ └──────────┘ │     │  └────────────────────────────────┘  │  │
│  │              │     │                                       │  │
│  │ ┌──────────┐ │     │  ┌────────────────────────────────┐  │  │
│  │ │ Medium   │◄├─────┼──┤ Blue T-Shirt (Medium) - $19.99 │  │  │
│  │ │ id: s2   │ │     │  │ sizeId: s2                     │  │  │
│  │ └──────────┘ │     │  └────────────────────────────────┘  │  │
│  │              │     │                                       │  │
│  │ ┌──────────┐ │     │  ┌────────────────────────────────┐  │  │
│  │ │ Large    │◄├─────┼──┤ Blue T-Shirt (Large) - $19.99  │  │  │
│  │ │ id: s3   │ │     │  │ sizeId: s3                     │  │  │
│  │ └──────────┘ │     │  └────────────────────────────────┘  │  │
│  │              │     │                                       │  │
│  └──────────────┘     └──────────────────────────────────────┘  │
│                                                                  │
│  NOTE: Each product is a SEPARATE record, not a variant          │
│        This allows independent stock tracking per size           │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Product Form - Size Selection

When creating/editing a product, the user selects a size from a dropdown:

```tsx
// src/app/(dashboard)/[storeId]/(routes)/products/[productId]/components/product-basic-details.tsx

<FormField
  control={control}
  name="sizeId"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Size</FormLabel>
      <Select
        disabled={loading}
        onValueChange={field.onChange}
        value={field.value}
        defaultValue={field.value}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue
              defaultValue={field.value}
              placeholder="Select a size"
            />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {sizes.map((size) => (
            <SelectItem key={size.id} value={size.id}>
              {size.name} ({size.value})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### 3.3 Product Creation with Size

```typescript
// API: POST /api/{storeId}/products

const product = await prismadb.product.create({
  data: {
    name,
    price,
    storeId,
    categoryId,
    sizeId,        // ← Size ID stored here
    // ... other fields
  },
});
```

---

## 4. API Endpoints

### 4.1 Size Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/{storeId}/sizes` | List all sizes for a store |
| `POST` | `/api/{storeId}/sizes` | Create a new size |
| `GET` | `/api/{storeId}/sizes/{sizeId}` | Get a specific size |
| `PATCH` | `/api/{storeId}/sizes/{sizeId}` | Update a size |
| `DELETE` | `/api/{storeId}/sizes/{sizeId}` | Delete a size |

### 4.2 Product Endpoints with Size Filtering

```typescript
// GET /api/{storeId}/products?sizeId={sizeId}

const { searchParams } = new URL(req.url);
const sizeId = searchParams.get('sizeId') || undefined;

const products = await prismadb.product.findMany({
  where: {
    storeId,
    sizeId,           // Filter by size if provided
    isFeatured: true,
    isArchived: false
  },
  include: {
    images: true,
    category: true,
    size: true        // Include size details in response
  },
});
```

### 4.3 Size API Response Structure

```typescript
// GET /api/{storeId}/sizes
[
  {
    "id": "abc123-...",
    "storeId": "store456-...",
    "name": "Small",
    "value": "S",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  },
  {
    "id": "def456-...",
    "storeId": "store456-...",
    "name": "Medium",
    "value": "M",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
]
```

### 4.4 Product Response with Size Included

```typescript
// GET /api/{storeId}/products/{productId}
{
  "id": "prod789-...",
  "name": "Premium Cotton T-Shirt",
  "price": 1999,
  "sizeId": "abc123-...",
  "size": {
    "id": "abc123-...",
    "name": "Medium",
    "value": "M"
  },
  // ... other fields
}
```

---

## 5. Order & Purchase Flow

### 5.1 Checkout Process - Size Capture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  STOREFRONT │     │   CHECKOUT  │     │   ADMIN     │     │   ORDER     │
│  Cart Item  │     │    API      │     │   DB        │     │  HISTORY    │
│             │     │             │     │             │     │             │
│ productId   │────►│ Validate    │────►│ Create      │────►│ productSize │
│ quantity: 2 │     │ products    │     │ OrderItem   │     │ stored as   │
│             │     │             │     │             │     │ snapshot    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 5.2 Order Item Creation Code

```typescript
// src/app/api/[storeId]/checkout/route.ts

// Create order with items
const order = await tx.order.create({
  data: {
    storeId,
    // ... customer info ...
    orderItems: {
      create: items.map((item) => {
        const product = products.find((p) => p.id === item.productId)!;
        return {
          productId: product.id,
          quantity: item.quantity,
          priceAtPurchase: product.price,
          productName: product.name,
          productSize: product.sizeId,    // ← Size ID captured at purchase
          productImageUrl: product.images[0]?.url,
          lineTotal: item.quantity * parseFloat(product.price.toString()),
        };
      }),
    },
  },
  include: { orderItems: true },
});
```

### 5.3 Order Display with Size

```tsx
// src/app/(dashboard)/[storeId]/(routes)/orders/[orderId]/components/order-details-client.tsx

{order.orderItems.map((item) => (
  <div key={item.id} className="flex items-center gap-4">
    <Image src={item.productImageUrl} alt={item.productName} />
    <div>
      <p className="font-medium">{item.productName}</p>
      {item.productSize && (
        <Badge variant="secondary">{item.productSize}</Badge>
      )}
      <p>Qty: {item.quantity}</p>
      <p>₹{item.priceAtPurchase}</p>
    </div>
  </div>
))}
```

---

## 6. Frontend Implementation

### 6.1 Size Form Component

```tsx
// Create/Edit Size Form
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.string().min(1, "Value is required"),
});

type SizeFormValues = z.infer<typeof formSchema>;

export const SizeForm = ({ initialData }) => {
  const form = useForm<SizeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      value: "",
    },
  });

  const onSubmit = async (data: SizeFormValues) => {
    if (initialData) {
      await axios.patch(`/api/${storeId}/sizes/${sizeId}`, data);
    } else {
      await axios.post(`/api/${storeId}/sizes`, data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Size name (e.g., Small, 42, 500ml)" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value</FormLabel>
              <FormControl>
                <Input placeholder="Short code (e.g., S, 42, 500ML)" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit">{initialData ? "Save" : "Create"}</Button>
      </form>
    </Form>
  );
};
```

### 6.2 Sizes Table Columns

```tsx
// src/app/(dashboard)/[storeId]/(routes)/sizes/components/columns.tsx

export type SizeColumn = {
  id: string;
  name: string;
  value: string;
  createdAt: string;
};

export const columns: ColumnDef<SizeColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "value",
    header: "Value",
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
```

---

## 7. Storefront Integration

### 7.1 Fetching Products with Size

```typescript
// Storefront: Fetch products with size info
const getProducts = async (params: { categoryId?: string; sizeId?: string }) => {
  const searchParams = new URLSearchParams();
  if (params.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params.sizeId) searchParams.set("sizeId", params.sizeId);

  const res = await fetch(`${API_URL}/products?${searchParams.toString()}`);
  return res.json();
};
```

### 7.2 Size Filter Component (Storefront)

```tsx
// Storefront: Filter products by size
const SizeFilter = ({ sizes, selectedSize, onSelect }) => {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Size</h3>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            key={size.id}
            onClick={() => onSelect(size.id)}
            className={cn(
              "px-3 py-1 border rounded-full text-sm",
              selectedSize === size.id
                ? "bg-black text-white border-black"
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
            )}
          >
            {size.value}
          </button>
        ))}
      </div>
    </div>
  );
};
```

### 7.3 Product Card with Size Badge

```tsx
// Storefront: Display size on product card
const ProductCard = ({ product }) => {
  return (
    <div className="product-card">
      <Image src={product.images[0]?.url} alt={product.name} />
      <div className="p-4">
        <h3 className="font-medium">{product.name}</h3>
        
        {/* Size Badge */}
        <Badge variant="outline" className="mt-1">
          Size: {product.size.value}
        </Badge>
        
        <p className="text-lg font-bold mt-2">₹{product.price}</p>
      </div>
    </div>
  );
};
```

### 7.4 Product Detail Page with Size Display

```tsx
// Storefront: Product detail page
const ProductPage = ({ product }) => {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Images */}
      <ImageGallery images={product.images} />
      
      {/* Product Info */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        
        {/* Size Display */}
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Size:</span>
          <Badge className="text-lg">{product.size.name}</Badge>
          <span className="text-gray-500">({product.size.value})</span>
        </div>
        
        {/* Price */}
        <p className="text-2xl font-bold">₹{product.price}</p>
        
        {/* Stock Status */}
        <div className="text-sm">
          {product.stockQuantity > 0 ? (
            <span className="text-green-600">
              In Stock ({product.stockQuantity} available)
            </span>
          ) : (
            <span className="text-red-600">Out of Stock</span>
          )}
        </div>
        
        {/* Add to Cart */}
        <AddToCartButton product={product} />
      </div>
    </div>
  );
};
```

---

## 8. Best Practices

### 8.1 Size Naming Conventions

| Product Type | Name Examples | Value Examples |
|--------------|---------------|----------------|
| Clothing | Small, Medium, Large, X-Large | S, M, L, XL |
| Shoes | Size 6, Size 7, Size 8 | 6, 7, 8 |
| Bottles/Containers | 250ml, 500ml, 1 Liter | 250ML, 500ML, 1L |
| Electronics | 128GB, 256GB, 512GB | 128GB, 256GB, 512GB |
| Generic | Standard, Premium, Family Pack | STD, PRM, FAM |

### 8.2 Database Design Considerations

1. **Index on `sizeId`**: Products are often filtered by size
   ```prisma
   @@index([sizeId])
   ```

2. **Size is required**: Every product must have a size
   ```prisma
   sizeId String  // Not nullable
   ```

3. **Cascade behavior**: Products prevent size deletion (soft constraint)
   - Admin UI should warn before deleting a size with products

### 8.3 Stock Management Per Size

```
┌─────────────────────────────────────────────────────────────────┐
│                      T-SHIRT INVENTORY                          │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ Blue T-Shirt (S)    │  │ Blue T-Shirt (M)    │               │
│  │ Stock: 25 units     │  │ Stock: 50 units     │               │
│  │ Low threshold: 5    │  │ Low threshold: 10   │               │
│  └─────────────────────┘  └─────────────────────┘               │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ Blue T-Shirt (L)    │  │ Blue T-Shirt (XL)   │               │
│  │ Stock: 30 units     │  │ Stock: 15 units     │               │
│  │ Low threshold: 5    │  │ Low threshold: 5    │               │
│  └─────────────────────┘  └─────────────────────┘               │
│                                                                 │
│  BENEFIT: Each size has independent stock tracking              │
│  - Auto-archive when stock = 0                                  │
│  - Low stock alerts per size                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 8.4 Size-Related Use Cases

| Use Case | Implementation |
|----------|----------------|
| "Show all Medium shirts" | Filter products by `sizeId` AND `categoryId` |
| "Which sizes are available?" | Get distinct sizes from products with stock > 0 |
| "Group products by size" | Use `groupBy` in Prisma query |
| "Size guide" | Static content or separate model for size charts |

---

## Summary

The Size system in ShopPulse is a **simple but effective** one-to-one relationship where:

1. **Sizes** are store-specific entities with a name and value
2. **Products** each have exactly one size (not variants)
3. **Orders** capture the size at purchase time for historical accuracy
4. **Filtering** is straightforward via `sizeId` query parameter
5. **Stock** is tracked independently per product (per size variant)

This design prioritizes simplicity and independent stock tracking over variant management, making it ideal for stores where each size is essentially a different product SKU.
