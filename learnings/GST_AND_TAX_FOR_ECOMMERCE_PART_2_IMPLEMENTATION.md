# GST & Tax for D2C E-commerce — Part 2: Implementation, UX & ShopPulse Mapping

> Companion: `GST_AND_TAX_FOR_ECOMMERCE_PART_1_FUNDAMENTALS.md`
> Read Part 1 first. This part assumes you understand CGST/SGST/IGST,
> HSN/SAC/UCS, Place of Supply, Inclusive vs Exclusive pricing, RCM, TCS,
> registration thresholds, and Bill-of-Supply vs Tax-Invoice.

---

## ⚠️ 2026 update marker (GST 2.0)

This implementation guide was originally drafted in the pre-GST-2.0 slab world.
For current implementation, use these corrected defaults everywhere:

- Primary slabs: **5%, 18%, 40%** (with niche 3%, 0.25%, 1.5%, and retained 28% classes).
- Apparel/footwear bracket: **<= ₹2,500 = 5%**, **> ₹2,500 = 18%**.
- E-invoicing threshold: **₹5 crore** turnover (unchanged in 2026).
- TCS under GST via ECO: **0.5%** (not 1%).

ShopPulse product recommendation remains intentionally simplified:
- Use **2 seller states** in UI: `Unregistered`, `Registered`.
- Treat Composition as a legal/tax backend category for later expansion, not an MVP UI branch.

---

## Table of Contents

