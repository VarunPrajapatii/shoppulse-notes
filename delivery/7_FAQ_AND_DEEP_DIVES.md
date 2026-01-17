# Part 7: FAQ & Deep Dives

## Answers to Specific Questions

---

## Table of Contents

1. [ShopPulse-Managed Shipping (Reseller Model)](#1-shoppulse-managed-shipping)
2. [NDR Webhooks & RTO Tracking](#2-ndr-webhooks-and-rto-tracking)
3. [VPP (Value Payable Post)](#3-vpp-value-payable-post)
4. [Token Refresh via Cron Job](#4-token-refresh-cron-job)

---

## 1. ShopPulse-Managed Shipping

### What is the Reseller Model?

In the **Reseller Model**, ShopPulse (the platform) has a single master account with shipping aggregators (Shiprocket/Delhivery). All stores use ShopPulse's account to ship orders. Sellers don't need their own Shiprocket accounts.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              RESELLER MODEL ARCHITECTURE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                             │
│  │  Store A │     │  Store B │     │  Store C │                             │
│  └────┬─────┘     └────┬─────┘     └────┬─────┘                             │
│       │                │                │                                    │
│       └────────────────┼────────────────┘                                    │
│                        │                                                     │
│                        ▼                                                     │
│               ┌────────────────┐                                            │
│               │   SHOPPULSE    │  Single Master Account                     │
│               │  Platform API  │  with Shiprocket                           │
│               └────────┬───────┘                                            │
│                        │                                                     │
│                        ▼                                                     │
│               ┌────────────────┐                                            │
│               │   SHIPROCKET   │                                            │
│               │  Master Account│                                            │
│               └────────────────┘                                            │
│                                                                              │
│  MONEY FLOW:                                                                │
│  ───────────                                                                │
│  1. Store ships order → ShopPulse pays Shiprocket                          │
│  2. ShopPulse charges Store (markup included)                              │
│  3. COD collected → Goes to ShopPulse → Remitted to Store (minus fees)     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### PROS (In-Depth)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PRO #1: ZERO SETUP FOR SELLERS                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BYOK Model:                                                                │
│  • Seller must create Shiprocket account                                    │
│  • Seller must verify business (GST, PAN)                                   │
│  • Seller must set up bank account for COD                                  │
│  • Seller must configure pickup locations                                   │
│  • Time: 2-5 days to get started                                           │
│                                                                              │
│  Reseller Model:                                                            │
│  • Seller just enables "Shipping" in dashboard                             │
│  • Uses ShopPulse's pre-verified account                                   │
│  • Ready to ship in 5 minutes                                              │
│  • No technical knowledge required                                          │
│                                                                              │
│  IMPACT: Dramatically lower barrier to entry for new sellers               │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  PRO #2: VOLUME DISCOUNTS                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Individual Seller Rates (Low Volume):                                      │
│  • 500g within zone: ₹45-55                                                │
│  • COD charge: ₹50-60                                                      │
│                                                                              │
│  ShopPulse Aggregated Volume:                                               │
│  • 500g within zone: ₹30-40 (negotiated bulk rate)                         │
│  • COD charge: ₹35-45                                                      │
│                                                                              │
│  MATH:                                                                       │
│  If ShopPulse ships 10,000 orders/month across all sellers:                │
│  • Shiprocket gives enterprise rates                                        │
│  • ShopPulse charges sellers ₹40 (still cheaper than individual ₹50)       │
│  • ShopPulse profit: ₹5-10 per shipment                                    │
│                                                                              │
│  WIN-WIN: Sellers pay less, ShopPulse earns margin                         │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  PRO #3: UNIFIED EXPERIENCE                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  • Consistent UI across all stores                                         │
│  • Single support point (ShopPulse handles shipping issues)                │
│  • Standardized tracking pages                                              │
│  • Uniform shipping policies                                                │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  PRO #4: REVENUE STREAM FOR PLATFORM                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Revenue Sources:                                                            │
│  • Shipping markup (₹5-15 per order)                                       │
│  • COD handling fee (1-2% of order value)                                  │
│  • Insurance commission                                                     │
│  • Premium courier options (express delivery markup)                        │
│                                                                              │
│  Example:                                                                    │
│  10,000 orders/month × ₹10 markup = ₹1,00,000/month additional revenue     │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  PRO #5: BETTER ANALYTICS                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Platform sees ALL shipping data:                                           │
│  • Which couriers perform best in which regions                             │
│  • Overall RTO rates by area                                                │
│  • Delivery time benchmarks                                                 │
│  • Can recommend best courier automatically                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### CONS (In-Depth)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CON #1: MASSIVE OPERATIONAL COMPLEXITY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PICKUP MANAGEMENT:                                                         │
│  • Each seller has different pickup address                                 │
│  • Must manage 100s of pickup locations in one account                     │
│  • Coordinate pickup schedules across all locations                        │
│  • Handle pickup failures for each seller                                   │
│                                                                              │
│  SUPPORT BURDEN:                                                            │
│  • Every shipping issue comes to ShopPulse                                 │
│  • "Where's my package?" for ALL stores                                    │
│  • NDR handling for ALL stores                                             │
│  • RTO coordination for ALL stores                                         │
│                                                                              │
│  SCALE PROBLEM:                                                             │
│  100 stores × 10 issues/week = 1000 support tickets/week                   │
│  Need dedicated shipping support team                                       │
│                                                                              │
│  IMPLEMENTATION COMPLEXITY:                                                 │
│  • Multi-tenant pickup location management                                 │
│  • Routing webhooks to correct store                                        │
│  • Per-store reporting from single account                                  │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  CON #2: COD REMITTANCE NIGHTMARE                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  HOW COD WORKS IN RESELLER MODEL:                                           │
│                                                                              │
│  1. Customer pays ₹1000 to courier                                         │
│  2. Courier remits to ShopPulse's bank (master account)                    │
│  3. ShopPulse must track which ₹1000 belongs to which store                │
│  4. ShopPulse must remit to each seller's bank                             │
│                                                                              │
│  PROBLEMS:                                                                   │
│  • Accounting complexity (track every rupee)                               │
│  • Cash flow: ShopPulse receives COD in 7-10 days, must pay sellers        │
│  • Disputes: "I didn't receive my COD payment"                             │
│  • Reconciliation: Match Shiprocket remittance with orders                 │
│  • Multiple bank transfers daily to different sellers                      │
│                                                                              │
│  RISK:                                                                       │
│  If ShopPulse makes error, seller loses money → Trust destroyed            │
│  Need bulletproof accounting system                                         │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  CON #3: FINANCIAL RISK                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PREPAID FLOAT:                                                              │
│  • ShopPulse pays Shiprocket upfront for shipping                          │
│  • Must maintain wallet balance in Shiprocket                              │
│  • 1000 orders × ₹50 = ₹50,000 locked as float                            │
│                                                                              │
│  COD CYCLE:                                                                  │
│  • COD comes back in 7-10 days                                             │
│  • Sellers expect payment in 3-5 days                                      │
│  • ShopPulse must fund the gap                                             │
│                                                                              │
│  FRAUD RISK:                                                                │
│  • Seller ships empty boxes, collects COD, disappears                      │
│  • ShopPulse liable to customers                                           │
│  • Chargebacks and disputes                                                 │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  CON #4: LEGAL & COMPLIANCE                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GST COMPLICATIONS:                                                          │
│  • Who invoices shipping to customer? ShopPulse or Seller?                 │
│  • GST input credit flow                                                    │
│  • B2B vs B2C invoicing                                                     │
│                                                                              │
│  LIABILITY:                                                                  │
│  • Lost package → Who is liable? ShopPulse or Seller?                      │
│  • Damaged goods → Insurance claims go through ShopPulse                   │
│  • Customer complaints → ShopPulse is the "shipper" on record              │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  CON #5: SELLER LOCK-IN PERCEPTION                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  • Sellers can't see actual shipping costs                                 │
│  • Can't negotiate their own rates as they grow                            │
│  • Dependent on ShopPulse for all shipping                                 │
│  • If ShopPulse has issues, ALL sellers affected                           │
│  • Large sellers may feel restricted, want own accounts                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation Flow (If You Choose Reseller)

```
PHASE 1: INFRASTRUCTURE
────────────────────────
1. Create ShopPulse master Shiprocket account
2. Verify business (GST, PAN, Bank)
3. Load initial wallet balance (₹50,000+)
4. Set up webhook endpoint for master account
5. Build multi-tenant pickup location system

PHASE 2: SELLER ONBOARDING
──────────────────────────
1. Seller enables shipping in dashboard
2. Seller enters pickup address
3. ShopPulse creates pickup location in master account
4. Map internal storeId to Shiprocket pickup_location_id

PHASE 3: ORDER FLOW
───────────────────
1. Order placed → Create shipment under master account
2. Use seller's pickup_location_id
3. Store order metadata: { storeId, orderId } in Shiprocket order
4. Webhook received → Parse metadata → Route to correct store

PHASE 4: FINANCIALS
───────────────────
1. Deduct shipping cost from seller's ShopPulse wallet
2. OR add to monthly invoice
3. Track COD remittances per seller
4. Build reconciliation system
5. Automated seller payouts

ESTIMATED EFFORT: 3-6 months for robust implementation
```

### Recommendation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  VERDICT: START WITH BYOK, CONSIDER RESELLER LATER                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BYOK (Current Plan):                                                       │
│  • Ship fast (2-3 weeks implementation)                                    │
│  • Zero financial risk                                                      │
│  • Sellers own their shipping relationship                                  │
│  • Focus on core product                                                    │
│                                                                              │
│  Reseller (Future, if needed):                                              │
│  • Only if you have 100+ active stores                                     │
│  • Only if you can afford dedicated ops team                               │
│  • Only if you want shipping as revenue stream                             │
│  • Requires 3-6 months development                                          │
│  • Requires significant capital for float                                   │
│                                                                              │
│  HYBRID OPTION:                                                              │
│  • BYOK for established sellers (they manage their shipping)               │
│  • Reseller for new/small sellers (easy onboarding)                        │
│  • Let sellers graduate from Reseller → BYOK as they grow                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. NDR Webhooks and RTO Tracking

### What is NDR?

**NDR = Non-Delivery Report**

When a courier attempts delivery and fails, they generate an NDR explaining why.

```
DELIVERY ATTEMPT TIMELINE:
──────────────────────────

Day 1: First Attempt
      ↓ Failed (customer not home)
      ↓ NDR Generated → Webhook sent to ShopPulse
      
Day 2: Wait for action
      ↓ Seller/Customer can reschedule
      
Day 3: Second Attempt
      ↓ Failed (wrong address)
      ↓ NDR Generated → Webhook sent
      
Day 4: Third Attempt OR Auto-RTO
      ↓ If failed again → RTO initiated
      ↓ RTO Webhook sent
```

### NDR Webhook Implementation

```typescript
// When Shiprocket sends NDR webhook to /api/webhooks/shiprocket

interface NDRWebhookPayload {
  awb: string;
  current_status: string;
  current_status_id: number;  // 18 = NDR
  ndr_reason: string;         // "Customer not available"
  ndr_code: string;           // "NA", "WA", "CNR"
  attempt_number: number;     // 1, 2, or 3
  shipment_id: number;
  order_id: number;
}

async function handleNDRWebhook(payload: NDRWebhookPayload) {
  // 1. Find the order
  const order = await prisma.order.findFirst({
    where: { awbCode: payload.awb },
    include: { store: true }
  });
  
  if (!order) return;
  
  // 2. Create NDR Record
  const ndrRecord = await prisma.ndrRecord.create({
    data: {
      orderId: order.id,
      awbCode: payload.awb,
      reason: payload.ndr_reason,
      reasonCode: payload.ndr_code,
      attemptNumber: payload.attempt_number,
      status: 'PENDING'
    }
  });
  
  // 3. Update order status
  await prisma.order.update({
    where: { id: order.id },
    data: { orderStatus: 'NDR_REPORTED' }
  });
  
  // 4. ALERT SELLER IMMEDIATELY
  await alertSellerNDR(order, ndrRecord);
  
  // 5. ALERT CUSTOMER (optional - ask to reschedule)
  await alertCustomerNDR(order, ndrRecord);
}
```

### Alerting the Seller

```typescript
async function alertSellerNDR(order: Order, ndr: NdrRecord) {
  // 1. In-App Notification (Dashboard)
  await createNotification({
    storeId: order.storeId,
    type: 'NDR_ALERT',
    title: '⚠️ Delivery Failed',
    message: `Order ${order.orderNumber} - ${ndr.reason}`,
    data: {
      orderId: order.id,
      ndrId: ndr.id,
      attemptNumber: ndr.attemptNumber,
      action_required: true
    },
    priority: 'HIGH'
  });
  
  // 2. Email Alert
  await sendEmail({
    to: order.store.email,
    subject: `[Action Required] Delivery Failed - ${order.orderNumber}`,
    template: 'ndr-alert',
    data: {
      orderNumber: order.orderNumber,
      customerName: order.name,
      reason: ndr.reason,
      attemptNumber: ndr.attemptNumber,
      actionDeadline: '24 hours',
      dashboardLink: `${BASE_URL}/${order.storeId}/orders/${order.id}`
    }
  });
  
  // 3. SMS Alert (if enabled)
  if (order.store.smsAlertsEnabled) {
    await sendSMS({
      to: order.store.phone,
      message: `NDR Alert: Order ${order.orderNumber} delivery failed. Reason: ${ndr.reason}. Take action within 24hrs.`
    });
  }
  
  // 4. Push Notification (if mobile app)
  // await sendPushNotification(...)
}
```

### Seller Dashboard NDR View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📦 NDR Management                                              [Filter ▼]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ⚠️ 3 orders need attention                                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Order #ORD-12345                              Attempt: 2/3          │   │
│  │ Customer: Rahul Sharma                        ⏰ 18 hours left      │   │
│  │ Reason: Customer not available at address                          │   │
│  │                                                                      │   │
│  │ [📞 Call Customer]  [📅 Reschedule]  [🔙 Initiate RTO]             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Order #ORD-12346                              Attempt: 1/3          │   │
│  │ Customer: Priya Singh                         ⏰ 36 hours left      │   │
│  │ Reason: Wrong address                                               │   │
│  │                                                                      │   │
│  │ [📞 Call Customer]  [📝 Update Address]  [🔙 Initiate RTO]         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RTO Tracking Per Customer

Track customers who frequently cause RTO to identify potential fraud or problematic addresses:

```typescript
// Schema addition
model CustomerRisk {
  id            String   @id @default(uuid())
  phone         String   // Customer identifier
  email         String?
  storeId       String   // Per-store tracking
  
  // Order Stats
  totalOrders   Int      @default(0)
  deliveredOrders Int    @default(0)
  rtoOrders     Int      @default(0)
  ndrOrders     Int      @default(0)
  
  // Calculated
  rtoRate       Float    @default(0)  // rtoOrders / totalOrders
  
  // Risk Level
  riskLevel     RiskLevel @default(LOW)
  
  // Flags
  isFlagged     Boolean  @default(false)
  flagReason    String?
  
  lastOrderAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([phone, storeId])
  @@index([storeId, riskLevel])
}

enum RiskLevel {
  LOW      // < 10% RTO rate
  MEDIUM   // 10-25% RTO rate
  HIGH     // 25-50% RTO rate
  BLOCKED  // > 50% RTO rate or manually blocked
}
```

```typescript
// Update customer risk on every RTO
async function updateCustomerRisk(order: Order, event: 'delivered' | 'rto') {
  const existing = await prisma.customerRisk.findUnique({
    where: {
      phone_storeId: {
        phone: order.phone,
        storeId: order.storeId
      }
    }
  });
  
  if (existing) {
    const newStats = {
      totalOrders: existing.totalOrders,
      deliveredOrders: existing.deliveredOrders + (event === 'delivered' ? 1 : 0),
      rtoOrders: existing.rtoOrders + (event === 'rto' ? 1 : 0)
    };
    
    const rtoRate = newStats.rtoOrders / newStats.totalOrders;
    
    let riskLevel: RiskLevel = 'LOW';
    if (rtoRate > 0.5) riskLevel = 'BLOCKED';
    else if (rtoRate > 0.25) riskLevel = 'HIGH';
    else if (rtoRate > 0.1) riskLevel = 'MEDIUM';
    
    await prisma.customerRisk.update({
      where: { id: existing.id },
      data: {
        ...newStats,
        rtoRate,
        riskLevel,
        lastOrderAt: new Date()
      }
    });
    
    // Alert seller if high risk
    if (riskLevel === 'HIGH' || riskLevel === 'BLOCKED') {
      await alertSellerHighRiskCustomer(order, riskLevel, rtoRate);
    }
  }
}
```

### Seller View: Customer Risk Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  👥 Customer Risk Analysis                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Summary:                                                                    │
│  • 2 High-Risk Customers                                                    │
│  • 5 Medium-Risk Customers                                                  │
│  • Overall Store RTO Rate: 12%                                              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Phone         │ Orders │ RTOs │ RTO Rate │ Risk    │ Action            │ │
│  ├───────────────┼────────┼──────┼──────────┼─────────┼───────────────────┤ │
│  │ 98765xxxxx    │ 8      │ 4    │ 50%      │ 🔴 HIGH │ [Block] [View]    │ │
│  │ 91234xxxxx    │ 5      │ 2    │ 40%      │ 🔴 HIGH │ [Block] [View]    │ │
│  │ 99887xxxxx    │ 10     │ 2    │ 20%      │ 🟡 MED  │ [Flag]  [View]    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [Export Report]  [Set Auto-Block Rules]                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. VPP (Value Payable Post)

### What is VPP?

**VPP = Value Payable Post** - India Post's official COD equivalent.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              VPP (VALUE PAYABLE POST) EXPLAINED                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DEFINITION:                                                                │
│  ───────────                                                                │
│  A postal service where the recipient pays the value of the goods          │
│  (plus postage) to the postman upon delivery. The amount is then           │
│  remitted to the sender via Money Order.                                    │
│                                                                              │
│  HOW IT WORKS:                                                              │
│  ─────────────                                                              │
│                                                                              │
│  1. SENDER (Seller)                                                         │
│     └─► Packs goods                                                         │
│     └─► Fills VPP form with declared value                                 │
│     └─► Posts at post office                                               │
│     └─► Pays postage + VPP commission                                      │
│                                                                              │
│  2. INDIA POST                                                              │
│     └─► Transports parcel                                                   │
│     └─► Postman delivers to recipient                                       │
│     └─► Collects declared value + postage from recipient                   │
│                                                                              │
│  3. RECIPIENT (Customer)                                                    │
│     └─► Pays total amount to postman                                       │
│     └─► Receives goods                                                      │
│                                                                              │
│  4. REMITTANCE                                                              │
│     └─► India Post sends Money Order to sender                             │
│     └─► Sender receives payment (minus MO charges)                         │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  VPP vs PRIVATE COURIER COD:                                                │
│  ────────────────────────────                                               │
│                                                                              │
│  Feature          │ VPP (India Post)    │ COD (Delhivery, etc.)            │
│  ─────────────────│─────────────────────│────────────────────────────────  │
│  Coverage         │ Every pincode       │ Limited to serviceable areas     │
│  Remittance Time  │ 15-30 days (MO)     │ 7-10 days (bank transfer)        │
│  Max Value        │ ₹1,00,000           │ Usually ₹50,000                  │
│  Tracking         │ Basic               │ Real-time                         │
│  Speed            │ 5-15 days           │ 2-7 days                          │
│  Cost             │ Lower               │ Higher                            │
│  Reliability      │ Government-backed   │ Private                          │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  VPP CHARGES:                                                               │
│  ────────────                                                               │
│                                                                              │
│  1. Postage (based on weight and distance)                                 │
│  2. VPP Commission: 2% of declared value (min ₹25)                         │
│  3. Money Order charges for remittance: 1% (min ₹25)                       │
│                                                                              │
│  Example:                                                                    │
│  Product value: ₹1,000                                                      │
│  Postage: ₹50                                                               │
│  VPP Commission: ₹25 (2% = ₹20, but min ₹25)                              │
│  MO Charges: ₹25                                                            │
│  ───────────────────                                                        │
│  Total Cost to Seller: ₹100                                                │
│  Amount Received: ₹1,000 - ₹25 (MO) = ₹975                                │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  WHEN TO USE VPP:                                                           │
│  ────────────────                                                           │
│  ✓ Shipping to remote areas (no courier coverage)                          │
│  ✓ Customer doesn't trust private couriers                                 │
│  ✓ High-value items (insurance backed by govt)                             │
│  ✓ Not time-sensitive delivery                                             │
│                                                                              │
│  WHEN NOT TO USE VPP:                                                       │
│  ──────────────────                                                         │
│  ✗ Need fast delivery                                                       │
│  ✗ Need real-time tracking                                                  │
│  ✗ Can't wait 15-30 days for payment                                       │
│  ✗ High-volume shipping                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Token Refresh via Cron Job

### Current Approach vs Cron Approach

```
CURRENT APPROACH (On-Demand Refresh):
─────────────────────────────────────

API Request → Check token expiry → If expired, refresh → Make API call

Pros:
• Token refreshed only when needed
• No background jobs
• Simpler implementation

Cons:
• First request after expiry is slower
• If refresh fails, API call fails


CRON APPROACH (Proactive Refresh):
──────────────────────────────────

Cron job runs daily → Refresh all tokens expiring in 2 days → Store new tokens

Pros:
• Tokens always fresh
• No delay on API requests
• Can handle refresh failures gracefully (retry)

Cons:
• Need cron infrastructure
• Refreshes tokens that may not be used
• More database writes
```

### Implementation: Cron-Based Token Refresh

```typescript
// src/lib/cron/refresh-shiprocket-tokens.ts

import { prisma } from '@/lib/prisma';
import { decrypt, encrypt } from '@/lib/encryption';

const SHIPROCKET_AUTH_URL = 'https://apiv2.shiprocket.in/v1/external/auth/login';
const REFRESH_THRESHOLD_DAYS = 2; // Refresh if expiring within 2 days

export async function refreshShiprocketTokens() {
  console.log('[Cron] Starting Shiprocket token refresh...');
  
  // Find all Shiprocket integrations with tokens expiring soon
  const integrations = await prisma.storeIntegration.findMany({
    where: {
      type: 'SHIPPING',
      provider: 'shiprocket'
    }
  });
  
  const refreshThreshold = new Date();
  refreshThreshold.setDate(refreshThreshold.getDate() + REFRESH_THRESHOLD_DAYS);
  
  let refreshed = 0;
  let failed = 0;
  
  for (const integration of integrations) {
    try {
      const credentials = JSON.parse(decrypt(integration.credentials));
      
      // Check if token needs refresh
      const tokenExpiry = new Date(credentials.tokenExpiry);
      if (tokenExpiry > refreshThreshold) {
        // Token still valid, skip
        continue;
      }
      
      console.log(`[Cron] Refreshing token for store: ${integration.storeId}`);
      
      // Get new token
      const response = await fetch(SHIPROCKET_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        })
      });
      
      if (!response.ok) {
        throw new Error(`Auth failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Calculate new expiry (Shiprocket tokens valid for 10 days)
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 10);
      
      // Update credentials with new token
      const updatedCredentials = {
        ...credentials,
        token: data.token,
        tokenExpiry: newExpiry.toISOString()
      };
      
      await prisma.storeIntegration.update({
        where: { id: integration.id },
        data: {
          credentials: encrypt(JSON.stringify(updatedCredentials)),
          updatedAt: new Date()
        }
      });
      
      refreshed++;
      console.log(`[Cron] ✓ Token refreshed for store: ${integration.storeId}`);
      
    } catch (error) {
      failed++;
      console.error(`[Cron] ✗ Failed to refresh token for store: ${integration.storeId}`, error);
      
      // TODO: Alert admin about failed refresh
      // await alertAdmin('shiprocket_token_refresh_failed', integration.storeId);
    }
  }
  
  console.log(`[Cron] Token refresh complete. Refreshed: ${refreshed}, Failed: ${failed}`);
  
  return { refreshed, failed };
}
```

### Cron Job Setup (Vercel)

```typescript
// src/app/api/cron/refresh-tokens/route.ts

