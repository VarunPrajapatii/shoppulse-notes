# Part 36: How Invoices Work

## Overview

Create Invoices, send them to customers to receive payments and perform other actions.

**Availability**: India, Malaysia

---

## Complete Invoice Flow

Given below is a complete end-to-end flow about how you can use Razorpay Invoices.

### Invoice Workflow Diagram

```
1. Create a Razorpay Account and complete KYC
         ↓
2. Create an Invoice via Razorpay Dashboard or API
         ↓
3. Issue the Invoice to your customer via SMS or Email
         ↓
4. Customer opens the link & completes the payment
         ↓
5. You can check the payment status on the Dashboard
         ↓
6. Razorpay settles the amount (minus fees & tax) to your account

Side Flow: You can make a partial or full refund to the customer
```

---

## Step 1: Create an Invoice

Create an invoice by providing all the required details. You can set an expiry date and enable partial payments.

Save the invoice. The invoice is in `draft` status. Know more about invoice states.

### Handy Tips

- You can update, delete, or create a duplicate of an invoice in `draft` status.
- **Invoice APIs**:
  - Create an invoice
  - Update an invoice
  - Delete an invoice

---

## Step 2: Issue an Invoice

Issue an invoice to a customer via email and/or SMS.

The customer receives a notification by email or SMS with a payment link using which the customer can pay using one of the available payment methods.

### Handy Tips

Use the Issue an Invoice API.

---

## Step 3: Receive Payments

Customer clicks the payment link and tries to make the payment.

- If partial payments was enabled, the customer chooses the amount to be paid.
- The customer chooses the mode of payment: Pay Online or Pay via Bank Transfer

Customer makes a successful payment. The invoice is marked as `paid` or `partially_paid`. You receive a notification about the payment.

### Handy Tips

After the payment is captured, the amount is settled to your account as per the settlement schedule. Know more about payments, settlements, refunds and disputes.

---

## Step 4: Track Invoices and Reports

### Notifications
You receive notifications regarding activity on invoices via SMS, emails and webhook. Know more about subscribing to Webhooks.

### Track Payments
Track payments made against the issued invoices on Dashboard. Click **Invoices** from the left menu. All the invoices are listed with their status under **Invoices**.

### Reports
Detailed insights can be gained using reports and real-time data on the Dashboard. These reports can then be used for accounting and reconciliation purposes. Know more about reports.

---

## Related Information

- Invoices
- Invoice States
- Create an Invoice
- Issue an Invoice
- Search an Invoice
- Update an Invoice
- Duplicate an Invoice
- Delete an Invoice
- Cancel an Invoice
- Download and Print an Invoice
- Subscribe to Webhooks
- Invoice APIs
