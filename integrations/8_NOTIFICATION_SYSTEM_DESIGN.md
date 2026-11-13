# Part 8: Notification System Design

**Created:** February 2026  
**Status:** Architecture Ready  
**Focus:** Complete notification architecture, templates, triggers, user configuration

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Notification Events](#notification-events)
4. [Template System](#template-system)
5. [User Configuration Flow](#user-configuration-flow)
6. [Implementation Files](#implementation-files)
7. [Order Integration Points](#order-integration-points)
8. [Error Handling Strategy](#error-handling-strategy)

---

## System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION SYSTEM ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     TRIGGER POINTS                           │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐    │    │
│  │  │ Payment   │ │ Order     │ │ Shiprocket│ │ Admin     │    │    │
│  │  │ Success   │ │ Status    │ │ Webhook   │ │ Action    │    │    │
│  │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘    │    │
│  └────────┼─────────────┼─────────────┼─────────────┼──────────┘    │
│           │             │             │             │                │
│           └─────────────┴──────┬──────┴─────────────┘                │
│                                │                                      │
│                                ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              NOTIFICATION SERVICE (Orchestrator)             │    │
│  │              src/lib/notifications/notification-service.ts   │    │
│  │                                                              │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ 1. triggerNotification(storeId, event, data)        │    │    │
│  │  │    │                                                 │    │    │
│  │  │    ├─► Get NotificationSettings for store           │    │    │
│  │  │    │   Is this event enabled for SMS? Email?        │    │    │
│  │  │    │                                                 │    │    │
│  │  │    ├─► Check integration exists                      │    │    │
│  │  │    │   SMS_PROVIDER configured? EMAIL_SERVICE?       │    │    │
│  │  │    │                                                 │    │    │
│  │  │    ├─► Get template (custom or default)              │    │    │
│  │  │    │   NotificationTemplate or DEFAULT_TEMPLATES     │    │    │
│  │  │    │                                                 │    │    │
│  │  │    ├─► Process variables                             │    │    │
│  │  │    │   {{orderId}} → "ORD-12345"                    │    │    │
│  │  │    │                                                 │    │    │
│  │  │    └─► Send via appropriate service                  │    │    │
│  │  │        SMS: smsService.send()                        │    │    │
│  │  │        Email: emailService.send()                    │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                │                                      │
│              ┌─────────────────┼─────────────────┐                   │
│              ▼                 │                 ▼                   │
│  ┌─────────────────────┐      │      ┌─────────────────────┐        │
│  │    SMS SERVICE      │      │      │   EMAIL SERVICE     │        │
│  │ src/lib/sms/        │      │      │ src/lib/email/      │        │
│  │                     │      │      │                     │        │
│  │ Provider Factory:   │      │      │ Provider Factory:   │        │
│  │ ├─ msg91.ts         │      │      │ ├─ resend.ts        │        │
│  │ ├─ fast2sms.ts      │      │      │ └─ sendgrid.ts      │        │
│  │ └─ twilio.ts        │      │      │                     │        │
│  └──────────┬──────────┘      │      └──────────┬──────────┘        │
│             │                 │                 │                    │
│             ▼                 ▼                 ▼                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   NOTIFICATION LOG                           │    │
│  │                   NotificationLog model                      │    │
│  │                                                              │    │
│  │   { storeId, orderId, channel, status, provider, ... }      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Non-blocking** | Notifications don't block order flow |
| **Graceful degradation** | Missing integration = no notification (not error) |
| **Configurable** | Store owners toggle events on/off |
| **Template customization** | Override defaults with custom text |
| **Logging** | All attempts logged for debugging |
| **Provider agnostic** | Switch providers without code changes |

---

## Database Schema

### Complete Schema Additions

```prisma
// Add to prisma/schema.prisma

// ============================================
// NOTIFICATION SETTINGS (per store)
// ============================================
model NotificationSettings {
  id        String @id @default(uuid())
  storeId   String @unique
  store     Store  @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  // ─────────────────────────────────────────
  // EMAIL NOTIFICATION TOGGLES
  // ─────────────────────────────────────────
  emailOrderConfirmed     Boolean @default(true)   // Payment success
  emailOrderShipped       Boolean @default(true)   // Status → SHIPPED
  emailOrderDelivered     Boolean @default(true)   // Status → DELIVERED
  emailOrderCancelled     Boolean @default(true)   // Order cancelled
  emailPaymentFailed      Boolean @default(false)  // Payment failed
  emailRefundProcessed    Boolean @default(true)   // Refund completed
  
  // ─────────────────────────────────────────
  // SMS NOTIFICATION TOGGLES
  // ─────────────────────────────────────────
  smsOrderConfirmed       Boolean @default(true)   // Payment success
  smsOrderShipped         Boolean @default(true)   // Status → SHIPPED
  smsOrderDelivered       Boolean @default(false)  // Usually not needed
  smsOrderCancelled       Boolean @default(false)  // Optional
  smsPaymentFailed        Boolean @default(false)  // Not common
  smsRefundProcessed      Boolean @default(false)  // Email better for this
  
  // ─────────────────────────────────────────
  // ADMIN ALERTS (sent to store owner)
  // ─────────────────────────────────────────
  adminLowStockAlert      Boolean @default(true)
  adminNewOrderAlert      Boolean @default(true)
  adminAlertEmail         String?   // Override store email
  adminAlertPhone         String?   // For SMS alerts
  
  // ─────────────────────────────────────────
  // BRANDING & CUSTOMIZATION
  // ─────────────────────────────────────────
  emailHeaderMessage      String?   // Custom greeting
  emailFooterMessage      String?   // Custom sign-off
  smsSignature            String?   // e.g., "- MyStore"
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ============================================
// NOTIFICATION TEMPLATES (customizable)
// ============================================
model NotificationTemplate {
  id        String   @id @default(uuid())
  storeId   String
  store     Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  type      NotificationType      // ORDER_CONFIRMED, ORDER_SHIPPED, etc.
  channel   NotificationChannel   // EMAIL, SMS
  
  subject   String?   @db.VarChar(200)  // Email subject line (with variables)
  body      String    @db.Text          // Template content (with variables)
  
  isActive  Boolean   @default(true)    // Can disable without deleting
  isCustom  Boolean   @default(false)   // true if user modified from default
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  @@unique([storeId, type, channel])
  @@index([storeId])
}

// ============================================
// NOTIFICATION LOG (audit trail)
// ============================================
model NotificationLog {
  id          String   @id @default(uuid())
  storeId     String
  store       Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  orderId     String?  // Null for admin alerts
  order       Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)
  
  type        NotificationType
  channel     NotificationChannel
  provider    String               // "resend", "msg91", etc.
  
  recipient   String               // Email or phone
  subject     String?              // Email subject (if email)
  
  status      NotificationStatus   @default(PENDING)
  externalId  String?              // Provider's message ID
  error       String?    @db.Text  // Error message if failed
  
  sentAt      DateTime?
  deliveredAt DateTime?            // From webhook callback
  
  createdAt   DateTime  @default(now())
  
  @@index([storeId, createdAt])
  @@index([orderId])
  @@index([status])
}

// ============================================
// ENUMS
// ============================================
enum NotificationType {
  ORDER_CONFIRMED
  ORDER_SHIPPED
  ORDER_OUT_FOR_DELIVERY
  ORDER_DELIVERED
  ORDER_CANCELLED
  PAYMENT_FAILED
  REFUND_PROCESSED
  LOW_STOCK_ALERT
  NEW_ORDER_ALERT
}

enum NotificationChannel {
  EMAIL
  SMS
  WHATSAPP  // Future
  PUSH      // Future
}

enum NotificationStatus {
  PENDING     // Queued to send
  SENT        // API call successful
  DELIVERED   // Confirmed by provider
  FAILED      // API call failed
  BOUNCED     // Email bounced
  REJECTED    // Provider rejected (spam, etc.)
}
```

### Update Store Model

```prisma
// Add to Store model relations
model Store {
  // ... existing fields ...
  
  notificationSettings  NotificationSettings?
  notificationTemplates NotificationTemplate[]
  notificationLogs      NotificationLog[]
}
```

---

## Notification Events

### Event Mapping

| Event | Trigger Location | Customer SMS | Customer Email | Admin Alert |
|-------|------------------|--------------|----------------|-------------|
| `ORDER_CONFIRMED` | `checkout/verify` payment success | ✅ Default ON | ✅ Default ON | ✅ New order |
| `ORDER_SHIPPED` | Order status → SHIPPED | ✅ Default ON | ✅ Default ON | ❌ |
| `ORDER_OUT_FOR_DELIVERY` | Shiprocket webhook | ❌ Optional | ❌ Optional | ❌ |
| `ORDER_DELIVERED` | Shiprocket webhook | ❌ Default OFF | ✅ Default ON | ❌ |
| `ORDER_CANCELLED` | Order cancellation | ❌ Default OFF | ✅ Default ON | ❌ |
| `PAYMENT_FAILED` | Razorpay webhook | ❌ Default OFF | ❌ Default OFF | ❌ |
| `REFUND_PROCESSED` | Razorpay refund success | ❌ Default OFF | ✅ Default ON | ❌ |
| `LOW_STOCK_ALERT` | Product stock < threshold | ❌ | ❌ | ✅ Admin only |

### Event Data Structure

```typescript
// src/lib/notifications/types.ts

export interface NotificationEventData {
  ORDER_CONFIRMED: {
    order: {
      id: string;
      displayId: string;  // "ORD-12345"
      total: number;
      itemCount: number;
      items: Array<{
        name: string;
        quantity: number;
        price: number;
        imageUrl?: string;
      }>;
      paymentMethod: 'PREPAID' | 'COD';
    };
    customer: {
      name: string;
      email: string;
      phone: string;
    };
    store: {
      name: string;
      url: string;
      logo?: string;
      supportEmail?: string;
    };
    trackingUrl: string;
  };
  
  ORDER_SHIPPED: {
    order: {
      id: string;
      displayId: string;
    };
    customer: {
      name: string;
      email: string;
      phone: string;
    };
    shipment: {
      trackingNumber: string;
      courierName: string;
      trackingUrl: string;
      estimatedDelivery?: string;
    };
    store: {
      name: string;
    };
  };
  
  ORDER_DELIVERED: {
    order: {
      id: string;
      displayId: string;
    };
    customer: {
      name: string;
      email: string;
    };
    deliveredAt: string;
    store: {
      name: string;
    };
  };
  
  // ... other events
}
```

---

## Template System

### Default Templates

```typescript
// src/lib/notifications/default-templates.ts

export const DEFAULT_TEMPLATES = {
  // ─────────────────────────────────────────
  // SMS TEMPLATES (keep short, 160 chars max)
  // ─────────────────────────────────────────
  SMS: {
    ORDER_CONFIRMED: {
      body: `✅ Order #{{orderId}} confirmed! ₹{{total}} {{paymentNote}}. Track: {{trackingUrl}} - {{storeName}}`,
    },
    ORDER_SHIPPED: {
      body: `📦 Order #{{orderId}} shipped! {{courierName}} • Track: {{trackingUrl}} - {{storeName}}`,
    },
    ORDER_DELIVERED: {
      body: `🎉 Order #{{orderId}} delivered! Thank you for shopping with {{storeName}}!`,
    },
    ORDER_CANCELLED: {
      body: `Order #{{orderId}} has been cancelled. Refund will be processed within 5-7 days. - {{storeName}}`,
    },
  },
  
  // ─────────────────────────────────────────
  // EMAIL TEMPLATES (subject + body)
  // ─────────────────────────────────────────
  EMAIL: {
    ORDER_CONFIRMED: {
      subject: `Order Confirmed! #{{orderId}} 🎉`,
      body: `
        Hi {{customerName}},

        Thank you for your order! We've received your order and will begin processing it right away.

        **Order #{{orderId}}**
        Items: {{itemCount}}
        Total: ₹{{total}}
        Payment: {{paymentMethod}}

        {{#items}}
        • {{name}} × {{quantity}} - ₹{{price}}
        {{/items}}

        Track your order: {{trackingUrl}}

        Thank you for shopping with {{storeName}}!
      `,
    },
    ORDER_SHIPPED: {
      subject: `Your order #{{orderId}} is on its way! 📦`,
      body: `
        Hi {{customerName}},

        Great news! Your order has been shipped.

        **Shipping Details**
        Order: #{{orderId}}
        Courier: {{courierName}}
        Tracking: {{trackingNumber}}
        {{#estimatedDelivery}}Expected Delivery: {{estimatedDelivery}}{{/estimatedDelivery}}

        Track your package: {{trackingUrl}}

        - {{storeName}}
      `,
    },
    ORDER_DELIVERED: {
      subject: `Order #{{orderId}} has been delivered! ✅`,
      body: `
        Hi {{customerName}},

        Your order #{{orderId}} has been delivered!

        We hope you love your purchase. If you have any issues, please reply to this email.

        Would you like to leave a review? {{reviewUrl}}

        Thank you for shopping with {{storeName}}!
      `,
    },
    // ... more templates
  },
};

// Template variable helper
export const TEMPLATE_VARIABLES = {
  ORDER_CONFIRMED: [
    { name: 'orderId', description: 'Order ID (e.g., ORD-12345)' },
    { name: 'customerName', description: 'Customer first name' },
    { name: 'total', description: 'Order total with currency' },
    { name: 'itemCount', description: 'Number of items' },
    { name: 'paymentMethod', description: 'PREPAID or COD' },
    { name: 'paymentNote', description: '"Paid" or "Pay on delivery"' },
    { name: 'trackingUrl', description: 'Order tracking URL' },
    { name: 'storeName', description: 'Your store name' },
    { name: 'items', description: 'List of order items (for email)' },
  ],
  ORDER_SHIPPED: [
    { name: 'orderId', description: 'Order ID' },
    { name: 'customerName', description: 'Customer first name' },
    { name: 'courierName', description: 'Shipping carrier name' },
    { name: 'trackingNumber', description: 'Courier tracking ID' },
    { name: 'trackingUrl', description: 'Tracking URL' },
    { name: 'estimatedDelivery', description: 'Expected delivery date' },
    { name: 'storeName', description: 'Your store name' },
  ],
  // ... more
};
```

### Template Processor

```typescript
// src/lib/notifications/template-processor.ts

/**
 * Process template with variables
 * Supports: {{variable}}, {{#array}}...{{/array}}, {{#if}}...{{/if}}
 */
export function processTemplate(
  template: string,
  variables: Record<string, any>
): string {
  let result = template;
  
  // Handle arrays: {{#items}}...{{/items}}
  result = result.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (match, arrayName, content) => {
      const array = variables[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array
        .map(item => {
          let itemContent = content;
          Object.entries(item).forEach(([key, value]) => {
            itemContent = itemContent.replace(
              new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
              String(value)
            );
          });
          return itemContent;
        })
        .join('');
    }
  );
  
  // Handle conditionals: {{#if variable}}...{{/if}}
  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, varName, content) => {
      return variables[varName] ? content : '';
    }
  );
  
  // Handle simple variables: {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const value = variables[varName];
    return value !== undefined ? String(value) : match;
  });
  
  return result.trim();
}

