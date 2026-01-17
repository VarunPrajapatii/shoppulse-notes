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

---

## Quick Start Reading Path

### If You're New to This Feature
1. Start with **Part 1** (Overview) - Understand the architecture
2. Jump to **Part 6** (Checklist) - See what needs to be built
3. Then read relevant provider guides (Parts 2-5)

### If You Want to Implement SMS
1. For India: Read **Part 3** (MSG91) or **Part 4** (Fast2SMS)
2. For International: Read **Part 2** (Twilio)

### If You Want to Implement Email
1. Read **Part 5** (Email Services)
2. Choose SendGrid (enterprise) or Resend (modern DX)

### If You're Focused on Security
1. Read **Part 6** (Security & Implementation)
2. Review current encryption in `src/lib/encryption.ts`

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
| SMS Sending Service | 4 hours | High |
| Email Sending Service | 4 hours | High |
| Provider-specific implementations | 8 hours | High |
| Order notification triggers | 4 hours | High |
| Message templates | 4 hours | Medium |
| Test message buttons | 2 hours | Medium |

---

## Provider Decision Matrix

### SMS Providers

| Factor | Twilio | MSG91 | Fast2SMS |
|--------|--------|-------|----------|
| **Best For** | International | India production | India testing/budget |
| **Pricing** | $$$$ | $$ | $ |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Setup** | Complex | Medium | Simple |
| **OTP Service** | Manual | Built-in | Manual |
| **DLT Support** | N/A | Excellent | Good |

### Email Providers

| Factor | SendGrid | Resend |
|--------|----------|--------|
| **Best For** | Enterprise | Modern apps |
| **Pricing** | 100/day free | 3000/month free |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Setup** | 30-60 min | 10-20 min |
| **DX** | Good | Excellent |

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
├── sms-service.ts              # Main SMS entry point
├── sms-providers/
│   ├── types.ts                # Shared interfaces
│   ├── twilio.ts               # Twilio implementation
│   ├── msg91.ts                # MSG91 implementation
│   └── fast2sms.ts             # Fast2SMS implementation
│
├── email-service.ts            # Main email entry point
├── email-providers/
│   ├── types.ts                # Shared interfaces
│   ├── sendgrid.ts             # SendGrid implementation
│   └── resend.ts               # Resend implementation
│
└── notification-templates/
    ├── sms-templates.ts        # SMS message templates
    └── email-templates.ts      # HTML email templates
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
- **Email implementation**: See Part 5
- **Security concerns**: See Part 6
- **Code patterns**: Check existing `src/lib/integration-service.ts`

---

*Last updated: January 2026*
*Total documentation: ~50,000 words across 6 files*
