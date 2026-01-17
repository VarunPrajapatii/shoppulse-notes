# Part 1: Shipping Implementation - Database Schema

## Overview

This document defines the **complete, future-proof database schema** for ShopPulse shipping system supporting:
1. **Shiprocket Integration** - Automated shipping with aggregator
2. **Manual Shipping** - Speed Post, self-delivery, custom couriers
3. **Future Providers** - Delhivery direct, eKart, any new providers



## Complete Schema

### 1. Address Model (Seller Locations Only)

> **Design Decision:** This Address model is used **only** for seller-side addresses: pickup locations, warehouses, and return addresses. Customer shipping/billing addresses are stored **directly in the Order model** (denormalized) for performance and to preserve historical accuracy even if customer updates their address later.

### Pickup Address Storage & Sync Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PICKUP ADDRESS FLOW                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  STORAGE: Local Address model with provider-agnostic JSON metadata       │
│                                                                           │
│  CREATE: Via Shiprocket POST /settings/company/addpickup                 │
│          → On success, save to local Address model                      │
│                                                                           │
│  SYNC TRIGGERS:                                                          │
│    1. Manual "Sync from Shiprocket" button in Settings                   │
│    2. Weekly cron job (every Sunday midnight)                            │
│    3. After API error "pickup location not found" during shipment        │
│                                                                           │
│  SYNC LOGIC:                                                             │
│    GET /settings/company/pickup → Compare with local →                  │
│    • New in provider: ADD (isActive=true)                                │
│    • Missing from provider: permanenet delete from database             │
│    • Already exists: UPDATE address fields if changed                    │
│    • Default: If current default deleted → first active = default       │
│                                                                           │
│  SHIPMENT API: Shiprocket uses pickup_location NAME (string), not ID!   │
│                Example: "pickup_location": "HomeNew"                      │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

```prisma
model Address {
  id          String   @id @default(uuid())
  
  // Relations
  storeId     String
  store       Store        @relation(fields: [storeId], references: [id], onDelete: Cascade)

  // CRITICAL: This name is sent to shipping providers in API calls!
  // For Shiprocket: pickup_location: "LocationName" (string, not ID)
  name        String              // "Home Office", "Warehouse Delhi", etc.
  
  // Contact Info
  phone       String
  email       String?
  
  // Address Fields
  line1       String              // House/Flat/Building
  line2       String?             // Street/Area/Landmark
  city        String
  state       String
  pincode     String
  country     String   @default("IN")
  
  // Geocoding (optional, for future)
  latitude    Float?
  longitude   Float?
  
  // Metadata
  type        AddressType  @default(PICKUP)
  isDefault   Boolean      @default(false)  // Only one per type per store
  
  // Provider-Agnostic Metadata (JSON for flexibility)
  // Stores provider-specific data without coupling schema to any provider
  providerMetadata  Json?    // See structure below
  
  // Sync Tracking
  lastSyncedAt      DateTime?    // When last synced from shipping provider
  
  
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  // Indexes
  @@index([storeId, type, isActive])  // For fast pickup location queries
  @@index([storeId])
  @@index([pincode])
}

// providerMetadata JSON structure example:
// For Shiprocket:
// {
//   "shiprocket": {
//     "pickupId": 4984500,        // Shiprocket's internal ID
//     "status": 2,                 // 1=pending, 2=verified
//     "phoneVerified": true,
//     "pickupCode": "HOMEOFC",
//     "rtoAddressId": 4984500
//   }
// }
//
// For future Delhivery direct:
// {
//   "delhivery": {
//     "warehouseId": "WH123",
//     "warehouseCode": "DEL-WH-01"
//   }
// }

enum AddressType {
  PICKUP          // Seller pickup location (where courier collects packages)
  RETURN          // Return address (where returned items go)
  WAREHOUSE       // Storage/inventory location
}
```

### 2. Order Model (Enhanced with Denormalized Addresses)

> **Design Decision:** Shipping and billing addresses are stored **directly in the Order model** (not as references to Address table). This ensures:
> - Order history remains accurate even if customer changes their address later
> - Better query performance (no joins needed)
> - Complete order snapshot for invoicing and disputes

