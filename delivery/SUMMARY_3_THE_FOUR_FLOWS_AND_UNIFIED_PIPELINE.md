# SUMMARY Part 3: The Four Shipment Flows & Unified Pipeline

## Purpose
This document explains how the four shipment creation flows work end-to-end, focusing on the unified pickup pipeline concept. No code - just flow diagrams and decision points.

---

## 🎯 Overview: The Four Ways to Ship

```
┌────────────────────────────────────────────────────────────────────────┐
│                    SHIPMENT CREATION OPTIONS                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1️⃣  ONE-CLICK SHIP                                                    │
│     Who: Seller                                                        │
│     When: Individual order ready to ship                               │
│     Time: 30 seconds per order                                         │
│     Control: High (seller reviews and approves)                        │
│                                                                         │
│  2️⃣  BATCH SHIP                                                        │
│     Who: Seller                                                        │
│     When: Multiple orders ready at once                                │
│     Time: 2 minutes for 20 orders                                      │
│     Control: High (bulk but reviewed)                                  │
│                                                                         │
│  3️⃣  AUTO-SHIP                                                         │
│     Who: System (automated)                                            │
│     When: After payment success (30 min delay)                         │
│     Time: 0 (no seller interaction)                                    │
│     Control: Low (fully automated)                                     │
│                                                                         │
│  4️⃣  MANUAL SHIP                                                       │
│     Who: Seller                                                        │
│     When: Using Speed Post or self-delivery                            │
│     Time: 1 minute per order                                           │
│     Control: Complete (seller has AWB already)                         │
│                                                                         │
│  ══════════════════════════════════════════════════════════════════    │
│                                                                         │
│  ALL FOUR FLOWS CONVERGE:                                              │
│  → Create shipment record                                              │
│  → Add to unified pickup queue (Redis)                                 │
│  → Cron batches and schedules pickup                                   │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Flow 1: One-Click Ship (The Fast Path)

### User Journey

```
STEP 1: Seller Navigates to Order
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard → Orders → Click Order #ORD-ABC123                    │
└─────────────────────────────────────────────────────────────────┘

STEP 2: Order Detail Page
┌─────────────────────────────────────────────────────────────────┐
│ Order #ORD-ABC123                       Status: 🟢 PAID         │
├─────────────────────────────────────────────────────────────────┤
│ Customer: Rahul Sharma                                          │
│ Phone: +91 98765 43210                                          │
│ Address: 123 Green Park, Andheri West, Mumbai 400053           │
│                                                                 │
│ Items:                                                          │
│ ├─ 3× T-shirt (M) @ ₹500 = ₹1,500                             │
│ └─ 1× Jeans (32) @ ₹700 = ₹700                                │
│                                                                 │
│ Total: ₹2,200 (Paid via Razorpay)                             │
│                                                                 │
│ [🚚 Ship This Order]  [📝 Edit]  [❌ Cancel]                   │
└─────────────────────────────────────────────────────────────────┘

STEP 3: Click "Ship This Order" → Modal Opens
┌─────────────────────────────────────────────────────────────────┐
│ Ship Order #ORD-ABC123                                     [X]  │
├───────────────────────┬─────────────────────────────────────────┤
│ [Shiprocket] [Manual] │                                         │
├───────────────────────┴─────────────────────────────────────────┤
│                                                                 │
│ PACKAGE DETAILS (Auto-calculated)                              │
│ ─────────────────────────────────                              │
│ Selected Box: [Medium Box ▼]                                   │
│ └─ Auto-selected for 4 items, 1.0kg                           │
│                                                                 │
│ Weight: [1.0] kg                                               │
│ Dimensions: [30] × [25] × [15] cm                              │
│ ℹ️ Based on product weights and preset boxes                   │
│                                                                 │
│ PICKUP LOCATION                                                │
│ ─────────────────                                              │
│ [Home Office - Gurugram 122001 ▼]                             │
│                                                                 │
│ COURIER SELECTION                                              │
│ ─────────────────                                              │
│ ⏳ Loading rates from Shiprocket...                           │
│                                                                 │
│ ● Delhivery Surface    ₹52   4-5 days  [CHEAPEST]             │
│ ○ Xpressbees Surface   ₹58   3-4 days                         │
│ ○ Blue Dart Air        ₹105  1-2 days  [FASTEST]              │
│                                                                 │
│ Pre-selected: Delhivery (based on "cheapest" setting)         │
│                                                                 │
│ PICKUP SCHEDULING                                              │
│ ──────────────────                                             │
│ ℹ️ Pickup will be scheduled at next batch time (2 PM)         │
│                                                                 │
│ ──────────────────────────────────────────────────             │
│                                                                 │
│ Shipping: ₹52          [Cancel]  [🚚 Ship Now - ₹52]          │
└─────────────────────────────────────────────────────────────────┘

