# Shiprocket API - Discrepancy Details

This section covers the API for retrieving billing discrepancy data from your Shiprocket account.

---

## Get Discrepancy Data

Retrieve weight discrepancy information for shipments where the entered weight differs from the courier's measured weight.

### Endpoint

```
GET https://apiv2.shiprocket.in/v1/external/billing/discrepancy
```

### Description

This API returns discrepancy data associated with your account. Weight discrepancies occur when:
- The weight you entered during order creation differs from the actual weight measured by the courier company
- Deductions need to be made based on the correct charged weight

### Headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <your_token>` |

### Parameters

No parameters required.

### Example Request

```bash
curl --location 'https://apiv2.shiprocket.in/v1/external/billing/discrepancy' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}'
```

### Example Response

```json
{
  "status": 200,
  "data": [],
  "upper_fold_text": "The entered weight for the below given shipment was incorrect. Please allow us to make deduction on the basis of correct charged weight as shared by the courier company.",
  "lower_fild_text": "To raise a ticket for your queries, please call us on 011-39595108 or email us at support@shiprocket.in"
}
```

### Response with Discrepancies

When discrepancies exist, the `data` array will contain records:

```json
{
  "status": 200,
  "data": [
    {
      "id": 12345,
      "order_id": 67890,
      "awb_code": "123456789012",
      "entered_weight": "0.5",
      "charged_weight": "1.0",
      "weight_difference": "0.5",
      "additional_charge": "50.00",
      "courier_name": "Delhivery",
      "status": "pending",
      "created_at": "2023-10-15 14:30:00"
    }
  ],
  "upper_fold_text": "The entered weight for the below given shipment was incorrect...",
  "lower_fild_text": "To raise a ticket for your queries..."
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | integer | HTTP status code |
| `data` | array | Array of discrepancy records |
| `upper_fold_text` | string | Explanation message about discrepancies |
| `lower_fild_text` | string | Support contact information |

### Data Array Fields (when discrepancies exist)

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Discrepancy record ID |
| `order_id` | integer | Associated order ID |
| `awb_code` | string | Air Waybill number |
| `entered_weight` | string | Weight entered at order creation (kg) |
| `charged_weight` | string | Weight measured by courier (kg) |
| `weight_difference` | string | Difference between entered and charged weight |
| `additional_charge` | string | Additional amount to be deducted |
| `courier_name` | string | Name of the courier company |
| `status` | string | Discrepancy status (pending/resolved) |
| `created_at` | string | When the discrepancy was recorded |

---

## Understanding Weight Discrepancies

### Why Discrepancies Occur

1. **Inaccurate Weighing**: Product weight wasn't measured accurately before shipping
2. **Packaging Weight**: Packaging material weight wasn't included
3. **Volumetric Weight**: Courier uses volumetric weight if higher than actual weight

### Volumetric Weight Formula

```
Volumetric Weight (kg) = (Length × Width × Height in cm) / 5000
```

Couriers charge based on whichever is higher:
- Actual weight
- Volumetric weight

### Best Practices to Avoid Discrepancies

1. **Use Accurate Scales**: Weigh packages with calibrated scales
2. **Include Packaging**: Add packaging weight to product weight
3. **Calculate Volumetric Weight**: For lightweight but bulky items, calculate and use volumetric weight
4. **Document Measurements**: Keep records of weights and dimensions

---

## Handling Discrepancies

### Disputing a Discrepancy

If you believe a discrepancy is incorrect:
1. Contact Shiprocket support at the numbers provided in the response
2. Provide order ID, AWB number, and your weight documentation
3. Request weight proof from the courier

### Proactive Monitoring

```javascript
// Check for discrepancies regularly
async function checkDiscrepancies() {
  const response = await fetch('/billing/discrepancy', {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  
  if (data.data.length > 0) {
    console.log(`⚠️ ${data.data.length} weight discrepancies found`);
    // Notify relevant team members
    // Review and resolve discrepancies
  }
}
```

---

## Integration Tips

### Webhook for Real-time Updates
Consider setting up webhooks to get notified of new discrepancies immediately rather than polling this API.

### Regular Reconciliation
Schedule regular checks (daily/weekly) to identify and address discrepancies promptly:

```javascript
// Example: Daily discrepancy check
const cron = require('node-cron');

cron.schedule('0 9 * * *', async () => {
  // Run every day at 9 AM
  await checkDiscrepancies();
});
```

### Support Contact
For queries about discrepancies:
- **Phone**: 011-39595108
- **Email**: support@shiprocket.in
