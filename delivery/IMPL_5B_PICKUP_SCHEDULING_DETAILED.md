# Part 5B Addendum: Pickup Scheduling in Depth

## Overview

This document explains how pickup scheduling works in two scenarios:
1. **Batch Ship**: Manual selection of multiple orders
2. **Auto-Ship**: Fully automated shipment creation

Both scenarios involve multiple couriers and need smart batching strategy.

> **IMPORTANT NOTES:**
> - This document only applies when seller chooses **🚚 Courier Pickup** as handover method
> - If seller chooses **🏪 Drop at Hub**, no pickup scheduling needed (hub scan triggers webhook)
> - Shiprocket uses `pickup_location` as **NAME** (string), not ID, in API calls
> - We use **2-hour batching** to group pickups efficiently

---

## Handover Method Check

Before any pickup scheduling, check handover method:

```typescript
if (shipment.handoverMethod === 'DROPOFF') {
  // No pickup scheduling needed!
  // Seller will drop at hub, hub scan triggers Shiprocket webhook
  return { status: 'AWAITING_DROPOFF' };
}

// Only PICKUP shipments continue to the pickup queue
await addToPickupQueue(shipment);
```

---

## Batch Ship: Multiple Couriers Pickup Flow

### Scenario
```
Seller selects 20 orders to ship at once
After rate comparison, orders assigned to different couriers:
- 12 orders → Delhivery (cheapest for these routes)
- 5 orders → DTDC
- 3 orders → Bluedart
```

### Complete Flow

#### Step 1: Create All Shipments (10:00 AM)

```typescript
// Seller clicks "Ship Selected" on 20 orders with PICKUP handover method

async function batchCreateShipments(orderIds: string[], handoverMethod: 'PICKUP' | 'DROPOFF') {
  const results = [];
  
  // Get pickup location NAME (Shiprocket uses name, not ID!)
  const pickupAddress = await prisma.address.findUnique({
    where: { id: store.defaultPickupAddressId },
    select: { name: true }
  });
  
  for (const orderId of orderIds) {
    // Call Shiprocket API to create order + assign AWB
    // NOTE: pickup_location is the NAME string, not an ID!
    const shipment = await shiprocketAPI.createShipment({
      orderId,
      pickup_location: pickupAddress.name, // e.g., "Home Office"
      courierSelection: 'AUTO' // as per shipping settings (CHEAPEST/FASTEST)
    });
    
    results.push({
      orderId,
      shipmentId: shipment.shipment_id,
      courierId: shipment.courier_company_id,
      courierName: shipment.courier_name, // e.g., "Delhivery"
      awbCode: shipment.awb_code,         // e.g., "DELH12345678"
      shippingCost: shipment.charges,
      handoverMethod
    });
    
    // Store in database
    await prisma.shipment.create({
      data: {
        orderId,
        storeId: order.storeId,
        providerShipmentId: shipment.shipment_id,
        awbCode: shipment.awb_code,
        courierName: shipment.courier_name,
        courierId: String(shipment.courier_company_id),
        weight: shipment.weight,
        shippingCharge: shipment.charges,
        handoverMethod,
        status: 'AWB_GENERATED',
        pickupAddressId: store.defaultPickupAddressId
      }
    });
  }
  
  return results;
}

// Result after creating 20 shipments:
[
  { orderId: 'ORD001', courier: 'Delhivery', awb: 'DELH001', cost: ₹45 },
  { orderId: 'ORD002', courier: 'Delhivery', awb: 'DELH002', cost: ₹42 },
  { orderId: 'ORD003', courier: 'Delhivery', awb: 'DELH003', cost: ₹48 },
  ...
  { orderId: 'ORD013', courier: 'DTDC', awb: 'DTDC001', cost: ₹40 },
  { orderId: 'ORD014', courier: 'DTDC', awb: 'DTDC002', cost: ₹38 },
  ...
  { orderId: 'ORD018', courier: 'Bluedart', awb: 'BLUE001', cost: ₹55 },
  ...
]
```

#### Step 2: Group Shipments by Courier

