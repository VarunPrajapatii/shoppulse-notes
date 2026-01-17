# Shiprocket API - Part 2: Orders

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

## Table of Contents
- [Create Custom Order](#create-custom-order)
- [Create Channel Specific Order](#create-channel-specific-order)
- [Import Orders in Bulk](#import-orders-in-bulk)
- [Change/Update Pickup Location](#changeupdate-pickup-location-of-created-orders)
- [Update Customer Delivery Address](#update-customer-delivery-address)
- [Update Order](#update-order)
- [Cancel an Order](#cancel-an-order)
- [Add Inventory for Ordered Product](#add-inventory-for-ordered-product)
- [Map Unmapped Products](#map-unmapped-products)
- [Order Status Codes Reference](#order-status-codes-reference)
- [Get All Orders](#get-all-orders)
- [Get Specific Order Details](#get-specific-order-details)
- [Export Orders](#export-orders)

---

## Create Or Update Order

APIs to create new orders, update existing orders, cancel orders, bulk import from CSV, and update inventory.

---

## Create Custom Order

**Endpoint:** `POST /orders/create/adhoc`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/create/adhoc`

**Description:** Create a quick custom order. Quick orders do not store product details in the master catalogue.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Notes

- If `shipping_is_billing` is false, shipping detail fields are required
- If no channel_id is passed, order is assigned to default custom channel
- `order_id` cannot equal an existing id
- New orders cannot use order_id of cancelled orders
- Calculate and input correct `sub_total` (not calculated automatically)
- The `order_id` in response is Shiprocket's order_id - save this for future API calls

### Parameters

| Param | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `order_id` | YES | string | Max 50 chars. Avoid character values. | 224477 or 224-477 |
| `order_date` | YES | string | Format: yyyy-mm-dd HH:mm | 2019-07-24 11:11 |
| `pickup_location` | YES | string | Name of pickup location in Shiprocket account | Jammu |
| `channel_id` | NO | integer | Channel to assign order. Default is 'Custom' | 27022 |
| `comment` | NO | string | 'From' field on shipment. Format: 'Reseller: [name]' | Reseller: Divine |
| `reseller_name` | NO | string | 'From' name to print | Reseller: Divine |
| `company_name` | NO | string | Company name | Amazon |
| `billing_customer_name` | YES | string | First name of billed customer | John |
| `billing_last_name` | NO | string | Last name of billed customer | Doe |
| `billing_address` | YES | string | Address of billed customer | Civil line, House 20 |
| `billing_address_2` | NO | string | Additional address details | Near Hokage House |
| `billing_city` | YES | string | Max 30 chars | New Delhi |
| `billing_pincode` | YES | integer | Pincode | 110002 |
| `billing_state` | YES | string | State | Delhi |
| `billing_country` | YES | string | Country | India |
| `billing_email` | YES | string | Email address | john@doe.com |
| `billing_phone` | YES | integer | Phone number | 9856321472 |
| `billing_alternate_phone` | NO | integer | Alternate phone | 8604690454 |
| `billing_isd_code` | NO | string | ISD code | +91 |
| `shipping_is_billing` | YES | boolean | Same address? 1/true or 0/false | true |
| `shipping_customer_name` | CONDITIONAL | string | Required if billing ≠ shipping | Jane |
| `shipping_last_name` | NO | string | Shipping customer last name | Doe |
| `shipping_address` | CONDITIONAL | string | Required if billing ≠ shipping | Lane number 69 |
| `shipping_address_2` | NO | string | Additional shipping address | Andheri |
| `shipping_city` | CONDITIONAL | string | Shipping city | Mumbai |
| `shipping_pincode` | CONDITIONAL | integer | Shipping pincode | 200912 |
| `shipping_country` | CONDITIONAL | string | Shipping country | India |
| `shipping_state` | CONDITIONAL | string | Shipping state | Maharashtra |
| `shipping_email` | NO | string | Shipping email | jane@doe.com |
| `shipping_phone` | CONDITIONAL | integer | Shipping phone | - |
| `longitude` | NO | float | Destination longitude | 69.0747 |
| `latitude` | NO | float | Destination latitude | 22.4064 |
| `order_items` | YES | array | List of items | - |
| `order_items[].name` | YES | string | Product name | Jeans |
| `order_items[].sku` | YES | string | Product SKU | cbs123 |
| `order_items[].units` | YES | integer | Number of units | 10 |
| `order_items[].selling_price` | YES | integer | Price per unit (₹). Inclusive of GST | 900 |
| `order_items[].discount` | NO | integer | Discount amount (₹). Inclusive of tax | 10 |
| `order_items[].tax` | NO | integer | Tax percentage | 5 |
| `order_items[].hsn` | NO | integer | HSN code for taxation category | 44122 |
| `payment_method` | YES | string | COD or Prepaid | COD |
| `shipping_charges` | NO | integer | Shipping charges (₹) | 5 |
| `giftwrap_charges` | NO | integer | Giftwrap charges (₹) | 5 |
| `transaction_charges` | NO | integer | Transaction charges (₹) | 5 |
| `total_discount` | NO | integer | Total discount (₹) | 15 |
| `sub_total` | YES | integer | Calculated subtotal after deductions (₹) | 9010 |
| `length` | YES | float | Length in cm. Min 0.5 | 10 |
| `breadth` | YES | float | Breadth in cm. Min 0.5 | 10 |
| `height` | YES | float | Height in cm. Min 0.5 | 10 |
| `weight` | YES | float | Weight in kg. Must be > 0 | 2.5 |
| `ewaybill_no` | NO | string | E-way bill number | K92373490 |
| `customer_gstin` | NO | string | GSTIN number | 29ABCDE1234F2Z5 |
| `invoice_number` | NO | string | Invoice number | - |
| `order_type` | NO | string | ESSENTIALS or NON ESSENTIALS (case sensitive) | ESSENTIALS |
| `checkout_shipping_method` | NO | string | SRF users only: SR_RUSH, SR_STANDARD, SR_EXPRESS, SR_QUICK | SR_EXPRESS |
| `what3words_address` | NO | string | What3words geocode | toddler.geologist.animated |
| `is_insurance_opt` | NO | boolean | Insure shipments above ₹2500 | true |
| `is_document` | NO | integer | Document order. 1 or 0 | 1 |
| `order_tag` | NO | string | Order tags | abc, xyz |

### Request Body

```json
{
  "order_id": "",
  "order_date": "",
  "pickup_location": "",
  "comment": "",
  "reseller_name": "",
  "company_name": "",
  "billing_customer_name": "",
  "billing_last_name": "",
  "billing_address": "",
  "billing_address_2": "",
  "billing_isd_code": "",
  "billing_city": "",
  "billing_pincode": "",
  "billing_state": "",
  "billing_country": "",
  "billing_email": "",
  "billing_phone": "",
  "billing_alternate_phone": "",
  "shipping_is_billing": "",
  "shipping_customer_name": "",
  "shipping_last_name": "",
  "shipping_address": "",
  "shipping_address_2": "",
  "shipping_city": "",
  "shipping_pincode": "",
  "shipping_country": "",
  "shipping_state": "",
  "shipping_email": "",
  "shipping_phone": "",
  "order_items": [
    {
      "name": "",
      "sku": "",
      "units": "",
      "selling_price": "",
      "discount": "",
      "tax": "",
      "hsn": ""
    }
  ],
  "payment_method": "",
  "shipping_charges": "",
  "giftwrap_charges": "",
  "transaction_charges": "",
  "total_discount": "",
  "sub_total": "",
  "length": "",
  "breadth": "",
  "height": "",
  "weight": "",
  "ewaybill_no": "",
  "customer_gstin": "",
  "invoice_number": "",
  "order_type": ""
}
```

### cURL Example

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data-raw '{
  "order_id": "224-447",
  "order_date": "2019-07-24 11:11",
  "pickup_location": "Jammu",
  "comment": "Reseller: M/s Goku",
  "billing_customer_name": "Naruto",
  "billing_last_name": "Uzumaki",
  "billing_address": "House 221B, Leaf Village",
  "billing_address_2": "Near Hokage House",
  "billing_city": "New Delhi",
  "billing_pincode": 110002,
  "billing_state": "Delhi",
  "billing_country": "India",
  "billing_email": "naruto@uzumaki.com",
  "billing_phone": 9876543210,
  "shipping_is_billing": true,
  "shipping_customer_name": "",
  "shipping_last_name": "",
  "shipping_address": "",
  "shipping_address_2": "",
  "shipping_city": "",
  "shipping_pincode": "",
  "shipping_country": "",
  "shipping_state": "",
  "shipping_email": "",
  "shipping_phone": "",
  "order_items": [
    {
      "name": "Kunai",
      "sku": "chakra123",
      "units": 10,
      "selling_price": 900,
      "discount": "",
      "tax": "",
      "hsn": 441122
    }
  ],
  "payment_method": "Prepaid",
  "shipping_charges": 0,
  "giftwrap_charges": 0,
  "transaction_charges": 0,
  "total_discount": 0,
  "sub_total": 9000,
  "length": 10,
  "breadth": 15,
  "height": 20,
  "weight": 2.5
}'
```

### Response (200 OK)

```json
{
  "order_id": 16161616,
  "shipment_id": 15151515,
  "status": "NEW",
  "status_code": 1,
  "onboarding_completed_now": 0,
  "awb_code": null,
  "courier_company_id": null,
  "courier_name": null
}
```

### Response Headers

| Header | Value |
|--------|-------|
| Cache-Control | private, must-revalidate |
| Content-Encoding | gzip |
| Content-Type | application/json |
| X-RateLimit-Limit | 180 |
| X-RateLimit-Remaining | 178 |

---

## Create Channel Specific Order

**Endpoint:** `POST /orders/create`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/create`

**Description:** Create order assigned to a specific channel. Same as Custom Order API but requires channel_id.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Notes

- `channel_id` field is required
- `order_id` cannot be same as existing order id
- Inventory Sync must be enabled in Shiprocket account (Settings > Channels)
- Use 'Get Inventory Details' API for inventory information

### Parameters

| Param | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `order_id` | YES | string | Max 20 chars. Avoid character values. | 224477 |
| `order_date` | YES | string | Format: yyyy-mm-dd HH:mm | 2019-07-24 11:11 |
| `pickup_location` | NO | string | Pickup location name. Uses default if not provided | Jammu |
| `channel_id` | YES | integer | Specific channel id | 27022 |
| `comment` | NO | string | 'From' field. Format: 'Reseller: [name]' | Reseller: Divine |
| `billing_customer_name` | YES | string | First name of billed customer | John |
| `billing_last_name` | NO | string | Last name | Doe |
| `billing_address` | YES | string | Primary address. Min 3 chars | House 221B, Leaf Village |
| `billing_address_2` | NO | string | Additional address | Near Hokage House |
| `billing_city` | YES | string | Max 30 chars | New Delhi |
| `billing_pincode` | YES | integer | Pincode | 110002 |
| `billing_state` | YES | string | State | Delhi |
| `billing_country` | YES | string | Country | India |
| `billing_email` | YES | string | Email | john@doe.com |
| `billing_phone` | YES | integer | Phone | 9876543210 |
| `shipping_is_billing` | YES | boolean | 1/true or 0/false | true |
| `shipping_customer_name` | CONDITIONAL | string | Required if billing ≠ shipping | Jane |
| `shipping_last_name` | NO | string | Last name | Doe |
| `shipping_address` | CONDITIONAL | string | Required if billing ≠ shipping | Lane 69 |
| `shipping_address_2` | NO | string | Additional address | Andheri |
| `shipping_city` | CONDITIONAL | string | City | Mumbai |
| `shipping_pincode` | CONDITIONAL | integer | Pincode | 200912 |
| `shipping_country` | CONDITIONAL | string | Country | India |
| `shipping_state` | CONDITIONAL | string | State | Maharashtra |
| `shipping_email` | CONDITIONAL | string | Email | jane@doe.com |
| `shipping_phone` | CONDITIONAL | integer | Phone | 9887655432 |
| `order_items` | YES | array | Items array | - |
| `order_items[].name` | YES | string | Product name | Jeans |
| `order_items[].sku` | YES | string | SKU | cbs123 |
| `order_items[].units` | YES | integer | Units to ship | 10 |
| `order_items[].selling_price` | YES | integer | Price (₹). Inclusive of GST | 900 |
| `order_items[].discount` | NO | integer | Discount (₹). Inclusive of tax | 10 |
| `order_items[].tax` | NO | integer | Tax percentage | 5 |
| `order_items[].hsn` | NO | integer | HSN code | 44122 |
| `payment_method` | YES | string | COD or Prepaid | COD |
| `shipping_charges` | NO | integer | Shipping (₹) | 5 |
| `giftwrap_charges` | NO | integer | Giftwrap (₹) | 5 |
| `transaction_charges` | NO | integer | Transaction (₹) | 5 |
| `total_discount` | NO | integer | Total discount (₹) | 15 |
| `sub_total` | YES | integer | Calculated subtotal (₹) | 9010 |
| `length` | YES | integer | Length cm. Min 0.5 | 10 |
| `breadth` | YES | integer | Breadth cm. Min 0.5 | 10 |
| `height` | YES | integer | Height cm. Min 0.5 | 10 |
| `weight` | YES | integer | Weight kg. Must be > 0 | 2.5 |

### Request Body

```json
{
  "order_id": "3167",
  "order_date": "2020-01-14 13:25",
  "pickup_location": "mrj",
  "channel_id": "443555",
  "comment": "fast and furious",
  "billing_customer_name": "rahul",
  "billing_last_name": "",
  "billing_address": "malviya nagar",
  "billing_address_2": "",
  "billing_city": "new delhi",
  "billing_pincode": "273303",
  "billing_state": "delhi",
  "billing_country": "india",
  "billing_email": "raushanra4@gmail.com",
  "billing_phone": "9721562372",
  "shipping_is_billing": 1,
  "shipping_customer_name": "",
  "shipping_last_name": "",
  "shipping_address": "",
  "shipping_address_2": "",
  "shipping_city": "",
  "shipping_pincode": "",
  "shipping_country": "",
  "shipping_state": "",
  "shipping_email": "",
  "shipping_phone": "",
  "order_items": [
    {
      "name": "shoes",
      "sku": "shoes123",
      "units": "2",
      "selling_price": "1500",
      "discount": "100",
      "tax": "50",
      "hsn": ""
    }
  ],
  "payment_method": "COD",
  "shipping_charges": "",
  "giftwrap_charges": "",
  "transaction_charges": "",
  "total_discount": "",
  "sub_total": "2950",
  "length": "10",
  "breadth": "10",
  "height": "10",
  "weight": "1.5"
}
```

### cURL Example

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/create' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data-raw '{
  "order_id": "224-4779",
  "order_date": "2019-07-24 11:11",
  "pickup_location": "Jammu",
  "channel_id": "76893",
  "comment": "Reseller: M/s Goku",
  "billing_customer_name": "Naruto",
  "billing_last_name": "Uzumaki",
  "billing_address": "House 221B, Leaf Village",
  "billing_address_2": "Near Hokage House",
  "billing_city": "New Delhi",
  "billing_pincode": "110002",
  "billing_state": "Delhi",
  "billing_country": "India",
  "billing_email": "naruto@uzumaki.com",
  "billing_phone": "9876543210",
  "shipping_is_billing": true,
  "shipping_customer_name": "",
  "shipping_last_name": "",
  "shipping_address": "",
  "shipping_address_2": "",
  "shipping_city": "",
  "shipping_pincode": "",
  "shipping_country": "",
  "shipping_state": "",
  "shipping_email": "",
  "shipping_phone": "",
  "order_items": [
    {
      "name": "Kunai",
      "sku": "chakra123",
      "units": 10,
      "selling_price": "900",
      "discount": "",
      "tax": "",
      "hsn": 441122
    }
  ],
  "payment_method": "Prepaid",
  "shipping_charges": 0,
  "giftwrap_charges": 0,
  "transaction_charges": 0,
  "total_discount": 0,
  "sub_total": 9000,
  "length": 10,
  "breadth": 15,
  "height": 20,
  "weight": 2.5
}'
```

### Response (200 OK)

```json
{
  "order_id": 16161717,
  "shipment_id": 16000061,
  "status": "NEW",
  "status_code": 1
}
```

### Response Headers

| Header | Value |
|--------|-------|
| Cache-Control | private, must-revalidate |
| Content-Encoding | gzip |
| Content-Type | application/json |
| X-RateLimit-Limit | 180 |
| X-RateLimit-Remaining | 177 |

---

## Import Orders in Bulk

**Endpoint:** `POST /orders/import`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/import`

**Description:** Import orders in bulk to your Shiprocket account from an existing `.csv` file. The imported orders are automatically added to your panel.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Request Body (formdata)

| Param | Required | Type | Description |
|-------|----------|------|-------------|
| `file` | YES | file | The CSV file containing orders to import |

### cURL Example

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/import' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--form 'file=@"/path/to/file"'
```

### Response (200 OK)

```json
{
  "id": 19739203
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

## Change/Update Pickup Location of Created Orders

**Endpoint:** `PATCH /orders/address/pickup`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/address/pickup`

**Description:** Modify the pickup location of an already created order. Multiple order ids can be passed to update their pickup location together.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Notes

- Pickup location can only be changed/updated to an already existing pickup location in your account
- The `order_id` to be passed is the Shiprocket order_id received at the time of order creation
- Multiple order ids can be passed as an array, separated by commas. eg: `[141414,142424,143434]`

### Parameters

| Param | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `order_id` | YES | integer | The Shiprocket order_id specified to the order | 16167171 |
| `pickup_location` | YES | string | The pickup location you want to change your current pickup location to | Delhi |

### Request Body

```json
{
  "order_id": [],
  "pickup_location": ""
}
```

### Example Request (cURL)

```bash
curl --location --request PATCH 'https://apiv2.shiprocket.in/v1/external/orders/address/pickup' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "order_id": [16167171],
  "pickup_location": "Delhi"
}'
```

### Response (200 OK)

```json
{
  "message": "Pickup location Updated"
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

## Update Customer Delivery Address

**Endpoint:** `POST /orders/address/update`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/address/update`

**Description:** Update the customer's name and delivery address by passing the Shiprocket order id and the necessary customer details.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Parameters

| Param | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `order_id` | YES | integer | The Shiprocket order_id specified to the order | 16178831 |
| `shipping_customer_name` | YES | string | The name of the customer | John Doe |
| `shipping_phone` | YES | integer | Phone number of the customer | 9988998899 |
| `shipping_address` | YES | string | Primary address of the customer | House no 123 |
| `shipping_address_2` | NO | string | Further address details of the customer | Beside CM house |
| `shipping_city` | YES | string | Shipping city name | Pune |
| `shipping_state` | YES | string | Shipping state name | Maharashtra |
| `shipping_country` | YES | string | Shipping country name | India |
| `shipping_pincode` | YES | integer | Shipping address pincode | 120023 |
| `shipping_email` | NO | string | Customer's email address | john@doe.com |
| `billing_alternate_phone` | NO | string | The customer alternate phone | 8604690454 |

### Request Body

```json
{
  "order_id": "",
  "shipping_customer_name": "",
  "shipping_phone": "",
  "shipping_address": "",
  "shipping_address_2": "",
  "shipping_city": "",
  "shipping_state": "",
  "shipping_country": "",
  "shipping_pincode": "",
  "shipping_email": "",
  "billing_alternate_phone": ""
}
```

### Example Request (cURL)

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/address/update' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "order_id": 16178831,
  "shipping_customer_name": "Majin Bu",
  "shipping_phone": "9988998899",
  "shipping_address": "Earth",
  "shipping_address_2": "",
  "shipping_city": "Pune",
  "shipping_state": "Maharashtra",
  "shipping_country": "India",
  "shipping_pincode": 110077
}'
```

### Response (202 Accepted)

No response body. This request doesn't return any response body.

### Response Headers

| Header | Value |
|--------|-------|
| Cache-Control | private, must-revalidate |
| Content-Type | text/html; charset=UTF-8 |
| X-RateLimit-Limit | 180 |
| X-RateLimit-Remaining | 178 |

---

## Update Order

**Endpoint:** `POST /orders/update/adhoc`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/update/adhoc`

**Description:** Update your orders. Pass all required params at minimum to create a quick custom order. Add additional parameters as per preference.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Notes

- You can update only the `order_items` details before assigning the AWB (before Ready to Ship status)
- You can only update these key-value pairs: increase/decrease the quantity, update tax/discount, add/remove product items
- You can change the nature of the order from a non-document to a document by passing `is_document` key with value `1`

### Request Body

```json
{
  "order_id": "4TestOrderOct28",
  "order_date": "2024-10-28",
  "pickup_location": "23659_7026",
  "channel_id": "",
  "comment": "Reseller: M/s Goku",
  "billing_customer_name": "Naruto",
  "billing_last_name": "Uzumaki",
  "billing_address": "House 221B, Leaf Village",
  "billing_address_2": "Near Hokage House",
  "billing_city": "New Delhi",
  "billing_pincode": "110002",
  "billing_state": "Delhi",
  "billing_country": "India",
  "billing_email": "naruto@uzumaki.com",
  "billing_phone": "9876543210",
  "shipping_is_billing": true,
  "shipping_customer_name": "",
  "shipping_last_name": "",
  "shipping_address": "",
  "shipping_address_2": "",
  "shipping_city": "",
  "shipping_pincode": "",
  "shipping_country": "",
  "shipping_state": "",
  "shipping_email": "",
  "shipping_phone": "",
  "is_document": "0",
  "order_items": [
    {
      "name": "Agreement",
      "sku": "chakra123",
      "units": 1,
      "selling_price": "900",
      "discount": "",
      "tax": "",
      "hsn": 441122
    }
  ],
  "payment_method": "Prepaid",
  "shipping_charges": 0,
  "giftwrap_charges": 0,
  "transaction_charges": 0,
  "total_discount": 0,
  "sub_total": 9000,
  "length": 10,
  "breadth": 15,
  "height": 20,
  "weight": 2.5
}
```

### Example Request (cURL)

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/update/adhoc' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data-raw '{
  "order_id": "4TestOrderOct28",
  "order_date": "2024-10-28",
  "pickup_location": "23659_7026",
  "channel_id": "",
  "comment": "Reseller: M/s Goku",
  "billing_customer_name": "Naruto",
  "billing_last_name": "Uzumaki",
  "billing_address": "House 221B, Leaf Village",
  "billing_address_2": "Near Hokage House",
  "billing_city": "New Delhi",
  "billing_pincode": "110002",
  "billing_state": "Delhi",
  "billing_country": "India",
  "billing_email": "naruto@uzumaki.com",
  "billing_phone": "9876543210",
  "shipping_is_billing": true,
  "shipping_customer_name": "",
  "shipping_last_name": "",
  "shipping_address": "",
  "shipping_address_2": "",
  "shipping_city": "",
  "shipping_pincode": "",
  "shipping_country": "",
  "shipping_state": "",
  "shipping_email": "",
  "shipping_phone": "",
  "is_document":"0",
  "order_items": [
    {
      "name": "Agreement",
      "sku": "chakra123",
      "units": 1,
      "selling_price": "900",
      "discount": "",
      "tax": "",
      "hsn": 441122
    }
  ],
  "payment_method": "Prepaid",
  "shipping_charges": 0,
  "giftwrap_charges": 0,
  "transaction_charges": 0,
  "total_discount": 0,
  "sub_total": 9000,
  "length": 10,
  "breadth": 15,
  "height": 20,
  "weight": 2.5
}'
```

### Response (200 OK)

```json
{
  "success": true,
  "partially_update": true,
  "not_updated_fields": "order_date ,pickup_location ,channel_id ,comment ,reseller_name ,company_name ,billing_customer_name ,billing_last_name ,billing_address ,billing_address_2 ,billing_isd_code ,billing_city ,billing_pincode ,billing_state ,billing_country ,billing_email ,billing_phone ,billing_alternate_phone ,shipping_is_billing ,shipping_customer_name ,shipping_last_name ,shipping_address ,shipping_address_2 ,shipping_city ,shipping_pincode ,shipping_country ,shipping_state ,shipping_email ,shipping_phone ,payment_method ,ewaybill_no ,customer_gstin",
  "order_id": 79491,
  "shipment_id": 77906,
  "new_order_status": "NEW",
  "old_order_status": 1,
  "awb_code": "",
  "courier_company_id": "",
  "courier_name": ""
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

## Cancel an Order

**Endpoint:** `POST /orders/cancel`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/cancel`

**Description:** Cancel a created order. Multiple order_ids can be passed together as an array to cancel them simultaneously.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Parameters

| Param | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `ids` | YES | integer | The Shiprocket order id/ids of the orders that need to be canceled | 16178831 |

### Request Body

```json
{
  "ids": []
}
```

### Example Request (cURL)

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/cancel' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "ids": [16168898,16167171]
}'
```

### Response (204 No Content)

No response body. This request doesn't return any response body.

### Response Headers

| Header | Value |
|--------|-------|
| Cache-Control | private, must-revalidate |
| X-RateLimit-Limit | 180 |
| X-RateLimit-Remaining | 179 |

---

## Add Inventory for Ordered Product

**Endpoint:** `PATCH /orders/fulfill`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/fulfill`

**Description:** Add inventory for ordered products that are out of stock or low on quantity. Pass the order id and order product id. You can also specify the number of items.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Notes

- Inventory sync of your account must be turned on to use this API
- The `order_id` to be passed is the Shiprocket order id
- If you don't know the product id, use the 'Get Product Details' API to get details about all the existing products

### Parameters

| Param | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `order_id` | YES | integer | The Shiprocket order_id specified to the order | 16167171 |
| `order_product_id` | YES | integer | The product id of the product to be added | 17171717 |
| `quantity` | YES | string | The number of items you want to add | 10 |
| `action` | YES | string | The action you want to carry out. Is 'add' | add |

### Request Body

```json
{
  "data": [
    {
      "order_id": "",
      "order_product_id": "",
      "quantity": "",
      "action": ""
    }
  ]
}
```

### Example Request (cURL)

```bash
curl --location --request PATCH 'https://apiv2.shiprocket.in/v1/external/orders/fulfill' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "data": [
    {
      "order_id": 14124005,
      "order_product_id": 43737767570843,
      "quantity": "1",
      "action": "add"
    }
  ]
}'
```

### Response (200 OK)

```json
[
  {
    "data": {
      "order_id": 14124005,
      "order_product_id": 43737767570843,
      "quantity": "1",
      "action": "add"
    },
    "success": true,
    "message": "Inventory added successfully"
  }
]
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

## Map Unmapped Products

**Endpoint:** `PATCH /orders/mapping`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/mapping`

**Description:** Maps your unmapped inventory products.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Notes

- Products must be unmapped to run this API successfully
- Inventory sync must be turned on to use this API

### Parameters

| Param | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `order_id` | YES | integer | The Shiprocket order_id specified to the order | 16167171 |
| `order_product_id` | YES | integer | The product id of the product to be mapped | 17171717 |
| `master_sku` | YES | string | The sku id of the product. In case of a single integrated channel, master sku is the same as channel_sku; Otherwise, it can be found using the 'Get All Products' API | chakra123 |

### Request Body

```json
{
  "data": [
    {
      "order_id": "",
      "order_product_id": "",
      "master_sku": ""
    }
  ]
}
```

### Example Request (cURL)

```bash
curl --location --request PATCH 'https://apiv2.shiprocket.in/v1/external/orders/mapping' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "data": [
    {
      "order_id": 14303681,
      "order_product_id": 16487731,
      "master_sku": "delta123"
    }
  ]
}'
```

### Response (200 OK)

```json
[
  {
    "data": {
      "order_id": 14303681,
      "order_product_id": 16487731,
      "master_sku": "delta123"
    },
    "success": true,
    "message": "Product mapped successfully"
  }
]
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

## Order Status Codes Reference

Use these status codes with the `filter` parameter when querying orders.

| STATUS CODE | STATUS NAME |
|-------------|-------------|
| 1 | NEW |
| 2 | INVOICED |
| 3 | READY TO PACK |
| 4 | PICKUP QUEUED |
| 5 | PICKUP PENDING |
| 6 | AWB ASSIGNED |
| 7 | LABEL GENERATED |
| 8 | PICKUP SCHEDULED |
| 9 | PICKED UP |
| 10 | SHIPPED |
| 11 | DELIVERED |
| 12 | CANCELLED |
| 13 | RTO INITIATED |
| 14 | RTO DELIVERED |
| 15 | OUT FOR PICKUP |
| 16 | NOT PICKED |
| 17 | OUT FOR DELIVERY |
| 18 | UNDELIVERED |
| 19 | IN TRANSIT |
| 20 | RETURN CREATED |
| 21 | RETURN PENDING |
| 22 | RETURN PICKED |
| 23 | RETURN_DELIVERED |
| 24 | LOST |
| 25 | DAMAGED |
| 26 | DISPOSED OFF |
| 27 | FULFILLED |
| 28 | RTO DECLARED |
| 29 | RTO IN TRANSIT |
| 30 | REACHED_DESTINATION_HUB |
| 31 | MISROUTED |
| 32 | RTO OUT FOR DELIVERY |
| 33 | RTO UNDELIVERED |
| 34 | DESTROYED |
| 35 | RETURN OUT FOR PICKUP |
| 36 | RETURN NOT PICKED |
| 37 | RETURN IN TRANSIT |
| 38 | RETURN OUT FOR DELIVERY |
| 39 | RETURN UNDELIVERED |
| 40 | RETURN_CANCELLED |
| 41 | LIQUIDATED |
| 42 | EXCHANGE PLACED |
| 43 | EXCHANGE PICKED |
| 44 | EXCHANGE DELIVERED |
| 45 | EXCHANGE_CANCELLED |
| 46 | RETURN SHIPMENT LOST |
| 47 | RETURN SHIPMENT DAMAGED |
| 48 | RETURN SHIPMENT DISPOSED_OFF |
| 49 | RTO AWB ASSIGNED |
| 50 | RTO PICKUP SCHEDULED |
| 51 | RTO PICKUP OUT FOR PICKUP |
| 52 | RTO PICKUP NOT PICKED |
| 53 | EXCHANGE PENDING |
| 54 | EXCHANGE OUT FOR DELIVERY |
| 55 | EXCHANGE_UNDELIVERED |
| 60 | PARTIALLY_DELIVERED |
| 61 | PARTIALLY_DELIVERED_SKP |
| 62 | ADDRESS_UPDATED |
| 63 | FAKE_ATTEMPT |
| 64 | CONNECTION_ERROR |
| 70 | NDR_ACTION_REQUIRED |
| 80 | DRAFT |
| 81 | RETURN_RTO_INITIATED |
| 82 | RETURN_RTO_DELIVERED |
| 83 | RETURN_RTO_IN_TRANSIT |
| 84 | RETURN_RTO_DECLARED |
| 85 | RETURN_RTO_OUT_FOR_DELIVERY |
| 86 | RETURN_RTO_UNDELIVERED |
| 87 | RETURN_REACHED_AT_ORIGIN |
| 88 | RTO_REACHED_BACK_AT_SELLER_CITY |
| 89 | REACHED_AT_ORIGIN |
| 90 | REACHED_BACK_AT_SELLER_CITY |

---

## Get All Orders

**Endpoint:** `GET /orders`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders`

**Description:** Get a list of all orders in your Shiprocket account with filtering and pagination options.

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer `<token>` |

### Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `page` | NO | integer | The page number to display | 1 |
| `per_page` | NO | integer | The number of orders to display per page | 20 |
| `sort` | NO | string | Sort order: ASC or DESC | DESC |
| `sort_by` | NO | string | Field to sort by | created_at |
| `to` | NO | string | End date for filtering (YYYY-MM-DD) | 2019-07-15 |
| `from` | NO | string | Start date for filtering (YYYY-MM-DD) | 2019-07-12 |
| `filter_by` | NO | string | Filter type | shipments |
| `filter` | NO | integer | Status code to filter orders (see Order Status Codes) | 3 |
| `search` | NO | string | Search term | ball |
| `pickup_location` | NO | string | Filter by pickup location | Jammu |
| `channel_id` | NO | integer | Filter by channel ID | 27022 |
| `fbs` | NO | integer | Filter FBS orders (1 for yes) | 1 |

### Example Request (cURL)

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders?page=1&per_page=20&sort=DESC&sort_by=created_at&from=2019-07-12&to=2019-07-15&filter_by=shipments&filter=3' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Response (200 OK)

```json
{
  "data": [
    {
      "id": 14303678,
      "channel_id": 27022,
      "channel_name": "CUSTOM",
      "base_channel_code": "CS",
      "channel_order_id": "22444778",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_phone": "9987654321",
      "customer_pincode": "110002",
      "status": "Ready to Pack",
      "status_code": 3,
      "payment_method": "COD",
      "total": "9010.00",
      "created_at": "2019-07-24 11:12:44"
    }
  ],
  "meta": {
    "pagination": {
      "total": 124,
      "count": 20,
      "per_page": 20,
      "current_page": 1,
      "total_pages": 7,
      "links": {
        "next": "https://apiv2.shiprocket.in/v1/external/orders?page=2"
      }
    }
  }
}
```

---

## Get Specific Order Details

**Endpoint:** `GET /orders/show/{id}`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/show/{id}`

**Description:** Get detailed information about a specific order by its ID.

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer `<token>` |

### Path Parameters

| PARAM | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|-------|----------|-----------|-------------|---------|
| `id` | YES | integer | The Shiprocket order ID | 14303681 |

### Example Request (cURL)

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/show/14303681' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Response (200 OK)

```json
{
  "data": {
    "id": 14303681,
    "channel_id": 27022,
    "channel_name": "CUSTOM",
    "base_channel_code": "CS",
    "channel_order_id": "224-478",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "9987654321",
    "customer_address": "Civil line, House 20",
    "customer_address_2": "Near Hokage House",
    "customer_city": "New Delhi",
    "customer_state": "Delhi",
    "customer_pincode": "110002",
    "customer_country": "India",
    "pickup_location": "Primary",
    "status": "AWB_ASSIGNED",
    "status_code": 6,
    "payment_method": "COD",
    "total": "9010.00",
    "sub_total": "9010.00",
    "shipping_charges": 0,
    "giftwrap_charges": 0,
    "transaction_charges": 0,
    "total_discount": 0,
    "created_at": "2019-07-24 11:33:15",
    "products": [
      {
        "id": 16487731,
        "name": "Jeans",
        "sku": "cbs123",
        "units": 10,
        "selling_price": "901.00",
        "discount": 0,
        "tax": 0,
        "hsn": ""
      }
    ],
    "shipments": [
      {
        "id": 14114567,
        "courier": "Delhivery",
        "courier_id": 10,
        "awb": "1234567890",
        "weight": "2.50",
        "length": 10,
        "breadth": 10,
        "height": 10,
        "volumetric_weight": 0.2
      }
    ]
  }
}
```

---

## Export Orders

**Endpoint:** `POST /orders/export`

**URL:** `https://apiv2.shiprocket.in/v1/external/orders/export`

**Description:** Export orders to CSV. The export file is generated and sent to your registered email address.

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer `<token>` |

### Parameters

| PARAMS | REQUIRED | DATA TYPE | DESCRIPTION | EXAMPLE |
|--------|----------|-----------|-------------|---------|
| `filter_by` | NO | string | Filter type | orders |
| `from` | NO | string | Start date (YYYY-MM-DD) | 2019-07-12 |
| `to` | NO | string | End date (YYYY-MM-DD) | 2019-07-15 |
| `filter` | NO | integer | Status code filter | 3 |

### Request Body

```json
{
  "filter_by": "orders",
  "from": "2019-07-12",
  "to": "2019-07-15",
  "filter": 3
}
```

### Example Request (cURL)

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/export' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "filter_by": "orders",
  "from": "2019-07-12",
  "to": "2019-07-15"
}'
```

### Response (200 OK)

```json
{
  "message": "The report has been sent to your registered email address."
}
```
