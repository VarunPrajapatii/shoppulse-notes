Read-only task. Do NOT change any file, schema, or DB. Do NOT run the app or any build.
Plain language, no planning IDs (WP/D-/R-/B-). Give the file path for each answer.
Say "NOT VERIFIED" if you can't prove something from code.

1. PRODUCT FORM tax section: every field, label, help text, placeholder, validation message,
   and what the live preview and readiness chip say in each state. Include "Find HSN" behaviour,
   the manual-rate confirmation tick, and the exact text when a price falls in the dead zone.

2. RATE RESOLUTION: step by step, how the code finds a product's rate. What exactly happens
   when (a) no catalogue is published, (b) the longest rule is UNVERIFIED, (c) no rule matches.
   What does the seller see in each case?

3. ENGINE: read the calculation code and show, by reading only (no running), the exact numbers
   for: 79900 paise at 500 bps intra-State; same inter-State; 118000 paise at 1800 bps.
   Confirm the rounding method. Confirm how pieces-per-unit feeds the per-piece threshold.

4. QUOTE API: the exact request and response fields, token lifetime, and every condition that
   returns QUOTE_CHANGED. What happens if the quote is requested for a COD order vs prepaid?

5. STORAGEFRONT TEXT: the exact wording on product page, cart and checkout for each regime
   (unregistered, regular, composition), including the B2B form fields and error messages.

6. CHARGES: where shipping and COD fee amounts come from, where each is taxed, and the exact
   seller-facing setting texts (including the allocation option).

7. ORDER RECORD: which fields are frozen on Order, OrderItem and the charge rows, and the exact
   labels on the admin order page ("Estimated GST" etc.).

8. LEFTOVERS: list any place in either repo that still does its own tax or total maths outside
   the shared tax calculator, or still mentions the old HSN catalogue or old rates.













I’ll trace the implementation and its visible text without changing files, querying the database, or running the application. I’ll distinguish code-proven behavior from anything I can’t verify.

Delegated task

Search for `HSN|GST|tax|Tax|catalogue|Catalogue|unverified|Unverified|Find HSN|manual`

Find files matching `src/**/*.{tsx,ts,jsx,js}`

Delegated task

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-form.tsx"
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-tax-compliance.tsx"
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\products\\[productId]\\route.ts"
}

Search for `hsn|HSN|taxStatus|taxCode|gstRate|taxRate|catalog`

Delegated task

Search for `QUOTE_CHANGED|quote|tax|GST|igst|cgst|sgst|bps|COD|prepaid|token`

Search for `79900|118000|500|1800|quote`

Delegated task

Search for `Find HSN|HSN|Catalogue|catalogue|Unverified|No match|manual confirmation|Conf...`

Find files matching `src/**/*tax*`

Search for `productTax|taxCode|hsnCode|taxRate|taxStatus|taxSource|catalogue`

Search for `storefront|Storefront|composition|Composition|unregistered|regular regime|B2B...`

Find files matching `**/*store*`

Search for `https?://[^\s)]+|github.com/[^\s)]+`

Ran terminal command: Get-ChildItem -Force D:\study | Select-Object Name,FullName,Mode; git status --short

Search for `HSN|hsn|GST|gst|taxRate|taxAmount|tax_amount|taxable|calculateTax`

Read , lines 1 to 180
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-tax-compliance.tsx",
  "view_range": [
    1,
    180
  ]
}

Read , lines 180 to 680
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-tax-compliance.tsx",
  "view_range": [
    180,
    680
  ]
}

Read , lines 1 to 300
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    1,
    300
  ]
}

Read , lines 1 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\resolve-rate.ts",
  "view_range": [
    1,
    260
  ]
}

Search for `QUOTE_CHANGED|quoteToken|quote_token|taxQuote|quoteId|quote`

Search for `compute.*tax|tax.*bps|taxRateBps|rateBps|per.?piece|piece|COD|prepaid`

Find files matching `src/app/api/**/*.ts`

Search for `COD|cod|shippingCharge|shipping_charge|deliveryCharge|delivery_charge|tax|all...`

Search for `Shipping|COD|Delivery|charges|Charge|Order Items|order items`

Search for `shipping|cod|delivery|charge|tax`

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\storefront-agent.md"
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\directory-tree\\___shoppulsestore_src_26_oct_2026.md"
}

Search for `storefront|regime|composition|B2B|GSTIN|checkout|cart`

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\compute.ts"
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts"
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote-token.ts"
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\checkout\\quote\\route.ts"
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\types.ts"
}

Read , lines 350 to 646
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-tax-compliance.tsx",
  "view_range": [
    350,
    646
  ]
}

Search for `evaluateTaxReadiness|deadZoneMessage|readinessChipText|interface CatalogueLoo...`

"Read" failed
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\tax\\hsn\\[hsn]\\rate\\route.ts"
}
Tool execution failed: Path does not exist

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\tax\\hsn\\search\\route.ts"
}

Search for `codChargeAmount|shippingCharge|codAmount|delivery-charges|shippingSettings`

Search for `codChargeAmount|codAutoShipEnabled|codEnabled|shippingCharge|taxAmount|totalA...`

