# 🚀 Vercel Deployment Guide - ShopPulseAdmin

## ✅ Pre-Deployment Status

### What's Ready:
- ✅ Database migrated to Neon PostgreSQL (production)
- ✅ All code pushed to GitHub
- ✅ package.json updated with `postinstall` script
- ✅ Webhook handler complete
- ✅ Onboarding flow implemented

---

## 📋 Deployment Steps

### Step 1: Deploy to Vercel (5 min)

1. Go to: https://vercel.com/new
2. Import your GitHub repository: `VarunPrajapatii/cms-ecommerce-dashboard`
3. Configure project:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (default)
   - **Build Command:** `next build` (default)
   - **Output Directory:** `.next` (default)

4. **Add Environment Variables** (CRITICAL):

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_aHVtYW5lLWJ1Zy02MC5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_DZvaivvm0aCohjhlnpFBFvECwlo5989JssHGrUNa08
CLERK_WEBHOOK_SECRET=whsec_TVFF3HFIUMr9U4RISWHH2brtvY3AUEyh

# Clerk Paths (optional - defaults work)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# Database
DATABASE_URL=postgresql://neondb_owner:npg_YWhxsM3HUca2@ep-proud-thunder-a188q49q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dls3aa1bw

# Frontend Store URL (update after deployment)
FRONTEND_URL=https://your-frontend-store.vercel.app

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_RRv4a8ZJgKjtZJ
RAZORPAY_KEY_SECRET=7UkZLk45Fol8RI1cC3jQaMfU
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Encryption
ENCRYPTION_KEY=76dd461ceb90c86a306be6119947db4b58f32806571e9221efee6bb526ae2c3e
```

5. Click **Deploy**

---

### Step 2: Update Clerk Webhook URL (CRITICAL - 2 min)

**After deployment, you'll get a URL like:** `https://shop-pulse-admin-xyz.vercel.app`

1. Go to: https://dashboard.clerk.com
2. Navigate to: **Webhooks** in sidebar
3. Find your existing webhook endpoint
4. Click **Edit**
5. Update URL to:
   ```
   https://shop-pulse-admin-xyz.vercel.app/api/webhook/clerk
   ```
6. Ensure these events are selected:
   - ✅ user.created
   - ✅ user.updated
   - ✅ user.deleted
   - ✅ session.created
7. Click **Save**

**⚠️ If you don't do this, webhook won't work and users won't be created in database!**

---

### Step 3: Seed Production Database (5 min)

**Option A: Run from your local machine (targeting production DB)**

```bash
# Your DATABASE_URL already points to production, so just run:
npx prisma db seed
```

**Option B: Add to build script (one-time)**

Already done! The `postinstall` script will generate Prisma Client. But seed needs to run once manually.

**Verify seed worked:**
1. Open Neon dashboard: https://console.neon.tech
2. Navigate to your project
3. Open SQL Editor
4. Run:
   ```sql
   SELECT * FROM "SubscriptionPlan";
   ```
5. Should see 4 plans: TRIAL, Monthly, HalfYearly, Yearly

---

### Step 4: Test the Complete Flow (10 min)

1. **Open your Vercel URL:** `https://shop-pulse-admin-xyz.vercel.app`

2. **Sign up a new user:**
   - Click "Sign Up"
   - Enter email + password
   - Submit

3. **Check Vercel logs (real-time):**
   ```bash
   vercel logs --follow
   ```
   
   **OR** via Dashboard:
   - Go to: https://vercel.com/your-project
   - Click **Functions** tab
   - Find `/api/webhook/clerk`
   - Click **View Logs**

4. **You should see:**
   ```
   ✅ Webhook signature verified successfully
   📩 Webhook received: user.created
   👤 Processing user.created: user_2abc123
   ✅ User created successfully
   ```

5. **Complete onboarding:**
   - Enter store name: "Test Store"
   - Go through 7 guide pages
   - Check acknowledgement
   - Click "Complete Setup"

6. **Check logs again:**
   - Find `/api/onboarding/complete` function
   - Should see:
   ```
   ✅ [ONBOARDING] User authenticated
   ✅ [ONBOARDING] Store name validated: Test Store
   📦 [ONBOARDING] Creating store
   💳 [ONBOARDING] Creating subscription
   📊 [ONBOARDING] Creating initial usage records
   ✅ [ONBOARDING] Transaction completed successfully
   ```

7. **Verify in database:**
   - Neon SQL Editor:
   ```sql
   SELECT * FROM "User" ORDER BY "createdAt" DESC LIMIT 1;
   SELECT * FROM "Store" ORDER BY "createdAt" DESC LIMIT 1;
   SELECT * FROM "Subscription" ORDER BY "createdAt" DESC LIMIT 1;
   SELECT * FROM "UsageRecord" ORDER BY "createdAt" DESC LIMIT 6;
   ```

---

## 🔍 Where Console Logs Appear

### For `/api/webhook/clerk/route.ts`:

**Location:** Vercel Function Logs

**Access methods:**

1. **Vercel Dashboard:**
   - Project → Deployments → Latest
   - Functions tab → `/api/webhook/clerk`
   - View Logs button

2. **Vercel CLI (Real-time):**
   ```bash
   vercel logs --follow
   ```

