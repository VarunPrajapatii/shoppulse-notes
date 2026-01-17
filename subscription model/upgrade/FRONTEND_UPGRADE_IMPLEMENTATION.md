# Frontend Upgrade Implementation Guide

**Document Purpose**: Step-by-step guide to implement the upgrade UI flow  
**Date**: November 27, 2025  
**Status**: Ready for Implementation  
**Prerequisites**: Backend APIs (preview + execute) and webhook handler are complete ✅

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

### Current State
- ✅ Backend: Preview API, Execute API, Webhook Handler (100% complete)
- ✅ Database: All fields present and verified
- ❌ Frontend: Upgrade UI missing (0% complete)

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

```
subscription/
├── plans/
│   └── page.tsx                          [MODIFY] Add upgrade detection logic
├── my-plan/
│   └── page.tsx                          [NO CHANGE] Already shows current plan
└── components/
    ├── plan-card.tsx                     [MODIFY] Add upgrade button handling
    └── upgrade-dialog.tsx                [CREATE] New component
```

---

## Implementation Steps

### Phase 1: Create Upgrade Dialog Component

**File**: `src/app/(dashboard)/subscription/components/upgrade-dialog.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  price: number;
  billingCycle: string;
  maxProducts: number | null;
  maxOrders: number | null;
}

interface PreviewData {
  currentPlan: Plan;
  newPlan: Plan;
  proration: {
    daysRemaining: number;
    totalDaysInCycle: number;
    credit: number;
    expectedCharge: number;
    newPeriodStart: string;
    newPeriodEnd: string;
  };
  canUpgrade: boolean;
  reason?: string;
  note: string;
}

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  currentPlan: Plan;
  newPlan: Plan;
  onSuccess: () => void;
}

export function UpgradeDialog({
  open,
  onClose,
  currentPlan,
  newPlan,
  onSuccess,
}: UpgradeDialogProps) {
  const router = useRouter();
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch preview data when dialog opens
  useEffect(() => {
    if (open) {
      fetchPreview();
    }
  }, [open, newPlan.id]);

  const fetchPreview = async () => {
    setIsLoadingPreview(true);
    setError(null);
    try {
      const { data } = await axios.post('/api/subscription/upgrade/preview', {
        newPlanId: newPlan.id,
      });
      
      if (!data.canUpgrade) {
        setError(data.reason || 'Cannot upgrade at this time');
      } else {
        setPreviewData(data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load preview');
      toast.error('Failed to load upgrade preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleConfirmUpgrade = async () => {
    if (!previewData?.canUpgrade) return;

    setIsExecuting(true);
    try {
      await axios.post('/api/subscription/upgrade/execute', {
        newPlanId: newPlan.id,
      });

      toast.success('Upgrade successful! 🎉');
      onClose();
      onSuccess();
      router.push('/subscription/my-plan');
      router.refresh();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Upgrade failed';
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setIsExecuting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Upgrade to {newPlan.displayName}
          </DialogTitle>
        </DialogHeader>

        {/* Loading State */}
        {isLoadingPreview && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading preview...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoadingPreview && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Preview Content */}
        {previewData && !isLoadingPreview && !error && (
          <div className="space-y-6">
            {/* Plan Comparison */}
            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
              {/* Current Plan */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">
                    Current Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{currentPlan.displayName}</div>
                  <div className="text-2xl font-bold text-primary mt-1">
                    {formatCurrency(currentPlan.price)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    per {currentPlan.billingCycle.toLowerCase()}
                  </div>
                </CardContent>
              </Card>

              {/* Arrow */}
              <ArrowRight className="h-6 w-6 text-muted-foreground" />

              {/* New Plan */}
              <Card className="border-primary bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-primary">New Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{newPlan.displayName}</div>
                  <div className="text-2xl font-bold text-primary mt-1">
                    {formatCurrency(newPlan.price)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    per {newPlan.billingCycle.toLowerCase()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Proration Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📊 Proration Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Days remaining in cycle</span>
                  <span className="font-medium">
                    {previewData.proration.daysRemaining} days
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Credit for unused {currentPlan.displayName}
                  </span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(previewData.proration.credit)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Cost for {newPlan.displayName} ({previewData.proration.daysRemaining} days)
                  </span>
                  <span className="font-medium">
                    {formatCurrency(previewData.proration.expectedCharge + previewData.proration.credit)}
                  </span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Amount to be charged now</span>
                    <span className="text-3xl font-bold text-primary">
                      {formatCurrency(previewData.proration.expectedCharge)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warning Alert */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This charge will be applied <strong>immediately</strong> using your saved payment method.
              </AlertDescription>
            </Alert>

            {/* Feature Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🎉 What You'll Get</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {newPlan.maxProducts && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>
                        <strong>{newPlan.maxProducts}</strong> products
                        {currentPlan.maxProducts && (
                          <span className="text-muted-foreground text-sm">
                            {' '}(from {currentPlan.maxProducts})
                          </span>
                        )}
                      </span>
                    </li>
                  )}
                  {newPlan.maxOrders && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>
                        <strong>{newPlan.maxOrders}</strong> orders
                        {currentPlan.maxOrders && (
                          <span className="text-muted-foreground text-sm">
                            {' '}(from {currentPlan.maxOrders})
                          </span>
                        )}
                      </span>
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground italic">
              {previewData.note}
            </p>
          </div>
        )}

        {/* Footer Buttons */}
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExecuting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmUpgrade}
            disabled={!previewData?.canUpgrade || isExecuting || isLoadingPreview}
            className="min-w-[200px]"
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Confirm Upgrade{' '}
                {previewData && formatCurrency(previewData.proration.expectedCharge)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Phase 2: Modify Plan Card Component

**File**: `src/app/(dashboard)/subscription/components/plan-card.tsx`

**Changes Required**:

1. Add new props to interface
2. Add state for upgrade dialog
3. Modify button logic to handle upgrades
4. Import and use UpgradeDialog component

```tsx
// Add to existing imports
import { UpgradeDialog } from './upgrade-dialog';