Search for `model Order|model OrderItem|model StoreShippingSettings|model Payment`

Search for `product|cart|checkout|B2B|GSTIN|composition|unregistered|regular`

Search for `product|cart|checkout|B2B|GSTIN|composition|unregistered|regular`

Search for `"(error|code|message)"|B2B|GSTIN|composition|unregistered|REGULAR|UNREGISTERED`

Search for `function |Math\.|threshold|PER_PIECE|rateBps|INTRA_STATE|INTER_STATE`

Read , lines 1 to 220
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    1,
    220
  ]
}

Find files matching `src/app/api/tax/**/route.ts`

Read , lines 390 to 470
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    390,
    470
  ]
}

Read , lines 340 to 620
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    340,
    620
  ]
}

Read , lines 380 to 450
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\checkout\\route.ts",
  "view_range": [
    380,
    450
  ]
}

Read , lines 560 to 840
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\checkout\\route.ts",
  "view_range": [
    560,
    840
  ]
}

Read , lines 190 to 310
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-form.tsx",
  "view_range": [
    190,
    310
  ]
}

Read , lines 850 to 925
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\products\\[productId]\\route.ts",
  "view_range": [
    850,
    925
  ]
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\delivery-charge-service.ts"
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\shipping-charge-policy.ts"
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\components\\shipping\\settings\\checkout-charges-section.tsx"
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\orders\\[orderId]\\components\\sections\\billing-tab.tsx"
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\checkout\\route.ts"
}

Read , lines 567 to 690
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\prisma\\schema.prisma",
  "view_range": [
    567,
    690
  ]
}

Read , lines 1 to 190
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\directory-tree\\___shoppulsestore_src_26_oct_2026.md",
  "view_range": [
    1,
    190
  ]
}

Read , lines 1 to 145
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\errors.ts",
  "view_range": [
    1,
    145
  ]
}

Read , lines 55 to 110
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\checkout\\route.ts",
  "view_range": [
    55,
    110
  ]
}

Read , lines 1 to 20
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    1,
    20
  ]
}

Read , lines 1 to 175
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\compute.ts",
  "view_range": [
    1,
    175
  ]
}

Read , lines 210 to 280
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\compute.ts",
  "view_range": [
    210,
    280
  ]
}

Read , lines 331 to 455
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\compute.ts",
  "view_range": [
    331,
    455
  ]
}

Read , lines 812 to 990
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\checkout\\route.ts",
  "view_range": [
    812,
    990
  ]
}

Search for `parseProductTaxWrite|TAX_NOT_SELLABLE|taxConfirmedAt|taxReviewRequired`

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\tax\\hsn\\[code]\\rate\\route.ts"
}

Search for `COD|shipping|delivery|allocation|tax`

Search for `codCharge|shippingCost|taxTotal|chargeAllocation|subtotal|totalAmount|Order I...`

Search for `codCharge|shippingCost|taxTotal|chargeAllocation|resolveShippingCharge|calcul...`

Read , lines 540 to 646
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-tax-compliance.tsx",
  "view_range": [
    540,
    646
  ]
}

Search for `regime|COMPOSITION|UNREGISTERED|B2B|GST invoice|GSTIN`

Search for `buyer|B2B|GSTIN|quoteToken|error|message`

Search for `storefront.*repo|repository|github|ShopPulseStore|shoppulsestore`

Ran terminal command: Get-ChildItem -Force D:\study -Directory | Select-Object -ExpandProperty FullName

Search for `(gst|tax|shipping|cod|total|subtotal).{0,80}(\*|\+|\/|Math\.(round|floor|ceil...`

Search for `hsn.?code|hsn.?catalog|hsn.?master|gst.?rates|tax.?rates|GST_RATES|HSN_CODES`

Read , lines 70 to 235
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\components\\shipping\\settings\\checkout-charges-section.tsx",
  "view_range": [
    70,
    235
  ]
}

Read , lines 340 to 525
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    340,
    525
  ]
}

Read , lines 125 to 185
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\order-snapshot.ts",
  "view_range": [
    125,
    185
  ]
}

Read , lines 50 to 100
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\orders\\[orderId]\\components\\sections\\billing-tab.tsx",
  "view_range": [
    50,
    100
  ]
}

Read , lines 75 to 115
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\checkout\\route.ts",
  "view_range": [
    75,
    115
  ]
}

Read , lines 646 to 710
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    646,
    710
  ]
}

Search for `Subtotal|Shipping|COD|Tax|Total|GST|Order items|Items`

Search for `model OrderItem|model OrderCharge|model StoreShippingSettings`

Search for `allocation|PROPORTIONAL|shipping|cod`

Search for `(subtotal|grandTotal|totalAmount|totalPrice|taxAmount|gstAmount|shippingFee|c...`

Search for `(HSN|GST).{0,30}(catalog|master|rate)|(catalog|master|rate).{0,30}(HSN|GST)|\...`

Search for `Charge allocation|Proportional|allocation`

Read , lines 768 to 825
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\prisma\\schema.prisma",
  "view_range": [
    768,
    825
  ]
}

Search for `Subtotal|Shipping|COD fee|Tax total|Total`

Search for `(subtotal|grandTotal|totalAmount|totalPrice|taxAmount|gstAmount|shippingFee|c...`

