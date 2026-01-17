r# Part 23B: Update Subscription - Immediate Updates & Proration Details

## Overview

This document provides detailed information about **immediate subscription updates** and how Razorpay handles proration, charges, and refunds when you update a subscription with `schedule_change_at: 'now'`.

**Related**: Part 23 (Update Subscription API)

---

## Immediate Update Behavior

When you update a subscription immediately using `schedule_change_at: 'now'`, Razorpay may need to:

1. **Charge the customer extra** (upgrades, quantity increase)
2. **Refund the customer** (downgrades, quantity decrease)
3. **No adjustment** (if amounts are equal)

---

## Critical Rules for Immediate Updates

### Rule 1: Minimum Amount Difference

⚠️ **Official Requirement**: The prorated amount difference must be at least ₹0.50 (50 currency subunits)

**Official Description**: When you update a Subscription, Razorpay calculates the prorated amount that needs to be charged or refunded. If this amount is less than the minimum amount (₹0.50 for INR), the update will fail.

```javascript
// Example: Upgrade that's too small
Current plan: ₹100/month (20 days remaining = ₹66.67 unused)
New plan: ₹101/month
Difference: ₹101 - ₹66.67 = ₹34.33 ✅ (above ₹0.50)

// Example: Upgrade rejected
Current plan: ₹100/month (29 days remaining = ₹96.67 unused)
New plan: ₹100.50/month  
Difference: ₹100.50 - ₹96.67 = ₹3.83 ✅ (above ₹0.50)

// Example: Too small difference
Current plan: ₹100/month (29.5 days remaining = ₹98.33 unused)
New plan: ₹100.20/month
Difference: ₹100.20 - ₹98.33 = ₹1.87... but after rounding might be < ₹0.50 ❌
```

**Error Response**:
```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "The difference amount after updating subscription is less than the minimum amount"
  }
}
```

---

### Rule 2: Subscription State Requirements

**Official Requirement**: Subscriptions can only be updated when they are in the `authenticated` or `active` state.

You can only update subscriptions in these states:
- ✅ `authenticated` - Customer has authorized but first charge hasn't occurred
- ✅ `active` - Subscription is running with successful charges

Cannot update:
- ❌ `created` (not authorized yet)
- ❌ `pending` (payment issues)
- ❌ `halted` (all retries failed)
- ❌ `cancelled` (already cancelled)
- ❌ `completed` (subscription ended normally)
- ❌ `expired` (authorization window expired)

---

### Rule 3: Payment Method Restrictions

**Official Restriction**: UPI and Emandate subscriptions cannot be updated.

❌ **Cannot update UPI/Emandate subscriptions**

```javascript
// Check before updating
const subscription = await razorpay.subscriptions.fetch(subId);

if (['upi', 'emandate'].includes(subscription.payment_method)) {
  throw new Error('UPI/Emandate subscriptions cannot be updated. Customer must cancel and create new subscription.');
}
```

---

## How Razorpay Handles Charges and Refunds

### Scenario A: Charge Customer Extra (Upgrades)

**Official Behavior**: When updating a subscription results in a higher charge, Razorpay automatically creates an invoice and attempts to charge the customer's saved payment method for the prorated difference.

When upgrading a plan or increasing quantity:

1. **Razorpay creates an Invoice** for the prorated difference amount
2. **Charges the saved payment method** automatically
3. **If charge succeeds**:
   - Invoice sent to customer (if `customer_notify: true`)
   - `subscription.updated` webhook fires
   - Subscription updated with new plan
4. **If charge fails**:
   - Subscription is NOT updated
   - Customer stays on old plan
   - You must handle retry or notify customer

**Example Flow**:
```javascript
// Current: MINI plan ₹299/month, 20 days remaining
// Unused credit: ₹299 × (20/30) = ₹199.33
// New: MIDI plan ₹599/month
// Charge amount: ₹599 - ₹199.33 = ₹399.67

await razorpay.subscriptions.update(subId, {
  plan_id: 'plan_midi',
  schedule_change_at: 'now',
  customer_notify: true
});

// Razorpay automatically:
// 1. Creates invoice for ₹399.67
// 2. Charges customer's card
// 3. If successful: subscription.updated webhook
// 4. If failed: No update, subscription stays on MINI
```

---

