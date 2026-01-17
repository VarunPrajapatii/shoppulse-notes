# Razorpay Subscription Offers - Link to Subscriptions

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 12 of Razorpay Official Documentation Series

---

## Table of Contents
1. [Overview](#overview)
2. [Link Offer When Creating Subscription](#link-offer-when-creating-subscription)
3. [Link Offer to Existing Subscription](#link-offer-to-existing-subscription)
4. [Important Limitations](#important-limitations)
5. [Implementation Guide](#implementation-guide)

---

## Overview

After creating an offer and a Subscription Plan, you need to **link the Offer to a Subscription**.

### Two Linking Scenarios

```
Scenario 1: Link when CREATING a new Subscription
           ↓
         New subscription gets offer from start

Scenario 2: Link to EXISTING active Subscription
           ↓
         Existing subscription gets offer at end of cycle
```

### Availability

Available in:
- 🇮🇳 **IN** - India only

---

## Link Offer When Creating Subscription

### Important Requirement

⚠️ **Watch Out!**: Offers for Subscriptions are **only available when using Razorpay Standard Checkout**.

**What This Means**:
```
✅ Supported: Razorpay Standard Checkout (razorpay.js library)
❌ Not Supported: 
   - Custom payment pages without Razorpay checkout
   - Third-party payment gateways
   - Manual payment collection
```

### Method 1: From Dashboard

**Video Reference**: Watch this video to see how to link an Offer to a Subscription (mentioned in official docs).

**Steps**:

1. Navigate to Subscriptions creation page
2. Follow the subscription creation flow (covered in Part 5)
3. When you reach the **Offer selection** step
4. Click the **Offer drop-down**
5. Select the required offer from the list
6. Continue with subscription creation

**Visual**: Link offer when creating a subscription (image available in official docs)

**Example Flow**:
```
Step 1: Create New Subscription
Step 2: Select Plan → "MIDI Plan (₹4,999/month)"
Step 3: Set Start Date → "Immediate"
Step 4: Enter Total Count → "12 cycles"
Step 5: SELECT OFFER → "New User Welcome - ₹1000 off" ✨
Step 6: Enter customer details
Step 7: Create Subscription Link
```

Know more about [Subscription Links](./5_RAZORPAY_CREATE_SUBSCRIPTIONS_VIA_LINKS.md).

### Method 2: Using APIs

You can link an Offer to a Subscription while creating the Subscription using the **Create Subscription API**.

**API Request Example**:
```javascript
const subscription = await razorpay.subscriptions.create({
  plan_id: "plan_xxxxx",
  customer_notify: 1,
  quantity: 1,
  total_count: 12,
  start_at: Math.floor(Date.now() / 1000), // Current timestamp
  offer_id: "offer_xxxxx", // 🎯 Link the offer here
  notes: {
    user_id: "user_123",
    plan_name: "MIDI"
  }
});
```

**Key Parameter**:
```
offer_id: "offer_xxxxx"
```

**Response**:
```json
{
  "id": "sub_xxxxx",
  "entity": "subscription",
  "plan_id": "plan_xxxxx",
  "status": "created",
  "offer_id": "offer_xxxxx", // ✅ Offer linked
  "customer_notify": 1,
  "quantity": 1,
  "total_count": 12,
  // ... other fields
}
```

---

## Link Offer to Existing Subscription

### Prerequisites

✅ **Required Conditions**:
1. Subscription must be in `active` state
2. Cannot link to subscriptions in `created`, `authenticated`, `pending`, `halted`, `cancelled`, or `paused` states

❌ **Not Allowed**:
```
Subscription in "created" state → Cannot link offer
Subscription in "pending" state → Cannot link offer
Subscription in "halted" state → Cannot link offer
Subscription in "cancelled" state → Cannot link offer
Subscription in "paused" state → Cannot link offer

Only "active" state → Can link offer ✅
```

### Important Timing Rule

⏰ **Critical**: The Offer is applied to the Subscription **at the end of the current billing cycle**. It is **NOT possible** to update an Offer linked to a Subscription immediately.

**Why End of Cycle Only?**

```
Reason 1: Payment Already Made
- Current cycle is already paid in full
- Razorpay cannot retroactively apply discount
- Would require refund/credit processing (complex)

Reason 2: Billing Simplicity
- Each cycle has fixed charge amount
- Changing mid-cycle complicates accounting
- End of cycle = clean slate

Reason 3: Customer Clarity
- Customer knows what they're paying this cycle
- Offer applies to next cycle (clear expectation)
- No confusion about partial discounts
```

**Example Timeline**:
```
Nov 1: Subscription starts (₹4,999/month MIDI plan)
Nov 15: Admin links "10% off forever" offer to subscription
Nov 30: Current cycle ends
Dec 1: NEW cycle starts with 10% off (₹4,499.10)
Dec 31: Cycle ends
Jan 1: Another cycle with 10% off (₹4,499.10)
... continues with discount
```

### Method 1: From Dashboard

**Steps**:

1. Log in to the Dashboard
2. Click **Subscriptions** under **PAYMENT PRODUCTS**
3. Click the **Subscription Id** you want to update
4. Click **Update** button
5. The Update Subscription pop-up appears
6. Click the **Offer drop-down**
7. Select the offer to link
8. Select **End of Cycle** (only option available)
9. Click **Next**
10. Review changes
11. Click **Update Subscription**

**Visual**: Link an offer to an existing active subscription (image available in official docs)

**Dashboard UI Flow**:
```
Subscription Details Page:
┌─────────────────────────────────┐
│ Subscription ID: sub_xxxxx      │
│ Status: Active                  │
│ Plan: MIDI (₹4,999/month)       │
│ Current Offer: None             │
│                                 │
│ [Update Subscription] [Cancel]  │
└─────────────────────────────────┘

After clicking Update:
┌─────────────────────────────────┐
│ Update Subscription             │
│                                 │
│ Offer: [Select Offer ▼]        │
│   ○ No Offer                    │
│   ● New User Welcome            │
│   ○ UPI Special                 │
│                                 │
│ Apply Changes:                  │
│   ○ Immediately (disabled)      │
│   ● End of Cycle ✅             │
│                                 │
│ [Next]                          │
└─────────────────────────────────┘
```

Know more about [Updating a Subscription](./7_RAZORPAY_UPDATE_SUBSCRIPTION.md).

### Method 2: Using APIs

You can link an Offer to an existing active Subscription using the **Update Subscription API**.

**API Request Example**:
```javascript
const subscription = await razorpay.subscriptions.update(
  "sub_xxxxx", // Subscription ID
  {
    offer_id: "offer_xxxxx", // 🎯 Link the new offer
    schedule_change_at: "cycle_end" // Apply at end of cycle
  }
);
```

**Key Parameters**:
```javascript
{
  offer_id: "offer_xxxxx",           // The offer to link
  schedule_change_at: "cycle_end"    // When to apply (only option)
}
```

**Response**:
```json
{
  "id": "sub_xxxxx",
  "entity": "subscription",
  "status": "active",
  "offer_id": "offer_xxxxx", // ✅ Offer linked (will apply next cycle)
  "change_scheduled_at": 1735689600, // Timestamp when offer applies
  "current_start": 1733097600,
  "current_end": 1735689600,
  // ... other fields
}
```

**Curl Example**:
```bash
curl -X PATCH https://api.razorpay.com/v1/subscriptions/sub_xxxxx \
  -u YOUR_KEY_ID:YOUR_SECRET \
  -H "Content-Type: application/json" \
  -d '{
    "offer_id": "offer_xxxxx",
    "schedule_change_at": "cycle_end"
  }'
```

---

## Important Limitations

### 1. Checkout Requirement

**Only Razorpay Standard Checkout Supported**:

```typescript
// ✅ This works - Standard Checkout
const options = {
  key: process.env.RAZORPAY_KEY_ID,
  subscription_id: subscriptionId,
  name: 'ShopPulse',
  // Offer will be displayed automatically if linked
};

const razorpay = new window.Razorpay(options);
razorpay.open();

// ❌ This won't show offers - Custom checkout
// If you build custom payment page without Razorpay.js
```

### 2. State Restriction

**Only Active Subscriptions**:

```
Cannot Link Offer To:
❌ created - Subscription just created, not authenticated yet
❌ authenticated - Payment authorized, but not yet active
❌ pending - Payment issues, awaiting resolution
❌ halted - Subscription stopped due to payment failures
❌ cancelled - Subscription cancelled (terminal state)
❌ paused - Subscription temporarily paused

Can Link Offer To:
✅ active - Subscription is running normally
```

**Practical Impact**:
```
Scenario: Want to give customer a retention offer

Check subscription status:
if (subscription.status !== 'active') {
  throw new Error('Cannot link offer to inactive subscription');
}

// Only proceed if active
await razorpay.subscriptions.update(subscriptionId, {
  offer_id: offerId,
  schedule_change_at: 'cycle_end'
});
```

### 3. Timing Restriction

**No Immediate Application**:

```
User Request: "I want the discount applied RIGHT NOW!"
Your Response: "The discount will be applied from your next billing cycle."

Why?
- Current cycle is already paid
- System cannot change past transactions
- Next cycle = clean implementation
```

**Managing Customer Expectations**:
```typescript
// In your UI when linking offer
<Alert>
  <InfoIcon />
  <AlertTitle>Offer Will Apply Next Cycle</AlertTitle>
  <AlertDescription>
    Your current billing cycle is already paid (₹4,999).
    The 10% discount will apply starting from your next cycle on Dec 1, 2025.
    Next cycle amount: ₹4,499.10
  </AlertDescription>
</Alert>
```

### 4. Single Offer Limitation

**One Offer Per Subscription**:

```
Cannot Stack Offers:
❌ "New User" offer + "UPI Special" offer
❌ "10% off" + "₹500 flat discount"

Can Replace Offers:
✅ Change from "10% off" to "₹500 flat discount"
✅ Remove old offer, add new offer
```

**Offer Replacement Flow**:
```
Current: Subscription has "Offer A" (10% off)
Action: Link "Offer B" (₹500 flat)
Result: 
- Current cycle: Still uses Offer A
- Next cycle: Switches to Offer B
- Offer A is replaced, not stacked
```

---

## Implementation Guide

### Scenario 1: New Subscription with Offer

**Use Case**: User signs up and selects an offer on checkout

**Implementation**:

```typescript
// src/app/api/subscription/create/route.ts

export async function POST(req: Request) {
  const { planId, userId, offerId } = await req.json();
  
  // Create Razorpay subscription with offer
  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    quantity: 1,
    total_count: 12,
    offer_id: offerId, // 🎯 Include offer at creation
    notes: {
      user_id: userId,
      plan_name: getPlanName(planId)
    }
  });
  
  // Store in database with offer metadata
  await prisma.subscription.create({
    data: {
      userId,
      razorpay_subscription_id: subscription.id,
      razorpay_plan_id: planId,
      status: subscription.status,
      metadata: {
        offer_id: offerId,
        offer_applied_at: 'creation',
        original_amount: subscription.plan.item.amount,
        // Discount will be reflected in first invoice
      }
    }
  });
  
  return Response.json({ subscription });
}
```

**Frontend - Show Available Offers**:

```typescript
// src/components/SubscriptionCheckout.tsx

export function SubscriptionCheckout({ plan }: Props) {
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [availableOffers, setAvailableOffers] = useState([]);
  
  // Fetch applicable offers for this plan
  useEffect(() => {
    fetch(`/api/offers/available?plan=${plan.id}`)
      .then(res => res.json())
      .then(data => setAvailableOffers(data.offers));
  }, [plan.id]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{plan.name} Plan</CardTitle>
        <CardDescription>₹{plan.amount}/month</CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Offer Selection */}
        {availableOffers.length > 0 && (
          <div className="space-y-2">
            <Label>Select an Offer (Optional)</Label>
            <Select 
              value={selectedOffer || "none"} 
              onValueChange={setSelectedOffer}
            >
              <SelectTrigger>
                <SelectValue placeholder="No offer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No offer</SelectItem>
                {availableOffers.map(offer => (
                  <SelectItem key={offer.id} value={offer.id}>
                    {offer.name} - {offer.display_text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Show discount preview */}
            {selectedOffer && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  You'll save {calculateDiscount(plan, selectedOffer)} 
                  on your subscription!
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        <Button 
          onClick={() => createSubscription(plan.id, selectedOffer)}
          className="w-full"
        >
          Subscribe Now
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Scenario 2: Link Offer to Existing Subscription

**Use Case**: Admin wants to give existing customer a retention offer

**Implementation**:

```typescript
// src/app/api/subscription/link-offer/route.ts

export async function POST(req: Request) {
  const { subscriptionId, offerId } = await req.json();
  
  // Get current subscription from database
  const currentSub = await prisma.subscription.findUnique({
    where: { razorpay_subscription_id: subscriptionId }
  });
  
  // Verify subscription is active
  if (currentSub?.status !== 'active') {
    return Response.json(
      { error: 'Can only link offers to active subscriptions' },
      { status: 400 }
    );
  }
  
  // Update via Razorpay API
  const updatedSub = await razorpay.subscriptions.update(
    subscriptionId,
    {
      offer_id: offerId,
      schedule_change_at: 'cycle_end'
    }
  );
  
  // Update database
  await prisma.subscription.update({
    where: { razorpay_subscription_id: subscriptionId },
    data: {
      metadata: {
        ...currentSub.metadata,
        pending_offer_id: offerId,
        offer_applies_at: updatedSub.change_scheduled_at,
        offer_linked_at: new Date().toISOString()
      }
    }
  });
  
  // Notify customer
  await sendEmail({
    to: currentSub.user.email,
    subject: 'Special Offer Added to Your Subscription',
    body: `
      Good news! We've added a special offer to your subscription.
      Starting from your next billing cycle, you'll enjoy [discount details].
      Next billing date: ${formatDate(updatedSub.current_end)}
    `
  });
  
  return Response.json({ 
    success: true,
    applies_at: updatedSub.change_scheduled_at 
  });
}
```

**Admin Dashboard UI**:

```typescript
// src/app/(dashboard)/admin/subscriptions/[id]/page.tsx

export default function SubscriptionDetailPage({ params }: Props) {
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState('');
  
  const handleLinkOffer = async () => {
    const res = await fetch('/api/subscription/link-offer', {
      method: 'POST',
      body: JSON.stringify({
        subscriptionId: params.id,
        offerId: selectedOffer
      })
    });
    
    if (res.ok) {
      toast.success('Offer linked! Will apply at end of current cycle.');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Link Offer to Subscription</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Select value={selectedOffer} onValueChange={setSelectedOffer}>
          <SelectTrigger>
            <SelectValue placeholder="Select an offer" />
          </SelectTrigger>
          <SelectContent>
            {offers.map(offer => (
              <SelectItem key={offer.id} value={offer.id}>
                {offer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The offer will be applied at the end of the current billing cycle.
            Customer will be notified via email.
          </AlertDescription>
        </Alert>
        
        <Button onClick={handleLinkOffer} disabled={!selectedOffer}>
          Link Offer
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Webhook Handling

**Track Offer Application**:

```typescript
// src/app/api/webhook/razorpay/subscription/route.ts

export async function POST(req: Request) {
  const payload = await req.json();
  const event = payload.event;
  
  switch (event) {
    case 'subscription.updated':
      // Offer may have been linked
      const sub = payload.payload.subscription.entity;
      
      if (sub.offer_id) {
        await prisma.subscription.update({
          where: { razorpay_subscription_id: sub.id },
          data: {
            metadata: {
              current_offer_id: sub.offer_id,
              offer_status: 'active'
            }
          }
        });
      }
      break;
      
    case 'subscription.charged.successfully':
      // Check if discount was applied
      const invoice = payload.payload.payment.entity;
      const subscription = payload.payload.subscription.entity;
      
      if (subscription.offer_id) {
        // Log discount amount for analytics
        await prisma.invoiceLog.create({
          data: {
            subscriptionId: subscription.id,
            amount: invoice.amount,
            discount_applied: invoice.offer_amount || 0,
            offer_id: subscription.offer_id
          }
        });
      }
      break;
  }
  
  return Response.json({ status: 'ok' });
}
```

---

## Related Documentation

- Part 10: [Offers Overview](./10_RAZORPAY_OFFERS_OVERVIEW.md)
- Part 11: [Create Subscription Offers](./11_RAZORPAY_OFFERS_CREATE.md)
- Part 13: [Update Offers](./13_RAZORPAY_OFFERS_UPDATE.md) (Next)
- Part 14: [Delete Offers](./14_RAZORPAY_OFFERS_DELETE.md)
- Part 7: [Update Subscriptions](./7_RAZORPAY_UPDATE_SUBSCRIPTION.md)
