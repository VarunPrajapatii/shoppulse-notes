# New Arrivals and Featured Products Implementation Guide

## Executive Summary

This document analyzes ShopPulseAdmin's product management system and provides industry-standard recommendations for:
1. **New Arrivals Section** - Display recently added products
2. **Featured Products Control** - Managing which products appear on homepage

---

## 1. Current Product Management System Analysis

### Database Schema (Product Model)
```prisma
model Product {
  id                String   @id @default(uuid())
  name              String
  description       String   @default("")
  titlepoints       String[]
  bulletPoints      String[]
  price             Decimal
  isFeatured        Boolean  @default(false)  // ⚠️ Unlimited toggle
  isArchived        Boolean  @default(false)
  stockQuantity     Int      @default(0)
  lowStockThreshold Int      @default(5)
  
  // Timestamps for tracking
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  storeId           String
  categoryId        String
  sizeId            String
  images            Image[]
  orderItems        OrderItem[]
  relatedFromProducts ProductRelation[]
  relatedToProducts   ProductRelation[]
}
```

### Current API Endpoints

**GET `/api/[storeId]/products`**
- Returns products filtered by:
  - `categoryId` (optional query param)
  - `sizeId` (optional query param)
  - `isFeatured: true` (hardcoded filter)
  - `isArchived: false` (hardcoded filter)
- Ordered by: `createdAt DESC`
- Includes: images, category, size relations
- Cached with Redis (30 min TTL)

**POST `/api/[storeId]/products`**
- Creates new product with all fields
- No limit on `isFeatured` products
- Invalidates product cache on creation

**PATCH `/api/[storeId]/products/[productId]`**
- Updates product
- No limit on `isFeatured` toggle
- Invalidates cache on update

### Current UI Flow (Product Form)
```tsx
<FormField
  control={control}
  name="isFeatured"
  render={({ field }) => (
    <FormItem>
      <Checkbox
        checked={field.value}
        onCheckedChange={field.onChange}
      />
      <FormLabel>Featured</FormLabel>
      <FormDescription>
        This product will appear on the home page
      </FormDescription>
    </FormItem>
  )}
/>
```

**Current Issue:** User can mark ALL 200 products as featured with no restriction.

---

## 2. New Arrivals Section - Industry Standard Implementation

### Approach 1: Time-Based "New" Status with Count Limit (Recommended)

**Concept:** Show the **20 most recently created products** that are **less than 30 days old**. This prevents flooding the "New Arrivals" section when bulk-creating products.

**Example Scenarios:**
- Create 100 products today → Only 20 most recent show as "new arrivals"
- Create 5 products over 30 days → All 5 show as "new arrivals"
- After 31 days → Products automatically drop off regardless of count
- Gradual addition → New products naturally replace older ones

#### Database Changes
```prisma
model Store {
  // Add to Store model for per-store configuration
  newProductDays Int @default(30) // Products are "new" for 30 days
}
```

#### API Endpoint
**GET `/api/[storeId]/products?filter=new-arrivals`**

```typescript
// src/app/api/[storeId]/products/route.ts

export async function GET(req: Request, { params }: { params: Promise<{ storeId: string }> }) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter');
  
  if (filter === 'new-arrivals') {
    // Get store's "new" duration setting
    const store = await prismadb.store.findUnique({
      where: { id: storeId },
      select: { newProductDays: true },
    });
    
    const newProductDays = store?.newProductDays || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - newProductDays);
    
    const products = await prismadb.product.findMany({
      where: {
        storeId,
        isArchived: false,
        createdAt: {
          gte: cutoffDate, // Products created within last N days
        },
      },
      include: {
        images: true,
        category: true,
        size: true,
      },
      orderBy: {
        createdAt: 'desc', // Newest first
      },
      take: 20, // Limit to 20 new arrivals
    });
    
    return NextResponse.json(products);
  }
  
  // ... rest of GET logic for other filters
}
```

**Pros:**
- ✅ Fully automated - no manual work
- ✅ Consistent definition of "new"
- ✅ No database migration needed (uses existing `createdAt`)
- ✅ Scales well (always shows N recent products)
- ✅ No conflicts with featured products

**Cons:**
- ❌ No manual control over what's "new"

---

### Approach 2: Manual "New Arrival" Flag (Alternative)

**Concept:** Add explicit `isNewArrival` boolean field with admin control.

#### Database Changes
```prisma
model Product {
  isNewArrival Boolean @default(false)
  // Optional: Auto-expire
  newArrivalUntil DateTime? // Can be set to auto-expire "new" status
}
```

#### Migration
```bash
npx prisma migrate dev --name add_new_arrival_flag
```

#### API Changes
```typescript
// GET with filter
const products = await prismadb.product.findMany({
  where: {
    storeId,
    isArchived: false,
    isNewArrival: true,
    // Optional: Check expiry
    OR: [
      { newArrivalUntil: null },
      { newArrivalUntil: { gte: new Date() } },
    ],
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
});
```

