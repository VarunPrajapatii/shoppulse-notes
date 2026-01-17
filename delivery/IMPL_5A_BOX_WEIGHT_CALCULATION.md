# Part 5A: Shipment Creation - Box & Weight Calculation

## The Core Problem

**How to automatically determine package dimensions and weight when:**
- Order has multiple items (3 t-shirts + 1 jeans)
- Items have different sizes (S, M, L, XL)
- Quantities vary (2 × Medium, 3 × Large)

## Critical Prerequisite: Product Weight Data

**⚠️ IMPORTANT: For accurate shipping automation, product weight is MANDATORY.**

### Why Weight Data is Required

**Problem with Generic Estimation:**
```
❌ BAD: Assume all items weigh 0.3kg (avgItemWeight fallback)

Store sells:
- Face cream (100gm = 0.1kg)
- Body lotion (500gm = 0.5kg)
- Honey jar (1kg)
- Honey bulk pack (5kg)

If we use avgItemWeight=0.3kg:
- Order: 2× Honey bulk pack (5kg each)
- Estimated: 2 × 0.3 = 0.6kg
- Actual: 10kg
- Result: WRONG BOX SELECTED, COURIER REJECTS SHIPMENT
```

**✓ CORRECT: Use actual product weight**
```
Product table has weight field (REQUIRED when shipping enabled)

Order: 2× Honey bulk pack (5kg each)
Calculated: 2 × 5 = 10kg
Check threshold: 10kg > 5kg (largest box) → Flag for manual review ✓
```

### Product Weight Requirements

**Schema:**
```prisma
model Product {
  id          String   @id @default(cuid())
  // ... other fields
  
  // SHIPPING DATA (Required when store.shippingEnabled = true)
  weight      Decimal  @db.Decimal(8, 3)  // KG - MANDATORY
  
  // Dimensions: Optional (boxes handle packaging size)
  length      Decimal? @db.Decimal(8, 2)  // CM
  breadth     Decimal? @db.Decimal(8, 2)
  height      Decimal? @db.Decimal(8, 2)
}
```

**Form Validation:**
```typescript
// src/app/dashboard/products/new/page.tsx

const productSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  
  // Conditional: Required if store has shipping enabled
  weight: store.shippingEnabled 
    ? z.number().min(0.001, "Weight must be at least 1 gram").max(100)
    : z.number().optional(),
  
  // Always optional - preset boxes handle packaging
  dimensions: z.object({
    length: z.number().positive(),
    breadth: z.number().positive(),
    height: z.number().positive()
  }).optional()
});
```

**UI Guidance:**
```
┌─────────────────────────────────────────────────────────────┐
│ Add Product                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Product Weight (Required for shipping) *                    │
│ ┌─────────────┐  ┌──────┐                                  │
│ │   0.250     │  │  kg  │  ℹ️ Used for accurate shipping   │
│ └─────────────┘  └──────┘                                  │
│                                                              │
│ 💡 Quick Guide:                                             │
│    • Face cream: ~0.1 kg                                    │
│    • Honey jar (500gm): 0.5 kg                              │
│    • T-shirt: ~0.2 kg                                       │
│    • Jeans: ~0.4 kg                                         │
│    • Bulk items: Weigh and enter exact weight               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Approach 1: Preset Box System (RECOMMENDED FOR MVP)

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRESET BOX SYSTEM                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SELLER CONFIGURES PRESET BOXES:                                            │
│  ────────────────────────────────                                           │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ 📦 Small        │  │ 📦 Medium       │  │ 📦 Large        │             │
│  │                 │  │                 │  │                 │             │
│  │ 20×15×10 cm     │  │ 30×25×15 cm     │  │ 40×30×20 cm     │             │
│  │ Max: 0.5 kg     │  │ Max: 2 kg       │  │ Max: 5 kg       │             │
│  │ Max items: 2    │  │ Max items: 5    │  │ Max items: 10   │             │
│  │                 │  │                 │  │                 │             │
│  │ Use for:        │  │ Use for:        │  │ Use for:        │             │
│  │ 1-2 tshirts     │  │ 3-5 items       │  │ Bulk orders     │             │
│  │ Accessories     │  │ Mixed order     │  │ Heavy items     │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
│  SELECTION ALGORITHM:                                                       │
│  ─────────────────────                                                      │
│                                                                              │
│  Order comes in: 3 × T-shirt (M), 1 × Jeans (32)                           │
│  Total items: 4                                                             │
│  Estimated weight: 0.8 kg (0.2 × 3 + 0.4 × 1)                              │
│                                                                              │
│  Algorithm checks:                                                          │
│  ✗ Small: Max 2 items (order has 4) → Skip                                 │
│  ✓ Medium: Max 5 items, Max 2kg → SELECTED                                 │
│  - Large: Would work but oversized → Skip                                  │
│                                                                              │
│  Result: Medium box (30×25×15 cm, est 0.8 kg)                              │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  EDGE CASE: Order Exceeds All Presets                                      │
│  ─────────────────────────────────────────────                             │
│                                                                              │
│  Order: 15 items, estimated 8 kg                                           │
│  Largest preset (Large): Max 10 items, Max 5kg                             │
│                                                                              │
│  Result: SKIP AUTO-SHIP, FLAG FOR MANUAL INTERVENTION                      │
│                                                                              │
│  ⚠️ Order requires manual review:                                           │
│    • May need multiple boxes                                               │
│    • May need special packaging                                            │
│    • Seller must handle manually                                           │
│                                                                              │
│  This covers the 10% of orders that need attention                         │
│  90% of orders (S, M, L boxes) ship automatically                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Model

```prisma
model PackagePreset {
  id          String   @id @default(uuid())
  storeId     String
  store       Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  name        String   // "Small", "Medium", "T-Shirt Box"
  
  // Dimensions
  length      Decimal  @db.Decimal(8, 2)  // CM
  breadth     Decimal  @db.Decimal(8, 2)
  height      Decimal  @db.Decimal(8, 2)
  
  // Capacity
  maxWeight   Decimal  @db.Decimal(8, 3)  // KG
  maxItems    Int      @default(10)       // Max products it can hold
  
  // Auto-selection priority (lower = preferred)
  priority    Int      @default(0)
  
  // Is this the default/fallback box?
  isDefault   Boolean  @default(false)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([storeId])
  @@index([storeId, maxItems])
}
```

### Selection Algorithm (WITH MANUAL INTERVENTION)

```typescript
// src/lib/shipping/utils/box-calculator.ts

