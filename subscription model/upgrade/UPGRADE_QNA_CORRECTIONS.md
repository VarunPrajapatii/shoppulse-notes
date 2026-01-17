# UPGRADE Q&A - CORRECTIONS & OFFICIAL REFERENCES

**Document Purpose**: Corrections to UPGRADE_QNA files based on official Razorpay documentation  
**Date**: November 27, 2025  
**Status**: Critical Corrections

---

## ⚠️ Important Notice

The three Q&A documents (1.1, 1.2, 1.3) were created based on general Razorpay knowledge. After reviewing the **official Razorpay documentation** in `notes/razorpay_official/`, several corrections are needed.

**Official Documentation Sources**:
- Part 18: Subscriptions Entity
- Part 23: Update Subscription API
- Part 23B: Immediate Updates & Proration
- Part 32: Webhooks (authenticated & activated)
- Part 33: Create vs Update Differences

---

## Correction 1: Payment Method Detection

### ❌ What Q&A 1.2 Said (INCORRECT)

```typescript
// Claimed: subscription.payment_method field exists
const subscription = await razorpay.subscriptions.fetch(subscriptionId);
const paymentMethod = subscription.payment_method; // ❌ NOT ACCURATE
```

### ✅ Official Razorpay Documentation Says (CORRECT)

According to **Part 18 (Subscriptions Entity)** and **Part 32 (Webhooks)**:

**Method 1: From Payment Entity in Webhook (RECOMMENDED)**

```typescript
// In subscription.authenticated webhook handler
export async function handleSubscriptionAuthenticated(
  subscription: any,
  subscriptionEntity: any,
  paymentEntity: any  // ← Payment entity is provided in webhook
) {
  // Extract payment method from payment entity
  const paymentMethod = paymentEntity?.method; // 'card', 'upi', 'emandate', 'netbanking'
  
  const paymentDetails: any = {};
  
  if (paymentEntity?.method === 'card') {
    paymentDetails = {
      method: 'card',
      card_network: paymentEntity.card?.network,
      card_last4: paymentEntity.card?.last4,
      card_type: paymentEntity.card?.type,
    };
  } else if (paymentEntity?.method === 'upi') {
    paymentDetails = {
      method: 'upi',
      vpa: paymentEntity.vpa,
    };
  } else if (paymentEntity?.method === 'emandate') {
    paymentDetails = {
      method: 'emandate',
      bank: paymentEntity.bank,
      auth_type: paymentEntity.auth_type,
    };
  }

  // Store in database
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      paymentMethod: paymentMethod,
      paymentMethodDetails: paymentDetails,
    },
  });
}
```

**Why This Works**: Per Part 32, the `subscription.authenticated` webhook payload includes BOTH subscription entity AND payment entity. The payment entity has the `method` field.

---

**Method 2: Fetch Payment After Subscription Created**

```typescript
// After subscription is created/authenticated
const subscription = await razorpay.subscriptions.fetch(subscriptionId);

// Fetch the authorization payment
// Note: Need to find the payment ID first (not directly in subscription entity)
const payments = await razorpay.payments.all({
  subscription_id: subscriptionId,
  count: 1, // Get first payment
});

if (payments.items.length > 0) {
  const authPayment = payments.items[0];
  const paymentMethod = authPayment.method; // 'card', 'upi', 'emandate'
}
```

---

## Correction 2: Webhook Flow for Updates

### ✅ Q&A 1.1 Got This RIGHT

Per **Part 33 (Create vs Update Differences)**:

| Event | Initial Subscription | Subscription Update |
|-------|---------------------|---------------------|
| User Flow | Checkout page | No checkout (background) |
| Webhooks | `subscription.authenticated` + `subscription.activated` | `subscription.updated` ONLY |
| Verification | Required (signature check) | NOT required |
| Payment Entity | New payment | Invoice (upgrade) or Credit Note (downgrade) |

**Key Quote from Part 33**:
> "For updates: ONLY `subscription.updated` fires. No verification needed for updates (unlike initial creation)"

So Q&A 1.1's explanation was **correct** - only the `subscription.updated` webhook fires for upgrades.

---

## Correction 3: Proration Calculation

### ❌ What Q&A 1.1 Said (SIMPLIFIED)

```typescript
// Simplified proration
const daysRemaining = differenceInDays(periodEnd, now);
const credit = (currentPrice / 30) * daysRemaining;
const newCharge = (newPrice / 30) * daysRemaining;
const difference = newCharge - credit;
```

### ✅ Official Razorpay Formula (ACCURATE)

Per **Part 23B (Immediate Updates & Proration Details)**, the official formula is:

#### Step 1: Calculate Plan Amount Per Day

```typescript
const planAmountPerDay = (planAmount × quantity) / frequencyInDays;
```

