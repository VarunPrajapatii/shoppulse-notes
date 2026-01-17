# PART 4: International Shipment Creation & AWB Assignment

Documentation for creating international shipments and assigning AWB (Air Waybill) numbers.

---

## Overview

After creating an international order, you need to create a shipment and assign an AWB. Shiprocket provides two approaches:

1. **Two-Step Process**: Create order → Assign AWB separately
2. **Wrapper API**: Single API that does everything (order, shipment, pickup, label, manifest)

---

## International Wrapper API (Recommended)

The Wrapper API creates an order, generates a shipment, schedules pickup, generates labels, and creates manifest - all in one call.

### Endpoint

```
POST https://apiv2.shiprocket.in/v1/external/international/shipments/create/forward-shipment
```

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body Parameters

Same parameters as Create Order API, with additional shipment options:

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `courier_id` | No | integer | Preferred courier ID |
| `generate_label` | No | boolean | Auto-generate shipping label |
| `generate_manifest` | No | boolean | Auto-generate manifest |
| `schedule_pickup` | No | boolean | Auto-schedule pickup |
| `pickup_date` | No | string | Pickup date (YYYY-MM-DD) |
| `pickup_time` | No | string | Pickup time slot |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/international/shipments/create/forward-shipment' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data-raw '{
    "order_id": "INT-SHIP-001",
    "order_date": "2024-01-15",
    "billing_customer_name": "Alice",
    "billing_last_name": "Johnson",
    "billing_address": "789 Oak Avenue",
    "billing_city": "London",
    "billing_state": "Greater London",
    "billing_country": "GB",
    "billing_pincode": "SW1A 1AA",
    "billing_email": "alice.johnson@email.co.uk",
    "billing_phone": "+447911123456",
    "shipping_is_billing": true,
    "order_items": [
        {
            "name": "Designer Kurta",
            "sku": "KURTA-001",
            "units": 1,
            "selling_price": 85.00,
            "hsn": "62034200"
        }
    ],
    "length": 40,
    "breadth": 30,
    "height": 5,
    "weight": 0.5,
    "sub_total": 85.00,
    "shipping_charges": 20.00,
    "pickup_location": "Primary Warehouse",
    "currency": "GBP",
    "reasonOfExport": 0,
    "purpose_of_shipment": 2,
    "igstPaymentStatus": "B",
    "Terms_Of_Invoice": "FOB",
    "eori": "GB123456789000",
    "generate_label": true,
    "generate_manifest": true,
    "schedule_pickup": true,
    "pickup_date": "2024-01-16"
}'
```

### Success Response (200 OK)

```json
{
  "status": 1,
  "message": "Shipment created successfully",
  "order_id": "INT-SHIP-001",
  "shiprocket_order_id": 12345678,
  "shipment_id": 98765432,
  "awb_code": "AWB123456789",
  "courier_company_id": 15,
  "courier_name": "DHL Express",
  "label_url": "https://kr-int-shiprocket.s3.amazonaws.com/labels/123456.pdf",
  "manifest_url": "https://kr-int-shiprocket.s3.amazonaws.com/manifests/789012.pdf",
  "pickup_scheduled": true,
  "pickup_token_number": "PKP123456",
  "estimated_delivery_date": "2024-01-25"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | integer | 1 = success |
| `shipment_id` | integer | Shipment identifier |
| `awb_code` | string | Air Waybill tracking number |
| `courier_company_id` | integer | Assigned courier ID |
| `courier_name` | string | Courier company name |
| `label_url` | string | URL to download shipping label |
| `manifest_url` | string | URL to download manifest |
| `pickup_scheduled` | boolean | Pickup scheduling status |
| `pickup_token_number` | string | Pickup request token |
| `estimated_delivery_date` | string | Expected delivery date |

---

## Assign AWB

Manually assign AWB to an international shipment. Use this if you didn't use the Wrapper API.

### Endpoint

```
POST https://apiv2.shiprocket.in/v1/external/international/courier/assign/awb
```

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `shipment_id` | Yes | integer | Shipment ID from order creation |
| `courier_id` | No | integer | Specific courier ID (optional, auto-select if not provided) |
| `status` | No | string | Use `"reassign"` for reassigning AWB |

### Example Request - First Assignment

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/international/courier/assign/awb' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
    "shipment_id": 98765432
}'
```

### Example Request - With Specific Courier

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/international/courier/assign/awb' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
    "shipment_id": 98765432,
    "courier_id": 15
}'
```