interface OrderSummary {
  totalItems: number;        // Sum of all quantities
  totalProducts: number;     // Unique products
  totalWeight: number;       // Calculated from actual product weights (REQUIRED)
}

interface BoxSelection {
  preset?: PackagePreset;
  estimatedWeight: number;
  confidence: 'high' | 'medium' | 'low';
  needsManualReview: boolean;
  reason?: string;
}

async function selectBox(storeId: string, order: Order): Promise<BoxSelection> {
  // Step 1: Calculate order summary with ACTUAL product weights
  const summary = calculateOrderSummary(order);
  
  // Step 2: Get presets sorted by priority
  const presets = await prisma.packagePreset.findMany({
    where: { storeId },
    orderBy: [{ priority: 'asc' }, { maxItems: 'asc' }]
  });
  
  if (presets.length === 0) {
    return {
      estimatedWeight: 0,
      confidence: 'low',
      needsManualReview: true,
      reason: 'No package presets configured'
    };
  }
  
  // Step 3: Find the largest preset (this IS the threshold - no separate storage needed)
  const largestPreset = presets.reduce((max, preset) => {
    return (preset.maxItems >= max.maxItems && preset.maxWeight >= max.maxWeight) 
      ? preset : max;
  }, presets[0]);
  
  // Step 4: Get total order weight from ACTUAL product weights
  const totalWeight = summary.totalWeight; // Calculated from product.weight * quantity
  
  // Step 5: CHECK MANUAL INTERVENTION THRESHOLD
  // Threshold = Largest preset's maxItems and maxWeight
  // No separate threshold table needed!
  if (summary.totalItems > largestPreset.maxItems || 
      totalWeight > Number(largestPreset.maxWeight)) {
    return {
      estimatedWeight: totalWeight,
      confidence: 'high',
      needsManualReview: true,
      reason: `Order exceeds largest box capacity (${summary.totalItems} items > ${largestPreset.maxItems} max items, or ${totalWeight.toFixed(2)}kg > ${largestPreset.maxWeight}kg max weight)`
    };
  }
  
  // Step 6: Find smallest box that fits
  for (const preset of presets) {
    if (summary.totalItems <= preset.maxItems && 
        totalWeight <= Number(preset.maxWeight)) {
      return {
        preset,
        estimatedWeight: totalWeight,
        confidence: 'high', // High confidence because using actual weights
        needsManualReview: false
      };
    }
  }
  
  // Step 7: No box found (should not reach here due to threshold check)
  return {
    estimatedWeight: totalWeight,
    confidence: 'low',
    needsManualReview: true,
    reason: 'No preset box matches order requirements'
  };
}

function calculateOrderSummary(order: Order & { orderItems: OrderItem[] }): OrderSummary {
  let totalItems = 0;
  let totalProducts = order.orderItems.length;
  let totalWeight = 0;
  
  for (const item of order.orderItems) {
    totalItems += item.quantity;
    
    // Use ACTUAL product/variant weight (REQUIRED field)
    const itemWeight = Number(item.variant?.weight || item.product?.weight || 0);
    
    if (itemWeight === 0) {
      throw new Error(`Product ${item.product.name} has no weight data. Weight is required for shipping.`);
    }
    
    totalWeight += itemWeight * item.quantity;
  }
  
  return { 
    totalItems, 
    totalProducts,
    totalWeight // Accurate weight from product data
  };
}
```

### Practical Example: The 90/10 Rule

**90% of Orders: Auto-Ship (Fits in Presets)**

```
Store Configuration:
├─ Small Box:  2 items max, 0.5kg max
├─ Medium Box: 5 items max, 2kg max  
└─ Large Box:  10 items max, 5kg max ← Largest preset = THRESHOLD

