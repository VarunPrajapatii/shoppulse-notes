# Authentication Flow - Complete Guide

**Last Updated:** November 3, 2025  
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Layers](#architecture-layers)
3. [Production Flow (Webhook Available)](#production-flow-webhook-available)
4. [Development Flow (No Webhook)](#development-flow-no-webhook)
5. [Detailed Component Breakdown](#detailed-component-breakdown)
6. [Key Design Decisions](#key-design-decisions)
7. [Error Handling Strategy](#error-handling-strategy)
8. [Interview Talking Points](#interview-talking-points)
9. [Common Pitfalls Avoided](#common-pitfalls-avoided)
10. [Code Examples](#code-examples)

---

## Overview

This document explains the complete authentication and onboarding flow for ShopPulse Admin, from user signup to dashboard access. The architecture is designed with **separation of concerns**, **idempotency**, and **developer experience** in mind.

### High-Level Flow

```
User Sign Up → Authentication → User Creation → Store Setup → Dashboard Access
     (Clerk)      (Clerk)      (Webhook/API)   (Onboarding)    (Protected)
```

### Key Technologies

- **Clerk**: Authentication provider (handles sign-in/sign-up UI and sessions)
- **Next.js 15**: App Router with Server Components
- **Prisma**: ORM for PostgreSQL database
- **Webhooks**: Server-to-server communication for production

---

## Architecture Layers

Our authentication system is built in **5 distinct layers**, each with a single responsibility:

### Layer 1: Post-Authentication Handler
**Route:** `/api/auth/post-auth`  
**Type:** API Route (Server-side)

```typescript
// Single Source of Truth for User Existence
POST /api/auth/post-auth
```

**Responsibilities:**
- ✅ Verify Clerk authentication
- ✅ Ensure user exists in database (create if missing in dev)
- ✅ Check if user has completed store setup
- ✅ Route to appropriate destination

**Guarantees:**
- After this route completes, user **WILL** exist in database
- All subsequent pages can trust user exists
- No other component needs to create users

---

### Layer 2: Setup Layout
**Route:** `/setup`  
**Type:** Server Component Layout

```typescript
// Onboarding Entry Point
/setup/layout.tsx
```

**Responsibilities:**
- ✅ Verify user exists (should always be true)
- ✅ Check if user already has a store
- ✅ If store exists → redirect to dashboard
- ✅ If no store → show setup modal

**Guarantees:**
- User is authenticated (Clerk session)
- User exists in database (Layer 1 guarantee)
- Clean, focused logic (no user creation)

---

### Layer 3: Onboarding API
**Route:** `/api/onboarding/complete`  
**Type:** API Route (Server-side)

```typescript
// Store Creation & Subscription Initialization
POST /api/onboarding/complete
```

**Responsibilities:**
- ✅ Validate store name
- ✅ Create store, subscription, usage records (atomic transaction)
- ✅ Mark onboarding complete
- ✅ Return store ID for redirect

**Guarantees:**
- All-or-nothing transaction (Prisma `$transaction`)
- Trial subscription automatically created (7 days)
- Usage tracking initialized (6 metrics)

---

### Layer 4: Dashboard Layout
**Route:** `/[storeId]`  
**Type:** Server Component Layout

```typescript
// Protected Dashboard Chrome
/[storeId]/layout.tsx
```

**Responsibilities:**
- ✅ Verify authentication
- ✅ Check account status (suspended, inactive)
- ✅ Verify store exists and belongs to user
- ✅ Fetch subscription data
- ✅ Render navbar and trial indicator

**Guarantees:**
- User exists (Layer 1 guarantee)
- User completed onboarding (Layer 3 guarantee)
- Focus only on store verification

---

### Layer 5: Webhook Handler
**Route:** `/api/webhook/clerk`  
**Type:** API Route (Webhook)

```typescript
// Production User Creation
POST /api/webhook/clerk
```

**Responsibilities:**
- ✅ Create user when Clerk signup happens (production)
- ✅ Handle user.created, user.updated, user.deleted
- ✅ Track session.created for last login

**Guarantees:**
- Idempotent (handles duplicate webhooks)
- Retry logic for race conditions
- Signature verification for security

---

## Production Flow (Webhook Available)

### Step-by-Step Breakdown

#### 1. User Visits Sign-Up Page
```
GET /sign-up
→ Clerk <SignUp /> component renders
```

#### 2. User Completes Sign-Up Form
```
User fills: Email, Password, Name
→ Submits form
→ Clerk validates and creates account
```

#### 3. Clerk Fires Webhook (Async)
```
POST https://yourapp.com/api/webhook/clerk
Headers:
  svix-id: <webhook-id>
  svix-timestamp: <timestamp>
  svix-signature: <signature>
Body:
  {
    type: "user.created",
    data: {
      id: "user_xyz123",
      email_addresses: [...],
      first_name: "John",
      last_name: "Doe"
    }
  }
```

**Webhook Handler Logic:**
```typescript
// 1. Verify signature (security)
const wh = new Webhook(WEBHOOK_SECRET);
wh.verify(body, headers); // ✅ Authentic

// 2. Check for duplicate (idempotency)
const existing = await prismadb.user.findUnique({ where: { id } });
if (existing) return; // Already processed

// 3. Create user in database
await prismadb.user.create({
  data: {
    id: "user_xyz123",
    email: "john@example.com",
    name: "John Doe",
    trialUsed: false,
    isActive: true,
    onboardingComplete: false
  }
});
```

#### 4. Clerk Redirects to Post-Auth
```
→ Redirect to /api/auth/post-auth
  (configured in .env: NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL)
```

**Post-Auth Handler Logic:**
```typescript
// 1. Get authenticated user ID
const { userId } = await auth(); // "user_xyz123"

// 2. Check if user exists (webhook already created it)
const user = await prismadb.user.findUnique({
  where: { id: userId },
  include: { stores: true }
});

// 3. User found! Check for store
if (user.stores.length > 0) {
  // Has store → Redirect to dashboard
  return redirect(`/${user.stores[0].id}`);
} else {
  // No store → Redirect to setup
  return redirect('/setup');
}
```

#### 5. User Lands on Setup Page
```
GET /setup
→ Setup layout runs
```

**Setup Layout Logic:**
```typescript
// 1. Verify user (already exists)
const user = await prismadb.user.findUnique({
  where: { id: userId }
});
// ✅ User found

// 2. Check for store
const store = await prismadb.store.findUnique({
  where: { userId }
});
// ❌ No store (as expected)

// 3. Allow access to setup page
return <>{children}</>; // Modal opens automatically
```

#### 6. User Creates Store (Modal)
```
User enters: "My Awesome Store"
→ Clicks "Create Store"
→ POST /api/onboarding/complete
```

**Onboarding API Logic:**
```typescript
// 1. Validate store name
if (!storeName || storeName.trim().length === 0) {
  return error;
}

// 2. Find TRIAL plan
const trialPlan = await prismadb.subscriptionPlan.findFirst({
  where: { name: 'TRIAL' }
});

// 3. Atomic transaction (all or nothing)
await prismadb.$transaction(async (tx) => {
  // Create store
  const store = await tx.store.create({
    data: { name: "My Awesome Store", userId }
  });

  // Create subscription (7-day trial)
  const subscription = await tx.subscription.create({
    data: {
      userId,
      planId: trialPlan.id,
      status: 'ACTIVE',
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  // Create subscription history
  await tx.subscriptionHistory.create({
    data: {
      subscriptionId: subscription.id,
      action: 'CREATED',
      reason: 'Free 7-day trial started'
    }
  });

  // Create 6 usage records
  await tx.usageRecord.createMany({
    data: [
      { userId, metricType: 'PRODUCTS', count: 0 },
      { userId, metricType: 'ORDERS', count: 0 },
      { userId, metricType: 'STORAGE_GB', count: 0 },
      { userId, metricType: 'CATEGORIES', count: 0 },
      { userId, metricType: 'BILLBOARDS', count: 0 },
      { userId, metricType: 'API_CALLS', count: 0 }
    ]
  });

  // Mark onboarding complete
  await tx.user.update({
    where: { id: userId },
    data: { onboardingComplete: true }
  });

  return store;
});

// 4. Return store ID
return { success: true, storeId: store.id };
```

#### 7. Redirect to Dashboard
```
→ Client receives storeId
→ router.push(`/${storeId}`)
→ GET /abc123-store-id
```

**Dashboard Layout Logic:**
```typescript
// 1. Verify authentication
const { userId } = await auth(); // ✅

// 2. Fetch user with subscription
const user = await prismadb.user.findUnique({
  where: { id: userId },
  select: {
    onboardingComplete: true,
    isActive: true,
    subscription: { ... }
  }
});
// ✅ User found (Layer 1 guarantee)

// 3. Check account status
if (user.isSuspended || !user.isActive) {
  redirect('/suspended');
}
// ✅ Active

// 4. Check onboarding
if (!user.onboardingComplete) {
  redirect('/setup');
}
// ✅ Complete

// 5. Verify store ownership (MAIN FOCUS)
const store = await prismadb.store.findUnique({
  where: { id: storeId }
});

if (!store || store.userId !== userId) {
  notFound(); // 404
}
// ✅ Store belongs to user

// 6. Render dashboard
return (
  <>
    <Navbar />
    <TrialIndicator trialEndDate={...} />
    {children}
  </>
);
```

#### 8. Dashboard Rendered! 🎉
```
User sees:
- Navbar with store name
- Trial indicator (6 days remaining)
- Dashboard content
```

---

## Development Flow (No Webhook)

The development flow is identical to production, except **Layer 1** creates the user instead of the webhook.

### Key Difference: User Creation in Post-Auth

```typescript
// /api/auth/post-auth (Development Mode)

const { userId } = await auth();

let user = await prismadb.user.findUnique({
  where: { id: userId }
});

if (!user && process.env.NODE_ENV === 'development') {
  // 🔧 DEV MODE: Webhook can't reach localhost
  
  // Fetch user from Clerk API
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  
  // Create user in database (mimics webhook)
  user = await prismadb.user.create({
    data: {
      id: userId,
      email: clerkUser.emailAddresses[0].emailAddress,
      name: `${clerkUser.firstName} ${clerkUser.lastName}`,
      trialUsed: false,
      isActive: true,
      onboardingComplete: false
    }
  });
  
  console.log('✅ User created in dev mode');
}

// Rest of flow identical to production...
```

### Why This Works

1. **Same Database State:** Dev creates same user structure as webhook
2. **Same Flow:** All downstream components work identically
3. **No Conditionals:** No `if (dev)` checks in other layers
4. **Testable:** Can test production flow locally

---

## Detailed Component Breakdown

### Environment Variables

```bash
# .env
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/api/auth/post-auth
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/api/auth/post-auth

CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

DATABASE_URL=postgresql://user:password@localhost:5432/db
```

### Database Schema (Relevant Tables)

```prisma
model User {
  id                 String   @id
  email              String   @unique
  name               String?
  
  trialUsed          Boolean  @default(false)
  isActive           Boolean  @default(true)
  isSuspended        Boolean  @default(false)
  onboardingComplete Boolean  @default(false)
  
  stores             Store[]
  subscription       Subscription?
  
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model Store {
  id        String   @id @default(uuid())
  name      String
  userId    String   @unique // One store per user
  user      User     @relation(fields: [userId], references: [id])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Subscription {
  id                String             @id @default(uuid())
  userId            String             @unique
  user              User               @relation(...)
  planId            String
  plan              SubscriptionPlan   @relation(...)
  
  status            SubscriptionStatus @default(ACTIVE)
  currentPeriodEnd  DateTime
  
  createdAt         DateTime           @default(now())
}
```

### Middleware Configuration

```typescript
// src/middleware.ts

const isPublicRoute = createRouteMatcher([
  '/',                  // Landing page
  '/features',          // Marketing pages
  '/pricing',
  '/about',
  '/sign-in(.*)',       // Auth pages
  '/sign-up(.*)',
  '/api/webhook/(.*)',  // Webhooks (verified by signature)
  '/api/(.*)',          // API routes (custom auth logic)
]);

export default clerkMiddleware(async (auth, req) => {
  // Public routes: No authentication
  if (isPublicRoute(req)) {
    return;
  }
  
  // Protected routes: Require authentication
  await auth.protect();
});
```

---

## Key Design Decisions

### 1. Why API Route for Post-Auth?

**Problem:** Next.js page routes trigger full React rendering, causing hooks errors during redirects.

**Solution:** Use API Route Handler with `NextResponse.redirect()`.

```typescript
// ❌ DON'T: Page route
// /post-auth/page.tsx
export default async function PostAuthPage() {
  redirect('/setup'); // Causes React hooks error
}

// ✅ DO: API route
// /api/auth/post-auth/route.ts
export async function GET() {
  return NextResponse.redirect(new URL('/setup', baseUrl));
}
```

### 2. Why Layer Separation?

**Problem:** Duplicate user creation logic in multiple layouts.

**Solution:** Single source of truth (Layer 1) that all other layers trust.

**Benefits:**
- ✅ No code duplication
- ✅ Easier to maintain
- ✅ Clear mental model
- ✅ Testable in isolation

### 3. Why Keep `onboardingComplete` Field?

**Alternative:** Just check if user has store.

**Reasons to Keep:**
- **Explicit State:** Clear intent in code
- **Future-Proof:** Can add multi-step onboarding
- **Data Integrity:** Can detect inconsistencies
- **Audit Trail:** Know when onboarding was completed

### 4. Why Atomic Transactions?

```typescript
// All these must succeed or all fail
await prismadb.$transaction([
  createStore,
  createSubscription,
  createHistory,
  createUsageRecords,
  updateUser
]);
```

**Benefits:**
- ✅ No partial data (store without subscription)
- ✅ No cleanup needed on error
- ✅ Database stays consistent

### 5. Why Wait for Webhook in Production?

**Problem:** Redirect happens before webhook completes.

**Solution:** Retry with exponential backoff.

```typescript
async function waitForWebhookUser(userId: string) {
  for (let i = 0; i < 3; i++) {
    const user = await findUser(userId);
    if (user) return user;
    
    await sleep(500); // Wait 500ms
  }
  return null;
}
```

---

## Error Handling Strategy

### Error Page with Specific Codes

```
/error?code=WEBHOOK_TIMEOUT&message=...
/error?code=USER_NOT_FOUND&message=...
/error?code=AUTH_ERROR&message=...
```

### Error Code Meanings

| Code | Layer | Meaning | Action |
|------|-------|---------|--------|
| `WEBHOOK_TIMEOUT` | Layer 1 | Webhook didn't create user | Retry sign-in |
| `USER_CREATION_FAILED` | Layer 1 | Dev mode creation failed | Retry sign-up |
| `USER_NOT_FOUND` | Layer 2/4 | User bypassed Layer 1 | Contact support |
| `AUTH_ERROR` | Any | General auth failure | Retry sign-in |
| `DATA_INCONSISTENCY` | Layer 2 | onboardingComplete but no store | Contact support |

### Defensive Programming

```typescript
// Always check, even when "guaranteed"
const user = await findUser(userId);

if (!user) {
  // This should NEVER happen if proper flow followed
  // But handle it anyway
  console.error('CRITICAL: User not found');
  redirect('/error?code=USER_NOT_FOUND');
}
```

---

## Interview Talking Points

### 1. **Separation of Concerns**

> "I designed the authentication flow with 5 distinct layers, each with a single responsibility. This makes the code easier to test, maintain, and reason about. For example, the dashboard layout doesn't need to worry about user creation—it trusts that Layer 1 already handled it."

### 2. **Developer Experience**

> "Local development is challenging with webhooks because they can't reach localhost. I solved this by detecting `NODE_ENV` and creating users from the Clerk API instead. This gives developers the same database state as production without any webhook setup."

### 3. **Idempotency**

> "The webhook handler is idempotent—if Clerk sends the same webhook twice (which happens!), we check if the user already exists and skip creation. This prevents duplicate entries and errors."

### 4. **Race Conditions**

> "There's a race condition where Clerk redirects to our post-auth route before the webhook completes. I handle this with a retry loop that waits up to 1.5 seconds for the webhook to finish. If it still fails, we show a helpful error page."

### 5. **Atomic Transactions**

> "Store creation involves 5 database operations: create store, subscription, history, usage records, and update user. I wrap these in a Prisma transaction so either all succeed or all fail. This guarantees the database never has partial data."

### 6. **Security**

> "Webhooks are verified using Svix signatures. We check the `svix-signature` header to ensure the request actually came from Clerk and wasn't tampered with. This prevents attackers from creating fake users."

### 7. **Error Boundaries**

> "Each layer has defensive checks even when data should be guaranteed. For example, if a user somehow reaches the dashboard without existing in the database, we show a helpful error page instead of crashing."

### 8. **Scalability**

> "The architecture scales well because each layer is stateless and can be cached. The post-auth API route can be cached at the edge, and layouts use Next.js's automatic caching for database queries."

### 9. **Testing Strategy**

> "Each layer can be tested independently:
> - Layer 1: Mock Clerk API
> - Layer 2: Mock database with existing user
> - Layer 3: Test transaction rollback
> - Layer 4: Mock store data
> - Layer 5: Send fake webhooks with signatures"

### 10. **Production Lessons**

> "I learned that production and development environments have different constraints. Rather than littering the code with `if (dev)` checks, I centralized the difference in Layer 1. This makes 99% of the code environment-agnostic."

---

## Common Pitfalls Avoided

### ❌ Pitfall 1: User Creation in Multiple Places

**Bad:**
```typescript
// dashboard/layout.tsx
if (!user && dev) createUser();

// setup/layout.tsx
if (!user && dev) createUser();

// api/products/route.ts
if (!user && dev) createUser();
```

**Good:**
```typescript
// ONLY in /api/auth/post-auth
if (!user && dev) createUser();

// Everywhere else: Trust it exists
const user = await findUser(); // Always found
```

### ❌ Pitfall 2: Page Route for Redirects

**Bad:**
```typescript
// /post-auth/page.tsx (causes hooks error)
export default async function Page() {
  redirect('/setup');
  return null;
}
```

**Good:**
```typescript
// /api/auth/post-auth/route.ts
export async function GET() {
  return NextResponse.redirect(new URL('/setup', baseUrl));
}
```

### ❌ Pitfall 3: No Transaction for Multi-Step Operations

**Bad:**
```typescript
const store = await prisma.store.create(...);
const sub = await prisma.subscription.create(...); // ❌ Fails here
// Now we have store without subscription!
```

**Good:**
```typescript
await prisma.$transaction(async (tx) => {
  const store = await tx.store.create(...);
  const sub = await tx.subscription.create(...);
  // Both succeed or both fail
});
```

### ❌ Pitfall 4: Ignoring Race Conditions

**Bad:**
```typescript
// User signs up
// → Webhook fires (slow)
// → Redirect to post-auth (fast)
// → User not found → Error ❌
```

**Good:**
```typescript
// Retry with backoff
for (let i = 0; i < 3; i++) {
  const user = await findUser();
  if (user) return user;
  await sleep(500);
}
// Still not found after 1.5s → Show error
```

### ❌ Pitfall 5: Hardcoded Redirect URLs

**Bad:**
```typescript
return NextResponse.redirect('http://localhost:3000/setup');
// ❌ Breaks in production
```

**Good:**
```typescript
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
return NextResponse.redirect(new URL('/setup', baseUrl));
```

---

## Code Examples

### Complete Post-Auth Handler

```typescript
// /api/auth/post-auth/route.ts
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    // 1. Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', baseUrl));
    }
    
    // 2. Check if user exists
    let user = await prismadb.user.findUnique({
      where: { id: userId },
      include: { stores: true }
    });
    
    // 3. Create user in dev mode if missing
    if (!user && process.env.NODE_ENV === 'development') {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      
      user = await prismadb.user.create({
        data: {
          id: userId,
          email: clerkUser.emailAddresses[0].emailAddress,
          name: `${clerkUser.firstName} ${clerkUser.lastName}`.trim(),
          trialUsed: false,
          isActive: true,
          onboardingComplete: false
        },
        include: { stores: true }
      });
    }
    
    // 4. Wait for webhook in production
    if (!user && process.env.NODE_ENV === 'production') {
      // Retry 3 times with 500ms delay
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 500));
        user = await prismadb.user.findUnique({
          where: { id: userId },
          include: { stores: true }
        });
        if (user) break;
      }
      
      if (!user) {
        return NextResponse.redirect(
          new URL('/error?code=WEBHOOK_TIMEOUT', baseUrl)
        );
      }
    }
    
    // 5. Route based on store existence
    if (user.stores[0]) {
      return NextResponse.redirect(new URL(`/${user.stores[0].id}`, baseUrl));
    } else {
      return NextResponse.redirect(new URL('/setup', baseUrl));
    }
    
  } catch (error) {
    console.error('Post-auth error:', error);
    return NextResponse.redirect(
      new URL('/error?code=AUTH_ERROR', baseUrl)
    );
  }
}
```

### Complete Onboarding Handler

```typescript
// /api/onboarding/complete/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const { storeName } = await req.json();
    if (!storeName?.trim()) {
      return new NextResponse('Store name required', { status: 400 });
    }
    
    // Find trial plan
    const trialPlan = await prismadb.subscriptionPlan.findFirst({
      where: { name: 'TRIAL', isActive: true }
    });
    
    if (!trialPlan) {
      return new NextResponse('Trial plan not found', { status: 500 });
    }
    
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Atomic transaction
    const result = await prismadb.$transaction(async (tx) => {
      // Create store
      const store = await tx.store.create({
        data: { name: storeName.trim(), userId }
      });
      
      // Create subscription
      const subscription = await tx.subscription.create({
        data: {
          userId,
          planId: trialPlan.id,
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          autoRenew: false
        }
      });
      
      // Create history
      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: 'CREATED',
          toStatus: 'ACTIVE',
          toPlanId: trialPlan.id,
          reason: 'Free 7-day trial started'
        }
      });
      
      // Create usage records
      const metrics = ['PRODUCTS', 'ORDERS', 'STORAGE_GB', 
                       'CATEGORIES', 'BILLBOARDS', 'API_CALLS'];
      await Promise.all(
        metrics.map(type =>
          tx.usageRecord.create({
            data: {
              userId,
              metricType: type,
              count: 0,
              periodStart: now,
              periodEnd: trialEnd
            }
          })
        )
      );
      
      // Mark onboarding complete
      await tx.user.update({
        where: { id: userId },
        data: { 
          onboardingComplete: true,
          subscriptionId: subscription.id
        }
      });
      
      return store;
    });
    
    return NextResponse.json({
      success: true,
      storeId: result.id
    });
    
  } catch (error) {
    console.error('Onboarding error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
```

---

## Summary

### Flow in One Sentence

> "User signs up with Clerk → Webhook/API creates user in DB → User creates store → Onboarding API initializes subscription → Dashboard renders with trial indicator."

### Key Guarantees

1. **After Layer 1:** User exists in database
2. **After Layer 3:** User has store + subscription
3. **At Layer 4:** All data is guaranteed to exist

### Architecture Benefits

- ✅ Clear separation of concerns
- ✅ Each layer has single responsibility
- ✅ Testable in isolation
- ✅ Works in dev and production
- ✅ Handles edge cases gracefully
- ✅ Idempotent and atomic
- ✅ Easy to explain and maintain

---

**Ready for interview? Practice explaining each layer and the guarantees they provide!** 🚀
