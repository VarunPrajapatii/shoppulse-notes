# Part 5: Email Services Integration Guide (SendGrid & Resend)

## Table of Contents
1. [Email Service Overview](#email-service-overview)
2. [SendGrid Deep Dive](#sendgrid-deep-dive)
3. [Resend Deep Dive](#resend-deep-dive)
4. [Email Deliverability Fundamentals](#email-deliverability-fundamentals)
5. [Template Design Principles](#template-design-principles)
6. [Implementation Strategy](#implementation-strategy)
7. [Provider Comparison](#provider-comparison)
8. [Best Practices](#best-practices)

---

## Email Service Overview

### Why Email Matters for E-commerce

Email is **not optional** for e-commerce. It's expected by customers:

| Email Type | Purpose | Open Rate |
|------------|---------|-----------|
| Order Confirmation | Receipt, builds trust | 60-70% |
| Shipping Notification | Tracking info | 50-60% |
| Delivery Confirmation | Order complete | 40-50% |
| Abandoned Cart | Recovery | 40-45% |
| Marketing | Promotions | 15-25% |

### Transactional vs Marketing Email

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EMAIL TYPES FOR SHOPPULSE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   TRANSACTIONAL (Primary Focus)                                     │
│   ─────────────────────────────                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ • Triggered by user action                                   │   │
│   │ • Order confirmation                                         │   │
│   │ • Shipping updates                                           │   │
│   │ • Password reset                                             │   │
│   │ • Payment receipts                                           │   │
│   │                                                              │   │
│   │ Characteristics:                                             │   │
│   │ • No opt-out required (service email)                       │   │
│   │ • High priority delivery                                     │   │
│   │ • Time-sensitive                                             │   │
│   │ • One-to-one                                                 │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   MARKETING (Future Enhancement)                                    │
│   ──────────────────────────────                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ • Sent to subscriber lists                                   │   │
│   │ • Promotional campaigns                                      │   │
│   │ • Newsletters                                                │   │
│   │ • Product launches                                           │   │
│   │                                                              │   │
│   │ Characteristics:                                             │   │
│   │ • Opt-out/unsubscribe required                              │   │
│   │ • Batch sending                                              │   │
│   │ • Scheduled delivery                                         │   │
│   │ • One-to-many                                                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   For MVP: Focus on TRANSACTIONAL only                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Email Providers Landscape

| Provider | Type | Best For | Pricing Model |
|----------|------|----------|---------------|
| **SendGrid** | Enterprise | High volume, established | Free tier + per email |
| **Resend** | Developer-focused | Modern stack, DX | Free tier + per email |
| **AWS SES** | Infrastructure | Very high volume | Pay per email (cheapest) |
| **Mailgun** | Transactional | Developers | Per email |
| **Postmark** | Transactional | Deliverability focus | Per email |

**ShopPulse Focus**: SendGrid (enterprise) + Resend (modern alternative)

---

## SendGrid Deep Dive

### About SendGrid

| Aspect | Details |
|--------|---------|
| Founded | 2009 |
| Acquired By | Twilio (2019) |
| Emails/Month | 100+ billion |
| Customers | 80,000+ businesses |
| Reliability | 99.9%+ deliverability |

### Why SendGrid

**Pros** ✅
| Advantage | Explanation |
|-----------|-------------|
| Industry standard | Most trusted name |
| Twilio ecosystem | Same company as SMS |
| Deliverability | Best-in-class inbox placement |
| Free tier | 100 emails/day forever |
| Templates | Drag-and-drop builder |
| Analytics | Detailed engagement metrics |
| Scalability | Handles millions |

**Cons** ❌
| Disadvantage | Impact |
|--------------|--------|
| Complex pricing | Confusing tiers |
| UI is dated | Not modern DX |
| Setup complexity | Many configuration steps |
| Response time | Support can be slow |

### Pricing Structure

| Plan | Emails/Month | Price | Notes |
|------|--------------|-------|-------|
| Free | 100/day | $0 | Forever free |
| Essentials | 50,000 | $19.95 | Basic features |
| Essentials | 100,000 | $34.95 | + More |
| Pro | 100,000 | $89.95 | Advanced features |
| Pro | 1,500,000 | $449 | High volume |
| Premier | Custom | Contact | Enterprise |

**For ShopPulse stores**: Free tier (100/day = 3000/month) covers most small stores

### Account Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SENDGRID ACCOUNT                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │                    API KEY                                    │  │
│   │          (Main authentication)                                │  │
│   │      SG.xxxxxxxxxxxxxxxxxxxxxxxx                             │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│   ┌──────────────┬───────────┴───────────┬──────────────────────┐   │
│   │              │                       │                      │   │
│   ▼              ▼                       ▼                      ▼   │
│ ┌────────┐  ┌────────────┐        ┌────────────┐         ┌────────┐│
│ │SENDER  │  │TEMPLATES   │        │DOMAIN      │         │SUPPRESS││
│ │IDENTITY│  │(Dynamic)   │        │AUTH        │         │LISTS   ││
│ │        │  │            │        │            │         │        ││
│ │Verified│  │Order Conf  │        │SPF/DKIM    │         │Bounces ││
│ │Email   │  │Shipping    │        │DMARC       │         │Unsubs  ││
│ └────────┘  └────────────┘        └────────────┘         └────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Credentials Required

| Credential | Where to Find | Format | Required |
|------------|---------------|--------|----------|
| **API Key** | Settings → API Keys | `SG.xxx...` | Yes |
| **From Email** | Settings → Sender Auth | email address | Yes |
| **From Name** | Settings → Sender Auth | display name | Optional |

### Setup Flow

```
Step 1: Create Account
──────────────────────
1. Go to sendgrid.com
2. Sign up (email verification required)
3. Account created

Step 2: Sender Authentication
────────────────────────────
Option A: Single Sender (Quick)
├── Settings → Sender Authentication → Single Sender
├── Enter from email, reply-to
├── Verify email
└── Done (limited deliverability)

Option B: Domain Authentication (Recommended)
├── Settings → Sender Authentication → Domain Auth
├── Enter your domain
├── Add DNS records:
│   ├── CNAME for em1234.yourdomain.com
│   ├── CNAME for s1._domainkey.yourdomain.com
│   └── CNAME for s2._domainkey.yourdomain.com
├── Wait for DNS propagation (up to 48h)
└── Verify in SendGrid

Step 3: Create API Key
──────────────────────
1. Settings → API Keys → Create API Key
2. Name: "ShopPulse Production"
3. Permissions: "Full Access" or "Restricted" (Mail Send)
4. Copy key (shown once!)
5. Store securely

Step 4: Test
────────────
Send test email via API or dashboard
```

### API Overview

```
SendGrid API v3
───────────────

Endpoint: https://api.sendgrid.com/v3/mail/send

Method: POST

Headers:
- Authorization: Bearer SG.xxx...
- Content-Type: application/json

Body:
{
  "personalizations": [
    {
      "to": [{"email": "customer@example.com"}],
      "subject": "Order Confirmed!"
    }
  ],
  "from": {"email": "orders@mystore.com", "name": "My Store"},
  "content": [
    {"type": "text/plain", "value": "Your order is confirmed"},
    {"type": "text/html", "value": "<h1>Order Confirmed!</h1>"}
  ]
}

Response:
- 202 Accepted: Email queued
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
```

---

## Resend Deep Dive

### About Resend

| Aspect | Details |
|--------|---------|
| Founded | 2022 |
| Headquarters | San Francisco |
| Philosophy | Developer-first |
| Focus | Modern email infrastructure |
| Notable | React Email support |

### Why Resend

**Pros** ✅
| Advantage | Explanation |
|-----------|-------------|
| Modern DX | Best developer experience |
| Simple API | Clean, intuitive |
| React Email | Build templates in React |
| Fast setup | 5 minutes to first email |
| Good docs | Excellent documentation |
| Free tier | 3000 emails/month |
| Webhooks | Real-time status updates |

**Cons** ❌
| Disadvantage | Impact |
|--------------|--------|
| Newer | Less proven than SendGrid |
| Smaller scale | Not for millions/day |
| Features | Fewer enterprise features |
| Region | Limited regions initially |

### Pricing Structure

| Plan | Emails/Month | Price | Notes |
|------|--------------|-------|-------|
| Free | 3,000 | $0 | 100/day limit |
| Pro | 50,000 | $20 | + Extra at $0.0004 |
| Enterprise | Custom | Contact | SLA, support |

**For ShopPulse stores**: Free tier very generous for small stores

### Account Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                      RESEND ACCOUNT                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │                    API KEY                                    │  │
│   │             (Simple auth)                                     │  │
│   │         re_xxxxxxxxxxxxxxxxx                                 │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│   ┌──────────────────────────┴──────────────────────────────────┐   │
│   │                                                              │   │
│   ▼                                                              ▼   │
│ ┌────────────────────────┐                    ┌────────────────────┐│
│ │ VERIFIED DOMAINS       │                    │ WEBHOOKS           ││
│ │                        │                    │                    ││
│ │ mystore.com           │                    │ delivered          ││
│ │ ├── SPF ✓             │                    │ bounced            ││
│ │ ├── DKIM ✓            │                    │ complained         ││
│ │ └── DMARC ✓           │                    │ opened             ││
│ └────────────────────────┘                    └────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Credentials Required

| Credential | Where to Find | Format | Required |
|------------|---------------|--------|----------|
| **API Key** | Dashboard → API Keys | `re_xxx...` | Yes |
| **From Email** | Must be verified domain | email address | Yes |

### Setup Flow

```
Step 1: Create Account
──────────────────────
1. Go to resend.com
2. Sign up with GitHub/Google/email
3. Account created instantly

Step 2: Add Domain
──────────────────
1. Dashboard → Domains → Add Domain
2. Enter domain: mystore.com
3. Add DNS records:
   ┌─────────────────────────────────────────────┐
   │ Type   Name                 Value           │
   │ TXT    resend._domainkey   p=xxx...        │
   │ TXT    @                   v=spf1...       │
   └─────────────────────────────────────────────┘
4. Click Verify
5. Wait for propagation

Step 3: Create API Key
──────────────────────
1. API Keys → Create API Key
2. Name: "ShopPulse"
3. Permission: "Full access" or "Sending access"
4. Copy key
5. Store securely

Step 4: Test
────────────
Use playground in dashboard or API
```

### API Overview

```
Resend API
──────────

Endpoint: https://api.resend.com/emails

Method: POST

Headers:
- Authorization: Bearer re_xxx...
- Content-Type: application/json

Body:
{
  "from": "orders@mystore.com",
  "to": ["customer@example.com"],
  "subject": "Order Confirmed!",
  "html": "<h1>Order Confirmed!</h1>",
  "text": "Your order is confirmed"
}

Response:
{
  "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794"
}

Errors:
- 401: Invalid API key
- 403: Domain not verified
- 422: Validation error
```

---

## Email Deliverability Fundamentals

### Why Emails Go to Spam

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SPAM FILTER FACTORS                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   AUTHENTICATION (40%)                                              │
│   ────────────────────                                              │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ ❌ No SPF record        → Spam                              │   │
│   │ ❌ No DKIM signature    → Spam                              │   │
│   │ ❌ DMARC fail           → Spam or rejected                  │   │
│   │ ✓ All pass              → Likely inbox                      │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   REPUTATION (30%)                                                  │
│   ────────────────                                                  │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ • Domain age and history                                    │   │
│   │ • Previous spam complaints                                  │   │
│   │ • Bounce rate                                               │   │
│   │ • Sender IP reputation                                      │   │
│   │ • Engagement (opens, clicks)                                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   CONTENT (20%)                                                     │
│   ─────────────                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ ⚠️ Spam trigger words: "FREE", "ACT NOW", "GUARANTEED"     │   │
│   │ ⚠️ All caps: "ORDER CONFIRMED!!!"                          │   │
│   │ ⚠️ Excessive exclamation: "Great!!!"                       │   │
│   │ ⚠️ Image-only emails (no text)                             │   │
│   │ ⚠️ Broken HTML                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   RECIPIENT (10%)                                                   │
│   ───────────────                                                   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ • User marked previous as spam                              │   │
│   │ • User never opens your emails                              │   │
│   │ • Email provider filters (Gmail Promotions)                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### DNS Records Explained

#### SPF (Sender Policy Framework)

**What it does**: Tells receiving servers which IP addresses can send email for your domain

```
SPF Record Example:
───────────────────
Type: TXT
Name: @ (root domain)
Value: v=spf1 include:sendgrid.net ~all

Breakdown:
- v=spf1           → SPF version 1
- include:sendgrid.net → Allow SendGrid's servers
- ~all             → Soft fail others (or -all for hard fail)
```

#### DKIM (DomainKeys Identified Mail)

**What it does**: Cryptographically signs emails to prove they weren't modified

```
DKIM Record Example:
────────────────────
Type: TXT (or CNAME)
Name: s1._domainkey.yourdomain.com
Value: k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ...

How it works:
1. Provider signs email with private key
2. Public key in DNS
3. Receiver verifies signature
4. Match = legitimate, Mismatch = suspicious
```

#### DMARC (Domain-based Message Authentication)

**What it does**: Tells receivers what to do with failed SPF/DKIM emails

```
DMARC Record Example:
─────────────────────
Type: TXT
Name: _dmarc.yourdomain.com
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com

Breakdown:
- p=none       → Just report, don't act
- p=quarantine → Send to spam
- p=reject     → Block completely
- rua=         → Where to send reports
```

### Email Authentication Checklist

```
☐ SPF Record
  ├── Added to DNS
  ├── Includes provider (sendgrid.net/resend.com)
  └── Tested with online checker

☐ DKIM Record
  ├── Added all CNAME/TXT records from provider
  ├── Verified in provider dashboard
  └── Tested with email analyzer

☐ DMARC Record
  ├── Start with p=none (monitoring)
  ├── Review reports for 2 weeks
  └── Upgrade to p=quarantine/reject
```

---

## Template Design Principles

### E-commerce Email Best Practices

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ORDER CONFIRMATION EMAIL                          │
│                      (Best Practice Layout)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     [STORE LOGO]                             │   │
│   │                                                              │   │
│   │                  Order Confirmed! ✓                          │   │
│   │                                                              │   │
│   │   Thank you for your order, {customer_name}!                │   │
│   │                                                              │   │
│   │   ─────────────────────────────────────────────────────────  │   │
│   │                                                              │   │
│   │   Order #: {order_id}                                       │   │
│   │   Date: {order_date}                                        │   │
│   │                                                              │   │
│   │   ─────────────────────────────────────────────────────────  │   │
│   │                                                              │   │
│   │   Items:                                                     │   │
│   │   ┌───────────────────────────────────────────────────────┐ │   │
│   │   │ [IMG] Product Name          Qty: 1    ₹999           │ │   │
│   │   │ [IMG] Product Name          Qty: 2    ₹1998          │ │   │
│   │   └───────────────────────────────────────────────────────┘ │   │
│   │                                                              │   │
│   │   Subtotal:                              ₹2997              │   │
│   │   Shipping:                              Free               │   │
│   │   Total:                                 ₹2997              │   │
│   │                                                              │   │
│   │   ─────────────────────────────────────────────────────────  │   │
│   │                                                              │   │
│   │   Shipping to:                                              │   │
│   │   {customer_name}                                           │   │
│   │   {address}                                                  │   │
│   │   {city}, {state} - {pincode}                              │   │
│   │                                                              │   │
│   │   ─────────────────────────────────────────────────────────  │   │
│   │                                                              │   │
│   │            [TRACK ORDER BUTTON]                             │   │
│   │                                                              │   │
│   │   ─────────────────────────────────────────────────────────  │   │
│   │                                                              │   │
│   │   Questions? Reply to this email or contact us at           │   │
│   │   support@store.com                                         │   │
│   │                                                              │   │
│   │   ─────────────────────────────────────────────────────────  │   │
│   │   [Instagram] [Facebook] [Twitter]                         │   │
│   │   © 2024 Store Name. All rights reserved.                  │   │
│   │   {unsubscribe_link - only for marketing}                  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Template Variables

```
Common Variables for ShopPulse:
───────────────────────────────

Order Data:
- {order_id}         → "ORD-123456"
- {order_date}       → "January 1, 2024"
- {order_total}      → "₹2,997"
- {subtotal}         → "₹2,997"
- {shipping_cost}    → "Free" or "₹99"
- {tax}              → "₹0"

Customer Data:
- {customer_name}    → "John Doe"
- {customer_email}   → "john@example.com"
- {customer_phone}   → "+91 98765 43210"

Shipping Data:
- {address_line1}    → "123 Main St"
- {city}             → "Mumbai"
- {state}            → "Maharashtra"
- {pincode}          → "400001"
- {tracking_url}     → "https://track.courier.com/xxx"
- {tracking_number}  → "AWB123456"

Store Data:
- {store_name}       → "My Store"
- {store_logo}       → "https://..."
- {store_email}      → "support@store.com"
- {store_phone}      → "+91 98765 00000"
```

### Email Types for ShopPulse

| Type | Trigger | Priority |
|------|---------|----------|
| Order Confirmation | Payment success | High |
| Order Shipped | Status → SHIPPED | High |
| Order Delivered | Status → DELIVERED | Medium |
| Order Cancelled | Status → CANCELLED | High |
| Payment Failed | Webhook: payment.failed | High |
| Low Stock Alert | Stock < threshold | Medium |
| Password Reset | User request | High |

---

## Implementation Strategy

### Email Service Architecture

```
src/lib/
├── email-service.ts           # Main entry point
├── email-providers/
│   ├── sendgrid.ts           # SendGrid implementation
│   ├── resend.ts             # Resend implementation
│   └── types.ts              # Shared interfaces
└── email-templates/
    ├── order-confirmation.ts  # Template + variables
    ├── order-shipped.ts
    └── base-layout.ts        # Shared HTML wrapper
```

### Service Interface Design

```
EmailProvider Interface:
────────────────────────
+ sendEmail(options: SendEmailOptions): Promise<SendResult>
+ validateCredentials(): Promise<boolean>

SendEmailOptions:
────────────────
{
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  attachments?: Attachment[]
}

SendResult:
───────────
{
  success: boolean
  messageId?: string
  error?: string
}
```

### Integration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EMAIL DISPATCH FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   TRIGGER (e.g., Order Created)                                     │
│   │                                                                  │
│   ▼                                                                  │
│   emailService.sendOrderConfirmation(storeId, orderId)              │
│   │                                                                  │
│   ├── Get store's email credentials                                 │
│   │   └── integrationService.getCredentials(storeId, 'EMAIL_SERVICE')│
│   │                                                                  │
│   ├── Get order data                                                │
│   │   └── prisma.order.findUnique(...)                             │
│   │                                                                  │
│   ├── Build email from template                                     │
│   │   └── orderConfirmationTemplate.render(orderData)              │
│   │                                                                  │
│   ├── Determine provider                                            │
│   │   └── if (provider === 'sendgrid') { ... }                     │
│   │                                                                  │
│   └── Send email                                                    │
│       └── provider.sendEmail({ to, subject, html })                │
│                                                                      │
│   RESPONSE                                                          │
│   ├── Log result (success/failure)                                  │
│   └── Don't block main flow on email failure                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Credentials Mapping

```
ShopPulse Integration Fields → Provider Config
──────────────────────────────────────────────

SendGrid:
├── api_key      → Authorization: Bearer ${api_key}
├── from_email   → from.email
└── from_name    → from.name (optional)

Resend:
├── api_key      → Authorization: Bearer ${api_key}
├── from_email   → from (required, must match verified domain)
└── from_name    → Embedded in from: "Name <email>"
```

---

## Provider Comparison

### Feature Matrix

| Feature | SendGrid | Resend |
|---------|----------|--------|
| Free Tier | 100/day | 3000/month |
| API Style | REST | REST |
| SDK Quality | Good | Excellent |
| Documentation | Good | Excellent |
| Setup Time | 30-60 min | 10-20 min |
| Domain Auth | Required | Required |
| Templates | Built-in editor | React Email |
| Webhooks | Yes | Yes |
| Analytics | Detailed | Basic |
| Deliverability | Excellent | Good |

### When to Choose SendGrid

| Scenario | Why |
|----------|-----|
| High volume (100K+/month) | Better infrastructure |
| Need template editor | Built-in visual builder |
| Enterprise requirements | SOC2, dedicated IPs |
| Detailed analytics | Engagement tracking |
| Existing Twilio use | Same ecosystem |

### When to Choose Resend

| Scenario | Why |
|----------|-----|
| Developer-first | Best DX |
| React stack | React Email integration |
| Quick setup | Fastest to production |
| Modern API | Cleaner interface |
| Small-medium volume | Generous free tier |

### Recommendation for ShopPulse

```
MVP / Early Stage:
──────────────────
→ Start with Resend
  • Faster setup
  • Better free tier (3000 vs 100/day)
  • Cleaner code

Growing / Production:
────────────────────
→ Support both, let store owner choose
  • SendGrid for enterprise stores
  • Resend for developer-friendly stores

High Volume:
────────────
→ Consider AWS SES
  • Cheapest at scale
  • More complex setup
```

---

## Best Practices

### 1. Email Delivery

| Practice | Why |
|----------|-----|
| Verify domain | Required for deliverability |
| Set up SPF/DKIM/DMARC | Prevent spam classification |
| Use consistent from address | Builds sender reputation |
| Monitor bounce rates | Clean list regularly |
| Don't send to invalid emails | Protect reputation |

### 2. Error Handling

```
Email Failure Strategy:
───────────────────────

1. Log the failure (don't throw)
2. Don't block the main flow (order should still complete)
3. Retry once for network errors
4. Alert admin for persistent failures
5. Queue for retry if critical

Example:
try {
  await emailService.sendOrderConfirmation(...)
} catch (error) {
  console.error('Email failed:', error)
  // Don't throw - order is still valid
  // Queue for retry or alert admin
}
```

### 3. Template Management

| Practice | Why |
|----------|-----|
| Use text + HTML | Fallback for text-only clients |
| Test across clients | Gmail, Outlook, Apple Mail |
| Keep HTML simple | Complex styles break |
| Inline CSS | External stylesheets don't work |
| Mobile-responsive | 60%+ open on mobile |

### 4. Security

| Practice | Implementation |
|----------|----------------|
| Never expose API key | Server-side only |
| Use environment variables | Not hardcoded |
| Encrypt stored credentials | ✅ Already done |
| Rate limit sends | Prevent abuse |
| Validate email addresses | Before sending |

### 5. Testing

```
Email Testing Checklist:
────────────────────────

☐ Send to personal email
☐ Check spam folder
☐ Verify "from" address shows correctly
☐ Click all links
☐ View on mobile
☐ View in dark mode
☐ Check with email disabled (should not error)
☐ Test with invalid email (should handle gracefully)
```

---

## Quick Reference Card

### SendGrid

| Item | Value |
|------|-------|
| API Endpoint | `https://api.sendgrid.com/v3/mail/send` |
| Auth Header | `Authorization: Bearer SG.xxx...` |
| Method | POST |
| Free Tier | 100 emails/day |

### Resend

| Item | Value |
|------|-------|
| API Endpoint | `https://api.resend.com/emails` |
| Auth Header | `Authorization: Bearer re_xxx...` |
| Method | POST |
| Free Tier | 3000 emails/month |

### DNS Records Needed

| Record | Purpose |
|--------|---------|
| SPF (TXT) | Authorize provider IPs |
| DKIM (CNAME/TXT) | Sign emails |
| DMARC (TXT) | Policy for failures |

---

## Next Steps

1. **Read**: [Part 6: Implementation Checklist](./6_IMPLEMENTATION_CHECKLIST.md)
2. **Choose provider**: SendGrid (enterprise) or Resend (modern)
3. **Set up domain**: Add DNS records first
4. **Test delivery**: Send to personal email
5. **Build templates**: Start with order confirmation

---

*Previous: [Part 4: Fast2SMS Guide](./4_SMS_FAST2SMS_IMPLEMENTATION_GUIDE.md)*
*Next: [Part 6: Implementation Checklist](./6_IMPLEMENTATION_CHECKLIST.md)*
