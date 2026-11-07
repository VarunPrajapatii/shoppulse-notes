# Complete Upgrade & Downgrade Reference Guide

**Date**: November 24, 2025  
**Status**: Complete Implementation Reference  
**Purpose**: Quick reference for upgrade and downgrade flows

---

## Quick Comparison

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partial — mostly accurate but missing details
> - 📝 **REALITY**: Table is correct on API method, schedule_change_at, webhook, min amount, checkout, proration. However: (1) upgrade statuses include COMPLETING (not just ACTIVE), (2) grace period is **5 days** not 14, (3) upgrade execute also sets webhookSyncStatus: 'PENDING' and creates INITIATED history record, (4) UPI/emandate detection is reactive (not pre-checked)
> - 🎯 **ACTION**: Update — add COMPLETING status note, fix grace period reference
> - 💡 **ENHANCEMENT**: Add column for "Allowed Statuses" (ACTIVE, COMPLETING) and "DB Side Effects" (webhookSyncStatus, history records)

| Aspect | Upgrade (Immediate) | Downgrade (Scheduled) |
|--------|-------------------|---------------------|
| **API Method** | `subscriptions.update()` | `subscriptions.update()` |
| **schedule_change_at** | `'now'` (immediate) | `'cycle_end'` (scheduled) |
| **Payment** | Charge difference via invoice | No charge, no refund |
| **Webhook** | `subscription.updated` | `subscription.updated` (at cycle end) |
| **Min. Amount** | ≥ ₹0.50 difference | No minimum |
| **UX Impact** | Instant access to new features | Grace period + cleanup |
| **Risk** | Payment might fail | Usage might exceed limits |
| **Checkout** | No checkout needed | No checkout needed |
| **Proration** | Automatic by Razorpay | N/A (applies at cycle end) |

---

## Upgrade Flow (1.2.7)

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partial — flow is correct but missing several implementation details
> - 📝 **REALITY**: Execute route (~572 lines) also: detects grace period during upgrade (resolves it), sets `webhookSyncStatus: 'PENDING'`, creates INITIATED history entry, detects UPI/emandate errors **reactively** (not pre-checked). Preview route (~184 lines) validates ACTIVE or COMPLETING status. Webhook `updated.ts` (~567 lines) creates Payment with UPGRADE_CHARGE type, resets period metrics, clears grace_period + scheduled_downgrade + pre_downgrade_warnings metadata.
> - 🎯 **ACTION**: Update — add missing details about grace period resolution, webhookSyncStatus, INITIATED history
> - 💡 **ENHANCEMENT**: Document the full execute error handling (UPI, card mandate, gateway errors) and the grace-period-during-upgrade path

### When to Use
- User wants higher-tier plan immediately
- User needs more limits right now
- User willing to pay difference today

### How It Works
```
1. Preview API → Show charge amount
2. User confirms → Execute API
3. Razorpay creates invoice → Charges card
4. If successful → subscription.updated webhook
5. If failed → No update, stay on old plan
6. Update database → Show success
```

### Critical Rules

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partial — status list is outdated
> - 📝 **REALITY**: Upgradeable statuses in code are `['ACTIVE', 'COMPLETING']` (not `authenticated`). The Razorpay-side check allows `authenticated` or `active`, but our DB-side check is ACTIVE/COMPLETING. UPI/emandate detection is **reactive** — the execute route catches Razorpay's BAD_REQUEST_ERROR and checks if description includes 'upi' or 'card mandate' (not pre-validated).
> - 🎯 **ACTION**: Update — change `authenticated` → `ACTIVE` or `COMPLETING`

- ✅ Minimum charge difference: **₹0.50**
- ✅ Only works on `ACTIVE` or `COMPLETING` subscriptions (Razorpay-side also allows `authenticated`)
- ✅ Cannot update UPI/Emandate subscriptions (detected reactively, not pre-checked)
- ✅ Payment failure = automatic rollback
- ✅ Same subscription ID preserved

### Implementation Files

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partial — paths mostly correct but webhook and frontend paths are incomplete/misleading
> - 📝 **REALITY**: Webhook route.ts is a dispatcher; actual upgrade logic is in `handlers/updated.ts` (~567 lines). Frontend is at `src/app/(dashboard)/subscription/components/my-plan/upgrade-dialog.tsx` (~621 lines), not `/components/subscription/`.
> - 🎯 **ACTION**: Update paths to match actual locations

