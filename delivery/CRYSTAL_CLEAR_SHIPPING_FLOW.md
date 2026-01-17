# Crystal Clear Shipping Flow: Order → Pickup/Dropoff

1. When does order creation happen in Shiprocket?
2. When do we get AWB (tracking number)?
3. When do we get the label?
4. When is pickup scheduled?
5. When does the courier vehicle actually come?
6. **Where does seller's choice (pickup vs dropoff) fit?**
7. **How does your 2-hour batching work?**


```
PAYMENT CONFIRMED
       │
       ▼
┌──────────────────┐
│ 1. CREATE ORDER  │ ← Order exists in Shiprocket (no tracking yet)
│    in Shiprocket │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. GET AWB       │ ← Now we have tracking number (AWB)
│    (Assign       │   Courier is assigned (Delhivery, BlueDart, etc.)
│    Courier)      │   Label is AUTOMATICALLY generated
└────────┬─────────┘
         │
         ▼
       ╔════════════════════════════════════════════════════════╗
       ║            SELLER'S CHOICE HAPPENS HERE!               ║
       ╠════════════════════════════════════════════════════════╣
       ║                                                        ║
       ║  Option A: PICKUP                Option B: DROPOFF     ║
       ║  ─────────────────               ─────────────────     ║
       ║  Schedule pickup via API         Seller takes package  ║
       ║  (your 2-hr batching)            to courier hub        ║
       ║       │                                │               ║
       ║       ▼                                ▼               ║
       ║  Courier comes to                Package scanned       ║
       ║  seller's location               at hub                ║
       ║                                                        ║
       ╚════════════════════════════════════════════════════════╝
         │
         ▼
┌──────────────────┐
│ 4. PACKAGE       │ ← Package is with courier now
│    IN TRANSIT    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 5. DELIVERED     │ ← Customer receives
└──────────────────┘
```

---

## The 5 Stages of Shipping

### Stage 1: CREATE ORDER IN SHIPROCKET

**What happens:**
- ShopPulse sends order details to Shiprocket
- Shiprocket creates an internal order record
- You get back `order_id` and `shipment_id`

**What you DON'T have yet:**
- ❌ No tracking number (AWB)
- ❌ No courier assigned
- ❌ No label

**Shiprocket API:**
```
POST https://apiv2.shiprocket.in/v1/external/orders/create/adhoc
```

**ShopPulse Database After This:**
```typescript
// Order updated with Shiprocket IDs (but no AWB yet)
await prisma.shipment.create({
  data: {
    orderId: order.id,
    storeId: order.storeId,
    provider: "SHIPROCKET",
    providerOrderId: "234567890",      // Got this from response
    providerShipmentId: "345678901",   // Got this from response
    awbCode: null,                     // Still null
    courierName: null,                 // Still null
    status: "PENDING"
  }
});
```

---

### Stage 2: GET AWB (COURIER ASSIGNMENT)

**What happens:**
- You request courier rates for this shipment
- You select a courier (or Shiprocket auto-selects cheapest)
- Shiprocket assigns courier and generates AWB
- **Label is automatically generated with AWB**

**Two options:**

#### Option 2A: Manually Select Courier

```
STEP 1: Get rates
POST https://apiv2.shiprocket.in/v1/external/courier/serviceability/

STEP 2: Pick one and assign
POST https://apiv2.shiprocket.in/v1/external/courier/assign/awb/
```

#### Option 2B: Auto-Assign (Recommended)

```
SINGLE CALL - Shiprocket picks cheapest
POST https://apiv2.shiprocket.in/v1/external/courier/assign/awb/
```

**API Call (with courier_id):**
```
POST https://apiv2.shiprocket.in/v1/external/courier/assign/awb/
```

**Request:**
```json
{
  "shipment_id": 345678901,     // From Stage 1
  "courier_id": 25              // 25 = Delhivery, or omit for auto
}
```

**IMPORTANT:** After this call, the label is AUTOMATICALLY ready!

