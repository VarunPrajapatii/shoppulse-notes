# Part 27: Resume a Subscription API

## Overview

The **Resume Subscription API** allows you to reactivate a paused subscription, restoring billing and access. This is the counterpart to the Pause API.

**Endpoint**: `POST /v1/subscriptions/:id/resume`

**Key Points**:
- Only `paused` subscriptions can be resumed
- Resume happens immediately (no scheduling)
- Billing resumes from the next cycle
- All remaining cycles are preserved
- Customer regains full access

---

## Understanding Resume

### What Happens When You Resume

```javascript
Before Resume:
Status: paused
Billing: Stopped
Customer Access: None
Remaining cycles: 8 months

After Resume:
Status: active
Billing: Resumes next cycle
Customer Access: Restored
Remaining cycles: 8 months (preserved)
```

**Key Point**: Resume doesn't charge immediately. The next charge occurs at the scheduled `charge_at` timestamp.

---

## Resume Timeline Example

```javascript
// Subscription paused on January 15
Status: active → paused
Paused at: January 15, 2024
Last charge: January 1 (for January cycle)
Remaining cycles: 11 months

// Resume on March 1
POST /resume { resume_at: 'now' }

Status: paused → active
Resumed at: March 1, 2024
Next charge: March 1 (immediately creates invoice)
Remaining cycles: 11 months (unchanged)

// Billing resumes
March 1: Charged ₹1,999 (March cycle)
April 1: Charged ₹1,999 (April cycle)
...continues for remaining 11 months
```

**Important**: If you pause mid-cycle (e.g., January 15), you **lose access for the remaining days** (January 16-31). When you resume on March 1, you're charged for March - you don't get back those lost January days.

---

## API Details

### Endpoint
```
POST https://api.razorpay.com/v1/subscriptions/:id/resume
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
| `resume_at` | string | ⚠️ Conditional | The value should be `now` to resume a Subscription immediately. |

**Note**: Like the Pause API, resume **only supports immediate action**. You cannot schedule a resume for the future.

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
| `paused_at` | integer | The timestamp, in Unix format, when the subscription was paused. For example, `1590280581`. (Preserved from when it was paused) |
| `expire_by` | integer | The timestamp, in Unix format, till when the customer can make the authorization payment. For example, `1581013800`. |
| `pause_initiated_by` | string | Cleared to `null` after resume. Previously indicated who paused: `"self"` or `"merchant"`. |
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
  "status": "active",
  "current_start": null,
  "current_end": null,
  "ended_at": null,
  "quantity": 1,
  "notes": {
    "notes_key_1": "Tea, Earl Grey, Hot",
    "notes_key_2": "Tea, Earl Grey… decaf."
  },
  "charge_at": 1580453311,
  "start_at": 1580626111,
  "end_at": 1583433000,
  "auth_attempts": 0,
  "total_count": 6,
  "paid_count": 0,
  "customer_notify": true,
  "created_at": 1580280581,
  "paused_at": 1590280581,
  "expire_by": 1580626111,
  "pause_initiated_by": null,
  "short_url": "https://rzp.io/i/z3b1R61A9",
  "has_scheduled_changes": false,
  "change_scheduled_at": null,
  "source": "api",
  "offer_id": "offer_JHD834hjbxzhd38d",
  "remaining_count": 6
}
```

---

## Key Response Changes

| Field | Before Resume (Paused) | After Resume (Active) |
|-------|------------------------|----------------------|
| `status` | `paused` | `active` |
| `charge_at` | `null` | Unix timestamp (next charge date) |
| `pause_initiated_by` | `"self"` or `"merchant"` | `null` (cleared) |
| `current_start` | `null` | `null` (will be set after first charge) |
| `current_end` | `null` | `null` (will be set after first charge) |
| `remaining_count` | Preserved | Same (unchanged) |

**Note**: `paused_at` field remains in the response (historical record of when it was paused).

---

## Understanding Billing After Resume

### Scenario 1: Resume Creates Immediate Invoice

```javascript
// Subscription details
Plan: MIDI (₹599/month)
Paused on: February 15
Resume on: March 1

// Resume
POST /resume { resume_at: 'now' }

// What happens:
Status: paused → active (immediately)
March 1: Invoice created for March cycle
charge_at: March 1 (customer charged today)
Next cycle: April 1 - April 30

// Timeline after resume:
March 1: Charged ₹599 ✅
April 1: Charged ₹599 ✅
May 1: Charged ₹599 ✅
...continues until remaining_count reaches 0
```

---

### Scenario 2: Lost Days During Pause

