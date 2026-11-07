# Frontend Upgrade Implementation Guide

**Document Purpose**: Step-by-step guide to implement the upgrade UI flow  
**Date**: November 27, 2025  
**Status**: Ready for Implementation  
**Prerequisites**: Backend APIs (preview + execute) and webhook handler are complete ✅

---
## 📝 AUDIT SUMMARY (2025-07-17)

**Overall Status:** ✅ FULLY IMPLEMENTED — Frontend is 100% complete, though with different component structure than originally spec'd here.

**Status Update:** The overview says "Backend 100% done, Frontend 0%". This is OUTDATED — Frontend is now 100% done too.

| Component | Spec'd Here | Actual Implementation |
|-----------|-------------|----------------------|
| UpgradeDialog | `subscription/components/upgrade-dialog.tsx` | `my-plan/upgrade-dialog.tsx` (621L) |
| PlanCard | Create new | Modified existing `plan-card.tsx` |
| Plans Page | Modify | ✅ Modified with dialog + banner |
| Payment Failure Dialog | Not spec'd | ✅ Added inside upgrade-dialog.tsx |
| Intent Banner | Not spec'd | ✅ `upgrade-intent-banner.tsx` (109L) |

---

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [User Flow Diagram](#user-flow-diagram)
3. [Component Architecture](#component-architecture)
4. [Implementation Steps](#implementation-steps)
5. [Component Specifications](#component-specifications)
6. [UI/UX Guidelines](#uiux-guidelines)
7. [Testing Checklist](#testing-checklist)
8. [Edge Cases](#edge-cases)

---

## Overview

> **📝 STATUS: All frontend components are now implemented. Tech stack matches (Shadcn, React hooks, Sonner). We use axios instead of fetch for API calls.

### Goal
Build a complete upgrade flow that allows users to:
1. See available upgrade options on `/subscription/plans`
2. Preview upgrade cost with proration breakdown
3. Confirm and execute upgrade immediately
4. See updated plan on `/subscription/my-plan`

### Tech Stack
- **UI**: Shadcn components (Dialog, Card, Button, Alert)
- **State**: React hooks (useState, useEffect)
- **API**: Axios for HTTP requests
- **Routing**: Next.js App Router
- **Notifications**: Sonner toasts

---

## User Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: Browse Plans                                             │
│ Location: /subscription/plans                                    │
│                                                                  │
│ ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│ │   Basic    │  │  Premium   │  │ Enterprise │                │
│ │  ₹999/mo   │  │ ₹1,999/mo  │  │ ₹3,999/mo  │                │
│ │ [Current]  │  │ [Upgrade]  │  │ [Upgrade]  │ ← User clicks  │
│ └────────────┘  └────────────┘  └────────────┘                │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Preview Dialog Opens                                     │
│ Component: <UpgradeDialog>                                       │
│                                                                  │
│ ╔════════════════════════════════════════════════════════════╗  │
│ ║ Upgrade to Premium Plan                               [X]  ║  │
│ ╠════════════════════════════════════════════════════════════╣  │
│ ║                                                            ║  │
│ ║ Loading preview...  ⏳                                     ║  │
│ ║                                                            ║  │
│ ╚════════════════════════════════════════════════════════════╝  │
│                                                                  │
│ API Call: POST /api/subscription/upgrade/preview                │
│           { newPlanId: "premium_plan_uuid" }                    │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: Preview Loaded                                           │
│                                                                  │
│ ╔════════════════════════════════════════════════════════════╗  │
│ ║ Upgrade to Premium Plan                                    ║  │
│ ╠════════════════════════════════════════════════════════════╣  │
│ ║                                                            ║  │
│ ║ Current Plan → New Plan                                    ║  │
│ ║ ┌──────────┐    ┌──────────┐                             ║  │
│ ║ │  Basic   │ →  │ Premium  │                             ║  │
│ ║ │ ₹999/mo  │    │₹1,999/mo │                             ║  │
│ ║ └──────────┘    └──────────┘                             ║  │
│ ║                                                            ║  │
│ ║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║  │
│ ║                                                            ║  │
│ ║ 📊 Proration Breakdown                                     ║  │
│ ║ ┌────────────────────────────────────────────────────┐   ║  │
│ ║ │ Days remaining in cycle: 20 days                   │   ║  │
│ ║ │ Credit for unused Basic plan: ₹666.67              │   ║  │
│ ║ │ Cost for Premium plan (20 days): ₹1,332.33        │   ║  │
│ ║ │ ───────────────────────────────────────────────    │   ║  │
│ ║ │ Amount to be charged now: ₹1,332.33                │   ║  │
│ ║ └────────────────────────────────────────────────────┘   ║  │
│ ║                                                            ║  │
│ ║ ⚠️  This charge will be applied immediately using your    ║  │
│ ║     saved payment method.                                 ║  │
│ ║                                                            ║  │
│ ║ 🎉 What You'll Get:                                        ║  │
│ ║ ✓ 500 products (from 100)                                 ║  │
│ ║ ✓ 5,000 orders (from 1,000)                               ║  │
│ ║ ✓ 50 categories (from 20)                                 ║  │
│ ║ ✓ Advanced analytics                                      ║  │
│ ║                                                            ║  │
│ ║ [Cancel]                    [Confirm Upgrade ₹1,332.33]   ║  │
│ ╚════════════════════════════════════════════════════════════╝  │
│                                                                  │
│ User clicks "Confirm Upgrade" →                                 │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: Processing                                               │
│                                                                  │
│ ╔════════════════════════════════════════════════════════════╗  │
│ ║ [Confirm button disabled, showing spinner]                 ║  │
│ ║                                                            ║  │
│ ║ [Processing upgrade...] ⏳                                 ║  │
│ ╚════════════════════════════════════════════════════════════╝  │
│                                                                  │
│ API Call: POST /api/subscription/upgrade/execute                │
│           { newPlanId: "premium_plan_uuid" }                    │
│                                                                  │
│ Backend: Calls Razorpay subscriptions.update()                  │
│ Razorpay: Creates invoice & charges saved payment method        │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 5A: SUCCESS ✅                                              │
│                                                                  │
│ - Dialog closes                                                  │
│ - Toast: "Upgrade successful! 🎉"                                │
│ - Redirect to /subscription/my-plan                             │
│ - Page shows new plan details                                   │
│ - Webhook processes in background (updates DB)                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ STEP 5B: FAILURE ❌                                              │
│                                                                  │
│ - Dialog stays open                                              │
│ - Toast: "Upgrade failed: [reason]"                              │
│ - Error message shown in dialog                                  │
│ - User can retry or cancel                                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

**📝 STATUS:** — Component lives at `my-plan/upgrade-dialog.tsx`. Existing `plan-card.tsx` was modified rather than creating a new component.

---

## Implementation Steps

### Phase 1: Create Upgrade Dialog Component

**📝 IMPLEMENTATION STATUS: ✅ IMPLEMENTED**
File: `upgrade-dialog.tsx`. Same core flow (loading → preview → confirm → success) but enhanced with: Payment Failure Dialog for UPI/emandate, `handleCancelAndResubscribe()` for non-card users, localStorage upgradeIntent storage, more comprehensive error categorization (8 error types vs 4 shown here).

**File**: `src/app/(dashboard)/subscription/components/upgrade-dialog.tsx`

---

### Phase 2: Modify Plan Card Component

**📝 IMPLEMENTATION STATUS: ✅ IMPLEMENTED** — `plan-card.tsx` modified with canUpgrade/canDowngrade props, handleAction logic, button text variations. Also added `id` attribute for auto-scroll targeting from upgrade-intent-banner.

**File**: `src/app/(dashboard)/subscription/components/plan-card.tsx`

**Changes Required**:

1. Add new props to interface
2. Add state for upgrade dialog
3. Modify button logic to handle upgrades
4. Import and use UpgradeDialog component

---

### Phase 3: Modify Plans Page

**📝 IMPLEMENTATION STATUS: ✅ IMPLEMENTED** — `plans/page.tsx` has price comparison logic, UpgradeIntentBanner integration, dialog opening state management.

**File**: `src/app/(dashboard)/subscription/plans/page.tsx`

**Changes Required**: Add upgrade/downgrade detection logic

---

## Testing Checklist

**📝 STATUS: ❌ NOT DONE** — Manual testing still pending.

### Manual Testing

#### Happy Path
- [ ] Click "Upgrade" button on higher-tier plan
- [ ] Dialog opens and shows loading spinner
- [ ] Preview data loads successfully
- [ ] Proration breakdown shows correct calculations
- [ ] Click "Confirm Upgrade"
- [ ] Success toast appears
- [ ] Redirected to /subscription/my-plan
- [ ] New plan shown on My Plan page
- [ ] Payment record created in database
- [ ] History record created with UPGRADED action

#### Edge Cases
- [ ] Click upgrade when less than threshold days remaining
- [ ] Button should be disabled
- [ ] Alert banner shows restriction message

#### Error Scenarios
- [ ] Network error during preview fetch
- [ ] Error alert shown in dialog
- [ ] Can close dialog and retry

- [ ] Payment failure during upgrade execution
- [ ] Error toast shown
- [ ] Dialog stays open
- [ ] User can retry or cancel

- [ ] Minimum charge difference too small (< ₹0.50)
- [ ] Preview API returns error
- [ ] Error message shown in dialog

#### State Management
- [ ] Close dialog before preview loads
- [ ] Dialog closes cleanly, no memory leaks

- [ ] Close dialog during execution
- [ ] Execution continues in background
- [ ] Can check status on My Plan page

#### Responsive Design
- [ ] Dialog fits on mobile screens
- [ ] Plan comparison cards stack vertically on small screens
- [ ] Buttons stack vertically on mobile

---

## Edge Cases

**📝 STATUS: ✅ HANDLED IN CODE** — Min ₹0.50 (detected in execute error), payment method expired (error parsing), already has scheduled changes (UPDATE API handles), concurrent upgrades (webhook idempotency), webhook delay (optimistic UI + webhookSyncStatus).

### 1. Minimum Charge Difference (< ₹0.50)

**Scenario**: User upgrades near end of cycle, difference is too small

**Handling**:
- Preview API detects this
- Returns `canUpgrade: false`
- Dialog shows error message
- Suggest waiting longer before upgrading


### 2. Payment Method Expired

**Scenario**: Razorpay tries to charge expired card

**Handling**:
- Execute API returns error from Razorpay
- Show error: "Payment failed. Please update payment method."
- Provide link to Razorpay dashboard
- Subscription stays on old plan (automatic rollback)

### 3. Already Has Scheduled Changes

**Scenario**: User has pending plan change at cycle end

**Handling**:
- Check `hasScheduledChanges` field in subscription
- Disable upgrade buttons
- Show alert: "You already have a pending plan change"
- Clear scheduled change before allowing new upgrade

### 4. Subscription Not Active

**Scenario**: Subscription status is EXPIRED, PAST_DUE, etc.

**Handling**:
- Preview API checks status
- Returns `canUpgrade: false` with reason
- Disable all upgrade buttons
- Show banner: "Reactivate subscription to upgrade"

### 5. Plan Timing Restrictions

**Scenario**: User tries to upgrade but timing restrictions apply

**Handling**:
- Already implemented in plans page via `shouldDisablePlanChange()`
- Upgrade buttons disabled when restrictions active
- Alert banner explains threshold days requirement
- User must wait until threshold is reached

### 6. Network Errors

**Scenario**: API request fails due to network issues

**Handling**:
- Catch axios errors in try-catch
- Show user-friendly error message
- Provide retry button in dialog
- Don't auto-close dialog on network error

### 7. Webhook Delay

**Scenario**: Upgrade succeeds but webhook takes time to process

**Handling**:
- Execute API returns success immediately
- Frontend shows success and redirects
- Webhook processes asynchronously
- User sees updated plan on My Plan page
- If webhook fails, plan still updated (Razorpay is source of truth)

### 8. Concurrent Upgrades

**Scenario**: User clicks upgrade in multiple tabs simultaneously

**Handling**:
- Razorpay handles this at API level
- First request succeeds, others fail
- Failed requests get error response
- Show error: "Plan already upgraded"

---

## API Error Codes Reference

### Preview API Errors

| Status | Error | Cause | UI Action |
|--------|-------|-------|-----------|
| 401 | Unauthorized | Not logged in | Redirect to login |
| 404 | No active subscription | User has no subscription | Show error alert |
| 400 | Plan ID required | Missing newPlanId | Show error alert |
| 400 | Plan not found | Invalid plan ID | Show error alert |
| 200 | canUpgrade: false | Business logic rejection | Show reason in dialog |

### Execute API Errors

| Status | Error | Cause | UI Action |
|--------|-------|-------|-----------|
| 401 | Unauthorized | Not logged in | Redirect to login |
| 404 | No active subscription | User has no subscription | Show error toast |
| 400 | Subscription not active | Status != ACTIVE | Show error toast |
| 400 | No Razorpay subscription ID | Missing razorpaySubscriptionId | Contact support |
| 400 | Plan not found | Invalid plan ID | Show error toast |
| 400 | Not an upgrade | New price <= current price | Show error toast |
| 500 | Razorpay error | Payment/API failure | Show error toast with retry |

---

**End of Document**