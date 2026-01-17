# Part 25: Cancel a Pending Update API

## Overview

The **Cancel Pending Update API** allows you to revert scheduled subscription changes before they take effect. This is useful when a subscription was updated with `schedule_change_at: "cycle_end"` and the customer changes their mind.

**Endpoint**: `POST /v1/subscriptions/:id/cancel_scheduled_changes`

**Key Points**:
- Only works for **pending updates** (not yet applied)
- Cannot cancel updates once they're live
- Reverts subscription to current state (no scheduled changes)
- Useful for customer retention (they decide to keep current plan)

---

## Understanding Cancel Pending Update

### Timeline Example

```
January 1: Subscription charged (MAXI plan - ₹1,999/month)
January 15: User downgrades to MIDI (schedule_change_at: "cycle_end")
             Status: has_scheduled_changes = true
             
January 16-31: Pending update exists (MAXI → MIDI at cycle end)
               ✅ Can cancel scheduled change during this period
               
January 25: User changes mind, wants to keep MAXI
            POST /cancel_scheduled_changes
            Status: has_scheduled_changes = false
            
February 1: No downgrade occurs, continues with MAXI (₹1,999)
```

**Key Insight**: You can only cancel **before** the scheduled date. Once February 1 arrives and the downgrade is applied, it's permanent.

---

## API Details

### Endpoint
```
POST https://api.razorpay.com/v1/subscriptions/:id/cancel_scheduled_changes
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

## Request

This endpoint **does not require a request body**. Simply call the endpoint with the subscription ID.

```javascript
// No body needed
POST /v1/subscriptions/sub_00000000000001/cancel_scheduled_changes
```

---

## Response Structure

Returns the subscription object with `has_scheduled_changes` set to `false`:

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
  "quantity": 1,
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
  "has_scheduled_changes": false,
  "change_scheduled_at": 1527858600,
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
| `has_scheduled_changes` | boolean | Indicates if the subscription has any scheduled changes. After cancellation, this will be `false`. Possible values:<br>• `true`: Subscription has scheduled changes.<br>• `false`: Subscription does not have scheduled changes. |
| `schedule_change_at` | string | Represents when the subscription should be updated. Possible values:<br>• `now` (default): Updates the subscription immediately.<br>• `cycle_end`: Updates the subscription at the end of the current billing cycle. |
| `remaining_count` | integer | This indicates the number of billing cycles remaining on the subscription. For example, `2`. |

**Key Changes After Cancellation**:
- `has_scheduled_changes` changes from `true` to `false`
- `plan_id` reverts to current plan (not scheduled plan)
- `quantity` reverts to current quantity (not scheduled quantity)
- `change_scheduled_at` remains as historical reference

**Note**: The subscription reverts to its **current state** with no future changes scheduled.

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

**Cause**: API credentials mismatch, inactive keys, or whitespace in keys.

**Solution**:
```javascript
// Verify credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID.trim(),
  key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
});

// Check keys are active on Dashboard
```

---

## Code Examples

### Example 1: Cancel Scheduled Changes (Node.js)

```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function cancelScheduledUpdate(subscriptionId) {
  try {
    // Check if scheduled changes exist
    const pendingUpdate = await razorpay.subscriptions.pendingUpdate(subscriptionId);

    if (!pendingUpdate.has_scheduled_changes) {
      console.log('No scheduled changes to cancel');
      return { message: 'No scheduled changes' };
    }

    console.log('Cancelling scheduled update...');
    console.log('Was scheduled for:', new Date(pendingUpdate.change_scheduled_at * 1000));

    // Cancel the scheduled changes
    const updatedSubscription = await razorpay.subscriptions.cancelScheduledChanges(subscriptionId);

    console.log('✅ Scheduled changes cancelled');
    console.log('has_scheduled_changes:', updatedSubscription.has_scheduled_changes);

    return updatedSubscription;
  } catch (error) {
    console.error('Error cancelling scheduled update:', error);
    throw error;
  }
}

