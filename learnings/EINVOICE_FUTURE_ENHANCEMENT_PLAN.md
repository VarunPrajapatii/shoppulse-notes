# E-Invoice (NIC IRP) — Future Enhancement Plan

> **Status:** Deferred. Not built. This document captures everything we
> learnt while designing GST 2.0 + the 3-day grace system, plus a clean
> step-by-step plan for the day a seller on ShopPulse crosses
> ₹5 crore aggregate annual turnover and legally needs e-invoicing.
>
> Until that day, `Store.einvoiceEnabled` is purely a UI flag. There
> is **no IRP API integration in the codebase yet** — turning it on
> only changes the wording of the "tax fields required" error.

---

## Part 1 — Learnings (what e-invoice actually is)

### 1.1 Plain-English definition

**E-invoice ≠ a PDF emailed to a buyer.** It is a separate compliance
flow run *before* the regular tax invoice is issued:

1. Seller's billing software (us) builds a JSON payload from the order.
2. Software POSTs that JSON to the **NIC Invoice Registration Portal
   (IRP)** — a government API.
3. IRP validates the payload (HSN must exist, GSTIN must be live,
   amounts must reconcile, UCS must be valid, etc.) and returns:
   - **IRN** — Invoice Reference Number, a 64-char SHA-256 hash.
   - **Acknowledgement number + timestamp**.
   - **QR code** (signed by the government's private key) embedded on
     the invoice PDF.
4. Only **after** IRN is received is the invoice legally valid. The
   regular tax invoice PDF then carries IRN + QR.
5. The IRN auto-populates the seller's GSTR-1 return and the buyer's
   GSTR-2B (no manual filing for those line items).

### 1.2 Who must do this

- **Mandatory** when a registered taxpayer's **aggregate annual
  turnover (PAN-level) crosses ₹5 crore** in any financial year from
  2017-18 onwards.
- **Once mandated, always mandated** — even if turnover later drops.
- **B2B + exports + credit/debit notes only.** B2C invoices are
  exempt from IRP (they only need a B2C QR if turnover ≥ ₹500cr,
  which is out of scope for ShopPulse's target market).
- Exempt categories: SEZ developers, insurers, banks, NBFCs, GTAs,
  passenger transport, cinema admissions, government departments.

### 1.3 Why our current `einvoiceEnabled` flag exists but does nothing

The schema field `Store.einvoiceEnabled` predates the GST 2.0 grace
work. It was added with the intent of someday gating an IRP integration
but the integration was never built. Today the flag only affects:

- Error wording in `POST /[storeId]/products` and PATCH
  (`'Your store has e-invoicing enabled — products need ...'` vs the
  registered-only message).
- Nothing else. No actual API call. No IRN storage. No QR rendering.

### 1.4 Why it kept showing up in the GST 2.0 conversation

Before the grace+cron work, the **only strict server-side block** on
missing tax fields was `if (store.einvoiceEnabled) reject(...)`. That
left every regular GST-registered seller (turnover < ₹5cr — the bulk
of ShopPulse's users) with no enforcement at all. They could create
products with blank HSN/rate, and only the new 3-day grace cron would
catch them.

The recent fix widened that block to fire for **any** GST-registered
store, using the same `isProductGstCompliant` predicate. E-invoice is
now strictly a stricter superset (same fields required, just stricter
wording + downstream IRP consequence later).

### 1.5 Key technical learnings

- **IRN must be generated within 30 days of invoice date** (CBIC
  notification 13/2024). We MUST queue the IRP call inline at
  invoice-create time, not nightly.
- **IRP rejects on first failure** — no partial accept. Payload
  validation has to be airtight before the call.
- **Idempotency:** Once an IRN is generated, the same invoice cannot
  be sent again. We must persist `irn` + `ackNo` + `signedQR` and
  short-circuit if already present.
- **Retry strategy:** IRP returns `2150` (already exists) for
  duplicates — treat as success and pull the existing IRN via the
  `Get IRN by Doc Details` endpoint.
- **Cancellation window:** IRN can only be cancelled within 24 hours.
  After that, only a credit note (with its own IRN) reverses it.
- **Sandbox vs production:** Two separate base URLs, separate
  credentials, separate certificates. Toggle by env.
- **Auth flow:** Username/password → access token (valid 6 hours) →
  scope all subsequent calls. Token must be cached + refreshed.
- **Amount tolerance:** IRP allows ±1 rupee mismatch on
  `TotalInvVal` vs computed line totals. Anything more is a hard
  reject. Our tax engine must round consistently.

---

## Part 2 — Implementation plan (when a seller crosses ₹5cr)

### Phase 0 — Detection trigger (before any code)

- Add a daily cron `/api/cron/check-aggregate-turnover` that sums each
  seller's PAN-level financial-year revenue from `Order.totalAmount`
  where `paymentStatus = 'PAID'`.
- When a seller crosses **₹5cr in any FY since 2017-18**, set
  `Store.einvoiceMandatoryAt = now()` and notify: "Your store has
  crossed ₹5cr turnover — e-invoicing is now mandatory by GST law.
  Activate e-invoicing in Settings → Tax."
- Surface a red banner on the dashboard if `einvoiceMandatoryAt`
  is set but `einvoiceEnabled` is false.

### Phase 1 — Settings UX

- Add Settings → Tax → "E-invoicing (NIC IRP)" panel.
- Fields:
  - GSTIN username (NIC IRP credential, NOT GSTN)
  - GSTIN password (encrypted at rest with `crypto.subtle` AES-GCM,
    key from `EINVOICE_ENCRYPTION_KEY` env)
  - Sandbox vs Production toggle
  - "Test connection" button → calls `POST /eivital/v1.04/auth`
    against the chosen environment, surfaces success/failure.
- Save flow:
  1. Encrypt credentials.
  2. Run a real auth call. Reject save if auth fails.
  3. Set `einvoiceEnabled = true` only after a successful test.

### Phase 2 — Schema additions

```prisma
model Store {
  // ... existing fields
  einvoiceMandatoryAt    DateTime?
  einvoiceEnabled        Boolean   @default(false)  // already exists
  einvoiceUsername       String?   // encrypted
  einvoicePassword       String?   // encrypted
  einvoiceEnvironment    String?   // 'SANDBOX' | 'PRODUCTION'
  einvoiceTokenCache     String?   // encrypted JSON {token, expiresAt}
}

model Order {
  // ... existing fields
  irn               String?  @unique
  irnAckNo          String?
  irnAckDate        DateTime?
  irnSignedInvoice  String?  @db.Text   // signed JWT from IRP
  irnSignedQrCode   String?  @db.Text   // base64 QR payload
  irnStatus         String?  // 'PENDING' | 'GENERATED' | 'FAILED' | 'CANCELLED'
  irnFailureCode    String?
  irnFailureReason  String?
  irnAttemptCount   Int      @default(0)
  irnLastAttemptAt  DateTime?
  irnCancelledAt    DateTime?
  irnCancelReason   String?
}
```

### Phase 3 — IRP HTTP client (`src/lib/billing/einvoice/irp-client.ts`)

- Wrap NIC IRP REST endpoints:
  - `POST /eivital/v1.04/auth` — get access token.
  - `POST /eicore/v1.03/Invoice` — generate IRN.
  - `POST /eicore/v1.03/Invoice/Cancel` — cancel within 24h.
  - `GET /eicore/v1.03/Invoice/irn/{irn}` — fetch existing IRN.
- Token caching: in-memory + persisted to `Store.einvoiceTokenCache`
  with 5-minute safety margin before expiry.
- All requests signed with `client-id` + `client-secret` headers
  (provided by NIC after onboarding through GSP).
- Retry: 3 attempts with exponential backoff for 5xx + network
  errors. NEVER retry 4xx (deterministic rejects).

### Phase 4 — Payload builder (`src/lib/billing/einvoice/payload-builder.ts`)

- Pure function `buildIrpPayload(order, store, lines): IrpInvoiceRequest`.
- Maps our Order + Lines to the IRP schema (≈ 40 fields). Critical:
  - `Version: '1.1'`
  - `TranDtls.SupTyp` — `B2B`, `EXPWP`, `EXPWOP`, `SEZWP`, `SEZWOP`,
    `DEXP`.
  - `DocDtls.Typ` — `INV`, `CRN`, `DBN`.
  - `SellerDtls` — pulled from store GSTIN registry data.
  - `BuyerDtls` — must include valid GSTIN. B2C orders skip e-invoice
    entirely.
  - `ItemList[].HsnCd` — must be 8-digit. Pad if 4/6.
  - `ItemList[].UnitPrice`, `TotAmt`, `Discount`, `PreTaxVal`,
    `AssAmt`, `GstRt`, `IgstAmt` / `CgstAmt` / `SgstAmt`, `CesRt`,
    `CesNonAdvlAmt`, `TotItemVal`.
  - `ValDtls.AssVal`, `IgstVal`, `CgstVal`, `SgstVal`, `CesVal`,
    `RndOffAmt`, `TotInvVal` — must reconcile within ±1 INR.

### Phase 5 — Order-create hook

- After payment success in `POST /api/[storeId]/checkout/payment-verify`:
  1. If `store.einvoiceEnabled === false`, skip (regular invoice only).
  2. If `order.buyerGstin == null`, skip (B2C — no IRP needed).
  3. Enqueue an inline call: `generateIrn(orderId)`.
  4. On success → persist IRN fields + render PDF with QR.
  5. On failure → set `irnStatus = 'FAILED'` + alert seller dashboard
     + retry queue (max 3 retries over 24h, then manual intervention).
- DO NOT block the customer order-confirmation page on IRN — IRP
  occasionally has 30s+ latency. Show "Tax invoice will be emailed
  shortly" + email when IRN lands.

### Phase 6 — PDF rendering

- Update `src/lib/invoice/pdf-renderer.ts` (or wherever invoice PDFs
  are built) to:
  - Accept the `irnSignedQrCode` (base64 string).
  - Render a 2cm × 2cm QR in the invoice header (CBIC requirement).
  - Print the IRN + Ack No + Ack Date in a footer block.
- Without IRN: render normal tax invoice (for non-mandated sellers
  or B2C).

### Phase 7 — Cancellation flow

- Add Settings → Orders → Cancel IRN button (only visible when
  `irnStatus === 'GENERATED'` AND `irnAckDate` is within 24 hours).
- Reasons enum: `1 - Duplicate`, `2 - Data Entry Mistake`,
  `3 - Order Cancelled`, `4 - Other`.
- After cancellation: set `irnStatus = 'CANCELLED'`, regenerate
  invoice PDF without QR + with watermark "CANCELLED".
- Beyond 24h: redirect seller to credit-note flow (separate IRN).

### Phase 8 — Reconciliation

- Daily cron `/api/cron/einvoice-reconcile`:
  - For every `irnStatus = 'GENERATED'` order, optionally call
    `Get IRN by IRN` and verify the signed payload still matches.
    (Catches IRP-side rollbacks — rare but possible.)
  - For every `irnStatus = 'FAILED'` older than 7 days with
    `irnAttemptCount < 5`, retry with refreshed token.
  - Surface stuck orders on a `/dashboard/[storeId]/einvoice/issues`
    page with one-click manual retry.

### Phase 9 — Onboarding via GSP

- NIC IRP requires API access through a **GST Suvidha Provider (GSP)**.
  ShopPulse will need to register with one (Cygnet, ClearTax, Masters
  India, or Tally) and obtain `client-id` + `client-secret`.
- One-time setup: ~₹50k-₹2L per year per GSP. Choose a GSP that
  matches expected invoice volume. Document the chosen GSP's quirks
  here when selected.

### Phase 10 — Testing

- Unit tests for payload builder against NIC sample payloads
  (publicly available on einvoice1.gst.gov.in).
- Integration tests against the **sandbox** environment using
  ShopPulse's sandbox GSTIN.
- Load test: 100 concurrent IRP calls — IRP rate-limits to
  ~1000 calls/min per GSTIN, so a queue + token bucket is needed
  for high-volume sellers.

---

## Part 3 — Decision sheet for "the day it ships"

| Question                                          | Default                                                |
| ------------------------------------------------- | ------------------------------------------------------ |
| Is the seller a candidate?                        | Aggregate annual turnover ≥ ₹5cr (PAN-level, any FY)   |
| Should we auto-enable?                            | NO. Set `einvoiceMandatoryAt`, let seller activate.    |
| Inline at order vs nightly batch?                 | Inline (30-day legal cap, customer expectation)        |
| Block customer checkout on IRP failure?           | NO. Generate order, retry IRN async, alert seller.     |
| Build our own IRP client or use a GSP SDK?        | Use GSP SDK initially. Roll our own only at scale.     |
| Where do credentials live?                        | Encrypted in DB (`Store.einvoiceUsername/Password`).    |
| Sandbox in dev?                                   | Yes. `EINVOICE_ENV=sandbox` in `.env.local`.            |
| What about credit notes?                          | Separate IRN per CRN/DBN. Same flow, different `Typ`.  |
| Schema change to existing Order rows?             | All new IRN columns nullable. No backfill needed.      |

---

## Part 4 — Glossary

- **IRP** — Invoice Registration Portal. The government API run by
  NIC at `https://einvoice1.gst.gov.in`.
- **IRN** — Invoice Reference Number. The 64-char SHA-256 hash
  returned by IRP that legally registers the invoice.
- **GSP** — GST Suvidha Provider. Authorised middleman for IRP API
  access (mandatory).
- **NIC** — National Informatics Centre. The body running IRP.
- **GSTR-1** — Monthly outward-supplies return. IRN auto-populates.
- **GSTR-2B** — Buyer-side static input-tax-credit statement.
- **B2B / B2C / SEZ / EXP** — Supply-type codes used in the IRP
  payload.
- **Aggregate turnover** — PAN-level (not GSTIN-level), all-India,
  including exempt + zero-rated supplies.

---

## Part 5 — TL;DR for future-me

1. **Don't pre-build this.** Wait for the first seller to cross ₹5cr.
2. When that happens, the order is: GSP onboarding → schema add →
   IRP client → payload builder → order hook → PDF QR → cancellation
   → reconciliation cron.
3. The fields we already collect (HSN, GST rate, UCS, GSTIN) are the
   right shape for the IRP payload — no schema rework needed for
   products. Only `Order` gets new IRN columns.
4. The current `einvoiceEnabled` flag is **dead UI** until Phase 1
   ships. Treat it as a placeholder.
5. ShopPulse's universal "registered seller → tax fields required"
   block means by the time a seller crosses ₹5cr, all their products
   are already IRP-ready. No data migration headache.
