# Razorpay Fetch Plans API

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 17 of Razorpay Official Documentation Series

---

## Table of Contents
1. [API Overview](#api-overview)
2. [Fetch All Plans](#fetch-all-plans)
3. [Fetch Plan by ID](#fetch-plan-by-id)
4. [Response Structure](#response-structure)
5. [Pagination](#pagination)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)
8. [Implementation Guide](#implementation-guide)

---

## API Overview

Razorpay provides **two endpoints** to fetch plans:

1. **Fetch All Plans**: `GET /v1/plans`
2. **Fetch Plan by ID**: `GET /v1/plans/:id`

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

## Fetch All Plans

**Endpoint**: `GET /v1/plans`

Retrieve a **paginated list** of all plans in your Razorpay account.

### Query Parameters

| Parameter | Type | Required | Description | Default | Example |
|-----------|------|----------|-------------|---------|---------|
| `from` | integer | ❌ Optional | Start timestamp (Unix) | N/A | `1622109400` |
| `to` | integer | ❌ Optional | End timestamp (Unix) | N/A | `1622713000` |
| `count` | integer | ❌ Optional | Number of plans per page | 10 | `25` |
| `skip` | integer | ❌ Optional | Number of plans to skip | 0 | `10` |

---

### Understanding Query Parameters

#### 1. `from` and `to` (Time Range)

Filter plans created within a date range.

**Example 1: Plans created in January 2024**
```javascript
const fromTimestamp = new Date('2024-01-01').getTime() / 1000; // 1704067200
const toTimestamp = new Date('2024-01-31').getTime() / 1000;   // 1706659200

const plans = await razorpay.plans.all({
  from: fromTimestamp,
  to: toTimestamp
});
```

**Example 2: Plans created in last 7 days**
```javascript
const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
const now = Math.floor(Date.now() / 1000);

const plans = await razorpay.plans.all({
  from: sevenDaysAgo,
  to: now
});
```

**Example 3: Plans created after specific date**
```javascript
const fromTimestamp = new Date('2024-06-01').getTime() / 1000;

const plans = await razorpay.plans.all({
  from: fromTimestamp
  // No 'to' - gets all plans from June 1, 2024 onwards
});
```

---

#### 2. `count` (Page Size)

Control how many plans are returned per request.

**Example 1: Get 50 plans**
```javascript
const plans = await razorpay.plans.all({
  count: 50
});
```

**Example 2: Get all plans (in batches)**
```javascript
// Default is 10 per page
// If you have 100 plans, need 10 requests

// Better: Use larger count
const plans = await razorpay.plans.all({
  count: 100  // Get all in one request
});
```

**Limits**:
- Default: 10
- Maximum: 100
- Minimum: 1

---

#### 3. `skip` (Pagination Offset)

Skip N plans to implement pagination.

**Example: Page 1**
```javascript
const page1 = await razorpay.plans.all({
  count: 10,
  skip: 0      // First 10 plans
});
```

**Example: Page 2**
```javascript
const page2 = await razorpay.plans.all({
  count: 10,
  skip: 10     // Skip first 10, get next 10
});
```

**Example: Page 3**
```javascript
const page3 = await razorpay.plans.all({
  count: 10,
  skip: 20     // Skip first 20, get next 10
});
```

**Formula**:
```javascript
const page = 2;       // Page number (1-indexed)
const pageSize = 10;  // Plans per page

const skip = (page - 1) * pageSize;

const plans = await razorpay.plans.all({
  count: pageSize,
  skip: skip
});
```

---

### Response Structure (All Plans)

```json
{
  "entity": "collection",
  "count": 3,
  "items": [
    {
      "id": "plan_00000000000003",
      "entity": "plan",
      "interval": 1,
      "period": "monthly",
      "item": {
        "id": "item_00000000000003",
        "active": true,
        "name": "MAXI Plan",
        "description": "For large enterprises",
        "amount": 999900,
        "unit_amount": 999900,
        "currency": "INR",
        "type": "plan",
        "unit": null,
        "tax_inclusive": false,
        "hsn_code": null,
        "sac_code": null,
        "tax_rate": null,
        "tax_id": null,
        "tax_group_id": null,
        "created_at": 1580219935,
        "updated_at": 1580219935
      },
      "notes": {
        "tier": "maxi",
        "max_stores": "50"
      },
      "created_at": 1580219935
    },
    {
      "id": "plan_00000000000002",
      "entity": "plan",
      "interval": 1,
      "period": "monthly",
      "item": {
        "id": "item_00000000000002",
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
        "created_at": 1580219900,
        "updated_at": 1580219900
      },
      "notes": {
        "tier": "midi",
        "max_stores": "10"
      },
      "created_at": 1580219900
    },
    {
      "id": "plan_00000000000001",
      "entity": "plan",
      "interval": 1,
      "period": "monthly",
      "item": {
        "id": "item_00000000000001",
        "active": true,
        "name": "MINI Plan",
        "description": "Perfect for small stores",
        "amount": 99900,
        "unit_amount": 99900,
        "currency": "INR",
        "type": "plan",
        "unit": null,
        "tax_inclusive": false,
        "hsn_code": null,
        "sac_code": null,
        "tax_rate": null,
        "tax_id": null,
        "tax_group_id": null,
        "created_at": 1580219800,
        "updated_at": 1580219800
      },
      "notes": {
        "tier": "mini",
        "max_stores": "3"
      },
      "created_at": 1580219800
    }
  ]
}
```

### Response Fields Explained

| Field | Type | Description |
|-------|------|-------------|
| `entity` | string | Always `"collection"` for list responses |
| `count` | integer | Number of plans in this response |
| `items` | array | Array of plan objects |

**Note**: Plans are returned in **reverse chronological order** (newest first).

---

## Fetch Plan by ID

**Endpoint**: `GET /v1/plans/:id`

Retrieve details of a **specific plan** by its ID.

### Path Parameter

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string | ✅ Yes | Plan ID | `plan_00000000000001` |

---

### Response Structure (Single Plan)

```json
{
  "id": "plan_00000000000002",
  "entity": "plan",
  "interval": 1,
  "period": "monthly",
  "item": {
    "id": "item_00000000000002",
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
    "created_at": 1580219900,
    "updated_at": 1580219900
  },
  "notes": {
    "tier": "midi",
    "max_stores": "10",
    "features": "advanced_analytics,custom_domain"
  },
  "created_at": 1580219900
}
```

---

## Pagination

### Scenario: Fetch All Plans (100+ plans)

**Problem**: You have 150 plans, but API returns max 100 per request.

**Solution**: Use `skip` and `count` to fetch in batches.

```typescript
async function fetchAllPlans() {
  const allPlans: any[] = [];
  let skip = 0;
  const count = 100; // Max per request
  let hasMore = true;
  
  while (hasMore) {
    const response = await razorpay.plans.all({
      count,
      skip
    });
    
    allPlans.push(...response.items);
    
    // If we got less than 'count', we've reached the end
    if (response.count < count) {
      hasMore = false;
    } else {
      skip += count;
    }
  }
  
  console.log(`Fetched ${allPlans.length} plans total`);
  return allPlans;
}
```

---

### Scenario: Paginated UI (10 per page)

```typescript
// Frontend component
'use client';

import { useState, useEffect } from 'react';

export default function PlansListPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;
  
  useEffect(() => {
    fetchPlans();
  }, [currentPage]);
  
  const fetchPlans = async () => {
    setLoading(true);
    
    const skip = (currentPage - 1) * pageSize;
    
    const response = await fetch(
      `/api/plans?count=${pageSize}&skip=${skip}`
    );
    
    const data = await response.json();
    setPlans(data.items);
    setLoading(false);
  };
  
  return (
    <div>
      <h1>Plans</h1>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {plans.map(plan => (
            <li key={plan.id}>
              {plan.item.name} - ₹{plan.item.amount / 100}
            </li>
          ))}
        </ul>
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
          disabled={plans.length < pageSize}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## Error Handling

### Error 1: Invalid API Keys (401)

**When It Happens**:
```javascript
// Using wrong or expired keys
```

**Error Response**:
```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "The api key provided is invalid"
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

// Test with a simple request
try {
  const plans = await razorpay.plans.all({ count: 1 });
  console.log('✅ API keys valid');
} catch (error) {
  console.error('❌ Invalid API keys');
}
```

---

### Error 2: Invalid Plan ID (400)

**When It Happens**:
```javascript
// Plan ID doesn't exist or is malformed
const plan = await razorpay.plans.fetch('plan_invalid123');
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
// ✅ Validate plan ID format
function isValidPlanId(planId: string): boolean {
  return /^plan_[a-zA-Z0-9]{14}$/.test(planId);
}

// ✅ Handle not found
async function fetchPlanSafely(planId: string) {
  if (!isValidPlanId(planId)) {
    throw new Error('Invalid plan ID format');
  }
  
  try {
    const plan = await razorpay.plans.fetch(planId);
    return plan;
  } catch (error: any) {
    if (error.error?.description?.includes('does not exist')) {
      console.error('Plan not found');
      return null;
    }
    throw error;
  }
}
```

---

### Error 3: Invalid Timestamp (400)

**When It Happens**:
```javascript
// Using milliseconds instead of seconds
const plans = await razorpay.plans.all({
  from: Date.now()  // ❌ Milliseconds (1735000000000)
});
```

**Error Response**:
```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "Invalid timestamp"
  }
}
```

**Solution**:
```typescript
// ✅ Convert to seconds
const fromTimestamp = Math.floor(Date.now() / 1000);

const plans = await razorpay.plans.all({
  from: fromTimestamp
});

// ✅ Helper function
function toUnixTimestamp(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return Math.floor(d.getTime() / 1000);
}

// Usage
const plans = await razorpay.plans.all({
  from: toUnixTimestamp('2024-01-01'),
  to: toUnixTimestamp('2024-12-31')
});
```

---

## Code Examples

### Node.js (Fetch All Plans)

```javascript
const Razorpay = require('razorpay');

const instance = new Razorpay({
  key_id: 'YOUR_KEY_ID',
  key_secret: 'YOUR_SECRET'
});

// Fetch all plans
instance.plans.all()
  .then(response => {
    console.log(`Found ${response.count} plans`);
    response.items.forEach(plan => {
      console.log(`${plan.item.name}: ₹${plan.item.amount / 100}`);
    });
  })
  .catch(error => {
    console.error('Error fetching plans:', error);
  });
```

---

### Node.js (Fetch Plan by ID)

```javascript
const planId = 'plan_00000000000001';

instance.plans.fetch(planId)
  .then(plan => {
    console.log('Plan details:');
    console.log(`Name: ${plan.item.name}`);
    console.log(`Amount: ₹${plan.item.amount / 100}`);
    console.log(`Frequency: ${plan.interval} ${plan.period}`);
  })
  .catch(error => {
    console.error('Error fetching plan:', error);
  });
```

---

### cURL (Fetch All Plans)

```bash
curl -X GET https://api.razorpay.com/v1/plans?count=10&skip=0 \
  -u YOUR_KEY_ID:YOUR_SECRET
```

---

### cURL (Fetch Plan by ID)

```bash
curl -X GET https://api.razorpay.com/v1/plans/plan_00000000000001 \
  -u YOUR_KEY_ID:YOUR_SECRET
```

---

### TypeScript (Next.js API Route - Fetch All)

```typescript
// src/app/api/plans/route.ts

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
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    // Build options
    const options: any = { count, skip };
    if (from) options.from = parseInt(from);
    if (to) options.to = parseInt(to);
    
    // Fetch from Razorpay
    const response = await razorpay.plans.all(options);
    
    // Transform response
    const plans = response.items.map((plan: any) => ({
      id: plan.id,
      name: plan.item.name,
      amount: plan.item.amount,
      currency: plan.item.currency,
      interval: plan.interval,
      period: plan.period,
      description: plan.item.description,
      notes: plan.notes,
      created_at: plan.created_at
    }));
    
    return NextResponse.json({
      success: true,
      count: response.count,
      plans
    });
    
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    
    return NextResponse.json(
      { 
        error: error.error?.description || 'Failed to fetch plans',
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
// src/app/api/plans/[id]/route.ts

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
    const planId = params.id;
    
    // Validate plan ID
    if (!planId.startsWith('plan_')) {
      return NextResponse.json(
        { error: 'Invalid plan ID format' },
        { status: 400 }
      );
    }
    
    // Fetch from Razorpay
    const plan = await razorpay.plans.fetch(planId);
    
    return NextResponse.json({
      success: true,
      plan: {
        id: plan.id,
        name: plan.item.name,
        amount: plan.item.amount,
        currency: plan.item.currency,
        interval: plan.interval,
        period: plan.period,
        description: plan.item.description,
        notes: plan.notes,
        created_at: plan.created_at
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching plan:', error);
    
    if (error.error?.description?.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error.error?.description || 'Failed to fetch plan',
        code: error.error?.code 
      },
      { status: error.statusCode || 500 }
    );
  }
}
```

---

## Implementation Guide

### Step 1: Sync Plans from Razorpay to Database

```typescript
// scripts/sync-plans.ts

import Razorpay from 'razorpay';
import { PrismaClient } from '@prisma/client';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

const prisma = new PrismaClient();

async function syncPlans() {
  try {
    console.log('🔄 Fetching plans from Razorpay...');
    
    // Fetch all plans
    const allPlans: any[] = [];
    let skip = 0;
    const count = 100;
    let hasMore = true;
    
    while (hasMore) {
      const response = await razorpay.plans.all({ count, skip });
      allPlans.push(...response.items);
      
      if (response.count < count) {
        hasMore = false;
      } else {
        skip += count;
      }
    }
    
    console.log(`✅ Fetched ${allPlans.length} plans from Razorpay`);
    
    // Sync to database
    for (const plan of allPlans) {
      await prisma.plan.upsert({
        where: {
          razorpay_plan_id: plan.id
        },
        update: {
          name: plan.item.name,
          amount: plan.item.amount,
          currency: plan.item.currency,
          interval: plan.interval,
          period: plan.period,
          description: plan.item.description,
          metadata: plan.notes,
          active: plan.item.active
        },
        create: {
          razorpay_plan_id: plan.id,
          razorpay_item_id: plan.item.id,
          name: plan.item.name,
          amount: plan.item.amount,
          currency: plan.item.currency,
          interval: plan.interval,
          period: plan.period,
          description: plan.item.description,
          metadata: plan.notes,
          active: plan.item.active
        }
      });
      
      console.log(`✅ Synced: ${plan.item.name}`);
    }
    
    console.log('✅ All plans synced');
    
  } catch (error) {
    console.error('❌ Error syncing plans:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncPlans();
```

**Run the script**:
```bash
npx tsx scripts/sync-plans.ts
```

---

### Step 2: Display Plans on Frontend

```typescript
// src/app/pricing/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Plan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: number;
  period: string;
  description: string;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchPlans();
  }, []);
  
  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans?count=10');
      const data = await response.json();
      
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount / 100);
  };
  
  const formatFrequency = (interval: number, period: string) => {
    if (interval === 1) {
      return period;
    }
    return `${interval} ${period}s`;
  };
  
  if (loading) {
    return <div>Loading plans...</div>;
  }
  
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold text-center mb-12">
        Choose Your Plan
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map(plan => (
          <div 
            key={plan.id}
            className="border rounded-lg p-6 shadow-lg hover:shadow-xl transition"
          >
            <h2 className="text-2xl font-bold mb-2">
              {plan.name}
            </h2>
            
            <p className="text-gray-600 mb-4">
              {plan.description}
            </p>
            
            <div className="mb-6">
              <span className="text-4xl font-bold">
                {formatPrice(plan.amount, plan.currency)}
              </span>
              <span className="text-gray-600">
                /{formatFrequency(plan.interval, plan.period)}
              </span>
            </div>
            
            <Button 
              className="w-full"
              onClick={() => {
                // Handle subscription creation
                window.location.href = `/subscribe?plan=${plan.id}`;
              }}
            >
              Choose Plan
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Step 3: Admin Dashboard - View Plans

```typescript
// src/app/(dashboard)/admin/plans/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchPlans();
  }, []);
  
  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans?count=100');
      const data = await response.json();
      
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const syncPlans = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/plans/sync', {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('✅ Plans synced successfully');
        fetchPlans();
      }
    } catch (error) {
      alert('❌ Failed to sync plans');
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Plans Management</h1>
        
        <div className="space-x-2">
          <Button onClick={syncPlans} variant="outline">
            Sync from Razorpay
          </Button>
          
          <Link href="/admin/plans/create">
            <Button>Create New Plan</Button>
          </Link>
        </div>
      </div>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="border rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Frequency</th>
                <th className="px-4 py-2 text-left">Plan ID</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(plan => (
                <tr key={plan.id} className="border-t">
                  <td className="px-4 py-2">{plan.name}</td>
                  <td className="px-4 py-2">
                    ₹{plan.amount / 100}
                  </td>
                  <td className="px-4 py-2">
                    {plan.interval} {plan.period}
                  </td>
                  <td className="px-4 py-2 font-mono text-sm">
                    {plan.id}
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/admin/plans/${plan.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
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

### 1. Cache Plans

```typescript
// lib/plans-cache.ts

import { unstable_cache } from 'next/cache';
import { razorpay } from './razorpay';

export const getCachedPlans = unstable_cache(
  async () => {
    const response = await razorpay.plans.all({ count: 100 });
    return response.items;
  },
  ['razorpay-plans'],
  {
    revalidate: 3600, // 1 hour
    tags: ['plans']
  }
);
```

---

### 2. Handle Pagination Properly

```typescript
// ❌ Don't fetch one by one
for (let i = 0; i < 100; i++) {
  const plans = await razorpay.plans.all({ count: 1, skip: i });
  // Process...
}

// ✅ Fetch in batches
const batchSize = 100;
let skip = 0;
let hasMore = true;

while (hasMore) {
  const response = await razorpay.plans.all({ count: batchSize, skip });
  // Process response.items...
  
  if (response.count < batchSize) hasMore = false;
  else skip += batchSize;
}
```

---

### 3. Error Recovery

```typescript
async function fetchPlanWithRetry(planId: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await razorpay.plans.fetch(planId);
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

- Part 15: [Plans Entity](./15_RAZORPAY_PLANS_ENTITY.md)
- Part 16: [Create Plan API](./16_RAZORPAY_CREATE_PLAN.md)
- Part 4: [Create and View Plans Dashboard](./4_RAZORPAY_CREATE_AND_VIEW_PLANS.md)
