# Advanced Product Sorting: Industry Standard Implementation Guide

## 📊 Current State Analysis

### What We Have Now

**Product Model:**
```prisma
model Product {
  id                String   @id @default(uuid())
  name              String
  price             Decimal
  isFeatured        Boolean  @default(false)
  isArchived        Boolean  @default(false)
  stockQuantity     Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  // ... other fields
}
```

**Order/Sales Data:**
```prisma
model OrderItem {
  productId       String?
  quantity        Int      @default(1)
  priceAtPurchase Decimal
  // ... other fields
}
```

### What's Missing for Industry-Standard Sorting

| Sort Type | Required Data | Current Status |
|-----------|---------------|----------------|
| Price (Low/High) | `price` | ✅ Available |
| Name (A-Z) | `name` | ✅ Available |
| Newest | `createdAt` | ✅ Available |
| Best Selling | Sales count per product | ❌ Not tracked |
| Popularity | View count per product | ❌ Not tracked |
| Rating | Average customer rating | ❌ Not implemented |
| Relevance | Search algorithm | ❌ Complex to implement |

---

## 🛒 Industry Standard: How Top E-commerce Platforms Sort

### Amazon's Sort Options
1. **Featured** - Manually curated + algorithm
2. **Price: Low to High** - Simple price sort
3. **Price: High to Low** - Simple price sort
4. **Avg. Customer Review** - Rating-based (requires review system)
5. **Newest Arrivals** - `createdAt` DESC

### Flipkart's Sort Options
1. **Relevance** - Default, combines multiple factors
2. **Popularity** - Based on views + sales
3. **Price: Low to High**
4. **Price: High to Low**
5. **Newest First**

### Shopify's Default
1. **Best Selling** - Based on order quantity
2. **Alphabetically: A-Z**
3. **Alphabetically: Z-A**
4. **Price: Low to High**
5. **Price: High to Low**
6. **Date: Old to New**
7. **Date: New to Old**

---

## 🎯 Recommended Sort Options for ShopPulse

Based on your business model (small-medium stores), I recommend:

### Tier 1: Must Have (Easy to Implement)
| Sort | Implementation | Effort |
|------|---------------|--------|
| Newest First | `createdAt DESC` | ✅ Done |
| Price: Low to High | `price ASC` | ✅ Done |
| Price: High to Low | `price DESC` | ✅ Done |
| Name: A-Z | `name ASC` | ✅ Done |

### Tier 2: Valuable Addition (Medium Effort)
| Sort | Implementation | Effort |
|------|---------------|--------|
| Best Selling | Add `soldCount` field | 2-4 hours |
| Popularity | Add `viewCount` field | 2-4 hours |

### Tier 3: Advanced (Complex)
| Sort | Implementation | Effort |
|------|---------------|--------|
| Relevance | ML/Search algorithm | Days/Weeks |
| Top Rated | Review system | Feature addition |

---

## 📐 Implementation Plan: Best Selling & Popularity

### Option A: Denormalized Counter Fields (Recommended)

Add counters directly to Product model for fast queries.

#### Schema Changes

```prisma
model Product {
  // Existing fields...
  
  // NEW: Sales & Engagement Metrics
  soldCount      Int      @default(0)  // Total units sold (all time)
  viewCount      Int      @default(0)  // Total product page views
  lastSoldAt     DateTime? // When was this product last sold
  
  // Indexes for fast sorting
  @@index([soldCount])
  @@index([viewCount])
}
```

#### How to Update soldCount

**Option A1: Update on Order Completion**

```typescript
// In webhook handler when order is paid
async function handleOrderPaid(order: Order) {
  // Get all order items
  const orderItems = await prismadb.orderItem.findMany({
    where: { orderId: order.id }
  });

  // Update soldCount for each product
  for (const item of orderItems) {
    if (item.productId) {
      await prismadb.product.update({
        where: { id: item.productId },
        data: {
          soldCount: { increment: item.quantity },
          lastSoldAt: new Date(),
        },
      });
    }
  }
}
```

**Option A2: Calculated on Demand (Slower but Always Accurate)**

```typescript
// Calculate from OrderItem table
async function getProductSalesCount(productId: string): Promise<number> {
  const result = await prismadb.orderItem.aggregate({
    where: {
      productId,
      order: {
        isPaid: true,
        orderStatus: { not: 'REFUNDED' }
      }
    },
    _sum: {
      quantity: true
    }
  });
  
  return result._sum.quantity || 0;
}
```

#### How to Update viewCount

```typescript
// API route: GET /api/[storeId]/products/[productId]/view
// Called when user views product detail page

export async function POST(
  req: Request,
  { params }: { params: { storeId: string; productId: string } }
) {
  const { storeId, productId } = params;

  // Increment view count
  await prismadb.product.update({
    where: { id: productId, storeId },
    data: {
      viewCount: { increment: 1 }
    }
  });

  return NextResponse.json({ success: true });
}
```

