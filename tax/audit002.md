You are auditing the ShopPulse tax system (ShopPulseAdmin + ShopPulseStore, plus ShopPulseAdmin/dummy-server). 
READ-ONLY: do not edit files, run servers, run builds or scripts, and never print secret values. 
Answer only from code you actually read. Cite file path + function/line for every fact. If something is not found, write "NOT FOUND" — do not guess or infer. 
Output concise markdown tables, no opinions. I will test this manually in the browser with no test scripts, so focus on what is reachable from the UI.

Answer in 3 messages. Send Part A, then wait for me to say "continue".

PART A — UI and settings
1. Every Admin route/page involved in tax: Settings → Billing & Tax, Store GST registration form, Change GST status wizard, Invoice settings (incl. Advanced), FY declaration, ShopPulse billing details, product Tax (GST) section, product tax bulk-fix page, order Billing/Documents tab, shipment E-way bill card. For each: route, every field/label/option, and its validation rules with exact error text.
2. Change GST status wizard: which options appear per current regime, every date rule (90-day future, 7-day and 30-day back, FY-start rules, reference guards), how OTP works (channel, provider, any dev bypass), delete-scheduled-change behaviour.
3. Invoice prefix: derivation algorithm, reserved list, length/charset rules, live-check endpoint, lock rule.
4. Same-PAN composition attestation: exact trigger. Is a GSTIN unique across stores? What happens when two stores share a GSTIN or PAN?
5. Composition cap logic: which turnover counts, when it is evaluated, what triggers "lapse", and what happens to in-flight orders.

PART B — Tax engine, checkout, documents
6. Engine: function signatures; rounding and allocation rules; threshold rule and dead zone; decision table of regime (REG/COMP/UNREG) × taxability × B2B/B2C × intra/inter/UT → document type, series kind, tax components. UT/UTGST handling.
7. Place of supply: pincode→State lookup, multi-State pincode resolution and what the checkout UI shows.
8. Quote token: contents, expiry, validation, every condition that raises QUOTE_CHANGED.
9. Document lifecycle: every trigger of sale-set issuance (webhook, verify route, reconcile cron, COD issue-now, ship), idempotency keys, number allocation (transaction, series key, FY rollover in IST), saleSetKey, mixed-set split, document status state machine, and the PDF field list per document type.
10. Outbox: claim/lease/fencing, retry/backoff, email provider, SKIPPED_NO_PROVIDER, download routes (admin and token-scoped customer) and their authorization checks.

PART C — Corrections, dispatch, jobs, errors
11. Cancellation, return inspection, RTO, exchange: entry routes, the UI control that triggers each, credit computation (original-line bounds, last-unit remainder, restocking fee, COD fee refund), idempotency.
12. Dispatch gates: stale registration, e-way bill (limit by State, validity/expiry handling), pickup State match, FAILED preparation, COD issue-before-booking, booking claim. Shiprocket payload fields for auto/manual/batch/scheduler paths.
13. Every cron route: path, auth header, vercel.json schedule, what it scans, idempotency. Every dummy-server fault-injection toggle: what it simulates, and which (if any) can legitimately produce FAILED prepaid issuance, webhook replay or outbox failure from the browser.
14. Full tax error factory: code, HTTP status, exact message, and for each the exact UI/API path that raises it. State whether a browser-only trigger exists (especially TAX_NOT_READY, PINCODE_STATE_MISMATCH, PLACE_OF_SUPPLY_UNRESOLVED, B2B_NOT_AVAILABLE, PREFIX_UNAVAILABLE, CREDIT_EXCEEDS_BALANCE, BOOKING_IN_PROGRESS, QUOTE_TOKEN_REQUIRED).
15. Prisma models, enums and unique constraints for the tax tables, and the env vars the tax code reads (names only).
16. All TODO/FIXME/HACK comments in tax-related files, every known limitation in notes/tax/_progress.md, and every place where the implementation differs from the roadmap acceptance items.









I’ll audit Part A from the current source, including the product, order and shipment controls, then stop for your confirmation before Part B.

Read , lines 1 to 220
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\audit001.md",
  "view_range": [
    1,
    220
  ]
}

Find files matching `**\*tax*`

Find files matching `**\*eway*`

Search for `Tax \(GST\)|GST details|HSN|[Ee]-?[Ww]ay bill|EwayBill|ewayBill`

Search for `OTP|otp|SMS|EMAIL|bypass|test|DEV|provider|NODE_ENV`

Search for `model StoreTaxRegistration|gstin|@@unique|model DocumentPrefix`

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-tax-compliance.tsx",
  "forceReadLargeFiles": true
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\bulk-fix-tax\\components\\bulk-fix-tax-client.tsx",
  "forceReadLargeFiles": true
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\shipments\\[shipmentId]\\components\\sections\\ewaybill-card.tsx",
  "forceReadLargeFiles": true
}

Read , lines 1 to 240
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\orders\\[orderId]\\components\\sections\\billing-tab.tsx",
  "view_range": [
    1,
    240
  ]
}

Read , lines 240 to 520
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\orders\\[orderId]\\components\\sections\\billing-tab.tsx",
  "view_range": [
    240,
    520
  ]
}

Read , lines 1 to 170
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\otp\\platform-otp-routes.ts",
  "view_range": [
    1,
    170
  ]
}

Read , lines 15 to 80
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\otp\\otp-core.ts",
  "view_range": [
    15,
    80
  ]
}

Read , lines 155 to 300
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\otp\\otp-service.ts",
  "view_range": [
    155,
    300
  ]
}

Read , lines 3160 to 3200
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\prisma\\schema.prisma",
  "view_range": [
    3160,
    3200
  ]
}

Read , lines 1 to 245
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    1,
    245
  ]
}

Read , lines 245 to 470
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    245,
    470
  ]
}

Read , lines 1 to 225
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\shipments\\[shipmentId]\\eway-bill\\route.ts",
  "view_range": [
    1,
    225
  ]
}

Read , lines 1 to 195
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\otp\\dispatchers\\platform-dispatcher.ts",
  "view_range": [
    1,
    195
  ]
}

Read , lines 155 to 300
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-service.ts",
  "view_range": [
    155,
    300
  ]
}

Read , lines 935 to 980
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-service.ts",
  "view_range": [
    935,
    980
  ]
}

Read , lines 25 to 175
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\numbering.ts",
  "view_range": [
    25,
    175
  ]
}

Search for `prefix.*availability|checkPrefixAvailability|prefix/check|prefix-check`

Read , lines 25 to 110
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\bulk-fix-tax\\page.tsx",
  "view_range": [
    25,
    110
  ]
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\geo\\uqc.ts",
  "forceReadLargeFiles": true
}

Read , lines 470 to 680
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\orders\\[orderId]\\components\\sections\\billing-tab.tsx",
  "view_range": [
    470,
    680
  ]
}

Read , lines 28 to 76
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\tax\\settings\\route.ts",
  "view_range": [
    28,
    76
  ]
}

Read , lines 370 to 408
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    370,
    408
  ]
}

Read , lines 525 to 570
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    525,
    570
  ]
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\tax\\registration\\transitions\\route.ts",
  "forceReadLargeFiles": true
}

Read , lines 300 to 405
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\otp\\otp-service.ts",
  "view_range": [
    300,
    405
  ]
}

Search for `[Tt]ax|error|message|issue`

Read , lines 470 to 752
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    470,
    752
  ]
}

Search for `<Tax|ProductTaxCompliance|bulk-fix-tax|Fix tax details|Tax \(GST\)`

Search for `const \[|const REGIME_HINT|label=|placeholder=|Choose|Enter|confirm|Date can|...`

Search for `error|message|toast|requiresOtp|INVALID_PAYLOAD|handleSubmit|validate|placeho...`

Search for `function checkDate|function buildTransition|function checklistFor|[Tt]his cha...`

Search for `samePanWarning|lockPan|attestation|prefixForPeriod|compositionProblems|findFi...`

Search for `regime|stale|sameDay|order|reissue|lapse|issueSaleSet`

Search for `StoreTaxRegistration.*gstin|gstin.*UNIQUE|UNIQUE.*gstin|StoreTaxRegistration....`

Read , lines 300 to 425
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-service.ts",
  "view_range": [
    300,
    425
  ]
}

Read , lines 730 to 855
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-service.ts",
  "view_range": [
    730,
    855
  ]
}

Read , lines 425 to 555
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-service.ts",
  "view_range": [
    425,
    555
  ]
}

Read , lines 1 to 160
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\notifications\\platform\\sms.ts",
  "view_range": [
    1,
    160
  ]
}

Search for `NEXT_PUBLIC.*OTP|DEV_OTP|BYPASS|bypass|testCode|STATIC_OTP|otp ===|code ===`

Search for `async send\(|send:|sendSMS\(`

Read , lines 200 to 265
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    200,
    265
  ]
}

Read , lines 315 to 370
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    315,
    370
  ]
}

Read , lines 625 to 695
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    625,
    695
  ]
}

Read , lines 900 to 930
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-service.ts",
  "view_range": [
    900,
    930
  ]
}

Read , lines 120 to 183
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\billing-tax-form.tsx",
  "view_range": [
    120,
    183
  ]
}

Search for `className|MISSING|TAX_NOT_SELLABLE|error.message|error\?\.message|parseProduc...`

Read , lines 1 to 70
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\page.tsx",
  "view_range": [
    1,
    70
  ]
}

Read , lines 1 to 110
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\registration-history-table.tsx",
  "view_range": [
    1,
    110
  ]
}

Read , lines 30 to 185
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\edit-registration-details-dialog.tsx",
  "view_range": [
    30,
    185
  ]
}

Read , lines 105 to 205
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\registration-setup-form.tsx",
  "view_range": [
    105,
    205
  ]
}

Read , lines 410 to 565
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\registration-setup-form.tsx",
  "view_range": [
    410,
    565
  ]
}

Search for `hsn|tax|formSchema|refineProductTax|FormMessage`

Read , lines 1 to 120
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\billing\\indian-states.ts",
  "view_range": [
    1,
    120
  ]
}

Read , lines 22 to 100
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\geo\\states.ts",
  "view_range": [
    22,
    100
  ]
}

Search for `Tab|Billing|value="billing"|EwayBillCard|ShipmentOverviewTab`

Read , lines 34 to 150
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\declarations.ts",
  "view_range": [
    34,
    150
  ]
}

Read , lines 30 to 110
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\tax-settings-service.ts",
  "view_range": [
    30,
    110
  ]
}

Read , lines 120 to 175
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\invoice-settings-card.tsx",
  "view_range": [
    120,
    175
  ]
}

Search for `<h3|<p className|<FieldBlock|label=|<SelectItem|<Button|toast\.|error|Save de...`

Search for `<FieldBlock|label=|SelectItem|<Button|error|Locked:|Advanced|shipping and COD...`

Search for `type: 'CREDIT_NOTE'|taxableTotal:|credit.*taxable|saleSetKey`

Search for `requireActiveRegistration\(|getActiveRegistration\(|SALE_DOCUMENT_NOT_ISSUED|...`

Search for `EwayBillCard|title:|label:.*Overview|id: 'overview'`

Search for `products/new|products/\$\{.*new|ProductForm|initialData`

Read , lines 410 to 457
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\invoice-settings-card.tsx",
  "view_range": [
    410,
    457
  ]
}

Read , lines 30 to 121
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\billing-tax-form.tsx",
  "view_range": [
    30,
    121
  ]
}

Search for `model DocumentPrefix|prefix\s+String|@@unique`

Read , lines 1 to 45
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\geo\\states.ts",
  "view_range": [
    1,
    45
  ]
}

Read , lines 1 to 130
Completed with input: {
  "path": "C:\\Users\\Varun Prajapati\\.copilot\\session-state\\eaf457f6-4ed1-4e2d-8311-c06c1ead5844\\files\\shoppulse-tax-code-report.md",
  "view_range": [
    1,
    130
  ]
}

Read , lines 1 to 105
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\geo\\uqc.ts",
  "view_range": [
    1,
    105
  ]
}

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\registration-fields.tsx",
  "view_range": [
    1,
    260
  ]
}

"Read" failed
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\registration-wizard.tsx",
  "view_range": [
    120,
    310
  ]
}
Tool execution failed: Path does not exist

Read , lines 115 to 195
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\tax-declaration-card.tsx",
  "view_range": [
    115,
    195
  ]
}

Read , lines 370 to 455
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    370,
    455
  ]
}

Read , lines 43 to 92
Completed with input: {
  "path": "C:\\Users\\Varun Prajapati\\.copilot\\session-state\\eaf457f6-4ed1-4e2d-8311-c06c1ead5844\\files\\shoppulse-tax-code-report.md",
  "view_range": [
    43,
    92
  ]
}

Find files matching `*wizard*.tsx`

Read , lines 160 to 235
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-service.ts",
  "view_range": [
    160,
    235
  ]
}

Read , lines 930 to 1025
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-service.ts",
  "view_range": [
    930,
    1025
  ]
}

Read , lines 455 to 575
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    455,
    575
  ]
}

Read , lines 27 to 120
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-schemas.ts",
  "view_range": [
    27,
    120
  ]
}

Read , lines 79 to 122
Completed with input: {
  "path": "C:\\Users\\Varun Prajapati\\.copilot\\session-state\\eaf457f6-4ed1-4e2d-8311-c06c1ead5844\\files\\shoppulse-tax-code-report.md",
  "view_range": [
    79,
    122
  ]
}

Read , lines 1 to 210
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\change-gst-status-dialog.tsx",
  "view_range": [
    1,
    210
  ]
}

Read , lines 1 to 210
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\transition-fields.tsx",
  "view_range": [
    1,
    210
  ]
}

Read , lines 1 to 205
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\transition-draft.ts",
  "view_range": [
    1,
    205
  ]
}

Read , lines 195 to 395
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\tax-declaration-card.tsx",
  "view_range": [
    195,
    395
  ]
}

Read , lines 1 to 190
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    1,
    190
  ]
}

Read , lines 570 to 625
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    570,
    625
  ]
}

Read , lines 200 to 390
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-tax-compliance.tsx",
  "view_range": [
    200,
    390
  ]
}

Read , lines 1 to 200
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\bulk-fix-tax\\components\\bulk-fix-tax-client.tsx",
  "view_range": [
    1,
    200
  ]
}

Read , lines 30 to 205
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\shipments\\[shipmentId]\\components\\sections\\ewaybill-card.tsx",
  "view_range": [
    30,
    205
  ]
}

Read , lines 30 to 150
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\shipments\\[shipmentId]\\eway-bill\\route.ts",
  "view_range": [
    30,
    150
  ]
}

