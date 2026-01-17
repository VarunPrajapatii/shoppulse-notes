# Upgrade Q&A 1.2: Payment Method Detection & UPI/eMandate Issues

**Topic**: How to detect payment method and handle UPI/eMandate limitations  
**Date**: November 27, 2025  
**Status**: Technical Deep Dive

---

## Question 2: Payment Method Detection

### The Question
> User paid with UPI initially. Now they want to upgrade. Razorpay UPDATE API will fail with UPI/eMandate as per docs. How do we know what payment method user has saved at Razorpay, so we can warn them before attempting upgrade?

---

## The Core Problem

### Razorpay UPDATE API Limitations

According to Razorpay docs:

```
✅ WORKS: Card-based subscriptions
❌ FAILS: UPI subscriptions
❌ FAILS: eMandate subscriptions
❌ FAILS: Bank Transfer subscriptions
```

**Why?**
- **Cards**: Support immediate charges via saved card token
- **UPI**: Requires user to manually approve each payment (no auto-charge)
- **eMandate**: Mandate authorization required for each charge
- **Bank Transfer**: Manual bank transfer needed

### The Challenge

```
User signs up → Pays with UPI → subscription.authenticated webhook fires
  ↓
We store: razorpaySubscriptionId
  ↓
User clicks "Upgrade" 6 months later
  ↓
Question: How do we know payment method is UPI?
  ↓
If we don't check → UPDATE API fails → User confused
```

**Database doesn't store payment method!**

---


## Solution 3: Detect During Upgrade Attempt (FALLBACK)

### When to Use

If you haven't implemented Solutions 1 or 2, this is a fallback approach.

### How It Works

Let the upgrade attempt fail at Razorpay, then parse the error.

```typescript
// In execute API

try {
  const updatedSubscription = await razorpayInstance.subscriptions.update(
    razorpaySubscriptionId,
    {
      plan_id: newPlan.razorpayPlanId,
      quantity: 1,
      schedule_change_at: 'now',
    }
  );
} catch (razorpayError: any) {
  console.error('Razorpay UPDATE API failed:', razorpayError);

  // Parse error to detect payment method issue
  const errorMsg = razorpayError.error?.description || razorpayError.message;

  if (
    errorMsg.includes('UPI') ||
    errorMsg.includes('emandate') ||
    errorMsg.includes('payment method')
  ) {
    return NextResponse.json(
      {
        error: 'Payment Method Not Supported',
        details: 'Upgrades require a saved card. Please update your payment method.',
        errorCode: 'PAYMENT_METHOD_UNSUPPORTED',
        razorpayError: errorMsg,
      },
      { status: 400 }
    );
  }

  // Generic error
  return NextResponse.json(
    { error: 'Upgrade failed', details: errorMsg },
    { status: 500 }
  );
}
```

**Pros**: No extra API calls or database changes  
**Cons**: User sees error only after clicking "Confirm Upgrade"

---


## User Flow with Solution 3

### Success Case: Card Payment

```
1. User clicks "Upgrade to This Plan" (MAXI plan)
   ↓
2. UpgradeDialog opens
   ↓
3. User clicks "Confirm Upgrade"
   ↓
4. Execute API calls Razorpay UPDATE API
   ↓
5. Razorpay checks: Payment method = Card ✅
   ↓
6. Razorpay charges card successfully
   ↓
7. Execute API returns success
   ↓
8. Dialog: "Upgrade successful! Confirming..."
   ↓
9. Redirect to My Plan with polling banner
   ↓
10. Webhook arrives, updates DB
    ↓
11. Banner: "Upgrade Complete! 🎉"
```

---

### Failure Case: UPI Payment Method

```
1. User clicks "Upgrade to This Plan"
   ↓
2. UpgradeDialog opens
   ↓
3. User clicks "Confirm Upgrade"
   ↓
4. Execute API calls Razorpay UPDATE API
   ↓
5. Razorpay checks: Payment method = UPI ❌
   ↓
6. Razorpay returns error:
   "subscriptions cannot be updated when payment mode is UPI"
   ↓
7. Execute API catches error, returns structured response:
   {
     errorCode: 'BAD_REQUEST_ERROR',
     error: 'subscriptions cannot be updated...',
     razorpayError: { ... }
   }
   ↓
8. UpgradeDialog parses error:
   - Detects "upi" in error message
   - Extracts payment method = "UPI"
   ↓
9. Toast shows:
   "Payment Method Not Supported"
   "UPI does not support instant upgrades.
    Razorpay requires a card for immediate plan changes.
    Please update your payment method in Razorpay Dashboard."
   ↓
10. Dialog stays open (user can cancel or retry after fixing)
```

---

### Failure Case: Card Declined

