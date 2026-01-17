# Storefront Size Variants Implementation Guide

## Overview

This document provides a complete guide for implementing the Myntra-style size variants feature in the **ShopPulse Storefront**. The admin panel has already been updated with the new variant system - now the storefront needs to be updated to support:

1. **Product Page** - Show size selector with stock availability per size
2. **Cart** - Display selected size alongside product, treat different sizes as separate line items
3. **Checkout** - Show size info in order summary
4. **Order Success/History** - Display size info for ordered items

---

## Database Schema (Clean Implementation)

### `ProductVariant` Model
```prisma
model ProductVariant {
  id                String   @id @default(uuid())
  productId         String
  product           Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  sizeId            String
  size              Size     @relation(fields: [sizeId], references: [id])
  stockQuantity     Int      @default(0)
  lowStockThreshold Int      @default(5)
  sku               String?  @db.VarChar(50)
  displayOrder      Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  orderItems        OrderItem[]  // Track which variant was ordered
  
  @@unique([productId, sizeId])
  @@index([productId])
  @@index([sizeId])
}
```

### `Product` Model (Inventory Fields)
```prisma
model Product {
  // ... other fields ...
  
  // Inventory System (Clean - No Legacy)
  hasVariants            Boolean  @default(false)  // TRUE = Myntra-style size variants, FALSE = single stock
  baseStockQuantity      Int      @default(0)      // Stock when hasVariants=false (electronics, furniture)
  baseLowStockThreshold  Int      @default(5)      // Threshold when hasVariants=false
  
  // Relations
  variants               ProductVariant[]  // All size variants (when hasVariants=true)
}
```

### `OrderItem` Model
```prisma
model OrderItem {
  // ... existing fields ...
  
  variantId   String?         // Which variant was ordered (for variant products)
  variant     ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
  productSize String?         // Size name stored for historical records
}
```

---

## API Response Structure

### Product Object (from /api/[storeId]/products)
```typescript
interface Product {
  id: string;
  name: string;
  price: number;           // Decimal converted to number
  sellingPrice: number | null;
  // ... other existing fields ...
  
  // INVENTORY FIELDS
  hasVariants: boolean;
  baseStockQuantity: number;      // Used when hasVariants=false
  baseLowStockThreshold: number;
  
  // Variants array (only populated when hasVariants=true)
  variants: ProductVariant[];
}

interface ProductVariant {
  id: string;
  productId: string;
  sizeId: string;
  size: {
    id: string;
    name: string;
    value: string;
  };
  stockQuantity: number;
  lowStockThreshold: number;
  sku: string | null;
  displayOrder: number;
}
```

---

## Implementation Tasks

### 1. Product Page - Size Selector

**File:** `app/product/[productId]/page.tsx` or similar

#### Changes Required:

```tsx
// Product page component
interface ProductPageProps {
  product: Product;
}

export default function ProductPage({ product }: ProductPageProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  
  // Determine available sizes and their stock
  const availableSizes = product.hasVariants
    ? product.variants.sort((a, b) => a.displayOrder - b.displayOrder)
    : []; // No sizes for non-variant products
  
  // Get current stock based on mode
  const getCurrentStock = () => {
    if (product.hasVariants) {
      return selectedVariant?.stockQuantity ?? 0;
    }
    return product.baseStockQuantity;
  };
  
  // Check if size is in stock
  const isInStock = (variant: ProductVariant) => variant.stockQuantity > 0;
  const isLowStock = (variant: ProductVariant) => 
    variant.stockQuantity > 0 && variant.stockQuantity <= variant.lowStockThreshold;
  
  return (
    <div>
      {/* ... existing product info ... */}
      
      {/* SIZE SELECTOR - Only for variant products */}
      {product.hasVariants && (
        <div className="size-selector">
          <h3>Select Size</h3>
          <div className="sizes-grid">
            {availableSizes.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariant(variant)}
                disabled={!isInStock(variant)}
                className={cn(
                  "size-button",
                  selectedVariant?.id === variant.id && "selected",
                  !isInStock(variant) && "out-of-stock"
                )}
              >
                {variant.size.name}
                {isLowStock(variant) && (
                  <span className="low-stock-badge">Only {variant.stockQuantity} left!</span>
                )}
                {!isInStock(variant) && (
                  <span className="sold-out-badge">Sold Out</span>
                )}
              </button>
            ))}
          </div>
          
          {/* Size guide link */}
          <button className="size-guide-link">Size Guide</button>
        </div>
      )}
      
      {/* STOCK STATUS */}
      <div className="stock-status">
        {getCurrentStock() > 0 ? (
          <span className="in-stock">In Stock ({getCurrentStock()} available)</span>
        ) : (
          <span className="out-of-stock">Out of Stock</span>
        )}
      </div>
      
      {/* ADD TO CART - Must include variant info */}
      <AddToCartButton
        product={product}
        variant={selectedVariant}
        disabled={product.hasVariants && !selectedVariant}
      />
    </div>
  );
}
```

