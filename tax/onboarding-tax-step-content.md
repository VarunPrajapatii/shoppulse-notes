# Onboarding: tax step content (for the future onboarding change)

Status: **not built**. Owner decision 1 Nov 2026: onboarding stays as it is for now; this file is the spec for when the tax step is added. Until then a new store has **no tax identity** and the seller sets it up in **Settings → Billing & Tax** (the "Store GST registration" card shows the same form described here). Any code that needs the identity (checkout, document issue, dispatch) raises `TAX_IDENTITY_MISSING` ("Set up your GST status in Settings → Billing & Tax first.") until it exists.

Design sources: 03 §14a (fields and copy), 03 §9 (date rules), 04 D-02, D-04, D-29, D-48, 04 §4.

---

## 1. Where the step goes

Current flow (`src/components/onboarding/`, 10 screens, store created once at the last screen by `POST /api/onboarding/complete { storeName }`).

Proposed: insert **two screens right after the store-name screen**, before the tour screens, so the seller answers while still focused on "setting up":

| # | Screen | Purpose |
|---|---|---|
| A | "How does your business work?" | Business type, home State, GST status |
| B | "Your business details" | Legal name, GSTIN (if registered), address, turnover facts, composition confirmations |

The answers are kept in the onboarding state (same pattern as `onboarding_store_name` in localStorage, key e.g. `onboarding_tax_step`) and sent with the final submit.

**Cannot be skipped**, except the GST-specific fields: a seller who is unsure picks "Not registered" and changes it later from Settings. Not registered needs only business type, home State, legal name and address.

---

## 2. Screen A: "How does your business work?"

Intro line: *"Three quick questions so your invoices and storefront follow GST rules from day one. You can change these later in Settings → Billing & Tax."*

| Field | Input | Default | Validation | Help / tooltip copy |
|---|---|---|---|---|
| Business type | select: Individual / Proprietor, Partnership, LLP, Private Limited, Public Limited, One Person Company, HUF, Trust / Society, Other | none | required | "How your business is legally set up. Being an individual is different from not having GST." |
| Home State | select (all States and UTs) | none | required | "The State you ship from. On ShopPulse, sellers without GST and composition sellers deliver only inside this State." |
| GST status | three large choice cards (below) | Not registered | required | "Pick what your GST certificate says. Not sure? Choose Not registered and update later." |

GST status cards (title, one-line explanation, small "what this means on ShopPulse" bullet list):

1. **Not registered**
   *"You don't have a GSTIN."*
   - Your invoices carry no GST.
   - You deliver only within your home State.
   - Customers see prices without any GST wording.
2. **Regular GST**
   *"You have a GSTIN and charge GST on sales."*
   - Tax invoices with GST, worked out for you.
   - You can deliver anywhere in India.
   - Each product needs an HSN code and GST rate before it can be sold.
3. **Composition scheme**
   *"You have a GSTIN under the composition scheme and pay a fixed % on turnover."*
   - Bills of Supply, no GST charged to customers.
   - You deliver only within your home State.
   - Products still need HSN code and rate (so a move to regular GST is seamless).

Muted footnote under the cards: *"Casual, non-resident, SEZ, ISD and TDS/TCS registrations are not supported yet."*

Why this order: home State is needed to check the GSTIN on screen B, and the status decides which fields screen B shows.

---

## 3. Screen B: "Your business details"

Title changes by status: Not registered → "Your business details"; Regular / Composition → "Your GST details".

### 3a. Identity

| Field | Shown for | Validation | Help / tooltip copy |
|---|---|---|---|
| GSTIN | Regular, Composition | 15 chars, uppercase, format + checksum; first two digits = home State; characters 3-12 = PAN | "Your 15-character GST number. We check it for typing mistakes, not with the government yet." |
| Registration date | Regular, Composition | date, default today; past allowed; at most 90 days ahead | "Date printed on your registration certificate. A future date keeps your store unregistered until then." |
| Legal name | all | required, ≤ 200 | Registered: "Exactly as on your GST certificate." Not registered: "Your own name or your business name." |
| Trade name | all | optional | "The name customers know." |
| PAN | Not registered: optional input. Registered: read-only, taken from the GSTIN | valid PAN format | "Used to keep your records together if you register for GST later." |

Live error copy (shown under the GSTIN field):
- Wrong length / characters: "GSTIN must be 15 characters (letters and digits)."
- Checksum: "This GSTIN has a typing mistake. Check the last character."
- State mismatch: "This GSTIN belongs to {State}, but your home State is {Home State}. The first two digits of the GSTIN must match your home State."
- PAN mismatch (only if a PAN was typed elsewhere): "The PAN inside your GSTIN (characters 3 to 12) does not match the PAN you entered."

### 3b. Principal place of business

