# Shiprocket API - File Imports

This section covers the API for checking the status and results of file imports in Shiprocket.

---

## Get File Import Results

Check the import status and error details for files uploaded via the API.

### Endpoint

```
GET https://apiv2.shiprocket.in/v1/external/errors/{import_id}/check
```

### Description

This API allows you to check the import response for various file imports including:
- Bulk order imports
- Product imports
- Product listing imports

Use this API to:
- Verify if an import was successful
- Get detailed error messages if the import failed
- Check the processing status of large imports

### Headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <your_token>` |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `import_id` | integer | YES | The import ID returned when uploading a file |

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/errors/20212061/check' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response - Error

```json
{
  "data": {
    "status": "3",
    "message": "Error in reading file data! Please check that the column names are same as that in the sample file provided."
  }
}
```

### Example Response - Success

```json
{
  "data": {
    "status": "1",
    "message": "Import completed successfully",
    "total_records": 100,
    "successful_records": 98,
    "failed_records": 2,
    "errors": [
      {
        "row": 15,
        "error": "Invalid pincode format"
      },
      {
        "row": 42,
        "error": "Product SKU already exists"
      }
    ]
  }
}
```

### Example Response - Processing

```json
{
  "data": {
    "status": "2",
    "message": "Import is being processed. Please check again later.",
    "progress": 65
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Import status code (see status codes below) |
| `message` | string | Human-readable status message |
| `total_records` | integer | Total records in the import file |
| `successful_records` | integer | Number of successfully imported records |
| `failed_records` | integer | Number of failed records |
| `errors` | array | List of errors with row numbers |
| `progress` | integer | Processing progress percentage (when in progress) |

### Status Codes

| Status | Description |
|--------|-------------|
| `1` | Success - Import completed |
| `2` | Processing - Import in progress |
| `3` | Error - Import failed |
| `4` | Partial Success - Some records failed |

---

## Common Import Errors

### File Format Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Error in reading file data!" | Column names don't match sample file | Download sample CSV and match column headers exactly |
| "Invalid file format" | Unsupported file type | Use CSV or XLS format only |
| "File is empty" | No data rows in file | Ensure file has data after header row |

### Data Validation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid pincode format" | Pincode doesn't match expected format | Use 6-digit numeric pincode |
| "Product SKU already exists" | Duplicate SKU | Use unique SKU or update existing product |
| "Required field missing" | Mandatory column is empty | Fill all required fields |
| "Invalid weight format" | Weight not in correct format | Use numeric value in kg |

---

## Import Workflow

### 1. Upload File

First, upload your file using the appropriate import API (e.g., bulk orders, products):

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/orders/import' \
--header 'Authorization: Bearer {{token}}' \
--form 'file=@"/path/to/orders.csv"'
```

Response:
```json
{
  "import_id": 20212061,
  "message": "File uploaded successfully. Processing will begin shortly."
}
```

### 2. Check Import Status

Poll the import status API until processing is complete:

```javascript
async function checkImportStatus(importId) {
  const maxAttempts = 10;
  const delayMs = 5000; // 5 seconds
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `https://apiv2.shiprocket.in/v1/external/errors/${importId}/check`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const data = await response.json();
    
    switch (data.data.status) {
      case '1':
        console.log('✅ Import successful!');
        return data;
      case '2':
        console.log(`⏳ Processing: ${data.data.progress || 0}%`);
        await sleep(delayMs);
        break;
      case '3':
        console.error('❌ Import failed:', data.data.message);
        throw new Error(data.data.message);
      case '4':
        console.warn('⚠️ Partial success');
        console.log(`Success: ${data.data.successful_records}, Failed: ${data.data.failed_records}`);
        return data;
    }
  }
  
  throw new Error('Import timeout - exceeded maximum attempts');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 3. Handle Results

Process the import results:

```javascript
const result = await checkImportStatus(importId);

if (result.data.failed_records > 0) {
  console.log('Failed records:');
  result.data.errors.forEach(error => {
    console.log(`  Row ${error.row}: ${error.error}`);
  });
  
  // Optionally: Export failed rows for correction and re-import
}
```

---

## Best Practices

### Before Import

1. **Use Sample Files**: Always download and use the official sample CSV format
2. **Validate Data**: Check data format before uploading
3. **Test with Small Batch**: Test with a few records first
4. **Remove Special Characters**: Clean data of problematic characters

### During Import

1. **Don't Close Browser**: If importing via web, keep the session active
2. **Check Progress**: For large files, poll status periodically
3. **Document Import IDs**: Keep track of import IDs for troubleshooting

### After Import

1. **Verify Records**: Spot-check imported records
2. **Address Errors**: Fix failed records and re-import if needed
3. **Keep Logs**: Maintain import history for audit purposes

---

## API Related to Imports

These APIs provide import IDs that can be checked with this API:

| API | Description |
|-----|-------------|
| `POST /orders/import` | Bulk order import |
| `POST /products/import` | Bulk product import |
| `POST /listings/import` | Catalog mapping import |

See respective documentation sections for details on these import APIs.
