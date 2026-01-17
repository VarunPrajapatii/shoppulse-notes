# Subscription UI Components Checklist

## Overview

This document provides a comprehensive inventory of all subscription-related UI components, pages, and identifies any missing functionality.

---

## Subscription Pages

**Location:** `src/app/(dashboard)/subscription/`

### 1. My Plan Page (`/subscription/my-plan`)

**File:** `my-plan/page.tsx`  
**Lines:** ~224

**Purpose:** Display current subscription status and usage

**Components Used:**
| Component | Location | Purpose |
|-----------|----------|---------|
| PlanStatusHeading | `components/my-plan/plan-status-heading.tsx` | Shows plan name, status badge, billing cycle |
| AutopayInfoSection | `components/my-plan/autopay-info-section.tsx` | Autopay status, renewal info |
| GetPlanButton | `components/my-plan/get-plan-button.tsx` | Button to upgrade when expired/canceled |
| CancelSubscriptionButton | `components/my-plan/cancel-subscription-button.tsx` | Cancel subscription button |
| PlanFeaturesCard | `components/plan-features-card.tsx` | List of plan features |
| UsageLimitsSection | `components/usage-limits-section.tsx` | Usage bars for products, orders, categories, billboards |
| UpgradeProcessingBanner | `components/my-plan/upgrade-processing-banner.tsx` | Shows when upgrade is processing |

**Data Displayed:**
- ✅ Plan name and display name
- ✅ Subscription status (ACTIVE, CANCELED, EXPIRED, etc.)
- ✅ Billing cycle (monthly, half-yearly, yearly)
- ✅ Period end date
- ✅ Time remaining string
- ✅ Autopay status (on/off)
- ✅ Usage metrics (products, orders, categories, billboards)
- ✅ Plan features list
- ✅ Storage note (Cloudinary)

**Status Handling:**
- ✅ `ACTIVE` - Shows cancel button, autopay info
- ✅ `CANCELED` - Shows "Get Plan" button, period end info
- ✅ `EXPIRED` - Shows "Get Plan" button
- ✅ `TRIAL` - Shows upgrade prompt

---

### 2. Plans Page (`/subscription/plans`)

**File:** `plans/page.tsx`  
**Lines:** ~100

**Purpose:** Display available subscription plans for upgrade/downgrade

**Components Used:**
| Component | Location | Purpose |
|-----------|----------|---------|
| PlansGrid | `components/plans-grid.tsx` | Grid layout of plan cards |
| UpgradeIntentBanner | `components/my-plan/upgrade-intent-banner.tsx` | Banner after cancellation |

**Features:**
- ✅ Fetches public, active plans (excludes TRIAL)
- ✅ Orders by `sortOrder`
- ✅ Calculates `canUpgrade`/`canDowngrade` based on price comparison
- ✅ Only allows upgrade/downgrade if subscription is `ACTIVE`

---

### 3. Payment History Page (`/subscription/payment-history`)

**File:** `payment-history/page.tsx`  
**Lines:** ~70

**Purpose:** Display subscription history timeline

**Components Used:**
| Component | Location | Purpose |
|-----------|----------|---------|
| SubscriptionHistoryTimeline | `components/subscription-history-timeline.tsx` | Timeline of all subscription changes |

**Data Displayed:**
- ✅ All SubscriptionHistory records
- ✅ Ordered by `createdAt` descending
- ✅ Empty state with icon

---

## Subscription Components Inventory

### Location: `src/app/(dashboard)/subscription/components/`

| Component | File | Purpose |
|-----------|------|---------|
| PlanCard | `plan-card.tsx` | Individual plan card with Subscribe/Upgrade buttons |
| PlanFeaturesCard | `plan-features-card.tsx` | Card displaying plan features list |
| PlansGrid | `plans-grid.tsx` | Responsive grid of PlanCard components |
| SubscriptionHistoryTimeline | `subscription-history-timeline.tsx` | Timeline view of history |
| SubscriptionTabs | `subscription-tabs.tsx` | Navigation tabs for subscription pages |
| UsageDisplay | `usage-display.tsx` | Single usage metric display |
| UsageLimitsSection | `usage-limits-section.tsx` | Section with all usage bars |

