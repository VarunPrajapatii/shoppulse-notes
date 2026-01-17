# Part 4B: Shiprocket Webhooks & Tracking

## 🔔 Real-Time Status Updates via Webhooks

This document covers how to receive and process real-time shipping updates from Shiprocket using webhooks.

---

## Table of Contents

1. [Understanding Webhooks](#understanding-webhooks)
2. [Webhook Configuration](#webhook-configuration)
3. [Webhook Events](#webhook-events)
4. [Implementing Webhook Handler](#implementing-webhook-handler)
5. [Status Code Mapping](#status-code-mapping)
6. [NDR (Non-Delivery Report) Handling](#ndr-handling)
7. [Tracking API (Polling Fallback)](#tracking-api)
8. [Customer Tracking Page](#customer-tracking-page)
9. [Testing & Debugging](#testing-debugging)

---

## Understanding Webhooks

### Push vs Pull: Why Webhooks Matter

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              WEBHOOKS vs POLLING                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  POLLING (Pull):                                                            │
│  ───────────────                                                            │
│                                                                              │
│  Every 30 minutes:                                                          │
│  ShopPulse → "Any updates?" → Shiprocket                                    │
│  ShopPulse ← "No"           ← Shiprocket                                    │
│                                                                              │
│  ShopPulse → "Any updates?" → Shiprocket                                    │
│  ShopPulse ← "No"           ← Shiprocket                                    │
│                                                                              │
│  ShopPulse → "Any updates?" → Shiprocket                                    │
│  ShopPulse ← "Yes, delivered!"← Shiprocket                                  │
│                                                                              │
│  Problems:                                                                   │
│  ❌ Wasted API calls (most return "no updates")                             │
│  ❌ Not real-time (delay between checks)                                    │
│  ❌ Rate limits apply                                                        │
│  ❌ Scales poorly (100 orders = 100 checks)                                 │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  WEBHOOKS (Push):                                                           │
│  ─────────────────                                                          │
│                                                                              │
│  When status changes:                                                       │
│  Shiprocket → "Status changed!" → ShopPulse                                │
│  ShopPulse  ← Instantly knows   ←                                          │
│                                                                              │
│  Benefits:                                                                   │
│  ✅ Real-time updates                                                        │
│  ✅ No wasted API calls                                                      │
│  ✅ No rate limit concerns                                                   │
│  ✅ Scales to any volume                                                     │
│  ✅ Immediate customer notifications                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### How Webhooks Work

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              WEBHOOK FLOW                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. SETUP (One-time)                                                        │
│  ───────────────────                                                        │
│  Register your webhook URL in Shiprocket dashboard:                         │
│  https://yourdomain.com/api/webhooks/shiprocket                            │
│                                                                              │
│  2. EVENT OCCURS                                                            │
│  ─────────────────                                                          │
│  Courier scans package → Status: "Out for Delivery"                         │
│                                                                              │
│  3. SHIPROCKET SENDS WEBHOOK                                                │
│  ───────────────────────────                                                │
│  POST https://yourdomain.com/api/webhooks/shiprocket                       │
│  Body: { awb: "123", status: "OUT_FOR_DELIVERY", ... }                     │
│                                                                              │
│  4. YOUR SERVER PROCESSES                                                   │
│  ─────────────────────────                                                  │
│  • Verify webhook authenticity                                              │
│  • Find matching order                                                       │
│  • Update order status                                                       │
│  • Trigger notifications                                                     │
│                                                                              │
│  5. RESPOND QUICKLY                                                         │
│  ───────────────────                                                        │
│  Return HTTP 200 within 5 seconds                                           │
│  (Process async if complex)                                                 │
│                                                                              │
│                                                                              │
│  Timeline:                                                                   │
│  ─────────                                                                   │
│  T+0:    Delivery boy scans package                                         │
│  T+1s:   Shiprocket receives scan data                                      │
│  T+2s:   Shiprocket sends webhook                                           │
│  T+3s:   ShopPulse receives & processes                                     │
│  T+4s:   Customer gets SMS/email notification                               │
│                                                                              │
│  Total: ~4 seconds from scan to customer notification!                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Webhook Configuration

### Setting Up Webhooks in Shiprocket

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              SHIPROCKET WEBHOOK SETUP                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: Access Webhook Settings                                            │
│  ─────────────────────────────────                                          │
│  Shiprocket Dashboard → Settings → Webhooks                                 │
│                                                                              │
│  STEP 2: Add Webhook URL                                                    │
│  ────────────────────────                                                   │
│  URL: https://shoppulse.com/api/webhooks/shiprocket                        │
│                                                                              │
│  Requirements:                                                               │
│  • Must be HTTPS (HTTP not allowed)                                         │
│  • Must be publicly accessible                                              │
│  • Should respond within 5 seconds                                          │
│  • Return HTTP 200 for success                                              │
│                                                                              │
│  STEP 3: Select Events                                                      │
│  ────────────────────────                                                   │
│  ☑ Order Status Updates (RECOMMENDED)                                       │
│  ☑ Shipment Status Updates                                                  │
│  ☑ NDR Updates                                                              │
│  ☑ Pickup Updates                                                           │
│  ☐ Invoice Generated (optional)                                             │
│  ☐ Weight Discrepancy (optional)                                            │
│                                                                              │
│  STEP 4: Test Webhook                                                       │
│  ────────────────────                                                        │
│  Click "Test" to send sample payload                                        │
│  Verify your server receives and responds 200                               │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  FOR SHOPPULSE (Multi-tenant):                                              │
│  ─────────────────────────────                                              │
│  Challenge: Each store owner has their own Shiprocket account               │
│  Solution: Include storeId in webhook URL or order_id                       │
│                                                                              │
│  Option A: Store-specific webhook URL (Complex)                             │
│  https://shoppulse.com/api/webhooks/shiprocket?storeId=STORE123            │
│                                                                              │
│  Option B: Use order_id to identify store (Recommended)                     │
│  Order ID format: STORE123-ORD-456                                          │
│  Parse storeId from order_id in webhook                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Webhook Authentication

```
SHIPROCKET WEBHOOK SECURITY:
────────────────────────────

Unfortunately, Shiprocket doesn't send signatures by default.

MITIGATION STRATEGIES:

1. IP WHITELISTING (Basic)
   Only accept webhooks from Shiprocket IPs
   Problem: IPs can change
   
2. SECRET TOKEN IN URL (Better)
   https://yourdomain.com/api/webhooks/shiprocket?secret=YOUR_SECRET
   Validate secret in handler
<!-- NOTE: we will use this -->

3. VERIFY ORDER EXISTS (Must Do)
   Always check if AWB/Order exists in your database
   Reject unknown orders

4. IDEMPOTENCY (Must Do)
   Same webhook may arrive multiple times
   Use awb + status + timestamp as idempotency key
   Don't duplicate notifications


IMPLEMENTATION:

async function handleShiprocketWebhook(req: Request) {
  // 1. Check secret (if using URL secret)
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.SHIPROCKET_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // 2. Parse body
  const payload = await req.json();
  
  // 3. Verify order exists
  const order = await prisma.order.findFirst({
    where: { awbCode: payload.awb }
  });
  
  if (!order) {
    // Unknown AWB - might be from different system
    return new Response('Unknown order', { status: 200 });
  }
  
  // 4. Check idempotency
  const existing = await prisma.shipmentEvent.findFirst({
    where: {
      awbCode: payload.awb,
      status: payload.current_status,
      eventTime: new Date(payload.etd)
    }
  });
  
  if (existing) {
    // Already processed
    return new Response('OK', { status: 200 });
  }
  
  // 5. Process...
}
```

---

## Webhook Events

### Event Types and Payloads

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              SHIPROCKET WEBHOOK EVENTS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  EVENT: SHIPMENT STATUS UPDATE                                              │
│  ─────────────────────────────                                              │
│                                                                              │
│  Triggered when: Package status changes at any point                        │
│                                                                              │
│  Payload:                                                                    │
│  {                                                                           │
│    "awb": "1234567890123",                                                  │
│    "courier_name": "Delhivery",                                             │
│    "current_status": "DELIVERED",                                           │
│    "current_status_id": 7,                                                  │
│    "shipment_status": "DELIVERED",                                          │
│    "shipment_status_id": 7,                                                 │
│    "order_id": "STORE123-ORD-456",                                          │
│    "sr_order_id": 123456789,                                                │
│    "etd": "2026-01-05",                                                     │
│    "scans": [                                                                │
│      {                                                                       │
│        "location": "Mumbai Hub",                                            │
│        "date": "2026-01-05 14:30:00",                                       │
│        "status": "Delivered",                                                │
│        "activity": "Delivered to customer - Received by: RAHUL",            │
│        "sr_status": "DELIVERED",                                            │
│        "sr_status_label": "Delivered"                                       │
│      }                                                                       │
│    ],                                                                        │
│    "delivered_date": "2026-01-05 14:30:00",                                 │
│    "pod": {                                                                  │
│      "type": "signature",                                                    │
│      "link": "https://s3.amazonaws.com/pod/..."                             │
│    }                                                                         │
│  }                                                                           │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  EVENT: NDR (Non-Delivery Report)                                           │
│  ─────────────────────────────────                                          │
│                                                                              │
│  Triggered when: Delivery attempt fails                                     │
│                                                                              │
│  Payload:                                                                    │
│  {                                                                           │
│    "awb": "1234567890123",                                                  │
│    "current_status": "NDR",                                                 │
│    "ndr_status_code": 1,                                                    │
│    "ndr_reason": "Customer not available",                                  │
│    "ndr_details": {                                                         │
│      "attempt_count": 1,                                                    │
│      "next_attempt_date": "2026-01-06",                                     │
│      "action_required": true,                                               │
│      "customer_phone": "9876543210",                                        │
│      "address": "123, ABC Apartments, Mumbai"                               │
│    }                                                                         │
│  }                                                                           │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  EVENT: PICKUP UPDATE                                                       │
│  ────────────────────                                                        │
│                                                                              │
│  Triggered when: Pickup status changes                                      │
│                                                                              │
│  Payload:                                                                    │
│  {                                                                           │
│    "pickup_id": "PKP123456",                                                │
│    "status": "COMPLETED",                                                   │
│    "pickup_date": "2026-01-02 11:30:00",                                    │
│    "packages_picked": 5,                                                    │
│    "packages_list": [                                                       │
│      { "awb": "1234567890123", "order_id": "STORE123-ORD-456" },           │
│      { "awb": "1234567890124", "order_id": "STORE123-ORD-457" }            │
│    ]                                                                         │
│  }                                                                           │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  EVENT: RTO INITIATED                                                       │
│  ────────────────────                                                        │
│                                                                              │
│  Triggered when: Package being returned to seller                           │
│                                                                              │
│  Payload:                                                                    │
│  {                                                                           │
│    "awb": "1234567890123",                                                  │
│    "current_status": "RTO_INITIATED",                                       │
│    "rto_reason": "Customer refused delivery",                               │
│    "rto_awb": "9876543210123",  // New AWB for return journey              │
│    "expected_rto_date": "2026-01-10"                                        │
│  }                                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementing Webhook Handler

### Complete Webhook API Route

```typescript
// src/app/api/webhooks/shiprocket/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Status mapping (Shiprocket → ShopPulse)
const STATUS_MAP: Record<string, string> = {
  'PICKUP_PENDING': 'PROCESSING',
  'PICKUP_SCHEDULED': 'PROCESSING',
  'PICKED_UP': 'SHIPPED',
  'IN_TRANSIT': 'SHIPPED',
  'OUT_FOR_DELIVERY': 'SHIPPED', // Or create new status
  'DELIVERED': 'DELIVERED',
  'RTO_INITIATED': 'RTO_IN_TRANSIT',
  'RTO_DELIVERED': 'RTO_DELIVERED',
  'CANCELLED': 'CANCELLED',
  'NDR': 'SHIPPED' // Still shipped, but needs attention
};

// Actions to take for each status
async function handleStatusChange(
  order: any,
  newStatus: string,
  payload: any
) {
  const statusActions: Record<string, () => Promise<void>> = {
    'OUT_FOR_DELIVERY': async () => {
      // Notify customer: "Your order is out for delivery!"
      await sendNotification({
        type: 'ORDER_OUT_FOR_DELIVERY',
        orderId: order.id,
        email: order.email,
        phone: order.phone,
        data: { trackingUrl: `https://shiprocket.co/tracking/${payload.awb}` }
      });
    },
    
    'DELIVERED': async () => {
      // Update order + notify
      await prisma.order.update({
        where: { id: order.id },
        data: {
          orderStatus: 'DELIVERED',
          deliveredAt: new Date(payload.delivered_date),
          podLink: payload.pod?.link
        }
      });
      
      await sendNotification({
        type: 'ORDER_DELIVERED',
        orderId: order.id,
        email: order.email,
        phone: order.phone
      });
    },
    
    'NDR': async () => {
      // Alert seller about failed delivery
      await sendNotification({
        type: 'DELIVERY_FAILED',
        orderId: order.id,
        sellerId: order.storeId,
        data: {
          reason: payload.ndr_reason,
          attemptCount: payload.ndr_details?.attempt_count,
          customerPhone: order.phone
        }
      });
      
      // Create NDR record
      await prisma.ndrRecord.create({
        data: {
          orderId: order.id,
          reason: payload.ndr_reason,
          attemptCount: payload.ndr_details?.attempt_count || 1,
          nextAttemptDate: payload.ndr_details?.next_attempt_date,
          actionRequired: true
        }
      });
    },
    
    'RTO_INITIATED': async () => {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          orderStatus: 'RTO_IN_TRANSIT',
          rtoAwb: payload.rto_awb,
          rtoInitiatedAt: new Date()
        }
      });
      
      // Alert seller
      await sendNotification({
        type: 'RTO_INITIATED',
        orderId: order.id,
        sellerId: order.storeId,
        data: { reason: payload.rto_reason }
      });
    },
    
    'RTO_DELIVERED': async () => {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          orderStatus: 'RTO_DELIVERED',
          rtoDeliveredAt: new Date()
        }
      });
      
      // Prompt seller to initiate refund
      await sendNotification({
        type: 'RTO_COMPLETE',
        orderId: order.id,
        sellerId: order.storeId,
        data: { actionRequired: 'Process refund' }
      });
    }
  };
  
  const action = statusActions[newStatus];
  if (action) {
    await action();
  }
}