// Usage
cancelScheduledUpdate('sub_00000000000001');
```

---

### Example 2: ShopPulse API Route - Cancel Scheduled Update

```typescript
// app/api/subscriptions/[subscriptionId]/cancel-update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

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

    const { subscriptionId } = params;

    // Verify subscription ownership
    const dbSubscription = await prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: subscriptionId },
      include: { user: true }
    });

    if (!dbSubscription || dbSubscription.userId !== userId) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Check if there are scheduled changes
    const pendingUpdate = await razorpay.subscriptions.pendingUpdate(subscriptionId);

    if (!pendingUpdate.has_scheduled_changes) {
      return NextResponse.json(
        { error: 'No scheduled changes to cancel' },
        { status: 400 }
      );
    }

    // Store what was scheduled (for logging)
    const scheduledPlan = pendingUpdate.plan_id;
    const scheduledQuantity = pendingUpdate.quantity;
    const scheduledFor = new Date(pendingUpdate.change_scheduled_at * 1000);

    // Cancel scheduled changes on Razorpay
    const updatedSubscription = await razorpay.subscriptions.cancelScheduledChanges(subscriptionId);

    // Update database
    await prisma.subscription.update({
      where: { razorpaySubscriptionId: subscriptionId },
      data: {
        hasScheduledChanges: false,
        scheduleChangeAt: null,
        scheduledPlanId: null,
        scheduledQuantity: null
      }
    });

    // Log cancellation event
    await prisma.subscriptionEvent.create({
      data: {
        type: 'SCHEDULED_CHANGE_CANCELLED',
        subscriptionId: dbSubscription.id,
        userId: userId,
        metadata: {
          scheduledPlan,
          scheduledQuantity,
          scheduledFor,
          cancelledAt: new Date()
        }
      }
    });

    // Send confirmation email
    await sendEmail({
      to: dbSubscription.user.email,
      subject: 'Scheduled Changes Cancelled',
      template: 'scheduled-change-cancelled',
      data: {
        userName: dbSubscription.user.name,
        currentPlan: updatedSubscription.plan_id,
        scheduledPlan,
        wasScheduledFor: scheduledFor
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled changes cancelled successfully',
      subscription: {
        id: updatedSubscription.id,
        planId: updatedSubscription.plan_id,
        quantity: updatedSubscription.quantity,
        hasScheduledChanges: updatedSubscription.has_scheduled_changes
      }
    });

  } catch (error: any) {
    console.error('Cancel scheduled update error:', error);

    if (error.statusCode === 400) {
      return NextResponse.json(
        { error: error.error.description },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel scheduled changes' },
      { status: 500 }
    );
  }
}
```

---

### Example 3: ShopPulse Frontend - Cancel Scheduled Changes UI

```typescript
// components/CancelScheduledUpdateButton.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { X } from 'lucide-react';

interface CancelScheduledUpdateButtonProps {
  subscriptionId: string;
  scheduledPlan: string;
  scheduledDate: Date;
  onSuccess: () => void;
}

