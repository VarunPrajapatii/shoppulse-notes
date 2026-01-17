# Part 48: Delete an Invoice

**Available in:** India, Malaysia

## Endpoint
```
DELETE /v1/invoices/:id
```

## Description
Use this endpoint to delete invoices. You can only delete an invoice that is in the `draft` state.

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | * | The unique identifier of the invoice. |

## Request Example

```javascript
var instance = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })

instance.invoices.delete(invoiceId)
```

## Response Example

```json
[]
```

## Errors

| Error Message | Status Code | Description | Solution |
|---------------|-------------|-------------|----------|
| Operation not allowed for Invoice in cancelled status. | 400 | You are trying to delete an invoice that is not in the `Draft` status. | **Solution** |
