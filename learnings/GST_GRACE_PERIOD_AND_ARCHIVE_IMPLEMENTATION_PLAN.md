# GST D12 — Grace Period & Soft-Archive (HSN/Tax-fields Missing) — Implementation Plan

> Companion to **GST_AND_TAX_FOR_ECOMMERCE_PART_4_DECISION_SHEET.md** (decision **D12**) and **PART_5_CROSS_APP_FEATURE_MAP.md** (screens **A2, A4, A7, B1, C1/C2, C3**).
>
> This plan covers what we build **after** Phase 5.1 (schema + bracket data + product-form UX) is in. It addresses the remaining D12 enforcement loop:
>
> *"After a store flips itself to GST-registered, every existing product needs HSN/taxRate/UCS within 3 days. After day 3, products that still don't have them are auto-archived (`Product.isArchived = true`, `archivedReason = 'gst_fields_missing'`) so they disappear from the storefront. The seller cannot un-archive them until the missing tax fields are filled."*
>
> This is **NOT** the existing plan-downgrade overage flow. It reuses the same building blocks (cron, archive helpers, dashboard banner) but is a **separate enforcement track** with its own state machine.

---

## 1. Background — what we already have (re-use surface)

| Concern | Existing implementation | Location |
| --- | --- | --- |
| Plan-downgrade grace period (5 days) | `subscription.metadata.grace_period.{start_date, end_date, enforcement_date}` JSON blob; `User.usageGracePeriod` boolean flag | `prisma/schema.prisma` (User), `src/lib/usage-service.ts` `getOverageSummary()` / `enforceGracePeriodDeletions()` |
| Daily cron driving the grace lifecycle | `src/app/api/cron/downgrade-lifecycle/route.ts` (Phase 1: pre-downgrade warnings · Phase 2: post-downgrade enforcement) | Vercel cron `0 4 * * *` in [vercel.json](../../vercel.json) |
| Snapshot-archive (hard delete + ArchivedProduct row) for products **with active orders** | `archiveProductsByIds(ids, reason)` → creates `ArchivedProduct`, deletes `Product`, sets `OrderItem.productId = NULL` (FK is `ON DELETE SET NULL`) | `src/lib/archive-product.ts` |
| Cloudinary cleanup for products **without orders** | Same helper auto-detects `orderCount === 0` and calls `deleteProductImagesFromCloudinary` instead of snapshotting | `src/lib/archive-product.ts` |
| 90-day cleanup of expired snapshots | `src/app/api/cron/cleanup-archived-products/route.ts` runs weekly `0 5 * * 0` | [vercel.json](../../vercel.json) |
| Soft-archive boolean on the live `Product` row | `Product.isArchived: Boolean`, `archivedReason: String?`, `archivedAt: DateTime?` (already in schema) | `prisma/schema.prisma:336-340` |
| Seller-facing notification primitives | `notifySeller()`, `graceReminderEmail/SMS`, `enforcementDoneEmail/SMS`, `preDowngradeReminderEmail/SMS` | `src/lib/notifications/platform/templates/`, `notify-seller.ts` |
| Plan downgrade UX banner (existing) | Dashboard / settings banner reads `User.usageGracePeriod` + `subscription.metadata.grace_period` and renders a countdown card | (search for `usageGracePeriod` in dashboard layout) |

> **Critical distinction.** The downgrade flow **deletes** products and snapshots them into `ArchivedProduct`. The GST D12 flow **does not delete** anything — it only flips `Product.isArchived = true`. The product stays in the live `Product` table; the seller fixes the missing field; we flip it back to `isArchived = false`. We **never** create an `ArchivedProduct` row for D12.

---

## 2. State model — what "missing tax fields" means

A product is **D12-non-compliant** for a store with `gstRegistered = true` when **any** of these holds and `isExempt !== true`:

```ts
const isD12NonCompliant =
  store.gstRegistered === true &&
  product.isExempt !== true &&
  (
    !product.hsnCode ||
    !product.ucsCode ||
    (
      product.taxRate === null &&            // no flat manual rate AND
      product.taxBracketRule === null &&     // no manual bracket AND
      !hasCatalogueBracket(product.hsnCode)  // catalogue HSN doesn't carry one either
    )
  );
```

Helper lives at:

* `src/lib/billing/d12-compliance.ts` (NEW) — exports `isProductD12Compliant(product, store)` and `findNonCompliantProducts(storeId)`.

