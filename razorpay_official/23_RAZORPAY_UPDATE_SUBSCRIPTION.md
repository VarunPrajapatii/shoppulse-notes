# Part 23: Update a Subscription API

## Overview

The **Update Subscription API** allows you to modify an existing subscription's configuration, including changing the plan, quantity, offer, or billing cycles. Updates can be applied **immediately** or at the **end of the current billing cycle**.

**Endpoint**: `PATCH /v1/subscriptions/:id`

**Key Capabilities**:
- Change plan (upgrade/downgrade)
- Update quantity (add/remove users/licenses)
- Apply or change offers
- Modify remaining billing cycles
- Change start date
- Schedule updates for cycle end

---

## API Details

### Endpoint
```
PATCH https://api.razorpay.com/v1/subscriptions/:id
```

### Authentication
Basic Auth using your API Key ID and Secret:
```
Authorization: Basic <base64(key_id:key_secret)>
```

---

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✅ Yes | **Official**: The unique identifier linked to the Subscription<br>Example: `sub_00000000000001` |

---

## Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `plan_id` | string | No | - | **Official**: The unique identifier linked to the plan to which the customer is being subscribed. Example: `plan_00000000000001` |
| `offer_id` | string | No | - | **Official**: The unique identifier of the offer that should be linked to the subscription. Example: `offer_JHD834hjbxzhd38d` |
| `quantity` | integer | No | `1` | **Official**: The number of times the plan should be linked to the subscription. For example, if the plan is ₹100.00/user/month and the customer has 5 users, you should pass 5 as the quantity to have the customer charged ₹500.00 (5 x ₹100.00) monthly |
| `remaining_count` | integer | No | - | **Official**: This indicates the number of billing cycles remaining on the subscription. Example: `2` |
| `start_at` | integer | No | - | **Official**: The timestamp, in Unix format, when the subscription should start. If not passed, the subscription starts immediately after the authorization payment. Example: `1581013800` |
| `schedule_change_at` | string | No | `now` | **Official**: Represents when the subscription should be updated. Possible values:<br>• `now` (default): Updates the subscription immediately<br>• `cycle_end`: Updates the subscription at the end of the current billing cycle |
| `customer_notify` | boolean | No | `true` | **Official**: Indicates whether the communication to the customer would be handled by businesses or Razorpay.<br>• `true` (default): Communication handled by Razorpay<br>• `false`: Communication handled by businesses |
| `customer_notify` | boolean | No | Who sends notifications:<br>• `true` (default): Razorpay sends<br>• `false`: You send |

---

## Understanding Update Parameters

### 1. **plan_id** - Plan Change (Upgrade/Downgrade)

#### Scenario 1: Upgrade from MINI to MIDI

```javascript
// Current subscription
Plan: MINI (₹299/month)
Paid count: 2 months
Remaining: 10 months

// Update request
{
  plan_id: "plan_midi", // ₹599/month
  schedule_change_at: "now"
}

// Result:
New plan: MIDI (₹599/month)
Next charge: ₹599 (at next billing cycle)
Paid count: Resets to 0
Remaining count: 10 (preserved)
```

**ShopPulse Example**:
```typescript
// User upgrades from MINI to MAXI
await razorpay.subscriptions.update(subscriptionId, {
  plan_id: 'plan_maxi', // ₹1,999/month
  schedule_change_at: 'cycle_end', // Upgrade at next billing
  customer_notify: true
});
```

---

#### Scenario 2: Downgrade from MAXI to MIDI

```javascript
// Current subscription
Plan: MAXI (₹1,999/month)
Paid count: 3 months
Remaining: 9 months

// Update request
{
  plan_id: "plan_midi", // ₹599/month
  schedule_change_at: "cycle_end" // Don't downgrade immediately
}

// Result (scheduled):
Current plan: MAXI (until cycle ends)
Next plan: MIDI (from next cycle)
Status: has_scheduled_changes = true
Next charge: ₹599 (lower amount)
```

**Use Case**: Customer wants to downgrade but finish current paid cycle at higher tier.

---

### 2. **quantity** - License/Seat Management

#### Scenario 1: Add More Users

