# Design Patterns You've Built — Template Engine & Factory Pattern

> **Why this file exists:** You've already implemented these patterns in ShopPulse without realizing it.
> This guide teaches you the concepts in depth — so this becomes a coding skill you OWN, not just code you copy-pasted.
>
> After reading this, you'll recognize these patterns in every professional codebase you ever read.

---

## Table of Contents

1. [What Are Design Patterns?](#1-what-are-design-patterns)
2. [The Template Engine — From Zero to Expert](#2-the-template-engine)
3. [The Factory Pattern — From Zero to Expert](#3-the-factory-pattern)
4. [The Strategy Pattern — Factory's Best Friend](#4-the-strategy-pattern)
5. [Where These Patterns Appear in the Real World](#5-where-these-patterns-appear-in-the-real-world)
6. [Practice Exercises](#6-practice-exercises)
7. [How All 3 Work Together in ShopPulse](#7-how-all-3-work-together-in-shoppulse)

---

## 1. What Are Design Patterns?

### The Simplest Explanation

Design patterns are **recipes for solving common coding problems.**

Just like cooking recipes:
- You don't invent "boiling water" every time you cook — you follow a known technique
- Similarly, you don't invent "how to swap providers" every time — you use the **Strategy Pattern**

There are ~23 famous design patterns (from the "Gang of Four" book, 1994). You don't need to learn all of them. We'll cover 3 that are in your ShopPulse code right now:

| Pattern | What problem it solves | Where in ShopPulse |
|---------|----------------------|-------------------|
| **Template Engine** | "I need to generate dynamic text from a template + data" | `template-processor.ts` |
| **Factory** | "I need to create the right object without knowing which one ahead of time" | `sms-service.ts`, `email-service.ts` |
| **Strategy** | "I need to swap algorithms/providers without changing the rest of my code" | `SMSProvider` interface + providers |

---

## 2. The Template Engine — From Zero to Expert

### 2.1 The Problem

You need to generate personalized messages. You have:
- A **template** (the structure): `"Hi {{name}}, you ordered {{item}}"`
- **Data** (the values): `{ name: "Rahul", item: "iPhone 15" }`
- **Expected output**: `"Hi Rahul, you ordered iPhone 15"`

### 2.2 Level 0: String Concatenation (The Beginner Way)

```typescript
// This is what beginners do:
const message = "Hi " + name + ", you ordered " + item;
```

**Problems:**
- Messy when the message is long
- Non-developers can't edit the template (they'd need to understand code)
- Can't store templates in a database
- Can't let admins customize messages from a UI

### 2.3 Level 1: Template Literals (The JavaScript Way)

```typescript
// Better, but still code:
const message = `Hi ${name}, you ordered ${item}`;
```

**Still problems:**
- The template is hardcoded IN the code
- Admin can't change it from a dashboard
- You'd need to rebuild and redeploy the app to change a message

### 2.4 Level 2: Basic Template Engine (What We Built) ⭐

```typescript
// The template is just a STRING — can come from a database, API, or admin UI:
const template = "Hi {{name}}, you ordered {{item}}";
const data = { name: "Rahul", item: "iPhone 15" };
const message = processTemplate(template, data);
// → "Hi Rahul, you ordered iPhone 15"
```

**Why this is powerful:**
- Template is a **data string**, not code — it can be stored in DB and edited by admins
- The `processTemplate()` function is the "engine" that does the replacement
- Separation of concerns: the MESSAGE is separate from the CODE

### 2.5 Building a Template Engine Step by Step

Let's build one from scratch, starting simple and adding features:

#### Step 1: The Simplest Possible Version (5 lines)

```typescript
function processTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] ?? '';
  });
}
```

**Breaking this down:**

```
/\{\{(\w+)\}\}/g     ← This is a Regular Expression (regex)

\{\{                  ← Match literal {{ characters
(\w+)                 ← Capture one or more "word characters" (letters, numbers, underscore)
                         This captured text is the variable name (e.g., "name", "orderId")
\}\}                  ← Match literal }} characters
/g                    ← "global" flag — find ALL matches, not just the first one
```

**How `.replace()` works with a function:**

```typescript
template.replace(regex, (match, key) => {
  // match = the full match, e.g., "{{name}}"
  // key   = the captured group, e.g., "name"
  return data[key] ?? '';
  // Look up "name" in data object → "Rahul"
  // If key doesn't exist in data, return empty string ''
});
```

**Example walkthrough:**

```
Template: "Hi {{name}}, your order #{{orderId}} is confirmed!"
Data:     { name: "Rahul", orderId: "ORD-A1B2" }

Step 1: Regex finds "{{name}}"      → key = "name"     → data["name"] = "Rahul"     → replace
Step 2: Regex finds "{{orderId}}"   → key = "orderId"  → data["orderId"] = "ORD-A1B2" → replace
Result: "Hi Rahul, your order #ORD-A1B2 is confirmed!"
```

**That's it.** That's a template engine. 5 lines. Not scary at all.

#### Step 2: Adding Array Iteration (for lists of items)

What if you want to list order items?

```
Template: "Your items: {{#items}}• {{name}} x{{qty}} {{/items}}"
Data:     { items: [{ name: "Phone", qty: 1 }, { name: "Case", qty: 2 }] }
Expected: "Your items: • Phone x1 • Case x2 "
```

```typescript
function processTemplate(template: string, data: Record<string, unknown>): string {
  let result = template;

  // FEATURE 1: Array iteration {{#arrayName}}...content...{{/arrayName}}
  result = result.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (match, arrayName, innerTemplate) => {
      const arr = data[arrayName];
      if (!Array.isArray(arr)) return '';

      return arr.map(item => {
        // For each item in the array, replace {{key}} with item[key]
        return innerTemplate.replace(/\{\{(\w+)\}\}/g, (m, key) => {
          return String((item as Record<string, unknown>)[key] ?? '');
        });
      }).join('');
    }
  );

  // FEATURE 2: Simple variables {{variableName}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return String(data[key] ?? '');
  });

  return result;
}
```

**Regex breakdown for arrays:**

```
/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g

\{\{#(\w+)\}\}    ← Match opening tag: {{#items}}  (captures "items")
([\s\S]*?)         ← Match ANYTHING in between (the inner template), non-greedy
\{\{\/\1\}\}      ← Match closing tag: {{/items}}  (\1 = whatever was captured in first group)
```

The `\1` is a **backreference** — it says "match the same text that was captured earlier." So `{{#items}}...{{/items}}` works, but `{{#items}}...{{/orders}}` would NOT match.

#### Step 3: Adding Conditionals (show/hide content)

```
Template: "Order confirmed. {{#if trackingUrl}}Track here: {{trackingUrl}} {{/if}}Thanks!"
Data:     { trackingUrl: "https://track.com/123" }
Expected: "Order confirmed. Track here: https://track.com/123 Thanks!"

Data:     { trackingUrl: "" }   (or no trackingUrl at all)
Expected: "Order confirmed. Thanks!"
```

```typescript
// Add this BEFORE the simple variable replacement:
result = result.replace(
  /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
  (match, varName, content) => {
    return data[varName] ? content : '';
    // If variable is truthy (exists and not empty) → show content
    // If variable is falsy (undefined, null, empty string, 0) → hide content
  }
);
```

#### The Complete Template Engine (What ShopPulse Uses)

Combining all 3 features:

```typescript
export function processTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  let result = template;

  // Step 1: Array iteration {{#items}}...{{/items}}
  result = result.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (match, arrayName, inner) => {
      const arr = variables[arrayName];
      if (!Array.isArray(arr)) return '';
      return arr.map(item => {
        return inner.replace(/\{\{(\w+)\}\}/g, (m, k) =>
          String((item as Record<string, unknown>)[k] ?? '')
        );
      }).join('');
    }
  );

  // Step 2: Conditionals {{#if var}}...{{/if}}
  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, varName, content) => {
      return variables[varName] ? content : '';
    }
  );

  // Step 3: Simple variables {{variableName}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return String(variables[key] ?? '');
  });

  return result;
}
```

**~30 lines of code. That's your entire template engine.** Professional, production-ready, handles 3 types of replacements.

### 2.6 How Professional Template Engines Compare

| Engine | Used By | Syntax | Complexity |
|--------|---------|--------|------------|
| **Ours (ShopPulse)** | ShopPulse notifications | `{{variable}}` | ~30 lines, 3 features |
| **Handlebars.js** | Many Node.js apps | `{{variable}}`, `{{#each}}`, `{{#if}}` | ~5,000 lines, 20+ features |
| **Liquid** | Shopify | `{{ variable }}`, `{% for %}`, `{% if %}` | ~10,000 lines, full language |
| **Mustache** | Many languages | `{{variable}}`, `{{#section}}` | ~500 lines, "logic-less" |
| **EJS** | Express.js apps | `<%= variable %>`, `<% if() %>` | ~1,000 lines, embedded JS |
| **Jinja2** | Python (Flask/Django) | `{{ variable }}`, `{% for %}`, `{% if %}` | ~15,000 lines, full language |

**Our template engine is closest to Mustache** — simple, focused, no complex logic. It's called a "logic-less" template engine because it doesn't support arbitrary JavaScript — just variable replacement, iteration, and conditionals.

### 2.7 When NOT to Build Your Own

For ShopPulse notifications, our 30-line engine is perfect. But if you needed:
- Complex logic (nested ifs, else, loops within loops)
- HTML escaping (preventing XSS attacks)
- Template inheritance (base templates + child templates)
- Filters (formatting dates, currencies)

Then use a library like **Handlebars** or **Liquid**. Don't reinvent the wheel for complex cases.

---

## 3. The Factory Pattern — From Zero to Expert

### 3.1 The Problem

You have **multiple classes** that do the same job differently, and you need to pick the right one based on some input.

In ShopPulse:
- `Fast2SMSProvider` sends SMS via Fast2SMS API
- (Future) `MSG91Provider` sends SMS via MSG91 API
- (Future) `TwilioProvider` sends SMS via Twilio API

They all implement `.send(phone, message)` — but internally they work differently. You need a way to create the right one based on what the store owner configured.

### 3.2 Level 0: If-Else Everywhere (The Bad Way)

```typescript
// ❌ Without factory — scattered if-else throughout your code:
async function sendSMS(storeId: string, phone: string, message: string) {
  const config = await getStoreConfig(storeId);

  if (config.provider === 'fast2sms') {
    const apiKey = config.credentials.api_key;
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: { Authorization: apiKey },
      body: JSON.stringify({ route: 'q', message, numbers: phone }),
    });
    return response.json();
  }
  else if (config.provider === 'msg91') {
    const authKey = config.credentials.auth_key;
    const response = await fetch('https://api.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: { authkey: authKey },
      body: JSON.stringify({ /* MSG91 specific format */ }),
    });
    return response.json();
  }
  else if (config.provider === 'twilio') {
    // ... completely different API format
  }
}
```

**Problems:**
- The `sendSMS` function knows about EVERY provider's API details
- Adding a new provider means editing this function (risk of breaking existing providers)
- The function is huge and hard to test
- Provider-specific logic is mixed with business logic

### 3.3 Level 1: The Factory Pattern (The Professional Way)

```typescript
// ✅ With factory — clean separation:

// Step 1: Define what ALL providers must look like (interface/contract)
interface SMSProvider {
  send(phone: string, message: string): Promise<{ success: boolean; error?: string }>;
}

// Step 2: Each provider implements the interface independently
class Fast2SMSProvider implements SMSProvider {
  constructor(private apiKey: string) {}

  async send(phone: string, message: string) {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: { Authorization: this.apiKey },
      body: JSON.stringify({ route: 'q', message, numbers: phone }),
    });
    const data = await response.json();
    return { success: data.return === true };
  }
}

class MSG91Provider implements SMSProvider {
  constructor(private authKey: string) {}

  async send(phone: string, message: string) {
    // MSG91-specific implementation
    return { success: true };
  }
}

// Step 3: THE FACTORY — one function that creates the right provider
function createSMSProvider(name: string, credentials: Record<string, string>): SMSProvider {
  switch (name) {
    case 'fast2sms': return new Fast2SMSProvider(credentials.api_key);
    case 'msg91':    return new MSG91Provider(credentials.auth_key);
    default:         throw new Error(`Unknown provider: ${name}`);
  }
}

// Step 4: Usage — the calling code doesn't know or care which provider
async function sendSMS(storeId: string, phone: string, message: string) {
  const config = await getStoreConfig(storeId);
  const provider = createSMSProvider(config.provider, config.credentials);
  return provider.send(phone, message);  // Works for ANY provider!
}
```

### 3.4 Why This Is Better — The SOLID Breakdown

| Principle | How Factory Helps |
|-----------|------------------|
| **S**ingle Responsibility | Each provider class only knows about ONE API |
| **O**pen/Closed | Add new providers without changing existing code |
| **L**iskov Substitution | Any provider can be used wherever SMSProvider is expected |
| **I**nterface Segregation | SMSProvider interface is small and focused |
| **D**ependency Inversion | sendSMS depends on the interface, not on Fast2SMS directly |

### 3.5 Adding a New Provider — How Easy It Is

Imagine we want to add Twilio. With the factory pattern:

```
Step 1: Create a new file: src/lib/sms/providers/twilio.ts
Step 2: Write ONE class that implements SMSProvider
Step 3: Add ONE line to the factory switch statement

THAT'S IT. Nothing else changes.
```

```typescript
// New file: src/lib/sms/providers/twilio.ts
export class TwilioProvider implements SMSProvider {
  constructor(private accountSid: string, private authToken: string, private fromNumber: string) {}

  async send(phone: string, message: string) {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${this.accountSid}:${this.authToken}`),
        },
        body: new URLSearchParams({
          To: phone,
          From: this.fromNumber,
          Body: message,
        }),
      }
    );
    const data = await response.json();
    return { success: !data.error_code, messageId: data.sid };
  }
}