STEP 4: Seller Clicks "Ship Now - ₹52"
Progress indicator shows:
├─ Creating Shiprocket order... ✓
├─ Getting courier rates... ✓
├─ Generating AWB code... ✓
└─ Adding to pickup queue... ✓

STEP 5: Success!
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Order shipped successfully!                                  │
│                                                                 │
│ Tracking: DLVRY1234567890                                      │
│ Courier: Delhivery Surface                                     │
│ Estimated Delivery: Jan 13, 2026 (4-5 days)                   │
│                                                                 │
│ [Print Label]  [View Tracking]  [Close]                       │
└─────────────────────────────────────────────────────────────────┘

STEP 6: Order Page Updates
Order status badge: 🚢 SHIPPED
New section shows:
┌─────────────────────────────────────────────────────────────────┐
│ SHIPMENT DETAILS                                                │
├─────────────────────────────────────────────────────────────────┤
│ AWB Code: DLVRY1234567890                                      │
│ Courier: Delhivery Surface                                     │
│ Status: 📦 Pending Pickup                                      │
│ Next Pickup: Today 2:00 PM - 5:00 PM                          │
│                                                                 │
│ [Print Shipping Label]  [Track Package]                       │
└─────────────────────────────────────────────────────────────────┘
```

### Behind the Scenes

```
USER CLICKS "SHIP NOW"
    ↓
FRONTEND:
├─ Collect form data (box, weight, courier selection)
├─ Validate fields
└─ POST /api/stores/{storeId}/orders/{orderId}/ship

    ↓

BACKEND PROCESSING:

Step 1: Validate Order
├─ Order exists?
├─ Is paid?
├─ Already shipped?
└─ Belongs to this store?

Step 2: Fetch Related Data
├─ Order details (customer, address)
├─ Order items (products, quantities)
├─ Product weights
├─ Selected pickup address
└─ Store's Shiprocket credentials

Step 3: Create Shiprocket Order
API Call: POST /orders/create/adhoc
├─ Send customer details
├─ Send order items
├─ Send package dimensions
└─ Receive: Shiprocket order ID (23456789)

Step 4: Get Courier Serviceability
API Call: POST /courier/serviceability
├─ Pickup pincode: 122001
├─ Delivery pincode: 400053
├─ Weight: 1.0kg
└─ Receive: List of available couriers with rates

Step 5: Auto-Select Courier
Based on settings (cheapest):
├─ Sort couriers by rate
├─ Select: Delhivery (₹52)
└─ Courier ID: 123

Step 6: Generate AWB Code
API Call: POST /courier/assign/awb
├─ Shipment ID: 34567890
├─ Courier ID: 123
└─ Receive: AWB code (DLVRY1234567890), label URL

Step 7: Create Shipment Record
INSERT INTO Shipment:
├─ orderId, storeId
├─ provider: SHIPROCKET
├─ shiprocketOrderId: 23456789
├─ awbCode: DLVRY1234567890
├─ courierName: Delhivery Surface
├─ courierId: 123
├─ weight: 1.0, dimensions: 30×25×15
├─ selectedPresetId: (Medium box)
├─ status: PENDING_PICKUP
└─ labelUrl, trackingUrl

Step 8: Update Order Status
UPDATE Order:
├─ orderStatus: SHIPPED
└─ actualShippingCost: 52

Step 9: Add to Unified Pickup Queue
REDIS:
├─ SADD pending_pickup:Delhivery "DLVRY1234567890"
└─ HSET shipment:DLVRY1234567890 {...details}

