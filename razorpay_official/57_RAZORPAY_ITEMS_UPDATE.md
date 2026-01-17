# Razorpay Items API - Update an Item

**Available in:** 🇮🇳 India | 🇲🇾 Malaysia

## Endpoint
```
PATCH /v1/items/:id
```

## Description
Use this endpoint to update the details of an item. You can also edit the details of a created item from the Dashboard by clicking on that specific item from the list of items.

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | **Yes** | The unique identifer of the item whose details are to be updated. |

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | The name of the item. |
| `description` | string | No | A brief description about the item. |
| `amount` | integer | No | The price of the item in the lowest unit of currency. |
| `currency` | string | No | The currency in which the amount should be charged. Check the list of supported currencies. |
| `active` | boolean | No | Indicates the status of the item. Possible values:<br/>• `true` (default): Item is in the active state.<br/>• `false`: Item is in the inactive state. |

## Response Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The unique identifier of the item. |
| `active` | boolean | Indicates the status of the item. Possible values:<br/>• `true` (default): Item is in the active state.<br/>• `false`: Item is in the inactive state. |
| `name` | string | The name of the item. |
| `description` | string | A text description about the item. |
| `amount` | integer | The price of the item. |
| `unit_amount` | integer | The per unit billing amount for each individual unit. |
| `currency` | string | The currency in which the amount should be charged. Check the list of supported currencies. |
| `type` | string | Here, it must be `invoice`. |
| `unit` | integer | The number of units of the item billed in the invoice. |
| `tax_inclusive` | boolean | Indicates whether the base amount includes tax.<br/>• `true`: The base amount includes tax.<br/>• `false`: The base amount does not include tax. By default, the value is set to `false`. |
| `hsn_code` | integer | The 8-digit code used to classify the product as per the Harmonised System of Nomenclature. |
| `sac_code` | integer | The 6-digit code used to classify the service as per the Services Accounting Code. |
| `tax_rate` | string | The percentage at which an individual or a corporation is taxed. |
| `tax_id` | string | The identification number that gets displayed on invoices issued to the customer. |
| `tax_group_id` | string | The identification number for the tax group. A tax group is a collection of taxes that can be applied as a single set of rules. |
| `created_at` | integer | Unix timestamp, at which the item was created. For example, `1649843796`. |

## Request Example (Node.js)

```javascript
var instance = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })

instance.Items.edit({
  "name": "Book / Ignited Minds - Updated name!",
  "description": "New descirption too.",
  "amount": 20000,
  "currency": "INR",
  "active": true
})
```

## Response Example (Success)

```json
{
  "id": "item_7Oy8OMV6BdEAac",
  "active": true,
  "name": "Book / Ignited Minds - Updated name!",
  "description": "New descirption too.",
  "amount": 20000,
  "unit_amount": 20000,
  "currency": "INR",
  "type": "invoice",
  "unit": null,
  "tax_inclusive": false,
  "hsn_code": null,
  "sac_code": null,
  "tax_rate": null,
  "tax_id": null,
  "tax_group_id": null,
  "created_at": 1649843796
}
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

### Error: The amount field is required when item id is not present
**Status Code:** 400

**Description:** Only name is entered without item id or amount.

---

### Error: The name field is required when item id is not present
**Status Code:** 400

**Description:** Possible reasons:
- Only the amount field is entered without a name or item id.
- The amount, name or item id are not entered.

---

**Note:** For currency handling, ensure you're using the smallest currency unit (e.g., paise for INR). For currencies like KWD, BHD, and OMR, amounts are in the three-decimal unit. For zero-decimal currencies like JPY, amounts are in the basic unit.
