# 06 API, services and integrations design (Stage 3, 2026-10-31)

Tags as in 04. Aliases for current files are from 02 (CHK, VER, SETTLE, WHK, SRW, AUTO, SHIP, REF, CLD…). Auth conventions: dashboard = Clerk + store ownership; storefront = public `[storeId]` routes (existing CORS) plus the existing customer order-session/OTP or HMAC link token; cron = `Authorization: Bearer CRON_SECRET` (self-hosted scheduler). Revised after the S4 review (resolution table at the end of s4-review.md).

## 1. Service modules (`src/lib/tax/**`)
| Module | Owns | Consumers |
|---|---|---|
| `engine/compute.ts` (pure) | `computeOrderTax` (04 §5), paise maths, allocation, threshold, `engineVersion` | quote, checkout, document issue |
| `engine/document-type.ts` (pure) | `decideDocumentType(regime, taxabilities, mixedMode)` (03 §5) | quote, issue |
| `engine/credit-note.ts` (pure) | builds correction lines from original lines, remaining balances and refunded gross (exact remainders on the final credit) | corrections service |
| `money.ts` | paise ↔ `Prisma.Decimal`, `roundHalfUpDiv` | all tax code |
| `fy.ts` | IST date, `financialYearOf(date)` → `"2026-27"`, `fyShort` → `"26"` | numbering, reports |
| `geo/states.ts` | State master (extends `indian-states.ts`): code, name, kind, threshold classes, intra-State EWB limit | everywhere |
| `geo/place-of-supply.ts` | `resolveShipToState(pincode, chosenCode)`, `resolvePlaceOfSupply(order)`; B2B mismatch rule (D-13) | quote, checkout, delivery-charges |
| `identity/gstin.ts` | single validator (format, checksum, State, PAN); replaces both of today's validators | onboarding, settings, B2B checkout, SaaS profile |
| `identity/registration-service.ts` | `getActiveRegistration(storeId, date)`, `scheduleTransition`, `cancelScheduled`, eligibility checks (03 §9), composition lapse (D-28), locks (D-42) | settings API, checkout, issue, crons |
| `identity/declarations.ts` | `StoreTaxYearDeclaration` read/write, carry-over, HSN tier, B2B gate, composition cap inputs (D-48) | settings, checkout, issue, monitor |
| `identity/ship-scope.ts` | `canShipTo(storeId, stateCode, date)` (regime + `homeStateOnly`) | pincode check, quote, checkout, dispatch |
| `catalogue/search.ts` | HSN search (code prefix + keywords + description), suggestions | product form API |
| `catalogue/resolve-rate.ts` | `resolveRate(classification, date)` (03 §10), `isTaxReady(product, registration)`; at issue the classification is the OrderItem's frozen copy (D-43) | quote, issue, product APIs, readiness |
| `checkout/quote.ts` | builds the engine input from cart + store + address, returns breakdown + HMAC quote token | quote route, checkout route |
| `documents/numbering.ts` | bounded prefix derivation and auto-heal, series upsert, `UPDATE … RETURNING`, exhaustion roll-over, format assert (≤16) | issue |
| `documents/issue.ts` | `issueSaleSet(tx, source, trigger)` with source = `{ORDER, orderId}` or `{EXCH, exchangeId}`; `issueCorrectionNotes(tx, correctionId)`; snapshot builders; never catches inside the transaction (04 §6) | settlement, dispatch, issue-now, corrections, reconcile |
| `corrections/service.ts` | `createCorrection(kind, sourceKey, lines)` under the Order lock: balances (S-9), correction rows, notes per original document, refund-leg linkage | cancel, RTO, returns, exchange, re-issue |
| `shipping/dispatch.ts` | dispatch claim (D-44): eligibility, sale-set ensure, booking adopt-or-create, stale-identity block (D-45), pickup re-check incl. EWB validity | auto, manual, batch, pickup scheduler |
| `documents/repository.ts` | insert-only access + artefact updates (S-3) | issue, outbox, APIs |
| `documents/render/*` | PDF from the document snapshot only (template = last WP) | outbox |
| `documents/storage.ts` | `DocumentStorage` interface; Cloudinary adapter (§5) | outbox, download routes |
| `documents/outbox.ts` | PDF render+store and email processors, each with its own claim and fencing token (D-46), backoff (1m, 5m, 30m, 2h, 12h; then FAILED + seller alert); email only after STORED | cron |
| `reports/*.ts` | GSTR-1-ready CSVs, HSN summary, document summary, composition quarter | reports API |
| `shipping/shiprocket-payload.ts` | one payload builder for auto, manual and batch (§6) | AUTO, SHIP, batch |

