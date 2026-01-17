# Product Management System - Part 3: Complete Implementation Code

## Overview

This document provides the complete, copy-paste ready implementation code for all six enhancements.

---

## 1. Prisma Schema Migration

### 1.1 Updated Schema

Add these fields to the `Product` model in `prisma/schema.prisma`:

```prisma
model Product {
  id                String   @id @default(uuid())
  name              String
  description       String   @default("")
  titlepoints       String[]
  bulletPoints      String[]
  
  // ===== PRICING =====
  price             Decimal     // MRP / Original Price
  sellingPrice      Decimal?    // Discounted/Selling price (NEW)
  
  // ===== PRODUCT IDENTITY =====
  sku               String?     // SKU / Model Number (NEW)
  shortDescription  String?     // Tagline for cards, max 160 chars (NEW)
  
  // ===== PRODUCT DETAILS =====
  specifications    Json?       // Array<{key: string, value: string}> (NEW)
  warranty          String?     // Warranty info (NEW)
  videoUrl          String?     // Product video URL (NEW)
  
  // ===== EXISTING FIELDS =====
  isFeatured        Boolean  @default(false)
  isArchived        Boolean  @default(false)
  stockQuantity     Int      @default(0)
  lowStockThreshold Int      @default(5)
  archivedReason    String?
  archivedAt        DateTime?

  // Relations
  storeId           String
  store             Store    @relation("StoreToProduct", fields: [storeId], references: [id])
  categoryId        String
  category          Category @relation("CategoryToProduct", fields: [categoryId], references: [id])
  sizeId            String
  size              Size     @relation(fields: [sizeId], references: [id])
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
  @@index([storeId, sku])  // NEW: For unique SKU lookup per store
}
```

### 1.2 Migration Command

```bash
npx prisma migrate dev --name add_product_enhancements
```

---

## 2. TypeScript Types

### 2.1 Product Form Types

**File: `src/types/product.ts`** (Create new file)

```typescript
/**
 * Product-related TypeScript types
 */

// Specification key-value pair
export interface Specification {
  key: string;
  value: string;
}

// Full Product form values (for react-hook-form)
export interface ProductFormValues {
  name: string;
  images: { url: string }[];
  price: number;
  sellingPrice: number | null;
  sku: string | null;
  shortDescription: string | null;
  categoryId: string;
  sizeId: string;
  titlePoints?: string[];
  bulletPoints?: string[];
  description?: string;
  specifications?: Specification[] | null;
  warranty?: string | null;
  videoUrl?: string | null;
  relatedProductIds?: string[];
  stockQuantity: number;
  lowStockThreshold?: number;
  isFeatured?: boolean;
  isArchived?: boolean;
}

// Product with numeric price (for client components)
export interface ProductWithNumberPrice {
  id: string;
  name: string;
  description: string;
  titlepoints: string[];
  bulletPoints: string[];
  price: number;
  sellingPrice: number | null;
  sku: string | null;
  shortDescription: string | null;
  specifications: Specification[] | null;
  warranty: string | null;
  videoUrl: string | null;
  isFeatured: boolean;
  isArchived: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  categoryId: string;
  sizeId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Common warranty options
export const COMMON_WARRANTIES = [
  'No Warranty',
  '1 Month Warranty',
  '3 Months Warranty',
  '6 Months Warranty',
  '1 Year Warranty',
  '2 Year Warranty',
  '3 Year Warranty',
  '5 Year Warranty',
  'Lifetime Warranty',
] as const;

export type CommonWarranty = typeof COMMON_WARRANTIES[number];
```

---

## 3. Updated Form Schema

**File: `src/app/(dashboard)/[storeId]/(routes)/products/[productId]/components/product-form.tsx`**

Replace the existing `formSchema`:

