# Shiprocket API Documentation - Part 12: Products

## Overview

Use these APIs to get information on your added products or update their details in your Shiprocket account.

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## 1. Get All Products

Retrieve a list of all products in your Shiprocket account with pagination and filtering support.

### Endpoint

```
GET /products
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Query Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| page | No | integer | The page number to display | 5 |
| per_page | No | integer | Number of products per page | 10 |
| sort | No | string | Sort order: **ASC** or **DESC** | ASC |
| sort_by | No | string | Field to sort by (id, sku, created_at, etc.) | sku |
| filter | No | string | Value to filter by | 11223344 |
| filter_by | No | string | Field to filter by (id, sku, etc.) | id |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/products?page=1&per_page=10' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

**Status: 200 OK**

```json
{
  "data": [
    {
      "id": 17461637,
      "type": "Single",
      "sku": "1357",
      "name": "sgsg",
      "category_code": null,
      "category_name": null,
      "length": "0.00",
      "height": "0.00",
      "width": "0.00",
      "weight": "0.00",
      "hsn": null,
      "tax_code": null,
      "enabled": true,
      "created_at": "2018-10-22 10:34:22",
      "updated_at": "2018-10-22 10:34:22"
    }
  ],
  "meta": {
    "pagination": {
      "total": 12044,
      "count": 10,
      "per_page": 10,
      "current_page": 1,
      "total_pages": 1205,
      "links": {
        "next": "https://apiv2.shiprocket.in/v1/external/products?page=2"
      }
    }
  }
}
```

---

## 2. Get Specific Product Details

Retrieve details of a specific product by its ID.

### Endpoint

```
GET /products/show/{product_id}
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Path Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| product_id | Yes | integer | The ID of the product to retrieve |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/products/show/17461637' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

**Status: 200 OK**

```json
{
  "data": {
    "id": 17461637,
    "type": "Single",
    "sku": "1357",
    "name": "sgsg",
    "category_code": null,
    "category_name": null,
    "length": "0.00",
    "height": "0.00",
    "width": "0.00",
    "weight": "0.00",
    "hsn": null,
    "tax_code": null,
    "enabled": true,
    "created_at": "2018-10-22 10:34:22",
    "updated_at": "2018-10-22 10:34:22"
  }
}
```

---

## 3. Add New Products

Add a new product to your Shiprocket catalog.

### Endpoint

```
POST /products
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| sku* | Yes | string | Unique Stock Keeping Unit identifier | SKU12345 |
| name* | Yes | string | Product name | Blue Polo T-shirt |
| type* | Yes | string | Product type: **Single** or **Multiple** | Single |
| qty* | Yes | integer | Product quantity | 12 |
| category_code* | Yes | string | Category code for the product | default |
| HSN | No | string | Harmonized System of Nomenclature code | 1234567 |
| tax_code | No | integer | Tax code assigned to product | 5 |
| low_stock | No | integer | Low stock warning threshold | 3 |
| description | No | string | Product description | Premium cotton t-shirt |
| brand | No | string | Brand name | Nike |
| size | No | string | Product size | L |
| weight | No | decimal | Weight in kg | 0.5 |
| length | No | decimal | Length in cm | 50 |
| width | No | decimal | Width in cm | 35 |
| height | No | decimal | Height in cm | 12 |
| ean | No | string | European Article Number (13 digits) | 1234567891011 |
| upc | No | string | Universal Product Code | 123456789012 |
| isbn | No | string | International Standard Book Number | 978-3-16-148410-0 |
| color | No | string | Product color | Blue |
| imei_serialnumber | No | string | IMEI type: **IMEI** or **SerialNumber** | IMEI |
| cost_price | No | decimal | Cost price of product | 500 |
| mrp | No | decimal | Maximum Retail Price | 1000 |
| status | No | boolean | Product status (active/inactive) | true |
| image_url | No | string | URL of product image | https://example.com/image.jpg |

### QC (Quality Check) Product Parameters

For QC-enabled products, additional parameters are required:

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| product_image | Conditional | string | Product image URL for QC verification | https://abc/xyz.jpg |
| brand | Conditional | string | Brand name visible on product | Nike |
| brand_tag | Conditional | string | Brand tag affixed to item | Nike Original |
| color | Conditional | string | Product color for verification | Red |
| size | Conditional | string | Size on label/tag | M |
| product_imei | Conditional | string | 15-digit IMEI number | 123456789012345 |
| serial_no | Conditional | string | Product serial number | SN12345 |

> **Note:** QC parameters become mandatory when converting a product to QC product.

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/products' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "sku": "SKU12345",
  "name": "Blue Polo T-shirt XL",
  "type": "Single",
  "qty": 100,
  "category_code": "default",
  "HSN": "1234567",
  "tax_code": 5,
  "weight": 0.5,
  "length": 50,
  "width": 35,
  "height": 12,
  "color": "Blue",
  "brand": "Nike",
  "size": "XL",
  "mrp": 1500,
  "cost_price": 800
}'
```

