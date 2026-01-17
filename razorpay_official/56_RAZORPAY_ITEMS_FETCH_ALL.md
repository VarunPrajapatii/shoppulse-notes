# Razorpay Items API - Fetch All Items

**Available in:** 🇮🇳 India | 🇲🇾 Malaysia

## Endpoint
```
GET /v1/items
```

## Description
Use this endpoint to retrieve the details of all the items created till date.

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | integer | No | Unix timestamp, in seconds, from when the items are to be fetched. |
| `to` | integer | No | Unix timestamp, in seconds, till when the items are to be fetched. |
| `count` | integer | No | Number of items to be fetched.<br/>• Default value: `10`<br/>• Maximum value: `100`<br/>• This can be used for pagination, in combination with the `skip` parameter. |
| `skip` | integer | No | Number of records to be skipped while fetching the items. |
| `active` | integer | No | Fetches number of active or inactive items.<br/>• The value is `1` for active items.<br/>• The value is `0` for inactive items. |

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

instance.items.all(options)
```

## Response Example (Success)

```json
{
  "entity": "collection",
  "count": 2,
  "items": [
    {
      "id": "item_JInaSLODeDUQiQ",
      "active": true,
      "name": "Book / English August",
      "description": "An indian story, Booker prize winner.",
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
    },
    {
      "id": "item_JIPSg5L06yhHie",
      "active": false,
      "name": "Book / Ignited Minds - Updated name!",
      "description": "New descirption too. :).",
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
      "created_at": 1649758835
    }
  ]
}
```

## Errors

### Error: The API <key/secret> provided is invalid
**Status Code:** 4xx

**Description:** The API credentials passed in the API call differ from the ones generated on the Dashboard.
- Different keys for test mode and live modes.
- Expired API key.

---

**Note:** For currency handling, ensure you're using the smallest currency unit (e.g., paise for INR). For currencies like KWD, BHD, and OMR, amounts are in the three-decimal unit. For zero-decimal currencies like JPY, amounts are in the basic unit.