Read , lines 390 to 640
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-tax-compliance.tsx",
  "view_range": [
    390,
    640
  ]
}

Read , lines 365 to 600
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\bulk-fix-tax\\components\\bulk-fix-tax-client.tsx",
  "view_range": [
    365,
    600
  ]
}

Read , lines 25 to 180
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\numbering.ts",
  "view_range": [
    25,
    180
  ]
}

Read , lines 150 to 205
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\shipments\\[shipmentId]\\eway-bill\\route.ts",
  "view_range": [
    150,
    205
  ]
}

Read , lines 55 to 215
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\components\\security\\otp-action-dialog.tsx",
  "view_range": [
    55,
    215
  ]
}

Read , lines 1 to 110
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\otp\\otp-core.ts",
  "view_range": [
    1,
    110
  ]
}

Search for `StaleRegistrationAtDispatch|STALE_REGISTRATION_AT_DISPATCH|saleDocumentStatus...`

Read , lines 30 to 150
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\orders\\[orderId]\\components\\sections\\billing-tab.tsx",
  "view_range": [
    30,
    150
  ]
}

Read , lines 150 to 310
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\orders\\[orderId]\\components\\sections\\billing-tab.tsx",
  "view_range": [
    150,
    310
  ]
}

Read , lines 593 to 838
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\bulk-fix-tax\\components\\bulk-fix-tax-client.tsx",
  "view_range": [
    593,
    838
  ]
}

Read , lines 555 to 729
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-service.ts",
  "view_range": [
    555,
    729
  ]
}

Read , lines 235 to 290
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-service.ts",
  "view_range": [
    235,
    290
  ]
}

Search for `isSaleSetStale|StaleRegistrationAtDispatch`

Read , lines 960 to 1059
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\corrections\\service.ts",
  "view_range": [
    960,
    1059
  ]
}

Read , lines 35 to 110
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\otp\\platform-otp-routes.ts",
  "view_range": [
    35,
    110
  ]
}

Read , lines 1 to 120
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\otp\\dispatchers\\platform-dispatcher.ts",
  "view_range": [
    1,
    120
  ]
}

Read , lines 165 to 250
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\otp\\otp-service.ts",
  "view_range": [
    165,
    250
  ]
}

Read , lines 175 to 411
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\invoice-settings-card.tsx",
  "view_range": [
    175,
    411
  ]
}

Read , lines 183 to 360
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\billing-tax-form.tsx",
  "view_range": [
    183,
    360
  ]
}

Read , lines 580 to 646
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-tax-compliance.tsx",
  "view_range": [
    580,
    646
  ]
}

Read , lines 20 to 112
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\bulk-fix-tax\\page.tsx",
  "view_range": [
    20,
    112
  ]
}

Read , lines 120 to 300
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-schemas.ts",
  "view_range": [
    120,
    300
  ]
}

Read , lines 270 to 405
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\registration-fields.tsx",
  "view_range": [
    270,
    405
  ]
}

# Part A — UI and settings

This is a **source-only audit**: no browser, database, server, build, or script was run. UI reachability below describes conditions in code, not a completed browser test.

## 1. Admin pages and controls

### Billing & Tax

Route: `/{storeId}/settings/billing-and-tax`. The page has four sections: **Store GST registration**, **Invoice settings**, **Turnover declaration**, and **ShopPulse billing details**. `page.tsx`

| Section | Fields, options and actions | Validation and visible feedback |
|---|---|---|
| **Store GST registration — first setup** | **Business type**: Individual / Proprietor, Partnership, LLP, Private Limited, Public Limited, One Person Company, HUF, Trust / Society, Other. **Home State**. **GST status**: Not registered, Regular GST, Composition scheme. **Legal name**, **Trade name**, **PAN**, and principal-business-address fields below. Registered choices also show **GSTIN** and **Registration date**. Action: **Save GST status**. `registration-setup-form.tsx`, `registration-schemas.ts` | Missing business type: “Choose your business type”; State: “Choose your home State”; name: “Legal name is required”; registration date: “Registration date is required”; date over 90 days ahead: “Date can be at most {formatted date}”. Registered PAN is derived from GSTIN and read-only; unregistered PAN is optional. Invalid PAN: “PAN looks invalid (example: AAAPL1234C)”. First setup does not ask for OTP. `registration-setup-form.tsx`, `registration-helpers.ts` |
| **Principal place of business** | **Address line 1**, **Address line 2**, **City**, **Pincode**, **State**. State is read-only and follows Home State. `registration-fields.tsx` | “Address line 1 is required”; “City is required”; “Pincode must be 6 digits”. Server checks can return “The principal place of business must be in your home State.” or “The pincode of your business address is not in your home State.” `registration-service.ts` |
| **Registered setup: turnover** | **Last financial year's turnover**: Up to ₹1.5 crore; ₹1.5 crore to ₹5 crore; Above ₹5 crore. **Sales outside ShopPulse this year (₹)**. “Has your turnover ever been above ₹5 crore in any year since 2017-18?”: Yes / No. The highest range forces Yes. Composition also asks **Last year's turnover across all businesses on this PAN (₹)**. `registration-setup-form.tsx` | “Choose a turnover range”; “Choose yes or no”; “Enter an amount in rupees (0 if none)”; composition PAN-wide amount: “Enter an amount in rupees”. `registration-setup-form.tsx` |
| **Composition confirmations** | Checkboxes: “Every GST registration on my PAN is opting in to composition”; “I do not manufacture goods that are barred from composition (for example ice cream, pan masala, tobacco products)”. Optional **Composition tax rate (%)**. `registration-fields.tsx` | Unticked confirmation: “Please confirm to continue”. Rate outside 0–10: “Enter a rate between 0 and 10”. The API schema also has “Confirm that every registration on this PAN opts in” and “Confirm that you do not manufacture notified goods”. `registration-schemas.ts` |
| **Existing registration** | Shows status, start date, **GSTIN**, **Legal name**, **Trade name**, **Business type**, **Home State**, **PAN**, **Invoice prefix**; **Edit name or address**, **Change GST status**, **History**, and, when applicable, **Delete scheduled change**. History columns: **Period**, **GST status**, **GSTIN**, **PAN**, **State**, **Prefix**, **Status**; statuses **Active**, **Scheduled**, **Past**. `registration-card.tsx`, `registration-history-table.tsx` | Edit dialog has **Legal name**, **Trade name**, the address fields, **Cancel**, **Save**. Unchanged: “Nothing has changed yet.” Success: “Details updated”. No OTP is requested for this edit. `edit-registration-details-dialog.tsx` |
| **Invoice settings** | **Invoice prefix**, **Invoice footer text**; switches **Print my store logo on invoices**, **GST invoices for business buyers**, **Deliver only in my home State**. **Advanced** → **How shipping and COD fees are taxed**: “Split across items by value (recommended)” / “Add to the item with the highest GST rate”. **Save invoice settings**. `invoice-settings-card.tsx` | Without setup: “Set up your GST status above to configure invoices.” Footer has a 500-character limit. B2B can be disabled with “Only sellers under regular GST can issue GST invoices to businesses.” or “Your turnover crossed ₹5 crore in some year, so business invoices need e-invoicing, which ShopPulse does not support yet.” Home-State switch is forced for unregistered/composition sellers. Prefix feedback is in section 3. `declarations.ts`, `tax-settings-service.ts` |
| **Turnover declaration** | **Financial year**: previous, current, next. **Last financial year's turnover (all your sales on this PAN, including outside ShopPulse)**: the three ranges above. **Exact amount last year across your PAN (₹)**; “Has your turnover ever been above ₹5 crore in any year since 2017-18?”; **Sales outside ShopPulse this year so far (₹)**; **Date you filed last year's annual return**; **Save declaration**. `tax-declaration-card.tsx` | Range required: “Choose last year’s turnover”. Invalid amounts: “Enter an amount in rupees, up to 2 decimals”. The highest tier forces the ₹5-crore switch on. The exact amount is optional here but required for composition entry. Server schema: “Last year was above ₹5 crore, so "ever above ₹5 crore" is yes”. `tax-declaration-card.tsx`, `registration-schemas.ts` |
| **ShopPulse billing details** | Switch **I want a GST invoice for my ShopPulse subscription**; **State** always. With switch on: **Legal name**, **GSTIN**, **PAN**, **Address line 1**, **Address line 2**, **City**, **Pincode**. **Save Billing Details**. This is separate from the store registration. `billing-tax-form.tsx`, `page.tsx` | “State is required”; “Legal name is required”; GSTIN errors below; “GSTIN state code does not match selected state”; “Invalid PAN”; “Address line 1 required”; “City required”; “6-digit pincode”. The server checks GSTIN/PAN agreement, but the form’s general failure toast is “Could not save. Try again.” First save does not require OTP; later sensitive identity changes can. `billing-tax-form.tsx`, `billing route` |

**Shared GSTIN validation:** “GSTIN is required”, “GSTIN must be 15 characters”, “GSTIN format is invalid”, “GSTIN state code is invalid”, “GSTIN-embedded PAN is invalid”, “GSTIN checksum mismatch”. A different selected State gives “The first two digits of your GSTIN must match your home State.” A valid entry shows “Looks valid.” `gstin.ts`, `registration-fields.tsx`

**State options** used by the registration selector: Jammu and Kashmir, Himachal Pradesh, Punjab, Chandigarh, Uttarakhand, Haryana, Delhi, Rajasthan, Uttar Pradesh, Bihar, Sikkim, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura, Meghalaya, Assam, West Bengal, Jharkhand, Odisha, Chhattisgarh, Madhya Pradesh, Gujarat, Dadra and Nagar Haveli and Daman and Diu, Maharashtra, Karnataka, Goa, Lakshadweep, Kerala, Tamil Nadu, Puducherry, Andaman and Nicobar Islands, Telangana, Andhra Pradesh, Ladakh, Other Territory. `states.ts`

### Product, order and shipment pages

| Page and route | Controls and options | Validation / feedback |
|---|---|---|
| **Product Tax (GST)** — `/{storeId}/products/new` or `/{storeId}/products/{productId}` | **Find HSN**, **HSN code**, **Taxability**: Taxable / Nil-rated (0%) / Exempt / Non-GST supply; **Unit**, **Pieces per unit**. For taxable products, **GST rate**: “Use the catalogue rate for this HSN” / “I will pick the rate”. Manual fields: **Rate** (3%, 5%, 18%, 40%), **Cess (%)**, “The rate is higher above a price per piece”, **Price per piece up to (₹)**, **Rate above that**, “I confirm this rate is correct for this product.” `product-tax-compliance.tsx`, `product list` | “Enter a 4, 6 or 8 digit HSN code”; “Pick a unit from the list”; “Pieces per unit must be a whole number”; “At least 1 piece per unit”; “At most 1000 pieces per unit”; “Pick a GST rate”; “Tick the box to confirm the rate you picked”; “Set both the price per piece and the higher rate, or neither”; “The higher rate must be above the normal rate”. A threshold dead zone produces a dynamic message beginning “This price can't be taxed consistently”. `product-tax-schema.ts`, `deadZoneMessage` |
| **Bulk-fix tax** — `/{storeId}/products/bulk-fix-tax` | Select rows; **HSN code**, **Taxability**, **Rate mode**: No change / Catalogue rate / Pick rate manually; **Unit**, **Pieces per unit**. Manual: **GST rate**, **Price per piece threshold (₹, incl. GST, optional)**, **Higher rate above threshold**, “I confirm this GST rate is correct for these products”. Also **Apply to selected**, **Clear selection**, search, **All categories**, **Previous**, **Next**, **Discard**, **Save**, **Back to products**. Only products assessed as not ready are listed. `bulk-fix page`, `bulk-fix-tax-client.tsx` | “Select at least one row first.”; “Set at least one field before applying.”; “HSN must be 4, 6 or 8 digits.”; “Pieces per unit must be a whole number from 1 to 1000.”; “Pick a GST rate.”; “Tick the box to confirm the rate you picked.”; “Price per piece must be above zero.”; “Pick the higher rate.”; “The higher rate must be above the normal rate.” Failed save: “{n} row(s) failed validation. Nothing was saved.” `bulk-fix-tax-client.tsx` |
| **Order → Billing & tax** — `/{storeId}/orders/{orderId}` | Cards: **Payment details**, **Documents**, conditional **Billing address**, **GST quoted at checkout**, **Buyer GST details**. Document statuses: **Invoice issued**, **Invoice failed, retrying**, **Not issued yet**. Conditional actions: **Issue invoice now**, **Re-issue invoice**, **PDF**, **Resend**. Document columns: **Number**, **Type**, **Date**, **GST**, **Total**, **Copy**. `order-details-client.tsx`, `billing-tab.tsx` | Re-issue opens **Confirm invoice re-issue** OTP. Issue failures display the API message or “The invoice could not be issued.” Re-issue failures display the API message or “The invoice could not be re-issued.” `billing-tab.tsx` |
| **Shipment → Overview → E-way bill** — `/{storeId}/shipments/{shipmentId}` | Card appears if required or already recorded. Inputs: **E-way bill number**, **Generated on**, **Valid until**, **Save e-way bill**. Existing record: **Number**, **Valid until**, **Covers invoices**, **Remove e-way bill**. Save is disabled until the number has 12 digits and both dates are filled. `ewaybill-card.tsx`, `shipment-overview-tab.tsx` | API validation strings: “An e-way bill number has 12 digits.”; “Enter the e-way bill date.”; “Enter the valid-until date.”; “Enter valid dates for the e-way bill.”; “The e-way bill date cannot be in the future.”; “The valid-until date must be after the e-way bill date.”; “This e-way bill has already expired. Enter a valid one.”; “This shipment is already closed.”; “Invoice not issued. Issue the invoice before entering an e-way bill.” The future check actually allows up to 24 hours ahead. `eway-bill route` |

**Unit options** in both product editors: BAG · Bags; BAL · Bale; BDL · Bundles; BKL · Buckles; BOU · Billions of units; BOX · Box; BTL · Bottles; BUN · Bunches; CAN · Cans; CBM · Cubic meters; CCM · Cubic centimeters; CMS · Centimeters; CTN · Cartons; DOZ · Dozens; DRM · Drums; GGK · Great gross; GMS · Grams; GRS · Gross; GYD · Gross yards; KGS · Kilograms; KLR · Kilolitre; KME · Kilometre; LTR · Litres; MLT · Millilitre; MTR · Meters; MTS · Metric tons; NOS · Numbers; PAC · Packs; PCS · Pieces; PRS · Pairs; QTL · Quintal; ROL · Rolls; SET · Sets; SQF · Square feet; SQM · Square meters; SQY · Square yards; TBS · Tablets; TGM · Ten gross; THD · Thousands; TON · Tonnes; TUB · Tubes; UGS · US gallons; UNT · Units; YDS · Yards; OTH · Others. `uqc.ts`

