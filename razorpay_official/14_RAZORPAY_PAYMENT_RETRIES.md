# Razorpay Subscription Payment Retries

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 14 of Razorpay Official Documentation Series

---

## Table of Contents
1. [Overview](#overview)
2. [Payment Failure Reasons](#payment-failure-reasons)
3. [What Happens on Payment Failure](#what-happens-on-payment-failure)
4. [Retry Models](#retry-models)
5. [Handle Failed Charges](#handle-failed-charges)
6. [Notifications](#notifications)
7. [Implementation Guide](#implementation-guide)

---

## Overview

Recurring payments for a Subscription are **auto-debited** based on the scheduled day you defined. However, these payments could fail.


## Payment Failure Reasons

Common reasons why recurring payments fail:

| Reason | Description | Recovery Action |
|--------|-------------|-----------------|
| 💳 **Expired Card** | Card validity period ended | Customer updates card details |
| 🚫 **Blocked Card** | Bank has blocked the card | Customer contacts bank or changes card |
| 💰 **Insufficient Balance** | Not enough funds in account | Customer adds funds or changes payment method |
| ❌ **Cancelled Mandate** | Customer cancelled recurring permission | Customer re-authorizes or changes method |

---

## What Happens on Payment Failure

### Automatic Flow

```
T=0 (Charge Day): Auto-charge attempt fails
      ↓
Subscription → PENDING state
      ↓
Webhook notification sent (subscription.pending)
      ↓
T+1: Automatic retry #1
      ↓
T+2: Automatic retry #2
      ↓
T+3: Automatic retry #3
      ↓
All retries failed?
      ↓
Subscription → HALTED state
      ↓
Webhook notification sent (subscription.halted)
```

### State Transitions

```
ACTIVE → (payment fails) → PENDING
PENDING → (retry succeeds) → ACTIVE
PENDING → (all retries fail) → HALTED
HALTED → (customer changes card) → ACTIVE (manual charge needed)
```

### Detailed Behavior

1. **Subscription Moves to PENDING State**
   - Immediately after first payment failure
   - Automatic retries begin

2. **Webhook Notifications**
   - `subscription.pending` - Sent when subscription enters pending state
   - `subscription.halted` - Sent after all retries exhausted

3. **Automatic Retry Process**
   - Razorpay automatically retries payment on the following day
   - No manual intervention needed
   - Continues for T+3 days cycle (3 retry attempts)

4. **Card Change During PENDING State**
   - If customer changes card while subscription is PENDING
   - We automatically charge the last invoice with new card
   - If successful → Subscription moves back to ACTIVE
   - If failed → Continue retry attempts

5. **All Retries Failed**
   - Subscription moves to HALTED state
   - Invoices are still created (for record keeping)
   - **Invoices are NOT charged automatically**
   - You must charge them **manually** from Dashboard

6. **Card Change During HALTED State**
   - Customer can change card details
   - Subscription moves back to ACTIVE
   - You must **manually charge** pending invoices
   - Future invoices resume automatic charging

💡 **Handy Tip**: This process will **not affect** the charge cycle for subsequent months. The billing schedule continues regardless of payment failures.

---

## Retry Models

Different payment methods have different retry strategies.

### Cards Retry Model

**T+3 Days Cycle** (3 retry attempts over 3 days)

```
Day 0 (T=0) - Charge Day:
├─ Attempt auto-charge
├─ ❌ Charge fails
└─ Subscription → PENDING state

Day 1 (T+1):
├─ 🔄 Automatic retry attempt #1
└─ ❌ Still fails

Day 2 (T+2):
├─ 🔄 Automatic retry attempt #2
└─ ❌ Still fails

Day 3 (T+3):
├─ 🔄 Automatic retry attempt #3
└─ ❌ Still fails
    └─ Subscription → HALTED state

Customer Action:
└─ Can switch to different payment method
```

**Example Timeline**:
```
Dec 1 (T=0): Monthly charge attempt - FAILED (Insufficient funds)
             Subscription: active → pending
             Email sent to customer

Dec 2 (T+1): Auto retry #1 - FAILED
             Customer notified

Dec 3 (T+2): Auto retry #2 - FAILED
             Customer adds funds to account

Dec 4 (T+3): Auto retry #3 - SUCCESS ✅
             Subscription: pending → active
             Service continues normally

Alternative: If all 4 attempts fail
Dec 4 (T+3): After final failure
             Subscription: pending → halted
             Manual intervention required
```

---

### UPI Retry Model

**T+3 Days Cycle** (3 retry attempts over 3 days)

```
Day 0 (T=0) - Charge Day:
├─ Attempt UPI auto-charge
├─ ❌ Charge fails
└─ Subscription → PENDING state

Day 1 (T+1):
├─ 🔄 Automatic retry attempt #1
└─ ❌ Still fails

Day 2 (T+2):
├─ 🔄 Automatic retry attempt #2
└─ ❌ Still fails

Day 3 (T+3):
├─ 🔄 Automatic retry attempt #3
└─ ❌ Still fails
    └─ Subscription → HALTED state

Customer Action:
└─ Can switch to different payment method (Card/Emandate)
```

**UPI-Specific Considerations**:
- Same retry pattern as cards (T+3 days)
- UPI has daily transaction limits (may cause failures)
- Customer can switch to Card or Emandate
- Cannot switch from Card/Emandate to UPI during recovery

---

### Emandate Retry Model

**Special Handling** (Bank processing time varies)

```
Charge Day (T):
├─ Is T a bank holiday?
│   ├─ YES → Charge on T-1 days
│   └─ NO → Charge on T
│
├─ Are both T and T-1 bank holidays?
│   ├─ YES → Charge on T-3 days
│   └─ NO → Follow normal schedule
│
└─ Attempt charge
    ├─ ❌ Fails
    └─ Wait for confirmation/rejection (may take >24 hours)
        └─ Retry only after confirmation received
```

**Key Differences**:
- Bank processing can take **more than 24 hours**
- Retry only after confirmation/rejection of last attempt
- Bank holidays affect charge date
- More conservative retry strategy

**Example**:
```
Scenario: Charge day is Sunday (bank holiday)

Normal schedule: Charge on Sunday
Adjusted: Charge on Saturday (T-1)

Scenario: Both Saturday and Sunday are holidays

Normal schedule: Charge on Sunday
Adjusted: Charge on Thursday (T-3)
```

---

## Handle Failed Charges

You have **2 ways** to handle a failed charge:

### Option 1: Manual Charge on Same Card

**When to Use**:
- Customer had temporary issue (insufficient balance)
- Customer informs you the issue is resolved
- Card is still valid and active

⚠️ **Watch Out!**: Manual charging of a **domestic card is NOT supported**.

**Process**:
```
1. Customer receives payment failure email
2. Customer resolves issue (adds funds to account)
3. Customer contacts you: "I've added money, please retry"
4. You manually attempt charge from Dashboard
5. Charge succeeds → Subscription: pending/halted → active
```

**Dashboard Steps**:
1. Navigate to Subscriptions
2. Filter by "Pending" or "Halted" status
3. Click the Subscription ID
4. View invoices in "issued" state
5. Click **Attempt Charge**
6. Invoice charged → Subscription reactivated

**Example Scenario**:
```
Dec 1: Auto-charge fails (insufficient balance)
Dec 2: Customer receives email
Dec 2 (afternoon): Customer adds ₹10,000 to account
Dec 2 (evening): Customer emails: "Please retry, I've added funds"
Dec 2: You manually charge from Dashboard → SUCCESS ✅
Dec 2: Subscription reactivated
```

---

### Option 2: Change Card Linked to Subscription

**When to Use**:
- Original card is expired/blocked
- Customer wants to use different card
- Multiple retry attempts failed

#### Method 1: Customer Uses Email Link

**Automatic Process**:
```
1. Payment failure occurs
2. Razorpay sends email to customer
3. Email contains link to update payment method
4. Customer clicks link → Razorpay hosted page opens
5. Customer updates card details
6. New card is charged
7. Subscription reactivated automatically
```

**Email Content** (sent by Razorpay):
```
Subject: Payment Failed for Your Subscription

Hi [Customer Name],

Your recent payment for [Plan Name] failed due to [reason].

To continue your subscription without interruption:
→ Update your payment method [LINK]

Current due: ₹4,999
Due date: Dec 1, 2025

Need help? Contact support@shoppulse.com
```

---

#### Method 2: Via Your Checkout (API Integration)

You can allow customers to change card details through **your own checkout** using the `subscription_card_change` parameter.

**Parameter**:
```javascript
subscription_card_change: 1  // Allow card change
subscription_card_change: 0  // Don't allow card change
```

**Implementation - Handler Function**:

```html
<button id="rzp-button1">Update Payment Method</button>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  var options = {
    "key": "YOUR_KEY_ID",
    "subscription_id": "sub_xxxxx",
    "name": "ShopPulse",
    "description": "Update Payment Method",
    "image": "/logo.jpg",
    
    // 🎯 Enable card change
    "subscription_card_change": true, // or 1
    
    "handler": function(response) {
      // Payment successful after card change
      console.log("Payment ID:", response.razorpay_payment_id);
      console.log("Subscription ID:", response.razorpay_subscription_id);
      console.log("Signature:", response.razorpay_signature);
      
      // Verify signature on your server
      verifySignature(response);
    },
    
    "prefill": {
      "name": "Gaurav Kumar",
      "email": "gaurav.kumar@example.com",
      "contact": "+919876543210"
    },
    
    "notes": {
      "user_id": "user_123",
      "subscription_id": "sub_xxxxx"
    },
    
    "theme": {
      "color": "#3399cc"
    }
  };
  
  var rzp1 = new Razorpay(options);
  
  document.getElementById('rzp-button1').onclick = function(e) {
    rzp1.open();
    e.preventDefault();
  }
</script>
```

**Handler Function vs Callback URL**:

| Approach | How It Works | Use Case |
|----------|--------------|----------|
| **Handler Function** | Response returned to JavaScript function | SPA/React apps, client-side handling |
| **Callback URL** | Response POST-ed to your server URL | Server-side verification, traditional apps |

---

#### Method 3: Razorpay Hosted Page

**Best Option for Simplicity** ✅

Razorpay provides a ready-made hosted page that handles the entire flow:

**Flow**:
```
1. Customer receives payment failure email
   ↓
2. Email contains link to Razorpay hosted page
   ↓
3. Customer clicks link
   ↓
4. Hosted page shows payment options:
   - Update Card details
   - Switch to UPI
   - Switch to Emandate
   ↓
5. Customer selects option and completes payment
   ↓
6. Payment successful → Subscription: halted → active
   ↓
7. Customer receives confirmation email
```

**Supported Payment Method Changes**:

| Current Method | Can Change To Card | Can Change To UPI | Can Change To Emandate |
|----------------|-------------------|-------------------|------------------------|
| **Card** | ✅ Yes | ✅ Yes | ✅ Yes |
| **UPI** | ✅ Yes | ❌ No | ❌ No |
| **Emandate** | ✅ Yes | ❌ No | ❌ No |

**Why UPI/Emandate Can't Switch to UPI**:
- UPI autopay mandate is linked to specific UPI ID
- Cannot update UPI ID without recreating mandate
- Card is universal fallback option

**Hosted Page Features**:
- ✅ No coding required
- ✅ Mobile responsive
- ✅ Supports all payment methods
- ✅ Automatic email notifications
- ✅ Handles verification and webhooks
- ✅ Branded with Razorpay + your logo

**Visual**: Sample hosted page for payment methods (image in official docs)

**Dashboard Filter for Failed Subscriptions**:
```
Dashboard → Subscriptions → Status Filter:
- Select "Halted"
- Select "Pending"
- View all subscriptions needing attention
- Bulk send subscription links to customers
```

---

## Notifications

### Webhook Events

Enable these webhooks to track payment failures:

| Event | When Triggered | Action Needed |
|-------|----------------|---------------|
| `subscription.pending` | First payment failure | Monitor, send reminder to customer |
| `subscription.halted` | All retries exhausted | Block service access, contact customer urgently |
| `subscription.charged.successfully` | Payment succeeds after retry | Reactivate service, send confirmation |

### Email Notifications

**Razorpay Sends to Customer**:

1. **Payment Failure Email**
   - Sent immediately after first failure
   - Contains link to update payment method
   - Explains reason for failure (if available)

2. **Retry Failure Emails**
   - Sent after each retry attempt
   - Reminds customer to take action
   - Shows number of attempts remaining

3. **Subscription Halted Email**
   - Sent after all retries fail
   - Urgent tone
   - Explains service may be interrupted
   - Provides recovery link

**You Should Send**:

1. **Service Interruption Warning**
   - When subscription enters PENDING
   - Warn about potential service disruption
   - Provide easy recovery options

2. **Service Paused Notice**
   - When subscription enters HALTED
   - Explain service is paused
   - Clear call-to-action to resolve

3. **Service Restored Confirmation**
   - When subscription returns to ACTIVE
   - Thank customer for resolving
   - Confirm service continuation

---

## Implementation Guide

### Webhook Handler

```typescript
// src/app/api/webhook/razorpay/subscription/route.ts

export async function POST(req: Request) {
  const payload = await req.json();
  const event = payload.event;
  
  switch (event) {
    case 'subscription.pending':
      await handleSubscriptionPending(payload);
      break;
      
    case 'subscription.halted':
      await handleSubscriptionHalted(payload);
      break;
      
    case 'subscription.charged.successfully':
      await handleChargeSuccess(payload);
      break;
  }
  
  return Response.json({ status: 'ok' });
}

async function handleSubscriptionPending(payload: any) {
  const subscription = payload.payload.subscription.entity;
  const payment = payload.payload.payment?.entity;
  
  // Update database
  await prisma.subscription.update({
    where: { razorpay_subscription_id: subscription.id },
    data: {
      status: 'pending',
      metadata: {
        payment_failure_reason: payment?.error_reason,
        payment_failure_date: new Date().toISOString(),
        retry_count: 0
      }
    }
  });
  
  // Notify customer
  await sendEmail({
    to: subscription.customer_email,
    subject: '⚠️ Payment Failed - Action Required',
    template: 'payment_failed',
    data: {
      subscription_id: subscription.id,
      amount: subscription.plan.item.amount / 100,
      reason: payment?.error_reason || 'Payment declined',
      update_link: `https://shoppulse.com/subscription/${subscription.id}/update-payment`
    }
  });
  
  // Log for monitoring
  await prisma.paymentFailureLog.create({
    data: {
      subscriptionId: subscription.id,
      reason: payment?.error_reason,
      attempt: 1,
      status: 'pending'
    }
  });
}

async function handleSubscriptionHalted(payload: any) {
  const subscription = payload.payload.subscription.entity;
  
  // Update database
  await prisma.subscription.update({
    where: { razorpay_subscription_id: subscription.id },
    data: {
      status: 'halted',
      metadata: {
        halted_at: new Date().toISOString(),
        halted_reason: 'all_retries_failed'
      }
    }
  });
  
  // ⚠️ CRITICAL: Block service access
  await prisma.user.update({
    where: { id: subscription.userId },
    data: {
      subscription_active: false,
      access_level: 'suspended'
    }
  });
  
  // Notify customer - URGENT
  await sendEmail({
    to: subscription.customer_email,
    subject: '🚨 Subscription Suspended - Immediate Action Required',
    template: 'subscription_halted',
    data: {
      subscription_id: subscription.id,
      amount_due: subscription.plan.item.amount / 100,
      update_link: `https://shoppulse.com/subscription/${subscription.id}/recover`,
      support_email: 'support@shoppulse.com'
    }
  });
  
  // Notify admin
  await sendSlackNotification({
    channel: '#subscription-alerts',
    message: `⚠️ Subscription ${subscription.id} HALTED. User: ${subscription.userId}. Action needed.`
  });
}

async function handleChargeSuccess(payload: any) {
  const subscription = payload.payload.subscription.entity;
  const payment = payload.payload.payment.entity;
  
  // Check if this is a recovery (was pending/halted)
  const currentSub = await prisma.subscription.findUnique({
    where: { razorpay_subscription_id: subscription.id }
  });
  
  const wasRecovered = ['pending', 'halted'].includes(currentSub?.status);
  
  // Update database
  await prisma.subscription.update({
    where: { razorpay_subscription_id: subscription.id },
    data: {
      status: 'active',
      metadata: {
        ...currentSub?.metadata,
        last_successful_charge: new Date().toISOString(),
        recovered_at: wasRecovered ? new Date().toISOString() : null,
        retry_count: 0 // Reset retry count
      }
    }
  });
  
  // Restore service access
  await prisma.user.update({
    where: { id: currentSub.userId },
    data: {
      subscription_active: true,
      access_level: 'full'
    }
  });
  
  // Send confirmation (especially important if recovered)
  if (wasRecovered) {
    await sendEmail({
      to: currentSub.user.email,
      subject: '✅ Subscription Reactivated!',
      body: `
        Good news! Your payment was successful.
        Your subscription is now active again.
        Amount charged: ₹${payment.amount / 100}
        Next billing date: ${formatDate(subscription.current_end)}
      `
    });
  }
}
```

---

### Frontend - Payment Recovery UI

```typescript
// src/app/(dashboard)/subscription/update-payment/page.tsx

export default function UpdatePaymentPage() {
  const [loading, setLoading] = useState(false);
  const subscription = useSubscription();
  
  const handleUpdatePayment = () => {
    setLoading(true);
    
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      subscription_id: subscription.razorpay_subscription_id,
      name: 'ShopPulse',
      description: 'Update Payment Method',
      image: '/logo.png',
      
      // 🎯 Enable card change
      subscription_card_change: true,
      
      handler: async function(response: any) {
        // Verify on server
        const result = await fetch('/api/subscription/verify-payment-update', {
          method: 'POST',
          body: JSON.stringify(response)
        });
        
        if (result.ok) {
          toast.success('Payment method updated successfully!');
          router.push('/dashboard');
        } else {
          toast.error('Verification failed. Please contact support.');
        }
      },
      
      modal: {
        ondismiss: function() {
          setLoading(false);
        }
      },
      
      theme: {
        color: '#3399cc'
      }
    };
    
    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  };
  
  if (subscription.status === 'halted') {
    return (
      <Card className="border-red-500">
        <CardHeader>
          <CardTitle className="text-red-600">
            🚨 Subscription Suspended
          </CardTitle>
          <CardDescription>
            Your subscription has been suspended due to payment failure.
            Please update your payment method to restore access.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              Your payment has failed multiple times. 
              Update your payment method now to restore full access to ShopPulse.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <p><strong>Amount Due:</strong> ₹{subscription.plan_amount}</p>
            <p><strong>Failed Since:</strong> {formatDate(subscription.metadata.halted_at)}</p>
          </div>
          
          <Button 
            onClick={handleUpdatePayment} 
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? 'Opening Checkout...' : 'Update Payment Method'}
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (subscription.status === 'pending') {
    return (
      <Card className="border-yellow-500">
        <CardHeader>
          <CardTitle className="text-yellow-600">
            ⚠️ Payment Issue Detected
          </CardTitle>
          <CardDescription>
            We're having trouble charging your payment method.
            We'll retry automatically, or you can update it now.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              We'll automatically retry your payment for the next {3 - (subscription.metadata?.retry_count || 0)} days.
              You can also update your payment method now to resolve this immediately.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={handleUpdatePayment} 
            variant="outline"
            className="w-full"
          >
            Update Payment Method Now
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return null; // Active subscription, no action needed
}
```

---

### Admin Dashboard - Failed Subscriptions View

```typescript
// src/app/(dashboard)/admin/subscriptions/failed/page.tsx

export default function FailedSubscriptionsPage() {
  const [filter, setFilter] = useState<'pending' | 'halted'>('pending');
  const subscriptions = useFailedSubscriptions(filter);
  
  const sendRecoveryEmail = async (subscriptionId: string) => {
    await fetch('/api/admin/send-recovery-email', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId })
    });
    toast.success('Recovery email sent to customer');
  };
  
  const attemptManualCharge = async (subscriptionId: string) => {
    const result = await fetch('/api/admin/manual-charge', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId })
    });
    
    if (result.ok) {
      toast.success('Manual charge successful!');
    } else {
      toast.error('Manual charge failed. Customer may need to update payment method.');
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Failed Subscriptions</h1>
        
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({subscriptions.pending.length})
            </TabsTrigger>
            <TabsTrigger value="halted">
              Halted ({subscriptions.halted.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <DataTable
        columns={[
          { header: 'Subscription ID', accessor: 'razorpay_subscription_id' },
          { header: 'Customer', accessor: 'user.email' },
          { header: 'Plan', accessor: 'plan_name' },
          { header: 'Amount Due', accessor: (row) => `₹${row.plan_amount}` },
          { header: 'Failed Since', accessor: (row) => formatDate(row.metadata.failed_at) },
          { header: 'Retry Count', accessor: (row) => row.metadata.retry_count || 0 },
          {
            header: 'Actions',
            accessor: (row) => (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => sendRecoveryEmail(row.id)}
                >
                  Send Email
                </Button>
                <Button 
                  size="sm"
                  onClick={() => attemptManualCharge(row.id)}
                >
                  Manual Charge
                </Button>
              </div>
            )
          }
        ]}
        data={subscriptions[filter]}
      />
    </div>
  );
}
```

---

## Best Practices

### 1. Monitor Proactively

```typescript
// Set up alerts for failed payments
if (subscription.status === 'pending') {
  // Send internal alert after first failure
  notifyTeam('Payment failed, monitoring retries');
}

if (subscription.status === 'halted') {
  // Escalate to urgent
  notifyTeam('URGENT: Subscription halted, needs immediate attention');
}
```

### 2. Communicate Clearly

```
✅ Good: "Your payment failed due to insufficient funds. We'll retry tomorrow. Update payment method: [link]"

❌ Poor: "Payment error. Contact support."
```

### 3. Provide Easy Recovery

```typescript
// Make recovery as simple as possible
- One-click link in email
- Auto-open checkout with subscription_card_change enabled
- Show clear amount and reason
- Offer multiple payment method options
```

### 4. Balance Service Access

```typescript
// Don't immediately cut off service
PENDING: Keep service active, show warning banner
HALTED: Reduce to read-only access or grace period
After 7 days halted: Full suspension
```

---

## Related Documentation

- Part 3: [Subscriptions States](./3_RAZORPAY_SUBSCRIPTIONS_STATES.md)
- Part 6: [Manual Charge & View Details](./6_RAZORPAY_MANUAL_CHARGE_AND_VIEW.md)
- Part 8: [Pause, Resume, Cancel](./8_RAZORPAY_PAUSE_RESUME_CANCEL.md)
