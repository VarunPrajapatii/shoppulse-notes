# ShopPulse Tax System Manual UI E2E Runbook

> **Source audit date:** 1 November 2026, IST.  
> **Authority:** Current Admin and Storefront code, Prisma schema, dummy server, and `notes/tax/_progress.md`; current code wins if an older document disagrees. This is a development acceptance guide, not tax advice.  
> **Purpose:** Follow-along manual verification of WP1–WP11 before extending this guide for WP12–WP14.  
> **Supersedes for tax execution:** older shipping-runbook tax examples and older planning statements where they contradict the current implementation.
>
> **DRAFT — NOT READY FOR EXECUTION OR LAUNCH SIGN-OFF.** This file is an incomplete audit in progress, not the requested complete runbook. Do not treat missing scenarios or unchecked expectations as passed. See the unfinished-work register at the end.
>
> **Chronology to resolve:** `_progress.md` dates the WP4 completion entry 2 November 2026, later than this guide's stated audit date. Treat its implementation statements as source evidence, not proof that the dated event has already occurred.

## 0. Non-negotiable rules

1. Use fresh stores. Create every order through Storefront checkout; never seed orders or edit database records.
2. Prisma Studio is **read-only evidence**. Never change rows, counters, statuses, dates, money, or assets through it.
3. Do not fake the clock or age records. Mark date-dependent cases `NOT TESTABLE` until the stated natural date.
4. Reset the dummy Shiprocket server only at the very start of the entire run, before creating any order or shipment. Do not reset it between stores.
5. Disable every fault injection immediately after use. Never use the dummy's disconnected demo shipments.
6. A toast or a dummy HTTP 200 is not proof: refresh and compare at least two relevant surfaces, including persisted evidence.
7. Record exact amounts to the paisa, identifiers, times, and source screenshots; never write “looks correct”.
8. Use one browser profile for the seller and a separate incognito profile for the customer.
9. No automated tests or test scripts (brief §12, roadmap G-1). This guide never requires writing code.
10. Use Razorpay test credentials, synthetic contacts and disposable stores. Never record secrets or OTPs in evidence.
11. The sample catalogue and these GSTINs are development fixtures, not proof of official classification, registration, or legal compliance.
12. Every test starts with its own named checkout order unless explicitly stated. Do not infer settlement, remittance, or a correction from a status alone.

### Results and severity

| Result | Meaning |
|---|---|
| PASS | All specified exact observations match in the required places. |
| FAIL | The action was possible but an expected value, state, document, or authorization was wrong. |
| BLOCKED | A defect or missing prerequisite prevents the check. |
| NOT TESTABLE | The present UI or legitimate natural precondition cannot produce the case; state the reason and first natural date if applicable. |
| SKIPPED | Deliberately omitted; state reason and owner. |

| Severity | Meaning |
|---|---|
| P0 | Wrong tax amount on an issued document; duplicate or gapped invoice number; cross-store document access; mutation of an issued document; tax code changing money. |
| P1 | Broken core checkout, required issue, correction, download, dispatch or recovery; unsafe missing enforcement. |
| P2 | Important UX/operational defect with a safe documented workaround. |
| P3 | Cosmetic or low-risk copy defect. |

Copy this evidence row for **every** test, including blocked and not-testable cases:

```md
#### Finding: <ID> — <title>
- Result / severity:
- Store / account / plan:
- Order / return / shipment / AWB:
- Inputs, IST date and time:
- Expected exact values and state:
- Observed exact values and state:
- Storefront evidence:
- Admin evidence:
- Prisma Studio evidence (read-only):
- Dummy / Cloudinary / email / Razorpay evidence:
- Reproduction, reason if not testable, next natural date:
- Owner / CA decision:
```

## 1. What must be proven

- One quote and the same customer charge: order total = sum of quoted goods gross + quoted customer-facing charges = checkout quote total = Razorpay amount. Issued document lines reproduce the quote when issue-day regime/rates are unchanged. Where the issue-day rate or regime changes, **gross remains unchanged** while tax may legitimately differ; compare against the issue-day rule, not blindly against the old split.
- Correct regime, identity, state, rate source, GST split and document type; no silent zero-rate or guessed State.
- Correct immutable document snapshots and gap-free sequences, with refunds and corrections bounded by the original balances.
- Prepaid issuance follows successful settlement; COD issuance precedes dispatch booking; delivered COD records collection, not remittance.
- Downloads, fenced outbox retries, corrections, dispatch gates, multi-store isolation, and declared exceptions are observable.
- P0/P1, unresolved launch CA matters, production rate data, or third-party verification gaps prevent an unconditional GO.

## 2. System map and state vocabulary

| Record | Purpose |
|---|---|
| `StoreTaxRegistration` | Dated seller identity; periods are contiguous, end-exclusive. |
| `StoreTaxYearDeclaration` / `StoreTaxSettings` | FY turnover facts / store pricing and invoice policy. |
| `Order`, `OrderItem`, `OrderCharge` | Frozen checkout supplier, classification, quoted tax and customer money. |
| `TaxDocument`, `TaxDocumentLine`, `DocumentSeries`, `DocumentPrefix` | Immutable issued snapshots and allocated numbers. |
| `TaxCorrection`, `TaxCorrectionLine`, `RefundLeg` | Business-event credit, bounded original-line reductions, money-rail legs. |
| `TaxDocumentDelivery` | Email attempt, separate from PDF storage and issuance. |
| `Shipment` | Physical leg, e-way record and COD collection context; not an invoice. |

```text
PREPAID: checkout quote -> order -> settled -> sale set ISSUED -> outbox -> PDF/email
COD:     checkout quote -> order -> dispatch commit -> sale set ISSUED -> booking
         -> delivered -> codCollectedAt (collection only; not remittance)
issued original -> cancellation / return / RTO / exchange -> correction -> credit note
stale identity -> block dispatch -> re-issue correction + new sale set, or cancel
```

## 3. Environment and baseline

These are **owner-run** commands; the author of this draft has not started servers, reset data, or run builds. Obtain the licensed pincode CSV first (3P-04). In PowerShell, use separate terminals:

```powershell
cd D:\study\ShopPulseAdmin
npm run dev

cd D:\study\ShopPulseStore
npm run dev

cd D:\study\ShopPulseAdmin\dummy-server
npm start

cd D:\study\ShopPulseAdmin
npx prisma studio
```

Configure Admin `QUOTE_TOKEN_SECRET` and `CRON_SECRET`; configure the dummy with the same `CRON_SECRET`, `ADMIN_BASE_URL`, `SHOPPULSE_WEBHOOK_URL` and `PORT`. Do not paste secret values into evidence. Storefront must point at the correct Admin and test store. Check PostgreSQL and Redis connectivity, seeded subscription plans, Razorpay **test** mode, email provider, and Cloudinary. Owner says Cloudinary **PDF and ZIP files delivery** is already ON; still verify actual download and 3P-01.

Before any scenario: inspect the dummy at `http://localhost:7000/dashboard`, reset once, record the reset and verify all fault injections OFF. Open its cron page at `http://localhost:7000/cron`. Admin is `http://localhost:3000`; Storefront is `http://localhost:3001`. Capture the eight-error `tsc` baseline only when the owner elects to run it; `_progress.md` records eight at WP11, but does not enumerate all eight. A stale `.next` validator can still reference the deleted storefront-tax route until the next dev/build regeneration. Do not call any error “pre-existing” merely because the count is eight: compare files and diagnostic text.

