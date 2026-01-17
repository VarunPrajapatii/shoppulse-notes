# Part 2: ShopPulse API Endpoints

## Implementation Status

> **Last Updated:** 2026-01-11
> 
> ✅ = Implemented | ⏳ = Pending | 🔄 = Needs Review

### Shiprocket Integration
- ✅ `POST /api/[storeId]/shipping/providers/shiprocket/verify` - Verify credentials
- ✅ `POST /api/[storeId]/shipping/providers/shiprocket/refresh-token` - Refresh token
- ✅ `GET /api/[storeId]/shipping/providers/shiprocket/status` - Connection status
- ✅ Token refresh cron job (`/api/cron/refresh-shiprocket-tokens`)

### Pickup Location Management
- ✅ `GET /api/[storeId]/shipping/pickup-locations` - List pickup locations
- ✅ `POST /api/[storeId]/shipping/pickup-locations` - Create pickup location
- ✅ `POST /api/[storeId]/shipping/pickup-locations/sync` - Sync from Shiprocket
- ✅ `PATCH /api/[storeId]/shipping/pickup-locations/[locationId]` - Set default
- ✅ `DELETE /api/[storeId]/shipping/pickup-locations/[locationId]` - Delete location

### Rate & Serviceability
- ✅ `GET /api/[storeId]/shipping/serviceability` - Check deliverability
- ✅ `GET /api/[storeId]/shipping/rates` - Get shipping rates

### Shipment Operations
- ✅ `POST /api/[storeId]/order/[orderId]/create-shipment` - Create shipment
- ✅ `GET /api/[storeId]/shipments` - List shipments
- ✅ `GET /api/[storeId]/shipments/[shipmentId]/track` - Track shipment
- ✅ `GET /api/[storeId]/shipments/[shipmentId]/label` - Download label
- ✅ `POST /api/[storeId]/shipments/[shipmentId]/cancel` - Cancel shipment

### Pending Implementation
- ✅ `GET /api/[storeId]/shipments/[shipmentId]` - Get shipment details
- ✅ `POST /api/[storeId]/shipments/[shipmentId]/assign-courier` - Assign/change courier
- ✅ `POST /api/[storeId]/shipments/[shipmentId]/generate-awb` - Generate AWB
- ✅ `PUT /api/[storeId]/shipments/[shipmentId]/status` - Manual status update
- ✅ `POST /api/[storeId]/shipments/[shipmentId]/mark-dropoff` - Mark for dropoff
- ⏳ `POST /api/[storeId]/shipments/request-pickup` - Batch pickup request
- ⏳ `GET /api/[storeId]/pickups` - List scheduled pickups
- ⏳ `GET /api/[storeId]/shipping/analytics` - Dashboard stats
- ✅ `GET /api/tracking/[awbCode]` - Public tracking page
- ⏳ Shiprocket webhook handler (`/api/webhooks/shiprocket`)
- ⏳ Return/Exchange APIs

---

## All API Routes for Shipping

> **NOTE:** This documentation is updated to reflect the **flexible integrations system** where:
> - SHIPPING allows **multiple providers** (Shiprocket + Delhivery + FedEx simultaneously)
> - PAYMENT/SMS/EMAIL allow **only one provider** at a time
> - Each integration has `isDefault` and `isActive` flags

---

## Integration Management (Universal - All Providers)

### Existing Integrations API

These routes work for ALL integration types (SHIPPING, PAYMENT_GATEWAY, SMS_PROVIDER, etc.):

