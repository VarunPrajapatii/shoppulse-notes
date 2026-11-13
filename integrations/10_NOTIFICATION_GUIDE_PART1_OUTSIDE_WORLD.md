# Part 1: The Outside World — How SMS & Email Actually Work (Before Any Code)

> **Read this first.** Before looking at any code, you need to understand what happens
> _outside_ your app. Think of this as the "real world rules" that our code follows.

---

## Table of Contents

1. [The Big Picture — What Are We Even Doing?](#1-the-big-picture)
2. [SMS in India — The Complete Story](#2-sms-in-india)
3. [Email Sending — The Complete Story](#3-email-sending)
4. [Our Chosen Providers — Fast2SMS & Resend](#4-our-chosen-providers)
5. [Summary — What We Need Before Writing Code](#5-summary)
6. [How Shopify, WooCommerce & Dukaan Handle Notifications](#6-how-shopify-woocommerce--dukaan-handle-notifications)

---

## 1. The Big Picture

### What problem are we solving?

You run an electronics store (ShopPulse). When things happen in your store:

- Customer places an order → they should get **"Order Confirmed!"** SMS + Email
- You ship the order → customer gets **"Your order has shipped!"**
- Stock runs low → **you** (the admin) get an alert

**That's it.** We're building a system that sends the right message, to the right person, at the right time.

### The 3 Players

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   YOUR APP      │────▶│  THIRD-PARTY     │────▶│   CUSTOMER'S    │
│   (ShopPulse)   │     │  SERVICE         │     │   PHONE/INBOX   │
│                 │     │  (Fast2SMS,      │     │                 │
│  "Hey, send     │     │   Resend)        │     │  Receives the   │
│   this message" │     │                  │     │  message        │
│                 │     │  "OK, I'll       │     │                 │
│                 │     │   deliver it"    │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

**Your app NEVER directly sends an SMS or email.** It tells a third-party service to do it. Think of it like:
- You (app) → write a letter and hand it to the postman (Fast2SMS/Resend)
- Postman → delivers it to the recipient's mailbox/phone

### Why can't we send directly?

- **SMS**: You'd need telecom hardware, agreements with mobile carriers, and government licenses
- **Email**: You'd need SMTP servers, IP reputation management, spam filter compliance — it's a full-time job

So we pay services like Fast2SMS (SMS) and Resend (email) to handle the delivery.

---

## 2. SMS in India — The Complete Story

### 2.1 The Government Rules (TRAI & DLT)

India has **very strict** rules about SMS. You've probably been annoyed by spam SMS, right? The Indian government got annoyed too. So in 2018, **TRAI** (Telecom Regulatory Authority of India) said:

> "Enough spam. Every single business SMS must be registered, approved, and traceable."

They created a system called **DLT** (Distributed Ledger Technology) — basically a blockchain-like registry where every business SMS is tracked.

### 2.2 The 3 Types of SMS in India

| Type | Who sends → Who gets it | Example | Rules |
|------|-------------------------|---------|-------|
| **Transactional** | Reserved for **Banks only** (OTPs) | "745921 is the OTP for online transaction" | Can be sent 24/7, only banks can use this route |
| **Promotional** | **Seller → Customers** (marketing) | "50% OFF SALE!" | Only 9 AM - 9 PM, must respect DND, consent required |
| **Service/Implicit** | **Anyone → Existing customers** | "Your order has been delivered", "Your subscription renews tomorrow" | Can be sent 24/7, no consent needed, must be informational |
| **Service/Explicit** | **Anyone → Consented customers** | "Renew your policy, get 15% off" | Marketing to consented users, 24/7 |

> ⚠️ **Important:** "Transactional" in DLT is NOT what you think! It's only for bank OTPs.
> What we normally call "transactional" (order updates, shipping alerts) falls under **Service/Implicit** in DLT terminology.

### Where Does Each ShopPulse Message Fall in DLT Routes?

Here's every type of SMS that ShopPulse sends, mapped to its correct DLT route:

#### ShopPulse → Seller (Platform to Store Owner)

| Message | DLT Route | Why |
|---------|-----------|-----|
| **OTP for phone verification** during seller onboarding | **Service/Implicit** | It's NOT a bank OTP — it's a platform OTP for identity verification. Non-bank OTPs fall under Service/Implicit |
| **OTP when enabling/disabling auto-shipping** | **Service/Implicit** | Security verification for a crucial setting change — informational/service related |
| **OTP for subscription upgrade/downgrade/credit loss** | **Service/Implicit** | Verification before a billing action — service related |
| "Your subscription renews tomorrow" | **Service/Implicit** | Informational update about existing service |
| "Low stock alert: iPhone 15 has 2 left" | **Service/Implicit** | Service notification about their store |
| "New order received! ORD-A1B2 - ₹1,299" | **Service/Implicit** | Informational alert about an action on their platform |

> **Key clarification on OTPs:** In DLT, the **Transactional route is ONLY for banks** (SBI, HDFC, etc. sending bank transaction OTPs). ALL other OTPs — whether it's for login, phone verification, settings change, payment confirmation — they go through **Service/Implicit** route. Your ShopPulse OTPs are Service/Implicit, not Transactional.

#### Seller → Customer (Store to Buyer)

| Message | DLT Route | Why |
|---------|-----------|-----|
| **OTP at checkout** (customer enters phone + OTP) | **Service/Implicit** | Verification OTP for an ongoing transaction — service related |
| "Order ORD-A1B2 confirmed! ₹1,299" | **Service/Implicit** | Order update — informational, customer expects it |
| "Your order has shipped! Track: ..." | **Service/Implicit** | Shipment update — informational |
| "Order delivered successfully" | **Service/Implicit** | Delivery confirmation — informational |
| "Your order has been cancelled" | **Service/Implicit** | Cancellation notice — informational |
| "Payment failed, please retry" | **Service/Implicit** | Payment alert — informational |
| "Refund of ₹500 processed" | **Service/Implicit** | Refund notification — informational |
| "Out for delivery - arriving today!" | **Service/Implicit** | Delivery update — informational |
| "Diwali Sale! 30% off on electronics!" | **Promotional** | Marketing message — needs consent, 9 AM-9 PM only, non-DND only |
| "Your wishlist item is back in stock!" | **Service/Explicit** | Marketing to consented customer — needs prior consent |

**Pattern to remember:**
```
Is the customer EXPECTING this message because of an action they took?
  → YES → Service/Implicit (order updates, OTPs, alerts)
  → NO  → Is it marketing/advertising?
         → YES → Did customer give consent?
                → YES → Service/Explicit
                → NO  → Promotional (non-DND only, 9-9 only)
```

### Who Sends What in ShopPulse?

ShopPulse deals with **all three message categories**, but the sender and recipient differ:

| Category | Who sends? | Who receives? | ShopPulse Example |
|----------|-----------|---------------|-------------------|
| **Service/Implicit** (order updates) | **Seller's store** (via ShopPulse platform) | **Customers** | "Your order ORD-A1B2 is confirmed!", "Your order has shipped!" |
| **Promotional** | **Seller** (via ShopPulse platform) | **Customers** | "Diwali Sale! 30% off on all electronics!" |
| **Service/Implicit** (platform updates) | **ShopPulse (us)** | **Sellers** (store owners) | "Your subscription renews tomorrow", "Low stock alert: iPhone 15 has 2 left" |

**In simpler terms:**
- **Sellers** use the platform to send **transactional** updates (order confirmation, shipping, delivery — these are Service/Implicit in DLT) and **promotional** messages (sales, offers) to their **customers**
- **ShopPulse** sends **service/implicit** messages to **sellers** about their store and subscription — things like "New order received!", "Low stock alert", "Subscription expiring soon"

So the platform handles messages flowing in **both directions**:
```
Customer ←── [Service/Implicit + Promotional] ←── Seller (via ShopPulse)
Seller   ←── [Service/Implicit]               ←── ShopPulse (platform)
```

### 2.3 The DLT Registration Process (Step by Step)

Before you can send even ONE business SMS in India, you need to register on a DLT platform. Here's the full process:

```
Step 1: Register as a "Principal Entity" on a DLT platform
         ↓
Step 2: Register your "Sender ID" (Header)
         ↓
Step 3: Register your "Content Templates"
         ↓
Step 4: Get Template IDs approved
         ↓
Step 5: Now you can send SMS through providers like Fast2SMS
```

Let's break each step down:

#### Step 1: Entity Registration (You = "Principal Entity")

You need to register your business on one of these DLT platforms:

| Platform | Operated By | Website |
|----------|------------|---------|
| **Vilpower** | Vodafone Idea | vilpower.in |
| **Jio TrueConnect** | Reliance Jio | trueconnect.jio.com |
| **Airtel DLT** | Airtel | dltconnect.airtel.in |
| **BSNL DLT** | BSNL | www.ucc-bsnl.co.in |
| **MTNL DLT** | MTNL | www.ucc-mtnl.in |

**You only need to register on ONE platform.** All telecom operators share the DLT data.

What you need:
- Business PAN card (or personal PAN card for sole proprietorship)
- GST certificate (or other business proof — see below)
- Authorised signatory details
- Business address proof
- Letter of Authorisation (on company letterhead)

After submitting, you get:
- **Entity ID** (unique identifier for your business, e.g., `1234567890123456789`)
- Takes 3-7 business days for approval

---

### 🔥 IMPORTANT: "I'm a Solo Developer Without a Company — How Do I Test SMS?"

**Your situation:** You're a solo developer, no company/LLP/partnership registration, no GST certificate, no company letterhead. You've built the entire product yourself. How do you test SMS?

**You have 3 options:**

#### Option 1: Use Fast2SMS Quick SMS Route (NO DLT needed) — ✅ DO THIS NOW

This is what our code already does! The **Quick SMS** route (`route: "q"`) does NOT require any DLT registration.

```
What you need:
1. Sign up on fast2sms.com (free, just your phone number)
2. You get ₹50 free credit after signup (enough for ~200 test SMS)
3. Get your API key from the dashboard
4. That's it! Start sending test SMS immediately
```

**How it works:** Fast2SMS has their OWN pre-registered DLT templates. Your message goes through their Quick SMS pipeline which internally matches against their templates. The sender ID will be something like `FSTSMS` (not your brand), but for testing it's perfect.

**Limitations:**
- Sender ID is not your brand (shows FSTSMS or similar)
- Each message is manually approved by Fast2SMS
- Not suitable for production (but perfect for development and testing)
- ₹0.25 per SMS (cheapest tier)

#### Option 2: Register on DLT as "Sole Proprietorship" — 📋 FOR PRODUCTION

The DLT portal **explicitly** allows these entity types (from the official FAQ):

```
Who can register as a Principal Entity:
✅ Sole Proprietorship          ← THIS IS YOU
✅ Individual                   ← THIS ALSO WORKS
✅ Family owned Business        ← THIS TOO
✅ Partnership Firm
✅ Private Limited Company
✅ Public Limited Company
✅ Trust/Club/Association
✅ NGO
✅ Educational Institution
... and more
```

**As a sole proprietor, here's what you need:**

| Document | What to use if you're solo |
|----------|---------------------------|
| **Identity Proof** | Your **personal PAN card** |
| **Address Proof** | Passport / Voter ID / Driving License / Aadhaar |
| **Business Proof** | Shop & Establishment certificate, OR Udyam Registration (MSME, free, online!), OR any trade license |
| **Letter of Authorization** | Write it yourself! It says "I authorize myself to register on DLT" — since you ARE the owner. Use a simple letterhead with your business name |

> **Pro tip:** Get a free **Udyam Registration** (MSME registration) from [udyamregistration.gov.in](https://udyamregistration.gov.in). It's completely free, takes 10 minutes, and works as valid business proof for DLT. No GST number required for Udyam if turnover is below the threshold.

#### Option 3: Use Resend for Email Testing (NO special registration needed)

For email, there's no DLT or government registration at all. Just sign up at resend.com, get an API key, and start sending. For testing, Resend gives you `onboarding@resend.dev` as a sender.

---

### 💰 DLT Registration Fees (Latest as of 2025)

| DLT Platform | Operated By | Registration Fee | Website |
|-------------|------------|-----------------|---------|
| **Vilpower** | Vodafone Idea | **₹5,900/year** (including GST) | [vilpower.in](https://www.vilpower.in) |
| **Jio TrueConnect** | Reliance Jio | **FREE** ✅ | [trueconnect.jio.com](https://trueconnect.jio.com) |
| **BSNL DLT** | BSNL | **FREE** ✅ | [www.ucc-bsnl.co.in](https://www.ucc-bsnl.co.in) |
| **Videocon/Smartping** | Videocon | **FREE** ✅ | [smartping.live](https://smartping.live) |
| **Airtel DLT** | Airtel | **₹5,900/year** (including GST) | [dltconnect.airtel.in](https://dltconnect.airtel.in) |

> **Recommendation for solo developers:** Register on **Jio TrueConnect** (free!) or **BSNL** (free!). You only need to register on ONE platform — the Entity ID works across all telecom operators.

### DLT Registration Process (Step by Step for Jio — Free)

```
Step 1: Open https://trueconnect.jio.com
Step 2: Click "Sign Up" → Select "Enterprise" (not Telemarketer)
Step 3: Choose entity type: "Sole Proprietorship" or "Individual"
Step 4: Fill in details:
         - Business name: "ShopPulse" (or your brand name)
         - PAN card number (personal PAN is fine)
         - Upload: PAN card copy, Address proof, Udyam/Business proof
         - Letter of Authorization (self-signed, on a simple letterhead)
Step 5: Submit and wait for approval (3-5 working days)
Step 6: You receive Entity ID on your registered email
Step 7: Add Fast2SMS as Telemarketer:
         Telemarketer Name: SID GROUPS
         Telemarketer ID: 1702159738863862112
Step 8: Register your Headers (Sender IDs) — e.g., SHPPLS
Step 9: Register your Content Templates with {#var#} variables
Step 10: Connect approved Headers & Templates in Fast2SMS DLT Manager
```

**Approval timeline:** Entity: 3-5 days → Header: 1-3 days → Templates: 1-7 days
**Total time:** ~1-2 weeks from start to first production SMS

---

#### Step 2: Sender ID Registration (Header)

The "Sender ID" is the 6-character name that appears as the SMS sender.

When you get an SMS like:
```
From: SHPPLS
Your order #ORD-A1B2 is confirmed! ₹1,299 (Paid). - ShopPulse
```

**"SHPPLS"** is the Sender ID / Header.

Rules:
- Exactly 6 characters (letters only, A-Z)
- Must be unique (not already taken by another business)
- Must relate to your business name
- Examples for ShopPulse: `SHPPLS`, `SHPULS`, `SHOPPL`

Register this on the same DLT platform. Takes 1-3 days for approval.

#### Step 3: Content Template Registration ⭐ (THIS IS THE KEY PART)

**This is what confuses most people.** Let me explain it like you're 5.

Imagine the government says:
> "Before you send any SMS, show me EXACTLY what the message will look like."

So you go to the DLT platform and register a template:

```
Template: Your order #{#var#} is confirmed! ₹{#var#} ({#var#}). - {#var#}
Type:     Service/Implicit
Category: E-Commerce
```

The `{{orderId}}`, `{{amount}}`, etc. are **variables** — they change for each SMS, but the rest of the text stays EXACTLY the same.

The government approves this template and gives you a **Template ID** (e.g., `1234567890123456789`).

---

### 🤔 What If Variable VALUES Have Spaces?

**Short answer: Spaces in variable values are PERFECTLY FINE.** The `{#var#}` placeholder is what the DLT portal uses — it just marks "something will go here." The actual value you inject can be anything — with spaces, numbers, special characters, etc.

**Example:**

```
Registered DLT Template:
  "Dear {#var#}, your order {#var#} worth {#var#} is confirmed. - {#var#}"

Sent SMS (all values have spaces or special chars):
  "Dear Rahul Sharma, your order ORD-A1B2 worth ₹1,299.00 is confirmed. - ShopPulse Electronics"
```

✅ `Rahul Sharma` (has a space) → perfectly valid variable value
✅ `₹1,299.00` (has special characters) → perfectly valid
✅ `ShopPulse Electronics` (has a space) → perfectly valid
✅ `ORD-A1B2` (has a hyphen) → perfectly valid

**What CAN'T you do:**
- ❌ You can't change the FIXED text around the variables (e.g., add "Hi" before "Dear")
- ❌ Each variable has a **max length limit** (usually 30 characters) — your value must fit within that
- ❌ Variable values should not contain content that makes the SMS look like a different message entirely

**How variables work with Fast2SMS DLT route (pipe-separated):**
```json
{
  "route": "dlt",
  "message": "1107170123456789",               // Template ID
  "variables_values": "Rahul Sharma|ORD-A1B2|₹1,299.00|ShopPulse Electronics"
}
// The | (pipe) separates each variable value
// Spaces WITHIN a value are fine — the pipe is the separator, not spaces
```

> **Key insight:** The `{#var#}` placeholder does NOT contain your variable name — it's just a positional marker.
> First `{#var#}` = first value before the first pipe.
> Second `{#var#}` = second value between first and second pipe.
> And so on. The variable names (`orderId`, `customerName`) are OUR invention — DLT doesn't know or care about names.

**TRAI Rule (since March 2023):** Content templates can have a maximum of **2 variables**, and they must be **non-continuous** (you can't have `{#var#}{#var#}` right next to each other — there must be some fixed text between them).

---

**THE GOLDEN RULE:**
> The SMS you actually send MUST match the registered template EXACTLY.
> Only the variables (the parts in curly braces) can change.
> If you change even one word, the SMS will be BLOCKED by the telecom operator.

##### Example of what happens:

✅ **Approved template:** `Your order #{{var}} is confirmed! ₹{{var}}. - {{var}}`

✅ **Sent SMS (matches):** `Your order #ORD-123 is confirmed! ₹1,299. - ShopPulse`

❌ **Sent SMS (BLOCKED!):** `Hey! Your order #ORD-123 is confirmed! ₹1,299. - ShopPulse`
(Added "Hey!" which is not in the template)

❌ **Sent SMS (BLOCKED!):** `Your order #ORD-123 confirmed! ₹1,299. - ShopPulse`
(Removed "is" — template says "is confirmed", you sent "confirmed")

##### Template Variables:

On DLT platforms, variables are usually represented as:
- `{#var#}` — on Vilpower
- `{var}` — on some other platforms
- They just mean "this part will change"

Each variable has a max length (usually 30 characters).

#### Step 4: Template Approval

After submitting your template:
- DLT platform reviews it (1-7 business days)
- They check: is it genuine transactional content? Is it not spammy?
- If approved → you get a **Template ID**
- If rejected → you get a reason (fix and resubmit)

#### Step 5: Now You Can Finally Send SMS!

Once you have:
- ✅ Entity ID (your business identity)
- ✅ Sender ID (e.g., SHPPLS)
- ✅ Template ID (for each message type)
- ✅ API key from an SMS provider (like Fast2SMS)

You can send SMS through the provider's API.

### 2.4 How Fast2SMS Fits Into This

Fast2SMS is a **middleman** between you and the telecom operators.

```
┌──────────┐    API Call    ┌──────────────┐   Delivers via    ┌────────────┐
│ Your App │──────────────▶│   Fast2SMS    │─────────────────▶│  Customer  │
│          │               │              │    Telecom        │   Phone    │
│ "Send    │               │ Validates    │    Networks       │            │
│  this    │               │ against DLT  │    (Airtel,       │ Gets SMS!  │
│  SMS"    │               │ templates,   │     Jio, Vi...)   │            │
│          │               │ routes to    │                   │            │
│          │               │ carriers"    │                   │            │
└──────────┘               └──────────────┘                   └────────────┘
```

Fast2SMS offers **3 types of APIs**:

| API Type | DLT Required? | Use Case | What We Use |
|----------|--------------|----------|-------------|
| **Quick SMS (route "q")** | ❌ No | Testing, development, quick sends | ✅ **Currently using this** |
| **DLT SMS** | ✅ Yes | Production (auto-matches templates) | For production later |
| **DLT Manual SMS** | ✅ Yes | Production (you provide sender_id + template_id) | For production later |

#### Quick SMS (What we use now — route "q")

This is Fast2SMS's **testing/development** route:
- No DLT registration needed
- Sender ID is auto-assigned (usually "FSTSMS" or similar)
- Messages go through Fast2SMS's own DLT templates
- **Limitation:** Not suitable for production (sender ID isn't your brand)

API call:
```json
POST https://www.fast2sms.com/dev/bulkV2
Headers: { "Authorization": "YOUR_API_KEY" }
Body: {
  "route": "q",           // "q" = Quick SMS
  "message": "Your order confirmed!",
  "flash": 0,
  "numbers": "9876543210" // 10-digit Indian number
}
```

#### DLT SMS (For production)

When you're ready for production, you'll use:
```json
POST https://www.fast2sms.com/dev/bulkV2
Headers: { "Authorization": "YOUR_API_KEY" }
Body: {
  "route": "dlt",
  "sender_id": "SHPPLS",           // Your registered sender ID
  "message": "170765",             // DLT Template ID (NOT the message text!)
  "variables_values": "ORD-123|1299|ShopPulse",  // Pipe-separated variable values
  "flash": 0,
  "numbers": "9876543210"
}
```

Notice: In DLT mode, `message` is the **Template ID**, not the actual text! Fast2SMS fetches the template text from DLT and fills in your variables.

### 2.5 Phone Number Format

Indian mobile numbers:
- Always 10 digits
- Start with 6, 7, 8, or 9
- Can be prefixed with `+91` (country code) or just `91`

**The tricky part:** Some valid numbers START with `91` (like `9154687646`). Our code needs to be smart about stripping country codes.

```
+919154687646 → strip +91 → 9154687646 ✅ (12 digits → strip country code)
919154687646  → strip 91  → 9154687646 ✅ (12 digits → strip country code)
9154687646    → keep as-is → 9154687646 ✅ (already 10 digits, starts with 91 naturally)
9876543210    → keep as-is → 9876543210 ✅ (already 10 digits)
```

---

## 3. Email Sending — The Complete Story

### 3.1 Why You Can't Just Send Emails

When you send an email from your Gmail, Google handles everything. But when an **app** sends emails, there's no "Google" in between. You need to:

1. Prove you own the domain you're sending from
2. Set up authentication so email providers trust you
3. Maintain a good "sender reputation" so emails don't go to spam

### 3.2 Email Authentication — The 3 Pillars

For your emails to actually reach inboxes (not spam), you need 3 things set up in your DNS:

#### SPF (Sender Policy Framework)
- **What:** A DNS record that says "these servers are allowed to send emails for my domain"
- **Analogy:** Like a list of authorised signatories at a bank
- **DNS Record:** `TXT "v=spf1 include:amazonses.com ~all"`
- This says: "Amazon SES (which Resend uses) is allowed to send emails for my domain"

#### DKIM (DomainKeys Identified Mail)
- **What:** A cryptographic signature that proves the email wasn't tampered with
- **Analogy:** Like a wax seal on a letter — if the seal is broken, you know someone tampered with it
- **DNS Record:** `TXT resend._domainkey = "p=MIGfMA0GCS..."` (a public key)
- The email service signs each email with a private key, and the recipient verifies with the public key

#### DMARC (Domain-based Message Authentication, Reporting & Conformance)
- **What:** A policy that tells email providers what to do if SPF/DKIM fails
- **Analogy:** Instructions that say "if the wax seal is broken, throw the letter away"
- **DNS Record:** `TXT _dmarc = "v=DMARC1; p=quarantine"` (quarantine = put in spam)
- Optional but recommended

### 3.3 Domain Verification Process with Resend

```
Step 1: Sign up at resend.com and get an API key
         ↓
Step 2: Add your domain (e.g., send.yourstore.com)
         ↓
Step 3: Add DNS records to your domain provider:
         • MX record  → for bounce handling
         • TXT record → SPF (authorise Resend to send)
         • TXT record → DKIM (email signing)
         ↓
Step 4: Click "Verify" on Resend dashboard
         ↓
Step 5: Wait (usually minutes, up to 72 hours)
         ↓
Step 6: Domain verified ✅ — now you can send emails!
```

**Best practice:** Use a subdomain like `send.yourstore.com` instead of `yourstore.com`.
Why? If your email reputation gets damaged, it doesn't affect your main domain.

### 3.4 How Resend Sends Emails

Once your domain is verified:

```
┌──────────┐   API Call    ┌──────────────┐   Via Amazon SES   ┌────────────┐
│ Your App │─────────────▶│   Resend      │──────────────────▶│ Customer's │
│          │               │              │                   │  Inbox     │
│ "Send    │               │ Adds DKIM    │   Mail servers    │            │
│  this    │               │ signature,   │   (Gmail,         │ Gets email │
│  email"  │               │ sets SPF,    │    Outlook,       │  in inbox  │
│          │               │ delivers     │    Yahoo...)      │ (not spam) │
└──────────┘               └──────────────┘                   └────────────┘
```

API call:
```javascript
import { Resend } from 'resend';
const resend = new Resend('re_your_api_key');

await resend.emails.send({
  from: 'ShopPulse <orders@send.yourstore.com>',  // Your verified domain
  to: 'customer@gmail.com',
  subject: 'Order Confirmed — ORD-A1B2 🎉',
  html: '<h1>Your order is confirmed!</h1><p>...</p>',
});
```

### 3.5 Email Templates — Simpler Than SMS

Unlike SMS in India, there's **no government registration for email templates.**

You can send whatever content you want (as long as it's not spam). Our email templates are purely an **internal** convenience — a way for us to structure our messages consistently.

```
Template:  "Hi {{customerName}}, your order #{{orderId}} is confirmed!"
Variables: { customerName: "Rahul", orderId: "ORD-A1B2" }
Result:    "Hi Rahul, your order #ORD-A1B2 is confirmed!"
```

Resend also offers their own template system (you create templates on their dashboard and reference them by ID), but we build our own template engine for maximum flexibility.

---

## 4. Our Chosen Providers

### 4.1 Fast2SMS (SMS)

| Detail | Value |
|--------|-------|
| **Website** | fast2sms.com |
| **Country** | India-only |
| **Auth** | API key in request header |
| **Pricing** | Prepaid wallet (₹0.15-0.25 per SMS) |
| **Free credits** | Yes, on signup (for testing) |
| **DLT support** | Yes (Quick SMS for testing, DLT SMS for production) |
| **API endpoint** | `https://www.fast2sms.com/dev/bulkV2` |
| **Delivery reports** | Via API or dashboard |
| **Credential we store** | `api_key` |
| **How we validate** | Check wallet balance API (`/dev/wallet`) |

### 4.2 Resend (Email)


| Detail | Value |
|--------|-------|
| **Website** | resend.com |
| **Country** | Global |
| **Auth** | API key as Bearer token |
| **Pricing** | Free tier: 3,000 emails/month, 100/day |
| **Infrastructure** | Amazon SES under the hood |
| **API endpoint** | `https://api.resend.com/emails` |
| **Credential we store** | `api_key`, `from_email`, `from_name` (optional) |
| **How we validate** | List domains API (`/domains`) |
| **Domain required?** | Yes — must verify your sending domain |

---

## 5. Summary — What We Need Before Writing Code

### For SMS (Fast2SMS):

### 📋 Production-Ready SMS Checklist — Everything We Still Need to Code

> This list is based on the current state of our code. Our notification system's architecture
> (Strategy Pattern, provider abstraction, template processor, orchestrator) is SOLID.
> But the SMS flow currently only supports Quick SMS testing. Here's what's needed for production.

#### ✅ Already Done (What We Have)

| # | Feature | Where in code |
|---|---------|--------------|
| 1 | Provider abstraction (SMSProvider interface) | `types.ts` |
| 2 | Fast2SMS Quick SMS provider | `fast2sms.ts` → `route: "q"` |
| 3 | Phone number sanitization (+91 stripping) | `fast2sms.ts` → `send()` |
| 4 | SMS service with factory pattern | `sms-service.ts` → `createSMSProvider()` |
| 5 | Template processor ({{variables}}) | `template-processor.ts` |
| 6 | Default SMS templates for all 7 events | `default-templates.ts` |
| 7 | Notification orchestrator (trigger/sendTest) | `notification-service.ts` |
| 8 | Credential encryption (AES-256-CBC) | `encryption.ts` + integration-service |
| 9 | Pre-save credential validation | `integration-validators.ts` |
| 10 | Notification logging (fire-and-forget) | `notification-logger.ts` |
| 11 | Admin UI API routes (settings, templates, logs, test-send) | All 4 API routes |

#### ❌ Needs Coding for Production

| # | Feature | What to build | Files to change |
|---|---------|---------------|----------------|
| **1** | **DLT route support in Fast2SMS provider** | Add a `sendDLT()` method that uses `route: "dlt"` with `sender_id`, `message` (template ID), `variables_values` (pipe-separated) | `fast2sms.ts` |
| **2** | **DLT template ID storage** | Store DLT Template IDs per event type per store. New DB table or add `dltTemplateId` field to `NotificationTemplate` model | `schema.prisma` → new field/model |
| **3** | **DLT sender ID storage** | Store the registered DLT Sender ID (Header) for each store. Add `dltSenderId` to `NotificationSettings` or `StoreIntegration` | `schema.prisma` → new field |
| **4** | **Route mode toggle** | Let stores switch between Quick SMS (dev) and DLT SMS (production). Could be a `smsRoute` field: `"quick"` or `"dlt"` in NotificationSettings | `notification-service.ts`, `fast2sms.ts` |
| **5** | **Variable-to-pipe-separated converter** | DLT route needs `variables_values: "val1\|val2\|val3"` — build a function that takes our flat variables and converts them to pipe-separated values in the correct order matching the DLT template | `fast2sms.ts` or new util |
| **6** | **DLT template variable order mapping** | DLT variables are positional (`{#var#}` = first, second, etc.). We need a mapping that says "for ORDER_CONFIRMED, variable 1 = orderId, variable 2 = orderTotal" | New config or DB table |
| **7** | **Delivery report webhooks** | Fast2SMS can send delivery status updates (delivered, failed, etc.) via webhooks. Build an incoming webhook endpoint to update `NotificationLog.status` | New API route: `/api/webhooks/fast2sms` |
| **8** | **SMS retry logic** | If SMS send fails (network error, temporary issue), retry 1-2 times with exponential backoff. Currently, a failure is logged and forgotten | `notification-service.ts` |
| **9** | **SMS character count validation** | SMS has 160 char limit per segment (70 for Unicode). Warn admin if template + variables exceed this. Multi-segment SMS costs more | Template editor UI + validation |
| **10** | **Multi-number support** | Currently sends to one phone at a time. For admin alerts or bulk notifications, support sending to multiple numbers in one API call (Fast2SMS supports comma-separated numbers) | `fast2sms.ts` |
| **11** | **Provider-agnostic DLT abstraction** | If we switch from Fast2SMS to MSG91 or Twilio, the DLT sending interface (template ID + variables) should be abstracted into the `SMSProvider` interface | `types.ts` → extend `SMSProvider` |
| **12** | **Rate limiting for SMS sends** | Don't overwhelm the SMS provider — add per-store and global rate limits | `notification-service.ts` or middleware |
| **13** | **Cost tracking** | Track SMS costs per store (₹0.15-0.25 each) for billing/analytics. Could store in `NotificationLog` or separate table | `notification-logger.ts` + schema |
| **14** | **Template preview in admin UI** | Let admins preview how SMS will look with sample data before registering on DLT. Currently, templates exist in code but no preview UI | Frontend component |

#### 🔄 The "Minimum Viable Production" Set (Do These First)

If you want to go production with the smallest possible effort:

```
Priority 1 (MUST):  #1 (DLT route), #2 (template IDs), #3 (sender ID), #4 (route toggle)
Priority 2 (SHOULD): #5 (pipe converter), #6 (variable mapping), #7 (delivery webhooks)
Priority 3 (NICE):   #8 (retries), #9 (char validation), #11 (provider abstraction)
```

**What the code change looks like for Priority 1:**

```typescript
// In fast2sms.ts — new method:
async sendDLT(phone: string, templateId: string, variableValues: string[], senderId: string) {
  const sanitisedPhone = this.sanitisePhone(phone);

  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { Authorization: this.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      route: 'dlt',                                    // DLT route instead of 'q'
      sender_id: senderId,                              // "SHPPLS"
      message: templateId,                              // DLT Template ID
      variables_values: variableValues.join('|'),       // "Rahul|ORD-A1B2|₹1,299"
      flash: 0,
      numbers: sanitisedPhone,
    }),
  });

  // ... handle response same as Quick SMS
}
```

| What | Status | Notes |
|------|--------|-------|
| Fast2SMS account | ✅ Can do now | Sign up, get API key |
| DLT Entity Registration | 📋 For production | Register on vilpower.in or similar |
| DLT Sender ID | 📋 For production | 6-char like SHPPLS |
| DLT Content Templates | 📋 For production | One per message type |
| Template IDs | 📋 For production | Auto-assigned after approval |


**For now (development):** We just need the Fast2SMS API key. The Quick SMS route (`route: "q"`) works without DLT.

### For Email (Resend):

| What | Status | Notes |
|------|--------|-------|
| Resend account | ✅ Can do now | Sign up at resend.com |
| API key | ✅ Can do now | Create in Resend dashboard |
| Domain verification | 📋 For production | Add DNS records (SPF + DKIM) |
| From email address | 📋 After verification | e.g., orders@send.yourstore.com |

**For now (development):** Resend gives you `onboarding@resend.dev` for testing.

### Key Differences: SMS vs Email

| Aspect | SMS (India) | Email |
|--------|-------------|-------|
| Government regulation | ✅ Heavy (TRAI/DLT) | ❌ None |
| Template registration | ✅ Required (with govt) | ❌ Not required |
| Template must match exactly | ✅ Yes, or message is blocked | ❌ No restriction |
| Authentication | API key only | Domain DNS (SPF, DKIM) |
| Cost | ₹0.15-0.25 per SMS | Free tier available |
| Character limit | 160 chars/segment | No practical limit |
| Variable injection | Done by provider (DLT) or by us (Quick) | Always done by us |

---

## 6. How Shopify, WooCommerce & Dukaan Handle Notifications — And How We Compare

### 6.1 Shopify's Approach

Shopify is the most relevant comparison because ShopPulse is a similar SaaS platform where sellers set up stores.

#### Shopify's Email Notifications:
- **Built-in template engine** using **Liquid** (Shopify's own templating language — similar to our `{{variable}}` system)
- Templates use variables like `{{ order.name }}`, `{{ customer.first_name }}`, `{{ shop.name }}`
- Store owners can **fully edit** HTML email templates from `Settings → Notifications → Customize`
- Shopify provides **default templates** that work out of the box — just like our `DEFAULT_EMAIL_TEMPLATES`
- Variables are documented extensively (order properties, line items, fulfillment, discounts, etc.)
- Emails are sent automatically on events: order confirmation, shipping update, refund, etc.

**What we do similarly:** Our email system follows the exact same pattern — default templates with `{{variables}}`, admin can customize, auto-sent on events.

#### Shopify's SMS Notifications:
- **Very limited!** Shopify's built-in SMS only supports **order confirmation** — that's it, just ONE event
- SMS is only available in **12 countries** (USA, UK, Canada, etc.) — **India is NOT supported!**
- SMS templates **cannot be edited** by store owners
- Sender ID is auto-generated from store name (truncated to 11 chars)
- If Indian stores want SMS, they must install **third-party apps** from the Shopify App Store

**What this means for us:** ShopPulse actually has a MORE advanced SMS system than Shopify's built-in! We support:
- Multiple event types (order confirmed, shipped, delivered, cancelled, etc.)
- Custom templates
- India-specific DLT compliance
- Provider abstraction (can switch providers)

#### How Shopify Handles DLT (It Doesn't):
Shopify doesn't natively support Indian DLT SMS at all. Indian Shopify stores rely on third-party apps like:
- **SMSBump** / **Postscript** — SMS marketing apps
- **Gupshup** — Indian SMS provider with DLT support
- **MSG91** — Indian SMS gateway

These apps handle their own DLT registration and template management outside of Shopify.

### 6.2 WooCommerce's Approach

WooCommerce (WordPress plugin) is self-hosted — the store owner runs their own server.

#### WooCommerce's Email Notifications:
- Uses **PHP templating** with variables like `{order_number}`, `{customer_name}`
- Store owners can edit templates from `WooCommerce → Settings → Emails`
- Each event (new order, processing, completed, refunded) has its own template
- Heavily extensible via WordPress plugins

#### WooCommerce's SMS:
- **No built-in SMS at all!** Zero SMS functionality out of the box
- Requires third-party plugins like:
  - **Twilio SMS Notifications for WooCommerce** (global)
  - **Fast2SMS for WooCommerce** (India-specific)
  - **MSG91 WooCommerce SMS** (India-specific with DLT)
- Each plugin handles DLT compliance differently

**What this means for us:** WooCommerce doesn't even try to handle SMS. It's 100% plugin-dependent. ShopPulse has SMS built into the core platform — much better UX for store owners.

### 6.3 Dukaan's Approach

Dukaan is an Indian e-commerce platform (closest competitor to ShopPulse for Indian market).

#### Dukaan's Notifications:
- **Pre-built notifications** — store owners can toggle events on/off but CANNOT edit template text
- SMS uses DLT-registered templates managed by Dukaan (the platform), not individual sellers
- Sellers don't need to do DLT registration — Dukaan handles it platform-wide
- WhatsApp notifications are also built-in (via WhatsApp Business API)
- Limited customization — sellers can't change the message wording

### 6.4 Comparison Table: ShopPulse vs The Giants

| Feature | Shopify | WooCommerce | Dukaan | **ShopPulse (Us)** |
|---------|---------|-------------|--------|-------------------|
| **Email notifications** | ✅ Built-in, Liquid templates | ✅ Built-in, PHP templates | ✅ Built-in, fixed | ✅ Built-in, `{{var}}` templates |
| **Admin can edit email** | ✅ Full HTML editing | ✅ Full editing | ❌ Fixed text | ✅ Full editing |
| **SMS notifications** | ⚠️ Only order confirmation, 12 countries | ❌ None built-in | ✅ Built-in, DLT managed by Dukaan | ✅ Built-in, 7+ events |
| **India SMS (DLT)** | ❌ Not supported | ❌ Plugin-only | ✅ Platform handles it | ✅ Quick SMS now, DLT-ready architecture |
| **Admin can edit SMS** | ❌ | N/A | ❌ | ✅ (dev mode), DLT-locked in production |
| **SMS provider choice** | Fixed | Plugin-dependent | Fixed | ✅ Strategy Pattern (switchable) |
| **Credential encryption** | Platform handles | Plugin-dependent | Platform handles | ✅ AES-256-CBC |
| **Notification logs** | Dashboard only | Plugin-dependent | Basic | ✅ Full logs with filters |
| **Template variables** | Liquid (complex) | PHP (complex) | None (fixed) | `{{var}}` (simple, intuitive) |
| **DLT registration** | N/A for India | N/A for India | Platform does it | Seller does it (with our guidance) |

### 6.5 The Key Architectural Difference

```
SHOPIFY / DUKAAN (Platform-managed):
  → Platform registers DLT templates ONCE for all stores
  → All stores use the SAME templates (e.g., "Your order {#var#} is confirmed")
  → Sellers can't change the SMS text
  → Simpler for sellers, less flexible

SHOPPULSE (Seller-managed, our approach):
  → Each seller registers their OWN DLT templates
  → Each store can have DIFFERENT message text
  → More work for sellers, but more flexibility and brand control
  → We provide defaults + guidance to make it easy

WOOCOMMERCE (Plugin-managed):
  → Third-party plugin handles everything
  → Quality and features vary wildly by plugin
  → No consistency across stores
```

**Our approach is closest to Shopify's email system** (templates with variables, defaults + customization) but with **better SMS support** for the Indian market. In the future, we could offer a "Platform-managed DLT" option (like Dukaan) where ShopPulse registers templates on behalf of sellers.

---

> **Next:** [Part 2 — Inside Our Code](./11_NOTIFICATION_GUIDE_PART2_OUR_CODE.md) — How every file in our notification system works, explained line by line.
