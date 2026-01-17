# Shiprocket API - Countries

This section covers APIs for retrieving country codes, zones, and locality details.

---

## 1. Get Country Codes

Retrieve all countries available in the Shiprocket database with their respective IDs and ISO codes.

### Endpoint

```
GET https://apiv2.shiprocket.in/v1/external/countries
```

### Description

Lists all countries present in the Shiprocket database along with:
- Country IDs
- ISO 2 codes (2-letter country codes)
- ISO 3 codes (3-letter country codes)
- ISD codes (international dialing codes)

There are 44 available countries in the database. Use these codes for serviceability checks and dropdown menus.

### Headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <your_token>` |

### Parameters

No parameters required.

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/countries' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "name": "Afghanistan",
      "iso_code_2": "AF",
      "iso_code_3": "AFG",
      "isd_code": "+93",
      "address_format": "",
      "postcode_required": 1,
      "status": 1
    },
    {
      "id": 2,
      "name": "Albania",
      "iso_code_2": "AL",
      "iso_code_3": "ALB",
      "isd_code": "+355",
      "address_format": "",
      "postcode_required": 1,
      "status": 1
    },
    {
      "id": 3,
      "name": "Algeria",
      "iso_code_2": "DZ",
      "iso_code_3": "DZA",
      "isd_code": "+213",
      "address_format": "",
      "postcode_required": 1,
      "status": 1
    }
    // ... more countries
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique country identifier |
| `name` | string | Country name |
| `iso_code_2` | string | ISO 3166-1 alpha-2 code (2 letters) |
| `iso_code_3` | string | ISO 3166-1 alpha-3 code (3 letters) |
| `isd_code` | string | International dialing code |
| `address_format` | string | Address format template |
| `postcode_required` | integer | Whether postcode is required (1=yes, 0=no) |
| `status` | integer | Country status (1=active) |

---

## 2. Get All Zones

Retrieve all zones/states within a specific country.

### Endpoint

```
GET https://apiv2.shiprocket.in/v1/external/countries/show/{country_id}
```

### Description

Get a list of all available zones (states/regions) within a country, including their IDs and details.

### Headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <your_token>` |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `country_id` | integer | YES | The country ID from the Get Country Codes API |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/countries/show/4' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

```json
{
  "status": 200,
  "data": [
    {
      "id": 117,
      "country_id": 4,
      "code": "E",
      "state_code": null,
      "name": "Eastern",
      "status": 1
    },
    {
      "id": 118,
      "country_id": 4,
      "code": "M",
      "state_code": null,
      "name": "Manu'a",
      "status": 1
    },
    {
      "id": 119,
      "country_id": 4,
      "code": "R",
      "state_code": null,
      "name": "Rose Island",
      "status": 1
    },
    {
      "id": 120,
      "country_id": 4,
      "code": "S",
      "state_code": null,
      "name": "Swains Island",
      "status": 1
    },
    {
      "id": 121,
      "country_id": 4,
      "code": "W",
      "state_code": null,
      "name": "Western",
      "status": 1
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique zone identifier |
| `country_id` | integer | Parent country ID |
| `code` | string | Zone code |
| `state_code` | string/null | State code (if applicable) |
| `name` | string | Zone/state name |
| `status` | integer | Zone status (1=active) |

---

## 3. Get Locality Details

Retrieve detailed locality information for a given postcode/pincode.

### Endpoint

```
GET https://apiv2.shiprocket.in/v1/external/open/postcode/details
```

### Description

Get locality details including city, state, and geographic coordinates for any valid postcode.

### Headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <your_token>` |

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `postcode` | integer | YES | The pincode to get locality details for | `110077` |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/open/postcode/details?postcode=110077' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

```json
{
  "success": true,
  "postcode_details": {
    "postcode": "110077",
    "city": "South West Delhi",
    "locality": [
      "Bagdola",
      "Barthal",
      "Palam Extn (Harijan Basti)",
      "Dhulsiras",
      "Raj Nagar - II"
    ],
    "state": "Delhi",
    "state_code": "DL",
    "longitude": "77.399",
    "latitude": "28.2636"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `postcode_details.postcode` | string | The queried postcode |
| `postcode_details.city` | string | City name |
| `postcode_details.locality` | array | List of localities/areas covered by this postcode |
| `postcode_details.state` | string | State name |
| `postcode_details.state_code` | string | State code (2 letters) |
| `postcode_details.longitude` | string | Geographic longitude coordinate |
| `postcode_details.latitude` | string | Geographic latitude coordinate |

---

## Use Cases

### Building Address Forms
Use the country and zone APIs to populate dropdown menus for address selection:
1. Fetch all countries with `GET /countries`
2. On country selection, fetch zones with `GET /countries/show/{country_id}`
3. Validate postcodes with `GET /open/postcode/details`

### Serviceability Checks
Before creating shipments, verify if the destination is serviceable using the locality details API to validate postcodes.

### Autofill Address
When a user enters a postcode, automatically fill in city, state, and locality information using the locality details API.