- Preview: `src/app/api/subscription/upgrade/preview/route.ts` (~184 lines) ✅
- Execute: `src/app/api/subscription/upgrade/execute/route.ts` (~572 lines) ✅
- Webhook dispatcher: `src/app/api/webhook/razorpay/subscription/route.ts` ✅
- Webhook handler: `src/app/api/webhook/razorpay/subscription/handlers/updated.ts` (~567 lines) ⚠️ **MISSING FROM DOC**
- Frontend: `src/app/(dashboard)/subscription/components/my-plan/upgrade-dialog.tsx` (~621 lines) ⚠️ **PATH WAS WRONG**

### Documentation
- **1.2.7_CORRECTED_UPGRADE_FINAL_FLOW.md** - Complete implementation guide
- **23B_RAZORPAY_UPDATE_IMMEDIATE_PRORATION.md** - Proration examples

---

## Downgrade Flow (1.2.4)

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partial — flow overview correct but grace period details are **wrong**
> - 📝 **REALITY**: Grace period is **5 days** (not 14). Cron is now `downgrade-lifecycle/route.ts` (~868 lines) with 2 phases: Phase 1 = pre-downgrade warnings (Day -7, -5, -3, -1 emails + Day 0 SMS), Phase 2 = grace period enforcement (daily reminders, 5-day auto-archive via `enforceGracePeriodDeletions()`). Old `enforce-grace-periods/route.ts` still exists (~507 lines) but is **dead code** — NOT in vercel.json.
> - 🎯 **ACTION**: Update — fix grace period from 14→5 days, update cron path, fix reminder schedule
> - 💡 **ENHANCEMENT**: Document the two-phase lifecycle architecture

### When to Use
- User wants cheaper plan
- User reducing business scale
- User doesn't need all features

### How It Works
```
1. Preview API → Check usage vs new limits
2. Show grace period info (if over limits)
3. User confirms → Schedule downgrade
4. Subscription continues on current plan
5. At cycle end → subscription.updated webhook
6. If over limits → Activate 5-day grace period     ← CORRECTED (was 14)
7. After grace → Auto-archive excess resources
```

### Critical Rules

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Outdated — grace period and reminder schedule are wrong
> - 📝 **REALITY**: Grace period is **5 days** (set in updated.ts line ~118: `gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 5)`). Pre-downgrade reminders: Day -7, -5, -3, -1 (emails) + Day 0 (SMS). Grace period reminders: daily emails, final day SMS. Enforcement after 5 days via `enforceGracePeriodDeletions()`.
> - 🎯 **ACTION**: Update all 14→5, fix reminder schedule

- ✅ Always schedule for `cycle_end` (never immediate)
- ✅ No validation blocking (allow scheduling always)
- ✅ Grace period: **5 days** after cycle end (NOT 14) ← CORRECTED
- ✅ User keeps current plan until paid period ends
- ✅ Pre-downgrade email reminders: Day -7, -5, -3, -1 + Day 0 SMS ← CORRECTED
- ✅ Grace period daily reminders + final-day SMS + enforcement-done email
- ✅ Auto-enforcement on **Day 5** (NOT 14) ← CORRECTED

### Grace Period System

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Outdated — timeline is completely wrong
> - 📝 **REALITY**: Grace period is 5 days. Actual flow from `downgrade-lifecycle/route.ts` Phase 2: Day 1-4 = daily reminder emails, Day 5 = final warning email + SMS, After Day 5 = `enforceGracePeriodDeletions()` deletes oldest Products→Categories→Billboards. Also: upgrade during grace period **clears** it (handled in updated.ts).
> - 🎯 **ACTION**: Rewrite entire grace period timeline

```
Cycle End → Check usage vs new limits (in updated.ts webhook)
  ├─> Within limits → Apply downgrade ✅ (send downgradeEmail/SMS)
  └─> Over limits → Activate 5-day grace period (send downgradeGraceEmail/SMS)
      ├─> Day 1-4: Daily reminder emails (graceReminderEmail)
      ├─> Day 5: Final warning email + SMS (graceReminderSMS)
      └─> After Day 5: enforceGracePeriodDeletions() → Products→Categories→Billboards
                        Then send enforcementDoneEmail/SMS
```

