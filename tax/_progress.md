# Progress log

## Stage 1 (legal + competitor research), 2026-10-31 (complete)
- Done: notes/tax/01-legal-source-register.md (L-001..L-040, evidence grade per entry, competitor section, verdicts on brief s.6 claims, closure table for O-1..O-9 with safe defaults).
- Source: six owner-run subagent reports plus a light direct pass (s.31, s.52, apparel rate release, ITA 2025 s.393 snippet). No repo read.
- Still unverified, carried with safe defaults in the closure table: rate schedule beyond apparel, IGST place of supply, pickup-State rule, GSTR-1 Table 12 and GSTIN checksum docs, Rule 53/46A full text, composition live text, 2026 notifications 03/05/06 and central 15/2025-CT(R).
- Secondary-only items (treat as unverified): Notif 03/2026-CT, 05/2026-CT, 06/2026-CT(R), central 15/2025-CT(R).
- Open question for owner: none blocking. Stage 5 CA list must include every CARRY row.
- Next stage must read: 01-legal-source-register.md (S3 also reads 02; S2 is independent).

## Stage 2 (codebase investigation), 2026-10-31 (complete)
- Done: notes/tax/02-existing-codebase-map.md (component map, 5 traced flows, brief s.6 code-side verdicts, payment-flow facts, Cloudinary RCA, defects B-01..B-37, Appendix A schema inventory + blast radius, B open items, C audit scorecard). Read-only; no app files touched.
- Proven: INVOICE_FETCH_FAILED = regex at generate.ts:331 keeps `s--sig--/v..` of the signed URL in public_id (only the URL is persisted). Also proven: global `Payment.invoiceNumber @unique` + default prefix `INV` blocks a second store (B-02); prepaid invoice depends on webhook beating the verify callback (B-03); billing-form "GST invoice for subscription" toggle flips storefront `gstRegistered` (B-04); COD-fee refund uses `codAmount` (B-12).
- Payment flow: seller-own Razorpay keys only, no platform fallback, no payouts/transfers/commission code; ShopPulse collects only subscription fees.
- Open (Appendix B): Cloudinary raw public_id extension convention + account settings (console); Shiprocket COD `sub_total`/panel-invoice behaviour; prod webhook config; Prisma tx timeout effect.
- Stage 3 must read: 01 + 02 (Sections 1, 5, 6 and Appendix A are the inputs for 04/05/06); do not re-scan code.

## Stage 3 (architecture), 2026-10-31 (complete; 02 was produced in this session by a subagent before S3 started)
- Done: 03-complete-tax-rules-matrix.md (15 tables incl. transitions, charges, document fields, UX field rules), 04-target-domain-architecture.md (invariants I-1..I-8, decisions D-01..D-40, state machine, engine contract), 05-prisma-schema-and-migration-design.md (new enums/models, model deltas, service invariants S-1..S-8, migration M-1..M-6), 06-api-services-integrations-design.md (modules, routes, flow changes, crons, storage + Shiprocket contracts, error codes).
- Key calls: prepaid document issued inside the settlement tx, COD at dispatch commit (D-16, owner sign-off needed); number `{PREFIX}-{K}{YY}-{NNNNNN}` <=16 (D-18); shipping/COD taxed with goods, proportional allocation (D-11); B2B blocked when GSTIN State != ship-to (D-13); no grace window, block at sale (D-27); inclusive dead zone -> higher rate (D-10).
- Owner decisions (31 Oct, after S3; also in 00-brief s.12): D-16 approved; no tests or test scripts and deliverable 08 dropped (D-34); no dev DB reset, migration = expand -> prefill scripts -> contract (05 s.5 rewritten); stores only disabled, never deleted (D-32).
- 04 is slightly over 4 pages (decision table); S4 may ask to trim.
- S4 reviewer must read: 01, 02, 03, 04, 05, 06. Output holes/contradictions/legal mismatches only.

