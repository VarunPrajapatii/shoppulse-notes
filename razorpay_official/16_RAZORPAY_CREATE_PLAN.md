# Razorpay Create Plan API

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 16 of Razorpay Official Documentation Series

---

## Table of Contents
1. [API Overview](#api-overview)
2. [Request Parameters](#request-parameters)
3. [Response Parameters](#response-parameters)
4. [Error Handling](#error-handling)
5. [Code Examples](#code-examples)
6. [Implementation Guide](#implementation-guide)

---

## API Overview

**Endpoint**: `POST /v1/plans`

Use this endpoint to **create a plan** programmatically.

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

## Request Parameters

### Required Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | ✅ Yes | Billing period (`daily`, `weekly`, `monthly`, `quarterly`, `yearly`) |
| `interval` | integer | ✅ Yes | Frequency multiplier (min 7 for daily) |
| `item` | object | ✅ Yes | Plan details (see below) |

### Item Object Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `name` | string | ✅ Yes | Plan name | `"MIDI Plan"` |
| `amount` | integer | ✅ Yes | Price in paise/subunits | `499900` (₹4,999) |
| `currency` | string | ✅ Yes | ISO currency code | `"INR"`, `"USD"` |
| `description` | string | ❌ Optional | Plan description | `"For growing businesses"` |

### Optional Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `notes` | object | ❌ Optional | Custom key-value pairs (max 15) | `{"tier": "midi"}` |

---

## Understanding Request Structure

### Basic Monthly Plan

```javascript
{
  "period": "monthly",           // Bill every month
  "interval": 1,                 // Every 1 month
  "item": {
    "name": "Basic Monthly Plan",
    "amount": 99900,             // ₹999
    "currency": "INR",
    "description": "Monthly subscription"
  }
}
```

**Result**: Customer billed ₹999 every month

---

### Quarterly Plan (Two Ways)

**Method 1: Using quarterly period**
```javascript
{
  "period": "quarterly",         // Bill every quarter
  "interval": 1,                 // Every 1 quarter
  "item": {
    "name": "Quarterly Plan",
    "amount": 269700,            // ₹2,697
    "currency": "INR"
  }
}
```

**Method 2: Using monthly period**
```javascript
{
  "period": "monthly",           // Bill every X months
  "interval": 3,                 // Every 3 months
  "item": {
    "name": "Quarterly Plan",
    "amount": 269700,            // ₹2,697
    "currency": "INR"
  }
}
```

**Both are equivalent!** Choose the one that's more intuitive for you.

---

### Custom Frequency Examples

**Every 2 Weeks (Bi-weekly)**:
```javascript
{
  "period": "weekly",
  "interval": 2,                 // Every 2 weeks
  "item": {
    "name": "Bi-weekly Plan",
    "amount": 49900,             // ₹499
    "currency": "INR"
  }
}
```

**Every 6 Months (Semi-annual)**:
```javascript
{
  "period": "monthly",
  "interval": 6,                 // Every 6 months
  "item": {
    "name": "Semi-annual Plan",
    "amount": 539400,            // ₹5,394
    "currency": "INR"
  }
}
```

**Every 2 Years (Biennial)**:
```javascript
{
  "period": "yearly",
  "interval": 2,                 // Every 2 years
  "item": {
    "name": "Biennial Plan",
    "amount": 1799800,           // ₹17,998
    "currency": "INR"
  }
}
```

---

### Daily Plan (Minimum 7 Days)

```javascript
{
  "period": "daily",
  "interval": 7,                 // Minimum 7 days for daily plans
  "item": {
    "name": "Weekly Plan",
    "amount": 19900,             // ₹199
    "currency": "INR",
    "description": "7-day subscription"
  }
}
```

❌ **This will FAIL**:
```javascript
{
  "period": "daily",
  "interval": 5,                 // Less than 7 - NOT ALLOWED
  "item": {
    "name": "5-day Plan",
    "amount": 14900,
    "currency": "INR"
  }
}
```

---

### With Notes (Metadata)

```javascript
{
  "period": "monthly",
  "interval": 1,
  "item": {
    "name": "MIDI Plan",
    "amount": 499900,            // ₹4,999
    "currency": "INR",
    "description": "Perfect for growing businesses"
  },
  "notes": {
    "tier": "midi",
    "max_stores": "10",
    "features": "advanced_analytics,custom_domain",
    "created_by": "admin_user_123",
    "test_mode": "false"
  }
}
```

**Use Cases for Notes**:
- Plan tier identification
- Feature flags
- Internal tracking
- A/B test variants
- Campaign attribution

---

## Payment Method Considerations

💡 **Handy Tips**: Different payment methods support different frequencies.

### UPI Autopay

```
✅ Supported: daily, weekly, monthly, quarterly, yearly
❌ Custom frequencies: Considered "as-presented" (may need manual handling)
```

**Example**:
```javascript
// ✅ Works seamlessly with UPI
{
  "period": "monthly",
  "interval": 1
}

// ⚠️ May require special handling
{
  "period": "weekly",
  "interval": 3               // Every 3 weeks - not standard
}
```

### Domestic Cards (India)

```
✅ Supported for mandate registration: weekly, monthly, yearly
❌ Other frequencies: Considered "as-presented"
```

**Example**:
```javascript
// ✅ Best for domestic cards
{
  "period": "monthly",
  "interval": 1               // Most compatible
}

// ⚠️ May have issues
{
  "period": "monthly",
  "interval": 2               // Bi-monthly not standard
}
```

### Emandate (NetBanking)

```
✅ All frequencies supported
✅ All custom frequencies supported
```

**Example**:
```javascript
// ✅ All work with Emandate
{
  "period": "quarterly",
  "interval": 1
}

{
  "period": "monthly",
  "interval": 3
}
```

---

## Response Parameters

### Success Response Structure

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
    "created_at": 1580219935,
    "updated_at": 1580219935
  },
  "notes": {
    "tier": "midi",
    "max_stores": "10"
  },
  "created_at": 1580219935
}
```

### Response Parameters Explained

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | **Plan ID** - Use this when creating subscriptions |
| `entity` | string | Always `"plan"` |
| `interval` | integer | Same as request |
| `period` | string | Same as request |
| `item.id` | string | **Item ID** - Auto-generated |
| `item.active` | boolean | Always `true` for new plans |
| `item.amount` | integer | Same as request |
| `item.unit_amount` | integer | Same as `amount` (for quantity-based pricing) |
| `notes` | object | Same as request |
| `created_at` | integer | Unix timestamp |

**Store the `id` in your database!** You'll need it to create subscriptions.

---

## Error Handling

### Error 1: Authentication Failed (401)

**When It Happens**:
```javascript
// Using wrong or invalid API keys
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
// ✅ Use correct API keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,       // Check: No whitespaces
  key_secret: process.env.RAZORPAY_KEY_SECRET // Check: Correct secret
});

// Verify keys are active on Dashboard
// Settings → API Keys → Check status
```

---

### Error 2: offer_id Not Required (400)

**When It Happens**:
```javascript
// Incorrectly passing offer_id in request
{
  "period": "monthly",
  "interval": 1,
  "offer_id": "offer_xxx",    // ❌ Wrong! Offers linked to subscriptions, not plans
  "item": { /* ... */ }
}
```

**Error Response**:
```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "offer_id is/are not required and should not be sent"
  }
}
```

**Solution**:
```javascript
// ✅ Remove offer_id from plan creation
{
  "period": "monthly",
  "interval": 1,
  "item": { /* ... */ }
}

