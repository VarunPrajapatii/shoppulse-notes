# Razorpay Subscriptions - Settings

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 9 of Razorpay Official Documentation Series

---

## Table of Contents
1. [Overview](#overview)
2. [Payment Methods](#payment-methods)
3. [Enable Payment Methods](#enable-payment-methods)
4. [Implementation Notes](#implementation-notes)

---

## Payment Methods

### Supported Payment Methods

| Payment Method | Max Recurring Amount | Currency Support | Notes |
|----------------|---------------------|------------------|-------|
| **Cards** | ₹15,000 | Multi-currency | Domestic cards limited to ₹15,000 |
| **UPI** | ₹15,000 | INR only | UPI-based recurring payments |
| **eMandate (NetBanking)** | No limit | INR only | Enabled by default |

💡 **Handy Tips**: Cards and UPI currently support recurring payments up to **₹15,000**. Charges of higher value would **automatically fail for domestic cards**.

---

## Enable Payment Methods

### Configure Payment Methods Using Dashboard

**Steps**:

1. Log in to the Dashboard
2. Click **Subscriptions** under **PAYMENT PRODUCTS** in the left menu
3. Go to **Settings**
4. Enable the payment methods:

#### Card
- Enable this to accept recurring payments via cards for your Subscriptions
- Supports both domestic and international cards
- Domestic cards limited to ₹15,000 per charge

#### UPI
- Enable this to accept UPI payments when a recurring charge is less than ₹15,000
- **Only INR is supported**
- UPI autopay feature

#### eMandate (NetBanking)
- Enable this to accept recurring payments via Emandate (NetBanking) for your Subscriptions
- **Only INR is supported**
- This payment method will be **enabled by default**
- You can disable it whenever required
- No amount limit

**Visual**: Configure Payment Methods using Settings (image available in official docs)

---

## Implementation Notes for ShopPulse

### Payment Method Limitations Impact

#### Your Pricing (from Previous Docs)

| Plan | Price | Can Use Domestic Cards? | Can Use UPI? |
|------|-------|------------------------|--------------|
| MINI | ₹999/month | ✅ Yes (< ₹15,000) | ✅ Yes |
| MIDI | ₹4,999/month | ✅ Yes (< ₹15,000) | ✅ Yes |
| MAXI | ₹9,999/month | ✅ Yes (< ₹15,000) | ✅ Yes |

**All your plans are under ₹15,000** - domestic cards and UPI supported for all tiers! 🎉

### Razorpay Checkout Configuration

```typescript
// In your /api/subscription/create/route.ts or frontend

const options = {
  key: process.env.RAZORPAY_KEY_ID,
  subscription_id: subscriptionId,
  name: 'ShopPulse',
  description: `${planName} Subscription`,
  
  // Configure payment methods
  config: {
    display: {
      blocks: {
        // Enable all supported methods
        card: {
          name: 'Credit/Debit Cards',
          instruments: [
            { method: 'card' }
          ]
        },
        upi: {
          name: 'UPI Autopay',
          instruments: [
            { method: 'upi' }
          ]
        },
        netbanking: {
          name: 'NetBanking (eMandate)',
          instruments: [
            { method: 'emandate' }
          ]
        }
      },
      sequence: ['card', 'upi', 'netbanking'], // Display order
      preferences: {
        show_default_blocks: true
      }
    }
  },
  
  prefill: {
    name: user.name,
    email: user.email,
    contact: user.phone
  },
  
  theme: {
    color: '#3399cc'
  }
};
```

### Payment Method Strategy

**Recommended Approach**:

1. **Enable All Three Methods**:
   - Cards (maximum reach)
   - UPI (growing preference in India)
   - eMandate (traditional, reliable)

2. **Display Order**:
   - Cards first (most familiar)
   - UPI second (popular among tech-savvy users)
   - eMandate third (backup option)

3. **User Communication**:
```typescript
// Show clear messaging on pricing page
<Alert>
  <InfoIcon />
  <AlertTitle>Multiple Payment Options</AlertTitle>
  <AlertDescription>
    Pay securely using Credit/Debit Cards, UPI Autopay, or NetBanking.
    All plans support recurring payments.
  </AlertDescription>
</Alert>
```

### Dashboard Settings Checklist

**Before Going Live**:

- [ ] Log in to Razorpay Dashboard
- [ ] Navigate to Subscriptions → Settings
- [ ] ✅ Enable **Card** payments
- [ ] ✅ Enable **UPI** payments
- [ ] ✅ Verify **eMandate** is enabled (default)
- [ ] Test each payment method with test cards/UPI
- [ ] Configure retry settings for failed payments
- [ ] Set up email/SMS notifications

### Failed Payment Handling

**Automatic Failures** (₹15,000+ domestic cards):
```typescript
// In webhook handler
case 'subscription.charged.failed':
  const reason = payload.payment?.error_reason;
  
  if (reason === 'amount_exceeds_limit') {
    // Domestic card limit exceeded
    await notifyUser({
      message: 'Payment failed: Amount exceeds domestic card limit. Please use international card or eMandate.',
      suggestedAction: 'change_payment_method'
    });
  }
  break;
```

### International Customers

**If expanding beyond India**:

| Region | Recommended Method | Notes |
|--------|-------------------|-------|
| India | Cards/UPI/eMandate | All three supported |
| Malaysia | Cards | Primary option |
| Singapore | Cards | Primary option |
| US | Cards | Primary option |
| International | Cards only | UPI/eMandate limited to India |

### Testing Payment Methods

```typescript
// Test cards for different scenarios
const TEST_CARDS = {
  success: '4111111111111111',
  insufficient_funds: '4000000000009995',
  invalid_cvv: '4000000000000101',
  expired_card: '4000000000000069'
};

// Test UPI IDs
const TEST_UPI = {
  success: 'success@razorpay',
  failure: 'failure@razorpay'
};
```

### Webhook Events by Payment Method

```typescript
// Different payment methods may trigger different flows

switch (event) {
  case 'subscription.authenticated':
    // Cards: ₹5 token charge (auto-refunded)
    // UPI: ₹1 verification (auto-refunded)
    // eMandate: Registration successful
    break;
    
  case 'subscription.charged.successfully':
    // Actual recurring charge successful
    // Method used: payload.payment.method (card/upi/emandate)
    break;
}
```

### User Dashboard Display

```typescript
// Show payment method used for subscription
<Card>
  <CardHeader>
    <CardTitle>Payment Method</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-2">
      {subscription.payment_method === 'card' && (
        <>
          <CreditCard className="h-4 w-4" />
          <span>Card ending in {subscription.card_last4}</span>
        </>
      )}
      {subscription.payment_method === 'upi' && (
        <>
          <Smartphone className="h-4 w-4" />
          <span>UPI: {subscription.upi_id}</span>
        </>
      )}
      {subscription.payment_method === 'emandate' && (
        <>
          <Building className="h-4 w-4" />
          <span>NetBanking: {subscription.bank_name}</span>
        </>
      )}
    </div>
    <Button variant="outline" size="sm" className="mt-2">
      Update Payment Method
    </Button>
  </CardContent>
</Card>
```

---

## Related Documentation

- Part 1: [Subscriptions Overview](./1_RAZORPAY_SUBSCRIPTIONS_OVERVIEW.md)
- Part 2: [Subscriptions Workflow](./2_RAZORPAY_SUBSCRIPTIONS_WORKFLOW.md)
- Part 3: [Subscriptions States](./3_RAZORPAY_SUBSCRIPTIONS_STATES.md)
- Part 4: [Create and View Plans](./4_RAZORPAY_CREATE_AND_VIEW_PLANS.md)
- Part 5: [Create Subscriptions via Links](./5_RAZORPAY_CREATE_SUBSCRIPTIONS_VIA_LINKS.md)
- Part 6: [Manual Charge & View Details](./6_RAZORPAY_MANUAL_CHARGE_AND_VIEW.md)
- Part 7: [Update Subscriptions](./7_RAZORPAY_UPDATE_SUBSCRIPTION.md)
- Part 8: [Pause, Resume, Cancel](./8_RAZORPAY_PAUSE_RESUME_CANCEL.md)

---

## Summary

**Configuration Complete!** ✅

You now have comprehensive Razorpay Subscriptions documentation covering:
1. ✅ Overview & Billing Models
2. ✅ Workflow & Lifecycle
3. ✅ States & Transitions
4. ✅ Create & View Plans
5. ✅ Create via Links
6. ✅ Manual Charge & View
7. ✅ Update Subscriptions
8. ✅ Pause, Resume, Cancel
9. ✅ Settings & Payment Methods

**Next Steps for ShopPulse**:
- Review all 9 documentation files
- Implement upgrade flow from 1.2.7 guide
- Configure Dashboard settings (enable payment methods)
- Test with Razorpay test credentials
- Deploy to production