## Stage 4 (independent review), 2026-10-31 (complete)
- Done: s4-review.md, one findings-only table R-001..R-043 (5 Blocker, 29 High, 7 Medium, 2 Low); no rewrites or new design.
- Read: 00-brief including s.12, 01..06 and audit.md; no application code read or changed.
- Blockers: split-document identity/linkage, composition breach enforcement, concurrent credit caps, existing nullable OrderItem contraction, unresolved mandatory identity/geography prefill.
- Open: LAW evidence scope, issue/rate/transition dates, correction identity and refund lifecycle, dispatch/outbox recovery, numbering, retained-data migration/cutover.
- Official checks: CBIC s.10 and s.31 operative text opened; s.14 and Rule 46A opened but previews truncated, so their disputed scope remains unverified.
- Validation: table columns, sequential ids, evidence/questions, severity ordering and counts checked; no application tests, test scripts, builds or servers.
- Next: owner routes findings to S3; S3 reads s4-review.md, 00-brief s.12 and the referenced 01..06 sections before S5.

## Stage 3 fix round (S4 findings), 2026-10-31 (complete)
- All 43 findings resolved in 03-06 (resolution table appended to s4-review.md). New decisions D-41..D-51: sale sets, locks, frozen checkout inputs, dispatch claim, stale-identity re-issue, outbox fencing, recovery rule, FY declaration, money widening, out-of-scope list (B-22, B-27, B-30), cutover.
- Schema: new TaxCorrection(+Line), StoreTaxYearDeclaration, TaxReminderLog; TaxDocument gets saleSetKey/member, correctionId, noteNature, declarationDeadline, render/branding, claim fields; gstAdjustable removed.
- Owner inputs: Cloudinary public id includes `.pdf`; the owner checks the PDF-delivery setting. 01 L-040 regraded P -> S.
- Open for owner: R-023 (confirm dev orders/refunds are simulations whose tax data and documents prefill may re-derive; money columns untouched).
- Open for CA (feed 09): s.14 change-in-rate, s.31(3)(d) voucher, Rule 46A scope, dead-zone basis, re-issue practice, composition same-day docs, EWB value/scope, "any FY" e-invoice wording.
- 04 is now well over 4 pages; acceptable as the decision register, and S5 summary (00) is the short read.
- S5 must read: 00-brief s.12, 03, 04, 05, 06, s4-review.md resolutions, 01 closure table. S5 produces 07, 09, 00 (no 08).

## Stage 5 (roadmap, CA list, summary), 2026-10-31 (complete; awaiting owner approval)
- Done: 07-implementation-roadmap.md (WP0..WP14, rules G-1..G-8, planning decisions P-01..P-08, reference values R1-R11, launch gate), 09-ca-review-and-unresolved-decisions.md (CA-01..CA-48, 3P-01..3P-07, OW-01..OW-08, traceability to O-1..O-9 and S3 "still open"), 00-executive-summary.md. No 08 (owner decision). No code, schema or migration touched.
- Read: 00-brief incl. s.12, 03, 04, 05, 06, s4-review S3 resolutions, 01 closure table; 02 only for file aliases and B-ids; repo only to confirm cited paths exist.
- New findings: money columns are unbounded Decimal today, so the Decimal(12,2) widening can round (WP0 pre-check, OW-02); extra removal paths (mark-dropoff, pickup-scheduler, request/retry-pickup, pickup batches) added to the dispatch/EWB gate (P-06); Legal Metrology price-label rules never researched (CA-48); Shiprocket COD collection vs ECO question (CA-03).
- Open for owner: approve the architecture; OW-01 (R-023), OW-05 (uncommitted edits touch WP6/WP8 files) before WP0.
- Next: on approval, implementation starts at WP0 (07). Each WP reads 07 + the cited 03-06 sections only.

