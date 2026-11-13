# Part 2: Inside Our Code — Every File Explained for Beginners

> **Read [Part 1](./10_NOTIFICATION_GUIDE_PART1_OUTSIDE_WORLD.md) first** if you haven't.
> Now we'll walk through every single file in our notification system.

---

## Table of Contents

1. [File Map — What's Where](#1-file-map)
2. [The Architecture — How Files Connect](#2-the-architecture)
3. [Layer 1: Types (types.ts)](#3-layer-1-types)
4. [Layer 2: Providers (fast2sms.ts, resend.ts)](#4-layer-2-providers)
5. [Layer 3: Service Layer (sms-service.ts, email-service.ts)](#5-layer-3-service-layer)
6. [Layer 4: Templates (template-processor.ts, default-templates.ts)](#6-layer-4-templates)
7. [Layer 5: Logger (notification-logger.ts)](#7-layer-5-logger)
8. [Layer 6: Orchestrator (notification-service.ts)](#8-layer-6-orchestrator)
9. [Layer 7: API Routes](#9-layer-7-api-routes)
10. [Layer 8: Credential Validation (integration-validators.ts)](#10-layer-8-credential-validation)
11. [The Strategy Pattern — Why This Architecture?](#11-the-strategy-pattern)

---

## 1. File Map — What's Where

```
src/
├── lib/
│   ├── notifications/                    ← CORE NOTIFICATION LOGIC
│   │   ├── types.ts                      ← Interfaces & type definitions
│   │   ├── template-processor.ts         ← Mini template engine ({{variables}})
│   │   ├── default-templates.ts          ← Fallback SMS/Email templates
│   │   ├── notification-logger.ts        ← Saves logs to database
│   │   └── notification-service.ts       ← 🎯 MAIN ORCHESTRATOR (entry point)
│   │
│   ├── sms/                              ← SMS CHANNEL
│   │   ├── sms-service.ts               ← SMS factory + service
│   │   └── providers/
│   │       └── fast2sms.ts              ← Fast2SMS implementation
│   │
│   ├── email/                            ← EMAIL CHANNEL
│   │   ├── email-service.ts             ← Email factory + service
│   │   └── providers/
│   │       └── resend.ts                ← Resend implementation
│   │
│   └── integration-validators.ts         ← Credential testing (Fast2SMS, Resend, etc.)
│
└── app/api/[storeId]/
    ├── notifications/
    │   ├── settings/route.ts             ← GET/PUT notification settings
    │   ├── templates/route.ts            ← GET/PUT custom templates
    │   ├── test-send/route.ts            ← POST test notification
    │   └── logs/route.ts                 ← GET notification logs
    │
    └── integrations/
        ├── validate/route.ts             ← POST validate credentials (before save)
        └── [integrationId]/test/route.ts ← POST test saved credentials
```

---

### 💡 "Template Engine" and "SMS Factory" — What Do These Words Mean?

These are **industry-standard coding patterns** used by professional developers everywhere. They sound intimidating but they're simple concepts:

#### What is a "Template Engine"?

**In everyday terms:** A template engine is just **"find-and-replace on steroids."**

You know how in Word/Docs you can do Find → `{{name}}` → Replace with → `Rahul`?
That's literally ALL a template engine does. It takes text with placeholder markers like `{{customerName}}`
and replaces them with actual values like `Rahul`.

```
The word "engine" just means "a piece of code that does one job repeatedly."
  - Game Engine    = code that runs game logic over and over
  - Search Engine  = code that searches data over and over
  - Template Engine = code that replaces placeholders over and over

Our template engine is ~80 lines of code. That's it. It's just a function.
```

**Why not just use string concatenation?**
```typescript
// ❌ Without template engine (messy, hard to maintain):
const msg = "Hi " + customer.name + ", your order #" + order.id + " is confirmed! ₹" + order.total;

// ✅ With template engine (clean, the admin can edit the template from UI):
const template = "Hi {{customerName}}, your order #{{orderId}} is confirmed! {{orderTotal}}";
const msg = processTemplate(template, variables);
```

The template engine lets **non-developers** (store admins) edit message text from the dashboard without touching code.

#### What is a "Factory"?

**In everyday terms:** A factory is just a **function that creates the right object based on a name.**

Think of a real factory — you tell it "make a car" → car, "make a truck" → truck. Same idea:

```typescript
// Our SMS Factory:
function createSMSProvider(name, credentials) {
  if (name === "fast2sms") return new Fast2SMSProvider(credentials);  // Makes a Fast2SMS sender
  if (name === "msg91")    return new MSG91Provider(credentials);     // Makes a MSG91 sender
  if (name === "twilio")   return new TwilioProvider(credentials);    // Makes a Twilio sender
}

// Usage — you don't care which provider, the factory picks the right one:
const provider = createSMSProvider("fast2sms", { api_key: "xyz" });
provider.send(phone, message);  // Works regardless of which provider
```

**Why use a factory?** Because different stores might use different SMS providers. Store A uses Fast2SMS, Store B uses MSG91. The factory reads which provider the store configured and creates the right one automatically.

The **Strategy Pattern** (Section 11) combines both:
- **Factory** = creates the right provider based on the name
- **Strategy** = all providers have the same `.send()` method, so the rest of the code doesn't care which one

These aren't advanced concepts — they're just **organized ways to write code** that professional codebases use. Now you know them too! 🎉

---

### 💡 Why Do We Have Fallback/Default SMS Templates?

"If DLT requires government-approved template IDs, why do we store templates in our code?"

1. **Right now (development/testing):** We use Quick SMS (`route: "q"`) which does NOT need DLT template IDs. Fast2SMS matches our message text against their own templates internally. So our templates ARE the actual messages being sent. Without them, we have nothing to send.

2. **For the admin UI:** Even in production (DLT mode), the admin needs to SEE what the SMS will look like — for previewing and understanding what each event sends.

---

### 🔥 "But How Does Template Editing Work in DLT Production Mode?"
This is a brilliant question. Let me clear up the confusion step by step:
**Your confusion:** "If DLT controls the template text, and we can only send a Template ID (not the message text),
then what's the point of letting admins edit templates in our app? Any edit would be rejected by DLT!"
**You are 100% correct.** In DLT production mode, admins CANNOT freely edit the SMS text.
Here's how the REAL flow works:
#### The Complete Production Template Flow:
```
STEP 1: ADMIN WRITES THE TEMPLATE (in our app)
        "Hi {{customerName}}, order #{{orderId}} confirmed! {{orderTotal}} - {{storeName}}"
        This is saved in our DB as the "desired message"
STEP 2: ADMIN REGISTERS ON DLT PORTAL (outside our app — manually on Jio/Vilpower)
        Goes to trueconnect.jio.com → Content Templates → New Template
        Converts our format to DLT format:
          "Hi {#var#}, order #{#var#} confirmed! {#var#} - {#var#}"
        Submits for approval → waits 1-7 days
STEP 3: ADMIN GETS TEMPLATE ID (from DLT portal)
        DLT approves → gives Template ID: 1107170123456789012
STEP 4: ADMIN ENTERS TEMPLATE ID IN OUR APP
        Goes to our Notification Settings → Templates → ORDER_CONFIRMED → SMS
        Enters: DLT Template ID = "1107170123456789012"
        Enters: Variable order = ["customerName", "orderId", "orderTotal", "storeName"]
        Saves.
STEP 5: WHEN AN ORDER IS PLACED (automatic)
        Our code does NOT send the message text anymore.
        Instead: POST to Fast2SMS with:
          { route: "dlt",
            sender_id: "SHPPLS",
            message: "1107170123456789012",                        ← Template ID
            variables_values: "Rahul|ORD-A1B2|₹1,299|ShopPulse"   ← Just the values
          }
        Fast2SMS fetches the approved template from DLT, fills in the values, sends.
```
#### So What Happens When Admin Wants to EDIT the SMS?
```
CAN'T just edit in our app and expect it to work:
  ❌ Admin edits template in our app → "Hey {{customerName}}! Order #{{orderId}}..."
  ❌ We send Template ID + new variable values to Fast2SMS
  ❌ But the DLT template still says "Hi {#var#}, order..." — MISMATCH!
  ❌ Actually wait — we're sending the Template ID, not text, so the text doesn't change
  ❌ The "edit" in our app has NO EFFECT on what gets sent via DLT
THE CORRECT FLOW to change SMS text in production:
  1. Admin edits the template in our app (this updates the "desired" version)
  2. Admin goes to DLT portal and registers a NEW template with the new text
  3. Waits for approval (1-7 days)
  4. Gets new Template ID
  5. Enters new Template ID in our app
  6. NOW the new text is live
```
#### What About Twilio and MSG91 — Same Thing?
**Yes, exactly the same principle.** ANY SMS provider in India must comply with DLT:
| Provider | How they handle DLT |
|----------|-------------------|
| **Fast2SMS** | Send `template_id` + `variables_values` (pipe-separated) |
| **MSG91** | Send `template_id` + variable values in the body |
| **Twilio** | Send `ContentSid` (their template ID) + content variables |
| **Kaleyra** | Send `template_id` + variables |
They ALL require the DLT Template ID. None of them accept free-form text in production for Indian SMS.
#### So What's the Point of Our Template Body in DLT Mode?
Our template body (the one admin can "edit") serves these purposes only:
1. **Preview:** Admin can see what the SMS will approximately look like
2. **Variable reference:** Shows which variables are available for this event
3. **DLT registration reference:** Admin copies this text, replaces `{{var}}` with `{#var#}`, and submits on DLT
4. **Email (no restriction):** For email channel, our template IS the actual content — no DLT involved
5. **Quick SMS (dev mode):** In development, our template IS sent as the message text
**In production DLT mode, the template body in our DB is NOT the actual text sent.** The actual text is locked inside DLT, referenced only by its Template ID.

---

3. **For email:** Email has NO DLT requirement at all. Our templates are the ONLY templates — they become the actual email body sent to customers.

4. **As a reference for DLT registration:** When you go to register templates on vilpower.in, you use our defaults as a starting point. Convert `{{orderId}}` to `{#var#}` and submit.

5. **"Fallback" means safety net:** If a store admin creates a custom template and later deletes it, we fall back to these defaults so notifications don't break.

```
Our templates = the MESSAGE you want to say (content)
DLT templates = the GOVERNMENT APPROVAL to say it (permission)
You need both. Our templates exist first, then you register them on DLT.
```

---

### 💡 What Happens in GET/PUT Custom Templates (Now vs Production)

#### Current Flow:
```
GET /api/[storeId]/notifications/templates?type=ORDER_CONFIRMED&channel=SMS
→ Check DB: custom template for this event+channel exists?
  → YES: Return custom template
  → NO:  Return default from DEFAULT_SMS_TEMPLATES
→ Response: { subject, body, isCustom: true/false, isActive: true/false }

PUT /api/[storeId]/notifications/templates
→ Body: { type, channel, body: "Custom text {{orderId}}..." }
→ Upsert into NotificationTemplate table
→ This custom template is now used instead of the default
```

#### Production Changes Needed:
| # | Change | Why |
|---|--------|-----|
| 1 | Add `dltTemplateId` to NotificationTemplate | Store the government Template ID |
| 2 | Add `dltVariableOrder` (JSON array) | Map which `{{var}}` goes to which `{#var#}` position |
| 3 | Template editor shows DLT Template ID input | Admin enters the approved ID after DLT registration |
| 4 | GET returns `dltTemplateId` alongside body | Frontend needs both |
| 5 | Add "DLT Mode" toggle in settings | Switch Quick SMS ↔ DLT SMS |

---

### 📖 Best File Reading Order (Start Here)

Read the files in this exact order. Each file builds on concepts from the previous one:

| # | File | What you learn | Why this order |
|---|------|---------------|----------------|
| 1 | `types.ts` | All interfaces and data shapes | You need to know the shapes before seeing code that uses them |
| 2 | `fast2sms.ts` | How one SMS provider works (HTTP call) | Simplest real code — one class, one method |
| 3 | `resend.ts` | How one email provider works (SDK call) | Same pattern as above, reinforces the concept |
| 4 | `sms-service.ts` | Factory pattern, credential fetching | Now you see how providers get created and used |
| 5 | `email-service.ts` | Same factory pattern for email | Repetition = understanding |
| 6 | `template-processor.ts` | Variable replacement, data flattening | How `{{orderId}}` becomes `ORD-A1B2` |
| 7 | `default-templates.ts` | See actual template strings | Now templates make sense because you know the processor |
| 8 | `notification-logger.ts` | Simple DB logging | Easy file, clears your mind before the big one |
| 9 | `notification-service.ts` | 🎯 The orchestrator — ties EVERYTHING together | Now you understand every piece it calls |
| 10 | `integration-validators.ts` | How credentials are tested before saving | Side feature, not core flow |
| 11 | API routes (all 6) | HTTP endpoints = how frontend talks to backend | Just wiring — calls the functions you already understand |

**Total: ~65 minutes** for a thorough read.

**Pro tip:** Open two VS Code tabs — this guide in one, the code file in the other. Read a section here, then look at the actual code.

---

## 2. The Architecture — How Files Connect

When an order is confirmed and we need to notify the customer, here's the call chain:

```
Your order API code calls:
  notificationService.trigger(storeId, 'ORDER_CONFIRMED', orderData)
     │
     ├── 1. Fetches NotificationSettings from DB
     │      "Is email enabled? Is SMS enabled?"
     │
     ├── 2. Calls flattenEventData('ORDER_CONFIRMED', orderData)
     │      Converts nested data → flat variables { orderId, customerName, ... }
     │
     ├── 3. Calls resolveTemplate(storeId, 'ORDER_CONFIRMED', 'SMS')
     │      Checks DB for custom template → falls back to default
     │
     ├── 4. Calls processTemplate(templateString, variables)
     │      "Hi {{customerName}}..." → "Hi Rahul..."
     │
     ├── 5. Calls smsService.send(storeId, phone, processedMessage)
     │      │
     │      ├── Gets stored credentials from DB (encrypted)
     │      ├── Decrypts them
     │      ├── Creates Fast2SMSProvider(credentials)
     │      └── Calls provider.send(phone, message)
     │            │
     │            └── HTTP POST to fast2sms.com/dev/bulkV2
     │
     ├── 6. Same flow for email via emailService.send()
     │
     └── 7. Calls logNotification() for each attempt
            Saves to NotificationLog table in DB
```

---

## 3. Layer 1: Types (`types.ts`)

📄 **File:** `src/lib/notifications/types.ts`

**What it does:** Defines the "shape" of every data structure used in the notification system. No logic — just TypeScript interfaces.

### Key Concepts:

#### Provider Interfaces (The Strategy Pattern Contract)

```typescript
// Every SMS provider (Fast2SMS, MSG91, Twilio, etc.) MUST have these:
interface SMSProvider {
  providerId: string;                    // e.g., "fast2sms"
  send(phone, message): Promise<...>;    // The actual sending logic
}

// Every email provider (Resend, SendGrid, etc.) MUST have these:
interface EmailProvider {
  providerId: string;                    // e.g., "resend"
  send(params): Promise<...>;            // The actual sending logic
}
```

**Why?** Because our service layer doesn't care WHICH provider it's using. It just calls `.send()`. This is the Strategy Pattern.

#### ProviderSendResult — What comes back after sending

```typescript
interface ProviderSendResult {
  success: boolean;         // Did it work?
  messageId?: string;       // Provider's tracking ID (for delivery reports later)
  error?: string;           // What went wrong (if success is false)
}
```

Every provider (Fast2SMS, Resend) returns this exact shape. So the code that calls them doesn't need to know which provider was used.

#### NotificationEventDataMap — What data goes with each event

```typescript
interface NotificationEventDataMap {
  ORDER_CONFIRMED:      OrderConfirmedData;     // order + customer + store info
  ORDER_SHIPPED:        OrderShippedData;        // + shipment tracking info
  ORDER_DELIVERED:      OrderDeliveredData;      // + delivery timestamp
  ORDER_CANCELLED:      OrderCancelledData;      // + cancellation reason
  PAYMENT_FAILED:       PaymentFailedData;       // + retry URL
  REFUND_PROCESSED:     RefundProcessedData;     // + refund amount
  LOW_STOCK_ALERT:      LowStockAlertData;       // product + stock info (admin)
  NEW_ORDER_ALERT:      NewOrderAlertData;       // order summary (admin)
  ORDER_OUT_FOR_DELIVERY: OrderOutForDeliveryData;
}
```

This maps each event type to the EXACT data shape it needs. So when you call `trigger('ORDER_CONFIRMED', data)`, TypeScript ensures you pass the right data.

#### Per-Event Data Shapes

Each event has a specific shape. For example:

```typescript
interface OrderConfirmedData {
  order: {
    id: string;
    displayId: string;        // "ORD-A1B2C3" (human-readable)
    total: number;            // 1299
    itemCount: number;        // 2
    items: OrderItem[];       // Array of items
    paymentMethod: 'PREPAID' | 'COD';
  };
  customer: OrderCustomer;    // { name, email, phone }
  store: StoreInfo;           // { name, url, logoUrl }
  trackingUrl?: string;       // Optional
}
```

**The `?` means optional** — not every order has a tracking URL at confirmation time.

---

## 4. Layer 2: Providers (`fast2sms.ts`, `resend.ts`)

These files contain the ACTUAL code that talks to external APIs.

### 4a. Fast2SMS Provider (`src/lib/sms/providers/fast2sms.ts`)

📄 **What it does:** Sends one SMS via Fast2SMS's API.

#### The Constructor

```typescript
class Fast2SMSProvider implements SMSProvider {
  constructor(credentials: Record<string, string>) {
    this.apiKey = credentials.api_key;     // From encrypted DB storage
  }
}
```

Takes the decrypted API key. That's all Fast2SMS needs.

#### The Send Method 

### 4b. Resend Provider (`src/lib/email/providers/resend.ts`)

📄 **What it does:** Sends one email via Resend's API.

#### The Constructor

```typescript
class ResendProvider implements EmailProvider {
  constructor(credentials: Record<string, string>) {
    this.client = new Resend(credentials.api_key);     // Resend SDK
    this.fromEmail = credentials.from_email;            // "orders@send.yourstore.com"
    this.defaultFromName = credentials.from_name || ''; // "ShopPulse" (optional)
  }
}
```

Needs 2-3 credentials: API key, verified sender email, optional display name.

Clean and simple — the Resend SDK handles all the HTTP/auth complexity.

---

## 5. Layer 3: Service Layer (`sms-service.ts`, `email-service.ts`)

These files sit BETWEEN the orchestrator and the providers. They handle:
1. Fetching stored credentials from the database
2. Decrypting them
3. Creating the right provider instance
4. Calling `.send()`

### How `smsService.send()` works:

```typescript
async send(storeId, phone, message) {
  // 1. Get the active SMS integration for this store
  const integration = await integrationService.getCredentials(storeId, 'SMS_PROVIDER');
  // Returns: { provider: "fast2sms", credentials: { api_key: "abc..." } }

  if (!integration) return null;  // No SMS provider configured → silent skip

  // 2. Create the right provider (Strategy Pattern Factory)
  const provider = createSMSProvider(integration.provider, integration.credentials);
  // createSMSProvider("fast2sms", { api_key }) → new Fast2SMSProvider({ api_key })

  // 3. Send
  const result = await provider.send(phone, message);

  return { result, provider: integration.provider };
}
```

### The Factory Function (Strategy Pattern)

```typescript
function createSMSProvider(providerName, credentials): SMSProvider {
  switch (providerName) {
    case 'fast2sms':   return new Fast2SMSProvider(credentials);
    // case 'msg91':   return new MSG91Provider(credentials);    ← Future
    // case 'twilio':  return new TwilioProvider(credentials);   ← Future
    default: throw new Error(`Unknown SMS provider: ${providerName}`);
  }
}
```

**Adding a new provider** = adding one `case` statement + one provider file. Nothing else changes!

### `emailService.send()` — Exactly the same pattern

---

## 6. Layer 4: Templates (`template-processor.ts`, `default-templates.ts`)

### 6a. Template Processor (`template-processor.ts`)

📄 **What it does:** Takes a template string with `{{variables}}` and replaces them with real values.

This is our **own mini template engine** — no external library needed (under 80 lines of code).

#### `processTemplate()` — The Template Engine

It supports 3 features:

**Feature 1: Simple Variables**
```
Template: "Hi {{customerName}}, your order #{{orderId}} is confirmed!"
Variables: { customerName: "Rahul", orderId: "ORD-A1B2" }
Result:   "Hi Rahul, your order #ORD-A1B2 is confirmed!"
```

How it works:
```typescript
result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
  return String(variables[varName] ?? '');
});
// Regex finds every {{word}} and replaces it with the value from variables
```

**Feature 2: Array Iteration (for item lists)**
```
Template: "Items: {{#items}}• {{name}} x{{quantity}} {{/items}}"
Variables: { items: [{ name: "Phone", quantity: 1 }, { name: "Case", quantity: 2 }] }
Result:   "Items: • Phone x1 • Case x2"
```

How it works:
```typescript
result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, arrayName, inner) => {
  const arr = variables[arrayName];
  return arr.map(item => {
    // Replace {{key}} inside the loop with each item's properties
  }).join('');
});
```

**Feature 3: Conditionals**
```
Template: "Order confirmed. {{#if trackingUrl}}Track: {{trackingUrl}} {{/if}}Thanks!"
Variables: { trackingUrl: "https://..." }     → "Order confirmed. Track: https://... Thanks!"
Variables: { trackingUrl: "" }                → "Order confirmed. Thanks!"
```

How it works:
```typescript
result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, varName, content) => {
  return variables[varName] ? content : '';  // Show content only if variable is truthy
});
```

#### `flattenEventData()` — Converting Nested Data to Flat Variables

**The problem:** Our event data is nested (organized in objects), but templates use flat variable names.

```
Event data (nested):                    Template variables (flat):
{                                       {
  order: {                                orderId: "ORD-A1B2",
    displayId: "ORD-A1B2",               orderTotal: "₹1,299",
    total: 1299                           customerName: "Rahul",
  },                                      storeName: "ShopPulse",
  customer: {                             ...
    name: "Rahul Sharma"               }
  },
  store: {
    name: "ShopPulse"
  }
}
```

`flattenEventData()` does this conversion:

```typescript
function flattenEventData(type: string, data): Record<string, unknown> {
  const vars = {};

  // Store info (available in ALL events)
  const store = data.store;
  vars.storeName = store?.name ?? '';
  vars.storeUrl = store?.url ?? '';

  // Customer info (available in MOST events)
  const customer = data.customer;
  vars.customerName = customer?.name?.split(' ')[0];  // "Rahul Sharma" → "Rahul"
  vars.customerFullName = customer?.name ?? '';

  // Order info
  const order = data.order;
  vars.orderId = order?.displayId ?? order?.id ?? '';
  vars.orderTotal = `₹${Number(order?.total).toLocaleString('en-IN')}`;  // 1299 → "₹1,299"

  // Event-specific variables
  switch (type) {
    case 'ORDER_SHIPPED':
      vars.trackingNumber = data.shipment?.trackingNumber ?? '';
      vars.courierName = data.shipment?.courierName ?? '';
      break;
    case 'REFUND_PROCESSED':
      vars.refundAmount = `₹${Number(data.refundAmount).toLocaleString('en-IN')}`;
      break;
    // ... other events
  }

  return vars;
}
```

**Why "flatten"?** Because templates can't do `{{order.displayId}}` — they can only do `{{orderId}}`. So we flatten `order.displayId` → `orderId`.

### 6b. Default Templates (`default-templates.ts`)

📄 **What it does:** Provides ready-to-use SMS and email templates. These are used when the store owner hasn't created custom templates.

**3 categories of templates:**

| Category | For whom | Stored in |
|----------|----------|-----------|
| `DEFAULT_SMS_TEMPLATES` | Customer (SMS) | 7 event types |
| `DEFAULT_EMAIL_TEMPLATES` | Customer (Email) | 7 event types with HTML |
| `DEFAULT_ADMIN_TEMPLATES` | Store owner (Email) | 2 event types (low stock, new order) |

Example SMS template:
```typescript
ORDER_CONFIRMED: {
  body: '✅ Order {{orderId}} confirmed! {{orderTotal}} ({{paymentNote}}). {{#if trackingUrl}}Track: {{trackingUrl}} {{/if}}- {{storeName}}',
}
// Result: "✅ Order ORD-A1B2 confirmed! ₹1,299 (Paid). Track: https://... - ShopPulse"
```

Example Email template:
```typescript
ORDER_CONFIRMED: {
  subject: 'Order Confirmed — {{orderId}} 🎉',
  body: `<div style="font-family:sans-serif;">
    <h2>Order Confirmed!</h2>
    <p>Hi {{customerName}},</p>
    <p>Thank you for your order...</p>
    <table>
      <tr><td>Order</td><td>{{orderId}}</td></tr>
      <tr><td>Total</td><td>{{orderTotal}}</td></tr>
    </table>
  </div>`,
}
```

Also exports `TEMPLATE_VARIABLES` — metadata for the UI template editor:
```typescript
TEMPLATE_VARIABLES: {
  ORDER_CONFIRMED: [
    { name: 'orderId', description: 'Order ID (e.g. ORD-A1B2C3)' },
    { name: 'customerName', description: 'Customer first name' },
    { name: 'orderTotal', description: 'Order total with currency (₹1,299)' },
    // ...
  ],
}
```

This tells the admin: "When editing the ORDER_CONFIRMED template, these variables are available."

---

## 7. Layer 5: Logger (`notification-logger.ts`)

📄 **What it does:** Saves every notification attempt to the database.

```typescript
async function logNotification(params) {
  await prismadb.notificationLog.create({
    data: {
      storeId:    params.storeId,
      type:       params.type,        // ORDER_CONFIRMED
      channel:    params.channel,     // SMS or EMAIL
      provider:   params.provider,    // "fast2sms" or "resend"
      recipient:  params.recipient,   // phone or email
      status:     params.status,      // SENT, FAILED, etc.
      externalId: params.externalId,  // Provider's tracking ID
      error:      params.error,       // Error message (if failed)
      sentAt:     new Date(),         // When it was sent
    },
  });
}
```

**Key design:** This is **fire-and-forget**. If logging fails (DB down, etc.), it logs to Winston and moves on. It NEVER throws an error that would break the notification flow.

Why? Because if you're sending an "Order Confirmed" SMS, and the log DB write fails, you'd rather the SMS still goes out. The log is nice-to-have; the SMS is critical.

---

## 8. Layer 6: Orchestrator (`notification-service.ts`)

📄 **File:** `src/lib/notifications/notification-service.ts`

🎯 **This is the MOST IMPORTANT file.** It's the single entry point for the entire system.

### `trigger()` — The Main Method

This is what you call from anywhere in the app:

```typescript
notificationService.trigger(storeId, 'ORDER_CONFIRMED', orderData);
```

Here's what it does, step by step:

```
trigger(storeId, 'ORDER_CONFIRMED', orderData)
  │
  ├── Step 1: Get NotificationSettings from DB
  │    "For this store, what's enabled?"
  │    Example: { emailOrderConfirmed: true, smsOrderConfirmed: true }
  │
  ├── Step 2: Flatten event data
  │    orderData → { orderId: "ORD-A1B2", customerName: "Rahul", ... }
  │
  ├── Step 3: Is this an admin alert?
  │    LOW_STOCK_ALERT or NEW_ORDER_ALERT → yes → send to admin email only
  │    Everything else → no → send to customer
  │
  ├── Step 4: Check if email is enabled for this event
  │    settings.emailOrderConfirmed === true?
  │    │
  │    └── YES → dispatchEmail()
  │         ├── resolveTemplate() → get template (custom or default)
  │         ├── processTemplate() → fill in variables
  │         ├── emailService.send() → send via Resend
  │         └── logNotification() → record in DB
  │
  └── Step 5: Check if SMS is enabled for this event
       settings.smsOrderConfirmed === true?
       │
       └── YES → dispatchSMS()
            ├── resolveTemplate() → get template (custom or default)
            ├── processTemplate() → fill in variables
            ├── smsService.send() → send via Fast2SMS
            └── logNotification() → record in DB
```

### `isEventEnabled()` — Smart Settings Key Mapping

The settings table has columns like `emailOrderConfirmed`, `smsOrderShipped`, etc.

```typescript
function isEventEnabled(settings, channel, eventType) {
  // channel: "email", eventType: "ORDER_CONFIRMED"
  // → builds key: "emailOrderConfirmed"

  const key = `${channel}${eventType
    .split('_')                        // ["ORDER", "CONFIRMED"]
    .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase())  // ["Order", "Confirmed"]
    .join('')}`;                       // "OrderConfirmed"

  // channel + result = "emailOrderConfirmed"

  return settings[key] === true;
}
```

### `resolveTemplate()` — Custom vs Default Templates

```typescript
async function resolveTemplate(storeId, eventType, channel) {
  // 1. Check if store has a CUSTOM template in the DB
  const custom = await prismadb.notificationTemplate.findUnique({
    where: { storeId_type_channel: { storeId, type: eventType, channel } },
  });

  if (custom?.isActive && custom.body) {
    return { subject: custom.subject, body: custom.body };  // Use custom!
  }

  // 2. No custom template → use default
  return DEFAULT_SMS_TEMPLATES[eventType]; // or DEFAULT_EMAIL_TEMPLATES
}
```

### `sendTest()` — Test Notifications

For the "Send Test" button in the UI. Creates fake order data and sends:

```typescript
async sendTest(storeId, channel, recipient, eventType) {
  const testData = {
    order: { id: 'test-order', displayId: 'ORD-TEST', total: 1299, ... },
    customer: { name: 'Test Customer', email: recipient, phone: recipient },
    store: { name: 'Your Store', url: 'https://example.com' },
  };

  const variables = flattenEventData(eventType, testData);

  if (channel === 'SMS') return dispatchSMS(storeId, recipient, eventType, variables);
  return dispatchEmail(storeId, recipient, eventType, variables);
}
```

### Critical Design: Never Throws

The entire `trigger()` is wrapped in try-catch:

```typescript
async trigger(storeId, eventType, data) {
  try {
    // ... all the logic ...
  } catch (err) {
    // Log it, but NEVER throw
    logger.error('Notification trigger error', { ... });
  }
  return results;  // Always returns, even if empty
}
```

**Why?** If a customer places an order and the SMS send fails, we DON'T want the order to fail. The order should succeed regardless. Notifications are a side effect, not the main action.

---

## 9. Layer 7: API Routes

These are the HTTP endpoints that the admin dashboard (frontend) calls.

### Settings Route (`notifications/settings/route.ts`)

| Method | What it does |
|--------|-------------|
| `GET` | Fetches the store's notification settings |
| `PUT` | Updates settings (which events are enabled, branding, etc.) |

The PUT has a **whitelist** of allowed fields — you can only update known fields:
```typescript
const allowedFields = [
  'emailOrderConfirmed', 'smsOrderConfirmed',
  'adminNewOrderAlert', 'adminAlertEmail',
  'emailFromName', 'smsSignature',
  // ... etc
];
```

Uses `prisma.upsert()` — creates settings if they don't exist, updates if they do.

### Templates Route (`notifications/templates/route.ts`)

| Method | What it does |
|--------|-------------|
| `GET` | Gets templates (all, or specific type+channel) |
| `PUT` | Creates or updates a custom template |

When getting a specific template, it returns the **effective** template (custom or default):
```typescript
// If custom exists and is active → return custom
// Otherwise → return default from DEFAULT_SMS_TEMPLATES / DEFAULT_EMAIL_TEMPLATES
```

### Test Send Route (`notifications/test-send/route.ts`)

| Method | What it does |
|--------|-------------|
| `POST` | Sends a test notification to verify everything works |

Body: `{ channel: "EMAIL", recipient: "test@gmail.com", eventType: "ORDER_CONFIRMED" }`

Validates the recipient format, then calls `notificationService.sendTest()`.

### Logs Route (`notifications/logs/route.ts`)

| Method | What it does |
|--------|-------------|
| `GET` | Fetches paginated notification logs with filters |

Query params: `?page=1&limit=20&type=ORDER_CONFIRMED&channel=SMS&status=SENT`

Returns logs with pagination info (total, pages, hasNext, hasPrev).

---

## 10. Layer 8: Credential Validation (`integration-validators.ts`)

📄 **What it does:** Tests if credentials are valid BEFORE saving them.

This is used in 2 places:
1. **Pre-save validation** (`/api/[storeId]/integrations/validate`) — user enters credentials, we test them
2. **Post-save test** (`/api/[storeId]/integrations/[id]/test`) — user clicks "Test Connection"

Both call the **same** `validateIntegration()` function.

### How each validator works:

**Fast2SMS Validator:**
```typescript
// Calls the wallet balance API
// If it returns balance → credentials are valid
fetch('https://www.fast2sms.com/dev/wallet', {
  headers: { authorization: credentials.api_key },
});
// Success: "Connected to Fast2SMS (Wallet balance: ₹150)"
// Failure: "Invalid API key"
```

**Resend Validator:**
```typescript
// Calls the domains list API
// If it returns domains → credentials are valid
fetch('https://api.resend.com/domains', {
  headers: { Authorization: `Bearer ${credentials.api_key}` },
});
// Success: "Connected to Resend (2 verified domains)"
// Failure: "Invalid API key"
```

---

## 11. The Strategy Pattern — Why This Architecture?

### The Problem: What if we want to switch from Fast2SMS to MSG91?

Without the Strategy Pattern:
```typescript
// ❌ BAD: Provider logic mixed into business logic
if (provider === 'fast2sms') {
  await fetch('https://fast2sms.com/...', { body: { route: 'q', message } });
} else if (provider === 'msg91') {
  await fetch('https://msg91.com/...', { body: { authkey, template_id } });
} else if (provider === 'twilio') {
  await twilio.messages.create({ body: message, to: phone });
}
```

Every time you add a provider, you touch the core code. Messy, error-prone.

### The Solution: Strategy Pattern

```
                 ┌────────────────────┐
                 │  SMSProvider       │  ← Interface (contract)
                 │  • send(phone, msg)│
                 └────────┬───────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
┌─────────▼──────┐ ┌─────▼────────┐ ┌────▼─────────┐
│ Fast2SMSProvider│ │ MSG91Provider │ │ TwilioProvider│ ← Implementations
│ • send()       │ │ • send()     │ │ • send()      │
│  (HTTP to      │ │  (HTTP to    │ │  (Twilio SDK) │
│   fast2sms.com)│ │   msg91.com) │ │               │
└────────────────┘ └──────────────┘ └───────────────┘
```

The service layer only knows about `SMSProvider.send()`. It doesn't care about the implementation.

**Adding a new provider:**
1. Create `src/lib/sms/providers/msg91.ts` (implements `SMSProvider`)
2. Add one line in `smsService.ts`: `case 'msg91': return new MSG91Provider(creds);`
3. Done! Everything else works automatically.

---

> **Next:** [Part 3 — The Complete Flow](./12_NOTIFICATION_GUIDE_PART3_COMPLETE_FLOW.md) — How outside world + our code work together end-to-end.
