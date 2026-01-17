# Shiprocket API Reference - Part 5: Shipments

## Overview

This document covers Shiprocket's Shipment management APIs including shipment status codes, retrieving shipment details, and cancellation.

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## Shipment Status Codes Reference

Understanding shipment status codes is crucial for tracking and managing shipments effectively.

| Code | Status | Description |
|------|--------|-------------|
| 1 | AWB Assigned | AWB (Air Waybill) has been assigned to the shipment |
| 2 | Label Generated | Shipping label has been generated |
| 3 | Pickup Scheduled | Pickup has been scheduled with courier |
| 4 | Pickup Queued | Pickup request is in queue |
| 5 | Manifest Generated | Manifest document has been generated |
| 6 | Shipped | Shipment has been picked up and is in transit |
| 7 | Delivered | Shipment has been delivered to recipient |
| 8 | Cancelled | Shipment has been cancelled |
| 9 | RTO Initiated | Return to Origin has been initiated |
| 10 | RTO Delivered | Return to Origin shipment delivered back to seller |
| 11 | Pending | Shipment is pending processing |
| 12 | Lost | Shipment has been lost in transit |
| 13 | Pickup Error | Error occurred during pickup attempt |
| 14 | RTO Acknowledged | RTO request has been acknowledged |
| 15 | Pickup Rescheduled | Pickup has been rescheduled |
| 16 | Cancellation Requested | Cancellation has been requested |
| 17 | Out For Delivery | Shipment is out for delivery |
| 18 | In Transit | Shipment is in transit |
| 19 | Out For Pickup | Courier is out for pickup |
| 20 | Pickup Exception | Exception occurred during pickup |
| 21 | Undelivered | Delivery attempt failed |
| 22 | Delayed | Shipment is delayed |
| 23 | Partial_Delivered | Order partially delivered |
| 24 | Destroyed | Shipment has been destroyed |
| 25 | Damaged | Shipment is damaged |
| 26 | Fulfilled | Order has been fulfilled |
| 38 | Reached at Destination | Shipment reached destination hub |
| 39 | Misrouted | Shipment was misrouted |
| 40 | RTO NDR | RTO Non-Delivery Report |
| 41 | RTO OFD | RTO Out For Delivery |
| 42 | Picked Up | Shipment has been picked up |
| 43 | Self Fulfilled | Order self-fulfilled by seller |
| 44 | DISPOSED_OFF | Shipment has been disposed off |
| 45 | CANCELLED_BEFORE_DISPATCHED | Cancelled before dispatch |
| 46 | RTO_IN_TRANSIT | RTO shipment in transit |
| 47 | QC Failed | Quality check failed |
| 48 | Reached Warehouse | Reached warehouse/hub |
| 49 | Custom Cleared | Customs clearance completed |
| 50 | In Flight | International shipment in flight |
| 51 | Handover to Courier | Handed over to courier partner |
| 52 | Shipment Booked | Shipment has been booked |
| 54 | In Transit Overseas | In transit overseas (international) |
| 55 | Connection Aligned | Connection/transit aligned |
| 56 | Reached Overseas Warehouse | Reached overseas warehouse |
| 57 | Custom Cleared Overseas | Customs cleared at overseas destination |
| 59 | Box Packing | Box packing in progress |

### Status Code Categories

#### Pre-Shipment Statuses (1-5)
- AWB Assignment → Label → Pickup Scheduling → Manifest

#### In-Transit Statuses (6, 17, 18, 19, 38, 42)
- Active shipment movement stages

#### Delivery Statuses (7, 21, 23, 26)
- Final delivery outcomes

#### Return/RTO Statuses (9, 10, 14, 40, 41, 46)
- Return to origin flow statuses

#### Exception Statuses (12, 13, 20, 22, 24, 25, 39, 47)
- Error and exception conditions

#### International Shipping Statuses (49, 50, 54, 55, 56, 57)
- Cross-border shipment stages

---

