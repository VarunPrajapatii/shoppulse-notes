# Shiprocket Hyperlocal API - Part 4: Orders Management

## Overview

Create and manage Hyperlocal orders. These APIs allow you to create custom orders, update order details, and manage order lifecycle for same-day/local deliveries.

## Base URL
```
https://apiv2.shiprocket.in/v1/external
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer {your_token}
```

---

## Order Status Codes Reference

Use these status codes when filtering orders via the `filter_by=status` parameter.

| Code | Status |
|------|--------|
| 1 | New |
| 2 | Invoiced |
| 3 | Ready To Ship |
| 4 | Pickup Scheduled |
| 5 | Canceled |
| 6 | Shipped |
| 7 | Delivered |
| 8 | ePayment Failed |
| 9 | Returned |
| 10 | Unmapped |
| 11 | Unfulfillable |
| 12 | Pickup Queue |
| 13 | Pickup Rescheduled |
| 14 | Pickup Error |
| 15 | RTO Initiated |
| 16 | RTO Delivered |
| 17 | RTO Acknowledged |
| 18 | Cancellation Requested |
| 19 | Out for Delivery |
| 20 | In Transit |
| 21 | Return Pending |
| 22 | Return Initiated |
| 23 | Return Pickup Queued |
| 24 | Return Pickup Error |
| 25 | Return In Transit |
| 26 | Return Delivered |
| 27 | Return Cancelled |
| 28 | Return Pickup Generated |
| 29 | Return Cancellation Requested |
| 30 | Return Pickup Cancelled |
| 31 | Return Pickup Rescheduled |
| 32 | Return Picked Up |
| 33 | Lost |
| 34 | Out For Pickup |
| 35 | Pickup Exception |
| 36 | Undelivered |
| 37 | Delivery Delayed |
| 38 | Partial Delivered |
| 39 | Destroyed |
| 40 | Damaged |
| 41 | Fulfilled |
| 42 | Archived |
| 43 | Reached Destination Hub |
| 44 | Misrouted |
| 45 | RTO_OFD |
| 46 | RTO_NDR |
| 47 | Return Out For Pickup |
| 48 | Return Out For Delivery |
| 49 | Return Pickup Exception |
| 50 | Return Undelivered |
| 51 | Picked Up |
| 52 | Self Fulfilled |
| 53 | Disposed Off |
| 54 | Canceled before Dispatched |
| 55 | RTO In-Transit |
| 57 | QC Failed |
| 58 | Reached Warehouse |
| 59 | Custom Cleared |
| 60 | In Flight |
| 61 | Handover to Courier |
| 62 | Booked |
| 64 | In Transit Overseas |
| 65 | Connection Aligned |
| 66 | Reached Overseas Warehouse |
| 67 | Custom Cleared Overseas |
| 68 | RETURN ACKNOWLEDGED |
| 69 | Box Packing |
| 70 | Pickup Booked |
| 71 | DARKSTORE SCHEDULED |
| 72 | Allocation in Progress |
| 73 | FC Allocated |
| 74 | Picklist Generated |
| 75 | Ready to Pack |
| 76 | Packed |
| 80 | FC MANIFEST GENERATED |
| 81 | PROCESSED AT WAREHOUSE |
| 82 | PACKED EXCEPTION |
| 83 | HANDOVER EXCEPTION |
| 87 | RTO_LOCK |
| 88 | UNTRACEABLE |
| 89 | ISSUE_RELATED_TO_THE_RECIPIENT |
| 90 | REACHED_BACK_AT_SELLER_CITY |

---

## 1. Create Custom Order

Create a quick custom order without storing product details in the master catalogue.

### Endpoint
```
POST /orders/create/adhoc
```

### Headers
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Important Notes
- If `shipping_is_billing` is `false`, shipping detail fields are required
- If no `channel_id` is passed, order will be assigned to default custom channel
- `order_id` cannot be the same as an already existing or cancelled order ID
- The `order_id` returned in response is the Shiprocket order_id - save this for future API calls
- Sub_total is NOT calculated automatically - ensure correct amount is provided