## 2. Change GST status

### Choices and inputs

| Current status | Choices shown, subject to date-window filtering | Source |
|---|---|---|
| Not registered | **I got a GST registration**; **Move to the composition scheme**; **My PAN, business type or State changed** | `registration-service.ts` |
| Regular GST | **Move to the composition scheme**; **My GST registration is cancelled**; **I have a new GSTIN** | `registration-service.ts` |
| Composition | **Leave the composition scheme**; **My GST registration is cancelled**; **I have a new GSTIN** | `registration-service.ts` |

The overview removes choices whose permitted date window is empty; it supplies no choices while a future change exists. `getRegistrationOverview`

| Wizard step or choice | Inputs and controls | Source |
|---|---|---|
| Choose | **Change GST status**, “What changed for your store?”, radio choice, **Cancel**, **Next**. | `change-gst-status-dialog.tsx` |
| All change forms | **Effective date**, **Back**, **Continue**, and a **What you need to know** checklist. | `transition-fields.tsx`, `transition-draft.ts` |
| Got registration | **GSTIN**, **Legal name**, **Trade name**, **Business type**; optional “Update the principal place of business too” reveals address fields. | `transition-fields.tsx` |
| Move to composition | From unregistered: **GSTIN**, **Legal name**, **Trade name**. Both starting statuses show the two composition confirmations and optional **Composition tax rate (%)**. | `transition-fields.tsx` |
| Leave composition / registration cancelled | Effective date only. | `transition-draft.ts` |
| New GSTIN | **New GSTIN**, **Legal name**, **Trade name**, **Business type**, principal-business-address fields. Address State is derived from the new GSTIN. | `transition-fields.tsx` |
| PAN/business type/State changed | **PAN**, **Legal name**, **Business type**, **Home State**; changing State reveals the new address fields. | `transition-fields.tsx` |

### Date and reference guards

| Rule | Exact refusal text | Source |
|---|---|---|
| All changes: maximum 90 days ahead. | “The effective date can be at most 90 days ahead.” | `scheduleTransition` |
| Unregistered → registration or composition: no additional type-specific backdate minimum, but the current-period guard below still applies. | “The effective date must be after {YYYY-MM-DD}, when your current status started.” | `kindWindow`, `scheduleTransition` |
| Regular → composition: only 1 April, not before today and not more than 90 days ahead. | “Moving from regular GST to composition starts only on 1 April.” | `kindWindow`, `scheduleTransition` |
| Voluntary composition exit: at most seven days back. Cancellation: at most 30 days back. New GSTIN or unregistered identity change: today or later. | “The effective date cannot be before {YYYY-MM-DD} for this change.” | `kindWindow` |
| Same start day replaces the current period only if no order or document references it; earlier dates are refused. | “The effective date must be after {YYYY-MM-DD}, when your current status started.” | `isReferenced`, `scheduleTransition` |
| One scheduled change at a time; invalid date is refused. | “A change is already scheduled. Delete it first to plan a different one.”; “The effective date is invalid.” | `scheduleTransition` |

The wizard’s local date messages are “Choose a date”, “This change can start only on 1 April”, “This date is too early”, and “This date is too far ahead”. Other local messages include “Choose a State”, “Only the name changed. Use Edit name or address instead.” and “Change at least one detail to continue.” `transition-draft.ts`

Other server reasons include “Enter your GSTIN.”, “This is your current GSTIN.”, “PAN is invalid.”, “Pick a valid State.”, “Nothing core changed. Edit the name or address directly instead.”, “Enter your business address in the new State.”, “This change is not possible from your current GST status.” and “Enter your principal place of business.” `planRow`

### OTP and scheduled deletion

| Topic | Code behavior | Source |
|---|---|---|
| OTP timing | **Continue** first validates locally; only then **Confirm GST status change** opens and automatically requests a code. A successful verification supplies a one-use, purpose-bound ticket to `POST /api/{storeId}/tax/registration/transitions`. Controls include **Cancel**, **Resend code**, **Confirm change**. | `change-gst-status-dialog.tsx`, `otp-action-dialog.tsx`, `transition route` |
| Channel/provider | Seller phone is preferred for SMS; email is configured as fallback when both exist. Providers are platform Fast2SMS and Resend. The SMS wrapper assumes success unless it throws, so an underlying unsuccessful send does not necessarily trigger email fallback. | `platform-otp-routes.ts`, `platform-dispatcher.ts`, `sms.ts` |
| Limits and development behavior | Six-digit random code; 10-minute code lifetime; five-minute ticket; 30-second resend cooldown; five wrong attempts. A fixed-code bypass was **NOT FOUND** in the inspected OTP flow. Generated codes are logged without an environment guard; dispatch-failure handling differs between production and non-production. | `otp-core.ts`, `otp-service.ts` |
| OTP messages | “Sending code...”; “Wrong code. {n} attempt(s) left.”; “Code expires in {minutes}:{seconds}”; “Please wait before requesting another code.”; “Too many requests. Try again in an hour.”; “Add a phone or email to your profile first.”; “Wrong or expired code.”; “Enter the 6-digit code.”; “Verification expired. Please verify again.” | `otp-action-dialog.tsx`, `use-otp.ts`, `change-gst-status-dialog.tsx` |
| Delete scheduled change | **Delete scheduled change** opens confirmation with **Keep it** / **Delete**. The service deletes only the latest future, unreferenced row and reopens its preceding period. Refusals: “This change was not found.”; “This change is already in effect.”; “Only the latest scheduled change can be deleted.”; “Orders or documents already use this change.” | `registration-card.tsx`, `cancelScheduled` |

## 3. Invoice prefix

| Question | Code behavior | Source |
|---|---|---|
| Derivation | Uppercase store name, remove non-alphanumerics. If fewer than two characters remain, use `S` plus random characters. Try first five characters; first four plus digits 2–9; first three plus random characters; then random five-character candidates. Invalid, reserved and duplicate candidates are removed; the first available candidate is allocated. | `derivePrefixCandidates`, `allocatePrefix` |
| Rules | Two to five uppercase letters or digits. Reserved: `SP`, `SPL`, `TEST`, `DEMO`, `NULL`, `NONE`, `NA`. Prefix is globally unique in the Prisma schema. | `numbering.ts`, `schema.prisma` |
| Live check | `GET /api/{storeId}/tax/settings?checkPrefix={candidate}`. UI feedback: “Use 2 to 5 letters or digits.”, “Checking...”, “Available”, “Not available”, “This prefix is reserved.”, “This prefix is already in use.” | `settings route`, `invoice-settings-card.tsx` |
| Lock | Any numbered series under the prefix in the current financial year locks it. UI: “Locked: an invoice was already numbered this financial year. You can change it from 1 April.” API refusal: “The prefix cannot change after the first invoice of this financial year.” | `isPrefixLocked`, `tax-settings-service.ts` |

## 4. Same PAN and GSTIN

| Question | Code behavior | Source |
|---|---|---|
| Attestation | Both composition confirmations are required. On a **transition** into composition, the service checks for any registration row in another store with the same PAN, without an active-date or regime filter. It returns a non-blocking warning without naming that store: “Another ShopPulse store uses this PAN. Every GST registration on this PAN must move to composition from the same date.” | `compositionAttestationSchema`, `samePanWarning`, `scheduleTransition` |
| Initial setup | Composition setup checks eligibility and records confirmations, but the inspected initial-setup path does not call `samePanWarning`. | `setupInitialRegistration` |
| GSTIN uniqueness | Prisma and the checked migration define ordinary GSTIN and PAN indexes, not unique indexes. A cross-store GSTIN uniqueness check was **NOT FOUND** in the inspected registration service. The live database’s constraints were not inspected. | `schema.prisma`, `migration.sql`, `registration-service.ts` |
| Prefix with a new GSTIN | A period keeps its prefix unless that prefix is already bound to another GSTIN; then a new prefix is allocated. **New GSTIN** creates a regular-GST period. | `prefixForPeriod`, `planRow` |

## 5. Composition cap and in-flight orders

| Topic | Code behavior | Source |
|---|---|---|
| Entry cap | Previous-year PAN-wide turnover must be declared for the exact financial year. The entry check rejects amounts **above** ₹75 lakh for Nagaland, Manipur, Mizoram and Tripura; **above** ₹1.5 crore elsewhere. | `compositionProblems`, `compositionCapInr`, `states.ts` |
| Forced-lapse calculation | At sale-document issuance, code sums same-PAN sale-document taxable totals for the FY, subtracts same-PAN credit-note taxable totals, adds the issuing store’s declared outside turnover and the current sale taxable value. It lapses only when the result is **strictly above** the State cap. | `enforceCompositionCap` |
| Crossing sale | The transaction ends the composition period and creates a regular period from the issue day, retaining GSTIN and prefix. It then recomputes the crossing sale under regular GST. Earlier same-day composition documents are collected for advisor notification. | `recordForcedCompositionExit`, `issueFromSource` |
| Unissued orders | Issuance reads the registration active at issue time and computes from the order’s stored items and charges. An already-removed order without a document is refused rather than issued afterward, except for the dispatch-commit path. | `issueFromSource`, `assertIssuable`, `computeFor` |
| Already-issued, not-yet-shipped orders | Dispatch compares the issued set’s GSTIN and regime with the active registration. A composition document after a forced move to regular is stale; dispatch refuses it. An eligible open, unshipped order can use **Re-issue invoice**, which credits the old set and issues a new one. | `dispatch.ts`, `isSaleSetStale and reissueSaleSet` |
| Already shipped | Re-issue eligibility excludes orders whose forward shipment has physically left the seller. Automatic changes to already-shipped documents after the lapse: **NOT FOUND** in the inspected lapse path. | `canReissueSaleSet`, `isOrderRemoved` |

The State-class source itself marks its classes as provisional pending verification. `states.ts`

**Part B is deferred until you say “continue.”**





I’ll audit Part B from the Admin and Storefront source, then stop before Part C. I won’t run the app, scripts, or builds.

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\audit002.md"
}

Find files matching `**\*.ts`

Find files matching `**\*.ts`

Search for `QUOTE_CHANGED|quoteToken|quote token|QuoteChanged|QuoteToken`

Search for `tax|pincode|place.of.supply|stateCode`

Read , lines 1 to 6
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\audit002.md",
  "view_range": [
    1,
    6
  ]
}

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\types.ts",
  "view_range": [
    1,
    260
  ]
}

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\arith.ts",
  "view_range": [
    1,
    260
  ]
}

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\document-type.ts",
  "view_range": [
    1,
    260
  ]
}

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\compute.ts",
  "view_range": [
    1,
    260
  ]
}

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\geo\\place-of-supply.ts",
  "view_range": [
    1,
    260
  ]
}

Read , lines 1 to 230
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\geo\\pincodes.ts",
  "view_range": [
    1,
    230
  ]
}

Read , lines 1 to 250
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote-token.ts",
  "view_range": [
    1,
    250
  ]
}

Read , lines 235 to 560
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\compute.ts",
  "view_range": [
    235,
    560
  ]
}

"Read" failed
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\compute.ts",
  "view_range": [
    560,
    795
  ]
}
Tool execution failed: view_range out of bounds

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    1,
    260
  ]
}

Read , lines 261 to 540
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    261,
    540
  ]
}

Search for `QuoteChanged|QuoteTokenRequired|checkQuoteToken|buildCheckoutQuote|buildQuote...`

Read , lines 1 to 240
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\components\\address-form.tsx",
  "view_range": [
    1,
    240
  ]
}

Read , lines 525 to 605
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    525,
    605
  ]
}

Search for `stateNames|stateCodes|shippingAddress.state|QUOTE_CHANGED|quoteError|quoteTok...`

Read , lines 1 to 165
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\shipping\\delivery-charges\\route.ts",
  "view_range": [
    1,
    165
  ]
}

Read , lines 1 to 168
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\errors.ts",
  "view_range": [
    1,
    168
  ]
}

Find files matching `**\*`

Search for `issueSaleSet\(|issueReissuedSaleSetTx\(|issueExchange|issueReplacement|report...`

Read , lines 175 to 325
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\numbering.ts",
  "view_range": [
    175,
    325
  ]
}

The quote and engine paths are mapped. I’m now tracing document issuance, PDF rendering, downloads, and the outbox so the lifecycle table reflects the actual callers and authorization checks.

Search for `issueSaleSetSafely|issueReplacementSaleSetSafely|issueSaleSet\(|saleDocumentS...`

Read , lines 1 to 205
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    1,
    205
  ]
}

Read , lines 700 to 1020
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    700,
    1020
  ]
}

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\outbox.ts",
  "view_range": [
    1,
    260
  ]
}

Read , lines 261 to 540
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\outbox.ts",
  "view_range": [
    261,
    540
  ]
}

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\repository.ts",
  "view_range": [
    1,
    260
  ]
}

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\download.ts",
  "view_range": [
    1,
    260
  ]
}

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\render\\v1.tsx",
  "view_range": [
    1,
    260
  ]
}

Read , lines 261 to 540
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\render\\v1.tsx",
  "view_range": [
    261,
    540
  ]
}

Read , lines 1 to 220
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\render\\index.ts",
  "view_range": [
    1,
    220
  ]
}

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\snapshots.ts",
  "view_range": [
    1,
    260
  ]
}

Read , lines 1 to 240
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\storage.ts",
  "view_range": [
    1,
    240
  ]
}

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\billing\\invoice\\email.ts",
  "view_range": [
    1,
    260
  ]
}

Read , lines 1 to 200
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\fy.ts",
  "view_range": [
    1,
    200
  ]
}

Read , lines 3250 to 3445
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\prisma\\schema.prisma",
  "view_range": [
    3250,
    3445
  ]
}

Search for `enum (SaleDocumentStatus|TaxDocumentPdfStatus|TaxDocumentDeliveryStatus|TaxDo...`

Read , lines 965 to 1036
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    965,
    1036
  ]
}

Read , lines 1 to 160
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\tax-document-reconcile\\route.ts",
  "view_range": [
    1,
    160
  ]
}

Read , lines 1 to 150
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\tax-document-outbox\\route.ts",
  "view_range": [
    1,
    150
  ]
}

Read , lines 1 to 180
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\tax-documents\\[docId]\\pdf\\route.ts",
  "view_range": [
    1,
    180
  ]
}