### Location: `src/app/(dashboard)/subscription/components/my-plan/`

| Component | File | Purpose |
|-----------|------|---------|
| AutopayInfoSection | `autopay-info-section.tsx` | Shows autopay status and renewal info |
| CancelSubscriptionButton | `cancel-subscription-button.tsx` | Cancel subscription with confirmation |
| GetPlanButton | `get-plan-button.tsx` | "Get a Plan" button for expired/canceled |
| PlanStatusHeading | `plan-status-heading.tsx` | Main heading with status badge |
| UpgradeDialog | `upgrade-dialog.tsx` | Dialog for confirming upgrade |
| UpgradeIntentBanner | `upgrade-intent-banner.tsx` | Banner shown after cancellation |
| UpgradeProcessingBanner | `upgrade-processing-banner.tsx` | Shows webhook sync status |

---

## Missing/Incomplete UI Components

### ❌ 1. Grace Period Warning Banner

**Status:** NOT IMPLEMENTED  
**Location Should Be:** `my-plan/` page or component

**Purpose:** When `User.usageGracePeriod = true`, display:
- Warning banner about overage
- Days remaining until enforcement
- List of items that will be deleted
- Link to reduce usage

**Suggested Implementation:**
```tsx
// components/my-plan/grace-period-warning.tsx
interface GracePeriodWarningProps {
  gracePeriodData: GracePeriodData;
  daysRemaining: number;
}

export function GracePeriodWarning({ gracePeriodData, daysRemaining }: Props) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Usage Limit Exceeded - {daysRemaining} Days Remaining</AlertTitle>
      <AlertDescription>
        Your current usage exceeds your new plan limits. 
        Please reduce your items or they will be automatically removed.
        
        Products: {gracePeriodData.overage_details.products?.overageCount} over limit
        Categories: {gracePeriodData.overage_details.categories?.overageCount} over limit
        Billboards: {gracePeriodData.overage_details.billboards?.overageCount} over limit
      </AlertDescription>
    </Alert>
  );
}
```

---

### ❌ 2. Payment Failure Banner

**Status:** NOT IMPLEMENTED  
**Location Should Be:** Dashboard layout or `my-plan/` page

**Purpose:** When `User.paymentGracePeriod = true`, display:
- Warning about failed payment
- Link to update payment method
- Countdown to account suspension

---

### ✅ 3. Downgrade Confirmation Dialog

**Status:** ✅ FULLY IMPLEMENTED (Enhanced Dec 12, 2025)  
**Location:** `components/my-plan/downgrade-dialog.tsx`

**Features Implemented:**
- ✅ Plan change summary (current → new)
- ✅ Effective date display with formatted date
- ✅ Savings calculation with percentage badge
- ✅ **NEW:** Collapsible plan limits section showing:
  - Products: Current usage vs new limit
  - Categories: Current usage vs new limit
  - Billboards: Current usage vs new limit
  - Color-coded status (green = under, red = over)
  - Warning to reduce usage 3-5 days before effective date
- ✅ Overage warning with detailed item counts and icons
- ✅ 5-day grace period notification
- ✅ **NEW:** Payment method error handling:
  - Beautiful error display for UPI/eMandate/Card limitations
  - Cancel + Resubscribe flow recommendation
  - "Cancel Current Plan & Subscribe Later" button
  - localStorage intent storage for later subscription
- ✅ Loading states (scheduling, cancelling)
- ✅ Error states with proper toast notifications
- ✅ Disabled button states when error requires cancel flow

**Related Documentation:** `notes/small implementations/DOWNGRADE_FLOW_ENHANCEMENT.md`

---

### ❌ 4. Subscription Status Badge Colors

