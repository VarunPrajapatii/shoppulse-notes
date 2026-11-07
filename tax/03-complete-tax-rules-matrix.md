# 03 Complete tax rules matrix (Stage 3, 2026-10-31)

Tables only. Tags as in 04 (`LAW`, `LAW*`, `CODE`, `REC-H/M/L`, `CA`, `3P`). D-ids refer to 04. A `LAW` tag covers only the proposition the L-row's P-grade text supports; anything beyond it is REC or CA (S4 review R-013). Revised after the S4 review.
Abbreviations: REG = REGULAR, COMP = COMPOSITION, UNREG = UNREGISTERED, BoS = Bill of Supply, CN = credit note, POS = place of supply, inc = tax-inclusive.

## 1. Seller regime capabilities
| Capability | UNREG | REG | COMP | Tag |
|---|---|---|---|---|
| GSTIN | none | required | required | LAW L-021 |
| Ship-to States | home State only | all India (optional home-only) | home State only | UNREG: LAW L-021 for taxable inter-State supply, blanket rule = REC-H policy (D-04); COMP: LAW* L-029 + CA |
| Collects GST from buyer | no | yes | no (never) | LAW* L-013 (s.10(4)), L-032 |
| Sale document | Commercial "Invoice" (not a GST document) | Tax invoice / BoS / invoice-cum-BoS (§5) | BoS with legend | LAW L-013; UNREG title: CA |
| Price label on storefront | price only; "MRP (incl. of all taxes)" when MRP shown | "Inclusive of all taxes" + GST amount at checkout | as UNREG | REC-M; CA (label wording) |
| Credit note | `COMMERCIAL_CREDIT_NOTE` | `GST_CREDIT_NOTE` (s.34) while the original registration is in force | `COMMERCIAL_CREDIT_NOTE` | LAW L-011; CA (non-tax-invoice CN) |
| B2B invoice option | no | yes if enabled and the FY declaration has `aatoEverAbove5Cr = false` | no | L-016 (threshold P, "any FY" wording S → CA); REC-H |
| Product HSN required | no (optional) | yes, min digits per §8 | yes (4 digits) | LAW L-014; COMP: CA |
| Product rate required | no | yes (catalogue or manual) | yes (so an automatic lapse to REG is seamless, D-28) | REC-H |
| Reports | sales summary | GSTR-1-ready exports | quarterly turnover + estimated composition tax | REC-M; CA (layout) |

## 2. Supply type and tax components (REG only; others → NONE)
| Seller State vs POS | Seller State kind (State master flag) | Components | Tag |
|---|---|---|---|
| same | State, or UT with legislature (Delhi 07, Puducherry 34, J&K 01) | CGST + SGST (equal halves of rate) | CA (CGST/SGST Acts not in 01) |
| same | UT without legislature (04, 26, 31, 35, 38) | CGST + UTGST | CA (UTGST Act not in 01; verify list from official State master) |
| different | any | IGST (full rate) | CA (IGST Act s.5/s.7 not in 01) |
| POS unresolved | any | **reject** (422) | CODE B-11; REC-H |
| UNREG/COMP, different | any | **blocked at pincode check/quote/checkout/dispatch/pickup** | LAW L-021 (taxable supply); D-04 policy; LAW* L-029 |

## 3. Goods line taxability
| Taxability | Rate used | REG document line | COMP | UNREG | Tag |
|---|---|---|---|---|---|
| TAXABLE | catalogue/manual rate (0 not allowed) | taxed line on the tax invoice (MAIN member) | no tax | no tax | REC-H |
| NIL_RATED (0% by schedule) | 0 | line on the BoS (BOS member of a split set) | no tax | no tax | LAW L-013; CA |
| EXEMPT (exemption notification) | 0 | as NIL_RATED | no tax | no tax | LAW L-013 |
| NON_GST (outside GST) | 0 | as NIL_RATED, labelled "Non-GST supply" | no tax | no tax | CA |
| ZERO_RATED (export/SEZ) | n/a | **not supported in MVP** (B2B form copy: "Not for SEZ units") | n/a | n/a | REC-H; CA |

