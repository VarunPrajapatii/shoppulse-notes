# Research 1: Razorpay UPI e-Mandate Upgrade Flow & RBI Guidelines

**Topic**: Deep dive into Razorpay's UPI AutoPay behavior during subscription upgrades (e.g., Monthly ₹1,000 to Half-Yearly ₹6,000 or Annually ₹12,000).

## 1. The Core Problem: The Mandate `max_amount` vs RBI Limits

When dealing with UPI AutoPay in India, there are two limits. Since your new pricing (₹1,000, ₹6,000, ₹12,000) is entirely **under the RBI's ₹15,000 AFA limit**, the RBI limit is no longer the blocker. The entire flow now depends on the **Mandate-Specific `max_amount`**.

### A. The RBI AFA (Additional Factor of Authentication) Limit
*   The absolute ceiling for "silent" recurring payments (auto-debit without requiring an OTP or UPI PIN) is **₹15,000** per transaction.
*   Since your highest plan is ₹12,000, **all your plans are eligible for silent auto-charge**, legally speaking.

### B. The Mandate-Specific `max_amount` (The Real Blocker)
When a user first subscribes to your ₹1,000/month plan, they enter their UPI PIN to authorize a mandate. 
*   During this creation, a `max_amount` is hardcoded into the mandate. 
*   **The Rule**: The bank will absolutely reject *any* charge that exceeds this specific `max_amount`, even if it's under the RBI's ₹15,000 limit.

## 2. Answering Your Question: "If I ask user 'Amount: ₹1000, Max Amount: ₹14999', will our update work?"

**YES.** If the user authorizes a mandate with a `max_amount` of ₹14,999 during the initial ₹1,000 checkout, the `subscriptions.update` API will work perfectly when they upgrade to ₹6,000 or ₹12,000. The prorated difference will be silently auto-charged.

**HOWEVER, there is a massive technical catch regarding HOW you implement this.**

## 3. What changes do you have to do in code to implement this flow?

To implement a custom `max_amount` (₹14,999) for a ₹1,000 plan, **you must completely rewrite your billing architecture.**

### Why?
You are currently using Razorpay's **Subscriptions API** (`POST /v1/subscriptions`). 
*   The Subscriptions API is an "out-of-the-box" engine. 
*   It **does not** expose a `max_amount` parameter. 
*   It automatically calculates the mandate `max_amount` based on the `plan_id` amount (₹1,000). 
*   You cannot tell the Subscriptions API to "charge ₹1,000 but ask for a ₹14,999 mandate limit."

### The Required Code Changes (Migrating to Token HQ)
To achieve the "Amount: ₹1000, Max Amount: ₹14999" flow, you must abandon the Subscriptions API and migrate to **Razorpay Token HQ (Recurring Payments via Orders API)**.

This means you have to build your own subscription engine from scratch:
1.  **Create an Order (Not a Subscription)**: You call the Orders API and pass `token: { max_amount: 1499900 }`.
2.  **User Authorizes**: The user sees "Amount: ₹1000, Max Amount: ₹14999" and enters their UPI PIN.
3.  **Capture the Token**: Razorpay gives you a `token_id` representing the mandate.
4.  **Build a Cron Job**: You must write a server-side cron job that runs every month, uses the `token_id`, and calls the Razorpay Payments API to charge the user ₹1,000.
5.  **Handle Upgrades Manually**: When the user upgrades to ₹6,000, you must calculate the prorated difference yourself, charge them using the `token_id`, and update your database so your cron job knows to charge them ₹6,000 every 6 months going forward.

## 4. Summary & Recommendation

*   **Can it work?** Yes, a ₹14,999 mandate limit allows silent upgrades to ₹6,000 and ₹12,000.
*   **How do Netflix/Spotify do it?** They use Token HQ (Orders API). They built their own massive billing engines with custom cron jobs, proration logic, and dunning management. They do not use Razorpay's out-of-the-box Subscriptions API.
*   **What should you do?** Since you are using the Razorpay Subscriptions API, you cannot set a custom `max_amount`. Therefore, **the "Cancel & Resubscribe" flow is the ONLY correct architectural choice for your current codebase.** It saves you from having to build and maintain a complex, error-prone custom billing engine.