### Scenario B: Refund Customer (Downgrades)

**Official Behavior**: When updating a subscription results in a lower charge, Razorpay automatically creates a credit note and refunds the prorated difference to the customer's original payment method.

When downgrading a plan or reducing quantity:

1. **Razorpay creates a Credit Note** for the prorated refund amount
2. **Refunds automatically** to the customer's original payment method
3. `subscription.updated` webhook fires
4. Customer receives refund confirmation

**Credit Note Details**:
- Created against total payments, not individual invoices
- Only one credit note even if multiple invoices involved
- Two states:
  - `created`: Initial state, refund processing
  - `refunded`: Final state, refund complete
- Visible on Dashboard under the subscription

**Example Flow**:
```javascript
// Current: MAXI plan ₹1,999/month, 10 days remaining
// Unused credit: ₹1,999 × (10/30) = ₹666.33
// New: MIDI plan ₹599/month
// Refund amount: ₹666.33 - ₹599 = ₹67.33

await razorpay.subscriptions.update(subId, {
  plan_id: 'plan_midi',
  schedule_change_at: 'now',
  customer_notify: true
});

// Razorpay automatically:
// 1. Creates credit note for ₹67.33
// 2. Refunds to customer's card
// 3. subscription.updated webhook fires
// 4. Customer receives refund confirmation email
```

---

## Proration Calculation Formula

**Official Method**: Razorpay uses a **per-day rate calculation** to determine prorated charges or refunds when a subscription is updated immediately.

### Step 1: Calculate Plan Amount Per Day

**Official Formula**:

```
Plan Amount Per Day = (Plan Amount × Quantity) / Frequency in Days
```

**Examples**:
```javascript
// Monthly plan
Plan: ₹300, Quantity: 1, Frequency: 30 days
Per Day: (₹300 × 1) / 30 = ₹10/day

// Yearly plan  
Plan: ₹10,950, Quantity: 1, Frequency: 365 days
Per Day: (₹10,950 × 1) / 365 = ₹30/day

// Multi-user plan
Plan: ₹1,000, Quantity: 3 users, Frequency: 30 days
Per Day: (₹1,000 × 3) / 30 = ₹100/day
```

---

### Step 2: Calculate Days to be Charged

```
Days to be Charged = Plan Change Day - 1
(Since customers are charged at end of day)
```

**Examples**:
```javascript
// Change on Day 1 (immediately after activation)
Days Charged: 1 - 1 = 0 days

// Change on Day 15 (mid-cycle)
Days Charged: 15 - 1 = 14 days

// Change on Day 27
Days Charged: 27 - 1 = 26 days
```

---

### Step 3: Calculate Remaining Days

```
Remaining Days = Frequency in Days - Days to be Charged
```

**Examples**:
```javascript
// Monthly plan, changed on Day 15
Remaining: 30 - 14 = 16 days

// Yearly plan, changed on Day 245
Remaining: 365 - 244 = 121 days
```

---

### Step 4: Calculate Amount Already Charged

```
Amount Already Charged = Plan Amount Per Day × Days to be Charged
```

---

### Step 5: Calculate Remaining Amount (Credit)

```
Remaining Amount = Plan Amount Per Day × Remaining Days
```

---

### Step 6: Calculate New Plan Charge

For **same billing frequency**:
```
New Plan Charge = (New Plan Amount × New Quantity) / Frequency × Remaining Days
```

For **different billing frequency**:
```
New Plan Charge = New Plan Amount × New Quantity
(Full cycle of new plan starts from change day)
```

---

### Step 7: Calculate Final Charge/Refund

```
Amount to Charge/Refund = New Plan Charge - Remaining Amount

If positive: Charge customer
If negative: Refund customer  
If zero: No adjustment needed
```

---

## Detailed Examples

### Example 1: Same Plan Amount, Different Quantity (Day 1)

```
Original Plan:
- Plan Amount: ₹300/month
- Quantity: 1
- Billing Frequency: Monthly (30 days)
- Per Day: ₹10

Updated Plan:
- Plan Amount: ₹150/month
- Quantity: 2 (doubled)
- Billing Frequency: Monthly (30 days)
- Per Day: ₹10

Change Day: 1 (immediate)

Calculation:
- Days to be charged: 1 - 1 = 0 days
- Amount already charged: ₹10 × 0 = ₹0
- Remaining days: 30 - 0 = 30 days
- Remaining amount (credit): ₹10 × 30 = ₹300
- New plan charge: ₹10 × 30 = ₹300
- Difference: ₹300 - ₹300 = ₹0

Result: No charge, no refund ✅
```

