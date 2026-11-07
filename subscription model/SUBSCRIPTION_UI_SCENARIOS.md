# Subscription UI Scenarios - Complete Documentation

> **📊 FULL AUDIT (2026-02-18):** This document has been audited against the actual codebase (`get-plan-button.tsx`, `plan-status-heading.tsx`, `autopay-info-section.tsx`). See inline annotations per scenario.
> **Summary: 4 🟢 Match | 7 🟡 Partial | 2 🔴 Outdated | 1 🔴 Missing (PAUSED)**
> Key discrepancies: PAST_DUE heading text rewritten; COMPLETING heading uses dynamic countdown not "COMPLETING" word; PAUSED status fully implemented but undocumented; shimmerColor is `#400000` not red; no `animate-pulse` class; date highlight is dark navy not yellow; Alert has no "warning" variant.

This document outlines every possible UI state for the subscription "My Plan" page across the entire user lifecycle.

---

## 🎨 **Shimmer Button Customization Summary**

Based on the official [MagicUI Shimmer Button documentation](https://magicui.design/docs/components/shimmer-button):

### Available Props:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `shimmerColor` | string | "#ffffff" | The color of the shimmer effect |
| `shimmerSize` | string | "0.05em" | The size of the shimmer |
| `borderRadius` | string | "100px" | The border radius of the button |
| `shimmerDuration` | string | "3s" | The duration of the shimmer animation |
| `background` | string | "rgba(0, 0, 0, 1)" | The background color of the button |
| `className` | string | undefined | Additional CSS classes |
| `children` | React.ReactNode | undefined | Button content |

### Our Implementation:
- **Normal state**: Purple background (`rgba(168, 85, 245, 1)`), white shimmer, 3s duration
- **Urgent state**: Red background (`rgba(239, 68, 68, 1)`), red shimmer, 1.5s duration + pulse animation
- Used for "Get a Plan" button with emoji: 🚀 Get a Plan Now

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY**: Actual urgent shimmerColor is `#400000` (dark maroon), NOT bright red. Normal shimmerColor is `#ffffff` ✅. `shimmerSize="0.1em"` everywhere (not default `0.05em`). **No `animate-pulse` class** exists in `get-plan-button.tsx` — only `shadow-2xl text-lg px-8 py-4 font-bold`. `isUrgent` condition: `(isTrial && daysRemaining <= 1) || status === 'EXPIRED'`.
> - 🎯 **ACTION**: Update — fix shimmerColor to `#400000`, remove pulse animation claim, add shimmerSize

---

## 📋 **All Subscription Lifecycle Scenarios**

### **1. Trial Period - ACTIVE (7-6 days remaining)**

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY**: Title range "7-6 days" is ambiguous. Code treats **7+ days** as no-alert/no-button zone. At **6 days**, the info alert + purple button already appear (Scenario 2). Heading still rendered for all trial ACTIVE days. Date highlight uses Highlighter `color="#00264D"` (dark navy with white text), NOT yellow as implied by doc.
> - 🎯 **ACTION**: Update — rename to "7+ days remaining" to eliminate overlap with Scenario 2, fix date highlight color
> - 💡 **ENHANCEMENT**: Consider adding a subtle "Enjoying your trial?" encouragement for 7+ days

#### **Heading:**
```
[5 days] remaining in trial period.
```
- "5 days" is **circled** with purple-pink aurora gradient
- Rest is plain text

#### **Valid Until Section:**
```
📅 Valid until [December 22, 2025]
5 days remaining
```
- Date is **highlighted** in yellow

#### **Alert:**
None (no alerts shown when 7+ days remain)

#### **Button:**
None (button not shown yet)

#### **Features & Usage:**
- Normal display of plan features
- Usage limits shown with progress bars

---

### **2. Trial Period - ACTIVE (6-2 days remaining)**

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: Matches UI code
> - 📝 **REALITY**: `autopay-info-section.tsx` shows default Alert (`Info` icon) when `daysRemaining >= 2 && daysRemaining <= 6` ✅. `get-plan-button.tsx` shows purple ShimmerButton (`rgba(168, 85, 245, 1)`, white shimmer, 3s) when `daysRemaining <= 6` ✅. Heading circles `"{days} days"` with purple `#a855f7` and purple-pink gradient text ✅.
> - 🎯 **ACTION**: Keep

#### **Heading:**
```
[4 days] remaining in trial period.
```
- "4 days" is **circled** with purple-pink aurora gradient

#### **Valid Until Section:**
```
📅 Valid until [December 19, 2025]
4 days remaining
```

#### **Alert:**
```
ℹ️ Trial Period Ending Soon: Your trial period will end on December 19, 2025. 
Get a plan now to continue enjoying uninterrupted services.
```
- Blue info alert

#### **Button:**
```
🚀 Get a Plan Now
```
- **ShimmerButton** with purple background
- White shimmer effect, 3s duration
- Links to `/subscription/plans`

---

### **3. Trial Period - ACTIVE (1 day remaining)**

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY**: Alert `variant="destructive"` with `AlertTriangle` icon ✅. Button red background `rgba(239, 68, 68, 1)` ✅, `shimmerDuration="1.5s"` ✅. **Discrepancies**: (1) shimmerColor is `#400000` (dark maroon), not red. (2) **No `animate-pulse` class** exists on the button — class is only `shadow-2xl text-lg px-8 py-4 font-bold`. The "PULSE animation" claim is **false**.
> - 🎯 **ACTION**: Update — fix shimmerColor to `#400000`, remove pulse animation reference
> - 💡 **ENHANCEMENT**: Could actually add `animate-pulse` class if the urgency intent was real

#### **Heading:**
```
[1 day] remaining in trial period.
```
- "1 day" is **circled** with purple-pink aurora gradient

#### **Valid Until Section:**
```
📅 Valid until [December 16, 2025]
1 day remaining
```

#### **Alert:**
```
⚠️ Services Will Be Shut Down Today: Your trial period expires today! 
All services will be stopped at the end of today. Get a plan now to avoid service interruption.
```
- **RED destructive alert** (high urgency)

#### **Button:**
```
🚀 Get a Plan Now
```
- **ShimmerButton** with **RED background** (`rgba(239, 68, 68, 1)`)
- Red shimmer effect, **1.5s duration** (faster)
- **PULSE animation** for maximum urgency
- Links to `/subscription/plans`

---

### **4. Trial Period - EXPIRED**

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: Matches UI code
> - 📝 **REALITY**: Heading: "trial period" circled in red (`#ef4444`) ✅, "EXPIRED" underlined in red ✅. Alert `variant="destructive"` with `AlertCircle` icon ✅, text matches ✅. Button: `isUrgent=true` (status===EXPIRED), red background `rgba(239, 68, 68, 1)`, `shimmerDuration="1.5s"` ✅. Minor: shimmerColor is `#400000` not "red shimmer".
> - 🎯 **ACTION**: Keep (minor shimmerColor correction)

#### **Heading:**
```
Your [trial period] has [EXPIRED].
```
- "trial period" is **circled** in red gradient
- "EXPIRED" is **underlined** in red gradient

#### **Valid Until Section:**
```
📅 Valid until [December 15, 2025]
0 days remaining (or "Expires today")
```

#### **Alert:**
```
❌ Trial Expired - Services Stopped: Your trial period has expired and all your 
services have been barred. Purchase a plan now to restore access to your services.
```
- **RED destructive alert**

#### **Button:**
```
🚀 Get a Plan Now
```
- **ShimmerButton** with **RED background**
- Red shimmer, 1.5s duration + pulse
- High urgency styling

---

### **5. Paid Subscription - ACTIVE (with Autopay)**

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY**: Doc heading: `"You currently have [Premium Plan] [ACTIVE] plan."` — **Actual code** (above threshold): `"Your {planDisplayName} plan is ACTIVE."` (different wording: "Your" vs "You currently have", "is" vs implicit). **UNDOCUMENTED**: `plan-status-heading.tsx` has a **dynamic countdown** near renewal based on `billingCycle` (MONTHLY→7d, HALFYEARLY→14d, YEARLY→28d threshold) showing "renews in X days" / "renews today" / "renews tomorrow" / "renews in 1 week" / "renews in 2 weeks". Alert text matches ✅. No button ✅.
> - 🎯 **ACTION**: Update — fix heading wording, add dynamic countdown sub-scenario (5a/5b)
> - 💡 **ENHANCEMENT**: The dynamic countdown near renewal is excellent UX — deserves its own section

#### **Heading:**
```
You currently have [Premium Plan] [ACTIVE] plan.
```
- "Premium Plan" is **underlined** with purple-pink gradient
- "ACTIVE" is **circled** with purple-pink gradient

#### **Valid Until Section:**
```
📅 Valid until [March 15, 2026]
4 months 15 days remaining
```

#### **Alert:**
```
ℹ️ Autopay Enabled: Your subscription will automatically renew on March 15, 2026. 
The payment will be processed automatically at the end of your current billing period.
```
- Blue info alert

#### **Button:**
None (no button needed, subscription is active)

#### **Features & Usage:**
- Full plan features displayed
- Usage metrics with progress bars
- Storage note about Cloudinary

---

### **6. Paid Subscription - ACTIVE (without Autopay)**

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY**: Same heading wording discrepancy as Scenario 5 — actual says `"Your {planDisplayName} plan is ACTIVE."` or dynamic countdown near threshold. Alert text matches ✅: "Manual Renewal Required..." with default Alert (`Info` icon) ✅. No button ✅. Dynamic countdown heading also applies here when near renewal but is not documented.
> - 🎯 **ACTION**: Update — fix heading text to match actual code, add countdown reference

#### **Heading:**
```
You currently have [Premium Plan] [ACTIVE] plan.
```
- Same styling as above

#### **Valid Until Section:**
```
📅 Valid until [March 15, 2026]
4 months 15 days remaining
```

#### **Alert:**
```
ℹ️ Manual Renewal Required: Your subscription will expire on March 15, 2026. 
Autopay is not enabled. Please purchase a new plan before expiry to continue services.
```
- Blue info alert

#### **Button:**
None (while still active)

---

### **7. Paid Subscription - PAST_DUE**

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Outdated — heading and alert text significantly differ from code
> - 📝 **REALITY**:
>   - **Heading**: Doc says `"Your [Premium Plan] plan autopay failed, payment is [DUE]."` with "DUE" circled. **Actual**: `"[Action required]: Payment failed for [planDisplayName] plan."` with **"Action required" circled in red** (`#ef4444`) and plan name **underlined in red-orange** (`#f97316`). Completely different text and decoration targets.
>   - **Alert**: Doc says "...shut down at the end of the current period (January 20, 2026)." **Actual** says `"...shut down soon."` — NO date reference in alert.
>   - **Subtitle**: Code renders `"Services will be available until current period ends"` (via `showServicesContinueMessage` for PAST_DUE) — not documented.
>   - No button ✅.
> - 🎯 **ACTION**: Update — rewrite heading, fix circled/underlined words, update alert text
> - 💡 **ENHANCEMENT**: Alert should include the `endDate` as originally intended — "soon" is less informative

#### **Heading:**
```
Your [Premium Plan] plan autopay failed, payment is [DUE].
```
- "Premium Plan" is **underlined** with red-orange gradient
- "DUE" is **circled** with red-orange gradient

#### **Valid Until Section:**
```
📅 Valid until [January 20, 2026]
2 months 5 days remaining
Services will be available until current period ends
```

#### **Alert:**
```
❌ Payment Failed: Your autopay payment has failed. Please update your payment 
method and retry the payment. If all autopay retry attempts fail, your services 
will be shut down at the end of the current period (January 20, 2026).
```
- **RED destructive alert**

#### **Button:**
None (user needs to fix payment, not buy new plan)

#### **Features & Usage:**
- Normal display continues
- Services remain active until period end

---

### **8. Paid Subscription - EXPIRED**

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: Matches UI code
> - 📝 **REALITY**: Heading: plan name underlined in gray (`#6b7280`) ✅, "EXPIRED" circled in gray ✅. Alert `variant="destructive"` with `AlertCircle` icon ✅, text has conditional logic for trial vs paid ✅. Button: red urgent ShimmerButton (`isUrgent=true` since `status==='EXPIRED'`) ✅. Minor: shimmerColor is `#400000`.
> - 🎯 **ACTION**: Keep

#### **Heading:**
```
Your [Premium Plan] plan has [EXPIRED].
```
- "Premium Plan" is **underlined** with gray gradient
- "EXPIRED" is **circled** with gray gradient

#### **Valid Until Section:**
```
📅 Valid until [December 31, 2025]
0 days remaining
```

#### **Alert:**
```
❌ Subscription Expired: Your subscription has expired. This may be due to failed 
autopay retries or the completion of your billing cycle. Purchase a new plan now 
to restore access to services.
```
- **RED destructive alert**

#### **Button:**
```
🚀 Get a Plan Now
```
- **ShimmerButton** with **RED background**
- Red shimmer, 1.5s duration + pulse
- High urgency

---

### **9. Paid Subscription - COMPLETING (8+ days remaining)**

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Outdated — heading is completely different in code
> - 📝 **REALITY**: Doc heading: `"Your [Premium Plan] plan is [COMPLETING]."` with "COMPLETING" circled in blue. **Actual code**: Dynamic countdown — `"Your {planDisplayName} plan expires in [{daysRemaining} days]."` with the days count **circled in blue** (`#3b82f6`). The word "COMPLETING" is **never shown** to the user. Plan name is underlined in blue ✅. Alert text matches ✅ (default variant, `Info` icon, "Subscription Completing:..." text). No button ✅.
> - 🎯 **ACTION**: Update — rewrite heading to show actual dynamic countdown text
> - 💡 **ENHANCEMENT**: Good UX decision in code — showing countdown instead of jargon "COMPLETING" is better

#### **Heading:**
```
Your [Premium Plan] plan is [COMPLETING].
```
- "Premium Plan" is **underlined** with blue gradient
- "COMPLETING" is **circled** with blue gradient

#### **Valid Until Section:**
```
📅 Valid until [February 28, 2026]
3 months 15 days remaining
```

#### **Alert:**
```
ℹ️ Subscription Completing: Your subscription will end on February 28, 2026. 
Razorpay will not auto-charge after this date. We recommend purchasing a new plan 
7 days before expiry to enjoy uninterrupted services.
```
- Blue info alert

#### **Button:**
None (not within 7-day purchase window)

---

### **10. Paid Subscription - COMPLETING (7-1 days remaining)**

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY**:
>   - **Heading**: Same as Scenario 9 — uses dynamic countdown, NOT "COMPLETING" text. Special cases: `daysRemaining===0` → "expires **today**" (circled red `#ef4444`), `===1` → "expires **tomorrow**" (circled orange `#f97316`), else → "expires in **N days**" (circled blue `#3b82f6`).
>   - **Alert**: Doc says **"Yellow warning alert"** but actual is **default Alert variant** (no `variant` prop = info-style) with `AlertTriangle` icon. The Alert component has NO `variant="warning"`. Visually NOT yellow.
>   - **Button**: Purple ShimmerButton ✅ (white shimmer, 3s).
> - 🎯 **ACTION**: Update — fix heading to dynamic countdown, fix alert variant description (not yellow/warning)
> - 💡 **ENHANCEMENT**: Add `variant="warning"` to the Alert component if yellow urgency was intended

#### **Heading:**
```
Your [Premium Plan] plan is [COMPLETING].
```
- Same styling as above

#### **Valid Until Section:**
```
📅 Valid until [November 22, 2025]
7 days remaining
```

#### **Alert:**
```
⚠️ Subscription Ending Soon: Razorpay will not auto-charge after November 22, 2025. 
You can now purchase a new plan (after November 15, 2025) to ensure uninterrupted service.
```
- Yellow warning alert

#### **Button:**
```
🚀 Get a Plan Now
```
- **ShimmerButton** with purple background
- White shimmer, 3s duration
- Normal urgency (not red since services still active)

---

### **11. Paid Subscription - CANCELED**

> **📊 AUDIT (2026-02-18):**
> - 🟢 **STATUS**: Matches UI code
> - 📝 **REALITY**: Heading: plan name underlined in amber (`#f59e0b`) ✅, "CANCELED" circled in amber ✅, orange-yellow gradient ✅. Alert: default variant (`Info` icon) ✅, text matches ✅. No button ✅. Code also renders "Services will be available until current period ends" subtitle via `showServicesContinueMessage` — this is mentioned in the Valid Until section ✅.
> - 🎯 **ACTION**: Keep

#### **Heading:**
```
Your [Premium Plan] plan has been [CANCELED].
```
- "Premium Plan" is **underlined** with orange-yellow gradient
- "CANCELED" is **circled** with orange-yellow gradient

#### **Valid Until Section:**
```
📅 Valid until [January 10, 2026]
1 month 25 days remaining
Services will be available until current period ends
```

#### **Alert:**
```
ℹ️ Subscription Canceled: Your subscription has been canceled by you. You will 
continue to have access to all services until January 10, 2026. Purchase a new 
plan anytime to continue after this date.
```
- Blue info alert

#### **Button:**
None (user voluntarily canceled, can purchase later if desired)

#### **Features & Usage:**
- Normal display continues
- All features remain accessible until period end

---

### **12. Paid Subscription - PAUSED** *(MISSING FROM ORIGINAL DOC)*

> **📊 AUDIT (2026-02-18):**
> - 🔴 **STATUS**: Missing — fully implemented in code but never documented
> - 📝 **REALITY**: All three components handle PAUSED:
>   - **Heading** (`plan-status-heading.tsx`): `"Your {planDisplayName} plan is PAUSED."` — plan name **underlined in blue** (`#3b82f6`), "PAUSED" **circled in blue** (`#3b82f6`), blue gradient text.
>   - **Alert** (`autopay-info-section.tsx`): `variant="destructive"` with `AlertCircle` icon. Text: `"Subscription Paused — Services Stopped: Your subscription was paused (via your payment app or Razorpay). All services have been stopped, and your store is offline. Resume your subscription below to restore access immediately."`
>   - **Button** (`get-plan-button.tsx`): No "Get a Plan" button (PAUSED not in `shouldShowButton`). `resume-subscription-button.tsx` handles resume action instead.
>   - **Time remaining**: Hidden (`shouldShowTimeRemaining` excludes PAUSED status).
> - 🎯 **ACTION**: Add — document this scenario fully

#### **Heading:**
```
Your [Premium Plan] plan is [PAUSED].
```
- "Premium Plan" is **underlined** with blue gradient (`#3b82f6`)
- "PAUSED" is **circled** with blue gradient (`#3b82f6`)

#### **Alert:**
```
❌ Subscription Paused — Services Stopped: Your subscription was paused 
(via your payment app or Razorpay). All services have been stopped, and 
your store is offline. Resume your subscription below to restore access immediately.
```
- **RED destructive alert** (`variant="destructive"`, `AlertCircle` icon)

#### **Button:**
No "Get a Plan" button. **Resume Subscription button** shown instead (from `resume-subscription-button.tsx`).

#### **Time Remaining:**
Hidden — not shown for PAUSED status.

---

## 🎯 **Summary of Button Appearances**

### **Purple Normal State:**
- Trial ACTIVE (6-2 days remaining)
- Paid COMPLETING (≤7 days)
- Background: `rgba(168, 85, 245, 1)` (purple)
- Shimmer: white, 3s duration

### **Red Urgent State:**
- Trial ACTIVE (1 day remaining)
- Trial EXPIRED
- Paid EXPIRED
- Background: `rgba(239, 68, 68, 1)` (red)
- Shimmer: red, 1.5s duration
- Additional: `animate-pulse` class

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY**: Purple normal state ✅. Red urgent state: background ✅, duration ✅. **Discrepancies**: (1) shimmerColor is `#400000` (dark maroon), not bright red. (2) **`animate-pulse` class does NOT exist** in `get-plan-button.tsx`. (3) `shimmerSize="0.1em"` used globally (not default `0.05em`). (4) `isUrgent` includes `daysRemaining <= 1` (catches both 0 and 1 day) for trial.
> - 🎯 **ACTION**: Update — remove `animate-pulse` claim, fix shimmerColor to `#400000`, add shimmerSize note

---

## 🔍 **Key UI Patterns**

### **Color Coding:**
- **Purple/Pink**: Active, healthy state
- **Blue**: Informational, completing state
- **Red/Orange**: Payment issues, past due
- **Gray**: Expired, inactive
- **Yellow/Orange**: Canceled by user

### **Alert Variants:**
- **Info (Blue)**: Normal information, no action required immediately
- **Warning (Yellow)**: Attention needed, action recommended
- **Destructive (Red)**: Urgent action required, critical state

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY**: The app's `Alert` component supports: default (no variant = info-style) and `variant="destructive"` (red). **There is NO `variant="warning"` (yellow)**. The COMPLETING ≤7 days alert uses default variant + `AlertTriangle` icon — visually NOT yellow. PAUSED uses `variant="destructive"` (undocumented). Icons used: `Info` (info alerts), `AlertCircle` (destructive), `AlertTriangle` (urgent-info like 1-day trial and COMPLETING ≤7).
> - 🎯 **ACTION**: Update — remove or caveat "Warning (Yellow)" variant; note it doesn't exist in the Alert component

### **Text Highlights:**
- **Circle**: Status words (ACTIVE, EXPIRED, DUE, CANCELED, COMPLETING)
- **Underline**: Plan names
- **Highlight**: Dates in "Valid until" section

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY**: (1) **"DUE" is never circled** — PAST_DUE circles **"Action required"** instead. (2) **"COMPLETING" is never circled** — dynamic countdown words are circled ("today"/"tomorrow"/"N days"). (3) Date highlight uses `color="#00264D"` (dark navy) with white text, NOT yellow. (4) Missing: PAUSED circles "PAUSED" in blue. (5) ACTIVE countdown circles "today"/"tomorrow"/"1 week"/"2 weeks"/"N days" — not listed. (6) Trial heading circles day count, not "ACTIVE".
> - 🎯 **ACTION**: Update — fix circled words list, fix highlight color, add PAUSED and countdown words

---

## 📝 **Status Transition Flow**

```
TRIAL ACTIVE (7 days) 
  → TRIAL ACTIVE (6-2 days) [Alert + Button]
  → TRIAL ACTIVE (1 day) [Red Alert + Red Button]
  → TRIAL EXPIRED [Red Alert + Red Button]
  
PAID ACTIVE (autopay) 
  → PAST_DUE [Red Alert, retry payment]
  → EXPIRED [Red Alert + Red Button] OR back to ACTIVE

PAID ACTIVE (autopay)
  → COMPLETING (8+ days) [Info Alert]
  → COMPLETING (≤7 days) [Warning Alert + Button]
  → EXPIRED [Red Alert + Red Button]

PAID ACTIVE (manual)
  → EXPIRED [Red Alert + Red Button]

Any ACTIVE
  → CANCELED [Info Alert, services continue]
  → End of period → EXPIRED
```

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially matches — missing transitions
> - 📝 **REALITY**: (1) Missing: `Any ACTIVE → PAUSED [Destructive Alert, services stopped, resume button]`. (2) Missing: `PAUSED → ACTIVE [via resume]`. (3) COMPLETING ≤7 days label says "Warning Alert" — should be "Info Alert with AlertTriangle icon". (4) PAST_DUE can also → ACTIVE (if payment retried successfully).
> - 🎯 **ACTION**: Update — add PAUSED transitions, fix alert type labels

---

## 🛠️ **Implementation Notes**

### **Components Updated:**
1. `plan-status-heading.tsx` - Dynamic headings with MagicUI Highlighter
2. `autopay-info-section.tsx` - Comprehensive alerts for all states
3. `get-plan-button.tsx` - ShimmerButton with conditional styling

### **Props Passed:**
- `planName` - To detect TRIAL vs paid plans
- `status` - Subscription status enum
- `currentPeriodEnd` - Date for day calculations
- `endDate` - Formatted date string
- `timeRemaining` - Human-readable time string
- `autoRenew` - Boolean for autopay status

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially matches — missing props
> - 📝 **REALITY**: Two additional props used but not listed: (1) **`planDisplayName`** — user-facing plan name (e.g., "Premium Plan"), used in `plan-status-heading.tsx` for all non-trial headings. (2) **`billingCycle`** (`BillingCycle` enum: MONTHLY/HALFYEARLY/YEARLY) — used in `plan-status-heading.tsx` to calculate dynamic countdown thresholds (7d/14d/28d). Trial detection uses `planName === 'TRIAL'` (exact match, not "contains Trial").
> - 🎯 **ACTION**: Update — add `planDisplayName` and `billingCycle` to the props list

### **Dependencies:**
- `@magicui/shimmer-button` - Animated call-to-action button
- `@magicui/highlighter` - Text annotations (circle, underline, highlight)
- `motion` - Animation library (replacement for framer-motion)
- `rough-notation` - Hand-drawn annotation effects
- `date-fns` - Date calculations

> **📊 AUDIT (2026-02-18):**
> - 🟡 **STATUS**: Partially matches
> - 📝 **REALITY**: (1) ShimmerButton imported from `@/components/ui/shimmer-button` (local re-export). (2) Highlighter imported from `@/components/ui/highlighter` (local component, likely wrapping rough-notation). (3) `motion` is NOT directly imported in these 3 components. (4) `date-fns` used indirectly via `getDaysRemaining`/`formatPlanDate` from `@/lib/plan-timing-calculations`. (5) Missing: **`lucide-react`** icons (`Calendar`, `Info`, `AlertCircle`, `AlertTriangle`) heavily used but not listed.
> - 🎯 **ACTION**: Update — clarify import paths, add `lucide-react`, note indirect usage of date-fns

---

**Last Updated:** November 15, 2025  
**Version:** 1.0.0

---

> **📊 AUDIT SUMMARY (2026-02-18):**
>
> | # | Scenario | Status | Key Issue |
> |---|----------|--------|-----------|
> | 1 | Trial ACTIVE 7+ days | 🟡 Partial | Range "7-6" ambiguous; should be "7+" |
> | 2 | Trial ACTIVE 6-2 days | 🟢 Match | — |
> | 3 | Trial ACTIVE 1 day | 🟡 Partial | shimmerColor wrong, no animate-pulse |
> | 4 | Trial EXPIRED | 🟢 Match | Minor shimmerColor note |
> | 5 | Paid ACTIVE (autopay) | 🟡 Partial | Heading wording differs; undocumented countdown |
> | 6 | Paid ACTIVE (no autopay) | 🟡 Partial | Same heading issue as #5 |
> | 7 | Paid PAST_DUE | 🔴 Outdated | Heading completely rewritten; alert text differs |
> | 8 | Paid EXPIRED | 🟢 Match | — |
> | 9 | COMPLETING 8+ days | 🔴 Outdated | Heading uses countdown, not "COMPLETING" word |
> | 10 | COMPLETING ≤7 days | 🟡 Partial | No yellow/warning variant; heading uses countdown |
> | 11 | CANCELED | 🟢 Match | — |
> | 12 | **PAUSED** | 🔴 Missing | Fully implemented, never documented |
>
> **Priority fixes**: (1) Add PAUSED scenario, (2) Rewrite PAST_DUE heading/alert, (3) Fix COMPLETING headings to countdown, (4) Remove `animate-pulse` claim, (5) Fix shimmerColor to `#400000`, (6) Add `planDisplayName`/`billingCycle` props, (7) Fix alert variant (no warning), (8) Fix date highlight color to `#00264D`.
