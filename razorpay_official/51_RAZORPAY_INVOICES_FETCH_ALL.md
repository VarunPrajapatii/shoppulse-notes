# Part 51: Fetch All Invoices

**Available in:** India, Malaysia

## Endpoint
GET /v1/invoices

## Description
Use this endpoint to retrieve the details of all invoices.

## Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Here, it is `invoice`. |
| `payment_id` | string | The unique identifier of the payment made by the customer against the invoice. |
| `receipt` | string | The unique receipt number that you entered for internal purposes. |
| `customer_id` | string | The unique identifier of the customer. When used, fetches all invoices generated for a customer. |

## Response Parameters (28 Total)

Returns a collection entity with invoice items.

| Parameter | Type | Description |
|-----------|------|-------------|
| `entity` | string | Indicates the type of entity. Here, it is `collection`. |
| `count` | integer | The number of invoices returned. |
| `items` | array | Array of invoice objects. Each invoice contains 28 parameters. |

### Invoice Object Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The unique identifier of the invoice. |
| `entity` | string | Indicates the type of entity. Here, it is `invoice`. |
| `type` | string | Here, it should be `invoice`. |
| `invoice_number` | string | Unique number you added for internal reference. The minimum character length is 1 and maximum is 40. |
| `customer_id` | string | The unique identifier of the customer. You can create `customer_id` using the Customers API. Alternatively, you can pass the customer object. |
| `customer_details` | object | Details of the customer (6 child parameters: id, name, email, contact, gstin, billing_address, shipping_address, customer_name, customer_email, customer_contact). |
| `order_id` | string | The unique identifier of the order associated with the invoice. |
| `line_items` | object | Details of the line item that is billed in the invoice. Maximum of 50 line items (8 child parameters). |
| `payment_id` | string | Unique identifier of a payment made against this invoice. |
| `status` | string | The status of the invoice. Possible values: `draft`, `issued`, `partially_paid`, `paid`, `cancelled`, `expired`, `deleted`. |
| `expire_by` | integer | Timestamp, in Unix format, at which the invoice will expire. |
| `issued_at` | integer | Timestamp, in Unix format, at which the invoice was issued to the customer. |
| `paid_at` | integer | Timestamp, in Unix format, at which the payment was made. |
| `cancelled_at` | integer | Timestamp, in Unix format, at which the invoice was cancelled. |
| `expired_at` | integer | Timestamp, in Unix format, at which the invoice expired. |
| `sms_status` | string | The delivery status of the SMS notification for the invoice sent to the customer. Possible values: `pending`, `sent`. |
| `email_status` | string | The delivery status of the email notification for the invoice sent to the customer. Possible values: `pending`, `sent`. |
| `partial_payment` | boolean | Indicates whether the customer can make a partial payment on the invoice. `true`: The customer can make partial payments. `false` (default): The customer cannot make partial payments. |
| `amount` | integer | Amount to be paid using the invoice. Must be in the smallest unit of the currency. For example, if the amount to be received from the customer is ₹300.00, pass the value as `30000`. |
| `amount_paid` | integer | Amount paid by the customer against the invoice. |
| `amount_due` | integer | The remaining amount to be paid by the customer for the issued invoice. |
| `currency` | string | The currency associated with the invoice. You must mandatorily pass this parameter if accepting international payments. |
| `description` | string | A brief description of the invoice. The maximum character length is 2048. |
| `notes` | object | Any custom notes added to the invoice. Maximum of 2048 characters. |
| `short_url` | string | The short URL that is generated. Share this link with customers to accept payments. |
| `date` | integer | Timestamp, in Unix format, that indicates the issue date of the invoice. |
| `terms` | string | Any terms to be included in the invoice. Maximum of 2048 characters. |
| `comment` | string | Any comments to be added in the invoice. Maximum of 2048 characters. |

## Request Example

```javascript
var instance = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })

instance.invoices.all()
```

## Response Example

```json
{
  "entity": "collection",
  "count": 2,
  "items": [
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
          "line1": "Bakers Street",
          "line2": "Country Road",
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
      "order_id": null,
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
        }
      ],
      "payment_id": null,
      "status": "draft",
      "expire_by": 1567103399,
      "issued_at": null,
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
      "amount_paid": null,
      "amount_due": null,
      "currency": "INR",
      "currency_symbol": "<currency_symbol>",
      "description": "This is a test invoice.",
      "notes": {
        "updated-key": "An updated note."
      },
      "comment": null,
      "short_url": null,
      "view_less": true,
      "billing_start": null,
      "billing_end": null,
      "type": "invoice",
      "group_taxes_discounts": false,
      "created_at": 1566906474,
      "idempotency_key": null
    }
  ]
}
```

## Errors

| Error Message | Status Code | Description | Solution |
|---------------|-------------|-------------|----------|
| The API key/secret provided is invalid. | 4xx | The API key or secret are not entered or an invalid API key is used. | Verify your API credentials. |
| The id provided does not exist. | 400 | The invoice id entered is either invalid or does not belong to the requester account. | Use a valid invoice ID from your account. |
