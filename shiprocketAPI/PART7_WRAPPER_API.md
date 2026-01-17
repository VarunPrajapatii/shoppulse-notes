# Shiprocket API Reference - Part 7: Wrapper API

## Overview

Wrapper APIs combine multiple operations into a single API call, simplifying the shipping workflow. Instead of making separate calls for order creation, AWB assignment, label generation, and manifest generation, you can accomplish everything in one request.

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## Why Use Wrapper APIs?

### Traditional Flow (Multiple API Calls)
```
1. Create Order        → POST /orders/create/adhoc
2. Assign AWB          → POST /courier/assign/awb
3. Generate Label      → POST /courier/generate/label
4. Generate Manifest   → POST /manifests/generate
5. Request Pickup      → POST /courier/generate/pickup
```

### Wrapper Flow (Single API Call)
```
1. Forward Wrapper API → POST /shipments/create/forward-shipment
   (Does ALL of the above in one call!)
```

### Benefits

| Aspect | Traditional | Wrapper |
|--------|-------------|---------|
| API Calls | 4-5 calls | 1 call |
| Latency | Higher | Lower |
| Error Handling | Multiple points | Single point |
| Complexity | Higher | Lower |
| Rate Limit Impact | Higher | Lower |

---

## 1. Forward Wrapper API

Create order, request shipment, assign AWB, generate label/manifest - all in one call.

### Endpoint

```
POST /shipments/create/forward-shipment
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body Parameters

#### Control Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| mode | NO | string | Auto-select courier (`auto`) or specify (`manual`) | `auto` |
| request_pickup | NO | boolean | Request pickup automatically | `true` |
| print_label | NO | boolean | Generate label automatically | `true` |
| generate_manifest | NO | boolean | Generate manifest automatically | `true` |
| courier_id | CONDITIONAL | integer | Required if mode is `manual` | 25 |
| ewaybill_no | NO | string | E-way bill number for high-value goods | `1234567890` |

#### Order Details

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| order_id | YES | string | Unique order identifier (max 50 chars) | `22114477` |
| order_date | YES | string | Order date (yyyy-mm-dd HH:mm) | `2024-01-15 12:23` |
| channel_id | NO | integer | Channel ID (defaults to Custom) | `27202` |
| reseller_name | NO | string | Reseller name if applicable | `Amazon` |
| company_name | NO | string | Company name | `My Store` |

#### Billing Address

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| billing_customer_name | YES | string | Customer first name | `Jax` |
| billing_last_name | NO | string | Customer last name | `Tank` |
| billing_address | YES | string | Primary address | `123 Main Street` |
| billing_address_2 | NO | string | Additional address | `Apt 4B` |
| billing_city | YES | string | City | `New Delhi` |
| billing_state | YES | string | State | `Delhi` |
| billing_country | YES | string | Country | `India` |
| billing_pincode | YES | integer | PIN code | `110002` |
| billing_email | YES | string | Email address | `jax@example.com` |
| billing_phone | YES | integer | Phone number | `9988998899` |
| billing_alternate_phone | NO | string | Alternate phone | `9988998800` |
| billing_isd_code | NO | string | ISD code | `91` |
| isd_code | NO | string | ISD code for shipping | `91` |

#### Shipping Address

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| shipping_is_billing | NO | boolean | Use billing as shipping | `true` |
| shipping_customer_name | CONDITIONAL | string | Required if different from billing | `Jane` |
| shipping_last_name | NO | string | Shipping last name | `Doe` |
| shipping_address | CONDITIONAL | string | Shipping address | `456 Oak Ave` |
| shipping_address_2 | NO | string | Additional address | `Floor 2` |
| shipping_city | CONDITIONAL | string | Shipping city | `Mumbai` |
| shipping_state | CONDITIONAL | string | Shipping state | `Maharashtra` |
| shipping_country | CONDITIONAL | string | Shipping country | `India` |
| shipping_pincode | CONDITIONAL | integer | Shipping PIN code | `400001` |
| shipping_email | NO | string | Shipping email | `jane@example.com` |
| shipping_phone | CONDITIONAL | integer | Shipping phone | `8888888888` |

#### Order Items

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| order_items | YES | array | Array of order items | See below |
| order_items[].name | YES | string | Product name | `T-shirt Round Neck` |
| order_items[].sku | YES | string | SKU identifier | `t-shirt-round1474` |
| order_items[].units | YES | integer | Quantity | `10` |
| order_items[].selling_price | YES | integer | Price per unit (₹, incl. GST) | `400` |
| order_items[].discount | NO | integer | Discount amount (₹) | `0` |
| order_items[].tax | NO | string | Tax percentage | `18` |
| order_items[].hsn | NO | string | HSN code | `4412` |

#### QC Parameters (Quality Check)

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| qc_enable | CONDITIONAL | string | Enable QC (single SKU only) | `TRUE` |
| qc_product_name | CONDITIONAL | string | Product name for QC | `Shoes` |
| qc_product_image | CONDITIONAL | string | Product image URL (png/jpg) | `https://...png` |
| qc_color | NO | string | Product color | `Red` |
| qc_brand | NO | string | Brand name | `Levi` |
| qc_serial_no | NO | string | Serial number | `T13123124` |
| qc_ean_barcode | NO | string | EAN/Barcode | `QWRE123` |
| qc_size | NO | string | Size | `8` |
| qc_product_imei | NO | string | IMEI number | `86532976457823` |

