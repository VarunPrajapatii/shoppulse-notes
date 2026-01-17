# PART 2: International KYC & Compliance

Documentation for KYC (Know Your Customer) requirements for international shipping in Shiprocket.

---

## Overview

Before shipping internationally from India, sellers must complete KYC verification. This is a one-time process required for compliance with export regulations.

---

## Submit International KYC

Submit KYC documents for international shipping verification.

### Endpoint

```
POST https://apiv2.shiprocket.in/v1/external/international/settings/international_kyc
```

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body Parameters

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| `organization_type` | Yes | string | Type of organization | `"Proprietorship"`, `"Partnership"`, `"Private Limited"`, `"LLP"` |
| `ip_address` | Yes | string | IP address of the request origin | `"192.168.1.1"` |
| `documents` | Yes | array | Array of document uploads (max 3MB each) | See below |

### Document Types

Depending on organization type, required documents may include:

- **PAN Card** - Mandatory for all
- **GST Certificate** - If GST registered
- **IEC Certificate** - Import Export Code (mandatory for exports)
- **AD Code** - Authorized Dealer Code from bank
- **Cancelled Cheque** - Bank account verification
- **Address Proof** - Business address verification
- **Identity Proof** - Owner/Director identity

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/international/settings/international_kyc' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
    "organization_type": "Proprietorship",
    "ip_address": "192.168.1.1",
    "documents": [
        {
            "type": "pan_card",
            "file": "base64_encoded_file_content"
        },
        {
            "type": "iec_certificate",
            "file": "base64_encoded_file_content"
        },
        {
            "type": "gst_certificate",
            "file": "base64_encoded_file_content"
        }
    ]
}'
```

### Success Response (200 OK)

```json
{
  "status": 1,
  "message": "KYC documents submitted successfully",
  "kyc_status": "pending_verification"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | integer | 1 = success, 0 = failure |
| `message` | string | Response message |
| `kyc_status` | string | Current KYC verification status |

### KYC Status Values

| Status | Description |
|--------|-------------|
| `pending_verification` | Documents submitted, awaiting review |
| `verified` | KYC approved, international shipping enabled |
| `rejected` | KYC rejected, resubmission required |
| `incomplete` | Additional documents required |

---

## Organization Types

| Type | Description |
|------|-------------|
| `Proprietorship` | Single owner business |
| `Partnership` | Partnership firm |
| `Private Limited` | Private limited company |
| `Public Limited` | Public limited company |
| `LLP` | Limited Liability Partnership |
| `Trust` | Trust/Society/NGO |

---

## Document Requirements by Organization Type

### Proprietorship
- PAN Card (Individual)
- GST Certificate
- IEC Certificate
- Bank Account Proof

### Partnership
- PAN Card (Firm)
- Partnership Deed
- GST Certificate
- IEC Certificate
- Partner ID Proof

### Private Limited / LLP
- PAN Card (Company)
- Certificate of Incorporation
- GST Certificate
- IEC Certificate
- Director ID Proof
- Board Resolution

---

## Error Responses

### Invalid Document Format (400)

```json
{
  "status": 0,
  "message": "Invalid document format. Supported formats: PDF, JPG, PNG",
  "errors": {
    "documents": ["Document at index 0 has invalid format"]
  }
}
```

### File Size Exceeded (400)

```json
{
  "status": 0,
  "message": "File size exceeds maximum limit of 3MB",
  "errors": {
    "documents": ["Document at index 1 exceeds 3MB limit"]
  }
}
```

### Missing Required Documents (400)

```json
{
  "status": 0,
  "message": "Required documents missing",
  "errors": {
    "documents": ["IEC Certificate is required for international shipping"]
  }
}
```

---

## Important Notes

1. **One-Time Process**: KYC is submitted once and applies to all international shipments
2. **File Size**: Each document must be under 3MB
3. **File Formats**: Accepted formats are PDF, JPG, PNG
4. **IEC Mandatory**: Import Export Code (IEC) is mandatory for all exports from India
5. **Processing Time**: KYC verification typically takes 24-48 hours
6. **Updates**: If KYC is rejected, you can resubmit with corrected documents

---

## IEC (Import Export Code)

The IEC is a 10-digit code required for exporting from India. You can apply for IEC through:

- **DGFT Portal**: https://dgft.gov.in
- **Documents Required**:
  - PAN Card
  - Cancelled Cheque
  - Address Proof
  - Digital Signature

---

## GST for Exports

### Export Types
1. **With Payment of IGST** - Pay IGST upfront, claim refund later
2. **Under LUT (Letter of Undertaking)** - Zero-rated supply, no upfront tax

### IGST Payment Status Codes

| Code | Description |
|------|-------------|
| `A` | Not Applicable |
| `B` | LUT or Export under Bond |
| `C` | Export Against Payment of IGST |

---

## Best Practices

1. **Prepare Documents**: Have all documents ready before starting KYC
2. **Clear Scans**: Ensure documents are clearly scanned/photographed
3. **Current Documents**: Use valid, non-expired documents
4. **Correct Information**: Ensure information matches across documents
5. **IEC First**: Apply for IEC if you don't have one before initiating KYC

---

*Next: [PART3_ORDERS.md](./PART3_ORDERS.md) - International Order Management*
