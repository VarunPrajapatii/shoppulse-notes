# Shiprocket API Reference - Part 6: Labels, Manifests & Invoice

## Overview

This document covers Shiprocket's document generation APIs for shipping labels, manifests, and invoices.

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## Document Generation Flow

```
Order Created → AWB Assigned → Generate Label → Generate Manifest → Generate Invoice
                                    ↓                  ↓                  ↓
                              Print for box      Print for courier    Print for package
```

### Document Types

| Document | Purpose | When to Generate |
|----------|---------|------------------|
| **Label** | Shipping label with barcode, address, AWB | After AWB assignment, before pickup |
| **Manifest** | Pickup summary for courier | Before courier pickup |
| **Invoice** | Commercial invoice for shipment | For record keeping & COD |

---

## 1. Generate Manifest

Generate manifest documents for shipments. Manifests are required by couriers during pickup.

### Endpoint

```
POST /manifests/generate
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| shipment_id | YES | array | Array of shipment IDs | [222002884, 222002885] |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/manifests/generate' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "shipment_id": [222002884, 222002885]
}'
```

### Request Body Example

```json
{
  "shipment_id": [222002884, 222002885]
}
```

### Example Response

```json
{
  "status": 1,
  "manifest_url": "https://s3-ap-southeast-1.amazonaws.com/kr-shipmultichannel/25149/manifest/MANIFEST-4757.pdf",
  "manifest_id": 4757,
  "shipment_count": 2
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| status | integer | 1 for success |
| manifest_url | string | URL to download manifest PDF |
| manifest_id | integer | Unique manifest identifier |
| shipment_count | integer | Number of shipments in manifest |

### Use Cases

1. **Pickup Preparation**: Generate manifest before scheduled pickup
2. **Batch Processing**: Combine multiple shipments into one manifest
3. **Courier Handover**: Print for courier during pickup

---

## 2. Print Manifest

Print/download manifests for specific orders.

### Endpoint

```
POST /manifests/print
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| order_ids | YES | array | Array of order IDs | [222521420, 222521421] |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/manifests/print' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "order_ids": [222521420, 222521421]
}'
```

### Request Body Example

```json
{
  "order_ids": [222521420, 222521421]
}
```

### Example Response

```json
{
  "status": 1,
  "manifest_url": "https://s3-ap-southeast-1.amazonaws.com/kr-shipmultichannel/25149/manifest/MANIFEST-4757.pdf"
}
```

### Difference: Generate vs Print

| Generate Manifest | Print Manifest |
|-------------------|----------------|
| Uses `shipment_id` | Uses `order_ids` |
| Creates new manifest | Retrieves existing manifest |
| Assigns manifest ID | Returns existing PDF |

---

## 3. Generate Label

Generate shipping labels for shipments. Labels contain barcodes, AWB, and delivery address.

### Endpoint

```
POST /courier/generate/label
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| shipment_id | YES | array | Array of shipment IDs | [222002884] |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/courier/generate/label' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "shipment_id": [222002884]
}'
```

### Request Body Example

```json
{
  "shipment_id": [222002884, 222002885]
}
```

### Example Response

```json
{
  "label_created": 1,
  "response": "",
  "label_url": "https://kr-shipmultichannel.s3.ap-southeast-1.amazonaws.com/25149/labels/shipping-label-222002884-14326421307048.pdf",
  "not_created": ""
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| label_created | integer | Number of labels created |
| label_url | string | URL to download label PDF |
| not_created | string | IDs of labels that couldn't be created |
| response | string | Additional response message |

### Label Contents

A shipping label typically includes:
- **AWB Barcode**: Scannable barcode for tracking
- **AWB Number**: Human-readable tracking number
- **Sender Details**: Pickup location name and address
- **Receiver Details**: Shipping customer name and address
- **Product Details**: Item names, quantity
- **Weight/Dimensions**: Package specifications
- **Payment Method**: COD amount or Prepaid indicator
- **Routing Code**: Courier sorting code

### Use Cases

1. **Order Fulfillment**: Generate label when packing order
2. **Batch Printing**: Generate labels for multiple shipments
3. **Reprinting**: Regenerate damaged or lost labels

---

## 4. Generate Invoice

Generate commercial invoices for orders.

### Endpoint

```
POST /orders/print/invoice
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| ids | YES | array | Array of order IDs | [222521420] |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/print/invoice' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "ids": [222521420, 222521421]
}'
```

### Request Body Example

```json
{
  "ids": [222521420, 222521421]
}
```

### Example Response

```json
{
  "is_invoice_created": true,
  "invoice_url": "https://s3-ap-southeast-1.amazonaws.com/kr-shipmultichannel/25149/invoices/invoice-222521420.pdf",
  "not_created": []
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| is_invoice_created | boolean | Whether invoice was created |
| invoice_url | string | URL to download invoice PDF |
| not_created | array | Order IDs that couldn't be invoiced |

### Invoice Contents

A shipping invoice typically includes:
- **Seller Details**: Company name, address, GSTIN
- **Buyer Details**: Customer name, address
- **Order Details**: Order ID, date
- **Item Details**: Product name, SKU, quantity, price
- **Tax Details**: HSN code, GST breakdown
- **Total Amount**: Subtotal, taxes, final amount
- **Payment Method**: COD/Prepaid indicator

### Use Cases

1. **Package Inclusion**: Print invoice to include in package
2. **COD Orders**: Mandatory for cash collection
3. **GST Compliance**: Required for tax records
4. **Customer Records**: Provide to customer as purchase proof

---

## Batch Document Generation

### Recommended Workflow

```javascript
async function generateAllDocuments(shipmentIds, orderIds) {
  const results = {
    labels: null,
    manifest: null,
    invoices: null
  };

  // 1. Generate Labels (required first)
  results.labels = await fetch(
    'https://apiv2.shiprocket.in/v1/external/courier/generate/label',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ shipment_id: shipmentIds })
    }
  ).then(r => r.json());

  // 2. Generate Manifest
  results.manifest = await fetch(
    'https://apiv2.shiprocket.in/v1/external/manifests/generate',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ shipment_id: shipmentIds })
    }
  ).then(r => r.json());

  // 3. Generate Invoices
  results.invoices = await fetch(
    'https://apiv2.shiprocket.in/v1/external/orders/print/invoice',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids: orderIds })
    }
  ).then(r => r.json());

  return results;
}
```

### Download Documents

```javascript
async function downloadDocument(url, filename) {
  const response = await fetch(url);
  const blob = await response.blob();
  
  // Browser download
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  
  // Cleanup
  URL.revokeObjectURL(link.href);
}