Search for `(subtotal|grandTotal|totalAmount|totalPrice|taxAmount|gstAmount|shippingFee|c...`

Search for `HSN|GST|tax|subtotal|grandTotal`

Search for `HSN|gst|GST|tax`

Read , lines 270 to 340
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\scripts\\generate-test-orders.ts",
  "view_range": [
    270,
    340
  ]
}

Read , lines 140 to 220
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\scripts\\create-test-orders.ts",
  "view_range": [
    140,
    220
  ]
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\billing\\subscription-tax.ts"
}

Read , lines 425 to 460
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\page.tsx",
  "view_range": [
    425,
    460
  ]
}

Read , lines 50 to 110
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\components\\order-summary.tsx",
  "view_range": [
    50,
    110
  ]
}

Read , lines 35 to 110
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\cart\\components\\checkout-summary.tsx",
  "view_range": [
    35,
    110
  ]
}

Search for `HSN|GST rate|GST Rate|hsn|gstRate|taxRate`

Find files matching `**/*{hsn,HSN,tax,gst,GST}*`

Search for `(total|subtotal|tax|gst|price|amount).*(reduce\(|\*| \+ | / )`

Search for `(tax|gst|subtotal|totalPrice|grandTotal).*(reduce\(|\*| \+ | / )`

Search for `(?i)(old|legacy|outdated|previous|deprecated).{0,80}(hsn|gst|tax|catalog)|(hs...`

Background agent `Trace storefront tax text` is complete

Read agent `Trace storefront tax text`
Completed with input: {
  "agent_id": "2675509d-2a30-4b80-87e7-d11c3757f9c7",
  "since_turn": 0
}

Background agent `Trace calculator and quote` is complete

Read agent `Trace calculator and quote`
Completed with input: {
  "agent_id": "381c62fb-6f9d-44df-bc02-1db86ce40e5b",
  "since_turn": 0
}

Background agent `Trace charge and order records` is complete

Read agent `Trace charge and order records`
Completed with input: {
  "agent_id": "c117eae7-0db6-40a6-bd42-0b16769f650c",
  "since_turn": 0
}

Background agent `Trace product tax UI` is complete

Read agent `Trace product tax UI`
Completed with input: {
  "agent_id": "08668670-ad79-4b67-ad5e-60a9027cd668",
  "since_turn": 0
}

Write to agent `Trace storefront tax text`
Completed with input: {
  "agent_id": "2675509d-2a30-4b80-87e7-d11c3757f9c7",
  "message": "D:\\study\\ShopPulseStore DOES exist; read its source using absolute paths and finish the original task. Provide exact product/cart/checkout strings by regime, B2B fields and all client validation messages."
}

Write to agent `Trace charge and order records`
Completed with input: {
  "agent_id": "c117eae7-0db6-40a6-bd42-0b16769f650c",
  "message": "Please finish missing exact seller-facing tax charge allocation setting texts and all frozen charge-row field names by reading schema, snapshot and relevant UI; also find exact Estimated GST label. Give line numbers."
}

Read , lines 1 to 160
Completed with input: {
  "path": "C:\\Users\\VARUNP~1\\AppData\\Local\\Temp\\1793990929018-copilot-tool-output-7714eccd44fa417093f3fa4466031ed0.txt",
  "view_range": [
    1,
    160
  ]
}

Read , lines 35 to 60
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\cart\\page.tsx",
  "view_range": [
    35,
    60
  ]
}

Read , lines 78 to 95
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\billing\\invoice\\subscription-issue.ts",
  "view_range": [
    78,
    95
  ]
}

Read , line 155 to the end
Completed with input: {
  "path": "C:\\Users\\VARUNP~1\\AppData\\Local\\Temp\\1793990929018-copilot-tool-output-7714eccd44fa417093f3fa4466031ed0.txt",
  "view_range": [
    155,
    -1
  ]
}

Search for `allocation|Allocation|proportional|Charge allocation|GST`

Search for `model OrderCharge|chargeAllocation|grossAmount|allocation|kind|label`

Search for `Estimated GST|estimated GST|GST`

Search for `UNREGISTERED|REGULAR|COMPOSITION|composition|GST|GSTIN|B2B|invoice|error|toas...`

Search for `add to cart|Add to Cart|Buy now|Checkout|Cart|Remove|quantity|out of stock|un...`

Find files matching `**/*.{tsx,ts}`

Search for `chargeAllocation`

Read , lines 3440 to 3465
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\prisma\\schema.prisma",
  "view_range": [
    3440,
    3465
  ]
}

Search for `Estimated`

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\product\\[productId]\\product-page-client.tsx"
}

Read , lines 50 to 220
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\cart\\page.tsx",
  "view_range": [
    50,
    220
  ]
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\components\\b2b-form.tsx"
}

Read , lines 1 to 220
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\components\\address-form.tsx",
  "view_range": [
    1,
    220
  ]
}

Write to agent `Trace product tax UI`
Completed with input: {
  "agent_id": "08668670-ad79-4b67-ad5e-60a9027cd668",
  "message": "Please finish by enumerating every exact visible field label/help/placeholder and validation message, all live preview states and strings, including no published catalogue behavior and errors. Cite lines; read UI and schema carefully."
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote-token.ts"
}