Step 10: Send Notifications
├─ Customer SMS: "Your order has been shipped!"
└─ Seller notification: "Order ORD-ABC123 shipped"

Step 11: Return Success Response
JSON:
{
  success: true,
  shipment: {
    awbCode: "DLVRY1234567890",
    courierName: "Delhivery Surface",
    trackingUrl: "https://...",
    labelUrl: "https://...",
    estimatedDelivery: "2026-01-13"
  }
}

    ↓

FRONTEND:
├─ Close modal
├─ Show success toast
├─ Update order status badge
└─ Refresh order details
```

---

## Flow 2: Batch Ship (The Bulk Path)

### User Journey

```
STEP 1: Orders List Page
┌─────────────────────────────────────────────────────────────────┐
│ ORDERS                     [Filter ▼]  [Search]  [Export]      │
├─────────────────────────────────────────────────────────────────┤
│ [ ] #ORD-123  Rahul S.    ₹2,200  PAID   Jan 9  [Ship]        │
│ [ ] #ORD-124  Priya K.    ₹1,500  PAID   Jan 9  [Ship]        │
│ [ ] #ORD-125  Amit P.     ₹3,100  PAID   Jan 9  [Ship]        │
│ [ ] #ORD-126  Neha M.     ₹890    PAID   Jan 9  [Ship]        │
│ [ ] #ORD-127  Raj D.      ₹2,400  PAID   Jan 9  [Ship]        │
└─────────────────────────────────────────────────────────────────┘

STEP 2: Seller Selects Multiple Orders
┌─────────────────────────────────────────────────────────────────┐
│ ORDERS                     [Filter ▼]  [Search]  [Export]      │
├─────────────────────────────────────────────────────────────────┤
│ [✓] #ORD-123  Rahul S.    ₹2,200  PAID   Jan 9  [Ship]        │
│ [✓] #ORD-124  Priya K.    ₹1,500  PAID   Jan 9  [Ship]        │
│ [✓] #ORD-125  Amit P.     ₹3,100  PAID   Jan 9  [Ship]        │
│ [ ] #ORD-126  Neha M.     ₹890    PAID   Jan 9  [Ship]        │
│ [✓] #ORD-127  Raj D.      ₹2,400  PAID   Jan 9  [Ship]        │
├─────────────────────────────────────────────────────────────────┤
│ 4 selected  [🚚 Ship Selected Orders]  [Cancel Selection]      │
└─────────────────────────────────────────────────────────────────┘

STEP 3: Click "Ship Selected Orders" → Modal Opens
┌─────────────────────────────────────────────────────────────────┐
│ Batch Ship - 4 Orders                                      [X]  │
├─────────────────────────────────────────────────────────────────┤
│ ORDERS SUMMARY                                                  │
│ ──────────────                                                  │
│ #ORD-123: 4 items, 1.0kg → Medium Box → Delhivery ₹52         │
│ #ORD-124: 2 items, 0.6kg → Small Box → Delhivery ₹48          │
│ #ORD-125: 7 items, 2.3kg → Large Box → Blue Dart ₹89          │
│ #ORD-127: 3 items, 0.9kg → Medium Box → Delhivery ₹52         │
│                                                                 │
│ GROUPED BY COURIER                                             │
│ ──────────────────                                             │
│ Delhivery: 3 shipments (Total: ₹152)                          │
│ Blue Dart: 1 shipment (Total: ₹89)                            │
│                                                                 │
│ TOTAL COST                                                     │
│ ──────────                                                     │
│ Shipping: ₹241                                                 │
│ Shipments: 4                                                   │
│                                                                 │
│ PICKUP SCHEDULING                                              │
│ ──────────────────                                             │
│ All shipments will be added to pickup queue                   │
│ Next pickup: Today 2:00 PM - 5:00 PM                          │
│ Couriers: 2 pickup requests (Delhivery + Blue Dart)           │
│                                                                 │
│ ─────────────────────────────────────────────                  │
│                                                                 │
│                  [Cancel]  [🚚 Ship All - ₹241]                │
└─────────────────────────────────────────────────────────────────┘

