# SUMMARY Part 2: Database Schema & Data Flow

## Purpose
This document covers all database models, their relationships, and how data flows through the system. No code - just structure and concepts.

---

## 📊 Complete Database Schema Overview

### Existing Models (Already in ShopPulse)

**1. Store Model**
```
What it stores: Individual seller's store information
Key fields:
├─ id: Unique identifier
├─ userId: Owner's user ID
├─ name: Store name
├─ description: Store description
└─ Other store metadata

Relationships:
├─ Has many: Orders
├─ Has many: Products
├─ Has many: StoreIntegrations
└─ Has many: Package Presets (NEW)
```

**2. Order Model (NEEDS ENHANCEMENT)**
```
Current fields:
├─ id: Unique identifier
├─ storeId: Which store this order belongs to
├─ orderItems: Products in this order
├─ isPaid: Payment status
├─ orderStatus: PENDING, PAID, SHIPPED, DELIVERED, etc.
├─ name: Customer name
├─ email: Customer email
├─ phone: Customer phone
├─ address: Flat string (⚠️ needs to be enhanced)
├─ shippingCost: Currently hardcoded to 0
└─ Payment fields (Razorpay)

Fields to ADD:
├─ customerName: Rename from 'name'
├─ customerEmail: Rename from 'email'
├─ customerPhone: Rename from 'phone'
├─ addressLine1: Structured address
├─ addressLine2: Optional
├─ city: City name
├─ state: State name
├─ pincode: 6-digit PIN code
├─ country: Default "India"
└─ actualShippingCost: Calculated from Shiprocket

Relationships:
├─ Belongs to: Store
├─ Has many: OrderItems
└─ Has one: Shipment (NEW)
```

**3. OrderItem Model**
```
What it stores: Individual products within an order
Key fields:
├─ orderId: Which order
├─ productId: Which product
├─ size: Selected size
├─ quantity: How many
└─ price: Price at time of purchase

Relationships:
├─ Belongs to: Order
└─ Belongs to: Product
```

**4. Product Model (NEEDS ENHANCEMENT)**
```
Current fields:
├─ id, name, description, price, images
├─ Sizes with quantities
└─ Store relationship

Fields to ADD:
├─ weight: Decimal (MANDATORY) - in KG
├─ length: Decimal (OPTIONAL) - in CM
├─ breadth: Decimal (OPTIONAL) - in CM
└─ height: Decimal (OPTIONAL) - in CM

Validation:
When store.shippingEnabled = true:
└─ weight MUST be provided (required field)
```

**5. StoreIntegration Model (EXISTING)**
```
What it stores: Third-party service credentials
Current integrations:
├─ RAZORPAY (payment gateway)
└─ SMS (optional messaging)

To ADD:
└─ SHIPROCKET (shipping aggregator)

Fields:
├─ storeId: Which store
├─ provider: RAZORPAY, SMS, SHIPROCKET
├─ credentials: JSON encrypted (AES-256-CBC)
├─ status: ACTIVE, INACTIVE, FAILED
└─ lastSyncedAt: Last successful API call
```

---

### New Models to Create

**1. PackagePreset Model**
```
Purpose: Pre-configured box sizes for automatic package selection

Fields:
├─ id: Unique identifier
├─ storeId: Which store owns this preset
├─ name: Display name ("Small", "Medium", "Large", "T-Shirt Box")
├─ length: Box length in CM (decimal)
├─ breadth: Box breadth in CM (decimal)
├─ height: Box height in CM (decimal)
├─ maxWeight: Maximum weight this box can hold in KG (decimal)
├─ maxItems: Maximum number of items (integer)
├─ priority: Selection priority (lower = preferred, 0, 1, 2...)
├─ isDefault: Boolean - fallback box if nothing else fits
├─ createdAt: Timestamp
└─ updatedAt: Timestamp

Relationships:
└─ Belongs to: Store

Indexes:
├─ storeId (for fetching all presets for a store)
└─ storeId + maxItems (for quick capacity checking)

Example Data:
Small: 20×15×10 cm, 0.5kg max, 2 items max, priority 0
Medium: 30×25×15 cm, 2kg max, 5 items max, priority 1
Large: 40×30×20 cm, 5kg max, 10 items max, priority 2

Usage:
When order has 4 items totaling 1.2kg:
1. Sort presets by priority (0, 1, 2)
2. Find first that fits: Small (no), Medium (yes!) → Select Medium
3. If none fit → Flag for manual review
```

