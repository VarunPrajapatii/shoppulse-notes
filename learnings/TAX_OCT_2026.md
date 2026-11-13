User: mein chahta hoon ki tum product db model mein taxRate and taxBracketRule, order db model mein tax, orderitem db model mein tax ke fields, store.priceMode (change it to better name kyuki price mode se muzhe samaz nahi aara ki its about tax. but agar yehi generally use hota hai toh leave as it) mein tax calculation and storing in the tax fields aur overall implementation of these things accross application including all the calculations, storing at db, invoice generations ko dekho (ignore all the tax things related to subscription and post delivery that is return/refund/replacement/exchange related anythin, only talking about rest). kyuki sab alag alag time pe alag alag ai ne alag alag good/bad context mein implement kiya. Muzhe taxation ki zaraa bhi knowledge nhi hai. Par abb muzhe ek complete audit karwana hai taaki mere platform ka tax related stuff ki requirements understand karo, ki kya hai, kya chahiye, aur kya hona chahiye tax related cheezein in the shoppulse app, to legally think about making business out of shoppulse, tumhe latest info ke liye internet reserch bhi karni padegi, ki kanoonan latest info kya hai, jaise doosre multi tenat ecommerce saas implement karti hai. 

Aur phir poori audit ke baad muzhe batao ki mere platform mein tax related kya kya galat hai, kya kya missing hai, aur kya kya implement karna chahiye, aur kya kya thik karna chahiye, aur yeh sab kaise (kaise se mera matlab hai high level explaination in easy to understand way for me to understand stuff). Mein chahta hoon ki tax related implementation kahin se bhi kamzor na rahe app mein, ya galat ya illegal. So yeh tumhari zimmedari hai.

code padhne ke liye regex aur terminal searches ka zyada use karna taaki reading ke time pe tokens kam use ho. Aur badi code files ko padhke summary jaanni ho toh ask models like sonnet or haiku for that with restricted prompt.

Phir batana ki audit ke baad kya kya mila. 

Mera moto hai ki product, order, order item, store tax related implementation aache se ho taaki kisi bhi tarah ka busniness jaise skincare, clothing, electronics, food/supplement/nutrition products, etc. ke liye tax related features aur implementation behtar ho. 

GitHub Copilot: Read memory []()

Read memory []()

Read memory []()

Searched for regex `tax|Tax|hsn|Hsn|gst|Gst|cess|Cess|priceMode|PriceMode|isExempt|einvoice|placeOfSupply|stateCode` (`**/prisma/schema.prisma`), 131 results

Read [](), lines 110 to 215

Read [](), lines 420 to 500

Read [](), lines 600 to 830

Read [](), lines 1095 to 1225

Execution complete: List tax-related files

