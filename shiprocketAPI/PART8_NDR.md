# Shiprocket API Reference - Part 8: NDR (Non-Delivery Report)

## Overview

APIs for managing NDR (Non-Delivery Report) shipments. NDR occurs when a delivery attempt fails and requires action to resolve.

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## 1. Get All NDR Shipments

Retrieve a list of all shipments that have NDR status.

### Endpoint

```
GET /ndr/all
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Query Parameters

| Param | Required | Data Type | Description | Example |
|-------|----------|-----------|-------------|---------|
| `page` | NO | integer | Page number for pagination | 1 |
| `per_page` | NO | integer | Number of records per page | 10 |
| `to` | NO | string | End date filter (YYYY-MM-DD) | 2023-12-31 |
| `from` | NO | string | Start date filter (YYYY-MM-DD) | 2023-01-01 |
| `search` | NO | string | Search by AWB number | 1234567890 |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/ndr/all?page=1&per_page=10' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

```json
{
  "data": [
    {
      "id": 12345,
      "awb": "1234567890",
      "order_id": 67890,
      "shipment_id": 11223,
      "courier_name": "Delhivery",
      "courier_id": 10,
      "customer_name": "John Doe",
      "customer_phone": "9876543210",
      "customer_email": "john@example.com",
      "customer_address": "123 Main Street",
      "customer_city": "Delhi",
      "customer_state": "Delhi",
      "customer_pincode": "110001",
      "product_name": "Test Product",
      "quantity": 1,
      "ndr_status": "action_required",
      "ndr_reason": "Customer not available",
      "attempt_count": 1,
      "last_attempt_date": "2023-12-15",
      "created_at": "2023-12-10",
      "history": [
        {
          "date": "2023-12-15 10:30:00",
          "status": "NDR",
          "remark": "Customer not available"
        }
      ]
    }
  ],
  "meta": {
    "pagination": {
      "total": 100,
      "count": 10,
      "per_page": 10,
      "current_page": 1,
      "total_pages": 10,
      "links": {}
    }
  }
}
```

---

## 2. Get Specific NDR Shipment Details

Retrieve detailed information about a specific NDR shipment using its AWB number.

### Endpoint

```
GET /ndr/{AWB}
```

### Path Parameters

| Param | Required | Data Type | Description |
|-------|----------|-----------|-------------|
| `AWB` | YES | string | The AWB (Air Waybill) number of the shipment |

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/ndr/1234567890' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

```json
{
  "id": 12345,
  "awb": "1234567890",
  "order_id": 67890,
  "shipment_id": 11223,
  "courier_name": "Delhivery",
  "courier_id": 10,
  "customer_name": "John Doe",
  "customer_phone": "9876543210",
  "customer_email": "john@example.com",
  "customer_address": "123 Main Street",
  "customer_city": "Delhi",
  "customer_state": "Delhi",
  "customer_pincode": "110001",
  "product_name": "Test Product",
  "quantity": 1,
  "ndr_status": "action_required",
  "ndr_reason": "Customer not available",
  "attempt_count": 2,
  "last_attempt_date": "2023-12-16",
  "created_at": "2023-12-10",
  "history": [
    {
      "date": "2023-12-16 14:00:00",
      "status": "NDR",
      "remark": "Door locked"
    },
    {
      "date": "2023-12-15 10:30:00",
      "status": "NDR",
      "remark": "Customer not available"
    }
  ]
}
```

---

## 3. Action NDR

Take action on an NDR shipment. You can request a re-attempt, mark as fake attempt, or initiate return.

### Endpoint

```
POST /ndr/{awb}/action
```

### Path Parameters

| Param | Required | Data Type | Description |
|-------|----------|-----------|-------------|
| `awb` | YES | string | The AWB number of the NDR shipment |

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body Parameters

| Param | Required | Data Type | Description | Example |
|-------|----------|-----------|-------------|---------|
| `action` | YES | string | Action to take: `fake-attempt`, `re-attempt`, or `return` | re-attempt |
| `comments` | YES | string | Comments/instructions for the action | Please call before delivery |
| `phone` | NO | string | Updated customer phone number | 9876543210 |
| `proof_audio` | Conditional | string | Audio proof URL (required for fake-attempt) | https://... |
| `proof_image` | Conditional | string | Image proof URL (required for fake-attempt) | https://... |
| `remarks` | Conditional | string | Additional remarks | Customer confirmed availability |
| `address1` | NO | string | Updated address line 1 | 456 New Street |
| `address2` | NO | string | Updated address line 2 | Apt 7B |
| `deferred_date` | NO | string | Preferred delivery date for re-attempt | 2023-12-20 |

### Action Types

| Action | Description |
|--------|-------------|
| `fake-attempt` | Report that the delivery attempt was fake (courier didn't actually attempt) |
| `re-attempt` | Request another delivery attempt |
| `return` | Initiate return to origin (RTO) |

### Example Request - Re-attempt

```bash
curl --location --request POST 'https://apiv2.shiprocket.in/v1/external/ndr/1234567890/action' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
    "action": "re-attempt",
    "comments": "Please call customer 30 mins before delivery",
    "phone": "9876543210",
    "deferred_date": "2023-12-20"
}'
```

### Example Request - Fake Attempt

```bash
curl --location --request POST 'https://apiv2.shiprocket.in/v1/external/ndr/1234567890/action' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
    "action": "fake-attempt",
    "comments": "Courier never called or visited",
    "proof_image": "https://example.com/proof.jpg",
    "remarks": "Customer was home all day"
}'
```

### Example Request - Return

```bash
curl --location --request POST 'https://apiv2.shiprocket.in/v1/external/ndr/1234567890/action' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
    "action": "return",
    "comments": "Customer refused delivery"
}'
```

### Response

**Status Code:** `202 Accepted`

```json
{
  "status": "Action recorded successfully",
  "message": "NDR action has been submitted"
}
```

---

## NDR Best Practices

1. **Monitor NDR Daily**: Check for new NDR shipments daily to take quick action
2. **Customer Communication**: Contact customers to understand delivery issues before taking action
3. **Re-attempt Scheduling**: Use `deferred_date` to schedule re-attempts for customer-convenient times
4. **Documentation**: Always provide detailed comments for audit trail
5. **Fake Attempt Reporting**: Document with proof when reporting fake delivery attempts

## Common NDR Reasons

| Reason | Recommended Action |
|--------|-------------------|
| Customer not available | Re-attempt with deferred date |
| Wrong address | Update address and re-attempt |
| Customer refused | Confirm with customer, then return if needed |
| Phone unreachable | Update phone and re-attempt |
| Address incomplete | Get complete address and re-attempt |
| COD not ready | Re-attempt with advance notice |
