# 02 Existing codebase map (Stage 2, read-only, 2026-10-31)

Scope: Admin `D:/study/ShopPulseAdmin` + Storefront `D:/study/ShopPulseStore` (prefixed `STORE:`). Evidence = `path:line`. "NOT VERIFIED" = could not be proven from code. No legal conclusions, only "code does X".
Audit refs in `audit.md` were all still accurate (see Appendix C); none were stale.

Aliases (admin paths): CHK=`src/app/api/[storeId]/checkout/route.ts` · VER=`src/app/api/[storeId]/checkout/verify/route.ts` · SETTLE=`src/lib/payments/checkout-settlement.ts` · WHK=`src/app/api/webhook/razorpay/store/route.ts` · SRW=`src/app/api/webhook/shiprocket/route.ts` · ENG=`src/lib/billing/order-tax-engine.ts` · HSN=`src/lib/billing/hsn-lookup.ts` · GSTC=`src/lib/billing/gst-compliance.ts` · BSCH=`src/lib/billing/billing-schemas.ts` · SSCH=`src/lib/billing/storefront-tax-schemas.ts` · GEN=`src/lib/billing/invoice/generate.ts` · NUM=`src/lib/billing/invoice/numbering.ts` · TPL=`src/lib/billing/invoice/template.tsx` · CLD=`src/lib/billing/invoice/cloudinary-storage.ts` · COD=`src/lib/billing/invoice/cod-paid.ts` · BILL=`src/app/api/settings/billing/route.ts` · STX=`src/app/api/[storeId]/settings/storefront-tax/route.ts` · SCH=`prisma/schema.prisma` · AUTO=`src/lib/shipping/auto-ship-service.ts` · SHIP=`src/lib/shipping/shipping-service.ts` · REF=`src/lib/returns/refund-service.ts` · RZP=`src/lib/payments/razorpay-client.ts` · DC=`src/app/api/[storeId]/shipping/delivery-charges/route.ts` · FORM=`src/app/(dashboard)/[storeId]/(routes)/settings/billing-and-tax/components/`.

---

## 1. Component map

