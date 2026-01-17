# 🔄 Razorpay Automatic Recurring Subscriptions - Part 1: Fundamentals

**Last Updated:** November 4, 2025  
**Documentation:** [Razorpay Subscriptions](https://razorpay.com/docs/payments/subscriptions/)

---

## 📚 Table of Contents

1. [What are Razorpay Subscriptions?](#what-are-razorpay-subscriptions)
2. [How It Works (High-Level)](#how-it-works-high-level)
3. [Key Concepts](#key-concepts)
4. [Architecture Overview](#architecture-overview)
5. [Complete Flow Diagrams](#complete-flow-diagrams)
6. [Plans vs Subscriptions](#plans-vs-subscriptions)
7. [Authentication Methods](#authentication-methods)
8. [Industry Standards](#industry-standards)

---

## What are Razorpay Subscriptions?

### Definition

**Razorpay Subscriptions** is a recurring payment system that allows you to **automatically charge customers** on a regular basis (daily, weekly, monthly, yearly) without requiring manual intervention each time.

### Key Features

✅ **Automatic Charging:** Razorpay automatically charges the customer's saved payment method  
✅ **No Manual Orders:** You don't create orders manually each billing cycle  
✅ **Built-in Retry Logic:** Razorpay retries failed payments automatically  
✅ **Webhook Notifications:** Get real-time updates on subscription events  
✅ **Customer Portal:** Customers can manage their subscriptions  
✅ **Plan Management:** Create multiple plans with different pricing  
✅ **Addons Support:** Charge one-time or recurring addons  
✅ **Trial Periods:** Offer free trials before charging  
✅ **Grace Periods:** Allow time for failed payments  

---

## How It Works (High-Level)

### The Simplest Explanation

```
Traditional Payments (What you're doing now):
┌─────────────────────────────────────────────────────────────┐
│ Every Month:                                                 │
│ 1. You create a new Razorpay Order                          │
│ 2. User enters card details AGAIN                           │
│ 3. User completes payment                                   │
│ 4. You activate subscription manually                       │
└─────────────────────────────────────────────────────────────┘

Razorpay Subscriptions (Automatic):
┌─────────────────────────────────────────────────────────────┐
│ First Time:                                                  │
│ 1. You create a Subscription (not Order)                    │
│ 2. User enters card details ONCE                            │
│ 3. User authorizes automatic charging                       │
│ 4. Payment method is SAVED by Razorpay                      │
│                                                              │
│ Every Month After:                                           │
│ 1. Razorpay AUTOMATICALLY charges the saved card            │
│ 2. You receive webhook notification                         │
│ 3. No user interaction needed!                              │
└─────────────────────────────────────────────────────────────┘
```

### Visual Flow

```
                    ┌──────────────────┐
                    │   MERCHANT       │
                    │   (You)          │
                    └────────┬─────────┘
                             │
                    1. Create Plan(s)
                    (One-time setup)
                             │
                             ↓
                    ┌──────────────────┐
                    │  RAZORPAY API    │
                    │  Plans stored    │
                    └────────┬─────────┘
                             │
                             ↓
┌────────────────────────────────────────────────────────────┐
│                    USER SUBSCRIBES                          │
└────────────────────────────────────────────────────────────┘
                             │
                    2. Create Subscription
                    (Links user to plan)
                             │
                             ↓
                    ┌──────────────────┐
                    │  RAZORPAY        │
                    │  Checkout Modal  │
                    └────────┬─────────┘
                             │
                    3. User Authenticates
                    (Card/UPI + OTP)
                             │
                             ↓
                    ┌──────────────────┐
                    │  PAYMENT METHOD  │
                    │  SAVED           │
                    └────────┬─────────┘
                             │
                             ↓
┌────────────────────────────────────────────────────────────┐
│              AUTOMATIC RECURRING CHARGES                    │
└────────────────────────────────────────────────────────────┘
                             │
        Every billing cycle (automatic):
                             │
                    ┌────────┴─────────┐
                    │                  │
            4. Razorpay charges    5. Webhook sent
            saved card             to your server
                    │                  │
                    └────────┬─────────┘
                             │
                             ↓
                    ┌──────────────────┐
                    │  YOUR SERVER     │
                    │  Updates DB      │
                    │  Extends access  │
                    └──────────────────┘
```

---

## Key Concepts

### 1. **Plan** (Product Definition)

A **Plan** is like a product template that defines:
- **Amount:** How much to charge (e.g., ₹3,500)
- **Period:** How often to charge (e.g., monthly)
- **Currency:** INR, USD, etc.
- **Description:** What the customer is buying

**Analogy:** Think of a Plan as a "menu item" at a restaurant. You define it once.

**Example Plans:**
```
Plan 1: "Basic Monthly"
├─ Amount: ₹3,500
├─ Period: Monthly (every 30 days)
├─ Currency: INR
└─ Description: "Basic plan with 100 products"

Plan 2: "Pro Yearly"
├─ Amount: ₹38,500
├─ Period: Yearly (every 365 days)
├─ Currency: INR
└─ Description: "Pro plan with unlimited products"
```

**Created via:** Razorpay API or Dashboard (one-time setup)

---

### 2. **Subscription** (Customer's Purchase)

A **Subscription** links a **specific customer** to a **specific plan**.

**Analogy:** When a customer "subscribes," you're saying: "Charge this customer according to that plan, automatically."

**Example:**
```
Subscription #1:
├─ Customer: varun@example.com
├─ Plan: "Basic Monthly" (₹3,500/month)
├─ Status: active
├─ Start Date: Jan 1, 2025
├─ Next Charge: Feb 1, 2025
└─ Payment Method: Card ending in 4242 (saved)
```

**Created via:** Your backend when user clicks "Subscribe"

---

### 3. **Authentication** (Saving Payment Method)

For automatic recurring charges to work, Razorpay needs **permission** to charge the card in the future.

**Methods:**

#### **Option A: Card/UPI with Authentication**
```
1. User enters card details
2. User completes OTP (3D Secure)
3. Bank authorizes recurring payments
4. Razorpay saves "token" for future charges
```

#### **Option B: UPI Autopay (Mandate)**
```
1. User enters UPI ID
2. User approves mandate in UPI app
3. Bank sets up recurring debit
4. Razorpay can charge automatically
```

#### **Option C: Emandate (Netbanking/Debit Card)**
```
1. User selects bank
2. User completes Emandate authorization
3. Bank creates mandate
4. Razorpay can charge automatically
```

**Key Point:** Once authenticated, Razorpay can charge **without user interaction** for future cycles.

---

### 4. **Subscription Lifecycle**

```
┌─────────────┐
│   CREATED   │ (Subscription created, not yet paid)
└──────┬──────┘
       │
       ↓ (First payment successful)
┌─────────────┐
│   ACTIVE    │ (Recurring charges happening)
└──────┬──────┘
       │
       ├──→ (Charge successful each cycle) → Stays ACTIVE
       │
       ├──→ (Charge fails) ──→ ┌─────────────┐
       │                        │   PAST_DUE  │ (Grace period)
       │                        └──────┬──────┘
       │                               │
       │                               ├→ (Retry succeeds) → ACTIVE
       │                               └→ (Retries fail) → HALTED
       │
       ├──→ (User cancels) ──→ ┌─────────────┐
       │                        │  CANCELLED  │ (Stopped)
       │                        └─────────────┘
       │
       └──→ (Completed) ──→ ┌─────────────┐
                            │  COMPLETED  │ (Reached max cycles)
                            └─────────────┘

Other States:
┌─────────────┐
│   PAUSED    │ (Manually paused by merchant)
└─────────────┘

┌─────────────┐
│   HALTED    │ (Payment failed, grace period over)
└─────────────┘

┌─────────────┐
│   EXPIRED   │ (Authentication expired)
└─────────────┘
```

---

### 5. **Webhooks** (Real-time Notifications)

Razorpay sends **HTTP POST requests** to your server when events happen:

**Key Events:**

| Event | Trigger | Your Action |
|-------|---------|-------------|
| `subscription.activated` | First payment successful | Grant access, update DB |
| `subscription.charged` | Recurring charge successful | Extend subscription period |
| `subscription.pending` | Charge initiated | Log, wait for confirmation |
| `subscription.halted` | Payment failed after retries | Revoke access, notify user |
| `subscription.cancelled` | User/merchant cancels | Update status, schedule end |
| `subscription.completed` | Subscription ended naturally | Archive subscription |
| `subscription.authenticated` | Payment method saved | Confirm authentication |
| `subscription.paused` | Paused by merchant | Suspend access |
| `subscription.resumed` | Resumed by merchant | Restore access |

**Webhook Format:**
```json
{
  "event": "subscription.charged",
  "payload": {
    "subscription": {
      "id": "sub_KLqwerty123456",
      "plan_id": "plan_ABC123",
      "customer_id": "cust_XYZ789",
      "status": "active",
      "current_start": 1704067200,
      "current_end": 1706745600,
      "charge_at": 1706745600,
      "total_count": 12,
      "paid_count": 3,
      "remaining_count": 9
    },
    "payment": {
      "id": "pay_MNOpqrs789",
      "amount": 350000,
      "currency": "INR",
      "status": "captured",
      "method": "card"
    }
  }
}
```

---

## Architecture Overview

### System Components

```
┌──────────────────────────────────────────────────────────────┐
│                     YOUR SYSTEM                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────┐              │
│  │          FRONTEND (Next.js)                │              │
│  │  • Pricing page                            │              │
│  │  • Razorpay Checkout integration           │              │
│  │  • Subscription status display             │              │
│  └────────────┬───────────────────────────────┘              │
│               │                                               │
│               ↓                                               │
│  ┌────────────────────────────────────────────┐              │
│  │          BACKEND (API Routes)              │              │
│  │  • Create Plans (one-time)                 │              │
│  │  • Create Subscriptions                    │              │
│  │  • Handle Webhooks                         │              │
│  │  • Manage subscription status              │              │
│  └────────────┬───────────────────────────────┘              │
│               │                                               │
│               ↓                                               │
│  ┌────────────────────────────────────────────┐              │
│  │          DATABASE (PostgreSQL)             │              │
│  │  • User records                            │              │
│  │  • Subscription records                    │              │
│  │  • Plan mappings                           │              │
│  │  • Payment history                         │              │
│  └────────────────────────────────────────────┘              │
│                                                               │
└───────────┬──────────────────────────────────────────────────┘
            │
            │ API Calls & Webhooks
            │
            ↓
┌──────────────────────────────────────────────────────────────┐
│                   RAZORPAY SYSTEM                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────┐              │
│  │          PLANS STORAGE                     │              │
│  │  • Your plans (pricing, period)            │              │
│  └────────────────────────────────────────────┘              │
│               ↓                                               │
│  ┌────────────────────────────────────────────┐              │
│  │          SUBSCRIPTIONS ENGINE              │              │
│  │  • Track active subscriptions              │              │
│  │  • Schedule recurring charges              │              │
│  │  • Retry failed payments                   │              │
│  └────────────────────────────────────────────┘              │
│               ↓                                               │
│  ┌────────────────────────────────────────────┐              │
│  │          PAYMENT METHODS                   │              │
│  │  • Saved card tokens                       │              │
│  │  • UPI autopay mandates                    │              │
│  │  • Bank mandates                           │              │
│  └────────────────────────────────────────────┘              │
│               ↓                                               │
│  ┌────────────────────────────────────────────┐              │
│  │          BILLING ENGINE                    │              │
│  │  • Automatic charging                      │              │
│  │  • Invoice generation                      │              │
│  │  • Retry logic                             │              │
│  └────────────────────────────────────────────┘              │
│                                                               │
└──────────────────────────────────────────────────────────────┘
            │
            ↓ Webhooks sent to your server
┌──────────────────────────────────────────────────────────────┐
│                   YOUR WEBHOOK HANDLER                        │
│  • Receives events (charged, halted, etc.)                   │
│  • Updates database                                           │
│  • Sends emails to users                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Complete Flow Diagrams

### 🔷 Flow 1: First-Time Subscription Creation

```
┌─────────────────────────────────────────────────────────────────┐
│                   STEP 1: SETUP (ONE-TIME)                      │
└─────────────────────────────────────────────────────────────────┘

Merchant Backend:
├─ POST https://api.razorpay.com/v1/plans
├─ Body:
│  {
│    "period": "monthly",
│    "interval": 1,
│    "item": {
│      "name": "Basic Monthly Plan",
│      "amount": 350000,  // ₹3,500 in paise
│      "currency": "INR",
│      "description": "Monthly subscription"
│    }
│  }
├─ Response:
│  {
│    "id": "plan_ABC123XYZ",
│    "entity": "plan",
│    "period": "monthly",
│    "interval": 1,
│    "item": { ... }
│  }
└─ Store plan_id in your database

┌─────────────────────────────────────────────────────────────────┐
│                   STEP 2: USER CLICKS SUBSCRIBE                 │
└─────────────────────────────────────────────────────────────────┘

Frontend (User action):
├─ User on /subscription/plans page
├─ Clicks "Subscribe to Monthly" button
└─ POST /api/subscription/create-razorpay-subscription

Backend (/api/subscription/create-razorpay-subscription):
├─ Get authenticated user (Clerk userId)
├─ Get user from database
├─ POST https://api.razorpay.com/v1/subscriptions
├─ Body:
│  {
│    "plan_id": "plan_ABC123XYZ",
│    "total_count": 12,  // Optional: 12 months, then stop
│    "quantity": 1,
│    "customer_notify": 1,  // Razorpay sends email
│    "start_at": 1704067200,  // Optional: Start immediately or future
│    "addons": [],  // Optional: One-time charges
│    "notes": {
│      "userId": "user_123",
│      "email": "varun@example.com"
│    }
│  }
├─ Response from Razorpay:
│  {
│    "id": "sub_KLMNopqrst123",
│    "entity": "subscription",
│    "plan_id": "plan_ABC123XYZ",
│    "status": "created",
│    "current_start": null,
│    "current_end": null,
│    "charge_at": 1704067200,
│    "short_url": "https://rzp.io/i/abc123"
│  }
├─ Save subscription to database:
│  {
│    "userId": "user_123",
│    "razorpaySubscriptionId": "sub_KLMNopqrst123",
│    "planId": "plan_ABC123XYZ",
│    "status": "created",
│    "currentPeriodStart": null,
│    "currentPeriodEnd": null
│  }
└─ Return to frontend:
   {
     "subscriptionId": "sub_KLMNopqrst123",
     "razorpayKeyId": "rzp_test_xxxxx"
   }

┌─────────────────────────────────────────────────────────────────┐
│                   STEP 3: RAZORPAY CHECKOUT                     │
└─────────────────────────────────────────────────────────────────┘

Frontend:
├─ Load Razorpay SDK
│  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
├─ Initialize checkout:
│  const options = {
│    key: "rzp_test_xxxxx",
│    subscription_id: "sub_KLMNopqrst123",
│    name: "ShopPulse",
│    description: "Monthly Subscription",
│    handler: function(response) {
│      // Payment successful
│      console.log(response.razorpay_payment_id);
│      console.log(response.razorpay_subscription_id);
│      console.log(response.razorpay_signature);
│      
│      // Verify on backend
│      fetch('/api/subscription/verify', {
│        method: 'POST',
│        body: JSON.stringify(response)
│      });
│    }
│  };
│  const rzp = new Razorpay(options);
│  rzp.open();
└─ Razorpay modal opens

┌─────────────────────────────────────────────────────────────────┐
│                   STEP 4: USER AUTHENTICATES                    │
└─────────────────────────────────────────────────────────────────┘

User in Razorpay Checkout:
├─ Enters card details (or UPI)
├─ Receives OTP from bank
├─ Enters OTP (3D Secure authentication)
├─ Bank authorizes recurring payments
└─ Payment method is SAVED by Razorpay

Razorpay:
├─ Charges first payment (₹3,500)
├─ Saves payment method token
├─ Updates subscription status: created → authenticated
└─ Sends webhook: subscription.authenticated

┌─────────────────────────────────────────────────────────────────┐
│                   STEP 5: WEBHOOK RECEIVED                      │
└─────────────────────────────────────────────────────────────────┘

Razorpay → Your Server:
├─ POST https://yourdomain.com/api/webhooks/razorpay
├─ Headers:
│  └─ x-razorpay-signature: <webhook_signature>
├─ Body:
│  {
│    "event": "subscription.authenticated",
│    "payload": {
│      "subscription": {
│        "id": "sub_KLMNopqrst123",
│        "status": "authenticated",
│        ...
│      },
│      "payment": {
│        "id": "pay_MNOpqrs789",
│        "amount": 350000,
│        "status": "captured"
│      }
│    }
│  }

Your Backend (/api/webhooks/razorpay):
├─ Verify webhook signature (CRITICAL!)
│  const expectedSignature = crypto
│    .createHmac('sha256', WEBHOOK_SECRET)
│    .update(JSON.stringify(req.body))
│    .digest('hex');
│  if (expectedSignature !== req.headers['x-razorpay-signature']) {
│    return res.status(400).send('Invalid signature');
│  }
├─ Extract event and payload
├─ Switch on event type:
│  case 'subscription.authenticated':
│    ├─ Find subscription in DB (by razorpaySubscriptionId)
│    ├─ Update status: created → authenticated
│    ├─ Store payment details
│    └─ Send confirmation email
│  case 'subscription.activated':
│    ├─ Update status: authenticated → active
│    ├─ Set currentPeriodStart and currentPeriodEnd
│    ├─ Grant user access to dashboard
│    └─ Send welcome email
└─ Return 200 OK

Database after activation:
{
  "userId": "user_123",
  "razorpaySubscriptionId": "sub_KLMNopqrst123",
  "status": "active",
  "currentPeriodStart": "2025-01-01T00:00:00Z",
  "currentPeriodEnd": "2025-02-01T00:00:00Z",
  "nextChargeAt": "2025-02-01T00:00:00Z"
}
```

---

### 🔷 Flow 2: Automatic Recurring Charge (Month 2)

```
┌─────────────────────────────────────────────────────────────────┐
│              NO USER ACTION REQUIRED!                            │
└─────────────────────────────────────────────────────────────────┘

Date: Feb 1, 2025 (30 days after first payment)

Razorpay (Automatic):
├─ Billing engine checks subscriptions due today
├─ Finds subscription "sub_KLMNopqrst123"
│  └─ Status: active
│  └─ Next charge: Feb 1, 2025
├─ Retrieves saved payment method token
├─ Initiates charge (₹3,500)
│  └─ No OTP required (already authenticated!)
├─ Two possible outcomes:
│  ├─ SUCCESS → Payment captured
│  └─ FAILURE → Card declined / insufficient funds

┌─────────────────────────────────────────────────────────────────┐
│                   OUTCOME A: SUCCESS                            │
└─────────────────────────────────────────────────────────────────┘

Razorpay:
├─ Payment captured: ₹3,500
├─ Updates subscription:
│  ├─ paid_count: 1 → 2
│  ├─ current_start: 2025-02-01
│  ├─ current_end: 2025-03-01
│  └─ charge_at: 2025-03-01
└─ Sends webhook: subscription.charged

Webhook to Your Server:
├─ POST /api/webhooks/razorpay
├─ Body:
│  {
│    "event": "subscription.charged",
│    "payload": {
│      "subscription": {
│        "id": "sub_KLMNopqrst123",
│        "status": "active",
│        "current_start": 1706745600,
│        "current_end": 1709337600,
│        "paid_count": 2
│      },
│      "payment": {
│        "id": "pay_NewPayment123",
│        "amount": 350000,
│        "status": "captured"
│      }
│    }
│  }

Your Backend:
├─ Verify signature
├─ Find subscription in DB
├─ Update:
│  ├─ currentPeriodStart: 2025-02-01
│  ├─ currentPeriodEnd: 2025-03-01
│  ├─ nextChargeAt: 2025-03-01
│  └─ paidCount: 2
├─ Create payment record (for history)
├─ User continues to have access
└─ Send payment receipt email

User Experience:
├─ Never sees checkout modal
├─ Never enters card details
├─ Receives email: "Your subscription has been renewed"
└─ Continues using dashboard seamlessly

┌─────────────────────────────────────────────────────────────────┐
│                   OUTCOME B: FAILURE                            │
└─────────────────────────────────────────────────────────────────┘

Razorpay:
├─ Payment failed (card declined)
├─ Updates subscription status: active → past_due
├─ Starts retry logic:
│  ├─ Retry 1: In 3 days
│  ├─ Retry 2: In 7 days
│  ├─ Retry 3: In 14 days
│  └─ After 3 failed retries → halted
└─ Sends webhook: subscription.pending

Webhook to Your Server (first failure):
├─ event: "subscription.pending"
├─ Your action:
│  ├─ Update status: active → past_due
│  ├─ Keep user access (grace period)
│  ├─ Show warning banner
│  └─ Send email: "Payment failed, will retry"

If retries succeed:
├─ Webhook: subscription.charged
└─ Back to normal (Outcome A)

If all retries fail:
├─ Webhook: subscription.halted
├─ Your action:
│  ├─ Update status: past_due → halted
│  ├─ Revoke dashboard access
│  ├─ Send email: "Subscription suspended"
│  └─ Show reactivation CTA
```

---

## Plans vs Subscriptions

### Key Differences

| Aspect | Plan | Subscription |
|--------|------|--------------|
| **What is it?** | Product template | Customer's purchase |
| **Created when?** | Once (setup) | Every time user subscribes |
| **How many?** | Few (2-5 plans) | Many (one per customer) |
| **Contains** | Pricing, period | Customer link, status, dates |
| **Stored where?** | Razorpay only | Razorpay + Your DB |
| **Example** | "Monthly Plan - ₹3,500" | "User123 subscribed to Monthly" |

### Creating Plans

**When to create:**
- During initial setup
- When launching new pricing tiers
- When changing pricing (create new plan, don't edit)

**Best Practice:**
```typescript
// Create plans ONCE via script or Razorpay Dashboard
// DO NOT create plans every time user subscribes!

// ❌ WRONG (creating plan each time)
async function subscribe(userId: string) {
  const plan = await razorpay.plans.create({...}); // SLOW, WRONG
  const subscription = await razorpay.subscriptions.create({
    plan_id: plan.id
  });
}

// ✅ CORRECT (reuse existing plans)
const PLAN_IDS = {
  MONTHLY: "plan_ABC123",  // Created once, stored in env
  YEARLY: "plan_XYZ789"
};

async function subscribe(userId: string, planType: 'MONTHLY' | 'YEARLY') {
  const subscription = await razorpay.subscriptions.create({
    plan_id: PLAN_IDS[planType]  // Reuse existing plan
  });
}
```

---

## Authentication Methods

### Method Comparison

| Method | User Experience | Recurring Support | Best For |
|--------|-----------------|-------------------|----------|
| **Cards** | Card + OTP once | ✅ Yes | Most users |
| **UPI Autopay** | UPI ID + mandate approval | ✅ Yes | UPI users |
| **Emandate** | Bank login + mandate | ✅ Yes | High-value subscriptions |
| **Netbanking** | One-time only | ❌ No | Not for subscriptions |
| **Wallets** | One-time only | ❌ No | Not for subscriptions |

### Card Authentication (Most Common)

```
User Flow:
1. Enters card number, expiry, CVV
2. Receives OTP from bank (3D Secure)
3. Enters OTP
4. Bank authorizes recurring payments
5. Razorpay stores encrypted card token

Technical:
├─ Authentication type: 3D Secure (3DS)
├─ Token stored: Securely by Razorpay
├─ Future charges: No OTP needed
└─ Validity: Until card expires or user revokes
```

### UPI Autopay (Mandates)

```
User Flow:
1. Enters UPI ID (e.g., varun@paytm)
2. Receives notification in UPI app
3. Approves recurring mandate
4. Sets debit limit (optional)
5. Razorpay can charge automatically

Technical:
├─ Mandate ID stored by Razorpay
├─ Max amount per cycle: Set by user
├─ Future charges: Direct debit from bank
└─ Validity: User-defined or until revoked
```

---

## Industry Standards

### 1. **Grace Periods**

**Standard:** 7-14 days after payment failure

```
Day 0: Payment fails → Status: past_due
Day 3: Retry attempt 1
Day 7: Retry attempt 2
Day 14: Retry attempt 3 → If fail, status: halted
```

**Your Implementation:**
- Let Razorpay handle retries (automatic)
- Keep user access during grace period (optional)
- Send reminder emails on each retry

---

### 2. **Retry Logic**

**Razorpay Default:**
- 3 retry attempts
- Exponential backoff (3, 7, 14 days)

**Best Practice:**
- Let Razorpay handle retries
- Don't implement custom retry (duplicate charges risk)
- Monitor via webhooks

---

### 3. **Cancellation Policies**

**Immediate Cancellation:**
```
User cancels → Access revoked immediately
No refund for unused days
```

**End-of-Period Cancellation:** (Recommended)
```
User cancels → cancelAtPeriodEnd = true
Access continues until current period ends
No future charges
```

**Implementation:**
```typescript
// Cancel subscription
await razorpay.subscriptions.cancel(subscriptionId);
// Status: active → cancelled (immediate)

// OR schedule cancellation
await razorpay.subscriptions.update(subscriptionId, {
  cancel_at_cycle_end: 1
});
// Status stays active, no future charges
```

---

### 4. **Trial Periods**

**Option 1: Built-in Razorpay Trial**
```javascript
await razorpay.subscriptions.create({
  plan_id: "plan_ABC123",
  total_count: 12,
  customer_notify: 1,
  addons: [{
    item: {
      name: "7-day trial",
      amount: 0,  // Free
      currency: "INR"
    }
  }],
  start_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)  // Start after 7 days
});
```

**Option 2: Manual Trial (Your Current)**
```
Keep your current trial system
After trial expires → Create Razorpay subscription
Simpler, more control
```

**Recommendation:** Stick with Option 2 (your current system) for simplicity.

---

### 5. **Proration**

Razorpay doesn't handle proration automatically. You must:

**Plan Upgrade:**
```
1. Calculate unused time credit
2. Create addon charge for upgrade
3. Update subscription plan
```

**Plan Downgrade:**
```
1. Schedule plan change at period end
2. Don't charge immediately
```

**Example Code:**
```typescript
// Upgrade: Charge difference immediately
const unusedCredit = calculateProration(currentPlan, daysLeft);
await razorpay.addons.create({
  subscription_id: subscriptionId,
  item: {
    name: "Upgrade charge",
    amount: (newPlanPrice - unusedCredit) * 100,
    currency: "INR"
  }
});

// Then update plan
await razorpay.subscriptions.update(subscriptionId, {
  plan_id: newPlanId
});
```

---

## Summary Part 1

✅ **What we covered:**
- Razorpay Subscriptions overview
- How automatic recurring works
- Key concepts (Plans, Subscriptions, Authentication)
- Complete flow diagrams
- Industry standards

**Next: Part 2 covers:**
- Complete API reference
- Step-by-step integration code
- Webhook handling in detail
- Database schema
- Error handling
- Testing strategies
- Production checklist

---

**Continue to:** [Part 2: Implementation Guide](./RAZORPAY_SUBSCRIPTIONS_PART_2_IMPLEMENTATION.md)