Ran terminal command:  cd /d/study/ShopPulseAdmin && printf '%s\n' '--- 1 FILE LIST ---' && grep -rlE "taxRate|taxBracketRule|priceMode|cgstAmount|igstAmount|taxableAmount|getEffectiveRate|hsnCode|isExempt|cessRate|placeOfSupply|invoiceKind|BILL_OF_SUPPLY" src --include='*.ts' --include='*.tsx' | grep -viE "return|refund|exchange|replacement|subscription|saas" | sort; printf '%s\n' '--- 2 COUNTS ---' && grep -rcE "taxRate|taxBracketRule|priceMode|cgstAmount|igstAmount|taxableAmount|getEffectiveRate|hsnCode|isExempt|cessRate|placeOfSupply|invoiceKind" src --include='*.ts' --include='*.tsx' | grep -v ':0$' | sort -t: -k2 -nr | head -60; printf '%s\n' '--- 3 BILLING LS/WC ---' && ls src/lib/billing src/lib/billing/data 2>/dev/null; wc -l src/lib/billing/*.ts; printf '%s\n' '--- 4 INVOICE FILE LIST ---' && grep -rlE "invoice" src --include='*.ts' --include='*.tsx' -i | grep -viE "subscription|saas|return|refund" | sort; printf '%s\n' '--- STOREFRONT ---' && if [[ -d /d/study/ShopPulseStore ]]; then cd /d/study/ShopPulseStore && grep -rlE "taxRate|priceMode|tax|gst|GST|invoice" src --include='*.ts' --include='*.tsx' | sort; else printf '%s\n' 'ShopPulseStore not found'; fi

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -rlE "taxRate|taxBracketRule|priceMode|cgstAmount|igstAmount|taxableAmount|getEffectiveRate|hsnCode|isExempt|cessRate|placeOfSupply|invoiceKind|BILL_OF_SUPPLY" src --include=*.ts --include=*.tsx | sort

Ran terminal command:  cd /d/study/ShopPulseAdmin && wc -l src/lib/billing/*.ts src/lib/billing/invoice/* src/app/api/[storeId]/checkout/route.ts "src/app/(dashboard)/[storeId]/(routes)/settings/billing-and-tax/page.tsx" src/app/api/[storeId]/products/bulk-tax/route.ts src/app/api/cron/enforce-gst-grace/route.ts "src/app/(dashboard)/[storeId]/(routes)/products/[productId]/components/product-tax-compliance.tsx" "src/app/(dashboard)/[storeId]/(routes)/orders/[orderId]/components/sections/billing-tab.tsx"; ls src/lib/billing src/lib/billing/data src/lib/billing/invoice; grep -rlE "priceMode|gstRegistered|einvoice|allowB2BInvoices|isCompositionScheme" src --include=*.ts --include=*.tsx | grep -v generated | sort

Read [](), lines 1 to 245

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -nE "tax|Tax|gst|Gst|priceMode|stateCode|StateCode|cess|hsn|discount|coupon|Coupon|shippingCost|codCharge|subtotal|totalAmount|invoice|Payment\.create|payment.create|sellerGstin|placeOfSupply|buyerGstin" "src/app/api/[storeId]/checkout/route.ts" | head -220

Searched for regex `export|threshold|unitPrice|source|lowRate|highRate` (`**/src/lib/billing/hsn-lookup.ts`), 36 results

Read [](), lines 715 to 920

Read [](), lines 140 to 299

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -nE "invoiceKind|BILL_OF_SUPPLY|TAX_INVOICE|gstRegistered|isComposition|taxable|cgst|igst|sgst|cess|placeOfSupply|shippingCost|codCharge|totalTax|update\(|when|trigger|export (async )?function|isPaid|capturedAt|reverse|Reverse|signature|Signature|amountInWords|words" src/lib/billing/invoice/generate.ts src/lib/billing/invoice/numbering.ts src/lib/billing/invoice/cod-paid.ts

Read [](), lines 1 to 337

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -nE "<Text[^>]*>[^<{]{3,}|'[A-Z][A-Za-z /&()-]{4,}'|Tax Invoice|TAX INVOICE|Bill of Supply|Reverse|Signature|Signatory|words|Words|Place of Supply|State|HSN|Qty|Discount|Shipping|COD|Total|Original|Recipient" src/lib/billing/invoice/template.tsx | head -90; echo ----; sed -n 1,84p src/lib/billing/invoice/numbering.ts | grep -nE "pad|prefix|fy|return|\`"

Read [](), lines 160 to 339

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -nE "razorpayKey|razorpay_key|RAZORPAY_KEY_ID|keySecret|key_id|linkedAccount|route|transfers|accountId" src/lib/razorpay*.ts src/lib/payments/*.ts 2>/dev/null | head -20; grep -rlnE "razorpayKeyId|razorpayKeySecret|linked_account|transfers:" src prisma/schema.prisma | grep -v generated | head; echo ---EWB; grep -rniE "ewaybill|eway_bill|e-way|ewb" src --include=*.ts --include=*.tsx -l | grep -v generated | head; echo ---TCS; grep -rniE "\bTCS\b|194-?O|GSTR|ecommerceOperator" src --include=*.ts --include=*.tsx -l | grep -v generated | head; echo ---COMP; grep -rnE "isCompositionScheme" src --include=*.ts --include=*.tsx | grep -v generated | head -20

Ran terminal command:  cd /d/study/ShopPulseAdmin && echo "--- Payment tax result writes"; grep -rnE "totalTax:|payment\.(update|create)" src --include=*.ts | grep -v generated | grep -viE "subscription|saas|refund|return|exchange" | head -20; echo "--- states"; sed -n 1,78p src/lib/billing/indian-states.ts | grep -nE "code|UT|union|ladakh|Ladakh|Daman|97|38|26|25" | head -50; echo "--- FY"; sed -n 18,32p src/lib/billing/invoice/numbering.ts

Read [](), lines 1 to 173

Read [](), lines 1 to 37

Ran terminal command:  cd /d/study/ShopPulseAdmin && echo "--- priceMode"; grep -rnE "priceMode" src --include=*.ts --include=*.tsx | grep -v generated; echo "--- IRN"; grep -rnliE "\birn\b|irp|einvoice" src --include=*.ts --include=*.tsx | grep -v generated; echo "--- gstRegistered writes"; grep -rnE "gstRegistered" src/app/api --include=*.ts | head -20

Read [](), lines 140 to 200

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -nE "^model (Pickup|Warehouse|StorePickup|ShippingSettings|Address)|pickup_location|pickupLocation" prisma/schema.prisma | head; echo "--- gstin validators"; grep -nE "export function|stateCode|slice\(0, ?2\)" src/lib/billing/gstin.ts src/lib/billing/gst-validators.ts src/lib/billing/billing-schemas.ts | head -40

Read [](), lines 1340 to 1380

Read [](), lines 40 to 144

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -nE "refine|gstinSchema|panSchema" src/lib/billing/billing-schemas.ts | head; grep -rnE "stateCodeFromGstin|panFromGstin" src --include=*.ts --include=*.tsx | grep -v "lib/billing/gst-validators" | head; echo "--- hsn json"; node -e "const d=require('./src/lib/billing/data/hsn-reference.json');const a=Array.isArray(d)?d:(d.entries||Object.values(d));console.log('count',a.length);const by={};a.forEach(e=>{by[e.taxRate]=(by[e.taxRate]||0)+1});console.log('byRate',by);console.log('brackets',a.filter(e=>e.bracketRule).map(e=>e.code+':'+JSON.stringify(e.bracketRule)).join(' | '));console.log('cess',a.filter(e=>e.cessRate>0).map(e=>e.code+':'+e.cessRate).join(','));console.log('sample',JSON.stringify(a.slice(0,2)));console.log(a.filter(e=>[12,28].includes(e.taxRate)).map(e=>e.code+' '+(e.description||e.desc||'').slice(0,40)+' '+e.taxRate).join('\n'))"

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -nE "refine|gstinSchema|panSchema" src/lib/billing/billing-schemas.ts | head; grep -rnE "stateCodeFromGstin|panFromGstin" src --include=*.ts --include=*.tsx | grep -v "lib/billing/gst-validators" | head -5; node -e "const d=require('./src/lib/billing/data/hsn-reference.json');const a=Array.isArray(d)?d:(d.entries||Object.values(d));console.log('count',a.length);const by={};a.forEach(e=>{by[e.taxRate]=(by[e.taxRate]||0)+1});console.log('byRate',JSON.stringify(by));console.log('brackets',a.filter(e=>e.bracketRule).map(e=>e.code).join(','));console.log('bracketSample',JSON.stringify(a.find(e=>e.bracketRule).bracketRule));console.log('cess',a.filter(e=>e.cessRate>0).map(e=>e.code+':'+e.cessRate).join(','));console.log('keys',Object.keys(a[0]).join(','))"
Completed with input:  cd /d/study/ShopPulseAdmin && grep -nE "refine|gstinSchema|panSchema" src/lib/billing/billing-schemas.ts | head; grep -rnE "stateCodeFromGstin|panFromGstin" src --include=*.ts --include=*.tsx | grep -v "lib/billing/gst-validators" | head -5; node -e "const d=require('./src/lib/billing/data/hsn-reference.json');const a=Array.isArray(d)?d:(d.entries||Object.values(d));console.log('count',a.length);const by={};a.forEach(e=>{by[e.taxRate]=(by[e.taxRate]||0)+1});console.log('byRate',JSON.stringify(by));console.log('brackets',a.filter(e=>e.bracketRule).map(e=>e.code).join(','));console.log('bracketSample',JSON.stringify(a.find(e=>e.bracketRule).bracketRule));console.log('cess',a.filter(e=>e.cessRate>0).map(e=>e.code+':'+e.cessRate).join(','));console.log('keys',Object.keys(a[0]).join(','))"
Tool execution failed with exit code 1

Ran terminal command:  cd /d/study/ShopPulseAdmin && head -c 600 src/lib/billing/data/hsn-reference.json; echo; node -e "const d=require('./src/lib/billing/data/hsn-reference.json');console.log(Object.keys(d));"

Ran terminal command: const a=require('./src/lib/billing/data/hsn-reference.json').items;console.log('count',a.length);const by={};a.forEach(e=>{by[e.taxRate]=(by[e.taxRate]||0)+1});console.log('byRate',JSON.stringify(by));console.log('brackets',a.filter(e=>e.bracketRule).map(e=>e.code+'='+e.bracketRule.threshold+'/'+e.bracketRule.lowRate+'/'+e.bracketRule.highRate).join(', '));console.log('cess',a.filter(e=>e.cessRate>0).map(e=>e.code+':'+e.cessRate).join(','));a.forEach(e=>console.log(e.code,e.taxRate,(e.category||'').slice(0,12),'|',e.description.slice(0,55)))

Ran terminal command:  cd /d/study/ShopPulseStore 2>/dev/null && pwd && grep -rnoiE "inclusive of (all )?taxes|incl\.? (of )?(all )?tax(es)?|\+ ?GST|gst invoice|taxes included|priceMode|\btax\b[^;]{0,40}" src --include=*.ts --include=*.tsx | head -40; ls ../ShopPulseAdmin/demo-stores 2>/dev/null | head

Ran terminal command:  cd /d/study/ShopPulseStore && sed -n 55,115p "src/app/(routes)/cart/components/checkout-summary.tsx" | grep -nE "tax|Tax|ship|Ship|COD|cod|total|Total" ; echo ---; grep -rnliE "inclusive|incl\." src --include=*.tsx | head; echo ---PDP; grep -rnE "MRP|mrp" src/components --include=*.tsx | head -8

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -rnoE "GSTR[-0-9A-Z]*[^"'<]{0,60}" src --include=*.ts --include=*.tsx | grep -v generated | head -12; echo ---report; grep -rnliE "tax.?report|hsn.?summary|gst.?report|export.*csv" src/app --include=*.ts --include=*.tsx | head; echo ---cancel; grep -rnE "invoiceNumber|creditNote|CREDIT_NOTE" src/app/api/[storeId]/order*/ src/lib/orders 2>/dev/null --include=*.ts | grep -viE "return|refund|exchange" | head -10

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -rnE "issueOrFetchInvoice|markCodPaidAndIssueInvoice" src --include=*.ts --include=*.tsx | grep -vE "^src/lib/billing/invoice/(generate|cod-paid).ts" ; sed -n 1,40p src/lib/billing/invoice/cod-paid.ts

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -nE "invoice|ewaybill|eway|hsn|tax|gst|sub_total|selling_price|discount" src/lib/shipping/shiprocket-api.ts | head -30; grep -rnE "hsn:|tax:|ewaybill_no|sub_total:" src/lib/shipping --include=*.ts | head -20

Ran terminal command:  cd /d/study/ShopPulseAdmin && sed -n 340,385p src/lib/shipping/auto-ship-service.ts; echo ----; sed -n 455,500p src/lib/shipping/shipping-service.ts; grep -rnE "generateInvoice|print/invoice" src --include=*.ts --include=*.tsx | grep -v shiprocket-api.ts | head



Fetched https://html.duckduckgo.com/html/?q=GST+2.0+rate+rationalisation+22+September+2025+full+list+of+items+5%+18%+40%+shampoo+toothpaste+apparel+2500



Fetched 2 resources



Fetched https://gstcouncil.gov.in/sites/default/files/2025-09/faq_0.pdf



Fetched 2 resources



Fetched https://gstinvoices.in/blog/gst-invoice-rules-2026



Fetched 2 resources



Fetched https://html.duckduckgo.com/html/?q=GST+registration+mandatory+inter-state+supply+goods+own+website+small+seller+below+40+lakh+section+24+2026



Fetched 2 resources



Fetched https://html.duckduckgo.com/html/?q=GST+on+delivery+charges+charged+by+online+seller+to+customer+composite+supply+principal+supply+rate+different+GST+rates+items+cart



Fetched https://html.duckduckgo.com/html/?q=GST+apparel+2500+per+piece+sale+value+exclusive+of+GST+transaction+value+discount+inclusive+price+2625



Fetched https://html.duckduckgo.com/html/?q=e-invoice+threshold+2026+AATO+5+crore+30+days+reporting+10+crore+latest+update

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -rnE "GST_GRACE_DAYS\s*=" src | head -3; echo "--- billing-tab tax display"; grep -nE "tax|Tax|cgst|igst|taxable" "src/app/(dashboard)/[storeId]/(routes)/orders/[orderId]/components/sections/billing-tab.tsx" | head -30; echo "--- checkout blocks untaxed?"; grep -nE "isArchived|gst_fields_missing|getMissingTaxFields|isProductGstCompliant" "src/app/api/[storeId]/checkout/route.ts" | head

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -nE "slice\(0, ?2\)|slice\(2, ?12\)|stateCodeFromGstin|panFromGstin|STATE_MISMATCH|PAN_MISMATCH|mismatch" src/app/api/settings/billing/route.ts src/lib/billing/billing-schemas.ts "src/app/(dashboard)/[storeId]/(routes)/settings/billing-and-tax" -r | head

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -rnE "stateCodeFromGstin|panFromGstin|gstinToStateCode|\.slice\(0, 2\)" src --include=*.ts --include=*.tsx | grep -v generated | head

Ran terminal command:  cd /d/study/ShopPulseAdmin && grep -nE "computer-generated|Issued under composition" src/lib/billing/invoice/template.tsx; grep -nE "isCompositionScheme|priceMode +String|^  tax +Decimal|cessRate Decimal|totalTax +Decimal|ucsCode" prisma/schema.prisma; grep -nE "const isStartingGrace|stateCode: payload.stateCode|allowB2BInvoices: false" src/app/api/settings/billing/route.ts; grep -nE "tax: 0|hsn: ''" src/lib/shipping/auto-ship-service.ts; grep -nE "Math.max\(n, 1\), 12|v.length > 64" src/lib/billing/storefront-tax-schemas.ts

Created memory file []()

I audited the whole storefront GST flow (product → checkout → order → invoice) and checked the current law online. I only read code; nothing was changed. A CA still needs to check the final product rates — the platform can only give suggestions.

---

## 1. Basic GST concepts (short)

- **GST** is a tax the seller collects from the customer and pays to the government. Only a seller who is **GST-registered (has a GSTIN)** can collect it.
- **Same state** (seller and customer in the same state): the tax is split in two — **CGST + SGST**. In union territories without their own legislature (Chandigarh, Ladakh and a few others) the second half is called **UTGST** instead of SGST.
- **Different state**: a single **IGST** at the full rate.
- **HSN** is the product's category code, and the rate is decided by it. **Since 22 Sep 2025 ("GST 2.0") the main rates are 0%, 5%, 18% and 40%** (3% for jewellery). The 12% and 28% slabs are gone, and cess has been nil on everything (tobacco included) since 1 Feb 2026.
- **Inclusive pricing**: the ₹1,050 on the website already contains the GST. At 5%, the price before tax is 1000 and the tax is 50.
- **Invoice**: the legal bill. Each type of seller has to issue a different kind of document (details in section 5).

## 2. ShopPulse's legal role

Payments go straight into each merchant's **own Razorpay account**. So ShopPulse is a **software provider, like Shopify**, not a marketplace. That means ShopPulse does not have to collect the marketplace tax (TCS under GST) or deduct the marketplace TDS (Income Tax section 194-O).

- **Keep it this way.** If you later collect money into a ShopPulse account and pay merchants out of it, or build one common marketplace across stores, ShopPulse becomes an "e-commerce operator". That brings its own GST registration, TCS and monthly returns. Don't do that without a CA.
- **Your Terms of Service should say** that the merchant is the seller and is responsible for HSN codes, rates and invoices. ShopPulse's HSN suggestions are not tax advice.

## 3. What is already done right

- Tax is frozen per order line at checkout (HSN, rate, CGST/SGST/IGST).
- The same-state vs different-state split works.
- Buyer GSTIN checksum validation and the B2B opt-in work.
- Invoice counters run per store, per financial year, per invoice type, and can't collide.
- The apparel/footwear price rule is in the HSN catalogue and the seller can't override it.
- Products missing tax details get archived after the grace period, and GST settings changes are protected by OTP.

---

## 4. Critical mistakes (illegal, or wrong tax money)

| # | Problem | Why it's wrong | Fix |
|---|---|---|---|
| C1 | Invoice number `INV-2025-26-00042` is **17 characters** (`numbering.ts:47`). With an 8-character prefix it reaches 22. | Rule 46 allows **16 characters max**. | Use a format like `INV/2526/00042` (14) and limit the prefix to 5 characters. |
| C2 | **Every store's invoice is titled "Tax Invoice"** (`template.tsx:170`), even for unregistered sellers. | An unregistered seller can't issue a tax invoice. A composition seller or exempt goods need a "Bill of Supply". | Pick the document type from the seller's status (section 5). |
| C3 | The `isCompositionScheme` flag is saved but **the tax engine ignores it**. | A composition seller **can't collect GST** and **can't sell to other states**. | Composition store: zero tax, Bill of Supply, block deliveries to other states. |
| C4 | Switching back to INDIVIDUAL clears the GSTIN, but `gstRegistered` stays **true** (`route.ts:161`). | GST keeps being charged **without a GSTIN**, which is illegal. | Turn off GST when the GSTIN is removed (one status field, section 6). |
| C5 | **No GST on shipping or the COD fee** (`route.ts:901`). | Delivery and COD charges billed by the seller count as part of the sale and take the product's rate. Currently tax is under-reported. | Spread these charges over the order lines and tax them at each line's rate. |
| C6 | For COD orders the invoice is made **only after delivery** (`cod-paid.ts:73`). | For goods, the invoice must be issued **at or before dispatch**, and the parcel should carry it. | Issue the invoice at dispatch / courier booking, for both prepaid and COD. |
| C7 | The apparel/footwear ₹2,500 rule is checked against the **tax-inclusive price** (`hsn-lookup.ts:273`). | The law uses the **price before tax**. A ₹2,600 kurta is 2476 before tax, so 5% applies, but the code charges 18%. | Compare `inclusivePrice / 1.05` against 2500. For inclusive prices the cutoff is effectively **₹2,625**. |
| C8 | **The HSN catalogue rates are from before GST 2.0.** | Wrong rates. Verified examples: shampoo, hair oil, toothpaste and soap are now 5% (catalogue: 18%); chocolate and biscuits 5% (18%); pencils and exercise books 0% (12% / 18%); sanitary pads exempt (12%). **All 9 items at 12%** are definitely wrong, because that slab no longer exists. | Revise the catalogue with a CA. Show the rate as a suggestion and make the seller confirm it. |
| C9 | If a product has no HSN or rate, **0% tax is applied silently** (source `NONE`) and checkout isn't stopped. | Wrong tax, and the seller's liability. | For a registered store, block checkout for such products (or skip the grace period entirely). |
| C10 | The seller's `stateCode` is **not checked against the GSTIN** (the first 2 digits). The helper functions exist but nothing calls them. | A wrong state makes every CGST/IGST decision wrong. | Derive the state code automatically from the GSTIN. |
| C11 | If the shipping state isn't recognised, **IGST is applied silently** (`order-tax-engine.ts:131`). | Silent wrong tax. | Storefront should use a state dropdown; reject the checkout if the state can't be resolved. |
| C12 | The invoice prints **"Total tax: ₹0"** (it reads `Order.tax`, which is 0 for inclusive prices). There is **no COD fee row**, so the totals don't add up. | The invoice contradicts itself. | Print taxable value, CGST, SGST and IGST totals; add shipping and COD rows with their tax. |

## 5. Which document each seller must issue

| Seller | Document | GST shown? |
|---|---|---|
| Registered (regular) + taxable goods | **Tax Invoice** | Yes, CGST/SGST or IGST |
| Registered + only exempt or 0% goods | **Bill of Supply** | No |
| Registered + mix of taxable and exempt (B2C) | **Invoice-cum-Bill of Supply** | Only on the taxable lines |
| Composition seller | **Bill of Supply** with the line *"composition taxable person, not eligible to collect tax on supplies"* | No |
| Not registered | A simple "Invoice" or "Order receipt" | **Nothing about GST** |

**Things missing from the Tax Invoice today:**
- Unit price.
- Unit of quantity (PCS, PRS for pairs, etc.).
- Place of supply with the **state name** (only the code is printed now).
- A **"Reverse charge: No"** line.
- A COD row.
- Tax on shipping.
- A UTGST label for union territories.
- Dates in IST.

Also, a plain-text `_comment` in `hsn-reference.json` points to an internal planning note; it should be removed.

## 6. Medium issues (bad data or design)

1. **`priceMode`:** this is not the usual term. Shopify calls it "taxes included in prices" and WooCommerce uses `prices_include_tax`. It has **no UI or API**, so it is always INCLUSIVE and the EXCLUSIVE path is dead code. EXCLUSIVE is also risky for consumer (B2C) sales, because a packaged product can't be sold above MRP. **Rename it to `pricesIncludeTax Boolean @default(true)`** and keep it always true for now.
2. **`Order.tax` meaning:** it is 0 for inclusive orders. Rename it to `taxTotal` and always store the actual GST. Also add order-level totals: `taxableTotal`, `cgstTotal`, `sgstTotal`, `igstTotal`.
3. **`Payment` holds tax and invoice fields.** The Payment tax result fields (`taxableAmount`, `totalTax`, …) are **never written**. Tax facts like place of supply and the seller snapshot belong on **Order**. The invoice should be its own **`Invoice` model**, not part of Payment.
4. **`cessRate`** is obsolete now; remove it from Product and OrderItem. **The 12% and 28% slabs** are still in the product form's allowed list; remove them.
5. **`ucsCode`:** the correct term is UQC. The list is missing PRS, NOS, SET, DOZ, GMS and MLT. It is also **not saved on OrderItem**, but invoices and returns need it.
6. **Dates:** the financial year is calculated from the server's timezone (`numbering.ts:24`) and the invoice date is printed in UTC. An order at 12:30 AM on 1 April could land in the previous financial year. Use IST.
7. **Invoice SGST vs IGST label:** at invoice time it compares a state code ("27") with a state name, so the label can be wrong. Use the stored amounts instead.
8. **Rounding:** CGST and SGST are each rounded from half the tax, so they can be 1 paisa off. Compute them so that taxable value + tax equals the line total exactly.
9. **Two invoice-number settings:** `invoiceNumberFormat` (unused, up to 64 characters) and `invoicePrefix` (the one actually used). Keep only one.
10. **`einvoiceEnabled`:** the toggle exists but there is no connection to the government's invoice registration portal (IRP).
11. **Shiprocket:** it receives `hsn: ''` and `tax: 0` (`auto-ship-service.ts:368`). There is no e-way bill handling, though orders of ₹50,000+ need one. Also make sure Shiprocket's own invoice-printing feature is never used, so there is only one invoice series.
12. **Storefront:** the cart shows "Tax (Included) ₹0", which is misleading. The product page has no "Inclusive of all taxes" label.
13. **B2B orders:** if the shipping state differs from the buyer's GSTIN state, the buyer may lose the input tax credit (ITC) they would claim on their own GST. Show a warning; a CA should confirm the rule. The buyer's GSTIN is also not checked for being active.
14. **Pickup location:** if the pickup address is in a different state than the GSTIN, that's a problem — the seller needs a GSTIN in that state too. Add a check.

## 7. Missing features (needed for a real business)

- **Unregistered sellers selling to other states:** by law, anyone sending goods to another state must register for GST, whatever their turnover. Make **"deliver only in my state"** the default for non-GST stores, and let the seller lift it only with a written self-declaration (so the liability is on them).
- **Reports for the GST return (GSTR-1):** B2B invoices, large interstate B2C invoices (₹1 lakh+), state-wise B2C summary, HSN summary, document summary. Without this, a registered seller can't file returns.
- **E-way bill:** for orders of ₹50,000+, require the e-way bill number before booking the courier.
- **E-invoice (IRN) for B2B** when turnover is above ₹5 crore: either integrate the government invoice portal through a provider, or block B2B invoices for such stores.
- **HSN digits by turnover:** above ₹5 crore, 6-digit HSN is mandatory on every invoice. Recommend 6–8 digits in general, because many rates only become exact at that level.
- **GSTIN live check:** whether it is active, plus its legal name and address. Also turnover alerts for unregistered sellers approaching the registration limit.
- **Credit note:** if an invoice was issued and the order is cancelled before dispatch. Moving invoicing to dispatch time makes this case rare.

## 8. Target design

```mermaid
flowchart LR
  P[Product: HSN + rate] --> C[Checkout tax engine]
  S[Store: gstStatus + state from GSTIN] --> C
  A[Shipping state code] --> C
  C --> OI[OrderItem: taxable, CGST/SGST/IGST, UQC]
  C --> O[Order: totals + place of supply + seller snapshot]
  O --> D{Dispatch}
  D --> I[Invoice model: correct document type, number up to 16 chars, IST date]
  I --> R[GSTR-1 reports]