| Field | Validation | Help |
|---|---|---|
| Address line 1 | required | "Printed on every invoice." |
| Address line 2 | optional | |
| City | required | |
| Pincode | 6 digits; must belong to the home State when the pincode directory knows it | "We use it to confirm your State." |
| State | fixed to the home State (not editable) | |

### 3c. Turnover facts (Regular and Composition only; become this financial year's declaration)

Block intro: *"Decides HSN digits on invoices, whether e-invoicing applies, and whether composition is allowed. We ask again every April."*

| Field | Input | Rule |
|---|---|---|
| Last financial year's turnover | Up to ₹1.5 crore / ₹1.5 crore to ₹5 crore / Above ₹5 crore | required |
| Ever above ₹5 crore in any year since 2017-18? | yes / no | forced "yes" when last year was above ₹5 crore; "yes" turns off GST invoices for business buyers (no e-invoicing yet) |
| Last year's turnover across all businesses on this PAN (₹) | number | **Composition only, required**; must be within the composition limit of the home State (₹1.5 crore, or ₹75 lakh for the special-category States). Over the limit → "Your turnover is above the composition limit for your State. Choose Regular GST." |
| Sales outside ShopPulse this year (₹) | number, default 0 | optional; used for turnover warnings |

Not registered sellers skip this block; ShopPulse saves the default (up to ₹1.5 crore, never above ₹5 crore, 0 outside sales).

### 3d. Composition confirmations (Composition only, both required)

- ☐ "Every GST registration on my PAN is opting in to composition."
- ☐ "I do not manufacture goods that are barred from composition (for example ice cream, pan masala, tobacco products)."
- Optional: "Composition tax rate (%)" with help "Used only to estimate your quarterly composition tax." (stored as basis points: 1% = 100).

If another ShopPulse store already uses the same PAN, the response carries a warning (never names that store): "Another ShopPulse store uses this PAN. Every GST registration on this PAN must move to composition from the same date."

---

## 4. Summary panel (bottom of screen B, before "Continue")

A short, plain summary the seller confirms:

> **Your store: {Regime label}** · Home State: {State}
> - Invoices: {Tax invoice with GST / Bill of Supply, no GST / Invoice without GST}
> - Delivery: {All of India / Only within {State}}
> - Invoice numbers will start with **{derived prefix}** (you can change it in Settings until your first invoice).

The prefix preview can be fetched later from the settings API after the store exists; during onboarding show "We'll create one from your store name."

---

## 5. What the submit does (backend contract, already built)

The final onboarding submit sends the tax answers together with the store name. After `POST /api/onboarding/complete` creates the store, it calls the existing service with the same payload the settings card uses:

```ts
// src/lib/tax/identity/registration-service.ts
setupInitialRegistration(storeId, input: InitialSetupInput)
// input schema: initialSetupSchema in src/lib/tax/identity/registration-schemas.ts
{
  regime, constitution, homeStateCode, legalName, tradeName?, pan?,
  gstin?, registrationDate?,            // registered only
  principalAddress: { line1, line2?, city, pincode, stateCode },
  compositionRateBps?, attestation?,    // composition only
  declaration?                          // registered only
}
```

What it creates (one transaction, Store row locked):
- `StoreTaxRegistration` row(s): the first period always starts on the **store creation date**. If the registration date is later than that (or in the future), the first period is "Not registered" and the GST period starts on the registration date (scheduled if in the future).
- `DocumentPrefix`: derived from the store name (first 5 letters/digits, then variants, auto-healed if taken; `SP` and placeholders reserved).
- `StoreTaxSettings` with defaults (prices include GST, split fees by value, B2B off).
- `StoreTaxYearDeclaration` for the current financial year.

Refusals come back as 409 `TRANSITION_NOT_ALLOWED` with `details.reasons` (show them as a list on screen B); field format problems as 400 `INVALID_PAYLOAD` with zod issues (map to fields). Both should keep the seller on screen B with their answers intact.

Order of operations to decide when building: create the store and the tax identity in **one request** so a store never exists without a tax identity (preferred), or create the store first and on a tax failure land the seller on Settings → Billing & Tax with the form pre-filled from localStorage.

---

## 6. After onboarding

- Store home checklist (`src/components/onboarding/dashboard/store-setup-checklist.tsx`) gets an item "GST status" (done when the identity exists) and, for registered sellers, "Add HSN code and GST rate to your products".
- Every later change (new registration, composition in/out, cancellation, new GSTIN, PAN or business-type change) happens only through **Settings → Billing & Tax → Change GST status**, with an OTP.

## 7. Copy checklist for the implementer

- Never say a seller "must register" because of their turnover; say "Your turnover is close to the GST registration limit. Talk to your tax advisor." (warnings come later from the turnover monitor).
- Never present the home-State-only rule for unregistered sellers as law; it is a ShopPulse rule: "On ShopPulse, sellers without GST deliver only inside their home State."
- Keep "individual" and "not registered" clearly separate everywhere.
