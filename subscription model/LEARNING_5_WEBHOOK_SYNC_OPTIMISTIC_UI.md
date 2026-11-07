# Learning 5: Webhook Sync Strategy — Optimistic UI vs. Polling vs. WebSocket

**Date:** 2025-07-17  
**Topic:** How to sync frontend state when backend operations complete asynchronously via webhooks  
**Difficulty:** Intermediate — distributed systems, eventual consistency, UX engineering

---

## The Timing Problem

```
T+0s:   User clicks "Upgrade" → Execute API called
T+2s:   API returns 200 OK (Razorpay accepted the request)
T+3s:   Frontend needs to show result... but webhook hasn't fired yet
T+5-30s: Razorpay fires subscription.updated webhook
T+5-30s: Our webhook handler updates the database
```

**The frontend gets a 200 OK 5-30 seconds before the database is actually updated.** What do we show the user?

---

## Options

### Option 1: Optimistic Success (✅ WHAT WE USE)

```
API returns 200 → Immediately show "Upgrade Successful!" → Redirect to My Plan
```

| Pro | Con |
|-----|-----|
| Instant feedback (0s delay) | My Plan page might show old plan for a few seconds |
| Simplest implementation | If payment fails silently, user sees wrong state temporarily |
| 99.9% of the time correct | Rare edge case: webhook never fires |

**Industry examples:** Netflix, Amazon Prime, Spotify — all show success immediately when API call succeeds.

### Option 2: Polling

```
API returns 200 → Show "Processing..." spinner → Poll every 2s for 20s → Show result
```

| Pro | Con |
|-----|-----|
| Confirms actual state change | 5-20s loading spinner |
| User sees correct plan immediately | More complex code |
| Catches payment failures | Server load from polling |

### Option 3: WebSocket / Server-Sent Events

```
API returns 200 → Open WebSocket → Wait for server push → Show result
```

| Pro | Con |
|-----|-----|
| Real-time, no polling overhead | Massive overkill for this use case |
| Elegant | WebSocket infrastructure needed |

### Option 4: Hybrid — Optimistic + Light Polling (RECOMMENDED for future)

```
API returns 200 → Show "Upgrade Successful!" immediately
                → In background: poll 3 times over 6s
                → If poll confirms: done
                → If poll doesn't confirm within 6s: show subtle "Syncing..." banner
```

---

## What We Actually Implemented

**Pure Optimistic Success:**

```typescript
// upgrade-dialog.tsx
const handleConfirmUpgrade = async () => {
  const response = await axios.post('/api/subscription/upgrade/execute', { newPlanId });
  
  if (response.data.success) {
    toast.success('Upgrade successful!');
    
    // Wait 1.5s for webhook to potentially arrive, then redirect
    setTimeout(() => {
      router.push('/subscription/my-plan?upgraded=true&newPlanId=' + newPlanId);
      router.refresh();
    }, 1500);
  }
};
```

**`webhookSyncStatus` tracking in metadata:**
```
Execute API sets: webhookSyncStatus = 'PENDING'
Webhook handler sets: webhookSyncStatus = 'SYNCED'
```

This lets us detect "zombie" upgrades where the API succeeded but webhook never fired. A future cron could clean these up.

---

## The webhookSyncStatus Pattern (User's Innovation)

The user proposed tracking webhook sync status rather than running an hourly cron to verify all subscriptions:

```
Stored in subscription metadata (not as Prisma enum):
{
  "webhookSyncStatus": "PENDING" | "SYNCED" | "SYNC_FAILED" | "MANUAL_CHECK"
}
```

**Why this is better than a cron:**
1. **Per-subscription tracking** — only check subscriptions that need checking, not all
2. **On-visit check** — when user visits My Plan page, check if their specific subscription needs sync
3. **Lightweight** — no hourly scan of all subscriptions
4. **Debugging** — instantly see which subscriptions have pending operations

**Why we stored it in metadata (not a schema field):**
- It's operational state, not business data
- Doesn't need to be indexed/queried at scale
- Easy to add more states without migration

---

## Webhook Retry Behavior (From Razorpay Docs)

If our webhook endpoint returns non-200, Razorpay retries:

```
Attempt 1: Immediate
Attempt 2: 1 minute later
Attempt 3: 5 minutes later
Attempt 4: 30 minutes later
Attempt 5: 2 hours later
Attempt 6: 6 hours later
Attempt 7: 12 hours later
Attempt 8: 24 hours later
Total window: ~3 days of retries
```

**This means:** In the worst case, if our server is down, we have 3 days to come back online and receive the webhook. Combined with `webhookSyncStatus`, we can detect any webhooks that were never received even after retries.

---

## Why Optimistic Success Works Here

The Razorpay UPDATE API call is **synchronous to Razorpay's payment system.** When it returns 200:
- Razorpay has already validated the payment method
- Razorpay has already created the invoice
- Razorpay has already attempted the charge

The webhook is just Razorpay's **notification** to us that the charge succeeded. The 200 response IS the success signal — the webhook is confirmation.

**The only failure case:** Razorpay accepts the request (200), attempts the charge, charge fails at the bank level. In this case:
- No webhook fires
- Subscription stays on old plan (automatic rollback)
- Our `webhookSyncStatus` stays `PENDING`
- User might briefly see wrong state, but next page load corrects it

---

## Interview Talking Points

- "How do you handle eventual consistency between API calls and webhook notifications?"
- "What's the trade-off between optimistic UI and polling for async operations?"
- "Why do most platforms use optimistic success instead of waiting for confirmation?"
- "How do you track webhook delivery status without running expensive cron scans?"
- "What happens when a webhook never fires? How do you detect and recover?"
- "Explain Razorpay's webhook retry behavior and its implications for system design"

---

## Files Referenced

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/subscription/components/my-plan/upgrade-dialog.tsx` (621L) | Optimistic success + redirect |
| `src/app/api/subscription/upgrade/execute/route.ts` (524L) | Sets webhookSyncStatus: PENDING |
| `src/app/api/webhook/razorpay/subscription/handlers/updated.ts` (505L) | Sets webhookSyncStatus: SYNCED |