Reference-data imports are existing application maintenance commands, not test scripts:

```powershell
cd D:\study\ShopPulseAdmin
npx tsx scripts\tax\import-pincodes.ts <licensed-csv-path>
npx tsx scripts\tax\import-catalogue.ts scripts\tax\data\catalogue-dev.json --publish
```

In PowerShell replace `<licensed-csv-path>` with a quoted actual path; do not type the angle brackets. The pincode importer replaces the directory: inspect its output and do not run it against a shared production DB. Catalogue labels are unique; re-running the same sample label fails rather than republishing it. Inspect `TaxCatalogueVersion` read-only and confirm exactly one `PUBLISHED`. The sample marks 37 rules `OFFICIAL_LOAD` and 50 `UNVERIFIED`, but calls itself a **DEV SAMPLE** derived from legacy data; its verification flag is not legal verification. Do not use it as a production rate schedule (CA-19).

## 4. Store and fixture strategy

Four fresh stores cover the regimes without the shipping guide's four-plan matrix. Use an eligible paid plan for scenarios requiring shipping batch, auto-ship, custom COD fee or restocking; record the actual plan. Tax compliance is not plan-gated, while future reports may be (D-36). Shipping plan gates remain separate and are not proven by a tax pass.

| Fixture | Role | Setup |
|---|---|---|
| `S-UNREG` | no registration, home-only | Maharashtra 27; **Not registered** |
| `S-REG` | normal mixed-rate, B2B, shipping, returns | Maharashtra 27; **Regular GST** |
| `S-COMP` | composition and cap lapse | Maharashtra 27; **Composition scheme**, separate GSTIN |
| `S-CHANGE` | transitions, shared-PAN warning, prefix collision | create with same name as another store; reserve separate orders and record the actual auto-healed prefix |

Use the dummy's `Warehouse` pickup, Mumbai `400001`, for Maharashtra sellers after verifying that the imported directory maps it to `27`; Delhi `110001` maps to `07` and Bengaluru `560001` to `29`. Use a real multi-State pincode **from the licensed file**, record both returned State codes; do not invent one. If the source lacks a needed pincode or the dummy courier cannot service it, mark the dependent case BLOCKED rather than changing data.

### GSTIN fixtures

These are synthetic, locally checksum-valid inputs only; they are not live-GSTN-verified. The first 14 characters and checksum were calculated using the repository's Mod-36 algorithm.

| Role | GSTIN | Embedded PAN | State |
|---|---|---|---|
| Maharashtra seller | `27AABCT1234H1ZM` | `AABCT1234H` | 27 |
| Maharashtra composition seller | `27AAAPL1234C1ZE` | `AAAPL1234C` | 27 |
| Delhi buyer / same-PAN other registration | `07AABCT1234H1ZO` | `AABCT1234H` | 07 |
| Delhi buyer | `07AAAPL1234C1ZG` | `AAAPL1234C` | 07 |
| Karnataka buyer | `29AAAPL1234C1ZA` | `AAAPL1234C` | 29 |
| UT fixture, Chandigarh | `04AAAPL1234C1ZM` | `AAAPL1234C` | 04 |

Negative controls: change the Maharashtra GSTIN's last character from `M` to `N` for a bad checksum; use the **valid** Delhi GSTIN against Maharashtra Home State to isolate the State mismatch; compare the Maharashtra GSTIN against declared PAN `AAAPL1234C` for a PAN mismatch. The current registered setup form derives PAN read-only from GSTIN, so an independently editable PAN mismatch is **not testable in that form**. Do not claim a browser pass by pretending to type it there.

### Catalogue blueprint

Use `PCS`, stock sufficient for the named order, a real category and image, and set MRP at least as high as selling price. Set no shipping/COD charges unless a scenario explicitly says otherwise. Products use sample data only; all legal applicability needs CA-17/19/22.

| Code | HSN | Taxability / rate source | Selling-price fixture |
|---|---|---|---|
| `P-TEE` | `6109` | sample `OFFICIAL_LOAD`, threshold 5%/18%; **not official evidence** | ₹799.00; also ₹1,000.00 and threshold variants |
| `P-ADAPTER` | `8504` | sample rule `UNVERIFIED`; choose `MANUAL` 18% and tick confirmation | ₹500.00, ₹1,180.00 and EWB variants |
| `P-MILK` | `0401` | sample rule `UNVERIFIED`; choose exempt classification explicitly | ₹100.00 |
| `P-CABLE` | `8544` | sample rule `UNVERIFIED`; choose `MANUAL` rate and tick confirmation | independent manual-rate case |

For each store: Settings → **Billing & Tax** → **Store GST registration** setup; choose **Business type**, **Home State**, GST status, legal name and **Principal place of business**. For registered regimes enter GSTIN and registration date; select turnover tier and composition attestations as prompted. In **Invoice settings**, record the actual prefix, set proportional allocation under **Advanced**, and keep **GST invoices for business buyers** off except in B2B cases. Create all orders through the customer profile. No onboarding tax step currently exists.

## 5. Golden calculations and how to read them

All amounts below were calculated with an external throwaway Python calculation in integer paise, half-up **per component per line**. They are implementation fixtures, not advice about applicable legal rates. For an inclusive line the displayed amount includes tax; for exclusive lines the input is taxable and the total adds tax. “C/S” means CGST and SGST respectively; “C/U” means CGST and UTGST.

### Reference values R1–R11

| ID | Input | Expected |
|---|---|---|
| R1 | ₹799.00 at 5%, intra-State | taxable ₹760.96; CGST ₹19.02; SGST ₹19.02; total ₹799.00 |
| R2 | ₹799.00 at 5%, inter-State | taxable ₹760.95; IGST ₹38.05; total ₹799.00 |
| R3 | ₹1,180.00 at 18%, intra-State | taxable ₹1,000.00; CGST ₹90.00; SGST ₹90.00; total ₹1,180.00 |
| R4 | threshold rule, ₹2,625.00 | 5%; taxable ₹2,500.00; CGST ₹62.50; SGST ₹62.50 |
| R5 | threshold rule, ₹2,800.00 | `TAX_NOT_SELLABLE`; no sale |
| R6 | threshold rule, ₹2,950.01 | 18%; taxable ₹2,500.01; CGST ₹225.00; SGST ₹225.00 |
| R7 | A ₹1,000.00 at 5%, B ₹500.00 at 18%, shipping ₹50.00 proportional | A goods taxable ₹952.38, C/S ₹23.81 each; B goods taxable ₹423.72, C/S ₹38.14 each; A shipping ₹33.33, taxable ₹31.75, C/S ₹0.79 each; B shipping ₹16.67, taxable ₹14.13, C/S ₹1.27 each; tax ₹128.02; total ₹1,550.00 |
| R8 | R7, highest-rate allocation | all ₹50.00 shipping on B: taxable ₹42.38, CGST ₹3.81, SGST ₹3.81; total ₹1,550.00 |
| R9 | 2 × ₹799.00 at 5%; credit one, then the last | original taxable ₹1,521.90, C/S ₹38.05 each; note 1 taxable ₹760.96, C/S ₹19.02 each; note 2 taxable ₹760.94, C/S ₹19.03 each; notes sum exactly to original |
| R10 | any cart, COMP or UNREG | tax components ₹0.00; respectively BILL_OF_SUPPLY or COMMERCIAL_INVOICE |
| R11 | REG, one taxable + one exempt line | one TAX_INVOICE `MAIN` and one BILL_OF_SUPPLY `BOS`, sharing `saleSetKey` |