```javascript
// Current subscription
Plan: MAXI (₹1,999/user/month)
Quantity: 3 users
Monthly charge: 3 × ₹1,999 = ₹5,997

// Update request
{
  quantity: 5, // Add 2 more users
  schedule_change_at: "now"
}

// Result:
New quantity: 5 users
Next charge: 5 × ₹1,999 = ₹9,995
Pro-rated charge: (2 users × ₹1,999) × (days_remaining / 30)
```

**ShopPulse Example**:
```typescript
// Team grows from 3 to 5 members
await razorpay.subscriptions.update(subscriptionId, {
  quantity: 5,
  schedule_change_at: 'now', // Apply immediately
  customer_notify: true
});

// Pro-rated charge for 2 additional users for remaining days
```

---

#### Scenario 2: Remove Users (Downgrade Quantity)

```javascript
// Current subscription
Quantity: 5 users
Monthly charge: 5 × ₹1,999 = ₹9,995

// Update request
{
  quantity: 3, // Remove 2 users
  schedule_change_at: "cycle_end" // Don't charge less immediately
}

// Result (scheduled):
Current cycle: 5 users (₹9,995)
Next cycle: 3 users (₹5,997)
Savings: ₹3,998/month
```

**Use Case**: Team shrinks but wants to use all 5 licenses until cycle ends.

---

### 3. **remaining_count** - Extend/Shorten Subscription

#### Scenario 1: Extend Subscription Duration

```javascript
// Current subscription
Total count: 12 months
Paid count: 4 months
Remaining count: 8 months

// Update request
{
  remaining_count: 12 // Extend by 4 more months
}

// Result:
New total count: 16 months (4 paid + 12 remaining)
Extended until: 12 months from now
```

**Use Case**: Customer wants to extend subscription before it expires.

---

#### Scenario 2: Shorten Subscription

```javascript
// Current subscription
Remaining count: 8 months

// Update request
{
  remaining_count: 3 // Reduce to 3 months only
}

// Result:
New remaining: 3 months
Subscription will end sooner
```

**Use Case**: Customer wants to end subscription earlier (but not cancel immediately).

---

### 4. **schedule_change_at** - Update Timing

#### Option 1: `now` (Immediate Update)

```javascript
{
  plan_id: "plan_midi",
  schedule_change_at: "now"
}

// Result:
Update applies: Immediately
Status: Active with new plan
Next charge: New plan amount
has_scheduled_changes: false
```

**Use Case**: Urgent upgrade needed (more features required now).

---

#### Option 2: `cycle_end` (Scheduled Update)

```javascript
{
  plan_id: "plan_maxi",
  schedule_change_at: "cycle_end"
}

// Result:
Update applies: At next billing cycle
Current plan: Unchanged (until cycle ends)
has_scheduled_changes: true
change_scheduled_at: <timestamp of cycle end>
```

**Use Case**: Downgrade without losing current cycle's value.

**Checking Scheduled Updates**:
```javascript
// Fetch pending updates
const pendingUpdates = await razorpay.subscriptions.pendingUpdate(subscriptionId);

if (pendingUpdates.has_scheduled_changes) {
  console.log('Scheduled for:', new Date(pendingUpdates.change_scheduled_at * 1000));
}
```

---

## Response Structure

```json
{
  "id": "sub_00000000000002",
  "entity": "subscription",
  "plan_id": "plan_00000000000002",
  "customer_id": "cust_00000000000002",
  "status": "authenticated",
  "current_start": null,
  "current_end": null,
  "ended_at": null,
  "quantity": 3,
  "notes": {
    "notes_key_1": "Tea, Earl Grey, Hot",
    "notes_key_2": "Tea, Earl Grey… decaf."
  },
  "charge_at": 1580453311,
  "start_at": 1580453311,
  "end_at": 1606588200,
  "auth_attempts": 0,
  "total_count": 6,
  "paid_count": 0,
  "customer_notify": true,
  "created_at": 1580283807,
  "expire_by": 1580626111,
  "short_url": "https://rzp.io/i/yeDkUKy",
  "has_scheduled_changes": false,
  "change_scheduled_at": null,
  "source": "api",
  "offer_id": "offer_JHD834hjbxzhd38d",
  "remaining_count": 6
}
```