**2. PickupAddress Model**
```
Purpose: Warehouse/home addresses where courier picks up packages

Fields:
├─ id: Unique identifier
├─ storeId: Which store
├─ nickname: Display name ("Home Office", "Warehouse", "Delhi Store")
├─ contactName: Person's name for pickup
├─ contactPhone: Phone number
├─ addressLine1: Street address
├─ addressLine2: Optional additional address
├─ landmark: Optional landmark
├─ city: City name
├─ state: State name
├─ pincode: 6-digit PIN code
├─ country: Default "India"
├─ isDefault: Boolean - auto-selected for new shipments
├─ isActive: Boolean - can be disabled without deleting
├─ createdAt: Timestamp
└─ updatedAt: Timestamp

Relationships:
├─ Belongs to: Store
└─ Has many: Shipments (which were picked up from this address)

Indexes:
├─ storeId (for listing all locations)
└─ storeId + isDefault (for quickly finding default)

Example Data:
{
  nickname: "Home Office",
  contactName: "Rahul Sharma",
  contactPhone: "+91 98765 43210",
  addressLine1: "123, Green Park Society",
  city: "Gurugram",
  state: "Haryana",
  pincode: "122001",
  isDefault: true
}

Usage:
When creating shipment:
1. Fetch default pickup address for store
2. Pre-fill in shipment modal
3. Seller can change if multiple locations exist
```

**3. Shipment Model** ⭐ Most Important New Model
```
Purpose: Track shipping/delivery for each order

Fields:

Basic Info:
├─ id: Unique identifier
├─ orderId: Which order this shipment is for
├─ storeId: Which store (for quick filtering)
├─ provider: SHIPROCKET, MANUAL, SELF_DELIVERY

Shiprocket Data (if provider = SHIPROCKET):
├─ shiprocketOrderId: Shiprocket's internal order ID (integer)
├─ channelOrderId: Our order ID sent to Shiprocket (string)
├─ awbCode: Tracking number from courier (string) ⭐ CRITICAL
├─ courierName: Courier company name ("Delhivery", "Blue Dart")
├─ courierId: Shiprocket's courier ID (integer)
├─ courierPhone: Courier contact number
├─ estimatedDeliveryDate: Expected delivery date

Manual Data (if provider = MANUAL):
├─ manualCourierName: User-entered courier name
├─ manualAwbCode: User-entered tracking number
├─ manualTrackingUrl: Optional tracking URL

Package Info:
├─ weight: Actual weight sent to courier in KG (decimal)
├─ length: Package length in CM (decimal)
├─ breadth: Package breadth in CM (decimal)
├─ height: Package height in CM (decimal)
├─ selectedPresetId: Which preset box was used (optional)

Pickup Info:
├─ pickupAddressId: Which address courier picked from
├─ pickupScheduled: Boolean
├─ pickupScheduledAt: Timestamp
├─ pickupCompletedAt: Timestamp

Cost Info:
├─ shippingCharge: Amount charged by courier (decimal)
├─ codAmount: Cash on delivery amount (if COD enabled)
├─ actualWeight: Weight measured by courier (may differ!)
├─ volumetricWeight: Calculated by courier (L×B×H/5000)

Status Tracking:
├─ status: ShipmentStatus enum (see below)
├─ lastStatusUpdate: Timestamp of last status change
├─ deliveredAt: Timestamp when delivered
├─ rtoReason: Reason if RTO (return to origin)

URLs:
├─ labelUrl: Shiprocket PDF label URL
├─ manifestUrl: Shiprocket manifest URL
├─ trackingUrl: Public tracking page URL

Metadata:
├─ shiprocketResponse: JSON - Full API response for debugging
├─ webhookEvents: JSON[] - All webhook events received
├─ notes: Text - Internal notes
├─ createdAt: Timestamp
└─ updatedAt: Timestamp

Relationships:
├─ Belongs to: Order
├─ Belongs to: Store
├─ Belongs to: PickupAddress
├─ Belongs to: PackagePreset (optional)
└─ Has many: ShipmentEvents

Indexes:
├─ orderId (one shipment per order)
├─ storeId + status (filter shipments by store and status)
├─ awbCode (tracking lookup)
└─ status + createdAt (dashboard queries)
```

