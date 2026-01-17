# Razorpay Subscription Offers - Update and Delete

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 13 of Razorpay Official Documentation Series

---

## Table of Contents
1. [Update an Offer Linked to Subscription](#update-an-offer-linked-to-subscription)
2. [Delete an Offer Linked to Subscription](#delete-an-offer-linked-to-subscription)
3. [Implementation Guide](#implementation-guide)
4. [Common Scenarios](#common-scenarios)

---

## Update an Offer Linked to Subscription

### Overview

You can **link an offer** to a Subscription or **update the offer linked** to a Subscription from the Dashboard or using APIs.

### Prerequisites

✅ **Required Conditions**:
- Subscription must be in `active` state (not any other state)
- Offer is applied **at the end of the current billing cycle** only
- It is **NOT possible** to update an offer immediately

### Availability

Available in:
- 🇮🇳 **IN** - India only

---

### Update From Dashboard

**Steps**:

1. Log in to the Dashboard
2. Click **Subscriptions** under **PAYMENT PRODUCTS** in the left menu
3. Click on the **Subscription Id** for which you want to update the offer
4. Click **Update** button
5. The Update Subscription pop-up page appears
6. Click the **Offer drop-down** list
7. Select the **new offer** to be linked with the subscription
8. Select **End of Cycle** (only option available)
9. Click **Next**
10. Review the changes
11. Click **Update Subscription**

⚠️ **Watch Out!**: The new offer will be applied to the Subscription **only at the end of the cycle**. It is **not possible** to update an offer linked to a Subscription immediately.

---

### Update Using APIs

Use the **Update Subscription API** to change the offer.

**API Request**:
```javascript
const subscription = await razorpay.subscriptions.update(
  "sub_xxxxx", // Subscription ID
  {
    offer_id: "offer_yyyyy", // New offer ID
    schedule_change_at: "cycle_end" // Apply at end of cycle
  }
);
```

**cURL Example**:
```bash
curl -X PATCH https://api.razorpay.com/v1/subscriptions/sub_xxxxx \
  -u YOUR_KEY_ID:YOUR_SECRET \
  -H "Content-Type: application/json" \
  -d '{
    "offer_id": "offer_yyyyy",
    "schedule_change_at": "cycle_end"
  }'
```

**Response**:
```json
{
  "id": "sub_xxxxx",
  "entity": "subscription",
  "status": "active",
  "offer_id": "offer_yyyyy", // ✅ New offer linked
  "change_scheduled_at": 1735689600, // When it applies
  // ... other fields
}
```

---

### Example Scenario: Offer Update

**Timeline**:
```
Nov 1, 2025: Subscription starts with "Offer A" (10% off)
             Monthly billing: ₹4,999 → ₹4,499.10

Nov 15, 2025: Admin updates to "Offer B" (Flat ₹1,000 off)
              
Nov 30, 2025: Current cycle ends
              Final charge with Offer A: ₹4,499.10

Dec 1, 2025: NEW cycle starts with "Offer B"
             Monthly billing: ₹4,999 → ₹3,999 ✅

Dec 31, 2025: Cycle ends
              Charged with Offer B: ₹3,999
```

**Why This Matters**:
```
Customer sees during update:
"Your new offer will apply from Dec 1, 2025"

Nov 16-30: Still pays ₹4,499.10 (Offer A)
From Dec 1: Pays ₹3,999 (Offer B)

Clear communication prevents confusion!
```

---

## Delete an Offer Linked to Subscription

### Overview

You can **delete an offer linked to a Subscription** from the Dashboard or using APIs. 

**Important**: The invoices generated **after the offer is deleted** will be charged in **full** (no discount).

### Availability

Available in:
- 🇮🇳 **IN** - India only

---

### Delete From Dashboard

**Video Reference**: Watch this video to see how to delete an offer linked to a Subscription from the Dashboard (mentioned in official docs).

**Steps**:

1. Log in to the Dashboard
2. Click **Subscriptions** under **PAYMENT PRODUCTS** in the left menu
3. Click on the **Subscription Id** for which you want to remove the offer
4. Click **Remove** against **Offer**
5. Click **Yes, Remove**

⚠️ **Watch Out!**: The offer will be **removed from the Subscription only at the end of the cycle**. It is **not possible** to remove an offer linked to a Subscription immediately.

---

### Delete Using APIs

You can delete an offer linked to a Subscription using the **Delete Offer API**.

**API Request**:
```javascript
const result = await razorpay.subscriptions.deleteOffer(
  subscriptionId, // "sub_xxxxx"
  offerId         // "offer_xxxxx"
);
```

**cURL Example**:
```bash
curl -X DELETE https://api.razorpay.com/v1/subscriptions/sub_xxxxx/offer \
  -u YOUR_KEY_ID:YOUR_SECRET
```

**Node.js Example**:
```javascript
var instance = new Razorpay({ 
  key_id: 'YOUR_KEY_ID', 
  key_secret: 'YOUR_SECRET' 
});

instance.subscriptions.deleteOffer(subscriptionId, offerId)
  .then(result => {
    console.log('Offer removed successfully');
  })
  .catch(error => {
    console.error('Error removing offer:', error);
  });
```

**Response**:
```json
{
  "id": "sub_xxxxx",
  "entity": "subscription",
  "status": "active",
  "offer_id": null, // ✅ Offer removed (will apply end of cycle)
  "change_scheduled_at": 1735689600,
  // ... other fields
}
```

---

### Example Scenario: Offer Deletion

**Timeline**:
```
Nov 1, 2025: Subscription with "10% off forever" offer
             Monthly billing: ₹4,999 → ₹4,499.10

Nov 15, 2025: Admin removes the offer
              
Nov 30, 2025: Current cycle ends
              Final charge with offer: ₹4,499.10

Dec 1, 2025: NEW cycle starts without offer
             Monthly billing: ₹4,999 (full price) ✅

Dec 31, 2025: Cycle ends
              Charged full price: ₹4,999
```

**Financial Impact**:
```
With Offer (Nov 1 - Nov 30):
Monthly charge: ₹4,499.10
Discount: ₹499.90

Without Offer (Dec 1 onwards):
Monthly charge: ₹4,999.00
Discount: ₹0.00

Customer pays ₹499.90 more per month after Dec 1
```

---

## Implementation Guide

### Scenario 1: Replace Offer with Better One

**Use Case**: Customer complains about pricing, you want to upgrade their offer

**Implementation**:

```typescript
// src/app/api/subscription/update-offer/route.ts

export async function POST(req: Request) {
  const { subscriptionId, newOfferId, reason } = await req.json();
  
  // Get current subscription
  const currentSub = await prisma.subscription.findUnique({
    where: { razorpay_subscription_id: subscriptionId },
    include: { user: true }
  });
  
  if (!currentSub) {
    return Response.json({ error: 'Subscription not found' }, { status: 404 });
  }
  
  // Verify subscription is active
  if (currentSub.status !== 'active') {
    return Response.json(
      { error: 'Can only update offers on active subscriptions' },
      { status: 400 }
    );
  }
  
  // Get old and new offer details
  const oldOffer = currentSub.metadata?.offer_id;
  const oldOfferDetails = oldOffer ? await getOfferDetails(oldOffer) : null;
  const newOfferDetails = await getOfferDetails(newOfferId);
  
  // Update via Razorpay API
  const updatedSub = await razorpay.subscriptions.update(
    subscriptionId,
    {
      offer_id: newOfferId,
      schedule_change_at: 'cycle_end'
    }
  );
  
  // Update database
  await prisma.subscription.update({
    where: { razorpay_subscription_id: subscriptionId },
    data: {
      metadata: {
        ...currentSub.metadata,
        previous_offer_id: oldOffer,
        new_offer_id: newOfferId,
        offer_update_reason: reason,
        offer_update_date: new Date().toISOString(),
        offer_applies_at: updatedSub.change_scheduled_at
      }
    }
  });
  
  // Log the change for audit
  await prisma.subscriptionChangeLog.create({
    data: {
      subscriptionId: currentSub.id,
      change_type: 'offer_update',
      old_value: oldOffer,
      new_value: newOfferId,
      reason: reason,
      applied_by: 'admin', // or userId if customer-initiated
      scheduled_at: new Date(updatedSub.change_scheduled_at * 1000)
    }
  });
  
  // Notify customer
  await sendEmail({
    to: currentSub.user.email,
    subject: 'Great News! We\'ve Updated Your Subscription Offer',
    template: 'offer_upgraded',
    data: {
      oldOffer: oldOfferDetails?.name || 'Previous offer',
      newOffer: newOfferDetails.name,
      appliesFrom: formatDate(updatedSub.change_scheduled_at),
      newDiscount: calculateDiscount(currentSub.plan, newOfferDetails)
    }
  });
  
  return Response.json({ 
    success: true,
    message: 'Offer updated successfully',
    applies_at: updatedSub.change_scheduled_at 
  });
}
```

---

### Scenario 2: Remove Offer (Customer Abuse)

**Use Case**: Customer found a loophole, using offer multiple times with different emails

**Implementation**:

```typescript
// src/app/api/subscription/remove-offer/route.ts

export async function POST(req: Request) {
  const { subscriptionId, reason, notifyCustomer } = await req.json();
  
  // Get subscription
  const subscription = await prisma.subscription.findUnique({
    where: { razorpay_subscription_id: subscriptionId },
    include: { user: true }
  });
  
  if (!subscription) {
    return Response.json({ error: 'Subscription not found' }, { status: 404 });
  }
  
  const currentOffer = subscription.metadata?.offer_id;
  
  if (!currentOffer) {
    return Response.json(
      { error: 'No offer linked to this subscription' },
      { status: 400 }
    );
  }
  
  // Remove offer via Razorpay API
  try {
    await razorpay.subscriptions.deleteOffer(
      subscriptionId,
      currentOffer
    );
    
    // Update database
    await prisma.subscription.update({
      where: { razorpay_subscription_id: subscriptionId },
      data: {
        metadata: {
          ...subscription.metadata,
          removed_offer_id: currentOffer,
          offer_removal_reason: reason,
          offer_removal_date: new Date().toISOString(),
          offer_removed_by: 'admin'
        }
      }
    });
    
    // Log for compliance/audit
    await prisma.subscriptionChangeLog.create({
      data: {
        subscriptionId: subscription.id,
        change_type: 'offer_removed',
        old_value: currentOffer,
        new_value: null,
        reason: reason,
        applied_by: 'admin'
      }
    });
    
    // Optionally notify customer
    if (notifyCustomer) {
      await sendEmail({
        to: subscription.user.email,
        subject: 'Important: Subscription Offer Update',
        body: `
          Due to ${reason}, the promotional offer on your subscription 
          has been removed. Starting from your next billing cycle, 
          you'll be charged the regular plan price.
          
          If you have questions, please contact support.
        `
      });
    }
    
    return Response.json({ 
      success: true,
      message: 'Offer removed successfully' 
    });
    
  } catch (error) {
    console.error('Error removing offer:', error);
    return Response.json(
      { error: 'Failed to remove offer' },
      { status: 500 }
    );
  }
}
```

---

### Scenario 3: Scheduled Offer Removal

**Use Case**: Limited-time offer automatically expires after X months

**Implementation**:

```typescript
// src/cron/check-offer-expiry.ts

export async function checkAndRemoveExpiredOffers() {
  // Get all subscriptions with temporary offers
  const subsWithTempOffers = await prisma.subscription.findMany({
    where: {
      status: 'active',
      metadata: {
        path: ['offer_type'],
        equals: 'limited'
      }
    }
  });
  
  for (const sub of subsWithTempOffers) {
    const offerData = sub.metadata as any;
    const cyclesRemaining = offerData.cycles_remaining || 0;
    const currentCycle = offerData.current_cycle || 1;
    
    // Check if offer should expire
    if (currentCycle >= cyclesRemaining) {
      console.log(`Removing expired offer from subscription ${sub.id}`);
      
      try {
        // Remove offer via API
        await razorpay.subscriptions.deleteOffer(
          sub.razorpay_subscription_id,
          offerData.offer_id
        );
        
        // Update database
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            metadata: {
              ...offerData,
              offer_expired: true,
              offer_expired_at: new Date().toISOString()
            }
          }
        });
        
        // Notify customer
        await sendEmail({
          to: sub.user.email,
          subject: 'Your Promotional Period Has Ended',
          template: 'offer_expired',
          data: {
            plan: sub.plan_name,
            discounted_cycles: cyclesRemaining,
            next_charge_date: sub.current_end,
            regular_price: sub.plan_amount
          }
        });
        
      } catch (error) {
        console.error(`Failed to remove offer for sub ${sub.id}:`, error);
      }
    }
  }
}

// Run this cron job daily
// In vercel.json or similar:
// {
//   "crons": [{
//     "path": "/api/cron/check-offer-expiry",
//     "schedule": "0 0 * * *"
//   }]
// }
```

---

## Common Scenarios

### Scenario 1: Upgrade Customer Offer

**Situation**: Long-term customer, want to reward loyalty

```typescript
async function upgradeCustomerOffer(userId: string) {
  const subscription = await getCurrentSubscription(userId);
  
  // Current: 10% off offer
  // Upgrade to: 20% off offer
  
  await updateSubscriptionOffer(
    subscription.razorpay_subscription_id,
    LOYALTY_OFFER_20_PERCENT,
    'Loyalty reward for 12+ months'
  );
  
  // Customer sees:
  // "Thank you for being with us for a year! 
  //  We've upgraded your discount from 10% to 20% 
  //  starting next month."
}
```

### Scenario 2: Downgrade Offer (Partner Deal Ended)

**Situation**: Bank partnership ended, need to remove bank-specific offer

```typescript
async function removeBankOffer(bankName: string) {
  // Find all subscriptions with this bank's offer
  const affectedSubs = await prisma.subscription.findMany({
    where: {
      metadata: {
        path: ['offer_name'],
        string_contains: bankName
      }
    }
  });
  
  for (const sub of affectedSubs) {
    // Remove offer
    await razorpay.subscriptions.deleteOffer(
      sub.razorpay_subscription_id,
      sub.metadata.offer_id
    );
    
    // Notify 30 days in advance
    await sendEmail({
      to: sub.user.email,
      subject: `Important: ${bankName} Partnership Offer Ending`,
      body: `
        Our promotional partnership with ${bankName} is ending.
        Your current discount will continue until ${sub.current_end}.
        From the next cycle, regular pricing applies.
        
        Current discounted price: ₹X
        New price starting next cycle: ₹Y
      `
    });
  }
}
```

### Scenario 3: Replace Offer (Better Deal Available)

**Situation**: New offer launched, migrate existing customers

```typescript
async function migrateToNewOffer(oldOfferId: string, newOfferId: string) {
  const affectedSubs = await prisma.subscription.findMany({
    where: {
      metadata: {
        path: ['offer_id'],
        equals: oldOfferId
      }
    }
  });
  
  console.log(`Migrating ${affectedSubs.length} subscriptions to new offer`);
  
  for (const sub of affectedSubs) {
    try {
      // Update to new offer
      await razorpay.subscriptions.update(
        sub.razorpay_subscription_id,
        {
          offer_id: newOfferId,
          schedule_change_at: 'cycle_end'
        }
      );
      
      // Notify customer about upgrade
      await sendEmail({
        to: sub.user.email,
        subject: 'Great News! We\'re Upgrading Your Offer',
        body: `
          We're automatically upgrading your subscription offer!
          You'll get an even better discount starting next cycle.
          No action required on your part.
        `
      });
      
    } catch (error) {
      console.error(`Failed to migrate subscription ${sub.id}:`, error);
      // Log failed migrations for manual review
      await logFailedMigration(sub.id, error);
    }
  }
}
```

### Scenario 4: Conditional Offer Removal

**Situation**: Remove offer if customer downgrades plan

```typescript
async function handlePlanDowngrade(
  subscriptionId: string,
  newPlanId: string
) {
  const subscription = await getSubscription(subscriptionId);
  const currentOffer = subscription.metadata?.offer_id;
  
  if (currentOffer) {
    const offerDetails = await getOfferDetails(currentOffer);
    
    // Check if offer is valid for new plan
    if (!offerDetails.applicable_plans.includes(newPlanId)) {
      console.log('Offer not applicable to new plan, removing...');
      
      // Remove offer
      await razorpay.subscriptions.deleteOffer(
        subscriptionId,
        currentOffer
      );
      
      // Notify customer
      await sendEmail({
        to: subscription.user.email,
        subject: 'Subscription Plan Change',
        body: `
          Your plan has been changed. Please note:
          - New plan: ${getNewPlanName(newPlanId)}
          - Your previous promotional offer is not available on this plan
          - New pricing: ${getNewPlanPrice(newPlanId)}
        `
      });
    }
  }
}
```

---

## Best Practices

### 1. Always Communicate Timing

```typescript
// ✅ Good: Clear communication
"Your new discount of 20% will apply starting from your next 
billing cycle on Dec 1, 2025. Your current cycle (ending Nov 30) 
will continue at the current discounted rate of 10%."

// ❌ Poor: Vague
"We've updated your offer."
```

### 2. Track Offer Changes

```typescript
// Maintain audit log
interface OfferChangeLog {
  subscription_id: string;
  timestamp: Date;
  change_type: 'added' | 'updated' | 'removed';
  old_offer_id: string | null;
  new_offer_id: string | null;
  reason: string;
  changed_by: string; // 'admin' | 'system' | 'customer'
  scheduled_at: Date;
}
```

### 3. Handle Edge Cases

```typescript
// What if customer cancels before offer applies?
if (subscription.cancel_at_cycle_end && hasScheduledOfferChange) {
  // Offer change won't happen (sub will be cancelled first)
  await notifyAdmin('Offer change scheduled but sub cancelling');
}

// What if customer upgrades before offer applies?
if (hasScheduledOfferChange && userWantsToUpgrade) {
  // Give options:
  // 1. Wait for offer to apply, then upgrade
  // 2. Upgrade now, forfeit scheduled offer
  // 3. Upgrade now, carry offer to new plan (if applicable)
}
```

### 4. Refund Considerations

```
Question: If I remove an offer mid-cycle, do I refund the discount?

Answer: No. Razorpay applies changes at end of cycle.
- Customer keeps discount for current cycle
- New pricing starts next cycle
- No refunds needed
- Simpler accounting
```

---

## Related Documentation

- Part 10: [Offers Overview](./10_RAZORPAY_OFFERS_OVERVIEW.md)
- Part 11: [Create Subscription Offers](./11_RAZORPAY_OFFERS_CREATE.md)
- Part 12: [Link Offers to Subscriptions](./12_RAZORPAY_OFFERS_LINK.md)
- Razorpay API: [Subscription API Reference](https://razorpay.com/docs/api/subscriptions/)
