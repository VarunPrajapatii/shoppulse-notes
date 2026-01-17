# Part 24: Fetch Details of Pending Update API

## Overview

The **Fetch Pending Update Details API** retrieves information about scheduled subscription updates that haven't taken effect yet. This happens when a subscription is updated using the `schedule_change_at: "cycle_end"` parameter.

**Endpoint**: `GET /v1/subscriptions/:id/retrieve_scheduled_changes`

**Key Use Cases**:
- Check what changes are scheduled for a subscription
- Display upcoming plan/quantity changes to customers
- Verify scheduled updates before they go live
- Build "Scheduled Changes" UI sections

---

## Understanding Pending Updates

### What are Pending Updates?

When you update a subscription with `schedule_change_at: "cycle_end"`, the changes don't apply immediately. Instead, they're **scheduled** to take effect at the next billing cycle.

#### Example Timeline

```
January 1: Subscription charged (MINI plan - ₹299/month)
January 15: User upgrades to MAXI (schedule_change_at: "cycle_end")
January 16-31: Subscription still on MINI plan (pending update exists)
February 1: Update goes live → Charged ₹1,999 (MAXI plan)
```

During **January 16-31**, this API returns the **pending MAXI plan update**.

---

## API Details

### Endpoint
```
GET https://api.razorpay.com/v1/subscriptions/:id/retrieve_scheduled_changes
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
| `id` | string | ✅ Yes | **Official**: The unique identifier linked to a Subscription. For example, `sub_00000000000001`. |

---

## Response Structure

The response returns the **subscription object with the scheduled changes**:

```json
{
  "id": "sub_00000000000001",
  "entity": "subscription",
  "plan_id": "plan_00000000000003",
  "customer_id": "cust_00000000000001",
  "status": "active",
  "current_start": 1580284732,
  "current_end": 1580841000,
  "ended_at": null,
  "quantity": 25,
  "notes": {
    "notes_key_1": "Tea, Earl Grey, Hot",
    "notes_key_2": "Tea, Earl Grey… decaf."
  },
  "charge_at": 1580841000,
  "start_at": 1580284732,
  "end_at": 1611081000,
  "auth_attempts": 0,
  "total_count": 6,
  "paid_count": 1,
  "customer_notify": true,
  "created_at": 1580284702,
  "expire_by": 1580626111,
  "short_url": "https://rzp.io/i/fFWTkbf",
  "has_scheduled_changes": true,
  "change_scheduled_at": 1557253800,
  "source": "api",
  "offer_id": "offer_JHD834hjbxzhd38d",
  "remaining_count": 5
}
```

---

## Response Parameters

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

**Important**: When `has_scheduled_changes` is `true`, the response shows the **new values** that will take effect, not the current active values.

---

## Understanding the Response

### Scenario 1: Scheduled Plan Upgrade

```javascript
// Current subscription state
Current plan: plan_mini (₹299/month)
Status: active
Current cycle: Jan 1 - Jan 31
Update scheduled: Jan 15 (upgrade to MAXI)

// API Response on Jan 20
{
  "plan_id": "plan_00000000000003", // This is the NEW plan (MAXI)
  "status": "active", // Still active on old plan
  "current_end": 1580841000, // Jan 31 (cycle end)
  "has_scheduled_changes": true,
  "change_scheduled_at": 1580841000 // Feb 1 (update goes live)
}

// Interpretation:
Current plan: MINI (until Jan 31)
Scheduled plan: MAXI (from Feb 1)
Next charge: ₹1,999 on Feb 1
```

---

### Scenario 2: Scheduled Quantity Change

```javascript
// Current subscription state
Quantity: 5 users (₹1,999 × 5 = ₹9,995/month)
Update scheduled: Reduce to 3 users at cycle end

// API Response
{
  "quantity": 3, // NEW quantity (not current 5)
  "has_scheduled_changes": true,
  "change_scheduled_at": 1580841000
}