### Response Parameters (All 24 Official Fields)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | The unique identifier of the subscription created. Example: `sub_00000000000001` |
| `entity` | string | The entity being created. Here, it will be `subscription` |
| `plan_id` | string | The unique identifier for a plan that is linked to the created subscription. Updated to the new plan (if changed). Example: `plan_00000000000001` |
| `customer_id` | string | The unique identifier of the customer linked to the subscription. This is populated automatically once the customer completes the authorization transaction. Example: `cust_00000000000001` |
| `status` | string | Status of the subscription. Possible values: `created`, `authenticated`, `active`, `pending`, `halted`, `cancelled`, `completed`, `expired` |
| `current_start` | integer | Unix timestamp. The start time of the current billing cycle of the subscription. Example: `1581013800` |
| `current_end` | integer | Unix timestamp. The end time of the current billing cycle of the subscription. Example: `1581013800` |
| `ended_at` | integer | The timestamp, in Unix format, when the subscription was completed or was cancelled. Example: `1581013800` |
| `quantity` | integer | The number of times the plan should be linked to the subscription. Updated quantity value. By default, this value is set to 1 |
| `notes` | object | Notes you can enter for the contact for future reference. This is a key-value pair. You can enter a maximum of 15 key-value pairs. Example: `"note_key": "Beam me up Scotty"` |
| `charge_at` | integer | Unix timestamp. This indicates when the next charge on the subscription should be made. Example: `1581013800` |
| `offer_id` | string | The unique identifier of the offer that should be linked to the subscription. Example: `offer_JHD834hjbxzhd38d` |
| `start_at` | integer | The timestamp, in Unix format, when the subscription should start. If not passed, the subscription starts immediately after the authorization payment. Example: `1581013800` |
| `end_at` | integer | The timestamp, in Unix format, when the subscription should end. Example: `1581013800` |
| `auth_attempts` | integer | The number of times that the charge for the current billing cycle has been attempted on the card. Example: `2` |
| `total_count` | integer | The number of billing cycles for which the customer should be charged. Example: `2`. We support subscriptions for a maximum duration of 100 years. The number of billing cycles depends if the subscription is daily, weekly, monthly or yearly |
| `paid_count` | integer | This indicates the number of billing cycles for which the customer has already been charged. Example: `2` |
| `customer_notify` | boolean | Indicates whether the communication to the customer would be handled by businesses or Razorpay. `true`: Communication handled by Razorpay. Defaults to `true`. `false`: Communication handled by businesses |
| `created_at` | integer | The timestamp, in Unix format, when the subscription was created. Example: `1581013800` |
| `expire_by` | integer | The timestamp, in Unix format, till when the customer can make the authorization payment. For example, `1581013800`. By default, this is 30 years from creation |
| `short_url` | string | URL that can be used to make the authorization payment. Example: `https://rzp.io/i/PWtAiEo` |
| `has_scheduled_changes` | boolean | Indicates if the subscription has any scheduled changes. `true` if update is scheduled for `cycle_end`, `false` if applied immediately. Possible values: `true`: Subscription has scheduled changes. `false`: Subscription does not have scheduled changes |
| `change_scheduled_at` | string | Represents when the subscription should be updated. Timestamp when the scheduled change will take effect (if `schedule_change_at` = `cycle_end`). Possible values: `now` (default): Updates the subscription immediately. `cycle_end`: Updates the subscription at the end of the current billing cycle |
| `remaining_count` | integer | This indicates the number of billing cycles remaining on the subscription. Updated remaining billing cycles. Example: `2` |

---

## Error Handling

### Error 1: Cannot Update UPI Subscriptions

**HTTP Status**: `400 Bad Request`

**Error Message**: "subscriptions cannot be updated when payment mode is UPI"

```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "subscriptions cannot be updated when payment mode is UPI"
  }
}
```

**Official Description**: This error occurs when you are trying to update a UPI subscription.

**Cause**: Attempting to update a subscription authorized via UPI or Emandate.

**Solution**: 
- UPI/Emandate subscriptions **cannot be updated**
- Customer must cancel and create a new subscription
- Check payment method before allowing updates

