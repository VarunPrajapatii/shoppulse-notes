# GST & Tax for D2C E-commerce — Part 4: The Decision Sheet

> Every open product/system decision around tax for ShopPulse, with a
> **pre-filled recommendation**. Skim, say "agree", we ship.
> Where you must choose, the choices are pre-narrowed to 2-3 options
> with consequences spelled out.

> Companion docs: Part 1 (Fundamentals), Part 2 (Implementation),
> Part 3 (Builder's Playbook), Part 5 (Cross-App Feature Map).

---

## 2026 correction note

- Use GST 2.0 mental model: primary slabs **5%, 18%, 40%**.
- Apparel/footwear bracket for implementation is **<= ₹2,500 = 5%**, **> ₹2,500 = 18%**.
- TCS via e-commerce operator is **0.5%** (ShopPulse still does not collect it because we are SaaS, not marketplace ECO).

---

## How to use this sheet

For each decision below:
- **The recommendation** is what I will implement unless you push back.
- **The why** explains the trade-off in one paragraph.
- If you want a different option, just reply with the decision number and
  the alternative. Otherwise it ships as recommended.

---

## D1. How many tax schemes do we expose?

| Option | Description | Pros | Cons |
|---|---|---|---|
| A | 2 schemes: **Unregistered** & **Registered** | Simplest UX. Matches Dukaan/Instamojo. | Composition sellers (5%) don't get a custom invoice footer. |
| B | 3 schemes: Unregistered, Composition, Registered | Most "complete". | More UI surface, more test cases, marginal user benefit. |

**Recommendation: A (2 schemes).** Composition behaves identically to
Unregistered at the order/checkout layer — only the invoice footer differs.
Composition sellers can pick "Unregistered" for now; we add a 3rd option in a
future minor release if real customers ask.

**Schema impact**: drop `gstScheme` enum complexity. Use a single boolean
`Store.gstRegistered: Boolean @default(false)` (derived from `gstin` presence
+ explicit toggle). Cleaner, fewer edge cases.

---

## D2. Where can the seller change their tax registration status?

**Recommendation**:
1. **Onboarding wizard** (after store creation) — one screen with the 2 cards. Skippable; defaults to Unregistered.
2. **Settings → Tax** tab — same 2 cards. Editable any time.
3. **Sidebar amber nudge** when revenue trailing-12-months > ₹35L → "You're approaching the GST threshold. [Set up GST]".

No other entry points. No modals on product page, no popups at checkout. Only those 3 surfaces.

---

## D3. Default scheme for new stores

**Recommendation**: **Unregistered**. Matches the most common starting state
(new sellers, side hustles, hobby brands). Forces zero friction at signup.
Anyone with a GSTIN takes one extra click to flip and enter it.

---

## D4. Inclusive vs Exclusive pricing

| Option | Description |
|---|---|
| A | Hardcode INCLUSIVE for everyone in MVP. Drop the toggle. |
| B | Ship with toggle, default INCLUSIVE. |

**Final decision: B.** Ship with toggle, default INCLUSIVE.
Guardrails:
- Keep toggle under Settings -> Tax -> Advanced.
- Default remains INCLUSIVE for all new stores.
- Show a warning modal before switching to EXCLUSIVE.
- Store explicit `priceMode` snapshot on orders for traceability.

---

## D5. Round-off behaviour on order totals

**Recommendation (locked from previous discussion)**:
- Round per **order** (not per-line).
- Half-up to nearest rupee.
- Hide the "Round Off" line on summaries when it's exactly zero.
- Internal storage always Decimal(12,2) — exact paise.
- Refunds at exact paise via Razorpay.
- Credit notes at exact paise; no inverse round-off.

Matches Amazon India / Flipkart / Myntra exactly.

---

## D6. Apparel ₹2,500 slab override

**Background**: HSN 6101–6217 (apparel) and 6401–6405 (footwear) have a
per-line **sale-value bracket** under GST 2.0:

- Line sale value **≤ ₹2,500** → **5%** GST.
- Line sale value **> ₹2,500** → **18%** GST.

The rate is a function of `(hsnCode, unitPrice)`, not just HSN. The same
SKU sold at ₹2,499 vs ₹2,501 attracts different rates. The bracket is
**per line item**, not per cart total.

### Final decision: C — Hybrid (HSN default + manual override + checkout recalculation for bracketed HSNs)

### Decision precedence (single source of truth)

```
for each order line:
  if hsn has bracketRule:
      effectiveRate = bracketRule(unitPriceInclusive)   // legal rule wins, manual override ignored
  else if product.taxRate is manually set:
      effectiveRate = product.taxRate                   // merchant override
  else:
      effectiveRate = hsn.defaultRate                   // catalogue default
```

### Technical implementation

1. **HSN dataset** (`src/lib/billing/data/hsn-reference.json`) gains an
   optional `bracketRule` field on apparel/footwear codes:

   ```json
   {
     "code": "6109",
     "description": "T-shirts, singlets, knitted",
     "defaultRate": 5,
     "bracketRule": {
       "type": "PRICE_PER_PIECE",
       "threshold": 2500,
       "lowRate": 5,
       "highRate": 18
     }
   }
   ```

2. **Helper** `src/lib/billing/hsn-lookup.ts`:

   ```ts
   export function getEffectiveRate(
     hsnCode: string,
     unitPriceInclusive: number,
     productManualRate: number | null,
   ): { rate: number; source: 'BRACKET' | 'MANUAL' | 'HSN_DEFAULT' } {
     const entry = lookupHsn(hsnCode);
     if (entry?.bracketRule) {
       const rate = unitPriceInclusive <= entry.bracketRule.threshold
         ? entry.bracketRule.lowRate
         : entry.bracketRule.highRate;
       return { rate, source: 'BRACKET' };
     }
     if (productManualRate != null) {
       return { rate: productManualRate, source: 'MANUAL' };
     }
     return { rate: entry?.defaultRate ?? 0, source: 'HSN_DEFAULT' };
   }
   ```

3. **Order tax engine** (Phase 6 `src/lib/billing/order-tax.ts`) calls
   `getEffectiveRate` per line, snapshots the **derived** rate into
   `OrderItem.taxRateSnapshot` and the source into `taxRateSource`. Order
   becomes immutable after placement.

4. **Product validation** (POST/PATCH): if the chosen HSN has a
   `bracketRule`, the API rejects any manual `taxRate` payload with a
   422 — the merchant cannot override a legal bracket.

5. **Storefront price recompute**: every cart/checkout update re-runs
   `getEffectiveRate` against the *current* line price (after discounts).
   This is the same call path used at order placement, so preview ==
   final invoice.

### Seller UX-UI (product form, Tax & Compliance card)

- **HSN field**: searchable dropdown (already shipped Phase 5).
- **When merchant picks a bracketed HSN** (apparel/footwear):
  - GST rate dropdown becomes **read-only** with the value
    `Auto (5% / 18% by price)`.
  - Inline help text: *"This category uses a legal price bracket: 5% if
    selling price ≤ ₹2,500, else 18%. The rate is set automatically per
    order line — you cannot override it."*
  - Tooltip ⓘ links to a docs page explaining the bracket rule.
- **When merchant picks a non-bracketed HSN**:
  - GST rate dropdown is editable, pre-filled with `defaultRate`.
  - Yellow nudge if merchant changes it: *"This HSN is usually X%.
    Change only if you have CA confirmation."*
- **Live tax preview** under Selling Price (D24), bracketed-HSN variant:

  ```
  At ₹2,499 → 5% GST (CGST ₹59.50 + SGST ₹59.50)
  At ₹2,501 → 18% GST (CGST ₹190.85 + SGST ₹190.85)
  ```

  Both sides of the cliff are shown so merchants understand pricing at
  the boundary.
- **Bulk import / CSV**: rows with bracketed HSNs ignore any `taxRate`
  column; importer logs a soft warning per row.

### Customer UX-UI (storefront)

- **PDP / Cart / Checkout** (Registered seller, INCLUSIVE pricing — the
  default per D4): customer sees one inclusive price like always. No
  visible "bracket" concept. Tax line in checkout shows the *derived*
  rate for the current line price (e.g. `Includes 5% GST`).
- **Discount-driven cliff crossings**: if a coupon drops a ₹2,800 jacket
  to ₹2,400, the storefront recompute switches the displayed rate from
  18% → 5% automatically. The same recompute happens server-side at
  order placement so the invoice matches.
- **Invoice PDF**: line shows the *actual* derived rate and the HSN
  code. No "bracketed" label — looks like any normal Tax Invoice line.
- **Unregistered sellers**: bracket logic is irrelevant — no tax shown
  anywhere, document type is Receipt.

### Why this hybrid (not pure A or pure B)

- Pure A (always auto from HSN) breaks for non-bracketed HSNs where
  merchants legitimately need to set a rate (e.g. disputed handicraft
  classifications).
- Pure B (always manual) lets merchants set apparel at flat 5% even
  when selling a ₹4,000 jacket — a clear compliance violation we'd be
  responsible for surfacing.
- Hybrid: legal rule wins where the law is mechanical; merchant choice
  wins where the law allows judgement.

---

## D7. Shipping charge tax treatment

**Background**: When the seller charges ₹40 for delivery, is that ₹40 taxable?
The honest answer: it depends. Couriers (Bluedart etc.) charge 18% GST on shipping.
A merchant passing that cost through has options:
- Bake it into product price (no separate shipping line).
- Show shipping as a separate line, charge 18% GST on it.
- Show shipping as a separate line, mark as "convenience charge" (taxable at the same rate as the dominant goods in the cart — "composite supply" rule).

| Option | Description |
|---|---|
| A | Shipping treated as a non-taxable convenience charge (no GST). |
| B | Shipping always 18% GST (HSN 9968). |
| C | Shipping at the same rate as the cart's primary product (composite supply rule). |

**Recommendation: A for MVP.** Shipping shown as a separate non-taxable line.
This is what most small Indian D2C stores do (technically slightly inaccurate
but extremely common). Add option C as a per-store toggle in a later release
if accountants flag it.

---

## D8. B2B GSTIN at checkout

**Recommendation**:
- Add `Store.allowB2BInvoices: Boolean @default(false)`.
- When ON, storefront checkout shows a "This is a business purchase" checkbox + GSTIN field.
- Default OFF for everyone — most D2C stores don't need it.
- Seller flips it ON in Settings → Tax → "Advanced".

Implementation details in Part 2 §9.

---

## D9. RCM (Reverse Charge)

**Final decision**: Out of scope for MVP and **do not add schema field now**.
Add only when RCM work is actually planned.

---

## D10. TCS / TDS handling

**Recommendation**: None. We are SaaS, not an e-commerce operator (ECO). We do not collect TCS or TDS on merchant sales. Documented explicitly. No code.

---

## D11. E-invoicing (IRN/QR generation)

**Final decision**: Defer for now.
- Keep design notes only.
- No IRP integration work in current sprint.
- Keep product/API code ready for future enablement.

---

## D12. Tax-readiness audit (after upgrade)

**Final decision**: Time-boxed compliance enforcement (grace + hard stop).

Policy:
- At the moment seller switches to Registered, start a **grace window** (recommended: 7 days).
- During grace window: allow sales, but show persistent high-priority warnings and daily reminders.
- After grace window ends: automatically **archive/unpublish non-compliant products** (missing required tax fields).
- Compliance rule for active sale when `gstRegistered=true`:
  - Must have HSN
  - Must have tax rate (unless exempt)
  - Must have UCS
- Re-activate product automatically once tax info is completed.

Why this is safer:
- Prevents indefinite non-tax sales under registered mode.
- Reduces legal/compliance risk for merchant and platform.
- Matches your existing "grace then enforce" subscription-archive pattern.

---

## D13. Order document type — what PDF do we generate?

**Recommendation** (auto-derived from snapshot, no merchant input):

```
seller.gstRegistered === false                           → "Receipt"
seller.gstRegistered === true && all lines isExempt      → "Bill of Supply"
seller.gstRegistered === true && any taxable line        → "Tax Invoice"
seller.gstRegistered === true && order.isB2B && GSTIN    → "Tax Invoice" (with B2B block)
```

Snapshot at order placement, immutable thereafter.

---

## D14. Inter-state shipping for Composition sellers

**Recommendation**: Not relevant since we dropped Composition (D1). If we add Composition later, then block at checkout with a clear message: "This store can only ship within [State]."

---

## D15. Plan-based gating of tax features

**Recommendation** (locked from previous discussion): **Not gated by plan.** All
plans (Free, Starter, Growth, Pro) get the full tax stack. Tax is a baseline
necessity, not a premium feature. Upsell on storage, product count, integrations
instead.

---

## D16. Cashback / post-supply discounts

**Recommendation**: Out of scope for MVP. Tax is computed on the gross price the
buyer paid. Any platform-side cashback is a separate marketing expense, doesn't
affect order tax.

---

## D17. International (export) orders

**Recommendation**: Out of scope. Domestic India only. Exports are zero-rated under GST and require LUT/bond setup — separate flow for v2.

---

## D18. Multi-currency

**Recommendation**: Out of scope. INR only. Future v2 work.

---

## D19. The "Downgrade" path (Registered → Unregistered)

**Final decision: Deferred — not exposed in MVP UI.**

- `gstRegistered` is a one-way switch for self-serve.
- Once a store flips to Registered, the toggle is locked in Settings.
- Rare legitimate downgrades (department-cancelled GSTIN, business
  closure) are handled manually by support via direct DB update + audit
  note.
- Tooltip on the locked toggle: *"Need to change your GST status?
  Contact support — we'll verify your cancellation documents."*

Rationale: legal exposure (platform can't be seen as facilitating GST
evasion) + extremely low frequency + edge cases handleable via support.

Full future spec: see
[REGISTERED_TO_UNREGISTERED_DOWNGRADE_PATH.md](../future-enhancements/REGISTERED_TO_UNREGISTERED_DOWNGRADE_PATH.md).

---

## D20. Migration path for existing stores (if any have data already)

**Updated note**: Current app is pre-production with empty DB, so migration is not required now.
When production data exists later, use `gstRegistered = (gstin IS NOT NULL)` as migration default.

---

## D21. Storefront API response shape (the boolean payload)

**Final decision**: Keep this **TBD during implementation**.

Guidance:
- Design after checkout tax engine and storefront requirements are finalized.
- Keep API minimal and versioned.
- Avoid locking structure in this document before coding spike.

Draft candidate (non-final):

```ts
store.tax = {
  gstRegistered: boolean,
  priceMode: 'INCLUSIVE',           // hardcoded INCLUSIVE in MVP
  showTaxBreakdownOnPDP: boolean,   // = gstRegistered
  showTaxBreakdownOnCart: boolean,  // = gstRegistered
  showTaxBreakdownOnCheckout: boolean, // = gstRegistered
  allowB2BInvoices: boolean,
  sellerStateCode: string | null,   // for client-side hint
  documentType: 'TAX_INVOICE' | 'BILL_OF_SUPPLY' | 'RECEIPT'  // dominant document type
}
```

Storefront should treat tax fields as opaque flags. No scheme-string-checks in storefront code.

---

## D22. GSTR-1 export

**Recommendation**: Phase 8 work. Generates a CSV/Excel matching the GSTR-1 template (B2B sheet, B2C-Large sheet, B2CS sheet, HSN summary). Merchant gives this to their CA. Out of scope for current sprint.

---

## D23. Per-product tax field requirements

For Registered stores:

| Field | Required? | Default |
|---|---|---|
| HSN code | Recommended (warning if missing) — REQUIRED if e-invoicing enabled | null |
| GST rate | Recommended — REQUIRED if e-invoicing enabled | null |
| Cess rate | Optional (advanced) | 0 |
| Is exempt | Optional checkbox | false |
| UCS code | Recommended — REQUIRED if e-invoicing enabled | "PCS" |

**Status check (reconfirmed)**: Phase 5 already implements these requirements in product POST/PATCH APIs, including HSN-format validation and e-invoicing field guards.

---

## D24. Live tax preview on product form

**Recommendation**: Yes — a small read-only sub-text under the Selling Price field that recomputes on every keystroke:

```
₹649.00 includes 5% GST  (Taxable: ₹618.10 · CGST 2.5%: ₹15.45 · SGST 2.5%: ₹15.45)
```

Only shown when the store is Registered AND the product has a GST rate set.
Pure client-side computation; no API calls.

---

## D25. UI copy tone

**Recommendation**: Plain English everywhere. No "ITC", "Section 9(3)", "CGST/SGST/IGST" in *settings* UI (only on the *invoice PDF*, where it's required). Settings says "GST", "Tax", "Tax Invoice" — that's it.

Examples:
- ❌ "Your aggregate turnover crosses the threshold mandating registration under Section 22 of the CGST Act."
- ✅ "You're crossing ₹40 lakh annual sales — time to register for GST."

---

## D26. Where does "Place of Supply" show up in UI?

**Recommendation**: Only on the order detail page (admin) and the Tax Invoice PDF. Never in the merchant settings. Never on the storefront. It's a derived field, not a merchant decision.

---

## D27. Should we offer a "Get me a GSTIN" partner referral?

**Recommendation**: Phase 9 stretch. Could partner with a CA service and earn referral commission. Out of scope for now — just point sellers to gst.gov.in with a one-line tooltip.

---

## D28. Tax on subscription itself (ShopPulse → Merchant)

**Recommendation** (already done in Phase 4):
- ShopPulse charges 18% GST on its subscription.
- Place of supply = merchant's billing-address state.
- Intra-state (Karnataka merchant + Karnataka registered SP) → CGST+SGST. Inter-state → IGST.
- Already implemented in `src/lib/billing/subscription-tax.ts` and verified in `src/app/api/subscription/verify/route.ts`. ✓

---

## D29. Edge case: merchant enters an invalid GSTIN

**Recommendation**:
- Block save with red error message ("This GSTIN is invalid. Check the format and try again.").
- Don't auto-fall-back to Unregistered.
- Already enforced in Phase 4 via `validateGstin`.

---

## D30. Edge case: customer's pincode resolves to ambiguous state

**Recommendation**: Use the customer's selected shipping address state (a required form field) as the source of truth. Pincode → state lookup is a fallback only. If both fail, default to Place of Supply = seller's state (treats as intra-state, customer slightly under-billed but won't fail order).

---

## Decisions summary table (for your sign-off)

| # | Decision | My recommendation |
|---|---|---|
| D1 | Schemes count | 2 (Unregistered, Registered) |
| D2 | Where to change scheme | Onboarding, Settings, Threshold nudge |
| D3 | Default scheme | Unregistered |
| D4 | Inclusive vs Exclusive | Option B (toggle, default Inclusive) |
| D5 | Round-off | Per-order, nearest rupee, half-up, hide if zero |
| D6 | Apparel ₹2,500 bracket | Hybrid: HSN default + manual override + legal checkout recalculation |
| D7 | Shipping tax | Non-taxable line in MVP |
| D8 | B2B GSTIN | Opt-in, default off |
| D9 | RCM | Drop for MVP, no schema now |
| D10 | TCS/TDS | Skip |
| D11 | E-invoicing | Deferred for now |
| D12 | Readiness audit | Grace period, then auto-archive non-compliant products |
| D13 | Document type | Auto-derived |
| D14 | Inter-state for Composition | N/A (dropped) |
| D15 | Plan gating | None |
| D16 | Cashback | Skip |
| D17 | Exports | Skip |
| D18 | Multi-currency | Skip |
| D19 | Downgrade | Deferred — locked in MVP, support-only (see future-enhancement md) |
| D20 | Existing-store migration | N/A now (empty DB); later auto-derive from gstin |
| D21 | Storefront API shape | TBD during implementation spike |
| D22 | GSTR-1 export | Phase 8 |
| D23 | Per-product tax fields | Phase 5 unchanged |
| D24 | Live tax preview | Yes |
| D25 | UI copy tone | Plain English |
| D26 | Place of Supply UI | Admin + PDF only |
| D27 | GSTIN referral | Future enhancement documented |
| D28 | Subscription tax | Already done (Phase 4) |
| D29 | Invalid GSTIN | Block save |
| D30 | Ambiguous pincode | Fallback to shipping-state field |

**To approve all defaults**: reply "agree D1–D30".
**To override any**: reply with the number(s) and your alternative.

---

> Continue to **Part 5 — Cross-App Feature Map** to see exactly which screens
> and components change based on these decisions.