```prisma
model Order {
  id                    String        @id @default(uuid())
  orderNumber           String        @unique  // "ORD-ABC123"
  storeId               String
  store                 Store         @relation(fields: [storeId], references: [id])
  
  // Customer Info (denormalized for quick access)
  customerName          String
  customerEmail         String
  customerPhone         String
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SHIPPING ADDRESS (stored directly, not as reference)
  // ═══════════════════════════════════════════════════════════════════════════
  shippingLine1         String        // House/Flat/Building
  shippingLine2         String?       // Street/Area/Landmark
  shippingCity          String
  shippingState         String
  shippingPincode       String
  shippingCountry       String        @default("IN")
  shippingLatitude      Float?        // For delivery optimization
  shippingLongitude     Float?
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BILLING ADDRESS
  // If isShippingSameAsBilling = true, billing fields can be empty/null
  // ═══════════════════════════════════════════════════════════════════════════
  isShippingSameAsBilling Boolean     @default(true)
  billingName           String?       // Billing contact name
  billingPhone          String?
  billingEmail          String?
  billingLine1          String?       // Only filled if different from shipping
  billingLine2          String?
  billingCity           String?
  billingState          String?
  billingPincode        String?
  billingCountry        String?       @default("IN")
  
  // Order Items
  orderItems            OrderItem[]
  
  // Pricing
  subtotal              Decimal       @db.Decimal(10, 2)
  shippingCost          Decimal       @default(0) @db.Decimal(10, 2)  // Actual shipping charged
  shippingEstimate      Decimal?      @db.Decimal(10, 2)  // Estimate shown at checkout (avg of courier options)
  tax                   Decimal       @default(0) @db.Decimal(10, 2)
  discount              Decimal       @default(0) @db.Decimal(10, 2)
  total                 Decimal       @db.Decimal(10, 2)
  
  // Status
  orderStatus           OrderStatus   @default(PENDING)
  
  // Payment
  isPaid                Boolean       @default(false)
  paymentMethod         PaymentMethod?
  paymentId             String?       // Razorpay payment_id
  
  // Shipments (one order can have multiple)
  shipments             Shipment[]
  
  // Return/Refund
  returnRequests        ReturnRequest[]
  
  // Timestamps
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
  paidAt                DateTime?
  
  // Notes
  customerNote          String?       // Special instructions from customer
  internalNote          String?       // Seller's internal notes
  
  @@index([storeId])
  @@index([orderStatus])
  @@index([createdAt])
  @@index([shippingPincode])  // For shipping analytics
}

// Helper comment for developers:
// When generating invoice, use billing address if isShippingSameAsBilling=false,
// otherwise use shipping address for billing details.

enum OrderStatus {
  PENDING              // Created, no payment
  PAYMENT_INITIATED    // Payment in progress
  PAID                 // Payment successful
  PROCESSING           // Being packed
  READY_TO_SHIP        // Packed, awaiting pickup
  SHIPPED              // Handed to courier
  IN_TRANSIT           // With courier
  OUT_FOR_DELIVERY     // Last mile
  DELIVERED            // Completed
  CANCELLED            // Cancelled
  RETURN_REQUESTED     // Return initiated
  RETURN_IN_TRANSIT    // Return shipment moving
  RETURNED             // Returned to seller
  REFUNDED             // Money returned
}

enum PaymentMethod {
  RAZORPAY
  STRIPE
  COD
  BANK_TRANSFER
  UPI
}
```

### 3. Package Preset Model (Box Templates)

> **Design Decision:** Package presets allow sellers to define reusable box templates for faster shipping. The system can auto-suggest a preset based on order items, but sellers can override. The preset used is stored in Shipment for audit purposes, but actual dimensions are stored separately (in case seller modifies).

```prisma
model PackagePreset {
  id                String    @id @default(uuid())
  storeId           String
  store             Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  name              String    // "Small Envelope", "Medium Box", "Large Box"
  
  // Dimensions (in CM)
  length            Decimal   @db.Decimal(8, 2)
  breadth           Decimal   @db.Decimal(8, 2)
  height            Decimal   @db.Decimal(8, 2)
  
  // Weight limits (in KG)
  maxWeight         Decimal   @db.Decimal(8, 3)  // Max weight this box can hold
  boxWeight         Decimal   @default(0) @db.Decimal(8, 3)  // Empty box weight (added to total)
  
  // Calculated field (for rate comparison preview)
  volumetricWeight  Decimal?  @db.Decimal(8, 3)  // L×B×H / 5000
  
  // Item capacity hints (optional, for auto-suggestion)
  maxItems          Int?      // Suggested max items this box fits
  description       String?   // "For 1-2 small items", "For clothing bundles"
  
  // Selection & Display
  priority          Int       @default(0)    // Higher = show first in dropdown
  isDefault         Boolean   @default(false)  // Pre-selected in Ship modal
  isActive          Boolean   @default(true)   // Show in dropdown
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  shipments         Shipment[]  // Shipments that used this preset
  
  @@index([storeId, isActive])
  @@index([storeId])
}
```