```
POST /api/[storeId]/integrations
────────────────────────────────
Purpose: Add or update an integration
Body:    { 
           type: "SHIPPING",           // or "PAYMENT_GATEWAY", "SMS_PROVIDER"
           provider: "shiprocket",     // or "delhivery", "razorpay", "msg91"
           credentials: { email, password },
           config: { testMode: false } // optional
         }
Rules:   
  - SHIPPING: Creates new if different provider (multiple allowed)
  - PAYMENT/SMS/EMAIL: Replaces existing (only one allowed)
Returns: { id, type, provider, isDefault, isActive }

GET /api/[storeId]/integrations
───────────────────────────────
Purpose: List all integrations for store
Query:   ?type=SHIPPING (optional filter)
Returns: [
           { id, type, provider, isDefault, isActive, config },
           ...
         ]
Note:    Credentials are NOT returned (encrypted in DB)

PATCH /api/[storeId]/integrations/[integrationId]
─────────────────────────────────────────────────
Purpose: Update integration settings
Body:    { 
           action: "set-default" | "toggle-active" | "update-config",
           config: { ... }  // only for update-config
         }
Returns: { success }

DELETE /api/[storeId]/integrations/[integrationId]
──────────────────────────────────────────────────
Purpose: Remove integration
Returns: { success }
```

---

## Flow 1: Shiprocket Integration Routes

### Authentication & Token Management

Since credentials are stored via the integrations system, these routes handle **token management**:

```
POST /api/[storeId]/shipping/providers/shiprocket/verify
────────────────────────────────────────────────────────
Purpose: Verify Shiprocket credentials work (call after saving integration)
Action:  Uses saved credentials to login and get token
Returns: { success, tokenExpiresAt, pickupLocations[] }

┌─ Shiprocket APIs Used ─────────────────────────────────┐
│ 1. POST /auth/login                                    │
│    Body: { email, password }                           │
│    Returns: { token, company_id }                      │
│                                                        │
│ 2. GET /settings/company/pickup                        │
│    Headers: Authorization: Bearer <token>              │
│    Returns: { data: { shipping_address: [...] } }      │
└────────────────────────────────────────────────────────┘

POST /api/[storeId]/shipping/providers/shiprocket/refresh-token
──────────────────────────────────────────────────────────────
Purpose: Refresh expired Shiprocket JWT token
Action:  Uses saved credentials to get new token
Returns: { success, tokenExpiresAt }

┌─ Shiprocket API Used ──────────────────────────────────┐
│ POST /auth/login                                       │
│ Body: { email, password }                              │
│ Returns: { token } (JWT valid for 10 days)             │
└────────────────────────────────────────────────────────┘

GET /api/[storeId]/shipping/providers/shiprocket/status
──────────────────────────────────────────────────────
Purpose: Check if Shiprocket is connected & token valid
Returns: { connected, tokenValid, tokenExpiresAt, lastUsed }
```

### Pickup Location Management

```
GET /api/[storeId]/shipping/pickup-locations
────────────────────────────────────────────
Purpose: Get all pickup locations (from local DB)
Returns: { locations: [{ id, name, address, city, pincode, phone, isDefault, isActive, providerMetadata }] }
Note:    Returns cached data from Address model (type=PICKUP)

POST /api/[storeId]/shipping/pickup-locations
─────────────────────────────────────────────
Purpose: Add new pickup location
Body:    { name, phone, email, line1, line2, city, state, pincode, country }
Flow:    
  1. Calls Shiprocket API to create location
  2. On success, saves to local Address model
  3. Stores provider metadata (pickupId, status) in JSON field
Returns: { success, location: {...}, message }

┌─ Shiprocket API Used ──────────────────────────────────┐
│ POST /settings/company/addpickup                       │
│ Body: { pickup_location (name), name (contact),        │
│         email, phone, address, address_2, city,        │
│         state, country, pin_code }                     │
│ Returns: { success, pickup_id, address: {...} }        │
│ Note: status=1 (pending), status=2 (verified)          │
└────────────────────────────────────────────────────────┘

POST /api/[storeId]/shipping/pickup-locations/sync
──────────────────────────────────────────────────
Purpose: Sync pickup locations from Shiprocket to local DB
Triggers: Manual button, weekly cron, or after API error
Flow:    
  1. GET /settings/company/pickup from Shiprocket
  2. Compare with local Address model (type=PICKUP)
  3. Add new locations (isActive=true)
  4. permanent delete removed locations from database
  5. Update changed locations
  6. If default was deleted, set first active as default
Returns: { added: 2, updated: 1, deleted: 0 }

┌─ Shiprocket API Used ──────────────────────────────────┐
│ GET /settings/company/pickup                           │
│ Headers: Authorization: Bearer <token>                 │
│ Returns: { data: { shipping_address: [                 │
│   { id, pickup_location, address, city, pin_code,      │
│     phone, status, phone_verified, ... }               │
│ ]}}                                                    │
└────────────────────────────────────────────────────────┘

PATCH /api/[storeId]/shipping/pickup-locations/[locationId]
───────────────────────────────────────────────────────────
Purpose: Set default pickup location
Body:    { action: "set-default" }
Returns: { success }
Note:    Only one location can be default per store
```

