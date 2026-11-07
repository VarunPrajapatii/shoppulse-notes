# Learning 6: Razorpay Subscription Cancel — Immediate vs. Cycle End

**Date:** 2025-07-17  
**Topic:** Why immediate cancel + cron expiry is better than `cancel_at_cycle_end`  
**Difficulty:** Intermediate — subscription lifecycle, payment gateway behavior

---

## The Decision

When a user cancels their subscription, there are two approaches:

### Option A: `cancel_at_cycle_end: true`

```typescript
await razorpay.subscriptions.cancel(subId, { cancel_at_cycle_end: true });
// Razorpay status: remains "active" until period end
// Our DB: status = "COMPLETING" or "CANCELING"?
// At period end: Razorpay fires subscription.cancelled webhook
```

### Option B: Immediate Cancel + Cron Expiry (✅ OUR APPROACH)

```typescript
await razorpay.subscriptions.cancel(subId);
// Razorpay status: immediately "cancelled"
// Our DB: status = "COMPLETING" (user keeps access until period end)
// Cron: expire-unpaid-orders checks daily → when period ends → status = "EXPIRED"
```

---

## Why We Chose Option B

### 1. Stops Auto-Pay Immediately

The primary reason users cancel: **they don't want to be charged again.** 

With Option A, the subscription is technically still "active" on Razorpay. What if Razorpay's cycle-end logic has edge cases? What if the user's bank gets pre-authorized?

With Option B, the subscription is definitively **cancelled** on Razorpay's side. There is **zero chance** of another charge. The user's intent is fully honored.

### 2. Cancel Is Permanent on Razorpay

```
Razorpay cancel = PERMANENT. There is no "un-cancel" API.
subscription.cancelled webhook fires → status = "cancelled" → FINAL
```

This means even if the user changes their mind 5 minutes later, they can't reactivate. They need a new subscription. (This is a Razorpay limitation, not our choice.)

Since cancel is permanent either way, **there's no advantage to delaying it.**

### 3. Our Cron Already Handles Period End

We have `expire-unpaid-orders` cron running daily. Adding expiry logic for COMPLETING subscriptions is trivial:

```typescript
// In daily cron:
if (subscription.status === 'COMPLETING' && now > subscription.currentPeriodEnd) {
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { 
      status: 'EXPIRED',
      isActive: false,
      // Restrict store access
    }
  });
}
```

### 4. Simpler Mental Model

```
Option A: 
  Cancel → status: "ACTIVE" on Razorpay (confusing!) → webhook fires later → "CANCELLED"
  
Option B:
  Cancel → status: "CANCELLED" on Razorpay (clear!) → we set "COMPLETING" in DB → cron expires
```

Our approach separates concerns:
- **Razorpay** = payment state (cancelled = no more charges)
- **Our DB** = business state (COMPLETING = still has access until period end)

---

## The Proof: 11 Sources Confirming Cancel Is Permanent

From our Razorpay docs audit, 11 separate sources across 5 documents confirm:
- There is NO un-cancel API
- There is NO reactivate-after-cancel API
- `subscription.cancelled` is a terminal state
- The only way to "reactivate" is creating a new subscription with `start_at` for the future

---

## What Happens at Period End

```
Cancel Day (e.g., Day 15 of 30):
  → Razorpay: CANCELLED
  → Our DB: COMPLETING
  → Store: isActive=true, isAccessible=true
  → User: keeps using all features normally

Period End (Day 30):
  → Cron fires
  → Detects: status=COMPLETING, now > currentPeriodEnd
  → Our DB: EXPIRED
  → Store: isActive=false, isAccessible=false
  → User: blocked from admin panel (except subscription page)
```

---

## Edge Case: User Wants to Undo Cancel

```
User cancelled → status = COMPLETING
Next day: "I changed my mind!"

Solution: Create a NEW Razorpay subscription with start_at = currentPeriodEnd

Why start_at?
  → Current subscription runs until period end (COMPLETING)
  → New subscription begins exactly when old one expires
  → No overlap, no gap
  → User doesn't pay twice
  
(This is the same pattern Razorpay recommends for "reactivation after cancel")
```

---

## Interview Talking Points

- "Why would you cancel a subscription immediately instead of at cycle end?"
- "What's the difference between payment state and business state in subscriptions?"
- "How do you handle 'cancel but keep access until paid period ends'?"
- "Why is subscription cancellation permanent on most payment gateways?"
- "How do you reactivate a cancelled subscription when the gateway doesn't support un-cancel?"

---

## Files Referenced

| File | Purpose |
|------|---------|
| `src/app/api/subscription/cancel/route.ts` (154L) | Immediate cancel API |
| `src/app/api/cron/expire-unpaid-orders/route.ts` | Expiry at period end |
| `src/app/api/webhook/razorpay/subscription/handlers/cancelled.ts` | Webhook handler |
