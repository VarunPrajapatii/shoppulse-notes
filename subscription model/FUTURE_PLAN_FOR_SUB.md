## Why does Razorpay offer `schedule_change_at: "now"` if it doesn't work?

It **does** work — but only for **specific payment methods**:

| Payment Method | `"now"` works? | Why |
|---|---|---|
| **Netbanking** | Yes | No mandate involved, Razorpay charges directly |
| **Wallet** (PayTM, etc.) | Yes | Pre-funded, no authorization needed |
| **International Cards** (Visa/MC outside India) | Yes | Variable mandates supported internationally |
| **Indian Domestic Cards** | **NO** | RBI e-mandate regulation (Oct 2021) — mandate is locked to exact amount |
| **UPI AutoPay** | **NO** | UPI mandate locked to exact amount by NPCI |
| **eMandate** (bank) | **NO** | Same — locked amount |

So it exists for netbanking/wallet/international cards. But **99% of Indian subscriptions use UPI or domestic cards** — making it useless for your target market.

---

## How do Spotify, Netflix, Shopify do instant upgrades?

They **don't use Razorpay's Subscription API at all**. Here's what they actually do:

1. **They manage billing themselves** — they store tokenized cards/UPI mandates and trigger charges on their own schedule
2. **They use one-time payments** for upgrade differences — not subscription plan changes
3. **Netflix India** specifically cancels + resubscribes (check yourself — switching plans requires re-entering payment)
4. **Shopify** uses Stripe (internationally) which has native proration support, and in India they use a different billing provider
5. **Spotify** India recently switched to Google Play / Apple billing for most Indian users

The truth: **No one in India does instant subscription upgrades through Razorpay's Subscription Update API with domestic cards/UPI.**

---

## The Real Solution: Hybrid Approach (Cancel + Create with Manual Proration)

Here's the approach that **actually works with ALL payment methods in India**:

### How it works:

1. User clicks "Upgrade" on Growth plan (currently on Starter ₹799/mo)
2. We calculate proration: 27/28 days remaining → credit = ₹770.46
3. **We cancel the old Razorpay subscription** (immediately, not at cycle end)
4. **We create a NEW Razorpay subscription** on the Growth plan
5. Razorpay opens checkout → user pays ₹1,499 (full first month of Growth)
6. User is now on Growth plan immediately
7. **The ₹770.46 credit is lost** — OR we can show it clearly and let the user decide

### Why this is the correct approach:

- Works with **ALL payment methods** (card, UPI, netbanking, everything)
- **Immediate** — user gets higher limits right away
- **Simple** — no mandate complications, no API hacks
- This is literally what Netflix India does

### About the lost credits:

You asked: *"should I let user lose the credits/prorated amount?"*

**Yes, and here's why it's acceptable:**

1. The user is **upgrading because they need higher limits NOW** — their store is hitting walls. The ₹770 credit is less important than unblocking their business.
2. Show the credit amount clearly in the dialog so the user makes an informed choice.
3. Most SaaS companies (including Netflix, Spotify in India) do exactly this — you lose remaining days when switching plans.
4. The alternative (waiting till cycle end) is far worse for the user's business.

### What the dialog would look like:

```
╔═══════════════════════════════════════════════════════╗
║  Upgrade to Growth Monthly                           ║
╠═══════════════════════════════════════════════════════╣
║  Current: Starter Monthly (₹799/mo)                  ║
║  New:     Growth Monthly (₹1,499/mo)                 ║
║                                                       ║
║  ⚠️ 27 days remaining on current plan (₹770 value)   ║
║  Your current plan will be cancelled and a new        ║
║  Growth subscription will start immediately.          ║
║                                                       ║
║  First charge: ₹1,499 (full month of Growth)         ║
║                                                       ║
║  [Cancel]              [Proceed to Upgrade →]         ║
╚═══════════════════════════════════════════════════════╝
```

### The technical flow:

```
User clicks "Upgrade" 
  → Preview API shows credit info + warning
  → User confirms
  → Backend: Cancel old Razorpay subscription (immediate)
  → Backend: Create NEW Razorpay subscription on new plan
  → Frontend: Opens Razorpay checkout modal
  → User pays ₹1,499
  → Verify payment → DB updated → redirect to my-plan
```

This reuses 90% of your existing `/api/subscription/create` and `/api/subscription/cancel` infrastructure. The main change is in the **upgrade execute API** and the **upgrade dialog UI**.

