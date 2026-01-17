# Product Management System - Part 4: Storefront Integration & Universal Design

## Overview

This document covers how the enhanced product fields integrate with the storefront, ensuring the design works universally across ALL business types.

---

## 1. Universal Design Philosophy

### Core Principle
**Every enhancement must be OPTIONAL and gracefully hidden when not used.**

| Business Type | Fields They'll Use | Fields They'll Skip |
|--------------|-------------------|---------------------|
| **Electronics** | SKU ✓, Warranty ✓, Specs ✓, Video ✓ | - |
| **Clothing** | Specs (Material, Care) ✓ | SKU, Warranty, Video |
| **Food/Pickles** | Specs (Ingredients, Weight) ✓, Short Desc ✓ | SKU, Warranty, Video |
| **Art/Sketches** | Short Desc ✓, Specs (Medium, Size) ✓ | SKU, Warranty, Video |
| **Furniture** | SKU ✓, Warranty ✓, Specs ✓, Video ✓ | - |
| **Handmade/DIY** | Short Desc ✓, Specs ✓ | SKU, Warranty |

### Implementation Rule
```tsx
// NEVER show empty sections
{product.warranty && product.warranty !== 'No Warranty' && (
  <WarrantyBadge warranty={product.warranty} />
)}

// ALWAYS use fallbacks
{product.shortDescription || product.description.substring(0, 160)}
```

---

## 2. Storefront API Response

### 2.1 Updated API Response Shape

```typescript
// GET /api/[storeId]/products/[productId]
interface ProductResponse {
  id: string;
  name: string;
  
  // Pricing
  price: number;                    // MRP (always present)
  sellingPrice: number | null;      // Discounted price (optional)
  
  // Identity
  sku: string | null;               // Product code (optional)
  shortDescription: string | null;  // Tagline (optional)
  
  // Content
  description: string;              // Full description
  titlepoints: string[];            // Key features
  bulletPoints: string[];           // Detailed points
  
  // Details
  specifications: Array<{           // Technical specs (optional)
    key: string;
    value: string;
  }> | null;
  warranty: string | null;          // Warranty info (optional)
  videoUrl: string | null;          // Product video (optional)
  
  // Relations
  images: Array<{ id: string; url: string }>;
  category: { id: string; name: string };
  size: { id: string; name: string; value: string };
  relatedItems: ProductResponse[];
  
  // Status
  isFeatured: boolean;
  isArchived: boolean;
  stockQuantity: number;
  createdAt: string;
}
```

### 2.2 API Route Update

**File: `src/app/api/[storeId]/products/[productId]/route.ts`**

```typescript
export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    const product = await prismadb.product.findUnique({
      where: { id: productId },
      include: {
        images: true,
        category: true,
        size: true,
        relatedFromProducts: {
          include: {
            relatedProduct: {
              select: {
                id: true,
                name: true,
                price: true,
                sellingPrice: true,  // NEW
                shortDescription: true, // NEW
                images: { take: 1, select: { url: true } },
              },
            },
          },
          take: 5,
        },
      },
    });

    if (!product) {
      return new NextResponse('Product not found', { status: 404 });
    }

    // Transform response with all new fields
    const response = {
      ...product,
      price: parseFloat(product.price.toString()),
      sellingPrice: product.sellingPrice 
        ? parseFloat(product.sellingPrice.toString()) 
        : null,
      specifications: product.specifications as Array<{key: string; value: string}> | null,
      relatedItems: product.relatedFromProducts.map((rel) => ({
        ...rel.relatedProduct,
        price: parseFloat(rel.relatedProduct.price.toString()),
        sellingPrice: rel.relatedProduct.sellingPrice 
          ? parseFloat(rel.relatedProduct.sellingPrice.toString()) 
          : null,
      })),
      relatedFromProducts: undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.log('[PRODUCT_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
```

---

## 3. Storefront Component Examples

### 3.1 Product Card (List/Grid View)

```tsx
// components/product-card.tsx
interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    sellingPrice: number | null;
    shortDescription: string | null;
    description: string;
    images: { url: string }[];
  };
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  // Calculate discount percentage
  const discountPercentage = product.sellingPrice
    ? Math.round(((product.price - product.sellingPrice) / product.price) * 100)
    : null;

  return (
    <div className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Discount Badge */}
      {discountPercentage && discountPercentage > 0 && (
        <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
          {discountPercentage}% OFF
        </div>
      )}

      {/* Image */}
      <div className="aspect-square relative overflow-hidden">
        <Image
          src={product.images[0]?.url || '/placeholder.png'}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform"
        />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
        
        {/* Short Description (NOT truncated full description!) */}
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {product.shortDescription || product.description.substring(0, 100)}
        </p>

        {/* Price Display */}
        <div className="flex items-center gap-2 mt-3">
          {product.sellingPrice ? (
            <>
              <span className="text-lg font-bold">
                ₹{product.sellingPrice.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                ₹{product.price.toLocaleString()}
              </span>
            </>
          ) : (
            <span className="text-lg font-bold">
              ₹{product.price.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
```

