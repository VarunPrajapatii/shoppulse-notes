# PART 3: International Order Management

Documentation for creating and updating international orders in Shiprocket.

---

## Overview

International orders require additional fields compared to domestic orders, including currency, customs information, and export documentation details.

---

## Create International Order

Create an ad-hoc international order for shipping outside India.

### Endpoint

```
POST https://apiv2.shiprocket.in/v1/external/international/orders/create/adhoc
```

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body Parameters

#### Basic Order Details

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `order_id` | Yes | string | Your unique order ID |
| `order_date` | Yes | string | Order date (YYYY-MM-DD) |
| `channel_id` | No | integer | Sales channel ID |
| `billing_customer_name` | Yes | string | Customer name for billing |
| `billing_last_name` | No | string | Customer last name |
| `billing_address` | Yes | string | Billing address line 1 |
| `billing_address_2` | No | string | Billing address line 2 |
| `billing_city` | Yes | string | Billing city |
| `billing_state` | Yes | string | Billing state/province |
| `billing_country` | Yes | string | Billing country |
| `billing_pincode` | Yes | string | Billing postal code |
| `billing_email` | Yes | string | Customer email |
| `billing_phone` | Yes | string | Customer phone (with country code) |

#### Shipping Address

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `shipping_is_billing` | No | boolean | If true, shipping = billing address |
| `shipping_customer_name` | No* | string | Shipping name (*required if shipping_is_billing=false) |
| `shipping_last_name` | No | string | Shipping last name |
| `shipping_address` | No* | string | Shipping address line 1 |
| `shipping_address_2` | No | string | Shipping address line 2 |
| `shipping_city` | No* | string | Shipping city |
| `shipping_state` | No* | string | Shipping state/province |
| `shipping_country` | No* | string | Shipping country (ISO code) |
| `shipping_pincode` | No* | string | Shipping postal code |
| `shipping_email` | No | string | Shipping email |
| `shipping_phone` | No* | string | Shipping phone |

#### Order Items

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `order_items` | Yes | array | Array of order items |
| `order_items[].name` | Yes | string | Item name |
| `order_items[].sku` | Yes | string | Item SKU |
| `order_items[].units` | Yes | integer | Quantity |
| `order_items[].selling_price` | Yes | number | Price per unit |
| `order_items[].hsn` | Yes | string | HSN code for customs |

#### Package Details

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `length` | Yes | number | Package length (cm) |
| `breadth` | Yes | number | Package width (cm) |
| `height` | Yes | number | Package height (cm) |
| `weight` | Yes | number | Package weight (kg) |
| `sub_total` | Yes | number | Order subtotal |
| `shipping_charges` | No | number | Shipping charges |
| `pickup_location` | Yes | string | Registered pickup location name |

#### International-Specific Parameters