```
1-4. [Same as success case]
   ↓
5. Razorpay checks: Payment method = Card ✅
   ↓
6. Razorpay attempts charge → Bank declines
   ↓
7. Razorpay returns error:
   "Card payment declined by bank"
   ↓
8. Execute API catches error, returns:
   {
     errorType: 'PAYMENT_ERROR',
     error: 'Card payment declined by bank'
   }
   ↓
9. UpgradeDialog parses error:
   - Detects "declined" in message
   ↓
10. Toast shows:
    "Card Declined"
    "Your card was declined by the bank.
     Please check with your bank or try another card."
```

---

### Failure Case: Minimum Charge Not Met

```
1-4. [Same as success case]
   ↓
5. Razorpay calculates prorated charge: ₹0.25
   ↓
6. Razorpay checks: ₹0.25 < ₹0.50 minimum ❌
   ↓
7. Razorpay returns error:
   "The difference amount after updating subscription
    is less than the minimum amount"
   ↓
8. UpgradeDialog parses error:
   - Detects "minimum" or "difference"
   ↓
9. Toast shows:
   "Upgrade Amount Too Small"
   "The prorated charge difference is less than ₹0.50.
    Please wait a few more days in your billing cycle."
```

---

## Edge Cases Handled

### 1. Mid-Cycle Payment Method Change

**Scenario**:
```
Month 1: User subscribes with Card
Month 3: Autopay fails, user updates to UPI in Razorpay
Month 6: User tries to upgrade
```

**Solution 3 Behavior**:
```
✅ Execute API calls Razorpay UPDATE API
✅ Razorpay knows current method is UPI
✅ Razorpay returns UPI error
✅ We parse and show: "UPI not supported"
```

**Solution 1/2 Would**:
```
❌ Check DB: Says "Card"
❌ Allow upgrade attempt
❌ Razorpay fails
❌ Generic error shown
```

---

### 2. Future Payment Method Support

**Scenario**:
```
Today: Razorpay doesn't support UPI upgrades
Future: Razorpay adds UPI upgrade support
```

**Solution 3 Behavior**:
```
✅ User tries UPI upgrade
✅ Razorpay succeeds (new feature!)
✅ No error thrown
✅ Upgrade completes successfully
✅ Our code needs NO changes
```

**Solution 1/2 Would**:
```
❌ Check DB/API: Says "UPI"
❌ Our code blocks: "UPI not supported"
❌ User can't upgrade (even though Razorpay allows it)
❌ We need to update code to remove block
```

---

### 3. New Payment Method Introduced

**Scenario**:
```
Razorpay adds new method: "Wallet" (Paytm, PhonePe, etc.)
```

**Solution 3 Behavior**:
```
✅ User tries upgrade with Wallet
✅ Razorpay decides if allowed
✅ If not allowed: Returns error
✅ We parse error: "payment mode is Wallet"
✅ Show: "Wallet does not support upgrades"
✅ No code changes needed
```
---

## Payment Method Detection Flow

```
User clicks "Upgrade" button
  ↓
UpgradeDialog opens
  ↓
[Fetch payment method from DB] ← Solution 2
  OR
[Call GET /api/subscription/payment-method] ← Solution 1
  ↓
If payment method = 'card':
  ✅ Show normal preview
  ✅ Enable confirm button
  ✅ Proceed with upgrade
  ↓
If payment method = 'upi' | 'emandate':
  ❌ Show warning alert
  ❌ Disable confirm button
  ❌ Link to update payment method
  ↓
If payment method = null (unknown):
  ⚠️  Show info alert: "Payment method verification failed"
  ⚠️  Allow upgrade attempt (might fail at Razorpay)
  ⚠️  If fails, show error with instructions
```

---

## Razorpay API Response Examples

### Card Payment Method

```json
{
  "id": "sub_xxxxx",
  "entity": "subscription",
  "plan_id": "plan_xxxxx",
  "customer_id": "cust_xxxxx",
  "status": "active",
  "payment_method": "card",
  "card_id": "card_xxxxx",
  "notes": {},
  "created_at": 1234567890
}
```

### UPI Payment Method

```json
{
  "id": "sub_xxxxx",
  "entity": "subscription",
  "plan_id": "plan_xxxxx",
  "customer_id": "cust_xxxxx",
  "status": "active",
  "payment_method": "upi",
  "notes": {},
  "created_at": 1234567890
}
```

### eMandate Payment Method

```json
{
  "id": "sub_xxxxx",
  "entity": "subscription",
  "plan_id": "plan_xxxxx",
  "customer_id": "cust_xxxxx",
  "status": "active",
  "payment_method": "emandate",
  "auth_type": "physical",
  "notes": {},
  "created_at": 1234567890
}
```

---
