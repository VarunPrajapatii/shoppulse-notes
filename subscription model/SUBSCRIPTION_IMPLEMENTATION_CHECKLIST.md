# 📋 Subscription Implementation Checklist

> ## 📊 OVERALL AUDIT SUMMARY (2026-02-18)
>
> | Phase | Status | Completion |
> |-------|--------|------------|
> | **Phase 3**: Clerk Integration | 🟢 Done | 100% |
> | **Phase 4**: Subscription API | 🟡 Partial | 85% — missing reactivate endpoint, isFeatureEnabled |
> | **Phase 5**: Razorpay Integration | 🟡 Partial | 90% — no payment.* events (by design), no automated tests |
> | **Phase 6**: Access Control | 🟡 Partial | 75% — layout-based (not middleware), no trial countdown |
> | **Phase 7**: Cron Jobs | 🟡 Partial | 70% — redesigned for Razorpay, no reconcile job |
> | **Phase 8**: Email Notifications | 🟢 Done | 95% — exceeds scope, only missing renewal reminder |
> | **Phase 9**: UI Pages | 🟡 Partial | 90% — no trial countdown, no account/billing tab |
> | **Phase 10**: Testing | 🔴 Minimal | 30% — manual only, no automated tests |
> | **Phase 11**: Monitoring | 🔴 Minimal | 20% — Winston only, no Sentry/metrics/alerts |
> | **Phase 12**: Documentation | 🟡 Partial | 50% — great internal docs, no API/user docs |
> | **Phase 13**: Production Readiness | 🟡 Partial | 40% — security OK, no compliance/rate-limiting |
> | **Phase 14**: Launch | 🔴 Not started | 0% |
>
> **🚨 MUST-HAVE BEFORE LAUNCH:**
> 1. Sentry or error tracking (Phase 11)
> 2. Basic automated tests for critical payment paths (Phase 10)
> 3. Compliance: Privacy policy, ToS, billing/refund policy (Phase 12 + 13)
> 4. Rate limiting on payment endpoints (Phase 13)
> 5. Switch to live Razorpay keys + test (Phase 14)
>
> **✨ NICE-TO-HAVE:**
> - Reactivate endpoint, trial countdown banner, Redis subscription cache
> - Metrics dashboard, reconcile-payments cron, load testing
> - API docs (Swagger), invoice downloads



## Phase 3: Clerk Integration

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: Done
> - 📝 **REALITY**: Clerk webhook at `src/app/api/webhook/clerk/route.ts` (handles user.created, user.updated, user.deleted). Onboarding at `src/app/(dashboard)/onboarding/` creates Store + Trial subscription.
> - ❓ **GAPS**: Webhook route is `/api/webhook/clerk` not `/api/webhooks/clerk` — cosmetic naming difference only.
> - 🎯 **ACTION**: Mark done
> - 💡 **PRIORITY**: Complete ✅

### 3.1: User Sync (Webhooks)
- [x] Create webhook endpoint: `/api/webhook/clerk` *(actual path differs from original checklist)*
- [x] Handle events:
  - [x] `user.created` → Create User record
  - [x] `user.updated` → Update email/name
  - [x] `user.deleted` → Mark as deleted, cancel subscription
- [x] Verify webhook signature
- [x] Test with Clerk webhook testing tool

### 3.2: Onboarding Flow
- [x] Create onboarding page: `/dashboard/onboarding`
- [x] Collect store name
- [x] API endpoint: `/api/onboarding/complete`
  - [x] Create Store
  - [x] Create Subscription with TRIAL plan
  - [x] Create SubscriptionHistory record
  - [x] Mark onboardingComplete: true (only when the user sees all the steps and checks acknowledgement)
- [x] Send welcome email
- [x] Redirect to dashboard

---

## Phase 4: Subscription Management API

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partial (85% done)
> - 📝 **REALITY**: `subscription/current/route.ts` (GET status), `subscription/plans/page.tsx` (server component), `subscription/create/route.ts` (create order), `subscription/verify/route.ts` (verify), `subscription/cancel/route.ts` (cancel), `subscription/upgrade/execute/route.ts` (upgrade), `subscription/downgrade/schedule/route.ts` (downgrade). Helpers: `usage-service.ts` has `getUserPlanLimits`, `getOverageSummary`.
> - ❓ **GAPS**: (1) Reactivate endpoint NOT implemented. (2) `calculateProration` exists but display-only, not used for actual billing. (3) `isFeatureEnabled` is NOT a standalone function.
> - 🎯 **ACTION**: Reactivate → add if needed pre-launch. Proration & isFeatureEnabled → mark as design decisions, not blockers.
> - 💡 **PRIORITY**: Reactivate = nice-to-have (users can re-subscribe instead). Others = not needed as standalone.

