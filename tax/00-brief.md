# ShopPulse GST & Tax Infrastructure Redesign: MASTER BRIEF (planning only, NO code)

## 0. How this brief is used
Saved as notes/tax/00-brief.md and reused across sessions. Each session is told: "Read
notes/tax/00-brief.md. Execute Stage N only." Do only that stage (see §10).
- Write each deliverable to notes/tax/ as soon as it is finished, never only in chat.
- End every stage by appending ≤10 lines to notes/tax/_progress.md: done / open questions /
  what the next stage must read.
- Later stages read earlier stages' output files. They never redo that research or re-scan code
  that has already been mapped.

## 1. Role and context
Act as Principal SaaS Architect + Indian GST research analyst + senior tax-systems engineer.
ShopPulse is an Indian multi-tenant e-commerce SaaS (read memory about what this app is). Sellers get independent storefronts and
e-commerce infrastructure for subscription fees. ShopPulse does not buy or resell their goods.
Do NOT assume this exempts us from e-commerce-operator provisions (GST TCS, income-tax TDS on
e-commerce participants). Derive our legal classification from the real money flow and technical
architecture. The customer payments go to each seller's own Razorpay
account.
Repos: Admin D:/study/ShopPulseAdmin · Storefront D:/study/ShopPulseStore
Inputs: notes/tax/audit.md (an earlier AI audit with code-level findings and proposed fixes; read only in Stages 2 and 4. Stage 1 does NOT read it, §6 lists the claims to research) and the owner notes in §9. ALL of it is hypothesis, not decision.
The owner is a solo developer without GST expertise and delegates every legal-research,
architectural and design decision to you. Challenge his assumptions.

## 2. Objective
Redesign the whole taxation domain from its foundations. Research, design and document it
completely BEFORE any schema, API or function change. Assume substantial restructuring or full
replacement; keep nothing just because it exists. Legal correctness comes first, within what a
solo developer can ship as an MVP. Historical invoices and completed financial transactions
stay immutable.

## 3. Research standard (as of 31 Oct 2026)
- Primary sources only for legal conclusions: CGST/IGST Acts and Rules with amendments; CBIC
  notifications, circulars, clarifications; GST Council recommendations and the provisions
  notified from them (especially 2025-26: 56th and 57th meetings, GST 2.0 rate rationalisation);
  GST Portal/GSTN docs; Income-tax Act 2025 and rules; e-invoice, e-way bill and reporting
  rules; official tariff/HSN sources. Never use model memory for law or rates.
- Each legal conclusion becomes a register entry L-nnn: exact section/rule/notification ·
  official URL · effective dates · the actual requirement · effect on our architecture ·
  uncertainty needing CA.
- Competitors (Shopify, WooCommerce, Dukaan, Shoopy and similar Indian platforms): record
  documented behaviour only, in a separate section with URLs. Never use it as legal proof, never
  invent features or API fields. Keep "they do X" apart from "we recommend Y".
- Context hygiene: extract the needed lines, record them, drop the page. If subagents are
  available, use one per topic, each returning a digest ≤300 words + URLs.

## 4. Scope (also cover anything important I missed)
A. Seller tax identity
 - Statuses: unregistered, regular, composition, plus any other relevant category or special case.
 - An individual/proprietor is NOT the same as GST-unregistered; do not conflate them.
 - Lifecycle: opt-in, opt-out, status change, legal-entity change, PAN change, GSTIN change,
   cancellation.
 - Owner's switch scenarios: turnover falls below threshold; seller goes intrastate-only;
   business becomes a hobby; partner exit, moving from business PAN to personal PAN; other.
 - Switching must be smooth and legally compliant, and history must stay consistent. Define what
   freezes, grace rules, and what the seller must be told.
B. Tax engine
 - FIRST SEE THE CURRENT PRODUCT, ORDER, ORDERITEMS, SHIPPING SCHEMA FIELDS. Product GST/HSN; inclusive vs exclusive pricing; MRP vs selling price.
 - Discounts and coupons aren't implemented in the app; they will be implemented in the future.
 - CGST/SGST/UTGST/IGST; place of supply, including B2B with shipping state ≠ buyer-GSTIN state.
 - Exempt, nil and zero-rated supplies; B2B vs B2C; mixed-rate orders.
 - Returns, refunds, exchanges, cancellations, credit notes.
 - Effective-dated rate changes; paise-exact rounding (line vs invoice level).
C. Shipping and other charges
 - First understand OUR implementation: seller shipping config (fixed and variable, and the
   variable formula), COD fee config, and the actual Shiprocket requests/responses. Use official
   Shiprocket docs; the audit says we send hsn '' and tax 0 (verify).
 - Research tax treatment of: fixed shipping, variable shipping, third-party courier charges,
   insurance, COD fee, payment-processing charges, other customer-facing charges.
 - For each, decide: component of the principal supply (composite/mixed supply; multiple rates
   in one cart) vs independent supply; inclusive vs exclusive.
 - Design checkout display, order record and invoice display.
