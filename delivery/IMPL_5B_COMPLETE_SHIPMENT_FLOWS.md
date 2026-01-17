# Part 5B: Complete Shipment Flows

## Overview of All Flows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SHIPMENT CREATION FLOWS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FLOW 1: ONE-CLICK SHIP (Shiprocket)                                        │
│  ─────────────────────────────────────                                      │
│  Order page → "Ship Order" → Modal with prefilled data → Ship Now           │
│  Time: ~30 seconds per order                                                │
│                                                                              │
│  FLOW 2: BATCH SHIP (Shiprocket)                                            │
│  ─────────────────────────────────                                          │
│  Orders list → Select multiple → "Ship Selected" → Review → Ship All        │
│  Time: ~2 minutes for 10 orders                                             │
│                                                                              │
│  FLOW 3: AUTO-SHIP (Shiprocket)                                             │
│  ───────────────────────────────                                            │
│  Payment success → Wait X mins → Auto create shipment → Auto pickup         │
│  Time: 0 (fully automated)                                                  │
│                                                                              │
│  FLOW 4: MANUAL SHIP                                                        │
│  ────────────────────                                                       │
│  Order page → "Ship Order" → Manual tab → Enter AWB → Create                │
│  Time: ~1 minute per order                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## FLOW 1: One-Click Ship (Shiprocket)

### Trigger
User clicks "Ship Order" button on order detail page.

### Complete Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Order #ORD-ABC123                                    Status: PAID      [X] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Customer: Rahul Sharma | +91 98765 43210                                   │
│  Address: 789 Lane, Andheri West, Mumbai 400053                             │
│                                                                             │
│  Items:                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Classic T-Shirt (Size: M, Color: Black)    × 2    ₹500 × 2 = ₹1,000   │  │
│  │ Denim Jeans (Size: 32)                     × 1    ₹1,200 × 1 = ₹1,200 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  Subtotal: ₹2,200  |  Shipping: ₹0  |  Total: ₹2,200                        │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  🚚 [Ship with Shipping Service] [Ship Manually]                       │ │
│  │  [Mark as Processing]  [Cancel Order]                                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                           │
                           │ Click "Ship with Shipping Service"
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Ship Order  #ORD-ABC123                                               [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PACKAGE DETAILS (auto-filled from preset)                                  │
│  ─────────────────────────────────────────                                  │
│                                                                              │
│  Selected Box: [Medium Box ▼]  ← Auto-selected based on 4 items            │
│                                                                              │
│  Weight: [1.2] kg   Dimensions: [30]×[25]×[15] cm                          │
│          ↑ Calculated: 4 items × 0.3 kg                                    │
│                                                                              │
│  ℹ️ Auto-selected Medium Box for 4 items. [Override manually]              │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  PICKUP LOCATION                                                            │
│  ────────────────                                                           │
│  [Home Office - Gurugram 122001 ▼]  ← From settings default                │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  HANDOVER METHOD (how will you hand package to courier?)                    │
│  ────────────────                                                           │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │ ● 🚚 Courier Pickup         │  │ ○ 🏪 Drop at Hub            │          │
│  │   (recommended)             │  │                             │          │
│  │   Courier comes to your     │  │   I'll take package to      │          │
│  │   pickup location           │  │   nearest courier hub       │          │
│  │                             │  │                             │          │
│  │   Next batch: in 2 hours    │  │   [Find nearest hub →]      │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  COURIER SELECTION                                                          │
│  ─────────────────                                                          │
│                                                                              │
│  Loading rates...                                                           │
│                                                                              │
│  AVAILABLE COURIERS                        Delivery to: Mumbai 400053        │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ ● Delhivery Surface                                                   │ │
│  │   ₹45  |  Est: 4-5 days  |  ⭐ 4.2                     [CHEAPEST]    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ ○ Xpressbees Surface                                                  │ │
│  │   ₹52  |  Est: 3-4 days  |  ⭐ 4.0                                    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ ○ Blue Dart Air                                                       │ │
│  │   ₹95  |  Est: 1-2 days  |  ⭐ 4.5                      [FASTEST]    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Pre-selected: Delhivery (based on settings: Cheapest)                     │
│  Selected: Delhivery Surface - ₹45                                         │
│                                                                              │
│                                         [Cancel]  [Ship Now - ₹45]          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Handover Method Explained:**

