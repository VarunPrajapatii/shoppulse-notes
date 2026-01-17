# Phase 4: Subscription Lifecycle & Edge Cases - Complete Implementation Guide

## 📋 Overview

This document covers advanced subscription scenarios, payment failures, grace periods, and subscription expiry flows according to industry standards and Razorpay's behavior.

---

## 🎯 Current Implementation Status

### ✅ What's Already Working

1. **Trial Period Flow**
   - User signs up → 7-day trial starts
   - Trial expires → Cron job marks as EXPIRED
   - User can upgrade anytime (during or after trial)

2. **Subscription Creation**
   - User upgrades from trial → Razorpay subscription created
   - First payment → `subscription.authenticated` webhook
   - Recurring payments → `subscription.charged` webhook

3. **Database Sync**
   - Webhook updates subscription with Razorpay data
   - Payment records created for each charge
   - SubscriptionHistory tracks all changes

---

## 🔄 Scenario 1: Paid Subscription Completes Successfully (12 Months)

Already Implemented ✅

---

#### **Create New Cron Job: Expire Completed Subscriptions**

**File:** `src/app/api/cron/expire-completed-subscriptions/route.ts`

Already Implemented ✅


---

### **Complete Flow Timeline:**

```
Nov 8, 2025  - Subscribe to Monthly (12 months)
             - Status: ACTIVE
             - currentPeriodEnd: Dec 8, 2025
             
Dec 8, 2025  - 1st recurring charge
to           - Status: ACTIVE
Oct 8, 2026  - currentPeriodEnd updates monthly

Nov 8, 2026  - 12th (final) charge
             - Webhook: subscription.charged
             - Status: ACTIVE
             - currentPeriodEnd: Dec 8, 2026
             
Nov 8, 2026  - Webhook: subscription.completed
(same day)   - Status: ACTIVE → COMPLETING ✅
             - User still has access until Dec 8
             - Show renewal banner in dashboard
             
Dec 8, 2026  - Cron job runs
             - Status: COMPLETING → EXPIRED
             - Block dashboard access
             - Redirect to /subscription/plans
             - Send renewal email
```

---

## 🔄 Scenario 2: Payment Failure with Smart Detection (IMPLEMENTED ✅)

### **Timeline Example:**

```
Nov 8, 2025  - User subscribes to Monthly plan
             - 1st payment successful
             - currentPeriodEnd: Dec 8, 2025
             
Dec 8, 2025  - Razorpay attempts auto-charge
             - ❌ Payment fails (insufficient balance)
             - NO webhook yet (Razorpay will retry)
             - currentPeriodEnd stays Dec 8 (not updated)
             
Dec 9, 2025  - Cron job runs (/api/cron/expire-trials)
             - Detects: currentPeriodEnd (Dec 8) < now (Dec 9)
             - Logic: "Period ended but still ACTIVE = Payment failed!"
             - Status: ACTIVE → PAST_DUE ⭐
             - User: Keeps full access + warning banner
             - gracePeriod flag set to true
             
Dec 9-14     - Razorpay retry attempts (automatic, 5-7 days)
             - Status: PAST_DUE
             - User: Full access + urgent warnings
             - User can update payment method
             
Dec 14, 2025 - ✅ Payment succeeds (within Razorpay's retry period)
             - Webhook: subscription.charged
             - Status: PAST_DUE → ACTIVE ✅
             - currentPeriodEnd updates to Jan 8
             - User: Normal access, warnings disappear
             
OR

Dec 15, 2025 - All Razorpay retries failed
             - Webhook: subscription.halted
             - Status: PAST_DUE → EXPIRED ❌
             - User: BLOCKED immediately
             - isActive set to false
```

---

### **Understanding Razorpay's Behavior**

#### **Razorpay's Automatic Retry Logic:**

```
Dec 8, 2025  - Attempt 1: Immediate charge ❌
Dec 8, 2025  - Attempt 2: 6 hours later ❌
Dec 9, 2025  - Attempt 3: 24 hours later ❌
Dec 10, 2025 - Attempt 4: 48 hours later ❌
Dec 12, 2025 - Attempt 5: 96 hours later ❌
Dec 14, 2025 - Attempt 6: 144 hours later ❌

After 5-7 days: Razorpay gives up → subscription.halted
```

