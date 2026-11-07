# Subscription Renewal Strategies - Industry Standards

## 🎯 Your Scenario

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Outdated — pricing and model are wrong
> - 📝 **REALITY**: Actual pricing is Trial: ₹0/7d, Monthly: ₹3,500, HalfYearly: ₹19,000, Yearly: ₹38,500. We use Razorpay recurring auto-charge (essentially Approach 2), NOT fixed-term with totalCount=12. `totalCount` can be fixed or null.
> - 🎯 **ACTION**: Update pricing and scenario to match actual plans
> - 💡 **INDUSTRY**: Most SaaS uses truly recurring (Netflix, Stripe default)

**Setup:**
- Monthly plan: ₹999/month
- Total charges: 12 (one year of monthly charges)
- Nov 8, 2025 - Nov 8, 2026

**What happens after 12 months?**

---

## 📊 Industry Standard Approaches

### **Approach 1: Fixed-Term Subscription (What You Have Now)**

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Outdated — the "(What You Have Now)" label is WRONG
> - 📝 **REALITY**: We do NOT use fixed-term manual renewal. We use Razorpay recurring subscriptions with auto-charge. `subscription.charged` webhook handles recurring payments automatically. On completion (`subscription.completed`), status → COMPLETING → cron expires at period end. But the core billing is auto-charge by Razorpay, not manual renewal by user.
> - 🎯 **ACTION**: Keep as reference for the fixed-term pattern, but REMOVE the "(What You Have Now)" label. Our approach is closer to Approach 2.
> - 💡 **INDUSTRY**: Adobe CC annual, Microsoft 365 annual use this pattern

**How it works:**
```
Nov 8, 2025  - User subscribes
             - Creates Razorpay subscription with totalCount=12
             
Nov 8, 2026  - 12th payment successful
             - Webhook: subscription.completed
             - Status: COMPLETING
             - currentPeriodEnd: Dec 8, 2026
             
Dec 8, 2026  - Period ends
             - Status: EXPIRED
             - User BLOCKED
             - Razorpay subscription: COMPLETED (cannot charge again)
```

**What user must do:**
- Visit dashboard
- See: "Subscription expired. Choose a plan to renew."
- Click "Renew" → Creates NEW Razorpay subscription
- New subscription ID, fresh 12 charges

**Pros:**
- ✅ Clear end date
- ✅ User actively chooses to renew
- ✅ You can adjust pricing at renewal
- ✅ User can switch plans

**Cons:**
- ❌ Manual renewal required (friction)
- ❌ Some users forget → Churn
- ❌ Gap in service if user delays

**Examples:** Adobe CC (annual plans), Microsoft 365 (annual)

---

### **Approach 2: Truly Recurring Subscription (Infinite Charges)**

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: This is essentially what we ACTUALLY implement
> - 📝 **REALITY**: Razorpay auto-charges the customer's saved payment method each cycle. Key webhooks: `charged.ts` (success → updates period, archives usage via `archiveAndResetPeriod`, sends notification), `pending.ts` (awaiting bank, status stays ACTIVE), `halted.ts` (all retries failed → expires immediately), `completed.ts` (all cycles done → COMPLETING, cron expires at period end). No manual renewal process at all.
> - 🎯 **ACTION**: Annotate this section as "OUR CURRENT APPROACH" — this describes what we do
> - 💡 **INDUSTRY**: Netflix, Spotify, GitHub, most SaaS — this is the dominant model

**How it works:**
```typescript
// When creating subscription
const subscription = await razorpay.subscriptions.create({
  plan_id: 'plan_monthly',
  customer_notify: 1,
  total_count: 9999, // ⭐ Very high number = "infinite"
  quantity: 1
});
```

**Timeline:**
```
Nov 8, 2025  - Subscribe (totalCount=9999)
Dec 8, 2025  - 2nd charge
Jan 8, 2026  - 3rd charge
...
Nov 8, 2026  - 13th charge (continues!)
Dec 8, 2026  - 14th charge (continues!)
...forever until user cancels
```