---

### Example 2: Plan Reduction, Quantity Increase (Day 15)

```
Original Plan:
- Plan Amount: ₹300/month
- Quantity: 1
- Billing Frequency: Monthly (30 days)
- Per Day: ₹10

Updated Plan:
- Plan Amount: ₹150/month
- Quantity: 2
- Billing Frequency: Monthly (30 days)
- Per Day: ₹10

Change Day: 15 (mid-cycle)

Calculation:
- Days to be charged: 15 - 1 = 14 days
- Amount already charged: ₹10 × 14 = ₹140
- Remaining days: 30 - 14 = 16 days
- Remaining amount (credit): ₹10 × 16 = ₹160
- New plan charge: ₹10 × 16 = ₹160
- Difference: ₹160 - ₹160 = ₹0

Result: No charge, no refund ✅
```

---

### Example 3: Downgrade with Refund (Day 6)

```
Original Plan:
- Plan Amount: ₹1,000
- Quantity: 2
- Billing Frequency: Daily (8 days)
- Per Day: (₹1,000 × 2) / 8 = ₹250

Updated Plan:
- Plan Amount: ₹400
- Quantity: 1
- Billing Frequency: Daily (8 days)
- Per Day: (₹400 × 1) / 8 = ₹50

Change Day: 6

Calculation:
- Days to be charged: 6 - 1 = 5 days
- Amount already charged: ₹250 × 5 = ₹1,250
- Remaining days: 8 - 5 = 3 days
- Remaining amount (credit): ₹250 × 3 = ₹750
- New plan charge: ₹50 × 3 = ₹150
- Difference: ₹150 - ₹750 = -₹600

Result: Refund ₹600 to customer 💰
```

---

### Example 4: Billing Frequency Change - Same Day (Day 1)

```
Original Plan:
- Plan Amount: ₹350
- Quantity: 1
- Billing Frequency: Weekly (7 days)
- Per Day: ₹350 / 7 = ₹50

Updated Plan:
- Plan Amount: ₹350
- Quantity: 1
- Billing Frequency: Daily (1 day)
- New cycle starts immediately

Change Day: 1

Calculation:
- Days to be charged: 1 - 1 = 0 days
- Amount already charged: ₹50 × 0 = ₹0
- Remaining days: 7 - 0 = 7 days
- Remaining amount (credit): ₹50 × 7 = ₹350
- New plan charge: ₹350 × 1 = ₹350 (full new cycle)
- Difference: ₹350 - ₹350 = ₹0

Result: No charge, no refund ✅

⚠️ Note: When billing frequency changes, new plan starts a fresh cycle from change day
```

---

### Example 5: Yearly to Monthly Upgrade (Day 245)

```
Original Plan:
- Plan Amount: ₹10,950/year
- Quantity: 1
- Billing Frequency: Yearly (365 days)
- Per Day: ₹10,950 / 365 = ₹30

Updated Plan:
- Plan Amount: ₹21,900/month
- Quantity: 1
- Billing Frequency: Monthly (30 days)
- New cycle starts from Day 245

Change Day: 245

Calculation:
- Days to be charged: 245 - 1 = 244 days
- Amount already charged: ₹30 × 244 = ₹7,320
- Remaining days: 365 - 244 = 121 days
- Remaining amount (credit): ₹30 × 121 = ₹3,630
- New plan charge: ₹21,900 (full monthly cycle)
- Difference: ₹21,900 - ₹3,630 = ₹18,270

Result: Charge customer ₹18,270 💳

⚠️ Note: Different billing cycles = new plan starts fresh cycle
```

---

### Example 6: Monthly to Quarterly with Quantity Increase (Day 27)