| Parameter | Required | Type | Description | Values |
|-----------|----------|------|-------------|--------|
| `currency` | Yes | string | Order currency | `INR`, `USD`, `EUR`, `GBP`, `AUD`, `CAD`, `SAR`, `AED`, `SGD` |
| `reasonOfExport` | Yes | integer | Export reason | `0`=Sale, `1`=Replacement, `2`=Gift, `3`=Sample |
| `purpose_of_shipment` | Yes | integer | Shipment purpose | `0`=Not Applicable, `1`=Personal, `2`=Commercial |
| `igstPaymentStatus` | Yes | string | IGST payment status | `A`=Not Applicable, `B`=LUT/Bond, `C`=IGST Paid |
| `Terms_Of_Invoice` | Yes | string | Incoterms | `FOB`, `CIF` |
| `ioss` | No | string | IOSS number (EU shipments) | EU IOSS registration number |
| `eori` | No | string | EORI number (UK/EU) | Economic Operators Registration ID |
| `commodity` | No | string | Commodity description | General description for customs |
| `mies` | No | string | MEIS code | Merchandise Exports from India Scheme |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/international/orders/create/adhoc' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data-raw '{
    "order_id": "INT-ORD-001",
    "order_date": "2024-01-15",
    "billing_customer_name": "John",
    "billing_last_name": "Doe",
    "billing_address": "123 Main Street",
    "billing_address_2": "Suite 100",
    "billing_city": "New York",
    "billing_state": "NY",
    "billing_country": "US",
    "billing_pincode": "10001",
    "billing_email": "john.doe@email.com",
    "billing_phone": "+12125551234",
    "shipping_is_billing": true,
    "order_items": [
        {
            "name": "Handcrafted Silk Scarf",
            "sku": "SILK-SCARF-001",
            "units": 2,
            "selling_price": 45.00,
            "hsn": "61171000"
        },
        {
            "name": "Brass Decorative Item",
            "sku": "BRASS-DEC-001",
            "units": 1,
            "selling_price": 75.00,
            "hsn": "83062900"
        }
    ],
    "length": 30,
    "breadth": 20,
    "height": 10,
    "weight": 0.8,
    "sub_total": 165.00,
    "shipping_charges": 25.00,
    "pickup_location": "Primary Warehouse",
    "currency": "USD",
    "reasonOfExport": 0,
    "purpose_of_shipment": 2,
    "igstPaymentStatus": "B",
    "Terms_Of_Invoice": "FOB",
    "commodity": "Textile and handicraft items"
}'
```

### Success Response (200 OK)

```json
{
  "status": 1,
  "message": "Order created successfully",
  "order_id": "INT-ORD-001",
  "shiprocket_order_id": 12345678,
  "shipment_id": 98765432,
  "status_code": 1,
  "onboarding_completed_now": 0,
  "awb_code": null,
  "courier_company_id": null,
  "courier_name": null
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | integer | 1 = success, 0 = failure |
| `message` | string | Response message |
| `order_id` | string | Your order ID |
| `shiprocket_order_id` | integer | Shiprocket's internal order ID |
| `shipment_id` | integer | Shipment ID for AWB assignment |
| `status_code` | integer | Order status code |
| `awb_code` | string | AWB if auto-assigned |
| `courier_company_id` | integer | Courier ID if auto-assigned |
| `courier_name` | string | Courier name if auto-assigned |

---

## Update International Order

Update an existing international order before shipment.

### Endpoint

```
POST https://apiv2.shiprocket.in/v1/external/international/orders/update/adhoc
```

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body Parameters

Same as Create Order, with addition of:

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `order_id` | Yes | string | Order ID to update |

> **Note**: You can only update orders that haven't been assigned an AWB yet.

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/international/orders/update/adhoc' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data-raw '{
    "order_id": "INT-ORD-001",
    "order_date": "2024-01-15",
    "billing_customer_name": "John",
    "billing_last_name": "Smith",
    "billing_address": "456 Updated Street",
    "billing_city": "New York",
    "billing_state": "NY",
    "billing_country": "US",
    "billing_pincode": "10002",
    "billing_email": "john.smith@email.com",
    "billing_phone": "+12125559999",
    "shipping_is_billing": true,
    "order_items": [
        {
            "name": "Handcrafted Silk Scarf",
            "sku": "SILK-SCARF-001",
            "units": 3,
            "selling_price": 45.00,
            "hsn": "61171000"
        }
    ],
    "length": 35,
    "breadth": 25,
    "height": 12,
    "weight": 1.0,
    "sub_total": 135.00,
    "shipping_charges": 30.00,
    "pickup_location": "Primary Warehouse",
    "currency": "USD",
    "reasonOfExport": 0,
    "purpose_of_shipment": 2,
    "igstPaymentStatus": "B",
    "Terms_Of_Invoice": "FOB"
}'
```

### Success Response (200 OK)

```json
{
  "status": 1,
  "message": "Order updated successfully",
  "order_id": "INT-ORD-001",
  "shiprocket_order_id": 12345678,
  "shipment_id": 98765432
}
```

---

## International Parameters Reference

### Currency Codes

| Code | Currency |
|------|----------|
| `INR` | Indian Rupee |
| `USD` | US Dollar |
| `EUR` | Euro |
| `GBP` | British Pound |
| `AUD` | Australian Dollar |
| `CAD` | Canadian Dollar |
| `SAR` | Saudi Riyal |
| `AED` | UAE Dirham |
| `SGD` | Singapore Dollar |

### Reason of Export

| Code | Reason |
|------|--------|
| `0` | Sale |
| `1` | Replacement |
| `2` | Gift |
| `3` | Sample |

### Purpose of Shipment

| Code | Purpose |
|------|---------|
| `0` | Not Applicable |
| `1` | Personal |
| `2` | Commercial |

### IGST Payment Status

| Code | Description |
|------|-------------|
| `A` | Not Applicable (non-taxable goods) |
| `B` | LUT or Export under Bond (zero-rated) |
| `C` | Export Against Payment of IGST (pay now, claim refund) |

### Terms of Invoice (Incoterms)

| Term | Description |
|------|-------------|
| `FOB` | Free On Board - Seller delivers to port, buyer handles shipping |
| `CIF` | Cost Insurance Freight - Seller covers shipping to destination |

---

## HSN Codes

HSN (Harmonized System of Nomenclature) codes are mandatory for customs clearance.

### Common HSN Categories

| Category | HSN Range | Example |
|----------|-----------|---------|
| Textiles | 61-63 | Apparel, fabrics |
| Electronics | 84-85 | Phones, computers |
| Jewelry | 71 | Gold, silver, gems |
| Handicrafts | 44, 83, 97 | Wood items, brass, art |
| Cosmetics | 33 | Beauty products |

### Finding HSN Codes

1. **CBIC Website**: https://www.cbic.gov.in/
2. **Shiprocket Dashboard**: Auto-suggest in order creation
3. **Export Documentation**: Your commercial invoice

---

## Error Responses

### Missing Required Fields (400)

```json
{
  "status": 0,
  "message": "Validation failed",
  "errors": {
    "currency": ["The currency field is required."],
    "hsn": ["HSN code is required for international orders."],
    "reasonOfExport": ["The reason of export field is required."]
  }
}
```

### Invalid Currency (400)

```json
{
  "status": 0,
  "message": "Invalid currency code. Supported: INR, USD, EUR, GBP, AUD, CAD, SAR, AED, SGD"
}
```

### Order Already Shipped (400)

```json
{
  "status": 0,
  "message": "Cannot update order. AWB already assigned.",
  "order_status": "SHIPPED"
}
```

### Invalid Country (400)

```json
{
  "status": 0,
  "message": "Invalid shipping country. International shipping not available to this destination."
}
```

---

## Important Notes

1. **HSN Codes**: Required for all items in international orders
2. **Currency**: Once set, currency cannot be changed after order creation
3. **KYC Required**: International KYC must be verified before creating orders
4. **Weight Accuracy**: Actual weight must match declared weight for customs
5. **Dimensions**: Accurate dimensions needed for volumetric weight calculation
6. **Country Codes**: Use ISO 3166-1 alpha-2 codes (US, GB, DE, etc.)
7. **Phone Numbers**: Include country code for international numbers

---

## Best Practices

1. **Complete Information**: Fill all fields accurately for smooth customs clearance
2. **Accurate HSN**: Use correct HSN codes to avoid customs delays
3. **Commercial Invoice**: Details must match order information
4. **Packaging**: Follow international packaging guidelines
5. **Prohibited Items**: Check destination country's restricted items list
6. **Insurance**: Consider shipping insurance for valuable items

---

*Next: [PART4_SHIPMENTS.md](./PART4_SHIPMENTS.md) - Shipment Creation & AWB Assignment*