```typescript
function groupByCourier(shipments: Shipment[]) {
  const grouped = {};
  
  for (const shipment of shipments) {
    if (!grouped[shipment.courierName]) {
      grouped[shipment.courierName] = [];
    }
    grouped[shipment.courierName].push(shipment);
  }
  
  return grouped;
}

// Result:
{
  'Delhivery': [
    { orderId: 'ORD001', awb: 'DELH001', courierId: 12 },
    { orderId: 'ORD002', awb: 'DELH002', courierId: 12 },
    ...
    // 12 shipments total
  ],
  'DTDC': [
    { orderId: 'ORD013', awb: 'DTDC001', courierId: 24 },
    ...
    // 5 shipments total
  ],
  'Bluedart': [
    { orderId: 'ORD018', awb: 'BLUE001', courierId: 35 },
    ...
    // 3 shipments total
  ]
}
```

#### Step 3: Add to Pickup Queue (if PICKUP handover)

> **NOTE:** Instead of scheduling pickup immediately, we add shipments to the 2-hour batch queue. This is more efficient than scheduling individual pickups.

```typescript
async function addShipmentsToPickupQueue(shipments: Shipment[]) {
  // Only process PICKUP shipments
  const pickupShipments = shipments.filter(s => s.handoverMethod === 'PICKUP');
  
  if (pickupShipments.length === 0) {
    console.log('All shipments are DROPOFF - no pickup scheduling needed');
    return;
  }
  
  const redis = getRedisClient();
  const nextBatchTime = getNextBatchTime(); // Rounds to next 2-hour slot
  
  for (const shipment of pickupShipments) {
    // Redis key groups by: storeId, pickupAddressId, courierName, batchTime
    const key = `pending_pickup:${shipment.storeId}:${shipment.pickupAddressId}:${shipment.courierName}:${nextBatchTime}`;
    
    await redis.sadd(key, shipment.id);
    await redis.expire(key, 86400); // 24-hour TTL
    
    console.log(`✓ Queued ${shipment.awbCode} for ${shipment.courierName} pickup (batch: ${nextBatchTime})`);
  }
  
  return {
    queuedCount: pickupShipments.length,
    nextBatchTime,
    message: `${pickupShipments.length} shipments queued for next pickup batch`
  };
}
```

#### Step 4: Cron Processes Batch Queue (Every 2 Hours)

```typescript
// Cron runs: 8 AM, 10 AM, 12 PM, 2 PM, 4 PM, 6 PM, 8 PM

async function processBatchPickups() {
  const redis = getRedisClient();
  const now = new Date();
  
  // Find all queue keys for current or past batch times
  const keys = await redis.keys('pending_pickup:*');
  
  for (const key of keys) {
    const [, storeId, pickupAddressId, courierName, batchTime] = key.split(':');
    
    // Skip future batches
    if (new Date(batchTime) > now) continue;
    
    const shipmentIds = await redis.smembers(key);
    if (shipmentIds.length === 0) continue;
    
    // Get Shiprocket shipment IDs
    const shipments = await prisma.shipment.findMany({
      where: { id: { in: shipmentIds } },
      select: { providerShipmentId: true }
    });
    
    const shiprocketIds = shipments.map(s => parseInt(s.providerShipmentId));
    
    // Schedule pickup via Shiprocket
    // NOTE: Shiprocket uses shipment_id array, NOT awb_numbers
    const pickup = await shiprocketAPI.schedulePickup({
      shipment_id: shiprocketIds
    });
    
    // Update database
    await prisma.shipment.updateMany({
      where: { id: { in: shipmentIds } },
      data: {
        status: 'PICKUP_SCHEDULED',
        pickupScheduledDate: new Date(pickup.pickup_scheduled_date),
        pickupToken: pickup.pickup_token_number
      }
    });
    
    // Clear queue
    await redis.del(key);
    
    console.log(`✓ Scheduled pickup for ${courierName}: ${shipmentIds.length} shipments`);
  }
}
```

