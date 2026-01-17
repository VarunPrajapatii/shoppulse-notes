# Product Management System - Part 2: Enhancement Implementation Plan

## Overview

This document details the implementation plan for six major product enhancements. Each enhancement includes schema changes, UI components, API modifications, and storefront usage.

---

## Enhancement 1: Selling Price / Discounted Price

### Current State
- Single `price` field (Decimal) → Represents MRP/Actual price

### Proposed Changes

#### 1.1 Schema Changes

```prisma
model Product {
  // Existing
  price             Decimal     // Now: MRP / Original Price
  
  // NEW
  sellingPrice      Decimal?    // Discounted/Selling price (null = no discount)
  
  // Computed in code (not stored):
  // discountPercentage = ((price - sellingPrice) / price) * 100
}
```

**Why nullable?**
- Not all products have discounts
- `null` = selling price equals MRP (no discount shown)
- Reduces storage and clearly indicates "no discount"

#### 1.2 Dashboard UI Changes

**File: `product-basic-details.tsx`**

```tsx
<div className="grid grid-cols-3 gap-8">
  {/* Existing Price Field - Rename label */}
  <FormField
    name="price"
    render={({ field }) => (
      <FormItem>
        <FormLabel>MRP / Original Price (₹)</FormLabel>
        <FormControl>
          <Input type="number" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
  
  {/* NEW: Selling Price Field */}
  <FormField
    name="sellingPrice"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Selling Price (₹) <span className="text-muted-foreground">(optional)</span></FormLabel>
        <FormControl>
          <Input 
            type="number" 
            placeholder="Leave empty if no discount"
            {...field} 
            value={field.value ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              field.onChange(value === '' ? null : parseFloat(value));
            }}
          />
        </FormControl>
        <FormDescription>
          {/* Show discount calculation live */}
          {field.value && watch('price') > field.value && (
            <span className="text-green-600">
              {Math.round(((watch('price') - field.value) / watch('price')) * 100)}% off
            </span>
          )}
        </FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
```

#### 1.3 Validation Rules

```typescript
// In formSchema (product-form.tsx)
const formSchema = z.object({
  price: z.number().min(1, 'MRP is required'),
  sellingPrice: z.number().min(0).nullable().optional()
    .refine((val, ctx) => {
      // Selling price must be less than MRP
      if (val !== null && val !== undefined) {
        const mrp = ctx.parent.price;
        return val < mrp;
      }
      return true;
    }, 'Selling price must be less than MRP'),
});
```

#### 1.4 API Changes

**POST/PATCH Validation:**
```typescript
// In route.ts
if (sellingPrice !== null && sellingPrice !== undefined) {
  if (sellingPrice >= price) {
    return new NextResponse('Selling price must be less than MRP', { status: 400 });
  }
  if (sellingPrice < 0) {
    return new NextResponse('Selling price cannot be negative', { status: 400 });
  }
}
```

#### 1.5 Storefront Usage

```tsx
// Product Card
<div className="flex items-center gap-2">
  {product.sellingPrice ? (
    <>
      <span className="text-lg font-bold">₹{product.sellingPrice}</span>
      <span className="text-sm text-muted-foreground line-through">₹{product.price}</span>
      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
        {Math.round(((product.price - product.sellingPrice) / product.price) * 100)}% OFF
      </span>
    </>
  ) : (
    <span className="text-lg font-bold">₹{product.price}</span>
  )}
</div>
```

---

## Enhancement 2: SKU / Model Number

### Current State
- No SKU field exists

### Proposed Changes

#### 2.1 Schema Changes

```prisma
model Product {
  // NEW
  sku               String?     // SKU / Model Number
  
  // Index for fast lookup
  @@index([storeId, sku])  // Unique per store
}
```

#### 2.2 Dashboard UI

**New Component: `product-sku-field.tsx`**

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Wand2 } from 'lucide-react';
import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';

interface ProductSKUFieldProps {
  control: Control<ProductFormValues>;
  loading: boolean;
  watch: UseFormWatch<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  categories: { id: string; name: string }[];
  productId?: string; // For edit mode
}