**User cancellation:**
- User clicks "Cancel Subscription"
- Calls Razorpay API: `razorpay.subscriptions.cancel(subscriptionId)`
- Webhook: `subscription.cancelled`
- User keeps access until `currentPeriodEnd`

**Pros:**
- ✅ True auto-renewal (no action needed)
- ✅ Lower churn (users forget to cancel = good for business)
- ✅ Standard SaaS model (Netflix, Spotify)

**Cons:**
- ❌ Cannot change pricing for existing users easily
- ❌ Must grandfather old users at old price
- ❌ Need migration strategy for price changes

**Examples:** Netflix, Spotify, GitHub, most SaaS

---

### **Approach 3: Hybrid (Auto-Renew with Confirmation)**

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Not implemented — theoretical reference only
> - 📝 **REALITY**: We do NOT create a new subscription at completion. We do NOT send renewal reminder emails from our side (Razorpay sends its own). We have no renewal confirmation flow. The `completed.ts` webhook sets COMPLETING, and the `expire-period-ended-subscriptions` cron handles expiry. No hybrid logic exists.
> - 🎯 **ACTION**: Keep as future reference only — could be useful if we ever move to fixed totalCount with auto-renewal
> - 💡 **INDUSTRY**: Amazon Prime, Costco memberships use this pattern

**How it works:**
```
Nov 8, 2025  - Subscribe (totalCount=12)
Oct 8, 2026  - 30 days before expiry
             - Send email: "Renewing on Nov 8 at ₹999/month"
             - Show banner: "Auto-renewing in 30 days"
             - User can cancel if they want
             
Nov 8, 2026  - 12th payment
             - Webhook: subscription.completed
             - Automatically create NEW subscription
             - New subscription ID, fresh 12 charges
             - Seamless transition
```

**Implementation:**
```typescript
// In subscription.completed webhook
async function handleSubscriptionCompleted(subscription, subscriptionEntity) {
  // Check if user wants auto-renewal
  if (subscription.autoRenew && subscription.canceledAt === null) {
    // Create new subscription with same plan
    const newRazorpaySubscription = await razorpay.subscriptions.create({
      plan_id: subscription.plan.razorpayPlanId,
      customer_id: subscription.user.razorpayCustomerId,
      total_count: 12,
      quantity: 1,
      customer_notify: 1
    });

    // Update existing subscription record
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        razorpaySubscriptionId: newRazorpaySubscription.id,
        paidCount: 0,
        remainingCount: 12,
        currentPeriodStart: new Date(newRazorpaySubscription.current_start * 1000),
        currentPeriodEnd: new Date(newRazorpaySubscription.current_end * 1000)
      }
    });
  } else {
    // User opted out of auto-renewal
    // Keep as COMPLETING until period ends
  }
}
```

**Pros:**
- ✅ Automatic renewal (lower churn)
- ✅ User control (can opt-out)
- ✅ Can adjust pricing at renewal
- ✅ 30-day notice period (transparent)

**Cons:**
- ❌ More complex implementation
- ❌ Need to handle price changes
- ❌ Edge cases (payment method expired)

**Examples:** Amazon Prime, Costco, gym memberships

---

## 💰 Handling Price Changes

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Not implemented — we haven't dealt with price changes yet
> - 📝 **REALITY**: No price migration system exists. No grandfather pricing logic. No mechanism to force-migrate or notify existing subscribers of price changes. Current pricing (₹3,500/₹19,000/₹38,500) has not changed since launch. The scenarios below use the outdated ₹999 figure but the patterns are still valid reference.
> - 🎯 **ACTION**: Keep as future planning reference. Update price examples when implementing.
> - 💡 **INDUSTRY**: Stripe has built-in price migration. Most SaaS grandfather existing users or give 60-day notice with opt-out.