**4. ShipmentStatus Enum**
```
Status Progression:

CREATED: Shipment record created, not yet sent to Shiprocket
    ↓
PENDING_PICKUP: Sent to Shiprocket, AWB generated, waiting for courier
    ↓
PICKUP_SCHEDULED: Pickup scheduled with courier
    ↓
PICKUP_COMPLETE: Courier collected package
    ↓
IN_TRANSIT: Package moving through courier network
    ↓
OUT_FOR_DELIVERY: Package out for final delivery
    ↓
DELIVERED: Successfully delivered to customer ✅
    OR
RTO: Returned to origin (failed delivery) ❌
    OR
CANCELLED: Shipment cancelled before pickup ⚪

States:
├─ CREATED
├─ PENDING_PICKUP
├─ PICKUP_SCHEDULED
├─ PICKUP_COMPLETE
├─ IN_TRANSIT
├─ OUT_FOR_DELIVERY
├─ DELIVERED
├─ RTO
└─ CANCELLED
```

**5. ShipmentEvent Model**
```
Purpose: Track every status change and event in shipment lifecycle

Fields:
├─ id: Unique identifier
├─ shipmentId: Which shipment
├─ eventType: Type of event (see enum below)
├─ status: ShipmentStatus at time of event
├─ location: Where event occurred ("Mumbai Hub", "Delhi")
├─ remarks: Description from courier
├─ courierRemarks: Remarks from courier system
├─ eventTime: When event occurred (from courier)
├─ receivedAt: When we received this event (webhook timestamp)
├─ source: WEBHOOK, MANUAL, API_POLL
└─ metadata: JSON - Full event payload for debugging

Relationships:
└─ Belongs to: Shipment

Indexes:
├─ shipmentId + eventTime (chronological tracking)
└─ shipmentId + status (filter by status)

Example Events:
{
  eventType: "PICKUP_DONE",
  status: "PICKUP_COMPLETE",
  location: "Gurugram Hub",
  remarks: "Package picked up successfully",
  eventTime: "2026-01-09T14:30:00Z",
  source: "WEBHOOK"
}
```

**6. ShipmentEventType Enum**
```
Event Types:

Pickup Phase:
├─ PICKUP_SCHEDULED: Courier scheduled to pick up
├─ PICKUP_RESCHEDULED: Pickup rescheduled
├─ PICKUP_DONE: Courier collected package
└─ PICKUP_FAILED: Pickup failed (seller not available)

Transit Phase:
├─ IN_TRANSIT: Package moving
├─ RECEIVED_AT_HUB: Arrived at courier hub
├─ DISPATCHED_TO_DESTINATION: Sent to destination city
└─ OUT_FOR_DELIVERY: On vehicle for delivery

Delivery Phase:
├─ DELIVERED: Successfully delivered
├─ DELIVERY_FAILED: Delivery attempt failed
├─ DELIVERY_RESCHEDULED: Delivery rescheduled
└─ CUSTOMER_UNAVAILABLE: Customer not home

RTO Phase:
├─ RTO_INITIATED: Return to origin started
├─ RTO_IN_TRANSIT: Returning to seller
└─ RTO_DELIVERED: Returned to seller

Special Events:
├─ DIMENSION_MISMATCH: Courier found different weight/dimensions
├─ DAMAGED: Package damaged
└─ LOST: Package lost in transit
```

---

## 🔄 Data Flow Diagrams

### Flow 1: Order Creation to Database