/**
 * Prepare variables from event data
 */
export function prepareVariables(
  type: NotificationType,
  data: NotificationEventData[typeof type]
): Record<string, any> {
  switch (type) {
    case 'ORDER_CONFIRMED':
      return {
        orderId: data.order.displayId,
        customerName: data.customer.name.split(' ')[0],
        total: `₹${data.order.total.toLocaleString()}`,
        itemCount: data.order.itemCount,
        paymentMethod: data.order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Prepaid',
        paymentNote: data.order.paymentMethod === 'COD' ? 'Pay on delivery' : 'Paid',
        trackingUrl: data.trackingUrl,
        storeName: data.store.name,
        storeUrl: data.store.url,
        items: data.order.items,
      };
    
    case 'ORDER_SHIPPED':
      return {
        orderId: data.order.displayId,
        customerName: data.customer.name.split(' ')[0],
        courierName: data.shipment.courierName,
        trackingNumber: data.shipment.trackingNumber,
        trackingUrl: data.shipment.trackingUrl,
        estimatedDelivery: data.shipment.estimatedDelivery,
        storeName: data.store.name,
      };
    
    // ... other types
    
    default:
      return {};
  }
}
```

---

## User Configuration Flow

### Settings Page UI

```
┌─────────────────────────────────────────────────────────────────────┐
│  Settings → Notifications                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  📧 Email Notifications                     [Configure ⚙️]   │    │
│  │  Status: Resend connected                                    │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ Order Confirmation                                [ON] │ │    │
│  │  │ Sent when payment is successful                        │ │    │
│  │  │ [Preview] [Edit Template]                              │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ Shipping Update                                   [ON] │ │    │
│  │  │ Sent when order is shipped                             │ │    │
│  │  │ [Preview] [Edit Template]                              │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ Delivery Confirmation                             [ON] │ │    │
│  │  │ Sent when order is delivered                           │ │    │
│  │  │ [Preview] [Edit Template]                              │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ Order Cancelled                                   [ON] │ │    │
│  │  │ Sent when order is cancelled                           │ │    │
│  │  │ [Preview] [Edit Template]                              │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  📱 SMS Notifications                       [Configure ⚙️]   │    │
│  │  Status: MSG91 connected                                     │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ Order Confirmation                                [ON] │ │    │
│  │  │ Sent when payment is successful                        │ │    │
│  │  │ [Preview] [Edit Template]                              │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ Shipping Update                                   [ON] │ │    │
│  │  │ Sent when order is shipped                             │ │    │
│  │  │ [Preview] [Edit Template]                              │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ Delivery Confirmation                            [OFF] │ │    │
│  │  │ Sent when order is delivered                           │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  🔔 Admin Alerts                                             │    │
│  │                                                              │    │
│  │  ☑ New order notifications                                  │    │
│  │  ☑ Low stock alerts                                         │    │
│  │                                                              │    │
│  │  Alert email: [owner@store.com_________]                    │    │
│  │  Alert phone: [+919876543210___________] (optional)         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  [Save Settings]                                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Template Editor Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  Edit Template: Order Confirmation (SMS)                     [✕]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Message Template:                                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ ✅ Order #{{orderId}} confirmed! ₹{{total}} {{paymentNote}}│    │
│  │ . Track: {{trackingUrl}} - {{storeName}}                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Characters: 98/160  ⚠️ Stay under 160 for single SMS segment      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Available Variables:                                        │    │
│  │                                                              │    │
│  │ {{orderId}}      - Order ID (e.g., ORD-12345)               │    │
│  │ {{customerName}} - Customer first name                      │    │
│  │ {{total}}        - Order total (₹1,299)                     │    │
│  │ {{paymentNote}}  - "Paid" or "Pay on delivery"              │    │
│  │ {{trackingUrl}}  - Order tracking link                      │    │
│  │ {{storeName}}    - Your store name                          │    │
│  │                                                              │    │
│  │ Click variable to insert                                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Preview:                                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ ✅ Order #ORD-12345 confirmed! ₹1,299 Paid. Track:         │    │
│  │ https://mystore.com/track/abc123 - My Electronics Store     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  [Reset to Default]  [Send Test]           [Cancel]  [Save]         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Files

