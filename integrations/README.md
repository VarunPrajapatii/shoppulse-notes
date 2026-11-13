# ShopPulse Integrations Documentation

## 📚 Complete Guide to SMS & Email Service Integrations

This documentation series provides comprehensive guidance for implementing SMS and Email service integrations in ShopPulse Admin.

---

## Document Index

| Part | Title | Focus Area |
|------|-------|------------|
| **1** | [Overview & Analysis](./1_INTEGRATIONS_OVERVIEW_AND_ANALYSIS.md) | Architecture, strategy, pros/cons |
| **2** | [Twilio SMS Guide](./2_SMS_TWILIO_IMPLEMENTATION_GUIDE.md) | International SMS provider |
| **3** | [MSG91 SMS Guide](./3_SMS_MSG91_IMPLEMENTATION_GUIDE.md) | India SMS + DLT compliance |
| **4** | [Fast2SMS Guide](./4_SMS_FAST2SMS_IMPLEMENTATION_GUIDE.md) | Budget Indian SMS |
| **5** | [Email Services Guide](./5_EMAIL_SERVICES_IMPLEMENTATION_GUIDE.md) | SendGrid & Resend |
| **6** | [Security & Checklist](./6_SECURE_KEY_HANDLING_AND_IMPLEMENTATION_CHECKLIST.md) | Key handling, implementation |
| **7** | [Modern Additions 2026](./7_MODERN_ADDITIONS_2026.md) | 🆕 Resend, React Email, WhatsApp |
| **8** | [Notification System Design](./8_NOTIFICATION_SYSTEM_DESIGN.md) | 🆕 Complete notification architecture |
| **9** | [Testing & Debugging Guide](./9_TESTING_AND_DEBUGGING_GUIDE.md) | 🆕 Test strategies, debugging tools |
| **10** | [Store Integration Model Analysis](./10_STORE_INTEGRATION_MODEL_ANALYSIS.md) | Database model details |

---

## Quick Start Reading Path

### If You're New to This Feature
1. Start with **Part 1** (Overview) - Understand the architecture
2. Read **Part 7** (Modern Additions) - Latest recommendations
3. Read **Part 8** (Notification System) - Complete design
4. Then read relevant provider guides (Parts 2-5)

### If You Want to Implement SMS
1. For India: Read **Part 3** (MSG91) or **Part 4** (Fast2SMS)
2. For International: Read **Part 2** (Twilio)

### If You Want to Implement Email
1. Read **Part 7** (Modern Additions) - **Recommended approach**
2. Read **Part 5** (Email Services) - Additional details
3. Use Resend + React Email (modern stack)

### If You're Focused on Security
1. Read **Part 6** (Security & Implementation)
2. Review current encryption in `src/lib/encryption.ts`

### If You're Testing/Debugging
1. Read **Part 9** (Testing & Debugging Guide)
2. Use mock providers for development

---

## 🌟 2026 Recommended Stack

### Email Provider
**Resend** - Modern, excellent DX, React Email support
- Free: 3,000 emails/month
- TypeScript-first SDK
- Best-in-class delivery

### SMS Provider (India)
**Fast2SMS** - Testing (₹0)
**MSG91** - Production (DLT compliant)

### Template Engine
**React Email** - Email components as React
- Type-safe templates
- Preview in development
- Beautiful default styles

---

## Summary of What's Already Built

### ✅ Infrastructure Complete

| Component | Location | Status |
|-----------|----------|--------|
| Encryption System | `src/lib/encryption.ts` | ✅ AES-256-CBC |
| Integration Service | `src/lib/integration-service.ts` | ✅ Save/Get/Delete |
| Provider Configs | `src/lib/integration-configs.ts` | ✅ Schema defined |
| Database Schema | `prisma/schema.prisma` | ✅ StoreIntegration model |
| API Routes | `src/app/api/[storeId]/integrations/` | ✅ CRUD operations |
| Settings UI | `src/app/.../settings/integrations/` | ✅ Tabbed interface |

### ❌ What Needs to Be Built

| Component | Effort | Priority |
|-----------|--------|----------|
| Database Schema | 2 hours | Critical |
| NotificationSettings model | - | Part of schema |
| NotificationTemplate model | - | Part of schema |
| NotificationLog model | - | Part of schema |
| Notification Service | 4 hours | High |
| SMS Sending Service | 4 hours | High |
| Email Sending Service | 4 hours | High |
| Provider implementations | 8 hours | High |
| Order notification triggers | 4 hours | High |
| Settings → Notifications UI | 6 hours | High |
| Template editor UI | 4 hours | Medium |
| Test message buttons | 2 hours | Medium |

**Estimated Total: 38 hours (1 week focused work)**

---

## Provider Decision Matrix

### SMS Providers