### Additional calculated cases

Use the C/S figures for same-State regular sellers. “Exclusive” has no MVP browser setting (D-07): these values are reference-only and must be recorded `NOT TESTABLE` in a UI-only run, not passed by modifying the database.

| Case | Input | Taxable | Components | Total |
|---|---|---:|---|---:|
| N01 | ₹100.00 incl. 5%, intra | ₹95.24 | C/S ₹2.38 / ₹2.38 | ₹100.00 |
| N02 | ₹100.00 incl. 5%, inter | ₹95.24 | IGST ₹4.76 | ₹100.00 |
| N03 | ₹590.00 incl. 18%, intra | ₹500.00 | C/S ₹45.00 / ₹45.00 | ₹590.00 |
| N04 | ₹590.00 incl. 18%, inter | ₹500.00 | IGST ₹90.00 | ₹590.00 |
| N05 | ₹2,000.00 incl. 5%, intra | ₹1,904.76 | C/S ₹47.62 / ₹47.62 | ₹2,000.00 |
| N06 | ₹2,951.00 incl. 18%, intra | ₹2,500.84 | C/S ₹225.08 / ₹225.08 | ₹2,951.00 |
| N07 | ₹999.00 incl. 5%, intra | ₹951.42 | C/S ₹23.79 / ₹23.79 | ₹999.00 |
| N08 | ₹1,001.00 incl. 5%, inter | ₹953.33 | IGST ₹47.67 | ₹1,001.00 |
| N09 | ₹50,000.00 incl. 18%, intra | ₹42,372.88 | C/S ₹3,813.56 / ₹3,813.56 | ₹50,000.00 |
| N10 | ₹50,000.01 incl. 18%, intra | ₹42,372.89 | C/S ₹3,813.56 / ₹3,813.56 | ₹50,000.01 |
| N11 | ₹1,000.00 excl. 5%, intra | ₹1,000.00 | C/S ₹25.00 / ₹25.00 | ₹1,050.00 |
| N12 | ₹1,000.00 excl. 18%, inter | ₹1,000.00 | IGST ₹180.00 | ₹1,180.00 |
| N13 | ₹2,500.00 excl. 5%, intra | ₹2,500.00 | C/S ₹62.50 / ₹62.50 | ₹2,625.00 |
| N14 | ₹2,500.01 excl. 18%, intra | ₹2,500.01 | C/S ₹225.00 / ₹225.00 | ₹2,950.01 |
| N15 | ₹799.00 incl. 5%, same UT without legislature | ₹760.96 | C/U ₹19.02 / ₹19.02 | ₹799.00 |
| N16 | R7 plus COD fee ₹30.00 proportional | COD A ₹19.04, B ₹8.48 | COD A C/S ₹0.48 / ₹0.48; B ₹0.76 / ₹0.76 | cart ₹1,580.00; total tax ₹130.50 |
| N17 | ₹799.00 return less ₹50.00 retained restocking, no other deductions | ₹713.34 | C/S ₹17.83 / ₹17.83 | note/refunded gross ₹749.00 |
| N18 | exempt ₹100.00 | ₹100.00 | all components ₹0.00 | ₹100.00 |

For N16, the ₹30.00 COD allocation is ₹20.00 to A and ₹10.00 to B. The charge gross, not the seller's courier cost, is used. For N17, configure the return so the actual retained fee is exactly ₹50.00 and no reverse or shipping deduction applies; otherwise do not compare to this row. Treatment of charges and retained fees requires CA-14/15/31; UT classification requires CA-06; EWB basis/limit requires CA-42.

## 6. Pre-flight and identity scenarios

### PRE-001 — reference data and readiness

1. Run the existing imports in §3 against a disposable development database. Note CSV source filename, row and multi-State counts.
2. In read-only Prisma Studio open `Pincode`: find `110001`, `560001`, `400001` and a multi-State example recorded from the source. Inspect `stateCodes`.
3. Open `TaxCatalogueVersion` and record its status and label; only one may be `PUBLISHED`.
4. Open dummy cron dashboard and check for `tax-document-reconcile` and `tax-document-outbox`; compare `vercel.json`. Confirm Razorpay test mode and email provider without exposing credentials.

| Expected values | |
|---|---|
| Delhi / Karnataka / Maharashtra | `07` / `29` / `27` respectively; a real multi-State pincode returns all listed codes. |
| Catalogue / jobs | one PUBLISHED version; both named jobs listed. |

**Why:** quote geography, catalog rates and recovery require real reference data. **Evidence:** copy the §0 row.

### REG-001 — missing identity and first setup

1. Create a fresh store through normal onboarding, but do not enter tax details yet. Try checkout from its Storefront with an otherwise valid cart and address.
2. Record the displayed error and browser Network response. Then seller opens Settings → **Billing & Tax** → **Store GST registration**, chooses **Not registered**, enters **Individual / Proprietor**, Maharashtra, legal name, address with `400001`, and saves.
3. Refresh the card; in Prisma Studio read `StoreTaxRegistration`, `DocumentPrefix`, `StoreTaxSettings` and `StoreTaxYearDeclaration`.

| Expected values | |
|---|---|
| Before setup | `TAX_IDENTITY_MISSING`, HTTP 409, “Set up your GST status in Settings → Billing & Tax first.” |
| After setup | one unregistered period starting on the store creation IST date, one derived prefix, settings and current-FY declaration. |

**Why:** onboarding deliberately does not create tax identity. **Evidence:** copy §0 row; capture Network and read-only rows.

### REG-002 — GSTIN and prefix

1. On fresh `S-REG`, open the same setup form. Choose **Regular GST**, Maharashtra, the Maharashtra GSTIN from §4, today as registration date and a matching address. Record derived PAN and save.
2. On another fresh store with the same name repeat setup. Compare **Invoice prefix**; the two prefixes must differ.
3. Before any invoice, open **Invoice settings** and enter `SP`, then the other store's prefix; wait for live feedback. Restore the original valid prefix.
4. After the first document issues, revisit **Invoice prefix** and attempt editing.
5. On another disposable setup, try the bad-checksum GSTIN and the valid Delhi GSTIN against Maharashtra. Confirm each is refused; compare the exact displayed validation message and Network response. The form's derived PAN field is read-only, so separate PAN mismatch is `NOT TESTABLE` there.

| Expected values | |
|---|---|
| Valid fixture | GSTIN `27AABCT1234H1ZM`; PAN `AABCT1234H`; State `27`. |
| Prefix | unique per store; reserved/taken values refused; editing is locked after this FY's first document. |

**Why:** protects tenant numbering and avoids malformed identities. **Evidence:** copy §0 row.

### REG-003 — transitions and natural dates

Use a dedicated `S-CHANGE`. Open **Change GST status**; the visible choices include **I got a GST registration**, **Move to the composition scheme**, **Leave the composition scheme**, **My GST registration is cancelled**, **I have a new GSTIN**, and **My PAN, business type or State changed**, according to current regime. Complete the wizard's OTP with a real test channel. A scheduled row may be removed with **Delete scheduled change**; verify history in UI and `StoreTaxRegistration` in Studio.

