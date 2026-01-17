## 📋 Implementation Overview

### What to Build:
1. **SEO Settings Form** - UI for store owners to configure SEO
2. **API Endpoints** - GET (with Redis cache) and PATCH (with invalidation)
3. **Redis Integration** - Cache SEO data with 24-hour TTL
4. **Database Schema** - Store SEO fields in the Store model

### Architecture:
```
Dashboard (Admin) → Form → API → Database
                              ↓
                           Redis Cache
                              ↓
Storefront ← API Call ← Redis (cached response)
```

---

## 🗄️ Step 1: Database Schema Update

### Update Prisma Schema

**File:** `prisma/schema.prisma` (Dashboard)

Add these fields to the existing `Store` model:

NOTE: If you want you can add more fields as per your requirement.

```prisma
model Store {

  // 🆕 SEO Configuration Fields
  description   String?   @db.Text      // Meta description
  seoKeywords   String[]                // SEO keywords array
  logoUrl       String?                 // Store logo URL
  domainUrl     String?                 // Custom domain (e.g., "https://mystore.com")
  
  // 🆕 Social Media Links (JSON)
  socialLinks   Json?     @default("{}")  // { facebook, instagram, twitter, etc. }
}
```

**Social Links JSON Structure:**
```typescript
interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  pinterest?: string;
}
```

### Run Migration

```bash
cd dashboard
npx prisma migrate dev --name add_seo_fields
npx prisma generate
```

---

## 🎨 Step 2: Create SEO Settings Form UI

### Create SEO Settings Page

**File:** `app/(dashboard)/[storeId]/(routes)/settings/seo-settings/page.tsx` (Dashboard)
The seo settings button will be there is settings page and then link to this page.

---

### Create SEO Form Component

**File:** `app/(dashboard)/[storeId]/(routes)/settings/seo-settings/components/seo-form.tsx` (Dashboard)
This should match the UI as the products/categories/billboard forms.
---

## 🔌 Step 3: Create API Endpoints with Redis Caching

### API Route: GET SEO Config (with Redis Cache)

**File:** `app/api/stores/[storeId]/seo/route.ts` (Dashboard)
It should have get post and delete methods.

Cache key for this store's SEO config will be `seo-config:${storeId}`

The store template is expecting this data structure:
```ts
export interface StoreSEOConfig {
  storeName: string;
  storeUrl: string;
  defaultTitle: string;
  defaultDescription: string;
  logoUrl: string | null;
  socialLinks: {
    facebook?: string | null;
    instagram?: string | null;
    twitter?: string | null;
  } | null;
  keywords: string[] | null;
}
```
Note: But you have liberty to change it as you want (i will update it there)

---

## 🧪 Step 4: Redis Setup (Follow Existing Guide)

### Quick Setup Checklist:

✅ **1. Install Redis** (Docker recommended)
```bash
docker run -d --name redis-cache -p 6379:6379 redis:7-alpine
```

✅ **2. Install Dependencies**
```bash
cd dashboard
npm install ioredis
npm install --save-dev @types/ioredis
```

✅ **3. Create Redis Client** (Copy from guide)
- File: `lib/redis-client.ts`
- File: `lib/redis-helpers.ts`

✅ **4. Set Environment Variable**
```bash
# .env.local (Dashboard)
REDIS_URL=redis://localhost:6379
```

✅ **5. Test Connection**
```bash
redis-cli ping
# Should return: PONG
```

---


## 🧪 Step 6: Testing the Implementation

### Test Flow:

1. **Update SEO Settings in Dashboard:**
   - Navigate to `http://localhost:3001/[storeId]/settings/seo`
   - Fill in store name, description, keywords
   - Add social media links
   - Click "Save Changes"

2. **Verify Database Update:**
```sql
-- Check the store record
SELECT id, name, description, "seoKeywords", "logoUrl", "domainUrl", "socialLinks"
FROM "Store"
WHERE id = 'your-store-id';
```

3. **Test API Endpoint (First Call - Cache Miss):**
```bash
curl http://localhost:3001/api/stores/[storeId]/seo
```

Response should include `X-Cache-Status: MISS`

4. **Test API Endpoint (Second Call - Cache Hit):**
```bash
curl http://localhost:3001/api/stores/[storeId]/seo
```

Response should include `X-Cache-Status: HIT`

5. **Verify Redis Cache:**
```bash
redis-cli
> KEYS seo-config:*
> GET seo-config:[your-store-id]
> TTL seo-config:[your-store-id]  # Should show ~86400 seconds
```

6. **Test Cache Invalidation:**
   - Update SEO settings again in Dashboard
   - Check Redis: `redis-cli GET seo-config:[store-id]` → Should be empty
   - Call API again → Should be `MISS` then re-cached