Read , lines 1 to 200
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\storefront\\orders\\[orderId]\\documents\\[docId]\\pdf\\route.ts",
  "view_range": [
    1,
    200
  ]
}

Read , lines 1 to 200
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\storefront\\orders\\[orderId]\\documents\\route.ts",
  "view_range": [
    1,
    200
  ]
}

Read , lines 1 to 230
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\storefront\\orders\\[orderId]\\documents\\resend\\route.ts",
  "view_range": [
    1,
    230
  ]
}

Read , lines 1 to 180
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\tax-documents\\[docId]\\resend\\route.ts",
  "view_range": [
    1,
    180
  ]
}

Read , lines 1 to 200
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\storefront\\orders\\[orderId]\\invoice\\request-otp\\route.ts",
  "view_range": [
    1,
    200
  ]
}

Read , lines 1 to 215
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\storefront\\orders\\[orderId]\\invoice\\verify-otp\\route.ts",
  "view_range": [
    1,
    215
  ]
}

Search for `LONG|SHORT|TTL|expires|expiresAt|verifyInvoiceLinkToken|mintInvoiceLinkToken|...`

Read , lines 1 to 245
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\order-snapshot.ts",
  "view_range": [
    1,
    245
  ]
}

Search for `enum ArtifactStatus|enum DeliveryStatus|enum SaleDocumentStatus`

Read , lines 275 to 325
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\page.tsx",
  "view_range": [
    275,
    325
  ]
}

Read , lines 400 to 470
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\page.tsx",
  "view_range": [
    400,
    470
  ]
}

Read , lines 1 to 220
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\actions\\get-checkout-quote.tsx",
  "view_range": [
    1,
    220
  ]
}

Read , lines 25 to 135
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\checkout\\quote\\route.ts",
  "view_range": [
    25,
    135
  ]
}

Search for `useCheckoutQuote|quote|errorMessage|QUOTE_CHANGED`

Read , lines 260 to 322
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    260,
    322
  ]
}

Read , lines 570 to 690
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    570,
    690
  ]
}

Read , lines 25 to 48
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\geo\\states.ts",
  "view_range": [
    25,
    48
  ]
}

Search for `^export (async )?function|^export (type|interface|const) `

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\credit-note.ts",
  "view_range": [
    1,
    260
  ]
}

Read , lines 140 to 230
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\checkout\\verify\\route.ts",
  "view_range": [
    140,
    230
  ]
}

Read , lines 90 to 195
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\webhook\\razorpay\\store\\route.ts",
  "view_range": [
    90,
    195
  ]
}

Read , lines 45 to 150
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\dispatch.ts",
  "view_range": [
    45,
    150
  ]
}

Read , lines 25 to 105
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\hooks\\use-checkout-quote.ts",
  "view_range": [
    25,
    105
  ]
}

Search for `Pdf|downloadUrl|documentsUrl|invoice|Download invoice|Documents`

Search for `invoiceNumber|taxDocument|documents`

Read , lines 108 to 190
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\components\\returns\\invoice-otp-modal.tsx",
  "view_range": [
    108,
    190
  ]
}

Read , lines 1 to 200
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\notifications\\store\\email-service.ts",
  "view_range": [
    1,
    200
  ]
}

Read , lines 1 to 95
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\orders\\[orderId]\\issue-now\\route.ts",
  "view_range": [
    1,
    95
  ]
}

Read , lines 1 to 100
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\orders\\[orderId]\\documents\\route.ts",
  "view_range": [
    1,
    100
  ]
}

Read , lines 45 to 65
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\components\\returns\\hub-order-card.tsx",
  "view_range": [
    45,
    65
  ]
}

Read , lines 305 to 350
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\page.tsx",
  "view_range": [
    305,
    350
  ]
}

Read , lines 300 to 455
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    300,
    455
  ]
}

Read , lines 48 to 111
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\geo\\states.ts",
  "view_range": [
    48,
    111
  ]
}

Read , lines 34 to 98
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\document-type.ts",
  "view_range": [
    34,
    98
  ]
}

Read , lines 62 to 145
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\compute.ts",
  "view_range": [
    62,
    145
  ]
}

Search for `pdfStatus|saleDocumentStatus|TaxDocument.*update|TaxDocumentLine.*update|UPDA...`

Read , lines 1 to 220
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\components\\order-summary.tsx",
  "view_range": [
    1,
    220
  ]
}

Read , lines 190 to 350
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\components\\returns\\invoice-otp-modal.tsx",
  "view_range": [
    190,
    350
  ]
}

Read , lines 1 to 200
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\ship-scope.ts",
  "view_range": [
    1,
    200
  ]
}

Read , lines 45 to 95
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\types.ts",
  "view_range": [
    45,
    95
  ]
}

Read , lines 50 to 145
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\components\\pincode-checker.tsx",
  "view_range": [
    50,
    145
  ]
}

Read , lines 60 to 185
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\actions\\get-delivery-charges.tsx",
  "view_range": [
    60,
    185
  ]
}

Search for `requestInvoiceOtp|verifyInvoiceOtp|resendInvoiceEmail|INVOICE_DOWNLOAD|onInvo...`

Search for `tax.document.pdf|SKIPPED_NO_PROVIDER|BACKOFF_MS|sendDelivery|pdfStoredAt|clai...`

# Part B — Tax engine, checkout and documents

Source audit only; browser behavior has **not** been run or tested.

## 6. Tax engine

### Function signatures

| Function | Signature / purpose | Source |
|---|---|---|
| Order computation | `computeOrderTax(input: ComputeOrderTaxInput): ComputeOrderTaxResult` | `compute.ts` |
| Supply and split | `supplyTypeFor(regime, sellerStateCode, placeOfSupplyStateCode): SupplyType`; `taxSplitFor(supplyType, placeOfSupplyStateKind): TaxSplit` | `compute.ts` |
| Components | `computeComponents(basePaise, rateBps, cessBps, split, inclusive): TaxComponents`; `zeroComponents()`, `sumComponents(c)`, `addComponents(a, b)` | `compute.ts` |
| Document decision | `decideDocumentType(regime, taxabilities): SaleSetMemberPlan[]`; `seriesKindFor(type)`; `saleSetMemberFor(saleSet, taxability)`; `decideNoteNature(originalType, originalRegistrationInForce)` | `document-type.ts` |
| Credit arithmetic | `buildCreditLines(lines: ReadonlyArray<CreditableLine>, requests: ReadonlyArray<CreditRequest>): CreditLineResult[]` | `credit-note.ts` |
| Integer helpers | `mulDivHalfUp(a, b, d)`, `mulDivFloor(a, b, d)`, `compareProducts(a, b, c, d)`, plus integer assertions. | `arith.ts` |

The order input contains regime, seller and destination State codes, destination State kind, inclusive/exclusive pricing, allocation method, goods lines and charges. Money is integer paise; rates are basis points. `types.ts`

### Rounding, thresholds and allocation

| Rule | Implementation | Source |
|---|---|---|
| Component rounding | Multiplication/division uses `BigInt`; half-up ties go away from zero. Each component is rounded separately per goods line and per allocated charge part. | `mulDivHalfUp`, `computeComponents` |
| Inclusive price | Each component uses denominator `10000 + GST rate + cess rate`; taxable value is gross minus rounded components, and total stays gross. | `computeComponents`, `lineAmounts` |
| Exclusive price | Each component uses denominator `10000`; taxable value is gross and total is gross plus components. | `lineAmounts` |
| Threshold | Exclusive: low rate when line gross ≤ threshold × quantity × pieces per unit; otherwise high. Inclusive: low if the price fits the low-rate boundary, high only above the high-rate boundary; the interval between them raises `TAX_NOT_SELLABLE`. Cess participates in both boundaries. | `resolveLineRate` |
| Proportional charge allocation | Each shipping/COD charge is apportioned by goods gross. Floors are assigned first; remaining paise go to largest remainders, with earlier line winning a tie. If all goods gross is zero, the charge goes to the first line and a warning is recorded. | `allocateCharge`, `computeOrderTax` |
| Highest-rate allocation | Whole charge goes to the line with the highest GST-plus-cess rate; ties use higher goods gross, then earlier line. Each allocated part follows its goods line’s rate and document member. | `allocateCharge` |
| Readiness | Regular and composition checkout require tax-ready products. Unverified catalogue rates are hints, not applied rates. Regular engine calculation also rejects missing taxability or a usable taxable rate. | `buildCheckoutQuote`, `evaluateTaxReadiness`, `computeOrderTax` |

### Sale decision table

`B2B` does not change `decideDocumentType`; checkout separately permits a business buyer only for an eligible regular seller with the B2B setting enabled. `document-type.ts`, `quote.ts`

| Seller / goods | Buyer | Document and series | Components |
|---|---|---|---|
| Unregistered, any classification | B2C; B2B rejected | Commercial invoice, `COMMERCIAL` / **S** | None |
| Composition, any classification | B2C; B2B rejected | Bill of supply, `BILL_OF_SUPPLY` / **B** | None |
| Regular, all taxable | Eligible B2B or B2C | Tax invoice, `INVOICE` / **I** | As in State table below |
| Regular, all nil-rated/exempt/non-GST | Eligible B2B or B2C | Bill of supply, `BILL_OF_SUPPLY` / **B** | None |
| Regular, mixed taxable and other | Eligible B2B or B2C | Two documents: tax invoice **I** for taxable lines; bill of supply **B** for the others | Taxable member uses State table; other member has none |

Sources: `decideDocumentType`, `series letters`, `B2B checkout gate`.

| Regular taxable supply | Components |
|---|---|
| Seller and destination are different States | IGST, plus cess when applicable |
| Same State or UT with legislature | CGST + SGST, plus cess when applicable |
| Same UT without legislature | CGST + UTGST, plus cess when applicable |

The code’s UT-without-legislature set is Chandigarh, Dadra and Nagar Haveli and Daman and Diu, Lakshadweep, Andaman and Nicobar Islands, and Ladakh. Unregistered and composition delivery is limited to the home State; regular delivery may also be restricted by its setting. `taxSplitFor`, `states.ts`, `canShipTo`

## 7. Place of supply and pincode

| Situation | Code and browser behavior | Source |
|---|---|---|
| Directory lookup | `lookupPincode` requires a six-digit pincode starting 1–9 and returns its stored State-code list and district, or `null`. | `pincodes.ts` |
| Known pincode, valid chosen State | `resolveShipToState` accepts a State name, abbreviation or code only if it is in the pincode’s list. | `place-of-supply.ts` |
| Multi-State pincode | The delivery check allows the pincode if **any** listed State is allowed, and returns all listed State names. Checkout fills the first name when the current choice is not in the list and restricts the State selector to those names. The quote subsequently checks the **selected** State against the store’s delivery scope. | `evaluateShipScopeForPincode`, `delivery-charges route`, `checkout page`, `address-form.tsx` |
| Unknown pincode or unresolved multi-State choice | Quote raises `PLACE_OF_SUPPLY_UNRESOLVED`: “Please check your pincode and State.” The initial delivery-scope lookup returns an unknown scope for a pincode absent from the directory; the quote checks it again. | `resolveShipToState`, `errors.ts` |
| Chosen State conflicts with directory | `PINCODE_STATE_MISMATCH`: “Please check your pincode and State.” Checkout’s selector and auto-fill normally constrain this choice. | `resolveShipToState`, `checkout page` |
| Business buyer | Buyer GSTIN’s State code must equal the **shipping** State; otherwise `B2B_STATE_MISMATCH`: “GST invoice is available only when delivering to the GSTIN's State. Continue without GST invoice?” | `assertB2bStateMatchesShipTo`, `errors.ts` |

## 8. Quote token

| Topic | Code behavior | Source |
|---|---|---|
| Contents and expiry | Signed payload contains store ID `sid`, expiry `exp`, and quote fingerprint `h`; lifetime is 15 minutes. The public quote also returns the breakdown and expiry. | `quote-token.ts`, `QuoteView` |
| Fingerprint | SHA-256 of the JSON quote core, registration ID, engine version and allocation method. The core contains regime, price mode, payment method, supply State/type, displayed line identities/names/quantities/prices/tax, charges, GST totals, order total and buyer GSTIN. | `buildCheckoutQuote`, `buildViewCore` |
| What is not directly in the fingerprint | Pincode itself, separate billing State, buyer legal name/address, and HSN/UQC are not fields in that core. A change to one can still matter if it changes a fingerprinted result or causes quote validation to fail. | `buildViewCore` |
| Checkout validation | Checkout recomputes the quote before comparing its fingerprint. Missing, malformed, tampered, or wrong-store tokens produce `QUOTE_TOKEN_REQUIRED`; an **expired** token or a valid token whose fingerprint **differs** produces `QUOTE_CHANGED` with the fresh quote in `details.quote`. Other quote errors can occur before this comparison. | `assertQuoteTokenMatches`, `checkQuoteToken`, `checkout route` |
| Browser | Checkout refreshes the quote when cart, pincode, State, payment method or buyer inputs change. On `QUOTE_CHANGED`, it replaces the quote and shows “Prices were updated. Please review your total.” | `use-checkout-quote.ts`, `checkout page` |

## 9. Document lifecycle

### Issuance triggers

| Trigger | When code calls issuance | Source |
|---|---|---|
| Prepaid webhook | After a validated captured payment settles; an already-paid replay also calls the idempotent issuance path. | `Razorpay store webhook` |
| Prepaid browser verification | After captured-payment verification and settlement; already-paid outcome also calls issuance. | `checkout verify route` |
| Reconcile | Paid prepaid orders in `PENDING` or `FAILED`, older than the two-minute grace period, excluding closed orders. Already-removed orders are alerted, not backfilled. | `tax-document-reconcile route` |
| Seller action | **Issue invoice now** calls the owner-authorized issue route. Closed, shipped, or unpaid prepaid orders are refused. | `issue-now route`, `assertIssuable` |
| COD dispatch | Dispatch issues a missing COD sale set when its call enables `issueIfCod`, before proceeding to the courier booking checks. | `dispatch.ts` |
| Re-issue / exchange | Re-issue credits the previous set and issues another. Exchange replacement issuance can occur on approval, difference payment or replacement dispatch. | `reissueSaleSet`, `return-tax-credit.ts`, `exchange-forward-shipping.ts` |

### Keys, numbers and states