// In sms-service.ts, add ONE line:
case 'twilio': return new TwilioProvider(creds.account_sid, creds.auth_token, creds.from_number);
```

### 3.6 Types of Factories

| Type | Complexity | What We Use |
|------|-----------|------------|
| **Simple Factory** | A function with a switch statement | ✅ `createSMSProvider()` |
| **Factory Method** | A method in a base class that subclasses override | ❌ Overkill for us |
| **Abstract Factory** | A factory that creates families of related objects | ❌ Way overkill |

Our Simple Factory is perfect. Don't over-engineer — use the simplest pattern that solves the problem.

### 3.7 Factory Pattern in the Real World

```
Factories are EVERYWHERE:

React.createElement('div', ...)     ← Factory! Creates the right element based on tag name
document.createElement('canvas')    ← Factory! Browser creates the right HTML element
express.Router()                    ← Factory! Creates a router instance
prisma.user.create(...)             ← Factory! Creates a DB record (Prisma handles SQL generation)
new Map() vs new Set()              ← The language itself uses factory-like constructors
```

---

## 4. The Strategy Pattern — Factory's Best Friend

### 4.1 What Is It?

The Strategy Pattern says: **"Define a family of algorithms, put each one in its own class, and make them interchangeable."**

In plain English: "Let me swap HOW something is done, without changing WHAT is done."

### 4.2 Factory + Strategy Together

```
Factory Pattern  = "Create the right object"
Strategy Pattern = "All objects have the same interface, so they're interchangeable"