**Prevention**:
```javascript
const subscription = await razorpay.subscriptions.fetch(subscriptionId);

if (subscription.payment_method === 'upi' || subscription.payment_method === 'emandate') {
  return { 
    error: 'Cannot update UPI/Emandate subscriptions',
    suggestion: 'Please cancel and create a new subscription'
  };
}
```

---

### Error 2: Subscription Not in Correct State

**HTTP Status**: `400 Bad Request`

**Error Message**: "Can't update Subscription when Subscription is not in Authenticated or Active state"

```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "Can't update Subscription when Subscription is not in Authenticated or Active state"
  }
}
```

**Official Description**: This error occurs when you are trying to update a Subscription which is not in the `authenticated` or `active` state.

**Cause**: Trying to update a subscription in `created` state (not authorized yet) or other non-updatable states.

**Solution**:
- Only `authenticated` or `active` subscriptions can be updated
- Wait for customer to complete authorization payment
- Check status before updating

**Prevention**:
```javascript
if (!['authenticated', 'active'].includes(subscription.status)) {
  throw new Error('Subscription must be authenticated or active to update');
}
```

---

## Code Examples

### Example 1: Upgrade Plan (ShopPulse MINI → MAXI)

```typescript
// app/api/subscriptions/[subscriptionId]/upgrade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export async function POST(
  req: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { new_plan_id, apply_immediately } = await req.json();
    const { subscriptionId } = params;

    // Verify subscription ownership
    const dbSubscription = await prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: subscriptionId }
    });

    if (!dbSubscription || dbSubscription.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch current subscription
    const currentSubscription = await razorpay.subscriptions.fetch(subscriptionId);

    // Check if updatable
    if (!['authenticated', 'active'].includes(currentSubscription.status)) {
      return NextResponse.json(
        { error: 'Subscription must be active to upgrade' },
        { status: 400 }
      );
    }

    // Update subscription
    const updatedSubscription = await razorpay.subscriptions.update(subscriptionId, {
      plan_id: new_plan_id,
      schedule_change_at: apply_immediately ? 'now' : 'cycle_end',
      customer_notify: true
    });

    // Update database
    await prisma.subscription.update({
      where: { razorpaySubscriptionId: subscriptionId },
      data: {
        planId: new_plan_id,
        hasScheduledChanges: updatedSubscription.has_scheduled_changes,
        scheduleChangeAt: updatedSubscription.change_scheduled_at
          ? new Date(updatedSubscription.change_scheduled_at * 1000)
          : null
      }
    });

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      message: apply_immediately
        ? 'Plan upgraded immediately'
        : 'Upgrade scheduled for next billing cycle'
    });

  } catch (error: any) {
    console.error('Upgrade error:', error);
    return NextResponse.json(
      { error: error.error?.description || 'Upgrade failed' },
      { status: error.statusCode || 500 }
    );
  }
}
```

---

### Example 2: Update Quantity (Add/Remove Users)

```typescript
// app/api/subscriptions/[subscriptionId]/quantity/route.ts
export async function PATCH(
  req: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const { userId } = auth();
    const { new_quantity } = await req.json();
    const { subscriptionId } = params;

    // Validation
    if (new_quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    // Fetch current subscription
    const currentSubscription = await razorpay.subscriptions.fetch(subscriptionId);
    const currentQuantity = currentSubscription.quantity;

    // Determine if adding or removing users
    const isAddingUsers = new_quantity > currentQuantity;
    const difference = Math.abs(new_quantity - currentQuantity);

    // Update quantity
    const updatedSubscription = await razorpay.subscriptions.update(subscriptionId, {
      quantity: new_quantity,
      schedule_change_at: isAddingUsers ? 'now' : 'cycle_end',
      customer_notify: true
    });

    // Calculate pro-rated charge (if adding users immediately)
    let proRatedCharge = 0;
    if (isAddingUsers) {
      const plan = await razorpay.plans.fetch(currentSubscription.plan_id);
      const daysRemaining = Math.ceil(
        (currentSubscription.current_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const daysInCycle = 30; // Assuming monthly
      proRatedCharge = (difference * plan.item.amount) * (daysRemaining / daysInCycle);
    }

    return NextResponse.json({
      success: true,
      message: isAddingUsers
        ? `Added ${difference} user(s) immediately`
        : `Removed ${difference} user(s) - effective next cycle`,
      proRatedCharge: Math.round(proRatedCharge / 100), // Convert paise to rupees
      newQuantity: new_quantity,
      effectiveFrom: isAddingUsers ? 'now' : new Date(currentSubscription.current_end * 1000)
    });

  } catch (error: any) {
    console.error('Quantity update error:', error);
    return NextResponse.json({ error: 'Failed to update quantity' }, { status: 500 });
  }
}
```

