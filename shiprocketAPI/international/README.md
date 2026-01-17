# Shiprocket International API Documentation

This folder contains documentation for Shiprocket's **International Shipping APIs** - endpoints specifically designed for cross-border e-commerce operations and international shipments.

## Overview

International APIs are specialized endpoints for handling international orders and shipments from India to other countries. They include features for:

- **Export compliance** (KYC, customs documentation)
- **Multi-currency support** (USD, EUR, GBP, etc.)
- **International couriers** (DHL, FedEx, India Post International)
- **Customs documentation** (HSN codes, IGST status, export reasons)

## Base URL

```
https://apiv2.shiprocket.in/v1/external/international/
```

## Documentation Files

| Part | Title | APIs Covered |
|------|-------|--------------|
| [PART1](./PART1_TRACKING.md) | Tracking APIs | Track via AWB, Shipment ID, Order ID, International Orders |
| [PART2](./PART2_KYC.md) | KYC & Compliance | International KYC submission |
| [PART3](./PART3_ORDERS.md) | Order Management | Create & Update International Orders |
| [PART4](./PART4_SHIPMENTS.md) | Shipments | Wrapper API, AWB Assignment |
| [PART5](./PART5_MANIFEST_PICKUP.md) | Manifest & Pickup | Manifest Generation, Pickup Requests |

## Key Differences from Domestic APIs

| Feature | Domestic | International |
|---------|----------|---------------|
| Base URL | `/external/` | `/external/international/` |
| Currency | INR only | INR, USD, EUR, GBP, AUD, CAD, SAR, AED, SGD |
| Payment | COD/Prepaid | Prepaid only (typically) |
| KYC | Not required | Required for cross-border |
| Customs | Not applicable | HSN codes, export reasons, IGST status |
| Couriers | Domestic partners | International partners (DHL, FedEx, etc.) |

## International-Specific Parameters

### Currency Options
- `INR` - Indian Rupee
- `USD` - US Dollar
- `EUR` - Euro
- `GBP` - British Pound
- `AUD` - Australian Dollar
- `CAD` - Canadian Dollar
- `SAR` - Saudi Riyal
- `AED` - UAE Dirham
- `SGD` - Singapore Dollar

### Export Reasons (`reasonOfExport`)
- `0` - BONAFIDE_SAMPLE
- `1` - SAMPLE
- `2` - GIFT
- `3` - COMMERCIAL

### Purpose of Shipment (`purpose_of_shipment`)
- `0` - Gift
- `1` - Sample
- `2` - Commercial

### IGST Payment Status (`igstPaymentStatus`)
- `A` - Not Applicable
- `B` - LUT or Export under Bond
- `C` - Export Against Payment of IGST

### Terms of Invoice
- `FOB` - Free on Board
- `CIF` - Cost, Insurance, and Freight

## Authentication

All International APIs require Bearer Token authentication:

```
Authorization: Bearer <your_token>
Content-Type: application/json
```

## Typical Workflow

1. **Complete KYC** (one-time)
   - POST `/international/settings/international_kyc`

2. **Create Order**
   - POST `/international/orders/create/adhoc`

3. **Assign AWB**
   - POST `/international/courier/assign/awb`

4. **Generate Manifest**
   - POST `/international/manifests/generate`

5. **Schedule Pickup**
   - POST `/courier/generate/pickup`

6. **Track Shipment**
   - GET `/international/orders/track`

## Rate Limits

- Same as domestic: 100,000 requests/day
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

---

*Last updated: Documentation generated from Shiprocket API Reference*