**ShopPulse Database After This:**
```typescript
await prisma.shipment.update({
  where: { orderId: order.id },
  data: {
    awbCode: "DLVRY1234567890",        // Now we have tracking!
    courierName: "Delhivery",
    courierId: "25",
    status: "AWB_GENERATED"
  }
});
```

---

### Stage 3: SELLER'S CHOICE - PICKUP OR DROPOFF

> **THIS IS WHERE YOUR CONFUSION LIES. LET ME BE CRYSTAL CLEAR.**

At this point:
- ✅ Order exists in Shiprocket
- ✅ AWB (tracking) is generated
- ✅ Label is ready to download/print
- ❌ Package is still with seller

**Now the seller has TWO options:**

```
                    ┌──────────────────────────────────────────────┐
                    │         SELLER'S CHOICE POINT                 │
                    │                                               │
                    │  Package is ready with label printed          │
                    │  Courier knows this package exists (AWB)      │
                    │                                               │
                    │  BUT courier hasn't received package yet!     │
                    │                                               │
                    └──────────────────┬───────────────────────────┘
                                       │
               ┌───────────────────────┼───────────────────────┐
               │                       │                       │
               ▼                       │                       ▼
    ┌─────────────────────┐            │          ┌─────────────────────┐
    │  OPTION A: PICKUP   │            │          │  OPTION B: DROPOFF  │
    │                     │            │          │                     │
    │  Seller stays home  │            │          │  Seller goes to     │
    │  Courier comes to   │            │          │  courier hub/center │
    │  collect package    │            │          │  and hands over     │
    │                     │            │          │  package            │
    │  ─────────────────  │            │          │  ─────────────────  │
    │  NEEDS API CALL:    │            │          │  NO API CALL:       │
    │  Schedule Pickup    │            │          │  Package scanned    │
    │                     │            │          │  when dropped       │
    │  YOUR 2-HR BATCHING │            │          │                     │
    │  APPLIES HERE!      │            │          │  Shiprocket auto-   │
    │                     │            │          │  updates status     │
    └─────────────────────┘            │          └─────────────────────┘
               │                       │                       │
               │                       │                       │
               └───────────────────────┴───────────────────────┘
                                       │
                                       ▼
                          ┌─────────────────────────┐
                          │ PACKAGE WITH COURIER    │
                          │ (Same from here onwards)│
                          └─────────────────────────┘
```

---

### Stage 3A: PICKUP Flow (with your 2-hour batching)

**API Call:**
```
POST https://apiv2.shiprocket.in/v1/external/courier/generate/pickup
```

**Request:**
```json
{
  "shipment_id": [345678901, 345678902, 345678903]  // Batch multiple!
}
```

**Response:**
```json
{
  "pickup_scheduled_date": "2026-01-11",
  "pickup_token_number": "PKP123456",
  "status": 1
}
```

**When does courier vehicle come?**
- Usually NEXT BUSINESS DAY
- If scheduled before 4 PM → might come same day evening
- Depends on courier and location

**Your 2-Hour Batching Logic:**
```typescript
// Instead of scheduling pickup for EACH order immediately...
// We batch them every 2 hours

// 10:00 AM - Order 1 paid → Add to Redis queue
// 10:15 AM - Order 2 paid → Add to Redis queue  
// 10:45 AM - Order 3 paid → Add to Redis queue
// 11:30 AM - Order 4 paid → Add to Redis queue

// 12:00 PM - CRON RUNS:
//   - Get all orders from queue (Orders 1-4)
//   - Create shipments in Shiprocket (if not created)
//   - Generate AWBs (if not generated)
//   - Schedule pickup for ALL 4 together
//   - Result: ONE pickup scheduled for 4 packages
```

---

### Stage 3B: DROPOFF Flow

**No API call needed!**

When seller physically takes package to courier hub:
1. Hub staff scans AWB barcode
2. Shiprocket automatically receives webhook
3. Status updates to "PICKED UP" 

**ShopPulse doesn't need to do anything - Shiprocket handles it!**

