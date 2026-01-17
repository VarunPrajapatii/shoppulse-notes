# 📋 Subscription Implementation Checklist



## Phase 3: Clerk Integration

### 3.1: User Sync (Webhooks)
- [ ] Create webhook endpoint: `/api/webhooks/clerk`
- [ ] Handle events:
  - [ ] `user.created` → Create User record
  - [ ] `user.updated` → Update email/name
  - [ ] `user.deleted` → Mark as deleted, cancel subscription
- [ ] Verify webhook signature
- [ ] Test with Clerk webhook testing tool

### 3.2: Onboarding Flow
- [ ] Create onboarding page: `/dashboard/onboarding`
- [ ] Collect store name
- [ ] API endpoint: `/api/onboarding/complete`
  - [ ] Create Store
  - [ ] Create Subscription with TRIAL plan
  - [ ] Create SubscriptionHistory record
  - [ ] Mark onboardingComplete: true (only when the user sees all the steps and checks acknowledgement)
- [ ] Send welcome email
- [ ] Redirect to dashboard

---

## Phase 4: Subscription Management API

### 4.1: Core Endpoints
- [ ] `/api/subscription/status` - Get current subscription
- [ ] `/api/subscription/plans` - List available plans
- [ ] `/api/subscription/create-order` - Create Razorpay order
- [ ] `/api/subscription/verify-payment` - Verify payment (frontend callback)
- [ ] `/api/subscription/change-plan` - Upgrade/downgrade
- [ ] `/api/subscription/cancel` - Cancel subscription
- [ ] `/api/subscription/reactivate` - Undo cancellation

### 4.2: Helper Functions
- [ ] `getSubscriptionStatus(userId)` - Get user's subscription
- [ ] `hasActiveSubscription(userId)` - Boolean check
- [ ] `calculateProration(currentPlan, newPlan, daysRemaining)` - Proration logic
- [ ] `isFeatureEnabled(userId, feature)` - Feature flag check

---

## Phase 5: Razorpay Integration

### 5.1: Setup
- [ ] Sign up for Razorpay account
- [ ] Get test API keys (key_id, key_secret)
- [ ] Add to environment variables:
  ```
  RAZORPAY_KEY_ID=rzp_test_xxx
  RAZORPAY_KEY_SECRET=xxx
  RAZORPAY_WEBHOOK_SECRET=xxx
  ```
- [ ] Install Razorpay SDK: `npm install razorpay`

### 5.2: Payment Flow
- [ ] Create Razorpay order on backend
- [ ] Load Razorpay checkout on frontend
- [ ] Handle payment success callback
- [ ] Verify payment signature
- [ ] Create webhook endpoint: `/api/webhooks/razorpay`
- [ ] Handle webhook events:
  - [ ] `payment.captured` → Activate subscription
  - [ ] `payment.failed` → Mark payment as failed
  - [ ] `payment.dispute.created` → Pause subscription
- [ ] Verify webhook signature

### 5.3: Testing
- [ ] Test with test cards (Razorpay provides)
- [ ] Test success flow
- [ ] Test failure flow
- [ ] Test webhook reliability

---

## Phase 6: Access Control (Middleware)

### 6.1: Middleware Logic
- [ ] Create middleware: `src/middleware.ts`
- [ ] Check subscription status for protected routes
- [ ] Route logic:
  - [ ] TRIALING/ACTIVE → Full access
  - [ ] PAST_DUE → Limited access (read-only)
  - [ ] EXPIRED/CANCELED → Redirect to /subscribe
- [ ] Protect API routes as well

### 6.2: Protected Routes
- [ ] `/dashboard/*` - Requires active subscription
- [ ] `/api/products/*` - Requires active subscription
- [ ] `/api/orders/*` - Requires active subscription
- [ ] Allow access:
  - [ ] `/subscribe` - Always accessible
  - [ ] `/account/*` - Always accessible

