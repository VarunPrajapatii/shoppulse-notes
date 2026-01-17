# Shiprocket API - Part 1: Overview & Authentication

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## Getting Started

### Creating API User

1. Login to Shiprocket account
2. Go to Settings > API > Configure
3. Click "Create an API user"
4. Provide email and password
5. Save credentials for API authentication

---

## API Guidelines

### HTTP Methods

| Method | Description |
|--------|-------------|
| POST | Create new data |
| GET | Read data |
| PATCH | Partial update |
| PUT | Complete update |

### Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

---

## Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 405 | Method Not Allowed |
| 422 | Validation Error |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |
| 502 | Bad Gateway |
| 503 | Service Unavailable |
| 504 | Gateway Timeout |

---

## Webhooks

### Setup
1. Navigate to Settings > API > Webhooks
2. Enable webhooks
3. Enter callback URL
4. Save configuration

### Security
- Verify requests using `x-api-key` header
- Must return HTTP 200 OK

### Sample Webhook Payload

```json
{
  "awb": "141310111111",
  "courier_name": "DELHIVERY",
  "current_status": "Out For Delivery",
  "current_status_id": 17,
  "shipment_status": "OFD - OUT FOR DELIVERY",
  "shipment_status_id": 12,
  "current_timestamp": "2022-03-11 09:35:00",
  "order_id": 22233322,
  "channel_order_id": "123456",
  "awb_assigned_date": "2022-03-10 06:00:00",
  "pickup_date": "2022-03-10 06:00:00",
  "delivered_date": null,
  "rto_initiated_date": null,
  "rto_delivered_date": null,
  "pod": "",
  "pod_link": null,
  "weight": 0.25,
  "sr_weight": 0.25,
  "channel_id": 1111111,
  "company_id": 222222,
  "company_name": "ABC",
  "shipment_id": 55555555,
  "channel_name": "Custom",
  "etd": "2022-03-16 23:59:00",
  "is_return": 0,
  "scans": [
    {
      "location": "Kolkata_ServiceCentre",
      "date": "2022-03-11 09:35:00",
      "activity": "Out for delivery",
      "sr_status": "Out For Delivery",
      "sr_status_label": "OFD - OUT FOR DELIVERY"
    },
    {
      "location": "Kolkata_ServiceCentre",
      "date": "2022-03-11 09:35:00",
      "activity": "Out for delivery",
      "sr_status": "Out For Delivery",
      "sr_status_label": "OFD - OUT FOR DELIVERY"
    }
  ]
}
```

---

## Sense APIs

### RTO Score API
Predicts Return-to-Origin likelihood for addresses.

### Address Validation API
Validates delivery addresses before shipment.

---

## MCP Server

### Available Tools

| Tool | Description |
|------|-------------|
| get_orders | Get Orders from the account |
| get_shipments | Get Shipments from the account |
| create_order | Create Order in the account |
| check_serviceability | Check courier and estimated delivery days |
| get_channels | Get list of channels in the account |
| get_channel_details | Get integration details for channel |
| get_all_pickup_addresses | Get all pickup addresses |
| create_shiprocket_shipment | Create Shiprocket Shipment |
| generate_awb | Generate AWB for the shipment |
| generate_pickup | Generate pickup for shipment |
| track_shipment | Track shipment using AWB |
| get_return_orders | Get return orders list |
| create_return_order | Create a return order |
| cancel_order | Cancel order using order id |

---

## Authentication API

### Generate Token

**Endpoint:** `POST /auth/login`

**URL:** `https://apiv2.shiprocket.in/v1/external/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "your_email@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "created_at": "2019-07-30 05:30:00"
}
```

**cURL Example:**
```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/auth/login' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "user@example.com",
  "password": "password123"
}'
```

**Notes:**
- Token validity: 10 days
- Store token securely
- Use token in Authorization header for all API calls

---

### Token Logout

**Endpoint:** `POST /auth/logout`

**URL:** `https://apiv2.shiprocket.in/v1/external/auth/logout`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Response:** No response body

**cURL Example:**
```bash
curl --location --request POST 'https://apiv2.shiprocket.in/v1/external/auth/logout' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer xxx'
```