export const ProductSKUField: React.FC<ProductSKUFieldProps> = ({
  control,
  loading,
  watch,
  setValue,
  categories,
  productId,
}) => {
  const categoryId = watch('categoryId');
  
  const generateSKU = () => {
    if (!categoryId) return;
    
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    // Generate: CATEGORY-XXX-TIMESTAMP
    // Examples: ELEC-001-A3F, CLOTH-042-B7D
    const categoryPrefix = category.name
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .substring(0, 5);
    
    const randomNum = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    
    const sku = `${categoryPrefix}-${randomNum}-${randomSuffix}`;
    setValue('sku', sku);
  };
  
  return (
    <FormField
      control={control}
      name="sku"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            SKU / Model Number <span className="text-muted-foreground">(optional)</span>
          </FormLabel>
          <div className="flex gap-2">
            <FormControl>
              <Input
                disabled={loading}
                placeholder="e.g., ELEC-001-BLK"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => {
                  // Allow only alphanumeric + dashes, uppercase
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                  field.onChange(value || null);
                }}
              />
            </FormControl>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={loading || !categoryId}
              onClick={generateSKU}
              title="Auto-generate SKU"
            >
              <Wand2 className="h-4 w-4" />
            </Button>
          </div>
          <FormDescription>
            Alphanumeric + dashes only. Used for inventory tracking and customer support.
            {!categoryId && <span className="text-amber-600 block">Select a category to auto-generate</span>}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
```

#### 2.3 Validation

```typescript
// formSchema
sku: z.string()
  .regex(/^[A-Z0-9-]+$/, 'Only alphanumeric characters and dashes allowed')
  .max(50, 'SKU must be 50 characters or less')
  .nullable()
  .optional(),
```

#### 2.4 API Validation - Unique per Store

```typescript
// In POST route
if (sku) {
  const existingSku = await prismadb.product.findFirst({
    where: { storeId, sku },
  });
  if (existingSku) {
    return new NextResponse('SKU already exists in this store', { status: 400 });
  }
}

// In PATCH route
if (sku) {
  const existingSku = await prismadb.product.findFirst({
    where: { 
      storeId, 
      sku,
      NOT: { id: productId } // Exclude current product
    },
  });
  if (existingSku) {
    return new NextResponse('SKU already exists in this store', { status: 400 });
  }
}
```

#### 2.5 Use Cases

| Use Case | Example |
|----------|---------|
| Electronics Store | `ELEC-001-BLK` (Electronics, #001, Black) |
| Clothing Store | `SHIRT-042-LG` (Shirts, #042, Large) |
| Food Business | `PICKLE-007-500G` (Pickles, #007, 500g) |
| Art Store | `SKETCH-A4-PORTRAIT` (Sketches, A4, Portrait) |

---

## Enhancement 3: Short Description / Tagline

### Current State
- Only full `description` (max 1200 chars)
- Product cards truncate this

### Proposed Changes

#### 3.1 Schema Changes

```prisma
model Product {
  // Existing
  description       String   @default("")  // Full description (1200 chars)
  
  // NEW
  shortDescription  String?  // Tagline (max 160 chars)
}
```

**Why 160 characters?**
- SEO meta description optimal length
- Social media preview limit
- Product card display without truncation
- Google Shopping recommended length

#### 3.2 Dashboard UI

Add to `product-description.tsx`:

```tsx
{/* Short Description / Tagline */}
<FormField
  control={control}
  name="shortDescription"
  render={({ field }) => (
    <FormItem>
      <FormLabel>
        Short Description / Tagline 
        <span className="text-muted-foreground ml-1">(optional, recommended)</span>
      </FormLabel>
      <FormControl>
        <Input
          disabled={loading}
          placeholder="A catchy one-liner for product cards (max 160 chars)"
          maxLength={160}
          {...field}
          value={field.value ?? ''}
        />
      </FormControl>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Used on product cards, SEO meta, and social previews</span>
        <span className={field.value?.length > 140 ? 'text-amber-600' : ''}>
          {field.value?.length || 0}/160
        </span>
      </div>
      <FormMessage />
    </FormItem>
  )}
/>

{/* THEN: Existing full description */}
<FormField name="description" ... />
```

#### 3.3 Storefront Usage

```tsx
// Product Card
<div className="p-4">
  <h3 className="font-medium">{product.name}</h3>
  <p className="text-sm text-muted-foreground line-clamp-2">
    {product.shortDescription || product.description.substring(0, 160)}
  </p>
</div>

// SEO Meta (in page.tsx)
export const metadata = {
  description: product.shortDescription || product.description.substring(0, 160),
};

// Social Share Preview
<meta property="og:description" content={product.shortDescription || ''} />
```

---

## Enhancement 4: Product Specifications (Key-Value Pairs)

### Current State
- No structured specifications
- Users put specs in description/bulletPoints

### Proposed Changes

#### 4.1 Schema Changes

```prisma
model Product {
  // NEW
  specifications    Json?     // Array<{ key: string, value: string }>
                              // Example: [{"key":"Material","value":"Cotton"},{"key":"Weight","value":"250g"}]
}
```

**Why JSON instead of separate table?**
- Simpler queries (no joins)
- Faster reads for product pages
- Flexible schema per product type
- Easy to add/remove specs
- Works well with PostgreSQL JSONB

#### 4.2 TypeScript Types

```typescript
// types/product.ts
interface Specification {
  key: string;
  value: string;
}

type Specifications = Specification[] | null;
```

#### 4.3 Dashboard UI Component

**New: `product-specifications.tsx`**

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Plus, Trash } from 'lucide-react';
import { Control, useFieldArray } from 'react-hook-form';

interface ProductSpecificationsProps {
  control: Control<ProductFormValues>;
  loading: boolean;
}

export const ProductSpecifications: React.FC<ProductSpecificationsProps> = ({
  control,
  loading,
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'specifications',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FormLabel>Product Specifications (Key-Value Pairs)</FormLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || fields.length >= 20}
          onClick={() => append({ key: '', value: '' })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Specification
        </Button>
      </div>
      
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No specifications added. Click "Add Specification" to add product details 
          like Material, Weight, Dimensions, etc.
        </p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-start">
              <FormField
                control={control}
                name={`specifications.${index}.key`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    {index === 0 && <FormLabel className="text-xs">Key</FormLabel>}
                    <Input
                      disabled={loading}
                      placeholder="e.g., Material"
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`specifications.${index}.value`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    {index === 0 && <FormLabel className="text-xs">Value</FormLabel>}
                    <Input
                      disabled={loading}
                      placeholder="e.g., 100% Cotton"
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={loading}
                onClick={() => remove(index)}
                className={index === 0 ? 'mt-6' : ''}
              >
                <Trash className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Maximum 20 specifications. Leave empty if not applicable.
      </p>
    </div>
  );
};
```

#### 4.4 Form Schema

```typescript
const formSchema = z.object({
  // ...existing
  specifications: z.array(
    z.object({
      key: z.string().min(1, 'Key is required').max(50),
      value: z.string().min(1, 'Value is required').max(200),
    })
  ).max(20, 'Maximum 20 specifications').optional().nullable(),
});
```

#### 4.5 Storefront Display

```tsx
// Product Detail Page - Specifications Section
{product.specifications && product.specifications.length > 0 && (
  <div className="mt-8">
    <h3 className="text-lg font-medium mb-4">Specifications</h3>
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <tbody>
          {product.specifications.map((spec, index) => (
            <tr 
              key={index}
              className={index % 2 === 0 ? 'bg-muted/50' : 'bg-background'}
            >
              <td className="px-4 py-3 font-medium text-muted-foreground w-1/3">
                {spec.key}
              </td>
              <td className="px-4 py-3">{spec.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
```

#### 4.6 Example Specifications by Industry

| Business Type | Example Specs |
|--------------|---------------|
| **Electronics** | Brand, Model, Power, Connectivity, Warranty |
| **Clothing** | Material, Fit, Care Instructions, Made In |
| **Food Items** | Ingredients, Net Weight, Shelf Life, Storage |
| **Furniture** | Dimensions, Material, Assembly Required, Max Weight |
| **Art & Craft** | Medium, Size, Frame Included, Artist Name |

---

## Enhancement 5: Warranty Information

### Current State
- No warranty field

### Proposed Changes

#### 5.1 Schema Changes

```prisma
model Product {
  // NEW
  warranty          String?   // e.g., "1 Year Manufacturer Warranty"
}
```

#### 5.2 Dashboard UI

```tsx
// In product-basic-details.tsx or new component
<FormField
  control={control}
  name="warranty"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Warranty Information <span className="text-muted-foreground">(optional)</span></FormLabel>
      <Select
        disabled={loading}
        onValueChange={(value) => field.onChange(value === 'custom' ? '' : value)}
        value={COMMON_WARRANTIES.includes(field.value) ? field.value : 'custom'}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select or enter custom warranty" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="No Warranty">No Warranty</SelectItem>
          <SelectItem value="1 Month Warranty">1 Month Warranty</SelectItem>
          <SelectItem value="3 Months Warranty">3 Months Warranty</SelectItem>
          <SelectItem value="6 Months Warranty">6 Months Warranty</SelectItem>
          <SelectItem value="1 Year Warranty">1 Year Warranty</SelectItem>
          <SelectItem value="2 Year Warranty">2 Year Warranty</SelectItem>
          <SelectItem value="Lifetime Warranty">Lifetime Warranty</SelectItem>
          <SelectItem value="custom">Custom...</SelectItem>
        </SelectContent>
      </Select>
      
      {/* Show custom input if not a preset */}
      {!COMMON_WARRANTIES.includes(field.value) && field.value !== null && (
        <Input
          className="mt-2"
          disabled={loading}
          placeholder="Enter custom warranty info"
          {...field}
          value={field.value ?? ''}
        />
      )}
      
      <FormDescription>
        Builds customer trust. Essential for electronics and appliances.
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### 5.3 Constants

```typescript
// lib/constants.ts
export const COMMON_WARRANTIES = [
  'No Warranty',
  '1 Month Warranty',
  '3 Months Warranty',
  '6 Months Warranty',
  '1 Year Warranty',
  '2 Year Warranty',
  'Lifetime Warranty',
];
```

#### 5.4 Storefront Display

```tsx
// Product Detail - Near price or in info section
{product.warranty && product.warranty !== 'No Warranty' && (
  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">
    <Shield className="h-4 w-4" />
    <span>🛡️ {product.warranty}</span>
  </div>
)}
```

---

## Enhancement 6: Product Video URL

### The Challenge

Currently, only Cloudinary is configured for image uploads. Video handling requires:
1. **Storage**: Videos are 10-100x larger than images
2. **Processing**: Transcoding, thumbnails, adaptive streaming
3. **Delivery**: CDN with video optimization
4. **Cost**: Video bandwidth is expensive

### Solution Options

#### Option A: Cloudinary Video (Recommended for Consistency)

**Cloudinary DOES support video!** Same account, same widget.

```typescript
// Update Cloudinary config
cloudinary.config({
  // ...existing
  resource_type: 'video', // For video operations
});
```

**Dashboard UI:**

```tsx
// New component: video-upload.tsx
'use client';

import { CldUploadWidget } from 'next-cloudinary';
import { Button } from '@/components/ui/button';
import { Video, X } from 'lucide-react';

interface VideoUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({
  value,
  onChange,
  disabled,
}) => {
  return (
    <div className="space-y-4">
      {value && (
        <div className="relative aspect-video max-w-md rounded-lg overflow-hidden border">
          <video 
            src={value} 
            controls 
            className="w-full h-full object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {!value && (
        <CldUploadWidget
          uploadPreset="preset1" // May need video-specific preset
          options={{
            resourceType: 'video',
            maxFileSize: 50000000, // 50MB
            maxDuration: 60, // 60 seconds max
            sources: ['local', 'camera'],
            clientAllowedFormats: ['mp4', 'webm', 'mov'],
          }}
          onSuccess={(result: any) => {
            if (result.info?.secure_url) {
              onChange(result.info.secure_url);
            }
          }}
        >
          {({ open }) => (
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => open()}
            >
              <Video className="h-4 w-4 mr-2" />
              Upload Product Video
            </Button>
          )}
        </CldUploadWidget>
      )}
      
      <p className="text-xs text-muted-foreground">
        Max 50MB, 60 seconds. MP4/WebM/MOV supported.
      </p>
    </div>
  );
};
```

**Cloudinary Preset Configuration:**
1. Go to Cloudinary Console → Settings → Upload Presets
2. Create "video_preset" with:
   - Folder: `products/videos`
   - Resource type: Video
   - Max file size: 50MB
   - Eager transformation: `q_auto,f_auto` (auto quality, format)
   - Duration limit: 60 seconds

#### Option B: YouTube/Vimeo Embed URL

Lower cost, simpler implementation, but less professional.

```typescript
// Schema
videoUrl: String?  // YouTube/Vimeo URL

