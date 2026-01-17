# Part 1: Final Integration Database Schema

## Your Current Model

```prisma
model StoreIntegration {
  id          String          @id @default(uuid())
  storeId     String
  type        IntegrationType
  provider    String
  credentials String          @db.Text  // Encrypted
  config      Json?
  @@unique([storeId, type])
}

enum IntegrationType {
  PAYMENT_GATEWAY, SMS_PROVIDER, EMAIL_SERVICE, 
  STORAGE_SERVICE, ANALYTICS, SHIPPING, NOTIFICATION
}
```

**Verdict: Good foundation, but missing production features.**

---

## Recommended Final Schema

```prisma
// ============================================
// INTEGRATION SYSTEM - PRODUCTION READY
// ============================================

model StoreIntegration {
  id          String              @id @default(uuid())
  storeId     String
  store       Store               @relation(fields: [storeId], references: [id], onDelete: Cascade)

  // WHAT integration
  type        IntegrationType
  provider    String              // "razorpay", "stripe", "msg91", "s3", "secrets_manager"

  // CREDENTIALS (encrypted JSON)
  credentials String              @db.Text

  // NON-SENSITIVE CONFIG (not encrypted)
  config      Json?               // { testMode: true, region: "ap-south-1" }

  // HEALTH & STATUS
  status      IntegrationStatus   @default(PENDING)
  isEnabled   Boolean             @default(true)
  lastUsedAt  DateTime?
  lastErrorAt DateTime?
  lastError   String?             @db.Text
  failureCount Int                @default(0)

  // MULTI-PROVIDER SUPPORT (future-proof)
  isDefault   Boolean             @default(true)
  priority    Int                 @default(0)    // Lower = higher priority
  displayName String?                            // "Production Razorpay", "Test Stripe"

  // METADATA
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  createdBy   String?                            // userId who added it

  // INDEXES
  @@unique([storeId, type, isDefault])           // One default per type
  @@index([storeId])
  @@index([storeId, type])
  @@index([storeId, type, status])
  @@index([provider])

  // RELATIONS (optional - for usage tracking)
  usageLogs   IntegrationUsageLog[]
}

enum IntegrationType {
  // CORE BUSINESS
  PAYMENT_GATEWAY        // Razorpay, Stripe, PayPal
  SMS_PROVIDER           // MSG91, Twilio, Fast2SMS
  EMAIL_SERVICE          // SendGrid, Resend, Postmark, AWS SES
  SHIPPING               // Shiprocket, Delhivery

  // INFRASTRUCTURE
  STORAGE                // AWS S3, Cloudinary, GCS
  SECRETS_MANAGER        // AWS Secrets Manager, HashiCorp Vault
  CACHE                  // Redis, Memcached (if external)

  // ANALYTICS & TRACKING
  ANALYTICS              // Google Analytics, Mixpanel, Amplitude
  ERROR_TRACKING         // Sentry, Bugsnag
  LOGGING                // DataDog, Logtail

  // NOTIFICATIONS
  PUSH_NOTIFICATION      // FCM, OneSignal, Expo
  WHATSAPP               // Twilio WhatsApp, Gupshup

  // FUTURE EXTENSIBILITY
  CRM                    // HubSpot, Salesforce
  ACCOUNTING             // Zoho, QuickBooks
  CUSTOM                 // Any custom integration
}

enum IntegrationStatus {
  PENDING                // Added but not verified
  ACTIVE                 // Verified and working
  FAILING                // Recent errors (auto-set after 3 failures)
  DISABLED               // Manually disabled by user
  EXPIRED                // OAuth token expired
}

// OPTIONAL: Usage tracking for billing/analytics
model IntegrationUsageLog {
  id            String           @id @default(uuid())
  integrationId String
  integration   StoreIntegration @relation(fields: [integrationId], references: [id], onDelete: Cascade)

  action        String           // "sms_sent", "email_sent", "file_uploaded"
  success       Boolean
  duration      Int?             // milliseconds
  metadata      Json?            // { templateId: "xyz", recipient: "+91xxx" }

  createdAt     DateTime         @default(now())

  @@index([integrationId])
  @@index([integrationId, createdAt])
  @@index([createdAt])
}
```

