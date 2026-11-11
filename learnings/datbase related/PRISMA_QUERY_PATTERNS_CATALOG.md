[text](PRISMA_QUERY_PATTERNS_CATALOG.md) [text](PRISMA_QUERY_MASTERY.md) [text](DATABASE_MIGRATION_MASTERY.md) [text](DB_AND_PRISMA_LEARNING_INDEX.md)# Prisma Query Patterns Catalog — ShopPulseAdmin

> Comprehensive audit of every Prisma query pattern used across the project.  
> Excludes `src/generated/` (auto-generated Prisma client runtime).

---

## Table of Contents

1. [Client Setup & Imports](#1-client-setup--imports)
2. [CRUD — Read Operations](#2-crud--read-operations)
3. [CRUD — Write Operations (Create / Update / Delete)](#3-crud--write-operations)
4. [Batch Operations (createMany / updateMany / deleteMany)](#4-batch-operations)
5. [Upsert](#5-upsert)
6. [Interactive Transactions ($transaction)](#6-interactive-transactions)
7. [Atomic Numeric Operations (increment / decrement)](#7-atomic-numeric-operations)
8. [Where Clause — Comparison Operators](#8-where-clause--comparison-operators)
9. [Where Clause — String Filters (contains, startsWith, mode)](#9-where-clause--string-filters)
10. [Where Clause — List Filters (in / notIn)](#10-where-clause--list-filters)
11. [Where Clause — Negation & Null (not, { not: null })](#11-where-clause--negation--null)
12. [Compound Where Clauses (AND / OR / NOT)](#12-compound-where-clauses)
13. [Relation Filtering (none)](#13-relation-filtering)
14. [Include & Select (Relation Loading)](#14-include--select)
15. [Nested Writes (createMany / deleteMany inside update)](#15-nested-writes)
16. [Pagination — Cursor-based](#16-pagination--cursor-based)
17. [Pagination — Offset-based (skip / take)](#17-pagination--offset-based)
18. [take Without skip (Limit Results)](#18-take-without-skip)
19. [OrderBy Patterns](#19-orderby-patterns)
20. [Aggregation — groupBy](#20-aggregation--groupby)
21. [Aggregation — _count / _sum / aggregate](#21-aggregation--_count--_sum--aggregate)
22. [Prisma Error Handling](#22-prisma-error-handling)
23. [JSON Field Usage](#23-json-field-usage)
24. [Schema — Models & Enums](#24-schema--models--enums)
25. [Schema — Indexes & Unique Constraints](#25-schema--indexes--unique-constraints)
26. [Schema — Cascade Deletes (onDelete)](#26-schema--cascade-deletes)

---

## 1. Client Setup & Imports

### Single global client — `prismadb`

```
// src/lib/prismadb.ts
const prismadb = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.prisma = prismadb;
export default prismadb;
```

**Two import conventions coexist:**

| Convention | Used In |
|---|---|
| `import prismadb from '@/lib/prismadb'` | Dashboard pages, API routes under `[storeId]/`, cron jobs, webhooks (clerk, shiprocket, razorpay/store), actions, onboarding |
| `import { prisma } from '...'` (aliased or separate) | Subscription API routes (`/api/subscription/*`), Razorpay subscription webhook handlers, `src/lib/` services |

Generated Prisma types are imported from `@/generated/prisma` (e.g., `Billboard`, `Category`, `Store`, `ShipmentStatus`, `OrderStatus`, `HandoverMethod`).

---

## 2. CRUD — Read Operations

### findUnique

| File | Model | Purpose |
|---|---|---|
| `src/app/(dashboard)/[storeId]/layout.tsx` | `user`, `store` | Layout auth + store loading |
| `src/app/(dashboard)/[storeId]/(routes)/homepage/page.tsx` | `store`, `announcementBar` | Homepage data |
| `src/app/(dashboard)/[storeId]/(routes)/billboards/[billboardId]/page.tsx` | `billboard` | Edit page |
| `src/app/(dashboard)/[storeId]/(routes)/categories/[categoryId]/page.tsx` | `category` | Edit page |
| `src/app/(dashboard)/[storeId]/(routes)/orders/[orderId]/page.tsx` | `order` | Order detail (deep include) |
| `src/app/(dashboard)/[storeId]/(routes)/products/[productId]/page.tsx` | `product` | Product edit (deep include) |
| `src/app/(dashboard)/[storeId]/(routes)/sizes/[sizeId]/page.tsx` | `size` | Size edit |
| `src/app/(dashboard)/[storeId]/(routes)/upcoming-products/[upcomingProductId]/page.tsx` | `upcomingProducts` | Upcoming product edit |
| `src/app/(dashboard)/subscription/layout.tsx` | `user` | Subscription layout |
| `src/app/(dashboard)/subscription/my-plan/page.tsx` | `user` | Plan details |
| `src/app/(dashboard)/subscription/payment-history/page.tsx` | `user` | Payment history |
| `src/app/(dashboard)/subscription/plans/page.tsx` | `user` | Plan selection |
| `src/app/(home)/page.tsx` | `store` | Home page |
| `src/app/(root)/layout.tsx` | `user` | Root layout |
| `src/app/api/auth/post-auth/route.ts` | `user` | Post-auth user check |
| `src/app/api/subscription/cancel/route.ts` | `user`, `subscription` | Cancel flow |
| `src/app/api/subscription/create/route.ts` | `user`, `subscription` | Create subscription |
| `src/app/api/subscription/current/route.ts` | `user` | Current plan |
| `src/app/api/subscription/verify/route.ts` | `user`, `payment` | Payment verify |
| `src/app/api/subscription/downgrade/cancel-scheduled/route.ts` | `user`, `subscriptionPlan` | Cancel downgrade |
| `src/app/api/subscription/downgrade/preview/route.ts` | `user`, `subscriptionPlan` | Preview downgrade |
| `src/app/api/subscription/downgrade/schedule/route.ts` | `user`, `subscriptionPlan` | Schedule downgrade |
| `src/app/api/subscription/resume/route.ts` | `user` | Resume subscription |
| `src/app/api/subscription/upgrade/execute/route.ts` | `user`, `subscriptionPlan` | Execute upgrade |
| `src/app/api/subscription/upgrade/preview/route.ts` | `user`, `subscriptionPlan` | Preview upgrade |
| `src/app/api/webhook/clerk/route.ts` | `user` | Clerk webhook |
| `src/app/api/webhook/razorpay/subscription/route.ts` | `subscription` | Razorpay webhook entry |
| `src/app/api/webhook/razorpay/subscription/handlers/authenticated.ts` | `user` | Auth webhook |
| `src/app/api/webhook/razorpay/store/route.ts` | `order` | Store payment webhook |
| `src/app/api/[storeId]/announcement-bar/route.ts` | `announcementBar` | GET announcement |
| `src/app/api/[storeId]/billboards/[billboardId]/route.ts` | `billboard` | Get/validate billboard |
| `src/app/api/[storeId]/checkout/verify/route.ts` | `order` | Verify checkout |
| `src/app/api/[storeId]/integrations/[integrationId]/route.ts` | `storeIntegration` | Integration detail |
| `src/app/api/[storeId]/notifications/settings/route.ts` | `notificationSettings` | Get settings |
| `src/app/api/[storeId]/notifications/templates/route.ts` | `notificationTemplate` | Get custom template |
| `src/app/api/[storeId]/order/[orderId]/route.ts` | `order` | Admin order detail |
| `src/app/api/[storeId]/orders/route.ts` | `order` (cursor) | Cursor validation |
| `src/app/api/[storeId]/pickups/batches/[batchId]/labels/route.ts` | `pickupBatch` | Get batch |
| `src/app/api/[storeId]/products/[productId]/route.ts` | `product` | Product API |
| `src/app/api/[storeId]/seo-config/route.ts` | `store` | SEO config |
| `src/app/api/[storeId]/shipments/queue-status/route.ts` | `store` | Queue status |
| `src/app/api/[storeId]/shipments/request-pickup/route.ts` | `storeShippingSettings` | Pickup settings |
| `src/app/api/[storeId]/stores/[storeId]/route.ts` | `store` | Store detail |
| `src/app/api/onboarding/complete/route.ts` | `user` | Onboarding check |
| `src/app/api/cron/daily-shipping-digest/route.ts` | `storeShippingSettings` | Digest settings |
| `src/app/api/cron/expire-unpaid-orders/route.ts` | `subscription` | Check sub for order |
| `src/lib/notifications/platform/notify-seller.ts` | `user` | Seller notifications |
| `src/lib/notifications/platform/order-limit-alerts.ts` | `user` | Usage alerts |

### findFirst

| File | Model | Purpose |
|---|---|---|
| `src/app/api/[storeId]/*/route.ts` (most routes) | `store` | Store ownership verification (`store.findFirst({ where: { id: storeId, userId } })`) |
| `src/app/api/subscription/create/route.ts` | `subscriptionPlan` | Find trial plan |
| `src/app/api/subscription/verify/route.ts` | `subscriptionPlan` | Find plan by razorpayPlanId |
| `src/app/api/webhook/razorpay/subscription/handlers/updated.ts` | `subscriptionPlan`, `store` | Find new plan |
| `src/app/api/webhook/razorpay/subscription/handlers/utils.ts` | `store` | Find user's store |
| `src/app/api/webhook/shiprocket/route.ts` | `shipment`, `shipmentEvent` | Find by AWB code |
| `src/app/api/[storeId]/products/route.ts` | `product` | SKU collision check |
| `src/app/api/[storeId]/products/[productId]/route.ts` | `product`, `productVariant` | SKU uniqueness validation |
| `src/lib/shipping/auto-ship-service.ts` | Various | Auto-ship lookups |
| `src/app/api/onboarding/complete/route.ts` | `subscriptionPlan` | Trial plan lookup |

### findMany

| File | Model | Purpose |
|---|---|---|
| `src/app/(dashboard)/[storeId]/(routes)/billboards/page.tsx` | `billboard` | List billboards |
| `src/app/(dashboard)/[storeId]/(routes)/categories/page.tsx` | `category` | List categories |
| `src/app/(dashboard)/[storeId]/(routes)/homepage/page.tsx` | `billboard`, `storeMainBillboard`, `category`, `product` | Homepage data |
| `src/app/(dashboard)/[storeId]/(routes)/products/page.tsx` | `product` | List products |
| `src/app/(dashboard)/[storeId]/(routes)/products/[productId]/page.tsx` | `category`, `size`, `product` | Product form data |
| `src/app/(dashboard)/[storeId]/(routes)/sizes/page.tsx` | `size` | List sizes |
| `src/app/(dashboard)/[storeId]/(routes)/upcoming-products/page.tsx` | `upcomingProducts` | List upcoming |
| `src/app/(dashboard)/subscription/plans/page.tsx` | `subscriptionPlan` | Plan listing |
| `src/actions/get-graph-revenue.ts` | `order` | Revenue graph data |
| `src/actions/get-total-revenue.ts` | `order` | Total revenue calc |
| `src/app/api/cron/daily-shipping-digest/route.ts` | `order`, `shipment`, `pickupBatch`, `store` | Daily digest |
| `src/app/api/cron/enforce-grace-periods/route.ts` | `user` | Grace period enforcement |
| `src/app/api/cron/expire-period-ended-subscriptions/route.ts` | `subscription` | Expiring subs |
| `src/app/api/cron/expire-trials-detect-payment-failure/route.ts` | `subscription` | Expired trials |
| `src/app/api/cron/expire-unpaid-orders/route.ts` | `order` | Unpaid order cleanup |
| `src/app/api/cron/pickup-health/route.ts` | `pickupBatch`, `store`, `shipment` | Health monitoring |
| `src/app/api/cron/pickup-scheduler/route.ts` | `shipment` | Pickup scheduling |
| `src/app/api/[storeId]/billboards/route.ts` | `billboard` | Public billboard API |
| `src/app/api/[storeId]/categories/route.ts` | `category`, `billboard` | Public category API |
| `src/app/api/[storeId]/checkout/route.ts` | `product` | Cart validation |
| `src/app/api/[storeId]/integrations/route.ts` | `storeIntegration` | List integrations |
| `src/app/api/[storeId]/notifications/logs/route.ts` | `notificationLog` | Log listing |
| `src/app/api/[storeId]/notifications/templates/route.ts` | `notificationTemplate` | Template listing |
| `src/app/api/[storeId]/orders/route.ts` | `order` | Paginated orders |
| `src/app/api/[storeId]/order/[orderId]/route.ts` | `archivedProduct` | Archived product recovery |
| `src/app/api/[storeId]/pickups/route.ts` | `shipment` | Pickup shipments |
| `src/app/api/[storeId]/products/route.ts` | `product`, `productVariant` | Product listing + SKU checks |
| `src/app/api/[storeId]/products/[productId]/route.ts` | `product`, `productVariant` | SKU validation |
| `src/app/api/[storeId]/shipments/request-pickup/route.ts` | `shipment` | Batch pickup |
| `src/app/api/[storeId]/shipments/route.ts` | `shipment` | Shipment listing |
| `src/lib/notifications/platform/stock-alerts.ts` | `product` | Low-stock products |
| `src/lib/usage-service.ts` | Various usage models | Usage enforcement |

### count

| File | Model | Purpose |
|---|---|---|
| `src/actions/get-sales-count.ts` | `order` | Sales dashboard stat |
| `src/actions/get-stock-count.ts` | `product` | Stock dashboard stat |
| `src/app/api/cron/daily-shipping-digest/route.ts` | `order`, `shipment` | Daily stats |
| `src/app/api/cron/pickup-scheduler/route.ts` | `pickupBatch` | Batch count check |
| `src/app/api/[storeId]/categories/[categoryId]/route.ts` | `product` | Deletion guard |
| `src/app/api/[storeId]/notifications/logs/route.ts` | `notificationLog` | Total count for pagination |
| `src/app/api/[storeId]/products/check-limit/route.ts` | `product` | Featured limit check |
| `src/app/api/[storeId]/products/featured-count/route.ts` | `product` | Featured product counts |
| `src/app/api/[storeId]/products/route.ts` | `product` | Featured count for limit enforcement |
| `src/app/api/[storeId]/products/[productId]/route.ts` | `product` | Featured count validation |
| `src/app/api/[storeId]/shipments/queue-status/route.ts` | `shipment` (×3) | Queue status by state |
| `src/app/api/webhook/razorpay/subscription/handlers/utils.ts` | `product`, `order` | Usage counts |

---

## 3. CRUD — Write Operations

### create

| File | Model | Purpose |
|---|---|---|
| `src/app/api/auth/post-auth/route.ts` | `user` | New user creation |
| `src/app/api/subscription/cancel/route.ts` | `subscriptionHistory` | Cancel history entry |
| `src/app/api/subscription/create/route.ts` | `subscription` (via update) | Subscription setup |
| `src/app/api/subscription/downgrade/cancel-scheduled/route.ts` | `subscriptionHistory` | Downgrade cancel log |
| `src/app/api/subscription/downgrade/schedule/route.ts` | `subscriptionHistory` | Downgrade schedule log |
| `src/app/api/subscription/upgrade/execute/route.ts` | `subscriptionHistory` | Upgrade log |
| `src/app/api/subscription/verify/route.ts` | `subscription`, `payment` | New subscription |
| `src/app/api/webhook/clerk/route.ts` | `user` | Clerk user sync |
| `src/app/api/webhook/razorpay/subscription/handlers/pending.ts` | `subscriptionHistory` | Status log |
| `src/app/api/webhook/shiprocket/route.ts` | `shipmentEvent` | Tracking event |
| `src/app/api/[storeId]/billboards/route.ts` | `billboard` | Create billboard |
| `src/app/api/[storeId]/categories/route.ts` | `category` | Create category |

### update

| File | Model | Purpose |
|---|---|---|
| `src/app/api/subscription/*/route.ts` (all) | `subscription`, `user` | Status/plan changes |
| `src/app/api/webhook/*/route.ts` (all) | Various | Webhook state updates |
| `src/app/api/[storeId]/checkout/verify/route.ts` | `order` | Mark paid |
| `src/app/api/[storeId]/categories/[categoryId]/route.ts` | `category` | Category edit |
| `src/app/api/[storeId]/integrations/[integrationId]/route.ts` | `storeIntegration` | Integration update |
| `src/app/api/[storeId]/seo-config/route.ts` | `store` | SEO update |
| `src/app/api/[storeId]/stores/[storeId]/route.ts` | `store` | Store settings |
| `src/app/api/webhook/shiprocket/route.ts` | `shipment`, `order` | Status sync |
| `src/lib/notifications/platform/order-limit-alerts.ts` | `user` | Alert flag |
| `src/lib/notifications/platform/stock-alerts.ts` | `product`, `productVariant` | Alert flag |

### delete

| File | Model | Purpose |
|---|---|---|
| `src/app/api/[storeId]/announcement-bar/route.ts` | `announcementBar` | Delete announcement |
| `src/app/api/[storeId]/integrations/[integrationId]/route.ts` | `storeIntegration` | Remove integration |
| `src/app/api/stores/[storeId]/route.ts` | `store` | Delete store |

---

## 4. Batch Operations

### createMany

| File | Model | Purpose |
|---|---|---|
| `src/app/api/[storeId]/categories/route.ts` | `categoryBillboard` | Bulk link billboards to category |
| `src/app/api/[storeId]/categories/[categoryId]/route.ts` | `categoryBillboard` | Re-link after update |
| `src/app/api/[storeId]/products/route.ts` | `productVariant`, `productRelation` | Create variants + relations |
| `src/app/api/[storeId]/products/[productId]/route.ts` | `productRelation` | Re-create relations |

### updateMany

| File | Model | Purpose |
|---|---|---|
| `src/app/api/[storeId]/billboards/[billboardId]/route.ts` | `billboard` | Scoped update (storeId + id) |
| `src/app/api/[storeId]/checkout/route.ts` | `productVariant`, `product` | Atomic stock decrement with WHERE guard |
| `src/app/api/[storeId]/products/route.ts` | `productVariant` | Bulk variant displayOrder |
| `src/app/api/[storeId]/products/[productId]/route.ts` | `productVariant` | Variant bulk update |
| `src/app/api/[storeId]/shipments/request-pickup/route.ts` | `shipment` | Bulk status update |
| `src/app/api/[storeId]/shipping/package-presets/route.ts` | `packagePreset` | Bulk sortOrder |
| `src/app/api/[storeId]/shipping/pickup-locations/[locationId]/route.ts` | `address` | Reset default flag |
| `src/app/api/[storeId]/sizes/[sizeId]/route.ts` | `size` | Scoped update |
| `src/app/api/cron/expire-period-ended-subscriptions/route.ts` | `store` (via tx) | Suspend stores |
| `src/app/api/cron/expire-trials-detect-payment-failure/route.ts` | `store` (via tx) | Suspend stores |
| `src/app/api/cron/expire-unpaid-orders/route.ts` | `usageOrders` | Reset order counts |
| `src/app/api/cron/pickup-scheduler/route.ts` | `shipment` | Bulk assign to batch |
| `src/app/api/webhook/razorpay/subscription/handlers/*.ts` | `store` (via tx) | Bulk isAccessible toggle |
| `src/app/api/subscription/resume/route.ts` | `store` (via tx) | Re-enable stores |

### deleteMany

| File | Model | Purpose |
|---|---|---|
| `src/app/api/[storeId]/billboards/[billboardId]/route.ts` | `billboard` | Scoped delete |
| `src/app/api/[storeId]/categories/[categoryId]/route.ts` | `categoryBillboard`, `category` | Delete relations + entity |
| `src/app/api/[storeId]/products/[productId]/route.ts` | `productVariant`, `productRelation`, `product` | Cascade cleanup |

---

## 5. Upsert

| File | Model | Purpose |
|---|---|---|
| `src/app/api/subscription/verify/route.ts` | `payment` | Create or update payment record |
| `src/app/api/webhook/razorpay/subscription/handlers/authenticated.ts` | `payment` (via tx) | Idempotent payment record |
| `src/app/api/webhook/razorpay/subscription/handlers/charged.ts` | `payment` (via tx) | Recurring payment record |
| `src/app/api/[storeId]/announcement-bar/route.ts` | `announcementBar` | Create or update announcement |
| `src/app/api/[storeId]/notifications/settings/route.ts` | `notificationSettings` | Settings upsert |
| `src/app/api/[storeId]/notifications/templates/route.ts` | `notificationTemplate` | Template upsert |
| `src/app/api/[storeId]/shipping/settings/route.ts` | `storeShippingSettings` | Shipping settings upsert |
| `src/lib/integration-service.ts` | `storeIntegration` | Integration upsert |
| `src/lib/usage-service.ts` | `usageOrders`, `usageApiCalls`, `usageCumulative` | Usage tracking upsert |

---

## 6. Interactive Transactions

**All transactions use the interactive pattern:** `prismadb.$transaction(async (tx) => { ... })`

No `$queryRaw` or `$executeRaw` found in source code — all queries use the Prisma query builder.

| File | Purpose |
|---|---|
| `src/app/api/onboarding/complete/route.ts` | Create store + subscription + usage records atomically |
| `src/app/api/[storeId]/checkout/route.ts` (×2) | Atomic stock decrement + order creation (two variants: with/without variants) |
| `src/app/api/[storeId]/products/route.ts` | Create product + images + variants atomically |
| `src/app/api/[storeId]/products/[productId]/route.ts` | Update product + images + variants atomically |
| `src/app/api/[storeId]/shipments/request-pickup/route.ts` | Batch pickup creation + shipment status update |
| `src/app/api/cron/expire-unpaid-orders/route.ts` | Stock restoration + order status + usage update |
| `src/app/api/cron/expire-period-ended-subscriptions/route.ts` | Expire sub + suspend stores |
| `src/app/api/cron/expire-trials-detect-payment-failure/route.ts` (×2) | Expire trial + suspend; detect failures |
| `src/app/api/cron/enforce-grace-periods/route.ts` (×2) | Grace period expiry + suspension |
| `src/app/api/cron/pickup-scheduler/route.ts` | Create pickup batch + assign shipments |
| `src/app/api/subscription/resume/route.ts` | Resume sub + re-enable stores |
| `src/app/api/webhook/razorpay/subscription/handlers/authenticated.ts` | Sub update + store access + payment |
| `src/app/api/webhook/razorpay/subscription/handlers/cancelled.ts` | Cancel sub + history + usage check |
| `src/app/api/webhook/razorpay/subscription/handlers/charged.ts` | Charge sub + payment + store access |
| `src/app/api/webhook/razorpay/subscription/handlers/completed.ts` | Complete sub + history |
| `src/app/api/webhook/razorpay/subscription/handlers/halted.ts` | Halt sub + suspend stores |
| `src/app/api/webhook/razorpay/subscription/handlers/paused.ts` | Pause sub + suspend stores |
| `src/app/api/webhook/razorpay/subscription/handlers/resumed.ts` | Resume sub + enable stores |
| `src/app/api/webhook/razorpay/subscription/handlers/updated.ts` | Plan change + usage enforcement |
| `src/lib/shipping/auto-ship-service.ts` | Auto-ship creation workflow |

---

## 7. Atomic Numeric Operations

### increment

| File | Field | Purpose |
|---|---|---|
| `src/app/api/cron/expire-unpaid-orders/route.ts` | `stockQuantity` | Restore stock on order expiry |
| `src/lib/usage-service.ts` | `count` | Increment usage counters (orders, API calls) |

### decrement

| File | Field | Purpose |
|---|---|---|
| `src/app/api/[storeId]/checkout/route.ts` | `stockQuantity`, `baseStockQuantity` | Atomic stock decrement on purchase (with `updateMany` + `gte` guard) |
| `src/app/api/cron/expire-unpaid-orders/route.ts` | `count` | Decrement order usage on expiry |

**Key pattern — safe stock decrement:**
```ts
tx.productVariant.updateMany({
  where: { id: variantId, stockQuantity: { gte: item.quantity } },
  data: { stockQuantity: { decrement: item.quantity } }
})
```

---

## 8. Where Clause — Comparison Operators

### gte (greater than or equal)

| File | Field | Purpose |
|---|---|---|
| `src/app/api/[storeId]/checkout/route.ts` | `stockQuantity`, `baseStockQuantity` | Stock sufficiency guard |
| `src/app/api/[storeId]/products/route.ts` | `createdAt` | New arrivals (cutoffDate) |
| `src/app/api/[storeId]/orders/route.ts` | `createdAt` | Date range filter |
| `src/app/api/[storeId]/shipments/route.ts` | `createdAt` | Date range filter |
| `src/app/api/[storeId]/shipments/v2/route.ts` | `createdAt` | Date range + cursor |
| `src/app/api/[storeId]/pickups/route.ts` | `pickupScheduledDate` | Date range filter |
| `src/app/api/[storeId]/shipping/analytics/route.ts` | `createdAt` | Analytics date range |
| `src/app/api/cron/daily-shipping-digest/route.ts` | `createdAt`, `updatedAt` | Today's data |
| `src/app/api/cron/pickup-scheduler/route.ts` | `createdAt` | Today's shipments |

### lte (less than or equal)

| File | Field | Purpose |
|---|---|---|
| `src/app/api/[storeId]/orders/route.ts` | `createdAt` | Date range end |
| `src/app/api/[storeId]/shipments/route.ts` | `createdAt` | Date range end |
| `src/app/api/[storeId]/shipments/v2/route.ts` | `createdAt` | Date range end |
| `src/app/api/[storeId]/pickups/route.ts` | `pickupScheduledDate` | Date range end |
| `src/app/api/[storeId]/shipping/analytics/route.ts` | `createdAt` | Analytics range end |

### lt (less than)

| File | Field | Purpose |
|---|---|---|
| `src/app/api/[storeId]/orders/route.ts` | `createdAt`, `id` | Cursor-based backward pagination |
| `src/app/api/[storeId]/shipments/v2/route.ts` | `createdAt`, `id` | Cursor-based backward pagination |
| `src/app/api/cron/expire-period-ended-subscriptions/route.ts` | `periodEnd` | Expired periods |
| `src/app/api/cron/expire-trials-detect-payment-failure/route.ts` | `trialEnd` | Expired trials |
| `src/app/api/cron/expire-unpaid-orders/route.ts` | `createdAt` | 30-min-old unpaid orders |
| `src/app/api/cron/pickup-health/route.ts` | `scheduledDate` | Stale pickups |
| `src/app/api/cron/daily-shipping-digest/route.ts` | `scheduledDate` | Overdue batches |

### gt (greater than)

| File | Field | Purpose |
|---|---|---|
| `src/app/api/[storeId]/orders/route.ts` | `createdAt`, `id` | Cursor-based forward pagination |
| `src/app/api/[storeId]/shipments/v2/route.ts` | `createdAt`, `id` | Cursor-based forward pagination |

---

## 9. Where Clause — String Filters

### contains + mode: 'insensitive'

| File | Fields | Purpose |
|---|---|---|
| `src/app/api/[storeId]/orders/route.ts` | `id`, `phone`, `name`, `email` | Multi-field text search |
| `src/app/api/[storeId]/shipments/route.ts` | `awbCode`, `order.orderNumber` | Shipment search (nested relation) |
| `src/app/api/[storeId]/shipments/v2/route.ts` | `awbCode`, `id`, `shipmentNumber`, `orderId` | V2 shipment search |

### startsWith

| File | Field | Purpose |
|---|---|---|
| `src/app/api/[storeId]/orders/route.ts` | `shippingPincode` | Pincode prefix search |

---

## 10. Where Clause — List Filters

### in

| File | Model.Field | Purpose |
|---|---|---|
| `src/app/api/[storeId]/categories/route.ts` | `billboard.id` | Validate billboard IDs |
| `src/app/api/[storeId]/categories/[categoryId]/route.ts` | `billboard.id` | Validate billboard IDs |
| `src/app/api/[storeId]/checkout/route.ts` | `product.id` | Fetch cart products |
| `src/app/api/[storeId]/order/[orderId]/route.ts` | `archivedProduct.originalProductId` | Fetch archived for deleted products |
| `src/app/api/[storeId]/products/route.ts` | `productVariant.sku`, `product.id` | SKU collision, related products |
| `src/app/api/[storeId]/products/[productId]/route.ts` | `productVariant.sku/id`, `product.id` | SKU collision, size cleanup |
| `src/app/api/[storeId]/shipments/request-pickup/route.ts` | `shipment.id`, `shipment.status` | Batch by IDs + status |
| `src/app/api/[storeId]/pickups/route.ts` | `shipment.status` | Filter by status set |
| `src/app/api/cron/daily-shipping-digest/route.ts` | `shipment.status`, `subscription.status` | Status filtering |
| `src/app/api/cron/expire-period-ended-subscriptions/route.ts` | `subscription.status` | Multiple status check |
| `src/app/api/cron/pickup-health/route.ts` | `store.id`, `shipment.id` | Batch fetching by ID set |
| `src/app/api/cron/pickup-scheduler/route.ts` | `shipment.id` | Bulk operations by ID set |

### notIn

| File | Model.Field | Purpose |
|---|---|---|
| `src/lib/shipping/shipping-service.ts` | `shipment.status` | Exclude CANCELLED, RTO_DELIVERED |

---

## 11. Where Clause — Negation & Null

### not (value exclusion)

| File | Field | Purpose |
|---|---|---|
| `src/app/(dashboard)/subscription/plans/page.tsx` | `billingCycle` | Exclude TRIAL plans (`not: 'TRIAL'`) |
| `src/app/api/[storeId]/orders/route.ts` | `orderStatus` | Exclude PAYMENT_INITIATED |
| `src/app/api/[storeId]/products/[productId]/route.ts` | `product.id` | Exclude current product from SKU check |
| `src/app/api/[storeId]/shipments/[shipmentId]/awb/route.ts` | `shipment.id` | Exclude self from AWB check |
| `src/app/api/[storeId]/shipping/package-presets/[presetId]/route.ts` | `packagePreset.id` | Exclude self |
| `src/lib/integration-service.ts` | `storeIntegration.id` | Exclude self from uniqueness check |

### { not: null } (null exclusion)

| File | Field | Purpose |
|---|---|---|
| `src/app/api/cron/daily-shipping-digest/route.ts` | `order.autoShipError` | Find orders with errors |
| `src/app/api/cron/expire-trials-detect-payment-failure/route.ts` | `subscription.razorpaySubscriptionId` | Has subscription |
| `src/app/api/cron/pickup-scheduler/route.ts` | `shipment.providerShipmentId` | Has provider ID |
| `src/app/api/[storeId]/pickups/route.ts` | `shipment.pickupScheduledDate` | Has scheduling |
| `src/lib/shipping/shipping-service.ts` | `shipment.providerShipmentId` | Has provider ID |

---

## 12. Compound Where Clauses

### OR

| File | Purpose |
|---|---|
| `src/app/api/[storeId]/orders/route.ts` | Multi-field text search across id, phone, name, email, pincode |
| `src/app/api/[storeId]/shipments/route.ts` | Search across awbCode, order.orderNumber |
| `src/app/api/[storeId]/shipments/v2/route.ts` | Search across awbCode, id, shipmentNumber, orderId |
| `src/app/api/cron/daily-shipping-digest/route.ts` | Pickup batch status filter |
| `src/lib/shipping/shipping-service.ts` | Multi-field shipment search |

### AND (combined with OR for cursor pagination)

| File | Purpose |
|---|---|
| `src/app/api/[storeId]/orders/route.ts` | `AND: [{ OR: searchConditions }, cursorCondition]` — Combines text search with cursor pagination |
| `src/app/api/[storeId]/shipments/v2/route.ts` | Same pattern — search + cursor combined |

**Key pattern — merging search + cursor:**
```ts
if (search && cursor) {
  where.AND = [{ OR: searchConditions }, cursorCondition];
} else if (cursor) {
  where.AND = [cursorCondition];
}
```

### NOT

| File | Purpose |
|---|---|
| `src/app/(dashboard)/[storeId]/(routes)/products/[productId]/page.tsx` | `NOT: { id: productId }` — Exclude current product from "all products" list for related products selection |

---

## 13. Relation Filtering

### none

| File | Model | Purpose |
|---|---|---|
| `src/app/api/cron/daily-shipping-digest/route.ts` | `pickupBatch` → `shipments` | Find batches with zero shipments (`shipments: { none: {} }`) |

> **Note:** `some` and `every` are **not used** anywhere in the source code.

---

## 14. Include & Select

### Deep Nested Includes

| File | Depth | Pattern |
|---|---|---|
| `src/app/api/[storeId]/products/[productId]/route.ts` | 4 levels | `product → images, variants → size, relatedFrom → relatedProduct → images, variants → size` |
| `src/lib/shipping/shipping-service.ts` | 3 levels | `shipment → order → orderItems, events` |
| `src/app/api/[storeId]/order/[orderId]/route.ts` | 3 levels | `order → orderItems → product → images, shipments` |
| `src/app/api/[storeId]/checkout/route.ts` | 2 levels | `store → subscription → plan` |
| `src/lib/shipping/auto-ship-service.ts` | 3 levels | Various shipment/order chains |

### Select for Optimization

| File | Pattern | Purpose |
|---|---|---|
| `src/lib/store-settings-service.ts` | `select: { domainUrl, orderTrackingPath, ... }` | Selective field loading |
| `src/lib/store-subscription-service.ts` | `select: { specific fields }` | Optimized subscription load |
| `src/app/api/[storeId]/shipments/v2/route.ts` | `include: { order: { select: {...} }, events: { select: {...} } }` | Mixed include + select |
| Many routes | `select: { id: true }` | Existence check only |
| `src/app/api/[storeId]/order/[orderId]/route.ts` | `images: { select: { url: true }, take: 1 }` | First image only |

### _count in Include

| File | Model | Purpose |
|---|---|---|
| `src/app/(dashboard)/[storeId]/(routes)/orders/[orderId]/page.tsx` | `order._count.shipments` | Check if shipment exists |
| `src/app/(dashboard)/[storeId]/(routes)/pickups/page.tsx` | `pickupBatch._count.shipments` | Display shipment count |
| `src/app/api/cron/daily-shipping-digest/route.ts` | `pickupBatch._count.shipments` | Batch analysis |
| `src/app/api/cron/pickup-health/route.ts` | `pickupBatch._count.shipments` | Health monitoring |

---

## 15. Nested Writes

### deleteMany + createMany inside update (replace pattern)

| File | Model | Purpose |
|---|---|---|
| `src/app/api/[storeId]/products/[productId]/route.ts` | `images: { deleteMany: {}, createMany: {...} }` | Replace all images on product update |
| `src/app/api/[storeId]/categories/[categoryId]/route.ts` | `categoryBillboard.deleteMany` → `categoryBillboard.createMany` | Replace billboard links (sequential, not nested) |
| `src/app/api/[storeId]/products/[productId]/route.ts` | `productRelation.deleteMany` → `productRelation.createMany` | Replace related products (sequential) |

---

## 16. Pagination — Cursor-based

| File | Cursor Fields | Direction |
|---|---|---|
| `src/app/api/[storeId]/orders/route.ts` | `(createdAt, id)` composite | Forward (`gt`) and backward (`lt`) |
| `src/app/api/[storeId]/shipments/v2/route.ts` | `(createdAt, id)` composite | Forward and backward |
| `src/hooks/use-cursor-pagination.ts` | Client-side hook | Manages next/prev cursor state |

**Pattern:**
```ts
// take + 1 for hasMore detection
const orders = await prismadb.order.findMany({
  where: { ...where, AND: [cursorCondition] },
  take: limit + 1,
  orderBy: [{ createdAt: direction }, { id: direction }]
});
const hasMore = orders.length > limit;
if (hasMore) orders.pop();
```

---

## 17. Pagination — Offset-based

| File | Usage |
|---|---|
| `src/lib/shipping/shipping-service.ts` (line 1009) | `skip: (page - 1) * limit, take: limit` — Pickup batch pagination |
| `src/lib/shipping/shipping-service.ts` (line 1316) | Same offset pattern — Shipment event pagination |
| `src/app/api/[storeId]/notifications/logs/route.ts` | Implied via count + findMany (likely offset) |

---

## 18. take Without skip (Limit Results)

| File | Value | Purpose |
|---|---|---|
| `src/lib/usage-service.ts` | `take: overageCount` | Enforce resource limits (archive/delete oldest) |
| `src/lib/shipping/auto-ship-service.ts` | `take: 1` | Get most recent record |
| `src/lib/shipping/shipping-service.ts` | `take: 10` | Limit event history |
| `src/app/api/[storeId]/order/[orderId]/route.ts` | `take: 1` (on nested relation) | First image only |

---

## 19. OrderBy Patterns

### Single field

| Direction | Examples |
|---|---|
| `'desc'` (most common) | `createdAt: 'desc'` — default listing order (billboards, categories, products, orders, sizes, upcoming, shipments, pickup batches, notification logs) |
| `'asc'` | `displayOrder: 'asc'` — variant/image display ordering; `volume: 'asc'` — package presets; `createdAt: 'asc'` — oldest-first for usage enforcement; `sortOrder: 'asc'` — box selection |

### Multi-field orderBy (array syntax)

| File | Pattern |
|---|---|
| `src/app/api/[storeId]/notifications/templates/route.ts` | `orderBy: [{ type: 'asc' }, { channel: 'asc' }]` |
| `src/app/api/[storeId]/shipping/pickup-locations/route.ts` | `orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]` |
| `src/lib/integration-service.ts` | `orderBy: [{ type: 'asc' }, { isDefault: 'desc' }, { createdAt: 'asc' }]` |
| `src/lib/integration-service.ts` | `orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]` |
| `src/app/api/[storeId]/orders/route.ts` | `orderBy: [{ createdAt: dir }, { id: dir }]` — cursor pagination composite |
| `src/app/api/[storeId]/shipments/v2/route.ts` | `orderBy: [{ createdAt: dir }, { id: dir }]` — cursor pagination composite |

### Nested orderBy (on relations)

| File | Pattern |
|---|---|
| `src/app/api/[storeId]/products/route.ts` | `variants: { orderBy: { displayOrder: 'asc' } }` (inside include) |
| `src/app/api/[storeId]/shipments/[shipmentId]/route.ts` | `events: { orderBy: { eventTime: 'desc' } }` (inside include) |

---

## 20. Aggregation — groupBy

| File | Model | By | Aggregates | Purpose |
|---|---|---|---|---|
| `src/app/api/cron/daily-shipping-digest/route.ts` (L45) | `order` | `paymentMethod` | `_count`, `_sum: { totalAmount, codAmount }` | Revenue breakdown by payment method |
| `src/app/api/cron/daily-shipping-digest/route.ts` (L219) | `shipment` | `status` | `_count: { _all: true }` | Shipment status distribution |

---

## 21. Aggregation — _count / _sum / aggregate

### _count (in include)

See [Section 14 — _count in Include](#_count-in-include) above.

### _sum (in groupBy)

| File | Field | Purpose |
|---|---|---|
| `src/app/api/cron/daily-shipping-digest/route.ts` | `totalAmount`, `codAmount` | Revenue sums by payment method |

### aggregate

| File | Model | Operation | Purpose |
|---|---|---|---|
| `src/app/api/cron/expire-unpaid-orders/route.ts` | `productVariant` | `_sum: { stockQuantity: true }` | Total variant stock to decide restock behavior |

---

## 22. Prisma Error Handling

| File | Error Code | Handling |
|---|---|---|
| `src/app/api/onboarding/complete/route.ts` | `P2002` | Unique constraint → "store already exists" or "subscription conflict" |
| `src/app/api/onboarding/complete/route.ts` | `P2003` | Foreign key → "Invalid subscription plan reference" |
| `src/app/api/webhook/clerk/route.ts` | `P2025` | Record not found → retry with backoff (up to maxRetries) |
| `src/app/api/[storeId]/products/route.ts` | `P2002` | SKU conflict → "A product with this SKU already exists" |
| `src/app/api/[storeId]/products/[productId]/route.ts` | `P2002` | SKU conflict → same as above |

**Note:** `PrismaClientKnownRequestError` is referenced in `src/lib/store-subscription-service.ts` but no explicit import/instanceof pattern is used — errors are typically checked via `(error as any).code` or `error.code`.

---

## 23. JSON Field Usage

### Schema JSON Fields (17 total)

| Model | Field | Type | Purpose |
|---|---|---|---|
| `Store` | `socialLinks` | `Json?` | `{ facebook, instagram, twitter, linkedin, youtube, pinterest }` |
| `AnnouncementBar` | `messages` | `Json` | Array of announcement messages |
| `Product` | `specifications` | `Json?` | `Array<{key: string, value: string}>` |
| `ArchivedProduct` | `images` | `Json` | Snapshot of image URLs |
| `OrderItem` | `variantSnapshot` | `Json?` | Size/variant info at purchase time |
| `StoreIntegration` | `config` | `Json?` | Provider config |
| `Subscription` | `metadata` | `Json?` | Upgrade attempts, webhook timestamps |
| `SubscriptionPlan` | `additionalLimits` | `Json?` | `{ maxCategories, maxBillboards }` |
| `SubscriptionPlan` | `features` | `Json?` | `{ analytics, advancedReports, apiAccess }` |
| `SubscriptionHistory` | `metadata` | `Json?` | History metadata |
| `UsageCumulative` | `metrics` | `Json` | Usage metrics |
| `UsageHistory` | `metrics` | `Json` | Historical metrics |
| `Address` | `providerMetadata` | `Json?` | Provider-specific data |
| `Shipment` | `metadata` | `Json?` | Shipment metadata |
| `ShipmentEvent` | `rawPayload` | `Json?` | Original webhook payload |
| `StoreShippingSettings` | `allowedPackageTypes` | `Json` | Package type config |
| `PickupBatch` | `metadata` | `Json?` | Retry history, provider data |

### Application-level JSON handling

JSON fields are written as plain objects/arrays in `create`/`update` calls and read with type assertions:
```ts
// Writing
specifications: validatedData.specifications  // Array<{key, value}>
socialLinks: { facebook: '...', instagram: '...' }

// Reading
const features = plan.features as { featuresList?: string[] } | null;
const additionalLimits = plan.additionalLimits as { maxCategories?: number } | null;
const variantSnapshot = item.variantSnapshot as Record<string, unknown> | null;
```

> No Prisma JSON-specific filtering operators (`path`, `array_contains`, `string_contains`) are used — JSON fields are read/written as opaque blobs.

---

## 24. Schema — Models & Enums

### 36 Models

| Model | Line | Domain |
|---|---|---|
| `User` | 11 | Auth & identity |
| `Store` | 49 | Store management |
| `AnnouncementBar` | 100 | Storefront |
| `Billboard` | 124 | Storefront |
| `Category` | 138 | Catalog |
| `CategoryBillboard` | 153 | Junction table |
| `StoreMainBillboard` | 166 | Junction table |
| `Size` | 179 | Product variants |
| `ProductVariant` | 194 | Product variants |
| `Product` | 227 | Catalog |
| `ProductRelation` | 289 | Related products |
| `Image` | 302 | Media |
| `ArchivedProduct` | 315 | Soft-delete archive |
| `UpcomingProducts` | 346 | Pre-launch |
| `Order` | 362 | Orders |
| `OrderItem` | 443 | Order details |
| `StoreIntegration` | 478 | Third-party integrations |
| `Subscription` | 512 | Billing |
| `SubscriptionPlan` | 568 | Plan definitions |
| `Payment` | 606 | Payment records |
| `SubscriptionHistory` | 658 | Audit log |
| `UsageCumulative` | 692 | Usage tracking |
| `UsageOrders` | 707 | Order usage |
| `UsageApiCalls` | 737 | API usage |
| `UsageHistory` | 758 | Historical usage |
| `Address` | 779 | Shipping addresses |
| `PackagePreset` | 825 | Shipping config |
| `Shipment` | 870 | Shipping |
| `ShipmentEvent` | 1004 | Tracking events |
| `ReturnRequest` | 1027 | Returns |
| `ReturnItem` | 1071 | Return details |
| `StoreShippingSettings` | 1082 | Shipping config |
| `PickupBatch` | 1147 | Pickup scheduling |
| `NotificationSettings` | 1403 | Notification config |
| `NotificationTemplate` | 1443 | Email/SMS templates |
| `NotificationLog` | 1465 | Notification audit |

### 25 Enums

`SubscriptionStatus`, `WebhookSyncStatus`, `BillingCycle`, `PaymentStatus`, `SubscriptionAction`, `CumulativeMetricType`, `OrderStatus`, `PaymentMethod`, `IntegrationType`, `PaymentType`, `AddressType`, `ShippingProvider`, `ShipmentStatus`, `ShippingMode`, `HandoverMethod`, `ReturnReason`, `ReturnStatus`, `RefundStatus`, `InspectionStatus`, `CourierSelectionMode`, `PickupBatchStatus`, `PickupFrequency`, `NotificationType`, `NotificationChannel`, `NotificationStatus`

---

## 25. Schema — Indexes & Unique Constraints

### Unique Constraints (@unique / @@unique)

| Model | Constraint | Purpose |
|---|---|---|
| `User` | `email @unique` | One user per email |
| `User` | `subscriptionId @unique` | One sub per user |
| `Store` | `userId @unique` | One store per user |
| `AnnouncementBar` | `storeId @unique` | One per store |
| `ArchivedProduct` | `originalProductId @unique` | One archive per product |
| `Shipment` | `shipmentNumber @unique` | Unique shipment numbers |
| `ReturnRequest` | `returnNumber @unique` | Unique return numbers |
| `PickupBatch` | `batchNumber @unique` | Unique batch numbers |
| `StoreShippingSettings` | `storeId @unique` | One settings per store |
| `NotificationSettings` | `storeId @unique` | One settings per store |
| `CategoryBillboard` | `@@unique([categoryId, billboardId])` | No duplicate links |
| `StoreMainBillboard` | `@@unique([storeId, billboardId])` | No duplicate billboard assignments |
| `ProductVariant` | `@@unique([productId, sizeId])` | One variant per size per product |
| `Product` | `@@unique([storeId, sku])` | Unique SKU per store |
| `ProductRelation` | `@@unique([mainProductId, relatedProductId])` | No duplicate relations |
| `Shipment` | `@@unique([awbCode, provider])` | Unique AWB per provider |
| `ShipmentEvent` | `@@unique([shipmentId, status, eventTime])` | No duplicate events |
| `NotificationTemplate` | `@@unique([storeId, type, channel])` | One template per type per channel |

### Composite Indexes (@@index) — Notable

| Model | Index | Purpose |
|---|---|---|
| `Shipment` | `@@index([storeId, createdAt(sort: Desc)])` | Sorted descending index |
| `Shipment` | `@@index([storeId, status, createdAt(sort: Desc)])` | Composite status + date |
| `NotificationLog` | `@@index([storeId, createdAt(sort: Desc)])` | Sorted descending |
| `PackagePreset` | `@@index([storeId, sortOrder])` | Box selection optimization |
| `UsageHistory` | `@@index([userId, periodStart])` | Analytics queries |

---

## 26. Schema — Cascade Deletes

**Every child relation uses `onDelete: Cascade`:**

| Parent | Children (Cascade) |
|---|---|
| `Store` | `AnnouncementBar`, `StoreMainBillboard`, `Address`, `PackagePreset`, `Shipment`, `PickupBatch`, `NotificationSettings`, `NotificationTemplate`, `NotificationLog`, `StoreShippingSettings` |
| `User` | `UsageHistory` |
| `Product` | `ProductVariant`, `Image`, `ProductRelation` (both sides) |
| `Category` | `CategoryBillboard` |
| `Billboard` | `CategoryBillboard`, `StoreMainBillboard` |
| `Order` | `Shipment` |
| `Shipment` | `ShipmentEvent` |
| `ReturnRequest` | `ReturnItem` |

---

## Summary Statistics

| Metric | Count |
|---|---|
| Models | 36 |
| Enums | 25 |
| JSON fields | 17 |
| @@unique constraints | 8 (compound) + 10 (@unique field) |
| Interactive transactions | ~22 |
| Upsert calls | ~9 |
| groupBy calls | 2 |
| aggregate calls | 1 |
| Files with Prisma queries | ~70+ |
| Error codes handled | P2002, P2003, P2025 |
| Raw SQL ($queryRaw/$executeRaw) | 0 |
| Prisma middleware ($use) | 0 |
| Client extensions ($extends) | 0 |
| Relation filters (some/every/none) | 1 (none only) |

### Patterns NOT Used

- `$queryRaw` / `$executeRaw` (raw SQL)
- `$use` (middleware)
- `$extends` (client extensions)
- `some` / `every` (relation filters — only `none` used once)
- `distinct`
- `connect` / `disconnect` / `connectOrCreate` (nested writes with existing records)
- JSON path filtering (`path`, `array_contains`, `string_contains`)
- Sequential transactions (`$transaction([promise1, promise2])`)
- `findUniqueOrThrow` / `findFirstOrThrow`