## WP0 (schema expand, Migration A), 2026-10-31 (complete; owner checks pending)
- Done: schema.prisma carries all 05 s1-s3 enums, models and column deltas; migration `20261031181504_tax_domain_foundation` (generated by prisma, reviewed: only CREATE TYPE/TABLE/INDEX, ADD COLUMN, FK constraints, ALTER ... DECIMAL(12,2); no DROP, no SET NOT NULL). Nothing under src/ or scripts/ changed.
- Pre-check (P-03): 21 money columns, 0 values with more than 2 decimals, 0 values >= 1e10. Row counts and sums identical before and after (Order 142, OrderItem 191, Payment 143, RefundLeg 15, ReturnRequest 68, ExchangeDetail 20, Shipment 133). OW-02 not triggered.
- Deviation: extra `@@index([correctionId])` on TaxCorrectionLine (FK lookup); everything else as in 05.
- `tsc --noEmit`: 8 errors, none from this change (archived product page type mismatch, shipment-linked-tab, categories route Billboard include, notifications/platform/newindex). They sit in files with the owner's uncommitted edits.
- Not run (owner rule: no builds, no servers): `npm run build`, acceptance 4 (legacy prepaid + COD order in dev server).
- Postgres container `shoppulse-postgres` was started for this WP and is still running.
- Next: WP1 (foundations).

## WP0 amendment (DB cleared, legacy dropped), 2026-10-31 (complete)
- Owner decision: dev DB cleared; no prefill. `prisma migrate reset` run, plans re-seeded by `prisma/seed.ts`.
- Migration `20261031183250_tax_domain_drop_legacy` (via `migrate dev`): dropped all legacy tax columns on Store/Product/Order/OrderItem/Payment, dropped `StoreInvoiceCounter`, removed enum values `PREFILL` and `LEGACY_EXCEPTION`, made Address.stateCode, Order tax identity fields and OrderItem tax amounts required. Schema is final (07 G-2).
- `tsc --noEmit` now reports 426 errors, all from removed fields; ownership per file is in 07 ("Compile-error ownership"). Each WP fixes its owned files (G-3).
- Docs amended: 00-brief s.12, 00-executive-summary, 05 s.5 (rewritten, prefill tables removed) and enums, 06 (prefill mentions), 07 (G-1..G-3, P-02, P-03, P-08, P-09, WP0, WP3, WP4, WP5 withdrawn, WP6, WP8, WP12, WP13 = closing sweep).
- Postgres container `shoppulse-postgres` still running. App not started; no builds run.
- Next: WP1 (foundations).

## WP1 (foundations), 2026-11-01 (complete; owner checks pending)
- Done: src/lib/tax/{money,fy,errors}.ts, geo/{states,uqc,pincodes}.ts, identity/gstin.ts (merged validator: format, State, PAN, checksum, S-5 helper), scripts/tax/import-pincodes.ts (CSV path argument; prints source file, row count, multi-State count).
- Changed: billing-schemas, shoppulse-profile, both billing forms and checkout import (path only) now use T/identity/gstin; gst-validators.ts keeps only isValidPincode; src/lib/billing/gstin.ts deleted (its only caller, checkout, repointed).
- tsc: 426 errors, same as baseline, none in WP1 files. Hand-run check: 2027-03-31T18:30Z -> FY 2027-28, 18:29:59Z -> 2026-27.
- Open: pincode CSV not in repo (3P-04): run `npx tsx scripts/tax/import-pincodes.ts <file.csv>`, then check 110001 -> 07, 560001 -> 29. State-class and UQC values and intra-State EWB limits (null = Rs 50,000) are provisional until 3P-05/CA-06.
- Next: WP2 (engine) and WP3.

