# Research 2: Payment Method Change Options & Re-authentication

**Topic**: Can we send the user a payment method change link to fix failed auto-charges or unsupported updates?

## 1. The Problem: Failed Upgrades due to Mandate Limits

As established in Research 1, upgrading a UPI subscription from ₹1000 to ₹6000 will fail because the new amount exceeds the original mandate's `max_amount`. 

The user needs to **re-authenticate** a new mandate (enter their UPI PIN again for the higher amount) or switch to a Credit Card.

## 2. Does Razorpay offer a "Payment Method Change Link"?

**YES.** Razorpay provides a feature called the **Customer Portal** (or "Update Payment Method" link).

### How it works:
Every subscription object returned by Razorpay includes a `short_url` property.
```json
{
  "id": "sub_12345",
  "entity": "subscription",
  "plan_id": "plan_abc",
  "status": "active",
  "short_url": "https://rzp.io/i/abc123",
  ...
}
```

This `short_url` is a permanent link to a Razorpay-hosted page where the customer can:
1. View their subscription details.
2. **Update their payment method** (e.g., switch from UPI to a Credit Card, or authenticate a new UPI mandate).
3. Download invoices.

## 3. Can we use this link to fix the upgrade?

**Theoretically, YES. Practically, it's complicated for *immediate* upgrades.**

### The "Gentle" Flow (Option 1 in UPGRADE_QNA_1.3_UPI_EMANDATE_FLOW.md):
1. User tries to upgrade -> API fails due to UPI limits.
2. We show the user a message: *"Your current payment method doesn't support this upgrade. Please update your payment method."*
3. We provide a button that opens the `subscription.short_url`.
4. User goes to the Razorpay portal, selects "Update Payment Method", and adds a Credit Card (or authenticates a new, higher UPI mandate).
5. User returns to our app and clicks "Retry Upgrade".
6. We call `subscriptions.update` again. Since the payment method is now a card (or a new mandate), it succeeds.

### The Catch:
*   **User Friction**: The user has to leave your app, go to a Razorpay page, enter card details, wait for a ₹1 auth charge, come back to your app, and click upgrade again.
*   **UPI Mandate Updates**: While users can switch to a card easily, updating a UPI mandate to a *higher amount* via the portal often involves cancelling the old mandate and creating a new one behind the scenes. Sometimes, banks reject mandate updates, forcing the user to use a different UPI ID or card anyway.

## 4. The "Harsh" Flow (Cancel & Resubscribe)

Because updating payment methods mid-cycle (especially for UPI) is fraught with bank-specific errors and high user friction, many platforms opt for the "Harsh" flow (Option 2 in our notes).

### How it works:
1. User tries to upgrade -> API fails due to UPI limits.
2. We tell the user: *"Your payment method doesn't support this upgrade. You must cancel your current subscription and start a new one."*
3. User agrees. We call `subscriptions.cancel` (immediate).
4. We redirect the user to the checkout page for the new Half-Yearly plan.
5. User goes through the standard Razorpay checkout, authenticating a brand new ₹6000 mandate.

### Pros & Cons:
*   **Pros**: Extremely reliable. Creating a new subscription always works because it forces a fresh mandate authentication.
*   **Cons**: The user loses any prorated credit from their current billing cycle. (Razorpay cannot transfer credits between different subscription IDs).

## 5. Summary of Options

| Option | Mechanism | User Experience | Reliability | Proration |
| :--- | :--- | :--- | :--- | :--- |
| **1. Update Link** | Use `subscription.short_url` | High friction (leave app, update, return, retry) | Medium (Bank mandate updates can fail) | **Kept** |
| **2. Cancel & Resub** | Cancel old, create new | Low friction (standard checkout flow) | **High** (Fresh mandate always works) | **Lost** |

Currently, our codebase (`src/app/api/subscription/upgrade/execute/route.ts`) detects the error and returns `requiresCancelFlow: true`, pushing the user towards Option 2 (Cancel & Resubscribe). This is the most robust way to handle UPI mandate limit failures.