```
CUSTOMER FILLS CHECKOUT FORM
├─ Name: "Rahul Sharma"
├─ Email: "rahul@example.com"
├─ Phone: "+91 98765 43210"
├─ Address: "123, Green Park, Andheri West, Mumbai, Maharashtra, 400053"
└─ Payment: Razorpay

    ↓ (User clicks "Pay Now")

RAZORPAY PAYMENT
├─ Create order on Razorpay
├─ User completes payment
├─ Razorpay sends webhook
└─ Payment confirmed

    ↓

CREATE ORDER RECORD
INSERT INTO Order:
├─ id: Generated UUID
├─ storeId: From checkout context
├─ customerName: "Rahul Sharma"
├─ customerEmail: "rahul@example.com"
├─ customerPhone: "+91 98765 43210"
├─ addressLine1: "123, Green Park"
├─ addressLine2: "Andheri West"
├─ city: "Mumbai"
├─ state: "Maharashtra"
├─ pincode: "400053"
├─ country: "India"
├─ isPaid: true
├─ orderStatus: PAID
├─ shippingCost: ₹0 (calculated later)
└─ razorpayPaymentId: "pay_xyz123"

    ↓

CREATE ORDER ITEMS
INSERT INTO OrderItem (for each product):
├─ orderId: Order ID from above
├─ productId: Product being purchased
├─ size: "M"
├─ quantity: 2
└─ price: ₹500 (at time of purchase)

    ↓

DATABASE STATE:
Order: status = PAID, no shipment yet
OrderItems: 2× T-shirt (M) @ ₹500 each

    ↓

SELLER DASHBOARD:
Order appears in "Paid Orders" list
Notification sent: "New order received - ORD-ABC123"
```

### Flow 2: Shipment Creation (Shiprocket)

```
SELLER CLICKS "SHIP ORDER"
    ↓

FETCH DATA FROM DATABASE:
├─ Order details (customer info, address)
├─ Order items (products, quantities)
├─ Product weights (from Product table)
├─ Store's package presets
└─ Store's default pickup address

    ↓

CALCULATE PACKAGE:
Total items: 4 (3× T-shirt + 1× Jeans)
Total weight: 1.0kg (0.2×3 + 0.4×1)

Check presets:
├─ Small: Max 2 items → Skip (order has 4)
├─ Medium: Max 5 items, Max 2kg → ✓ SELECT
└─ Large: Not needed

Selected: Medium box (30×25×15 cm)

    ↓

CALL SHIPROCKET API:
POST /api/v1/external/orders/create/adhoc
Body:
{
  order_id: "ORD-ABC123",
  order_date: "2026-01-09",
  pickup_location: "Home Office",
  billing_customer_name: "Rahul Sharma",
  billing_address: "123, Green Park",
  billing_city: "Mumbai",
  billing_pincode: "400053",
  billing_phone: "9876543210",
  order_items: [
    { name: "T-shirt", sku: "TSH-M", units: 3, price: 500 },
    { name: "Jeans", sku: "JNS-32", units: 1, price: 700 }
  ],
  payment_method: "Prepaid",
  sub_total: 2200,
  length: 30,
  breadth: 25,
  height: 15,
  weight: 1.0
}

    ↓

SHIPROCKET RESPONSE:
{
  order_id: 23456789,  ← Shiprocket's internal ID
  shipment_id: 34567890,
  status: "NEW",
  channel_order_id: "ORD-ABC123",
  awb_code: null  ← Not generated yet
}

    ↓

SAVE TO DATABASE:
INSERT INTO Shipment:
├─ id: Generated UUID
├─ orderId: Link to Order
├─ storeId: Link to Store
├─ provider: SHIPROCKET
├─ shiprocketOrderId: 23456789
├─ channelOrderId: "ORD-ABC123"
├─ status: CREATED
├─ weight: 1.0
├─ length: 30
├─ breadth: 25
├─ height: 15
├─ selectedPresetId: (Medium box ID)
└─ createdAt: Now

    ↓

GET COURIER RATES:
POST /api/v1/external/courier/serviceability
Body:
{
  pickup_postcode: 122001,
  delivery_postcode: 400053,
  weight: 1.0,
  cod: 0
}

Response:
{
  couriers: [
    {
      courier_id: 123,
      courier_name: "Delhivery Surface",
      rate: 52,
      estimated_delivery_days: 4
    },
    {
      courier_id: 456,
      courier_name: "Blue Dart",
      rate: 105,
      estimated_delivery_days: 2
    }
  ]
}

    ↓

AUTO-SELECT COURIER:
Based on settings (Cheapest):
Selected: Delhivery Surface (₹52)

    ↓

ASSIGN COURIER & GENERATE AWB:
POST /api/v1/external/courier/assign/awb
Body:
{
  shipment_id: 34567890,
  courier_id: 123
}

Response:
{
  awb_code: "DLVRY1234567890",
  courier_name: "Delhivery Surface",
  label_url: "https://shiprocket.co/labels/abc123.pdf"
}

    ↓

UPDATE DATABASE:
UPDATE Shipment:
├─ awbCode: "DLVRY1234567890"
├─ courierName: "Delhivery Surface"
├─ courierId: 123
├─ labelUrl: "https://..."
├─ status: PENDING_PICKUP
└─ updatedAt: Now

UPDATE Order:
├─ orderStatus: SHIPPED
├─ actualShippingCost: 52
└─ updatedAt: Now

    ↓

ADD TO PICKUP QUEUE:
REDIS:
SADD pending_pickup:Delhivery "DLVRY1234567890"
HSET shipment:DLVRY1234567890 {
  courierId: 123,
  courierName: "Delhivery Surface",
  orderId: "ORD-ABC123",
  queuedAt: "2026-01-09T10:30:00Z"
}

    ↓

SEND NOTIFICATIONS:
├─ To Customer: "Your order has been shipped! Track: DLVRY1234567890"
└─ To Seller: "Order ORD-ABC123 shipped via Delhivery"

    ↓

UI UPDATES:
├─ Close "Ship Order" modal
├─ Show success message
├─ Update order status badge: SHIPPED
├─ Show tracking info on order page
└─ Enable "Print Label" button
```