| # | Area | Files (path:line) | What it actually does (traced) | Verdict | Reason |
|---|---|---|---|---|---|
| 1 | Prisma tax/money schema | SCH Store 124-176; Product 466-478; OrderItem 811-822; Order 649-658; Payment 1148-1179 | Seller tax state = booleans on Store (`gstRegistered`, `isCompositionScheme`). Per-line GST snapshot on OrderItem. Invoice columns on Payment (global `@unique` number). No Invoice/CreditNote/document model, no order-level tax totals, no per-order seller-status snapshot, no rate/HSN versioning | REDESIGN | Impossible flag combos; invoice welded to Payment; no credit-note home |
| 2 | Tax engine | ENG:107-221 | Items only. Unregistered store => zero-tax lines (115-129). Intra-state iff both codes non-null and equal, else IGST (131-135, 198-200). INCLUSIVE back-calc (188-190). JS floats + `round2` per field (105, 205-216). Unknown product => silent zero (142-149) | REPLACE | Float rounding, no shipping/COD, no composition, silent IGST |
| 3 | HSN catalogue + lookup | HSN:263-298; `src/lib/billing/data/hsn-reference.json:2` | 87 static entries, no version/effective date; 37 bracketed (all threshold 2500, 5%->18%, incl. 6 footwear); 9 entries at 12%; slabs list still has 12 and 28 (HSN:153). Rate precedence: catalogue bracket > product bracket > product flat > catalogue default > 0/`NONE` (263-297) | REPLACE | Pre-GST-2.0 data, unversioned, `_comment` cites an internal planning file |
| 4 | Compliance + grace policy | GSTC:24 (`GST_GRACE_DAYS=3`), 48-54; cron `src/app/api/cron/enforce-gst-grace/route.ts:67-188`; `vercel.json:77` (daily 05:15 UTC); `src/app/api/[storeId]/settings/gst/run-compliance-check/route.ts` | After registration flip, 3-day window; then cron archives products lacking HSN/rate/unit (`isArchived`, reason `gst_fields_missing`) and notifies. Checkout excludes archived products (CHK:585-590). Nothing blocks checkout during the window | REPLACE | Archives instead of blocking at the moment of sale; silent 0% in window (B-09) |
| 5 | GSTIN/PAN/state validators | `src/lib/billing/gst-validators.ts:52-76` (format+state+embedded PAN+checksum); `gstin.ts:28-65`; `indian-states.ts:18-78` | Two parallel GSTIN validators with different char-13 regex. Server billing schema uses the first (BSCH:32-34). `stateCodeFromGstin`/`panFromGstin` (gst-validators.ts:93-110) have zero callers | RETAIN (merge) | Checksum logic sound; unify, add UT flag |
| 6 | Checkout / order creation | CHK:252-269 (store select, no composition), 459 (self-HTTP to delivery-charges, pincode only), 724-748 (server pricing), 757, 763-815 (B2B), 824-869 (engine), 874-898 (tax memo discarded), 901-915 (shipping, COD, total), 1043-1148 (COD order), 1154-1176 / 1460-1482 (Payment rows), 1361-1457 (PREPAID order) | Server re-prices from DB (client `priceAtPurchase` ignored). `Order.tax` = 0 for INCLUSIVE (874-875). `totalAmount = subtotal + tax + shipping + cod` (915, float). Per-line tax written to OrderItem (883-897). Payment gets seller GSTIN/state + `placeOfSupply` (a 2-digit code) (1173-1175) | REDESIGN | Core of the new model |
| 7 | Product tax fields (form + API) | `.../products/[productId]/components/product-tax-compliance.tsx:6,64-73,131-136`; `product-form.tsx:503-504,1030-1035`; `products/[productId]/page.tsx:186-200`; products POST `src/app/api/[storeId]/products/route.ts:826-844,853-900,901-909,916-943,947-961,1117-1130`; PATCH `[productId]/route.ts:903-940,969-1010,1033,1765-1808` | Seller enters MRP + selling price (no "GST inclusive" wording: `product-basic-details.tsx:362-368,390-395`), HSN (autocomplete from catalogue), flat rate from slab list, cess, UCS (8 codes), exempt flag, optional manual bracket. Required only when `gstRegistered \|\| einvoiceEnabled` (route.ts:854). Exempt => no HSN/unit needed (HSN:207) | REDESIGN | Fields/wording/validation all change |
| 8 | Bulk-HSN tool | `.../products/bulk-fix-tax/**`; `src/app/api/[storeId]/products/bulk-tax/route.ts:51-60,195-261,273` | Manual spreadsheet-style editor: seller multi-selects rows and applies HSN/rate/unit/exempt; all-or-nothing tx (max 500); auto-unarchives. No suggestion engine | REDESIGN | Keep concept (bulk apply), rebuild on new catalogue |
| 9 | Billing & Tax: identity form | FORM`billing-tax-form.tsx:8-10,88-111,131-141,191-203`; `page.tsx:62-90`; BILL:57-81,119-145,159-205; BSCH:48-70 | One toggle "I want a GST invoice for my subscription payments" selects BUSINESS (GSTIN+PAN+legal name+address) vs INDIVIDUAL (state only). `billingType` is derived as `gstin ? BUSINESS : INDIVIDUAL` (page.tsx:63). BUSINESS save sets `gstRegistered=true` + starts 3-day grace (BILL:159-187). INDIVIDUAL clears gstin/legalName/pan/address but leaves `gstRegistered` (BILL:151-158,190-200). Sensitive-field edits need mobile OTP (BILL:119-145). Also reached from subscription pre-flight modal (`src/app/(dashboard)/subscription/components/billing-preflight-modal.tsx:190`) | REPLACE | Conflates ShopPulse-invoice buyer identity with storefront supplier status |
| 10 | Billing & Tax: storefront-invoice form | FORM`storefront-tax-form.tsx:233-236,143-145,323-375`; STX:111-121,147-169; SSCH:29-40,104-159 | Saves `isCompositionScheme`, `declaredTurnoverFy`, `einvoiceEnabled` (needs turnover >= 5 cr, SSCH:145-158), `invoiceNumberFormat` (<=64 chars, validated + previewed in UI), `invoicePrefix` (<=8), footer, `allowB2BInvoices`. Requires `hasSellerGstProfile` (`storefront-b2b.ts:21-31`, needs `gstRegistered`) | REPLACE | Composition promise ("Bill of Supply") is not implemented; `invoiceNumberFormat` unused |
| 11 | Onboarding | `src/app/api/onboarding/complete/route.ts:169-174`; `src/components/modals/store-modal.tsx:31-38` | Captures store name only. No tax/business fields | REDESIGN (extend) | Identity capture belongs here |
| 12 | Invoice numbering | NUM:20-21,24-29,38-48,58-84; SCH 1163 (`invoiceNumber @unique`), 1207-1219 (counter) | `{PREFIX}-{FY}-{SEQ:5}`, default prefix `INV`; atomic per (store, FY, kind) counter; but `Payment.invoiceNumber` is globally unique. FY via `getMonth()` (server TZ) | REPLACE | B-02, B-16, B-17 |
| 13 | Invoice generation + triggers | GEN:55-314; COD:41-162; WHK:152-161,253-262; SRW:422-433; `.../shipments/[shipmentId]/delivered/route.ts:125`; `.../status/route.ts:218-220`; admin lazy path `.../orders/[orderId]/invoice.pdf/route.ts:63-89` | Only `TAX_INVOICE`. PREPAID: issued from webhook only when webhook wins settlement; COD: at delivery. Never at shipment/courier booking. Whole issue (render + upload) runs inside one interactive tx (GEN:129-266). Fast path re-derives storage id from URL (GEN:80, 326-337) | REPLACE | B-01, B-03, B-07, B-19 |
| 14 | Invoice PDF template | TPL:158-317 | Always titled "Tax Invoice" (170); date = UTC slice (175); place of supply prints the raw code (244); columns Item/HSN/Qty/Taxable/CGST/SGST/IGST/Total, no unit price/UQC (251-260); totals: Subtotal, `Order.tax`, Shipping, Grand total; no COD row (285-304); footer says "composition / non-GST" when no GSTIN (312-314) | REPLACE (last WP) | Visual redesign is last per brief |
| 15 | Cloudinary invoice storage | CLD:52-119; GEN:222-237,326-337; SaaS `src/lib/billing/invoice/subscription-issue.ts:315-318` | Upload raw/authenticated; only `secure_url` persisted (`Payment.invoiceUrl`); public_id/version/resource_type not persisted; later re-parsed from URL. See section 5 | REDESIGN | Root cause of INVOICE_FETCH_FAILED |
| 16 | Invoice email + link token | `src/lib/billing/invoice/email.ts:106-157`; `link-token.ts:44-60` | Sends via the seller's own email integration; silent no-op without one; no retry/outbox. Link token HMAC, 90-day (long) / 5-min (OTP) | RETAIN token; REDESIGN email | Needs retry + delivery record |
| 17 | Shiprocket integration | AUTO:341-344,347-377,379; SHIP:457-496; `src/lib/shipping/shiprocket-api.ts:158-184,977-991`; SRW:422-433 | Auto-ship payload: item `tax:0`, `hsn:''` (AUTO:368-369), `sub_total` = items only (AUTO:341-344,372); manual payload: no tax/hsn, `sub_total = totalAmount` (SHIP:480-489). No `invoice_number`, `ewaybill_no`, `customer_gstin`, `shipping_charges`, `transaction_charges`. `generateInvoice()` exists but has no callers | REDESIGN payload; RETAIN transport | B-21 |
| 18 | Shipping + COD charge config | SCH 2060 (`codChargeAmount`), 2063-2065; `src/lib/store-settings-service.ts:45-79,134-165`; `src/lib/shipping/shipping-charge-policy.ts:17-88`; DC:122-158,260-275,292-295 | Fixed: `fixedShippingCharge`. Variable: mean of cheapest 3 (or 4 if >4) courier totals for **default 0.5 kg** (checkout passes only pincode, CHK:459 / DC:101), mapped by ladder <=55->50, <=80->75, <=110->100, <=130->125, <=155->150, <=180->175, then +25 per 25 above 180. COD fee = flat `codChargeAmount`, plan-gated (DC:148-150). Both are tax-free pass-through | RETAIN config; REDESIGN tax treatment | Needs charge classification |
| 19 | Payment flow | RZP:57-141; CHK:1272-1273; section 4 | Customer money only via the seller's own Razorpay keys; no platform fallback | RETAIN | Matches "software-only" posture |
| 20 | Refund / return / cancel | REF:59-139,170-259; `src/lib/returns/storefront-order-cancel-service.ts:388-399` | Refund = gross line value x passed qty - restocking fee (+ forward shipping once, + COD fee once). Cancel = full `totalAmount`. No tax split, no credit note, invoice never touched | REDESIGN | B-12, B-13 |
| 21 | Storefront (customer) | STORE:`src/app/(routes)/cart/components/checkout-summary.tsx:61,109`; `.../checkout/components/order-summary.tsx:63-80,145-175`; `.../address-form.tsx:239`; `src/lib/utils.ts:94-131`; `src/components/order/tax-breakdown-card.tsx` | Cart hard-codes "Tax (Included) ₹0". Checkout summary has Subtotal/Shipping/COD fee, no tax row. No "inclusive of taxes" label found (grep of `src`). State is a dropdown whose names match admin `INDIAN_STATES`. No client tax maths (server authoritative). Order page shows per-line GST from API | REDESIGN | Labels, tax rows |
| 22 | Crons touching tax/invoice | `vercel.json` (19 crons); only `enforce-gst-grace` is tax-related | No invoice retry/reconcile cron; no turnover/threshold cron | REPLACE grace; ADD invoice reconcile | B-20 |
| 23 | Admin order page | `.../orders/[orderId]/components/sections/overview-tab.tsx:480-514`; `billing-tab.tsx:44-45,78-82,214-311` | Order summary: Subtotal, **Tax = `Order.tax`** (₹0 on INCLUSIVE, line 495), Shipping, COD charge row exists when `codCharge>0` (501-507), Total. Per-line breakdown card lives in the Billing tab | REDESIGN | Show real tax totals |
| 24 | SaaS invoicing (ShopPulse to seller) | `src/lib/billing/subscription-tax.ts:30-68`; `invoice/subscription-numbering.ts:22-28`; `subscription-issue.ts`; `shoppulse-profile.ts` | Separate series `SP/2025-26/000042` (17 chars), Decimal maths with rounding remainder absorbed into SGST, FY counter | RETAIN with fixes | Good Decimal pattern to reuse; number length same issue |

---

## 2. Execution-path traces