#### Payment & Charges

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| payment_method | YES | string | `COD` or `Prepaid` | `COD` |
| sub_total | YES | integer | Order subtotal (₹) | `4000` |
| total_discount | NO | string | Total discount (₹) | `0` |
| shipping_charges | NO | string | Shipping charges (₹) | `50` |
| giftwrap_charges | NO | string | Gift wrap charges (₹) | `20` |
| transaction_charges | NO | string | Transaction charges (₹) | `10` |
| customer_gstin | NO | string | Customer GSTIN | `22AAAAA0000A1Z5` |

#### Package Dimensions

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| weight | YES | float | Weight in kg | `0.5` |
| length | YES | integer | Length in cm | `100` |
| breadth | YES | integer | Breadth in cm | `50` |
| height | YES | integer | Height in cm | `10` |

#### Pickup Location

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| pickup_location | YES | string | Existing pickup location name | `HomeNew` |

#### Vendor Details (Optional - Add New Pickup Location)

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| vendor_details | NO | object | Use to add new pickup location | See below |
| vendor_details.email | CONDITIONAL | string | Vendor email | `vendor@example.com` |
| vendor_details.phone | CONDITIONAL | integer | Vendor phone | `9879879879` |
| vendor_details.name | CONDITIONAL | string | Vendor name | `Coco Cookie` |
| vendor_details.address | CONDITIONAL | string | Address (min 10 chars) | `Street 1 Building A` |
| vendor_details.address_2 | NO | string | Additional address | `Floor 2` |
| vendor_details.city | CONDITIONAL | string | City | `Delhi` |
| vendor_details.state | CONDITIONAL | string | State | `New Delhi` |
| vendor_details.country | CONDITIONAL | string | Country | `India` |
| vendor_details.pin_code | CONDITIONAL | integer | PIN code | `110077` |
| vendor_details.pickup_location | CONDITIONAL | string | New location name (max 36, alphanumeric) | `NewOffice` |

