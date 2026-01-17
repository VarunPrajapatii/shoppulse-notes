# Razorpay Subscriptions Entity

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 18 of Razorpay Official Documentation Series

---

## Table of Contents
1. [Overview](#overview)
2. [Core Parameters](#core-parameters)
3. [Status Management](#status-management)
4. [Billing Cycle Parameters](#billing-cycle-parameters)
5. [Customer Communication](#customer-communication)
6. [Advanced Features](#advanced-features)
7. [Example Responses](#example-responses)
8. [Understanding Key Concepts](#understanding-key-concepts)

---

## Overview

The **Subscriptions entity** represents a recurring billing agreement between you and your customer.

### Availability

Available in:
- 🇮🇳 **IN** - India
- 🇲🇾 **MY** - Malaysia
- 🇸🇬 **SG** - Singapore
- 🇺🇸 **US** - United States

---

## Core Parameters

### Basic Identifiers

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `id` | string | **Subscription ID** - Unique identifier | `sub_00000000000001` |
| `entity` | string | Always `"subscription"` | `subscription` |
| `plan_id` | string | **Plan ID** - Linked plan | `plan_00000000000001` |
| `customer_id` | string | **Customer ID** - Auto-populated after authorization | `cust_D00000000000001` |

💡 **Note**: `customer_id` is `null` until the customer completes the authorization payment.

---

### Billing Configuration

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `total_count` | integer | **Total billing cycles** | `6` (for 6 months) |
| `paid_count` | integer | **Completed billing cycles** | `2` (2 months paid) |
| `remaining_count` | integer | **Remaining billing cycles** | `4` (4 months left) |
| `quantity` | integer | **Multiplier for plan amount** | `5` (5 licenses) |

---

### Understanding `total_count`, `paid_count`, and `remaining_count`

**Scenario**: Customer subscribes to a 1-year plan, billed monthly.

```javascript
// Initial state (Day 1)
{
  "total_count": 12,      // 12 months total
  "paid_count": 0,        // Not paid yet
  "remaining_count": 12   // 12 months remaining
}

// After 1st successful payment
{
  "total_count": 12,      // Still 12 months total
  "paid_count": 1,        // 1 month paid
  "remaining_count": 11   // 11 months left
}

// After 6th successful payment (halfway)
{
  "total_count": 12,
  "paid_count": 6,        // 6 months paid
  "remaining_count": 6    // 6 months left
}

// After final payment
{
  "total_count": 12,
  "paid_count": 12,       // All 12 months paid
  "remaining_count": 0    // Complete!
}
```

**Formula**:
```
total_count = paid_count + remaining_count
```

---

### Understanding `quantity`

The `quantity` parameter multiplies the plan amount per invoice.

**Example 1: Software Licenses**
```javascript
// Plan: ₹100/month/license
// Customer wants: 5 licenses

{
  "plan_id": "plan_software",
  "quantity": 5
}

// Customer is charged: ₹500 (5 × ₹100) per month
```

**Example 2: Team Seats**
```javascript
// Plan: ₹999/month/seat (MIDI Plan)
// Customer wants: 3 team members

{
  "plan_id": "plan_midi",
  "quantity": 3
}

// Customer is charged: ₹2,997 (3 × ₹999) per month
```

**Example 3: Single Subscription (Default)**
```javascript
// Plan: ₹4,999/month
// Single subscription

{
  "plan_id": "plan_midi",
  "quantity": 1  // Default
}

// Customer is charged: ₹4,999 per month
```

---

## Status Management

### Subscription States

| Status | Description | Can Charge? | Next State |
|--------|-------------|-------------|------------|
| `created` | Subscription created, awaiting authorization | ❌ No | `authenticated` |
| `authenticated` | Customer authorized, first charge pending | ❌ No | `active` |
| `active` | Subscription running, charging normally | ✅ Yes | `pending`, `cancelled`, `completed` |
| `pending` | Payment failed, retrying | ⚠️ Retrying | `active`, `halted` |
| `halted` | All retries failed, manual intervention needed | ❌ No | `active` (if recovered) |
| `cancelled` | Manually cancelled by business/customer | ❌ No | - |
| `completed` | All billing cycles completed | ❌ No | - |
| `expired` | Authorization expired before activation | ❌ No | - |

**See**: Part 2 - [Subscription States](./2_RAZORPAY_SUBSCRIPTION_WORKFLOW.md) for detailed state transitions.

---

### Status Field

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Current subscription state |

**Possible values**:
- `created`
- `authenticated`
- `active`
- `pending`
- `halted`
- `cancelled`
- `completed`
- `expired`

**Example**:
```json
{
  "id": "sub_123",
  "status": "active",
  "paid_count": 3,
  "remaining_count": 9
}
```

---

## Billing Cycle Parameters

### Timestamps

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `current_start` | integer | **Current cycle start** (Unix) | `1577355873` |
| `current_end` | integer | **Current cycle end** (Unix) | `1582655401` |
| `charge_at` | integer | **Next charge time** (Unix) | `1577385995` |
| `start_at` | integer | **Subscription start time** (Unix) | `1577385995` |
| `end_at` | integer | **Subscription end time** (Unix) | `1603737004` |
| `ended_at` | integer | **Actual end time** (Unix) - `null` if active | `null` |
| `created_at` | integer | **Creation time** (Unix) | `1577356088` |
| `expire_by` | integer | **Authorization expiry** (Unix) | `1577485999` |

---

### Understanding Billing Timestamps

**Scenario**: Monthly subscription starting January 1, 2024

```javascript
// January billing cycle
{
  "current_start": 1704067200,  // Jan 1, 2024 00:00:00
  "current_end": 1706745600,    // Feb 1, 2024 00:00:00
  "charge_at": 1704067200       // Charge on Jan 1
}

// February billing cycle (after successful Jan payment)
{
  "current_start": 1706745600,  // Feb 1, 2024 00:00:00
  "current_end": 1709251200,    // Mar 1, 2024 00:00:00
  "charge_at": 1706745600       // Charge on Feb 1
}
```

**Visual Timeline**:
```
Jan 1             Feb 1             Mar 1
  |                 |                 |
  |<-- Cycle 1 ---->|<-- Cycle 2 ---->|
  ↑                 ↑                 ↑
charge_at      charge_at        charge_at
```

---

### `start_at` vs `created_at`

| Parameter | Description | Use Case |
|-----------|-------------|----------|
| `created_at` | When subscription was created via API | Audit trail |
| `start_at` | When billing should actually start | Delayed start subscriptions |

**Example 1: Immediate Start**
```javascript
// Created on Jan 1, starts immediately
{
  "created_at": 1704067200,  // Jan 1, 2024
  "start_at": 1704067200     // Jan 1, 2024 (same)
}
```

**Example 2: Delayed Start**
```javascript
// Created on Jan 1, starts on Feb 1
{
  "created_at": 1704067200,  // Jan 1, 2024
  "start_at": 1706745600     // Feb 1, 2024 (+1 month)
}
```

**Why delay?**
- **Trial period**: Create subscription now, start billing after 14 days
- **Project start date**: Align billing with project go-live
- **Seasonal timing**: Start at beginning of quarter/year

---

### `expire_by` - Authorization Deadline

The `expire_by` parameter sets a deadline for customer authorization.

**Example**:
```javascript
// Subscription created Jan 1
// Customer has 7 days to authorize

{
  "created_at": 1704067200,     // Jan 1, 2024
  "expire_by": 1704672000,      // Jan 8, 2024 (7 days later)
  "status": "created"
}
```

**If customer doesn't authorize by Jan 8**:
```javascript
{
  "status": "expired",          // Subscription expired
  "ended_at": 1704672000        // Ended at expire_by time
}
```

**Default**: 30 years (no expiry)

**Best Practices**:
- **Payment links**: 7-30 days
- **Corporate subscriptions**: 3-6 months
- **Trial offers**: 1-3 days (urgency)

---

## Customer Communication

### `customer_notify` Parameter

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `customer_notify` | boolean | Who handles notifications | `true` |

**Options**:

**`true` (Default)**: Razorpay sends emails
```javascript
{
  "customer_notify": true
}
```

**Razorpay sends**:
- ✉️ Authorization link
- ✉️ Payment success confirmations
- ✉️ Payment failure alerts
- ✉️ Retry reminders
- ✉️ Cancellation notices

---

**`false`**: You handle all communication
```javascript
{
  "customer_notify": false
}
```

**You must send**:
- ✉️ Custom authorization emails
- ✉️ Branded payment confirmations
- ✉️ Custom failure messages
- ✉️ Your retry reminders
- ✉️ Cancellation emails

**When to use `false`**:
- Custom branding requirements
- Multi-language support
- Complex business logic
- Already have email system

---

## Advanced Features

### `notes` Parameter

Store custom metadata (up to 15 key-value pairs).

| Parameter | Type | Description | Limit |
|-----------|------|-------------|-------|
| `notes` | object | Custom key-value pairs | 15 pairs |

**Example**:
```javascript
{
  "notes": {
    "tier": "midi",
    "max_stores": "10",
    "features": "advanced_analytics,custom_domain",
    "sales_rep": "john_doe",
    "campaign": "summer_2024",
    "referral_code": "FRIEND20",
    "company_name": "Acme Corp",
    "contract_id": "CONTRACT-2024-001",
    "renewal_date": "2025-01-01",
    "special_terms": "quarterly_invoicing"
  }
}
```

**Use Cases**:
- Plan tier identification
- Feature flags
- Sales tracking
- Internal reference IDs
- Custom business logic

---

### `addons` Parameter

Charge upfront fees during authorization.

| Parameter | Type | Description |
|-----------|------|-------------|
| `addons` | array of objects | One-time charges |

**Structure**:
```javascript
{
  "addons": [
    {
      "item": {
        "name": "Setup Fee",
        "amount": 50000,      // ₹500 (in paise)
        "currency": "INR"
      }
    },
    {
      "item": {
        "name": "Delivery Charges",
        "amount": 30000,      // ₹300
        "currency": "INR"
      }
    }
  ]
}
```

**Example: ShopPulse Onboarding**
```javascript
// MIDI Plan: ₹4,999/month + ₹1,000 setup fee
{
  "plan_id": "plan_midi",
  "addons": [
    {
      "item": {
        "name": "Premium Onboarding",
        "amount": 100000,      // ₹1,000
        "currency": "INR"
      }
    }
  ]
}

// Customer pays at authorization: ₹5,999 (₹4,999 + ₹1,000)
// Subsequent months: ₹4,999
```

**Common Addon Types**:
- Setup/onboarding fees
- Delivery/shipping charges
- Hardware/equipment costs
- Training sessions
- Migration services

---

### `offer_id` Parameter

Link promotional offers to subscriptions.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `offer_id` | string | Linked offer ID | `offer_JHD834hjbxzhd38d` |

**Example**:
```javascript
{
  "plan_id": "plan_midi",
  "offer_id": "offer_20OFF",
  "notes": {
    "offer_type": "percentage",
    "discount": "20%"
  }
}
```

**See**: Part 10-13 - [Offers System](./10_RAZORPAY_OFFERS_OVERVIEW.md) for complete details.

---

### `short_url` Parameter

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `short_url` | string | Authorization payment URL | `https://rzp.io/i/PWtAiEo` |

**Use Cases**:

**1. Email to Customer**
```html
<a href="https://rzp.io/i/PWtAiEo">
  Complete Your Subscription
</a>
```

**2. SMS to Customer**
```
Complete your MIDI Plan subscription: https://rzp.io/i/PWtAiEo
```

**3. WhatsApp Message**
```
👋 Hi! Click here to activate your subscription: https://rzp.io/i/PWtAiEo
```

---

### `auth_attempts` Parameter

| Parameter | Type | Description |
|-----------|------|-------------|
| `auth_attempts` | integer | Failed authorization attempts |

**Example**:
```javascript
// First attempt - card declined
{
  "status": "created",
  "auth_attempts": 1
}

// Second attempt - insufficient balance
{
  "status": "created",
  "auth_attempts": 2
}

// Third attempt - success!
{
  "status": "authenticated",
  "auth_attempts": 2  // Resets after success
}
```

**Monitoring**:
```typescript
// Alert if too many failed attempts
if (subscription.auth_attempts > 3) {
  // Customer may need help
  sendSupportEmail(customer);
}
```

---

### Scheduled Changes

| Parameter | Type | Description |
|-----------|------|-------------|
| `has_scheduled_changes` | boolean | Has pending changes |
| `schedule_change_at` | string | When to apply changes |

**Values for `schedule_change_at`**:
- `now` - Apply immediately
- `cycle_end` - Apply at end of current cycle

**Example: Plan Upgrade Scheduled**
```javascript
// Customer upgrades from MINI to MIDI
// Change scheduled for end of current cycle

{
  "plan_id": "plan_mini",                  // Current plan
  "has_scheduled_changes": true,
  "schedule_change_at": "cycle_end",
  "current_end": 1706745600,               // Changes apply here
  "notes": {
    "pending_plan": "plan_midi",
    "upgrade_reason": "needs_more_stores"
  }
}
```

**See**: Part 7 - [Update Subscriptions](./7_RAZORPAY_UPDATE_SUBSCRIPTION.md) for complete details.

---

## Example Responses

### Single Subscription

```json
{
  "id": "sub_00000000000001",
  "entity": "subscription",
  "plan_id": "plan_00000000000001",
  "customer_id": "cust_D00000000000001",
  "status": "active",
  "current_start": 1577355871,
  "current_end": 1582655400,
  "ended_at": null,
  "quantity": 1,
  "notes": {
    "notes_key_1": "Tea, Earl Grey, Hot",
    "notes_key_2": "Tea, Earl Grey… decaf."
  },
  "charge_at": 1577385991,
  "start_at": 1577385991,
  "end_at": 1603737000,
  "auth_attempts": 0,
  "total_count": 6,
  "paid_count": 1,
  "customer_notify": true,
  "created_at": 1577356081,
  "expire_by": 1577485991,
  "short_url": "https://rzp.io/i/z3b1R61A9",
  "has_scheduled_changes": false,
  "change_scheduled_at": null,
  "offer_id": "offer_JHD834hjbxzhd38d",
  "remaining_count": 5
}
```

---

### Collection Response

```json
{
  "entity": "collection",
  "count": 2,
  "items": [
    {
      "id": "sub_00000000000005",
      "entity": "subscription",
      "plan_id": "plan_00000000000004",
      "customer_id": "cust_D00000000000006",
      "status": "active",
      "current_start": 1577355873,
      "current_end": 1582655401,
      "ended_at": null,
      "quantity": 1,
      "notes": {
        "notes_key_1": "Tea, Earl Grey, Hot",
        "notes_key_2": "Tea, Earl Grey… decaf."
      },
      "charge_at": 1577385995,
      "offer_id": "offer_JHD834hjbxzhd38d",
      "start_at": 1577385995,
      "end_at": 1603737004,
      "auth_attempts": 0,
      "total_count": 6,
      "paid_count": 1,
      "customer_notify": true,
      "created_at": 1577356088,
      "expire_by": 1577485999,
      "short_url": "https://rzp.io/i/z3b1R61A9",
      "has_scheduled_changes": false,
      "change_scheduled_at": null,
      "remaining_count": 5
    },
    {
      "id": "sub_00000000000006",
      "entity": "subscription",
      "plan_id": "plan_00000000000009",
      "customer_id": "cust_D00000000000005",
      "status": "active",
      "current_start": 1577355875,
      "current_end": 1577355875,
      "ended_at": null,
      "quantity": 1,
      "notes": {
        "notes_key_1": "Tea, Earl Grey, Hot",
        "notes_key_2": "Tea, Earl Grey… decaf."
      },
      "charge_at": 1561852802,
      "start_at": 1561852802,
      "end_at": 1590777006,
      "auth_attempts": 0,
      "total_count": 12,
      "paid_count": 1,
      "customer_notify": true,
      "created_at": 1560241237,
      "expire_by": 1561939197,
      "short_url": "https://rzp.io/i/m0y0f",
      "has_scheduled_changes": false,
      "change_scheduled_at": null,
      "source": "api",
      "offer_id": "offer_JHD834hjbxzhd38d",
      "remaining_count": 11
    }
  ]
}
```

---

## Understanding Key Concepts

### 1. Subscription Lifecycle

```
CREATE → AUTHENTICATE → ACTIVE → COMPLETED
                            ↓
                        PENDING → HALTED
                            ↓
                        CANCELLED
```

**Key Points**:
- `created`: Waiting for customer authorization
- `authenticated`: Authorization done, first charge pending
- `active`: Recurring charges happening
- `pending`: Payment failed, retrying
- `halted`: All retries failed
- `cancelled`: Manually stopped
- `completed`: All cycles finished

---

### 2. Billing Cycle Tracking

**Every cycle**:
1. `charge_at` triggers payment
2. If success: `paid_count++`, `remaining_count--`
3. Update `current_start` and `current_end`
4. Set next `charge_at`

**Example Flow**:
```javascript
// Cycle 1
charge_at = Jan 1 → Payment Success
paid_count: 0 → 1
remaining_count: 12 → 11

// Cycle 2
charge_at = Feb 1 → Payment Success
paid_count: 1 → 2
remaining_count: 11 → 10

// ... continues until remaining_count = 0
```

---

### 3. Timestamp Conversion

**Unix to Human**:
```typescript
// Unix timestamp: 1577355871
const date = new Date(1577355871 * 1000); // Multiply by 1000 for JS
console.log(date.toISOString());
// Output: "2019-12-26T12:11:11.000Z"
```

**Human to Unix**:
```typescript
const date = new Date('2024-01-01T00:00:00Z');
const unix = Math.floor(date.getTime() / 1000); // Divide by 1000
console.log(unix);
// Output: 1704067200
```

---

### 4. ShopPulse Implementation

**Subscription Structure**:
```typescript
interface ShopPulseSubscription {
  // Razorpay fields
  razorpay_subscription_id: string;
  razorpay_plan_id: string;
  razorpay_customer_id: string;
  status: string;
  
  // Business fields
  user_id: string;
  tier: 'mini' | 'midi' | 'maxi';
  max_stores: number;
  features: string[];
  
  // Billing tracking
  current_period_start: Date;
  current_period_end: Date;
  next_charge_date: Date;
  
  // Metadata
  notes: any;
  created_at: Date;
  updated_at: Date;
}
```

---

## Related Documentation

- Part 2: [Subscription Workflow](./2_RAZORPAY_SUBSCRIPTION_WORKFLOW.md)
- Part 3: [Subscription States](./3_RAZORPAY_SUBSCRIPTION_STATES.md)
- Part 19: [Create Subscription API](./19_RAZORPAY_CREATE_SUBSCRIPTION.md) (Next)
- Part 20: [Create Subscription Link API](./20_RAZORPAY_CREATE_SUBSCRIPTION_LINK.md)
- Part 21: [Fetch Subscriptions API](./21_RAZORPAY_FETCH_SUBSCRIPTIONS.md)