### Complete File Structure

```
src/lib/
├── notifications/
│   ├── notification-service.ts     # Main orchestrator
│   ├── template-processor.ts       # Variable replacement
│   ├── default-templates.ts        # Default SMS/Email templates
│   ├── types.ts                    # TypeScript interfaces
│   └── notification-logger.ts      # Log to NotificationLog
│
├── sms/
│   ├── sms-service.ts              # Factory + unified interface
│   ├── types.ts                    # SMS-specific types
│   └── providers/
│       ├── msg91.ts                # India primary (DLT)
│       ├── fast2sms.ts             # India testing
│       └── twilio.ts               # International
│
└── email/
    ├── email-service.ts            # Factory + unified interface
    ├── types.ts                    # Email-specific types
    ├── templates/                  # React Email templates
    │   ├── order-confirmation.tsx
    │   ├── order-shipped.tsx
    │   ├── order-delivered.tsx
    │   └── base-layout.tsx
    └── providers/
        ├── resend.ts               # Primary (modern)
        └── sendgrid.ts             # Enterprise fallback

src/app/(dashboard)/[storeId]/(routes)/settings/
└── notifications/                  # NEW PAGE
    ├── page.tsx                    # Main settings page
    ├── loading.tsx
    └── components/
        ├── notification-toggle-card.tsx
        ├── template-editor-modal.tsx
        ├── template-preview.tsx
        └── admin-alerts-section.tsx

src/app/api/[storeId]/
└── notifications/
    ├── settings/route.ts           # GET/PUT notification settings
    ├── templates/
    │   ├── route.ts                # GET all templates
    │   └── [type]/route.ts         # GET/PUT specific template
    ├── send-test/
    │   ├── sms/route.ts            # Send test SMS
    │   └── email/route.ts          # Send test email
    └── logs/route.ts               # GET notification history
```