#### Additional Options

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| order_type | NO | string | `ESSENTIALS` or `NON ESSENTIALS` | `ESSENTIALS` |
| longitude | NO | float | Shipping address longitude | `69.0747` |
| latitude | NO | float | Shipping address latitude | `22.4064` |
| what3words_address | NO | string | What3words address | `toddler.geologist.animated` |
| is_document | NO | integer | Document shipment flag | `1` or `0` |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/shipments/create/forward-shipment' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data-raw '{
  "order_id": "22114477",
  "order_date": "2024-01-15 12:23",
  "channel_id": "27202",
  "billing_customer_name": "Jax",
  "billing_last_name": "Tank",
  "billing_address": "Dust2",
  "billing_city": "New Delhi",
  "billing_pincode": 110002,
  "billing_state": "Delhi",
  "billing_country": "India",
  "billing_email": "jax@counterstike.com",
  "billing_phone": 9988998899,
  "shipping_is_billing": true,
  "order_items": [
    {
      "name": "T-shirt Round Neck",
      "sku": "t-shirt-round1474",
      "units": 10,
      "selling_price": 400
    }
  ],
  "payment_method": "COD",
  "sub_total": 4000,
  "length": 100,
  "breadth": 50,
  "height": 10,
  "weight": 0.50,
  "pickup_location": "HomeNew",
  "vendor_details": {
    "email": "abcdd@abcdd.com",
    "phone": 9879879879,
    "name": "Coco Cookie",
    "address": "Street 1",
    "address_2": "",
    "city": "delhi",
    "state": "new delhi",
    "country": "india",
    "pin_code": "110077",
    "pickup_location": "HomeNew"
  }
}'
```

### Example Response

```json
{
  "status": 1,
  "payload": {
    "pickup_location_added": 0,
    "order_created": 1,
    "awb_generated": 1,
    "label_generated": 1,
    "pickup_generated": 1,
    "manifest_generated": 1,
    "pickup_scheduled_date": "2024-01-16 09:00:00",
    "pickup_booked_date": null,
    "order_id": 222521420,
    "shipment_id": 222002884,
    "awb_code": "14326421307048",
    "courier_company_id": 25,
    "courier_name": "Xpressbees 5kg",
    "assigned_date_time": {
      "date": "2024-01-15 13:52:05.051557",
      "timezone_type": 3,
      "timezone": "Asia/Kolkata"
    },
    "applied_weight": 10,
    "cod": 1,
    "label_url": "https://kr-shipmultichannel.s3.ap-southeast-1.amazonaws.com/25149/labels/shipping-label-222002884-14326421307048.pdf",
    "manifest_url": "https://s3-ap-southeast-1.amazonaws.com/kr-shipmultichannel/25149/manifest/MANIFEST-4757.pdf",
    "routing_code": "N/S-01/12B/2",
    "rto_routing_code": "",
    "pickup_token_number": "Reference No: 194_BIGFOOT 2540335_16012024"
  }
}
```

### Response Fields Explanation

| Field | Description |
|-------|-------------|
| pickup_location_added | 1 if new location added, 0 if existing used |
| order_created | 1 if order created successfully |
| awb_generated | 1 if AWB assigned successfully |
| label_generated | 1 if label generated |
| pickup_generated | 1 if pickup scheduled |
| manifest_generated | 1 if manifest generated |
| pickup_scheduled_date | Scheduled pickup date/time |
| order_id | Shiprocket order ID |
| shipment_id | Shiprocket shipment ID |
| awb_code | Tracking number |
| courier_company_id | Assigned courier ID |
| courier_name | Courier company name |
| applied_weight | Volumetric or actual weight used |
| cod | 1 for COD, 0 for Prepaid |
| label_url | Download URL for label PDF |
| manifest_url | Download URL for manifest PDF |
| routing_code | Courier routing code |
| pickup_token_number | Pickup reference number |

---

## 2. Return Wrapper API

Create return orders with AWB assignment and pickup scheduling in one call.

### Endpoint

```
POST /shipments/create/return-shipment
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Key Differences from Forward API

| Aspect | Forward Wrapper | Return Wrapper |
|--------|-----------------|----------------|
| pickup_location | Required | Not required |
| Label | Generated | Not generated |
| Manifest | Generated | Not generated |
| Pickup from | Seller warehouse | Customer address |
| Delivery to | Customer | Seller warehouse |

### Request Body Parameters

#### Order Details

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| order_id | YES | string | Unique return order ID | `r121579B09ap492` |
| order_date | YES | string | Order date | `2024-01-15` |
| channel_id | NO | integer | Channel ID | `2113680` |

#### Pickup Address (Customer Location)

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| pickup_customer_name | YES | string | Customer first name | `John` |
| pickup_last_name | NO | string | Customer last name | `Doe` |
| company_name | NO | string | Company name | `Amazon` |
| pickup_address | YES | string | Customer address | `Home` |
| pickup_address_2 | NO | string | Additional address | `DDA` |
| pickup_city | YES | string | Customer city | `Delhi` |
| pickup_state | YES | string | Customer state | `New Delhi` |
| pickup_country | YES | string | Customer country | `India` |
| pickup_pincode | YES | integer | Customer pincode | `110030` |
| pickup_email | YES | string | Customer email | `john@doe.com` |
| pickup_phone | YES | string | Customer phone | `9810363552` |
| pickup_isd_code | NO | string | ISD code | `91` |

