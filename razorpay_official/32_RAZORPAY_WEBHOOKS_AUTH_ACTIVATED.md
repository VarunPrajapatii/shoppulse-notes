# Part 32: Subscription Webhooks - Authentication & Activation

## Overview

This part covers the first two critical webhook events in the subscription lifecycle:
1. **subscription.authenticated** - First payment made
2. **subscription.activated** - Subscription becomes active

These events mark the transition from a created subscription to a fully operational one.

---

## Event 1: subscription.authenticated

### When is it Triggered?

The `subscription.authenticated` event fires when the **first payment is successfully made** on a subscription. This can be:

1. **Authorization Amount** (₹1 for card validation)
2. **Upfront Amount** (setup fees, deposits)
3. **First Plan Charge** (immediate billing)
4. **Combination** (upfront + first plan charge)

### Status Flow

```
created → authenticated
```

The subscription moves from `created` to `authenticated` status.

---

### Sample Payload

```json
{
  "entity": "event",
  "account_id": "acc_F5Motm2sJ5Fomd",
  "event": "subscription.authenticated",
  "contains": [
    "subscription"
  ],
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_F5aa7VaVXtXh80",
        "entity": "subscription",
        "plan_id": "plan_F5Zu0nrXVhHV2m",
        "customer_id": "cust_F5ZuzTm0cqYpzp",
        "status": "authenticated",
        "current_start": null,
        "current_end": null,
        "ended_at": null,
        "quantity": 1,
        "notes": [],
        "charge_at": 1593109800,
        "start_at": 1593109800,
        "end_at": 1598380200,
        "auth_attempts": 0,
        "total_count": 3,
        "paid_count": 0,
        "customer_notify": true,
        "created_at": 1592811228,
        "expire_by": null,
        "short_url": null,
        "has_scheduled_changes": false,
        "change_scheduled_at": null,
        "source": "api",
        "offer_id": "offer_JHD834hjbxzhd38d",
        "remaining_count": 3
      }
    }
  },
  "created_at": 1592811255
}
```

### Key Fields to Note

| Field | Value | Meaning |
|-------|-------|---------|
| `status` | `"authenticated"` | Payment method verified |
| `paid_count` | `0` | No plan charges yet (only authorization) |
| `remaining_count` | `3` | All 3 billing cycles pending |
| `current_start` | `null` | Billing hasn't started yet |
| `current_end` | `null` | No active billing period |
| `charge_at` | `1593109800` | When first plan charge will occur |

**Important**: `paid_count: 0` means only authorization was done, not actual plan billing.

---

### Understanding Authentication Scenarios

#### Scenario 1: Authorization Only (₹1)

```javascript
// Subscription with future start date
await razorpay.subscriptions.create({
  plan_id: 'plan_monthly',
  total_count: 12,
  start_at: futureTimestamp, // Starts next month
  quantity: 1
});

// Customer authorizes card with ₹1
// → subscription.authenticated fired
// → status: authenticated
// → paid_count: 0 (only authorization, no billing)
```

Timeline:
```
June 15: Create subscription (start_at = July 1)
June 15: Customer authorizes card (₹1 charge)
June 15: subscription.authenticated ⚡ (paid_count: 0)
July 1:  subscription.activated ⚡ (first billing, paid_count: 1)
```

---

#### Scenario 2: Authorization + Upfront Amount

```javascript
// Subscription with setup fee
await razorpay.subscriptions.create({
  plan_id: 'plan_monthly',
  total_count: 12,
  quantity: 1,
  addons: [
    {
      item: {
        name: 'Setup Fee',
        amount: 100000, // ₹1,000
        currency: 'INR'
      }
    }
  ]
});

// Customer pays ₹1,000 setup fee
// → subscription.authenticated fired
// → status: authenticated
// → paid_count: 0 (upfront charge, not plan billing)
```

---

#### Scenario 3: Immediate Start (Authorization + First Charge)

```javascript
// Subscription starts immediately
await razorpay.subscriptions.create({
  plan_id: 'plan_monthly',
  total_count: 12,
  quantity: 1
  // No start_at, starts now
});

// Customer pays plan amount immediately
// → subscription.authenticated fired
// → subscription.activated fired immediately after
// → status: active
// → paid_count: 1
```

---

### Implementation Example