#### UI Form Addition
```tsx
<FormField
  control={control}
  name="isNewArrival"
  render={({ field }) => (
    <FormItem>
      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
      <FormLabel>New Arrival</FormLabel>
      <FormDescription>
        Mark as "New Arrival" (visible in New Arrivals section)
      </FormDescription>
    </FormItem>
  )}
/>

{/* Optional: Expiry Date */}
<FormField
  control={control}
  name="newArrivalUntil"
  render={({ field }) => (
    <FormItem>
      <FormLabel>New Arrival Until (Optional)</FormLabel>
      <DatePicker
        date={field.value}
        onSelect={field.onChange}
        disabled={(date) => date < new Date()}
      />
      <FormDescription>
        Auto-remove from New Arrivals after this date
      </FormDescription>
    </FormItem>
  )}
/>
```

**Pros:**
- ✅ Full manual control
- ✅ Can feature specific products as "new" regardless of age
- ✅ Optional auto-expiry

**Cons:**
- ❌ Requires database migration
- ❌ Manual maintenance needed
- ❌ Can conflict with Featured products (product can be both)

---

### Approach 3: Hybrid - Time-Based with Manual Override (Best of Both)

Combine automatic time-based detection with manual override capability.

```typescript
async function getNewArrivals(storeId: string) {
  const store = await prismadb.store.findUnique({
    where: { id: storeId },
    select: { newProductDays: true },
  });
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (store?.newProductDays || 30));
  
  const products = await prismadb.product.findMany({
    where: {
      storeId,
      isArchived: false,
      OR: [
        // Auto: Created within last N days
        { createdAt: { gte: cutoffDate } },
        // Manual: Explicitly marked as new arrival
        { isNewArrival: true },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  
  return products;
}
```

---

## 3. Featured Products Control - The Real Problem

### Problem Statement
> "What if user has 200 products and checks all as featured? Should we restrict?"

**Current State:**
- ❌ No limit on featured products
- ❌ User can mark all products as featured
- ❌ Homepage becomes cluttered
- ❌ No curation value

### Industry Standard Solutions

#### Solution 1: Hard Limit with UI Warning (Recommended)

**Concept:** Restrict featured products to a fixed limit (e.g., 12 products).

##### Backend Validation
```typescript
// src/app/api/[storeId]/products/[productId]/route.ts

export async function PATCH(req: Request, { params }: { params: Promise<{ storeId: string; productId: string }> }) {
  const { storeId, productId } = await params;
  const body = await req.json();
  
  // If user is trying to feature this product
  if (body.isFeatured === true) {
    // Check current featured count
    const featuredCount = await prismadb.product.count({
      where: {
        storeId,
        isFeatured: true,
        isArchived: false,
        id: { not: productId }, // Exclude current product
      },
    });
    
    const MAX_FEATURED_PRODUCTS = 12;
    
    if (featuredCount >= MAX_FEATURED_PRODUCTS) {
      return new NextResponse(
        JSON.stringify({
          error: 'FEATURED_LIMIT_REACHED',
          message: `You can only feature up to ${MAX_FEATURED_PRODUCTS} products. Please unfeature another product first.`,
          currentFeaturedCount: featuredCount,
          maxAllowed: MAX_FEATURED_PRODUCTS,
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
  
  // ... rest of PATCH logic
}
```

##### Frontend Form Enhancement
```tsx
// src/app/(dashboard)/[storeId]/(routes)/products/[productId]/components/product-basic-details.tsx

export const ProductBasicDetails = ({ form, categories, sizes }: Props) => {
  const params = useParams();
  const [featuredCount, setFeaturedCount] = useState(0);
  const [loadingFeaturedCount, setLoadingFeaturedCount] = useState(false);
  
  const MAX_FEATURED_PRODUCTS = 12;
  
  // Fetch current featured count
  useEffect(() => {
    async function fetchFeaturedCount() {
      setLoadingFeaturedCount(true);
      try {
        const response = await axios.get(`/api/${params.storeId}/products/featured-count`);
        setFeaturedCount(response.data.count);
      } catch (error) {
        console.error('Failed to fetch featured count:', error);
      } finally {
        setLoadingFeaturedCount(false);
      }
    }
    
    fetchFeaturedCount();
  }, [params.storeId]);
  
  const isFeaturedValue = form.watch('isFeatured');
  const canFeature = isFeaturedValue || featuredCount < MAX_FEATURED_PRODUCTS;
  
  return (
    <FormField
      control={form.control}
      name="isFeatured"
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={!canFeature && !field.value}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>Featured</FormLabel>
            <FormDescription>
              This product will appear on the home page
              {!canFeature && !field.value && (
                <span className="block text-destructive mt-1">
                  ⚠️ Featured limit reached ({featuredCount}/{MAX_FEATURED_PRODUCTS}). 
                  Unfeature another product first.
                </span>
              )}
              {canFeature && (
                <span className="block text-muted-foreground mt-1">
                  {featuredCount}/{MAX_FEATURED_PRODUCTS} featured products
                </span>
              )}
            </FormDescription>
          </div>
        </FormItem>
      )}
    />
  );
};
```