Together: "Create the right provider, and use it without caring which one it is."
```

In ShopPulse:

```typescript
// The STRATEGY = the interface (what every provider must do)
interface SMSProvider {
  providerId: string;
  send(phone: string, message: string): Promise<ProviderSendResult>;
}

// The CONCRETE STRATEGIES = individual implementations
class Fast2SMSProvider implements SMSProvider { ... }
class MSG91Provider implements SMSProvider { ... }

// The FACTORY = creates the right strategy
function createSMSProvider(name, creds): SMSProvider { ... }

// The CONTEXT = uses the strategy without knowing which one
async function sendSMS(storeId, phone, message) {
  const provider = createSMSProvider(name, creds);  // Factory picks the strategy
  return provider.send(phone, message);               // Context uses the strategy
}
```

### 4.3 The Power of This Combination

```
Store A: Uses Fast2SMS     →  createSMSProvider("fast2sms", ...)  →  Fast2SMSProvider.send()
Store B: Uses MSG91        →  createSMSProvider("msg91", ...)     →  MSG91Provider.send()
Store C: Uses Twilio       →  createSMSProvider("twilio", ...)    →  TwilioProvider.send()

The sendSMS function is IDENTICAL for all three stores.
Only the provider object changes. That's the power.
```

### 4.4 Strategy Without Factory (Also Valid)

You can use Strategy pattern without a factory. The caller explicitly chooses:

```typescript
// Caller decides which strategy to use:
const smsProvider = new Fast2SMSProvider(apiKey);  // Explicit choice
const result = await smsProvider.send(phone, message);
```

But with a factory, the choice is automated based on configuration — much better for a SaaS platform where each store has different settings.

---

## 5. Where These Patterns Appear in the Real World

### 5.1 Template Engine Examples

| Where | What they template |
|-------|-------------------|
| **React JSX** | `<h1>Hello {name}</h1>` — JSX is a template engine for HTML |
| **Email services** (Mailchimp, SendGrid) | `Dear *|FNAME|*, your order...` |
| **CI/CD** (GitHub Actions) | `${{ github.actor }}` in workflow files |
| **Terraform** | `resource "aws_s3_bucket" "${var.name}"` |
| **SQL queries** | `SELECT * FROM users WHERE id = $1` (parameterized queries) |
| **Internationalization (i18n)** | `t('greeting', { name: 'Rahul' })` → "Hello, Rahul" in English, "नमस्ते, Rahul" in Hindi |

### 5.2 Factory Pattern Examples

| Where | What they create |
|-------|-----------------|
| **Payment gateways** | `createPaymentProvider("razorpay")` vs `createPaymentProvider("stripe")` |
| **Database drivers** | `createConnection("postgres")` vs `createConnection("mysql")` |
| **Logging** | `createLogger("console")` vs `createLogger("file")` vs `createLogger("cloudwatch")` |
| **Shipping providers** | `createShippingProvider("shiprocket")` vs `createShippingProvider("delhivery")` |
| **Auth providers** | Clerk, Auth0, Firebase — all implement a "sign in" interface differently |

### 5.3 Strategy Pattern Examples

| Where | What strategies exist |
|-------|--------------------|
| **Sorting** | Bubble sort, Quick sort, Merge sort — all have `.sort()`, but work differently |
| **Compression** | gzip, brotli, deflate — all have `.compress()` |
| **Payment** | Razorpay, Stripe, PayPal — all have `.charge()` |
| **Image storage** | Local disk, AWS S3, Cloudflare R2 — all have `.upload()` |
| **Caching** | Redis, Memcached, In-memory — all have `.get()` and `.set()` |

---

## 6. Practice Exercises

Try these to solidify your understanding. You can implement them in a scratch file.

### Exercise 1: Build a Mini Template Engine

```typescript
// Build a function that replaces {{variables}} in a string
// Test it with:
const result = processTemplate(
  "Hello {{name}}! You have {{count}} items in your cart. Total: {{total}}",
  { name: "Rahul", count: "3", total: "₹4,500" }
);
// Expected: "Hello Rahul! You have 3 items in your cart. Total: ₹4,500"
```

### Exercise 2: Build a Notification Factory

```typescript
// Build a factory that creates different notification senders:
interface NotificationSender {
  send(to: string, message: string): void;
}

