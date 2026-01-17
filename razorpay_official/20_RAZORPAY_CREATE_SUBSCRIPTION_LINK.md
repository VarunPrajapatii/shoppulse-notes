# Razorpay Create Subscription Link API

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Part**: 20 of Razorpay Official Documentation Series

---

## Table of Contents
1. [API Overview](#api-overview)
2. [Differences from Create Subscription](#differences-from-create-subscription)
3. [Request Parameters](#request-parameters)
4. [Response Structure](#response-structure)
5. [Error Handling](#error-handling)
6. [Code Examples](#code-examples)
7. [Implementation Guide](#implementation-guide)

---

## API Overview

**Endpoint**: `POST /v1/subscriptions`

Use this endpoint to **create a subscription link** that can be shared with customers via email, SMS, or WhatsApp.

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

## Differences from Create Subscription

| Feature | Create Subscription (Part 19) | Create Subscription Link |
|---------|-------------------------------|--------------------------|
| **Customer Info** | Not required | Can include via `notify_info` |
| **Use Case** | Programmatic creation | Share link with customer |
| **Notifications** | Optional | Can pre-fill customer details |
| **Best For** | Integrated checkout | Email/SMS campaigns |

💡 **Key Difference**: Subscription Link allows you to pass customer contact details (`notify_info`) so Razorpay can send notifications even before authorization.

---

## Request Parameters

### Required Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `plan_id` | string | ✅ Yes | The unique identifier of a plan that should be linked to the Subscription. For example, `plan_00000000000001`. | 
| `total_count` | integer | ✅ Yes | The number of billing cycles for which the customer should be charged. For example, if a customer is buying a 1-year subscription billed on a bi-monthly basis, this value should be `6`. |

### Optional Parameters

| Parameter | Type | Description | Default |  
| `quantity` | integer | The number of times the customer should be charged the plan amount per invoice. For example, a customer subscribes to use software. The charges are ₹100.00/month/license. The customer wants 5 licenses. You should pass `5` as the quantity. The customer is charged ₹500.00 (5 x ₹100.00) monthly. | `1` |
| `start_at` | integer | Unix timestamp that indicates from when the Subscription should start. If not passed, the Subscription starts immediately after the authorisation payment. For example, `1581013800`. For Subscriptions with a future start_date, frequency is considered `as_presented`. | Now |
| `expire_by` | integer | Unix timestamp that indicates till when the customer can make the authorisation payment. For example, `1581013800`. The default value is 30 years. Do not pass any value if you do not want to set an expiry date. | 30 years |
| `customer_notify` | boolean | Indicates whether the communication to the customer would be handled by businesses or Razorpay. Possible values: `true` (default) - Communication handled by Razorpay, `false` - Communication handled by businesses. | `true` |
| `addons` | object | Array that contains details of any upfront amount you want to collect as part of the authorisation transaction. | `[]` |
| `offer_id` | string | The unique identifier of the offer that is linked to the Subscription. You can obtain this from the Dashboard. For example, `offer_JHD834hjbxzhd38d`. | `null` |
| `notes` | object | Notes you can enter for the contact for future reference. This is a key-value pair. You can enter a maximum of 15 key-value pairs. For example, `"note_key": "Beam me up Scotty"`. | `{}` |

### New Parameter: `notify_info`

| Parameter | Type | Description |
|-----------|------|-------------|
| `notify_info` | object | The customer's email and phone number to which notifications are to be sent. Use this object only if you have set the `customer_notify` parameter to `true`. That is, Razorpay sends notifications to the customer. **Important**: The customer details entered in the API request are only to notify the customer about the Subscription. The same will not be prefilled in the checkout as per the government guidelines. |

**Child Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `notify_phone` | string | Customer's phone number for notifications. For example, `+919876543210`. |
| `notify_email` | string | Customer's email address for notifications. For example, `gaurav.kumar@example.com`. |

**Structure**:
```javascript
{
  "notify_info": {
    "notify_phone": "+919876543210",
    "notify_email": "customer@example.com"
  }
}
```

---

## Understanding `notify_info`

### When to Use

**Scenario 1: Email Campaign**
```javascript
// You have customer email from signup form
// Want Razorpay to send authorization link

{
  "plan_id": "plan_midi",
  "total_count": 12,
  "customer_notify": true,
  "notify_info": {
    "notify_email": "customer@example.com"
  }
}

// Razorpay sends email to customer@example.com with authorization link
```

---

**Scenario 2: SMS Campaign**
```javascript
// You have customer phone from lead form
// Want Razorpay to send SMS with link

{
  "plan_id": "plan_mini",
  "total_count": 12,
  "customer_notify": true,
  "notify_info": {
    "notify_phone": "9876543210"
  }
}

// Razorpay sends SMS to 9876543210
```

---

**Scenario 3: Both Email and Phone**
```javascript
{
  "plan_id": "plan_maxi",
  "total_count": 12,
  "customer_notify": true,
  "notify_info": {
    "notify_email": "ceo@acme.com",
    "notify_phone": "9876543210"
  }
}

// Razorpay sends both email and SMS
```

---

### Important Notes About `notify_info`

⚠️ **Government Guidelines Compliance**:
- Contact details in `notify_info` are **only for notifications**
- They are **NOT pre-filled** in the checkout form
- Customer must enter details manually during authorization

⚠️ **Requirement**:
- Use `notify_info` **only if** `customer_notify = true`
- If `customer_notify = false`, `notify_info` is ignored

---

## Request Examples

### Example 1: Basic Subscription Link

```javascript
{
  "plan_id": "plan_HoYg68p5kmuvzD",
  "total_count": 12,
  "quantity": 1,
  "customer_notify": true,
  "notify_info": {
    "notify_phone": "9876543210",
    "notify_email": "customer@example.com"
  }
}
```

---

### Example 2: With Expiry and Addons

```javascript
const expireIn7Days = Math.floor((Date.now() + (7 * 24 * 60 * 60 * 1000)) / 1000);

{
  "plan_id": "plan_midi",
  "total_count": 12,
  "expire_by": expireIn7Days,
  "customer_notify": true,
  "addons": [
    {
      "item": {
        "name": "Delivery charges",
        "amount": 30000,
        "currency": "INR"
      }
    }
  ],
  "notes": {
    "notes_key_1": "Tea, Earl Grey, Hot",
    "notes_key_2": "Tea, Earl Grey… decaf."
  },
  "notify_info": {
    "notify_phone": "9876543210",
    "notify_email": "customer@example.com"
  }
}
```

---

## Response Structure

### Success Response (24 Parameters)

```json
{
  "id": "sub_00000000000002",
  "entity": "subscription",
  "plan_id": "plan_00000000000001",
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
  "start_at": 1580453311,
  "end_at": 1587061800,
  "auth_attempts": 0,
  "total_count": 12,
  "paid_count": 0,
  "customer_notify": true,
  "created_at": 1580283117,
  "expire_by": 1581013800,
  "short_url": "https://rzp.io/i/m0y0f",
  "has_scheduled_changes": false,
  "change_scheduled_at": null,
  "source": "api",
  "offer_id": "offer_JHD834hjbxzhd38d",
  "remaining_count": 12
}
```

**Key Field**: `short_url` - Share this link with customers!

### Response Parameters Reference

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The unique identifier of the subscription created. For example, `sub_00000000000001`. |
| `entity` | string | The entity being created. Here, it will be `subscription`. |
| `plan_id` | string | The unique identifier for a plan that is linked to the created subscription. For example, `plan_00000000000001`. |
| `customer_id` | string | The unique identifier of the customer linked to the subscription. This is populated automatically once the customer completes the authorization transaction. For example, `cust_00000000000001`. |
| `status` | string | Status of the subscription. Possible values: `created`, `authenticated`, `active`, `pending`, `halted`, `cancelled`, `completed`, `expired`. |
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
| `customer_notify` | boolean | Indicates whether the communication to the customer would be handled by businesses or Razorpay. `true`: Communication handled by Razorpay (default). `false`: Communication handled by businesses. |
| `created_at` | integer | The timestamp, in Unix format, when the subscription was created. For example, `1581013800`. |
| `expire_by` | integer | The timestamp, in Unix format, till when the customer can make the authorization payment. For example, `1581013800`. |
| `short_url` | string | URL that can be used to make the authorization payment. For example, `https://rzp.io/i/PWtAiEo`. |
| `has_scheduled_changes` | boolean | Indicates if the subscription has any scheduled changes. Possible values: `true` - Subscription has scheduled changes, `false` - Subscription does not have scheduled changes. |
| `schedule_change_at` | string | Represents when the subscription should be updated. Possible values: `now` (default) - Updates the subscription immediately, `cycle_end` - Updates the subscription at the end of the current billing cycle. |
| `remaining_count` | integer | This indicates the number of billing cycles remaining on the subscription. For example, `2`. |

---

## Error Handling

### Error: Expired Authorization Deadline (400)

**When It Happens**:
```javascript
// expire_by is in the past

const pastDate = Math.floor((Date.now() - (7 * 24 * 60 * 60 * 1000)) / 1000);

{
  "plan_id": "plan_midi",
  "total_count": 12,
  "expire_by": pastDate  // ❌ 7 days ago
}
```

**Error Response** (Status: 400):
```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "Link expire by cannot be lesser than the current time."
  }
}
```

**Why This Happens**: This error occurs when the time mentioned in the `expire_by` parameter has already passed. For example, if today's date is December 12, 2022, but the expiry date is mentioned as December 10, 2022.

**Solution**:
```typescript
// ✅ Always use future timestamp
const futureDate = Math.floor((Date.now() + (7 * 24 * 60 * 60 * 1000)) / 1000);

{
  "plan_id": "plan_midi",
  "total_count": 12,
  "expire_by": futureDate  // ✅ 7 days from now
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

instance.subscriptions.create({
  plan_id: "plan_HoYg68p5kmuvzD",
  total_count: 12,
  quantity: 1,
  expire_by: 1633237807,
  customer_notify: true,
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
    notes_key_1: "Tea, Earl Grey, Hot",
    notes_key_2: "Tea, Earl Grey… decaf."
  },
  notify_info: {
    notify_phone: "9876543210",
    notify_email: "customer@example.com"
  }
})
.then(subscription => {
  console.log('Subscription link created:', subscription.short_url);
  // Send link via your preferred channel
})
.catch(error => {
  console.error('Error:', error);
});
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
    "customer_notify": true,
    "notify_info": {
      "notify_phone": "9876543210",
      "notify_email": "customer@example.com"
    }
  }'
```

---

### TypeScript (Next.js API Route)

```typescript
// src/app/api/subscriptions/create-link/route.ts

import Razorpay from 'razorpay';
import { NextRequest, NextResponse } from 'next/server';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      planId, 
      totalCount, 
      customerEmail, 
      customerPhone,
      quantity = 1 
    } = body;
    
    // Validate inputs
    if (!planId || !totalCount) {
      return NextResponse.json(
        { error: 'plan_id and total_count are required' },
        { status: 400 }
      );
    }
    
    // Calculate expiry (7 days from now)
    const expireBy = Math.floor((Date.now() + (7 * 24 * 60 * 60 * 1000)) / 1000);
    
    // Create subscription link
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: totalCount,
      quantity,
      expire_by: expireBy,
      customer_notify: true,
      notify_info: {
        notify_email: customerEmail,
        notify_phone: customerPhone
      },
      notes: {
        created_from: 'admin_panel',
        created_at: new Date().toISOString()
      }
    });
    
    // Store in database
    await prisma.subscription.create({
      data: {
        razorpay_subscription_id: subscription.id,
        razorpay_plan_id: planId,
        status: subscription.status,
        short_url: subscription.short_url,
        total_count: subscription.total_count,
        expire_by: new Date(subscription.expire_by * 1000),
        customer_email: customerEmail,
        customer_phone: customerPhone
      }
    });
    
    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      payment_link: subscription.short_url,
      expires_at: new Date(subscription.expire_by * 1000).toISOString()
    });
    
  } catch (error: any) {
    console.error('Error creating subscription link:', error);
    
    return NextResponse.json(
      { 
        error: error.error?.description || 'Failed to create subscription link',
        code: error.error?.code 
      },
      { status: error.statusCode || 500 }
    );
  }
}
```

---

## Implementation Guide

### Use Case 1: Email Marketing Campaign

```typescript
// scripts/send-subscription-links.ts

import Razorpay from 'razorpay';
import nodemailer from 'nodemailer';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

const mailer = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

interface Lead {
  email: string;
  name: string;
  planTier: string;
}

async function sendSubscriptionLink(lead: Lead) {
  // Determine plan based on tier
  const planMap = {
    'mini': 'plan_mini',
    'midi': 'plan_midi',
    'maxi': 'plan_maxi'
  };
  
  const planId = planMap[lead.planTier as keyof typeof planMap];
  
  // Create subscription link
  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 12,
    customer_notify: false,  // We'll send custom email
    expire_by: Math.floor((Date.now() + (7 * 24 * 60 * 60 * 1000)) / 1000),
    notes: {
      lead_email: lead.email,
      campaign: 'summer_2024'
    }
  });
  
  // Send custom email
  await mailer.sendMail({
    from: 'ShopPulse <hello@shoppulse.com>',
    to: lead.email,
    subject: `${lead.name}, Your ${lead.planTier.toUpperCase()} Plan is Ready!`,
    html: `
      <h1>Hi ${lead.name}!</h1>
      <p>Thanks for your interest in ShopPulse ${lead.planTier.toUpperCase()} Plan.</p>
      <p>Click the button below to complete your subscription:</p>
      <a href="${subscription.short_url}" 
         style="background: #007bff; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 4px; display: inline-block;">
        Complete Subscription
      </a>
      <p><small>This link expires in 7 days</small></p>
    `
  });
  
  console.log(`✅ Sent subscription link to ${lead.email}`);
}

// Process leads
const leads: Lead[] = [
  { email: 'customer1@example.com', name: 'John', planTier: 'midi' },
  { email: 'customer2@example.com', name: 'Jane', planTier: 'maxi' }
];

async function processCampaign() {
  for (const lead of leads) {
    try {
      await sendSubscriptionLink(lead);
    } catch (error) {
      console.error(`❌ Failed for ${lead.email}:`, error);
    }
  }
}

processCampaign();
```

---

### Use Case 2: Admin Panel - Manual Link Creation

```typescript
// src/app/(dashboard)/admin/subscriptions/create-link/page.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CreateSubscriptionLinkPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    planId: 'plan_midi',
    totalCount: 12,
    customerEmail: '',
    customerPhone: ''
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/subscriptions/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create subscription link');
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(result.payment_link);
    alert('Link copied to clipboard!');
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create Subscription Link</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="planId">Plan *</Label>
          <select
            id="planId"
            value={formData.planId}
            onChange={(e) => setFormData({...formData, planId: e.target.value})}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="plan_mini">MINI (₹999/mo)</option>
            <option value="plan_midi">MIDI (₹4,999/mo)</option>
            <option value="plan_maxi">MAXI (₹9,999/mo)</option>
          </select>
        </div>
        
        <div>
          <Label htmlFor="totalCount">Total Months *</Label>
          <Input
            id="totalCount"
            type="number"
            value={formData.totalCount}
            onChange={(e) => setFormData({...formData, totalCount: parseInt(e.target.value)})}
            min="1"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="email">Customer Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.customerEmail}
            onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
            placeholder="customer@example.com"
          />
        </div>
        
        <div>
          <Label htmlFor="phone">Customer Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.customerPhone}
            onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
            placeholder="9876543210"
          />
        </div>
        
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Subscription Link'}
        </Button>
      </form>
      
      {result && (
        <div className="mt-8 p-4 border rounded bg-green-50">
          <h2 className="text-lg font-bold mb-2">✅ Link Created!</h2>
          
          <div className="mb-2">
            <Label>Subscription ID</Label>
            <p className="font-mono text-sm">{result.subscription_id}</p>
          </div>
          
          <div className="mb-2">
            <Label>Payment Link</Label>
            <div className="flex gap-2">
              <Input 
                value={result.payment_link} 
                readOnly 
                className="flex-1"
              />
              <Button onClick={copyToClipboard}>Copy</Button>
            </div>
          </div>
          
          <div>
            <Label>Expires At</Label>
            <p className="text-sm">{new Date(result.expires_at).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. Set Reasonable Expiry

```typescript
// ✅ Good: 7-30 days for payment links
const expireIn7Days = Math.floor((Date.now() + (7 * 24 * 60 * 60 * 1000)) / 1000);

// ❌ Poor: Too short (1 hour)
const expireIn1Hour = Math.floor((Date.now() + (60 * 60 * 1000)) / 1000);

// ❌ Poor: Too long (1 year) - urgency lost
const expireIn1Year = Math.floor((Date.now() + (365 * 24 * 60 * 60 * 1000)) / 1000);
```

---

### 2. Validate Contact Information

```typescript
// ✅ Good: Validate before creating link
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);  // Indian mobile
}

if (email && !validateEmail(email)) {
  throw new Error('Invalid email format');
}

if (phone && !validatePhone(phone)) {
  throw new Error('Invalid phone format');
}
```

---

### 3. Track Link Usage

```typescript
// Store link details for tracking
await prisma.subscriptionLink.create({
  data: {
    razorpay_subscription_id: subscription.id,
    short_url: subscription.short_url,
    plan_id: planId,
    customer_email: email,
    campaign: 'summer_2024',
    status: 'sent',
    expires_at: new Date(subscription.expire_by * 1000)
  }
});

// Monitor link performance
const linkStats = await prisma.subscriptionLink.groupBy({
  by: ['campaign', 'status'],
  _count: true
});
```

---

## Related Documentation

- Part 18: [Subscriptions Entity](./18_RAZORPAY_SUBSCRIPTIONS_ENTITY.md)
- Part 19: [Create Subscription](./19_RAZORPAY_CREATE_SUBSCRIPTION.md)
- Part 21: [Fetch Subscriptions](./21_RAZORPAY_FETCH_SUBSCRIPTIONS.md) (Next)
