# Subscription Renewal Strategies - Industry Standards

## 🎯 Your Scenario

**Setup:**
- Monthly plan: ₹999/month
- Total charges: 12 (one year of monthly charges)
- Nov 8, 2025 - Nov 8, 2026

**What happens after 12 months?**

---

## 📊 Industry Standard Approaches

### **Approach 1: Fixed-Term Subscription (What You Have Now)**

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
```
1. Update plan price in database
2. Create new Razorpay plan with new price (or update existing)
3. Old subscriptions complete at old price
4. New subscriptions use new price
5. No migration needed! ✅
```

### **Next Steps:**

**Immediate (Required):**
- [ ] Update `/subscription/plans` UI for expired users
- [ ] Add renewal reminder email (7 days before)
- [ ] Test complete flow: subscribe → 12 months → complete → renew

**Phase 2 (Optional):**
- [ ] Add auto-renewal toggle
- [ ] Implement auto-renewal in webhook
- [ ] Add cancellation flow

**Phase 3 (Future):**
- [ ] Consider infinite subscriptions
- [ ] Grandfather policy for price changes

---

## 🔍 Your Specific Questions Answered

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
**Keep your current fixed-term approach!** It's perfect for your use case, handles price changes elegantly, and is simpler to implement and maintain.

When you're bigger and pricing is stable, consider adding auto-renewal as an **option** (not replacement).
