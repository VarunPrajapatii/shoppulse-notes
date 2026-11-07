# Learning 1: Downgrade Grace Period Architecture

**Date:** 2025-07-17  
**Topic:** How to handle plan downgrades when user exceeds new plan limits  
**Difficulty:** Advanced — touches subscription billing, usage enforcement, data integrity, UX

---

## The Problem

```
Half-Yearly Plan:     20 categories, 200 products
Current Usage:        18 categories, 150 products
Downgrade to Monthly: 5 categories, 50 products
Overage:              13 categories, 100 products
```

**The question:** When does the system enforce the new limits? Immediately? At cycle end? What about the products the user already paid to host?

---

## Industry Approach: Grace Period Method

Netflix, Spotify, Shopify, Heroku, AWS — all use the **same pattern**:

1. **Schedule downgrade** — User initiates, system calls Razorpay `subscriptions.update()` with `schedule_change_at: 'cycle_end'`
2. **Keep current features** — User retains full plan access until their paid period ends
3. **Downgrade applies at cycle end** — `subscription.updated` webhook fires
4. **Grace period activates** — If usage exceeds new limits, system gives N days to self-resolve
5. **Auto-enforcement** — If user doesn't reduce usage, system force-deletes oldest items

### Why NOT force cleanup immediately?

- User **paid** for 200 products until period end — forcing cleanup early is unfair
- Immediate cleanup creates panic — user might delete the wrong products
- Industry standard: give users **time to decide** what matters most

---

## Our Implementation

### Razorpay UPDATE API

```typescript
// Schedule downgrade at cycle end (NOT immediate)
await razorpay.subscriptions.update(subId, {
  plan_id: newPlanId,
  schedule_change_at: 'cycle_end',     // ← key parameter
  customer_notify: true
});
```

**Why `cycle_end` not `now`?**
- Upgrade uses `schedule_change_at: 'now'` — user wants better features immediately
- Downgrade uses `'cycle_end'` — user keeps paid features until period ends
- This is a **one-line difference** that creates completely different business logic

### Grace Period Flow

```
subscription.updated webhook fires (cycle end)
    ↓
Check: Does usage exceed new plan limits?
    ↓
├── NO  → Normal downgrade. Done.
│
└── YES → Activate 5-day grace period
          ├── Set user.usageGracePeriod = true
          ├── Store gracePeriodData in subscription.metadata
          ├── Send email: "You have 5 days to reduce usage"
          ├── Daily cron sends reminders
          └── Day 5: enforceGracePeriodDeletions()
```

### Enforcement Order (Critical)

When the cron enforces limits, deletion order matters because of cascading relationships:

```
Step 1: Delete billboards (safest — no product cascade)
Step 2: Delete categories (cascade-deletes their products too)
Step 3: Recalculate product overage (category deletion may have already resolved it)
Step 4: Delete remaining excess products if still over limit
```

**Key insight:** Deleting 13 categories that collectively contain 110 products might resolve BOTH the category overage (13 → 5) AND the product overage (150 → 40) in one step, making Step 4 unnecessary.

---

## What We Learned

1. **Grace periods are industry standard** — Don't reinvent; follow Netflix/Shopify pattern
2. **Enforcement order matters** — Cascading deletes mean you might over-delete if you do products before categories
3. **Re-check before enforcement** — User may have self-resolved during grace period. Always re-check overages before deleting.
4. **7-day pre-warning** — Enhancement: warn users 7 days BEFORE their paid period ends to start reducing
5. **Daily vs. individual reminders** — We simplified from "Day 1: X, Day 2: Y, Day 3: Z" specific emails to a generic daily cron reminder. Simpler code, same outcome.

---

## Interview Talking Points

- "How do you handle subscription downgrades when user exceeds new plan limits?"
- "What's a grace period in SaaS context and why is it important?"
- "How do cascading database deletes affect enforcement order?"
- "Why do Netflix/Spotify let you keep premium features until your paid period ends?"
- "How does Razorpay's UPDATE API differ between upgrade and downgrade scheduling?"

---

## Files Referenced

| File | Purpose |
|------|---------|
| `src/app/api/subscription/downgrade/schedule/route.ts` | Schedule downgrade API |
| `src/app/api/subscription/downgrade/cancel-scheduled/route.ts` | Cancel pending downgrade |
| `src/app/api/webhook/razorpay/subscription/handlers/updated.ts` | Webhook processes plan change |
| `src/app/api/cron/enforce-grace-periods/route.ts` | Daily grace period enforcement |
| `src/lib/usage-service.ts` | `getOverageSummary()`, `enforceGracePeriodDeletions()` |
| `src/lib/archive-product.ts` | Archive before delete |