### How Integration + Token Flow Works:

```
STEP 1: Seller adds Shiprocket via integrations API
        POST /api/[storeId]/integrations
        { type: "SHIPPING", provider: "shiprocket", credentials: {...} }
        → Credentials encrypted & stored

STEP 2: Call verify endpoint to get initial token
        POST /api/[storeId]/shipping/providers/shiprocket/verify
        → Decrypts credentials, calls Shiprocket login
        → Stores token in credentials: { email, password, token, tokenExpiry }

STEP 3: When making Shiprocket API calls
        → getShiprocketToken(storeId) checks tokenExpiry
        → If expired, auto-refreshes using stored credentials
```

### Rate & Serviceability

```
GET /api/[storeId]/shipping/serviceability
──────────────────────────────────────────
Purpose: Check if pincode is deliverable
Query:   ?pickup=110001&delivery=400001&weight=0.5&cod=false&provider=shiprocket
Returns: { serviceable, couriers[], estimatedDays }
Note:    provider param uses default SHIPPING integration if omitted

┌─ Shiprocket API Used ──────────────────────────────────┐
│ GET /courier/serviceability                            │
│ Query: ?pickup_postcode=110001&delivery_postcode=400001│
│        &weight=0.5&cod=0                               │
│ Returns: { data: { available_courier_companies: [...] }│
│           status: 200 }                                │
└────────────────────────────────────────────────────────┘

GET /api/[storeId]/shipping/rates
─────────────────────────────────
Purpose: Get shipping rates from all couriers
Query:   ?pickup=110001&delivery=400001&weight=0.5&cod=false
         &length=20&breadth=15&height=10&value=1000&provider=shiprocket
Returns: { rates: [{ courier, code, price, estimatedDays }] }
Note:    Can query multiple providers for comparison

┌─ Shiprocket API Used ──────────────────────────────────┐
│ GET /courier/serviceability                            │
│ Query: ?pickup_postcode=110001&delivery_postcode=400001│
│        &weight=0.5&cod=0&declared_value=1000           │
│ Returns: { data: { available_courier_companies: [      │
│   { courier_company_id, courier_name, rate,            │
│     estimated_delivery_days, ... }                     │
│ ]}}                                                    │
└────────────────────────────────────────────────────────┘
```

### Order & Shipment Operations (Provider-Agnostic)