STEP 4: Seller Clicks "Ship All - ₹241"
Progress shows:
├─ Creating shipment 1 of 4... ✓
├─ Creating shipment 2 of 4... ✓
├─ Creating shipment 3 of 4... ✓
├─ Creating shipment 4 of 4... ✓
└─ Adding all to pickup queue... ✓

STEP 5: Success Summary
┌─────────────────────────────────────────────────────────────────┐
│ ✅ 4 orders shipped successfully!                               │
│                                                                 │
│ Delhivery: 3 shipments                                         │
│ ├─ #ORD-123: DLVRY001                                         │
│ ├─ #ORD-124: DLVRY002                                         │
│ └─ #ORD-127: DLVRY003                                         │
│                                                                 │
│ Blue Dart: 1 shipment                                          │
│ └─ #ORD-125: BD001                                            │
│                                                                 │
│ Next Pickup: Today 2:00 PM                                     │
│                                                                 │
│ [Print All Labels]  [View Shipments]  [Close]                 │
└─────────────────────────────────────────────────────────────────┘
```

### Behind the Scenes

```
USER CLICKS "SHIP ALL"
    ↓
BACKEND PROCESSES EACH ORDER IN LOOP:

FOR EACH selected order:
    ↓
Step 1: Validate Order
├─ Paid? Not already shipped?
└─ Skip if invalid (show warning)

Step 2: Calculate Package
├─ Count items, sum weights
├─ Select preset box
└─ Check threshold (flag if exceeds)

Step 3: Create Shiprocket Order
API Call: POST /orders/create/adhoc
└─ Get Shiprocket order ID

Step 4: Get Courier Rates & Auto-Select
API Call: POST /courier/serviceability
└─ Choose cheapest/fastest per settings

Step 5: Generate AWB
API Call: POST /courier/assign/awb
└─ Get AWB code

Step 6: Create Shipment Record
INSERT INTO Shipment (same as Flow 1)

Step 7: Add to Unified Queue
REDIS:
SADD pending_pickup:{courierName} "{awbCode}"

Step 8: Update Order Status
UPDATE Order: status = SHIPPED

    ↓ (Next order)

AFTER ALL ORDERS PROCESSED:

Step 9: Send Bulk Notifications
├─ Customer SMS to each (4 messages)
└─ Seller summary: "4 orders shipped"

Step 10: Return Summary Response
JSON:
{
  success: true,
  shipped: 4,
  failed: 0,
  shipments: [
    { orderId: "ORD-123", awbCode: "DLVRY001", ... },
    { orderId: "ORD-124", awbCode: "DLVRY002", ... },
    { orderId: "ORD-125", awbCode: "BD001", ... },
    { orderId: "ORD-127", awbCode: "DLVRY003", ... }
  ],
  pickupInfo: {
    nextPickupTime: "2:00 PM",
    couriers: ["Delhivery", "Blue Dart"]
  }
}

    ↓

KEY EFFICIENCY:
All 4 shipments created individually
BUT pickup scheduling unified:
├─ Delhivery: 3 shipments → 1 pickup request (at 2 PM cron)
└─ Blue Dart: 1 shipment → 1 pickup request (at 2 PM cron)

Total: 2 courier visits instead of 4!
```

---

## Flow 3: Auto-Ship (The Automated Path)

### Trigger Event

```
RAZORPAY PAYMENT WEBHOOK RECEIVED
    ↓
POST https://shoppulse.com/api/webhooks/razorpay
Body:
{
  event: "payment.captured",
  payload: {
    payment: { id: "pay_xyz123", amount: 220000, ... },
    order: { id: "order_abc456", ... }
  }
}

    ↓

WEBHOOK HANDLER:
Step 1: Verify signature (security)
Step 2: Find or create order in database
Step 3: Mark order as PAID
Step 4: Check if auto-ship enabled for store

if store.autoShipEnabled:
    ↓
    Enqueue delayed job:
    ADD TO QUEUE:
    ├─ Job: "create-shipment"
    ├─ Data: { orderId: "ORD-ABC123" }
    ├─ Delay: 30 minutes
    └─ Queue: BullMQ or Vercel Cron

    ↓

RETURN 200 OK to Razorpay
(Payment webhook processed successfully)
```

### Delayed Job Execution

```
30 MINUTES LATER...
    ↓