```javascript
// Important: No pro-rated refund for pause period

Original subscription:
January 1-31: Paid ₹1,999 (full month)

Pause on January 15:
January 15-31: No access (lost 16 days)
January 31: No charge

Resume on March 1:
March 1: Charged ₹1,999 (new cycle)

// Lost days:
January 16-31: 16 days lost (no refund)
February 1-28: 28 days lost (no charge, no access)
Total lost: 44 days

// Customer effectively paid for:
January 1-15: 15 days (out of 31 days paid)
Lost value: ~50% of January payment
```

**Recommendation**: Resume at cycle start dates to minimize lost value.

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
// Ensure correct credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID?.trim(),
  key_secret: process.env.RAZORPAY_KEY_SECRET?.trim()
});
```

---

## Code Examples

### Example 1: Resume Subscription (Node.js)

```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function resumeSubscription(subscriptionId) {
  try {
    // Check current status
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);

    if (subscription.status !== 'paused') {
      throw new Error(`Cannot resume subscription in ${subscription.status} state`);
    }

    console.log('Resuming subscription...');
    console.log('Current status:', subscription.status);
    console.log('Paused at:', new Date(subscription.paused_at * 1000));
    console.log('Remaining cycles:', subscription.remaining_count);

    // Resume subscription
    const resumedSubscription = await razorpay.subscriptions.resume(subscriptionId, {
      resume_at: 'now'
    });

    console.log('✅ Subscription resumed');
    console.log('New status:', resumedSubscription.status);
    console.log('Next charge:', new Date(resumedSubscription.charge_at * 1000));
    console.log('Remaining cycles:', resumedSubscription.remaining_count);

    // Calculate pause duration
    const pauseDuration = Math.floor(
      (Date.now() - subscription.paused_at * 1000) / (1000 * 60 * 60 * 24)
    );
    console.log('Was paused for:', pauseDuration, 'days');

    return resumedSubscription;
  } catch (error) {
    console.error('Resume failed:', error);
    throw error;
  }
}