⚠️ THRESHOLD STORAGE: 
   NO separate threshold table needed!
   Threshold = Largest PackagePreset's (maxItems, maxWeight)
   Derived at runtime by querying: MAX(maxItems), MAX(maxWeight)

✓ Order A: 2 Face Creams (100gm each = 0.2kg total)
  → Check threshold: 2 items ≤ 10 ✓, 0.2kg ≤ 5kg ✓
  → Select box: Small (fits in 2 items, 0.5kg)
  → Result: AUTO-SHIPS with Small box

✓ Order B: 3 T-shirts (200gm each = 0.6kg) + 1 Jeans (400gm = 0.4kg)
  → Total: 4 items, 1.0kg (calculated from ACTUAL product weights)
  → Check threshold: 4 items ≤ 10 ✓, 1.0kg ≤ 5kg ✓
  → Select box: Medium (fits in 5 items, 2kg)
  → Result: AUTO-SHIPS with Medium box

✓ Order C: 8 Honey Jars (500gm each = 4.0kg total)
  → Check threshold: 8 items ≤ 10 ✓, 4.0kg ≤ 5kg ✓
  → Select box: Large (fits in 10 items, 5kg)
  → Result: AUTO-SHIPS with Large box
```

**10% of Orders: Manual Intervention (Exceeds Threshold)**

```
✗ Order D: 12 Face Creams (100gm each = 1.2kg total)
  → Check threshold: 12 items > 10 ✗ [THRESHOLD EXCEEDED]
  → Largest preset checked: Large (10 items, 5kg)
  → Result: NEEDS MANUAL REVIEW
  → Reason: "Order exceeds largest box capacity (12 items > 10 max items)"
  → Action:
    • Auto-ship SKIPPED
    • Order flagged with ⚠️ icon in dashboard
    • Seller must decide:
      - Use 2 small boxes?
      - Use custom packaging?
      - Ship manually

✗ Order E: 2 Honey Bulk Packs (5kg each = 10kg total)
  → Check threshold: 2 items ≤ 10 ✓, but 10kg > 5kg ✗ [THRESHOLD EXCEEDED]
  → Largest preset checked: Large (10 items, 5kg)
  → Result: NEEDS MANUAL REVIEW
  → Reason: "Order exceeds largest box capacity (10kg > 5kg max weight)"
  → Action: Same as Order D (manual intervention required)

✗ Order F: 20 Small Accessories (50gm each = 1kg total)
  → Check threshold: 20 items > 10 ✗ [THRESHOLD EXCEEDED]
  → Result: NEEDS MANUAL REVIEW
  → Reason: Even though weight is fine, item count exceeds largest box
  → Action: Seller may need multiple boxes or custom packaging

```

**Dashboard UI Indicator:**

```
Orders Page:

