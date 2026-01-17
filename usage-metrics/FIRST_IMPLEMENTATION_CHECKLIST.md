# Usage Metrics Implementation Checklist

**Timeline**: 12-17 days (2.5-3.5 weeks)  
**Priority**: 🔴 Critical (Blocks downgrade feature)

---

## 📋 Quick Overview

```
Week 1: Core Infrastructure + Tracking
Week 2: Enforcement + UI
Week 3: Notifications + Testing
```

---

## Phase 1: Core Infrastructure (2-3 days)

### Day 1-2: Usage Service
- [ ] Create `src/lib/usage-service.ts`
  - [ ] `checkUsageLimit()` - Check if user can create resource
  - [ ] `incrementUsage()` - Increment counter when resource created
  - [ ] `decrementUsage()` - Decrement counter when resource deleted
  - [ ] `getCurrentUsage()` - Get current count for metric
  - [ ] `getAllUsageData()` - Get all metrics for dashboard
  - [ ] `updateBillingPeriods()` - Update periods on subscription change
  - [ ] `resetPeriodMetrics()` - Reset orders/API calls counters

**Testing**:
- [ ] Unit tests for all functions
- [ ] Test period calculations
- [ ] Test increment/decrement atomic operations

---

## Phase 2: Real-time Tracking (3-4 days)

### Day 3: Products API Integration
- [ ] **POST** `/api/[storeId]/products` (Create)
  - [ ] Add pre-check: `checkUsageLimit(userId, 'PRODUCTS')`
  - [ ] Return 403 if limit exceeded
  - [ ] Increment usage in transaction with product creation
  - [ ] Add error handling for limit exceeded

- [ ] **DELETE** `/api/[storeId]/products/[productId]`
  - [ ] Decrement usage after successful deletion
  - [ ] Handle errors gracefully

<!--  User's perspective:
"I have 100 products (80 active + 20 archived/seasonal)"
"My limit is 100 products" ✅ Correct
Remove these from implementation:

❌ Decrement usage when archived
❌ Increment usage when unarchived
❌ PATCH endpoint usage tracking -->
- [ ] **PATCH** `/api/[storeId]/products/[productId]` (Archive)
  - [ ] Detect archiving status change
  - [ ] Decrement if archived (false → true)
  - [ ] Increment if unarchived (true → false)

**Testing**:
- [ ] Create product → Usage increments
- [ ] Delete product → Usage decrements
- [ ] Archive product → Usage decrements
- [ ] Unarchive product → Usage increments
- [ ] Create at limit → Blocked with error

---
 
### Day 4: Orders API Integration
- [ ] **POST** `/api/[storeId]/checkout` (Create Order)
  - [ ] Increment orders counter after order creation
  - [ ] Note: Orders reset each billing period

**Testing**:
- [ ] Order created → Counter increments
- [ ] Verify period-based tracking

---

### Day 5: Categories & Billboards APIs
- [ ] **Categories POST** `/api/[storeId]/categories`
  - [ ] Pre-check limit
  - [ ] Increment on create
  - [ ] Decrement on delete

- [ ] **Billboards POST** `/api/[storeId]/billboards`
  - [ ] Pre-check limit
  - [ ] Increment on create
  - [ ] Decrement on delete

**Testing**:
- [ ] Category/Billboard creation → Increment
- [ ] Category/Billboard deletion → Decrement
- [ ] At limit → Blocked

---

## Phase 3: Limit Enforcement (2-3 days)

### Day 6: Error Handling
- [ ] Create `src/lib/api-errors.ts`
  - [ ] `createLimitError()` helper
  - [ ] Consistent error response schema
  - [ ] Error codes and messages

- [ ] Update all creation APIs with consistent errors
  - [ ] Products
  - [ ] Categories
  - [ ] Billboards

**Testing**:
- [ ] All APIs return same error format
- [ ] Error includes current/limit/percentage
- [ ] Error includes upgrade URL

---

### Day 7: Webhook Integration
- [ ] **subscription.updated** handler
  - [ ] Call `updateBillingPeriods()` on plan change
  - [ ] Update all UsageRecord entries with new periods
  - [ ] Handle upgrade (immediate period update)
  - [ ] Handle downgrade (check for grace period)

- [ ] **subscription.charged** handler
  - [ ] Detect if new billing period started
  - [ ] Call `resetPeriodMetrics()` if new period

**Testing**:
- [ ] Upgrade → Periods updated immediately
- [ ] New billing cycle → Orders counter resets
- [ ] Downgrade → Grace period activates if over limit

---

## Phase 4: User Experience (3-4 days)

### Day 8-9: Dashboard Components
- [ ] Create `src/components/subscription/usage-card.tsx`
  - [ ] UsageMetricRow component
  - [ ] Progress bars
  - [ ] Color coding (green/yellow/orange/red)
  - [ ] Percentage display
  - [ ] Upgrade CTA

- [ ] Create `src/components/subscription/usage-badge.tsx`
  - [ ] Small badge for headers
  - [ ] Shows current/limit

