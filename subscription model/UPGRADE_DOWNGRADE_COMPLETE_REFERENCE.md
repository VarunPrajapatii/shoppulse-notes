# Complete Upgrade & Downgrade Reference Guide

**Date**: November 24, 2025  
**Status**: Complete Implementation Reference  
**Purpose**: Quick reference for upgrade and downgrade flows

---

## Quick Comparison

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
- ✅ Minimum charge difference: **₹0.50**
- ✅ Only works on `authenticated` or `active` subscriptions
- ✅ Cannot update UPI/Emandate subscriptions
- ✅ Payment failure = automatic rollback
- ✅ Same subscription ID preserved

### Implementation Files
- Preview: `/api/subscription/upgrade/preview/route.ts`
- Execute: `/api/subscription/upgrade/execute/route.ts`
- Webhook: `/api/webhook/razorpay/subscription/route.ts`
- Frontend: `/components/subscription/upgrade-dialog.tsx`

### Documentation
- **1.2.7_CORRECTED_UPGRADE_FINAL_FLOW.md** - Complete implementation guide
- **23B_RAZORPAY_UPDATE_IMMEDIATE_PRORATION.md** - Proration examples

---

## Downgrade Flow (1.2.4)

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
6. If over limits → Activate 14-day grace period
7. After grace → Auto-archive excess resources
```

### Critical Rules
- ✅ Always schedule for `cycle_end` (never immediate)
- ✅ No validation blocking (allow scheduling always)
- ✅ Grace period: 14 days after cycle end
- ✅ User keeps current plan until paid period ends
- ✅ Email reminders: Day 0, 7, 3, 1
- ✅ Auto-enforcement on Day 14

### Grace Period System
```
Cycle End → Check usage vs new limits
  ├─> Within limits → Apply downgrade ✅
  └─> Over limits → Activate grace period
      ├─> Day 0: Send activation email
      ├─> Day 7: Reminder email
      ├─> Day 3: Urgent reminder
      ├─> Day 1: Final warning
      └─> Day 14: Auto-archive excess + email
```

### Implementation Files
- Preview: `/api/subscription/downgrade/preview/route.ts`
- Schedule: `/api/subscription/downgrade/schedule/route.ts`
- Cancel: `/api/subscription/downgrade/cancel-scheduled/route.ts`
- Webhook: `/api/webhook/razorpay/subscription/route.ts`
- Cron: `/api/cron/enforce-grace-periods/route.ts`
- Frontend: `/components/subscription/downgrade-dialog.tsx`

### Documentation
- **1.2.4_CORRECTED_DOWNGRADE_FINAL_FLOW.md** - Complete implementation guide
- **23_RAZORPAY_UPDATE_SUBSCRIPTION.md** - Official UPDATE API

---

## Razorpay Documentation Reference

### Core Documents
1. **Part 23**: Update Subscription API (base method)
2. **Part 23B**: Immediate Update & Proration Details (NEW!)
3. **Part 31**: Webhook Overview
4. **Part 32**: subscription.authenticated & subscription.activated
5. **Part 18**: Subscription Entity

### Key API Parameters
```typescript
// Upgrade (immediate)
await razorpay.subscriptions.update(subscriptionId, {
  plan_id: newPlanId,
  schedule_change_at: 'now',     // Apply immediately
  customer_notify: true           // Razorpay sends emails
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

### subscription.updated (For Both Upgrade & Downgrade)

```typescript
async function handleSubscriptionUpdated(subscription: any) {
  const dbSub = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId: subscription.id }
  });

  const newPlan = await prisma.subscriptionPlan.findUnique({
    where: { razorpayPlanId: subscription.plan_id }
  });

  const isUpgrade = Number(newPlan.price) > Number(dbSub.plan.price);

  if (isUpgrade) {
    // UPGRADE: Payment already confirmed
    // Just update database
    await updateSubscriptionPlan(dbSub.id, newPlan.id);
    await sendUpgradeSuccessEmail(dbSub.userId);
  } else {
    // DOWNGRADE: Check if grace period needed
    const usage = await getCurrentUsage(dbSub.userId);
    
    if (usage.products > newPlan.maxProducts) {
      // Activate grace period
      await activateGracePeriod({
        subscriptionId: dbSub.id,
        gracePeriodEnd: addDays(new Date(), 14),
        excessProducts: usage.products - newPlan.maxProducts
      });
      await sendGracePeriodEmail(dbSub.userId);
    } else {
      // Within limits, apply downgrade
      await updateSubscriptionPlan(dbSub.id, newPlan.id);
      await sendDowngradeSuccessEmail(dbSub.userId);
    }
  }
}
```

---

## Common Pitfalls & Solutions

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
    gracePeriodWarning: `You'll have 14 days after cycle end to reduce to ${newPlan.maxProducts} products`
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

### Upgrade Testing
- [ ] Preview shows correct charge amount
- [ ] Minimum ₹0.50 difference validated
- [ ] Charge amount matches proration formula
- [ ] Payment success → webhook fires → database updated
- [ ] Payment failure → no webhook → stays on old plan
- [ ] User notification sent on success
- [ ] Error handling for card declined
- [ ] New limits available immediately

### Downgrade Testing
- [ ] Usage check doesn't block scheduling
- [ ] Scheduled change tracked in database
- [ ] User can cancel scheduled change
- [ ] At cycle end → webhook fires
- [ ] Within limits → downgrade applied
- [ ] Over limits → grace period activated
- [ ] Grace period emails sent (Day 0, 7, 3, 1)
- [ ] Day 14 → auto-archive excess resources
- [ ] User can manually select which to keep

---

## Deployment Checklist

### Backend
- [ ] All API endpoints implemented
- [ ] Webhook handler updated
- [ ] Grace period cron job configured
- [ ] Email templates created
- [ ] Database migrations run
- [ ] Environment variables set

### Frontend
- [ ] Upgrade dialog with preview
- [ ] Downgrade dialog with grace period warning
- [ ] Loading states and error handling
- [ ] Success/failure notifications
- [ ] Grace period UI indicators
- [ ] Manual resource selection for cleanup

### Infrastructure
- [ ] Webhook URL configured on Razorpay
- [ ] Webhook signature verification working
- [ ] Cron job scheduled (daily at midnight)
- [ ] Email service configured
- [ ] Monitoring and logging enabled

---

## Quick Reference Links

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
**Maintainer**: ShopPulse Team  
**Status**: Production Ready ✅
