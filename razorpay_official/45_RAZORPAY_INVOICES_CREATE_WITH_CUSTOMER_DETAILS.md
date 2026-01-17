# Part 45: Create an Invoice With Customer Details

**Available in:** India, Malaysia

## Endpoint

```
POST /v1/invoices
```

## Description

Use this endpoint to create an invoice using details such as `name`, `billing_address` and `shipping_address`.

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
| `customer` | object | | Customer details. Show child parameters (5) |
| `line_items` | object | | Details of the line item that is billed in the invoice. Maximum of 50 line items. Show child parameters (6) |
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
| `customer_details` | object | Details of the customer. Show child parameters (6) |
| `order_id` | string | The unique identifier of the order associated with the invoice. |
| `line_items` | object | Details of the line item that is billed in the invoice. Maximum of 50 line items. Show child parameters (8) |
| `payment_id` | string | Unique identifier of a payment made against this invoice. |
| `status` | string | The status of the invoice. Know more about Invoice States. Possible values:<br>- `draft`<br>- `issued`<br>- `partially_paid`<br>- `paid`<br>- `cancelled`<br>- `expired`<br>- `deleted` |
| `expire_by` | integer | Timestamp, in Unix format, at which the invoice will expire. |
| `issued_at` | integer | Timestamp, in Unix format, at which the invoice was issued to the customer. |
| `paid_at` | integer | Timestamp, in Unix format, at which the payment was made. |
| `cancelled_at` | integer | Timestamp, in Unix format, at which the invoice was cancelled. |
| `expired_at` | integer | Timestamp, in Unix format, at which the invoice expired. |
| `sms_status` | string | The delivery status of the SMS notification for the invoice sent to the customer. Possible values:<br>- `pending`<br>- `sent` |
| `email_status` | string | The delivery status of the email notification for the invoice sent to the customer. Possible values:<br>- `pending`<br>- `sent` |
| `partial_payment` | boolean | Indicates whether the customer can make a partial payment on the invoice. Possible values:<br>- `true`:  The customer can make partial payments.<br>- `false` (default): The customer cannot make partial payments. |
| `amount` | integer | Amount to be paid using the invoice. Must be in the smallest unit of the currency. For example, if the amount to be received from the customer is ₹300.00, pass the value as `30000`. |
| `amount_paid` | integer | Amount paid by the customer against the invoice. |
| `amount_due` | integer | The remaining amount to be paid by the customer for the issued invoice. |
| `currency` | string | The currency associated with the invoice. You must mandatorily pass this parameter if accepting international payments. If you have passed `currency` as a sub-parameter in the `line_item` object, you must ensure that the same currency is passed in both places. Know about the list of supported international currencies. |
| `description` | string |  A brief description of the invoice. The maximum character length is 2048. |
| `notes` | object | Any custom notes added to the invoice. Maximum of 2048 characters. |
| `short_url` | string | The short URL that is generated. Share this link with customers to accept payments. |
| `date` | integer | Timestamp, in Unix format, that indicates the issue date of the invoice. |
| `terms` | string | Any terms to be included in the invoice. Maximum of 2048 characters. |
| `comment` | string | Any comments to be added in the invoice. Maximum of 2048 characters. |

## Request Example

```javascript
var instance = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })

instance.invoice.create({
  "type": "invoice",
  "description": "Invoice for the month of January 2020",
  "partial_payment": true,
  "customer": {
    "name": "Gaurav Kumar",
    "contact": "+919876543210",
    "email": "gaurav.kumar@example.com",
    "billing_address": {
      "line1": "Ground & 1st Floor, SJR Cyber Laskar",
      "line2": "Hosur Road",
      "zipcode": 560068,
      "city": "Bengaluru",
      "state": "Karnataka",
      "country": "in"
    },
    "shipping_address": {
      "line1": "Ground & 1st Floor, SJR Cyber Laskar",
      "line2": "Hosur Road",
      "zipcode": 560068,
      "city": "Bengaluru",
      "state": "Karnataka",
      "country": "in"
    }
  },
  "line_items": [
    {
      "name": "Master Cloud Computing in 30 Days",
      "description": "Book by Ravena Ravenclaw",
      "amount": 399,
      "currency": "INR",
      "quantity": 1
    }
  ],
  "sms_notify": true,
  "email_notify": true,
  "currency": "INR",
  "expire_by": 1589765167
})
```