### 6.3: UI Banners
- [ ] Trial banner (days remaining)
- [ ] PAST_DUE banner (payment failed)
- [ ] Cancellation scheduled banner

---

## Phase 7: Cron Jobs (Automation)

### 7.1: Setup Cron System
- [ ] Choose cron solution:
  - [ ] Vercel Cron (if on Vercel)
  - [ ] Node-cron (self-hosted)
  - [ ] External service
- [ ] Add cron configuration

### 7.2: Create Cron Jobs
- [ ] `/api/cron/check-trials` - Expire trials daily
- [ ] `/api/cron/check-renewals` - Send renewal reminders
- [ ] `/api/cron/process-renewals` - Create renewal orders
- [ ] `/api/cron/expire-past-due` - Expire after 14 days
- [ ] `/api/cron/finalize-cancellations` - Complete scheduled cancellations
- [ ] `/api/cron/reconcile-payments` - Fix missed webhooks (hourly)

### 7.3: Cron Security
- [ ] Add cron secret to verify requests
- [ ] Rate limit cron endpoints
- [ ] Log all cron executions

---

## Phase 8: Email Notifications

### 8.1: Setup Email Service
- [ ] Choose provider:
  - [ ] Resend (recommended, free tier)
  - [ ] SendGrid
  - [ ] AWS SES
- [ ] Get API key
- [ ] Add to environment variables

### 8.2: Email Templates
- [ ] Welcome email (trial started)
- [ ] Trial ending reminder (3 days before)
- [ ] Trial expired
- [ ] Payment successful
- [ ] Payment failed
- [ ] Renewal reminder (3 days before)
- [ ] Subscription canceled
- [ ] Subscription expired

### 8.3: Implementation
- [ ] Create email service: `lib/email-service.ts`
- [ ] Create email templates (React Email or plain HTML)
- [ ] Test all email flows

---

## Phase 9: User-Facing Pages

### 9.1: Subscription Pages
- [ ] `/subscribe` - Pricing page with payment
  - [ ] Show plans (Monthly/Yearly)
  - [ ] Razorpay checkout integration
  - [ ] Loading states
  - [ ] Error handling
- [ ] `/account/subscription` - Manage subscription
  - [ ] Current plan display
  - [ ] Next billing date
  - [ ] Payment history
  - [ ] Cancel button
  - [ ] Change plan button
- [ ] `/account/billing` - Payment history
  - [ ] List all payments
  - [ ] Download invoices (if implemented)

### 9.2: Dashboard Updates
- [ ] Add subscription banner
- [ ] Trial countdown
- [ ] Payment failed warning
- [ ] Cancellation notice

---

## Phase 10: Testing

### 10.1: Manual Testing
- [ ] Test complete signup flow
- [ ] Test trial → expired → subscribe flow
- [ ] Test payment success
- [ ] Test payment failure
- [ ] Test renewal (mock by changing dates)
- [ ] Test cancellation (immediate)
- [ ] Test cancellation (at period end)
- [ ] Test plan changes
- [ ] Test access control (different statuses)

### 10.2: Edge Case Testing
- [ ] Duplicate webhooks
- [ ] Webhook arrives before frontend callback
- [ ] Multiple browser tabs
- [ ] Trial abuse (same email)
- [ ] Network timeout during payment
- [ ] Cron job failures
- [ ] User deletes Clerk account
- [ ] Email changes

### 10.3: Load Testing (Optional)
- [ ] Simulate many concurrent payments
- [ ] Test webhook handling under load

---

## Phase 11: Monitoring & Logging

### 11.1: Error Tracking
- [ ] Set up Sentry (or similar)
- [ ] Log all errors with context
- [ ] Create error log table in database

### 11.2: Metrics Dashboard
- [ ] Track key metrics:
  - [ ] Active subscriptions
  - [ ] Trial conversion rate
  - [ ] Churn rate
  - [ ] MRR (Monthly Recurring Revenue)
  - [ ] Payment success rate
