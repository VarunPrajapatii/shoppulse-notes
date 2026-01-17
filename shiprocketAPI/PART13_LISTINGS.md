# Shiprocket API Documentation - Part 13: Listings

## Overview

Listings APIs allow you to manage product listings across different sales channels integrated with your Shiprocket account. A listing represents a product associated with a specific channel (e.g., Shopify, WooCommerce, Custom).

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## 1. Get All Listings

Retrieve all product listings in your Shiprocket account, including products associated with specific channels.

### Endpoint

```
GET /listings
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Query Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| page | No | integer | Page number to display | 5 |
| per_page | No | integer | Number of listings per page | 2 |
| sort | No | string | Sort order: **ASC** or **DESC** | ASC |
| sort_by | No | string | Field to sort by (id, sku, created_at, etc.) | sku |
| filter | No | string | Value to filter by | 11223344 |
| filter_by | No | string | Field to filter by (id, sku, etc.) | id |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/listings' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

**Status: 200 OK**

```json
{
  "data": [
    {
      "id": 15897064,
      "title": "Kunai",
      "image": null,
      "price": "900.00",
      "quantity": 0,
      "sku": "chakra123",
      "channel_sku": "chakra123",
      "channel_id": 76893,
      "channel_name": "CUSTOM",
      "base_channel_code": "CS",
      "channel_product_id": "",
      "inventory": 41,
      "synced_on": "Never Synced",
      "product": {
        "dimensions": {
          "length": "0.000",
          "width": "0.000",
          "height": "0.000"
        },
        "weight": "0.000"
      },
      "category_name": ""
    },
    {
      "id": 14312566,
      "title": "Ferrari Pitstop Black iPhone 7 Case",
      "image": null,
      "price": "100.00",
      "quantity": 0,
      "sku": "SW-546",
      "channel_sku": "SW-546",
      "channel_id": 76893,
      "channel_name": "CUSTOM",
      "base_channel_code": "CS",
      "channel_product_id": "",
      "inventory": 0,
      "synced_on": "Never Synced",
      "product": {
        "dimensions": {
          "length": "0.000",
          "width": "0.000",
          "height": "0.000"
        },
        "weight": "0.000"
      },
      "category_name": ""
    }
  ],
  "meta": {
    "pagination": {
      "total": 12345,
      "count": 2,
      "per_page": 2,
      "current_page": 1,
      "total_pages": 6173,
      "links": {
        "next": "https://apiv2.shiprocket.in/v1/external/listings?page=2"
      }
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Listing ID |
| title | string | Product title in the channel |
| image | string/null | Product image URL |
| price | string | Product price |
| quantity | integer | Quantity in channel |
| sku | string | Master SKU |
| channel_sku | string | SKU in the channel |
| channel_id | integer | Channel integration ID |
| channel_name | string | Name of the channel |
| base_channel_code | string | Channel code (CS=Custom, WC=WooCommerce, etc.) |
| channel_product_id | string | Product ID in the channel |
| inventory | integer | Current inventory count |
| synced_on | string | Last sync timestamp |
| product.dimensions | object | Product dimensions (length, width, height) |
| product.weight | string | Product weight |
| category_name | string | Product category |

---

## 2. Map Channel Product

Map a product from a channel catalogue to a product in the master catalogue.

### Endpoint

```
POST /listings/link
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| product_id | Yes | integer | ID of the product in master catalog | 17908342 |
| listing_id | Yes | integer | ID of the product in channel catalog | 15897064 |
| ID | No | integer | Alternative ID reference | 15897064 |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/listings/link' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "product_id": 17908342,
  "listing_id": 15897064
}'
```

### Example Response

**Status: 200 OK**

```json
{
  "message": "Linking success",
  "status_code": 200
}
```

---

## 3. Import Catalog Mappings

Import channel catalogue to master catalogue mappings from a CSV file.

### Endpoint

```
POST /listings/import
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body (Form Data)

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| file | Yes | file | CSV file containing mapping data |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/listings/import' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--form 'file=@"/path/to/mappings.csv"'
```

### Example Response

**Status: 200 OK**

```json
{
  "id": 12345678
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Import job ID |

---

## 4. Export Catalog Mappings

Download the list of mapped items between channel catalogue and master catalogue.

### Endpoint

```
GET /listings/export
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/listings/export' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

**Status: 200 OK**

```json
{
  "download_url": "https://s3-ap-southeast-1.amazonaws.com/kr-shipmultichannel/imports/c_67216/export-2019-08-051564990885.csv"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| download_url | string | Pre-signed S3 URL to download the CSV export |

---

## Channel Codes Reference

| Code | Channel |
|------|---------|
| CS | Custom |
| WC | WooCommerce |
| SP | Shopify |
| MG | Magento |
| AM | Amazon |
| FK | Flipkart |
| EB | eBay |

---

## Notes

- **Master Catalogue**: Your central product database in Shiprocket
- **Channel Catalogue**: Products synced from integrated sales channels
- **Mapping**: Links channel products to master products for unified inventory management
- Use the export feature to review current mappings before making bulk changes
- Import mappings in bulk using CSV for efficiency
- Synced products show inventory across all mapped channels