## 2. API surface
**New**
| Method + path | Purpose | Notes |
|---|---|---|
| `GET /api/[storeId]/tax/registration` | current period, history, scheduled change, readiness summary | dashboard |
| `POST /api/[storeId]/tax/registration/transitions` | schedule a change (03 §9 payload per type) | OTP ticket for core changes (existing OTP pattern); 409 with reasons on failed pre-checks |
| `DELETE /api/[storeId]/tax/registration/transitions/[id]` | cancel a not-yet-effective change | only if unreferenced |
| `GET/PATCH /api/[storeId]/tax/settings` | `StoreTaxSettings` + prefix edit | prefix uniqueness and lock check |
| `GET /api/[storeId]/tax/readiness` | products not tax-ready, pickup State mismatch, pending EWB, outbox failures, review-required products | banner + checklist |
| `GET /api/tax/hsn/search?q=` | suggestions (code, description, current verified rule, threshold, default UQC) | dashboard auth; cached |
| `GET /api/tax/hsn/[code]/rate?date=` | resolved rule for a date | dashboard |
| `POST /api/[storeId]/checkout/quote` | full breakdown + `quoteToken` | storefront; same validation as checkout |
| `GET /api/[storeId]/orders/[orderId]/documents` | list documents + delivery status | dashboard |
| `GET /api/[storeId]/tax-documents/[docId]/pdf` | stream the PDF (stored artefact; re-render if lost) | dashboard |
| `POST /api/[storeId]/tax-documents/[docId]/resend` | new delivery row | dashboard |
| `GET /api/[storeId]/storefront/orders/[orderId]/documents` and `/documents/[docId]/pdf` | customer access | order session/OTP or link token (retain `link-token.ts`) |
| `POST /api/[storeId]/shipments/[shipmentId]/eway-bill` | save the EWB record (number, date, valid-until; the server fills documents, value and pincodes) and unblock pickup | dashboard; cleared automatically on rebooking, address change or re-issue (D-26) |
| `POST /api/[storeId]/orders/[orderId]/issue-now` | pre-issue the sale set before a rate/regime change (D-17) | dashboard; only before removal |
| `POST /api/[storeId]/orders/[orderId]/reissue` | stale identity at dispatch: correction + new sale set under the active registration (D-45) | dashboard; OTP; refused if ship-to not allowed |
| `GET/PUT /api/[storeId]/tax/declarations/[fy]` | FY declaration (D-48) | dashboard |
| `GET /api/[storeId]/tax/reports/{gstr1,hsn-summary,documents,composition}?fy=&period=` | CSV / ZIP | dashboard; may be plan-gated (D-36) |
| `GET/PUT /api/settings/saas-billing-profile` | ShopPulse billing details (D-01) | user-level; OTP for GSTIN edits |

