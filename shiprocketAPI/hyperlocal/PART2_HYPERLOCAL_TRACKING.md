# Shiprocket Hyperlocal API - Part 2: Tracking

## Overview

Track Hyperlocal shipments using AWB codes, Shipment IDs, or Order IDs. Hyperlocal tracking includes rider-specific status codes for same-day delivery tracking.

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## Hyperlocal Tracking Status Codes

### Standard Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 6 | SHIPPED | Shipment has been shipped |
| 7 | DELIVERED | Shipment delivered successfully |
| 8 | CANCELED | Shipment has been canceled |
| 9 | RTO INITIATED | Return to origin initiated |
| 10 | RTO DELIVERED | Returned to origin successfully |
| 12 | LOST | Shipment lost in transit |
| 13 | PICKUP ERROR | Error during pickup |
| 14 | RTO ACKNOWLEDGED | RTO acknowledged by courier |
| 15 | PICKUP RESCHEDULED | Pickup has been rescheduled |
| 16 | CANCELLATION REQUESTED | Cancellation has been requested |
| 17 | OUT FOR DELIVERY | Shipment is out for delivery |
| 18 | IN TRANSIT | Shipment is in transit |
| 19 | OUT FOR PICKUP | Courier is out for pickup |
| 20 | PICKUP EXCEPTION | Exception during pickup |
| 21 | UNDELIVERED | Delivery attempt failed |
| 22 | DELAYED | Shipment is delayed |
| 23 | PARTIAL_DELIVERED | Partially delivered |
| 24 | DESTROYED | Shipment destroyed |
| 25 | DAMAGED | Shipment damaged |
| 26 | FULFILLED | Order fulfilled |
| 27 | PICKUP BOOKED | Pickup has been booked |
| 38 | REACHED AT DESTINATION HUB | Arrived at destination hub |
| 39 | MISROUTED | Shipment was misrouted |
| 40 | RTO_NDR | RTO due to NDR |
| 41 | RTO_OFD | RTO out for delivery |
| 42 | PICKED UP | Shipment picked up from seller |
| 43 | SELF FULFILLED | Self-fulfilled order |
| 44 | DISPOSED OFF | Shipment disposed |
| 45 | CANCELLED_BEFORE_DISPATCHED | Canceled before dispatch |
| 46 | RTO IN INTRANSIT | RTO shipment in transit |
| 47 | QC FAILED | Quality check failed |
| 48 | REACHED WAREHOUSE | Reached warehouse |
| 49 | CUSTOM CLEARED | Customs cleared |
| 50 | IN FLIGHT | Shipment in flight |
| 51 | HANDOVER TO COURIER | Handed over to courier |
| 52 | SHIPMENT BOOKED | Shipment booked |
| 54 | IN TRANSIT OVERSEAS | In transit overseas |
| 55 | CONNECTION ALIGNED | Connection aligned |
| 56 | REACHED OVERSEAS WAREHOUSE | Reached overseas warehouse |
| 57 | CUSTOM CLEARED OVERSEAS | Customs cleared overseas |
| 59 | BOX PACKING | Box packing in progress |
| 60 | FC ALLOCATED | Fulfillment center allocated |
| 61 | PICKLIST GENERATED | Picklist generated |
| 62 | READY TO PACK | Ready for packing |
| 63 | PACKED | Shipment packed |
| 67 | FC MANIFEST GENERATED | FC manifest generated |
| 68 | PROCESSED AT WAREHOUSE | Processed at warehouse |
| 71 | HANDOVER EXCEPTION | Exception during handover |
| 72 | PACKED EXCEPTION | Exception during packing |
| 75 | RTO_LOCK | RTO locked |
| 76 | UNTRACEABLE | Shipment untraceable |
| 77 | ISSUE_RELATED_TO_THE_RECIPIENT | Issue related to recipient |
| 78 | REACHED_BACK_AT_SELLER_CITY | Reached back at seller city |

### Hyperlocal Rider-Specific Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 79 | RIDER ASSIGNED | Delivery rider assigned to the shipment |
| 80 | RIDER UNASSIGNED | Delivery rider unassigned from shipment |
| 81 | RIDER REACHED AT DROP | Rider has reached the delivery location |
| 82 | SEARCHING_FOR_RIDER | System is actively searching for a rider |
| 83 | SEARCHING_FOR_RIDER | Searching for rider (alternate status) |

---

## 1. Get Tracking through AWB

Get tracking details of a Hyperlocal shipment using its AWB code.

### Endpoint

```
GET /courier/track/awb/{awb_code}
```

### Path Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION |
|--------|----------|-----------|-------------|
| `awb_code` | YES | string | The AWB code of the shipment |

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/track/awb/788830567028' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response (200 OK)

