# Razorpay Subscription Integration - Complete Implementation ✅

## 📋 Overview

This project implements **Razorpay automatic recurring subscriptions** with proper authentication flow, payment verification, and database synchronization.

---

## 🏗️ Architecture

### Database Schema (Prisma)
- **Subscription**: Stores user subscription data with Razorpay IDs
- **SubscriptionPlan**: Available plans (Trial, Monthly, Half-Yearly, Yearly)
- **Payment**: Payment records for each successful charge
- **SubscriptionHistory**: Audit trail of subscription changes

### API Routes
1. **POST /api/subsciption/create** - Creates Razorpay subscription
2. **POST /api/subsciption/verify** - Verifies payment signature
3. **POST /api/subsciption/cancel** - Cancels subscription
4. **POST /api/webhook/razorpay/subscription** - Handles Razorpay webhooks ✅

---

## 🔄 Complete Flow

### 1. User Signup & Onboarding
```
User signs up → Clerk webhook creates User → User completes onboarding
→ POST /api/onboarding/complete creates:
  - Store
  - Subscription (TRIAL, 7 days, ACTIVE)
  - SubscriptionHistory
  - UsageRecords
```

### 2. User Upgrades to Paid Plan
```
User clicks "Get Started" on plan card
→ Frontend: calls POST /api/subsciption/create with planType
→ Backend: 
  - Creates Razorpay Customer (if not exists)
  - Creates Razorpay Subscription
  - Updates local Subscription record
→ Returns: { subscriptionId, razorpayKeyId, amount, currency }
```

### 3. Payment Authentication (Razorpay Checkout)
```
Frontend opens Razorpay modal with subscriptionId
→ User enters payment details (card/UPI/netbanking)
→ Razorpay authenticates payment method
→ First charge happens immediately
→ Razorpay calls handler() with:
  - razorpay_payment_id
  - razorpay_subscription_id
  - razorpay_signature
```

### 4. Payment Verification
```
Frontend: calls POST /api/subsciption/verify
→ Backend:
  - Verifies signature using HMAC SHA256
  - Updates Subscription (paidCount +1, remainingCount -1)
  - Creates Payment record
→ Redirects to /subscription/my-plan
```

### 5. Automatic Recurring Charges
```
Razorpay auto-charges on renewal date
→ Sends webhook: subscription.charged
→ Your webhook handler:
  - Updates paidCount, remainingCount, nextChargeAt
  - Creates Payment record
→ No user action required
```

---

## 💾 Database Fields Explained

### Subscription Model
| Field | Type | Purpose |
|-------|------|---------|
| `razorpaySubscriptionId` | String | Razorpay subscription ID (sub_xxx) |
| `razorpayPlanId` | String | Razorpay plan ID (plan_xxx) |
| `razorpayCustomerId` | String | Razorpay customer ID (cust_xxx) |
| `totalCount` | Int | Total charges (e.g., 6 for 6 months) |
| `paidCount` | Int | Successful charges completed |
| `remainingCount` | Int | Charges remaining (totalCount - paidCount) |
| `nextChargeAt` | DateTime | Exact timestamp of next charge from Razorpay |
| `currentPeriodStart` | DateTime | Start of current billing period |
| `currentPeriodEnd` | DateTime | End of current billing period |
| `status` | Enum | ACTIVE, PAST_DUE, CANCELED, EXPIRED, PAUSED |

### Payment Model
| Field | Type | Purpose |
|-------|------|---------|
| `razorpayPaymentId` | String | Payment ID (pay_xxx) |
| `razorpaySubscriptionId` | String | Links to subscription |
| `razorpaySignature` | String | HMAC signature for verification |
| `amountPaid` | Decimal | Amount charged |
| `status` | Enum | PENDING, PROCESSING, SUCCESS, FAILED, REFUNDED |

---

## 🎨 Frontend Implementation

### Plan Card Component
Location: `src/app/(dashboard)/subscription/components/plan-card.tsx`

**Key Features:**
- Loading state during subscription creation
- Razorpay checkout integration
- Payment verification
- Error handling with toast notifications
- Auto-redirect on success

**Usage:**
```tsx
<PlanCard
  plan={plan}
  isCurrentPlan={subscription.planId === plan.id}
  disabled={plan.name === 'TRIAL'}
/>
```

### Razorpay Script
Added to `src/app/layout.tsx`:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
```

---

## 🔐 Security

### Signature Verification
Every payment MUST be verified using HMAC SHA256:
```typescript
const generatedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
  .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
  .digest('hex');

