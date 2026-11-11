# 🕐 Cron Jobs - Complete Guide for Beginners

## What is a Cron Job?

A **cron job** is a scheduled task that runs automatically at specified times or intervals without any human intervention.

**Real-world analogy:**
- Like setting an alarm clock that goes off every day at 6 AM
- Or a reminder that pops up every Monday to take out the trash
- But for servers/applications instead of humans

---

## Why Do We Need Cron Jobs?

### Without Cron Jobs (Manual Work):
```
❌ You have to manually check every day if trials expired
❌ You have to manually send reminder emails
❌ You have to manually delete old data
❌ You have to stay awake at midnight to run tasks
```

### With Cron Jobs (Automated):
```
✅ Server automatically expires trials at midnight
✅ Server automatically sends emails at scheduled times
✅ Server automatically cleans up old data weekly
✅ You sleep peacefully, cron does the work
```

---

## Common Use Cases

### 1. **Subscription Management** (Your App)
```
Task: Expire trials that ended
When: Every day at 00:00 (midnight)
Why: So users can't access dashboard after trial ends
```

### 2. **Email Reminders**
```
Task: Send "Your trial ends in 3 days" emails
When: Every day at 10:00 AM
Why: Give users advance warning to subscribe
```

### 3. **Database Cleanup**
```
Task: Delete old logs older than 30 days
When: Every Sunday at 02:00 AM
Why: Save storage space
```

### 4. **Backup**
```
Task: Backup database to cloud storage
When: Every day at 03:00 AM
Why: Prevent data loss
```

### 5. **Report Generation**
```
Task: Generate monthly revenue report
When: 1st day of every month at 09:00 AM
Why: Automated analytics
```

---

## Cron Schedule Syntax

Cron uses a special format to define "when" to run:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Common Examples:

| Schedule | Meaning | When it runs |
|----------|---------|--------------|
| `* * * * *` | Every minute | Every single minute |
| `0 * * * *` | Every hour | At :00 of every hour (1:00, 2:00, 3:00...) |
| `0 0 * * *` | Every day | Every day at midnight (00:00) |
| `0 9 * * *` | Every day at 9 AM | Every morning at 9:00 AM |
| `0 0 * * 0` | Every Sunday | Every Sunday at midnight |
| `0 0 1 * *` | Every month | 1st day of every month at midnight |
| `0 0 1 1 *` | Every year | January 1st at midnight |
| `*/5 * * * *` | Every 5 minutes | 12:00, 12:05, 12:10, 12:15... |
| `0 */6 * * *` | Every 6 hours | 00:00, 06:00, 12:00, 18:00 |
| `0 9-17 * * 1-5` | Business hours | 9 AM to 5 PM, Monday-Friday |

### Your App's Cron:
```json
"schedule": "0 0 * * *"
```
**Meaning:** Run at **00:00 (midnight)** every day

---

## How Cron Works (Your App)

### 1. **Traditional Linux Cron** (Old Way)
```bash
# Edit cron table
crontab -e

# Add job
0 0 * * * /usr/bin/node /path/to/your/script.js
```
**Problems:**
- Requires a server running 24/7
- Need to manage server yourself
- Complex to set up

---

### 2. **Vercel Cron** (Modern Way - What You're Using)

**Step 1:** Create API endpoint
```typescript
// src/app/api/cron/expire-trials/route.ts
export async function GET(req) {
  // Your cron logic here
  // Expire trials, send emails, etc.
}
```

**Step 2:** Configure schedule
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/expire-trials",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Step 3:** Deploy
```bash
vercel --prod
```

**That's it!** Vercel automatically:
- ✅ Calls your API endpoint at midnight
- ✅ Handles failures and retries
- ✅ Logs execution times
- ✅ No server management needed

---

## Vercel Cron vs Alternatives

### **Option 1: Vercel Cron** ⭐ (Recommended for you)

**Pros:**
- ✅ Free (included with Vercel)
- ✅ Zero configuration (just add vercel.json)
- ✅ Automatic retries on failure
- ✅ Built-in logging
- ✅ No separate infrastructure

**Cons:**
- ❌ Only works on Vercel
- ❌ Minimum interval: 1 hour on free plan
- ❌ Maximum: 100 cron jobs per project

**Best for:** 
- Apps deployed on Vercel
- Simple scheduled tasks (daily/hourly)
- Startups/indie projects

