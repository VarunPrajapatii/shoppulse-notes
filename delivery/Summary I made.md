
## Order Lifecycle Overview

### The Complete Picture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              COMPLETE ORDER LIFECYCLE IN E-COMMERCE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   CUSTOMER SIDE                    │         SELLER SIDE                    │
│   ─────────────                    │         ───────────                    │
│                                    │                                         │
│   ┌─────────────────┐              │                                         │
│   │  Browse Store   │              │                                         │
│   └────────┬────────┘              │                                         │
│            │                       │                                         │
│            ▼                       │                                         │
│   ┌─────────────────┐              │                                         │
│   │  Add to Cart    │              │                                         │
│   └────────┬────────┘              │                                         │
│            │                       │                                         │
│            ▼                       │                                         │
│   ┌─────────────────┐              │                                         │
│   │  Enter Address  │              │                                         │
│   │  + Phone        │              │                                         │
│   └────────┬────────┘              │                                         │
│            │                       │                                         │
│            ▼                       │                                         │
│   ┌─────────────────┐              │                                         │
│   │  Make Payment   │              │                                         │
│   │  (Razorpay)     │──────────────┼────► Order Created                     │
│   └────────┬────────┘              │      Status: PAID                       │
│            │                       │            │                            │
│            │                       │            ▼                            │
│   ┌────────┴────────┐              │   ┌───────────────────┐                │
│   │  Order          │              │   │  📬 Notification  │                │
│   │  Confirmation   │◄─────────────┼───│  New Order Alert  │                │
│   │  Email/SMS      │              │   └─────────┬─────────┘                │
│   └────────┬────────┘              │             │                          │
│            │                       │             ▼                          │
│            │                       │   ┌───────────────────┐                │
│   Waiting  │                       │   │  Review Order     │                │
│            │                       │   │  - Verify details │                │
│            │                       │   │  - Check stock    │                │
│            │                       │   │  - Check address  │                │
│            │                       │   └─────────┬─────────┘                │
│            │                       │             │                          │
│            │                       │             ▼                          │
│            │                       │   ┌───────────────────┐                │
│            │                       │   │  Accept Order     │                │
│   ┌────────┴────────┐              │   │  Status:          │                │
│   │  Order          │◄─────────────┼───│  PROCESSING       │                │
│   │  Processing     │              │   └─────────┬─────────┘                │
│   │  Notification   │              │             │                          │
│   └────────┬────────┘              │             ▼                          │
│            │                       │   ┌───────────────────┐                │
│            │                       │   │  Pick & Pack      │                │
│            │                       │   │  - Get product    │                │
│            │                       │   │  - Quality check  │                │
│            │                       │   │  - Package it     │                │
│            │                       │   └─────────┬─────────┘                │
│            │                       │             │                          │
│            │                       │             ▼                          │
│            │                       │   ┌───────────────────┐                │
│   ┌────────┴────────┐              │   │  Create Shipment  │                │
│   │  Shipped        │◄─────────────┼───│  - Generate AWB   │                │
│   │  Notification   │              │   │  - Print label    │                │
│   │  + Tracking #   │              │   │  Status: SHIPPED  │                │
│   └────────┬────────┘              │   └─────────┬─────────┘                │
│            │                       │             │                          │
│            │                       │             ▼                          │
│            │                       │   ┌───────────────────┐                │
│            │                       │   │  Handover         │                │
│            │                       │   │  - Courier pickup │                │
│            │                       │   │  - Or drop off    │                │
│            │                       │   └───────────────────┘                │
│            │                       │                                         │
│            ▼                       │                                         │
│   ┌─────────────────┐              │                                         │
│   │  Track Order    │              │                                         │
│   │  via AWB Link   │              │                                         │
│   └────────┬────────┘              │                                         │
│            │                       │                                         │
│            ▼                       │                                         │
│   ┌─────────────────┐              │                                         │
│   │  Receive Order  │              │   Webhook: DELIVERED                   │
│   │  Status:        │◄─────────────┼─────────────────────────               │
│   │  DELIVERED      │              │                                         │
│   └─────────────────┘              │                                         │
│                                    │                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```




### Current ShopPulse Status Enum vs Proposed

```
CURRENT (schema.prisma):              PROPOSED (Enhanced):
─────────────────────────             ─────────────────────

