# Part 30: Delete an Offer Linked to a Subscription API

## Overview

The **Delete Offer from Subscription API** removes a previously linked offer from an existing subscription. This stops discount application on future billing cycles.

**Endpoint**: `DELETE /v1/subscriptions/{subscription_id}/{offer_id}`

**Key Points**:
- Works on existing subscriptions only
- Removes offer from future billing cycles
- Already charged amounts are not affected
- Cannot delete offers from completed subscriptions
- Subscription must be in `created`, `authenticated`, or `active` status

---

## Understanding Offer Deletion

### Before vs After Deletion

```javascript
// BEFORE: Subscription with 20% offer (3 months)
Month 1: ₹1,599 (20% off) ✅ Already charged
Month 2: ₹1,599 (20% off) ← Current month
Month 3: ₹1,599 (20% off) ← Future
Month 4: ₹1,999 (full price)

// DELETE OFFER NOW
DELETE /v1/subscriptions/sub_123/offer_JHD834hjbxzhd38d

// AFTER: Offer removed
Month 1: ₹1,599 (20% off) ✅ Already charged (unchanged)
Month 2: ₹1,999 (full price) ← Offer removed
Month 3: ₹1,999 (full price)
Month 4: ₹1,999 (full price)
```

**Key Point**: Past charges remain unchanged, only future billing is affected.

---

## When to Use This API

### Valid Use Cases

1. **Customer Request**: User wants to remove discount and pay full price
2. **Offer Abuse**: Detected fraudulent use of promotional codes
3. **Plan Upgrade**: User upgrades and offer no longer applicable
4. **Offer Expiry**: Manual expiration before natural end
5. **Administrative Correction**: Wrong offer was applied

### Invalid Use Cases

❌ **Cannot delete offer from**:
- `completed` subscriptions (already finished)
- `cancelled` subscriptions (already terminated)
- `expired` subscriptions (authentication failed)

---

## API Details

### Endpoint
```
DELETE https://api.razorpay.com/v1/subscriptions/{subscription_id}/{offer_id}
```

### Authentication
Basic Auth using your API Key ID and Secret:
```
Authorization: Basic <base64(key_id:key_secret)>
```

---

## Request Parameters

**Path Parameters** (both required):

| Parameter | Type | Description |
|-----------|------|-------------|
| `sub_id` | string | The unique identifier of the Subscription from which you want to remove the offer. For example, `sub_00000000000001`. |
| `offer_id` | string | The unique identifier of the offer you want remove from the Subscription. For example, `offer_JHD834hjbxzhd38d`. |

**No Request Body** - Just subscription ID and offer ID in URL path.

---

## Response Structure

```json
{
  "id": "sub_00000000000001",
  "entity": "subscription",
  "plan_id": "plan_00000000000001",
  "customer_id": "cust_D00000000000001",
  "status": "active",
  "current_start": 1577355871,
  "current_end": 1582655400,
  "ended_at": null,
  "quantity": 1,
  "notes": {
    "notes_key_1": "Tea, Earl Grey, Hot",
    "notes_key_2": "Tea, Earl Grey… decaf."
  },
  "charge_at": 1577385991,
  "start_at": 1577385991,
  "end_at": 1603737000,
  "auth_attempts": 0,
  "total_count": 6,
  "paid_count": 1,
  "customer_notify": true,
  "created_at": 1577356081,
  "expire_by": 1577485991,
  "short_url": "https://rzp.io/i/z3b1R61A9",
  "has_scheduled_changes": false,
  "change_scheduled_at": null,
  "source": "api",
  "offer_id": null,
  "remaining_count": 5
}
```

