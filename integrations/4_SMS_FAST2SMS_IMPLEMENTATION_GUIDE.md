# Part 4: Fast2SMS Integration Guide

## Table of Contents
1. [About Fast2SMS](#about-fast2sms)
2. [Why Choose Fast2SMS](#why-choose-fast2sms)
3. [Account & Pricing](#account--pricing)
4. [API Types](#api-types)
5. [Credentials & Setup](#credentials--setup)
6. [Implementation Strategy](#implementation-strategy)
7. [Limitations & Workarounds](#limitations--workarounds)
8. [Best Practices](#best-practices)

---

## About Fast2SMS

### What is Fast2SMS?
Fast2SMS is a **budget-friendly Indian SMS gateway** that provides:
- Transactional SMS
- Promotional SMS
- Quick SMS (testing/development)
- Bulk SMS campaigns
- OTP services

### Company Background
| Aspect | Details |
|--------|---------|
| Founded | ~2016 |
| Headquarters | India |
| Specialization | Low-cost Indian SMS |
| Target Market | Startups, developers, small businesses |
| DLT Compliant | Yes |

### Market Position
Fast2SMS is the **budget option** for Indian SMS:
- Popular among developers for testing
- Very cheap per-SMS rates
- Basic but functional API
- No-frills approach

---

## Why Choose Fast2SMS

### Pros ✅

| Advantage | Explanation |
|-----------|-------------|
| **Cheapest Option** | ~₹0.10-0.12 per SMS |
| **Simple API** | Easy to integrate |
| **Free Testing** | Quick SMS for dev testing |
| **Instant Activation** | No approval wait |
| **Pay-as-you-go** | No minimum commitment |
| **Simple Dashboard** | Easy to navigate |

### Cons ❌

| Disadvantage | Impact |
|--------------|--------|
| **Basic Features** | No advanced flow builders |
| **Limited Documentation** | Less comprehensive |
| **Support** | Email only, slower response |
| **Delivery Rates** | Slightly lower than MSG91 |
| **No Built-in OTP** | Manual verification needed |
| **Less Reliable** | Occasional delays |

### Best For
- **Development and testing**
- **Very small businesses** (< 500 SMS/month)
- **Budget-constrained startups**
- **Non-critical notifications**
- **Promotional campaigns** (price-sensitive)

### Not Ideal For
- Mission-critical OTPs
- High-volume transactional SMS
- Enterprise requirements
- Premium deliverability needs

---

## Account & Pricing

### Pricing Tiers

Fast2SMS has multiple routes with different pricing:

| Route | Price per SMS | Use Case | DND |
|-------|---------------|----------|-----|
| Quick SMS | Free (limited) | Testing only | N/A |
| Promotional | ₹0.10-0.12 | Marketing | Blocked |
| Transactional | ₹0.12-0.15 | Order alerts | Delivered |
| OTP | ₹0.12-0.15 | Verification | Delivered |

### Wallet System

| Recharge | Effective Rate | Bonus |
|----------|----------------|-------|
| ₹500 | ~₹0.15 | None |
| ₹2,000 | ~₹0.13 | ~5% extra |
| ₹5,000 | ~₹0.12 | ~10% extra |
| ₹10,000 | ~₹0.10 | ~15% extra |

### Free Quick SMS

**What it is**: Testing route for developers

**Limitations**:
- Message prefix: "FSTSMS:"
- Limited to certain volumes
- Not for production
- May have delays

**Use case**: Development only

### Cost Comparison

| Scenario | Fast2SMS | MSG91 | Twilio |
|----------|----------|-------|--------|
| 1000 SMS (India) | ~₹120 | ~₹160 | ~₹3,300 |
| 5000 SMS (India) | ~₹550 | ~₹750 | ~₹16,500 |

---

## API Types

### 1. Quick SMS API (Testing)

**Purpose**: Free testing during development

```
Endpoint: https://www.fast2sms.com/dev/bulkV2
Method: POST
Route: "q" (quick)

Limitations:
- "FSTSMS:" prefix added
- Rate limited
- Not for production
```

### 2. Bulk SMS API (Production)

**Purpose**: Production transactional/promotional SMS

```
Endpoint: https://www.fast2sms.com/dev/bulkV2
Method: POST
Route: "dlt" (DLT transactional)

Required:
- DLT template ID
- Sender ID (DLT registered)
- Authorization header
```

### 3. OTP API

**Purpose**: Send OTP messages

```
Endpoint: https://www.fast2sms.com/dev/bulkV2
Method: POST
Route: "otp"

Note: Manual verification required
(No verify endpoint like MSG91)
```

### API Route Parameter

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FAST2SMS ROUTE TYPES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   route: "q"                                                        │
│   ──────────                                                        │
│   • Quick/Test SMS                                                  │
│   • Free (limited)                                                  │
│   • For development only                                            │
│   • Adds "FSTSMS:" prefix                                          │
│                                                                      │
│   route: "p"                                                        │
│   ──────────                                                        │
│   • Promotional                                                     │
│   • Cheapest paid option                                            │
│   • Blocked on DND numbers                                          │
│   • 9 AM - 9 PM only                                                │
│                                                                      │
│   route: "t"                                                        │
│   ──────────                                                        │
│   • Transactional (Legacy)                                          │
│   • Pre-DLT route                                                   │
│   • May not work for new accounts                                   │
│                                                                      │
│   route: "dlt"                                                      │
│   ────────────                                                      │
│   • DLT Transactional (Recommended)                                 │
│   • Requires DLT template ID                                        │
│   • 24/7 delivery                                                   │
│   • Delivered to DND numbers                                        │
│                                                                      │
│   route: "otp"                                                      │
│   ───────────                                                       │
│   • OTP route                                                       │
│   • Priority delivery                                               │
│   • Use for verification codes                                      │
│                                                                      │
│   For ShopPulse: Use "dlt" for production order notifications       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Credentials & Setup

### What Store Owners Need

| Credential | Where to Find | Format |
|------------|---------------|--------|
| **API Key** | Dashboard → Dev API | Long alphanumeric string |
| **Sender ID** | Dashboard → Sender ID | 6 uppercase letters |
| **DLT Template ID** | Dashboard → DLT Templates | 19-digit number |

### Finding API Key

```
┌─────────────────────────────────────────────────────────────────────┐
│                   FAST2SMS DASHBOARD                                 │
│                 www.fast2sms.com/dashboard                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Navigate: Dev API (sidebar)                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Your API Authorization Key                                  │   │
│   │  ─────────────────────────────────────────────────────────  │   │
│   │                                                              │   │
│   │  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  [Copy]  │   │
│   │                                                              │   │
│   │  ⚠️ This key is secret. Don't share publicly.               │   │
│   │                                                              │   │
│   │  [Regenerate Key]                                            │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Navigate: Sender ID → Manage Sender ID                            │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Your Sender IDs                                             │   │
│   │  ─────────────────────────────────────────────────────────  │   │
│   │                                                              │   │
│   │  MYSHOP │ Approved │ DLT Registered                         │   │
│   │                                                              │   │
│   │  [+ Add New Sender ID]                                       │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Navigate: DLT Templates                                           │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Your DLT Templates                                          │   │
│   │  ─────────────────────────────────────────────────────────  │   │
│   │                                                              │   │
│   │  Template ID: 1234567890123456789                           │   │
│   │  Message: "Order {#var#} confirmed. Amount Rs.{#var#}"      │   │
│   │  Status: Approved                                            │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Account Setup Steps

```
Step 1: Create Account
──────────────────────
1. Go to fast2sms.com
2. Sign up with email
3. Verify email
4. Account activated instantly

Step 2: Add Funds (for production)
──────────────────────────────────
1. Go to Dashboard → Wallet
2. Add credits via UPI/Cards/NetBanking
3. Minimum: ₹100

Step 3: DLT Setup (mandatory for India)
──────────────────────────────────────
1. Register on DLT portal (Jio/Airtel/Vi)
2. Get Entity ID, Sender ID, Template ID
3. Add DLT details in Fast2SMS dashboard
4. Wait for verification (1-2 days)

Step 4: Get API Key
───────────────────
1. Go to Dev API section
2. Copy API key
3. Store securely
```

---

## Implementation Strategy

### Provider Structure

```
src/lib/sms-providers/fast2sms.ts
─────────────────────────────────

Class: Fast2SMSProvider

Constructor:
- apiKey: string

Methods:

sendMessage(phone, message, options)
├── Validate phone format
├── Build request body
│   ├── route: "dlt" (production)
│   ├── sender_id: from config
│   ├── message: template with vars replaced
│   ├── template_id: DLT template
│   └── numbers: normalized phone
├── POST to Fast2SMS API
├── Parse response
└── Return standardized result

sendQuickSMS(phone, message)
├── For testing only
├── route: "q"
└── No DLT required

validateCredentials()
├── Check wallet balance
├── If success → valid
└── Return boolean
```

### API Request Format

```
Request:
────────
POST https://www.fast2sms.com/dev/bulkV2

Headers:
- authorization: YOUR_API_KEY
- Content-Type: application/json

Body (DLT Route):
{
  "route": "dlt",
  "sender_id": "MYSHOP",
  "message": "Your order ORD-123 confirmed. Amount Rs.999",
  "template_id": "1234567890123456789",
  "numbers": "9876543210"
}

Response (Success):
{
  "return": true,
  "request_id": "dhg5dfgh8sd",
  "message": ["Message sent successfully"]
}

Response (Error):
{
  "return": false,
  "status_code": 411,
  "message": "Invalid API key"
}
```

### Phone Number Handling

```
Fast2SMS expects: 10 digits (no country code)

Normalization:
─────────────
Input: +919876543210
Output: 9876543210

Input: 919876543210
Output: 9876543210

Input: 09876543210
Output: 9876543210

Code:
phone = phone.replace(/^\+?91/, '');
phone = phone.replace(/^0/, '');
// Result: 10-digit number
```

---

## Limitations & Workarounds

### Limitation 1: No Built-in OTP Verification

**Problem**: Unlike MSG91, Fast2SMS doesn't have verify endpoint

**Workaround**:
```
Your Implementation:
1. Generate OTP in your code
2. Store OTP + phone + timestamp in Redis/DB
3. Send OTP via Fast2SMS
4. User enters OTP
5. You verify against stored value
6. Delete/expire after use
```

### Limitation 2: Basic Error Messages

**Problem**: Less descriptive errors than MSG91/Twilio

**Workaround**:
```
Map status codes to user-friendly messages:
411 → "Invalid API key"
412 → "Insufficient balance"
413 → "Invalid route"
414 → "Invalid sender ID"
```

### Limitation 3: No Delivery Callbacks

**Problem**: Can't get real-time delivery status

**Workaround**:
```
Options:
1. Use Delivery Reports in dashboard (manual)
2. Poll API for status (if available)
3. Assume delivered, track failures via customer feedback
```

### Limitation 4: Rate Limiting

**Problem**: May hit limits during high volume

**Workaround**:
```
1. Implement queue in your app
2. Space out bulk sends
3. Use batch endpoint for multiple numbers
4. Consider MSG91 for high volume
```

---

## Best Practices

### 1. When to Use Fast2SMS

| Scenario | Recommendation |
|----------|----------------|
| Development/Testing | ✅ Quick SMS (free) |
| Low volume (< 500/month) | ✅ Good fit |
| Budget priority | ✅ Cheapest option |
| High volume (> 5000/month) | ⬜ Consider MSG91 |
| Critical OTPs | ❌ Use MSG91/Twilio |
| Enterprise reliability | ❌ Not recommended |

### 2. Error Handling

```
Handle these scenarios:
─────────────────────
- Invalid API key → Re-enter credentials
- Insufficient balance → Alert admin
- Invalid phone → Show user error
- DLT template mismatch → Alert admin
- Rate limited → Queue and retry
- Network error → Retry with backoff
```

### 3. Cost Control

| Practice | Why |
|----------|-----|
| Use Quick SMS for testing | Free |
| Recharge in bulk | Better rates |
| Monitor balance | Avoid service interruption |
| Short messages | Avoid multi-part |

### 4. Mixing with Other Providers

```
Strategy: Use Fast2SMS + MSG91

Fast2SMS:
- Promotional SMS (cheaper)
- Development/testing
- Non-critical notifications

MSG91:
- OTPs (built-in verification)
- Critical order notifications
- High-volume transactional
```

---

## Fast2SMS vs MSG91: Decision Matrix

| Factor | Fast2SMS | MSG91 | Winner |
|--------|----------|-------|--------|
| Price | ₹0.10-0.12 | ₹0.14-0.18 | Fast2SMS |
| Reliability | Good | Excellent | MSG91 |
| OTP Service | Manual | Built-in | MSG91 |
| Documentation | Basic | Better | MSG91 |
| Support | Email only | Better | MSG91 |
| Setup Speed | Instant | 1-2 days | Fast2SMS |
| Features | Basic | Advanced | MSG91 |
| Dashboard | Simple | Feature-rich | MSG91 |

### Recommendation

| Store Type | Provider |
|------------|----------|
| Testing/Development | Fast2SMS (Quick SMS) |
| Very small stores | Fast2SMS |
| Growing stores | MSG91 |
| Professional/Enterprise | MSG91 or Twilio |
| Mixed (budget + reliability) | Fast2SMS promotional + MSG91 transactional |

---

## Quick Reference Card

### Fast2SMS Credentials for ShopPulse

| Field | Format | Required |
|-------|--------|----------|
| API Key | Long alphanumeric | Yes |
| Sender ID | 6 uppercase letters | For DLT |
| Template ID | 19 digits | For DLT |

### API Endpoint

```
POST https://www.fast2sms.com/dev/bulkV2

Headers:
- authorization: YOUR_API_KEY
- Content-Type: application/json
```

### Route Values

| Route | Use |
|-------|-----|
| `q` | Quick/Testing (free) |
| `p` | Promotional |
| `dlt` | DLT Transactional (production) |
| `otp` | OTP messages |

### Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 411 | Invalid API key |
| 412 | Insufficient balance |
| 413 | Invalid route |
| 414 | Invalid sender ID |
| 415 | Invalid numbers |

---

## Next Steps

1. **Read**: [Part 5: Email Services Guide](./5_EMAIL_SERVICES_IMPLEMENTATION_GUIDE.md)
2. **For budget priority**: Start with Fast2SMS
3. **For reliability**: Go with MSG91
4. **For testing**: Use Fast2SMS Quick SMS (free)

---

*Previous: [Part 3: MSG91 Guide](./3_SMS_MSG91_IMPLEMENTATION_GUIDE.md)*
*Next: [Part 5: Email Services Guide](./5_EMAIL_SERVICES_IMPLEMENTATION_GUIDE.md)*