### Request Body Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| `order_id` | YES | string | Custom order ID. Max 50 chars. Avoid character values. | `224477` or `224-477` |
| `order_date` | YES | string | Order creation date (yyyy-mm-dd format). Time is optional. | `2019-07-24 11:11` |
| `pickup_location` | YES | string | Name of pickup location from your Shiprocket account | `Jammu` |
| `channel_id` | NO | integer | Assign order to specific channel. Default: 'Custom' | `27022` |
| `comment` | NO | string | Add 'From' field to shipment. Format: 'Reseller: [name]' | `Reseller: Divine` |
| `reseller_name` | NO | string | The 'from' name for printing | `Reseller: Divine` |
| `company_name` | NO | string | Company name | `Amazon` |
| `billing_customer_name` | YES | string | First name of billed customer | `John` |
| `billing_last_name` | NO | string | Last name of billed customer | `Doe` |
| `billing_address` | YES | string | Billing address details | `Civil line, House 20` |
| `billing_address_2` | NO | string | Additional billing address details | `Near Hokage House` |
| `billing_city` | YES | string | Billing city. Max 30 chars. | `New Delhi` |
| `billing_pincode` | YES | integer | Billing pincode | `110002` |
| `billing_state` | YES | string | Billing state | `Delhi` |
| `billing_country` | YES | string | Billing country | `India` |
| `billing_email` | YES | string | Billing customer email | `john@doe.com` |
| `billing_phone` | YES | integer | Billing phone number | `9856321472` |
| `billing_alternate_phone` | NO | integer | Alternate billing phone | `8604690454` |
| `billing_isd_code` | NO | string | ISD code of billing address | `+91` |
| `shipping_is_billing` | YES | boolean | Is shipping same as billing? | `true` or `false` |
| `shipping_customer_name` | CONDITIONAL | string | Required if shipping ≠ billing | `Jane` |
| `shipping_last_name` | NO | string | Shipping customer last name | `Doe` |
| `shipping_address` | CONDITIONAL | string | Required if shipping ≠ billing | `Lane number 69` |
| `shipping_address_2` | NO | string | Additional shipping address | `Andheri` |
| `shipping_city` | CONDITIONAL | string | Shipping city | `Mumbai` |
| `shipping_pincode` | CONDITIONAL | integer | Shipping pincode | `200912` |
| `shipping_country` | CONDITIONAL | string | Shipping country | `India` |
| `shipping_state` | CONDITIONAL | string | Shipping state | `Maharashtra` |
| `shipping_email` | NO | string | Shipping customer email | `jane@doe.com` |
| `shipping_phone` | CONDITIONAL | integer | Shipping phone | - |
| `longitude` | YES* | float | Delivery longitude (*Mandatory for Hyperlocal) | `77.06745147705078` |
| `latitude` | YES* | float | Delivery latitude (*Mandatory for Hyperlocal) | `28.50724220275879` |
| `order_items` | YES | array | List of items (see below) | - |
| `payment_method` | YES | string | Payment method | `COD` or `Prepaid` |
| `shipping_charges` | NO | integer | Shipping charges in Rupees | `5` |
| `giftwrap_charges` | NO | integer | Giftwrap charges in Rupees | `5` |
| `transaction_charges` | NO | integer | Transaction charges in Rupees | `5` |
| `total_discount` | NO | integer | Total discount in Rupees | `15` |
| `sub_total` | YES | integer | Calculated sub total in Rupees | `9010` |
| `length` | YES | float | Item length in cms. Must be > 0.5 | `10` |
| `breadth` | YES | float | Item breadth in cms. Must be > 0.5 | `10` |
| `height` | YES | float | Item height in cms. Must be > 0.5 | `10` |
| `weight` | YES | float | Item weight in kgs. Must be > 0 | `2.5` |
| `ewaybill_no` | NO | string | E-way bill number | `K92373490` |
| `customer_gstin` | NO | string | Customer GSTIN | `29ABCDE1234F2Z5` |
| `invoice_number` | NO | string | Invoice number | - |
| `order_type` | NO | string | ESSENTIALS or NON ESSENTIALS (case sensitive) | `ESSENTIALS` |
| `checkout_shipping_method` | NO | string | Only for SRF users | See options below |
| `what3words_address` | NO | string | What3words geocode location | `toddler.geologist.animated` |
| `is_insurance_opt` | NO | boolean | Insure shipments > Rs 2500 | `true` |
| `is_document` | NO | integer | Create document order | `1` or `0` |
| `shipping_method` | YES* | string | Use `HL` for Hyperlocal shipments | `HL` |

#### Checkout Shipping Method Options (SRF Users Only)
- `SR_RUSH`: SDD, NDD (Same Day/Next Day Delivery)
- `SR_STANDARD`: Surface Delivery
- `SR_EXPRESS`: Air Delivery
- `SR_QUICK`: 3 hrs delivery