#### Step 2: Calculate Days to be Charged

```typescript
// IMPORTANT: Days charged = Plan Change Day - 1
// (Because customers are charged at END of day)
const daysToBeCharged = planChangeDay - 1;
```

**Example from Official Docs**:
```typescript
// Change on Day 1 (immediately after activation)
daysToBeCharged = 1 - 1 = 0 days

// Change on Day 15 (mid-cycle)
daysToBeCharged = 15 - 1 = 14 days
```

#### Step 3: Calculate Remaining Days

```typescript
const remainingDays = frequencyInDays - daysToBeCharged;
```

#### Step 4: Calculate Credit (Remaining Amount)

```typescript
const remainingAmount = planAmountPerDay × remainingDays;
```

#### Step 5: Calculate New Plan Charge

```typescript
// For SAME billing frequency
const newPlanCharge = (newPlanAmount × newQuantity) / frequency × remainingDays;

// For DIFFERENT billing frequency
const newPlanCharge = newPlanAmount × newQuantity;
// (Full cycle of new plan starts from change day)
```

#### Step 6: Calculate Final Charge/Refund

```typescript
const finalAmount = newPlanCharge - remainingAmount;

if (finalAmount > 0) {
  // Charge customer (upgrade)
} else if (finalAmount < 0) {
  // Refund customer (downgrade)
} else {
  // No adjustment
}
```

---

## Correction 4: UPI/eMandate Restrictions

### ✅ Q&A 1.2 and 1.3 Got This RIGHT

Per **Part 23B**, the official restrictions are:

```typescript
// From Part 23B: "Rule 3: Payment Method Restrictions"

// ❌ Cannot update UPI/Emandate subscriptions

const subscription = await razorpay.subscriptions.fetch(subId);

if (['upi', 'emandate'].includes(subscription.payment_method)) {
  throw new Error('UPI/Emandate subscriptions cannot be updated. Customer must cancel and create new subscription.');
}
```

**Official Quote**:
> "❌ **Cannot update UPI/Emandate subscriptions**"

So the Q&A documents were **correct** about this limitation.

---

## Correction 5: Minimum Charge Difference

### ✅ Q&A 1.1, 1.2, 1.3 Got This RIGHT

Per **Part 23B (Rule 1: Minimum Amount Difference)**:

> "⚠️ **The prorated amount difference must be at least ₹0.50 (50 currency subunits)**"

Official error response:
```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "The difference amount after updating subscription is less than the minimum amount"
  }
}
```

The Q&A documents correctly stated this rule.

---

## Correction 6: Subscription Update Process

### ✅ Q&A 1.1 Got This MOSTLY RIGHT

Per **Part 33 (Subscription Update Flow)**:

**Official Flow**:
```
1. User clicks "Upgrade" on your website
2. Show preview (calculate proration)
3. User confirms upgrade
4. POST /v1/subscriptions/:id (with schedule_change_at: 'now')
5. Razorpay creates invoice for difference amount
6. Razorpay charges saved payment method (background)
7. If successful → subscription.updated webhook fires
8. If failed → No webhook, subscription stays on old plan
9. Update database (only after webhook)
10. Show success message to user
```

**Key Points from Official Docs**:
- ✅ No user-facing redirect (unlike initial creation)
- ✅ No verification endpoint needed (unlike initial creation)
- ✅ Charges happen in background
- ✅ Webhook fires ONLY if successful
- ✅ Automatic rollback if payment fails

Q&A 1.1's explanation matches this flow.

---

## Correction 7: Invoice vs Payment Entity

### 🔄 Q&A 1.1 Needs Clarification

Per **Part 33**:

**For Initial Subscription**:
```typescript
// Payment entity is created
{
  "entity": "payment",
  "id": "pay_xxxxx",
  "method": "card",
  "amount": 100,
  "status": "captured"
}
```

**For Subscription Update (Upgrade)**:
```typescript
// Invoice is created (not payment entity directly)
{
  "entity": "invoice",
  "id": "inv_xxxxx",
  "amount": 40000, // Difference amount
  "status": "issued"
}

// Then payment is made against the invoice
```

The distinction is subtle but important for webhook handling.

---

## Updated Implementation Recommendations

### Priority 1: Store Payment Method in Database (HIGH)

**Why**: Razorpay doesn't make payment method easily accessible from subscription entity alone.

**Implementation** (from Q&A 1.2, but with corrected webhook code):