1. [The two seller archetypes ShopPulse must serve](#1-two-archetypes)
2. [Store-level tax configuration](#2-store-level-tax-configuration)
3. [Product form UX — inclusive/exclusive + live preview](#3-product-form-ux)
4. [The achaar / papad seller — full UX walkthrough](#4-achaar-walkthrough)
5. [The T-shirt merchant — full end-to-end walkthrough](#5-tshirt-walkthrough)
6. [Discounts and how tax recomputes](#6-discounts-and-tax)
7. [Round-off implementation in ShopPulse](#7-round-off-implementation)
8. [Place-of-supply edge cases](#8-pos-edge-cases)
9. [B2B GSTIN at checkout](#9-b2b-gstin-checkout)
10. [Decisions matrix — what we ship and what we punt](#10-decisions-matrix)
11. [Database columns reference](#11-database-columns-reference)
12. [Phase-by-phase code map](#12-phase-by-phase-code-map)

---

## 1. Two archetypes

ShopPulse has to serve two very different sellers gracefully. Every UI and API
decision should be checked against both.

### Archetype A — "Sunita Aunty's Achaar Shop"
- 35-year-old home-business owner.
- Sells loose papad / sookhi mango achaar / packaged besan ladoo.
- Annual revenue ₹60k. **No GSTIN.** No PAN tied to a business. Maybe just an
  Aadhaar-linked savings account.
- Wants: list 8 products, ship via India Post / local courier, accept UPI.
- Should never see the words "HSN", "CGST", "IGST", "Place of Supply" in her
  dashboard. Tax UI should be **completely invisible**.

### Archetype B — "Rahul's T-shirt Brand"
- 28-year-old shop owner moving online.
- Has GSTIN, sells in-state and cross-state.
- 30 SKUs across t-shirts, pants, hats. Wants discounts during Diwali.
- Wants: GST-compliant invoices, GSTR-1 export at month-end, optional B2B
  invoicing for bulk corporate orders.
- Should see HSN auto-suggest, GST slab dropdown, **live tax preview** on the
  product form, "Tax Invoice" PDF on every order.

The same codebase serves both. For MVP, the toggle is `Store.gstRegistered` +
`Store.gstin`.

---

## 2. Store-level tax configuration

### Schema additions for Phase 5.1

```prisma
model Store {
  // existing
  gstin            String?
  einvoiceEnabled  Boolean @default(false)

  // new for Phase 5.1
  gstRegistered    Boolean    @default(false)
  priceMode        PriceMode  @default(INCLUSIVE)
  allowB2BInvoices Boolean    @default(false)
  invoiceCounter   Int        @default(0)        // already added if not, for Phase 7
  invoicePrefix    String?    @default("INV")
}

enum PriceMode {
  INCLUSIVE      // D2C default — listed price = customer pays
  EXCLUSIVE      // B2B / wholesale — tax added at checkout
}
```

### Settings page UX
A new "**Tax Settings**" tab in the store dashboard:

```
┌─ Tax Settings ────────────────────────────────────────────┐
│                                                           │
│  GST Registration Status                                  │
│  ◉ I am not registered for GST  (most common for new sellers) │
│  ◯ I am GST registered (collect & remit on every sale)    │
│                                                           │
│  ─── shown only if GST registered ───                     │
│  GSTIN  [29ABCDE1234F1Z5         ]  ✓ verified            │
│  PAN    [ABCDE1234F             ]  (auto from GSTIN)      │
│  State  [Karnataka              ]  (auto from GSTIN)      │
│                                                           │
│  Price Display                                            │
│  ◉ Prices are tax-inclusive  (recommended for D2C)        │
│  ◯ Prices are tax-exclusive  (tax added at checkout)      │
│                                                           │
│  ─── shown only if GST registered ───                     │
│  ☐ Allow customers to enter their GSTIN at checkout       │
│     (for B2B sales — buyer can claim ITC)                 │
│                                                           │
│  ☐ Enable e-invoicing (IRN/QR)                            │
│     Required if your annual turnover > ₹5 cr              │
│                                                           │
│  [ Save ]                                                 │
└───────────────────────────────────────────────────────────┘
```

### Cascading effect
Choosing `UNREGISTERED` should:
- Hide the entire "Tax & Compliance" card on the product form.
- Hide tax columns on order detail / invoice.
- Generate "Receipt" or "Bill of Supply" PDFs (no GST line).
- Disable e-invoicing toggle.
- Hide B2B GSTIN at checkout.

Choosing `GST REGISTERED` should:
- Show the Tax & Compliance card per product.
- Run full `computeOrderTaxes` at checkout.
- "Tax Invoice" PDFs.
- Allow B2B GSTIN + e-invoicing toggles.

---

## 3. Product form UX

This is the visual answer to "how does the merchant fill it in?"

### Inclusive mode (default)

```
┌─ Pricing ───────────────────────────────────────────────────┐
│                                                             │
│  MRP            [ ₹  799.00 ]   (printed strike-through)    │
│  Selling Price  [ ₹  649.00 ]   ← what customer pays        │
│                                                             │
│  ⓘ Prices include 5% GST.                                   │
│     Taxable: ₹618.10 · CGST 2.5%: ₹15.45 · SGST 2.5%: ₹15.45│
│     ↑ live preview, recomputes as you type                  │
└─────────────────────────────────────────────────────────────┘

┌─ Tax & Compliance ──────────────────────────────[collapsed▼]┐
│  HSN Code   [ 6109                  ] 🔍                    │
│             ↪ "Cotton T-shirts and other knitted shirts"    │
│                                                             │
│  GST Rate   [  5%  ▾ ]   (auto-filled from HSN)             │
│             ⓘ Apparel ≤ ₹2,500 = 5%, > ₹2,500 = 18%         │
│                                                             │
│  Unit       [ PCS ▾ ]                                       │
│                                                             │
│  ☐ This product is GST-exempt                               │
│                                                             │
│  ▸ Advanced (cess, exemption notes)                         │
└─────────────────────────────────────────────────────────────┘
```

### Exclusive mode

```
┌─ Pricing ───────────────────────────────────────────────────┐
│                                                             │
│  Base Price (excl. tax)   [ ₹  618.10 ]                     │
│                                                             │
│  ⓘ Customer will see ₹649.00 at checkout (₹618.10 + 5% GST) │
│     CGST: ₹15.45 · SGST: ₹15.45 · Total: ₹649.00            │
└─────────────────────────────────────────────────────────────┘
```

### Live preview implementation
- Pure client-side React component, watches `sellingPrice`, `taxRate`,
  `cessRate`, `isExempt`, and `Store.priceMode`.
- Renders one of the two breakdowns above on every keystroke.
- Doesn't persist anything — derived values are recomputed on the server at
  order time, never stored as defaults.

### HSN search UX (already built in Phase 5)
- Type any digits or any English keyword.
- Shows top 5 suggestions: code, description, default rate badge.
- Clicking a suggestion auto-fills the GST rate.
- If user manually overrides the rate, a small yellow nudge appears:
  *"This HSN typically uses 18% GST. You've set 5%. Make sure this is correct."*

### Achaar/papad scenario in this UX
For Sunita Aunty's store (`gstRegistered = false`):
- The entire **Tax & Compliance card is not rendered**.
- The Pricing card shows simple "Selling Price" with no tax sub-text.
- There's no HSN field, no rate dropdown, no exemption checkbox.
- Form submission still works (taxRate/hsnCode default to null on server).

If she ever upgrades to `gstRegistered = true`, the card appears for **all
products** (existing + new). She'd need to fill HSN + rate per product. We
should show a one-time onboarding banner: *"Tax fields needed on 8 of your
products before they can be sold under your GSTIN."*

---

## 4. Achaar walkthrough

### Setup
1. Sunita signs up. Settings page asks her tax status. She picks
   **"Not registered for GST"** (default, big green checkmark).
2. Adds her first product:
   - Name: "Homemade Aam ka Achaar 500g"
   - MRP: ₹150
   - Selling Price: ₹150
   - Tax & Compliance card: **not visible**.
3. Saves. `Product.taxRate = null, Product.hsnCode = null, Product.isExempt = false`
   (defaults; never displayed to her).

### Customer order
- Buyer in Pune adds the achaar to cart.
- Cart shows: ₹150.
- Checkout shows: ₹150 + ₹40 shipping = ₹190. **No tax line anywhere.**
- Razorpay payment for ₹190.
- Order confirmation page: "Receipt" with line item ₹150, shipping ₹40,
  total ₹190. No GSTIN, no CGST/SGST.

### What ShopPulse stores
- `Order.subtotal = 150, Order.totalTax = 0, Order.totalCess = 0,
   Order.grandTotal = 190, Order.documentType = 'RECEIPT'`.
- `OrderItem.hsnCodeSnapshot = null, taxRateSnapshot = null,
   cgstAmount = 0, sgstAmount = 0, igstAmount = 0`.
- Phase 7 PDF: "Receipt" header, no GSTIN block.

Sunita receives ₹190 minus Razorpay's processing fee. **Net: ₹150 for the
product, ₹40 for shipping. Zero tax.** Exactly what she expected.

---

## 5. T-shirt walkthrough

### Setup
1. Rahul signs up. Settings page → picks **"Regular GST"**.
2. Enters GSTIN `27ABCDE1234F1Z5`. System verifies, derives state =
   Maharashtra.
3. Picks **price mode = Inclusive** (default).
4. Adds three products:

| Product   | HSN  | GST | MRP   | Selling Price | Backend taxable | Backend tax |
| --------- | ---- | --- | ----- | ------------- | --------------- | ----------- |
| T-shirt   | 6109 | 5%  | ₹799  | ₹649          | ₹618.10         | ₹30.90      |
| Pant      | 6203 | 5%  | ₹1299 | ₹999          | ₹951.43         | ₹47.57      |
| Hat       | 6505 | 5%  | ₹199  | ₹129          | ₹122.86         | ₹6.14       |

Note: Pant at ₹999 is below the **₹2,500 apparel threshold**, so 5% applies in
the current schedules. Above ₹2,500 per piece, it becomes 18%.

### Customer order — intra-state
Buyer in Mumbai (Maharashtra) buys 1 t-shirt + 1 hat.

```
Subtotal (incl):       ₹649 + ₹129 = ₹778.00
Shipping:                            ₹40.00
─────────────────────────────────────────────
Grand total payable:                ₹818.00

Backend computation (intra-state, since both MH):
  T-shirt
    taxable     = 649 / 1.05 = 618.10
    CGST 2.5%   = 15.45
    SGST 2.5%   = 15.45
  Hat
    taxable     = 129 / 1.05 = 122.86
    CGST 2.5%   = 3.07
    SGST 2.5%   = 3.07
  Shipping (assume 0% GST as a courier service to consumer; in reality 18%
  if it's a courier service, but most D2C bundle shipping into product price
  or treat it as a non-taxable convenience charge — to be decided)
─────────────────────────────────────────────
  Total taxable  = 740.96
  Total CGST     =  18.52
  Total SGST     =  18.52
  Round-off      =   0.00
  Grand total    = 778.00 + 40 = 818.00 ✓
```

### Customer order — inter-state
Same cart, buyer in Bengaluru (Karnataka).
```
  T-shirt: taxable 618.10, IGST 5% = 30.90
  Hat:     taxable 122.86, IGST 5% =  6.14
  Total taxable: 740.96, IGST: 37.04, grand total: 818.00 ✓
```

### Tax Invoice PDF (Phase 7)
- Header: "TAX INVOICE", invoice number `INV-2024-001`.
- Seller block: Rahul's brand name, GSTIN 27..., Mumbai address.
- Buyer block: name, shipping address, optional GSTIN.
- Line items table: SN | Description | HSN | UCS | Qty | Rate | Taxable | CGST% | CGST₹ | SGST% | SGST₹ | Total.
- Footer: total in words, place of supply (Maharashtra), signature, T&Cs.

---

## 6. Discounts and tax

### Three discount types

#### 6.1 Per-line discount (most common)
"₹100 off this t-shirt"
- Listed inclusive: ₹649. Discount: ₹100. Effective inclusive: ₹549.
- Backend: `taxable = 549 / 1.05 = 522.86`, CGST = SGST = 13.07.
- **Tax shrinks proportionally.** ✓ This is GST-compliant *as long as the
  discount is shown on the invoice*.

#### 6.2 Cart-level coupon
"FLAT200 — ₹200 off any order over ₹1000"
- Cart: t-shirt ₹649 + pant ₹999 = ₹1648 inclusive.
- Discount ₹200 distributed pro-rata:
  - T-shirt share: 649/1648 × 200 = ₹78.79 → effective ₹570.21
  - Pant share:    999/1648 × 200 = ₹121.21 → effective ₹877.79
- Each line then derives its taxable + tax from the new effective inclusive.
- The invoice shows: original line totals → "Coupon FLAT200 -₹200" → adjusted
  totals → tax computed on adjusted.

#### 6.3 Cashback / post-supply discount
"Get ₹50 cashback to your wallet after this order"
- The merchant collected the full ₹649 from the buyer.
- Cashback is a marketing expense, NOT a price reduction.
- GST is on the **gross ₹649**, not ₹599.
- Merchant reimburses ₹50 from their marketing budget separately.

ShopPulse MVP only handles types 1 and 2. Cashback is out of scope.

### Implementation rule
`order-tax.ts` always works on the **final inclusive line price after all
applicable discounts**. Discounts are stored on `OrderItem.discountAmount`
(per-line) and `Order.couponDiscount` (cart-level), but the *taxable*,
*CGST/SGST/IGST* fields are computed from the post-discount inclusive price.

---

## 7. Round-off implementation

(Refer to Part 1 §10 for the conceptual explanation.)

### Recommended ShopPulse rule
```
roundedPayable = Math.round(computedTotalRupees)
roundOff = roundedPayable - computedTotalRupees   // signed, between -0.49 and +0.50
Order.roundOffAmount = roundOff
Order.grandTotal     = roundedPayable
```

### UI display
On the order summary and invoice PDF, show:
```
Subtotal:        ₹  740.96
CGST:            ₹   18.52
SGST:            ₹   18.52
Shipping:        ₹   40.00
Round Off:       ₹    0.00     ← only show line if non-zero
─────────────────────────────────
Amount Payable:  ₹  818.00
```

If non-zero (e.g. +0.50):
```
Round Off:       ₹    0.50
```

### Decisions for the user
> Please confirm before Phase 6 ships:
1. Round at order level (industry standard), not per-line. **OK?**
2. Round to nearest rupee, half-up. **OK?**
3. Show "Round Off" line only when non-zero. **OK?**

(If silent we'll proceed with 1+2+3 as defaults.)

---

## 8. Place-of-supply edge cases

| Scenario | Place of supply | Tax type |
| -------- | --------------- | -------- |
| Buyer in same state as seller | Buyer state | CGST+SGST |
| Buyer in different state | Buyer state | IGST |
| Buyer in UT-without-legislature (e.g. Andaman) | Andaman | IGST (UT-side becomes UTGST in their books) |
| Buyer's GSTIN (B2B) is from a state different from shipping state | **GSTIN state**, not shipping state | Compute as IGST if GSTIN-state ≠ seller-state |
| Bill-to and Ship-to differ (gift) | Ship-to state determines POS for B2C; for B2B with GSTIN it's the GSTIN state | (depends) |
| International shipping (export) | Place of supply = outside India | Zero-rated supply (export) — separate flow, OOS for MVP |

ShopPulse MVP: domestic India only. International + bill-to ≠ ship-to is Phase 9+.

---

## 9. B2B GSTIN at checkout

### UX
After the address step on the storefront checkout:

```
☐ This is a business purchase (I want a GST invoice)
   ↓ when checked:
   Business name:   [ Acme Consulting Pvt Ltd       ]
   GSTIN:           [ 27AAACA1234A1Z5               ] ✓ verified
   ⓘ Your business will be the invoice recipient and can claim Input Tax Credit.
```

Only shown if `Store.allowB2BInvoices = true`.

### Validation
- Use the existing `validateGstin()` from gst-validators.
- Derive GSTIN-state from the first 2 digits.
- If GSTIN-state ≠ seller-state → IGST regardless of shipping state.
- If GSTIN-state == seller-state → CGST+SGST.

### Order storage
- `Order.buyerGstin: String?`
- `Order.buyerLegalName: String?`
- `Order.placeOfSupplyStateCode: String` ← always set
- `Order.isB2B: Boolean` ← convenience flag

### Invoice PDF
- "Bill To" block shows business name + GSTIN.
- E-invoicing (if enabled) requires this for IRN generation.

---

## 10. Decisions matrix

| Topic | Recommendation | Decided? |
| ----- | -------------- | -------- |
| Default `priceMode` | INCLUSIVE | ☐ |
| Default `gstRegistered` for new stores | false (Unregistered) | ☐ |
| Round-off rule | Order-level, nearest rupee, half-up | ☐ |
| Show round-off line when zero | No | ☐ |
| RCM support | Out of scope for MVP | ☐ |
| TCS / TDS handling | Out of scope (we are SaaS not ECO) | ☐ |
| B2B GSTIN at checkout | Opt-in per store, default off | ☐ |
| Multi-state warehousing | v2; single GSTIN per store in MVP | ☐ |
| E-invoicing | Already gated by `Store.einvoiceEnabled`; IRP API integration in Phase 7 | ☐ |
| Shipping charge tax treatment | **Open question** — treat as 0% or pass through HSN 9968 (courier services) at 18%? | ☐ |
| Apparel ₹2,500 slab override | Auto-compute at checkout based on actual line price | ☐ |
| Discount-then-tax order | Always tax on post-discount inclusive | ☐ |
| Cashback / post-supply discount | Out of scope | ☐ |
| International orders | Out of scope (export = zero-rated, separate flow) | ☐ |

---

## 11. Database columns reference

### Already present
```
Store.gstin                String?
Store.einvoiceEnabled      Boolean @default(false)
Store.invoiceCounter       Int     @default(0)         (verify)
Product.hsnCode            String?
Product.taxRate            Decimal? @db.Decimal(5,2)
Product.cessRate           Decimal? @default(0)
Product.isExempt           Boolean  @default(false)
Product.ucsCode            String?  @default("PCS")
OrderItem.hsnCodeSnapshot  String?
OrderItem.taxRateSnapshot  Decimal? @db.Decimal(5,2)
OrderItem.cessRateSnapshot Decimal?
```

### Needed for Phase 5.1
```
Store.gstRegistered        Boolean   @default(false)
Store.priceMode            PriceMode @default(INCLUSIVE)
Store.allowB2BInvoices     Boolean   @default(false)
```

### Needed for Phase 6
```
Order.subtotal             Decimal  @db.Decimal(12,2)
Order.couponDiscount       Decimal  @db.Decimal(12,2) @default(0)
Order.totalTax             Decimal  @db.Decimal(12,2) @default(0)
Order.totalCess            Decimal  @db.Decimal(12,2) @default(0)
Order.shippingAmount       Decimal  @db.Decimal(12,2) @default(0)
Order.roundOffAmount       Decimal  @db.Decimal(5,2)  @default(0)
Order.grandTotal           Decimal  @db.Decimal(12,2)
Order.placeOfSupplyStateCode String
Order.taxRegime            TaxRegime  // INTRA_STATE | INTER_STATE | EXEMPT | NONE
Order.documentType         DocumentType  // TAX_INVOICE | BILL_OF_SUPPLY | RECEIPT
Order.buyerGstin           String?
Order.buyerLegalName       String?
Order.isB2B                Boolean   @default(false)

OrderItem.unitPriceInclusive  Decimal @db.Decimal(12,2)  // listed price
OrderItem.discountAmount      Decimal @db.Decimal(12,2)  @default(0)
OrderItem.taxableAmount       Decimal @db.Decimal(12,2)
OrderItem.cgstAmount          Decimal @db.Decimal(12,2)  @default(0)
OrderItem.sgstAmount          Decimal @db.Decimal(12,2)  @default(0)
OrderItem.igstAmount          Decimal @db.Decimal(12,2)  @default(0)
OrderItem.cessAmount          Decimal @db.Decimal(12,2)  @default(0)
OrderItem.lineTotal           Decimal @db.Decimal(12,2)  // taxable + all taxes

Payment.razorpayPaymentId  String   @unique
Payment.razorpayOrderId    String
Payment.amount             Decimal  @db.Decimal(12,2)
Payment.currency           String   @default("INR")
Payment.status             PaymentStatus
Payment.method             String?
Payment.capturedAt         DateTime?
Payment.orderId            String   // FK
```

### Needed for Phase 7 (invoice)
```
Invoice.invoiceNumber      String   @unique  // INV-2024-0001
Invoice.invoiceDate        DateTime
Invoice.documentType       DocumentType
Invoice.pdfUrl             String?
Invoice.irn                String?  @unique  // e-invoice
Invoice.qrCodeData         String?
Invoice.orderId            String   // FK
Invoice.emailedAt          DateTime?
```

---

## 12. Phase-by-phase code map

| Phase | Status | Files of interest |
| ----- | ------ | ----------------- |
| 1–3   | ✅ Done (subscription identity, billing form, gst-validators, snapshot fields) | `src/lib/billing/gst-validators.ts`, `src/app/api/settings/billing/*` |
| 4     | ✅ Done (subscription tax, billing preflight) | `src/lib/billing/subscription-tax.ts`, `src/components/subscription/billing-preflight-modal.tsx`, `src/app/(dashboard)/subscription/components/plan-card.tsx`, `src/app/api/subscription/verify/route.ts` |
| 5     | ✅ Done (HSN dataset, lookup, product tax form, API guards) | `src/lib/billing/data/hsn-reference.json`, `src/lib/billing/hsn-lookup.ts`, `src/app/(dashboard)/[storeId]/(routes)/products/[productId]/components/product-tax-compliance.tsx`, product-form, page, both API routes |
| **5.1** | ⏭ Next | Add `gstRegistered`, `priceMode`, `allowB2BInvoices` to Store; settings tab UI; cascading visibility on product form |
| 6     | ⏭ Planned | `src/lib/billing/order-tax.ts`, storefront checkout API, OrderItem + Order tax columns, Payment table |
| 7     | ⏭ Planned | Invoice generator (`pdf-lib` / `@react-pdf/renderer`), invoice numbering, IRN integration, email worker |
| 8     | ⏭ Future | GSTR-1 export (CSV/Excel), per-rate-bucket totals, monthly report screen |

---

## Glossary

| Term | Meaning |
| ---- | ------- |
| ITC | Input Tax Credit — GST paid on purchases that you can offset against GST collected on sales |
| ECO | E-commerce Operator — marketplace facilitator (Amazon, Flipkart) |
| ECF | E-commerce Facilitator (informal) — what shop-builder SaaS like Shopify/ShopPulse are sometimes called |
| IRP | Invoice Registration Portal — government portal for e-invoicing |
| IRN | Invoice Reference Number — 64-char hash returned by IRP |
| GSTR | GST Return — periodic statutory filing |
| HSN | Harmonized System Nomenclature — 4/6/8-digit goods code |
| SAC | Service Accounting Code — 6-digit services code |
| UCS / UQC | Unit Quantity Code — standardised unit of measure |
| RCM | Reverse Charge Mechanism — buyer pays tax instead of seller |
| POS | Place of Supply (in GST context, not Point of Sale) |
| FBA | Fulfilment by Amazon — Amazon stores your inventory |
| DTH | Direct-to-Home (irrelevant — included to disambiguate from "D2C") |
| D2C | Direct-to-Consumer — brand sells on its own site/store |
| Composition | Simplified flat-rate scheme for small sellers (kept out of MVP UI in current plan) |
| Bill of Supply | Tax-less invoice document |

---

> End of Part 2.
> When new tax features are added, append to this document. Keep it the
> single source of truth.