### **Scenario: You increase price from ₹999 to ₹1,499**

#### **Approach 1 (Fixed-Term): Easy**
```
Existing users on ₹999:
- Complete their 12 months at ₹999
- At renewal (Dec 8, 2026): Show new price ₹1,499
- User decides: Renew at new price or cancel

No technical changes needed! ✅
```

#### **Approach 2 (Infinite): Grandfather Policy**
```
Strategy A: Grandfather old users
- Users who subscribed before Jan 1, 2026: ₹999 forever
- New users after Jan 1, 2026: ₹1,499
- Keep two Razorpay plans (old + new)

Strategy B: Force migration with notice
- 60 days before: Email all users
- "Price increasing to ₹1,499 from [date]"
- Users can cancel before increase
- On date: Cancel old subscriptions, offer new plan

Strategy C: Discount for existing users
- Old users: ₹1,199 (discounted)
- New users: ₹1,499 (full price)
- Create special "legacy" plan
```

#### **Approach 3 (Hybrid): Built-in Price Updates**
```typescript
// At renewal time (subscription.completed)
const currentPlan = await prisma.subscriptionPlan.findUnique({
  where: { id: subscription.planId }
});

// Create new subscription with CURRENT price
const newSubscription = await razorpay.subscriptions.create({
  plan_id: currentPlan.razorpayPlanId, // ⭐ Uses current plan (might have new price)
  customer_id: user.razorpayCustomerId,
  total_count: 12
});

// User is automatically charged new price at renewal
```

**With 30-day notice:**
```
Oct 8, 2026  - Email: "Renewing on Nov 8 at NEW price ₹1,499"
             - User can cancel if they don't agree
             
Nov 8, 2026  - Auto-renewal at ₹1,499
             - New subscription created
```

---

## 🎯 My Recommendation for Your Project

### **Phase 1: Start with Approach 1 (Fixed-Term) - Current**

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Outdated — we've moved PAST Phase 1. We are already on what this doc calls Phase 2/3.
> - 📝 **REALITY**: We use Razorpay recurring auto-charge (Approach 2). There is no manual renewal process. `subscription.charged` webhook handles successful renewals automatically. The "Keep your current setup" charge counts below are also wrong — our totalCount can be fixed or null, not necessarily 12/4/3.
> - 🎯 **ACTION**: Update to reflect that Phase 1 is COMPLETED and superseded. We skipped directly to truly recurring.
> - 💡 **INDUSTRY**: Most SaaS starts with truly recurring from day one now (Stripe default behavior)

**Why:**
- ✅ Simplest to implement
- ✅ Already done!
- ✅ Easy to change pricing
- ✅ Clear for users
- ✅ Good for early-stage product

**Keep your current setup:**
- Monthly: 12 charges (1 year)
- Half-yearly: 4 charges (2 years)
- Yearly: 3 charges (3 years)

**User flow when subscription completes:**
```
Dec 8, 2026  - Status: EXPIRED
             - Dashboard shows: "Your subscription has ended"
             - CTA: "Renew Now" button
             - Clicking creates NEW subscription
             - Shows CURRENT pricing (can be updated)
```

---

### **Phase 2: Add Auto-Renewal Option (Later)**

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially matches — `autoRenew` field EXISTS but the proposed usage is wrong
> - 📝 **REALITY**: `autoRenew` Boolean @default(true) EXISTS on Subscription model already. However: (1) It is NOT used for actual renewal logic — Razorpay handles auto-charge itself. (2) It's set to false on cancel/pause, true on resume — used as a flag, not a renewal trigger. (3) There is NO auto-renewal toggle in the UI. (4) No `autoRenewPreference` field on User. (5) The webhook code in this section (creating a new sub on completion) is NOT how we work — Razorpay just keeps charging.
> - 🎯 **ACTION**: This phase is conceptually ALREADY DONE via Razorpay auto-charge. The UI toggle and manual new-sub-creation logic are NOT needed. Delete or rewrite as "already implemented via Razorpay recurring".
> - 💡 **INDUSTRY**: Most payment providers (Stripe, Razorpay) handle auto-renewal at the gateway level, not app level

