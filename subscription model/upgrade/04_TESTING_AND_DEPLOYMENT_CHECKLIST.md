# Upgrade — Testing & Deployment Checklist

All testing, deployment, monitoring, and rollback procedures for the upgrade feature.

---

## Implementation Status

| Area | Status |
|---|---|
| Backend (Preview, Execute, Webhook, Fallback, Status) | ✅ Complete |
| Frontend (Dialog, Banner, Plan Card, Plans Page) | ✅ Complete |
| Database (Schema, Migrations, Indexes) | ✅ Complete |
| UPI/eMandate Cancel & Resubscribe flow | ✅ Complete |
| Testing | ❌ Pending |
| Deployment | ❌ Pending |

---

## Test Environment Setup

- [ ] Start database: `docker-compose up -d`
- [ ] Run migrations: `npx prisma migrate dev`
- [ ] Seed test data if needed: `npx prisma db seed`
- [ ] Start dev server: `npm run dev`
- [ ] Start ngrok for webhooks: `ngrok http 3000`
- [ ] Update Razorpay webhook URL to ngrok URL

---

## API Testing

### Preview Endpoint
- [ ] Valid plan → returns proration breakdown
- [ ] Same-price plan → fails
- [ ] Cheaper plan → fails ("use downgrade")
- [ ] Charge < ₹0.50 → fails with minimum charge error
- [ ] Inactive subscription → fails
- [ ] No authentication → returns 401

### Execute Endpoint
- [ ] Successful upgrade → check logs + Razorpay dashboard
- [ ] Verify metadata updated with upgrade attempt
- [ ] Verify SubscriptionHistory record created (INITIATED)
- [ ] Invalid plan → fails
- [ ] Non-existent subscription → fails
- [ ] UPI subscription → fails with `requiresCancelFlow: true`

### Webhook Handler
- [ ] Trigger upgrade in Razorpay test mode
- [ ] Verify `subscription.updated` webhook received
- [ ] Confirm NO `subscription.charged` webhook fires
- [ ] Check DB: planId changed to new plan
- [ ] Check SubscriptionHistory: COMPLETED record with amountCharged
- [ ] Check Payment: UPGRADE_CHARGE type with invoiceId
- [ ] Check subscription: planChangeCount incremented
- [ ] Check subscription: lastPlanChangeAt updated
- [ ] Check subscription: hasScheduledChanges cleared
- [ ] Check subscription: webhookSyncStatus = SYNCED

### Polling + Fallback
- [ ] Status endpoint returns PENDING immediately after execute
- [ ] Status endpoint returns SYNCED after webhook arrives
- [ ] Fallback endpoint syncs DB when webhook delayed
- [ ] Fallback no-ops when webhook already synced (idempotency)

---

## Frontend Testing

### Happy Path
- [ ] "Upgrade" button appears on higher-tier plans
- [ ] Dialog opens, shows loading spinner
- [ ] Preview data loads correctly
- [ ] Proration calculation displays
- [ ] "Confirm Upgrade" → processing spinner
- [ ] Polling phase shows "Payment charged. Confirming..."
- [ ] Success state (green check) → auto-closes after 2s
- [ ] Page refreshes, shows new plan
- [ ] Payment record in DB
- [ ] History record with UPGRADED action

### UPI/eMandate Failure Path
- [ ] Payment Failure Dialog shows with correct reason
- [ ] Credit loss warning displays accurate amount
- [ ] "Continue & Lose Credit" → cancels subscription immediately
- [ ] Redirect to plans page with `?upgrade=planId&cancelled=true`
- [ ] Orange UpgradeIntentBanner appears
- [ ] Auto-scroll to target plan
- [ ] Normal checkout flow completes new subscription
- [ ] "Cancel Upgrade" → dialog closes, no action taken

### Error Scenarios
- [ ] Network error during preview → error alert in dialog
- [ ] Payment failure during execute → error toast, dialog stays open
- [ ] Minimum charge < ₹0.50 → preview returns error
- [ ] Close dialog before preview loads → clean cleanup
- [ ] Close dialog during execution → execution continues server-side

### Responsive Design
- [ ] Dialog fits on mobile screens
- [ ] Plan comparison cards stack vertically on small screens
- [ ] Buttons stack on mobile

---

## Edge Case Testing