### Flow 3: Pickup Scheduling (Unified Pipeline)

```
REDIS QUEUE STATE (Before Cron):
pending_pickup:Delhivery = {DLVRY001, DLVRY002, DLVRY003}
pending_pickup:BlueDart = {BD001, BD002}
pending_pickup:DTDC = {DTDC001}

    ↓

CRON TRIGGERS (2:00 PM)
⏰ node-cron: '0 14 * * *'

    ↓

FETCH ALL PENDING PICKUPS:
REDIS KEYS pending_pickup:*
Result: [
  "pending_pickup:Delhivery",
  "pending_pickup:BlueDart",
  "pending_pickup:DTDC"
]

    ↓

PROCESS EACH COURIER:

FOR pending_pickup:Delhivery:
    ↓
GET MEMBERS:
SMEMBERS pending_pickup:Delhivery
Result: [DLVRY001, DLVRY002, DLVRY003]

    ↓

FETCH SHIPMENT DETAILS:
SELECT * FROM Shipment WHERE awbCode IN (...)
Result:
├─ DLVRY001: Order #123, courierId 123
├─ DLVRY002: Order #456, courierId 123
└─ DLVRY003: Order #789, courierId 123

    ↓

SCHEDULE PICKUP (Single API call):
POST /api/v1/external/courier/generate/pickup
Body:
{
  courier_id: 123,
  awb_numbers: ["DLVRY001", "DLVRY002", "DLVRY003"],
  package_count: 3,
  pickup_time: "Today 2 PM - 5 PM"
}

Response:
{
  pickup_scheduled_date: "2026-01-09",
  pickup_token_number: "PKP123456",
  status: "scheduled"
}

    ↓

UPDATE DATABASE:
UPDATE Shipment
SET 
  status = 'PICKUP_SCHEDULED',
  pickupScheduled = true,
  pickupScheduledAt = NOW()
WHERE awbCode IN ('DLVRY001', 'DLVRY002', 'DLVRY003')

INSERT INTO ShipmentEvent (for each shipment):
├─ shipmentId: (respective IDs)
├─ eventType: PICKUP_SCHEDULED
├─ status: PICKUP_SCHEDULED
├─ remarks: "Pickup scheduled for 2-5 PM"
└─ eventTime: NOW()

    ↓

CLEAR REDIS QUEUE:
DEL pending_pickup:Delhivery
DEL shipment:DLVRY001
DEL shipment:DLVRY002
DEL shipment:DLVRY003

    ↓

REPEAT FOR BlueDart AND DTDC...

    ↓

SEND NOTIFICATIONS:
To Seller:
"Pickup scheduled: 3 shipments via Delhivery (2-5 PM today)"
"Pickup scheduled: 2 shipments via Blue Dart (2-5 PM today)"

    ↓

FINAL STATE:
Redis: All queues cleared
Database: 6 shipments marked as PICKUP_SCHEDULED
Seller: Ready for courier pickup
```