| Date rule on 1 Nov 2026 | Boundary / result |
|---|---|
| Any future transition | 30 Jan 2027 is 90 days ahead; 31 Jan is 91 and must be refused. |
| REG → COMP | 1 Apr 2027 is more than 90 days ahead: scheduling that date is `NOT TESTABLE` until **1 Jan 2027**, when it first enters the 90-day window. Non-1-April dates should be refused today. |
| COMP → REG voluntary | 25 Oct is 7 days back, 24 Oct is 8; a fresh 1 Nov period cannot validly be shortened before it starts. Boundary acceptance becomes naturally testable on **8 Nov 2026** using a suitable unreferenced period created on 1 Nov. |
| Cancellation | 2 Oct is 30 days back, 1 Oct is 31; an initial period created 1 Nov cannot be shortened before its start. Full allowed boundary becomes naturally testable **1 Dec 2026**, subject to references. |
| UNREG → REG past date | Past accepted only if it does not precede the current period and does not improperly replace a referenced same-day period. A 1 Nov fresh store first has a past in-period date on **2 Nov 2026**, subject to the reference guard. |
| One future change | Schedule an allowed date, attempt another; then delete the first and confirm a new one can be scheduled. |

**Expected values:** only one scheduled change; no overlap or gap between successive `[effectiveFrom, effectiveTo)` periods; OTP required for core changes. `NEW_GSTIN` results in REGULAR and a new prefix when the old prefix was bound to a different GSTIN; same-GSTIN regime changes keep it. Same-PAN composition attestation must never name the other store. **Why:** preserves issued identity and avoids fabricated date evidence. **Evidence:** copy §0 row.

### REG-004 — SaaS billing and declaration isolation

1. Record the storefront registration and current prefix. In **ShopPulse billing details**, toggle the subscription GST-invoice preference, save, refresh, then clear it. Repeat in subscription preflight if available.
2. In the FY declaration, save `aatoEverAbove5Cr=true`; inspect **GST invoices for business buyers** in invoice settings. Restore the test baseline afterward.

| Expected values | |
|---|---|
| SaaS toggle | `SaasBillingProfile` may change; `StoreTaxRegistration` must not. |
| B2B | toggle is disabled while `aatoEverAbove5Cr` is true. |

**Why:** SaaS billing identity is not the seller's supply registration (B-04/B-05). **Evidence:** copy §0 row.

## 7. Catalogue and quote scenarios

### CAT-001 — search, verification and preview

1. In `S-REG`, open Products → create a product, scroll to **Tax (GST)** and enter `t-shirt` in **Find HSN**. Select `6109`, **Unit** `PCS`, and the catalogue rate. Set selling price and MRP to ₹799.00 and save.
2. Verify the catalogue rate is read-only. For `8504`, note **Rate not verified**, select a manual 18% rate and tick **I confirm this rate is correct for this product.** Attempt to save without that tick first.
3. In the first product's preview compare the input price and GST to R1; then verify the taxable amount and individual components in the order quote or read-only records, not the preview.
4. With separate `6109` products, enter ₹2,625.00, ₹2,800.00 and ₹2,950.01. Record the preview and save result for each.

| Expected values | |
|---|---|
| ₹799.00 | ₹38.04 GST inside; taxable ₹760.96; CGST/SGST ₹19.02 each. |
| Threshold prices | R4 accepted; R5 rejected; R6 accepted. |

The current preview prints price, GST inside and rate; it does **not** print taxable value, unlike roadmap WP4 acceptance 3. Product validation can respond 422 while the generic `TAX_NOT_SELLABLE` mapping in 06 lists 409; record the actual surface/status instead of forcing the older design. **Why:** verifies both rule source and the dead zone without presenting the sample as law. **Evidence:** copy §0 row.

### CAT-002 — readiness and bulk/archive

1. In a regular store inspect a product without an HSN. Record the **Tax (GST)** readiness chip; use the existing product tax bulk-fix page and choose three disposable products.
2. Apply the same valid HSN and rate settings to the selected products; refresh all three. Archive and restore a disposable product through the product UI.
3. In read-only Studio inspect `ArchivedProduct.taxSnapshot` while archived, and the restored Product's classification after restore. Verify no tax grace countdown or automatic tax-related archive occurs.

| Expected values | |
|---|---|
| Missing HSN | readiness reports the missing HSN; it is not automatically archived. |
| Bulk / restore | three selected products updated; archived snapshot and restored classification agree. |

**Why:** readiness blocks unsafe sales without destroying product history. The full readiness banner and non-product checks are WP12, not built. **Evidence:** copy §0 row.

### CHK-001 — R1, R2 and display

1. In `S-REG`, set `P-TEE` price and MRP to ₹799.00; set customer shipping to free and COD fee to zero for this check.
2. Customer opens the PDP, adds one unit, enters Maharashtra `400001`, proceeds to checkout and chooses prepaid. Capture PDP, cart, checkout breakdown and quoted total before paying. Complete Razorpay test payment.
3. Refresh Admin order and its **Billing** tab. In read-only Studio compare `Order`, `OrderItem`, `Payment` and `TaxDocumentLine`.
4. Repeat on a separate order to Delhi `110001` with otherwise identical settings.

| Expected values | |
|---|---|
| Maharashtra | R1: total ₹799.00, taxable ₹760.96, CGST ₹19.02, SGST ₹19.02. |
| Delhi | R2: total ₹799.00, taxable ₹760.95, IGST ₹38.05. |
| Both | PDP **Inclusive of all taxes**; cart **Includes GST**; checkout total = order total = Razorpay amount ₹799.00. |

**Why:** tests per-component rounding and State determination. **Evidence:** copy §0 row.

### CHK-002 — mixed-rate shipping and COD

1. In `S-REG`, configure fixed customer shipping ₹50.00 and proportional fee allocation in **Invoice settings** → **Advanced**. Disable any free-shipping threshold that would override it.
2. Customer buys `P-TEE` ₹1,000.00 and `P-ADAPTER` ₹500.00, Maharashtra address, prepaid. Compare checkout, order charge allocations, issued lines and Razorpay.
3. In **Advanced** switch to the highest-rate option and make a separate identical order; restore proportional afterward.
4. If the store's plan permits a custom COD charge, set it to ₹30.00 and place a third identical order as COD.

| Expected values | |
|---|---|
| Proportional prepaid | R7, ₹1,550.00 total; ₹128.02 total GST. |
| Highest-rate prepaid | R8; ₹1,550.00 total; ₹131.52 total GST. |
| Proportional COD | N16; ₹1,580.00 total; ₹130.50 GST; COD allocation ₹20.00 / ₹10.00. |

**Why:** customer fees follow the frozen allocation policy; plan-gated shipping features are separate from tax. **Evidence:** copy §0 row.

### CHK-003 — regimes, split set and B2B

1. Place an in-State order of ₹799.00 without fees from `S-UNREG`, then one from `S-COMP`. Compare PDP/cart labels, checkout total, order snapshot and document once issued.
2. On `S-REG` place a prepaid order containing taxable `P-TEE` ₹799.00 and exempt `P-MILK` ₹100.00. Download both documents after the outbox runs.
3. Enable **GST invoices for business buyers** on `S-REG`. Make one Maharashtra B2B order using the Maharashtra GSTIN and a separate Delhi order using the valid Delhi GSTIN. Then try the valid Karnataka GSTIN with a Delhi ship-to.