```
POST /api/[storeId]/orders/[orderId]/create-shipment
────────────────────────────────────────────────────
Purpose: Create shipment using ANY shipping provider
Body:    { 
           provider: "SHIPROCKET" | "DELHIVERY" | "MANUAL",
           courierId: 123,              // Optional for aggregators
           weight, length, breadth, height,
           pickupAddressId,
           handoverMethod: "PICKUP" | "DROPOFF"  // Seller's choice
         }
Returns: { 
           shipmentId,                  // ShopPulse shipment ID
           providerOrderId,             // Provider's order reference
           providerShipmentId,          // Provider's shipment reference
           awbCode, courierName, labelUrl 
         }
Flow:    
  1. Gets credentials: integrationService.getCredentials(storeId, "SHIPPING", provider)
  2. Creates order in provider system
  3. Generates AWB if auto-assign enabled
  4. Creates Shipment record in our DB

┌─ Shiprocket APIs Used (when provider=SHIPROCKET) ──────┐
│                                                        │
│ OPTION A: Wrapper API (Recommended - All in One)       │
│ ─────────────────────────────────────────────────────  │
│ POST /shipments/create/forward-shipment                │
│ Body: { order_id, order_date, pickup_location,         │
│        channel_id, billing/shipping_*, order_items,    │
│        payment_method, sub_total, length, breadth,     │
│        height, weight, courier_id (optional) }         │
│ Returns: { shipment_id, order_id, awb_code,            │
│           courier_name, label_url }                    │
│ Note: Creates order + assigns AWB + schedules pickup   │
│                                                        │
│ OPTION B: Step-by-Step APIs                            │
│ ─────────────────────────────────────────────────────  │
│ 1. POST /orders/create/adhoc                           │
│    Body: { order_id, order_date, pickup_location,      │
│           channel_id, billing/shipping_*, order_items, │
│           payment_method, sub_total, length, breadth,  │
│           height, weight }                             │
│    Returns: { order_id, shipment_id, status }          │
│                                                        │
│ 2. POST /courier/assign/awb                            │
│    Body: { shipment_id, courier_id }                   │
│    Returns: { awb_code, courier_name,                  │
│              applied_weight, cod_charges }             │
│                                                        │
│ Note: Use OPTION A unless you need courier selection   │
│       UI between order creation and AWB assignment     │
└────────────────────────────────────────────────────────┘

POST /api/[storeId]/shipments/[shipmentId]/assign-courier
─────────────────────────────────────────────────────────
Purpose: Manually assign/change courier (before pickup)
Body:    { courierId }
Returns: { awbCode, courierName }

┌─ Shiprocket API Used ──────────────────────────────────┐
│ POST /courier/assign/awb                               │
│ Body: { shipment_id: <shiprocket_shipment_id>,         │
│         courier_id: 123 }                              │
│ Returns: { response: { data: {                         │
│   awb_code, courier_company_id, courier_name,          │
│   assigned_date_time, applied_weight, routing_code,    │
│   cod_charges, freight_charges }}}                     │
└────────────────────────────────────────────────────────┘

POST /api/[storeId]/shipments/[shipmentId]/generate-awb
───────────────────────────────────────────────────────
Purpose: Generate AWB (if not done during create)
Returns: { awbCode, trackingUrl }

┌─ Shiprocket API Used ──────────────────────────────────┐
│ POST /courier/assign/awb                               │
│ Body: { shipment_id: <shiprocket_shipment_id>,         │
│         courier_id: <selected_courier_id> }            │
│ Returns: { response: { data: { awb_code,               │
│   courier_name, applied_weight }}}                     │
│ Note: Same API as assign-courier - AWB generated       │
│       during courier assignment                        │
└────────────────────────────────────────────────────────┘

GET /api/[storeId]/shipments/[shipmentId]/label
───────────────────────────────────────────────
Purpose: Download shipping label PDF
Returns: PDF file / { labelUrl }

┌─ Shiprocket API Used ──────────────────────────────────┐
│ POST /courier/generate/label                           │
│ Body: { shipment_id: [<shiprocket_shipment_id>] }      │
│       (Array - can generate multiple labels at once)   │
│ Returns: { label_url: "https://...pdf",                │
│           not_created: [] }                            │
│ Note: Returns S3 URL valid for limited time            │
└────────────────────────────────────────────────────────┘

POST /api/[storeId]/shipments/[shipmentId]/cancel
─────────────────────────────────────────────────
Purpose: Cancel shipment (before pickup)
Returns: { success, reason }

┌─ Shiprocket API Used ──────────────────────────────────┐
│ POST /orders/cancel/shipment/awbs                      │
│ Body: { awbs: ["<awb_code>"] }                         │
│       (Array - can cancel multiple at once)            │
│ Returns: { message: "success",                         │
│           data: [{ awb, status }] }                    │
│ Note: Only cancellable before pickup. After pickup,    │
│       need to initiate RTO via different process       │
└────────────────────────────────────────────────────────┘
```