// Usage
downloadDocument(labelUrl, 'shipping-label.pdf');
downloadDocument(manifestUrl, 'manifest.pdf');
downloadDocument(invoiceUrl, 'invoice.pdf');
```

---

## Document Requirements by Courier

Different couriers may have specific requirements:

| Courier | Label Required | Manifest Required | Invoice Required |
|---------|----------------|-------------------|------------------|
| Delhivery | ✅ | ✅ | COD only |
| BlueDart | ✅ | ✅ | ✅ |
| Xpressbees | ✅ | ✅ | COD only |
| Ecom Express | ✅ | ✅ | COD only |
| DTDC | ✅ | ✅ | ✅ |

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "AWB not assigned" | Label requested before AWB | Wait for AWB assignment |
| "Shipment not found" | Invalid shipment ID | Verify shipment ID |
| "Already generated" | Document exists | Use print endpoint instead |
| "Invalid order ID" | Order doesn't exist | Verify order ID |

### Error Response Example

```json
{
  "status_code": 400,
  "message": "AWB not assigned for shipment 222002884",
  "error": "LABEL_GENERATION_FAILED"
}
```

---

## Rate Limits

| API | Rate Limit |
|-----|------------|
| Generate Label | 180 requests/minute |
| Generate Manifest | 180 requests/minute |
| Print Manifest | 180 requests/minute |
| Generate Invoice | 180 requests/minute |

---

## Best Practices

1. **Generate Early**: Generate labels immediately after AWB assignment
2. **Batch Processing**: Generate documents for multiple shipments together
3. **Cache URLs**: Store document URLs to avoid regeneration
4. **Verify Downloads**: Ensure documents download before pickup
5. **Backup**: Keep copies of all generated documents

---

## Related Documentation

- [Part 1: Authentication](./PART1_AUTH.md)
- [Part 2: Orders](./PART2_ORDERS.md)
- [Part 3: Couriers](./PART3_COURIERS.md)
- [Part 4: Returns & Exchanges](./PART4_RETURNS_EXCHANGES.md)
- [Part 5: Shipments](./PART5_SHIPMENTS.md)
- [Part 7: Wrapper API](./PART7_WRAPPER_API.md)
