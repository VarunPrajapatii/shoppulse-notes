# GST & Tax for D2C E-commerce — Part 1: Fundamentals

> Companion docs:
> - **Part 2 — Implementation, Edge Cases & ShopPulse Mapping** → `GST_AND_TAX_FOR_ECOMMERCE_PART_2_IMPLEMENTATION.md`
> - **Part 3 — Builder's Playbook**, **Part 4 — Decision Sheet**, **Part 5 — Cross-App Feature Map**
>
> This document is the canonical, plain-English reference for **everything tax-related**
> in ShopPulse. If you ever forget why a column exists or why a checkout API
> branches the way it does, start here.

---

## ⚠️ GST 2.0 — Major reform effective 22 September 2025 (read first)

The **56th GST Council** introduced India's biggest GST overhaul since launch.
Notifications 09/2025-CTR through 17/2025-CTR (dated 17 Sep 2025) operationalised
the changes, effective **22 September 2025**. Verified against ClearTax 2026
guides and CBIC notifications. Highlights affecting ShopPulse:

### Slabs collapsed: 0 / 5 / 12 / 18 / 28 → **5 / 18 / 40**

| Old slab | What happened in GST 2.0 |
|---|---|
| **0% (Nil)** | Retained. Expanded — many essentials added (33 lifesaving drugs, dairy basics, individual health/life insurance, education stationery). |
| **5%** | Retained as the "merit" slab. Massively expanded — daily essentials (shampoo, toothpaste, soap, hair oil), butter/ghee/cheese, namkeens, tractors, bio-pesticides, all handicrafts moved here. |
| **12%** | **Removed as a primary slab.** Most 12% items moved to 5%; some pushed to 18%. (Niche carve-outs: bricks/tiles still 12% under Notif 14/2025.) |
| **18%** | Retained as the "standard" slab. ACs, TVs >32", small cars/3-wheelers/motorcycles ≤350cc moved DOWN here from 28%. |
| **28%** | **Removed as a primary slab.** Retained only for tobacco, pan masala, cigarettes (transitional, until cess loans cleared). |
| **40% (NEW)** | New "demerit/sin & luxury" slab: aerated/sweetened/caffeinated drinks, large cars, motorcycles >350cc, yachts, casinos, online money gaming, revolvers/pistols. |
| **3%, 0.25%, 1.5%** | Niche slabs retained: 3% gold/jewellery, 0.25% rough diamonds, 1.5% diamond job-work. |

### Apparel & footwear bracket changed: ₹1,000 → **₹2,500**

- ≤ ₹2,500 per piece → **5%** (was: ≤₹1,000 → 5%)
- \> ₹2,500 per piece → **18%** (was: >₹1,000 → 12%)
- The 12% middle band is gone. A T-shirt at ₹2,499 is 5%; the same SKU at ₹2,501 is 18%.
- This is the single most important change for D2C apparel sellers. Re-read §4 of this doc with this in mind.

### Other notable 2025 changes

- **Individual health & life insurance**: 18% → **Nil** (exempt). Group/business health insurance still taxable.
- **Petrol/diesel small cars (≤1200cc/≤4000mm petrol; ≤1500cc/≤4000mm diesel)**: 28% → **18%**
- **Small motorcycles (≤350cc), 3-wheelers, goods transport vehicles**: 28% → **18%**
- **TCS under GST**: was 1%, became **0.5%** from 9 July 2024 (Notification 15/2024-Central Tax). Confirmed.
- **E-invoicing threshold**: ₹5 crore aggregate annual turnover (in any FY since 2017-18). Active since 1 Aug 2023. **No further reduction announced as of 2026.**
- **Local delivery via e-commerce operator**: Now under RCM at 18% (Notif 17/2025) — the ECO pays GST unless the supplier is mandatorily registered.
- **Service rate restructuring (Notif 15/2025)**: Many transport/courier/job-work services moved from 12% → 18%; tailoring, food job-work, brick mfg job-work, handicraft job-work moved to 5%; diamond job-work to 1.5%.

### What stayed the same