### 4.1: Core Endpoints
- [x] `/api/subscription/current` - Get current subscription *(was `/status` in checklist)*
- [x] `/api/subscription/plans` - List available plans *(server component, not API route)*
- [x] `/api/subscription/create` - Create Razorpay order *(was `/create-order`)*
- [x] `/api/subscription/verify` - Verify payment *(was `/verify-payment`)*
- [x] `/api/subscription/upgrade/execute` + `/api/subscription/downgrade/schedule` - Change plan *(split into two routes)*
- [x] `/api/subscription/cancel` - Cancel subscription
- [ ] `/api/subscription/reactivate` - Undo cancellation ❌ **NOT IMPLEMENTED**

### 4.2: Helper Functions
- [x] `getUserPlanLimits()` / `getOverageSummary()` in `usage-service.ts` *(replaces getSubscriptionStatus/hasActiveSubscription)*
- [x] `calculateProration(currentPlan, newPlan, daysRemaining)` - ⚠️ Display-only, not used for actual billing
- [ ] `isFeatureEnabled(userId, feature)` - ❌ **NOT a standalone function** (access checked inline)

---

## Phase 5: Razorpay Integration

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partial (90% done)
> - 📝 **REALITY**: SDK installed, `lib/razorpay.ts` configured with test keys. Webhook handles 9 subscription events: `subscription.authenticated`, `.charged`, `.pending`, `.halted`, `.cancelled`, `.completed`, `.paused`, `.resumed`, `.updated`. Signature verification implemented.
> - ❓ **GAPS**: (1) `payment.captured`, `payment.failed`, `payment.dispute.created` are NOT handled as separate events (Razorpay subscription events cover these scenarios). (2) No automated tests — manual testing only.
> - 🎯 **ACTION**: Payment events → not needed (subscription events suffice for subscription-based billing). Automated tests → nice-to-have.
> - 💡 **PRIORITY**: Payment event handlers = not needed. Automated tests = nice-to-have.

### 5.1: Setup
- [x] Sign up for Razorpay account
- [x] Get test API keys (key_id, key_secret)
- [x] Add to environment variables:
  ```
  RAZORPAY_KEY_ID=rzp_test_xxx
  RAZORPAY_KEY_SECRET=xxx
  RAZORPAY_WEBHOOK_SECRET=xxx
  ```
- [x] Install Razorpay SDK: `npm install razorpay`

### 5.2: Payment Flow
- [x] Create Razorpay order on backend
- [x] Load Razorpay checkout on frontend
- [x] Handle payment success callback
- [x] Verify payment signature
- [x] Create webhook endpoint *(at `/api/webhook/razorpay`, not `/api/webhooks/razorpay`)*
- [x] Handle webhook events:
  - [ ] `payment.captured` → Activate subscription ❌ **NOT separate event** (handled via `subscription.charged`)
  - [ ] `payment.failed` → Mark payment as failed ❌ **NOT separate event** (handled via `subscription.halted`/`.pending`)
  - [ ] `payment.dispute.created` → Pause subscription ❌ **NOT handled**
  - [x] `subscription.authenticated` → Subscription authenticated
  - [x] `subscription.charged` → Payment processed
  - [x] `subscription.pending` → Payment pending
  - [x] `subscription.halted` → Payment halted
  - [x] `subscription.cancelled` → Subscription cancelled
  - [x] `subscription.completed` → Subscription completed
  - [x] `subscription.paused` → Subscription paused
  - [x] `subscription.resumed` → Subscription resumed
  - [x] `subscription.updated` → Subscription updated
- [x] Verify webhook signature

### 5.3: Testing
- [x] Test with test cards (Razorpay provides) *(manual only)*
- [x] Test success flow *(manual)*
- [x] Test failure flow *(manual)*
- [ ] Test webhook reliability ❌ **No automated tests**

---

