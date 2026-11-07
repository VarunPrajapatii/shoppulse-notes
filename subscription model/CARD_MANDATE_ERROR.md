## Flow 6: Card Mandate Error on Upgrade

**What happened:** You subscribed to Starter Monthly using Razorpay's test card, ran `authenticated`, then tried to upgrade to Growth Monthly. Got the error: *"Can't update subscription immediately when card mandate is applicable"*.

**This is a Razorpay platform limitation, not a bug in your code.** Let me explain in depth:

### What is a Card Mandate?

When a user subscribes via card on Razorpay, Razorpay creates an **e-mandate** (electronic mandate) on the card. This mandate authorizes Razorpay to charge the card automatically for recurring payments. This is an RBI (Reserve Bank of India) regulation requirement since October 2021.

### Why can't you upgrade immediately?

Razorpay's API has this restriction: **when a card mandate is active, you cannot call `subscriptions.update()` with `schedule_change_at: "now"`**. The mandate was authorized for a specific amount (₹799/month), and changing it immediately to ₹1,499/month requires a **new mandate authorization** from the cardholder.

Razorpay's options for card mandates:
- `schedule_change_at: "cycle_end"` → **works** (change happens at next billing cycle)
- `schedule_change_at: "now"` → **fails** (needs new mandate)

### Your code already handles this correctly!

Looking at the logs:
```
[error]: Razorpay API error during upgrade
  "code":"BAD_REQUEST_ERROR"
  "description":"Can't update subscription immediately when card mandate is applicable"
[warn]: Payment method limitation detected
  "paymentMethodType":"Card Mandate"
```

The execute API catches this and returns `requiresCancelFlow: true`. The upgrade dialog then shows a **Payment Failure Dialog** that says: *"Card Mandate doesn't support Razorpay instant upgrades"* — which is exactly what you saw.

### What is the correct upgrade flow for card mandates?

For card-based subscriptions in India, the only way to do an "instant upgrade" is:

1. **Cancel** the current subscription (at period end or immediately).
2. **Create a new subscription** on the higher plan.
3. The user re-enters card details and authorizes a new mandate.

This is exactly what the `requiresCancelFlow: true` response is designed to trigger. The Payment Failure Dialog should have a "Cancel & Resubscribe" button.

### Why does this work differently with UPI?

UPI subscriptions have the same limitation — mandates are tied to a specific amount. That's why both `card` and `upi` are handled the same way in the code.

### Can this be "fixed"?

Not from your end. This is a Razorpay + RBI regulation constraint. The workarounds are:
1. **Cancel & resubscribe** (your code already supports this via the Payment Failure Dialog)
2. **Schedule at cycle end** (but that's not "instant" — user waits until current period ends)
3. Use **Razorpay's hosted page** for mandate re-authorization (complex, not commonly used)

### For testing purposes:

Since Razorpay test cards always create mandates, you **cannot test instant upgrades** with test cards. The `simulate-webhook.ts updated` command exists precisely for this reason — it simulates the plan change directly in the DB without going through Razorpay.