**Status:** NEEDS VERIFICATION  
**Location:** `plan-status-heading.tsx`

**Verify these status-to-color mappings exist:**
```tsx
const statusColors = {
  ACTIVE: 'green',
  TRIAL: 'blue',
  CANCELED: 'yellow',
  EXPIRED: 'red',
  PAST_DUE: 'orange',
  COMPLETING: 'purple',
  PAUSED: 'gray',
};
```

---

### ❌ 5. Payment History Details

**Status:** BASIC - Could be enhanced  
**Location:** `subscription-history-timeline.tsx`

**Missing Features:**
- Payment amount display
- Invoice download link
- Payment method used
- Refund status (if any)

**Current Data Available but Not Displayed:**
```typescript
// SubscriptionHistory fields available:
- amountCharged // Payment amount
- metadata // Contains detailed info
```

---

### ⚠️ 6. Trial Expiry Warning

**Status:** NEEDS VERIFICATION  
**Location:** Should be in layout or TopBar

**Purpose:** When trial is about to expire (< 3 days), show:
- Days remaining warning
- Upgrade CTA button
- Benefits of upgrading

---

## Dashboard Shell Integration

**File:** `src/components/dashboard/dashboard-shell.tsx`

**Current Features:**
- ✅ Sidebar integration
- ✅ TopBar with store name
- ✅ TrialIndicator for trial users

**Verify TrialIndicator shows for:**
- ✅ Users on TRIAL plan
- ✅ Users with `isOnTrial = true` flag
- ✅ Displays time remaining

---

## Subscription Tab Navigation

**Location:** `src/app/(dashboard)/subscription/layout.tsx`

**Tabs Available:**
- ✅ My Plan (`/subscription/my-plan`)
- ✅ Plans (`/subscription/plans`)
- ✅ Payment History (`/subscription/payment-history`)

---

## API Endpoints for UI

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/subscription/create` | POST | Create new subscription |
| `/api/subscription/cancel` | POST | Cancel subscription |
| `/api/subscription/upgrade` | POST | Initiate upgrade |
| `/api/subscription/downgrade` | POST | Schedule downgrade |

---

## Recommendations for Completion

### Priority 1 (Critical - Before Hosting)

1. **Grace Period Warning Banner**
   - Add to my-plan page
   - Query `User.usageGracePeriod` and `Subscription.metadata.grace_period`
   - Display clear countdown and affected items

2. **Payment Failure Banner**
   - Add to dashboard layout (shows on all pages)
   - Query `User.paymentGracePeriod`
   - Provide payment update link

### Priority 2 (Important)

3. **Downgrade Confirmation Enhancement**
   - Show preview of grace period
   - List items over new limit
   - Require explicit acknowledgment

4. **Status Badge Consistency**
   - Verify all status colors match design system
   - Add tooltip explaining each status

### Priority 3 (Nice to Have)

5. **Payment History Enhancement**
   - Show payment amounts
   - Add invoice download (if available from Razorpay)
   - Filter by action type

6. **Trial Countdown Enhancement**
   - More prominent display in last 3 days
   - Email notification (already TODO in cron)

---

## Testing Checklist

### My Plan Page
- [ ] Displays correctly for ACTIVE subscription
- [ ] Displays correctly for TRIAL subscription
- [ ] Displays correctly for CANCELED subscription
- [ ] Displays correctly for EXPIRED subscription
- [ ] Cancel button disabled for non-ACTIVE
- [ ] Usage bars show correct counts
- [ ] Upgrade processing banner works

### Plans Page
- [ ] Shows all public, active plans
- [ ] Current plan highlighted
- [ ] Upgrade button enabled for higher plans
- [ ] Downgrade button enabled for lower plans
- [ ] Buttons disabled for CANCELED subscription

### Payment History
- [ ] Shows all history records
- [ ] Correct chronological order
- [ ] Action types displayed correctly
- [ ] Empty state shows when no history
