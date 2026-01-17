# 🚀 UPGRADE API - QUICK REFERENCE

## API Endpoints

### 1. Preview Upgrade
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

## Frontend Usage

### React Component Example

```tsx
import { useState } from 'react';
import { toast } from 'sonner';

export function UpgradeDialog({ currentPlan, newPlan, onSuccess }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Fetch preview data
  useEffect(() => {
    async function fetchPreview() {
      setLoading(true);
      try {
        const res = await fetch('/api/subscription/upgrade/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPlanId: newPlan.id }),
        });
        
        if (!res.ok) {
          const error = await res.json();
          toast.error(error.error);
          return;
        }
        
        const data = await res.json();
        setPreview(data);
      } catch (error) {
        toast.error('Failed to load preview');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPreview();
  }, [newPlan.id]);

  // Execute upgrade
  const handleConfirm = async () => {
    setExecuting(true);
    try {
      const res = await fetch('/api/subscription/upgrade/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPlanId: newPlan.id }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error);
        return;
      }
      
      const data = await res.json();
      toast.success(data.message);
      onSuccess();
    } catch (error) {
      toast.error('Upgrade failed. Please try again.');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) return <div>Loading preview...</div>;
  if (!preview) return null;

  return (
    <Dialog>
      <DialogHeader>
        <DialogTitle>Upgrade to {newPlan.name}</DialogTitle>
      </DialogHeader>
      
      <DialogContent>
        {/* Plan Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4>Current Plan</h4>
            <p className="text-2xl font-bold">
              ₹{preview.currentPlan.price}
            </p>
            <p className="text-muted-foreground">
              {preview.currentPlan.name}
            </p>
          </div>
          <div>
            <h4>New Plan</h4>
            <p className="text-2xl font-bold text-primary">
              ₹{preview.newPlan.price}
            </p>
            <p className="text-muted-foreground">
              {preview.newPlan.name}
            </p>
          </div>
        </div>

        {/* Proration Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Proration Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Days remaining in cycle</span>
              <span>{preview.proration.daysRemaining} days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Credit for remaining days</span>
              <span>₹{preview.proration.creditForRemainingDays.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>New plan price</span>
              <span>₹{preview.proration.newPlanPrice}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Charge now</span>
              <span className="text-primary">
                ₹{preview.proration.chargeAmount.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>{preview.note}</AlertDescription>
        </Alert>

        {/* Warning for low charge */}
        {preview.proration.chargeAmount < 1 && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Low Charge Amount</AlertTitle>
            <AlertDescription>
              Razorpay requires minimum ₹0.50 charge. If you're very close to 
              your billing cycle end, the upgrade might fail.
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
      
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={executing}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={executing}>
          {executing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ₹${preview.proration.chargeAmount.toFixed(2)}`
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
```

---

## Database Schema

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

## Testing with cURL

### Preview Upgrade
```bash
curl -X POST http://localhost:3000/api/subscription/upgrade/preview \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_CLERK_SESSION" \
  -d '{"newPlanId":"clx..."}'
```

### Execute Upgrade
```bash
curl -X POST http://localhost:3000/api/subscription/upgrade/execute \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_CLERK_SESSION" \
  -d '{"newPlanId":"clx..."}'
```

---

## Common Issues

### ❌ "Charge amount must be at least ₹0.50"
**Cause:** Upgrading too close to billing cycle end  
**Solution:** Wait until next billing cycle or upgrade to much more expensive plan

### ❌ "UPI subscriptions cannot be updated"
**Cause:** Razorpay limitation - UPI subscriptions can't be updated  
**Solution:** User must cancel and create new subscription (manual process)

### ❌ Execute returns success but plan doesn't change
**Cause:** Payment failed (Razorpay auto-rollback)  
**Solution:** 
1. Check metadata: `lastUpgradeAttempt` timestamp exists
2. No `subscription.updated` webhook = payment failed
3. Check Razorpay dashboard for payment status
4. User should update payment method and retry

### ❌ Webhook fires but plan still wrong
**Cause:** Plan matching error (razorpayPlanId mismatch)  
**Solution:**
1. Check logs: "Plan not found for Razorpay plan_id"
2. Verify `razorpayPlanId` in database matches Razorpay dashboard
3. Update plan record with correct Razorpay plan ID

---

## Razorpay Dashboard

### Test Mode URLs
- Subscriptions: https://dashboard.razorpay.com/app/subscriptions
- Payments: https://dashboard.razorpay.com/app/payments
- Invoices: https://dashboard.razorpay.com/app/invoices
- Webhooks: https://dashboard.razorpay.com/app/webhooks

### What to Check
1. **After Execute API:**
   - Subscription status: Should still show old plan (payment pending)
   - Check for new invoice created
   - Check invoice payment status

2. **After Webhook:**
   - Subscription plan: Should show new plan ID
   - Payment: Should be captured
   - Invoice: Should be paid

---

## Proration Formula

```
Credit = (Current Price × Days Remaining) / Total Days in Cycle
Charge = Max(0, New Price - Credit)

Must be ≥ ₹0.50
```

**Example:**
- Current Plan: ₹499/month
- New Plan: ₹999/month
- Days Remaining: 15 days
- Total Days: 30 days

```
Credit = (499 × 15) / 30 = ₹249.50
Charge = 999 - 249.50 = ₹749.50 ✅ (≥ ₹0.50)
```

---

## Resources

- [Implementation Complete Guide](./UPGRADE_IMPLEMENTATION_COMPLETE.md)
- [Quick Checklist](./UPGRADE_IMPLEMENTATION_CHECKLIST.md)
- [Part 23B - Proration Deep Dive](./razorpay_official/23B_RAZORPAY_UPDATE_IMMEDIATE_PRORATION.md)
- [Part 33 - Create vs Update](./razorpay_official/33_RAZORPAY_CREATE_VS_UPDATE_DIFFERENCES.md)
- [Razorpay API Docs](https://razorpay.com/docs/api/subscriptions/#update-a-subscription)
