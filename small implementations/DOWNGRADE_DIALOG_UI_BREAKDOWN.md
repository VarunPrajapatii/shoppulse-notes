# Downgrade Dialog UI Components - Visual Breakdown

## Enhanced Downgrade Dialog Structure (Dec 12, 2025)

```
┌─────────────────────────────────────────────────────────────┐
│  🔽 Confirm Plan Downgrade                                  │
│  Review the details of your plan change before confirming.  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Plan Change                                           │ │
│  │                                                       │ │
│  │  Current Plan         🔽         New Plan            │ │
│  │  Quarterly                        Monthly            │ │
│  │  ₹4,999/quarterly                 ₹1,999/monthly    │ │
│  │  ───────────────────────────────────────────────     │ │
│  │  You'll save    ₹3,000 (60% off)                    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📅 Effective Date                                     │ │
│  │ Your new plan will start on 15 March 2025            │ │
│  │ You'll continue to enjoy your current plan benefits  │ │
│  │ until then.                                           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📦 New Plan Limits                           🔽       │ │  ← COLLAPSIBLE
│  ├───────────────────────────────────────────────────────┤ │
│  │ 📦 Products     Your usage: 90  • Limit: 50 (RED)   │ │
│  │ 📁 Categories   Your usage: 15  • Limit: 20 (GREEN) │ │
│  │ 🖼️  Billboards   Your usage: 8   • Limit: 10 (GREEN) │ │
│  │ ───────────────────────────────────────────────       │ │
│  │ ⚠️  Action Required: You should reduce your usage    │ │
│  │    to match the new limits 3-5 days before           │ │
│  │    15 March 2025. Otherwise, the oldest items will   │ │
│  │    be automatically archived after a 5-day grace     │ │
│  │    period.                                            │ │
│  │                                                       │ │
│  │ Until 15 March 2025, you can continue enjoying       │ │
│  │ your current plan's limits and benefits. The new     │ │
│  │ plan will be implemented at your period end.         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ⚠️  Usage Exceeds New Plan Limits                     │ │  ← OVERAGE WARNING
│  │                                                       │ │
│  │ Your current usage exceeds the new plan's limits.    │ │
│  │ After the downgrade takes effect, you'll have        │ │
│  │ 5 days to reduce your usage.                         │ │
│  │                                                       │ │
│  │ 📦 Products: 90 / 50 (40 over)                       │ │
│  │                                                       │ │
│  │ If not reduced within 5 days, the oldest items will  │ │
│  │ be automatically archived.                            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  [Close]                        [Confirm Downgrade] 🟧      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## When Payment Method Error Occurs (UPI/eMandate/Card)

```
┌─────────────────────────────────────────────────────────────┐
│  🔽 Confirm Plan Downgrade                                  │
│  Review the details of your plan change before confirming.  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ... (Plan Change, Effective Date, Limits sections)         │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ❌ 📱 Payment Method Not Supported                    │ │  ← ERROR CARD
│  │                                                       │ │
│  │ Subscription with UPI payment method cannot be       │ │
│  │ updated via scheduled changes.                       │ │
│  │                                                       │ │
│  │ ┌─────────────────────────────────────────────────┐ │ │
│  │ │ Recommended Action:                             │ │ │
│  │ │                                                 │ │ │
│  │ │ 1. Cancel your current subscription to stop    │ │ │
│  │ │    auto-charge                                  │ │ │
│  │ │ 2. Continue enjoying current plan benefits      │ │ │
│  │ │    until 15 March 2025                          │ │ │
│  │ │ 3. Subscribe to the desired plan (Monthly)      │ │ │
│  │ │    just before your plan ends                   │ │ │
│  │ └─────────────────────────────────────────────────┘ │ │
│  │                                                       │ │
│  │ Don't worry! Cancelling now will:                    │ │
│  │ • Stop automatic renewal payments                    │ │
│  │ • Keep your current plan active until period end     │ │
│  │ • Maintain current limits until period end           │ │
│  │                                                       │ │
│  │ [Cancel Current Plan & Subscribe Later] 🔴           │ │  ← CANCEL BUTTON
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  [Close]          [⚠️ Cancel Current Plan First] 🔴 DISABLED│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## State Variations

### 1. Default State (No Overages)
```
┌───────────────────────────────────────────────────────┐
│ ✅ You're all set!                                    │
│ Your current usage is within the new plan's limits.   │
└───────────────────────────────────────────────────────┘
```

### 2. Loading State (Scheduling)
```
┌───────────────────────────────────────────────────────┐
│ ⏳ Scheduling downgrade...                            │
└───────────────────────────────────────────────────────┘

[Close] (disabled)    [⏳ Scheduling...] (disabled)
```

### 3. Loading State (Cancelling)
```
┌───────────────────────────────────────────────────────┐
│ ⏳ Cancelling current subscription...                 │
└───────────────────────────────────────────────────────┘

[Close] (disabled)    [⏳ Cancelling...] 🔴 (inside error card)
```

---

## Color Coding

