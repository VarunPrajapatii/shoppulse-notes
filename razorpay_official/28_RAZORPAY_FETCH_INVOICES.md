# Part 28: Fetch All Invoices of a Subscription API

## Overview

The **Fetch Invoices API** retrieves all invoices generated for a specific subscription. Each invoice represents a billing cycle charge, including plan charges and any addons.

**Endpoint**: `GET /v1/invoices?subscription_id=:sub_id`

**Key Points**:
- Returns all invoices for a subscription
- Includes plan charges and addon charges
- Shows payment status (paid, pending, expired)
- Essential for billing history and accounting
- Count indicates total invoices generated

---

## Understanding Invoices

### What is an Invoice?

An invoice is a billing document created for each subscription charge:

```javascript
// Monthly subscription timeline
January 1: Invoice created → Payment attempted → Paid
February 1: Invoice created → Payment attempted → Paid
March 1: Invoice created → Payment attempted → Failed → Retry

// Each charge = 1 invoice
Total invoices = 3 (one per billing cycle)
```

---

### Invoice vs Payment

```javascript
Invoice:
- Billing document (what customer owes)
- Created by Razorpay automatically
- Status: draft, issued, paid, expired, cancelled

Payment:
- Money transfer from customer
- Links to invoice via payment_id
- Multiple payments can be for one invoice (partial payments)
```

---

## API Details

### Endpoint
```
GET https://api.razorpay.com/v1/invoices?subscription_id=:sub_id
```

### Authentication
Basic Auth using your API Key ID and Secret:
```
Authorization: Basic <base64(key_id:key_secret)>
```