**Response Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The unique identifier of the subscription created. For example, `sub_00000000000001`. |
| `entity` | string | The entity being created. Here, it will be `subscription`. |
| `plan_id` | string | The unique identifier for a plan that is linked to the created subscription. For example, `plan_00000000000001`. |
| `customer_id` | string | The unique identifier of the customer linked to the subscription. This is populated automatically once the customer completes the authorization transaction. For example, `cust_00000000000001`. |
| `status` | string | Status of the subscription. Refer to the life cycle section for more details. Possible values: `created`, `authenticated`, `active`, `pending`, `halted`, `cancelled`, `completed`, `expired`. |
| `current_start` | integer | Unix timestamp. The start time of the current billing cycle of the subscription. For example, `1581013800`. |
| `current_end` | integer | Unix timestamp. The end time of the current billing cycle of the subscription. For example, `1581013800`. |
| `ended_at` | integer | The timestamp, in Unix format, when the subscription was completed or was cancelled. For example, `1581013800`. |
| `quantity` | integer | The number of times the plan should be linked to the subscription. For example, if the plan is ₹100.00/user/month and the customer has 5 users, you should pass 5 as the quantity to have the customer charged ₹500.00 (5 x ₹100.00) monthly. By default, this value is set to 1. |
| `notes` | object | Notes you can enter for the contact for future reference. This is a key-value pair. You can enter a maximum of 15 key-value pairs. For example, `"note_key": "Beam me up Scotty"`. |
| `charge_at` | integer | Unix timestamp. This indicates when the next charge on the subscription should be made. For example, `1581013800`. |
| `offer_id` | string | The unique identifier of the offer that should be linked to the subscription. For example, `offer_JHD834hjbxzhd38d`. |
| `start_at` | integer | The timestamp, in Unix format, when the subscription should start. If not passed, the subscription starts immediately after the authorization payment. For example, `1581013800`. |
| `end_at` | integer | The timestamp, in Unix format, when the subscription should end. For example, `1581013800`. |
| `auth_attempts` | integer | The number of times that the charge for the current billing cycle has been attempted on the card. For example, `2`. |
| `total_count` | integer | The number of billing cycles for which the customer should be charged. For example, `2`. We support subscriptions for a maximum duration of 100 years. The number of billing cycles depends if the subscription is daily, weekly, monthly or yearly. |
| `paid_count` | integer | This indicates the number of billing cycles for which the customer has already been charged. For example, `2`. |
| `customer_notify` | boolean | Indicates whether the communication to the customer would be handled by businesses or Razorpay.<br>• `true`: Communication handled by Razorpay. Defaults to `true`.<br>• `false`: Communication handled by businesses. |
| `created_at` | integer | The timestamp, in Unix format, when the subscription was created. For example, `1581013800`. |
| `expire_by` | integer | The timestamp, in Unix format, till when the customer can make the authorization payment. For example, `1581013800`. |
| `short_url` | string | URL that can be used to make the authorization payment. For example, `https://rzp.io/i/PWtAiEo`. |
| `has_scheduled_changes` | boolean | Indicates if the subscription has any scheduled changes. Possible values:<br>• `true`: Subscription has scheduled changes.<br>• `false`: Subscription does not have scheduled changes. |
| `schedule_change_at` | string | Represents when the subscription should be updated. Possible values:<br>• `now` (default): Updates the subscription immediately.<br>• `cycle_end`: Updates the subscription at the end of the current billing cycle. |
| `remaining_count` | integer | This indicates the number of billing cycles remaining on the subscription. For example, `2`. |

**Key Changes**:
- `offer_id` becomes `null` (offer removed)
- Rest of subscription details remain unchanged

---

## Error Handling

### Error 1: Offer Not Found

**Error Status**: `404`

**Error Message**: The offer_id provided does not exist or the subscription was not created with this offer_id

**Description**: The API key/secret provided is invalid. This error occurs due to a mismatch between the API credentials passed in the API call and those generated on the Dashboard.

```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "The offer_id provided does not exist or the subscription was not created with this offer_id"
  }
}
```

**Causes**:
- Offer ID doesn't exist in Razorpay
- Subscription was not created with this offer
- Offer was already deleted

**Solution**:
```javascript
// Check current subscription offer first
const subscription = await razorpay.subscriptions.fetch(subscriptionId);

if (subscription.offer_id) {
  // Delete the CURRENT offer
  await razorpay.subscriptions.deleteOffer(subscriptionId, subscription.offer_id);
} else {
  console.log('No offer linked to this subscription');
}
```

---

### Error 2: Invalid Subscription Status

**Error Code**: `400 BAD_REQUEST_ERROR`

```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "Offers can only be removed from created, authenticated or active subscriptions"
  }
}
```

**Causes**:
- Subscription is `completed`, `cancelled`, or `expired`
- Cannot modify offers on terminated subscriptions

**Solution**:
```javascript
async function deleteOfferSafely(subscriptionId: string, offerId: string) {
  // Fetch subscription status
  const subscription = await razorpay.subscriptions.fetch(subscriptionId);

  const validStatuses = ['created', 'authenticated', 'active'];
  
  if (!validStatuses.includes(subscription.status)) {
    throw new Error(`Cannot delete offer from ${subscription.status} subscription`);
  }

  // Safe to delete
  return await razorpay.subscriptions.deleteOffer(subscriptionId, offerId);
}
```

