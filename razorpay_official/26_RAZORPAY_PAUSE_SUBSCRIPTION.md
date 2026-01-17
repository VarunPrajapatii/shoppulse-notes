# Part 26: Pause a Subscription API

## Overview

The **Pause Subscription API** allows you to temporarily halt billing on an active subscription without cancelling it. This is useful for customers who want to take a break but plan to resume later.

**Endpoint**: `POST /v1/subscriptions/:id/pause`

**Key Points**:
- Only `active` subscriptions can be paused
- Pausing an `authenticated` subscription will cancel it (❗ Watch out!)
- Paused subscriptions can be resumed later
- No charges occur during pause period
- Useful for seasonal businesses or temporary breaks

---

## Understanding Pause vs Cancel

### Pause Subscription
```javascript
Status: active → paused
Billing: Stopped temporarily
Can Resume: ✅ Yes
Use Case: Customer wants a break but will return
```

### Cancel Subscription
```javascript
Status: active → cancelled
Billing: Stopped permanently
Can Resume: ❌ No (must create new subscription)
Use Case: Customer permanently leaving
```

**Key Difference**: Pause is **temporary** and **reversible**, Cancel is **permanent**.

---

## Critical Warning ⚠️

**You can only pause subscriptions in the `active` state.**

```javascript
// Correct: Pausing active subscription
Subscription status: active
POST /pause
Result: status → paused ✅

// Wrong: Pausing authenticated subscription
Subscription status: authenticated
POST /pause
Result: status → cancelled ❌ (PERMANENT!)
```