##### New API Endpoint for Featured Count
```typescript
// src/app/api/[storeId]/products/featured-count/route.ts

import prismadb from "@/lib/prismadb";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    
    const count = await prismadb.product.count({
      where: {
        storeId,
        isFeatured: true,
        isArchived: false,
      },
    });
    
    return NextResponse.json({ 
      count,
      maxAllowed: 12,
      available: Math.max(0, 12 - count),
    });
  } catch (error) {
    console.error('[FEATURED_COUNT_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
```

**Pros:**
- ✅ Enforces curation (quality over quantity)
- ✅ Clear user feedback
- ✅ Industry standard (most e-commerce platforms limit featured items)
- ✅ Better homepage performance (fewer products to load)

**Cons:**
- ❌ Requires additional API endpoint
- ❌ Need to handle edge cases (bulk updates)

---

#### Solution 2: Priority-Based Featured System (Advanced)

**Concept:** Instead of binary featured/not-featured, use priority ranking (1-12).

##### Database Changes
```prisma
model Product {
  isFeatured        Boolean @default(false)
  featuredPriority  Int?    // 1 = highest priority, 12 = lowest
  featuredAt        DateTime? // When product was featured
}
```

##### UI: Drag-and-Drop Featured Products Manager
```tsx
// Create a dedicated page: /[storeId]/featured-products

import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function FeaturedProductsManager() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setFeaturedProducts((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  const saveOrder = async () => {
    // Update priority for each product
    await Promise.all(
      featuredProducts.map((product, index) =>
        axios.patch(`/api/${storeId}/products/${product.id}`, {
          featuredPriority: index + 1,
        })
      )
    );
  };
  
  return (
    <div>
      <Heading title="Featured Products" description="Drag to reorder (max 12)" />
      
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={featuredProducts} strategy={verticalListSortingStrategy}>
          {featuredProducts.map((product, index) => (
            <SortableProductCard key={product.id} product={product} index={index} />
          ))}
        </SortableContext>
      </DndContext>
      
      <Button onClick={saveOrder}>Save Order</Button>
    </div>
  );
}
```

**Pros:**
- ✅ Precise control over homepage display order
- ✅ Better UX (visual reordering)
- ✅ Clear limit (12 slots visible at once)

**Cons:**
- ❌ More complex implementation
- ❌ Requires database migration
- ❌ Need drag-and-drop library

---

#### Solution 3: Category-Based Featured Limits

**Concept:** Limit featured products PER CATEGORY instead of globally.

```typescript
const MAX_FEATURED_PER_CATEGORY = 3;

// Check limit per category
const featuredInCategory = await prismadb.product.count({
  where: {
    storeId,
    categoryId: body.categoryId,
    isFeatured: true,
    isArchived: false,
    id: { not: productId },
  },
});

if (featuredInCategory >= MAX_FEATURED_PER_CATEGORY) {
  return new NextResponse(
    `You can only feature ${MAX_FEATURED_PER_CATEGORY} products per category`,
    { status: 400 }
  );
}
```

---

## 4. Storefront Implementation Best Practices

### Featured Products Section (Homepage)
```tsx
// Horizontal swipe carousel
<section className="py-12">
  <h2 className="text-2xl font-bold mb-6">Featured Products</h2>
  
  <Carousel>
    <CarouselContent>
      {featuredProducts.map((product) => (
        <CarouselItem key={product.id} className="md:basis-1/2 lg:basis-1/4">
          <ProductCard product={product} />
        </CarouselItem>
      ))}
    </CarouselContent>
    <CarouselPrevious />
    <CarouselNext />
  </Carousel>
  
  <Link href="/products?featured=true">
    <Button variant="outline" className="mt-4">
      View All Featured →
    </Button>
  </Link>
</section>
```

### New Arrivals Section (Homepage)
```tsx
<section className="py-12">
  <h2 className="text-2xl font-bold mb-6">New Arrivals</h2>
  
  <Carousel>
    <CarouselContent>
      {newArrivals.map((product) => (
        <CarouselItem key={product.id} className="md:basis-1/2 lg:basis-1/4">
          <ProductCard product={product} badge="NEW" />
        </CarouselItem>
      ))}
    </CarouselContent>
  </Carousel>
  
  <Link href="/products?filter=new-arrivals">
    <Button variant="outline" className="mt-4">
      View All New Arrivals →
    </Button>
  </Link>
</section>
```

