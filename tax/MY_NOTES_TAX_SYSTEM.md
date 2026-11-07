# 7. What's unfinished or risky (Part 2 only)

1. **No tax step in onboarding.** A new seller who skips tax setup sees **nothing wrong in the dashboard** except empty setup cards (the audit found no global banner, but it didn't prove no other screen blocks them). Meanwhile every buyer who types a pincode sees a generic "Delivery not available". The seller will blame the courier and not suspect his own GST setup. This is the biggest practical issue, so it deserves a dashboard banner or onboarding step.
2. **Self-declared facts.** "I am not a manufacturer of barred goods" and "all my PAN's registrations are opting in" are ticks. Nobody verifies them.
3. **GSTIN is checked only for typos**, not with the government. The screen itself says so.
4. **Limit tables are provisional** (corrections 2 and 3).
5. **No protection for unregistered sellers crossing the registration limit.** There is no warning and no block, so a seller can pass the limit without the system ever noticing. Only the composition cap is actually enforced (at opt-in and when an invoice is issued). The registration threshold exists, but nothing calls it.
6. **Unsupported registration types** (casual, non-resident, SEZ, ISD, TDS/TCS).
7. **The invoice-logo switch** doesn't do anything yet: the current PDF layout doesn't print a logo.
8. **For testing:** the pincode directory and the HSN catalogue are not properly loaded yet (the log says the pincode file isn't in the repo, and the catalogue is a dev sample). Until they are, a lot of checkout flows can't work. Put this at the top of your testing prep.

MY VIEWS BELOW:

- i will add onboarding wizard and setup UI for tax once i test tax system, find bug or enhancements and implementing and fixing them and once i pass green flag for this complete system, so this is something i will do at last.
- for MVP, i am going to leave “I am not a manufacturer of barred goods” and “all my PAN’s registrations are opting in” ticks as it is and will find the way to verify them after launch.
- GSTIN check i will add after launch, either it wont be a part of MVP or if i decide, i will implement at last.
- Limit tables are correct acc to the research and latest info on gst with reliable source. As i said i havent seen a single line code or read the md docs that i gave you, everything i am understanding by this chat, by your responses. So im not sure if the limits and their states and union territories are implemented or Shoppulse it neglecting the state and directly seeing the limit.
- "No protection for unregistered sellers crossing the registration limit. There is no warning and no block, so a seller can pass the limit without the system ever noticing." i didnt know that, i want you to flag things like these with whatever info you have and you get accordingly. After completing my learning and understandings we will see this and implement solution for this for sure. 
- Unsupported registration types (casual, non-resident, SEZ, ISD, TDS/TCS). — mvp ke liye jitna hai utna kaafi hai filhaal ke liye.
- The invoice-logo switch doesn’t do anything yet: the current PDF layout doesn’t print a logo. — abhi pdf bani nahi hai, jab iska template banayenge tab dekhenge.
- For testing: the pincode directory and the HSN catalogue are not properly loaded yet (the log says the pincode file isn’t in the repo, and the catalogue is a dev sample). Until they are, a lot of checkout flows can’t work. Put this at the top of your testing prep. — testing ke baad i will research on how to implement state pincode thing and hsn in the app. 





Invoice emails go out through the seller’s own email integration. If a seller never connected one, the invoice’s email status will say “skipped, no provider”. The customer isn’t emailed, but the invoice is still downloadable from the order page. Part 4 covers this. — ONBOARDING KE TIME PAR DIKHNA PADEGA INTEGRATIONS CONNECT KE TIME PE KI NAA KARNE SE KYA KYA HOGA.




Variable shipping is calculated for a default 0.5 kg parcel, not the cart’s real weight. This isn’t a tax bug. It’s an existing money gap that the plan explicitly left out of scope. The shipping amount that gets taxed may not match the real courier cost.


Keep this on its own sheet of paper. Decide on these after testing.

Still open from Part 2

Unregistered seller can pass the registration limit with no warning and no block.
No warning before the composition cap is crossed.
“Outside ShopPulse sales” says it drives warnings, but it only feeds the composition-lapse check.
Buyers see a generic “Delivery not available” for both “seller hasn’t set up tax” and “out-of-State”.
Unregistered home-State-only is a system choice (CA).




Open flags: unregistered limit warning, composition pre-cliff warning, “outside sales” label, generic “Delivery not available”, catalogue + pincode data, COD fee tax view, ₹2,500 basis, 0.5 kg shipping weight, no exclusive pricing, coupons, seller typing errors, readiness banner, B2B State mismatch.
Parked: attestation ticks, GSTIN check, special registration types, logo, data research, onboarding.











## B. The price gap

**The rule.** GST on clothes and footwear depends on the price of **one piece before GST**:
- **Up to ₹2,500 → 5%.**
- **Above ₹2,500 → 18%.**

The test is on the price **before** GST, not on MRP. Public tax commentary says the same: the comparison is made on the pre-GST sale value, and a discount shown on the invoice at the time of sale lowers the value that counts. An example from that commentary: a ₹3,000 tag with a ₹600 discount gives ₹2,400, so 5%. That is an accountancy site, not the government, so treat it as expert opinion.

**Now look at what the customer pays** (price before GST + GST on top):

| Price before GST | GST | Customer pays |
|---|---|---|
| ₹2,000.00 | 5% = ₹100.00 | ₹2,100.00 |
| ₹2,500.00 | 5% = ₹125.00 | ₹2,625.00 |
| **₹2,500.01** | **18% = ₹450.00** | **₹2,950.01** |
| ₹3,000.00 | 18% = ₹540.00 | ₹3,540.00 |

**One paisa more before GST makes the customer pay ₹325.01 more.** So if you only ever build a price as "price before GST + GST", **no customer can ever pay an amount between ₹2,625.01 and ₹2,950.00.** Those sticker prices cannot arise from any legal pre-GST price.

**Why ShopPulse runs into it.** The seller types the **sticker price (GST included)**, so he can type ₹2,800, a number the law can't produce. Try it:
- If the system says "5%", the pre-GST price is ₹2,666.67. That's above ₹2,500, so 5% was wrong.
- If the system says "18%", the pre-GST price is ₹2,372.88. That's below ₹2,500, so 18% was wrong.

Either answer contradicts the rule, so the system **refuses** instead of inventing a rate. The product form shows:

> *"[price]: This price can't be taxed consistently: at [low rate] its taxable value is above ₹[threshold] per piece, and at [high rate] it is below. Set ≤ ₹[maximum] ([low rate]) or ≥ ₹[minimum] ([high rate])."*

The server repeats the check when saving (error `TAX_NOT_SELLABLE`).

**What the seller must do.** Pick a sticker price **outside** the gap. A seller who wanted ₹2,800 chooses between:
- **₹2,625 (5%).** He earns ₹175 less.
- **₹2,951 (18%).** The customer pays ₹151 more.

MRP doesn't matter here. A product with MRP ₹3,499 and selling price ₹2,800 is still in the gap, because tax follows the selling price.

**How the industry handles it.** I found nothing public that shows how Myntra, Ajio, Amazon or Snitch handle the in-between band inside their systems. I found nothing about Ajio's or Snitch's invoices at all. What is public is how brands react to the cliff with pricing:
- Select brands redesigned products to land just **below ₹2,500**. Shoppers in the ₹2,500–3,500 range, called the "squeeze zone", were trading down to stay in the 5% slab.
- Other brands absorbed part of the 18% hike instead of raising prices.

So the real world avoids the cliff by choosing price points. ShopPulse does the same thing, but enforces it in software. A tag of ₹2,499 is also well under the real boundary of ₹2,625. That's my inference, not something I found stated.

**Your options.** This is a product decision, and the first is the default today:
1. **Keep the block.** Safe, and it's what the code does now.
2. **Keep the block, but add one-click buttons** ("Use ₹2,625" and "Use ₹2,951") on the error. Same safety, much friendlier. This is my recommendation.
3. **Let sellers enter the pre-GST price** for these products. This needs the exclusive-pricing screen that doesn't exist yet.
4. **Quietly charge 18% inside the gap.** This is the simplest for the seller, but the rate then fails the law's own test. It's a legal-risk call, and one for your CA.

**Notes to write (Section 5, replaces the earlier notes)**
- Clothes and footwear: price per piece **before GST** ≤ ₹2,500 → 5%, above → 18%. Test is on the transaction value (selling price), not MRP.
- Pre-GST ₹2,500.00 → customer pays ₹2,625.00. Pre-GST ₹2,500.01 → customer pays ₹2,950.01.
- Stickers from ₹2,625.01 to ₹2,950.00 cannot come from any legal pre-GST price. This is the gap.
- ShopPulse takes sticker prices, so a seller can type a gap price. At ₹2,800 both rates fail the rule, so the system blocks it.
- Fix: price ≤ ₹2,625 or ≥ ₹2,950.01.
- Industry: no public detail for Myntra/Ajio/Amazon/Snitch internals. Brands avoid the cliff with price points like ₹2,499.
- Options: keep the block / add one-click price buttons (recommended) / pre-GST entry / auto-18% (legal risk).











## E. What your codebase audit corrected in Part 3

I read the whole audit against what I told you. Here is what differs, and what is new.

**Corrections to what I said:**
1. **Dead-zone message.** The real text is the longer one shown in Part B above, not the short version I gave earlier.
2. **A bad token.** A missing, damaged, tampered or other-store token gives `QUOTE_TOKEN_REQUIRED`. `QUOTE_CHANGED` appears only when a valid token has expired or the saved quote no longer matches.
3. **Unknown HSN.** An HSN that isn't in a live rate book blocks the product even with a manual rate (see Part A).
4. **Manual rates.** Manual rates can only be 3%, 5%, 18% or 40%. There is no 0%, so the special 0.25% rough-diamond rate can't be entered by hand.
5. **Shipping weight.** The audit did not re-check the "0.5 kg default weight" point. It comes from the earlier code map. Treat it as likely, not proven.

**New flags the audit found:**
1. **A leftover ₹499 / ₹49 rule in the storefront cart.** The mobile sticky total uses a hard-coded rule of ₹499 free shipping, otherwise ₹49. The page also says "Free Shipping over ₹499". This has nothing to do with the seller's real shipping settings. **Test this early.** It can show customers wrong totals.
2. **Local fallback totals.** The cart and checkout summaries add goods and shipping themselves when no quote is available. They use the quote when one exists. Check which numbers a customer can see before the quote arrives.
3. **Outdated ₹1,000 prefilled in the form.** When a seller ticks "The rate is higher above a price per piece", the threshold box starts at **₹1,000**. That's the old pre-September-2025 limit. It should be ₹2,500 for clothes now.
4. **The dev rate book still has a 12% entry.** 12% no longer exists. It's an unchecked entry, so it won't auto-fill, but don't publish that file.
5. **Old test notes.** Your WearItWell notes mention the older ₹1,000 apparel limit. Update your test expectations before using them.
6. **Test-order scripts.** One test-order script hard-codes 18% tax, another uses zero tax. Don't use their numbers to judge the real checkout.

The flags I gave you earlier still stand, and the COD fee tax view is now flagged for your CA.
