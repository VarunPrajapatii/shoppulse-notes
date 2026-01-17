# UPI/eMandate Upgrade Flow - Implementation Complete

**Date**: November 27, 2025  
**Status**: ✅ IMPLEMENTED - Cancel & Resubscribe Flow

---

## 🎯 What Was Implemented

### Complete Flow for Non-Card Payment Methods

When a user with UPI, eMandate, expired card, or insufficient balance tries to upgrade:

```
User Clicks "Upgrade"
  ↓
Call Razorpay UPDATE API
  ↓
Payment Fails (UPI/eMandate/Card Issue)
  ↓
Show Payment Failure Dialog
  ├─ Display reason (UPI/eMandate/Card Expired/Insufficient Balance)
  ├─ Calculate credit loss (prorated remaining value)
  ├─ Show full new plan cost
  └─ Warn user about consequences
  ↓
User Confirms "Continue & Lose Credit"
  ↓
Cancel Current Subscription (Immediate)
  ├─ Call /api/subscription/cancel with immediate: true
  ├─ Razorpay subscription cancelled
  ├─ Database updated (status: CANCELED)
  ├─ User unlinked from subscription
  └─ History record created
  ↓
Store Upgrade Intent in localStorage
  └─ { newPlanId, newPlanName, lostCredit, reason, timestamp }
  ↓
Redirect to Plans Page
  └─ URL: /subscription/plans?upgrade=planId&cancelled=true
  ↓
Show Upgrade Intent Banner
  ├─ Display: "Complete Your Upgrade"
  ├─ Show lost credit amount
  ├─ Auto-scroll to target plan
  └─ User clicks "Get Started"
  ↓
Normal Subscription Flow
  ├─ Razorpay Checkout opens
  ├─ User pays full price
  ├─ New subscription created
  └─ New Razorpay subscription ID
  ↓
Success - User has new subscription
```

---

## 📁 Files Changed

### 1. **upgrade-dialog.tsx** (Major Update)
- ✅ Added `showPaymentFailureDialog` state
- ✅ Added `paymentFailureReason` state
- ✅ Created `handleCancelAndResubscribe()` function
- ✅ Updated error handlers to trigger payment failure dialog
- ✅ Added Payment Failure Dialog UI with:
  - Credit loss warning card
  - Cancel & resubscribe option card
  - Confirmation button
  - Clear reason display

**Error Detection**: UPI, eMandate, Bank Transfer, Insufficient Balance, Card Declined, Card Expired

### 2. **cancel API** (Enhanced)
**File**: `src/app/api/subscription/cancel/route.ts`

- ✅ Added support for `immediate` cancellation
- ✅ Added `reason` parameter
- ✅ Immediate cancellation flow:
  - Cancels at Razorpay
  - Updates subscription status to CANCELED
  - Sets `cancelAtPeriodEnd: false`
  - Unlinks user from subscription
  - Creates history record
- ✅ Maintains backward compatibility for period-end cancellation

### 3. **upgrade-intent-banner.tsx** (New Component)
**File**: `src/app/(dashboard)/subscription/components/upgrade-intent-banner.tsx`

- ✅ Detects `upgrade` and `cancelled` query params
- ✅ Reads upgrade intent from localStorage
- ✅ Displays completion banner with:
  - Lost credit amount
  - Target plan name
  - Reason for cancellation
- ✅ Auto-scrolls to target plan
- ✅ Clears localStorage when component unmounts

### 4. **plans page** (Updated)
**File**: `src/app/(dashboard)/subscription/plans/page.tsx`

- ✅ Added `UpgradeIntentBanner` component
- ✅ Positioned above disabled notice
- ✅ Shows for cancel+resubscribe flow

### 5. **plan-card.tsx** (Minor Update)
**File**: `src/app/(dashboard)/subscription/components/plan-card.tsx`

- ✅ Added `id="plan-{planId}"` to Card element
- ✅ Enables auto-scroll from upgrade intent banner

---

## 🔧 Technical Details

### Payment Failure Detection

**Errors that trigger cancel+resubscribe dialog:**
1. UPI payment method
2. eMandate payment method
3. Bank Transfer payment method
4. Card insufficient balance
5. Card declined by bank
6. Card expired

**Error parsing logic:**
```typescript
if (errorMsg.toLowerCase().includes('upi') || 
    errorMsg.toLowerCase().includes('emandate') ||
    errorMsg.toLowerCase().includes('bank transfer')) {
  setPaymentFailureReason(detectedMethod);
  setShowPaymentFailureDialog(true);
}
```

### Immediate Cancellation

**API Request:**
```typescript
await axios.post('/api/subscription/cancel', {
  immediate: true,
  reason: 'Upgrading to new plan - payment method not supported',
});
```

**What happens:**
- Razorpay subscription cancelled immediately
- Database subscription status → CANCELED
- User unlinked from subscription (subscriptionId → null)
- History record created with reason
- User can now create new subscription

### Upgrade Intent Storage

**localStorage structure:**
```json
{
  "newPlanId": "cm3x...",
  "newPlanName": "Professional Plan",
  "lostCredit": 666.67,
  "timestamp": 1732719600000,
  "reason": "UPI"
}
```

**Used for:**
- Showing completion banner
- Auto-scrolling to target plan
- Displaying lost credit amount
- Showing cancellation reason

---

## 💰 Credit Loss Calculation

**Example:**
- Current Plan: ₹999/month
- Days Remaining: 20 of 30 days
- Proration Credit: ₹666.67

**User sees:**
```
⚠️ Credit Loss Warning
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current plan credit:    ₹666.67
New plan price:         ₹1,999

⚠️ If you proceed, you will lose ₹666.67 and pay 
full ₹1,999 for the new plan.
```

---