**(a) Storefront view -> cart -> checkout -> order + snapshot**
1. PDP/cart show `price` (MRP, struck through) and `sellingPrice`; no tax label (STORE `src/components/ui/price-display.tsx`, `info.tsx:199`).
2. Cart total = subtotal + shipping + hard-coded 0 tax (STORE `checkout-summary.tsx:55-62`). Pincode check calls admin `GET DC` (serviceability via Shiprocket, default 0.5 kg, DC:192-202; charge via `resolveShippingCharge`, DC:267-275; COD fee plan-gated, DC:148-150).
3. `POST CHK`: store select without `isCompositionScheme` (252-269) -> subscription gate -> idempotency session (377-437) -> **self-HTTP** to delivery-charges with pincode only (456-467) -> products loaded with `isArchived:false` (585-590) -> stock pre-check -> subtotal priced from DB, ignoring client price (724-748) -> optional B2B block validated (763-815; buyer state = GSTIN chars 1-2, 814) -> engine (824-869; ship-to state resolved from free-text/dropdown name, 868) -> `tax` = 0 if INCLUSIVE else engine total (874-876); memo discarded (898) -> shipping (901), COD fee clamped >= 0 (905-913), `totalAmount` (915).
4. Tx: reserve order slot, atomic stock decrement, `Order.create` (COD 1043-1148 / PREPAID 1361-1457) with OrderItem tax snapshot (`taxFieldsForItem`, 883-897), then `Payment.create` carrying buyer GSTIN fields, `sellerGstin`, `sellerStateCode`, `placeOfSupply` (code) (COD 1154-1176 / PREPAID 1460-1482). PREPAID then creates the Razorpay order with the **seller's** keys (1272-1273, 1506).

**(b) PREPAID success -> invoice? -> auto-ship -> Shiprocket**
1. Browser callback `VER:167` calls `settleCapturedCheckoutPayment` (SETTLE:33-63 flips order `PAID`, Payment `SUCCESS`), notifies, then `processAutoShip` (VER:278). **No invoice call in VER.**
2. Razorpay `payment.captured` -> `WHK:73`; seller-secret signature (122); amount/currency check (129-150); `settleCapturedCheckoutPayment` (152). If already settled by VER => `already_paid` => `return 200` (WHK:159-161) **before** the invoice hook (WHK:253-262). Only when WHK settles first: notify (210), `processAutoShip` (243), `markCodPaidAndIssueInvoice` (253) -> `issueOrFetchInvoice` -> `fetchInvoiceBytes` -> `sendInvoiceEmail` (COD:100-153).
3. `processAutoShip` (AUTO:87): box selection -> payload (347-377: item `tax:0`, `hsn:''`, `sub_total` = items only) -> `claimShipmentCreationAttempt` (379) -> `shiprocketAPI.createOrder` (`shiprocket-api.ts:158`) -> AWB. Invoice is **not** a precondition or output of shipment creation.

**(c) COD -> ship -> delivered -> invoice/mail**
1. COD order: `isPaid:false`, status `PROCESSING` (CHK:1074,1085), `codAmount = totalAmount` (1075), `codCharge` (1080). Auto-ship attempt (1257).
2. Delivered: Shiprocket webhook (SRW:422-433) or seller routes (`delivered/route.ts:125`, `status/route.ts:218-220`) -> `markCodPaidAndIssueInvoice`: sets `isPaid`+`paidAt` (COD:73-77) -> issue -> fetch bytes -> email. SRW fires this on **any** DELIVERED event (shipment-kind branching before this line NOT VERIFIED).
3. No cash reconciliation: `Shipment.codRemitted/At` (SCH 1521-1522) are only read, never written.

**(d) Refund / return money + tax effect**
Return -> inspection -> `getRefundableAmount` (REF:59-139): item = `resolveCurrentItemValue` per unit x passed qty - restocking fee (89-96); forward shipping once (98-101); **COD fee uses `order.codAmount` (102-110)**; minus reverse-shipping fee (118-127) -> `splitRefundIntoLegs` (170-259; Razorpay legs oldest-first within 365 days, remainder manual UTR) -> Razorpay refund via seller keys (RZP:161-190). Cancel: full `totalAmount` leg (`storefront-order-cancel-service.ts:394-399`). No tax apportionment, no credit note, invoice not voided. Zero credit-note code exists (`grep` of `src`, only a comment at `returns/[returnId]/page.tsx:1149`).

**(e) Invoice upload -> persist -> fetch**
GEN:222 `uploadInvoicePdf` (CLD:55-68: folder `shoppulse/{storeId}/invoices/{fy}`, `public_id=invoiceNumber`, `resource_type:'raw'`, `type:'authenticated'`, `format:'pdf'`, `overwrite:true`) -> result `{public_id, secure_url, bytes}` (CLD:80-84) -> **persist only `Payment.invoiceUrl = secure_url`** (GEN:237) -> first call returns `upload.publicId` (GEN:264) so first email works -> every later call takes the fast path and **re-parses the URL** (GEN:80 -> 326-337) -> `fetchInvoiceBytes` (CLD:110) -> `private_download_url(publicId,'pdf',{resource_type:'raw',type:'authenticated',expires_at,attachment})` (CLD:96-104) -> `fetch` -> 404 (CLD:113-117). Consumers: admin `.../orders/[orderId]/invoice.pdf/route.ts:76-107`, storefront `.../storefront/orders/[orderId]/invoice.pdf/route.ts:124-163`, `.../invoice/email-resend/route.ts:144-145`, `COD:124`.

---

## 3. Verdict per brief §6 claim (code side only)

| # | Claim | What the code does today | Evidence | Status |
|---|---|---|---|---|
| 1 | Unregistered cannot sell inter-state | No restriction anywhere: no "deliver only in my state", no state comparison for unregistered stores. Unregistered => zero-tax lines but invoice still "Tax Invoice" | ENG:115-129; CHK:536-581 (only COD/serviceability checks); DC:231-254; TPL:170 | NOT APPLICABLE IN CODE (no control exists) |
| 2 | Invoice no. <=16 chars | `INV-2025-26-00042` = 17 chars (verified by count); prefix up to 8 chars `[A-Z0-9-]` => up to 22; SaaS `SP/2025-26/000042` = 17. Format setting `invoiceNumberFormat` (<=64) is saved but unused. Uniqueness: per-store/FY/kind counter, but `Payment.invoiceNumber` is globally `@unique` | NUM:20-21,47; SSCH:29-40; GEN:137-141; SCH 1163,1217 | CONFIRMED (violates length; collision defect B-02) |
| 3 | Shipping/COD part of principal supply | Neither taxed nor apportioned; engine receives item lines only; invoice prints shipping untaxed, no COD row | CHK:901-915; ENG:107-121; TPL:293-299 | CONFIRMED untaxed |
| 4 | Apparel/footwear slab on pre-tax value | Compares **inclusive selling unit price** to 2500 (INCLUSIVE stores). 37 catalogue entries incl. footwear use 2500, 5% -> 18%. Manual bracket uses same comparison | HSN:273,282; ENG:171-178; CHK:829-840; `hsn-reference.json` (bracketRule blocks) | CONFIRMED (inclusive compare) |
| 5 | Invoice at/before removal; COD too | PREPAID: at payment capture only if webhook wins (else lazy on admin download); COD: at delivery. Never at courier booking/dispatch | WHK:152-161,253-262; COD:73-100; SRW:422-433 | CONFIRMED (neither at dispatch) |
| 6 | Rates after 22 Sep 2025; named items | Catalogue pre-dates: shampoo 3305, toothpaste 3306, soap 3401, chocolate 1806, biscuits 1905 at 18%; pencils 9609 and sanitary 9619 at 12%; 9 entries at 12%; cess 0 everywhere; no 28% entry but slab list keeps 12/28 | `hsn-reference.json` (87 items); HSN:153; SCH 467 comment | CONFIRMED stale (rate correctness = Stage 1) |
| 7 | Bill of Supply per status | Not implemented. `invoiceKind` always `TAX_INVOICE`; no branch on composition/exempt/unregistered. UI text promises Bill of Supply | GEN:35,234; TPL:170; FORM`storefront-tax-form.tsx:233-236` | CONFIRMED missing |
| 8 | E-way bill / e-invoice / 6-digit HSN | No e-way code (grep). `einvoiceEnabled` only (a) schema-gated by manual turnover >= 5 cr and (b) makes product tax fields mandatory; no IRP call. HSN accepts 4/6/8 digits for all; no turnover-based digits rule | SSCH:145-158; products `route.ts:854`; HSN:175-179 | NOT APPLICABLE IN CODE (nothing built) |
| 9 | Place of supply vs buyer GSTIN state | Tax decided on ship-to state only; buyer GSTIN state saved on Payment but unused; no ITC warning | CHK:757,814,868; SCH 1140 | OBSERVED (ship-to only) |
| 10 | Pickup-location state vs seller GSTIN state | No comparison. `Address.state` is free text; `Store.stateCode` never read by shipping code | SCH 1357; grep `stateCode` in `src/lib/shipping` (none) | NOT APPLICABLE IN CODE (no check) |
| 11 | SaaS role / e-commerce-operator | See section 4: code never collects, holds, settles or pays out customer money | section 4 | Code-side facts only; legal = CA |