## WP2 (tax engine, pure), 2026-11-01 (complete)
- Done: T/engine/{types,arith,compute,document-type,credit-note}.ts. `computeOrderTax` (guard, supply type + UTGST split, per-piece threshold with dead zone, proportional/highest-rate allocation, half-up per component per line, inclusive/exclusive), `decideDocumentType` + `saleSetMemberFor` + `decideNoteNature` + `seriesKindFor`, `buildCreditLines` (exact remainder on full credit, clamps to balances). Engine imports only T/errors and a type from T/geo/states; no Prisma, fetch, env or clock. BigInt for paise x bps products (target ES2017, so `BigInt(0)` not `0n`).
- Engine enums are string unions mirroring Prisma; `ENGINE_VERSION = '1'`. TaxNotSellable details carry `maxPiecePricePaiseAtLowRate` / `minPiecePricePaiseAtHighRate` for the WP4 product-form copy.
- Scrubbed planning ids from WP1 comments (errors.ts, states.ts, uqc.ts, gstin.ts) per the code-comment convention.
- Checks: tsc 426 (baseline), none in src/lib/tax; eslint src/lib/tax clean. One-off in-memory run (temp file outside the repo, deleted) reproduced R1-R11 to the paisa, plus over-credit and TAX_NOT_READY. UI re-check of R-values stays with WP4/WP6/WP10 (acceptance 3).
- Next: WP3 (identity + settings), then WP4.

## WP3 (seller identity, registration, settings, SaaS billing split), 2026-11-01 (complete; UI checks deferred)
- Done: T/identity/{registration-schemas,registration-service,declarations,ship-scope,tax-settings-service}.ts, T/documents/numbering.ts (prefix part: bounded derivation + auto-heal via createMany skipDuplicates, reserved list, GSTIN binding, FY lock), T/http.ts; fy.ts date-only helpers; error TAX_IDENTITY_MISSING; OTP purpose TAX_REGISTRATION_CHANGE (+ /api/tax/registration-otp/{request,verify}). Routes: API/[storeId]/tax/registration (GET, POST first setup, PATCH name/address), /transitions (POST, OTP), /transitions/[id] (DELETE), /tax/settings (GET, ?checkPrefix, PATCH), /tax/declarations/[fy] (GET/PUT, prev/current/next FY).
- UI (Sonnet subagents): billing-and-tax page rewritten with 4 cards: registration (setup form, current period, history, edit details, Change GST status wizard + OTP, delete scheduled), invoice settings, FY declaration, ShopPulse billing. Preflight modal prefills PAN.
- SaaS split: buyer-profile + /api/settings/billing(+me) read/write SaasBillingProfile only; grace start/mails removed from that route (B-04, B-05). Deviation: no separate `API/settings/saas-billing-profile` route, the existing /api/settings/billing path is that route. subscription-tax/-issue/shoppulse-profile needed no change (they use the payment snapshot).
- Deleted: settings/storefront-tax route, storefront-tax-schemas.ts, storefront-tax-form.tsx, gst-compliance-status.tsx. Grace banner mount + non-compliant count removed from the [storeId] layout (component file + gst-compliance.ts remain for WP4 to delete). OTP store dispatcher brands with store name.
- Owner decision: onboarding not touched; spec in notes/tax/onboarding-tax-step-content.md. Fresh stores set up identity from the settings setup form; until then identity-dependent code raises TAX_IDENTITY_MISSING. 07 WP3 text amended.
- Design calls: one scheduled change at a time; a backdated change may only shorten the current (last) period; same-day change replaces the current period only if nothing references it; REG->COMP needs the exact FY declaration with PAN-wide amount; same-PAN stores give a warning (never named), not a block; NEW_GSTIN always lands on REGULAR; prefix edit moves active + scheduled periods of the same GSTIN.
- Checks: tsc 373 (was 426), no new error in src (only stale `.next/types/validator.ts` pointing at the deleted storefront-tax route; regenerates on next dev/build); eslint clean on touched files (1 pre-existing warning). Acceptance 1-8 are UI checks, deferred until the app first starts (G-3).
- Next: WP4.

