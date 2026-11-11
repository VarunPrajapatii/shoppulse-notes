# GST & Tax for D2C E-commerce — Part 3: The Builder's Playbook

> Written for a developer with no accounting/tax background. Plain English.
> If you only read one document, read this one.
> Then go to **Part 4 — Decision Sheet** to lock in choices.

---

## 2026 update note

- GST 2.0 rate reality used in ShopPulse docs: primary slabs are **5%, 18%, 40%**.
- Apparel/footwear decision threshold is **₹2,500** (not ₹1,000).
- TCS under GST via ECO is **0.5%** (revised from 1%).

---

## You don't need to become a tax expert. You need to build a system that:

1. Lets sellers pick the right tax mode without confusion.
2. Computes the right tax on every order automatically.
3. Generates the right document (Receipt / Bill of Supply / Tax Invoice).
4. Doesn't break when the seller's situation changes.
5. Beats Shopify / WooCommerce / Dukaan on simplicity for Indian sellers.

**That's the entire scope.** Everything below is in service of those 5 things.

---

## Section A — The 5-minute mental model of GST

### What is GST?
A single tax that replaced ~17 older Indian taxes in 2017. It's a **consumption tax** —
the *consumer pays it* (added on top of price), the *seller is the collector* (collects
from consumer, deposits to government).

### Where is the tax money split?
For accounting reasons, the same tax is split into pieces:
- **CGST** = Centre's share
- **SGST** = State's share
- **IGST** = One pot, used for inter-state, later split between centre and the consuming state.

You as a developer don't care about this split mechanically — you just need to know
the **rule**:

```
buyer-state == seller-state  →  CGST + SGST  (same rate each, half-half)
buyer-state != seller-state  →  IGST          (full rate as one number)
```

Total tax to the buyer is identical either way. It's the same amount of money
in the same buyer's pocket.

### Who is required to register?
- Goods seller, annual sales **< ₹40 lakh** → **NOT required** to register. (₹20 lakh in NE/hill states.)
- Goods seller selling on a **marketplace like Amazon/Flipkart/Meesho** → required from day 1.
- Goods seller selling on **their own ShopPulse store** → same threshold rule as offline (the ₹40L). They are NOT pulled into mandatory registration just because they're online on their own portal.

→ Translation: **A village papad seller doing ₹50K a month on her own ShopPulse store does not need GST. She keeps every rupee.**

### What does "GST registered" mean for the seller?
- They got a **GSTIN** (a 15-character ID like `27ABCDE1234F1Z5`).
- They must add GST on top of every taxable sale, deposit it monthly, file returns.
- They get to claim **Input Tax Credit** (ITC) — i.e., the GST they paid on
  their own purchases (inventory, packaging, software) gets refunded against
  the GST they collect.
- Their invoices are called **Tax Invoices**.

### What does "GST NOT registered" mean?
- No GSTIN.
- They sell at a single price; no GST line on bills.
- They keep every rupee the customer pays (minus payment-gateway fees).
- They cannot claim ITC on what they buy.
- Their invoices are called **Receipts** (or Bills of Supply).

---

## Section B — What is "Composition Scheme"? (Plain English)

This is the one you said you don't get. Here it is in real-developer language.

### The problem Composition solves
A small kirana/sweet shop owner with ₹80 lakh turnover **must** register for GST
(they crossed the ₹40L threshold). But filing monthly returns, maintaining ITC
ledgers, tracking HSN codes for 200 SKUs, doing rate-wise sales splits — all of
that requires a CA and a software setup the shop owner can't afford.

So the government created a **simplified track**: pay a flat % of turnover,
file 4 returns a year instead of 24, no ITC bookkeeping. That's **Composition Scheme**.

### Who can opt in
- Goods seller with annual turnover ≤ **₹1.5 crore**.
- Restaurants ≤ ₹1.5 crore.
- Small services ≤ ₹50 lakh.
- Cannot sell **inter-state** (only within home state).
- Cannot sell on **e-commerce marketplaces** (Amazon/Flipkart/Meesho marketplace).
- **CAN sell on own portal** (ShopPulse, Shopify, own website). This was clarified in 2023.

### What's the deal
- Pays flat **1%** of turnover (½% CGST + ½% SGST) for goods. (5% restaurants, 6% services.)
- Pays this from their own pocket — **does NOT charge GST to the customer**.
- Customer sees the listed price as the final price (just like an unregistered seller).
- Issues a **Bill of Supply** (no tax columns), with a footer note saying "composition taxable person, not eligible to collect tax on supplies".
- Cannot claim ITC on purchases.