- The CGST + SGST / IGST split for intra/inter-state — **structure unchanged**.
- HSN/SAC code system — unchanged. Only the **rates against codes** changed.
- Composition Scheme thresholds — unchanged (₹1.5 cr goods / ₹50L services).
- GST registration thresholds — unchanged (₹40L goods normal-state, ₹20L services normal-state).
- Place-of-Supply rules — unchanged.
- E-invoicing IRN/QR mechanism — unchanged.
- E-way bill thresholds — unchanged (₹50,000 default; varies by state).
- GSTR-1 / 3B / 9 filing schedule — unchanged.

### What this means for ShopPulse

1. **Drop 12% and 28% from default `GST_TAX_SLABS`** array. Keep them as enterable values (legacy products / tobacco) but **highlight 5%, 18%, 40%** in the rate picker UI.
2. **Update apparel auto-bracket from ₹1,000 → ₹2,500** in Phase 6 `order-tax.ts`. New rates: 5% / 18% (no 12% middle band).
3. **Update HSN reference dataset** (`src/lib/billing/data/hsn-reference.json`) — every defaultRate that was 12% needs review (most became 5%, some 18%); every 28% needs review (most became 18%, sin goods became 40%).
4. **Subscription tax (Phase 4) unchanged** — SaaS still 18% under HSN 9983 / SAC.
5. **Add 40% as a valid slab** in dropdowns (will rarely be picked by D2C; mostly luxury/sin sellers).

### Sources verified (March 2026)

- ClearTax: "GST Rates in India 2026" (updated Feb 20 2026) — the rate tables in this document.
- ClearTax: "GST Registration Threshold Limits" (updated Mar 12 2026) — thresholds confirmed unchanged.
- CBIC official notifications 09–17/2025-CTR dated 17 Sep 2025.
- Effective date for all rate changes (except tobacco): **22 Sep 2025**.

---

> The body of this document below was originally written for the pre-GST-2.0
> regime. Where you see "12%" or "28%" or "₹1000" mentioned in the slab/apparel
> sections, treat the principles as still correct but the *numbers* as
> superseded by the table above. Inline `[GST 2.0]` markers flag the spots that
> were patched.

---

## Table of Contents

