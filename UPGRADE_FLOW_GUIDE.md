# Subscription Upgrade Flow - Complete Guide

> **Quick Reference**: Understand how immediate upgrades work with Razorpay subscriptions, including error handling and non-card payment method failures.

---

## 🎯 Overview

When a user upgrades their subscription, we use Razorpay's **UPDATE API** for immediate upgrades (no waiting for billing cycle). The system handles three different scenarios:
1. ✅ **Successful Upgrade** - Instant plan change with prorated billing
2. ⚠️ **Payment Failure (Card)** - Retry with payment method update
3. ❌ **Payment Failure (UPI/eMandate)** - Cancel and resubscribe flow

---

## 📂 File Structure

```
src/
├── app/(dashboard)/subscription/
│   ├── components/
│   │   ├── upgrade-dialog.tsx          # Main upgrade UI + error handling
│   │   └── upgrade-intent-banner.tsx   # Shows after cancellation
│   └── plans/
│       ├── page.tsx                     # Plans list + banner integration
│       └── components/
│           └── plan-card.tsx            # Individual plan card (with auto-scroll ID)
│
└── app/api/subscription/
    ├── upgrade/execute/route.ts         # Calls Razorpay UPDATE API
    ├── cancel/route.ts                  # Cancels subscription (immediate/period-end)
    └── current/route.ts                 # Gets current subscription status
```

---

## 🔄 Flow 1: Successful Upgrade (Happy Path)

### Step 1: User clicks "Upgrade" button
- Location: `plan-card.tsx` → Opens `upgrade-dialog.tsx`
- Shows: Current plan, new plan, cost difference

### Step 2: User confirms upgrade
- **Handler**: `handleUpgrade()` in `upgrade-dialog.tsx`
- **API Call**: `POST /api/subscription/upgrade/execute`
  ```typescript
  { newPlanId: string }
  ```

### Step 3: Backend processes upgrade
- **File**: `upgrade/execute/route.ts`
- **Action**: Calls Razorpay `PATCH /subscriptions/{id}` with:
  ```typescript
  { plan_id, quantity: 1, schedule_change_at: "now" }
  ```
- **Database Update**:
  ```typescript
  subscription.update({
    planId: newPlanId,
    metadata: {
      webhookSyncStatus: 'PENDING',
      lastApiUpdateAt: new Date().toISOString()
    }
  })
  ```

### Step 4: Webhook confirms upgrade
- **File**: `webhooks/razorpay/updated.ts`
- **Action**: Updates `metadata.webhookSyncStatus = 'SYNCED'`
- **User sees**: Success message, plan updates immediately

---

## ⚠️ Flow 2: Payment Failure - Card Payment Method

### When it happens:
- Card expired
- Card declined
- Insufficient balance

### What we do:
**Currently NOT implemented** (planned for future):
- Show error with "Update Payment Method" button
- Open Razorpay customer portal
- User updates card → retry upgrade

---

## ❌ Flow 3: Payment Failure - UPI/eMandate (Cancel & Resubscribe)

> **Why this flow exists**: Razorpay doesn't allow payment method updates for UPI/eMandate. Only option is to cancel and create a new subscription.

### Step 1: Upgrade attempt fails
- **Detection**: `upgrade-dialog.tsx` catches error from API
- **Error parsing**: Checks for keywords:
  ```typescript
  "payment method", "upi", "emandate", "card expired",
  "card declined", "insufficient balance"
  ```

### Step 2: Show Payment Failure Dialog
- **Component**: `upgrade-dialog.tsx` → Payment Failure Dialog
- **Shows**:
  - ⚠️ Warning: Cannot update payment method
  - 💳 Lost credits: Calculated from prorationDetails
  - 🔄 Option: "Cancel & Resubscribe"

### Step 3: User clicks "Cancel & Resubscribe"
- **Handler**: `handleCancelAndResubscribe()` in `upgrade-dialog.tsx`
- **Actions**:
  1. Calculate lost credits from `prorationDetails.credit_amount`
  2. Store upgrade intent in localStorage:
     ```typescript
     {
       newPlanId: string,
       newPlanName: string,
       lostCredit: number,
       reason: string,
       timestamp: string
     }
     ```
  3. Call cancel API: `POST /api/subscription/cancel`
     ```typescript
     { immediate: true, reason: "upgrade_payment_failed" }
     ```
  4. Redirect to `/subscription/plans?upgrade={planId}&cancelled=true`

### Step 4: Cancel subscription (immediate)
- **File**: `cancel/route.ts`
- **Actions**:
  1. Cancel at Razorpay: `POST /subscriptions/{id}/cancel`
     ```typescript
     { cancel_at_cycle_end: 0 }  // Immediate cancellation
     ```
  2. Unlink user from subscription:
     ```typescript
     user.update({ subscriptionId: null })
     ```
  3. Create history record (status: "cancelled")
  4. Keep subscription row in database for history

### Step 5: User redirected to plans page
- **File**: `plans/page.tsx`
- **Banner shows**: `upgrade-intent-banner.tsx`
- **Reads**: localStorage + query params (`upgrade=planId&cancelled=true`)
- **Displays**:
  ```
  ⚠️ Your previous subscription was cancelled
  💰 You lost ₹X in unused credits
  🎯 Complete your upgrade to [Plan Name]
  ↓ (Auto-scrolls to target plan)
  ```

### Step 6: Auto-scroll to target plan
- **Component**: `upgrade-intent-banner.tsx`
- **Mechanism**:
  ```typescript
  setTimeout(() => {
    document.getElementById(`plan-${planId}`)?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    })
  }, 500)
  ```
- **Target**: `plan-card.tsx` has `id="plan-{planId}"` on Card element