**Auto-Suggestion Logic:**
```typescript
// When Ship modal opens, suggest preset based on:
// 1. Total order items count vs preset.maxItems
// 2. Total order weight vs preset.maxWeight
// 3. If multiple match, pick lowest priority (smallest box)

function suggestPreset(orderItems: OrderItem[], presets: PackagePreset[]): PackagePreset | null {
  const totalWeight = orderItems.reduce((sum, item) => 
    sum + (item.product.weight * item.quantity), 0
  );
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  
  return presets
    .filter(p => p.isActive)
    .filter(p => !p.maxWeight || totalWeight <= p.maxWeight)
    .filter(p => !p.maxItems || totalItems <= p.maxItems)
    .sort((a, b) => a.priority - b.priority)[0] || null;
}
```

---

### 4. Shipment Model (Core of Shipping)

```prisma
model Shipment {
  id                    String            @id @default(uuid())
  shipmentNumber        String            @unique  // "SHP-ABC123"
  
  // Order relation
  orderId               String
  order                 Order             @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  // Store relation (denormalized for faster queries by store)
  storeId               String
  store                 Store             @relation(fields: [storeId], references: [id])
  
  // Provider Info (CRITICAL - Provider Agnostic)
  provider              ShippingProvider  // SHIPROCKET, MANUAL, DELHIVERY
  providerOrderId       String?           // Shiprocket order_id
  providerShipmentId    String?           // Shiprocket shipment_id
  
  // Courier Info
  courierCode           String?           // "delhivery", "bluedart", "speedpost"
  courierName           String?           // "Delhivery Surface"
  
  // Tracking
  awbCode               String?           // Airway Bill Number
  trackingUrl           String?           // Public tracking URL
  
  // Package Preset (for audit trail - which box template was used)
  packagePresetId       String?           // Reference to PackagePreset used
  packagePreset         PackagePreset?    @relation(fields: [packagePresetId], references: [id])
  // Note: Actual dimensions stored below (seller may override preset values)
  
  // Package Details (actual values used for shipping)
  weight                Decimal?          @db.Decimal(8, 3)  // in KG (product weight + box weight)
  length                Decimal?          @db.Decimal(8, 2)  // in CM
  breadth               Decimal?          @db.Decimal(8, 2)
  height                Decimal?          @db.Decimal(8, 2)
  volumetricWeight      Decimal?          @db.Decimal(8, 3)  // Calculated: L×B×H / 5000
  
  // Shipping Method
  shippingMode          ShippingMode      @default(SURFACE)
  
  // Pickup
  isPickedUp            Boolean           @default(false)
  pickupAddressId       String?
  pickupAddress         Address?          @relation(fields: [pickupAddressId], references: [id])
  pickupScheduledDate   DateTime?
  pickupToken           String?           // Shiprocket pickup token
  pickedUpAt            DateTime?
  
  // Handover Method (how seller gives package to courier)
  handoverMethod        HandoverMethod    @default(PICKUP)
  // PICKUP = Courier comes to pickup location (goes through 2-hour batching pipeline)
  // DROPOFF = Seller takes package to courier hub (no pickup scheduling needed)
  
  // Delivery
  estimatedDeliveryDate DateTime?
  deliveredAt           DateTime?
  podImage              String?           // Proof of Delivery image URL
  podSignature          String?           // Signature data
  
  // Status
  status                ShipmentStatus    @default(PENDING)
  currentLocation       String?           // Last known location
  
  // Label
  labelUrl              String?           // Shipping label PDF
  manifestId            String?           // Manifest reference
  manifestUrl           String?           // Manifest reference
  
  // Events (tracking history)
  events                ShipmentEvent[]
  
  // Costs
  shippingCharge        Decimal?          @db.Decimal(10, 2)
  codCharge             Decimal?          @db.Decimal(10, 2)
  insuranceCharge       Decimal?          @db.Decimal(10, 2)
  totalCharge           Decimal?          @db.Decimal(10, 2)
  
  // COD
  isCod                 Boolean           @default(false)
  codAmount             Decimal?          @db.Decimal(10, 2)
  codRemitted           Boolean           @default(false)
  codRemittedAt         DateTime?
  
  // Metadata (provider-specific data)
  metadata              Json?             // Any extra data
  
  // Timestamps
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
  shippedAt             DateTime?
  deliveredAt           DateTime?
  
  @@unique([awbCode, provider])
  @@index([orderId])
  @@index([storeId])   // For store-level shipment queries
  @@index([status])
  @@index([provider])
  @@index([awbCode])
  @@index([createdAt])
}

enum ShippingProvider {
  SHIPROCKET       // Aggregator
  DELHIVERY        // Direct integration
  EKART            // Flipkart logistics
  BLUEDART         // Direct
  DTDC             // Direct
  ECOM_EXPRESS     // Direct
  MANUAL           // Speed Post, self-delivery
  OTHER            // Any custom
}

enum ShipmentStatus {
  PENDING              // Created, not shipped
  MANIFESTED           // Ready for pickup
  PICKUP_SCHEDULED     // Pickup date set
  PICKED_UP            // Courier collected
  IN_TRANSIT           // Moving
  OUT_FOR_DELIVERY     // With delivery agent
  DELIVERED            // Success
  DELIVERY_FAILED      // Attempt failed
  RTO_INITIATED        // Return started
  RTO_IN_TRANSIT       // Returning
  RTO_DELIVERED        // Back to seller
  CANCELLED            // Cancelled
  LOST                 // Lost in transit
}

enum ShippingMode {
  SURFACE              // Ground transport (3-7 days)
  EXPRESS              // Priority ground (2-4 days)
  AIR                  // Air freight (1-2 days)
  SAME_DAY             // Same day delivery
  HYPERLOCAL           // Within hours
}

enum HandoverMethod {
  PICKUP               // Courier comes to seller's pickup location
                       // → Added to Redis queue → 2-hour batch → Pickup scheduled
  DROPOFF              // Seller drops package at courier hub
                       // → No pickup scheduling → Hub scan triggers webhook → Status updates
}
```

