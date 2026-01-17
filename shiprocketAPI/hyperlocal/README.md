# Shiprocket Hyperlocal API Documentation

## Overview

Hyperlocal delivery APIs for same-city or short-distance (within city) deliveries. These APIs enable rapid delivery using local courier partners like Dunzo, Borzo, Shadowfax Local, and Shiprocket Quick.

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## What is Hyperlocal Delivery?

Hyperlocal delivery refers to:
- **Same-day delivery** within a city or local area
- **Short-distance shipping** typically within 10-50 km
- **Express delivery** using bike couriers or local delivery partners
- **Location-based routing** using latitude/longitude coordinates

### Key Differences from Standard Delivery

| Feature | Standard Delivery | Hyperlocal Delivery |
|---------|------------------|---------------------|
| Distance | Inter-city, nationwide | Within city, local area |
| Time | 2-7 days | Same day, few hours |
| Routing | PIN code based | Coordinate (lat/long) based |
| Couriers | Delhivery, BlueDart, etc. | Dunzo, Borzo, Shadowfax Local |
| Parameters | PIN codes | PIN codes + Coordinates |

---

## Documentation Index

### [Part 1: Hyperlocal Couriers](./PART1_HYPERLOCAL_COURIERS.md)
- Generate AWB for Hyperlocal shipments
- Check Hyperlocal courier serviceability with coordinates
- Hyperlocal courier IDs reference

### [Part 2: Hyperlocal Tracking](./PART2_HYPERLOCAL_TRACKING.md)
- Tracking status codes (including rider-specific codes 79-83)
- Track by AWB, Shipment ID, or Order ID
- Track multiple AWBs at once

### [Part 3: Hyperlocal Pickup Addresses](./PART3_HYPERLOCAL_PICKUP_ADDRESSES.md)
- Get all pickup locations with coordinates
- Add new pickup locations with lat/long
- Best practices for Hyperlocal pickup setup

### [Part 4: Hyperlocal Orders Management](./PART4_HYPERLOCAL_ORDERS.md)
- Create custom Hyperlocal orders
- Update existing orders
- Cancel and manage orders
- Order status codes reference

---

## Hyperlocal Courier Partners

| COURIER ID | COURIER NAME | TYPE |
|------------|--------------|------|
| 95 | Shadowfax Local | Bike/Local |
| 97 | Dunzo Local | Bike/Local |
| 106 | Borzo | Bike/Local |
| 107 | Borzo 5 Kg | Bike/Local |

---

## Hyperlocal-Specific Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 79 | RIDER ASSIGNED | Rider has been assigned to pickup |
| 80 | RIDER UNASSIGNED | Rider was unassigned |
| 81 | RIDER REACHED AT DROP | Rider reached delivery location |
| 82 | SEARCHING_FOR_RIDER | System searching for available rider |
| 83 | SEARCHING_FOR_RIDER | Alternative searching status |

---

## Quick Start: Hyperlocal Order Flow

### 1. Check Serviceability with Coordinates

```bash
GET /courier/serviceability/?pickup_postcode=110030&delivery_postcode=122002&cod=1&is_new_hyperlocal=1&lat_from=28.6139&long_from=77.2090&lat_to=28.5355&long_to=77.3910
```

### 2. Create Order (Use Standard Order API)

Use the standard Create Order API from [PART2_ORDERS.md](../PART2_ORDERS.md)

### 3. Generate AWB with Hyperlocal Courier

```bash
POST /courier/assign/awb
{
  "shipment_id": "16090281",
  "courier_id": "97"  // Dunzo Local
}
```

### 4. Track with Rider Status

```bash
GET /courier/track/awb/{awb_code}
```

Watch for status codes 79-83 for rider-specific updates.

---

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/orders/create/adhoc` | POST | Create custom Hyperlocal order |
| `/orders/update/adhoc` | POST | Update existing order |
| `/orders/cancel` | POST | Cancel an order |
| `/courier/serviceability/` | GET | Check Hyperlocal courier availability |
| `/courier/assign/awb` | POST | Generate AWB for shipment |
| `/courier/track/awb/{awb}` | GET | Track by AWB |
| `/courier/track/awbs` | POST | Track multiple AWBs |
| `/courier/track/shipment/{id}` | GET | Track by shipment ID |
| `/courier/track` | GET | Track by order ID |
| `/settings/company/pickup` | GET | Get all pickup locations |
| `/settings/company/addpickup` | POST | Add new pickup location |

---

## See Also

- [Main Shiprocket API Docs](../README.md) - Standard API documentation
- [PART3_COURIERS.md](../PART3_COURIERS.md) - Standard courier APIs
- [PART9_TRACKING.md](../PART9_TRACKING.md) - Standard tracking APIs
