# Upgrade Q&A 1.1: Webhook Flow — How We Confirm Upgrade Success

**Topic**: How frontend knows upgrade succeeded after Razorpay UPDATE API  
**Last Updated**: February 2026  
**Status**: FULLY IMPLEMENTED — Wait-in-Dialog + Polling + Fallback Fetch

---

## The Core Problem

There's a **timing mismatch** between:
1. **Execute API response** (returns in 2-3 seconds) — Razorpay charged the user
2. **Webhook delivery** (can take 5-30+ seconds) — Our DB gets updated

We do NOT want the user to think the plan is updated before we've confirmed payment. So we **wait for confirmation** before telling the user "upgraded".

---

## Implemented Solution: Wait-in-Dialog with Polling + Fallback

### Flow Diagram

```
User clicks "Confirm Upgrade" in upgrade-dialog.tsx
  ↓
POST /api/subscription/upgrade/execute
  → Backend calls Razorpay UPDATE API (synchronous charge)
  → If 200 OK: payment charged, sets webhookSyncStatus = PENDING in DB
  → Returns success to frontend
  ↓
Dialog stays open, shows "Payment charged. Confirming upgrade..."
  ↓
Dialog polls GET /api/subscription/upgrade/status?targetPlanId=X
  → Every 2.5 seconds, max 8 polls (20 seconds total)
  → Checks: Is webhookSyncStatus === 'SYNCED' AND planId matches target?
  ↓
Meanwhile, Razorpay fires webhook → subscription.updated
  → updated.ts handler → calls applySubscriptionPlanChange('webhook')
  → Sets webhookSyncStatus = SYNCED, updates plan in DB
  ↓
Poll detects SYNCED + plan matches?
  ├── YES → Show green success in dialog → 2s delay → Close → router.refresh()
  └── NO (20s timeout, still PENDING) ↓
                                        ↓
POST /api/subscription/upgrade/razorpay-update-confirm-fallback
  → Fetches subscription directly from Razorpay API
  → Compares plan_id with expectedNewPlanId
  ├── Match → applySubscriptionPlanChange('fallback_fetch') → SYNCED → Success
  └── No match → webhookSyncStatus = SYNC_FAILED → Show error in dialog
```

### Why Wait-in-Dialog?

Upgrade is a **rare, high-stakes action**. Waiting 5-20 seconds with a spinner is fine for something users do once every few months. Benefits:
- User sees **definitive confirmation** before the dialog closes
- No confusing intermediate states (old plan showing after redirect)
- No `?upgraded=true` query params that replay on browser refresh
- No separate banner/component needed on the landing page

---

## The 4 Endpoints

### 1. POST /api/subscription/upgrade/execute
**Purpose**: Call Razorpay UPDATE API, mark DB as PENDING  
**File**: `src/app/api/subscription/upgrade/execute/route.ts`

- Validates: subscription is ACTIVE/COMPLETING, new plan costs more
- Calls `razorpayInstance.subscriptions.update()` with `schedule_change_at: 'now'`
- Sets `webhookSyncStatus: 'PENDING'`, `lastApiUpdateAt: new Date()`
- Stores `pendingUpgrade` metadata (targetPlanId, razorpay response)
- Creates SubscriptionHistory entry (action: UPGRADED)
- Returns `{ success: true }` to frontend

### 2. GET /api/subscription/upgrade/status
**Purpose**: Lightweight polling endpoint — checks if webhook has arrived  
**File**: `src/app/api/subscription/upgrade/status/route.ts`

- Query param: `targetPlanId`
- Returns: `{ status: 'SYNCED' | 'PENDING', planId, planMatches, plan }`
- Minimal DB query (only `select` the fields we need)
- Called every 2.5s by the dialog (max 8 times)

### 3. POST /api/subscription/upgrade/razorpay-update-confirm-fallback
**Purpose**: Safety net when webhook doesn't arrive within 20s  
**File**: `src/app/api/subscription/upgrade/razorpay-update-confirm-fallback/route.ts`

- Accepts: `{ expectedNewPlanId }`
- Early return if already SYNCED (webhook arrived between timeout and this call)
- Rejects if not PENDING (nothing to confirm)
- Fetches subscription from Razorpay: `razorpayInstance.subscriptions.fetch()`
- Compares `plan_id` with expected plan's `razorpayPlanId`
- If match → calls `applySubscriptionPlanChange('fallback_fetch')` → DB synced
- If no match → sets `webhookSyncStatus: 'SYNC_FAILED'` → error returned

### 4. Webhook: subscription.updated
**Purpose**: Primary path — Razorpay notifies us of plan change  
**File**: `src/app/api/webhook/razorpay/subscription/handlers/updated.ts`

- Receives Razorpay webhook payload
- Idempotency guard: if `webhookSyncStatus === 'SYNCED'` → skip (fallback may have run first)
- Maps webhook payload to typed interfaces
- Calls `applySubscriptionPlanChange('webhook')` → DB synced

---