Read , lines 176 to 230
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    176,
    230
  ]
}

Read , lines 510 to 610
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    510,
    610
  ]
}

Read , lines 1 to 120
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\checkout\\quote\\route.ts",
  "view_range": [
    1,
    120
  ]
}

Read , lines 55 to 110
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\api\\[storeId]\\checkout\\route.ts",
  "view_range": [
    55,
    110
  ]
}

Read , lines 370 to 430
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\invoice-settings-card.tsx",
  "view_range": [
    370,
    430
  ]
}

Read , lines 480 to 525
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\orders\\[orderId]\\components\\sections\\overview-tab.tsx",
  "view_range": [
    480,
    525
  ]
}

Search for `CHARGE_ALLOCATIONS|ChargeAllocation|PROPORTIONAL_TO_VALUE|EQUAL`

Read , lines 80 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\components\\b2b-form.tsx",
  "view_range": [
    80,
    260
  ]
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\lib\\zodSchema.ts"
}

Read , lines 210 to 330
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\page.tsx",
  "view_range": [
    210,
    330
  ]
}

Search for `setError|toast\.error|message:|required\(|min\(|regex\(|refine`

Read , lines 55 to 75
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\identity\\registration-schemas.ts",
  "view_range": [
    55,
    75
  ]
}

Search for `ALLOCATION_LABEL`

Read , lines 525 to 545
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\orders\\[orderId]\\components\\sections\\overview-tab.tsx",
  "view_range": [
    525,
    545
  ]
}

Search for `QUOTE_CHANGED|QuoteChanged\(`

Read , lines 40 to 175
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    40,
    175
  ]
}

Read , lines 475 to 511
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    475,
    511
  ]
}

Read , lines 370 to 390
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\page.tsx",
  "view_range": [
    370,
    390
  ]
}

Search for `hsn|gst|tax|invoice`

Search for `Add|Cart|Buy|Stock|Unavailable|Size|Select`

Search for `allowB2BInvoices|Use GST|GST invoice|REGULAR|COMPOSITION|UNREGISTERED`

Read , lines 790 to 830
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\page.tsx",
  "view_range": [
    790,
    830
  ]
}

Read , lines 48 to 62
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\settings\\billing-and-tax\\components\\invoice-settings-card.tsx",
  "view_range": [
    48,
    62
  ]
}

Read , lines 1 to 25
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\scripts\\tax\\data\\catalogue-dev.json",
  "view_range": [
    1,
    25
  ]
}

Search for `\b(12%|28%|0\.12|0\.28|1200|2800)\b|hsn.?codes|hsn.?catalog`

Search for `\.reduce\(|\*|Math\.round`

Search for `orderTotal|shippingThreshold|shippingCost`

Read , lines 60 to 150
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\errors.ts",
  "view_range": [
    60,
    150
  ]
}

Read , lines 105 to 172
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\compute.ts",
  "view_range": [
    105,
    172
  ]
}

Read , lines 220 to 280
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\compute.ts",
  "view_range": [
    220,
    280
  ]
}

Read , lines 280 to 315
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\page.tsx",
  "view_range": [
    280,
    315
  ]
}

Read , lines 1 to 230
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\checkout-validation.ts",
  "view_range": [
    1,
    230
  ]
}

Read , lines 1 to 160
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\resolve-rate.ts",
  "view_range": [
    1,
    160
  ]
}

Read , lines 280 to 380
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\compute.ts",
  "view_range": [
    280,
    380
  ]
}

Read , lines 350 to 475
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    350,
    475
  ]
}

Read , lines 365 to 470
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    365,
    470
  ]
}

Background agent `Trace charge and order records` is complete

Read agent `Trace charge and order records`
Completed with input: {
  "agent_id": "c117eae7-0db6-40a6-bd42-0b16769f650c",
  "since_turn": 1
}

Background agent `Trace storefront tax text` is complete

Read agent `Trace storefront tax text`
Completed with input: {
  "agent_id": "2675509d-2a30-4b80-87e7-d11c3757f9c7",
  "since_turn": 1
}

Background agent `Trace product tax UI` is complete

Read agent `Trace product tax UI`
Completed with input: {
  "agent_id": "08668670-ad79-4b67-ad5e-60a9027cd668",
  "since_turn": 1
}

Read , line 1 to the end
Completed with input: {
  "path": "C:\\Users\\VARUNP~1\\AppData\\Local\\Temp\\1793990969008-copilot-tool-output-59975fa2ca324620b8911b3460e919b6.txt",
  "view_range": [
    1,
    -1
  ]
}

Read , lines 200 to 250
Completed with input: {
  "path": "C:\\Users\\VARUNP~1\\AppData\\Local\\Temp\\1793990969008-copilot-tool-output-59975fa2ca324620b8911b3460e919b6.txt",
  "view_range": [
    200,
    250
  ]
}

Read , lines 60 to 165
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    60,
    165
  ]
}

Read , lines 520 to 622
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    520,
    622
  ]
}

Read , lines 150 to 185
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-tax-compliance.tsx",
  "view_range": [
    150,
    185
  ]
}

