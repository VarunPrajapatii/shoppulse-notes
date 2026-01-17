# PART 5: Manifest Generation & Pickup Scheduling

Documentation for generating manifests and scheduling pickups for international shipments.

---

## Overview

After AWB assignment, you need to:
1. **Generate Manifest** - Official handover document for the courier
2. **Schedule Pickup** - Request courier to collect the package

Both can be done automatically via the Wrapper API, or manually using these endpoints.

---

## Generate Manifest

Create a manifest document that serves as official proof of handover to the courier.

### Endpoint

```
POST https://apiv2.shiprocket.in/v1/external/international/manifests/generate
```

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `shipment_id` | Yes | array | Array of shipment IDs to include in manifest |
| `status` | No | string | Use `"retry"` for regenerating failed manifests |

### Example Request - Single Shipment

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/international/manifests/generate' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
    "shipment_id": [98765432]
}'
```

### Example Request - Multiple Shipments

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/international/manifests/generate' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
    "shipment_id": [98765432, 98765433, 98765434]
}'
```

### Example Request - Retry Failed Manifest

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/international/manifests/generate' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
    "shipment_id": [98765432],
    "status": "retry"
}'
```

### Success Response (200 OK)

```json
{
  "status": 1,
  "message": "Manifest generated successfully",
  "manifest_id": 12345,
  "manifest_url": "https://kr-int-shiprocket.s3.amazonaws.com/manifests/12345.pdf",
  "shipments_included": 3,
  "generated_at": "2024-01-15T10:30:00Z"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | integer | 1 = success |
| `manifest_id` | integer | Unique manifest identifier |
| `manifest_url` | string | URL to download manifest PDF |
| `shipments_included` | integer | Number of shipments in manifest |
| `generated_at` | string | Timestamp of generation |

---

## Generate Pickup

Schedule a pickup request for the courier to collect shipments.

### Endpoint

```
POST https://apiv2.shiprocket.in/v1/external/courier/generate/pickup
```

> **Note**: This endpoint is shared between domestic and international shipments.

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `shipment_id` | Yes | array | Array of shipment IDs |
| `status` | No | string | Use `"retry"` for rescheduling failed pickups |
| `pickup_date` | No | string | Preferred pickup date (YYYY-MM-DD) |
| `pickup_time` | No | string | Preferred time slot |

### Available Pickup Time Slots

| Slot | Time Range |
|------|------------|
| `morning` | 9:00 AM - 12:00 PM |
| `afternoon` | 12:00 PM - 3:00 PM |
| `evening` | 3:00 PM - 6:00 PM |

### Example Request - Basic Pickup

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/generate/pickup' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
    "shipment_id": [98765432]
}'
```

### Example Request - With Preferred Time

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/generate/pickup' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
    "shipment_id": [98765432, 98765433],
    "pickup_date": "2024-01-16",
    "pickup_time": "morning"
}'
```

