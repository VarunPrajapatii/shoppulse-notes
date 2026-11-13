Main pehle products, orders, aur shipments ke actual UI-to-API search path ko trace karunga, phir current searchable fields aur scale bottlenecks ko evidence ke saath Shopify-style recommendation mein condense karunga. Is turn mein code change nahi karunga; output architecture decision aur implementation-ready prompt hoga.

Main current behavior ko teen surfaces par alag trace kar raha hoon: products, orders, aur shipments. Saath hi Prisma indexes/pagination dekhunga, kyunki UI mein ek jaisa search box hona backend par ek jaisi scalability guarantee nahi karta.

Trace order shipment search

Trace product search

Find search conventions

Read [](file:///d%3A/study/ShopPulseAdmin/package.json)

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#1-1), lines 1 to 50

Searched for files matching `**/src/**/*order*list* -node_modules`, no matches

Searched for files matching `**/src/**/*shipment*list* -node_modules`, no matches

Searched for files matching `**/src/**/admin/**order* -node_modules`, no matches

Searched for files matching `**/src/**/admin/**shipment* -node_modules`, no matches

Searched for files matching `**/src/app/**/products*`, no matches

Searched for regex `products.*page|products.*layout` (`**/src/**`), 12 results

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#1-1), lines 1 to 100

Searched for regex `searchProducts|getProducts|/products` (`**/src/**`), 59 results

Read [](file:///d%3A/study/ShopPulseAdmin/src)

Read [](file:///d%3A/study/ShopPulseAdmin/src/app)

Searched for regex `tsquery|plainto_tsquery|@@ websearch|pg_trgm|similarity|ilike|full.?text`, 63 results

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

Searched for regex `cursor|pagination|limit.*offset|debounce`, 80 results

Searched for regex `search.*normalize|normalize.*search|trimLower|toLowerCase`, 91 results

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29)

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D)

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29)

Searched for regex `search.*filter|filter.*search|listSearch|searchFilter|clientSearch`, 22 results

Searched for regex `Raw\(|prisma.*\$queryRaw|executeRaw`, 1 result

Read [](file:///d%3A/study/ShopPulseAdmin/src/hooks/use-cursor-pagination.ts#1-1), lines 1 to 120

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/orders)

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/shipments)

Searched for regex `like|ilike|where.*name|where.*search|filter.*name`, 107 results

Searched for files matching `**/src/lib/**/*search* src/utils/**/*search*`, no matches

Read [](file:///d%3A/study/ShopPulseAdmin/src/lib/usage-service.ts#170-170), lines 170 to 200

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/orders/components)

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/shipments/components)

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/orders/page.tsx)

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/shipments/page.tsx)

Searched for regex `model Product|@@index` (`**/prisma/schema.prisma`), 101 results

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/products/page.tsx)

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/products/route.ts#1-1), lines 1 to 150

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/shipments/v2/route.ts#1-1), lines 1 to 260

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/orders/route.ts#1-1), lines 1 to 260

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/orders/components/orders-client-v2.tsx#1-1), lines 1 to 300

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/shipments/components/shipments-client-v2.tsx#1-1), lines 1 to 300

Searched for regex `export.*search|export.*normalize|export.*filter.*helper`, 3 results

Searched for files matching `**/src/lib/*.ts src/utils/*.ts`, no matches

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#329-329), lines 329 to 470

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/products/route.ts#150-150), lines 150 to 250

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/products/components/client.tsx)

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/orders/components/orders-client-v2.tsx#300-300), lines 300 to 600

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/shipments/components/shipments-client-v2.tsx#200-200), lines 200 to 400

