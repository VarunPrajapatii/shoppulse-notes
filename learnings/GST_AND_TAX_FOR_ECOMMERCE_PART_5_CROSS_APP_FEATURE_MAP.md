# GST & Tax for D2C E-commerce — Part 5: Cross-App Feature Map

> The "where does it change" map. Every ShopPulse screen / API / module
> that needs awareness of the seller's tax registration status, and what
> exactly changes based on the scheme.
>
> Use this when you sit down to actually code Phase 5.1 / 6 / 7. It tells
> you precisely which files to touch.

> Companion docs: Part 1–4. Decision references (D1, D4, etc.) point back
> to Part 4 — Decision Sheet.

---

## 2026 correction note

- This map follows GST 2.0 assumptions from updated Parts 1–4.
- Apparel threshold logic in all implementation references is **₹2,500** split
  (<= ₹2,500 at 5%, > ₹2,500 at 18%).

---

## Scope assumptions

Per Part 4:
- **2 schemes only**: `Unregistered` (default), `Registered`. (D1)
- **Price mode toggle enabled** with default `INCLUSIVE` and advanced `EXCLUSIVE`. (D4)
- **No plan-gating** of tax features. (D15)

The single source of truth is `Store.gstRegistered: Boolean`. Storefront API
exposes derived flags so the storefront never reads the boolean directly.

---

## Part A — Admin Dashboard (the seller's UI)

### A1. Onboarding wizard (post-store-creation)
**Where**: `src/app/(dashboard)/(routes)/setup/...` (verify exact path)
**What changes**:
- New step: "Tax registration" with the 2 cards (Part 3 Section C).
- Saves to `Store.gstRegistered` + (if Registered) `Store.gstin`.
- Skippable; defaults to Unregistered.

### A2. Settings → Tax tab
**Where**: New tab inside `src/app/(dashboard)/[storeId]/(routes)/settings/...`
**What changes**:
- Renders the same 2 cards.
- "Save" triggers a confirmation modal explaining changes (per Part 2 §2 transitions A/B).
- Sub-fields when Registered: GSTIN (validated), state (auto-derived), advanced toggle for `allowB2BInvoices`, advanced toggle for `priceMode` (Inclusive/Exclusive, default Inclusive — D4).
- **Once flipped to Registered, the scheme toggle becomes read-only** (D19 — downgrade is support-only). Tooltip points users to support.
- **No `einvoiceEnabled` toggle in MVP** — e-invoicing is deferred (D11). Hidden entirely; field omitted from API payload.

### A3. Sidebar / dashboard nudge
**Where**: Wherever the sidebar / top-bar lives (`src/components/layout/...`)
**What changes**:
- If `gstRegistered === false` AND trailing-12-month revenue > ₹35L → show amber banner.
- "Set up GST" CTA → routes to Settings → Tax.
- Dismissable for 7 days; resurfaces.

### A4. Product create/edit form
**Where**: [src/app/(dashboard)/[storeId]/(routes)/products/[productId]/components/product-form.tsx](src/app/(dashboard)/[storeId]/(routes)/products/[productId]/components/product-form.tsx)
**What changes**:
- Tax & Compliance card visible only when `storeGstRegistered === true` (D11 deferred — no e-invoice path needed).
- ✅ Already implemented in Phase 5. Rename prop `storeHasGst` → `storeGstRegistered` for clarity.
- **Bracketed HSN handling (D6)**: when selected HSN has `bracketRule`, GST-rate dropdown becomes read-only with text `Auto (5% / 18% by price)`. For non-bracketed HSNs the rate is editable with default = `hsn.defaultRate`.

### A5. Pricing card on product form
**Where**: Same product-form file
**What changes (Phase 5.1)**:
- Add live preview sub-text under Selling Price field when registered AND product has rate.
- Pure client-side computation. No new API.
- Format: `"₹649 includes 5% GST · Taxable: ₹618.10 · CGST: ₹15.45 · SGST: ₹15.45"`.
- Only renders for Registered stores.