```typescript
import z from 'zod';

const formSchema = z.object({
  // Basic Info
  name: z.string().min(1, 'Product name is required'),
  images: z.object({ url: z.string() }).array().min(1, 'At least one image is required'),
  
  // Pricing
  price: z.number().min(1, 'MRP is required'),
  sellingPrice: z.number().min(0).nullable().optional(),
  
  // Product Identity
  sku: z.string()
    .regex(/^[A-Z0-9-]*$/, 'Only uppercase letters, numbers, and dashes allowed')
    .max(50, 'SKU must be 50 characters or less')
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val),
  shortDescription: z.string()
    .max(160, 'Short description must be 160 characters or less')
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val),
  
  // Categories
  categoryId: z.string().min(1, 'Category is required'),
  sizeId: z.string().min(1, 'Size is required'),
  
  // Content
  titlePoints: z.array(z.string().max(30)).max(4).optional(),
  bulletPoints: z.array(z.string().max(120)).max(6).optional(),
  description: z.string().max(1200, 'Description must be 1200 characters or less').optional(),
  
  // Specifications
  specifications: z.array(
    z.object({
      key: z.string().min(1, 'Specification key is required').max(50, 'Key must be 50 characters or less'),
      value: z.string().min(1, 'Specification value is required').max(200, 'Value must be 200 characters or less'),
    })
  ).max(20, 'Maximum 20 specifications allowed').nullable().optional(),
  
  // Warranty & Video
  warranty: z.string().max(100).nullable().optional().transform(val => val === '' ? null : val),
  videoUrl: z.string().url('Must be a valid URL').nullable().optional().transform(val => val === '' ? null : val),
  
  // Relations & Stock
  relatedProductIds: z.array(z.string()).optional(),
  stockQuantity: z.number().int().min(0, 'Stock quantity must be 0 or greater'),
  lowStockThreshold: z.number().int().min(1, 'Low stock threshold must be at least 1').optional(),
  
  // Flags
  isFeatured: z.boolean().default(false).optional(),
  isArchived: z.boolean().default(false).optional(),
}).refine((data) => {
  // Custom validation: sellingPrice must be less than price
  if (data.sellingPrice !== null && data.sellingPrice !== undefined) {
    return data.sellingPrice < data.price;
  }
  return true;
}, {
  message: 'Selling price must be less than MRP',
  path: ['sellingPrice'],
});

type ProductFormValues = z.infer<typeof formSchema>;
```

---

## 4. New UI Components

### 4.1 Product SKU Field

**File: `src/app/(dashboard)/[storeId]/(routes)/products/[productId]/components/product-sku-field.tsx`**

```tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Wand2 } from 'lucide-react';
import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Category } from '@/generated/prisma';

interface ProductSKUFieldProps {
  control: Control<ProductFormValues>;
  loading: boolean;
  watch: UseFormWatch<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  categories: Category[];
}

export const ProductSKUField: React.FC<ProductSKUFieldProps> = ({
  control,
  loading,
  watch,
  setValue,
  categories,
}) => {
  const categoryId = watch('categoryId');

  const generateSKU = () => {
    if (!categoryId) return;

    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    // Generate: CATEGORY-XXX-ABC
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
            SKU / Model Number{' '}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </FormLabel>
          <div className="flex gap-2">
            <FormControl>
              <Input
                disabled={loading}
                placeholder="e.g., ELEC-001-BLK"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => {
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
            Alphanumeric + dashes only. For inventory tracking and customer support.
            {!categoryId && (
              <span className="text-amber-600 block mt-1">
                Select a category first to auto-generate
              </span>
            )}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
```

### 4.2 Product Specifications Component

**File: `src/app/(dashboard)/[storeId]/(routes)/products/[productId]/components/product-specifications.tsx`**

```tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Plus, Trash } from 'lucide-react';
import { Control, useFieldArray } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';

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
        <div>
          <FormLabel className="text-base">Product Specifications</FormLabel>
          <p className="text-sm text-muted-foreground mt-1">
            Add technical details like Material, Dimensions, Weight, etc.
          </p>
        </div>
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
        <div className="border border-dashed rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No specifications added yet. Add details like:
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Material • Dimensions • Weight • Color • Care Instructions
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header Row */}
          <div className="grid grid-cols-[1fr_1fr_40px] gap-3 px-1">
            <span className="text-xs font-medium text-muted-foreground">Key</span>
            <span className="text-xs font-medium text-muted-foreground">Value</span>
            <span></span>
          </div>

          {/* Specification Rows */}
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-[1fr_1fr_40px] gap-3 items-start">
              <FormField
                control={control}
                name={`specifications.${index}.key`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="e.g., Material"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`specifications.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="e.g., 100% Cotton"
                        {...field}
                      />
                    </FormControl>
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
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {fields.length >= 20 && (
        <p className="text-xs text-amber-600">Maximum 20 specifications reached.</p>
      )}
    </div>
  );
};
```

### 4.3 Product Warranty Field

**File: `src/app/(dashboard)/[storeId]/(routes)/products/[productId]/components/product-warranty-field.tsx`**

```tsx
'use client';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Control } from 'react-hook-form';
import { ProductFormValues, COMMON_WARRANTIES } from '@/types/product';
import { useState, useEffect } from 'react';