## 🎨 UI/UX Flow

### Payment Failure Dialog

**Dialog Structure:**
1. **Header**: "Payment Method Not Supported" (red icon)
2. **Credit Loss Warning Card** (red border):
   - Current credit
   - New plan price
   - Warning text
3. **Cancel & Resubscribe Option Card** (orange border):
   - What will happen (4 bullet points)
   - Why this is needed (Razorpay limitation)
   - Destructive button with amount
4. **Footer**: Cancel upgrade button

### Upgrade Intent Banner

**Banner Content:**
- Orange warning banner at top of plans page
- "Complete Your Upgrade" title
- Lost credit amount (if any)
- Target plan name
- Reason for cancellation
- Auto-scroll to target plan

---

## 🧪 Testing Scenarios

### Test Case 1: UPI User Upgrades
1. Create subscription with UPI
2. Go to My Plan page
3. Click "Upgrade" on higher plan
4. See upgrade dialog with proration
5. Click "Confirm Upgrade"
6. **Expected**: Payment failure dialog shows
7. See "UPI" as reason
8. See credit loss: ₹X
9. Click "Continue & Lose ₹X"
10. Subscription cancels
11. Redirect to plans page
12. See orange banner with lost credit
13. Auto-scroll to target plan
14. Click "Get Started"
15. Complete Razorpay checkout
16. New subscription created

### Test Case 2: Card Expired
1. Create subscription with card
2. Card expires (simulate in Razorpay test mode)
3. Try to upgrade
4. **Expected**: Payment failure dialog shows
5. See "Card Expired" as reason
6. Follow cancel+resubscribe flow

### Test Case 3: Insufficient Balance
1. Create subscription with card
2. Card has insufficient balance
3. Try to upgrade
4. **Expected**: Payment failure dialog shows
5. See "Insufficient Balance" as reason
6. Follow cancel+resubscribe flow

### Test Case 4: User Cancels Upgrade
1. Payment fails
2. Payment failure dialog shows
3. User clicks "Cancel Upgrade"
4. **Expected**: Dialog closes
5. User stays on My Plan page
6. No subscription cancelled
7. Can try again later

---

## 📊 Database Changes

### Subscription Table
```typescript
// On immediate cancellation:
{
  status: 'CANCELED',
  canceledAt: new Date(),
  cancelAtPeriodEnd: false,  // Changed from true
  autoRenew: false,
  updatedAt: new Date()
}
```

### User Table
```typescript
// User unlinked:
{
  subscriptionId: null,  // Changed from subscription ID
  updatedAt: new Date()
}
```

### Subscription History
```typescript
{
  action: 'CANCELED',
  fromStatus: 'ACTIVE',
  toStatus: 'CANCELED',
  reason: 'Immediate cancellation: Upgrading to new plan - payment method not supported',
  metadata: {
    source: 'user_action',
    immediate: true,
    canceledAt: '2025-11-27T...',
    razorpaySubscriptionId: 'sub_xxx'
  }
}
```

---

## 🚀 What Works

### ✅ Implemented Features

1. **Error Detection**: Parses Razorpay errors to detect payment method issues
2. **Payment Failure Dialog**: Shows clear warning with credit loss calculation
3. **Immediate Cancellation**: Cancels subscription immediately at Razorpay
4. **Upgrade Intent**: Stores intent in localStorage for continuity
5. **Banner Display**: Shows completion banner on plans page
6. **Auto-scroll**: Scrolls to target plan automatically
7. **New Subscription**: User completes normal checkout flow
8. **History Tracking**: All actions logged in subscription history

### ✅ Edge Cases Handled

1. **User cancels upgrade**: No action taken, can retry
2. **Network error during cancel**: Error shown, user can retry
3. **Multiple rapid clicks**: Button disabled during execution
4. **localStorage not available**: Graceful fallback (no banner)
5. **Query params missing**: Banner doesn't show
6. **Target plan not found**: Auto-scroll fails gracefully

---

## ⚠️ Known Limitations

1. **No Proration**: User loses remaining credit (Razorpay limitation)
2. **New Subscription ID**: History not continuous (different RP sub ID)
3. **Same Customer ID**: Razorpay reuses customer ID (good for payment methods)
4. **Manual Process**: No automatic payment method migration

---

## 🔄 Future Enhancements (Not Implemented)

1. ~~Payment method update option~~ (Skipped for now)
2. ~~Razorpay portal link~~ (short_url is just URL shortener)
3. ~~Two-tier fallback~~ (Only harsh fallback implemented)
4. Analytics tracking for conversion rates
5. Email notification about credit loss
6. Offer partial refund/credit for lost amount

---

## 📝 Code Quality

### Error Handling
- ✅ All Razorpay errors caught and parsed
- ✅ User-friendly error messages
- ✅ Console logging for debugging
- ✅ Toast notifications for feedback

### Loading States
- ✅ Button disabled during execution
- ✅ Loading spinner with status message
- ✅ Dialog remains open during processing

### Data Validation
- ✅ Check for active subscription
- ✅ Verify Razorpay subscription exists
- ✅ Validate localStorage data
- ✅ Parse JSON safely with fallbacks

---

## 🎉 Completion Status

**Implementation**: ✅ COMPLETE  
**Testing Required**: 🔄 PENDING  
**Documentation**: ✅ COMPLETE  
**Ready for Production**: ⚠️ AFTER TESTING

---

## 📚 Related Documents

- `UPGRADE_QNA_1.3_UPI_EMANDATE_FLOW.md` - Original requirements
- `RAZORPAY_PAYMENT_METHOD_UPDATE_RESEARCH.md` - Why short_url doesn't work
- `SOLUTION_3_IMPLEMENTATION.md` - Core upgrade flow

---

**End of Implementation Summary**