if (generatedSignature !== razorpay_signature) {
  // Invalid signature - reject payment
}
```

**Why?** Prevents fraudulent payment confirmation requests.

---

## 📊 Subscription Lifecycle

### States
1. **ACTIVE** - Trial or paid subscription active
2. **PAST_DUE** - Payment failed, in grace period
3. **CANCELED** - User canceled, service until period end
4. **EXPIRED** - Period ended, no renewal
5. **PAUSED** - Manually paused by admin

### Automatic Transitions
- TRIAL (7 days) → User upgrades → ACTIVE (paid)
- ACTIVE → Payment fails → PAST_DUE
- PAST_DUE → Payment succeeds → ACTIVE
- PAST_DUE → Grace period ends → EXPIRED
- ACTIVE → User cancels → CANCELED (at period end) → EXPIRED

---

## 🔔 Webhook Events (Future Implementation)

Create: `src/app/api/webhook/razorpay/subscription/route.ts`

**Events to handle:**
1. `subscription.authenticated` - First payment successful
2. `subscription.charged` - Recurring payment successful
3. `subscription.payment_failed` - Payment failed
4. `subscription.completed` - All charges complete
5. `subscription.cancelled` - User cancelled subscription
6. `subscription.paused` - Subscription paused
7. `subscription.resumed` - Subscription resumed

**Webhook URL:** `https://yourdomain.com/api/webhook/razorpay/subscription`

---

## ⚙️ Environment Variables

```env
# Razorpay Keys
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Razorpay Plan IDs
RAZORPAY_MONTHLY_PLAN_ID=plan_xxx
RAZORPAY_HALF_YEARLY_PLAN_ID=plan_xxx
RAZORPAY_YEARLY_PLAN_ID=plan_xxx
```

---

## 🧪 Testing

### Test Mode
1. Use test keys (rzp_test_xxx)
2. Test cards: https://razorpay.com/docs/payments/payments/test-card-details/
3. Test UPI: success@razorpay or failure@razorpay

### Test Scenarios
- ✅ Successful payment
- ❌ Failed payment (insufficient funds)
- 🚫 Cancelled payment (close modal)
- 🔄 Multiple subscriptions attempt
- 📱 Mobile responsiveness

---

## 📈 Next Steps

### Phase 1: Core (✅ Completed)
- [x] Database schema with Razorpay fields
- [x] Create subscription API
- [x] Verify payment API
- [x] Cancel subscription API
- [x] Frontend checkout flow

### Phase 2: Webhooks
- [ ] Webhook handler route
- [ ] Signature verification
- [ ] Event handling (charged, failed, etc.)
- [ ] Database sync

### Phase 3: User Experience
- [ ] Subscription management page
- [ ] Payment history
- [ ] Invoice generation
- [ ] Email notifications

### Phase 4: Analytics
- [ ] Revenue tracking
- [ ] Churn analysis
- [ ] Failed payment alerts
- [ ] Admin dashboard

---

## 🐛 Troubleshooting

### "key_id is mandatory" Error
- **Cause**: Razorpay script not loaded or wrong key
- **Fix**: Check layout.tsx has script tag, verify NEXT_PUBLIC_RAZORPAY_KEY_ID

### Payment Verification Failed
- **Cause**: Signature mismatch
- **Fix**: Ensure RAZORPAY_KEY_SECRET is correct, check signature calculation

### Subscription Already Exists
- **Cause**: User already has active Razorpay subscription
- **Fix**: Check subscription.razorpaySubscriptionId in database

### "Cannot find name 'Razorpay'"
- **Cause**: TypeScript doesn't recognize Razorpay global
- **Fix**: Add `declare global { interface Window { Razorpay: any; } }`

---

## 📚 References

- [Razorpay Subscriptions Docs](https://razorpay.com/docs/payments/subscriptions/)
- [Razorpay Checkout Integration](https://razorpay.com/docs/checkout/standard/)
- [Razorpay Webhooks](https://razorpay.com/docs/webhooks/)
- [Test Credentials](https://razorpay.com/docs/payments/payments/test-card-details/)

---

## ✅ Checklist

Before going to production:

- [ ] Switch to live Razorpay keys
- [ ] Create live plans in Razorpay dashboard
- [ ] Update .env with live plan IDs
- [x] **Webhook handler implemented** ✅
- [ ] Set up webhook URL in Razorpay dashboard (see WEBHOOK_SETUP_GUIDE.md)
- [ ] Add `RAZORPAY_WEBHOOK_SECRET` to production environment
- [ ] Test webhook with ngrok locally
- [ ] Test complete flow on staging
- [ ] Set up monitoring for failed payments
- [ ] Configure email notifications
- [ ] Add invoice generation
- [ ] Test cancellation flow
- [ ] Document customer support process

---

## 📝 Documentation Files

1. **RAZORPAY_SUBSCRIPTIONS_PART_1_FUNDAMENTALS.md** - Concepts, flows, authentication methods
2. **RAZORPAY_SUBSCRIPTIONS_PART_2_IMPLEMENTATION.md** - API reference, code examples
3. **RAZORPAY_IMPLEMENTATION_COMPLETE.md** - This file, complete implementation guide
4. **WEBHOOK_SETUP_GUIDE.md** - Production webhook setup instructions ✅

---

**Status**: ✅ Core implementation complete with webhooks! Ready for production testing.
