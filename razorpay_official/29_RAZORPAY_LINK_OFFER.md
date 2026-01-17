# Part 29: Link an Offer to a Subscription API

## Overview

The **Link Offer to Subscription API** allows you to apply discount offers when creating a new subscription. This is done by passing the `offer_id` parameter during subscription creation.

**Endpoint**: `POST /v1/subscriptions` (same as Create Subscription)

**Key Points**:
- Apply offers **during subscription creation only**
- Cannot link offer to existing subscriptions (use Update API instead)
- Offer must be active and applicable to the plan
- Discounts apply automatically to billing cycles
- This is the **same endpoint** as Part 19 (Create Subscription)

---

## Understanding Offer Linking

### When to Use This API

```javascript
// Scenario 1: NEW subscription with offer
POST /v1/subscriptions
{
  plan_id: "plan_midi",
  total_count: 12,
  offer_id: "offer_20OFF" // ✅ Link during creation
}

// Scenario 2: EXISTING subscription - use Update API instead
PATCH /v1/subscriptions/sub_123
{
  offer_id: "offer_30OFF" // ✅ Use Update API (Part 23)
}
```

**Key Point**: This API is for **new subscriptions only**. For existing subscriptions, use the Update Subscription API (Part 23).

---

## Offer Types Review

From Part 10 (Offer Entity), there are 2 offer types:

### Type 1: Percent Discount

```javascript
// 20% off for 3 months
{
  percent_off: 20,
  max_count: 3 // First 3 billing cycles
}

// Monthly plan: ₹1,999
Month 1: ₹1,599 (20% off)
Month 2: ₹1,599 (20% off)
Month 3: ₹1,599 (20% off)
Month 4: ₹1,999 (full price)
```

---

### Type 2: Flat Discount

```javascript
// ₹500 off for 2 months
{
  flat_off: 50000, // ₹500 in paise
  max_count: 2
}

// Monthly plan: ₹1,999
Month 1: ₹1,499 (₹500 off)
Month 2: ₹1,499 (₹500 off)
Month 3: ₹1,999 (full price)
```

---

## API Details

### Endpoint
```
POST https://api.razorpay.com/v1/subscriptions
```

### Authentication
Basic Auth using your API Key ID and Secret:
```
Authorization: Basic <base64(key_id:key_secret)>
```

---

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `plan_id` | string | ✅ Yes | The unique identifier of a plan that should be linked to the Subscription. For example, `plan_00000000000001`. |
| `total_count` | integer | ✅ Yes | The number of billing cycles for which the customer should be charged. For example, if a customer is buying a 1-year subscription billed on a bi-monthly basis, this value should be `6`. |
| `offer_id` | string | No | The unique identifier of the offer that is linked to the Subscription. You can obtain this from the Dashboard. For example, `offer_JHD834hjbxzhd38d`. |
| `quantity` | integer | No | The number of times the customer should be charged the plan amount per invoice. For example, a customer subscribes to use software. The charges are ₹100.00 /month/license. The customer wants 5 licenses. You should pass `5` as the quantity. The customer is charged ₹500.00 (5 x ₹100.00) monthly. By default, this value is set to `1`. |
| `start_at` | integer | No | Unix timestamp that indicates from when the Subscription should start. If not passed, the Subscription starts immediately after the authorisation payment. For example, `1581013800`. For Subscriptions with a future start_date, frequency is considered `as_presented`. |
| `expire_by` | integer | No | Unix timestamp that indicates till when the customer can make the authorisation payment. For example, `1581013800`. The default value is 30 years. Do not pass any value if you do not want to set an expiry date. |
| `customer_notify` | boolean | No | Indicates whether the communication to the customer would be handled by businesses or Razorpay. Possible values:<br>• `true` (default): Communication handled by Razorpay.<br>• `false`: Communication handled by businesses. |
| `addons` | array | No | Array that contains details of any upfront amount you want to collect as part of the authorisation transaction. |
| `notes` | object | No | Notes you can enter for the contact for future reference. This is a key-value pair. You can enter a maximum of 15 key-value pairs. For example, `"note_key": "Beam me up Scotty"`. |