1. [Why GST exists in one paragraph](#1-why-gst-exists-in-one-paragraph)
2. [The four GST components — CGST, SGST, IGST, UTGST](#2-the-four-gst-components)
3. [Place of Supply — the single most important variable](#3-place-of-supply)
4. [Tax slabs in India and how to pick one](#4-tax-slabs-in-india)
5. [HSN, SAC, UCS — what each code is for](#5-hsn-sac-ucs)
6. [Inclusive vs Exclusive pricing](#6-inclusive-vs-exclusive-pricing)
7. [Who needs GST registration (and who doesn't)](#7-who-needs-gst-registration)
8. [Composition scheme](#8-composition-scheme)
9. [Tax Invoice vs Bill of Supply vs Receipt](#9-tax-invoice-vs-bill-of-supply-vs-receipt)
10. [Round-off — the ₹0.50 mystery](#10-round-off)
11. [Reverse Charge Mechanism (RCM)](#11-reverse-charge-mechanism-rcm)
12. [TCS — Tax Collected at Source under GST](#12-tcs)
13. [TDS — different from TCS](#13-tds)
14. [B2B sales and buyer GSTIN](#14-b2b-sales-and-buyer-gstin)
15. [Multi-state warehousing](#15-multi-state-warehousing)
16. [E-invoicing (IRN / QR)](#16-e-invoicing)
17. [E-way bill](#17-e-way-bill)
18. [Returns calendar (GSTR-1, 3B, 9)](#18-returns-calendar)

---

## 1. Why GST exists in one paragraph

Before July 2017 India had a layered tax mess: VAT (per state), Service Tax (centre),
Excise (centre), CST (inter-state), Octroi, Entry Tax, Entertainment Tax, Luxury Tax.
A laptop moving Mumbai → Bengaluru paid CST + Octroi + Entry Tax with no input credit
across them. **GST is a single destination-based consumption tax** with a unified
input-credit chain across the country. One tax, one form, one credit ledger.

Two governments still need their share, so a single transaction is split into
**CGST (Centre) + SGST (State)** for intra-state, or **IGST (Centre, later
apportioned)** for inter-state. The total rate is the same either way.

---

## 2. The four GST components

| Code  | Stands for                       | Levied by | When it applies                                    |
| ----- | -------------------------------- | --------- | -------------------------------------------------- |
| CGST  | Central GST                      | Centre    | Intra-state sale (seller state == buyer state)     |
| SGST  | State GST                        | State     | Intra-state sale (paired with CGST, same rate)     |
| IGST  | Integrated GST                   | Centre    | Inter-state sale or import                         |
| UTGST | Union Territory GST              | UT govt   | Sale within a UT without a legislature             |

**Rule of thumb**: total tax never changes; only the split changes.

```
T-shirt sold for ₹649 inclusive @ 5% GST
─────────────────────────────────────────
Intra-state  →  CGST 2.5% (₹15.45) + SGST 2.5% (₹15.45) = ₹30.90
Inter-state  →  IGST 5%   (₹30.90)                       = ₹30.90
                                                  same total ✓
```

---

## 3. Place of Supply

**The state of the buyer determines the tax type.** This rule exists because GST is
"destination-based" — the consuming state should get the tax revenue.

| Seller location | Ship-to location | Tax type | Why                  |
| --------------- | ---------------- | -------- | -------------------- |
| Maharashtra     | Maharashtra      | CGST+SGST| Same state           |
| Maharashtra     | Karnataka        | IGST     | Different state      |
| Maharashtra     | Andaman (UT)     | IGST     | Different state/UT*  |
| Delhi (UT)      | Delhi (UT)       | CGST+UTGST| Same UT             |

*UT-with-legislature (Delhi, Puducherry, J&K, Ladakh) behave like states → SGST.
UT-without-legislature (Chandigarh, Andaman, Lakshadweep, D&D, D&NH) → UTGST.

**For services** the place of supply is more complex (location of recipient if
B2B, location of service performance if B2C, etc.) — but ShopPulse sells **goods
+ digital storefront SaaS**, so for goods we always use **buyer's shipping
state**. For our SaaS subscription, place of supply is the merchant's
billing-address state (Phase 4 already handles this).

---

## 4. Tax slabs in India

| Slab | Common categories                                             |
| ---- | ------------------------------------------------------------- |
| 0%   | Exempt / nil-rated supplies (expanded in GST 2.0) |
| 3%   | Gold, silver, jewellery, precious stones (special slab) |
| 5%   | Merit and essential goods; apparel/footwear up to threshold |
| 18%  | Standard slab for most goods/services including SaaS |
| 40%  | Demerit/luxury/sin goods (aerated drinks, large luxury vehicles, gaming/casino classes) |
| 28% (niche retained) | Tobacco/pan masala classes retained at 28% pending cess transition |
| 0.25% / 1.5% | Rough diamonds / specified diamond job-work (niche slabs) |

**Threshold quirks** (these are real and bite):

- **Apparel & footwear [GST 2.0]**: 5% if **per-piece sale value ≤ ₹2,500**, 18% above.
  So one T-shirt at ₹2,499 is 5%, the same SKU at ₹2,501 is 18%. Per-line, not per-cart.
- **Restaurants**: 5% without ITC, 18% in 5★ hotels with ITC.
- **Mobile phones [GST 2.0]**: typically 18% in current schedules.
- **Online gaming, casinos, horse racing [GST 2.0]**: 40% on full face value in revised schedules.

ShopPulse stores `taxRate` per product but the apparel slab override should be
computed at **checkout** based on the actual line price.

---

## 5. HSN, SAC, UCS

Three different code systems show up on one invoice; people mix them up constantly.

### HSN — Harmonized System of Nomenclature
- 8-digit international code for **goods**.
- WCO standard, India uses 4/6/8 digit truncations.
- Mandatory on invoices based on turnover:
  | Turnover (last FY) | Mandatory HSN digits |
  | ------------------ | -------------------- |
  | ≤ ₹5 cr            | 4 digits B2B, optional B2C |
  | > ₹5 cr            | 6 digits both         |
  | E-invoicing applicable | 6 digits           |
- Examples: `6109` (cotton T-shirts), `8517` (mobile phones), `2106` (food preparations
  not elsewhere specified — covers achaar/papad branded).

### SAC — Service Accounting Code
- 6-digit code for **services**.
- Examples: `998314` (IT consultancy), `998431` (web-hosting / SaaS — what ShopPulse
  itself uses for its subscription invoices).

### UCS / UQC — Unit Quantity Code
- Standardised "unit of measurement" required by GSTR-1.
- Common ones: `PCS` (pieces), `KGS` (kilograms), `LTR` (litres), `MTR` (metres),
  `SQM` (square metres), `BOX`, `PAC`, `OTH` (others).
- Why it matters: GSTN portal rejects returns with non-standard units like
  "pieces" or "kg" written longhand. Must be the canonical 3-letter code.

ShopPulse's `Product.ucsCode` defaults to `PCS`.

---

## 6. Inclusive vs Exclusive pricing

This is **the** decision that shapes the entire UX.

### Exclusive (B2B / Western SaaS / US sales tax style)
- Listed price = pre-tax. Tax added at checkout.
- Customer sees ₹100 + ₹18 GST = ₹118 at the last step.
- Surprise at checkout, but standard for B2B and US e-commerce.

### Inclusive (Indian D2C standard)
- Listed price = final price the customer pays. Tax is **embedded**.
- Customer sees ₹118 on the listing, ₹118 at checkout.
- Backend derives the taxable amount: `taxable = price / (1 + rate)`.
- **This is what Indian Consumer Protection (E-commerce) Rules 2020 effectively
  require** — listing must show "the total price including all mandatory charges".

### Why both should be supported in ShopPulse
- D2C apparel/food/beauty stores → inclusive (default).
- B2B-flavoured stores (industrial supplies, wholesale electronics) → exclusive.
- A new field `Store.priceMode: 'INCLUSIVE' | 'EXCLUSIVE'` (default `INCLUSIVE`)
  controls form labels, price input help-text, and the math direction in
  `order-tax.ts`.

### Math reference

Given inclusive price `P` and rate `r`:
```
taxable = P / (1 + r)
tax     = P - taxable   = P * r / (1 + r)
```

Given exclusive price `P` and rate `r`:
```
taxable = P
tax     = P * r
gross   = P * (1 + r)
```

### Worked example — T-shirt ₹649 inclusive @ 5%, intra-state

```
taxable = 649 / 1.05  = 618.0952380...
        rounded 2dp   = 618.10
CGST    = 618.10 * 0.025 = 15.4525  → 15.45
SGST    = 618.10 * 0.025 = 15.4525  → 15.45
gross   = 618.10 + 15.45 + 15.45 = 649.00 ✓
```

If tax is computed on the un-rounded taxable:
```
CGST = 618.0952 * 0.025 = 15.4524  → 15.45
SGST = 618.0952 * 0.025 = 15.4524  → 15.45
gross = 648.99 ← off by 1 paisa
```

That 1-paisa drift is what **round-off** lines absorb (see §10).

---

## 7. Who needs GST registration

Mandatory thresholds (FY 2024-25, normal states):

| Activity                               | Threshold turnover |
| -------------------------------------- | ------------------ |
| Goods, normal states                   | ₹40 lakh           |
| Goods, special-category states         | ₹20 lakh           |
| Services, normal states                | ₹20 lakh           |
| Services, special-category states      | ₹10 lakh           |
| Inter-state supply of goods            | ₹0 (some exemptions for handicrafts) |
| Selling **through e-commerce operator** (Amazon, Flipkart, Meesho marketplace) | ₹0 (mandatory) |
| Selling **through own portal** (own Shopify/ShopPulse store) | Same as offline thresholds (CBIC Notification 34/2023-CT, Oct 2023) |

**The achaar / papad seller scenario**:
- Annual revenue ₹60k (₹5k/month) → well below ₹40L threshold.
- Sells via **own ShopPulse store** (not via a marketplace) → not pulled into
  mandatory ECO registration.
- → **No GST required.** She charges ₹100, receives ₹100, issues a Bill of
  Supply (or even just a receipt — see §9).

Many of her items are 0% / exempt anyway (loose unbranded papad, achaar in
non-pre-packaged form). The moment she pre-packages and labels (Legal Metrology
"pre-packaged" definition), most jump to 5%–18% depending on item schedule.

**Special-category states** (lower threshold): Arunachal Pradesh, Assam,
Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura, Uttarakhand, Himachal
Pradesh, J&K, plus telangana for some categories.

---

## 8. Composition scheme

A simplified flat-rate alternative to regular GST for small sellers.

| Eligibility           | Goods seller turnover ≤ ₹1.5 cr (₹75L in special states), services ≤ ₹50L |
| --------------------- | -------------------------------------------------------------- |
| Tax rate              | 1% goods (½% CGST + ½% SGST), 5% restaurants, 6% services      |
| Charged to customer?  | **No.** Seller pays out of own pocket from margin.             |
| Invoice type          | **Bill of Supply** with footer *"Composition taxable person, not eligible to collect tax on supplies"* |
| Input Tax Credit      | **Cannot claim** ITC on purchases.                             |
| Inter-state sales     | **Not allowed** (composition is intra-state only)              |
| **E-commerce sales**  | **Cannot opt for composition if selling via ECO** — but selling via own portal is fine after Oct-2023 clarification |

**ShopPulse model**: `Store.gstScheme: 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED'`.
For Phase 6 cart math, COMPOSITION + UNREGISTERED behave identically (no tax
lines on customer invoice). Phase 7 invoice PDF differs only in the footer
wording.

---

## 9. Tax Invoice vs Bill of Supply vs Receipt

| Document        | Issued by                                       | Tax columns | Required fields |
| --------------- | ----------------------------------------------- | ----------- | --------------- |
| Tax Invoice     | GST-registered regular dealer making taxable supply | Yes (CGST/SGST/IGST) | Invoice #, date, seller GSTIN+name+addr, buyer name+addr (+GSTIN for B2B), HSN, qty, UCS, taxable, rate, tax, total, signature, place of supply |
| Bill of Supply  | Composition dealer; or any GST-registered dealer making **exempt** supply; or unregistered (optional) | No | Same as tax invoice minus tax columns; footer note explaining why |
| Receipt / Cash Memo | Unregistered seller, or registered seller for taxable supply ≤ ₹200 to unregistered buyer who doesn't ask for invoice | No | Just amount + date + seller info |

**Decision tree at checkout**:
```
seller.gstScheme === 'UNREGISTERED' → Receipt or Bill of Supply
seller.gstScheme === 'COMPOSITION'  → Bill of Supply (with footer)
seller.gstScheme === 'REGULAR'
   ├── all line items 0% / exempt   → Bill of Supply
   └── any taxable line              → Tax Invoice
```

ShopPulse will compute this in Phase 7 invoice generator; the order schema
already has enough fields to derive it (no schema change needed).

---

## 10. Round-off

### What it is
Indian invoices report amounts to **2 decimal places (paise)**, but final
payable totals are typically rounded to the **nearest rupee**. The 1-99 paise
delta between the computed total and the rounded payable total is shown as a
separate line: **"Round Off"**.

### Why it exists
Two reasons:

1. **Cash transactions**: India phased out 1 / 2 / 5 / 10 / 25 / 50 paise coins.
   Smallest cash unit is ₹1. So `₹648.95` would be rounded to `₹649.00`
   (Round Off `+0.05`) for a cashable amount.
2. **GSTR-1 reconciliation**: Section 170 of the CGST Act + Rule 36 mandate
   amounts in the return be rounded to the nearest rupee using the "Round half
   to even / nearest rupee" rule. The system's penny-precision sums then need
   the round-off line to tie back to the printed total.

### Rule
- Fractional value < 0.50 → round down.
- Fractional value ≥ 0.50 → round up.
- Round-off = `roundedTotal - computedTotal`. Can be positive or negative,
  bounded by ±₹0.49.

### Example
```
Subtotal taxable:          ₹1,250.42
CGST 9%:                      112.54
SGST 9%:                      112.54
─────────────────────────────────────
Computed total:            ₹1,475.50
Rounded payable:           ₹1,476.00
Round Off (line item):     +₹0.50
─────────────────────────────────────
Amount payable:            ₹1,476.00
```

### Decisions to make for ShopPulse

> The user must pick one for each:

1. **Should the round-off be applied to the final payable, or skipped (charge
   exact paise)?**
   - Online payments handle paise fine. Skipping round-off keeps math cleaner.
   - But **GSTR-1** will still round each row to the nearest rupee → if you
     don't round at invoice time, the printed invoice total won't match the
     return. Most Indian D2C platforms DO round.
   - **Recommendation**: round to nearest rupee, store the round-off as
     `Order.roundOffAmount` (signed Decimal(5,2)).

2. **Round at order level, or at line level?**
   - Line-level: each line ends in .00 → easier per-row reading, but you can't
     reconcile back to the rate × qty math.
   - Order-level (industry standard): keep lines penny-accurate, single
     round-off line at bottom.
   - **Recommendation**: order-level.

3. **How to allocate the round-off across CGST/SGST/IGST for the return?**
   - Indian GSTR-1 wants per-rate-bucket totals rounded. Round-off shown as a
     non-taxable adjustment.
   - **Recommendation**: keep round-off as a non-taxable line; report at the
     order summary level only.

---

## 11. Reverse Charge Mechanism (RCM)

### Normal flow (forward charge)
Seller collects GST from buyer → seller deposits to government.
```
Buyer pays ₹118 to Seller
Seller deposits ₹18 to Govt
```

### Reverse charge (RCM)
**Buyer** deposits the tax to the government, not the seller. The seller
invoices the *taxable amount only* (no GST). The buyer self-assesses, pays GST
to the govt, and *also claims it as ITC* in the same return — net cash impact
zero, but the paperwork is real.

### When does RCM apply?

1. **Notified categories** (Section 9(3) CGST Act):
   - Goods Transport Agency (GTA) services — when you hire a transporter for
     freight. Recipient pays 5% RCM.
   - Legal services from an advocate to a business — recipient pays 18% RCM.
   - Sponsorship services to a body corporate.
   - Director sitting fees paid by company (if director not employed).
   - Renting a residential dwelling to a registered person (post Jul-2022).
   - Cashew nuts (raw) from agriculturist to registered buyer.
   - Imports of services (treated as RCM by default).

2. **Purchases from unregistered suppliers** (Section 9(4) CGST Act):
   - Mostly suspended for B2B, except for builders buying from unregistered
     suppliers — has very narrow scope today.

### How it shows on an invoice
- Supplier issues an invoice with note: *"Tax payable on Reverse Charge basis"*.
- Tax columns blank; total = taxable only.
- Recipient creates a **self-invoice** if supplier is unregistered, then
  records both the output and input in their own books.

### Decisions to make for ShopPulse

> The user must pick one for each:

1. **Will ShopPulse storefront support B2B sales where the buyer pays under RCM?**
   - 99% of D2C use cases: NO. Customer is a regular consumer, forward charge.
   - **Recommendation**: Explicitly mark RCM as out-of-scope for MVP. Add a
     `OrderItem.isReverseCharge: Boolean @default(false)` column **for future**
     so we don't migrate later, but never set it true in current code paths.

2. **For ShopPulse-as-SaaS** (our own subscription invoices to merchants),
   does RCM apply?
   - We are a registered SaaS provider in India → forward charge (we collect
     18% IGST/CGST+SGST). Already handled in Phase 4. ✓
   - If a merchant outside India ever signs up: export of services, zero-rated.
     Out of scope for MVP.

---

## 12. TCS

**Two unrelated taxes share the abbreviation "TCS" — don't confuse them.**

### TCS under GST (Section 52 CGST Act)
- Applies to **e-commerce operators (ECOs)** like Amazon, Flipkart, Meesho.
- ECO must collect **1% TCS** on the *net taxable value of supplies* made
  through it, and deposit to govt by the 10th of next month.
- Seller can claim that 1% as credit in their electronic cash ledger.
- Filed in **GSTR-8** by the ECO.

### Does ShopPulse fall under "e-commerce operator"?

This is the critical question and the answer is **nuanced**.

CGST Act 2(45) defines ECO as "any person who owns, operates or manages **a
digital or electronic facility or platform for electronic commerce**."

- **Amazon, Flipkart, Meesho marketplace** → ECO. Multiple sellers' goods sold
  through one platform → TCS applies.
- **Shopify, ShopPulse, WooCommerce** → these provide **software/tooling** for
  a single merchant to run *their own* storefront. The merchant is the seller
  of record. The platform doesn't take title, doesn't process the consumer
  contract.
  - CBIC clarification (Circular 167/2021 — for restaurants under Sec 9(5))
    plus general industry interpretation: **storefront SaaS is NOT an ECO**.
  - Shopify has confirmed publicly it does not collect TCS on Indian merchant
    sales for this reason.

**Conclusion for ShopPulse**: We are SaaS, not ECO. We do **not** collect 1%
TCS on the merchant's sales. We do collect 18% GST on **our own subscription
fee** (forward charge), which is unrelated to TCS.

### TCS under Income Tax (Section 206C)
- Different law entirely — Income Tax Act, not GST.
- Applies to: sale of goods over ₹50L to a single buyer in a year (Sec 206C(1H),
  rate 0.1%); foreign tour packages; LRS remittances; motor vehicles > ₹10L; etc.
- Out of scope for D2C consumer sales of small ticket sizes.

**Decision for ShopPulse**: No TCS handling needed in MVP. Document explicitly.
If we ever pivot to a multi-seller marketplace model, this changes.

---

## 13. TDS

Also two flavours; very different from TCS.

### TDS under GST (Section 51 CGST Act)
- 2% deducted by **government departments, PSUs, local authorities** when paying
  a vendor more than ₹2.5L per contract.
- Filed in GSTR-7 by the deductor.
- Doesn't apply to private B2C/B2B commerce → out of scope.

### TDS under Income Tax (Sections 192–195)
- Deducted at the source on salary, professional fees, contract payments, rent,
  interest, etc.
- Buyer of digital goods normally doesn't deduct TDS on a consumer purchase.
- ShopPulse pays TDS when **paying its own vendors** (writers, designers, etc.)
  → handled by accountant, not by the application.

### TDS under Section 194-O — e-commerce operators
- 1% TDS by ECO on payments to participating sellers, if seller's annual sales
  via the ECO > ₹5L.
- Same logic as TCS: ShopPulse is SaaS, not ECO → not applicable.

**Decision for ShopPulse**: No TDS handling needed in MVP.

---

## 14. B2B sales and buyer GSTIN

Your understanding is exactly right.

### Scenario
A consumer buys a laptop on Amazon. Two checkout flows:
- "Personal use" → consumer invoice, no buyer GSTIN.
- "GST invoice" → enter business name + GSTIN + business address. The invoice
  is issued to the business, who can then claim the **₹X,XXX of GST as Input
  Tax Credit (ITC)** against their own output tax liability.

### Why merchants want this
- Your buyer (a small consultancy) saves 18% in real cash via ITC.
- Without GSTIN on the invoice, the buyer cannot claim ITC.
- Many B2B-flavoured purchases (laptops, office supplies, software) won't
  happen at all if you don't offer this.

### What changes on the invoice
- "Bill To" name = company name (not consumer).
- Buyer GSTIN printed prominently.
- "Place of Supply" = state from which the GSTIN was issued (first 2 digits of
  GSTIN). Important: this might **differ** from the shipping state, in which
  case the seller still issues IGST per the buyer's GSTIN state.

### What ShopPulse needs (Phase 6+)
- Optional checkout step: "Order this for a business?" → reveal GSTIN +
  business name + business address fields.
- Validate GSTIN format (already have `validateGstin` from Phase 4).
- Save on `Order.buyerGstin`, `Order.buyerLegalName`, `Order.placeOfSupply`.
- Phase 7 PDF: add the buyer GSTIN row in the addressee block.
- Slot in `OrderItem.taxRateSnapshot` already exists; no schema change.

**Decision to make**:
1. Enable B2B GSTIN field at checkout for **all** stores, or only for stores
   that opt in via a setting?
   - **Recommendation**: opt-in toggle `Store.allowB2BInvoices: Boolean`,
     default `false`. Most D2C apparel stores don't need it; B2B-flavoured
     stores can flip it on. Adds zero friction for default users.

---

## 15. Multi-state warehousing

### What it means
You're a Bengaluru-registered seller. To get faster delivery to North Indian
customers, you store inventory in a fulfilment warehouse in **Delhi**. From
that warehouse you ship to Delhi customers.

### Why this is a GST problem
Under GST law, **each state where you have a "fixed establishment" requires a
separate GST registration**. So:
- Bengaluru HQ → GSTIN 29XXXX (Karnataka).
- Delhi warehouse → must obtain GSTIN 07XXXX (Delhi).
- When you move stock from Bengaluru to Delhi → it's a **stock transfer**,
  treated as an inter-state supply between two distinct persons (your two
  GSTINs), needs an IGST invoice + e-way bill, even though no money changes
  hands. The receiving GSTIN claims ITC.
- When you sell from Delhi warehouse to a Delhi customer → CGST+SGST under
  GSTIN 07XXXX (not your Bengaluru GSTIN).

### Practical impact
- Each registered state needs its own GSTR-1, GSTR-3B, books of accounts.
- Most early D2C merchants run a **single warehouse, single GSTIN** to avoid
  this complexity.
- Mid-size brands using Amazon FBA get pulled into multi-state because Amazon
  may store your inventory in multiple FBA warehouses across states.

### What ShopPulse needs
**MVP**: single seller GSTIN per Store. Done.
**Future** (post-Phase-7): `Warehouse` table with `gstin`, `stateCode`,
shipping rules pick the warehouse based on buyer pincode, and the resulting
order's "seller GSTIN" snapshot comes from the warehouse, not the Store.

**Decision to make**: Confirm we are punting multi-state warehousing to v2.
This means a merchant on ShopPulse today should ship from one location only,
under one GSTIN. Documented limitation.

---

## 16. E-invoicing (IRN / QR)

- Mandatory for businesses with **aggregate turnover > ₹5 cr** (lowered over
  time from ₹500 cr → ₹100 cr → ₹50 cr → ₹20 cr → ₹10 cr → ₹5 cr in Aug-2023).
- Process: invoice JSON is uploaded to the **IRP (Invoice Registration Portal)**,
  which returns a 64-character **IRN (Invoice Reference Number)** + a
  **signed QR code**. The QR + IRN must be printed on the invoice.
- Every B2B invoice in this turnover bracket needs IRN before it's issued to
  the buyer.
- B2C invoices need a self-generated dynamic QR (different from IRN QR), only
  if turnover > ₹500 cr.

ShopPulse has `Store.einvoiceEnabled: Boolean`. Phase 5 already enforces that
HSN + tax rate + UCS are mandatory on every product when this flag is on
(otherwise IRP rejects the invoice). Phase 7 will add the actual IRP API
integration (NIC sandbox first, then prod).

---

## 17. E-way bill

Required when moving goods worth **> ₹50,000** in a single conveyance
(threshold varies by state, some are ₹1L). Generated on the e-way bill portal,
contains transporter details, vehicle number, validity (1 day per 200 km).

**ShopPulse impact**: integrate with Logistic providers (Shiprocket,
Delhivery) — they auto-generate e-way bills from their portal when you book a
shipment. We don't generate them ourselves. Already handled in shipping module.

---

## 18. Returns calendar

| Form     | Frequency  | Purpose                                          | Due date           |
| -------- | ---------- | ------------------------------------------------ | ------------------ |
| GSTR-1   | Monthly / Quarterly (QRMP) | Outward supplies (sales)         | 11th next month / 13th of next quarter |
| GSTR-3B  | Monthly    | Summary return + tax payment                     | 20th next month     |
| GSTR-9   | Annually   | Annual reconciliation                            | 31 Dec next FY     |
| GSTR-9C  | Annually   | Audit reconciliation (turnover > ₹5cr)           | 31 Dec next FY     |
| CMP-08   | Quarterly  | Composition payment statement                    | 18th next quarter   |
| GSTR-4   | Annually   | Composition annual return                        | 30 Apr next FY     |
| GSTR-8   | Monthly    | TCS by ECO                                       | 10th next month     |
| ITC-04   | Half-yearly| Job-work intimation (turnover > ₹5cr)            | 25th next half-year |

ShopPulse doesn't file returns — accountants do. But ShopPulse must produce
exports that **map cleanly into GSTR-1 format**: per-invoice, per-rate-bucket
totals with HSN, place of supply, CGST/SGST/IGST/Cess split, customer GSTIN
where applicable. Phase 8 (post-invoice) will build this export.

---

> **Continue to Part 2** for: ShopPulse-specific UX flows, the inclusive/exclusive
> form design, the achaar-seller storefront experience, the T-shirt-merchant
> end-to-end walkthrough, discount-vs-tax interactions, edge cases, and the
> mapping of every concept above to ShopPulse's database columns and API
> endpoints.