---

### Example 3: Extend Subscription Duration

```typescript
// app/api/subscriptions/[subscriptionId]/extend/route.ts
export async function POST(
  req: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const { additional_months } = await req.json();
    const { subscriptionId } = params;

    // Fetch current subscription
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    const currentRemaining = subscription.remaining_count;

    // Calculate new remaining count
    const newRemaining = currentRemaining + additional_months;

    // Update subscription
    const updatedSubscription = await razorpay.subscriptions.update(subscriptionId, {
      remaining_count: newRemaining,
      customer_notify: true
    });

    // Update database
    await prisma.subscription.update({
      where: { razorpaySubscriptionId: subscriptionId },
      data: {
        totalCount: updatedSubscription.total_count,
        remainingCount: newRemaining
      }
    });

    return NextResponse.json({
      success: true,
      message: `Extended subscription by ${additional_months} months`,
      previousRemaining: currentRemaining,
      newRemaining: newRemaining,
      newEndDate: new Date(updatedSubscription.end_at * 1000)
    });

  } catch (error) {
    console.error('Extend error:', error);
    return NextResponse.json({ error: 'Failed to extend subscription' }, { status: 500 });
  }
}
```

---

### Example 4: ShopPulse Frontend Upgrade UI

```typescript
// components/SubscriptionUpgradeCard.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'plan_mini',
    name: 'MINI',
    price: 299,
    features: ['1 Store', '100 Products', 'Basic Analytics']
  },
  {
    id: 'plan_midi',
    name: 'MIDI',
    price: 599,
    features: ['3 Stores', '500 Products', 'Advanced Analytics', 'Priority Support']
  },
  {
    id: 'plan_maxi',
    name: 'MAXI',
    price: 1999,
    features: ['Unlimited Stores', 'Unlimited Products', 'AI Features', '24/7 Support']
  }
];

interface UpgradeCardProps {
  currentPlanId: string;
  subscriptionId: string;
}

export function SubscriptionUpgradeCard({ currentPlanId, subscriptionId }: UpgradeCardProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [applyImmediately, setApplyImmediately] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!selectedPlan) return;

    try {
      setIsLoading(true);

      const response = await fetch(`/api/subscriptions/${subscriptionId}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_plan_id: selectedPlan,
          apply_immediately: applyImmediately
        })
      });

      if (!response.ok) throw new Error('Upgrade failed');

      const data = await response.json();
      alert(data.message);
      window.location.reload();
    } catch (error) {
      alert('Failed to upgrade subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {PLANS.map((plan) => {
        const isCurrent = plan.id === currentPlanId;
        const isSelected = selectedPlan === plan.id;

        return (
          <Card key={plan.id} className={isSelected ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{plan.name}</CardTitle>
                {isCurrent && <Badge>Current</Badge>}
              </div>
              <CardDescription>
                <span className="text-3xl font-bold">₹{plan.price}</span>/month
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              {!isCurrent && (
                <Button
                  className="w-full"
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {isSelected ? 'Selected' : 'Select Plan'}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}

      {selectedPlan && selectedPlan !== currentPlanId && (
        <div className="col-span-full">
          <Card>
            <CardHeader>
              <CardTitle>Confirm Upgrade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="apply-immediately"
                    checked={applyImmediately}
                    onChange={(e) => setApplyImmediately(e.target.checked)}
                  />
                  <label htmlFor="apply-immediately" className="text-sm">
                    Apply upgrade immediately (recommended for upgrades)
                  </label>
                </div>
                {!applyImmediately && (
                  <p className="text-sm text-muted-foreground">
                    Upgrade will take effect at the start of your next billing cycle
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleUpgrade} disabled={isLoading} className="w-full">
                {isLoading ? 'Processing...' : 'Confirm Upgrade'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
```

---

## Implementation Best Practices

### 1. **Validate Before Updating**
```typescript
async function validateUpdate(subscriptionId: string, updates: any) {
  const subscription = await razorpay.subscriptions.fetch(subscriptionId);

  // Check status
  if (!['authenticated', 'active'].includes(subscription.status)) {
    throw new Error('Subscription not updatable');
  }

  // Check payment method
  if (['upi', 'emandate'].includes(subscription.payment_method)) {
    throw new Error('Cannot update UPI/Emandate subscriptions');
  }

  // Validate plan exists
  if (updates.plan_id) {
    await razorpay.plans.fetch(updates.plan_id);
  }

  return true;
}
```

### 2. **Handle Pro-Rated Charges**
```typescript
function calculateProRatedCharge(
  plan: any,
  quantityDifference: number,
  daysRemaining: number,
  daysInCycle: number
) {
  return (quantityDifference * plan.item.amount) * (daysRemaining / daysInCycle);
}
```

### 3. **Track Update History**
```prisma
model SubscriptionUpdate {
  id              String   @id @default(cuid())
  subscriptionId  String
  updateType      String   // 'plan_change', 'quantity_change', 'extension'
  previousValue   Json
  newValue        Json
  appliedAt       DateTime?
  scheduledFor    DateTime?
  createdAt       DateTime @default(now())
}
```

### 4. **Send Update Notifications**
```typescript
async function notifySubscriptionUpdate(data: {
  email: string;
  updateType: string;
  previousValue: any;
  newValue: any;
  effectiveDate: Date;
}) {
  await sendEmail({
    to: data.email,
    subject: 'Subscription Updated',
    template: 'subscription-update',
    data
  });
}
```

---

## Common Update Scenarios

### Scenario 1: Mid-Cycle Upgrade
```javascript
// User upgrades from MINI to MAXI mid-cycle
await razorpay.subscriptions.update(subscriptionId, {
  plan_id: 'plan_maxi',
  schedule_change_at: 'now', // Apply immediately for upgrades
  customer_notify: true
});

// Next charge will be at MAXI price
```

### Scenario 2: Scheduled Downgrade
```javascript
// User downgrades from MAXI to MIDI
await razorpay.subscriptions.update(subscriptionId, {
  plan_id: 'plan_midi',
  schedule_change_at: 'cycle_end', // Preserve current cycle value
  customer_notify: true
});

// Check scheduled change
const pending = await razorpay.subscriptions.pendingUpdate(subscriptionId);
console.log('Downgrade scheduled for:', new Date(pending.change_scheduled_at * 1000));
```

### Scenario 3: Add Users + Extend Duration
```javascript
// Increase quantity and extend subscription
await razorpay.subscriptions.update(subscriptionId, {
  quantity: 10, // From 5 to 10 users
  remaining_count: 12, // Extend by 6 months (was 6, now 12)
  schedule_change_at: 'now'
});
```

---

## Related Documentation

- **Part 18**: Subscriptions Entity (understand all updatable fields)
- **Part 22**: Cancel Subscription (alternative to downgrading)
- **Part 24**: Fetch Pending Update Details (check scheduled changes)
- **Part 25**: Cancel Update (revert scheduled changes)

---

## Summary

The **Update Subscription API** provides powerful flexibility:

1. **Plan Changes**: Upgrade/downgrade with immediate or scheduled application
2. **Quantity Management**: Add/remove licenses with pro-rated charges
3. **Duration Control**: Extend or shorten subscription lifetime
4. **Scheduled Updates**: Apply changes at cycle end (better UX for downgrades)

**Key Restrictions**:
- Cannot update UPI/Emandate subscriptions
- Only `authenticated` or `active` subscriptions updatable
- Some changes may trigger pro-rated charges

**Best Practices**:
- Validate subscription state before updating
- Use `cycle_end` for downgrades (preserve customer value)
- Use `now` for upgrades (give features immediately)
- Calculate and display pro-rated charges
- Track update history for analytics
- Send clear notification emails

**Pro Tip**: Always offer cycle-end updates for downgrades to improve customer satisfaction and reduce churn!