We re-use the existing `getEffectiveRate()` to figure out whether a per-line rate would resolve at checkout — if `getEffectiveRate(product, anyPrice).source === 'NONE'` and the product isn't exempt, it's non-compliant.

---

## 3. Schema additions — Phase 5.2 ✅ IMPLEMENTED

Add to `Store` (in addition to the Phase 5.1 fields already merged):

```prisma
model Store {
  // ... existing GST 2.0 fields from Phase 5.1 ...

  /// D12 — when the store flips to gstRegistered = true, we stamp this
  /// to start the 7-day grace clock. Cleared when the store
  /// flips back to false (deferred-downgrade path) or once every
  /// product is compliant.
  gstGraceStartedAt          DateTime?
  /// D12 — derived value persisted for fast banner rendering.
  /// = gstGraceStartedAt + 3 days. Null when no grace is active.
  gstGraceEndsAt             DateTime?
  /// Set to true the first time the cron runs *after* gstGraceEndsAt,
  /// finds non-compliant products, and archives them. Lets the UI show
  /// "We've hidden N products — fix tax fields to publish them again."
  gstEnforcementApplied      Boolean   @default(false)
  /// Counter so we can show "N products hidden" in the banner
  /// without re-querying every page load.
  gstHiddenProductCount      Int       @default(0)
  /// Idempotency lock — the cron stamps this when a run starts so a
  /// concurrent execution can no-op for the same store.
  gstEnforcementRunAt        DateTime?
}
```

Add to `Product` — only an enum widening (the column already exists as `String?`):

```prisma
// Product.archivedReason allowed values (string discriminator, no enum
// migration needed):
//   'manual'              — seller toggled the archive switch in product form
//   'out_of_stock'        — auto-archived by inventory cron (existing)
//   'gst_fields_missing'  — NEW: D12 cron archived this row
```

Migration name: `phase_5_2_gst_grace_fields`.

---

## 4. Backend checks / verifications / enforcements

### 4.1 Settings PATCH `/api/[storeId]/settings/billing-and-tax` — registration flip ✅ IMPLEMENTED

**File**: `src/app/api/[storeId]/settings/billing-and-tax/route.ts` (existing route).

When the payload sets `gstRegistered: true` and current `store.gstRegistered === false`:

1. In a single Prisma transaction:
   * Set `gstRegistered = true`.
   * Stamp `gstRegisteredAt = now()`.
   * Stamp `gstGraceStartedAt = now()`.
   * Compute `gstGraceEndsAt = now() + 3 days` and persist.
   * Reset `gstEnforcementApplied = false`, `gstHiddenProductCount = 0`, `gstEnforcementRunAt = null`.
2. Enqueue a "GST grace started" notification (`notifySeller` with new template `gstGraceStartedEmail/SMS`).
3. Return the updated store payload so the dashboard banner appears immediately on the next render.

When the payload sets `gstRegistered: false` and `gstRegistered === true` already (the **deferred** downgrade path, see [REGISTERED_TO_UNREGISTERED_DOWNGRADE_PATH.md](../future-enhancements/tax-gst-invoice/REGISTERED_TO_UNREGISTERED_DOWNGRADE_PATH.md)):

* Reject with **403** in MVP (already documented). When the future support flow is built, it must also clear `gstGraceStartedAt`, `gstGraceEndsAt`, `gstEnforcementApplied`, `gstHiddenProductCount` and unarchive any product whose only blocker was `archivedReason = 'gst_fields_missing'`.

### 4.2 Settings PATCH — guard against silent re-arming ✅ IMPLEMENTED

If `gstRegistered === true` already, **do not** re-stamp `gstGraceStartedAt`. Other field updates (PAN, address, etc.) on an already-registered store must not restart the clock.

### 4.3 Product POST/PATCH — pro-rate compliance check ✅ IMPLEMENTED

**Files**: `src/app/api/[storeId]/products/route.ts`, `src/app/api/[storeId]/products/[productId]/route.ts`.

After a successful create/update on a store with `gstRegistered = true`:

* If the saved product is now compliant (`isProductD12Compliant === true`) **and** it was previously archived with `archivedReason = 'gst_fields_missing'`:
  * Set `isArchived = false`, `archivedReason = null`, `archivedAt = null` in the same transaction.
  * Decrement `Store.gstHiddenProductCount`.
  * If this brings the count to 0, also clear `gstEnforcementApplied = false` so the dashboard "X products hidden" banner disappears.