**Important:** Razorpay's retry schedule is automatic and cannot be controlled by you.

---

### **What Razorpay Sends When Payment Succeeds (Dec 14)**

```json
{
  "event": "subscription.charged",
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_ABC123",
        "status": "active",
        "paid_count": 2,
        "remaining_count": 10,
        "charge_at": 1736294400,  // Jan 8, 2026 (next charge)
        "current_start": 1733616000,  // Dec 8, 2025 ⭐
        "current_end": 1736294400     // Jan 8, 2026 ⭐
      }
    },
    "payment": {
      "entity": {
        "id": "pay_XYZ789",
        "created_at": 1734134400  // Dec 14, 2025 (actual payment date)
      }
    }
  }
}
```

**🎯 Key Insight:**
- `current_start`: Dec 8 (original charge date)
- `current_end`: Jan 8 (one month from original date)
- `payment.created_at`: Dec 14 (actual payment date)

**This is CORRECT behavior!** ✅

---

### **Grace Period Strategy (FINALIZED ✅)**

**Decision Made:** Use Razorpay's automatic retry period (5-7 days) as the ONLY grace period.

**Why this approach:**
- ✅ No free service abuse (no double grace period)
- ✅ Simple implementation
- ✅ When user resubscribes, they pay for full month
- ✅ Razorpay handles all retry logic automatically

**Rejected Alternative:** Adding additional grace periods (7/14/28 days after Razorpay retries) would give users too much free service.

---

### **Smart Payment Failure Detection (IMPLEMENTED ✅)**

**Cron Job: `/api/cron/expire-trials`** (Enhanced to detect payment failures)

**How it works:**

**Part 1: Expire Trials (existing functionality)**
```typescript
// Finds trials where period ended
WHERE status = 'ACTIVE' 
  AND currentPeriodEnd < now
  AND user.trialUsed = false

// Action: ACTIVE → EXPIRED
// Block user access (isActive = false)
```

**Part 2: Detect Payment Failures (NEW! ⭐)**
```typescript
// Finds paid subscriptions where payment likely failed
WHERE status = 'ACTIVE'
  AND currentPeriodEnd < now
  AND razorpaySubscriptionId IS NOT NULL  // Has paid subscription
  AND user.trialUsed = true              // Not a trial

// Logic: If period ended but no webhook fired → Payment failed!
// Action: ACTIVE → PAST_DUE
// User keeps access (isActive stays true)
// Sets gracePeriod flag for UI warnings
```

**Why this works:**
- ✅ When payment succeeds → `subscription.charged` webhook updates `currentPeriodEnd`
- ✅ When payment fails → No webhook → `currentPeriodEnd` stays old
- ✅ Cron detects: `currentPeriodEnd < now` = Payment must have failed!

---

**Dashboard Access Control (IMPLEMENTED ✅)**

---

## 📊 Complete Payment Failure Flow (IMPLEMENTED ✅)

### **Timeline:**
```
Dec 8, 2025 (00:00): Payment due
  ↓ Razorpay attempts charge
  ↓ FAILS
  ↓ No webhook fires (no subscription.charged event)
  ↓
Dec 9, 2025 (00:00): Cron job runs
  ↓ Detects: currentPeriodEnd < now && status='ACTIVE'
  ↓ Logic: If payment succeeded, webhook would have updated currentPeriodEnd
  ↓ Therefore: Payment MUST have failed!
  ↓
  ✅ Sets status = 'PAST_DUE'
  ✅ Sets gracePeriod = true
  ✅ User KEEPS ACCESS (isActive stays true)
  ↓
Dec 9-15: Razorpay retry period (5-7 days)
  ↓ Razorpay keeps trying to charge
  ↓ User sees warning banner
  ↓ User can update payment method
  ↓
  Either:
    A) Payment succeeds → subscription.charged webhook → PAST_DUE → ACTIVE
    B) All retries fail → subscription.halted webhook → PAST_DUE → EXPIRED
```

### **Why No Double Grace Period:**
❌ **Bad Approach:** Razorpay retries (5-7 days) + Additional grace (7-28 days) = 12-35 days free service
✅ **Our Approach:** Razorpay retries (5-7 days) = ONLY grace period

