# Learning 7: Pause/Resume — Why `resume_at: 'now'` and the PAUSED State Machine

**Date:** 2025-07-17  
**Topic:** Implementing subscription pause/resume with Razorpay API constraints  
**Difficulty:** Intermediate — API behavior, state management, billing cycle math

---

## The Business Requirement

Allow sellers to "pause" their subscription (e.g., going on vacation) and resume later. During pause:
- Store becomes **read-only** (no new orders accepted by storefront)
- Seller can still **view** admin panel (dashboard, orders, analytics)
- **No charge** during pause period
- Resume whenever ready

---

## Razorpay Pause API

```typescript
// Pause subscription
await razorpay.subscriptions.pause(subscriptionId, { pause_initiated_by: 'customer' });
// Result: status = "paused"

// Resume subscription
await razorpay.subscriptions.resume(subscriptionId, { resume_at: 'now' });
// Result: status = "active", new billing cycle starts from NOW
```

### The `resume_at` Parameter

There's only ONE supported value for `resume_at`:

```typescript
{ resume_at: 'now' }  // ✅ Only supported value
{ resume_at: '2025-08-01' }  // ❌ NOT SUPPORTED
{ resume_at: 'cycle_end' }  // ❌ NOT SUPPORTED
```

This means when a user resumes, their billing cycle **immediately resets to today**. There's no way to say "resume at the end of the original cycle" or "resume on a specific date."

**Implication:** If a user pauses on Day 10 of 30, then resumes 5 days later (Day 15), they get a fresh 30-day cycle starting from Day 15. They effectively got 10 + 30 = 40 days of service for one payment (but 5 days were paused/no-access, so it's fair).

---

## Our State Machine

```
ACTIVE ──pause──→ PAUSED ──resume──→ ACTIVE
   │                                    ↑
   │                                    │
   └──cancel──→ COMPLETING ──cron──→ EXPIRED
```

### PAUSED State Restrictions

```typescript
// What's BLOCKED during PAUSED:
- Storefront: isAccessible = false (customers can't place orders)
- Product creation/editing: blocked
- Category management: blocked
- Plan changes (upgrade/downgrade): blocked — can't call Razorpay update on paused sub

// What's ALLOWED during PAUSED:
- Admin panel login ✅
- View dashboard, analytics ✅
- View existing orders ✅
- Process existing orders (ship, fulfill) ✅
- Cancel subscription ✅
- Resume subscription ✅
```

### Why Can't You Upgrade/Downgrade While Paused?

```
Razorpay UPDATE API requires subscription status = "active"
If status = "paused", the UPDATE API returns an error

Workaround: Resume first, then upgrade/downgrade
But this starts a new billing cycle immediately...
So we guide the user: "Resume your subscription to change plans"
```

---

## Implementation Architecture

### Pause API

```typescript
// src/app/api/subscription/pause/route.ts
export async function POST(request: Request) {
  // 1. Verify user owns the subscription
  // 2. Check current status is ACTIVE
  // 3. Call Razorpay pause API
  await razorpay.subscriptions.pause(razorpaySubId, { 
    pause_initiated_by: 'customer' 
  });
  // 4. Update our DB
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { 
      status: 'PAUSED',
      // isActive still true (they paid for the period)
      // But isAccessible = false (store can't take new orders)
    }
  });
  // 5. Send notification: "Your subscription has been paused"
}
```

### Resume API

```typescript
// src/app/api/subscription/resume/route.ts
export async function POST(request: Request) {
  // 1. Verify user owns the subscription
  // 2. Check current status is PAUSED
  // 3. Call Razorpay resume API
  await razorpay.subscriptions.resume(razorpaySubId, { 
    resume_at: 'now'  // Only supported value!
  });
  // 4. Update our DB (wait for webhook to update currentPeriodEnd)
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { 
      status: 'ACTIVE',
      // isAccessible = true (store back online)
      // currentPeriodEnd will be updated by subscription.resumed webhook
    }
  });
  // 5. Send notification: "Your subscription has been resumed"
}
```

---

## The Webhook Side

```typescript
// subscription.paused webhook
handler: async (payload) => {
  await prisma.subscription.update({
    where: { razorpaySubscriptionId: payload.subscription.id },
    data: { status: 'PAUSED' }
  });
}

// subscription.resumed webhook  
handler: async (payload) => {
  const sub = payload.subscription;
  await prisma.subscription.update({
    where: { razorpaySubscriptionId: sub.id },
    data: { 
      status: 'ACTIVE',
      currentPeriodEnd: new Date(sub.current_end * 1000), // New cycle!
    }
  });
}
```

### Why Both API + Webhook?

Same pattern as all our other operations:
1. **API call** → Optimistic update (set PAUSED/ACTIVE immediately)
2. **Webhook** → Confirmation (Razorpay confirms the state change)

If webhook arrives and status doesn't match, webhook is source of truth.

---

## Edge Cases We Discussed

### 1. Pause During Grace Period

```
Scenario: Seller is in grace period (downgrade enforcement pending)
Can they pause?

Answer: NO. Grace period is a restricted state.
If you allow pause during grace, the grace timer should also pause.
That adds complexity with no real benefit.
UI: "You cannot pause during a plan transition. Please complete your downgrade first."
```

### 2. Max Pause Duration

```
Razorpay doesn't enforce a max pause duration.
We could add our own:
- After 90 days paused → auto-cancel via cron
- Send warnings at 60, 75, 85 days

Not implemented yet — enhancement for later.
```

### 3. Orders In Transit During Pause

```
Seller pauses while orders are still being shipped.

Answer: Pausing doesn't affect existing orders.
- Seller can still process, ship, fulfill existing orders
- Only NEW orders are blocked (storefront shows "currently unavailable")
- This is the correct behavior — you don't abandon customers mid-order
```

---

## Key Insight: Billing Cycle Reset

```
Before Pause:
  Billing cycle: Jan 1 - Jan 31 (day 15 of 30)
  
Pause on Jan 15:
  Remaining days: 15 days unused
  Status: PAUSED
  
Resume on Jan 25 (10 days later):
  New cycle starts: Jan 25 - Feb 24 (fresh 30 days)
  
Net effect: User paid for Jan 1-31, got access Jan 1-15, paused 10 days, 
then gets Jan 25 - Feb 24. Total access = 15 + 30 = 45 days for 1.5 payments
(one full payment + the already-paid Jan period)

This is FAIR because:
  - They already paid for Jan, so Jan 1-15 access was earned
  - They get a clean new cycle on resume (Razorpay charges fresh)
  - The 10 paused days are "free" — no charge, no access
```

---

## Interview Talking Points

- "How would you implement subscription pause/resume with a payment gateway?"
- "What happens to the billing cycle when a user resumes a paused subscription?"
- "Why can't you change plans on a paused subscription?"
- "How do you handle existing orders when a seller pauses their store?"
- "What's the difference between pause (temporary) and cancel (permanent)?"

---

## Files Referenced

| File | Purpose |
|------|---------|
| `src/app/api/subscription/pause/route.ts` | Pause API |
| `src/app/api/subscription/resume/route.ts` | Resume API |
| `src/components/subscription/pause-resume-dialog.tsx` | UI dialog |
| Razorpay Subscriptions API docs | `pause_initiated_by`, `resume_at` params |