┌─────────────────────────────────────────────────────────────┐
│ Order #1234  │  ₹1,299  │  📦 Ready to Ship  │  [Ship Now] │
│ 3 items, ~1.2kg (Medium Box selected)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Order #1235  │  ₹3,499  │  ⚠️ Needs Review  │  [Review]   │
│ 15 items, ~4.8kg - Exceeds largest box capacity            │
└─────────────────────────────────────────────────────────────┘
```

---

## RECOMMENDED Implementation

---

## RECOMMENDED Implementation

### Settings Page: Package Presets

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📦 PACKAGE PRESETS                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Configure boxes you commonly use. System will auto-select based on order.  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  📦 Small Box                                            [Default] ⭐ │ │
│  │     Dimensions: 20 × 15 × 10 cm                                       │ │
│  │     Max Weight: 0.5 kg  |  Max Items: 2                              │ │
│  │     Best for: 1-2 t-shirts, small accessories                        │ │
│  │                                                      [Edit] [Delete] │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  📦 Medium Box                                                        │ │
│  │     Dimensions: 30 × 25 × 15 cm                                      │ │
│  │     Max Weight: 2 kg  |  Max Items: 5                                │ │
│  │     Best for: 3-5 items, mixed orders                                │ │
│  │                                                      [Edit] [Delete] │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  📦 Large Box                                                         │ │
│  │     Dimensions: 40 × 30 × 20 cm                                      │ │
│  │     Max Weight: 5 kg  |  Max Items: 10                               │ │
│  │     Best for: Bulk orders, heavy items                               │ │
│  │                                                      [Edit] [Delete] │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [+ Add New Preset]                                                         │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  💡 TIP: If you sell mostly clothing, start with these defaults:            │
│     Small (1-2 items), Medium (3-5 items), Large (6+ items)                │
│                                                                              │
│  [Use Recommended Presets]                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Add/Edit Preset Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Add Package Preset                                                    [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Preset Name                                                                │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Medium Box                                                             │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  DIMENSIONS (cm)                                                            │
│  Length          Breadth          Height                                    │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐                              │
│  │   30    │  ×  │   25    │  ×  │   15    │                              │
│  └─────────┘     └─────────┘     └─────────┘                              │
│                                                                              │
│  CAPACITY                                                                   │
│  Max Weight (kg)              Max Items                                     │
│  ┌─────────────────┐          ┌─────────────────┐                          │
│  │      2.0        │          │       5         │                          │
│  └─────────────────┘          └─────────────────┘                          │
│                                                                              │
│  Avg Weight per Item (kg) - for estimation                                 │
│  ┌─────────────────┐                                                       │
│  │      0.3        │  ℹ️ Used to estimate total package weight            │
│  └─────────────────┘                                                       │
│                                                                              │
│  [  ] Set as default preset                                                │
│                                                                              │
│                                          [Cancel]  [Save Preset]            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## How Auto-Selection Works

```
ORDER RECEIVED: 4 items (3× T-shirt M, 1× Jeans 32)
                ↓
        ┌───────────────────────────────────────┐
        │ Get Store Presets                     │
        │ [Small(2), Medium(5), Large(10)]     │
        └─────────┬─────────────────────────────┘
                  ↓
        ┌───────────────────────────────────────┐
        │ THRESHOLD CHECK                       │
        │ Largest box: 10 items, 5kg max       │
        │ Order: 4 items ≤ 10 ✓, ~1.2kg ≤ 5kg ✓│
        │ → Proceed with auto-selection         │
        └─────────┬─────────────────────────────┘
                  ↓
        ┌───────────────────────────────────────┐
        │ Check Small: maxItems=2               │
        │ Order has 4 items → SKIP              │
        └─────────┬─────────────────────────────┘
                  ↓
        ┌───────────────────────────────────────┐
        │ Check Medium: maxItems=5              │
        │ Order has 4 items → FITS ✓            │
        │ Est weight: 1.2 kg ≤ 2 kg → FITS ✓   │
        └─────────┬─────────────────────────────┘
                  ↓
        ┌───────────────────────────────────────┐
        │ ✓ RESULT: Medium Box                  │
        │ 30×25×15 cm, ~1.2 kg                 │
        │ AUTO-SHIP ENABLED                     │
        └───────────────────────────────────────┘
```

**Contrasting Example: Oversized Order**

```
ORDER RECEIVED: 15 items (4.8 kg)
                ↓
        ┌───────────────────────────────────────┐
        │ Get Store Presets                     │
        │ [Small(2), Medium(5), Large(10)]     │
        └─────────┬─────────────────────────────┘
                  ↓
        ┌───────────────────────────────────────┐
        │ THRESHOLD CHECK                       │
        │ Largest box: 10 items, 5kg max       │
        │ Order: 15 items > 10 ✗               │
        │ → Exceeds threshold                   │
        └─────────┬─────────────────────────────┘
                  ↓
        ┌───────────────────────────────────────┐
        │ ⚠️ NEEDS MANUAL REVIEW                │
        │ Reason: "Order exceeds largest box    │
        │ capacity (15 items > 10 max items)"   │
        │                                        │
        │ AUTO-SHIP SKIPPED                     │
        │ Flag order for seller review          │
        └───────────────────────────────────────┘
