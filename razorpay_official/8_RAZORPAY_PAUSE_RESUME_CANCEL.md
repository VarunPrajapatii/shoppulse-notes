# Razorpay Subscriptions - Pause, Resume and Cancel

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 8 of Razorpay Official Documentation Series

---

## Table of Contents
1. [Overview](#overview)
2. [Pause a Subscription](#pause-a-subscription)
3. [Resume a Subscription](#resume-a-subscription)
4. [Cancel a Subscription](#cancel-a-subscription)
5. [Implementation Notes](#implementation-notes)

---

### Operations Summary

| Operation | Effect | Reversible | Timing Options |
|-----------|--------|------------|----------------|
| **Pause** | Stops billing, user retains access | ✅ Yes (Resume) | Immediate only |
| **Resume** | Restarts billing | N/A | Immediate only |
| **Cancel** | Ends subscription | ❌ No | Immediate OR End of cycle |

---

## Pause a Subscription

### Pause a Subscription via the Dashboard

**Video Reference**: Watch the video to know how to pause, resume and cancel a Subscription from the Dashboard (mentioned in docs)

**Steps**:

1. Log in to the Dashboard
2. Click **Subscriptions** under **PAYMENT PRODUCTS** in the left menu
3. Click the **Subscription Id** you want to pause
4. Click **Pause Subscription**
5. The subscription is **paused immediately**
6. Click **Yes, Pause**

### Effect of Pausing

- Subscription state changes to `paused`
- No further charges are made
- User typically retains access until current period ends (implementation-dependent)
- Can be resumed at any time

---

## Resume a Subscription

### Resume a Subscription via the Dashboard

**Steps**:

1. Log in to the Dashboard
2. Click **Subscriptions** under **PAYMENT PRODUCTS** in the left menu
3. Click the **Subscription Id** you want to resume
4. Click **Resume Subscription**
5. The subscription is **resumed immediately**
6. Click **Yes, Resume**

### Effect of Resuming

- Subscription state changes from `paused` to `active`
- Billing resumes according to the original schedule
- Next charge occurs at the next billing cycle date

---

## Cancel a Subscription

### Cancel a Subscription via the Dashboard

💡 **Handy Tips**: You can either cancel the subscription **immediately** or at the **end of the current billing cycle**.

**Video Reference**: Watch the video to know how to pause, resume and cancel a Subscription from the Dashboard (mentioned in docs)

**Steps**:

1. Log in to the Dashboard
2. Click **Subscriptions** under **PAYMENT PRODUCTS** in the left menu
3. Click the **Subscription Id** you want to cancel
4. Click **Cancel Subscription**
5. Choose cancellation timing:
   - **Cancel Immediately**: Ends subscription right away
   - **Cancel at End of Cycle**: Subscription continues until current period ends
6. Click **Yes, Cancel**

### Effect of Cancelling

#### Immediate Cancellation
- Subscription state changes to `cancelled`
- User loses access immediately
- No refund for remaining period (unless you implement custom refund logic)
- **Cannot be undone** - terminal state

#### End of Cycle Cancellation
- Subscription remains `active` until period end
- User retains access until current billing cycle completes
- Subscription automatically changes to `cancelled` at cycle end
- No future charges
- **Cannot be undone** once scheduled (but can be cancelled before cycle ends)

---

## Implementation Notes for ShopPulse

### Your Plan Change Policy (from 1.2.1-1.2.6)

**Your Approach**:
- **Downgrades**: End of cycle ONLY (harsh policy)
- **Upgrades**: Immediate with proration (1.2.7 flow)
- **Cancellations**: ❓ (not yet documented)

### Recommended Cancellation Strategy

**Option 1: Harsh (Consistent with Downgrades)**
```typescript
// Cancel at end of cycle ONLY
// User keeps access until period ends
// No mid-cycle cancellations
// No refunds
```

**Option 2: Flexible (Customer-Friendly)**
```typescript
// Allow immediate cancellation
// Optionally provide prorated refund
// Better for customer satisfaction
// More complex to implement
```

### API Integration

```typescript
// In your /api/subscription/cancel/route.ts

export async function POST(req: Request) {
  const { subscriptionId, cancelAt } = await req.json();
  
  // cancelAt: 'now' or 'end_of_cycle'
  const response = await fetch(
    `https://api.razorpay.com/v1/subscriptions/${subscriptionId}/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64Encode(key_id:key_secret)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cancel_at_cycle_end: cancelAt === 'end_of_cycle' ? 1 : 0
      })
    }
  );
  
  const data = await response.json();
  
  // Update your database
  await db.subscription.update({
    where: { razorpay_subscription_id: subscriptionId },
    data: {
      status: cancelAt === 'now' ? 'cancelled' : 'active',
      cancel_at_cycle_end: cancelAt === 'end_of_cycle'
    }
  });
  
  return Response.json({ success: true, data });
}
```

### Pause/Resume Use Cases

**When Users Might Want to Pause**:
- Seasonal businesses (pause during off-season)
- Temporary business closure
- Financial constraints (retain data without billing)
- Testing period without commitment

**Your Implementation Considerations**:
```typescript
// Should paused users retain access?
// Option A: Immediate access loss
if (subscription.status === 'paused') {
  return <SubscriptionPausedPage />;
}

