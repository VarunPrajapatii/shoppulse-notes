# Shiprocket API Reference - Part 10: Pickup Addresses

## Overview

APIs for managing pickup locations in your Shiprocket account. Pickup addresses are the locations from where shipments will be picked up by the courier.

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## 1. Get All Pickup Locations

Retrieve a list of all pickup locations that have been added to your Shiprocket account.

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

### Example Response

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
| `company_id` | integer | Associated company ID |
| `gstin` | string | GST identification number |
| `vendor_name` | string | Vendor name (if address_type is vendor) |
| `status` | integer | Address status (1=pending, 2=active) |
| `phone_verified` | integer | Phone verification status (0/1) |
| `lat` | string | Latitude coordinate |
| `long` | string | Longitude coordinate |
| `open_time` | string | Facility opening time |
| `close_time` | string | Facility closing time |
| `warehouse_code` | string | Warehouse code |
| `alternate_phone` | string | Alternate phone number |
| `rto_address_id` | integer | Associated RTO address ID |
| `is_primary_location` | integer | Whether this is the primary location (0/1) |

---

## 2. Add a New Pickup Location

Add a new pickup location to your Shiprocket account.

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

| Param | Required | Data Type | Description | Example |
|-------|----------|-----------|-------------|---------|
| `pickup_location` | YES | string | Nickname of the new pickup location (max 36 chars) | Home |
| `name` | YES | string | Shipper's name | Deadpool |
| `email` | YES | string | Shipper's email address | deadpool@chimichanga.com |
| `phone` | YES | integer | Shipper's phone number | 9777777779 |
| `address` | YES | string | Primary address (max 80 chars) | Mutant Facility, Sector 3 |
| `address_2` | NO | string | Additional address details | House number 34 |
| `city` | YES | string | Pickup location city name | Pune |
| `state` | YES | string | Pickup location state name | Maharashtra |
| `country` | YES | string | Pickup location country | India |
| `pin_code` | YES | integer | Pickup location pincode | 110022 |
| `lat` | NO | float | Pickup location latitude | 22.4064 |
| `long` | NO | float | Pickup location longitude | 69.0747 |
| `address_type` | NO | string | Address type (use "vendor" for vendor address) | vendor |
| `vendor_name` | NO | string | Name of vendor (if address_type is vendor) | John |
| `gstin` | NO | string | GSTIN of vendor | 09XXXCH7409R1XXX |

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
    "pin_code": "110022"
}'
```

### Example Response

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
| `success` | boolean | Whether the operation was successful |
| `address` | object | Created address details |
| `pickup_id` | integer | ID of the newly created pickup location |
| `company_name` | string | Associated company name |
| `full_name` | string | User's full name |

### Address Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Pickup location ID |
| `company_id` | integer | Associated company ID |
| `pickup_code` | string | Unique pickup code |
| `address` | string | Primary address |
| `address_2` | string | Secondary address |
| `city` | string | City |
| `state` | string | State |
| `country` | string | Country |
| `pin_code` | string | Postal code |
| `phone` | string | Phone number |
| `email` | string | Email address |
| `name` | string | Contact name |
| `status` | integer | Status (1=pending verification, 2=verified) |
| `phone_verified` | integer | Phone verification status |
| `rto_address_id` | integer | Associated RTO address ID |
| `created_at` | string | Creation timestamp |
| `updated_at` | string | Last update timestamp |

---

## Pickup Address Best Practices

### 1. Address Naming Convention

Use clear, descriptive names for pickup locations:
- `Main Warehouse`
- `Delhi Office`
- `Mumbai Fulfillment Center`

### 2. Required Information

Ensure all required fields are provided accurately:
- Full address with landmark
- Correct PIN code
- Valid phone number
- Working email address

### 3. Phone Verification

- New pickup addresses require phone verification
- Ensure the phone number is reachable for OTP verification
- Verified addresses (status: 2) are ready for use

### 4. Vendor Addresses

For dropshipping or multi-vendor setups:
```json
{
  "pickup_location": "Vendor ABC",
  "address_type": "vendor",
  "vendor_name": "ABC Electronics",
  "gstin": "09XXXCH7409R1XXX",
  // ... other fields
}
```

### 5. Geographic Coordinates

Providing latitude and longitude helps with:
- Accurate pickup scheduling
- Better courier assignment
- Reduced pickup failures

### 6. RTO Address

- Each pickup location has an associated RTO (Return to Origin) address
- By default, returns go to the same address
- Can be configured differently if needed

---

## Address Status Values

| Status | Meaning |
|--------|---------|
| 1 | Pending verification |
| 2 | Active/Verified |

---

## Common Use Cases

### Setting Up Multiple Warehouses

```javascript
// Example: Add warehouse in different city
const newWarehouse = {
  pickup_location: "Mumbai Warehouse",
  name: "John Doe",
  email: "mumbai@company.com",
  phone: "9876543210",
  address: "Plot 123, Industrial Area",
  address_2: "MIDC, Andheri East",
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  pin_code: "400093"
};
```

### Vendor/Dropship Setup

```javascript
// Example: Add vendor pickup location
const vendorAddress = {
  pickup_location: "Vendor XYZ",
  name: "XYZ Supplier",
  email: "supplier@xyz.com",
  phone: "9123456789",
  address: "Factory Unit 5",
  city: "Surat",
  state: "Gujarat",
  country: "India",
  pin_code: "395007",
  address_type: "vendor",
  vendor_name: "XYZ Textiles",
  gstin: "24XXXXX1234X1ZX"
};
```