// Link offers to SUBSCRIPTIONS, not plans
// See Part 12: Link Offers to Subscriptions
```

---

### Error 3: Amount Too Low (400)

**When It Happens**:
```javascript
// Amount less than minimum (₹1.00 = 100 paise)
{
  "period": "monthly",
  "interval": 1,
  "item": {
    "name": "Test Plan",
    "amount": 50,              // ❌ Less than 100 paise (₹1)
    "currency": "INR"
  }
}
```

**Error Response**:
```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "The amount must be atleast INR 1.00."
  }
}
```

**Solution**:
```javascript
// ✅ Minimum ₹1.00 = 100 paise
{
  "period": "monthly",
  "interval": 1,
  "item": {
    "name": "Test Plan",
    "amount": 100,             // ₹1.00 (minimum)
    "currency": "INR"
  }
}

// Practical minimum for real plans
{
  "item": {
    "amount": 9900,            // ₹99 (realistic minimum)
    "currency": "INR"
  }
}
```

---

## Code Examples

### Node.js (Razorpay SDK)

```javascript
const Razorpay = require('razorpay');

const instance = new Razorpay({
  key_id: 'YOUR_KEY_ID',
  key_secret: 'YOUR_SECRET'
});

// Create a plan
instance.plans.create({
  period: "weekly",
  interval: 1,
  item: {
    name: "Test plan - Weekly",
    amount: 69900,
    currency: "INR",
    description: "Description for the test plan"
  },
  notes: {
    notes_key_1: "Tea, Earl Grey, Hot",
    notes_key_2: "Tea, Earl Grey… decaf."
  }
})
.then(plan => {
  console.log('Plan created:', plan.id);
  // Store plan.id in database
})
.catch(error => {
  console.error('Error creating plan:', error);
});
```

---

### cURL

```bash
curl -X POST https://api.razorpay.com/v1/plans \
  -u YOUR_KEY_ID:YOUR_SECRET \
  -H "Content-Type: application/json" \
  -d '{
    "period": "monthly",
    "interval": 1,
    "item": {
      "name": "MIDI Plan",
      "amount": 499900,
      "currency": "INR",
      "description": "Perfect for growing businesses"
    },
    "notes": {
      "tier": "midi",
      "max_stores": "10"
    }
  }'