**Note:** For high-traffic stores, consider batching view updates with Redis:

```typescript
// Batch view counts with Redis
async function trackProductView(productId: string) {
  // Increment in Redis
  await redis.hincrby('product_views', productId, 1);
}

// Cron job: Sync Redis to DB every 5 minutes
async function syncViewCounts() {
  const views = await redis.hgetall('product_views');
  
  for (const [productId, count] of Object.entries(views)) {
    await prismadb.product.update({
      where: { id: productId },
      data: { viewCount: { increment: parseInt(count) } }
    });
  }
  
  await redis.del('product_views');
}
```

---

### Option B: Computed at Query Time (Alternative)

No schema changes, but slower for large datasets.

```typescript
// Get best selling products by category
async function getBestSellingProducts(categoryId: string, limit = 20) {
  const products = await prismadb.$queryRaw`
    SELECT 
      p.*,
      COALESCE(SUM(oi.quantity), 0) as total_sold
    FROM "Product" p
    LEFT JOIN "OrderItem" oi ON p.id = oi."productId"
    LEFT JOIN "Order" o ON oi."orderId" = o.id AND o."isPaid" = true
    WHERE p."categoryId" = ${categoryId}
      AND p."isArchived" = false
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT ${limit}
  `;
  
  return products;
}
```

**Pros:** Always accurate, no denormalization
**Cons:** Slow for large datasets, complex query

---

## 🔄 Migration Strategy

### Step 1: Add New Fields

```prisma
// prisma/schema.prisma
model Product {
  // ... existing fields
  
  // Sales & Engagement Metrics
  soldCount  Int       @default(0)
  viewCount  Int       @default(0)
  lastSoldAt DateTime?
  
  @@index([soldCount])
  @@index([viewCount])
}
```

### Step 2: Backfill Historical Data

```typescript
// scripts/backfill-sold-count.ts
async function backfillSoldCounts() {
  console.log('Starting soldCount backfill...');

  // Get all products
  const products = await prismadb.product.findMany({
    select: { id: true }
  });

  for (const product of products) {
    // Calculate total sold from order history
    const result = await prismadb.orderItem.aggregate({
      where: {
        productId: product.id,
        order: {
          isPaid: true,
          orderStatus: { notIn: ['CANCELLED', 'REFUNDED'] }
        }
      },
      _sum: {
        quantity: true
      }
    });

    const soldCount = result._sum.quantity || 0;

    // Get last sold date
    const lastOrder = await prismadb.orderItem.findFirst({
      where: {
        productId: product.id,
        order: { isPaid: true }
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });

    // Update product
    await prismadb.product.update({
      where: { id: product.id },
      data: {
        soldCount,
        lastSoldAt: lastOrder?.createdAt || null
      }
    });

    console.log(`Updated product ${product.id}: soldCount=${soldCount}`);
  }

  console.log('Backfill complete!');
}

backfillSoldCounts();
```

### Step 3: Update Order Webhook

```typescript
// src/app/api/webhook/razorpay/route.ts

// After order is marked as paid:
async function updateProductMetrics(orderId: string) {
  const orderItems = await prismadb.orderItem.findMany({
    where: { orderId }
  });

  await Promise.all(
    orderItems.map((item) => {
      if (!item.productId) return Promise.resolve();
      
      return prismadb.product.update({
        where: { id: item.productId },
        data: {
          soldCount: { increment: item.quantity },
          lastSoldAt: new Date()
        }
      });
    })
  );
}
```

### Step 4: Update Frontend Sort Options

```typescript
// types.ts
export const SORT_OPTIONS: SortOption[] = [
  { label: 'Best Selling', value: 'best-selling', sortBy: 'soldCount', order: 'desc' },
  { label: 'Most Popular', value: 'popular', sortBy: 'viewCount', order: 'desc' },
  { label: 'Newest First', value: 'newest', sortBy: 'createdAt', order: 'desc' },
  { label: 'Price: Low to High', value: 'price-asc', sortBy: 'price', order: 'asc' },
  { label: 'Price: High to Low', value: 'price-desc', sortBy: 'price', order: 'desc' },
  { label: 'Name: A to Z', value: 'name-asc', sortBy: 'name', order: 'asc' },
  { label: 'Name: Z to A', value: 'name-desc', sortBy: 'name', order: 'desc' },
];

// Hook update
const sortedProducts = useMemo(() => {
  return [...products].sort((a, b) => {
    let comparison = 0;

    switch (currentSort.sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'price':
        comparison = parseFloat(String(a.price)) - parseFloat(String(b.price));
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'soldCount':
        comparison = (a.soldCount || 0) - (b.soldCount || 0);
        break;
      case 'viewCount':
        comparison = (a.viewCount || 0) - (b.viewCount || 0);
        break;
    }

    return currentSort.order === 'asc' ? comparison : -comparison;
  });
}, [products, currentSort]);
```

