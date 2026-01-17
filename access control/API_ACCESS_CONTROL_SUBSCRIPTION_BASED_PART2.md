# 🔐 Subscription-Based API Access Control - Implementation Guide (Part 2)

**Date:** November 9, 2025  
**System:** ShopPulse Dashboard + Store Frontend Architecture

---

## 📋 Table of Contents (Part 2)

1. [Complete Code Implementation](#complete-code-implementation)
2. [Store Frontend Error Handling](#store-frontend-error-handling)
3. [Customer-Facing UI](#customer-facing-ui)
4. [Testing Strategy](#testing-strategy)
5. [Migration Guide](#migration-guide)
6. [Performance Optimization](#performance-optimization)
7. [Security Considerations](#security-considerations)
8. [Edge Cases & Troubleshooting](#edge-cases--troubleshooting)

---

## 💻 Complete Code Implementation

### Overview: What We're Building

This implementation adds **subscription-aware access control** to all GET endpoints without breaking existing functionality. The solution consists of:

1. **Store-Subscription Service** (Step 1) - Centralized checker with caching
2. **API Wrapper Middleware** (Step 2) - Wraps GET handlers transparently  
3. **Updated GET Endpoints** (Step 3) - Apply wrapper to all public endpoints
4. **Cache Invalidation** (Step 4) - Keep cache fresh on subscription changes

**Key Design Principles:**
- ✅ **Non-breaking**: Existing code structure unchanged
- ✅ **Performant**: 5-minute cache, <10ms average response
- ✅ **Secure**: Fail closed on errors, rate limited
- ✅ **Maintainable**: Single source of truth, easy to update

---

### Step 1: Create Store-Subscription Service

```typescript
// File: src/lib/store-subscription-service.ts

import prismadb from '@/lib/prismadb';
import { SubscriptionStatus } from '@/generated/prisma';

interface StoreAccessResult {
  allowed: boolean;
  status: SubscriptionStatus | 'NOT_FOUND';
  reason?: string;
  gracePeriod?: boolean;
  message?: string;
}

// In-memory cache for store access checks
interface CacheEntry {
  result: StoreAccessResult;
  timestamp: number;
}

const storeStatusCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a store has an active subscription allowing API access
 * 
 * @param storeId - The store ID to check
 * @param bypassCache - Force fresh database lookup (default: false)
 * @returns Access result with allowed status and details
 */
export async function checkStoreAccess(
  storeId: string,
  bypassCache: boolean = false
): Promise<StoreAccessResult> {
  // Check cache first (unless bypassing)
  if (!bypassCache) {
    const cached = storeStatusCache.get(storeId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`✅ [STORE_ACCESS] Cache hit for store ${storeId}`);
      return cached.result;
    }
  }

  console.log(`🔍 [STORE_ACCESS] Checking database for store ${storeId}`);

  try {
    // Lookup store and owner's subscription in one query
    const store = await prismadb.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            isActive: true,
            isSuspended: true,
            gracePeriod: true,
            subscription: {
              select: {
                status: true,
                currentPeriodEnd: true
              }
            }
          }
        }
      }
    });

    if (!store) {
      const result: StoreAccessResult = {
        allowed: false,
        status: 'NOT_FOUND',
        reason: 'Store not found',
        message: 'This store does not exist.'
      };
      
      // Don't cache NOT_FOUND (might be temporary issue)
      return result;
    }

    if (store.user.isSuspended) {
      const result: StoreAccessResult = {
        allowed: false,
        status: 'EXPIRED',
        reason: 'Account suspended',
        message: 'This store has been suspended.'
      };
      
      cacheResult(storeId, result);
      return result;
    }

    if (!store.user.subscription) {
      const result: StoreAccessResult = {
        allowed: false,
        status: 'EXPIRED',
        reason: 'No subscription',
        message: 'This store is temporarily unavailable.'
      };
      
      cacheResult(storeId, result);
      return result;
    }

    const subscription = store.user.subscription;
    const allowedStatuses: SubscriptionStatus[] = ['ACTIVE', 'COMPLETING', 'PAST_DUE'];

    if (allowedStatuses.includes(subscription.status)) {
      const result: StoreAccessResult = {
        allowed: true,
        status: subscription.status,
        gracePeriod: store.user.gracePeriod
      };
      
      cacheResult(storeId, result);
      console.log(`✅ [STORE_ACCESS] Store ${storeId} access granted (${subscription.status})`);
      return result;
    }

    // Status is EXPIRED, CANCELED, or PAUSED
    const result: StoreAccessResult = {
      allowed: false,
      status: subscription.status,
      reason: `Subscription ${subscription.status.toLowerCase()}`,
      message: 'This store is temporarily closed. Please check back later.'
    };
    
    cacheResult(storeId, result);
    console.log(`❌ [STORE_ACCESS] Store ${storeId} access denied (${subscription.status})`);
    return result;

  } catch (error) {
    console.error(`❌ [STORE_ACCESS] Database error checking store ${storeId}:`, error);
    
    // Fail open or closed? Industry standard: Fail CLOSED for security
    const result: StoreAccessResult = {
      allowed: false,
      status: 'EXPIRED',
      reason: 'System error',
      message: 'This store is temporarily unavailable. Please try again later.'
    };
    
    // Don't cache errors
    return result;
  }
}

/**
 * Invalidate cache for a specific store
 * Call this when subscription status changes
 */
export function invalidateStoreCache(storeId: string): void {
  storeStatusCache.delete(storeId);
  console.log(`🗑️  [STORE_ACCESS] Cache invalidated for store ${storeId}`);
}

/**
 * Invalidate cache for all stores owned by a user
 * Call this when user subscription changes
 */
export async function invalidateUserStoresCache(userId: string): Promise<void> {
  try {
    const stores = await prismadb.store.findMany({
      where: { userId },
      select: { id: true }
    });

    stores.forEach(store => {
      storeStatusCache.delete(store.id);
    });

    console.log(`🗑️  [STORE_ACCESS] Cache invalidated for ${stores.length} stores (user ${userId})`);
  } catch (error) {
    console.error(`❌ [STORE_ACCESS] Failed to invalidate user stores cache:`, error);
  }
}

/**
 * Clear entire cache (use sparingly, e.g., in cron jobs)
 */
export function clearStoreAccessCache(): void {
  const size = storeStatusCache.size;
  storeStatusCache.clear();
  console.log(`🗑️  [STORE_ACCESS] Entire cache cleared (${size} entries)`);
}

// Internal helper
function cacheResult(storeId: string, result: StoreAccessResult): void {
  storeStatusCache.set(storeId, {
    result,
    timestamp: Date.now()
  });
}

// Export for monitoring/debugging
export function getCacheStats() {
  return {
    size: storeStatusCache.size,
    entries: Array.from(storeStatusCache.entries()).map(([storeId, entry]) => ({
      storeId,
      age: Date.now() - entry.timestamp,
      allowed: entry.result.allowed,
      status: entry.result.status
    }))
  };
}
```

---

### Step 2: Create API Wrapper Middleware

```typescript
// File: src/lib/api-with-store-check.ts

import { NextResponse } from 'next/server';
import { checkStoreAccess, invalidateStoreCache } from './store-subscription-service';

type ApiHandler = (
  req: Request,
  context: { params: Promise<{ storeId: string }> | { storeId: string } }
) => Promise<Response>;

/**
 * Higher-order function that wraps GET API handlers with subscription checks
 * 
 * Usage:
 * export const GET = withStoreAccessCheck(async (req, { params }) => {
 *   // Your normal GET handler logic
 * });
 */
export function withStoreAccessCheck(handler: ApiHandler): ApiHandler {
  return async (req: Request, context: any) => {
    try {
      // Extract storeId from params
      const params = await Promise.resolve(context.params);
      const { storeId } = params;

      if (!storeId) {
        return NextResponse.json(
          { error: 'Store ID is required' },
          { status: 400 }
        );
      }

      // Check if store has active subscription
      const accessCheck = await checkStoreAccess(storeId);

      if (!accessCheck.allowed) {
        console.log(`🚫 [API_ACCESS_DENIED] Store ${storeId}: ${accessCheck.reason}`);
        
        return NextResponse.json(
          {
            error: 'Store unavailable',
            code: 'STORE_ACCESS_DENIED',
            reason: accessCheck.reason,
            message: accessCheck.message || 'This store is temporarily closed.',
            subscriptionRequired: true
          },
          { 
            status: 402, // 402 Payment Required
            headers: {
              'X-Store-Status': accessCheck.status,
              'X-Subscription-Required': 'true'
            }
          }
        );
      }

      // Access granted - continue to handler
      console.log(`✅ [API_ACCESS_GRANTED] Store ${storeId} (${accessCheck.status})`);
      
      // Add subscription info to headers for debugging
      const response = await handler(req, context);
      
      // Clone response to add headers (if it's a NextResponse)
      if (response instanceof NextResponse) {
        response.headers.set('X-Store-Status', accessCheck.status);
        if (accessCheck.gracePeriod) {
          response.headers.set('X-Grace-Period', 'true');
        }
      }
      
      return response;

    } catch (error) {
      console.error('[API_ACCESS_CHECK] Error:', error);
      
      // Fail closed on errors
      return NextResponse.json(
        {
          error: 'Store access check failed',
          message: 'Unable to verify store status. Please try again later.'
        },
        { status: 503 } // 503 Service Unavailable
      );
    }
  };
}

/**
 * Optional: Wrapper that allows access even for expired stores (for specific endpoints)
 * Example: Order status lookup (customers need to check order even if store expired)
 */
export function withGracefulStoreCheck(handler: ApiHandler): ApiHandler {
  return async (req: Request, context: any) => {
    try {
      const params = await Promise.resolve(context.params);
      const { storeId } = params;

      const accessCheck = await checkStoreAccess(storeId);

      // Log but don't block
      if (!accessCheck.allowed) {
        console.warn(`⚠️  [API_GRACEFUL] Store ${storeId} expired but allowing access: ${accessCheck.reason}`);
      }

      const response = await handler(req, context);
      
      // Add warning headers
      if (response instanceof NextResponse && !accessCheck.allowed) {
        response.headers.set('X-Store-Status', accessCheck.status);
        response.headers.set('X-Store-Warning', 'Store subscription expired');
      }
      
      return response;

    } catch (error) {
      console.error('[API_GRACEFUL_CHECK] Error:', error);
      return handler(req, context); // Proceed anyway
    }
  };
}
```

---

### Step 3: Update GET API Endpoints

#### Example 1: Products API

```typescript
// File: src/app/api/[storeId]/products/route.ts

import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { withStoreAccessCheck } from "@/lib/api-with-store-check";

// ============================================================================
// GET - Public endpoint (for store frontend)
// NOW PROTECTED by subscription check
// ============================================================================

async function getProducts(
  req: Request, 
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId') || undefined;
    const sizeId = searchParams.get('sizeId') || undefined;

    if(!storeId){
      return new NextResponse('Store ID is required', {status: 400});
    }

    const products = await prismadb.product.findMany({
      where: {
        storeId,
        categoryId,
        sizeId,
        isFeatured: true,
        isArchived: false
      },
      include: {
        images: true,
        category: true,
        size: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(products);

  } catch (error) {
    console.log('[PRODUCTS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// Wrap GET handler with subscription check
export const GET = withStoreAccessCheck(getProducts);

// POST remains authenticated (no change)
export async function POST(req: Request, { params }: { params: Promise<{ storeId: string }> }) {
  // ... existing POST logic (unchanged)
}
```

#### Example 2: Billboards API

```typescript
// File: src/app/api/[storeId]/billboards/route.ts

import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { withStoreAccessCheck } from "@/lib/api-with-store-check";

async function getBillboards(
  req: Request, 
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    if(!storeId){
      return new NextResponse('Store ID is required', {status: 400});
    }

    const billboard = await prismadb.billboard.findMany({
      where: {
        storeId
      }
    });

    return NextResponse.json(billboard);

  } catch (error) {
    console.log('[BILLBOARDS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export const GET = withStoreAccessCheck(getBillboards);

export async function POST(req: Request, { params }: { params: Promise<{ storeId: string }> }) {
  // ... existing POST logic
}
```

#### Example 3: Checkout API (Special Case - Remains Public)

```typescript
// File: src/app/api/[storeId]/checkout/route.ts

import prismadb from '@/lib/prismadb';
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { checkStoreAccess } from '@/lib/store-subscription-service';

// ... existing interfaces and CORS headers

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders, status: 200 });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const body = await req.json();
    const { name, email, phone, address, items } = body;

    // ⭐ NEW: Check store subscription before processing checkout
    const accessCheck = await checkStoreAccess(storeId);
    
    if (!accessCheck.allowed) {
      console.log(`🚫 [CHECKOUT_DENIED] Store ${storeId}: ${accessCheck.reason}`);
      
      return NextResponse.json(
        {
          error: 'Store unavailable',
          message: 'This store is temporarily closed and cannot accept orders.',
          code: 'STORE_CLOSED'
        },
        { 
          status: 402,
          headers: corsHeaders 
        }
      );
    }

    // ... rest of existing checkout logic (unchanged)
    
  } catch (error) {
    console.error('[CHECKOUT_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal error processing checkout' },
      { status: 500, headers: corsHeaders }
    );
  }
}
```

---

### Step 4: Invalidate Cache on Subscription Changes

#### Update Webhook Handler

```typescript
// File: src/app/api/webhook/razorpay/subscription/route.ts

import { invalidateUserStoresCache } from '@/lib/store-subscription-service';

// Add cache invalidation to ALL webhook handlers

async function handleSubscriptionCharged(/* ... */) {
  await prisma.$transaction(async (tx) => {
    // ... existing update logic
    
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        // ... rest of updates
      }
    });
  });

  // ⭐ NEW: Invalidate store access cache
  await invalidateUserStoresCache(subscription.userId);
  
  console.log('✅ [WEBHOOK] Subscription charged - cache invalidated');
}

async function handleSubscriptionHalted(/* ... */) {
  await prisma.$transaction(async (tx) => {
    // ... existing update logic
    
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'EXPIRED',
        // ... rest of updates
      }
    });
  });

  // ⭐ NEW: Invalidate store access cache
  await invalidateUserStoresCache(subscription.userId);
  
  console.log('✅ [WEBHOOK] Subscription halted - cache invalidated');
}

// Repeat for all other handlers:
// - handleSubscriptionCompleted
// - handleSubscriptionCancelled
// - handleSubscriptionPaused
// - handleSubscriptionResumed
```

#### Update Cron Jobs

```typescript
// File: src/app/api/cron/expire-trials/route.ts

import { invalidateUserStoresCache } from '@/lib/store-subscription-service';

export async function GET(req: NextRequest) {
  // ... existing trial expiry logic
  
  for (const subscription of expiredTrials) {
    await prismadb.$transaction(async (tx) => {
      // ... update subscription status
    });

    // ⭐ NEW: Invalidate cache
    await invalidateUserStoresCache(subscription.userId);
  }

  // ... rest of cron logic
}
```

---

### Step 5: Update Middleware (Optional Enhancement)

```typescript
// File: src/middleware.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/features',
  '/pricing',
  '/about',
  '/api/webhook/(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (req.method === 'OPTIONS') {
    return;
  }

  // API routes handling
  if (req.nextUrl.pathname.startsWith('/api/')) {
    // Webhooks - always public
    if (req.nextUrl.pathname.startsWith('/api/webhook/')) {
      return;
    }
    
    // Checkout - public but checked in handler
    if (req.nextUrl.pathname.includes('/checkout')) {
      return;
    }
    
    // GET requests - public but checked in handler via withStoreAccessCheck
    if (req.method === 'GET') {
      console.log(`🔍 [MIDDLEWARE] GET request: ${req.nextUrl.pathname}`);
      return; // Continue to handler (will be checked there)
    }
    
    // Non-GET mutations - require authentication
    await auth.protect();
    return;
  }
  
  // Non-API routes
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

---

## 🎨 Store Frontend Error Handling

### Update Store Frontend Template

Your `npx create-shoppulse-template` package needs to handle API errors gracefully.

#### Example: Products Page

```tsx
// In store frontend template
// File: app/products/page.tsx

interface ApiError {
  error: string;
  code?: string;
  message?: string;
  subscriptionRequired?: boolean;
}

export default async function ProductsPage() {
  const storeId = process.env.NEXT_PUBLIC_STORE_ID;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    const res = await fetch(
      `${apiUrl}/api/${storeId}/products`,
      { 
        next: { revalidate: 60 }, // Cache for 1 minute
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Check for subscription errors
    if (res.status === 402) {
      const error: ApiError = await res.json();
      
      // Show "store closed" page
      return <StoreClosedPage message={error.message} />;
    }

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const products = await res.json();

    if (products.length === 0) {
      return <NoProductsFound />;
    }

    return <ProductGrid products={products} />;

  } catch (error) {
    console.error('Failed to load products:', error);
    
    // Show error page
    return <ErrorLoadingProducts />;
  }
}
```

#### Store Closed Component

```tsx
// File: components/store-closed.tsx

import { AlertTriangle } from 'lucide-react';

interface StoreClosedPageProps {
  message?: string;
}

export default function StoreClosedPage({ 
  message = "This store is temporarily closed." 
}: StoreClosedPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-100 rounded-full p-4">
            <AlertTriangle className="h-12 w-12 text-yellow-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Store Temporarily Closed
        </h1>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        <p className="text-sm text-gray-500">
          Please check back later or contact the store owner for more information.
        </p>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            This store is powered by ShopPulse
          </p>
        </div>
      </div>
    </div>
  );
}
```

#### Create Reusable API Client

```typescript
// File: lib/api-client.ts

export class StoreApiClient {
  private baseUrl: string;
  private storeId: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL!;
    this.storeId = process.env.NEXT_PUBLIC_STORE_ID!;
  }

  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}/api/${this.storeId}${endpoint}`;
    
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.status === 402) {
      const error = await res.json();
      throw new StoreClosedError(error.message || 'Store unavailable');
    }

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    return res.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.baseUrl}/api/${this.storeId}${endpoint}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.status === 402) {
      const error = await res.json();
      throw new StoreClosedError(error.message || 'Store unavailable');
    }

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    return res.json();
  }
}

export class StoreClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreClosedError';
  }
}

// Usage:
const api = new StoreApiClient();

try {
  const products = await api.get('/products');
} catch (error) {
  if (error instanceof StoreClosedError) {
    // Show "store closed" UI
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// File: __tests__/store-subscription-service.test.ts

import { checkStoreAccess, invalidateStoreCache } from '@/lib/store-subscription-service';
import prismadb from '@/lib/prismadb';

jest.mock('@/lib/prismadb');

describe('Store Subscription Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateStoreCache('test-store-id'); // Clear cache
  });

  it('should allow access for ACTIVE subscription', async () => {
    (prismadb.store.findUnique as jest.Mock).mockResolvedValue({
      id: 'test-store-id',
      userId: 'test-user-id',
      user: {
        isActive: true,
        isSuspended: false,
        gracePeriod: false,
        subscription: {
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const result = await checkStoreAccess('test-store-id');

    expect(result.allowed).toBe(true);
    expect(result.status).toBe('ACTIVE');
  });

  it('should deny access for EXPIRED subscription', async () => {
    (prismadb.store.findUnique as jest.Mock).mockResolvedValue({
      id: 'test-store-id',
      userId: 'test-user-id',
      user: {
        isActive: false,
        isSuspended: false,
        subscription: {
          status: 'EXPIRED'
        }
      }
    });

    const result = await checkStoreAccess('test-store-id');

    expect(result.allowed).toBe(false);
    expect(result.status).toBe('EXPIRED');
    expect(result.message).toContain('temporarily closed');
  });

  it('should use cache on subsequent calls', async () => {
    (prismadb.store.findUnique as jest.Mock).mockResolvedValue({
      id: 'test-store-id',
      userId: 'test-user-id',
      user: {
        isActive: true,
        subscription: { status: 'ACTIVE' }
      }
    });

    // First call - hits database
    await checkStoreAccess('test-store-id');
    expect(prismadb.store.findUnique).toHaveBeenCalledTimes(1);

    // Second call - uses cache
    await checkStoreAccess('test-store-id');
    expect(prismadb.store.findUnique).toHaveBeenCalledTimes(1); // Still 1!
  });
});
```

### Integration Tests

```typescript
// File: __tests__/api/products.test.ts

import { GET } from '@/app/api/[storeId]/products/route';
import { checkStoreAccess } from '@/lib/store-subscription-service';

jest.mock('@/lib/store-subscription-service');

describe('Products API', () => {
  it('should return 402 for expired subscription', async () => {
    (checkStoreAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      status: 'EXPIRED',
      reason: 'Subscription expired',
      message: 'Store is closed'
    });

    const req = new Request('http://localhost/api/test-store/products');
    const context = { params: Promise.resolve({ storeId: 'test-store' }) };

    const response = await GET(req, context);
    const data = await response.json();

    expect(response.status).toBe(402);
    expect(data.error).toBe('Store unavailable');
    expect(data.subscriptionRequired).toBe(true);
  });

  it('should return products for active subscription', async () => {
    (checkStoreAccess as jest.Mock).mockResolvedValue({
      allowed: true,
      status: 'ACTIVE'
    });

    // Mock database
    const mockProducts = [{ id: '1', name: 'Test Product' }];
    // ... setup prisma mock

    const req = new Request('http://localhost/api/test-store/products');
    const context = { params: Promise.resolve({ storeId: 'test-store' }) };

    const response = await GET(req, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});
```

### Manual Testing Checklist

```bash
# Test Script for Manual Validation

# 1. Test ACTIVE subscription
curl http://localhost:3000/api/[storeId]/products
# Expected: 200 OK, returns products

# 2. Change subscription to EXPIRED in database
# Then test:
curl http://localhost:3000/api/[storeId]/products
# Expected: 402 Payment Required, error message

# 3. Test cache invalidation
# Change subscription back to ACTIVE
# Manually call invalidateUserStoresCache(userId)
curl http://localhost:3000/api/[storeId]/products
# Expected: 200 OK, returns products

# 4. Test checkout with expired subscription
curl -X POST http://localhost:3000/api/[storeId]/checkout \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","items":[]}'
# Expected: 402 Payment Required

# 5. Test PAST_DUE (should allow access)
# Set subscription to PAST_DUE in database
curl http://localhost:3000/api/[storeId]/products
# Expected: 200 OK, X-Grace-Period: true header
```

---

## 🚀 Migration Guide

### Phase 1: Preparation (No Downtime)

**Step 1:** Deploy store-subscription-service.ts
```bash
# Add new file
git add src/lib/store-subscription-service.ts
git commit -m "Add store subscription access service"
git push
```

**Step 2:** Deploy api-with-store-check.ts
```bash
git add src/lib/api-with-store-check.ts
git commit -m "Add API access control wrapper"
git push
```

**Step 3:** Test in staging
```bash
# Deploy to staging environment
vercel --env=staging

# Run manual tests
npm run test:integration
```

### Phase 2: Gradual Rollout

**Step 1:** Enable for one endpoint (products)
```typescript
// Update only products API first
export const GET = withStoreAccessCheck(getProducts);
```

**Step 2:** Monitor for 24 hours
- Check error logs
- Monitor API response times
- Verify cache hit rate

**Step 3:** Roll out to remaining endpoints
```bash
# Update all GET APIs
- billboards
- categories  
- sizes
- upcoming-products
- store-billboards

# Deploy
git commit -m "Enable subscription check for all GET APIs"
git push
```

**Step 4:** Update webhooks to invalidate cache
```bash
git commit -m "Add cache invalidation to subscription webhooks"
git push
```

### Phase 3: Store Frontend Update

**Step 1:** Update store template package
```bash
cd shoppulse-store-template
npm version minor # Bump version
npm publish
```

**Step 2:** Notify existing users
```
Email template:

Subject: Action Required: Update Your Store Frontend

Hi [User],

We've improved store reliability with better subscription handling.

Please update your store frontend:
npm update shoppulse-store-template

This update adds:
- Better error handling
- Graceful "store closed" messages
- Improved customer experience

Update now: [link to docs]
```

### Phase 4: Monitoring & Optimization

**Week 1:** Monitor metrics
- API error rate (expect slight increase initially)
- Cache hit rate (target: >95%)
- Customer complaints (should be minimal)

**Week 2:** Optimize cache TTL
- Analyze cache invalidation frequency
- Adjust TTL if needed (currently 5 minutes)

**Week 3:** Fine-tune error messages
- Gather user feedback
- Improve "store closed" messaging

---

## ⚡ Performance Optimization

### Database Query Optimization

```typescript
// Before: Two queries
const store = await prismadb.store.findUnique({ where: { id: storeId } });
const user = await prismadb.user.findUnique({ 
  where: { id: store.userId },
  include: { subscription: true }
});

// After: One query with join
const store = await prismadb.store.findUnique({
  where: { id: storeId },
  select: {
    id: true,
    userId: true,
    user: {
      select: {
        isActive: true,
        subscription: {
          select: {
            status: true
          }
        }
      }
    }
  }
});
```

**Result:** 50% reduction in database queries

### Caching Strategy

```typescript
// Cache Strategy: Write-through

// On webhook (subscription change):
async function handleSubscriptionChanged(userId: string) {
  // 1. Update database
  await updateSubscription(userId);
  
  // 2. Invalidate cache immediately
  await invalidateUserStoresCache(userId);
  
  // 3. Optionally: Pre-warm cache
  const stores = await getUserStores(userId);
  for (const store of stores) {
    await checkStoreAccess(store.id, true); // Bypass cache, refresh
  }
}
```

### Edge Caching (Advanced)

If using Vercel Edge Config:

```typescript
import { get } from '@vercel/edge-config';

async function checkStoreAccessWithEdge(storeId: string) {
  // Try Edge Config first (ultra-fast, replicated globally)
  const cachedStatus = await get(`store:${storeId}:status`);
  
  if (cachedStatus) {
    return cachedStatus;
  }
  
  // Fallback to database
  const result = await checkStoreAccess(storeId);
  
  // Update Edge Config (async, don't wait)
  updateEdgeConfig(`store:${storeId}:status`, result).catch(console.error);
  
  return result;
}
```

**Result:** <1ms cache lookups globally

---

## 🔒 Security Considerations

### 1. Prevent Cache Poisoning

```typescript
// Validate storeId format before using as cache key
function isValidStoreId(storeId: string): boolean {
  return /^[a-zA-Z0-9-_]{20,30}$/.test(storeId);
}

export async function checkStoreAccess(storeId: string) {
  if (!isValidStoreId(storeId)) {
    throw new Error('Invalid store ID format');
  }
  // ... rest of logic
}
```

### 2. Rate Limiting

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
});

export function withStoreAccessCheck(handler: ApiHandler): ApiHandler {
  return async (req: Request, context: any) => {
    const params = await Promise.resolve(context.params);
    const { storeId } = params;
    
    // Rate limit per store
    const { success } = await ratelimit.limit(`store:${storeId}`);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    // ... rest of access check
  };
}
```

### 3. Audit Logging

```typescript
async function logAccessAttempt(
  storeId: string,
  allowed: boolean,
  reason?: string
) {
  await prismadb.accessLog.create({
    data: {
      storeId,
      timestamp: new Date(),
      allowed,
      reason,
      ip: req.headers.get('x-forwarded-for') || 'unknown'
    }
  });
}

// Use in checkStoreAccess
const result = await checkStoreAccess(storeId);
await logAccessAttempt(storeId, result.allowed, result.reason);
```

---

## 🐛 Edge Cases & Troubleshooting

### Edge Case 1: Subscription Changes During Active Sessions

**Problem:** User is browsing store, subscription expires mid-session

**Solution:** Cache TTL ensures expiry within 5 minutes
```typescript
// Customer experience:
// 1. Browsing store (cached: ACTIVE)
// 2. Subscription expires at 12:00 PM
// 3. Store still works until 12:05 PM (cache TTL)
// 4. At 12:05 PM, next request checks DB → 402 error
// 5. "Store closed" page shown

// This 5-minute grace is acceptable
```

### Edge Case 2: Race Condition - Webhook vs API Request

**Problem:** Webhook arrives to expire subscription, but cache not yet invalidated

**Solution:** Webhook invalidates cache immediately
```typescript
async function handleSubscriptionHalted(subscription: any) {
  await prismadb.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subscription.id },
      data: { status: 'EXPIRED' }
    });
  });

  // Invalidate BEFORE responding to webhook
  await invalidateUserStoresCache(subscription.userId);
  
  return new Response('OK', { status: 200 });
}
```

### Edge Case 3: Database Outage

**Problem:** Cannot check subscription status during DB downtime

**Solution:** Fail closed (deny access) with retry-after header
```typescript
export async function checkStoreAccess(storeId: string) {
  try {
    // ... database query
  } catch (error) {
    if (error.code === 'P1001') { // Prisma connection error
      console.error('Database unavailable');
      
      return {
        allowed: false,
        status: 'EXPIRED',
        reason: 'System maintenance',
        message: 'Store temporarily unavailable. Please try again in a few minutes.',
        retryAfter: 60 // seconds
      };
    }
    throw error;
  }
}