### Pickup & Dropoff Scheduling

```
POST /api/[storeId]/shipments/request-pickup
────────────────────────────────────────────
Purpose: Request pickup for multiple shipments (goes to batch queue)
Body:    { 
           shipmentIds: ["ship_1", "ship_2"],
           pickupAddressId: "addr_123"
         }
Returns: { 
           batchTime: "2026-01-07T12:00:00Z",  // Next 2-hour slot
           message: "Pickup will be scheduled at 12:00 PM"
         }
Note:    Shipments batched by storeId + pickupAddress + courier + batchTime

┌─ Shiprocket API Used ──────────────────────────────────┐
│ POST /courier/generate/pickup                          │
│ Body: { shipment_id: [<shiprocket_shipment_ids>],      │
│         pickup_date: "2026-01-07",                     │
│         pickup_time: "12:00:00" - "18:00:00",          │
│         expected_package_count: 5 }                    │
│ Returns: { response: { pickup_scheduled_date,          │
│           pickup_token_number,                         │
│           pickup_generated_date }}                     │
│                                                        │
│ Batching Logic in ShopPulse:                           │
│ - Group shipments by pickup_location + courier         │
│ - Schedule in 2-hour slots to optimize pickups         │
│ - Generate manifest before pickup                      │
│                                                        │
│ Also calls: POST /manifests/generate                   │
│ Body: { shipment_id: [<ids>] }                         │
│ Returns: { manifest_url }                              │
└────────────────────────────────────────────────────────┘

POST /api/[storeId]/shipments/[shipmentId]/mark-dropoff
───────────────────────────────────────────────────────
Purpose: Mark shipment for seller dropoff (no pickup needed)
Returns: { 
           success,
           nearestHubs: [{ name, address, distance }],
           message: "Take package to nearest hub"
         }

GET /api/[storeId]/pickups
──────────────────────────
Purpose: List scheduled pickups
Query:   ?status=pending&date=2026-01-07
Returns: { pickups: [{ date, address, shipments[], status, pickupToken }] }
```

### Tracking

```
GET /api/[storeId]/shipments/[shipmentId]/track
───────────────────────────────────────────────
Purpose: Get current shipment status & events
Returns: { 
           status, currentLocation, estimatedDelivery,
           provider,              // Which shipping provider
           events: [{ status, description, location, time }]
         }

┌─ Shiprocket API Used ──────────────────────────────────┐
│ GET /courier/track/awb/{awb_code}                      │
│ Headers: Authorization: Bearer <token>                 │
│ Returns: { tracking_data: {                            │
│   track_status: 1,                                     │
│   shipment_status: 7,                                  │
│   shipment_track: [{                                   │
│     date, activity, location,                          │
│     sr-status-label, sr-status }],                     │
│   shipment_track_activities: [{                        │
│     date, status, activity, location }],               │
│   track_url }}                                         │
│                                                        │
│ Status Codes: 1=Pickup Pending, 6=In Transit,          │
│ 7=Delivered, 8=RTO, etc.                               │
└────────────────────────────────────────────────────────┘

GET /api/tracking/[awbCode]
───────────────────────────
Purpose: Public tracking page (no auth required)
Query:   ?storeId=xxx (optional for verification)
Returns: { orderNumber, status, events[], courierName }

┌─ Shiprocket API Used ──────────────────────────────────┐
│ GET /courier/track/awb/{awb_code}                      │
│ Note: We cache tracking data & update via webhooks     │
│       Real-time API call only if cache stale (>15 min) │
└────────────────────────────────────────────────────────┘
```

### Webhooks (Receive from Providers)