## Phase 6: Access Control (Middleware)

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partial (design differs from checklist)
> - 📝 **REALITY**: `isActive` flag on User, `isAccessible` flag on Store. Middleware uses Clerk for auth (Edge Runtime — no Prisma access). Subscription checks happen in **layout components**, not middleware. Dashboard allows CANCELED access during remaining period. Banners for status, autopay info implemented.
> - ❓ **GAPS**: (1) Middleware does NOT check subscription status (Edge Runtime limitation, no Prisma). (2) No separate "limited access" / read-only mode for PAST_DUE (Razorpay handles retries). (3) No trial countdown banner specifically.
> - 🎯 **ACTION**: Middleware subscription check → architectural decision (layout-level checks are the working alternative). PAST_DUE read-only → not needed (Razorpay retry handles this). Trial countdown → nice-to-have.
> - 💡 **PRIORITY**: Current layout-based approach is acceptable. Trial countdown banner = nice-to-have.

### 6.1: Middleware Logic
- [x] Create middleware: `src/middleware.ts` *(Clerk-based auth only)*
- [ ] Check subscription status for protected routes ❌ **NOT in middleware** (Edge Runtime, no Prisma — done in layout components instead)
- [ ] Route logic:
  - [x] TRIALING/ACTIVE → Full access *(via layout components)*
  - [ ] PAST_DUE → Limited access (read-only) ❌ **No separate mode** (Razorpay handles retries)
  - [x] EXPIRED/CANCELED → Redirect to /subscribe *(CANCELED gets access during remaining period)*
- [x] Protect API routes as well *(via Clerk middleware)*

### 6.2: Protected Routes
- [x] `/dashboard/*` - Requires active subscription *(checked in layout)*
- [x] `/api/products/*` - Requires active subscription *(checked in layout/route handlers)*
- [x] `/api/orders/*` - Requires active subscription *(checked in layout/route handlers)*
- [x] Allow access:
  - [x] `/subscribe` - Always accessible
  - [x] `/account/*` - Always accessible

### 6.3: UI Banners
- [ ] Trial banner (days remaining) ❌ **No specific trial countdown banner**
- [x] PAST_DUE banner (payment failed) *(general status banners)*
- [x] Cancellation scheduled banner *(via dashboard status heading + banners)*

---

## Phase 7: Cron Jobs (Automation)

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partial (redesigned to fit Razorpay subscription model)
> - 📝 **REALITY**: 3 cron jobs implemented: `expire-trials-detect-payment-failure` (combines check-trials + payment detection), `expire-period-ended-subscriptions` (finalize-cancellations equivalent), `downgrade-lifecycle` (replaces enforce-grace-periods). All secured with `CRON_SECRET` header verification.
> - ❓ **GAPS**: (1) No `check-renewals` cron — Razorpay auto-charges. (2) No `process-renewals` cron — Razorpay auto-charges. (3) No `reconcile-payments` cron. (4) No rate limiting on cron endpoints.
> - 🎯 **ACTION**: check-renewals & process-renewals → delete (not needed, Razorpay handles). reconcile-payments → nice-to-have for edge cases. Rate limiting → nice-to-have.
> - 💡 **PRIORITY**: reconcile-payments = nice-to-have post-launch. Others = not needed.

### 7.1: Setup Cron System
- [x] Choose cron solution:
  - [x] Vercel Cron (if on Vercel)
  - [ ] Node-cron (self-hosted)
  - [ ] External service
- [x] Add cron configuration

### 7.2: Create Cron Jobs
- [x] `/api/cron/expire-trials-detect-payment-failure` - Expire trials + detect payment failures *(replaces `check-trials`)*
- [ ] `/api/cron/check-renewals` - Send renewal reminders ❌ **NOT NEEDED** (Razorpay auto-charges)
- [ ] `/api/cron/process-renewals` - Create renewal orders ❌ **NOT NEEDED** (Razorpay auto-charges)
- [x] `/api/cron/expire-period-ended-subscriptions` - Expire after period ends *(replaces `expire-past-due`)*
- [x] `/api/cron/downgrade-lifecycle` - Handle downgrades *(replaces `finalize-cancellations` + `enforce-grace-periods`)*
- [ ] `/api/cron/reconcile-payments` - Fix missed webhooks ❌ **NOT IMPLEMENTED**

### 7.3: Cron Security
- [x] Add cron secret to verify requests (`CRON_SECRET` header verification)
- [ ] Rate limit cron endpoints ❌ **NOT IMPLEMENTED**
- [x] Log all cron executions

---

