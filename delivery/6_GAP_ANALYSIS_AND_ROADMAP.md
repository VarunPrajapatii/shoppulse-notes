# Part 6: Gap Analysis & Implementation Roadmap

## 🎯 From Documentation to Code

This document bridges the theory (Parts 1-5) to actual implementation. We analyze what ShopPulse currently has vs. what it needs for complete delivery management.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Gap Identification](#gap-identification)
3. [Schema Changes Required](#schema-changes-required)
4. [API Routes Needed](#api-routes-needed)
5. [UI Components Required](#ui-components-required)
6. [Implementation Phases](#implementation-phases)
7. [Priority Checklist](#priority-checklist)
8. [Testing Strategy](#testing-strategy)

---

## Current State Analysis

### What ShopPulse Already Has

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              CURRENT SHOPPULSE CAPABILITIES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✅ WORKING FEATURES:                                                       │
│  ────────────────────                                                        │
│                                                                              │
│  Order Management:                                                          │
│  • Order creation from storefront                                           │
│  • OrderStatus enum (PENDING, PAID, PROCESSING, SHIPPED, DELIVERED, etc.)   │
│  • Basic order listing in dashboard                                         │
│  • Order details view                                                       │
│                                                                              │
│  Payment:                                                                    │
│  • Razorpay integration (BYOK)                                              │
│  • Payment capture                                                          │
│  • Payment status tracking                                                  │
│                                                                              │
│  Products:                                                                   │
│  • Product management with sizes                                            │
│  • Quantity tracking per size                                               │
│  • Stock management                                                         │
│                                                                              │
│  Integrations:                                                              │
│  • StoreIntegration model for BYOK                                          │
│  • Razorpay credentials storage                                             │
│  • SMS integration (optional)                                               │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ❌ MISSING FOR DELIVERY:                                                   │
│  ────────────────────────                                                   │
│                                                                              │
│  Shipping:                                                                   │
│  • No shipping aggregator integration (Shiprocket, Delhivery)               │
│  • No AWB (tracking number) storage                                         │
│  • No courier information                                                   │
│  • No shipping label generation                                             │
│  • No rate calculation                                                      │
│  • No pincode serviceability check                                          │
│                                                                              │
│  Address:                                                                    │
│  • Single string `address` field                                            │
│  • No structured address (line1, line2, city, state, pincode)               │
│  • No pincode-based validation                                              │
│                                                                              │
│  Tracking:                                                                   │
│  • No webhook endpoint for shipping updates                                 │
│  • No shipment events tracking                                              │
│  • No customer tracking page                                                │
│  • No real-time status updates                                              │
│                                                                              │
│  Returns:                                                                    │
│  • No return request system                                                 │
│  • No RTO handling                                                          │
│  • No reverse pickup                                                        │
│  • No refund integration                                                    │
│                                                                              │
│  Notifications:                                                              │
│  • No shipping status notifications                                         │
│  • No automated customer updates                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Current Order Model (Gap Analysis)

```prisma
// CURRENT Order Model in schema.prisma
model Order {
  id               String      @id @default(uuid())
  storeId          String
  store            Store       @relation(fields: [storeId], references: [id])
  orderItems       OrderItem[]
  isPaid           Boolean     @default(false)
  
  // Customer Info
  phone            String      @default("")
  name             String      @default("")
  address          String      @default("")   // ⚠️ GAP: Single string, no structure
  email            String      @default("")
  
  // Order Status
  orderStatus      OrderStatus @default(PENDING)
  
  // Payment
  razorpayOrderId  String?
  razorpayPaymentId String?
  paymentMethod    PaymentMethod?
  
  total            Decimal     @default(0)
  
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  // ⚠️ MISSING FIELDS FOR DELIVERY:
  // - No addressLine1, addressLine2, city, state, pincode
  // - No weight, dimensions
  // - No awbCode (tracking number)
  // - No courierName, courierCode
  // - No shiprocketOrderId, shiprocketShipmentId
  // - No shipmentEvents relation
  // - No deliveredAt, shippedAt timestamps
  // - No returnRequest relation
}
```

---

## Gap Identification

### Complete Gap List

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              DELIVERY SYSTEM GAPS                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CATEGORY: DATABASE SCHEMA                                                  │
│  ═══════════════════════════                                                │
│                                                                              │
│  GAP #1: Unstructured Address                                               │
│  ───────────────────────────                                                │
│  Current:  Single `address` string field                                    │
│  Needed:   addressLine1, addressLine2, city, state, pincode                │
│  Impact:   Can't verify serviceability, can't create shipping labels       │
│  Priority: 🔴 CRITICAL                                                      │
│                                                                              │
│  GAP #2: No Shipping Fields on Order                                        │
│  ────────────────────────────────────                                       │
│  Current:  No shipping-related fields                                       │
│  Needed:   awbCode, courierName, shiprocketOrderId, weight, dimensions     │
│  Impact:   Can't track shipments, can't integrate with Shiprocket          │
│  Priority: 🔴 CRITICAL                                                      │
│                                                                              │
│  GAP #3: No ShipmentEvent Model                                             │
│  ──────────────────────────────                                             │
│  Current:  No audit trail for shipping status                               │
│  Needed:   ShipmentEvent model with status, timestamp, location            │
│  Impact:   No history, can't show tracking timeline                        │
│  Priority: 🟡 HIGH                                                          │
│                                                                              │
│  GAP #4: No ReturnRequest Model                                             │
│  ──────────────────────────────                                             │
│  Current:  No return handling                                               │
│  Needed:   ReturnRequest with status, reason, QC, refund tracking          │
│  Impact:   Manual return handling, no tracking                             │
│  Priority: 🟡 HIGH                                                          │
│                                                                              │
│  GAP #5: No RtoRecord Model                                                 │
│  ──────────────────────────                                                 │
│  Current:  No RTO tracking                                                  │
│  Needed:   RtoRecord with status, reason, AWB                              │
│  Impact:   Lost visibility on failed deliveries                            │
│  Priority: 🟡 HIGH                                                          │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  CATEGORY: API ROUTES                                                       │
│  ════════════════════                                                       │
│                                                                              │
│  GAP #6: No Shipping Integration APIs                                       │
│  ────────────────────────────────────                                       │
│  Needed:                                                                    │
│  • GET /api/[storeId]/shipping/rates - Calculate shipping rates             │
│  • GET /api/[storeId]/shipping/serviceability - Check pincode               │
│  • POST /api/[storeId]/orders/[orderId]/ship - Create shipment              │
│  • GET /api/[storeId]/orders/[orderId]/label - Get shipping label           │
│  Priority: 🔴 CRITICAL                                                      │
│                                                                              │
│  GAP #7: No Webhook Endpoint                                                │
│  ───────────────────────────                                                │
│  Needed:   POST /api/webhooks/shiprocket                                   │
│  Impact:   No real-time status updates                                     │
│  Priority: 🔴 CRITICAL                                                      │
│                                                                              │
│  GAP #8: No Tracking API                                                    │
│  ────────────────────────                                                   │
│  Needed:   GET /api/[storeId]/orders/[orderId]/tracking                    │
│  Impact:   No tracking page for customers                                  │
│  Priority: 🟡 HIGH                                                          │
│                                                                              │
│  GAP #9: No Return APIs                                                     │
│  ──────────────────────                                                     │
│  Needed:                                                                    │
│  • POST /api/[storeId]/orders/[orderId]/return                             │
│  • PATCH /api/[storeId]/returns/[returnId]/approve                         │
│  • POST /api/[storeId]/returns/[returnId]/pickup                           │
│  Priority: 🟡 HIGH                                                          │
│                                                                              │
│  GAP #10: No Refund APIs                                                    │
│  ────────────────────────                                                   │
│  Needed:   POST /api/[storeId]/orders/[orderId]/refund                     │
│  Impact:   Manual refund processing                                        │
│  Priority: 🟡 HIGH                                                          │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  CATEGORY: UI COMPONENTS                                                    │
│  ════════════════════════                                                   │
│                                                                              │
│  GAP #11: No Shipping Configuration UI                                      │
│  ─────────────────────────────────────                                      │
│  Needed:   Page to connect Shiprocket account                              │
│  Location: Dashboard > Settings > Integrations > Shipping                  │
│  Priority: 🔴 CRITICAL                                                      │
│                                                                              │
│  GAP #12: No Ship Order UI                                                  │
│  ──────────────────────────                                                 │
│  Needed:   Button/modal to ship order, select courier, confirm             │
│  Location: Order details page                                              │
│  Priority: 🔴 CRITICAL                                                      │
│                                                                              │
│  GAP #13: No Tracking Page                                                  │
│  ─────────────────────────                                                  │
│  Needed:   Customer-facing tracking page                                   │
│  Location: /track/[awbCode] or /order/[orderId]/track                      │
│  Priority: 🟡 HIGH                                                          │
│                                                                              │
│  GAP #14: No Returns Management UI                                          │
│  ─────────────────────────────────                                          │
│  Needed:   Return requests list, approval/rejection UI                     │
│  Location: Dashboard > Orders > Returns                                    │
│  Priority: 🟡 HIGH                                                          │
│                                                                              │
│  GAP #15: No NDR Management UI                                              │
│  ─────────────────────────────                                              │
│  Needed:   NDR list, action buttons (reattempt, RTO)                       │
│  Location: Dashboard > Orders > NDR                                        │
│  Priority: 🟡 HIGH                                                          │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  CATEGORY: SERVICES/UTILITIES                                               │
│  ═════════════════════════════                                              │
│                                                                              │
│  GAP #16: No Shiprocket Service                                             │
│  ──────────────────────────────                                             │
│  Needed:   Service class for Shiprocket API calls                          │
│  Location: src/lib/shiprocket.ts                                           │
│  Priority: 🔴 CRITICAL                                                      │
│                                                                              │
│  GAP #17: No Stock Deduction on Order                                       │
│  ─────────────────────────────────────                                      │
│  Needed:   Automatic stock deduction when order placed/paid                │
│  Location: Order creation webhook/action                                   │
│  Priority: 🟡 HIGH                                                          │
│                                                                              │
│  GAP #18: No Notification Service for Shipping                              │
│  ─────────────────────────────────────────────                              │
│  Needed:   Send SMS/email on shipping status changes                       │
│  Location: src/lib/notifications/shipping.ts                               │
│  Priority: 🟢 MEDIUM                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Schema Changes Required

### Order Model Enhancement

```prisma
// ENHANCED Order Model (Provider-Agnostic)

model Order {
  id               String      @id @default(uuid())
  storeId          String
  store            Store       @relation(fields: [storeId], references: [id])
  orderItems       OrderItem[]
  isPaid           Boolean     @default(false)
  
  // ═══════════════════════════════════════════════════════════════════════
  // CUSTOMER INFO (Enhanced)
  // ═══════════════════════════════════════════════════════════════════════
  name             String      @default("")
  email            String      @default("")
  phone            String      @default("")
  
  // Structured Address (NEW)
  addressLine1     String      @default("")
  addressLine2     String?
  city             String      @default("")
  state            String      @default("")
  pincode          String      @default("")
  
  // NOTE: No need for backward compatibility as database is empty
  // Legacy field (keep for backward compatibility, migrate data)
  address          String      @default("")  // @deprecated
  
  // ═══════════════════════════════════════════════════════════════════════
  // ORDER STATUS
  // ═══════════════════════════════════════════════════════════════════════
  orderStatus      OrderStatus @default(PENDING)
  
  // ═══════════════════════════════════════════════════════════════════════
  // PAYMENT (Existing)
  // ═══════════════════════════════════════════════════════════════════════
  razorpayOrderId   String?
  razorpayPaymentId String?
  paymentMethod     PaymentMethod?
  
  // ═══════════════════════════════════════════════════════════════════════
  // SHIPPING - Use separate Shipment model for flexibility
  // ═══════════════════════════════════════════════════════════════════════
  // Basic shipping info kept on Order for quick access
  awbCode              String?    // Universal tracking number (all providers have this)
  courierName          String?    // "Delhivery", "BlueDart", etc.
  shippedAt            DateTime?
  deliveredAt          DateTime?
  estimatedDelivery    DateTime?
  
  // ═══════════════════════════════════════════════════════════════════════
  // REFUND INFO (NEW)
  // ═══════════════════════════════════════════════════════════════════════
  refundId             String?
  refundAmount         Decimal?
  refundedAt           DateTime?
  refundReason         String?
  
  // ═══════════════════════════════════════════════════════════════════════
  // FINANCIAL
  // ═══════════════════════════════════════════════════════════════════════
  subtotal             Decimal    @default(0)
  shippingCharge       Decimal    @default(0)
  discount             Decimal    @default(0)
  total                Decimal    @default(0)
  
  // ═══════════════════════════════════════════════════════════════════════
  // RELATIONS (NEW) - Shipment is separate for provider flexibility
  // ═══════════════════════════════════════════════════════════════════════
  shipment             Shipment?       // One-to-one relation
  shipmentEvents       ShipmentEvent[]
  returnRequests       ReturnRequest[]
  rtoRecord            RtoRecord?
  ndrRecords           NdrRecord[]
  
  // ═══════════════════════════════════════════════════════════════════════
  // TIMESTAMPS
  // ═══════════════════════════════════════════════════════════════════════
  createdAt            DateTime   @default(now())
  updatedAt            DateTime   @updatedAt
  
  @@index([storeId])
  @@index([orderStatus])
  @@index([awbCode])
}
```

### NEW: Generic Shipment Model (Provider-Agnostic)

```prisma
// ═══════════════════════════════════════════════════════════════════════════
// SHIPMENT MODEL - Works for ANY shipping provider
// ═══════════════════════════════════════════════════════════════════════════
// 
// WHY SEPARATE MODEL?
// 1. Provider-agnostic: Same structure for Shiprocket, Delhivery, BlueDart
// 2. Clean Order model: Order doesn't get cluttered with shipping fields
// 3. Extensible: Add new providers without schema changes
// 4. One-to-one: Each order has exactly one shipment
//
// ═══════════════════════════════════════════════════════════════════════════

model Shipment {
  id              String   @id @default(uuid())
  orderId         String   @unique
  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  storeId         String
  store           Store    @relation(fields: [storeId], references: [id])
  
  // ═══════════════════════════════════════════════════════════════════════
  // PROVIDER INFO (Generic - works for any provider)
  // ═══════════════════════════════════════════════════════════════════════
  provider           ShippingProvider  // SHIPROCKET, DELHIVERY, BLUEDART, MANUAL
  
  // Provider's internal IDs (generic names, NOT provider-specific!)
  // ❌ WRONG: shiprocketOrderId, delhiveryWaybill, bluedartDocket
  // ✅ RIGHT: providerOrderId, providerShipmentId (works for ALL)
  providerOrderId     String?   // Shiprocket: "234567890", Delhivery: "DL123456"
  providerShipmentId  String?   // Provider's shipment reference (if separate)
  
  // ═══════════════════════════════════════════════════════════════════════
  // UNIVERSAL SHIPPING INFO (Same structure for ALL providers)
  // ═══════════════════════════════════════════════════════════════════════
  awbCode         String?       // Tracking number (universal - all couriers have this)
  courierName     String?       // Human-readable: "Delhivery Surface", "BlueDart Express"
  courierId       String?       // Provider's courier ID (for API calls)
  
  // Status (mapped to common statuses regardless of provider)
  status          ShipmentStatus @default(PENDING)
  
  // Package details (universal)
  weight          Decimal?      @db.Decimal(8, 3)  // kg
  length          Decimal?      @db.Decimal(8, 2)  // cm
  breadth         Decimal?      @db.Decimal(8, 2)  // cm
  height          Decimal?      @db.Decimal(8, 2)  // cm
  
  // Costs
  shippingCost    Decimal?      @db.Decimal(10, 2)
  codAmount       Decimal?      @db.Decimal(10, 2)
  isCod           Boolean       @default(false)
  
  // Timestamps
  shippedAt       DateTime?
  deliveredAt     DateTime?
  estimatedDelivery DateTime?
  
  // Label & Manifest
  labelUrl        String?
  manifestUrl     String?
  
  // Pickup info
  pickupScheduled   Boolean       @default(false)
  pickupScheduledAt DateTime?
  pickupDate        DateTime?
  pickupTokenNumber String?
  pickupAddressId   String?       // Reference to store's pickup location
  
  // RTO info (if shipment returned)
  rtoAwb            String?
  rtoReason         String?
  rtoInitiatedAt    DateTime?
  rtoDeliveredAt    DateTime?
  
  // Relations
  shipmentEvents  ShipmentEvent[]
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@index([orderId])
  @@index([storeId])
  @@index([awbCode])
  @@index([provider])
  @@index([status])
  @@index([providerOrderId])
}

// ═══════════════════════════════════════════════════════════════════════════
// SHIPPING PROVIDER ENUM - Add new providers here (no schema changes needed!)
// ═══════════════════════════════════════════════════════════════════════════

enum ShippingProvider {
  SHIPROCKET      // Aggregator (access to 17+ couriers via single API)
  DELHIVERY       // Direct integration (future)
  BLUEDART        // Direct integration (future)
  DTDC            // Direct integration (future)
  ECOM_EXPRESS    // Direct integration (future)
  MANUAL          // Speed Post, self-delivery, local courier
}

enum ShipmentStatus {
  PENDING           // Shipment created, not yet handed over
  PICKUP_SCHEDULED  // Courier pickup scheduled
  PICKED_UP         // Courier collected package
  IN_TRANSIT        // On the way to destination
  OUT_FOR_DELIVERY  // Last mile delivery in progress
  DELIVERED         // Successfully delivered
  RTO_INITIATED     // Return to origin started (delivery failed)
  RTO_IN_TRANSIT    // Package returning to seller
  RTO_DELIVERED     // Returned to seller
  CANCELLED         // Shipment cancelled before dispatch
  FAILED            // Delivery failed permanently
}
```

### How Different Providers Use the Same Schema

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE: Same Shipment model works for ALL providers
// ═══════════════════════════════════════════════════════════════════════════

// Shiprocket shipment
const shiprocketShipment = {
  provider: "SHIPROCKET",
  providerOrderId: "234567890",        // Shiprocket's order ID
  providerShipmentId: "345678901",     // Shiprocket's shipment ID
  awbCode: "DLVRY1234567890",          // AWB from Delhivery (via Shiprocket)
  courierName: "Delhivery Surface",
  courierId: "25",
  status: "IN_TRANSIT"
};

// Delhivery direct shipment (future)
const delhiveryShipment = {
  provider: "DELHIVERY",
  providerOrderId: "1234567890123",    // Delhivery waybill IS the order ID
  providerShipmentId: null,            // Delhivery doesn't have separate shipment ID
  awbCode: "1234567890123",            // Same as waybill for Delhivery
  courierName: "Delhivery",
  courierId: null,
  status: "IN_TRANSIT"
};

// BlueDart direct shipment (future)
const bluedartShipment = {
  provider: "BLUEDART",
  providerOrderId: "BD123456789",      // BlueDart docket number
  providerShipmentId: null,
  awbCode: "BD123456789",              // Same as docket for BlueDart
  courierName: "BlueDart Express",
  courierId: null,
  status: "OUT_FOR_DELIVERY"
};

// Manual shipment (Speed Post)
const manualShipment = {
  provider: "MANUAL",
  providerOrderId: null,               // No provider system
  providerShipmentId: null,
  awbCode: "EE123456789IN",            // Manually entered tracking
  courierName: "India Post Speed Post",
  courierId: null,
  status: "IN_TRANSIT"
};
```

### New Models

```prisma
// ═══════════════════════════════════════════════════════════════════════════
// SHIPMENT EVENT - For tracking timeline (Provider-Agnostic)
// ═══════════════════════════════════════════════════════════════════════════

model ShipmentEvent {
  id              String   @id @default(uuid())
  
  // Can link to either Order or Shipment (prefer Shipment)
  shipmentId      String?
  shipment        Shipment? @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  // Event Details (provider-agnostic)
  status          String   // "in_transit", "out_for_delivery", "delivered"
  statusCode      String?  // Provider's status code (string for flexibility)
  description     String   // Human-readable description
  location        String?  // City/Hub where event occurred
  
  // Raw data from provider (for debugging/reference)
  rawPayload      Json?    // Store original webhook payload
  
  // Timestamps
  eventTimestamp  DateTime // When event occurred at courier
  createdAt       DateTime @default(now())
  
  @@index([shipmentId])
  @@index([orderId])
  @@index([eventTimestamp])
}

// ═══════════════════════════════════════════════════════════════════════════
// RETURN REQUEST - Customer-initiated returns (Provider-Agnostic)
// ═══════════════════════════════════════════════════════════════════════════

model ReturnRequest {
  id              String   @id @default(uuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id])
  storeId         String
  store           Store    @relation(fields: [storeId], references: [id])
  
  // Request Details
  reason          ReturnReason
  comments        String?
  images          String[] // URLs of customer-uploaded images
  
  // Status Tracking
  status          ReturnStatus @default(PENDING_APPROVAL)
  requestedAt     DateTime     @default(now())
  approvedAt      DateTime?
  rejectedAt      DateTime?
  rejectedReason  String?
  
  // Return Shipment (Generic - works for any provider)
  returnProvider       ShippingProvider?  // Which provider handles return
  returnProviderOrderId String?           // Provider's return order ID
  returnAwb            String?            // Return tracking number
  
  // Pickup Tracking
  pickupScheduledAt    DateTime?
  pickedUpAt           DateTime?
  receivedAt           DateTime?
  
  // Quality Check
  qcStatus        QCStatus?
  qcNotes         String?
  
  // Resolution
  resolution      ReturnResolution?
  refundAmount    Decimal?
  exchangeOrderId String?
  
  // Items in return
  items           ReturnRequestItem[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([orderId])
  @@index([storeId])
  @@index([status])
}

model ReturnRequestItem {
  id              String   @id @default(uuid())
  returnRequestId String
  returnRequest   ReturnRequest @relation(fields: [returnRequestId], references: [id], onDelete: Cascade)
  orderItemId     String
  orderItem       OrderItem @relation(fields: [orderItemId], references: [id])
  quantity        Int
  reason          String?
}

// ═══════════════════════════════════════════════════════════════════════════
// RTO RECORD - For failed deliveries (Provider-Agnostic)
// ═══════════════════════════════════════════════════════════════════════════

model RtoRecord {
  id              String    @id @default(uuid())
  orderId         String    @unique
  order           Order     @relation(fields: [orderId], references: [id])
  
  originalAwb     String
  rtoAwb          String?
  reason          String
  
  status          RtoStatus @default(INITIATED)
  
  initiatedAt     DateTime
  deliveredAt     DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([status])
}

// ═══════════════════════════════════════════════════════════════════════════
// NDR RECORD - Non-Delivery Reports
// ═══════════════════════════════════════════════════════════════════════════

model NdrRecord {
  id              String    @id @default(uuid())
  orderId         String
  order           Order     @relation(fields: [orderId], references: [id])
  
  awbCode         String
  reason          String    // NDR reason from courier
  reasonCode      String?   // Shiprocket NDR code
  
  attemptNumber   Int       // Which delivery attempt (1, 2, 3)
  
  // Action taken
  action          NdrAction?
  actionTakenAt   DateTime?
  actionNotes     String?
  
  // Reschedule details (if action = RESCHEDULE)
  rescheduleDate  DateTime?
  newPhone        String?
  newAddress      String?
  
  status          NdrStatus @default(PENDING)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([orderId])
  @@index([status])
}

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════

enum ReturnReason {
  WRONG_SIZE
  DEFECTIVE
  WRONG_PRODUCT
  NOT_AS_DESCRIBED
  CHANGED_MIND
  DAMAGED_IN_TRANSIT
  OTHER
}

enum ReturnStatus {
  PENDING_APPROVAL
  APPROVED
  REJECTED
  PICKUP_SCHEDULED
  PICKUP_COMPLETED
  IN_TRANSIT
  RECEIVED
  QC_IN_PROGRESS
  QC_PASSED
  QC_FAILED
  REFUND_PROCESSED
  EXCHANGE_SHIPPED
  COMPLETED
  CANCELLED
}

enum QCStatus {
  PENDING
  PASSED
  FAILED_MINOR
  FAILED_MAJOR
}

enum ReturnResolution {
  FULL_REFUND
  PARTIAL_REFUND
  EXCHANGE
  REPLACEMENT
  STORE_CREDIT
  REJECTED
}

enum RtoStatus {
  INITIATED
  IN_TRANSIT
  DELIVERED
  PROCESSED
}

enum NdrAction {
  RESCHEDULE
  RTO
  CALL_CUSTOMER
  ADDRESS_UPDATE
}

enum NdrStatus {
  PENDING
  ACTION_TAKEN
  RESOLVED
  RTO_INITIATED
}
```

### Store Model Enhancement

```prisma
// Add to Store model

model Store {
  // ... existing fields
  
  // ═══════════════════════════════════════════════════════════════════════
  // SHIPPING SETTINGS (NEW)
  // ═══════════════════════════════════════════════════════════════════════
  
  // Pickup Location (where courier picks up from)
  pickupAddressLine1  String?
  pickupAddressLine2  String?
  pickupCity          String?
  pickupState         String?
  pickupPincode       String?
  pickupPhone         String?
  
  // Default Package (for rate calculation)
  defaultWeight       Decimal?  @default(0.5)  // kg
  defaultLength       Decimal?  @default(25)   // cm
  defaultBreadth      Decimal?  @default(20)   // cm
  defaultHeight       Decimal?  @default(10)   // cm
  
  // ═══════════════════════════════════════════════════════════════════════
  // RETURN POLICY SETTINGS (NEW)
  // ═══════════════════════════════════════════════════════════════════════
  
  returnWindowDays          Int      @default(7)
  allowChangeMindReturn     Boolean  @default(true)
  returnShippingPaidBy      ReturnShippingPayer @default(SELLER_FOR_DEFECTS)
  refundTiming              RefundTiming @default(AFTER_RECEIVED)
  requireOriginalPackaging  Boolean  @default(true)
  autoRestoreStockOnRTO     Boolean  @default(true)
  
  // Relations (NEW)
  returnRequests    ReturnRequest[]
}

enum ReturnShippingPayer {
  SELLER
  CUSTOMER
  SELLER_FOR_DEFECTS  // Seller pays if defect, customer pays for change of mind
}

enum RefundTiming {
  ON_APPROVAL
  ON_PICKUP
  AFTER_RECEIVED
}
```

### StoreIntegration Enhancement

```prisma
// IntegrationType enum - add SHIPROCKET

enum IntegrationType {
  RAZORPAY
  MSG91
  TWILIO
  SHIPROCKET  // NEW
  DELHIVERY   // NEW (future)
}

// StoreIntegration usage for Shiprocket:
// {
//   storeId: "xxx",
//   integrationType: "SHIPROCKET",
//   credentials: {
//     email: "encrypted_email",
//     password: "encrypted_password",
//     token: "encrypted_jwt_token",
//     tokenExpiry: "2026-01-15T00:00:00Z"
//   },
//   isActive: true
// }
```

---

## API Routes Needed

### Directory Structure

```
src/app/api/
├── [storeId]/
│   ├── shipping/
│   │   ├── rates/
│   │   │   └── route.ts          # POST - Calculate shipping rates
│   │   ├── serviceability/
│   │   │   └── route.ts          # GET - Check pincode serviceability
│   │   └── couriers/
│   │       └── route.ts          # GET - List available couriers
│   │
│   ├── orders/
│   │   └── [orderId]/
│   │       ├── ship/
│   │       │   └── route.ts      # POST - Create shipment
│   │       ├── label/
│   │       │   └── route.ts      # GET - Get shipping label
│   │       ├── tracking/
│   │       │   └── route.ts      # GET - Get tracking info
│   │       ├── return/
│   │       │   └── route.ts      # POST - Create return request
│   │       ├── cancel-shipment/
│   │       │   └── route.ts      # POST - Cancel shipment
│   │       └── refund/
│   │           └── route.ts      # POST - Process refund
│   │
│   ├── returns/
│   │   ├── route.ts              # GET - List returns
│   │   └── [returnId]/
│   │       ├── route.ts          # GET - Return details
│   │       ├── approve/
│   │       │   └── route.ts      # PATCH - Approve return
│   │       ├── reject/
│   │       │   └── route.ts      # PATCH - Reject return
│   │       ├── pickup/
│   │       │   └── route.ts      # POST - Schedule pickup
│   │       ├── qc/
│   │       │   └── route.ts      # PATCH - Update QC result
│   │       └── refund/
│   │           └── route.ts      # POST - Process return refund
│   │
│   ├── ndr/
│   │   ├── route.ts              # GET - List NDRs
│   │   └── [ndrId]/
│   │       ├── route.ts          # GET - NDR details
│   │       └── action/
│   │           └── route.ts      # POST - Take NDR action
│   │
│   └── integrations/
│       └── shiprocket/
│           ├── route.ts          # GET/POST - Get/Save credentials
│           ├── test/
│           │   └── route.ts      # POST - Test connection
│           └── pickup-locations/
│               └── route.ts      # GET - List pickup locations
│
└── webhooks/
    └── shiprocket/
        └── route.ts              # POST - Handle Shiprocket webhooks
```

### Key API Implementations

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// POST /api/[storeId]/shipping/rates
// Calculate shipping rates for an order
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: Request, { params }) {
  const { storeId } = params;
  const body = await req.json();
  
  // Required: pickup_pincode, delivery_pincode, weight
  // Optional: cod (boolean), declared_value
  
  const token = await getShiprocketToken(storeId);
  
  const response = await fetch(
    'https://apiv2.shiprocket.in/v1/external/courier/serviceability/',
    {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      // Query params...
    }
  );
  
  // Return formatted rates
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/[storeId]/orders/[orderId]/ship
// Create shipment and generate AWB
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: Request, { params }) {
  const { storeId, orderId } = params;
  const { courierId, pickupLocationId } = await req.json();
  
  // 1. Get order details
  // 2. Create order in Shiprocket
  // 3. Generate AWB
  // 4. Update order with shipping details
  // 5. Send notification to customer
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/webhooks/shiprocket
// Handle status updates from Shiprocket
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: Request) {
  const payload = await req.json();
  
  // 1. Verify webhook signature (if available)
  // 2. Find order by AWB or Shiprocket ID
  // 3. Update order status
  // 4. Create ShipmentEvent record
  // 5. Send notification to customer
  // 6. Handle special cases (NDR, RTO)
}
```

---

## UI Components Required

### Dashboard Pages

```
src/app/(dashboard)/[storeId]/
├── orders/
│   ├── page.tsx              # Enhance with shipping actions
│   ├── [orderId]/
│   │   └── page.tsx          # Add shipping details, tracking
│   ├── ndr/
│   │   └── page.tsx          # NEW: NDR management
│   └── returns/
│       ├── page.tsx          # NEW: Returns list
│       └── [returnId]/
│           └── page.tsx      # NEW: Return details
│
└── settings/
    └── integrations/
        └── shipping/
            └── page.tsx      # NEW: Shiprocket connection
```

### Component List

```
src/components/
├── shipping/
│   ├── ship-order-dialog.tsx      # Modal to ship order
│   ├── courier-selector.tsx       # Select courier from rates
│   ├── shipping-label-button.tsx  # Download label
│   ├── tracking-timeline.tsx      # Visual tracking display
│   ├── ndr-action-dialog.tsx      # Take NDR action
│   └── package-details-form.tsx   # Weight/dimensions input
│
├── returns/
│   ├── return-request-form.tsx    # Customer return form
│   ├── return-approval-dialog.tsx # Seller approve/reject
│   ├── qc-result-form.tsx         # QC pass/fail input
│   └── return-status-badge.tsx    # Status indicator
│
├── order/
│   ├── order-shipping-info.tsx    # Shipping details card
│   ├── order-tracking-card.tsx    # Embedded tracking
│   └── order-actions.tsx          # Ship, cancel, refund buttons
│
└── integrations/
    └── shiprocket-connect.tsx     # Setup Shiprocket
```

### Customer-Facing Pages

```
src/app/(storefront)/
└── track/
    └── [awbCode]/
        └── page.tsx          # Public tracking page

// OR embedded in order status page:
src/app/(storefront)/
└── order/
    └── [orderId]/
        └── page.tsx          # Order status + tracking
```

---

## References

- Part 1: Delivery Overview & Analysis
- Part 2: Indian Delivery Ecosystem
- Part 3A: Order-to-Delivery Flow
- Part 3B: Packaging & Handover
- Part 4A: Shiprocket Integration API
- Part 4B: Shiprocket Webhooks & Tracking
- Part 5: Returns & Refunds