```typescript
// API Response from Shiprocket (POST /courier/generate/pickup):
{
  "pickup_status": 1,
  "pickup_scheduled_date": "2026-01-13",
  "pickup_token_number": "PKP123456",
  "response": "Pickup scheduled successfully"
}

// Result:
[
  {
    courierName: 'Delhivery',
    pickupId: 'PKP123456',
    pickupStatus: 'SCHEDULED',
    pickupTime: '2:00 PM - 6:00 PM',
    packageCount: 12
  },
  {
    courierName: 'DTDC',
    pickupId: 'PKP123457',
    pickupStatus: 'SCHEDULED',
    pickupTime: '2:00 PM - 6:00 PM',
    packageCount: 5
  },
  {
    courierName: 'Bluedart',
    pickupId: 'PKP123458',
    pickupStatus: 'SCHEDULED',
    pickupTime: '2:00 PM - 6:00 PM',
    packageCount: 3
  }
]
```

#### Step 4: Couriers Arrive (2:00 PM - 6:00 PM)

**Delhivery Van Arrives (2:30 PM):**

Courier Executive:
1. Opens Delhivery app
2. Sees pickup request: "12 packages at ShopPulse Warehouse"
3. Arrives at warehouse

At Warehouse:
4. Scans AWB barcode on each package:
   - DELH001 ✓
   - DELH002 ✓
   - DELH003 ✓
   ...
   - DELH012 ✓

5. System confirms: 12/12 packages collected
6. Updates status in Shiprocket:
   POST /pickups/PKP123456/confirm
   {
     "status": "PICKED_UP",
     "packages_collected": 12,
     "timestamp": "2024-01-15T14:35:00"
   }

7. Courier leaves with 12 packages


**Shiprocket Webhook Sent (2:36 PM):**
```http
POST https://shoppulse.com/api/webhooks/shiprocket
X-Shiprocket-Signature: <signature>

{
  "event": "PICKUP_DONE",
  "pickup_id": "PKP123456",
  "courier_name": "Delhivery",
  "awb_codes": ["DELH001", "DELH002", ..., "DELH012"],
  "packages_collected": 12,
  "timestamp": "2024-01-15T14:35:00",
  "status": "PICKED_UP"
}
```

**DTDC Van Arrives (3:15 PM):**
```
Same process:
- Scans 5 AWBs
- Confirms collection
- Webhook sent
```

**Bluedart Van Arrives (4:00 PM):**
```
Same process:
- Scans 3 AWBs
- Confirms collection
- Webhook sent
```

#### Step 5: ShopPulse Processes Webhooks

```typescript
// src/app/api/webhooks/shiprocket/route.ts

async function handlePickupDone(payload: WebhookPayload) {
  const awbCodes = payload.awb_codes;
  
  // Update all shipments in this pickup
  await prisma.shipment.updateMany({
    where: { awbCode: { in: awbCodes } },
    data: {
      status: 'PICKED_UP',
      pickedUpAt: new Date(payload.timestamp)
    }
  });
  
  // Update related orders
  const shipments = await prisma.shipment.findMany({
    where: { awbCode: { in: awbCodes } },
    include: { order: true }
  });
  
  for (const shipment of shipments) {
    await prisma.order.update({
      where: { id: shipment.orderId },
      data: {
        orderStatus: 'SHIPPED',
        shippedAt: new Date()
      }
    });
    
    // Send notification to customer
    await sendShippingNotification({
      customerEmail: shipment.order.customerEmail,
      orderNumber: shipment.order.orderNumber,
      awbCode: shipment.awbCode,
      courierName: payload.courier_name,
      trackingUrl: getTrackingUrl(shipment.awbCode)
    });
  }
  
  console.log(`✓ ${awbCodes.length} orders marked as SHIPPED`);
}
```

### Timeline Summary (with 2-Hour Batching)

```
10:00 AM: Seller selects 20 orders → Click "Ship Selected" (PICKUP handover)
10:00 AM: System creates 20 shipments in Shiprocket (gets AWBs)
10:01 AM: System adds all PICKUP shipments to Redis queue
10:02 AM: Seller sees: "20 shipments created, pickup scheduled in next batch (12 PM)"

12:00 PM: CRON BATCH RUNS ⏰
          - Groups shipments by courier
          - Schedules pickup for Delhivery: 12 shipments
          - Schedules pickup for DTDC: 5 shipments
          - Schedules pickup for Bluedart: 3 shipments
          - 3 API calls total (one per courier)

12:05 PM: Seller sees: "Pickup scheduled for 2PM-6PM"

2:30 PM:  Delhivery courier arrives → Collects 12 packages
2:36 PM:  Shiprocket webhook → Orders marked SHIPPED

3:15 PM:  DTDC courier arrives → Collects 5 packages
3:21 PM:  Shiprocket webhook → Orders marked SHIPPED

4:00 PM:  Bluedart courier arrives → Collects 3 packages
4:05 PM:  Shiprocket webhook → Orders marked SHIPPED

Result: All 20 orders shipped with 3 courier visits
        (Not 20 separate pickup requests!)
```

