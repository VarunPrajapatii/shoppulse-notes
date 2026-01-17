# Razorpay Subscriptions - Create and View Plans

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 4 of Razorpay Official Documentation Series

---

## Table of Contents
1. [Overview](#overview)
2. [Availability](#availability)
3. [Important Notes](#important-notes)
4. [Creating Plans](#creating-plans)
5. [Viewing Plan Details](#viewing-plan-details)

---

## Overview

You must create a **Plan** before you create a Subscription.

### International Currency Support
- Create the plan in the currency you want to charge the customer
- You can select any one of Razorpay's supported currencies to create a Plan

---

## Availability

Available in:
- 🇮🇳 **IN** - India
- 🇲🇾 **MY** - Malaysia
- 🇸🇬 **SG** - Singapore
- 🇺🇸 **US** - United States

---

## Important Notes

⚠️ **Watch Out!**

1. **Daily Frequency Plans**: Plans with daily frequency should have the interval set to a value **greater than 7**.
2. **Plans are Immutable**: Once created, you **cannot edit or delete** Plans.

---

## Creating Plans

You can create a Plan in **2 ways**:
1. Dashboard (UI)
2. APIs (Programmatic)

### Create a Plan from Dashboard

**Steps**:

1. Log in to the Dashboard
2. Click **Subscriptions** under **PAYMENT PRODUCTS** in the left menu
3. Go to **Plans** and click **+ New Plan**
4. Enter the following details:
   - **Plan Name**: Name of the plan
   - **Plan Description**: Brief description (optional)
   - **Billing Frequency**: How often should the customer be charged
   - **Billing Amount**: Amount to be charged (refer to supported currencies page)
   - **Internal Notes**: Any internal notes (optional)
5. Click **Create Plan**

**Video Reference**: Watch this video to see how to create a Plan from the Dashboard (mentioned in docs)

### Create a Plan using APIs

You can create a Subscription Plan using the **create a plan API**.

---

## Viewing Plan Details

You can view Plan details in **2 ways**:
1. Dashboard (UI)
2. APIs (Programmatic)

### View Plan Details Using Dashboard

**Steps**:

1. Log in to the Dashboard
2. Click **Subscriptions** under **PAYMENT PRODUCTS** in the left menu
3. Go to **Plans**
4. Click on the required **Plan Id** to view its details

### View Plan Details Using API

**Available APIs**:

1. **Fetch All Plans**: View all Plans using the `fetch all plans API`
2. **Fetch a Plan by ID**: View a Plan with an id using the `fetch a plan by id API`

---

## Implementation Notes for ShopPulse

**For Your Upgrade Flow (1.2.7)**:
- Plans are **immutable** - cannot be edited/deleted after creation
- This confirms your approach: Create separate plans for each tier (MINI, MIDI, MAXI)
- Plan IDs are permanent references - safe to store in database
- Use API approach for programmatic plan management if needed

**Database Design Implication**:
```typescript
// Your PlanMetadata should store immutable plan_id
{
  "razorpay_plan_id": "plan_xxx",  // This never changes
  "plan_name": "MIDI",
  "billing_amount": 4999,
  "billing_frequency": "monthly"
}
```

---

## Related Documentation

- Part 1: [Subscriptions Overview](./1_RAZORPAY_SUBSCRIPTIONS_OVERVIEW.md)
- Part 2: [Subscriptions Workflow](./2_RAZORPAY_SUBSCRIPTIONS_WORKFLOW.md)
- Part 3: [Subscriptions States](./3_RAZORPAY_SUBSCRIPTIONS_STATES.md)
- Part 5: Create Subscriptions via Links (Next)
