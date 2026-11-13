# Lessons from a Real Multi-Tenant E-commerce Audit (Variants / Sizes / Archive)

> **Source material:** [PRODUCT_VARIANT_SIZE_AUDIT.md](../PRODUCT_VARIANT_SIZE_AUDIT.md) — a 22-section deep audit of the Product/Variant/Size stack after the soft-archive + edit-lock + SKU-permanence work in Phase 3.
> **Why I'm writing this:** to internalise the *patterns* behind each finding, not just the fix. Most of these mistakes are the kind I'll make again in any multi-tenant CRUD app unless the heuristic is muscle memory.

The audit is split into **20 numbered findings** (§1–§19 + §20 cross-cutting), graded CRITICAL → INFO. I'll walk each one in plain English: what was wrong, the underlying principle, the fix, and the takeaway I want to carry to the next system.

---

## How to read each section

```
WHAT  — the bug, in one paragraph
WHY   — the deeper principle / pattern that was violated
FIX   — what we actually shipped
LESSON — the heuristic to remember
```

---

# Tier A — CRITICAL (security / multi-tenancy)

These are the kind of bugs that don't crash the app but quietly leak data across tenants. They're the most embarrassing because the code "works" — until somebody crafts a request.

---

## §1 — Cross-tenant size mutation via missing `storeId` in WHERE

**WHAT.** The route `PATCH /api/[storeId]/sizes/[sizeId]` checked that the user owned `storeId` (good), then ran:

```ts
await prismadb.size.updateMany({ where: { id: sizeId }, data: { name, value } });
```

The `WHERE` only used `sizeId`. Nothing forced the size to *belong to* `storeId`. Seller A could call `PATCH /api/<my-store>/sizes/<seller-B-size-id>` and overwrite seller B's size name. DELETE was even worse — silent destruction of another tenant's data.

**WHY.** This is the single most common multi-tenancy bug pattern. The auth check answers "is this user allowed in this store?" but the *write* operates on a different scope (`sizeId`). The two scopes were never reconciled. This is the SQL-injection of the multi-tenant world.

**FIX.** Always include the tenant key in the WHERE of every write, then check `count === 0` for "not found":

```ts
const r = await prismadb.size.updateMany({
  where: { id: sizeId, storeId },   // tenant scoping baked into the write
  data:  { name, value },
});
if (r.count === 0) return new NextResponse('Not found', { status: 404 });
```

**LESSON.** *Authorisation is not authentication.* For every write in a multi-tenant app, the WHERE clause **must** include the tenant scope, not just the row id. Build the heuristic: "if I can't see `storeId` (or the tenant key) in the WHERE of a mutation, it's wrong."

---

## §3 — Cross-tenant `sizeId` injection on Product POST/PATCH

**WHAT.** The product creator accepted `v.sizeId` from the request body and inserted it into a new `ProductVariant` row in the URL's `storeId`. Nothing checked that the `Size` row was owned by the same store. Result: seller A could attach seller B's `Size` to seller A's variants.

The visible damage: storefront PDPs do `include: { size: true }`, so seller B's size **name** ("XXL Tall — Mens Spring 24") would render on seller A's product page. Competitive intel leak. Also breaks the §2 deletion guard because the count is run against the wrong store.

**WHY.** Same pattern as §1, but on a *foreign key* this time. Prisma will happily accept any FK string — it doesn't know about your tenant model. **Every FK that comes in from the client is a cross-tenant attack vector unless you validate it.**

**FIX.** Up-front validation before the variant write:

```ts
const sizeIds = [...new Set(variants.map(v => v.sizeId))];
const valid = await prismadb.size.count({ where: { id: { in: sizeIds }, storeId } });
if (valid !== sizeIds.length) {
  return new NextResponse('One or more sizes do not belong to this store', { status: 400 });
}
```

One query, batch-friendly, runs before any expensive SKU dedup.

**LESSON.** Treat **every client-supplied FK** in a mutation as untrusted. The validation is one query: "do all these IDs belong to my tenant scope?" Build it into a helper (e.g. `assertOwnedByStore(model, ids, storeId)`).