// Usage
resumeSubscription('sub_00000000000001');
```

---

### Example 2: ShopPulse API Route - Resume Subscription

```typescript
// app/api/subscriptions/[subscriptionId]/resume/route.ts
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
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch current subscription state
    const currentSubscription = await razorpay.subscriptions.fetch(subscriptionId);

    // Validate status
    if (currentSubscription.status !== 'paused') {
      return NextResponse.json(
        {
          error: `Cannot resume subscription in ${currentSubscription.status} state`,
          hint: 'Only paused subscriptions can be resumed'
        },
        { status: 400 }
      );
    }

    // Calculate pause duration
    const pauseDuration = Math.floor(
      (Date.now() - dbSubscription.pausedAt!.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Resume on Razorpay
    const resumedSubscription = await razorpay.subscriptions.resume(subscriptionId, {
      resume_at: 'now'
    });

    // Update database
    await prisma.subscription.update({
      where: { razorpaySubscriptionId: subscriptionId },
      data: {
        status: 'active',
        resumedAt: new Date(),
        pauseDuration: {
          increment: pauseDuration
        }
      }
    });

    // Restore user access
    await restoreUserAccess(userId);

    // Apply resume incentive if available
    if (dbSubscription.resumeIncentive) {
      await razorpay.subscriptions.update(subscriptionId, {
        offer_id: dbSubscription.resumeIncentive,
        schedule_change_at: 'now'
      });
    }

    // Log event
    await prisma.subscriptionEvent.create({
      data: {
        type: 'RESUMED',
        subscriptionId: dbSubscription.id,
        userId: userId,
        metadata: {
          pauseDuration: pauseDuration,
          resumedAt: new Date(),
          nextChargeAt: new Date(resumedSubscription.charge_at * 1000)
        }
      }
    });

    // Send confirmation email
    await sendEmail({
      to: dbSubscription.user.email,
      subject: 'Subscription Resumed - Welcome Back!',
      template: 'subscription-resumed',
      data: {
        userName: dbSubscription.user.name,
        planName: dbSubscription.planName,
        nextChargeDate: new Date(resumedSubscription.charge_at * 1000),
        remainingCycles: resumedSubscription.remaining_count,
        pauseDuration: pauseDuration
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed successfully',
      subscription: {
        id: resumedSubscription.id,
        status: resumedSubscription.status,
        nextChargeAt: new Date(resumedSubscription.charge_at * 1000),
        remainingCount: resumedSubscription.remaining_count,
        pauseDuration: pauseDuration
      }
    });

  } catch (error: any) {
    console.error('Resume subscription error:', error);

    if (error.statusCode === 400) {
      return NextResponse.json(
        { error: error.error.description },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to resume subscription' },
      { status: 500 }
    );
  }
}
```

---

### Example 3: ShopPulse Frontend - Resume Subscription UI

```typescript
// components/ResumeSubscriptionCard.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Calendar, DollarSign, Clock } from 'lucide-react';

interface ResumeSubscriptionCardProps {
  subscriptionId: string;
  planName: string;
  planAmount: number;
  pausedAt: Date;
  remainingCycles: number;
  resumeIncentive?: {
    description: string;
    discount: string;
  };
  onSuccess: () => void;
}

export function ResumeSubscriptionCard({
  subscriptionId,
  planName,
  planAmount,
  pausedAt,
  remainingCycles,
  resumeIncentive,
  onSuccess
}: ResumeSubscriptionCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const pauseDuration = Math.floor((Date.now() - pausedAt.getTime()) / (1000 * 60 * 60 * 24));

  const handleResume = async () => {
    if (!confirm('Resume subscription now? Your card will be charged immediately.')) {
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`/api/subscriptions/${subscriptionId}/resume`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resume');
      }

      const data = await response.json();
      alert(data.message);
      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Failed to resume subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-orange-900">Subscription Paused</CardTitle>
          <Badge variant="outline" className="text-orange-700">
            Paused for {pauseDuration} days
          </Badge>
        </div>
        <CardDescription className="text-orange-700">
          Your {planName} subscription is currently paused
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pause Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Paused On</p>
              <p className="text-sm text-muted-foreground">
                {pausedAt.toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Remaining Cycles</p>
              <p className="text-sm text-muted-foreground">
                {remainingCycles} months
              </p>
            </div>
          </div>
        </div>

        {/* Resume Incentive */}
        {resumeIncentive && (
          <Alert className="bg-green-50 border-green-200">
            <DollarSign className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Welcome Back Offer!</strong>
              <br />
              {resumeIncentive.description} - {resumeIncentive.discount}
            </AlertDescription>
          </Alert>
        )}

        {/* What Happens */}
        <Alert>
          <AlertDescription>
            <strong>When you resume:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Your card will be charged ₹{planAmount} today</li>
              <li>Full access restored immediately</li>
              <li>Billing continues monthly</li>
              <li>{remainingCycles} billing cycles remaining</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Next Charge Info */}
        <div className="p-4 bg-white rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Immediate Charge</p>
              <p className="text-2xl font-bold text-green-600">₹{planAmount}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Then</p>
              <p className="text-sm font-medium">₹{planAmount}/month</p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button onClick={handleResume} disabled={isLoading} className="w-full" size="lg">
          <Play className="h-4 w-4 mr-2" />
          {isLoading ? 'Resuming...' : 'Resume Subscription'}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

### Example 4: Auto-Resume After X Days

```typescript
// lib/cron/auto-resume.ts
export async function checkAutoResume() {
  // Find subscriptions paused for more than 90 days
  const longPausedSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'paused',
      pausedAt: {
        lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
      },
      autoResume: true // User opted in
    }
  });

  for (const subscription of longPausedSubscriptions) {
    try {
      // Send reminder 7 days before auto-resume
      const resumeDate = new Date(subscription.pausedAt!.getTime() + 90 * 24 * 60 * 60 * 1000);
      const daysUntilResume = Math.ceil((resumeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (daysUntilResume === 7) {
        await sendEmail({
          to: subscription.user.email,
          subject: 'Your subscription will resume in 7 days',
          body: `Your paused subscription will automatically resume on ${resumeDate.toLocaleDateString()}`
        });
      }

      // Auto-resume on the 90th day
      if (daysUntilResume <= 0) {
        await razorpay.subscriptions.resume(subscription.razorpaySubscriptionId, {
          resume_at: 'now'
        });

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'active', resumedAt: new Date() }
        });

        console.log(`Auto-resumed subscription: ${subscription.id}`);
      }
    } catch (error) {
      console.error(`Failed to auto-resume: ${subscription.id}`, error);
    }
  }
}
```

---

## Implementation Best Practices

### 1. **Validate Status Before Resuming**

```typescript
async function safeResume(subscriptionId: string) {
  const subscription = await razorpay.subscriptions.fetch(subscriptionId);

  // Must be paused
  if (subscription.status !== 'paused') {
    throw new Error(`Cannot resume subscription in ${subscription.status} state`);
  }

  // Check payment method is still valid
  const customer = await razorpay.customers.fetch(subscription.customer_id);
  if (!customer.card || customer.card.expired) {
    throw new Error('Payment method expired. Please update before resuming.');
  }

  return await razorpay.subscriptions.resume(subscriptionId, { resume_at: 'now' });
}
```

---

### 2. **Restore Access Immediately**

```typescript
// After resuming, restore user access
await razorpay.subscriptions.resume(subscriptionId, { resume_at: 'now' });

// Restore access
await prisma.user.update({
  where: { id: userId },
  data: {
    subscriptionStatus: 'active',
    hasAccess: true,
    features: getAllFeatures(planId) // Restore all features
  }
});
```

---

### 3. **Apply Welcome Back Incentives**

```typescript
async function resumeWithIncentive(subscriptionId: string) {
  // Resume subscription
  await razorpay.subscriptions.resume(subscriptionId, { resume_at: 'now' });

  // Apply 20% discount for first month back
  await razorpay.subscriptions.update(subscriptionId, {
    offer_id: 'offer_welcome_back_20',
    schedule_change_at: 'now'
  });

  return {
    message: 'Subscription resumed with 20% discount',
    savings: '₹400 on first month'
  };
}
```

---

### 4. **Track Resume Metrics**

```typescript
async function trackResume(data: {
  subscriptionId: string;
  userId: string;
  pauseDuration: number;
}) {
  await prisma.subscriptionEvent.create({
    data: {
      type: 'RESUMED',
      subscriptionId: data.subscriptionId,
      userId: data.userId,
      metadata: {
        pauseDuration: data.pauseDuration,
        timestamp: new Date()
      }
    }
  });

  analytics.track('Subscription Resumed', {
    subscription_id: data.subscriptionId,
    pause_duration_days: data.pauseDuration,
    churn_prevented: true
  });
}
```

---

### 5. **Send Welcome Back Email**

```typescript
await sendEmail({
  to: user.email,
  subject: 'Welcome Back! Subscription Resumed',
  template: 'subscription-resumed',
  data: {
    userName: user.name,
    planName: plan.name,
    nextChargeDate: new Date(subscription.charge_at * 1000),
    pauseDuration: pauseDuration,
    incentive: resumeIncentive
  }
});
```

---

## Common Scenarios

### Scenario 1: Seasonal Resume (Restaurant Reopens)

```typescript
// Restaurant closed for 2 months, now reopening
async function resumeAfterSeasonalBreak(subscriptionId: string) {
  const subscription = await razorpay.subscriptions.fetch(subscriptionId);
  
  // Calculate pause duration
  const pauseDuration = Math.floor(
    (Date.now() - subscription.paused_at * 1000) / (1000 * 60 * 60 * 24)
  );

  console.log(`Paused for ${pauseDuration} days`);

  // Resume
  await razorpay.subscriptions.resume(subscriptionId, { resume_at: 'now' });

  return {
    message: 'Welcome back! Subscription reactivated',
    pauseDuration: `${pauseDuration} days`,
    nextCharge: new Date(subscription.charge_at * 1000)
  };
}
```

---

### Scenario 2: Financial Recovery

```typescript
// Customer's financial situation improved
async function resumeAfterFinancialRecovery(subscriptionId: string) {
  // Resume subscription
  await razorpay.subscriptions.resume(subscriptionId, { resume_at: 'now' });

  // Apply loyalty discount (3 months 30% off)
  await razorpay.subscriptions.update(subscriptionId, {
    offer_id: 'offer_loyalty_30_3months',
    schedule_change_at: 'now'
  });

  return {
    message: 'Subscription resumed with loyalty discount',
    benefit: '30% off for 3 months',
    savings: '₹1,800 total savings'
  };
}
```

---

## Related Documentation

- **Part 26**: Pause Subscription (how to pause in the first place)
- **Part 22**: Cancel Subscription (permanent vs temporary halt)
- **Part 18**: Subscriptions Entity (understand status lifecycle)
- **Part 28**: Fetch Invoices (see billing history after resume)

---

## Summary

The **Resume Subscription API** reactivates paused subscriptions:

1. **Status Change**: `paused` → `active`
2. **Immediate Billing**: Next charge occurs immediately (creates invoice)
3. **Access Restored**: Customer regains full feature access
4. **Cycles Preserved**: All remaining billing cycles unchanged

**Key Fields**:
- `resume_at`: Must be `"now"` (only immediate resume supported)
- `charge_at`: Set to current timestamp (immediate charge)
- `pause_initiated_by`: Cleared to `null`
- `remaining_count`: Unchanged (preserved)

**Important Notes**:
- Lost days during pause are **not refunded**
- Immediate charge occurs on resume
- Payment method must be valid
- Customer must have sufficient funds

**Best Practices**:
- Validate payment method before resume
- Restore user access immediately
- Apply welcome back incentives
- Send confirmation emails
- Track pause/resume analytics
- Set up auto-resume reminders

**Pro Tip**: Offer welcome back incentives (discounts, extra features) to encourage customers to resume paused subscriptions!