```
POST /api/webhooks/shiprocket
─────────────────────────────
Purpose: Receive Shiprocket status updates
Headers: X-Shiprocket-Signature (if configured)
Body:    { awb, current_status, scan_datetime, ... }
Action:  Update shipment status, send notifications

┌─ Shiprocket Webhook Payload Structure ─────────────────┐
│ {                                                      │
│   "order_id": "SR12345",                               │
│   "awb": "788830567028",                               │
│   "courier_name": "Delhivery",                         │
│   "current_status": "DELIVERED",                       │
│   "current_status_id": 7,                              │
│   "shipment_status": "DELIVERED",                      │
│   "shipment_status_id": 7,                             │
│   "scans": [{                                          │
│     "location": "Mumbai Hub",                          │
│     "date": "2026-01-07 14:30:00",                     │
│     "activity": "Delivered",                           │
│     "status": "DL" }],                                 │
│   "etd": "2026-01-07",                                 │
│   "delivered_date": "2026-01-07"                       │
│ }                                                      │
│                                                        │
│ Status IDs: 1=Pickup Pending, 2=Picked Up,             │
│ 3=In Transit, 4=Out for Delivery, 5=Delivered,         │
│ 6=Undelivered, 7=RTO Initiated, 8=RTO Delivered        │
└────────────────────────────────────────────────────────┘

POST /api/webhooks/delhivery
────────────────────────────
Purpose: Receive Delhivery status updates (future)
Headers: X-Delhivery-Key
Body:    { waybill, status, ... }
Action:  Same as above - provider-agnostic handler
```

---

## Flow 2: Manual Shipping Routes

### Create Manual Shipment

```
POST /api/[storeId]/orders/[orderId]/create-shipment
────────────────────────────────────────────────────
Purpose: Create manual shipment (Speed Post, self-delivery)
Body:    { 
           provider: "MANUAL",            // Triggers manual flow
           courierCode: "speedpost",      // or "self_delivery", "local_courier"
           courierName: "India Post",
           awbCode: "EE123456789IN",      // Manual entry
           trackingUrl: "https://...",    // Optional
           weight, length, breadth, height,
           estimatedDeliveryDate: "2026-01-10"
         }
Returns: { shipmentId, status: "PENDING" }
Note:    Same endpoint as Shiprocket - provider determines flow
```

### Update Manual Shipment

```
PUT /api/[storeId]/shipments/[shipmentId]/status
────────────────────────────────────────────────
Purpose: Manually update shipment status
Body:    { 
           status: "IN_TRANSIT",          // or "DELIVERED", "RTO_INITIATED"
           location: "Delhi Hub",
           description: "Package in transit",
           eventTime: "2026-01-07T10:00:00Z"
         }
Returns: { success, currentStatus }

PUT /api/[storeId]/shipments/[shipmentId]/delivered
───────────────────────────────────────────────────
Purpose: Mark as delivered with POD
Body:    { 
           deliveredAt: "2026-01-08T14:00:00Z",
           podImage: "base64_or_url",     // Optional
           receivedBy: "Rahul"            // Optional
         }
Returns: { success, orderStatus }
```

### Manual Shipment AWB Update

```
PUT /api/[storeId]/shipments/[shipmentId]/awb
─────────────────────────────────────────────
Purpose: Add/update AWB for manual shipment
Body:    { 
           awbCode: "EE123456789IN",
           trackingUrl: "https://..."
         }
Returns: { success }
```

---

## Common Routes (All Providers)

### Shipment Listing

```
GET /api/[storeId]/shipments
────────────────────────────
Purpose: List all shipments
Query:   ?status=IN_TRANSIT&provider=SHIPROCKET&page=1&limit=20
         &from=2026-01-01&to=2026-01-31
Returns: { 
           shipments: [...], 
           pagination: { total, page, pages } 
         }

GET /api/[storeId]/shipments/[shipmentId]
─────────────────────────────────────────
Purpose: Get shipment details
Returns: { 
           shipment: { 
             id, orderId, provider, providerOrderId, providerShipmentId,
             awbCode, courierName, status, handoverMethod, ...
           }, 
           order, 
           events[] 
         }
```

### Analytics