## Phase 8: Email Notifications

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: Done (exceeds original scope)
> - 📝 **REALITY**: Resend for email (NOT SendGrid). Fast2SMS for SMS. 17+ template pairs in `templates.ts`. Covers: welcome, trial expired, payment failure, authenticated, charged, upgrade, downgrade, grace period, enforcement, cancelled, completed, paused, resumed, pre-downgrade reminders, order limits.
> - ❓ **GAPS**: No renewal reminder email — Razorpay sends its own renewal reminders.
> - 🎯 **ACTION**: Mark done. Renewal reminder → not needed (Razorpay handles).
> - 💡 **PRIORITY**: Complete ✅

### 8.1: Setup Email Service
- [x] Choose provider:
  - [x] Resend (recommended, free tier) ✅
  - [ ] ~~SendGrid~~ *(not used)*
  - [ ] ~~AWS SES~~ *(not used)*
- [x] Get API key
- [x] Add to environment variables
- [x] **BONUS**: Fast2SMS for SMS notifications

### 8.2: Email Templates
- [x] Welcome email (trial started)
- [x] Trial ending reminder (3 days before)
- [x] Trial expired
- [x] Payment successful (subscription.charged)
- [x] Payment failed
- [ ] Renewal reminder (3 days before) ❌ **Not implemented** (Razorpay sends its own)
- [x] Subscription canceled
- [x] Subscription expired
- [x] **BONUS**: upgrade, downgrade, grace period, enforcement, paused, resumed, pre-downgrade reminders, order limits

### 8.3: Implementation
- [x] Create email service: `lib/email-service.ts`
- [x] Create email templates in `templates.ts` (17+ template pairs)
- [x] Test all email flows *(manual testing)*

---

## Phase 9: User-Facing Pages

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partial (90% done, structure differs from checklist)
> - 📝 **REALITY**: Plans page at `subscription/plans/page.tsx` + `plans-grid.tsx` + `plan-card.tsx`. My Plan at `subscription/my-plan/page.tsx`. Payment History at `subscription/payment-history/page.tsx`. Dashboard has banners, status heading, autopay info. Upgrade dialog, downgrade dialog, cancel button, resume button all implemented.
> - ❓ **GAPS**: (1) No trial countdown banner specifically. (2) No `/account/billing` or subscription tab in account settings.
> - 🎯 **ACTION**: Trial countdown → nice-to-have. Account billing tab → not needed (covered by `subscription/payment-history`).
> - 💡 **PRIORITY**: Trial countdown = nice-to-have. Account/billing = not needed (already have payment-history page).

### 9.1: Subscription Pages
- [x] `/subscribe` - Pricing page with payment *(at `subscription/plans/page.tsx` + `plans-grid.tsx` + `plan-card.tsx`)*
  - [x] Show plans (Monthly/Yearly)
  - [x] Razorpay checkout integration
  - [x] Loading states
  - [x] Error handling
- [x] `/subscription/my-plan` - Manage subscription *(was `/account/subscription`)*
  - [x] Current plan display
  - [x] Next billing date
  - [x] Payment history *(separate page: `subscription/payment-history`)*
  - [x] Cancel button
  - [x] Change plan button (upgrade dialog + downgrade dialog)
- [ ] `/account/billing` - Payment history ❌ **No separate account/billing tab** (covered by `subscription/payment-history/page.tsx`)
  - [x] List all payments *(in payment-history page)*
  - [ ] Download invoices (if implemented) ❌ **NOT IMPLEMENTED**

### 9.2: Dashboard Updates
- [x] Add subscription banner *(status banners, autopay info)*
- [ ] Trial countdown ❌ **No specific trial countdown banner**
- [x] Payment failed warning *(via dashboard banners)*
- [x] Cancellation notice *(via dashboard status heading)*

---

## Phase 10: Testing

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Minimal (manual only, no automated tests)
> - 📝 **REALITY**: Manual testing done during development. No automated test suite exists.
> - ❓ **GAPS**: No unit tests, no integration tests, no E2E tests, no load tests.
> - 🎯 **ACTION**: Keep as TODO. Add critical path tests before launch at minimum.
> - 💡 **PRIORITY**: Basic happy-path tests = must-have before launch. Full E2E = nice-to-have. Load testing = nice-to-have.

### 10.1: Manual Testing
- [x] Test complete signup flow
- [x] Test trial → expired → subscribe flow
- [x] Test payment success
- [x] Test payment failure
- [x] Test renewal (mock by changing dates)
- [x] Test cancellation (immediate)
- [x] Test cancellation (at period end)
- [x] Test plan changes
- [x] Test access control (different statuses)

