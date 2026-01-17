# Part 5: Returns, RTO & Refunds

## 🔄 Reverse Logistics & Money Back

This document covers everything about getting products back from customers and processing refunds - the complete reverse logistics flow.

---

## Table of Contents

1. [Understanding Reverse Logistics](#understanding-reverse-logistics)
2. [Types of Returns](#types-of-returns)
3. [RTO (Return to Origin) Flow](#rto-flow)
4. [Customer-Initiated Returns](#customer-returns)
5. [Exchange vs Refund](#exchange-vs-refund)
6. [Refund Processing](#refund-processing)
7. [Stock Restoration](#stock-restoration)
8. [Return Policies](#return-policies)
9. [Fraud Prevention](#fraud-prevention)
10. [Implementation Guide](#implementation-guide)

---

## Understanding Reverse Logistics

### What is Reverse Logistics?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              REVERSE LOGISTICS EXPLAINED                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FORWARD LOGISTICS:                                                         │
│  ──────────────────                                                         │
│  Seller ────────► Customer                                                  │
│  Product moves from seller to buyer                                         │
│                                                                              │
│  REVERSE LOGISTICS:                                                         │
│  ──────────────────                                                         │
│  Seller ◄──────── Customer                                                  │
│  Product moves from buyer back to seller                                    │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  WHY PRODUCTS COME BACK:                                                    │
│  ───────────────────────                                                    │
│                                                                              │
│  1. FAILED DELIVERY (RTO)         │  Courier couldn't deliver              │
│     • Customer not available      │  Product returns automatically         │
│     • Wrong address               │  NOT customer's choice                 │
│     • Customer refused            │                                         │
│                                                                              │
│  2. CUSTOMER RETURN               │  Customer wants to send back           │
│     • Wrong size/color            │  Customer initiates return             │
│     • Product defective           │  Customer's choice                     │
│     • Changed mind                │                                         │
│     • Not as described            │                                         │
│                                                                              │
│  3. EXCHANGE                      │  Customer wants different variant      │
│     • Size exchange               │  May ship new before receiving old     │
│     • Color exchange              │  Or wait for return first              │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  THE FINANCIAL IMPACT:                                                      │
│  ─────────────────────                                                      │
│                                                                              │
│  Original Order: ₹1,000                                                     │
│                                                                              │
│  If RTO:                                                                    │
│  Forward shipping:   ₹50  (you paid)                                        │
│  Return shipping:    ₹50  (you pay again)                                   │
│  No revenue:         ₹0                                                     │
│  ─────────────────────────                                                  │
│  Net loss:           ₹100 + opportunity cost                                │
│                                                                              │
│  If Customer Return:                                                        │
│  Forward shipping:   ₹50  (you paid)                                        │
│  Return shipping:    ₹50  (you or customer pays - policy dependent)         │
│  Refund:            ₹1,000 (money back to customer)                         │
│  ─────────────────────────                                                  │
│  Net result: No profit, shipping loss, product back                         │
│                                                                              │
│  This is why reducing RTO and returns is CRITICAL for profitability        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Industry Return Rates

```
RETURN RATES BY CATEGORY (India E-commerce):
────────────────────────────────────────────

Category               │ Return Rate  │ RTO Rate  │ Total Back
───────────────────────│──────────────│───────────│────────────
Fashion/Apparel        │ 15-25%       │ 15-20%    │ 30-45%
Electronics            │ 5-10%        │ 8-12%     │ 13-22%
Home & Kitchen         │ 8-15%        │ 10-15%    │ 18-30%
Beauty/Personal Care   │ 3-8%         │ 5-10%     │ 8-18%
Books                  │ 2-5%         │ 5-8%      │ 7-13%
Jewelry                │ 10-20%       │ 15-25%    │ 25-45%

WHY FASHION HAS HIGHEST RETURNS:
• Size uncertainty (can't try before buying)
• Color looks different online
• Fabric feel unknown
• Fit issues

STRATEGIES TO REDUCE:
• Detailed size charts
• Multiple product photos
• Customer reviews with photos
• Accurate product descriptions
• Size recommendation tools
```

---

## Types of Returns

### Classification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              TYPES OF RETURNS                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TYPE 1: RTO (Return to Origin)                                             │
│  ──────────────────────────────                                             │
│                                                                              │
│  Trigger:    Delivery failure (not customer initiated)                      │
│  Reasons:                                                                    │
│    • Customer not available (multiple attempts)                             │
│    • Address incorrect/incomplete                                            │
│    • Customer refused delivery                                               │
│    • COD amount not ready                                                   │
│    • Premises closed                                                         │
│                                                                              │
│  Process:                                                                    │
│    Courier fails delivery → NDR generated → Auto RTO after attempts         │
│                                                                              │
│  Who pays return shipping: Seller (built into shipping cost usually)        │
│  Refund required: Yes (if prepaid), No action (if COD never collected)     │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  TYPE 2: CUSTOMER RETURN (Post-Delivery)                                    │
│  ───────────────────────────────────────                                    │
│                                                                              │
│  Trigger:    Customer requests return after receiving product               │
│  Reasons:                                                                    │
│    • Product defective/damaged                                              │
│    • Wrong product received                                                 │
│    • Size/color doesn't fit                                                 │
│    • Not as described                                                       │
│    • Changed mind (if policy allows)                                        │
│                                                                              │
│  Process:                                                                    │
│    Customer requests → Seller approves → Pickup scheduled → Refund          │
│                                                                              │
│  Who pays return shipping: Depends on reason and policy                     │
│    • Defective/wrong item → Seller pays                                     │
│    • Size issue/changed mind → Customer pays (usually)                      │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  TYPE 3: EXCHANGE                                                           │
│  ─────────────────                                                          │
│                                                                              │
│  Trigger:    Customer wants different variant (not refund)                  │
│  Common:     Size exchange, color exchange                                  │
│                                                                              │
│  Process Options:                                                            │
│    A. Ship new first, collect old (customer-friendly)                       │
│    B. Wait for old, then ship new (seller-safe)                             │
│    C. Exchange at doorstep (if same courier)                                │
│                                                                              │
│  Who pays shipping: Usually seller (to retain customer)                     │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  TYPE 4: REPLACEMENT                                                        │
│  ────────────────────                                                        │
│                                                                              │
│  Trigger:    Product defective, customer wants same item                    │
│  Difference: No variant change, just replacement                            │
│                                                                              │
│  Process:                                                                    │
│    Ship replacement → Pickup defective → Dispose/return to manufacturer     │
│                                                                              │
│  Who pays shipping: Seller (quality issue)                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## RTO Flow

### Complete RTO Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              RTO (RETURN TO ORIGIN) FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DELIVERY ATTEMPT CYCLE:                                                    │
│  ─────────────────────────                                                  │
│                                                                              │
│  ┌─────────────┐    Delivery    ┌─────────────┐                            │
│  │   SHIPPED   │───Attempt 1───►│    NDR      │                            │
│  └─────────────┘      Fail      └──────┬──────┘                            │
│                                        │                                    │
│                         ┌──────────────┴──────────────┐                    │
│                         │                             │                    │
│                    Action Taken                  No Action                 │
│                    (Reschedule)                  (24-48 hrs)               │
│                         │                             │                    │
│                         ▼                             │                    │
│                  ┌─────────────┐                      │                    │
│                  │  Attempt 2  │────Fail─────────────►│                    │
│                  └─────────────┘                      │                    │
│                         │                             │                    │
│                    Success?                           │                    │
│                    │     │                            │                    │
│              Yes ◄─┘     └─► No                       │                    │
│                │             │                        │                    │
│                ▼             ▼                        │                    │
│           DELIVERED     ┌─────────────┐               │                    │
│                         │  Attempt 3  │◄──────────────┘                    │
│                         └──────┬──────┘                                    │
│                                │                                            │
│                           Fail │                                            │
│                                ▼                                            │
│                        ┌──────────────┐                                    │
│                        │ RTO INITIATED │                                    │
│                        └──────┬───────┘                                    │
│                               │                                             │
│                               │ Return journey begins                       │
│                               │ (New AWB for return)                        │
│                               ▼                                             │
│                        ┌──────────────┐                                    │
│                        │RTO IN TRANSIT│                                    │
│                        └──────┬───────┘                                    │
│                               │                                             │
│                               │ 3-7 days (return shipping)                  │
│                               ▼                                             │
│                        ┌──────────────┐                                    │
│                        │RTO DELIVERED │                                    │
│                        └──────┬───────┘                                    │
│                               │                                             │
│                               │ Seller receives package                     │
│                               ▼                                             │
│                        ┌──────────────┐                                    │
│                        │   REFUNDED   │ (if prepaid order)                 │
│                        └──────────────┘                                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  TIMELINE:                                                                   │
│  ─────────                                                                   │
│  Day 0:     First delivery attempt fails                                    │
│  Day 1-2:   Reattempt window                                                │
│  Day 2-3:   Second attempt (if rescheduled)                                 │
│  Day 3-5:   Third attempt OR RTO initiated                                  │
│  Day 5-12:  RTO in transit (return journey)                                 │
│  Day 10-14: RTO delivered to seller                                         │
│  Day 14-21: Refund processed (if prepaid)                                   │
│                                                                              │
│  TOTAL: Up to 3 weeks from order to RTO resolution                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RTO Handling in ShopPulse

```typescript
// When RTO webhook received
async function handleRTOInitiated(order: Order, payload: any) {
  // 1. Update order status
  await prisma.order.update({
    where: { id: order.id },
    data: {
      orderStatus: 'RTO_IN_TRANSIT',
      rtoAwb: payload.rto_awb,
      rtoReason: payload.rto_reason,
      rtoInitiatedAt: new Date()
    }
  });
  
  // 2. Create RTO record for tracking
  await prisma.rtoRecord.create({
    data: {
      orderId: order.id,
      originalAwb: order.awbCode,
      rtoAwb: payload.rto_awb,
      reason: payload.rto_reason,
      status: 'IN_TRANSIT',
      expectedDelivery: payload.expected_rto_date
    }
  });
  
  // 3. Notify seller
  await sendNotification({
    type: 'RTO_INITIATED',
    sellerId: order.storeId,
    orderId: order.id,
    data: {
      orderNumber: order.orderNumber,
      reason: payload.rto_reason,
      customerName: order.name,
      orderAmount: order.total
    }
  });
}

// When RTO delivered to seller
async function handleRTODelivered(order: Order, payload: any) {
  // 1. Update order status
  await prisma.order.update({
    where: { id: order.id },
    data: {
      orderStatus: 'RTO_DELIVERED',
      rtoDeliveredAt: new Date()
    }
  });
  
  // 2. Update RTO record
  await prisma.rtoRecord.update({
    where: { orderId: order.id },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date()
    }
  });
  
  // 3. If prepaid order, prompt for refund
  if (order.paymentMethod === 'PREPAID' && order.isPaid) {
    await createRefundTask(order);
    
    await sendNotification({
      type: 'RTO_COMPLETE_REFUND_NEEDED',
      sellerId: order.storeId,
      data: {
        orderNumber: order.orderNumber,
        refundAmount: order.total,
        actionRequired: 'Process refund to customer'
      }
    });
  }
  
  // 4. Restore stock (if configured)
  if (order.store.autoRestoreStockOnRTO) {
    await restoreStock(order);
  }
}
```

---

## Customer Returns

### Return Request Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              CUSTOMER RETURN REQUEST FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CUSTOMER JOURNEY:                                                          │
│  ─────────────────                                                          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  My Orders                                                           │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  Order #ORD-12345                        Delivered: Jan 5, 2026     │   │
│  │  ┌────────┐  Blue T-Shirt (Size M) x 1                              │   │
│  │  │  IMG   │  ₹599                                                   │   │
│  │  └────────┘                                                          │   │
│  │                                                                      │   │
│  │  [Track Order]  [Return/Exchange]  [Need Help]                      │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                           │ Click Return                                    │
│                           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Return Request                                                      │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  Why are you returning?                                              │   │
│  │                                                                      │   │
│  │  ○ Wrong size                                                        │   │
│  │  ○ Product defective/damaged                                         │   │
│  │  ○ Wrong product received                                            │   │
│  │  ○ Not as described                                                  │   │
│  │  ○ Changed my mind                                                   │   │
│  │  ○ Other                                                             │   │
│  │                                                                      │   │
│  │  Additional comments: [_________________________________]            │   │
│  │                                                                      │   │
│  │  Upload images (optional): [Choose Files]                            │   │
│  │                                                                      │   │
│  │  [Submit Return Request]                                             │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                           │ Submit                                          │
│                           ▼                                                  │
│  SELLER DASHBOARD:                                                          │
│  ─────────────────                                                          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ⚠️ Return Request - Order #ORD-12345                               │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  Customer: Rahul Sharma                                              │   │
│  │  Reason: Wrong size                                                  │   │
│  │  Comment: "Size M is too small, need L"                              │   │
│  │                                                                      │   │
│  │  Product: Blue T-Shirt (Size M) - ₹599                              │   │
│  │  Delivered: Jan 5, 2026 (2 days ago)                                │   │
│  │                                                                      │   │
│  │  Return Policy: ✅ Within return window (7 days)                    │   │
│  │                                                                      │   │
│  │  [Approve Return]  [Offer Exchange]  [Reject with Reason]           │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                           │ Approve                                         │
│                           ▼                                                  │
│  RETURN PICKUP SCHEDULED:                                                   │
│  ─────────────────────────                                                  │
│                                                                              │
│  • Reverse pickup created in Shiprocket                                    │
│  • Customer notified with pickup date                                      │
│  • Return AWB generated                                                     │
│  • Customer prepares package                                                │
│                                                                              │
│                           │ Courier picks up                                │
│                           ▼                                                  │
│  RETURN IN TRANSIT:                                                         │
│  ──────────────────                                                         │
│                                                                              │
│  • Tracked like forward shipment                                           │
│  • Status updates to customer and seller                                   │
│                                                                              │
│                           │ Return delivered to seller                      │
│                           ▼                                                  │
│  QUALITY CHECK:                                                             │
│  ──────────────                                                             │
│                                                                              │
│  • Seller receives and inspects product                                    │
│  • Verify it matches return reason                                         │
│  • Check for damage/use                                                     │
│                                                                              │
│                           │ QC Passed                                       │
│                           ▼                                                  │
│  REFUND PROCESSED:                                                          │
│  ─────────────────                                                          │
│                                                                              │
│  • Money returned to customer                                              │
│  • Stock restored (if resellable)                                          │
│  • Order marked as REFUNDED                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Return Request Implementation

```typescript
// Create return request API
// POST /api/[storeId]/orders/[orderId]/return

export async function POST(req: Request, { params }) {
  const { orderId, storeId } = params;
  const body = await req.json();
  
  // 1. Validate order exists and is delivered
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { 
      store: true,
      orderItems: { include: { product: true } }
    }
  });
  
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  
  if (order.orderStatus !== 'DELIVERED') {
    return NextResponse.json({ 
      error: 'Can only return delivered orders' 
    }, { status: 400 });
  }
  
  // 2. Check return window
  const deliveredDate = order.deliveredAt || order.updatedAt;
  const daysSinceDelivery = Math.floor(
    (Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const returnWindow = order.store.returnWindowDays || 7;
  
  if (daysSinceDelivery > returnWindow) {
    return NextResponse.json({ 
      error: `Return window expired (${returnWindow} days)` 
    }, { status: 400 });
  }
  
  // 3. Create return request
  const returnRequest = await prisma.returnRequest.create({
    data: {
      orderId: order.id,
      storeId: order.storeId,
      reason: body.reason,
      comments: body.comments,
      images: body.images || [],
      status: 'PENDING_APPROVAL',
      requestedAt: new Date(),
      items: {
        create: body.items.map(item => ({
          orderItemId: item.orderItemId,
          quantity: item.quantity,
          reason: item.reason
        }))
      }
    }
  });
  
  // 4. Notify seller
  await sendNotification({
    type: 'RETURN_REQUEST',
    sellerId: order.storeId,
    data: {
      orderId: order.orderNumber,
      customerName: order.name,
      reason: body.reason,
      amount: order.total
    }
  });
  
  return NextResponse.json({
    success: true,
    returnRequestId: returnRequest.id,
    status: 'PENDING_APPROVAL'
  });
}
```

### Shiprocket Reverse Pickup

```typescript
// Create reverse pickup in Shiprocket
async function createReversePickup(
  storeId: string,
  orderId: string,
  returnRequest: ReturnRequest
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: { include: { product: true } } }
  });
  
  const token = await getShiprocketToken(storeId);
  
  // Create return order in Shiprocket
  const response = await fetch(
    'https://apiv2.shiprocket.in/v1/external/orders/create/return',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        order_id: `RETURN-${order.orderNumber}`,
        order_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        
        // Customer becomes pickup address
        pickup_customer_name: order.name,
        pickup_address: order.addressLine1,
        pickup_address_2: order.addressLine2 || '',
        pickup_city: order.city,
        pickup_state: order.state,
        pickup_pincode: order.pincode,
        pickup_phone: order.phone,
        
        // Seller becomes delivery address
        // (Using seller's pickup location)
        shipping_customer_name: order.store.name,
        // ... seller address from pickup location
        
        order_items: order.orderItems.map(item => ({
          name: item.product.name,
          sku: item.product.sku || item.productId,
          units: item.quantity,
          selling_price: String(item.price)
        })),
        
        payment_method: 'Prepaid',
        sub_total: order.total,
        
        length: 25,
        breadth: 20,
        height: 10,
        weight: 0.5
      })
    }
  );
  
  const result = await response.json();
  
  // Update return request with Shiprocket details
  await prisma.returnRequest.update({
    where: { id: returnRequest.id },
    data: {
      shiprocketOrderId: String(result.order_id),
      shiprocketShipmentId: String(result.shipment_id),
      status: 'PICKUP_SCHEDULED'
    }
  });
  
  return result;
}
```

---

## Exchange vs Refund

### Decision Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              EXCHANGE vs REFUND DECISION                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  RETURN REASON              │ OFFER EXCHANGE? │ OFFER REFUND? │ PREFERRED   │
│  ───────────────────────────│─────────────────│───────────────│─────────────│
│  Wrong size                 │ ✅ Yes          │ ✅ Yes        │ Exchange    │
│  Wrong color                │ ✅ Yes          │ ✅ Yes        │ Exchange    │
│  Product defective          │ ✅ Yes (replace)│ ✅ Yes        │ Customer's  │
│  Wrong product received     │ ✅ Yes          │ ✅ Yes        │ Exchange    │
│  Not as described           │ ❌ No           │ ✅ Yes        │ Refund      │
│  Changed mind               │ ✅ Yes          │ ✅ Yes        │ Exchange    │
│  Damaged in transit         │ ✅ Yes (replace)│ ✅ Yes        │ Replace     │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  WHY PREFER EXCHANGE:                                                       │
│  ────────────────────                                                       │
│  • Keep the sale (revenue retained)                                         │
│  • Customer satisfied (still gets product)                                  │
│  • Often cheaper than full refund                                           │
│  • Better customer relationship                                             │
│                                                                              │
│  EXCHANGE MODELS:                                                           │
│  ─────────────────                                                          │
│                                                                              │
│  MODEL A: INSTANT EXCHANGE                                                  │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │  1. Customer requests exchange (Size M → L)                        │     │
│  │  2. Seller ships Size L immediately                                │     │
│  │  3. Customer receives new, hands over old to same courier          │     │
│  │  4. One doorstep interaction                                       │     │
│  │                                                                     │     │
│  │  Pros: Best customer experience                                    │     │
│  │  Cons: Risk if customer doesn't return, courier coordination       │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  MODEL B: SHIP FIRST, PICKUP LATER                                         │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │  1. Customer requests exchange                                      │     │
│  │  2. Seller ships new variant                                       │     │
│  │  3. Separately, pickup scheduled for old item                       │     │
│  │  4. Two separate deliveries                                        │     │
│  │                                                                     │     │
│  │  Pros: Simpler logistics                                           │     │
│  │  Cons: Risk if customer never returns old                          │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  MODEL C: RETURN FIRST, THEN SHIP (SAFEST)                                 │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │  1. Customer requests exchange                                      │     │
│  │  2. Pickup scheduled for old item                                   │     │
│  │  3. Seller receives and verifies old item                          │     │
│  │  4. Only then ships new variant                                     │     │
│  │                                                                     │     │
│  │  Pros: No risk for seller                                          │     │
│  │  Cons: Customer waits longer, poor experience                      │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  RECOMMENDATION FOR SHOPPULSE:                                              │
│  ─────────────────────────────                                              │
│  Start with Model C (safest)                                                │
│  Graduate to Model B for trusted customers                                  │
│  Model A requires courier integration for doorstep exchange                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Refund Processing

### Refund Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              REFUND PROCESSING WORKFLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TRIGGER POINTS:                                                            │
│  ───────────────                                                            │
│  1. Order cancelled (before shipping)                                       │
│  2. RTO completed (prepaid orders)                                          │
│  3. Customer return approved and received                                   │
│  4. Seller-initiated refund (goodwill)                                      │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  REFUND METHODS (Based on Original Payment):                                │
│  ───────────────────────────────────────────                                │
│                                                                              │
│  ORIGINAL: Razorpay (UPI/Card/NetBanking)                                  │
│  REFUND TO: Same payment method (Razorpay handles this)                    │
│                                                                              │
│  ORIGINAL: COD                                                              │
│  REFUND TO: Bank transfer (IMPS/NEFT) - need customer bank details         │
│             OR UPI transfer                                                  │
│             OR Store credit (if accepted)                                   │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  RAZORPAY REFUND FLOW:                                                      │
│  ─────────────────────                                                      │
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │ Refund Trigger  │                                                        │
│  │ (RTO/Return/    │                                                        │
│  │  Cancellation)  │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Seller Reviews  │  Verify reason, check product returned                │
│  │ in Dashboard    │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Click "Process  │                                                        │
│  │ Refund"         │  Enter amount (full or partial)                       │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ API Call to     │  POST /refunds                                        │
│  │ Razorpay        │  { payment_id, amount, notes }                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Razorpay        │  Refund ID generated                                  │
│  │ Processes       │  Status: "pending" initially                          │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Update Order    │  Status: REFUNDED                                     │
│  │ in ShopPulse    │  RefundId, RefundAmount stored                       │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Webhook from    │  Razorpay confirms refund processed                   │
│  │ Razorpay        │  5-7 business days for customer                       │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Notify Customer │  "Your refund of ₹X has been processed"              │
│  └─────────────────┘                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Razorpay Refund API

```typescript
// Process refund via Razorpay
async function processRefund(
  storeId: string,
  orderId: string,
  amount?: number,  // Partial refund if specified
  reason?: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });
  
  if (!order.razorpayPaymentId) {
    throw new Error('No payment ID found for refund');
  }
  
  // Get Razorpay credentials from store integration
  const razorpay = await getRazorpayInstance(storeId);
  
  const refundAmount = amount || order.total; // Full refund if not specified
  
  // Create refund via Razorpay
  const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
    amount: Math.round(refundAmount * 100), // Razorpay expects paisa
    speed: 'normal', // or 'optimum' for faster
    notes: {
      order_id: order.orderNumber,
      reason: reason || 'Customer refund',
      store_id: storeId
    }
  });
  
  // Update order with refund details
  await prisma.order.update({
    where: { id: orderId },
    data: {
      orderStatus: 'REFUNDED',
      refundId: refund.id,
      refundAmount: refundAmount,
      refundedAt: new Date(),
      refundReason: reason
    }
  });
  
  // Notify customer
  await sendNotification({
    type: 'REFUND_PROCESSED',
    email: order.email,
    phone: order.phone,
    data: {
      orderNumber: order.orderNumber,
      refundAmount: refundAmount,
      expectedDays: '5-7 business days'
    }
  });
  
  return refund;
}
```

### Refund Types

```
FULL REFUND:
────────────
Amount: Entire order value
When: 
• Complete order cancellation
• RTO on single-item order
• Customer return of all items
• Major quality issue

PARTIAL REFUND:
───────────────
Amount: Part of order value
When:
• Only some items returned (multi-item order)
• Minor issue compensation
• Shipping cost refund (seller error)
• Goodwill gesture

REFUND + SHIPPING:
──────────────────
When seller is at fault:
• Product defective → Refund product + shipping paid by customer
• Wrong product sent → Full refund including shipping

DEDUCTED REFUND:
────────────────
When customer is at fault:
• Changed mind return → Refund minus return shipping cost
• Product used/damaged → Refund minus depreciation
```

---

## Stock Restoration

### When to Restore Stock

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              STOCK RESTORATION LOGIC                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCENARIO                    │ RESTORE STOCK? │ NOTES                       │
│  ────────────────────────────│────────────────│─────────────────────────────│
│  Order cancelled (before     │ ✅ Yes         │ Automatic, product never    │
│  shipping)                   │                │ left inventory              │
│                              │                │                             │
│  RTO - Unused condition      │ ✅ Yes         │ After seller verifies       │
│                              │                │ product is resellable       │
│                              │                │                             │
│  RTO - Packaging damaged     │ ⚠️ Maybe      │ Check if product inside     │
│                              │                │ is fine                      │
│                              │                │                             │
│  Customer return - Unopened  │ ✅ Yes         │ Product resellable          │
│                              │                │                             │
│  Customer return - Used      │ ⚠️ Depends    │ Fashion: Usually no         │
│                              │                │ Electronics: Check working   │
│                              │                │                             │
│  Customer return - Defective │ ❌ No          │ Return to supplier or       │
│                              │                │ dispose                      │
│                              │                │                             │
│  Exchange                    │ ⚠️ After QC   │ Original item after check   │
│                              │                │                             │
│  Lost in transit             │ ❌ No          │ Insurance claim instead     │
│                              │                │                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  QUALITY CHECK (QC) PROCESS:                                                │
│  ────────────────────────────                                               │
│                                                                              │
│  When return arrives:                                                        │
│  1. Check packaging intact?                                                 │
│  2. Check product unused? (tags on, not washed for clothes)                 │
│  3. Check no damage?                                                        │
│  4. Check all accessories present?                                          │
│                                                                              │
│  QC Result:                                                                  │
│  • PASS → Restore to sellable stock                                        │
│  • FAIL (Minor) → Restore to "B-grade" stock (sell discounted)            │
│  • FAIL (Major) → Write off / Return to supplier                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stock Restoration Implementation

```typescript
async function restoreStock(
  orderId: string,
  qcResult: 'PASS' | 'FAIL_MINOR' | 'FAIL_MAJOR'
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true }
  });
  
  if (qcResult === 'FAIL_MAJOR') {
    // Don't restore stock, just log
    await prisma.stockAdjustment.create({
      data: {
        orderId,
        type: 'WRITE_OFF',
        reason: 'Failed QC - not resellable',
        items: order.orderItems.map(i => ({
          productId: i.productId,
          sizeId: i.sizeId,
          quantity: i.quantity
        }))
      }
    });
    return;
  }
  
  // Restore stock for PASS or FAIL_MINOR
  for (const item of order.orderItems) {
    if (item.sizeId) {
      // Size-variant product
      await prisma.size.update({
        where: { id: item.sizeId },
        data: {
          quantity: {
            increment: item.quantity
          }
        }
      });
    } else {
      // Simple product
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            increment: item.quantity
          }
        }
      });
    }
  }
  
  // Log the adjustment
  await prisma.stockAdjustment.create({
    data: {
      orderId,
      type: 'RETURN_RESTORE',
      reason: qcResult === 'PASS' ? 'QC passed' : 'B-grade stock',
      items: order.orderItems.map(i => ({
        productId: i.productId,
        sizeId: i.sizeId,
        quantity: i.quantity
      }))
    }
  });
}
```

---

## Return Policies

### Defining Return Policy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              RETURN POLICY CONFIGURATION                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  KEY POLICY ELEMENTS:                                                       │
│  ────────────────────                                                        │
│                                                                              │
│  1. RETURN WINDOW                                                           │
│     How many days after delivery can customer request return?               │
│     Common: 7 days, 15 days, 30 days                                        │
│     Recommendation: 7 days for fashion, 15 days for electronics            │
│                                                                              │
│  2. VALID RETURN REASONS                                                    │
│     Which reasons qualify for return?                                       │
│     Always allow: Defective, wrong item, damaged                           │
│     Optional: Changed mind, size issue                                      │
│                                                                              │
│  3. RETURN SHIPPING COST                                                    │
│     Who pays for return shipping?                                           │
│     • Seller pays: Better customer experience, higher cost                  │
│     • Customer pays: Lower returns, worse experience                        │
│     • Split by reason: Seller for defects, customer for change of mind     │
│                                                                              │
│  4. REFUND TIMELINE                                                         │
│     When is refund processed?                                               │
│     • Immediate on approval (risky)                                         │
│     • After pickup initiated (medium)                                       │
│     • After product received (safest)                                       │
│                                                                              │
│  5. CONDITION REQUIREMENTS                                                  │
│     What condition must product be in?                                      │
│     • Unused, tags attached                                                 │
│     • Original packaging                                                    │
│     • All accessories included                                              │
│                                                                              │
│  6. NON-RETURNABLE ITEMS                                                    │
│     What can't be returned?                                                 │
│     • Intimate wear                                                          │
│     • Customized items                                                      │
│     • Perishables                                                            │
│     • Sale items (optional)                                                 │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  POLICY TEMPLATES:                                                          │
│  ─────────────────                                                          │
│                                                                              │
│  CUSTOMER-FRIENDLY:                                                         │
│  • 30-day return window                                                     │
│  • Free returns (seller pays)                                               │
│  • All reasons accepted                                                     │
│  • Refund on pickup initiation                                              │
│  → Best for: Building trust, premium brands                                 │
│  → Risk: Higher return rate, abuse potential                                │
│                                                                              │
│  BALANCED:                                                                  │
│  • 15-day return window                                                     │
│  • Free for defects, customer pays for other                               │
│  • Most reasons accepted                                                    │
│  • Refund after product received                                           │
│  → Best for: Most e-commerce stores                                        │
│  → Risk: Moderate                                                           │
│                                                                              │
│  STRICT:                                                                    │
│  • 7-day return window                                                      │
│  • Customer pays return shipping                                            │
│  • Only defects/wrong items                                                 │
│  • Refund after QC pass                                                     │
│  → Best for: Low-margin products, fraud-prone categories                   │
│  → Risk: Customer dissatisfaction                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Policy Implementation in Schema

```prisma
model Store {
  // ... existing fields
  
  // Return Policy Settings
  returnWindowDays      Int      @default(7)
  allowChangeMindReturn Boolean  @default(true)
  returnShippingPaidBy  ReturnShippingPayer @default(CUSTOMER_FOR_CHANGE_SELLER_FOR_DEFECT)
  refundTiming          RefundTiming @default(AFTER_PRODUCT_RECEIVED)
  requireOriginalPackaging Boolean @default(true)
  requireTagsAttached   Boolean @default(true)
  
  // Non-returnable categories
  nonReturnableCategories Category[]
}

enum ReturnShippingPayer {
  SELLER
  CUSTOMER
  CUSTOMER_FOR_CHANGE_SELLER_FOR_DEFECT
}

enum RefundTiming {
  ON_APPROVAL
  ON_PICKUP_INITIATED
  AFTER_PRODUCT_RECEIVED
}
```

---

## Fraud Prevention

### Return Fraud Types

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              RETURN FRAUD PREVENTION                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  COMMON FRAUD TYPES:                                                        │
│  ───────────────────                                                        │
│                                                                              │
│  1. WARDROBING                                                              │
│     Buy, wear once (event), return                                          │
│     Signs: Tags removed but reattached, worn look                           │
│     Prevention: Require tags attached, inspect for use                      │
│                                                                              │
│  2. EMPTY BOX FRAUD                                                         │
│     Return empty/wrong item, claim refund                                   │
│     Signs: Weight mismatch, suspicious behavior                             │
│     Prevention: Video opening, weight verification                          │
│                                                                              │
│  3. PRICE ARBITRAGE                                                         │
│     Buy on sale, return after sale ends at full price                       │
│     Signs: Returns timed with price changes                                 │
│     Prevention: Refund at purchase price, track patterns                    │
│                                                                              │
│  4. RECEIPT FRAUD                                                           │
│     Use someone else's order to return stolen item                          │
│     Prevention: Verify AWB, require original packaging                      │
│                                                                              │
│  5. SERIAL RETURNER                                                         │
│     Customer who returns >50% of orders                                     │
│     Prevention: Track return rate, flag accounts                            │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  PREVENTION MEASURES:                                                       │
│  ────────────────────                                                       │
│                                                                              │
│  ☐ Track return rate per customer                                           │
│    Flag if > 30% return rate                                                │
│                                                                              │
│  ☐ Require photos with return request                                       │
│    Helps verify product condition                                           │
│                                                                              │
│  ☐ QC on all returns before refund                                         │
│    Never auto-refund without inspection                                     │
│                                                                              │
│  ☐ Video unboxing of returns                                                │
│    Proof if dispute arises                                                  │
│                                                                              │
│  ☐ Limit returns for high-risk customers                                   │
│    No free returns, shorter window                                          │
│                                                                              │
│  ☐ Blacklist fraud accounts                                                 │
│    Block ordering for confirmed fraudsters                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Guide

### Database Schema Additions

```prisma
// Add to schema.prisma

model ReturnRequest {
  id              String   @id @default(uuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id])
  storeId         String
  store           Store    @relation(fields: [storeId], references: [id])
  
  // Request details
  reason          ReturnReason
  comments        String?
  images          String[] // URLs of uploaded images
  
  // Status tracking
  status          ReturnStatus @default(PENDING_APPROVAL)
  requestedAt     DateTime
  approvedAt      DateTime?
  rejectedAt      DateTime?
  rejectedReason  String?
  
  // Shiprocket integration
  shiprocketOrderId    String?
  shiprocketShipmentId String?
  returnAwb            String?
  
  // Pickup tracking
  pickupScheduledAt    DateTime?
  pickedUpAt           DateTime?
  receivedAt           DateTime?
  
  // QC
  qcStatus        QCStatus?
  qcNotes         String?
  
  // Resolution
  resolution      ReturnResolution?
  refundAmount    Decimal?
  exchangeOrderId String?
  
  items           ReturnRequestItem[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ReturnRequestItem {
  id              String   @id @default(uuid())
  returnRequestId String
  returnRequest   ReturnRequest @relation(fields: [returnRequestId], references: [id])
  orderItemId     String
  orderItem       OrderItem @relation(fields: [orderItemId], references: [id])
  quantity        Int
  reason          String?
}

model RtoRecord {
  id              String   @id @default(uuid())
  orderId         String   @unique
  order           Order    @relation(fields: [orderId], references: [id])
  
  originalAwb     String
  rtoAwb          String?
  reason          String
  
  status          RtoStatus @default(INITIATED)
  
  initiatedAt     DateTime
  deliveredAt     DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum ReturnReason {
  WRONG_SIZE
  DEFECTIVE
  WRONG_PRODUCT
  NOT_AS_DESCRIBED
  CHANGED_MIND
  DAMAGED_IN_TRANSIT
  OTHER
}

enum ReturnStatus {
  PENDING_APPROVAL
  APPROVED
  REJECTED
  PICKUP_SCHEDULED
  PICKUP_COMPLETED
  IN_TRANSIT
  RECEIVED
  QC_IN_PROGRESS
  QC_PASSED
  QC_FAILED
  REFUND_PROCESSED
  EXCHANGE_SHIPPED
  COMPLETED
  CANCELLED
}

enum QCStatus {
  PENDING
  PASSED
  FAILED_MINOR
  FAILED_MAJOR
}

enum ReturnResolution {
  FULL_REFUND
  PARTIAL_REFUND
  EXCHANGE
  REPLACEMENT
  STORE_CREDIT
  REJECTED
}

enum RtoStatus {
  INITIATED
  IN_TRANSIT
  DELIVERED
  PROCESSED
}
```

### Key API Routes

```
RETURN APIS:
────────────

POST /api/[storeId]/orders/[orderId]/return
  → Customer creates return request

GET /api/[storeId]/returns
  → List all return requests for store

GET /api/[storeId]/returns/[returnId]
  → Get return request details

PATCH /api/[storeId]/returns/[returnId]/approve
  → Seller approves return

PATCH /api/[storeId]/returns/[returnId]/reject
  → Seller rejects return

POST /api/[storeId]/returns/[returnId]/pickup
  → Schedule reverse pickup

PATCH /api/[storeId]/returns/[returnId]/qc
  → Update QC result

POST /api/[storeId]/returns/[returnId]/refund
  → Process refund


REFUND APIS:
────────────

POST /api/[storeId]/orders/[orderId]/refund
  → Process refund for order

GET /api/[storeId]/refunds
  → List all refunds

GET /api/[storeId]/refunds/[refundId]/status
  → Check refund status from Razorpay
```

---

## Summary

### Return Flow Quick Reference

```
CUSTOMER RETURN:
Request → Approve → Pickup → Receive → QC → Refund/Exchange

RTO:
NDR → Attempts → RTO Initiated → In Transit → Delivered → Refund (if prepaid)
```

### Key Metrics to Track

```
1. RTO Rate        = RTO Orders / Total Shipped Orders
   Target: < 10%

2. Customer Return Rate = Returns / Delivered Orders
   Target: < 15% (varies by category)

3. Return Processing Time = Avg days from request to refund
   Target: < 7 days

4. QC Pass Rate    = QC Passed / Total Returns Received
   Target: > 90%

5. Refund Success Rate = Successful Refunds / Refund Attempts
   Target: > 99%
```

---

## Next Document

**Part 6** covers:
- Gap Analysis: What's missing in ShopPulse
- Complete Schema Changes
- Implementation Roadmap
- Checklist for building delivery system

---

## References

- [Razorpay Refunds API](https://razorpay.com/docs/api/refunds/)
- [Shiprocket Returns](https://apidocs.shiprocket.in/#returns)
- [E-commerce Return Best Practices](https://www.shopify.com/blog/return-policy)