```
GET /api/[storeId]/shipping/analytics
─────────────────────────────────────
Purpose: Shipping analytics dashboard
Query:   ?from=2026-01-01&to=2026-01-31&provider=all
Returns: {
           totalShipments,
           delivered, inTransit, rto,
           avgDeliveryDays,
           providerBreakdown: [{ provider, count, avgDays }],
           courierBreakdown: [...],
           rtoRate, deliverySuccessRate
         }
```

### Returns

```
POST /api/[storeId]/orders/[orderId]/return-request
───────────────────────────────────────────────────
Purpose: Create return request
Body:    {
           items: [{ orderItemId, quantity }],
           reason: "WRONG_SIZE",
           reasonDetail: "Ordered M, need L"
         }
Returns: { returnNumber, status }

PUT /api/[storeId]/returns/[returnId]/approve
─────────────────────────────────────────────
Purpose: Approve return request
Body:    { 
           schedulePickup: true,
           returnProvider: "SHIPROCKET"  // Which provider for return shipment
         }
Returns: { status, pickupShipmentId }

┌─ Shiprocket API Used (when schedulePickup=true) ───────┐
│ POST /orders/create/return                             │
│ Body: {                                                │
│   order_id: "<original_order_id>",                     │
│   order_date: "2026-01-05",                            │
│   channel_id: <your_channel_id>,                       │
│   pickup_customer_name, pickup_address, pickup_city,   │
│   pickup_state, pickup_country, pickup_pincode,        │
│   pickup_email, pickup_phone,                          │
│   shipping_customer_name (warehouse), shipping_address,│
│   shipping_city, shipping_state, shipping_pincode,     │
│   shipping_country, shipping_email, shipping_phone,    │
│   order_items: [{ name, sku, units, selling_price }],  │
│   payment_method: "PREPAID",                           │
│   sub_total, length, breadth, height, weight           │
│ }                                                      │
│ Returns: { order_id, shipment_id, awb_code }           │
│                                                        │
│ Note: Pickup/Shipping addresses are SWAPPED for return │
│ - pickup = customer's address (where to collect)       │
│ - shipping = warehouse (where to deliver)              │
└────────────────────────────────────────────────────────┘

PUT /api/[storeId]/returns/[returnId]/reject
────────────────────────────────────────────
Purpose: Reject return request
Body:    { reason: "Outside return window" }
Returns: { status }

PUT /api/[storeId]/returns/[returnId]/complete
──────────────────────────────────────────────
Purpose: Complete return & initiate refund
Body:    { 
           inspectionStatus: "PASS",
           refundAmount: 999,
           refundMethod: "original"  // or "store_credit"
         }
Returns: { refundId, refundStatus }

GET /api/[storeId]/returns
──────────────────────────
Purpose: List return requests
Query:   ?status=REQUESTED&page=1
Returns: { returns: [...], pagination }
```

---

## Provider Configuration Summary

### Adding a New Shipping Provider:

```
1. POST /api/[storeId]/integrations
   { type: "SHIPPING", provider: "delhivery", credentials: {...} }
   → Creates new integration (SHIPPING allows multiple)

2. Provider appears in shipping options

3. When creating shipment:
   POST /api/[storeId]/orders/[orderId]/create-shipment
   { provider: "DELHIVERY", ... }
```

### Setting Default Shipping Provider:

```
PATCH /api/[storeId]/integrations/[integrationId]
{ action: "set-default" }

→ All other SHIPPING integrations lose default status
→ This provider used when no provider specified in API calls
```

---