// Interpretation:
Current billing: 5 users (until cycle ends)
Scheduled billing: 3 users (from next cycle)
Next charge: ₹5,997 (3 × ₹1,999)
```

---

## Error Handling

### Error: Invalid API Key

**HTTP Status**: `4xx`

**Error Message**: The API key/secret provided is invalid.

**Official Description**: This error occurs due to a mismatch between the API credentials passed in the API call and those generated on the Dashboard.

```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "The api key provided is invalid",
    "source": "NA",
    "step": "NA",
    "reason": "NA",
    "metadata": {}
  }
}
```

**Cause**: API credentials mismatch or inactive keys.

**Solution**:
```javascript
// Verify API keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, // No whitespace
  key_secret: process.env.RAZORPAY_KEY_SECRET // Check active on Dashboard
});
```

---

## Code Examples

### Example 1: Check for Pending Updates (Node.js)

```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function checkPendingUpdates(subscriptionId) {
  try {
    const pendingUpdate = await razorpay.subscriptions.pendingUpdate(subscriptionId);

    if (pendingUpdate.has_scheduled_changes) {
      console.log('Scheduled changes found!');
      console.log('Update goes live on:', new Date(pendingUpdate.change_scheduled_at * 1000));
      console.log('New plan:', pendingUpdate.plan_id);
      console.log('New quantity:', pendingUpdate.quantity);
      console.log('New remaining count:', pendingUpdate.remaining_count);
    } else {
      console.log('No pending updates');
    }

    return pendingUpdate;
  } catch (error) {
    console.error('Error fetching pending update:', error);
    throw error;
  }
}

// Usage
checkPendingUpdates('sub_00000000000001');
```

---

### Example 2: ShopPulse API Route - Fetch Pending Updates

```typescript
// app/api/subscriptions/[subscriptionId]/pending-update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export async function GET(
  req: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId } = params;

    // Verify subscription ownership
    const dbSubscription = await prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: subscriptionId }
    });

    if (!dbSubscription || dbSubscription.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch pending update from Razorpay
    const pendingUpdate = await razorpay.subscriptions.pendingUpdate(subscriptionId);

    if (!pendingUpdate.has_scheduled_changes) {
      return NextResponse.json({
        hasScheduledChanges: false,
        message: 'No pending updates'
      });
    }

    // Fetch current subscription for comparison
    const currentSubscription = await razorpay.subscriptions.fetch(subscriptionId);

    // Fetch plan details for comparison
    const currentPlan = await razorpay.plans.fetch(currentSubscription.plan_id);
    const newPlan = await razorpay.plans.fetch(pendingUpdate.plan_id);

    // Determine what changed
    const changes = {
      planChange: currentSubscription.plan_id !== pendingUpdate.plan_id,
      quantityChange: currentSubscription.quantity !== pendingUpdate.quantity,
      remainingCountChange: currentSubscription.remaining_count !== pendingUpdate.remaining_count
    };

    return NextResponse.json({
      hasScheduledChanges: true,
      scheduledFor: new Date(pendingUpdate.change_scheduled_at * 1000),
      currentValues: {
        plan: {
          id: currentPlan.id,
          name: currentPlan.item.name,
          amount: currentPlan.item.amount / 100 // Convert paise to rupees
        },
        quantity: currentSubscription.quantity,
        remainingCount: currentSubscription.remaining_count
      },
      scheduledValues: {
        plan: {
          id: newPlan.id,
          name: newPlan.item.name,
          amount: newPlan.item.amount / 100
        },
        quantity: pendingUpdate.quantity,
        remainingCount: pendingUpdate.remaining_count
      },
      changes
    });

  } catch (error: any) {
    console.error('Fetch pending update error:', error);
    return NextResponse.json(
      { error: error.error?.description || 'Failed to fetch pending update' },
      { status: error.statusCode || 500 }
    );
  }
}
```

---

### Example 3: ShopPulse Frontend - Display Scheduled Changes

```typescript
// components/ScheduledChangesCard.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ScheduledChange {
  hasScheduledChanges: boolean;
  scheduledFor: string;
  currentValues: {
    plan: { name: string; amount: number };
    quantity: number;
  };
  scheduledValues: {
    plan: { name: string; amount: number };
    quantity: number;
  };
  changes: {
    planChange: boolean;
    quantityChange: boolean;
  };
}

interface ScheduledChangesCardProps {
  subscriptionId: string;
}

