# Part 33: Subscription Updates vs Initial Creation - Key Differences

## Overview

This document clarifies the critical differences between **creating a new subscription** and **updating an existing subscription**, particularly around payment handling, webhooks, and verification flows.

**Related Documents**: Part 19 (Create Subscription), Part 23 (Update Subscription), Part 23B (Proration Details)

---

## Side-by-Side Comparison

| Aspect | Initial Subscription (Create) | Subscription Update (Upgrade/Downgrade) |
|--------|------------------------------|----------------------------------------|
| **API Method** | `subscriptions.create()` | `subscriptions.update()` |
| **User Flow** | Checkout page with payment | No checkout (uses saved method) |
| **Payment Entity** | New authorization | Invoice (upgrade) or Credit Note (downgrade) |
| **Verification** | Verify endpoint required | No verification needed |
| **Webhooks** | `subscription.authenticated` → `subscription.activated` | `subscription.updated` only |
| **Payment Timing** | During checkout (user present) | Background (saved card) |
| **Failure Handling** | User retries on checkout page | Auto-rollback, notify user later |
| **Subscription ID** | New ID created | Same ID preserved |
| **Customer Action** | Enter payment details | None (automatic charge) |

---

## Initial Subscription Creation Flow

### Complete Flow
```
1. User selects plan on your website
2. POST /v1/subscriptions → Get subscription_id + short_url
3. Redirect user to short_url (Razorpay checkout)
4. User enters payment details
5. User completes payment/authorization
6. Razorpay redirects to your callback URL with razorpay_subscription_id
7. Call verify endpoint to validate signature
8. subscription.authenticated webhook fires
9. subscription.activated webhook fires (when first charge happens)
10. Store subscription details in database
11. Grant user access to features
```

### Why Verification is Needed

**Verification prevents tampering**:
```typescript
// Without verification, attacker could send fake subscription_id
// to your callback URL and get access without paying

// Your callback endpoint
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const razorpay_subscription_id = searchParams.get('razorpay_subscription_id');
  const razorpay_signature = searchParams.get('razorpay_signature');
  const razorpay_payment_id = searchParams.get('razorpay_payment_id');

  // ✅ MUST verify signature
  const isValid = verifySignature({
    razorpay_subscription_id,
    razorpay_payment_id,
    razorpay_signature
  });

  if (!isValid) {
    throw new Error('Invalid signature - possible tampering');
  }

  // Now safe to grant access
  await createSubscription(razorpay_subscription_id);
}
```

### Webhooks for Initial Creation

**Two webhooks fire**:

1. **subscription.authenticated** (first payment made)
```json
{
  "event": "subscription.authenticated",
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_123",
        "status": "authenticated",
        "paid_count": 0,  // No plan charges yet
        "auth_attempts": 1 // Authorization completed
      }
    },
    "payment": {
      "entity": {
        "id": "pay_456",
        "status": "captured",
        "amount": 100  // Could be ₹1 authorization or first charge
      }
    }
  }
}
```

2. **subscription.activated** (subscription becomes active)
```json
{
  "event": "subscription.activated",
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_123",
        "status": "active",
        "paid_count": 1,  // First plan charge happened
        "current_start": 1609459200,
        "current_end": 1612137600
      }
    }
  }
}
```

---

## Subscription Update Flow (Upgrade)

### Complete Flow
```
1. User clicks "Upgrade" on your website
2. Show preview (calculate proration)
3. User confirms upgrade
4. POST /v1/subscriptions/:id (with schedule_change_at: 'now')
5. Razorpay creates invoice for difference amount
6. Razorpay charges saved payment method (background)
7. If successful → subscription.updated webhook fires
8. If failed → No webhook, subscription stays on old plan
9. Update database (only after webhook)
10. Show success message to user
```

### Why No Verification Needed

**No user-facing redirect = no tampering risk**:
```typescript
// Upgrade flow happens server-side
// No URL callback that user can manipulate

export async function POST(req: Request) {
  const { newPlanId } = await req.json();

  // Direct API call (server-to-server)
  const updated = await razorpay.subscriptions.update(subscriptionId, {
    plan_id: newPlanId,
    schedule_change_at: 'now'
  });
  // ✅ Returns updated subscription directly
  // No signature verification needed (it's YOUR API call)

  // Wait for webhook to confirm payment
  // Webhook signature is verified there
}
```

### Webhooks for Updates

**Only one webhook fires**:

