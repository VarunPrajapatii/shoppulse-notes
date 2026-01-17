# 🚀 Complete Signup & Onboarding Flow Implementation Guide

## Table of Contents
1. [Flow Overview](#flow-overview)
2. [Database Seeding](#database-seeding)
3. [API Structure](#api-structure)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Code Examples](#code-examples)
6. [Testing Checklist](#testing-checklist)

---

## Flow Overview

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEW USER SIGNUP FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Step 1: User clicks "Sign Up"
   ↓
Step 2: Clerk Modal appears
   ├─ Option A: Email + Password (custom name input)
   └─ Option B: Google OAuth (auto-populate name)
   ↓
Step 3: Clerk creates account & fires webhook
   ↓
Step 4: Webhook Handler (/api/webhook/clerk)
   ├─ Create User record in database
   │  ├─ id: clerk user ID
   │  ├─ email: from webhook
   │  ├─ name: from webhook
   │  ├─ trialUsed: false
   │  ├─ isActive: true
   │  ├─ isSuspended: false
   │  ├─ onboardingComplete: false
   │  ├─ createdAt: now()
   │  └─ lastLoginAt: now()
   └─ Return 200 OK
   ↓
Step 5: Clerk redirects to /setup
   ↓
Step 6: Store Modal appears (non-closable)
   ├─ Store name input
   ├─ 7 guide pages
   └─ Acknowledgement checkbox
   ↓
Step 7: User clicks "Complete Setup"
   ↓
Step 8: API Call (/api/onboarding/complete)
   ├─ Find User by Clerk ID
   ├─ Create Store
   ├─ Get TRIAL Plan
   ├─ Create Subscription
   │  ├─ status: ACTIVE (trial is active)
   │  ├─ planId: TRIAL plan ID
   │  ├─ currentPeriodStart: now()
   │  ├─ currentPeriodEnd: now() + 7 days
   │  ├─ nextBillingDate: now() + 7 days
   │  └─ autoRenew: false
   ├─ Create SubscriptionHistory
   │  ├─ action: CREATED
   │  ├─ fromStatus: null (no previous status)
   │  ├─ toStatus: ACTIVE
   │  ├─ fromPlanId: null
   │  └─ toPlanId: TRIAL plan ID
   ├─ Update User
   │  └─ onboardingComplete: true
   │     trialUsed: false  (it will remain false and will be set to true when the trial ends by cron job)
   ├─ Send Welcome Email (optional for now)
   └─ Return store ID
   ↓
Step 9: Redirect to /{storeId} dashboard
   ↓
Step 10: Dashboard shows trial banner
   └─ "You have 7 days left in your trial"
```

---

## API Structure

### 1. Clerk Webhook Handler

**File:** `src/app/api/webhook/clerk/route.ts`

```typescript

    console.log('✅ Onboarding completed for user:', userId);
    console.log('   - Store ID:', result.store.id);
    console.log('   - Subscription ID:', result.subscription.id);
    console.log('   - Trial ends:', trialEndDate.toISOString());

    // ============================================================
    // STEP 5: Send Welcome Email (Optional - implement later)
    // ============================================================
    // TODO: Implement email service
    // await sendWelcomeEmail({
    //   email: user.email,
    //   name: user.name,
    //   storeName: storeName,
    //   trialEndDate: trialEndDate
    // });

    // ============================================================
    // STEP 6: Return Response
    // ============================================================
    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      storeId: result.store.id,
      subscription: {
        status: result.subscription.status,
        trialEndDate: trialEndDate.toISOString(),
        daysRemaining: trialPlan.trialDays
      }
    }, { status: 201 });

```

---

### 3. Update Store Creation API

**File:** `src/app/api/stores/route.ts`

```typescript
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const body = await req.json();
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!body.name) {
      return new NextResponse('Name is required', { status: 400 });
    }

    // Check if user exists in database
    const user = await prismadb.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return new NextResponse('User not found. Please complete signup.', { status: 404 });
    }

    // Check if user already has a store (enforcing one store per user)
    const existingStore = await prismadb.store.findUnique({
      where: { userId }
    });

    if (existingStore) {
      return new NextResponse('User already has a store. Only one store per user is allowed.', { status: 409 });
    }

    // NOTE: This endpoint is now deprecated in favor of /api/onboarding/complete
    // Keeping it for backward compatibility or direct store creation (if needed)
    
    const store = await prismadb.store.create({
      data: {
        name: body.name,
        userId
      }
    });

    return NextResponse.json(store);

  } catch (error) {
    console.log('[STORES_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get all stores for this user (should only be 1)
    const stores = await prismadb.store.findMany({
      where: { userId }
    });

    return NextResponse.json(stores);

  } catch (error) {
    console.log('[STORES_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
```

---




### Phase 5: Update Middleware (Access Control)

#### 5.1 Update Middleware
**File:** `src/middleware.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook(.*)',
]);

// Routes that require onboarding to be completed
const requiresOnboarding = createRouteMatcher([
  '/:storeId(.*)',
  '/api/:storeId(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Require authentication for protected routes
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Check onboarding completion for protected routes
  if (requiresOnboarding(req)) {
    try {
      const user = await prismadb.user.findUnique({
        where: { id: userId },
        select: { 
          onboardingComplete: true, 
          isActive: true,
          isSuspended: true 
        }
      });

      // User not found in database
      if (!user) {
        return NextResponse.redirect(new URL('/sign-up', req.url));
      }

      // Check if account is suspended
      if (user.isSuspended || !user.isActive) {
        return NextResponse.redirect(new URL('/suspended', req.url));
      }

      // Redirect to setup if onboarding not completed
      if (!user.onboardingComplete) {
        const setupUrl = new URL('/setup', req.url);
        return NextResponse.redirect(setupUrl);
      }

      // TODO: Add subscription check here (Phase 6)
      // const subscription = await checkSubscriptionStatus(userId);
      // if (!subscription.isActive) {
      //   return NextResponse.redirect(new URL('/subscribe', req.url));
      // }

    } catch (error) {
      console.error('Middleware error:', error);
      // Continue to route on error (fail open)
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

---

### Phase 6: Testing

#### 6.3 Test Access Control
1. Try accessing /{storeId} before onboarding → Should redirect to /setup
2. Complete onboarding → Should access dashboard
3. Try accessing /setup after completion → Should redirect to dashboard

---

## Subscription History Logic

### When to Create History Records

```typescript
// ✅ CREATE history record for:
1. Subscription created (TRIAL start)
   - action: CREATED
   - fromStatus: null → toStatus: ACTIVE
   - fromPlanId: null → toPlanId: TRIAL

2. Trial expires
   - action: EXPIRED
   - fromStatus: ACTIVE → toStatus: EXPIRED
   - fromPlanId: TRIAL → toPlanId: TRIAL

3. User subscribes to paid plan
   - action: UPGRADED
   - fromStatus: EXPIRED → toStatus: ACTIVE
   - fromPlanId: TRIAL → toPlanId: MONTHLY

4. Plan change
   - action: PLAN_CHANGED
   - fromStatus: ACTIVE → toStatus: ACTIVE
   - fromPlanId: MONTHLY → toPlanId: YEARLY

5. Cancellation
   - action: CANCELLED
   - fromStatus: ACTIVE → toStatus: CANCELLED
   - fromPlanId: MONTHLY → toPlanId: MONTHLY

6. Renewal
   - action: RENEWED
   - fromStatus: ACTIVE → toStatus: ACTIVE
   - fromPlanId: MONTHLY → toPlanId: MONTHLY

7. Suspension
   - action: SUSPENDED
   - fromStatus: ACTIVE → toStatus: SUSPENDED
   - fromPlanId: MONTHLY → toPlanId: MONTHLY
```

---

### Example Usage Check Function

```typescript
// src/lib/subscription-utils.ts

export async function checkPlanLimits(userId: string, metricType: string) {
  const user = await prismadb.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        include: { plan: true }
      }
    }
  });

  if (!user?.subscription) {
    throw new Error('No active subscription');
  }

  const limits = user.subscription.plan.limits as any;
  const maxAllowed = limits[`max${metricType}`];

  // -1 means unlimited
  if (maxAllowed === -1) {
    return { allowed: true, remaining: -1 };
  }

  // Get current count
  const latestUsage = await prismadb.usageRecord.findFirst({
    where: {
      userId,
      subscriptionId: user.subscription.id,
      metricType: metricType.toUpperCase()
    },
    orderBy: { recordedAt: 'desc' }
  });

  const currentUsage = latestUsage?.value || 0;
  const remaining = maxAllowed - currentUsage;

  return {
    allowed: remaining > 0,
    remaining,
    current: currentUsage,
    max: maxAllowed
  };
}
```