| Topic | Code behavior | Source |
|---|---|---|
| Sale-set keys | Initial order: `ORDER:{orderId}`; re-issue: `ORDER:{orderId}:R{round}`; exchange replacement: `EXCH:{exchangeId}`. Each sale member’s unique issue key is `SALE:{saleSetKey}:{member}`. | `issue.ts`, `issue.ts`, `schema.prisma` |
| Idempotency | Issuance locks the order row, returns an existing set if found, and creates members, lines, numbers and order status in one transaction. Issue-key conflicts re-read the winner’s set; selected uniqueness/deadlock conflicts are retried once. | `issueSaleSetTx`, `issueSaleSet` |
| Number allocation | Format `{prefix}-{series letter}{two-digit FY start}-{six-digit sequence}`; max 16 characters. The series key is prefix + kind + FY. Sequence increments inside the issuance transaction; FY rolls on 1 April **IST**. | `numbering.ts`, `fy.ts`, `schema.prisma` |
| Order document state | `PENDING` → `ISSUED` on successful issuance; the safe settlement/reconcile wrapper changes `PENDING` → `FAILED` on qualifying failure, and a later successful issue sets `ISSUED`. A `DOCUMENT_NOT_ISSUABLE` refusal is logged rather than marked failed by that wrapper. | `schema.prisma`, `issue.ts`, `issueSaleSetSafely` |
| Document state | A separate sale-document status on each `TaxDocument` was **NOT FOUND**. The order has the sale status; each document has independent PDF and delivery states. | `schema.prisma` |
| Issue-time calculation | Issuance uses the active registration and current catalogue lookup for catalogue-rate items; manual-rate inputs come from the order snapshot. It recomputes document tax from stored order prices and charges. Therefore equality with the original quote’s tax split cannot be assumed merely from the quote snapshot. | `frozenRate`, `issueFromSource` |

### PDF v1 fields actually rendered

| Document | Rendered fields | Source |
|---|---|---|
| All types | Title, number, date, FY, order reference; supplier legal/trade name, address, State, GSTIN and PAN when present; **Bill to** name/GSTIN/address; **Delivery address**; item description, HSN, quantity/UQC, unit price, line total; taxable-value total, grand total, footer and “This is an electronically generated document. No signature required.” Charge shares appear as item rows. | `v1.tsx`, `issue.ts` |
| Tax invoice | Also place of supply; per-line taxable value, rate and nonzero CGST/SGST/UTGST/IGST/cess amounts; component totals, total tax and “Tax payable on reverse charge: No”. A discount column is **not** rendered in this tax-table branch. | `v1.tsx`, `v1.tsx` |
| Bill of supply / commercial invoice | Non-tax table includes **Discount** rather than tax columns. Composition bill legend: “composition taxable person, not eligible to collect tax on supplies”. Unregistered legend: “Supplier not registered under GST. No GST charged.” | `v1.tsx`, `snapshots.ts` |
| Credit/debit note | Original number and date when available, note nature displayed as **Reason**, and **Total credited**. Tax columns appear when the note’s total tax is greater than zero. | `v1.tsx` |
| Logo | A logo URL is saved in the branding snapshot; logo rendering in v1 is **NOT FOUND**. | `brandingSnapshot`, `v1.tsx` |

The renderer loads stored document snapshots and lines, and also resolves State names through the State master. `render/index.ts`

## 10. Outbox, email and downloads

| Topic | Code behavior | Source |
|---|---|---|
| Claim and lease | PDF and email queues are independent. Each claims pending, due rows using `FOR UPDATE SKIP LOCKED`, a random claim token and a ten-minute lease; completion database updates are fenced by that token. Default batch size is 25 per queue. | `outbox.ts`, `claimPdfs`, `claimDeliveries` |
| External-send limitation | Email is sent **before** its fenced completion update. The database fencing does not itself prevent a second external send if a worker sends and then loses its lease or fails before recording completion. | `sendDelivery` |
| Retries | Retry delays scheduled after failures 1–4 are 1 minute, 5 minutes, 30 minutes and 2 hours. Failure 5 marks the row `FAILED`; although 12 hours is in the array, the fifth failure is terminal before that delay is scheduled. Exhausted PDF failure alerts the seller. | `outbox.ts`, `failPdf`, `sendDelivery` |
| PDF storage | PDF status starts `PENDING`, becomes `STORED` or `FAILED`; a missing stored asset can be requeued. Cloudinary uses raw, authenticated assets with `.pdf` in the public ID; returned identifiers, bytes and SHA-256 are persisted. | `schema.prisma`, `storage.ts`, `storePdf` |
| Email | First successful PDF storage queues an email when the snapshot has an email address. The store’s email integration is used; the implemented provider factory contains Resend. No provider, or provider construction returning `null`, yields `SKIPPED_NO_PROVIDER`. Seller resend adds a delivery row. | `storePdf`, `email.ts`, `email-service.ts`, `queueDocumentEmail` |
| Download recovery | A stored asset is fetched when present. On Cloudinary 404, download queues storage again and renders from the document; non-404 storage failures throw. | `loadTaxDocumentPdf`, `storage.ts` |

### Download and resend authorization

| Surface / route | Authorization and behavior | Source |
|---|---|---|
| Admin PDF: `GET /api/{storeId}/tax-documents/{docId}/pdf` | Signed-in store owner; document lookup also requires matching `storeId`. Missing document returns 404. | `admin PDF route` |
| Admin resend: `POST /api/{storeId}/tax-documents/{docId}/resend` | Store owner and matching store/document; creates another delivery row. No recipient returns “There is no customer email on this document.” | `admin resend route` |
| Customer PDF: `GET /api/{storeId}/storefront/orders/{orderId}/documents/{docId}/pdf?token=…` | Signed token must match store and order; document must match both. Invalid token, another order’s document and missing document return the same 404. | `customer PDF route` |
| Customer list | `GET /api/{storeId}/storefront/orders/{orderId}/documents?token=…` requires the same scoped token and returns document links for that order. | `customer documents route` |
| Token acquisition | Email links use a 90-day token. Customer invoice OTP verification consumes a purpose-bound ticket and mints a five-minute token. OTP request selects store SMS first when phone exists, with email fallback. | `link-token.ts`, `request-otp route`, `verify-otp route` |
| Customer UI | Order hub shows **Download invoice** and **Email invoice** when it has an invoice number. The modal’s visible copy says the code goes to the order email, although the request route prefers SMS when a phone is present. For multiple documents, the modal lists them. | `hub-order-card.tsx`, `invoice-otp-modal.tsx`, `request-otp route` |
| Customer resend | Requires the short-lived token; a long email-link token is rejected. The endpoint returns `{ ok: true }` even for invalid input or caught failures, so that response alone does not prove delivery. | `customer resend route` |

**Part C is deferred until you say “continue.”**






I’ll audit Part C from the implementation and the recorded progress notes. I’ll keep it read-only and distinguish browser controls from API-only paths.

Read , lines 1 to 110
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\audit002.md",
  "view_range": [
    1,
    110
  ]
}

Read , lines 1 to 180
Completed with input: {
  "path": "C:\\Users\\Varun Prajapati\\.copilot\\session-state\\eaf457f6-4ed1-4e2d-8311-c06c1ead5844\\checkpoints\\003-tax-audit-part-b.md",
  "view_range": [
    1,
    180
  ]
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\errors.ts"
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\vercel.json"
}

Find files matching `**\*`

Find files matching `**\route.ts`

Find files matching `**\*`

Search for `(?i)(limitation|known|defer|gap|not (implemented|built|testable|wired)|out of...`

Search for `export (async )?function|settleOrderCredit|BOOKING_IN_PROGRESS|BookingInProgr...`

Search for `assertDispatch|dispatchGate|EwayBill|ewayBill|PickupStateMismatch|StaleRegist...`

Search for `TaxNotReady\(|TaxNotSellable\(|ShipToStateNotAllowed\(|PincodeStateMismatch\(...`

Search for `TODO|FIXME|HACK`

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\_progress.md"
}

Find files matching `*.js`

Search for `(?i)(fault|inject|toggle|simulate|fail|replay|webhook|cron)`

Search for `^(model|enum) (Tax|Gst|Gst|Document|Hsn|Pincode|ProductTax|StoreTax|Fy|FY|Reg...`

Read , lines 1 to 165
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\_progress.md",
  "view_range": [
    1,
    165
  ]
}

Read , lines 1 to 270
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\dispatch.ts",
  "view_range": [
    1,
    270
  ]
}

Read , lines 1 to 180
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\eway-bill.ts",
  "view_range": [
    1,
    180
  ]
}

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\shiprocket-payload.ts",
  "view_range": [
    1,
    260
  ]
}

Read , lines 1 to 155
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\credit-note.ts",
  "view_range": [
    1,
    155
  ]
}

Read , lines 1 to 245
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\returns\\return-tax-credit.ts",
  "view_range": [
    1,
    245
  ]
}

Read , lines 2990 to 3240
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\prisma\\schema.prisma",
  "view_range": [
    2990,
    3240
  ]
}

Read , lines 3241 to 3464
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\prisma\\schema.prisma",
  "view_range": [
    3241,
    3464
  ]
}

Read , lines 3465 to 3535
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\prisma\\schema.prisma",
  "view_range": [
    3465,
    3535
  ]
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\dummy-server\\routes\\settings.js"
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\dummy-server\\routes\\cron.js"
}

Search for `fault|FAULT|inject|delay|timeout|ambiguous|simulate|fail|replay`

The correction and dispatch code is separate from the courier simulator, so I’m checking both the UI entry points and the underlying gates before listing what can be triggered from a browser.

Read , lines 50 to 93
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\_progress.md",
  "view_range": [
    50,
    93
  ]
}

Read , lines 94 to 131
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\_progress.md",
  "view_range": [
    94,
    131
  ]
}

Read , lines 132 to 160
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\_progress.md",
  "view_range": [
    132,
    160
  ]
}

Read , lines 190 to 430
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\corrections\\service.ts",
  "view_range": [
    190,
    430
  ]
}

Read , lines 630 to 860
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\corrections\\service.ts",
  "view_range": [
    630,
    860
  ]
}

Read , lines 3418 to 3555
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\shipping-service.ts",
  "view_range": [
    3418,
    3555
  ]
}

Read , lines 2684 to 2730
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\shipping-service.ts",
  "view_range": [
    2684,
    2730
  ]
}

Read , lines 240 to 316
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\dispatch.ts",
  "view_range": [
    240,
    316
  ]
}

Read , lines 1 to 165
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\geo\\states.ts",
  "view_range": [
    1,
    165
  ]
}

Search for `settleOrderCredit\(|creditRefundedReturn\(|creditExchangedReturn\(|onExchange...`

Search for `Cancel order|Cancel Order|Cancel shipment|Cancel Shipment|Approve exchange|Ap...`

Read , lines 130 to 185
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\dummy-server\\public\\dashboard.html",
  "view_range": [
    130,
    185
  ]
}

Read , lines 295 to 345
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\dummy-server\\public\\dashboard.html",
  "view_range": [
    295,
    345
  ]
}

Read , lines 1 to 110
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\dummy-server\\routes\\internal.js",
  "view_range": [
    1,
    110
  ]
}

Search for `error_injections|order_create_fail|awb_fail|wallet_fail`

Search for `^ ?\*|^export async function GET|CRON_SECRET|authorization|Authorization|find...`

Search for `^import .* from |^import \{`

Search for `cancel-order|cancel/route|/cancel|/inspect|process-refund|/approve|request-re...`

Read , lines 1 to 200
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\returns\\[returnId]\\inspect\\route.ts",
  "view_range": [
    1,
    200
  ]
}

Read , lines 45 to 190
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\returns\\[returnId]\\components\\inspect-return-dialog.tsx",
  "view_range": [
    45,
    190
  ]
}

Read , lines 225 to 325
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\returns\\[returnId]\\components\\sections\\return-review-tab.tsx",
  "view_range": [
    225,
    325
  ]
}

Search for `gatePickupScheduling\(|assertCanDispatch\(|assertShipmentCanMove\(|buildShipr...`

Read , lines 1 to 210
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\shipments\\[shipmentId]\\eway-bill\\route.ts",
  "view_range": [
    1,
    210
  ]
}

Read , lines 310 to 345
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    310,
    345
  ]
}

Read , lines 35 to 130
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\numbering.ts",
  "view_range": [
    35,
    130
  ]
}

Read , lines 210 to 245
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    210,
    245
  ]
}

Read , lines 105 to 143
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\replacement.ts",
  "view_range": [
    105,
    143
  ]
}

Read , lines 1 to 80
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\tax-document-outbox\\route.ts",
  "view_range": [
    1,
    80
  ]
}

Read , lines 1 to 130
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\tax-document-reconcile\\route.ts",
  "view_range": [
    1,
    130
  ]
}

Read , lines 1 to 80
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\reconcile-checkout-provider-orders\\route.ts",
  "view_range": [
    1,
    80
  ]
}

Read , lines 1 to 90
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\reconcile-shipment-creation-attempts\\route.ts",
  "view_range": [
    1,
    90
  ]
}

Read , lines 1 to 105
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\expire-pending-payment-returns\\route.ts",
  "view_range": [
    1,
    105
  ]
}

Read , lines 1 to 145
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\auto-approve-returns\\route.ts",
  "view_range": [
    1,
    145
  ]
}

Read , lines 1 to 140
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\retry-failed-refunds\\route.ts",
  "view_range": [
    1,
    140
  ]
}

Read , lines 1 to 100
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\return-webhook-watchdog\\route.ts",
  "view_range": [
    1,
    100
  ]
}

Read , lines 1 to 105
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\return-refund-sla-escalation\\route.ts",
  "view_range": [
    1,
    105
  ]
}

Read , lines 1 to 115
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\expire-unpaid-orders\\route.ts",
  "view_range": [
    1,
    115
  ]
}

Read , lines 525 to 620
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\pickup-scheduler\\route.ts",
  "view_range": [
    525,
    620
  ]
}

Read , lines 240 to 315
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\pickup-health\\route.ts",
  "view_range": [
    240,
    315
  ]
}

Read , lines 1 to 90
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\upload-sessions-sweeper\\route.ts",
  "view_range": [
    1,
    90
  ]
}

Read , lines 1 to 95
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\cloudinary-orphan-audit\\route.ts",
  "view_range": [
    1,
    95
  ]
}

Read , lines 1 to 145
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\expire-trials-detect-payment-failure\\route.ts",
  "view_range": [
    1,
    145
  ]
}

Read , lines 1 to 105
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\expire-period-ended-subscriptions\\route.ts",
  "view_range": [
    1,
    105
  ]
}

Read , lines 1 to 115
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\notify-ending-subscriptions\\route.ts",
  "view_range": [
    1,
    115
  ]
}

Read , lines 1 to 110
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\downgrade-lifecycle\\route.ts",
  "view_range": [
    1,
    110
  ]
}