| Factor | Twilio | MSG91 | Fast2SMS |
|--------|--------|-------|----------|
| **Best For** | International | India production | India testing/budget |
| **Pricing** | $$$$ | $$ | $ (₹0 testing) |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Setup** | Complex | Medium | Simple |
| **OTP Service** | Manual | Built-in | Manual |
| **DLT Support** | N/A | Excellent | Good |
| **Recommendation** | Global apps | **Production** | Development |

### Email Providers

| Factor | SendGrid | Resend |
|--------|----------|--------|
| **Best For** | Enterprise | Modern apps |
| **Pricing** | 100/day free | 3000/month free |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Setup** | 30-60 min | 10-20 min |
| **DX** | Good | Excellent |
| **Templates** | Mustache | React Email ⭐ |
| **Recommendation** | Legacy/Enterprise | **New Projects** |

---

## Key Architecture Decisions

### 1. BYOK Model (Bring Your Own Keys)
Store owners provide their own API credentials. ShopPulse stores them encrypted.

**Why**: No billing complexity, transparent costs, scalable

### 2. One Provider Per Type Per Store
Only one SMS provider, one email provider per store at a time.

**Why**: Simplicity, clear ownership, no confusion

### 3. Encrypted Credential Storage
AES-256-CBC encryption with random IV per record.

**Why**: Industry standard, meets compliance requirements

### 4. Provider Abstraction
Unified interface for all providers of same type.

**Why**: Easy to add providers, swap without code changes

---

## Implementation Timeline

```
Week 1: Enable & SMS Foundation
├── Day 1-2: Enable all providers in config
├── Day 3-4: Create SMS service structure
└── Day 5: Implement first SMS provider

Week 2: SMS Complete
├── Day 1-2: Implement remaining SMS providers
├── Day 3-4: Integrate SMS in order flow
└── Day 5: Testing

Week 3: Email Complete
├── Day 1-2: Create email service structure
├── Day 3: Implement SendGrid
├── Day 4: Implement Resend
└── Day 5: Integrate in order flow

Week 4: Polish
├── Day 1-2: Test buttons, validation
├── Day 3: Audit logging
└── Day 4-5: Final testing
```

---

## Files to Create

```
src/lib/
├── notifications/
│   ├── notification-service.ts     # Main orchestrator
│   ├── template-processor.ts       # Variable replacement
│   ├── default-templates.ts        # Default SMS/Email templates
│   ├── types.ts                    # TypeScript interfaces
│   └── notification-logger.ts      # Log to NotificationLog
│
├── sms/
│   ├── sms-service.ts              # Factory + unified interface
│   ├── types.ts                    # SMS-specific types
│   └── providers/
│       ├── msg91.ts                # India primary (DLT)
│       ├── fast2sms.ts             # India testing
│       └── twilio.ts               # International
│
└── email/
    ├── email-service.ts            # Factory + unified interface
    ├── types.ts                    # Email-specific types
    ├── templates/                  # React Email templates
    │   ├── order-confirmation.tsx
    │   ├── order-shipped.tsx
    │   ├── order-delivered.tsx
    │   └── base-layout.tsx
    └── providers/
        ├── resend.ts               # Primary (modern)
        └── sendgrid.ts             # Enterprise fallback

src/app/(dashboard)/[storeId]/(routes)/settings/
└── notifications/                  # NEW PAGE
    ├── page.tsx
    └── components/
        ├── notification-toggle-card.tsx
        ├── template-editor-modal.tsx
        └── admin-alerts-section.tsx
```

---

## Quick Reference

### Credentials Needed by Provider

| Provider | Field 1 | Field 2 | Field 3 |
|----------|---------|---------|---------|
| **Twilio** | Account SID | Auth Token | Phone Number |
| **MSG91** | Auth Key | Sender ID | Template ID |
| **Fast2SMS** | API Key | - | - |
| **SendGrid** | API Key | From Email | From Name (opt) |
| **Resend** | API Key | From Email | - |

### Enable a Provider

```typescript
// In src/lib/integration-configs.ts
// Find the provider and change:
{
  provider: 'msg91',
  enabled: true,        // ← Change from false
  // comingSoon: true,  // ← Remove this line
  ...
}
```

---

## Questions?

- **Architecture questions**: See Part 1
- **SMS implementation**: See Parts 2-4
- **Email implementation**: See Parts 5 & 7 (modern)
- **Notification system**: See Part 8 (complete design)
- **Security concerns**: See Part 6
- **Testing/debugging**: See Part 9
- **Code patterns**: Check existing `src/lib/integration-service.ts`

---

## NPM Packages to Install

```bash
# Email
npm install resend @react-email/components

# SMS (optional - Twilio for international)
npm install twilio

# Templates
npm install handlebars   # Alternative to custom processor
```

---

*Last updated: February 2026*
*Total documentation: 10 files (~60,000 words)*
