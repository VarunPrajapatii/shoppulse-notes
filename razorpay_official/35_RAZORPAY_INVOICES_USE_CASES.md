# Part 35: Razorpay Invoices Use Cases

## Overview

Explore the diverse use cases of Razorpay Invoices - a robust system to issue invoices to your customers.

**Availability**: India, Malaysia

---

## Freelance Services

**Example**: Acme at DesignWorks uses Razorpay Invoices to bill their clients for graphic design services, providing itemised invoices complete with taxes and discounts.

### Benefits for Acme at DesignWorks

#### Flexible Invoicing
Craft detailed invoices with line items for different design services and applicable taxes.

#### Partial Payments
Offer clients the convenience to pay in instalments for larger project fees.

#### GST-Compliant
Automatically calculate and incorporate GST for compliant billing.

#### Embedded Payment Link
Clients receive invoices with an integrated payment link via email, streamlining the payment process.

---

## Consulting Agencies

**Example**: Acme Consulting issues Razorpay Invoices for their advisory services, adding specific terms and conditions pertinent to their consultancy.

### Benefits for Acme Consulting

#### Access Control
Assign roles within the team for invoice management, ensuring that only authorised personnel can create or modify invoices.

#### Downloadable Invoices
Clients can download invoices for their records, facilitating ease of access and record-keeping.

#### Real-time Notifications
Receive updates as soon as invoices are viewed or paid, keeping cash flow management timely and updated.

---

## Small to Medium Enterprises (SMEs)

**Example**: Acme Supply leverages Razorpay Invoices to bill clients for hardware supplies, with detailed descriptions and the flexibility to add discounts.

### Benefits for Acme Supply

#### GST-Compliant Invoicing
Automatically handle GST calculations, discounts, and add shipping details in a compliant manner.

#### Downloadable Invoices
Allow customers to download their invoices directly, ensuring transparency and trust.

#### Real-Time Invoice Tracking
Stay on top of payments with real-time tracking and notifications upon receipt of payment.

---

---

## API Endpoints

### Part 49: Cancel an Invoice

**Endpoint**: `POST /v1/invoices/:id/cancel`

**Availability**: India, Malaysia

#### Description
Use this endpoint to cancel an invoice. Invoices in the `paid` state cannot be cancelled.

#### Path Parameters
- **id*** (string): The unique identifier of the invoice

#### Response Parameters
Returns the complete invoice object with:
- **status**: Will be `cancelled`
- **cancelled_at**: Timestamp when the invoice was cancelled
- All other standard invoice fields (28 total response parameters)

#### Error Scenarios
- **Status 400**: Operation not allowed for Invoice in cancelled status
  - You are trying to cancel an invoice which is already in the cancelled status

#### Example Usage (Node.js)
```javascript
var instance = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })

instance.invoices.cancel(invoiceId)
```

#### Key Points
- Cannot cancel paid invoices
- Cancellation is permanent and irreversible
- Returns full invoice object with `cancelled` status
- Updates `cancelled_at` timestamp

---

### Part 50: Fetch an Invoice With ID

**Endpoint**: `GET /v1/invoices/:id`

**Availability**: India, Malaysia

#### Description
Use this endpoint to retrieve all the details of an invoice.

#### Path Parameters
- **id*** (string): The unique identifier of the invoice

#### Response Parameters (28 Total)
Returns complete invoice details including:

**Basic Information**:
- `id`, `entity`, `type`, `invoice_number`
- `receipt`, `order_id`, `payment_id`

**Customer Details**:
- `customer_id`, `customer_details` (object with billing/shipping address)

**Line Items**:
- `line_items` (array): Details of items billed (max 50 items)
  - Each item includes: name, description, amount, quantity, taxes, etc.

**Status & Dates**:
- `status`: draft, issued, partially_paid, paid, cancelled, expired, deleted
- `issued_at`, `paid_at`, `cancelled_at`, `expired_at`
- `date`, `expire_by`

**Amount Details**:
- `amount`, `amount_paid`, `amount_due`
- `gross_amount`, `tax_amount`, `taxable_amount`
- `currency`, `currency_symbol`

**Additional Fields**:
- `description`, `notes`, `comment`, `terms`
- `short_url`: Payment link to share with customers
- `partial_payment`: Boolean indicating if partial payments allowed
- `sms_status`, `email_status`: Notification delivery status

#### Error Scenarios
- **Status 4xx**: The API key/secret provided is invalid
  - The API key or secret are not entered or an invalid API key is used
  
- **Status 400**: The id provided does not exist
  - The invoice id entered is either invalid or does not belong to the requester account

#### Example Usage (Node.js)
```javascript
var instance = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })

instance.invoices.fetch(invoiceId)
```

#### Key Points
- Returns complete invoice object with all 28 parameters
- Includes customer billing and shipping address details
- Contains line items with detailed tax and amount breakdowns
- Provides payment status and timestamp information
- Includes `short_url` for customer payment collection

---

## Summary

Razorpay Invoices streamline the billing process for businesses of all scales:

- **Freelancers**: Flexible invoicing with partial payments and embedded payment links
- **Consulting Agencies**: Access control, downloadable invoices, and real-time notifications
- **SMEs**: GST-compliant invoicing with real-time tracking

All use cases benefit from:
- GST-compliant automatic calculations
- Embedded payment links via SMS/email
- Downloadable invoices for customer records
- Real-time payment tracking and notifications
- Flexible invoicing with line items, taxes, and discounts

### API Management
- **Cancel invoices** that are not yet paid (Part 49)
- **Fetch complete invoice details** by ID (Part 50)
- Comprehensive error handling and validation
- Full invoice lifecycle management