export async function POST(req: Request) {
  try {
    // 1. Validate secret
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');
    
    if (secret !== process.env.SHIPROCKET_WEBHOOK_SECRET) {
      console.error('Invalid webhook secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 2. Parse payload
    const payload = await req.json();
    
    console.log('Shiprocket webhook received:', JSON.stringify(payload, null, 2));
    
    // 3. Find order by AWB
    const order = await prisma.order.findFirst({
      where: { awbCode: payload.awb },
      include: { store: true }
    });
    
    if (!order) {
      console.warn(`Order not found for AWB: ${payload.awb}`);
      // Still return 200 to prevent retries
      return NextResponse.json({ received: true, processed: false });
    }
    
    // 4. Check idempotency
    const eventKey = `${payload.awb}-${payload.current_status}-${payload.scans?.[0]?.date}`;
    const existingEvent = await prisma.shipmentEvent.findUnique({
      where: { eventKey }
    });
    
    if (existingEvent) {
      console.log(`Duplicate event ignored: ${eventKey}`);
      return NextResponse.json({ received: true, duplicate: true });
    }
    
    // 5. Store event for audit trail
    await prisma.shipmentEvent.create({
      data: {
        eventKey,
        orderId: order.id,
        awbCode: payload.awb,
        status: payload.current_status,
        statusCode: payload.current_status_id,
        location: payload.scans?.[0]?.location,
        activity: payload.scans?.[0]?.activity,
        eventTime: payload.scans?.[0]?.date ? new Date(payload.scans[0].date) : new Date(),
        rawPayload: JSON.stringify(payload)
      }
    });
    
    // 6. Map and update status
    const mappedStatus = STATUS_MAP[payload.current_status];
    
    if (mappedStatus && mappedStatus !== order.orderStatus) {
      await prisma.order.update({
        where: { id: order.id },
        data: { orderStatus: mappedStatus }
      });
    }
    
    // 7. Handle specific status actions
    await handleStatusChange(order, payload.current_status, payload);
    
    // 8. Return success quickly
    return NextResponse.json({ 
      received: true, 
      processed: true,
      orderId: order.id 
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 even on error to prevent infinite retries
    // Log error for investigation
    return NextResponse.json({ 
      received: true, 
      error: 'Processing failed',
      message: error.message 
    });
  }
}

// Disable body parsing (we handle JSON ourselves)
export const config = {
  api: {
    bodyParser: true,
  },
};
```

### Notification Helper

```typescript
// src/lib/notifications.ts

interface NotificationData {
  type: string;
  orderId: string;
  email?: string;
  phone?: string;
  sellerId?: string;
  data?: Record<string, any>;
}

export async function sendNotification(notification: NotificationData) {
  const templates = {
    ORDER_OUT_FOR_DELIVERY: {
      email: {
        subject: '🚚 Your order is out for delivery!',
        body: 'Your order is out for delivery and will arrive today.'
      },
      sms: 'Your order is out for delivery! Track: {{trackingUrl}}'
    },
    ORDER_DELIVERED: {
      email: {
        subject: '✅ Your order has been delivered!',
        body: 'Your order has been delivered. Enjoy!'
      },
      sms: 'Your order has been delivered! Thank you for shopping with us.'
    },
    DELIVERY_FAILED: {
      email: {
        subject: '⚠️ Delivery attempt failed',
        body: 'Delivery attempted but unsuccessful. Please check.'
      },
      // For seller dashboard notification
      dashboard: true
    },
    RTO_INITIATED: {
      dashboard: true,
      sellerEmail: {
        subject: '📦 Order returning to you',
        body: 'Order is being returned. Reason: {{reason}}'
      }
    }
  };
  
  const template = templates[notification.type];
  if (!template) return;
  
  // Send customer notifications
  if (notification.email && template.email) {
    await sendEmail({
      to: notification.email,
      subject: template.email.subject,
      body: replaceVars(template.email.body, notification.data)
    });
  }
  
  if (notification.phone && template.sms) {
    await sendSMS({
      to: notification.phone,
      message: replaceVars(template.sms, notification.data)
    });
  }
  
  // Send seller notifications
  if (notification.sellerId && template.dashboard) {
    await createDashboardAlert({
      storeId: notification.sellerId,
      type: notification.type,
      orderId: notification.orderId,
      data: notification.data
    });
  }
}
```

---

## Status Code Mapping

### Complete Status Reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              SHIPROCKET STATUS CODES → SHOPPULSE MAPPING                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Shiprocket          │ Code │ ShopPulse        │ Customer Message           │
│  ────────────────────│──────│──────────────────│────────────────────────────│
│                      │      │                  │                            │
│  PICKUP_PENDING      │  1   │ PROCESSING       │ Order is being prepared    │
│  PICKUP_SCHEDULED    │  2   │ PROCESSING       │ Pickup scheduled           │
│  PICKUP_GENERATED    │  3   │ PROCESSING       │ Ready for pickup           │
│  PICKUP_QUEUED       │  17  │ PROCESSING       │ Awaiting pickup            │
│  PICKED_UP           │  4   │ SHIPPED          │ Order picked up            │
│  IN_TRANSIT          │  5   │ SHIPPED          │ In transit                 │
│  REACHED_DEST_HUB    │  18  │ SHIPPED          │ Arrived at local hub       │
│  OUT_FOR_DELIVERY    │  6   │ SHIPPED          │ Out for delivery today     │
│  DELIVERED           │  7   │ DELIVERED        │ Delivered                  │
│  CANCELLED           │  8   │ CANCELLED        │ Order cancelled            │
│  RTO_INITIATED       │  9   │ RTO_IN_TRANSIT   │ Returning to seller        │
│  RTO_IN_TRANSIT      │  10  │ RTO_IN_TRANSIT   │ Return in progress         │
│  RTO_DELIVERED       │  11  │ RTO_DELIVERED    │ Returned to seller         │
│  LOST                │  12  │ SHIPPED (flag)   │ Package lost - refund      │
│  DAMAGED             │  13  │ SHIPPED (flag)   │ Package damaged            │
│  UNDELIVERED         │  14  │ SHIPPED          │ Delivery unsuccessful      │
│  NDR                 │  15  │ SHIPPED (NDR)    │ Delivery attempted         │
│  QC_FAILED           │  16  │ RTO_IN_TRANSIT   │ Quality check failed       │
│                      │      │                  │                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  RECOMMENDED SHOPPULSE STATUS FLOW:                                         │
│  ───────────────────────────────────                                        │
│                                                                              │
│  PAID → PROCESSING → SHIPPED → DELIVERED                                    │
│                          │                                                   │
│                          ├──→ RTO_IN_TRANSIT → RTO_DELIVERED → REFUNDED     │
│                          │                                                   │
│                          └──→ NDR (special handling)                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Status Flow Visualization

```
NORMAL DELIVERY FLOW:
─────────────────────

       ┌──────────┐
       │  PAID    │
       └────┬─────┘
            │ Seller clicks "Ship"
            ▼
       ┌───────────────┐
       │  PROCESSING   │ ◄── Shiprocket: PICKUP_PENDING, PICKUP_SCHEDULED
       └───────┬───────┘
               │ Courier picks up
               ▼
       ┌───────────────┐
       │   SHIPPED     │ ◄── Shiprocket: PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY
       └───────┬───────┘
               │ Customer receives
               ▼
       ┌───────────────┐
       │  DELIVERED    │ ◄── Shiprocket: DELIVERED
       └───────────────┘


FAILED DELIVERY / RTO FLOW:
───────────────────────────

       ┌───────────────┐
       │   SHIPPED     │
       └───────┬───────┘
               │ Delivery fails (NDR)
               ▼
       ┌───────────────┐
       │   NDR State   │ ◄── Attempt 1, 2, 3...
       │   (SHIPPED)   │     Action needed from seller/customer
       └───────┬───────┘
               │ All attempts fail OR customer refuses
               ▼
       ┌───────────────┐
       │ RTO_IN_TRANSIT│ ◄── Package returning to seller
       └───────┬───────┘
               │ Seller receives
               ▼
       ┌───────────────┐
       │ RTO_DELIVERED │ ◄── Seller has package back
       └───────┬───────┘
               │ Seller processes refund
               ▼
       ┌───────────────┐
       │   REFUNDED    │
       └───────────────┘
```

---

## NDR Handling

### What is NDR?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              NDR (NON-DELIVERY REPORT) HANDLING                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WHAT IS NDR?                                                               │
│  ────────────                                                               │
│  When courier attempts delivery but fails, an NDR is generated              │
│  This requires action within 24-48 hours or package goes RTO                │
│                                                                              │
│  COMMON NDR REASONS:                                                        │
│  ───────────────────                                                        │
│  1. Customer not available                                                  │
│  2. Phone not reachable                                                     │
│  3. Address incomplete/incorrect                                            │
│  4. Customer refused delivery                                               │
│  5. Customer wants open delivery (not allowed)                              │
│  6. COD amount not ready                                                    │
│  7. Premises closed                                                         │
│                                                                              │
│  NDR WORKFLOW:                                                              │
│  ─────────────                                                              │
│                                                                              │
│    Delivery Fails                                                           │
│         │                                                                    │
│         ▼                                                                    │
│   ┌───────────────────────────────────────────────────────┐                │
│   │  SHIPROCKET SENDS NDR WEBHOOK                          │                │
│   │  Reason: "Customer not available"                      │                │
│   │  Attempt: 1 of 3                                       │                │
│   └───────────────────────────────────────────────────────┘                │
│         │                                                                    │
│         ▼                                                                    │
│   ┌───────────────────────────────────────────────────────┐                │
│   │  SHOPPULSE CREATES ALERT FOR SELLER                    │                │
│   │  "Delivery failed - Action required within 24 hours"   │                │
│   └───────────────────────────────────────────────────────┘                │
│         │                                                                    │
│         ▼                                                                    │
│   ┌───────────────────────────────────────────────────────┐                │
│   │  SELLER ACTIONS (choose one):                          │                │
│   │  • Reschedule delivery (different date/time)           │                │
│   │  • Update address (if incorrect)                       │                │
│   │  • Contact customer to confirm                         │                │
│   │  • Accept RTO (give up on delivery)                    │                │
│   └───────────────────────────────────────────────────────┘                │
│         │                                                                    │
│         ▼                                                                    │
│   If no action taken in 48 hours → Automatic RTO                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### NDR Dashboard UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📦 ORDERS REQUIRING ATTENTION                                     3 items  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ⚠️ Order #ORD-12345                                                │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  Status: DELIVERY FAILED (Attempt 1 of 3)                           │   │
│  │  Reason: Customer not available                                      │   │
│  │  Time remaining: 18 hours                                            │   │
│  │                                                                      │   │
│  │  Customer: Rahul Sharma | 📱 9876543210                             │   │
│  │  Address: 123 ABC Apts, Sector 15, Noida - 201301                   │   │
│  │                                                                      │   │
│  │  [📞 Call Customer]  [📅 Reschedule]  [✏️ Update Address]  [↩️ RTO] │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### NDR API Integration

```typescript
// Reschedule delivery via Shiprocket
async function rescheduleDelivery(
  storeId: string,
  awb: string,
  newDate: string,
  newAddress?: string
) {
  const token = await getShiprocketToken(storeId);
  
  const payload: any = {
    awb_code: awb,
    action: 'reschedule',
    reschedule_date: newDate // Format: YYYY-MM-DD
  };
  
  if (newAddress) {
    payload.action = 'address_update';
    payload.address = newAddress;
  }
  
  const response = await fetch(
    'https://apiv2.shiprocket.in/v1/external/ndr/update',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }
  );
  
  return response.json();
}

// Initiate RTO (give up on delivery)
async function initiateRTO(storeId: string, awb: string) {
  const token = await getShiprocketToken(storeId);
  
  const response = await fetch(
    'https://apiv2.shiprocket.in/v1/external/ndr/update',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        awb_code: awb,
        action: 'rto'
      })
    }
  );
  
  return response.json();
}
```

---

## Tracking API

### Polling as Fallback

```
WHEN TO USE POLLING:
────────────────────
• Webhooks not configured
• Webhook delivery failed
• On-demand tracking refresh
• Displaying real-time tracking page


