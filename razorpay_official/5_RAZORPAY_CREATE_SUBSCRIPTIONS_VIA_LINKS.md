# Razorpay Subscriptions - Create Subscriptions via Links

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 5 of Razorpay Official Documentation Series

---

## Table of Contents
1. [Overview](#overview)
2. [Availability](#availability)
3. [Subscriptions via Links Flow](#subscriptions-via-links-flow)
4. [Creating Subscription Links](#creating-subscription-links)
5. [Trial Period Implementation](#trial-period-implementation)
6. [Total Count Calculation](#total-count-calculation)

---

## Overview

If you do not have a website or app, you can still create and send Subscriptions to customers using a **link**. 

### How It Works
- Customer opens the link
- Taken to a **Razorpay-hosted checkout page**
- Makes the **authorization payment**
- Use this feature to create and send custom Subscriptions to customers

### Creation Methods
Subscription Links can be created via:
1. **APIs** (Programmatic)
2. **Dashboard** (Manual)

---

## Availability

Available in:
- 🇮🇳 **IN** - India
- 🇲🇾 **MY** - Malaysia
- 🇸🇬 **SG** - Singapore
- 🇺🇸 **US** - United States

---

## Subscriptions via Links Flow

**High-Level Overview**:

```
1. Create a Plan
2. Create Subscription Link (from Dashboard/API)
3. Send Link to Customer
4. Customer Opens Link
5. Razorpay Hosted Checkout Page
6. Customer Makes Authorization Payment
7. Subscription Activated
8. Recurring Billing Begins
```

**Visual**: Flow of subscriptions via link (diagram available in official docs)

---

## Creating Subscription Links

### Prerequisites
1. **Create a plan** first (mandatory)
2. Have customer contact details (email/mobile)

### Create Subscription Link From Dashboard

**Video Reference**: Watch this video to see how to create Subscription Links (mentioned in docs)

**Steps**:

1. **Navigate to Subscriptions**
   - Log in to Dashboard
   - Click **Subscriptions** under **PAYMENT PRODUCTS**

2. **Initiate Creation**
   - Click **+ Create New Subscription**
   - The Create Subscription screen displays

3. **Select Plan & Start Date**
   - Select the required plan from **Select Plan** drop-down
   - Select the **Subscription Start Date**

4. **Configure Trial Period (Optional)**
   - To create a trial period: provide a **future start date**
   - Actual billing cycle automatically starts at the specified date
   - This essentially creates a trial period

5. **Set Total Count**
   - Enter the **Total Count**
   - Defines how many times the customer should be charged (number of billing cycles)
   - See calculation formula below

6. **Add Offers (Optional)**
   - Select the required offer from **Offer** drop-down
   - Click **Next**

7. **Add Upfront Amount (Optional)**
   - Select **I want to add an upfront amount**
   - Click the drop-down → **+ Create New Item**
   - Add Upfront Amount screen appears
   - Enter:
     - Name
     - Rate per unit
     - Description (optional)
   - Click **Save**
   - Add additional items using **Add New Item** option
   - Click **Next**

8. **Customer Details**
   - Enter customer's **mobile number** and/or **email address**
   - Select **Notify Customer** checkbox if you want Razorpay to automatically send the link via email
   - Set an **expiry date** for the link
   - Add **internal notes** (optional)
   - Click **Next**

9. **Review & Create**
   - Review the details
   - Click **Create Subscription Link** to send the link to the customer

---

## Trial Period Implementation

💡 **Handy Tip**: To create a trial period for your customers, all you need to provide is a **future start date**. 

### How It Works
- The actual billing cycle automatically starts at the specified date
- This essentially creates a trial period
- No separate trial configuration needed

**Example**:
```
Today: Jan 1, 2025
Subscription Start Date: Feb 1, 2025
Result: 31-day trial period (Feb 1 - Jan 1)
First charge: Feb 1, 2025
```

---

## Total Count Calculation

You can create a Subscription for a **maximum of 30 years**.

### Formula

```
Total Count = (Number of months in a year × Number of Years supported) / Interval
```

### Example: Monthly Plan

```
Monthly Plan Total Count:
= (12 months × 30 years) / 1 (every month)
= 360 / 1
= 360 billing cycles maximum
```

### Examples by Frequency

| Billing Frequency | Interval | Max Total Count | Calculation |
|-------------------|----------|-----------------|-------------|
| Monthly | 1 month | 360 | (12 × 30) / 1 |
| Quarterly | 3 months | 120 | (12 × 30) / 3 |
| Yearly | 12 months | 30 | (12 × 30) / 12 |
| Weekly | 1 week | ~1,560 | (52 × 30) / 1 |

---

## Important Notes

💡 **Handy Tips**:

1. **Upfront Amount Items**:
   - All created add-on items display in the "Select Item to Add" drop-down
   - Upfront amount and add-ons will have the **same currency as the plan**

2. **Notify Customer Checkbox**:
   - If **NOT selected**: Razorpay does **not** send the customer the subscription link
   - You must manually send the link to the customer

3. **Link Expiry**:
   - Set an expiry date for the link
   - Expired links cannot be used for payment

---

## Implementation Notes for ShopPulse

**For Your Upgrade Flow (1.2.7)**:
- You're using **Subscriptions via Checkout** (not Links)
- Links are useful for **manual/custom subscriptions**
- Your flow: Programmatic API-based subscription creation
- Links approach: Manual Dashboard-based creation

**When to Use Links**:
- Custom one-off subscriptions for specific customers
- Manual billing scenarios
- Testing without integration
- Sales team creating custom plans

**Your Implementation Uses**:
- Direct API calls (`/api/subscription/create`)
- Razorpay Checkout integration (not Links)
- Webhook-driven automation

---

## Related Documentation

- Part 1: [Subscriptions Overview](./1_RAZORPAY_SUBSCRIPTIONS_OVERVIEW.md)
- Part 2: [Subscriptions Workflow](./2_RAZORPAY_SUBSCRIPTIONS_WORKFLOW.md)
- Part 3: [Subscriptions States](./3_RAZORPAY_SUBSCRIPTIONS_STATES.md)
- Part 4: [Create and View Plans](./4_RAZORPAY_CREATE_AND_VIEW_PLANS.md)
- Part 6: Manual Charge & View Details (Next)
