# Part 22: Cancel a Subscription API

## Overview

The **Cancel Subscription API** allows you to cancel an active subscription either **immediately** or at the **end of the current billing cycle**. Once cancelled, the subscription cannot be renewed or reactivated.

**Endpoint**: `POST /v1/subscriptions/:id/cancel`

**Key Points**:
- Once cancelled, the subscription status changes to `cancelled`
- You can choose immediate cancellation or end-of-cycle cancellation
- Cannot reactivate after cancellation (this is permanent)
- Must be in `active` or `authenticated` state to cancel

---

## API Details

### Endpoint
```
POST https://api.razorpay.com/v1/subscriptions/:id/cancel
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
| `id` | string | ✅ Yes | **Official**: The unique identifier linked to a Subscription<br>Example: `sub_00000000000001` |

---

## Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `cancel_at_cycle_end` | boolean | No | `false` | **Official**: Use this parameter to cancel a Subscription at the end of a billing cycle<br><br>**Possible values**:<br>• `true`: Cancel the subscription at the end of the current billing cycle<br>• `false` (default): Cancel the subscription immediately |

---

## Understanding `cancel_at_cycle_end`

### Scenario 1: Immediate Cancellation (`cancel_at_cycle_end: false`)

**Example**: Monthly subscription charged on 1st of every month

```javascript
// Subscription details
Current billing cycle: January 1 - January 31
Today's date: January 15
Next charge date: February 1

// Cancel immediately
cancel_at_cycle_end: false

// Result:
Status: cancelled (immediately on January 15)
Customer loses access: January 15
Refund: No refund for remaining days (January 16-31)
```

**Use Case**: Customer requests immediate cancellation, violates terms, or fraudulent activity detected.

---

### Scenario 2: End-of-Cycle Cancellation (`cancel_at_cycle_end: true`)

**Example**: Same monthly subscription

```javascript
// Subscription details
Current billing cycle: January 1 - January 31
Today's date: January 15
Next charge date: February 1

// Cancel at cycle end
cancel_at_cycle_end: true

// Result:
Status: active (remains active until January 31)
Customer loses access: February 1
Refund: Customer gets full value of current billing cycle
Next charge: Will not occur (no February 1 charge)
```

**Use Case**: Customer wants to finish the billing period they've already paid for (better customer experience).

---

## Response Structure

The API returns the full subscription object with updated status:

```json
{
  "id": "sub_00000000000001",
  "entity": "subscription",
  "plan_id": "plan_00000000000001",
  "customer_id": "cust_D00000000000001",
  "status": "cancelled",
  "current_start": 1580453311,
  "current_end": 1581013800,
  "ended_at": 1580288092,
  "quantity": 1,
  "notes": {
    "notes_key_1": "Tea, Earl Grey, Hot",
    "notes_key_2": "Tea, Earl Grey… decaf."
  },
  "charge_at": 1580453311,
  "start_at": 1577385991,
  "end_at": 1603737000,
  "auth_attempts": 0,
  "total_count": 6,
  "paid_count": 1,
  "customer_notify": true,
  "created_at": 1580283117,
  "expire_by": 1581013800,
  "short_url": "https://rzp.io/i/z3b1R61A9",
  "has_scheduled_changes": false,
  "change_scheduled_at": null,
  "source": "api",
  "offer_id": "offer_JHD834hjbxzhd38d",
  "remaining_count": 5
}
```

### Key Response Fields (All 24 Official Parameters)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | The unique identifier of the subscription created. Example: `sub_00000000000001` |
| `entity` | string | The entity being created. Here, it will be `subscription` |
| `plan_id` | string | The unique identifier for a plan that is linked to the created subscription. Example: `plan_00000000000001` |
| `customer_id` | string | The unique identifier of the customer linked to the subscription. This is populated automatically once the customer completes the authorization transaction. Example: `cust_00000000000001` |
| `status` | string | Status of the subscription. Changed to `cancelled`. Possible values: `created`, `authenticated`, `active`, `pending`, `halted`, `cancelled`, `completed`, `expired` |
| `current_start` | integer | Unix timestamp. The start time of the current billing cycle of the subscription. Example: `1581013800` |
| `current_end` | integer | Unix timestamp. The end time of the current billing cycle of the subscription. Example: `1581013800` |
| `ended_at` | integer | The timestamp, in Unix format, when the subscription was completed or was cancelled. Example: `1581013800` |
| `quantity` | integer | The number of times the plan should be linked to the subscription. For example, if the plan is ₹100.00/user/month and the customer has 5 users, you should pass 5 as the quantity to have the customer charged ₹500.00 (5 x ₹100.00) monthly. By default, this value is set to 1 |
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
| `has_scheduled_changes` | boolean | Indicates if the subscription has any scheduled changes. Possible values: `true`: Subscription has scheduled changes. `false`: Subscription does not have scheduled changes |
| `schedule_change_at` | string | Represents when the subscription should be updated. Possible values: `now` (default): Updates the subscription immediately. `cycle_end`: Updates the subscription at the end of the current billing cycle |
| `remaining_count` | integer | This indicates the number of billing cycles remaining on the subscription. Example: `2` |

---

## Error Handling

### Error 1: Subscription Not Cancellable in Expired Status

**HTTP Status**: `400 Bad Request`

**Error Message**: "Subscription is not cancellable in expired status."

```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "Subscription is not cancellable in expired status.",
    "field": "status"
  }
}
```

**Official Description**: This error occurs when you are trying to cancel a Subscription which is in the expired state.

**Cause**: Trying to cancel a subscription that has already expired.

**Solution**: 
- Check subscription status before attempting cancellation
- Only `active` or `authenticated` subscriptions can be cancelled
- Expired subscriptions are already ended (no need to cancel)

**Prevention**:
```javascript
// Check status before cancelling
const subscription = await razorpay.subscriptions.fetch(subscriptionId);