enum OrderStatus {                    enum OrderStatus {
  PENDING                               PENDING
  PAYMENT_INITIATED                     PAYMENT_INITIATED
  PAID                                  PAID
  PROCESSING       ◄─ underutilized     CONFIRMED         ◄─ new (seller accepted)
  SHIPPED          ◄─ underutilized     PROCESSING        ◄─ being packed
  DELIVERED        ◄─ underutilized     READY_TO_SHIP     ◄─ new (awaiting pickup)
  CANCELLED                             SHIPPED
  REFUNDED                              OUT_FOR_DELIVERY  ◄─ new
}                                       DELIVERED
                                        DELIVERY_FAILED   ◄─ new
                                        RTO_IN_TRANSIT    ◄─ new
                                        RTO_DELIVERED     ◄─ new
                                        CANCELLED
                                        REFUNDED
                                      }
```


### Status Definitions & Actions

| Status | Definition | Who Sets It | Next Allowed Status |
|--------|------------|-------------|---------------------|
| `PENDING` | Order created, awaiting payment | System (automatic) | PAYMENT_INITIATED |
| `PAYMENT_INITIATED` | Customer opened Razorpay | System (automatic) | PAID, PENDING |
| `PAID` | Payment confirmed | Webhook (automatic) | PROCESSING, CANCELLED |
| `PROCESSING` | Seller accepted, preparing | Seller (manual) | SHIPPED, CANCELLED |
| `SHIPPED` | Handed to courier, AWB assigned | Seller/API (manual/auto) | DELIVERED, RTO_IN_TRANSIT |
| `DELIVERED` | Customer received | Webhook (automatic) | REFUNDED (if return) |
| `RTO_IN_TRANSIT` | Returning to seller | Webhook (automatic) | RTO_DELIVERED |
| `RTO_DELIVERED` | Returned to seller | Webhook (automatic) | REFUNDED |
| `CANCELLED` | Order cancelled | Seller/Customer | REFUNDED |
| `REFUNDED` | Money returned | System (automatic) | - (terminal state) |






## Batching Strategies

### Pipeline Approach (Industry Standard)

Process orders in stages like a manufacturing pipeline:

```
ORDER PIPELINE:
───────────────

Stage 1: NEW ORDERS
┌─────────────────────────────┐
│ Orders waiting for payment  │
│ verification / review       │
└──────────────┬──────────────┘
               │ Auto-move when verified
               ▼
Stage 2: READY TO SHIP
┌─────────────────────────────┐
│ Verified, need shipment     │
│ creation + AWB generation   │
└──────────────┬──────────────┘
               │ Batch process (hourly/daily)
               ▼
Stage 3: AWB GENERATED
┌─────────────────────────────┐
│ Has AWB, needs pickup/drop  │
│ Label ready to print        │
└──────────────┬──────────────┘
               │ Group by courier/route
               ▼
Stage 4: READY FOR HANDOVER
┌─────────────────────────────┐
│ Grouped by:                 │
│ - Courier (Delhivery batch) │
│ - Route (Delhi batch)       │
│ - Time (Morning batch)      │
└──────────────┬──────────────┘
               │ Physical handover
               ▼
Stage 5: HANDED OVER
┌─────────────────────────────┐
│ Manifest generated          │
│ Tracking "Shipped"          │
└─────────────────────────────┘
```

**Dashboard View:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📦 Order Pipeline                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐             │
│  │ New (5)   │ → │ Ready (12)│ → │ AWB (8)   │ → │ Handover  │             │
│  │           │   │           │   │ Generated │   │ (15)      │             │
│  └───────────┘   └───────────┘   └───────────┘   └───────────┘             │
│                                                                              │
│  [Process Ready → AWB]  [Group for Handover]  [Generate Manifest]          │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  Handover Groups:                                                           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🚚 Delhivery - Morning Batch                              8 pkgs    │   │
│  │    Drop by: 2 PM at Koramangala Hub                                │   │
│  │    [Print Labels]  [Generate Manifest]  [Mark Handed Over]         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🚚 BlueDart - Morning Batch                               4 pkgs    │   │
│  │    Pickup scheduled: 3 PM                                          │   │
│  │    [Print Labels]  [View Details]                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🚚 DTDC - Evening Batch                                   3 pkgs    │   │
│  │    Group at 4 PM                                                   │   │
│  │    [Add More]                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

Group packages intelligently:

```typescript
interface GroupingStrategy {
  byCourier: boolean;      // Group by courier company
  byRoute: boolean;        // Group by destination zone
  byTime: boolean;         // Group by order time (morning/evening)
  byPriority: boolean;     // Express vs standard
  bySize: boolean;         // Heavy vs light packages
}