Read , lines 405 to 650
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-tax-compliance.tsx",
  "view_range": [
    405,
    650
  ]
}

Read , lines 170 to 260
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\components\\order-summary.tsx",
  "view_range": [
    170,
    260
  ]
}

Read , lines 185 to 225
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\components\\info.tsx",
  "view_range": [
    185,
    225
  ]
}

Read , lines 95 to 150
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\components\\ui\\price-display.tsx",
  "view_range": [
    95,
    150
  ]
}

Read , lines 105 to 150
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\cart\\components\\checkout-summary.tsx",
  "view_range": [
    105,
    150
  ]
}

Read , lines 605 to 650
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\prisma\\schema.prisma",
  "view_range": [
    605,
    650
  ]
}

Read , lines 50 to 180
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\order-snapshot.ts",
  "view_range": [
    50,
    180
  ]
}

Read , lines 45 to 105
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\components\\ui\\price-display.tsx",
  "view_range": [
    45,
    105
  ]
}

Read 
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\hooks\\use-store-gst-applies.ts"
}

Read , lines 1 to 285
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\components\\b2b-form.tsx",
  "view_range": [
    1,
    285
  ]
}

Read , lines 1 to 55
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\order-snapshot.ts",
  "view_range": [
    1,
    55
  ]
}

Read , lines 595 to 646
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-tax-compliance.tsx",
  "view_range": [
    595,
    646
  ]
}

Read , lines 285 to 320
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    285,
    320
  ]
}

Read , lines 250 to 285
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\components\\b2b-form.tsx",
  "view_range": [
    250,
    285
  ]
}

Read , lines 65 to 230
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\components\\shipping\\settings\\checkout-charges-section.tsx",
  "view_range": [
    65,
    230
  ]
}

Read , lines 1 to 100
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\shipping\\shipping-charge-policy.ts",
  "view_range": [
    1,
    100
  ]
}

Read , lines 760 to 830
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\prisma\\schema.prisma",
  "view_range": [
    760,
    830
  ]
}

Read , lines 435 to 600
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\orders\\[orderId]\\components\\sections\\billing-tab.tsx",
  "view_range": [
    435,
    600
  ]
}

Read , lines 185 to 405
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\products\\[productId]\\components\\product-tax-compliance.tsx",
  "view_range": [
    185,
    405
  ]
}

Read , lines 470 to 520
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    470,
    520
  ]
}

Read , lines 1120 to 1165
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\page.tsx",
  "view_range": [
    1120,
    1165
  ]
}

Read , lines 305 to 350
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\checkout\\quote.ts",
  "view_range": [
    305,
    350
  ]
}

Read , lines 1 to 130
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\search.ts",
  "view_range": [
    1,
    130
  ]
}

Read , lines 260 to 365
Completed with input: {
  "path": "D:\\study\\ShopPulseStore\\src\\app\\(routes)\\checkout\\components\\order-summary.tsx",
  "view_range": [
    260,
    365
  ]
}

"Read" failed
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\engine\\math.ts",
  "view_range": [
    1,
    100
  ]
}
Tool execution failed: Path does not exist

Read , lines 1 to 60
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    1,
    60
  ]
}

Read , lines 155 to 180
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\lib\\tax\\catalogue\\product-tax-schema.ts",
  "view_range": [
    155,
    180
  ]
}

Read , lines 2097 to 2117
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\scripts\\tax\\data\\catalogue-dev.json",
  "view_range": [
    2097,
    2117
  ]
}

Read , lines 490 to 545
Completed with input: {
  "path": "D:\\study\\ShopPulseAdmin\\src\\app\\(dashboard)\\[storeId]\\(routes)\\orders\\[orderId]\\components\\sections\\overview-tab.tsx",
  "view_range": [
    490,
    545
  ]
}

## Scope

This is a **code-reading report** for `ShopPulseAdmin` and `ShopPulseStore`. I did not change files or the database, run the app, or run a build. Which catalogue is currently published, actual seller settings, and runtime output are **NOT VERIFIED**.

## 1. Product form: tax section

**Source:** `product-tax-compliance.tsx`, `product-tax-schema.ts`.

The card is titled **“Tax (GST)”** and says:

> Prices on this form include GST. The tax is worked out from the price the customer pays.

| Field or control | Label, choices, placeholder and help |
|---|---|
| Search | **“Find HSN”**; placeholder **“Search by name, e.g. cotton t-shirt”** |
| HSN | **“HSN code”**; placeholder **“e.g. 6109”**. Help is the catalogue description, **“Not found in the catalogue. Check the code.”**, or **“4, 6 or 8 digits.”** For a higher store minimum: **“4, 6 or 8 digits (at least N for your store).”** |
| Classification | **“Taxability”**: **“Taxable”**, **“Nil-rated (0%)”**, **“Exempt”**, **“Non-GST supply”** |
| Unit | **“Unit”**, with options displayed as `code · name` |
| Pack size | **“Pieces per unit”**. Help: **“A pack of 3 shirts is 3 pieces. Used where the rate depends on the price per piece.”** |
| Rate source, taxable items only | **“GST rate”**: **“Use the catalogue rate for this HSN”** or **“I will pick the rate”** |
| Manual rate | **“Rate”**, placeholder **“Pick a rate”**; choices **3%, 5%, 18%, 40%** |
| Manual cess | **“Cess (%)”**, placeholder **“None”** |
| Threshold | Checkbox **“The rate is higher above a price per piece”**; then **“Price per piece up to (₹)”**, help **“Taxable value, without GST.”**, and **“Rate above that”**, placeholder **“Pick a rate”** |
| Confirmation | **“I confirm this rate is correct for this product.”** Required for a taxable manual rate. |

