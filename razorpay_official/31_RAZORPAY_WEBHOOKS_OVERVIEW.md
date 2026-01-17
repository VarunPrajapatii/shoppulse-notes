# Part 31: Subscription Webhooks - Overview & Setup

## What are Webhooks?

**Webhooks** are automated HTTP callbacks that Razorpay sends to your server when specific events occur in your subscription system. Think of them as "reverse API calls" - instead of you asking Razorpay for updates, Razorpay notifies you automatically.

### Real-World Analogy

```
Traditional API (Polling):
You: "Has anything changed?" → Razorpay: "No"
You: "Has anything changed?" → Razorpay: "No"
You: "Has anything changed?" → Razorpay: "Yes, payment successful!"

Webhooks (Push Notifications):
Razorpay: "Hey! Payment successful, here's the data."
(You receive it instantly, no need to ask repeatedly)
```

---

## Why Use Webhooks?

### Without Webhooks ❌

```typescript
// Bad approach: Polling every minute
setInterval(async () => {
  const subscription = await razorpay.subscriptions.fetch(sub_id);
  
  if (subscription.status === 'active') {
    // Update database
    // Grant access
    // Send email
  }
}, 60000); // Check every minute

// Problems:
// - 1,440 API calls per day per subscription
// - Delayed updates (up to 1 minute lag)
// - Wasted API quota
// - Server resource consumption
```

---

### With Webhooks ✅

```typescript
// Good approach: Real-time notifications
app.post('/webhooks/razorpay', async (req, res) => {
  const event = req.body;
  
  if (event.event === 'subscription.activated') {
    // Update database immediately
    // Grant access in real-time
    // Send welcome email
  }
  
  res.status(200).json({ received: true });
});

// Benefits:
// - Real-time updates (instant)
// - Zero polling overhead
// - Efficient resource usage
// - Scalable architecture
```

---

## Complete List of Subscription Webhook Events

| Event Name | Trigger | Status Change | Contains Payment? |
|------------|---------|---------------|-------------------|
| `subscription.authenticated` | First payment made (authorization) | → authenticated | Sometimes* |
| `subscription.activated` | Subscription becomes active | → active | Sometimes* |
| `subscription.charged` | Recurring payment successful | (no change) | ✅ Yes |
| `subscription.completed` | All invoices paid, subscription ends | → completed | ✅ Yes |
| `subscription.updated` | Subscription details modified | (no change) | ❌ No |
| `subscription.pending` | Payment failed, retrying | → pending | ❌ No |
| `subscription.halted` | All retries exhausted | → halted | ❌ No |
| `subscription.cancelled` | Subscription cancelled | → cancelled | ❌ No |
| `subscription.paused` | Subscription paused | → paused | ❌ No |
| `subscription.resumed` | Subscription resumed | → active | ❌ No |

**\*Payment included only if upfront amount or authorization charge was made**

---

## Webhook Payload Structure

All webhook events follow this standard structure:

```json
{
  "entity": "event",
  "account_id": "acc_F5Motm2sJ5Fomd",
  "event": "subscription.charged",
  "contains": ["subscription", "payment"],
  "payload": {
    "subscription": {
      "entity": { /* Subscription object */ }
    },
    "payment": {
      "entity": { /* Payment object (optional) */ }
    }
  },
  "created_at": 1592811255
}
```

### Key Fields Explained

| Field | Type | Description |
|-------|------|-------------|
| `entity` | string | Always `"event"` |
| `account_id` | string | Your Razorpay account ID |
| `event` | string | Event name (e.g., `subscription.charged`) |
| `contains` | array | List of entities in payload |
| `payload` | object | The actual event data |
| `created_at` | timestamp | Unix timestamp when event occurred |

---

## Subscription Lifecycle with Webhooks