### "View All" Grid Pages

**Featured Products Page**
```tsx
// pages/products?featured=true
export default function FeaturedProductsPage() {
  const products = await fetch(`/api/${storeId}/products?featured=true`);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

**New Arrivals Page**
```tsx
// pages/products?filter=new-arrivals
export default function NewArrivalsPage() {
  const products = await fetch(`/api/${storeId}/products?filter=new-arrivals`);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} badge="NEW" />
      ))}
    </div>
  );
}
```

---

## 5. Recommended Implementation Plan

### Phase 1: Featured Products Limit (High Priority)
1. Add `/api/[storeId]/products/featured-count` endpoint
2. Update PATCH endpoint with featured limit validation
3. Update product form with featured count display
4. Add user-friendly error messages

**Estimated Time:** 2-3 hours

### Phase 2: New Arrivals (Time-Based)
1. Add `filter=new-arrivals` query param support to GET endpoint
2. Optional: Add `newProductDays` setting to Store model
3. Update API docs with new filter
4. Test with different date ranges

**Estimated Time:** 1-2 hours

### Phase 3: Storefront Integration
1. Create Featured Products carousel section
2. Create New Arrivals carousel section
3. Add "View All" pages
4. Implement lazy loading for grid views

**Estimated Time:** 3-4 hours

---

## 6. Configuration Recommendations

### Store Settings (Optional Enhancement)
```prisma
model Store {
  // Featured products config
  maxFeaturedProducts Int @default(12)
  
  // New arrivals config
  newProductDays Int @default(30)
  
  // Display config
  featuredDisplayMode String @default("carousel") // "carousel" | "grid"
}
```

Add UI in Store Settings:
```tsx
<FormField
  control={form.control}
  name="maxFeaturedProducts"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Max Featured Products</FormLabel>
      <FormControl>
        <Input type="number" min={6} max={24} {...field} />
      </FormControl>
      <FormDescription>
        Maximum number of products that can be featured (6-24)
      </FormDescription>
    </FormItem>
  )}
/>

<FormField
  control={form.control}
  name="newProductDays"
  render={({ field }) => (
    <FormItem>
      <FormLabel>New Arrivals Duration (Days)</FormLabel>
      <FormControl>
        <Input type="number" min={7} max={90} {...field} />
      </FormControl>
      <FormDescription>
        Products are marked as "New" for this many days after creation (7-90)
      </FormDescription>
    </FormItem>
  )}
/>
```

---

## 7. API Documentation Updates

Add to `/api-docs`:

### GET `/products?filter=new-arrivals`
```json
{
  "description": "Get new arrival products (created within last N days)",
  "queryParams": {
    "filter": "new-arrivals"
  },
  "response": [
    {
      "id": "product_id",
      "name": "New Product",
      "createdAt": "2024-12-20T00:00:00.000Z",
      "..."
    }
  ]
}
```

### GET `/products/featured-count`
```json
{
  "description": "Get count of currently featured products",
  "response": {
    "count": 8,
    "maxAllowed": 12,
    "available": 4
  }
}
```

---

## 8. Final Recommendation Summary

### For Featured Products:
**Use Solution 1 (Hard Limit with UI Warning)**
- Most practical and industry-standard
- Clear user feedback
- Easy to implement
- Recommended limit: 12 products

### For New Arrivals:
**Use Approach 1 (Time-Based)**
- Fully automated
- No manual maintenance
- Uses existing `createdAt` field
- Configurable duration (30 days default)

### Why These Choices?
1. **Simplicity** - No complex database migrations
2. **Scalability** - Works for stores with 10 or 10,000 products
3. **User Experience** - Clear, intuitive controls
4. **Industry Standard** - Follows patterns used by Shopify, WooCommerce, etc.
5. **Maintenance** - Minimal ongoing work required

---

## 9. Testing Checklist

- [ ] Create 15 products, try to feature all → should fail after 12th
- [ ] Unfeature a product → should allow featuring another
- [ ] Create product today → should appear in "New Arrivals"
- [ ] Create product 31 days ago → should NOT appear in "New Arrivals"
- [ ] Archive a featured product → featured count should decrease
- [ ] Test carousel navigation on mobile
- [ ] Test "View All" grid page load time with 100+ products
- [ ] Verify Redis cache invalidation on featured toggle
- [ ] Test API rate limits with multiple featured toggles

---

## Conclusion

The recommended approach balances **automation** (time-based new arrivals) with **curation** (limited featured products). This ensures:
- Homepage stays fast and focused
- Users can't accidentally make every product "featured"
- New products get automatic visibility
- Store owners maintain control over featured placement

**Next Steps:**
1. Implement featured products limit first (biggest UX issue)
2. Add new arrivals filter second
3. Update API documentation
4. Build storefront carousel components