export function ScheduledChangesCard({ subscriptionId }: ScheduledChangesCardProps) {
  const [scheduledChange, setScheduledChange] = useState<ScheduledChange | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchScheduledChanges();
  }, [subscriptionId]);

  const fetchScheduledChanges = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/subscriptions/${subscriptionId}/pending-update`);
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      
      if (data.hasScheduledChanges) {
        setScheduledChange(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelUpdate = async () => {
    try {
      setIsCancelling(true);
      
      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel-update`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to cancel update');

      alert('Scheduled update cancelled successfully');
      setScheduledChange(null);
    } catch (error) {
      alert('Failed to cancel scheduled update');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (!scheduledChange || !scheduledChange.hasScheduledChanges) {
    return null; // No scheduled changes
  }

  const { currentValues, scheduledValues, changes, scheduledFor } = scheduledChange;
  const scheduledDate = new Date(scheduledFor);

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-orange-900">Scheduled Changes</CardTitle>
        </div>
        <CardDescription className="flex items-center gap-2 text-orange-700">
          <Calendar className="h-4 w-4" />
          Takes effect on {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {changes.planChange && (
          <div className="flex items-center justify-between p-4 bg-white rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{currentValues.plan.name}</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge>{scheduledValues.plan.name}</Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Price Change</p>
              <p className="font-medium">
                ₹{currentValues.plan.amount} → ₹{scheduledValues.plan.amount}
              </p>
            </div>
          </div>
        )}

        {changes.quantityChange && (
          <div className="flex items-center justify-between p-4 bg-white rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Quantity</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{currentValues.quantity} users</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge>{scheduledValues.quantity} users</Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {scheduledValues.quantity > currentValues.quantity ? 'Adding' : 'Removing'}
              </p>
              <p className="font-medium">
                {Math.abs(scheduledValues.quantity - currentValues.quantity)} users
              </p>
            </div>
          </div>
        )}

        <Alert>
          <AlertDescription>
            These changes will take effect at your next billing cycle. You can cancel them before{' '}
            {scheduledDate.toLocaleDateString()}.
          </AlertDescription>
        </Alert>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleCancelUpdate}
          disabled={isCancelling}
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Scheduled Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

### Example 4: Compare Current vs Scheduled Values

```typescript
// lib/subscription-helpers.ts
export async function compareScheduledChanges(subscriptionId: string) {
  // Fetch current subscription
  const currentSubscription = await razorpay.subscriptions.fetch(subscriptionId);

  // Check for pending updates
  const pendingUpdate = await razorpay.subscriptions.pendingUpdate(subscriptionId);

  if (!pendingUpdate.has_scheduled_changes) {
    return {
      hasChanges: false,
      message: 'No scheduled changes'
    };
  }

  // Fetch plan details
  const currentPlan = await razorpay.plans.fetch(currentSubscription.plan_id);
  const newPlan = await razorpay.plans.fetch(pendingUpdate.plan_id);

  // Calculate differences
  const planPriceDifference = newPlan.item.amount - currentPlan.item.amount;
  const quantityDifference = pendingUpdate.quantity - currentSubscription.quantity;

  // Calculate new monthly charge
  const currentMonthlyCharge = currentSubscription.quantity * currentPlan.item.amount;
  const newMonthlyCharge = pendingUpdate.quantity * newPlan.item.amount;
  const monthlyChargeDifference = newMonthlyCharge - currentMonthlyCharge;

  return {
    hasChanges: true,
    scheduledFor: new Date(pendingUpdate.change_scheduled_at * 1000),
    comparison: {
      plan: {
        current: { id: currentPlan.id, name: currentPlan.item.name },
        scheduled: { id: newPlan.id, name: newPlan.item.name },
        changed: currentPlan.id !== newPlan.id,
        priceDifference: planPriceDifference / 100 // Convert to rupees
      },
      quantity: {
        current: currentSubscription.quantity,
        scheduled: pendingUpdate.quantity,
        changed: currentSubscription.quantity !== pendingUpdate.quantity,
        difference: quantityDifference
      },
      monthlyCharge: {
        current: currentMonthlyCharge / 100,
        scheduled: newMonthlyCharge / 100,
        difference: monthlyChargeDifference / 100
      }
    }
  };
}

// Usage
const comparison = await compareScheduledChanges('sub_00000000000001');

if (comparison.hasChanges) {
  console.log('Current plan:', comparison.comparison.plan.current.name);
  console.log('Scheduled plan:', comparison.comparison.plan.scheduled.name);
  console.log('Monthly charge difference:', comparison.comparison.monthlyCharge.difference);
  console.log('Effective from:', comparison.scheduledFor);
}
```

---

## Implementation Best Practices

### 1. **Display Scheduled Changes Prominently**
```typescript
// Show alert banner when changes are scheduled
if (subscription.has_scheduled_changes) {
  return (
    <Alert variant="warning">
      <AlertCircle />
      <AlertTitle>Scheduled Changes</AlertTitle>
      <AlertDescription>
        Your subscription will be updated on {formatDate(subscription.change_scheduled_at)}
      </AlertDescription>
    </Alert>
  );
}
```

### 2. **Allow Customers to Cancel Scheduled Changes**
```typescript
// Provide cancel option before changes go live
<Button onClick={() => cancelScheduledUpdate(subscriptionId)}>
  Cancel Scheduled Changes
</Button>
```

### 3. **Send Reminders Before Changes Take Effect**
```typescript
// Cron job: 1 day before scheduled change
async function sendScheduledChangeReminder() {
  const tomorrow = Date.now() + (24 * 60 * 60 * 1000);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      hasScheduledChanges: true,
      scheduleChangeAt: {
        gte: new Date(tomorrow - 3600000), // 1 hour before
        lte: new Date(tomorrow + 3600000)  // 1 hour after
      }
    }
  });

  for (const subscription of subscriptions) {
    await sendEmail({
      to: subscription.customerEmail,
      subject: 'Your subscription will be updated tomorrow',
      template: 'scheduled-change-reminder'
    });
  }
}
```

### 4. **Track Scheduled Changes in Database**
```prisma
model Subscription {
  id                    String   @id @default(cuid())
  razorpaySubscriptionId String  @unique
  hasScheduledChanges   Boolean  @default(false)
  scheduleChangeAt      DateTime?
  scheduledPlanId       String?
  scheduledQuantity     Int?
  scheduledAt           DateTime? // When update was scheduled
}
```

---

## Common Use Cases

### Use Case 1: Admin Dashboard - View All Scheduled Changes

```typescript
// Fetch all subscriptions with pending updates
async function getAllScheduledChanges() {
  const subscriptions = await prisma.subscription.findMany({
    where: { hasScheduledChanges: true }
  });

  const scheduledChanges = [];

  for (const subscription of subscriptions) {
    const pendingUpdate = await razorpay.subscriptions.pendingUpdate(
      subscription.razorpaySubscriptionId
    );

    scheduledChanges.push({
      subscriptionId: subscription.id,
      customerEmail: subscription.customerEmail,
      scheduledFor: new Date(pendingUpdate.change_scheduled_at * 1000),
      changes: {
        planId: pendingUpdate.plan_id,
        quantity: pendingUpdate.quantity
      }
    });
  }

  return scheduledChanges;
}
```

### Use Case 2: Customer Portal - "What's Changing?" Section

```typescript
// Display clear before/after comparison
function ScheduledChangeSummary({ subscriptionId }: { subscriptionId: string }) {
  const { current, scheduled } = usePendingUpdate(subscriptionId);

  return (
    <div className="space-y-4">
      <h3>Scheduled Changes</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4>Current</h4>
          <p>Plan: {current.plan.name}</p>
          <p>Quantity: {current.quantity}</p>
          <p>Monthly: ₹{current.monthlyCharge}</p>
        </div>
        
        <div>
          <h4>After {formatDate(scheduled.effectiveDate)}</h4>
          <p>Plan: {scheduled.plan.name}</p>
          <p>Quantity: {scheduled.quantity}</p>
          <p>Monthly: ₹{scheduled.monthlyCharge}</p>
        </div>
      </div>
    </div>
  );
}
```

---

## Related Documentation

- **Part 23**: Update Subscription (how to schedule updates)
- **Part 25**: Cancel Scheduled Update (revert pending changes)
- **Part 22**: Cancel Subscription (alternative to scheduled updates)
- **Part 18**: Subscriptions Entity (understand `has_scheduled_changes` flag)

---

## Summary

The **Fetch Pending Update Details API** helps you:

1. **Check Scheduled Changes**: See what updates are queued for next cycle
2. **Display to Customers**: Show "Your plan will change on..." messages
3. **Comparison**: Compare current vs scheduled values (plan, quantity, price)
4. **Cancellation**: Allow customers to revert scheduled changes before they go live

**Key Points**:
- Only returns data if `has_scheduled_changes: true`
- Response shows **new values** (not current values)
- `change_scheduled_at` usually equals `current_end` (next cycle start)
- Use this to build "Scheduled Changes" UI sections

**Best Practice**: Always display scheduled changes prominently and allow customers to cancel them before the effective date!