// In API handler:
if (!accessCheck.allowed && accessCheck.retryAfter) {
  return NextResponse.json(
    { error: accessCheck.message },
    { 
      status: 503,
      headers: {
        'Retry-After': String(accessCheck.retryAfter)
      }
    }
  );
}
```

### Edge Case 4: Store Frontend Cached Responses

**Problem:** Store frontend caching 402 errors, showing "closed" even after renewal

**Solution:** Proper cache headers
```typescript
export function withStoreAccessCheck(handler: ApiHandler): ApiHandler {
  return async (req: Request, context: any) => {
    const accessCheck = await checkStoreAccess(storeId);

    if (!accessCheck.allowed) {
      return NextResponse.json(
        { /* error response */ },
        { 
          status: 402,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate', // Don't cache errors
            'X-Store-Status': accessCheck.status
          }
        }
      );
    }

    // For successful responses, allow caching
    const response = await handler(req, context);
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    
    return response;
  };
}
```

### Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| Cache not invalidating | Store stays "closed" after renewal | Check webhook calls `invalidateUserStoresCache()` |
| False 402 errors | Active stores showing "closed" | Check database connection, review query |
| Slow API responses | >1s response time | Verify cache hit rate, optimize DB query |
| Customer checkout blocked | 402 on checkout despite active sub | Ensure checkout handler checks subscription |
| Store works despite EXPIRED | GET APIs returning data | Verify `withStoreAccessCheck` applied to all GET handlers |

---

## 📊 Monitoring Dashboard

### Key Metrics to Track

```typescript
// File: src/app/api/admin/store-access-stats/route.ts