Read , lines 1 to 120
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\cleanup-archived-products\\route.ts",
  "view_range": [
    1,
    120
  ]
}

Read , lines 1 to 100
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\refresh-shiprocket-tokens\\route.ts",
  "view_range": [
    1,
    100
  ]
}

Read , lines 1 to 160
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\daily-shipping-digest\\route.ts",
  "view_range": [
    1,
    160
  ]
}

Read , lines 1 to 105
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\reconcile-storage\\route.ts",
  "view_range": [
    1,
    105
  ]
}

Read , lines 1 to 230
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\shipment-creation-attempt-service.ts",
  "view_range": [
    1,
    230
  ]
}

Read , lines 510 to 665
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\returns\\refund-service.ts",
  "view_range": [
    510,
    665
  ]
}

Read , lines 160 to 265
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\dummy-server\\routes\\internal.js",
  "view_range": [
    160,
    265
  ]
}

Search for `serviceability_empty|prepaid_only_couriers|wallet_fail|awb_fail|order_create_...`

Search for `process\.env\.`

Read , lines 3425 to 3465
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\prisma\\schema.prisma",
  "view_range": [
    3425,
    3465
  ]
}

Search for `^(##|###)|Acceptance|acceptance|WP12|WP13|WP14`

Search for `logo|3P-|CA|owner|Open:|Open |Not done|Not covered|defer|Deviation|choices|NO...`

Search for `TODO|FIXME|HACK`

Search for `TODO|FIXME|HACK`

Ran terminal command: rg -o --no-filename 'process\.env\.[A-Z][A-Z0-9_]*' src\lib\tax src\lib\shipping\eway-bill.ts src\lib\shipping\dispatch.ts src\lib\shipping\shiprocket-payload.ts src\lib\billing\invoice\link-token.ts src\lib\billing\invoice\email.ts src\app\api\cron\tax-document-outbox src\app\api\cron\tax-document-reconcile | Sort-Object -Unique

Search for `TODO|FIXME|HACK`

Read , lines 125 to 171
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\numbering.ts",
  "view_range": [
    125,
    171
  ]
}

Read , lines 50 to 100
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\tax-settings-service.ts",
  "view_range": [
    50,
    100
  ]
}

Search for `dedup|already|reminded|last.*[Ss]ent|updateMany|sent|idempoten`

Read , lines 100 to 185
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\07-implementation-roadmap.md",
  "view_range": [
    100,
    185
  ]
}

Read , lines 190 to 269
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\07-implementation-roadmap.md",
  "view_range": [
    190,
    269
  ]
}

Read , lines 270 to 360
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\07-implementation-roadmap.md",
  "view_range": [
    270,
    360
  ]
}

Read , lines 1 to 105
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\billing\\invoice\\link-token.ts",
  "view_range": [
    1,
    105
  ]
}

Read , lines 1 to 145
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\billing\\invoice\\email.ts",
  "view_range": [
    1,
    145
  ]
}

Search for `process\.env\.`

Read , lines 50 to 115
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\orders\\[orderId]\\components\\sections\\order-header.tsx",
  "view_range": [
    50,
    115
  ]
}

Read , lines 50 to 105
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\components\\orders\\cancel-order-dialog.tsx",
  "view_range": [
    50,
    105
  ]
}

Search for `INSPECT:|PROCESS_REFUND:|APPROVE:|Record inspection|Approve request|Process r...`

Search for `shippingService\.cancelOrder|cancelOrder\(|cancelOrderByCustomer|cancelShipme...`

Ran terminal command: rg -n --only-matching 'Bearer|CRON_SECRET|NODE_ENV' src\app\api\cron\tax-document-outbox\route.ts src\app\api\cron\pickup-scheduler\route.ts src\app\api\cron\refresh-shiprocket-tokens\route.ts

Read , lines 165 to 185
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\07-implementation-roadmap.md",
  "view_range": [
    165,
    185
  ]
}

Read , lines 249 to 269
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\07-implementation-roadmap.md",
  "view_range": [
    249,
    269
  ]
}

Read , lines 330 to 370
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\07-implementation-roadmap.md",
  "view_range": [
    330,
    370
  ]
}

Read , lines 100 to 168
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\returns\\returns-settings-schema.ts",
  "view_range": [
    100,
    168
  ]
}

Read , lines 790 to 830
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\returns\\exchange-forward-shipping.ts",
  "view_range": [
    790,
    830
  ]
}

Read , lines 48 to 80
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\returns\\[returnId]\\exchange-bundle\\route.ts",
  "view_range": [
    48,
    80
  ]
}

Read , lines 1025 to 1050
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\checkout\\route.ts",
  "view_range": [
    1025,
    1050
  ]
}

Read , lines 455 to 515
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\page.tsx",
  "view_range": [
    455,
    515
  ]
}

Read , lines 808 to 870
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\page.tsx",
  "view_range": [
    808,
    870
  ]
}

Read , lines 42 to 70
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\shipping\\delivery-charges\\route.ts",
  "view_range": [
    42,
    70
  ]
}

Read , lines 55 to 75
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\auto-ship-service.ts",
  "view_range": [
    55,
    75
  ]
}

Read , lines 345 to 410
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\dummy-server\\public\\dashboard.html",
  "view_range": [
    345,
    410
  ]
}

Read , lines 45 to 125
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\returns\\[returnId]\\components\\return-derived.ts",
  "view_range": [
    45,
    125
  ]
}

Read , lines 100 to 230
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\returns\\refund-service.ts",
  "view_range": [
    100,
    230
  ]
}

Search for `DocumentNotIssuable\(`

Read , lines 1 to 160
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\checkout\\quote\\route.ts",
  "view_range": [
    1,
    160
  ]
}

Read , lines 1 to 200
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\returns\\[returnId]\\process-refund\\route.ts",
  "view_range": [
    1,
    200
  ]
}

Read , lines 1 to 155
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\order\\[orderId]\\cancel\\route.ts",
  "view_range": [
    1,
    155
  ]
}

Read , lines 80 to 185
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\order\\[orderId]\\cancel-by-customer\\route.ts",
  "view_range": [
    80,
    185
  ]
}

Read , lines 1 to 160
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\tax\\settings\\route.ts",
  "view_range": [
    1,
    160
  ]
}

Search for `prefix|Prefix|available|checkPrefix`

Search for `TAX_NOT_READY|TAX_NOT_SELLABLE|PINCODE_STATE_MISMATCH|PLACE_OF_SUPPLY_UNRESOL...`

Search for `threshold-monitor|registration-reminders|tax/reports|tax/export|tax/readiness...`

Search for `RENDER_VERSION|renderVersion|case '2'|v2|renderV2`

"Read" failed
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\document-type.ts",
  "view_range": [
    90,
    160
  ]
}
Tool execution failed: view_range out of bounds

Read , lines 1 to 125
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\returns\\storefront-order-cancel-service.ts",
  "view_range": [
    1,
    125
  ]
}

Read , lines 165 to 250
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\03-complete-tax-rules-matrix.md",
  "view_range": [
    165,
    250
  ]
}

Search for `^## 7|^## §?7|document fields|Document fields|^## .*Document`

Read , lines 160 to 355
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\render\\v1.tsx",
  "view_range": [
    160,
    355
  ]
}

Read , lines 1 to 20
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\render\\index.ts",
  "view_range": [
    1,
    20
  ]
}

Read , lines 95 to 120
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\render\\index.ts",
  "view_range": [
    95,
    120
  ]
}

Read , lines 1 to 89
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\document-type.ts",
  "view_range": [
    1,
    89
  ]
}

Search for `saleDocumentStatus|SALE_DOCUMENT_NOT_ISSUED|Invoice not issued|Document issue...`

Search for `assertCanShipTo|resolveShipToState|PincodeStateMismatch|PlaceOfSupplyUnresolv...`

Search for `BOOKING_IN_PROGRESS|isTaxError|shippingService.cancelOrder|StorefrontOrderCan...`

Ran terminal command: rg -o --no-filename 'process\.env\.[A-Z][A-Z0-9_]*' src\lib\tax src\lib\cloudinary.ts src\lib\otp src\lib\notifications\store src\lib\billing\invoice\link-token.ts src\lib\billing\invoice\email.ts src\app\api\cron\tax-document-outbox src\app\api\cron\tax-document-reconcile | Sort-Object -Unique

Read , lines 1 to 20
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\prisma\\schema.prisma",
  "view_range": [
    1,
    20
  ]
}

Read , lines 35 to 110
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\returns\\refund-service.ts",
  "view_range": [
    35,
    110
  ]
}

Read , lines 92 to 130
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\notes\\tax\\03-complete-tax-rules-matrix.md",
  "view_range": [
    92,
    130
  ]
}

Read , lines 256 to 315
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    256,
    315
  ]
}

Read , lines 500 to 620
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    500,
    620
  ]
}

Read , lines 35 to 57
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\outbox.ts",
  "view_range": [
    35,
    57
  ]
}

Read , lines 145 to 175
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\outbox.ts",
  "view_range": [
    145,
    175
  ]
}

Read , lines 243 to 320
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\outbox.ts",
  "view_range": [
    243,
    320
  ]
}

Read , lines 400 to 540
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\shipping-service.ts",
  "view_range": [
    400,
    540
  ]
}

Read , lines 270 to 345
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\shipments\\route.ts",
  "view_range": [
    270,
    345
  ]
}

Search for `clearEwayBillForOrder\(|clearEwayBillForShipment\(|EWAY_BILL_CLEARED`

Read , lines 365 to 460
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\daily-shipping-digest\\route.ts",
  "view_range": [
    365,
    460
  ]
}

Read , lines 115 to 185
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\notify-ending-subscriptions\\route.ts",
  "view_range": [
    115,
    185
  ]
}

Search for `export async function reconcile|where: \{|status:|lease|take:|RECONCILIATION_...`

Search for `ewayBill(Number|Date|ValidUntil|DocumentNumbers|FromPincode|ToPincode)|consig...`

Read , lines 1 to 160
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\readiness-service.ts",
  "view_range": [
    1,
    160
  ]
}

Read , lines 1 to 100
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\tax\\readiness\\route.ts",
  "view_range": [
    1,
    100
  ]
}

Read , lines 1 to 85
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\snapshots.ts",
  "view_range": [
    1,
    85
  ]
}

Read , lines 95 to 130
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\shipping-service.ts",
  "view_range": [
    95,
    130
  ]
}

Read , lines 928 to 1010
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\corrections\\service.ts",
  "view_range": [
    928,
    1010
  ]
}

Read , lines 200 to 280
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\returns\\[returnId]\\inspect\\route.ts",
  "view_range": [
    200,
    280
  ]
}

Read , lines 1 to 130
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\http.ts",
  "view_range": [
    1,
    130
  ]
}

Read , lines 345 to 425
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    345,
    425
  ]
}

Read , lines 1 to 65
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-schemas.ts",
  "view_range": [
    1,
    65
  ]
}

Search for `taxSettingsPatchSchema|prefix:|PREFIX_PATTERN`

Search for `cronSecret &&|NODE_ENV === 'development'|!secret \|\|`

Search for `process\.env\.`

Search for `tax-documents|documents|reissue|issue-now`

Read , lines 2270 to 2375
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\shipping-service.ts",
  "view_range": [
    2270,
    2375
  ]
}

Read , lines 3190 to 3265
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\shipping-service.ts",
  "view_range": [
    3190,
    3265
  ]
}

Read , lines 3310 to 3375
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\shipping-service.ts",
  "view_range": [
    3310,
    3375
  ]
}

Read , lines 270 to 378
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\auto-ship-service.ts",
  "view_range": [
    270,
    378
  ]
}

Read , lines 1 to 155
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\shipments\\batch\\route.ts",
  "view_range": [
    1,
    155
  ]
}

Read , lines 85 to 135
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\shipments\\request-pickup\\route.ts",
  "view_range": [
    85,
    135
  ]
}

Search for `gatePickupScheduling|retryBatchPickup|createPickupBatch|partitionPickup|asser...`

Search for `ewayBillNumber\s*:|ewaybill_no|buildShiprocketOrderPayload\(`

Search for `pricesIncludeTax|price|inclusive|exclusive`

Find files matching `**\route.ts`

Find files matching `**\*`

Search for `function check|function preview|function schedule|reasons\.push|reason:|Regim...`

Read , lines 140 to 220
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\cleanup-archived-products\\route.ts",
  "view_range": [
    140,
    220
  ]
}

Search for `export (async )?function (GET|POST|DELETE|PUT|PATCH)`

Read , lines 90 to 150
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\shipments\\retry-pickup\\route.ts",
  "view_range": [
    90,
    150
  ]
}

Read , lines 1 to 75
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\shiprocket-api.ts",
  "view_range": [
    1,
    75
  ]
}

Search for `shippingService\.`

Search for `async (batchShip|createShipment|cancelOrder|createPickupBatch|retryBatchPickup)`

Read , lines 26 to 41
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\pickup-scheduler\\route.ts",
  "view_range": [
    26,
    41
  ]
}

Read , lines 55 to 110
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\cron\\return-refund-sla-escalation\\route.ts",
  "view_range": [
    55,
    110
  ]
}

Search for `last|sentAt|idempot|dedup|notifySeller`

Read , lines 1 to 120
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\orders\\[orderId]\\issue-now\\route.ts",
  "view_range": [
    1,
    120
  ]
}

Read , lines 190 to 212
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\numbering.ts",
  "view_range": [
    190,
    212
  ]
}

Search for `taxRegistrationId|supplierSnapshot|saleDocumentStatus|saleDocumentsIssuedAt|c...`

Read , lines 45 to 150
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\geo\\place-of-supply.ts",
  "view_range": [
    45,
    150
  ]
}

Read , lines 729 to 802
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-service.ts",
  "view_range": [
    729,
    802
  ]
}

Read , lines 580 to 630
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    580,
    630
  ]
}

Read , lines 975 to 1045
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\issue.ts",
  "view_range": [
    975,
    1045
  ]
}

Read , lines 145 to 175
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\orders\\[orderId]\\components\\order-details-client.tsx",
  "view_range": [
    145,
    175
  ]
}

Read , lines 3100 to 3145
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\shipping-service.ts",
  "view_range": [
    3100,
    3145
  ]
}

Search for `TODO`

Read , lines 40 to 60
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\components\\product\\size-selector.tsx",
  "view_range": [
    40,
    60
  ]
}

Search for `TODO|FIXME|HACK`

Search for `updateShipmentStatus\(|createCorrection|initiateRefund|markReceived|markPass|...`

Read , lines 325 to 380
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\documents\\outbox.ts",
  "view_range": [
    325,
    380
  ]
}