| Expected values | |
|---|---|
| UNREG / COMP | each total ₹799.00, all GST components ₹0.00; commercial invoice / Bill of Supply respectively. |
| Mixed | total ₹899.00; MAIN tax invoice ₹799.00 and BOS bill of supply ₹100.00; same `saleSetKey`; R1 tax split only on taxable member. |
| B2B | same-State CGST/SGST and inter-State IGST as R1/R2; buyer GSTIN State must match ship-to State. |

**Why:** document type follows regime and taxability; GSTIN State matching is an MVP policy pending CA-05. **Evidence:** copy §0 row.

### CHK-004 — stale quote and concurrency

1. With customer checkout open for `P-TEE` at ₹799.00, keep the seller profile open. Change its selling price to ₹999.00 and save before the customer pays.
2. Resume checkout. Record the Network response and the fresh total, and capture the message. Do not approve the payment until the new total is visible.
3. For a separate single-stock product, open two independent customer sessions and place the last unit concurrently; record both results. For another cart, double-submit as closely as the UI permits.

| Expected values | |
|---|---|
| Changed quote | `QUOTE_CHANGED` 409; “Prices were updated. Please review your total.” New total ₹999.00 with no fees. |
| Stock / submit | at most one successful order for the last unit; never negative stock; a duplicate submission creates at most one order/payment/stock decrement. |

**Why:** protects displayed-versus-paid money and stock. **Evidence:** copy §0 row.

## 8. Issue, storage and correction scenarios

### DOC-001 — settlement and numbering

1. Complete `O-PREPAID-REG` as in CHK-001. Open Admin order → **Billing** → **Documents**; record status and number. Run dummy cron `tax-document-outbox` and download the PDF.
2. Repeat a first prepaid checkout on a second registered store. Compare prefixes and document numbers.
3. Place `O-COD-REG` without dispatch; confirm no sale document. Use the supported ship flow: record the first document and the matching dummy provider booking; later drive the dummy to delivered and inspect `codCollectedAt`.
4. On another undispatched COD order use **Issue invoice now** and refresh.

| Expected values | |
|---|---|
| Prepaid | `ISSUED` after settlement; one sale set per source. Example pattern `{PREFIX}-I26-000001` for a first tax-invoice series, maximum 16 characters. |
| Two stores | both issue, distinct numbers and prefixes. |
| COD | no document before issue/dispatch; issue before courier booking; delivery records collection and does not issue another sale set. |

**Why:** proves settlement timing and tenant-independent sequences. **Evidence:** copy §0 row including document and dummy log.

### DOC-002 — PDF storage, download and resend

1. Open the issued order's **Documents** card; record the PDF state. Run `tax-document-outbox` from the dummy cron dashboard, refresh, then download the seller PDF.
2. Open the customer order hub in incognito, complete its supported OTP or open the received scoped link, and download the same document. Save both samples.
3. In read-only Studio inspect the issued `TaxDocument` and `TaxDocumentDelivery`. Record `pdfPublicId`, `pdfVersion`, `pdfResourceType`, `pdfDeliveryType`, `pdfBytes` and `pdfSha256`; never paste private tokens.
4. For a disposable asset only, delete the exact corresponding raw asset in the Cloudinary console. Download again, inspect status, run outbox and refresh. Resend using the existing Documents card action; inspect delivery rows and email log.

| Expected values | |
|---|---|
| Initial | `STORED`; public ID ends `.pdf`; resource type `raw`; delivery type `authenticated`; persisted version, byte count and SHA-256. |
| Missing asset | download still streams a PDF, status requeues; next outbox run stores it again without changing document financial fields or number. |
| Delivery | resend creates a new delivery row; missing email integration is recorded `SKIPPED_NO_PROVIDER`, not silently successful. |

**Why:** tests the B-01 regression and separates durable financial data from its regenerable artifact. **Evidence:** copy §0 row and keep both PDFs. The unverified 3P-01 Cloudinary behavior remains an owner check.

### COR-001 — cancel and bounded return

1. Complete an undispatched paid prepaid order; cancel it through the supported customer or seller action. Refresh **Documents**, inspect correction and linked refund leg in read-only Studio.
2. On a separate COD order cancel before any issue or dispatch.
3. Buy two `P-TEE` units at ₹799.00 each with zero shipping/COD charges; deliver through the dummy as described in the shipping master runbook. Submit and complete a one-unit return, then a second one-unit return, following the shipping runbook's customer return, reverse pickup and inspection steps.
4. Record original line, each correction line, credit-note number and refund leg; inspect the original PDF again.

| Expected values | |
|---|---|
| Prepaid cancel | one full-value `-C26-` note, refund leg linked to its correction. |
| Undispatched COD cancel | no sale document and no credit document. |
| Two returns | R9 exactly: first note ₹799.00, taxable ₹760.96, C/S ₹19.02 each; second ₹799.00, taxable ₹760.94, C/S ₹19.03 each. |

If existing return inspection controls cannot legitimately create a required outcome, record `NOT TESTABLE` or `BLOCKED`; never edit rows to force it. **Why:** tax corrections must neither exceed balances nor change the original. **Evidence:** copy §0 row.

### DIS-001 — E-way boundaries and pickup

1. For a regular Maharashtra store create two prepaid `8504` manual-18% orders, no shipping or COD fee, with selling prices ₹50,000.00 and ₹50,000.01 respectively. Use distinct products/orders and check MRP and courier limits before payment.
2. Ship each using the supported Shiprocket flow and inspect the shipment's **E-way bill** card. Attempt pickup scheduling.
3. For the ₹50,000.01 shipment, enter a disposable 12-digit number in **E-way bill number**, today's **Generated on**, and a **Valid until** date covering the planned pickup, then **Save e-way bill**. This dummy value must never be treated as a government-issued e-way bill.
4. Retry scheduling, compare Admin, dummy and read-only Shipment state. Repeat through batch/scheduler/retry only where the current plan and visible controls allow.

| Expected values | |
|---|---|
| ₹50,000.00 | N09; no EWB required when the applicable state limit is ₹50,000.00. |
| ₹50,000.01 | N10; pickup blocked until a valid covering record exists; then it may proceed. |

**Why:** checks strict greater-than boundary and no removal without a covering record. State-specific limits, legal applicability and real Shiprocket semantics remain CA-42/3P-02. **Evidence:** copy §0 row.

## 9. Error-copy inventory — incomplete execution instructions

The following is a **code-copy inventory**, not proof that every row has a safe browser trigger. For each row, copy the §0 evidence template, record the Network response and visible customer/seller message, and compare the two. Where the route or trigger has not yet been audited, record `BLOCKED — instructions not yet authored`; do not manufacture a request or database state. Expected typed body shape is `{ code, message, details }`; endpoint-specific wrappers and validation responses still need verification.