```
SELLER TAKES PACKAGE TO HUB
         │
         ▼
┌──────────────────────────┐
│ Hub staff scans barcode  │
│ (The AWB printed on      │
│  label)                  │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Shiprocket sends webhook │
│ to ShopPulse:            │
│                          │
│ {                        │
│   "awb": "DLVRY12345",   │
│   "current_status":      │
│     "PICKED UP",         │
│   "scan_type": "PP"      │
│ }                        │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ ShopPulse updates order  │
│ status to "SHIPPED"      │
└──────────────────────────┘
```

---

### Stage 4 & 5: IN TRANSIT → DELIVERED

After pickup/dropoff, the flow is identical:
- Courier transports package
- Shiprocket sends tracking webhooks
- ShopPulse updates customer via SMS/email

---

## Where Pickup vs Dropoff Choice Fits

### In the UI:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Order #ORD-12345                              Status: READY TO SHIP        │
│                                                                              │
│  Customer: Rahul Sharma                                                      │
│  Delhi - 110001                                                              │
│                                                                              │
│  AWB: DLVRY1234567890                                                       │
│  Courier: Delhivery                                                         │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  📦 Package is ready!                                                │   │
│  │                                                                       │   │
│  │  How do you want to hand over this package?                          │   │
│  │                                                                       │   │
│  │  ┌─────────────────────┐    ┌─────────────────────┐                  │   │
│  │  │ 🚚 SCHEDULE PICKUP  │    │ 🏪 I'LL DROP OFF   │                  │   │
│  │  │                     │    │                     │                  │   │
│  │  │ Courier will come   │    │ I'll take package  │                  │   │
│  │  │ to my location      │    │ to nearest hub     │                  │   │
│  │  │                     │    │                     │                  │   │
│  │  │ Next pickup: 11 AM  │    │ Find nearest hub → │                  │   │
│  │  │ (in 2 hours)        │    │                     │                  │   │
│  │  └─────────────────────┘    └─────────────────────┘                  │   │
│  │                                                                       │   │
│  │  [Print Label]                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### In the Database Schema:

```prisma
model Shipment {
  // ... other fields
  
  // Handover method
  handoverMethod    HandoverMethod?  // PICKUP or DROPOFF
  
  // Pickup-specific (only if PICKUP)
  pickupScheduled   Boolean @default(false)
  pickupScheduledAt DateTime?
  pickupDate        DateTime?
  pickupTokenNumber String?
  
  // Dropoff-specific (only if DROPOFF)
  dropoffHubId      String?
  droppedOffAt      DateTime?
}

enum HandoverMethod {
  PICKUP    // Courier comes to seller
  DROPOFF   // Seller goes to courier hub
}
```

---

## Unified Pickup Queue (Your 2-Hour Batching)

### The Problem You're Solving:

Without batching:
```
10:00 AM - Order 1 → Schedule pickup for 10:00 AM tomorrow
10:15 AM - Order 2 → Schedule pickup for 10:15 AM tomorrow  
10:30 AM - Order 3 → Schedule pickup for 10:30 AM tomorrow
10:45 AM - Order 4 → Schedule pickup for 10:45 AM tomorrow

Result: Courier might come 4 SEPARATE TIMES! (inefficient)
```

With your 2-hour batching:
```
10:00 AM - Order 1 → Add to queue
10:15 AM - Order 2 → Add to queue
10:30 AM - Order 3 → Add to queue
10:45 AM - Order 4 → Add to queue

12:00 PM - BATCH CRON:
  - Schedule pickup for Orders 1-4 TOGETHER
  - ONE pickup for all 4 packages

Result: Courier comes ONCE for 4 packages! (efficient)
```

### Redis Queue Visual:

