# Subscription Upgrade Patterns — Part 2: Technical Deep Dive

## Table of Contents

1. [The 4 Fundamental Approaches](#the-4-fundamental-approaches)
2. [Approach 1: Prorated Instant Upgrade](#approach-1-prorated-instant-upgrade)
3. [Approach 2: Credit-as-Free-Days](#approach-2-credit-as-free-days)
4. [Approach 3: Invoice-Based Credit](#approach-3-invoice-based-credit)
5. [Approach 4: Cancel + Resubscribe](#approach-4-cancel--resubscribe)
6. [Why Payment Processors Limit Upgrades](#why-payment-processors-limit-upgrades)
7. [Razorpay's Subscription Update API — Under the Hood](#razorpays-subscription-update-api)

---

## The 4 Fundamental Approaches

Every subscription upgrade pattern in the industry falls into one of these four categories:

```
┌─────────────────────────────────────────────────────────────────┐
│                  Subscription Upgrade Approaches                │
├─────────────────┬───────────────┬────────────────┬──────────────┤
│ Prorated Instant│ Free Days     │ Invoice Credit │ Cancel+Resub │
│ (Netflix)       │ (Spotify)     │ (Shopify)      │ (Amazon IN)  │
├─────────────────┼───────────────┼────────────────┼──────────────┤
│ Charge now      │ No charge     │ Charge later   │ Charge now   │
│ New price-credit│ Extended cycle│ On next bill   │ Full price   │
│ Same billing    │ Billing shifts│ Same billing   │ Billing reset│
│ Needs card-on-  │ No mid-cycle  │ Invoice capable│ Works with   │
│ file charging   │ charge needed │ customers      │ any payment  │
└─────────────────┴───────────────┴────────────────┴──────────────┘
```

---

## Approach 1: Prorated Instant Upgrade

### Used by: Netflix, traditional SaaS (Slack, Notion), Stripe Billing

### How It Works (Technical)

```
Timeline:
─────────────────────────────────────────────────
Day 1          Day 10 (upgrade)           Day 30
|───── Old Plan ────|────── New Plan ──────|
     ₹799/mo              ₹1499/mo

Calculation:
  daysRemaining = 20
  totalDays     = 30
  
  credit     = oldPrice × (daysRemaining / totalDays)
             = 799 × (20/30) = ₹532.67
  
  newCharge  = newPrice × (daysRemaining / totalDays)  
             = 1499 × (20/30) = ₹999.33
  
  amountDue  = newCharge - credit = ₹466.67
  
  → Charge ₹466.67 to card immediately
  → On Day 30, charge full ₹1499
```

### Technical Requirements

1. **Card-on-file (CoF) charging capability** — must be able to initiate a charge at any time, not just on scheduled billing dates
2. **Billing engine that tracks partial periods** — need to know exact days remaining
3. **Atomic state transition** — plan must switch and charge atomically (if charge fails, plan shouldn't switch)
4. **Webhook/callback for charge failures** — if the prorated charge fails, need a recovery flow

### Architecture (Stripe Example)

```
Customer → Dashboard → "Upgrade" button
                          ↓
                    POST /v1/subscriptions/{id}
                    {
                      items: [{ price: 'price_new' }],
                      proration_behavior: 'create_prorations'
                    }
                          ↓
                    Stripe Billing Engine:
                    1. Calculate proration credit (invoice line items)
                    2. Create prorated charge line item  
                    3. Generate mid-cycle invoice
                    4. Charge invoice to default payment method
                    5. If charge succeeds → switch plan immediately
                    6. If charge fails → invoice stays open (retries)
                          ↓
                    webhook: invoice.paid → confirm upgrade
                    webhook: invoice.payment_failed → notify customer
```

### Why This Can't Work with Indian e-Mandates

The fundamental problem:

```
e-Mandate = pre-authorized debit of FIXED amount on FIXED schedule
            ≠ arbitrary amount on arbitrary date

Card Mandate:
  "I authorize ₹799 to be debited on the 15th of each month"
  → You CANNOT charge ₹466.67 on the 10th — mandate doesn't cover it

UPI AutoPay:
  "I authorize ₹799 monthly auto-debit via UPI"
  → Same restriction — can't charge different amount mid-cycle
  → Customer would need to approve a new mandate for ₹1499

Card-on-File (CoF) — what Netflix uses:
  "I authorize recurring charges (pre-debit notification required)"
  → CAN charge different amounts
  → But requires specific RBI compliance (AFA framework)
  → More complex to set up than e-mandates
```

---

## Approach 2: Credit-as-Free-Days

### Used by: Spotify, some gaming subscriptions (Xbox Game Pass)

### How It Works (Technical)

```
Timeline:
─────────────────────────────────────────────────────────
Day 1     Day 10 (upgrade)    Day 26.7        Day 56.7
|── Old ──|──── Free Days ────|── New Plan ───|
  ₹119/mo    16.7 days free      ₹149/mo

Calculation:
  daysRemaining = 21 (in old plan)
  
  creditAmount   = oldPrice × (daysRemaining / totalDays)
                 = 119 × (21/31) = ₹80.55
  
  freeDays       = creditAmount / (newPrice / daysInMonth)
                 = 80.55 / (149/31) = 16.76 days
  
  nextBillingDate = upgradeDate + freeDays
                  = Day 10 + 16.76 = Day ~27

  → No charge at upgrade time
  → New features available immediately  
  → First charge of ₹149 on Day 27
  → Then ₹149 every 31 days after
```

### Technical Requirements

1. **Flexible billing date system** — billing date must be able to shift to any day of the month
2. **Internal subscription state machine** — can't rely on payment processor's billing cycle
3. **No mid-cycle charge needed** — this is the key advantage
4. **Accurate day-fraction arithmetic** — rounding errors compound over multiple upgrades

### Architecture

```
Customer → App → "Upgrade" button
                     ↓
               Internal Billing Engine:
               1. Calculate credit amount from old plan
               2. Convert credit to free days at new plan rate
               3. Set plan = new plan (immediate)
               4. Set nextBillingDate = now + freeDays
               5. No payment charge initiated
                     ↓
               Scheduled job at nextBillingDate:
               → Charge full newPrice via stored payment method
               → Mandate/AutoPay amount updated to newPrice
```

### Why This Is Elegant

- **Zero payment friction** — no charge at upgrade time means:
  - No card decline risk
  - No mandate/UPI limitations
  - No "why was I charged?" support tickets
- **Works with ANY payment method** — since you're not charging mid-cycle
- **Mandate update at next billing** — gives time to set up new mandate amount
- The trade-off is a small revenue gap (the free days are slightly less than proportional value)

### The Revenue Impact

```
Without free-days (prorated charge):
  Revenue = credit + chargeNow + fullNewPrice at next billing
  Revenue = 80.55 + 68.45 + 149 = ₹298.00 over the period

With free-days:
  Revenue = 80.55 (already collected from old plan) + 149 (at next billing)
  Revenue = ₹229.55 over the same period

Difference: ₹68.45 per upgrade event
```

Spotify absorbs this because:
- Upgrade frequency is low (most users stay on one plan)
- Customer satisfaction > marginal revenue per upgrade
- Reduced support costs offset the revenue difference

---

## Approach 3: Invoice-Based Credit

### Used by: Shopify, enterprise SaaS (Salesforce, HubSpot)

### How It Works (Technical)

```
Timeline:
──────────────────────────────────────────────────
Day 1        Day 15 (upgrade)         Day 30
|── Old ────|──────── New Plan ───────|
  $39/mo           $105/mo

At upgrade:
  → Switch to new plan immediately (no charge)
  → Record: credit of $19.50 (15 remaining days at $39)
  → Record: prorated charge of $52.50 (15 days at $105)

At next billing (Day 30):
  Invoice line items:
  ├── $105.00  Shopify plan (full month)
  ├── -$19.50  Credit from previous plan
  └── +$52.50  Prorated charge for upgrade period
  ─────────────
  Total: $138.00
```

### Technical Requirements

1. **Invoice-based billing system** — must generate invoices with line items, not just charge amounts
2. **Credit/debit ledger** — track credits that carry forward to next invoice
3. **Deferred charging** — can accumulate charges and settle at billing date
4. **Mandate-compatible** — since you only charge at the scheduled billing date, mandates work fine

### Why This Works with Mandates

```
Old mandate: "$39 monthly on the 1st"
At upgrade (day 15): No charge — just internal accounting
At next billing (day 30):
  → Cancel old mandate
  → Create new mandate for $138 (first month) then $105 (ongoing)
  → OR: charge $138 as one-time + set up $105 recurring

Key insight: The charge always happens at the SCHEDULED billing date,
so mandate restrictions don't apply.
```

### Architecture

```
Customer → Dashboard → "Upgrade"
                          ↓
                    Billing Engine:
                    1. Calculate prorated credit (old plan unused portion)
                    2. Calculate prorated charge (new plan partial period)
                    3. Store both as pending invoice adjustments
                    4. Switch plan in database immediately
                    5. Grant new plan features immediately
                          ↓
                    At next billing date:
                    1. Generate invoice with adjustments
                    2. Charge total to payment method
                    3. Set up new recurring amount
```

---

## Approach 4: Cancel + Resubscribe

### Used by: Amazon Prime India, Disney+ Hotstar, **ShopPulse (our approach)**

### How It Works (Technical)

```
Timeline:
──────────────────────────────────────────────────
Day 1        Day 10 (upgrade)          Day 40
|── Old ────|                |── New Plan ──>
  ₹799/mo    cancelled       ₹1499/mo

At upgrade:
  1. Cancel current subscription immediately
  2. Forfeit remaining 20 days of credit (₹532.67 lost)
  3. Create new subscription with new plan
  4. Charge full ₹1499 for new plan
  5. New billing cycle starts from Day 10
```

### Technical Requirements

1. **Cancel API** — must support immediate cancellation
2. **Create API** — must support creating new subscription after cancel
3. **State management** — must track the intent to resubscribe across the cancel→create flow
4. **No proration needed** — simplifies billing engine significantly
5. **Works with ALL payment methods** — UPI, cards, e-mandate, netbanking — because it's a new subscription, not a modification

### Why This Is the Only Option with Razorpay + Indian Payment Methods

```
Razorpay's subscription.update() API:
  ├── schedule_change_at: "now"     ← BLOCKED by card mandate/UPI
  ├── schedule_change_at: "cycle_end" ← works but not "upgrade now"
  └── No prorated charging API        ← can't charge arbitrary amounts

So the only way to do "upgrade now" with Razorpay + Indian payments:
  1. Cancel old subscription (razorpay.subscriptions.cancel)
  2. Create new subscription (razorpay.subscriptions.create)
  3. Open checkout for user to authorize new mandate/payment
```

### Architecture (Our ShopPulse Implementation)

```
User clicks "Upgrade"
       ↓
UpgradeDialog → handleConfirmUpgrade()
       ↓
POST /api/subscription/upgrade/execute
       ↓
razorpay.subscriptions.update({ schedule_change_at: "now" })
       ↓
┌──────────────────────┐    ┌────────────────────────────┐
│ SUCCESS              │    │ ERROR: card mandate/UPI    │
│ (netbanking/wallet/  │    │ { requiresCancelFlow: true}│
│  international card) │    └────────────┬───────────────┘
│ → Upgrade applied    │                 ↓
│ → Poll for confirm   │    Payment Failure Dialog
└──────────────────────┘    "Your payment method doesn't 
                             support instant upgrades"
                                         ↓
                            User clicks "Cancel & Resubscribe"
                                         ↓
                            handleCancelAndResubscribe()
                            1. POST /api/subscription/cancel
                               { immediate: true }
                            2. localStorage.set('upgradeIntent', {
                                 newPlanId, newPlanName,
                                 lostCredit, timestamp, reason
                               })
                            3. router.push('/subscription/plans
                               ?upgrade=<planId>
                               &cancelled=true
                               &reason=payment-failure')
                                         ↓
                            Plans Page loads
                                         ↓
                            UpgradeIntentBanner reads localStorage
                            → Shows "Complete Your Upgrade" banner
                            → Shows lost credit amount
                            → Auto-scrolls to target plan after 5s
                                         ↓
                            User clicks "Get Started" on plan
                                         ↓
                            Razorpay Checkout opens (new subscription)
                            → User authorizes new payment
                            → POST /api/subscription/verify
                            → New subscription active!
```

### Trade-offs

| Advantage | Disadvantage |
|-----------|-------------|
| Works with ALL payment methods | User loses prorated credit |
| Simple billing logic | Requires page redirect (not seamless) |
| No mandate complications | User must re-authorize payment |
| Clean subscription state | Two API calls instead of one |
| RBI compliant | Slightly worse UX than instant upgrade |

---

## Why Payment Processors Limit Upgrades

### The RBI e-Mandate Regulation (2021)

In 2021, the Reserve Bank of India (RBI) issued regulations for recurring payments:

```
RBI Circular: RBI/2020-21/74 (October 2020, enforced September 2021)
Subject: "Processing of e-mandates for recurring transactions"

Key rules:
1. Customer must approve each recurring mandate
2. Mandate specifies: amount, frequency, validity period
3. For amounts > ₹15,000: Additional Factor of Authentication (AFA)
   required for EACH debit
4. Merchant CANNOT charge different amount than mandated
5. Merchant CANNOT charge on different schedule than mandated
6. Pre-debit notification mandatory 24 hours before
```

### What This Means for Subscription Upgrades

```
Scenario: User has ₹799/mo mandate on card
Wants to upgrade to ₹1499/mo

Option A: Charge ₹700 difference now
  ❌ Can't — mandate is for ₹799 only, not ₹700
  ❌ Can't — mandate schedule is monthly, not "right now"

Option B: Charge ₹1499 now via mandate  
  ❌ Can't — mandate is for ₹799, not ₹1499
  
Option C: Update mandate to ₹1499 and charge
  ⚠️ Technically possible but requires:
  1. Cancel old mandate
  2. Create new mandate for ₹1499
  3. Customer re-authenticates (OTP/UPI PIN)
  4. Wait for bank to register new mandate
  5. THEN charge
  → This is essentially cancel + resubscribe anyway

Option D: Cancel subscription, create new one for ₹1499
  ✅ This works! New mandate at ₹1499, customer authenticates once
```

### UPI AutoPay — Same Limitations

```
UPI AutoPay mandate:
  "Authorize ₹799 monthly from [bank] via UPI"
  
  → Amount is FIXED at creation time
  → Cannot be modified without creating new mandate
  → Customer must approve new mandate via UPI PIN
  → Effectively forces cancel + resubscribe
```

### Card-on-File (CoF) — The Exception

Netflix and some international platforms use Card-on-File, which is different:

```
Card-on-File (CoF):
  "Store card details, charge variable amounts with pre-notification"
  
  Rules (RBI AFA Framework):
  1. First transaction: full authentication (OTP)
  2. Subsequent: pre-debit notification 24h before
  3. For ≤ ₹15,000: no additional authentication needed
  4. For > ₹15,000: AFA (OTP) required per transaction
  
  → CAN charge different amounts ✅
  → CAN charge at any time ✅
  → But requires specific PCI-DSS compliance
  → More complex integration than Razorpay Subscriptions
```

### Why Razorpay Can't Offer Prorated Upgrades

Razorpay's Subscription API is built ON TOP OF mandates:

```
razorpay.subscriptions.create():
  → Creates a MANDATE (card/UPI/eMandate) for the plan amount
  → Mandate = fixed amount, fixed frequency
  
razorpay.subscriptions.update({ schedule_change_at: "now" }):
  → Tries to charge the new amount NOW
  → If mandate allows (netbanking session, international card): ✅
  → If mandate restricts (Indian card, UPI): ❌
  → Error: "Can't update subscription immediately when 
            card mandate is applicable"
```

Razorpay COULD theoretically:
1. Cancel old mandate
2. Create new mandate
3. Charge via new mandate

But their API **doesn't do this automatically** — they treat it as two separate operations that the merchant must orchestrate.

---

## Razorpay's Subscription Update API — Under the Hood

### What `subscriptions.update()` Actually Does

```javascript
// What we call:
razorpayInstance.subscriptions.update(subscriptionId, {
  plan_id: newPlanId,
  schedule_change_at: 'now',  // or 'cycle_end'
});

// What Razorpay does internally:
if (schedule_change_at === 'now') {
  mandate = getMandate(subscription);
  
  if (mandate.type === 'nach' || mandate.type === 'card_mandate') {
    // Indian domestic card or NACH mandate
    throw Error("Can't update subscription immediately 
                  when card mandate is applicable");
  }
  
  if (mandate.type === 'upi_autopay') {
    throw Error("Can't update subscription immediately 
                  for UPI subscriptions");
  }
  
  if (mandate.type === 'emandate') {
    throw Error("Can't update subscription immediately 
                  for eMandate subscriptions");
  }
  
  // Only reaches here for: netbanking, wallet, international cards
  // These don't have RBI mandate restrictions
  subscription.plan = newPlan;
  subscription.chargeNow(newPlan.amount);
  return { success: true };
}

if (schedule_change_at === 'cycle_end') {
  // Schedule change for next billing date — always works
  subscription.scheduledPlan = newPlan;
  subscription.scheduledChangeAt = subscription.currentPeriodEnd;
  return { success: true, scheduled: true };
}
```

### The `schedule_change_at: "cycle_end"` Alternative

We could avoid cancel+resubscribe by using cycle_end:

```
Pros:
  ✅ Works with all payment methods
  ✅ No credit loss (uses current plan until period end)
  ✅ Razorpay handles the switch automatically
  
Cons:
  ❌ User doesn't get new plan features NOW
  ❌ Might wait up to 30 days (monthly) or 365 days (yearly)
  ❌ User might forget they requested an upgrade
  ❌ For yearly plans, waiting 11 months is unacceptable
```

This is why cancel+resubscribe is preferred for IMMEDIATE upgrades when payment method doesn't support `schedule_change_at: "now"`.

---

*Continue to [Part 3](RAZORPAY_CANCEL_RESUBSCRIBE_FLOW.md) for our ShopPulse implementation details and the discussion that led to this architecture.*