**Testing**:
- [ ] Visual testing at different percentages
- [ ] 0-70%: Green
- [ ] 70-90%: Yellow
- [ ] 90-100%: Orange
- [ ] 100%+: Red

---

### Day 10: Page Updates
- [ ] **My Plan Page** (`/subscription/my-plan`)
  - [ ] Fetch `getAllUsageData(userId)`
  - [ ] Display UsageCard with all metrics
  - [ ] Show upgrade suggestions if >80%

- [ ] **Products Page** (`/[storeId]/products`)
  - [ ] Add usage display in header
  - [ ] Disable "Add Product" button if at limit
  - [ ] Show warning banner at 90%+
  - [ ] Show error banner at 100%

- [ ] **Create Product Page** (`/[storeId]/products/new`)
  - [ ] Show usage badge
  - [ ] Disable form if at limit
  - [ ] Handle API error (limit exceeded)
  - [ ] Show upgrade modal

**Testing**:
- [ ] All pages show accurate usage
- [ ] Buttons disabled when appropriate
- [ ] Warnings show at correct thresholds
- [ ] Upgrade CTAs work correctly

---

## Phase 5: Notifications & Automation (2-3 days)

### Day 11: Email Templates
- [ ] Create email templates
  - [ ] `usage-warning-80.tsx` (80% threshold)
  - [ ] `usage-critical-90.tsx` (90% threshold)
  - [ ] `usage-exceeded-100.tsx` (100% limit reached)
  - [ ] `grace-period-activation.tsx` (Downgrade + over limit)
  - [ ] `grace-period-reminder.tsx` (7/3/1 days before)
  - [ ] `products-archived.tsx` (Auto-archive notification)

**Testing**:
- [ ] All templates render correctly
- [ ] Dynamic data populates
- [ ] Links work (upgrade URL)

---

### Day 12: Notification Service
- [ ] Create `src/lib/notification-service.ts`
  - [ ] `sendUsageThresholdNotification()` (80/90/100%)
  - [ ] `sendGracePeriodEmail()` (Activation)
  - [ ] `sendGracePeriodReminder()` (7/3/1 days)
  - [ ] `sendArchivedProductsEmail()` (After auto-archive)