```
┌─────────────────────────────────────────────────────────────┐
│                     SUBSCRIPTION LIFECYCLE                   │
└─────────────────────────────────────────────────────────────┘

1. CREATE SUBSCRIPTION
   └─> Status: created
   
2. CUSTOMER AUTHORIZES PAYMENT
   └─> subscription.authenticated ⚡
       Status: authenticated
   
3. SUBSCRIPTION STARTS
   └─> subscription.activated ⚡
       Status: active
   
4. RECURRING CHARGES
   └─> subscription.charged ⚡ (every billing cycle)
       Status: active
   
5. PAYMENT FAILURE
   └─> subscription.pending ⚡
       Status: pending (retrying)
   
   5a. RETRIES EXHAUSTED
       └─> subscription.halted ⚡
           Status: halted
   
   5b. RETRY SUCCESS
       └─> subscription.activated ⚡
           Status: active (back to step 4)

6. TEMPORARY PAUSE
   └─> subscription.paused ⚡
       Status: paused
   
   6a. RESUME
       └─> subscription.resumed ⚡
           Status: active (back to step 4)

7. MODIFICATIONS
   └─> subscription.updated ⚡
       Status: (unchanged)

8. TERMINATION
   8a. All cycles complete
       └─> subscription.completed ⚡
           Status: completed
   
   8b. Manual cancellation
       └─> subscription.cancelled ⚡
           Status: cancelled
```

---

## Setting Up Webhooks

### Step 1: Create Webhook Endpoint URL

Your server needs a public URL to receive webhooks:

```
Production: https://shoppulse.com/api/webhooks/razorpay
Development: https://abc123.ngrok.io/api/webhooks/razorpay
```

**Important**: Webhook URLs must be:
- Publicly accessible (not localhost)
- HTTPS (secure connection required)
- Return 200 status within 5 seconds

---

### Step 2: Configure Webhook on Razorpay Dashboard

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Navigate to **Settings** → **Webhooks**
3. Click **+ Add New Webhook**
4. Enter your webhook URL
5. Select events to subscribe:
   - ✅ `subscription.authenticated`
   - ✅ `subscription.activated`
   - ✅ `subscription.charged`
   - ✅ `subscription.completed`
   - ✅ `subscription.updated`
   - ✅ `subscription.pending`
   - ✅ `subscription.halted`
   - ✅ `subscription.cancelled`
   - ✅ `subscription.paused`
   - ✅ `subscription.resumed`
6. **Save Webhook Secret** (used for signature verification)

---

### Step 3: Implement Webhook Handler

```typescript
// app/api/webhooks/razorpay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    // Step 1: Get raw body and signature
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Step 2: Verify signature
    const isValid = verifyWebhookSignature(body, signature, WEBHOOK_SECRET);
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Step 3: Parse event
    const event = JSON.parse(body);
    console.log(`Received webhook: ${event.event}`);

    // Step 4: Handle event
    await handleWebhookEvent(event);

    // Step 5: Respond immediately (within 5 seconds)
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return expectedSignature === signature;
}

async function handleWebhookEvent(event: any) {
  const eventType = event.event;
  const subscription = event.payload.subscription.entity;
  const payment = event.payload.payment?.entity;

  switch (eventType) {
    case 'subscription.authenticated':
      await handleAuthenticated(subscription);
      break;
    
    case 'subscription.activated':
      await handleActivated(subscription, payment);
      break;
    
    case 'subscription.charged':
      await handleCharged(subscription, payment);
      break;
    
    case 'subscription.completed':
      await handleCompleted(subscription, payment);
      break;
    
    case 'subscription.updated':
      await handleUpdated(subscription);
      break;
    
    case 'subscription.pending':
      await handlePending(subscription);
      break;
    
    case 'subscription.halted':
      await handleHalted(subscription);
      break;
    
    case 'subscription.cancelled':
      await handleCancelled(subscription);
      break;
    
    case 'subscription.paused':
      await handlePaused(subscription);
      break;
    
    case 'subscription.resumed':
      await handleResumed(subscription);
      break;
    
    default:
      console.log(`Unhandled event: ${eventType}`);
  }
}
```

---

## Webhook Security Best Practices

### 1. **Always Verify Signature**

```typescript
// ❌ INSECURE: No verification
app.post('/webhooks', (req, res) => {
  const event = req.body;
  // Anyone can send fake webhooks!
  handleEvent(event);
});

// ✅ SECURE: Signature verification
app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const isValid = verifySignature(req.body, signature);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  handleEvent(req.body);
});
```

---

### 2. **Use Raw Request Body**