**Changed**
| Route | Change |
|---|---|
| `POST /api/[storeId]/checkout` (CHK) | requires `quoteToken`; resolves registration, ship-to State (pincode master), ship scope, place of supply, B2B rules, product readiness, rates; runs the engine; writes Order snapshot + `OrderCharge` rows + OrderItem quote fields; 409 `QUOTE_CHANGED` if the recompute differs. Delivery charges are computed in-process via a shared function, not a self-HTTP call (CHK:456-467) |
| `GET /api/[storeId]/shipping/delivery-charges` (DC) | adds `shipToAllowed`, `reason: OUT_OF_HOME_STATE`, `stateCodes` from pincode |
| `POST/PATCH products`, `bulk-tax` | new tax fields (05 §3), shared zod from `catalogue/`, readiness in the response; the bulk tool keeps "apply to selected" but writes the new fields |
| Shipment create / assign-courier / generate-awb / batch / auto-ship | all go through `shipping/dispatch.ts` (D-44): claim, `canShipTo`, pickup-State check, sale set ISSUED under the active registration (COD issues here), booking, EWB gate before pickup scheduling |
| `POST /api/onboarding/complete` | accepts the tax step (03 §14a); creates the first `StoreTaxRegistration`, `DocumentPrefix`, `StoreTaxSettings` |
| `src/app/api/settings/billing/**`, `subscription/billing-identity`, pre-flight modal | read and write `SaasBillingProfile` only (fixes B-04, B-05) |
| SaaS numbering (`subscription-numbering.ts`) | format `SP/{yy-yy}/{6}` (15 chars) for new allocations only; resend/retry reuse the stored number; storage ids persisted (D-37) |
| Gateway client (`razorpay-client.ts:134-136`) | remove the stale "falls back to env vars" comment (B-30, D-50) |

**Removed:** `settings/storefront-tax`, `settings/gst/run-compliance-check`, `cron/enforce-gst-grace` (and its scheduler entry), `orders/[orderId]/invoice.pdf` and the storefront `invoice.pdf` + `invoice/email-resend` (replaced by the document routes).

## 3. Integration changes by flow
| Flow | Today (02) | Target |
|---|---|---|
| Checkout pricing | engine on items only; `Order.tax` 0 on inclusive; floats | quote → create with the same code path; Order + OrderCharge + OrderItem snapshots in paise (D-06, D-11) |
| Prepaid settlement (VER + WHK → SETTLE) | invoice only when the webhook wins (B-03) | settlement transaction commits PAID first; then, on both paths, `issueSaleSet(ORDER, PAYMENT_SETTLED)` in its own transaction. Failure → `saleDocumentStatus=FAILED`, seller alert, reconcile retry; money is never rolled back (D-16) |
| Auto-ship / manual / batch dispatch | invoice not involved | `shipping/dispatch.ts` (D-44, D-45); Shiprocket payload built from sale-set lines (D-35) |
| Shiprocket webhook (SRW) | COD invoice on any DELIVERED | forward DELIVERED → `codCollectedAt`, `isPaid` (collection by courier, not remittance; D-50), "payment received" mail with document links; RTO_DELIVERED → `createCorrection(RTO)`; webhooks never issue sale sets |
| Seller "mark delivered" routes | `markCodPaidAndIssueInvoice` | collection record only |
| Returns refund (REF) | gross refund, `codAmount` bug (B-12), no CN | fix the COD-fee source (`codCharge`). When inspection decides the refund amount: `createCorrection(RETURN)`, then the refund legs (any rails, retries) link to it via `taxCorrectionId` |
| Order cancel (`storefront-order-cancel-service`) | full refund, invoice untouched | under the Order lock: refused while a booking claim is active; if a sale set exists, `createCorrection(CANCELLATION)` before the refund leg |
| Exchange (`exchange-service`) | difference payment only | approval freezes `ExchangeDetail.replacementSnapshot`; returned leg → `createCorrection(EXCHANGE_RETURN)` at inspection; replacement → `issueSaleSet(EXCH)` at the earlier of difference-payment settlement or replacement dispatch (D-23) |
| Admin order page | Tax row = `Order.tax` | "Estimated GST" from Order before the sale set, "Invoiced GST" from documents after it (D-43) + Documents panel (03 §14d) |
| Storefront (`ShopPulseStore`) | "Tax (Included) ₹0", no labels | product page label; cart and checkout render the quote (GST included / split for B2B); pincode → State auto-fill and out-of-State message; documents list on the order page |
| Product archive/restore | archive drops tax data (B-29) | write/read `ArchivedProduct.taxSnapshot` |
| Store deletion / Cloudinary wipe | n/a | the app never deletes a store, only disables it (D-32); any Cloudinary cleanup excludes `tax-documents/**` |
| Variable shipping weight (B-22), COD remittance / insurance fields (B-27) | as in 02 | explicitly out of scope for the tax work (D-50) |