import { NextResponse } from 'next/server';
import { refreshShiprocketTokens } from '@/lib/cron/refresh-shiprocket-tokens';

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const result = await refreshShiprocketTokens();
  
  return NextResponse.json({
    success: true,
    ...result
  });
}
```

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/refresh-tokens",
      "schedule": "0 2 * * *"  // Run daily at 2 AM UTC
    }
  ]
}
```

### Hybrid Approach (Recommended)

Combine both: Cron for proactive refresh + On-demand as fallback:

```typescript
// src/lib/shiprocket.ts

export async function getShiprocketToken(storeId: string): Promise<string> {
  const integration = await prisma.storeIntegration.findFirst({
    where: {
      storeId,
      type: 'SHIPPING',
      provider: 'shiprocket'
    }
  });
  
  if (!integration) {
    throw new Error('Shiprocket not configured');
  }
  
  const credentials = JSON.parse(decrypt(integration.credentials));
  
  // Check if token is still valid (with 1-hour buffer)
  const tokenExpiry = new Date(credentials.tokenExpiry);
  const buffer = new Date();
  buffer.setHours(buffer.getHours() + 1);
  
  if (tokenExpiry > buffer && credentials.token) {
    // Token valid, return it
    return credentials.token;
  }
  
  // Token expired or expiring soon - refresh now
  // (Cron should have handled this, but this is fallback)
  console.log(`[Shiprocket] Token expired for store ${storeId}, refreshing...`);
  
  const newToken = await refreshToken(integration, credentials);
  return newToken;
}
```

---

## Summary

| Question | Key Takeaway |
|----------|--------------|
| Reseller Model | Complex, risky - start with BYOK |
| NDR Webhook | Implement handler, alert seller, track per customer |
| VPP | India Post's COD - slow but reaches everywhere |
| Token Cron | Yes, implement it - proactive + on-demand fallback |

---

## Next Documents

- **Part 8**: Shipment Creation Strategies (separate file)
- **Part 9**: Pickup Scheduling Options (separate file)