---

## 4. Payment-flow facts

- Checkout Razorpay order is created with credentials read from `StoreIntegration(type=PAYMENT_GATEWAY)` for that store (SCH 838-864; `RZP:57-112`; CHK:1272-1273; `src/lib/payments/checkout-provider-order-service.ts:158,313`). Credentials are stored encrypted (SCH 850).
- No fallback to platform keys: missing/invalid integration throws `PaymentGatewayError` (RZP:57-85). `RZP:134-136` comment still says "falls back to env vars" (stale).
- Platform env keys (`NEXT_PUBLIC_RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`) are used only for ShopPulse subscriptions (`src/lib/razorpay.ts:42-45`, imported by `src/app/api/subscription/**` and `src/lib/subscription/schedule-manual-resubscribe.ts`; `subscription/verify/route.ts:41`).
- Webhook trust uses the seller's own secret (`RZP:119-131`, `WHK:38,122`).
- Exchange-difference payments and refunds also use seller keys (`pay-exchange-diff/route.ts:179-181`, `src/lib/returns/exchange-service.ts:215-218`, `RZP:161-190`).
- No Razorpay Route/transfers/payouts/linked accounts/commission/application-fee code (grep of `src`; only marketing copy "zero commission", e.g. `src/components/landing/hero-section.tsx:82`).
- COD refunds are manual rails recorded by the seller with a UTR (`RefundMethod COD_MANUAL_UPI/BANK`, SCH 1950; REF:249-256). ShopPulse never moves that money.
- COD cash: collected by the courier; Shiprocket calls use the per-store token (`shiprocketAPI.createOrder` -> `shiprocketService.getToken(storeId)`, `shiprocket-api.ts:162`). Whether remittance reaches the seller's account directly = NOT VERIFIED (Shiprocket-side); no remittance code (`codRemitted` never written).
- ShopPulse revenue in code = subscription fees only (SaaS invoices).
- **Verdict (code side):** ShopPulse does not collect, hold, settle or pay out customer money, including refunds. Residual exposure is legal/classification (Stage 1 + CA), not an architecture fact.

---

## 5. Cloudinary INVOICE_FETCH_FAILED root cause

**Proven from code**
1. Upload returns a *signed* authenticated URL; the code persists **only** that URL (GEN:237; no publicId/version/resource_type columns, SCH 1163-1168).
2. When the invoice already exists (fast path, GEN:69-85, and race path GEN:287-303) the public_id is **re-derived by regex** (GEN:326-337):
   `url.match(/\/authenticated\/(?:v\d+\/)?(.+?)(?:\.pdf)?$/)` (**GEN:331**). The optional group only skips `v123/`. A signed delivery URL has `.../authenticated/s--SIG--/v123/shoppulse/...`, so `s--SIG--/` is not skipped and is captured: result = `s--<sig>--/v<version>/shoppulse/<storeId>/invoices/2026-27/INV-...`, exactly the string in the reported error. That value is passed to `fetchInvoiceBytes` (CLD:110) -> `private_download_url` (CLD:98) -> Cloudinary download API cannot find it -> 404 -> error text built at CLD:114-116.
3. Why it looked intermittent: the first issuance returns `upload.publicId` (GEN:264) so the first email attachment works; every later download/resend/COD-mail goes through the broken fast path. Deleting the DB fields and regenerating "worked" only until the next fetch.
4. Callers hit by it: admin download (`orders/[orderId]/invoice.pdf/route.ts:76,93`), storefront download (`.../storefront/orders/[orderId]/invoice.pdf/route.ts:133,150`), email resend (`email-resend/route.ts:144-145`), COD/webhook mail on second call (`COD:100,124`).

**Probable (not provable without the console)**
- Public-id extension convention is inconsistent in the codebase: GEN:331 strips `.pdf`; the SaaS path appends `.pdf` (`subscription-issue.ts:317`); both feed the same `signedInvoiceUrl(publicId,'pdf')` which always sends `format=pdf` (CLD:98; SDK `node_modules/cloudinary/lib/utils/index.js:1209-1220` passes `format` as a query param). For `resource_type:'raw'` the true public_id may or may not already include `.pdf`; at most one of the two conventions is right. Even with the signature segment fixed, a wrong extension convention would still 404.
- `format:'pdf'` on a `raw` upload (CLD:65): effect on the stored public_id/URL not confirmable from code.
- Dynamic-folder-mode accounts: `folder` may not become part of `public_id` (CLD:55-56). Error text shows the folder inside the id, which argues against, but check.
- Env mismatch between `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and the API key/secret pair in prod (`src/lib/cloudinary.ts:19-24`) also yields 404 on download.
- Not a cause: cleanup jobs. Orphan audit excludes raw invoices (`src/lib/uploads/server/cloudinary-orphan-audit.ts:9`); store-wipe uses default image/upload scope (`src/lib/cloudinary.ts:102-148`).

**Cloudinary console checklist**
1. Media Library -> the invoice asset: confirm Resource type = Raw, Type/Access = Authenticated, exact **Public ID** (with or without `.pdf`), folder path, current version.
2. Compare with the delivery URL stored in `Payment.invoiceUrl` for any invoice (look for the `s--...--/v...` segment).
3. Settings -> Security: "PDF and ZIP files delivery" (restricted by default on newer accounts), "Restricted media types", "Strict transformations"; confirm none block raw/authenticated PDF.
4. Settings -> Product environment: fixed vs dynamic folder mode.
5. Admin API `GET /resources/raw/authenticated/<public_id>` for the same asset using the production key (proves existence + id).
6. Confirm prod `CLOUDINARY_API_KEY/SECRET` belong to the cloud named in `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
7. Log `result.public_id`/`version` at upload for one test invoice (GEN:222 does not log them) and compare with step 1.

---

## 6. Bugs / defects

