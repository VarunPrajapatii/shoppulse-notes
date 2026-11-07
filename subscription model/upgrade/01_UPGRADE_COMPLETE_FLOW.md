# Upgrade Flow — Complete Guide

How plan upgrades work end-to-end in ShopPulse, from user click to database confirmation.

---

## How It Works (Summary)

```
User clicks "Upgrade" on /subscription/plans
  → Preview API calculates proration (display only)
  → User confirms in dialog
  → Execute API calls razorpay.subscriptions.update()
  → Razorpay creates invoice, charges saved payment method
  → If payment succeeds → subscription.updated webhook fires → DB updated
  → If payment fails → No webhook, subscription stays on old plan (auto-rollback)
```

**Key method**: `razorpay.subscriptions.update()` with `schedule_change_at: 'now'`. Same subscription ID throughout — no checkout page, no manual cancellation.

---

## Critical Rules

### Rule 1: Update Creates an Invoice, Not a Regular Charge
Razorpay creates an **invoice** for the prorated difference, charges it against the saved payment method. This is NOT a regular billing cycle charge.

### Rule 2: Only `subscription.updated` Webhook Fires
Unlike regular billing (which triggers `subscription.charged`), an immediate upgrade only fires `subscription.updated`. Our webhook handler listens for this specific event.

### Rule 3: Payment Failure = Silent Rollback
If the charge fails (insufficient funds, card declined, etc.):
- **No webhook fires at all** — Razorpay silently rolls back to old plan
- The `subscriptions.update()` API still returns 200 OK
- Detection requires our polling + fallback mechanism (see below)

---

## The 4 Endpoints

### 1. POST /api/subscription/upgrade/preview
**File**: `src/app/api/subscription/upgrade/preview/route.ts` (169L)

Calculates proration for display. Validates ACTIVE status, checks new plan costs more, enforces ₹0.50 minimum charge. Returns credit, expected charge, days remaining. **Display-only** — Razorpay calculates actual proration independently.

### 2. POST /api/subscription/upgrade/execute
**File**: `src/app/api/subscription/upgrade/execute/route.ts` (524L)

- Validates subscription is ACTIVE or COMPLETING
- Calls `razorpayInstance.subscriptions.update()` with `plan_id` + `schedule_change_at: 'now'` + `customer_notify: true`
- Sets `webhookSyncStatus: 'PENDING'`, `lastApiUpdateAt: new Date()`
- Stores `pendingUpgrade` metadata (targetPlanId, Razorpay response)
- Creates SubscriptionHistory entry (action: UPGRADED, stage: INITIATED)
- Detects UPI/emandate errors reactively → returns `requiresCancelFlow: true` for non-card payment methods

### 3. GET /api/subscription/upgrade/status
**File**: `src/app/api/subscription/upgrade/status/route.ts`

Lightweight polling endpoint. Query param: `targetPlanId`. Returns `{ status: 'SYNCED' | 'PENDING', planId, planMatches }`. Called every 2.5s by the dialog (max 8 polls = 20 seconds).

### 4. POST /api/subscription/upgrade/razorpay-update-confirm-fallback
**File**: `src/app/api/subscription/upgrade/razorpay-update-confirm-fallback/route.ts`

Safety net when webhook doesn't arrive within 20s:
- Early return if already SYNCED (webhook arrived between timeout and this call)
- Rejects if not PENDING (nothing to confirm)
- Fetches subscription directly from Razorpay API → compares `plan_id`
- If match → calls `applySubscriptionPlanChange('fallback_fetch')` → SYNCED
- If no match → sets `webhookSyncStatus: 'SYNC_FAILED'` → error returned

### Webhook: subscription.updated
**File**: `src/app/api/webhook/razorpay/subscription/handlers/updated.ts` (505L)

Primary confirmation path. Idempotency guard: if `webhookSyncStatus === 'SYNCED'` → skip (fallback may have run first). Calls `applySubscriptionPlanChange('webhook')`.

---

## Shared Function: applySubscriptionPlanChange()

**File**: `src/lib/subscription/apply-plan-change.ts`

Both webhook and fallback call this **single idempotent function**. Whichever arrives first wins; the other no-ops.

**Idempotency**: If `webhookSyncStatus === 'SYNCED'` → returns `{ success: true, alreadySynced: true }`.

What it does:
1. Looks up new plan by `razorpayPlanId`
2. Detects upgrade vs downgrade (price comparison)
3. For upgrades: clears any active grace period
4. For downgrades: checks usage, activates grace period if over limits
5. DB transaction: updates subscription (plan, status, SYNCED, timestamps, confirmedBy), updates user flags, creates SubscriptionHistory, creates Payment record (UPGRADE_CHARGE type)
6. Invalidates Redis cache
7. Resets/archives usage metrics for new period
8. Sends email + SMS notifications

