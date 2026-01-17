# Part 43: Invoices Entity

**Available in:** India, Malaysia

The Invoices entity has the following parameters:

## Parameters

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
| `status` | string | The status of the invoice. Know more about Invoice States. Possible values: `draft`, `issued`, `partially_paid`, `paid`, `cancelled`, `expired`, `deleted`. |
| `expire_by` | integer | Timestamp, in Unix format, at which the invoice will expire. |
| `issued_at` | integer | Timestamp, in Unix format, at which the invoice was issued to the customer. |
| `paid_at` | integer | Timestamp, in Unix format, at which the payment was made. |
| `cancelled_at` | integer | Timestamp, in Unix format, at which the invoice was cancelled. |
| `expired_at` | integer | Timestamp, in Unix format, at which the invoice expired. |
| `sms_status` | string | The delivery status of the SMS notification for the invoice sent to the customer. Possible values: `pending`, `sent`. |
| `email_status` | string | The delivery status of the email notification for the invoice sent to the customer. Possible values: `pending`, `sent`. |
| `partial_payment` | boolean | Indicates whether the customer can make a partial payment on the invoice. Possible values: `true` (The customer can make partial payments), `false` (default - The customer cannot make partial payments). |
| `amount` | integer | Amount to be paid using the invoice. Must be in the smallest unit of the currency. For example, if the amount to be received from the customer is ₹300.00, pass the value as `30000`. In the case of three decimal currencies, such as KWD, BHD and OMR, to refund a payment of 295.991, pass the value as 295990. And in the case of zero decimal currencies such as JPY, to refund a payment of 295, pass the value as 295. **Watch Out!** As per payment guidelines, you should pass the last decimal number as 0 for three decimal currency payments. For example, if you want to refund a customer 99.991 KD for a transaction, you should pass the value for the amount parameter as `99990` and not `99991`. |
| `amount_paid` | integer | Amount paid by the customer against the invoice. |
| `amount_due` | integer | The remaining amount to be paid by the customer for the issued invoice. |
| `currency` | string | The currency associated with the invoice. You must mandatorily pass this parameter if accepting international payments. If you have passed `currency` as a sub-parameter in the `line_item` object, you must ensure that the same currency is passed in both places. Know about the list of supported international currencies. **Handy Tips:** Razorpay has added support for zero decimal currencies, such as JPY, and three decimal currencies, such as KWD, BHD, and OMR, allowing businesses to accept international payments in these currencies. Know more about Currency Conversion (May 2024). |
| `description` | string | A brief description of the invoice. The maximum character length is 2048. |
| `notes` | object | Any custom notes added to the invoice. Maximum of 2048 characters. |
| `short_url` | string | The short URL that is generated. Share this link with customers to accept payments. |
| `date` | integer | Timestamp, in Unix format, that indicates the issue date of the invoice. |
| `terms` | string | Any terms to be included in the invoice. Maximum of 2048 characters. |
| `comment` | string | Any comments to be added in the invoice. Maximum of 2048 characters. |

## Entity Example

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
  "expire_by": null,
  "issued_at": 1579765167,
  "paid_at": null,
  "cancelled_at": null,
  "expired_at": null,
  "sms_status": "pending",
  "email_status": "pending",
  "date": 1579765167,
  "terms": null,
  "partial_payment": false,
  "gross_amount": 399,
  "tax_amount": 0,
  "taxable_amount": 399,
  "amount": 399,
  "amount_paid": 0,
  "amount_due": 399,
  "currency": "INR",
  "description": null,
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