| ID | Code / nominal status | Message in current tax error factory | Required precondition / draft status |
|---|---|---|---|
| ERR-001 | `TAX_NOT_READY` / 409 | “Some items are temporarily unavailable.” | regular checkout with a not-ready product; browser trigger still needs verification |
| ERR-002 | `SHIP_TO_STATE_NOT_ALLOWED` / 422 | “This seller delivers only within {State}.” | UNREG/COMP to another State |
| ERR-003 | `PINCODE_STATE_MISMATCH` / 422 | “Please check your pincode and State.” | conflicting State and pincode; UI prevents the normal selection, so browser-trigger instructions remain unaudited |
| ERR-004 | `PLACE_OF_SUPPLY_UNRESOLVED` / 422 | “Please check your pincode and State.” | unknown pincode; courier serviceability may block earlier |
| ERR-005 | `B2B_STATE_MISMATCH` / 422 | “GST invoice is available only when delivering to the GSTIN's State. Continue without GST invoice?” | valid buyer GSTIN with a different ship-to State |
| ERR-006 | `B2B_NOT_AVAILABLE` / 422 | “GST invoice not available for this store.” | B2B disabled or AATO gate; normal UI hides/disables it |
| ERR-007 | `QUOTE_CHANGED` / 409 | “Prices were updated. Please review your total.” | CHK-004 |
| ERR-008 | `PICKUP_STATE_MISMATCH` / 422 | “Pickup address State must match your GST registration State.” | choose a valid synced pickup in another State |
| ERR-009 | `EWAY_BILL_REQUIRED` / 409 | “Enter the e-way bill number for orders above ₹50,000.” | DIS-001; actual message can be more specific for other limits or expiry |
| ERR-010 | `TRANSITION_NOT_ALLOWED` / 409 | “This registration change is not allowed yet.”; reasons in details | REG-003; form can block before API |
| ERR-011 | `PREFIX_LOCKED` / 409 | message is context-specific | REG-002; disabled input may prevent a browser request |
| ERR-012 | `PREFIX_TAKEN` / 409 | “This prefix is already in use.” | REG-002; live check can prevent saving |
| ERR-013 | `PREFIX_UNAVAILABLE` / 409 | “This invoice prefix cannot be used.” is the factory default; callers can override it | exhaustion requires unavailable prefix candidates; no audited ordinary UI precondition |
| ERR-014 | `TAX_NOT_SELLABLE` / 409 generic | “This price is not allowed for this item.” | CAT-001; product endpoint can use 422 and more specific guidance |
| ERR-015 | `STALE_REGISTRATION_AT_DISPATCH` / 409 | “Your GST registration changed after this invoice. Re-issue or cancel the order.” | issued set then legitimate registration change; detailed flow not yet authored |
| ERR-016 | `CREDIT_EXCEEDS_BALANCE` / 409 | “Credit exceeds the remaining balance.” | no ordinary manual-over-credit UI control identified; do not edit DB |
| ERR-017 | `BOOKING_IN_PROGRESS` / 409 | “Shipment is being booked. Try again in a minute.” | requires a real active booking claim; no deterministic browser-only pause identified |
| ERR-018 | `QUOTE_TOKEN_REQUIRED` / 400 | “Review your order total before paying.” | normal storefront supplies the token; no audited browser-only omission procedure |
| ERR-019 | `TAX_IDENTITY_MISSING` / 409 | “Set up your GST status in Settings → Billing & Tax first.” | REG-001 |

These are not all identical to the older design copy in 06 §7. Preserve the observed exact message and endpoint status rather than substituting a nicer planned string.

## 10. Job and recovery matrix

For each job, prepare its real eligible input, capture the first execution response, inspect affected rows and external effects, run it again immediately, and capture the second response. No duplicate documents, messages or money changes may result. An outbox delivery is architecturally **at least once**; concurrent claims should prevent duplicate work, but a crash after a provider accepts an email and before completion is recorded can still produce a duplicate. Do not equate that documented caveat with a guaranteed exactly-once email service.

| ID | Job | Prepare / first run | Second run / gap |
|---|---|---|---|
| JOB-001 | `tax-document-outbox` | fresh issued PDF/delivery pending; run via dummy cron and verify stored artifact and delivery | no new document, delivery or send for the same completed work; two truly simultaneous manual invocations need an audited browser procedure |
| JOB-002 | `tax-document-reconcile` | genuinely paid, not-removed prepaid PENDING/FAILED order | issues eligible sale set once; **FAILED preparation is not yet demonstrated through a legitimate UI-only fault**, so record that branch `NOT TESTABLE` until a reproducible supported fault is found |
| JOB-003 | `pickup-scheduler` | due eligible pickup; include DIS-001 e-way block | no duplicate provider booking or scheduling; future slot must be awaited naturally |

`tax-threshold-monitor` and `tax-registration-reminders` are WP12, **not built**. Effective registration dates are resolved by date, not by a transition cron. `enforce-gst-grace` is removed; do not run it.

## 11. Known limitations and decision register

These are expected current limitations, **not automatic passes**. Each affected feature still requires a launch-scope decision. “Needs CA” references the questions in 09; a dash does not waive other launch CA checks.

| Limitation from `_progress.md` | Expected current behavior / owner action | Needs CA |
|---|---|---|
| Exchange cancelled after replacement invoice issued | no credit for replacement set; do not promise fully corrected documents | CA-32 |
| Webhook-driven cancel credit/refund failure | failure only logged; order remains uncancelled; seller can retry cancel | CA-31 |
| Customer-cancel preview | does not show `BOOKING_IN_PROGRESS`; final action can reject | — |
| `process-refund` changed passed quantity | retains first correction; do not assume it follows later quantity | CA-31 |
| Chained return of replacement | credit skipped with warning | CA-32 |
| PDF v1 logo | logo not copied to immutable asset; v1 prints footer text only | CA-27 |
| Credit-note warning clock | the order Documents card compares `new Date().toISOString()` (UTC) with 1 October; at the IST midnight boundary this is not the fixed-IST date promised by I-5. Record as a suspected timing defect and verify at the next natural boundary. | CA-34 |
| Shiprocket payload | dummy logs fields; `3P-02` sandbox semantics unverified, including tax-on-top and COD collectable | CA-03; 3P-02/03 |
| B-22 / B-27 | variable-shipping weight and remittance/insurance outside tax scope; collection is not remittance | CA-03 |
| Onboarding tax step | not built; use Billing & Tax setup | — |
| Dev sample rates | 37 sample rules carry `OFFICIAL_LOAD` despite being explicitly non-production; 50 unverified | CA-17/19 |

## 12. NOT TESTABLE / no browser control

| Item | Why / when |
|---|---|
| Exclusive-pricing engine cases N11–N14 | no exclusive-price control in MVP; do not edit `pricesIncludeTax` in the DB. |
| Valid REG → COMP 1 Apr 2027 on 1 Nov 2026 | beyond 90 days; first schedule window opens 1 Jan 2027. |
| Backdating before a fresh store's current period starts | period-history invariant; dates and earliest natural opportunities in REG-003. |
| FY boundary at 31 Mar / 1 Apr | no clock control; first natural boundary 1 Apr 2027 00:00 IST. |
| 1 Oct credit-note warning for a FY 2025-26 original | the calendar window is active now, but a fresh store made 1 Nov 2026 cannot have that original. A FY 2026-27 original normally reaches the window on 1 Oct 2027. The current UI comparison is UTC, so check the IST midnight edge separately. |
| Forced `FAILED` prepaid issue for reconcile | no legitimate UI-only fault precondition established in this draft; do not edit a row or invent an injection. |
| Prefix allocator exhaustion / manual over-credit | no ordinary browser control established; see ERR-013/016. |
| Independent registered-setup PAN mismatch | registered PAN is derived/read-only. |
| `mark-dropoff` after booking | shipping master runbook identifies an API without an Admin control; recheck current UI before claiming a pass. |
| Replays and two genuinely simultaneous outbox calls | browser-only reproducible steps have not yet been established in this draft. |
| WP12 report/monitor/reminder/export, WP13 final sweep, WP14 template v2 | not yet built; future acceptance below. |