```

---

### Python

```python
import razorpay

client = razorpay.Client(auth=("YOUR_KEY_ID", "YOUR_SECRET"))

plan = client.plan.create({
  "period": "monthly",
  "interval": 1,
  "item": {
    "name": "MIDI Plan",
    "amount": 499900,
    "currency": "INR",
    "description": "Perfect for growing businesses"
  },
  "notes": {
    "tier": "midi"
  }
})

print(f"Plan created: {plan['id']}")
```

---

### TypeScript (Next.js API Route)

```typescript
// src/app/api/admin/plans/create/route.ts

import Razorpay from 'razorpay';
import { NextRequest, NextResponse } from 'next/server';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, amount, description, tier, interval = 1, period = 'monthly' } = body;
    
    // Validate amount
    if (amount < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least ₹1.00 (100 paise)' },
        { status: 400 }
      );
    }
    
    // Create plan in Razorpay
    const plan = await razorpay.plans.create({
      period,
      interval,
      item: {
        name,
        amount,
        currency: 'INR',
        description
      },
      notes: {
        tier,
        created_at: new Date().toISOString(),
        created_by: 'admin'
      }
    });
    
    // Store in database
    const dbPlan = await prisma.plan.create({
      data: {
        razorpay_plan_id: plan.id,
        razorpay_item_id: plan.item.id,
        name: plan.item.name,
        amount: plan.item.amount,
        currency: plan.item.currency,
        interval: plan.interval,
        period: plan.period,
        description: plan.item.description,
        metadata: plan.notes,
        active: true
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      plan: dbPlan 
    });
    
  } catch (error: any) {
    console.error('Error creating plan:', error);
    
    return NextResponse.json(
      { 
        error: error.error?.description || 'Failed to create plan',
        code: error.error?.code 
      },
      { status: error.statusCode || 500 }
    );
  }
}
```

---

## Implementation Guide

### Step 1: Create Plans for ShopPulse

```typescript
// scripts/create-plans.ts

import Razorpay from 'razorpay';
import { PrismaClient } from '@prisma/client';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

const prisma = new PrismaClient();

const PLANS = [
  {
    name: 'MINI Plan',
    amount: 99900,        // ₹999
    description: 'Perfect for small stores',
    tier: 'mini',
    features: 'basic_analytics',
    max_stores: 3
  },
  {
    name: 'MIDI Plan',
    amount: 499900,       // ₹4,999
    description: 'Perfect for growing businesses',
    tier: 'midi',
    features: 'advanced_analytics,custom_domain',
    max_stores: 10
  },
  {
    name: 'MAXI Plan',
    amount: 999900,       // ₹9,999
    description: 'For large enterprises',
    tier: 'maxi',
    features: 'premium_support,api_access,white_label',
    max_stores: 50
  }
];