| Option | What Happens | When To Use |
|--------|--------------|-------------|
| **🚚 Courier Pickup** | Order added to Redis queue → Cron batches every 2 hours → Pickup scheduled for next day (or same day if before cutoff) | Most sellers - convenient, no travel needed |
| **🏪 Drop at Hub** | No pickup scheduled. Seller takes package to courier hub. Hub scans AWB → Shiprocket auto-updates status via webhook. | Urgent orders, sellers near hub, avoiding pickup fees |

### Backend Flow

```
User clicks "Ship Now - ₹45"
         │
         ▼
┌────────────────────────────────────┐
│ POST /api/stores/[storeId]/        │
│      orders/[orderId]/ship         │
│                                    │
│ Body: {                            │
│   provider: "SHIPROCKET",          │
│   courierId: 123,                  │
│   weight: 1.2,                     │
│   length: 30, breadth: 25,         │
│   height: 15,                      │
│   pickupAddressId: "addr_123",     │
│   handoverMethod: "PICKUP"         │
│     // or "DROPOFF"                │
│ }                                  │
└──────────────┬─────────────────────┘
               │
               ▼
┌────────────────────────────────────┐
│ Backend (for PICKUP):              │
│                                    │
│ 0. Get pickup location NAME        │
│    (Shiprocket uses name, not ID!) │
│    pickupLocationService           │
│      .getPickupLocationName()      │
│                                    │
│ 1. Create Shiprocket order         │
│    POST /orders/create/adhoc       │
│    pickup_location: "Home Office"  │
│    ← Uses location NAME string     │
│                                    │
│ 2. Assign courier & generate AWB   │
│    POST /courier/assign/awb        │
│                                    │
│ 3. Add to pickup queue (Redis)     │
│    pending_pickup:{courierName}    │
│    → Cron batches & schedules      │
│    → POST /courier/generate/pickup │
│                                    │
│ 4. Create Shipment record in DB    │
│    handoverMethod: "PICKUP"        │
│    status: "MANIFESTED"            │
│                                    │
│ 5. Update Order status → SHIPPED   │
│                                    │
│ 6. Send notification to customer   │
│                                    │
│ ⚠️ On Error "pickup location not   │
│    found" → trigger sync →         │
│    refresh UI → user retries       │
└──────────────┬─────────────────────┘
               │
               ▼
┌────────────────────────────────────┐
│ Backend (for DROPOFF):             │
│                                    │
│ 0-2. Same as PICKUP                │
│                                    │
│ 3. NO pickup scheduled!            │
│    Shipment waits for seller       │
│    to drop at courier hub          │
│                                    │
│ 4. Create Shipment record in DB    │
│    handoverMethod: "DROPOFF"       │
│    status: "AWB_GENERATED"         │
│                                    │
│ 5. Update Order → PROCESSING       │
│    (Not SHIPPED until dropped)     │
│                                    │
│ 6. When seller drops at hub:       │
│    → Hub scans AWB barcode         │
│    → Shiprocket webhook received   │
│    → Status → PICKED_UP            │
│    → Order → SHIPPED               │
│    → Customer notification sent    │
└────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────┐
│ Response:                          │
│ {                                  │
│   success: true,                   │
│   shipment: {                      │
│     id: "ship_123",                │
│     awbCode: "AWB123456789",       │
│     courierName: "Delhivery",      │
│     trackingUrl: "https://...",    │
│     labelUrl: "https://...",       │
│     estimatedDelivery: "Jan 12",   │
│     handoverMethod: "PICKUP",      │
│     // or                          │
│     handoverMethod: "DROPOFF",     │
│     nearestHub: { ... }            │
│   }                                │
│ }                                  │
└────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────┐
│ UI Updates:                        │
│ • Close modal                      │
│ • Show success toast               │
│ • Update order status badge        │
│ • Show "Print Label" button        │
│ • Show tracking info               │
│                                    │
│ If PICKUP:                         │
│ • Show "Pickup scheduled for       │
│   tomorrow 9 AM - 6 PM"            │
│                                    │
│ If DROPOFF:                        │
│ • Show "Drop at hub to complete"   │
│ • Show nearest hub address         │
└────────────────────────────────────┘
```