#### Styling (Myntra-style):
```css
.size-selector {
  margin: 1rem 0;
}

.sizes-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.size-button {
  min-width: 50px;
  height: 50px;
  border: 1px solid #d5d6d9;
  border-radius: 50%;
  font-weight: 600;
  cursor: pointer;
  position: relative;
}

.size-button:hover:not(:disabled) {
  border-color: #ff3f6c;
}

.size-button.selected {
  border-color: #ff3f6c;
  background-color: #ff3f6c;
  color: white;
}

.size-button.out-of-stock {
  opacity: 0.5;
  text-decoration: line-through;
  cursor: not-allowed;
}

.low-stock-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff9800;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 4px;
}
```

---

### 2. Cart Implementation

**Cart Item Structure:**
```typescript
interface CartItem {
  productId: string;
  variantId?: string;      // NEW: For size variant tracking
  quantity: number;
  // Derived/cached data
  product: Product;
  variant?: ProductVariant; // NEW: Selected variant info
}

// Unique key for cart items
// IMPORTANT: Same product with different sizes = different cart items
const getCartItemKey = (item: CartItem) => {
  return item.variantId 
    ? `${item.productId}-${item.variantId}` 
    : item.productId;
};
```

**Cart Store Updates (Zustand/Context):**
```typescript
interface CartStore {
  items: CartItem[];
  
  // Updated addItem to handle variants
  addItem: (product: Product, variant?: ProductVariant) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
}

// Implementation
addItem: (product, variant) => {
  const items = get().items;
  const key = variant ? `${product.id}-${variant.id}` : product.id;
  
  // Check if this exact product+variant combo exists
  const existingIndex = items.findIndex(item => 
    item.productId === product.id && item.variantId === variant?.id
  );
  
  if (existingIndex !== -1) {
    // Update quantity
    const newItems = [...items];
    newItems[existingIndex].quantity += 1;
    set({ items: newItems });
  } else {
    // Add new item
    set({
      items: [
        ...items,
        {
          productId: product.id,
          variantId: variant?.id,
          quantity: 1,
          product,
          variant,
        },
      ],
    });
  }
}
```

**Cart Display:**
```tsx
// CartItem component
function CartItemRow({ item }: { item: CartItem }) {
  return (
    <div className="cart-item">
      <img src={item.product.images[0]?.url} alt={item.product.name} />
      <div className="item-info">
        <h4>{item.product.name}</h4>
        
        {/* SHOW SIZE IF VARIANT PRODUCT */}
        {item.variant && (
          <p className="size-info">
            Size: <strong>{item.variant.size.name}</strong>
          </p>
        )}
        
        <p className="price">
          ₹{item.product.sellingPrice || item.product.price}
        </p>
        
        {/* Stock warning */}
        {item.variant && item.variant.stockQuantity < item.quantity && (
          <p className="stock-warning">
            Only {item.variant.stockQuantity} available in this size
          </p>
        )}
      </div>
      <QuantitySelector item={item} />
      <RemoveButton item={item} />
    </div>
  );
}
```

---

### 3. Checkout API Update

**File:** `app/api/[storeId]/checkout/route.ts`

#### Updated Request Body:
```typescript
interface CheckoutRequestBody {
  items: {
    productId: string;
    variantId?: string;  // NEW: Optional variant ID
    quantity: number;
  }[];
  customerInfo: {
    // ... existing fields
  };
}
```

#### Validation Logic:
```typescript
async function POST(req: Request) {
  const { items } = await req.json();
  
  // Validate each item
  for (const item of items) {
    const product = await prismadb.product.findUnique({
      where: { id: item.productId },
      include: { variants: true },
    });
    
    if (!product) throw new Error(`Product ${item.productId} not found`);
    
    // Check stock based on variant mode
    if (product.hasVariants) {
      // Must have variantId for variant products
      if (!item.variantId) {
        throw new Error(`Size selection required for ${product.name}`);
      }
      
      const variant = product.variants.find(v => v.id === item.variantId);
      if (!variant) throw new Error(`Invalid size for ${product.name}`);
      
      if (variant.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name} (Size: ${variant.size.name})`);
      }
    } else {
      // Non-variant product - check base stock
      if (product.baseStockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
    }
  }
  
  // Create order with variant info
  const order = await prismadb.order.create({
    data: {
      storeId,
      isPaid: false,
      orderItems: {
        create: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId || null,  // NEW: Store variant ID
          quantity: item.quantity,
        })),
      },
    },
  });
  
  // ... rest of checkout logic
}
```

#### Stock Decrement on Payment Success:
```typescript
// In webhook handler or payment success callback
async function handlePaymentSuccess(orderId: string) {
  const order = await prismadb.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });
  
  // Decrement stock for each item
  for (const item of order.orderItems) {
    if (item.variantId) {
      // Decrement variant stock
      await prismadb.productVariant.update({
        where: { id: item.variantId },
        data: {
          stockQuantity: { decrement: item.quantity },
        },
      });
    } else {
      // Decrement base stock
      await prismadb.product.update({
        where: { id: item.productId },
        data: {
          baseStockQuantity: { decrement: item.quantity },
        },
      });
    }
  }
}
```

---

### 4. Order Success / Order History Pages

**OrderItem Display with Size:**
```tsx
interface OrderItemWithVariant {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    images: { url: string }[];
  };
  variant?: {
    id: string;
    size: {
      name: string;
      value: string;
    };
  };
}

