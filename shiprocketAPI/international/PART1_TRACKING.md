# PART 1: International Tracking APIs

Documentation for tracking international shipments in Shiprocket.

---

## Overview

Tracking APIs allow you to retrieve real-time status of international shipments using various identifiers:
- AWB (Air Waybill) code
- Shipment ID
- Order ID

---

## 1. Track Shipment via AWB

Track international shipment using the AWB (Air Waybill) number.

### Endpoint

```
GET https://apiv2.shiprocket.in/v1/external/courier/track/awb/{awb_code}
```

### Path Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| `awb_code` | Yes | string | The AWB number assigned to shipment | `112393392927` |

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/track/awb/112393392927' \
--header 'Authorization: Bearer <token>'
```

### Success Response (200 OK)

```json
{
  "tracking_data": {
    "track_status": 1,
    "shipment_status": 7,
    "shipment_track": [
      {
        "id": 215402089,
        "awb_code": "112393392927",
        "courier_company_id": 10,
        "shipment_id": 230219697,
        "order_id": 234660379,
        "pickup_date": "2023-02-21 19:08:00",
        "delivered_date": "2023-02-23 13:11:00",
        "weight": "0.50",
        "packages": 1,
        "current_status": "Delivered",
        "delivered_to": "Delivered - Deepak",
        "destination": "HAMIRPUR",
        "consignee_name": "Demo user",
        "origin": "JAIPUR",
        "courier_agent_details": null,
        "edd": null
      }
    ],
    "shipment_track_activities": [
      {
        "date": "2023-02-23 13:11:00",
        "status": "DLVD",
        "activity": "SHIPMENT DELIVERED",
        "location": "HAMIRPUR, Himachal Pradesh",
        "sr-status": "7",
        "sr-status-label": "DELIVERED"
      },
      {
        "date": "2023-02-23 08:43:00",
        "status": "OFD",
        "activity": "Shipment Out For Delivery",
        "location": "HAMIRPUR_HP (Himachal Pradesh)",
        "sr-status": "17",
        "sr-status-label": "OUT FOR DELIVERY"
      }
    ],
    "track_url": "https://shiprocket.co/tracking/112393392927",
    "etd": "2023-02-25 19:08:00",
    "qc_response": {
      "qc_image": "",
      "qc_failed_reason": ""
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `track_status` | integer | Tracking status (1 = success) |
| `shipment_status` | integer | Current shipment status code |
| `shipment_track` | array | Array of shipment tracking objects |
| `shipment_track_activities` | array | Chronological activity history |
| `track_url` | string | Public tracking URL |
| `etd` | string | Estimated Time of Delivery |
| `qc_response` | object | Quality check response details |

---

## 2. Track Shipment via Shipment ID

Track using the internal Shiprocket Shipment ID.

### Endpoint

```
GET https://apiv2.shiprocket.in/v1/external/courier/track/shipment/{shipment_id}
```

### Path Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| `shipment_id` | Yes | integer | Shiprocket shipment identifier | `230219697` |

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/track/shipment/230219697' \
--header 'Authorization: Bearer <token>'
```

### Response

Same structure as AWB tracking.

---

## 3. Track Shipment via Order ID

Track using your original Order ID and optional Channel ID.

### Endpoint

```
GET https://apiv2.shiprocket.in/v1/external/courier/track
```

### Query Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| `order_id` | Yes | string | Your original order identifier | `172647058` |
| `channel_id` | No | integer | Sales channel identifier | `2252386` |

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/track?order_id=172647058&channel_id=2252386' \
--header 'Authorization: Bearer <token>'
```

### Response

Same structure as AWB tracking.

---

## 4. Track International Orders

Retrieve tracking information for international orders with pagination support.

### Endpoint

```
GET https://apiv2.shiprocket.in/v1/external/international/orders/track
```

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/international/orders/track' \
--header 'Authorization: Bearer <token>'
```

### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": 153210169,
      "channel_id": 2252386,
      "channel_name": "Custom",
      "base_channel_code": "CUSTOM",
      "channel_order_id": "1726470481",
      "customer_name": "Elena",
      "customer_email": "test.test@shiprocket.com",
      "customer_phone": "9760853722",
      "customer_address": "Plot 1, Panchkula, Haryana 134113, India",
      "customer_address_2": "",
      "customer_city": "Dallas",
      "customer_state": "Texas",
      "customer_pincode": "134090",
      "customer_country": "United States",
      "status": "NEW",
      "status_code": 1,
      "payment_method": "Prepaid",
      "total": 100,
      "products": [
        {
          "id": 185463241,
          "channel_order_product_id": "0",
          "name": "Combo of 4 Way Spanner and Hydraulic trolly Jack",
          "sku": "5-47606",
          "quantity": 1,
          "price": 100,
          "hsn": ""
        }
      ],
      "shipments": [
        {
          "id": 152757155,
          "isd_code": "+1",
          "courier": "",
          "weight": 0.41,
          "dimensions": "10x10x10",
          "awb": "",
          "awb_assigned_date": null,
          "pickup_scheduled_date": null,
          "pickup_token_number": null,
          "status": "NEW",
          "status_code": 1,
          "delivered_date": null,
          "etd": null
        }
      ],
      "activities": [
        {
          "date": "2022-04-27 10:09:35",
          "activity": "Order Created",
          "location": ""
        }
      ],
      "pickup_address_detail": {
        "id": 58585,
        "pickup_location": "Primary",
        "name": "Demo User",
        "email": "demo@shiprocket.com",
        "phone": "9999999999",
        "address": "Demo Address",
        "address_2": "",
        "city": "New Delhi",
        "state": "Delhi",
        "country": "India",
        "pin_code": "110030"
      }
    }
  ],
  "meta": {
    "pagination": {
      "total": 1,
      "count": 1,
      "per_page": 20,
      "current_page": 1,
      "total_pages": 1
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | Array of international order objects |
| `meta.pagination` | object | Pagination details |
| `products` | array | Product details with HSN codes |
| `shipments` | array | Shipment details including ISD code |
| `activities` | array | Order activity timeline |
| `pickup_address_detail` | object | Pickup location information |

---

## Shipment Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 1 | NEW | Order created |
| 2 | AWB_ASSIGNED | AWB number assigned |
| 3 | PICKUP_SCHEDULED | Pickup scheduled |
| 4 | PICKUP_QUEUED | Pickup queued |
| 5 | PICKED_UP | Package picked up |
| 6 | IN_TRANSIT | In transit |
| 7 | DELIVERED | Delivered successfully |
| 8 | CANCELED | Order/shipment canceled |
| 9 | RTO | Return to origin |
| 17 | OUT_FOR_DELIVERY | Out for delivery |

---

## Error Responses

### Invalid AWB (404)

```json
{
  "tracking_data": {
    "track_status": 0,
    "error": "AWB not found"
  }
}
```

### Unauthorized (401)

```json
{
  "message": "Unauthenticated."
}
```

---

## Notes

1. **Public Tracking URL**: The `track_url` field provides a public link that customers can use
2. **Activity History**: Activities are listed in reverse chronological order (newest first)
3. **International Orders**: Use the `/international/orders/track` endpoint for comprehensive international order tracking
4. **ETD**: Estimated Time of Delivery may update during transit
5. **ISD Code**: International orders include ISD country code for phone numbers

---

*Next: [PART2_KYC.md](./PART2_KYC.md) - International KYC & Compliance*