```

---

## Summary

**Preset Box System - MVP Approach**

| Aspect | Details |
|--------|---------|
| **Complexity** | Low (seller configures S/M/L boxes once) |
| **Accuracy** | High (uses actual product weights) |
| **Manual Intervention** | 10% of orders exceeding largest box threshold |
| **Automation Level** | High (90% auto-ship, 10% flagged for review) |
| **Best For** | All stores in MVP phase |

**Key Principle: The 90/10 Rule**
- 90% of orders fit in preset boxes → Full automation
- 10% of orders exceed largest box → Manual review required
- Threshold = Largest configured preset box (maxItems, maxWeight)

---

## Shiprocket Package Verification & Flow

### What Shiprocket Expects from Us

**Required Fields in Create Shipment API:**

```json
POST https://apiv2.shiprocket.in/v1/external/orders/create
{
  "order_id": "ORD123",
  "order_date": "2024-01-15 10:30:00",
  "pickup_location": "Primary Warehouse",
  "billing_customer_name": "John Doe",
  "billing_address": "...",
  "shipping_is_billing": true,
  
  // PACKAGE DETAILS (What we must provide)
  "length": 30,        // CM - REQUIRED
  "breadth": 25,       // CM - REQUIRED
  "height": 15,        // CM - REQUIRED
  "weight": 0.8,       // KG - REQUIRED
  
  "order_items": [
    {
      "name": "T-Shirt",
      "sku": "TSH001",
      "units": 2,
      "selling_price": 499
    }
  ]
}
```

**Shiprocket's Validation:**
- ✓ Dimensions: Min 0.5cm, Max 200cm per side
- ✓ Weight: Min 0.001kg (1 gram), Max 50kg (varies by courier)
- ✓ Volumetric Weight Calculated: (L × B × H) / 5000

---

### How Shiprocket Processes Our Shipment

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Shipment Creation (Our API Call)                       │
│         We send: dimensions (30×25×15 cm), weight (0.8kg)      │
│         ↓                                                        │
│         Shiprocket validates and creates order                  │
│         Response: { order_id, shipment_id }                     │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Courier Rate Calculation                               │
│         Shiprocket calculates using:                            │
│         • Volumetric Weight = (30×25×15) / 5000 = 2.25kg      │
│         • Actual Weight = 0.8kg                                │
│         • Chargeable Weight = MAX(2.25, 0.8) = 2.25kg         │
│         ↓                                                        │
│         Returns available couriers with rates                   │
│         [Delhivery: ₹65, Bluedart: ₹85, DTDC: ₹55]           │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: AWB Assignment                                          │
│         We select courier (e.g., DTDC)                          │
│         Shiprocket assigns AWB number from courier              │
│         Response: { awb_code: "DTDC123456789" }                │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Pickup Scheduling                                       │
│         We schedule pickup time                                 │
│         Shiprocket notifies courier                             │
│         Status: PICKUP_SCHEDULED                                │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Courier Pickup (CRITICAL VERIFICATION POINT)           │
│         Courier arrives at seller's warehouse                   │
│         ↓                                                        │
│         VERIFICATION PROCESS:                                   │
│         1. Courier weighs package on handheld scale             │
│         2. Measures dimensions (if suspicious)                  │
│         3. Compares with declared: 30×25×15 cm, 0.8kg          │
│         ↓                                                        │
│         IF MISMATCH DETECTED → See "Weight Mismatch Flow"      │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: In-Transit Processing                                  │
│         Courier hub re-weighs package (automated systems)       │
│         Updates tracking: IN_TRANSIT                            │
│         IF DISCREPANCY > 10% → Weight dispute raised            │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: Delivery                                                │
│         Package delivered to customer                           │
│         Status: DELIVERED                                       │
│         Payment settled (deduct shipping charges)               │
└─────────────────────────────────────────────────────────────────┘
```

---

### What Happens if Declared Details Don't Match at Pickup?

**Scenario 1: Minor Weight Difference (< 10%)**

```
Declared Weight: 0.8kg
Actual Weight at Pickup: 0.85kg
Difference: 6.25% → ACCEPTED

Courier Action:
✓ Picks up package
✓ Updates weight in system to 0.85kg
✓ Recalculates charges based on 0.85kg
✓ Shiprocket adjusts billing (small difference)
```

**Scenario 2: Major Weight Discrepancy (> 10%)**

```
Declared Weight: 0.8kg
Actual Weight at Pickup: 1.5kg
Difference: 87.5% → REJECTED or SURCHARGE

Courier Action:
✗ May refuse pickup (depends on courier policy)
✓ OR picks up with "Weight Dispute" flag
↓
Shiprocket sends webhook:
{
  "shipment_id": "123456",
  "status": "WEIGHT_DISCREPANCY",
  "declared_weight": 0.8,
  "actual_weight": 1.5,
  "additional_charges": 45.00  // ₹45 extra
}
↓
Seller gets notification:
⚠️ "Weight mismatch for Order #1234. 
   Declared: 0.8kg, Actual: 1.5kg
   Additional charge: ₹45 will be deducted from wallet"
```

**Scenario 3: Dimension Discrepancy (Volumetric Weight Issue)**

```
Declared: 30×25×15 cm (Volumetric: 2.25kg)
Actual: 50×40×30 cm (Volumetric: 12kg)
Chargeable weight jumps from 2.25kg → 12kg

Courier Action:
✗ Significant overcharge detected
✓ Courier measures at hub (automated scanners)
↓
Shiprocket raises dispute:
- Shipment held at hub
- Seller contacted to confirm dimensions
- IF seller confirms: Additional ₹250 charged
- IF seller disputes: Shiprocket investigates (photos sent)
```

**Scenario 4: Package Rejected at Pickup**

```
Declared: 40×30×20 cm, 5kg
Actual: 80×60×40 cm, 15kg (Exceeds courier limits)

Courier Action:
✗ REFUSED PICKUP
Reason: "Package exceeds courier size/weight limits"
↓
Shiprocket webhook:
{
  "status": "PICKUP_FAILED",
  "reason": "OVERSIZE_PACKAGE"
}
↓
Seller must:
1. Cancel shipment
2. Split into multiple boxes
3. Re-create shipment with accurate dimensions
```