- [ ] Integrate with usage service
  - [ ] Check thresholds after increment
  - [ ] Send email if crossed 80%/90%/100%
  - [ ] Track sent emails (don't spam)

**Testing**:
- [ ] Email sent at 80% (only once)
- [ ] Email sent at 90% (only once)
- [ ] Email sent at 100% (only once)
- [ ] Grace period emails sent correctly

---

### Day 13: Cron Jobs
- [ ] **Reset Period Metrics** (`/api/cron/reset-period-usage`)
  - [ ] Run daily at midnight
  - [ ] Find subscriptions with new period
  - [ ] Reset ORDERS counter to 0
  - [ ] Reset API_CALLS counter to 0
  - [ ] Log results

- [ ] **Grace Period Reminders** (`/api/cron/send-grace-period-reminders`)
  - [ ] Run daily at 9 AM
  - [ ] Find grace periods expiring in 7/3/1 days
  - [ ] Send reminder emails
  - [ ] Log results

- [ ] **Grace Period Enforcement** (`/api/cron/enforce-grace-period`)
  - [ ] Run daily at midnight
  - [ ] Find expired grace periods
  - [ ] Select oldest products to archive
  - [ ] Archive products (set isArchived = true)
  - [ ] Update grace period status
  - [ ] Send email with archived products list

- [ ] Configure Vercel Cron (`vercel.json`)
  ```json
  {
    "crons": [
      { "path": "/api/cron/reset-period-usage", "schedule": "0 0 * * *" },
      { "path": "/api/cron/send-grace-period-reminders", "schedule": "0 9 * * *" },
      { "path": "/api/cron/enforce-grace-period", "schedule": "0 0 * * *" }
    ]
  }
  ```

**Testing**:
- [ ] Test cron endpoints manually
- [ ] Verify cron authorization (CRON_SECRET)
- [ ] Test with expired grace periods
- [ ] Verify products archived correctly
- [ ] Verify emails sent

---

## Phase 6: Testing & Polish (2-3 days)

### Day 14: Integration Testing
- [ ] **Scenario 1**: New user trial → Monthly subscription
  - [ ] Usage records created with trial period
  - [ ] Period updated on subscription
  - [ ] Usage tracking works

- [ ] **Scenario 2**: Create products until limit
  - [ ] Can create up to limit
  - [ ] Blocked at limit with clear error
  - [ ] Email sent at 80%
  - [ ] Email sent at 90%
  - [ ] Email sent at 100%

- [ ] **Scenario 3**: Delete products
  - [ ] Usage decrements correctly
  - [ ] Can create again after deletion

- [ ] **Scenario 4**: Archive products
  - [ ] Usage decrements when archived
  - [ ] Usage increments when unarchived
  - [ ] Archived products don't count toward limit

- [ ] **Scenario 5**: Upgrade plan
  - [ ] Periods updated immediately
  - [ ] New limits applied
  - [ ] Can create more resources

- [ ] **Scenario 6**: New billing period
  - [ ] Orders counter resets to 0
  - [ ] Products counter stays cumulative
  - [ ] Can receive orders again

- [ ] **Scenario 7**: Downgrade with grace period
  - [ ] User has 90 products, downgrades to 50 limit
  - [ ] Grace period activates (14 days)
  - [ ] Reminder emails sent (7, 3, 1 days)
  - [ ] 40 oldest products archived on day 14
  - [ ] Email sent with archived products list

**Testing Checklist**:
- [ ] All scenarios pass
- [ ] No race conditions
- [ ] No double-counting
- [ ] Error handling works
- [ ] UI updates correctly

---

### Day 15: Performance Testing
- [ ] **Load Testing**
  - [ ] Create 1000 products (simulate high usage)
  - [ ] Check query performance
  - [ ] Verify no N+1 queries

- [ ] **Caching**
  - [ ] Add Redis/in-memory cache for usage data
  - [ ] Cache TTL: 5 minutes
  - [ ] Invalidate on create/delete
  - [ ] Test cache hit rate

- [ ] **Database Optimization**
  - [ ] Verify indexes on UsageRecord table
  - [ ] Check query execution plans
  - [ ] Optimize slow queries

**Performance Targets**:
- [ ] `checkUsageLimit()` < 100ms
- [ ] `incrementUsage()` < 200ms
- [ ] Dashboard load < 500ms

---

### Day 16: Bug Fixes & Edge Cases
- [ ] **Edge Cases**
  - [ ] User deletes product during grace period → Update excess count
  - [ ] User upgrades during grace period → Deactivate grace period
  - [ ] Subscription expires during grace period → Handle correctly
  - [ ] Product creation fails → Don't increment usage
  - [ ] Double-click "Create" button → Prevent double-increment

- [ ] **Error Recovery**
  - [ ] Database connection fails → Fail open (allow access)
  - [ ] Email service fails → Log error, don't block user
  - [ ] Cron job fails → Retry mechanism

**Testing**:
- [ ] All edge cases handled gracefully
- [ ] No data corruption
- [ ] System degrades gracefully on errors

---

### Day 17: Documentation & Deployment
- [ ] **Code Documentation**
  - [ ] Add JSDoc comments to all functions
  - [ ] Document assumptions and edge cases
  - [ ] Add examples in comments

- [ ] **Deployment Checklist**
  - [ ] Environment variables set (CRON_SECRET)
  - [ ] Database migration if schema changed
  - [ ] Vercel cron configured
  - [ ] Email service configured (SendGrid/AWS SES)
  - [ ] Error tracking (Sentry) configured

- [ ] **Monitoring**
  - [ ] Set up alerts for failed cron jobs
  - [ ] Monitor usage tracking errors
  - [ ] Dashboard for usage metrics
  - [ ] Track email delivery rates

- [ ] **Rollout Plan**
  - [ ] Deploy to staging first
  - [ ] Test all scenarios in staging
  - [ ] Gradual rollout (10% → 50% → 100%)
  - [ ] Monitor for issues

**Final Checks**:
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation complete
- [ ] Monitoring in place
- [ ] Rollback plan ready

---

## 🎯 Critical Path (Minimum Viable Implementation)

If you need to ship quickly, focus on these:

### Week 1: Bare Minimum (5 days)
- [ ] Day 1-2: Usage service (core functions only)
- [ ] Day 3: Products API tracking (create/delete)
- [ ] Day 4: Products limit enforcement
- [ ] Day 5: Basic dashboard display

**Result**: Users can't exceed product limits, see usage in dashboard

### Week 2: Complete It (3 days)
- [ ] Day 6: Orders/Categories/Billboards tracking
- [ ] Day 7: Webhook integration (period updates)
- [ ] Day 8: Email notifications (80/90/100%)

**Result**: Full usage tracking, all metrics enforced, notifications working

### Week 3: Grace Period (Optional)
- [ ] Implement grace period for downgrades
- [ ] Cron jobs for auto-archive
- [ ] Reminder emails

**Result**: Complete downgrade flow with grace period

---

## 📊 Progress Tracking

**Completed**: 0 / 80+ tasks  
**Current Phase**: Not Started  
**Estimated Completion**: 17 days from start

### Quick Status Check
- [ ] Phase 1: Core Infrastructure (0%)
- [ ] Phase 2: Real-time Tracking (0%)
- [ ] Phase 3: Limit Enforcement (0%)
- [ ] Phase 4: User Experience (0%)
- [ ] Phase 5: Notifications (0%)
- [ ] Phase 6: Testing & Polish (0%)

---

## 🚀 Ready to Start?

**Next Action**: Create `src/lib/usage-service.ts` from PART_3 documentation

**Copy-paste ready code available in**:
- `notes/usage-metrics/PART_3_IMPLEMENTATION_GUIDE.md`