```
Original Plan:
- Plan Amount: ₹300/month
- Quantity: 1
- Billing Frequency: Monthly (30 days)
- Per Day: ₹300 / 30 = ₹10

Updated Plan:
- Plan Amount: ₹900/quarter
- Quantity: 2
- Billing Frequency: Quarterly (90 days)
- New cycle starts from Day 27

Change Day: 27

Calculation:
- Days to be charged: 27 - 1 = 26 days
- Amount already charged: ₹10 × 26 = ₹260
- Remaining days: 30 - 26 = 4 days
- Remaining amount (credit): ₹10 × 4 = ₹40
- New plan charge: ₹900 × 2 = ₹1,800 (full quarterly cycle)
- Difference: ₹1,800 - ₹40 = ₹1,760

Result: Charge customer ₹1,760 💳

⚠️ Note: When billing frequency changes, ignore remaining days of old cycle
```

---

## Webhook Behavior for Immediate Updates

**Official Note**: When you update a subscription immediately, Razorpay processes the update asynchronously. The API returns success immediately, but the actual charge/refund and webhook firing happen in the background.

### Success Flow

**Official Description**: On successful payment for the prorated amount, the `subscription.updated` webhook is triggered with the updated subscription details.

```javascript
// 1. You call UPDATE API
await razorpay.subscriptions.update(subId, {
  plan_id: newPlanId,
  schedule_change_at: 'now'
});
// ✅ Returns 200 OK

// 2. Razorpay processes in background:
//    - Creates invoice/credit note
//    - Charges/refunds customer
//    - Updates subscription

// 3. Webhook fires: subscription.updated
{
  event: 'subscription.updated',
  payload: {
    subscription: {
      entity: {
        id: 'sub_123',
        plan_id: 'plan_new', // ✅ New plan
        status: 'active',
        current_start: <new_cycle_start>,
        current_end: <new_cycle_end>,
        has_scheduled_changes: false
      }
    }
  }
}

// 4. Update your database AFTER receiving webhook
```

---

### Failure Flow

**Official Warning**: If the payment for the prorated amount fails, the subscription is not updated and **no webhook is triggered**. You must implement polling or status checks to detect update failures.

```javascript
// 1. You call UPDATE API
await razorpay.subscriptions.update(subId, {
  plan_id: newPlanId,
  schedule_change_at: 'now'
});
// ✅ Returns 200 OK (API doesn't fail)

// 2. Razorpay tries to charge customer
//    ❌ Payment fails (insufficient funds)

// 3. NO webhook fires
//    Subscription stays on old plan
//    Customer not charged

// 4. You need to poll or check subscription status
const sub = await razorpay.subscriptions.fetch(subId);
if (sub.plan_id === oldPlanId) {
  // Update failed, notify customer
  sendEmail({
    subject: 'Upgrade Payment Failed',
    message: 'Please update payment method and try again'
  });
}
```

---

## Important Notes

### 1. Status Doesn't Change

When a subscription is updated, the **status remains the same** (typically `active`). Only the plan and billing details change.

### 2. No State Change on Update

Unlike other operations (activate, pause, cancel), update does not change the subscription state:

```javascript
// Before update
status: 'active'

// After successful update
status: 'active' // Same!

// Only these fields change:
plan_id: 'plan_new'
current_start: <new_date>
current_end: <new_date>
```

---

### 3. Offers Can Only Update at Cycle End

⚠️ You **cannot** update offers immediately. Offers must be scheduled for cycle end:

```javascript
// ❌ This will fail
await razorpay.subscriptions.update(subId, {
  offer_id: 'offer_new',
  schedule_change_at: 'now' // Not allowed for offers
});

// ✅ Correct way
await razorpay.subscriptions.update(subId, {
  offer_id: 'offer_new',
  schedule_change_at: 'cycle_end' // Must use cycle_end
});
```

---

### 4. Dashboard Visibility

- **Invoices**: Visible under Subscription → Invoices tab
- **Credit Notes**: Visible under Subscription → Credit Notes tab
- **Update History**: Not explicitly tracked, but visible in activity logs

---

## Best Practices

### 1. Validate Before Updating