---

## Webhook Confirmation Flow (Polling + Fallback)

There's a **timing mismatch**: Execute API returns in 2-3 seconds (Razorpay charged the user), but webhook delivery can take 5-30+ seconds. The dialog waits for DB confirmation before showing success.

```
POST /execute returns success
  → Dialog stays open: "Payment charged. Confirming upgrade..."
  → Polls GET /status?targetPlanId=X every 2.5s (max 8 polls = 20s)
  → Meanwhile, webhook fires → applySubscriptionPlanChange('webhook') → SYNCED
  → Poll detects SYNCED + plan matches → Green success → auto-close after 2s → router.refresh()
  → If 20s timeout (still PENDING) → POST /razorpay-update-confirm-fallback
    → Fetches from Razorpay directly → syncs DB → success or SYNC_FAILED
```

**Why wait-in-dialog?** Upgrade is rare, high-stakes. 5-20s with a spinner is fine. No confusing intermediate states, no stale plan showing after redirect.

### DB Fields for Sync Tracking

```prisma
model Subscription {
  lastApiUpdateAt   DateTime?          // Set by /execute
  lastWebhookAt     DateTime?          // Set by webhook/fallback
  webhookSyncStatus WebhookSyncStatus  // SYNCED | PENDING | SYNC_FAILED | MANUAL_CHECK
}
```

### Razorpay Webhook Retry Behavior
Attempt 1: Immediate → +1min → +5min → +30min → +2hr → +6hr → +12hr → +24hr. Total retry period: ~3 days.

---

## Frontend Flow

**File**: `src/app/(dashboard)/subscription/components/my-plan/upgrade-dialog.tsx` (621L)

### Dialog UI States
| State | UI | Trigger |
|---|---|---|
| Loading preview | Spinner while fetching proration | Dialog opens |
| Preview loaded | Plan comparison + proration breakdown + confirm button | API returns |
| Processing | Disabled button + spinner | User confirms |
| Polling | "Payment charged. Confirming upgrade..." | Execute returns 200 |
| Success | CheckCircle2 + green text → auto-close 2s | Webhook/fallback synced |
| Failed | AlertTriangle + red text + "Close"/"Refresh" buttons | Sync failed |
| Payment Failure | Payment Failure Dialog for UPI/emandate users | Razorpay returns UPI error |

### User Flow (ASCII)
```
/subscription/plans page
  ┌────────────┐  ┌────────────┐  ┌────────────┐
  │   Basic    │  │  Premium   │  │ Enterprise │
  │  ₹999/mo   │  │ ₹1,999/mo  │  │ ₹3,999/mo  │
  │ [Current]  │  │ [Upgrade]  │  │ [Upgrade]  │  ← User clicks
  └────────────┘  └────────────┘  └────────────┘
                        ↓
  UpgradeDialog opens → fetches preview → shows proration
  ┌──────────────────────────────────────────────┐
  │ Upgrade to Premium Plan                      │
  │                                              │
  │ Current → New:  Basic ₹999 → Premium ₹1,999 │
  │ Days remaining: 20                           │
  │ Credit for unused Basic: ₹666.67             │
  │ Amount to charge now: ₹1,332.33              │
  │                                              │
  │ ⚠️ Charged immediately to saved method       │
  │                                              │
  │ [Cancel]           [Confirm Upgrade ₹1,332]  │
  └──────────────────────────────────────────────┘
                        ↓
  Confirm → Execute → Poll → Success → close + refresh
```

### Implementation Details
```
handleConfirmUpgrade():
  1. POST /execute → if success:
  2. setStatusMessage('Payment charged. Confirming upgrade...')
  3. First poll immediately, then setInterval(2500ms)
  4. Each poll: GET /status?targetPlanId=X
     - If SYNCED + planMatches → handleUpgradeSuccess()
  5. After 8 polls (20s timeout):
     - POST /razorpay-update-confirm-fallback
     - If success → handleUpgradeSuccess()
     - If failure → handleUpgradeFailure(reason)

handleUpgradeSuccess():
  - stopPolling(), setUpgradeComplete(true)
  - 2 second delay → onClose() + router.refresh()

handleUpgradeFailure(reason):
  - stopPolling(), setUpgradeFailed(true)
  - Dialog shows "Close" + "Refresh Page" buttons
```

### Tech Stack
- UI: Shadcn (Dialog, Card, Button, Alert)
- State: React hooks (useState, useEffect)
- API: Axios
- Routing: Next.js App Router
- Notifications: Sonner toasts

---

## Upgrade Scenarios