## How Credentials Flow Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SELLER ADDS SHIPROCKET INTEGRATION                                          │
│                                                                             │
│ POST /api/[storeId]/integrations                                           │
│ { type: "SHIPPING", provider: "shiprocket", credentials: {email, pass} }   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ integrationService.saveIntegration()                                        │
│                                                                             │
│ 1. Check: SHIPPING allows multiple? → YES                                  │
│ 2. Encrypt credentials with AES-256-CBC                                    │
│ 3. Store in StoreIntegration table                                         │
│ 4. If first SHIPPING integration → isDefault = true                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHEN CREATING SHIPMENT                                                      │
│                                                                             │
│ POST /api/[storeId]/orders/[orderId]/create-shipment                       │
│ { provider: "SHIPROCKET", ... }                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Backend Flow:                                                               │
│                                                                             │
│ 1. integrationService.getCredentials(storeId, "SHIPPING", "shiprocket")    │
│    → Decrypts and returns: { email, password, token?, tokenExpiry? }       │
│                                                                             │
│ 2. If token expired: shiprocketService.refreshToken(credentials)           │
│    → Gets new JWT from Shiprocket                                          │
│                                                                             │
│ 3. shiprocketService.createOrder(token, orderData)                         │
│    → Creates order in Shiprocket                                           │
│                                                                             │
│ 4. shiprocketService.assignCourier(token, shipmentId, courierId)           │
│    → Gets AWB                                                              │
│                                                                             │
│ 5. prisma.shipment.create({ provider: "SHIPROCKET", awbCode, ... })        │
│    → Stores in our DB                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Shiprocket API Endpoints Used

| ShopPulse Action | Shiprocket Endpoint |
|------------------|---------------------|
| Login | `POST /auth/login` |
| Get rates | `GET /courier/serviceability` |
| Create order | `POST /orders/create/adhoc` |
| Create order + ship (Wrapper) | `POST /shipments/create/forward-shipment` |
| Assign courier | `POST /courier/assign/awb` |
| Generate AWB | `POST /courier/assign/awb` (same) |
| Get label | `POST /courier/generate/label` |
| Schedule pickup | `POST /courier/generate/pickup` |
| Generate manifest | `POST /manifests/generate` |
| Track shipment | `GET /courier/track/awb/{awb}` |
| Cancel shipment | `POST /orders/cancel/shipment/awbs` (body: {awbs: [...]}) |
| Get pickup locations | `GET /settings/company/pickup` |

## Future: Delhivery API Endpoints (Direct Integration)

| ShopPulse Action | Delhivery Endpoint |
|------------------|-------------------|
| Create order | `POST /api/cmu/create.json` |
| Track | `GET /api/v1/packages/json/?waybill={awb}` |
| Cancel | `POST /api/p/edit` |

---

## API Response Patterns

```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: {
    code: "SHIPMENT_NOT_FOUND",
    message: "Shipment not found",
    details?: { ... }
  }
}

// Paginated
{
  success: true,
  data: [...],
  pagination: {
    total: 100,
    page: 1,
    limit: 20,
    pages: 5
  }
}
```

---

## Route Structure Summary

```
/api/[storeId]/
├── integrations/                    # Universal integration management
│   ├── POST                         # Add/update integration
│   ├── GET                          # List integrations
│   └── [integrationId]/
│       ├── PATCH                    # Set default, toggle active
│       └── DELETE                   # Remove integration
│
├── shipping/
│   ├── serviceability GET           # Check deliverability
│   ├── rates GET                    # Get shipping rates
│   ├── analytics GET                # Dashboard stats
│   └── providers/
│       └── shiprocket/
│           ├── verify POST          # Verify credentials
│           ├── refresh-token POST   # Refresh JWT
│           └── status GET           # Connection status
│
├── orders/[orderId]/
│   └── create-shipment POST         # Create shipment (any provider)
│
├── shipments/
│   ├── GET                          # List shipments
│   ├── request-pickup POST          # Batch pickup request
│   └── [shipmentId]/
│       ├── GET                      # Get details
│       ├── track GET                # Get tracking
│       ├── label GET                # Download label
│       ├── status PUT               # Manual status update
│       ├── assign-courier POST      # Change courier
│       ├── cancel POST              # Cancel
│       └── mark-dropoff POST        # Mark for dropoff
│
├── pickups/
│   └── GET                          # List scheduled pickups
│
└── returns/
    ├── GET                          # List returns
    └── [returnId]/
        ├── approve PUT              # Approve return
        ├── reject PUT               # Reject return
        └── complete PUT             # Complete & refund
```

---

*Next: Part 3 - Library Functions & Services*
