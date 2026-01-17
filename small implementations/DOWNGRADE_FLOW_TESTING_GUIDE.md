# Downgrade Flow Testing Guide

## Quick Test Commands

### Prerequisites Setup
```bash
# Ensure you're in the project root
cd /d/study/ShopPulseAdmin

# Install dependencies if needed
npm install

# Start development server
npm run dev

# In another terminal, start ngrok for webhook testing
ngrok http 3000
```

---

## Test Scenarios

### ✅ Scenario 1: Successful Downgrade (Supported Payment Method)

**Setup:**
- User has ACTIVE subscription
- Payment method: Card (not UPI/eMandate)
- Current plan: Quarterly (₹4,999)
- Target plan: Monthly (₹1,999)

**Steps:**
1. Navigate to `/subscription/plans`
2. Scroll to Monthly plan card
3. Click "Downgrade to This Plan" button (orange)
4. **Verify dialog shows:**
   - ✅ Plan change summary (Quarterly → Monthly)
   - ✅ Effective date (end of current period)
   - ✅ Savings badge (₹3,000, 60% off)
5. Click "New Plan Limits" to expand
6. **Verify limits section shows:**
   - ✅ Products row with current usage and limit
   - ✅ Categories row with current usage and limit
   - ✅ Billboards row with current usage and limit
   - ✅ Color coding (green or red based on usage)
   - ✅ Alert message (green "all set" or orange "action required")
   - ✅ Info text about current plan benefits until effective date
7. Click "Confirm Downgrade"
8. **Verify:**
   - ✅ Loading spinner appears
   - ✅ Status message: "Scheduling downgrade..."
   - ✅ Success toast appears
   - ✅ Redirect to `/subscription/my-plan`
9. **Verify on my-plan page:**
   - ✅ Scheduled change banner visible
   - ✅ Database: `hasScheduledChanges = true`
   - ✅ Database: `scheduledPlanId = monthly_plan_id`

**Expected Database Changes:**
```sql
-- Subscription table
UPDATE Subscription SET
  hasScheduledChanges = true,
  scheduledPlanId = '[monthly_plan_id]',
  changeScheduledAt = '[period_end_date]',
  metadata = { /* scheduled_downgrade info */ }
WHERE userId = '[user_id]';

-- SubscriptionHistory table (new record)
INSERT INTO SubscriptionHistory (
  action = 'DOWNGRADED',
  stage = 'SCHEDULED',
  fromPlanId = '[quarterly_plan_id]',
  toPlanId = '[monthly_plan_id]'
);
```

---

### ⚠️ Scenario 2: Payment Method Error (UPI/eMandate)

**Setup:**
- User has ACTIVE subscription with UPI payment method
- Current plan: Quarterly
- Target plan: Monthly

**Steps:**
1. Navigate to `/subscription/plans`
2. Click "Downgrade to This Plan" on Monthly plan
3. Verify dialog opens normally
4. Click "Confirm Downgrade"
5. **Verify error handling:**
   - ✅ Error card appears in dialog (red theme)
   - ✅ Title: "📱 Payment Method Not Supported"
   - ✅ Error message from Razorpay displayed
   - ✅ Recommended action section visible with 3 steps
   - ✅ "Don't worry" list visible
   - ✅ "Cancel Current Plan & Subscribe Later" button visible (red)
   - ✅ "Confirm Downgrade" button disabled with warning icon
   - ✅ Error toast appears
6. Click "Cancel Current Plan & Subscribe Later"
7. **Verify cancellation flow:**
   - ✅ Loading state: "Cancelling current subscription..."
   - ✅ API call to `/api/subscription/cancel`
   - ✅ localStorage has `downgradeIntent` object
   - ✅ Warning toast appears
   - ✅ Redirect to `/subscription/plans?downgrade=[id]&cancelled=true`

**Expected localStorage:**
```json
{
  "downgradeIntent": {
    "newPlanId": "[monthly_plan_id]",
    "newPlanName": "Monthly",
    "timestamp": 1702345678900,
    "reason": "Subscription with UPI payment method cannot be updated"
  }
}
```

**Expected Database Changes:**
```sql
-- Subscription table
UPDATE Subscription SET
  status = 'CANCELED',
  cancelledAt = NOW(),
  metadata = { /* cancellation reason */ }
WHERE userId = '[user_id]';

-- SubscriptionHistory table
INSERT INTO SubscriptionHistory (
  action = 'DOWNGRADED',
  stage = 'SCHEDULE_FAILED',
  metadata = { /* error details */ }
);
```

---

### 📊 Scenario 3: Downgrade with Overages

**Setup:**
- User has ACTIVE subscription
- Current plan: Quarterly (limits: 100 products, 50 categories, 20 billboards)
- Target plan: Monthly (limits: 50 products, 20 categories, 10 billboards)
- **Current usage:**
  - Products: 90 (40 over new limit)
  - Categories: 15 (5 under new limit)
  - Billboards: 8 (2 under new limit)