async function createPlans() {
  for (const planData of PLANS) {
    try {
      // Create in Razorpay
      const razorpayPlan = await razorpay.plans.create({
        period: 'monthly',
        interval: 1,
        item: {
          name: planData.name,
          amount: planData.amount,
          currency: 'INR',
          description: planData.description
        },
        notes: {
          tier: planData.tier,
          features: planData.features,
          max_stores: planData.max_stores.toString()
        }
      });
      
      console.log(`✅ Created Razorpay plan: ${razorpayPlan.id}`);
      
      // Store in database
      const dbPlan = await prisma.plan.create({
        data: {
          razorpay_plan_id: razorpayPlan.id,
          razorpay_item_id: razorpayPlan.item.id,
          name: planData.name,
          amount: planData.amount,
          currency: 'INR',
          interval: 1,
          period: 'monthly',
          description: planData.description,
          tier: planData.tier,
          features: planData.features.split(','),
          max_stores: planData.max_stores,
          active: true
        }
      });
      
      console.log(`✅ Saved to database: ${dbPlan.id}`);
      
    } catch (error) {
      console.error(`❌ Error creating ${planData.name}:`, error);
    }
  }
}

createPlans()
  .then(() => console.log('✅ All plans created'))
  .catch(error => console.error('❌ Script failed:', error))
  .finally(() => prisma.$disconnect());
```

**Run the script**:
```bash
npx tsx scripts/create-plans.ts
```

---

### Step 2: Admin UI for Plan Creation

```typescript
// src/app/(dashboard)/admin/plans/create/page.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function CreatePlanPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    description: '',
    tier: '',
    interval: 1,
    period: 'monthly'
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/plans/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseInt(formData.amount) * 100 // Convert to paise
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`✅ Plan created: ${data.plan.razorpay_plan_id}`);
        // Reset form or redirect
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to create plan');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Plan</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Plan Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="MIDI Plan"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="amount">Amount (₹) *</Label>
          <Input
            id="amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
            placeholder="4999"
            min="1"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter amount in rupees (will be converted to paise)
          </p>
        </div>
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Perfect for growing businesses"
          />
        </div>
        
        <div>
          <Label htmlFor="tier">Tier</Label>
          <Input
            id="tier"
            value={formData.tier}
            onChange={(e) => setFormData({...formData, tier: e.target.value})}
            placeholder="midi"
          />
        </div>
        
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Plan'}
        </Button>
      </form>
    </div>
  );
}
```

---

## Best Practices

### 1. Plan Naming Convention

```typescript
// ✅ Good: Clear, descriptive
"MINI Plan - Monthly"
"MIDI Plan - Annual"
"Enterprise - Quarterly"

// ❌ Poor: Vague
"Plan 1"
"Basic"
"Option A"
```

### 2. Amount Conversion

```typescript
// ✅ Always convert to paise
const amountInRupees = 4999;
const amountInPaise = amountInRupees * 100; // 499900

// ✅ Helper function
function convertToSubunits(amount: number, currency: string): number {
  const decimals = {
    'INR': 2,
    'USD': 2,
    'KWD': 3,
    'JPY': 0
  };
  
  return amount * Math.pow(10, decimals[currency] || 2);
}
```

### 3. Store Plan ID

```typescript
// ✅ Always store the plan ID returned by Razorpay
const plan = await razorpay.plans.create(/* ... */);

await prisma.plan.create({
  data: {
    razorpay_plan_id: plan.id,  // Critical!
    // ... other fields
  }
});
```

### 4. Error Handling

```typescript
try {
  const plan = await razorpay.plans.create(data);
} catch (error: any) {
  if (error.error?.code === 'BAD_REQUEST_ERROR') {
    // Handle validation errors
    console.error('Validation error:', error.error.description);
  } else if (error.statusCode === 401) {
    // Handle auth errors
    console.error('Authentication failed');
  } else {
    // Handle other errors
    console.error('Unexpected error:', error);
  }
}
```

---

## Related Documentation

- Part 15: [Plans Entity](./15_RAZORPAY_PLANS_ENTITY.md)
- Part 17: [Fetch Plans API](./17_RAZORPAY_FETCH_PLANS.md) (Next)
- Part 4: [Create and View Plans Dashboard](./4_RAZORPAY_CREATE_AND_VIEW_PLANS.md)
