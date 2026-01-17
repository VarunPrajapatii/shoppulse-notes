# Part 2: Twilio SMS Integration Guide

## Table of Contents
1. [About Twilio](#about-twilio)
2. [Why Choose Twilio](#why-choose-twilio)
3. [Twilio Account Structure](#twilio-account-structure)
4. [Pricing Model](#pricing-model)
5. [Key Concepts](#key-concepts)
6. [Credentials Explained](#credentials-explained)
7. [Implementation Strategy](#implementation-strategy)
8. [Code Architecture](#code-architecture)
9. [Common Pitfalls](#common-pitfalls)
10. [Best Practices](#best-practices)

---

## About Twilio

### What is Twilio?
Twilio is a **cloud communications platform** that provides APIs for:
- SMS messaging (primary use case for ShopPulse)
- Voice calls
- WhatsApp Business messaging
- Video conferencing
- Email (via SendGrid, which Twilio owns)

### Company Background
| Aspect | Details |
|--------|---------|
| Founded | 2008 |
| Headquarters | San Francisco, USA |
| IPO | 2016 (NYSE: TWLO) |
| Developers Using | 10+ million |
| Messages/Year | 100+ billion |
| Reliability | 99.95% uptime SLA |

### Market Position
Twilio is the **industry leader** for programmatic communications. It's the go-to choice for:
- Uber, Airbnb, Lyft (ride notifications)
- Netflix (verification codes)
- Stripe (payment alerts)
- Most tech startups globally

---

## Why Choose Twilio

### Pros ✅

| Advantage | Explanation |
|-----------|-------------|
| **Global Reach** | Works in 180+ countries without separate integrations |
| **Reliability** | Enterprise-grade infrastructure, 99.95% uptime |
| **Developer Experience** | Best-in-class SDKs, documentation |
| **Compliance Built-in** | Handles A2P 10DLC, TCPA automatically |
| **Delivery Tracking** | Real-time status callbacks |
| **WhatsApp Support** | Same API for SMS + WhatsApp |
| **Scalability** | Handles millions of messages |
| **Support** | 24/7 technical support |

### Cons ❌

| Disadvantage | Impact |
|--------------|--------|
| **Price** | More expensive than regional providers |
| **Complexity** | Overkill for India-only stores |
| **US-centric** | 10DLC process is mandatory for US |
| **Setup Time** | Account verification can take days |

### Best For
- Stores targeting **international customers**
- Businesses requiring **WhatsApp Business API**
- Companies needing **enterprise reliability**
- Stores in **US, UK, Europe, Australia**

### Not Ideal For
- India-only stores (MSG91/Fast2SMS cheaper)
- Very low volume (< 100 SMS/month)
- Budget-constrained startups

---

## Twilio Account Structure

### Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TWILIO ACCOUNT                               │
│                    (Organization Level)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │                    ACCOUNT SID                                │  │
│   │              (Unique identifier)                              │  │
│   │           AC1234567890abcdef1234567890abcdef                  │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              │                                       │
│   ┌──────────────┬───────────┴───────────┬──────────────────────┐   │
│   │              │                       │                      │   │
│   ▼              ▼                       ▼                      ▼   │
│ ┌────────┐  ┌────────┐            ┌────────────┐         ┌────────┐│
│ │AUTH    │  │PHONE   │            │MESSAGING   │         │API     ││
│ │TOKEN   │  │NUMBERS │            │SERVICES    │         │KEYS    ││
│ │        │  │        │            │            │         │        ││
│ │Secret  │  │+1...   │            │Sender Pool │         │Optional││
│ │Key     │  │+44...  │            │A2P Config  │         │SubAccts││
│ └────────┘  └────────┘            └────────────┘         └────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### What Each Component Does

| Component | Purpose | ShopPulse Usage |
|-----------|---------|-----------------|
| **Account SID** | Unique account identifier | Required credential |
| **Auth Token** | Secret key for API auth | Required credential |
| **Phone Numbers** | Numbers you send from | Required (one at least) |
| **Messaging Services** | Pools of numbers, compliance | Recommended |
| **API Keys** | Sub-credentials | Optional (better security) |

---

## Pricing Model

### SMS Pricing Structure

Twilio charges per **message segment**:
- 1 segment = 160 characters (GSM-7 encoding)
- 1 segment = 70 characters (Unicode/emoji)
- Long messages split into segments

### Price Examples (as of 2024)

| Country | Outbound SMS | Inbound SMS |
|---------|--------------|-------------|
| USA | $0.0079/segment | $0.0079/segment |
| UK | $0.0420/segment | $0.0075/segment |
| India | $0.0400/segment | $0.0075/segment |
| Canada | $0.0079/segment | $0.0079/segment |
| Australia | $0.0550/segment | $0.0075/segment |

### Phone Number Costs

| Number Type | Monthly Cost | Use Case |
|-------------|--------------|----------|
| US Local | $1.15/month | Domestic US messaging |
| US Toll-Free | $2.15/month | US + credibility |
| UK Mobile | $2.00/month | UK messaging |
| Short Code (US) | $1000/month | High volume, branding |

### Messaging Service Pricing
- **Free** to create messaging services
- Numbers in service share the pricing of their type

### Cost Calculation Example

```
Scenario: 1000 order confirmations/month in US

Messages: 1000
Avg segments per message: 1.2 (some longer)
Total segments: 1200

Cost breakdown:
- SMS: 1200 × $0.0079 = $9.48
- Phone number: $1.15/month
- Total: ~$10.63/month
```

### Trial Account
- $15 free credit
- Can only send to verified numbers
- "Sent from Twilio trial" prefix added
- Upgrade required for production

---

## Key Concepts

### 1. Message Segments

SMS has a character limit. Messages are split:

```
┌─────────────────────────────────────────────────────────────────────┐
│                       GSM-7 ENCODING                                 │
│                   (Standard characters)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Single Segment: Up to 160 characters                              │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │ Your order #12345 has been confirmed. Total: $99. Thank... │    │
│   └────────────────────────────────────────────────────────────┘    │
│   Cost: 1 segment                                                    │
│                                                                      │
│   Multi-Segment: 161+ characters                                     │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │ Part 1 (153 chars) ──────────────────────────────────────  │    │
│   ├────────────────────────────────────────────────────────────┤    │
│   │ Part 2 (153 chars) ──────────────────────────────────────  │    │
│   ├────────────────────────────────────────────────────────────┤    │
│   │ Part 3 (remaining) ─────────                               │    │
│   └────────────────────────────────────────────────────────────┘    │
│   Cost: 3 segments (each part has 7-char header for reassembly)     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       UCS-2 ENCODING                                 │
│                   (Unicode/Emoji characters)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   If message contains ANY non-GSM character (emoji, Hindi, etc.):   │
│   Single Segment: Up to 70 characters                               │
│   Multi-Segment: 67 characters per segment                          │
│                                                                      │
│   Example:                                                           │
│   "Your order 🎉 is confirmed!" = UCS-2 (because of 🎉)             │
│   30 chars = 1 segment                                               │
│                                                                      │
│   ⚠️ WARNING: One emoji can double/triple your SMS cost!            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Sender ID Types

| Type | Example | How it Appears | Best For |
|------|---------|----------------|----------|
| **Long Code** | +1 415 555 1234 | From: +14155551234 | P2P, low volume |
| **Short Code** | 12345 | From: 12345 | High volume, marketing |
| **Alphanumeric** | MYSTORE | From: MYSTORE | Branding (not US) |
| **Toll-Free** | +1 800 555 1234 | From: +18005551234 | US A2P messaging |

### 3. A2P 10DLC (US Compliance)

**What is it?**
Application-to-Person messaging on 10-Digit Long Codes. Required for US business messaging since 2023.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    10DLC REGISTRATION FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   STEP 1: Brand Registration                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ Register your business with The Campaign Registry (TCR)      │   │
│   │ - Business name, EIN, address                               │   │
│   │ - Takes 1-7 days for approval                               │   │
│   │ - One-time fee: $4                                          │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│   STEP 2: Campaign Registration                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ Register your use case                                       │   │
│   │ - "Transactional notifications"                             │   │
│   │ - Sample messages                                            │   │
│   │ - Monthly fee: $1.50-10 depending on use case               │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│   STEP 3: Link Phone Numbers                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ Associate your Twilio numbers with the campaign              │   │
│   │ - Can send immediately after approval                        │   │
│   │ - Throughput based on trust score                           │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   ⚠️ Without 10DLC registration, US messages may be blocked!       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Message Status Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MESSAGE STATUS FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   QUEUED ──▶ SENDING ──▶ SENT ──▶ DELIVERED                        │
│      │           │         │          │                              │
│      │           │         │          └──▶ ✅ Success                │
│      │           │         │                                         │
│      │           │         └──▶ UNDELIVERED (carrier rejected)      │
│      │           │                                                   │
│      │           └──▶ FAILED (Twilio couldn't send)                 │
│      │                                                               │
│      └──▶ CANCELED (you canceled before send)                       │
│                                                                      │
│   Status Callbacks:                                                  │
│   - Configure webhook URL in Twilio Console                         │
│   - Twilio POSTs status updates to your endpoint                    │
│   - Use to track delivery rates                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Credentials Explained

### What Store Owners Need to Provide

| Credential | Where to Find | Format | Security Level |
|------------|---------------|--------|----------------|
| **Account SID** | Console → Account Info | `AC` + 32 chars | Semi-public (identifies account) |
| **Auth Token** | Console → Account Info | 32 chars | SECRET (like password) |
| **Phone Number** | Console → Phone Numbers | `+` + country code + number | Public (visible to recipients) |

### Finding Credentials in Twilio Console

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TWILIO CONSOLE                                   │
│                  console.twilio.com                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Account Info (Dashboard)                                    │   │
│   │  ─────────────────────────────────────────────────────────  │   │
│   │                                                              │   │
│   │  Account SID:  AC1234567890abcdef1234567890abcdef  [Copy]   │   │
│   │                                                              │   │
│   │  Auth Token:   ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●   [Show]    │   │
│   │                (Click Show to reveal)                        │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Navigation: Phone Numbers → Manage → Active Numbers               │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Active Numbers                                              │   │
│   │  ─────────────────────────────────────────────────────────  │   │
│   │                                                              │   │
│   │  +1 415 555 1234  │ US │ SMS ✓ │ Voice ✓ │  [Configure]    │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Credential Validation

Before storing, validate credentials work:

```
Validation Flow:
1. Make test API call to Twilio
2. Request: GET /2010-04-01/Accounts/{AccountSid}.json
3. If 200 OK → Credentials valid
4. If 401 → Invalid credentials
5. Show appropriate message to user
```

---

## Implementation Strategy

### Where Twilio Fits in ShopPulse

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SHOPPULSE MESSAGE FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   TRIGGER POINTS                     SMS SERVICE                     │
│   ──────────────                     ───────────                     │
│                                                                      │
│   ┌────────────────┐                ┌──────────────────┐            │
│   │ Order Created  │───────────────▶│                  │            │
│   └────────────────┘                │                  │            │
│                                     │   smsService     │            │
│   ┌────────────────┐                │   .sendSMS()     │            │
│   │ Status Updated │───────────────▶│                  │            │
│   └────────────────┘                │  ┌────────────┐  │            │
│                                     │  │ Get Creds  │  │            │
│   ┌────────────────┐                │  └─────┬──────┘  │            │
│   │ Payment Failed │───────────────▶│        │         │            │
│   └────────────────┘                │        ▼         │            │
│                                     │  ┌────────────┐  │            │
│                                     │  │ Provider?  │  │            │
│                                     │  └─────┬──────┘  │            │
│                                     │        │         │            │
│                                     └────────┼─────────┘            │
│                                              │                       │
│                    ┌─────────────────────────┼─────────────────┐    │
│                    │                         │                 │    │
│                    ▼                         ▼                 ▼    │
│             ┌──────────┐            ┌──────────┐        ┌──────────┐│
│             │ TWILIO   │            │  MSG91   │        │ FAST2SMS ││
│             │ API      │            │  API     │        │ API      ││
│             └──────────┘            └──────────┘        └──────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Service Layer Design

```
src/lib/
├── sms-service.ts          # Main entry point
├── sms-providers/
│   ├── twilio.ts          # Twilio-specific logic
│   ├── msg91.ts           # MSG91-specific logic
│   └── fast2sms.ts        # Fast2SMS-specific logic
└── message-templates.ts    # Template management
```

### Interface Design (Conceptual)

```
SMSProvider Interface:
─────────────────────
+ sendMessage(to: string, body: string): Promise<SendResult>
+ validateCredentials(): Promise<boolean>
+ getBalance(): Promise<number | null>

SendResult:
─────────────────────
+ success: boolean
+ messageId: string | null
+ error: string | null
+ segments: number
+ cost: number | null
```

---

## Code Architecture

### Not Full Code - Just Structure

This guide focuses on **understanding**, not implementation. Here's what the structure looks like:

```
1. ENTRY POINT (sms-service.ts)
   │
   ├── sendOrderConfirmation(storeId, orderId, phone)
   │   │
   │   ├── Get store's SMS credentials
   │   ├── Get order details
   │   ├── Build message from template
   │   └── Call provider-specific sender
   │
   ├── sendStatusUpdate(storeId, orderId, phone, newStatus)
   │
   └── sendCustomMessage(storeId, phone, message)


2. PROVIDER LAYER (sms-providers/twilio.ts)
   │
   ├── Constructor
   │   └── Initialize with credentials
   │
   ├── sendMessage(to, body)
   │   │
   │   ├── Create Twilio client
   │   ├── Call messages.create()
   │   ├── Handle response
   │   └── Return standardized result
   │
   └── validateCredentials()
       └── Test API call


3. TEMPLATE LAYER (message-templates.ts)
   │
   ├── ORDER_CONFIRMATION
   │   └── "Your order #{orderId} is confirmed! Total: {total}"
   │
   ├── ORDER_SHIPPED
   │   └── "Order #{orderId} shipped! Track: {trackingUrl}"
   │
   └── replaceVariables(template, data)
       └── Replace {variable} with actual values
```

### API Route Structure (Conceptual)

```
/api/[storeId]/notifications/sms
├── POST - Send SMS
│   ├── Body: { phone, message } or { phone, template, data }
│   ├── Validate inputs
│   ├── Check store has SMS integration
│   ├── Call smsService
│   └── Return result
│
└── GET - Check SMS capability
    └── Return { enabled: true/false, provider: 'twilio' }
```

---

## Common Pitfalls

### 1. Auth Token Exposed

**Problem**: Accidentally logging or exposing auth token
**Impact**: Anyone can send SMS on your account
**Prevention**:
- Never log credentials
- Use environment variables
- Rotate if exposed

### 2. Wrong Phone Number Format

**Problem**: Sending to `9876543210` instead of `+919876543210`
**Impact**: Message fails or goes to wrong country
**Prevention**:
- Always use E.164 format (`+` + country code + number)
- Validate before sending
- Use libphonenumber for parsing

### 3. Character Encoding Issues

**Problem**: Message has emoji, becomes 3 segments instead of 1
**Impact**: 3x cost
**Prevention**:
- Warn users about emoji/unicode cost
- Calculate segments before sending
- Strip emoji in templates

### 4. US Messages Blocked

**Problem**: Didn't register 10DLC campaign
**Impact**: Messages filtered by carriers
**Prevention**:
- Register brand and campaign
- Use Toll-Free numbers as alternative
- Document requirement for US stores

### 5. Rate Limiting

**Problem**: Sending too fast, Twilio rejects
**Impact**: Messages fail
**Prevention**:
- Use Messaging Services (built-in queuing)
- Implement queue in your app
- Handle 429 errors gracefully

### 6. Hardcoded Test Credentials

**Problem**: Using test credentials in production
**Impact**: Messages fail in production
**Prevention**:
- Validate credential pattern (test vs live)
- Warn if test credentials in production mode

---

## Best Practices

### 1. Credential Security

| Practice | Implementation |
|----------|----------------|
| Encrypt at rest | ✅ Already done (AES-256) |
| Encrypt in transit | ✅ HTTPS only |
| Decrypt only when needed | ✅ Already done |
| Log access, not values | ⬜ Add audit logging |
| Rotate periodically | ⬜ Document for users |

### 2. Message Content

| Practice | Why |
|----------|-----|
| Keep under 160 chars | Single segment = lowest cost |
| Avoid emoji | Prevents UCS-2 encoding |
| Include opt-out | Legal requirement in many regions |
| Use templates | Consistency, easy updates |
| Test before production | Catch formatting issues |

### 3. Error Handling

| Scenario | Action |
|----------|--------|
| Invalid credentials | Show clear error, don't retry |
| Network timeout | Retry once, then queue |
| Rate limited (429) | Back off exponentially |
| Invalid phone | Return error, don't charge |
| Provider down | Fallback or queue |

### 4. Cost Optimization

| Strategy | Savings |
|----------|---------|
| Use Messaging Services | Better rates, compliance |
| Short messages | Fewer segments |
| Batch during off-peak | Some providers offer discounts |
| Monitor segment counts | Prevent surprise bills |

### 5. Deliverability

| Practice | Impact |
|----------|--------|
| Verified sender ID | Higher delivery rate |
| 10DLC registration (US) | Required for delivery |
| Consistent sending | Builds reputation |
| Handle STOP requests | Legal compliance |

---

## Quick Reference Card

### Twilio Credentials for ShopPulse

| Field | Format | Example |
|-------|--------|---------|
| Account SID | `AC` + 32 hex | `AC1234567890abcdef1234567890abcdef` |
| Auth Token | 32 hex | `your_auth_token_here` |
| Phone Number | E.164 | `+14155551234` |

### Status Codes

| HTTP | Meaning | Action |
|------|---------|--------|
| 201 | Created | Message queued |
| 400 | Bad request | Check inputs |
| 401 | Unauthorized | Check credentials |
| 404 | Not found | Check phone number format |
| 429 | Too many requests | Back off, retry later |
| 500 | Server error | Retry, contact support |

### Message Status

| Status | Meaning | Billable |
|--------|---------|----------|
| `queued` | In Twilio queue | Not yet |
| `sending` | Being sent | Not yet |
| `sent` | Sent to carrier | Yes |
| `delivered` | Confirmed delivery | Yes |
| `undelivered` | Carrier rejected | Maybe |
| `failed` | Twilio couldn't send | No |

### Cost Estimation Formula

```
Cost = (Number of segments × Per-segment rate) + Monthly phone number fee

Segments = ceil(characters / 160)  // GSM-7
Segments = ceil(characters / 70)   // Unicode
```

---

## Next Steps

1. **Read**: [Part 3: MSG91 Integration Guide](./3_SMS_MSG91_IMPLEMENTATION_GUIDE.md)
2. **Compare**: Twilio vs MSG91 for your use case
3. **Decide**: Which provider to implement first
4. **Implement**: Follow code architecture patterns

---

*Previous: [Part 1: Overview & Analysis](./1_INTEGRATIONS_OVERVIEW_AND_ANALYSIS.md)*
*Next: [Part 3: MSG91 SMS Guide](./3_SMS_MSG91_IMPLEMENTATION_GUIDE.md)*