class ConsoleSender implements NotificationSender {
  send(to: string, message: string) { console.log(`[Console] To: ${to} — ${message}`); }
}

class AlertSender implements NotificationSender {
  send(to: string, message: string) { /* use alert() or similar */ }
}

// Build the factory:
function createSender(type: "console" | "alert"): NotificationSender {
  // Your code here
}

// Test:
const sender = createSender("console");
sender.send("Rahul", "Your order is ready!");
```

### Exercise 3: Combine Both

```typescript
// 1. Create a template: "Hi {{name}}, {{message}}"
// 2. Process it with data
// 3. Send the result through a factory-created sender
// This is EXACTLY what ShopPulse's notification-service.ts does!
```

---

## 7. How All 3 Work Together in ShopPulse

Here's the complete flow showing all 3 patterns in action:

```
An order is placed → notificationService.trigger(storeId, 'ORDER_CONFIRMED', orderData)

┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: TEMPLATE ENGINE                                             │
│                                                                     │
│ flattenEventData('ORDER_CONFIRMED', orderData)                      │
│   → { orderId: "ORD-A1B2", customerName: "Rahul", ... }            │
│                                                                     │
│ resolveTemplate(storeId, 'ORDER_CONFIRMED', 'SMS')                 │
│   → "✅ Order {{orderId}} confirmed! {{orderTotal}} - {{storeName}}"│
│                                                                     │
│ processTemplate(template, variables)                                │
│   → "✅ Order ORD-A1B2 confirmed! ₹1,299 - ShopPulse"             │
│                                                                     │
│ [Template Engine converts template + data → final message text]     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: FACTORY PATTERN                                             │
│                                                                     │
│ smsService.send(storeId, phone, processedMessage)                  │
│   → getCredentials(storeId, 'SMS_PROVIDER')                        │
│     → { provider: "fast2sms", credentials: { api_key: "abc" } }    │
│                                                                     │
│   → createSMSProvider("fast2sms", credentials)                     │
│     → new Fast2SMSProvider({ api_key: "abc" })                     │
│                                                                     │
│ [Factory creates the right provider based on store config]          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: STRATEGY PATTERN                                            │
│                                                                     │
│ provider.send(phone, message)                                       │
│   → Fast2SMSProvider.send("9876543210", "✅ Order ORD-A1B2...")    │
│   → HTTP POST to fast2sms.com/dev/bulkV2                           │
│   → Returns { success: true, messageId: "req_123" }                │
│                                                                     │
│ [Strategy executes the provider-specific logic transparently]       │
│                                                                     │
│ The orchestrator (notification-service.ts) doesn't know or care     │
│ that Fast2SMS was used. It just called .send() on whatever the     │
│ factory gave it. Tomorrow it could be Twilio — same .send() call.  │
└─────────────────────────────────────────────────────────────────────┘
```

### Why This Architecture Matters for Your Career

```
Junior Developer:
  "I wrote code that sends SMS via Fast2SMS"