---

## Auto-Ship: Pickup Scheduling Strategy

### The Challenge

**Orders come in throughout the day:**
```
10:15 AM: Order 1 (Delhivery) → Auto-ship creates shipment
10:45 AM: Order 2 (DTDC) → Auto-ship creates shipment
11:20 AM: Order 3 (Delhivery) → Auto-ship creates shipment
12:10 PM: Order 4 (Delhivery) → Auto-ship creates shipment
1:30 PM: Order 5 (Bluedart) → Auto-ship creates shipment
2:15 PM: Order 6 (Delhivery) → Auto-ship creates shipment

Problem: When do we schedule pickup?
- After EACH order? → 6 courier visits (wasteful!)
- Once per day? → Orders wait 8+ hours (slow!)
- Smart batching? → Optimal! ✓
```

### Solution: Batch Accumulation with Fixed Time Scheduling

**How it works:**

1. **Auto-ship creates shipment** immediately after payment (or after 30 min delay)
2. **Shipment added to "Pending Pickup Queue"** (in-memory/Redis)
3. **Cron job runs at fixed times** (11 AM, 2 PM, 5 PM) to batch schedule pickups
4. **One pickup per courier** scheduled for accumulated orders

### Implementation: Fixed Time Batch Strategy (MVP)

```typescript
// ─────────────────────────────────────────────────────────
// PART 1: Auto-ship creates shipment immediately
// ─────────────────────────────────────────────────────────

// Triggered by payment webhook (Razorpay)
async function handlePaymentSuccess(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { store: true }
  });
  
  // Check if auto-ship enabled
  if (!order.store.autoShipEnabled) {
    console.log('Auto-ship disabled, skipping');
    return;
  }
  
  // Get delay setting (default 30 minutes)
  const delayMinutes = order.store.autoShipDelayMinutes || 30;
  
  // Schedule shipment creation after delay
  await queue.add(
    'create-auto-shipment',
    { orderId },
    { delay: delayMinutes * 60 * 1000 } // Convert to milliseconds
  );
  
  console.log(`Auto-ship scheduled for ${orderId} after ${delayMinutes} min`);
}

// ─────────────────────────────────────────────────────────
// PART 2: Queue processor creates shipment
// ─────────────────────────────────────────────────────────

queue.process('create-auto-shipment', async (job) => {
  const { orderId } = job.data;
  
  // 1. Calculate package dimensions/weight
  const boxSelection = await selectBoxForOrder(orderId);
  
  if (boxSelection.needsManualReview) {
    // Order exceeds threshold → Flag for manual review
    await flagOrderForManualReview(orderId, boxSelection.reason);
    return;
  }
  
  // 2. Create shipment in Shiprocket
  const shipment = await shiprocketAPI.createShipment({
    orderId,
    dimensions: boxSelection.dimensions,
    weight: boxSelection.estimatedWeight,
    pickupLocationId: store.defaultPickupLocationId,
    courierSelection: 'CHEAPEST' // From settings
  });
  
  // 3. Store shipment in database
  await prisma.shipment.create({
    data: {
      orderId,
      shiprocketShipmentId: shipment.shipment_id,
      awbCode: shipment.awb_code,
      courierName: shipment.courier_name,
      courierId: shipment.courier_company_id,
      declaredWeight: shipment.weight,
      declaredDimensions: shipment.dimensions,
      shippingCost: shipment.charges,
      status: 'AWB_ASSIGNED',
      pickupScheduled: false // NOT scheduled yet
    }
  });
  
  // 4. Add to pending pickup queue (Redis)
  await redis.sadd(
    `pending_pickup:${shipment.courierName}`,
    shipment.awbCode
  );
  
  console.log(`✓ Shipment created for ${orderId}, added to pickup queue`);
});

// ─────────────────────────────────────────────────────────
// PART 3: Cron job batches pickups at fixed times
// ─────────────────────────────────────────────────────────

import { scheduleJob } from 'node-schedule';

// Run at 11:00 AM, 2:00 PM, 5:00 PM daily
const pickupScheduler = scheduleJob('0 11,14,17 * * *', async () => {
  console.log('Running pickup scheduler...');
  await processPendingPickups();
});

async function processPendingPickups() {
  // Get list of couriers with pending orders
  const courierKeys = await redis.keys('pending_pickup:*');
  
  if (courierKeys.length === 0) {
    console.log('No pending pickups');
    return;
  }
  
  for (const key of courierKeys) {
    const courierName = key.replace('pending_pickup:', '');
    
    // Get all AWBs for this courier
    const awbCodes = await redis.smembers(key);
    
    if (awbCodes.length === 0) continue;
    
    // Get shipment details
    const shipments = await prisma.shipment.findMany({
      where: { awbCode: { in: awbCodes } },
      include: { order: { include: { store: true } } }
    });
    
    if (shipments.length === 0) continue;
    
    // Group by store (in case of multi-store)
    const byStore = groupBy(shipments, 'order.storeId');
    
    for (const [storeId, storeShipments] of Object.entries(byStore)) {
      const store = storeShipments[0].order.store;
      const courierId = storeShipments[0].courierId;
      const pickupLocationId = store.defaultPickupLocationId;
      
      try {
        // Schedule pickup with Shiprocket
        const pickup = await shiprocketAPI.schedulePickup({
          courier_id: courierId,
          pickup_location_id: pickupLocationId,
          pickup_date: new Date().toISOString().split('T')[0],
          pickup_time: getNextPickupSlot(), // "15:00" for 3PM cron
          expected_package_count: storeShipments.length,
          awb_numbers: storeShipments.map(s => s.awbCode)
        });
        
        // Update shipments
        await prisma.shipment.updateMany({
          where: { id: { in: storeShipments.map(s => s.id) } },
          data: {
            pickupScheduled: true,
            pickupId: pickup.pickup_id,
            pickupScheduledAt: new Date(),
            status: 'PICKUP_SCHEDULED'
          }
        });
        
        // Remove from pending queue
        await redis.del(`pending_pickup:${courierName}`);
        
        console.log(`✓ Scheduled pickup for ${courierName}: ${storeShipments.length} orders`);
        
      } catch (error) {
        console.error(`Failed to schedule pickup for ${courierName}:`, error);
        // Keep in queue for next cron run
      }
    }
  }
}

function getNextPickupSlot(): string {
  const hour = new Date().getHours();
  
  if (hour < 11) return '12:00'; // 11 AM cron → 12 PM pickup
  if (hour < 14) return '15:00'; // 2 PM cron → 3 PM pickup
  return '18:00';                // 5 PM cron → 6 PM pickup
}
```