### 10.2: Edge Case Testing
- [ ] Duplicate webhooks
- [ ] Webhook arrives before frontend callback
- [ ] Multiple browser tabs
- [ ] Trial abuse (same email)
- [ ] Network timeout during payment
- [ ] Cron job failures
- [ ] User deletes Clerk account
- [ ] Email changes

> ⚠️ *Edge case testing done informally during development but no systematic verification.*

### 10.3: Load Testing (Optional)
- [ ] Simulate many concurrent payments ❌ **NOT DONE**
- [ ] Test webhook handling under load ❌ **NOT DONE**

---

## Phase 11: Monitoring & Logging

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Minimal (logging only, no monitoring infrastructure)
> - 📝 **REALITY**: Winston logger configured and used throughout. No Sentry. No metrics dashboard. No alerts configured.
> - ❓ **GAPS**: (1) No Sentry or error tracking service. (2) No metrics dashboard (MRR, churn, etc.). (3) No alerts beyond cron failure awareness.
> - 🎯 **ACTION**: Keep as TODO. Sentry + basic alerts = must-have before launch.
> - 💡 **PRIORITY**: Sentry = must-have before launch. Metrics dashboard = nice-to-have post-launch. Alerts = must-have before launch.

### 11.1: Error Tracking
- [ ] Set up Sentry (or similar) ❌ **NOT DONE**
- [x] Log all errors with context *(Winston logger)*
- [ ] Create error log table in database ❌ **NOT DONE**

### 11.2: Metrics Dashboard
- [ ] Track key metrics:
  - [ ] Active subscriptions ❌
  - [ ] Trial conversion rate ❌
  - [ ] Churn rate ❌
  - [ ] MRR (Monthly Recurring Revenue) ❌
  - [ ] Payment success rate ❌
- [ ] Create admin dashboard for metrics ❌ **NOT DONE**

### 11.3: Alerts
- [ ] Alert if cron job fails ❌ **NOT CONFIGURED** *(awareness exists but no automated alerting)*
- [ ] Alert if payment success rate drops ❌ **NOT DONE**
- [ ] Alert if webhook signature verification fails ❌ **NOT DONE**

---

## Phase 12: Documentation

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partial (internal docs excellent, external docs missing)
> - 📝 **REALITY**: 30+ markdown files in `notes/` covering architecture, flows, implementation details. No API documentation (Swagger/OpenAPI). No user-facing docs.
> - ❓ **GAPS**: (1) No Swagger/OpenAPI API docs. (2) No user-facing FAQ, billing policy, or refund policy.
> - 🎯 **ACTION**: API docs → nice-to-have. User-facing docs (billing/refund policy, ToS) → must-have before launch.
> - 💡 **PRIORITY**: Billing/refund policy + ToS = must-have (legal requirement). API docs = nice-to-have.

### 12.1: Developer Docs
- [ ] API documentation ❌ **No Swagger/OpenAPI**
- [x] Database schema documentation *(extensive markdown notes)*
- [x] Webhook documentation *(in notes/)*
- [x] Cron job documentation *(in notes/)*

### 12.2: User Docs
- [ ] FAQ page ❌ **NOT DONE**
- [ ] Billing policy ❌ **NOT DONE**
- [ ] Refund policy ❌ **NOT DONE**
- [ ] Terms of service updates ❌ **NOT DONE**

---

## Phase 13: Production Readiness

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partial (security basics done, compliance and performance gaps)
> - 📝 **REALITY**: Webhook signature verification ✅. DB indexes on subscription fields ✅. Prisma handles SQL injection. Auth via Clerk.
> - ❓ **GAPS**: (1) No Redis cache for subscription data (only API calls cached elsewhere). (2) No load testing. (3) No compliance audit (privacy policy, ToS, GST). (4) No rate limiting on payment endpoints.
> - 🎯 **ACTION**: Compliance (privacy policy, ToS) → must-have. Redis caching → nice-to-have (optimize later). Rate limiting → should-have. Load testing → nice-to-have.
> - 💡 **PRIORITY**: Compliance = must-have before launch. Rate limiting = should-have. Redis + load testing = nice-to-have.