Senior Developer:
  "I built a provider-agnostic notification system using the Strategy Pattern
   with a factory for provider instantiation and a custom template engine
   for dynamic message generation"

Both built the same thing. But the second one UNDERSTANDS the patterns
and can apply them anywhere — payment providers, shipping services,
auth systems, database drivers...

That's you now. 🎯
```

---

## Quick Reference

### Template Engine Cheat Sheet

```typescript
// Simple variable:     "Hello {{name}}"
// Array iteration:     "{{#items}}• {{name}} {{/items}}"
// Conditional:         "{{#if url}}Link: {{url}} {{/if}}"
// Regex for variables: /\{\{(\w+)\}\}/g
```

### Factory Cheat Sheet

```typescript
// 1. Define interface:    interface Provider { send(): Result }
// 2. Implement classes:   class FastProvider implements Provider { ... }
// 3. Build factory:       function create(name): Provider { switch(name) { ... } }
// 4. Use factory:         const p = create(name); p.send();
```

### Strategy Cheat Sheet

```typescript
// All strategies implement the SAME interface
// Client code uses the interface, not the concrete class
// You can swap strategies without changing client code
// Factory + Strategy = automatic strategy selection based on config
```

---

> **You've just learned 3 design patterns that are used in EVERY professional codebase.**
> These aren't just for ShopPulse — you'll see and use Factory, Strategy, and Template Engines
> in every backend project, every SaaS app, and every interview you'll ever do.
>
> **Next time you see these patterns in someone else's code, you'll recognize them instantly.** That's the skill. 💪
