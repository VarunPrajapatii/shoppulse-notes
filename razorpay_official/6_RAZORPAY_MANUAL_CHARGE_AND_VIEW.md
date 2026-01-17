# Razorpay Subscriptions - Manual Charge & View Details

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 6 of Razorpay Official Documentation Series

---

## Table of Contents
1. [Charge a Card Manually](#charge-a-card-manually)
2. [View Subscription Details](#view-subscription-details)

---

## Charge a Card Manually

### Overview

If one or more **auto-charge attempts fail**, you will receive a **webhook notification**. In such scenarios, you can manually charge the card linked to the Subscription from the Dashboard.

### Important Notes

⚠️ **Watch Out!**
- Manual charging of a **domestic card is NOT supported**
- Until a successful charge is made, the invoice will be in the **issued state**

### Availability

Available in:
- 🇮🇳 **IN** - India
- 🇲🇾 **MY** - Malaysia
- 🇸🇬 **SG** - Singapore
- 🇺🇸 **US** - United States

### Manually Charge a Card From Dashboard

**Steps**:

1. Log in to the Dashboard
2. Click **Subscriptions** under **PAYMENT PRODUCTS** in the left menu
3. Click the **Subscription Id** in the **pending state** that is to be charged
4. Click the **invoice** in the **issued state**
5. Click **Attempt Charge**

**Alternative Method**:
- Click **Attempt Charge** against the invoice in the issued state on the details panel

---

## View Subscription Details

### Overview

You can view details of a Subscription from:
1. **Dashboard** (UI)
2. **APIs** (Programmatic)

### Availability

Available in:
- 🇮🇳 **IN** - India
- 🇲🇾 **MY** - Malaysia
- 🇸🇬 **SG** - Singapore
- 🇺🇸 **US** - United States

### View Subscription Details From Dashboard

**Video Reference**: Watch this video to see how to view the details of a Subscription (mentioned in docs)

**Steps**:

1. Log in to the Dashboard
2. Click **Subscriptions** under **PAYMENT PRODUCTS** in the left menu
3. Click on the required **Subscription Id** you want to view
4. Details about the Subscription display in the **right pane**
5. You can **charge** or **cancel** the Subscription from here

⚠️ **Watch Out!**
- Contact information shown is the information **linked to the card or account** from which the payment was made
- This **need not match** the details of the person to whom the link was sent

### View Subscription Details Using APIs

**Available APIs**:

1. **View All Subscriptions**: View the list of all the Subscriptions using this API
2. **View Single Subscription**: View the details of a Subscription by providing the **Subscription Id** using this API

---

## Implementation Notes for ShopPulse

### Manual Charge Scenario

**When It Happens**:
- Auto-charge fails (expired card, insufficient funds, etc.)
- Invoice stuck in `issued` state
- Subscription moves to `pending` or `halted` state

**Your Webhook Handling**:
```typescript
// In /api/webhook/razorpay/subscription/route.ts
case 'subscription.charged.failed':
  // Update subscription status
  // Send notification to user (email/dashboard alert)
  // Provide manual retry option
  break;
```

**Dashboard Implementation**:
```typescript
// AdminSubscriptionDetails.tsx
{subscription.status === 'pending' && (
  <Button onClick={handleManualCharge}>
    Attempt Manual Charge
  </Button>
)}
```

### View Details Integration

**API Usage**:
```typescript
// Fetch subscription details
const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}`, {
  headers: {
    'Authorization': `Basic ${base64Encode(key_id:key_secret)}`
  }
});
```

**Your Implementation**:
- User dashboard: Show subscription status, invoices, payment history
- Admin dashboard: Show all subscriptions, manual charge option
- Webhook sync: Keep local DB in sync with Razorpay state

### Contact Information Mismatch

⚠️ **Important**: Contact information from payment method may differ from subscription creator

**Your Handling**:
```typescript
// Store both references in DB
{
  userId: "clerk_xxx",           // ShopPulse user
  razorpay_customer_id: "cust_xxx",  // Razorpay customer
  payment_card_holder: "John Doe",   // From card
  subscription_owner: "Jane Doe"     // Your user
}
```

---

## Related Documentation

- Part 1: [Subscriptions Overview](./1_RAZORPAY_SUBSCRIPTIONS_OVERVIEW.md)
- Part 2: [Subscriptions Workflow](./2_RAZORPAY_SUBSCRIPTIONS_WORKFLOW.md)
- Part 3: [Subscriptions States](./3_RAZORPAY_SUBSCRIPTIONS_STATES.md)
- Part 4: [Create and View Plans](./4_RAZORPAY_CREATE_AND_VIEW_PLANS.md)
- Part 5: [Create Subscriptions via Links](./5_RAZORPAY_CREATE_SUBSCRIPTIONS_VIA_LINKS.md)
- Part 7: Update Subscriptions (Next)