```typescript
// app/api/webhooks/razorpay/handlers/authenticated.ts
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function handleAuthenticated(subscription: any) {
  try {
    console.log(`Subscription authenticated: ${subscription.id}`);

    // Step 1: Update subscription status
    await prisma.subscription.update({
      where: { razorpaySubscriptionId: subscription.id },
      data: {
        status: 'authenticated',
        authenticatedAt: new Date(),
        chargeAt: new Date(subscription.charge_at * 1000)
      }
    });

    // Step 2: Find user
    const dbSubscription = await prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: subscription.id },
      include: { user: true }
    });

    if (!dbSubscription) {
      throw new Error('Subscription not found in database');
    }

    // Step 3: Send confirmation email
    await sendEmail({
      to: dbSubscription.user.email,
      subject: 'Payment Method Verified Successfully',
      template: 'subscription-authenticated',
      data: {
        userName: dbSubscription.user.name,
        planName: subscription.plan_id,
        startDate: new Date(subscription.start_at * 1000).toLocaleDateString(),
        firstChargeDate: new Date(subscription.charge_at * 1000).toLocaleDateString()
      }
    });

    // Step 4: Log activity
    await prisma.subscriptionActivity.create({
      data: {
        subscriptionId: dbSubscription.id,
        action: 'AUTHENTICATED',
        metadata: {
          razorpay_subscription_id: subscription.id,
          charge_at: subscription.charge_at,
          remaining_count: subscription.remaining_count
        }
      }
    });

    console.log('✅ Authentication handled successfully');
  } catch (error) {
    console.error('Error handling authenticated event:', error);
    throw error;
  }
}
```

---

## Event 2: subscription.activated

### When is it Triggered?

The `subscription.activated` event fires when a subscription moves to the **active** state. This happens:

1. **From authenticated**: Billing cycle starts (first charge)
2. **From pending**: Failed payment succeeded on retry
3. **From halted**: Manual payment retry succeeded

### Status Flow

```
authenticated → active
pending → active
halted → active
```

---

### Payload Variations

There are **two different payloads** based on payment timing:

#### Variation 1: Future Start Date (No Upfront Amount)

**Scenario**: Subscription starts in future, no immediate payment

```json
{
  "entity": "event",
  "account_id": "acc_BFQ7uQEaa7j2z7",
  "event": "subscription.activated",
  "contains": [
    "subscription"
  ],
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_DEX6xcJ1HSW4CR",
        "entity": "subscription",
        "plan_id": "plan_BvrFKjSxauOH7N",
        "customer_id": "cust_C0WlbKhp3aLA7W",
        "status": "active",
        "current_start": 1570213800,
        "current_end": 1572892200,
        "ended_at": null,
        "quantity": 1,
        "notes": {
          "notes_key_1": "Tea, Earl Grey, Hot",
          "notes_key_2": "Tea, Earl Grey… decaf."
        },
        "charge_at": 1570213800,
        "start_at": 1570213800,
        "end_at": 1599244200,
        "auth_attempts": 0,
        "total_count": 12,
        "paid_count": 0,
        "customer_notify": true,
        "created_at": 1567689895,
        "expire_by": 1567881000,
        "short_url": null,
        "has_scheduled_changes": false,
        "change_scheduled_at": null,
        "source": "api",
        "offer_id": "offer_JHD834hjbxzhd38d",
        "remaining_count": 11
      }
    }
  },
  "created_at": 1567690383
}
```

**Key Observation**: 
- ❌ **No payment entity** in payload
- `paid_count: 0` - Billing hasn't occurred yet
- `current_start` and `current_end` are populated (billing period defined)
- `remaining_count: 11` (1 less than total_count: 12)

---

#### Variation 2: Immediate Start / Upfront Amount / Both

**Scenario**: Subscription starts now OR has upfront charges