### Step 7: User subscribes to new plan
- **Action**: Clicks "Subscribe" on target plan
- **Flow**: Normal subscription creation flow
- **Cleanup**: `upgrade-intent-banner.tsx` clears localStorage on unmount

---

## 🔍 Technical Details

### Webhook Sync Status Tracking
- **Purpose**: Know when Razorpay webhook has confirmed the upgrade
- **Storage**: `subscription.metadata.webhookSyncStatus`
- **Values**:
  - `PENDING` - Upgrade API called, waiting for webhook
  - `SYNCED` - Webhook received, database in sync
  - `null/undefined` - Direct subscription creation (no upgrade)

### Why metadata.webhookSyncStatus?
- Schema doesn't have `webhookSyncStatus` field
- Adding new fields requires migration
- Using JSON `metadata` field is flexible
- Reading: `(subscription.metadata as any)?.webhookSyncStatus || 'SYNCED'`

### Last API Update Tracking
- **Storage**: `subscription.metadata.lastApiUpdateAt`
- **Purpose**: Track when we last called Razorpay UPDATE API
- **Format**: ISO timestamp string
- **Use case**: Debugging, audit trail

### Credit Loss Calculation
```typescript
const lostCredit = prorationDetails.credit_amount / 100  // Paise to Rupees
```
- Razorpay returns amount in paise (₹1 = 100 paise)
- This is the unused amount from current billing cycle
- User loses this credit when cancelling immediately

---

## 🎨 UI Components

### Upgrade Dialog (`upgrade-dialog.tsx`)
**States**:
- `isOpen` - Dialog visibility
- `isUpgrading` - Loading state during API call
- `showPaymentFailureDialog` - Shows cancel & resubscribe option
- `paymentFailureReason` - Stores error message

**Dialogs**:
1. **Main Upgrade Confirmation**
   - Shows plan comparison
   - "Upgrade Now" button
2. **Payment Failure Dialog**
   - Warning card with credit loss
   - "Cancel & Resubscribe" button
   - "Go Back" button

### Upgrade Intent Banner (`upgrade-intent-banner.tsx`)
**Triggers**: Query params `upgrade=planId&cancelled=true`

**Reads**: localStorage key `subscription_upgrade_intent`

**Displays**:
- Alert with warning icon
- Lost credit amount (₹X)
- Target plan name
- Auto-scroll to plan after 500ms

**Cleanup**: Clears localStorage on unmount (after subscription)

### Plan Card (`plan-card.tsx`)
**ID**: `id="plan-{plan.id}"` on Card element

**Purpose**: Auto-scroll target for upgrade intent banner

---

## 🧪 Testing Checklist

### Test Successful Upgrade
1. ✅ Create test subscription (any plan)
2. ✅ Click "Upgrade" on higher plan
3. ✅ Confirm upgrade
4. ✅ Verify plan updates in UI
5. ✅ Check database: `metadata.webhookSyncStatus = 'PENDING'`
6. ✅ Trigger webhook manually
7. ✅ Verify: `metadata.webhookSyncStatus = 'SYNCED'`

### Test Payment Failure (Card - Future)
1. ⏳ Use test card that fails
2. ⏳ Verify error dialog shows
3. ⏳ Click "Update Payment Method"
4. ⏳ Update card → retry upgrade

### Test Cancel & Resubscribe (UPI/eMandate)
1. ✅ Create UPI subscription in test mode
2. ✅ Attempt upgrade (should fail)
3. ✅ Verify payment failure dialog shows
4. ✅ Check credit loss calculation
5. ✅ Click "Cancel & Resubscribe"
6. ✅ Verify redirect to plans page
7. ✅ Verify banner displays with correct info
8. ✅ Verify auto-scroll to target plan
9. ✅ Complete new subscription
10. ✅ Verify localStorage cleared
11. ✅ Verify old subscription cancelled at Razorpay
12. ✅ Verify user unlinked from old subscription

---

## 🚨 Important Notes

### Credit Loss is Unavoidable
- Razorpay limitation: Cannot transfer credits to new subscription
- User must be informed clearly before cancelling
- Lost amount = unused credits from current billing cycle

<!-- NOTE: Didnt understood this point -->
### History Preservation
- Old subscription row remains in database
- User unlinked: `user.subscriptionId = null`
- New subscription gets new Razorpay ID
- History broken at Razorpay level (unavoidable)

### Payment Method Reuse
- Same customer ID used for new subscription
- Payment methods preserved (UPI linked accounts, eMandate registrations)
- No need to re-authenticate payment method

### localStorage Bridge
- Stores upgrade intent during cancellation
- Survives page redirect
- Cleared after new subscription
- Fallback: Query params (`upgrade` + `cancelled`)

---

## 🔮 Future Enhancements

1. **Card Payment Method Update**
   - Implement Razorpay customer portal integration
   - Retry upgrade after card update
   - No credit loss

2. **Downgrade Flow**
   - Currently no downgrade support
   - Would need period-end cancellation + new subscription
   - Complex credit calculation

3. **Partial Credit Transfer**
   - Research if Razorpay allows manual credit adjustment
   - Apply remaining credits to new subscription
   - Requires Razorpay support investigation

---

## 📚 Related Documentation

- [Subscription Complete Flow](./SUBSCRIPTION_COMPLETE_FLOW.md)
- [Subscription Implementation Checklist](./SUBSCRIPTION_IMPLEMENTATION_CHECKLIST.md)
- [Razorpay Subscriptions API](https://razorpay.com/docs/api/subscriptions/)
- [Clerk Webhook Guide](./clerk/CLERK_WEBHOOK_DEEP_DIVE.md)

---

**Last Updated**: November 27, 2025  
**Status**: ✅ Core implementation complete, testing pending
