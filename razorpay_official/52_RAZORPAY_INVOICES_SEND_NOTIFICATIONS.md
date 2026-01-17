# Part 52: Send Notifications

**Available in:** India, Malaysia

## Endpoint
POST /v1/invoices/:id/notify_by/:medium

## Description
Use this endpoint to send notifications with the short URL to the customer via email or SMS.

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | * | The unique identifier of the invoice whose link is to be sent by SMS or email. |
| `medium` | string | * | Possible values: `sms`, `email`. |

## Response Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `success` | boolean | Indicates whether the notifications were sent successfully. Possible values: `true`: The notifications were successfully sent via SMS, email or both. `false`: The notifications were not sent. |

## Request Example

```javascript
var instance = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })

instance.invoices.notifyBy(invoiceId, medium)
```

## Response Example

```json
{
    "success": true
}
```

## Errors

| Error Message | Status Code | Description | Solution |
|---------------|-------------|-------------|----------|
| The API <key/secret> provided is invalid. | 4xx | There is a mismatch between the API credentials passed in the API call and those generated on the Dashboard. | Verify your API credentials on the Dashboard. |
| The id provided does not exist. | 400 | The invoice id entered is either invalid or does not belong to the requester account. | Use a valid invoice ID from your account. |
| email is not a valid communication medium. | 400 | There is a spelling error in "email" in the URL. | Ensure the medium parameter is correctly spelled as `email` or `sms`. |