## 4. Charges (customer-facing vs seller cost)
| Charge | Customer-facing? | In value of supply? | Treatment | REG rate | Inc/exc | Checkout display | Order record | Document display | Tag |
|---|---|---|---|---|---|---|---|---|---|
| Goods (selling price) | yes | yes | principal supply | product rate (threshold rule) | inc | line × qty | OrderItem quote snapshot | goods line: HSN, UQC, qty, unit price, taxable, components | LAW L-008 |
| Fixed shipping | yes | yes | composite with goods; allocated (D-11) | rate of each goods line it is allocated to | inc | "Shipping" row (incl. GST) | `OrderCharge(SHIPPING)` + allocation JSON; `Order.shippingCost` | charge line(s) per goods line, "Shipping (part of supply of goods)" | LAW* L-001, L-004; L-005 → CA |
| Variable shipping (courier-estimate ladder, 02 #18) | yes | yes | same as fixed | same | inc | same | same | same | as above; B-22 (0.5 kg default) out of scope, D-50 |
| COD fee | yes (COD only) | yes | composite with goods; allocated | same | inc | "COD fee" row before pay | `OrderCharge(COD_FEE)`; `Order.codCharge` | charge line(s) "Cash-on-delivery fee" | LAW* L-001; CA |
| Free shipping / no COD fee | n/a | 0 | no charge row | none | — | "Free" | no OrderCharge row | none | REC-H |
| Courier freight billed to seller | no | no | seller's input cost | n/a | — | never | `Shipment.shippingCharge` | never | L-006 (S); REC-H |
| Courier COD charge billed to seller | no | no | seller cost | n/a | — | never | `Shipment.codCharge` | never | REC-H |
| Shipping insurance | no in MVP | — | seller cost | n/a | — | never | `Shipment.insuranceCharge` | never | REC-H |
| Payment-gateway fee | no | no | seller cost | n/a | — | never | not stored | never | REC-H |
| Convenience/handling fee to buyer | not offered in MVP | would be yes | would be composite | — | — | — | — | — | LAW* L-001; REC-H |
| Packing / gift wrap (future) | future | yes | composite with goods | allocated | inc | own row | `OrderCharge(OTHER)` | charge line | LAW* L-001 |
| Discount / coupon (future) | future | reduces value if on invoice at supply | line-level discount before engine; coupon on shipping reduces the charge | — | inc | "Discount" row | line `discountPaise` | discount column per line | LAW* L-002; L-003 (S) |
| Restocking fee (return) | deducted from refund | stays inside original supply | correction only for refunded value | — | — | shown in refund breakdown | RefundLeg amount | CN value excludes it | REC-M; CA |
| Reverse-shipping fee (return) | deducted from refund | stays inside original supply | correction only for refunded value | — | — | shown in refund breakdown | `ReturnRequest.reverseShippingFeeInr` | CN value excludes it | REC-M; CA (alternative: separate taxable service) |
| Return fee paid separately at submission (pay-at-submit) | yes | open question | not documented in MVP | — | — | shown before pay | ReturnRequest | none | CA (separate supply → invoice, or debit note?) |
| Exchange price difference | paid or refunded | part of the new supply / credit | replacement sale set − correction | rates of the new / returned lines | inc | difference row | ExchangeDetail (+ `replacementSnapshot`) | on the replacement document and the CN | REC-M; CA |

Allocation method (snapshotted per order): `PROPORTIONAL_TO_VALUE` (default, largest-remainder paise) or `HIGHEST_RATE_LINE`. A single-rate cart gives the same result either way. L-005: no official guidance → CA picks the default.

## 5. Document type decision (`decideDocumentType`)
| Regime | Lines on the document | Buyer | Type | Series kind | Title | Legend | Tag |
|---|---|---|---|---|---|---|---|
| UNREG | any | any | COMMERCIAL_INVOICE | S | "Invoice" | "Supplier not registered under GST. No GST charged." | CA |
| COMP | any | any | BILL_OF_SUPPLY | B | "Bill of Supply" | "composition taxable person, not eligible to collect tax on supplies" | LAW L-013; LAW* L-012 (Rule 5(1)(f)) |
| REG | all TAXABLE | B2C/B2B | TAX_INVOICE | I | "Tax Invoice" | none | LAW L-008 |
| REG | none TAXABLE | B2C/B2B | BILL_OF_SUPPLY | B | "Bill of Supply" | none | LAW L-013 |
| REG | mixed | B2C/B2B | **sale set of two** (default `SPLIT_DOCUMENTS`): TAX_INVOICE (MAIN) + BILL_OF_SUPPLY (BOS); `INVOICE_CUM_BILL_OF_SUPPLY` hidden until a CA confirms Rule 46A scope | I + B | as per member | none | LAW L-008, L-013; Rule 46A (U) → CA |
| any | correction down | — | CREDIT_NOTE (`noteNature` GST or COMMERCIAL), one per original document touched; identity and prefix of the original | C | "Credit Note" | original no./date | LAW L-011; Rule 53 (U) → CA |
| REG | correction up (future) | — | DEBIT_NOTE | D | "Debit Note" | original no./date | CA |
| — | advance / refund of advance | — | RECEIPT_VOUCHER / REFUND_VOUCHER (reserved; issued only if the CA says the invoice does not satisfy s.31(3)(d)) | R / V | — | — | LAW L-010; D-38; CA |

## 6. Lifecycle events → document action
| Event | PREPAID | COD | Tag |
|---|---|---|---|
| Order placed | quote snapshot only | quote snapshot only | REC-H |
| Payment settled (webhook or verify, whichever wins) | settlement commits PAID; **sale set issued right after in its own transaction**; failure → FAILED + reconcile retry (money never rolled back) | — | LAW L-010; CODE B-03; D-16 |
| Dispatch commit (auto, manual, batch, self-ship) | sale set must be ISSUED under the active registration (else D-45) | **issue sale set before the first courier call** | LAW L-010; D-16, D-44 |
| Consignment value > ₹50,000 | pickup blocked until a valid EWB record exists | same | L-019 (explainer) → CA; D-26 |
| Cancel before sale set | prepaid with FAILED sale set: refund only, no document | no document; order cancelled | REC-H |
| Cancel after sale set, before dispatch | `TaxCorrection(CANCELLATION)` + refund leg (refused while a booking claim is active) | same, no refund | LAW L-011; D-22, D-44 |
| Courier booking failed permanently | sale set stands; retry or cancel (then correction) | same | REC-M |
| Delivered | mark delivered | collection by courier recorded (`isPaid`, `codCollectedAt`; not remittance), "payment received" mail with document link | D-50; REC-H |
| RTO delivered back to seller | `TaxCorrection(RTO)` for remaining balances + refund | same, no refund | LAW L-011 |
| Return inspection decides a refund | `TaxCorrection(RETURN)` for refunded value; refund legs (any rail, retries) link to it | same (refund via manual UTR) | LAW L-011; D-22 |
| Exchange | returned leg: `TaxCorrection(EXCHANGE_RETURN)`; replacement sale set at the earlier of difference payment or replacement dispatch | same | D-23; CA |
| Address State change requested after sale set | blocked (support path: correction + new order) | allowed until dispatch commit if the new State passes the ship-to rule | REC-H |
| Rate or regime change between order and issue | regime and catalogue rate on the issue date, gross unchanged; seller may **Issue invoice now** before the change | same | D-17; CA (s.14) |
| Registration changed after the sale set, before removal | dispatch blocked; re-issue (correction + new set) or cancel | same | D-45; CA |
| Removed without a sale set (should not happen) | exception for seller and CA; never auto-issued | same | D-47 |
| Seller deletes or edits a product after sale | no effect (snapshots) | no effect | I-2 |

## 7. Mandatory document content
| Field | Tax invoice | BoS | Invoice-cum-BoS | Commercial (UNREG) | CN | Tag |
|---|---|---|---|---|---|---|
| Supplier legal name, address, GSTIN | ✓ | ✓ | ✓ | name + address (no GSTIN) | ✓ | LAW L-008, L-012 |
| Title + legend (§5) | ✓ | ✓ | ✓ | ✓ | ✓ | LAW* L-012 |
| Number ≤16 chars `[A-Z0-9-]`, unique per FY | ✓ | ✓ | ✓ | ✓ (same format) | ✓ | LAW L-008; CN: CA |
| Issue date (IST) | ✓ | ✓ | ✓ | ✓ | ✓ | LAW L-008 |
| Recipient name + billing address | ✓ (always) | ✓ | ✓ | ✓ | ✓ | LAW L-008 (≥ ₹50,000 rule; we always print) |
| Recipient GSTIN (B2B) | ✓ | ✓ if given | ✓ | — | ✓ | LAW L-008 |
| Delivery address with State name + code | ✓ | ✓ | ✓ | ✓ | — | LAW L-008 |
| POS State name + code | ✓ (printed always, required inter-State) | — | ✓ | — | ✓ | LAW L-008; CODE B-36 |
| HSN (digits per §8) | ✓ | ✓ | ✓ | optional | ✓ | LAW L-014; BoS: CA |
| Description, qty, UQC | ✓ | ✓ | ✓ | ✓ | ✓ | LAW L-008; CODE B-25 |
| Unit price, discount, taxable value | ✓ | value | ✓ | value | ✓ | LAW L-008 (k) |
| Rate + CGST/SGST(UTGST)/IGST/cess amounts | ✓ | — | taxable part | — | ✓ (GST credit note only) | LAW L-008 |
| Charge lines (shipping, COD fee) | ✓ | ✓ (value) | ✓ | ✓ (value) | if credited | LAW* L-001; CODE B-08 |
| Totals: taxable, each tax, grand total (= amount charged) | ✓ | ✓ | ✓ | ✓ | ✓ | LAW L-035 (no hidden amount); REC-H |
| Reverse charge: "No" | ✓ | — | ✓ | — | ✓ | LAW L-008 (p) |
| Original document no. + date | — | — | — | — | ✓ | CA (Rule 53 U) |
| Signature | "Electronically generated, no signature required" text | same | same | same | same | LAW L-008 (q); CA (wording) |
| IRN + QR | only once e-invoice is live (future) | — | — | — | future | LAW L-016 |

## 8. Value and turnover thresholds
| Threshold | Value | System behaviour | Tag |
|---|---|---|---|
| HSN digits on document | previous-FY AATO ≤ ₹5 cr → 4; > ₹5 cr → 6 (from the declaration of the document's FY, D-48) | print `hsn.slice(0, digits)`; entry minimum = digits | LAW L-014 |
| e-invoice | AATO > ₹5 cr in any FY since 2017-18 (`aatoEverAbove5Cr`) | B2B checkout off; B2C unaffected | L-016 (threshold P; "any FY" wording S) → CA |
| e-way bill | consignment = Σ grand totals of the sale-set members in the shipment > ₹50,000 | valid EWB record required before pickup; per-State intra-State override in the State master | L-019 (explainer) → CA (value basis, State limits, unregistered consignor) |
| Unregistered-recipient detail | ≥ ₹50,000 | always printed anyway | LAW L-008 |
| Invoice optional below ₹200 | < ₹200 | ignored: we always issue | LAW L-013 |
| Registration threshold (UNREG monitor) | ₹40 L goods / ₹20 L / ₹10 L by State class | warn at 75/90% | LAW L-024 |
| Composition cap | ₹1.5 cr / ₹75 L (listed States) | eligibility gate (PAN-wide previous-FY amount) + 75/90% warnings + **automatic lapse at issue** when exceeded | s.10(3) (opened by S4); LAW* L-029 |
| Apparel per-piece rate threshold | ₹2,500 (5% → 18%) | rule data, §11 | L-037 P ("5% up to ₹2,500") only; rest CA |
| CN declaration window | 30 Nov after the original FY (or the annual-return date, if earlier and entered) | stored as `declarationDeadline`; warnings from 1 Oct; CDN export lists it | LAW L-011 |
| Dynamic QR on B2C | AATO > ₹500 cr | not applicable | LAW L-018 |

## 9. Regime transitions (seller wizard; one row per allowed change)
Date rules (authoritative, same as 04 §4): UNREG→REG any past date; forced composition exit = breach date (automatic at issue, D-28); cancellation up to 30 days past or future; voluntary composition exit up to 7 days past; REG→COMP 1 April only; all others today or future (≤ 90 days). For every restrictive change, orders whose sale set was issued under the old registration but not yet removed are blocked at dispatch after the date and need re-issue or cancel (D-45).

| From → To | Seller provides | Effective date rule | System pre-checks | At effective date | Pending orders | Seller is told (checklist) | Tag |
|---|---|---|---|---|---|---|---|
| UNREG → REG | GSTIN, legal name, PAN (derived), date on certificate, FY declaration | any date; past allowed | GSTIN valid, State = home State, prefix kept (new one only if it was used with another GSTIN), products tax-ready count shown | tax invoices from that date; non-ready products unbuyable | COD not yet dispatched → invoiced as REG at dispatch; already-issued commercial sets → re-issue (D-45) | "Commercial invoices issued after your registration date may need revised invoices; ask your CA" (list shown) | LAW L-021; CA (revised invoices) |
| UNREG → COMP | as above + composition opt-in + attestations | registration date | PAN-wide previous-FY amount ≤ cap of the State class; attestations; same-PAN stores (PAN lock); products tax-ready | BoS from that date | as above (BoS) | composition forms checklist | s.10(2) (opened by S4); LAW* L-029, L-033; CA |
| REG → COMP | confirmation of CMP-02 filing + attestations | **1 April only** (next FY) | as above; B2B off; switch to home-State-only | BoS, no tax on storefront | inter-State orders: dispatch before 1 Apr or cancel (list + block); others with REG sets → re-issue | CMP-02 before FY start; ITC-03 within 60 days | LAW* L-033; CA |
| COMP → REG (voluntary) | date of CMP-04 / effective date | any date (not before today − 7 days) | GSTIN unchanged | tax invoices; non-ready products unbuyable | COD not dispatched → invoiced as REG | CMP-04; ITC-01 within 30 days | LAW* L-033; CA |
| COMP → REG (forced, cap breach) | nothing (automatic); seller may later enter an earlier breach date from late-declared outside turnover | the breach day | detected at sale-set issue under the store advisory lock (D-28) | as above | as above | CMP-04 within 7 days; same-day and post-breach BoS listed for the CA | s.10(3) (opened by S4); LAW* L-033; CA |
| REG/COMP → UNREG | cancellation effective date (REG-19 / approved REG-16) | that date (past ≤ 30 days, or future) | lists pending inter-State orders | commercial invoices; home-State only | inter-State orders must be dispatched before the date or cancelled | final return + tax on stock: ask CA; "lower turnover alone does not cancel GST" | CA (s.29, GSTR-10 not in 01) |
| REG → REG (new GSTIN: PAN change, constitution change, partner exit, business PAN → personal PAN, State move) | new GSTIN + date; old GSTIN end date | new period from the date | new prefix + new series; State move = new home State + pickup address check | documents carry the new supplier | COD not dispatched → new GSTIN | old GSTIN cancellation/transfer is the seller's process | REC-M; CA (s.29 transfer) |
| UNREG → UNREG (PAN change) | new PAN | new row (`IDENTITY_CHANGE`), today or future | — | new snapshot on new documents | — | — | REC-H |
| Any (legal name spelling, trade name, address edit) | new value | in place | — | new snapshot on new documents | — | — | REC-H |
| Scheduled change cancelled | — | row deleted before its date | no documents reference it | — | — | — | REC-H |
| "Hobby" seller (registered) | — | no status change without cancellation | — | — | — | "Registered sellers keep charging GST until cancellation" | CA |

## 10. Rate resolution (`resolveRate(classification, date)`; classification = product at quote, frozen OrderItem copy at issue)
| rateMode | Catalogue rule for HSN on date | Result | Product state | Tag |
|---|---|---|---|---|
| CATALOGUE | OFFICIAL_LOAD or CA_VERIFIED rule (longest HSN prefix) | rule rate (+ threshold) | tax-ready | LAW-data L-039 → CA |
| CATALOGUE | only an UNVERIFIED rule | not usable | not tax-ready ("pick rate manually") | REC-H |
| CATALOGUE | none | not usable | not tax-ready | REC-H |
| MANUAL | any | seller rate (+ optional threshold) | tax-ready; `taxReviewRequired` if a verified rule now differs (warning, not a block) | REC-M |
| any | taxability EXEMPT / NIL_RATED / NON_GST | 0 | tax-ready if HSN present | LAW L-013 |
| COMP seller | rule flagged `compositionManufacturerBar` | normal rate | informational warning only; eligibility rests on the seller's attestation (not a manufacturer of notified goods) | s.10(2)(e) (opened by S4); CA (notified list) |

## 11. Per-piece threshold rule (5% ≤ ₹2,500 < 18%; `piecesPerUnit` = 1 unless set)
| Mode | Gross per piece | Taxable at low | Outcome | Tag |
|---|---|---|---|---|
| inc | ₹2,000.00 | 1,904.76 | 5% | L-037 P |
| inc | ₹2,625.00 | 2,500.00 | 5% (≤ threshold) | CA ("up to" read as ≤) |
| inc | ₹2,625.01 – ₹2,950.00 | > 2,500 at 5%, ≤ 2,500 at 18% | **not sellable** (`TAX_NOT_SELLABLE`; product form rejects the price) | D-10; CA |
| inc | ₹2,950.01 | 2,500.01 at 18% | 18% | L-037 S (18%) → CA |
| exc | ₹2,500.00 | 2,500.00 | 5% | L-037 P |
| exc | ₹2,500.01 | 2,500.01 | 18% | L-037 S → CA |
| inc, pack of 2 (`piecesPerUnit=2`) | ₹4,000 unit → ₹2,000/piece | 1,904.76 | 5% | CA (per piece) |
| inc, future 10% discount on ₹2,800 | ₹2,520 | 2,400.00 | 5% (after discount) | LAW* L-002; CA |

## 12. Credit scope (every row = one `TaxCorrection` created by the business event, D-22)
| Scenario | Authorising event | Goods lines credited | Charge lines credited | Value basis | Tag |
|---|---|---|---|---|---|
| Cancel after sale set, before dispatch | cancellation confirmed | all remaining | all remaining | full remaining | LAW L-011 |
| RTO | RTO received by seller | all remaining | all remaining | full remaining | LAW L-011 |
| Return, full refund of item | inspection decision | returned units | refunded shipping/COD allocation (store refund policy) | refunded gross | D-22 |
| Return with restocking / reverse-shipping deduction | inspection decision | returned units | as refunded | refunded gross only (deduction stays in the supply) | REC-M; CA |
| Exchange (returned leg) | inspection decision | returned units | none unless refunded | value of the returned item | D-23; CA |
| Re-issue after a registration change | seller re-issue action | all remaining | all remaining | full remaining (new set issued right after) | D-45; CA |
| Goodwill partial refund (future) | seller action | pro-rata on the chosen line | — | refunded gross | LAW* L-002/L-003 |
| After the declaration deadline | any of the above | same | same | same; note shows the deadline passed, warning to seller | LAW L-011; CA |
| Original under a cancelled or replaced registration, or a non-GST original | any | same | same | `COMMERCIAL_CREDIT_NOTE` under the original identity | D-22; CA |
| COD order cancelled before dispatch | — | none (no document) | — | — | REC-H |

## 13. Buyer-facing display
| Surface | REG B2C | REG B2B | COMP | UNREG | Tag |
|---|---|---|---|---|---|
| Product page | price + "Inclusive of all taxes"; MRP struck | same | price; "MRP (incl. of all taxes)" if MRP shown | same as COMP | REC-M; CA |
| Pincode check | serviceable / COD fee / shipping | same | "Ships only within {State}" when out of State | same as COMP | LAW L-021; D-04 |
| Cart | items, shipping, COD fee (if picked), total, "Includes GST ₹x" | same + "GST invoice for {GSTIN}" | no GST row | no GST row | LAW L-035 |
| Checkout (before pay) | full breakdown from the quote; total = charged | + CGST/SGST/IGST split; B2B blocked if GSTIN State ≠ ship-to | no GST row | no GST row | LAW L-035; D-13 |
| Order page | documents list (invoice, CNs) + per-line GST | same | BoS + CNs | invoice + CNs | REC-H |
| Email | sale document link + PDF attachment | same | same | same | REC-H |

## 14. Seller inputs
### 14a. Onboarding (tax step; cannot be skipped except for the GST fields)
| Field | Type / default | Validation | Tooltip copy | Tag |
|---|---|---|---|---|
| Business type | select: Individual/Proprietor, Partnership, LLP, Pvt Ltd, Public Ltd, OPC, HUF, Trust/Society, Other | required | "How your business is legally set up. Being an individual is different from not having GST." | REC-H |
| Home State | select (State master) | required | "The State you ship from. On ShopPulse, sellers without GST and composition sellers deliver only inside this State." | LAW L-021; D-04 |
| GST status | Not registered (default) / Regular / Composition | required | "Pick what your GST certificate says. Not sure? Choose Not registered and update later." | REC-H |
| GSTIN | 15 chars | format + checksum; chars 1-2 = Home State; chars 3-12 = PAN | "Your 15-character GST number. We check it for typing mistakes, not with the government yet." | REC-H; 3P (live check later) |
| Legal name / trade name | text | legal required if registered | "Exactly as on your GST certificate (legal name) / the name customers know (trade name)." | LAW L-008 |
| Registration effective date | date (IST), default today | past allowed (certificate date); a future date makes the store start UNREG with the registration scheduled | "Date printed on your registration certificate." | REC-M |
| Turnover questions (become this FY's declaration, D-48) | "Previous year turnover: up to ₹1.5 cr / ₹1.5–5 cr / above ₹5 cr" (+ exact PAN-wide amount if choosing composition); "Ever above ₹5 cr in a year since 2017-18?" | required if registered; re-asked every 1 April | "Decides HSN digits on invoices, whether e-invoicing applies, and composition eligibility." | LAW L-014; L-016 → CA |
| Principal place of business | address + pincode → State | State must equal Home State | "Printed on every invoice." | LAW L-008 |

### 14b. Settings → Billing & Tax (three cards)
| Card | Fields | Rules | Tag |
|---|---|---|---|
| Store GST registration | current period (read-only), history table, "Change GST status" wizard (§9) | OTP for core changes (existing pattern) | D-01, D-03 |
| Invoice settings | prefix (2-5 `[A-Z0-9]`, editable until the FY's first document), footer, logo, B2B invoices toggle (REG only), charge allocation method (advanced, default proportional), deliver only in home State toggle. Mixed-cart mode stays hidden (split) until a CA confirms Rule 46A | prefix uniqueness checked live | D-18, D-11, D-15 |
| FY declaration | this FY's turnover facts (D-48), annual-return filing date for the previous FY | reminder each 1 April | D-48 |
| ShopPulse billing details | "GST invoice for my ShopPulse subscription" toggle + GSTIN/legal name/address | never touches the store registration | D-01; CODE B-04 |

### 14c. Product form (tax section)
| Field | Default | Validation | Tooltip / warning copy | Tag |
|---|---|---|---|---|
| Selling price (incl. GST) | — | > 0, ≤ MRP | "What the customer pays for one unit, GST included." | D-07, D-08 |
| MRP (incl. all taxes) | = selling price | ≥ selling price | "Maximum retail price printed on the pack." | REC-M |
| "What is this product?" HSN search | — | must exist in HSN master at ≥ tier digits (REG/COMP) | "Search by product name; we suggest the HSN code. You confirm it. When in doubt, ask your CA." | LAW L-014; REC-H |
| Taxability | from the catalogue rule, else Taxable | enum | "Exempt/nil-rated only if a government notification says so." | LAW L-013 |
| GST rate | read-only from the verified catalogue (rateMode CATALOGUE); "Set manually" link → slab select (MANUAL) | MANUAL requires a rate from the active slab list and a confirmation tick | "Rate comes from the official schedule for this HSN on the sale date." | D-09 |
| Price-based rate (threshold) | shown when the rule has a threshold | price per piece in ₹2,625.01–₹2,950.00 is rejected | "This price can't be taxed consistently: at 5% its taxable value is above ₹2,500, and at 18% it is below. Set ≤ ₹2,625 (5%) or ≥ ₹2,950.01 (18%)." | D-10 |
| Pieces per unit | 1 | integer 1-1000 | "Selling a pack? Enter the pieces in it. Some rates depend on the price per piece." | CA |
| Cess | hidden unless the rule has cess | — | — | L-039 |
| Unit (UQC) | catalogue default, else PCS | official UQC list | "Unit printed on the invoice (pieces, pairs, kg…)." | D-40 |
| Preview | — | — | "Customer pays ₹X · GST inside ₹Y · Your taxable value ₹Z" (REG only) | REC-H |
| Readiness chip | — | — | "Ready to sell" / "Missing: HSN, rate" (REG and COMP sellers cannot sell it) | D-27, D-29 |

### 14d. Shipping settings / order management
| Screen | Field / action | Rule | Tag |
|---|---|---|---|
| Pickup address | State (select, stored as code) | must equal the registration State for dispatch | D-05; CA |
| Shipping charge (fixed/variable) | label "incl. GST" | taxed with goods | D-11 |
| COD fee | label "incl. GST" | taxed with goods; shown before pay | D-11; LAW L-035 |
| Order → Documents panel | list, PDF, resend, delivery status | — | D-20, D-21 |
| Order → Ship | disabled reasons: e-way bill missing or expired, pickup State mismatch, out-of-State for UNREG/COMP, registration changed after the sale set (re-issue/cancel), booking in progress | — | D-26, D-04, D-44, D-45 |
| Order → e-way bill | EWB no. (12 digits), date, valid-until; documents, value and pincodes filled by the server | required if > ₹50,000; cleared on rebooking, address change or re-issue | L-019 → CA; D-26 |
| Order → Issue invoice now | pre-issue before a scheduled rate/regime change | only before removal | D-17 |
| Order → COD | "Collected by courier" status from the delivered webhook | collection only, not remittance | D-50 |

## 15. Compliance item classification
| Item | Class | Tag |
|---|---|---|
| Correct document type per regime, ≤16-char numbering, issue before removal, CN on cancel/return/RTO | legally mandatory (MVP) | LAW L-008, L-010, L-011, L-013 |
| Inter-State block for UNREG/COMP | UNREG: LAW for taxable supplies + MVP policy for the rest; COMP: mandatory | LAW L-021; D-04; LAW* L-029 |
| HSN digits by AATO, UQC on lines | legally mandatory (MVP) | LAW L-014, L-008 |
| Show all charges + GST before pay | legally mandatory (MVP) | LAW L-035 |
| E-way bill record + pickup block | treated as mandatory (MVP, manual) | L-019 (explainer) → CA |
| Composition automatic lapse on cap breach | legally mandatory (MVP) | s.10(3) (opened by S4) |
| E-invoice IRN | mandatory only for AATO > ₹5 cr B2B → MVP disables B2B for them; IRP integration = future | LAW L-016 |
| GSTR-1-ready exports, HSN summary, composition quarterly summary | optional premium (seller files) | REC-M |
| Turnover / CN-deadline / composition-date reminders | optional | REC-M |
| Live GSTIN verification, EWB API, Part-A to courier | future integration | 3P |
| Receipt/refund vouchers | not issued (D-38) | CA |