#### Shipping Address (Return Destination - Seller)

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| shipping_customer_name | YES | string | Seller first name | `Jax` |
| shipping_last_name | NO | string | Seller last name | `Doe` |
| shipping_address | YES | string | Seller address | `Castle` |
| shipping_address_2 | NO | string | Additional address | `Bridge` |
| shipping_city | YES | string | Seller city | `Delhi` |
| shipping_state | YES | string | Seller state | `New Delhi` |
| shipping_country | YES | string | Seller country | `India` |
| shipping_pincode | YES | integer | Seller pincode | `110015` |
| shipping_email | YES | string | Seller email | `seller@shop.com` |
| shipping_phone | YES | integer | Seller phone | `8888888888` |
| shipping_isd_code | NO | string | ISD code | `91` |

#### Order Items with QC

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| order_items | YES | array | Array of return items | See below |
| name | YES | string | Product name | `shoes` |
| sku | YES | string | SKU | `WSH234` |
| units | YES | integer | Quantity | `1` |
| selling_price | YES | integer | Price | `100` |
| discount | NO | integer | Discount | `0` |
| qc_enable | NO | boolean | Enable QC | `true` |
| qc_product_name | CONDITIONAL | string | Product name for QC | `shoes` |
| qc_product_image | CONDITIONAL | string | Product image URL | `https://...jpg` |
| qc_brand | NO | string | Brand | `Levi` |