// UI: Simple text input with URL validation
<Input
  placeholder="Paste YouTube or Vimeo URL"
  {...field}
/>

// Storefront: Embed iframe
<iframe 
  src={getEmbedUrl(product.videoUrl)} 
  allowFullScreen 
/>
```

**Validation:**
```typescript
// Validate YouTube/Vimeo URL
const videoUrlSchema = z.string().url().refine((url) => {
  return url.includes('youtube.com') || 
         url.includes('youtu.be') || 
         url.includes('vimeo.com');
}, 'Must be a YouTube or Vimeo URL').nullable().optional();
```

### Recommended Approach

**Use Cloudinary Video** because:
1. Already integrated
2. Single CDN for all media
3. Automatic optimization
4. Thumbnail generation
5. No third-party dependencies

**Schema:**

```prisma
model Product {
  // NEW
  videoUrl          String?   // Cloudinary video URL
}
```

**Limits/Validation:**

| Constraint | Value | Reason |
|------------|-------|--------|
| Max file size | 50MB | Cloudinary free tier limit |
| Max duration | 60 seconds | Short product demos |
| Formats | MP4, WebM, MOV | Universal playback |
| Quantity | 1 video per product | Simplicity, cost |

---

## Next: Part 3 - Complete Implementation Code & Migration
