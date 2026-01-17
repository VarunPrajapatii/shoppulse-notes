# Shiprocket Hyperlocal API - Part 1: Couriers

## Overview

Hyperlocal delivery APIs for same-city or short-distance deliveries. These APIs use latitude/longitude coordinates for precise pickup and delivery location serviceability.

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## 1. Generate AWB for Shipment

Assign an AWB (Air Waybill Number) to your Hyperlocal shipment. The AWB is a unique tracking number for the shipment.

### Endpoint

```
POST /courier/assign/awb
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `shipment_id` | YES | integer | The shipment ID of the order you want to create the AWB for | 16016920 |
| `courier_id` | NO | integer | The courier ID. Default courier is selected if not specified | 10 |
| `status` | NO | string | Use "reassign" to change courier. Note: Can only be done once in 24 hours | reassign |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/assign/awb' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
    "shipment_id": "16090281",
    "courier_id": "10"
}'
```

### Example Response (200 OK)

```json
{
  "success": true,
  "message": "We are processing your request"
}
```

---

## 2. Check Hyperlocal Courier Serviceability

Check availability of Hyperlocal couriers between pickup and delivery locations using coordinates.

### Endpoint

```
GET /courier/serviceability/
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Query Parameters

#### Standard Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `pickup_postcode` | YES | integer | Postcode from where the order will be picked | 110030 |
| `delivery_postcode` | YES | integer | Postcode where the order will be delivered | 122002 |
| `order_id` | NO | integer | Shiprocket order ID (if already created) | 123456 |
| `cod` | CONDITIONAL | integer | 1 for Cash on Delivery, 0 for Prepaid. Required if order_id not provided | 1 |

#### Hyperlocal-Specific Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `is_new_hyperlocal` | YES | integer | Set to 1 for Hyperlocal delivery | 1 |
| `lat_from` | YES | float | Latitude of pickup location | 28.6139 |
| `long_from` | YES | float | Longitude of pickup location | 77.2090 |
| `lat_to` | YES | float | Latitude of delivery location | 28.5355 |
| `long_to` | YES | float | Longitude of delivery location | 77.3910 |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=110030&delivery_postcode=122002&cod=1&is_new_hyperlocal=1&lat_from=28.6139&long_from=77.2090&lat_to=28.5355&long_to=77.3910' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response (200 OK)

```json
{
  "status": true,
  "data": [
    {
      "courier_name": "Shiprocket Quick",
      "rates": "345.3"
    }
  ]
}
```

### Notes

- Hyperlocal delivery is for same-city or short-distance deliveries
- Coordinates (lat/long) are mandatory for Hyperlocal serviceability checks
- Hyperlocal couriers include services like Shiprocket Quick, Dunzo, Borzo, etc.
- Use `only_local=1` parameter to filter and show only Hyperlocal couriers

---

## Hyperlocal Courier IDs Reference

| COURIER ID | COURIER NAME |
|------------|--------------|
| 95 | Shadowfax Local |
| 97 | Dunzo Local |
| 106 | Borzo |
| 107 | Borzo 5 Kg |

---

## See Also

- [PART2_HYPERLOCAL_TRACKING.md](./PART2_HYPERLOCAL_TRACKING.md) - Tracking Hyperlocal shipments
- [PART3_HYPERLOCAL_PICKUP_ADDRESSES.md](./PART3_HYPERLOCAL_PICKUP_ADDRESSES.md) - Managing pickup addresses
