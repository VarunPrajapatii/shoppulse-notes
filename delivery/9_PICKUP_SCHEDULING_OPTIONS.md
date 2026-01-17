# Part 9: Pickup Scheduling Options

## Complete Guide to Pickup & Drop-off Strategies

This document explores all options for getting packages from seller to courier - pickup scheduling, batching, self-drop, and warehouse options.

---

## Table of Contents

1. [Understanding Pickup vs Drop](#understanding-pickup-vs-drop)
2. [Pickup Scheduling Options](#pickup-options)
3. [Drop-off Options](#drop-off-options)
4. [Batching Strategies](#batching-strategies)
5. [Implementation Approaches](#implementation)
6. [Seller Configuration UI](#configuration-ui)
7. [Recommendations](#recommendations)

---

## Understanding Pickup vs Drop

### Two Ways to Hand Over Packages

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              PICKUP vs DROP-OFF                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PICKUP (Courier Comes to You)                                              │
│  ─────────────────────────────                                              │
│                                                                              │
│    ┌─────────┐          ┌─────────┐                                        │
│    │ SELLER  │◄─────────│ COURIER │                                        │
│    │ Location│  Pickup  │  Agent  │                                        │
│    └─────────┘          └─────────┘                                        │
│                                                                              │
│  • Courier comes to seller's address                                        │
│  • Convenient for seller                                                    │
│  • Must wait for pickup window                                              │
│  • May have pickup charges                                                  │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  DROP-OFF (You Go to Courier)                                               │
│  ─────────────────────────────                                              │
│                                                                              │
│    ┌─────────┐          ┌──────────┐                                       │
│    │ SELLER  │─────────►│ COURIER  │                                       │
│    │         │  Drop    │ WAREHOUSE│                                       │
│    └─────────┘          └──────────┘                                        │
│                                                                              │
│  • Seller takes packages to courier facility                               │
│  • Faster - no waiting for pickup                                           │
│  • Often cheaper (no pickup fee)                                           │
│  • More effort for seller                                                   │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  WHEN TO USE EACH:                                                          │
│                                                                              │
│  PICKUP Best For:                     DROP-OFF Best For:                   │
│  • High volume (50+ packages/day)     • Low volume (< 10/day)              │
│  • No vehicle available               • Seller near warehouse              │
│  • Large/heavy packages               • Urgent shipments                    │
│  • Working from home                  • Want to save on fees               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pickup Scheduling Options

### Option 1: Auto-Schedule on Ship

When order is shipped, automatically schedule pickup for next available slot:

```
ORDER SHIPPED (AWB Generated)
    │
    ▼
┌─────────────────────────────────────────┐
│ System automatically:                    │
│                                          │
│ 1. Check current time                    │
│ 2. If before cutoff (e.g., 2 PM):       │
│    → Schedule for TODAY                  │
│ 3. If after cutoff:                      │
│    → Schedule for TOMORROW               │
│                                          │
│ Pickup scheduled: Jan 6, 2026            │
│ Expected time: 2 PM - 6 PM               │
└─────────────────────────────────────────┘
```

**Pros:** Zero effort for seller
**Cons:** Less control over timing

---

### Option 2: Manual Schedule (Seller Chooses)

Seller explicitly schedules pickup after shipping:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📦 Schedule Pickup                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Ready to Pickup: 5 shipments                                               │
│                                                                              │
│  Select Pickup Date:                                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  January 2026                                                          │ │
│  │  Su  Mo  Tu  We  Th  Fr  Sa                                           │ │
│  │              1   2   3   4                                             │ │
│  │  5  [6]  7   8   9  10  11                                            │ │
│  │  12  13  14  15  16  17  18                                           │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Selected: Monday, Jan 6, 2026                                              │
│                                                                              │
│  Pickup Window: [Afternoon (2 PM - 6 PM) ▼]                                │
│                                                                              │
│  Include these shipments:                                                   │
│  ☑ AWB 1234567890 - Rahul (Delhi)                                          │
│  ☑ AWB 1234567891 - Priya (Mumbai)                                         │
│  ☑ AWB 1234567892 - Amit (Chennai)                                         │
│  ☐ AWB 1234567893 - Sneha (Pune) - Already scheduled for Jan 5            │
│                                                                              │
│  [Schedule Pickup]                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Option 3: Batch Pickup (End of Day)

All shipments created during the day get single pickup next day:

```
DAY TIMELINE:
─────────────

8:00 AM  │ Order 1 shipped → Added to pickup batch
10:00 AM │ Order 2 shipped → Added to pickup batch
2:00 PM  │ Order 3 shipped → Added to pickup batch
4:00 PM  │ Order 4 shipped → Added to pickup batch
         │
5:00 PM  │ CUTOFF TIME
         │ ┌────────────────────────────────────────┐
         │ │ Batch Pickup Scheduled:                │
         │ │                                         │
         │ │ Date: Tomorrow (Jan 6)                 │
         │ │ Shipments: 4                           │
         │ │ Pickup ID: PK-12345                    │
         │ │                                         │
         │ │ Seller notified via email              │
         │ └────────────────────────────────────────┘
         │
6:00 PM  │ Order 5 shipped → Goes to NEXT batch
```

---

### Option 4: Recurring Pickup Schedule

Fixed pickup days/times regardless of order count:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ Recurring Pickup Schedule                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ☑ Enable recurring pickup schedule                                        │
│                                                                              │
│  Pickup Days:                                                               │
│  ☑ Monday    ☑ Tuesday    ☑ Wednesday                                      │
│  ☑ Thursday  ☑ Friday     ☐ Saturday                                       │
│                                                                              │
│  Pickup Time: [3:00 PM - 5:00 PM ▼]                                        │
│                                                                              │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  Your Schedule:                                                             │
│  • Every weekday at 3:00 PM - 5:00 PM                                      │
│  • Courier will attempt pickup even if no packages                         │
│  • Cancel within 2 hours if no packages                                    │
│                                                                              │
│  ☑ Auto-cancel pickup if no packages ready                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Best for:** High-volume sellers with predictable order flow

---

## Drop-off Options

### Option 1: Self Drop to Warehouse

Seller takes packages to courier warehouse:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📍 Nearby Drop-off Points                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Your Location: Koramangala, Bangalore                                      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🏢 Delhivery - Koramangala Hub                           2.3 km     │   │
│  │    123, 4th Block, Koramangala                                      │   │
│  │    Hours: 9 AM - 8 PM (Mon-Sat)                                     │   │
│  │    [Get Directions]  [Generate Manifest]                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🏢 BlueDart - HSR Layout                                 3.8 km     │   │
│  │    456, Sector 2, HSR Layout                                        │   │
│  │    Hours: 10 AM - 7 PM (Mon-Sat)                                    │   │
│  │    [Get Directions]  [Generate Manifest]                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🏢 Shiprocket Fulfillment Center                         5.2 km     │   │
│  │    789, Electronic City Phase 1                                     │   │
│  │    Hours: 24/7                                                       │   │
│  │    [Get Directions]  [Generate Manifest]                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Dropping off 8 packages today?                                            │
│  [Generate Drop-off Manifest] - Required document for drop-off             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Manifest Generation:**

```typescript
// Generate manifest for drop-off
async function generateDropOffManifest(storeId: string, awbCodes: string[]) {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      awbCode: { in: awbCodes }
    }
  });
  
  // Create manifest document
  const manifest = {
    generatedAt: new Date(),
    store: await prisma.store.findUnique({ where: { id: storeId } }),
    packages: orders.map(o => ({
      awb: o.awbCode,
      courier: o.courierName,
      destination: `${o.city}, ${o.state} - ${o.pincode}`,
      weight: o.weight,
      value: o.totalAmount
    })),
    totalPackages: orders.length,
    totalWeight: orders.reduce((sum, o) => sum + (o.weight || 0), 0)
  };
  
  // Generate PDF
  const pdfUrl = await generateManifestPDF(manifest);
  
  return { manifest, pdfUrl };
}
```

---

### Option 2: Drop to Partner Store

Third-party pickup points (like Amazon lockers):

```
PARTNER STORE NETWORK:
──────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│  📍 Partner Drop Points                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🏪 Reliance Digital - Forum Mall                        1.1 km      │   │
│  │    All couriers accepted                                            │   │
│  │    Hours: 10 AM - 9 PM                                              │   │
│  │    ★★★★☆ (42 reviews)                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🏪 Apollo Pharmacy - 5th Block                          0.8 km      │   │
│  │    Delhivery, Ecom Express only                                     │   │
│  │    Hours: 8 AM - 10 PM                                              │   │
│  │    ★★★★★ (28 reviews)                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Note: Shiprocket provides these via their drop-off network
```

---

### Option 3: Half-Day / Full-Day Drop Batching

Seller batches drop-offs by time of day:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📦 Drop-off Batching                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  MORNING BATCH (Orders before 12 PM)                                        │
│  ────────────────────────────────────                                       │
│  Drop by: 2 PM today                                                        │
│  Packages: 12                                                               │
│  [Generate Morning Manifest]                                                │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  EVENING BATCH (Orders 12 PM - 6 PM)                                        │
│  ───────────────────────────────────                                        │
│  Drop by: 8 PM today OR 10 AM tomorrow                                     │
│  Packages: 8                                                                │
│  [Generate Evening Manifest]                                                │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  Configure Batching:                                                        │
│                                                                              │
│  ○ Single batch (all orders, one manifest)                                 │
│  ● Two batches (morning + evening)                                         │
│  ○ Three batches (morning + afternoon + evening)                           │
│                                                                              │
│  Batch cutoff times:                                                        │
│  Morning: [12:00 PM ▼]                                                      │
│  Evening: [6:00 PM ▼]                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

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

### Smart Grouping

Group packages intelligently:

```typescript
interface GroupingStrategy {
  byCourier: boolean;      // Group by courier company
  byRoute: boolean;        // Group by destination zone
  byTime: boolean;         // Group by order time (morning/evening)
  byPriority: boolean;     // Express vs standard
  bySize: boolean;         // Heavy vs light packages
}

async function groupPackagesForHandover(
  storeId: string,
  strategy: GroupingStrategy
) {
  const packages = await getPendingHandoverPackages(storeId);
  
  const groups = new Map<string, Package[]>();
  
  for (const pkg of packages) {
    let groupKey = '';
    
    if (strategy.byCourier) {
      groupKey += pkg.courierCode + '_';
    }
    if (strategy.byRoute) {
      groupKey += getZone(pkg.pincode) + '_';
    }
    if (strategy.byTime) {
      groupKey += getTimeBatch(pkg.createdAt) + '_';
    }
    if (strategy.byPriority) {
      groupKey += pkg.isExpress ? 'express_' : 'standard_';
    }
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(pkg);
  }
  
  return Array.from(groups.entries()).map(([key, packages]) => ({
    groupId: key,
    packages,
    courier: packages[0].courierName,
    count: packages.length,
    totalWeight: packages.reduce((sum, p) => sum + p.weight, 0)
  }));
}
```

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

## Recommendations

### For ShopPulse (Default Settings)

```typescript
const RECOMMENDED_DEFAULTS = {
  // For new stores
  small: { // < 10 orders/day
    handoverMethod: 'PICKUP',
    autoSchedulePickup: true,
    batchPickupEnabled: true,
    pickupCutoffHour: 14,
    dropBatchingMode: 'SINGLE'
  },
  
  // For growing stores
  medium: { // 10-50 orders/day
    handoverMethod: 'PICKUP',
    autoSchedulePickup: true,
    batchPickupEnabled: true,
    pickupCutoffHour: 16,
    dropBatchingMode: 'HALF_DAY',
    pipelineEnabled: true
  },
  
  // For high-volume stores
  large: { // 50+ orders/day
    handoverMethod: 'MIXED',
    recurringPickupEnabled: true,
    recurringPickupDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    recurringPickupTime: '15:00',
    dropBatchingMode: 'HALF_DAY',
    pipelineEnabled: true,
    autoProcessPipeline: true
  }
};
```

## Summary

| Option | Effort (Seller) | Control | Best For |
|--------|-----------------|---------|----------|
| Auto Pickup | ★☆☆☆☆ | ★★☆☆☆ | Small stores |
| Manual Pickup | ★★★☆☆ | ★★★★★ | Variable volume |
| Batch Pickup | ★★☆☆☆ | ★★★☆☆ | Medium stores |
| Recurring Pickup | ★☆☆☆☆ | ★★☆☆☆ | High volume |
| Self Drop | ★★★★☆ | ★★★★★ | Near warehouse |
| Half-Day Batching | ★★★☆☆ | ★★★★☆ | Flexible |

**Start with:** Auto-schedule + Batch pickup
**Add later:** Pipeline + Smart grouping

---
