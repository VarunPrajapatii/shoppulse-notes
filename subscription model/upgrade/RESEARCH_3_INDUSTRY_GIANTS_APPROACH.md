# Research 3: How Industry Giants Handle Subscription Upgrades

**Topic**: If Amazon Prime, Netflix, Spotify, or JioHotstar were in our place, how would they handle a user upgrading from a low-cost UPI plan to a high-cost plan?

## 1. The Core Philosophy of Giants

Industry giants prioritize **Payment Success Rates** and **Predictable User Flows** over saving the user a few prorated dollars if it means risking a failed transaction or a confusing UX loop.

When dealing with the strict regulations of Indian payment methods (RBI's e-mandate rules, UPI AutoPay limits), they almost universally adopt the **"Cancel and Re-authenticate"** approach for significant plan changes.

## 2. Case Studies

### A. Netflix India
*   **Scenario**: Upgrading from Mobile (₹149) to Premium (₹649) using UPI AutoPay.
*   **What they do**: Netflix does *not* attempt a silent auto-charge for the difference if it exceeds the mandate. 
*   **The Flow**: 
    1. You select the new plan.
    2. Netflix immediately prompts you to **re-authenticate** the payment.
    3. They invoke the payment gateway (often Razorpay or PayU) to create a *new* mandate for the higher amount.
    4. You must enter your UPI PIN to approve the new mandate.
    5. **Proration**: Netflix handles proration internally. They might charge you the full ₹649 immediately and push your next billing date further into the future to account for the unused days of the ₹149 plan. (Razorpay doesn't support this natively across different subscriptions, which is why we lose proration in our "Cancel & Resubscribe" flow).

### B. Amazon Prime India
*   **Scenario**: Upgrading from Monthly (₹299) to Yearly (₹1499) using UPI.
*   **What they do**: Amazon explicitly cancels the old mandate and requires a new one.
*   **The Flow**:
    1. You choose the Yearly plan.
    2. Amazon tells you that your current payment method needs to be updated/re-authorized.
    3. You are taken to the Amazon Pay checkout screen.
    4. You select your UPI app and authorize a *new* mandate for ₹1499.
    5. The old monthly mandate is cancelled.

### C. Spotify India
*   **Scenario**: Changing from Individual (₹119) to Family (₹179) on UPI.
*   **What they do**: Spotify often forces users to buy "Prepaid" plans (one-time payments) via UPI rather than recurring mandates because UPI mandates are notoriously brittle for upgrades.
*   **If using recurring UPI**: They require you to go through the checkout flow again to authorize the new amount. They do not attempt silent upgrades that exceed mandate limits.

### D. JioHotstar (Disney+ Hotstar)
*   **Scenario**: Upgrading from Super (₹899/yr) to Premium (₹1499/yr).
*   **What they do**: Hotstar calculates the difference (e.g., ₹600).
*   **The Flow**:
    1. They ask you to pay the difference *immediately* as a one-time charge.
    2. You must authenticate this payment (enter UPI PIN/OTP).
    3. For the *next* billing cycle, they require a new mandate for the full ₹1499.
    4. Often, they just cancel the old subscription, charge you the prorated difference via a standard payment link, and set up a new subscription.

## 3. Why Giants Don't Use "Update Payment Method" Links

You rarely see Netflix say: *"Please go to this external portal, update your card, and come back."*

**Why?**
1. **Conversion Drop-off**: Every step away from the main app reduces the chance the user completes the upgrade.
2. **Loss of Context**: If the user updates their payment method in a portal, the app doesn't immediately know when they are done. The user has to manually click "I've updated it, retry now."
3. **Mandate Complexity**: Updating a UPI mandate's `max_amount` is technically complex and often unsupported by banks. It's much cleaner to just ask for a new mandate.

## 4. Conclusion for ShopPulse

Our current implemented approach—**Option 2: Cancel & Resubscribe (The "Harsh" Fallback)**—is actually the **industry standard** for handling UPI mandate limit failures in India.

While it feels "harsh" because the user loses their prorated credit (due to Razorpay's inability to transfer credits between subscriptions), it is the most reliable, predictable, and standard way to handle the strict limitations of UPI AutoPay. 

If we were Netflix, we would build a custom billing engine to carry over the credit as "extra days" on the new subscription. Since we rely on Razorpay's out-of-the-box subscription engine, the Cancel & Resubscribe flow is the correct architectural choice.