### Why this matters for ShopPulse
For our purposes, **Composition behaves almost identically to Unregistered** at the
storefront/checkout layer:
- No tax shown to the customer.
- Customer pays listed price.
- Document = Bill of Supply (just different footer than Unregistered's Receipt).

The only **functional** differences from Unregistered:
1. They have a real GSTIN to print on invoices.
2. Inter-state shipping must be **blocked at checkout**.
3. Document footer text differs.

### Should we even support Composition in MVP?

**My honest recommendation**: **NO**, not for MVP. Here's why:
- Composition sellers are < 5% of typical D2C founders.
- The *behaviour* at storefront/order is almost identical to Unregistered.
- Adding it triples the test surface (3 schemes vs 2) for marginal user benefit.
- We can ship 2-card UI now, add the 3rd card later when a real Composition customer asks.

**What we ship instead**: 2 cards — **Unregistered** and **Registered (Regular GST)**.
Composition customers can pick "Unregistered" — yes their invoices won't say "Bill of
Supply (Composition)" but for storefront sale flow they're identical and the
merchant's CA handles the year-end paperwork separately. We add Composition as
"Phase 8 — Composition support" later.

This is the simplification you've been looking for.

---

## Section C — So what are the *real* options the seller picks?

After dropping Composition, you give them just **TWO** choices:

```
┌──────────────────────────────────────────────────────────────┐
│  Are you registered for GST?                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ◉  No, not yet                              (most common)   │
│      Best for new and small sellers.                         │
│      You'll keep 100% of every sale. No GST stuff.           │
│                                                              │
│  ◯  Yes, I have a GSTIN                                      │
│      For sellers above ₹40L turnover or who want to issue    │
│      proper Tax Invoices. You'll need your GSTIN handy.      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

That's it. Two cards. No accounting jargon.

This is also exactly what **Dukaan**, **Instamojo Stores**, and **Razorpay
Magic Checkout** do — they only ask "Do you have GST?" yes/no. Shopify is
similar (one toggle "Charge taxes on this product"). The reality is most Indian
SaaS storefronts don't offer Composition support at all.

---

## Section D — What "Inclusive vs Exclusive" really means (developer view)

You already know this from web dev. It's the same as how you display prices:

```
EXCLUSIVE:  $99.00 + tax (your US-style listing)
INCLUSIVE:  ₹649 (everything baked in, what you see is what you pay)
```

In India, **inclusive is the law** for B2C e-commerce. Consumer Protection
(E-commerce) Rules 2020 say the displayed price must be the final price the
buyer pays. So:

- D2C stores → **inclusive**, always. Sticker = total.
- B2B stores (rare on ShopPulse) → can be **exclusive** because their buyers
  are businesses claiming ITC and prefer to see the pre-tax amount.

**Recommendation**: Default `INCLUSIVE` for everyone. Don't even show the toggle in MVP.
99% of our sellers are D2C. Add the EXCLUSIVE toggle later as an "advanced setting"
when a B2B-flavoured seller asks for it.

This is one more simplification — drop the `priceMode` setting from MVP UI.
Hardcode INCLUSIVE. Keep the column in DB for future.

---

## Section E — What "HSN code" is, in 30 seconds

A **product category code** that the GST system uses to know what tax rate
applies. Like a SKU but standardised across the country / world.

- 4 to 8 digits.
- "6109" = T-shirts. "8517" = mobile phones. "2106" = "miscellaneous food preps" (covers branded papad/achaar).
- Government has a master list. You pick the closest match.
- Each HSN has a default GST rate (current practical slab set: 0/5/18/40 plus niche rates like 3%, 0.25%, 1.5%).

**Required only for registered sellers.** Unregistered sellers never see this field.

ShopPulse already has:
- A curated dataset of ~85 common D2C HSN codes ([`src/lib/billing/data/hsn-reference.json`](src/lib/billing/data/hsn-reference.json)).
- A search-as-you-type lookup that auto-fills the rate.

So the merchant doesn't have to memorise codes. They type "tshirt" and pick "6109 — Cotton T-shirts (5%)". Done.

---

## Section F — How Indian platforms actually do this (your competitive bench)

| Platform | Tax onboarding | Tax fields per product | Customer-facing tax UI |
|---|---|---|---|
| **Shopify (India)** | Single toggle "Charge taxes" + GSTIN field | "Charge tax on this product" checkbox + tax overrides per region | Inclusive, no breakdown unless turned on |
| **WooCommerce (India)** | Plugin-based; complex; "Inclusive/Exclusive" toggle exists | Tax class per product (manual rate setup) | Configurable |
| **Dukaan** | Single yes/no on GSTIN | HSN + rate per product if GST enabled | Inclusive prices; tax shown on invoice only |
| **Instamojo Stores** | Yes/no on GSTIN | Tax % per product | Inclusive |
| **Razorpay Magic** | GSTIN from settings | Optional HSN | Inclusive |
| **Meesho (marketplace)** | Forces GST sign-up | Mandatory HSN/tax fields | Inclusive + tax breakdown on invoice |
| **Amazon Seller Central** | GSTIN mandatory; complex per-state config | Mandatory HSN, tax code | Inclusive + full breakdown |
| **ShopPulse (us)** | **Yes/no on GSTIN** ← what we're shipping | Conditional fields (already built) | Inclusive; full breakdown for registered, none for unregistered |

**We're aligned with Dukaan/Instamojo** — the simplest, cleanest approach. We
beat Shopify on Indian-specific UX (no clunky region overrides, native HSN
search). We beat WooCommerce on out-of-the-box experience (no plugin needed).

---

## Section G — The complete ShopPulse story end-to-end (mental model)

### Two seller personas, one product:

| | **Sunita (UNREGISTERED)** | **Rahul (REGISTERED)** |
|---|---|---|
| Onboarding | Picks "No GST" → done in 1 click | Picks "Yes GST" → enters GSTIN → verified |
| Product form | Just price field. No tax UI. | Price + Tax & Compliance card (HSN, rate, exempt) |
| Storefront product page | Shows ₹150 | Shows ₹649 (incl. 5% GST) |
| Cart | ₹150 | ₹649 |
| Checkout summary | Subtotal ₹150 + ship ₹40 = ₹190 | Subtotal ₹649 + CGST ₹15.45 + SGST ₹15.45 + ship ₹40 (laid out for clarity, total still ₹689) |
| Razorpay charge | ₹190 | ₹689 |
| Order detail (admin) | No tax columns | Tax breakdown table |
| Document customer receives | "Receipt" PDF | "Tax Invoice" PDF with GSTIN block |
| What seller does at month-end | Nothing | Downloads GSTR-1 export, gives to CA |

That's the whole picture. Two paths through the app, both simple.

### When Sunita grows up

After 18 months her revenue hits ₹3L/month. She decides to register for GST.
- She gets her GSTIN from her CA.
- Goes to Settings → Tax → flips to "Yes, I have GSTIN" → enters GSTIN.
- One confirmation modal explains what changes (new invoices = Tax Invoice; old orders unchanged).
- She saves.
- A green card appears: "12 of your 18 products need HSN/tax info. [Open list]"
- She fills them in over the next week at her own pace.
- Old orders remain Receipts forever (snapshot is immutable). New orders are Tax Invoices.
- **No data lost. No store downtime. No panic.**

That's the lifecycle you've been worried about. It's literally one DB column flip + a soft warning card.

---

## Section H — Why we skip the scary stuff (RCM, TCS, multi-state) in MVP

You don't need to understand these deeply. Just know they exist and we explicitly punt:

| Concept | Why it doesn't matter for ShopPulse MVP |
|---|---|
| RCM (Reverse Charge) | Only applies to specific B2B service purchases (lawyers, transporters). Not relevant to consumer e-commerce orders. |
| TCS under GST | Only marketplaces (Amazon/Flipkart/Meesho) collect this. Current rate is 0.5%. ShopPulse is SaaS, not a marketplace. We don't touch this. |
| TDS | Income tax, handled by accountants outside the app. |
| E-way bill | For physical movement of goods > ₹50K. Shipping partners (Shiprocket, Delhivery) generate these on their portal. We don't. |
| E-invoicing (IRN/QR) | Required only for sellers > ₹5 cr turnover. We have a per-store toggle but actual IRP API integration is Phase 7+. |
| Multi-state warehousing | One warehouse / one GSTIN per Store. Documented limitation. Future v2 work. |
| Composition scheme | Same UX as Unregistered. We collapse them. Future addition if a real customer asks. |

Each of these is a feature flag or a future module. None of them block our launch.

---

## Section I — How does this relate to "BYOK SaaS for D2C founders"?

ShopPulse's promise: *"You don't need to spend lakhs hiring devs to build a
storefront, dashboard, payment, shipping. We give you all of that on a
subscription. You bring your own keys (Razorpay, Cloudinary, etc.)."*

For tax specifically, our promise is:
- **Sunita-class sellers**: zero tax setup, zero tax UI, zero confusion.
- **Rahul-class sellers**: enter your GSTIN, fill HSN per product (with smart
  search), and get GST-compliant invoices automatically — no Tally, no Zoho
  Books integration, no hand-typed invoices.

That's a real value prop. Shopify's GST setup in India is famously frustrating
(region overrides, manual tax rate tables). Dukaan is simpler but doesn't
generate proper Tax Invoice PDFs out of the box. We sit in the sweet spot:
**simple by default, complete when needed.**

---

## Section J — The single biggest realisation

You said: *"if the understanding is exhausting and typical then how am i
supposed to take the decisions in implementation planning, system, UI-UX
design around them. So how will the web developer inside me will work??"*

**Here's the answer**: You don't take *tax decisions*. You take *product
decisions*. The tax law is fixed. We just make a clean wrapper around it.

For every "feature" question, ask:
1. Will Sunita (no GST) be confused if I add this? → If yes, hide it for her.
2. Will Rahul (with GST) need this to issue a legally valid invoice? → If yes, ship it.
3. Will my CA-using friend be okay with the resulting GSTR-1 export? → If yes, we're good.

That's a 3-question test. Pass all three → ship. Fail any → re-design.

You're not designing tax law. You're designing a *toggle and conditional
rendering*. It's no harder than light-mode/dark-mode.

---

> Continue to **Part 4 — Decision Sheet** to make every remaining call.
> Continue to **Part 5 — Cross-App Feature Map** to see exactly which screens change.
