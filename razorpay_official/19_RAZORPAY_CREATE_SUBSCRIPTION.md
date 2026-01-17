# Razorpay Create Subscription API 🇮🇳 🇲🇾 🇸🇬 🇺🇸

**Source**: Official Razorpay Documentation  
**Last Updated**: November 30, 2025  
**Part**: 19 of Razorpay Official Documentation Series

---

## Table of Contents
1. [API Overview](#api-overview)
2. [Request Parameters](#request-parameters)
3. [Response Structure](#response-structure)
4. [Error Handling](#error-handling)
5. [Code Examples](#code-examples)
6. [Implementation Guide](#implementation-guide)

---

## API Overview

**Endpoint**: `POST /v1/subscriptions`

Use this endpoint to **create a subscription programmatically**.

### Availability

Available in:
- 🇮🇳 **India**
- 🇲🇾 **Malaysia**
- 🇸🇬 **Singapore**
- 🇺🇸 **United States**

### Authentication

```
Basic Auth using API Key and Secret
```

---

## Request Parameters

### Complete Parameter Reference (9 Parameters)

### Required Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `plan_id` | string | ✅ Yes | The unique identifier of a plan that should be linked to the Subscription. For example, `plan_00000000000001`. | 
| `total_count` | integer | ✅ Yes | The number of billing cycles for which the customer should be charged. For example, if a customer is buying a 1-year subscription billed on a bi-monthly basis, this value should be `6`. |

### Optional Parameters

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `quantity` | integer | ❌ Optional | The number of times the customer should be charged the plan amount per invoice. For example, if charges are ₹100.00/month/license and customer wants 5 licenses, pass `5` as quantity. Customer is charged ₹500.00 (5 x ₹100.00) monthly. | `1` |
| `start_at` | integer | ❌ Optional | Unix timestamp that indicates from when the Subscription should start. If not passed, the Subscription starts immediately after the authorisation payment. For example, `1581013800`. For Subscriptions with a future start_date, frequency is considered `as_presented`. | Immediate |
| `expire_by` | integer | ❌ Optional | Unix timestamp that indicates till when the customer can make the authorisation payment. For example, `1581013800`. The default value is 30 years. Do not pass any value if you do not want to set an expiry date. | 30 years |
| `customer_notify` | boolean | ❌ Optional | Indicates whether the communication to the customer would be handled by businesses or Razorpay. <br>• `true` (default): Communication handled by Razorpay.<br>• `false`: Communication handled by businesses. | `true` |
| `addons` | array | ❌ Optional | Array that contains details of any upfront amount you want to collect as part of the authorisation transaction. Contains child parameter `item` with `name`, `amount`, and `currency`. | `[]` |
| `offer_id` | string | ❌ Optional | The unique identifier of the offer that is linked to the Subscription. You can obtain this from the Dashboard. For example, `offer_JHD834hjbxzhd38d`. | `null` |
| `notes` | object | ❌ Optional | Notes you can enter for the contact for future reference. This is a key-value pair. You can enter a maximum of 15 key-value pairs. For example, `"note_key": "Beam me up Scotty"`. | `{}` |

#### Addons Parameter Structure

```json
{
  "addons": [
    {
      "item": {
        "name": "Delivery charges",
        "amount": 30000,
        "currency": "INR"
      }
    }
  ]
}
```

---

## Understanding Request Parameters

### 1. `plan_id` and `total_count` (Required)

**Example 1: 6-Month Subscription**
```javascript
{
  "plan_id": "plan_midi",      // MIDI Plan (₹4,999/month)
  "total_count": 6             // 6 billing cycles
}

// Customer pays ₹4,999/month for 6 months
// Total: ₹29,994
```

**Example 2: 1-Year Subscription**
```javascript
{
  "plan_id": "plan_mini",      // MINI Plan (₹999/month)
  "total_count": 12            // 12 billing cycles
}

// Customer pays ₹999/month for 12 months
// Total: ₹11,988
```

**Example 3: Quarterly Plan (Two Ways)**

**Method A**: Using monthly plan with `total_count`
```javascript
{
  "plan_id": "plan_monthly",   // ₹4,999/month
  "total_count": 4             // 4 quarters × 3 months = 12 months
}
```

**Method B**: Using quarterly plan
```javascript
{
  "plan_id": "plan_quarterly", // ₹14,997/quarter
  "total_count": 4             // 4 quarters = 1 year
}
```

---

### 2. `quantity` (Multiplier)

**Example 1: Software Licenses**
```javascript
// Plan: ₹100/month/license
// Customer needs: 5 licenses

{
  "plan_id": "plan_per_license",
  "total_count": 12,
  "quantity": 5                // 5 licenses
}

// Monthly charge: ₹500 (5 × ₹100)
// Annual total: ₹6,000 (₹500 × 12)
```

**Example 2: Team Seats**
```javascript
// Plan: ₹999/month/seat (MIDI Plan)
// Team size: 3 members

{
  "plan_id": "plan_midi",
  "total_count": 12,
  "quantity": 3                // 3 seats
}

// Monthly charge: ₹2,997 (3 × ₹999)
// Annual total: ₹35,964
```

**Example 3: Single Subscription (Default)**
```javascript
{
  "plan_id": "plan_maxi",
  "total_count": 12,
  "quantity": 1                // Default, can be omitted
}

// Monthly charge: ₹9,999
```

---

### 3. `start_at` (Delayed Start)

**Example 1: Immediate Start (Default)**
```javascript
{
  "plan_id": "plan_midi",
  "total_count": 12
  // No start_at = starts immediately after authorization
}
```

**Example 2: Start Next Month**
```javascript
// Today: Jan 15, 2024
// Want to start: Feb 1, 2024

const startDate = new Date('2024-02-01T00:00:00Z');
const start_at = Math.floor(startDate.getTime() / 1000);

{
  "plan_id": "plan_midi",
  "total_count": 12,
  "start_at": start_at         // Feb 1, 2024
}
```

**Example 3: 14-Day Trial**
```javascript
// Start billing after 14 days

const trialEnd = Math.floor((Date.now() + (14 * 24 * 60 * 60 * 1000)) / 1000);

{
  "plan_id": "plan_midi",
  "total_count": 12,
  "start_at": trialEnd         // 14 days from now
}
```

**Example 4: Align with Fiscal Year**
```javascript
// Start on Apr 1 (fiscal year start in India)

const fiscalYearStart = new Date('2024-04-01T00:00:00Z');
const start_at = Math.floor(fiscalYearStart.getTime() / 1000);

{
  "plan_id": "plan_enterprise",
  "total_count": 12,
  "start_at": start_at
}
```

---

### 4. `expire_by` (Authorization Deadline)

**Example 1: 7-Day Deadline**
```javascript
// Customer has 7 days to authorize

const deadline = Math.floor((Date.now() + (7 * 24 * 60 * 60 * 1000)) / 1000);

{
  "plan_id": "plan_midi",
  "total_count": 12,
  "expire_by": deadline
}
```

**Example 2: No Expiry (Default)**
```javascript
{
  "plan_id": "plan_midi",
  "total_count": 12
  // No expire_by = defaults to 30 years
}
```

**Example 3: End of Month Deadline**
```javascript
// Must authorize by month end

const lastDayOfMonth = new Date('2024-01-31T23:59:59Z');
const expire_by = Math.floor(lastDayOfMonth.getTime() / 1000);

{
  "plan_id": "plan_promotional",
  "total_count": 6,
  "expire_by": expire_by
}
```

---

### 5. `customer_notify` (Communication Control)

**Example 1: Razorpay Handles (Default)**
```javascript
{
  "plan_id": "plan_midi",
  "total_count": 12,
  "customer_notify": true      // Razorpay sends all emails
}
```

**Razorpay sends**:
- ✉️ Authorization link
- ✉️ Payment confirmations
- ✉️ Failure notifications
- ✉️ Renewal reminders

---

**Example 2: You Handle Communication**
```javascript
{
  "plan_id": "plan_midi",
  "total_count": 12,
  "customer_notify": false     // You handle all emails
}
```

**You must send**:
- ✉️ Custom authorization email with `short_url`
- ✉️ Branded payment confirmations
- ✉️ Custom failure alerts
- ✉️ Your renewal reminders

---

### 6. `addons` (Upfront Charges)

**Example 1: Setup Fee**
```javascript
{
  "plan_id": "plan_midi",
  "total_count": 12,
  "addons": [
    {
      "item": {
        "name": "Setup Fee",
        "amount": 100000,        // ₹1,000 (in paise)
        "currency": "INR"
      }
    }
  ]
}

// First payment: ₹5,999 (₹4,999 plan + ₹1,000 setup)
// Subsequent months: ₹4,999
```

**Example 2: Multiple Addons**
```javascript
{
  "plan_id": "plan_enterprise",
  "total_count": 12,
  "addons": [
    {
      "item": {
        "name": "Premium Onboarding",
        "amount": 250000,        // ₹2,500
        "currency": "INR"
      }
    },
    {
      "item": {
        "name": "Data Migration",
        "amount": 150000,        // ₹1,500
        "currency": "INR"
      }
    },
    {
      "item": {
        "name": "Training Session",
        "amount": 100000,        // ₹1,000
        "currency": "INR"
      }
    }
  ]
}

// First payment: ₹14,999 (₹9,999 + ₹2,500 + ₹1,500 + ₹1,000)
// Subsequent months: ₹9,999
```

---

### 7. `offer_id` (Promotional Offers)

**Example 1: Percentage Discount**
```javascript
// Offer: 20% off for first 3 months

{
  "plan_id": "plan_midi",
  "total_count": 12,
  "offer_id": "offer_20OFF"
}

// Month 1-3: ₹3,999 (20% off ₹4,999)
// Month 4-12: ₹4,999 (regular price)
```

**Example 2: Flat Discount**
```javascript
// Offer: ₹500 off forever

{
  "plan_id": "plan_maxi",
  "total_count": 12,
  "offer_id": "offer_FLAT500"
}

// All 12 months: ₹9,499 (₹9,999 - ₹500)
```

**See**: Part 10-13 - [Offers System](./10_RAZORPAY_OFFERS_OVERVIEW.md) for complete details.

---

### 8. `notes` (Custom Metadata)

**Example 1: Basic Tracking**
```javascript
{
  "plan_id": "plan_midi",
  "total_count": 12,
  "notes": {
    "tier": "midi",
    "max_stores": "10",
    "sales_rep": "john_doe",
    "campaign": "summer_2024"
  }
}
```

**Example 2: Detailed Metadata**
```javascript
{
  "plan_id": "plan_enterprise",
  "total_count": 12,
  "notes": {
    "company_name": "Acme Corp",
    "contract_id": "CONTRACT-2024-001",
    "billing_contact": "finance@acme.com",
    "payment_terms": "net_30",
    "auto_renew": "true",
    "custom_domain": "acme.shoppulse.com",
    "dedicated_support": "true",
    "onboarding_date": "2024-02-01",
    "industry": "retail",
    "employee_count": "50-100"
  }
}
```

**Limit**: 15 key-value pairs maximum

---

## Response Structure

### Complete Response Parameters (24 Parameters)

### Success Response

```json
{
  "id": "sub_00000000000001",
  "entity": "subscription",
  "plan_id": "plan_00000000000001",
  "customer_id": null,
  "status": "created",
  "current_start": null,
  "current_end": null,
  "ended_at": null,
  "quantity": 1,
  "notes": {
    "notes_key_1": "Tea, Earl Grey, Hot",
    "notes_key_2": "Tea, Earl Grey… decaf."
  },
  "charge_at": 1580453311,
  "start_at": 1580626111,
  "end_at": 1583433000,
  "auth_attempts": 0,
  "total_count": 6,
  "paid_count": 0,
  "customer_notify": true,
  "created_at": 1580280581,
  "expire_by": 1580626111,
  "short_url": "https://rzp.io/i/z3b1R61A9",
  "has_scheduled_changes": false,
  "change_scheduled_at": null,
  "source": "api",
  "offer_id": "offer_JHD834hjbxzhd38d",
  "remaining_count": 5
}
```

### Response Parameters Reference

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The unique identifier of the subscription created. For example, `sub_00000000000001`. **Critical: Store this!** |
| `entity` | string | The entity being created. Here, it will be `subscription`. |
| `plan_id` | string | The unique identifier for a plan that is linked to the created subscription. For example, `plan_00000000000001`. |
| `customer_id` | string | The unique identifier of the customer linked to the subscription. This is populated automatically once the customer completes the authorization transaction. For example, `cust_00000000000001`. |
| `status` | string | Status of the subscription. Possible values: `created`, `authenticated`, `active`, `pending`, `halted`, `cancelled`, `completed`, `expired`. Refer to the life cycle section for more details. |
| `current_start` | integer | Unix timestamp. The start time of the current billing cycle of the subscription. For example, `1581013800`. |
| `current_end` | integer | Unix timestamp. The end time of the current billing cycle of the subscription. For example, `1581013800`. |
| `ended_at` | integer | The timestamp, in Unix format, when the subscription was completed or was cancelled. For example, `1581013800`. |
| `quantity` | integer | The number of times the plan should be linked to the subscription. For example, if the plan is ₹100.00/user/month and the customer has 5 users, you should pass 5 as the quantity to have the customer charged ₹500.00 (5 x ₹100.00) monthly. By default, this value is set to 1. |
| `notes` | object | Notes you can enter for the contact for future reference. This is a key-value pair. You can enter a maximum of 15 key-value pairs. For example, `"note_key": "Beam me up Scotty"`. |
| `charge_at` | integer | Unix timestamp. This indicates when the next charge on the subscription should be made. For example, `1581013800`. |
| `offer_id` | string | The unique identifier of the offer that should be linked to the subscription. For example, `offer_JHD834hjbxzhd38d`. |
| `start_at` | integer | The timestamp, in Unix format, when the subscription should start. If not passed, the subscription starts immediately after the authorization payment. For example, `1581013800`. |
| `end_at` | integer | The timestamp, in Unix format, when the subscription should end. For example, `1581013800`. |
| `auth_attempts` | integer | The number of times that the charge for the current billing cycle has been attempted on the card. For example, `2`. |
| `total_count` | integer | The number of billing cycles for which the customer should be charged. For example, `2`. We support subscriptions for a maximum duration of 100 years. The number of billing cycles depends if the subscription is daily, weekly, monthly or yearly. |
| `paid_count` | integer | This indicates the number of billing cycles for which the customer has already been charged. For example, `2`. |
| `customer_notify` | boolean | Indicates whether the communication to the customer would be handled by businesses or Razorpay. <br>• `true`: Communication handled by Razorpay. Defaults to `true`.<br>• `false`: Communication handled by businesses. |
| `created_at` | integer | The timestamp, in Unix format, when the subscription was created. For example, `1581013800`. |
| `expire_by` | integer | The timestamp, in Unix format, till when the customer can make the authorization payment. For example, `1581013800`. |
| `short_url` | string | URL that can be used to make the authorization payment. For example, `https://rzp.io/i/PWtAiEo`. **Critical: Send this to customer!** |
| `has_scheduled_changes` | boolean | Indicates if the subscription has any scheduled changes. Possible values:<br>• `true`: Subscription has scheduled changes.<br>• `false`: Subscription does not have scheduled changes. |
| `change_scheduled_at` | string | Represents when the subscription should be updated. Possible values:<br>• `now` (default): Updates the subscription immediately.<br>• `cycle_end`: Updates the subscription at the end of the current billing cycle. |
| `remaining_count` | integer | This indicates the number of billing cycles remaining on the subscription. For example, `2`. |

**Critical Fields to Store in Database:**
- ✅ `id` - Subscription ID for all future operations
- ✅ `short_url` - Authorization URL to send to customer
- ✅ `status` - Track subscription state
- ✅ `customer_id` - Populated after authorization

---

## Error Handling

### Complete Error Reference (4 Error Scenarios)

### Error 1: Subscriptions Feature Not Enabled (400)

**Error Message**: `"The requested URL was not found on the server."`

**When It Happens**:
This error occurs when the Subscriptions feature is not enabled on your Razorpay account.

```javascript
// Subscriptions not enabled in test/live mode
```

**Error Response**:
```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "The requested URL was not found on the server.",
    "source": "NA",
    "step": "NA",
    "reason": "NA",
    "metadata": {}
  }
}
```

**Solution**:
```typescript
// 1. Go to Razorpay Dashboard
// 2. Settings → Product Configuration
// 3. Enable "Subscriptions" in both test and live mode
// 4. Save changes and retry API call
```

---

### Error 2: Invalid Plan ID (400)

**Error Message**: `"The id provided does not exist"`

**When It Happens**:
This error occurs when passing an incorrect `plan_id`.

```javascript
{
  "plan_id": "plan_invalid123",  // ❌ Wrong plan ID
  "total_count": 12
}
```

**Error Response**:
```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "The id provided does not exist"
  }
}
```

**Solution**:
```typescript
// ✅ Verify plan exists and is active
const plan = await razorpay.plans.fetch("plan_midi");

if (plan.item.active) {
  // Create subscription with this plan
}

// ✅ Check API keys match (test vs live mode)
// Plan created with test key? Use test key for subscription
// Plan created with live key? Use live key for subscription

// ✅ Verify plan ID from Dashboard
// Dashboard → Subscriptions → Plans → Copy Plan ID
```

---

### Error 3: Offer Not Found (400)

**Error Message**: `"Offer Not Found"`

**When It Happens**:
This error occurs when you are linking an invalid/expired offer to a Subscription.

```javascript
{
  "plan_id": "plan_midi",
  "total_count": 12,
  "offer_id": "offer_expired123"  // ❌ Invalid/expired offer
}
```

**Error Response**:
```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "Offer Not Found"
  }
}
```

**Solution**:
```typescript
// ✅ Verify offer is valid and not expired
// Dashboard → Subscriptions → Offers → Check status

// ✅ Check offer expiry date
// Offer must be active and within valid date range

// ✅ Remove offer_id if not needed
{
  "plan_id": "plan_midi",
  "total_count": 12
  // No offer_id
}

// ✅ Create new offer if expired
// Dashboard → Subscriptions → Offers → Create Offer
```

---

### Error 4: Offer Not Applicable (400)

**Error Message**: `"Offer not applicable for this Subscription"`

**When It Happens**:
This error occurs when you are linking/passing an `offer_id` to a Subscription on which the offer doesn't apply.

```javascript
// Offer requires minimum ₹5,000
// Plan amount: ₹999 (MINI Plan)

{
  "plan_id": "plan_mini",      // ₹999 < ₹5,000 minimum
  "total_count": 12,
  "offer_id": "offer_PREMIUM"
}
```

**Error Response**:
```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "Offer not applicable for this Subscription"
  }
}
```

**Solution**:
```typescript
// ✅ Check offer requirements
// Dashboard → Subscriptions → Offers → View offer details

// Example: Offer requires minimum ₹5,000
// Plan must be MIDI (₹4,999) or MAXI (₹9,999)

{
  "plan_id": "plan_midi",      // ₹4,999 meets minimum ✅
  "total_count": 12,
  "offer_id": "offer_PREMIUM"
}

// ✅ Verify offer conditions:
// - Minimum plan amount
// - Specific plan IDs (if offer is plan-specific)
// - Customer eligibility
// - Usage limits not exceeded
```

---

## Code Examples

### Node.js (Official Razorpay SDK Example)

```javascript
var instance = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })

instance.subscriptions.create({
  plan_id: "plan_7wAosPWtrkhqZw",
  customer_notify: true,
  quantity: 5,
  total_count: 6,
  start_at: 1495995837,
  addons: [
    {
      item: {
        name: "Delivery charges",
        amount: 30000,
        currency: "INR"
      }
    }
  ],
  notes: {
    key1: "value3",
    key2: "value2"
  }
})
.then(subscription => {
  console.log('Subscription created:', subscription.id);
  console.log('Authorization URL:', subscription.short_url);
  // Store in database
})
.catch(error => {
  console.error('Error:', error);
});
```

### Modern Node.js with Async/Await

```javascript
const Razorpay = require('razorpay');

const instance = new Razorpay({
  key_id: 'YOUR_KEY_ID',
  key_secret: 'YOUR_SECRET'
});

async function createSubscription() {
  try {
    const subscription = await instance.subscriptions.create({
      plan_id: "plan_7wAosPWtrkhqZw",
      customer_notify: true,
      quantity: 5,
      total_count: 6,
      start_at: 1495995837,
      addons: [
        {
          item: {
            name: "Delivery charges",
            amount: 30000,
            currency: "INR"
          }
        }
      ],
      notes: {
        key1: "value3",
        key2: "value2"
      }
    });
    
    console.log('Subscription created:', subscription.id);
    console.log('Authorization URL:', subscription.short_url);
    return subscription;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

---

### cURL

```bash
curl -X POST https://api.razorpay.com/v1/subscriptions \
  -u YOUR_KEY_ID:YOUR_SECRET \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "plan_midi",
    "total_count": 12,
    "quantity": 1,
    "customer_notify": true,
    "notes": {
      "tier": "midi"
    }
  }'
```

---

### TypeScript (Next.js API Route)

```typescript
// src/app/api/subscriptions/create/route.ts

import Razorpay from 'razorpay';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, planId, totalCount, quantity = 1 } = body;
    
    // Get plan details
    const plan = await prisma.plan.findUnique({
      where: { razorpay_plan_id: planId }
    });
    
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }
    
    // Create subscription in Razorpay
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: totalCount,
      quantity,
      customer_notify: false,  // We'll send custom emails
      notes: {
        user_id: userId,
        tier: plan.tier,
        created_from: 'web_app'
      }
    });
    
    // Store in database
    const dbSubscription = await prisma.subscription.create({
      data: {
        userId,
        razorpay_subscription_id: subscription.id,
        razorpay_plan_id: planId,
        status: subscription.status,
        short_url: subscription.short_url,
        total_count: subscription.total_count,
        paid_count: subscription.paid_count,
        remaining_count: subscription.remaining_count,
        quantity: subscription.quantity,
        start_at: new Date(subscription.start_at * 1000),
        expire_by: new Date(subscription.expire_by * 1000),
        metadata: subscription.notes
      }
    });
    
    return NextResponse.json({
      success: true,
      subscription: {
        id: dbSubscription.id,
        razorpay_id: subscription.id,
        authorization_url: subscription.short_url
      }
    });
    
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    
    return NextResponse.json(
      { 
        error: error.error?.description || 'Failed to create subscription',
        code: error.error?.code 
      },
      { status: error.statusCode || 500 }
    );
  }
}
```

---

## Implementation Guide

### Step 1: Create Subscription Flow

```typescript
// lib/subscription-service.ts