## WP4 (product tax fields, catalogue), 2026-11-02 (complete; UI checks deferred)
- Done: T/catalogue/{product-tax-schema (shared zod, readiness, preview, dead-zone, parseProductTaxWrite, snapshot helpers), resolve-rate (published-version lookup, longest-prefix rule, verified only), search, readiness-service}.ts. Routes: /api/tax/hsn/search, /api/tax/hsn/[code]/rate, /api/[storeId]/tax/readiness. Product POST/PATCH/inventory/bulk-tax pass the catalogue rate to the dead-zone check (422). Registration transition to regular warns with the count of non-tax-ready products.
- UI: product-tax-compliance has Find HSN search, live lookup (description, default unit, catalogue rate read-only, manual-differs warning), chip with the store's HSN digits (6 above 5 crore). bulk-fix-tax uses real lookups (server for listed HSNs, fetch for new ones). No archive/unarchive for GST; archive-product writes taxSnapshot.
- Rule choice: if the longest matching rule is UNVERIFIED it is a hint only and a shorter verified rule does not stand in (seller picks manually).
- Deleted: gst-compliance.ts, legacy product tax schemas in billing-schemas.ts. Seed uses a tax block.
- Data: scripts/tax/import-catalogue.ts <file.json> [--publish] (DRAFT, --publish retires the previous). scripts/tax/data/catalogue-dev.json is a DEV SAMPLE from the legacy hsn-reference (37 threshold rules as verified, 50 unverified). Not loaded yet. Real catalogue needs official data + CA check (3P/CA items).
- Checks: tsc 263 (was 350), no new error file (only stale .next validator line shift); eslint/prettier clean on touched files. UI checks 1-6 deferred until first app start (G-3).
- Next: WP5.

## WP6 (checkout quote + order snapshot, admin API), 2026-11-01 (complete; UI/API checks deferred)
- Done: T/geo/place-of-supply.ts (pincode -> State, State-text resolver, B2B GSTIN-State rule, delivery scope of a pincode), T/checkout/{quote,quote-token,order-snapshot}.ts, POST /api/[storeId]/checkout/quote, src/lib/shipping/delivery-charge-service.ts (shared in-process; no self-HTTP). Checkout now builds the same quote, requires `quoteToken` (missing = 400 QUOTE_TOKEN_REQUIRED; expired/changed = 409 QUOTE_CHANGED with a fresh quote) and writes Order + OrderItem + OrderCharge from the quote snapshot. Delivery-charges route returns 422 SHIP_TO_STATE_NOT_ALLOWED before any courier call, plus shipToAllowed/stateCodes. storefront-b2b.ts reads settings + declaration.
- Order page/API: storefront order + tracking routes return estimated GST from the Order; admin order page shows "Estimated GST", quoted per-line/charge GST and the B2B card from the Order; invoice button, invoice card and the invoice timeline event removed (documents panel arrives with document issue).
- Deleted: order-tax-engine.ts, hsn-lookup.ts, hsn-reference.json, invoice-button.tsx. New env: QUOTE_TOKEN_SECRET (dev fallback outside production).
- Rules chosen: registered (regular and composition) sellers can only sell tax-ready products; unknown pincode = PLACE_OF_SUPPLY_UNRESOLVED (load the pincode directory first); stored shipping State is the canonical name; manual cess under composition is not kept on the frozen classification (WP8 note).
- tsc: no error in any WP6-owned file; remaining errors are in WP8-WP11 files and two pre-existing (categories route, notifications newindex). eslint/prettier clean on touched files.
- Deferred (app not started, G-3): acceptance 1-7 need WP7 storefront or direct calls to the quote route, plus a loaded pincode directory and published catalogue.
- Next: WP7 (storefront display) in the same release, then WP8.

