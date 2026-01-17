# Shiprocket API Documentation - Part 11: Account

## Overview

The Account APIs allow you to retrieve account-related information such as wallet balance.

**Base URL:** `https://apiv2.shiprocket.in/v1/external`

---

## 1. Get Wallet Balance

Retrieve the current wallet balance for your Shiprocket account.

### Endpoint

```
GET /account/details/wallet-balance
```

### Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer {token} |

### Parameters

No parameters required.

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/account/details/wallet-balance' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

**Status: 200 OK**

```json
{
  "data": {
    "balance_amount": "-291539.83"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| data.balance_amount | string | Current wallet balance amount (can be negative if credit is used) |

---

## Notes

- The wallet balance is returned as a string to preserve decimal precision
- Negative balance indicates credit usage or outstanding amount
- Balance is typically in INR (Indian Rupees)