interface ProductWarrantyFieldProps {
  control: Control<ProductFormValues>;
  loading: boolean;
}

export const ProductWarrantyField: React.FC<ProductWarrantyFieldProps> = ({
  control,
  loading,
}) => {
  return (
    <FormField
      control={control}
      name="warranty"
      render={({ field }) => {
        const isCustom = field.value && !COMMON_WARRANTIES.includes(field.value as any);
        const [showCustomInput, setShowCustomInput] = useState(isCustom);

        useEffect(() => {
          setShowCustomInput(field.value ? !COMMON_WARRANTIES.includes(field.value as any) : false);
        }, [field.value]);

        return (
          <FormItem>
            <FormLabel>
              Warranty Information{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </FormLabel>
            <Select
              disabled={loading}
              value={showCustomInput ? 'custom' : (field.value ?? '')}
              onValueChange={(value) => {
                if (value === 'custom') {
                  setShowCustomInput(true);
                  field.onChange('');
                } else if (value === 'none') {
                  setShowCustomInput(false);
                  field.onChange(null);
                } else {
                  setShowCustomInput(false);
                  field.onChange(value);
                }
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select warranty or enter custom" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No warranty info</span>
                </SelectItem>
                {COMMON_WARRANTIES.map((warranty) => (
                  <SelectItem key={warranty} value={warranty}>
                    {warranty}
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  <span className="text-blue-600">Custom warranty...</span>
                </SelectItem>
              </SelectContent>
            </Select>

            {showCustomInput && (
              <Input
                className="mt-2"
                disabled={loading}
                placeholder="Enter custom warranty info"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value || null)}
              />
            )}

            <FormDescription>
              Builds customer trust. Essential for electronics and appliances.
            </FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
```

### 4.4 Video Upload Component

**File: `src/components/ui/video-upload.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CldUploadWidget } from 'next-cloudinary';
import { Video, X, Play } from 'lucide-react';

interface VideoUploadProps {
  disabled?: boolean;
  onChange: (value: string | null) => void;
  value: string | null;
}

const VideoUpload: React.FC<VideoUploadProps> = ({
  disabled,
  onChange,
  value,
}) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onUpload = (result: any) => {
    if (result.info && result.info.secure_url) {
      onChange(result.info.secure_url);
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="space-y-4">
      {value && (
        <div className="relative aspect-video max-w-md rounded-lg overflow-hidden border bg-black">
          <video
            src={value}
            controls
            className="w-full h-full object-contain"
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 z-10"
            onClick={() => onChange(null)}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!value && (
        <CldUploadWidget
          onSuccess={onUpload}
          uploadPreset="preset1"
          options={{
            resourceType: 'video',
            maxFileSize: 52428800, // 50MB
            clientAllowedFormats: ['mp4', 'webm', 'mov'],
            sources: ['local', 'camera'],
          }}
        >
          {({ open }) => {
            const onClick = () => {
              open();
            };

            return (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-muted">
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onClick}
                      disabled={disabled}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Upload Product Video
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    MP4, WebM, or MOV • Max 50MB
                  </p>
                </div>
              </div>
            );
          }}
        </CldUploadWidget>
      )}
    </div>
  );
};

export default VideoUpload;
```

---

## 5. Updated Product Form

### 5.1 Complete Product Form

**File: `src/app/(dashboard)/[storeId]/(routes)/products/[productId]/components/product-form.tsx`**

```tsx
'use client';

import { AlertModal } from '@/components/modals/alert-modal';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { Category, Image, Product, Size } from '@/generated/prisma';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { Trash } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import z from 'zod';

// Import all sub-components
import { ProductBasicDetails } from './product-basic-details';
import { ProductTitlePoints } from './product-title-points';
import { ProductDescription } from './product-description';
import { ProductRelatedItems } from './product-related-items';
import { ProductSKUField } from './product-sku-field';
import { ProductSpecifications } from './product-specifications';
import { ProductWarrantyField } from './product-warranty-field';
import { ProductVideoField } from './product-video-field';

// Form schema with all enhancements
const formSchema = z.object({
  name: z.string().min(1),
  images: z.object({ url: z.string() }).array().min(1),
  price: z.number().min(1),
  sellingPrice: z.number().min(0).nullable().optional(),
  sku: z.string()
    .regex(/^[A-Z0-9-]*$/, 'Only uppercase letters, numbers, and dashes')
    .max(50)
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val),
  shortDescription: z.string()
    .max(160)
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val),
  categoryId: z.string().min(1),
  sizeId: z.string().min(1),
  titlePoints: z.array(z.string().max(30)).max(4).optional(),
  bulletPoints: z.array(z.string().max(120)).max(6).optional(),
  description: z.string().max(1200).optional(),
  specifications: z.array(
    z.object({
      key: z.string().min(1).max(50),
      value: z.string().min(1).max(200),
    })
  ).max(20).nullable().optional(),
  warranty: z.string().max(100).nullable().optional().transform(val => val === '' ? null : val),
  videoUrl: z.string().url().nullable().optional().transform(val => val === '' ? null : val),
  relatedProductIds: z.array(z.string()).optional(),
  stockQuantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(1).optional(),
  isFeatured: z.boolean().default(false).optional(),
  isArchived: z.boolean().default(false).optional(),
}).refine((data) => {
  if (data.sellingPrice !== null && data.sellingPrice !== undefined) {
    return data.sellingPrice < data.price;
  }
  return true;
}, {
  message: 'Selling price must be less than MRP',
  path: ['sellingPrice'],
});

type ProductFormValues = z.infer<typeof formSchema>;

// ... rest of component with updated defaultValues including new fields
```

---

## 6. API Route Updates

### 6.1 POST Route Updates

Add to `src/app/api/[storeId]/products/route.ts`:

```typescript
// Extract new fields from body
const {
  // ... existing fields
  sellingPrice,
  sku,
  shortDescription,
  specifications,
  warranty,
  videoUrl,
} = body;

// Validation: sellingPrice < price
if (sellingPrice !== null && sellingPrice !== undefined) {
  if (sellingPrice >= price) {
    return new NextResponse('Selling price must be less than MRP', { status: 400 });
  }
}

// Validation: Unique SKU per store
if (sku) {
  const existingSku = await prismadb.product.findFirst({
    where: { storeId, sku },
  });
  if (existingSku) {
    return new NextResponse('SKU already exists in this store', { status: 400 });
  }
}

// Validation: shortDescription length
if (shortDescription && shortDescription.length > 160) {
  return new NextResponse('Short description must be 160 characters or less', { status: 400 });
}

// Create product with new fields
const product = await prismadb.product.create({
  data: {
    // ... existing fields
    sellingPrice: sellingPrice || null,
    sku: sku || null,
    shortDescription: shortDescription || null,
    specifications: specifications || null,
    warranty: warranty || null,
    videoUrl: videoUrl || null,
  },
});
```

### 6.2 PATCH Route Updates

Add similar validation and update logic to the PATCH handler.

---

## 7. ArchivedProduct Schema Update

Update `ArchivedProduct` to include new fields:

```prisma
model ArchivedProduct {
  // ... existing fields
  
  // NEW: Include enhanced fields in archive
  sellingPrice      Decimal?
  sku               String?
  shortDescription  String?
  specifications    Json?
  warranty          String?
  videoUrl          String?
}
```

Update `src/lib/archive-product.ts` to copy new fields.

---

## Next: Part 4 - Storefront Integration & Migration Guide
