# Shiprocket API Reference - Part 9: Tracking

## Overview

APIs for tracking shipments using AWB codes, Shipment IDs, or Order IDs. These APIs provide real-time tracking information and shipment status updates.

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## Tracking Status Codes

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

---

## 1. Get Tracking through AWB

Get tracking details of a shipment using its AWB (Air Waybill) code.

### Endpoint

```
GET /courier/track/awb/{awb_code}
```

### Path Parameters

| Param | Required | Data Type | Description |
|-------|----------|-----------|-------------|
| `awb_code` | YES | string | The AWB code of the shipment |

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/track/awb/141123221084922' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

```json
{
  "tracking_data": {
    "track_status": 1,
    "shipment_status": 7,
    "shipment_track": [
      {
        "id": 82839215,
        "awb_code": "141123221084922",
        "courier_company_id": 51,
        "shipment_id": 143044428,
        "order_id": 143493606,
        "pickup_date": "2022-07-18 13:50:00",
        "delivered_date": "2022-07-19 11:37:00",
        "weight": "0.25",
        "packages": 1,
        "current_status": "Delivered",
        "delivered_to": "Madanpalli",
        "destination": "Madanpalli",
        "consignee_name": "Customer Name",
        "origin": "BANGALORE",
        "courier_name": "SHADOWFAX",
        "edd": "2022-07-20 19:28:00",
        "pod": "",
        "pod_status": ""
      }
    ],
    "shipment_track_activities": [
      {
        "date": "2022-07-19 11:37:00",
        "status": "DLVD",
        "activity": "Delivered",
        "location": "MADANPALLI, Madanapalli, ANDHRA PRADESH",
        "sr-status": "7",
        "sr-status-label": "DELIVERED"
      },
      {
        "date": "2022-07-19 08:57:00",
        "status": "OFD",
        "activity": "Out for Delivery",
        "location": "MADANPALLI, Madanapalli, ANDHRA PRADESH",
        "sr-status": "17",
        "sr-status-label": "OUT FOR DELIVERY"
      },
      {
        "date": "2022-07-19 07:33:00",
        "status": "RAD",
        "activity": "Reached at Destination",
        "location": "MADANPALLI, Madanapalli, ANDHRA PRADESH",
        "sr-status": "38",
        "sr-status-label": "REACHED AT DESTINATION HUB"
      },
      {
        "date": "2022-07-18 21:02:00",
        "status": "IT",
        "activity": "InTransit",
        "location": "BLR/FC1, BANGALORE, KARNATAKA",
        "sr-status": "18",
        "sr-status-label": "IN TRANSIT"
      },
      {
        "date": "2022-07-18 20:28:00",
        "status": "PKD",
        "activity": "Picked Shipment InScan from Manifest",
        "location": "BLR/FC1, BANGALORE, KARNATAKA",
        "sr-status": "6",
        "sr-status-label": "SHIPPED"
      },
      {
        "date": "2022-07-18 13:50:00",
        "status": "PUD",
        "activity": "PickDone",
        "location": "RTO/CHD, BANGALORE, KARNATAKA",
        "sr-status": "42",
        "sr-status-label": "PICKED UP"
      },
      {
        "date": "2022-07-18 10:04:00",
        "status": "OFP",
        "activity": "Out for Pickup",
        "location": "RTO/CHD, BANGALORE, KARNATAKA",
        "sr-status": "19",
        "sr-status-label": "OUT FOR PICKUP"
      }
    ],
    "track_url": "https://shiprocket.co//tracking/141123221084922",
    "etd": "2022-07-20 19:28:00",
    "qc_response": {
      "qc_image": "",
      "qc_failed_reason": ""
    }
  }
}
```

---

## 2. Get Tracking Data for Multiple AWBs

Get tracking details for multiple shipments at once using their AWB codes.

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

| Param | Required | Data Type | Description | Example |
|-------|----------|-----------|-------------|---------|
| `awbs` | YES | string[] | Array of AWB codes (max 50) | ["788830567028","788829354408"] |

### Notes