---

## Order Integration Points

### Integration 1: Payment Success

```typescript
// src/app/api/[storeId]/checkout/verify/route.ts

import { notificationService } from '@/lib/notifications/notification-service';

export async function POST(req: Request) {
  // ... existing payment verification logic ...
  
  // After successful payment verification:
  if (paymentSuccess) {
    // Update order status
    await prismadb.order.update({
      where: { id: orderId },
      data: { isPaid: true, status: 'CONFIRMED' },
    });
    
    // ⭐ Trigger notification (non-blocking)
    notificationService
      .trigger(storeId, 'ORDER_CONFIRMED', {
        order: {
          id: order.id,
          displayId: `ORD-${order.id.slice(-8).toUpperCase()}`,
          total: order.totalAmount,
          itemCount: order.items.length,
          items: order.items.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
            price: item.price,
            imageUrl: item.product.images[0]?.url,
          })),
          paymentMethod: order.paymentMethod,
        },
        customer: {
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
        },
        store: {
          name: store.name,
          url: process.env.STOREFRONT_URL!,
          logo: store.logo,
        },
        trackingUrl: `${process.env.STOREFRONT_URL}/track/${order.id}`,
      })
      .catch(error => {
        // Log but don't fail the order
        logger.error('Notification failed', { error, orderId });
      });
    
    return NextResponse.json({ success: true });
  }
}
```