| ID | Sev | Path:line | Defect |
|---|---|---|---|
| B-01 | Crit | GEN:331 (called 80, 298) | Regex keeps `s--sig--/v…/` in public_id => every re-fetch of an issued invoice 404s |
| B-02 | Crit | SCH 1163; NUM:47; GEN:269-306 | Global `@unique` + default prefix `INV` => second store's number collides (P2002); handler treats it as a race, retries the same rolled-back number 3x, then throws; that store is stuck |
| B-03 | High | WHK:159-161 vs 253; VER:167-184; SETTLE:71-77 | PREPAID invoice issued only if webhook settles before browser callback; callback never issues. Fallback = lazy issue on admin download |
| B-04 | High | FORM billing-tax-form.tsx:191-203; BILL:159-187; preflight modal:190 | "I want a GST invoice for my subscription" (SaaS buyer) flips storefront `gstRegistered=true`, starts grace + product archiving |
| B-05 | High | BILL:151-158,190-200 | No de-registration: INDIVIDUAL clears GSTIN but `gstRegistered` stays true => engine keeps charging GST (ENG:115) with no GSTIN; B2B/profile checks then fail (STX:111-121) |
| B-06 | High | CHK:252-269; ENG; GEN; TPL; STX:150 | `isCompositionScheme` saved, read by nothing in checkout/engine/invoice; UI says invoices become Bill of Supply (`storefront-tax-form.tsx:233-236`) |
| B-07 | High | TPL:170,312-314; GEN:35,234 | Every document "Tax Invoice"/`TAX_INVOICE`; footer calls no-GSTIN sellers "composition / non-GST" |
| B-08 | High | CHK:901-915; ENG:107; TPL:285-304 | Shipping and COD fee untaxed; invoice has no COD row; grand total (includes COD) does not equal rows shown |
| B-09 | High | HSN:297; ENG:171-178; GSTC:24; `vercel.json:77` | Missing HSN/rate => rate 0 source `NONE` silently; no checkout guard; 3-day window + daily archive cron |
| B-10 | High | HSN:273,282 | Bracket test on inclusive selling price |
| B-11 | High | ENG:131-135,198-200; CHK:868,365 | Unresolved ship state or null `Store.stateCode` => IGST silently; place of supply = customer-typed state, pincode not cross-checked; API open (CORS `*`, CHK:134) so free text possible |
| B-12 | High | REF:102-110 (value from 108) | COD-fee refund reads `order.codAmount` (= total, CHK:1075) not `order.codCharge`; with `refundCodChargesOnReturn` it refunds the whole order amount |
| B-13 | High | REF:89-112; `storefront-order-cancel-service.ts:394-399` | No credit note / tax reversal for return, exchange, cancel; issued invoice never voided |
| B-14 | Med | ENG:198-216 | Float maths, CGST/SGST rounded separately: ₹799 @5% intra-state => 760.95 + 19.02 + 19.02 = 798.99 (computed) |
| B-15 | Med | CHK:874-898; TPL:291; GEN:195; `overview-tab.tsx:495`; STORE `checkout-summary.tsx:61,109` | `Order.tax` = 0 for INCLUSIVE; memo discarded; admin summary, invoice "Total tax" and cart show ₹0 |
| B-16 | Med | NUM:21,47; `subscription-numbering.ts:27` | 17 chars default, 22 max (8-char prefix); SaaS series 17 |
| B-17 | Med | NUM:24-29; TPL:175; GEN:113-114 | FY from server-local month, date printed in UTC, FY from `paidAt` but date from issue time (can disagree around 1 Apr) |
| B-18 | Med | BSCH:14-16,36-38,60-70; BILL:168-175 | Server never checks `stateCode`/`pan` against GSTIN (only client check, `billing-tax-form.tsx:135`); helpers unused |
| B-19 | Med | GEN:129-266 | PDF render + Cloudinary upload inside an interactive Prisma tx; `prismadb.ts` sets no timeout (runtime effect NOT VERIFIED) |
| B-20 | Med | `email.ts:120-127`; COD:154-161; `vercel.json` | No invoice retry/reconcile; email skipped silently without seller email integration; all failures swallowed |
| B-21 | Med | AUTO:341-344,368-369,372; SHIP:480-489 | Shiprocket payload tax 0/hsn '', no invoice/e-way/GSTIN fields; `sub_total` differs between auto (items) and manual (total incl. shipping/COD) => COD collect amount may mismatch `Order.codAmount` (NEEDS THIRD-PARTY API VERIFICATION) |
| B-22 | Med | CHK:456-459; DC:101 | Variable shipping charge priced at default 0.5 kg, not cart weight |
| B-23 | Med | `hsn-reference.json:2`; HSN:153; SCH 467 | Catalogue unversioned/stale; slab list and schema comment keep 12/28; `_comment` cites internal planning doc |
| B-24 | Med | HSN:207; `bulk-tax/route.ts:58,199-204` | Exempt flag removes HSN/unit requirement (single or bulk); invoice then shows HSN `-` (TPL:264) |
| B-25 | Low | HSN:157-166; SCH 470,811-822; TPL:251-260 | `ucsCode` (8 values) not snapshotted on OrderItem, not printed |
| B-26 | Med | CHK:862,875; ENG:136 | `priceMode` has no writer (UI/API); EXCLUSIVE path unreachable; no per-order snapshot of pricing mode |
| B-27 | Low | SCH 1154-1160,1171-1179,1521-1522 | Payment tax-result + e-invoice columns, `Shipment.codRemitted/At`, `Shipment.insuranceCharge`, `StoreShippingSettings.insureAboveValue` never written |
| B-28 | Low | `gst-validators.ts:22` vs `gstin.ts:28` | Two GSTIN validators with different patterns |
| B-29 | Low | SCH 535-590 | `ArchivedProduct` snapshot has no HSN/rate/UQC fields (restore path NOT VERIFIED) |
| B-30 | Low | RZP:134-136 | Stale comment contradicts code (no env fallback) |
| B-31 | Med | SCH 1163-1168; GEN:59-85,129-141; CLD:64 | Invoice immutability is convention only: nullable columns on Payment, `overwrite:true`; clearing DB fields and regenerating issues a new number for the same order |
| B-32 | Med | STORE `order-summary.tsx:145-175`; admin `product-basic-details.tsx:362-368` | No "inclusive of taxes" wording on PDP, checkout summary, or seller price fields |
| B-33 | Low | SCH 1357 | Pickup `Address.state` free text, unrelated to seller state/GSTIN |
| B-34 | Low | CHK (no check); DC:231 | No inter-state restriction control for unregistered stores |
| B-35 | Low | SRW:422-433 | Invoice hook fires on any DELIVERED event; shipment-kind branching before it NOT VERIFIED |
| B-36 | Med | TPL:158-317 | Missing on PDF: unit price, UQC, reverse-charge line, state name for place of supply (code printed), cess column, COD row |
| B-37 | Med | `src/app/api/onboarding/complete/route.ts:169-174` | Tax identity never captured at onboarding; flows through the SaaS billing form only |

---

## Appendix A. Current schema inventory (tax / money / invoice / state / address / shipping-config only)

Schema line numbers are for `prisma/schema.prisma` at 2026-10-31.