---



## Implementation

### Store Settings Schema

```prisma
model Store {
  // ... existing fields
  
  // Pickup/Drop Configuration
  handoverMethod        HandoverMethod @default(PICKUP)
  
  // Pickup Settings
  pickupCutoffHour      Int     @default(14)      // 2 PM
  batchPickupEnabled    Boolean @default(true)
  recurringPickupDays   String? // JSON: ["MON", "TUE", "WED", "THU", "FRI"]
  recurringPickupTime   String? // "15:00"
  skipWeekendPickup     Boolean @default(true)
  autoSchedulePickup    Boolean @default(true)
  
  // Drop-off Settings
  preferredDropLocation String? // Saved drop-off point ID
  dropBatchingMode      DropBatchMode @default(SINGLE)
  morningBatchCutoff    String? // "12:00"
  eveningBatchCutoff    String? // "18:00"
  
  // Pipeline Settings
  pipelineEnabled       Boolean @default(false)
  autoProcessPipeline   Boolean @default(false)
  pipelineProcessTime   String? // "17:00"
}

enum HandoverMethod {
  PICKUP      // Courier comes to seller
  DROP_OFF    // Seller goes to warehouse
  MIXED       // Seller chooses per batch
}

enum DropBatchMode {
  SINGLE      // One batch per day
  HALF_DAY    // Morning + Evening
  CUSTOM      // Custom time slots
}
```

---

### API Endpoints

```typescript
// Pickup Scheduling APIs
POST /api/[storeId]/shipping/pickup/schedule
POST /api/[storeId]/shipping/pickup/batch
POST /api/[storeId]/shipping/pickup/recurring
DELETE /api/[storeId]/shipping/pickup/[pickupId]

// Drop-off APIs
GET /api/[storeId]/shipping/drop-points
POST /api/[storeId]/shipping/manifest/generate
POST /api/[storeId]/shipping/manifest/[manifestId]/confirm-drop

// Pipeline APIs
GET /api/[storeId]/shipping/pipeline
POST /api/[storeId]/shipping/pipeline/process-stage
POST /api/[storeId]/shipping/pipeline/group
```

---

## Configuration UI

### Complete Shipping Settings Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ Shipping & Handover Settings                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  HOW DO YOU HAND OVER PACKAGES?                                             │
│  ─────────────────────────────────                                          │
│                                                                              │
│  ● Pickup (Courier comes to me)                                            │
│  ○ Drop-off (I go to warehouse)                                            │
│  ○ Mixed (Choose per batch)                                                │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  PICKUP SETTINGS                                                            │
│  ───────────────                                                            │
│                                                                              │
│  When should pickup be scheduled?                                           │
│                                                                              │
│  ○ Automatically when I ship                                               │
│  ● End of day batch (all orders together)                                  │
│  ○ I'll schedule manually                                                  │
│  ○ Recurring schedule (same days every week)                               │
│                                                                              │
│  Daily cutoff time: [2:00 PM ▼]                                            │
│  Orders after cutoff go to next day's pickup                               │
│                                                                              │
│  ☑ Skip weekends (no Saturday/Sunday pickup)                               │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  BATCHING MODE                                                              │
│  ─────────────                                                              │
│                                                                              │
│  How do you want to batch shipments?                                        │
│                                                                              │
│  ○ Single batch (all orders daily)                                         │
│  ● Two batches (morning + evening)                                         │
│  ○ By courier (separate batch per courier)                                 │
│                                                                              │
│  Morning batch cutoff: [12:00 PM ▼]                                        │
│  Evening batch cutoff: [6:00 PM ▼]                                         │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  ADVANCED: PIPELINE MODE                                                    │
│  ────────────────────────                                                   │
│                                                                              │
│  ☐ Enable order pipeline                                                   │
│    Process orders in stages for better organization                        │
│                                                                              │
│  [Save Settings]                                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---