**subscription.updated** (plan changed)
```json
{
  "event": "subscription.updated",
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_123",  // Same subscription ID!
        "plan_id": "plan_new",  // Changed to new plan
        "status": "active",  // Status unchanged
        "current_start": 1609459200,  // New cycle start
        "current_end": 1612137600,   // New cycle end
        "paid_count": 1,  // Resets after plan change
        "has_scheduled_changes": false
      }
    }
  }
}
```

**Note**: No `payment` entity in payload. The invoice payment happens before webhook fires.

---

## Payment Handling Differences

### Initial Subscription: User-Present Payment

```typescript
// User is on Razorpay checkout page
// Enters card details
// Authorizes recurring payments
// You receive callback with payment confirmation
// Verify signature to prevent fraud

const subscription = await razorpay.subscriptions.create({
  plan_id: 'plan_123',
  customer_notify: true,
  total_count: 12,
  // User will be redirected to short_url to pay
});

// Return short_url to frontend
return { checkoutUrl: subscription.short_url };
```

### Update: Background Payment

```typescript
// User is NOT redirected anywhere
// Payment happens using saved card (background)
// Invoice created and charged automatically
// No verification needed (server-to-server)

const updated = await razorpay.subscriptions.update(
  subscriptionId,
  {
    plan_id: 'plan_456',
    schedule_change_at: 'now',
    // Razorpay charges saved payment method automatically
  }
);

// Return success immediately
// Webhook will confirm payment later
return { success: true, message: 'Upgrade initiated' };
```

---

## Failure Handling Differences

### Initial Subscription: User Retries Immediately

```typescript
// User on checkout page
// Payment fails (insufficient funds, card declined, etc.)
// Razorpay shows error message
// User can:
// - Try different card
// - Retry same card
// - Cancel and go back

// No webhook fires on failure
// User never reaches your callback URL
// Your system doesn't know about failed attempt
```

### Update: Silent Failure + Notification

```typescript
// User clicks "Upgrade" → Loading spinner
// API returns 200 OK
// Payment attempted in background
// If fails:
//   - No webhook fires
//   - Subscription stays on old plan
//   - User sees loading state forever

// You need to detect failure:
setTimeout(async () => {
  const current = await razorpay.subscriptions.fetch(subscriptionId);
  
  if (current.plan_id === oldPlanId) {
    // Update failed
    await notifyUser({
      message: 'Upgrade payment failed. Please update your payment method.',
      action: '/billing/payment-methods'
    });
  }
}, 5000);
```

---

## Verification Logic Comparison

### Initial Subscription: Verify Callback Signature

```typescript
// After user completes payment on Razorpay
// Razorpay redirects to: https://yoursite.com/verify?params...

import crypto from 'crypto';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  const razorpay_subscription_id = searchParams.get('razorpay_subscription_id');
  const razorpay_payment_id = searchParams.get('razorpay_payment_id');
  const razorpay_signature = searchParams.get('razorpay_signature');

  // ✅ MUST verify to prevent tampering
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_subscription_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    throw new Error('Signature verification failed');
  }

  // Safe to create subscription now
  await createSubscriptionInDB(razorpay_subscription_id);
  
  return redirect('/dashboard?success=true');
}
```

### Update: No Verification Needed

```typescript
// No callback URL, no signature in API response
// You called the API directly, response is trusted

export async function POST(req: Request) {
  const { newPlanId } = await req.json();

  // Direct API call (authenticated with your API key)
  const updated = await razorpay.subscriptions.update(
    subscriptionId,
    {
      plan_id: newPlanId,
      schedule_change_at: 'now'
    }
  );

  // ✅ No verification needed
  // This is YOUR authenticated API call
  // Response is directly from Razorpay servers
  // Not coming from user's browser (no tampering risk)

  return NextResponse.json({ success: true });
}

// Webhook still verifies signature (as always)
export async function POST(req: Request) {
  const signature = req.headers.get('x-razorpay-signature');
  
  // ✅ Verify webhook signature
  verifyWebhookSignature(body, signature);
  
  // Process webhook
}
```

---

## Webhook Signature Verification (Always Required)

**Both flows must verify webhook signatures**:

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  body: string,
  signature: string | null
): boolean {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
}

