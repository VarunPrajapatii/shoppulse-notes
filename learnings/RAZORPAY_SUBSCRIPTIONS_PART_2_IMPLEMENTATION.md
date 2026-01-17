# 🔄 Razorpay Automatic Recurring Subscriptions - Part 2: Implementation Guide

**Last Updated:** November 4, 2025  
**Prerequisites:** Read [Part 1: Fundamentals](./RAZORPAY_SUBSCRIPTIONS_PART_1_FUNDAMENTALS.md) first

---

## 📚 Table of Contents

1. [Complete API Reference](#complete-api-reference)
2. [Step-by-Step Integration](#step-by-step-integration)
3. [Database Schema](#database-schema)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Webhook Handler (Complete)](#webhook-handler-complete)
7. [Error Handling](#error-handling)
8. [Testing Guide](#testing-guide)
9. [Migration from Manual to Automatic](#migration-from-manual-to-automatic)
10. [Production Checklist](#production-checklist)

---

## Complete API Reference

### 1. **Create Plan** (One-time Setup)

```typescript
POST https://api.razorpay.com/v1/plans

Headers:
  Authorization: Basic <base64(key_id:key_secret)>
  Content-Type: application/json

Body:
{
  "period": "monthly",        // "daily" | "weekly" | "monthly" | "yearly"
  "interval": 1,              // How many periods (e.g., 2 = every 2 months)
  "item": {
    "name": "Monthly Plan",
    "amount": 350000,         // Amount in paise (₹3,500)
    "currency": "INR",
    "description": "Monthly subscription for ShopPulse"
  },
  "notes": {
    "plan_type": "monthly",
    "features": "100 products, 1000 orders"
  }
}

Response:
{
  "id": "plan_ABC123XYZ",
  "entity": "plan",
  "interval": 1,
  "period": "monthly",
  "item": {
    "id": "item_ABC123XYZ",
    "active": true,
    "name": "Monthly Plan",
    "description": "Monthly subscription for ShopPulse",
    "amount": 350000,
    "currency": "INR"
  },
  "notes": { ... },
  "created_at": 1704067200
}
```

**Example: Creating All Plans**
```typescript
// scripts/create-razorpay-plans.ts
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

const plans = [
  {
    name: "Monthly Plan",
    period: "monthly",
    amount: 350000  // ₹3,500
  },
  {
    name: "Yearly Plan",
    period: "yearly",
    amount: 3850000  // ₹38,500
  }
];

async function createPlans() {
  for (const planData of plans) {
    const plan = await razorpay.plans.create({
      period: planData.period,
      interval: 1,
      item: {
        name: planData.name,
        amount: planData.amount,
        currency: "INR",
        description: `${planData.name} for ShopPulse`
      }
    });
    
    console.log(`Created ${planData.name}: ${plan.id}`);
    // Store these IDs in .env file!
  }
}

createPlans();
```

---

### 2. **Create Subscription**

```typescript
POST https://api.razorpay.com/v1/subscriptions

Headers:
  Authorization: Basic <base64(key_id:key_secret)>
  Content-Type: application/json

Body:
{
  "plan_id": "plan_ABC123XYZ",
  "total_count": 12,          // Optional: Stop after 12 cycles
  "quantity": 1,              // Number of plan units
  "customer_notify": 1,       // Razorpay sends email to customer
  "start_at": 1704067200,     // Optional: Unix timestamp to start
  "expire_by": 1735689600,    // Optional: Unix timestamp to expire
  "addons": [                 // Optional: One-time charges
    {
      "item": {
        "name": "Setup Fee",
        "amount": 50000,      // ₹500
        "currency": "INR"
      }
    }
  ],
  "notes": {
    "userId": "user_123",
    "email": "varun@example.com",
    "source": "web"
  },
  "notify_info": {            // Optional: Custom notification
    "notify_phone": "9876543210",
    "notify_email": "varun@example.com"
  }
}

Response:
{
  "id": "sub_KLMNopqrst123",
  "entity": "subscription",
  "plan_id": "plan_ABC123XYZ",
  "status": "created",
  "current_start": null,
  "current_end": null,
  "ended_at": null,
  "quantity": 1,
  "notes": { ... },
  "charge_at": 1704067200,
  "start_at": 1704067200,
  "end_at": 1735689600,
  "auth_attempts": 0,
  "total_count": 12,
  "paid_count": 0,
  "customer_notify": 1,
  "created_at": 1704067200,
  "expire_by": 1735689600,
  "short_url": "https://rzp.io/i/abc123",
  "has_scheduled_changes": false,
  "change_scheduled_at": null,
  "offer_id": null
}
```

---

### 3. **Fetch Subscription**

```typescript
GET https://api.razorpay.com/v1/subscriptions/{subscription_id}

Response:
{
  "id": "sub_KLMNopqrst123",
  "entity": "subscription",
  "plan_id": "plan_ABC123XYZ",
  "status": "active",
  "current_start": 1704067200,
  "current_end": 1706745600,
  "ended_at": null,
  "quantity": 1,
  "notes": { ... },
  "charge_at": 1706745600,
  "start_at": 1704067200,
  "end_at": 1735689600,
  "auth_attempts": 1,
  "total_count": 12,
  "paid_count": 1,
  "remaining_count": 11,
  "customer_notify": 1,
  "created_at": 1704067200,
  "has_scheduled_changes": false
}
```

---

### 4. **Cancel Subscription**

```typescript
POST https://api.razorpay.com/v1/subscriptions/{subscription_id}/cancel

Body:
{
  "cancel_at_cycle_end": 1  // 0 = immediate, 1 = at period end
}

Response:
{
  "id": "sub_KLMNopqrst123",
  "entity": "subscription",
  "status": "cancelled",     // Or "active" if cancel_at_cycle_end = 1
  "cancelled_at": 1704067200,
  "ended_at": 1706745600,    // If cancel_at_cycle_end = 1
  ...
}
```

---

### 5. **Pause/Resume Subscription**

```typescript
// Pause
POST https://api.razorpay.com/v1/subscriptions/{subscription_id}/pause

Body:
{
  "pause_at": "now"  // or "cycle_end"
}

// Resume
POST https://api.razorpay.com/v1/subscriptions/{subscription_id}/resume

Body:
{
  "resume_at": "now"  // or "cycle_end"
}
```

---

### 6. **Update Subscription**

```typescript
PATCH https://api.razorpay.com/v1/subscriptions/{subscription_id}

Body:
{
  "plan_id": "plan_NEW123",     // Change plan
  "quantity": 2,                 // Change quantity
  "remaining_count": 5,          // Change total cycles
  "schedule_change_at": "now"    // or "cycle_end"
}
```

---

## Step-by-Step Integration

### Step 1: Install Razorpay SDK

```bash
npm install razorpay
npm install @types/razorpay --save-dev
```

---

### Step 2: Environment Variables

```env
# .env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx

# Plan IDs (after creating plans)
RAZORPAY_MONTHLY_PLAN_ID=plan_ABC123XYZ
RAZORPAY_YEARLY_PLAN_ID=plan_DEF456UVW
```

---

### Step 3: Create Razorpay Instance

```typescript
// lib/razorpay.ts
import Razorpay from 'razorpay';

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export const PLAN_IDS = {
  MONTHLY: process.env.RAZORPAY_MONTHLY_PLAN_ID!,
  YEARLY: process.env.RAZORPAY_YEARLY_PLAN_ID!
} as const;
```

---

### Step 4: Create Plans (One-time Script)

```typescript
// scripts/setup-razorpay-plans.ts
import { razorpay } from '@/lib/razorpay';

async function setupPlans() {
  console.log('Creating Razorpay plans...\n');
  
  // Monthly Plan
  const monthlyPlan = await razorpay.plans.create({
    period: 'monthly',
    interval: 1,
    item: {
      name: 'ShopPulse Monthly',
      amount: 350000,  // ₹3,500
      currency: 'INR',
      description: 'Monthly subscription - 100 products, unlimited orders'
    },
    notes: {
      type: 'monthly',
      maxProducts: '100',
      maxOrders: 'unlimited'
    }
  });
  
  console.log('✅ Monthly Plan:', monthlyPlan.id);
  
  // Yearly Plan
  const yearlyPlan = await razorpay.plans.create({
    period: 'yearly',
    interval: 1,
    item: {
      name: 'ShopPulse Yearly',
      amount: 3850000,  // ₹38,500
      currency: 'INR',
      description: 'Yearly subscription - 100 products, unlimited orders'
    },
    notes: {
      type: 'yearly',
      maxProducts: '100',
      maxOrders: 'unlimited'
    }
  });
  
  console.log('✅ Yearly Plan:', yearlyPlan.id);
  
  console.log('\n📝 Add these to your .env file:');
  console.log(`RAZORPAY_MONTHLY_PLAN_ID=${monthlyPlan.id}`);
  console.log(`RAZORPAY_YEARLY_PLAN_ID=${yearlyPlan.id}`);
}

setupPlans().catch(console.error);
```

Run once:
```bash
npx tsx scripts/setup-razorpay-plans.ts
```

---

## Database Schema

### Update Prisma Schema

```prisma
// prisma/schema.prisma

model Subscription {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Razorpay fields
  razorpaySubscriptionId  String?  @unique
  razorpayPlanId          String?
  razorpayCustomerId      String?
  
  // Local plan reference (your SubscriptionPlan model)
  planId                  String
  plan                    SubscriptionPlan @relation(fields: [planId], references: [id])
  
  // Status
  status                  SubscriptionStatus  @default(ACTIVE)
  
  // Billing
  billingCycle           BillingCycle
  currentPeriodStart     DateTime?
  currentPeriodEnd       DateTime?
  nextChargeAt           DateTime?
  
  // Counters (for Razorpay subscriptions)
  totalCount             Int?      // Total cycles (null = infinite)
  paidCount              Int       @default(0)
  remainingCount         Int?
  
  // Cancellation
  canceledAt             DateTime?
  cancelAtPeriodEnd      Boolean   @default(false)
  cancellationReason     String?
  
  // Auto-renewal
  autoRenew              Boolean   @default(true)
  
  // Metadata
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  
  // Relations
  payments               Payment[]
  subscriptionHistory    SubscriptionHistory[]
  
  @@index([userId])
  @@index([razorpaySubscriptionId])
  @@index([status])
}

model Payment {
  id                     String        @id @default(uuid())
  userId                 String
  user                   User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  subscriptionId         String?
  subscription           Subscription? @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)
  
  // Razorpay fields
  razorpayOrderId        String?       @unique
  razorpayPaymentId      String?       @unique
  razorpaySubscriptionId String?       // For subscription payments
  razorpaySignature      String?
  
  // Payment details
  subtotal               Decimal       @db.Decimal(10, 2)
  taxAmount              Decimal       @default(0) @db.Decimal(10, 2)
  amountPaid             Decimal       @db.Decimal(10, 2)
  currency               String        @default("INR")
  
  // Status
  status                 PaymentStatus @default(PENDING)
  paidAt                 DateTime?
  failureReason          String?
  
  // Method
  paymentMethod          String?       // card, upi, netbanking, etc.
  cardLast4              String?
  cardNetwork            String?       // visa, mastercard, etc.
  
  // Description
  description            String?
  
  // Timestamps
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt
  
  @@index([userId])
  @@index([subscriptionId])
  @@index([razorpayPaymentId])
  @@index([razorpaySubscriptionId])
}
```

Run migration:
```bash
npx prisma migrate dev --name add_razorpay_subscription_fields
```

---

## Backend Implementation

## Frontend Implementation

### Component: Subscription Plans Page

```typescript
// src/app/(dashboard)/subscription/plans/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function SubscriptionPlansPage() {
  const [loading, setLoading] = useState<'MONTHLY' | 'YEARLY' | null>(null);
  
  const handleSubscribe = async (planType: 'MONTHLY' | 'YEARLY') => {
    try {
      setLoading(planType);
      
      // Step 1: Create Razorpay subscription
      const response = await fetch('/api/subscription/create-razorpay-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create subscription');
      }
      
      const data = await response.json();
      
      // Step 2: Load Razorpay checkout
      const options = {
        key: data.razorpayKeyId,
        subscription_id: data.subscriptionId,
        name: 'ShopPulse',
        description: `${data.planName} Subscription`,
        image: '/logo.png',  // Your logo
        handler: async function (response: any) {
          // Step 3: Verify on backend
          try {
            const verifyResponse = await fetch('/api/subscription/verify-razorpay-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            
            if (verifyResponse.ok) {
              toast.success('Subscription activated successfully!');
              // Redirect to dashboard
              window.location.href = '/dashboard';
            } else {
              toast.error('Failed to verify payment');
            }
          } catch (error) {
            console.error('Verification error:', error);
            toast.error('Failed to verify payment');
          }
        },
        prefill: {
          name: '', // User's name
          email: '', // User's email
        },
        theme: {
          color: '#3399cc'
        },
        modal: {
          ondismiss: function () {
            setLoading(null);
            toast.info('Payment canceled');
          }
        }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
    } catch (error: any) {
      console.error('Subscribe error:', error);
      toast.error(error.message || 'Failed to start subscription');
      setLoading(null);
    }
  };
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Choose Your Plan</h1>
      
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Monthly Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Plan</CardTitle>
            <CardDescription>Perfect for getting started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-4">
              ₹3,500<span className="text-lg font-normal text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-2">
              <li>✅ 100 Products</li>
              <li>✅ Unlimited Orders</li>
              <li>✅ Email Support</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => handleSubscribe('MONTHLY')}
              disabled={loading !== null}
            >
              {loading === 'MONTHLY' ? 'Processing...' : 'Subscribe Monthly'}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Yearly Plan */}
        <Card className="border-primary">
          <CardHeader>
            <div className="bg-primary text-primary-foreground text-sm px-3 py-1 rounded-full w-fit mb-2">
              Save ₹3,500
            </div>
            <CardTitle>Yearly Plan</CardTitle>
            <CardDescription>Best value for serious businesses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-4">
              ₹38,500<span className="text-lg font-normal text-muted-foreground">/year</span>
            </div>
            <ul className="space-y-2">
              <li>✅ 100 Products</li>
              <li>✅ Unlimited Orders</li>
              <li>✅ Priority Support</li>
              <li>✅ Save ₹3,500/year</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => handleSubscribe('YEARLY')}
              disabled={loading !== null}
            >
              {loading === 'YEARLY' ? 'Processing...' : 'Subscribe Yearly'}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Load Razorpay script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}
```

---

## Webhook Handler (Complete)

```typescript
// src/app/api/webhooks/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prismadb';
import { sendEmail } from '@/lib/email-service';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    
    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }
    
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');
    
    if (expectedSignature !== signature) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    // Parse event
    const event = JSON.parse(body);
    const eventType = event.event;
    const payload = event.payload;
    
    console.log(`Received webhook: ${eventType}`);
    
    // Handle different event types
    switch (eventType) {
      case 'subscription.authenticated':
        await handleSubscriptionAuthenticated(payload);
        break;
      
      case 'subscription.activated':
        await handleSubscriptionActivated(payload);
        break;
      
      case 'subscription.charged':
        await handleSubscriptionCharged(payload);
        break;
      
      case 'subscription.pending':
        await handleSubscriptionPending(payload);
        break;
      
      case 'subscription.halted':
        await handleSubscriptionHalted(payload);
        break;
      
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(payload);
        break;
      
      case 'subscription.completed':
        await handleSubscriptionCompleted(payload);
        break;
      
      case 'subscription.paused':
      case 'subscription.resumed':
        await handleSubscriptionStatusChange(payload, eventType);
        break;
      
      default:
        console.log(`Unhandled event type: ${eventType}`);
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Handler functions
async function handleSubscriptionAuthenticated(payload: any) {
  const subscriptionData = payload.subscription.entity;
  const paymentData = payload.payment.entity;
  
  const subscription = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId: subscriptionData.id }
  });
  
  if (!subscription) {
    console.error('Subscription not found:', subscriptionData.id);
    return;
  }
  
  // Update subscription
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      updatedAt: new Date()
    }
  });
  
  console.log(`Subscription authenticated: ${subscriptionData.id}`);
}

async function handleSubscriptionActivated(payload: any) {
  const subscriptionData = payload.subscription.entity;
  
  const subscription = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId: subscriptionData.id },
    include: { user: true }
  });
  
  if (!subscription) return;
  
  // Update subscription with period dates
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: new Date(subscriptionData.current_start * 1000),
      currentPeriodEnd: new Date(subscriptionData.current_end * 1000),
      nextChargeAt: new Date(subscriptionData.charge_at * 1000),
      paidCount: subscriptionData.paid_count,
      remainingCount: subscriptionData.remaining_count,
      updatedAt: new Date()
    }
  });
  
  // Send welcome email
  await sendEmail({
    to: subscription.user.email,
    subject: 'Welcome to ShopPulse!',
    template: 'subscription-activated',
    data: {
      userName: subscription.user.name,
      nextChargeDate: new Date(subscriptionData.charge_at * 1000)
    }
  });
  
  console.log(`Subscription activated: ${subscriptionData.id}`);
}

async function handleSubscriptionCharged(payload: any) {
  const subscriptionData = payload.subscription.entity;
  const paymentData = payload.payment.entity;
  
  const subscription = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId: subscriptionData.id },
    include: { user: true }
  });
  
  if (!subscription) return;
  
  // Check if payment already processed (idempotency)
  const existingPayment = await prisma.payment.findUnique({
    where: { razorpayPaymentId: paymentData.id }
  });
  
  if (existingPayment) {
    console.log('Payment already processed:', paymentData.id);
    return;
  }
  
  // Create payment record
  await prisma.payment.create({
    data: {
      userId: subscription.userId,
      subscriptionId: subscription.id,
      razorpayPaymentId: paymentData.id,
      razorpaySubscriptionId: subscriptionData.id,
      subtotal: paymentData.amount / 100,
      amountPaid: paymentData.amount / 100,
      currency: paymentData.currency,
      status: 'SUCCESS',
      paidAt: new Date(),
      paymentMethod: paymentData.method,
      description: `Recurring payment - Cycle ${subscriptionData.paid_count}`
    }
  });
  
  // Update subscription
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: new Date(subscriptionData.current_start * 1000),
      currentPeriodEnd: new Date(subscriptionData.current_end * 1000),
      nextChargeAt: new Date(subscriptionData.charge_at * 1000),
      paidCount: subscriptionData.paid_count,
      remainingCount: subscriptionData.remaining_count,
      updatedAt: new Date()
    }
  });
  
  // Send receipt email
  await sendEmail({
    to: subscription.user.email,
    subject: 'Payment Receipt - ShopPulse',
    template: 'payment-receipt',
    data: {
      amount: paymentData.amount / 100,
      paymentDate: new Date(),
      nextChargeDate: new Date(subscriptionData.charge_at * 1000)
    }
  });
  
  console.log(`Subscription charged: ${subscriptionData.id}`);
}

async function handleSubscriptionPending(payload: any) {
  const subscriptionData = payload.subscription.entity;
  
  const subscription = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId: subscriptionData.id },
    include: { user: true }
  });
  
  if (!subscription) return;
  
  // Update status to PAST_DUE
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'PAST_DUE',
      updatedAt: new Date()
    }
  });
  
  // Send payment failed email
  await sendEmail({
    to: subscription.user.email,
    subject: 'Payment Failed - Action Required',
    template: 'payment-failed',
    data: {
      userName: subscription.user.name,
      retryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)  // 3 days
    }
  });
  
  console.log(`Subscription pending: ${subscriptionData.id}`);
}

async function handleSubscriptionHalted(payload: any) {
  const subscriptionData = payload.subscription.entity;
  
  const subscription = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId: subscriptionData.id },
    include: { user: true }
  });
  
  if (!subscription) return;
  
  // Update status to EXPIRED
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'EXPIRED',
      autoRenew: false,
      updatedAt: new Date()
    }
  });
  
  // Send suspension email
  await sendEmail({
    to: subscription.user.email,
    subject: 'Subscription Suspended',
    template: 'subscription-halted',
    data: {
      userName: subscription.user.name
    }
  });
  
  console.log(`Subscription halted: ${subscriptionData.id}`);
}

async function handleSubscriptionCancelled(payload: any) {
  const subscriptionData = payload.subscription.entity;
  
  const subscription = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId: subscriptionData.id },
    include: { user: true }
  });
  
  if (!subscription) return;
  
  // Update status
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'CANCELED',
      canceledAt: subscriptionData.cancelled_at ? new Date(subscriptionData.cancelled_at * 1000) : new Date(),
      autoRenew: false,
      updatedAt: new Date()
    }
  });
  
  console.log(`Subscription cancelled: ${subscriptionData.id}`);
}

async function handleSubscriptionCompleted(payload: any) {
  const subscriptionData = payload.subscription.entity;
  
  const subscription = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId: subscriptionData.id }
  });
  
  if (!subscription) return;
  
  // Update status to COMPLETED
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'EXPIRED',  // Or create COMPLETED status
      updatedAt: new Date()
    }
  });
  
  console.log(`Subscription completed: ${subscriptionData.id}`);
}

async function handleSubscriptionStatusChange(payload: any, eventType: string) {
  const subscriptionData = payload.subscription.entity;
  
  const subscription = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId: subscriptionData.id }
  });
  
  if (!subscription) return;
  
  const status = eventType === 'subscription.paused' ? 'PAUSED' : 'ACTIVE';
  
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status,
      updatedAt: new Date()
    }
  });
  
  console.log(`Subscription ${status.toLowerCase()}: ${subscriptionData.id}`);
}
```

---

## Error Handling

### Common Errors and Solutions

#### 1. **Authentication Failed**
```
Error: Customer authentication failed
Reason: OTP not entered, timeout, or bank rejection

Solution:
- Show user-friendly message
- Allow retry
- Suggest alternative payment method
```

#### 2. **Insufficient Funds**
```
Error: Payment failed - insufficient funds
Reason: Card has insufficient balance

Solution:
- Razorpay automatically retries after 3, 7, 14 days
- Send email notification
- Keep user in PAST_DUE status (grace period)
```

#### 3. **Card Expired**
```
Error: Card expired
Reason: Saved card expired

Solution:
- Send email asking to update card
- Provide link to update payment method
- Keep subscription in PAST_DUE
```

#### 4. **Duplicate Webhook**
```
Error: None (not an error, expected behavior)
Reason: Razorpay sends webhooks multiple times

Solution:
- Check if payment already processed
- Use idempotency keys
- Return 200 OK for duplicates
```

---

## Testing Guide

### Test Mode Setup

1. **Use Test Keys**
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

2. **Test Cards**
```
Success Card:
  Number: 4111 1111 1111 1111
  CVV: Any 3 digits
  Expiry: Any future date
  OTP: 1234 (for 3D Secure)

Failure Card (Insufficient Funds):
  Number: 4000 0000 0000 0002
```

3. **Test UPI**
```
Success: success@razorpay
Failure: failure@razorpay
```

### Testing Scenarios

#### Scenario 1: Successful Subscription
```
1. Click "Subscribe Monthly"
2. Enter test card: 4111 1111 1111 1111
3. Complete OTP: 1234
4. Check webhook: subscription.authenticated
5. Check webhook: subscription.activated
6. Verify database updated
7. Check email sent
```

#### Scenario 2: Payment Failure
```
1. Click "Subscribe"
2. Enter failure card: 4000 0000 0000 0002
3. Payment fails
4. Check webhook: subscription.pending
5. Verify status: PAST_DUE
6. Wait for retry (test mode: instant)
```

#### Scenario 3: Cancellation
```
1. Click "Cancel Subscription"
2. Select "Cancel at period end"
3. Check webhook: subscription.cancelled
4. Verify cancelAtPeriodEnd: true
5. Check access continues until period end
```

---

## Migration from Manual to Automatic

### Strategy: Gradual Migration

**Option 1: New Users Only** (Recommended)
```
- Existing users: Keep manual system
- New users: Use Razorpay subscriptions
- Both systems run in parallel
- Gradually migrate existing users
```

**Option 2: All Users at Once**
```
- Pick a date
- Create Razorpay subscription for all active users
- Send communication email
- Handle edge cases
```

### Migration Script

```typescript
// scripts/migrate-to-razorpay-subscriptions.ts
import { razorpay, PLAN_IDS } from '@/lib/razorpay';
import prisma from '@/lib/prismadb';

async function migrateUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  });
  
  if (!user || !user.subscription) return;
  
  // Only migrate active subscriptions
  if (user.subscription.status !== 'ACTIVE') return;
  
  // Skip if already migrated
  if (user.subscription.razorpaySubscriptionId) return;
  
  // Determine plan type
  const planType = user.subscription.billingCycle === 'MONTHLY' ? 'MONTHLY' : 'YEARLY';
  const razorpayPlanId = PLAN_IDS[planType];
  
  // Create Razorpay subscription
  const razorpaySubscription = await razorpay.subscriptions.create({
    plan_id: razorpayPlanId,
    customer_notify: 1,
    start_at: Math.floor(user.subscription.nextBillingDate!.getTime() / 1000),  // Start at next billing
    notes: {
      userId: user.id,
      migratedFrom: 'manual-system',
      originalStartDate: user.subscription.currentPeriodStart?.toISOString()
    }
  });
  
  // Update database
  await prisma.subscription.update({
    where: { id: user.subscription.id },
    data: {
      razorpaySubscriptionId: razorpaySubscription.id,
      razorpayPlanId: razorpayPlanId,
      updatedAt: new Date()
    }
  });
  
  console.log(`Migrated user ${user.email} to Razorpay subscription`);
}

async function migrateAllUsers() {
  const users = await prisma.user.findMany({
    where: {
      subscription: {
        status: 'ACTIVE',
        razorpaySubscriptionId: null
      }
    }
  });
  
  for (const user of users) {
    try {
      await migrateUser(user.id);
      // Wait 1 second between migrations (rate limiting)
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to migrate user ${user.email}:`, error);
    }
  }
  
  console.log(`Migration complete! Migrated ${users.length} users.`);
}

migrateAllUsers();
```

---

## Production Checklist

### Before Going Live

- [ ] **Switch to Live Keys**
  - Update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET with live keys
  - Get keys from Razorpay Dashboard → Settings → API Keys

- [ ] **Complete KYC**
  - Submit business documents to Razorpay
  - Get account activated for live mode
  - Wait for approval (1-2 days)

- [ ] **Webhook Configuration**
  - Add webhook URL in Razorpay Dashboard
  - URL: `https://yourdomain.com/api/webhooks/razorpay`
  - Copy webhook secret and update .env

- [ ] **Create Live Plans**
  - Run `npx tsx scripts/setup-razorpay-plans.ts` with live keys
  - Update .env with live plan IDs

- [ ] **Test in Production**
  - Make actual payment with small amount (₹1)
  - Verify webhooks received
  - Check database updated
  - Test cancellation flow

- [ ] **Set Up Monitoring**
  - Configure error tracking (Sentry, LogRocket)
  - Set up webhook failure alerts
  - Monitor payment success rate

- [ ] **Legal Compliance**
  - Add Terms & Conditions
  - Add Refund Policy
  - Add Privacy Policy
  - GDPR compliance (if EU users)

- [ ] **Email Configuration**
  - Test all email templates
  - Verify email deliverability
  - Add unsubscribe links

- [ ] **Customer Support**
  - Set up support email
  - Create FAQ section
  - Train support team on subscription issues

---

## Comparison: Manual vs Automatic

| Aspect | Manual (Current) | Automatic (Razorpay Subscriptions) |
|--------|------------------|-------------------------------------|
| **User Experience** | Enter card every month | Enter card once, forget it |
| **Churn Rate** | Higher (friction) | Lower (seamless) |
| **Payment Success** | Depends on user action | Automatic with retries |
| **Implementation** | More control | Less control (Razorpay handles) |
| **Proration** | You handle | You handle (not automatic) |
| **Webhook Events** | Simple (payment.captured) | Many events (charged, halted, etc.) |
| **Cancellation** | Simple | Complex (Razorpay API) |
| **Trial Period** | You handle | Can use Razorpay or yours |
| **Refunds** | You handle | You handle |
| **PCI Compliance** | Razorpay handles | Razorpay handles |

---

## Key Takeaways

✅ **Razorpay Subscriptions = Automatic Recurring Payments**
- User pays once, Razorpay charges automatically forever
- No manual intervention each billing cycle

✅ **Two Main Components**
- **Plans:** Product templates (created once)
- **Subscriptions:** Customer purchases (created per user)

✅ **Authentication is Key**
- User must authenticate card/UPI (3D Secure/Mandate)
- Razorpay saves payment method securely
- Future charges don't need OTP

✅ **Webhooks are Critical**
- Real-time notifications of all subscription events
- Must verify webhook signature
- Must be idempotent (handle duplicates)

✅ **Status Lifecycle**
```
created → authenticated → active → (charged monthly) → active → ...
                                ↓ (payment fails)
                           past_due → halted/cancelled
```

✅ **Best Practices**
- Use test mode extensively before going live
- Implement proper error handling
- Send user-friendly emails at each stage
- Keep your database in sync with Razorpay
- Monitor webhook failures

---

**You're ready to implement Razorpay automatic recurring subscriptions!** 🚀

For questions or issues, refer to:
- [Razorpay Subscriptions Docs](https://razorpay.com/docs/payments/subscriptions/)
- [Razorpay API Reference](https://razorpay.com/docs/api/)
- [Razorpay Support](https://razorpay.com/support/)
