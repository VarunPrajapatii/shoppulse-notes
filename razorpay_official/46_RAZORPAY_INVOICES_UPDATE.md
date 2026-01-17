# Part 46: Update an Invoice

**Available in:** India, Malaysia

## Endpoint
```
PATCH /v1/invoices/:id
```

## Description
Use this endpoint to update the details of the invoice.

The following table displays the updates allowed as per invoice states:

| Status | Parameter Update Allowed |
|--------|--------------------------|
| Draft | All parameters can be updated including the line items. You can also add new line items. |
| Issued | You can update the following parameters:<br>- `partial_payment`<br>- `receipt`<br>- `comment`<br>- `terms`<br>- `notes`<br>- `expire_by` |
| Cancelled | Only `notes` can be updated. |
| Expired | Only `notes` can be updated. |
| Partially Paid | Only `notes` can be updated. |
| Paid | Only `notes` can be updated. |

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | * | The unique identifier of the invoice. |

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | | Indicates the type of entity. Here, it is `invoice`. |
| `description` | string | | A brief description of the invoice. |
| `draft` | string | | Invoice is created in `draft` state when value is set to `1`. |
| `customer_id` | string | | You can pass the `customer_id` in this field, if you are using the Customers API. If not, you can pass the customer object described in the below fields. |
| `customer` | object | | Customer details. Show child parameters (5) |
| `line_items` | object | | Details of the line item that is billed in the invoice. Maximum of 50 line items. Show child parameters (6) |
| `expire_by` | integer | | Timestamp, in Unix format, at which the invoice will expire. |
| `sms_notify` | boolean | | Defines who handles the SMS notification. Possible values:<br>- `true` (default): Razorpay sends the notification to the customer.<br>- `false`: You send the notification to the customer. |
| `email_notify` | boolean | | Defines who handles the email notification. Possible values:<br>- `true` (default): Razorpay sends the notification to the customer.<br>- `false`: You send the notification to the customer. |
| `partial_payment` | boolean | | Indicates whether the customer can make a partial payment on the invoice. Possible values:<br>- `true`: The customer can make partial payments.<br>- `false` (default): The customer cannot make partial payments. |
| `currency` | string | | The currency associated with the invoice. You must mandatorily pass this parameter if accepting international payments. If you have passed `currency` as a sub-parameter in the `line_item` object, you must ensure that the same currency is passed in both places. Know about the list of supported international currencies.<br><br>**Handy Tips**<br>Razorpay has added support for zero decimal currencies, such as JPY, and three decimal currencies, such as KWD, BHD, and OMR, allowing businesses to accept international payments in these currencies. Know more about Currency Conversion (May 2024). |

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

instance.invoices.edit(invoiceId,{
  line_items: [
    {
      id: "li_DAweOizsysoJU6",
      name: "Book / English August - Updated name and quantity",
      quantity: 1
    },
    {
      name: "Book / A Wild Sheep Chase",
      amount: 200,
      currency: "INR",
      quantity: 1
    }
  ],
  notes: {
    "updated-key": "An updated note."
  }
})
```

## Response Example

```json
{
  "id": "inv_DAtUWmR3Y5Dmxb",
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
```

## Errors

| Error Message | Status Code | Description | Solution |
|---------------|-------------|-------------|----------|
| The api key provided is invalid | 400 | The API key or secret are not entered or an invalid API key is used. | Solution |
| customer, line_items, sms_notify, email_notify, draft, date is/are not required and should not be sent | 400 | The mentioned parameters are not required for updating an invoice. | Solution |
| The amount field is required when item id is not present. | 400 | Only name is entered without item id or amount. | Solution |
| The name field is required when item id is not present. | 400 | Possible reasons:<br>- Only the amount field is entered without a name or item id.<br>- The amount, name or item id are not entered. | Solution |
