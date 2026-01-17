# Razorpay Plans Entity

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 15 of Razorpay Official Documentation Series

---

## Table of Contents
1. [Overview](#overview)
2. [Plans Entity Parameters](#plans-entity-parameters)
3. [Understanding Billing Frequency](#understanding-billing-frequency)
4. [Currency Support](#currency-support)
5. [Example Response](#example-response)

---

## Overview

The **Plans Entity** represents the structure of a subscription plan in Razorpay. Understanding this entity is crucial for working with the Plans API.

### Availability

Available in:
- 🇮🇳 **IN** - India
- 🇲🇾 **MY** - Malaysia
- 🇸🇬 **SG** - Singapore
- 🇺🇸 **US** - United States

---

## Plans Entity Parameters

### Core Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `id` | string | Unique plan identifier (used when creating subscriptions) | `"plan_00000000000001"` |
| `entity` | string | Entity type (always `"plan"`) | `"plan"` |
| `interval` | integer | Frequency multiplier (combined with `period`) | `1`, `2`, `3` |
| `period` | string | Time unit for billing cycle | `"weekly"`, `"monthly"`, `"yearly"` |
| `item` | object | Plan details (name, amount, currency, etc.) | See below |
| `notes` | object | Custom key-value pairs for reference | `{"customer_type": "premium"}` |
| `created_at` | integer | Unix timestamp of plan creation | `1580220481` |

---

### Understanding `interval` and `period`

These two parameters **work together** to define the billing frequency.

**Formula**:
```
Billing Frequency = interval × period
```

**Examples**:

```javascript
// Bill every week
{
  "interval": 1,
  "period": "weekly"
}
// Result: Charged once per week

// Bill every 2 months
{
  "interval": 2,
  "period": "monthly"
}
// Result: Charged once every 2 months (bi-monthly)

// Bill every 3 weeks
{
  "interval": 3,
  "period": "weekly"
}
// Result: Charged once every 3 weeks

// Bill every 6 months
{
  "interval": 6,
  "period": "monthly"
}
// Result: Charged once every 6 months (semi-annually)

// Bill every 2 years
{
  "interval": 2,
  "period": "yearly"
}
// Result: Charged once every 2 years (biennial)
```

**Common Patterns**:

| Billing Cycle | `interval` | `period` | Real Example |
|---------------|------------|----------|--------------|
| Weekly | `1` | `"weekly"` | Meal subscription |
| Bi-weekly | `2` | `"weekly"` | Cleaning service |
| Monthly | `1` | `"monthly"` | SaaS subscriptions (most common) |
| Quarterly | `3` | `"monthly"` | Magazine subscriptions |
| Quarterly | `1` | `"quarterly"` | Same as above (alternative) |
| Semi-annual | `6` | `"monthly"` | Insurance premiums |
| Annual | `1` | `"yearly"` | Domain registration |

---

### Special Rules for `interval`

💡 **Handy Tip**: For **daily plans**, the minimum `interval` value should be **7** (one week).

**Why This Restriction?**

```
❌ NOT Allowed:
{
  "interval": 1,
  "period": "daily"
}
// Too frequent, system limitation

❌ NOT Allowed:
{
  "interval": 5,
  "period": "daily"
}
// Less than 7 days

✅ Allowed:
{
  "interval": 7,
  "period": "daily"
}
// Minimum: Weekly (7 days)

✅ Allowed:
{
  "interval": 14,
  "period": "daily"
}
// Bi-weekly (14 days)

✅ Allowed:
{
  "interval": 30,
  "period": "daily"
}
// Monthly (30 days)
```

**Alternative Approach**:
```javascript
// Instead of daily with interval < 7, use weekly
{
  "interval": 1,
  "period": "weekly"  // ✅ Cleaner and equivalent
}
```

---

### Available `period` Values

| Period | Description | Use Cases |
|--------|-------------|-----------|
| `"daily"` | Daily billing (min 7 days) | Long-term rentals, car services |
| `"weekly"` | Weekly billing | Meal kits, gym memberships |
| `"monthly"` | Monthly billing | **Most common for SaaS** |
| `"quarterly"` | Every 3 months | B2B services, retainers |
| `"yearly"` | Annual billing | Domain hosting, licenses |

💡 **Handy Tip**: You can create **custom frequencies**! For example, "once in 3 weeks" using `interval: 3, period: "weekly"`.

---

## Understanding `item` Object

The `item` object contains the actual plan details.

### Item Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string | Auto-generated | Unique item identifier | `"item_00000000000001"` |
| `name` | string | ✅ Yes | Plan name (visible to customers) | `"MIDI Plan"` |
| `amount` | integer | ✅ Yes | Price in currency subunits (paise) | `499900` (₹4,999) |
| `currency` | string | ✅ Yes | ISO currency code | `"INR"`, `"USD"` |
| `description` | string | ❌ Optional | Plan description | `"Perfect for growing businesses"` |

### Amount Representation

**Critical**: Amounts are in **smallest currency subunit**.

```javascript
// For INR (2 decimal places)
₹999 → amount: 99900 (in paise)
₹4,999 → amount: 499900
₹9,999 → amount: 999900

// Conversion formula
amount_in_paise = amount_in_rupees × 100

// For USD (2 decimal places)
$99.99 → amount: 9999 (in cents)

// For KWD (3 decimal places) - Kuwait Dinar
99.990 KD → amount: 99990 (in fils)

// For JPY (0 decimal places) - Japanese Yen
¥999 → amount: 999 (no subunit)
```

---

## Currency Support

### Standard Currencies (2 Decimals)

Most currencies use 2 decimal places:

```javascript
{
  "amount": 99900,  // ₹999.00
  "currency": "INR"
}

{
  "amount": 9999,   // $99.99
  "currency": "USD"
}
```

### Three Decimal Currencies

**Supported**: KWD (Kuwait Dinar), BHD (Bahrain Dinar), OMR (Omani Rial)

```javascript
{
  "amount": 99990,  // 99.990 KD
  "currency": "KWD"
}
```

⚠️ **Watch Out!**: As per payment guidelines, the **last decimal** should be `0` for three decimal currencies.

**Example**:
```javascript
// ❌ WRONG
{
  "amount": 99991,  // 99.991 KD - last digit not 0
  "currency": "KWD"
}

// ✅ CORRECT
{
  "amount": 99990,  // 99.990 KD - last digit is 0
  "currency": "KWD"
}
```

### Zero Decimal Currencies

**Supported**: JPY (Japanese Yen), KRW (Korean Won)

```javascript
{
  "amount": 999,    // ¥999 (no decimals)
  "currency": "JPY"
}

// No conversion needed - amount is as-is
```

💡 **Handy Tip**: Razorpay supports **zero decimal** and **three decimal** currencies, allowing businesses to accept international payments (May 2024 feature).

---

## Notes Parameter

Custom key-value pairs for internal reference.

**Specifications**:
- Maximum **15 key-value pairs**
- Key and value are both strings
- Not visible to customers
- Useful for internal tracking

**Example Use Cases**:

```javascript
// Customer segmentation
{
  "notes": {
    "customer_type": "enterprise",
    "sales_rep": "john_doe",
    "contract_id": "CT-2025-001"
  }
}

// Campaign tracking
{
  "notes": {
    "campaign": "black_friday_2025",
    "discount_applied": "20_percent",
    "referral_code": "FRIEND20"
  }
}

// Internal metadata
{
  "notes": {
    "created_by": "admin_user_123",
    "plan_version": "v2",
    "test_mode": "false"
  }
}
```

---

## Example Response

### Single Plan Response

```json
{
  "id": "plan_00000000000001",
  "entity": "plan",
  "interval": 1,
  "period": "monthly",
  "item": {
    "id": "item_00000000000001",
    "active": true,
    "name": "MIDI Plan",
    "description": "Perfect for growing businesses",
    "amount": 499900,
    "unit_amount": 499900,
    "currency": "INR",
    "type": "plan",
    "unit": null,
    "tax_inclusive": false,
    "hsn_code": null,
    "sac_code": null,
    "tax_rate": null,
    "tax_id": null,
    "tax_group_id": null,
    "created_at": 1580220461,
    "updated_at": 1580220481
  },
  "notes": {
    "plan_tier": "midi",
    "features": "advanced_analytics,custom_domain",
    "max_stores": "10"
  },
  "created_at": 1580220481
}
```

### Multiple Plans Response (Collection)

```json
{
  "entity": "collection",
  "count": 2,
  "items": [
    {
      "id": "plan_00000000000008",
      "entity": "plan",
      "interval": 1,
      "period": "weekly",
      "item": {
        "id": "item_00000000000005",
        "active": true,
        "name": "Test plan - Weekly",
        "description": "Description for the test plan - Weekly",
        "amount": 89900,
        "unit_amount": 89900,
        "currency": "INR",
        "type": "plan",
        "unit": null,
        "tax_inclusive": false,
        "hsn_code": null,
        "sac_code": null,
        "tax_rate": null,
        "tax_id": null,
        "tax_group_id": null,
        "created_at": 1580220461,
        "updated_at": 1580220481
      },
      "notes": {
        "notes_key_1": "Tea, Earl Grey, Hot",
        "notes_key_2": "Tea, Earl Grey… decaf."
      },
      "created_at": 1580220481
    },
    {
      "id": "plan_00000000000009",
      "entity": "plan",
      "interval": 1,
      "period": "monthly",
      "item": {
        "id": "item_00000000000002",
        "active": true,
        "name": "Test plan - Monthly",
        "description": null,
        "amount": 79900,
        "unit_amount": 79900,
        "currency": "INR",
        "type": "plan",
        "unit": null,
        "tax_inclusive": false,
        "hsn_code": null,
        "sac_code": null,
        "tax_rate": null,
        "tax_id": null,
        "tax_group_id": null,
        "created_at": 1580220493,
        "updated_at": 1580220493
      },
      "notes": [],
      "created_at": 1580220493
    }
  ]
}
```

---

## Payment Method Considerations

Different payment methods have different frequency support:

### UPI Autopay

```
Supported frequencies:
✅ daily
✅ weekly
✅ monthly
✅ quarterly
✅ yearly

❌ Custom frequencies (e.g., "every 3 weeks"):
   Considered "as-presented" (manual processing may be needed)
```

### Domestic Cards (India)

```
Supported frequencies for mandate registration:
✅ weekly
✅ monthly
✅ yearly

❌ Other frequencies (e.g., "daily", "quarterly"):
   Considered "as-presented" (may require manual handling)
```

### Emandate (NetBanking)

```
All frequencies supported:
✅ All defined frequencies (daily, weekly, monthly, quarterly, yearly)
✅ All custom frequencies (e.g., "every 2 months")
   All considered "as-presented" during mandate registration
```

**Practical Impact for ShopPulse**:

```javascript
// Your MINI, MIDI, MAXI plans
{
  "interval": 1,
  "period": "monthly"
}

✅ Supported by: UPI, Domestic Cards, Emandate
✅ Safe choice for maximum payment method compatibility
```

---

## Implementation Notes for ShopPulse

### Your Plan Structure

```typescript
// Database schema alignment
interface Plan {
  razorpay_plan_id: string;      // Maps to "id"
  name: string;                   // Maps to "item.name"
  amount: number;                 // Maps to "item.amount"
  currency: string;               // Maps to "item.currency"
  interval: number;               // Maps to "interval"
  period: 'monthly' | 'yearly';   // Maps to "period"
  description: string;            // Maps to "item.description"
  metadata: object;               // Maps to "notes"
}
```

### Example: ShopPulse Plans

```javascript
// MINI Plan
{
  "id": "plan_mini_monthly",
  "entity": "plan",
  "interval": 1,
  "period": "monthly",
  "item": {
    "name": "MINI Plan",
    "amount": 99900,              // ₹999
    "currency": "INR",
    "description": "Perfect for small stores"
  },
  "notes": {
    "tier": "mini",
    "max_stores": "3",
    "features": "basic_analytics"
  }
}

// MIDI Plan
{
  "id": "plan_midi_monthly",
  "entity": "plan",
  "interval": 1,
  "period": "monthly",
  "item": {
    "name": "MIDI Plan",
    "amount": 499900,             // ₹4,999
    "currency": "INR",
    "description": "Perfect for growing businesses"
  },
  "notes": {
    "tier": "midi",
    "max_stores": "10",
    "features": "advanced_analytics,custom_domain"
  }
}

// MAXI Plan
{
  "id": "plan_maxi_monthly",
  "entity": "plan",
  "interval": 1,
  "period": "monthly",
  "item": {
    "name": "MAXI Plan",
    "amount": 999900,             // ₹9,999
    "currency": "INR",
    "description": "For large enterprises"
  },
  "notes": {
    "tier": "maxi",
    "max_stores": "50",
    "features": "premium_support,api_access,white_label"
  }
}
```

---

## Related Documentation

- Part 16: [Create a Plan API](./16_RAZORPAY_CREATE_PLAN.md) (Next)
- Part 17: [Fetch Plans API](./17_RAZORPAY_FETCH_PLANS.md)
- Part 4: [Create and View Plans Dashboard](./4_RAZORPAY_CREATE_AND_VIEW_PLANS.md)