### A6. Product list page
**Where**: `src/app/(dashboard)/[storeId]/(routes)/products/page.tsx` and the row component.
**What changes (Phase 5.1)**:
- For Registered stores: show a small amber dot/icon on rows where `hsnCode IS NULL OR taxRate IS NULL`.
- Add filter "Needs tax info" to the products list filter bar.

### A7. Tax-readiness card on Settings → Tax (D12 grace + auto-archive)
**Where**: New component on the Settings → Tax tab
**What renders (Phase 5.1)**:
- After scheme flip Unregistered → Registered, capture `gstRegisteredAt` and start a **7-day grace window**.
- Card shows: "X of Y products are missing HSN / GST rate. Fix within N days or they will be auto-archived from sale."
- Reminder emails on day 1, 3, 6.
- Day 7 cron: products still missing required tax fields are flipped to `isArchived = true` (still editable in admin, hidden from storefront). Audit log row written.
- Re-activation: when merchant fills the missing fields, product un-archives automatically and a notification fires.
- Card disappears when count hits 0; reappears if any new product is created without tax info while Registered.

### A8. Order detail page (admin)
**Where**: `src/app/(dashboard)/[storeId]/(routes)/orders/[orderId]/page.tsx` (verify)
**What changes (Phase 6)**:
- Renders tax breakdown table iff `Order.totalTax > 0`.
- Otherwise plain "Subtotal / Shipping / Total" view.
- Shows derived `documentType` badge ("Tax Invoice" / "Receipt").
- Lines without HSN/rate (in a Registered store) get amber warning icon with tooltip "Sold without HSN — affects GSTR-1".

### A9. Order list page
**Where**: `src/app/(dashboard)/[storeId]/(routes)/orders/page.tsx`
**What changes**: No change. Tax fields don't appear in the list rows.

### A10. Subscription / billing pages
**Where**: `src/app/(dashboard)/subscription/...`
**What changes**: No change. Subscription tax (Phase 4) is independent from store-side tax. Already handled.

---

## Part B — Storefront (the buyer's UI, separate Next.js repo)

### B1. Storefront config API
**Where**: `src/app/api/storefront/[storeDomain]/config/route.ts` (verify path)
**What changes (Phase 5.1)**:
- Add `tax: { ... }` block. **Final shape is TBD per D21** — the structure below is a draft; lock during the Phase 6 implementation spike:
  ```ts
  tax: {
    gstRegistered: boolean,
    priceMode: 'INCLUSIVE' | 'EXCLUSIVE',   // D4 toggle
    showTaxBreakdownOnPDP: boolean,
    showTaxBreakdownOnCart: boolean,
    showTaxBreakdownOnCheckout: boolean,
    allowB2BInvoices: boolean,
    sellerStateCode: string | null,
    documentType: 'TAX_INVOICE' | 'RECEIPT'
  }
  ```

### B2. Product page (storefront)
**Where**: Storefront repo, product detail component
**What changes**:
- If `tax.showTaxBreakdownOnPDP` → render "(incl. X% GST)" badge under price.
- Else → just price.

### B3. Cart page (storefront)
**Where**: Storefront repo, cart component
**What changes**:
- If `tax.showTaxBreakdownOnCart` → render small tax sub-line per item.
- Else → just line total.

### B4. Checkout summary (storefront)
**Where**: Storefront repo, checkout summary component
**What changes**:
- If `tax.showTaxBreakdownOnCheckout` → render CGST/SGST or IGST rows + cess row + round-off row.
- Else → just subtotal / shipping / total.

### B5. Checkout B2B GSTIN section
**Where**: Storefront repo, new component
**What changes**:
- If `tax.allowB2BInvoices` → render the B2B GSTIN collapsible per Part 2 §9.
- Validates via `POST /api/storefront/validate-gstin` (new public endpoint).

### B6. Order confirmation page (storefront)
**Where**: Storefront repo, order success component
**What changes**:
- Show document type label ("Tax Invoice" / "Receipt") and "Download PDF" button.
- PDF link goes to `GET /api/storefront/orders/[orderId]/invoice` (Phase 7 endpoint).