| Current Status | Can Upgrade? | Method | Notes |
|---|---|---|---|
| **ACTIVE** | ✅ Yes | UPDATE API | Standard flow |
| **CANCELED** (period-end) | ✅ Yes | UPDATE API | Also cancels the scheduled cancellation |
| **COMPLETING** | ✅ Yes | UPDATE API | Use `remaining_count` to extend |
| **PAST_DUE** | ⚠️ Maybe | After clearing dues | Requires payment first |
| **EXPIRED** | ❌ No | CREATE new | Must create new subscription |
| **PAUSED** | ❌ No | — | Not supported |

**Our code** only allows ACTIVE and COMPLETING (execute/route.ts). Other statuses return an error.

### CANCELED (period-end) → Higher Tier
If subscription is cancelled but still active on Razorpay (cancellation scheduled for cycle end), `subscriptions.update()` works AND cancels the scheduled cancellation. Same subscription ID preserved.

---

## Edge Cases

| Edge Case | Handling |
|---|---|
| Charge < ₹0.50 | Preview API rejects. "Upgrade amount too small — wait a few days." |
| UPI/eMandate payment method | Error detected reactively. Returns `requiresCancelFlow: true`. See [02_UPI_AND_PAYMENT_METHOD_LIMITATIONS.md](02_UPI_AND_PAYMENT_METHOD_LIMITATIONS.md) |
| Card insufficient funds | Razorpay auto-rollback. No webhook. Detected via polling timeout + fallback |
| Card expired | Same as insufficient funds |
| Webhook never arrives | Fallback fetches from Razorpay directly. If all retries fail (~3 days), reconciliation cron (not yet implemented) |
| User closes browser mid-upgrade | Webhook is server-side, fires regardless. Razorpay retries over 24hr. DB syncs automatically |
| Concurrent upgrades (multi-tab) | Razorpay handles at API level — first succeeds, others fail |
| Already has scheduled changes | UPDATE API handles automatically |
| Near end of billing cycle | Preview warns if < threshold days remaining |

### Browser Close Scenarios

| When | What Happens | Recovery |
|---|---|---|
| Before clicking Confirm | Nothing happened | Clean state |
| During POST /execute | If server received + RP returned 200 → PENDING | Webhook auto-syncs |
| During polling | Polling stops, fallback never fires | Webhook auto-syncs |
| During fallback POST | If server received → synced. If not → webhook handles | Either one syncs DB |
| After success shown | DB already SYNCED | Nothing to recover |

---

## Payment Failure When Razorpay UPDATE Returns 200

The UPDATE API always returns 200 OK. Razorpay then attempts a background charge. If it fails, **no webhook fires** — subscription stays on old plan silently.

Our detection approach:
1. **webhookSyncStatus stays PENDING** — polling detects non-arrival
2. **Fallback endpoint** fetches from Razorpay directly — if plan_id hasn't changed, charge failed
3. User sees error in dialog: "Upgrade could not be confirmed"

No DB corruption occurs — `PENDING` status is cleared either by webhook, fallback, or manual intervention.

---

## Benefits vs Old Method

| Aspect | Old (create new sub) | Current (update API) |
|---|---|---|
| API | `subscriptions.create()` | `subscriptions.update()` |
| Proration | Manual calculation | Razorpay calculates |
| Subscription ID | New ID | Same ID |
| Checkout | Required | Not required |
| Payment Method | New checkout flow | Invoice on saved card |
| Webhook | subscription.authenticated | subscription.updated |
| Min. Charge | No validation | ≥ ₹0.50 required |
| Complexity | High (~500 lines) | Low (~150 lines) |
| Risk | Medium (unsupported addon) | Low (official API) |

---

## Implementation Status

| Component | Status | File |
|---|---|---|
| Preview API | ✅ Done | `upgrade/preview/route.ts` (169L) |
| Execute API | ✅ Done | `upgrade/execute/route.ts` (524L) |
| Status polling API | ✅ Done | `upgrade/status/route.ts` |
| Fallback confirmation API | ✅ Done | `upgrade/razorpay-update-confirm-fallback/route.ts` |
| Webhook handler | ✅ Done | `handlers/updated.ts` (505L) |
| Shared plan change function | ✅ Done | `lib/subscription/apply-plan-change.ts` |
| Upgrade dialog | ✅ Done | `my-plan/upgrade-dialog.tsx` (621L) |
| Downgrade dialog | ✅ Done | `my-plan/downgrade-dialog.tsx` (638L) |
| Upgrade intent banner | ✅ Done | `upgrade-intent-banner.tsx` (109L) |
| Plan card (modified) | ✅ Done | `plan-card.tsx` |
| Plans page (modified) | ✅ Done | `plans/page.tsx` |
| DB migrations | ✅ Done | Prisma migrate applied |
| Testing | ❌ Pending | Manual + edge case testing |
| Monitoring/Alerting | ❌ Pending | Post-launch setup |