---

### Weight Dispute Resolution Process

**Timeline:**

```
Day 0: Package picked up
       ↓
Day 1: Hub re-weighs package
       Discrepancy detected: Declared 0.8kg, Actual 1.5kg
       ↓
       Shiprocket sends webhook: WEIGHT_DISCREPANCY
       ↓
Day 2-3: Seller has 48 hours to dispute
         - Upload product weight proof (if available)
         - Shiprocket reviews with photos from courier
         ↓
Day 4: Resolution
       Option A: Seller accepts → Additional charge applied
       Option B: Courier error → Charges reversed
       Option C: Unresolved → Shiprocket mediates (rare)
```

**How We Handle in ShopPulse:**

```typescript
// Webhook handler
if (event.type === 'WEIGHT_DISCREPANCY') {
  // Update shipment with actual weight
  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      declaredWeight: 0.8,
      actualWeight: 1.5,
      weightDispute: true,
      additionalCharges: 45.00,
      status: 'WEIGHT_DISCREPANCY'
    }
  });
  
  // Notify seller
  await sendNotification({
    storeId,
    type: 'WEIGHT_MISMATCH',
    message: `Order ${orderId} weight mismatch. Declared: 0.8kg, Actual: 1.5kg. Extra: ₹45`,
    action: {
      label: 'Review Dispute',
      url: `/dashboard/orders/${orderId}/dispute`
    }
  });
}
```

---

### Best Practices to Avoid Mismatches

**1. Accurate Product Weights (MANDATORY)**
```
✓ Weigh products before adding to catalog
✓ Include packaging weight (box, bubble wrap, tape)
✓ Add 5-10% buffer for packaging material

Example:
- Product net weight: 0.250kg
- Packaging: ~0.050kg
- Enter in system: 0.300kg ← Safe value
```

**2. Use Presets with Buffer**
```
✓ Configure presets with realistic maxWeight
✓ Account for packing material in box selection

Example Preset:
- Small Box: 20×15×10 cm
- Max Weight: 0.5kg (0.45kg products + 0.05kg packaging)
- Max Items: 2
```

**3. Manual Review for Edge Cases**
```
✓ Flag orders > 5kg for manual verification
✓ Seller physically weighs before confirming shipment
✓ Update dimensions if using custom packaging

Workflow:
Order flagged → Seller packs box → Weighs on scale
→ Compares with system weight → Updates if needed → Ships
```

**4. Testing Phase**
```
✓ First 20-30 shipments: Manually verify weights
✓ Track mismatch rate
✓ Adjust product weights or preset configurations
✓ Once < 5% mismatch: Enable full auto-ship
```

---

### Shiprocket's Intelligent Pricing (How They Calculate)

**Formula:**
```
Volumetric Weight = (Length × Breadth × Height) / 5000

Chargeable Weight = MAX(Actual Weight, Volumetric Weight)

Example 1: Light but bulky
- Dimensions: 40×30×20 cm
- Actual Weight: 0.5kg
- Volumetric: (40×30×20)/5000 = 4.8kg
- Chargeable: 4.8kg ← This is what courier charges for

Example 2: Heavy but compact
- Dimensions: 20×15×10 cm
- Actual Weight: 3kg
- Volumetric: (20×15×10)/5000 = 0.6kg
- Chargeable: 3kg ← Actual weight wins

Our preset system handles both:
✓ Dimensions from preset (consistent volumetric calculation)
✓ Weight from products (accurate actual weight)
```

---

### Summary: Verification Points

| Stage | Who Verifies | What They Check | Action on Mismatch |
|-------|-------------|-----------------|-------------------|
| **API Call** | Shiprocket | Basic validation (min/max) | Rejects API call immediately |
| **Pickup** | Courier Boy | Weighs package, spot-check dimensions | Refuses pickup OR flags discrepancy |
| **Hub Scan** | Automated System | Re-weighs + dimension scan | Raises weight dispute if > 10% |
| **Billing** | Shiprocket | Compares declared vs actual | Adjusts charges, notifies seller |

