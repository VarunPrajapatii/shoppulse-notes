# Shiprocket Hyperlocal API - Part 3: Pickup Addresses

## Overview

Manage pickup locations for Hyperlocal deliveries. These APIs allow you to retrieve existing pickup locations and add new ones with latitude/longitude coordinates for precise Hyperlocal routing.

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## 1. Get All Pickup Locations

Retrieve a list of all pickup locations in your Shiprocket account. For Hyperlocal deliveries, ensure pickup locations have `lat` and `long` coordinates set.

### Endpoint

```
GET /settings/company/pickup
```

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/settings/company/pickup' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response (200 OK)

```json
{
  "data": {
    "shipping_address": [
      {
        "id": 4984500,
        "pickup_location": "Casa Moderna",
        "address_type": null,
        "address": "1900 GF, Sector 45",
        "address_2": "near Park 1",
        "updated_address": false,
        "old_address": "",
        "old_address2": "",
        "tag": "",
        "tag_value": "",
        "instruction": "",
        "city": "Gurgaon",
        "state": "Haryana",
        "country": "India",
        "pin_code": "122003",
        "email": "abcxyz@gmail.com",
        "is_first_mile_pickup": 0,
        "phone": "9667667496",
        "name": "CASA MODERNA",
        "company_id": 1138022,
        "gstin": null,
        "vendor_name": null,
        "status": 2,
        "phone_verified": 1,
        "lat": "28.44786453607",
        "long": "77.074250297017",
        "open_time": null,
        "close_time": null,
        "warehouse_code": null,
        "alternate_phone": "",
        "rto_address_id": 4984500,
        "lat_long_status": 1,
        "new": 1,
        "associated_rto_address": null,
        "is_primary_location": 1
      }
    ],
    "allow_more": "true",
    "is_blackbox_seller": false,
    "company_name": "CASA MODERNA",
    "recent_addresses": []
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique pickup location ID |
| `pickup_location` | string | Nickname/name of the pickup location |
| `address` | string | Primary address line |
| `address_2` | string | Secondary address line |
| `city` | string | City name |
| `state` | string | State name |
| `country` | string | Country name |
| `pin_code` | string | Postal/PIN code |
| `email` | string | Contact email |
| `phone` | string | Contact phone number |
| `name` | string | Contact person name |
| `lat` | string | Latitude coordinate (important for Hyperlocal) |
| `long` | string | Longitude coordinate (important for Hyperlocal) |
| `lat_long_status` | integer | 1 = coordinates available, 0 = not set |
| `is_primary_location` | integer | 1 = primary location, 0 = secondary |

### Notes for Hyperlocal

- **Latitude and Longitude are critical** for Hyperlocal deliveries
- Ensure `lat_long_status` is 1 for locations used in Hyperlocal orders
- Locations without coordinates may not work with Hyperlocal couriers

---

## 2. Add a New Pickup Location

Add a new pickup location to your account. For Hyperlocal deliveries, include latitude and longitude coordinates.

### Endpoint

```
POST /settings/company/addpickup
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body Parameters

#### Required Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `pickup_location` | YES | string | Nickname for the pickup location. Max 36 characters | Home |
| `name` | YES | string | Shipper's name | Deadpool |
| `email` | YES | string | Shipper's email address | deadpool@chimichanga.com |
| `phone` | YES | integer | Shipper's phone number | 9777777779 |
| `address` | YES | string | Primary address. Max 80 characters | Mutant Facility, Sector 3 |
| `city` | YES | string | City name | Pune |
| `state` | YES | string | State name | Maharashtra |
| `country` | YES | string | Country name | India |
| `pin_code` | YES | integer | PIN code | 110022 |

#### Hyperlocal-Required Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `lat` | YES* | float | Latitude of pickup location | 22.4064 |
| `long` | YES* | float | Longitude of pickup location | 69.0747 |

*Required for Hyperlocal delivery support

#### Optional Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `address_2` | NO | string | Additional address details | House number 34 |
| `address_type` | NO | string | Use "vendor" if different vendor address | vendor |
| `vendor_name` | NO | string | Vendor name (if address_type is vendor) | John |
| `gstin` | NO | string | GSTIN number of vendor | 09XXXCH7409R1XXX |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/settings/company/addpickup' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data-raw '{
    "pickup_location": "Home",
    "name": "Deadpool",
    "email": "deadpool@chimichanga.com",
    "phone": "9777777779",
    "address": "Mutant Facility, Sector 3",
    "address_2": "",
    "city": "Pune",
    "state": "Maharashtra",
    "country": "India",
    "pin_code": "110022",
    "lat": 22.4064,
    "long": 69.0747
}'
```

### Example Response (200 OK)

```json
{
  "success": true,
  "address": {
    "company_id": 25149,
    "pickup_code": "TESTADI",
    "address": "Mutant Facility, Sector 3",
    "address_2": "",
    "address_type": null,
    "city": "South West Delhi",
    "state": "Maharashtra",
    "country": "India",
    "gstin": null,
    "pin_code": "110022",
    "phone": "9777777779",
    "email": "deadpool@chimichanga.com",
    "name": "Deadpool",
    "alternate_phone": null,
    "lat": null,
    "long": null,
    "status": 1,
    "phone_verified": 0,
    "rto_address_id": 1468067,
    "extra_info": "{\"source\":3}",
    "updated_at": "2021-10-12 11:51:48",
    "created_at": "2021-10-12 11:51:48",
    "id": 1856901
  },
  "pickup_id": 1856901,
  "company_name": "ShiprocketTest",
  "full_name": "API"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | True if pickup location added successfully |
| `pickup_id` | integer | Newly created pickup location ID |
| `address` | object | Full address details object |
| `address.pickup_code` | string | Unique code for the pickup location |
| `address.status` | integer | 1 = active, 0 = pending verification |
| `address.phone_verified` | integer | 1 = verified, 0 = not verified |

---

## Best Practices for Hyperlocal Pickup Locations

### 1. Always Include Coordinates

```json
{
  "pickup_location": "Store Front",
  "lat": 28.6139,
  "long": 77.2090,
  ...
}
```

### 2. Use Accurate Coordinates

- Use Google Maps or similar services to get precise lat/long
- Inaccurate coordinates can cause pickup delays

### 3. Phone Verification

- Ensure pickup location phone is verified
- Unverified locations may face delays

### 4. Multiple Locations for Hyperlocal

If you have multiple pickup points for Hyperlocal:

1. Create separate pickup locations for each
2. Include accurate coordinates for each
3. Use descriptive `pickup_location` names

---

## See Also

- [PART1_HYPERLOCAL_COURIERS.md](./PART1_HYPERLOCAL_COURIERS.md) - Hyperlocal courier assignment
- [PART2_HYPERLOCAL_TRACKING.md](./PART2_HYPERLOCAL_TRACKING.md) - Tracking Hyperlocal shipments
