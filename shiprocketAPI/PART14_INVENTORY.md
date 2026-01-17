# Shiprocket API Documentation - Part 14: Inventory

## Overview

Use these APIs to retrieve and update inventory details for your products in Shiprocket.

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## 1. Get Inventory Details

Retrieve inventory details for all products with pagination and filtering support.

### Endpoint

```
GET /inventory
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Query Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| page | No | integer | Page number to display | 4 |
| per_page | No | integer | Number of products per page | 2 |
| sort | No | string | Sort order: **ASC** or **DESC** | ASC |
| sort_by | No | string | Field to sort by (id, sku, created_at, etc.) | sku |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/inventory' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

**Status: 200 OK**

```json
{
  "data": [
    {
      "id": 3448631,
      "sku": "123",
      "category_name": "Default Category",
      "is_combo": 0,
      "name": "gsdgw",
      "type": "Single",
      "color": "",
      "brand": "",
      "total_quantity": 6,
      "available_quantity": 6,
      "blocked_quantity": 0,
      "updated_on": "15 Oct 2018 04:14 PM"
    },
    {
      "id": 3448637,
      "sku": "BlackTshirt",
      "category_name": "Default Category",
      "is_combo": 0,
      "name": "Black tshirt XL",
      "type": "Single",
      "color": "",
      "brand": "",
      "total_quantity": 12,
      "available_quantity": 12,
      "blocked_quantity": 0,
      "updated_on": "23 Jan 2019 12:03 PM"
    }
  ],
  "meta": {
    "pagination": {
      "total": 12080,
      "count": 2,
      "per_page": 2,
      "current_page": 1,
      "total_pages": 6040,
      "links": {
        "next": "https://apiv2.shiprocket.in/v1/external/inventory?page=2"
      }
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Product ID |
| sku | string | Stock Keeping Unit |
| category_name | string | Product category |
| is_combo | integer | Whether product is a combo (0=No, 1=Yes) |
| name | string | Product name |
| type | string | Product type (Single/Multiple) |
| color | string | Product color |
| brand | string | Brand name |
| total_quantity | integer | Total inventory quantity |
| available_quantity | integer | Available quantity for sale |
| blocked_quantity | integer | Quantity blocked/reserved |
| updated_on | string | Last update timestamp |

### Inventory Calculation

```
total_quantity = available_quantity + blocked_quantity
```

- **available_quantity**: Stock available for new orders
- **blocked_quantity**: Stock reserved for pending orders or holds

---

## 2. Update Inventory

Update the inventory quantity for a specific product.

### Endpoint

```
PUT /inventory/{product_id}/update
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Path Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| product_id | Yes | integer | Product ID to update inventory for |

> **Note:** Get the `product_id` using the "Get Inventory Details" API.

### Request Body Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| quantity | Yes | integer | Quantity to add, remove, or set | 2 |
| action | Yes | string | Action to perform on inventory | add |

### Action Values

| Action | Description |
|--------|-------------|
| **add** | Add the specified quantity to current inventory |
| **remove** | Subtract the specified quantity from current inventory |
| **replace** | Replace current inventory with the specified quantity |

### Example Request

```bash
curl --location --request PUT 'https://apiv2.shiprocket.in/v1/external/inventory/17454637/update' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "quantity": 2,
  "action": "remove"
}'
```

### Example Response

**Status: 200 OK**

```json
{
  "data": {
    "available_quantity": 51,
    "blocked_quantity": 0,
    "total_quantity": 51
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| available_quantity | integer | Updated available quantity |
| blocked_quantity | integer | Current blocked quantity |
| total_quantity | integer | Updated total quantity |

---

## Usage Examples

### Add Inventory

Add 10 units to existing stock:

```bash
curl --location --request PUT 'https://apiv2.shiprocket.in/v1/external/inventory/17454637/update' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "quantity": 10,
  "action": "add"
}'
```

### Remove Inventory

Remove 5 units from existing stock:

```bash
curl --location --request PUT 'https://apiv2.shiprocket.in/v1/external/inventory/17454637/update' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "quantity": 5,
  "action": "remove"
}'
```

### Replace Inventory

Set inventory to exactly 100 units:

```bash
curl --location --request PUT 'https://apiv2.shiprocket.in/v1/external/inventory/17454637/update' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "quantity": 100,
  "action": "replace"
}'
```

---

## Notes

- **Blocked Quantity**: Inventory reserved for orders that are not yet shipped
- **Available Quantity**: Inventory that can be used for new orders
- Use `replace` action carefully as it overwrites the current inventory
- The `remove` action will fail if the quantity to remove exceeds available inventory
- Inventory updates are reflected immediately across all integrated channels
- Consider using bulk import for updating multiple product inventories at once
