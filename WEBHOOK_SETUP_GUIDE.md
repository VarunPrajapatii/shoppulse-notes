# Razorpay Webhook Setup Guide

## Overview
This guide explains how to configure Razorpay webhooks for automatic subscription event synchronization.

## 🔐 Important Security Note
**NEVER commit your webhook secret to version control!** Always use environment variables.

---

## Step 1: Get Your Webhook URL

Your webhook URL will be:
```
https://yourdomain.com/api/webhook/razorpay/subscription
```

**Examples:**
- Production: `https://shoppulseadmin.vercel.app/api/webhook/razorpay/subscription`
- Staging: `https://staging.shoppulseadmin.com/api/webhook/razorpay/subscription`

⚠️ **Important:** Use HTTPS only! Razorpay does not support HTTP webhooks.

---

## Step 2: Configure Webhook in Razorpay Dashboard

### 2.1 Login to Razorpay Dashboard
1. Go to [https://dashboard.razorpay.com](https://dashboard.razorpay.com)
2. Login with your credentials
3. Switch to **Test Mode** for development

### 2.2 Navigate to Webhooks
1. Click on **Settings** in the sidebar
2. Select **Webhooks** under "API Keys"
3. Click **Create New Webhook**

### 2.3 Enter Webhook Details

**Webhook URL:**
```
https://yourdomain.com/api/webhook/razorpay/subscription
```

**Active Events:** Select these subscription events:
- ✅ `subscription.authenticated` - First payment successful
- ✅ `subscription.charged` - Recurring payment successful
- ✅ `subscription.pending` - Payment pending confirmation
- ✅ `subscription.halted` - Payment failed after retries
- ✅ `subscription.cancelled` - User cancelled subscription
- ✅ `subscription.completed` - All charges complete
- ✅ `subscription.paused` - Subscription paused (admin action)
- ✅ `subscription.resumed` - Subscription resumed

**Alert Email:** Your email for webhook failure notifications

### 2.4 Save and Get Secret
1. Click **Create Webhook**
2. Copy the **Webhook Secret** (starts with `whsec_`)
3. Store it securely - you'll need it for environment variables

---

## Step 3: Add Environment Variables

Add the webhook secret to your `.env` file:

```env
# Razorpay Webhook Configuration
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Vercel Deployment:**
```bash
vercel env add RAZORPAY_WEBHOOK_SECRET
# Select: Production, Preview, Development (or as needed)
# Paste your webhook secret
```

---

## Step 4: Test Webhook (Local Development)

### Using Ngrok (Recommended)

1. **Install Ngrok:**
```bash
npm install -g ngrok
```

2. **Start your Next.js app:**
```bash
npm run dev
```

3. **Expose local server:**
```bash
ngrok http 3000
```

4. **Copy HTTPS URL:**
Ngrok will provide a URL like:
```
https://abc123.ngrok-free.app
```

5. **Update Razorpay webhook URL:**
```
https://abc123.ngrok-free.app/api/webhook/razorpay/subscription
```

6. **Test with Razorpay Test Cards:**
Create a test subscription and Razorpay will send webhooks to your local machine.

### Manual Testing

You can also test webhooks manually using Razorpay's webhook testing tool in the dashboard.

---

## Step 5: Production Deployment Checklist

### Before Going Live:

- [ ] **Webhook URL set in Razorpay dashboard**
  - Switch to **Live Mode**
  - Update webhook URL to production domain
  - Verify HTTPS is enabled

- [ ] **Environment Variables Configured**
  - `RAZORPAY_WEBHOOK_SECRET` set in production
  - `RAZORPAY_KEY_ID` (live key)
  - `RAZORPAY_KEY_SECRET` (live secret)
  - All plan IDs using live mode plans

- [ ] **Webhook Events Enabled**
  - All 8 subscription events selected
  - Alert email configured

- [ ] **Test in Production**
  - Create test subscription with real card (₹1 test)
  - Verify webhook logs in Razorpay dashboard
  - Check database updates
  - Verify SubscriptionHistory records created
  - Test cancellation flow

---

## Step 6: Monitoring and Debugging

### Razorpay Dashboard Webhook Logs

1. Go to **Settings → Webhooks**
2. Click on your webhook
3. View **Recent Deliveries** tab
4. Check:
   - ✅ Success: 200 status code
   - ⚠️ Failure: 4xx/5xx status codes
   - 🔄 Retry: Razorpay automatically retries failed webhooks

### Application Logs

All webhook events are logged with emojis for easy identification:

```
✅ [RAZORPAY WEBHOOK] Signature verified
📨 [RAZORPAY WEBHOOK] Event received: subscription.charged
💰 [WEBHOOK] Handling subscription.charged
✅ [WEBHOOK] Subscription charged successfully
```

Search logs for:
- `[RAZORPAY WEBHOOK]` - All webhook activity
- `❌` - Errors
- `⚠️` - Warnings

---

## Common Event Flows

### Happy Path - Recurring Subscription
```
1. subscription.authenticated (First payment)
   └─> Status: ACTIVE
   └─> Payment record created
   └─> SubscriptionHistory: CREATED

2. subscription.charged (Month 2)
   └─> paidCount: 2
   └─> remainingCount: 4
   └─> Payment record created
   └─> SubscriptionHistory: RENEWED

3. subscription.charged (Month 3-6)
   └─> Same as above

4. subscription.completed (After 6 months)
   └─> Status: EXPIRED
   └─> remainingCount: 0
   └─> autoRenew: false
   └─> SubscriptionHistory: EXPIRED
```

### Cancellation Flow
```
User cancels:
1. subscription.cancelled
   └─> Status: CANCELED
   └─> canceledAt: timestamp
   └─> autoRenew: false
   └─> SubscriptionHistory: CANCELED
```

### Payment Failure Flow
```
1. subscription.pending
   └─> Status: ACTIVE (waiting)
   └─> SubscriptionHistory: RENEWED (pending)

2. subscription.halted (after retries)
   └─> Status: PAST_DUE
   └─> autoRenew: false
   └─> SubscriptionHistory: CANCELED
```

---

## Troubleshooting

### Webhook Not Receiving Events

**Check:**
1. Webhook URL is correct (HTTPS)
2. Webhook is **Active** in Razorpay dashboard
3. Events are selected (8 subscription events)
4. `RAZORPAY_WEBHOOK_SECRET` matches dashboard secret
5. Firewall/WAF not blocking Razorpay IPs

**Razorpay IP Whitelist (if needed):**
- No specific IPs - Razorpay uses dynamic IPs
- Use signature verification instead of IP whitelisting

### Signature Verification Failed

**Causes:**
1. Wrong `RAZORPAY_WEBHOOK_SECRET`
2. Body parsing modified raw body
3. Middleware interfering with request

**Solution:**
- Verify webhook secret matches dashboard
- Our implementation uses `await req.text()` (correct)
- Ensure no middleware modifies body

### Database Not Updating

**Check:**
1. Subscription exists in database with `razorpaySubscriptionId`
2. Prisma connection is working
3. Transaction not failing (check logs)
4. Schema matches (run `npx prisma generate`)

**Debug:**
```typescript
console.log('Subscription found:', subscription);
console.log('Event data:', subscriptionEntity);
```

### Duplicate Webhooks

Razorpay may send duplicate webhooks. Handle idempotency:
- Check if Payment already exists with `razorpayPaymentId`
- Use Prisma's `upsert` instead of `create` if needed

---

## Testing Scenarios

### Test Cases for Production

1. **First Payment:**
   - Create subscription
   - Verify `subscription.authenticated` webhook
   - Check: status=ACTIVE, paidCount=1, Payment created

2. **Recurring Payment:**
   - Wait for charge_at date (or use Razorpay API to trigger)
   - Verify `subscription.charged` webhook
   - Check: paidCount incremented, Payment created

3. **Cancellation:**
   - Cancel subscription via API
   - Verify `subscription.cancelled` webhook
   - Check: status=CANCELED, autoRenew=false

4. **Payment Failure:**
   - Use test card that fails
   - Verify `subscription.halted` webhook
   - Check: status=PAST_DUE

5. **Completion:**
   - Create subscription with totalCount=1
   - After first charge, verify `subscription.completed`
   - Check: status=EXPIRED, remainingCount=0

---

## Webhook Retry Logic

Razorpay automatically retries failed webhooks:
- **Retry Schedule:** 5 minutes, 10 minutes, 30 minutes, 1 hour, 6 hours, 24 hours
- **Total Retries:** 6 attempts over ~31 hours
- **Success Criteria:** HTTP 200 status code

**Best Practice:**
Always return 200 even if processing fails internally. Log errors and handle manually.

---

## Security Best Practices

1. **Always Verify Signature:**
   - Never trust webhook data without signature verification
   - Our implementation verifies before processing

2. **Use HTTPS Only:**
   - Razorpay requires HTTPS for webhooks
   - Vercel automatically provides HTTPS

3. **Keep Secret Safe:**
   - Never commit webhook secret to Git
   - Use environment variables only
   - Rotate secret if compromised

4. **Rate Limiting:**
   - Razorpay webhooks are throttled
   - No need for additional rate limiting

5. **Idempotency:**
   - Handle duplicate webhooks gracefully
   - Check if event already processed

---

## Support

### Razorpay Support
- Dashboard: [https://dashboard.razorpay.com](https://dashboard.razorpay.com)
- Docs: [https://razorpay.com/docs/webhooks](https://razorpay.com/docs/webhooks)
- Support: [https://razorpay.com/support](https://razorpay.com/support)

### Webhook Testing Tool
Razorpay provides a webhook testing tool in dashboard:
- Settings → Webhooks → Test Webhook
- Send sample events to your endpoint
- Verify response and logs

---

## Checklist Summary

**Development:**
- [x] Webhook handler created at `/api/webhook/razorpay/subscription`
- [ ] Ngrok setup for local testing
- [ ] Test with Razorpay test mode
- [ ] Verify all 8 events handled correctly

**Production:**
- [ ] Switch to Razorpay Live Mode
- [ ] Update webhook URL to production domain
- [ ] Add `RAZORPAY_WEBHOOK_SECRET` to production env
- [ ] Enable all 8 subscription events
- [ ] Add alert email for failures
- [ ] Test with real subscription
- [ ] Monitor webhook logs for 24 hours
- [ ] Set up error alerting (Sentry, LogRocket, etc.)

---

## Next Steps

After webhook setup:
1. [ ] Email notifications for subscription events
2. [ ] Invoice generation for each payment
3. [ ] Payment history page
4. [ ] Subscription management UI (pause/resume/upgrade)
5. [ ] Admin dashboard for subscription analytics
6. [ ] Automated refund handling
7. [ ] Subscription upgrade/downgrade flows

---

**Webhook Implementation Complete! 🎉**

Your subscription system now automatically syncs with Razorpay events. All recurring charges, cancellations, and completions will be handled seamlessly.