---

## Code Examples

### Example 1: Delete Offer (Node.js)

```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function deleteOfferFromSubscription(subscriptionId, offerId) {
  try {
    const subscription = await razorpay.subscriptions.deleteOffer(
      subscriptionId,
      offerId
    );

    console.log('✅ Offer deleted successfully');
    console.log('Subscription ID:', subscription.id);
    console.log('Offer ID:', subscription.offer_id); // Should be null
    console.log('Status:', subscription.status);

    return subscription;
  } catch (error) {
    console.error('Failed to delete offer:', error);
    throw error;
  }
}

// Usage
deleteOfferFromSubscription(
  'sub_00000000000001',
  'offer_JHD834hjbxzhd38d'
);
```

---

### Example 2: ShopPulse API Route - Delete Offer

```typescript
// app/api/subscriptions/[id]/offer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptionId = params.id;

    // Find user's subscription
    const dbSubscription = await prisma.subscription.findFirst({
      where: {
        razorpaySubscriptionId: subscriptionId,
        userId: userId
      },
      include: {
        offer: true
      }
    });

    if (!dbSubscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    if (!dbSubscription.offerId) {
      return NextResponse.json(
        { error: 'No offer linked to this subscription' },
        { status: 400 }
      );
    }

    // Fetch Razorpay subscription for validation
    const rzpSubscription = await razorpay.subscriptions.fetch(subscriptionId);

    const validStatuses = ['created', 'authenticated', 'active'];
    if (!validStatuses.includes(rzpSubscription.status)) {
      return NextResponse.json(
        { error: `Cannot delete offer from ${rzpSubscription.status} subscription` },
        { status: 400 }
      );
    }

    // Delete offer from Razorpay
    const updatedSubscription = await razorpay.subscriptions.deleteOffer(
      subscriptionId,
      dbSubscription.offer.razorpayOfferId
    );

    // Update database
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        offerId: null,
        offerRemovedAt: new Date()
      }
    });

    // Log action
    await prisma.subscriptionActivity.create({
      data: {
        subscriptionId: dbSubscription.id,
        action: 'OFFER_DELETED',
        metadata: {
          offer_code: dbSubscription.offer.code,
          deleted_by: userId,
          deleted_at: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Offer removed successfully',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        offer_id: updatedSubscription.offer_id // Should be null
      }
    });

  } catch (error: any) {
    console.error('Delete offer error:', error);
    return NextResponse.json(
      { error: error.error?.description || 'Failed to delete offer' },
      { status: error.statusCode || 500 }
    );
  }
}
```

---

### Example 3: ShopPulse Frontend - Remove Offer UI

```typescript
// components/RemoveOfferDialog.tsx
'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle } from 'lucide-react';

interface RemoveOfferDialogProps {
  subscriptionId: string;
  offer: {
    code: string;
    description: string;
    discount: string;
    remainingCycles: number;
  };
  planAmount: number;
  onSuccess: () => void;
}

export function RemoveOfferDialog({
  subscriptionId,
  offer,
  planAmount,
  onSuccess
}: RemoveOfferDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteOffer = async () => {
    try {
      setIsDeleting(true);

      const response = await fetch(`/api/subscriptions/${subscriptionId}/offer`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Failed to remove offer');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalSavingsLost = calculateTotalSavings(offer, planAmount);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Remove Offer
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Discount Offer?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You are about to remove the <strong>{offer.code}</strong> offer from your subscription.
              </p>

              {/* Current Offer Details */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <p className="font-semibold text-orange-900">Impact</p>
                </div>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Your next billing will be at full price: <strong>₹{planAmount}</strong></li>
                  <li>• You will lose discount for remaining <strong>{offer.remainingCycles} cycles</strong></li>
                  <li>• Total savings lost: <strong>₹{totalSavingsLost}</strong></li>
                  <li>• Past charges will not be affected</li>
                </ul>
              </div>

              {/* Price Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-muted-foreground">With Offer</p>
                  <p className="text-xl font-bold text-green-600">
                    ₹{planAmount - (planAmount * parseFloat(offer.discount) / 100)}
                  </p>
                  <Badge variant="success" className="mt-1">{offer.discount} OFF</Badge>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-sm text-muted-foreground">After Removal</p>
                  <p className="text-xl font-bold">₹{planAmount}</p>
                  <Badge variant="secondary" className="mt-1">Full Price</Badge>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  This action cannot be undone. Your next billing cycle will start at full price.
                </AlertDescription>
              </Alert>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Keep Offer</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteOffer}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Removing...' : 'Remove Offer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function calculateTotalSavings(offer: any, planAmount: number) {
  const discount = parseFloat(offer.discount);
  const discountPerCycle = (planAmount * discount) / 100;
  return (discountPerCycle * offer.remainingCycles).toFixed(0);
}
```