## The Shared Function: applySubscriptionPlanChange()

**File**: `src/lib/subscription/apply-plan-change.ts`

Both the webhook handler AND the fallback endpoint call this **single idempotent function**. Whichever arrives first wins. The other no-ops.

**Idempotency guard**: If `webhookSyncStatus === 'SYNCED'` → returns `{ success: true, alreadySynced: true }`.

**What it does**:
1. Looks up the new plan in DB by `razorpayPlanId`
2. Detects upgrade vs downgrade (by price comparison)
3. For upgrades: clears any active grace period
4. For downgrades: checks usage, activates grace period if over limits
5. DB transaction:
   - Updates subscription (plan, status, SYNCED, all timestamps, confirmedBy metadata)
   - Updates user flags (grace period cleared/activated)
   - Creates SubscriptionHistory record
   - Creates Payment record (for upgrades with charge amount)
6. Invalidates Redis cache
7. Resets/archives usage metrics for new period
8. Sends email + SMS notifications

---

## DB Fields Used

```prisma
model Subscription {
  // WEBHOOK SYNC TRACKING
  lastApiUpdateAt   DateTime?          // Set by /execute — when UPDATE API was called
  lastWebhookAt     DateTime?          // Set by webhook/fallback — when confirmation arrived
  webhookSyncStatus WebhookSyncStatus @default(SYNCED) // SYNCED | PENDING | SYNC_FAILED | MANUAL_CHECK
}
```

- `/execute` sets: `webhookSyncStatus = PENDING`, `lastApiUpdateAt = now()`
- Webhook OR fallback sets: `webhookSyncStatus = SYNCED`, `lastWebhookAt = now()`

---

## Frontend Implementation (upgrade-dialog.tsx)

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
  - stopPolling()
  - setUpgradeComplete(true), status = "Plan upgraded successfully!"
  - 2 second delay
  - onClose() + router.refresh()

handleUpgradeFailure(reason):
  - stopPolling()
  - setUpgradeFailed(true), status = reason
  - Dialog shows "Close" + "Refresh Page" buttons
```

**Dialog UI States**:
- Processing: Loader2 spinner + blue text
- Success: CheckCircle2 + green success text + auto-closes after 2s
- Failed: AlertTriangle + red error text + manual close buttons

---

## What Happens If Razorpay UPDATE API Fails?

- Payment declined / insufficient funds / card expired
- Razorpay throws error → `/execute` returns error to frontend
- `webhookSyncStatus` stays `SYNCED` (was never set to PENDING)
- No webhook fires (nothing changed on Razorpay's side)
- User sees error toast in dialog, can retry
- **No DB corruption. Clean state.**

---

## What Happens If User Closes Browser?

| When browser closes | What happens | Recovery |
|---|---|---|
| Before clicking Confirm | Nothing happened | Clean state |
| During POST /execute (request in-flight) | If request reached server & RP returned 200: webhookSyncStatus=PENDING | Webhook arrives server-side → auto-syncs DB |
| During polling (webhook not yet arrived) | Polling stops, fallback never fires | Webhook arrives server-side → auto-syncs DB |
| During fallback POST (in-flight) | If request reached server: DB synced. If not: webhook handles it | Either fallback or webhook syncs DB |
| After success shown | DB already SYNCED | Nothing to recover |

**Key insight**: The webhook is **server-side** and fires regardless of browser state. Razorpay retries webhooks over 24 hours. So in 99.9% of browser-close scenarios, the webhook handles everything automatically.

**Edge case**: Browser closed AND all webhook retries fail (24 hours of retries). Result: `webhookSyncStatus` stuck at PENDING, DB has old plan, Razorpay charging new plan. Mitigation: reconciliation cron (not yet implemented, extremely unlikely scenario).

---

## Razorpay Webhook Retry Behavior

Razorpay retries webhooks automatically when your server returns non-200:

```
Attempt 1: Immediate
Attempt 2: +1 minute
Attempt 3: +5 minutes
Attempt 4: +30 minutes
Attempt 5: +2 hours
Attempt 6: +6 hours
Attempt 7: +12 hours
Attempt 8: +24 hours
```

Total retry period: ~3 days. Our webhook returns 200 on success, so retries only happen on actual failures.

---

## Summary

| Question | Answer |
|---|---|
| How does frontend know upgrade succeeded? | Polls DB via GET /status. When webhookSyncStatus=SYNCED + plan matches → success |
| What confirms the payment? | Razorpay UPDATE API 200 = charged. Webhook/fallback = DB proof |
| What if webhook is slow? | Polling waits up to 20s. If still PENDING → fallback fetches from RP |
| What if webhook never arrives? | Fallback endpoint fetches directly from Razorpay and syncs DB |
| What if user closes browser? | Webhook arrives server-side, syncs DB independently |
| Can webhook and fallback race? | Yes, but shared function is idempotent — first one wins, second no-ops |
| Where is the DB mutation logic? | Single shared function: `src/lib/subscription/apply-plan-change.ts` |