- [ ] Create admin dashboard for metrics

### 11.3: Alerts
- [ ] Alert if cron job fails
- [ ] Alert if payment success rate drops
- [ ] Alert if webhook signature verification fails

---

## Phase 12: Documentation

### 12.1: Developer Docs
- [ ] API documentation
- [ ] Database schema documentation
- [ ] Webhook documentation
- [ ] Cron job documentation

### 12.2: User Docs
- [ ] FAQ page
- [ ] Billing policy
- [ ] Refund policy
- [ ] Terms of service updates

---

## Phase 13: Production Readiness

### 13.1: Security Audit
- [ ] Review all API endpoints
- [ ] Check authentication on all routes
- [ ] Verify webhook signature verification
- [ ] Test SQL injection prevention (Prisma handles this)
- [ ] Test XSS prevention
- [ ] Rate limiting on payment endpoints

### 13.2: Performance Optimization
- [ ] Add database indexes (already in schema)
- [ ] Optimize subscription status queries
- [ ] Cache subscription data in Redis (optional)

### 13.3: Compliance
- [ ] Privacy policy update (data retention)
- [ ] Terms of service (subscription terms)
- [ ] GST compliance (if applicable)
- [ ] Invoice generation (if required)

---

## Phase 14: Launch

### 14.1: Pre-Launch
- [ ] Switch to Razorpay live keys
- [ ] Test one live payment (small amount)
- [ ] Verify webhook works in production
- [ ] Test cron jobs in production

### 14.2: Launch Day
- [ ] Monitor payment flow
- [ ] Monitor error logs
- [ ] Be ready for customer support

### 14.3: Post-Launch
- [ ] Collect user feedback
- [ ] Monitor conversion rates
- [ ] Iterate on pricing/plans if needed

---

## Optional Enhancements

### Future Features
- [ ] Coupon/discount codes
- [ ] Referral program (give trial extensions)
- [ ] Annual receipts for tax purposes
- [ ] Multi-currency support
- [ ] Team/collaboration features (multiple users per store)
- [ ] Usage-based billing (if you add API access)
- [ ] Self-service refunds (partial refunds)
- [ ] Subscription pause (vacation mode)
- [ ] Add-ons (extra storage, products, etc.)

---

## Decision Log

Track important decisions made during implementation:

| Date | Decision | Reason | Status |
|------|----------|--------|--------|
| - | Use Clerk for auth | Speed, security, less maintenance | ✅ Confirmed |
| - | Single schema file | Prisma limitation, industry standard | ✅ Confirmed |
| - | Manual renewal orders | More control than Razorpay subscriptions | 🤔 Pending |
| - | 14-day grace period | Industry standard for failed payments | 🤔 Pending |
| - | Trial: 7 days | As per requirements | ✅ Confirmed |
| - | Plans: Monthly/Yearly | Simple 2-tier model | ✅ Confirmed |
| - | Invoice model | Add now or later? | 🤔 Pending |
| - | Multi-store support | Remove @unique constraint? | 🤔 Pending |

---

## Resources

### Documentation Links
- Clerk: https://clerk.com/docs
- Razorpay: https://razorpay.com/docs/
- Prisma: https://www.prisma.io/docs
- Vercel Cron: https://vercel.com/docs/cron-jobs

### Code Examples
- Razorpay Checkout: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
- Clerk Webhooks: https://clerk.com/docs/integrations/webhooks
- Prisma Transactions: https://www.prisma.io/docs/concepts/components/prisma-client/transactions

### Tools
- Webhook Testing: https://webhook.site/
- Razorpay Test Cards: https://razorpay.com/docs/payments/payments/test-card-details/
- Email Testing: https://mailtrap.io/

---

## Notes

Add implementation notes, gotchas, or learnings here as you build:

```
- [Date] Note about specific challenge or solution
- [Date] Performance optimization discovered
- [Date] Bug fix or edge case handled
```