---

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subscription_id` | string | ✅ Yes | The unique identifier linked to the Subscription<br>Example: `sub_00000000000001` |

---

## Response Structure

```json
{
  "entity": "collection",
  "count": 2,
  "items": [
    {
      "id": "inv_00000000000003",
      "entity": "invoice",
      "receipt": null,
      "invoice_number": null,
      "customer_id": "cust_00000000000001",
      "customer_details": {
        "id": "cust_00000000000001",
        "name": null,
        "email": "<email>",
        "contact": "<phone>",
        "gstin": null,
        "billing_address": null,
        "shipping_address": null,
        "customer_name": null,
        "customer_email": "<email>",
        "customer_contact": "<phone>"
      },
      "order_id": "order_00000000000002",
      "subscription_id": "sub_00000000000001",
      "line_items": [
        {
          "id": "li_00000000000003",
          "item_id": null,
          "name": "Monthly Plan",
          "description": null,
          "amount": 99900,
          "unit_amount": 99900,
          "gross_amount": 99900,
          "tax_amount": 0,
          "currency": "INR",
          "type": "plan",
          "quantity": 1,
          "taxes": []
        }
      ],
      "payment_id": "pay_00000000000002",
      "status": "paid",
      "expire_by": null,
      "issued_at": 1593344888,
      "paid_at": 1593344889,
      "cancelled_at": null,
      "expired_at": null,
      "sms_status": null,
      "email_status": null,
      "date": 1593344888,
      "terms": null,
      "partial_payment": false,
      "gross_amount": 99900,
      "tax_amount": 0,
      "taxable_amount": 99900,
      "amount": 99900,
      "amount_paid": 99900,
      "amount_due": 0,
      "currency": "INR",
      "description": null,
      "notes": [],
      "comment": null,
      "short_url": "https://rzp.io/i/Ys4feGqEp",
      "view_less": true,
      "billing_start": 1594405800,
      "billing_end": 1597084200,
      "type": "invoice",
      "created_at": 1593344888
    }
  ]
}
```

---

## Key Response Fields

### Collection Level

| Field | Type | Description |
|-------|------|-------------|
| `entity` | string | Always `"collection"` |
| `count` | integer | The number of invoices generated for the Subscription |
| `items` | array | List of invoices generated for the Subscription |

### Invoice Level

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Invoice unique identifier<br>Example: `inv_00000000000003` |
| `order_id` | string | The unique identifier of the order associated with the invoice |
| `subscription_id` | string | The unique identifier of the Subscription<br>Example: `sub_00000000000001` |
| `payment_id` | string | Unique identifier of the payment made by the customer using this invoice<br>Example: `pay_00000000000001` |
| `status` | string | The status of the invoice. Possible values:<br>• `draft`<br>• `issued`<br>• `partially_paid`<br>• `paid`<br>• `expired`<br>• `cancelled`<br>• `deleted` |
| `expire_by` | integer | The Unix timestamp, indicates at which the invoice will expire<br>Example: `1593411509` |
| `issued_at` | integer | The Unix timestamp, indicates at which the invoice was issued to the customer<br>Example: `1593411209` |
| `paid_at` | integer | The Unix timestamp, indicates at which the payment was made<br>Example: `1593411325` |
| `cancelled_at` | integer | The Unix timestamp, indicates at which the invoice was canceled by you<br>Example: `1593411209` |
| `expired_at` | integer | The Unix timestamp, indicates at which the invoice has expired<br>Example: `1593411209` |
| `sms_status` | string | Indicates whether the SMS notification for the invoice was sent to the customer. Possible values:<br>• `pending`<br>• `sent` |
| `email_status` | string | Indicates whether the email notification for the invoice was sent to the customer. Possible values:<br>• `pending`<br>• `sent` |
| `date` | integer | The Unix timestamp, that indicates the date of the invoice |
| `terms` | string | Any terms to be included in the invoice. Here, it is `null` |
| `partial_payment` | boolean | Indicates whether the customer can make a partial payment on the invoice<br>• `true`: Customer can make partial payments<br>• `false`: Customer cannot make partial payments |
| `amount` | integer | Amount to be paid using the invoice. This should be in the smallest unit of the currency<br>Example: `29995` |
| `amount_paid` | integer | Amount paid by the customer using the invoice<br>Example: `29995` |
| `amount_due` | integer | The remaining amount to be paid by the customer for the issued invoice |
| `currency` | string | The currency associated with the item |
| `description` | string | A brief description of the invoice. Here, it is `null` |
| `notes` | object | Key-value pair that can be used to store additional information about the entity. Maximum 15 key-value pairs, 256 characters (maximum) each<br>Example: `"note_key": "Beam me up Scotty"` |
| `comment` | string | Any comments to be added in the invoice. Here, it is `null` |
| `short_url` | string | The short URL that is generated. This is the link that can be shared with customers to accept payments. Once canceled, no payments can be accepted using the link<br>Example: `https://rzp.io/i/gb5827Hh` |
| `view_less` | boolean | Used when the link description is lengthy and you want to make the text collapsible. The text can be expanded by the customer using the **Show More** link<br>• `true` (default): Link description appears collapsed, with a **Show More** link<br>• `false`: Link description appears expanded |
| `billing_start` | integer | Unix timestamp - billing cycle start |
| `billing_end` | integer | Unix timestamp - billing cycle end |
| `type` | string | Here, it is `invoice` |
| `created_at` | integer | The Unix timestamp, that indicates when this invoice entity was created<br>Example: `1593411943` |

### Line Items

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Item name<br>Example: `"Monthly Plan"`, `"Delivery charges"` |
| `amount` | integer | Item amount in paise |
| `type` | string | `"plan"` or `"addon"` |
| `quantity` | integer | Number of units |

**Note**: Details of the line item that is billed in the invoice. Number of arrays = number of line items billed in the invoice. For example, if the Subscription starts immediately and has an upfront fee attached to it, the number of line items = 2. One for the Subscription charge and one for the upfront fee.

---

## Understanding Line Items

### Scenario 1: Plan Only

```json
// Simple monthly plan charge
{
  "line_items": [
    {
      "name": "MAXI Plan",
      "amount": 199900, // ₹1,999
      "type": "plan",
      "quantity": 1
    }
  ],
  "amount": 199900 // Total: ₹1,999
}
```

---

### Scenario 2: Plan + Addon

