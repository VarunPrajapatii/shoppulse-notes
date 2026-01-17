# Part 47: Issue an Invoice

**Available in:** India, Malaysia

## Endpoint
```
POST /v1/invoices/:id/issue
```

## Description
Use this endpoint to issue invoices to your customers. Only an invoice in the `draft` state can be issued.

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | * | The unique identifier of the invoice. |

## Response Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The unique identifier of the invoice. |
| `entity` | string | Indicates the type of entity. Here, it is `invoice`. |
| `type` | string | Here, it should be `invoice`. |
| `invoice_number` | string | Unique number you added for internal reference. The minimum character length is 1 and maximum is 40. |
| `customer_id` | string | The unique identifier of the customer. You can create `customer_id` using the Customers API. Alternatively, you can pass the customer object described in the below fields. |
| `customer_details` | object | Details of the customer. <br>**Show child parameters (6)** |
| `order_id` | string | The unique identifier of the order associated with the invoice. |
| `line_items` | object | Details of the line item that is billed in the invoice. Maximum of 50 line items. <br>**Show child parameters (8)** |
| `payment_id` | string | Unique identifier of a payment made against this invoice. |
| `status` | string | The status of the invoice. Know more about Invoice States. Possible values:<ul><li>`draft`</li><li>`issued`</li><li>`partially_paid`</li><li>`paid`</li><li>`cancelled`</li><li>`expired`</li><li>`deleted`</li></ul> |
| `expire_by` | integer | Timestamp, in Unix format, at which the invoice will expire. |
| `issued_at` | integer | Timestamp, in Unix format, at which the invoice was issued to the customer. |
| `paid_at` | integer | Timestamp, in Unix format, at which the payment was made. |
| `cancelled_at` | integer | Timestamp, in Unix format, at which the invoice was cancelled. |
| `expired_at` | integer | Timestamp, in Unix format, at which the invoice expired. |
| `sms_status` | string | The delivery status of the SMS notification for the invoice sent to the customer. Possible values:<ul><li>`pending`</li><li>`sent`</li></ul> |
| `email_status` | string | The delivery status of the email notification for the invoice sent to the customer. Possible values:<ul><li>`pending`</li><li>`sent`</li></ul> |
| `partial_payment` | boolean | Indicates whether the customer can make a partial payment on the invoice. Possible values:<ul><li>`true`: The customer can make partial payments.</li><li>`false` (default): The customer cannot make partial payments.</li></ul> |
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

instance.invoices.issue(invoiceId)
```

## Response Example

```json
{
  "id": "inv_DAweOiQ7amIUVd",
  "entity": "invoice",
  "receipt": "#0961",
  "invoice_number": "#0961",
  "customer_id": "cust_DAtUWmvpktokrT",
  "customer_details": {
    "id": "cust_DAtUWmvpktokrT",
    "name": "Gaurav Kumar",
    "email": "gaurav.kumar@example.com",
    "contact": "+919876543210",
    "gstin": null,
    "billing_address": {
      "id": "addr_DAtUWoxgu91obl",
      "type": "billing_address",
      "primary": true,
      "line1": "318 C-Wing, Suyog Co. Housing Society Ltd.",
      "line2": "T.P.S Road, Vazira, Borivali",
      "zipcode": "400092",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "in"
    },
    "shipping_address": null,
    "customer_name": "Gaurav Kumar",
    "customer_email": "gaurav.kumar@example.com",
    "customer_contact": "+919876543210"
  },
  "order_id": "order_DBG3P8ZgDd1dsG",
  "line_items": [
    {
      "id": "li_DAweOizsysoJU6",
      "item_id": null,
      "name": "Book / English August - Updated name and quantity",
      "description": "150 points in Quidditch",
      "amount": 400,
      "unit_amount": 400,
      "gross_amount": 400,
      "tax_amount": 0,
      "taxable_amount": 400,
      "net_amount": 400,
      "currency": "INR",
      "type": "invoice",
      "tax_inclusive": false,
      "hsn_code": null,
      "sac_code": null,
      "tax_rate": null,
      "unit": null,
      "quantity": 1,
      "taxes": []
    },
    {
      "id": "li_DAwjWQUo07lnjF",
      "item_id": null,
      "name": "Book / A Wild Sheep Chase",
      "description": null,
      "amount": 200,
      "unit_amount": 200,
      "gross_amount": 200,
      "tax_amount": 0,
      "taxable_amount": 200,
      "net_amount": 200,
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
  "expire_by": 1567103399,
  "issued_at": 1566974805,
  "paid_at": null,
  "cancelled_at": null,
  "expired_at": null,
  "sms_status": null,
  "email_status": null,
  "date": 1566891149,
  "terms": null,
  "partial_payment": false,
  "gross_amount": 600,
  "tax_amount": 0,
  "taxable_amount": 600,
  "amount": 600,
  "amount_paid": 0,
  "amount_due": 600,
  "currency": "INR",
  "currency_symbol": "<currency_symbol>",
  "description": "This is a test invoice.",
  "notes": {
    "updated-key": "An updated note."
  },
  "comment": null,
  "short_url": "https://rzp.io/i/K8Zg72C",
  "view_less": true,
  "billing_start": null,
  "billing_end": null,
  "type": "invoice",
  "group_taxes_discounts": false,
  "created_at": 1566906474,
  "idempotency_key": null
}
```

## Errors

| Error Message | Status Code | Description | Solution |
|---------------|-------------|-------------|----------|
| The API <key/secret> provided is invalid. | 400 | There is a mismatch between the API credentials passed in the API call and those generated on the Dashboard. | **Solution** |
| line_items is required. | 400 | Items and customer details are missing. | **Solution** |
| Operation not allowed for Invoice in issued status. | 400 | You are trying to issue an invoice that is already issued. | **Solution** |
| The id provided does not exist. | 400 | There is an error in the invoice id. It may be incorrect or invalid. | **Solution** |