#### Order Items Array Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| `name` | YES | string | Product name | `Jeans` |
| `sku` | YES | string | Product SKU | `cbs123` |
| `units` | YES | integer | Number of units | `10` |
| `selling_price` | YES | integer | Selling price per unit (inclusive of GST) | `900` |
| `discount` | NO | integer | Discount amount (inclusive of tax) | `10` |
| `tax` | NO | integer | Tax percentage | `5` |
| `hsn` | NO | integer | HSN code for taxation category | `44122` |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data-raw '{
  "order_id": "224-447",
  "order_date": "2019-07-24 11:11",
  "pickup_location": "Jammu",
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

### Example Response (200 OK)

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

---

## 2. Get All Orders

Retrieve a list of all orders in your Shiprocket account with optional sorting and filtering.

### Endpoint
```
GET /orders
```

### Headers
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Query Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| `page` | NO | integer | Page number to display | `5` |
| `per_page` | NO | integer | Entries per page | `5` |
| `sort` | NO | string | Sort direction | `ASC` or `DESC` |
| `sort_by` | NO | string | Field to sort by | `id` or `status` |
| `to` | NO | string | End date (yyyy-mm-dd) | `2018-07-24` |
| `from` | NO | string | Start date (yyyy-mm-dd) | `2019-07-24` |
| `filter_by` | NO | string | Field to filter by | `status`, `payment_method`, `delivery_country`, `channel_order_id` |
| `filter` | NO | string | Filter value | See status codes table |
| `search` | NO | string | Search by AWB or channel order_id | `224477` |
| `pickup_location` | NO | string | Filter by pickup location | `xyz` |
| `channel_id` | NO | integer | Channel ID from Get Integrated Channels API | `123` |
| `fbs` | NO | integer | Filter SRF orders | `0` or `1` |

### Filter Options

**Filter by payment_method:**
- `cod` - Cash on Delivery
- `Prepaid` - Prepaid orders

**Filter by status:**
- Use status codes from the reference table above (1-90)

### Update Date Validations

```
1. If updated_to is passed without updated_from:
   Error: "Please send update_from date along with update_to date"

2. If both dates passed and difference > 30 days:
   Error: "Difference between updated_from and update_to date should not be greater than 30 days"

3. If updated_from < 30 days from current date:
   Error: "Updated_from date should not be less than 30 days from current date"
```

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response (200 OK)

```json
{
  "data": [
    {
      "id": 16178831,
      "channel_id": 76893,
      "channel_name": "CUSTOM",
      "base_channel_code": "CS",
      "channel_order_id": "224-4779888",
      "customer_name": "Majin Bu",
      "customer_email": "naruto@uzumaki.com",
      "customer_phone": "9988998899",
      "pickup_location": "hell",
      "payment_status": "",
      "total": "9000.00",
      "tax": "0.00",
      "sla": "2 days",
      "shipping_method": "SR",
      "expedited": 0,
      "status": "CANCELED",
      "status_code": 5,
      "payment_method": "prepaid",
      "is_international": 0,
      "purpose_of_shipment": 0,
      "channel_created_at": "24 Jul 2019, 11:11 AM",
      "created_at": "31 Jul 2019, 03:03 PM",
      "products": [
        {
          "id": 18769728,
          "channel_order_product_id": "18769728",
          "name": "Kunai",
          "channel_sku": "chakra123",
          "quantity": 10,
          "product_id": 17484610,
          "available": 50,
          "status": "CANCELED",
          "hsn": "441122"
        }
      ],
      "shipments": [
        {
          "id": 16028538,
          "isd_code": "",
          "courier": "",
          "weight": 0,
          "dimensions": "0.00x0.00x0.00",
          "pickup_scheduled_date": null,
          "pickup_token_number": null,
          "awb": "",
          "return_awb": "",
          "volumetric_weight": 0,
          "pod": null,
          "etd": "NA",
          "rto_delivered_date": "0000-00-00 00:00:00",
          "delivered_date": null,
          "etd_escalation_btn": false
        }
      ],
      "activities": [
        "ORDER_CREATED",
        "ADDRESS_MODIFIED",
        "ORDER_CANCELLED"
      ],
      "allow_return": 0,
      "is_incomplete": 0,
      "errors": [],
      "show_escalation_btn": 0,
      "escalation_status": "",
      "escalation_history": []
    }
  ],
  "meta": {
    "pagination": {
      "total": 1,
      "count": 1,
      "per_page": 1,
      "current_page": 1,
      "total_pages": 1,
      "links": {}
    }
  }
}
```

---

## 3. Get Specific Order Details

Retrieve detailed information for a specific order using the Shiprocket order ID.

### Endpoint
```
GET /orders/show/{id}
```

### Headers
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Path Parameters
| Parameter | Description |
|-----------|-------------|
| `id` | Shiprocket order ID |