### Integration 2: Order Status Update

```typescript
// src/app/api/[storeId]/orders/[orderId]/route.ts

export async function PATCH(req: Request) {
  // ... existing status update logic ...
  
  const previousStatus = order.status;
  const newStatus = body.status;
  
  // Update order
  const updatedOrder = await prismadb.order.update({
    where: { id: orderId },
    data: { status: newStatus },
  });
  
  // ⭐ Trigger notifications based on status change
  if (previousStatus !== newStatus) {
    switch (newStatus) {
      case 'SHIPPED':
        notificationService.trigger(storeId, 'ORDER_SHIPPED', {
          order: { id: order.id, displayId: formatOrderId(order.id) },
          customer: getCustomerFromOrder(order),
          shipment: {
            trackingNumber: order.awbCode,
            courierName: order.courierName,
            trackingUrl: order.trackingUrl,
          },
          store: { name: store.name },
        });
        break;
      
      case 'DELIVERED':
        notificationService.trigger(storeId, 'ORDER_DELIVERED', {
          order: { id: order.id, displayId: formatOrderId(order.id) },
          customer: getCustomerFromOrder(order),
          deliveredAt: new Date().toISOString(),
          store: { name: store.name },
        });
        break;
      
      case 'CANCELLED':
        notificationService.trigger(storeId, 'ORDER_CANCELLED', {
          order: { id: order.id, displayId: formatOrderId(order.id) },
          customer: getCustomerFromOrder(order),
          reason: body.cancellationReason,
          store: { name: store.name },
        });
        break;
    }
  }
  
  return NextResponse.json(updatedOrder);
}
```