```
REDIS KEYS AT 11:45 AM:
═══════════════════════════════════════════════════════════════════════════

pending_pickup:store_123:addr_1:Delhivery:2026-01-10T12:00:00Z
  └── [shipment_1, shipment_2, shipment_3]  ← 3 Delhivery pickups

pending_pickup:store_123:addr_1:BlueDart:2026-01-10T12:00:00Z
  └── [shipment_4]  ← 1 BlueDart pickup (separate because different courier)

pending_pickup:store_456:addr_2:Delhivery:2026-01-10T12:00:00Z
  └── [shipment_5, shipment_6]  ← Different store, different pickup

═══════════════════════════════════════════════════════════════════════════
AT 12:00 PM CRON RUNS:

1. Gets all keys matching *:2026-01-10T12:00:00Z
2. For each key:
   - Calls Shiprocket pickup API ONCE with all shipment IDs
   - Updates all shipments in database
   - Clears Redis key

RESULT:
- Store 123: 2 separate pickup scheduled (1 for Delhivery, 1 for BlueDart)
- Store 456: 1 pickup scheduled (Delhivery)
```

---

## Complete Flow Diagrams

### Flow A: Payment → Pickup (with batching)

```
CUSTOMER PAYS
     │
     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ SHOPPULSE: Payment Webhook Handler                                          │
│                                                                             │
│ 1. Verify payment                                                           │
│ 2. Update order.isPaid = true                                               │
│ 3. IF auto-ship enabled:                                                    │
│    → Create Shiprocket order (Stage 1)                                      │
│    → Generate AWB (Stage 2)                                                 │
│    → Add to pickup queue (Stage 3A)                                         │
└────────────────────────────────────────────────────────────────────────────┘
     │
     │ API: POST /orders/create/adhoc
     │ API: POST /courier/assign/awb
     │
     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ SHIPROCKET: Order Created + AWB Generated                                   │
│                                                                             │
│ providerOrderId: 234567890                                                  │
│ providerShipmentId: 345678901                                               │
│ awbCode: DLVRY1234567890                                                    │
│ courierName: Delhivery                                                      │
└────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ REDIS: Shipment added to pickup queue                                       │
│                                                                             │
│ Key: pending_pickup:store_123:addr_1:Delhivery:2026-01-10T12:00:00Z        │
│ Value: [345678901]                                                          │
└────────────────────────────────────────────────────────────────────────────┘
     │
     │ ... 2 more orders come in 10:00-12:00 ...
     │
     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 12:00 PM CRON: Process Pickup Batch                                         │
│                                                                             │
│ 1. Find all keys for 12:00 PM batch                                         │
│ 2. For each key:                                                            │
│    → Call Shiprocket pickup API with ALL shipment IDs                       │
│    → ONE API CALL schedules pickup for 3 shipments!                         │
└────────────────────────────────────────────────────────────────────────────┘
     │
     │ API: POST /courier/generate/pickup
     │      body: { shipment_id: [345678901, 345678902, 345678903] }
     │
     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ SHIPROCKET: Pickup Scheduled                                                │
│                                                                             │
│ pickup_scheduled_date: 2026-01-11 (tomorrow)                                │
│ pickup_token_number: PKP123456                                              │
│                                                                             │
│ Courier will come ONCE to pick up all 3 packages!                           │
└────────────────────────────────────────────────────────────────────────────┘
     │
     │ Next day: Courier arrives
     │
     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ SHIPROCKET WEBHOOK: Packages Picked Up                                      │
│                                                                             │
│ { awb: "DLVRY1234567890", current_status: "PICKED UP" }                    │
│ { awb: "DLVRY1234567891", current_status: "PICKED UP" }                    │
│ { awb: "DLVRY1234567892", current_status: "PICKED UP" }                    │
└────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ SHOPPULSE: Update Order Status + Notify Customer                            │
│                                                                             │
│ Order status: SHIPPED                                                       │
│ SMS/Email: "Your order has been shipped! Track: DLVRY1234567890"           │
└────────────────────────────────────────────────────────────────────────────┘
```

### Flow B: Payment → Dropoff (no batching)