**Pre-downgrade warnings** (Phase 1 of downgrade-lifecycle cron — BEFORE cycle end):
```
Day -7: Soft reminder email (preDowngradeReminderEmail)
Day -5: Nudge email
Day -3: Warning email
Day -1: Urgent email
Day  0: Final SMS warning (preDowngradeReminderSMS)
```

### Implementation Files

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Outdated — cron path is wrong, frontend path is wrong, webhook handler missing
> - 📝 **REALITY**: Cron is `downgrade-lifecycle/route.ts` (~868 lines, verified in vercel.json at `0 4 * * *`). Old `enforce-grace-periods/route.ts` (~507 lines) still exists but is **dead code** (NOT in vercel.json). Frontend at `src/app/(dashboard)/subscription/components/my-plan/downgrade-dialog.tsx`. Webhook handler is `handlers/updated.ts`.
> - 🎯 **ACTION**: Update cron path, frontend path, add handler path, note dead code

- Preview: `src/app/api/subscription/downgrade/preview/route.ts` ✅
- Schedule: `src/app/api/subscription/downgrade/schedule/route.ts` ✅
- Cancel: `src/app/api/subscription/downgrade/cancel-scheduled/route.ts` ✅
- Webhook dispatcher: `src/app/api/webhook/razorpay/subscription/route.ts` ✅
- Webhook handler: `src/app/api/webhook/razorpay/subscription/handlers/updated.ts` (~567 lines) ⚠️ **MISSING FROM DOC**
- Cron (ACTIVE): `src/app/api/cron/downgrade-lifecycle/route.ts` (~868 lines, `0 4 * * *`) ⚠️ **PATH WAS WRONG**
- Cron (DEAD CODE): `src/app/api/cron/enforce-grace-periods/route.ts` (~507 lines, NOT in vercel.json) ⚠️ **WAS LISTED AS ACTIVE**
- Frontend: `src/app/(dashboard)/subscription/components/my-plan/downgrade-dialog.tsx` ⚠️ **PATH WAS WRONG**

### Documentation
- **1.2.4_CORRECTED_DOWNGRADE_FINAL_FLOW.md** - Complete implementation guide
- **23_RAZORPAY_UPDATE_SUBSCRIPTION.md** - Official UPDATE API

---

## Razorpay Documentation Reference

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: Matches — reference links appear correct
> - 📝 **REALITY**: These are internal reference doc pointers, not code. No issues found.
> - 🎯 **ACTION**: Keep

### Core Documents
1. **Part 23**: Update Subscription API (base method)
2. **Part 23B**: Immediate Update & Proration Details (NEW!)
3. **Part 31**: Webhook Overview
4. **Part 32**: subscription.authenticated & subscription.activated
5. **Part 18**: Subscription Entity

### Key API Parameters

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: Matches — verified against actual execute route
> - 📝 **REALITY**: Exact match. `execute/route.ts` line ~280 calls `razorpayInstance.subscriptions.update()` with `{ plan_id, schedule_change_at: 'now', customer_notify: true }`. Uses `newPlan.razorpayPlanId` (not our DB plan ID).
> - 🎯 **ACTION**: Keep — add note that plan_id is Razorpay's plan ID, not our DB ID

```typescript
// Upgrade (immediate)
await razorpay.subscriptions.update(subscriptionId, {
  plan_id: newPlanId,              // This is Razorpay's plan_id, not our DB planId
  schedule_change_at: 'now',       // Apply immediately
  customer_notify: true            // Razorpay sends emails
});

// Downgrade (scheduled)
await razorpay.subscriptions.update(subscriptionId, {
  plan_id: newPlanId,
  schedule_change_at: 'cycle_end', // Apply at cycle end
  customer_notify: true
});
```

---

## Webhook Handling

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Outdated — pseudocode is oversimplified and contains wrong grace period duration
> - 📝 **REALITY**: Actual `updated.ts` (~567 lines) is far more complex. Key differences:
>   1. Grace period is **5 days** (not 14 as shown in `addDays(new Date(), 14)`)
>   2. On upgrade: clears grace_period, scheduled_downgrade, pre_downgrade_warnings metadata; resets period metrics via `resetPeriodMetricsOnUpgrade()`; creates Payment record with `UPGRADE_CHARGE` type; creates COMPLETED history entry; resolves active grace period if user upgrades mid-grace
>   3. On downgrade: uses `getOverageSummary()` to check products/categories/billboards; activates `User.usageGracePeriod` flag; stores detailed overage data in `subscription.metadata.grace_period`; sends downgradeGraceEmail/SMS or downgradeEmail/SMS
>   4. Uses `$transaction` for atomicity
>   5. Notification templates: `upgradeEmail/upgradeSMS`, `downgradeEmail/downgradeSMS`, `downgradeGraceEmail/downgradeGraceSMS`
> - 🎯 **ACTION**: Rewrite pseudocode to match actual implementation
> - 💡 **ENHANCEMENT**: Add sections for grace period resolution on upgrade, metadata tracking, and UPGRADE_CHARGE payment creation