### Integration 3: Shiprocket Webhook

```typescript
// src/app/api/webhooks/shiprocket/route.ts

export async function POST(req: Request) {
  const body = await req.json();
  
  // ... existing webhook handling ...
  
  // Trigger notification based on shipment status
  switch (body.current_status) {
    case 'DELIVERED':
      const order = await getOrderByAWB(body.awb);
      if (order) {
        notificationService.trigger(order.storeId, 'ORDER_DELIVERED', {
          // ... data
        });
      }
      break;
    
    case 'OUT FOR DELIVERY':
      // Optional: ORDER_OUT_FOR_DELIVERY notification
      break;
  }
}
```

---

## Error Handling Strategy

### Non-Blocking Pattern

```typescript
// src/lib/notifications/notification-service.ts

export const notificationService = {
  async trigger<T extends NotificationType>(
    storeId: string,
    type: T,
    data: NotificationEventData[T]
  ): Promise<void> {
    try {
      // 1. Get notification settings
      const settings = await this.getSettings(storeId);
      if (!settings) {
        logger.debug('No notification settings found', { storeId });
        return;
      }
      
      // 2. Check if event is enabled for each channel
      const emailEnabled = settings[`email${type.replace('_', '')}`];
      const smsEnabled = settings[`sms${type.replace('_', '')}`];
      
      const promises: Promise<void>[] = [];
      
      // 3. Send email if enabled and configured
      if (emailEnabled) {
        promises.push(
          this.sendEmail(storeId, type, data).catch(err => {
            logger.error('Email notification failed', { 
              storeId, type, error: err.message 
            });
          })
        );
      }
      
      // 4. Send SMS if enabled and configured
      if (smsEnabled) {
        promises.push(
          this.sendSMS(storeId, type, data).catch(err => {
            logger.error('SMS notification failed', { 
              storeId, type, error: err.message 
            });
          })
        );
      }
      
      // 5. Wait for all (already error-handled individually)
      await Promise.allSettled(promises);
      
    } catch (error) {
      // Top-level catch - log but never throw
      logger.error('Notification trigger failed', { 
        storeId, type, error: error instanceof Error ? error.message : 'Unknown' 
      });
    }
  },
};
```