### Plan Limits Section
- **Green text** = Usage under limit (safe)
- **Red text** = Usage over limit (action required)

### Badges
- **Green badge** = "You're all set!" alert
- **Orange badge** = "Action Required" alert
- **Red badge** = "Payment Method Not Supported" alert

### Buttons
- **Orange button** = "Confirm Downgrade" (primary action)
- **Red button** = "Cancel Current Plan & Subscribe Later" (alternative flow)
- **Disabled gray** = When cancel flow required

---

## Interactive Elements

### Collapsible Trigger
```
📦 New Plan Limits                           🔽
     ↓ (click to expand)
     ↓
📦 New Plan Limits                           🔼
```

### Usage Display Format
```
📦 Products     Your usage: 90  • Limit: 50
                ─────────────────────────────
                BOLD            COLORED (red/green)
```

---

## Toast Notifications

### Success
```
✅ Downgrade Scheduled!
Your plan will change to Monthly at the end of 
your current billing period.
```

### Payment Method Error
```
❌ Payment Method Not Supported
Your payment method doesn't support plan changes.
Please cancel current plan.
```

### Already Scheduled Error
```
❌ Change Already Scheduled
You already have a plan change scheduled.
Please cancel it first.
```

### Cancel Success
```
⚠️ Subscription Cancelled
Previous subscription cancelled. Subscribe to 
Monthly after current period ends.
```

---

## Responsive Behavior

### Desktop (> 768px)
- Dialog width: `max-w-lg` (512px)
- Two-column layout for "Cancel" and "Confirm" buttons
- Full resource names displayed

### Mobile (< 768px)
- Dialog adjusts to screen width with padding
- Buttons stack vertically
- Collapsible section remains functional
- Text wraps appropriately

---

## Accessibility Features

### Screen Reader Support
- Dialog has proper `aria-labelledby` for title
- Description connected via `aria-describedby`
- Buttons have descriptive labels
- Loading states announced
- Error states announced

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to trigger buttons
- Escape to close dialog
- Arrow keys work in collapsible

### Focus Management
- Focus trapped within dialog when open
- First focusable element gets focus on open
- Focus returns to trigger on close

---

## Component Tree

```
DowngradeDialog
├── Dialog
│   ├── DialogContent
│   │   ├── DialogHeader
│   │   │   ├── DialogTitle (with ArrowDown icon)
│   │   │   └── DialogDescription
│   │   ├── div (space-y-4)
│   │   │   ├── Card (Plan Change Summary)
│   │   │   │   ├── CardHeader
│   │   │   │   └── CardContent
│   │   │   │       ├── Plan comparison row
│   │   │   │       ├── Separator
│   │   │   │       └── Savings badge
│   │   │   ├── Card (Effective Date)
│   │   │   │   └── CardContent
│   │   │   │       └── Calendar icon + text
│   │   │   ├── Collapsible (Plan Limits) ⭐ NEW
│   │   │   │   ├── Card
│   │   │   │   │   ├── CollapsibleTrigger
│   │   │   │   │   │   └── CardHeader (with chevron)
│   │   │   │   │   └── CollapsibleContent
│   │   │   │   │       └── CardContent
│   │   │   │   │           ├── Products row
│   │   │   │   │           ├── Categories row
│   │   │   │   │           ├── Billboards row
│   │   │   │   │           ├── Separator
│   │   │   │   │           ├── Alert (status)
│   │   │   │   │           └── Info text
│   │   │   ├── Alert (Overage Warning - conditional)
│   │   │   │   └── Detailed overage breakdown
│   │   │   ├── Alert (No Overage - conditional)
│   │   │   │   └── "You're all set!" message
│   │   │   ├── Alert (Payment Error - conditional) ⭐ NEW
│   │   │   │   ├── XCircle + Phone icons
│   │   │   │   ├── AlertTitle
│   │   │   │   └── AlertDescription
│   │   │   │       ├── Error message
│   │   │   │       ├── Recommended action steps
│   │   │   │       ├── "Don't worry" list
│   │   │   │       └── Cancel button
│   │   │   └── div (Status Message - conditional)
│   │   │       └── Loader2 + text
│   │   └── DialogFooter
│   │       ├── Button (Close/Cancel)
│   │       └── Button (Confirm Downgrade)
└── (handlers)
    ├── handleCancelAndResubscribe() ⭐ NEW
    └── handleConfirmDowngrade() (enhanced)
```

---

## Implementation Stats

- **Total Dialog Height:** ~600-800px (varies with content)
- **Max Width:** 512px (lg breakpoint)
- **Number of Interactive Elements:** 3 (collapse trigger, cancel button, confirm button)
- **Conditional Sections:** 4 (overage warning, no overage, payment error, status message)
- **Icons Used:** 13 (ArrowDown, Calendar, Package, Folder, ImageIcon, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, XCircle, AlertCircle, Phone, Loader2)

---

**Created:** December 12, 2025  
**Related:** `DOWNGRADE_FLOW_ENHANCEMENT.md`