* If the saved product is **not** compliant and the store is past `gstGraceEndsAt`, also flip `isArchived = true`, `archivedReason = 'gst_fields_missing'` immediately (so the seller can't sneak a non-compliant product through after the grace window).

### 4.4 Product PATCH — block manual unarchive of `gst_fields_missing` rows ✅ IMPLEMENTED

In the existing PATCH handler, when the incoming `isArchived === false`:

* Load the current row. If `archivedReason === 'gst_fields_missing'` and the **resulting** row would still be non-compliant, return **422** with code `D12_UNARCHIVE_BLOCKED` and message *"Add HSN, GST rate and unit of measurement before publishing this product again."*
* This guard prevents the form's "Archive" toggle from being used as an escape hatch.

### 4.5 New cron — `enforce-gst-grace` ✅ IMPLEMENTED

**File**: `src/app/api/cron/enforce-gst-grace/route.ts` (NEW).

Schedule: daily `0 5 * * *` in [vercel.json](../../vercel.json) (after the downgrade lifecycle cron, before `cleanup-archived-products`).

Reminder cadence (3-day window): day-3 (grace start), day-1, day-0 SMS.

Algorithm per execution:

```
for each Store where gstRegistered = true AND gstGraceStartedAt IS NOT NULL:
  daysRemaining = ceil((gstGraceEndsAt - now) / 1 day)

  if daysRemaining > 0:
    # In-window reminders. 3-day cadence = day-3 start email,
    # day-1 nudge email, day-0 SMS as the last call.
    if daysRemaining in {3, 1}:
      countNonCompliant = findNonCompliantProducts(storeId).length
      if countNonCompliant > 0:
        notifySeller(gstGraceReminderEmail({ daysRemaining, count: countNonCompliant }))
        if daysRemaining === 1:
          notifySeller(gstGraceReminderSMS({ count: countNonCompliant }))
    continue

  # Grace expired — enforce.
  # Idempotency guard #1: skip if a run already finished today.
  if store.gstEnforcementApplied === true AND store.gstEnforcementRunAt is today:
    continue

  nonCompliant = findNonCompliantProducts(storeId)
  if nonCompliant.length === 0:
    # Seller fixed everything in time; clear the grace fields and skip.
    updateStore({ gstGraceStartedAt: null, gstGraceEndsAt: null,
                  gstEnforcementApplied: false, gstHiddenProductCount: 0,
                  gstEnforcementRunAt: now })
    continue

  await prismadb.$transaction(async (tx) => {
    # Idempotency guard #2: stamp the run timestamp first inside the txn.
    # If a concurrent run already stamped it within the last 5 minutes,
    # bail out so we don't double-archive.
    const fresh = await tx.store.findUnique({ where: { id: storeId } })
    if (fresh.gstEnforcementRunAt && now - fresh.gstEnforcementRunAt < 5 min) {
      return
    }

    # Re-check non-compliance INSIDE the transaction so a seller who saved
    # the last fix between our findNonCompliantProducts call and now
    # doesn't get their product archived.
    const stillBad = await tx.product.findMany({
      where: { id: { in: nonCompliant.map(p => p.id) }, isArchived: false },
      select: { id: true, hsnCode: true, taxRate: true,
                taxBracketRule: true, ucsCode: true, isExempt: true },
    })
    const toArchive = stillBad.filter(p => !isProductD12Compliant(p, store))

    if (toArchive.length === 0) {
      await tx.store.update({
        where: { id: storeId },
        data: { gstGraceStartedAt: null, gstGraceEndsAt: null,
                gstEnforcementRunAt: now },
      })
      return
    }

    await tx.product.updateMany({
      where: { id: { in: toArchive.map(p => p.id) }, isArchived: false },
      data: {
        isArchived: true,
        archivedReason: 'gst_fields_missing',
        archivedAt: new Date(),
      },
    })
    await tx.store.update({
      where: { id: storeId },
      data: {
        gstEnforcementApplied: true,
        gstHiddenProductCount: toArchive.length,
        gstEnforcementRunAt: now,
      },
    })
  })

  if anything was archived:
    notifySeller(gstEnforcementDoneEmail({ count }))
    notifySeller(gstEnforcementDoneSMS({ count }))
    invalidateProductCache(storeId)   # storefront sees the change immediately
```

**Idempotency summary**:

* `gstEnforcementRunAt` acts as a per-store lock. A second cron invocation within the same window sees a recent timestamp and no-ops.
* The non-compliance set is **re-evaluated inside the transaction** so a seller who saved a fix between detection and archive isn't punished.
* Notifications fire **only when at least one product was actually archived**, so re-runs cannot spam the seller's inbox.
* The `updateMany` is gated on `isArchived: false`, so an already-archived row won't get its `archivedAt` reset on a retry.

**Important**: this cron **does NOT call `archiveProductsByIds`**. We never create an `ArchivedProduct` row when hiding products for missing tax fields — that helper is only for the plan-downgrade flow which actually deletes the `Product` row. The GST hide is a soft-archive (boolean flip) only.

### 4.6 Storefront read path — already covered

`src/app/api/[storeId]/storefront/products/...` already filters `WHERE isArchived = false`. Once the cron flips `isArchived = true`, the product disappears from the storefront on the next cache miss (TTL ≤ 5 min) or immediately if `invalidateProductCache(storeId)` is called.

No change needed in the storefront read layer.

### 4.7 Order placement — defensive guard

When a guest checkout POSTs an order, the order route already pulls the live `Product` row inside the price-recompute step. If a race lets a non-compliant archived product reach the cart, the order route already returns 404 (`Product not found or unavailable`). **No changes needed**, but add a regression test.

### 4.8 Compliance counter — keep `gstHiddenProductCount` honest ✅ IMPLEMENTED

Risk: a seller fixes one product (count goes from 5 → 4 via section 4.3), then archives another product manually — the counter shouldn't drift.

Solution: in the manual-archive PATCH path (`isArchived: true` from the form), check `archivedReason`. Manual archives don't touch the counter; only `gst_fields_missing` archives do. The product POST/PATCH compliance helper increments/decrements only for `gst_fields_missing` transitions.

---

## 5. UI changes

### 5.1 Dashboard global banner — `src/components/banners/gst-grace-banner.tsx` (NEW) ✅ IMPLEMENTED

Mounted in `src/app/(dashboard)/[storeId]/layout.tsx` above the page content.

Visibility rules:

* Hide unless `store.gstRegistered === true && store.gstGraceStartedAt != null`.
* During grace (`now < gstGraceEndsAt`):
  * Variant: **warning** (amber).
  * Title: *"Add tax details to your products — {N} days left"*.
  * Body: *"You enabled GST on {date}. Add HSN, GST rate and unit of measurement to {countNonCompliant} products before {gstGraceEndsAt} or they'll be hidden from your storefront."*
  * CTA: *"Review products"* → links to `/{storeId}/products?filter=missing-tax`.
* After grace AND `gstEnforcementApplied === true`:
  * Variant: **destructive** (red).
  * Title: *"{gstHiddenProductCount} products are hidden from your storefront"*.
  * Body: *"They're missing HSN / GST rate / unit. Open each product, fill the Tax & Compliance section, and they'll go live again automatically."*
  * CTA: *"Show hidden products"* → `/{storeId}/products?archivedReason=gst_fields_missing`.

Use the existing `Alert` shadcn component (`src/components/ui/alert.tsx`). Match visual language of the existing downgrade-grace banner.

### 5.2 Products list page — new filter chip

**File**: `src/app/(dashboard)/[storeId]/(routes)/products/components/products-toolbar.tsx` (or wherever the existing filter row lives).

Add two chips:

1. **"Missing tax details"** — server filter `?filter=missing-tax`, pre-fills query that intersects `isArchived = false` with the D12 non-compliance predicate. Lets sellers fix in-grace items before enforcement.
2. **"Hidden by GST"** — server filter `?archivedReason=gst_fields_missing`. Lists archived rows so the seller can find what got hidden.

Backend filter handled in `src/app/api/[storeId]/products/route.ts` GET: accept the new query params and translate to a Prisma `where` clause.

### 5.3 Products data table — column badge

In each product row, when `isArchived === true && archivedReason === 'gst_fields_missing'`, render a red `Badge` *"Hidden — missing tax"*. Existing `manual` archives keep their grey *"Archived"* badge. Lives in `src/app/(dashboard)/[storeId]/(routes)/products/components/columns.tsx` (or the equivalent cell renderer).

### 5.4 Product form — archive toggle behaviour

**File**: [src/app/(dashboard)/[storeId]/(routes)/products/[productId]/components/product-form.tsx](../../src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/products/%5BproductId%5D/components/product-form.tsx).

* When `initialData.archivedReason === 'gst_fields_missing'`:
  * Render the `Archive` switch as **disabled** with a `Lock` icon and `Tooltip`: *"This product was hidden because tax details are missing. Fill HSN, GST rate and unit of measurement, then save — it will publish automatically."*
  * Above the form, render an inline `Alert` (variant `destructive`) restating the rule and linking the *Tax & Compliance* section anchor.
  * On submit, if the seller has filled the missing fields, the API (section 4.3) will flip `isArchived` back to `false` automatically — no extra UI plumbing needed.
* When the seller is editing a compliant, non-archived product on a store that's still **inside** the grace window, render a small inline note in the Tax & Compliance card header: *"You're {N} days into the GST grace window — make sure every product has these fields filled before {gstGraceEndsAt}."*

### 5.5 Settings → Billing & Tax tab — registration toggle UX

**File**: `src/app/(dashboard)/[storeId]/(routes)/settings/components/billing-tax-form.tsx` (existing).

When the seller flips `gstRegistered` from `false → true`:

* Show a confirmation modal: *"Once you enable GST registration, you have 3 days to add HSN / GST rate / unit of measurement to your existing products. After that, products missing these fields will be hidden from your storefront. You can re-publish them any time by adding the missing details. Continue?"*
* On confirm, PATCH the settings endpoint and redirect to the products list with the *"Missing tax details"* filter pre-selected so the seller starts fixing immediately.

Lock the toggle (already covered by deferred-downgrade md) for `true → false`.

### 5.6 Settings tab — grace status card (when inside the window)

Below the registration toggle, render a status card mirroring the dashboard banner copy but with more detail (start date, end date, count non-compliant, link to products list filtered by `missing-tax`). Hidden when `gstGraceStartedAt === null`.

### 5.7 Notifications inbox

The existing `notifySeller()` writes to the in-app notification feed. New templates:

* `gstGraceStartedEmail` / `gstGraceStartedSMS` — *"GST registration enabled — add tax details to your products"*
* `gstGraceReminderEmail{daysRemaining}` / `gstGraceReminderSMS` — sent at day -7, -3, -1
* `gstEnforcementDoneEmail` / `gstEnforcementDoneSMS` — *"{count} products hidden from your storefront"*
* `gstAllProductsCompliantEmail` (optional, low priority) — sent when `gstHiddenProductCount` drops to 0 after enforcement, congratulating the seller.

All templates live alongside the existing ones in `src/lib/notifications/platform/templates/`.

---

## 6. End-to-end happy-path walk-through

1. **Day 0** — Seller flips Settings toggle to *GST-registered*. Confirmation modal warns about 3-day window. On confirm, settings PATCH stamps `gstRegisteredAt`, `gstGraceStartedAt`, `gstGraceEndsAt = now + 3d`. Email + SMS *"GST registration enabled"* sent. Dashboard banner appears (warning).
2. **Day 1-2** — Seller edits products. Each save runs through the product PATCH compliance check. Banner counter updates. Product form has inline grace note in the Tax card.
3. **Day 0, Day 2** — Cron runs at 05:00 UTC. Sends day-3 / day-1 reminder emails when items are still non-compliant. Day-1 also fires SMS.
4. **Day 3 morning** — Cron runs. Finds N non-compliant products. In one transaction (with idempotency guard + intra-txn re-check), flips `isArchived = true, archivedReason = 'gst_fields_missing'` on the still-bad ones, sets `Store.gstEnforcementApplied = true`, `gstHiddenProductCount = N`, stamps `gstEnforcementRunAt`, invalidates storefront cache. Sends *"{N} products hidden"* email + SMS.
5. **Day 3 afternoon** — Storefront no longer shows those products. Dashboard banner is now red. Products list shows red *"Hidden — missing tax"* badge on each row. Seller filters by *"Hidden by GST"*, opens one, sees the alert, fills HSN. Save → API runs compliance helper, flips `isArchived = false`, decrements counter to N-1.
6. **Day 4+** — Each fix decrements the counter. When it hits 0, `gstEnforcementApplied` clears, banner disappears, life returns to normal.

---

## 7. Test matrix (unit + integration)

| Scenario | Expected |
| --- | --- |
| Store flips `gstRegistered: false → true` | `gstGraceStartedAt`, `gstGraceEndsAt = +7d` stamped; notification sent |
| Store flips again `true → false` (MVP) | 403, no schema change |
| Other settings PATCH on already-registered store | Grace fields untouched |
| Cron runs day 2 with 3 non-compliant products | Day-1 reminder email + SMS sent; no archives |
| Cron runs day 3 with 3 non-compliant + 2 compliant products | Only the 3 flip to archived; storefront cache invalidated; counter = 3 |
| Cron runs day 3 with 0 non-compliant products | Grace fields cleared; no notification, no archives |
| Seller edits archived (`gst_fields_missing`) product, fills HSN | `isArchived = false` on save; counter decrements |
| Seller toggles archive **off** without fixing fields | 422 `D12_UNARCHIVE_BLOCKED` |
| Seller toggles archive **on** manually on a compliant product | Allowed; `archivedReason = 'manual'`; counter unchanged |
| Race: order placed for archived `gst_fields_missing` product | 404 from order route (already enforced) |
| Cron runs twice on day 7 | Idempotent — `gstEnforcementRunAt` lock + intra-transaction re-check ensure no double-archive and no duplicate emails |
| Cleanup-archived-products cron | Untouched — D12 rows are not in `ArchivedProduct`, so they're not in scope |

---

## 8. Out of scope for this plan (tracked elsewhere)

* Auto-suggest HSN from product name (LLM/embedding) — Phase 6 R&D.
* `gstAllProductsCompliantEmail` — optional, ship if seller surveys ask for it.
* B2B-invoices toggle (`Store.allowB2BInvoices`) UX — separate plan.
* Real `true → false` registration downgrade flow — see [REGISTERED_TO_UNREGISTERED_DOWNGRADE_PATH.md](../future-enhancements/tax-gst-invoice/REGISTERED_TO_UNREGISTERED_DOWNGRADE_PATH.md).

---

## 9. Sequencing recommendation

1. **Schema migration** (`phase_5_2_gst_grace_fields`).
2. `src/lib/billing/d12-compliance.ts` helper (pure, easy to test).
3. Settings PATCH handler updates (registration flip side-effects + 422 unarchive guard).
4. Product POST/PATCH compliance hook (auto-unarchive + auto-archive after grace).
5. New cron `enforce-gst-grace` + vercel.json schedule entry.
6. Notification templates.
7. Dashboard banner + product list filter chips + form alert/lock.
8. Settings → Billing & Tax confirmation modal + grace status card.
9. Test matrix (Vitest for helpers; Playwright for the registration → fix → unarchive happy path).

---

## 10. Future enhancements (post-MVP)

These are intentionally **not** in the first release. Each is its own follow-up ticket once the core grace + archive loop is stable.

### 10.1 Bulk-edit toolbar for HSN / GST rate / UCS

* Multi-select rows on the products list, then a right-side sheet with three quick actions: *"Apply HSN code"*, *"Apply GST rate"*, *"Apply unit of measurement"*.
* Each action accepts a value, runs server-side validation (HSN against the catalogue, rate against the allowed set), and applies to the selected rows in a single transaction.
* Auto-unarchive logic from section 4.3 still runs per row, so a single bulk fix can re-publish dozens of products at once.
* Particularly valuable for sellers with 100+ SKUs being bitten by the 3-day window.

### 10.2 HSN search / picker improvements (inline quick-fix)

* On the products list, the red *"Hidden — missing tax"* badge becomes clickable.
* Clicking opens a small popover anchored to the row containing the existing `hsn-lookup.ts` search, a rate dropdown, and a UCS dropdown.
* Save inside the popover patches just those three fields, runs the compliance helper, and the row turns green / disappears from the *"Hidden by GST"* filter — without leaving the list view.
* Removes a click-heavy edit-form roundtrip for the most common fix.

### 10.3 Audit log + admin override

* Every `isArchived` flip caused by the cron, the auto-unarchive, or a bulk fix writes a row to a new `AuditEvent` table (or extends the existing notification table) with `actorType = 'system' | 'seller' | 'admin'`, `action`, `productId`, `before`, `after`, `reason`.
* Internal admin endpoint `POST /api/admin/stores/:id/gst/extend-grace?days=N` lets support push `gstGraceEndsAt` forward for a specific seller (large catalog, paid customer escalation, etc.) — also written to the audit log.
* Read-only admin UI page listing recent audit events per store so support can answer *"why did my product disappear on Tuesday?"* without a DB query.
