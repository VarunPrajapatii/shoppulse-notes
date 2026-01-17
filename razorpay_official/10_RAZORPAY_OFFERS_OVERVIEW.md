# Razorpay Subscription Offers - Overview

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 10 of Razorpay Official Documentation Series

---

## Table of Contents
1. [About Offers](#about-offers)
2. [How It Works](#how-it-works)
3. [Discount Calculations](#discount-calculations)
4. [Offer States](#offer-states)
5. [Customization Options](#customization-options)

---

## About Offers

### Overview

You can use **Subscription Offers** to provide discounts or cashback on Subscriptions. This helps you:
- ✅ Attract more customers
- ✅ Retain existing customers
- ✅ Increase sales

### Complete Control

You have complete control over:
- 💳 **Payment methods** on which the offer should be applied
- 👥 **Maximum number of customers** who can avail the offers
- ⏰ **Time period** of offers (start/end dates)

### Availability

Available in:
- 🇮🇳 **IN** - India only

---

## How It Works

You can create and apply offers for Subscriptions in **3 easy steps**:

```
Step 1: Create an offer from the Dashboard
        ↓
Step 2: Create a Plan for the Subscription
        ↓
Step 3: Link the offer to a Subscription
```

### Customer Experience

After you create a Subscription with an offer:
1. Customer goes to checkout
2. Customer can **select the offer** when making the payment
3. Offer is **applied immediately**
4. Discounted amount is shown on checkout

**Visual**: Offer preview on checkout (image available in official docs)

---

## Discount Calculations

There are **2 types** of discount calculations:
1. **Percentage Discount** - X% off up to max amount
2. **Flat Discount** - Fixed amount off

### Percentage Discount Calculations

**Example Scenario**: You sell keto meals 🥗

**Subscription Details**:
- Plan amount = ₹1,000/month
- Quantity = 2 units
- Upfront amount (delivery fee) = ₹250/month
- Add-on (keto chips) = ₹250/month

**Offer**: 10% discount up to ₹300

**Calculation**:
```
Step 1: Calculate Total Amount
Total amount = (Plan amount × Quantity) + Upfront Amount
Total amount = (₹1,000 × 2) + ₹250
Total amount = ₹2,250

Step 2: Calculate Discount Amount
Discount amount = Total amount × Discount percentage
Discount amount = ₹2,250 × 10%
Discount amount = ₹225

Step 3: Check Max Discount Cap
Discount calculated (₹225) < Max cap (₹300)
Final discount = ₹225 ✅

Step 4: Final Amount Charged
Final amount = ₹2,250 - ₹225 = ₹2,025
```

**Important Notes**:
- Add-ons are **NOT included** in discount calculation (only plan amount + upfront amount)
- In this example, keto chips (₹250) are NOT discounted
- Max cap prevents excessive discounts (₹300 limit)

### Flat Discount Calculations

**Example Scenario**: You sell keto meals 🥗

**Subscription Details**:
- Plan amount = ₹1,000/month
- Quantity = 2 units
- Upfront amount (delivery fee) = ₹250/month

**Offer**: Flat ₹150 discount

**Calculation**:
```
Step 1: Calculate Total Amount
Total amount = (Plan amount × Quantity) + Upfront Amount
Total amount = (₹1,000 × 2) + ₹250
Total amount = ₹2,250

Step 2: Apply Flat Discount
Discount amount = ₹150 (fixed)

Step 3: Final Amount Charged
Final amount = ₹2,250 - ₹150 = ₹2,100
```

**Simpler Calculation**:
- No percentages to calculate
- No max cap needed (discount is fixed)
- Predictable discount amount

### Comparison Table

| Aspect | Percentage Discount | Flat Discount |
|--------|-------------------|---------------|
| **Calculation** | Based on total amount | Fixed amount |
| **Complexity** | More complex (% + cap) | Simple (fixed) |
| **Scalability** | Scales with plan price | Same for all plans |
| **Best For** | High-value plans | Uniform discount across plans |
| **Example** | 10% off up to ₹300 | ₹150 off |

⚠️ **Watch Out!**: Offers can only be applied if the **chargeable amount after applying the offer is greater than ₹1**.

**Example of Invalid Offer**:
```
Plan amount = ₹10/month
Flat discount = ₹10
Final amount = ₹10 - ₹10 = ₹0 ❌ (Invalid - must be > ₹1)
```

---

## Offer States

A Subscription offer has **2 states**:

### State Diagram

```
     ┌──────────┐
     │ ENABLED  │ ← Offer is active and available
     └────┬─────┘
          │
          │ (Disable action)
          ↓
     ┌──────────┐
     │ DISABLED │ ← Offer is no longer available
     └──────────┘
```

### State Descriptions

| State | Description | Customer Visibility | Actions Available |
|-------|-------------|---------------------|-------------------|
| **ENABLED** | Offer is active | ✅ Visible on checkout | Disable |
| **DISABLED** | Offer is inactive | ❌ Hidden from checkout | Re-enable (create new) |

**Visual**: Offers lifecycle (diagram available in official docs)

---

## Customization Options

There are **3 main parameters** to customize and control offers:

### 1. Subscription Offer Type

| Type | Description | Use Case | Example |
|------|-------------|----------|---------|
| **Single Use** | One-time discount | Welcome discount | "₹500 off your first month" |
| **Limited Cycles** | Applied for X cycles | Trial incentive | "50% off for first 3 months" |
| **Forever** | Applied for entire duration | Loyalty reward | "10% off forever for annual plan" |

**Detailed Examples**:

#### Single Use Example
```
Subscription: MIDI plan (₹4,999/month) for 12 months
Offer: ₹1,000 off (single use)

Month 1: ₹4,999 - ₹1,000 = ₹3,999 ✅ (discount applied)
Month 2: ₹4,999 (no discount)
Month 3: ₹4,999 (no discount)
...
Month 12: ₹4,999 (no discount)

Total paid: ₹3,999 + (₹4,999 × 11) = ₹58,988
```

#### Limited Cycles Example
```
Subscription: MAXI plan (₹9,999/month) for 12 months
Offer: 50% off for first 3 cycles

Month 1: ₹9,999 × 50% = ₹4,999.50 ✅ (discount applied)
Month 2: ₹9,999 × 50% = ₹4,999.50 ✅ (discount applied)
Month 3: ₹9,999 × 50% = ₹4,999.50 ✅ (discount applied)
Month 4: ₹9,999 (no discount)
Month 5: ₹9,999 (no discount)
...
Month 12: ₹9,999 (no discount)

Total paid: (₹4,999.50 × 3) + (₹9,999 × 9) = ₹104,988.50
```

#### Forever Example
```
Subscription: MINI plan (₹999/month) - annual commitment
Offer: 10% off forever

Month 1: ₹999 × 10% = ₹899.10 ✅ (discount applied)
Month 2: ₹999 × 10% = ₹899.10 ✅ (discount applied)
Month 3: ₹999 × 10% = ₹899.10 ✅ (discount applied)
...
Month 12: ₹999 × 10% = ₹899.10 ✅ (discount applied)

Total paid: ₹899.10 × 12 = ₹10,789.20
Savings: (₹999 - ₹899.10) × 12 = ₹1,198.80 💰
```

### 2. Discount Type

| Type | Description | Calculation | Example |
|------|-------------|-------------|---------|
| **Flat** | Fixed amount off | `Total - FixedAmount` | "₹500 off" |
| **Percentage** | % of subscription amount | `Total × (1 - Percentage)` | "10% off" |

**When to Use Each**:

- **Use Flat Discount When**:
  - You want predictable discount amount
  - Marketing simple offers ("₹100 off")
  - Same discount across all plans
  - Example: "First month ₹500 off"

- **Use Percentage Discount When**:
  - You want discount to scale with plan value
  - Higher-value plans get higher discounts
  - Marketing premium offers ("25% off")
  - Example: "25% off for annual subscribers"

### 3. Payment Method Restrictions

You can restrict offers to specific payment methods:

#### Card Offers

**Customization Options**:
- 💳 **Card Type**: Credit card, debit card, or both
- 🏦 **Bank**: Specific bank (HDFC, Axis) or all banks
- 🌐 **Network**: Visa, Mastercard, RuPay, or all networks
- 🔢 **Max Usage Per Card**: How many times a card can use the offer
- 🔐 **IINs**: Specific card IINs (comma-separated)

**Example - Bank-Specific Offer**:
```
Offer: 15% off for HDFC card users
Card type: Credit + Debit
Bank: HDFC Bank only
Network: All
Max usage per card: 1

Result: Only HDFC cardholders get 15% off, limited to one use
```

**Example - Premium Card Offer**:
```
Offer: ₹1,000 off for premium cards
IINs: 542657,521456,411234 (specific premium card series)
Max usage per card: 2

Result: Only holders of specified premium cards get discount
```

#### UPI Offers

**Customization Options**:
- 📱 All UPI apps supported
- Simpler configuration (no bank/network restrictions)

**Example - UPI-Only Offer**:
```
Offer: ₹200 cashback on UPI payments
Payment method: UPI only
Max usage: 500 customers

Result: First 500 UPI users get ₹200 cashback
```

### Other Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| **Offer Name** | Name shown on checkout | "Monsoon Offer" |
| **Display Text** | Description on checkout | "10% discount on all card payments" |
| **Terms** | Terms and conditions | "Valid for new users only" |
| **Starting On** | When offer becomes available | "Jan 1, 2025 00:00" |
| **Expires On** | When offer ends | "Jan 31, 2025 23:59" |
| **On Payment Failure** | What happens if validation fails | Allow payment / Block payment |
| **Max Usage** | Total times offer can be used | "First 100 customers" |

**On Payment Failure Options Explained**:

**Option 1: Allow Payment Without Offer** ✅
```
Scenario: User selects HDFC card offer but uses Axis card
Action: Allow payment to proceed at full price (no discount)
User Experience: Payment successful, but no discount applied
```

**Option 2: Block Payment** ❌
```
Scenario: User selects HDFC card offer but uses Axis card
Action: Reject payment transaction
User Experience: Error message "Offer not applicable for this card"
```

---

## Implementation Notes for ShopPulse

### Strategic Offer Ideas for Your Plans

**MINI Plan (₹999/month)**:
```
Offer 1: "New User Welcome"
- Type: Single use
- Discount: Flat ₹500 off
- Result: First month ₹499
- Use case: Attract new users to try platform

Offer 2: "UPI Special"
- Type: Forever
- Discount: 5% off
- Payment: UPI only
- Result: ₹949.05/month
- Use case: Encourage UPI adoption
```

**MIDI Plan (₹4,999/month)**:
```
Offer 1: "Upgrade Bonus"
- Type: Limited (3 cycles)
- Discount: 20% off
- Result: ₹3,999.20 for 3 months, then ₹4,999
- Use case: Incentivize upgrades from MINI

Offer 2: "Premium Card Exclusive"
- Type: Forever
- Discount: 10% off
- Payment: Credit card only, premium IINs
- Result: ₹4,499.10/month
- Use case: Partner with banks
```

**MAXI Plan (₹9,999/month)**:
```
Offer 1: "Annual Commitment"
- Type: Forever
- Discount: 15% off
- Result: ₹8,499.15/month
- Use case: Lock in annual customers

Offer 2: "First Quarter Deal"
- Type: Limited (3 cycles)
- Discount: Flat ₹3,000 off
- Result: ₹6,999 for 3 months
- Use case: Reduce barrier to entry for premium plan
```

### Technical Integration

```typescript
// In your subscription creation flow
interface OfferMetadata {
  offer_id: string;
  offer_type: 'single_use' | 'limited' | 'forever';
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  cycles_remaining?: number; // For limited offers
}

// Store in subscription metadata
const subscription = await prisma.subscription.create({
  data: {
    // ... other fields
    metadata: {
      offer: {
        offer_id: 'offer_xxx',
        offer_type: 'limited',
        discount_type: 'percentage',
        discount_value: 20,
        cycles_remaining: 3
      }
    }
  }
});
```

### Offer-Aware Upgrade Flow

**Challenge**: User has offer on current plan, wants to upgrade

**Solutions**:

**Option 1: Carry Forward Offer** (Complex)
```typescript
// Apply equivalent offer to new plan
if (currentSub.hasOffer && offerType === 'forever') {
  // Apply same offer to upgraded plan
  newSubOffer = currentSub.offer;
}
```

**Option 2: Forfeit Offer** (Simple)
```typescript
// Clear, simple policy
if (userUpgrades) {
  message = "Upgrading will remove your current offer. Proceed?";
  // New plan at full price
}
```

**Option 3: Prorate Offer Value** (Fair)
```typescript
// Calculate remaining offer value, apply as credit
const remainingOfferValue = calculateRemainingOfferValue(currentSub);
// Apply as negative addon in upgrade flow (from 1.2.7)
```

---

## Related Documentation

- Part 1: [Subscriptions Overview](./1_RAZORPAY_SUBSCRIPTIONS_OVERVIEW.md)
- Part 2: [Subscriptions Workflow](./2_RAZORPAY_SUBSCRIPTIONS_WORKFLOW.md)
- Part 3: [Subscriptions States](./3_RAZORPAY_SUBSCRIPTIONS_STATES.md)
- Part 11: [Create Subscription Offers](./11_RAZORPAY_OFFERS_CREATE.md) (Next)
- Part 12: [Link Offers to Subscriptions](./12_RAZORPAY_OFFERS_LINK.md)
