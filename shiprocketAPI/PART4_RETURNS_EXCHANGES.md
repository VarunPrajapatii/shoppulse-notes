# Shiprocket API - Part 4: Returns & Exchanges

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

## Table of Contents

- [Overview](#overview)
- [Return Reason Codes](#return-reason-codes)
- [Create Return Order](#create-return-order)
- [Create Exchange Order](#create-exchange-order)
- [Update Return Order](#update-return-order)
- [Get All Return Orders](#get-all-return-orders)
- [Check Courier Serviceability for Returns](#check-courier-serviceability-for-returns)
- [Generate AWB for Return Shipment](#generate-awb-for-return-shipment)

---

## Overview

Use these APIs to manage return and exchange orders. Return orders allow customers to send products back to the seller, while exchange orders facilitate replacing products with different items or variants.

---

## Return Reason Codes

Use these codes with the `return_reason` parameter when creating return orders.

| CODE | REASON |
|------|--------|
| 1 | Not satisfied with Product Performance |
| 2 | Late Delivery |
| 3 | Quality Issue |
| 4 | Incomplete items |
| 5 | Color/Pattern mismatch |
| 6 | Wrong product received |
| 7 | Inadequate packaging |
| 8 | Size issue - large |
| 9 | Size issue - small |
| 10 | Damaged/defective product |
| 11 | Part missing |
| 12 | Product not as described |
| 13 | Customer changed mind |
| 14 | Duplicate order |
| 15 | Product doesn't fit |
| 16 | Manufacturing defect |
| 17 | Expired product |
| 18 | Fake product |
| 19 | Warranty issue |
| 20 | Exchange for different color |
| 21 | Exchange for different size |
| 22 | Exchange for different product |
| 23 | Better price available |
| 24 | Product not needed anymore |
| 25 | Found cheaper elsewhere |
| 26 | Allergic reaction |
| 27 | Not as shown in images |
| 28 | Poor packaging |
| 29 | Seal broken |
| 30 | Missing accessories |
| 31 | Wrong quantity |
| 32 | Gift recipient didn't like |
| 33 | Installation issues |
| 34 | Compatibility issues |
| 35 | Functionality not working |
| 36 | Bad smell/odor |
| 37 | Material quality poor |
| 38 | Stitching issues |
| 39 | Print quality poor |
| 40 | Software issues |
| 41 | Hardware issues |
| 42 | Battery issues |
| 43 | Connectivity issues |
| 44 | Other |

---

## Create Return Order

**Endpoint:** `POST /orders/create/return`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/create/return`

**Description:** Create a return order for picking up products from the customer and delivering them back to the seller's warehouse.

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer `<token>` |

### Parameters

| PARAM | REQUIRED | TYPE | DESCRIPTION | EXAMPLE |
|-------|----------|------|-------------|---------|
| `order_id` | YES | string | Unique order ID (max 50 chars) | 224-RET-001 |
| `order_date` | YES | string | Format: yyyy-mm-dd HH:mm | 2019-08-05 11:00 |
| `channel_id` | NO | integer | Channel ID for order assignment | 27022 |
| `pickup_customer_name` | YES | string | Customer name for pickup | John Doe |
| `pickup_last_name` | NO | string | Customer last name | Doe |
| `pickup_address` | YES | string | Customer address for pickup | 123 Main Street |
| `pickup_address_2` | NO | string | Additional address | Apt 4B |
| `pickup_city` | YES | string | Pickup city | Mumbai |
| `pickup_state` | YES | string | Pickup state | Maharashtra |
| `pickup_country` | YES | string | Pickup country | India |
| `pickup_pincode` | YES | integer | Pickup pincode | 400001 |
| `pickup_email` | YES | string | Customer email | john@example.com |
| `pickup_phone` | YES | integer | Customer phone | 9876543210 |
| `pickup_isd_code` | NO | string | ISD code | +91 |
| `shipping_customer_name` | YES | string | Warehouse/seller name | My Warehouse |
| `shipping_last_name` | NO | string | Warehouse contact last name | Admin |
| `shipping_address` | YES | string | Warehouse address | Industrial Area, Plot 5 |
| `shipping_address_2` | NO | string | Additional address | Building B |
| `shipping_city` | YES | string | Warehouse city | Delhi |
| `shipping_state` | YES | string | Warehouse state | Delhi |
| `shipping_country` | YES | string | Warehouse country | India |
| `shipping_pincode` | YES | integer | Warehouse pincode | 110002 |
| `shipping_email` | NO | string | Warehouse email | warehouse@company.com |
| `shipping_phone` | YES | integer | Warehouse phone | 9876543211 |
| `order_items` | YES | array | Array of items to return | - |
| `order_items[].name` | YES | string | Product name | Tennis Ball |
| `order_items[].sku` | YES | string | Product SKU | ball123 |
| `order_items[].units` | YES | integer | Number of units | 1 |
| `order_items[].selling_price` | YES | float | Price per unit | 10.00 |
| `order_items[].discount` | NO | float | Discount amount | 0 |
| `order_items[].qc_enable` | NO | boolean | Enable QC for this item | true |
| `order_items[].qc_color` | NO | string | QC - Expected color | Green |
| `order_items[].qc_brand` | NO | string | QC - Expected brand | Wilson |
| `order_items[].qc_size` | NO | string | QC - Expected size | Standard |
| `order_items[].qc_product_name` | NO | string | QC - Product name verification | Tennis Ball |
| `order_items[].qc_product_image` | NO | string | QC - Product image URL | https://example.com/image.jpg |
| `order_items[].qc_ean_barcode` | NO | string | QC - EAN barcode | 1234567890123 |
| `order_items[].hsn` | NO | string | HSN code | 4412 |
| `payment_method` | YES | string | COD or Prepaid | prepaid |
| `sub_total` | YES | float | Order subtotal | 10.00 |
| `length` | YES | float | Package length in cm | 10 |
| `breadth` | YES | float | Package breadth in cm | 15 |
| `height` | YES | float | Package height in cm | 20 |
| `weight` | YES | float | Package weight in kg | 1 |
| `return_reason` | NO | integer | Return reason code (1-44) | 3 |

### Request Body

```json
{
  "order_id": "997119978",
  "order_date": "2019-08-05",
  "channel_id": 76893,
  "pickup_customer_name": "Jax",
  "pickup_last_name": "Doe",
  "pickup_address": "123 Main Street",
  "pickup_address_2": "",
  "pickup_city": "Varanasi",
  "pickup_state": "Uttar Pradesh",
  "pickup_country": "India",
  "pickup_pincode": 220022,
  "pickup_email": "jax@tank.com",
  "pickup_phone": 8888888888,
  "pickup_isd_code": "+91",
  "shipping_customer_name": "My Warehouse",
  "shipping_last_name": "",
  "shipping_address": "Home",
  "shipping_address_2": "",
  "shipping_city": "Delhi",
  "shipping_state": "Delhi",
  "shipping_country": "India",
  "shipping_pincode": 110002,
  "shipping_email": "warehouse@company.com",
  "shipping_phone": 8888888889,
  "order_items": [
    {
      "name": "Tennis Ball",
      "sku": "ball123",
      "units": 1,
      "selling_price": 10,
      "discount": 0,
      "qc_enable": true,
      "qc_color": "Green",
      "qc_brand": "Wilson",
      "qc_size": "Standard",
      "qc_product_name": "Tennis Ball",
      "qc_product_image": "https://example.com/ball.jpg",
      "hsn": "4412"
    }
  ],
  "payment_method": "prepaid",
  "sub_total": 10,
  "length": 10,
  "breadth": 15,
  "height": 20,
  "weight": 1,
  "return_reason": 3
}
```

### Example Request (cURL)

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/create/return' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data-raw '{
  "order_id": "997119978",
  "order_date": "2019-08-05",
  "channel_id": 76893,
  "pickup_customer_name": "Jax",
  "pickup_last_name": "Doe",
  "pickup_address": "123 Main Street",
  "pickup_city": "Varanasi",
  "pickup_state": "Uttar Pradesh",
  "pickup_country": "India",
  "pickup_pincode": 220022,
  "pickup_email": "jax@tank.com",
  "pickup_phone": 8888888888,
  "shipping_customer_name": "My Warehouse",
  "shipping_address": "Home",
  "shipping_city": "Delhi",
  "shipping_state": "Delhi",
  "shipping_country": "India",
  "shipping_pincode": 110002,
  "shipping_phone": 8888888889,
  "order_items": [
    {
      "name": "Tennis Ball",
      "sku": "ball123",
      "units": 1,
      "selling_price": 10,
      "hsn": "4412"
    }
  ],
  "payment_method": "prepaid",
  "sub_total": 10,
  "length": 10,
  "breadth": 15,
  "height": 20,
  "weight": 1
}'
```

### Response (200 OK)

```json
{
  "order_id": 16525924,
  "shipment_id": 16370752,
  "status": "RETURN PENDING",
  "status_code": 21,
  "onboarding_completed_now": 0,
  "awb_code": "",
  "courier_company_id": "",
  "courier_name": ""
}
```

---

## Create Exchange Order

**Endpoint:** `POST /orders/create/exchange`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/create/exchange`

**Description:** Create an exchange order where products are picked up from the customer and different/replacement products are delivered back.

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer `<token>` |

### Parameters

| PARAM | REQUIRED | TYPE | DESCRIPTION | EXAMPLE |
|-------|----------|------|-------------|---------|
| `order_id` | YES | string | Unique order ID | 224-EXC-001 |
| `order_date` | YES | string | Format: yyyy-mm-dd HH:mm | 2019-08-05 11:00 |
| `channel_id` | NO | integer | Channel ID | 27022 |
| `buyer_pickup_name` | YES | string | Customer name (pickup location) | John Doe |
| `buyer_pickup_address` | YES | string | Customer address | 123 Main Street |
| `buyer_pickup_address_2` | NO | string | Additional address | Apt 4B |
| `buyer_pickup_city` | YES | string | Customer city | Mumbai |
| `buyer_pickup_state` | YES | string | Customer state | Maharashtra |
| `buyer_pickup_country` | YES | string | Customer country | India |
| `buyer_pickup_pincode` | YES | integer | Customer pincode | 400001 |
| `buyer_pickup_email` | YES | string | Customer email | john@example.com |
| `buyer_pickup_phone` | YES | integer | Customer phone | 9876543210 |
| `buyer_shipping_name` | YES | string | Customer name (delivery location) | John Doe |
| `buyer_shipping_address` | YES | string | Delivery address | 123 Main Street |
| `buyer_shipping_address_2` | NO | string | Additional address | Apt 4B |
| `buyer_shipping_city` | YES | string | Delivery city | Mumbai |
| `buyer_shipping_state` | YES | string | Delivery state | Maharashtra |
| `buyer_shipping_country` | YES | string | Delivery country | India |
| `buyer_shipping_pincode` | YES | integer | Delivery pincode | 400001 |
| `buyer_shipping_email` | NO | string | Delivery email | john@example.com |
| `buyer_shipping_phone` | YES | integer | Delivery phone | 9876543210 |
| `order_items` | YES | array | Array of items | - |
| `order_items[].name` | YES | string | Product name | T-Shirt |
| `order_items[].sku` | YES | string | Product SKU | tshirt123 |
| `order_items[].units` | YES | integer | Units to return | 1 |
| `order_items[].selling_price` | YES | float | Price per unit | 500 |
| `order_items[].exchange_item_name` | YES | string | Replacement product name | T-Shirt Blue |
| `order_items[].exchange_item_sku` | YES | string | Replacement SKU | tshirt456 |
| `order_items[].exchange_item_units` | YES | integer | Replacement units | 1 |
| `order_items[].exchange_item_price` | YES | float | Replacement price | 500 |
| `payment_method` | YES | string | COD or Prepaid | prepaid |
| `sub_total` | YES | float | Order subtotal | 500 |
| `return_length` | YES | float | Return package length in cm | 30 |
| `return_breadth` | YES | float | Return package breadth in cm | 25 |
| `return_height` | YES | float | Return package height in cm | 5 |
| `return_weight` | YES | float | Return package weight in kg | 0.5 |
| `exchange_length` | YES | float | Exchange package length in cm | 30 |
| `exchange_breadth` | YES | float | Exchange package breadth in cm | 25 |
| `exchange_height` | YES | float | Exchange package height in cm | 5 |
| `exchange_weight` | YES | float | Exchange package weight in kg | 0.5 |
| `return_reason` | NO | integer | Return reason code (1-44) | 21 |

### Request Body

```json
{
  "order_id": "EXC-997119978",
  "order_date": "2019-08-05",
  "channel_id": 76893,
  "buyer_pickup_name": "John Doe",
  "buyer_pickup_address": "123 Main Street",
  "buyer_pickup_address_2": "",
  "buyer_pickup_city": "Mumbai",
  "buyer_pickup_state": "Maharashtra",
  "buyer_pickup_country": "India",
  "buyer_pickup_pincode": 400001,
  "buyer_pickup_email": "john@example.com",
  "buyer_pickup_phone": 9876543210,
  "buyer_shipping_name": "John Doe",
  "buyer_shipping_address": "123 Main Street",
  "buyer_shipping_address_2": "",
  "buyer_shipping_city": "Mumbai",
  "buyer_shipping_state": "Maharashtra",
  "buyer_shipping_country": "India",
  "buyer_shipping_pincode": 400001,
  "buyer_shipping_email": "john@example.com",
  "buyer_shipping_phone": 9876543210,
  "order_items": [
    {
      "name": "T-Shirt Red",
      "sku": "tshirt-red-m",
      "units": 1,
      "selling_price": 500,
      "exchange_item_name": "T-Shirt Red",
      "exchange_item_sku": "tshirt-red-l",
      "exchange_item_units": 1,
      "exchange_item_price": 500
    }
  ],
  "payment_method": "prepaid",
  "sub_total": 500,
  "return_length": 30,
  "return_breadth": 25,
  "return_height": 5,
  "return_weight": 0.5,
  "exchange_length": 30,
  "exchange_breadth": 25,
  "exchange_height": 5,
  "exchange_weight": 0.5,
  "return_reason": 21
}
```

### Example Request (cURL)

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/create/exchange' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data-raw '{
  "order_id": "EXC-997119978",
  "order_date": "2019-08-05",
  "buyer_pickup_name": "John Doe",
  "buyer_pickup_address": "123 Main Street",
  "buyer_pickup_city": "Mumbai",
  "buyer_pickup_state": "Maharashtra",
  "buyer_pickup_country": "India",
  "buyer_pickup_pincode": 400001,
  "buyer_pickup_email": "john@example.com",
  "buyer_pickup_phone": 9876543210,
  "buyer_shipping_name": "John Doe",
  "buyer_shipping_address": "123 Main Street",
  "buyer_shipping_city": "Mumbai",
  "buyer_shipping_state": "Maharashtra",
  "buyer_shipping_country": "India",
  "buyer_shipping_pincode": 400001,
  "buyer_shipping_phone": 9876543210,
  "order_items": [
    {
      "name": "T-Shirt Red",
      "sku": "tshirt-red-m",
      "units": 1,
      "selling_price": 500,
      "exchange_item_name": "T-Shirt Red",
      "exchange_item_sku": "tshirt-red-l",
      "exchange_item_units": 1,
      "exchange_item_price": 500
    }
  ],
  "payment_method": "prepaid",
  "sub_total": 500,
  "return_length": 30,
  "return_breadth": 25,
  "return_height": 5,
  "return_weight": 0.5,
  "exchange_length": 30,
  "exchange_breadth": 25,
  "exchange_height": 5,
  "exchange_weight": 0.5
}'
```

### Response (200 OK)

```json
{
  "order_id": 16525930,
  "shipment_id": 16370758,
  "status": "EXCHANGE PENDING",
  "status_code": 53,
  "awb_code": "",
  "courier_company_id": "",
  "courier_name": ""
}
```

---

## Update Return Order

**Endpoint:** `POST /orders/edit`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/edit`

**Description:** Update an existing return order. You can update product details or warehouse address.

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer `<token>` |

### Parameters

| PARAM | REQUIRED | TYPE | DESCRIPTION | EXAMPLE |
|-------|----------|------|-------------|---------|
| `action` | YES | string | Type of update: `product_details` or `warehouse_address` | product_details |
| `id` | YES | integer | Shiprocket order ID | 16525924 |

**For action = `product_details`:**

| PARAM | REQUIRED | TYPE | DESCRIPTION | EXAMPLE |
|-------|----------|------|-------------|---------|
| `products` | YES | array | Updated product list | - |
| `products[].id` | YES | integer | Product ID in order | 19192381 |
| `products[].name` | YES | string | Product name | Tennis Ball Pro |
| `products[].quantity` | YES | integer | Quantity | 2 |
| `length` | NO | float | Updated length in cm | 15 |
| `breadth` | NO | float | Updated breadth in cm | 20 |
| `height` | NO | float | Updated height in cm | 25 |
| `weight` | NO | float | Updated weight in kg | 1.5 |

**For action = `warehouse_address`:**

| PARAM | REQUIRED | TYPE | DESCRIPTION | EXAMPLE |
|-------|----------|------|-------------|---------|
| `shipping_customer_name` | YES | string | Warehouse name | New Warehouse |
| `shipping_address` | YES | string | Address | Plot 10, Industrial Area |
| `shipping_city` | YES | string | City | Gurgaon |
| `shipping_state` | YES | string | State | Haryana |
| `shipping_pincode` | YES | integer | Pincode | 122001 |
| `shipping_phone` | YES | integer | Phone | 9876543212 |

### Request Body - Update Product Details

```json
{
  "action": "product_details",
  "id": 16525924,
  "products": [
    {
      "id": 19192381,
      "name": "Tennis Ball Pro",
      "quantity": 2
    }
  ],
  "length": 15,
  "breadth": 20,
  "height": 25,
  "weight": 1.5
}
```

### Request Body - Update Warehouse Address

```json
{
  "action": "warehouse_address",
  "id": 16525924,
  "shipping_customer_name": "New Warehouse",
  "shipping_address": "Plot 10, Industrial Area",
  "shipping_city": "Gurgaon",
  "shipping_state": "Haryana",
  "shipping_pincode": 122001,
  "shipping_phone": 9876543212
}
```

### Example Request (cURL)

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/edit' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "action": "product_details",
  "id": 16525924,
  "products": [
    {
      "id": 19192381,
      "name": "Tennis Ball Pro",
      "quantity": 2
    }
  ],
  "weight": 1.5
}'
```

### Response (200 OK)

```json
{
  "message": "Order updated successfully",
  "order_id": 16525924
}
```

---

## Get All Return Orders

**Endpoint:** `GET /orders/processing/return`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/processing/return`

**Description:** Get a paginated list of all return orders in processing status.

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer `<token>` |

### Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `page` | NO | integer | Page number to display | 1 |
| `per_page` | NO | integer | Number of orders per page | 2 |
| `to` | NO | string | End date for filtering (YYYY-MM-DD) | 2019-08-04 |
| `from` | NO | string | Start date for filtering (YYYY-MM-DD) | 2019-08-05 |

### Example Request (cURL)

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/processing/return?page=1&per_page=10' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Response (200 OK)

```json
{
  "data": [
    {
      "id": 16525924,
      "channel_id": 76893,
      "channel_name": "CUSTOM",
      "base_channel_code": "CS",
      "channel_order_id": "997119978",
      "customer_name": "Jax Doe",
      "customer_email": "jax@tank.com",
      "customer_phone": "8888888888",
      "customer_pincode": "220022",
      "pickup_code": "110002",
      "pickup_location": "Home ,Home ,Delhi ,New Delhi ,India",
      "payment_status": "",
      "total": "10.00",
      "expedited": 0,
      "sla": "2 days",
      "shipping_method": "SR",
      "status": "RETURN PENDING",
      "status_code": 21,
      "payment_method": "prepaid",
      "is_international": 0,
      "purpose_of_shipment": 0,
      "channel_created_at": "5 Aug 2019, 12:00 AM",
      "created_at": "5 Aug 2019, 03:53 PM",
      "products": [
        {
          "id": 19192381,
          "name": "Tennis Ball",
          "channel_sku": "ball123",
          "channel_order_product_id": "19192381",
          "quantity": 1,
          "product_id": 17949825,
          "sku": "ball123",
          "custom_field": "",
          "custom_field_value": "",
          "status": "UNDEFINED",
          "hsn": "4412"
        }
      ],
      "delivery_code": "220022",
      "cod": 0,
      "shipment_id": 16370752,
      "in_queue": 0,
      "shipments": [
        {
          "isd_code": "+91",
          "courier": "",
          "sr_courier_id": "",
          "weight": "1",
          "length": "10",
          "breadth": "15",
          "height": "20",
          "volumetric_weight": 0.6,
          "awb": ""
        }
      ]
    }
  ],
  "meta": {
    "pagination": {
      "total": 16,
      "count": 15,
      "per_page": 1,
      "current_page": 1,
      "total_pages": 2,
      "links": {
        "next": "https://apiv2.shiprocket.in/v1/external/orders/processing/return?page=2"
      }
    }
  }
}
```

### Response Headers

| Header | Value |
|--------|-------|
| Cache-Control | private, must-revalidate |
| Content-Encoding | gzip |
| Content-Type | application/json |
| X-RateLimit-Limit | 180 |
| X-RateLimit-Remaining | 179 |

---

## Check Courier Serviceability for Returns

**Endpoint:** `GET /courier/serviceability/`

**URL:** `https://apiv2.shiprocket.in/v1/external/courier/serviceability/`

**Description:** Check the availability of couriers between pickup and delivery postal codes for return shipments. Returns estimated delivery time, rates, and courier IDs.

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer `<token>` |

### Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `pickup_postcode` | YES | integer | Pickup pincode (customer location) | 400001 |
| `delivery_postcode` | YES | integer | Delivery pincode (warehouse location) | 110002 |
| `order_id` | CONDITIONAL | integer | Existing order ID (if provided, cod and weight not required) | 16525924 |
| `cod` | CONDITIONAL | boolean | 1 for COD, 0 for Prepaid (required if no order_id) | 0 |
| `weight` | CONDITIONAL | string | Shipment weight in kgs (required if no order_id) | 1 |
| `length` | NO | integer | Shipment length in cm | 10 |
| `breadth` | NO | integer | Shipment breadth in cm | 15 |
| `height` | NO | integer | Shipment height in cm | 20 |
| `declared_value` | NO | integer | Order value in rupees | 500 |
| `mode` | NO | string | Mode of travel: Surface or Air | Surface |
| `is_return` | YES | integer | Set to 1 for return orders | 1 |
| `qc_check` | NO | integer | Filter QC-enabled couriers (1 to include) | 1 |

### Notes

- Either `order_id` OR both `cod` and `weight` are required
- For return orders, always set `is_return` to 1
- Use `qc_check` to filter couriers that support Quality Check at pickup

### Example Request (cURL)

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=400001&delivery_postcode=110002&weight=1&cod=0&is_return=1' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

---

## Generate AWB for Return Shipment

**Endpoint:** `POST /courier/assign/awb`

**URL:** `https://apiv2.shiprocket.in/v1/external/courier/assign/awb`

**Description:** Assign an AWB (Air Waybill Number) to a return shipment. The AWB is a unique tracking number for the shipment.

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer `<token>` |

### Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `shipment_id` | YES | integer | The shipment ID of the return order | 16370752 |
| `courier_id` | NO | integer | Courier ID to assign. Default courier used if not specified | 10 |
| `status` | NO | string | Use "reassign" to change courier (once per 24 hours) | reassign |
| `is_return` | YES | integer | Must be 1 for return shipments | 1 |

### Request Body

```json
{
  "shipment_id": 16370752,
  "courier_id": 10,
  "is_return": 1
}
```

### Example Request (cURL)

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/assign/awb' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "shipment_id": 16370752,
  "courier_id": 10,
  "is_return": 1
}'
```

### Response (200 OK)

```json
{
  "awb_assign_status": 1,
  "response": {
    "data": {
      "courier_company_id": 10,
      "awb_code": "1234567890123",
      "cod": 0,
      "order_id": 16525924,
      "shipment_id": 16370752,
      "awb_code_status": 1,
      "assigned_date_time": {
        "date": "2019-08-05 16:00:00.000000",
        "timezone_type": 3,
        "timezone": "Asia/Kolkata"
      },
      "applied_weight": 1,
      "company_id": 12345,
      "courier_name": "Delhivery"
    }
  }
}
```

---

## Quick Reference: Return vs Exchange Order Flow

### Return Order Flow
1. Customer requests return
2. Create return order using `POST /orders/create/return`
3. Check courier serviceability with `is_return=1`
4. Assign AWB using `POST /courier/assign/awb` with `is_return=1`
5. Schedule pickup
6. Courier picks up from customer
7. Product delivered to seller warehouse

### Exchange Order Flow
1. Customer requests exchange
2. Create exchange order using `POST /orders/create/exchange`
3. Two shipments are created:
   - Return shipment (customer → warehouse)
   - Forward shipment (warehouse → customer)
4. Assign AWB for both shipments
5. Courier picks up old product from customer
6. New product shipped to customer