**Note**: These are the same parameters as Create Subscription (Part 19), with `offer_id` added.

---

## Response Structure

```json
{
  "id": "sub_00000000000002",
  "entity": "subscription",
  "plan_id": "plan_00000000000001",
  "status": "created",
  "current_start": null,
  "current_end": null,
  "ended_at": null,
  "quantity": 1,
  "notes": {
    "notes_key_1": "Tea, Earl Grey, Hot",
    "notes_key_2": "Tea, Earl Grey… decaf."
  },
  "charge_at": 1580453311,
  "start_at": 1580453311,
  "end_at": 1587061800,
  "auth_attempts": 0,
  "total_count": 12,
  "paid_count": 0,
  "customer_notify": true,
  "created_at": 1580283117,
  "expire_by": 1581013800,
  "short_url": "https://rzp.io/i/m0y0f",
  "has_scheduled_changes": false,
  "change_scheduled_at": null,
  "source": "api",
  "offer_id": "offer_JHD834hjbxzhd38d",
  "remaining_count": 12
}
```

### Response Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The unique identifier of the subscription created. For example, `sub_00000000000001`. |
| `entity` | string | The entity being created. Here, it will be `subscription`. |
| `plan_id` | string | The unique identifier for a plan that is linked to the created subscription. For example, `plan_00000000000001`. |
| `customer_id` | string | The unique identifier of the customer linked to the subscription. This is populated automatically once the customer completes the authorization transaction. For example, `cust_00000000000001`. |
| `status` | string | Status of the subscription. Possible values: `created`, `authenticated`, `active`, `pending`, `halted`, `cancelled`, `completed`, `expired`. |
| `current_start` | integer | Unix timestamp. The start time of the current billing cycle of the subscription. For example, `1581013800`. |
| `current_end` | integer | Unix timestamp. The end time of the current billing cycle of the subscription. For example, `1581013800`. |
| `ended_at` | integer | The timestamp, in Unix format, when the subscription was completed or was cancelled. For example, `1581013800`. |
| `quantity` | integer | The number of times the plan should be linked to the subscription. For example, if the plan is ₹100.00/user/month and the customer has 5 users, you should pass 5 as the quantity to have the customer charged ₹500.00 (5 x ₹100.00) monthly. By default, this value is set to 1. |
| `notes` | object | Notes you can enter for the contact for future reference. This is a key-value pair. You can enter a maximum of 15 key-value pairs. For example, `"note_key": "Beam me up Scotty"`. |
| `charge_at` | integer | Unix timestamp. This indicates when the next charge on the subscription should be made. For example, `1581013800`. |
| `offer_id` | string | The unique identifier of the offer that should be linked to the subscription. For example, `offer_JHD834hjbxzhd38d`. |
| `start_at` | integer | The timestamp, in Unix format, when the subscription should start. If not passed, the subscription starts immediately after the authorization payment. For example, `1581013800`. |
| `end_at` | integer | The timestamp, in Unix format, when the subscription should end. For example, `1581013800`. |
| `auth_attempts` | integer | The number of times that the charge for the current billing cycle has been attempted on the card. For example, `2`. |
| `total_count` | integer | The number of billing cycles for which the customer should be charged. For example, `2`. We support subscriptions for a maximum duration of 100 years. The number of billing cycles depends if the subscription is daily, weekly, monthly or yearly. |
| `paid_count` | integer | This indicates the number of billing cycles for which the customer has already been charged. For example, `2`. |
| `customer_notify` | boolean | Indicates whether the communication to the customer would be handled by businesses or Razorpay.<br>• `true`: Communication handled by Razorpay. Defaults to `true`.<br>• `false`: Communication handled by businesses. |
| `created_at` | integer | The timestamp, in Unix format, when the subscription was created. For example, `1581013800`. |
| `expire_by` | integer | The timestamp, in Unix format, till when the customer can make the authorization payment. For example, `1581013800`. |
| `short_url` | string | URL that can be used to make the authorization payment. For example, `https://rzp.io/i/PWtAiEo`. |
| `has_scheduled_changes` | boolean | Indicates if the subscription has any scheduled changes. Possible values:<br>• `true`: Subscription has scheduled changes.<br>• `false`: Subscription does not have scheduled changes. |
| `schedule_change_at` | string | Represents when the subscription should be updated. Possible values:<br>• `now` (default): Updates the subscription immediately.<br>• `cycle_end`: Updates the subscription at the end of the current billing cycle. |
| `remaining_count` | integer | This indicates the number of billing cycles remaining on the subscription. For example, `2`. |