---

# Tier B — HIGH (correctness / invariant preservation)

These are the bugs where the system *currently* behaves OK only because of a fragile chain of side effects. The moment one link breaks, the bug becomes real.

---

## §2 — Size DELETE has no friendly guard

**WHAT.** `Size` has `onDelete: Restrict` from `ProductVariant.sizeId`. So deleting a referenced size throws Prisma `P2003`, which became a generic 500. After the variant-archive work, *archived* variants pin the size forever — so this is much more common.

**WHY.** Database constraints are great at preventing data corruption but **terrible at user feedback**. A FK violation deserves a 409 with a human sentence, not a 500.

**FIX.**

```ts
const refCount = await prismadb.productVariant.count({ where: { sizeId } });
if (refCount > 0) {
  return NextResponse.json({
    error: `This size is used by ${refCount} variant(s) (including hidden ones)…`,
    code: 'SIZE_IN_USE',
  }, { status: 409 });
}
```

Plus catch P2003 around the actual `delete` for the race.

**LESSON.** Pre-flight every "destructive" endpoint. The check is cheap (an indexed `count`); the error message is what users actually need. **Constraints prevent corruption; pre-flights provide UX.**

---

## §4 — Archived variants leak via *related products*

**WHAT.** The single-product GET correctly hides archived variants on the main product. But the nested `relatedFromProducts.relatedProduct.variants` had no filter. Storefront PDPs render related cards → archived variants render with `stockQuantity: 0` → buyers see "Out of stock" sizes that shouldn't exist.

**WHY.** When you add a soft-archive flag, you have to add the `where: { isArchived: false }` filter at **every** read site — not just the obvious ones. Includes inside includes are easy to miss because they're 4 levels deep in the query and rarely re-read.