export function CancelScheduledUpdateButton({
  subscriptionId,
  scheduledPlan,
  scheduledDate,
  onSuccess
}: CancelScheduledUpdateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel-update`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel');
      }

      const data = await response.json();
      alert(data.message);
      onSuccess(); // Refresh parent component
    } catch (error: any) {
      alert(error.message || 'Failed to cancel scheduled update');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          <X className="h-4 w-4 mr-2" />
          Cancel Scheduled Changes
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Scheduled Changes?</AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel the scheduled update to <strong>{scheduledPlan}</strong> plan
            on <strong>{scheduledDate.toLocaleDateString()}</strong>.
            <br /><br />
            Your subscription will continue with its current plan and settings.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Keep Scheduled Changes</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel} disabled={isLoading}>
            {isLoading ? 'Cancelling...' : 'Yes, Cancel Changes'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

### Example 4: Complete Scheduled Changes Management Component

```typescript
// components/ScheduledChangesManager.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowRight, Calendar } from 'lucide-react';
import { CancelScheduledUpdateButton } from './CancelScheduledUpdateButton';

interface ScheduledChange {
  hasScheduledChanges: boolean;
  scheduledFor: string;
  currentValues: {
    plan: { id: string; name: string; amount: number };
    quantity: number;
  };
  scheduledValues: {
    plan: { id: string; name: string; amount: number };
    quantity: number;
  };
  changes: {
    planChange: boolean;
    quantityChange: boolean;
  };
}

export function ScheduledChangesManager({ subscriptionId }: { subscriptionId: string }) {
  const [scheduledChange, setScheduledChange] = useState<ScheduledChange | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchScheduledChanges();
  }, [subscriptionId]);

  const fetchScheduledChanges = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/subscriptions/${subscriptionId}/pending-update`);
      const data = await response.json();

      if (data.hasScheduledChanges) {
        setScheduledChange(data);
      }
    } catch (error) {
      console.error('Error fetching scheduled changes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-200 rounded"></div>;
  }

  if (!scheduledChange?.hasScheduledChanges) {
    return null; // No scheduled changes
  }

  const { currentValues, scheduledValues, changes, scheduledFor } = scheduledChange;
  const scheduledDate = new Date(scheduledFor);
  const daysUntilChange = Math.ceil((scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900">Scheduled Changes</CardTitle>
          </div>
          <Badge variant="outline" className="text-orange-700">
            {daysUntilChange} days remaining
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2 text-orange-700">
          <Calendar className="h-4 w-4" />
          Takes effect on {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Plan Change */}
        {changes.planChange && (
          <div className="p-4 bg-white rounded-lg">
            <p className="text-sm font-medium mb-2">Plan Change</p>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <Badge variant="outline" className="mb-1">
                  {currentValues.plan.name}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  ₹{currentValues.plan.amount}/month
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <Badge className="mb-1">{scheduledValues.plan.name}</Badge>
                <p className="text-sm font-medium">
                  ₹{scheduledValues.plan.amount}/month
                </p>
              </div>
            </div>
            {scheduledValues.plan.amount < currentValues.plan.amount && (
              <p className="text-sm text-green-600 mt-2">
                💰 Save ₹{currentValues.plan.amount - scheduledValues.plan.amount}/month
              </p>
            )}
          </div>
        )}

        {/* Quantity Change */}
        {changes.quantityChange && (
          <div className="p-4 bg-white rounded-lg">
            <p className="text-sm font-medium mb-2">Quantity Change</p>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <Badge variant="outline" className="mb-1">
                  {currentValues.quantity} users
                </Badge>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <Badge className="mb-1">{scheduledValues.quantity} users</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Alert */}
        <Alert>
          <AlertDescription>
            These changes will automatically take effect on {scheduledDate.toLocaleDateString()}.
            You can cancel them anytime before this date.
          </AlertDescription>
        </Alert>

        {/* Cancel Button */}
        <CancelScheduledUpdateButton
          subscriptionId={subscriptionId}
          scheduledPlan={scheduledValues.plan.name}
          scheduledDate={scheduledDate}
          onSuccess={() => {
            setScheduledChange(null);
            fetchScheduledChanges();
          }}
        />
      </CardContent>
    </Card>
  );
}
```

---

## Implementation Best Practices

### 1. **Check Before Cancelling**
```typescript
async function safelyCancelScheduledUpdate(subscriptionId: string) {
  // First, check if scheduled changes exist
  const pendingUpdate = await razorpay.subscriptions.pendingUpdate(subscriptionId);

  if (!pendingUpdate.has_scheduled_changes) {
    throw new Error('No scheduled changes to cancel');
  }

  // Proceed with cancellation
  return await razorpay.subscriptions.cancelScheduledChanges(subscriptionId);
}
```

### 2. **Log Cancellation Events**
```prisma
model SubscriptionEvent {
  id             String   @id @default(cuid())
  type           String   // 'SCHEDULED_CHANGE_CANCELLED'
  subscriptionId String
  userId         String
  metadata       Json     // Store what was cancelled
  createdAt      DateTime @default(now())
}
```

### 3. **Send Confirmation Emails**
```typescript
// After cancelling scheduled changes
await sendEmail({
  to: user.email,
  subject: 'Scheduled Changes Cancelled',
  body: `
    Your scheduled subscription changes have been cancelled.
    
    Current plan: ${currentPlan.name}
    Previous scheduled plan: ${scheduledPlan.name}
    Was scheduled for: ${scheduledDate}
    
    You will continue with your current plan.
  `
});
```