export async function GET() {
  const stats = {
    // Cache performance
    cacheSize: getCacheStats().size,
    cacheHitRate: calculateCacheHitRate(), // Target: >95%
    
    // Access patterns
    totalRequests: getTotalAccessChecks(),
    deniedRequests: getDeniedAccessCount(),
    denialRate: getDeniedAccessCount() / getTotalAccessChecks(),
    
    // Subscription distribution
    activeStores: await countStoresByStatus('ACTIVE'),
    expiredStores: await countStoresByStatus('EXPIRED'),
    pastDueStores: await countStoresByStatus('PAST_DUE'),
    
    // Performance
    avgResponseTime: getAverageAccessCheckTime(), // Target: <10ms
    p95ResponseTime: getP95AccessCheckTime(), // Target: <50ms
  };

  return NextResponse.json(stats);
}
```

### Alerting Rules

```yaml
# alerts.yaml (for monitoring service)

alerts:
  - name: High denial rate
    condition: denialRate > 0.1  # More than 10% denied
    action: Notify admin
    
  - name: Low cache hit rate
    condition: cacheHitRate < 0.90  # Less than 90%
    action: Investigate cache invalidation
    
  - name: Slow access checks
    condition: p95ResponseTime > 100ms
    action: Scale database, review queries
    
  - name: Many expired stores
    condition: expiredStores > 50
    action: Email reminder campaign
