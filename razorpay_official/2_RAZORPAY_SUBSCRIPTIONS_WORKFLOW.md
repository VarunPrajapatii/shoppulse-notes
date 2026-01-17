# Razorpay Subscriptions - Official Documentation Part 2: Workflow & Lifecycle

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Documentation Version**: Latest (as provided)

---

## Table of Contents
1. [Subscription Lifecycle](#subscription-lifecycle)
2. [Workflow Overview](#workflow-overview)
3. [Authentication Transaction](#authentication-transaction)
4. [Subscriptions via Checkout](#subscriptions-via-checkout)
5. [Subscriptions via Links](#subscriptions-via-links)
6. [Subscription Actions](#subscription-actions)
7. [Invoicing](#invoicing)

---

## Subscription Lifecycle

The following diagram depicts the Subscriptions life cycle:

```
┌──────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION LIFECYCLE                     │
└──────────────────────────────────────────────────────────────┘

1. Create Plan
      ↓
2. Create Subscription (for customer)
      ↓
3. Customer Makes Authentication Transaction
      ↓
4. Subscription Becomes Active (when billing cycle starts)
      ↓
5. Automated Recurring Charges (as per billing cycle)
```

---

## Workflow Overview

### The Subscription Workflow Involves:

1. **Create a Plan**
2. **Create a Subscription** for your customer (after Plan is created)
3. **Customer makes the Authentication Transaction**
4. **Subscription becomes active** when the billing cycle starts

### Important Notes

✅ **Auto-Capture**: You do not need to capture any Subscriptions-related payment. All payments related to Subscriptions (except the authorisation payment) are auto-captured.

✅ **Auto-Refund**: The authorisation payment used to validate a customer's card is auto-refunded.

✅ **Auto-Customer Creation**: There is no need to create a customer when using Razorpay Subscriptions. Razorpay automatically creates a customer when the authentication payment is made.

---

## Authentication Transaction

### What is Authentication Transaction?

The authentication transaction amount is the **first amount you charge on the customer's card**. 

### Types of Authentication Transaction

The authentication transaction can be:

1. **Token Amount**: A small amount (₹5.00) that is refunded to the customer
2. **Upfront Amount**: An amount that is NOT refunded (e.g., setup fee)
3. **Plan Amount**: The actual plan amount (for immediate start dates)

### Authentication Amount Matrix

| Start Date | Upfront Amount | Authentication Amount | Refunded? |
|------------|----------------|----------------------|-----------|
| **Immediate** | ❌ No | Plan Amount | ❌ No |
| **Future** | ❌ No | ₹5.00 | ✅ Yes |
| **Immediate** | ✅ Yes | Upfront Amount + Plan Amount | ❌ No |
| **Future** | ✅ Yes | Upfront Amount | ❌ No |

### Important: Immediate Start Dates

⚠️ **In the case of immediate start dates**:
- The authentication transaction amount is **NOT refunded**
- Invoices are generated in all three scenarios

---

## Subscriptions via Checkout

### Overview

You can integrate the Razorpay Subscription service with your Razorpay Checkout Form on your website or application.

**Integration Method**: APIs only (you can integrate Razorpay Subscriptions to your checkout only using APIs)

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│            SUBSCRIPTIONS VIA CHECKOUT FLOW                   │
└─────────────────────────────────────────────────────────────┘

1. Create a Plan
      ↓
2. Customer selects the Plan from your website/application
      ↓
3. Create Subscription in Razorpay
      ↓
4. Pass subscription_id to Razorpay Checkout
      ↓
5. Customer makes payment on Checkout form (enters card details)
      ↓
6. Authentication transaction completed
      ↓
7. Customer created and linked to Subscription
      ↓
8. Automated charges made as per schedule
```

### Detailed Steps

**Step 1**: Create a Plan

**Step 2**: The customer selects the Plan from your website or application

**Step 3**: After the customer selects a Plan, a Subscription is created in Razorpay

**Step 4**: The `subscription_id` received in the response is passed on to the Razorpay Checkout via the checkout options

**Step 5**: On the Checkout form, the customer makes the payment using the card details

**Step 6**: This acts as an authentication transaction

**Step 7**: On successful payment, a customer is created and linked to the Subscription

**Step 8**: Automated charges on the Subscription are now made as per the schedule that you defined while creating the plan

📚 **Reference**: Know more about integrating Subscriptions in your checkout.

---

## Subscriptions via Links

### Overview

You can create a custom Subscription for a customer and send a Subscription link to them. 

**Key Benefit**: There is no need to host the link on your website or application - customers click the link and are taken to a checkout page hosted by Razorpay.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│             SUBSCRIPTIONS VIA LINKS FLOW                     │
└─────────────────────────────────────────────────────────────┘

1. Create a Plan
      ↓
2. Create a Subscription link by:
   • Selecting a Plan
   • Adding an upfront amount (optional)
   • Adding customer details
      ↓
3. Subscription link sent to customer (via email and/or SMS)
      ↓
4. Customer clicks link → Taken to Razorpay Checkout form
      ↓
5. Customer enters card details and clicks Pay
      ↓
6. Authentication transaction completed
      ↓
7. Customer created and linked to Subscription
      ↓
8. Automated charges made as per schedule
```

### Detailed Steps

**Step 1**: Create a Plan

**Step 2**: You create a Subscription link by:
- Selecting a Plan
- Adding an upfront amount (optional)
- Adding customer details

**Step 3**: The Subscription link is sent to the customer via email and/or SMS

**Step 4**: The customer clicks the link and is taken to the Razorpay Checkout form

**Step 5**: The customer enters the card details and clicks Pay to make the payment

**Step 6**: This acts as an authentication transaction

**Step 7**: On successful payment, a customer is created and linked to the Subscription

**Step 8**: Automated charges on the Subscription are now made as per the schedule that you defined while creating the plan

📚 **Reference**: Know more about Subscription Links.

---

## Subscription Actions

You can perform the following actions on Subscriptions that are **active**:

### Available Actions

1. **Update a Subscription**
   - Modify subscription details
   - Change plan (upgrade/downgrade)
   - Update customer information

2. **Pause and Resume a Subscription**
   - Temporarily pause billing
   - Resume when ready
   - No loss of subscription history

3. **Cancel a Subscription**
   - Permanently end the subscription
   - Cannot be restarted once cancelled
   - Can be done via API or Dashboard

---

## Invoicing

### Automatic Invoice Generation

✅ **Invoices are automatically created for Subscriptions.**

### Invoice Contents

An invoice includes:
- Plan details
- Amount charged
- Date of charge
- Merchant details

### When are Invoices Created?

Invoices are created for:
- Every charge made on the customer's card for recurring payments
- The authentication transaction

### Invoice Generation Timing

**At the beginning of each billing cycle**:
1. An invoice is generated for the defined plan and amount
2. A charge is attempted on the invoice
3. The invoice is in **issued** state on your Dashboard

### Successful Charge Flow

If the charge is successful:

1. ✅ An email is sent to the customer
2. ✅ The invoice is moved to **paid** state on your Dashboard
3. ✅ The `invoice.paid` webhook is fired

### Invoice Generation Matrix

| Start Date | Upfront Amount | Invoice Sent? | Reason |
|------------|----------------|---------------|--------|
| **Immediate** | ❌ No | ✅ Yes | - |
| **Future** | ❌ No | ❌ No | Auth transaction only |
| **Immediate** | ✅ Yes | ✅ Yes | - |
| **Future** | ✅ Yes | ✅ Yes | - |

### Important Recommendation

⚠️ **Best Practice**: Along with the invoice state, we recommend you check the **Subscription charge status** of the defined billing frequency before providing or continuing services to your customers.

---

## Key Takeaways

### Authentication Transaction
- First payment made by customer
- Can be token amount (refunded) or actual amount (not refunded)
- Creates customer and links to subscription

### Two Integration Methods
1. **Via Checkout**: Embed in your website/app (API-based)
2. **Via Links**: Send link to customer (hosted by Razorpay)

### Automatic Features
- ✅ Payment capture (except auth payment)
- ✅ Customer creation
- ✅ Invoice generation
- ✅ Recurring charges

### Available Actions
- Update subscription
- Pause/Resume
- Cancel

---

**Next Document**: Part 3 - Subscription States & Lifecycle Management