// Update interface (ADD these props)
interface PlanCardProps {
  plan: PlanCardData;
  disabled?: boolean;
  isCurrentPlan?: boolean;
  canUpgrade?: boolean;        // NEW
  canDowngrade?: boolean;      // NEW
  currentPlanPrice?: number;   // NEW
  currentPlanData?: {          // NEW - Full current plan data for dialog
    id: string;
    name: string;
    displayName: string;
    price: number;
    billingCycle: string;
    maxProducts: number | null;
    maxOrders: number | null;
  } | null;
}

// Add state for upgrade dialog (INSIDE component)
const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

// Modify handleSubscribe function name and logic
const handleAction = async () => {
  // If user can upgrade to this plan
  if (canUpgrade && currentPlanData) {
    setUpgradeDialogOpen(true);
    return;
  }

  // If it's a downgrade (future implementation)
  if (canDowngrade) {
    toast.info('Downgrade feature coming soon!');
    return;
  }

  // Otherwise, it's a new subscription (existing logic)
  handleNewSubscription();
};

const handleNewSubscription = async () => {
  // Move existing handleSubscribe logic here
  try {
    setIsLoading(true);
    // ... existing Razorpay checkout code
  } catch (error) {
    // ... existing error handling
  }
};

// Update button (REPLACE existing button)
<Button
  className="w-full"
  size="lg"
  disabled={disabled || isCurrentPlan || isLoading}
  onClick={handleAction}
>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Processing...
    </>
  ) : isCurrentPlan ? (
    'Current Plan'
  ) : canUpgrade ? (
    'Upgrade to This Plan'
  ) : canDowngrade ? (
    'Downgrade to This Plan'
  ) : (
    'Get Started'
  )}
</Button>

// Add UpgradeDialog component at end of PlanCard (BEFORE closing tag)
{canUpgrade && currentPlanData && (
  <UpgradeDialog
    open={upgradeDialogOpen}
    onClose={() => setUpgradeDialogOpen(false)}
    currentPlan={currentPlanData}
    newPlan={{
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      price: plan.price,
      billingCycle: plan.billingCycle,
      maxProducts: plan.maxProducts,
      maxOrders: plan.maxOrders,
    }}
    onSuccess={() => {
      router.refresh();
    }}
  />
)}
```

---

### Phase 3: Modify Plans Page

**File**: `src/app/(dashboard)/subscription/plans/page.tsx`

**Changes Required**: Add upgrade/downgrade detection logic

```tsx
// After fetching user and plans, ADD this logic (before return statement)