- Data must be passed as a string array
- Maximum of 50 AWB codes is supported at a time

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/track/awbs' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
    "awbs": ["788830567028","788829354408"]
}'
```

### Example Response

```json
{
  "788829354408": {
    "tracking_data": {
      "track_status": 1,
      "shipment_status": 1,
      "shipment_track": [
        {
          "id": 8067757,
          "awb_code": "788829354408",
          "courier_company_id": 2,
          "shipment_id": null,
          "order_id": 16240551,
          "pickup_date": null,
          "delivered_date": null,
          "weight": "2.5",
          "packages": 1,
          "current_status": "AWB Assigned",
          "delivered_to": "New Delhi",
          "destination": "New Delhi",
          "consignee_name": "Naruto",
          "origin": "Jammu",
          "courier_agent_details": null
        }
      ],
      "shipment_track_activities": [
        {
          "date": "2019-08-01 02:05:05",
          "activity": "Shipment information sent to FedEx - OC",
          "location": "NA"
        }
      ],
      "track_url": "https://app.shiprocket.in/tracking/awb/788829354408"
    }
  },
  "788830567028": {
    "tracking_data": {
      "track_status": 1,
      "shipment_status": 3,
      "shipment_track": [
        {
          "id": 8087109,
          "awb_code": "788830567028",
          "courier_company_id": 2,
          "shipment_id": null,
          "order_id": 16255275,
          "pickup_date": null,
          "delivered_date": null,
          "weight": "2.5",
          "packages": 1,
          "current_status": "Pickup Generated",
          "delivered_to": "New Delhi",
          "destination": "New Delhi",
          "consignee_name": "Naruto",
          "origin": "Jammu",
          "courier_agent_details": null
        }
      ],
      "shipment_track_activities": [
        {
          "date": "2019-08-01 05:20:55",
          "activity": "Shipment information sent to FedEx - OC",
          "location": "NA"
        }
      ],
      "track_url": "https://app.shiprocket.in/tracking/awb/788830567028"
    }
  }
}
```

---

## 3. Get Tracking through Shipment ID

Get tracking details using the Shiprocket Shipment ID.

### Endpoint

```
GET /courier/track/shipment/{shipment_id}
```

### Path Parameters

| Param | Required | Data Type | Description |
|-------|----------|-----------|-------------|
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

### Example Response

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

## 4. Get Tracking Data through Order ID

Get tracking details using your store's Order ID.

### Endpoint

```
GET /courier/track?order_id={order_id}&channel_id={channel_id}
```

### Query Parameters

| Param | Required | Data Type | Description | Example |
|-------|----------|-----------|-------------|---------|
| `order_id` | YES | string | Your store's order ID/number | NO-123 |
| `channel_id` | NO | integer | Channel ID (use if same order ID exists in multiple channels) | 12345 |

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/track?order_id=123&channel_id=12345' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

```json
[
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
]
```

---

## Response Fields Reference

### shipment_track Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Internal tracking ID |
| `awb_code` | string | AWB number |
| `courier_company_id` | integer | Courier company ID |
| `shipment_id` | integer | Shiprocket shipment ID |
| `order_id` | integer | Order ID |
| `pickup_date` | string | Date/time of pickup |
| `delivered_date` | string | Date/time of delivery |
| `weight` | string | Shipment weight in kg |
| `packages` | integer | Number of packages |
| `current_status` | string | Current status text |
| `delivered_to` | string | Delivery destination |
| `destination` | string | Destination city |
| `consignee_name` | string | Recipient name |
| `origin` | string | Origin city |
| `courier_name` | string | Courier company name |
| `edd` | string | Estimated delivery date |
| `pod` | string | Proof of delivery URL |
| `pod_status` | string | POD status |
| `courier_agent_details` | object | Delivery agent details |

### shipment_track_activities Object

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | Activity date/time |
| `status` | string | Courier's status code |
| `activity` | string | Activity description |
| `location` | string | Activity location |
| `sr-status` | string | Shiprocket status code |
| `sr-status-label` | string | Shiprocket status label |

---

## Tracking Best Practices

1. **Use Appropriate Endpoint**: Choose the right tracking method based on available data
   - AWB: Best for individual shipment tracking
   - Multiple AWBs: Best for batch tracking (max 50)
   - Shipment ID: Use internal Shiprocket ID
   - Order ID: Use your store's order reference

2. **Handle Status Codes**: Map Shiprocket status codes to your application's status system

3. **Track URLs**: Use the provided `track_url` to give customers direct tracking access

4. **EDD Updates**: Monitor the `etd` (estimated time of delivery) field for delivery predictions

5. **Activity History**: Use `shipment_track_activities` for detailed shipment journey
