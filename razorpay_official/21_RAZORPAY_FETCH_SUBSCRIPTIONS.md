# Razorpay Fetch Subscriptions API

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 21 of Razorpay Official Documentation Series

---

## Table of Contents
1. [API Overview](#api-overview)
2. [Fetch All Subscriptions](#fetch-all-subscriptions)
3. [Fetch Subscription by ID](#fetch-subscription-by-id)
4. [Response Structure](#response-structure)
5. [Pagination](#pagination)
6. [Filtering](#filtering)
7. [Error Handling](#error-handling)
8. [Code Examples](#code-examples)
9. [Implementation Guide](#implementation-guide)

---

## API Overview

Razorpay provides **two endpoints** to fetch subscriptions:

1. **Fetch All Subscriptions**: `GET /v1/subscriptions`
2. **Fetch Subscription by ID**: `GET /v1/subscriptions/:id`

### Availability

Available in:
- 🇮🇳 **IN** - India
- 🇲🇾 **MY** - Malaysia
- 🇸🇬 **SG** - Singapore
- 🇺🇸 **US** - United States

### Authentication

```
Basic Auth using API Key and Secret
```

---

## Fetch All Subscriptions

**Endpoint**: `GET /v1/subscriptions`

Retrieve a **paginated list** of all subscriptions.

### Query Parameters

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `plan_id` | string | ❌ Optional | The unique identifier of the plan for which you want to retrieve all the Subscriptions. | All plans |
| `from` | integer | ❌ Optional | The Unix timestamp from when Subscriptions are to be fetched. | N/A |
| `to` | integer | ❌ Optional | The Unix timestamp till when Subscriptions are to be fetched. | N/A |
| `count` | integer | ❌ Optional | The number of Subscriptions to be fetched. Default value is `10`. Maximum value is 100. This can be used for pagination, in combination with `skip`. | 10 |
| `skip` | integer | ❌ Optional | The number of Subscriptions to be skipped. Default value is `0`. This can be used for pagination, in combination with `count`. | 0 |

---

## Understanding Query Parameters

### 1. `plan_id` - Filter by Plan

**Example 1: Get All MIDI Plan Subscriptions**
```javascript
const subscriptions = await razorpay.subscriptions.all({
  plan_id: "plan_midi"
});

// Returns only subscriptions for MIDI plan
```

**Example 2: Compare Plan Performance**
```javascript
const miniSubs = await razorpay.subscriptions.all({
  plan_id: "plan_mini"
});

const midiSubs = await razorpay.subscriptions.all({
  plan_id: "plan_midi"
});

console.log(`MINI: ${miniSubs.count} subscriptions`);
console.log(`MIDI: ${midiSubs.count} subscriptions`);
```

---

### 2. `from` and `to` - Time Range Filter

**Example 1: Subscriptions Created in January 2024**
```javascript
const fromTimestamp = Math.floor(new Date('2024-01-01').getTime() / 1000);
const toTimestamp = Math.floor(new Date('2024-01-31').getTime() / 1000);

const subscriptions = await razorpay.subscriptions.all({
  from: fromTimestamp,
  to: toTimestamp
});
```

**Example 2: Last 30 Days**
```javascript
const thirtyDaysAgo = Math.floor((Date.now() - (30 * 24 * 60 * 60 * 1000)) / 1000);
const now = Math.floor(Date.now() / 1000);

const recentSubs = await razorpay.subscriptions.all({
  from: thirtyDaysAgo,
  to: now
});
```

**Example 3: This Month**
```javascript
const startOfMonth = new Date();
startOfMonth.setDate(1);
startOfMonth.setHours(0, 0, 0, 0);

const endOfMonth = new Date();
endOfMonth.setMonth(endOfMonth.getMonth() + 1);
endOfMonth.setDate(0);
endOfMonth.setHours(23, 59, 59, 999);

const thisMonthSubs = await razorpay.subscriptions.all({
  from: Math.floor(startOfMonth.getTime() / 1000),
  to: Math.floor(endOfMonth.getTime() / 1000)
});
```

---

### 3. `count` - Page Size

**Example 1: Get 50 Subscriptions**
```javascript
const subscriptions = await razorpay.subscriptions.all({
  count: 50
});
```

**Limits**:
- Default: 10
- Maximum: 100
- Minimum: 1

---

### 4. `skip` - Pagination Offset

**Example: Implement Pagination**
```javascript
const page = 2;       // Page number (1-indexed)
const pageSize = 10;  // Items per page

const skip = (page - 1) * pageSize;

const subscriptions = await razorpay.subscriptions.all({
  count: pageSize,
  skip: skip
});
```

**Formula**:
```
skip = (page - 1) × count
```

---

## Fetch Subscription by ID

**Endpoint**: `GET /v1/subscriptions/:id`

Retrieve details of a **specific subscription**.

### Path Parameter

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string | ✅ Yes | Subscription ID | `sub_00000000000001` |

**Example**:
```javascript
const subscription = await razorpay.subscriptions.fetch('sub_00000000000001');
```

---

## Response Structure

### Collection Response (Fetch All)

```json
{
  "entity": "collection",
  "count": 2,
  "items": [
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
      "offer_id": "offer_JHD834hjbxzhd38d",
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
      "remaining_count": 5
    },
    {
      "id": "sub_00000000000002",
      "entity": "subscription",
      "plan_id": "plan_00000000000001",
      "customer_id": "cust_D00000000000001",
      "status": "active",
      "current_start": 1577355871,
      "current_end": 1577355871,
      "ended_at": null,
      "quantity": 1,
      "notes": {
        "notes_key_1": "Tea, Earl Grey, Hot",
        "notes_key_2": "Tea, Earl Grey… decaf."
      },
      "charge_at": 1561852800,
      "start_at": 1561852800,
      "end_at": 1590777000,
      "auth_attempts": 0,
      "total_count": 12,
      "paid_count": 1,
      "customer_notify": true,
      "created_at": 1560241235,
      "expire_by": 1561939199,
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

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `entity` | string | Always `"collection"` for list responses |
| `count` | integer | Number of subscriptions in response |
| `items` | array | Array of subscription objects |

**Note**: Subscriptions are returned in **reverse chronological order** (newest first).

---

### Subscription Object Parameters (in items array)

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The unique identifier linked to a Subscription. |
| `entity` | string | The entity being created. Here, it is `subscription`. |
| `plan_id` | string | The unique identifier of a plan that should be linked to the Subscription. For example, `plan_00000000000001`. |
| `customer_id` | string | The unique identifier of the customer who is subscribing to a plan. This is populated automatically after the customer completes the authorisation transaction. |
| `status` | string | Status of the Subscription. Possible values: `created`, `authenticated`, `active`, `pending`, `halted`, `cancelled`, `completed`, `expired`. |
| `current_start` | integer | Indicates the start time of the current billing cycle of a Subscription. |
| `current_end` | integer | Indicates the end time of the current billing cycle of a Subscription. |
| `ended_at` | integer | The Unix timestamp of when the Subscription has completed its period or has been cancelled midway. |
| `quantity` | integer | The number of times the customer should be charged the plan amount per invoice. For example, a customer subscribes to use software. The charges are ₹100.00/month/license. The customer wants 5 licenses. You should pass 5 as the quantity. The customer is charged ₹500.00 (5 x ₹100.00) monthly. By default, this value is set to `1`. |
| `notes` | object | Object consisting of key value pairs as notes. |
| `charge_at` | integer | The Unix timestamp of when the next charge on the Subscription should be made. |
| `offer_id` | string | The unique identifier of the offer that is linked to the Subscription. You can obtain this from the Dashboard. For example, `offer_JHD834hjbxzhd38d`. |
| `start_at` | integer | The Unix timestamp, indicates from when the Subscription should start. If not passed, the Subscription starts immediately after the authorisation payment. For example, `1581013800`. For Subscriptions with a future start_date, frequency is considered `as_presented`. |
| `end_at` | integer | The Unix timestamp when the Subscription should end. For example, `1581013800`. |
| `auth_attempts` | integer | The number of times the charge for the current billing cycle has been attempted on the card. |
| `total_count` | integer | The number of billing cycles for which the customer should be charged. For example, if a customer is buying a 1-year subscription billed on a bi-monthly basis, this value should be `6`. |
| `paid_count` | integer | Indicates the number of billing cycles the customer has already been charged. |
| `customer_notify` | boolean | Indicates whether the communication to the customer would be handled by businesses or Razorpay. Possible values: `true` (default): Communication handled by Razorpay. `false`: Communication handled by businesses. |
| `created_at` | integer | The Unix timestamp when the Subscription was created. For example, `1581013800`. |
| `expire_by` | integer | The Unix timestamp that indicates till when the customer can make the authorisation payment. For example, `1581013800`. The default value is 30 years. Do not pass any value if you do not want to set an expiry date. |
| `short_url` | string | URL that can be used to make the authorisation payment. For example, `https://rzp.io/i/PWtAiEo`. |
| `has_scheduled_changes` | boolean | Indicates if the Subscription has any scheduled changes. Possible values: `true`: Subscription has scheduled changes. `false`: Subscription does not have scheduled changes. |
| `schedule_change_at` | string | Represents when the Subscription should be updated. Possible values: `now` (default): Updates the Subscription immediately. `cycle_end`: Updates the Subscription at the end of the current billing cycle. |
| `remaining_count` | integer | Indicates the number of billing cycles remaining on the Subscription. For example, `2`. |

---

### Single Subscription Response (Fetch by ID)

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
  "source": "api",
  "offer_id": "offer_JHD834hjbxzhd38d",
  "remaining_count": 5
}
```

---

## Pagination

### Scenario: Fetch All Subscriptions (100+)

**Problem**: You have 250 subscriptions, but API returns max 100 per request.

**Solution**: Use `skip` and `count` to fetch in batches.

```typescript
async function fetchAllSubscriptions() {
  const allSubscriptions: any[] = [];
  let skip = 0;
  const count = 100; // Max per request
  let hasMore = true;
  
  while (hasMore) {
    const response = await razorpay.subscriptions.all({
      count,
      skip
    });
    
    allSubscriptions.push(...response.items);
    
    // If we got less than 'count', we've reached the end
    if (response.count < count) {
      hasMore = false;
    } else {
      skip += count;
    }
  }
  
  console.log(`Fetched ${allSubscriptions.length} subscriptions total`);
  return allSubscriptions;
}
```

---

### Scenario: Paginated Admin Dashboard

```typescript
// Frontend component

'use client';

import { useState, useEffect } from 'react';

export default function SubscriptionsListPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;
  
  useEffect(() => {
    fetchSubscriptions();
  }, [currentPage]);
  
  const fetchSubscriptions = async () => {
    setLoading(true);
    
    const skip = (currentPage - 1) * pageSize;
    
    const response = await fetch(
      `/api/subscriptions?count=${pageSize}&skip=${skip}`
    );
    
    const data = await response.json();
    setSubscriptions(data.items);
    setLoading(false);
  };
  
  return (
    <div>
      <h1>Subscriptions</h1>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Customer</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map(sub => (
              <tr key={sub.id}>
                <td>{sub.id}</td>
                <td>{sub.plan_id}</td>
                <td>{sub.status}</td>
                <td>{sub.customer_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      <div>
        <button 
          onClick={() => setCurrentPage(p => p - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        
        <span>Page {currentPage}</span>
        
        <button 
          onClick={() => setCurrentPage(p => p + 1)}
          disabled={subscriptions.length < pageSize}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## Filtering

### Filter by Plan and Date Range

```typescript
// Get MIDI plan subscriptions from last 30 days

const thirtyDaysAgo = Math.floor((Date.now() - (30 * 24 * 60 * 60 * 1000)) / 1000);
const now = Math.floor(Date.now() / 1000);

const subscriptions = await razorpay.subscriptions.all({
  plan_id: "plan_midi",
  from: thirtyDaysAgo,
  to: now,
  count: 100
});
```

---

### Filter by Status (Client-Side)

```typescript
// API doesn't support status filter, so filter client-side

const allSubs = await razorpay.subscriptions.all({ count: 100 });

const activeSubs = allSubs.items.filter(sub => sub.status === 'active');
const pendingSubs = allSubs.items.filter(sub => sub.status === 'pending');
const haltedSubs = allSubs.items.filter(sub => sub.status === 'halted');

console.log(`Active: ${activeSubs.length}`);
console.log(`Pending: ${pendingSubs.length}`);
console.log(`Halted: ${haltedSubs.length}`);
```

---

## Error Handling

### Error 1: Invalid API Keys

**HTTP Status**: `4xx`

**Error Message**: "The API key/secret provided is invalid."

**Why This Happens**:
This error occurs due to a mismatch between the API credentials passed in the API call and those generated on the Dashboard.

**When It Happens**:
```javascript
// Using wrong or expired keys
```

**Error Response**:
```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "The api key provided is invalid",
    "source": "NA",
    "step": "NA",
    "reason": "NA",
    "metadata": {}
  }
}
```

**Solution**:
```typescript
// ✅ Verify keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,      // Check: No typos
  key_secret: process.env.RAZORPAY_KEY_SECRET! // Check: Correct secret
});

// Test with simple request
try {
  const subs = await razorpay.subscriptions.all({ count: 1 });
  console.log('✅ API keys valid');
} catch (error) {
  console.error('❌ Invalid API keys');
}
```

---

### Error 2: Invalid Subscription ID

**HTTP Status**: `400`

**Error Message**: "ub_id%7D is not a valid id"

**Why This Happens**:
This error occurs when you are not passing the right `subscription_id` in the API endpoint to fetch a plan based on the id.

**When It Happens**:
```javascript
// Subscription ID doesn't exist or is malformed
const sub = await razorpay.subscriptions.fetch('sub_invalid123');
```

**Error Response**:
```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "ub_id%7D is not a valid id"
  }
}
```

**Solution**:
```typescript
// ✅ Validate subscription ID format
function isValidSubscriptionId(subId: string): boolean {
  return /^sub_[a-zA-Z0-9]{14}$/.test(subId);
}

// ✅ Handle not found
async function fetchSubscriptionSafely(subId: string) {
  if (!isValidSubscriptionId(subId)) {
    throw new Error('Invalid subscription ID format');
  }
  
  try {
    const sub = await razorpay.subscriptions.fetch(subId);
    return sub;
  } catch (error: any) {
    if (error.error?.description?.includes('not a valid id')) {
      console.error('Subscription not found');
      return null;
    }
    throw error;
  }
}
```

---

## Code Examples

### Node.js (Fetch All)

```javascript
const Razorpay = require('razorpay');

const instance = new Razorpay({
  key_id: 'YOUR_KEY_ID',
  key_secret: 'YOUR_SECRET'
});

// Fetch all subscriptions
instance.subscriptions.all({
  count: 10,
  skip: 0
})
.then(response => {
  console.log(`Found ${response.count} subscriptions`);
  response.items.forEach(sub => {
    console.log(`${sub.id}: ${sub.status} (${sub.plan_id})`);
  });
})
.catch(error => {
  console.error('Error:', error);
});
```

---

### Node.js (Fetch by ID)

```javascript
const subscriptionId = 'sub_00000000000001';

instance.subscriptions.fetch(subscriptionId)
  .then(subscription => {
    console.log('Subscription details:');
    console.log(`ID: ${subscription.id}`);
    console.log(`Status: ${subscription.status}`);
    console.log(`Plan: ${subscription.plan_id}`);
    console.log(`Customer: ${subscription.customer_id}`);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

---

### cURL (Fetch All)

```bash
curl -X GET 'https://api.razorpay.com/v1/subscriptions?count=10&skip=0' \
  -u YOUR_KEY_ID:YOUR_SECRET
```

---

### cURL (Fetch by ID)

```bash
curl -X GET https://api.razorpay.com/v1/subscriptions/sub_00000000000001 \
  -u YOUR_KEY_ID:YOUR_SECRET
```

---

### TypeScript (Next.js API Route - Fetch All)

```typescript
// src/app/api/subscriptions/route.ts

import Razorpay from 'razorpay';
import { NextRequest, NextResponse } from 'next/server';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    
    // Get query parameters
    const count = parseInt(searchParams.get('count') || '10');
    const skip = parseInt(searchParams.get('skip') || '0');
    const planId = searchParams.get('plan_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    // Build options
    const options: any = { count, skip };
    if (planId) options.plan_id = planId;
    if (from) options.from = parseInt(from);
    if (to) options.to = parseInt(to);
    
    // Fetch from Razorpay
    const response = await razorpay.subscriptions.all(options);
    
    // Transform response
    const subscriptions = response.items.map((sub: any) => ({
      id: sub.id,
      plan_id: sub.plan_id,
      customer_id: sub.customer_id,
      status: sub.status,
      total_count: sub.total_count,
      paid_count: sub.paid_count,
      remaining_count: sub.remaining_count,
      charge_at: sub.charge_at,
      created_at: sub.created_at
    }));
    
    return NextResponse.json({
      success: true,
      count: response.count,
      subscriptions
    });
    
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    
    return NextResponse.json(
      { 
        error: error.error?.description || 'Failed to fetch subscriptions',
        code: error.error?.code 
      },
      { status: error.statusCode || 500 }
    );
  }
}
```

---

### TypeScript (Next.js API Route - Fetch by ID)

```typescript
// src/app/api/subscriptions/[id]/route.ts

import Razorpay from 'razorpay';
import { NextRequest, NextResponse } from 'next/server';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subscriptionId = params.id;
    
    // Validate subscription ID
    if (!subscriptionId.startsWith('sub_')) {
      return NextResponse.json(
        { error: 'Invalid subscription ID format' },
        { status: 400 }
      );
    }
    
    // Fetch from Razorpay
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    
    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan_id: subscription.plan_id,
        customer_id: subscription.customer_id,
        status: subscription.status,
        total_count: subscription.total_count,
        paid_count: subscription.paid_count,
        remaining_count: subscription.remaining_count,
        current_start: subscription.current_start,
        current_end: subscription.current_end,
        charge_at: subscription.charge_at,
        notes: subscription.notes,
        created_at: subscription.created_at
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    
    if (error.error?.description?.includes('not a valid id')) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error.error?.description || 'Failed to fetch subscription',
        code: error.error?.code 
      },
      { status: error.statusCode || 500 }
    );
  }
}
```

---

## Implementation Guide

### Step 1: Sync Subscriptions to Database

```typescript
// scripts/sync-subscriptions.ts

import Razorpay from 'razorpay';
import { PrismaClient } from '@prisma/client';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

const prisma = new PrismaClient();

async function syncSubscriptions() {
  try {
    console.log('🔄 Fetching subscriptions from Razorpay...');
    
    // Fetch all subscriptions
    const allSubs: any[] = [];
    let skip = 0;
    const count = 100;
    let hasMore = true;
    
    while (hasMore) {
      const response = await razorpay.subscriptions.all({ count, skip });
      allSubs.push(...response.items);
      
      if (response.count < count) {
        hasMore = false;
      } else {
        skip += count;
      }
    }
    
    console.log(`✅ Fetched ${allSubs.length} subscriptions from Razorpay`);
    
    // Sync to database
    for (const sub of allSubs) {
      await prisma.subscription.upsert({
        where: {
          razorpay_subscription_id: sub.id
        },
        update: {
          status: sub.status,
          paid_count: sub.paid_count,
          remaining_count: sub.remaining_count,
          current_start: sub.current_start ? new Date(sub.current_start * 1000) : null,
          current_end: sub.current_end ? new Date(sub.current_end * 1000) : null,
          charge_at: sub.charge_at ? new Date(sub.charge_at * 1000) : null
        },
        create: {
          razorpay_subscription_id: sub.id,
          razorpay_plan_id: sub.plan_id,
          razorpay_customer_id: sub.customer_id,
          status: sub.status,
          total_count: sub.total_count,
          paid_count: sub.paid_count,
          remaining_count: sub.remaining_count,
          quantity: sub.quantity,
          start_at: new Date(sub.start_at * 1000),
          charge_at: sub.charge_at ? new Date(sub.charge_at * 1000) : null,
          metadata: sub.notes
        }
      });
      
      console.log(`✅ Synced: ${sub.id}`);
    }
    
    console.log('✅ All subscriptions synced');
    
  } catch (error) {
    console.error('❌ Error syncing subscriptions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncSubscriptions();
```

**Run the script**:
```bash
npx tsx scripts/sync-subscriptions.ts
```

---

### Step 2: Admin Dashboard

```typescript
// src/app/(dashboard)/admin/subscriptions/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    fetchSubscriptions();
  }, []);
  
  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions?count=100');
      const data = await response.json();
      
      if (data.success) {
        setSubscriptions(data.subscriptions);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const filteredSubs = subscriptions.filter(sub => {
    if (filter === 'all') return true;
    return sub.status === filter;
  });
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        
        <div className="space-x-2">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All ({subscriptions.length})
          </Button>
          <Button 
            variant={filter === 'active' ? 'default' : 'outline'}
            onClick={() => setFilter('active')}
          >
            Active
          </Button>
          <Button 
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            Pending
          </Button>
          <Button 
            variant={filter === 'halted' ? 'default' : 'outline'}
            onClick={() => setFilter('halted')}
          >
            Halted
          </Button>
        </div>
      </div>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="border rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Subscription ID</th>
                <th className="px-4 py-2 text-left">Plan</th>
                <th className="px-4 py-2 text-left">Customer</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Progress</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.map(sub => (
                <tr key={sub.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-sm">{sub.id}</td>
                  <td className="px-4 py-2">{sub.plan_id}</td>
                  <td className="px-4 py-2">{sub.customer_id || 'N/A'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      sub.status === 'active' ? 'bg-green-100 text-green-800' :
                      sub.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      sub.status === 'halted' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {sub.paid_count}/{sub.total_count}
                  </td>
                  <td className="px-4 py-2">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. Cache Subscriptions

```typescript
// lib/subscriptions-cache.ts

import { unstable_cache } from 'next/cache';
import { razorpay } from './razorpay';

export const getCachedSubscriptions = unstable_cache(
  async () => {
    const response = await razorpay.subscriptions.all({ count: 100 });
    return response.items;
  },
  ['razorpay-subscriptions'],
  {
    revalidate: 300, // 5 minutes
    tags: ['subscriptions']
  }
);
```

---

### 2. Handle Pagination Efficiently

```typescript
// ❌ Don't fetch one by one
for (let i = 0; i < 100; i++) {
  const subs = await razorpay.subscriptions.all({ count: 1, skip: i });
  // Process...
}

// ✅ Fetch in batches
const batchSize = 100;
let skip = 0;
let hasMore = true;

while (hasMore) {
  const response = await razorpay.subscriptions.all({ count: batchSize, skip });
  // Process response.items...
  
  if (response.count < batchSize) hasMore = false;
  else skip += batchSize;
}
```

---

### 3. Error Recovery

```typescript
async function fetchSubscriptionWithRetry(subId: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await razorpay.subscriptions.fetch(subId);
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## Related Documentation

- Part 18: [Subscriptions Entity](./18_RAZORPAY_SUBSCRIPTIONS_ENTITY.md)
- Part 19: [Create Subscription](./19_RAZORPAY_CREATE_SUBSCRIPTION.md)
- Part 20: [Create Subscription Link](./20_RAZORPAY_CREATE_SUBSCRIPTION_LINK.md)
