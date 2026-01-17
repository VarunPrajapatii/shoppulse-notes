# 🔐 Subscription-Based API Access Control - Complete Implementation Guide

**Date:** November 9, 2025  
**System:** ShopPulse Dashboard + Store Frontend Architecture

---

## 📋 Table of Contents (Part 1)

1. [System Architecture Overview](#system-architecture-overview)
2. [Current Implementation Analysis](#current-implementation-analysis)
3. [Authentication vs Authorization Flow](#authentication-vs-authorization-flow)
4. [Industry Standards & Best Practices](#industry-standards--best-practices)
5. [Problem Statement](#problem-statement)
6. [Solution Architecture](#solution-architecture)

---

## 🏗️ System Architecture Overview

### Your Application Ecosystem

```
┌─────────────────────────────────────────────────────────────────┐
│                        ShopPulse Ecosystem                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         ADMIN DASHBOARD (Your Current App)               │   │
│  │  - Next.js 15 App Router                                 │   │
│  │  - Clerk Authentication                                  │   │
│  │  - Subscription Management                               │   │
│  │  - POST/PATCH/DELETE APIs (Authenticated)                │   │
│  │  - GET APIs (Currently Public)                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           ↓                                     │
│                    Provides Data                                │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │     STORE FRONTEND (User's Downloaded Template)          │   │
│  │  - npx create-shoppulse-template                         │   │
│  │  - Next.js Template                                      │   │
│  │  - Shows: Billboards, Products, Cart, Checkout           │   │
│  │  - Uses: GET APIs from Dashboard                         │   │
│  │  - ENV: NEXT_PUBLIC_STORE_ID=xxx                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           ↓                                     │
│                   Serves Customers                              │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              END CUSTOMERS (Shoppers)                    │   │
│  │  - Browse products on store frontend                     │   │
│  │  - Add to cart                                           │   │
│  │  - Checkout (POST /api/[storeId]/checkout)               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication vs Authorization Flow

### Current State: Two Separate Concerns

#### **Authentication** (Who are you?)
```
User → Clerk Auth → Dashboard Access
         ↓
    userId verified
         ↓
    Can use dashboard
```

#### **Authorization** (What can you do?)
```
Dashboard Layout → Check subscription status → Allow/Deny UI
                                                     ↓
                                            But APIs still work!
```

#### **The Gap:**
```
Store Frontend → Direct API Call → ❌ NO CHECK → Data Returned
                      ↓
            No authentication
            No subscription check
            Just needs storeId
```

---

## 🌍 Industry Standards & Best Practices

### How Major SaaS Platforms Handle This

#### **1. Shopify Model** (Similar to your use case)

```
┌──────────────────┐
│  Store Admin     │ ← Subscription required for dashboard
└────────┬─────────┘
         │
         ↓
┌────────────────────────────────────────┐
│     Shopify Admin API                  │
│  - Protected by API keys               │
│  - Subscription status checked         │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  Storefront API (Public)               │
│  - Different endpoint                  │
│  - Rate limited                        │
│  - Subscription checked server-side    │
│  - Returns empty/disabled if expired   │
└────────────────────────────────────────┘
         ↓
┌──────────────────┐
│  Customer Store  │ ← Always accessible, but may show "closed"
└──────────────────┘
```

**Key Insights:**
- Shopify has **separate APIs**: Admin API vs Storefront API
- Storefront API checks subscription **server-side** (transparent to customer)
- If subscription expired: Store shows "closed" message or redirects
- Checkout is disabled, but store remains viewable

#### **2. Stripe Payment Links Model**

```
Payment Link Active? → YES → Accept payments
                     → NO  → Show "Link expired" message
```

**Key Insights:**
- Payment links checked on **every request**
- If subscription/link expired: Show user-friendly error
- Customer never sees broken experience

#### **3. Vercel Deployment Model**

```
Deployment Active? → YES → Serve website
                   → NO  → Show "Deployment paused" page
```

**Key Insights:**
- Deployment status checked at **edge/CDN level**
- No customer access if subscription expired
- Owner must reactivate to restore

### Industry Best Practices Summary

| Approach | Description | Pros | Cons | Your Fit |
|----------|-------------|------|------|----------|
| **API Key Based** | Each store gets unique API key, checked on every request | Secure, granular control | Adds complexity, key management | ⭐⭐⭐ Good |
| **Store Status Flag** | Database flag (`isActive`) checked server-side | Simple, centralized | Single point of failure | ⭐⭐⭐⭐ Excellent |
| **Rate Limiting** | Expired stores get rate limited to 0 | Graceful degradation | Still allows some access | ⭐⭐ Okay |
| **Separate CDN/Domain** | Store frontend on different infra | Complete isolation | Complex architecture | ⭐ Overkill |
| **Middleware Check** | Subscription checked in API middleware | Performant, cached | Needs careful cache invalidation | ⭐⭐⭐⭐⭐ Best |

---

### Real-World Scenario

```
Problem is, the subscription expired but:
User can:
    - Still display products
    - Still take customer orders
    - Still process checkouts
    - Earn money without paying subscription!
```
    
### This should happen instead:

```
Dec 8:  subscription.status = EXPIRED
        
        Dashboard: BLOCKED ✅
        
        Store Frontend:
        GET /api/[storeId]/products
          → Returns { error: "Store unavailable", subscriptionExpired: true }
        
        Store shows:
        ┌─────────────────────────────────────────┐
        │  🚫 This store is temporarily closed    │
        │                                         │
        │  The store owner's subscription has     │
        │  expired. Please check back later.      │
        │                                          │
        │  Store Owner: Please renew your         │
        │  subscription to reopen your store.     │
        └─────────────────────────────────────────┘
```

---

## 🛠️ Solution Architecture

### Design Goals

1. **Security:** Enforce subscription status on all data access
2. **Performance:** Minimal overhead (1-2ms per request)
3. **Transparency:** Customer-facing store shows friendly error
4. **Flexibility:** Different behaviors for different statuses
5. **Maintainability:** Centralized logic, easy to update
6. **Backward Compatibility:** Checkout must remain public

### Proposed Architecture: Store Status Middleware

```typescript
┌──────────────────────────────────────────────────────────┐
│                   Incoming Request                        │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ↓
┌──────────────────────────────────────────────────────────┐
│             Next.js Middleware (Existing)                │
│  - Handles Clerk authentication                          │
│  - Blocks POST/PATCH/DELETE for unauthenticated          │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ↓
                  Is GET request?
                        │
            ┌───────────┴───────────┐
           YES                     NO
            │                       │
            ↓                       ↓
   ┌────────────────┐      ┌──────────────────┐
   │ NEW: Check     │      │ Require Clerk    │
   │ Store Status   │      │ Authentication   │
   └────────┬───────┘      └──────────────────┘
            │
            ↓
   Is storeId in URL?
            │
      ┌─────┴─────┐
     YES         NO
      │           │
      ↓           ↓
┌──────────┐  ┌────────┐
│ Lookup   │  │ Allow  │
│ Store in │  │ (not   │
│ Database │  │ store  │
└────┬─────┘  │ API)   │
     │        └────────┘
     ↓
Check user.isActive
Check subscription.status
     │
     ↓
┌────────────────────────────────────────┐
│  Status Check Results                  │
├────────────────────────────────────────┤
│  ACTIVE        → ✅ Allow full access  │
│  COMPLETING    → ✅ Allow (grace)      │
│  PAST_DUE      → ✅ Allow (retrying)   │
│  EXPIRED       → ❌ Return 402         │
│  CANCELED      → ❌ Return 402         │
│  PAUSED        → ❌ Return 402         │
└────────────────────────────────────────┘
     │
     ↓
┌──────────────────────────────────────┐
│  Return Response to Frontend         │
│  - If allowed: Continue to handler   │
│  - If blocked: Return error JSON     │
└──────────────────────────────────────┘
```

### Key Components

#### 1. **Store-Subscription Lookup Service**
```typescript
// lib/store-subscription-service.ts

interface StoreAccessResult {
  allowed: boolean;
  status: 'ACTIVE' | 'EXPIRED' | 'PAST_DUE' | 'COMPLETING';
  reason?: string;
  gracePeriod?: boolean;
}

async function checkStoreAccess(storeId: string): Promise<StoreAccessResult> {
  // 1. Lookup store → get userId
  // 2. Lookup user → get subscription
  // 3. Check subscription.status
  // 4. Return access decision
}
```


#### 2. **API Middleware Wrapper**
```typescript
// lib/api-with-store-check.ts

export function withStoreAccessCheck(handler: NextApiHandler) {
  return async (req: Request, context: any) => {
    const { storeId } = context.params;
    
    // Check if store owner has active subscription
    const accessCheck = await checkStoreAccess(storeId);
    
    if (!accessCheck.allowed) {
      return NextResponse.json({
        error: 'Store unavailable',
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'This store is temporarily closed due to subscription status.'
      }, { status: 402 }); // 402 Payment Required
    }
    
    // Continue to actual handler
    return handler(req, context);
  };
}
```

#### 3. **Updated GET Endpoints**
```typescript
// src/app/api/[storeId]/products/route.ts

import { withStoreAccessCheck } from '@/lib/api-with-store-check';

async function getProducts(req: Request, { params }: any) {
  // Original logic
  const products = await prismadb.product.findMany({
    where: { storeId: params.storeId }
  });
  return NextResponse.json(products);
}

// Wrap with access check
export const GET = withStoreAccessCheck(getProducts);
```

### Performance Considerations

#### Caching Strategy
```typescript
// Cache store subscription status for 5 minutes
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const storeStatusCache = new Map();

async function checkStoreAccess(storeId: string) {
  const cached = storeStatusCache.get(storeId);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  
  // Fresh lookup from database
  const result = await performDatabaseCheck(storeId);
  
  storeStatusCache.set(storeId, {
    result,
    timestamp: Date.now()
  });
  
  return result;
}
```

**Cache Invalidation:**
- Invalidate on subscription status change (webhook)
- Invalidate on payment success/failure
- TTL ensures eventual consistency

---

## 📊 Status-Based Behavior Matrix

| Subscription Status | Dashboard Access | GET APIs | POST/PATCH/DELETE | Checkout | Customer View |
|---------------------|------------------|----------|-------------------|----------|---------------|
| **ACTIVE** | ✅ Full access | ✅ Full access | ✅ Full access | ✅ Works | ✅ Normal store |
| **COMPLETING** | ✅ With banner | ✅ Full access | ✅ Full access | ✅ Works | ✅ Normal store |
| **PAST_DUE** | ✅ With warning | ✅ Full access | ✅ Full access | ✅ Works | ✅ Normal store |
| **EXPIRED** | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ "Store closed" |
| **CANCELED** | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ "Store closed" |
| **PAUSED** | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ "Store closed" |

### Grace Period Strategy

```
Payment Failed → PAST_DUE (5-7 days)
  ↓
  Dashboard: Show warning banner
  Store Frontend: Full access (customer doesn't know)
  Checkout: Enabled
  
All Retries Failed → EXPIRED
  ↓
  Dashboard: BLOCKED
  Store Frontend: BLOCKED (show "temporarily closed")
  Checkout: DISABLED
  
User Renews → ACTIVE
  ↓
  Dashboard: Full access
  Store Frontend: Full access
  Checkout: Enabled
```

---

---

## 📝 Executive Summary

### Technical Approach

- **Store-Subscription Service**: Single source of truth, cached (5-min TTL)
- **API Wrapper**: `withStoreAccessCheck()` - Applied to all GET endpoints
- **Status Handling**: ACTIVE/COMPLETING/PAST_DUE = Allow, EXPIRED/CANCELED = Block
- **Performance**: <10ms per check (cached), <50ms (database lookup)
- **Security**: Fail closed, rate limited, audit logged

---