Read [](file:///d%3A/study/ShopPulseAdmin/src/lib/billing/hsn-lookup.ts#65-65), lines 65 to 90

Read [](file:///d%3A/study/ShopPulseAdmin/src/components/shipping/tracking/tracking-search-form.tsx)

Searched for files matching `**/src/hooks/use-cursor-pagination*`, 1 match

Searched for files matching `**/src/api/**/orders* -node_modules`, no matches

Searched for files matching `**/src/api/**/shipments* -node_modules`, no matches

Searched for regex `searchKey|debounce|filter` (`**/src/components/ui/data-table*`), 23 results

Searched for files matching `**/src/components/ui/data-table*`, 2 matches

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/products/components/columns.tsx)

Read [](file:///d%3A/study/ShopPulseAdmin/src/hooks/use-cursor-pagination.ts#1-1), lines 1 to 250

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api)

Searched for regex `contains.*insensitive|mode.*insensitive`, 29 results

Read [](file:///d%3A/study/ShopPulseAdmin/src/components/ui/data-table.tsx#1-1), lines 1 to 100

Read [](file:///d%3A/study/ShopPulseAdmin/src/components/ui/data-table.tsx#1-1), lines 1 to 110

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

Read [](file:///d%3A/study/ShopPulseAdmin/src/hooks/use-cursor-pagination.ts#200-200), lines 200 to 284

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D)

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/orders)

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/shipments)

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

Searched for regex `@@fulltext|@@index.*name|@@index.*description` (`**/prisma/schema.prisma`), 2 results

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/orders/route.ts#1-1), lines 1 to 300

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/shipments/v2)

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#680-680), lines 680 to 700

Searched for regex `tenant|storeId|access|scop` (`**/src/lib/**`), 100 results