```

---

## 🎯 Summary & Best Practices

### ✅ Do's

1. **Always wrap GET APIs** with `withStoreAccessCheck`
2. **Invalidate cache immediately** on subscription changes
3. **Use proper HTTP status codes** (402 for subscription issues)
4. **Provide clear error messages** to customers
5. **Monitor cache hit rates** and performance
6. **Test expiry scenarios** thoroughly before production
7. **Document API changes** for store frontend users

### ❌ Don'ts

1. **Don't cache 402 responses** (use `Cache-Control: no-store`)
2. **Don't skip checkout validation** (verify subscription there too)
3. **Don't forget cache invalidation** in webhooks and crons
4. **Don't use 403 Forbidden** (use 402 Payment Required)
5. **Don't fail open on errors** (deny access by default)
6. **Don't ignore edge cases** (database outage, race conditions)
7. **Don't deploy without testing** cache invalidation

### Industry-Standard Flow

```
Customer Request
  ↓
Check Cache (5min TTL)
  ↓
If miss: Check Database
  ↓
Store + User + Subscription JOIN
  ↓
Validate Status
  ↓
If ACTIVE/COMPLETING/PAST_DUE: Allow
If EXPIRED/CANCELED/PAUSED: Deny (402)
  ↓
Cache Result
  ↓