### Real-World Example

**Day Timeline:**

```
─────────────────────────────────────────────────────────────
6:00 AM: Store opens
─────────────────────────────────────────────────────────────

10:15 AM: Order 1 payment confirmed (₹1,299)
          ↓
10:15 AM: Auto-ship scheduled (30 min delay)
          ↓
10:45 AM: Shipment created (Delhivery, DELH001)
          ↓
          Added to Redis: pending_pickup:Delhivery = [DELH001]
          
─────────────────────────────────────────────────────────────

10:30 AM: Order 2 payment confirmed (₹899)
          ↓
11:00 AM: Shipment created (DTDC, DTDC001)
          ↓
          Added to Redis: pending_pickup:DTDC = [DTDC001]
          
─────────────────────────────────────────────────────────────

11:00 AM: CRON JOB #1 RUNS ⏰
          ↓
          Checks Redis queues:
          - Delhivery: 1 order (DELH001)
          - DTDC: 1 order (DTDC001)
          ↓
          Schedules 2 pickups:
          - Pickup 1: Delhivery (1 order) for 12PM-4PM
          - Pickup 2: DTDC (1 order) for 12PM-4PM
          ↓
          Clears Redis queues
          
─────────────────────────────────────────────────────────────

11:20 AM: Order 3 payment confirmed (₹1,499)
          ↓
11:50 AM: Shipment created (Delhivery, DELH002)
          ↓
          Added to Redis: pending_pickup:Delhivery = [DELH002]
          
12:10 PM: Order 4 payment confirmed (₹799)
          ↓
12:40 PM: Shipment created (Delhivery, DELH003)
          ↓
          Added to Redis: pending_pickup:Delhivery = [DELH002, DELH003]
          
1:30 PM: Order 5 payment confirmed (₹2,199)
         ↓
2:00 PM: Shipment created (Bluedart, BLUE001)
         ↓
         Added to Redis: pending_pickup:Bluedart = [BLUE001]
         
─────────────────────────────────────────────────────────────

2:00 PM: CRON JOB #2 RUNS ⏰
         ↓
         Checks Redis queues:
         - Delhivery: 2 orders (DELH002, DELH003)
         - Bluedart: 1 order (BLUE001)
         ↓
         Schedules 2 pickups:
         - Pickup 3: Delhivery (2 orders) for 3PM-7PM
         - Pickup 4: Bluedart (1 order) for 3PM-7PM
         ↓
         Clears Redis queues
         
─────────────────────────────────────────────────────────────

12:30 PM: Delhivery courier arrives (Pickup 1)
          Collects 1 package (DELH001)
          
1:15 PM: DTDC courier arrives (Pickup 2)
         Collects 1 package (DTDC001)
         
─────────────────────────────────────────────────────────────

3:30 PM: Delhivery courier arrives (Pickup 3)
         Collects 2 packages (DELH002, DELH003)
         
4:15 PM: Bluedart courier arrives (Pickup 4)
         Collects 1 package (BLUE001)
         
─────────────────────────────────────────────────────────────

Result:
- 5 orders auto-shipped
- 4 courier visits (2 Delhivery, 1 DTDC, 1 Bluedart)
- Maximum delay: 3 hours (between cron runs)
- Average delay: 1.5 hours
```

