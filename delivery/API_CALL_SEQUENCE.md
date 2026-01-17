# Complete API Call Sequence: Order Received → Out for Delivery

## Scenario: One-Click Ship Flow (Manual)

### Phase 1: Order Appears on Dashboard

**Trigger:** Payment success webhook from Razorpay

```
1. Razorpay → Your Server
   POST https://yourapp.com/api/webhooks/razorpay
   Body: {
     event: "payment.captured",
     payload: {
       payment_entity: { order_id, amount, status }
     }
   }
   Response: 200 OK

2. Your Server → Database
   prisma.order.update({
     where: { razorpayOrderId },
     data: { isPaid: true, status: 'PAID' }
   })

3. Your Server → Customer
   (Optional) Send SMS/Email confirmation
   POST https://sms-provider.com/api/send
   Body: { phone, message: "Order confirmed" }
```

**Result:** Order now visible in seller dashboard under "Paid Orders"

---

### Phase 2: Seller Clicks "Ship Order" Button

**Trigger:** Seller clicks ship button on order detail page

```
1. Browser → Your Server
   POST /api/shipments/create
   Body: {
     orderId: "order_123",
     provider: "SHIPROCKET"
   }
   
   This triggers the shipment creation flow...
```

---

### Phase 3: Shipment Creation Process

#### Step 3.1: Fetch Order Details

```
1. Your Server → Database
   prisma.order.findUnique({
     where: { id: orderId },
     include: {
       orderItems: {
         include: { product: true }
       },
       store: {
         include: {
           packagePresets: true,
           pickupAddresses: true,
           storeIntegration: true
         }
       }
     }
   })
```

#### Step 3.2: Calculate Box Size

```
2. Your Server (Internal Logic)
   calculateBoxSelection(orderItems, packagePresets)
   
   - Sum total items: 4
   - Sum total weight: orderItems.reduce((sum, item) => 
       sum + (item.product.weight * item.quantity), 0
     ) = 1.2kg
   - Find smallest fitting preset
   - Return: { preset: "Medium", dimensions: "30x25x15" }
```

#### Step 3.3: Get Shiprocket Token

```
3. Your Server → Shiprocket
   POST https://apiv2.shiprocket.in/v1/external/auth/login
   Body: {
     email: store.storeIntegration.email (decrypted),
     password: store.storeIntegration.password (decrypted)
   }
   Response: {
     token: "Bearer eyJhbGc..."
   }
   
   Store token in memory for subsequent calls
```

#### Step 3.4: Create Order in Shiprocket

```
4. Your Server → Shiprocket
   POST https://apiv2.shiprocket.in/v1/external/orders/create/adhoc
   Headers: {
     Authorization: "Bearer eyJhbGc..."
   }
   Body: {
     order_id: "SP_order_123",
     order_date: "2026-01-09 14:30:00",
     billing_customer_name: order.customerName,
     billing_address: order.address,
     billing_city: order.city,
     billing_pincode: order.pincode,
     billing_phone: order.phone,
     billing_email: order.email,
     shipping_is_billing: true,
     order_items: [{
       name: "Product Name",
       sku: "SKU123",
       units: 2,
       selling_price: 500,
       discount: 0
     }],
     payment_method: "Prepaid",
     sub_total: 1000,
     length: 30,
     breadth: 25,
     height: 15,
     weight: 1.2
   }
   Response: {
     order_id: 234567890,
     shipment_id: 345678901,
     status: "NEW",
     status_code: 1
   }
```

#### Step 3.5: Check Courier Serviceability

```
5. Your Server → Shiprocket
   GET https://apiv2.shiprocket.in/v1/external/courier/serviceability/
   Headers: {
     Authorization: "Bearer eyJhbGc..."
   }
   Params: {
     pickup_postcode: 400001,
     delivery_postcode: 110001,
     cod: 0,
     weight: 1.2,
     length: 30,
     breadth: 25,
     height: 15
   }
   Response: {
     data: {
       available_courier_companies: [
         {
           courier_company_id: 25,
           courier_name: "Delhivery Surface",
           rate: 46.50,
           etd: "3-4 days",
           estimated_delivery_days: "2026-01-12"
         },
         {
           courier_company_id: 12,
           courier_name: "Blue Dart",
           rate: 68.00,
           etd: "1-2 days",
           estimated_delivery_days: "2026-01-10"
         }
       ]
     }
   }
```

#### Step 3.6: Select Courier (Auto or Manual)

```
6. Your Server (Internal Logic)
   
   If auto-selection enabled:
   - Select cheapest: Delhivery (₹46.50)
   - OR Select fastest: Blue Dart (1-2 days)
   
   If manual selection:
   - Return courier list to frontend
   - Wait for seller to choose
```

