# Razorpay Subscriptions - Official Documentation Part 3: States & Lifecycle Management

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Documentation Version**: Latest (as provided)

---

## Table of Contents
1. [Subscription States Overview](#subscription-states-overview)
2. [State Diagram](#state-diagram)
3. [Detailed State Descriptions](#detailed-state-descriptions)
4. [State Transitions](#state-transitions)
5. [Actions Required by Status](#actions-required-by-status)

---

## Subscription States Overview

You can track a Subscription through its various stages from creation to completion. While the life cycle for a Subscription includes creation, authentication, active and then completion, you also have the option to cancel a Subscription.

---

## State Diagram

```
┌────────────────────────────────────────────────────────────┐
│               SUBSCRIPTION LIFECYCLE STATES                 │
└────────────────────────────────────────────────────────────┘

    CREATED
       ↓
   AUTHENTICATED ←──────────┐
       ↓                     │
     ACTIVE ←────────────────┤
       ↓                     │
     PENDING ─────────────→ │
       ↓                     │
     HALTED                  │
       ↓                     │
   (Can move back to ACTIVE) ┘
       
   CANCELLED (Terminal - cannot restart)
   
   COMPLETED (Terminal - all cycles done)
   
   PAUSED (Only from ACTIVE state)
```

---

## Detailed State Descriptions

### 1. CREATED

**When**: A Subscription attains the `created` state once it is created.

**What Happens**:
- Subscription exists in the system
- Awaiting authentication transaction
- No charges attempted yet

**Next State**: `authenticated`

---

### 2. AUTHENTICATED

**When**: A Subscription goes to the `authenticated` state when the customer completes the authentication transaction.

#### Special Cases:

**Subscriptions with Immediate Start Date**:
- ⚠️ The Subscription with an immediate start date remains in the `created` state till the first charge is made
- Moves to the `active` state after the first charge

**Subscriptions with Trial Period**:

| Has Add-on Amount? | Behavior |
|-------------------|----------|
| ✅ Yes | Remains in `created` state → Moves to `authenticated` after add-on processed |
| ❌ No | Moves to `authenticated` when customer completes authentication transaction |

**Next State**: `active`

---

### 3. ACTIVE

**When**: A Subscription goes to the `active` state when the billing cycle for the Subscription starts.

#### Action on Razorpay

When a Subscription moves to `active` state from `authenticated` state:
- We attempt to charge the authorized card against the invoice amount

**Next States**: 
- `pending` (if charge fails)
- `paused` (if manually paused)
- `cancelled` (if cancelled)
- `completed` (if all cycles done)

---

### 4. PENDING

**When**: A Subscription goes to the `pending` state when an auto-charge on a payment is unsuccessful.

#### What Happens in PENDING State

**Razorpay Actions**:
- We continue to retry the payment while it is in this state
- After all retry attempts exhausted → Moves to `halted` state

**Your Actions**:
- You can ask the customer to authenticate another card if required

#### Important Notes

⚠️ **Invoices Continue**: When the Subscription moves to the `halted` state from the `pending` state, invoices continue to be generated as per the billing cycles. However, no auto-charge is attempted.

⚠️ **No Re-attempts on Old Charges**: Once the Subscription moves back to the `active` state, the previous charges will NOT be re-attempted. Only future billing cycles are charged automatically.

#### Notifications

When the Subscription moves to `pending` state from `active` state:
- ✅ You are notified via webhooks about the failed attempt
- ✅ For card-based Subscriptions: We automatically process retries
- ✅ Customer receives email notification about the failure
- ✅ Email includes call-to-action to change the card

#### Moving Back to ACTIVE

To move the Subscription back to `active` state from `pending` state:

**Option 1**: Customer authenticates another card
- Enables successful charge
- Subscription automatically moves to `active`

**Option 2**: Manually attempt charge on same card
- Attempt to charge any older unpaid invoice
- If successful → Subscription moves to `active`

**Next States**: 
- `halted` (after all retries exhausted)
- `active` (if charge succeeds)

---

### 5. HALTED

**When**: The Subscription goes to the `halted` state when the last auto-charge is unsuccessful and all retries are exhausted.

#### Important Characteristics

⚠️ **Can Remain Halted for Multiple Cycles**: It is possible for the Subscription to continue to remain in the `halted` state for more than one billing cycle.

**In such scenarios**:
- Invoices are generated for all billing cycles
- But NO auto-charge is attempted

#### Actions to Move Back to ACTIVE

**Option 1**: Customer authenticates another card
- Subscription moves to `active` once we successfully charge the new card

**Option 2**: Manually charge an older invoice
- Can be done from the Dashboard
- If successful → Subscription automatically moves to `active`

#### Critical Note

⚠️ **No Re-attempts**: Once the Subscription moves to the `active` state from the `halted` state, the previous charges are NOT re-attempted. Only future payments are charged automatically.

**Next States**: 
- `active` (if new card added or old invoice charged successfully)
- `cancelled` (if manually cancelled)

---

### 6. CANCELLED

**When**: When you cancel a Subscription, it moves to the `cancelled` state.

#### Key Characteristics

❌ **Terminal State**: Once cancelled, a Subscription **CANNOT** be restarted.

#### How to Cancel

**Method 1**: Using the Cancel API

**Method 2**: From the Dashboard

**Previous States**: Can be cancelled from:
- `created`
- `authenticated`
- `active`
- `pending`
- `halted`

---

### 7. PAUSED

**When**: A Subscription is manually paused.

#### Important Rules

✅ **Only from ACTIVE**: Only Subscriptions in the `active` state can be paused.

#### How to Pause

**Method 1**: From the Dashboard

**Method 2**: Using API

#### Resuming

Paused Subscriptions can be resumed:
- From the Dashboard
- Using Resume API

**Next States**: 
- `active` (when resumed)
- `cancelled` (if cancelled while paused)

---

## State Transitions

### State Transition Matrix

| From State | To State | Trigger | Notes |
|-----------|----------|---------|-------|
| `created` | `authenticated` | Auth transaction complete | Standard flow |
| `authenticated` | `active` | Billing cycle starts | Auto-transition |
| `active` | `pending` | Charge fails | Auto-transition |
| `pending` | `halted` | All retries exhausted | Auto-transition |
| `halted` | `active` | New card added OR old invoice paid | Manual action required |
| `pending` | `active` | Charge succeeds | Auto-transition |
| `active` | `paused` | Manually paused | Manual action |
| `paused` | `active` | Manually resumed | Manual action |
| `active` | `cancelled` | Manually cancelled | Manual action (terminal) |
| `active` | `completed` | All cycles done | Auto-transition (terminal) |

---

## Actions Required by Status

### CREATED
- ⏳ **Wait**: Awaiting customer authentication transaction
- 🎯 **Customer Action**: Complete authentication payment

### AUTHENTICATED
- ⏳ **Wait**: Awaiting billing cycle start date
- ✅ **System Action**: Razorpay will auto-charge when billing starts

### ACTIVE
- ✅ **All Good**: Subscription is running normally
- 🔄 **System Action**: Auto-charges on schedule

### PENDING
- ⚠️ **Alert**: Payment failed, retries in progress
- 📧 **Notification**: Customer notified to update card
- 🎯 **Customer Action**: Update card if needed

### HALTED
- 🚨 **Critical**: All retries exhausted
- 📧 **Notification**: Customer must take action
- 🎯 **Required Action**: 
  - Customer adds new card, OR
  - You manually charge old invoice

### CANCELLED
- 🛑 **Terminal**: Subscription ended
- ❌ **Cannot Restart**: This is permanent

### PAUSED
- ⏸️ **Paused**: Billing temporarily stopped
- 🔄 **Resumable**: Can be resumed anytime

---

## Best Practices

### Monitoring

✅ **Subscribe to Webhooks**: Get real-time notifications of state changes

✅ **Check Regularly**: Monitor subscription states in your Dashboard

✅ **Handle PENDING Quickly**: Contact customers before moving to HALTED

### Customer Communication

✅ **PENDING State**: Prompt customer to update payment method

✅ **HALTED State**: Urgent notification required

✅ **Trial Ending**: Notify before authentication charge

### System Design

✅ **Grace Period**: Consider implementing grace period for PENDING/HALTED

✅ **Access Control**: Decide when to revoke access based on state

✅ **Invoice Tracking**: Track unpaid invoices for manual charging

---

**Next Document**: Part 4 - Use Cases & Examples