---

## 📡 Step 7: Storefront Integration

In your Storefront app, update the SEO config fetching:

**File:** `src/actions/get-seo-config.tsx` (Storefront)

```typescript
import { StoreSEOConfig } from "@/types";

const URL = `${process.env.NEXT_PUBLIC_DASHBOARD_API_URL}/api/stores`;

const getSEOConfig = async (storeId: string): Promise<StoreSEOConfig> => {
  try {
    const res = await fetch(`${URL}/${storeId}/seo`, {
      next: { 
        revalidate: 86400, // 24 hours - matches Redis cache
        tags: [`seo-config-${storeId}`]
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch SEO config: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    console.error('[GET_SEO_CONFIG]', error);
    
    // Fallback defaults
    return {
      storeName: "ShopPulse",
      storeUrl: "https://yourstore.com",
      description: "Quality products at great prices",
      keywords: ["online shopping", "ecommerce"],
      logoUrl: "/logo.png",
      socialLinks: {},
    };
  }
};

export default getSEOConfig;
```

---

## 📊 Step 8: Monitoring & Debugging

### Create Admin Dashboard for Redis Status

**File:** `app/(dashboard)/[storeId]/(routes)/settings/cache/page.tsx` (Dashboard)

```typescript
import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

import { getRedisInfo } from '@/lib/redis-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function CacheDashboard({
  params
}: {
  params: { storeId: string }
}) {
  const { userId } = auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const redisInfo = await getRedisInfo();

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">Cache Status</h2>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={redisInfo.connected ? "default" : "destructive"}>
                {redisInfo.connected ? "Connected" : "Disconnected"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Memory Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{redisInfo.usedMemory}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Keys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{redisInfo.totalKeys}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Redis Version
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{redisInfo.version}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ Implementation Checklist

### Database:
- [ ] Update Prisma schema with SEO fields
- [ ] Run migration: `npx prisma migrate dev`
- [ ] Generate Prisma client: `npx prisma generate`

### Redis:
- [ ] Install Redis (Docker or self-hosted)
- [ ] Install `ioredis` package
- [ ] Create `lib/redis-client.ts`
- [ ] Create `lib/redis-helpers.ts`
- [ ] Add `REDIS_URL` to `.env.local`

### UI:
- [ ] Create SEO settings page route
- [ ] Create `seo-form.tsx` component
- [ ] Add navigation link to SEO settings
- [ ] Test form submission

### API:
- [ ] Create `app/api/stores/[storeId]/seo/route.ts`
- [ ] Implement GET with Redis caching
- [ ] Implement PATCH with cache invalidation
- [ ] Test API endpoints

### Storefront:
- [ ] Update `get-seo-config.tsx` to call Dashboard API
- [ ] Test SEO data fetching
- [ ] Verify ISR caching works

### Testing:
- [ ] Test form submission updates database
- [ ] Test API returns cached data on second call
- [ ] Test cache invalidation on update
- [ ] Test Storefront receives updated SEO data

### Monitoring:
- [ ] Create cache dashboard page
- [ ] Test Redis status display
- [ ] Monitor cache hit rate

---

## 🎯 Expected Results

### After Implementation:

1. **Dashboard:**
   - ✅ SEO settings form at `/[storeId]/settings/seo`
   - ✅ Form saves to database
   - ✅ Cache invalidated on save

2. **API:**
   - ✅ GET `/api/stores/[storeId]/seo` returns SEO config
   - ✅ First call caches data in Redis (24h TTL)
   - ✅ Subsequent calls served from cache (fast!)
   - ✅ PATCH invalidates cache

3. **Redis:**
   - ✅ Key format: `seo-config:[storeId]`
   - ✅ TTL: 86400 seconds (24 hours)
   - ✅ Auto-invalidation on update

4. **Storefront:**
   - ✅ Fetches SEO data from Dashboard API
   - ✅ ISR caching with 24-hour revalidation
   - ✅ SEO metadata updated on all pages

---

## 🚀 Performance Benefits

### Before (Without Redis):
- Every Storefront page load → Database query
- ~50-100ms database latency
- High database load
- Expensive repeated queries

### After (With Redis Cache):
- First request: Database query + Cache (50-100ms)
- Subsequent requests: Redis cache (~2-5ms) ⚡
- 95% reduction in database queries
- 50x faster response times
- Scales to millions of requests

---

## 📚 Additional Resources

- **Redis Guide:** `notes/redis-knowledge/04-dashboard-redis-implementation.md`
- **Caching Flow:** `notes/redis-knowledge/03-storefront-seo-caching-flow.md`
- **Best Practices:** `notes/redis-knowledge/05-advanced-patterns-best-practices.md`

---

**Ready to implement? Follow the checklist step by step! 🎉**