**Database changes:**
```prisma
model Subscription {
  // ... existing fields
  
  autoRenew Boolean @default(true) // ⭐ User can toggle
}

model User {
  // ... existing fields
  
  autoRenewPreference Boolean @default(true) // ⭐ User preference
}
```

**UI changes:**
```tsx
// In subscription settings page
<Toggle
  label="Auto-renew subscription"
  checked={subscription.autoRenew}
  onChange={handleAutoRenewToggle}
/>

<p className="text-sm text-muted-foreground">
  Your subscription will automatically renew on {renewalDate} at {currentPrice}
</p>
```

**Webhook update:**
```typescript
async function handleSubscriptionCompleted(subscription, subscriptionEntity) {
  if (subscription.autoRenew) {
    // Create new subscription automatically
    const newSub = await razorpay.subscriptions.create({...});
    
    // Update database with new subscription
    await prisma.subscription.update({
      data: {
        razorpaySubscriptionId: newSub.id,
        status: 'ACTIVE',
        paidCount: 0,
        remainingCount: 12
      }
    });
    
    // Send email: "Subscription renewed successfully"
  } else {
    // Mark as COMPLETING (manual renewal needed)
    await prisma.subscription.update({
      data: { status: 'COMPLETING' }
    });
    
    // Send email: "Subscription ending on [date]. Renew to continue."
  }
}
```

---

### **Phase 3: Consider Infinite Subscriptions (Future)**

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: Already implemented — this IS our current approach
> - 📝 **REALITY**: We already use Razorpay recurring subscriptions that auto-charge until cancelled. `totalCount` can be null (infinite). Razorpay auto-charges the saved payment method each cycle. `subscription.charged` webhook handles each successful charge. `subscription.halted` handles permanent failure after all retries. This is exactly the Netflix-style billing described here.
> - 🎯 **ACTION**: Mark as DONE. This is not "future" — it's our present.
> - 💡 **INDUSTRY**: This is the standard SaaS model (Netflix, Spotify, GitHub)

**Only if:**
- Your pricing is stable
- You're okay with grandfathering
- You want Netflix-style billing

**Change Razorpay plan creation:**
```typescript
// When creating plan on Razorpay dashboard
{
  "period": "monthly",
  "interval": 1,
  "item": {
    "name": "Monthly Plan",
    "amount": 99900, // ₹999
    "currency": "INR"
  }
  // ⭐ Don't set total_count (infinite by default)
}

// When user subscribes
await razorpay.subscriptions.create({
  plan_id: 'plan_monthly',
  customer_id: user.razorpayCustomerId,
  // ⭐ Don't set total_count
  quantity: 1
});
```

---

## 📋 Implementation Checklist (Phase 1 - Current)

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially correct — completion flow is right but framing is wrong
> - 📝 **REALITY**: The checklist items 1–5 are CORRECT and DONE in code:
>   - ✅ `subscription.completed` webhook fires → `completed.ts` handler
>   - ✅ Status → COMPLETING
>   - ✅ User keeps access until `currentPeriodEnd`
>   - ✅ Cron `expire-period-ended-subscriptions` finds COMPLETING/CANCELED subs past `currentPeriodEnd` → EXPIRED, sets `User.isActive = false`, `Store.isAccessible = false`
>   - ✅ Dashboard blocks access
>   - Item 6 ("User action needed: manual renewal") — this only applies if `totalCount` is fixed and all cycles complete. In practice, most subs auto-charge indefinitely. This path is edge-case, not primary.
> - 🎯 **ACTION**: Reframe as "completion edge-case checklist" not "primary flow". Primary flow is `subscription.charged` recurring.
> - 💡 **INDUSTRY**: Completion flow is a fallback, not the main renewal path in truly recurring models