// Use in webhook handler
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  // ✅ ALWAYS verify webhook signature
  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  // Safe to process webhook
  const event = JSON.parse(body);
  // ...
}
```

---

## Summary Table

### When Verification is Needed

| Scenario | Verification Required | Why |
|----------|---------------------|-----|
| **Initial subscription callback** | ✅ Yes | User-facing redirect, tampering risk |
| **Subscription update API response** | ❌ No | Server-to-server, authenticated API call |
| **Webhook (any type)** | ✅ Yes | External HTTP request, must verify source |

### Key Principles

1. **User-facing redirects** → Verify signature (tampering risk)
2. **Your own API calls** → No verification needed (you made the call)
3. **Incoming webhooks** → Always verify (external request)

---

## Common Misconceptions

### ❌ Misconception 1: "Always need verify endpoint"

**Reality**: Only needed for initial subscription with checkout flow.

```typescript
// ❌ Wrong: Creating verify endpoint for upgrade
router.post('/upgrade/verify', verifyUpgradeSignature); // Not needed!

// ✅ Correct: Only verify webhooks
router.post('/webhook', verifyWebhookSignature);
```

---

### ❌ Misconception 2: "subscription.charged fires for upgrades"

**Reality**: Only `subscription.updated` fires for immediate upgrades.

```typescript
// ❌ Wrong expectation
if (event === 'subscription.charged') {
  // This won't fire for upgrade payments!
}

// ✅ Correct
if (event === 'subscription.updated') {
  // This fires after upgrade payment succeeds
}
```

---

### ❌ Misconception 3: "Need checkout page for upgrades"

**Reality**: Upgrades charge saved payment method automatically.

```typescript
// ❌ Wrong: Redirecting to checkout for upgrade
const subscription = await razorpay.subscriptions.create({ /* new subscription */ });
return { checkoutUrl: subscription.short_url }; // Don't create new subscription!

// ✅ Correct: Update existing subscription
const updated = await razorpay.subscriptions.update(subscriptionId, {
  plan_id: newPlanId,
  schedule_change_at: 'now'
});
return { success: true }; // No checkout URL needed
```

---

### ❌ Misconception 4: "Update API fails if payment fails"

**Reality**: API returns 200 OK, payment attempted in background.

```typescript
// ❌ Wrong assumption
try {
  await razorpay.subscriptions.update(subId, { ... });
  // If we get here, payment succeeded ✅
} catch (error) {
  // Payment failed ❌
}

// ✅ Reality
await razorpay.subscriptions.update(subId, { ... });
// API succeeds even if payment will fail
// Must check webhook or poll to confirm payment
```

---

## Best Practices

### 1. Use Different Flows for Different Scenarios

```typescript
// Initial subscription: Full checkout flow
async function createSubscription(planId: string) {
  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: true
  });
  
  // Redirect to checkout
  return { checkoutUrl: subscription.short_url };
}

// Upgrade: Direct update
async function upgradeSubscription(subscriptionId: string, newPlanId: string) {
  await razorpay.subscriptions.update(subscriptionId, {
    plan_id: newPlanId,
    schedule_change_at: 'now'
  });
  
  // No checkout, return success
  return { success: true };
}
```

---

### 2. Handle Failures Appropriately

```typescript
// Initial subscription: User sees error immediately
// (happens on Razorpay checkout page, not your problem)

// Upgrade: Detect failure after API call
async function handleUpgrade(subId: string, newPlanId: string) {
  const oldPlanId = await getCurrentPlanId(subId);
  
  await razorpay.subscriptions.update(subId, {
    plan_id: newPlanId,
    schedule_change_at: 'now'
  });
  
  // Wait for webhook or poll
  setTimeout(async () => {
    const current = await razorpay.subscriptions.fetch(subId);
    
    if (current.plan_id === oldPlanId) {
      // Payment failed, notify user
      await sendFailureEmail(userId);
    }
  }, 5000);
}
```

---

### 3. Document User Experience

```typescript
// Initial subscription
/**
 * User will be redirected to Razorpay checkout page.
 * They must complete payment to activate subscription.
 * After payment, they'll be redirected back to our site.
 */

// Upgrade
/**
 * Upgrade happens in background using saved payment method.
 * User will see loading state, then success/failure message.
 * No additional payment details required.
 */
```

---

## Related Documentation

- **Part 19**: Create Subscription API
- **Part 23**: Update Subscription API  
- **Part 23B**: Immediate Update & Proration Details
- **Part 31**: Webhook Overview
- **Part 32**: subscription.authenticated & subscription.activated webhooks

---

**Last Updated**: November 24, 2025  
**Key Insight**: Verification only needed for user-facing redirects, not server-to-server API calls.
