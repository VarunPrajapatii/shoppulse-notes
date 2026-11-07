# Learning 3: Razorpay Subscription Plan Changes — UPDATE API Deep Dive

**Date:** 2025-07-17  
**Topic:** How Razorpay's UPDATE API handles subscription plan changes (upgrade/downgrade)  
**Difficulty:** Intermediate — payment gateway API design patterns

---

## The Old (Wrong) Way vs. The Right Way

### ❌ Old Approach: Cancel + Create New (REJECTED)

```
User wants to upgrade
  → Cancel current subscription
  → Calculate proration credit manually
  → Create new subscription with negative addon for credit
  → Redirect user to new payment page
  → Handle two subscription IDs
```

**Problems:**
- Negative addons are NOT supported by Razorpay for reducing amount
- New subscription = new ID = broken tracking
- User sees a payment page (bad UX for an "upgrade")
- Two-step process = race conditions
- If step 2 fails after step 1, user has no subscription

### ✅ Right Approach: UPDATE API (Single Call)

```
User wants to upgrade
  → Call subscriptions.update(id, { plan_id, schedule_change_at })
  → Same subscription ID preserved
  → Razorpay handles proration automatically
  → Webhook confirms completion
```

---

## The One-Parameter Difference

```typescript
// UPGRADE — apply immediately, charge prorated difference now
await razorpay.subscriptions.update(subId, {
  plan_id: newPlanId,
  schedule_change_at: 'now',           // ← IMMEDIATE
  customer_notify: true
});

// DOWNGRADE — schedule for cycle end, no charge
await razorpay.subscriptions.update(subId, {
  plan_id: newPlanId,
  schedule_change_at: 'cycle_end',     // ← SCHEDULED
  customer_notify: true
});
```

**One parameter (`schedule_change_at`) controls the entire business logic difference between upgrade and downgrade.**

---

## What Happens Under the Hood

### Upgrade (`schedule_change_at: 'now'`)

```
API call → Razorpay creates INVOICE for prorated difference
  → Invoice amount = (New Price × Remaining Days / Total Days) - Credit
  → If amount < ₹0.50: API fails (Razorpay minimum)
  → Razorpay charges the payment method automatically
  → If charge succeeds: subscription.updated webhook fires
  → If charge fails: subscription stays on OLD plan (automatic rollback)
```

**Critical Rule: UPDATE creates an INVOICE, not a regular charge.** The `subscription.charged` webhook does NOT fire for upgrades — only `subscription.updated` fires.

### Downgrade (`schedule_change_at: 'cycle_end'`)

```
API call → Razorpay stores pending change (no immediate action)
  → subscription.has_scheduled_changes = true
  → User keeps current plan until period ends
  → At cycle end: Razorpay applies the change automatically
  → subscription.updated webhook fires
  → No charge (new plan is cheaper)
```

---

## UPI/eMandate Restriction

The UPDATE API does **NOT work** for UPI or eMandate payment methods:

```typescript
// Our code tries UPDATE API → catches the error → informs frontend
try {
  await razorpay.subscriptions.update(subId, { plan_id, schedule_change_at: 'now' });
} catch (error) {
  if (error.error?.code === 'BAD_REQUEST_ERROR') {
    // Detect UPI/eMandate from error description
    const desc = error.error.description?.toLowerCase();
    if (desc?.includes('upi') || desc?.includes('emandate') || desc?.includes('card mandate')) {
      return { requiresCancelFlow: true };
      // Frontend shows "Cancel & Resubscribe" as the only option
    }
  }
}
```

**Why error-based detection?** We could pre-check the payment method, but:
1. Payment method isn't on the Subscription entity — it's on the Payment entity
2. Error-based is **future-proof** — automatically handles new payment types Razorpay adds
3. Zero false positives — Razorpay's error IS the definitive answer

---

## Cancel Scheduled Changes

If user scheduled a downgrade but changes their mind:

```typescript
// SDK method doesn't exist — we use raw fetch
const response = await fetch(
  `https://api.razorpay.com/v1/subscriptions/${subId}/cancel_scheduled_changes`,
  {
    method: 'POST',
    headers: { 'Authorization': `Basic ${btoa(key + ':' + secret)}` }
  }
);
```

**Why raw `fetch`?** The Razorpay Node SDK doesn't expose `cancelScheduledChanges()` as a proper method. We had to use the raw REST API with Basic auth.

**Pre-check pattern:** Before canceling, we first `retrieve_scheduled_changes` — if Razorpay says there are none, we sync our DB and return early instead of throwing an error.

---

## Webhook Design: Why Only `subscription.updated`

| Event | When It Fires | Upgrade? | Downgrade? |
|-------|--------------|----------|------------|
| `subscription.updated` | Plan change applied | ✅ Yes | ✅ Yes |
| `subscription.charged` | Regular billing | ❌ No | ❌ No |
| `subscription.authenticated` | First payment setup | ❌ No | ❌ No |

**This was a major learning:** Many developers assume `subscription.charged` fires for upgrades (since money is charged). It doesn't. The upgrade charge happens via an **invoice**, not a regular subscription charge cycle.

Our webhook handler determines upgrade vs. downgrade by price comparison:

```typescript
const isDowngrade = Number(newPlan.price) < Number(oldPlan.price);
```

---

## Proration: Display Only vs. Actual

```
Our preview API calculates proration for DISPLAY PURPOSES ONLY:
  credit = (currentPrice / totalDays) × daysRemaining
  charge = newPrice - credit
  
Razorpay calculates the ACTUAL charge:
  Uses its own internal formula (may differ slightly from ours)
  Official formula: daysToBeCharged = planChangeDay - 1
  
The user sees our estimate. Razorpay charges the actual amount.
Both should be very close but may differ by a few rupees.
```

---

## What We Got Wrong Initially (and Fixed)

1. **Thought `subscription.charged` fires for upgrades** — Fixed: only `subscription.updated` fires
2. **Tried negative addons for proration credit** — Fixed: Razorpay doesn't support this, UPDATE API handles proration
3. **Tried SDK method for cancel scheduled changes** — Fixed: SDK doesn't have it, use raw fetch
4. **Stored payment method on Subscription model** — Fixed: it's on Payment entity, we use error-based detection instead
5. **Assumed immediate cancel for downgrades** — Fixed: schedule at cycle_end, user keeps paid features

---

## Interview Talking Points

- "How does Razorpay handle subscription plan changes vs. Stripe's approach?"
- "What's the difference between an invoice charge and a subscription charge?"
- "Why does the UPDATE API create an invoice instead of a regular charge for upgrades?"
- "How do you handle payment methods that don't support plan changes (UPI)?"
- "What's the error-based detection pattern and why is it future-proof?"
- "Why is `schedule_change_at` the most important parameter in subscription management?"
- "How do you cancel a pending plan change when the SDK doesn't support it?"

---

## Files Referenced

| File | Purpose |
|------|---------|
| `src/app/api/subscription/upgrade/execute/route.ts` (524L) | UPDATE API with `now` |
| `src/app/api/subscription/upgrade/preview/route.ts` (169L) | Proration preview |
| `src/app/api/subscription/downgrade/schedule/route.ts` (320L) | UPDATE API with `cycle_end` |
| `src/app/api/subscription/downgrade/cancel-scheduled/route.ts` (277L) | Raw fetch cancel |
| `src/app/api/webhook/razorpay/subscription/handlers/updated.ts` (505L) | Handles both upgrade+downgrade |