Read , lines 3140 to 3175
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\shipping-service.ts",
  "view_range": [
    3140,
    3175
  ]
}

Read , lines 75 to 120
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\shipping\\delivery-charges\\route.ts",
  "view_range": [
    75,
    120
  ]
}

Read , lines 60 to 120
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\returns\\[returnId]\\process-refund\\route.ts",
  "view_range": [
    60,
    120
  ]
}

Search for `lock|LOCK|SET NX|nx|processQueue|removeQueue|del\(|release`

Search for `flag|notified|warning|manualReview|status:|updateMany`

Search for `export const (TaxNotReady|TaxNotSellable|ShipToStateNotAllowed|PincodeStateMi...`

Search for `notifySeller\(|lastExpiryReminderDay|warnings_sent|reminder_emails_sent|thres...`

Search for `throw TransitionNotAllowed|export async function setupInitialRegistration|exp...`

Search for `function resolve|throw TaxNotSellable|throw TaxNotReady|function computeOrderTax`

Search for `function normaliseBuyer|function buildCheckoutQuote|throw B2bDetailsMissing|t...`

Search for `async updateShipmentStatus|previousStatus === newStatus|shipment.status === n...`

# Part C — Corrections, dispatch, jobs and errors

**Scope:** source inspection only. No browser flow, provider, database, build or job was run. “UI” below means a control exists in source, not that it was exercised.

## 11. Corrections

| Event | Browser control and entry route | Tax behavior |
|---|---|---|
| Seller cancellation | Order → **Cancel order** → `POST /api/{storeId}/order/{orderId}/cancel`. | Credits all remaining issued sale lines. A paid prepaid order can create a refund leg linked to the correction. With no issued document, there is nothing to credit. A courier-confirmation path waits for the webhook; the seller can force-finalize a pending cancellation. `UI`, `route`, `settlement` |
| Customer cancellation | Order hub → **Cancel order** → `POST /api/{storeId}/order/{orderId}/cancel-by-customer`. | Calls the same shipping cancellation service, with narrower customer eligibility. Its response maps an active-booking refusal into the storefront cancellation error format. `Storefront control`, `route`, `service` |
| Return inspection | Admin return → **Record inspection** → **Submit inspection**; `POST /api/{storeId}/returns/{returnId}/inspect`. For partial refund, use **Process refund** → `POST .../process-refund`. | Full pass/refund initiates a refund; partial inspection waits for the seller’s refund decision. Accepted exchange units are credited during inspection. Inspection can return success even when the subsequent refund or exchange-credit call fails; those failures are logged. `controls`, `inspect route`, `process route` |
| RTO delivered | Dummy dashboard shipment **Force** selector can send `RTO DELIVERED` through `/api/webhook/shiprocket`. | The status handler requests an RTO correction for a **forward** shipment’s remaining sale balance. A failed credit is logged by the webhook-driven handler. `dummy control`, `webhook`, `handler` |
| Exchange | Admin return → **Approve**, then **Record inspection**; fulfillment controls include **Ship exchange item** or **Create exchange**. | Approval freezes the replacement snapshot. Accepted returned units receive a correction. Replacement sale issuance is attempted on approval if already paid, after difference payment, or at dispatch. `controls`, `approval and credit`, `replacement dispatch` |
| Re-issue | Order → Billing → **Re-issue invoice**, with OTP; `POST /api/{storeId}/orders/{orderId}/reissue`. | Credits the current set under its original identity, issues a new set and clears forward-shipment e-way bill records in the transaction. `UI`, `service` |

| Computation / idempotency | Code behavior |
|---|---|
| Original-line limits | Under an order row lock, remaining quantity, gross, taxable value and each component are original amounts less earlier `TaxCorrectionLine` sums. Requests beyond remaining gross or quantity raise `CREDIT_EXCEEDS_BALANCE`. `service`, `credit builder` |
| Final remainder | A credit equal to remaining gross takes the exact remaining taxable amount and components. Partial credits use the original rate/split, with components bounded by their remaining balances. `credit builder` |
| Fees | Restocking fee is deducted before item refund. Unwaived reverse-shipping fee is netted from item, then COD fee, then shipping credit. Refundable COD fee comes from `order.codCharge`, with a one-time refund marker. `refund calculation`, `credit allocation`, `marker` |
| Repeat events | Unique `sourceKey` returns the first correction for a repeated event; one credit note is made for each original document affected. A zero-gross correction creates no correction row. `createCorrectionTx`, `schema` |
| Note nature | A taxable GST original whose registration remains in force gets a GST credit note; other originals get a commercial credit note under the original identity. `decideNoteNature`, `note creation` |

## 12. Dispatch and Shiprocket

| Gate | Actual check / UI |
|---|---|
| Booking order | Open order → allowed destination State → active registration → pickup State matches registration, if a pickup address was supplied → invoice exists, issuing COD first when enabled → invoice GSTIN/regime is not stale. An unissued prepaid invoice blocks shipping. `checkOrder` |
| Failed prepaid preparation | The order UI hides **Ship order** when a prepaid sale is not `ISSUED`, and shows **Invoice not issued**. The Billing card exposes **Issue invoice now** when eligible. `order UI`, `Billing card` |
| Stale identity | Staleness compares the issued documents’ **GSTIN and regime** with the active registration, not registration row ID alone. The re-issue action is available before physical removal when eligible. `isSaleSetStale` |
| E-way bill | Sum of current sale-set grand totals must be **strictly above** the limit. The current State master sets every intra-State override to `null`, so ₹50,000 is the current fallback for all States; the master marks these values provisional. Inter-State uses the national value. `limit`, `State master` |
| Validity and consignment | Above the limit, a bill must cover current document numbers and pincodes and remain valid at the pickup slot. A date-only validity ends at 23:59:59 IST; the route requires 12 digits and validity after both bill date and now. `check`, `save route` |
| Recheck points | Pickup request, pickup batches, retry and scheduler use the pickup gate. Existing forward shipments are also checked for courier assignment/AWB and drop-off; e-way bill checking is requested for handover. Blocked pickup candidates are marked failed with their reason. `gate`, `pickup request`, `scheduler`, `drop-off` |
| Clearing / changes | Re-issue and courier reassignment clear the stored bill. A changed pincode or invoice number is also detected at handover. Manual shipping refuses a delivery-pincode override. A separate address-change **clear** operation was **NOT FOUND** in the inspected references. `re-issue`, `reassignment`, `manual shipping` |
| Booking claim | Shipment creation has a five-minute lease and a provider order reference; an active claim blocks cancellation. Existing provider evidence can be recovered rather than blindly creating another order. `claim`, `recovery` |

### Payload

| Path | Fields and qualification |
|---|---|
| Automatic, manual Shiprocket and batch | The same builder sends issued-document goods lines: name, SKU, quantity, HSN, rate percent, inclusive line-total-per-unit as `selling_price`, and zero discount. It sends `shipping_charges`, `transaction_charges`, the main invoice number, and customer GSTIN for B2B. `sub_total` is collectable less the two charges; COD collectable is `codAmount` or, if absent, order total. `builder`, `auto`, `manual`, `batch` |
| E-way bill in payload | Builder supports optional `ewaybill_no`; neither of its two inspected callers supplies `ewayBillNumber`. `builder`, `callers` |
| Pickup scheduler | Schedules already-created shipments; it does not build the initial order payload. `scheduler` |
| Real Shiprocket interpretation | Whether it adds `tax` on top of the selling price, derives COD as expected, and accepts the invoice length remains **NOT FOUND** as verified provider behavior. `payload comment`, `progress` |

## 13. Cron routes and dummy controls

All paths below are `GET /api/cron/{name}`. The schedule column is copied from `vercel.json`; “—” means no entry there. The dummy **Cron Triggers** page lists the 20 configured jobs, but not the two unscheduled routes. `dummy cron list`

The routes normally compare `Authorization: Bearer <CRON_SECRET>`. Exceptions: pickup scheduler, pickup health and daily digest allow a request when `CRON_SECRET` is absent; Shiprocket refresh bypasses the check in development. Upload sweeper and orphan audit explicitly require a nonempty secret. `scheduler`, `health`, `digest`, `refresh`, `sweeper`

“State filter” below describes a sequential rerun guard, **not** a guarantee for concurrent runs.

| Route | Schedule | Scans / repeat behavior |
|---|---|---|
| `tax-document-outbox` | `*/5 * * * *` | Due PDFs and deliveries; leased and fenced DB completion. External email exactly-once is not guaranteed by the fence. |
| `tax-document-reconcile` | `15 * * * *` | Paid prepaid orders with missing documents; issuance key dedupes; removed-order alert uses a unique reminder key. |
| `expire-trials-detect-payment-failure` | `0 2 * * *` | Expired trials and overdue active paid subscriptions; status changes remove processed rows from the same state filter. |
| `expire-period-ended-subscriptions` | `0 3 * * *` | Ended completing/canceled subscriptions; status changes to expired. |
| `notify-ending-subscriptions` | `30 9 * * *` | Ending subscriptions; last-reminder day bucket skips sequential repeats. |
| `downgrade-lifecycle` | `0 4 * * *` | Scheduled downgrades and grace enforcement; reminder dates are stored in metadata. |
| `cleanup-archived-products` | `0 5 * * 0` | Expired archives; deletes archive rows and queues image deletion. |
| `refresh-shiprocket-tokens` | `0 6 * * *` | Stores with expiring tokens; after refresh they normally leave the candidate window. Concurrent idempotency: **NOT FOUND**. |
| `pickup-scheduler` | `0 8-20 * * *` | Ready pickup queues; per-queue Redis lease and dispatch gate. |
| `pickup-health` | `30 8 * * *` | Orphaned queued shipments, stale batches and queue integrity; health actions depend on current state. |
| `daily-shipping-digest` | `45 14 * * *` | Active stores’ shipping activity; no per-day send dedupe was **FOUND** in the handler. |
| `reconcile-shipment-creation-attempts` | `*/10 * * * *` | Unresolved provider booking attempts; lease and provider-order recovery. `service` |
| `reconcile-checkout-provider-orders` | `*/5 * * * *` | Unresolved checkout-provider attempts; recovery lease and status checks. `service` |
| `expire-unpaid-orders` | `*/5 * * * *` | Stale unpaid prepaid orders and eligible expired checkout attempts; processed orders change state. |
| `expire-pending-payment-returns` | `*/30 * * * *` | Exchange-difference returns pending payment over 24 hours; cancellation changes state. |
| `auto-approve-returns` | `*/30 * * * *` | Eligible requested returns; atomic one-shot `autoApproveAttempted` claim. |
| `retry-failed-refunds` | `*/15 * * * *` | Failed Razorpay refund legs; skips live sibling, dedupes scope within the run, caps attempts at three. |
| `return-refund-sla-escalation` | `0 * * * *` | Pending manual COD refunds at 24/48/72-hour age buckets. No sent marker is written; a second run in the same bucket can send again. |
| `return-webhook-watchdog` | `0 */6 * * *` | Stale processing refunds and picked-up returns; refund settlement helpers act on still-processing legs. |
| `reconcile-storage` | `0 6 * * 0` | Compares catalog-row byte sums with storage counters; corrects drift above its threshold. |
| `upload-sessions-sweeper` | — | Expired upload sessions and queued deletes; Redis lock, with idempotent work claimed by the source comment. |
| `cloudinary-orphan-audit` | — | Unreferenced images; report by default, optionally enqueue deletes; Redis lock. |

### Dummy-server fault injections

These switches remain active until toggled off; their UI says “Next,” but the route checks the stored switch on each request. `dashboard`, `toggle route`

| Switch | Simulates | Source |
|---|---|---|
| `order_create_fail` | Shiprocket order-create failure. | `orders.js` |
| `awb_fail` | AWB assignment failure. | `courier.js` |
| `wallet_fail` | Insufficient-wallet pickup response. | `courier.js` |
| `serviceability_empty` | No serviceable couriers. | `courier.js` |
| `prepaid_only_couriers` | Serviceability without COD couriers. | `courier.js` |

A deterministic **prepaid tax-issuance failure** or **tax outbox failure** switch was **NOT FOUND** among these. The dashboard can send another Shiprocket status event using **Force**; a Razorpay payment-webhook replay control was **NOT FOUND**. `dummy statuses`, `webhook construction`

## 14. Full tax-error factory

Tax errors serialize as `{ code, message, details }`, but some surrounding routes use a different response shape. `TaxError`

**Path abbreviations**

- **Quote:** `POST /api/{storeId}/checkout/quote`; **checkout:** `POST /api/{storeId}/checkout`. `quote route`
- **Settings:** `PATCH /api/{storeId}/tax/settings`; **transition:** `POST /api/{storeId}/tax/registration/transitions`. `settings route`, `transition service`
- **Dispatch:** shipment creation or pickup/drop-off routes described in §12. **Refund:** `POST /api/{storeId}/returns/{returnId}/process-refund`. `dispatch`, `refund route`