```json
{
  "entity": "event",
  "account_id": "acc_BFQ7uQEaa7j2z7",
  "event": "subscription.activated",
  "contains": [
    "subscription",
    "payment"
  ],
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_DEX6xcJ1HSW4CR",
        "entity": "subscription",
        "plan_id": "plan_BvrFKjSxauOH7N",
        "customer_id": "cust_C0WlbKhp3aLA7W",
        "status": "active",
        "type": 2,
        "current_start": 1570213800,
        "current_end": 1572892200,
        "ended_at": null,
        "quantity": 1,
        "notes": {
          "notes_key_1": "Tea, Earl Grey, Hot",
          "notes_key_2": "Tea, Earl Grey… decaf."
        },
        "charge_at": 1570213800,
        "start_at": 1570213800,
        "end_at": 1599244200,
        "auth_attempts": 0,
        "total_count": 12,
        "paid_count": 1,
        "customer_notify": true,
        "created_at": 1567689895,
        "expire_by": 1567881000,
        "short_url": null,
        "has_scheduled_changes": false,
        "change_scheduled_at": null,
        "source": "api",
        "offer_id": "offer_JHD834hjbxzhd38d",
        "remaining_count": 11
      }
    },
    "payment": {
      "entity": {
        "id": "pay_DEXFWroJ6LikKT",
        "entity": "payment",
        "amount": 100000,
        "currency": "INR",
        "status": "captured",
        "order_id": "order_DEXFWXwO24pDxH",
        "invoice_id": "inv_DEXFWVuM6rPqlK",
        "international": false,
        "method": "card",
        "amount_refunded": 0,
        "amount_transferred": 0,
        "refund_status": null,
        "captured": "1",
        "description": "Recurring Payment via Subscription",
        "card_id": "card_DEXFX0KGtXexrH",
        "card": {
          "id": "card_DEXFX0KGtXexrH",
          "entity": "card",
          "name": "Gaurav Kumar",
          "last4": "5558",
          "network": "MasterCard",
          "type": "credit",
          "issuer": "KARB",
          "international": false,
          "emi": false,
          "expiry_month": 2,
          "expiry_year": 2022
        },
        "bank": null,
        "wallet": null,
        "vpa": null,
        "email": "gaurav.kumar@example.com",
        "contact": "+919876543210",
        "customer_id": "cust_C0WlbKhp3aLA7W",
        "token_id": null,
        "notes": [],
        "fee": 2900,
        "tax": 0,
        "error_code": null,
        "error_description": null,
        "created_at": 1567690382
      }
    }
  },
  "created_at": 1567690383
}
```

**Key Observation**: 
- ✅ **Payment entity present**
- `paid_count: 1` - First payment completed
- `amount: 100000` (₹1,000 charged)
- `invoice_id` links payment to invoice

---

### Timeline Examples

#### Example 1: Future Start (No Payment Yet)

```
Sep 5:  Create subscription (start_at = Oct 5)
Sep 5:  Customer authorizes (₹1)
Sep 5:  subscription.authenticated ⚡
Oct 5:  Billing period starts
Oct 5:  subscription.activated ⚡ (no payment entity)
Oct 5:  subscription.charged ⚡ (payment entity included)
```

---

#### Example 2: Immediate Start

```
Sep 5:  Create subscription (no start_at)
Sep 5:  Customer pays ₹1,999
Sep 5:  subscription.authenticated ⚡
Sep 5:  subscription.activated ⚡ (payment entity included)
Oct 5:  Next billing cycle
Oct 5:  subscription.charged ⚡
```

---

#### Example 3: With Upfront Amount

```
Sep 5:  Create subscription with ₹500 setup fee
Sep 5:  Customer pays ₹500
Sep 5:  subscription.authenticated ⚡
Sep 5:  subscription.activated ⚡ (payment entity for ₹500)
Oct 5:  First plan charge
Oct 5:  subscription.charged ⚡ (payment entity for plan amount)
```

---

### Implementation Example

```typescript
// app/api/webhooks/razorpay/handlers/activated.ts
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { clerkClient } from '@clerk/nextjs';

export async function handleActivated(subscription: any, payment: any | null) {
  try {
    console.log(`Subscription activated: ${subscription.id}`);

    // Step 1: Update subscription status
    const updatedSubscription = await prisma.subscription.update({
      where: { razorpaySubscriptionId: subscription.id },
      data: {
        status: 'active',
        activatedAt: new Date(),
        currentStart: new Date(subscription.current_start * 1000),
        currentEnd: new Date(subscription.current_end * 1000),
        paidCount: subscription.paid_count,
        remainingCount: subscription.remaining_count
      },
      include: {
        user: true,
        plan: true
      }
    });

    // Step 2: Grant access to user
    await grantSubscriptionAccess(updatedSubscription.userId, updatedSubscription.planId);

    // Step 3: Update Clerk metadata
    await clerkClient.users.updateUserMetadata(updatedSubscription.user.clerkUserId, {
      publicMetadata: {
        subscriptionStatus: 'active',
        planId: subscription.plan_id,
        accessLevel: updatedSubscription.plan.accessLevel
      }
    });

    // Step 4: Save payment if present
    if (payment) {
      await prisma.payment.create({
        data: {
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id,
          razorpayInvoiceId: payment.invoice_id,
          subscriptionId: updatedSubscription.id,
          amount: payment.amount / 100, // Convert paise to rupees
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          captured: payment.captured === '1',
          cardLast4: payment.card?.last4,
          cardNetwork: payment.card?.network
        }
      });
    }

    // Step 5: Send welcome email
    await sendEmail({
      to: updatedSubscription.user.email,
      subject: '🎉 Welcome! Your Subscription is Now Active',
      template: 'subscription-activated',
      data: {
        userName: updatedSubscription.user.name,
        planName: updatedSubscription.plan.name,
        features: updatedSubscription.plan.features,
        currentPeriodEnd: new Date(subscription.current_end * 1000).toLocaleDateString(),
        dashboardUrl: 'https://shoppulse.com/dashboard'
      }
    });

    // Step 6: Log activity
    await prisma.subscriptionActivity.create({
      data: {
        subscriptionId: updatedSubscription.id,
        action: 'ACTIVATED',
        metadata: {
          paid_count: subscription.paid_count,
          remaining_count: subscription.remaining_count,
          payment_amount: payment ? payment.amount : null,
          current_period: {
            start: subscription.current_start,
            end: subscription.current_end
          }
        }
      }
    });

    console.log('✅ Activation handled successfully');
  } catch (error) {
    console.error('Error handling activated event:', error);
    throw error;
  }
}

async function grantSubscriptionAccess(userId: string, planId: string) {
  // Grant access based on plan
  await prisma.userAccess.upsert({
    where: { userId },
    create: {
      userId,
      planId,
      accessGrantedAt: new Date(),
      features: ['feature1', 'feature2']
    },
    update: {
      planId,
      accessGrantedAt: new Date(),
      features: ['feature1', 'feature2']
    }
  });
}
```