### Example Request - Reassign AWB

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/international/courier/assign/awb' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
    "shipment_id": 98765432,
    "status": "reassign"
}'
```

### Success Response (200 OK)

```json
{
  "status": 1,
  "message": "AWB assigned successfully",
  "shipment_id": 98765432,
  "awb_code": "AWB123456789",
  "courier_company_id": 15,
  "courier_name": "DHL Express",
  "applied_weight": 0.5,
  "charged_weight": 0.5,
  "routing_code": "LHR-1"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `awb_code` | string | Assigned AWB number |
| `courier_company_id` | integer | Courier ID |
| `courier_name` | string | Courier name |
| `applied_weight` | number | Weight used for shipping calculation |
| `charged_weight` | number | Actual charged weight (may differ due to volumetric) |
| `routing_code` | string | Courier's internal routing code |

---

## International Couriers

### Common International Courier Partners

| Courier ID | Name | Coverage | Best For |
|------------|------|----------|----------|
| 15 | DHL Express | Global | Premium, time-sensitive |
| 16 | FedEx | Global | Documents, parcels |
| 17 | Aramex | Middle East, Africa | Regional focus |
| 18 | UPS | Global | Heavy shipments |
| 19 | DTDC International | Select countries | Economy |

> **Note**: Available couriers depend on your Shiprocket plan and destination country.

---

## Checking Courier Availability

Before assigning AWB, you can check which couriers are available for your shipment.

### Endpoint

```
GET https://apiv2.shiprocket.in/v1/external/international/courier/serviceability
```

### Query Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `pickup_postcode` | Yes | string | Origin pincode |
| `delivery_postcode` | Yes | string | Destination postal code |
| `delivery_country` | Yes | string | Destination country code |
| `weight` | Yes | number | Package weight (kg) |
| `length` | Yes | number | Length (cm) |
| `breadth` | Yes | number | Breadth (cm) |
| `height` | Yes | number | Height (cm) |
| `cod` | No | integer | 0 for prepaid (default for international) |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/international/courier/serviceability?pickup_postcode=110001&delivery_postcode=10001&delivery_country=US&weight=0.5&length=30&breadth=20&height=10' \
--header 'Authorization: Bearer <token>'
```

### Success Response

```json
{
  "status": 200,
  "data": {
    "available_courier_companies": [
      {
        "courier_company_id": 15,
        "courier_name": "DHL Express",
        "rate": 2450.50,
        "estimated_delivery_days": "5-7",
        "freight_charge": 2200.00,
        "fuel_surcharge": 250.50,
        "cod_charges": 0,
        "is_surface": false,
        "is_air": true
      },
      {
        "courier_company_id": 16,
        "courier_name": "FedEx",
        "rate": 2100.00,
        "estimated_delivery_days": "7-10",
        "freight_charge": 1900.00,
        "fuel_surcharge": 200.00,
        "cod_charges": 0,
        "is_surface": false,
        "is_air": true
      }
    ],
    "currency": "INR"
  }
}
```

---

## Error Responses

### Shipment Not Found (404)

```json
{
  "status": 0,
  "message": "Shipment not found",
  "shipment_id": 98765432
}
```

### AWB Already Assigned (400)

```json
{
  "status": 0,
  "message": "AWB already assigned. Use status='reassign' to reassign.",
  "current_awb": "AWB123456789",
  "courier_name": "DHL Express"
}
```

### No Courier Available (400)

```json
{
  "status": 0,
  "message": "No courier available for this destination",
  "delivery_country": "XX",
  "reason": "Country not serviceable"
}
```

### Invalid Courier ID (400)

```json
{
  "status": 0,
  "message": "Invalid courier_id. Courier not available for this route.",
  "courier_id": 99
}
```

### Weight Exceeded (400)

```json
{
  "status": 0,
  "message": "Package weight exceeds maximum limit for international shipping",
  "max_weight": 30,
  "declared_weight": 35
}
```

---

## Volumetric Weight

International shipments are charged based on the higher of:
- **Actual Weight**: Physical weight of package
- **Volumetric Weight**: (Length × Breadth × Height) / 5000

### Example Calculation

```
Dimensions: 40cm × 30cm × 20cm
Actual Weight: 2 kg

Volumetric Weight = (40 × 30 × 20) / 5000 = 4.8 kg

Charged Weight = max(2, 4.8) = 4.8 kg
```

---

## Important Notes

1. **Wrapper API**: Recommended for most use cases - single call for complete flow
2. **Two-Step**: Use when you need to review rates before assignment
3. **Reassignment**: AWB can be reassigned if pickup hasn't been done
4. **COD**: Not available for international shipments (prepaid only)
5. **Insurance**: Consider adding insurance for high-value shipments
6. **Customs**: Ensure all documentation is correct before assignment

---

## Best Practices

1. **Use Wrapper API**: Simplifies the entire shipping process
2. **Check Serviceability**: Verify courier availability before creating order
3. **Accurate Dimensions**: Volumetric weight affects pricing significantly
4. **Review Rates**: Compare courier rates for cost optimization
5. **Track Status**: Monitor AWB assignment status for confirmation

---

*Next: [PART5_MANIFEST_PICKUP.md](./PART5_MANIFEST_PICKUP.md) - Manifest Generation & Pickup Scheduling*