### 4. **Update UI Immediately**
```typescript
// After successful cancellation
setScheduledChange(null); // Remove scheduled changes UI
fetchCurrentSubscription(); // Refresh subscription data
showSuccessMessage('Scheduled changes cancelled successfully');
```

---

## Common Scenarios

### Scenario 1: Customer Retention - Cancel Downgrade

```typescript
// User scheduled downgrade from MAXI to MINI
// Retention team offers discount to keep MAXI

async function retainCustomerOnCurrentPlan(subscriptionId: string, offerId: string) {
  // Cancel scheduled downgrade
  await razorpay.subscriptions.cancelScheduledChanges(subscriptionId);

  // Apply retention offer to current plan
  await razorpay.subscriptions.update(subscriptionId, {
    offer_id: offerId, // 20% discount offer
    schedule_change_at: 'now'
  });

  return {
    message: 'Downgrade cancelled and retention offer applied',
    discount: '20%'
  };
}
```

---

### Scenario 2: Accidental Scheduled Change

```typescript
// User accidentally scheduled upgrade, wants to revert
async function revertAccidentalUpdate(subscriptionId: string) {
  const pendingUpdate = await razorpay.subscriptions.pendingUpdate(subscriptionId);

  if (!pendingUpdate.has_scheduled_changes) {
    return { message: 'No changes to revert' };
  }

  // Cancel the accidental update
  await razorpay.subscriptions.cancelScheduledChanges(subscriptionId);

  // Notify user
  await sendEmail({
    subject: 'Scheduled changes cancelled',
    body: 'Your subscription will continue with the current plan.'
  });

  return { success: true };
}
```

---

### Scenario 3: Business Decision - Extend Current Plan

```typescript
// Company decides to keep current plan for one more quarter
async function extendCurrentPlan(subscriptionId: string, additionalMonths: number) {
  // Cancel any scheduled changes (like downgrades)
  await razorpay.subscriptions.cancelScheduledChanges(subscriptionId);

  // Extend duration
  const subscription = await razorpay.subscriptions.fetch(subscriptionId);
  await razorpay.subscriptions.update(subscriptionId, {
    remaining_count: subscription.remaining_count + additionalMonths
  });

  return {
    message: `Extended current plan by ${additionalMonths} months`,
    newEndDate: new Date(subscription.end_at * 1000)
  };
}
```

---

## Monitoring and Analytics

### Track Cancellation Reasons

```typescript
// Log why scheduled changes were cancelled
await prisma.subscriptionEvent.create({
  data: {
    type: 'SCHEDULED_CHANGE_CANCELLED',
    subscriptionId,
    metadata: {
      reason: 'customer_retention', // or 'accidental', 'business_decision'
      scheduledPlan: pendingUpdate.plan_id,
      currentPlan: currentSubscription.plan_id,
      cancelledAt: new Date()
    }
  }
});

// Analytics
analytics.track('Scheduled Change Cancelled', {
  subscription_id: subscriptionId,
  reason: 'customer_retention',
  was_downgrade: pendingUpdate.plan_id < currentSubscription.plan_id
});
```

---

## Related Documentation

- **Part 23**: Update Subscription (how to create scheduled changes)
- **Part 24**: Fetch Pending Update Details (check what's scheduled)
- **Part 22**: Cancel Subscription (complete cancellation vs reverting changes)
- **Part 18**: Subscriptions Entity (understand `has_scheduled_changes` field)

---

## Summary

The **Cancel Pending Update API** allows you to:

1. **Revert Scheduled Changes**: Cancel updates before they take effect
2. **Customer Retention**: Keep customers on current plan instead of downgrading
3. **Fix Mistakes**: Undo accidental scheduled changes
4. **Flexibility**: Change your mind before cycle end

**Key Points**:
- Only works for **pending updates** (not yet applied)
- Cannot revert updates once they're live
- Sets `has_scheduled_changes` to `false`
- No request body needed (just subscription ID)

**Common Use Cases**:
- Customer retention (cancel scheduled downgrade)
- Accidental update correction
- Business decision to extend current plan
- Testing scheduled changes

**Best Practice**: Always provide a clear "Cancel Scheduled Changes" button in your customer portal alongside the scheduled changes display. This gives customers control and improves satisfaction!