---

### Example 4: Bulk Delete Offers (Admin)

```typescript
// app/api/admin/subscriptions/bulk-remove-offers/route.ts
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permission
    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { offer_code, reason } = await req.json();

    // Find all subscriptions with this offer
    const subscriptions = await prisma.subscription.findMany({
      where: {
        offer: {
          code: offer_code
        },
        status: {
          in: ['created', 'authenticated', 'active']
        }
      },
      include: {
        offer: true
      }
    });

    const results = {
      total: subscriptions.length,
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Delete offers one by one
    for (const subscription of subscriptions) {
      try {
        await razorpay.subscriptions.deleteOffer(
          subscription.razorpaySubscriptionId,
          subscription.offer.razorpayOfferId
        );

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            offerId: null,
            offerRemovedAt: new Date()
          }
        });

        // Notify user
        await sendOfferRemovalEmail(subscription.userId, {
          offerCode: offer_code,
          reason: reason
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          subscription_id: subscription.razorpaySubscriptionId,
          error: error.message
        });
      }
    }

    // Log admin action
    await prisma.adminActivity.create({
      data: {
        userId: userId,
        action: 'BULK_OFFER_DELETION',
        metadata: {
          offer_code,
          reason,
          results
        }
      }
    });

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    return NextResponse.json({ error: 'Bulk deletion failed' }, { status: 500 });
  }
}
```

---

## Implementation Best Practices

### 1. **Always Validate Subscription Status**

```typescript
async function deleteOfferSafely(subscriptionId: string, offerId: string) {
  // Step 1: Fetch subscription
  const subscription = await razorpay.subscriptions.fetch(subscriptionId);

  // Step 2: Check status
  const validStatuses = ['created', 'authenticated', 'active'];
  if (!validStatuses.includes(subscription.status)) {
    throw new Error(`Cannot delete offer from ${subscription.status} subscription`);
  }

  // Step 3: Verify offer exists
  if (!subscription.offer_id) {
    throw new Error('No offer linked to this subscription');
  }

  // Step 4: Delete offer
  return await razorpay.subscriptions.deleteOffer(subscriptionId, offerId);
}
```

---

### 2. **Track Offer Deletion for Analytics**

```prisma
model SubscriptionActivity {
  id              String   @id @default(cuid())
  subscriptionId  String
  action          String   // "OFFER_DELETED"
  metadata        Json
  createdAt       DateTime @default(now())
  
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
}
```

```typescript
await prisma.subscriptionActivity.create({
  data: {
    subscriptionId: subscription.id,
    action: 'OFFER_DELETED',
    metadata: {
      offer_code: offer.code,
      deleted_by: userId,
      reason: reason,
      savings_lost: calculateTotalSavings(offer, plan),
      deleted_at: new Date().toISOString()
    }
  }
});
```

---

### 3. **Notify Customers About Offer Removal**

```typescript
async function sendOfferRemovalEmail(userId: string, details: any) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  await sendEmail({
    to: user.email,
    subject: 'Discount Offer Removed from Your Subscription',
    template: 'offer-removal',
    data: {
      userName: user.name,
      offerCode: details.offerCode,
      reason: details.reason,
      nextBillingAmount: details.newAmount,
      nextBillingDate: details.nextBillingDate,
      supportUrl: 'https://shoppulse.com/support'
    }
  });
}
```

---

### 4. **Handle Gracefully in UI**

```typescript
function SubscriptionOfferCard({ subscription }: any) {
  if (!subscription.offer_id) {
    return (
      <Alert>
        <AlertDescription>No active offers on this subscription</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Offer</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant="success">{subscription.offer.code}</Badge>
        <p>{subscription.offer.description}</p>
        <RemoveOfferDialog
          subscriptionId={subscription.id}
          offer={subscription.offer}
          onSuccess={() => window.location.reload()}
        />
      </CardContent>
    </Card>
  );
}
```

---