import Razorpay from 'razorpay';
import { PrismaClient } from '@prisma/client';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

const prisma = new PrismaClient();

interface CreateSubscriptionParams {
  userId: string;
  planId: string;
  totalCount: number;
  quantity?: number;
  startAt?: Date;
  offerId?: string;
}

export async function createSubscription(params: CreateSubscriptionParams) {
  const {
    userId,
    planId,
    totalCount,
    quantity = 1,
    startAt,
    offerId
  } = params;
  
  // Get plan details
  const plan = await prisma.plan.findUnique({
    where: { razorpay_plan_id: planId }
  });
  
  if (!plan) {
    throw new Error('Plan not found');
  }
  
  // Prepare request
  const request: any = {
    plan_id: planId,
    total_count: totalCount,
    quantity,
    customer_notify: false,
    notes: {
      user_id: userId,
      tier: plan.tier,
      max_stores: plan.max_stores.toString()
    }
  };
  
  // Add optional parameters
  if (startAt) {
    request.start_at = Math.floor(startAt.getTime() / 1000);
  }
  
  if (offerId) {
    request.offer_id = offerId;
  }
  
  // Create in Razorpay
  const subscription = await razorpay.subscriptions.create(request);
  
  // Store in database
  const dbSubscription = await prisma.subscription.create({
    data: {
      userId,
      razorpay_subscription_id: subscription.id,
      razorpay_plan_id: planId,
      status: subscription.status,
      short_url: subscription.short_url,
      total_count: subscription.total_count,
      paid_count: 0,
      remaining_count: subscription.total_count,
      quantity,
      start_at: new Date(subscription.start_at * 1000),
      expire_by: new Date(subscription.expire_by * 1000),
      metadata: subscription.notes
    }
  });
  
  return {
    subscription: dbSubscription,
    authorization_url: subscription.short_url
  };
}
```

---

### Step 2: Frontend Subscription Flow

```typescript
// src/app/pricing/page.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const handleSubscribe = async (planId: string, tier: string) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'current_user_id',  // From auth context
          planId,
          totalCount: 12,  // 1 year
          quantity: 1
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Redirect to authorization URL
        window.location.href = data.subscription.authorization_url;
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="grid grid-cols-3 gap-8">
      {/* MINI Plan */}
      <div className="border rounded-lg p-6">
        <h2 className="text-2xl font-bold">MINI</h2>
        <p className="text-4xl font-bold">₹999<span className="text-sm">/mo</span></p>
        <Button 
          onClick={() => handleSubscribe('plan_mini', 'mini')}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Subscribe'}
        </Button>
      </div>
      
      {/* MIDI Plan */}
      <div className="border rounded-lg p-6">
        <h2 className="text-2xl font-bold">MIDI</h2>
        <p className="text-4xl font-bold">₹4,999<span className="text-sm">/mo</span></p>
        <Button 
          onClick={() => handleSubscribe('plan_midi', 'midi')}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Subscribe'}
        </Button>
      </div>
      
      {/* MAXI Plan */}
      <div className="border rounded-lg p-6">
        <h2 className="text-2xl font-bold">MAXI</h2>
        <p className="text-4xl font-bold">₹9,999<span className="text-sm">/mo</span></p>
        <Button 
          onClick={() => handleSubscribe('plan_maxi', 'maxi')}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Subscribe'}
        </Button>
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. Always Store Subscription ID

