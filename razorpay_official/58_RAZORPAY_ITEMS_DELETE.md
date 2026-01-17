# Razorpay Items API - Delete an Item

**Available in:** 🇮🇳 India | 🇲🇾 Malaysia

## Endpoint
```
DELETE /v1/items/:id
```

## Description
Use this endpoint to delete an item.

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | **Yes** | The unique identifier of the item that must be deleted. |

## Request Example (Node.js)

```javascript
var instance = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })

instance.Items.delete(itemId)
```

## Response Example (Success)

```json
[]
```

## Errors

### Error: The API <key/secret> provided is invalid
**Status Code:** 4xx

**Description:** The API key or secret are not entered or an invalid API key is used.

---

### Error: The id provided does not exist
**Status Code:** 400

**Description:** The invoice id entered is either invalid or does not belong to the requester account.

---

**Note:** A successful deletion returns an empty array. Ensure the item ID is correct before deleting, as this action cannot be undone.