**Steps:**
1. Navigate to `/subscription/plans`
2. Click "Downgrade to This Plan" on Monthly plan
3. **Verify preview dialog shows:**
   - ✅ Overage warning card (orange theme)
   - ✅ "Usage Exceeds New Plan Limits" title
   - ✅ Products row: "90 / 50 (40 over)" in red
   - ✅ 5-day grace period message
   - ✅ Automatic archival warning
4. Expand "New Plan Limits" section
5. **Verify limits display:**
   - ✅ Products: "Your usage: 90 • Limit: 50" (RED)
   - ✅ Categories: "Your usage: 15 • Limit: 20" (GREEN)
   - ✅ Billboards: "Your usage: 8 • Limit: 10" (GREEN)
   - ✅ Orange alert: "Action Required: You should reduce..."
   - ✅ Text: "3-5 days before [effective date]"
6. Click "Confirm Downgrade"
7. **Verify:**
   - ✅ Downgrade schedules successfully
   - ✅ Overage metadata saved in subscription
   - ✅ Redirect to my-plan page

**Expected API Response:**
```json
{
  "canDowngrade": true,
  "hasOverages": true,
  "overages": {
    "products": {
      "resourceType": "PRODUCTS",
      "currentCount": 90,
      "limit": 50,
      "overageCount": 40
    },
    "categories": null,
    "billboards": null,
    "totalOverage": 40
  }
}
```

---

### ✅ Scenario 4: Downgrade with No Overages

**Setup:**
- User has ACTIVE subscription
- Current plan: Quarterly
- Target plan: Monthly
- **Current usage:**
  - Products: 30 (under limit of 50)
  - Categories: 10 (under limit of 20)
  - Billboards: 5 (under limit of 10)

**Steps:**
1. Click "Downgrade to This Plan"
2. **Verify:**
   - ✅ NO overage warning card
   - ✅ Green alert: "✅ You're all set!"
   - ✅ Message: "Your current usage is within the new plan's limits"
3. Expand "New Plan Limits"
4. **Verify all rows show GREEN:**
   - ✅ Products: "Your usage: 30 • Limit: 50" (GREEN)
   - ✅ Categories: "Your usage: 10 • Limit: 20" (GREEN)
   - ✅ Billboards: "Your usage: 5 • Limit: 10" (GREEN)
   - ✅ Green alert: "You're all set!"
5. Click "Confirm Downgrade"
6. **Verify:** Downgrade schedules successfully

---

### ❌ Scenario 5: Already Scheduled Error

**Setup:**
- User has ACTIVE subscription
- `hasScheduledChanges = true` (already has scheduled change)

**Steps:**
1. Try to downgrade to different plan
2. Click "Confirm Downgrade"
3. **Verify:**
   - ✅ Error toast: "Change Already Scheduled"
   - ✅ Message: "You already have a plan change scheduled. Please cancel it first."
   - ✅ No error card in dialog (error toast only)

---

### 🔄 Scenario 6: Cancel Scheduled Downgrade

**Setup:**
- User has scheduled downgrade (`hasScheduledChanges = true`)

**Steps:**
1. Navigate to `/subscription/my-plan`
2. Find "Cancel Scheduled Change" button
3. Click button
4. **Verify:**
   - ✅ Confirmation dialog appears
   - ✅ Click confirm
   - ✅ API call to `/api/subscription/downgrade/cancel-scheduled`
   - ✅ Success toast
   - ✅ Database: `hasScheduledChanges = false`
   - ✅ Scheduled change banner disappears

---

## UI/UX Testing

### Responsiveness
```bash
# Test at these breakpoints:
# - Mobile: 375px width
# - Tablet: 768px width
# - Desktop: 1024px+ width
```

**Checklist:**
- [ ] Dialog doesn't overflow on mobile
- [ ] Buttons stack vertically on small screens
- [ ] Collapsible section works on all devices
- [ ] Text wraps appropriately
- [ ] Icons scale correctly
- [ ] No horizontal scroll

### Keyboard Navigation
- [ ] Tab through all elements
- [ ] Enter/Space triggers buttons
- [ ] Escape closes dialog
- [ ] Focus visible on all interactive elements

### Loading States
- [ ] Spinner appears during API calls
- [ ] Buttons disabled while loading
- [ ] Status message shows correct text
- [ ] Loading state prevents duplicate submissions

### Error States
- [ ] Error card appears for payment method errors
- [ ] Toast notifications appear for all error types
- [ ] Error messages are user-friendly
- [ ] Retry/alternative actions clearly presented

---

## API Testing

### Test with cURL

#### Success Case
```bash
curl -X POST http://localhost:3000/api/subscription/downgrade/schedule \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-auth-cookie]" \
  -d '{"newPlanId":"[monthly_plan_id]"}'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Downgrade scheduled successfully",
  "subscription": {
    "id": "[razorpay_sub_id]",
    "currentPlanId": "[quarterly_plan_id]",
    "scheduledPlanId": "[monthly_plan_id]",
    "hasScheduledChanges": true,
    "changeScheduledAt": "2025-03-15T00:00:00.000Z"
  },
  "overageWarning": { /* ... */ },
  "note": "Your plan will change to Monthly at the end of your current billing period..."
}
```