// Get current subscription price for comparison
const currentPrice = user?.subscription?.plan.price 
  ? Number(user.subscription.plan.price) 
  : null;

// Prepare current plan data for upgrade dialog
const currentPlanData = user?.subscription ? {
  id: user.subscription.plan.id,
  name: user.subscription.plan.name,
  displayName: user.subscription.plan.displayName,
  price: Number(user.subscription.plan.price),
  billingCycle: user.subscription.plan.billingCycle,
  maxProducts: user.subscription.plan.maxProducts,
  maxOrders: user.subscription.plan.maxOrders,
} : null;

// Convert Decimal to number AND add upgrade/downgrade flags
const plans = plansFromDb.map((plan) => {
  const planPrice = plan.price.toNumber();
  
  return {
    ...plan,
    price: planPrice,
    priceBeforeDiscount: plan.priceBeforeDiscount.toNumber(),
    // NEW: Determine if this is an upgrade or downgrade
    canUpgrade: currentPrice ? planPrice > currentPrice : false,
    canDowngrade: currentPrice ? planPrice < currentPrice : false,
  };
});

// In the map function for rendering PlanCards, UPDATE to:
{plans.map((plan) => (
  <PlanCard
    key={plan.id}
    plan={plan}
    disabled={shouldDisable}
    isCurrentPlan={user?.subscription?.planId === plan.id}
    canUpgrade={plan.canUpgrade}              // NEW
    canDowngrade={plan.canDowngrade}          // NEW
    currentPlanPrice={currentPrice}           // NEW
    currentPlanData={currentPlanData}         // NEW
  />
))}
```

---

## Component Specifications

### UpgradeDialog Component

**Responsibilities**:
1. Fetch upgrade preview on mount
2. Display loading/error states
3. Show proration breakdown clearly
4. Handle upgrade execution
5. Show success/error feedback
6. Redirect on success

**Key Features**:
- Auto-fetch preview when opened
- Retry button on error
- Disabled confirm button during execution
- Toast notifications for feedback
- Automatic redirect after success

**Visual Requirements**:
- Maximum width: 2xl (672px)
- Maximum height: 90vh with scroll
- Current amount in green (credit)
- Charge amount large and bold (text-3xl)
- Warning alert with yellow background

---

### Modified PlanCard Component

**New Behavior**:
- Detect if plan is upgrade/downgrade/new subscription
- Change button text based on action type
- Open appropriate dialog (currently only upgrade)
- Maintain existing Razorpay checkout for new subscriptions

**Button States**:
| Condition | Text | Action |
|-----------|------|--------|
| `isCurrentPlan` | "Current Plan" | Disabled |
| `canUpgrade` | "Upgrade to This Plan" | Open UpgradeDialog |
| `canDowngrade` | "Downgrade to This Plan" | Show "Coming soon" toast |
| Default | "Get Started" | Razorpay checkout |

---

### Modified Plans Page

**New Logic**:
- Calculate `canUpgrade` and `canDowngrade` for each plan
- Prepare `currentPlanData` object for dialog
- Pass all props to PlanCard components
- No visual changes (logic only)

---

## UI/UX Guidelines

### Visual Hierarchy

1. **Primary Focus**: Charge amount
   - Size: text-3xl (30px)
   - Weight: font-bold
   - Color: text-primary

2. **Secondary Focus**: Warning alert
   - Component: Alert (not destructive)
   - Icon: AlertTriangle
   - Position: Above confirm button

3. **Supporting Info**: Proration breakdown
   - Component: Card
   - Layout: Vertical list with divider
   - Typography: text-sm for labels

### Color Coding

- **Green**: Credit amounts (money saved)
- **Primary**: Charge amount and new plan highlights
- **Muted**: Supporting text and calculations
- **Yellow**: Warning alerts
- **Red**: Error states

### Spacing

- Dialog padding: p-6
- Section spacing: space-y-6
- List item spacing: space-y-3
- Button gap: gap-2

### Typography

- Dialog title: text-2xl
- Card titles: text-lg
- Charge amount: text-3xl
- Body text: text-sm
- Footnotes: text-xs

---

## Testing Checklist

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

### Automated Testing (Future)

```typescript
// Example test cases (using Jest + React Testing Library)