### Settings Configuration

```typescript
// Database schema (see IMPL_1_DATABASE_SCHEMA.md for full schema)
model StoreShippingSettings {
  id                      String   @id @default(cuid())
  storeId                 String   @unique
  
  // Auto-ship settings
  autoShipEnabled         Boolean  @default(false)
  autoShipAfterMinutes    Int      @default(240) // 4 hours (30-480 allowed)
  
  // Courier selection (removed "Prefer specific" option)
  courierSelection        CourierSelectionMode @default(CHEAPEST)
  // Options: CHEAPEST, FASTEST only
  
  // Handover method (PICKUP or DROPOFF)
  defaultHandoverMethod   HandoverMethod @default(PICKUP)
  
  // Pickup scheduling
  defaultPickupAddressId  String?  // Reference to Address model (stores NAME)
  pickupCutoffHour        Int      @default(14) // 2 PM
  skipWeekendPickup       Boolean  @default(false)
}
```

**UI in Settings Page:**
```
┌─────────────────────────────────────────────────────────┐
│ AUTO-SHIP SETTINGS                                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [✓] Enable Auto-Ship for Paid Orders                   │
│                                                          │
│ Fraud Check Delay: [30] minutes                        │
│ ℹ️ Wait time before creating shipment (cancellation window) │
│                                                          │
│ ───────────────────────────────────────────────────────  │
│                                                          │
│ COURIER SELECTION                                       │
│ ● Cheapest available courier                           │
│ ○ Fastest available courier                            │
│                                                          │
│ ───────────────────────────────────────────────────────  │
│                                                          │
│ HANDOVER METHOD                                         │
│ ● 🚚 Courier Pickup (recommended)                      │
│ ○ 🏪 I'll Drop at Hub                                  │
│                                                          │
│ ───────────────────────────────────────────────────────  │
│                                                          │
│ PICKUP SCHEDULING (if Courier Pickup selected)         │
│ Uses 2-hour batching pipeline. Shipments are grouped   │
│ by courier and pickup scheduled in batches.            │
│                                                          │
│ [ ] Skip weekend pickups                                │
│                                                          │
│ [Save Settings]                                         │
└─────────────────────────────────────────────────────────┘
```