#### Payment & Dimensions

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| payment_method | YES | string | `PREPAID` (usually) | `PREPAID` |
| sub_total | YES | integer | Order subtotal | `400` |
| total_discount | NO | string | Total discount | `0` |
| length | YES | integer | Length (cm) | `11` |
| breadth | YES | integer | Breadth (cm) | `11` |
| height | YES | integer | Height (cm) | `11` |
| weight | YES | float | Weight (kg) | `0.5` |
| request_pickup | NO | boolean | Request pickup | `true` |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/shipments/create/return-shipment' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data-raw '{
  "order_id": "r121579B09ap492",
  "order_date": "2024-01-15",
  "channel_id": "2113680",
  "pickup_customer_name": "iron man",
  "pickup_last_name": "",
  "company_name": "iorn pvt ltd",
  "pickup_address": "b-123",
  "pickup_address_2": "",
  "pickup_city": "Delhi",
  "pickup_state": "New Delhi",
  "pickup_country": "India",
  "pickup_pincode": 110030,
  "pickup_email": "deadpool@red.com",
  "pickup_phone": "9810363552",
  "pickup_isd_code": "91",
  "shipping_customer_name": "Jax",
  "shipping_last_name": "Doe",
  "shipping_address": "Castle",
  "shipping_address_2": "Bridge",
  "shipping_city": "Delhi",
  "shipping_country": "India",
  "shipping_pincode": 110015,
  "shipping_state": "New Delhi",
  "shipping_email": "seller@shop.com",
  "shipping_isd_code": "91",
  "shipping_phone": 8888888888,
  "order_items": [
    {
      "name": "shoes",
      "qc_enable": true,
      "qc_product_name": "shoes",
      "sku": "WSH234",
      "units": 1,
      "selling_price": 100,
      "discount": 0,
      "qc_brand": "Levi",
      "qc_product_image": "https://example.com/product.jpg"
    }
  ],
  "payment_method": "PREPAID",
  "total_discount": "0",
  "sub_total": 400,
  "length": 11,
  "breadth": 11,
  "height": 11,
  "weight": 0.5,
  "request_pickup": true
}'
```

### Example Response

```json
{
  "status": 1,
  "payload": {
    "order_created": 1,
    "awb_generated": 1,
    "pickup_generated": 1,
    "pickup_scheduled_date": "2024-01-16 09:00:00",
    "order_id": 186255214,
    "shipment_id": 185783600,
    "awb_code": "24112321126686",
    "courier_company_id": 125,
    "courier_name": "Xpressbees Reverse",
    "assigned_date_time": {
      "date": "2024-01-15 16:34:06.963419",
      "timezone_type": 3,
      "timezone": "Asia/Kolkata"
    },
    "applied_weight": 0.5,
    "cod": 0,
    "is_return": 1,
    "routing_code": "N/S-01/13B/015",
    "rto_routing_code": "",
    "pickup_token_number": ""
  }
}
```

---

## Integration Examples

### Complete Forward Shipment Flow

```javascript
async function createForwardShipment(orderData) {
  const payload = {
    // Control flags
    mode: 'auto',
    request_pickup: true,
    print_label: true,
    generate_manifest: true,
    
    // Order details
    order_id: orderData.orderId,
    order_date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    
    // Billing
    billing_customer_name: orderData.customer.firstName,
    billing_last_name: orderData.customer.lastName,
    billing_address: orderData.customer.address,
    billing_city: orderData.customer.city,
    billing_state: orderData.customer.state,
    billing_country: 'India',
    billing_pincode: orderData.customer.pincode,
    billing_email: orderData.customer.email,
    billing_phone: orderData.customer.phone,
    shipping_is_billing: true,
    
    // Items
    order_items: orderData.items.map(item => ({
      name: item.name,
      sku: item.sku,
      units: item.quantity,
      selling_price: item.price
    })),
    
    // Payment
    payment_method: orderData.paymentMethod,
    sub_total: orderData.total,
    
    // Dimensions
    weight: orderData.weight,
    length: orderData.dimensions.length,
    breadth: orderData.dimensions.breadth,
    height: orderData.dimensions.height,
    
    // Pickup
    pickup_location: 'Primary Warehouse'
  };

  const response = await fetch(
    'https://apiv2.shiprocket.in/v1/external/shipments/create/forward-shipment',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  return response.json();
}
```

### Complete Return Shipment Flow

```javascript
async function createReturnShipment(returnData) {
  const payload = {
    order_id: `RET-${returnData.originalOrderId}`,
    order_date: new Date().toISOString().slice(0, 10),
    
    // Pickup from customer
    pickup_customer_name: returnData.customer.firstName,
    pickup_last_name: returnData.customer.lastName,
    pickup_address: returnData.customer.address,
    pickup_city: returnData.customer.city,
    pickup_state: returnData.customer.state,
    pickup_country: 'India',
    pickup_pincode: returnData.customer.pincode,
    pickup_email: returnData.customer.email,
    pickup_phone: returnData.customer.phone,
    
    // Return to warehouse
    shipping_customer_name: 'Warehouse Manager',
    shipping_address: 'Primary Warehouse',
    shipping_city: 'Delhi',
    shipping_state: 'Delhi',
    shipping_country: 'India',
    shipping_pincode: 110001,
    shipping_email: 'warehouse@shop.com',
    shipping_phone: 9999999999,
    
    // Return items
    order_items: returnData.items.map(item => ({
      name: item.name,
      sku: item.sku,
      units: item.quantity,
      selling_price: item.price,
      qc_enable: true,
      qc_product_name: item.name
    })),
    
    payment_method: 'PREPAID',
    sub_total: returnData.total,
    weight: returnData.weight,
    length: returnData.dimensions.length,
    breadth: returnData.dimensions.breadth,
    height: returnData.dimensions.height,
    request_pickup: true
  };

  const response = await fetch(
    'https://apiv2.shiprocket.in/v1/external/shipments/create/return-shipment',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  return response.json();
}
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Duplicate order_id" | Order ID already exists | Use unique order ID |
| "Invalid pickup_location" | Location doesn't exist | Create location or use vendor_details |
| "Pincode not serviceable" | Courier unavailable | Try different courier or contact support |
| "Invalid dimensions" | Weight/size out of range | Check courier limits |
| "COD not available" | Courier doesn't support COD | Use prepaid or different courier |

### Error Response Example

```json
{
  "status_code": 422,
  "message": "The order_id has already been taken.",
  "errors": {
    "order_id": ["The order_id has already been taken."]
  }
}
```

---

## Rate Limits

| API | Rate Limit |
|-----|------------|
| Forward Wrapper | 180 requests/minute |
| Return Wrapper | 180 requests/minute |

---

## Best Practices

1. **Use Unique Order IDs**: Prefix with date/time or use UUID
2. **Validate Pincodes**: Check serviceability before calling wrapper
3. **Store Response**: Save all IDs (order_id, shipment_id, awb_code)
4. **Handle Partial Success**: Some operations may succeed while others fail
5. **Download Documents**: Fetch label/manifest URLs immediately

---

## Related Documentation

- [Part 1: Authentication](./PART1_AUTH.md)
- [Part 2: Orders](./PART2_ORDERS.md)
- [Part 3: Couriers](./PART3_COURIERS.md)
- [Part 4: Returns & Exchanges](./PART4_RETURNS_EXCHANGES.md)
- [Part 5: Shipments](./PART5_SHIPMENTS.md)
- [Part 6: Labels, Manifests & Invoice](./PART6_LABELS_MANIFESTS.md)