---

## 🎲 "Relevance" Sort - The Complex One

### What is Relevance?

"Relevance" combines multiple factors into a single score:

```
relevanceScore = 
  (salesWeight × normalizedSales) +
  (recencyWeight × normalizedRecency) +
  (viewWeight × normalizedViews) +
  (stockWeight × inStockBonus) +
  (featuredWeight × isFeaturedBonus)
```

### Simple Relevance Implementation

```typescript
interface ProductWithScore extends Product {
  relevanceScore: number;
}

function calculateRelevanceScore(product: Product): number {
  const now = new Date().getTime();
  const createdAt = new Date(product.createdAt).getTime();
  const daysSinceCreation = (now - createdAt) / (1000 * 60 * 60 * 24);

  // Weights (adjust based on business needs)
  const weights = {
    sales: 0.35,      // 35% weight on sales
    recency: 0.25,    // 25% weight on how new the product is
    views: 0.20,      // 20% weight on views
    stock: 0.10,      // 10% boost for in-stock items
    featured: 0.10,   // 10% boost for featured items
  };

  // Normalize sales (0-100 scale, capped at 100 sales)
  const normalizedSales = Math.min((product.soldCount || 0) / 100, 1);

  // Recency score (1 for today, decays over 90 days)
  const recencyScore = Math.max(0, 1 - (daysSinceCreation / 90));

  // Normalize views (0-100 scale, capped at 1000 views)
  const normalizedViews = Math.min((product.viewCount || 0) / 1000, 1);

  // Stock bonus
  const stockBonus = product.stockQuantity > 0 ? 1 : 0;

  // Featured bonus
  const featuredBonus = product.isFeatured ? 1 : 0;

  // Calculate final score
  const score =
    weights.sales * normalizedSales +
    weights.recency * recencyScore +
    weights.views * normalizedViews +
    weights.stock * stockBonus +
    weights.featured * featuredBonus;

  return score;
}

// Usage in sorting
const sortedByRelevance = products
  .map((p) => ({ ...p, relevanceScore: calculateRelevanceScore(p) }))
  .sort((a, b) => b.relevanceScore - a.relevanceScore);
```

### When to Use Relevance Sort

- ✅ As default sort on category pages
- ✅ On search results
- ❌ When user explicitly chooses price/name sort

---

## 📋 Implementation Checklist

### Phase 1: Add Metrics Fields (Recommended Now)
- [ ] Add `soldCount Int @default(0)` to Product
- [ ] Add `viewCount Int @default(0)` to Product
- [ ] Add `lastSoldAt DateTime?` to Product
- [ ] Add indexes for sorting
- [ ] Run migration

### Phase 2: Backfill & Track
- [ ] Create backfill script for historical sales
- [ ] Update order webhook to increment soldCount
- [ ] Add view tracking endpoint (optional)

### Phase 3: Frontend Integration
- [ ] Add "Best Selling" sort option
- [ ] Add "Most Popular" sort option (if viewCount added)
- [ ] Update storefront category pages

### Phase 4: Advanced (Optional)
- [ ] Implement relevance scoring
- [ ] Add Redis batching for high-traffic view counts
- [ ] Add analytics dashboard for product performance

---

## 🏁 Summary

### Minimum Viable Implementation

**Add to schema:**
```prisma
model Product {
  // ... existing
  soldCount  Int @default(0)
  
  @@index([soldCount])
}
```

**Update on order paid:**
```typescript
await prismadb.product.update({
  where: { id: productId },
  data: { soldCount: { increment: quantity } }
});
```

**Add sort option:**
```typescript
{ label: 'Best Selling', value: 'best-selling', sortBy: 'soldCount', order: 'desc' }
```

This gives you **"Best Selling" sort** with ~2 hours of work.

### Full Implementation

1. `soldCount` - Track units sold ✅
2. `viewCount` - Track page views ⚡ (optional)
3. `lastSoldAt` - Know when product last sold ⚡ (optional)
4. Relevance score - Combine factors 🔮 (future)

---

## 🤔 My Recommendation for ShopPulse

**Start with `soldCount` only:**
- Gives you "Best Selling" sort (most valuable)
- Simple to implement
- Low maintenance
- High impact

**Skip `viewCount` for now:**
- Requires frontend tracking code in storefront
- Privacy concerns (GDPR)
- Less valuable than sales data
- Add later if needed

**Skip Relevance for now:**
- Overkill for small-medium stores
- Needs tuning and monitoring
- Add when you have 1000+ products