**Key Takeaway:**
- Shiprocket trusts our declared dimensions for **initial pricing**
- Couriers **verify at pickup and hub** (this is where mismatches are caught)
- Sellers get **charged extra** for discrepancies (not ShopPulse's liability)
- Accurate product weights in our system = No disputes = Happy sellers

---

### Data Requirements

**1. Product Weight (MANDATORY)**
```
✓ REQUIRED: Every product must have weight field populated
✓ Enforced: Form validation when store.shippingEnabled = true
✓ Format: Decimal (KG) with 3 decimal places (e.g., 0.250 for 250gm)
✓ Validation: min 0.001 (1 gram), max 100kg
```

**2. Product Dimensions (OPTIONAL)**
```
✗ NOT REQUIRED: Individual product dimensions
✓ WHY: Preset boxes handle packaging size
✓ USE CASE: Advanced stores wanting precise courier rate comparison
```

**3. Package Presets (CONFIGURED BY SELLER)**
```
✓ REQUIRED: At least 1 preset box configured
✓ RECOMMENDED: 3 presets (Small, Medium, Large)
✓ FIELDS PER PRESET:
  - name: "Small Box"
  - dimensions: length, breadth, height (cm)
  - maxWeight: 2.0 (kg)
  - maxItems: 5 (quantity)
  - priority: 1 (lower = preferred)
```

---

### Auto-Shipping Flow (90% of Orders)

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Order Payment Confirmed                                │
│         Webhook received → Order marked as paid                 │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Calculate Total Order Weight                           │
│         totalWeight = Σ (product.weight × orderItem.quantity)  │
│         totalItems = Σ (orderItem.quantity)                    │
│                                                                  │
│         Example:                                                │
│         - 3× Face Cream (100gm each) = 0.3kg                   │
│         - 1× Body Lotion (500gm) = 0.5kg                       │
│         Total: 0.8kg, 4 items                                  │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Fetch Package Presets                                  │
│         Query: prisma.packagePreset.findMany({                 │
│           where: { storeId },                                  │
│           orderBy: [{ priority: 'asc' }, { maxItems: 'asc' }] │
│         })                                                      │
│                                                                  │
│         Result: [Small(2), Medium(5), Large(10)]               │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Determine Largest Preset (Threshold)                   │
│         largestPreset = MAX(maxItems, maxWeight)               │
│         → Large: 10 items, 5kg                                 │
│                                                                  │
│         ⚠️ NO SEPARATE THRESHOLD TABLE                          │
│         Threshold = Runtime calculation from largest preset     │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Check Manual Intervention Threshold                    │
│         if (totalItems > 10 OR totalWeight > 5kg)              │
│            → SKIP AUTO-SHIP                                    │
│            → Flag order with ⚠️ "Needs manual review"          │
│            → Jump to Manual Shipping Flow                      │
│         else                                                    │
│            → Continue to box selection                         │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: Select Smallest Fitting Box                            │
│         for each preset (sorted by priority):                  │
│           if (totalItems ≤ preset.maxItems AND                 │
│               totalWeight ≤ preset.maxWeight)                  │
│              → SELECT THIS BOX                                 │
│                                                                  │
│         Example: 4 items, 0.8kg                                │
│         ✗ Small (2 items max) → Skip                           │
│         ✓ Medium (5 items, 2kg max) → SELECTED                 │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: Create Shiprocket Shipment                             │
│         POST /api/shiprocket/shipments/create                  │
│         {                                                       │
│           order_id,                                            │
│           order_date,                                          │
│           pickup_location_id,                                  │
│           dimensions: {                                        │
│             length: preset.length,  // from selected box       │
│             breadth: preset.breadth,                           │
│             height: preset.height                              │
│           },                                                    │
│           weight: totalWeight  // calculated from products     │
│         }                                                       │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 8: Schedule Pickup (if configured)                        │
│         Shiprocket API: /orders/awb_assign (if auto-assign)    │
│         Shiprocket API: /shipments/pickup/schedule             │
│                                                                  │
│         Result: Shipment created, AWB assigned                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Always show both shiprocket and manual shipping tabs

This applies to ALL scenarios:

1. Auto-ship enabled + Order fits presets (90% orders)
    - Opens with Shiprocket tab active (pre-filled)
    - Seller CAN switch to Manual tab if they want
    - Auto-ship enabled + Order exceeds threshold (10% orders)

2. Opens with ⚠️ warning on Shiprocket tab
    - Seller CAN switch to Manual tab as alternative
    - Auto-ship disabled (seller preference)

3. Opens with Shiprocket tab active
    - Seller must manually create shipment
    - Can switch to Manual tab
    - Manual shipping preferred (Speed Post, self-delivery)

4. Opens with Manual tab active
    - Can still use Shiprocket if needed


**Key Point**: The choice between Shiprocket and Manual is ALWAYS available to the seller at shipping time, regardless of auto-ship settings or order characteristics.

---

### Manual Shipping Flow (10% of Orders + Manual Choice)

**Triggered When:**
1. Order exceeds threshold (items > maxItems OR weight > maxWeight)
2. Seller clicks "Ship Manually" on any order
3. Store uses manual couriers (Speed Post, self-delivery)

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Order Flagged for Manual Review                        │
│         Dashboard shows: ⚠️ "Requires manual packaging review" │
│         Button: [Review & Ship]                                │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Seller Opens Ship Order Modal                          │
│         Tabs: [Shiprocket] [Manual Shipping]                   │
│                                                                  │
│         If order exceeded threshold:                            │
│         ⚠️ Alert shown:                                         │
│         "This order has 15 items (max 10) or 8kg weight        │
│         (max 5kg). Please review packaging needs."             │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Seller Chooses Shipping Method                         │
│                                                                  │
│ OPTION A: Shiprocket (with custom dimensions)                  │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ Package Dimensions (cm)                                   │ │
│ │ Length: [40]  Breadth: [30]  Height: [20]  (Manual entry)│ │
│ │                                                            │ │
│ │ Package Weight (kg): [8.5]  (Pre-filled from products)   │ │
│ │                                                            │ │
│ │ 💡 TIP: Need multiple boxes? Create separate shipments    │ │
│ │                                                            │ │
│ │ [Get Shipping Rates] → Shows courier options              │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│ OPTION B: Manual Shipping (Speed Post, Self-Delivery)          │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ Courier: [Speed Post ▼]                                   │ │
│ │ AWB Number: [____________] (Manual entry)                 │ │
│ │ Shipping Cost: [₹150] (Manual entry)                      │ │
│ │                                                            │ │
│ │ [Mark as Shipped]                                         │ │
│ └───────────────────────────────────────────────────────────┘ │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Shipment Created                                       │
│         - ShipmentMethod: "SHIPROCKET" or "MANUAL"             │
│         - Status: "PENDING_PICKUP" or "IN_TRANSIT"             │
│         - Dimensions: From seller input (not preset)           │
│         - Weight: From product data                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### Box Selection Recommendations (UI Suggestions)

**In Ship Order Modal - Smart Defaults:**

```typescript
// When seller opens ship modal for oversized order

// Calculate weight and items
const { totalWeight, totalItems } = calculateOrderSummary(order);

// Get presets
const presets = await getPackagePresets(storeId);
const largestPreset = findLargestPreset(presets);

// Provide recommendation
let recommendation = "";

if (totalItems > largestPreset.maxItems) {
  // Item count exceeds
  const boxesNeeded = Math.ceil(totalItems / largestPreset.maxItems);
  recommendation = `📦 Recommendation: Use ${boxesNeeded} × ${largestPreset.name} boxes 
  (Max ${largestPreset.maxItems} items per box)`;
  
} else if (totalWeight > largestPreset.maxWeight) {
  // Weight exceeds
  const boxesNeeded = Math.ceil(totalWeight / Number(largestPreset.maxWeight));
  recommendation = `📦 Recommendation: Use ${boxesNeeded} × ${largestPreset.name} boxes 
  (Max ${largestPreset.maxWeight}kg per box)`;
  
} else {
  // Should not happen, but safety
  recommendation = `📦 Custom packaging needed - manually enter dimensions`;
}
```

**UI Display:**

NOTE: We will suggest to the seller to use separate package. Remember its just a recommendation, user can still enter custom dimensions as they see fit.

```
┌─────────────────────────────────────────────────────────────────┐
│ Ship Order #1234                                       [X]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ⚠️ This order requires manual packaging review                  │
│                                                                  │
│ Order Details:                                                  │
│ • 15 items (Face creams + Body lotions)                        │
│ • Total weight: 3.2kg                                          │
│ • Exceeds: Large box capacity (max 10 items)                   │
│                                                                  │
│ 📦 Recommendation: Use 2 × Large boxes                          │
│    (Max 10 items per box)                                      │
│                                                                  │
│ ─────────────────────────────────────────────────────────────   │
│                                                                  │
│ [Shiprocket] [Manual Shipping] ← Tabs                          │
│                                                                  │
│ Package 1:                                                      │
│ Length: [40]  Breadth: [30]  Height: [20]  Weight: [1.6kg]    │
│                                                                  │
│ Package 2:                                                      │
│ Length: [40]  Breadth: [30]  Height: [20]  Weight: [1.6kg]    │
│                                                                  │
│ [Create Separate Shipments]  [Cancel]                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Dimension & Weight Handling Summary

| Scenario | Weight Source | Dimension Source | Box Selection | Shipping Method |
|----------|--------------|------------------|---------------|-----------------|
| **Auto-Ship (90%)** | Sum of `product.weight` × quantity | Selected `PackagePreset` dimensions | Algorithm picks smallest fitting preset | Shiprocket auto-ship |
| **Manual Ship (Oversized)** | Sum of `product.weight` × quantity | Seller enters custom dimensions | Seller decides (multi-box or custom) | Shiprocket manual create |
| **Manual Ship (Speed Post)** | Sum of `product.weight` × quantity | Not sent to courier | N/A (no API) | Manual entry (AWB, cost) |

**Key Points:**
1. **Product weight = Source of truth** (always used, always accurate)
2. **Product dimensions = Not required** (presets handle packaging)
3. **Preset dimensions = Used for 90% of orders** (auto-ship)
4. **Custom dimensions = Only when order exceeds presets** (manual entry)

---

*Next: Part 5B - Complete Shipment Flows (Manual, One-Click, Batch, Auto)*