```typescript
// In subscription.authenticated webhook handler
// File: src/app/api/webhook/razorpay/subscription/handlers/authenticated.ts

export async function handleSubscriptionAuthenticated(
  subscription: any,
  subscriptionEntity: any,
  paymentEntity: any  // ← Provided in webhook payload
) {
  console.log('[WEBHOOK] Handling subscription.authenticated');

  // Extract payment method from paymentEntity (not subscriptionEntity)
  const paymentMethod = paymentEntity?.method || 'unknown';
  
  // Extract payment details based on method
  let paymentMethodDetails: any = {};
  
  if (paymentEntity) {
    if (paymentEntity.method === 'card') {
      paymentMethodDetails = {
        method: 'card',
        card_network: paymentEntity.card?.network,
        card_last4: paymentEntity.card?.last4,
        card_type: paymentEntity.card?.type,
      };
    } else if (paymentEntity.method === 'upi') {
      paymentMethodDetails = {
        method: 'upi',
        vpa: paymentEntity.vpa,
      };
    } else if (paymentEntity.method === 'emandate') {
      paymentMethodDetails = {
        method: 'emandate',
        bank: paymentEntity.bank,
        auth_type: subscriptionEntity.auth_type,
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        razorpayCustomerId: subscriptionEntity.customer_id,
        
        // Store payment method (NEW)
        paymentMethod: paymentMethod,
        paymentMethodDetails: paymentMethodDetails,
        
        updatedAt: new Date(),
      },
    });
  });

  console.log('✅ Payment method stored:', paymentMethod);
}
```

---

### Priority 2: Use Accurate Proration Formula (MEDIUM)

Update the preview API to match Razorpay's official formula:

```typescript
// File: src/app/api/subscription/upgrade/preview/route.ts

// Calculate days to be charged (IMPORTANT: -1 because charged at end of day)
const today = new Date();
const periodStart = subscription.currentPeriodStart;
const dayNumber = differenceInDays(today, periodStart) + 1; // Current day number
const daysToBeCharged = dayNumber - 1; // Charged days

// Calculate remaining days
const totalDaysInCycle = differenceInDays(
  subscription.currentPeriodEnd,
  subscription.currentPeriodStart
);
const remainingDays = totalDaysInCycle - daysToBeCharged;

// Calculate per-day amounts
const currentPerDay = (currentPrice * quantity) / totalDaysInCycle;
const newPerDay = (newPrice * quantity) / totalDaysInCycle;

// Calculate credit and new charge
const remainingAmount = currentPerDay * remainingDays;
const newPlanCharge = newPerDay * remainingDays;

// Final difference
const expectedCharge = newPlanCharge - remainingAmount;
```

---

### Priority 3: Check Payment Method Before Upgrade (HIGH)

Use the stored payment method from database:

```typescript
// File: src/app/api/subscription/upgrade/preview/route.ts

const currentSub = user.subscription;

// Check payment method from database (stored during authentication)
if (currentSub.paymentMethod && currentSub.paymentMethod !== 'card') {
  return NextResponse.json({
    canUpgrade: false,
    reason: `Upgrades are only supported for card payments. Your subscription uses ${currentSub.paymentMethod.toUpperCase()}. Please update your payment method to a card.`,
    currentPaymentMethod: currentSub.paymentMethod,
    paymentMethodDetails: currentSub.paymentMethodDetails,
  });
}
```

---

## Summary of Required Changes

| Q&A Doc | Section | Change Required | Priority |
|---------|---------|----------------|----------|
| 1.2 | Payment Method Detection | Update to use webhook payload method | HIGH |
| 1.2 | Razorpay API Examples | Clarify payment entity vs subscription entity | MEDIUM |
| 1.1 | Proration Formula | Use official formula with "day - 1" logic | MEDIUM |
| All | Code Examples | Ensure webhook uses paymentEntity.method | HIGH |
| 1.3 | Store Payment Method | Update webhook handler code | HIGH |

---

## References to Official Documentation

All corrections are based on:

1. **Part 18**: `notes/razorpay_official/18_RAZORPAY_SUBSCRIPTIONS_ENTITY.md`
2. **Part 23B**: `notes/razorpay_official/23B_RAZORPAY_UPDATE_IMMEDIATE_PRORATION.md`
3. **Part 32**: `notes/razorpay_official/32_RAZORPAY_WEBHOOKS_AUTH_ACTIVATED.md`
4. **Part 33**: `notes/razorpay_official/33_RAZORPAY_CREATE_VS_UPDATE_DIFFERENCES.md`

**Always refer to official Razorpay documentation for authoritative information.**

---

## Action Items

- [ ] Update `authenticated.ts` webhook handler to extract payment method from `paymentEntity`
- [ ] Update preview API to use official proration formula
- [ ] Add database fields: `paymentMethod` and `paymentMethodDetails`
- [ ] Run migration to add new fields
- [ ] Test payment method detection with card, UPI, and eMandate
- [ ] Update frontend to read payment method from database
- [ ] Remove any direct `subscription.payment_method` references

---

**End of Corrections Document**

The three Q&A documents are still valuable, but should be read alongside this corrections document for 100% accuracy with official Razorpay documentation.