---

## Complete Handler Example

```typescript
// app/api/webhooks/razorpay/route.ts
import { handleAuthenticated } from './handlers/authenticated';
import { handleActivated } from './handlers/activated';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const event = JSON.parse(body);

  switch (event.event) {
    case 'subscription.authenticated':
      await handleAuthenticated(event.payload.subscription.entity);
      break;

    case 'subscription.activated':
      await handleActivated(
        event.payload.subscription.entity,
        event.payload.payment?.entity || null
      );
      break;

    // Other events...
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
```

---

## Best Practices

### 1. **Check Payment Entity Existence**

```typescript
async function handleActivated(subscription: any, payment: any | null) {
  if (payment) {
    // Payment occurred (immediate start or upfront amount)
    await recordPayment(payment);
    await sendPaymentReceipt(payment);
  } else {
    // No payment yet (future start date)
    await sendActivationNotification(subscription);
  }
  
  // Always grant access
  await grantAccess(subscription);
}
```

---

### 2. **Handle Reactivation from Pending/Halted**

```typescript
async function handleActivated(subscription: any, payment: any | null) {
  const dbSubscription = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId: subscription.id }
  });

  if (dbSubscription.status === 'pending' || dbSubscription.status === 'halted') {
    // Reactivation after payment retry
    await sendReactivationEmail(subscription);
    await notifyAdmins('Subscription reactivated', subscription.id);
  } else {
    // First activation
    await sendWelcomeEmail(subscription);
  }

  // Update status
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: { status: 'active' }
  });
}
```

---

### 3. **Sync Billing Period Dates**

```typescript
await prisma.subscription.update({
  where: { razorpaySubscriptionId: subscription.id },
  data: {
    status: 'active',
    currentStart: new Date(subscription.current_start * 1000),
    currentEnd: new Date(subscription.current_end * 1000),
    chargeAt: new Date(subscription.charge_at * 1000),
    paidCount: subscription.paid_count,
    remainingCount: subscription.remaining_count
  }
});
```

---

## Related Documentation

- **Part 31**: Webhooks Overview & Setup
- **Part 33**: Webhook Events - Charges & Completion
- **Part 34**: Webhook Events - Updates & State Changes
- **Part 19**: Create Subscription API

---

## Summary

**subscription.authenticated** fires when:
- First payment is made (authorization/upfront/plan charge)
- Status changes to `authenticated`
- Subscription is verified but not necessarily active yet
- Payment method is linked successfully

**subscription.activated** fires when:
- Subscription moves to `active` state
- Can come from authenticated/pending/halted states
- May or may not include payment entity
- Billing period (current_start/current_end) is set

**Key Differences**:

| Field | authenticated | activated |
|-------|---------------|-----------|
| Status | `authenticated` | `active` |
| Billing Started | ❌ Not yet | ✅ Yes |
| Payment Entity | Sometimes | Sometimes |
| Access Granted | ❌ No | ✅ Yes |
| current_start/end | `null` | Populated |

**Implementation Checklist**:
- ✅ Handle both with/without payment variations
- ✅ Grant access on activation
- ✅ Send welcome emails
- ✅ Update user metadata
- ✅ Record payment if present
- ✅ Handle reactivation scenarios

**Next**: Part 33 covers charged and completed webhook events!