3. **Vercel CLI (Specific function):**
   ```bash
   vercel logs --follow --filter=/api/webhook/clerk
   ```

**Example output:**
```
2025-10-31 10:30:45 [GET] /api/webhook/clerk 200 (125ms)
✅ Webhook signature verified successfully
📩 Webhook received: user.created
👤 Processing user.created: user_2abc123def
✅ User created successfully: user_2abc123def
   - Email: test@example.com
   - Name: John Doe
```

---

### For `/api/onboarding/complete/route.ts`:

**Location:** Same - Vercel Function Logs

**Access:** Same methods as above, filter for `/api/onboarding/complete`

**Example output:**
```
2025-10-31 10:31:20 [POST] /api/onboarding/complete 201 (1.2s)
✅ [ONBOARDING] User authenticated: user_2abc123def
✅ [ONBOARDING] Store name validated: My Awesome Store
✅ [ONBOARDING] User found in database
✅ [ONBOARDING] Trial available for user
✅ [ONBOARDING] TRIAL plan found: plan_xyz789
   - Name: Free Trial
   - Duration: 7 days
🔄 [ONBOARDING] Starting database transaction...
📦 [ONBOARDING] Creating store: My Awesome Store
✅ [ONBOARDING] Store created: store_abc123
💳 [ONBOARDING] Creating subscription...
✅ [ONBOARDING] Subscription created: sub_xyz456
   - Status: ACTIVE
   - Plan: Free Trial
   - Expires: 2025-11-07T10:31:20.000Z
📝 [ONBOARDING] Creating subscription history...
✅ [ONBOARDING] Subscription history created
📊 [ONBOARDING] Creating initial usage records...
✅ [ONBOARDING] Created 6 usage records
   - PRODUCTS: 0
   - ORDERS: 0
   - STORAGE_GB: 0
   - CATEGORIES: 0
   - BILLBOARDS: 0
   - API_CALLS: 0
👤 [ONBOARDING] Updating user record...
✅ [ONBOARDING] User record updated
✅ [ONBOARDING] Transaction completed successfully
🎉 [ONBOARDING] Onboarding completed for user: user_2abc123def
   - Store ID: store_abc123
   - Store Name: My Awesome Store
   - Subscription ID: sub_xyz456
   - Trial Ends: 2025-11-07T10:31:20.000Z
```

---

## 📊 Log Monitoring Best Practices

### During Testing:

**Terminal 1: Watch all logs**
```bash
vercel logs --follow
```

**Terminal 2: Filter webhook logs**
```bash
vercel logs --follow --filter=/api/webhook
```

**Terminal 3: Filter onboarding logs**
```bash
vercel logs --follow --filter=/api/onboarding
```

### Production Monitoring:

**Vercel Dashboard:** Better for historical logs and debugging errors

**Vercel CLI:** Better for real-time monitoring during testing

---

## ⚠️ Common Issues & Solutions

### Issue 1: "User not found in database"
**Cause:** Webhook didn't fire or failed
**Solution:** 
1. Check Clerk webhook URL is correct
2. Check CLERK_WEBHOOK_SECRET matches in Vercel
3. Check webhook event logs in Clerk dashboard

### Issue 2: "TRIAL plan not found in database"
**Cause:** Database not seeded
**Solution:** Run `npx prisma db seed` targeting production DB

### Issue 3: "Prisma Client not generated"
**Cause:** Missing postinstall script
**Solution:** Already fixed! Added to package.json

### Issue 4: No logs appearing
**Cause:** Need to refresh or wait a few seconds
**Solution:** 
- Vercel logs have 5-10 second delay
- Use `--follow` flag for real-time
- Check function invocation count in dashboard

---

## 🎯 Post-Deployment Checklist

```
□ Vercel deployment successful
□ All environment variables added
□ Clerk webhook URL updated to production
□ Production database seeded (4 plans exist)
□ Test signup flow works
□ Test onboarding completion works
□ Webhook logs visible in Vercel
□ Onboarding logs visible in Vercel
□ User created in database
□ Store created in database
□ Subscription created (status: ACTIVE)
□ UsageRecords created (6 metrics)
```

---

## 🔗 Important URLs

- **Vercel Project:** https://vercel.com/your-project
- **Vercel Logs:** https://vercel.com/your-project/logs
- **Clerk Dashboard:** https://dashboard.clerk.com
- **Neon Dashboard:** https://console.neon.tech
- **Prisma Studio:** `npx prisma studio` (connect to production DB)

---

## 🚨 Critical Reminders

1. **NEVER commit `.env` to GitHub** (it's already in .gitignore)
2. **Update CLERK_WEBHOOK_SECRET** if you regenerate it in Clerk
3. **Seed production DB** before testing signup
4. **Monitor logs during first signup** to catch any issues early
5. **Keep DATABASE_URL secure** in Vercel environment variables

---

## ✅ You're Ready to Deploy!

**Current Status:**
- ✅ Code pushed to GitHub
- ✅ Database migrated
- ✅ package.json updated
- ✅ All endpoints implemented

**Next Steps:**
1. Deploy to Vercel (5 min)
2. Update Clerk webhook URL (2 min)
3. Seed production DB (2 min)
4. Test signup flow (5 min)
5. Monitor logs and verify (5 min)

**Total Time:** ~20 minutes

---

Good luck with the deployment! 🚀