**FIX.** Add the filter to every nested variant include. (We ended up touching 5 places — the audit's §C1 cross-cutting count.)

**LESSON.** Adding `isArchived` (or any soft-delete flag) is **not a one-line schema change**. It's a contract change that ripples through every read query. After the migration, do a workspace-wide grep for `variants:` (or whichever relation) and audit every single hit. Better: write a `liveVariants()` helper and ban raw `variants:` includes via lint.

---

## §5 — Checkout reads archived variants

**WHAT.** `checkout/route.ts` filtered `isArchived: false` on the *product* but not on the included variants. A crafted POST with a known archived `variantId` passed the lookup. The bug was *currently bounded* because archived variants always have `stockQuantity: 0` and the atomic decrement uses `WHERE stockQuantity >= qty` — but the safety relied entirely on a side effect of a different system.

**WHY.** "We're safe because of *that other invariant over there*" is the most fragile sentence in software engineering. The day someone restores stock to an archived variant (which happened in §6), this becomes exploitable.

**FIX.** Add `where: { isArchived: false }` to the checkout's variant include. Defense-in-depth, doesn't depend on stock being zero.

**LESSON.** **Don't lean on cross-system invariants.** Every layer should defend itself. "The data layer can't have X, so the API doesn't need to check" is exactly the argument that fails when somebody adds a backdoor write path.

---

## §6 — `expire-unpaid-orders` cron restocks archived variants

**WHAT.** When an unpaid order expires, the cron restocks each variant. It blindly did `update({ where: { id }, data: { stockQuantity: { increment } } })` without checking `isArchived`. Result: an archived variant could end up with `stockQuantity > 0`, breaking the §5 invariant.

**WHY.** Background jobs are the **most common place** for invariants to die. Foreground code (PATCH endpoints) is easy to reason about; cron jobs run alone, in the dark, often with stale assumptions about the world.

**FIX.** Read `isArchived` in the SELECT, skip + log if archived (or missing, or reassigned to a different product).

```ts
if (!variant || variant.productId !== item.productId || variant.isArchived) {
  logger.info('Variant missing/reassigned/archived — skipping stock restore', { … });
  continue;
}
```

**LESSON.** Whenever you add a soft-delete or archive flag, **immediately audit every cron job** that reads or writes that table. They're the easiest place to forget. A standing rule: any background mutation must read the same defensive flags as the foreground equivalent.

---

## §7 — SKU permanence silently overrides seller intent

**WHAT.** When a seller restores an archived variant *and types a different SKU in the form*, the server silently overwrites their typed SKU with the original archived SKU. Save "succeeds", refresh shows the *original* SKU. Looks like the form is gaslighting them.

**WHY.** Server-side correctness without UX feedback is a UX bug. The server is right (SKU permanence is a deliberate design choice — see edit-lock), but the user gets no signal that their input was overridden.

**FIX.** Two layers:

1. **Server:** include `restoredVariants: [{ sizeId, originalSku, providedSku }]` in the PATCH 200 response.
2. **Client:** sonner toast — *"Size M was restored using its original SKU `TS-M`. Variant SKUs are permanent."*
3. **Even better:** on the "Restore" button click, pre-fill the row's SKU and disable the input.

**LESSON.** Anywhere the server **silently rewrites user input**, you have a UX bug — even if the rewrite is semantically correct. Either prevent the input upstream (best) or echo the rewrite back so the client can explain it.

---

## §8 — `hasVariants: true` with zero live variants

**WHAT.** The product has `hasVariants: true` but, through some path, ends up with zero live (`isArchived: false`) variants. The PDP renders a size picker with no sizes; cart pre-check throws "Size selection required"; users are stuck.

The audit identified one specific path: the checkout's auto-archive logic could combine with the cron's restore to leave the product in this orphaned state.

**WHY.** When you split a model into "header" (product) and "lines" (variants), you have a new invariant to defend: *header.hasVariants ↔ at least one live line exists*. The two sides drift if any single mutation forgets to re-check.

**FIX (two layers).**

1. **Server hard-reject (Layer 1):** In PATCH, after the archive/delete pass, count live variants. If `hasVariants && liveCount === 0`, throw `SAVE_BLOCKED_NO_LIVE_VARIANTS`. The seller chose to keep variant mode — they must keep at least one variant.

2. **Storefront defensive read (Layer 2):** documented at [notes/storefront/PRODUCT_HASVARIANTS_ZERO_LIVE_GUARD.md](../storefront/PRODUCT_HASVARIANTS_ZERO_LIVE_GUARD.md). The PDP serializer treats this state as "out of stock" and hides the size picker.

**LESSON.** Whenever you have a "mode flag" on a parent (`hasVariants`, `isPublished`, `requiresShipping`, …), enumerate every mutation that could violate the implied invariant on the children. Pair every flag with a transaction-end assertion.

---

# Tier C — MEDIUM (staleness / display correctness)

---

## §9 — Storefront list cache not invalidated on variant edits

**WHAT.** The storefront product *list* uses `cacheThrough(...)`. The PATCH handler never called `invalidateProductCache(storeId)`. After archiving a size, the list kept showing it as available until TTL expired.

**WHY.** Caches break the "write happens → next read sees it" mental model. Every write site has to remember to invalidate every cache key the data influences. There's no compiler help.

**FIX.** Call `await invalidateProductCache(storeId)` at the end of the PATCH and POST transactions.

**LESSON.** When introducing a cache, make a **write-site checklist** of every mutation that could affect it. Cache invalidation lives next to the write (not the read), and it's easy to miss for new endpoints. Consider wrapping the model in a small `productsRepo` that does the invalidation in one place — much harder to forget.

---

## §10 / §11 — Archived variants visible in dashboard surfaces

**WHAT.** The seller's read-only `/view` page and the dashboard product list both included archived variants in their displays — same `stockQuantity: 0`, same `size.name`, no "Hidden" badge. Indistinguishable from "I just haven't restocked."

**WHY.** Same pattern as §4 — soft-delete creates a contract change at every read site. Dashboard surfaces are easy to forget because they're "internal" and often built earlier than the buyer-facing ones.

**FIX.** Add `where: { isArchived: false }` to those queries. (Alternatively: surface `isArchived` and render a "Hidden" badge — we picked the simpler path.)

**LESSON.** Same as §4. After every soft-delete migration, tour every UI surface that lists the entity and decide explicitly: *show* hidden ones with a badge, or *hide* them. There is no good "show without label" choice.

---

## §12 — Restore collision on `(productId, sizeId)`

**WHAT.** During archived-variant restore, the pre-pass keys archived siblings by `sizeId`. If somehow both a live and an archived variant existed for the same `(productId, sizeId)`, the restore could try to write a duplicate. The `@@unique([productId, sizeId])` constraint *should* prevent this from existing in the first place — but defensive code is cheap.

**WHY.** "Should never happen" is a design assertion, not runtime safety. When you map keys → ids in a pre-pass, document the cardinality assumption and assert it.

**FIX.** Split the lookup into `live` and `archived` maps. Log a warning if both contain the same `sizeId`.

**LESSON.** Pre-passes that build "key → id" maps should always be **uni-cardinality enforced**. If your domain says one row per key, write the `if (map.has(key)) log.warn(...)`. It costs nothing and saves you from the day the constraint gets dropped in a future migration.

---

## §13 — Edit-lock comparison fragility for `Decimal` vs `number`

**WHAT.** The edit-lock library checks "did permanent fields like `price` change?" The body sends `price` as a `number`; Prisma returns `currentProduct.price` as a `Decimal`. A naive `body.price !== current.price` is **always** true → every PATCH that doesn't touch price gets rejected.

**WHY.** The Prisma `Decimal` type is one of the most footgun-y things in the stack. JS `===` against a `Decimal` is always false. Floating-point comparison without an epsilon is also dangerous.

**FIX.** Compare via `Number(current.price.toString()) === body.price` (or Decimal arithmetic with epsilon for currency). Confirmed in `assertPermanentFieldsUnchanged`.

**LESSON.** Whenever a field is `Decimal` in Prisma, **never `===` it against anything**. Either keep it as `Decimal` end-to-end (preferred for money) or coerce to string and compare. Same warning applies to `BigInt`, `Date`, and any custom branded type.

---

# Tier D — LOW (papercuts / future-proofing)

---

## §14 — Per-variant pricing/dimensions on plan downgrade

**WHAT.** The code had:

```ts
price: perVariantPricingEnabled ? (v.price ?? price) : price,
```

If a seller had per-variant prices set and downgraded to a plan without the feature, the next PATCH silently flattened every variant's price to the product price. Data loss with no warning.

**WHY.** Plan-gating is fundamentally **stateful**: the user's data is bigger than what their current plan exposes. You can hide features in the UI, but the server must decide between (a) preserving data on downgrade, (b) warning before the destructive save, or (c) actually deleting. The original code chose (c) silently, which is the worst option.

**FIX (we picked the radical option).** Removed the gate entirely:

- Deleted `perVariantPricing` and `perVariantDimensions` from `PlanFeatures`, `DEFAULT_FEATURES`, `getPlanConfig` parser, the `/check-limit` response, the `FeatureLimits` type, both POST and PATCH variant builders, and both `<FeatureGate>` wrappers in the variants section.
- Per-variant overrides are now always available; the seller can use them on every plan.

The decision was: per-variant pricing is *core* to selling apparel/SKUs. Plan-gating it created a downgrade footgun that wasn't worth the upsell pressure.

**LESSON.** Two takeaways:

1. **Plan gates are data contracts.** If you gate a *write*, you must define what happens to existing data on downgrade. "Silently overwrite" is never the answer.
2. **Sometimes the right fix to a tricky gate is to remove it.** Always weigh "is this gate actually generating revenue?" against "is it generating user pain?" If the answer is unclear, the gate probably shouldn't exist.

---

## §15 — Variant `displayOrder` collisions

**WHAT.** The form sent `displayOrder` per variant. Nothing dedupes — two variants could end up with the same `displayOrder`. After restoring an archived variant (which carries its old `displayOrder`), it could collide with new ones, producing a jittery sort order on the storefront.

**WHY.** "Sortable list with explicit `order` field" is one of those classic patterns that looks easy but has subtle invariants. The form sends what it thinks; the server has historical data; nothing reconciles.

**FIX.** Post-pass in the PATCH transaction: read live variants ordered by `(displayOrder asc, createdAt asc)`, then renumber `displayOrder = index`. One small loop, runs only when variant edits actually happen.

```ts
const liveForReorder = await tx.productVariant.findMany({
  where: { productId, isArchived: false },
  select: { id: true, displayOrder: true },
  orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
});
for (let i = 0; i < liveForReorder.length; i++) {
  if (liveForReorder[i].displayOrder !== i) {
    await tx.productVariant.update({
      where: { id: liveForReorder[i].id },
      data: { displayOrder: i },
    });
  }
}
```

**LESSON.** **Any user-controlled `order` field needs a server-side reconciliation pass.** Either fractional indexing (e.g. lex-orderable strings, "rolling order") or "renumber 0..N at the end of every save". The latter is dead simple and good enough for almost all cases.

---

## §16 — `OrderItem.snapshotVariantId` orphan awareness

**WHAT.** `OrderItem.snapshotVariantId` is a plain `String?`, **deliberately not** a foreign key (so it survives variant hard-delete). When the return UI lands, the operator can't easily tell "is this variant still on the shelf, can we offer an exchange?"

**WHY.** Snapshot patterns (denormalised data on `OrderItem` so order history works after the source rows die) are right for *correctness* but bad for *liveness queries*. You need a separate strategy when you want to answer "does the original still exist?"

**FIX.** Deferred until the return UI lands. Documented at [notes/future-enhancements/ORDERITEM_SNAPSHOT_VARIANT_ORPHAN_AWARENESS.md](../future-enhancements/ORDERITEM_SNAPSHOT_VARIANT_ORPHAN_AWARENESS.md). The plan: one batched `productVariant.findMany({ where: { id: { in: snapshotIds } } })` to enrich the return view with `variantStillExists`, `variantIsArchived`, `variantInStock`.

**LESSON.** Two patterns to internalise:

1. **Snapshots are write-once history. They must not be FKs**, because FKs cascade-restrict the source rows.
2. **Liveness checks against snapshot ids are read-time, batched, and not stored.** Don't denormalise "is the source still alive?" — compute it on demand.

---

## §17 — Auto-archive aggregate would count archived stock

**WHAT.** Checkout's "if total variant stock = 0, archive product" aggregate had no `isArchived: false` filter. Currently safe because archived variants always have `stockQuantity: 0` — but if §6 (cron restocking archived variants) had ever shipped, the aggregate would count hidden stock as "available" and prevent legitimate auto-archive.

**WHY.** Same pattern as §5 — "we're safe because of an invariant somewhere else." Add the filter for defense-in-depth.

**FIX.** Add `where: { productId, isArchived: false }` to the aggregate.

**LESSON.** Echo of §5: **every aggregate over a soft-deleted table needs the filter, period.** Don't trust adjacent invariants to keep your sums honest.

---

## §18 — Stock-alerts cron read-then-write race

**WHAT.** The cron does SELECT (filtered for archived) → UPDATE `lowStockNotifiedAt`. If the seller archives the variant between SELECT and UPDATE, the UPDATE runs on a now-archived row. **Harmless** (the field is meaningless once hidden, and reset on restore). Documented as "no fix needed."

**WHY.** Worth flagging because it's the *correct* application of the heuristic: identify the race, evaluate the blast radius, decide it's not worth fixing. Engineering judgement, not just rule-following.

**LESSON.** When you find a SELECT-then-UPDATE race, ask: **"What is the worst thing the UPDATE can do to a row that changed underneath us?"** If the answer is "nothing meaningful", document and move on. If it's "data corruption", you need a transaction or an optimistic-lock version column.

---

## §19 — Schema housekeeping

**WHAT.** Three observations:

1. `ProductVariant.@@index([stockQuantity])` exists from the original migration. Archived variants force `stockQuantity: 0` → the index bloats with zero-rows. A partial index `WHERE isArchived = false` would be ideal but isn't expressible in Prisma (would need raw SQL).

2. **No composite index on `(productId, isArchived)`** — even though the variants section reads `findMany({ where: { productId, isArchived: false } })` repeatedly. We added `@@index([productId, isArchived])` via migration `20260430060944_added_index_in_productvariant`.

3. `ArchivedProduct.variants` is a `Json` snapshot that's missing `lowStockThreshold` per variant. The view page falls back to `0`. Minor — add it to the snapshot for completeness (deferred).

**WHY.** Indexes pay rent in two ways: write amplification + storage. As your filter predicates evolve (e.g. you add `isArchived`), so should your composite indexes. Single-column indexes are *not* automatically composable with predicates.

**LESSON.** Whenever you add a recurring `WHERE A = ? AND B = ?` pattern, **add `@@index([A, B])`**. Don't trust "Postgres will figure it out" — it usually picks the single-column index, which is suboptimal for selectivity.

---

# Tier E — Cross-cutting (§20)

The most useful section of the audit, IMO. Patterns that touch many files.

| Tag | Pattern | Takeaway |
|---|---|---|
| **C1** | Soft-delete filter is missing in **5 of 9** read sites. | Build a `liveVariants()` helper and ban raw includes via lint. |
| **C2** | Tenant key is denormalised on a child table (`ProductVariant.storeId`) but never used for tenant scoping. Queries still join through `product.storeId`. | Pick one and stick with it. Denormalisation has a cost; pay only if you'll use it. |
| **C3** | SKU dedup uses the old `product: { storeId }` join pattern instead of the new `@@unique([storeId, sku])`. | After adding a new index, sweep call sites — the old pattern still "works" but doesn't use the index. |
| **C4** | A planning doc references a `firstSoldAt` field that doesn't exist in schema. The implementation correctly worked around it; the doc lied. | **Planning docs rot.** Treat them as outdated until proven otherwise. The schema is the source of truth. |
| **C5** | `OrderItem` has `snapshotProductId/snapshotVariantId` but is missing `snapshotImageUrl/snapshotSku`. Returns work needs all four. | When you start denormalising a snapshot, finish the set in one migration — partial snapshots are confusing. |
| **C6** | `TIER_2_FIELDS` in edit-lock excludes `categoryId`, `weight`, `length`, etc. The reasoning (snapshot is on OrderItem, future-shipping-only impact) is correct but uncommented. | Permission/lock lists should always carry inline comments justifying each inclusion *and exclusion*. |
| **C7** | The PATCH variant-diff is ~250 lines inline. Hard to test without hitting the API. | Extract pure functions (`applyVariantDiff(...)`) so they can be unit-tested. Big-handler files compound future bugs. |
| **C8** | `MAX_VARIANTS = 8` constant is overridden by plan limits everywhere. Confirmed safe. | A "default constant + plan override" pattern needs an explicit assertion test that the plan path can never accidentally fall back. |

---

# Cross-cutting heuristics I want to internalise

1. **Multi-tenant WHERE rule:** every write `WHERE` includes the tenant key. Every client-supplied FK is validated against the tenant scope.
2. **Soft-delete is a contract change.** Every read in the codebase needs an explicit "archived: yes / no / show with badge" decision.
3. **Don't lean on cross-system invariants.** Each layer defends itself. "We're safe because the other system enforces X" ages badly.
4. **Cron jobs forget defenses.** Always audit them when you add a new flag (archive, suspended, deleted, etc).
5. **Snapshot fields are write-once history; never FKs, computed liveness checks at read time only.**
6. **Order/sort fields need a reconciliation pass.** Renumber to `0..N` at the end of every save.
7. **Plan gates are data contracts.** Decide what happens on downgrade *before* you ship the gate. Often the right answer is "don't gate this."
8. **Pre-flight every destructive endpoint.** Constraints prevent corruption; pre-flights provide UX.
9. **Decimal/BigInt/Date never use `===`.** Coerce explicitly.
10. **Composite indexes follow your predicates.** Add `@@index([A, B])` whenever you add `WHERE A AND B`.
11. **Caches: invalidate at every write site, or wrap the model in a repo.**
12. **Server-side silent rewrites are UX bugs.** Echo the change back to the client or prevent the bad input upstream.
13. **Header/line invariants need a transaction-end assertion.** Anywhere a parent flag implies a child must exist (`hasVariants → ≥1 live variant`), check it before commit.
14. **Planning docs rot. Schema is truth.**
15. **Big inline handlers rot. Extract pure helpers for testability.**

---

# Why this exercise was worth doing

The audit didn't find a flashy security CVE or a 10x performance win. What it found was a **pattern of small drift**: every Phase added one feature (soft-archive, edit-lock, SKU permanence) and forgot to update one or two read sites or one cron job. Individually, each finding is a 5-line fix. Together they were going to ship a system that leaks variants to wrong tenants, ghosts archived sizes onto storefronts, and silently destroys per-variant prices on plan downgrade.

The lesson behind the lessons: **after every architectural change (add flag, change FK shape, add cache, add plan tier), do a deliberate sweep of the codebase before moving on.** It's tedious. It's also the difference between a system that scales to many features and one that becomes a haunted house of "we're safe because of that other thing over there."

---

## Appendix — File map of what got fixed

| Section | Files touched |
|---|---|
| §1 §2 | [src/app/api/[storeId]/sizes/[sizeId]/route.ts](../../src/app/api/%5BstoreId%5D/sizes/%5BsizeId%5D/route.ts) |
| §3 | [src/app/api/[storeId]/products/route.ts](../../src/app/api/%5BstoreId%5D/products/route.ts), [src/app/api/[storeId]/products/[productId]/route.ts](../../src/app/api/%5BstoreId%5D/products/%5BproductId%5D/route.ts) |
| §4 §5 §17 | [src/app/api/[storeId]/products/[productId]/route.ts](../../src/app/api/%5BstoreId%5D/products/%5BproductId%5D/route.ts), [src/app/api/[storeId]/checkout/route.ts](../../src/app/api/%5BstoreId%5D/checkout/route.ts) |
| §6 | [src/app/api/cron/expire-unpaid-orders/route.ts](../../src/app/api/cron/expire-unpaid-orders/route.ts) |
| §7 §8 §15 | [src/app/api/[storeId]/products/[productId]/route.ts](../../src/app/api/%5BstoreId%5D/products/%5BproductId%5D/route.ts), [notes/storefront/PRODUCT_HASVARIANTS_ZERO_LIVE_GUARD.md](../storefront/PRODUCT_HASVARIANTS_ZERO_LIVE_GUARD.md) |
| §9 | [src/lib/archive-product.ts](../../src/lib/archive-product.ts), product POST + PATCH |
| §10 §11 | [src/app/(dashboard)/[storeId]/(routes)/products/[productId]/view/page.tsx](../../src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/products/%5BproductId%5D/view/page.tsx), [src/app/(dashboard)/[storeId]/(routes)/products/page.tsx](../../src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/products/page.tsx) |
| §13 | [src/lib/products/edit-lock.ts](../../src/lib/products/edit-lock.ts) (verified, no change) |
| §14 | [src/lib/plan-features.ts](../../src/lib/plan-features.ts), [src/app/api/[storeId]/products/check-limit/route.ts](../../src/app/api/%5BstoreId%5D/products/check-limit/route.ts), [src/app/(dashboard)/[storeId]/(routes)/products/[productId]/components/product-form.tsx](../../src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/products/%5BproductId%5D/components/product-form.tsx), [src/app/(dashboard)/[storeId]/(routes)/products/components/product-variants-section.tsx](../../src/app/%28dashboard%29/%5BstoreId%5D/%28routes%29/products/components/product-variants-section.tsx), POST + PATCH variant builders |
| §16 | [notes/future-enhancements/ORDERITEM_SNAPSHOT_VARIANT_ORPHAN_AWARENESS.md](../future-enhancements/ORDERITEM_SNAPSHOT_VARIANT_ORPHAN_AWARENESS.md) (deferred) |
| §19 | [prisma/schema.prisma](../../prisma/schema.prisma) + migration `20260430060944_added_index_in_productvariant` |