#### Payment Method Error Case
```bash
# Same request as above but with UPI subscription
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Subscription with UPI payment method cannot be updated",
  "errorCode": "PAYMENT_METHOD_NOT_SUPPORTED",
  "errorType": "PAYMENT_METHOD_LIMITATION",
  "suggestion": "This payment method does not support plan changes...",
  "requiresCancelFlow": true
}
```

---

## Database Verification

### Check Scheduled Change
```sql
SELECT 
  id,
  status,
  planId,
  hasScheduledChanges,
  scheduledPlanId,
  changeScheduledAt,
  metadata
FROM Subscription
WHERE userId = '[user_id]';
```

### Check History
```sql
SELECT 
  id,
  action,
  fromPlanId,
  toPlanId,
  reason,
  metadata,
  createdAt
FROM SubscriptionHistory
WHERE subscriptionId = '[subscription_id]'
ORDER BY createdAt DESC
LIMIT 5;
```

### Check Usage
```sql
SELECT 
  u.id,
  uc.metrics AS usage_metrics,
  sp.maxProducts,
  (sp.additionalLimits->>'maxCategories')::int AS maxCategories,
  (sp.additionalLimits->>'maxBillboards')::int AS maxBillboards
FROM User u
JOIN Subscription s ON s.userId = u.id
JOIN UsageCumulative uc ON uc.userId = u.id
JOIN SubscriptionPlan sp ON sp.id = s.scheduledPlanId
WHERE u.id = '[user_id]';
```

---

## Webhook Testing (Post-Downgrade)

### Setup ngrok
```bash
ngrok http 3000
# Copy HTTPS URL to Razorpay webhook settings
```

### Trigger Webhook Manually
```bash
# Simulate period end by updating subscription at Razorpay dashboard
# OR wait for actual period end
```

### Verify Webhook Processing
1. Check terminal logs for webhook receipt
2. Verify database updated:
   - `planId` changed to `scheduledPlanId`
   - `hasScheduledChanges` set to `false`
   - `scheduledPlanId` cleared
3. Verify history record created with stage = 'COMPLETED'

---

## Performance Testing

### Measure Dialog Load Time
```javascript
// Add to plan-card.tsx
console.time('downgrade-preview');
// ... fetch preview ...
console.timeEnd('downgrade-preview');
// Should be < 500ms
```

### Check for Memory Leaks
1. Open Chrome DevTools → Performance
2. Click downgrade button multiple times
3. Monitor heap snapshots
4. Verify no detached DOM nodes

---

## Accessibility Testing

### Screen Reader Testing
```bash
# Tools: NVDA (Windows), JAWS, VoiceOver (Mac)
```

**Checklist:**
- [ ] Dialog title announced
- [ ] Error messages announced
- [ ] Button states announced (disabled, loading)
- [ ] Form labels associated correctly

### Color Contrast Testing
```bash
# Tool: axe DevTools browser extension
```

**Verify:**
- [ ] All text meets WCAG AA (4.5:1 for normal text)
- [ ] Red error text readable on light background
- [ ] Green success text readable
- [ ] Orange warning text readable

---

## Edge Cases

### 1. Concurrent Operations
- Try to upgrade and downgrade simultaneously
- Try to cancel while downgrade scheduling

### 2. Network Failures
- Disconnect network mid-operation
- Verify proper error handling
- Verify no orphaned state

### 3. Expired Session
- Let auth token expire
- Try to downgrade
- Verify redirect to login

### 4. Invalid Plan ID
- Pass non-existent plan ID
- Verify 404 error handled gracefully

### 5. Subscription State Changes
- Start downgrade, have webhook change subscription state
- Verify conflict handling

---

## Regression Testing

After deployment, verify these still work:
- [ ] Upgrade flow (not affected by downgrade changes)
- [ ] Cancel subscription (not affected)
- [ ] View plan features
- [ ] Usage limit display
- [ ] Payment history
- [ ] Webhook processing

---

## Documentation Verification

- [ ] `DOWNGRADE_FLOW_ENHANCEMENT.md` matches implementation
- [ ] `DOWNGRADE_DIALOG_UI_BREAKDOWN.md` visuals accurate
- [ ] `03-UI-COMPONENTS-CHECKLIST.md` updated
- [ ] Comments in code match behavior

---

## Sign-off Checklist

Before marking as "ready for production":
- [ ] All test scenarios pass
- [ ] No console errors in browser
- [ ] No TypeScript errors
- [ ] Responsive design verified
- [ ] Accessibility checks pass
- [ ] API responses match documentation
- [ ] Database changes verified
- [ ] Webhook handling tested
- [ ] Error flows tested
- [ ] Documentation complete

---

**Test Duration Estimate:** 2-3 hours for full manual testing  
**Automated Testing:** Consider adding Playwright/Cypress tests for critical flows  
**Last Updated:** December 12, 2025