#### Step 3.7: Generate AWB Code

```
7. Your Server → Shiprocket
   POST https://apiv2.shiprocket.in/v1/external/courier/assign/awb
   Headers: {
     Authorization: "Bearer eyJhbGc..."
   }
   Body: {
     shipment_id: 345678901,
     courier_id: 25
   }
   Response: {
     awb_assign_status: 1,
     response: {
       data: {
         awb_code: "DLVRY1234567890",
         courier_company_id: 25,
         courier_name: "Delhivery Surface"
       }
     }
   }
```

#### Step 3.8: Get Shipping Label

```
8. Your Server → Shiprocket
   POST https://apiv2.shiprocket.in/v1/external/courier/generate/label
   Headers: {
     Authorization: "Bearer eyJhbGc..."
   }
   Body: {
     shipment_id: [345678901]
   }
   Response: {
     label_url: "https://shiprocket-media.s3.ap-south-1.amazonaws.com/labels/label_345678901.pdf"
   }
```

#### Step 3.9: Save Shipment to Database

```
9. Your Server → Database
   prisma.shipment.create({
     data: {
       orderId: "order_123",
       storeId: "store_456",
       awbCode: "DLVRY1234567890",
       courierId: 25,
       courierName: "Delhivery Surface",
       shiprocketOrderId: 234567890,
       shiprocketShipmentId: 345678901,
       provider: "SHIPROCKET",
       status: "PENDING_PICKUP",
       weight: 1.2,
       length: 30,
       breadth: 25,
       height: 15,
       labelUrl: "https://shiprocket-media.s3.../label.pdf"
     }
   })

10. Your Server → Database
    prisma.order.update({
      where: { id: orderId },
      data: { 
        status: "SHIPPED",
        shippedAt: new Date()
      }
    })
```

#### Step 3.10: Add to Pickup Queue

```
11. Your Server → Redis
    redis.sadd("pending_pickup:Delhivery", "DLVRY1234567890")
    
    redis.hset("shipment:DLVRY1234567890", {
      courierId: 25,
      courierName: "Delhivery Surface",
      orderId: "order_123",
      queuedAt: new Date().toISOString()
    })
```

#### Step 3.11: Notify Customer

```
12. Your Server → Customer
    POST https://sms-provider.com/api/send
    Body: {
      phone: "+919876543210",
      message: "Your order has been shipped! Track: DLVRY1234567890"
    }
    
    (Optional) Email with tracking link
```

#### Step 3.12: Return Response to Frontend

```
13. Your Server → Browser
    Response: {
      success: true,
      shipment: {
        id: "shipment_789",
        awbCode: "DLVRY1234567890",
        courierName: "Delhivery Surface",
        status: "PENDING_PICKUP",
        labelUrl: "https://shiprocket-media.s3.../label.pdf",
        trackingUrl: "https://shiprocket.in/tracking/DLVRY1234567890"
      }
    }
```

**Result:** Shipment created, AWB generated, in pickup queue

---

### Phase 4: Pickup Scheduling (Cron Job)

**Trigger:** Cron runs at 2:00 PM

```
1. Your Server → Redis
   courierKeys = redis.keys("pending_pickup:*")
   // Returns: ["pending_pickup:Delhivery", "pending_pickup:BlueDart"]

2. For each courier:
   awbCodes = redis.smembers("pending_pickup:Delhivery")
   // Returns: ["DLVRY1234567890", "DLVRY9876543210", "DLVRY5555555555"]

3. Your Server → Shiprocket
   POST https://apiv2.shiprocket.in/v1/external/courier/generate/pickup
   Headers: {
     Authorization: "Bearer eyJhbGc..."
   }
   Body: {
     shipment_id: [345678901, 345678902, 345678903]
   }
   Response: {
     pickup_status: 1,
     response: {
       pickup_scheduled_date: "2026-01-09",
       pickup_token_number: "PKP123456"
     }
   }

4. Your Server → Database
   prisma.shipment.updateMany({
     where: { awbCode: { in: awbCodes } },
     data: {
       status: "PICKUP_SCHEDULED",
       pickupScheduledAt: new Date(),
       pickupTokenNumber: "PKP123456"
     }
   })

5. Your Server → Redis
   redis.del("pending_pickup:Delhivery")
```

**Result:** Courier will come to pick up packages between 2-5 PM

---

### Phase 5: Pickup Done (Webhook from Shiprocket)

**Trigger:** Courier scans package at pickup