Your current implementation is CORRECT for fixed-term! ✅

**What happens when subscription completes:**

1. ✅ **Webhook fires:** `subscription.completed`
2. ✅ **Status update:** ACTIVE → COMPLETING
3. ✅ **User keeps access** until `currentPeriodEnd`
4. ✅ **Cron job expires:** COMPLETING → EXPIRED (when period ends)
5. ✅ **Dashboard blocks:** User redirected to `/subscription/plans`
6. ⏳ **User action needed:** Click "Subscribe" to create NEW subscription

**What you need to add:**

### **1. Expired Subscription UI** (`/subscription/plans`)

> **📊 AUDIT (2026-02-18):** 🟡 NOT VERIFIED — need to check if expired-user UI exists in `/subscription/plans`. Likely partially done.
```tsx
// Show different message if user has expired subscription
const expiredSubscription = user.subscription?.status === 'EXPIRED';

{expiredSubscription ? (
  <Alert variant="warning">
    <AlertTitle>Your subscription has ended</AlertTitle>
    <AlertDescription>
      Choose a plan below to renew and regain access to your dashboard.
      {/* Show last plan they had */}
      You were previously on the {user.subscription.plan.name} plan.
    </AlertDescription>
  </Alert>
) : (
  <Alert>
    <AlertTitle>Choose your plan</AlertTitle>
    <AlertDescription>
      Start your subscription to access all features.
    </AlertDescription>
  </Alert>
)}
```

### **2. Renewal Notice Email** (7 days before completion)

> **📊 AUDIT (2026-02-18):** 🔴 NOT IMPLEMENTED — We do NOT send renewal reminder emails. Razorpay sends its own payment notifications. No `send-renewal-reminders` cron exists in our codebase.

```typescript
// New cron job: /api/cron/send-renewal-reminders

export async function GET(req: NextRequest) {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Find subscriptions completing in 7 days
  const expiringSubscriptions = await prismadb.subscription.findMany({
    where: {
      status: 'ACTIVE',
      remainingCount: 1, // Last charge
      currentPeriodEnd: {
        gte: new Date(),
        lte: sevenDaysFromNow
      }
    },
    include: { user: true, plan: true }
  });

  for (const sub of expiringSubscriptions) {
    await sendRenewalReminderEmail(sub.user.email, {
      userName: sub.user.name,
      planName: sub.plan.name,
      expiryDate: sub.currentPeriodEnd,
      renewalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/plans`
    });
  }
}
```

### **3. Highlight Previous Plan**

> **📊 AUDIT (2026-02-18):** 🟡 NOT VERIFIED — need to check if plan highlighting exists on the subscription plans page.
```tsx
// On /subscription/plans, highlight the plan they had
<Card 
  className={subscription.plan.id === plan.id ? 'ring-2 ring-primary' : ''}
>
  {subscription.plan.id === plan.id && (
    <Badge variant="secondary">Your Previous Plan</Badge>
  )}
  {/* Plan details */}