---

## FLOW 2: Batch Ship (Shiprocket) - Up to 20 Orders

### How Batch Selection Works

> **UI Behavior:** There's a "Ship Multiple Orders" button at the top of the orders table. When clicked:
> 1. Checkboxes appear in each row for orders that haven't been shipped yet (status: PAID, PROCESSING)
> 2. Already shipped orders are disabled/grayed out
> 3. User can select up to 20 orders maximum
> 4. Selected count shows in the bulk actions bar
> 5. "Ship Selected" button becomes active

### Trigger
User clicks "Ship Multiple Orders" button → selects orders via checkboxes → clicks "Ship Selected".

### Orders List with Selection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ORDERS                                          [Filter ▼]  [Search...]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ Bulk Actions (3 selected) ──────────────────────────────────────────┐  │
│  │  [🚚 Ship Selected]  [Mark Processing]  [Export]  [✗ Clear]          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────┬────────────────┬─────────────┬──────────┬─────────┬──────────┐  │
│  │  ☑   │ Order          │ Customer    │ Items    │ Total   │ Status   │  │
│  ├──────┼────────────────┼─────────────┼──────────┼─────────┼──────────┤  │
│  │  ☑   │ ORD-ABC123     │ Rahul S.    │ 4 items  │ ₹2,200  │ PAID     │  │
│  │      │ Mumbai 400053  │             │          │         │          │  │
│  ├──────┼────────────────┼─────────────┼──────────┼─────────┼──────────┤  │
│  │  ☑   │ ORD-DEF456     │ Priya M.    │ 2 items  │ ₹800    │ PAID     │  │
│  │      │ Delhi 110001   │             │          │         │          │  │
│  ├──────┼────────────────┼─────────────┼──────────┼─────────┼──────────┤  │
│  │  ☑   │ ORD-GHI789     │ Amit K.     │ 1 item   │ ₹500    │ PAID     │  │
│  │      │ Chennai 600001 │             │          │         │          │  │
│  ├──────┼────────────────┼─────────────┼──────────┼─────────┼──────────┤  │
│  │  ☐   │ ORD-JKL012     │ Sneha P.    │ 3 items  │ ₹1,500  │ SHIPPED  │  │
│  │      │ Pune 411001    │             │ (already shipped)  │          │  │
│  └──────┴────────────────┴─────────────┴──────────┴─────────┴──────────┘  │
│                                                                              │
│  Showing 1-4 of 4 orders                                [1]                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Batch Ship Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Batch Ship - 3 Orders                                                 [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  COMMON SETTINGS                                                            │
│  ────────────────                                                           │
│                                                                              │
│  Pickup Location: [Home Office - Gurugram ▼]                               │
│                                                                              │
│  Handover Method: ● 🚚 Courier Pickup  ○ 🏪 Drop at Hub                    │
│                      (recommended)                                          │
│                                                                              │
│  Courier Selection: ● Cheapest for each route                              │
│                     ○ Same courier for all: [Select ▼]                     │
│                     ○ Fastest for each route                               │
│                                                                              │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ORDER DETAILS (auto-calculated from product dimensions)                    │
│  ───────────────────────────────                                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ORD-ABC123 → Mumbai 400053                                          │   │
│  │ 4 items, 1.2 kg, 30×25×15 cm                                        │   │
│  │ Courier: Delhivery ₹52 (Cheapest)               [Edit details]      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ORD-DEF456 → Delhi 110001                                           │   │
│  │ 2 items, 0.6 kg, 20×15×10 cm                                        │   │
│  │ Courier: DTDC ₹35 (Cheapest)                    [Edit details]      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ORD-GHI789 → Chennai 600001                                         │   │
│  │ 1 item, 0.3 kg, 15×10×8 cm                                          │   │
│  │ Courier: Xpressbees ₹45 (Cheapest)              [Edit details]      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  SUMMARY                                                                    │
│  ───────                                                                    │
│  Total Orders: 3                                                            │
│  Total Shipping: ₹132 (₹52 + ₹35 + ₹45)                                   │
│  Estimated Pickups: 1 (all from same location)                             │
│                                                                              │
│                              [Cancel]  [🚚 Ship All 3 Orders - ₹132]        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```



### "Edit Details" Behavior

> **What Happens:** Clicking "Edit details" on any order row opens the **same Ship Order modal** that appears when shipping an individual order. This allows full customization of that specific order's shipment:
> - Change package dimensions/weight
> - Select different courier
> - Modify pickup location
> - Override auto-calculated values
>
> The modal has **[Save]** and **[Cancel]** buttons. Save updates that order's details in the batch; Cancel discards changes. The batch modal remains open in the background.

### Backend Flow

```
User clicks "Ship All 3 Orders"
         │
         ▼
┌────────────────────────────────────┐
│ POST /api/stores/[storeId]/        │
│      shipments/batch               │
│                                    │
│ Body: {                            │
│   orders: [                        │
│     {                              │
│       orderId: "ord_abc",          │
│       courierId: 123,              │
│       weight: 1.2,                 │
│       dimensions: {...},           │
│     },                             │
│     { orderId: "ord_def", ... },   │
│     { orderId: "ord_ghi", ... }    │
│   ],                               │
│   pickupAddressId: "addr_123",     │
│   handoverMethod: "PICKUP"         │
│     // or "DROPOFF"                │
│ }                                  │
└──────────────┬─────────────────────┘
               │
               ▼
┌────────────────────────────────────┐
│ Backend processes sequentially:    │
│                                    │
│ For each order:                    │
│ 1. Get pickup location NAME        │
│ 2. Create Shiprocket order         │
│ 3. Assign courier & get AWB        │
│ 4. Create Shipment record          │
│    (with handoverMethod)           │
│ 5. Update Order status             │
│                                    │
│ After all orders (if PICKUP):      │
│ 6. Add all to Redis pickup queue   │
│    → 2-hour batch → schedule       │
│                                    │
│ If DROPOFF:                        │
│ 6. No pickup scheduled             │
│    → Status = AWB_GENERATED        │
│                                    │
│ 7. Send notifications              │
└──────────────┬─────────────────────┘
               │
               ▼
┌────────────────────────────────────┐
│ Response:                          │
│ {                                  │
│   success: true,                   │
│   results: [                       │
│     { orderId, awbCode, status },  │
│     { orderId, awbCode, status },  │
│     { orderId, awbCode, status }   │
│   ],                               │
│   handoverMethod: "PICKUP",        │
│   pickupInfo: {                    │
│     nextBatch: "in 2 hours",       │
│     expectedPickup: "tomorrow 9-6" │
│   }                                │
│   // or if DROPOFF:                │
│   // nearestHub: { address, ... }  │
│ }                                  │
└────────────────────────────────────┘
```

---

## FLOW 3: Auto-Ship (Fully Automated)

### Settings Configuration

> **Where Settings Live:** All Auto-Ship settings (enable toggle, wait time, courier selection) are configured in **Settings → Shipping Settings → Auto-Ship Configuration**. The wait time determines how long the system waits after payment before automatically creating the shipment.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AUTO-SHIP SETTINGS                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [✓] Enable Auto-Ship                                                       │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  DELAY BEFORE AUTO-SHIP                                                     │
│  ─────────────────────────                                                  │
│  Wait [30] minutes after payment before creating shipment.                 │
│                                                                              │
│  ℹ️ This gives you time to review/cancel suspicious orders.                │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  COURIER SELECTION                                                          │
│  ──────────────────                                                         │
│  ● Cheapest available courier                                              │
│    Selects lowest-priced courier for each delivery pincode.                │
│  ○ Fastest available courier                                               │
│    Selects courier with shortest estimated delivery time.                  │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  PICKUP SCHEDULING                                                          │
│  ──────────────────                                                         │
│  Pickup Address: [Home Office - Gurugram ▼]                                │
│                                                                              │
│  Default Handover: ● 🚚 Courier Pickup  ○ 🏪 Drop at Hub                   │
│                                                                              │
│  Pickup Cutoff Time: [2:00 PM]                                             │
│  Orders shipped before cutoff → pickup TODAY                               │
│  Orders shipped after cutoff → pickup TOMORROW                             │
│                                                                              │
│  [ ] Skip weekend pickups (schedule for Monday instead)                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  PACKAGE DEFAULTS                                                           │
│  ─────────────────                                                          │
│  Uses your Package Presets for auto-selection.                             │
│  [Configure Presets →]                                                      │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ⚠️ WARNING: Auto-ship cannot be undone once shipment is created.          │
│     Ensure your presets are accurate to avoid shipping disputes.           │
│                                                                              │
│                                                          [Save Settings]    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flow Diagram

```
PAYMENT WEBHOOK RECEIVED (Order PAID)
              │
              ▼
┌─────────────────────────────────┐
│ Check: Is Auto-Ship enabled?    │
│                                 │
│ NO → Just update order status   │
│ YES → Continue below            │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Schedule delayed job:           │
│                                 │
│ await queue.schedule(           │
│   'auto-ship-order',            │
│   { orderId },                  │
│   { delay: '30 minutes' }       │
│ )                               │
│                                 │
│ (Using: BullMQ, Vercel Cron,    │
│  or similar queue system)       │
└──────────────┬──────────────────┘
               │
               │ After 30 minutes
               ▼
┌─────────────────────────────────┐
│ Auto-Ship Job Executes:         │
│                                 │
│ 1. Fetch order                  │
│ 2. Check: Still PAID status?    │
│    (Not cancelled/refunded)     │
│                                 │
│ 3. Auto-select box using        │
│    package presets              │
│                                 │
│ 4. Get shipping rates           │
│                                 │
│ 5. Select courier based on      │
│    settings (cheapest/fastest)  │
│                                 │
│ 6. Create Shiprocket order      │
│                                 │
│ 7. Assign courier & get AWB     │
│                                 │
│ 8. Create Shipment in DB        │
│    (with default handover       │
│     method from settings)       │
│                                 │
│ 9. Update Order → SHIPPED       │
│    (or PROCESSING if DROPOFF)   │
│                                 │
│ 10. If PICKUP:                  │
│     → Add to Redis queue        │
│     → 2-hour batch scheduling   │
│     If DROPOFF:                 │
│     → No pickup scheduled       │
│                                 │
│ 11. Send customer notification  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Order automatically shipped!    │
│ No manual intervention needed.  │
└─────────────────────────────────┘
```

### Implementation Note

```typescript
// src/app/api/webhooks/razorpay/route.ts

// When payment successful:
if (event === 'payment.captured') {
  await prisma.order.update({
    where: { razorpayOrderId },
    data: { isPaid: true, orderStatus: 'PAID', paidAt: new Date() }
  });
  
  // Check auto-ship settings
  const settings = await prisma.storeShippingSettings.findUnique({
    where: { storeId }
  });
  
  if (settings?.autoShipEnabled) {
    // Schedule auto-ship job
    await scheduleAutoShip(orderId, settings.autoShipAfterMinutes);
  }
}

// src/lib/shipping/auto-ship.ts
async function processAutoShip(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true, store: { include: { shippingSettings: true } } }
  });
  
  // Safety check: order still in shippable state?
  if (order.orderStatus !== 'PAID') {
    console.log(`Order ${orderId} no longer PAID, skipping auto-ship`);
    return;
  }
  
  // Auto-select box
  const boxSelection = await selectBox(order.storeId, order);
  
  // Get rates and select courier
  const rates = await shippingService.getRates(order.storeId, {
    pickup: settings.defaultPickupAddress.pincode,
    delivery: order.shippingPincode,
    weight: boxSelection.estimatedWeight,
    ...boxSelection.preset
  });
  
  const selectedCourier = selectCourierByPreference(
    rates, 
    settings.courierPreference // 'cheapest' | 'fastest' | 'rated'
  );
  
  // Create shipment
  await shippingService.createShipment(order.storeId, orderId, {
    provider: 'SHIPROCKET',
    courierId: selectedCourier.courierId,
    ...boxSelection.preset,
    weight: boxSelection.estimatedWeight,
    autoSchedulePickup: true
  });
}
```

---

## FLOW 4: Manual Ship (Speed Post / Self Delivery)

### Ship Order Modal - Manual Tab

> **Courier Options:** The manual shipping modal shows common courier types as radio options for quick selection. Selecting "Other" allows typing any custom courier name. These are just UI helpers - the seller can ship with any courier they want.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Ship Order  #ORD-ABC123                                               [X]  │
├──────────────────────────────────┬──────────────────────────────────────────┤
│  [ Shiprocket ]   [● Manual ]    │                                          │
├──────────────────────────────────┴──────────────────────────────────────────┤
│                                                                              │
│  COURIER SERVICE                                                            │
│  ────────────────                                                           │
│                                                                              │
│  ● India Post (Speed Post)                                                 │
│  ○ Self Delivery (by your staff/vehicle)                                   │
│  ○ Local Courier                                                           │
│  ○ Other: [____________________]                                           │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  TRACKING INFORMATION                                                       │
│  ─────────────────────                                                      │
│                                                                              │
│  AWB / Tracking Number                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ EE123456789IN                                                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│  ℹ️ You can add this later if not available now                            │
│                                                                              │
│  Tracking URL (optional)                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ https://www.indiapost.gov.in/VAS/Pages/trackconsignment.aspx          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  PACKAGE DETAILS (for your records)                                         │
│  ───────────────────────────────────                                        │
│                                                                              │
│  Weight: [1.2] kg   Shipping Cost: [₹ 65]                                  │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ESTIMATED DELIVERY                                                         │
│  ───────────────────                                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 📅 Jan 12, 2026                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  [✓] Send shipping notification to customer                                │
│                                                                              │
│                                    [Cancel]  [Create Shipment]              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Self Delivery Selected

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Ship Order - Self Delivery                                            [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  COURIER SERVICE                                                            │
│  ────────────────                                                           │
│  ○ India Post (Speed Post)                                                 │
│  ● Self Delivery (by your staff/vehicle)                                   │
│  ○ Local Courier                                                           │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ℹ️ Self delivery doesn't require AWB. You'll manually update status       │
│     when order is delivered.                                                │
│                                                                              │
│  Delivery Person (optional)                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Raju - 98765 43210                                                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Notes                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Deliver between 4-6 PM as requested by customer                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Expected Delivery                                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 📅 Tomorrow, Jan 8, 2026                                               │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [✓] Send notification: "Your order is out for delivery"                   │
│                                                                              │
│                                    [Cancel]  [Create Shipment]              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Manual Status Update (Post-Shipment)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Order #ORD-ABC123                                    Status: SHIPPED       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SHIPMENT INFO                                                              │
│  ─────────────                                                              │
│  Method: Self Delivery                                                      │
│  Status: In Transit                                                         │
│  Delivery Person: Raju - 98765 43210                                       │
│  Expected: Jan 8, 2026                                                      │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  TRACKING HISTORY                                                           │
│  ─────────────────                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Jan 7, 10:00 AM - Shipped (Self Delivery)                           │   │
│  │ Jan 7, 10:30 AM - Out for Delivery                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [Update Status ▼]                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ○ Out for Delivery                                                   │   │
│  │ ● Delivered                                                          │   │
│  │ ○ Delivery Failed                                                    │   │
│  │ ○ Return Initiated                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [Mark as Delivered]                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary: All Flows

| Flow | Trigger | Box Selection | Courier Selection | Pickup | Best For |
|------|---------|---------------|-------------------|--------|----------|
| One-Click | Button on order | Auto (editable) | Manual from rates | Auto/Manual | Single orders |
| Batch | Select multiple | Auto per order | Auto/Manual | Single batch | End of day processing |
| Auto-Ship | Payment webhook | Full auto | By settings | Full auto | High volume stores |
| Manual | Button on order | Optional | User enters | N/A | Speed Post, self delivery |

---

*Implementation files complete. Ready to build when you approve architecture!*