```json
// First invoice with setup fee
{
  "line_items": [
    {
      "name": "MIDI Plan",
      "amount": 59900, // ₹599
      "type": "plan",
      "quantity": 1
    },
    {
      "name": "Setup Fee",
      "amount": 100000, // ₹1,000
      "type": "addon",
      "quantity": 1
    }
  ],
  "amount": 159900 // Total: ₹1,599
}
```

---

### Scenario 3: Multiple Quantities

```json
// Team plan with 5 users
{
  "line_items": [
    {
      "name": "MAXI Plan",
      "amount": 999500, // ₹9,995
      "unit_amount": 199900, // ₹1,999 per user
      "type": "plan",
      "quantity": 5 // 5 users
    }
  ],
  "amount": 999500 // Total: ₹9,995
}
```

---

## Invoice Status Lifecycle

```javascript
// Status flow
draft → issued → paid ✅
         ↓
      expired ❌
      
// or
draft → cancelled ❌
```

### Status Explanations

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `draft` | Created but not sent | Will auto-issue at billing time |
| `issued` | Sent to customer, awaiting payment | Customer should pay |
| `paid` | Payment successful | No action needed |
| `partially_paid` | Partial payment received | Customer owes remaining amount |
| `expired` | Payment deadline passed | Retry or mark failed |
| `cancelled` | You cancelled invoice | No payment expected |

---

## Error Handling

### Error: Invalid API Key

**Error Status**: `4xx`

**Error Message**: "The API key/secret provided is invalid."

**Description**: This error occurs due to a mismatch between the API credentials passed in the API call and those generated on the Dashboard.

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

**Solution**: Verify API credentials are correct and active. Check that the API key and secret match those generated on your Razorpay Dashboard.

---

## Code Examples

### Example 1: Fetch All Invoices (Node.js)

```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function fetchSubscriptionInvoices(subscriptionId) {
  try {
    const invoices = await razorpay.invoices.all({
      subscription_id: subscriptionId
    });

    console.log(`Total invoices: ${invoices.count}`);
    console.log('Invoices:');

    invoices.items.forEach((invoice, index) => {
      console.log(`\n${index + 1}. Invoice ${invoice.id}`);
      console.log(`   Status: ${invoice.status}`);
      console.log(`   Amount: ₹${invoice.amount / 100}`);
      console.log(`   Issued: ${new Date(invoice.issued_at * 1000).toLocaleDateString()}`);
      
      if (invoice.paid_at) {
        console.log(`   Paid: ${new Date(invoice.paid_at * 1000).toLocaleDateString()}`);
      }

      // Line items
      console.log('   Items:');
      invoice.line_items.forEach(item => {
        console.log(`   - ${item.name}: ₹${item.amount / 100} (${item.type})`);
      });
    });

    return invoices;
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    throw error;
  }
}

// Usage
fetchSubscriptionInvoices('sub_00000000000001');
```

---

### Example 2: ShopPulse API Route - Fetch Invoices

```typescript
// app/api/subscriptions/[subscriptionId]/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export async function GET(
  req: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId } = params;

    // Verify subscription ownership
    const dbSubscription = await prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: subscriptionId }
    });

    if (!dbSubscription || dbSubscription.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch invoices from Razorpay
    const invoices = await razorpay.invoices.all({
      subscription_id: subscriptionId
    });

    // Transform response
    const transformedInvoices = invoices.items.map((invoice: any) => ({
      id: invoice.id,
      status: invoice.status,
      amount: invoice.amount / 100, // Convert to rupees
      amountPaid: invoice.amount_paid / 100,
      amountDue: invoice.amount_due / 100,
      issuedAt: new Date(invoice.issued_at * 1000),
      paidAt: invoice.paid_at ? new Date(invoice.paid_at * 1000) : null,
      billingPeriod: {
        start: new Date(invoice.billing_start * 1000),
        end: new Date(invoice.billing_end * 1000)
      },
      lineItems: invoice.line_items.map((item: any) => ({
        name: item.name,
        amount: item.amount / 100,
        type: item.type,
        quantity: item.quantity
      })),
      paymentId: invoice.payment_id,
      shortUrl: invoice.short_url
    }));

    // Calculate totals
    const totalPaid = transformedInvoices
      .filter((inv: any) => inv.status === 'paid')
      .reduce((sum: number, inv: any) => sum + inv.amount, 0);

    const totalDue = transformedInvoices
      .filter((inv: any) => inv.status === 'issued')
      .reduce((sum: number, inv: any) => sum + inv.amountDue, 0);

    return NextResponse.json({
      count: invoices.count,
      invoices: transformedInvoices,
      summary: {
        totalInvoices: invoices.count,
        totalPaid: totalPaid,
        totalDue: totalDue,
        paidCount: transformedInvoices.filter((inv: any) => inv.status === 'paid').length,
        pendingCount: transformedInvoices.filter((inv: any) => inv.status === 'issued').length
      }
    });

  } catch (error: any) {
    console.error('Fetch invoices error:', error);
    return NextResponse.json(
      { error: error.error?.description || 'Failed to fetch invoices' },
      { status: error.statusCode || 500 }
    );
  }
}
```