if (subscription.status === 'expired') {
  return { message: 'Subscription already expired' };
}

if (['active', 'authenticated'].includes(subscription.status)) {
  await razorpay.subscriptions.cancel(subscriptionId, options);
}
```

---

## Code Examples

### Example 1: Immediate Cancellation (Node.js)

```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function cancelSubscriptionImmediately(subscriptionId) {
  try {
    const cancelledSubscription = await razorpay.subscriptions.cancel(
      subscriptionId,
      {
        cancel_at_cycle_end: false // Immediate cancellation
      }
    );

    console.log('Subscription cancelled immediately:', cancelledSubscription.id);
    console.log('Status:', cancelledSubscription.status);
    console.log('Ended at:', new Date(cancelledSubscription.ended_at * 1000));

    return cancelledSubscription;
  } catch (error) {
    console.error('Cancellation failed:', error);
    throw error;
  }
}

// Usage
cancelSubscriptionImmediately('sub_00000000000001');
```

---

### Example 2: End-of-Cycle Cancellation (Better UX)

```javascript
async function cancelAtCycleEnd(subscriptionId) {
  try {
    const cancelledSubscription = await razorpay.subscriptions.cancel(
      subscriptionId,
      {
        cancel_at_cycle_end: true // Cancel at cycle end
      }
    );

    console.log('Subscription will cancel at cycle end');
    console.log('Current cycle ends:', new Date(cancelledSubscription.current_end * 1000));
    console.log('Customer can use until:', new Date(cancelledSubscription.current_end * 1000));

    return cancelledSubscription;
  } catch (error) {
    console.error('Cancellation failed:', error);
    throw error;
  }
}

