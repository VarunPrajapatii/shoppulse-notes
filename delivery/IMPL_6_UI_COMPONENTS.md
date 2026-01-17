# Shipping UI Components - Reference Guide

> **Purpose:** Complete list of all shipping UI components with mockup references.
> **Last Updated:** 2026-01-13

---

## Quick Navigation

| Section | Components | Completed |
|---------|------------|-----------|
| [Shared Components](#shared-components) | 6 components | ✅ 6/6 |
| [Settings Components](#settings-components) | 4 components | ✅ 4/4 |
| [Order Shipping Components](#order-shipping-components) | 7 components | ✅ 7/7 |
| [Shipments Components](#shipments-components) | 8 components | ✅ 6/8 |
| [Batch Operations](#batch-operations) | 4 components | ✅ 4/4 |
| [Pickups Components](#pickups-components) | 3 components | ✅ 3/3 |
| [Tracking Components](#tracking-components) | 4 components | ✅ 4/4 |
| [Analytics Components](#analytics-components) | 5 components | ✅ 5/5 |

---

## Shared Components

Reusable components used across multiple features.

| # | Component | Description | UI Reference | Status |
|---|-----------|-------------|--------------|--------|
| 1 | `ShipmentStatusBadge` | Colored status badge (PENDING, IN_TRANSIT, DELIVERED, etc.) | Below ↓ | ✅ |
| 2 | `CourierBadge` | Shows courier logo + name | Below ↓ | ✅ |
| 3 | `PickupLocationSelect` | Dropdown for selecting pickup location | [IMPL_5B](IMPL_5B_COMPLETE_SHIPMENT_FLOWS.md) - Ship Order Modal | ✅ |
| 4 | `HandoverMethodRadio` | Pickup vs Drop-off selector | [IMPL_5B](IMPL_5B_COMPLETE_SHIPMENT_FLOWS.md) - HANDOVER METHOD section | ✅ |
| 5 | `PackageDimensionsInput` | Weight, L×B×H inputs with validation | [IMPL_5B](IMPL_5B_COMPLETE_SHIPMENT_FLOWS.md) - PACKAGE DETAILS section | ✅ |
| 6 | `AWBDisplay` | AWB code with copy button | Below ↓ | ✅ |

### ShipmentStatusBadge UI

```
Status Variants:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ⏳ Pending   │  │ 📦 Booked    │  │ 📋 Manifested│
│   (gray)     │  │   (blue)     │  │   (blue)     │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 🚚 Picked Up │  │ ✈️ In Transit│  │ 🛵 Out for   │
│   (cyan)     │  │   (purple)   │  │   Delivery   │
└──────────────┘  └──────────────┘  │   (orange)   │
                                    └──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ✅ Delivered │  │ ❌ Failed    │  │ 🔄 RTO       │
│   (green)    │  │   (red)      │  │   (yellow)   │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐
│ ⛔ Cancelled │  │ ⚠️ Lost      │
│   (gray)     │  │   (red)      │
└──────────────┘  └──────────────┘
```

### CourierBadge UI

```
┌─────────────────────────────┐
│  [🔵]  Delhivery Surface    │  ← Logo + Name
└─────────────────────────────┘

┌─────────────────────────────┐
│  [🟢]  BlueDart Express     │
└─────────────────────────────┘

┌─────────────────────────────┐
│  [📮]  India Post           │  ← For manual
└─────────────────────────────┘
```

### AWBDisplay UI

```
┌─────────────────────────────────────────────────┐
│  AWB: 788830567028                    [📋 Copy] │
└─────────────────────────────────────────────────┘

On hover/click copy → toast "AWB copied!"
```

---

## Settings Components

Located in `/components/shipping/settings/`

| # | Component | Description | UI Reference | Status |
|---|-----------|-------------|--------------|--------|
| 7 | `ShiprocketConnectionSection` | Connection status + actions | [IMPL_4](IMPL_4_SETTINGS_AND_UI_FLOWS.md) - Section 1 | ✅ |
| 8 | `PickupLocationsSection` | List + Add + Sync buttons | [IMPL_4](IMPL_4_SETTINGS_AND_UI_FLOWS.md) - Section 3 | ✅ |
| 9 | `PickupLocationCard` | Single location card with actions | [IMPL_4](IMPL_4_SETTINGS_AND_UI_FLOWS.md) - Location cards | ✅ |
| 10 | `AddPickupLocationDialog` | Add new location form | [IMPL_4](IMPL_4_SETTINGS_AND_UI_FLOWS.md) - Add Modal | ✅ |

---

## Order Shipping Components

Located in `/components/shipping/order-shipping/`

| # | Component | Description | UI Reference | Status |
|---|-----------|-------------|--------------|--------|
| 11 | `ShipOrderDialog` | Main dialog container with tabs | [IMPL_5B](IMPL_5B_COMPLETE_SHIPMENT_FLOWS.md) - Ship Order Modal | ✅ |
| 12 | `ShiprocketShipForm` | Shiprocket shipping form | [IMPL_5B](IMPL_5B_COMPLETE_SHIPMENT_FLOWS.md) - Flow 1 | ✅ |
| 13 | `ManualShipForm` | Manual shipping form | [IMPL_5B](IMPL_5B_COMPLETE_SHIPMENT_FLOWS.md) - Flow 4 | ✅ |
| 14 | `CourierRatesList` | List of available couriers (hardcoded in array) | [IMPL_5B](IMPL_5B_COMPLETE_SHIPMENT_FLOWS.md) - COURIER SELECTION | ✅ |
| 15 | `CourierRateCard` | Single courier option (rate, ETA) | Below ↓ | ✅ |
| 16 | `PackagePresetSelect` | Box preset dropdown | Below ↓ | ✅ |
| 17 | `ShipConfirmButton` | "Ship Now - ₹XX" button | [IMPL_5B](IMPL_5B_COMPLETE_SHIPMENT_FLOWS.md) - Bottom of modal | ✅ |

### CourierRateCard UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ○ Delhivery Surface                                                         │
│   ₹45  |  Est: 4-5 days  |  ⭐ 4.2                            [CHEAPEST]   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ● Blue Dart Air                                               [SELECTED]   │
│   ₹95  |  Est: 1-2 days  |  ⭐ 4.5                             [FASTEST]   │
└─────────────────────────────────────────────────────────────────────────────┘

Badges:
- [CHEAPEST] - green bg, shown on lowest price
- [FASTEST] - blue bg, shown on shortest ETA
- [SELECTED] - primary color outline
```

### PackagePresetSelect UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Selected Box: [▼ Medium Box (30×25×15 cm) ]                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📦 Small Box                                                        │   │
│  │     20×15×10 cm  •  Max 0.5 kg                                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  📦 Medium Box  ← Auto-selected for 3 items                         │   │
│  │     30×25×15 cm  •  Max 2 kg                                        │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  📦 Large Box                                                        │   │
│  │     40×35×25 cm  •  Max 5 kg                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Shipments Components (6/8 ✅)

Located in `/components/shipping/shipments/`

| # | Component | Description | UI Reference | Status |
|---|-----------|-------------|--------------|--------|
| 21 | `ShipmentsPage` | Main listing page | Below ↓ | ⬜ |
| 22 | `ShipmentsFilters` | Status, date, provider filters | Below ↓ | ✅ |
| 23 | `ShipmentsDataTable` | Data table with selection | Below ↓ | ⬜ |
| 24 | `ShipmentRow` | Table row component | Below ↓ | ✅ |
| 25 | `ShipmentDetailSheet` | Slide-out detail view | Below ↓ | ✅ |
| 26 | `ShipmentActions` | Track, Label, Cancel, Update actions | Below ↓ | ✅ |
| 27 | `TrackingTimeline` | Event timeline display | Below ↓ | ✅ |
| 28 | `UpdateStatusDialog` | Manual status update form | Below ↓ | ✅ |

### ShipmentsPage UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📦 Shipments                                                               │
│                                                                              │
│  ┌── Quick Stats ────────────────────────────────────────────────────────┐ │
│  │  [All: 156]  [In Transit: 23]  [Out for Delivery: 8]  [Delivered: 120]│ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌── Filters ────────────────────────────────────────────────────────────┐ │
│  │  Status: [All ▼]  Provider: [All ▼]  Date: [Last 30 days ▼]  [Search]│ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌── Actions (3 selected) ───────────────────────────────────────────────┐ │
│  │  [📋 Print Labels]  [📅 Request Pickup]  [✗ Clear Selection]         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐
│  │ ☑ │ Shipment      │ Order        │ Courier     │ Status      │ Actions │
│  ├───┼───────────────┼──────────────┼─────────────┼─────────────┼─────────┤
│  │ ☑ │ SHP-001       │ ORD-ABC123   │ Delhivery   │ 🚚 In Transit│ [•••]  │
│  │   │ AWB: 78883... │ Rahul S.     │             │ Mumbai       │         │
│  ├───┼───────────────┼──────────────┼─────────────┼─────────────┼─────────┤
│  │ ☐ │ SHP-002       │ ORD-DEF456   │ BlueDart    │ ✅ Delivered │ [•••]  │
│  │   │ AWB: 45566... │ Priya M.     │             │ Jan 10       │         │
│  └───┴───────────────┴──────────────┴─────────────┴─────────────┴─────────┘
│                                                                              │
│  Showing 1-20 of 156                              [< 1 2 3 ... 8 >]        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### ShipmentDetailSheet UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Shipment Details                                                      [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌── Shipment Info ──────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  SHP-001                                    [✈️ In Transit]           │ │
│  │                                                                        │ │
│  │  AWB: 788830567028                                    [📋 Copy]       │ │
│  │  Courier: Delhivery Surface                                           │ │
│  │  Provider: Shiprocket                                                 │ │
│  │                                                                        │ │
│  │  Shipped: Jan 8, 2026 10:30 AM                                        │ │
│  │  Est. Delivery: Jan 12, 2026                                          │ │
│  │  Current Location: Delhi Hub                                          │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌── Package Details ────────────────────────────────────────────────────┐ │
│  │  Weight: 1.2 kg  •  Dimensions: 30×25×15 cm  •  Volumetric: 2.25 kg  │ │
│  │  Charged Weight: 2.25 kg (volumetric)                                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌── Delivery Address ───────────────────────────────────────────────────┐ │
│  │  Rahul Sharma                                                         │ │
│  │  789 Lane, Andheri West                                               │ │
│  │  Mumbai, Maharashtra - 400053                                         │ │
│  │  📞 +91 98765 43210                                                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌── Tracking Timeline ──────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  ● Jan 10, 2:30 PM  -  In Transit                                     │ │
│  │  │                     Reached Delhi Hub                              │ │
│  │  │                                                                     │ │
│  │  ● Jan 9, 8:00 AM   -  Picked Up                                      │ │
│  │  │                     Package picked from Home Office                │ │
│  │  │                                                                     │ │
│  │  ● Jan 8, 10:30 AM  -  Manifested                                     │ │
│  │                        Shipment created, AWB assigned                 │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌── Actions ────────────────────────────────────────────────────────────┐ │
│  │  [🔍 Track Live]  [🏷️ Print Label]  [❌ Cancel Shipment]              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### UpdateStatusDialog UI (for Manual Shipments)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Update Shipment Status                                                [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Current Status: 🚚 In Transit                                              │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  New Status *                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ○ Out for Delivery                                                   │   │
│  │ ● Delivered                                                          │   │
│  │ ○ Delivery Failed                                                    │   │
│  │ ○ RTO Initiated                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Location (optional)                                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Customer's address                                                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Notes (optional)                                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Received by: Rahul's wife                                              │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  POD Image (optional)                                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  [📷 Upload Photo]         No file selected                           │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                         [Cancel]  [Update Status]           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Batch Operations (4/4 ✅)

Located in `/components/shipping/batch/`

| # | Component | Description | UI Reference | Status |
|---|-----------|-------------|--------------|--------|
| 29 | `BatchShipDialog` | Multi-order shipping modal | [IMPL_5B](IMPL_5B_COMPLETE_SHIPMENT_FLOWS.md) - Flow 2 | ✅ |
| 30 | `BatchOrdersList` | List of orders in batch | [IMPL_5B](IMPL_5B_COMPLETE_SHIPMENT_FLOWS.md) - Batch Ship Modal | ✅ |
| 31 | `BatchOrderItem` | Single order with edit option | [IMPL_5B](IMPL_5B_COMPLETE_SHIPMENT_FLOWS.md) - ORDER DETAILS | ✅ |
| 32 | `BulkActionsToolbar` | Floating toolbar for selection | Above - ShipmentsPage | ✅ |

---

## Pickups Components (3/3 ✅)

Located in `/components/shipping/pickups/`

| # | Component | Description | UI Reference | Status |
|---|-----------|-------------|--------------|--------|
| 33 | `PickupsPage` | Pickups listing page (PickupsList) | Below ↓ | ✅ |
| 34 | `PickupGroupCard` | Pickup group (date + location) | Below ↓ | ✅ |
| 35 | `RequestPickupDialog` | Schedule pickup for shipments | Below ↓ | ✅ |

### PickupsPage UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🚚 Scheduled Pickups                                                       │
│                                                                              │
│  ┌── Quick Stats ────────────────────────────────────────────────────────┐ │
│  │  [Today: 2]  [Pending: 5]  [Completed: 28]                            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  📅 TODAY - Jan 12, 2026                                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐
│  │  📍 Home Office, Gurugram                          [PENDING]           │
│  │                                                                         │
│  │  Pickup Time: 9:00 AM - 6:00 PM                                        │
│  │  Packages: 3                                                           │
│  │  Token: PKP123456                                                      │
│  │                                                                         │
│  │  Shipments:                                                            │
│  │  • SHP-001 → Mumbai (Delhivery)                                        │
│  │  • SHP-002 → Delhi (DTDC)                                              │
│  │  • SHP-003 → Chennai (Xpressbees)                                      │
│  │                                                                         │
│  │  [📋 Print Manifest]  [🔄 Reschedule]                                  │
│  └─────────────────────────────────────────────────────────────────────────┘
│                                                                              │
│  📅 TOMORROW - Jan 13, 2026                                                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐
│  │  📍 Warehouse, Delhi                               [SCHEDULED]         │
│  │  Pickup Time: 10:00 AM - 4:00 PM  •  Packages: 5                       │
│  └─────────────────────────────────────────────────────────────────────────┘
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RequestPickupDialog UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Request Pickup                                                        [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Selected Shipments: 5                                                      │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Pickup Date *                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 📅 Jan 13, 2026 (Tomorrow)                                             │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Pickup Time Window                                                         │
│  From: [09:00 AM ▼]    To: [06:00 PM ▼]                                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Shipments by Location:                                                     │
│                                                                              │
│  📍 Home Office, Gurugram (3 shipments)                                    │
│     • SHP-001 - Delhivery                                                  │
│     • SHP-002 - DTDC                                                       │
│     • SHP-003 - Xpressbees                                                 │
│                                                                              │
│  📍 Warehouse, Delhi (2 shipments)                                         │
│     • SHP-004 - BlueDart                                                   │
│     • SHP-005 - Delhivery                                                  │
│                                                                              │
│  ⚠️ Note: Separate pickups will be scheduled for each location.            │
│                                                                              │
│                                         [Cancel]  [Schedule 2 Pickups]      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tracking Components (4/4 ✅)

Located in `/components/shipping/tracking/`

| # | Component | Description | UI Reference | Status |
|---|-----------|-------------|--------------|--------|
| 36 | `PublicTrackingPage` | Customer-facing tracking page | Below ↓ | ✅ |
| 37 | `TrackingSearchForm` | AWB input form | Below ↓ | ✅ |
| 38 | `TrackingResult` | Status + timeline display | Below ↓ | ✅ |
| 39 | `DeliveryMilestones` | Visual progress steps | Below ↓ | ✅ |

### PublicTrackingPage UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                           🚚 Track Your Order                               │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  Enter AWB / Tracking Number                                          │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │ 788830567028                                                    │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                          [Track →]    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐
│  │                                                                         │
│  │  Status: ✈️ In Transit                                                 │
│  │  Courier: Delhivery Surface                                            │
│  │  Est. Delivery: Jan 12, 2026                                           │
│  │                                                                         │
│  │  ─────────────────────────────────────────────────────────────────────  │
│  │                                                                         │
│  │  Progress:                                                             │
│  │                                                                         │
│  │  [✓ Ordered] ─────── [✓ Shipped] ─────── [● In Transit] ─── [ Delivered]
│  │                                                                         │
│  │  ─────────────────────────────────────────────────────────────────────  │
│  │                                                                         │
│  │  Tracking History:                                                     │
│  │                                                                         │
│  │  ● Jan 10, 2:30 PM  -  In Transit                                     │
│  │  │                     Reached Delhi Hub                              │
│  │  │                                                                     │
│  │  ● Jan 9, 8:00 AM   -  Picked Up                                      │
│  │  │                     Package picked from warehouse                   │
│  │  │                                                                     │
│  │  ● Jan 8, 10:30 AM  -  Shipped                                        │
│  │                        Order shipped via Delhivery                     │
│  │                                                                         │
│  └─────────────────────────────────────────────────────────────────────────┘
│                                                                              │
│  Store: MyStore.com                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### DeliveryMilestones UI

```
Linear Progress (Horizontal):
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  [✓] ───────── [✓] ───────── [●] ───────── [ ] ───────── [ ]               │
│ Ordered      Shipped      In Transit   Out for      Delivered              │
│                                        Delivery                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

States:
[✓] = Completed (green fill)
[●] = Current (primary color, pulsing)
[ ] = Pending (gray outline)
```

---

## Analytics Components (5/5 ✅)

Located in `/components/shipping/analytics/`

| # | Component | Description | UI Reference | Status |
|---|-----------|-------------|--------------|--------|
| 40 | `ShippingAnalyticsPage` | Analytics dashboard page | Below ↓ | ✅ |
| 41 | `ShippingSummaryCards` | Overview stat cards | Below ↓ | ✅ |
| 42 | `ShipmentTrendChart` | Daily trend line chart | Below ↓ | ✅ |
| 43 | `CourierBreakdownChart` | Courier performance pie/bar | Below ↓ | ✅ |
| 44 | `DeliveryRateCard` | Success rate display | Below ↓ | ✅ |

### ShippingAnalyticsPage UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 Shipping Analytics                          [Last 30 days ▼]           │
│                                                                              │
│  ┌── Summary Cards ──────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐          │ │
│  │  │   156     │  │    120    │  │    23     │  │    8      │          │ │
│  │  │   Total   │  │ Delivered │  │ In Transit│  │   RTO     │          │ │
│  │  │  (↑ 12%)  │  │  (77%)    │  │           │  │  (5.1%)   │          │ │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘          │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌── Delivery Performance ───────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  Avg. Delivery Time: 3.2 days                                         │ │
│  │  Delivery Success Rate: 94.9%                                         │ │
│  │  RTO Rate: 5.1%                                                       │ │
│  │                                                                        │ │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░  94.9% Delivered      │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌── Daily Shipments Trend ──────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │      8 │                              ●                               │ │
│  │        │                    ●    ●   ╱ ╲                              │ │
│  │      6 │        ●          ╱╲   ╱ ╲ ╱   ●                             │ │
│  │        │   ●   ╱ ╲    ●   ╱  ╲ ╱   ●                                  │ │
│  │      4 │  ╱ ╲ ╱   ╲  ╱ ╲ ╱                                            │ │
│  │        │ ╱   ●     ●╱   ●                                             │ │
│  │      2 │●                                                             │ │
│  │        └────────────────────────────────────────────────────────────  │ │
│  │         Jan 1  3   5   7   9   11  13  (14 days)                      │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌── Courier Performance ────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │ Courier      │ Shipments │ Avg Days │ Success │ RTO Rate │       │  │ │
│  │  ├─────────────────────────────────────────────────────────────────┤  │ │
│  │  │ Delhivery    │    58     │   3.1    │  96%    │   4%     │ ⭐⭐⭐⭐ │  │ │
│  │  │ BlueDart     │    42     │   2.5    │  98%    │   2%     │ ⭐⭐⭐⭐⭐│  │ │
│  │  │ Xpressbees   │    35     │   3.8    │  91%    │   9%     │ ⭐⭐⭐  │  │ │
│  │  │ DTDC         │    21     │   4.2    │  88%    │  12%     │ ⭐⭐⭐  │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Category | Count | Done | Primary UI Reference |
|----------|-------|------|---------------------|
| Shared Components | 6 | ✅ 6/6 | This file |
| Settings | 4 | ✅ 4/4 | IMPL_4 |
| Order Shipping | 7 | ✅ 7/7 | IMPL_5B |
| Shipments | 8 | ✅ 6/8 | This file |
| Batch Operations | 4 | ✅ 4/4 | IMPL_5B |
| Pickups | 3 | ✅ 3/3 | This file |
| Tracking | 4 | ✅ 4/4 | This file |
| Analytics | 5 | ✅ 5/5 | This file |
| **TOTAL** | **41** | **39/41** | |

---

*Progress: 39/41 components completed (~95%) 🚀*