### 3.2 Product Detail Page

```tsx
// app/product/[productId]/page.tsx
export default function ProductPage({ product }: { product: ProductResponse }) {
  return (
    <div className="container mx-auto py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Images & Video */}
        <div className="space-y-4">
          {/* Image Gallery */}
          <ProductImageGallery images={product.images} />
          
          {/* Product Video (if exists) */}
          {product.videoUrl && (
            <div className="aspect-video rounded-lg overflow-hidden border">
              <video
                src={product.videoUrl}
                controls
                className="w-full h-full object-contain bg-black"
                poster={product.images[0]?.url}
              >
                Your browser does not support video.
              </video>
            </div>
          )}
        </div>

        {/* Right: Product Info */}
        <div className="space-y-6">
          {/* SKU (if exists) */}
          {product.sku && (
            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
          )}

          {/* Title */}
          <h1 className="text-2xl font-bold">{product.name}</h1>

          {/* Title Points */}
          {product.titlepoints.length > 0 && (
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {product.titlepoints.map((point, i) => (
                <span key={i}>
                  {point}
                  {i < product.titlepoints.length - 1 && <span className="mx-2">|</span>}
                </span>
              ))}
            </div>
          )}

          {/* Price Section */}
          <div className="space-y-2">
            {product.sellingPrice ? (
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold">
                  ₹{product.sellingPrice.toLocaleString()}
                </span>
                <span className="text-lg text-muted-foreground line-through">
                  ₹{product.price.toLocaleString()}
                </span>
                <span className="bg-green-100 text-green-700 text-sm font-medium px-2 py-1 rounded">
                  {Math.round(((product.price - product.sellingPrice) / product.price) * 100)}% OFF
                </span>
              </div>
            ) : (
              <span className="text-3xl font-bold">
                ₹{product.price.toLocaleString()}
              </span>
            )}
            <p className="text-xs text-muted-foreground">Inclusive of all taxes</p>
          </div>

          {/* Warranty Badge (if exists) */}
          {product.warranty && product.warranty !== 'No Warranty' && (
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-md text-sm">
              <ShieldCheck className="h-4 w-4" />
              🛡️ {product.warranty}
            </div>
          )}

          {/* Size & Category */}
          <div className="flex gap-4 text-sm">
            <span>Category: <strong>{product.category.name}</strong></span>
            <span>Size: <strong>{product.size.name}</strong></span>
          </div>

          {/* Stock Status */}
          <div className="text-sm">
            {product.stockQuantity > 10 ? (
              <span className="text-green-600">✓ In Stock</span>
            ) : product.stockQuantity > 0 ? (
              <span className="text-amber-600">
                ⚠️ Only {product.stockQuantity} left in stock
              </span>
            ) : (
              <span className="text-red-600">✗ Out of Stock</span>
            )}
          </div>

          {/* Add to Cart Button */}
          <Button 
            size="lg" 
            className="w-full"
            disabled={product.stockQuantity === 0}
          >
            {product.stockQuantity > 0 ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </div>
      </div>

      {/* Below the fold content */}
      <div className="mt-12 space-y-12">
        {/* Description */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Description</h2>
          <p className="text-muted-foreground whitespace-pre-line">
            {product.description}
          </p>
        </section>

        {/* Bullet Points */}
        {product.bulletPoints.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Key Features</h2>
            <ul className="space-y-2">
              {product.bulletPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Specifications Table (if exists) */}
        {product.specifications && product.specifications.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Specifications</h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody>
                  {product.specifications.map((spec, i) => (
                    <tr 
                      key={i}
                      className={i % 2 === 0 ? 'bg-muted/50' : 'bg-background'}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-1/3 border-r">
                        {spec.key}
                      </td>
                      <td className="px-4 py-3 text-sm">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Related Products */}
        {product.relatedItems.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {product.relatedItems.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
```

---

## 4. SEO Integration

### 4.1 Meta Tags

```tsx
// app/product/[productId]/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.productId);
  
  return {
    title: product.name,
    description: product.shortDescription || product.description.substring(0, 160),
    openGraph: {
      title: product.name,
      description: product.shortDescription || product.description.substring(0, 160),
      images: product.images.map(img => ({ url: img.url })),
      type: 'product',
    },
    other: {
      'product:price:amount': product.sellingPrice?.toString() || product.price.toString(),
      'product:price:currency': 'INR',
      'product:availability': product.stockQuantity > 0 ? 'in stock' : 'out of stock',
    },
  };
}
```

### 4.2 Structured Data (JSON-LD)

```tsx
// Add to product page
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.shortDescription || product.description,
  image: product.images.map(img => img.url),
  sku: product.sku || undefined,
  offers: {
    '@type': 'Offer',
    price: product.sellingPrice || product.price,
    priceCurrency: 'INR',
    availability: product.stockQuantity > 0 
      ? 'https://schema.org/InStock' 
      : 'https://schema.org/OutOfStock',
    ...(product.sellingPrice && {
      priceSpecification: {
        '@type': 'PriceSpecification',
        price: product.sellingPrice,
        priceCurrency: 'INR',
        valueAddedTaxIncluded: true,
      },
    }),
  },
  ...(product.warranty && product.warranty !== 'No Warranty' && {
    warranty: {
      '@type': 'WarrantyPromise',
      description: product.warranty,
    },
  }),
};

// In head
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
/>
```

