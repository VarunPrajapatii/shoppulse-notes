# Shiprocket API - Statement Details

This section covers the API for retrieving account statement details from your Shiprocket account.

---

## Get Statement Details

Retrieve the account statement details including transaction history, wallet balance, and shipping charges.

### Endpoint

```
GET https://apiv2.shiprocket.in/v1/external/account/details/statement
```

### Description

Use this API to get comprehensive account statement details including:
- Transaction records
- Order and shipment information
- Weight details (applied, charged, billed)
- Credit and debit amounts
- Wallet balance

### Headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <your_token>` |

### Query Parameters

All parameters are optional - use them to filter and paginate results.

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | integer | NO | The page number to display | `5` |
| `per_page` | integer | NO | Number of records per request | `2` |
| `from` | string | NO | Start date for filtering (YYYY-MM-DD format) | `2017-08-12` |
| `to` | string | NO | End date for filtering (YYYY-MM-DD format) | `2017-09-12` |

### Example Request

**Basic Request (no filters):**
```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/account/details/statement' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

**With Date Range:**
```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/account/details/statement?from=2023-01-01&to=2023-12-31' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

**With Pagination:**
```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/account/details/statement?page=1&per_page=50' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

```json
{
  "data": [
    {
      "transaction_id": "",
      "order_id": "",
      "channel_order_id": "",
      "awb_code": "",
      "return_awb_code": null,
      "applied_weight": "",
      "charged_weight": "",
      "billed_weight": "",
      "action": "",
      "charge": "",
      "description": "Wallet Balance",
      "debit_amount": "",
      "credit_amount": "",
      "balance_amount": "0",
      "balance_weight": 0,
      "volumetric_weight": "",
      "entered_weight": "",
      "created_at": "",
      "can_ship": true
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `transaction_id` | string | Unique transaction identifier |
| `order_id` | string | Shiprocket order ID |
| `channel_order_id` | string | Order ID from the sales channel |
| `awb_code` | string | Air Waybill number for forward shipment |
| `return_awb_code` | string/null | AWB number for return shipment (if applicable) |
| `applied_weight` | string | Weight applied to the shipment |
| `charged_weight` | string | Weight charged by courier |
| `billed_weight` | string | Final billed weight |
| `action` | string | Type of transaction action |
| `charge` | string | Charge type description |
| `description` | string | Transaction description |
| `debit_amount` | string | Amount debited from wallet |
| `credit_amount` | string | Amount credited to wallet |
| `balance_amount` | string | Current wallet balance after transaction |
| `balance_weight` | number | Weight balance (for weight-based plans) |
| `volumetric_weight` | string | Calculated volumetric weight |
| `entered_weight` | string | Weight entered by user at order creation |
| `created_at` | string | Transaction creation timestamp |
| `can_ship` | boolean | Whether shipping is allowed with current balance |

---

## Use Cases

### Financial Reconciliation
Use the statement API to reconcile shipping charges with your internal accounting:
1. Fetch statements for a date range
2. Match transactions with your order records
3. Verify charges against expected amounts

### Balance Monitoring
Monitor wallet balance to ensure sufficient funds:
```javascript
const response = await fetch('/account/details/statement');
const data = await response.json();
const latestBalance = data.data[0]?.balance_amount;
if (parseFloat(latestBalance) < 1000) {
  // Alert: Low balance
}
```

### Weight Discrepancy Tracking
Track weight discrepancies between entered and charged weights:
- `entered_weight`: What you declared
- `charged_weight`: What courier measured
- `billed_weight`: Final weight for billing

### Generating Reports
Export statement data for specific periods for accounting or analysis:
```bash
# Get all transactions for Q4 2023
curl --location 'https://apiv2.shiprocket.in/v1/external/account/details/statement?from=2023-10-01&to=2023-12-31&per_page=1000'
```

---

## Notes

- The statement is returned in reverse chronological order (newest first)
- Use pagination for large datasets to avoid timeouts
- The `can_ship` flag indicates if the current balance allows new shipments
- Weight-related fields may be empty for non-shipment transactions (like wallet recharge)
