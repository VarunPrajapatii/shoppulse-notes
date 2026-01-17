# Razorpay Subscription Offers - Create and Manage

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 11 of Razorpay Official Documentation Series

---

## Table of Contents
1. [Overview](#overview)
2. [Create Offers](#create-offers)
3. [Step-by-Step Creation Guide](#step-by-step-creation-guide)
4. [Disable Offers](#disable-offers)
5. [Best Practices](#best-practices)

---

## Overview

You can create offers **only from the Dashboard**. You have full control over:
- 💰 Discounts you offer your customers
- 💳 Payment methods on which offers are applied
- ⏰ Usage limits and time periods

### Availability

Available in:
- 🇮🇳 **IN** - India only

### Important Notes

⚠️ **Key Points**:
- Offers can **only be created from Dashboard** (not via API)
- Once created, offers can be linked to subscriptions via Dashboard or API
- Disabled offers don't affect existing subscriptions using them

---

## Create Offers

### Video Reference

**Watch this video** to see how to create Subscription Offers from the Dashboard (mentioned in official docs).

### Access Path

```
Dashboard → Subscriptions (under PAYMENT PRODUCTS) → + Create New Offer → Offers on Subscriptions
```

---

## Step-by-Step Creation Guide

The offer creation process has **4 tabs** to complete:

### Tab 1: Description

**Fields**:

| Field | Description | Example | Required |
|-------|-------------|---------|----------|
| **Offer Name** | Name shown on checkout | "Monsoon Offer" | ✅ Yes |
| **Display Text** | Description shown on checkout | "10% discount on all card payments" | ✅ Yes |
| **Terms** | Terms and conditions | "Valid for new users only. One-time use." | ❌ Optional |

**Best Practices**:

```
✅ Good Offer Names:
- "New Year Sale"
- "Welcome Bonus"
- "Premium Member Exclusive"
- "HDFC Cardholder Special"

❌ Poor Offer Names:
- "Offer123"
- "Test"
- "Discount1"
```

```
✅ Good Display Text:
- "Get 25% off on your first 3 months"
- "Save ₹1,000 on annual subscription"
- "Flat ₹500 off for UPI payments"

❌ Poor Display Text:
- "Discount"
- "Offer available"
- "Special deal"
```

**Click Next** to proceed.

---

### Tab 2: Discount Type

**Fields**:

#### Redemption Type

Choose how many times the offer applies:

| Type | Description | Example Scenario |
|------|-------------|------------------|
| **Single Use** | One-time discount | "₹500 off first month" |
| **Limited Cycles** | Discount for X billing cycles | "50% off for 3 months" |
| **Forever** | Discount for entire subscription | "10% off forever" |

**Limited Cycles Configuration**:
```
If you select "Limited number of cycles", you'll need to enter:
Number of cycles: [3] (example)

Result: Offer applied to first 3 billing cycles, then full price
```

#### Discount Type

Choose the discount calculation method:

| Type | Configuration | Example |
|------|---------------|---------|
| **Flat** | Enter fixed amount | ₹500 |
| **Percentage** | Enter percentage + max cap | 10% up to ₹300 |

**Flat Discount Example**:
```
Input: ₹500
Effect: Customer pays ₹500 less, regardless of plan amount

MINI (₹999): ₹999 - ₹500 = ₹499
MIDI (₹4,999): ₹4,999 - ₹500 = ₹4,499
MAXI (₹9,999): ₹9,999 - ₹500 = ₹9,499
```

**Percentage Discount Example**:
```
Input: 10% with max ₹300 cap

MINI (₹999):
Calculated: ₹999 × 10% = ₹99.90
Max cap: ₹300
Final discount: ₹99.90 (< ₹300, so full discount applied)
Final price: ₹899.10

MIDI (₹4,999):
Calculated: ₹4,999 × 10% = ₹499.90
Max cap: ₹300
Final discount: ₹300 (capped at max)
Final price: ₹4,699

MAXI (₹9,999):
Calculated: ₹9,999 × 10% = ₹999.90
Max cap: ₹300
Final discount: ₹300 (capped at max)
Final price: ₹9,699
```

**Why Use Max Cap?**
- Prevents excessive discounts on high-value plans
- Controls your revenue loss
- Makes percentage offers affordable for your business

**Click Next** to proceed.

---

### Tab 3: Applicable On (Payment Methods)

Choose which payment methods can use this offer:

#### Option 1: UPI Payments

**Configuration**:
```
☑ UPI
  - Offers will only be applicable for UPI Payments
  - No additional configuration needed
```

**Use Case**:
- Encourage UPI adoption (lower transaction fees)
- Simple, no bank/network restrictions
- Popular among Indian customers

**Example**:
```
Offer: "UPI Monsoon Deal"
Payment: UPI only
Discount: Flat ₹200
Result: Anyone paying via UPI gets ₹200 off
```

#### Option 2: Card Payments

**Configuration Options**:

##### 1. Card Type
```
Choose one or both:
☐ Credit Card
☐ Debit Card
☑ Both
```

##### 2. Bank Selection
```
Options:
○ All Banks (recommended for maximum reach)
○ Specific Bank (partner deals)
```

**Specific Bank Example**:
```
Selected: HDFC Bank
Result: Only HDFC card users can avail offer
Use case: Bank partnership campaign
```

⚠️ **Limitation**: You can select **1 bank** or **all banks**. You **cannot select multiple banks**.

**Workaround for Multiple Banks**:
```
Want HDFC + Axis + ICICI offer?
Solution: Create 3 separate offers, one for each bank
- Offer 1: HDFC Bank only
- Offer 2: Axis Bank only
- Offer 3: ICICI Bank only
```

##### 3. Network Selection
```
Options:
○ All Networks
○ Specific Network (Visa, Mastercard, RuPay, etc.)
```

**Network Examples**:
```
Visa Only:
- Partner with Visa for promotional campaign
- "Visa Exclusive: 15% off"

RuPay Only:
- Promote domestic payment system
- "RuPay Special: ₹500 off"
```

⚠️ **Limitation**: You can select **1 network** or **all networks**. You **cannot select multiple networks**.

##### 4. Max Usage Per Card
```
Input: [2]
Result: Same card can avail offer maximum 2 times
Use case: Prevent abuse while allowing renewal
```

**Examples**:
```
Max usage = 1:
User creates subscription → Gets offer
User cancels and recreates → Cannot get offer again (same card)

Max usage = Unlimited:
User can create multiple subscriptions with same card, all get offer
Risk: Potential abuse
```

##### 5. IINs (Issuer Identification Numbers)
```
Input: 542657,521456,411234
Result: Only cards starting with these numbers get offer
Use case: Target premium cardholders
```

**What are IINs?**
- First 6 digits of card number
- Identifies card issuer and type
- Example: 542657 → Specific HDFC premium card series

**IIN Targeting Example**:
```
Scenario: Premium cardholder exclusive offer

Step 1: Get premium card IINs from bank partner
IINs: 542657, 521456, 411234

Step 2: Create offer with these IINs
Result: Only premium cardholders see and can use offer

Use case:
- High-value customer acquisition
- Bank partnership campaigns
- Exclusive deals for premium segment
```

**Combined Configuration Example**:
```
Offer: "HDFC Credit Card Exclusive"

Card Type: Credit Card only
Bank: HDFC Bank
Network: Visa
Max Usage Per Card: 1
IINs: 542657,521456 (HDFC premium Visa cards)

Result: 
- Only HDFC Visa credit cards with specified IINs
- One-time use per card
- Highly targeted, exclusive offer
```

**Click Next** to proceed.

---

### Tab 4: Offer Validity

**Fields**:

#### Starting On

Choose when the offer becomes available:

```
Option 1: ● Start Immediately
         Effect: Offer active as soon as you click "Create Offer"

Option 2: ○ Select a date and time
         Date picker: [Jan 1, 2025]
         Time picker: [00:00]
         Effect: Offer becomes active at specified date/time
```

**Examples**:
```
Immediate Start:
- You're launching a flash sale NOW
- No need to wait
- Customers can use offer right away

Scheduled Start:
- New Year sale starts Jan 1, 2025 at midnight
- Black Friday sale starts Nov 24, 2025 at 00:00
- Create offer in advance, auto-activates at scheduled time
```

#### Expires On

Choose when the offer ends:

```
Required: Yes (must select expiry date)
Date picker: [Jan 31, 2025]
Time picker: [23:59]
Effect: Offer no longer available after this date/time
```

**Best Practices**:
```
✅ Good Expiry Dates:
- End of month: Creates urgency
- Specific event: "Valid till Diwali"
- Limited time: "24-hour flash sale"

❌ Poor Expiry Dates:
- Too far in future (1 year+)
- No sense of urgency
- Overlaps with other offers (confusion)
```

**Time Period Examples**:
```
Flash Sale:
Starting: Nov 22, 2025 00:00
Expires: Nov 22, 2025 23:59
Duration: 24 hours

Weekend Special:
Starting: Nov 23, 2025 (Friday) 00:00
Expires: Nov 25, 2025 (Sunday) 23:59
Duration: 3 days

Monthly Offer:
Starting: Dec 1, 2025 00:00
Expires: Dec 31, 2025 23:59
Duration: 31 days
```

#### On Payment Failure

What happens when offer validation fails (e.g., wrong payment method)?

```
Option 1: ○ Allow the customer to complete the payment without the offer
         Effect: Payment succeeds, but no discount applied
         User Experience: Better (payment completes)

Option 2: ○ Do not allow the payment to go through
         Effect: Payment rejected with error
         User Experience: Frustrating but enforces offer rules
```

**When to Use Each**:

**Allow Payment Without Offer** ✅ (Recommended)
```
Scenario: User selects HDFC offer but has Axis card

What happens:
1. User clicks "Pay"
2. System detects: Not HDFC card
3. System shows: "Offer not applicable. Proceed with full payment?"
4. User confirms: Yes
5. Payment succeeds at full price

Pros:
- No lost sales
- Better user experience
- Customer still makes purchase

Cons:
- Offer targeting less strict
- Some revenue loss if user expects discount
```

**Block Payment** ❌ (Strict)
```
Scenario: User selects HDFC offer but has Axis card

What happens:
1. User clicks "Pay"
2. System detects: Not HDFC card
3. System shows: "This offer is only for HDFC cards. Please remove offer or use HDFC card."
4. Payment cannot proceed until offer removed or card changed

Pros:
- Strict offer enforcement
- Clear targeting (only eligible users get discount)
- Better for bank partnership deals

Cons:
- May lose sales
- Frustrating user experience
- Higher cart abandonment
```

**Recommendation**:
```
For ShopPulse: Use "Allow payment without offer"
Reason: 
- SaaS subscriptions have high value
- Don't want to lose paying customers
- Offer is incentive, not requirement
```

#### Max Usage

Limit the total number of times the offer can be used:

```
Input: [100]
Result: First 100 customers can avail the offer
After 100 uses: Offer still visible but shows "Offer limit reached"
```

**Examples**:
```
Limited Launch Offer:
Max Usage: 50
Marketing: "Limited to first 50 customers!"
Effect: Creates scarcity, drives urgency

Unlimited Offer:
Max Usage: [Leave empty or very high number]
Effect: All eligible customers can use

Budget-Constrained Offer:
Calculation:
- Discount per customer: ₹500
- Marketing budget: ₹50,000
- Max usage: ₹50,000 / ₹500 = 100 customers
```

**Click Next** to proceed.

---

### Tab 5: Review and Create

**Final Steps**:

1. **Review All Details**:
   - Description (Name, Display Text, Terms)
   - Discount Type (Redemption, Calculation)
   - Payment Methods (UPI/Card configuration)
   - Validity (Start, End, Failure handling, Max usage)

2. **Read Disclaimer**:
   - Understand offer terms
   - Confirm accuracy

3. **Check the Disclaimer Checkbox**: ☑

4. **Click "Create Offer"**: 

✅ **Success!** Your offer is now created and live (if set to start immediately).

---

## Disable Offers

### When to Disable

Scenarios where you might want to disable an offer:
- ✅ Offer period ended (manual early stop)
- ✅ Budget exhausted before max usage reached
- ✅ Promotional campaign cancelled
- ✅ Business decision (pricing strategy change)

### Important Notes

💡 **Handy Tip**: Disabling an offer **does not delete it** from subscriptions already using it. It only prevents **new** customers from applying the offer.

**Example**:
```
Situation:
- 50 customers have active subscriptions with "Welcome Offer"
- You disable "Welcome Offer" on Nov 22, 2025

Result:
- Existing 50 customers: Still get the discount ✅
- New customers: Cannot apply "Welcome Offer" ❌
- Offer no longer appears on checkout
```

### How to Disable

**Steps**:

1. Log in to the Dashboard
2. Click **Offers** under **PAYMENT PRODUCTS** in the left menu
3. Click the required **Offer Id**
4. In the right pane that appears, click **Disable**
5. Confirm the action

**Visual**: Disable offer (image available in official docs)

### Re-Enabling Offers

**Can you re-enable a disabled offer?**

Not directly. If you need the same offer again:
```
Option 1: Create a new offer with same configuration
- Duplicate all settings
- New offer ID generated
- Existing subscriptions still use old offer ID

Option 2: Never disable, use expiry dates
- Set specific expiry dates instead of manual disable
- Automatic activation/deactivation
- Better tracking and planning
```

---

## Best Practices

### Offer Naming Strategy

```
Format: [Event/Target] + [Benefit] + [Condition]

Examples:
✅ "New Year 2025 - 25% Off - First 3 Months"
✅ "HDFC Exclusive - ₹1000 Off - Annual Plan"
✅ "Weekend Flash Sale - 50% Off - Limited 100"
✅ "UPI Special - Flat ₹500 - New Users Only"

Benefits:
- Clear at a glance
- Easy to manage multiple offers
- Customers understand immediately
```

### Offer Timing

```
Launch Timing:
- Create offers 1-2 days before launch
- Test with dummy subscriptions
- Verify discount calculations
- Scheduled activation at launch time

Duration:
- Too short: Not enough time to spread word
- Too long: No urgency
- Sweet spot: 7-14 days for most campaigns
```

### Testing Checklist

Before going live with an offer:

- [ ] Create test subscription with offer
- [ ] Verify discount calculation is correct
- [ ] Test with eligible payment method (should work)
- [ ] Test with ineligible payment method (should handle per config)
- [ ] Check offer display text on checkout
- [ ] Verify terms are clear
- [ ] Test max usage limit (if applicable)
- [ ] Check webhook data includes offer information

### Multiple Offers Strategy

```
Scenario: Want to run multiple concurrent offers

Approach 1: Tiered Offers
- Offer A: "New User - ₹500 off" (Single use)
- Offer B: "Returning User - 10% off" (Forever)
- Offer C: "Premium Card - 15% off" (Limited 3 cycles)

Approach 2: Payment Method Offers
- Offer 1: "UPI Offer - ₹200 off" (UPI only)
- Offer 2: "HDFC Offer - 10% off" (HDFC cards only)
- Offer 3: "Visa Offer - ₹300 off" (Visa cards only)

Customer Experience:
- Sees all applicable offers on checkout
- Can select one offer (cannot stack)
- Choose the best offer for them
```

### Revenue Impact Analysis

Before creating an offer, calculate the impact:

```
Example: "50% off for 3 months" offer

Plan: MIDI (₹4,999/month)
Discount: 50% for 3 cycles
Target: 100 customers

Calculation:
Regular revenue (3 months): ₹4,999 × 3 × 100 = ₹14,99,700
With offer revenue: ₹2,499.50 × 3 × 100 = ₹7,49,850
Revenue loss: ₹7,49,850

But consider:
- Customer acquisition cost saved
- Lifetime value over 12 months
- Retention rate improvement
- Upsell potential

Long-term value (12 months):
Month 1-3: ₹2,499.50 × 3 = ₹7,498.50
Month 4-12: ₹4,999 × 9 = ₹44,991
Total per customer: ₹52,489.50
Total 100 customers: ₹52,48,950 (good ROI!)
```

---

## Implementation Notes for ShopPulse

### Offer Strategy Recommendation

**Phase 1: Launch Offers** (First 3 months)
```
Offer: "Early Adopter"
Type: Forever
Discount: 20% off
Target: First 200 customers
Goal: Build initial user base
```

**Phase 2: Growth Offers** (Month 4-12)
```
Offer: "Upgrade Bonus"
Type: Limited (3 cycles)
Discount: 25% off
Target: Users upgrading from lower tier
Goal: Increase ARPU
```

**Phase 3: Retention Offers** (Ongoing)
```
Offer: "Loyal Customer"
Type: Forever
Discount: 10% off
Target: Annual commitment
Goal: Reduce churn
```

### Dashboard Link for Offer Management

```typescript
// In your admin dashboard
// src/app/(dashboard)/admin/offers/page.tsx

export default function OffersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Offers</CardTitle>
        <CardDescription>
          Create and manage subscription offers from Razorpay Dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <a 
            href="https://dashboard.razorpay.com/app/subscriptions/offers"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Razorpay Dashboard
          </a>
        </Button>
        
        {/* Display active offers from your database */}
        <OffersTable offers={activeOffers} />
      </CardContent>
    </Card>
  );
}
```

---

## Related Documentation

- Part 10: [Offers Overview](./10_RAZORPAY_OFFERS_OVERVIEW.md)
- Part 12: [Link Offers to Subscriptions](./12_RAZORPAY_OFFERS_LINK.md) (Next)
- Part 13: [Update Offers](./13_RAZORPAY_OFFERS_UPDATE.md)
- Part 14: [Delete Offers](./14_RAZORPAY_OFFERS_DELETE.md)