```
1. Shiprocket → Your Server
   POST https://yourapp.com/api/webhooks/shiprocket
   Body: {
     awb: "DLVRY1234567890",
     order_id: 234567890,
     shipment_id: 345678901,
     current_status: "Picked Up",
     activities: [{
       date: "2026-01-09 15:30:00",
       activity: "Shipment picked up from seller",
       location: "Mumbai"
     }]
   }

2. Your Server → Database
   prisma.shipment.update({
     where: { awbCode: "DLVRY1234567890" },
     data: {
       status: "IN_TRANSIT",
       pickedUpAt: new Date()
     }
   })

3. Your Server → Database
   prisma.shipmentTracking.create({
     data: {
       shipmentId: "shipment_789",
       status: "PICKED_UP",
       location: "Mumbai",
       description: "Shipment picked up from seller",
       timestamp: new Date("2026-01-09 15:30:00")
     }
   })

4. Your Server → Customer
   POST https://sms-provider.com/api/send
   Body: {
     phone: "+919876543210",
     message: "Your package has been picked up and is on the way!"
   }

5. Your Server → Shiprocket
   Response: 200 OK
```

**Result:** Package now in courier's possession, moving to hub

---

### Phase 6: In Transit Updates (Multiple Webhooks)

**Trigger:** Package moving through courier network

```
// Webhook 1: Reached Hub
Shiprocket → Your Server
POST /api/webhooks/shiprocket
Body: {
  awb: "DLVRY1234567890",
  current_status: "In Transit",
  activities: [{
    date: "2026-01-09 20:00:00",
    activity: "Reached hub - Mumbai",
    location: "Mumbai Hub"
  }]
}

// Webhook 2: Dispatched to Destination
Shiprocket → Your Server
POST /api/webhooks/shiprocket
Body: {
  awb: "DLVRY1234567890",
  current_status: "In Transit",
  activities: [{
    date: "2026-01-10 08:00:00",
    activity: "Dispatched to destination city",
    location: "Delhi Hub"
  }]
}

// Each webhook:
1. Updates shipment status in database
2. Creates tracking event
3. No customer notification (too many updates)
```

---

### Phase 7: Out for Delivery (Critical Webhook)

**Trigger:** Package assigned to delivery person

```
1. Shiprocket → Your Server
   POST https://yourapp.com/api/webhooks/shiprocket
   Body: {
     awb: "DLVRY1234567890",
     order_id: 234567890,
     shipment_id: 345678901,
     current_status: "Out for Delivery",
     activities: [{
       date: "2026-01-10 10:00:00",
       activity: "Out for delivery",
       location: "Delhi - Delivery Hub"
     }],
     etd: "2026-01-10 18:00:00"
   }

2. Your Server → Database
   prisma.shipment.update({
     where: { awbCode: "DLVRY1234567890" },
     data: {
       status: "OUT_FOR_DELIVERY",
       outForDeliveryAt: new Date()
     }
   })

3. Your Server → Database
   prisma.shipmentTracking.create({
     data: {
       shipmentId: "shipment_789",
       status: "OUT_FOR_DELIVERY",
       location: "Delhi - Delivery Hub",
       description: "Out for delivery",
       timestamp: new Date("2026-01-10 10:00:00")
     }
   })

4. Your Server → Customer (IMPORTANT!)
   POST https://sms-provider.com/api/send
   Body: {
     phone: "+919876543210",
     message: "Your order will be delivered today by 6 PM! Track: DLVRY1234567890"
   }
   
   POST https://email-provider.com/api/send
   Body: {
     to: "customer@example.com",
     subject: "Your order is out for delivery!",
     html: "Your package will arrive today..."
   }

5. Your Server → Shiprocket
   Response: 200 OK
```

**Result:** Customer knows package arriving today, delivery in progress

---

## Summary: Complete API Call Count

### Shipment Creation (One-Click Ship):
1. ✅ POST /api/shipments/create (Your API)
2. ✅ Prisma query: Fetch order details (Database)
3. ✅ POST /auth/login (Shiprocket - Get token)
4. ✅ POST /orders/create/adhoc (Shiprocket - Create order)
5. ✅ GET /courier/serviceability (Shiprocket - Check couriers)
6. ✅ POST /courier/assign/awb (Shiprocket - Generate AWB)
7. ✅ POST /courier/generate/label (Shiprocket - Get label)
8. ✅ Prisma create: Save shipment (Database)
9. ✅ Prisma update: Update order status (Database)
10. ✅ Redis SADD: Add to pickup queue (Redis)
11. ✅ POST /send (SMS Provider - Optional)
12. ✅ Response to browser (Your API)