## WP8 (document issue core, prepaid trigger, reconcile, composition lapse), 2026-11-01 (complete; UI checks deferred)
- Done: T/documents/{issue (issueSaleSet / issueSaleSetSafely / canIssueSaleSetNow / isOrderRemoved), snapshots, repository}.ts; numbering.ts series part (createMany skipDuplicates + UPDATE ... RETURNING, roll to a new prefix past 999,999, warn from 900,000, format assert); registration-service `recordForcedCompositionExit`; src/lib/orders/cod-collection.ts. Routes: GET orders/[orderId]/documents, POST orders/[orderId]/issue-now, GET cron/tax-document-reconcile (hourly, vercel.json + dummy-server cron list). Error DOCUMENT_NOT_ISSUABLE (409). Seller mails: issue failed, shipped without invoice, composition lapsed (templates.ts).
- Issue tx: Order FOR UPDATE -> existing set? -> Store FOR SHARE -> eligibility (not closed, prepaid paid, not physically shipped) -> registration of the issue day -> composition cap (PAN-wide FY documents net of credit notes + declared other turnover + this sale; breach = forced REGULAR row from today, same prefix) -> engine on frozen OrderItem classification with the issue-day catalogue rate (MANUAL = frozen rate) -> numbers -> documents + lines -> Order ISSUED. issueKey race re-reads; P2002/P2034 retried once.
- Triggers: VER and WHK call issueSaleSetSafely on `settled` and `already_paid`, awaited before auto-ship; failure -> FAILED + one seller mail, money untouched. COD delivered (SRW, delivered, status routes) -> recordCodCollection only (isPaid, paidAt, codCollectedAt). RZP stale comment fixed. subscription-numbering uses T/fy.
- Admin order page: Billing tab "Documents" card (status, list, Issue invoice now), overview "Invoiced GST" once documents exist.
- Deleted: GEN, NUM, cod-paid.ts, and (deviation, earlier than WP9) admin orders/[orderId]/invoice.pdf, storefront invoice.pdf and invoice/email-resend routes, since they only wrapped GEN. Storefront invoice CTAs 404 until WP9's document routes; api-docs entries still list them (WP9).
- Choices: removal = forward shipment picked up or in a later physical state (booking alone is not removal); unregistered lines without classification are stored as TAXABLE at 0%; brandingSnapshot keeps logoUrl + footer (logo copy is WP9); `issueCorrectionNotes` not scaffolded (WP10 writes it).
- Checks: tsc 97 (was 159), no new error; removed errors were all WP8/WP9 legacy files. eslint clean (1 pre-existing warning); prettier on new files. Acceptance 1-9 need the app (deferred, G-3).
- Next: WP9 (outbox, storage, PDF v1, document download routes).

## WP7 (storefront display, ShopPulseStore), 2026-11-01 (verified complete; UI checks deferred)
- Reviewed the existing storefront work: quote action + hook, quote token sent on both create paths, QUOTE_CHANGED / B2B / ship-to error handling, pincode -> State fill, cart "Includes GST", checkout breakdown (CGST/SGST/UTGST/IGST/cess), "Inclusive of all taxes" gated on the store's `gstApplies`, order success/tracking labels. Store `tsc` clean. Nothing further was missing.
- Deferred (app not started, G-3): acceptance 1-5 in the browser.

## WP9 (outbox, storage, PDF v1, email, downloads, SaaS ids), 2026-11-01 (complete; UI checks deferred)
- Done: T/documents/{storage (DocumentStorage + Cloudinary adapter: raw, authenticated, id `shoppulse/{storeId}/tax-documents/{fy}/{docId}.pdf`, ids persisted verbatim, missing asset = null), outbox (PDF and delivery queues, own claims, 10-min lease, FOR UPDATE SKIP LOCKED, fenced completion, backoff 1m/5m/30m/2h/12h, seller alert when the PDF queue gives up), download (stored asset, else fresh render + requeue), render/{v1.tsx, index.ts}}. The first stored PDF queues one customer email in the same fenced write. Routes: cron/tax-document-outbox (5 min, vercel.json + dummy-server list), GET tax-documents/[docId]/pdf, POST .../resend, storefront documents (list), documents/[docId]/pdf, documents/resend (short token only). verify-otp now returns `documentsUrl` and `downloadUrl` (first document).
- Email: invoice/email.ts replaced by `sendTaxDocumentEmail` (outcome SENT / SKIPPED_NO_PROVIDER / FAILED, link to document route). link-token.ts keeps the token, URL builders now point at documents. Documents panel (billing tab) has PDF, Resend and email status.
- SaaS: number `SP/26-27/000001` (15 chars, asserted <= 16, new allocations only); storage ids persisted on SubscriptionPayment (`invoicePublicId/Version/ResourceType/DeliveryType/Format`), id `shoppulse/saas/invoices/{fy}/{number with - for /}.pdf`; `loadSaasInvoicePdf` re-renders and re-stores a lost asset; invoice.pdf and resend-invoice routes use it. `invoiceUrl` is no longer written.
- Storefront: order-hub OTP modal lists several documents; email resend moved to `documents/resend`; api-docs updated.
- Deleted: invoice/cloudinary-storage.ts, invoice/template.tsx, the old SaaS issue module (rewritten). Not changed: paymentReceived.ts (SaaS email template, `invoiceUrl` is a plain string, no caller builds a legacy link). Logo copy into an immutable asset is not done (v1 prints footer text only; logo belongs with the v2 layout in WP14). Hub `invoices` list in tracking-hub-service stays with WP10 (still reads removed fields).
- Checks: tsc 97 (unchanged baseline, no error in WP9 files; Store clean); eslint + prettier clean on touched files. Acceptance 1-7 need the app and Cloudinary (deferred, G-3). Owner check: Cloudinary account "PDF and ZIP files delivery" setting (OW-04) before acceptance 2-3.
<!-- NOTE: yeh its ON -->
- Next: WP10 (corrections).