## 13. Future work packages

### WP12 — NOT YET BUILT: fill after WP12

Acceptance copied from 07:

1. For an FY with mixed activity: B2B rows only for B2B documents; B2C summary grouped by POS and rate; credit/debit notes with original number and `declarationDeadline`; HSN summary split B2B/B2C at the document's digits; document summary per series. Each export's totals equal Σ of the documents.
2. Composition quarter export: turnover and the estimate at the entered composition rate.
3. Declared other turnover at 76% of the threshold: one warning; a rerun the same day sends nothing; at 91%: a second warning.
4. A transition scheduled 7 days ahead: one T-7 reminder. (The 1 April declaration reminder is checked by code review; first live run 1 Apr 2027.)
5. Readiness banner lists each problem type with a link to fix it.
6. Export ZIP contains every document PDF and the CSVs for the FY.

### WP13 — NOT YET BUILT: fill after WP13

1. `git grep` for the removed names returns nothing outside `prisma/migrations/**` and `notes/**`.
2. `tsc` has zero errors; lint and build pass.
3. One prepaid and one COD order complete: documents issue, PDFs store, a return creates a credit note.

The roadmap says onboarding in the WP13 step, but the currently built onboarding lacks the tax step; until changed, identity setup is in Billing & Tax.

### WP14 — NOT YET BUILT: fill after WP14

1. Each type shows every 03 §7 field; title and legend per 03 §5; HSN printed at the document's digits; POS State name + code.
2. Long product names wrap; a 40-line order paginates with totals on the last page; ₹ renders.
3. Re-downloading an old v1 document still gives the v1 layout.

## 14. Traceability — draft coverage, not execution results

Each numbered row maps one acceptance item from 07. `PARTLY` means only some instructions or evidence have been authored; it is **not** a passed test. `NOT TESTABLE` means the identified part has no legitimate UI-only precondition under the stated constraints. No item below is marked covered until its complete follow-along scenario has been written and audited.

| WP / item | Acceptance item | Draft test ID(s) | Status and remaining work |
|---|---|---|---|
| WP1.1 | Pincode import, two lookups, multi-State | PRE-001 | PARTLY: choose licensed source and real multi-State fixture. |
| WP1.2 | Checksum, State and PAN validation | REG-002 | PARTLY: PAN mismatch has no independently editable registered-setup field. |
| WP1.3 | IST FY boundary and no local-month arithmetic | §12 | NOT TESTABLE at boundary until 1 Apr 2027; static code review not authored. |
| WP1.4 | No new `tsc` errors in owned files | §3 | PARTLY: baseline comparison procedure must enumerate actual diagnostics. |
| WP2.1 | Integer/rounding/allocation and typed error review | §5, §9 | PARTLY: full code-review checklist and error triggers absent. |
| WP2.2 | Pure engine has no forbidden imports | — | PARTLY: source review checklist absent. |
| WP2.3 | R1–R11 through UI | CAT-001, CHK-001/002/003, COR-001 | PARTLY: several values have no independently verified UI reproduction. |
| WP3.1 | First UNREG, prefix collision/reservation | REG-001/002 | PARTLY: first setup and both collision combinations require fully specified navigation. |
| WP3.2 | GSTIN State/PAN mismatch | REG-002 | PARTLY: independent PAN mismatch not testable in setup form. |
| WP3.3 | SaaS billing split | REG-004 | PARTLY: exact subscription preflight clicks not audited. |
| WP3.4 | Transition date rules and history | REG-003 | PARTLY: fresh-period constraints and natural future dates apply. |
| WP3.5 | Scheduled delete and OTP | REG-003 | PARTLY: provider-specific OTP steps not audited. |
| WP3.6 | Same-PAN composition attestation privacy | REG-003 | PARTLY: complete two-store walkthrough not authored. |
| WP3.7 | New GSTIN gets new prefix, same GSTIN keeps it | REG-003 | PARTLY: exact issue-before-change prerequisites need authored scenario. |
| WP3.8 | FY declaration and B2B disable | REG-004 | PARTLY: complete field-level setup and restore instructions needed. |
| WP4.1 | Draft/publish and unverified rule | PRE-001, CAT-001 | PARTLY: separate DRAFT then publish workflow not authored. |
| WP4.2 | Search, read-only verified rate, manual confirmation | CAT-001 | PARTLY: exact form options and persistence need full walk-through. |
| WP4.3 | R1 and three threshold previews | CAT-001 | PARTLY: taxable value is absent from current preview. |
| WP4.4 | Missing HSN readiness, no archive | CAT-002 | PARTLY: exact route evidence not authored. |
| WP4.5 | Bulk fix three, archive/restore snapshot | CAT-002 | PARTLY: exact bulk controls not audited. |
| WP4.6 | Removed grace cron/banner/route/import | CAT-002, JOB-003 | PARTLY: full removed-name verification not authored. |
| WP6.1 | R1/R2 and R7/R8 quotes | CHK-001/002 | PARTLY: field-by-field checkout screenshots still required. |
| WP6.2 | UNREG/COMP cross-State rejection | ERR-002 | PARTLY: exact pincode and quote actions not fully authored. |
| WP6.3 | Not-ready checkout error | ERR-001 | PARTLY: product save path may prevent setup. |
| WP6.4 | B2B mismatch and disabled | CHK-003, ERR-005/006 | PARTLY: hidden-toggle server path lacks verified browser procedure. |
| WP6.5 | Price change re-quote | CHK-004 | PARTLY: request timing must be checked in browser. |
| WP6.6 | Complete order/charge snapshot and money equality | CHK-001/002 | PARTLY: all listed snapshot fields and both charges need full ledger instructions. |
| WP6.7 | Estimated GST admin label | CHK-001 | PARTLY: current order may issue immediately and show invoiced label. |
| WP7.1 | REG and other-regime PDP labels | CHK-001/003 | PARTLY: all MRP variants need explicit steps. |
| WP7.2 | Cart GST labels by regime | CHK-001/003 | PARTLY: exact capture for each regime remains. |
| WP7.3 | Checkout charges, GST breakdown and Razorpay equality | CHK-001/002 | PARTLY: all payment modes and B2B splits not fully enumerated. |
| WP7.4 | Pincode State and home-only message | CHK-001, ERR-002 | PARTLY: conflicting dropdown/multi-State behavior not fully authored. |
| WP7.5 | Price changed copy and total | CHK-004 | PARTLY: token-refresh race needs browser confirmation. |
| WP8.1 | Prepaid sale set and quoted lines | DOC-001 | PARTLY: detailed R7 line/document comparison missing. |
| WP8.2 | Verify-only issuance | — | PARTLY: safe webhook-disable and restore steps not audited. |
| WP8.3 | First invoices of two stores | DOC-001 | PARTLY: separate fixture payment steps need completion. |
| WP8.4 | Mixed, COMP and UNREG document types | CHK-003 | PARTLY: exact PDF legends and number evidence not fully enumerated. |
| WP8.5 | Webhook plus verify replay idempotency | §12 | NOT TESTABLE until safe browser-only replay steps are established. |
| WP8.6 | Reconcile eligible paid PENDING order | JOB-002 | NOT TESTABLE without a legitimate eligible pending-order preparation. |
| WP8.7 | COD Issue invoice now | DOC-001 | PARTLY: verify trigger and button removal in Studio. |
| WP8.8 | Composition cap breach | — | PARTLY: exact turnover fixture and forced-lapse walkthrough absent. |
| WP8.9 | COD delivered collection only | DOC-001 | PARTLY: inspect collection timestamp and verify no new document. |
| WP9.1 | Persisted PDF fields | DOC-002 | PARTLY: format and full field comparison not yet enumerated. |
| WP9.2 | Admin and token download | DOC-002 | PARTLY: customer token path and scoping need exact steps. |
| WP9.3 | Delete Cloudinary asset, render/requeue/re-store | DOC-002 | PARTLY: exact console selection and before/after evidence need verification. |
| WP9.4 | No provider and resend row | DOC-002 | PARTLY: safe provider disable/restore procedure absent. |
| WP9.5 | Concurrent outbox claim once | JOB-001 | NOT TESTABLE until simultaneous browser procedure is verified. |
| WP9.6 | Every 03 §7 field on each v1 PDF | DOC-002 | PARTLY: per-type field checklist missing. |
| WP9.7 | SaaS numbering, old resend, storage | — | PARTLY: new/old subscription-payment walkthrough missing. |
| WP10.1 | Prepaid cancel and active booking block | COR-001, ERR-017 | PARTLY: active-claim precondition is not deterministic via UI. |
| WP10.2 | COD cancellation without document | COR-001 | PARTLY: exact cancel steps and evidence not audited. |
| WP10.3 | R9 partial then remainder | COR-001 | PARTLY: second return/inspection controls need verification. |
| WP10.4 | ₹50 restocking excluded | N17 | PARTLY: exact plan, fee configuration and refund path not authored. |
| WP10.5 | Inspection idempotency and over-credit | ERR-016 | NOT TESTABLE for over-credit without a supported UI operation; replay procedure unaudited. |
| WP10.6 | Split-set return yields two notes | — | PARTLY: multi-item return and per-member mapping absent. |
| WP10.7 | COD fee refund uses `codCharge` | — | PARTLY: policy setup and exact refund example absent. |
| WP10.8 | RTO remaining balance correction | — | PARTLY: dummy RTO walkthrough absent. |
| WP10.9 | Exchange snapshot, note and EXCH sale set | — | PARTLY: detailed return/exchange instructions absent. |
| WP10.10 | Commercial note under original identity | — | PARTLY: separate UNREG and replaced-registration cases absent. |
| WP11.1 | COD issue before courier call and issue-failure block | DOC-001 | PARTLY: issue failure cannot yet be prepared safely. |
| WP11.2 | FAILED prepaid ship disabled | JOB-002 | NOT TESTABLE without genuine FAILED preparation. |
| WP11.3 | Pickup State mismatch | ERR-008 | PARTLY: full state-mismatch walkthrough absent. |
| WP11.4 | EWB boundary, clearing, expiry, all pickup paths | DIS-001 | PARTLY: address change/reissue/rebooking and each pickup path missing. |
| WP11.5 | Auto/manual/batch payload parity and COD collectable | — | PARTLY: exact dummy payload inspection and 3P sandbox verification absent. |
| WP11.6 | Ship race and self-dropoff gate | §12 | PARTLY: manual race needs reproducible steps; no identified mark-dropoff UI. |
| WP11.7 | Stale registration reissue | ERR-015 | PARTLY: OTP and original/new document assertions not authored. |
| WP11.8 | Invoice help text, removed `generateInvoice` | — | PARTLY: source-removal check and screenshot instructions absent. |