describe('UpgradeDialog', () => {
  it('shows loading state initially', () => {
    // Assert loading spinner is visible
  });

  it('displays proration breakdown after loading', async () => {
    // Mock API response
    // Assert breakdown is shown
  });

  it('calls execute API on confirm', async () => {
    // Mock execute endpoint
    // Click confirm button
    // Assert API was called with correct payload
  });

  it('shows error toast on failure', async () => {
    // Mock API error
    // Assert toast.error was called
  });
});
```

---

## Edge Cases

### 1. Minimum Charge Difference (< ₹0.50)

**Scenario**: User upgrades near end of cycle, difference is too small

**Handling**:
- Preview API detects this
- Returns `canUpgrade: false`
- Dialog shows error message
- Suggest waiting longer before upgrading

**Example**:
```
Current: ₹999/month, 29 days remaining
New: ₹1,049/month
Credit: ₹966.03
Cost: ₹1,015.90
Difference: ₹49.87 (might round to < ₹0.50)
```

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

## Success Metrics

After implementation, measure:

1. **Conversion Rate**: % of users who click upgrade vs complete it
2. **Error Rate**: % of upgrade attempts that fail
3. **Time to Complete**: Average time from click to success
4. **Drop-off Points**: Where users abandon the flow

---

## Future Enhancements

### Phase 2 (After Basic Upgrade Works)
- Add downgrade dialog component
- Implement scheduled downgrade (at cycle end)
- Add grace period warnings for downgrades

### Phase 3 (Polish)
- Add loading skeletons in dialog
- Add success animation (confetti/checkmark)
- Add "View Payment History" link after upgrade
- Add upgrade history timeline

### Phase 4 (Analytics)
- Track upgrade button clicks
- Track dialog open/close events
- Track upgrade success/failure rates
- A/B test different dialog layouts

---

## Implementation Timeline

| Phase | Tasks | Time | Priority |
|-------|-------|------|----------|
| 1 | Create UpgradeDialog component | 2-3 hours | HIGH |
| 2 | Modify PlanCard component | 1 hour | HIGH |
| 3 | Modify Plans page | 30 mins | HIGH |
| 4 | Manual testing | 1-2 hours | HIGH |
| 5 | Bug fixes & polish | 1-2 hours | MEDIUM |
| 6 | Responsive design testing | 1 hour | MEDIUM |
| **Total** | | **6-10 hours** | |

---

## Rollout Plan

### Step 1: Development
- Implement all three components
- Test in development environment
- Use Razorpay test mode

### Step 2: Testing
- Manual testing of all scenarios
- Test with different plan combinations
- Test error scenarios

### Step 3: Staging
- Deploy to staging environment
- Full end-to-end testing
- Verify webhook processing

### Step 4: Production
- Deploy to production
- Monitor error logs
- Watch for failed upgrades
- Quick rollback plan ready

---

## Support & Troubleshooting

### Common Issues

**Issue**: Dialog shows "Cannot upgrade" error  
**Fix**: Check subscription status is ACTIVE, has razorpaySubscriptionId

**Issue**: Preview loads but shows ₹0.00 charge  
**Fix**: Check price difference is >= ₹0.50, wait longer in billing cycle

**Issue**: Upgrade succeeds but My Plan shows old plan  
**Fix**: Webhook might be delayed, refresh page after 10 seconds

**Issue**: Payment fails with "payment method" error  
**Fix**: User needs to update card in Razorpay, show support link

---

## Completion Checklist

- [ ] UpgradeDialog component created
- [ ] PlanCard component modified
- [ ] Plans page modified
- [ ] All imports added correctly
- [ ] TypeScript errors resolved
- [ ] Manual testing completed
- [ ] Error scenarios tested
- [ ] Responsive design verified
- [ ] Toast notifications working
- [ ] Redirects working correctly
- [ ] Webhook processing verified
- [ ] Database records created correctly
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Ready for deployment ✅

---

**End of Document**

Ready to implement? Start with Phase 1 (UpgradeDialog component) and test thoroughly before moving to Phase 2!
