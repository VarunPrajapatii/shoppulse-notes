# Shiprocket Pickup Scheduling - Complete Implementation Guide

> **Last Updated:** January 14, 2026  
> **Related Docs:** `UNIFIED_PICKUP_PIPELINE_ANALYSIS.md`, `0.2_SHIPPING_FLOW_ENHANCEMENTS.md`, `REDIS_QUEUE_MULTI_TENANT_PICKUP_GUIDE.md`

## Table of Contents
1. [Overview](#1-overview)
2. [Handover Methods](#2-handover-methods)
3. [Shiprocket Pickup Flow](#3-shiprocket-pickup-flow)
4. [Pickup Scheduling APIs](#4-pickup-scheduling-apis)
5. [Manifest Generation](#5-manifest-generation)
6. [Real-World Implementation Patterns](#6-real-world-implementation-patterns)
7. [Unified Pickup Pipeline Strategy](#7-unified-pickup-pipeline-strategy)
8. [Edge Cases & Troubleshooting](#8-edge-cases--troubleshooting)
9. [Integration Features for ShopPulse](#9-integration-features-for-shoppulse)
10. [Implementation Checklist](#10-implementation-checklist)

---

## Quick Reference: What We're Building

| Feature | Status | Description |
|---------|--------|-------------|
| Batch Ship | ✅ DONE | Select orders → Ship together → Queue for pickup |
| One-Click Ship | ✅ DONE | Quick ship from order details → Queue for pickup |
| Auto-Ship | 🔴 TODO | Auto after payment → Queue for pickup (needs BullMQ) |
| Manual Ship | ✅ Different | Seller enters AWB manually (NO queue) |
| Core Pickup Queue | ✅ DONE | `pickup-queue.ts` with Redis-based batching |
| Master Pickup Cron | ✅ DONE | `/api/cron/pickup-scheduler` (hourly 8AM-8PM) |
| Health Check Cron | ✅ DONE | `/api/cron/pickup-health` (every 30 mins) |
| Status Tracking | ✅ DONE | PICKUP_QUEUED/SCHEDULED/FAILED in enum |
| Pickup Settings UI | ✅ DONE | `PickupSettingsSection` component |
| Weekend Settings | ✅ DONE | skipWeekendPickup in settings |
| Retry Endpoint | ✅ DONE | `/api/[storeId]/shipments/retry-pickup` |
| Queue Status API | ✅ DONE | `/api/[storeId]/shipments/queue-status` |
| Future Date Pickup | 🔴 TODO | Pick specific date for pickup |

> **Important:** Only Shiprocket flows (Batch, One-Click, Auto) use the pickup queue. Manual Ship does NOT use the queue.

---

## 1. Overview

### What is Pickup Scheduling?

Pickup scheduling is the process of requesting a courier partner to collect shipments from your warehouse/pickup location. It's a critical step in the shipping workflow that connects shipment creation with actual physical pickup.

### The Shiprocket Shipping Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SHIPROCKET SHIPPING LIFECYCLE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ORDER              SHIPMENT              PICKUP                DELIVERY    │
│  ┌─────┐           ┌─────────┐          ┌───────────┐          ┌─────────┐ │
│  │Create│ ────────▶│ AWB     │─────────▶│ Schedule  │─────────▶│ Track   │ │
│  │Order │          │ Assign  │          │ Pickup    │          │ & Track │ │
│  └─────┘           └─────────┘          └───────────┘          └─────────┘ │
│                          │                    │                             │
│                          ▼                    ▼                             │
│                    ┌─────────┐          ┌───────────┐                      │
│                    │ Label   │          │ Manifest  │                      │
│                    │Generate │          │ Generate  │                      │
│                    └─────────┘          └───────────┘                      │
│                                                                             │
│  Status Codes:     1-2                  3-5                    6-7+        │
│  AWB Assigned  →   Label Generated  →   Pickup Scheduled  →   Shipped     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Terminology

| Term | Description |
|------|-------------|
| **AWB (Air Waybill)** | Unique tracking number assigned by courier |
| **Pickup Location** | Physical address where courier picks up shipments |
| **Pickup Token** | Reference number for scheduled pickup |
| **Manifest** | Document listing all shipments for a pickup |
| **Cutoff Time** | Latest time for pickup scheduling (usually 11 AM - 2 PM) |
| **Handover Method** | How seller gives package to courier (Pickup vs Dropoff) |

---

## 2. Handover Methods

Shiprocket supports two ways to hand over packages to couriers:

### 2.1 Courier Pickup (🚚 PICKUP)

**How it works:**
1. Seller schedules pickup via API/dashboard
2. Courier visits seller's pickup location
3. Courier scans AWBs and takes packages
4. Status updates to "Picked Up"

**Best for:**
- High-volume sellers
- Sellers without nearby courier hubs
- Bulk shipments
- Convenience priority

**Workflow:**
```
Order Paid → Create Shipment → AWB Assigned → Schedule Pickup → Generate Manifest → Courier Arrives → Scan & Pickup → In Transit
```

### 2.2 Self Drop-off (🏪 DROPOFF)

**How it works:**
1. Seller creates shipment with AWB
2. Seller physically takes package to courier hub
3. Hub scans AWB
4. Shiprocket webhook updates status

**Best for:**
- Low-volume sellers
- Urgent/same-day shipments
- Sellers near courier hubs
- Cost-conscious sellers (sometimes cheaper)

**Workflow:**
```
Order Paid → Create Shipment → AWB Assigned → Seller Prints Label → Drops at Hub → Hub Scans → In Transit
```

### Comparison Table

| Aspect | Courier Pickup | Self Drop-off |
|--------|----------------|---------------|
| **Convenience** | ✅ High - courier comes to you | ❌ Low - you go to hub |
| **Speed** | Depends on schedule | ✅ Immediate (same-day possible) |
| **Cost** | May have pickup charges | Sometimes discounted |
| **Cutoff Time** | Typically 11 AM - 2 PM | Hub operating hours |
| **Bulk Shipments** | ✅ Efficient | ❌ Inconvenient |
| **API Complexity** | Higher (schedule + manifest) | Lower (just create shipment) |

---

## 3. Shiprocket Pickup Flow

### 3.1 Complete Pickup Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SHIPROCKET PICKUP SCHEDULING FLOW                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────────┐                                                      │
│   │  1. CREATE ORDER │◄──────── POST /orders/create/adhoc                   │
│   └────────┬─────────┘          (includes pickup_location NAME)             │
│            │                                                                │
│            ▼                                                                │
│   ┌──────────────────┐                                                      │
│   │ 2. ASSIGN AWB    │◄──────── POST /courier/assign/awb                    │
│   └────────┬─────────┘          (shipment_id, courier_id)                   │
│            │                                                                │
│            ▼                                                                │
│   ┌──────────────────┐                                                      │
│   │ 3. GENERATE LABEL│◄──────── POST /courier/generate/label                │
│   └────────┬─────────┘          (shipment_id array)                         │
│            │                                                                │
│            │  ←──── HANDOVER METHOD CHECK                                   │
│            │                                                                │
│            ├─────────────────────────┬──────────────────────────┐           │
│            │                         │                          │           │
│            ▼                         ▼                          │           │
│   ┌────────────────┐        ┌────────────────┐                  │           │
│   │    PICKUP      │        │   DROPOFF      │                  │           │
│   └────────┬───────┘        └────────┬───────┘                  │           │
│            │                         │                          │           │
│            ▼                         ▼                          │           │
│   ┌──────────────────┐      ┌────────────────┐                  │           │
│   │4. SCHEDULE PICKUP│      │Seller takes to │                  │           │
│   │                  │      │courier hub     │                  │           │
│   │POST /courier/    │      └────────┬───────┘                  │           │
│   │   generate/pickup│               │                          │           │
│   └────────┬─────────┘               │                          │           │
│            │                         │                          │           │
│            ▼                         │                          │           │
│   ┌──────────────────┐               │                          │           │
│   │5. GEN MANIFEST   │               │                          │           │
│   │                  │               │                          │           │
│   │POST /manifests/  │               │                          │           │
│   │       generate   │               │                          │           │
│   └────────┬─────────┘               │                          │           │
│            │                         │                          │           │
│            ▼                         ▼                          │           │
│   ┌──────────────────────────────────────────────┐              │           │
│   │            COURIER PICKUP / HUB SCAN          │              │           │
│   │                                               │              │           │
│   │  Webhook: Status → PICKED_UP (status_code: 42)│              │           │
│   └──────────────────────────────────────────────┘              │           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Status Code Progression

```
1  → AWB Assigned
2  → Label Generated  
3  → Pickup Scheduled ←─── After calling /courier/generate/pickup
4  → Pickup Queued
5  → Manifest Generated ←─── After calling /manifests/generate
6  → Shipped
42 → Picked Up
```

---

## 4. Pickup Scheduling APIs

### 4.1 Schedule Pickup Request

**Endpoint:** `POST /courier/generate/pickup`

This is THE key API for pickup scheduling.
```javascript
// Request
{
  "shipment_id": [16090109, 16090110, 16090111]  // Array of shipment IDs
}
```

```javascript
// Response
{
  "pickup_status": 1,
  "response": {
    "pickup_scheduled_date": "2024-01-15 14:00:00",
    "pickup_token_number": "Reference No: 194_DELHIVERY_15012024",
    "status": 3,
    "data": "Pickup is confirmed by Delhivery For AWB :- 143254213727423, 143254213727424"
  }
}
```

**Important Notes:**
- AWB must already be assigned
- Only ONE shipment_id array per request
- Can schedule for future date using `pickup_date` parameter
- Pickup on holidays/Sundays → automatically scheduled for next available day

### 4.2 Schedule Pickup with Future Date

```javascript
// Request for specific date
{
  "shipment_id": [16090109],
  "pickup_date": ["2024-01-20"]  // Format: YYYY-MM-DD
}
```

### 4.3 Retry Failed Pickup

```javascript
// Retry a failed pickup request
{
  "shipment_id": [16090109],
  "status": "retry"
}
```

### 4.4 Bulk Pickup Considerations

**Batch by Courier:** Shiprocket schedules pickups per courier. If you have orders with different couriers, you get multiple pickup requests:

```javascript
// 10 orders: 6 Delhivery, 4 Blue Dart
// Result: 2 separate pickup tokens
// - 1 Delhivery pickup for 6 shipments
// - 1 Blue Dart pickup for 4 shipments
```

---

## 5. Manifest Generation

### 5.1 What is a Manifest?

A **manifest** is a pickup summary document that:
- Lists all shipments for a specific pickup
- Contains AWB numbers, customer details, weight, etc.
- Required by courier during physical pickup
- Acts as proof of handover

### 5.2 Generate Manifest API

**Endpoint:** `POST /manifests/generate`

```javascript
// Request
{
  "shipment_id": [222002884, 222002885]
}
```

```javascript
// Response  
{
  "status": 1,
  "manifest_url": "https://s3-ap-southeast-1.amazonaws.com/kr-shipmultichannel/25149/manifest/MANIFEST-4757.pdf",
  "manifest_id": 4757,
  "shipment_count": 2
}
```

### 5.3 When to Generate Manifest?

```
✅ AFTER: Pickup is scheduled
✅ BEFORE: Courier arrives for pickup
❌ NOT BEFORE: AWB assignment
```

### 5.4 Manifest vs Label

| Document | Purpose | Contains | Generate When |
|----------|---------|----------|---------------|
| **Label** | Stick on package | AWB barcode, addresses | After AWB assigned |
| **Manifest** | Give to courier | List of all AWBs | After pickup scheduled |

---

## 6. Real-World Implementation Patterns

### 6.1 Pattern 1: Immediate Pickup (Simple but Inefficient)

### 6.2 Pattern 2: Batch Pickup (Better)

### 6.3 Pattern 3: Time-Based Batching (Enterprise Grade)

This is what large e-commerce companies use:

```javascript
// ✅✅ Best: Unified pickup pipeline with scheduled batches
class UnifiedPickupPipeline {
  constructor() {
    this.pickupSlots = ['10:00', '14:00', '18:00']; // Configurable
    this.batchWindow = 2; // hours
  }
  
  async queueForPickup(shipment) {
    // Don't schedule immediately - add to queue
    const nextSlot = this.getNextPickupSlot();
    await redis.sadd(`pickup:${shipment.storeId}:${shipment.courier}:${nextSlot}`, shipment.id);
  }
  
  async processBatch() {
    // Cron runs every 2 hours
    const queues = await redis.keys('pickup:*');
    
    for (const queue of queues) {
      const shipmentIds = await redis.smembers(queue);
      if (shipmentIds.length > 0) {
        await shiprocket.schedulePickup(shipmentIds);
        await shiprocket.generateManifest(shipmentIds);
        await redis.del(queue);
      }
    }
  }
}
```

---

## 7. Unified Pickup Pipeline Strategy

### 7.1 The Problem with Multiple Flows

In ShopPulse, shipments can come from:
1. **Manual Ship** - Seller clicks "Ship Order"
2. **Batch Ship** - Seller selects multiple orders
3. **One-Click Ship** - Quick ship from order details
4. **Auto-Ship** - Automatic shipping after payment

Without unification, each flow handles pickup scheduling differently → complexity nightmare.

### 7.2 The Solution: Unified Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UNIFIED PICKUP PIPELINE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ALL SHIPMENT CREATION FLOWS                                                │
│  ┌──────────┬──────────┬──────────┬──────────┐                             │
│  │  Manual  │  Batch   │One-Click │ Auto-Ship│                             │
│  │   Ship   │   Ship   │   Ship   │  (Future)│                             │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┘                             │
│       │          │          │          │                                    │
│       └──────────┴──────────┴──────────┘                                    │
│                      │                                                      │
│                      ▼                                                      │
│            ┌──────────────────┐                                             │
│            │  Create Shipment │                                             │
│            │  + Assign AWB    │                                             │
│            └────────┬─────────┘                                             │
│                     │                                                       │
│                     ▼                                                       │
│            ┌──────────────────┐                                             │
│            │ Check Handover   │                                             │
│            │    Method        │                                             │
│            └────────┬─────────┘                                             │
│                     │                                                       │
│         ┌──────────┴───────────┐                                            │
│         │                      │                                            │
│         ▼                      ▼                                            │
│  ┌─────────────┐       ┌─────────────┐                                      │
│  │   PICKUP    │       │   DROPOFF   │                                      │
│  └──────┬──────┘       └──────┬──────┘                                      │
│         │                     │                                             │
│         ▼                     ▼                                             │
│  ┌─────────────┐       ┌─────────────┐                                      │
│  │ Add to Redis│       │    DONE!    │                                      │
│  │   Queue     │       │ No pickup   │                                      │
│  └──────┬──────┘       │ scheduling  │                                      │
│         │              │ needed      │                                      │
│         │              └─────────────┘                                      │
│         ▼                                                                   │
│  ┌─────────────────────────────────┐                                        │
│  │     PICKUP QUEUE (Redis)        │                                        │
│  │                                 │                                        │
│  │  Key: pickup:{storeId}:{courier}:{slot}                                 │
│  │  Value: Set of shipment IDs     │                                        │
│  └────────────────┬────────────────┘                                        │
│                   │                                                         │
│                   │  ◄─── CRON JOB (every 2 hours)                          │
│                   ▼       or configurable: 1/2/4/6 hours / once daily      │
│  ┌─────────────────────────────────┐                                        │
│  │    BATCH PICKUP SCHEDULER       │                                        │
│  │                                 │                                        │
│  │  1. Group by courier            │                                        │
│  │  2. Schedule pickup per courier │                                        │
│  │  3. Generate manifest           │                                        │
│  │  4. Clear queue                 │                                        │
│  └─────────────────────────────────┘                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Configurable Pickup Schedule Settings

> **🎯 Core Philosophy: NO IMMEDIATE PICKUP OPTION**
> 
> We intentionally **do not offer "immediate" pickup scheduling**. The minimum interval is 2 hours.
> 
> **Why?**
> 1. **Packing Time:** Sellers need time to prepare, pack, and label orders after creation
> 2. **Batch Efficiency:** Even for busy stores, batching prevents 200 individual pickup requests
> 3. **Courier Sanity:** Couriers prefer scheduled batches over constant pickup requests
> 4. **API Rate Limits:** Prevents hitting Shiprocket's 180 requests/minute limit

Allow sellers to configure their pickup frequency based on their order volume:

```typescript
interface PickupScheduleSettings {
  /**
   * How often to batch pickups for scheduling
   * 
   * IMPORTANT: This determines when accumulated orders in the pickup queue
   * get scheduled for pickup - NOT when shipments are created.
   * 
   * Options based on store volume:
   * - '2_HOURS'   → Medium-high volume (100+ orders/day)
   * - '3_HOURS'   → Medium volume (20-50 orders/day)
   * - '4_HOURS'   → Low-medium volume (10-20 orders/day)
   * - '6_HOURS'   → Low volume (5-10 orders/day)
   * - 'ONCE_DAILY' → Very low volume (<5 orders/day) or preference
   */
  batchFrequency: '2_HOURS' | '3_HOURS' | '4_HOURS' | '6_HOURS' | 'ONCE_DAILY';
  
  /**
   * If ONCE_DAILY, at what time should pickup be scheduled?
   * Format: "HH:mm" in 24-hour format
   * Example: "14:00" = 2:00 PM
   * Must be within operatingHours
   */
  dailyPickupTime?: string; // "14:00"
  
  /**
   * Operating hours for the cron job
   * Cron runs every hour within this window
   * Outside these hours, pickups accumulate until next operating window
   */
  operatingHours: {
    start: string; // "08:00" - 8 AM
    end: string;   // "20:00" - 8 PM
  };
  
  /**
   * Default handover method for auto-ship and quick actions
   * PICKUP = courier comes to seller (uses pickup scheduling)
   * DROPOFF = seller takes to hub (no pickup scheduling needed)
   */
  defaultHandoverMethod: 'PICKUP' | 'DROPOFF';
  
  /**
   * Auto-generate manifest PDF after pickup is scheduled?
   * Recommended: true - manifest is required for courier handover
   */
  autoGenerateManifest: boolean;
}
```

### 7.4 Volume-Based Recommendations

| Daily Orders | Recommended Setting | Pickup Schedule |
|--------------|---------------------|-----------------|
| **100+** | `2_HOURS` | Every 2 hours (6 pickups/day max) |
| **50-100** | `3_HOURS` | Every 3 hours (4 pickups/day) |
| **10-50** | `4_HOURS` | Every 4 hours (3 pickups/day) |
| **5-10** | `6_HOURS` | Every 6 hours (2 pickups/day) |
| **<5** | `ONCE_DAILY` | Once at chosen time (1 pickup/day) |

### 7.5 How the Cron Job Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CRON JOB ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MASTER CRON: Runs EVERY HOUR from 8 AM to 8 PM                            │
│  ───────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  08:00 │ 09:00 │ 10:00 │ 11:00 │ 12:00 │ 13:00 │ 14:00 │ ... │ 20:00      │
│    ↓       ↓       ↓       ↓       ↓       ↓       ↓             ↓         │
│  [CHECK] [CHECK] [CHECK] [CHECK] [CHECK] [CHECK] [CHECK]  ...  [CHECK]    │
│                                                                             │
│  At each hour, the cron checks EACH STORE's settings:                       │
│                                                                             │
│  Store A (2_HOURS):  Is it even hour? Yes → Process ✓ | No → Skip          │
│  Store B (3_HOURS):  Is it 8/11/14/17/20? Yes → Process ✓ | No → Skip     │
│  Store C (4_HOURS):  Is it 8/12/16/20? Yes → Process ✓ | No → Skip        │
│  Store D (6_HOURS):  Is it 8/14/20? Yes → Process ✓ | No → Skip           │
│  Store E (DAILY):    Is it 14:00 (user's time)? Yes → Process ✓ | No → Skip│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Timeline for Different Settings:**

```
Time    │ 2_HOURS │ 3_HOURS │ 4_HOURS │ 6_HOURS │ ONCE_DAILY(14:00)
────────┼─────────┼─────────┼─────────┼─────────┼──────────────────
08:00   │    ✓    │    ✓    │    ✓    │    ✓    │        -
09:00   │    -    │    -    │    -    │    -    │        -
10:00   │    ✓    │    -    │    -    │    -    │        -
11:00   │    -    │    ✓    │    -    │    -    │        -
12:00   │    ✓    │    -    │    ✓    │    -    │        -
13:00   │    -    │    -    │    -    │    -    │        -
14:00   │    ✓    │    ✓    │    -    │    ✓    │        ✓
15:00   │    -    │    -    │    -    │    -    │        -
16:00   │    ✓    │    -    │    ✓    │    -    │        -
17:00   │    -    │    ✓    │    -    │    -    │        -
18:00   │    ✓    │    -    │    -    │    -    │        -
19:00   │    -    │    -    │    -    │    -    │        -
20:00   │    ✓    │    ✓    │    ✓    │    ✓    │        -
────────┼─────────┼─────────┼─────────┼─────────┼──────────────────
TOTAL   │    6    │    4    │    3    │    3    │        1
```

### 7.6 Implementation Code Structure

```typescript
// src/lib/shipping/pickup-scheduler.ts

import { Redis } from 'ioredis';
import cron from 'node-cron';

type BatchFrequency = '2_HOURS' | '3_HOURS' | '4_HOURS' | '6_HOURS' | 'ONCE_DAILY';

interface PickupScheduleSettings {
  batchFrequency: BatchFrequency;
  dailyPickupTime?: string;
  operatingHours: { start: string; end: string };
  defaultHandoverMethod: 'PICKUP' | 'DROPOFF';
  autoGenerateManifest: boolean;
}

export class PickupScheduler {
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  /**
   * Add shipment to pickup queue
   * Called from shipping flows: Batch, One-Click, Auto-Ship
   * 
   * IMPORTANT: This does NOT schedule pickup immediately!
   * Shipment is added to a queue and will be scheduled by cron job
   * based on store's pickup schedule settings.
   */
  async queueForPickup(shipment: Shipment): Promise<void> {
    // DROPOFF = No pickup scheduling needed
    // Seller will take package to hub, hub scan triggers webhook
    if (shipment.handoverMethod === 'DROPOFF') {
      console.log(`🏪 Shipment ${shipment.awb} marked for dropoff - no pickup scheduling`);
      return;
    }
    
    // Get store's pickup schedule settings
    const settings = await this.getStoreSettings(shipment.storeId);
    
    // Calculate which batch slot this shipment belongs to
    // This is based on the STORE'S configured frequency, not a global setting
    const nextSlot = this.calculateNextSlot(settings);
    
    // Redis key groups by: storeId, courierCode, and time slot
    // This ensures each store's shipments are batched according to THEIR settings
    const queueKey = `pickup:${shipment.storeId}:${shipment.courierCode}:${nextSlot}`;
    
    // Add shipment ID to the queue (not AWB - Shiprocket API uses shipment_id)
    await this.redis.sadd(queueKey, shipment.shiprocketShipmentId);
    
    // Store shipment details for retrieval during batch processing
    await this.redis.hset(`shipment_details:${shipment.shiprocketShipmentId}`, {
      awb: shipment.awb,
      courierCode: shipment.courierCode,
      courierName: shipment.courierName,
      pickupLocationId: shipment.pickupLocationId,
      storeId: shipment.storeId,
      queuedAt: new Date().toISOString(),
    });
    
    // Set TTL for auto-cleanup (24 hours) in case of orphaned entries
    await this.redis.expire(queueKey, 86400);
    await this.redis.expire(`shipment_details:${shipment.shiprocketShipmentId}`, 86400);
    
    console.log(`✅ Shipment ${shipment.awb} queued for ${shipment.courierName} pickup (batch: ${nextSlot})`);
  }
  
  /**
   * Master Cron Job - Runs EVERY HOUR from 8 AM to 8 PM
   * 
   * This single cron checks each store's settings and processes
   * their queue only if the current hour matches their frequency.
   */
  async processPendingPickups(): Promise<void> {
    const currentHour = new Date().getHours();
    
    // Only run during operating hours (8 AM - 8 PM)
    if (currentHour < 8 || currentHour > 20) {
      console.log('⏸️ Outside operating hours (8 AM - 8 PM). Skipping.');
      return;
    }
    
    console.log(`⏰ Cron running at ${currentHour}:00 - Checking all stores...`);
    
    // Get all unique store IDs from pending pickup queues
    const queuePattern = 'pickup:*';
    const allQueues = await this.redis.keys(queuePattern);
    
    if (allQueues.length === 0) {
      console.log('📭 No pending pickups in any queue.');
      return;
    }
    
    // Extract unique store IDs
    const storeIds = [...new Set(allQueues.map(key => key.split(':')[1]))];
    
    for (const storeId of storeIds) {
      const settings = await this.getStoreSettings(storeId);
      
      // Check if current hour matches store's pickup schedule
      if (!this.shouldProcessStore(settings, currentHour)) {
        console.log(`⏭️ Store ${storeId} (${settings.batchFrequency}): Not scheduled this hour. Skipping.`);
        continue;
      }
      
      console.log(`🚚 Store ${storeId} (${settings.batchFrequency}): Processing pickup queue...`);
      await this.processStorePickups(storeId, settings);
    }
  }
  
  /**
   * Determine if a store should be processed at the current hour
   * based on their configured batchFrequency
   */
  private shouldProcessStore(settings: PickupScheduleSettings, currentHour: number): boolean {
    switch (settings.batchFrequency) {
      case '2_HOURS':
        // Every 2 hours: 8, 10, 12, 14, 16, 18, 20
        return currentHour >= 8 && currentHour <= 20 && currentHour % 2 === 0;
        
      case '3_HOURS':
        // Every 3 hours: 8, 11, 14, 17, 20
        return [8, 11, 14, 17, 20].includes(currentHour);
        
      case '4_HOURS':
        // Every 4 hours: 8, 12, 16, 20
        return [8, 12, 16, 20].includes(currentHour);
        
      case '6_HOURS':
        // Every 6 hours: 8, 14, 20
        return [8, 14, 20].includes(currentHour);
        
      case 'ONCE_DAILY':
        // Only at user's specified time
        const dailyHour = parseInt(settings.dailyPickupTime?.split(':')[0] || '14', 10);
        return currentHour === dailyHour;
        
      default:
        return false;
    }
  }
  
  /**
   * Process all pending pickups for a specific store
   * Groups by courier and schedules one pickup per courier
   */
  private async processStorePickups(storeId: string, settings: PickupScheduleSettings): Promise<void> {
    // Find all queues for this store
    const storeQueues = await this.redis.keys(`pickup:${storeId}:*`);
    
    for (const queueKey of storeQueues) {
      const [, , courierCode, slot] = queueKey.split(':');
      
      // Get all shipment IDs in this queue
      const shipmentIds = await this.redis.smembers(queueKey);
      
      if (shipmentIds.length === 0) {
        await this.redis.del(queueKey);
        continue;
      }
      
      try {
        // Get store's Shiprocket client (uses their API credentials)
        const shiprocket = await this.getShiprocketClient(storeId);
        
        // Schedule pickup for ALL shipments in this queue (same courier)
        // Shiprocket's API accepts array of shipment_ids
        const pickup = await shiprocket.post('/courier/generate/pickup', {
          shipment_id: shipmentIds.map(id => parseInt(id, 10)),
        });
        
        console.log(`✅ Scheduled pickup for ${courierCode}: ${shipmentIds.length} shipments`);
        console.log(`   Token: ${pickup.response?.pickup_token_number}`);
        console.log(`   Date: ${pickup.response?.pickup_scheduled_date}`);
        
        // Generate manifest if enabled
        let manifestUrl: string | null = null;
        if (settings.autoGenerateManifest) {
          const manifest = await shiprocket.post('/manifests/generate', {
            shipment_id: shipmentIds.map(id => parseInt(id, 10)),
          });
          manifestUrl = manifest.manifest_url;
          console.log(`📄 Manifest generated: ${manifestUrl}`);
        }
        
        // Update database with pickup details
        await this.updateShipmentStatus(shipmentIds, {
          status: 'PICKUP_SCHEDULED',
          pickupScheduledAt: new Date(pickup.response?.pickup_scheduled_date),
          pickupToken: pickup.response?.pickup_token_number,
          manifestUrl,
        });
        
        // Clear the queue after successful processing
        await this.redis.del(queueKey);
        
        // Cleanup shipment details from Redis
        for (const shipmentId of shipmentIds) {
          await this.redis.del(`shipment_details:${shipmentId}`);
        }
        
      } catch (error) {
        console.error(`❌ Pickup scheduling failed for ${queueKey}:`, error);
        // DON'T clear queue on failure - will retry next cron run
      }
    }
  }
  
  /**
   * Calculate the next pickup slot based on store's settings
   * Used when adding shipments to queue
   */
  private calculateNextSlot(settings: PickupScheduleSettings): string {
    const now = new Date();
    const currentHour = now.getHours();
    
    // If outside operating hours, next slot is 8 AM tomorrow
    if (currentHour >= 20) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);
      return tomorrow.toISOString();
    }
    
    if (currentHour < 8) {
      const today8am = new Date(now);
      today8am.setHours(8, 0, 0, 0);
      return today8am.toISOString();
    }
    
    // Calculate next slot based on frequency
    let nextHour: number;
    
    switch (settings.batchFrequency) {
      case '2_HOURS':
        nextHour = Math.ceil((currentHour + 1) / 2) * 2;
        break;
      case '3_HOURS':
        const threeHourSlots = [8, 11, 14, 17, 20];
        nextHour = threeHourSlots.find(h => h > currentHour) || 8;
        break;
      case '4_HOURS':
        const fourHourSlots = [8, 12, 16, 20];
        nextHour = fourHourSlots.find(h => h > currentHour) || 8;
        break;
      case '6_HOURS':
        const sixHourSlots = [8, 14, 20];
        nextHour = sixHourSlots.find(h => h > currentHour) || 8;
        break;
      case 'ONCE_DAILY':
        const dailyHour = parseInt(settings.dailyPickupTime?.split(':')[0] || '14', 10);
        nextHour = currentHour < dailyHour ? dailyHour : dailyHour; // Next day handled above
        break;
      default:
        nextHour = currentHour + 2;
    }
    
    // If next hour is past 20, roll to 8 AM tomorrow
    if (nextHour > 20) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);
      return tomorrow.toISOString();
    }
    
    const nextSlot = new Date(now);
    nextSlot.setHours(nextHour, 0, 0, 0);
    return nextSlot.toISOString();
  }
  
  // Helper methods (implement based on your infrastructure)
  private async getStoreSettings(storeId: string): Promise<PickupScheduleSettings> { /* ... */ }
  private async getShiprocketClient(storeId: string): Promise<any> { /* ... */ }
  private async updateShipmentStatus(shipmentIds: string[], data: any): Promise<void> { /* ... */ }
}

/**
 * Register the master cron job
 * Runs every hour from 8 AM to 8 PM
 */
export function registerPickupCron(scheduler: PickupScheduler) {
  // "0 8-20 * * *" = At minute 0 of hours 8-20 (8 AM to 8 PM), every day
  cron.schedule('0 8-20 * * *', async () => {
    console.log('⏰ Pickup scheduler cron triggered');
    await scheduler.processPendingPickups();
  });
  
  console.log('✅ Pickup scheduler cron registered (runs every hour 8 AM - 8 PM)');
}
```

---

## 8. Edge Cases & Troubleshooting

### 8.1 Pickup Scheduling Failures

| Error | Cause | Solution |
|-------|-------|----------|
| "AWB not assigned" | Called pickup before AWB | Assign AWB first |
| "Shipment already picked" | Duplicate request | Check status before scheduling |
| "Cutoff time passed" | Too late for same-day | Schedule for next day |
| "Service not available" | Courier doesn't serve area | Choose different courier |
| "Holiday/Sunday" | Non-working day | Auto-scheduled for next day |

### 8.2 Pickup Rescheduling

```javascript
// Reschedule for a different date
const response = await shiprocket.post('/courier/generate/pickup', {
  shipment_id: [16090109],
  pickup_date: ['2024-01-25'] // New date
});
```

**Rules:**
- Can reschedule until pickup_date has passed
- Cannot reschedule after courier has picked up
- May need to call cancel and reschedule for major changes

### 8.3 Handling Pickup Failures

```javascript
// Status code 13 = Pickup Error
// Status code 20 = Pickup Exception

async function handlePickupFailure(shipmentId: string) {
  // Option 1: Retry
  await shiprocket.post('/courier/generate/pickup', {
    shipment_id: [shipmentId],
    status: 'retry'
  });
  
  // Option 2: Reschedule for next day
  const tomorrow = getTomorrowDate();
  await shiprocket.post('/courier/generate/pickup', {
    shipment_id: [shipmentId],
    pickup_date: [tomorrow]
  });
  
  // Option 3: Notify seller to drop at hub
  await sendNotification(shipmentId, 'PICKUP_FAILED_DROP_AT_HUB');
}
```

### 8.4 Rate Limiting

Shiprocket API rate limits:
- 180 requests/minute per API
- Use batching to stay within limits
- Implement exponential backoff for 429 errors

---

## 9. Integration Features for ShopPulse

### 9.1 Phase 1 Features (Current - UI Only)

- [ ] Handover method selection in ship dialog (PICKUP/DROPOFF)
- [ ] Display estimated pickup time after scheduling
- [ ] Show pickup token in shipment details
- [ ] Manual "Schedule Pickup" button (TODO placeholder)

### 9.2 Phase 2 Features (Pickup Scheduling)

- [ ] Implement `/courier/generate/pickup` API integration
- [ ] Auto-schedule pickup after shipment creation (if PICKUP selected)
- [ ] Generate and store manifest URL
- [ ] Add "Reschedule Pickup" functionality
- [ ] Add "Retry Pickup" for failures

### 9.3 Phase 3 Features (Unified Pipeline)

- [ ] Pickup schedule settings in Shipping Settings page
- [ ] Configurable batch frequencies (2/3/4/6 hours or daily)
- [ ] Redis queue for pending pickups
- [ ] Cron job for batch pickup scheduling
- [ ] Manifest auto-generation
- [ ] Pickup dashboard showing next scheduled batch

### 9.4 Phase 4 Features (Advanced)

- [ ] Pickup calendar view
- [ ] Courier-wise pickup analytics
- [ ] Pickup failure alerts & notifications
- [ ] WhatsApp/SMS pickup confirmation to seller
- [ ] Pickup slot preferences per pickup location

### 9.5 UI Components Needed

```typescript
// TODO: Create these components

// 1. Pickup Schedule Settings
<PickupScheduleSettings
  frequency="2_HOURS"
  onSave={(settings) => savePickupSettings(settings)}
/>

// 2. Upcoming Pickups Widget (Dashboard)
<UpcomingPickupsWidget
  storeId={storeId}
  onViewDetails={(pickupId) => openPickupDetails(pickupId)}
/>

// 3. Pickup Timeline in Shipment Details
<PickupTimeline
  scheduledAt={shipment.pickupScheduledAt}
  token={shipment.pickupToken}
  status={shipment.status}
/>

// 4. Reschedule Pickup Dialog
<ReschedulePickupDialog
  shipmentId={shipment.id}
  currentDate={shipment.pickupScheduledAt}
  onReschedule={(newDate) => reschedulePickup(newDate)}
/>
```

---

## 10. Implementation Checklist

### Phase 1: UI Foundation (Current Sprint)
- [x] Ship Order Dialog with handover method selection
- [x] Shipping Settings page structure
- [x] Pickup location management UI
- [ ] TODO comments for pickup scheduling integration points

### Phase 2: API Integration
- [ ] `/courier/generate/pickup` API wrapper
- [ ] `/manifests/generate` API wrapper
- [ ] Pickup status polling/webhook handling
- [ ] Error handling for pickup failures

### Phase 3: Backend Pipeline
- [ ] Redis queue for pickup batching
- [ ] Cron job for scheduled processing
- [ ] Pickup schedule settings in database
- [ ] Manifest storage and retrieval

### Phase 4: UI Completion
- [ ] Pickup schedule configuration UI
- [ ] Pickup status in shipment details
- [ ] Pickup calendar/timeline view
- [ ] Manifest download button

### Database Changes Needed
```sql
-- Add to StoreShippingSettings
ALTER TABLE "StoreShippingSettings" ADD COLUMN "pickupBatchFrequency" TEXT DEFAULT '2_HOURS';
ALTER TABLE "StoreShippingSettings" ADD COLUMN "dailyPickupTime" TEXT;
ALTER TABLE "StoreShippingSettings" ADD COLUMN "autoGenerateManifest" BOOLEAN DEFAULT true;

-- Add to Shipment
ALTER TABLE "Shipment" ADD COLUMN "pickupScheduledAt" TIMESTAMP;
ALTER TABLE "Shipment" ADD COLUMN "pickupToken" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "manifestUrl" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "manifestId" TEXT;
```

---

## Summary

Shiprocket's pickup scheduling is a critical flow that connects digital shipment creation with physical package pickup. The key insights are:

1. **Two Handover Methods**: PICKUP (courier comes) vs DROPOFF (you go to hub)
2. **Batch for Efficiency**: Group shipments by courier for single pickup requests
3. **Manifest Required**: Generate manifest before courier arrives
4. **Unified Pipeline**: Route all shipping flows through one pickup queue
5. **Configurable**: Let sellers choose pickup frequency based on their volume

The TODO comments in the current UI implementation mark where pickup scheduling API calls should be integrated in Phase 2.