### Logging Strategy

```typescript
// src/lib/notifications/notification-logger.ts

export async function logNotification(params: {
  storeId: string;
  orderId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  provider: string;
  recipient: string;
  subject?: string;
  status: NotificationStatus;
  externalId?: string;
  error?: string;
}): Promise<void> {
  try {
    await prismadb.notificationLog.create({
      data: {
        ...params,
        sentAt: params.status === 'SENT' ? new Date() : null,
      },
    });
  } catch (error) {
    // Never let logging failures affect the main flow
    logger.error('Failed to log notification', { error, params });
  }
}
```

---

## Summary

### What This Architecture Provides

| Feature | Implementation |
|---------|----------------|
| **Event-driven** | Trigger notifications on order events |
| **Configurable** | Store owners toggle events on/off |
| **Customizable** | Edit templates with variable support |
| **Multi-channel** | Email + SMS (WhatsApp future) |
| **Provider agnostic** | Switch providers without code changes |
| **Non-blocking** | Never fails order processing |
| **Logged** | Full audit trail of all notifications |

### Implementation Order

1. **Database migration** - Add new models
2. **Notification service** - Core orchestrator
3. **Email provider** - Resend implementation
4. **SMS provider** - Fast2SMS (testing) → MSG91 (production)
5. **Order integration** - Add trigger points
6. **Settings UI** - Toggle and template editor

---

*Continue to [Part 9: Testing & Debugging Guide](./9_TESTING_AND_DEBUGGING_GUIDE.md)*