D. Invoice lifecycle (prepaid and COD)
 - Document types: tax invoice, Bill of Supply, invoice-cum-Bill of Supply, credit/debit notes.
 - Numbering: statutory format limits; atomic per-store, per-FY, per-series counter;
   cross-store uniqueness. Owner preference: store-derived prefix, uniqueness enforced across
   stores, auto-heal (retry with a changed prefix) on collision. Legal limits override this.
 - Financial year computed in IST.
 - Issue trigger: the legally appropriate removal/dispatch event. Owner expects courier
   booking/dispatch for BOTH prepaid and COD (verify). An older note said "invoice after COD
   delivery"; that is superseded unless the law requires it. COD-delivered webhook then means
   cash reconciliation + mail.
 - Shiprocket's own invoice printing must never create a second series.
 - Retries and idempotency; PDF storage in Cloudinary; email delivery and access.
 - Cloudinary INVOICE_FETCH_FAILED 404 is a SEPARATE root-cause task from numbering. The error
   shows publicId=s--<sig>--/v<version>/shoppulse/<storeId>/invoices/2026-27/INV-...
   Hypothesis: public_id is being parsed from a signed/versioned delivery URL, or
   resource_type/type/extension is wrong. Trace the store/fetch path, check how publicId,
   version and resource_type are persisted and rebuilt, and list what must be checked in the
   Cloudinary console. The owner already deleted the DB invoice fields and the asset for the
   affected order (WIW store), so the evidence is gone: do code-path analysis. Deleting DB
   references and regenerating is NOT a root-cause fix.
 - Visual template/PDF redesign comes dead last. Decide now only the document model, mandatory
   fields, types and lifecycle.
E. Composition scheme
 - Research and redesign completely; do not patch the half-built existing one.
 - Cover eligibility, restrictions, liability, customer-facing pricing (no tax collection),
   Bill of Supply wording, reporting, state restrictions, transitions in/out and edge cases.
F. HSN catalogue
 - Rebuild from official tariff and GST-rate notifications, never from model memory (the
   existing catalogue predates GST 2.0 and is unreliable).
 - Design versioned, effective-dated rate data; classification suggestions; seller
   confirmation; an update mechanism; HSN digit requirements by turnover (verify).
 - MVP must be useful without pretending suggestions replace professional tax advice.
G. Compliance infrastructure
 - GSTIN validation (checksum, state code vs PAN, live-verification options).
 - GSTR-1-relevant reports/exports; HSN summary; e-invoice/IRN thresholds; e-way bill.
 - Registration and turnover restrictions, including unregistered inter-state supply.
 - Seller compliance policy: grace period vs immediate blocking (decide and justify); record retention.
 - Classify each item: legally mandatory / optional premium / future integration.
H. Seller and buyer experience
 - Specify exactly what the seller enters in onboarding, Billing & Tax settings, product
   creation, shipping settings and order management.
 - Product form: what a non-expert should enter (MRP, selling price, HSN, rate) and what is
   auto-calculated. Provide fields, defaults, validations, tooltip copy, warnings, restrictions.
 - A non-technical seller must understand what is needed and why.
 - Storefront: price labels ("inclusive of taxes"), cart/checkout tax breakdown.