```
CUSTOMER PAYS
     │
     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ SHOPPULSE: Payment Webhook + Auto-ship (manual dropoff mode)                │
│                                                                             │
│ 1. Verify payment                                                           │
│ 2. Update order.isPaid = true                                               │
│ 3. Create Shiprocket order                                                  │
│ 4. Generate AWB                                                             │
│ 5. Mark as "AWAITING_DROPOFF" (no queue)                                    │
└────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ SELLER: Takes package to nearest Delhivery hub                              │
│                                                                             │
│ Shows AWB barcode: DLVRY1234567890                                         │
│ Hub staff scans it                                                          │
└────────────────────────────────────────────────────────────────────────────┘
     │
     │ Scan triggers automatic update
     │
     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ SHIPROCKET WEBHOOK: Package Scanned at Hub                                  │
│                                                                             │
│ { awb: "DLVRY1234567890", current_status: "PICKED UP" }                    │
│                                                                             │
│ Note: "PICKED UP" status is used for both pickup AND dropoff!              │
└────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ SHOPPULSE: Same as pickup from here                                         │
│                                                                             │
│ Update status: SHIPPED                                                      │
│ Notify customer                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## What Happens in Shiprocket vs ShopPulse

### Summary Table:

| Action | ShopPulse Does | Shiprocket Does | API Call |
|--------|----------------|-----------------|----------|
| Payment confirmed | Update isPaid=true | Nothing | - |
| Create order | Call API + store IDs | Create order record | POST /orders/create/adhoc |
| Get rates | Call API + show UI | Return prices | POST /courier/serviceability |
| Assign courier | Call API + store AWB | Assign + generate AWB | POST /courier/assign/awb |
| Print label | Download from URL | Host label PDF | GET /orders/print/invoice |
| Schedule pickup | Call API (batched) | Schedule with courier | POST /courier/generate/pickup |
| Seller dropoff | Nothing! Just wait | Receive scan update | - (webhook comes to us) |
| Tracking update | Update status | Send webhook | - (we receive webhooks) |
| Delivered | Update status | Send webhook | - |

### What ShopPulse Stores vs What Shiprocket Stores:

```
SHOPPULSE DATABASE                    SHIPROCKET'S SYSTEM
═══════════════════════════════════   ═══════════════════════════════════

Order                                 Order
├── id: "uuid-123"                    ├── order_id: 234567890
├── storeId                           ├── company_id: (your account)
├── customer info                     ├── customer info (copy)
├── items                             ├── items (copy)
└── isPaid                            └── payment_method

Shipment                              Shipment
├── id: "uuid-456"                    ├── shipment_id: 345678901
├── orderId: "uuid-123"               ├── order_id: 234567890
├── provider: "SHIPROCKET"            │
├── providerOrderId: "234567890" ────►│
├── providerShipmentId: "345678901"──►│
├── awbCode: "DLVRY1234567890"        ├── awb_code: "DLVRY1234567890"
├── courierName: "Delhivery"          ├── courier_name: "Delhivery"
├── status: "SHIPPED"                 ├── status: 6 (in transit)
├── handoverMethod: "PICKUP"          │
├── pickupScheduled: true             ├── pickup_status: 1
└── pickupTokenNumber: "PKP123456"    └── pickup_token: "PKP123456"

We store what WE need                 They store what THEY need
(seller UI, customer tracking)        (courier operations)
```

---

## Summary: Your Questions Answered

1. **When does order creation happen in Shiprocket?**
   → When we call `POST /orders/create/adhoc` (Stage 1)

2. **When do we get AWB?**
   → When we call `POST /courier/assign/awb` (Stage 2)

3. **When do we get label?**
   → Automatically available after AWB is generated (Stage 2)

4. **When is pickup scheduled?**
   → When we call `POST /courier/generate/pickup` (Stage 3A)
   → With your batching: every 2 hours via cron

5. **When does courier vehicle come?**
   → Usually next business day after scheduling
   → Or same evening if scheduled before 4 PM

6. **Where does seller's pickup vs dropoff choice fit?**
   → After AWB is generated (Stage 2 complete)
   → Before package is handed to courier
   → Pickup: Goes through your 2-hr batch queue
   → Dropoff: Seller takes to hub, no API call needed

7. **How does 2-hour batching work?**
   → Orders with PICKUP choice added to Redis queue
   → Cron runs every 2 hours
   → Schedules pickup for ALL orders in batch with ONE API call
   → Same courier, same pickup address → ONE pickup!