### Alternative Strategy: Threshold-Based (Phase 2)

**For high-volume stores (>200 orders/day):**

```typescript
// Schedule pickup when X orders accumulated for a courier

const THRESHOLDS = {
  'Delhivery': 15, // Schedule when 15 Delhivery orders ready
  'DTDC': 8,
  'Bluedart': 8,
  'Default': 5
};

async function onShipmentCreated(shipment: Shipment) {
  // Add to pending queue
  await redis.sadd(`pending_pickup:${shipment.courierName}`, shipment.awbCode);
  
  // Check if threshold reached
  const count = await redis.scard(`pending_pickup:${shipment.courierName}`);
  const threshold = THRESHOLDS[shipment.courierName] || THRESHOLDS['Default'];
  
  if (count >= threshold) {
    // Threshold reached → Schedule pickup immediately
    console.log(`Threshold reached for ${shipment.courierName} (${count}/${threshold})`);
    await schedulePickupForCourier(shipment.courierName);
  }
}

// Backup: Fixed time cron (for low-volume periods)
scheduleJob('0 11,14,17 * * *', async () => {
  // Schedule pickups for any courier with pending orders
  const courierKeys = await redis.keys('pending_pickup:*');
  for (const key of courierKeys) {
    const count = await redis.scard(key);
    if (count > 0) {
      const courierName = key.replace('pending_pickup:', '');
      await schedulePickupForCourier(courierName);
    }
  }
});
```

**Example:**
```
10:00 AM: Order 1 (Delhivery) → Count: 1/15
10:30 AM: Order 2 (Delhivery) → Count: 2/15
...
1:45 PM: Order 15 (Delhivery) → Count: 15/15 ✓ THRESHOLD HIT!
1:46 PM: Pickup scheduled immediately for 2:30PM-6:30PM
2:30 PM: Courier arrives and collects 15 packages

Benefit: Faster pickup (no waiting for cron)
Trade-off: Unpredictable timing (harder for seller to plan)
```

### Comparison Table

| Strategy | Pros | Cons | Best For |
|----------|------|------|----------|
| **2-Hour Batch** | • Simple & predictable<br>• Seller knows windows<br>• Easy to implement | • Max 2 hour delay<br>• May have single-order pickups | MVP, < 100 orders/day |
| **Threshold-Based** | • Faster (no waiting)<br>• Efficient batching<br>• Scales well | • Unpredictable timing<br>• Complex for seller | > 200 orders/day |
| **Hybrid** | • Best of both<br>• Fast + predictable | • Most complex<br>• More code to maintain | Production, all volumes |

---

## Summary

### Batch Ship (Manual)
```
User selects 20 orders → Select handover method (PICKUP/DROPOFF)

If PICKUP:
  Create shipments → Add to Redis queue → 2-hour batch cron 
  → Schedule pickup (1 per courier) → Courier collects
  Timeline: 5 minutes to queue + max 2 hours to batch = pickup scheduled

If DROPOFF:
  Create shipments → Done! Seller takes to hub → Hub scan triggers webhook
  Timeline: Immediate (seller controls when to drop)
```

### Auto-Ship (Automated)
```
Payment → Wait X hours (from settings) → Create shipment → Check handover method

If PICKUP (default):
  Add to queue → 2-hour batch cron → Schedule pickup
  Timeline: X hours + max 2 hours batch = pickup scheduled

If DROPOFF:
  Done! Order waits for seller to drop at hub
```

### Key Insights

| Aspect | Implementation |
|--------|----------------|
| **Handover Choice** | PICKUP → queue for batch, DROPOFF → no action |
| **Pickup Location** | Uses NAME (string), not ID, in Shiprocket API |
| **Batching** | 2-hour windows (8 AM, 10 AM, 12 PM, 2 PM, 4 PM, 6 PM, 8 PM) |
| **Grouping** | By storeId + pickupAddressId + courierName |
| **API Efficiency** | ONE pickup request per courier per batch |

---

*Back to: [IMPL_5B_COMPLETE_SHIPMENT_FLOWS.md](./IMPL_5B_COMPLETE_SHIPMENT_FLOWS.md)*