// Option B: Grace period
if (subscription.status === 'paused' && !isGracePeriodExpired()) {
  return <Dashboard />;
}

// Option C: Read-only access
if (subscription.status === 'paused') {
  return <DashboardReadOnly />;
}
```

### Webhook Handling

```typescript
// In /api/webhook/razorpay/subscription/route.ts

switch (event) {
  case 'subscription.paused':
    await handlePause(payload.subscription);
    break;
    
  case 'subscription.resumed':
    await handleResume(payload.subscription);
    break;
    
  case 'subscription.cancelled':
    await handleCancellation(payload.subscription);
    break;
}

async function handleCancellation(subscription: any) {
  // Update database
  await db.subscription.update({
    where: { razorpay_subscription_id: subscription.id },
    data: {
      status: 'cancelled',
      cancelled_at: new Date(),
      ends_at: new Date(subscription.ended_at * 1000)
    }
  });
  
  // Send notification
  await sendCancellationEmail(subscription);
  
  // Clean up resources (optional)
  await archiveUserData(subscription.userId);
}
```

### Dashboard UI Considerations

```typescript
// SubscriptionManagement.tsx

<Card>
  <CardHeader>
    <CardTitle>Subscription Status: {subscription.status}</CardTitle>
  </CardHeader>
  <CardContent>
    {subscription.status === 'active' && (
      <>
        <Button onClick={handlePause}>Pause Subscription</Button>
        <Button onClick={handleCancel} variant="destructive">
          Cancel Subscription
        </Button>
      </>
    )}
    
    {subscription.status === 'paused' && (
      <>
        <Button onClick={handleResume}>Resume Subscription</Button>
        <Button onClick={handleCancel} variant="destructive">
          Cancel Subscription
        </Button>
      </>
    )}
    
    {subscription.cancel_at_cycle_end && (
      <Alert>
        <AlertTitle>Scheduled Cancellation</AlertTitle>
        <AlertDescription>
          Your subscription will be cancelled on {subscription.ends_at}
        </AlertDescription>
        <Button onClick={handleUndoCancel}>
          Keep Subscription
        </Button>
      </Alert>
    )}
  </CardContent>
</Card>
```

### State Transitions

**From Part 3 (States)**:

```
ACTIVE --[pause]--> PAUSED
PAUSED --[resume]--> ACTIVE
ACTIVE --[cancel]--> CANCELLED
PAUSED --[cancel]--> CANCELLED

CANCELLED = Terminal state (cannot be reversed)
```

---

## Related Documentation

- Part 1: [Subscriptions Overview](./1_RAZORPAY_SUBSCRIPTIONS_OVERVIEW.md)
- Part 2: [Subscriptions Workflow](./2_RAZORPAY_SUBSCRIPTIONS_WORKFLOW.md)
- Part 3: [Subscriptions States](./3_RAZORPAY_SUBSCRIPTIONS_STATES.md)
- Part 4: [Create and View Plans](./4_RAZORPAY_CREATE_AND_VIEW_PLANS.md)
- Part 5: [Create Subscriptions via Links](./5_RAZORPAY_CREATE_SUBSCRIPTIONS_VIA_LINKS.md)
- Part 6: [Manual Charge & View Details](./6_RAZORPAY_MANUAL_CHARGE_AND_VIEW.md)
- Part 7: [Update Subscriptions](./7_RAZORPAY_UPDATE_SUBSCRIPTION.md)
- Part 9: Subscriptions Settings (Next)