### subscription.updated (For Both Upgrade & Downgrade)

```typescript
// SIMPLIFIED — actual handler is ~567 lines in updated.ts
async function handleSubscriptionUpdated(subscription, subscriptionEntity, paymentEntity) {
  const newPlan = await prisma.subscriptionPlan.findFirst({
    where: { razorpayPlanId: subscriptionEntity.plan_id }
  });

  const isUpgrade = Number(newPlan.price) > Number(subscription.plan.price);
  const isDowngrade = Number(newPlan.price) < Number(subscription.plan.price);

  // Uses $transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Update subscription: planId, billing periods, metadata, webhookSyncStatus='SYNCED'
    // Clears: hasScheduledChanges, scheduledPlanId, changeScheduledAt
    // Metadata: clears scheduled_downgrade + pre_downgrade_warnings on both upgrade/downgrade
    // Metadata: clears grace_period on upgrade, sets it on downgrade (if overage)

    if (isUpgrade && hadActiveGracePeriod) {
      // Clear User.usageGracePeriod flag — upgrade resolves grace period
    }
    if (isDowngrade && hasOverage) {
      // Set User.usageGracePeriod = true
      // Set subscription.metadata.grace_period with 5-day window
    }

    // Create history (COMPLETED stage)
    // Create Payment with UPGRADE_CHARGE type (if upgrade + paymentEntity exists)
  });

  // Post-transaction:
  if (isUpgrade) {
    await resetPeriodMetricsOnUpgrade(...);
    notifySeller(upgradeEmail, upgradeSMS);
  } else if (isDowngrade && gracePeriodData) {
    notifySeller(downgradeGraceEmail, downgradeGraceSMS);
  } else {
    notifySeller(downgradeEmail, downgradeSMS);
  }
}
```

---

## Common Pitfalls & Solutions

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: Matches — all pitfalls are valid and reflected in actual code
> - 📝 **REALITY**: Pitfall 1 (webhook-first) is correctly implemented — execute route sets `webhookSyncStatus: 'PENDING'` and lets webhook update planId. Pitfall 2 (non-blocking downgrade) is correctly implemented — preview shows warning but allows scheduling. Pitfall 3 (never immediate downgrade) is correctly implemented — schedule route uses `cycle_end`. Pitfall 4 solution is roughly accurate but the actual code doesn't poll — it relies on webhook + frontend polling.
> - 🎯 **ACTION**: Keep — minor update to Pitfall 2 grace period reference (14→5) and Pitfall 4
> - 💡 **ENHANCEMENT**: Add Pitfall 5: UPI/emandate subscriptions (detected reactively)

### Pitfall 1: Updating Database Before Webhook
❌ **Wrong**:
```typescript
// Execute API
await razorpay.subscriptions.update(subId, { ... });

// Update database immediately
await prisma.subscription.update({ planId: newPlanId }); // DON'T DO THIS!
```

✅ **Correct**:
```typescript
// Execute API
await razorpay.subscriptions.update(subId, { ... });

// Wait for webhook to update database
// Webhook handler updates database only after payment confirmation
```

---

### Pitfall 2: Blocking Downgrade Due to Usage
❌ **Wrong**:
```typescript
if (usage.products > newPlan.maxProducts) {
  throw new Error('Please delete products before downgrading'); // BAD UX!
}
```