**Total: 12 API calls** (5 to Shiprocket, 4 to Database, 1 to Redis, 1 to SMS, 1 response)

### Pickup Scheduling (Cron):
1. ✅ Redis KEYS: Get all courier queues (Redis)
2. ✅ Redis SMEMBERS: Get AWB codes per courier (Redis)
3. ✅ POST /courier/generate/pickup (Shiprocket - Per courier)
4. ✅ Prisma updateMany: Update shipments (Database)
5. ✅ Redis DEL: Clear queue (Redis)

**Total: 5 API calls per cron run** (1 to Shiprocket per courier)

### Webhooks (In Transit):
1. ✅ POST /api/webhooks/shiprocket (Shiprocket → Your server)
2. ✅ Prisma update: Update shipment status (Database)
3. ✅ Prisma create: Create tracking event (Database)
4. ✅ POST /send: Notify customer if critical status (SMS Provider - Optional)

**Total: 4 API calls per webhook** (Shiprocket sends 5-10 webhooks per shipment)

---

## Timeline Example: Complete Journey

```
Jan 9, 2:00 PM  - Customer pays
                  → Razorpay webhook (1 call)
                  → Order saved to DB (1 call)

Jan 9, 2:05 PM  - Seller clicks "Ship Order"
                  → Shipment creation flow (12 calls)
                  → AWB generated: DLVRY1234567890
                  → Added to pickup queue

Jan 9, 2:00 PM  - Cron runs (scheduled time)
                  → Batch pickup scheduling (5 calls)
                  → Courier notified to pick up

Jan 9, 3:30 PM  - Courier picks up package
                  → Shiprocket webhook (4 calls)
                  → Status: IN_TRANSIT
                  → Customer notified via SMS

Jan 9, 8:00 PM  - Package reaches hub
                  → Shiprocket webhook (4 calls)
                  → Tracking updated

Jan 10, 8:00 AM - Dispatched to destination
                  → Shiprocket webhook (4 calls)
                  → Tracking updated

Jan 10, 10:00 AM - Out for delivery
                   → Shiprocket webhook (4 calls)
                   → Customer notified: "Arriving today!"

Jan 10, 5:00 PM - Delivered
                  → Shiprocket webhook (4 calls)
                  → Order marked complete
                  → Customer gets delivery confirmation
```

**Total API calls for one complete shipment:** ~35-40 calls from order received to delivery

---

## Optimizations to Reduce API Calls

### 1. Token Caching
**Problem:** Currently login to Shiprocket for every shipment
**Solution:** Cache token in Redis with 6-hour expiry
**Savings:** 1 call per shipment = 100 calls/day for 100 orders

### 2. Batch Courier Serviceability Check
**Problem:** Checking serviceability per order
**Solution:** Cache pincode combinations for 24 hours
**Savings:** 1 call per shipment for repeat pincodes

### 3. Batch Label Generation
**Problem:** Generating labels one at a time
**Solution:** Generate labels in batch after all shipments created
**Savings:** 19 calls (generate 20 labels in 1 call instead of 20 calls)

### 4. Webhook Debouncing
**Problem:** Multiple webhooks for same status transition
**Solution:** Only process if status actually changed
**Savings:** 50% of webhook processing (less DB writes)

---

## Critical API Endpoints to Monitor

### High Priority:
1. ✅ Shiprocket /orders/create/adhoc - If fails, shipment not created
2. ✅ Shiprocket /courier/assign/awb - If fails, no tracking number
3. ✅ Shiprocket /courier/generate/pickup - If fails, no pickup scheduled

### Medium Priority:
4. ✅ Shiprocket /courier/serviceability - Fallback to default courier
5. ✅ Shiprocket /courier/generate/label - Can regenerate later
6. ✅ SMS Provider - Not critical, customer can still track online

### Low Priority:
7. ✅ Webhooks - Shiprocket retries automatically
8. ✅ Email notifications - Nice to have, not essential

---

## Error Handling per API Call

**Shiprocket Authentication Failure:**
- Cache token, retry with fresh login
- Alert seller if credentials invalid

**Shipment Creation Failure:**
- Retry up to 3 times with exponential backoff
- If still fails, mark for manual review

**AWB Generation Failure:**
- Try different courier (fallback)
- If all fail, allow manual AWB entry

**Pickup Scheduling Failure:**
- Keep in Redis queue, retry next cron
- Alert if fails 3 consecutive crons

**Webhook Processing Failure:**
- Return 200 OK to Shiprocket (they'll retry anyway)
- Log error, process asynchronously

---

This is the complete API call flow from order received to out for delivery!