## Common Scenarios

### Scenario 1: Customer Requested Removal

```typescript
// Customer asks: "I want to pay full price now"
async function handleCustomerRequest(subscriptionId: string, userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: subscriptionId, userId },
    include: { offer: true }
  });

  if (!subscription?.offer) {
    throw new Error('No offer to remove');
  }

  // Delete offer
  await razorpay.subscriptions.deleteOffer(
    subscriptionId,
    subscription.offer.razorpayOfferId
  );

  // Update database
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      offerId: null,
      offerRemovedAt: new Date(),
      offerRemovalReason: 'CUSTOMER_REQUEST'
    }
  });

  // Send confirmation
  await sendOfferRemovalEmail(userId, {
    offerCode: subscription.offer.code,
    reason: 'You requested to remove this discount'
  });
}
```

---

### Scenario 2: Fraudulent Offer Usage Detection

```typescript
// Admin detected abuse of promotional code
async function handleOfferAbuse(subscriptionId: string, reason: string) {
  const subscription = await razorpay.subscriptions.fetch(subscriptionId);

  if (subscription.offer_id) {
    // Remove offer immediately
    await razorpay.subscriptions.deleteOffer(
      subscriptionId,
      subscription.offer_id
    );

    // Flag in database
    await prisma.subscription.update({
      where: { razorpaySubscriptionId: subscriptionId },
      data: {
        offerId: null,
        offerRemovedAt: new Date(),
        offerRemovalReason: 'FRAUD_DETECTED',
        notes: { fraud_details: reason }
      }
    });

    // Notify customer and support team
    await notifyFraudDetection(subscriptionId, reason);
  }
}
```

---

### Scenario 3: Plan Upgrade (Offer No Longer Applicable)

```typescript
// User upgrades from MINI to MAXI, MINI-specific offer removed
async function handlePlanUpgrade(subscriptionId: string, newPlanId: string) {
  const subscription = await razorpay.subscriptions.fetch(subscriptionId);

  if (subscription.offer_id) {
    // Check if offer applies to new plan
    const offer = await prisma.offer.findFirst({
      where: { razorpayOfferId: subscription.offer_id }
    });

    if (offer.planIds && !offer.planIds.includes(newPlanId)) {
      // Offer not applicable to new plan, remove it
      await razorpay.subscriptions.deleteOffer(
        subscriptionId,
        subscription.offer_id
      );

      await prisma.subscription.update({
        where: { razorpaySubscriptionId: subscriptionId },
        data: {
          offerId: null,
          offerRemovedAt: new Date(),
          offerRemovalReason: 'PLAN_UPGRADE'
        }
      });
    }
  }

  // Proceed with plan update
  await razorpay.subscriptions.update(subscriptionId, {
    plan_id: newPlanId,
    schedule_change_at: 'cycle_end'
  });
}
```

---

## Related Documentation

- **Part 10**: Create Offer (how offers work)
- **Part 12**: Update/Delete Offers (manage offer entities)
- **Part 19**: Create Subscription (subscription creation)
- **Part 23**: Update Subscription (modify subscriptions)
- **Part 29**: Link Offer to Subscription (apply offers)

---

## Summary

The **Delete Offer from Subscription API** removes discounts from active subscriptions:

1. **Path Parameters**: Both subscription_id and offer_id required in URL
2. **Status Requirement**: Only works on created/authenticated/active subscriptions
3. **Effect**: Stops discount on future billing cycles (past charges unchanged)
4. **Response**: Returns subscription with `offer_id: null`

**Validation Checklist**:
- ✅ Subscription status is valid (created/authenticated/active)
- ✅ Offer is currently linked (not already removed)
- ✅ Offer ID matches the subscription's current offer

**Best Practices**:
- Validate subscription status before deletion
- Track deletion reason for analytics
- Notify customers about price changes
- Calculate and display savings lost
- Handle errors gracefully in UI

**Pro Tip**: Use confirmation dialogs showing the financial impact (savings lost, new price) to help users make informed decisions!

---

## End of Razorpay Subscription Documentation

**Parts 1-30 Complete!** 🎉

You now have comprehensive documentation covering:
- Subscriptions overview and lifecycle
- Plans and offers management
- Subscription CRUD operations
- Updates, cancellation, and scheduling
- Pause/resume functionality
- Invoicing and billing
- Offer linking and removal

**Next Steps**: Implement these APIs in ShopPulse to build a complete subscription management system!