**Key Field**: `offer_id` is populated with the linked offer.

---

## Error Handling

### Error: Link Expire By Too Early

**Error Status**: `400`

**Error Message**: `Link expire by cannot be lesser than the current time.`

**Description**: The link expiry time is less than the current time.

```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "Link expire by cannot be lesser than the current time."
  }
}
```

**Cause**: `expire_by` timestamp is in the past or less than current time.

**Solution**:
```javascript
// Set expiry to 7 days from now
const expireBy = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);

await razorpay.subscriptions.create({
  plan_id: 'plan_midi',
  total_count: 12,
  offer_id: 'offer_20OFF',
  expire_by: expireBy // Must be future
});
```

---

## Code Examples

### Example 1: Create Subscription with Offer (Node.js)

```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function createSubscriptionWithOffer() {
  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: 'plan_HoYg68p5kmuvzD',
      total_count: 12,
      quantity: 1,
      offer_id: 'offer_JHD834hjbxzhd38d', // 20% off for 3 months
      customer_notify: true,
      expire_by: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      addons: [
        {
          item: {
            name: 'Setup Fee',
            amount: 100000, // ₹1,000
            currency: 'INR'
          }
        }
      ],
      notes: {
        campaign: 'BLACK_FRIDAY_2024',
        source: 'email_marketing'
      }
    });

    console.log('✅ Subscription created with offer');
    console.log('Subscription ID:', subscription.id);
    console.log('Offer ID:', subscription.offer_id);
    console.log('Short URL:', subscription.short_url);

    return subscription;
  } catch (error) {
    console.error('Failed to create subscription:', error);
    throw error;
  }
}

// Usage
createSubscriptionWithOffer();
```

---

### Example 2: ShopPulse API Route - Create with Offer

```typescript
// app/api/subscriptions/create-with-offer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan_id, offer_code } = await req.json();

    // Find offer by code
    const offer = await prisma.offer.findUnique({
      where: { code: offer_code }
    });

    if (!offer || !offer.active) {
      return NextResponse.json(
        { error: 'Invalid or inactive offer code' },
        { status: 400 }
      );
    }

    // Check if offer is applicable to plan
    if (offer.planIds && !offer.planIds.includes(plan_id)) {
      return NextResponse.json(
        { error: 'Offer not applicable to this plan' },
        { status: 400 }
      );
    }

    // Create subscription with offer
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan_id,
      total_count: 12, // 1 year
      quantity: 1,
      offer_id: offer.razorpayOfferId,
      customer_notify: true,
      expire_by: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      notes: {
        user_id: userId,
        offer_code: offer_code,
        created_via: 'web_app'
      }
    });

    // Save to database
    await prisma.subscription.create({
      data: {
        userId: userId,
        razorpaySubscriptionId: subscription.id,
        planId: plan_id,
        offerId: offer.id,
        status: 'created',
        totalCount: 12,
        remainingCount: 12,
        shortUrl: subscription.short_url
      }
    });

    // Track offer usage
    await prisma.offerUsage.create({
      data: {
        offerId: offer.id,
        userId: userId,
        subscriptionId: subscription.id
      }
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        shortUrl: subscription.short_url,
        offer: {
          code: offer_code,
          description: offer.description,
          discount: offer.percentOff ? `${offer.percentOff}%` : `₹${offer.flatOff / 100}`
        }
      }
    });

  } catch (error: any) {
    console.error('Create subscription with offer error:', error);
    return NextResponse.json(
      { error: error.error?.description || 'Failed to create subscription' },
      { status: error.statusCode || 500 }
    );
  }
}
```

---

### Example 3: ShopPulse Frontend - Apply Offer Code

