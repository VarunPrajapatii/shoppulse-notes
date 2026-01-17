# Part 44: Create an Invoice With Customer ID

**Available in:** India, Malaysia

## Endpoint

```
POST /v1/invoices
```

## Description

Use this endpoint to create an invoice by passing the `customer_id`.

**Handy Tips**

You cannot create GST compliant invoices using APIs. This means you cannot add the following to the invoice when creating an invoice via APIs:
- tax rate
- cess
- HSN code
- SAC code

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | * | Indicates the type of entity. Here, it is `invoice`. |
| `description` | string | | A brief description of the invoice. |
| `draft` | string | | Invoice is created in `draft` state when value is set to `1`. |
| `customer_id` | string | * | You can pass the `customer_id` in this field, if you are using the Customers API. If not, you can pass the customer object described in the below fields. |
| `customer` | object | | Customer details. |
| `line_items` | object | | Details of the line item that is billed in the invoice. Maximum of 50 line items. |
| `expire_by` | integer | | Timestamp, in Unix format, at which the invoice will expire. |
| `sms_notify` | boolean | | Defines who handles the SMS notification. Possible values:<br>- `true` (default): Razorpay sends the notification to the customer.<br>- `false`: You send the notification to the customer. |
| `email_notify` | boolean | | Defines who handles the email notification. Possible values:<br>- `true` (default): Razorpay sends the notification to the customer.<br>- `false`: You send the notification to the customer. |
| `partial_payment` | boolean | | Indicates whether the customer can make a partial payment on the invoice. Possible values:<br>- `true`: The customer can make partial payments.<br>- `false` (default): The customer cannot make partial payments. |
| `currency` | string | | The currency associated with the invoice. You must mandatorily pass this parameter if accepting international payments. If you have passed `currency` as a sub-parameter in the `line_item` object, you must ensure that the same currency is passed in both places. Know about the list of supported international currencies. |
| `notes` | string | | Any custom notes added to the invoice. Maximum of 2048 characters. |

## Response Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The unique identifier of the invoice. |
| `entity` | string | Indicates the type of entity. Here, it is `invoice`. |
| `type` | string | Here, it should be `invoice`. |
| `invoice_number` | string | Unique number you added for internal reference. The minimum character length is 1 and maximum is 40. |
| `customer_id` | string | The unique identifier of the customer. You can create `customer_id` using the Customers API. Alternatively, you can pass the customer object described in the below fields. |
| `customer_details` | object | Details of the customer. |
| `order_id` | string | The unique identifier of the order associated with the invoice. |
| `line_items` | object | Details of the line item that is billed in the invoice. Maximum of 50 line items. |
| `payment_id` | string | Unique identifier of a payment made against this invoice. |
| `status` | string | The status of the invoice. Know more about Invoice States. Possible values:<br>- `draft`<br>- `issued`<br>- `partially_paid`<br>- `paid`<br>- `cancelled`<br>- `expired`<br>- `deleted` |
| `expire_by` | integer | Timestamp, in Unix format, at which the invoice will expire. |
| `issued_at` | integer | Timestamp, in Unix format, at which the invoice was issued to the customer. |
| `paid_at` | integer | Timestamp, in Unix format, at which the payment was made. |
| `cancelled_at` | integer | Timestamp, in Unix format, at which the invoice was cancelled. |
| `expired_at` | integer | Timestamp, in Unix format, at which the invoice expired. |
| `sms_status` | string | The delivery status of the SMS notification for the invoice sent to the customer. Possible values:<br>- `pending`<br>- `sent` |
| `email_status` | string | The delivery status of the email notification for the invoice sent to the customer. Possible values:<br>- `pending`<br>- `sent` |
| `partial_payment` | boolean | Indicates whether the customer can make a partial payment on the invoice. Possible values:<br>- `true`: The customer can make partial payments.<br>- `false` (default): The customer cannot make partial payments. |
| `amount` | integer | Amount to be paid using the invoice. Must be in the smallest unit of the currency. For example, if the amount to be received from the customer is ₹300.00, pass the value as `30000`. |
| `amount_paid` | integer | Amount paid by the customer against the invoice. |
| `amount_due` | integer | The remaining amount to be paid by the customer for the issued invoice. |
| `currency` | string | The currency associated with the invoice. You must mandatorily pass this parameter if accepting international payments. If you have passed `currency` as a sub-parameter in the `line_item` object, you must ensure that the same currency is passed in both places. Know about the list of supported international currencies. |
| `description` | string | A brief description of the invoice. The maximum character length is 2048. |
| `notes` | object | Any custom notes added to the invoice. Maximum of 2048 characters. |
| `short_url` | string | The short URL that is generated. Share this link with customers to accept payments. |
| `date` | integer | Timestamp, in Unix format, that indicates the issue date of the invoice. |
| `terms` | string | Any terms to be included in the invoice. Maximum of 2048 characters. |
| `comment` | string | Any comments to be added in the invoice. Maximum of 2048 characters. |