```typescript
// ❌ WRONG: Parsed body (signature will fail)
app.use(express.json()); // Middleware parses body
app.post('/webhooks', (req, res) => {
  const body = JSON.stringify(req.body); // Modified body
  verifySignature(body, signature); // ❌ Will fail
});

// ✅ CORRECT: Raw body for signature verification
app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const rawBody = req.body.toString(); // Original raw body
  verifySignature(rawBody, signature); // ✅ Will succeed
});
```

---

### 3. **Handle Idempotency**

Razorpay may send the same webhook multiple times. Use `event.created_at` or `payment.id` to detect duplicates:

```typescript
async function handleCharged(subscription: any, payment: any) {
  // Check if already processed
  const exists = await prisma.payment.findUnique({
    where: { razorpayPaymentId: payment.id }
  });

  if (exists) {
    console.log(`Payment ${payment.id} already processed, skipping`);
    return; // Idempotent - no duplicate processing
  }

  // Process payment
  await prisma.payment.create({
    data: {
      razorpayPaymentId: payment.id,
      amount: payment.amount,
      status: payment.status
    }
  });
}
```

---

### 4. **Respond Quickly (< 5 seconds)**

```typescript
// ❌ BAD: Slow processing blocks response
app.post('/webhooks', async (req, res) => {
  await handleEvent(req.body); // May take 30 seconds
  res.status(200).json({ received: true }); // Timeout!
});

// ✅ GOOD: Respond immediately, process async
app.post('/webhooks', async (req, res) => {
  // Respond immediately
  res.status(200).json({ received: true });
  
  // Process asynchronously
  handleEvent(req.body).catch(console.error);
});
```

---

## Testing Webhooks

### Local Development with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js server
npm run dev  # Running on localhost:3000

# Create tunnel
ngrok http 3000

# Output:
# Forwarding: https://abc123.ngrok.io -> http://localhost:3000

# Use webhook URL: https://abc123.ngrok.io/api/webhooks/razorpay
```

---

### Manual Testing with cURL

```bash
# Test webhook endpoint
curl -X POST https://your-domain.com/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: test_signature" \
  -d '{
    "entity": "event",
    "event": "subscription.charged",
    "payload": {
      "subscription": {
        "entity": {
          "id": "sub_test123",
          "status": "active"
        }
      }
    }
  }'
```

---

## Common Webhook Errors

### Error 1: Signature Verification Failed

**Cause**: Using parsed body instead of raw body

**Solution**:
```typescript
// Next.js: Disable body parsing for webhook route
export const config = {
  api: {
    bodyParser: false
  }
};
```

---

### Error 2: Timeout (No Response)

**Cause**: Processing takes too long (> 5 seconds)

**Solution**:
```typescript
// Respond immediately, process async
res.status(200).json({ received: true });
setImmediate(() => handleEvent(event));
```

---

### Error 3: Webhook URL Not Accessible

**Cause**: Firewall blocking Razorpay's IP, or localhost URL

**Solution**:
- Use public HTTPS URL
- Whitelist Razorpay IPs (if needed)
- Use ngrok for local testing

---

## Related Documentation

- **Part 32**: Webhook Events - Authentication & Activation
- **Part 33**: Webhook Events - Charges & Completion
- **Part 34**: Webhook Events - Updates & State Changes
- **Part 35**: Webhook Events - Pause, Resume & Cancellation
- **Part 36**: Webhook Implementation Examples

---

## Summary

**Webhooks** enable real-time subscription management:

1. **10 Events Available**: Cover entire subscription lifecycle
2. **Push Notifications**: Razorpay sends updates to your server automatically
3. **Security Required**: Signature verification mandatory
4. **Idempotent Handling**: Process each event only once
5. **Quick Response**: Return 200 status within 5 seconds

**Key Webhook Events**:
- `subscription.authenticated`: First payment made
- `subscription.activated`: Subscription starts
- `subscription.charged`: Recurring payment successful
- `subscription.pending`: Payment failed (retrying)
- `subscription.halted`: All retries failed
- `subscription.completed`: Subscription finished
- `subscription.cancelled`: Subscription terminated

**Best Practices**:
- Always verify webhook signatures
- Use raw request body for verification
- Handle duplicate events (idempotency)
- Respond within 5 seconds
- Process async for long operations

**Next**: Part 32 covers detailed webhook payloads and implementation for authentication and activation events!
