# 🚀 UPGRADE API - QUICK REFERENCE

---
## 📝 AUDIT SUMMARY (2025-07-17)

**Overall Status:** ✅ ACCURATE QUICK REFERENCE — All APIs, webhook flow, and database schema match our implementation.
Keep this file as a developer cheat sheet.

---

## API Endpoints

### 1. Preview Upgrade

**📝 STATUS: ✅ IMPLEMENTED** — `preview/route.ts` (169L). Request/response format matches.

**Calculate proration before user confirms**

```
POST /api/subscription/upgrade/preview
Content-Type: application/json
Authorization: Clerk session required
```

**Request:**
```json
{
  "newPlanId": "clx..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "currentPlan": {
    "id": "clx...",
    "name": "PRO",
    "price": 499,
    "billingCycle": "MONTHLY"
  },
  "newPlan": {
    "id": "clx...",
    "name": "ENTERPRISE",
    "price": 999,
    "billingCycle": "MONTHLY"
  },
  "proration": {
    "daysRemaining": 15,
    "totalDaysInCycle": 30,
    "currentPlanPrice": 499,
    "creditForRemainingDays": 249.5,
    "newPlanPrice": 999,
    "chargeAmount": 749.5,
    "chargeCurrency": "INR"
  },
  "currentPeriod": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-31T00:00:00Z"
  },
  "newBillingPeriod": {
    "start": "2025-01-16T00:00:00Z",
    "end": "2025-02-16T00:00:00Z"
  },
  "note": "You'll be charged ₹749.50 now. Your next billing date will be Feb 16, 2025."
}
```

**Errors:**
```json
// 401 Unauthorized
{ "error": "Unauthorized" }

// 400 Bad Request - Missing plan ID
{ "error": "Plan ID is required" }

// 404 Not Found - No subscription
{ "error": "No active subscription" }

// 400 Bad Request - Subscription not active
{
  "error": "Subscription must be active to upgrade",
  "currentStatus": "PENDING"
}

// 400 Bad Request - Not an upgrade
{
  "error": "New plan must be more expensive. Use downgrade for cheaper plans.",
  "currentPrice": 999,
  "newPrice": 499
}

// 400 Bad Request - Charge too low
{
  "error": "Charge amount must be at least ₹0.50",
  "chargeAmount": 0.25,
  "minimumRequired": 0.50
}
```

---

### 2. Execute Upgrade

**📝 STATUS: ✅ IMPLEMENTED** — `execute/route.ts` (524L). Request/response format matches. Error codes match.

**Apply upgrade immediately with Razorpay**

```
POST /api/subscription/upgrade/execute
Content-Type: application/json
Authorization: Clerk session required
```

**Request:**
```json
{
  "newPlanId": "clx..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Upgrade initiated successfully! Processing payment...",
  "subscription": {
    "id": "sub_...",
    "planId": "plan_...",
    "status": "active",
    "hasScheduledChanges": false
  },
  "note": "Your upgrade is being processed. You will be notified once the payment is confirmed."
}
```

**Errors:**
```json
// 400 Bad Request - Razorpay error
{
  "error": "Invalid request to Razorpay",
  "code": "BAD_REQUEST_ERROR",
  "details": "UPI subscriptions cannot be updated"
}

// 500 Internal Server Error - Razorpay API failure
{
  "error": "Failed to process upgrade with Razorpay",
  "details": "Network timeout"
}
```

---

## Webhook Event

**📝 STATUS: ✅ IMPLEMENTED** — `updated.ts` (505L). Our webhook does all 9 items listed here plus: creates Payment record, resets period metrics, sends notifications.

### subscription.updated
**Sent by Razorpay after upgrade payment succeeds**

```json
{
  "event": "subscription.updated",
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_...",
        "plan_id": "plan_...",
        "status": "active",
        "current_start": 1705363200,
        "current_end": 1707955200,
        "charge_at": 1707955200,
        "paid_count": 2,
        "remaining_count": 10,
        "has_scheduled_changes": false
      }
    },
    "payment": {
      "entity": {
        "id": "pay_...",
        "amount": 74950,
        "currency": "INR",
        "status": "captured",
        "invoice_id": "inv_...",
        "method": "card"
      }
    }
  }
}
```

**What webhook does:**
1. Updates subscription.planId to new plan
2. Updates billing period (currentPeriodStart, currentPeriodEnd, nextChargeAt)
3. Clears hasScheduledChanges/scheduledPlanId
4. Increments planChangeCount
5. Sets lastPlanChangeAt to now
6. Creates UPGRADED history record with amountCharged
7. Creates payment record with UPGRADE_CHARGE type and invoiceId
8. Stores previous plan info in metadata
9. Invalidates store cache

---

## Database Schema

> **📝 STATUS: ✅ MATCHES** — PaymentType enum, invoiceId, paymentType fields all exist. `amountCharged` is stored in metadata rather than as a dedicated field on SubscriptionHistory.

### Subscription (Updated Fields)

```prisma
model Subscription {
  hasScheduledChanges Boolean   @default(false)
  scheduledPlanId     String?
  changeScheduledAt   DateTime?
  metadata            Json?
  lastPlanChangeAt    DateTime?
  planChangeCount     Int       @default(0)
  firstActivatedAt    DateTime?
  
  @@index([hasScheduledChanges])
  @@index([scheduledPlanId])
}
```

### Payment (Updated Fields)

```prisma
model Payment {
  paymentType PaymentType @default(SUBSCRIPTION_CHARGE)
  invoiceId   String?
  
  @@index([paymentType])
  @@index([invoiceId])
}

enum PaymentType {
  SUBSCRIPTION_CHARGE
  UPGRADE_CHARGE
  ADDON_CHARGE
  SETUP_FEE
}
```

### SubscriptionHistory (Updated Fields)

```prisma
model SubscriptionHistory {
  amountCharged Decimal?
}
```

---

- [Implementation Complete Guide](./UPGRADE_IMPLEMENTATION_COMPLETE.md)
- [Quick Checklist](./UPGRADE_IMPLEMENTATION_CHECKLIST.md)
- [Part 23B - Proration Deep Dive](./razorpay_official/23B_RAZORPAY_UPDATE_IMMEDIATE_PRORATION.md)
- [Part 33 - Create vs Update](./razorpay_official/33_RAZORPAY_CREATE_VS_UPDATE_DIFFERENCES.md)
- [Razorpay API Docs](https://razorpay.com/docs/api/subscriptions/#update-a-subscription)