## 1. Get All Shipment Details

Retrieve all shipment details with filtering and sorting options.

### Endpoint

```
GET /shipments
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Query Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| sort | NO | string | Sort direction | `ASC` or `DESC` |
| sort_by | NO | string | Field to sort by | `id`, `created_at` |
| filter | NO | string | Filter value | Status code or date |
| filter_by | NO | string | Field to filter by | `status`, `created_at` |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/shipments?sort=DESC&sort_by=created_at' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

```json
{
  "data": [
    {
      "id": 222002884,
      "order_id": 222521420,
      "channel_id": 27202,
      "channel_name": "Custom",
      "awb": "14326421307048",
      "courier_company_id": 25,
      "courier_name": "Xpressbees 5kg",
      "status": 6,
      "status_code": "SHIPPED",
      "pickup_scheduled_date": "2022-06-04 09:00:00",
      "delivered_date": null,
      "weight": 0.5,
      "length": 100,
      "breadth": 50,
      "height": 10,
      "payment_method": "COD",
      "shipping_customer_name": "Jax Tank",
      "shipping_address": "Dust2",
      "shipping_city": "New Delhi",
      "shipping_state": "Delhi",
      "shipping_pincode": "110002",
      "created_at": "2022-06-03 13:52:05"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 150
  }
}
```

### Use Cases

1. **Dashboard Overview**: Get all recent shipments for dashboard display
2. **Status Filtering**: Filter shipments by specific status codes
3. **Reporting**: Generate shipment reports with date range filters
4. **Tracking**: Monitor all active shipments

---

## 2. Get Specific Shipment Details

Retrieve detailed information about a specific shipment.

### Endpoint

```
GET /shipments/{shipment_id}
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Path Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| shipment_id | YES | integer | The Shiprocket shipment ID | 222002884 |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/shipments/222002884' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

```json
{
  "data": {
    "id": 222002884,
    "order_id": 222521420,
    "channel_order_id": "22114477",
    "channel_id": 27202,
    "channel_name": "Custom",
    "awb_code": "14326421307048",
    "courier_company_id": 25,
    "courier_name": "Xpressbees 5kg",
    "status": 6,
    "status_code": "SHIPPED",
    "pickup_location": "HomeNew",
    "pickup_scheduled_date": "2022-06-04 09:00:00",
    "pickup_token_number": "Reference No: 194_BIGFOOT 2540335_04062022",
    "delivered_date": null,
    "billing_customer_name": "Jax Tank",
    "billing_address": "Dust2",
    "billing_city": "New Delhi",
    "billing_state": "Delhi",
    "billing_pincode": "110002",
    "billing_country": "India",
    "billing_email": "jax@counterstike.com",
    "billing_phone": "9988998899",
    "shipping_customer_name": "Jax Tank",
    "shipping_address": "Dust2",
    "shipping_city": "New Delhi",
    "shipping_state": "Delhi",
    "shipping_pincode": "110002",
    "shipping_country": "India",
    "weight": 0.5,
    "length": 100,
    "breadth": 50,
    "height": 10,
    "payment_method": "COD",
    "sub_total": 4000,
    "order_items": [
      {
        "name": "T-shirt Round Neck",
        "sku": "t-shirt-round1474",
        "units": 10,
        "selling_price": 400
      }
    ],
    "activities": [
      {
        "date": "2022-06-03 13:52:05",
        "status": "AWB Assigned",
        "activity": "AWB assigned by Xpressbees"
      },
      {
        "date": "2022-06-04 09:30:00",
        "status": "Picked Up",
        "activity": "Shipment picked up"
      },
      {
        "date": "2022-06-04 14:00:00",
        "status": "Shipped",
        "activity": "Shipment in transit"
      }
    ],
    "created_at": "2022-06-03 13:52:05"
  }
}
```

### Use Cases

1. **Detailed Tracking**: Get complete tracking history for a shipment
2. **Customer Support**: Retrieve shipment details for customer queries
3. **Order Management**: View all shipment details including items and addresses
4. **Activity Log**: Review complete shipment activity history

---

## 3. Cancel a Shipment

Cancel one or multiple shipments by AWB numbers.

### Endpoint

```
POST /orders/cancel/shipment/awbs
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body Parameters

| Parameter | Required | Type | Description | Limit |
|-----------|----------|------|-------------|-------|
| awbs | YES | array | Array of AWB numbers to cancel | Max 2000 AWBs |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/cancel/shipment/awbs' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "awbs": ["14326421307048", "14326421307049", "14326421307050"]
}'
```

### Request Body Example

```json
{
  "awbs": ["14326421307048", "14326421307049", "14326421307050"]
}
```

### Example Response

```json
{
  "message": "Shipments cancelled successfully",
  "data": {
    "cancelled": [
      {
        "awb": "14326421307048",
        "status": "success",
        "message": "Shipment cancelled"
      },
      {
        "awb": "14326421307049",
        "status": "success",
        "message": "Shipment cancelled"
      }
    ],
    "failed": [
      {
        "awb": "14326421307050",
        "status": "failed",
        "message": "Shipment already in transit, cannot cancel"
      }
    ]
  }
}
```

### Cancellation Rules

1. **Timing**: Shipments can only be cancelled before pickup
2. **Status Restrictions**: Cannot cancel shipments that are:
   - Already in transit (status 6, 18)
   - Out for delivery (status 17)
   - Delivered (status 7)
   - Already cancelled (status 8)
3. **Bulk Limit**: Maximum 2000 AWBs per request

### Use Cases

1. **Order Cancellation**: Cancel shipment when customer cancels order
2. **Address Issues**: Cancel and recreate when address needs major correction
3. **Bulk Operations**: Cancel multiple shipments in one request
4. **Error Recovery**: Cancel shipments created with incorrect details

---

## Integration Best Practices

### Status Monitoring

```javascript
// Recommended status polling intervals
const POLLING_INTERVALS = {
  PRE_PICKUP: 30 * 60 * 1000,    // 30 minutes
  IN_TRANSIT: 2 * 60 * 60 * 1000, // 2 hours
  OUT_FOR_DELIVERY: 15 * 60 * 1000, // 15 minutes
  RTO: 60 * 60 * 1000             // 1 hour
};

// Status code groups for filtering
const STATUS_GROUPS = {
  ACTIVE: [1, 2, 3, 4, 5, 6, 17, 18, 19, 38, 42],
  DELIVERED: [7, 23, 26],
  EXCEPTIONS: [12, 13, 20, 21, 22, 24, 25, 39, 47],
  RTO: [9, 10, 14, 40, 41, 46],
  CANCELLED: [8, 44, 45]
};
```

### Error Handling

```javascript
async function getShipmentDetails(shipmentId) {
  try {
    const response = await fetch(
      `https://apiv2.shiprocket.in/v1/external/shipments/${shipmentId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch shipment:', error);
    throw error;
  }
}
```

### Webhook Integration

For real-time status updates, use webhooks instead of polling:
- Configure webhook URL in Shiprocket dashboard
- Handle status change events automatically
- More efficient than periodic API calls

---

## Rate Limits

| API | Rate Limit |
|-----|------------|
| Get All Shipments | 180 requests/minute |
| Get Specific Shipment | 180 requests/minute |
| Cancel Shipment | 180 requests/minute |

**Response Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window

---

## Related Documentation

- [Part 1: Authentication](./PART1_AUTH.md)
- [Part 2: Orders](./PART2_ORDERS.md)
- [Part 3: Couriers](./PART3_COURIERS.md)
- [Part 4: Returns & Exchanges](./PART4_RETURNS_EXCHANGES.md)
- [Part 6: Labels, Manifests & Invoice](./PART6_LABELS_MANIFESTS.md)
- [Part 7: Wrapper API](./PART7_WRAPPER_API.md)