---

### **Option 2: Node-cron** (Manual)

**Pros:**
- ✅ Runs anywhere (not tied to Vercel)
- ✅ Can run every second if needed
- ✅ Full control over execution

**Cons:**
- ❌ Requires server to be running 24/7
- ❌ No automatic retries
- ❌ More complex setup

**Example:**
```typescript
import cron from 'node-cron';

// Runs every day at midnight
cron.schedule('0 0 * * *', () => {
  console.log('Running trial expiry check...');
  // Your logic here
});
```

**Best for:**
- Self-hosted apps
- Need more frequent than hourly execution
- Want full control

---

### **Option 3: External Services**

**Services:**
- **EasyCron** - Dedicated cron service
- **Cron-job.org** - Free cron scheduler
- **AWS EventBridge** - Enterprise solution

**Pros:**
- ✅ Very reliable
- ✅ Advanced features (webhooks, alerts)
- ✅ Can ping any URL

**Cons:**
- ❌ Extra cost
- ❌ Another service to manage
- ❌ Overkill for simple needs

**Best for:**
- Critical tasks (payments, backups)
- Multiple apps/servers
- Enterprise applications

---

## Security Best Practices

### 1. **Protect Your Cron Endpoint**

**Bad (Insecure):**
```typescript
export async function GET(req) {
  // Anyone can call this!
  await expireTrials();
}
```
**Problem:** Anyone can visit `/api/cron/expire-trials` and trigger it repeatedly.

**Good (Secure):**
```typescript
export async function GET(req) {
  // Verify it's really Vercel calling
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  await expireTrials();
}
```
**Why:** Only requests with correct secret can execute the cron.

---

### 2. **Use Environment Variables**

```env
# .env (local)
CRON_SECRET=your-super-secret-key-12345

# Vercel Dashboard (production)
CRON_SECRET=different-secret-key-67890
```

**Generate secure secrets:**
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Output: K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=
```

---

### 3. **Idempotency** (Important!)

**Problem:** What if cron runs twice by mistake?

**Bad (Not Idempotent):**
```typescript
// If run twice, sends 2 emails!
await sendEmail('Your trial expired');
```

**Good (Idempotent):**
```typescript
// Check if already processed
const user = await db.user.findUnique({ where: { id } });
if (user.trialExpiredEmailSent) {
  return; // Already sent, skip
}

await sendEmail('Your trial expired');
await db.user.update({
  where: { id },
  data: { trialExpiredEmailSent: true }
});
```
**Result:** Even if cron runs 10 times, email sent only once.

---

## Monitoring & Debugging

### 1. **Logging**

Always log what your cron does:
```typescript
export async function GET(req) {
  console.log('🔄 [CRON] Starting trial expiry check...');
  
  const expired = await findExpiredTrials();
  console.log(`📊 [CRON] Found ${expired.length} expired trials`);
  
  for (const trial of expired) {
    console.log(`✅ [CRON] Expired trial for user: ${trial.userId}`);
  }
  
  console.log('✅ [CRON] Job completed successfully');
}
```

---

### 2. **Check Vercel Logs**

```bash
# View recent logs
vercel logs your-project-name

# View logs in dashboard
https://vercel.com/your-username/your-project/logs
```

**Look for:**
- ✅ When cron executed
- ✅ How long it took
- ✅ Any errors
- ✅ What data was processed

---

### 3. **Test Manually**

Don't wait for midnight to test!

```bash
# Test locally
curl -X GET http://localhost:3000/api/cron/expire-trials \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test production
curl -X GET https://your-app.vercel.app/api/cron/expire-trials \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

### 4. **Error Handling**