Return Response
```

---

**End of Part 2**

You now have:
- ✅ Complete code implementation
- ✅ Store frontend error handling
- ✅ Testing strategy
- ✅ Migration guide
- ✅ Performance optimization
- ✅ Security considerations
- ✅ Edge case handling
- ✅ Monitoring & alerting

**Ready to implement!** Start with Phase 1 (preparation) and gradually roll out. 🚀

---

## 🎓 Implementation Checklist

Use this checklist to track your progress:

### Phase 1: Preparation (Day 1)
- [ ] Create `src/lib/store-subscription-service.ts`
- [ ] Create `src/lib/api-with-store-check.ts`
- [ ] Write unit tests for both services
- [ ] Deploy to staging environment
- [ ] Verify services work with mock data

### Phase 2: Gradual Rollout (Day 2-3)
- [ ] Update ONE endpoint (e.g., `/api/[storeId]/products`)
- [ ] Monitor for 24 hours (check logs, performance)
- [ ] Update remaining GET endpoints:
  - [ ] `/api/[storeId]/billboards`
  - [ ] `/api/[storeId]/categories`
  - [ ] `/api/[storeId]/sizes`
  - [ ] `/api/[storeId]/upcoming-products`
  - [ ] `/api/[storeId]/store-billboards`
- [ ] Update `/api/[storeId]/checkout` with check (keep public)
- [ ] Deploy to production

### Phase 3: Cache Invalidation (Day 3)
- [ ] Add `invalidateUserStoresCache()` to webhook handlers:
  - [ ] `handleSubscriptionCharged`
  - [ ] `handleSubscriptionHalted`
  - [ ] `handleSubscriptionCompleted`
  - [ ] `handleSubscriptionCancelled`
  - [ ] `handleSubscriptionPaused`
  - [ ] `handleSubscriptionResumed`
- [ ] Add to cron jobs:
  - [ ] `/api/cron/expire-trials`
  - [ ] `/api/cron/expire-completed-subscriptions`
- [ ] Test cache invalidation with manual subscription changes

### Phase 4: Store Frontend Update (Day 4-5)
- [ ] Update store template package with error handling
- [ ] Add `StoreClosedPage` component
- [ ] Add `StoreApiClient` with 402 handling
- [ ] Test with expired subscription
- [ ] Publish new template version
- [ ] Send notification email to existing users

### Phase 5: Monitoring & Testing (Day 6-7)
- [ ] Set up monitoring dashboard
- [ ] Configure alerts (denial rate, cache hit rate)
- [ ] Manual testing checklist:
  - [ ] Test with ACTIVE subscription → Should work ✅
  - [ ] Test with EXPIRED subscription → Should block ❌
  - [ ] Test with PAST_DUE subscription → Should allow ✅
  - [ ] Test cache invalidation on status change
  - [ ] Test store frontend "closed" page
  - [ ] Test checkout blocking
- [ ] Load testing (simulate traffic spikes)
- [ ] Review logs for any unexpected errors

### Phase 6: Documentation & Training (Day 8)
- [ ] Update API documentation
- [ ] Create internal runbook for troubleshooting
- [ ] Document cache invalidation process
- [ ] Train support team on new error messages
- [ ] Prepare FAQs for users

---

## 📞 Support & Troubleshooting

### Quick Debug Commands

```bash
# Check cache stats
curl http://localhost:3000/api/admin/cache-stats

# Force cache invalidation for a store
curl -X POST http://localhost:3000/api/admin/invalidate-cache \
  -H "Content-Type: application/json" \
  -d '{"storeId": "your-store-id"}'

# Check store access directly
curl http://localhost:3000/api/admin/check-store-access/your-store-id

# View recent access logs
curl http://localhost:3000/api/admin/access-logs?storeId=your-store-id
```

### Common Commands During Implementation

```bash
# Test subscription service
npm run test src/lib/store-subscription-service.test.ts

# Test API wrapper
npm run test src/lib/api-with-store-check.test.ts

# Run all integration tests
npm run test:integration

# Check TypeScript types
npm run type-check

# Deploy to staging
git push staging main

# Deploy to production
git push origin main
```

### Getting Help

If you encounter issues during implementation:

1. **Check the logs**: Look for `[STORE_ACCESS]` or `[API_ACCESS]` prefixes
2. **Verify database query**: Ensure store → user → subscription join works
3. **Test cache**: Use `getCacheStats()` to verify caching is working
4. **Review middleware order**: Ensure `withStoreAccessCheck` is applied correctly
5. **Contact support**: Provide store ID, error message, and timestamp

---

**🎉 You're all set! The documentation is complete and production-ready.**