function OrderItemDisplay({ item }: { item: OrderItemWithVariant }) {
  return (
    <div className="order-item">
      <img src={item.product.images[0]?.url} alt={item.product.name} />
      <div>
        <h4>{item.product.name}</h4>
        
        {/* Show size if variant */}
        {item.variant && (
          <p className="size">Size: {item.variant.size.name}</p>
        )}
        
        <p>Qty: {item.quantity}</p>
        <p>₹{item.product.price * item.quantity}</p>
      </div>
    </div>
  );
}
```

---

## Key Behavior Rules

### 1. Same Product, Different Sizes = Different Cart Items
```
User adds T-shirt (M) → Cart: [T-shirt M x1]
User adds T-shirt (L) → Cart: [T-shirt M x1, T-shirt L x1]
User adds T-shirt (M) → Cart: [T-shirt M x2, T-shirt L x1]
```

### 2. Order Display
```
Order #1234
- Blue T-shirt (Size M) x 2 — ₹998
- Blue T-shirt (Size L) x 1 — ₹499
- Laptop Stand x 1 — ₹1,299  (no size - hasVariants=false)
```

### 3. Stock Validation
- **Before adding to cart:** Check if variant has sufficient stock
- **At checkout:** Re-validate stock (may have changed)
- **After payment:** Decrement variant's stockQuantity

### 4. Products without Variants
- Electronics, furniture, etc. use `hasVariants: false`
- Stock managed in `baseStockQuantity`
- No size selector shown
- Cart just shows product name without size

---

## Migration Checklist for Storefront

- [ ] Update product detail page to show size selector
- [ ] Update cart store to handle variantId
- [ ] Update cart display to show selected size
- [ ] Update "Add to Cart" button to require size selection for variant products
- [ ] Update checkout API to accept variantId
- [ ] Update checkout API to validate variant stock
- [ ] Update order creation to store variantId
- [ ] Update payment success handler to decrement variant stock
- [ ] Update order success page to show sizes
- [ ] Update order history page to show sizes
- [ ] Add proper types/interfaces for new structures

---

## Testing Scenarios

1. **Add same product with different sizes** → Should appear as separate cart items
2. **Add to cart without selecting size** → Should show error/disable button
3. **Add out-of-stock size** → Should be disabled
4. **Low stock size** → Should show "Only X left" warning
5. **Checkout with variant products** → Order should have variantId
6. **Order history** → Should show size for each item
7. **Non-variant product** → Should work without size selector

---

## Example Storefront API Fetch

```typescript
// Fetching product with variants
const product = await fetch(`/api/${storeId}/products/${productId}`).then(r => r.json());

/*
Response structure:
{
  "id": "clxxx...",
  "name": "Blue Cotton T-Shirt",
  "price": 499,
  "sellingPrice": null,
  "hasVariants": true,
  "baseStockQuantity": 0,  // Not used when hasVariants=true
  "baseLowStockThreshold": 5,
  "variants": [
    {
      "id": "variant-1",
      "sizeId": "size-s",
      "size": { "id": "size-s", "name": "S", "value": "Small" },
      "stockQuantity": 25,
      "lowStockThreshold": 5,
      "displayOrder": 0
    },
    {
      "id": "variant-2", 
      "sizeId": "size-m",
      "size": { "id": "size-m", "name": "M", "value": "Medium" },
      "stockQuantity": 3,  // Low stock!
      "lowStockThreshold": 5,
      "displayOrder": 1
    },
    {
      "id": "variant-3",
      "sizeId": "size-l",
      "size": { "id": "size-l", "name": "L", "value": "Large" },
      "stockQuantity": 0,  // Out of stock!
      "lowStockThreshold": 5,
      "displayOrder": 2
    }
  ]
}
*/

// For non-variant product (electronics, etc.)
/*
{
  "id": "clyyy...",
  "name": "Laptop Stand",
  "price": 1299,
  "hasVariants": false,
  "baseStockQuantity": 50,
  "baseLowStockThreshold": 10,
  "variants": []  // Empty for non-variant products
}
*/
```

---

This guide provides everything needed to implement the Myntra-style size variants in the storefront!
