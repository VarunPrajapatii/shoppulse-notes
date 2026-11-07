# Self-Managed Billing Engine — Complete Design & Architecture

## How Netflix, Spotify & Enterprise Platforms Control Their Own Billing

### Why This Document Exists

In our subscription upgrade discussion, we discovered that platforms like Netflix can do **instant prorated upgrades** because they don't use a payment processor's Subscription API. Instead, they:

1. Store **tokenized payment instruments** (cards, UPI mandates)
2. Maintain their own **subscription state machine**
3. Trigger charges on **their own schedule** using raw payment APIs
4. Calculate **proration, credits, and invoices** in their own code

This document is a comprehensive design guide for building such a system, so you have the knowledge to evaluate and potentially implement this in the future.

---

## Table of Contents

1. [The Two Models of Subscription Billing](#the-two-models)
2. [Payment Instrument Tokenization](#payment-instrument-tokenization)
3. [RBI Regulations You Must Understand](#rbi-regulations)
4. [Self-Managed Billing Engine Architecture](#self-managed-billing-engine-architecture)
5. [Database Schema Design](#database-schema-design)
6. [The Subscription State Machine](#the-subscription-state-machine)
7. [Charge Orchestration Engine](#charge-orchestration-engine)
8. [Proration Engine](#proration-engine)
9. [Building with Razorpay's Raw APIs (Not Subscription API)](#building-with-razorpays-raw-apis)
10. [Building with Stripe's Raw APIs](#building-with-stripes-raw-apis)
11. [UPI AutoPay Mandate Management](#upi-autopay-mandate-management)
12. [eNACH / Card Mandate Self-Management](#enach--card-mandate-self-management)
13. [Retry & Dunning Logic](#retry--dunning-logic)
14. [Webhooks & Reconciliation](#webhooks--reconciliation)
15. [Security & Compliance](#security--compliance)
16. [When to Build vs When to Use Subscription APIs](#when-to-build-vs-when-to-use)
17. [Implementation Roadmap for ShopPulse](#implementation-roadmap-for-shoppulse)

---

## The Two Models

### Model A: Processor-Managed Subscriptions (What We Use Now)

```
┌─────────────────────────────────────────────────┐
│              Your Application                    │
│  ┌──────────────────┐    ┌───────────────────┐  │
│  │ UI (Plan Cards)  │    │ DB (Sub Status)   │  │
│  └────────┬─────────┘    └───────┬───────────┘  │
│           │                      │               │
│           ▼                      ▼               │
│  ┌──────────────────────────────────────────┐   │
│  │ razorpay.subscriptions.create()          │   │
│  │ razorpay.subscriptions.update()          │   │
│  │ razorpay.subscriptions.cancel()          │   │
│  │                                          │   │
│  │  Razorpay manages:                       │   │
│  │  ✓ When to charge                        │   │
│  │  ✓ How much to charge                    │   │
│  │  ✓ Retry on failure                      │   │
│  │  ✓ Mandate creation & management         │   │
│  │  ✓ Billing cycle tracking                │   │
│  │  ✓ Plan switching (limited)              │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

You control: UI, plan definitions, feature gating
Razorpay controls: EVERYTHING about billing
Limitation: Can't do things Razorpay doesn't support
```

### Model B: Self-Managed Billing (Netflix/Spotify Model)

```
┌─────────────────────────────────────────────────────────┐
│              Your Application                            │
│  ┌────────────┐ ┌──────────────┐ ┌───────────────────┐  │
│  │ UI         │ │ Billing      │ │ Subscription       │  │
│  │ (Plans)    │ │ Engine       │ │ State Machine      │  │
│  └──────┬─────┘ └──────┬───────┘ └───────┬───────────┘  │
│         │              │                  │              │
│         │    ┌─────────▼──────────┐       │              │
│         │    │ Charge Scheduler   │       │              │
│         │    │ (Cron/Queue)       │◄──────┘              │
│         │    │                    │                       │
│         │    │ YOU decide:        │                       │
│         │    │ ✓ When to charge   │                       │
│         │    │ ✓ How much         │                       │
│         │    │ ✓ Retry logic      │                       │
│         │    │ ✓ Proration calc   │                       │
│         │    └─────────┬──────────┘                       │
│         │              │                                  │
│         │    ┌─────────▼──────────┐                       │
│         │    │ Token Vault        │                       │
│         │    │ (Stored payment    │                       │
│         │    │  instrument tokens)│                       │
│         │    └─────────┬──────────┘                       │
│         │              │                                  │
└─────────┼──────────────┼──────────────────────────────────┘
          │              │
          │    ┌─────────▼──────────┐
          │    │ Payment Gateway    │
          │    │ (Razorpay/Stripe)  │
          │    │                    │
          │    │ Used ONLY for:     │
          │    │ • Tokenize cards   │
          │    │ • Charge tokens    │
          │    │ • Create mandates  │
          │    │ • Execute mandates │
          │    └────────────────────┘
          │
You control: EVERYTHING about billing
Gateway provides: Just the payment rails
```

---

## Payment Instrument Tokenization

### What Is Tokenization?

Tokenization replaces sensitive payment data (card numbers, bank account numbers) with a non-sensitive token that can be stored safely and used later to initiate charges.

```
Raw card:     4111 1111 1111 1111 | exp 12/26 | CVV 123
                    ↓ (tokenization by gateway)
Token:        tok_abc123xyz789
                    ↓ (stored in your database)
Your DB:      { customerId: "user_1", token: "tok_abc123xyz789", 
                last4: "1111", brand: "Visa", expiry: "12/26" }
```

### How It Works (Card Tokenization via Razorpay)

```
Step 1: Customer enters card on your checkout
                    ↓
Step 2: Card details sent to Razorpay (via Razorpay.js SDK)
        NEVER touches your server (PCI compliance)
                    ↓
Step 3: Razorpay creates a token:
        POST https://api.razorpay.com/v1/tokens
        {
          "customer_id": "cust_abc",
          "method": "card",
          "card": {
            "number": "4111111111111111",
            "expiry_month": 12,
            "expiry_year": 2026,
            "cvv": "123"
          },
          "authentication": {
            "provider": "razorpay",
            "authentication_channel": "browser"
          }
        }
                    ↓
Step 4: Customer authenticates (3DS / OTP)
                    ↓
Step 5: Razorpay returns token:
        {
          "id": "token_abc123",
          "entity": "token",
          "token": "tok_abc123xyz789",
          "customer_id": "cust_abc",
          "method": "card",
          "card": {
            "last4": "1111",
            "network": "Visa",
            "type": "credit",
            "issuer": "HDFC"
          },
          "recurring": true,        // Can be used for recurring charges
          "recurring_details": {
            "status": "confirmed",
            "failure_reason": null
          },
          "max_payment_amount": null, // No limit on charge amount
          "expired_at": 1735689600
        }
                    ↓
Step 6: You store token_id in your database
        (NOT the card number — that's what tokenization prevents)
```

### Types of Tokens

| Type | What It Represents | Can Charge Anytime? | Variable Amounts? | RBI Rules |
|------|-------------------|--------------------|--------------------|-----------|
| **Card Token (CoF)** | Stored card | ✅ Yes | ✅ Yes (with pre-notification) | AFA > ₹15K |
| **UPI Mandate Token** | UPI AutoPay authorization | ❌ Only on schedule | ❌ Fixed amount | Strict |
| **eNACH Token** | Bank mandate (NACH) | ❌ Only on schedule | ⚠️ Up to max | Strict |
| **Card Mandate Token** | Recurring card debit | ❌ Only on schedule | ❌ Fixed amount | Strict |

### The Critical Difference: Token vs Mandate

```
TOKEN (Card-on-File):
  "I've saved my card. You can charge me whenever you want,
   but you must notify me 24h before."
  
  → Flexible: any amount, any time
  → Used by: Netflix, Amazon, international services
  → RBI requirement: Pre-debit notification + AFA for > ₹15,000

MANDATE (UPI AutoPay / eNACH / Card Standing Instruction):
  "I authorize you to debit ₹799 from my account on the 15th
   of every month for 12 months."
  
  → Rigid: fixed amount, fixed schedule, fixed duration
  → Used by: Razorpay Subscriptions, most Indian SaaS
  → RBI requirement: Amount, frequency, validity pre-specified
```

**This is WHY self-managed billing with Card-on-File tokens allows instant prorated upgrades, while Razorpay's Subscription API (built on mandates) doesn't.**

---

## RBI Regulations You Must Understand

### 1. RBI Card-on-File Tokenization (October 2022)

```
Regulation: RBI/2021-22/93
"Restriction on storage of actual card data"

Key rules:
• No entity other than card issuers and card networks 
  can store actual card data (PAN, CVV, expiry)
• All merchants must use tokens issued by card networks
• Token is device + merchant specific
• Customer must give explicit consent for tokenization

What this means for you:
• You CANNOT store raw card numbers
• You MUST use Razorpay's (or any gateway's) tokenization service
• Razorpay stores the actual card, gives you a token
• Token works ONLY through Razorpay's APIs
```

### 2. RBI Recurring Payments Framework (2021)

```
Regulation: RBI/2020-21/74
"Framework for processing of e-mandates"

Rules for < ₹15,000 per transaction:
• First charge: Full authentication (OTP/UPI PIN)
• Subsequent charges: Pre-debit notification 24h before
• No additional authentication needed
• Customer can cancel anytime

Rules for ≥ ₹15,000 per transaction:
• Additional Factor of Authentication (AFA) required
• Typically means OTP for EACH charge
• Essentially breaks "automatic" recurring billing
• Customer must actively approve each charge

What this means for self-managed billing:
• If your plans are < ₹15,000: smooth recurring with just notifications
• If any plan ≥ ₹15,000: need AFA flow (customer approves each charge)
• For upgrades: prorated charge must also follow these rules
```

### 3. Pre-Debit Notification Requirements

```
What you MUST send before charging a saved card/token:

Notification must include:
• Transaction amount
• Date of debit
• Name of merchant
• Reference number
• Option to revoke authorization

Timeline:
• Send at least 24 hours before debit
• Customer must be able to opt-out

Channels:
• SMS mandatory (for Indian mobile numbers)
• Email recommended
• In-app notification recommended

Implementation:
• Schedule charge for T+24h
• Send notification at T+0
• If customer revokes → cancel the charge
• If no revocation → proceed with charge at T+24h
```

---

## Self-Managed Billing Engine Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     BILLING ENGINE                               │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Plan Service  │  │ Subscription │  │ Invoice Service        │ │
│  │              │  │ Service      │  │                        │ │
│  │ • Plan CRUD  │  │ • Create     │  │ • Generate invoices    │ │
│  │ • Pricing    │  │ • Upgrade    │  │ • Line items           │ │
│  │ • Features   │  │ • Downgrade  │  │ • Credits/debits       │ │
│  │              │  │ • Cancel     │  │ • Tax calculation      │ │
│  │              │  │ • Pause      │  │                        │ │
│  └──────────────┘  └──────┬───────┘  └───────────┬────────────┘ │
│                           │                       │              │
│  ┌────────────────────────▼───────────────────────▼────────────┐ │
│  │                  CHARGE SCHEDULER                           │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │ │
│  │  │ Cron Job    │  │ Notification │  │ Charge Executor   │  │ │
│  │  │ (Check due  │  │ Service      │  │ (Process charges) │  │ │
│  │  │  charges)   │→ │ (24h notice) │→ │                   │  │ │
│  │  └─────────────┘  └──────────────┘  └────────┬──────────┘  │ │
│  └──────────────────────────────────────────────┼─────────────┘ │
│                                                  │               │
│  ┌──────────────────────────────────────────────▼─────────────┐ │
│  │                  PAYMENT SERVICE                            │ │
│  │                                                             │ │
│  │  ┌─────────────────┐  ┌──────────────────────────────────┐ │ │
│  │  │ Token Vault     │  │ Gateway Adapter                  │ │ │
│  │  │ (Stored tokens) │  │ (Razorpay / Stripe / Juspay)    │ │ │
│  │  │                 │→ │                                  │ │ │
│  │  │ • Card tokens   │  │ • razorpay.payments.createRecur()│ │ │
│  │  │ • UPI mandates  │  │ • stripe.paymentIntents.create() │ │ │
│  │  │ • eNACH tokens  │  │ • juspay.charge()               │ │ │
│  │  └─────────────────┘  └──────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  RETRY & DUNNING ENGINE                      │ │
│  │                                                             │ │
│  │  Attempt 1 (Day 0) → fail → wait 24h                       │ │
│  │  Attempt 2 (Day 1) → fail → wait 48h                       │ │
│  │  Attempt 3 (Day 3) → fail → wait 72h                       │ │
│  │  Attempt 4 (Day 6) → fail → suspend subscription           │ │
│  │  Day 14: Cancel subscription                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Your code decides when to charge** — not the payment gateway
2. **Your code decides how much to charge** — enabling proration
3. **Your code manages the subscription lifecycle** — create, upgrade, downgrade, cancel, pause
4. **Payment gateway is just the payment rails** — tokenize, charge, refund
5. **You handle retries, dunning, notifications** — not the gateway

---

## Database Schema Design

### Core Tables for a Self-Managed Billing Engine

```sql
-- Plans (same as current, but with more flexibility)
CREATE TABLE billing_plans (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,          -- "Growth Monthly"
  tier        TEXT NOT NULL,          -- "GROWTH"
  cycle       TEXT NOT NULL,          -- "MONTHLY" | "HALF_YEARLY" | "YEARLY"
  amount      DECIMAL(10,2) NOT NULL, -- 1499.00
  currency    TEXT DEFAULT 'INR',
  features    JSONB,                  -- { maxProducts: 5000, maxOrders: 2000 }
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Customers (payment-specific data)
CREATE TABLE billing_customers (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  gateway_cust_id TEXT,               -- Razorpay customer ID "cust_abc"
  email           TEXT,
  phone           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Payment Tokens (the core of self-managed billing)
CREATE TABLE payment_tokens (
  id              TEXT PRIMARY KEY,
  customer_id     TEXT NOT NULL REFERENCES billing_customers(id),
  gateway         TEXT NOT NULL,       -- "razorpay" | "stripe"
  gateway_token   TEXT NOT NULL,       -- "token_abc123" (from Razorpay)
  method          TEXT NOT NULL,       -- "card" | "upi" | "emandate" | "netbanking"
  is_default      BOOLEAN DEFAULT FALSE,
  
  -- Card-specific
  card_last4      TEXT,
  card_brand      TEXT,                -- "Visa" | "Mastercard"
  card_type       TEXT,                -- "credit" | "debit"
  card_issuer     TEXT,                -- "HDFC"
  card_expiry     TEXT,                -- "12/2026"
  
  -- UPI-specific
  upi_vpa         TEXT,                -- "user@upi"
  
  -- Mandate-specific
  mandate_id      TEXT,                -- Gateway mandate ID
  mandate_amount  DECIMAL(10,2),       -- Max chargeable amount
  mandate_freq    TEXT,                -- "monthly" | "yearly"
  mandate_status  TEXT,                -- "active" | "paused" | "revoked"
  
  -- Token capabilities
  supports_recurring   BOOLEAN DEFAULT FALSE,
  supports_variable    BOOLEAN DEFAULT FALSE, -- Can charge different amounts?
  max_amount           DECIMAL(10,2),          -- RBI limit or mandate limit
  
  -- State
  is_active       BOOLEAN DEFAULT TRUE,
  expired_at      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Subscriptions (self-managed, not gateway-managed)
CREATE TABLE billing_subscriptions (
  id                  TEXT PRIMARY KEY,
  customer_id         TEXT NOT NULL REFERENCES billing_customers(id),
  plan_id             TEXT NOT NULL REFERENCES billing_plans(id),
  payment_token_id    TEXT REFERENCES payment_tokens(id),
  
  status              TEXT NOT NULL,     -- See state machine below
  
  -- Billing cycle
  current_period_start TIMESTAMP NOT NULL,
  current_period_end   TIMESTAMP NOT NULL,
  billing_anchor       INTEGER,          -- Day of month (1-28)
  
  -- Scheduled changes (for upgrade-at-cycle-end)
  scheduled_plan_id   TEXT REFERENCES billing_plans(id),
  scheduled_change_at TIMESTAMP,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at          TIMESTAMP,
  
  -- Credit balance (for proration)
  credit_balance       DECIMAL(10,2) DEFAULT 0.00,
  
  -- Metadata
  trial_end            TIMESTAMP,
  created_at           TIMESTAMP DEFAULT NOW(),
  updated_at           TIMESTAMP DEFAULT NOW()
);

-- Invoices (every charge gets an invoice)
CREATE TABLE billing_invoices (
  id              TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES billing_subscriptions(id),
  customer_id     TEXT NOT NULL REFERENCES billing_customers(id),
  
  status          TEXT NOT NULL,        -- "draft" | "open" | "paid" | "void" | "uncollectible"
  
  -- Amounts
  subtotal        DECIMAL(10,2) NOT NULL,
  tax             DECIMAL(10,2) DEFAULT 0.00,
  credits_applied DECIMAL(10,2) DEFAULT 0.00,
  total           DECIMAL(10,2) NOT NULL,
  amount_paid     DECIMAL(10,2) DEFAULT 0.00,
  amount_due      DECIMAL(10,2) NOT NULL,
  
  -- Payment
  payment_token_id TEXT REFERENCES payment_tokens(id),
  gateway_payment_id TEXT,             -- Razorpay payment ID after charge
  
  -- Scheduling
  due_date         TIMESTAMP NOT NULL,
  paid_at          TIMESTAMP,
  next_attempt_at  TIMESTAMP,          -- For retries
  attempt_count    INTEGER DEFAULT 0,
  
  -- Notification
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP,
  
  currency        TEXT DEFAULT 'INR',
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Invoice Line Items
CREATE TABLE billing_invoice_items (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT NOT NULL REFERENCES billing_invoices(id),
  
  type        TEXT NOT NULL,           -- "subscription" | "proration_credit" | "proration_charge"
  description TEXT NOT NULL,           -- "Growth Monthly (Jan 15 - Feb 15)"
  amount      DECIMAL(10,2) NOT NULL,  -- Positive for charges, negative for credits
  
  plan_id     TEXT REFERENCES billing_plans(id),
  period_start TIMESTAMP,
  period_end   TIMESTAMP,
  
  quantity    INTEGER DEFAULT 1,
  unit_amount DECIMAL(10,2),
  
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Charge Attempts (audit trail for every charge attempt)
CREATE TABLE billing_charge_attempts (
  id              TEXT PRIMARY KEY,
  invoice_id      TEXT NOT NULL REFERENCES billing_invoices(id),
  payment_token_id TEXT NOT NULL REFERENCES payment_tokens(id),
  
  amount          DECIMAL(10,2) NOT NULL,
  status          TEXT NOT NULL,       -- "pending" | "success" | "failed"
  
  gateway         TEXT NOT NULL,       -- "razorpay"
  gateway_payment_id TEXT,             -- Payment ID from gateway
  gateway_response JSONB,             -- Full response for debugging
  error_code      TEXT,
  error_message   TEXT,
  
  attempted_at    TIMESTAMP DEFAULT NOW()
);
```

---

## The Subscription State Machine

```
                    ┌─────────┐
         create()   │ CREATED │
         ────────── │ (new)   │
                    └────┬────┘
                         │ first payment attempted
                         ▼
              ┌──────────────────────┐
              │                      │
         ┌────▼────┐          ┌──────▼─────┐
         │ ACTIVE  │          │ INCOMPLETE │
         │         │          │ (payment   │
         └────┬────┘          │  pending)  │
              │               └──────┬─────┘
              │                      │ payment succeeds
              │                      ▼
              │               ┌────────────┐
              │               │  ACTIVE    │
              │               └────────────┘
              │
              │ plan change
              ▼
    ┌──────────────────┐
    │ UPGRADE/DOWNGRADE│
    │ (instant)        │────── new period starts
    └──────────────────┘       same subscription ID
              │
              │ payment due + fails
              ▼
         ┌────────────┐    retry succeeds    ┌────────┐
         │ PAST_DUE   │────────────────────→ │ ACTIVE │
         └──────┬─────┘                      └────────┘
                │ all retries exhausted
                ▼
         ┌────────────┐
         │ SUSPENDED  │
         └──────┬─────┘
                │ grace period expires
                ▼
         ┌────────────┐
         │ CANCELED   │
         └────────────┘

    User-initiated cancel:
    ACTIVE ──→ CANCELED (immediate)
    ACTIVE ──→ ACTIVE (cancelAtPeriodEnd=true) ──→ CANCELED

    Pause:
    ACTIVE ──→ PAUSED ──→ ACTIVE (resume)
```

---

## Charge Orchestration Engine

This is the heart of self-managed billing — the system that decides when and how much to charge.

### The Scheduled Charge Flow

```typescript
// This runs as a cron job every hour (or more frequently)

async function processScheduledCharges() {
  
  // 1. Find all invoices that are due and notification has been sent 24h ago
  const dueInvoices = await db.billing_invoices.findMany({
    where: {
      status: 'open',
      due_date: { lte: new Date() },
      notification_sent: true,
      notification_sent_at: { lte: subHours(new Date(), 24) }, // 24h pre-notification
    },
    include: {
      subscription: true,
      customer: true,
    }
  });

  for (const invoice of dueInvoices) {
    await processInvoice(invoice);
  }
}

async function processInvoice(invoice: Invoice) {
  // 2. Get the payment token
  const token = await db.payment_tokens.findFirst({
    where: {
      customer_id: invoice.customer_id,
      is_default: true,
      is_active: true,
    }
  });

  if (!token) {
    await markInvoiceFailed(invoice, 'NO_PAYMENT_METHOD');
    return;
  }

  // 3. Check if amount needs AFA (> ₹15,000)
  if (invoice.total >= 15000 && token.method === 'card') {
    await requestAFAApproval(invoice, token);
    return; // Will be processed after customer approves
  }

  // 4. Execute the charge
  try {
    const payment = await chargeToken(token, invoice.total, {
      invoiceId: invoice.id,
      description: `Subscription charge - ${invoice.subscription.plan.name}`,
    });

    // 5. Record success
    await db.billing_charge_attempts.create({
      data: {
        invoice_id: invoice.id,
        payment_token_id: token.id,
        amount: invoice.total,
        status: 'success',
        gateway: token.gateway,
        gateway_payment_id: payment.id,
        gateway_response: payment,
      }
    });

    await db.billing_invoices.update({
      where: { id: invoice.id },
      data: {
        status: 'paid',
        amount_paid: invoice.total,
        amount_due: 0,
        paid_at: new Date(),
        gateway_payment_id: payment.id,
      }
    });

    // 6. Advance subscription to next period
    await advanceSubscriptionPeriod(invoice.subscription_id);

  } catch (error) {
    // 7. Handle failure, schedule retry
    await handleChargeFailed(invoice, token, error);
  }
}
```

### Charging a Token via Razorpay

```typescript
// Using Razorpay's Recurring Payments API (NOT Subscriptions API)

async function chargeToken(
  token: PaymentToken, 
  amount: number,       // in smallest currency unit (paise for INR)
  metadata: any
): Promise<RazorpayPayment> {
  
  const payment = await razorpay.payments.createRecurringPayment({
    email: token.customer.email,
    contact: token.customer.phone,
    amount: Math.round(amount * 100), // Convert rupees to paise
    currency: 'INR',
    
    // The key part: use the stored token
    token: token.gateway_token,
    customer_id: token.gateway_customer_id,
    
    // Recurring payment type
    recurring: '1',         // subsequent recurring charge
    
    description: metadata.description,
    notes: {
      invoice_id: metadata.invoiceId,
    },
  });

  return payment;
}
```

### The Pre-Debit Notification System

```typescript
// This runs daily, finds invoices due in 24-48 hours

async function sendPreDebitNotifications() {
  const upcomingInvoices = await db.billing_invoices.findMany({
    where: {
      status: 'open',
      due_date: {
        gte: addHours(new Date(), 24),  // Due in > 24h
        lte: addHours(new Date(), 48),  // Due in < 48h
      },
      notification_sent: false,
    },
    include: {
      subscription: { include: { plan: true } },
      customer: true,
    }
  });

  for (const invoice of upcomingInvoices) {
    // Send SMS (mandatory per RBI)
    await sms.send(invoice.customer.phone, {
      template: 'PRE_DEBIT_NOTIFICATION',
      variables: {
        merchantName: 'ShopPulse',
        amount: `₹${invoice.total}`,
        date: format(invoice.due_date, 'dd MMM yyyy'),
        planName: invoice.subscription.plan.name,
        cancelUrl: `${BASE_URL}/subscription/cancel-mandate/${invoice.id}`,
      }
    });

    // Send email
    await email.send(invoice.customer.email, {
      subject: `Upcoming charge of ₹${invoice.total} for ${invoice.subscription.plan.name}`,
      template: 'pre-debit',
      data: { /* same variables */ }
    });

    // Mark notification sent
    await db.billing_invoices.update({
      where: { id: invoice.id },
      data: {
        notification_sent: true,
        notification_sent_at: new Date(),
      }
    });
  }
}
```

---

## Proration Engine

### This is what enables instant prorated upgrades

```typescript
interface ProrationResult {
  creditAmount: number;      // Credit from unused old plan
  chargeAmount: number;      // Charge for partial new plan
  netAmount: number;         // chargeAmount - creditAmount (what to charge)
  invoiceItems: InvoiceItem[];
}

function calculateProration(
  subscription: Subscription,
  oldPlan: Plan,
  newPlan: Plan,
  changeDate: Date = new Date()
): ProrationResult {
  
  const periodStart = subscription.current_period_start;
  const periodEnd = subscription.current_period_end;
  
  const totalDays = differenceInDays(periodEnd, periodStart);
  const daysUsed = differenceInDays(changeDate, periodStart);
  const daysRemaining = totalDays - daysUsed;
  
  // Credit: what the customer already paid but won't use
  const creditPerDay = oldPlan.amount / totalDays;
  const creditAmount = creditPerDay * daysRemaining;
  
  // Charge: what the new plan costs for the remaining days
  const chargePerDay = newPlan.amount / totalDays;
  const chargeAmount = chargePerDay * daysRemaining;
  
  // Net: what the customer owes (or is owed)
  const netAmount = Math.max(0, chargeAmount - creditAmount);
  
  const invoiceItems: InvoiceItem[] = [
    {
      type: 'proration_credit',
      description: `Unused time on ${oldPlan.name} (${daysRemaining} days)`,
      amount: -creditAmount, // Negative = credit
      period_start: changeDate,
      period_end: periodEnd,
      plan_id: oldPlan.id,
    },
    {
      type: 'proration_charge',
      description: `${newPlan.name} (${daysRemaining} days remaining)`,
      amount: chargeAmount, // Positive = charge
      period_start: changeDate,
      period_end: periodEnd,
      plan_id: newPlan.id,
    }
  ];
  
  return { creditAmount, chargeAmount, netAmount, invoiceItems };
}
```

### The Instant Upgrade Flow (Self-Managed)

```typescript
async function upgradeSubscription(
  subscriptionId: string,
  newPlanId: string
): Promise<UpgradeResult> {
  
  const subscription = await db.billing_subscriptions.findUnique(/*...*/);
  const oldPlan = await db.billing_plans.findUnique({ where: { id: subscription.plan_id } });
  const newPlan = await db.billing_plans.findUnique({ where: { id: newPlanId } });
  const token = await db.payment_tokens.findFirst({
    where: { customer_id: subscription.customer_id, is_default: true }
  });

  // 1. Calculate proration
  const proration = calculateProration(subscription, oldPlan, newPlan);

  // 2. Create prorated invoice
  const invoice = await db.billing_invoices.create({
    data: {
      subscription_id: subscriptionId,
      customer_id: subscription.customer_id,
      status: 'open',
      subtotal: proration.chargeAmount,
      credits_applied: proration.creditAmount,
      total: proration.netAmount,
      amount_due: proration.netAmount,
      due_date: new Date(), // Due NOW (instant upgrade)
      payment_token_id: token.id,
      items: {
        create: proration.invoiceItems,
      }
    },
  });

  // 3. For Card-on-File tokens: charge immediately (no 24h wait for upgrades)
  // RBI allows this because the customer initiated the action
  if (token.supports_variable && proration.netAmount > 0) {
    try {
      const payment = await chargeToken(token, proration.netAmount, {
        invoiceId: invoice.id,
        description: `Plan upgrade: ${oldPlan.name} → ${newPlan.name}`,
      });

      // 4. Update invoice as paid
      await db.billing_invoices.update({
        where: { id: invoice.id },
        data: { status: 'paid', amount_paid: proration.netAmount, paid_at: new Date() }
      });

      // 5. Switch plan immediately
      await db.billing_subscriptions.update({
        where: { id: subscriptionId },
        data: {
          plan_id: newPlanId,
          updated_at: new Date(),
          // Keep same period end — billing date doesn't change
        }
      });

      return { success: true, charged: proration.netAmount, invoice };
    } catch (error) {
      // Charge failed — revert invoice, don't switch plan
      await db.billing_invoices.update({ where: { id: invoice.id }, data: { status: 'void' } });
      return { success: false, error: error.message };
    }
  }

  // 4b. For mandate tokens: can't charge variable amount → use cancel+resubscribe
  if (!token.supports_variable) {
    return {
      success: false,
      requiresCancelFlow: true,
      reason: `${token.method} doesn't support variable charges`,
      creditAmount: proration.creditAmount,
    };
  }
}
```

**This is the key insight**: With self-managed billing + Card-on-File token, you can:
1. Calculate proration yourself
2. Charge the prorated amount to the saved card immediately
3. Switch the plan in your database
4. Keep the same billing date

**No mandate renewal, no Razorpay API limitation, no cancel+resubscribe needed.**

But for UPI/eNACH/card mandate tokens, you STILL need cancel+resubscribe — even with self-managed billing.

---

## Building with Razorpay's Raw APIs

### Instead of using `razorpay.subscriptions.*`, you use:

```
Razorpay Subscription API (what we use now):
  subscriptions.create()    → Creates mandated recurring charge
  subscriptions.update()    → Limited by mandate type
  subscriptions.cancel()    → Cancels mandate + subscription

Razorpay Raw Payment APIs (for self-managed billing):
  customers.create()        → Create a Razorpay customer
  tokens.create()           → Tokenize a payment method via checkout
  payments.createRecurringPayment()  → Charge a saved token
  payments.fetch()          → Check payment status
  refunds.create()          → Refund a charge
  orders.create()           → Create an order for first-time payment
```

### Step-by-Step: Setting Up Card-on-File with Razorpay

```typescript
// STEP 1: Create Razorpay customer
const customer = await razorpay.customers.create({
  name: user.name,
  email: user.email,
  contact: user.phone,
});
// Returns: { id: "cust_abc123" }

// STEP 2: First payment — full authentication
// Create an order
const order = await razorpay.orders.create({
  amount: plan.amount * 100, // In paise
  currency: 'INR',
  customer_id: customer.id,
  method: 'card',
  token: {
    max_amount: 5000 * 100,      // Max recurring amount (in paise)
    expire_at: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
    frequency: 'as_presented',    // KEY: "as_presented" = charge anytime
  },
  notes: {
    plan_id: plan.id,
    subscription_type: 'recurring_cof',
  },
});

// STEP 3: Open Razorpay Checkout for first payment
// (Customer enters card, gets OTP, authenticates)
const options = {
  key: process.env.RAZORPAY_KEY_ID,
  order_id: order.id,
  customer_id: customer.id,
  recurring: true,              // Tells Razorpay to save card as token
  prefill: { email: user.email, contact: user.phone },
  handler: async function(response) {
    // response.razorpay_payment_id → first payment
    // The token is automatically created by Razorpay
    
    // Fetch the token
    const tokens = await razorpay.customers.fetchTokens(customer.id);
    const cardToken = tokens.items[0];
    
    // Store in your database
    await db.payment_tokens.create({
      data: {
        customer_id: billingCustomer.id,
        gateway: 'razorpay',
        gateway_token: cardToken.token,
        gateway_customer_id: customer.id,
        method: 'card',
        card_last4: cardToken.card.last4,
        card_brand: cardToken.card.network,
        supports_recurring: true,
        supports_variable: true, // CoF can charge variable amounts
      }
    });
  },
};
const rzp = new Razorpay(options);
rzp.open();

// STEP 4: Subsequent charges (no customer interaction needed for < ₹15K)
const recurringPayment = await razorpay.payments.createRecurringPayment({
  email: user.email,
  contact: user.phone,
  amount: 1499 * 100,        // Any amount (not fixed!)
  currency: 'INR',
  token: cardToken.token,    // The stored token
  customer_id: customer.id,
  recurring: '1',            // Indicates subsequent recurring charge
  description: 'ShopPulse Growth Monthly - Prorated upgrade charge',
  notes: { invoice_id: invoice.id },
});
// This charges ₹1499 immediately if < ₹15,000 and pre-notification was sent
```

### Key Razorpay API Details

```
POST /v1/payments/create/recurring

Request:
{
  "email": "customer@example.com",
  "contact": "+919876543210",
  "amount": 149900,           // In paise (₹1499.00)
  "currency": "INR",
  "order_id": null,           // Not needed for recurring
  "customer_id": "cust_abc",
  "token": "token_xyz",       // Saved token
  "recurring": "1",           // "1" = subsequent charge
  "description": "Plan upgrade charge",
  "notes": {}
}

Response (success):
{
  "razorpay_payment_id": "pay_abc123",
  "razorpay_order_id": null,
  "razorpay_signature": null
}

Response (failure):
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "Payment processing failed",
    "source": "bank",
    "step": "payment_authorization",
    "reason": "payment_declined"
  }
}
```

---

## Building with Stripe's Raw APIs

For comparison, here's how Stripe approaches the same thing:

```typescript
// Stripe's approach is similar but with a more polished API

// STEP 1: Create customer + setup intent
const customer = await stripe.customers.create({
  email: user.email,
  name: user.name,
});

const setupIntent = await stripe.setupIntents.create({
  customer: customer.id,
  payment_method_types: ['card'],
  usage: 'off_session',  // Can charge without customer present
});

// STEP 2: Collect card via Stripe Elements (frontend)
// stripe.confirmSetupIntent(clientSecret, { payment_method: { card: element } })

// STEP 3: Charge later
const paymentIntent = await stripe.paymentIntents.create({
  amount: 72854,           // ₹728.54 prorated charge (in paise)
  currency: 'inr',
  customer: customer.id,
  payment_method: 'pm_abc123',  // Saved payment method
  off_session: true,             // Charge without customer present
  confirm: true,                 // Charge immediately
  description: 'Plan upgrade: Starter → Growth (prorated)',
});

// Stripe handles RBI compliance internally:
// - For < ₹15000: charges without AFA
// - For >= ₹15000: requires customer authentication (3DS)
// - Pre-debit notifications: Stripe sends them automatically
```

---

## UPI AutoPay Mandate Management

### Why UPI Mandates Can't Support Variable Charges

```
UPI Mandate structure:
{
  "mandate_type": "recurring",
  "amount": 79900,            // FIXED: ₹799.00
  "frequency": "monthly",     // FIXED: once per month
  "start_date": "2025-01-15",
  "end_date": "2026-01-15",
  "payer_vpa": "user@upi",
  "payee_vpa": "merchant@upi"
}

To charge ₹728.54 for a prorated upgrade:
  ❌ Amount doesn't match mandate (₹799 ≠ ₹728.54)
  ❌ Not on scheduled date
  → NPCI (National Payments Corporation) rejects the charge

To upgrade with UPI:
  1. Cancel old mandate (₹799/mo)
  2. Create new mandate (₹1499/mo)
  3. Customer approves new mandate via UPI PIN
  → This IS cancel + resubscribe
```

### Self-Managed + UPI AutoPay

Even with a self-managed billing engine, UPI mandates are rigid:

```typescript
// You CAN manage the subscription lifecycle yourself
// But you CANNOT charge a different amount on a UPI mandate

async function upgradeWithUPI(subscription, newPlan) {
  const token = await getDefaultToken(subscription.customer_id);
  
  if (token.method === 'upi') {
    // UPI mandate: CANNOT charge prorated amount
    // Must cancel old mandate + create new one
    
    // 1. Cancel old subscription (revokes UPI mandate)
    await cancelSubscription(subscription.id, { immediate: true });
    
    // 2. Create new subscription with new plan
    // Customer must approve new UPI AutoPay mandate
    return {
      requiresNewCheckout: true,
      reason: 'UPI AutoPay mandates cannot be modified',
      newPlanId: newPlan.id,
    };
  }
  
  if (token.method === 'card' && token.supports_variable) {
    // Card CoF: CAN charge prorated amount
    const proration = calculateProration(subscription, oldPlan, newPlan);
    await chargeToken(token, proration.netAmount);
    await switchPlan(subscription, newPlan);
    return { success: true };
  }
}
```

---

## eNACH / Card Mandate Self-Management

### eNACH (Electronic National Automated Clearing House)

```
eNACH mandates are even MORE rigid than UPI:

Structure:
{
  "mandate_type": "NACH",
  "amount": 79900,           // Maximum debit amount
  "frequency": "monthly",
  "debit_type": "maximum_amount",  // Can charge UP TO this amount
  "scheme_name": "NACH_DEBIT",
  "utility_code": "NACH123456",
  "start_date": "2025-01-15",
  "end_date": "2026-01-15"
}

Key difference from UPI:
  eNACH mandates specify a MAXIMUM amount, not exact amount
  You can charge ≤ max_amount on the scheduled dates

For upgrades:
  If newPlan.amount ≤ mandate.max_amount: 
    ✅ CAN charge on next scheduled date
    ❌ CANNOT charge mid-cycle (only on schedule)
  
  If newPlan.amount > mandate.max_amount:
    ❌ Must cancel and create new mandate
    → Cancel + resubscribe
```

### Card Standing Instructions (Recurring Card Mandates)

```
Card SI mandates are similar to UPI:

Structure:
{
  "type": "card_mandate",
  "amount": 79900,
  "frequency": "monthly",
  "max_amount": 79900,      // Sometimes has separate max_amount
}

For upgrades:
  ❌ Cannot charge different amount mid-cycle
  ❌ Must create new mandate for new amount
  → Cancel + resubscribe (what our system does)
```

---

## Retry & Dunning Logic

### Smart Retry Schedule

```typescript
const RETRY_SCHEDULE = [
  { attempt: 1, delay: 0 },          // Immediate
  { attempt: 2, delay: 24 * 3600 },  // 24 hours
  { attempt: 3, delay: 72 * 3600 },  // 3 days
  { attempt: 4, delay: 168 * 3600 }, // 7 days
];

const DUNNING_ACTIONS = [
  { after: 0, action: 'EMAIL_PAYMENT_FAILED' },
  { after: 3, action: 'EMAIL_REMINDER' },
  { after: 7, action: 'SUSPEND_FEATURES' },
  { after: 14, action: 'CANCEL_SUBSCRIPTION' },
];

async function handleChargeFailed(invoice, token, error) {
  const attempt = invoice.attempt_count + 1;
  
  await db.billing_charge_attempts.create({
    data: {
      invoice_id: invoice.id,
      payment_token_id: token.id,
      amount: invoice.total,
      status: 'failed',
      gateway: token.gateway,
      error_code: error.code,
      error_message: error.message,
    }
  });

  const retryConfig = RETRY_SCHEDULE[attempt];
  
  if (retryConfig) {
    // Schedule next retry
    await db.billing_invoices.update({
      where: { id: invoice.id },
      data: {
        attempt_count: attempt,
        next_attempt_at: addSeconds(new Date(), retryConfig.delay),
      }
    });
    
    // Update subscription status
    await db.billing_subscriptions.update({
      where: { id: invoice.subscription_id },
      data: { status: 'PAST_DUE' }
    });
  } else {
    // All retries exhausted
    await db.billing_invoices.update({
      where: { id: invoice.id },
      data: { status: 'uncollectible' }
    });
    
    await db.billing_subscriptions.update({
      where: { id: invoice.subscription_id },
      data: { status: 'CANCELED', canceled_at: new Date() }
    });
  }
  
  // Send dunning emails
  const daysSinceFailed = differenceInDays(new Date(), invoice.due_date);
  const dunningAction = DUNNING_ACTIONS.findLast(d => daysSinceFailed >= d.after);
  if (dunningAction) {
    await executeDunningAction(invoice, dunningAction);
  }
}
```

---

## Security & Compliance

### What You Need for Self-Managed Billing

| Requirement | Details | Difficulty |
|-------------|---------|------------|
| **PCI-DSS SAQ-A** | Don't handle raw card data (use tokenization) | Low (Razorpay handles) |
| **RBI Pre-debit notifications** | SMS + email 24h before charge | Medium (build notification system) |
| **AFA for > ₹15K** | Customer OTP for large charges | Medium (redirect to auth page) |
| **Refund handling** | Must process refunds within 5-7 days | Low |
| **Mandate revocation** | Customer can cancel mandate anytime | Medium |
| **Audit trail** | Log every charge attempt | Low (database) |
| **Data protection** | Encrypt tokens, limit access | Medium |
| **GST compliance** | Tax calculation on invoices | Medium-High |

### Token Security

```typescript
// NEVER store raw card numbers
// NEVER log token values in production
// ALWAYS encrypt tokens at rest

// Good:
db.payment_tokens.create({
  data: {
    gateway_token: encrypt(razorpayToken),  // Encrypt before storing
    card_last4: '1111',  // Only store last 4 (safe to display)
    // ...
  }
});

// Bad:
db.payment_tokens.create({
  data: {
    raw_card_number: '4111111111111111',  // ❌ NEVER
    cvv: '123',                           // ❌ NEVER
  }
});
```

---

## When to Build vs When to Use Subscription APIs

### Use Razorpay Subscriptions API When:

| Criterion | ✅ Use Subscription API |
|-----------|------------------------|
| Plan changes | Rare (users stay on same plan) |
| Billing cycles | Standard (monthly/yearly) |
| Payment methods | Mostly domestic Indian cards/UPI |
| Proration needs | Not needed or can use cycle_end upgrade |
| Team size | Small (1-3 devs) |
| Budget | Limited |
| Time to market | Speed is priority |
| Support volume | Can handle "cancel & resubscribe" UX |

### Build Self-Managed Billing When:

| Criterion | ✅ Build Self-Managed |
|-----------|----------------------|
| Plan changes | Frequent (users upgrade/downgrade often) |
| Billing complexity | Metered, usage-based, seat-based, enterprise |
| International | Multiple currencies, multiple gateways |
| Proration | Must support instant prorated upgrades |
| Price points | > ₹15,000 (need AFA handling) |
| Compliance | Need detailed invoices, audit trails |
| Team size | 3+ devs with billing experience |
| Revenue | Enough to justify 2-3 months of engineering |

### The Hybrid Approach

You can also combine:
- Use Razorpay Subscriptions for the main billing (mandate management, retries)
- Layer your own proration/upgrade logic on top
- Fall back to cancel+resubscribe when mandate blocks you (what we do now)

This is actually the most practical approach for a growing startup.

---

## Implementation Roadmap for ShopPulse (Future)

If you ever want to migrate from Razorpay Subscriptions to self-managed billing:

### Phase 1: Token Collection (2-3 weeks)
- Modify checkout to create Card-on-File tokens alongside subscriptions
- Store tokens in `payment_tokens` table
- Dual-write: Razorpay subscription + your own token

### Phase 2: Billing Engine Core (3-4 weeks)
- Build `billing_invoices` + `billing_invoice_items` tables
- Build proration engine
- Build charge scheduler (cron job)
- Build pre-debit notification system (SMS via MSG91/Twilio)

### Phase 3: Upgrade Flow (2 weeks)
- Replace `razorpay.subscriptions.update()` with self-managed proration + charge
- For CoF tokens: instant prorated charge
- For mandate tokens: fall back to cancel+resubscribe (same as now)

### Phase 4: Migration (2-3 weeks)
- Migrate existing subscriptions from Razorpay-managed to self-managed
- Cancel Razorpay subscriptions in background
- Activate self-managed billing scheduler
- Keep Razorpay only as payment rails (tokenize + charge)

### Phase 5: Retry & Dunning (1-2 weeks)
- Implement retry schedule
- Implement dunning emails
- Implement subscription suspension/cancellation

### Total: ~10-14 weeks of engineering

### Is It Worth It for ShopPulse?

**Probably not yet.** The cancel+resubscribe flow works well for the current user base. Self-managed billing becomes worth it when:
- You have > 1,000 paying subscribers
- Upgrade/downgrade frequency is > 5% per month
- Support tickets about billing are > 10% of total tickets
- You need metered/usage-based billing
- You expand internationally

---

*This document is part of the subscription education series:*
- *[Part 1: How Industry Giants Handle Upgrades](SUBSCRIPTION_UPGRADE_PATTERNS_PART1.md)*
- *[Part 2: Technical Deep Dive into Approaches](SUBSCRIPTION_UPGRADE_PATTERNS_PART2.md)*
- *[Part 3: ShopPulse Cancel+Resubscribe Flow](RAZORPAY_CANCEL_RESUBSCRIBE_FLOW.md)*
- *Part 4: Self-Managed Billing Engine (this document)*
