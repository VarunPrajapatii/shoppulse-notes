# Part 34: Razorpay Invoices Product - Overview

## Overview

**Razorpay Invoices** is a standalone product for creating, issuing, and tracking one-time invoices. Unlike subscription invoices (which are auto-generated for recurring charges), these are manually created digital documents for individual transactions or orders.

**Availability**: India, Malaysia

**Key Distinction**:
```javascript
// Subscription Invoices (Part 28)
- Auto-generated for each billing cycle
- Tied to recurring subscription
- Fetched via: GET /v1/invoices?subscription_id=X

// Razorpay Invoices (This Part)
- Manually created for one-time transactions
- Independent of subscriptions
- Created via: POST /v1/invoices (Dashboard or API)
```

---

## What is a Razorpay Invoice?

An **Invoice** is a digital document that summarizes order/transaction details and allows customers to initiate payments.

### Typical Invoice Contents:
- Product/service names and descriptions
- Quantities and pricing breakdown
- Receipt number
- Customer information (name, email, contact)
- Tax details (GST-compliant)
- Discounts and offers
- Terms and conditions
- Payment link (embedded SMS/email)

---

## Use Cases

### 1. **Service Businesses**
```javascript
// Consulting invoice
Items: Consultation (2 hours @ ₹5,000/hour)
Total: ₹10,000
Due Date: 15 days
```

### 2. **E-commerce Orders**
```javascript
// Product invoice
Items:
- Product A (qty: 2) - ₹2,000
- Shipping - ₹100
GST: ₹378
Total: ₹2,478
```

### 3. **Freelance Work**
```javascript
// Project invoice
Items:
- Website Design - ₹50,000
- 2 Revisions - ₹10,000
- Rush Delivery - ₹5,000
Total: ₹65,000
Payment Terms: Net 30
```

---

## Key Advantages

### 1. **Flexible Invoicing**
- Add multiple items sold
- Detailed tax calculations (GST-compliant)
- Offer discounts (invoice-level or item-level)
- Add custom terms and conditions
- Multi-currency support

### 2. **Unlimited Invoices**
- Create as many invoices as needed
- **Charged only when invoices get paid**
- No monthly limits or caps

### 3. **GST-Compliant**
```javascript
// Automatic GST calculations
Item Amount: ₹10,000
GST (18%): ₹1,800
Discount: -₹500
Final Total: ₹11,300
```

### 4. **Embedded Payment Link**
- Customers receive SMS/email with payment link
- One-click payment (no manual entry)
- Support for all Razorpay payment methods

### 5. **Expiry Management**
- Set due dates for invoices
- Auto-expire after deadline
- Send reminder notifications

### 6. **Partial Payments**
- Allow customers to pay in installments
- Track remaining balance automatically
- Multiple payments link to one invoice

### 7. **Easy API Integration**
- Integrate with existing billing systems
- Auto-create invoices on order creation
- Seamless with order management platforms

### 8. **Download & Share**
- Customers can download invoice PDF
- Quick reference for accounting
- Professional branded invoices

### 9. **Access Control**
- Role-based permissions (create, view, edit)
- Team management
- Audit trails for invoice actions

---

## Supported Payment Methods

### Online Payments
Customers can pay using:
- **Cards**: Credit/Debit (domestic & international)
- **Netbanking**: All major banks
- **UPI**: Google Pay, PhonePe, Paytm, etc.
- **Wallets**: Paytm, PhonePe, Amazon Pay, etc.
- **Pay Later**: LazyPay, Simpl, etc.

---

## International Currency Support