Read [](file:///d%3A/study/ShopPulseAdmin/src/components/ui/data-table.tsx#1-1), lines 1 to 25

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/orders/route.ts#300-300), lines 300 to 372

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/shipments/v2/route.ts#1-1), lines 1 to 300

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#1-1), lines 1 to 50

Searched for regex `model Order|model Shipment`, 4 results

Read [](file:///d%3A/study/ShopPulseAdmin/src/components/ui/data-table.tsx#38-38), lines 38 to 120

Searched for regex `search|/products.*route` (`**/src/app/api/**`), 93 results

Searched for files matching `**/src/lib/*tenant* src/lib/*store* src/lib/*access*`, no matches

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#566-566), lines 566 to 700

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#1358-1358), lines 1358 to 1500

Searched for files matching `**/src/lib/api-with-store-check* src/lib/*check*`, no matches

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

Read [](file:///d%3A/study/ShopPulseAdmin/src/components/ui/data-table.tsx#90-90), lines 90 to 100

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

Searched for regex `withStoreAccessCheck|withStoreCheck|middleware.*store` (`**/src/lib/**`), 4 results

Searched for regex `withStoreAccessCheck` (`**/src/**`), 20 results

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/shipments/v2/route.ts#200-200), lines 200 to 312

Read memory

Read [](file:///d%3A/study/ShopPulseAdmin/src/components/ui/data-table.tsx#115-115), lines 115 to 140

Read [](file:///d%3A/study/ShopPulseAdmin/src/lib/api-with-store-check.ts#1-1), lines 1 to 100

Read [](file:///d%3A/study/ShopPulseAdmin/src/components/ui/data-table.tsx#1-1), lines 1 to 30

Searched for regex `model Product.*\n.*\{|@@.*Product|@@index.*storeId.*|@@unique.*storeId` (`**/prisma/schema.prisma`), 56 results

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#445-445), lines 445 to 455

Read [](file:///d%3A/study/ShopPulseAdmin/src/components/ui/data-table.tsx#44-44), lines 44 to 60

Read memory

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

Read [](file:///d%3A/study/ShopPulseAdmin/src/components/ui/data-table.tsx#1-1), lines 1 to 135

Created memory file [](file:///c%3A/Users/Varun%20Prajapati/AppData/Roaming/Code/User/workspaceStorage/e2f0ba3a5d61b3e2152f7d601e58de94/GitHub.copilot-chat/memory-tool/memories/NTdiZjEwOWQtM2U4OC00NDA1LThiMjQtN2E3MjBjMDg0ZjBj/products-search-flow-trace.md)

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/products/components/client.tsx#1-1), lines 1 to 45

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/products/page.tsx#1-1), lines 1 to 10

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/products/route.ts#30-30), lines 30 to 75

Products ka path orders/shipments se materially different nikla: products poora store catalog browser mein load karke sirf name par filter karta hai, jabki orders/shipments server-side debounced search aur cursor pagination use karte hain. Ab main order/shipments ke exact predicates aur schema indexes verify karke scale recommendation lock kar raha hoon.

Read [](file:///c%3A/Users/Varun%20Prajapati/AppData/Roaming/Code/User/workspaceStorage/e2f0ba3a5d61b3e2152f7d601e58de94/GitHub.copilot-chat/chat-session-resources/57bf109d-3e88-4405-8b24-7a720c084f0c/call_UsN1rR2scDS2zLbjAUHcHmug__vscode-1785411203596/content.txt)

Ek important correction bhi saamne aayi: schema mein normal B-tree indexes hone ka matlab `contains`/`ILIKE '%text%'` fast hona nahi hai. Large tables par ye predicates aksar index use nahi karte, isliye current cursor pagination strong hai lekin free-text lookup itself 100k-per-seller ya billion-total scale ke liye abhi sufficient nahi hai.

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/orders/route.ts#30-30), lines 30 to 220

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/shipments/v2/route.ts#30-30), lines 30 to 180

Read [](file:///d%3A/study/ShopPulseAdmin/src/hooks/use-cursor-pagination.ts#70-70), lines 70 to 230

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/products/page.tsx#1-1), lines 1 to 90

Read [](file:///d%3A/study/ShopPulseAdmin/src/components/ui/data-table.tsx#1-1), lines 1 to 120

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#320-320), lines 320 to 470

Current verdict ab clear hai: orders aur shipments ka mechanism same shared hook + same keyset pagination pattern hai, fields alag hain; products us architecture par migrated nahi hain. Recommendation mein main “one giant fuzzy OR search” nahi rakhunga: identifier lookups ko exact/prefix indexed lanes, human text ko normalized/full-text lane, aur operational attributes ko explicit filters banana scale aur seller UX dono ke liye sahi rahega.

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/orders/route.ts#190-190), lines 190 to 300

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/shipments/v2/route.ts#130-130), lines 130 to 230

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#560-560), lines 560 to 710

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#1345-1345), lines 1345 to 1495

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/orders/components/orders-client-v2.tsx#250-250), lines 250 to 535

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/shipments/components/shipments-client-v2.tsx#160-160), lines 160 to 285

Shopify-style behavior ko accurately frame karne ke liye main official query syntax aur Orders/Products Admin API filter sets cross-check kar raha hoon. Shipments Shopify mein usually fulfillment-centric hote hain, isliye wahan recommendation direct copy nahi hogi; ShopPulse ke courier/AWB workflow ke operational identifiers retain honge.







Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/products/components/client.tsx)

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/orders/components/orders-client-v2.tsx#130-130), lines 130 to 285

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/orders/components/orders-client-v2.tsx#470-470), lines 470 to 545

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/shipments/components/shipments-client-v2.tsx#225-225), lines 225 to 300

Fetched https://shopify.dev/docs/api/usage/search-syntax

Fetched https://shopify.dev/docs/api/admin-graphql/latest/queries/orders

Fetched https://shopify.dev/docs/api/admin-graphql/latest/queries/products

Recommended field set ko existing schema se align karne ke liye main ab SKU/payment identifiers aur shipment dimensions ke available columns check kar raha hoon. Isse prompt aspirational wishlist nahi, implementable scope dega aur absent concepts ko optional future work ke roop mein separate rakhega.

Searched for regex `snapshot.*sku|sku|razorpayOrderId|razorpayPaymentId|paymentProvider|model Payment` (`**/prisma/schema.prisma`), 25 results

Searched for regex `Search AWB|Search ID|placeholder=.*Search` (`**/src/app/(dashboard)/[[]storeId[]]/**`), 13 results

Searched for regex `@@index\(\[storeId, courierCode\]\)|@@index\(\[storeId, courierName\]\)|@@index\(\[shipmentNumber\]\)` (`**/prisma/schema.prisma`), 3 results

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

Searched for regex `model ProductVariant|sku\s+String|barcode` (`**/prisma/schema.prisma`), 5 results

Searched for regex `orderNumber|displayOrder|slice\(0, 8\)` (`**/src/**`), 154 results

Schema check se ek aur product decision nikla: seller-facing order number persisted nahi hai; UI UUID ke first 8 chars ko display number bana raha hai. Scale par ye durable contract nahi hai. Implementation prompt mein per-store unique immutable display order number add karna chahiye, aur existing UUID ko exact internal lookup tak limit karna chahiye.

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#700-700), lines 700 to 745

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#1025-1025), lines 1025 to 1130

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#275-275), lines 275 to 325

Read [](file:///d%3A/study/ShopPulseAdmin/prisma/schema.prisma#1-1), lines 1 to 30

Read [](file:///d%3A/study/ShopPulseAdmin/src/app/api/%5BstoreId%5D/shipments/route.ts#90-90), lines 90 to 155

Read [](file:///d%3A/study/ShopPulseAdmin/package.json)

Final recommendation Postgres-first rahegi, OpenSearch-first nahi: 100k records per seller ke liye routed exact/prefix queries, trigram only for human text, composite keyset indexes, aur strict tenant scoping enough hain. Billion aggregate par same API contract ko tenant-routed partitions/shards ya OpenSearch projection ke peeche move kiya ja sakta hai; seller request ko kabhi global billion-row search nahi banana chahiye.

Read memory [](file:///c%3A/Users/Varun%20Prajapati/AppData/Roaming/Code/User/workspaceStorage/e2f0ba3a5d61b3e2152f7d601e58de94/GitHub.copilot-chat/memory-tool/memories/repo/project-state-critical.md)

## TL;DR

Aapne **Products** aur **Shipments** URLs diye hain, lekin Orders ka comparison bhi poocha tha, isliye maine teeno check kiye.

- **Orders aur Shipments ka search architecture same hai:** 300ms debounce → API request → store-scoped database search → 50-row cursor pagination.
- **Search fields aur filters alag hain.**
- **Products search same nahi hai:** saare products pehle browser mein load hote hain, phir sirf product name par client-side filtering hoti hai.
- Current cursor pagination achchi hai, lekin multi-field `contains` search 100k orders/store ke liye ideal nahi hai.
- Normal PostgreSQL B-tree indexes `ILIKE '%value%'` ko effectively accelerate nahi karte.
- Billion total rows mein query ko kabhi billion rows search nahi karni chahiye. Pehla routing boundary hamesha `storeId` hona chahiye.

## Current Behaviour

### Products

products/page.tsx/[storeId]/(routes)/products/page.tsx#L20) store ke **saare products**, categories aur variants load karta hai. Server pagination nahi hai.

client.tsx/[storeId]/(routes)/products/components/client.tsx#L38) generic DataTable ko `searchKey="name"` deta hai.

data-table.tsx browser memory mein filtering karta hai:

- Searchable: **Product name only**
- Match: case-insensitive substring
- Debounce: nahi
- Server search: nahi
- Pagination: browser-side, default 10
- URL parameters: nahi
- SKU, variant SKU, category, HSN search: nahi

Ye 100–500 products tak acceptable hai, 10k+ catalog ke liye nahi.

### Orders

orders-client-v2.tsx/[storeId]/(routes)/orders/components/orders-client-v2.tsx#L245) shared cursor hook use karta hai. use-cursor-pagination.ts 300ms debounce aur 50-row pages use karta hai.

route.ts mein free-text `search` in fields par `OR` hota hai:

- Order UUID: partial/contains
- Customer phone: partial/contains
- Customer name: partial/contains
- Customer email: partial/contains
- Shipping pincode: prefix

Additional filters:

- Order status
- Needs manual review
- Auto-ship failed
- Delivery failed
- Created date range
- B2B/GST invoice order

### Shipments

shipments-client-v2.tsx/[storeId]/(routes)/shipments/components/shipments-client-v2.tsx#L177) bhi wahi hook, debounce, page size aur cursor strategy use karta hai.

route.ts search karta hai:

- AWB
- Internal shipment UUID
- Shipment number
- Order UUID
- Provider, exact enum match after uppercase normalization
- Provider order ID
- Provider shipment ID
- Courier name
- Courier code

Additional filters:

- Shipment status
- NDR action required
- NDR action taken

**Conclusion:** Orders aur Shipments ka transport/pagination mechanism same hai, lekin query predicates same nahi hain.

## Scale Problem

Current keyset pagination, `storeId` authorization aur `(storeId, createdAt)` indexes sahi direction mein hain. Problem free-text query hai:

```sql
name ILIKE '%rahul%'
OR email ILIKE '%rahul%'
OR phone ILIKE '%rahul%'
OR id ILIKE '%rahul%'
```

Normal indexes hone ke bawajood leading `%` ke kaaran PostgreSQL ko seller ke bahut saare rows inspect karne pad sakte hain. Shipment mein ye nine-way `OR` hai.

Dusri important problem: ShopPulse mein persisted seller-facing order number nahi hai. UI UUID ke first eight characters ko order number jaisa dikhata hai. Industry-standard system ko immutable, concurrency-safe `ORD-000123` jaisa per-store unique display number chahiye.

## Recommended Search Parameters

| Resource | Omnibox search | Structured filters |
|---|---|---|
| Products | Product name, product SKU, variant SKU, product ID | Category, active/archived, featured, stock state, price range, HSN, created/updated date |
| Orders | Display order number, exact UUID, customer name, normalized email, normalized phone, pincode, product SKU, Razorpay order/payment ID, invoice number, AWB | Order status, paid/unpaid, payment method, fulfillment state, review state, B2B, amount range, created/updated date |
| Shipments | Shipment number, AWB, order number/UUID, provider order/shipment ID, customer name/phone/email, courier name/code | Status, provider, courier, shipment kind, NDR, pickup/drop-off, surface/air, COD, auto-ship, pickup location and date |

Address lines, notes, descriptions aur arbitrary JSON ko default omnibox mein search nahi karna chahiye. Ye noisy results aur expensive queries produce karenge.

Shopify bhi cursor pagination, structured field syntax, range operators, saved searches aur explicit sort keys use karta hai. References: [Shopify search syntax](https://shopify.dev/docs/api/usage/search-syntax), [Orders filters](https://shopify.dev/docs/api/admin-graphql/latest/queries/orders), [Products filters](https://shopify.dev/docs/api/admin-graphql/latest/queries/products).

## Implementation TL;DR

1. **PostgreSQL-first rakho:** 100k rows/store ke liye abhi OpenSearch ki operational complexity zaroori nahi.
2. Products ko Orders/Shipments jaisi server-side cursor API par migrate karo.
3. Persisted `displayOrderNumber` add karo; UUID sirf internal exact lookup rahe.
4. Email, phone aur identifiers ke normalized columns banao.
5. Identifiers par exact/prefix B-tree queries; customer/product names par `pg_trgm`.
6. One giant `OR` ke badle query classify karo: UUID, email, phone, pincode, AWB, SKU ya normal text.
7. Advanced field syntax support karo, jaise `email:`, `phone:`, `sku:`, `awb:`; UI filter chips bhi wahi parameters generate karein.
8. Cursor ko opaque, store-scoped aur `(createdAt, id)` based rakho; composite indexes mein `id` bhi include karo.
9. Search/filter state URL mein persist karo aur stale requests cancel karo.
10. Billion aggregate rows par PostgreSQL ko `storeId` se partition/shard karo. Rich fuzzy search ke liye baad mein OpenSearch projection use ho sakti hai, with `storeId` as routing key; PostgreSQL source of truth rahega.

## Implementation Prompt

```text
Implement production-grade, tenant-scoped Admin search for Products, Orders,
and Shipments in ShopPulseAdmin.

First inspect the current Products DataTable flow, useCursorPagination hook,
Orders API, Shipments v2 API, Prisma schema, checkout order creation paths,
and existing migrations. Preserve existing authorization and business filters.

Requirements:

1. Migrate Products from loading the complete catalog into the browser to a
server-side API using the existing cursor-pagination response contract.
Use 50 rows per page, maximum 100, ordered by createdAt DESC and id DESC.

2. Add a persisted, immutable, concurrency-safe seller-facing order number.
It must be unique per store and usable as an exact/prefix search identifier.
Do not treat id.slice(0, 8) as the canonical order number. Update every order
creation path and relevant Admin display.

3. Implement a shared validated query contract:
q, cursor, direction, limit, sort, and resource-specific filters.
Support fielded terms such as order:, id:, email:, phone:, pincode:, sku:,
awb:, shipment:, provider_order:, provider_shipment:, invoice:, and razorpay:.
Unknown fields and malformed values must return HTTP 400.

4. Do not implement default search as one unrestricted contains OR query.
Classify unqualified input:
- UUID => exact internal ID
- email => normalized exact/prefix email
- digits => display number, normalized phone, pincode, or AWB as applicable
- other text of at least 3 characters => customer/product/courier name search

5. Search fields:
Products: name, product SKU, variant SKU, exact product ID.
Orders: display order number, exact UUID, customer name, normalized email,
normalized phone, pincode, product/variant SKU, Razorpay IDs, invoice number,
and AWB.
Shipments: shipment number, AWB, order number/UUID, provider IDs, customer
name/email/phone, courier name, and courier code.

6. Keep operational properties as explicit filters rather than fuzzy text.
Products: category, archived, featured, stock state, price, HSN, dates.
Orders: status, paid state, payment method, review state, B2B, amount, dates.
Shipments: status, provider, courier, kind, NDR, handover, shipping mode, COD,
auto-shipped, pickup location, and dates.

7. Add normalized searchable columns where required. Use B-tree composite
indexes beginning with storeId for exact/prefix identifiers and filters.
Use PostgreSQL pg_trgm only for human text such as customer and product names.
Replace pagination indexes with (storeId, createdAt DESC, id DESC), including
status variants. Avoid contains searches on UUIDs, AWBs, payment IDs, and SKUs.

8. Every data query and cursor lookup must be scoped to the authenticated
store. Encode an opaque cursor containing the complete sort tuple and reject
a cursor that does not belong to the current store/query.

9. Reuse the existing 300ms debounce, cancel stale HTTP requests, reset the
cursor when search or filters change, and persist search/filter state in URL
search parameters. Add accessible filter chips and accurate placeholders.

10. Add parser unit tests, API integration tests for every searchable field,
tenant-isolation tests, filter-plus-cursor tests, and Products pagination tests.
Add a performance seed/test for 100k orders and shipments and inspect EXPLAIN
ANALYZE. Identifier and normal filtered queries must use appropriate indexes
and must not degrade into broad table scans.

The project is development-only with no production data. Keep migrations
direct; do not add compatibility shims, dual writes, or data backfill scripts.
Do not execute a database reset without explicit approval. Do not introduce
OpenSearch yet, but document that a future search projection must route by
storeId and hydrate authoritative records from PostgreSQL.

Do not put internal planning labels, document references, or task numbering
inside code comments or symbol names. Run Prisma generation, targeted tests,
TypeScript checks, lint for touched files, and report EXPLAIN evidence.
```

No files were changed for this analysis.