---

## What Each Field Does

| Field | Purpose | Example |
|-------|---------|---------|
| `type` | Category of integration | `PAYMENT_GATEWAY` |
| `provider` | Specific service | `"razorpay"`, `"s3"` |
| `credentials` | ENCRYPTED secrets | `"iv:encrypted_json"` |
| `config` | Public settings | `{ region: "ap-south-1" }` |
| `status` | Health indicator | `ACTIVE`, `FAILING` |
| `isEnabled` | User toggle | Can disable without deleting |
| `failureCount` | Auto-disable trigger | After 5 failures → FAILING |
| `isDefault` | Multi-provider routing | Which one to use by default |
| `priority` | Failover order | 0 = primary, 1 = backup |
| `displayName` | User-friendly label | "Production Keys" |

---

## Credentials Structure by Provider

### Payment Gateways

```json
// Razorpay
{
  "key_id": "rzp_live_xxx",
  "key_secret": "xxx",
  "webhook_secret": "xxx"
}

// Stripe
{
  "publishable_key": "pk_live_xxx",
  "secret_key": "sk_live_xxx",
  "webhook_secret": "whsec_xxx"
}
```

### SMS Providers

```json
// MSG91
{
  "auth_key": "xxx",
  "sender_id": "SHOPPL",
  "dlt_entity_id": "123456789"
}

// Twilio
{
  "account_sid": "ACxxx",
  "auth_token": "xxx",
  "from_number": "+1234567890"
}
```

### AWS Services

```json
// AWS S3
{
  "access_key_id": "AKIA...",
  "secret_access_key": "xxx",
  "region": "ap-south-1",
  "bucket": "shoppulse-uploads"
}

// AWS Secrets Manager
{
  "access_key_id": "AKIA...",
  "secret_access_key": "xxx",
  "region": "ap-south-1"
}
```

### Analytics

```json
// Google Analytics
{
  "measurement_id": "G-XXXXXX",
  "api_secret": "xxx"
}

// Mixpanel
{
  "project_token": "xxx",
  "api_secret": "xxx"
}
```

---

## Why NOT Use AWS Secrets Manager for All Credentials?

| Aspect | Your AES Encryption | AWS Secrets Manager |
|--------|---------------------|---------------------|
| Cost | FREE | $0.40/secret/month + $0.05/10K API calls |
| Latency | <1ms (local) | 50-200ms (network call) |
| Complexity | Simple | AWS SDK, IAM setup |
| Multi-tenant | Each store's own key | Single AWS account for all stores |

**Recommendation:**

```
YOUR APP (ShopPulse)
│
├─ Store credentials locally with AES-256
│  └─ Why: Multi-tenant, fast, free, no vendor lock-in
│
└─ OFFER Secrets Manager as OPTIONAL integration
   └─ Why: Enterprise stores may want AWS compliance
```

---

## Migration Plan

Since app isn't launched:

```sql
-- 1. Drop existing table
DROP TABLE IF EXISTS "StoreIntegration";

-- 2. Apply new schema
-- (handled by prisma migrate)

-- No data migration needed - fresh start!
```

```bash
# Commands to run:
npx prisma migrate dev --name integration_system_v2
npx prisma generate
```

---

## Summary

| Change | Reason |
|--------|--------|
| Added `status`, `isEnabled` | Health monitoring |
| Added `failureCount`, `lastError` | Auto-disable bad integrations |
| Added `isDefault`, `priority` | Future multi-provider support |
| Added `displayName` | UX improvement |
| Expanded `IntegrationType` enum | Future-proof for all integrations |
| Added `IntegrationUsageLog` | Usage tracking (optional) |

**This schema supports:**
- ✅ All your current integrations
- ✅ AWS S3, Secrets Manager
- ✅ Future CRM, accounting integrations
- ✅ Multi-provider with failover
- ✅ Health monitoring
- ✅ Usage analytics

---

*Next: Part 2 - SMS Integration Reality (Testing Without Approvals)*