### Note for SRF Orders
For SRF orders, you'll receive an extra parameter `fulfillment_status` with values:
- Ready to Pack
- Packed
- Added to Picklist
- Picked up

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/show/16167171' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response (200 OK)

```json
{
  "data": {
    "id": 259492257,
    "channel_id": 38026,
    "channel_name": "MANUAL1",
    "base_channel_code": "CS",
    "is_international": 0,
    "is_document": 0,
    "channel_order_id": "1873081902",
    "customer_name": "DemoHome",
    "customer_email": "abc@gmail.com",
    "customer_phone": "9876543236",
    "customer_address": "408, Gautami, Kondapur",
    "customer_address_2": null,
    "customer_city": "North West Delhi",
    "customer_state": "Delhi",
    "customer_pincode": "110088",
    "customer_country": "India",
    "pickup_code": "",
    "pickup_location": "",
    "pickup_location_id": "",
    "pickup_id": "",
    "currency": "INR",
    "payment_status": "",
    "total": 345,
    "net_total": "345.00",
    "other_charges": "0.00",
    "giftwrap_charges": "0.00",
    "tax": 0,
    "discount": 0,
    "status": "RETURN PENDING",
    "status_code": 21,
    "payment_method": "prepaid",
    "channel_created_at": "21 Sep 2022 05:25 PM",
    "created_at": "21 Sep 2022 05:28 PM",
    "order_date": "21 Sep 2022",
    "products": [
      {
        "id": 365076966,
        "order_id": 259492257,
        "product_id": 1620533,
        "name": "watch",
        "sku": "Tshirt-Blue-41",
        "description": "WHEAT AND MESLIN DURUM WHEAT",
        "channel_sku": "Tshirt-Blue-41",
        "hsn": "",
        "price": 345,
        "cost": 345,
        "mrp": 400,
        "quantity": 1,
        "tax": 0,
        "discount": 0,
        "selling_price": 345,
        "tax_percentage": 0
      }
    ],
    "shipments": {
      "id": 258878960,
      "order_id": 259492257,
      "awb": null,
      "weight": 1,
      "volumetric_weight": 0.266,
      "dimensions": "11.000x11.000x11.000",
      "courier": "",
      "courier_id": "",
      "status": "PENDING",
      "isd_code": "+91",
      "created_at": "21st Sep 2022 05:28 PM",
      "length": 11,
      "breadth": 11,
      "height": 11
    },
    "awb_data": {
      "awb": "",
      "applied_weight": "",
      "charged_weight": "",
      "billed_weight": "",
      "routing_code": "",
      "charges": {
        "zone": "",
        "cod_charges": "",
        "freight_charges": ""
      }
    },
    "order_insurance": {
      "insurance_status": "No",
      "policy_no": "N/A",
      "claim_enable": false
    },
    "return_pickup_data": {
      "id": 2143757,
      "name": "ashwin ashwin",
      "email": "ashwingunadeep@gmail.com",
      "address": "shiprocket",
      "city": "South West Delhi",
      "state": "Delhi",
      "country": "India",
      "pin_code": "110030",
      "phone": "9562817406"
    },
    "allow_return": 0,
    "is_return": 1,
    "is_incomplete": 0,
    "shipping_is_billing": 0,
    "company_name": "shiprocket",
    "shipping_method": "SR",
    "change_payment_mode": true,
    "can_edit_dimension": true
  }
}
```

---

## 4. Export Orders

Export all orders as a CSV file. The download URL will be sent to the linked email account.

### Endpoint
```
POST /orders/export
```

### Headers
| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body
No parameters required - send an empty JSON object.

```json
{
	
}
```

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/export' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
	
}'
```

### Example Response (200 OK)

```json
{
  "status": 200,
  "is_background_downloading": 1
}
```

### Response Fields
| Field | Description |
|-------|-------------|
| `status` | HTTP status code |
| `is_background_downloading` | Indicates export is processing in background (1 = true) |

### Notes
- Export runs as a background job
- CSV download link will be emailed to the API user's linked email
- Large exports may take several minutes to process

---

## Rate Limiting

All orders endpoints follow standard rate limits:
- **X-RateLimit-Limit**: 180 requests per minute
- **X-RateLimit-Remaining**: Remaining requests in current window

---

## Common Response Headers

| Header | Description |
|--------|-------------|
| Content-Type | application/json |
| Cache-Control | private, must-revalidate |
| X-RateLimit-Limit | Request limit per minute |
| X-RateLimit-Remaining | Remaining requests |

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or expired token |
| 404 | Not Found - Order doesn't exist |
| 422 | Unprocessable Entity - Duplicate order_id or validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