JOB WORKER TRIGGERS:
Job: "create-shipment"
Data: { orderId: "ORD-ABC123" }

    ↓

STEP 1: Validate Order Still Shippable
const order = await getOrder(orderId)

Checks:
├─ Order still exists?
├─ Still paid (not refunded)?
├─ Not already shipped?
├─ Not cancelled by seller?
└─ Store still has auto-ship enabled?

if any check fails:
    LOG: "Auto-ship skipped for {orderId}: {reason}"
    EXIT (don't ship)

    ↓

STEP 2: Fetch Configuration
├─ Store's Shiprocket credentials
├─ Auto-ship settings (courier preference)
├─ Default pickup address
└─ Package presets

    ↓

STEP 3: Calculate Package (Same as Flow 1)
├─ Sum item weights
├─ Select preset box
└─ Check threshold

if exceedsThreshold:
    FLAG: Set order.needsManualReview = true
    NOTIFY: Seller via dashboard notification
    EXIT (don't auto-ship)

    ↓

STEP 4: Create Shiprocket Order
API: POST /orders/create/adhoc
(Same as Flow 1)

    ↓

STEP 5: Get Rates & Auto-Select Courier
Based on settings:
├─ "cheapest" → Sort by rate, pick lowest
├─ "fastest" → Sort by delivery days, pick shortest
└─ "specific" → Use pre-configured courier ID

    ↓

STEP 6: Generate AWB
API: POST /courier/assign/awb
(Same as Flow 1)

    ↓

STEP 7: Create Shipment Record
INSERT INTO Shipment
(Same structure as Flow 1)

    ↓

STEP 8: Update Order
UPDATE Order: status = SHIPPED

    ↓

STEP 9: Add to Unified Pickup Queue
REDIS:
SADD pending_pickup:{courierName} "{awbCode}"

    ↓

STEP 10: Notifications
├─ Customer: "Your order has been shipped! AWB: {code}"
└─ Seller: "Auto-shipped: Order {orderId}"

    ↓

JOB COMPLETED SUCCESSFULLY
LOG: "Auto-ship completed for {orderId}: {awbCode}"
```

### Auto-Ship Configuration

```
Seller configures in Settings:
┌─────────────────────────────────────────────────────────────────┐
│ AUTO-SHIP SETTINGS                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Enable Auto-Ship: [✓] Automatically ship orders after payment │
│                                                                 │
│ Delay after payment: [30] minutes                              │
│ └─ Gives you time to cancel fraudulent orders                 │
│                                                                 │
│ Courier Selection:                                             │
│ ● Cheapest (recommended for most stores)                      │
│ ○ Fastest (priority delivery)                                 │
│ ○ Specific courier: [Delhivery ▼]                            │
│                                                                 │
│ Manual Review Threshold:                                       │
│ Flag orders exceeding: [5] kg or [10] items                   │
│ └─ These will require manual shipping                         │
│                                                                 │
│ [Save Settings]                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flow 4: Manual Ship (The Self-Service Path)

### Use Case
```
Scenarios where Manual Ship is needed:
├─ Using India Post/Speed Post (not on Shiprocket)
├─ Self-delivery (local customers)
├─ Shiprocket temporarily down
├─ Special courier arrangement
└─ Hand-delivered to customer
```

### User Journey

```
STEP 1: Order Detail Page
┌─────────────────────────────────────────────────────────────────┐
│ Order #ORD-ABC123                       Status: 🟢 PAID         │
├─────────────────────────────────────────────────────────────────┤
│ ... order details ...                                           │
│                                                                 │
│ [🚚 Ship This Order]  [📝 Edit]  [❌ Cancel]                   │
└─────────────────────────────────────────────────────────────────┘

STEP 2: Click "Ship This Order" → Modal Opens
┌─────────────────────────────────────────────────────────────────┐
│ Ship Order #ORD-ABC123                                     [X]  │
├───────────────────────┬─────────────────────────────────────────┤
│ [Shiprocket] [Manual] │ ← Seller clicks Manual tab             │
├───────────────────────┴─────────────────────────────────────────┤
│                                                                 │
│ MANUAL SHIPPING                                                │
│ ───────────────                                                │
│                                                                 │
│ Courier Name: [India Post Speed Post________]                 │
│                                                                 │
│ AWB / Tracking Number: [RR123456789IN________]                 │
│                                                                 │
│ Tracking URL (optional):                                       │
│ [https://indiapost.gov.in/track________]                       │
│                                                                 │
│ Shipping Cost: [₹50] (for your records)                       │
│                                                                 │
│ Notes (optional):                                              │
│ [Sent via Speed Post from local post office]                  │
│                                                                 │
│ ℹ️ Manual shipments won't be tracked automatically            │
│    You'll need to update status manually                       │
│                                                                 │
│ ──────────────────────────────────────────────────             │
│                                                                 │
│              [Cancel]  [✓ Mark as Shipped]                     │
└─────────────────────────────────────────────────────────────────┘

STEP 3: Seller Fills Details and Clicks "Mark as Shipped"

STEP 4: Success
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Order marked as shipped                                      │
│                                                                 │
│ Tracking: RR123456789IN                                        │
│ Courier: India Post Speed Post                                │
│                                                                 │
│ Customer will receive shipping notification via SMS            │
│                                                                 │
│ [Close]                                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Behind the Scenes

```
USER CLICKS "MARK AS SHIPPED"
    ↓
BACKEND:

Step 1: Validate Input
├─ Courier name: Not empty
├─ AWB code: Not empty, unique (no duplicates)
└─ Order: Paid and not already shipped

Step 2: Create Shipment Record
INSERT INTO Shipment:
├─ orderId, storeId
├─ provider: MANUAL
├─ manualCourierName: "India Post Speed Post"
├─ manualAwbCode: "RR123456789IN"
├─ manualTrackingUrl: "https://indiapost.gov.in/track"
├─ status: IN_TRANSIT (skip pickup phase)
├─ shippingCharge: 50
├─ notes: "Sent via Speed Post..."
└─ shiprocketOrderId, courierId: NULL (not applicable)

Step 3: Update Order
UPDATE Order:
├─ orderStatus: SHIPPED
└─ actualShippingCost: 50

Step 4: NO PICKUP QUEUE
(Manual shipments don't need pickup scheduling)

Step 5: Send Notification
Customer SMS:
"Your order has been shipped via India Post Speed Post.
Tracking: RR123456789IN"

Step 6: Return Success
JSON:
{
  success: true,
  shipment: {
    awbCode: "RR123456789IN",
    courierName: "India Post Speed Post",
    status: "IN_TRANSIT"
  }
}

    ↓

FRONTEND:
├─ Close modal
├─ Show success message
└─ Update order status badge: SHIPPED
```

### Manual Tracking Updates

```
Since Shiprocket doesn't track manual shipments:
Seller must update status manually

Order Detail Page → Shipment Section:
┌─────────────────────────────────────────────────────────────────┐
│ SHIPMENT DETAILS                                                │
├─────────────────────────────────────────────────────────────────┤
│ AWB: RR123456789IN                                             │
│ Courier: India Post Speed Post (Manual)                        │
│ Status: 📦 In Transit                                          │
│                                                                 │
│ [Update Status ▼]                                              │
│   ├─ In Transit                                               │
│   ├─ Out for Delivery                                         │
│   ├─ Delivered                                                │
│   └─ RTO (Return to Origin)                                   │
│                                                                 │
│ [Add Tracking Note]                                            │
└─────────────────────────────────────────────────────────────────┘

When seller updates:
├─ UPDATE Shipment: status = DELIVERED, deliveredAt = NOW()
├─ UPDATE Order: orderStatus = DELIVERED
├─ CREATE ShipmentEvent: source = MANUAL
└─ NOTIFY Customer: "Your order has been delivered!"
```

---

## 🔄 The Unified Pickup Pipeline (The Magic)

### The Problem It Solves

```
OLD APPROACH (Without Unified Pipeline):

Flow 1 (Manual Ship):
Seller ships order → Immediate pickup API call → Courier scheduled
Problem: 50 orders = 50 API calls = 50 courier visits ❌

Flow 2 (Batch Ship):
Seller selects 20 orders → Manual grouping UI → Schedule batch pickup
Problem: Complex code, separate logic, different from Flow 1 ❌

Flow 3 (Auto-Ship):
Payment → Delayed job → Create shipment → Separate pickup logic
Problem: Third different code path, hard to maintain ❌

RESULT: Three different implementations, inefficient, buggy
```

### The Unified Solution

```
NEW APPROACH (With Unified Pipeline):

ALL FLOWS:
├─ Flow 1: Manual Ship
├─ Flow 2: Batch Ship
├─ Flow 3: Auto-Ship
└─ Flow 4: Manual (skips pipeline, already shipped)

ALL CONVERGE TO:
    ↓
addToPickupQueue(shipment)
    ↓
REDIS automatically groups by courier
    ↓
CRON batches and schedules
    ↓
ONE API CALL PER COURIER

RESULT: Single code path, efficient, easy to debug ✅
```

### How It Works

```
STEP 1: Shipment Created (Any Flow)
const shipment = {
  awbCode: "DLVRY1234567890",
  courierId: 123,
  courierName: "Delhivery Surface",
  orderId: "ORD-ABC123"
}

addToPickupQueue(shipment)

    ↓

STEP 2: Add to Redis
REDIS commands:
├─ SADD pending_pickup:Delhivery "DLVRY1234567890"
└─ HSET shipment:DLVRY1234567890 {courierId, courierName, orderId, ...}

Result:
Redis now has courier-specific sets:
pending_pickup:Delhivery = {DLVRY001, DLVRY002, DLVRY003}
pending_pickup:BlueDart = {BD001, BD002}
pending_pickup:DTDC = {DTDC001}

    ↓

STEP 3: Wait for Cron
Throughout the day, more shipments added:
├─ 10:00 AM: 3 orders shipped → added to queue
├─ 10:30 AM: 5 more orders → added to queue
├─ 11:00 AM: ⏰ CRON RUNS → batch schedules all
├─ 11:30 AM: 2 new orders → added to queue
├─ 1:00 PM: 8 more orders → added to queue
└─ 2:00 PM: ⏰ CRON RUNS → batch schedules all

    ↓

STEP 4: Cron Execution (11 AM, 2 PM, 5 PM)

Cron triggers:
    ↓
Get all courier queues:
KEYS pending_pickup:*
Result: [pending_pickup:Delhivery, pending_pickup:BlueDart, ...]

    ↓

For each courier:
    ↓
GET pending_pickup:Delhivery
Result: [DLVRY001, DLVRY002, DLVRY003, DLVRY004, DLVRY005]

    ↓

Call Shiprocket ONCE:
POST /courier/generate/pickup
{
  courier_id: 123,
  awb_numbers: [DLVRY001, DLVRY002, DLVRY003, DLVRY004, DLVRY005],
  package_count: 5,
  pickup_time: "Today 2-5 PM"
}

Response:
{
  pickup_scheduled_date: "2026-01-09",
  pickup_token_number: "PKP123456"
}

    ↓

Update database:
UPDATE Shipment
SET status = 'PICKUP_SCHEDULED', pickupScheduledAt = NOW()
WHERE awbCode IN (DLVRY001, DLVRY002, ...)

    ↓

Clear Redis queue:
DEL pending_pickup:Delhivery
DEL shipment:DLVRY001
DEL shipment:DLVRY002
... (all processed AWBs)

    ↓

Notify seller:
"Pickup scheduled: 5 shipments via Delhivery (2-5 PM today)"

    ↓

RESULT:
5 shipments = 1 API call = 1 courier visit ✅
```

### Benefits Visualization

```
SCENARIO: 100 orders/day across 3 couriers

WITHOUT UNIFIED PIPELINE:
├─ 100 shipment creations
├─ 100 pickup API calls
├─ 100 courier visits (spread throughout day)
└─ Total API calls: 200 (100 create + 100 pickup)

WITH UNIFIED PIPELINE:
├─ 100 shipment creations
├─ Queue accumulation throughout day
├─ 3 cron runs (11 AM, 2 PM, 5 PM)
├─ 3 pickup API calls per cron = 9 total
├─ 9 courier visits (3 per window)
└─ Total API calls: 109 (100 create + 9 pickup)

EFFICIENCY GAIN:
API calls: 200 → 109 (45% reduction)
Courier visits: 100 → 9 (91% reduction!)
```

### Cron Schedule

```
DAILY PICKUP SCHEDULE:
├─ 11:00 AM: First batch (morning orders)
├─ 2:00 PM: Second batch (afternoon orders)
└─ 5:00 PM: Final batch (last pickup of day)

Cron Implementation:
'0 11,14,17 * * *' (runs at 11 AM, 2 PM, 5 PM)

What happens:
├─ 11 AM cron: Processes orders from 8 AM - 11 AM
├─ 2 PM cron: Processes orders from 11 AM - 2 PM
├─ 5 PM cron: Processes orders from 2 PM - 5 PM
└─ Next day 11 AM: Processes orders from 5 PM - 11 AM

Max delay: 3 hours between order and pickup scheduling
```

---

## 🎯 Decision Points in Flows

### When to Use Each Flow

```
USE FLOW 1 (One-Click Ship) WHEN:
├─ Single order ready to ship
├─ Seller wants to review details
├─ Need to change courier or box size
└─ Order needs special attention

USE FLOW 2 (Batch Ship) WHEN:
├─ Multiple orders ready at once
├─ End of day bulk processing
├─ Want to see cost summary before shipping
└─ Need to skip some orders (selective shipping)

USE FLOW 3 (Auto-Ship) WHEN:
├─ High order volume (>50/day)
├─ Seller trusts automated system
├─ Want zero manual intervention
└─ Consistent product weights/boxes

USE FLOW 4 (Manual Ship) WHEN:
├─ Using non-Shiprocket courier
├─ Self-delivery to local customers
├─ Shiprocket unavailable
└─ Special arrangement with courier
```

### Seller Dashboard Guidance

```
Recommendation shown in dashboard:

FOR STORES WITH < 20 ORDERS/DAY:
┌─────────────────────────────────────────────────────────────────┐
│ 💡 RECOMMENDED: Use One-Click Ship for most orders             │
│    Enable Auto-Ship only for repeat customers                  │
└─────────────────────────────────────────────────────────────────┘

FOR STORES WITH 20-100 ORDERS/DAY:
┌─────────────────────────────────────────────────────────────────┐
│ 💡 RECOMMENDED: Enable Auto-Ship + use Batch Ship for review   │
│    Let most orders ship automatically                          │
│    Use batch ship for flagged orders                           │
└─────────────────────────────────────────────────────────────────┘

FOR STORES WITH > 100 ORDERS/DAY:
┌─────────────────────────────────────────────────────────────────┐
│ 💡 RECOMMENDED: Full Auto-Ship + dedicated shipping staff      │
│    99% automation, manual intervention only for exceptions     │
│    Consider increasing cron frequency to 4 times/day           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Flow Comparison Table

| Aspect | One-Click | Batch | Auto-Ship | Manual |
|--------|-----------|-------|-----------|--------|
| **Seller Effort** | Medium | Low | None | Medium |
| **Time per Order** | 30 sec | 6 sec | 0 sec | 60 sec |
| **Control** | High | High | Low | High |
| **Best For** | Review needed | Bulk process | High volume | Non-Shiprocket |
| **Pickup** | Unified queue | Unified queue | Unified queue | Not applicable |
| **Error Risk** | Low | Low | Medium | Low |
| **Setup Required** | Presets | Presets | Presets + Settings | None |

---

## 🎓 Key Takeaways

1. **Four Flows, One Pipeline:** All converge to unified pickup queue
2. **Redis Grouping:** Automatically batches by courier name
3. **Cron Efficiency:** 3 runs/day = 91% reduction in courier visits
4. **Auto-Ship Delay:** 30 minutes gives fraud protection window
5. **Manual Override:** Always available for special cases
6. **Batch Power:** Process 20 orders in time of 2 manual ones
7. **Queue Retry:** Failed pickups stay in queue for next cron
8. **One Pickup Per Courier:** Not one per order (critical efficiency)
9. **Predictable Times:** Sellers know exactly when pickups happen
10. **Flow Selection:** Depends on volume, not complexity

---

## Next Steps

After understanding the four flows, move to **SUMMARY_4** to learn about production readiness, edge cases, and monitoring.