### Example Request - Retry Pickup

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/generate/pickup' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
    "shipment_id": [98765432],
    "status": "retry"
}'
```

### Success Response (200 OK)

```json
{
  "status": 1,
  "message": "Pickup scheduled successfully",
  "pickup_token_number": "PKP123456789",
  "pickup_scheduled_date": "2024-01-16",
  "pickup_time_slot": "09:00 AM - 12:00 PM",
  "pickup_location": "Primary Warehouse",
  "shipments_count": 2,
  "courier_name": "DHL Express"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `pickup_token_number` | string | Unique pickup request ID |
| `pickup_scheduled_date` | string | Confirmed pickup date |
| `pickup_time_slot` | string | Confirmed time slot |
| `pickup_location` | string | Pickup address name |
| `shipments_count` | integer | Number of shipments |
| `courier_name` | string | Courier handling pickup |

---

## Cancel Pickup

Cancel a scheduled pickup request.

### Endpoint

```
POST https://apiv2.shiprocket.in/v1/external/courier/cancel/pickup
```

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `pickup_token_number` | Yes | string | Pickup token to cancel |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/cancel/pickup' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
    "pickup_token_number": "PKP123456789"
}'
```

### Success Response (200 OK)

```json
{
  "status": 1,
  "message": "Pickup cancelled successfully"
}
```

---

## Manifest Contents

A manifest document typically contains:

### Header Information
- Manifest ID / Reference Number
- Generation Date & Time
- Seller Details (Name, Address, GSTIN)
- Courier Partner Name

### Shipment Details Table
| Column | Description |
|--------|-------------|
| AWB Number | Air Waybill tracking number |
| Order ID | Your reference order ID |
| Customer Name | Destination recipient |
| Destination | City, Country |
| Weight | Charged weight |
| Pieces | Number of boxes |
| Product | Item description |
| Value | Declared value |

### Footer
- Total Shipments Count
- Signature Area (Seller & Courier)
- Terms & Conditions

---

## Error Responses

### Shipment Not Ready (400)

```json
{
  "status": 0,
  "message": "Cannot generate manifest. AWB not assigned.",
  "shipment_id": 98765432,
  "current_status": "PENDING"
}
```

### Manifest Already Generated (400)

```json
{
  "status": 0,
  "message": "Manifest already generated for this shipment",
  "manifest_id": 12345,
  "manifest_url": "https://kr-int-shiprocket.s3.amazonaws.com/manifests/12345.pdf"
}
```

### Pickup Already Scheduled (400)

```json
{
  "status": 0,
  "message": "Pickup already scheduled",
  "pickup_token_number": "PKP123456789",
  "scheduled_date": "2024-01-16"
}
```

### Invalid Shipment Status (400)

```json
{
  "status": 0,
  "message": "Shipment not eligible for pickup",
  "shipment_id": 98765432,
  "reason": "Shipment already picked up"
}
```

### Pickup Time Expired (400)

```json
{
  "status": 0,
  "message": "Pickup time slot not available. Select a future date.",
  "pickup_date": "2024-01-14",
  "current_date": "2024-01-15"
}
```

---

## International Shipping Workflow

### Complete Flow Summary

```
1. KYC Verification (one-time)
   └── Submit documents via /international/settings/international_kyc

2. Create Order
   └── POST /international/orders/create/adhoc
   └── Returns: order_id, shipment_id

3. Check Courier Availability (optional)
   └── GET /international/courier/serviceability
   └── Returns: available couriers with rates

4. Assign AWB
   └── POST /international/courier/assign/awb
   └── Returns: awb_code, courier details

5. Generate Manifest
   └── POST /international/manifests/generate
   └── Returns: manifest_url

6. Schedule Pickup
   └── POST /courier/generate/pickup
   └── Returns: pickup_token_number

7. Track Shipment
   └── GET /courier/track/awb/{awb_code}
   └── Returns: tracking events
```

### Using Wrapper API (Simplified)

```
1. KYC Verification (one-time)

2. Create Complete Shipment
   └── POST /international/shipments/create/forward-shipment
   └── Returns: order_id, shipment_id, awb_code, label_url, manifest_url, pickup details
   └── (Steps 2-6 done in single call)

3. Track Shipment
   └── GET /courier/track/awb/{awb_code}
```

---

## Best Practices

### Manifest Generation
1. **Group Shipments**: Generate manifest for multiple shipments together
2. **Same Courier**: Only group shipments with same courier
3. **Print Before Pickup**: Have manifest ready when courier arrives
4. **Keep Records**: Store manifest PDFs for your records

### Pickup Scheduling
1. **Advance Booking**: Schedule pickup at least 1 day in advance
2. **Cutoff Times**: Be aware of courier cutoff times
3. **Accurate Address**: Ensure pickup location is correct
4. **Package Ready**: Have packages packed and labeled before pickup

### International Specific
1. **Documentation**: Ensure commercial invoice is attached
2. **Customs Forms**: Verify all customs documentation
3. **Package Labeling**: AWB and customs forms clearly visible
4. **Prohibited Items**: Verify items are allowed in destination country

---

## Quick Reference

### API Endpoints Summary

| Action | Method | Endpoint |
|--------|--------|----------|
| Generate Manifest | POST | `/international/manifests/generate` |
| Generate Pickup | POST | `/courier/generate/pickup` |
| Cancel Pickup | POST | `/courier/cancel/pickup` |

### Status Codes

| Code | Description |
|------|-------------|
| `1` | Success |
| `0` | Failure |

### Common Issues

| Issue | Solution |
|-------|----------|
| "AWB not assigned" | Assign AWB before manifest |
| "Pickup already scheduled" | Check existing pickup token |
| "Invalid shipment" | Verify shipment_id exists |
| "Time slot expired" | Select future date/time |

---

*End of International API Documentation*

*Return to: [README.md](./README.md) - International API Overview*