| Code | HTTP | Exact factory message | Trigger / browser reachability |
|---|---:|---|---|
| `TAX_NOT_READY` | 409 | “Some items are temporarily unavailable.” | Quote/checkout for registered seller’s unready product; product changes can affect a cart. `source` |
| `TAX_NOT_SELLABLE` | 409 | “This price is not allowed for this item.” | Quote engine’s inclusive threshold dead zone; product editing also validates prices but may use a different validation response. `source` |
| `SHIP_TO_STATE_NOT_ALLOWED` | 422 | “This seller delivers only within {stateName}.” | Delivery-pincode check or quote for disallowed State. `source` |
| `PINCODE_STATE_MISMATCH` | 422 | “Please check your pincode and State.” | Quote’s selected State conflicts with directory. Normal checkout constrains the State selector; a normal-control trigger was **NOT FOUND**. `source` |
| `PLACE_OF_SUPPLY_UNRESOLVED` | 422 | “Please check your pincode and State.” | Quote for unknown directory pincode or unresolved multi-State choice. Browser outcome depends on delivery-serviceability allowing the quote to be requested. `source` |
| `B2B_STATE_MISMATCH` | 422 | “GST invoice is available only when delivering to the GSTIN's State. Continue without GST invoice?” | Quote with buyer GSTIN State different from delivery State. `source` |
| `B2B_NOT_AVAILABLE` | 422 | “GST invoice not available for this store.” | Quote with buyer data when B2B is disabled or blocked. Normal UI hides/disables the choice in that state; a normal-control trigger was **NOT FOUND**. `source` |
| `INVALID_GSTIN` | 400 | “Invalid GSTIN. Please check the 15-character number and try again.” | Quote buyer GSTIN validation; frontend validation may stop the request first. `source` |
| `B2B_DETAILS_MISSING` | 400 | “Legal company name is required when claiming a GST invoice.” **or** “Registered billing address (line1, city, state, pincode) is required for a GST invoice.” | Quote buyer details; frontend may stop submission first. `source` |
| `QUOTE_TOKEN_REQUIRED` | 400 | “Review your order total before paying.” | Checkout token missing, malformed, tampered or for another store. Normal checkout sends a token; a normal-control way to omit it was **NOT FOUND**. `source` |
| `QUOTE_CHANGED` | 409 | “Prices were updated. Please review your total.” | Expired token or changed quote fingerprint at checkout. `source` |
| `PICKUP_STATE_MISMATCH` | 422 | “Pickup address State must match your GST registration State.” | Dispatch/pickup with a mismatched or invalid pickup address. `source` |
| `EWAY_BILL_REQUIRED` | 409 | “Enter the e-way bill number for orders above ₹50,000.”; or “The e-way bill expires before the pickup. Enter a new e-way bill.”; or “The consignment changed after the e-way bill was entered. Enter a new e-way bill.” | Pickup/drop-off gate for missing, expired or changed consignment. `source` |
| `TRANSITION_NOT_ALLOWED` | 409 | “This registration change is not allowed yet.” | Setup, transition, scheduled-change deletion or settings eligibility; specific refusal is in `details.reasons`. `source` |
| `TAX_IDENTITY_MISSING` | 409 | “Set up your GST status in Settings → Billing & Tax first.” | Quote, known-pincode scope, issue or dispatch without an active registration. `source` |
| `PREFIX_LOCKED` | 409 | “The prefix cannot change after the first invoice of this financial year.” | Settings update after issue; normal UI locks the field, so a normal-control trigger was **NOT FOUND**. `source` |
| `PREFIX_TAKEN` | 409 | “This prefix is already in use.” | Settings write races an already-claimed prefix; live check normally blocks Save first. `source` |
| `PREFIX_UNAVAILABLE` | 409 | Default: “This invoice prefix cannot be used.” Overrides include “This prefix is reserved.” and “No invoice prefix could be derived from the store name. Please type one.” | Reserved/invalid prefix or exhausted automatic candidates. Live check returns `{ available, reason }` rather than this error code; deterministic normal-control factory trigger **NOT FOUND**. `source` |
| `STALE_REGISTRATION_AT_DISPATCH` | 409 | “Your GST registration changed after this invoice. Re-issue or cancel the order.” | Dispatch after GSTIN/regime change. `source` |
| `CREDIT_EXCEEDS_BALANCE` | 409 | “Credit exceeds the remaining balance.” | Refund/correction exceeds original remaining quantity or gross. A normal UI control for entering an arbitrary over-credit was **NOT FOUND**; partial-refund route can propagate it if reached. `builder`, `route` |
| `BOOKING_IN_PROGRESS` | 409 | “Shipment is being booked. Try again in a minute.” | Cancel during an active booking claim. Timing-dependent browser race; customer cancellation converts it to its own response shape. `source`, `customer mapping` |
| `DOCUMENT_NOT_ISSUABLE` | 409 | Caller-supplied; examples and full inspected variants below. | Issue-now, dispatch, e-way bill, re-issue and replacement issue. `factory` |
| `DOCUMENT_ISSUE_FAILED` | 500 | “Document issue failed; it will be retried.” | Number formatter detects an invalid generated number; normal UI trigger **NOT FOUND**. Settlement’s safe wrapper logs/marks failure rather than returning this factory body to checkout. `formatter`, `safe wrapper` |

**Inspected `DOCUMENT_NOT_ISSUABLE` messages:**

| Context | Exact message |
|---|---|
| Missing order / exchange | “Order not found.” / “Exchange not found.” `issue` |
| Issue closed / unpaid / already removed | “This order is cancelled or closed, so no invoice is issued.” / “The invoice is issued once the payment is received.” / “This order has already been shipped. An invoice cannot be issued after the goods left; ask your tax advisor.” `issue` |
| Dispatch | “This order is cancelled or closed, so it cannot be shipped.” / “Invoice not issued. Issue the invoice before shipping this order.” `dispatch` |
| E-way bill | “Invoice not issued. Issue the invoice before entering an e-way bill.” `route` |
| Re-issue | “This order is cancelled or closed, so its invoice cannot be re-issued.” / “This order has already been shipped, so its invoice cannot be re-issued.” / “This order has no invoice to re-issue.” / “Your GST registration has not changed since this invoice was issued.” `route`, `service` |
| Exchange replacement | “This exchange was cancelled, so no invoice is issued.” / “The replacement item of this exchange is not selected.” / “The replacement product is no longer available.” `issue`, `snapshot` |

## 15. Prisma and environment names

### Models and uniqueness

| Models | Primary/unique constraints relevant to tax |
|---|---|
| `StoreTaxRegistration`, `StoreTaxSettings`, `StoreTaxYearDeclaration`, `TaxReminderLog` | Registration has ID only plus non-unique GSTIN/PAN indexes; settings primary key is `storeId`; declaration unique `(storeId, financialYear)`; reminder unique `(storeId, key)`. `schema` |
| `DocumentPrefix`, `DocumentSeries`, `TaxDocument` | Prefix globally unique; series unique `(prefixId, kind, financialYear)`; document number and issue key individually unique, plus `(seriesId, sequence)`. `schema` |
| `TaxCorrection`, `TaxCorrectionLine`, `TaxDocumentLine`, `TaxDocumentDelivery` | Correction `sourceKey` unique; document line unique `(documentId, lineNo)`; correction-line and delivery models have IDs and indexes but no additional unique pair shown. `schema` |
| `OrderCharge`, `TaxCatalogueVersion`, `HsnCode`, `GstRateRule`, `Pincode`, `SaasBillingProfile` | Charge unique `(orderId, kind)`; catalogue label unique; HSN unique `(catalogueVersionId, code)`; rate rule has ID and index; pincode and SaaS profile use `pincode` and `userId` as primary keys. `schema` |
| Existing-model links | Product/archive carry tax data; Order and OrderItem hold checkout snapshots; Shipment holds e-way bill fields; RefundLeg links a correction; ExchangeDetail holds replacement snapshot. `schema` |

### Tax enums

| Enum | Values |
|---|---|
| `GstRegime` | `UNREGISTERED`, `REGULAR`, `COMPOSITION` |
| `BusinessConstitution` | `INDIVIDUAL_OR_PROPRIETOR`, `PARTNERSHIP`, `LLP`, `PRIVATE_LIMITED`, `PUBLIC_LIMITED`, `ONE_PERSON_COMPANY`, `HUF`, `TRUST_OR_SOCIETY`, `OTHER` |
| `TaxRegistrationChangeReason` | `ONBOARDING`, `GST_REGISTERED`, `COMPOSITION_OPT_IN`, `COMPOSITION_EXIT_VOLUNTARY`, `COMPOSITION_EXIT_FORCED`, `REGISTRATION_CANCELLED`, `NEW_GSTIN`, `IDENTITY_CHANGE` |
| `AatoTier` | `UP_TO_1_5_CR`, `UP_TO_5_CR`, `ABOVE_5_CR` |
| `Taxability`; `RateMode`; `RateCondition`; `RateRuleVerification`; `CatalogueStatus` | `TAXABLE/NIL_RATED/EXEMPT/NON_GST`; `CATALOGUE/MANUAL`; `NONE/PER_PIECE_VALUE_THRESHOLD`; `OFFICIAL_LOAD/CA_VERIFIED/UNVERIFIED`; `DRAFT/PUBLISHED/RETIRED` |
| `ChargeAllocationMethod`; `MixedCartDocumentMode`; `SupplyType`; `ThresholdOutcome`; `ChargeKind` | `PROPORTIONAL_TO_VALUE/HIGHEST_RATE_LINE`; `SPLIT_DOCUMENTS/INVOICE_CUM_BILL_OF_SUPPLY`; `INTRA_STATE/INTER_STATE/NONE`; `NOT_APPLICABLE/LOW/HIGH`; `SHIPPING/COD_FEE/OTHER` |
| `TaxDocumentType`; `DocumentSeriesKind` | Types: `TAX_INVOICE`, `BILL_OF_SUPPLY`, `INVOICE_CUM_BILL_OF_SUPPLY`, `COMMERCIAL_INVOICE`, `CREDIT_NOTE`, `DEBIT_NOTE`, `RECEIPT_VOUCHER`, `REFUND_VOUCHER`. Series: `INVOICE`, `BILL_OF_SUPPLY`, `COMMERCIAL`, `CREDIT_NOTE`, `DEBIT_NOTE`, `RECEIPT_VOUCHER`, `REFUND_VOUCHER`. |
| `TaxDocumentTrigger`; `SaleDocumentStatus`; `SaleSetMember` | `PAYMENT_SETTLED/DISPATCH_COMMIT/ISSUE_NOW/CORRECTION/EXCHANGE/RECONCILE`; `PENDING/ISSUED/FAILED`; `MAIN/BOS` |
| `TaxCorrectionKind`; `NoteNature`; `DocumentLineKind` | `CANCELLATION/RTO/RETURN/EXCHANGE_RETURN/REISSUE`; `GST_CREDIT_NOTE/COMMERCIAL_CREDIT_NOTE`; `GOODS/SHIPPING/COD_FEE/OTHER_CHARGE` |
| `ArtifactStatus`; `DeliveryChannel`; `DeliveryStatus` | `PENDING/STORED/FAILED`; `EMAIL`; `PENDING/SENT/FAILED/SKIPPED_NO_PROVIDER` |

Source for all enum values: `schema.prisma`.

| Environment names | Where read |
|---|---|
| `QUOTE_TOKEN_SECRET`, `NODE_ENV` | Direct quote-token code. `quote-token.ts` |
| `CRON_SECRET` | Tax cron routes. `outbox route` |
| `INVOICE_TOKEN_SECRET`, `NEXT_PUBLIC_APP_URL` | Customer document-link helper. `link-token.ts` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Shared Cloudinary client used for PDF storage. `cloudinary.ts` |
| `OTP_HMAC_SECRET`, `FAST2SMS_API_KEY`, `RESEND_API_KEY` | Shared OTP and platform dispatchers. `otp-core.ts`, `platform dispatcher` |
| `DATABASE_URL`, `REDIS_URL`, `SHIPROCKET_API_BASE_URL` | Shared database, pickup queue and courier infrastructure. `schema`, `Redis`, `Shiprocket` |

## 16. Comments, limitations and roadmap differences

### TODO / FIXME / HACK

Search scope: tax library and tax UI, related checkout/shipping/returns APIs and services, storefront source, and dummy routes. No matching TODO/FIXME/HACK was found under the tax library or inspected tax UI components.

| Comment location | Recorded TODO |
|---|---|
| `auto-ship-service.ts` | `TEST_MODE` is true; auto-ship delay is forced to one minute. |
| `pickup-scheduler` | `TEST_MODE` is true for two-minute pickup batching. |
| `delivery-charges route` | Obtain package dimensions from cart items. |
| `checkout API` | Storefront handling of gateway error codes. |
| `storefront checkout` | Prepaid and COD phone-OTP send/verification calls are TODO; current verification flags are `true`. A separate TODO says to use the real store name. |
| `returns-settings-schema.ts` | Re-exchange chain is not wired; post-submit remedy conversion has no endpoint; exchange shortfall threshold is not read. |
| `exchange-bundle route` | Replacement requests currently read exchange flow mode instead of replacement flow mode. |
| `exchange-forward-shipping.ts` | Simultaneous exchange pickups are not batched; scale follow-up is TODO. |
| `size-selector.tsx` | Size-guide modal TODO in storefront product component. |

### Limitations recorded in progress

| Recorded limitation / open check | Evidence |
|---|---|
| No onboarding tax step; initial identity is entered in Billing & Tax. | `progress`, `setup schema` |
| Replacement exchange invoice is not credited if that exchange is later canceled; chained returns skip credit with a warning. | `progress`, `chained-return guard` |
| Webhook-driven cancel credit/refund failure is logged; customer-cancel preview does not show the booking-in-progress condition; changing the passed quantity after the first partial correction keeps that correction. | `progress`, `correction lookup` |
| Logo is not copied into an immutable asset and v1 does not render it. | `progress`, `v1 renderer` |
| Official pincode source and official/CA-checked rate catalogue remain owner/CA checks in the log; State classes and e-way limits are provisional. The checked-in catalogue is recorded as a development sample. | `progress`, `catalogue`, `State master` |
| Shiprocket payload semantics remain unverified; courier weight selection and COD-remittance/insurance fields are outside this tax change. | `progress`, `roadmap` |
| Progress records deferred UI acceptance, an eight-error TypeScript baseline on 1 November, and an incomplete manual guide. Current build or browser status: **NOT FOUND**; none was run in this audit. | `progress`, `guide entry` |
| The legal-source log records unresolved primary-source/CA checks for several rates, place of supply, pickup State, document rules and composition. | `progress`, `CA list` |

### Demonstrated differences from roadmap acceptance

| Roadmap expectation | Inspected implementation |
|---|---|
| Issued document lines equal the checkout quote. | Issue recomputes with the registration and catalogue rule active at issue time; equality of tax components is not assured solely by the checkout snapshot. `roadmap`, `issue` |
| PDF v1 prints every listed field. | Tax-table branch does not print discount; non-tax notes do not print place of supply or reverse-charge text, although the field matrix lists those for credit notes. `roadmap`, `field matrix`, `renderer` |
| Two concurrent outbox calls send once. | Claims fence database completion, but the external email is sent before that completion; the code does not establish exactly-once external delivery after a lease loss/crash. `roadmap`, `outbox` |
| Five listed retry delays include 12 hours. | The fifth failure is terminal, so only 1, 5, 30 and 120-minute delays are scheduled by this loop. `roadmap`, `outbox` |
| Address change clears the e-way bill. | Re-issue and reassignment clear it; handover detects a changed pincode. An address-change clearing call was **NOT FOUND** in inspected references. `roadmap`, `check` |
| Reports, threshold/registration reminder jobs, full readiness and export. | Tax readiness route currently returns product readiness; report/export routes and the two named tax cron routes were **NOT FOUND** in the inspected route tree. `roadmap`, `readiness route` |
| Closing sweep and redesigned v2 template. | Progress records the closing work as future; renderer recognizes only version `1`. `roadmap`, `renderer switch` |

A complete, executed comparison of **every** roadmap acceptance item against the running application is **NOT FOUND**; the table lists the source-level differences established in this audit.