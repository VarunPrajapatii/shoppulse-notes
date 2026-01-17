# Pre-Hosting Checklist

## Overview

Complete checklist for deploying ShopPulse Admin to production. Follow each section in order.

---

## 1. Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `CLERK_SECRET_KEY` | Clerk backend API key | `sk_live_xxxxx` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key | `pk_live_xxxxx` |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret | `whsec_xxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret | `xxxxx` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay API key ID | `rzp_live_xxxxx` |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret | `xxxxx` |
| `CRON_SECRET` | Secret for cron job authentication | Random 32+ char string |
| `ENCRYPTION_KEY` | 64-char hex string for encryption | Generate with `openssl rand -hex 32` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your-cloud-name` |

### URL Variables

| Variable | Description | Value |
|----------|-------------|-------|
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign in route | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign up route | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Post sign-in redirect | `/api/auth/post-auth` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Post sign-up redirect | `/api/auth/post-auth` |
| `FRONTEND_URL` | Frontend store URL | `https://your-store.com` |

### Optional (Alert System)

| Variable | Description |
|----------|-------------|
| `EMAIL_PROVIDER` | `resend` or `sendgrid` |
| `ADMIN_ALERT_EMAIL` | Email for admin alerts |
| `RESEND_API_KEY` | Resend API key (if using) |
| `SLACK_WEBHOOK_URL` | Slack webhook for alerts |

---

## 2. Database Setup

### 2.1 Run Migrations
```bash
npx prisma migrate deploy
```

### 2.2 Seed Subscription Plans
```bash
npx prisma db seed
```

**Verify 4 plans created:**
- TRIAL (7 days, ₹0)
- BASIC (Monthly, ₹999)
- PRO (Half-Yearly, ₹4999)
- PREMIUM (Yearly, ₹8999)

### 2.3 Verify Tables
```bash
npx prisma studio
```

**Check these tables exist:**
- User
- Store
- Subscription
- SubscriptionPlan
- SubscriptionHistory
- UsageRecord
- UsageHistory
- Payment
- ArchivedProduct
- Product, Category, Billboard, Size, Color, Order, OrderItem, Image

---

## 3. Clerk Configuration

### 3.1 Dashboard Settings
1. Go to https://dashboard.clerk.com
2. Select production app
3. Configure allowed origins
4. Enable/disable OAuth providers as needed

### 3.2 Webhook Setup
1. Go to Webhooks section
2. Create new endpoint:
   - URL: `https://your-domain.com/api/webhook/clerk`
   - Events:
     - ✅ `user.created`
     - ✅ `user.updated`
     - ✅ `user.deleted`
     - ✅ `session.created`
3. Copy signing secret → `CLERK_WEBHOOK_SECRET`

### 3.3 Verify Webhook
- Sign up new user
- Check Vercel logs for `POST 200 /api/webhook/clerk`
- Verify user created in database

---

## 4. Razorpay Configuration

### 4.1 Dashboard Settings
1. Go to https://dashboard.razorpay.com
2. Switch to Live mode (not Test)
3. Copy API Key ID → `NEXT_PUBLIC_RAZORPAY_KEY_ID`
4. Copy API Secret → `RAZORPAY_KEY_SECRET`

### 4.2 Create Subscription Plans
Create plans in Razorpay matching your database:

| Plan | Period | Amount | Notes |
|------|--------|--------|-------|
| BASIC | monthly | 99900 paise (₹999) | |
| PRO | half_yearly | 499900 paise (₹4999) | |
| PREMIUM | yearly | 899900 paise (₹8999) | |

**Copy each plan's `plan_id` to database:**
```sql
UPDATE "SubscriptionPlan" SET "razorpayPlanId" = 'plan_xxxxx' WHERE name = 'BASIC';
UPDATE "SubscriptionPlan" SET "razorpayPlanId" = 'plan_xxxxx' WHERE name = 'PRO';
UPDATE "SubscriptionPlan" SET "razorpayPlanId" = 'plan_xxxxx' WHERE name = 'PREMIUM';
```

### 4.3 Webhook Setup
1. Go to Settings → Webhooks
2. Add new webhook:
   - URL: `https://your-domain.com/api/webhook/razorpay/subscription`
   - Secret: Generate and copy → `RAZORPAY_WEBHOOK_SECRET`
   - Events:
     - ✅ `subscription.authenticated`
     - ✅ `subscription.charged`
     - ✅ `subscription.pending`
     - ✅ `subscription.halted`
     - ✅ `subscription.cancelled`
     - ✅ `subscription.completed`
     - ✅ `subscription.paused`
     - ✅ `subscription.resumed`
     - ✅ `subscription.updated`

