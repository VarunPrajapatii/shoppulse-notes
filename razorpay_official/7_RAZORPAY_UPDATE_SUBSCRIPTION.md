# Razorpay Subscriptions - Update a Subscription

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 7 of Razorpay Official Documentation Series

---

## Table of Contents
1. [Overview](#overview)
2. [Updatable Parameters](#updatable-parameters)
3. [Update Timing](#update-timing)
4. [Immediate Updates](#immediate-updates)
5. [End of Cycle Updates](#end-of-cycle-updates)
6. [Calculation Examples](#calculation-examples)
7. [Dashboard Operations](#dashboard-operations)

---

## Overview

Subscriptions can be updated via:
1. **APIs** (Programmatic)
2. **Dashboard** (Manual)

### Availability

Available in:
- 🇮🇳 **IN** - India
- 🇲🇾 **MY** - Malaysia
- 🇸🇬 **SG** - Singapore
- 🇺🇸 **US** - United States

---

## Updatable Parameters

You can update the following parameters of a Subscription that is **active**:

| Parameter | Description | Restriction |
|-----------|-------------|-------------|
| **Plan** | Plan linked to the Subscription | Active subscriptions only |
| **Quantity** | Number of times amount should be charged per billing cycle | Active subscriptions only |
| **Start Date** | Subscription Start Date for updated details | Can be immediate or future date |
| **Total Count** | Number of billing cycles (duration) | Active subscriptions only |
| **Offer** | Offer linked to the Subscription | End of cycle only |

⚠️ **Watch Out!**
- For Subscriptions created using **domestic cards**, you can **only update the offer** that is linked to them
- You can **only update Subscriptions** in the `authenticated` and `active` states
- Subscriptions in `created`, `pending` or `halted` state **cannot be updated**
- There is **no state change** when a Subscription is updated
- You **cannot update** if the difference amount is less than `update_quantity × smallest currency subunit`

---

## Update Timing

You can choose when to apply the update:

### 1. **Immediately**
- Changes take effect right away
- May involve charging extra or refunding the customer
- Prorated amount difference must be **at least 50 currency subunits (₹0.50)**

### 2. **End of Current Billing Cycle**
- Changes take effect when the current cycle ends
- No amount adjustment needed
- No charge or refund required

---

## Immediate Updates

When you update a Subscription **immediately**, you may have to:

### Scenarios

1. **Charge the customer an extra amount** (Upgrade)
   - Upgrading plan
   - Increasing number of users
   - Razorpay creates an invoice and charges the difference amount
   - If charge succeeds: Invoice sent to customer (if Razorpay handles notifications)
   - You're notified via `subscription.updated` webhook
   - If charge fails: Subscription is **not updated**

2. **Refund an amount to the customer** (Downgrade)
   - Downgrading plan
   - Reducing number of users
   - Razorpay refunds the amount to the customer
   - You're notified via `subscription.updated` webhook
   - Refund done using **Credit Note**

3. **No charge or refund**
   - Remaining amount for original subscription equals new subscription amount
   - No financial adjustment needed

### Credit Notes

A refund to a customer is done using a **Credit Note**.

**Key Points**:
- Credit notes help in **reconciliation**
- **Not created against invoices** - created against total value of payments
- Only **one credit note** created even if refunds across multiple invoices
- View credit notes on Dashboard against respective Subscription
- Credit notes are **refunded automatically**

**Credit Note States**:

| State | Description |
|-------|-------------|
| `created` | Initial state. Stays here until full refund is made |
| `refunded` | Final state. Credit note moves here once refund is successfully processed |

---

## End of Cycle Updates

When you update a Subscription **at the end of the current billing cycle**:

- **No amount adjustment** needed with the customer
- Subscription updated with new values when current billing cycle ends
- No charge or refund processing

💡 **Handy Tip**: The new offer will be linked to the Subscription only at the end of the cycle. It is **not possible** to update an offer linked to a Subscription immediately.

---

## Calculation Examples

### Example 1: Same Billing Frequency - No Change (Day 1)

**Scenario**: Reduce plan amount but increase quantity on day 1

| Detail | Original Plan | Updated Plan |
|--------|---------------|--------------|
| Plan amount | ₹300.00 | ₹150.00 |
| Quantity | 1 | 2 |
| Billing Frequency | Monthly | Monthly |
| Frequency in days | 30 | 30 |
| **Plan amount per day** | ₹10.00 | ₹10.00 |
| Plan change day | 1 | N/A |
| Days to be charged | 0 days | - |
| Remaining days | 30 | 30 |
| Amount to be charged | ₹0.00 | ₹300.00 |
| Remaining amount | ₹300.00 | N/A |
| **Amount to charge/refund** | - | **₹0.00** |

**Result**: No charge or refund needed

### Example 2: Same Billing Frequency - No Change (Day 15)

**Scenario**: Reduce plan amount but increase quantity on day 15

| Detail | Original Plan | Updated Plan |
|--------|---------------|--------------|
| Plan amount | ₹300.00 | ₹150.00 |
| Quantity | 1 | 2 |
| Billing Frequency | Monthly | Monthly |
| Frequency in days | 30 | 30 |
| **Plan amount per day** | ₹10.00 | ₹10.00 |
| Plan change day | 15 | N/A |
| Days to be charged | 14 days | - |
| Remaining days | 16 | 16 |
| Amount to be charged | ₹140.00 | ₹160.00 |
| Remaining amount | ₹160.00 | N/A |
| **Amount to charge/refund** | - | **₹0.00** |

**Result**: No charge or refund needed

### Example 3: Same Billing Frequency - Refund (Day 6)

**Scenario**: Reduce plan amount and quantity on day 6

| Detail | Original Plan | Updated Plan |
|--------|---------------|--------------|
| Plan amount | ₹1,000.00 | ₹400.00 |
| Quantity | 2 | 1 |
| Billing Frequency | Daily | Daily |
| Frequency in days | 8 | 8 |
| **Plan amount per day** | ₹250.00 | ₹50.00 |
| Plan change day | 6 | N/A |
| Days to be charged | 5 days | - |
| Remaining days | 3 | 3 |
| Amount to be charged | ₹1,250.00 | ₹150.00 |
| Remaining amount | ₹750.00 | N/A |
| **Amount to charge/refund** | - | **-₹600.00 (refund)** |

**Result**: Refund ₹600.00 to customer

### Example 4: Different Billing Frequency - No Change (Day 1)

**Scenario**: Increase frequency from daily to weekly on day 1

| Detail | Original Plan | Updated Plan |
|--------|---------------|--------------|
| Plan amount | ₹350.00 | ₹350.00 |
| Quantity | 1 | 1 |
| Billing Frequency | Daily (7 days) | Weekly (1 day) |
| Frequency in days | 7 | 1 |
| **Plan amount per day** | ₹50.00 | N/A |
| Plan change day | 1 | N/A |
| Days to be charged | 0 days | - |
| Remaining days | 7 | N/A |
| Amount to be charged | ₹0.00 | ₹350.00 |
| Remaining amount | ₹350.00 | N/A |
| **Amount to charge/refund** | - | **₹0.00** |

**Result**: No charge or refund needed

### Example 5: Different Billing Frequency - Charge (Day 245)

**Scenario**: Change from yearly to monthly on day 245

⚠️ **Watch Out!**: If the plans have different billing cycles, the new plan is billed at the **new interval**, starting on the **day of the change**.

| Detail | Original Plan | Updated Plan |
|--------|---------------|--------------|
| Plan amount | ₹10,950.00 | ₹21,900.00 |
| Quantity | 1 | 1 |
| Billing Frequency | Yearly | Monthly |
| Frequency in days | 365 | 30 |
| **Plan amount per day** | ₹30.00 | N/A |
| Plan change day | 245 | N/A |
| Days to be charged | 244 days | - |
| Remaining days | 121 | N/A |
| Amount to be charged | ₹7,320.00 | ₹21,900.00 |
| Remaining amount | ₹3,630.00 | N/A |
| **Amount to charge/refund** | - | **₹18,270.00 (charge)** |

**Result**: Charge customer ₹18,270.00

### Example 6: Different Billing Frequency - Charge (Day 27)

**Scenario**: Change from monthly to quarterly on day 27

⚠️ **Watch Out!**: If the plans have different billing cycles, the new plan is billed at the **new interval**, starting on the **day of the change**.

| Detail | Original Plan | Updated Plan |
|--------|---------------|--------------|
| Plan amount | ₹300.00 | ₹900.00 |
| Quantity | 2 | 2 |
| Billing Frequency | Monthly | Quarterly |
| Frequency in days | 30 | 90 |
| **Plan amount per day** | ₹10.00 | N/A |
| Plan change day | 27 | N/A |
| Days to be charged | 26 days | - |
| Remaining days | 4 | 90 days |
| Amount to be charged | ₹260.00 | ₹1,800.00 |
| Remaining amount | ₹40.00 | N/A |
| **Amount to charge/refund** | - | **₹1,760.00 (charge)** |

**Result**: Charge customer ₹1,760.00

---

## Dashboard Operations

### Update a Subscription From Dashboard

**Steps**:

1. Log in to the Dashboard
2. Click **Subscriptions** under **PAYMENT PRODUCTS** in the left menu
3. Click the **Subscription Id** you want to update
4. Details appear in the right pane
5. Update the **Notify flag** (if enabled, notifications sent to customers)
6. Click **Update** to modify:
   - Plan
   - Quantity
   - Subscription Start Date
   - Total count
   - Apply changes (Immediately or End of Cycle)
   - Offer applied on the Subscription
7. Select **Immediately** or **End of Cycle**
8. Click **Next**
9. Review the changes
10. Click **Update**

### Update a Subscription Using API

You can update a Subscription using the **update subscription API**.

### Cancel an Update

You can **cancel an update pending** on a Subscription from the Dashboard.

⚠️ **Watch Out!**: You can only cancel an **update pending** on a Subscription, not the **live ones**.

**Video Reference**: Watch this video to see how to cancel an update for a Subscription (mentioned in docs)

**Steps**:

1. Log in to the Dashboard
2. Click **Subscriptions** under **PAYMENT PRODUCTS**
3. Click the **Subscription Id** for which you want to cancel the update
4. Click **Cancel Update**
5. Click **Yes, cancel**

---

## Implementation Notes for ShopPulse

### Your Upgrade Flow (1.2.7) vs Razorpay Update API

**Key Difference**:
- Razorpay Update API: Modifies **existing subscription**
- Your Upgrade Flow: Creates **new subscription**, cancels old one

**Why Different Approach?**:
```typescript
// Razorpay Update API (modifies in-place)
// ❌ Your reason NOT to use:
// - Complex proration calculation
// - Risk of failed charge leaving user in limbo
// - Less control over transition

// Your Approach (create new, cancel old)
// ✅ Benefits:
// - Clean separation of old/new subscriptions
// - Safe: old sub active until new payment succeeds
// - Full control over proration (negative addon)
// - Clear audit trail in database
```

### When to Use Update API

**Use Razorpay Update API For**:
- Quantity changes (user count)
- End of cycle plan changes
- Simple offer updates
- Admin corrections

**Use Your Custom Upgrade Flow For**:
- Mid-cycle plan upgrades (MINI → MIDI → MAXI)
- Complex proration scenarios
- User-initiated upgrades with payment confirmation
- Downgrade restrictions (period-end only)

### Proration Implementation

Your 1.2.7 guide uses **negative addons** instead of Razorpay's built-in proration:

```typescript
// Your approach (from 1.2.7)
const credit = calculateProration(currentSub);
createSubscription({
  plan_id: newPlanId,
  addons: [{
    item: { name: "Upgrade Credit", amount: -credit, currency: "INR" }
  }]
});

// vs Razorpay Update API (automatic proration)
updateSubscription({
  subscription_id: existingSubId,
  plan_id: newPlanId,
  schedule_change_at: "now" // Auto-calculates proration
});
```

**Your approach gives more control** over the upgrade UX and error handling.

---

## Related Documentation

- Part 1: [Subscriptions Overview](./1_RAZORPAY_SUBSCRIPTIONS_OVERVIEW.md)
- Part 2: [Subscriptions Workflow](./2_RAZORPAY_SUBSCRIPTIONS_WORKFLOW.md)
- Part 3: [Subscriptions States](./3_RAZORPAY_SUBSCRIPTIONS_STATES.md)
- Part 4: [Create and View Plans](./4_RAZORPAY_CREATE_AND_VIEW_PLANS.md)
- Part 5: [Create Subscriptions via Links](./5_RAZORPAY_CREATE_SUBSCRIPTIONS_VIA_LINKS.md)
- Part 6: [Manual Charge & View Details](./6_RAZORPAY_MANUAL_CHARGE_AND_VIEW.md)
- Part 8: Pause, Resume, Cancel (Next)