---

## Part C — APIs (the contract layer)

### C1. POST product API
**Where**: [src/app/api/[storeId]/products/route.ts](src/app/api/[storeId]/products/route.ts)
**What changes**: ✅ Phase 5 already added HSN format guard. **Add (Phase 5.1)**: reject manual `taxRate` if HSN has a `bracketRule` (D6).

### C2. PATCH product API
**Where**: [src/app/api/[storeId]/products/[productId]/route.ts](src/app/api/[storeId]/products/[productId]/route.ts)
**What changes**: ✅ Same guards as C1. Add bracketed-HSN guard.

### C3. PATCH /api/settings/store (or wherever scheme is saved)
**Where**: To be located (Settings save endpoint)
**What changes (Phase 5.1)**:
- Accept `gstRegistered`, `gstin`, `allowB2BInvoices`, `priceMode`. **Do not accept `einvoiceEnabled`** (D11 deferred).
- If `gstRegistered === true` → require valid GSTIN.
- **Reject any payload that flips `gstRegistered` from `true` → `false`** (D19 deferred). Return 403 with message: *"Status downgrade is not self-serve. Contact support."*
- Returns updated store + tax-readiness audit count + grace-window deadline (D12).

### C4. Storefront checkout API (compute order)
**Where**: To be located (Phase 6 will identify or create)
**What changes (Phase 6)**:
- Resolve `placeOfSupplyStateCode` from buyer address (or B2B GSTIN's state if `isB2B`).
- For each line: compute taxes via new `computeOrderTaxes()` helper.
- Save `Order` and `OrderItem` with all tax fields populated.
- Save `Payment` row.
- Emit "order.paid" event for invoice worker.

### C5. Storefront GSTIN validation API
**Where**: New endpoint `src/app/api/storefront/validate-gstin/route.ts`
**What changes (Phase 6)**:
- Public, rate-limited (10 req/min/IP).
- Calls `validateGstin()` from `gst-validators.ts`.
- Returns `{ valid, stateCode, stateName }`.

### C6. Invoice generation API
**Where**: Phase 7. New endpoint.
**What changes**: Generates PDF (Tax Invoice / Bill of Supply / Receipt) based on order snapshot. Optionally hits IRP for IRN if `einvoiceEnabled`.

### C7. GSTR-1 export API
**Where**: Phase 8. New endpoint.
**What changes**: Generates CSV/Excel for the merchant's CA.

---

## Part D — Database (schema additions)

### D1. Phase 5.1 (next sprint) additions
```prisma
model Store {
  // existing
  gstin              String?
  einvoiceEnabled    Boolean   @default(false)   // kept in schema, hidden in UI (D11 deferred)

  // new in Phase 5.1
  gstRegistered      Boolean   @default(false)   // explicit toggle (D1)
  gstRegisteredAt    DateTime?                    // start of D12 grace window
  allowB2BInvoices   Boolean   @default(false)   // (D8)
  priceMode          String    @default("INCLUSIVE")  // D4 toggle, default Inclusive
}
```
*Backfill migration*: **Not needed** — DB is empty pre-production (D20). New stores start with defaults.

### D2. Phase 6 additions
```prisma
model Order {
  // existing
  // ...

  // Phase 6 tax columns
  subtotal              Decimal  @db.Decimal(12,2)
  couponDiscount        Decimal  @db.Decimal(12,2) @default(0)
  totalTax              Decimal  @db.Decimal(12,2) @default(0)
  totalCess             Decimal  @db.Decimal(12,2) @default(0)
  shippingAmount        Decimal  @db.Decimal(12,2) @default(0)
  roundOffAmount        Decimal  @db.Decimal(5,2)  @default(0)
  grandTotal            Decimal  @db.Decimal(12,2)
  placeOfSupplyStateCode String?
  taxRegime             String?   // 'INTRA_STATE' | 'INTER_STATE' | 'NONE'
  documentType          String   @default("RECEIPT")  // 'TAX_INVOICE' | 'BILL_OF_SUPPLY' | 'RECEIPT'
  buyerGstin            String?
  buyerLegalName        String?
  isB2B                 Boolean  @default(false)
}

model OrderItem {
  // existing snapshot fields
  hsnCodeSnapshot   String?
  taxRateSnapshot   Decimal? @db.Decimal(5,2)
  cessRateSnapshot  Decimal?

  // Phase 6 additions
  unitPriceInclusive  Decimal @db.Decimal(12,2)
  discountAmount      Decimal @db.Decimal(12,2) @default(0)
  taxableAmount       Decimal @db.Decimal(12,2) @default(0)
  cgstAmount          Decimal @db.Decimal(12,2) @default(0)
  sgstAmount          Decimal @db.Decimal(12,2) @default(0)
  igstAmount          Decimal @db.Decimal(12,2) @default(0)
  cessAmount          Decimal @db.Decimal(12,2) @default(0)
  lineTotal           Decimal @db.Decimal(12,2) @default(0)
  taxRateSource       String? // 'BRACKET' | 'MANUAL' | 'HSN_DEFAULT' (D6 audit trail)
  // NOTE: isReverseCharge dropped per D9 — no RCM schema field in MVP.
}

model Payment {
  id                String   @id @default(cuid())
  razorpayPaymentId String   @unique
  razorpayOrderId   String
  amount            Decimal  @db.Decimal(12,2)
  currency          String   @default("INR")
  status            String   // 'CAPTURED' | 'AUTHORIZED' | 'FAILED' | 'REFUNDED'
  method            String?
  capturedAt        DateTime?
  orderId           String
  order             Order    @relation(fields: [orderId], references: [id])
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### D3. Phase 7 additions
```prisma
model Invoice {
  id             String   @id @default(cuid())
  invoiceNumber  String   @unique
  invoiceDate    DateTime
  documentType   String   // mirrors Order.documentType
  pdfUrl         String?
  irn            String?  @unique  // for e-invoice
  qrCodeData     String?
  orderId        String
  order          Order    @relation(fields: [orderId], references: [id])
  emailedAt      DateTime?
  createdAt      DateTime @default(now())
}

model Store {
  // additions for invoice numbering
  invoicePrefix    String? @default("INV")
  invoiceCounter   Int     @default(0)
  invoiceFinancialYear String? @default("2024-25")  // resets counter each FY
}
```

---

## Part E — Helpers (the pure logic layer)

| File | Purpose | Phase |
|---|---|---|
| `src/lib/billing/gst-validators.ts` | GSTIN/PAN/PIN validation. ✅ Done | — |
| `src/lib/billing/subscription-tax.ts` | SaaS subscription tax math. ✅ Done | 4 |
| `src/lib/billing/data/hsn-reference.json` | HSN dataset. ✅ Done. Phase 5.1: add `bracketRule` field to apparel/footwear codes (D6) | 5 / 5.1 |
| `src/lib/billing/hsn-lookup.ts` | HSN search + utils. ✅ Done. Phase 5.1: add `getEffectiveRate(hsn, unitPrice, manualRate)` (D6) | 5 / 5.1 |
| `src/lib/billing/order-tax.ts` | **New**. `computeOrderTaxes()` calls `getEffectiveRate` per line + round-off | 6 |
| `src/lib/billing/place-of-supply.ts` | **New**. `derivePlaceOfSupply({ buyerStateCode, gstinStateCode, isB2B })` returning state code + regime | 6 |
| `src/lib/billing/document-type.ts` | **New**. Pure function deriving 'TAX_INVOICE' \| 'BILL_OF_SUPPLY' \| 'RECEIPT' from order snapshot | 6 |
| `src/lib/billing/invoice-numbering.ts` | **New**. Atomic invoice number generation | 7 |
| `src/lib/billing/invoice-pdf.ts` | **New**. PDF rendering | 7 |
| `src/lib/billing/irn-client.ts` | **New**. IRP API client | 7 |
| `src/lib/billing/gstr1-export.ts` | **New**. CSV/Excel export | 8 |

---

## Part F — Cross-cutting test plan

For each feature, two-archetype testing:

| Test | Sunita (Unregistered) | Rahul (Registered) |
|---|---|---|
| Add product | Tax fields hidden, save works | Tax fields visible, HSN search works, save works |
| Place order intra-state | No tax line, Receipt generated | CGST+SGST split, Tax Invoice |
| Place order inter-state | No tax line, Receipt generated | IGST single line, Tax Invoice |
| Switch scheme | Modal explains change, switch works | Same |
| Tax-readiness audit | N/A | Card appears, fixes flow works |
| B2B GSTIN at checkout | Section hidden | Section appears (if `allowB2BInvoices`) |
| Refund single line | Exact paise refund | Exact paise refund |

---

## Part G — Implementation order (Phase 5.1 → 6 → 7 → 8)

### Phase 5.1 (next; small, can ship in 1 sprint)
1. Add `Store.gstRegistered`, `Store.allowB2BInvoices`, `Store.priceMode` columns + backfill migration. (D20)
2. Settings → Tax tab UI with 2-card chooser. (D2)
3. Replace `storeHasGst` derivation in product-form/page with explicit `gstRegistered` flag. (A4)
4. Add live tax preview sub-text on product form. (A5, D24)
5. Add tax-readiness card on Settings → Tax. (A7, D12)
6. Add amber dot + filter on product list. (A6)
7. Onboarding wizard tax step. (A1)

### Phase 6 (the big one)
1. New schema columns (Order, OrderItem, Payment).
2. `order-tax.ts`, `place-of-supply.ts`, `document-type.ts` pure helpers + tests.
3. Storefront checkout API integration: compute taxes, save snapshot.
4. Storefront API config response with `tax` block. (B1)
5. Storefront UI updates (PDP, cart, checkout). (B2–B4)
6. B2B GSTIN section + validation endpoint. (B5, C5)
7. Razorpay verify handler → Payment row + "order.paid" event.
8. Order detail admin page tax breakdown. (A8)

### Phase 7 (Invoice generation)
1. Invoice schema + numbering.
2. PDF renderer (3 templates).
3. IRP integration for e-invoice-enabled stores.
4. Email worker.

### Phase 8 (Reporting)
1. GSTR-1 export (CSV/Excel).
2. Monthly tax summary screen.

---

## Decision-to-implementation traceability

| Decision | Lives in code at |
|---|---|
| D1 (2 schemes) | `Store.gstRegistered` boolean |
| D4 (Inclusive/Exclusive toggle) | `Store.priceMode` (default INCLUSIVE), advanced setting in Settings → Tax |
| D5 (Round-off) | `order-tax.ts` `applyRoundOff()` |
| D6 (Apparel bracket, hybrid) | `hsn-reference.json#bracketRule` + `hsn-lookup.ts#getEffectiveRate` + `order-tax.ts` snapshot |
| D7 (Shipping) | `order-tax.ts` shipping treated as non-taxable line |
| D8 (B2B) | `Store.allowB2BInvoices` + storefront B2B section |
| D9 (RCM) | **Dropped entirely** — no schema field, no UI |
| D11 (E-invoicing) | **Deferred** — schema column kept hidden, no UI surface |
| D12 (Grace + archive) | Settings tab card + 7-day cron + product auto-archive |
| D13 (Doc type) | `document-type.ts` |
| D15 (No plan gating) | Plan checks NOT added to tax modules |
| D19 (Downgrade) | API rejects `true → false` flip; Settings toggle locked once Registered |
| D21 (Storefront flags) | Config API response shape — final lock during Phase 6 spike |
| D24 (Live preview) | product-form sub-text component (with bracketed-HSN dual-side preview) |

---

> This is the operational map. When you sit to code Phase 5.1, open this
> file alongside the code editor and tick off A1, A2, A5, A6, A7, B1, C3,
> D1 in order. Each is small; the whole sprint is sub-3 days of work.
>
> When you sit for Phase 6, the order is D2, E (helpers), C4, B1, B2–B4,
> B5+C5, A8.
>
> No more "where do I start" anxiety. Map it, code it, ship it.