### 4.4 Verify Webhook
- Complete a test subscription
- Check Vercel logs for `POST 200 /api/webhook/razorpay/subscription`
- Verify subscription status updated

---

## 5. Vercel Cron Jobs Setup

### 5.1 Create vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron/expire-trials-detect-payment-failure",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/expire-period-ended-subscriptions",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/enforce-grace-periods",
      "schedule": "0 4 * * *"
    },
    {
      "path": "/api/cron/cleanup-archived-products",
      "schedule": "0 5 * * 0"
    }
  ]
}
```

### 5.2 Set CRON_SECRET
Generate a secure random string:
```bash
openssl rand -hex 32
```

Add to Vercel environment variables as `CRON_SECRET`.

### 5.3 Verify Crons
After deployment, check Vercel dashboard → Functions → Cron Jobs.

---

## 6. Pre-Deployment Checks

### 6.1 Code Quality
- [ ] No TypeScript errors (`npm run build`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] All tests passing (if any)

### 6.2 Security
- [ ] All secrets in environment variables (not code)
- [ ] `.env` files in `.gitignore`
- [ ] Webhook verification enabled
- [ ] CORS properly configured

### 6.3 Database
- [ ] Migrations applied
- [ ] Subscription plans seeded
- [ ] No duplicate users/stores
- [ ] Foreign keys intact

---

## 7. Deployment Steps

### 7.1 Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 7.2 Post-Deployment Verification

1. **Homepage loads** - Check styling, images
2. **Sign up works** - Create new account
3. **Webhook fires** - Check logs for user creation
4. **Onboarding works** - Complete all steps
5. **Dashboard loads** - Verify [storeId] route
6. **Subscription page works** - View plans
7. **CRUD operations work** - Create product, category, etc.

---

## 8. Monitoring Setup

### 8.1 Vercel Analytics
- Enable in Vercel dashboard
- Monitor Core Web Vitals

### 8.2 Error Tracking (Optional)
If using Sentry:
1. Create Sentry project
2. Add `SENTRY_DSN` to environment
3. Install Sentry Next.js SDK

### 8.3 Log Monitoring
- Use Vercel Logs for real-time monitoring
- Set up log alerts for errors

---

## 9. Testing Checklist

### 9.1 User Flow
- [ ] Sign up as new user
- [ ] Complete onboarding
- [ ] Access dashboard
- [ ] Create store items (product, category, etc.)
- [ ] View subscription page

### 9.2 Subscription Flow
- [ ] Start trial
- [ ] Upgrade from trial to paid
- [ ] Successful payment
- [ ] Cancel subscription
- [ ] Subscription expires at period end

### 9.3 Webhook Flow
- [ ] Clerk user.created → User in DB
- [ ] Razorpay subscription.authenticated → Status ACTIVE
- [ ] Razorpay subscription.charged → Usage reset
- [ ] Razorpay subscription.cancelled → Status CANCELED

### 9.4 Cron Jobs (Manual Test)
```bash
# Test each cron
curl -X GET "https://your-domain.com/api/cron/expire-trials-detect-payment-failure" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 10. Post-Launch Monitoring

### 10.1 Daily Checks (First Week)
- [ ] Check webhook success rate
- [ ] Review cron job logs
- [ ] Monitor error rates
- [ ] Check database connections

### 10.2 Weekly Checks
- [ ] Review subscription metrics
- [ ] Check for failed payments
- [ ] Review grace period enforcements
- [ ] Verify archived products cleanup

---

## 11. Rollback Plan

### If Issues Occur:

1. **Revert Deployment**
   ```bash
   vercel rollback
   ```

2. **Database Rollback**
   ```bash
   # Revert last migration
   npx prisma migrate reset
   npx prisma migrate deploy
   ```

3. **Disable Webhooks**
   - Temporarily disable in Clerk/Razorpay dashboards
   - Fix issues
   - Re-enable

---

## 12. Documentation Links

- [Clerk Webhooks](https://clerk.com/docs/integrations/webhooks/overview)
- [Razorpay Subscriptions](https://razorpay.com/docs/subscriptions/)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