### Flow 4: Webhook Processing

```
SHIPROCKET SENDS WEBHOOK:
POST https://shoppulse.com/api/webhooks/shiprocket
Headers:
├─ Content-Type: application/json
└─ X-Shiprocket-Signature: (for verification)

Body:
{
  event: "PICKUP_DONE",
  awb: "DLVRY1234567890",
  order_id: "23456789",
  courier_name: "Delhivery Surface",
  current_status: "PICKED_UP",
  activities: [
    {
      date: "2026-01-09T14:30:00Z",
      activity: "Shipment picked up",
      location: "Gurugram Hub"
    }
  ]
}

    ↓

VERIFY SIGNATURE:
Calculate HMAC-SHA256 with Shiprocket secret
Compare with X-Shiprocket-Signature header
If mismatch → Reject webhook (security)

    ↓

FIND SHIPMENT:
SELECT * FROM Shipment WHERE awbCode = 'DLVRY1234567890'

    ↓

UPDATE SHIPMENT STATUS:
UPDATE Shipment
SET
  status = 'PICKUP_COMPLETE',
  pickupCompletedAt = '2026-01-09T14:30:00Z',
  lastStatusUpdate = NOW(),
  webhookEvents = ARRAY_APPEND(webhookEvents, webhook_json)
WHERE awbCode = 'DLVRY1234567890'

    ↓

CREATE EVENT RECORD:
INSERT INTO ShipmentEvent:
├─ shipmentId: (from shipment above)
├─ eventType: PICKUP_DONE
├─ status: PICKUP_COMPLETE
├─ location: "Gurugram Hub"
├─ remarks: "Shipment picked up"
├─ eventTime: "2026-01-09T14:30:00Z"
├─ receivedAt: NOW()
├─ source: WEBHOOK
└─ metadata: (full webhook payload)

    ↓

SEND NOTIFICATIONS:
├─ To Customer: "Your package has been picked up and is on its way!"
└─ To Seller: "Order ORD-ABC123 picked up by Delhivery"

    ↓

RETURN 200 OK:
(Shiprocket marks webhook as delivered)
```

---

## 🔗 Database Relationships Summary

```
Store
  ├─ has many → Orders
  ├─ has many → Products
  ├─ has many → PackagePresets
  ├─ has many → PickupAddresses
  ├─ has many → Shipments
  └─ has one → StoreIntegration (SHIPROCKET)

Order
  ├─ belongs to → Store
  ├─ has many → OrderItems
  └─ has one → Shipment

OrderItem
  ├─ belongs to → Order
  └─ belongs to → Product

Product
  ├─ belongs to → Store
  └─ has many → OrderItems

PackagePreset
  └─ belongs to → Store

PickupAddress
  ├─ belongs to → Store
  └─ has many → Shipments

Shipment
  ├─ belongs to → Order
  ├─ belongs to → Store
  ├─ belongs to → PickupAddress
  ├─ belongs to → PackagePreset (optional)
  └─ has many → ShipmentEvents

ShipmentEvent
  └─ belongs to → Shipment

StoreIntegration
  └─ belongs to → Store
```