### Example Response

**Status: 201 Created**

No response body is returned on successful creation.

---

## 4. Convert to QC Product

Convert an existing product to a Quality Check (QC) enabled product.

### Endpoint

```
POST /products/qc-product-update/{productID}
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Path Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| productID | Yes | integer | The ID of the product to convert |

### Request Body Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| sku | Yes | string | Product SKU | PROD12345 |
| product_image | No | string | Product image URL for QC | https://example.com/image.jpg |
| brand_box | No | string | Brand name on packaging | shiprocket |
| brand | No | string | Brand name on product | Nike |
| color | No | string | Product color | Red |
| size | No | string | Product size | M |
| serial_no | No | string | Serial number | 12345 |
| product_imei | No | string | 15-digit IMEI number | 1234567890 |
| check_damaged_product | No | integer | Enable damage check (0 or 1) | 0 |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/products/qc-product-update/76216' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
  "sku": "PROD12345",
  "product_image": "https://example.com/product-image.jpg",
  "brand_box": "12323chacha",
  "brand": "blue",
  "color": "Red",
  "size": "M",
  "serial_no": "",
  "check_damaged_product": 0
}'
```

### Example Response

**Status: 200 OK**

```json
{
  "status": 200,
  "message": "Product details updated successfully!"
}
```

---

## 5. Bulk Import Products

Import multiple products at once using a CSV file.

### Endpoint

```
POST /products/import
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Request Body (Form Data)

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| file | Yes | file | CSV file containing product data |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/products/import' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--form 'file=@"/path/to/products.csv"'
```

### Example Response

**Status: 200 OK**

```json
{
  "id": 20290943
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Import job ID for tracking the bulk import operation |

---

## 6. Get Sample CSV Format

Download a sample CSV file format for bulk product import.

### Endpoint

```
GET /products/sample
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/products/sample' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

**Status: 200 OK**

The response is a CSV file with the following columns:

```csv
"Category Name","*Master Sku Code","*Product Name","Low Stock Warning At","Description","Length (cm)","Width (cm)","Height (cm)","Weight (kgs)","ean","upc","isbn","Color","Brand","Size","Tax Code","Image Url","Custom Detail Fields (IMEI/SerialNumber)","MRP","Cost Price","Active(True/False)","Type(Single)","HSN code"
"Below given is the sample data. Please delete the same and create/upload data as per you requirements. ","","","","","","","","","","","","","","","","","","","","","",""
"Default","Tshirt-Blue-42","Blue tshirt 42 size","2","blue polo tshirt with round collor large size","50","42","","500","1235467891111","","","blue","nike","42","5","http://www.example.com/tshirt.jpg","","2500","1500","","",""
"Electronics","Iphone5s","Iphone5s","1","iphone 5s with 1 year warranty...","","","","","","","","Black","Iphone","","","","IMEI","20000","","","",""
```

### Response Headers

| Header | Value |
|--------|-------|
| Content-Type | application/csv; charset=UTF-8 |
| Content-Disposition | attachment; filename="export-YYYY-MM-DD.csv" |

---

## CSV Column Reference

| Column | Required | Description |
|--------|----------|-------------|
| Category Name | No | Product category (e.g., Default, Electronics) |
| *Master Sku Code | Yes | Unique SKU identifier |
| *Product Name | Yes | Name of the product |
| Low Stock Warning At | No | Quantity threshold for low stock alert |
| Description | No | Product description |
| Length (cm) | No | Length in centimeters |
| Width (cm) | No | Width in centimeters |
| Height (cm) | No | Height in centimeters |
| Weight (kgs) | No | Weight in kilograms |
| ean | No | European Article Number |
| upc | No | Universal Product Code |
| isbn | No | International Standard Book Number |
| Color | No | Product color |
| Brand | No | Brand name |
| Size | No | Product size |
| Tax Code | No | Tax code |
| Image Url | No | Product image URL |
| Custom Detail Fields | No | IMEI or SerialNumber type |
| MRP | No | Maximum Retail Price |
| Cost Price | No | Cost price |
| Active(True/False) | No | Product status |
| Type(Single) | No | Product type |
| HSN code | No | HSN code |

---

## Notes

- Fields marked with * are required
- Use the sample CSV as a template for bulk imports
- Product SKU must be unique across your catalog
- QC products require additional verification fields
- Dimensions should be in centimeters, weight in kilograms
