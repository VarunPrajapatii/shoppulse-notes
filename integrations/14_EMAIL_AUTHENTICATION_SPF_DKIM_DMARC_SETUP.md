# Email Authentication Setup — varuntd.com with Resend + Namecheap

> **What this guide does:** Step-by-step instructions to set up SPF, DKIM, and DMARC
> so your emails from ShopPulse actually reach inboxes instead of spam.
>
> **Your setup:** Domain `varuntd.com` on Namecheap + Resend as email provider

---

## Table of Contents

1. [What Are SPF, DKIM, DMARC (And Why You Need All 3)](#1-what-are-spf-dkim-dmarc)
2. [Before You Start — Checklist](#2-before-you-start)
3. [Step 1: Add Domain to Resend](#3-step-1-add-domain-to-resend)
4. [Step 2: Add MX Record (SPF Part 1) in Namecheap](#4-step-2-add-mx-record)
5. [Step 3: Add TXT SPF Record in Namecheap](#5-step-3-add-txt-spf-record)
6. [Step 4: Add TXT DKIM Record in Namecheap](#6-step-4-add-txt-dkim-record)
7. [Step 5: Verify Domain in Resend](#7-step-5-verify-domain)
8. [Step 6: Add DMARC Record in Namecheap](#8-step-6-add-dmarc-record)
9. [Step 7: Test Your Setup](#9-step-7-test-your-setup)
10. [Step 8: Upgrade DMARC Policy](#10-step-8-upgrade-dmarc-policy)
11. [What Each Record Actually Does (Deep Dive)](#11-what-each-record-does)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. What Are SPF, DKIM, DMARC

Think of email authentication like a **3-layer security check at a building entrance:**

```
SPF  = "Is this delivery person authorized to deliver on behalf of this company?"
         → Lists which servers are ALLOWED to send email from your domain

DKIM = "Is this package sealed and untampered?"
         → Cryptographic signature proving the email wasn't altered in transit

DMARC = "What should security do if someone fails the check?"
          → Policy telling email providers what to do with failed emails
```

### Why You Need All 3

| Without | What Happens |
|---------|-------------|
| No SPF | Anyone can send email pretending to be from varuntd.com |
| No DKIM | Email providers can't verify your emails are genuine |
| No DMARC | Gmail/Yahoo don't know whether to trust or reject suspicious emails from you |
| **All 3 configured** | **Gmail shows your email in Primary inbox, not Spam** ✅ |

### What Resend Sets Up For You

When you add a domain to Resend, it gives you **3 DNS records** to add:
1. **MX Record** (for SPF — tells where to send bounce notifications)
2. **TXT Record for SPF** (authorizes Amazon SES/Resend IPs to send as you)
3. **TXT Record for DKIM** (public key for verifying your email signatures)

You then add **DMARC yourself** (1 more TXT record) — Resend doesn't auto-generate this one.

---

## 2. Before You Start

### You'll Need:

- [ ] **Resend account** — Sign up free at [resend.com](https://resend.com) (100 emails/day free tier)
- [ ] **Namecheap account** — You already own varuntd.com here
- [ ] **Resend API key** — You'll get this after domain verification
- [ ] **15-20 minutes** — DNS propagation can take time but is usually fast

### Should You Use a Subdomain?

**Resend strongly recommends using a subdomain** like `mail.varuntd.com` or `updates.varuntd.com` instead of the root `varuntd.com`.

**Why subdomain is better:**

| | Root domain (`varuntd.com`) | Subdomain (`mail.varuntd.com`) |
|---|---|---|
| If emails get marked spam | Your ENTIRE domain reputation tanks | Only the subdomain is affected |
| Personal email receiving | MX records might conflict | No conflict with personal email |
| Separation of concerns | Website + emails mixed | Clean separation |

**Recommendation for ShopPulse:** Use `mail.varuntd.com` or `notify.varuntd.com`

We'll use `mail.varuntd.com` in this guide. Replace with your preference.

---

## 3. Step 1: Add Domain to Resend

1. Go to [resend.com/domains](https://resend.com/domains)
2. Click **"Add Domain"** button (top right)
3. In the dialog:
   - **Domain:** Enter `mail.varuntd.com` (or `varuntd.com` if using root)
   - **Region:** Select the closest — likely **"US East (N. Virginia)"** (default, `us-east-1`)
4. Click **"Add"**

**What you'll see:** Resend shows you a page with **3 DNS records** you need to add. Keep this page open — you'll copy values from it.

The records will look something like:

```
Record 1 — MX (for SPF bounce handling):
  Type:  MX
  Name:  send.mail.varuntd.com
  Value: feedback-smtp.us-east-1.amazonses.com
  Priority: 10

Record 2 — TXT (SPF authorization):
  Type:  TXT
  Name:  send.mail.varuntd.com
  Value: "v=spf1 include:amazonses.com ~all"

Record 3 — TXT (DKIM public key):
  Type:  TXT
  Name:  resend._domainkey.mail.varuntd.com
  Value: p=MIGfMA0GCSq... (a long key string)
```

> ⚠️ **Your actual values will be different** — always copy from Resend's dashboard, not from this guide.

---

## 4. Step 2: Add MX Record in Namecheap

1. Log in to [Namecheap](https://ap.www.namecheap.com/)
2. Click **"Manage"** next to `varuntd.com`
3. Go to the **"Advanced DNS"** tab

### Adding the MX Record

4. Scroll down to **"Mail Settings"** section
5. Click the dropdown → select **"Custom MX"**

> ⚠️ **IMPORTANT:** If you're currently using Gmail/email with this domain, changing MX records can break incoming email. Since you're using a subdomain (`mail.varuntd.com`), this should NOT affect your root domain email.

6. Click **"Add New Record"** in the Mail Settings section:

| Field in Namecheap | What to Enter | Value from Resend |
|---|---|---|
| **Type** | MX Record | — |
| **Host** | `send.mail` | (Resend shows `send.mail.varuntd.com` — Namecheap auto-appends your domain, so enter only `send.mail`) |
| **Value** | `feedback-smtp.us-east-1.amazonses.com` | (Copy from Resend) |
| **Priority** | `10` | (The unmarked column after Value) |
| **TTL** | Automatic | — |

7. Click **"Save All Changes"** ✅

### ⚠️ Namecheap-Specific Gotcha — Host Field

**Resend shows:** `send.mail.varuntd.com`
**You enter in Namecheap:** `send.mail`

Namecheap automatically appends `.varuntd.com` to whatever you type. So:
- If you type `send.mail.varuntd.com` → it becomes `send.mail.varuntd.com.varuntd.com` ❌
- If you type `send.mail` → it becomes `send.mail.varuntd.com` ✅

**This is the #1 mistake people make. Remember: strip your domain name.**

---

## 5. Step 3: Add TXT SPF Record in Namecheap

Still on the **Advanced DNS** page, scroll to **"Host Records"** section.

1. Click **"Add New Record"**

| Field | What to Enter |
|---|---|
| **Type** | TXT Record |
| **Host** | `send.mail` |
| **Value** | `v=spf1 include:amazonses.com ~all` |
| **TTL** | Automatic |

2. Click **"Save All Changes"** ✅

### What This SPF Record Means:

```
v=spf1                      → "This is an SPF record, version 1"
include:amazonses.com       → "Amazon SES servers are authorized to send as me"
                               (Resend uses Amazon SES under the hood)
~all                        → "Soft-fail everything else"
                               (emails from other servers get marked suspicious, not rejected)
```

---

## 6. Step 4: Add TXT DKIM Record in Namecheap

Still in **"Host Records"**, click **"Add New Record"** again.

1. Add the DKIM record:

| Field | What to Enter |
|---|---|
| **Type** | TXT Record |
| **Host** | `resend._domainkey.mail` |
| **Value** | (Copy the long `p=MIGfMA0GCSq...` key from Resend — this is unique to your domain) |
| **TTL** | Automatic |

2. Click **"Save All Changes"** ✅

### About the Host Field:

- **Resend shows:** `resend._domainkey.mail.varuntd.com`
- **You enter:** `resend._domainkey.mail` (strip `.varuntd.com`)

### What DKIM Does:

When Resend sends an email on your behalf:
1. Resend signs the email body with a **private key** (which only Resend has)
2. The recipient's email server fetches the **public key** from this DNS record
3. It verifies the signature → proves the email is genuine and unaltered

It's like sealing an envelope with a wax stamp — if the seal is broken, the recipient knows something's wrong.

---

## 7. Step 5: Verify Domain in Resend

1. Go back to [resend.com/domains](https://resend.com/domains)
2. Click on `mail.varuntd.com`
3. Click **"Verify DNS Records"**

### What Happens Next:

- Resend checks if the 3 DNS records you added are correctly configured
- Status will show as **"Pending"** first
- Usually verifies within **5-30 minutes** (can take up to 72 hours in worst case)
- You'll see status change to **"Verified"** ✅

### While Waiting — Get Your API Key:

1. Go to [resend.com/api-keys](https://resend.com/api-keys)
2. Click **"Create API Key"**
3. **Name:** `ShopPulse` (or anything descriptive)
4. **Permission:** "Sending access" (not "Full access" — principle of least privilege)
5. **Domain:** Select `mail.varuntd.com`
6. Click **"Add"**
7. **COPY THE KEY IMMEDIATELY** — it's shown only once
   - Format: `re_xxxxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxx`
8. Store this key — you'll enter it in ShopPulse's Integrations page later

---

## 8. Step 6: Add DMARC Record in Namecheap

DMARC is optional but **strongly recommended**. It's one more TXT record.

1. Go back to Namecheap → **Advanced DNS** → **Host Records**
2. Click **"Add New Record"**

### Phase 1 — Monitoring Mode (Start Here):

| Field | What to Enter |
|---|---|
| **Type** | TXT Record |
| **Host** | `_dmarc.mail` |
| **Value** | `v=DMARC1; p=none; rua=mailto:dmarc@varuntd.com;` |
| **TTL** | Automatic |

3. Click **"Save All Changes"** ✅

> If using root domain instead of subdomain, **Host** would be `_dmarc`

### What This DMARC Record Means:

```
v=DMARC1                           → "This is a DMARC record, version 1"
p=none                             → "Don't do anything with failed emails yet — just monitor"
rua=mailto:dmarc@varuntd.com       → "Send aggregate reports to this email address"
```

**Why `p=none` first?** You want to monitor for a few days to make sure all your legitimate emails are passing SPF and DKIM. If you jump straight to `p=reject`, you might accidentally block your own emails.

---

## 9. Step 7: Test Your Setup

### Test 1: Verify DNS Records Are Propagated

Open terminal or Command Prompt and run:

```bash
# Check SPF
nslookup -type=TXT send.mail.varuntd.com

# Check DKIM
nslookup -type=TXT resend._domainkey.mail.varuntd.com

# Check MX
nslookup -type=MX send.mail.varuntd.com

# Check DMARC
nslookup -type=TXT _dmarc.mail.varuntd.com
```

Each should return the values you entered. If they return nothing, DNS hasn't propagated yet — wait a few minutes.

### Test 2: Send a Test Email From Resend Dashboard

1. Go to [resend.com/emails](https://resend.com/emails)
2. Click **"Send Email"**
3. **From:** `onboarding@mail.varuntd.com` (or any address@mail.varuntd.com)
4. **To:** Your personal Gmail
5. **Subject:** "Test email from ShopPulse"
6. **Body:** "If you see this, email authentication is working!"
7. Click **"Send"**

### Test 3: Check Email Headers in Gmail

1. Open the test email in Gmail
2. Click the **three dots (⋮)** → **"Show original"**
3. Look for these lines:

```
SPF:   PASS ✅
DKIM:  PASS ✅
DMARC: PASS ✅
```

If all 3 show PASS — you're fully authenticated! 🎉

### Test 4: Use an Online Checker

Go to [mail-tester.com](https://www.mail-tester.com/):
1. It gives you a temporary email address
2. Send a test email from Resend to that address
3. Click "Then check your score"
4. Aim for **9/10 or 10/10**

---

## 10. Step 8: Upgrade DMARC Policy

After 1-2 weeks of monitoring (checking that no legitimate emails are failing):

### Phase 2 — Quarantine Mode:

Update the DMARC record in Namecheap:

| Field | What to Change |
|---|---|
| **Value** | `v=DMARC1; p=quarantine; rua=mailto:dmarc@varuntd.com;` |

This tells email providers: "If an email from my domain fails SPF AND DKIM, send it to spam."

### Phase 3 — Reject Mode (Most Secure):

After another 1-2 weeks:

| Field | What to Change |
|---|---|
| **Value** | `v=DMARC1; p=reject; rua=mailto:dmarc@varuntd.com;` |

This tells email providers: "If an email from my domain fails both checks, REJECT it entirely."

### Progression Timeline:

```
Week 1-2:   p=none        → Monitor, ensure nothing breaks
Week 3-4:   p=quarantine  → Suspicious emails go to spam
Week 5+:    p=reject      → Unauthorized emails are rejected entirely
```

---

## 11. What Each Record Does — Deep Dive

### Complete DNS Records Summary for varuntd.com

After all steps, your Namecheap Advanced DNS will have these records:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ HOST RECORDS                                                                        │
├──────────────────────────┬──────┬────────────────────────────────────────────────────┤
│ Host                     │ Type │ Value                                              │
├──────────────────────────┼──────┼────────────────────────────────────────────────────┤
│ send.mail                │ TXT  │ v=spf1 include:amazonses.com ~all                 │
│ resend._domainkey.mail   │ TXT  │ p=MIGfMA0GCSq...  (your DKIM key)                │
│ _dmarc.mail              │ TXT  │ v=DMARC1; p=none; rua=mailto:dmarc@varuntd.com;  │
├──────────────────────────┼──────┼────────────────────────────────────────────────────┤
│ MAIL SETTINGS                                                                       │
├──────────────────────────┼──────┼────────────────────────────────────────────────────┤
│ send.mail                │ MX   │ feedback-smtp.us-east-1.amazonses.com (Priority 10)│
└──────────────────────────┴──────┴────────────────────────────────────────────────────┘

Total: 4 DNS records (3 from Resend + 1 DMARC you add yourself)
```

### How They Work Together During Email Delivery:

```
1. Resend sends email from noreply@mail.varuntd.com to customer@gmail.com

2. Gmail receives the email and checks:

   CHECK 1 — SPF:
   "Who is allowed to send email for mail.varuntd.com?"
   → Looks up TXT record for send.mail.varuntd.com
   → Finds: "v=spf1 include:amazonses.com ~all"
   → "Is the sending server's IP in amazonses.com's list?" → YES → SPF PASS ✅

   CHECK 2 — DKIM:
   "Is this email signed and untampered?"
   → Looks up TXT record for resend._domainkey.mail.varuntd.com
   → Gets the public key
   → Verifies the email's cryptographic signature → Matches → DKIM PASS ✅

   CHECK 3 — DMARC:
   "What should I do if SPF or DKIM fails?"
   → Looks up TXT record for _dmarc.mail.varuntd.com
   → Finds: "v=DMARC1; p=quarantine;"
   → Both passed, so DMARC PASS ✅

3. Gmail verdict: TRUSTED → Deliver to Primary inbox 📬
```

---

## 12. Troubleshooting

### "Domain not verifying" in Resend

1. **Wait longer** — DNS can take up to 72 hours (usually 5-30 min)
2. **Check Host field** — Most common mistake: entering `send.mail.varuntd.com` instead of just `send.mail`
3. **Check for trailing dots** — Some Namecheap records auto-add a trailing dot
4. **Flush DNS cache:**
   ```bash
   # Windows
   ipconfig /flushdns

   # Then check again
   nslookup -type=TXT send.mail.varuntd.com
   ```

### Emails going to spam

1. Check SPF/DKIM/DMARC all show PASS in email headers
2. Make sure your From address matches your verified domain: `anything@mail.varuntd.com`
3. Don't use all-caps subjects or too many exclamation marks
4. Resend dashboard → disable "Click Tracking" (it can reduce deliverability for transactional emails)

### "From address does not match verified domain"

Your Resend `from_email` in ShopPulse integrations must end with `@mail.varuntd.com`.

Examples:
- ✅ `noreply@mail.varuntd.com`
- ✅ `orders@mail.varuntd.com`
- ✅ `hello@mail.varuntd.com`
- ❌ `noreply@varuntd.com` (if you verified `mail.varuntd.com`, not `varuntd.com`)
- ❌ `noreply@gmail.com` (you don't own gmail.com)

---

## What to Enter in ShopPulse After Verification

Once your domain is verified in Resend, go to ShopPulse → **Settings → Integrations → Email Service:**

| Field | Value |
|---|---|
| **Provider** | Resend |
| **API Key** | `re_xxxxxxxxxx_xxxxxx...` (from Step 5) |
| **From Email** | `noreply@mail.varuntd.com` (or `orders@mail.varuntd.com`) |
| **From Name** | `ShopPulse` (or your store name — this shows in the "From" field) |

After saving, use the **"Test"** button to send a test email to yourself. If it arrives — you're done! 🎉

---

> **Total time:** ~20 minutes of work + wait for DNS propagation
>
> **Total cost:** ₹0 (Resend free tier = 100 emails/day, Namecheap DNS is free with your domain)
>
> **What you get:** Professional email authentication that Gmail, Yahoo, and Outlook trust completely.