---

## 5. Universal Business Examples

### 5.1 Electronics Store

```
Name: Sony WH-1000XM5 Wireless Headphones
Short Description: Industry-leading noise cancellation with 30-hour battery
Price: ₹34,990
Selling Price: ₹29,990 (14% OFF)
SKU: ELEC-SONY-XM5-BLK

Specifications:
- Driver Size: 30mm
- Frequency Response: 4Hz-40,000Hz
- Battery Life: 30 hours
- Connectivity: Bluetooth 5.2, 3.5mm jack
- Weight: 250g

Warranty: 1 Year Manufacturer Warranty
Video: Product demo showing noise cancellation
```

### 5.2 Pickle Business (Homemade Food)

```
Name: Homemade Mango Pickle - Authentic Rajasthani
Short Description: Traditional recipe, no preservatives, made with raw mangoes
Price: ₹299
Selling Price: null (no discount)
SKU: null (not needed)

Specifications:
- Ingredients: Raw Mango, Mustard Oil, Red Chili, Fenugreek, Salt
- Net Weight: 500g
- Shelf Life: 12 months
- Storage: Store in cool, dry place

Warranty: null (not applicable)
Video: null
```

### 5.3 Art/Sketch Store

```
Name: Custom Pet Portrait - Pencil Sketch
Short Description: Hand-drawn pencil portrait of your beloved pet, A4 size
Price: ₹2,500
Selling Price: ₹1,999 (20% OFF)
SKU: null

Specifications:
- Medium: Graphite Pencil on Paper
- Size: A4 (21 x 29.7 cm)
- Paper: 200 GSM Cartridge
- Delivery: 7-10 working days
- Framing: Optional (₹500 extra)

Warranty: null
Video: null (or time-lapse of drawing process)
```

### 5.4 Furniture Store

```
Name: Modern 3-Seater Sofa - Fabric
Short Description: Scandinavian design, solid wood frame, washable covers
Price: ₹45,000
Selling Price: ₹38,500 (15% OFF)
SKU: FURN-SOFA-3S-GRY

Specifications:
- Dimensions: 200cm × 85cm × 80cm
- Material: Teak Wood Frame, Foam, Polyester Fabric
- Color: Charcoal Grey
- Seating Capacity: 3 persons
- Max Load: 300 kg
- Assembly: Legs need to be attached

Warranty: 3 Year Warranty
Video: Assembly guide video
```

---

## 6. Migration Checklist

### 6.1 Database Migration

```bash
# 1. Update schema.prisma with new fields
# 2. Run migration
npx prisma migrate dev --name add_product_enhancements

# 3. Generate client
npx prisma generate
```

### 6.2 Code Changes Checklist

- [ ] Create `src/types/product.ts` with new types
- [ ] Update `product-form.tsx` with new schema and fields
- [ ] Create `product-sku-field.tsx`
- [ ] Create `product-specifications.tsx`
- [ ] Create `product-warranty-field.tsx`
- [ ] Create `video-upload.tsx`
- [ ] Update `product-basic-details.tsx` for pricing fields
- [ ] Update POST route validation
- [ ] Update PATCH route validation
- [ ] Update GET route response
- [ ] Update `archive-product.ts` for new fields
- [ ] Update ArchivedProduct schema

### 6.3 Testing Checklist

- [ ] Create product with all new fields
- [ ] Create product with minimal fields (all new fields null)
- [ ] Edit product - update all new fields
- [ ] Edit product - clear all new fields
- [ ] Delete product - verify archive includes new fields
- [ ] SKU uniqueness validation
- [ ] Selling price < MRP validation
- [ ] Video upload and playback
- [ ] Storefront display with all fields
- [ ] Storefront display with no optional fields
- [ ] SEO meta tags rendering

---

## Summary

### What We've Covered

1. **Part 1**: Complete architecture, data flow, existing schema
2. **Part 2**: Enhancement specifications and UI designs
3. **Part 3**: Implementation code for all components
4. **Part 4**: Storefront integration and universal examples

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `sellingPrice` nullable | Not all products have discounts |
| `sku` nullable + unique per store | Optional, but must be unique when used |
| `specifications` as JSON | Flexible schema per product type |
| `warranty` with presets + custom | Quick selection + flexibility |
| `videoUrl` via Cloudinary | Consistent with existing image upload |

### Total New Fields

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `sellingPrice` | Decimal? | No | Discounted price |
| `sku` | String? | No | Product code |
| `shortDescription` | String? | No | Tagline (160 chars) |
| `specifications` | Json? | No | Key-value pairs |
| `warranty` | String? | No | Warranty info |
| `videoUrl` | String? | No | Product video |

All fields are **optional** to maintain universal applicability across business types.