**Reason:** Prevents users from:
1. Getting 2+ weeks free service after payment fails
2. Canceling card → Using app free → Resubscribing with new card
3. Exploiting system for free extended access

---

## 🎯 Payment Success After Failure

### **Timeline:**

```
Dec 8, 2025  - Auto-charge fails
             - Status: ACTIVE (cron hasn't run yet)
             - User: Full access, no warnings
             
Dec 9, 2025  - Cron detects failure
             - Status: ACTIVE → PAST_DUE
             - User: Full access + warning banner
             
Dec 9-14     - Razorpay retry attempts (automatic)
             - Status: PAST_DUE
             - User: Full access + urgent warnings
             - User can update payment method
             
Dec 14       - ✅ Payment succeeds
             - Webhook: subscription.charged
             - Status: PAST_DUE → ACTIVE ✅
             - Period: Dec 8 - Jan 8 (correct!)
             - User: Full access, warnings disappear
             
OR

Dec 15       - All retries failed
             - Webhook: subscription.halted
             - Status: PAST_DUE → EXPIRED ❌
             - User: BLOCKED immediately (no additional grace)
             - Redirect to /subscription/plans
```

## 📅 Complete Timeline (Your Perfect Flow!)

```
Dec 8, 00:00 - Payment due date (currentPeriodEnd)
             - Razorpay attempts charge → FAILS ❌
             - No webhook fired yet
             - Status: ACTIVE
             - User: Full access (unaware)

Dec 8, 12:00 - Razorpay retry attempt #2
             - Still failing
             - currentPeriodEnd still Dec 8 (not updated)

Dec 9, 02:00 - Cron job runs (daily)
             - Checks: status='ACTIVE' AND currentPeriodEnd < now
             - Finds subscription with Dec 8 period end
             - Logic: "Period ended but still ACTIVE = Payment failed!"
             - Action: Status ACTIVE → PAST_DUE ⭐
             - Sets user.gracePeriod = true
             - User: KEEPS ACCESS ✅

Dec 9, 08:00 - User logs into dashboard
             - Sees banner: "⚠️ Payment failed! Update payment method"
             - Can still use all features
             - Can update payment method

Dec 9-15     - Status: PAST_DUE
             - Razorpay continues retrying (automatic)
             - User: Full access + warning banner
             - If payment succeeds:
               → subscription.charged webhook fires
               → Status: PAST_DUE → ACTIVE ✅
               → currentPeriodEnd updates to Jan 8
               → Banner disappears

Dec 15       - All Razorpay retries failed (5-7 days total)
             - Webhook: subscription.halted
             - Status: PAST_DUE → EXPIRED ❌
             - User: BLOCKED from dashboard
             - user.isActive = false
```

---

## 📋 Implementation Checklist

### **Email Notifications (PENDING ⏳):**
- [ ] ⏳ Trial expiring (2 days before)
- [ ] ⏳ Trial expired (day of expiry)
- [ ] ⏳ Payment failed (when cron detects → PAST_DUE)
- [ ] ⏳ Subscription completing (7 days before period end)
- [ ] ⏳ Subscription expired (when halted webhook fires)
- [ ] ⏳ Payment successful after failure (charged webhook after PAST_DUE)

### **User Features (PENDING ⏳):**
- [ ] ⏳ Payment method update page
- [ ] ⏳ Manual retry button for failed payments (reactivate subscription)
- [ ] ⏳ Reactivation flow for expired subscriptions
- [ ] ⏳ Renewal flow for completed subscriptions

---

### **4. Subscription Status Flow**
**Timeline:**
```
ACTIVE (normal operation)
   ↓ Payment fails (detected by cron)
PAST_DUE (user keeps access, sees warnings, Razorpay retrying)
   ↓ Payment succeeds OR all retries fail
ACTIVE (success) OR EXPIRED (failure - blocked immediately)
```

**COMPLETING Flow:**
```
ACTIVE (12th/final payment succeeds)
   ↓ subscription.completed webhook
COMPLETING (user keeps access until currentPeriodEnd)
   ↓ Cron job after currentPeriodEnd
EXPIRED (redirect to renewal page)
```