### 13.1: Security Audit
- [x] Review all API endpoints
- [x] Check authentication on all routes *(Clerk middleware)*
- [x] Verify webhook signature verification
- [x] Test SQL injection prevention (Prisma handles this)
- [x] Test XSS prevention
- [ ] Rate limiting on payment endpoints ❌ **NOT IMPLEMENTED**

### 13.2: Performance Optimization
- [x] Add database indexes (already in schema)
- [x] Optimize subscription status queries
- [ ] Cache subscription data in Redis (optional) ❌ **NOT DONE** (Redis used for other API caching, not subscription data)

### 13.3: Compliance
- [ ] Privacy policy update (data retention) ❌ **NOT DONE**
- [ ] Terms of service (subscription terms) ❌ **NOT DONE**
- [ ] GST compliance (if applicable) ❌ **NOT DONE**
- [ ] Invoice generation (if required) ❌ **NOT DONE**

---

## Phase 14: Launch

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Not done
> - 📝 **REALITY**: Not launched yet. No staging environment. No monitoring dashboards.
> - ❓ **GAPS**: All items in this phase are pending.
> - 🎯 **ACTION**: Keep as TODO. This is the final phase.
> - 💡 **PRIORITY**: All items = must-have for launch.

### 14.1: Pre-Launch
- [ ] Switch to Razorpay live keys
- [ ] Test one live payment (small amount)
- [ ] Verify webhook works in production
- [ ] Test cron jobs in production

### 14.2: Launch Day
- [ ] Monitor payment flow
- [ ] Monitor error logs
- [ ] Be ready for customer support

### 14.3: Post-Launch
- [ ] Collect user feedback
- [ ] Monitor conversion rates
- [ ] Iterate on pricing/plans if needed

---

## Optional Enhancements

### Future Features
- [ ] Coupon/discount codes
- [ ] Referral program (give trial extensions)
- [ ] Annual receipts for tax purposes
- [ ] Multi-currency support
- [ ] Team/collaboration features (multiple users per store)
- [ ] Usage-based billing (if you add API access)
- [ ] Self-service refunds (partial refunds)
- [ ] Subscription pause (vacation mode)
- [ ] Add-ons (extra storage, products, etc.)

---

## Decision Log

Track important decisions made during implementation:

| Date | Decision | Reason | Status |
|------|----------|--------|--------|
| - | Use Clerk for auth | Speed, security, less maintenance | ✅ Confirmed |
| - | Single schema file | Prisma limitation, industry standard | ✅ Confirmed |
| - | Manual renewal orders | More control than Razorpay subscriptions | 🤔 Pending |
| - | 14-day grace period | Industry standard for failed payments | 🤔 Pending |
| - | Trial: 7 days | As per requirements | ✅ Confirmed |
| - | Plans: Monthly/Yearly | Simple 2-tier model | ✅ Confirmed |
| - | Invoice model | Add now or later? | 🤔 Pending |
| - | Multi-store support | Remove @unique constraint? | 🤔 Pending |

> **📊 AUDIT DECISIONS (2026-02-18):**
>
> | Decision | Outcome |
> |----------|---------|
> | Subscription checks in middleware vs layout | **Layout components** — Edge Runtime blocks Prisma in middleware |
> | payment.captured/failed events | **Not needed** — `subscription.*` events cover these for subscription billing |
> | Reactivate endpoint | **Deferred** — users can re-subscribe instead |
> | Resend vs SendGrid | **Resend chosen** + Fast2SMS for SMS |
> | Renewal crons | **Not needed** — Razorpay auto-charges |
> | PAST_DUE read-only mode | **Not needed** — Razorpay handles retries |

---

## Resources

### Documentation Links
- Clerk: https://clerk.com/docs
- Razorpay: https://razorpay.com/docs/
- Prisma: https://www.prisma.io/docs
- Vercel Cron: https://vercel.com/docs/cron-jobs

### Code Examples
- Razorpay Checkout: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
- Clerk Webhooks: https://clerk.com/docs/integrations/webhooks
- Prisma Transactions: https://www.prisma.io/docs/concepts/components/prisma-client/transactions

### Tools
- Webhook Testing: https://webhook.site/
- Razorpay Test Cards: https://razorpay.com/docs/payments/payments/test-card-details/
- Email Testing: https://mailtrap.io/

---

## Notes

Add implementation notes, gotchas, or learnings here as you build:

```
- [Date] Note about specific challenge or solution
- [Date] Performance optimization discovered
- [Date] Bug fix or edge case handled
```