```typescript
async function validateUpdate(
  currentSub: Subscription,
  newPlanId: string
) {
  // Check subscription state
  if (!['authenticated', 'active'].includes(currentSub.status)) {
    throw new Error('Subscription must be active to update');
  }

  // Check payment method
  if (['upi', 'emandate'].includes(currentSub.payment_method)) {
    throw new Error('Cannot update UPI/Emandate subscriptions');
  }

  // Check minimum difference
  const currentPlan = await prisma.plan.findUnique({ 
    where: { id: currentSub.planId } 
  });
  const newPlan = await prisma.plan.findUnique({ 
    where: { id: newPlanId } 
  });

  const daysRemaining = differenceInDays(
    currentSub.currentPeriodEnd, 
    new Date()
  );
  const daysInCycle = currentPlan.billingCycle === 'MONTHLY' ? 30 : 365;

  const credit = (currentPlan.price * daysRemaining) / daysInCycle;
  const difference = Math.abs(newPlan.price - credit);

  if (difference < 0.50) {
    throw new Error('Difference amount too small (must be ≥ ₹0.50)');
  }

  return true;
}
```

---

### 2. Show Clear Preview to Users

```typescript
function calculateProrationPreview(
  currentPlan: Plan,
  newPlan: Plan,
  daysRemaining: number
) {
  const daysInCycle = 30; // For monthly
  const perDayCurrent = currentPlan.price / daysInCycle;
  const credit = perDayCurrent * daysRemaining;
  const chargeAmount = Math.max(0, newPlan.price - credit);

  return {
    credit: credit.toFixed(2),
    chargeAmount: chargeAmount.toFixed(2),
    daysRemaining,
    message: chargeAmount > 0 
      ? `You'll be charged ₹${chargeAmount.toFixed(2)} today`
      : `You'll receive a refund of ₹${Math.abs(chargeAmount).toFixed(2)}`
  };
}
```

---

### 3. Handle Update Failures Gracefully

```typescript
async function handleUpdateFailure(
  subscriptionId: string,
  userId: string
) {
  // Log failure
  await prisma.subscriptionActivity.create({
    data: {
      subscriptionId,
      action: 'UPDATE_FAILED',
      metadata: {
        reason: 'Payment failed',
        timestamp: new Date()
      }
    }
  });

  // Notify user
  await sendEmail({
    to: user.email,
    subject: 'Upgrade Payment Failed',
    template: 'upgrade-failed',
    data: {
      reason: 'Insufficient funds',
      actions: [
        'Update payment method',
        'Add funds to card',
        'Try again later'
      ]
    }
  });

  // Create in-app notification
  await prisma.notification.create({
    data: {
      userId,
      type: 'PAYMENT_FAILED',
      title: 'Upgrade Failed',
      message: 'Your upgrade payment couldn't be processed',
      actionUrl: '/billing/payment-methods'
    }
  });
}
```

---

### 4. Reconcile with Webhook

```typescript
async function reconcileAfterUpdate(
  localSubId: string,
  razorpaySubId: string
) {
  // Wait a moment for webhook
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Fetch from Razorpay
  const rzpSub = await razorpay.subscriptions.fetch(razorpaySubId);

  // Compare with local DB
  const dbSub = await prisma.subscription.findUnique({
    where: { id: localSubId }
  });

  if (rzpSub.plan_id !== dbSub.razorpayPlanId) {
    // Webhook missed or delayed, sync manually
    await prisma.subscription.update({
      where: { id: localSubId },
      data: {
        razorpayPlanId: rzpSub.plan_id,
        currentPeriodStart: new Date(rzpSub.current_start * 1000),
        currentPeriodEnd: new Date(rzpSub.current_end * 1000)
      }
    });
  }
}
```

---

## Summary

**Key Takeaways**:

1. ✅ Minimum charge difference: **₹0.50**
2. ✅ Upgrades create **invoices** and charge automatically
3. ✅ Downgrades create **credit notes** and refund automatically
4. ✅ Only **subscription.updated** webhook fires (not subscription.charged)
5. ✅ If payment fails, subscription is **not updated** (automatic rollback)
6. ✅ Proration based on **days remaining** and **plan per day**
7. ✅ Different billing frequencies start **new cycle from change day**
8. ❌ Cannot update **UPI/Emandate** subscriptions
9. ❌ Offers can only update at **cycle end**
10. ❌ Cannot update subscriptions in **created/pending/halted** state

**Pro Tip**: Always show users a clear preview of the charge/refund amount before confirming an immediate update!

---

**Related Documentation**:
- Part 23: Update Subscription API
- Part 31: Webhook Overview
- Part 18: Subscription Entity

**Last Updated**: November 24, 2025