```typescript
// components/OfferCodeInput.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Tag } from 'lucide-react';

interface OfferCodeInputProps {
  planId: string;
  planAmount: number;
  onOfferApplied: (offer: any) => void;
}

export function OfferCodeInput({ planId, planAmount, onOfferApplied }: OfferCodeInputProps) {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [offer, setOffer] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const validateOffer = async () => {
    if (!code.trim()) return;

    try {
      setIsValidating(true);
      setError(null);

      const response = await fetch('/api/offers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase(),
          plan_id: planId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      setOffer(data.offer);
      onOfferApplied(data.offer);
    } catch (error: any) {
      setError(error.message || 'Invalid offer code');
      setOffer(null);
    } finally {
      setIsValidating(false);
    }
  };

  const calculateDiscount = () => {
    if (!offer) return 0;
    
    if (offer.percentOff) {
      return (planAmount * offer.percentOff) / 100;
    } else if (offer.flatOff) {
      return offer.flatOff / 100; // Convert paise to rupees
    }
    return 0;
  };

  const discountAmount = calculateDiscount();
  const finalAmount = planAmount - discountAmount;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="offer-code">Offer Code (Optional)</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="offer-code"
            placeholder="Enter offer code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={isValidating || !!offer}
          />
          {!offer ? (
            <Button onClick={validateOffer} disabled={isValidating || !code.trim()}>
              {isValidating ? 'Validating...' : 'Apply'}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => {
              setOffer(null);
              setCode('');
              onOfferApplied(null);
            }}>
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Success State */}
      {offer && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="flex items-start justify-between">
              <div>
                <strong>Offer Applied: {code}</strong>
                <p className="text-sm mt-1">{offer.description}</p>
                <p className="text-sm mt-2">
                  {offer.percentOff && `${offer.percentOff}% off`}
                  {offer.flatOff && `₹${offer.flatOff / 100} off`}
                  {offer.maxCount && ` for ${offer.maxCount} months`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground line-through">₹{planAmount}</p>
                <p className="text-xl font-bold text-green-600">₹{finalAmount}</p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Savings Preview */}
      {offer && (
        <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-5 w-5 text-green-600" />
            <p className="font-semibold text-green-900">Your Savings</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Per Month</p>
              <p className="text-lg font-bold text-green-600">₹{discountAmount}</p>
            </div>
            {offer.maxCount && (
              <div>
                <p className="text-muted-foreground">Total ({offer.maxCount} months)</p>
                <p className="text-lg font-bold text-green-600">
                  ₹{discountAmount * offer.maxCount}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Example 4: Validate Offer Before Linking

```typescript
// app/api/offers/validate/route.ts
export async function POST(req: NextRequest) {
  try {
    const { code, plan_id } = await req.json();

    // Find offer
    const offer = await prisma.offer.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Validation checks
    const validations = [
      {
        check: offer.active,
        error: 'Offer is no longer active'
      },
      {
        check: !offer.validFrom || new Date(offer.validFrom) <= new Date(),
        error: 'Offer is not yet valid'
      },
      {
        check: !offer.validUntil || new Date(offer.validUntil) >= new Date(),
        error: 'Offer has expired'
      },
      {
        check: !offer.planIds || offer.planIds.length === 0 || offer.planIds.includes(plan_id),
        error: 'Offer not applicable to this plan'
      },
      {
        check: !offer.maxUses || offer.usageCount < offer.maxUses,
        error: 'Offer usage limit reached'
      }
    ];

    for (const validation of validations) {
      if (!validation.check) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    return NextResponse.json({
      valid: true,
      offer: {
        id: offer.id,
        code: offer.code,
        description: offer.description,
        percentOff: offer.percentOff,
        flatOff: offer.flatOff,
        maxCount: offer.maxCount,
        razorpayOfferId: offer.razorpayOfferId
      }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
```

---

## Implementation Best Practices

### 1. **Validate Offer Before Creating Subscription**

```typescript
async function createWithValidatedOffer(planId: string, offerCode: string) {
  // Step 1: Validate offer
  const offer = await validateOffer(offerCode, planId);
  
  if (!offer.valid) {
    throw new Error(offer.error);
  }

  // Step 2: Create subscription with offer
  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 12,
    offer_id: offer.razorpayOfferId,
    customer_notify: true
  });

  return subscription;
}
```

---

### 2. **Track Offer Usage**

```prisma
model OfferUsage {
  id              String   @id @default(cuid())
  offerId         String
  userId          String
  subscriptionId  String
  createdAt       DateTime @default(now())
  
  offer           Offer    @relation(fields: [offerId], references: [id])
}
```

```typescript
// After successful subscription creation
await prisma.offerUsage.create({
  data: {
    offerId: offer.id,
    userId: userId,
    subscriptionId: subscription.id
  }
});

// Increment usage count
await prisma.offer.update({
  where: { id: offer.id },
  data: { usageCount: { increment: 1 } }
});
```

---

### 3. **Display Discount Clearly**

```typescript
function SubscriptionPricing({ plan, offer }: any) {
  const discount = offer?.percentOff
    ? (plan.amount * offer.percentOff) / 100
    : offer?.flatOff / 100;

  const finalPrice = plan.amount - (discount || 0);

  return (
    <div>
      {offer && (
        <>
          <p className="line-through text-muted-foreground">₹{plan.amount}</p>
          <p className="text-2xl font-bold text-green-600">₹{finalPrice}</p>
          <Badge variant="success">Save ₹{discount}</Badge>
        </>
      )}
      {!offer && <p className="text-2xl font-bold">₹{plan.amount}</p>}
    </div>
  );
}
```

---

### 4. **Send Offer Confirmation Email**

```typescript
await sendEmail({
  to: user.email,
  subject: 'Subscription Created with Offer',
  template: 'subscription-with-offer',
  data: {
    userName: user.name,
    planName: plan.name,
    offerCode: offer.code,
    discount: offer.percentOff ? `${offer.percentOff}%` : `₹${offer.flatOff / 100}`,
    savings: calculateTotalSavings(offer, plan),
    subscriptionUrl: subscription.short_url
  }
});
```

---

## Common Scenarios

### Scenario 1: Black Friday Campaign

```typescript
// Create BLACKFRIDAY50 offer (50% off for 3 months)
const offer = await razorpay.offers.create({
  percent_off: 50,
  max_count: 3,
  applicable_on: { all: true }
});

// Link to new subscriptions
const subscription = await razorpay.subscriptions.create({
  plan_id: 'plan_maxi',
  total_count: 12,
  offer_id: offer.id,
  notes: { campaign: 'BLACK_FRIDAY_2024' }
});
```

---

### Scenario 2: Referral Program

```typescript
// Friend referred, get 30% off first month
async function createReferralSubscription(planId: string, referrerUserId: string) {
  const referralOffer = await prisma.offer.findUnique({
    where: { code: 'REFER30' }
  });

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 12,
    offer_id: referralOffer.razorpayOfferId,
    notes: {
      referrer_id: referrerUserId,
      referral_program: 'true'
    }
  });

  // Credit referrer
  await creditReferrer(referrerUserId, 500); // ₹500 credit

  return subscription;
}
```

---

## Related Documentation

- **Part 10**: Create Offer (how to create offers)
- **Part 11**: Create Offer Link (subscription links with offers)
- **Part 12**: Update/Delete Offers (manage offers)
- **Part 19**: Create Subscription (base subscription creation)
- **Part 30**: Delete Offer from Subscription (remove linked offers)

---

## Summary

The **Link Offer to Subscription API** applies discounts during subscription creation:

1. **Same Endpoint**: Uses Create Subscription endpoint with `offer_id`
2. **New Subscriptions Only**: For existing subscriptions, use Update API
3. **Automatic Discounts**: Applied to billing cycles based on offer configuration
4. **Validation Required**: Check offer validity, plan applicability, expiry

**Key Parameters**:
- `offer_id`: The offer to apply
- `plan_id`, `total_count`: Required for subscription
- `expire_by`: Authorization deadline (must be future)

**Best Practices**:
- Validate offer before creating subscription
- Track offer usage for analytics
- Display savings clearly to customers
- Send confirmation emails with discount details
- Set appropriate expiry dates

**Pro Tip**: Use offers strategically for campaigns, referrals, and customer acquisition to boost conversions!