## 15. Launch gate — always NO-GO while this guide is a draft

Automatic NO-GO: wrong issued tax or total; a duplicate/gap in a completed store/FY/series ledger; cross-store or cross-order document access; mutation of an issued snapshot; tax code changing money; over-credit; missing document before dispatch; duplicate charge/refund/booking; missing recovery of an eligible order; mandatory document inaccessible; misleading legal claims; unresolved P0/P1; any applicable LAUNCH CA or 3P blocker.

Conditional GO is possible only **after this draft is completed and executed**, WP12–WP14 and the closing sweep are resolved, every applicable CA/third-party launch blocker is signed off, all P0/P1 pass, and remaining P2/P3 have a safe workaround, owner and date. The sample catalogue cannot be used as production legal-rate evidence.

### Final owner-run commands — after WP13, not run by this author

```powershell
cd D:\study\ShopPulseAdmin
npx prisma validate
npx tsc --noEmit
npm run lint
npm run build

cd D:\study\ShopPulseStore
npx tsc --noEmit
npm run lint
npm run build
```

### Final execution and artifacts

| Store | Date / plan | PASS | FAIL | BLOCKED | NOT TESTABLE | SKIPPED | Decision / owner |
|---|---|---:|---:|---:|---:|---:|---|
| S-UNREG | | | | | | | |
| S-REG | | | | | | | |
| S-COMP | | | | | | | |
| S-CHANGE | | | | | | | |

- [ ] Documents-number ledger with every sequence and reason for any apparent gap.
- [ ] PDF samples: tax invoice, Bill of Supply, commercial invoice, GST and commercial credit notes, SaaS invoice.
- [ ] Money reconciliation: quote, order, Razorpay, issued lines, refund legs and remaining balances.
- [ ] Error-copy screenshots and redacted Network responses; cross-tenant access evidence.
- [ ] Dummy booking/payload and webhook evidence; cron first/second run results; Cloudinary and email evidence.
- [ ] CA and third-party decisions, named P2/P3 owners, final command output and written release decision.

### Numbers ledger

| Store / GSTIN / prefix | FY / kind | Sequence | Full number | Order / correction | Issue date IST | Prior sequence / gap explanation |
|---|---|---:|---|---|---|---|
| | | | | | | |

Number format `{PREFIX}-{K}{YY}-{NNNNNN}`; kinds `I` invoice, `B` Bill of Supply, `S` commercial invoice, `C` credit note, `D` debit note; `R`/`V` are reserved. Each number is at most 16 characters. Compare sequences separately per prefix, FY and kind; do not interleave different series as if they were one.

### Order and return ledger

| ID | Store | Products / quantities | Pay / pincode | Order / sale-set / numbers | Shipment / AWB | Return / note | Refund legs | Quote / charged / credited ₹ | Result |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |

### Minimum named orders

`O-PREPAID-REG`, `O-COD-REG`, `O-MIXED-SET`, `O-COMP-BOS`, `O-UNREG-CI`, `O-B2B-INTRA`, `O-B2B-INTER`, `O-EWB-50000`, `O-EWB-50000-01`, `O-RETURN-PARTIAL`, `O-CANCEL-PREPAID`, `O-CANCEL-COD`, `O-RTO`, `O-EXCHANGE`, `O-STALE-REISSUE`, `O-COMP-LAPSE`, `O-QUOTE-CHANGED`, `O-LAST-STOCK`, `O-ISSUE-NOW`. Assign each a unique real checkout order in the ledger; these names alone are not proof.

## 16. Unfinished-work register

This file is intentionally labelled DRAFT because it does **not** yet meet the requested deliverable. Finish all PARTLY and NOT TESTABLE traceability entries where legitimate controls exist; author full UI-only fault/replay and negative-error procedures; enumerate mandatory PDF v1 fields per type; verify exact controls, API paths and copy across both repositories; build complete transition, composition-lapse, correction, payload and dispatch walkthroughs; validate every scenario's expected-value and evidence row; then remove the draft warning only after an independent source and arithmetic self-review. Do not treat this register as a completed launch gate.