### 4. Shipment Events (Tracking History)

```prisma
model ShipmentEvent {
  id                String      @id @default(uuid())
  
  shipmentId        String
  shipment          Shipment    @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  
  // Event Info
  status            String      // Raw status from provider
  statusCode        String?     // Normalized status code
  description       String      // Human-readable description
  location          String?     // City/Hub where event occurred
  
  // Timestamps
  eventTime         DateTime    // When event actually happened
  receivedAt        DateTime    @default(now())  // When we got the webhook
  
  // Raw Data
  rawPayload        Json?       // Original webhook payload
  
  @@unique([shipmentId, status, eventTime])
  @@index([shipmentId])
  @@index([eventTime])
}
```

### 5. Return Request Model

```prisma
model ReturnRequest {
  id                String            @id @default(uuid())
  returnNumber      String            @unique  // "RET-ABC123"
  
  orderId           String
  order             Order             @relation(fields: [orderId], references: [id])
  
  // Items being returned
  items             ReturnItem[]
  
  // Reason
  reason            ReturnReason
  reasonDetail      String?           // Customer's explanation
  
  // Status
  status            ReturnStatus      @default(REQUESTED)
  
  // Pickup
  pickupShipmentId  String?           // Reverse shipment
  pickupShipment    Shipment?         @relation(fields: [pickupShipmentId], references: [id])
  
  // Refund
  refundAmount      Decimal?          @db.Decimal(10, 2)
  refundStatus      RefundStatus?
  refundId          String?           // Payment gateway refund ID
  refundedAt        DateTime?
  
  // Inspection
  inspectionStatus  InspectionStatus?
  inspectionNotes   String?
  
  // Timestamps
  requestedAt       DateTime          @default(now())
  approvedAt        DateTime?
  completedAt       DateTime?
  
  @@index([orderId])
  @@index([status])
}

model ReturnItem {
  id              String          @id @default(uuid())
  returnRequestId String
  returnRequest   ReturnRequest   @relation(fields: [returnRequestId], references: [id], onDelete: Cascade)
  
  orderItemId     String
  quantity        Int
  
  @@index([returnRequestId])
}

enum ReturnReason {
  WRONG_SIZE
  WRONG_COLOR
  WRONG_PRODUCT
  DEFECTIVE
  DAMAGED_IN_TRANSIT
  NOT_AS_DESCRIBED
  CHANGED_MIND
  QUALITY_NOT_GOOD
  OTHER
}

enum ReturnStatus {
  REQUESTED
  APPROVED
  REJECTED
  PICKUP_SCHEDULED
  PICKED_UP
  RECEIVED
  INSPECTED
  COMPLETED
  CANCELLED
}

enum RefundStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum InspectionStatus {
  PENDING
  PASS
  FAIL
  PARTIAL
}
```

### 6. Store Shipping Settings

> **Design Decision:** Default package dimensions have been removed. Product dimensions are now mandatory in the Product model, so shipment dimensions are calculated from order items. Also removed `preferredCourierCode` since courier is selected dynamically based on cheapest/fastest preference.