**Store (57-212)**
```
L60  userId String @unique                       (one store per user = one legal entity)
L124 legalName String?
L125 gstin String?                               @@index([gstin]) L211
L126 pan String?
L127 registeredAddress Json?                     {line1,line2,city,state,pincode}
L128 stateCode String?                           (2-digit GST code)
L129 isCompositionScheme Boolean @default(false)
L134 supportEmail String?
L139 einvoiceEnabled Boolean @default(false)
L140 einvoiceCredentials Json?
L141 invoiceNumberFormat String?                 (unused by generator)
L146 invoicePrefix String? @db.VarChar(8)
L147 invoiceLogoUrl String?
L148 invoiceFooterText String? @db.Text
L149 declaredTurnoverFy Decimal? @db.Decimal(15, 2)
L150 gstDetailsVerifiedAt DateTime?
L151 gstDetailsLastEditAt DateTime?
L158 gstRegistered Boolean @default(false)
L159 gstRegisteredAt DateTime?
L160 allowB2BInvoices Boolean @default(false)
L161 priceMode String @default("INCLUSIVE")      (no writer)
L170 gstGraceStartedAt DateTime?
L171 gstGraceEndsAt DateTime?
L172 gstEnforcementApplied Boolean @default(false)
L173 gstHiddenProductCount Int @default(0)
L176 gstEnforcementRunAt DateTime?
L205 payments Payment[]   L206 invoiceCounters StoreInvoiceCounter[]
```
**Product (372-497)**
```
L380 price Decimal                               (MRP)
L381 sellingPrice Decimal?                       (null = no discount)
L384 sku String
L393 isArchived Boolean @default(false)   L414 archivedReason String? ('gst_fields_missing' used)
L466 hsnCode String?                             @@index([hsnCode])
L467 taxRate Decimal? @db.Decimal(5, 2)
L468 cessRate Decimal? @default(0) @db.Decimal(5, 2)
L469 isExempt Boolean @default(false)
L470 ucsCode String? @default("PCS")
L478 taxBracketRule Json?                        {type:'PRICE_PER_UNIT',threshold,lowRate,highRate}
```
**ProductVariant (322-370)**: `L329 storeId`, `L336 sku @db.VarChar(50)`, `L340 price Decimal?`, `L341 sellingPrice Decimal?`, `L352 isArchived`. No tax fields (tax is product-level; bracket evaluated on the variant's price).
**ArchivedProduct (535-590)**: `L552 price`, `L553 sellingPrice`, `L572 variants Json`; no hsn/rate/ucs fields.
**Order (609-744)**
```
L614 isPaid Boolean @default(false)  L615 orderStatus OrderStatus @default(PENDING)
L626 shippingState String   L627 shippingPincode String   L628 shippingCountry String @default("India")
L631 isShippingSameAsBilling Boolean   L637 billingState String?
L644 payment Payment?
L649 paymentMethod PaymentMethod @default(PREPAID)
L650 codAmount Decimal? @db.Decimal(10, 2)       (= totalAmount for COD)
L653 subtotal Decimal                            (item prices, GST inside when INCLUSIVE)
L654 codCharge Decimal @default(0) @db.Decimal(10, 2)
L655 tax Decimal @default(0)                     (0 for INCLUSIVE)
L656 shippingCost Decimal @default(0)
L657 shippingEstimate Decimal? @db.Decimal(10, 2)
L658 totalAmount Decimal
L670 metadata Json?  L697 paidAt DateTime?  L701 cancelledAt DateTime?  L706 deliveredAt DateTime?
L713 shippingRefundedAt DateTime?  L714 codChargeRefundedAt DateTime?
```
**OrderItem (772-836)**
```
L778 quantity Int @default(1)  L783 snapshotProductId String  L787 snapshotVariantId String?
L789 productSku String  L790 productMrp Decimal  L791 priceAtPurchase Decimal  L795 lineTotal Decimal
L799 variantSnapshot Json?
L811 hsnCodeSnapshot String?
L812 taxRateSnapshot Decimal? @db.Decimal(5, 2)
L813 cessRateSnapshot Decimal? @default(0) @db.Decimal(5, 2)
L814 taxableAmount Decimal? @db.Decimal(10, 2)
L815 cgstAmount Decimal? @default(0) @db.Decimal(10, 2)
L816 sgstAmount Decimal? @default(0) @db.Decimal(10, 2)
L817 igstAmount Decimal? @default(0) @db.Decimal(10, 2)
L818 cessAmount Decimal? @default(0) @db.Decimal(10, 2)
L822 appliedTaxSource String?   (CATALOGUE_BRACKET|PRODUCT_BRACKET|PRODUCT_MANUAL|CATALOGUE_DEFAULT|EXEMPT|NONE)
```
**Payment (1105-1196)**
```
L1111 kind PaymentKind   L1113 orderId String? @unique
L1119 razorpayOrderId String? @unique  L1120 razorpayPaymentId String? @unique  L1121 razorpaySignature String?
L1124 amount Decimal @db.Decimal(10, 2)  L1125 status PaymentStatus @default(PENDING)  L1126 capturedAt DateTime?
L1127 paymentMethod String?
L1134 buyerName String  L1135 buyerEmail String
L1138 buyerGstin String?  L1139 buyerLegalName String?  L1140 buyerStateCode String?
L1141 buyerBillingAddress Json?  L1145 buyerPan String?
L1148 sellerGstin String?  L1149 sellerStateCode String?
L1154 placeOfSupply String?                      (written as 2-digit code)
L1155 taxableAmount Decimal? @db.Decimal(10, 2)  L1156 cgstAmount  L1157 sgstAmount  L1158 igstAmount  L1159 cessAmount  (all Decimal? @default(0) (10,2))
L1160 totalTax Decimal? @db.Decimal(10, 2)       (L1154-1160 never written)
L1163 invoiceNumber String? @unique              (global)
L1164 invoiceKind String?  L1165 invoiceDate DateTime?  L1166 invoiceFinancialYear String?
L1167 invoiceUrl String?   L1168 invoiceGeneratedAt DateTime?
L1171 eInvoiceIrn String?  L1172 eInvoiceAckNumber String?  L1173 eInvoiceAckDate DateTime?
L1174 eInvoiceQrCode String? @db.Text  L1175 eInvoiceStatus String?  L1176 eInvoiceError String? @db.Text   (never written)
L1178 originalInvoiceNumber String?  L1179 originalInvoiceDate DateTime?
L1184 refundLegs RefundLeg[]     indexes: storeId; (storeId,kind,createdAt desc); orderId; razorpayOrderId; razorpayPaymentId; invoiceNumber; invoiceFinancialYear
```
**StoreInvoiceCounter (1207-1219)**: `financialYear String`, `invoiceKind String` (comment lists TAX_INVOICE/SUPPLEMENTARY_INVOICE/BILL_OF_SUPPLY/CREDIT_NOTE), `lastNumber Int @default(0)`, `@@unique([storeId, financialYear, invoiceKind])`. **SaasInvoiceCounter (1222-1226)**: `financialYear String @id`, `lastNumber Int`.
**SubscriptionPayment (1010-1090, ShopPulse's own invoices)**: `L1053 buyerGstin`, `L1054 buyerLegalName`, `L1055 buyerStateCode`, `L1056 buyerBillingAddress Json?`, `L1062 taxableAmount`, `L1063 cgstAmount`, `L1064 sgstAmount`, `L1065 igstAmount` (Decimal(10,2)), `L1070 invoiceNumber String? @unique`, `L1071 invoiceDate`, `L1072 invoiceFinancialYear`, `L1073 invoiceUrl`, `L1074 invoiceGeneratedAt`.
**Address (1340-1385, pickup/return/warehouse)**: `L1342 storeId`, `L1347 name` (sent to Shiprocket as pickup_location), `L1350 phone`, `L1351 email?`, `L1354 line1`, `L1355 line2?`, `L1356 city`, `L1357 state String` (free text), `L1358 pincode`, `L1359 country @default("IN")`, `L1366 type AddressType @default(PICKUP)`.
**Shipment (1432-1575)**: `L1445 provider`, `L1446 providerOrderId?`, `L1447 providerShipmentId?`, `L1456 kind ShipmentKind @default(FORWARD)`, `L1464 awbCode?`, `L1482 pickupAddressId?`, `L1496 deliveredAt?`, `L1505 labelUrl?`, `L1513 shippingCharge Decimal? (10,2)`, `L1514 codCharge`, `L1515 insuranceCharge`, `L1516 totalCharge` (courier billing to seller; written only by assign-courier/generate-awb routes), `L1519 isCod Boolean`, `L1520 codAmount Decimal?`, `L1521 codRemitted Boolean @default(false)`, `L1522 codRemittedAt?` (never written), `L1525 metadata Json?`, `L1535 shippedAt?`.
**StoreShippingSettings (2037-2228)**: `L2043 autoShipEnabled`, `L2047 maxAutoShipAmount Decimal?`, `L2051 codEnabled Boolean @default(false)`, `L2054 codAutoShipEnabled`, `L2057 codMaxAutoShipAmount Decimal?`, `L2060 codChargeAmount Decimal? @db.Decimal(10, 2)`, `L2063 shippingChargeEnabled Boolean @default(false)`, `L2064 shippingChargeMode ShippingChargeMode @default(VARIABLE)`, `L2065 fixedShippingCharge Decimal? (10,2)`, `L2069 defaultPickupAddressId String? @unique`, `L2080 insureAboveValue Decimal?` (unused), `L2122 restockingFeeEnabled`, `L2123 defaultRestockingFeePercent Decimal @default(0) (5,2)`, `L2149 refundShippingOnReturn Boolean @default(false)`, `L2150 refundCodChargesOnReturn Boolean @default(false)`, `L2154 reverseShippingChargeMode ReverseShippingChargeMode @default(FLAT)`, `L2156 reverseShippingFlatAmount Decimal?`, `L2159 reverseShippingInheritPct Decimal?`.
**ReturnRequest (1650-1806)**: `L1657 orderItemId`, `L1669 quantity Int`, `L1670 partialPassedQty Int`, `L1673 resolution ReturnResolution`, `L1674 status ReturnStatus`, `L1706 payAtSubmitWaivedInr Decimal?`, `L1717 reverseShippingFeeInr Decimal?`, `L1723 policySnapshot Json?`, `L1746 inspectionStatus InspectionStatus?`. No tax fields.
**RefundLeg (1922-1975)**: `L1926 returnRequestId?`, `L1928 orderId`, `L1933 kind RefundLegKind`, `L1934 method RefundMethod`, `L1935 amount Decimal (10,2)`, `L1937 status RefundStatus`, `L1941 idempotencyKey String @unique`, `L1944 sourcePaymentId?`, `L1946 razorpayRefundId?`, `L1950 manualUtr?`. No tax fields.
**ExchangeDetail (1979-2017)**: `L1985 newProductId?`, `L1987 newVariantId?`, `L1988 newPriceAtExchange Decimal (10,2)`, `L1991 priceDifference Decimal (10,2)`, `L1992 diffPaymentStatus`, `L1993-1996 diffRazorpayOrderId/diffRazorpayPaymentId/diffPaidAt/diffWaivedBy`. No tax fields.
**StoreIntegration (838-864)**: `L850 credentials String @db.Text` (encrypted), `@@unique([storeId, type])` L864.

**Enums**: `PaymentStatus {PENDING PROCESSING SUCCESS FAILED REFUNDED}` · `OrderStatus {PENDING PAYMENT_INITIATED PAID PROCESSING READY_TO_SHIP SHIPPED IN_TRANSIT OUT_FOR_DELIVERY DELIVERED RETURN_REQUESTED RETURN_IN_TRANSIT RETURNED CANCELLATION_PENDING CANCELLED EXPIRED REFUNDED}` (L2336) · `PaymentMethod {PREPAID COD}` (L2366) · `PaymentKind {CHECKOUT EXCHANGE_DIFF EXCHANGE_DIFF_BATCH}` (L1198) · `ShippingChargeMode {FIXED VARIABLE}` (L2494) · `AddressType {PICKUP RETURN WAREHOUSE}` (L2388) · `ShipmentKind {FORWARD RETURN_PICKUP EXCHANGE_FORWARD}` (L2554) · `RefundLegKind {ITEM_REFUND PRICE_DIFF_REFUND SHIPPING_REFUND CANCELLATION_REFUND BUNDLE_FEE_REFUND}` (L2527) · `RefundMethod {RAZORPAY COD_MANUAL_UPI COD_MANUAL_BANK}` (L2547). **No enums exist for**: gst status, business type, price mode (String), invoice kind (String), tax source (String).

**Migrations touching tax/invoice/charges (names only)**: `20260111200644_add_shipping_models`, `20260121091234_product_dimensions_made_compulsary`, `20260509210857_invoice_and_tax_schema_added`, `20260509213620_schema_cleanup_drop_user_billing_and_order_razorpay`, `20260513115737_phase_5_1_tax_additions`, `20260513155150_gst_grace_fields`, `20260514120000_add_applied_tax_source`, `20260514174233_add_store_invoice_prefix`, `20260520120000_payment_razorpay_order_id_nullable`, `20260530232950_add_order_one_time_refund_markers`, `20261025095100_added_cod_charge_in_order`. (`20260719070400_add_shipping_charge_settings` adds shipping-charge settings.)

**Gaps observed (absent today, not design):** order-level tax totals; place of supply and seller-status/GSTIN snapshot on Order; per-charge (shipping/COD) tax lines; UQC snapshot; document/credit-note/debit-note tables; rate/HSN effective dating or catalogue version; Order-level pricing-mode snapshot; storage identifiers (public_id/version/resource_type) for invoices.

### Blast radius (non-generated files that read/write these fields)

**Product tax fields (`hsnCode|taxRate|cessRate|isExempt|ucsCode|taxBracketRule`)**
- Libs: `src/lib/billing/{order-tax-engine,hsn-lookup,gst-compliance,billing-schemas}.ts`, `src/lib/billing/invoice/generate.ts`
- API: `src/app/api/[storeId]/checkout/route.ts`, `.../products/route.ts`, `.../products/[productId]/route.ts`, `.../products/[productId]/inventory/route.ts`, `.../products/bulk-tax/route.ts`, `.../order/[orderId]/route.ts`, `.../settings/gst/run-compliance-check/route.ts`, `src/app/api/cron/enforce-gst-grace/route.ts`
- Dashboard UI: `products/[productId]/{page.tsx,components/product-form.tsx,components/product-tax-compliance.tsx}`, `products/[productId]/view/{page.tsx,types.ts,components/product-view-client.tsx,components/product-policy-tab.tsx}`, `products/bulk-fix-tax/{page.tsx,components/bulk-fix-tax-client.tsx}`, `orders/[orderId]/{page.tsx,components/order-types.ts,components/sections/billing-tab.tsx}`, `returns/[returnId]/{page.tsx,components/return-types.ts,components/sections/return-overview-tab.tsx}`
- Storefront: `STORE src/actions/get-order-details.tsx`, `src/components/order/tax-breakdown-card.tsx`
- (False positives from `successRate`: `pickups/page.tsx`, `shipping/analytics/**`, excluded.)

**Store tax/identity/grace fields (`gstRegistered|gstin|stateCode|legalName|pan|isCompositionScheme|invoicePrefix|invoiceNumberFormat|einvoiceEnabled|allowB2BInvoices|priceMode|gstGrace*|declaredTurnoverFy`)**
- Libs: `src/lib/billing/{billing-schemas,buyer-profile,gst-compliance,shoppulse-profile,storefront-b2b,storefront-tax-schemas,order-tax-engine,subscription-tax}.ts`, `src/lib/billing/invoice/{generate,subscription-issue,subscription-template.tsx,template.tsx}`, `src/lib/notifications/platform/templates.ts` (grace mails)
- API: `src/app/api/settings/billing/{route,me/route}.ts`, `src/app/api/subscription/billing-identity/route.ts`, `.../[storeId]/settings/storefront-tax/route.ts`, `.../[storeId]/settings/gst/run-compliance-check/route.ts`, `.../[storeId]/checkout/route.ts`, `.../[storeId]/shipping/delivery-charges/route.ts`, `.../[storeId]/products/**` (3 routes above), `src/app/api/cron/enforce-gst-grace/route.ts`
- UI: `settings/billing-and-tax/{page.tsx,components/billing-tax-form.tsx,components/storefront-tax-form.tsx,components/gst-compliance-status.tsx}`, `src/app/(dashboard)/[storeId]/layout.tsx`, `src/components/banners/gst-grace-banner.tsx`, `src/app/(dashboard)/subscription/components/billing-preflight-modal.tsx`, `products/[productId]/page.tsx`, `products/bulk-fix-tax/page.tsx`
- Storefront (indirect): `STORE src/app/(routes)/checkout/{page.tsx,components/b2b-form.tsx}`, `src/lib/gstin.ts`

**Invoice fields (`invoiceNumber|invoiceUrl|invoiceFinancialYear|sellerGstin|placeOfSupply|buyerGstin`)**
- Libs: `src/lib/billing/invoice/{generate,numbering,cloudinary-storage,cod-paid,email,link-token,subscription-*}`, `src/lib/billing/{buyer-profile,storefront-tax-schemas}.ts`, `src/lib/orders/order-list-where.ts`, `src/lib/returns/tracking-hub-service.ts`, `src/lib/notifications/platform/newtemplates/paymentReceived.ts`
- API: `.../orders/[orderId]/invoice.pdf/route.ts`, `.../orders/route.ts`, `.../order/[orderId]/route.ts`, `.../storefront/orders/[orderId]/invoice.pdf/route.ts`, `.../storefront/orders/[orderId]/invoice/email-resend/route.ts`, `src/app/api/subscription/payments/[paymentId]/{invoice.pdf,resend-invoice}/route.ts`, `src/app/api/subscription/verify/route.ts`, `src/app/api/webhook/razorpay/{store/route.ts,subscription/handlers/{authenticated,charged,updated}.ts}`, `src/app/api/webhook/shiprocket/route.ts`, `.../shipments/[shipmentId]/{delivered,status}/route.ts`
- UI: `orders/[orderId]/{page.tsx,components/{invoice-button.tsx,order-timeline.ts,order-types.ts,sections/billing-tab.tsx}}`, `returns/[returnId]/{page.tsx,components/{return-types.ts,sections/return-overview-tab.tsx,sections/return-refunds-tab.tsx}}`, `src/app/(dashboard)/subscription/{components/subscription-invoices-list.tsx,payment-history/page.tsx}`

**Order money fields (`subtotal|codCharge|shippingCost|codAmount|totalAmount`), 72 files incl. SaaS payment code, grouped**
- Checkout/payments: `checkout/route.ts`, `checkout/verify/route.ts`, `webhook/razorpay/store/route.ts`, `src/lib/payments/checkout-settlement.ts`
- Shipping libs/API: `src/lib/shipping/{auto-ship-service,shipping-service,shipment-list,shipping-settings-service}.ts`, `src/lib/store-settings-service.ts`, `src/types/shipping.ts`, `.../shipments/{route,v2/route,[shipmentId]/{route,assign-courier/route,generate-awb/route}}.ts`, `.../shipping/{delivery-charges,rates}/route.ts`, `cron/daily-shipping-digest/route.ts`, components under `src/components/shipping/**` (ship dialogs, batch lists, settings overview)
- Returns/refunds: `src/lib/returns/{refund-service,return-completion-service,eligibility-for-storefront,submit-multi-slice,storefront-order-cancel-service,tracking-hub-service}.ts`, `src/lib/returns/returns-page/return-list.ts`, `.../returns/[returnId]/{route,inspect/route,process-refund/route}.ts`
- Orders: `src/lib/orders/order-list.ts`, `.../order/[orderId]/{route,tracking/route}.ts`, `.../orders/route.ts`, `src/components/orders/cancel-order-dialog.tsx`
- Dashboard UI: `orders/**` (client, columns, cells, details tabs), `shipments/**`, `returns/**`, `pickups/page.tsx`
- Invoice: `src/lib/billing/invoice/{generate.ts,template.tsx}`; subscription: `src/lib/subscription/apply-plan-change.ts`, `src/app/api/subscription/verify/route.ts`, webhook handlers (SaaS amounts, not storefront)

---

## Appendix B. Open items (not verified) and why

| # | Item | Why not verified |
|---|---|---|
| 1 | Cloudinary raw public_id extension convention, `format:'pdf'` effect on raw, folder mode, account PDF-delivery setting | Needs the Cloudinary console / API; evidence deleted |
| 2 | Shiprocket semantics: COD collectible vs `sub_total`, whether the Shiprocket panel auto-generates its own invoice number, COD remittance path, repo reference doc is internal | Third-party behaviour (NEEDS THIRD-PARTY API VERIFICATION) |
| 3 | Whether prod stores have the Razorpay store webhook configured and which of verify/webhook usually wins (B-03 is proven as a code race only) | Runtime/ops data not in repo |
| 4 | Prisma interactive-tx timeout impact on invoice issue (B-19) | Runtime behaviour; no override found in `src/lib/prismadb.ts` |
| 5 | Shiprocket webhook shipment-kind branching before the invoice hook (B-35); lines before 330 of SRW not read | Out of tax scope, not traced |
| 6 | Restore path for `ArchivedProduct` (B-29) | Not traced |
| 7 | Seller shipping-settings UI/PATCH validation and plan-feature gating internals (`shipping-settings-service.ts`, `planFeatures`) | Only the reads feeding checkout were traced |
| 8 | Storefront PDP/order-success tax wording beyond grep of `src` (no "inclusive" text found) | Grep-based; components not rendered |
| 9 | Auto-ship path persistence of courier freight/COD charges (only manual routes write `Shipment.shippingCharge/codCharge`) | Grep shows no auto-ship writer; not traced end to end |
| 10 | Dashboard banner/notification copy, `order-list-where` invoice filters, order-session/OTP guards | Not tax-logic relevant to this map |
| 11 | `shoppulse-profile.ts` supplier env profile for SaaS invoices | Only existence and usage confirmed |

---

## Appendix C. Audit-hypothesis scorecard (audit.md and owner hypotheses vs code)

| Hypothesis | Verdict | Evidence |
|---|---|---|
| Invoice no. 17 chars | CONFIRMED | NUM:47 (count 17; 22 with 8-char prefix) |
| Always "Tax Invoice" | CONFIRMED | TPL:170 |
| `isCompositionScheme` ignored | CONFIRMED (also by checkout select, generator, template) | CHK:252-269 |
| INDIVIDUAL clears GSTIN, `gstRegistered` stays | CONFIRMED | BILL:151-161,190-200 |
| Shipping + COD fee not taxed | CONFIRMED | CHK:901-915 |
| COD invoice only at delivery | CONFIRMED | COD:73-77 |
| Bracket on inclusive price | CONFIRMED | HSN:273 |
| Missing tax data => silent 0% | CONFIRMED | HSN:297 |
| Seller stateCode not checked vs GSTIN | PARTIAL: client-only check; server none | `billing-tax-form.tsx:135`; BSCH:60-70 |
| Unknown ship state => IGST | CONFIRMED | ENG:131-135,198-200 |
| Invoice "Total tax" = `Order.tax`, no COD row | CONFIRMED | TPL:291,293-304; GEN:195 |
| `priceMode` has no UI | CONFIRMED (no writer anywhere) | grep `priceMode` |
| Payment tax-result columns never written | CONFIRMED | SCH 1154-1160 |
| `invoiceNumberFormat` unused | CONFIRMED (UI previews it, generator ignores) | STX:157; GEN:137-141 |
| `einvoiceEnabled` has no IRP integration | CONFIRMED | SSCH:145-158 |
| No e-way bill / no GSTR-1 | CONFIRMED | grep `src` |
| `toIndianFy` uses server TZ | CONFIRMED | NUM:24-29 |
| `Order.tax` = 0 for INCLUSIVE, memo discarded | CONFIRMED | CHK:874-898 |
| Per-item GST on OrderItem | CONFIRMED | CHK:883-897; SCH 811-822 |
| `Order.codCharge` snapshot; `codAmount` = total | CONFIRMED | CHK:1075,1080 |
| `Shipment.shippingCharge/codCharge` = courier billing to seller | PARTIAL: only written by manual assign-courier/generate-awb routes | `assign-courier/route.ts:112-113`; `generate-awb/route.ts:100-101` |
| Shiprocket gets `hsn:''`, `tax:0` | CONFIRMED (auto-ship only; manual sends neither) | AUTO:368-369; SHIP:480-485 |
| Admin Order summary: Tax 0 on INCLUSIVE, COD row missing | Tax 0 CONFIRMED; COD row exists when `codCharge>0` | `overview-tab.tsx:495,501-507` |