- [ ] Upgrade near end of billing cycle (< 3 days remaining)
- [ ] Upgrade from trial plan
- [ ] Upgrade with different billing cycles (monthly → yearly)
- [ ] Multiple rapid upgrades (upgrade twice within 5 minutes)
- [ ] Upgrade fails → check metadata shows attempt
- [ ] Webhook delayed (> 20s) → fallback fires and syncs
- [ ] Concurrent upgrades from multiple tabs → first succeeds, others fail
- [ ] Upgrade from CANCELED status (period-end cancellation) → should work via UPDATE API
- [ ] Upgrade from PAST_DUE → should be blocked
- [ ] User closes browser mid-polling → webhook syncs server-side

### Error Injection
- [ ] Database connection fails during execute
- [ ] Razorpay API timeout
- [ ] Invalid webhook signature → rejected
- [ ] Insufficient funds → no webhook, auto-rollback
- [ ] Plan not found in database
- [ ] Race condition: subscription already upgraded

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation complete
- [ ] Frontend UI approved

### Razorpay Production Setup
- [ ] Create production subscription plans in Razorpay
- [ ] Copy production plan IDs
- [ ] Update SubscriptionPlan table with production `razorpayPlanId` values
- [ ] Set up webhook: `https://yourdomain.com/api/webhook/razorpay/subscription`
- [ ] Test webhook delivery in Razorpay dashboard

### Environment Variables (Production)
- [ ] `RAZORPAY_KEY_ID` — Production key
- [ ] `RAZORPAY_KEY_SECRET` — Production secret
- [ ] `RAZORPAY_WEBHOOK_SECRET` — Production webhook secret
- [ ] `DATABASE_URL` — Production database
- [ ] `NEXT_PUBLIC_APP_URL` — Production domain

### Database Migration
- [ ] Backup production database
- [ ] Run migration: `npx prisma migrate deploy`
- [ ] Verify indexes created
- [ ] Backfill existing active subscriptions:
  ```sql
  UPDATE "Subscription"
  SET "firstActivatedAt" = "createdAt"
  WHERE status = 'ACTIVE' AND "firstActivatedAt" IS NULL;
  ```

### Post-Deployment
- [ ] Test upgrade flow in production (small amount first)
- [ ] Verify webhook receives events
- [ ] Monitor logs for errors
- [ ] Check Razorpay dashboard for successful transactions
- [ ] Verify notification emails sent
- [ ] Monitor database for correct updates

---

## Rollback Plan

If issues occur:
1. Disable frontend upgrade button (feature flag or code push)
2. Investigate in logs + Razorpay dashboard
3. If critical — rollback migration:
   ```bash
   npx prisma migrate resolve --rolled-back 20250116_add_upgrade_tracking_fields
   ```
4. Fix in development → re-test → re-deploy

---

## Monitoring (Post-Launch)

### Metrics to Track
- [ ] Upgrade success rate (executed → completed)
- [ ] Average upgrade charge amount
- [ ] Most common upgrade paths (Pro → Enterprise, etc.)
- [ ] Time from first activation to first upgrade
- [ ] Failed upgrades and reasons
- [ ] Payment failure rate
- [ ] UPI cancel-and-resubscribe conversion rate

### Alerts to Set Up
- [ ] Upgrade execution failures > 5%
- [ ] Webhook processing errors
- [ ] Razorpay API errors
- [ ] Database transaction failures
- [ ] Charge amount < ₹0.50 attempts (edge case)
- [ ] webhookSyncStatus stuck at PENDING for > 1 hour

### Weekly Review
- [ ] Upgrade revenue vs regular subscription revenue
- [ ] Users who upgraded multiple times (upsell targets)
- [ ] Failed upgrades review (payment issues, technical errors)
- [ ] User feedback about upgrade experience

---

## Definition of Done

| Area | Status |
|---|---|
| Schema + migrations | ✅ |
| Preview API | ✅ |
| Execute API | ✅ |
| Status polling API | ✅ |
| Fallback confirmation API | ✅ |
| Webhook handler | ✅ |
| Shared `applySubscriptionPlanChange()` | ✅ |
| Upgrade dialog (w/ payment failure) | ✅ |
| Plans page integration | ✅ |
| Upgrade intent banner | ✅ |
| UPI cancel & resubscribe | ✅ |
| All API tests pass | ❌ |
| Frontend tests pass | ❌ |
| Edge cases tested | ❌ |
| User acceptance testing | ❌ |
| Production migration applied | ❌ |
| Razorpay production configured | ❌ |
| Webhook tested in production | ❌ |
| Monitoring set up | ❌ |

**Next Action:** Manual testing → Edge case testing → Deployment preparation