## Response Example

```json
{
  "id": "inv_E7q0tqkxBRzdau",
  "entity": "invoice",
  "receipt": null,
  "invoice_number": null,
  "customer_id": "cust_E7q0trFqXgExmT",
  "customer_details": {
    "id": "cust_E7q0trFqXgExmT",
    "name": "Gaurav Kumar",
    "email": "gaurav.kumar@example.com",
    "contact": "+919876543210",
    "gstin": null,
    "billing_address": {
      "id": "addr_E7q0ttqh4SGhAC",
      "type": "billing_address",
      "primary": true,
      "line1": "Bakers Street",
      "line2": "Country Road",
      "zipcode": "560068",
      "city": "Bengaluru",
      "state": "Karnataka",
      "country": "in"
    },
    "shipping_address": {
      "id": "addr_E7q0ttKwVA1h2V",
      "type": "shipping_address",
      "primary": true,
      "line1": "Bakers Street",
      "line2": "Country Road",
      "zipcode": "560068",
      "city": "Bengaluru",
      "state": "Karnataka",
      "country": "in"
    },
    "customer_name": "Gaurav Kumar",
    "customer_email": "gaurav.kumar@example.com",
    "customer_contact": "+919876543210"
  },
  "order_id": "order_E7q0tvRpC0WJwg",
  "line_items": [
    {
      "id": "li_E7q0tuPNg84VbZ",
      "item_id": null,
      "ref_id": null,
      "ref_type": null,
      "name": "Master Cloud Computing in 30 Days",
      "description": "Book by Ravena Ravenclaw",
      "amount": 399,
      "unit_amount": 399,
      "gross_amount": 399,
      "tax_amount": 0,
      "taxable_amount": 399,
      "net_amount": 399,
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
  "expire_by": 1589765167,
  "issued_at": 1579765167,
  "paid_at": null,
  "cancelled_at": null,
  "expired_at": null,
  "sms_status": "pending",
  "email_status": "pending",
  "date": 1579765167,
  "terms": null,
  "partial_payment": true,
  "gross_amount": 399,
  "tax_amount": 0,
  "taxable_amount": 399,
  "amount": 399,
  "amount_paid": 0,
  "amount_due": 399,
  "currency": "INR",
  "currency_symbol": "$",
  "description": "Invoice for the month of January 2020",
  "notes": [],
  "comment": null,
  "short_url": "https://rzp.io/i/2wxV8Xs",
  "view_less": true,
  "billing_start": null,
  "billing_end": null,
  "type": "invoice",
  "group_taxes_discounts": false,
  "created_at": 1579765167
}
```

## Errors

| Error Message | Status Code | Description | Solution |
|---------------|-------------|-------------|----------|
| The API &lt;key/secret&gt; provided is invalid. | 4xx | The API key or secret are not entered or an invalid API key is used. | Solution |
| customer is required. | 400 | An invoice is issued without adding customer details. | Solution |
| the merchant doesn't have international activated. | 400 | The line_items object has an international currency set. For example, USD, is not enabled for your account. | Solution |
| Currency of all items should be the same as of the invoice. | 400 | There is a difference in currency entered between `line_items` and invoice currency. | Solution |
| expire_by should be at least 15 minutes after current time. | 400 | The expiry date is before or within 15 minutes of the current time | Solution |
| line_items is required. | 400 | A mandatory field is empty. | Solution |
