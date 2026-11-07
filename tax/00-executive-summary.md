# 00 Executive summary (Stage 5, 2026-10-31): for approval

**Status.** Research (01), code map (02), architecture (03–06), independent review (s4-review, 43 findings, all resolved), roadmap (07) and CA checklist (09) are done. **No application code, schema or migration has been changed.** 08 was dropped by the owner (no automated tests; a manual UI testing guide follows implementation).

**Position.** ShopPulse sells software only. Every storefront payment settles to the seller's own Razorpay account, and ShopPulse never collects, holds or pays out customer money (04 I-1). On that basis we assume no GST TCS and no income-tax TDS duty for ShopPulse. **A CA must confirm this before launch (CA-01..03).**

## What gets built (04, 05, 06)
| Area | Design | Key ids |
|---|---|---|
| Seller tax identity | Regime `UNREGISTERED / REGULAR / COMPOSITION`, separate from legal constitution. Append-only dated registration periods with a transition wizard and date rules. ShopPulse's own billing profile is split off, so a SaaS-invoice toggle can no longer flip store GST (B-04) | D-01..D-05, 03 §9 |
| Tax engine | One pure function on integer paise: inclusive by default, per-line half-up rounding, CGST/SGST/UTGST/IGST, per-piece rate thresholds, shipping and COD fee taxed with the goods (proportional allocation). ₹799 @ 5% → 760.96 + 19.02 + 19.02 exactly | D-06..D-14 |
| Rates and HSN | Effective-dated catalogue loaded from the official schedule. Unverified rules are never used; the seller then sets the rate manually. No grace window: a product that isn't tax-ready can't be bought, and nothing gets archived | D-09, D-27 |
| Checkout | One quote = what the buyer is charged. Every charge and the included GST are shown before payment. Ship-to State comes from the pincode. Unregistered and composition sellers ship within their home State only | D-13, D-43, I-8 |
| Documents | Tax invoice / bill of supply / commercial invoice / credit note, as immutable snapshots. Numbers like `WIW-I26-000143` (≤16 chars), gap-free, unique across stores (B-02). **Prepaid: issued at payment settlement. COD: issued at dispatch, before the courier call** (owner-approved) | D-15..D-19, D-41 |
| Corrections | Each cancellation, RTO, return or exchange creates a correction. Balances are locked per order, so credits can never exceed the original. Refunds link to the correction | D-22, D-23 |
| PDFs and email | Outbox outside the DB transaction. Cloudinary ids are stored exactly as returned and never parsed from URLs, which fixes the `INVOICE_FETCH_FAILED` root cause (B-01) | D-20, D-21, D-46 |
| Shipping | One dispatch gate for every removal path. The Shiprocket payload is built from the issued document. Manual e-way bill record above ₹50,000 blocks pickup until entered. Shiprocket's own invoices are never used | D-26, D-35, D-44 |
| Composition | Full model: eligibility, attestations, Bill of Supply legend, no tax shown, 1 April entry, **automatic lapse at the sale that crosses the cap**, form checklist | D-28, D-29 |
| Compliance aids | GSTR-1-ready CSVs, HSN summary, turnover warnings, reminders, export ZIP; documents kept forever, stores only disabled | D-30, D-32 |

## Roadmap (07): 15 work packages, schema frozen after WP0
WP0 schema (done: DB cleared, legacy dropped) → WP1 foundations → WP2 engine → WP3 identity/settings → WP4 catalogue/products → WP6 checkout API + WP7 storefront (one release) → WP8 document issue → WP9 PDF/email outbox → WP10 corrections → WP11 dispatch/Shiprocket/e-way → WP12 reports/crons → WP13 closing sweep → **WP14 document template (last)**. (WP5 prefill was withdrawn.) Each WP lists its files, DB writes, manual acceptance checks and a don't-touch list. Reference values R1–R11 serve as the hand-checkable numbers.

## Owner decisions needed now
1. **Approve this architecture** (03–06 + 07) so WP0 can start.
<!-- NOTE: yeah i approve the architecture.1 -->
2. **OW-01 (R-023):** closed. Owner cleared the dev DB (31 Oct); no prefill. 
<!-- NOTE: yes, I confirm the dev orders are simulations. -->
3. **OW-05:** commit or shelve the current uncommitted edits. Some of them touch files that WP6/WP8 change.
<!-- NOTE: You dont run the git add or commit command. i will do it myself -->
4. Note **OW-02:** money columns are unbounded `Decimal` today. WP0 first checks for values with more than 2 decimals, which the `Decimal(12,2)` type change would round.
<!-- NOTE: if its industry standard then do it i dont mind. -->

## Main risks
| Risk | Mitigation |
|---|---|
| Platform classification (TCS/TDS) is wrong | CA-01..03 at the top of 09; architecture already avoids any money handling |
| Rate data wrong (official schedule not yet loaded, L-039 U) | Only verified rules are used; CA-19 reviews the import |
| Receipt voucher needed for prepaid orders (CA-24) | Voucher types and series are reserved; adding one needs no schema change |
| Place of supply / B2B bill-to-ship-to (CA-05) | One swappable resolver; B2B mismatch is blocked meanwhile |
| Solo-developer scope (15 WPs) | Strict order, frozen schema, legacy removed per WP, one cutover |

**CA:** 48 questions in 09 (28 marked LAUNCH, 4 of them only if composition is offered at launch), each with what's built, what to read, the risk and the cost of a "no".