// Usage
cancelAtCycleEnd('sub_00000000000001');
```

---

### Example 3: ShopPulse Cancel Subscription API Route

```typescript
// app/api/subscriptions/[subscriptionId]/cancel/route.ts
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

    const { cancel_at_cycle_end } = await req.json();
    const { subscriptionId } = params;

    // Fetch subscription from database
    const dbSubscription = await prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: subscriptionId }
    });

    if (!dbSubscription || dbSubscription.userId !== userId) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Check if already cancelled
    if (dbSubscription.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Subscription already cancelled' },
        { status: 400 }
      );
    }

    // Cancel on Razorpay
    const cancelledSubscription = await razorpay.subscriptions.cancel(
      subscriptionId,
      { cancel_at_cycle_end: cancel_at_cycle_end || false }
    );

    // Update database
    const updatedSubscription = await prisma.subscription.update({
      where: { razorpaySubscriptionId: subscriptionId },
      data: {
        status: 'cancelled',
        endedAt: new Date(cancelledSubscription.ended_at * 1000),
        cancelledAt: new Date(),
        cancelAtCycleEnd: cancel_at_cycle_end || false
      }
    });

    // Send cancellation email
    if (cancel_at_cycle_end) {
      await sendEmail({
        to: dbSubscription.customerEmail,
        subject: 'Subscription Cancellation Scheduled',
        body: `Your subscription will be cancelled on ${new Date(cancelledSubscription.current_end * 1000).toLocaleDateString()}`
      });
    } else {
      await sendEmail({
        to: dbSubscription.customerEmail,
        subject: 'Subscription Cancelled',
        body: 'Your subscription has been cancelled immediately.'
      });
    }

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      message: cancel_at_cycle_end
        ? 'Subscription will be cancelled at cycle end'
        : 'Subscription cancelled immediately'
    });

  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    
    if (error.statusCode === 400) {
      return NextResponse.json(
        { error: error.error.description },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
```

---

### Example 4: ShopPulse Frontend Cancel Flow

```typescript
// components/SubscriptionCancelModal.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface CancelModalProps {
  subscriptionId: string;
  currentEndDate: Date;
  onCancel: () => void;
  onSuccess: () => void;
}

export function SubscriptionCancelModal({
  subscriptionId,
  currentEndDate,
  onCancel,
  onSuccess
}: CancelModalProps) {
  const [cancelTiming, setCancelTiming] = useState<'immediate' | 'cycle-end'>('cycle-end');
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancel_at_cycle_end: cancelTiming === 'cycle-end'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      alert(data.message);
      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Failed to cancel subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription>
            Choose when you'd like to cancel your subscription
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={cancelTiming} onValueChange={(value: any) => setCancelTiming(value)}>
          <div className="flex items-start space-x-2 p-4 border rounded">
            <RadioGroupItem value="cycle-end" id="cycle-end" />
            <Label htmlFor="cycle-end" className="flex-1 cursor-pointer">
              <div className="font-medium">Cancel at End of Billing Cycle</div>
              <div className="text-sm text-muted-foreground mt-1">
                Continue using until {currentEndDate.toLocaleDateString()}
                <br />
                <span className="text-green-600">Recommended - Get full value</span>
              </div>
            </Label>
          </div>

          <div className="flex items-start space-x-2 p-4 border rounded">
            <RadioGroupItem value="immediate" id="immediate" />
            <Label htmlFor="immediate" className="flex-1 cursor-pointer">
              <div className="font-medium">Cancel Immediately</div>
              <div className="text-sm text-muted-foreground mt-1">
                Lose access right away (no refund)
              </div>
            </Label>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Keep Subscription
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={isLoading}>
            {isLoading ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Implementation Guide

### Step 1: Add Cancellation Tracking to Database

```prisma
// prisma/schema.prisma
model Subscription {
  id                    String   @id @default(cuid())
  razorpaySubscriptionId String  @unique
  userId                String
  status                String
  endedAt               DateTime?
  cancelledAt           DateTime?
  cancelAtCycleEnd      Boolean  @default(false)
  cancellationReason    String?
  // ... other fields
}
```

### Step 2: Create Cancellation Reasons Enum

```typescript
// lib/types/subscription.ts
export enum CancellationReason {
  TOO_EXPENSIVE = 'too_expensive',
  NOT_USING = 'not_using',
  MISSING_FEATURES = 'missing_features',
  SWITCHING_COMPETITOR = 'switching_competitor',
  OTHER = 'other'
}
```

### Step 3: Track Cancellation Analytics

```typescript
// lib/analytics/subscription-analytics.ts
export async function trackCancellation(data: {
  subscriptionId: string;
  userId: string;
  reason: string;
  cancelAtCycleEnd: boolean;
}) {
  await prisma.subscriptionEvent.create({
    data: {
      type: 'CANCELLATION',
      subscriptionId: data.subscriptionId,
      userId: data.userId,
      metadata: {
        reason: data.reason,
        timing: data.cancelAtCycleEnd ? 'cycle_end' : 'immediate',
        timestamp: new Date()
      }
    }
  });

  // Send to analytics platform
  analytics.track('Subscription Cancelled', {
    subscription_id: data.subscriptionId,
    reason: data.reason,
    cancel_timing: data.cancelAtCycleEnd ? 'cycle_end' : 'immediate'
  });
}
```

---

## Best Practices

### 1. **Always Offer End-of-Cycle Cancellation**
```javascript
// Default to cycle-end (better UX)
const defaultOptions = {
  cancel_at_cycle_end: true
};
```

### 2. **Collect Cancellation Feedback**
```typescript
// Before cancelling, ask why
interface CancellationFeedback {
  reason: CancellationReason;
  comments?: string;
  wouldConsiderReturning: boolean;
}
```

### 3. **Send Confirmation Emails**
```javascript
if (cancel_at_cycle_end) {
  await sendEmail({
    template: 'cancellation-scheduled',
    data: {
      endDate: new Date(subscription.current_end * 1000),
      remainingDays: Math.ceil((subscription.current_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
    }
  });
}
```

### 4. **Update User Access Immediately or at Cycle End**
```typescript
if (!cancel_at_cycle_end) {
  // Revoke access immediately
  await revokeUserAccess(userId);
} else {
  // Schedule access revocation
  await scheduleAccessRevocation(userId, subscription.current_end);
}
```

### 5. **Prevent Accidental Cancellations**
```typescript
// Require confirmation
const confirmed = await showConfirmationDialog({
  title: 'Are you sure?',
  description: 'This action cannot be undone',
  confirmText: 'Yes, cancel subscription'
});
```

---

## Common Scenarios

### Scenario 1: Cancellation with Refund Request
```javascript
// Customer wants refund for remaining days
// Note: Razorpay doesn't auto-refund, you must handle manually
async function cancelWithRefund(subscriptionId: string) {
  const subscription = await razorpay.subscriptions.fetch(subscriptionId);
  
  // Calculate pro-rated refund
  const daysRemaining = Math.ceil(
    (subscription.current_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const totalDays = Math.ceil(
    (subscription.current_end - subscription.current_start) / (60 * 60 * 24)
  );
  const refundAmount = (daysRemaining / totalDays) * subscription.plan.amount;

  // Cancel immediately
  await razorpay.subscriptions.cancel(subscriptionId, {
    cancel_at_cycle_end: false
  });

  // Issue refund manually
  // (Razorpay doesn't auto-refund subscriptions)
  console.log(`Issue refund of ₹${refundAmount} manually via Dashboard`);
}
```

### Scenario 2: Offer Downgrade Before Cancellation
```javascript
// Retention strategy: offer cheaper plan
async function offerDowngradeBeforeCancel(subscriptionId: string) {
  const subscription = await razorpay.subscriptions.fetch(subscriptionId);
  
  if (subscription.plan_id === 'plan_maxi') {
    // Offer MIDI plan instead of cancelling
    return {
      suggestion: 'downgrade',
      alternativePlans: ['plan_midi', 'plan_mini']
    };
  }
  
  // If already on cheapest plan, proceed with cancellation
  return { suggestion: 'cancel' };
}
```

---

## Related Documentation

- **Part 18**: Subscriptions Entity (understand subscription structure)
- **Part 21**: Fetch Subscriptions (check status before cancelling)
- **Part 23**: Update Subscription (consider updating instead of cancelling)
- **Part 14**: Payment Retries (understand halted vs cancelled)

---

## Summary

The **Cancel Subscription API** provides flexibility to cancel subscriptions immediately or at cycle end:

1. **Immediate Cancellation**: `cancel_at_cycle_end: false`
   - Status changes to `cancelled` immediately
   - Customer loses access right away
   - No refund for remaining days

2. **End-of-Cycle Cancellation**: `cancel_at_cycle_end: true`
   - Status remains `active` until cycle ends
   - Customer gets full value of current cycle
   - Better customer experience (recommended)

3. **Error Prevention**:
   - Check status before cancelling (only `active`/`authenticated`)
   - Cannot cancel `expired` subscriptions

4. **Best Practices**:
   - Default to cycle-end cancellation
   - Collect cancellation feedback
   - Send confirmation emails
   - Offer alternatives (downgrade, pause)
   - Track analytics for churn analysis

**Key Reminder**: Cancellation is **permanent** - you cannot reactivate. Consider offering pause or downgrade options first!