### Multi-Currency Invoices
- Create non-GST invoices in [100+ supported currencies](https://razorpay.com/docs/payments/international-payments/#supported-currencies)
- Examples: USD, EUR, GBP, SGD, MYR, AED

**Important Limitations**:
```javascript
// International invoices
✅ Supported: Multi-currency amounts
❌ Not Supported: Tax rates (GST only for INR)
```

**Example**:
```javascript
// USD invoice (no tax)
{
  "currency": "USD",
  "amount": 10000, // $100.00
  "tax_amount": 0, // Cannot add tax for non-INR
  "customer_email": "customer@example.com"
}
```

---

## Platform Support

### Standard Checkout

| Platform | Supported |
|----------|-----------|
| Web | ✅ |
| Android | ✅ |
| iOS | ✅ |
| Webview | ✅ |

**All platforms supported** - customers can view and pay invoices on any device.

---

## Address Verification System (AVS)

For **international payments**, Razorpay offers Address Verification System (AVS):

### What is AVS?
- Verifies customer's billing address matches card issuer records
- Checks postal code + street address
- Razorpay accepts/cancels transaction based on issuer response

### Benefits:
- **Fraud Prevention**: Reduce chargebacks from international cards
- **Automatic Handling**: Razorpay manages verification flow
- **Improved Security**: Additional layer of customer authentication

**Configuration**: Enable AVS in Razorpay Dashboard → Settings → Payment Methods → International Cards

---

## Dashboard Actions

You can perform all invoice operations from the Dashboard:

| Action | Description |
|--------|-------------|
| **Create** | Build new invoice with items, taxes, customer details |
| **Issue** | Send invoice to customer via SMS/email |
| **Cancel** | Mark invoice as cancelled (no payment expected) |
| **Duplicate** | Clone existing invoice for reuse |
| **Search** | Filter by customer, date, status, amount |
| **Update** | Edit invoice details (only if not issued) |
| **Delete** | Remove draft invoices permanently |

**Access**: Dashboard → Invoices

---

## Webhook Events

Subscribe to real-time notifications:

| Event | Triggered When |
|-------|----------------|
| `invoice.paid` | Customer completes payment |
| `invoice.partially_paid` | Customer makes partial payment |
| `invoice.expired` | Invoice passes due date unpaid |

**Setup**: Dashboard → Settings → Webhooks

---

## Invoice States

```javascript
// State flow
Draft → Issued → Paid ✅
         ↓
      Expired ❌

// Alternative flows
Draft → Deleted ❌
Issued → Cancelled ❌
```

### State Descriptions

| State | Description | Customer Action |
|-------|-------------|----------------|
| `draft` | Created but not sent | Cannot pay yet |
| `issued` | Sent to customer | Can pay now |
| `paid` | Full payment received | No action needed |
| `partially_paid` | Partial payment made | Can pay remaining |
| `expired` | Due date passed | Can still pay (if enabled) |
| `cancelled` | Merchant cancelled | Cannot pay |
| `deleted` | Removed from system | N/A |

---

## Getting Started

### Step 1: Sign Up
1. [Create Razorpay account](https://razorpay.com/docs/payments/create-account/)
2. Complete KYC verification
3. Activate account

### Step 2: Create First Invoice
```
Dashboard → Invoices → Create New Invoice
```

### Step 3: Add Details
- Customer information (name, email, contact)
- Line items (products/services)
- Tax rates (if applicable)
- Discounts
- Due date
- Terms & conditions

### Step 4: Issue Invoice
- Review details
- Click "Issue"
- Invoice sent to customer via SMS/email

### Step 5: Track Payment
- Monitor invoice status in Dashboard
- Receive webhook notification on payment
- Download receipt/invoice PDF

---

## Integration with Existing Systems

### Use Cases

#### 1. **Order Management System**
```javascript
// When order is created
Order Created → Auto-create Razorpay Invoice → Send to customer

// Implementation
app.post('/api/orders', async (req, res) => {
  const order = await createOrder(req.body);
  
  // Create invoice
  const invoice = await razorpay.invoices.create({
    type: 'invoice',
    customer: {
      name: order.customerName,
      email: order.customerEmail,
      contact: order.customerPhone
    },
    line_items: order.items.map(item => ({
      name: item.name,
      amount: item.price * 100, // Convert to paise
      quantity: item.quantity
    })),
    currency: 'INR'
  });

  // Issue invoice immediately
  await razorpay.invoices.issue(invoice.id);
  
  res.json({ order, invoice });
});
```

#### 2. **Billing System**
```javascript
// Monthly billing cycle
Generate Invoices → Send to all customers → Track payments

// Implementation
async function monthlyBilling() {
  const customers = await getActiveCustomers();

  for (const customer of customers) {
    const invoice = await razorpay.invoices.create({
      type: 'invoice',
      customer: {
        email: customer.email,
        name: customer.name
      },
      line_items: [
        {
          name: 'Monthly Subscription',
          amount: customer.planAmount * 100
        }
      ],
      expire_by: getEndOfMonth()
    });

    await razorpay.invoices.issue(invoice.id);
    
    // Store invoice reference
    await db.invoices.create({
      customerId: customer.id,
      razorpayInvoiceId: invoice.id,
      status: 'issued'
    });
  }
}
```

#### 3. **CRM Integration**
```javascript
// Trigger invoice from CRM event
Deal Won → Create Invoice → Send to client

// Webhook handler
app.post('/webhooks/crm/deal-won', async (req, res) => {
  const deal = req.body;

  const invoice = await razorpay.invoices.create({
    type: 'invoice',
    customer: {
      name: deal.clientName,
      email: deal.clientEmail
    },
    line_items: [
      {
        name: deal.productName,
        amount: deal.amount * 100,
        quantity: 1
      }
    ],
    notes: {
      deal_id: deal.id,
      crm_source: 'salesforce'
    }
  });

  await razorpay.invoices.issue(invoice.id);
  
  res.json({ success: true, invoiceId: invoice.id });
});
```

---

## ShopPulse Implementation Example

### API Route: Create Invoice

```typescript
// app/api/invoices/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      customerName,
      customerEmail,
      customerContact,
      lineItems, // [{ name, amount, quantity }]
      discount = 0,
      taxRate = 0,
      dueDate,
      notes
    } = body;

    // Calculate amounts
    const subtotal = lineItems.reduce(
      (sum: number, item: any) => sum + (item.amount * item.quantity),
      0
    );
    const discountAmount = (subtotal * discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * taxRate) / 100;
    const totalAmount = taxableAmount + taxAmount;

    // Create invoice in Razorpay
    const invoice = await razorpay.invoices.create({
      type: 'invoice',
      customer: {
        name: customerName,
        email: customerEmail,
        contact: customerContact
      },
      line_items: lineItems.map((item: any) => ({
        name: item.name,
        amount: item.amount * 100, // Convert to paise
        currency: 'INR',
        quantity: item.quantity
      })),
      currency: 'INR',
      expire_by: dueDate ? Math.floor(new Date(dueDate).getTime() / 1000) : undefined,
      sms_notify: 1,
      email_notify: 1,
      notes: notes || {}
    });

    // Store in database
    const dbInvoice = await prisma.invoice.create({
      data: {
        razorpayInvoiceId: invoice.id,
        userId: userId,
        customerName,
        customerEmail,
        customerContact,
        status: 'draft',
        amount: totalAmount,
        currency: 'INR',
        shortUrl: invoice.short_url,
        notes: notes || {}
      }
    });

    // Issue invoice immediately
    const issuedInvoice = await razorpay.invoices.issue(invoice.id);

    // Update database status
    await prisma.invoice.update({
      where: { id: dbInvoice.id },
      data: { status: 'issued' }
    });

    return NextResponse.json({
      success: true,
      invoice: {
        id: issuedInvoice.id,
        status: issuedInvoice.status,
        amount: totalAmount,
        shortUrl: issuedInvoice.short_url,
        issuedAt: new Date(issuedInvoice.issued_at * 1000)
      }
    });

  } catch (error: any) {
    console.error('Create invoice error:', error);
    return NextResponse.json(
      { error: error.error?.description || 'Failed to create invoice' },
      { status: error.statusCode || 500 }
    );
  }
}
```

---

### Frontend Component: Invoice Form

```typescript
// components/InvoiceCreateForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LineItem {
  name: string;
  amount: number;
  quantity: number;
}

export function InvoiceCreateForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerContact, setCustomerContact] = useState('');

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { name: '', amount: 0, quantity: 1 }
  ]);

  // Pricing
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(18); // Default GST 18%
  const [dueDate, setDueDate] = useState('');

  const addLineItem = () => {
    setLineItems([...lineItems, { name: '', amount: 0, quantity: 1 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.amount * item.quantity,
      0
    );
    const discountAmount = (subtotal * discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * taxRate) / 100;
    const total = taxableAmount + taxAmount;

    return { subtotal, discountAmount, taxableAmount, taxAmount, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerContact,
          lineItems,
          discount,
          taxRate,
          dueDate: dueDate || null,
          notes: {
            created_via: 'ShopPulse Admin'
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      toast({
        title: 'Invoice Created',
        description: `Invoice sent to ${customerEmail}`,
        variant: 'default'
      });

      router.push(`/invoices/${data.invoice.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invoice',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const { subtotal, discountAmount, taxableAmount, taxAmount, total } = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Details */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="customerName">Name</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="customerEmail">Email</Label>
            <Input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="customerContact">Contact (10 digits)</Label>
            <Input
              id="customerContact"
              value={customerContact}
              onChange={(e) => setCustomerContact(e.target.value)}
              pattern="[0-9]{10}"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Line Items
            <Button type="button" onClick={addLineItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.map((item, index) => (
            <div key={index} className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>Item Name</Label>
                <Input
                  value={item.name}
                  onChange={(e) => updateLineItem(index, 'name', e.target.value)}
                  required
                />
              </div>
              <div className="w-32">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={item.amount}
                  onChange={(e) => updateLineItem(index, 'amount', parseFloat(e.target.value))}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="w-24">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value))}
                  min="1"
                  required
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => removeLineItem(index)}
                disabled={lineItems.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing & Tax</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value))}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div>
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({discount}%):</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Taxable Amount:</span>
              <span>₹{taxableAmount.toFixed(2)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between">
                <span>Tax ({taxRate}%):</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create & Issue Invoice'}
      </Button>
    </form>
  );
}
```

---

## Best Practices

### 1. **Professional Branding**
- Add company logo
- Include terms & conditions
- Use professional language
- Add contact information

### 2. **Clear Payment Instructions**
- Highlight payment link prominently
- Specify due date clearly
- List accepted payment methods
- Provide support contact

### 3. **Accurate Tax Calculations**
- Enable GST for Indian customers
- Verify tax rates before issuing
- Show tax breakdown clearly
- Keep records for compliance

### 4. **Timely Reminders**
- Send reminder before due date
- Notify on payment received
- Follow up on expired invoices
- Automate reminder emails

### 5. **Data Management**
- Store invoice references in database
- Sync status via webhooks
- Maintain audit trail
- Generate reports regularly

---

## Invoices vs Subscriptions

### When to Use Invoices

✅ **Use Razorpay Invoices for**:
- One-time purchases
- Custom quotes
- Project-based billing
- Variable amounts per transaction
- Manual invoice creation
- Service invoices

❌ **Don't Use Invoices for**:
- Recurring billing (use Subscriptions)
- Fixed monthly charges (use Subscriptions)
- Auto-renewal services (use Subscriptions)

### When to Use Subscriptions

✅ **Use Razorpay Subscriptions for**:
- Monthly/yearly recurring charges
- SaaS products
- Membership fees
- Auto-renewal services
- Fixed billing cycles

❌ **Don't Use Subscriptions for**:
- One-time purchases
- Variable amounts
- Custom quotes per transaction

---

## Related Documentation

- [How Invoices Work](https://razorpay.com/docs/payments/invoices/how-it-works/)
- [Invoice States](https://razorpay.com/docs/payments/invoices/states/)
- [Create Invoice](https://razorpay.com/docs/payments/invoices/create/)
- [Issue Invoice](https://razorpay.com/docs/payments/invoices/issue/)
- [Invoice APIs](https://razorpay.com/docs/payments/invoices/apis/)
- [Subscribe to Webhooks](https://razorpay.com/docs/payments/invoices/subscribe-to-webhooks/)

---

## API Documentation (Coming Next)

The following operations are available via API (will be covered in subsequent parts):

| Operation | Description |
|-----------|-------------|
| **Create** | POST /v1/invoices - Create new invoice |
| **Issue** | POST /v1/invoices/:id/issue - Send to customer |
| **Fetch** | GET /v1/invoices/:id - Get invoice details |
| **Fetch All** | GET /v1/invoices - List all invoices |
| **Update** | PATCH /v1/invoices/:id - Edit draft invoice |
| **Cancel** | POST /v1/invoices/:id/cancel - Cancel issued invoice |
| **Delete** | DELETE /v1/invoices/:id - Remove draft invoice |
| **Notify** | POST /v1/invoices/:id/notify_by/:medium - Send reminder |

---

## Summary

**Razorpay Invoices** is a powerful standalone invoicing solution:

1. **Flexible Creation**: Add items, taxes, discounts
2. **Unlimited Usage**: Charged only on payment
3. **Multi-Platform**: Works on web, mobile, webview
4. **GST Compliant**: Automatic tax calculations
5. **Easy Payment**: Embedded payment links
6. **API Integration**: Seamless with existing systems

**Key Difference from Subscriptions**:
- Invoices = One-time manual billing
- Subscriptions = Recurring automatic billing

**Best For**: Service businesses, freelancers, e-commerce stores, consulting firms, project-based billing

**Next Steps**: Explore detailed API documentation for creating, managing, and tracking invoices programmatically.