## Request Example

```javascript
var instance = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })

instance.invoices.create({
  "type": "invoice",
  "date": 1989994898,
  "customer_id": "cust_E7q0trFqXgExmT",
  "line_items": [
    {
      "item_id": "item_DRt61i2NnL8oy6"
    }
  ]
})
```

## Response Example

```json
{
  "id": "inv_K6g5bviu09mXo1",
  "entity": "invoice",
  "receipt": null,
  "invoice_number": null,
  "customer_id": "cust_HOQzpsovChhcpl",
  "customer_details": {
    "id": "cust_HOQzpsovChhcpl",
    "name": null,
    "email": "gaurav.kumar@example.com",
    "contact": "+919876543210",
    "gstin": null,
    "billing_address": null,
    "shipping_address": null,
    "customer_name": null,
    "customer_email": "gaurav.kumar@example.com",
    "customer_contact": "+919876543210"
  },
  "order_id": "order_K6g5bxSIwYIXJS",
  "line_items": [
    {
      "id": "li_K6g5bwLZuBmb1Q",
      "item_id": "item_K6g5L6X43dXjEA",
      "ref_id": null,
      "ref_type": null,
      "name": "Cloth",
      "description": "Cotton Cloth",
      "amount": 1200,
      "unit_amount": 1200,
      "gross_amount": 1200,
      "tax_amount": 0,
      "taxable_amount": 1200,
      "net_amount": 1200,
      "currency": "INR",
      "type": "invoice",
      "tax_inclusive": false,
      "hsn_code": null,
      "sac_code": null,
      "tax_rate": null,
      "unit": null,
      "quantity": 1,
      "taxes": []
    }
  ],
  "payment_id": null,
  "status": "issued",
  "expire_by": null,
  "issued_at": 1660734398,
  "paid_at": null,
  "cancelled_at": null,
  "expired_at": null,
  "sms_status": "pending",
  "email_status": "pending",
  "date": 1760714528,
  "terms": null,
  "partial_payment": false,
  "gross_amount": 1200,
  "tax_amount": 0,
  "taxable_amount": 1200,
  "amount": 1200,
  "amount_paid": 0,
  "amount_due": 1200,
  "currency": "INR",
  "currency_symbol": "<currency_symbol>",
  "description": null,
  "notes": [],
  "comment": null,
  "short_url": "https://rzp.io/i/ksYThDL",
  "view_less": true,
  "billing_start": null,
  "billing_end": null,
  "type": "invoice",
  "group_taxes_discounts": false,
  "created_at": 1660734398
}
```

## Errors

| Error Message | Status Code | Description | Solution |
|---------------|-------------|-------------|----------|
| The API <key/secret> provided is invalid. | 4xx | The API key or secret are not entered or an invalid API key is used. | Click to expand solution. |
| customer is required. | 400 | An invoice is issued without adding customer details. | Click to expand solution. |
| the merchant doesn't have international activated. | 400 | The line_items object has an international currency set. For example, USD, is not enabled for your account. | Click to expand solution. |
| Currency of all items should be the same as of the invoice. | 400 | There is a difference in currency entered between `line_items` and invoice currency. | Click to expand solution. |
| expire_by should be at least 15 minutes after current time. | 400 | The expiry date is before or within 15 minutes of the current time | Click to expand solution. |
| line_items is required. | 400 | A mandatory field is empty. | Click to expand solution. |