## WP10 part (a) (corrections core), 2026-11-01 (complete; wiring is part (b))
- Done: T/corrections/service.ts: `createCorrection` / `createCorrectionTx` (Order FOR UPDATE, sourceKey idempotency, balances from TaxCorrectionLine sums, scope ALL_REMAINING or LINES {goods by orderItemId+qty+gross, charges by kind+gross split largest-remainder}, TaxCorrection + lines, one CREDIT_NOTE per original doc: original registration/supplier/recipient/branding/prefix, issueKey `CORR:{corrId}:{docId}`, trigger CORRECTION, noteNature via GSTIN-in-force, declarationDeadline 30 Nov or earlier annual-return date, GST notes only), `reportCorrectionCreated`, `linkRefundLegs`, `getRemainingBalances`, `getCurrentSaleSet`, `isSaleSetStale`, `reissueSaleSet` (REISSUE correction + new set `ORDER:{orderId}:R{n}` in one tx).
- issue.ts: `issueSaleSetTx` takes a set key; exports `issueReissuedSaleSetTx`, `reportSaleSetIssued`, `IssueOutcome`. snapshots.ts: `creditNoteSupplierSnapshot`.
- Choices: zero-gross goods requests are skipped (fully deducted return = no note line); a correction crediting 0 returns `correctionId: null`; note goods lines keep the original unit price and show any deduction as discount; exclusive-price notes show pre-tax gross; note issuance lives in the service (not issue.ts).
- Not done here (part b): cancel/RTO/return/exchange wiring, replacement sale set `issueSaleSet(EXCH)`, reissue route + OTP, UI, tracking-hub invoices list, B-12.
- Checks: tsc 97 (unchanged), none in src/lib/tax; eslint + prettier clean.