```

- **Store:** replace `gstRegistered` + `isCompositionScheme` with **one field: `gstStatus` = UNREGISTERED / REGULAR / COMPOSITION**, so impossible combinations can't happen. Add `pricesIncludeTax`, state code taken from the GSTIN, and the "deliver only in my state" restriction.
- **Product:** `hsnCode` (6–8 digits), `taxRate` (0/3/5/18/40), `taxBracketRule` (keep it, but compare the price before tax), `isExempt`, `uqc`. Remove `cessRate`.
- **OrderItem:** keep the current snapshots, add a UQC snapshot, remove cess.
- **Order:** `taxTotal`, `taxableTotal`, `cgstTotal`, `sgstTotal`, `igstTotal`, tax on shipping and the COD fee, place of supply state code, an inter-state flag, and snapshots of the seller's GST status and GSTIN.

**Example of the correct calculation.** A Maharashtra seller ships to a Karnataka customer: a T-shirt at ₹1,050 + shipping ₹59 + COD fee ₹30.
- T-shirt: before tax 1000.00, IGST 5% = 50.00.
- Shipping + COD (₹89 at the same 5%): before tax 84.76, IGST 4.24.
- Invoice: taxable 1084.76, IGST 54.24, total **1139.00**.
- Today the invoice shows only 50 tax, no tax on shipping, no COD row, and "Total tax ₹0".

## 9. Suggested order of work

- **P0 (before launch — legal):** C1–C12, document types, composition handling, the delivery restriction for non-GST stores, catalogue rates revised by a CA.
- **P1:** schema cleanup (section 8), GSTR-1 reports, e-way bill, storefront labels, B2B checks.
- **P2:** e-invoice (IRN) integration, GSTIN live check, turnover alerts.

## 10. Questions for a CA

1. When one order has items at different rates, should shipping and the COD fee be split proportionally across items, or taxed at the highest rate?
2. For B2B orders where billing and shipping states differ: is the place of supply the buyer's GSTIN state or the shipping state?
3. Correct rates for every catalogue HSN, especially the ones at 12%. Also whether made-up textiles (bed linen, curtains — HSN chapter 63) follow the ₹2,500 rule.
4. ShopPulse's "not a marketplace" position, and the Terms of Service wording.
5. Grace period, or immediate blocking, when a seller registers for GST?

Should I start implementing the P0 items?