```json
{
  "tracking_data": {
    "track_status": 1,
    "shipment_status": 7,
    "shipment_track": [
      {
        "id": 16102315,
        "awb_code": "788830567028",
        "courier_company_id": 4,
        "shipment_id": 16102315,
        "order_id": 16104408,
        "pickup_date": "2019-07-01 10:56:35",
        "delivered_date": "2019-07-02 09:56:35",
        "weight": "2.00",
        "packages": 1,
        "current_status": "Delivered",
        "delivered_to": "Manali",
        "destination": "Manali",
        "consignee_name": "Naruto",
        "origin": "Delhi",
        "courier_agent_details": null,
        "courier_name": "Amazon 5kg",
        "edd": "2019-07-04",
        "pod": "https://sr-sg-new.s3.ap-southeast-1.amazonaws.com/",
        "pod_status": "1"
      }
    ],
    "shipment_track_activities": [
      {
        "date": "2019-07-02 09:56:35",
        "status": "DLD",
        "activity": "Delivered - Delivered To Addressee",
        "location": "Manali",
        "sr-status": "7",
        "sr-status-label": "DELIVERED"
      },
      {
        "date": "2019-07-02 09:56:35",
        "status": "OFD",
        "activity": "Out For Delivery",
        "location": "MANALI CD, Himachal Pradesh",
        "sr-status": "17",
        "sr-status-label": "OUT FOR DELIVERY"
      }
    ],
    "track_url": "https://shiprocket.co//tracking/788830567028",
    "etd": "2019-07-04 10:56:35",
    "qc_response": null
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `track_status` | integer | 1 = tracking available, 0 = not available |
| `shipment_status` | integer | Status code (see status codes table) |
| `shipment_track` | array | Array of shipment tracking details |
| `shipment_track_activities` | array | Array of tracking activity history |
| `track_url` | string | Public tracking URL |
| `etd` | string | Estimated time of delivery |
| `pod` | string | Proof of delivery URL |

---

## 2. Get Tracking for Multiple AWBs

Track multiple Hyperlocal shipments at once using their AWB codes.

### Endpoint

```
POST /courier/track/awbs
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION |
|--------|----------|-----------|-------------|
| `awbs` | YES | string[] | Array of AWB codes. Maximum 50 AWBs at a time |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/track/awbs' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
    "awbs": ["788830567028", "788829354408"]
}'
```

### Example Response (200 OK)

```json
{
  "788830567028": {
    "tracking_data": {
      "track_status": 1,
      "shipment_status": 7,
      "shipment_track": [...],
      "shipment_track_activities": [...],
      "track_url": "https://shiprocket.co//tracking/788830567028",
      "etd": "2019-07-04 10:56:35"
    }
  },
  "788829354408": {
    "tracking_data": {
      "track_status": 1,
      "shipment_status": 42,
      "shipment_track": [...],
      "shipment_track_activities": [...],
      "track_url": "https://shiprocket.co//tracking/788829354408",
      "etd": "2021-12-28 10:19:35"
    }
  }
}
```

### Notes

- Maximum 50 AWBs can be tracked in a single request
- Response is keyed by AWB code for easy lookup

---

## 3. Get Tracking through Shipment ID

Track a Hyperlocal shipment using its Shiprocket Shipment ID.

### Endpoint

```
GET /courier/track/shipment/{shipment_id}
```

### Path Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION |
|--------|----------|-----------|-------------|
| `shipment_id` | YES | integer | The Shiprocket shipment ID |

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/track/shipment/16104408' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response (200 OK)

```json
{
  "tracking_data": {
    "track_status": 1,
    "shipment_status": 42,
    "shipment_track": [
      {
        "id": 185584215,
        "awb_code": "1091188857722",
        "courier_company_id": 10,
        "shipment_id": 168347943,
        "order_id": 168807908,
        "pickup_date": null,
        "delivered_date": null,
        "weight": "0.10",
        "packages": 1,
        "current_status": "PICKED UP",
        "delivered_to": "Mumbai",
        "destination": "Mumbai",
        "consignee_name": "Musarrat",
        "origin": "PALWAL",
        "courier_agent_details": null,
        "edd": "2021-12-27 23:23:18"
      }
    ],
    "shipment_track_activities": [
      {
        "date": "2021-12-23 14:23:18",
        "status": "X-PPOM",
        "activity": "In Transit - Shipment picked up",
        "location": "Palwal_NewColony_D (Haryana)",
        "sr-status": "42"
      },
      {
        "date": "2021-12-23 14:19:37",
        "status": "FMPUR-101",
        "activity": "Manifested - Pickup scheduled",
        "location": "Palwal_NewColony_D (Haryana)",
        "sr-status": "NA"
      },
      {
        "date": "2021-12-23 14:19:34",
        "status": "X-UCI",
        "activity": "Manifested - Consignment Manifested",
        "location": "Palwal_NewColony_D (Haryana)",
        "sr-status": "5"
      }
    ],
    "track_url": "https://shiprocket.co//tracking/1091188857722",
    "etd": "2021-12-28 10:19:35"
  }
}
```

---

## 4. Get Tracking through Order ID

Track a Hyperlocal shipment using your Order ID.

### Endpoint

```
GET /courier/track
```

### Query Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION |
|--------|----------|-----------|-------------|
| `order_id` | YES | string | Your order ID |
| `channel_id` | NO | integer | The channel ID (for multi-channel setups) |

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/track?order_id=ORD123456&channel_id=123' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response (200 OK)

Response structure is the same as Get Tracking through AWB.

---

## See Also

- [PART1_HYPERLOCAL_COURIERS.md](./PART1_HYPERLOCAL_COURIERS.md) - Hyperlocal courier assignment
- [PART3_HYPERLOCAL_PICKUP_ADDRESSES.md](./PART3_HYPERLOCAL_PICKUP_ADDRESSES.md) - Managing pickup addresses