```typescript
// ✅ Good: Store immediately after creation
const subscription = await razorpay.subscriptions.create(data);

await prisma.subscription.create({
  data: {
    razorpay_subscription_id: subscription.id,  // Critical!
    // ... other fields
  }
});
```

---

### 2. Validate Plan Before Creating

```typescript
// ✅ Good: Check plan exists and is active
async function createSubscriptionSafe(planId: string) {
  const plan = await razorpay.plans.fetch(planId);
  
  if (!plan.item.active) {
    throw new Error('Plan is not active');
  }
  
  // Proceed with subscription creation
}
```

---

### 3. Handle Errors Gracefully

```typescript
try {
  const subscription = await razorpay.subscriptions.create(data);
} catch (error: any) {
  if (error.error?.description?.includes('not enabled')) {
    // Subscriptions feature not enabled
    return 'Please enable subscriptions in Dashboard';
  } else if (error.error?.description?.includes('does not exist')) {
    // Invalid plan ID
    return 'Plan not found';
  } else {
    // Other error
    return 'Failed to create subscription';
  }
}
```

---

### 4. Send Custom Authorization Email

```typescript
// When customer_notify = false

const subscription = await razorpay.subscriptions.create({
  plan_id: planId,
  total_count: 12,
  customer_notify: false  // We handle emails
});

// Send custom email
await sendEmail({
  to: customer.email,
  subject: `Complete Your ${plan.name} Subscription`,
  html: `
    <h1>Thanks for choosing ${plan.name}!</h1>
    <p>Complete your subscription by clicking the link below:</p>
    <a href="${subscription.short_url}">Authorize Payment</a>
  `
});
```

---

## Related Documentation

- Part 18: [Subscriptions Entity](./18_RAZORPAY_SUBSCRIPTIONS_ENTITY.md)
- Part 20: [Create Subscription Link](./20_RAZORPAY_CREATE_SUBSCRIPTION_LINK.md) (Next)
- Part 21: [Fetch Subscriptions](./21_RAZORPAY_FETCH_SUBSCRIPTIONS.md)