---

### Example 3: ShopPulse Frontend - Invoice History Table

```typescript
// components/InvoiceHistoryTable.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Invoice {
  id: string;
  status: string;
  amount: number;
  issuedAt: Date;
  paidAt: Date | null;
  billingPeriod: {
    start: Date;
    end: Date;
  };
  lineItems: Array<{
    name: string;
    amount: number;
    type: string;
  }>;
  shortUrl: string;
}

export function InvoiceHistoryTable({ subscriptionId }: { subscriptionId: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, [subscriptionId]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/subscriptions/${subscriptionId}/invoices`);
      const data = await response.json();
      
      setInvoices(data.invoices);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      paid: { variant: 'success', label: 'Paid' },
      issued: { variant: 'warning', label: 'Pending' },
      expired: { variant: 'destructive', label: 'Expired' },
      cancelled: { variant: 'secondary', label: 'Cancelled' }
    };

    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading invoices...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
        <CardDescription>
          All invoices for your subscription
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold">{summary.totalInvoices}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">₹{summary.totalPaid}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Paid Count</p>
              <p className="text-2xl font-bold">{summary.paidCount}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-orange-600">
                {summary.pendingCount > 0 ? `₹${summary.totalDue}` : '₹0'}
              </p>
            </div>
          </div>
        )}

        {/* Invoice Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Billing Period</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-mono text-sm">{invoice.id}</TableCell>
                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                <TableCell className="text-sm">
                  {new Date(invoice.billingPeriod.start).toLocaleDateString()} -{' '}
                  {new Date(invoice.billingPeriod.end).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {invoice.lineItems.map((item, idx) => (
                      <div key={idx}>
                        {item.name} ({item.type})
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="font-semibold">₹{invoice.amount}</TableCell>
                <TableCell className="text-sm">
                  {new Date(invoice.issuedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm">
                  {invoice.paidAt
                    ? new Date(invoice.paidAt).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={invoice.shortUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {invoices.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No invoices found for this subscription
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### Example 4: Calculate Total Revenue

```typescript
// lib/revenue-calculator.ts
export async function calculateSubscriptionRevenue(subscriptionId: string) {
  const invoices = await razorpay.invoices.all({
    subscription_id: subscriptionId
  });

  const paidInvoices = invoices.items.filter((inv: any) => inv.status === 'paid');

  // Total revenue
  const totalRevenue = paidInvoices.reduce(
    (sum: number, inv: any) => sum + inv.amount_paid,
    0
  );

  // Plan revenue vs Addon revenue
  const planRevenue = paidInvoices.reduce((sum: number, inv: any) => {
    const planItems = inv.line_items.filter((item: any) => item.type === 'plan');
    return sum + planItems.reduce((itemSum: number, item: any) => itemSum + item.amount, 0);
  }, 0);

  const addonRevenue = paidInvoices.reduce((sum: number, inv: any) => {
    const addonItems = inv.line_items.filter((item: any) => item.type === 'addon');
    return sum + addonItems.reduce((itemSum: number, item: any) => itemSum + item.amount, 0);
  }, 0);

  return {
    totalRevenue: totalRevenue / 100, // Convert to rupees
    planRevenue: planRevenue / 100,
    addonRevenue: addonRevenue / 100,
    invoiceCount: paidInvoices.length,
    averageInvoice: totalRevenue / paidInvoices.length / 100
  };
}

// Usage
const revenue = await calculateSubscriptionRevenue('sub_00000000000001');
console.log(`Total Revenue: ₹${revenue.totalRevenue}`);
console.log(`From Plans: ₹${revenue.planRevenue}`);
console.log(`From Addons: ₹${revenue.addonRevenue}`);
```

---

## Implementation Best Practices

### 1. **Sync Invoices to Database**

```typescript
async function syncInvoicesToDatabase(subscriptionId: string) {
  const invoices = await razorpay.invoices.all({
    subscription_id: subscriptionId
  });

  for (const invoice of invoices.items) {
    await prisma.invoice.upsert({
      where: { razorpayInvoiceId: invoice.id },
      create: {
        razorpayInvoiceId: invoice.id,
        subscriptionId: subscriptionId,
        status: invoice.status,
        amount: invoice.amount,
        amountPaid: invoice.amount_paid,
        issuedAt: new Date(invoice.issued_at * 1000),
        paidAt: invoice.paid_at ? new Date(invoice.paid_at * 1000) : null
      },
      update: {
        status: invoice.status,
        amountPaid: invoice.amount_paid,
        paidAt: invoice.paid_at ? new Date(invoice.paid_at * 1000) : null
      }
    });
  }
}
```

---

### 2. **Filter by Date Range**

```typescript
// Get invoices for specific period
function filterInvoicesByDateRange(
  invoices: any[],
  startDate: Date,
  endDate: Date
) {
  return invoices.filter((invoice) => {
    const issuedDate = new Date(invoice.issued_at * 1000);
    return issuedDate >= startDate && issuedDate <= endDate;
  });
}

// Get last 3 months invoices
const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

const recentInvoices = filterInvoicesByDateRange(
  invoices.items,
  threeMonthsAgo,
  new Date()
);
```

---

### 3. **Generate PDF Receipts**

```typescript
async function generateInvoicePDF(invoiceId: string) {
  const invoice = await razorpay.invoices.fetch(invoiceId);

  // Use PDF library (e.g., jsPDF)
  const pdf = new jsPDF();
  
  pdf.text(`Invoice: ${invoice.id}`, 10, 10);
  pdf.text(`Status: ${invoice.status}`, 10, 20);
  pdf.text(`Amount: ₹${invoice.amount / 100}`, 10, 30);
  pdf.text(`Issued: ${new Date(invoice.issued_at * 1000).toLocaleDateString()}`, 10, 40);

  // Add line items
  let y = 60;
  invoice.line_items.forEach((item: any) => {
    pdf.text(`${item.name}: ₹${item.amount / 100}`, 10, y);
    y += 10;
  });

  return pdf.save(`invoice-${invoice.id}.pdf`);
}
```

---

## Related Documentation

- **Part 18**: Subscriptions Entity (understand billing cycles)
- **Part 19**: Create Subscription (how invoices are created)
- **Part 14**: Payment Retries (failed invoice handling)
- **Part 22**: Cancel Subscription (final invoice creation)

---

## Summary

The **Fetch Invoices API** provides complete billing history:

1. **All Invoices**: Returns every invoice for a subscription
2. **Line Items**: Breakdown of plan charges and addons
3. **Payment Status**: Track paid, pending, expired invoices
4. **Billing Periods**: Start and end dates for each charge

**Key Uses**:
- Display billing history to customers
- Generate accounting reports
- Track revenue per subscription
- Identify failed payments
- Export for tax/audit purposes

**Best Practices**:
- Sync invoices to database regularly
- Show clear billing history in customer portal
- Allow PDF download for receipts
- Track plan vs addon revenue separately
- Filter by date ranges for reports

**Pro Tip**: Use invoice data to identify payment patterns and proactively reach out before payment failures!