## 4. Background jobs (HTTP cron routes, self-hosted scheduler)
| Route | Schedule (IST) | Work | Idempotency |
|---|---|---|---|
| `/api/cron/tax-document-outbox` | every 5 min | claim and render+store pending PDFs; claim and send deliveries whose PDF is STORED | claim: `UPDATE … SET pdfClaimToken=$t, pdfClaimedUntil=now()+10m WHERE id IN (SELECT … WHERE pdfStatus='PENDING' AND pdfNextAttemptAt<=now() AND (pdfClaimedUntil IS NULL OR pdfClaimedUntil<now()) LIMIT 50 FOR UPDATE SKIP LOCKED) RETURNING`; completion `WHERE pdfClaimToken=$t` (same pattern for deliveries) |
| `/api/cron/tax-document-reconcile` | hourly | PAID prepaid orders with `saleDocumentStatus` PENDING/FAILED and not removed → `issueSaleSet(RECONCILE)`; removed orders without a sale set → exception list + seller alert, no document (D-47) | `issueKey` |
| `/api/cron/tax-registration-reminders` | daily 09:00 | scheduled transition reminders (T-7, T-1), open orders affected by a scheduled transition or published rate change (D-17), composition dates checklist, CN-window warnings from 1 Oct, 1 April declaration reminder | `TaxReminderLog @@unique(storeId, key)` |
| `/api/cron/tax-threshold-monitor` | daily 02:00 | ShopPulse FY sales + declared other turnover vs registration threshold (warnings) and composition cap (warnings; the lapse itself is enforced at issue, D-28) | `StoreTaxYearDeclaration.lastThresholdAlertLevel` |

Effective dates need no job: resolution is by date (I-7).

## 5. Document storage contract (fixes B-01, B-19, B-31)
- Upload after commit, only from the outbox: `resource_type:'raw'`, `type:'authenticated'`, `public_id: shoppulse/{storeId}/tax-documents/{fy}/{docId}.pdf` (`.pdf` included, owner decision 31 Oct), no `format` option. `overwrite:true` while `pdfStoredAt` is null (adopts an orphan from a failed DB write), `overwrite:false` after.
- Persist verbatim from the upload response: `public_id, version, resource_type, type, format, bytes` + our `sha256`, all inside the claim-fenced completion write. Downloads call `private_download_url(pdfPublicId, pdfFormat ?? '', {resource_type, type, expires_at})` with the persisted values only. No URL is stored or parsed.
- Download route: if the asset is missing (404), stream a fresh render to the user, set `pdfStatus=PENDING` so the outbox re-stores it, and log a mismatch if the new hash differs. The route never uploads, and the document data never changes.
- Rendering inputs: `renderVersion` selects the template code path (old versions stay in code); fonts are bundled; the logo comes from `brandingSnapshot` (copied to an immutable asset at issue).
- Owner checks the Cloudinary account's "PDF and ZIP files delivery" setting and unblocks it if needed.
- Behind `DocumentStorage`, so moving to S3 on AWS later is an adapter swap.