</Card>
```

---

## 🎯 Summary & Recommendations

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Outdated — entire summary is based on wrong premise (fixed-term)
> - 📝 **REALITY**: We use Razorpay recurring auto-charge (Approach 2/3). Summary should say: "Truly recurring subscriptions with Razorpay auto-charge. `subscription.charged` handles renewals. `subscription.halted` handles permanent failure. No manual renewal process. Completion flow is edge-case only."
> - 🎯 **ACTION**: Rewrite summary to reflect actual architecture
> - 💡 **INDUSTRY**: Our current approach matches Netflix/Spotify/GitHub model — industry standard

### **Your Current Setup: PERFECT for Phase 1** ✅

**What you have:**
- Fixed-term subscriptions (12 monthly charges)
- subscription.completed → COMPLETING → EXPIRED
- User must manually renew

**Why it's good:**
- Simple to implement ✅
- Easy to change pricing ✅
- User control ✅
- Standard for annual plans ✅

### **Price Changes: Easy**

> **📊 AUDIT (2026-02-18):** 🔴 **WRONG** — With our truly recurring model, price changes are NOT easy. Existing Razorpay subscriptions keep charging at the old plan price. We have NO price migration system, NO grandfather pricing logic, and NO mechanism to notify/migrate existing subscribers. This section assumed fixed-term where price changes happen naturally at renewal.

```
1. Update plan price in database
2. Create new Razorpay plan with new price (or update existing)
3. Old subscriptions complete at old price
4. New subscriptions use new price
5. No migration needed! ✅
```

### **Next Steps:**

> **📊 AUDIT (2026-02-18):** Checklist status updated against actual codebase:

**Immediate (Required):**
- [ ] Update `/subscription/plans` UI for expired users *(still needed for completion edge-case)*
- [x] ~~Add renewal reminder email~~ → NOT NEEDED. Razorpay sends its own notifications. We chose not to send renewal emails.
- [ ] Test complete flow: subscribe → all cycles done → complete → expire *(edge-case path only)*

**Phase 2 (Optional):** ← ALREADY DONE VIA RAZORPAY
- [x] ~~Add auto-renewal toggle~~ → `autoRenew` field exists but Razorpay handles auto-charge natively. No UI toggle needed.
- [x] ~~Implement auto-renewal in webhook~~ → `subscription.charged` webhook handles this. Razorpay auto-charges.
- [x] ~~Add cancellation flow~~ → Cancel/pause/resume all implemented.

**Phase 3 (Future):** ← ALREADY DONE
- [x] ~~Consider infinite subscriptions~~ → We already use Razorpay recurring with auto-charge (totalCount can be null).
- [ ] Grandfather policy for price changes → NOT DONE. No price migration system exists.

**ACTUAL remaining work:**
- [ ] Price change/migration system
- [ ] Auto-renewal toggle in UI (if we want users to opt-out of auto-charge)
- [ ] Expired subscription UI improvements

---

## 🔍 Your Specific Questions Answered

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially correct but framed for wrong model
> - 📝 **REALITY**: These answers assume fixed-term (Approach 1). Our actual model: (1) `subscription.completed` is an edge-case when all `totalCount` cycles finish — cron expires at period end. (2) Primary renewal is via `subscription.charged` webhook — Razorpay auto-charges, no user action. (3) Price changes are NOT easy with recurring — no migration system exists.
> - 🎯 **ACTION**: Rewrite Q&A to match actual recurring model
> - 💡 **INDUSTRY**: Stripe/Razorpay handle renewal at gateway level, not app level

### **Q1: "What happens after subscription.completed?"**
**A:** User keeps access until `currentPeriodEnd`, then gets blocked. Must manually renew.

### **Q2: "What's industry standard?"**
**A:** Three approaches exist. Your fixed-term approach is standard for annual plans (Adobe, Microsoft 365).

### **Q3: "If I increase price later, how does it work?"**
**A:** With fixed-term (your current setup):
- Existing users finish at old price ✅
- At renewal, they see new price ✅
- They decide: renew or cancel ✅
- **No technical complexity!** ✅

**With infinite subscriptions:**
- Need grandfathering or migration ❌
- More complex ❌
- But lower churn ✅

### **Recommendation:**

> **📊 AUDIT (2026-02-18):** 🔴 **OUTDATED** — We already moved to truly recurring (Approach 2). This recommendation to "keep fixed-term" is moot. Actual recommendation: Stay on Razorpay recurring auto-charge. Build a price migration system when pricing changes. Consider adding an auto-renewal toggle in UI if users request opt-out control.

**Keep your current fixed-term approach!** It's perfect for your use case, handles price changes elegantly, and is simpler to implement and maintain.

When you're bigger and pricing is stable, consider adding auto-renewal as an **option** (not replacement).