---

## 📈 Data Queries You'll Run Often

### 1. Get All Pending Pickups for Store
```
Query Purpose: Dashboard showing orders awaiting pickup

Database Query:
SELECT 
  s.id, s.awbCode, s.courierName, s.createdAt,
  o.id as orderId, o.customerName
FROM Shipment s
JOIN Order o ON s.orderId = o.id
WHERE 
  s.storeId = '{storeId}'
  AND s.status = 'PENDING_PICKUP'
ORDER BY s.createdAt DESC

Result:
Shows list of shipments created but not yet picked up
Seller can see which orders need pickup scheduling
```

### 2. Get Shipment with Full Tracking
```
Query Purpose: Order details page showing shipping status

Database Query:
SELECT 
  s.*,
  o.customerName, o.customerPhone,
  pa.nickname as pickupLocation,
  pp.name as packagePreset
FROM Shipment s
JOIN Order o ON s.orderId = o.id
LEFT JOIN PickupAddress pa ON s.pickupAddressId = pa.id
LEFT JOIN PackagePreset pp ON s.selectedPresetId = pp.id
WHERE s.orderId = '{orderId}'

Then fetch events:
SELECT * FROM ShipmentEvent
WHERE shipmentId = s.id
ORDER BY eventTime DESC

Result:
Complete shipment details with timeline of events
Customer can see: "Picked up → In transit → Out for delivery"
```

### 3. Get Orders Ready to Ship
```
Query Purpose: Dashboard for seller to see what needs shipping

Database Query:
SELECT 
  o.id, o.customerName, o.createdAt,
  COUNT(oi.id) as itemCount,
  SUM(oi.quantity * oi.price) as totalAmount
FROM Order o
LEFT JOIN OrderItem oi ON o.id = oi.id
LEFT JOIN Shipment s ON o.id = s.orderId
WHERE 
  o.storeId = '{storeId}'
  AND o.isPaid = true
  AND o.orderStatus = 'PAID'
  AND s.id IS NULL  -- No shipment created yet
GROUP BY o.id
ORDER BY o.createdAt ASC

Result:
List of paid orders without shipments
These are candidates for shipping
```

### 4. Get Package Presets for Auto-Selection
```
Query Purpose: When creating shipment, find appropriate box

Database Query:
SELECT * FROM PackagePreset
WHERE storeId = '{storeId}'
ORDER BY priority ASC

Algorithm:
for each preset:
  if totalItems <= preset.maxItems AND totalWeight <= preset.maxWeight:
    return preset

if no preset fits:
  return { needsManualReview: true }

Result:
Auto-selected box or flag for manual intervention
```

### 5. Get Shipping Statistics
```
Query Purpose: Dashboard analytics

Database Queries:

Total Shipped Today:
SELECT COUNT(*) FROM Shipment
WHERE storeId = '{storeId}'
AND DATE(createdAt) = CURRENT_DATE

Pending Pickups:
SELECT COUNT(*) FROM Shipment
WHERE storeId = '{storeId}'
AND status IN ('PENDING_PICKUP', 'PICKUP_SCHEDULED')

In Transit:
SELECT COUNT(*) FROM Shipment
WHERE storeId = '{storeId}'
AND status = 'IN_TRANSIT'

Delivered This Week:
SELECT COUNT(*) FROM Shipment
WHERE storeId = '{storeId}'
AND status = 'DELIVERED'
AND createdAt >= DATE_TRUNC('week', CURRENT_DATE)

RTO Rate:
SELECT 
  COUNT(CASE WHEN status = 'RTO' THEN 1 END)::FLOAT / COUNT(*) * 100 as rto_percentage
FROM Shipment
WHERE storeId = '{storeId}'
AND createdAt >= CURRENT_DATE - INTERVAL '30 days'

Result:
Dashboard showing shipping health metrics
```

---

## 🎯 Data Validation Rules

