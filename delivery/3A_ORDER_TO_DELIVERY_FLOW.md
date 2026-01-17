# Part 3A: Order-to-Delivery Flow - Complete Lifecycle

## 🔄 From Payment Confirmation to Shipped Status

This document covers the complete journey of an order from the moment payment is confirmed until it's handed over to the courier.

---

## Table of Contents

1. [Order Lifecycle Overview](#order-lifecycle-overview)
2. [State Machine: Understanding Order Status](#state-machine)
3. [The Seller's Journey: What Happens After Payment](#sellers-journey)
4. [Order Verification & Fraud Detection](#order-verification)
5. [Inventory Management & Stock Handling](#inventory-management)
6. [Order Processing Best Practices](#order-processing-best-practices)
7. [Communication Touchpoints](#communication-touchpoints)
8. [Dashboard Actions & Workflows](#dashboard-workflows)

---

## Order Lifecycle Overview

### The Complete Picture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              COMPLETE ORDER LIFECYCLE IN E-COMMERCE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   CUSTOMER SIDE                    │         SELLER SIDE                    │
│   ─────────────                    │         ───────────                    │
│                                    │                                         │
│   ┌─────────────────┐              │                                         │
│   │  Browse Store   │              │                                         │
│   └────────┬────────┘              │                                         │
│            │                       │                                         │
│            ▼                       │                                         │
│   ┌─────────────────┐              │                                         │
│   │  Add to Cart    │              │                                         │
│   └────────┬────────┘              │                                         │
│            │                       │                                         │
│            ▼                       │                                         │
│   ┌─────────────────┐              │                                         │
│   │  Enter Address  │              │                                         │
│   │  + Phone        │              │                                         │
│   └────────┬────────┘              │                                         │
│            │                       │                                         │
│            ▼                       │                                         │
│   ┌─────────────────┐              │                                         │
│   │  Make Payment   │              │                                         │
│   │  (Razorpay)     │──────────────┼────► Order Created                     │
│   └────────┬────────┘              │      Status: PAID                       │
│            │                       │            │                            │
│            │                       │            ▼                            │
│   ┌────────┴────────┐              │   ┌───────────────────┐                │
│   │  Order          │              │   │  📬 Notification  │                │
│   │  Confirmation   │◄─────────────┼───│  New Order Alert  │                │
│   │  Email/SMS      │              │   └─────────┬─────────┘                │
│   └────────┬────────┘              │             │                          │
│            │                       │             ▼                          │
│            │                       │   ┌───────────────────┐                │
│   Waiting  │                       │   │  Review Order     │                │
│            │                       │   │  - Verify details │                │
│            │                       │   │  - Check stock    │                │
│            │                       │   │  - Check address  │                │
│            │                       │   └─────────┬─────────┘                │
│            │                       │             │                          │
│            │                       │             ▼                          │
│            │                       │   ┌───────────────────┐                │
│            │                       │   │  Accept Order     │                │
│   ┌────────┴────────┐              │   │  Status:          │                │
│   │  Order          │◄─────────────┼───│  PROCESSING       │                │
│   │  Processing     │              │   └─────────┬─────────┘                │
│   │  Notification   │              │             │                          │
│   └────────┬────────┘              │             ▼                          │
│            │                       │   ┌───────────────────┐                │
│            │                       │   │  Pick & Pack      │                │
│            │                       │   │  - Get product    │                │
│            │                       │   │  - Quality check  │                │
│            │                       │   │  - Package it     │                │
│            │                       │   └─────────┬─────────┘                │
│            │                       │             │                          │
│            │                       │             ▼                          │
│            │                       │   ┌───────────────────┐                │
│   ┌────────┴────────┐              │   │  Create Shipment  │                │
│   │  Shipped        │◄─────────────┼───│  - Generate AWB   │                │
│   │  Notification   │              │   │  - Print label    │                │
│   │  + Tracking #   │              │   │  Status: SHIPPED  │                │
│   └────────┬────────┘              │   └─────────┬─────────┘                │
│            │                       │             │                          │
│            │                       │             ▼                          │
│            │                       │   ┌───────────────────┐                │
│            │                       │   │  Handover         │                │
│            │                       │   │  - Courier pickup │                │
│            │                       │   │  - Or drop off    │                │
│            │                       │   └───────────────────┘                │
│            │                       │                                         │
│            ▼                       │                                         │
│   ┌─────────────────┐              │                                         │
│   │  Track Order    │              │                                         │
│   │  via AWB Link   │              │                                         │
│   └────────┬────────┘              │                                         │
│            │                       │                                         │
│            ▼                       │                                         │
│   ┌─────────────────┐              │                                         │
│   │  Receive Order  │              │   Webhook: DELIVERED                   │
│   │  Status:        │◄─────────────┼─────────────────────────               │
│   │  DELIVERED      │              │                                         │
│   └─────────────────┘              │                                         │
│                                    │                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Time Expectations by Industry

| Business Type | Expected Processing Time | Customer Expectation |
|---------------|-------------------------|---------------------|
| Fashion/Apparel | 24-48 hours | Ship in 1-2 days |
| Electronics | 24 hours | Same/next day ship |
| Handmade/Custom | 3-7 days | Acceptable delay |
| Print-on-Demand | 2-5 days | Manufacturing time |
| Dropshipping | 1-3 days | Depends on supplier |
| Perishables | Same day | Immediate processing |

---

## State Machine

### Understanding Order Status Transitions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ORDER STATUS STATE MACHINE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                        ┌──────────────┐                                     │
│                        │   PENDING    │ ◄──── Order created, no payment     │
│                        └──────┬───────┘                                     │
│                               │                                              │
│                               │ Customer initiates payment                   │
│                               ▼                                              │
│                        ┌──────────────────┐                                 │
│                        │ PAYMENT_INITIATED │ ◄── Razorpay checkout opened   │
│                        └──────┬───────────┘                                 │
│                               │                                              │
│               ┌───────────────┼───────────────┐                             │
│               │               │               │                             │
│               │ Payment       │ Payment       │ Payment                     │
│               │ Success       │ Failed        │ Timeout                     │
│               │               │               │                             │
│               ▼               ▼               ▼                             │
│        ┌──────────┐    ┌───────────┐   ┌───────────┐                       │
│        │   PAID   │    │  PENDING  │   │  PENDING  │                       │
│        └────┬─────┘    │  (retry)  │   │(abandoned)│                       │
│             │          └───────────┘   └───────────┘                       │
│             │                                                               │
│             │ Seller reviews & accepts                                      │
│             ▼                                                               │
│        ┌────────────┐                                                       │
│        │ PROCESSING │ ◄──── Seller preparing order                         │
│        └─────┬──────┘                                                       │
│              │                                                               │
│              │ AWB generated, label printed                                  │
│              ▼                                                               │
│        ┌────────────┐                                                       │
│        │  SHIPPED   │ ◄──── Handed to courier                              │
│        └─────┬──────┘                                                       │
│              │                                                               │
│              │ Courier updates (webhooks)                                    │
│              │                                                               │
│      ┌───────┴─────────┬─────────────────┐                                 │
│      │                 │                 │                                  │
│      ▼                 ▼                 ▼                                  │
│ ┌──────────┐   ┌─────────────┐   ┌─────────────┐                          │
│ │DELIVERED │   │   RTO_IN_   │   │   DELIVERY  │                          │
│ │    ✅    │   │  _TRANSIT   │   │   _FAILED   │                          │
│ └──────────┘   └──────┬──────┘   └──────┬──────┘                          │
│                       │                 │                                  │
│                       │                 │ Retry/resolve                    │
│                       ▼                 │                                  │
│               ┌─────────────┐           │                                  │
│               │RTO_DELIVERED│◄──────────┘                                  │
│               │  (Returned) │                                               │
│               └──────┬──────┘                                               │
│                      │                                                      │
│                      │ Process refund                                       │
│                      ▼                                                      │
│               ┌─────────────┐                                               │
│               │  REFUNDED   │                                               │
│               └─────────────┘                                               │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════       │
│                                                                              │
│   CANCELLATION PATHS (can happen at multiple stages):                       │
│                                                                              │
│   PAID ─────────► CANCELLED (before processing, full refund)                │
│   PROCESSING ───► CANCELLED (before shipping, full refund)                  │
│   SHIPPED ──────► Cannot cancel (must wait for delivery/RTO)                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Current ShopPulse Status Enum vs Proposed

```
CURRENT (schema.prisma):              PROPOSED (Enhanced):
─────────────────────────             ─────────────────────

enum OrderStatus {                    enum OrderStatus {
  PENDING                               PENDING
  PAYMENT_INITIATED                     PAYMENT_INITIATED
  PAID                                  PAID
  PROCESSING       ◄─ underutilized     CONFIRMED         ◄─ new (seller accepted)
  SHIPPED          ◄─ underutilized     PROCESSING        ◄─ being packed
  DELIVERED        ◄─ underutilized     READY_TO_SHIP     ◄─ new (awaiting pickup)
  CANCELLED                             SHIPPED
  REFUNDED                              OUT_FOR_DELIVERY  ◄─ new
}                                       DELIVERED
                                        DELIVERY_FAILED   ◄─ new
                                        RTO_IN_TRANSIT    ◄─ new
                                        RTO_DELIVERED     ◄─ new
                                        CANCELLED
                                        REFUNDED
                                      }
```

### Status Definitions & Actions

| Status | Definition | Who Sets It | Next Allowed Status |
|--------|------------|-------------|---------------------|
| `PENDING` | Order created, awaiting payment | System (automatic) | PAYMENT_INITIATED |
| `PAYMENT_INITIATED` | Customer opened Razorpay | System (automatic) | PAID, PENDING |
| `PAID` | Payment confirmed | Webhook (automatic) | PROCESSING, CANCELLED |
| `PROCESSING` | Seller accepted, preparing | Seller (manual) | SHIPPED, CANCELLED |
| `SHIPPED` | Handed to courier, AWB assigned | Seller/API (manual/auto) | DELIVERED, RTO_IN_TRANSIT |
| `DELIVERED` | Customer received | Webhook (automatic) | REFUNDED (if return) |
| `RTO_IN_TRANSIT` | Returning to seller | Webhook (automatic) | RTO_DELIVERED |
| `RTO_DELIVERED` | Returned to seller | Webhook (automatic) | REFUNDED |
| `CANCELLED` | Order cancelled | Seller/Customer | REFUNDED |
| `REFUNDED` | Money returned | System (automatic) | - (terminal state) |

---

## Seller's Journey

### What Happens When a New Order Comes In?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              SELLER'S COMPLETE WORKFLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  STEP 1: ORDER NOTIFICATION (Immediate)                                      │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  When payment succeeds, seller should receive:                               │
│                                                                              │
│  📱 PUSH NOTIFICATION (if mobile app)                                       │
│  ┌─────────────────────────────────────────────────┐                        │
│  │  🛒 New Order Received!                          │                        │
│  │  Order #ORD-12345                               │                        │
│  │  Amount: ₹1,299 (Prepaid)                       │                        │
│  │  Items: 2                                        │                        │
│  │  [View Order]                                    │                        │
│  └─────────────────────────────────────────────────┘                        │
│                                                                              │
│  📧 EMAIL NOTIFICATION                                                       │
│  Subject: 🎉 New Order #ORD-12345 - ₹1,299                                  │
│  Body:                                                                       │
│  - Customer details                                                          │
│  - Order items with images                                                   │
│  - Shipping address                                                          │
│  - Quick action links                                                        │
│                                                                              │
│  📱 SMS NOTIFICATION (Optional)                                              │
│  "New order ORD-12345 for ₹1,299. Login to process: app.link"               │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  STEP 2: ORDER REVIEW (5-15 minutes)                                        │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  Seller checks:                                                              │
│                                                                              │
│  ☐ Is the address complete and valid?                                       │
│    └─ Pincode present?                                                       │
│    └─ Landmark mentioned?                                                    │
│    └─ Phone number correct format?                                           │
│                                                                              │
│  ☐ Is the product in stock?                                                 │
│    └─ Correct size available?                                                │
│    └─ Correct color available?                                               │
│    └─ Quality acceptable?                                                    │
│                                                                              │
│  ☐ Any special instructions?                                                │
│    └─ Order notes from customer                                              │
│    └─ Gift wrapping requested?                                               │
│                                                                              │
│  ☐ Is delivery serviceable to this pincode?                                 │
│    └─ Check via Shiprocket API                                               │
│    └─ COD available if COD order?                                            │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  STEP 3: ACCEPT/REJECT DECISION                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  IF ACCEPTING:                                                               │
│  ┌────────────────────────────────────┐                                     │
│  │  Click: [Accept Order]              │                                     │
│  │  Status changes: PAID → PROCESSING  │                                     │
│  │  Customer notified: "Your order     │                                     │
│  │  is being prepared"                 │                                     │
│  └────────────────────────────────────┘                                     │
│                                                                              │
│  IF REJECTING (rare but happens):                                            │
│  ┌────────────────────────────────────┐                                     │
│  │  Click: [Cancel Order]              │                                     │
│  │  Select reason:                     │                                     │
│  │  • Out of stock                     │                                     │
│  │  • Cannot deliver to pincode        │                                     │
│  │  • Pricing error                    │                                     │
│  │  • Suspected fraud                  │                                     │
│  │                                     │                                     │
│  │  Status: PAID → CANCELLED           │                                     │
│  │  Automatic refund initiated         │                                     │
│  │  Customer notified with reason      │                                     │
│  └────────────────────────────────────┘                                     │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  STEP 4: PICK & PACK (15-60 minutes)                                        │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  Physical actions:                                                           │
│                                                                              │
│  1. LOCATE PRODUCT                                                           │
│     └─ Find in inventory                                                     │
│     └─ Verify SKU/variant matches order                                      │
│                                                                              │
│  2. QUALITY CHECK                                                            │
│     └─ No defects                                                            │
│     └─ Clean and presentable                                                 │
│     └─ All accessories included                                              │
│                                                                              │
│  3. PACKAGING                                                                │
│     └─ Select appropriate box/bag size                                       │
│     └─ Add padding if fragile                                                │
│     └─ Include invoice/packing slip                                          │
│     └─ Seal securely                                                         │
│                                                                              │
│  (Detailed in Part 3B)                                                       │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  STEP 5: CREATE SHIPMENT (5-10 minutes)                                      │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  In ShopPulse Dashboard:                                                     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │  ORDER #ORD-12345                                              │         │
│  │  ──────────────────────────────────────────────────────────── │         │
│  │                                                                │         │
│  │  Package Details:                                              │         │
│  │  ┌────────────────────────────────────────────────────────┐   │         │
│  │  │  Weight: [0.5] kg    (actual weight on scale)          │   │         │
│  │  │  Length: [25] cm     Breadth: [20] cm   Height: [5] cm │   │         │
│  │  └────────────────────────────────────────────────────────┘   │         │
│  │                                                                │         │
│  │  Courier Selection:                                            │         │
│  │  ┌────────────────────────────────────────────────────────┐   │         │
│  │  │  ◉ Delhivery Surface  - ₹42 - 4-5 days (Recommended)   │   │         │
│  │  │  ○ DTDC Economy       - ₹35 - 5-7 days                 │   │         │
│  │  │  ○ BlueDart Express   - ₹78 - 2-3 days                 │   │         │
│  │  └────────────────────────────────────────────────────────┘   │         │
│  │                                                                │         │
│  │  [Create Shipment & Generate Label]                            │         │
│  │                                                                │         │
│  └────────────────────────────────────────────────────────────────┘         │
│                                                                              │
│  System actions:                                                             │
│  • Calls Shiprocket API to create shipment                                   │
│  • Receives AWB number (e.g., 1234567890123)                                │
│  • Downloads shipping label PDF                                              │
│  • Updates order status: PROCESSING → SHIPPED                                │
│  • Sends customer notification with tracking link                            │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  STEP 6: LABEL & HANDOVER (10-30 minutes)                                   │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  1. Print shipping label                                                     │
│  2. Stick on package                                                         │
│  3. Schedule pickup OR drop at courier hub                                   │
│                                                                              │
│  (Detailed in Part 3B)                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Seller Dashboard Order View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ORDERS DASHBOARD - MyStore                                    🔔 2 New     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Filter: [All Orders ▼]  [Date Range]  [Status ▼]  🔍 Search                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📦 Order #ORD-12345            Today, 10:30 AM                     │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  ┌────────┐  Blue T-Shirt (Size M) x 1        ₹599                 │   │
│  │  │  IMG   │  Black Jeans (Size 32) x 1        ₹899                 │   │
│  │  └────────┘                                                          │   │
│  │                                             ──────────              │   │
│  │                                   Subtotal:   ₹1,498                │   │
│  │                                   Shipping:   ₹0 (Free)             │   │
│  │                                   ────────────────────              │   │
│  │                                   Total:      ₹1,498 (Prepaid)     │   │
│  │                                                                      │   │
│  │  👤 Rahul Sharma                                                    │   │
│  │  📍 123, ABC Apartments, Sector 15, Noida, UP - 201301             │   │
│  │  📱 +91 98765 43210                                                 │   │
│  │                                                                      │   │
│  │  Status: 🟡 PAID                                                    │   │
│  │                                                                      │   │
│  │  [Accept & Process]  [Cancel Order]  [Contact Customer]            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📦 Order #ORD-12344            Today, 9:15 AM                      │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  Status: 🔵 PROCESSING                                              │   │
│  │  Ready to ship? → [Create Shipment]                                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📦 Order #ORD-12340            Yesterday, 4:30 PM                  │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  Status: 🟢 SHIPPED                                                 │   │
│  │  AWB: 1234567890123 (Delhivery)                                     │   │
│  │  Last Update: In transit to Mumbai                                  │   │
│  │  [Track]  [View Details]                                            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Order Verification

### Why Verification Matters

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ORDER VERIFICATION & FRAUD DETECTION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PROBLEM: Not all paid orders should be shipped blindly                      │
│                                                                              │
│  COMMON ISSUES:                                                              │
│  ─────────────                                                               │
│  1. Fraudulent payments (stolen cards, UPI fraud)                           │
│  2. Test orders (customers checking if site works)                          │
│  3. Incomplete/invalid addresses                                             │
│  4. Out-of-stock items (inventory mismatch)                                 │
│  5. Pricing errors (wrong price displayed)                                   │
│  6. Suspicious patterns (bot orders, competitor sabotage)                   │
│                                                                              │
│  FRAUD INDICATORS (Red Flags):                                              │
│  ────────────────────────────                                               +
│
│  🚩 Very high value order from new customer                                 │
│  🚩 Rush shipping + COD combination                                          │
│  🚩 Multiple failed payment attempts before success                          │
│  🚩 Shipping address different from IP location                              │
│  🚩 Generic names ("Test", "ABC", "...")                                     │
│  🚩 Multiple orders to same address in short time                           │
│  🚩 Phone number doesn't match address region                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Verification Checklist for Sellers

```
BEFORE ACCEPTING AN ORDER:
─────────────────────────

☐ ADDRESS VERIFICATION
  │
  ├─ Is pincode valid? (6 digits)
  │  └─ Use pincode API to verify city/state match
  │
  ├─ Is address complete?
  │  └─ House/Flat number
  │  └─ Street/Area name
  │  └─ Landmark (helpful for delivery)
  │  └─ City, State, Pincode
  │
  └─ Is address deliverable?
     └─ Check Shiprocket serviceability

☐ PHONE VERIFICATION
  │
  ├─ Is it a 10-digit Indian mobile number?
  │
  ├─ Does area code region match address?
  │  └─ Example: +91 98765... could be anywhere
  │  └─ But landlines have geographic codes
  │
  └─ Optional: WhatsApp verification (green tick = real number)

☐ PAYMENT VERIFICATION
  │
  ├─ Payment confirmed via webhook? (not just redirect)
  │
  ├─ Payment amount matches order total?
  │
  └─ For COD: Is COD serviceable to this pincode?

☐ STOCK VERIFICATION
  │
  ├─ Is the exact variant (size/color) available?
  │
  └─ Is quantity available?

☐ FRAUD CHECK (High-value orders)
  │
  ├─ Is this customer's first order?
  │
  ├─ Order value unusually high for product category?
  │
  └─ Any suspicious patterns?
```

### Automated Verification in ShopPulse

```
RECOMMENDATION: Implement automated checks before showing "Accept" button

┌─────────────────────────────────────────────────────────────────┐
│  Order #ORD-12345 - Verification Status                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ Payment Verified      - Razorpay webhook confirmed          │
│  ✅ Address Complete      - All fields present                  │
│  ✅ Pincode Valid         - 201301 maps to Noida, UP            │
│  ✅ Delivery Serviceable  - Delhivery, DTDC available           │
│  ⚠️ First-time Customer   - No previous orders                  │
│  ✅ Normal Order Value    - ₹1,498 (within typical range)       │
│                                                                  │
│  Overall: READY TO PROCESS                                       │
│                                                                  │
│  [Accept & Process]  [Review Manually]  [Reject]                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Inventory Management

### Stock Handling During Order Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              INVENTORY & STOCK MANAGEMENT                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  THE STOCK PROBLEM:                                                         │
│  ──────────────────                                                         │
│                                                                              │
│  Scenario: You have 5 units of a T-shirt                                    │
│                                                                              │
│  10:00 AM - Customer A adds to cart (not reserved)                          │
│  10:05 AM - Customer B adds to cart (not reserved)                          │
│  10:10 AM - Customer A pays → Order created, stock: 4                       │
│  10:15 AM - Customer B pays → Order created, stock: 3                       │
│  10:20 AM - Customer C pays → Order created, stock: 2                       │
│                                                                              │
│  All good so far. But what if:                                              │
│                                                                              │
│  10:25 AM - You find 1 unit is defective → Actual stock: 1                  │
│  10:30 AM - Customer D pays → Order created, stock: 0                       │
│  10:35 AM - Customer E pays → ORDER CREATED, BUT NO STOCK! 😱               │
│                                                                              │
│  SOLUTIONS:                                                                  │
│  ──────────                                                                  │
│                                                                              │
│  1. REAL-TIME STOCK DEDUCTION                                               │
│     Deduct stock immediately when payment succeeds                          │
│     ✅ Most common approach                                                  │
│     ⚠️ Still doesn't prevent over-selling if stock is wrong                │
│                                                                              │
│  2. CART RESERVATION (Complex)                                              │
│     Reserve stock when added to cart (expires in 15 min)                    │
│     ✅ Prevents over-selling                                                 │
│     ❌ Complex to implement                                                  │
│     ❌ Can frustrate customers if stock "disappears"                        │
│                                                                              │
│  3. STOCK BUFFER                                                            │
│     Keep displayed stock = actual stock - buffer                            │
│     Example: If you have 10, show 8 available                               │
│     ✅ Simple                                                                │
│     ✅ Handles minor discrepancies                                          │
│                                                                              │
│  4. MANUAL STOCK SYNC (Current ShopPulse approach)                          │
│     Trust the seller to keep stock updated                                  │
│     ✅ Simplest                                                              │
│     ❌ Prone to errors                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stock Status Flow

```
STOCK TRANSITIONS DURING ORDER LIFECYCLE:
─────────────────────────────────────────

┌─────────────────┐     ORDER CREATED     ┌─────────────────┐
│  Available: 10  │ ───────────────────── │  Available: 9   │
│  Reserved: 0    │     (Deduct 1)        │  Reserved: 1    │
└─────────────────┘                       └─────────────────┘
                                                  │
                                                  │
              ┌───────────────────────────────────┴───────────────────────────────────┐
              │                                                                        │
              ▼                                                                        ▼
     ORDER SHIPPED                                                           ORDER CANCELLED
┌─────────────────┐                                                     ┌─────────────────┐
│  Available: 9   │                                                     │  Available: 10  │
│  Reserved: 0    │  (Reserved becomes "Sold")                          │  Reserved: 0    │
│  Sold: 1        │                                                     └─────────────────┘
└─────────────────┘                                                      (Stock restored)
         │
         │
         ▼
    ORDER RTO (Returned)
┌─────────────────┐
│  Available: 10  │
│  Reserved: 0    │  (Stock restored after RTO)
│  Sold: 0        │
└─────────────────┘
```

### Current ShopPulse Gap: No Automatic Stock Deduction

```
CURRENT STATE:
─────────────
• Stock exists as quantity field in Product/Size models
• NOT automatically deducted when order placed
• Seller must manually update stock

RECOMMENDATION:
──────────────
Implement automatic stock deduction:

1. When order status becomes PAID:
   - Find all OrderItems
   - Deduct quantity from Product/Size
   - If stock goes negative, flag for seller attention

2. When order is CANCELLED:
   - Restore stock to Product/Size

3. When order is RTO_DELIVERED:
   - Restore stock (return received)

4. Consider: Stock reservation for 15 minutes during checkout
```

---

## Order Processing Best Practices

### Time Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ORDER PROCESSING BEST PRACTICES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SPEED MATTERS: Customer Expectations by Platform                           │
│  ─────────────────────────────────────────────────                          │
│                                                                              │
│  Amazon/Flipkart Users: Ship within hours, deliver in 1-2 days              │
│  Small D2C Brands: Ship within 1-2 days, deliver in 3-5 days               │
│  Handmade/Custom: Up to a week acceptable if communicated                  │
│                                                                              │
│  RECOMMENDED TIMELINE:                                                       │
│  ────────────────────                                                        │
│                                                                              │
│  ┌──────────────┬────────────────────────────────────────────────────┐     │
│  │ Order Placed │ ─────────────────────────────────────────────────► │     │
│  │   (PAID)     │                                                     │     │
│  └──────────────┘                                                     │     │
│        │                                                              │     │
│        │ < 4 hours (ideally same day)                                │     │
│        ▼                                                              │     │
│  ┌──────────────┐                                                     │     │
│  │  Review &    │                                                     │     │
│  │  Accept      │                                                     │     │
│  │ (PROCESSING) │                                                     │     │
│  └──────────────┘                                                     │     │
│        │                                                              │     │
│        │ < 24 hours (same day for orders before 2 PM)                │     │
│        ▼                                                              │     │
│  ┌──────────────┐                                                     │     │
│  │  Pack &      │                                                     │     │
│  │  Ship        │                                                     │     │
│  │  (SHIPPED)   │                                                     │     │
│  └──────────────┘                                                     │     │
│        │                                                              │     │
│        │ Courier's timeline (2-7 days)                               │     │
│        ▼                                                              │     │
│  ┌──────────────┐                                                     │     │
│  │  DELIVERED   │ ◄─────────────────────────────────────────────────│     │
│  └──────────────┘                                                     │     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Processing Workflows by Order Volume

```
LOW VOLUME (< 10 orders/day):
─────────────────────────────
• Process orders as they come
• No batching needed
• Can handle individually

MEDIUM VOLUME (10-50 orders/day):
─────────────────────────────────
• Batch processing recommended
• Morning batch: Orders from evening/night
• Afternoon batch: Morning orders
• Schedule fixed pickup times with courier

HIGH VOLUME (50+ orders/day):
─────────────────────────────
• Dedicated fulfillment time blocks
• Multiple daily pickups
• Consider warehouse/fulfillment center
• Need inventory management system
• Maybe hire fulfillment staff
```

### Order Priority Rules

```
WHICH ORDERS TO PROCESS FIRST?
──────────────────────────────

Priority 1: 🔴 URGENT
• Express/premium shipping paid
• Order older than 24 hours
• Customer complained
• Previous delivery failed (replacement)

Priority 2: 🟡 NORMAL
• Standard prepaid orders
• Within SLA timeline

Priority 3: 🟢 FLEXIBLE
• Economy shipping
• Customer indicated flexible delivery
• Pre-orders (ship date specified)

Priority 4: ⚠️ REVIEW NEEDED
• First-time customer + high value
• Suspicious patterns flagged
• Incomplete address
• COD to remote pincode
```

---

## Communication Touchpoints

### Customer Communication Timeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              CUSTOMER COMMUNICATION TOUCHPOINTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TOUCHPOINT 1: ORDER CONFIRMATION (Immediately after payment)               │
│  ─────────────────────────────────────────────────────────────              │
│  Channel: Email + SMS                                                        │
│                                                                              │
│  Email Content:                                                              │
│  ├─ Order number                                                             │
│  ├─ Items ordered (with images)                                              │
│  ├─ Order total breakdown                                                    │
│  ├─ Shipping address                                                         │
│  ├─ Estimated delivery date                                                  │
│  ├─ Payment confirmation                                                     │
│  └─ Link to track order                                                      │
│                                                                              │
│  SMS: "Order #12345 confirmed! Amount: ₹1,498. Track: link.co/track"        │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  TOUCHPOINT 2: ORDER PROCESSING (When seller accepts)                       │
│  ─────────────────────────────────────────────────────                      │
│  Channel: Email (optional SMS)                                               │
│                                                                              │
│  "Good news! Your order is being prepared for shipping."                    │
│  └─ Estimated ship date                                                      │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  TOUCHPOINT 3: SHIPPED NOTIFICATION (When AWB generated)                    │
│  ───────────────────────────────────────────────────────                    │
│  Channel: Email + SMS + WhatsApp (if available)                             │
│                                                                              │
│  MUST INCLUDE:                                                               │
│  ├─ AWB/Tracking number                                                      │
│  ├─ Courier name                                                             │
│  ├─ Direct tracking link                                                     │
│  ├─ Expected delivery date                                                   │
│  └─ Support contact for issues                                               │
│                                                                              │
│  SMS: "Order #12345 shipped via Delhivery! Track: delhivery.com/track/123" │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  TOUCHPOINT 4: OUT FOR DELIVERY (From courier webhook)                      │
│  ──────────────────────────────────────────────────────                     │
│  Channel: SMS + WhatsApp                                                     │
│                                                                              │
│  "Your order is out for delivery today! Keep phone handy."                  │
│  └─ Delivery executive contact (if available)                                │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  TOUCHPOINT 5: DELIVERED CONFIRMATION                                        │
│  ────────────────────────────────────                                        │
│  Channel: Email + SMS                                                        │
│                                                                              │
│  "Your order has been delivered! 🎉"                                        │
│  ├─ Feedback request                                                         │
│  ├─ Return policy reminder                                                   │
│  └─ Support contact if issues                                                │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  TOUCHPOINT 6: DELIVERY FAILED (NDR)                                        │
│  ────────────────────────────────────                                        │
│  Channel: SMS + WhatsApp + Call (automated or manual)                        │
│                                                                              │
│  "Delivery attempted but unsuccessful. Reason: [Customer not available]"    │
│  ├─ Request reschedule                                                       │
│  ├─ Update address if needed                                                 │
│  └─ Contact details                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Communication Templates

```
EMAIL TEMPLATE: Order Shipped
─────────────────────────────

Subject: 🚚 Your order #{{order_id}} has been shipped!

Hi {{customer_name}},

Great news! Your order is on its way.

📦 SHIPMENT DETAILS
───────────────────
Order Number: {{order_id}}
Tracking Number: {{awb}}
Courier: {{courier_name}}

🔗 Track Your Order:
{{tracking_url}}

📅 Expected Delivery: {{expected_date}}

📍 SHIPPING TO:
{{shipping_address}}

📱 NEED HELP?
Reply to this email or contact us at {{support_email}}

Thank you for shopping with us!

───────────────────
{{store_name}}
{{store_url}}
```

---

## Dashboard Workflows

### Order Actions Available by Status

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              DASHBOARD ACTIONS BY ORDER STATUS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STATUS: PAID                                                               │
│  ─────────────                                                              │
│  Available Actions:                                                          │
│  ├─ [Accept Order] → Moves to PROCESSING                                    │
│  ├─ [Cancel Order] → Opens cancellation modal                               │
│  │   └─ Requires reason selection                                            │
│  │   └─ Initiates automatic refund                                           │
│  ├─ [Contact Customer] → Opens communication modal                          │
│  │   └─ Email / SMS / WhatsApp                                               │
│  └─ [View Details] → Full order information                                 │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  STATUS: PROCESSING                                                         │
│  ──────────────────                                                         │
│  Available Actions:                                                          │
│  ├─ [Create Shipment] → Opens shipping modal                                │
│  │   └─ Enter package dimensions                                             │
│  │   └─ Select courier                                                       │
│  │   └─ Generate AWB & label                                                 │
│  ├─ [Cancel Order] → Still possible at this stage                           │
│  ├─ [Contact Customer]                                                       │
│  └─ [Mark Ready to Ship] → For stores without Shiprocket                    │
│      └─ Manual AWB entry                                                     │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  STATUS: SHIPPED                                                            │
│  ───────────────                                                            │
│  Available Actions:                                                          │
│  ├─ [Track Shipment] → Opens tracking modal/page                            │
│  │   └─ Shows all tracking events                                            │
│  │   └─ Current location                                                     │
│  │   └─ Expected delivery                                                    │
│  ├─ [Download Label] → Reprint shipping label                               │
│  ├─ [Contact Customer]                                                       │
│  ├─ [Contact Courier] → For issues                                          │
│  └─ [Report Issue] → If stuck in transit                                    │
│                                                                              │
│  ⚠️ CANNOT cancel once shipped - must wait for delivery or RTO              │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  STATUS: DELIVERED                                                          │
│  ─────────────────                                                          │
│  Available Actions:                                                          │
│  ├─ [View POD] → Proof of delivery (signature/photo)                        │
│  ├─ [Initiate Return] → If customer requests                                │
│  ├─ [Process Refund] → Partial or full                                      │
│  ├─ [Request Review] → Send review request                                  │
│  └─ [View Analytics] → Order performance                                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  STATUS: CANCELLED                                                          │
│  ─────────────────                                                          │
│  Available Actions:                                                          │
│  ├─ [View Refund Status] → Track refund processing                          │
│  ├─ [Reorder] → Create new order for same items                             │
│  └─ [View Details] → Why was it cancelled                                   │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  STATUS: RTO_IN_TRANSIT / RTO_DELIVERED                                     │
│  ──────────────────────────────────────                                     │
│  Available Actions:                                                          │
│  ├─ [Track Return Shipment]                                                  │
│  ├─ [Contact Customer] → Try to resolve                                      │
│  ├─ [Process Refund] → Once RTO delivered                                   │
│  └─ [Add to Inventory] → Restore stock once received                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Bulk Actions for Efficiency

```
BULK ACTIONS (Select multiple orders):
──────────────────────────────────────

☑ Order #12345
☑ Order #12346
☑ Order #12347
☐ Order #12348

Selected: 3 orders

[Accept All]  [Create Shipments]  [Download Labels]  [Export]


WHEN TO USE BULK ACTIONS:
─────────────────────────
• Morning processing: Accept all overnight orders at once
• Batch shipping: Create multiple shipments together
• Label printing: Print all labels at once for batch pickup
• Export: Download orders for external processing/accounting
```

---

## Summary: Key Takeaways

### Order Flow Quick Reference

```
PAID → PROCESSING → SHIPPED → DELIVERED
  │         │          │          │
  │         │          │          └─ Order complete ✅
  │         │          │
  │         │          └─ AWB assigned, with courier
  │         │
  │         └─ Seller accepted, preparing
  │
  └─ Payment confirmed, awaiting seller action


EXCEPTION FLOWS:
PAID/PROCESSING → CANCELLED → REFUNDED
SHIPPED → RTO_IN_TRANSIT → RTO_DELIVERED → REFUNDED
```

### Seller's Mental Model

```
1. ORDER COMES IN → Check, verify, decide
2. ACCEPT → Commit to fulfilling
3. PACK → Physical work
4. SHIP → Hand to courier, status updated
5. MONITOR → Track until delivered
6. RESOLVE → Handle any issues
```

### Next Document

**Part 3B** covers:
- Packaging guidelines and best practices
- Label printing and formats
- Pickup scheduling
- Handover process
- Courier comparison for pickup

---

## Related Files

- Order Dashboard: `src/app/(dashboard)/[storeId]/(routes)/orders/`
- Order API: `src/app/api/[storeId]/order/`
- Checkout Flow: `src/app/api/[storeId]/checkout/`
- Schema: `prisma/schema.prisma` (Order, OrderStatus)