TRACKING API:
─────────────

Endpoint: GET /courier/track/awb/{awb_code}

Response:
{
  "tracking_data": {
    "track_status": 1,
    "shipment_status": 7,
    "shipment_status_text": "DELIVERED",
    "track_url": "https://shiprocket.co/tracking/1234567890123",
    "etd": "2026-01-05",
    "qc_response": null,
    "shipment_track": [
      {
        "id": 123,
        "date": "2026-01-05 14:30:00",
        "status": "DELIVERED",
        "activity": "Delivered to customer",
        "location": "Mumbai"
      },
      {
        "date": "2026-01-05 09:00:00",
        "status": "OUT_FOR_DELIVERY",
        "activity": "Out for delivery",
        "location": "Mumbai Hub"
      },
      {
        "date": "2026-01-04 18:00:00",
        "status": "IN_TRANSIT",
        "activity": "Arrived at destination hub",
        "location": "Mumbai Hub"
      }
      // ... more events
    ],
    "shipment_track_activities": [...],  // Detailed activity list
    "delivered_date": "2026-01-05 14:30:00"
  }
}
```

### Implementation

```typescript
async function getTrackingDetails(
  storeId: string,
  awb: string
): Promise<TrackingDetails> {
  const token = await getShiprocketToken(storeId);
  
  const response = await fetch(
    `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const data = await response.json();
  
  if (data.tracking_data.track_status !== 1) {
    throw new Error('Tracking information not available');
  }
  
  return {
    status: data.tracking_data.shipment_status_text,
    estimatedDelivery: data.tracking_data.etd,
    trackingUrl: data.tracking_data.track_url,
    events: data.tracking_data.shipment_track.map(event => ({
      date: new Date(event.date),
      status: event.status,
      description: event.activity,
      location: event.location
    }))
  };
}
```

---

## Customer Tracking Page

### Public Tracking Page Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                        TRACK YOUR ORDER                                     │
│                                                                              │
│  Order #: ORD-12345                                                         │
│  Tracking #: 1234567890123 (Delhivery)                                      │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│                    ✅ DELIVERED                                             │
│               Delivered on Jan 5, 2026 at 2:30 PM                          │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  SHIPMENT PROGRESS:                                                         │
│                                                                              │
│    ✅ ─────────────────────────────────────────────────────────────► 100%   │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  TRACKING HISTORY:                                                          │
│                                                                              │
│  ● Jan 5, 2026 - 2:30 PM                                                   │
│    DELIVERED                                                                │
│    Delivered to customer - Received by: RAHUL                               │
│    📍 Mumbai                                                                │
│                                                                              │
│  ○ Jan 5, 2026 - 9:00 AM                                                   │
│    OUT FOR DELIVERY                                                         │
│    Package out for delivery                                                  │
│    📍 Mumbai Hub                                                            │
│                                                                              │
│  ○ Jan 4, 2026 - 6:00 PM                                                   │
│    ARRIVED AT HUB                                                           │
│    Arrived at destination city                                              │
│    📍 Mumbai Hub                                                            │
│                                                                              │
│  ○ Jan 3, 2026 - 10:00 AM                                                  │
│    IN TRANSIT                                                               │
│    Shipment in transit to Mumbai                                            │
│    📍 Delhi Hub                                                             │
│                                                                              │
│  ○ Jan 2, 2026 - 11:00 AM                                                  │
│    PICKED UP                                                                │
│    Shipment picked up from seller                                           │
│    📍 Delhi                                                                 │
│                                                                              │
│  ○ Jan 1, 2026 - 10:30 AM                                                  │
│    ORDER PLACED                                                             │
│    Order confirmed and payment received                                     │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Need help? Contact support@mystore.com                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tracking Page Implementation

```typescript
// src/app/track/[orderId]/page.tsx

import { getTrackingDetails } from '@/lib/shipping';

interface Props {
  params: { orderId: string };
}

export default async function TrackingPage({ params }: Props) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { 
      store: true,
      shipmentEvents: { orderBy: { eventTime: 'desc' } }
    }
  });
  
  if (!order) {
    return <NotFound />;
  }
  
  // Get latest tracking from Shiprocket (optional refresh)
  let liveTracking = null;
  if (order.awbCode) {
    try {
      liveTracking = await getTrackingDetails(order.storeId, order.awbCode);
    } catch (e) {
      // Fall back to stored events
    }
  }
  
  const events = liveTracking?.events || order.shipmentEvents.map(e => ({
    date: e.eventTime,
    status: e.status,
    description: e.activity,
    location: e.location
  }));
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Track Your Order</h1>
      
      <div className="mt-4 p-4 bg-gray-50 rounded">
        <p>Order #: {order.orderNumber}</p>
        <p>Tracking #: {order.awbCode} ({order.courierName})</p>
      </div>
      
      <div className="mt-6">
        <StatusBadge status={order.orderStatus} />
      </div>
      
      <div className="mt-8">
        <h2 className="font-semibold">Tracking History</h2>
        <TrackingTimeline events={events} />
      </div>
    </div>
  );
}
```

---

## Testing & Debugging

### Testing Webhooks Locally

```
CHALLENGE: Shiprocket needs public URL, but you're developing locally

SOLUTIONS:
──────────

1. NGROK (Recommended for dev)
   ────────────────────────────
   $ ngrok http 3000
   
   Gives you: https://abc123.ngrok.io
   
   Set webhook URL: https://abc123.ngrok.io/api/webhooks/shiprocket?secret=xxx
   
   
2. SHIPROCKET SANDBOX
   ─────────────────────
   Shiprocket provides test mode
   Use test credentials
   Simulate different statuses
   
   
3. MANUAL TESTING
   ───────────────
   Create a test endpoint that simulates webhook payloads:
   
   // scripts/test-webhook.ts
   const testPayload = {
     awb: "TEST123",
     current_status: "DELIVERED",
     // ... rest of payload
   };
   
   await fetch('http://localhost:3000/api/webhooks/shiprocket?secret=xxx', {
     method: 'POST',
     body: JSON.stringify(testPayload)
   });
```

### Debugging Checklist

```
WEBHOOK NOT RECEIVING:
──────────────────────
☐ Is URL correct in Shiprocket dashboard?
☐ Is URL publicly accessible (not localhost)?
☐ Is HTTPS enabled?
☐ Is route responding to POST?
☐ Check Shiprocket webhook logs

WEBHOOK RECEIVED BUT NOT PROCESSING:
────────────────────────────────────
☐ Check server logs
☐ Is secret validation failing?
☐ Is order found for AWB?
☐ Is idempotency check rejecting duplicate?
☐ Is status mapping correct?

STATUS NOT UPDATING:
────────────────────
☐ Is webhook handler completing?
☐ Is database update succeeding?
☐ Is status in mapping table?
☐ Check for errors in catch block

NOTIFICATIONS NOT SENDING:
──────────────────────────
☐ Is notification service configured?
☐ Is customer email/phone valid?
☐ Check notification logs
☐ Is template for status defined?
```

---

## Summary

### Webhook Architecture

```
                    Courier Scan
                         │
                         ▼
                    Shiprocket
                         │
                         │ Webhook POST
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  ShopPulse Webhook Handler                                       │
│  /api/webhooks/shiprocket                                       │
│                                                                  │
│  1. Validate secret ─────────────────────► Return 401 if invalid │
│  2. Find order by AWB ───────────────────► Return 200 if unknown │
│  3. Check idempotency ───────────────────► Skip if duplicate     │
│  4. Store event ─────────────────────────► Audit trail           │
│  5. Update status ───────────────────────► DB update             │
│  6. Trigger actions ─────────────────────► Notifications         │
│  7. Return 200 ──────────────────────────► Acknowledge receipt   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Customer Notified   │
              │  Dashboard Updated   │
              │  Seller Alerted      │
              └──────────────────────┘
```

### Key Takeaways

1. **Webhooks are essential** for real-time tracking
2. **Idempotency** prevents duplicate processing
3. **NDR handling** is critical for delivery success
4. **Status mapping** connects Shiprocket to ShopPulse states
5. **Notifications** keep all parties informed
6. **Audit trail** helps debugging and disputes

---

## Next Document

**Part 5** covers:
- Returns and reverse logistics
- RTO processing
- Customer-initiated returns
- Refund workflow

---

## References

- [Shiprocket Webhooks Guide](https://apidocs.shiprocket.in/#webhooks)
- [Status Codes Reference](https://apidocs.shiprocket.in/#status-codes)
- [NDR Management](https://apidocs.shiprocket.in/#ndr)