```prisma
model StoreShippingSettings {
  id                    String    @id @default(uuid())
  storeId               String    @unique
  store                 Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  // Auto-ship settings
  autoShipEnabled       Boolean   @default(false)
  autoShipAfterMinutes  Int       @default(240)  // Wait time after payment (default: 4 hours)
  courierSelection      CourierSelectionMode @default(CHEAPEST)
  
  // Pickup settings
  defaultPickupAddressId String?  // Reference to Address model (PICKUP type)
  defaultHandoverMethod HandoverMethod @default(PICKUP)  // PICKUP or DROPOFF
  pickupCutoffHour      Int       @default(14)  // 2 PM - orders after this pickup tomorrow
  skipWeekendPickup     Boolean   @default(false)
  
  // Insurance
  insureAboveValue      Decimal?  @db.Decimal(10, 2)  // Auto-insure orders above this value
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}

enum CourierSelectionMode {
  CHEAPEST    // Select lowest-priced courier for each pincode
  FASTEST     // Select courier with shortest ETA
  DEFAULT     // Use aggregator's preferred courier (if set)
}
```

---

### 7. Required Store Model Relations

> **Note:** These relations must be added to the existing Store model in `schema.prisma`.

```prisma
model Store {
  // ... existing fields (name, userId, etc.) ...
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SHIPPING RELATIONS (Add these to existing Store model)
  // ═══════════════════════════════════════════════════════════════════════════
  addresses           Address[]
  packagePresets      PackagePreset[]
  shipments           Shipment[]
  returnRequests      ReturnRequest[]
  shippingSettings    StoreShippingSettings?
  
  // ... rest of existing model ...
}
```

---

### 8. Required Order Model Enhancements

> **Note:** The existing Order model needs these additions.

```prisma
model Order {
  // ... existing fields ...
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SHIPPING ADDRESS (denormalized - stored directly, not as reference)
  // ═══════════════════════════════════════════════════════════════════════════
  shippingLine1         String        @default("")
  shippingLine2         String?
  shippingCity          String        @default("")
  shippingState         String        @default("")
  shippingPincode       String        @default("")
  shippingCountry       String        @default("IN")
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BILLING ADDRESS (optional, if different from shipping)
  // ═══════════════════════════════════════════════════════════════════════════
  isShippingSameAsBilling Boolean     @default(true)
  billingName           String?
  billingPhone          String?
  billingLine1          String?
  billingLine2          String?
  billingCity           String?
  billingState          String?
  billingPincode        String?
  billingCountry        String?       @default("IN")
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SHIPPING ESTIMATE (what was shown at checkout - for audit/disputes)
  // ═══════════════════════════════════════════════════════════════════════════
  shippingEstimate      Decimal?      @db.Decimal(10, 2)  // Avg estimate shown at checkout
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RELATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  shipments             Shipment[]
  returnRequests        ReturnRequest[]
  
  // ... existing indexes ...
  @@index([orderStatus])
  @@index([shippingPincode])  // For shipping analytics by pincode
}
```

---

### 9. Required Product Model Enhancements

> **Note:** Products need dimensions for accurate shipping rate calculation.

```prisma
model Product {
  // ... existing fields ...
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SHIPPING DIMENSIONS (required for accurate rate calculation)
  // ═══════════════════════════════════════════════════════════════════════════
  weight    Decimal?    @db.Decimal(8, 3)  // in KG
  length    Decimal?    @db.Decimal(8, 2)  // in CM
  breadth   Decimal?    @db.Decimal(8, 2)  // in CM
  height    Decimal?    @db.Decimal(8, 2)  // in CM
  
  // ... rest of existing model ...
}
```

---

### 10. OrderStatus Enum Enhancement

> **Note:** Add missing shipping statuses to existing OrderStatus enum.

```prisma
enum OrderStatus {
  PENDING              // Order created, payment not initiated
  PAYMENT_INITIATED    // User redirected to payment gateway
  PAID                 // Payment successful
  PROCESSING           // Order being packed
  READY_TO_SHIP        // Packed, awaiting pickup/drop ← ADD
  SHIPPED              // Handed to courier
  IN_TRANSIT           // With courier ← ADD
  OUT_FOR_DELIVERY     // Last mile ← ADD
  DELIVERED            // Customer received
  RETURN_REQUESTED     // Return initiated ← ADD
  RETURN_IN_TRANSIT    // Return shipment moving ← ADD
  RETURNED             // Returned to seller ← ADD
  CANCELLED            // Order cancelled
  REFUNDED             // Payment refunded
}
```