## 5. Existing-code investigation (Stage 2)
- Trace actual execution paths (not just filenames or comments) through: Prisma models and
  migrations, src/lib/billing/**, checkout and order creation, product tax compliance,
  Billing & Tax settings, invoice generation/numbering/COD, Cloudinary storage, Shiprocket
  integration and webhooks, storefront product/cart/checkout, refund/return/exchange, cron jobs.
- Use the file:line references in audit.md as starting points only (they may be stale); do not rescan unrelated code.
- Prisma: read only tax/billing/order/payment/store/product models via keyword search, never
  the whole schema.
- Mark each component retain / redesign / replace / remove, with file:line evidence.

## 6. Audit claims to verify independently (hypotheses, not facts)
1. Unregistered sellers cannot supply goods inter-state at all. Check the small-supplier
   exemption for inter-state goods and the e-commerce-operator route; the owner suspects this
   is overstated.
2. Invoice number ≤16 characters (Rule 46), allowed characters, uniqueness per FY.
3. Seller-billed shipping/COD charges are part of the principal supply and take its rate
   (composite/mixed supply, multi-rate carts).
4. Apparel/footwear ₹2,500 slab is tested on the pre-tax value, and which goods it covers
   after GST 2.0.
5. Goods invoice due at or before removal; applies to COD.
6. Rates since 22 Sep 2025 (0/5/18/40, 3% jewellery), cess status, and the audit's specific items
   (shampoo/toothpaste/soap, pencils/exercise books, sanitary pads).
7. Bill of Supply rules per status (composition wording, exempt-only registered,
   invoice-cum-Bill of Supply for mixed).
8. E-way bill ₹50,000 threshold and who generates it for courier-shipped B2C; e-invoice
   turnover threshold; 6-digit HSN above ₹5 crore.
9. Place of supply and buyer ITC when shipping state ≠ buyer-GSTIN state.
10. Pickup-location state vs seller GSTIN state.
11. Whether our SaaS role triggers e-commerce-operator TCS/TDS.

## 7. Architecture decisions required (Stage 3)
Data model; seller tax identity and registration; product tax master data; tax engine (pure
function, effective-dated rates, paise-exact); charge classification; immutable order-level
tax snapshots; invoice/document models; invoice series and atomic numbering; shipping/COD
architecture; settings and validation rules; gstStatus transition state machine; historical
data migration; services and shared utilities; API boundaries; background jobs and
enforcement; error handling, idempotency, concurrency; logging and audit trail; automated
tests. Each must account for existing ShopPulse features and multi-tenant scale.

## 8. Deliverables (terse; tables over prose; reference L-ids instead of restating law)
00-executive-summary.md              ≤1 page
01-legal-source-register.md          L-table + separate "competitor observed behaviour" section
02-existing-codebase-map.md          ≤3 pages: file:line map, retain/redesign/replace/remove,
                                     verdict per §6 claim, payment-flow facts, Cloudinary analysis
03-complete-tax-rules-matrix.md      tables only: status × charge × document × tax treatment ×
                                     inc/exc × invoice display
04-target-domain-architecture.md     ≤4 pages
05-prisma-schema-and-migration-design.md   new/changed models in Prisma syntax + historical
                                     migration steps
06-api-services-integrations-design.md     ≤3 pages
07-implementation-roadmap.md         work packages WP0..n in dependency order. Each ≤1 page:
                                     files, DB changes, acceptance tests, don't-touch list.
                                     WP0 = schema (then frozen); invoice template = last WP
08-complete-test-scenarios.md        ≥25 numeric golden cases for the tax engine (to the paisa)
                                     + scenarios for invoice lifecycle, status switches,
                                     concurrency/idempotency
09-ca-review-and-unresolved-decisions.md   per item: question, our assumption, risk if wrong

Tag EVERY decision with one of: CONFIRMED LEGAL REQUIREMENT (+L-id) · OBSERVED EXISTING CODE
BEHAVIOUR (+file:line) · RECOMMENDED ARCHITECTURAL DECISION (+confidence H/M/L) · NEEDS CA
CONFIRMATION · NEEDS THIRD-PARTY API VERIFICATION. Do not hide uncertainty behind confident prose.

## 9. Owner notes
- Target: a tax system no weaker than Shopify/Dukaan/WooCommerce/Shoopy.
- Composition scheme must be fully implemented this time and transition from gst to composition should be well researched and planned.
- Built without a CA for the MVP; a CA will be appointed before hosting/launch, so
  09-ca-review is that CA's checklist, but you do as much of the work as you can that CA will do.
- Current schema has Payment.invoiceNumber globally unique, so two stores' first invoices
  collide (P2002).
- The existing grace-period cron and bulk-HSN tool were built on intuition. Keep or replace
  per your design.

## 10. Stage protocol
S1 Legal + competitor research (no repo)      → 01
S2 Codebase investigation (repo, read-only)   → 02    [S1 and S2 may run in parallel]
S3 Architecture (reads 01, 02 only)           → 03, 04, 05, 06
S4 Independent review by a DIFFERENT model: read 01-06, output ONLY holes, contradictions and
   legal mismatches (no rewrites). Owner routes fixes back to S3.
S5 Roadmap, tests, CA list, summary           → 07, 08, 09, 00. Then STOP and present the final
   architecture for approval.

## 11. Non-negotiable
- Do not modify application code or the Prisma schema; no migrations or partial fixes; no branch
  changes, resets or discarded changes.
- Do not assume Indian tax law from outdated model knowledge; do not invent competitor features
  or API fields.
- Do not trade legal correctness for implementation convenience.
- Keep it practical for a solo developer and an MVP.
- Do not start coding after finishing the first few sections. Finish research, code
  investigation, architecture, schema/migration design and test strategy, then stop for review.
The goal is a correct foundation before any implementation code, not an existing system that
looks fixed under another set of patches.

## 12. Owner decisions after Stage 3 (31 Oct 2026; these override earlier sections)
- No automated tests and no test scripts. Deliverable 08 is dropped; S5 produces 07, 09, 00 only.
  After implementation, the implementing model writes a manual step-by-step UI testing guide.
- Dev DB cleared on 31 Oct 2026 (owner decision): legacy tax columns dropped at once, no prefill, no legacy handling. Old dev orders were simulations. Code that still uses removed fields breaks `tsc` and is rewritten by the owning work package (07 G-3).
- The app never deletes a store; stores are only disabled/inactive.
- Approved: prepaid sale document at payment settlement, COD at dispatch commit (04 D-16).