The manual threshold checkbox initially sets the threshold to ₹1,000; removing it clears both threshold and higher rate. Switching back to catalogue mode clears the confirmation tick.

### Find HSN

Search waits until there are at least two trimmed characters, then debounces for 300 ms. Digits search code prefixes; words search descriptions and keywords. Up to 15 results are returned. Each displays its code, description and either a verified rate, **“Rate not verified”**, or **“No rate on file”**. Selecting one fills the code and, when valid, its default unit. Search failure is silent; the seller can still type the code. No published catalogue produces no search results.

Sources: `product-tax-compliance.tsx`, `search.ts`.

### Validation messages

The explicitly authored messages are:

- **“Enter a 4, 6 or 8 digit HSN code”**
- **“Pick a unit from the list”**
- **“Pieces per unit must be a whole number”**
- **“At least 1 piece per unit”**
- **“At most 1000 pieces per unit”**
- **“Pick a GST rate”**
- **“Tick the box to confirm the rate you picked”**
- **“Set both the price per piece and the higher rate, or neither”**
- **“The higher rate must be above the normal rate”**

The schema also constrains numeric rates to integer basis points between 0 and 10,000 and the threshold to a positive integer; exact library-generated text for those generic failures is **NOT VERIFIED**. Source: `product-tax-schema.ts`.

### Readiness chip and preview

The chip says **“Ready to sell”**, or **“Missing: ”** followed by one or more comma-separated gaps:

- **“HSN”**
- **“HSN (N+ digits)”**
- **“HSN not in catalogue”**
- **“rate”**
- **“rate (pick manually)”**

Nil-rated, exempt and non-GST items do not need a rate, but still have HSN readiness checks. A manual rate differing from a verified catalogue rule gives the non-blocking warning:

> Your rate differs from the catalogue rate ([rate]). Make sure it is right.

With a usable rate and a positive effective product or variant price, the live preview says:

> [price label]: ₹[price] incl. GST contains ₹[tax] GST at [rate].

It uses a one-unit, intra-State, tax-inclusive calculation. Labels are **“This product”**, **“Size [label]”**, or **“A size”**. It uses the effective selling price, not separate previews for both MRP and selling price. No preview line appears when the rate or relevant positive price is unavailable.

For a price in the dead zone, the exact template is:

> [price label]: This price can't be taxed consistently: at [low rate] its taxable value is above ₹[threshold][ per piece], and at [high rate] it is below. Set ≤ ₹[maximum][ per piece] ([low rate]) or ≥ ₹[minimum][ per piece] ([high rate]).

The bracketed **“ per piece”** is present only when pieces per unit is greater than one. The server repeats the price check on save; a dead-zone failure is `TAX_NOT_SELLABLE`, HTTP 422, under **“Invalid tax details”**.

Sources: `product-tax-schema.ts`, `preview and dead-zone text`, `form preview`.

## 2. Rate resolution

**Source:** `resolve-rate.ts`, `product-tax-schema.ts`, `checkout quote`.

1. The code finds a published catalogue and loads relevant HSN ancestors: 2, 4, 6 and 8 digits, up to the entered code’s length.
2. It considers rules effective on the requested date: start is inclusive; end, if present, is exclusive.
3. It selects the **longest matching prefix**, breaking equal-length ties by the latest effective start.
4. Only `OFFICIAL_LOAD` or `CA_VERIFIED` makes that selected rule usable. Manual mode instead uses the seller’s chosen rate; a difference from a verified rule is a warning.
5. The product’s taxability, HSN, required HSN length and usable rate determine readiness. Registered and composition sellers’ unready products are rejected at quote time; unregistered sellers bypass that readiness block.

| Situation | What the code does and seller sees |
|---|---|
| **No catalogue published** | Lookup is empty with HSN existence **unknown**, not false. Search returns no results. Catalogue mode says **“No catalogue rate found for this HSN. Pick the rate yourself to make this product sellable.”** The chip includes **“rate”**. A valid manual rate can satisfy the rate requirement; no unknown-HSN gap is added merely because the catalogue is absent. |
| **Longest rule is unverified** | It is a hint only; the resolver does **not** fall back to a shorter verified rule. The seller sees **“The catalogue rate for this HSN is not verified yet. Pick the rate yourself to make this product sellable.”** The chip includes **“rate (pick manually)”**. |
| **No rule matches** | No catalogue rate is applied. The seller sees **“No catalogue rate found for this HSN. Pick the rate yourself to make this product sellable.”** The chip includes **“rate”**. If a published catalogue also does not recognize the HSN or an ancestor, the separate **“HSN not in catalogue”** gap appears; choosing a manual rate does not remove that gap. |