```typescript
export async function GET(req) {
  try {
    await expireTrials();
    
    return NextResponse.json({
      success: true,
      message: 'Trials expired successfully'
    });
    
  } catch (error) {
    console.error('❌ [CRON] Job failed:', error);
    
    // Send alert (email/Slack/Discord)
    await sendAlert('Cron job failed!', error);
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

---

## Industry Standards

### **Frequency Guidelines:**

| Task Type | Recommended Frequency | Example |
|-----------|---------------------|---------|
| Trial expiry | Daily (midnight) | `0 0 * * *` |
| Email reminders | Daily (morning) | `0 9 * * *` |
| Payment retries | Every 6 hours | `0 */6 * * *` |
| Database cleanup | Weekly (Sunday) | `0 2 * * 0` |
| Backups | Daily (3 AM) | `0 3 * * *` |
| Analytics | Hourly | `0 * * * *` |
| Health checks | Every 5 minutes | `*/5 * * * *` |

---

### **Timing Best Practices:**

1. **Avoid peak hours** - Don't run at 12:00 PM when users are active
2. **Use off-peak times** - 2-4 AM is ideal (low traffic)
3. **Stagger jobs** - Don't run everything at midnight
   ```
   Trial expiry: 00:00
   Email sending: 00:30
   Cleanup: 01:00
   Backups: 02:00
   ```
4. **Consider timezones** - Use UTC or user's timezone

---

## Your App's Cron Jobs (Planned)

### **Current (Implemented):**

**1. Expire Trials**
```json
{
  "path": "/api/cron/expire-trials",
  "schedule": "0 0 * * *"
}
```
- **Runs:** Every day at midnight
- **Does:** Expires trials where `currentPeriodEnd < now()`
- **Status:** ✅ Ready to deploy

---

### **Future (To Be Built):**

**2. Trial Reminder (3 days before)**
```json
{
  "path": "/api/cron/trial-reminders",
  "schedule": "0 9 * * *"
}
```
- **Runs:** Every day at 9 AM
- **Does:** Send "Your trial ends in 3 days" emails
- **Status:** 📋 Planned

**3. Payment Retry**
```json
{
  "path": "/api/cron/retry-payments",
  "schedule": "0 */6 * * *"
}
```
- **Runs:** Every 6 hours
- **Does:** Retry failed payments for PAST_DUE subscriptions
- **Status:** 📋 Planned

**4. Cleanup Old Data**
```json
{
  "path": "/api/cron/cleanup",
  "schedule": "0 2 * * 0"
}
```
- **Runs:** Every Sunday at 2 AM
- **Does:** Delete logs/data older than 90 days
- **Status:** 📋 Planned

---

## Quick Reference

### **Test Your Cron Locally:**
```bash
# 1. Start dev server
npm run dev

# 2. Call cron endpoint manually
curl -X GET http://localhost:3000/api/cron/expire-trials \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 3. Check console logs
```

### **Deploy Cron to Vercel:**
```bash
# 1. Add vercel.json with cron config
# 2. Commit changes
git add vercel.json src/app/api/cron/
git commit -m "Add trial expiry cron job"

# 3. Deploy
git push origin main
vercel --prod

# 4. Add CRON_SECRET to Vercel dashboard
```

### **Verify Cron is Running:**
1. Go to Vercel Dashboard
2. Project → Settings → Crons
3. You'll see your scheduled jobs
4. Check "Last Run" timestamp

---

## Common Mistakes to Avoid

### ❌ **Mistake 1: No security check**
```typescript
// Anyone can trigger this!
export async function GET() {
  await expireTrials();
}
```

### ❌ **Mistake 2: Wrong timezone**
```
Schedule: 0 0 * * * (midnight UTC)
Your timezone: IST (UTC+5:30)
Actual run time: 5:30 AM IST (not midnight!)
```

### ❌ **Mistake 3: Long execution time**
```typescript
// Cron has 60s timeout on Vercel free plan
for (let i = 0; i < 10000; i++) {
  await processUser(i); // Takes 2 hours! ❌
}
```

### ❌ **Mistake 4: Not handling errors**
```typescript
// If one trial fails, entire job fails!
for (const trial of trials) {
  await expireTrial(trial); // No try-catch ❌
}
```

---

## Summary

**What is Cron?**
- Automated task scheduler that runs at specific times

**Why use it?**
- Automate repetitive tasks (expire trials, send emails, cleanup)

**How to implement?**
1. Create API endpoint (`/api/cron/your-task/route.ts`)
2. Add schedule to `vercel.json`
3. Deploy to Vercel
4. Vercel calls your endpoint automatically

**Security:**
- Use CRON_SECRET to verify requests
- Make endpoints idempotent
- Handle errors gracefully

**Your next steps:**
1. Test the expire-trials cron locally
2. Add CRON_SECRET to .env and Vercel
3. Deploy and monitor logs

---

**That's it!** You now understand cron jobs well enough to use them in your app. 🎉
