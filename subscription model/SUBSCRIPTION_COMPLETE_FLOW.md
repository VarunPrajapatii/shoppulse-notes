# 🔄 Subscription System - Complete Flow Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [User Lifecycle States](#user-lifecycle-states)
3. [Detailed Flow Scenarios](#detailed-flow-scenarios)
4. [Edge Cases & Solutions](#edge-cases--solutions)
5. [Cron Jobs & Automation](#cron-jobs--automation)
6. [Access Control Logic](#access-control-logic)
7. [Payment Flow](#payment-flow)
8. [Error Handling](#error-handling)

---

## System Overview

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: Fully implemented
> - 📝 **REALITY CHECK**: Architecture diagram is accurate. We use Next.js API Routes, Clerk + Razorpay webhooks, PostgreSQL via Prisma, Vercel Cron. Notification service uses Resend (email) + Fast2SMS (SMS) — 17+ SMS/email template pairs in `templates.ts`. Usage tracking via UsageCumulative, UsageOrders, UsageApiCalls, UsageHistory tables. "Email Service" in diagram understates reality — we have both email AND SMS channels. 10 subscription API routes, 9 webhook handlers exist.
> - 🎯 **ACTION**: Keep — update "Email Service" to "Resend (Email) + Fast2SMS (SMS)" in External Services box
> - 💡 **INDUSTRY**: Standard SaaS architecture (Stripe/Razorpay + auth provider + relational DB). Shopify, Chargebee use similar layers.

### Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                          │
│  (Landing Page → Clerk Auth → Dashboard → Subscription)     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│  • Next.js API Routes                                        │
│  • Middleware (Access Control)                               │
│  • Webhook Handlers (Clerk + Razorpay)                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                       │
│  • Subscription Manager                                      │
│  • Payment Processor                                         │
│  • Usage Tracker                                             │
│  • Notification Service                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                 │
│  • PostgreSQL (via Prisma)                                   │
│  • Models: User, Subscription, Payment, etc.                 │
└─────────────────────────────────────────────────────────────┘
                 
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
│  • Clerk (Authentication)                                    │
│  • Razorpay (Payments)                                       │
│  • Email Service (Notifications)                             │
│  • Cron Jobs (Vercel Cron / Node-cron)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## User Lifecycle States

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially accurate
> - 📝 **REALITY CHECK**: Actual status enum: ACTIVE, **COMPLETING**, EXPIRED, PAST_DUE, CANCELED, PAUSED — NO TRIALING status. Trial is ACTIVE + `trialUsed=false` on User model (correctly shown in diagram). However: (1) **COMPLETING** status is entirely missing from this diagram, (2) "RENEWAL ATTEMPT" is NOT a real DB status — Razorpay handles auto-charge; we react via webhooks (subscription.charged/halted/pending), (3) Retry logic (Day 2/4/5) is Razorpay's responsibility, NOT our crons, (4) Cancel flow shows Option A/B but code ALWAYS sets status=CANCELED immediately (cancelAtPeriodEnd flag controls access duration), (5) **HalfYearly** billing cycle (₹19,000/6mo) missing — we have 3 paid plans not 2, (6) BillingCycle enum: MONTHLY, HALFYEARLY, YEARLY.
> - 🎯 **ACTION**: Update — add COMPLETING state, remove RENEWAL ATTEMPT pseudo-state, note Razorpay handles retries, add HalfYearly, fix cancel to always show CANCELED immediately
> - 💡 **INDUSTRY**: Stripe uses `incomplete`, `past_due`, `canceled`, `trialing`, `active`. Our COMPLETING maps to Stripe's natural subscription end. Using a flag instead of TRIALING status is simpler but non-standard.

### State Diagram

```
┌──────────────┐
│  NEW USER    │ (Signs up via Clerk)
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│  ACTIVE                                            │
│  • 7-day free trial                                  │
│  • Full access to all features                       │
│  • status: ACTIVE                                    │
│  • trialUsed: false                                  │
│  • currentPeriodEnd: now + 7 days                    │
└──────┬──────────────────────────┬────────────────────┘
       │                          │
       │ User Subscribes          │ Trial Expires (No Payment)
       │ Before Trial Ends        │
       ↓                          ↓
┌──────────────────┐      ┌──────────────────┐
│  ACTIVE          │      │  EXPIRED         │
│  • Paid          │      │  • No access     │
│  •trialUsed: true│      │  •trialUsed: true│
│  • status: ACTIVE│      │  • Show paywall  │
└──────┬───────────┘      └──────────────────┘
       │                          │
       │                          │ User Pays
       │                          ↓
       │                  ┌──────────────────┐
       │                  │  ACTIVE          │
       │                  │  (Reactivated)   │
       │                  └──────┬───────────┘
       │                         │
       │ ←───────────────────────┘
       │
       │ Period Ends & Auto-Renew Enabled
       ↓
┌──────────────────┐
│  RENEWAL         │ (Payment attempt)
│  ATTEMPT         │
└──────┬───────────┘
       │
       ├──→ Payment Success ──→ ACTIVE (new period)
       │
       └──→ Payment Failed ──→ PAST_DUE
                                    │
                                    ├──→ Retry 1 (Day 2)
                                    ├──→ Retry 2 (Day 4)
                                    └──→ Retry 3 (Day 5) → EXPIRED

┌──────────────────┐
│  USER CANCELS    │
└──────┬───────────┘
       │
       ├──→ Cancel Immediately → CANCELED (access revoked)
       │
       └──→ Cancel at Period End → CANCELED (access until period end)
                                      ↓
                                   (Period ends) → EXPIRED

┌──────────────────┐
│  ADMIN ACTIONS   │
└──────┬───────────┘
       │
       ├──→ Pause Subscription → PAUSED (manual)
       │
       └──→ Resume Subscription → ACTIVE
```

---

## Detailed Flow Scenarios

### 🔷 Scenario 1: New User Signup

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: Implemented (documented elsewhere)
> - 📝 **REALITY CHECK**: Signup flow is handled by Clerk auth → post-auth route → User creation with `trialUsed=false`, `isActive=true`. Subscription created with status=ACTIVE, plan=Trial (₹0, 7 days). This section is a placeholder heading — full details are in the onboarding/auth flow docs.
> - 🎯 **ACTION**: Keep as-is or link to auth flow documentation

---

### 🔷 Scenario 2: Trial Expires (User Doesn't Subscribe) 
(TRIAL implementation is just like other plans, and its expiry will be handled just like other plans expires)

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially accurate
> - 📝 **REALITY CHECK**: (1) Cron name is WRONG — doc says `/api/cron/check-trials`, actual is **`/api/cron/expire-trials-detect-payment-failure`**. (2) Schedule is `0 2 * * *` (02:00 UTC), not 00:00 IST. (3) This cron does TWO things: expires trials AND detects payment failures (ACTIVE past period = PAST_DUE). (4) Trial query logic matches: finds subscriptions where status=ACTIVE, currentPeriodEnd < now, user.trialUsed=false. (5) The cron sets subscription status=EXPIRED, user.trialUsed=true, user.isActive=false, and invalidates store cache. (6) Notifications: sends trialExpiredSMS + trialExpiredEmail (implemented). (7) Access check via `User.isActive` flag in layout components, NOT middleware.
> - 🎯 **ACTION**: Update — fix cron name to `expire-trials-detect-payment-failure`, fix schedule, note dual purpose (trial + payment failure detection)
> - 💡 **INDUSTRY**: Stripe auto-expires trials; Chargebee sends dunning emails. Our approach of daily cron detection is simpler but has up to 24hr delay.

**Trigger:** Cron job runs daily at 00:00 IST

**Flow:**

```
Step 1: Cron Job - Check Expired Trials (/api/cron/check-trials)
├─ Query database:
│  └─ Find Subscriptions where:
│      • trialUsed = false AND currentPeriodEnd < now() (and day 8 started, day 7 ended)
├─ For each expired trial subscription:
│  ├─ Update User
│  │  ├─ isActive: false
│  │  └─ trialUsed: true
│  ├─ Update Subscription
│  │  ├─ status: EXPIRED
│  │  └─ autoRenew: false
│  ├─ Create SubscriptionHistory record
│  │  ├─ action: EXPIRED
│  │  ├─ fromStatus: ACTIVE
│  │  ├─ toStatus: EXPIRED
│  │  └─ reason: "Trial period ended"
│  ├─ Send Email ( note: will implement later)
│  │  ├─ Subject: "Your ShopPulse trial has ended"
│  │  └─ Body: CTA to subscribe, plan details
│  └─ Log event
└─ Return summary (X trials expired)

Step 2: User Tries to Access Dashboard
├─ User navigates to dashboard app
├─ Middleware/dashboard layout checks user isActive?
│  └─ status: isActive -> false , then access denied
├─ Redirect to /subscription/my-plan (protected, need to signin to access)
│  └─ Show paywall:
│      ├─ "Your ${currentPlanName} has ended"
│      ├─ Button to go to plans (/subscription/plans)
│      └─ "Subscribe to Continue" buttons
└─ All dashboard routes will go through middleware and  return 403

Step 3: User Clicks "Subscribe Now"
├─ Proceed to Scenario 3 (Subscription Payment)
```

---

### 🔷 Scenario 3: User Subscribes (During Trial or After Expiry)

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially accurate
> - 📝 **REALITY CHECK**: (1) Core flow is correct: create Razorpay subscription → checkout → verify → webhook confirms. (2) **`canChangeWindow` fields do NOT exist in Prisma schema** — this was a design idea never implemented. Plan changes are handled via upgrade/downgrade routes with Razorpay's UPDATE API. (3) BillingCycle correctly mentions MONTHLY/HALFYEARLY/YEARLY here — good. (4) `nextBillingDate` field doesn't exist in schema — Razorpay manages billing dates. (5) Verify route (`/api/subscription/verify`) does signature verification and minimal DB update; the `subscription.authenticated` webhook handles full activation. (6) Polling endpoint is `/api/subscription/current`, not `/api/subscription/status`. (7) The frontend callback → verify → poll → webhook confirmation flow is architecturally correct.
> - 🎯 **ACTION**: Update — remove `canChangeWindow` references, remove `nextBillingDate`, fix polling endpoint name, note that webhook (subscription.authenticated) is the primary activation path
> - 💡 **INDUSTRY**: This is the standard Razorpay Subscription flow. Stripe Checkout uses a similar pattern with payment_intent.succeeded webhooks.

**Flow:**

```
├─ User clicks "Subscribe to Monthly" button

Step 2: Create Razorpay Order (/api/subscription/create)

Step 3: Frontend - Open Razorpay Checkout
├─ Load Razorpay SDK

Step 4: User Completes Payment
├─ Razorpay processes payment
└─ Two parallel flows:
    ├─ Flow A: Frontend callback (immediate)
    └─ Flow B: Webhook (reliable)

Step 5A: Frontend Callback (Immediate Feedback)
├─ Razorpay calls handler function
├─ Receive:
│  ├─ razorpay_order_id
│  ├─ razorpay_payment_id
│  └─ razorpay_signature
├─ POST /api/subscription/verify
│  ├─ Verify signature
├─ Update Payment record
│  ├─ status: PENDING → PROCESSING
│  └─ updatedAt: now()
├─ Show loading state
│  └─ "Processing your payment..."
└─ Poll /api/subscription/status until complete

Step 5B: Razorpay Webhook (Reliable)
├─ Update Payment record
│  ├─ status: PROCESSING → SUCCESS
│  ├─ paidAt: now()
│  ├─ paymentMethod: from razorpay (e.g., "card")
│  └─ cardLast4: from razorpay (if card)
├─ Get or Update Subscription
│  ├─ subscription
│  │  └─ Find by userId
│  ├─ If EXPIRED user resubscribing:
│  │  ├─ Update existing subscription
│  │  ├─ planId: new plan ID
│  │  ├─ status: EXPIRED/CANCELED → ACTIVE
│  │  ├─ billingCycle: from plan (MONTHLY/HALFYEARLY/YEARLY)
│  │  ├─ currentPeriodStart: now()
│  │  ├─ currentPeriodEnd: currentPeriodEnd + billing period
│  │  │  └─ Monthly: +30 days, half Yearly: +180 days, Yearly: +365 days
│  │  ├─ autoRenew: true
│  │  ├─ cancelAtPeriodEnd: false
│  │  ├─ canChangeWindow: for monthly currentPeriodEnd - 7 days
│  │  ├─ canChangeWindow: for halfyearly currentPeriodEnd - 14 days
│  │  ├─ canChangeWindow: for yearly currentPeriodEnd - 28 days
│  │  └─ nextBillingDate: currentPeriodEnd - 3 days
│  └─ If active (trial user, or if canChangeWindow < now() then the user can change plan):
│     ├─ get Subscription from userid
│     ├─ userId: User.id
│     ├─ planId: selected plan ID
│     ├─ status: ACTIVE
│     ├─ billingCycle: MONTHLY or YEARLY, user can upgrade or downgrade plan
│     ├─ currentPeriodStart: now()
│     ├─ currentPeriodEnd: now() + period
│     ├─ autoRenew: true
│     └─ nextBillingDate: currentPeriodEnd - 3 days
├─ Update Payment record
│  └─ subscriptionId: Subscription.id
├─ Create SubscriptionHistory record
│  ├─ action: UPGRADED / REACTIVATED
│  ├─ fromStatus: ACTIVE (trial period) / EXPIRED
│  ├─ toStatus: ACTIVE
│  └─ reason: "Payment successful"
├─ Send Confirmation Email
│  ├─ Subject: "Payment Successful! Welcome to ShopPulse"
│  ├─ Body:
│  │  ├─ Payment details (amount, date)
│  │  ├─ Subscription details (plan, next billing)
│  │  └─ Invoice link (if generated)
│  └─ Attachments: Invoice PDF (optional)
└─ Return 200 OK to Razorpay

Step 6: User Redirected to Dashboard
├─ Polling detects status: SUCCESS
├─ Show success message
│  └─ "Payment successful! Your subscription is now active."
├─ Redirect to /dashboard
├─ Middleware checks subscription
│  └─ status: ACTIVE → Allow access
└─ Remove trial banner, show subscription details
```

**Database State After:**
```
User:
  (no changes)

Subscription:
  status: ACTIVE/EXPIRED → ACTIVE
  planId: "monthly-plan-id"
  billingCycle: MONTHLY
  currentPeriodStart: 2025-01-08T10:30:00Z
  currentPeriodEnd: 2025-02-08T10:30:00Z
  nextBillingDate: 2025-02-05T10:30:00Z
  autoRenew: true

Payment:
  status: PENDING → PROCESSING → SUCCESS
  razorpayOrderId: "order_xyz123"
  razorpayPaymentId: "pay_xyz123"
  razorpaySignature: "abc...xyz"
  amountPaid: 3500.00
  paidAt: 2025-01-08T10:30:00Z

SubscriptionHistory:
  action: CREATED
  toStatus: ACTIVE
  reason: "Payment successful"
```

---

### 🔷 Scenario 4: Subscription Renewal (Auto-Renewal)

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Mostly NOT implemented as described — Razorpay handles renewals automatically
> - 📝 **REALITY CHECK**: This entire scenario describes MANUAL renewal processing that **does not exist**. (1) **`/api/cron/check-renewals` does NOT exist** — no renewal reminder cron. (2) **`/api/cron/process-renewals` does NOT exist** — Razorpay auto-charges recurring subscriptions. (3) **`/api/cron/expire-past-due` does NOT exist** as named — the actual cron is `expire-period-ended-subscriptions` (0 3 * * *) which handles COMPLETING/CANCELED → EXPIRED. (4) Payment failure detection is done by `expire-trials-detect-payment-failure` cron: if ACTIVE subscription's currentPeriodEnd has passed, it's set to PAST_DUE. (5) Razorpay handles retries via pending→halted webhooks. After all retries fail, subscription.halted fires and we block access. (6) The Day 3/Day 7/Day 14 retry email pattern is NOT implemented — Razorpay sends its own payment retry notifications. (7) "Manual billing" path doesn't exist — all subscriptions use Razorpay auto-charge.
> - ❓ **WHY NOT**: Razorpay Subscriptions API handles the entire auto-renewal lifecycle (charge attempt → retry → halt). Building manual renewal crons would duplicate this and risk double-charging.
> - 🎯 **ACTION**: **Rewrite entirely** — document the ACTUAL flow: Razorpay auto-charges → subscription.charged webhook (success) OR subscription.pending → subscription.halted webhooks (failure) → our cron detects ACTIVE past period = PAST_DUE → expire-period-ended-subscriptions handles final expiry
> - 💡 **INDUSTRY**: Stripe also handles auto-renewals; apps react via invoice.paid/invoice.payment_failed webhooks. Manual renewal processing is an anti-pattern with subscription payment gateways.

```
Step 1: Cron Job - Check Upcoming Renewals (/api/cron/check-renewals)
├─ Query database:
│  └─ Find Subscriptions where:
│      • status = ACTIVE
│      • autoRenew = true
│      • nextBillingDate <= today + 3 days (advance notice)
│      • currentPeriodEnd within next 7 days
├─ For each subscription due for renewal:
│  ├─ Send Reminder Email (3 days before)
│  │  ├─ Subject: "Your ShopPulse subscription renews in 3 days"
│  │  └─ Body: Renewal date, amount, cancel instructions
│  └─ Log reminder sent
└─ Return summary

Step 2: Renewal Day (currentPeriodEnd reached)
├─ Cron job: /api/cron/process-renewals
├─ Query database:
│  └─ Find Subscriptions where:
│      • status = ACTIVE
│      • autoRenew = true
│      • currentPeriodEnd <= now()
├─ For each subscription:
│  ├─ Get User and Plan details
│  ├─ Check if Razorpay subscription exists
│  │  ├─ If razorpaySubscriptionId exists:
│  │  │  └─ Razorpay auto-charges (handle via webhook)
│  │  └─ If manual billing:
│  │     └─ Create new Razorpay Order (below)
│  ├─ Calculate amount
│  │  └─ amount = plan.price * 100 (paise)
│  ├─ Create Payment record (PENDING)
│  │  ├─ userId: subscription.userId
│  │  ├─ subscriptionId: subscription.id
│  │  ├─ subtotal: plan.price
│  │  ├─ amountPaid: plan.price
│  │  ├─ status: PENDING
│  │  └─ description: "Renewal - Feb 2025"
│  ├─ Create Razorpay Order
│  │  └─ Same as Scenario 3, Step 2
│  ├─ Update Payment with razorpayOrderId
│  ├─ Send Payment Link Email
│  │  ├─ Subject: "Action Required: Renew your subscription"
│  │  ├─ Body:
│  │  │  ├─ Subscription expired
│  │  │  ├─ Payment link (Razorpay checkout)
│  │  │  ├─ Amount: ₹3,500
│  │  │  └─ Valid for: 14 days
│  │  └─ CTA: "Pay Now" button → Razorpay page
│  └─ Update Subscription
│     ├─ status: ACTIVE → PAST_DUE
│     └─ updatedAt: now()
└─ Return summary

Step 3A: User Pays (Success Path)
├─ User clicks "Pay Now" in email
├─ Completes Razorpay payment
├─ Webhook: payment.captured
│  └─ Follow Scenario 3, Step 5B
├─ Update Subscription
│  ├─ status: PAST_DUE → ACTIVE
│  ├─ currentPeriodStart: old currentPeriodEnd
│  ├─ currentPeriodEnd: currentPeriodStart + billing period
│  └─ nextBillingDate: currentPeriodEnd - 3 days
├─ Create SubscriptionHistory
│  ├─ action: RENEWED
│  ├─ fromStatus: PAST_DUE
│  ├─ toStatus: ACTIVE
│  └─ reason: "Renewal payment successful"
└─ Send Confirmation Email
   └─ "Your subscription has been renewed"

Step 3B: User Doesn't Pay (Failure Path)
├─ Day 0: Status changes to PAST_DUE (email sent)
├─ Day 3: Retry Email #1
│  ├─ Subject: "Urgent: Your subscription payment failed"
│  └─ Body: Retry payment link, consequences
├─ Day 7: Retry Email #2
│  ├─ Subject: "Final Notice: Subscription expires in 7 days"
│  └─ Body: Last chance to retain access
├─ Day 14: Expiration
│  ├─ Cron job: /api/cron/expire-past-due
│  ├─ Query:
│  │  └─ Subscriptions where:
│  │      • status = PAST_DUE
│  │      • currentPeriodEnd + 14 days < now()
│  ├─ Update Subscription
│  │  ├─ status: PAST_DUE → EXPIRED
│  │  ├─ autoRenew: false
│  │  └─ updatedAt: now()
│  ├─ Update Payment (if still PENDING)
│  │  ├─ status: PENDING → FAILED
│  │  └─ failureReason: "Payment not completed within grace period"
│  ├─ Create SubscriptionHistory
│  │  ├─ action: EXPIRED
│  │  ├─ fromStatus: PAST_DUE
│  │  ├─ toStatus: EXPIRED
│  │  └─ reason: "Payment not received after grace period"
│  └─ Send Final Email
│     ├─ Subject: "Your ShopPulse subscription has expired"
│     └─ Body: Resubscribe link, data retention policy
└─ User loses dashboard access
```

**Database States:**

**Successful Renewal:**
```
Subscription:
  status: ACTIVE (unchanged)
  currentPeriodStart: 2025-02-08T00:00:00Z
  currentPeriodEnd: 2025-03-08T00:00:00Z (extended)
  nextBillingDate: 2025-03-05T00:00:00Z

Payment:
  (new record created for renewal)
  status: SUCCESS
  paidAt: 2025-02-08T10:00:00Z
```

**Failed Renewal:**
```
Subscription:
  status: ACTIVE → PAST_DUE → EXPIRED
  currentPeriodEnd: 2025-02-08T00:00:00Z (not extended)

Payment:
  status: PENDING → FAILED
  failureReason: "Not completed within grace period"
```

---

### 🔷 Scenario 5: User Cancels Subscription

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially accurate — both options exist in code but behavior differs from doc
> - 📝 **REALITY CHECK**: (1) The cancel route (`/api/subscription/cancel`) supports BOTH `immediate=true` and `immediate=false` via request body. (2) **CRITICAL DIFFERENCE**: In BOTH paths, Razorpay subscription is cancelled immediately (`razorpayInstance.subscriptions.cancel()`), and DB status is set to **CANCELED immediately**. The doc's Option B incorrectly claims `status: ACTIVE (no change yet)` — actual code sets status=CANCELED with `cancelAtPeriodEnd=true`. (3) **`/api/cron/finalize-cancellations` does NOT exist** — the `expire-period-ended-subscriptions` cron (0 3 * * *) transitions CANCELED → EXPIRED when currentPeriodEnd passes. (4) Cancellation reason and SubscriptionHistory creation matches code. (5) The "Undo cancellation" feature is not implemented — once cancelled on Razorpay, user must re-subscribe.
> - 🎯 **ACTION**: Update — fix Option B to show status=CANCELED immediately, rename finalize-cancellations to expire-period-ended-subscriptions, remove "undo" references
> - 💡 **INDUSTRY**: Stripe keeps status `active` with `cancel_at_period_end=true` until period end. Our approach of immediately setting CANCELED is simpler but non-standard.

**Trigger:** User clicks "Cancel Subscription" in /account/subscription

**Flow:**

```
Step 1: User Initiates Cancellation
├─ Navigate to /account/subscription
├─ Click "Cancel Subscription" button
├─ Show confirmation modal:
│  ├─ "Are you sure you want to cancel?"
│  ├─ Options:
│  │  ├─ [ ] Cancel immediately (lose access now)
│  │  └─ [✓] Cancel at period end (keep access until Feb 8)
│  └─ Optional: Cancellation reason (dropdown)
│     ├─ "Too expensive"
│     ├─ "Not using enough"
│     ├─ "Missing features"
│     └─ "Other" (text input)
└─ Click "Confirm Cancellation"

Step 2: Process Cancellation (/api/subscription/cancel)
├─ Get Subscription from database
├─ Verify subscription belongs to user
├─ Check current status
│  ├─ If EXPIRED/CANCELED → Return error "Already canceled"
│  └─ If ACTIVE/ACTIVE → Proceed
├─ Check cancellation type (from request)
│  ├─ Option A: Cancel Immediately
│  │  ├─ Update Subscription
│  │  │  ├─ status: ACTIVE → CANCELED
│  │  │  ├─ canceledAt: now()
│  │  │  ├─ cancelAtPeriodEnd: false
│  │  │  ├─ cancellationReason: from form
│  │  │  ├─ autoRenew: false
│  │  │  └─ currentPeriodEnd: now() (immediate)
│  │  ├─ Create SubscriptionHistory
│  │  │  ├─ action: CANCELED
│  │  │  ├─ fromStatus: ACTIVE
│  │  │  ├─ toStatus: CANCELED
│  │  │  └─ reason: user's cancellation reason
│  │  └─ Send Email
│  │     ├─ Subject: "Your subscription has been canceled"
│  │     └─ Body:
│  │        ├─ Cancellation confirmed
│  │        ├─ Access ends: Immediately
│  │        ├─ Resubscribe link
│  │        └─ Feedback request
│  └─ Option B: Cancel at Period End (Recommended)
│     ├─ Update Subscription
│     │  ├─ status: ACTIVE (no change yet)
│     │  ├─ canceledAt: now()
│     │  ├─ cancelAtPeriodEnd: true
│     │  ├─ cancellationReason: from form
│     │  ├─ autoRenew: false (stop renewals)
│     │  └─ nextBillingDate: null
│     ├─ Create SubscriptionHistory
│     │  ├─ action: CANCELED
│     │  ├─ fromStatus: ACTIVE
│     │  ├─ toStatus: ACTIVE (still active)
│     │  ├─ reason: "Scheduled cancellation at period end"
│     │  └─ metadata: { cancelAtPeriodEnd: true, effectiveDate: currentPeriodEnd }
│     └─ Send Email
│        ├─ Subject: "Subscription cancellation scheduled"
│        └─ Body:
│           ├─ Cancellation scheduled
│           ├─ Access continues until: Feb 8, 2025
│           ├─ No future charges
│           ├─ Undo cancellation link (if they change mind)
│           └─ Feedback request
└─ Return success response

Step 3: User Experience
├─ Show success message
│  └─ "Subscription canceled. Access until Feb 8, 2025."
├─ Dashboard shows banner:
│  └─ "⚠️ Your subscription will end on Feb 8. Undo cancellation"
└─ User retains full access until period end

Step 4: Period End Reached (Option B only)
├─ Cron job: /api/cron/finalize-cancellations
├─ Query database:
│  └─ Find Subscriptions where:
│      • status = ACTIVE
│      • cancelAtPeriodEnd = true
│      • currentPeriodEnd <= now()
├─ For each subscription:
│  ├─ Update Subscription
│  │  ├─ status: ACTIVE → EXPIRED
│  │  └─ updatedAt: now()
│  ├─ Create SubscriptionHistory
│  │  ├─ action: EXPIRED
│  │  ├─ fromStatus: ACTIVE
│  │  ├─ toStatus: EXPIRED
│  │  └─ reason: "Scheduled cancellation completed"
│  └─ Send Email
│     ├─ Subject: "Your ShopPulse access has ended"
│     └─ Body:
│        ├─ Subscription ended as scheduled
│        ├─ Data retention: Stores preserved for 30 days
│        ├─ Resubscribe link
│        └─ Thank you message
└─ User loses dashboard access
```

**Database States:**

**Cancel at Period End:**
```
Subscription:
  status: ACTIVE (no immediate change)
  canceledAt: 2025-01-15T14:00:00Z
  cancelAtPeriodEnd: true
  autoRenew: false
  currentPeriodEnd: 2025-02-08T00:00:00Z (unchanged)

SubscriptionHistory:
  action: CANCELED
  reason: "Too expensive" (user's reason)
  metadata: { effectiveDate: "2025-02-08" }
```

**After Period End:**
```
Subscription:
  status: ACTIVE → EXPIRED
  currentPeriodEnd: 2025-02-08T00:00:00Z (not extended)
```

**Cancel Immediately:**
```
Subscription:
  status: ACTIVE → CANCELED
  canceledAt: 2025-01-15T14:00:00Z
  cancelAtPeriodEnd: false
  currentPeriodEnd: 2025-01-15T14:00:00Z (updated to now)
```

---

### 🔷 Scenario 6: Plan Upgrade/Downgrade

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially accurate — architecture changed significantly
> - 📝 **REALITY CHECK**: (1) **"With only 2 plans" is WRONG** — we have **3 paid plans**: Monthly (₹3,500), HalfYearly (₹19,000), Yearly (₹38,500) + Trial (₹0/7 days). BillingCycle enum: MONTHLY, HALFYEARLY, YEARLY. (2) **Upgrades**: handled via `/api/subscription/upgrade/preview` + `/api/subscription/upgrade/execute` using Razorpay's UPDATE API with immediate effect — NOT manual proration calculation as described. Razorpay handles proration/charge. (3) **Downgrades**: handled via `/api/subscription/downgrade/preview` + `/api/subscription/downgrade/schedule` + `/api/subscription/downgrade/cancel-scheduled` — scheduled at cycle_end via Razorpay, NOT manual `pendingPlanId`. (4) Downgrade grace period is **5 days** (pre-downgrade warnings + post-downgrade grace), not 14 days as implied. (5) The `downgrade-lifecycle` cron (0 4 * * *) handles pre-downgrade warnings and grace period enforcement. (6) Manual proration math in Step 2 is NOT how it works — Razorpay calculates charges.
> - 🎯 **ACTION**: **Rewrite** — document actual upgrade (Razorpay UPDATE API, immediate) and downgrade (scheduled at cycle_end, 5-day grace) flows. Update plan count to 3+trial.
> - 💡 **INDUSTRY**: Stripe prorates automatically via `proration_behavior`. Razorpay UPDATE API similarly handles this server-side. Manual proration is error-prone and unnecessary.

**Note:** With only 2 plans (Monthly/Yearly), this is switching billing cycles.

**Trigger:** User clicks "Switch to Yearly" on /account/subscription

**Flow:**

```
Step 1: User Initiates Plan Change
├─ Current: Monthly (₹3,500/month)
├─ Target: Yearly (₹38,500/year)
├─ Show confirmation:
│  ├─ "Switch to Yearly Plan?"
│  ├─ Current: ₹3,500/month
│  ├─ New: ₹38,500/year (save ₹3,500)
│  ├─ Prorated charge: Calculate below
│  └─ "Confirm Switch" button
└─ Click confirm

Step 2: Calculate Proration (/api/subscription/calculate-proration)
├─ Get current subscription
├─ Calculate unused time
│  ├─ daysInCurrentPeriod = 30 days (monthly)
│  ├─ daysUsed = today - currentPeriodStart (e.g., 10 days)
│  ├─ daysRemaining = 20 days
│  └─ unusedValue = (20/30) * 3500 = ₹2,333.33
├─ Calculate new plan charge
│  └─ yearlyPrice = ₹38,500
├─ Final charge
│  ├─ charge = yearlyPrice - unusedValue
│  └─ charge = 38500 - 2333.33 = ₹36,166.67
└─ Return proration details

Step 3: Process Plan Change (/api/subscription/change-plan)
├─ Create Payment record (PENDING)
│  ├─ description: "Upgrade to Yearly Plan (prorated)"
│  ├─ subtotal: 36166.67
│  ├─ amountPaid: 36166.67
│  └─ status: PENDING
├─ Create Razorpay Order
│  └─ amount: 3616667 (paise)
├─ Return payment details to frontend
└─ Open Razorpay checkout (same as Scenario 3)

Step 4: Payment Success (Webhook)
├─ Webhook: payment.captured
├─ Update Payment → SUCCESS
├─ Update Subscription
│  ├─ planId: monthly → yearly
│  ├─ billingCycle: MONTHLY → YEARLY
│  ├─ currentPeriodStart: now()
│  ├─ currentPeriodEnd: now() + 365 days
│  └─ nextBillingDate: currentPeriodEnd - 3 days
├─ Create SubscriptionHistory
│  ├─ action: UPGRADED
│  ├─ fromPlanId: monthly-plan-id
│  ├─ toPlanId: yearly-plan-id
│  └─ reason: "User upgraded to yearly plan"
└─ Send Confirmation Email
   ├─ Subject: "Plan upgraded successfully!"
   └─ Body: New plan details, billing date

Step 5: Dashboard Update
├─ Show success message
├─ Update subscription display
│  ├─ Plan: Yearly
│  ├─ Next billing: Jan 15, 2026
│  └─ Amount: ₹38,500
└─ No further action needed
```

**Alternative: Downgrade (Yearly → Monthly)**

This is tricky. Two approaches:

**Approach 1: Apply at Period End**
```
├─ User clicks "Switch to Monthly"
├─ Show message:
│  └─ "Your plan will change to Monthly on Jan 15, 2026"
├─ Update Subscription
│  ├─ Add field: pendingPlanId: monthly-plan-id
│  └─ Keep current plan active
├─ On period end:
│  ├─ planId = pendingPlanId
│  ├─ billingCycle = MONTHLY
│  └─ Clear pendingPlanId
└─ No refund (they paid for the year)
```

**Approach 2: Immediate with Credit**
```
├─ Calculate unused time credit
│  ├─ daysUsed = 100 days (of 365)
│  ├─ daysRemaining = 265 days
│  └─ credit = (265/365) * 38500 = ₹27,945
├─ Apply credit to account (store in User model)
│  └─ accountCredit: 27945
├─ Switch to Monthly immediately
├─ Apply credit to future payments
│  └─ Until credit exhausted
└─ This is complex - not recommended for MVP
```

**Recommendation:** Use Approach 1 (apply at period end) for downgrades.

---

## Edge Cases & Solutions

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Mixed — some implemented, some don't exist, some are aspirational
> - 📝 **REALITY CHECK**: 10 edge cases listed. EC1 (duplicate sub), EC2 (duplicate webhook), EC3 (Clerk delete), EC5 (multi-tab), EC8 (email change), EC10 (chargeback) are reasonable designs. **EC4** (reconcile-payments cron) does NOT exist. **EC6** (trial abuse) has no separate system — basic check is in expire-trials cron. **EC7** (PAST_DUE access) — middleware doesn't do subscription checks, access control is via `User.isActive`/`Store.isAccessible` flags + layout components. **EC9** (cron monitoring) — no CronJob model exists for tracking last run.
> - 🎯 **ACTION**: Annotate each edge case individually below

### 🔸 Edge Case 1: User Already Has Active Subscription

**Scenario:** User somehow reaches /subscribe with ACTIVE status

**Solution:**
```
Middleware: /subscribe page
├─ Check subscription status
├─ If ACTIVE or ACTIVE:
│  ├─ Redirect to /dashboard
│  └─ Show toast: "You already have an active subscription"
└─ If EXPIRED/CANCELED:
   └─ Allow access to /subscribe
```

---

### 🔸 Edge Case 2: Duplicate Webhook Events

**Scenario:** Razorpay sends same webhook multiple times

**Solution:**
```
/api/webhooks/razorpay
├─ Extract payment_id from webhook
├─ Check if Payment record already has status: SUCCESS
│  └─ If yes: Return 200 OK (idempotent, skip processing)
└─ If no: Process webhook normally
```

**Critical:** Always check before updating to avoid:
- Duplicate subscription extensions
- Duplicate emails
- Duplicate history records

---

### 🔸 Edge Case 3: User Deletes Clerk Account

**Scenario:** User deletes account via Clerk, but subscription is active

**Solution:**
```
Clerk webhook: user.deleted
├─ POST /api/webhooks/clerk
├─ Extract clerkUserId
├─ Find User in database
├─ Get active Subscription
│  └─ If exists and ACTIVE:
│     ├─ Update to CANCELED immediately
│     ├─ Store data for 90 days (GDPR compliance)
│     └─ Schedule deletion after 90 days
├─ Mark User as deleted
│  ├─ isActive: false
│  ├─ isSuspended: true
│  └─ suspensionReason: "Account deleted"
└─ Send final email (if email still valid)
```

---

### 🔸 Edge Case 4: Payment Succeeds but Webhook Fails

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: NOT implemented
> - 📝 **REALITY CHECK**: **`/api/cron/reconcile-payments` does NOT exist.** There is no hourly reconciliation cron in vercel.json or anywhere in the codebase. If a webhook fails, the verify route provides a minimal safety net (sets PROCESSING status), and the `expire-trials-detect-payment-failure` cron can detect anomalies (ACTIVE past period = PAST_DUE). But there's no active Razorpay API polling for missed payments.
> - ❓ **WHY NOT**: Razorpay has robust webhook retry logic (exponential backoff, up to 24hrs). The verify route acts as a first-pass safety net. A reconciliation cron would add complexity for a rare edge case.
> - 🎯 **ACTION**: Mark as **future enhancement** — consider implementing if webhook failures are observed in production
> - 💡 **INDUSTRY**: Stripe recommends webhook + periodic reconciliation. Chargebee has built-in reconciliation. This IS a gap worth addressing for production resilience.

**Scenario:** User pays, Razorpay charges, but webhook never arrives

**Solution:**
```
Cron Job: /api/cron/reconcile-payments (runs every hour)
├─ Query Payments where:
│  ├─ status: PENDING or PROCESSING
│  ├─ createdAt: > 1 hour ago
│  └─ razorpayOrderId: exists
├─ For each payment:
│  ├─ Call Razorpay API: GET /orders/{orderId}/payments
│  ├─ Check actual payment status
│  ├─ If captured:
│  │  ├─ Update Payment → SUCCESS
│  │  └─ Process subscription activation
│  ├─ If failed:
│  │  └─ Update Payment → FAILED
│  └─ If pending (still):
│     └─ Leave as is, check next hour
└─ Log reconciliation results
```

---

### 🔸 Edge Case 5: User Has Multiple Browser Tabs

**Scenario:** User opens checkout in 2 tabs, completes payment in one

**Solution:**
```
Frontend:
├─ Store payment attempt in localStorage
│  └─ Key: "pending_payment_{userId}"
│  └─ Value: { orderId, timestamp }
├─ Before creating new order:
│  ├─ Check localStorage
│  ├─ If pending payment exists (< 30 min old):
│  │  └─ Reuse existing orderId (don't create new)
│  └─ If > 30 min old:
│     └─ Clear and create new
└─ After payment:
   └─ Clear localStorage
```

---

### 🔸 Edge Case 6: Trial Abuse Prevention

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially implemented (Solution 1 only, basic)
> - 📝 **REALITY CHECK**: (1) Solution 1 (email-based) is partially implemented: `trialUsed` flag on User prevents retrial with same email. The expire-trials cron sets `trialUsed=true`. (2) There is NO separate trial abuse detection cron or system. (3) Solution 2 (IP-based) and Solution 3 (card verification) are NOT implemented. (4) No login log table exists for IP tracking. (5) The basic protection (one trial per email via `trialUsed` flag) is the extent of trial abuse prevention.
> - 🎯 **ACTION**: Keep Solution 1 as "✅ implemented (basic)", mark Solutions 2 & 3 as future enhancements
> - 💡 **INDUSTRY**: Shopify requires credit card for trials. Most SaaS use email + phone verification. IP-based blocking has high false-positive rates (shared IPs).

**Scenario:** User creates multiple accounts to get unlimited trials

**Solution 1: Email-based**
```
User signup:
├─ Check if email already used trial
│  └─ Query: User where email = new email AND trialUsed = true
├─ If found:
│  ├─ Block trial
│  ├─ Create User with trialUsed: true
│  ├─ Show message: "Trial already used with this email"
│  └─ Redirect directly to /subscribe
└─ If not found:
   └─ Allow trial
```

**Solution 2: IP-based (stricter)**
```
User signup:
├─ Get IP address from request
├─ Check recent trials from this IP
│  └─ Query: User where createdAt > 30 days ago AND trialUsed = true
│  └─ Join with login logs to match IP
├─ If > 3 trials from this IP:
│  └─ Block trial (same as Solution 1)
└─ Else: Allow
```

**Solution 3: Payment Method Verification**
```
Trial signup:
├─ Require payment method upfront
├─ Authorize ₹1 (don't capture)
├─ Store card fingerprint
├─ Check if card used before
└─ Block if duplicate card
```

**Recommendation:** Use Solution 1 for MVP, add Solution 3 later.

---

### 🔸 Edge Case 7: Subscription in PAST_DUE, User Tries to Access

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Differently implemented than described
> - 📝 **REALITY CHECK**: (1) **Middleware does NOT check subscription status** — `src/middleware.ts` only does Clerk auth (Edge Runtime limitation, can't use Prisma). (2) Access control is via: `User.isActive` flag (dashboard access), `Store.isAccessible` flag (storefront API), `paymentGracePeriod`/`usageGracePeriod` flags on User model for UI warnings. (3) `store-subscription-service.ts` provides `checkStoreAccess()` with 5-min cache. (4) `api-with-store-check.ts` provides HOF wrappers: `withStoreAccessCheck`, `withGracefulStoreCheck` for API route protection. (5) The described read-only/limited access behavior is conceptually right but enforcement mechanism is flags + layout components + HOF wrappers, NOT middleware.
> - 🎯 **ACTION**: Update — replace "Middleware: Dashboard access" with actual access control mechanism (User.isActive + Store.isAccessible + grace period flags + layout checks)
> - 💡 **INDUSTRY**: Vercel Edge Runtime limitation is common. Next.js apps typically use layout-level checks or route-level middleware patterns.

**Scenario:** Payment failed, grace period active, user logs in

**Solution:**
```
Middleware: Dashboard access
├─ Check subscription status
├─ If PAST_DUE:
│  ├─ Allow limited access (read-only)
│  ├─ Show persistent banner:
│  │  └─ "⚠️ Payment failed. Update payment method to restore full access."
│  ├─ Block:
│  │  ├─ Creating new products
│  │  ├─ Editing existing products
│  │  └─ Processing new orders
│  └─ Allow:
│     ├─ Viewing existing data
│     ├─ Accessing payment settings
│     └─ Updating payment method
└─ Else if EXPIRED:
   └─ Block all access, redirect to /subscribe
```

---

### 🔸 Edge Case 8: User Changes Email in Clerk

**Scenario:** User updates email in Clerk dashboard

**Solution:**
```
Clerk webhook: user.updated
├─ POST /api/webhooks/clerk
├─ Extract clerkUserId and new email
├─ Find User in database (by clerkUserId)
├─ Update User record
│  ├─ email: new email
│  └─ updatedAt: now()
├─ If subscription exists:
│  └─ Send email to BOTH addresses:
│     ├─ Old email: "Your account email was changed"
│     └─ New email: "Welcome! Email updated successfully"
└─ Return 200 OK
```

---

### 🔸 Edge Case 9: Cron Job Fails/Skips

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially implemented
> - 📝 **REALITY CHECK**: (1) The "catch all missed" approach IS implemented — crons query `currentPeriodEnd < now()` which catches all overdue items, not just today's. This is correct and resilient. (2) However, **no CronJob model exists** in Prisma schema for tracking lastRunAt/status. (3) No alerting system for cron failures is implemented. (4) Vercel Cron has its own monitoring dashboard. (5) The `check-trials` cron name referenced here should be `expire-trials-detect-payment-failure`.
> - 🎯 **ACTION**: Keep the design pattern (catch-all queries are implemented), mark monitoring/alerting as future enhancement

**Scenario:** Vercel Cron fails, trials/renewals not processed

**Solution:**
```
Cron job logic:
├─ Use "last processed" timestamp approach
├─ Query: Subscriptions where should have been processed
│  └─ Don't rely on "today" only
│  └─ Check: currentPeriodEnd < now() (catch all missed)
├─ Store last run in database
│  └─ Model: CronJob
│     ├─ jobName: "check-trials"
│     ├─ lastRunAt: timestamp
│     └─ status: "success" / "failed"
└─ On each run:
   ├─ Update lastRunAt
   └─ Process ALL overdue items (not just today's)
```

**Monitoring:**
```
Add alerts:
├─ If cron hasn't run in > 25 hours
├─ If cron run fails
└─ If > 10 subscriptions overdue
```

---

### 🔸 Edge Case 10: User Dispute/Chargeback

**Scenario:** User initiates chargeback via bank

**Solution:**
```
Razorpay webhook: payment.dispute.created
├─ POST /api/webhooks/razorpay
├─ Extract payment_id and dispute details
├─ Find Payment record
├─ Update Subscription
│  ├─ status: ACTIVE → PAUSED
│  ├─ Add note: "Payment disputed"
│  └─ Block access immediately
├─ Create SubscriptionHistory
│  ├─ action: PAUSED
│  └─ reason: "Payment dispute - under investigation"
├─ Send email to user
│  ├─ Subject: "Payment dispute detected"
│  └─ Body: Contact support, provide details
└─ Notify admin (email/Slack)

If dispute resolved:
├─ Webhook: payment.dispute.closed
├─ If won (in your favor):
│  └─ Reactivate subscription
└─ If lost:
   ├─ Keep PAUSED or CANCELED
   └─ Mark user account for review
```

---

## Cron Jobs & Automation

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Heavily inaccurate — most listed crons don't exist
> - 📝 **REALITY CHECK**: Doc lists 7 subscription crons. **Only 3 subscription-related crons actually exist in vercel.json:**
>   1. ✅ `expire-trials-detect-payment-failure` (0 2 * * *) — expires trials AND detects payment failures (ACTIVE past period = PAST_DUE). Doc calls it `check-trials`.
>   2. ✅ `expire-period-ended-subscriptions` (0 3 * * *) — transitions COMPLETING/CANCELED → EXPIRED. Doc lists this as TWO separate crons: `expire-past-due` + `finalize-cancellations`.
>   3. ✅ `downgrade-lifecycle` (0 4 * * *) — pre-downgrade warnings + grace period enforcement. Not mentioned in this doc at all.
>   - ❌ `check-renewals` — does NOT exist (Razorpay handles renewal reminders)
>   - ❌ `process-renewals` — does NOT exist (Razorpay auto-charges)
>   - ❌ `reconcile-payments` — does NOT exist (no hourly reconciliation)
>   - ❌ `track-usage` — not in vercel.json
>   - 6 other non-subscription crons exist: cleanup-archived-products, refresh-shiprocket-tokens, pickup-scheduler, pickup-health, daily-shipping-digest, expire-unpaid-orders.
> - 🎯 **ACTION**: **Rewrite entirely** — list actual 3 subscription crons with correct names, schedules, and purposes. Remove phantom crons. Razorpay handles renewals — no manual renewal processing needed.
> - 💡 **INDUSTRY**: Stripe-based apps also don't need renewal crons since Stripe handles auto-charge. Dunning (retry) is gateway-side.

### Required Cron Jobs

#### 1. Check Expired Trials
```
Frequency: Daily at 00:00 IST
Endpoint: /api/cron/check-trials
Logic: Scenario 2
```

#### 2. Check Renewals
```
Frequency: Daily at 00:00 IST
Endpoint: /api/cron/check-renewals
Logic: Scenario 4, Step 1 (send reminders)
```

#### 3. Process Renewals
```
Frequency: Daily at 01:00 IST
Endpoint: /api/cron/process-renewals
Logic: Scenario 4, Step 2 (create payment orders)
```

#### 4. Expire PAST_DUE Subscriptions
```
Frequency: Daily at 02:00 IST
Endpoint: /api/cron/expire-past-due
Logic: Scenario 4, Step 3B (after 14 days)
```

#### 5. Finalize Scheduled Cancellations
```
Frequency: Daily at 03:00 IST
Endpoint: /api/cron/finalize-cancellations
Logic: Scenario 5, Step 4
```

#### 6. Reconcile Payments
```
Frequency: Every 1 hour
Endpoint: /api/cron/reconcile-payments
Logic: Edge Case 4
```

#### 7. Usage Tracking (Optional)
```
Frequency: Daily at 04:00 IST
Endpoint: /api/cron/track-usage
Logic: Count products, orders, storage per user
```

### Cron Implementation Options

**Option 1: Vercel Cron (Recommended for Vercel deployment)**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-trials",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/reconcile-payments",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Option 2: Node-cron (Self-hosted)**
```typescript
// lib/cron.ts
import cron from 'node-cron';

// Run every day at midnight IST (18:30 UTC previous day)
cron.schedule('30 18 * * *', async () => {
  await checkExpiredTrials();
});
```

**Option 3: External Service (Enterprise)**
- AWS EventBridge
- Google Cloud Scheduler
- EasyCron.com

---

## Access Control Logic

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Code shown is WRONG — middleware does NOT do subscription checks
> - 📝 **REALITY CHECK**: **The entire middleware code block below is fictional.** Actual `src/middleware.ts` (90 lines) ONLY does Clerk authentication. It uses `clerkMiddleware` + `createRouteMatcher` for public/protected routes. It CANNOT use Prisma (Edge Runtime 1MB limit — commented in code). **Actual access control architecture:**
>   - `User.isActive` (Boolean) — controls dashboard access, checked in layout components
>   - `Store.isAccessible` (Boolean) — controls storefront API access
>   - `User.paymentGracePeriod` / `User.usageGracePeriod` flags — trigger UI warning banners
>   - `store-subscription-service.ts` — `checkStoreAccess()` with 5-minute cache
>   - `api-with-store-check.ts` — HOF wrappers: `withStoreAccessCheck` (strict), `withGracefulStoreCheck` (lenient) for storefront API routes
>   - Subscription/onboarding checks are deferred to **layout components**, not middleware
>   - The status-based switch/case routing shown below does NOT exist in middleware
> - 🎯 **ACTION**: **Rewrite entirely** — document actual Clerk-only middleware + layout-based subscription checks + HOF wrappers for API routes
> - 💡 **INDUSTRY**: The Edge Runtime limitation is a well-known Next.js constraint. Vercel themselves recommend deferring DB checks to server components/layouts. This is the correct architecture.

### Middleware Implementation

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { userId } = auth();
  
  // Public routes (no auth needed)
  if (isPublicRoute(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  
  // Auth required
  if (!userId) {
    return redirectToSignIn();
  }
  
  // Get user subscription
  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { subscription: { include: { plan: true } } }
  });
  
  if (!user) {
    // User doesn't exist in DB yet (rare edge case)
    return redirectToOnboarding();
  }
  
  // Check subscription status
  const subscription = user.subscription;
  
  if (!subscription) {
    // No subscription at all (shouldn't happen)
    return redirectToSubscribe();
  }
  
  const status = subscription.status;
  
  // Status-based routing
  switch (status) {
    case 'ACTIVE':
    case 'ACTIVE':
      // Full access
      return NextResponse.next();
    
    case 'PAST_DUE':
      // Limited access
      if (isPaymentRoute(request.nextUrl.pathname)) {
        // Allow access to payment pages
        return NextResponse.next();
      }
      // Read-only dashboard
      if (isReadRoute(request.nextUrl.pathname)) {
        return NextResponse.next();
      }
      // Block write operations
      return redirectToPayment();
    
    case 'CANCELED':
      // Check if period hasn't ended yet
      if (new Date() < subscription.currentPeriodEnd) {
        // Still has access
        return NextResponse.next();
      }
      // Period ended, no access
      return redirectToSubscribe();
    
    case 'EXPIRED':
    case 'PAUSED':
      // No access
      return redirectToSubscribe();
    
    default:
      return redirectToSubscribe();
  }
}
```

---

## Payment Flow

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: Mostly accurate
> - 📝 **REALITY CHECK**: (1) Payment state machine (PENDING → PROCESSING → SUCCESS/FAILED) is conceptually correct. (2) Security checklist items (✅ signature verification, ✅ idempotency, ✅ amount validation, ✅ rate limiting, ✅ HTTPS, ✅ secure credentials) are all implemented. (3) The "reconcile via cron" fallback for PENDING state does NOT exist (as noted in EC4). (4) We use Razorpay Subscriptions API (not one-time Orders), so the state machine is slightly different: subscription.authenticated (first payment) and subscription.charged (recurring) are the primary success webhooks.
> - 🎯 **ACTION**: Keep — minor update to note Razorpay Subscription webhooks vs Order-based flow, remove reconciliation cron reference
> - 💡 **INDUSTRY**: Standard payment security checklist. Stripe/Razorpay both recommend all 6 items.

### Payment State Machine

```
PENDING → User creates order
    ↓
PROCESSING → User completes payment (frontend callback)
    ↓
    ├─→ SUCCESS → Webhook confirms (happy path)
    ├─→ FAILED → Payment declined/failed
    └─→ PENDING → Webhook never arrives (reconcile via cron)
```

### Security Checklist

1. ✅ **Verify Razorpay Signatures**
   - Frontend callback: Verify order signature
   - Webhook: Verify webhook signature
   
2. ✅ **Idempotency**
   - Check if payment already processed
   - Return 200 for duplicate webhooks
   
3. ✅ **Amount Validation**
   - Verify webhook amount matches expected
   - Prevent amount tampering
   
4. ✅ **Rate Limiting**
   - Limit payment API calls per user
   - Prevent order spam
   
5. ✅ **HTTPS Only**
   - All payment endpoints must use HTTPS
   
6. ✅ **Secure Credentials**
   - Store Razorpay keys in environment variables
   - Never expose secret key to frontend

---

## Error Handling

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially implemented
> - 📝 **REALITY CHECK**: (1) Error categories (payment, subscription, system) are reasonable and most are handled in code. (2) The `errorLog` model/table shown in the logging example does NOT exist in Prisma schema — we use a `logger` utility (lib/logger.ts) for structured logging, not a DB table. (3) No Sentry integration exists currently. (4) Payment error handling (insufficient funds, card declined) is handled by Razorpay checkout UI on the frontend side. (5) Webhook signature mismatch IS handled in the webhook route. (6) "Queue payment for retry" when Razorpay API is down is NOT implemented.
> - 🎯 **ACTION**: Update — replace errorLog model with actual logger utility, remove Sentry reference, document actual logging approach
> - 💡 **INDUSTRY**: Most SaaS use Sentry/Datadog for error tracking. Consider adding Sentry for production observability.

### Error Categories & Responses

#### 1. Payment Errors

**Insufficient Funds**
```
User: "Payment failed: Insufficient balance"
Action: Retry with different card
System: Payment status → FAILED
```

**Card Declined**
```
User: "Payment declined by bank"
Action: Contact bank or use different card
System: Payment status → FAILED
```

**Network Timeout**
```
User: "Payment is being processed..."
Action: Check status in few minutes
System: Payment status → PROCESSING → Reconcile via cron
```

#### 2. Subscription Errors

**Already Subscribed**
```
User tries to subscribe twice
Response: "You already have an active subscription"
Redirect: /dashboard
```

**Trial Already Used**
```
User tries second trial with same email
Response: "Trial already used. Subscribe to continue."
Redirect: /subscribe (skip trial)
```

**Plan Not Found**
```
User selects invalid planId
Response: "Invalid plan selected"
Action: Reload pricing page
```

#### 3. System Errors

**Database Down**
```
Error: Cannot connect to database
User: "Something went wrong. Please try again."
System: Log error, alert admins
Action: Retry request
```

**Razorpay API Down**
```
Error: Razorpay API timeout
User: "Payment service temporarily unavailable"
System: Queue payment for retry
Action: Notify user via email when resolved
```

**Webhook Signature Mismatch**
```
Error: Invalid webhook signature
System: Log as potential security issue
Action: Ignore webhook, investigate
User: Not notified (background process)
```

### Error Logging

```typescript
// lib/error-logger.ts
async function logError(error: Error, context: any) {
  await prisma.errorLog.create({
    data: {
      message: error.message,
      stack: error.stack,
      context: JSON.stringify(context),
      severity: 'error',
      createdAt: new Date()
    }
  });
  
  // Send to monitoring service (Sentry, LogRocket, etc.)
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error);
  }
}
```

---

## Summary

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Document is a useful reference but ~40% of details are inaccurate or describe unimplemented features
> - 📝 **REALITY CHECK**: Key gaps identified:
>   - **Cron section**: 4 of 7 listed crons don't exist. Only 3 subscription crons are real.
>   - **Renewal flow (Scenario 4)**: Entirely describes manual process that doesn't exist. Razorpay handles auto-renewals.
>   - **Middleware**: Shows Prisma-based subscription checks that are impossible in Edge Runtime. Actual middleware is Clerk-only.
>   - **Plans**: Doc implies 2 plans; actual is 3 paid + trial.
>   - **Cancel flow**: Status behavior differs from description (always CANCELED immediately).
>   - **Reconciliation**: No hourly payment reconciliation exists.
>   - **Missing from doc**: COMPLETING status, HalfYearly plan, downgrade-lifecycle cron, store-subscription-service, api-with-store-check HOF wrappers, 9 webhook handlers, notification templates system.
> - 🎯 **ACTION**: This doc needs a major revision pass addressing all 🔴 sections above. Priority: rewrite Scenario 4 (renewals), Cron Jobs section, and Access Control section.

This comprehensive flow covers:

✅ All major user scenarios (signup, trial, payment, renewal, cancellation)
✅ Edge cases and their solutions
✅ Cron job automation
✅ Access control logic
✅ Payment flow and security
✅ Error handling strategies

**Next Steps:**
1. Review and approve this flow
2. Identify any missing scenarios
3. Proceed to implementation phase