✅ **Correct**:
```typescript
if (usage.products > newPlan.maxProducts) {
  // Allow scheduling, show grace period warning
  return {
    canDowngrade: true,
    gracePeriodWarning: `You'll have 5 days after cycle end to reduce to ${newPlan.maxProducts} products`  // ← CORRECTED: 5 days, not 14
  };
}
```

---

### Pitfall 3: Immediate Downgrade (Money Loss)
❌ **Never Do This**:
```typescript
// NEVER downgrade immediately!
await razorpay.subscriptions.update(subId, {
  plan_id: cheaperPlanId,
  schedule_change_at: 'now' // USER LOSES MONEY!
});
```

✅ **Always Use**:
```typescript
// Always schedule at cycle end
await razorpay.subscriptions.update(subId, {
  plan_id: cheaperPlanId,
  schedule_change_at: 'cycle_end' // User keeps current plan until paid period ends
});
```

---

### Pitfall 4: Not Handling Payment Failures
❌ **Wrong**:
```typescript
await razorpay.subscriptions.update(subId, { ... });
// Assume it worked, show success message
```

✅ **Correct**:
```typescript
await razorpay.subscriptions.update(subId, { ... });

// Wait for webhook or poll
await new Promise(r => setTimeout(r, 5000));

const updated = await razorpay.subscriptions.fetch(subId);
if (updated.plan_id !== newPlanId) {
  // Payment failed, notify user
  await notifyUpgradeFailure(userId);
}
```

---

## Testing Checklist

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Outdated — no automated tests exist, checklist items reference wrong grace period
> - 📝 **REALITY**: No `.test.ts` or `.spec.ts` files found in the codebase. These are manual QA checklists only. Several items reference 14-day grace period which should be 5 days.
> - 🎯 **ACTION**: Update grace period references, mark as manual QA only, add missing test scenarios
> - 💡 **ENHANCEMENT**: Add test cases for: COMPLETING status upgrade, grace-period-during-upgrade resolution, UPI/emandate error path, webhookSyncStatus transitions, pre-downgrade warning cron

### Upgrade Testing
- [ ] Preview shows correct charge amount
- [ ] Minimum ₹0.50 difference validated
- [ ] Charge amount matches proration formula
- [ ] Payment success → webhook fires → database updated
- [ ] Payment failure → no webhook → stays on old plan
- [ ] User notification sent on success
- [ ] Error handling for card declined
- [ ] New limits available immediately
- [ ] **MISSING**: COMPLETING status upgrade works
- [ ] **MISSING**: Upgrade during active grace period resolves it
- [ ] **MISSING**: UPI/emandate error returns PAYMENT_METHOD_NOT_SUPPORTED
- [ ] **MISSING**: webhookSyncStatus transitions PENDING → SYNCED
- [ ] **MISSING**: INITIATED history created by execute, COMPLETED by webhook

### Downgrade Testing
- [ ] Usage check doesn't block scheduling
- [ ] Scheduled change tracked in database
- [ ] User can cancel scheduled change (cancel_scheduled_changes API)
- [ ] At cycle end → webhook fires
- [ ] Within limits → downgrade applied (downgradeEmail/SMS sent)
- [ ] Over limits → 5-day grace period activated (downgradeGraceEmail/SMS sent) ← CORRECTED
- [ ] Pre-downgrade emails sent (Day -7, -5, -3, -1) + Day 0 SMS ← CORRECTED
- [ ] Grace period daily reminder emails + final-day SMS ← CORRECTED
- [ ] Day 5 → `enforceGracePeriodDeletions()` auto-archives excess (Products→Categories→Billboards) ← CORRECTED
- [ ] enforcementDoneEmail/SMS sent after enforcement ← ADDED
- [ ] User can manually select which to keep
- [ ] **MISSING**: Pre-downgrade warning cron (Phase 1 of downgrade-lifecycle)
- [ ] **MISSING**: Upgrade during grace period clears it

---

## Deployment Checklist

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partial — cron schedule is wrong, missing specific env vars
> - 📝 **REALITY**: vercel.json shows `downgrade-lifecycle` at `0 4 * * *` (4 AM UTC, not midnight). `enforce-grace-periods` is NOT in vercel.json (dead code). Env vars needed: `CRON_SECRET` (verified in downgrade-lifecycle auth check), Razorpay keys, Clerk keys. Notification templates verified: upgradeSMS/upgradeEmail, downgradeSMS/downgradeEmail, downgradeGraceSMS/downgradeGraceEmail, preDowngradeReminderSMS/preDowngradeReminderEmail, graceReminderSMS/graceReminderEmail, enforcementDoneSMS/enforcementDoneEmail.
> - 🎯 **ACTION**: Update cron schedule, add specific env vars, note dead code cleanup

### Backend
- [x] All API endpoints implemented (upgrade preview/execute, downgrade preview/schedule/cancel-scheduled)
- [x] Webhook handler updated (`handlers/updated.ts` — handles both upgrade + downgrade)
- [x] Grace period cron job configured (`downgrade-lifecycle` at `0 4 * * *` in vercel.json)
- [x] Email templates created (10 templates: upgrade/downgrade/grace/preDowngrade/enforcement × email+SMS)
- [ ] Database migrations run
- [ ] Environment variables set (`CRON_SECRET`, Razorpay keys, notification service keys)
- ⚠️ **TODO**: Delete dead code `enforce-grace-periods/route.ts` (NOT in vercel.json)

### Frontend
- [x] Upgrade dialog with preview (`upgrade-dialog.tsx` ~621 lines, includes nested Payment Failure Dialog)
- [x] Downgrade dialog with grace period warning (`downgrade-dialog.tsx`)
- [ ] Loading states and error handling
- [ ] Success/failure notifications
- [ ] Grace period UI indicators
- [ ] Manual resource selection for cleanup

### Infrastructure
- [ ] Webhook URL configured on Razorpay
- [ ] Webhook signature verification working
- [x] Cron job scheduled: `downgrade-lifecycle` at **0 4 * * * (4 AM UTC)** ← CORRECTED (was "midnight")
- [ ] Email service configured
- [ ] Monitoring and logging enabled (logger used throughout all routes)

---

## Quick Reference Links

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: Matches — links are relative and appear valid
> - 🎯 **ACTION**: Keep

### Implementation Guides
- [1.2.7 - Upgrade Flow](./1.2.7_CORRECTED_UPGRADE_FINAL_FLOW.md)
- [1.2.4 - Downgrade Flow](./1.2.4_CORRECTED_DOWNGRADE_FINAL_FLOW.md)

### Razorpay Docs
- [Part 23 - Update API](./razorpay_official/23_RAZORPAY_UPDATE_SUBSCRIPTION.md)
- [Part 23B - Proration Details](./razorpay_official/23B_RAZORPAY_UPDATE_IMMEDIATE_PRORATION.md)
- [Part 31 - Webhooks](./razorpay_official/31_RAZORPAY_WEBHOOKS_OVERVIEW.md)

### Additional Resources
- [Grace Period System](./1.2.4_CORRECTED_DOWNGRADE_FINAL_FLOW.md#grace-period-implementation)
- [Proration Examples](./razorpay_official/23B_RAZORPAY_UPDATE_IMMEDIATE_PRORATION.md#detailed-examples)

---

**Last Updated**: November 24, 2025  
**Last Audited**: February 18, 2026  
**Maintainer**: ShopPulse Team  
**Status**: ⚠️ Needs Update — Grace period (14→5 days), cron paths, file paths, webhook pseudocode are outdated

---

## Audit Summary

| Section | Status | Key Issue |
|---------|--------|-----------|
| Quick Comparison | 🟡 Partial | Missing COMPLETING status, grace period wrong |
| Upgrade Flow | 🟡 Partial | Missing webhookSyncStatus, INITIATED history, grace-period-during-upgrade |
| Upgrade Critical Rules | 🟡 Partial | Status list wrong (`authenticated` → `ACTIVE`/`COMPLETING`) |
| Upgrade Files | 🟡 Partial | Frontend path wrong, webhook handler missing |
| Downgrade Flow | 🟡 Partial | Grace period 14→5, cron path wrong |
| Downgrade Critical Rules | 🔴 Outdated | Grace period 14→5, reminder schedule completely wrong |
| Downgrade Grace Period | 🔴 Outdated | Entire timeline wrong — 14→5 days, different reminder patterns |
| Downgrade Files | 🔴 Outdated | Cron path wrong, dead code listed as active |
| Razorpay Docs | 🟢 Matches | OK |
| API Parameters | 🟢 Matches | Verified against code |
| Webhook Handling | 🔴 Outdated | Oversimplified, wrong grace period, missing UPGRADE_CHARGE/metrics reset |
| Pitfalls | 🟢 Matches | Minor: grace period ref wrong in Pitfall 2 |
| Testing Checklist | 🔴 Outdated | No tests exist, wrong grace period, missing scenarios |
| Deployment Checklist | 🟡 Partial | Cron schedule wrong, dead code not noted |
| Reference Links | 🟢 Matches | OK |