## 6. Shiprocket payload contract (one builder; fixes B-21)
| Field (Shiprocket order create) | Value | Verify |
|---|---|---|
| `order_items[].selling_price` | inclusive unit price from the sale-set line (after line discount) | 3P |
| `order_items[].hsn` | product HSN (digits per AATO tier) | 3P |
| `order_items[].tax` | line GST rate % (0 for UNREG/COMP) | 3P (does Shiprocket add it on top?) |
| `shipping_charges`, `transaction_charges` | `Order.shippingCost`, `Order.codCharge` | 3P |
| `sub_total` | value making Shiprocket's COD collectable = `Order.codAmount` (same in auto and manual) | 3P (dummy-server + sandbox) |
| `invoice_number` | our sale document number when the field exists | 3P |
| `ewaybill_no` | `Shipment.ewayBillNumber` when > ₹50,000 | 3P |
| `customer_gstin` | `Order.buyerGstin` (B2B) | 3P |
`shiprocket-api.ts:977-991 generateInvoice()` is deleted. Seller help copy: "Do not print Shiprocket invoices; your ShopPulse invoice is the legal one." The dummy Shiprocket server mirrors the verified fields.

## 7. Error codes (HTTP body `{ code, message, details }`)
| Code | HTTP | Raised by | Customer/seller copy |
|---|---|---|---|
| `TAX_NOT_READY` | 409 | quote/checkout (`productIds`) | "Some items are temporarily unavailable." / seller banner lists the products |
| `SHIP_TO_STATE_NOT_ALLOWED` | 422 | pincode check, quote, checkout, dispatch | "This seller delivers only within {State}." |
| `PINCODE_STATE_MISMATCH` / `PLACE_OF_SUPPLY_UNRESOLVED` | 422 | quote/checkout | "Please check your pincode and State." |
| `B2B_STATE_MISMATCH` | 422 | quote/checkout | "GST invoice is available only when delivering to the GSTIN's State. Continue without GST invoice?" |
| `B2B_NOT_AVAILABLE` | 422 | B2B with AATO > ₹5 cr or B2B disabled | "GST invoice not available for this store." |
| `QUOTE_CHANGED` | 409 | checkout | "Prices were updated. Please review your total." (new quote attached) |
| `PICKUP_STATE_MISMATCH` | 422 | dispatch | "Pickup address State must match your GST registration State." |
| `EWAY_BILL_REQUIRED` | 409 | pickup scheduling | "Enter the e-way bill number for orders above ₹50,000." |
| `TRANSITION_NOT_ALLOWED` | 409 | registration API (reason list) | from 03 §9 pre-checks |
| `PREFIX_LOCKED` / `PREFIX_TAKEN` / `PREFIX_UNAVAILABLE` | 409 | tax settings, numbering | — |
| `TAX_NOT_SELLABLE` | 409 | product form, quote (threshold dead zone, D-10) | "Set a price ≤ ₹2,625 or ≥ ₹2,950.01 for this item." |
| `STALE_REGISTRATION_AT_DISPATCH` | 409 | dispatch (D-45) | "Your GST registration changed after this invoice. Re-issue or cancel the order." |
| `CREDIT_EXCEEDS_BALANCE` | 409 | corrections | — |
| `BOOKING_IN_PROGRESS` | 409 | cancellation during an active dispatch claim | "Shipment is being booked. Try again in a minute." |

## 7a. Third-party verification list (feeds 09)
| Item | Why | Tag |
|---|---|---|
| Cloudinary `private_download_url` with an empty format for raw public ids that carry `.pdf`; account PDF-delivery setting (owner checking) | B-01 follow-up | 3P |
| Shiprocket field names and semantics in §6, COD collectable formula, whether the panel auto-numbers invoices, lookup of an existing booking by our order id (D-44), and **whose bank account receives COD remittance** (I-1) | B-21, B-27 | 3P |
| Pincode → State source (India Post / data.gov.in directory) licence and freshness | D-13 | 3P |
| Official GST UQC list and the State-code master | D-40, D-14 | 3P / CA |
| Future: GSTN public search API (GSP), IRP e-invoice API, EWB API | D-31, D-24, D-26 | 3P |
