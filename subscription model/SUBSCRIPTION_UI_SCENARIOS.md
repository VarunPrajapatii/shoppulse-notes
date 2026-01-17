# Subscription UI Scenarios - Complete Documentation

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

---

## 📋 **All Subscription Lifecycle Scenarios**

### **1. Trial Period - ACTIVE (7-6 days remaining)**

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

### **Text Highlights:**
- **Circle**: Status words (ACTIVE, EXPIRED, DUE, CANCELED, COMPLETING)
- **Underline**: Plan names
- **Highlight**: Dates in "Valid until" section

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

### **Dependencies:**
- `@magicui/shimmer-button` - Animated call-to-action button
- `@magicui/highlighter` - Text annotations (circle, underline, highlight)
- `motion` - Animation library (replacement for framer-motion)
- `rough-notation` - Hand-drawn annotation effects
- `date-fns` - Date calculations

---

**Last Updated:** November 15, 2025  
**Version:** 1.0.0