**Why this matters**: If you pause a subscription in `authenticated` state (customer hasn't been charged yet), Razorpay treats it as a cancellation, **not a pause**. You cannot resume it!

---

## API Details

### Endpoint
```
POST https://api.razorpay.com/v1/subscriptions/:id/pause
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
| `id` | string | ✅ Yes | The unique identifier linked to a Subscription. For example, `sub_00000000000001`. |

---

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pause_at` | string | ⚠️ Conditional | The value should be `now` to pause a Subscription immediately. |

**Note**: Unlike cancel/update APIs, pause **only supports immediate action**. You cannot schedule a pause for the future.

---

## Response Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The unique identifier of the subscription created. For example, `sub_00000000000001`. |
| `entity` | string | The entity being created. Here, it will be `subscription`. |
| `plan_id` | string | The unique identifier for a plan that is linked to the created subscription. For example, `plan_00000000000001`. |
| `customer_id` | string | The unique identifier of the customer linked to the subscription. This is populated automatically once the customer completes the authorization transaction. For example, `cust_00000000000001`. |
| `status` | string | Status of the subscription. Refer to the [life cycle section](https://razorpay.com/docs/payments/subscriptions/states/) for more details. Possible values:<br>• `created`<br>• `authenticated`<br>• `active`<br>• `pending`<br>• `halted`<br>• `cancelled`<br>• `completed`<br>• `expired` |
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
| `paused_at` | integer | The timestamp, in Unix format, when the subscription was paused. For example, `1590280581`. |
| `expire_by` | integer | The timestamp, in Unix format, till when the customer can make the authorization payment. For example, `1581013800`. |
| `pause_initiated_by` | string | Who paused the subscription: `"self"` (customer) or `"merchant"` (you). |
| `short_url` | string | URL that can be used to make the authorization payment. For example, `https://rzp.io/i/PWtAiEo`. |
| `has_scheduled_changes` | boolean | Indicates if the subscription has any scheduled changes. Possible values:<br>• `true`: Subscription has scheduled changes.<br>• `false`: Subscription does not have scheduled changes. |
| `schedule_change_at` | string | Represents when the subscription should be updated. Possible values:<br>• `now` (default): Updates the subscription immediately.<br>• `cycle_end`: Updates the subscription at the end of the current billing cycle. |
| `remaining_count` | integer | This indicates the number of billing cycles remaining on the subscription. For example, `2`. |

---

## Response Structure

```json
{
  "id": "sub_00000000000001",
  "entity": "subscription",
  "plan_id": "plan_00000000000001",
  "status": "paused",
  "current_start": null,
  "current_end": null,
  "ended_at": null,
  "quantity": 1,
  "notes": {
    "notes_key_1": "Tea, Earl Grey, Hot",
    "notes_key_2": "Tea, Earl Grey… decaf."
  },
  "charge_at": null,
  "start_at": 1580626111,
  "end_at": 1583433000,
  "auth_attempts": 0,
  "total_count": 6,
  "paid_count": 0,
  "customer_notify": true,
  "created_at": 1580280581,
  "paused_at": 1590280581,
  "expire_by": 1580626111,
  "pause_initiated_by": "self",
  "short_url": "https://rzp.io/i/z3b1R61A9",
  "has_scheduled_changes": false,
  "change_scheduled_at": null,
  "source": "api",
  "offer_id": "offer_JHD834hjbxzhd38d",
  "remaining_count": 6
}
```

---

## Key Response Fields

| Field | Description |
|-------|-------------|
| `status` | Changed from `active` to `paused` |
| `paused_at` | Unix timestamp when subscription was paused |
| `pause_initiated_by` | Who paused it: `"self"` (customer) or `"merchant"` (you) |
| `charge_at` | Set to `null` (no upcoming charge) |
| `current_start` | Set to `null` (no active billing cycle) |
| `current_end` | Set to `null` (no active billing cycle) |
| `remaining_count` | **Preserved** (6 cycles still remaining after resume) |

**Important**: `remaining_count` stays the same. When resumed, customer still has all remaining billing cycles.

---

## Understanding Billing During Pause

### Scenario: Monthly Subscription Paused Mid-Cycle

```javascript
// Subscription details
Plan: MAXI (₹1,999/month)
Current cycle: January 1 - January 31
Paid until: January 31
Today: January 15

// User pauses subscription
POST /pause { pause_at: "now" }

// What happens:
Status: active → paused (immediately)
January 16-31: No access to service
January 31: No charge occurs
February 1: No charge (subscription paused)
Remaining count: Still 11 months (preserved)

// When resumed (e.g., March 1):
Status: paused → active
Next charge: March 1 (₹1,999)
Remaining count: 11 months (unchanged)
```

**Key Insight**: Customer **loses access for remaining days** in current cycle (no pro-rated refund). Billing simply stops.

---

## Use Cases for Pausing

### Use Case 1: Seasonal Business

```javascript
// Restaurant closes for 2 months in summer
// Pause ShopPulse subscription during closure

// June 1: Pause subscription
await razorpay.subscriptions.pause(subscriptionId, { pause_at: 'now' });

// August 1: Resume subscription
await razorpay.subscriptions.resume(subscriptionId, { resume_at: 'now' });

// Benefit: No charges for 2 months, but subscription preserved
```

---

### Use Case 2: Financial Difficulties

```javascript
// Customer experiencing temporary financial hardship
// Offer 1-month pause instead of cancellation

async function offerPauseOption(subscriptionId: string) {
  // Pause for 1 month
  await razorpay.subscriptions.pause(subscriptionId, { pause_at: 'now' });

  // Schedule reminder to resume in 30 days
  await scheduleReminder({
    date: addDays(new Date(), 30),
    action: 'prompt_resume_subscription',
    subscriptionId
  });

  return {
    message: 'Subscription paused for 30 days',
    resumeDate: addDays(new Date(), 30)
  };
}
```

---

### Use Case 3: Inventory Shortage

```javascript
// SaaS product with limited server capacity
// Temporarily pause new subscriptions during migration

// Pause all active subscriptions
const activeSubscriptions = await prisma.subscription.findMany({
  where: { status: 'active' }
});

for (const subscription of activeSubscriptions) {
  await razorpay.subscriptions.pause(
    subscription.razorpaySubscriptionId,
    { pause_at: 'now' }
  );
}

// Resume after migration complete
```

---

## Errors

### Error: The API key/secret provided is invalid.

**Error Status**: `4xx`

**Description**: This error occurs due to a mismatch between the API credentials passed in the API call and those generated on the Dashboard.

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

**Solution**:
```javascript
// Verify API credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID?.trim(),
  key_secret: process.env.RAZORPAY_KEY_SECRET?.trim()
});

// Ensure keys are active on Dashboard
```

---

## Code Examples

### Example 1: Pause Subscription (Node.js)

```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function pauseSubscription(subscriptionId) {
  try {
    // Check current status
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);

    if (subscription.status !== 'active') {
      throw new Error(`Cannot pause subscription in ${subscription.status} state`);
    }

    console.log('Pausing subscription...');
    console.log('Current status:', subscription.status);
    console.log('Remaining cycles:', subscription.remaining_count);

    // Pause subscription
    const pausedSubscription = await razorpay.subscriptions.pause(subscriptionId, {
      pause_at: 'now'
    });

    console.log('✅ Subscription paused');
    console.log('New status:', pausedSubscription.status);
    console.log('Paused at:', new Date(pausedSubscription.paused_at * 1000));
    console.log('Remaining cycles preserved:', pausedSubscription.remaining_count);

    return pausedSubscription;
  } catch (error) {
    console.error('Pause failed:', error);
    throw error;
  }
}

// Usage
pauseSubscription('sub_00000000000001');
```

---

### Example 2: ShopPulse API Route - Pause Subscription

```typescript
// app/api/subscriptions/[subscriptionId]/pause/route.ts
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
    const { reason } = await req.json(); // Optional: why pausing

    // Verify subscription ownership
    const dbSubscription = await prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: subscriptionId },
      include: { user: true }
    });

    if (!dbSubscription || dbSubscription.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch current subscription state
    const currentSubscription = await razorpay.subscriptions.fetch(subscriptionId);

    // Validate status
    if (currentSubscription.status !== 'active') {
      return NextResponse.json(
        {
          error: `Cannot pause subscription in ${currentSubscription.status} state`,
          hint: 'Only active subscriptions can be paused'
        },
        { status: 400 }
      );
    }

    // Check if already paused
    if (currentSubscription.status === 'paused') {
      return NextResponse.json(
        { error: 'Subscription is already paused' },
        { status: 400 }
      );
    }

    // Pause on Razorpay
    const pausedSubscription = await razorpay.subscriptions.pause(subscriptionId, {
      pause_at: 'now'
    });

    // Update database
    await prisma.subscription.update({
      where: { razorpaySubscriptionId: subscriptionId },
      data: {
        status: 'paused',
        pausedAt: new Date(pausedSubscription.paused_at * 1000),
        pauseReason: reason || 'not_specified'
      }
    });

    // Log event
    await prisma.subscriptionEvent.create({
      data: {
        type: 'PAUSED',
        subscriptionId: dbSubscription.id,
        userId: userId,
        metadata: {
          reason,
          remainingCount: pausedSubscription.remaining_count,
          pausedAt: new Date()
        }
      }
    });

    // Revoke user access
    await revokeUserAccess(userId);

    // Send confirmation email
    await sendEmail({
      to: dbSubscription.user.email,
      subject: 'Subscription Paused',
      template: 'subscription-paused',
      data: {
        userName: dbSubscription.user.name,
        pausedDate: new Date(pausedSubscription.paused_at * 1000),
        remainingCycles: pausedSubscription.remaining_count,
        resumeInstructions: 'You can resume your subscription anytime from your dashboard'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription paused successfully',
      subscription: {
        id: pausedSubscription.id,
        status: pausedSubscription.status,
        pausedAt: new Date(pausedSubscription.paused_at * 1000),
        remainingCount: pausedSubscription.remaining_count
      }
    });

  } catch (error: any) {
    console.error('Pause subscription error:', error);

    if (error.statusCode === 400) {
      return NextResponse.json(
        { error: error.error.description },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to pause subscription' },
      { status: 500 }
    );
  }
}
```

---

### Example 3: ShopPulse Frontend - Pause Subscription UI

```typescript
// components/PauseSubscriptionDialog.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Pause, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PauseSubscriptionDialogProps {
  subscriptionId: string;
  planName: string;
  remainingCycles: number;
  onSuccess: () => void;
}

const PAUSE_REASONS = [
  { value: 'financial', label: 'Financial reasons' },
  { value: 'seasonal', label: 'Seasonal business closure' },
  { value: 'not_using', label: 'Not using the service currently' },
  { value: 'technical_issues', label: 'Technical issues' },
  { value: 'other', label: 'Other' }
];

export function PauseSubscriptionDialog({
  subscriptionId,
  planName,
  remainingCycles,
  onSuccess
}: PauseSubscriptionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePause = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/subscriptions/${subscriptionId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason === 'other' ? customReason : reason
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to pause');
      }

      const data = await response.json();
      alert(data.message);
      setIsOpen(false);
      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Failed to pause subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pause className="h-4 w-4 mr-2" />
          Pause Subscription
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pause Subscription</DialogTitle>
          <DialogDescription>
            Temporarily pause your {planName} subscription
          </DialogDescription>
        </DialogHeader>

        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>What happens when you pause:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Billing stops immediately</li>
              <li>You lose access to all features</li>
              <li>Your {remainingCycles} remaining cycles are preserved</li>
              <li>You can resume anytime</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label>Why are you pausing? (Optional)</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="mt-2 space-y-2">
              {PAUSE_REASONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {reason === 'other' && (
            <div>
              <Label htmlFor="custom-reason">Please specify</Label>
              <Textarea
                id="custom-reason"
                placeholder="Tell us why you're pausing..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handlePause} disabled={isLoading}>
            {isLoading ? 'Pausing...' : 'Pause Subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Example 4: Validate Before Pausing

```typescript
// lib/subscription-validators.ts
export async function validatePause(subscriptionId: string) {
  const subscription = await razorpay.subscriptions.fetch(subscriptionId);

  // Check 1: Status must be active
  if (subscription.status !== 'active') {
    throw new Error(
      `Cannot pause subscription in ${subscription.status} state. Only active subscriptions can be paused.`
    );
  }

  // Check 2: Already paused?
  if (subscription.status === 'paused') {
    throw new Error('Subscription is already paused');
  }

  // Check 3: Verify user has paid at least once
  if (subscription.paid_count === 0) {
    console.warn('Warning: Pausing subscription with no payments made');
  }

  return {
    valid: true,
    subscription
  };
}

// Usage
try {
  const validation = await validatePause(subscriptionId);
  await razorpay.subscriptions.pause(subscriptionId, { pause_at: 'now' });
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

---

## Implementation Best Practices

### 1. **Always Check Status Before Pausing**

```typescript
async function safePause(subscriptionId: string) {
  const subscription = await razorpay.subscriptions.fetch(subscriptionId);

  // Critical check
  if (subscription.status === 'authenticated') {
    throw new Error(
      '⚠️ DANGER: Pausing authenticated subscription will CANCEL it permanently!'
    );
  }

  if (subscription.status !== 'active') {
    throw new Error('Only active subscriptions can be paused');
  }

  return await razorpay.subscriptions.pause(subscriptionId, { pause_at: 'now' });
}
```

---

### 2. **Revoke Access Immediately**

```typescript
// After pausing, immediately revoke user access
await razorpay.subscriptions.pause(subscriptionId, { pause_at: 'now' });

// Revoke access
await prisma.user.update({
  where: { id: userId },
  data: {
    subscriptionStatus: 'paused',
    hasAccess: false,
    features: [] // Remove all features
  }
});
```

---

### 3. **Track Pause Duration**

```prisma
model Subscription {
  id              String    @id @default(cuid())
  status          String
  pausedAt        DateTime?
  pauseDuration   Int?      // Days paused
  pauseCount      Int       @default(0) // How many times paused
  pauseReason     String?
}
```

```typescript
// Calculate pause duration when resuming
const pauseDuration = Math.floor(
  (Date.now() - subscription.pausedAt.getTime()) / (1000 * 60 * 60 * 24)
);

await prisma.subscription.update({
  where: { id: subscriptionId },
  data: {
    pauseDuration: { increment: pauseDuration },
    pauseCount: { increment: 1 }
  }
});
```

---

### 4. **Send Pause Confirmation Email**

```typescript
await sendEmail({
  to: user.email,
  subject: 'Subscription Paused',
  template: 'subscription-paused',
  data: {
    userName: user.name,
    planName: plan.name,
    pausedDate: new Date(),
    remainingCycles: subscription.remaining_count,
    resumeUrl: `${process.env.NEXT_PUBLIC_URL}/dashboard/subscriptions/${subscriptionId}/resume`
  }
});
```

---

### 5. **Offer Retention Incentives**

```typescript
// Before pausing, offer incentive to stay
async function offerRetentionBeforePause(subscriptionId: string) {
  // Show popup: "Wait! Here's 20% off for 3 months instead of pausing"
  const retentionOffer = {
    discount: '20%',
    duration: 3,
    offerId: 'offer_retention_20'
  };

  // If user declines, then pause
  const userAccepted = await showRetentionOffer(retentionOffer);

  if (!userAccepted) {
    await razorpay.subscriptions.pause(subscriptionId, { pause_at: 'now' });
  } else {
    await razorpay.subscriptions.update(subscriptionId, {
      offer_id: retentionOffer.offerId,
      schedule_change_at: 'now'
    });
  }
}
```

---

## Analytics and Monitoring

### Track Pause Metrics

```typescript
// lib/analytics/subscription-analytics.ts
export async function trackPause(data: {
  subscriptionId: string;
  userId: string;
  reason: string;
  remainingCycles: number;
}) {
  // Internal tracking
  await prisma.subscriptionEvent.create({
    data: {
      type: 'PAUSED',
      subscriptionId: data.subscriptionId,
      userId: data.userId,
      metadata: {
        reason: data.reason,
        remainingCycles: data.remainingCycles,
        timestamp: new Date()
      }
    }
  });

  // Analytics platform
  analytics.track('Subscription Paused', {
    subscription_id: data.subscriptionId,
    reason: data.reason,
    remaining_cycles: data.remainingCycles,
    revenue_at_risk: calculateRevenueAtRisk(data.remainingCycles)
  });
}

function calculateRevenueAtRisk(remainingCycles: number) {
  // If customer doesn't resume, potential lost revenue
  const planAmount = 1999; // ₹1,999/month
  return remainingCycles * planAmount;
}
```

---

## Common Scenarios

### Scenario 1: Summer Vacation Pause

```typescript
// Restaurant closes for 2 months in summer
async function pauseForVacation(subscriptionId: string) {
  // Pause subscription
  await razorpay.subscriptions.pause(subscriptionId, { pause_at: 'now' });

  // Schedule reminder to resume
  const resumeDate = addMonths(new Date(), 2);
  await scheduleEmail({
    to: user.email,
    sendAt: resumeDate,
    subject: 'Time to Resume Your Subscription',
    body: 'Welcome back! Ready to resume your ShopPulse subscription?'
  });

  return { pausedUntil: resumeDate };
}
```

---

### Scenario 2: Financial Difficulty

```typescript
// Customer can't afford subscription temporarily
async function offerPauseForFinancialReasons(subscriptionId: string) {
  // Pause for 1 month
  await razorpay.subscriptions.pause(subscriptionId, { pause_at: 'now' });

  // Offer discount when they resume
  await prisma.subscription.update({
    where: { razorpaySubscriptionId: subscriptionId },
    data: {
      pauseReason: 'financial',
      resumeIncentive: 'offer_welcome_back_30' // 30% off first month
    }
  });

  return {
    message: 'Paused for 1 month. 30% discount when you resume!',
    incentive: '30% off'
  };
}
```

---

## Related Documentation

- **Part 27**: Resume Subscription (reactivate paused subscriptions)
- **Part 22**: Cancel Subscription (permanent vs temporary halt)
- **Part 18**: Subscriptions Entity (understand status lifecycle)
- **Part 21**: Fetch Subscriptions (check current status)

---

## Summary

The **Pause Subscription API** provides temporary billing halt:

1. **Status Change**: `active` → `paused`
2. **Immediate Action**: Only `pause_at: "now"` supported (no scheduling)
3. **Reversible**: Can resume later with all benefits preserved
4. **Critical Warning**: Pausing `authenticated` subscriptions cancels them permanently

**Key Fields**:
- `paused_at`: When paused
- `pause_initiated_by`: Who paused (self/merchant)
- `remaining_count`: Preserved for resume
- `charge_at`: Set to null (no upcoming charge)

**Use Cases**:
- Seasonal business closures
- Financial difficulties
- Temporary service suspension
- Customer retention strategy

**Best Practices**:
- Always validate status = `active` before pausing
- Revoke user access immediately
- Send confirmation emails
- Track pause reasons for analytics
- Offer retention incentives before pausing
- Schedule resume reminders

**Pro Tip**: Offer pause option instead of cancellation during churn - it preserves the customer relationship and makes reactivation easier!
