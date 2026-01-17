# Part 3: MSG91 SMS Integration Guide

## Table of Contents
1. [About MSG91](#about-msg91)
2. [Why Choose MSG91](#why-choose-msg91)
3. [India SMS Regulations (DLT)](#india-sms-regulations-dlt)
4. [MSG91 Account Structure](#msg91-account-structure)
5. [Pricing Model](#pricing-model)
6. [Key Concepts](#key-concepts)
7. [Credentials Explained](#credentials-explained)
8. [API Types & Routes](#api-types--routes)
9. [Implementation Strategy](#implementation-strategy)
10. [Best Practices](#best-practices)

---

## About MSG91

### What is MSG91?
MSG91 is an **India-focused cloud communications platform** that provides:
- Transactional SMS (order confirmations, OTPs)
- Promotional SMS (marketing campaigns)
- OTP verification service
- Email services
- WhatsApp Business API
- Voice calls

### Company Background
| Aspect | Details |
|--------|---------|
| Founded | 2012 |
| Headquarters | Jaipur, India |
| Specialization | Indian market SMS |
| SMS/Month | 1+ billion |
| Enterprise Clients | 30,000+ businesses |
| DLT Compliant | Yes (mandatory for India) |

### Market Position
MSG91 is the **leading SMS provider for Indian businesses**:
- OLX, Swiggy, Zerodha, Paytm (rumored users)
- Strong focus on Indian compliance (DLT)
- Competitive pricing for India routes
- Good API documentation

---

## Why Choose MSG91

### Pros ✅

| Advantage | Explanation |
|-----------|-------------|
| **India Pricing** | Significantly cheaper than Twilio for India |
| **DLT Integration** | Built-in support for Indian regulations |
| **OTP Service** | Pre-built OTP verification flow |
| **INR Billing** | No currency conversion fees |
| **Regional Support** | Hindi support, India timezone |
| **Template Management** | UI for DLT template management |
| **Delivery Reports** | Real-time callbacks |
| **Flow Builder** | Visual workflow automation |

### Cons ❌

| Disadvantage | Impact |
|--------------|--------|
| **India-centric** | Limited international routes |
| **DLT Complexity** | Requires understanding Indian regulations |
| **Documentation** | Less polished than Twilio |
| **SDK Quality** | Official SDK is basic |
| **International** | Expensive for non-India destinations |

### Best For
- Stores targeting **Indian customers only**
- Businesses needing **OTP verification**
- Cost-conscious **Indian startups**
- Companies already **DLT registered**

### Not Ideal For
- International customer base
- Stores outside India
- Businesses avoiding DLT complexity

---

## India SMS Regulations (DLT)

### What is DLT?

**Distributed Ledger Technology** - TRAI's mandatory registration system for business SMS in India (effective since 2021).

### Why DLT Exists

| Problem Before | DLT Solution |
|----------------|--------------|
| Spam SMS flood | Registered senders only |
| Unclear sender identity | Verified businesses |
| Fraudulent messages | Pre-approved templates |
| No accountability | Full audit trail |

### DLT Registration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DLT REGISTRATION PROCESS                          │
│                   (For Indian Business SMS)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   STEP 1: ENTITY REGISTRATION (Business)                            │
│   ──────────────────────────────────────                            │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ Register on any DLT platform:                                │   │
│   │ - Jio TrueConnect                                           │   │
│   │ - Airtel                                                    │   │
│   │ - Vi (Vodafone-Idea)                                        │   │
│   │ - BSNL                                                       │   │
│   │                                                              │   │
│   │ Required Documents:                                          │   │
│   │ - PAN Card                                                   │   │
│   │ - GST Certificate (or exemption letter)                     │   │
│   │ - Letter of Authorization                                    │   │
│   │ - Business proof (incorporation cert, etc.)                 │   │
│   │                                                              │   │
│   │ Output: Principal Entity ID (PEID)                          │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              │ 2-7 days approval                     │
│                              ▼                                       │
│   STEP 2: HEADER (SENDER ID) REGISTRATION                           │
│   ─────────────────────────────────────────                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ Register your Sender ID (6 characters)                       │   │
│   │                                                              │   │
│   │ Examples:                                                    │   │
│   │ - MYSHOP (for "My Shop")                                    │   │
│   │ - STRALR (for "Store Alerts")                               │   │
│   │ - ORDUPD (for "Order Updates")                              │   │
│   │                                                              │   │
│   │ Rules:                                                       │   │
│   │ - Exactly 6 characters (A-Z only)                           │   │
│   │ - Must represent business name/purpose                      │   │
│   │ - No special characters or numbers                          │   │
│   │                                                              │   │
│   │ Output: Header ID                                            │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              │ 1-3 days approval                     │
│                              ▼                                       │
│   STEP 3: TEMPLATE REGISTRATION                                      │
│   ────────────────────────────                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ Register each message template                               │   │
│   │                                                              │   │
│   │ Template Types:                                              │   │
│   │ ┌─────────────────────────────────────────────────────────┐ │   │
│   │ │ TRANSACTIONAL (OTP, Alerts, Confirmations)              │ │   │
│   │ │ - No time restriction                                   │ │   │
│   │ │ - No DND check                                          │ │   │
│   │ │ - For existing customers                                │ │   │
│   │ └─────────────────────────────────────────────────────────┘ │   │
│   │ ┌─────────────────────────────────────────────────────────┐ │   │
│   │ │ PROMOTIONAL (Marketing, Offers)                         │ │   │
│   │ │ - 9 AM to 9 PM only                                     │ │   │
│   │ │ - DND numbers blocked                                   │ │   │
│   │ │ - For anyone                                            │ │   │
│   │ └─────────────────────────────────────────────────────────┘ │   │
│   │ ┌─────────────────────────────────────────────────────────┐ │   │
│   │ │ SERVICE IMPLICIT (Service updates to opted-in users)    │ │   │
│   │ │ - Moderate restrictions                                 │ │   │
│   │ └─────────────────────────────────────────────────────────┘ │   │
│   │                                                              │   │
│   │ Template Example:                                            │   │
│   │ "Your order {#var#} is confirmed. Total: Rs.{#var#}"        │   │
│   │                                                              │   │
│   │ Output: Template ID (e.g., 1234567890123456789)             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              │ 1-2 days approval                     │
│                              ▼                                       │
│   STEP 4: LINK TO MSG91                                             │
│   ────────────────────                                              │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ Add DLT details to MSG91 account:                            │   │
│   │ - Entity ID (PEID)                                          │   │
│   │ - Sender IDs (Headers)                                      │   │
│   │ - Template IDs                                               │   │
│   │                                                              │   │
│   │ MSG91 maps these for automatic compliance                    │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   ⚠️ Without DLT registration, SMS WILL NOT BE DELIVERED in India! │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### DLT Template Variables

Templates use placeholders that get replaced:

```
Template Structure:
──────────────────
"Your order {#var#} is confirmed. Amount: Rs.{#var#}. Track at {#var#}"

Rules:
- {#var#} = Variable placeholder
- Variables are positional (1st, 2nd, 3rd)
- Exact match required (spaces, punctuation)
- Can't add/remove words from approved template
```

### Common DLT Pitfalls

| Mistake | Result | Prevention |
|---------|--------|------------|
| Wrong template ID | Message blocked | Double-check ID |
| Extra spaces | Template mismatch | Copy exactly |
| Wrong sender ID | Delivery failure | Use registered header |
| Missing DLT entity | Account blocked | Register first |
| Promotional to DND | Not delivered | Use transactional for alerts |

---

## MSG91 Account Structure

### Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MSG91 ACCOUNT                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │                    AUTH KEY                                   │  │
│   │             (Main API authentication)                         │  │
│   │         5f3e4d3c5e6f7a8b9c0d1e2f3a4b5c6d                     │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              │                                       │
│   ┌──────────────┬───────────┴───────────┬──────────────────────┐   │
│   │              │                       │                      │   │
│   ▼              ▼                       ▼                      ▼   │
│ ┌────────┐  ┌────────────┐        ┌────────────┐         ┌────────┐│
│ │SENDER  │  │TEMPLATES   │        │ROUTES      │         │DLT     ││
│ │IDS     │  │            │        │            │         │CONFIG  ││
│ │        │  │            │        │            │         │        ││
│ │MYSHOP  │  │OTP: 123... │        │Promotional │         │PEID    ││
│ │ORDUPD  │  │Order: 456. │        │Transaction │         │Headers ││
│ └────────┘  └────────────┘        └────────────┘         └────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Purpose | ShopPulse Config |
|-----------|---------|------------------|
| **Auth Key** | API authentication | Required field |
| **Sender ID** | 6-char identifier shown to recipient | Required field |
| **Template ID** | Pre-approved message format | Optional (for DLT) |
| **Route** | Delivery channel (promotional/transactional) | Via config |
| **DLT Entity ID** | Business registration | Via MSG91 dashboard |

---

## Pricing Model

### SMS Pricing (India)

MSG91 uses **credit-based system**:

| Route | Price per SMS | Notes |
|-------|---------------|-------|
| Transactional | ₹0.14-0.18 | No DND restriction |
| OTP | ₹0.14-0.16 | Priority delivery |
| Promotional | ₹0.12-0.15 | DND restricted, timing limits |

### Credit Packages

| Package | Price | Per SMS Cost |
|---------|-------|--------------|
| 10,000 credits | ₹1,600 | ₹0.16 |
| 50,000 credits | ₹7,500 | ₹0.15 |
| 100,000 credits | ₹14,000 | ₹0.14 |
| 500,000 credits | ₹65,000 | ₹0.13 |

### Cost Comparison: MSG91 vs Twilio for India

| Provider | 1000 SMS to India | Monthly |
|----------|-------------------|---------|
| MSG91 | ₹140-180 (~$1.70) | - |
| Twilio | $40 (~₹3,300) | +Phone number |

**Winner for India**: MSG91 (20x cheaper)

### Free Trial
- 5,000 free SMS on signup
- No credit card required
- Full API access
- Test mode available

---

## Key Concepts

### 1. Route Types

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MSG91 ROUTE TYPES                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   TRANSACTIONAL (Route 4)                                           │
│   ────────────────────────                                          │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ • Time: 24/7 delivery                                        │   │
│   │ • DND: Delivered to DND numbers                             │   │
│   │ • Use: OTPs, order updates, alerts                          │   │
│   │ • Sender: 6-char alphabetic                                 │   │
│   │ • Template: DLT approved transactional                      │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   PROMOTIONAL (Route 1)                                             │
│   ─────────────────────                                             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ • Time: 9 AM - 9 PM only                                    │   │
│   │ • DND: NOT delivered to DND numbers                         │   │
│   │ • Use: Marketing, offers, promotions                        │   │
│   │ • Sender: 6-digit numeric (random by carrier)               │   │
│   │ • Template: DLT approved promotional                        │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   OTP (Specialized)                                                  │
│   ─────────────────                                                 │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ • Priority delivery (faster)                                 │   │
│   │ • Auto-retry on failure                                      │   │
│   │ • Built-in verification flow                                 │   │
│   │ • Use: Login, verification                                   │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   For ShopPulse: Use TRANSACTIONAL for all order notifications      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Message Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MSG91 MESSAGE FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Your Server                    MSG91                  Carriers     │
│   ───────────                    ──────                 ────────     │
│                                                                      │
│   ┌─────────┐     API Call      ┌─────────┐           ┌─────────┐  │
│   │ ShopPulse│──────────────────▶│ MSG91   │           │ Jio     │  │
│   │ Server  │                    │ Gateway │──────────▶│ Airtel  │  │
│   └─────────┘                    └─────────┘           │ Vi      │  │
│        │                              │                └─────────┘  │
│        │     Response (request_id)    │                     │       │
│        │◀─────────────────────────────│                     │       │
│        │                              │                     ▼       │
│        │                              │              ┌─────────┐   │
│        │                              │              │ Customer│   │
│        │                              │              │ Phone   │   │
│        │     Delivery Callback        │              └─────────┘   │
│        │◀─────────────────────────────│                            │
│        │  (delivered/failed/etc.)     │                            │
│                                                                      │
│   Typical Flow Time:                                                │
│   - OTP: 2-5 seconds                                                │
│   - Transactional: 5-30 seconds                                     │
│   - Promotional: 1-10 minutes                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. API Response Format

```
Success Response:
─────────────────
{
  "type": "success",
  "message": "Message sent successfully",
  "request_id": "3463726487252xxxx"
}

Error Response:
───────────────
{
  "type": "error",
  "message": "Invalid authkey",
  "code": "401"
}
```

### 4. Delivery Status Codes

| Code | Status | Meaning |
|------|--------|---------|
| 1 | Delivered | Successfully delivered |
| 2 | Failed | Delivery failed |
| 3 | Pending | In queue |
| 7 | NDNC/DND | Number is DND registered |
| 9 | Submitted | Submitted to carrier |
| 25 | Blocked | Number blocked |
| 26 | Auto-failed | Failed after retries |

---

## Credentials Explained

### What Store Owners Need

| Credential | Where to Find | Format | Required |
|------------|---------------|--------|----------|
| **Auth Key** | Dashboard → API Keys | 32-char alphanum | Yes |
| **Sender ID** | Dashboard → Sender IDs | 6 uppercase letters | Yes |
| **Template ID** | Dashboard → DLT Templates | 19-digit number | For DLT |

### Finding Credentials

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MSG91 DASHBOARD                                  │
│                   control.msg91.com                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Navigate: Settings → API Integration                              │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  API Key                                                     │   │
│   │  ─────────────────────────────────────────────────────────  │   │
│   │                                                              │   │
│   │  Auth Key: 5f3e4d3c5e6f7a8b9c0d1e2f3a4b5c6d7e8f  [Copy]     │   │
│   │                                                              │   │
│   │  ⚠️ Keep this secret - regenerate if compromised            │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Navigate: SMS → Sender IDs                                        │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Sender IDs                                                  │   │
│   │  ─────────────────────────────────────────────────────────  │   │
│   │                                                              │   │
│   │  MYSHOP │ Approved │ Transactional │  [Copy]                │   │
│   │  STRALR │ Pending  │ Transactional │                        │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Navigate: DLT → Templates                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  DLT Templates                                               │   │
│   │  ─────────────────────────────────────────────────────────  │   │
│   │                                                              │   │
│   │  Template ID: 1234567890123456789                           │   │
│   │  Content: "Your order {#var#} confirmed. Total Rs.{#var#}" │   │
│   │  Type: Transactional                                        │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Types & Routes

### 1. Send SMS API (Basic)

**Endpoint**: `https://control.msg91.com/api/v5/flow/`

**Method**: POST

**Headers**:
- `authkey`: Your auth key
- `Content-Type`: application/json

**Use Case**: Quick single SMS

### 2. Flow API (Recommended)

**Endpoint**: `https://control.msg91.com/api/v5/flow/`

**Why Flow API**:
- Pre-built flows for common use cases
- DLT template mapping built-in
- Better deliverability
- Analytics included

**Use Case**: Production messaging with templates

### 3. OTP API (Specialized)

**Endpoints**:
- Send: `https://control.msg91.com/api/v5/otp`
- Verify: `https://control.msg91.com/api/v5/otp/verify`
- Resend: `https://control.msg91.com/api/v5/otp/retry`

**Use Case**: User verification flows

### API Selection for ShopPulse

| Use Case | Recommended API |
|----------|-----------------|
| Order Confirmation | Flow API |
| Status Update | Flow API |
| OTP Verification | OTP API |
| Marketing SMS | Flow API (promotional) |

---

## Implementation Strategy

### MSG91 Provider Design

```
src/lib/sms-providers/msg91.ts
──────────────────────────────

Class: MSG91Provider

Constructor:
- authKey: string
- senderId: string
- templateId?: string

Methods:

sendMessage(phone, variables)
├── Build Flow API request
├── Replace template variables
├── POST to MSG91
└── Return standardized result

sendOTP(phone)
├── Call OTP API
├── Store OTP internally (MSG91 handles)
└── Return request ID

verifyOTP(phone, otp)
├── Call Verify API
├── Return success/failure
└── Handle retry logic

validateCredentials()
├── Make test API call
├── Check response
└── Return boolean
```

### Template Variable Mapping

```
Order Confirmation Template:
────────────────────────────
DLT Template: "Your order {#var#} is confirmed. Total: Rs.{#var#}. Track: {#var#}"

Code maps:
{
  orderId: "ORD-123",     → {#var#} [1]
  total: "999",           → {#var#} [2]
  trackingUrl: "bit.ly/x" → {#var#} [3]
}

Final Message: "Your order ORD-123 is confirmed. Total: Rs.999. Track: bit.ly/x"
```

### Integration Point in ShopPulse

```
Order Flow Integration:
───────────────────────

checkout/verify/route.ts (after payment success)
│
├── Get store's SMS integration
│   └── integrationService.getCredentials(storeId, 'SMS_PROVIDER')
│
├── Check if provider is MSG91
│   └── if (provider === 'msg91') { ... }
│
├── Build message data
│   └── { orderId, total, trackingUrl }
│
├── Call MSG91 provider
│   └── msg91.sendMessage(phone, variables)
│
└── Log result (don't block checkout on SMS failure)
```

---

## Best Practices

### 1. DLT Compliance

| Practice | Why |
|----------|-----|
| Register templates before coding | Avoid wasted dev time |
| Use exact template text | Even small changes fail |
| Test with real DLT IDs | Test mode doesn't validate DLT |
| Keep template list documented | Easy reference |

### 2. Phone Number Handling

| Input | How to Handle |
|-------|---------------|
| 9876543210 | Add 91 prefix → 919876543210 |
| +919876543210 | Strip + → 919876543210 |
| 09876543210 | Strip 0, add 91 → 919876543210 |

```
Normalization:
phone = phone.replace(/^\+/, '');     // Remove +
phone = phone.replace(/^0/, '');      // Remove leading 0
if (!phone.startsWith('91')) {
  phone = '91' + phone;
}
```

### 3. Error Handling

| Error | Action |
|-------|--------|
| Invalid authkey | Show "Check MSG91 credentials" |
| DND number | Log, don't retry (promotional) |
| Template mismatch | Alert admin, check DLT |
| Insufficient balance | Email admin, show warning |
| Network timeout | Retry once, then queue |

### 4. Cost Optimization

| Strategy | Savings |
|----------|---------|
| Bulk packages | ~30% cheaper |
| Short messages | Avoid multi-part SMS |
| Transactional route | Better delivery, worth cost |
| Avoid promotional for orders | Delivery issues |

### 5. Monitoring

| Metric | How to Track |
|--------|--------------|
| Delivery rate | MSG91 dashboard reports |
| Failed messages | Store in DB, review weekly |
| Credit balance | MSG91 API, alert when low |
| Template usage | Track which templates used most |

---

## MSG91 vs Fast2SMS Quick Comparison

| Factor | MSG91 | Fast2SMS |
|--------|-------|----------|
| Pricing | ₹0.14-0.18 | ₹0.10-0.15 |
| Reliability | Higher | Medium |
| DLT Support | Excellent | Good |
| API Quality | Good | Basic |
| OTP Service | Yes (built-in) | Manual |
| Documentation | Better | Basic |
| Best For | Serious production | Budget/testing |

---

## Quick Reference Card

### MSG91 Credentials for ShopPulse

| Field | Format | Example |
|-------|--------|---------|
| Auth Key | 32 alphanumeric | `5f3e4d3c5e6f7a8b9c0d1e2f3a4b5c6d7e8f` |
| Sender ID | 6 uppercase letters | `MYSHOP` |
| Template ID | 19 digits | `1234567890123456789` |

### API Endpoints

| Purpose | Endpoint |
|---------|----------|
| Send SMS (Flow) | `POST https://control.msg91.com/api/v5/flow/` |
| Send OTP | `POST https://control.msg91.com/api/v5/otp` |
| Verify OTP | `POST https://control.msg91.com/api/v5/otp/verify` |
| Check Balance | `GET https://control.msg91.com/api/balance.php` |

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 401 | Invalid authkey | Check credentials |
| 101 | Missing parameters | Check request body |
| 102 | Invalid phone | Validate number format |
| 207 | Insufficient balance | Top up account |
| 302 | Template not found | Check template ID |

---

## Next Steps

1. **Read**: [Part 4: Fast2SMS Guide](./4_SMS_FAST2SMS_IMPLEMENTATION_GUIDE.md)
2. **If India-only**: MSG91 is recommended
3. **Register DLT**: Start process immediately (takes days)
4. **Create templates**: Plan message content first

---

*Previous: [Part 2: Twilio SMS Guide](./2_SMS_TWILIO_IMPLEMENTATION_GUIDE.md)*
*Next: [Part 4: Fast2SMS Guide](./4_SMS_FAST2SMS_IMPLEMENTATION_GUIDE.md)*