## WP10 part (b) (wiring), 2026-11-01 (complete; UI checks deferred)
- Done: cancel (shipping-service `settleOrderCredit`: Order lock, active-booking refusal BOOKING_IN_PROGRESS, correction before the cancellation leg, leg linked; used by instant cancel, force-finalize, deferred webhook cancel, cancel-via-RTO), RTO_DELIVERED (forward shipments only), returns (new src/lib/returns/return-tax-credit.ts; refund-service credits the refunded goods + shipping/COD fee before any leg, legs and retries carry the correction; COD-fee refund now from `codCharge`), exchange (frozen replacement snapshot at approval, returned leg credited at inspection, `issueReplacementSaleSet`), re-issue route + order-page action, Documents panel notes/deadline warning (from 1 Oct), return page + tracking hub on TaxDocument.
- Choices: credit for a return = refunded item gross (restocking fee excluded; unwaived reverse-shipping fee netted off item, then COD fee, then shipping); chained returns (return of a replacement) skip the credit with a warning; reissue reuses OTP purpose TAX_REGISTRATION_CHANGE (no schema/enum change); replacement invoice is issued at the first of: approval with difference already paid, difference paid after approval, replacement dispatch (strict, before booking); a seller-side cancel via courier webhook without a pending request credits tax only (no refund leg).
- Not covered / deferred: exchange cancelled after its replacement invoice was issued (no credit for the replacement set); credit/refund failure in webhook-driven cancels is only logged (the order stays un-cancelled, seller can cancel again); customer-cancel preview does not show BOOKING_IN_PROGRESS; `process-refund` with a changed passed quantity keeps the first correction.
- Checks: tsc 97 -> 84, no error left in WP10-owned files, no new error; eslint + prettier clean on touched files. All UI/API acceptance needs the app (deferred, G-3).
- Acceptance 1-10: covered by code: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 (note nature via existing decideNoteNature); all deferred to manual runs (dummy Shiprocket for 8, Razorpay test for 1, 4, 5).

## WP11 (dispatch gate, Shiprocket payload, e-way bill, pickup gates), 2026-11-01 (complete; UI/API checks deferred)
- Done: src/lib/shipping/{dispatch (booking gate, hand-over gate, pickup partition), eway-bill (limit, check, save/clear), shiprocket-payload (one builder), pickup-state}.ts; route shipments/[id]/eway-bill (GET/POST/DELETE, re-queues a pickup blocked only by the missing bill) + card on the shipment page. Booking gate: order open -> ship-to allowed -> pickup State = registration State -> invoice issued (COD issued here, prepaid must already be) -> not stale. Used by createShipment (manual + batch), auto-ship, manual-courier create, assign-courier, generate-awb, awb PUT, mark-dropoff. Pickup scheduling (cron, request-pickup, createPickupBatch, retryBatchPickup, retry-pickup) filters through the same gate + e-way bill; blocked shipments become PICKUP_FAILED with the reason.
- Payload: HSN, rate %, inclusive unit price from the issued lines, shipping_charges, transaction_charges, sub_total = collectable - both fees, invoice_number, customer_gstin, ewaybill_no. Dummy server logs/stores them; generateInvoice and its dummy route deleted. Pickup addresses now carry stateCode (create/update validate against pincode; sync skips unplaceable ones and counts them).
- Choices: e-way bill needed when consignment value (sum of current sale set) > limit; intra-State limit from the State master, else national; record valid only if it covers the current invoice numbers, pincodes and the pickup day; invoice re-issue clears it. Delivery pincode override at manual ship is refused (place of supply is fixed on the invoice). B-35: reverse legs never record COD collection (webhook already branched; seller delivered/status routes now forward-only).
- Open: 3P-02 (does Shiprocket add `tax` on top, how COD amount derives from sub_total + charges, invoice_number length) still unverified on the sandbox; B-22/B-27 untouched.
- Checks: tsc 8 errors (was 9; none new, none in WP11 files; fixed shipment page `tax` -> `taxTotal` and an InspectionStatus typo in shipment-linked-tab); eslint clean on touched files; dummy-server syntax checked. Acceptance 1-8 need the app (deferred, G-3).
- Next: WP12 (reports, monitors, readiness).

## Manual UI testing guide (WP1-WP11), 2026-11-01
- Draft only: `10-manual-ui-testing-guide.md` has 15 scenarios, 27 numeric examples and a 67-item acceptance map; it is not execution-ready or launch sign-off.
- NOT TESTABLE/incomplete: natural date/FY boundaries, exclusive pricing UI, deterministic issue failure, manual over-credit, prefix exhaustion, replay/concurrency and no-control dispatch paths; see the guide.
- Owner/CA: licensed pincode source, official catalogue, CA launch questions and 3P-02 Shiprocket verification remain; no application, schema or other tax notes changed.
- After WP12/13/14: complete and audit all marked partial walkthroughs, then add report/reminder/export, final sweep and template-v2 acceptance.