### Order Creation
```
Required Fields:
├─ customerName: Min 2 characters
├─ customerEmail: Valid email format
├─ customerPhone: 10 digits (Indian format)
├─ addressLine1: Min 5 characters
├─ city: Min 2 characters
├─ state: From predefined list
├─ pincode: Exactly 6 digits
└─ At least 1 OrderItem

Validation Logic:
if !isValidEmail(email):
  throw "Invalid email format"

if !isPincode(pincode):
  throw "Pincode must be 6 digits"

if orderItems.length === 0:
  throw "Order must have at least one item"
```

### Shipment Creation
```
Required Fields:
├─ orderId: Must exist and be paid
├─ storeId: Must match order's store
├─ provider: SHIPROCKET or MANUAL
├─ weight: Must be > 0
├─ dimensions: All > 0

Validation Logic:
const order = await findOrder(orderId)

if !order:
  throw "Order not found"

if !order.isPaid:
  throw "Cannot ship unpaid order"

if order.shipment:
  throw "Order already shipped"

if weight <= 0:
  throw "Weight must be greater than 0"

if provider === SHIPROCKET:
  if !store.hasShiprocketIntegration:
    throw "Shiprocket not configured"
```

### PackagePreset Creation
```
Required Fields:
├─ name: Unique within store
├─ length, breadth, height: All > 0
├─ maxWeight: > 0
└─ maxItems: > 0

Validation Logic:
if length <= 0 OR breadth <= 0 OR height <= 0:
  throw "Dimensions must be positive"

if maxWeight <= 0:
  throw "Max weight must be positive"

const existingPreset = await findPresetByName(storeId, name)
if existingPreset:
  throw "Preset with this name already exists"
```

---

## 🗂️ Data Migration Considerations

### Existing Orders to New Schema

**Problem:** Existing orders have flat `address` field

**Solution:** Two-phase migration

**Phase 1: Add New Fields (Non-Breaking)**
```
ALTER TABLE Order:
├─ ADD COLUMN addressLine1 TEXT
├─ ADD COLUMN addressLine2 TEXT
├─ ADD COLUMN city TEXT
├─ ADD COLUMN state TEXT
├─ ADD COLUMN pincode TEXT
└─ Keep old 'address' field for now

Migration Script:
For each existing order:
  Parse address string
  Extract: line1, line2, city, state, pincode
  Update new fields
  Keep original in 'address' for reference
```

**Phase 2: Deprecate Old Field**
```
After all orders migrated:
├─ Make new fields NOT NULL
├─ Add index on pincode
└─ Remove old 'address' field (optional, can keep for audit)
```

### Product Weights

**Problem:** Existing products don't have weight field

**Solution:** Gradual rollout with validation

**Phase 1: Add Optional Weight**
```
ALTER TABLE Product:
└─ ADD COLUMN weight DECIMAL(8,3) NULL

UI Changes:
├─ Add weight field to product form (optional initially)
└─ Show warning if weight missing and shipping enabled
```

**Phase 2: Enforce for New Products**
```
Form Validation:
if store.shippingEnabled AND !weight:
  throw "Weight required when shipping is enabled"

Allow existing products to remain without weight
Prompt seller to add weights during product edit
```

---

## 🎓 Key Takeaways

1. **Shipment Model:** Most complex model with 30+ fields tracking complete lifecycle
2. **AWB Code:** The single most important field - customer's tracking reference
3. **Status Progression:** CREATED → PENDING → SCHEDULED → PICKED → TRANSIT → DELIVERED
4. **Relationships:** Order ↔ Shipment (1:1), Order ↔ OrderItems (1:N), Shipment ↔ Events (1:N)
5. **Presets:** Simple table with capacity rules enables auto-selection
6. **Validation:** Always check order is paid before creating shipment
7. **Migration:** Add new fields gradually without breaking existing functionality
8. **Indexes:** Critical on storeId, status, awbCode for dashboard queries
9. **JSON Fields:** Use for flexible data (webhookEvents, shiprocketResponse, metadata)
10. **Enums:** Strict status and event types prevent invalid states

---

## Next Steps

After understanding the database structure, move to **SUMMARY_3** to see how the four shipment flows work end-to-end.