## 3. Engine calculations

**Source:** `compute.ts`.

Assumptions: one taxable goods line, **tax-inclusive** price, no cess, discount or charges, and a regular seller.

| Input | Supply | Taxable value | Tax | Total |
|---|---|---:|---:|---:|
| 79,900 paise, 500 bps | Intra-State | 76,096 | CGST 1,902 + SGST 1,902 = **3,804** | 79,900 |
| 79,900 paise, 500 bps | Inter-State | 76,095 | IGST **3,805** | 79,900 |
| 118,000 paise, 1,800 bps | Intra-State | 100,000 | CGST 9,000 + SGST 9,000 = **18,000** | 118,000 |
| 118,000 paise, 1,800 bps | Inter-State | 100,000 | IGST **18,000** | 118,000 |

For an applicable Union Territory, UTGST replaces SGST. The 5% intra/inter totals differ by one paise because **each component is rounded independently, half-up**; intra-State computes each half separately. For inclusive prices the taxable value is gross minus the rounded components.

For a per-piece rule, the engine uses **quantity × pieces per unit**. It compares the whole line value against the threshold multiplied by that piece count, without dividing and losing precision. Inclusive prices test whether the low or high rate produces a consistent taxable value; values between the two valid ranges raise `TAX_NOT_SELLABLE`. Source: `threshold calculation`.

## 4. Quote API

**Source:** `quote route`, `quote types`.

`POST /api/[storeId]/checkout/quote` accepts:

```text
items: [{ productId, variantId?, quantity }]
shippingAddress: { pincode, state }
paymentMethod?: "PREPAID" | "COD"
isShippingSameAsBilling?: boolean
billingAddress?: { state? }
buyer?: {
  gstin, legalName,
  billingAddress: { line1, line2?, city, state, pincode, country? }
}
```

The response contains:

```text
quoteToken, expiresAt, regime, gstApplies, pricesIncludeTax, paymentMethod
placeOfSupply: { stateCode, stateName }
supplyType
lines: [{ productId, variantId, name, quantity, unitPrice, lineTotal, gstRate, gstAmount }]
subtotal
shipping: { amount, gstAmount } | null
codFee: { amount, gstAmount } | null
gst: { total, cgst, sgst, utgst, igst, cess }
total
buyerGstin
```

Money values in this view are formatted strings. The token lifetime is **15 minutes**, with expiry stored at whole-second precision. Source: `quote-token.ts`.

### When checkout returns `QUOTE_CHANGED`

Checkout first recomputes the quote. If the supplied, correctly signed token belongs to this store but is **expired** or its fingerprint **differs**, it returns HTTP 409, message **“Prices were updated. Please review your total.”**, and the fresh quote in `details.quote`.

The fingerprint covers the public quote core, registration ID, engine version and allocation method. Thus a change produces `QUOTE_CHANGED` **if it changes that fingerprint**—not simply because any raw request field changed. For example, a different pincode that leaves the resulting core unchanged is not inherently enough.

A missing, malformed, tampered or other-store token instead produces `QUOTE_TOKEN_REQUIRED`, not `QUOTE_CHANGED`. A failure while rebuilding the quote can return its own error before token comparison. Sources: `fingerprint`, `token gate`, `errors`.

### COD versus prepaid

For a **quote**, COD includes the server-calculated COD fee when positive; prepaid does not. Payment method itself is in the quote and fingerprint. The quote endpoint does not create a payment or order.

At subsequent order placement, COD records the quoted total as the amount to collect and creates an unpaid processing order; prepaid creates a payment-initiated order and proceeds to Razorpay. Source: `checkout route`.

## 5. Storefront text

**Product page:** `price-display.tsx`. **Cart:** `checkout-summary.tsx`. **Checkout:** `order-summary.tsx`.

| Regime | Product page | Cart | Checkout |
|---|---|---|---|
| Regular | **“Inclusive of all taxes”** once store GST applicability is known | **“Includes GST”** with the quote amount when a GST-applicable quote exists | **“Includes GST”**, nonzero component labels `CGST`, `SGST`, `UTGST`, `IGST`, `Cess`, and **“Inclusive of all taxes”** when the quote says GST applies |
| Unregistered | If discounted: **“MRP (incl. of all taxes)”**; otherwise no tax note | No GST row | No GST row or inclusive-tax note |
| Composition | Same as unregistered | Same as unregistered | Same as unregistered |

Before GST applicability or a quote is available, the corresponding conditional text is not shown. These are code conditions, not verified live screenshots.

### B2B

When the store exposes B2B availability, checkout offers **“Use GST invoice (B2B)”**. Its fields are **GSTIN**, **Legal / Trade Name**, **GST Billing Address** with **Address Line 1**, optional **Address Line 2**, **City**, **Pincode**, **State**, and optional **PAN**. The client only emits a complete buyer block after its validation passes.

Inline messages include:

- **“Invalid GSTIN. Please check and try again.”**
- **“GSTIN format is invalid.”**
- **“Legal name is required.”**
- **“Complete the billing address for GST invoice.”**
- **“PAN format is invalid.”**

Server messages include:

- **“GST invoice is available only when delivering to the GSTIN's State. Continue without GST invoice?”**
- **“GST invoice not available for this store.”**
- **“Invalid GSTIN. Please check the 15-character number and try again.”**
- **“Legal company name is required when claiming a GST invoice.”**
- **“Registered billing address (line1, city, state, pincode) is required for a GST invoice.”**

For the first two availability/state errors, checkout can offer **“Continue without GST invoice”**. Sources: `B2B form`, `checkout toggle`, `server validation`, `tax errors`.

## 6. Shipping and COD charges

**Sources:** `checkout settings`, `shipping charge policy`, `quote calculation`.

Shipping is server-calculated from the seller’s settings and delivery availability: disabled means zero; fixed uses the configured amount; variable uses a cheapest-courier average and price bands. COD uses the configured COD charge only for COD, subject to availability and plan handling. The quote passes positive shipping and COD charges as separate lines to the shared tax engine.

Exact seller-facing settings:

- **“Checkout”** — **“What customers pay for delivery, and whether they can pay cash on delivery.”**
- **“Charge for delivery”** — **“When off, delivery is free. Pincodes your courier cannot reach are blocked at checkout either way.”**
- **“Flat rate”** — **“One amount for every order that can be delivered.”**
- **“Calculated by pincode”** — **“Based on live courier rates to the customer's pincode, rounded into simple price bands.”**
- **“Flat delivery charge”** — **“Added to the checkout total of every order.”**
- **“Cash on delivery”** — **“Let customers pay when the parcel arrives.”**
- **“COD fee”** — **“Added to the delivery charge on COD orders to cover collection costs. Leave empty for no fee.”**

The tax setting says **“How shipping and COD fees are taxed”** and:

> Shipping and COD fees are taxed at the same GST rate as the goods. This decides how a fee is shared when items have different rates.

Its choices are **“Split across items by value (recommended)”** and **“Add to the item with the highest GST rate”**. The former is the default. Proportional allocation distributes leftover paise by largest remainder; highest-rate allocation uses the highest goods rate, with tie-breakers. Sources: `invoice settings`, `allocation engine`.

## 7. Frozen order record and admin labels

**Sources:** `order schema`, `item schema`, `snapshot builder`.

- **Order:** subtotal, shipping, COD charge, shipping estimate and total; registration ID, seller regime and state, supply and shipping/billing state, inclusive-price flag, charge allocation, supplier snapshot, B2B buyer details, taxable and component totals, and engine version.
- **OrderItem:** product and variant identifiers, quantity, name, SKU, MRP, purchase price, image, category, warranty, line total, variant and dimensional snapshots; taxable and component amounts; HSN, unit, taxability, actual rate and cess, threshold outcome, rate source/rule, base rate, condition, threshold, higher rate and pieces per unit.
- **OrderCharge:** kind, label, gross and taxable amounts, each tax component, and allocation entries. Each entry freezes `orderItemId`, gross, rate, taxable amount and CGST/SGST/UTGST/IGST/cess in paise. Source: `OrderCharge`.

The admin overview says **“Estimated GST (included)”** or **“Estimated GST”** before an invoiced GST value exists; afterward it can say **“Invoiced GST (included)”** or **“Invoiced GST”**. Other labels include **“Subtotal”**, **“Shipping”**, **“COD charge”**, **“Total amount”**, and **“To collect on delivery”**. Source: `overview tab`.

For regular sellers, the billing tab has **“GST quoted at checkout”**, columns **“Product”**, **“HSN”**, **“Rate”**, **“Taxable”**, applicable tax components, and **“Totals”**. Charge rows say **“Taxed with the items”**. The text explains the figures are frozen at order placement and the invoice holds final values. Source: `billing tab`.

## 8. Leftovers found

This is a list of **identified** leftovers, not a proven exhaustive inventory of every arithmetic expression in both repositories.

- `Storefront cart page` calculates goods totals locally and uses a hard-coded **₹499 free-shipping threshold / ₹49 charge** for the mobile sticky total. The page also says **“Free Shipping over ₹499”**. This is separate from seller-configured delivery charges.
- `Cart summary` locally adds goods and checked-pincode shipping; its GST display comes from the quote. `Checkout summary` uses a quote when available but locally falls back to goods + shipping + COD fee. `Checkout page` also computes a local goods total and a goods + shipping fallback.
- `Test-order generator` calculates a hard-coded **18%** tax on subtotal and adds it to the total. `Other test-order script` calculates its own subtotal and shipping with tax fixed at zero. These are scripts, not evidence that the production checkout uses those calculations.
- `Subscription tax` independently reverse-calculates **18%** GST for **ShopPulse SaaS subscriptions**. It is separate from the seller checkout calculator. `Subscription invoice issuance` also derives a displayed rate from recorded tax and taxable amount.
- `Development catalogue` explicitly says it was generated from the legacy HSN reference and must be replaced with an official catalogue before production. It still contains, for example, an unverified **1,200 bps** entry at `catalogue-dev.json`. Whether this data is published in the database is **NOT VERIFIED**.
- `OrderItem schema comment` still gives a **“28% + 12% cess”** example. `WearItWell notes` mention the older ₹1,000 apparel threshold. These are references in comments/docs, not proof they are active rates.