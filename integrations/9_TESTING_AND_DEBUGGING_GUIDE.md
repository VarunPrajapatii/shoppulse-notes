# Part 9: Testing & Debugging Guide

**Created:** February 2026  
**Status:** Ready for Implementation  
**Focus:** Test strategies, debugging tools, local development, production monitoring

---

## Table of Contents
1. [Testing Strategy Overview](#testing-strategy-overview)
2. [Local Development Setup](#local-development-setup)
3. [Provider Testing](#provider-testing)
4. [Integration Testing](#integration-testing)
5. [Production Monitoring](#production-monitoring)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Debug Tools & Scripts](#debug-tools--scripts)

---

## Testing Strategy Overview

### Testing Pyramid for Notifications

```
                    ┌───────────────────┐
                    │   E2E Tests       │  ← Minimal (1-2)
                    │   Full flow       │
                    │   Real providers  │
                    └─────────┬─────────┘
                              │
              ┌───────────────┴───────────────┐
              │      Integration Tests        │  ← Medium (5-10)
              │      Mocked providers         │
              │      Real DB operations       │
              └───────────────┬───────────────┘
                              │
  ┌───────────────────────────┴───────────────────────────┐
  │                    Unit Tests                         │  ← Many (20+)
  │                    Template processing                │
  │                    Variable replacement               │
  │                    Provider adapters                  │
  └───────────────────────────────────────────────────────┘
```

### What to Test

| Layer | What | How |
|-------|------|-----|
| **Unit** | Template processor | Jest, mock data |
| **Unit** | Variable preparation | Jest, mock order data |
| **Unit** | Provider adapters | Jest, mock API responses |
| **Integration** | Settings save/load | Prisma + test DB |
| **Integration** | Template CRUD | API routes + test DB |
| **Integration** | Notification trigger flow | Mock providers |
| **E2E** | Full order → notification | Test mode providers |

---

## Local Development Setup

### Environment Variables for Testing

```env
# .env.local

# ─────────────────────────────────────────
# SMS PROVIDERS (Test Mode)
# ─────────────────────────────────────────
# Fast2SMS (free tier testing)
FAST2SMS_API_KEY=your_fast2sms_test_key
FAST2SMS_SENDER_ID=FSTSMS

# MSG91 (sandbox mode)
MSG91_AUTH_KEY=your_msg91_sandbox_key
MSG91_SENDER_ID=SHPPLS
MSG91_TEMPLATE_ID=test_template_id

# Twilio (test credentials)
TWILIO_ACCOUNT_SID=ACtest123...
TWILIO_AUTH_TOKEN=test_token_here
TWILIO_PHONE_NUMBER=+15005550006

# ─────────────────────────────────────────
# EMAIL PROVIDERS (Test Mode)
# ─────────────────────────────────────────
# Resend
RESEND_API_KEY=re_test_xxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev

# SendGrid (sandbox)
SENDGRID_API_KEY=SG.test_xxxxxxxxxx
SENDGRID_FROM_EMAIL=test@yourdomain.com

# ─────────────────────────────────────────
# TEST MODE FLAGS
# ─────────────────────────────────────────
# Set to 'true' to use mock providers instead of real APIs
NOTIFICATION_TEST_MODE=true

# Override recipient for all notifications (for testing)
NOTIFICATION_TEST_EMAIL=developer@yourcompany.com
NOTIFICATION_TEST_PHONE=+919876543210
```

### Mock Provider Implementation

```typescript
// src/lib/notifications/__mocks__/mock-sms-provider.ts

import { SMSProvider, SMSResult } from '../types';

export class MockSMSProvider implements SMSProvider {
  private sentMessages: Array<{
    phone: string;
    message: string;
    timestamp: Date;
  }> = [];

  async send(phone: string, message: string): Promise<SMSResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Store for assertions
    this.sentMessages.push({
      phone,
      message,
      timestamp: new Date(),
    });

    // Simulate failures for specific test numbers
    if (phone === '+911111111111') {
      return {
        success: false,
        error: 'Invalid phone number',
      };
    }

    if (phone === '+912222222222') {
      throw new Error('Provider API timeout');
    }

    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };
  }

  // Test helper methods
  getLastMessage() {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  getAllMessages() {
    return this.sentMessages;
  }

  clearMessages() {
    this.sentMessages = [];
  }
}

// src/lib/notifications/__mocks__/mock-email-provider.ts

import { EmailProvider, EmailResult, EmailParams } from '../types';

export class MockEmailProvider implements EmailProvider {
  private sentEmails: Array<EmailParams & { timestamp: Date }> = [];

  async send(params: EmailParams): Promise<EmailResult> {
    await new Promise(resolve => setTimeout(resolve, 100));

    this.sentEmails.push({
      ...params,
      timestamp: new Date(),
    });

    // Simulate bounce for test email
    if (params.to === 'bounce@test.com') {
      return {
        success: false,
        error: 'Email bounced',
      };
    }

    return {
      success: true,
      messageId: `mock_email_${Date.now()}`,
    };
  }

  getLastEmail() {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  getAllEmails() {
    return this.sentEmails;
  }

  clearEmails() {
    this.sentEmails = [];
  }
}
```

### Test Mode Factory

```typescript
// src/lib/notifications/provider-factory.ts

import { MockSMSProvider } from './__mocks__/mock-sms-provider';
import { MockEmailProvider } from './__mocks__/mock-email-provider';
import { MSG91Provider } from '../sms/providers/msg91';
import { Fast2SMSProvider } from '../sms/providers/fast2sms';
import { ResendProvider } from '../email/providers/resend';

export function getSMSProvider(providerId: string): SMSProvider {
  // Use mock in test mode
  if (process.env.NOTIFICATION_TEST_MODE === 'true') {
    console.log('📧 Using Mock SMS Provider (test mode)');
    return new MockSMSProvider();
  }

  // Production providers
  switch (providerId) {
    case 'msg91':
      return new MSG91Provider();
    case 'fast2sms':
      return new Fast2SMSProvider();
    case 'twilio':
      return new TwilioProvider();
    default:
      throw new Error(`Unknown SMS provider: ${providerId}`);
  }
}

export function getEmailProvider(providerId: string): EmailProvider {
  if (process.env.NOTIFICATION_TEST_MODE === 'true') {
    console.log('📧 Using Mock Email Provider (test mode)');
    return new MockEmailProvider();
  }

  switch (providerId) {
    case 'resend':
      return new ResendProvider();
    case 'sendgrid':
      return new SendGridProvider();
    default:
      throw new Error(`Unknown email provider: ${providerId}`);
  }
}
```

---

## Provider Testing

### Resend Testing Strategy

```typescript
// src/lib/email/providers/__tests__/resend.test.ts

import { ResendProvider } from '../resend';
import { Resend } from 'resend';

// Mock the resend library
jest.mock('resend');

describe('ResendProvider', () => {
  let provider: ResendProvider;
  let mockResend: jest.Mocked<Resend>;

  beforeEach(() => {
    mockResend = {
      emails: {
        send: jest.fn(),
      },
    } as any;

    (Resend as jest.Mock).mockImplementation(() => mockResend);
    provider = new ResendProvider();
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: { id: 'email_123' },
        error: null,
      });

      const result = await provider.send({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email_123');
      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: expect.any(String),
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });
    });

    it('should handle API errors gracefully', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded', name: 'rate_limit_error' },
      });

      const result = await provider.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
    });

    it('should handle network failures', async () => {
      mockResend.emails.send.mockRejectedValue(new Error('Network error'));

      const result = await provider.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});
```

### Fast2SMS Testing (Free Tier)

```typescript
// scripts/test-fast2sms.ts
// Run: npx ts-node scripts/test-fast2sms.ts

async function testFast2SMS() {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const testPhone = process.env.NOTIFICATION_TEST_PHONE;

  if (!apiKey || !testPhone) {
    console.error('❌ Missing FAST2SMS_API_KEY or NOTIFICATION_TEST_PHONE');
    process.exit(1);
  }

  console.log('🧪 Testing Fast2SMS...');
  console.log(`   Sending to: ${testPhone}`);

  try {
    const response = await fetch(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q', // Quick SMS (for testing)
          message: 'Test from ShopPulse! Your notification system is working.',
          flash: 0,
          numbers: testPhone.replace('+91', ''), // Remove country code
        }),
      }
    );

    const data = await response.json();

    if (data.return === true) {
      console.log('✅ SMS sent successfully!');
      console.log(`   Request ID: ${data.request_id}`);
      console.log(`   Message: ${data.message}`);
    } else {
      console.log('❌ SMS failed');
      console.log(`   Error: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

testFast2SMS();
```

### MSG91 Sandbox Testing

```typescript
// scripts/test-msg91.ts

async function testMSG91() {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const testPhone = process.env.NOTIFICATION_TEST_PHONE;

  // MSG91 test mode: use sandbox.msg91.com
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://control.msg91.com'
    : 'https://sandbox.msg91.com'; // Sandbox doesn't actually send

  console.log('🧪 Testing MSG91...');
  console.log(`   Mode: ${process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX'}`);
  console.log(`   Phone: ${testPhone}`);

  try {
    const response = await fetch(`${baseUrl}/api/v5/flow/`, {
      method: 'POST',
      headers: {
        'authkey': authKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: templateId,
        sender: senderId,
        short_url: '0',
        mobiles: testPhone,
        VAR1: 'ORD-12345',
        VAR2: '₹1,299',
      }),
    });

    const data = await response.json();
    console.log('📨 Response:', JSON.stringify(data, null, 2));

    if (data.type === 'success') {
      console.log('✅ MSG91 test passed!');
    } else {
      console.log('❌ MSG91 test failed');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testMSG91();
```

---

## Integration Testing

### Test Database Setup

```typescript
// src/lib/test-utils/setup-test-db.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function setupTestStore() {
  // Clean up existing test data
  await prisma.notificationLog.deleteMany({
    where: { storeId: 'test-store-id' },
  });
  await prisma.notificationTemplate.deleteMany({
    where: { storeId: 'test-store-id' },
  });
  await prisma.notificationSettings.deleteMany({
    where: { storeId: 'test-store-id' },
  });

  // Create test store with notifications enabled
  const settings = await prisma.notificationSettings.create({
    data: {
      storeId: 'test-store-id',
      emailOrderConfirmed: true,
      emailOrderShipped: true,
      smsOrderConfirmed: true,
      smsOrderShipped: true,
    },
  });

  return { settings };
}

export async function createTestOrder() {
  return await prisma.order.create({
    data: {
      storeId: 'test-store-id',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '+919876543210',
      status: 'PENDING',
      paymentMethod: 'PREPAID',
      paymentStatus: 'PENDING',
      totalAmount: 1299,
      items: {
        create: {
          productId: 'test-product-id',
          quantity: 1,
          price: 1299,
        },
      },
    },
  });
}

export async function cleanupTestData() {
  await prisma.notificationLog.deleteMany({
    where: { storeId: 'test-store-id' },
  });
  await prisma.order.deleteMany({
    where: { storeId: 'test-store-id' },
  });
}
```

### Notification Flow Test

```typescript
// src/lib/notifications/__tests__/notification-flow.test.ts

import { notificationService } from '../notification-service';
import { setupTestStore, createTestOrder, cleanupTestData } from '@/lib/test-utils/setup-test-db';
import { MockSMSProvider, MockEmailProvider } from '../__mocks__';

describe('Notification Flow Integration', () => {
  let mockSMS: MockSMSProvider;
  let mockEmail: MockEmailProvider;

  beforeAll(async () => {
    await setupTestStore();
  });

  beforeEach(() => {
    mockSMS = new MockSMSProvider();
    mockEmail = new MockEmailProvider();
    
    // Inject mocks
    jest.spyOn(notificationService, 'getSMSProvider').mockReturnValue(mockSMS);
    jest.spyOn(notificationService, 'getEmailProvider').mockReturnValue(mockEmail);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('should send both SMS and email for ORDER_CONFIRMED', async () => {
    const order = await createTestOrder();

    await notificationService.trigger('test-store-id', 'ORDER_CONFIRMED', {
      order: {
        id: order.id,
        displayId: 'ORD-TEST123',
        total: 1299,
        itemCount: 1,
        items: [],
        paymentMethod: 'PREPAID',
      },
      customer: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+919876543210',
      },
      store: {
        name: 'Test Store',
        url: 'https://teststore.com',
      },
      trackingUrl: 'https://teststore.com/track/abc',
    });

    // Verify SMS was sent
    expect(mockSMS.getLastMessage()).toMatchObject({
      phone: '+919876543210',
      message: expect.stringContaining('ORD-TEST123'),
    });

    // Verify email was sent
    expect(mockEmail.getLastEmail()).toMatchObject({
      to: 'test@example.com',
      subject: expect.stringContaining('Order Confirmed'),
    });
  });

  it('should not send SMS when smsOrderConfirmed is disabled', async () => {
    // Disable SMS for order confirmed
    await prisma.notificationSettings.update({
      where: { storeId: 'test-store-id' },
      data: { smsOrderConfirmed: false },
    });

    await notificationService.trigger('test-store-id', 'ORDER_CONFIRMED', {
      // ... same data
    });

    expect(mockSMS.getAllMessages()).toHaveLength(0);
    expect(mockEmail.getAllEmails()).toHaveLength(1);
  });

  it('should log notification attempts', async () => {
    await notificationService.trigger('test-store-id', 'ORDER_CONFIRMED', {
      // ... data
    });

    const logs = await prisma.notificationLog.findMany({
      where: { storeId: 'test-store-id' },
    });

    expect(logs).toHaveLength(2); // SMS + Email
    expect(logs.map(l => l.channel)).toContain('SMS');
    expect(logs.map(l => l.channel)).toContain('EMAIL');
  });
});
```

---

## Production Monitoring

### Notification Dashboard Query

```typescript
// src/app/api/[storeId]/notifications/stats/route.ts

import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  const { storeId } = params;

  // Last 7 days stats
  const startDate = startOfDay(subDays(new Date(), 7));
  const endDate = endOfDay(new Date());

  // Aggregate stats
  const stats = await prismadb.notificationLog.groupBy({
    by: ['channel', 'status'],
    where: {
      storeId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: true,
  });

  // Format for dashboard
  const formattedStats = {
    email: {
      sent: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
    },
    sms: {
      sent: 0,
      delivered: 0,
      failed: 0,
    },
  };

  stats.forEach(stat => {
    const channel = stat.channel.toLowerCase() as 'email' | 'sms';
    const status = stat.status.toLowerCase() as keyof typeof formattedStats.email;
    if (formattedStats[channel] && status in formattedStats[channel]) {
      formattedStats[channel][status] = stat._count;
    }
  });

  // Recent failures for debugging
  const recentFailures = await prismadb.notificationLog.findMany({
    where: {
      storeId,
      status: { in: ['FAILED', 'BOUNCED', 'REJECTED'] },
      createdAt: { gte: startDate },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      type: true,
      channel: true,
      recipient: true,
      error: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    stats: formattedStats,
    recentFailures,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
  });
}
```

### Health Check Endpoint

```typescript
// src/app/api/health/notifications/route.ts

export async function GET() {
  const checks = {
    email: { status: 'unknown', latency: 0 },
    sms: { status: 'unknown', latency: 0 },
  };

  // Test email provider connectivity
  try {
    const emailStart = Date.now();
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Just validate API key by listing domains (doesn't send email)
    await resend.domains.list();
    
    checks.email = {
      status: 'healthy',
      latency: Date.now() - emailStart,
    };
  } catch (error) {
    checks.email = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Test SMS provider connectivity
  try {
    const smsStart = Date.now();
    
    // MSG91 balance check endpoint
    const response = await fetch(
      `https://control.msg91.com/api/balance.php?authkey=${process.env.MSG91_AUTH_KEY}&type=1`
    );
    
    if (response.ok) {
      checks.sms = {
        status: 'healthy',
        latency: Date.now() - smsStart,
      };
    } else {
      throw new Error('SMS API not responding');
    }
  } catch (error) {
    checks.sms = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  const overallHealthy = 
    checks.email.status === 'healthy' && 
    checks.sms.status === 'healthy';

  return NextResponse.json(
    {
      status: overallHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: overallHealthy ? 200 : 503 }
  );
}
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. Notifications Not Sending

```
SYMPTOM: Order placed but no SMS/Email sent
```

**Debugging Steps:**

```typescript
// Add to notification-service.ts for debugging
async trigger(storeId, type, data) {
  console.log('🔔 Notification trigger:', { storeId, type });
  
  // Check 1: Settings exist?
  const settings = await this.getSettings(storeId);
  if (!settings) {
    console.log('❌ No notification settings for store');
    return;
  }
  console.log('✅ Settings found:', settings);
  
  // Check 2: Event enabled?
  const emailKey = `email${toPascalCase(type)}`;
  const smsKey = `sms${toPascalCase(type)}`;
  console.log(`📧 Email enabled (${emailKey}):`, settings[emailKey]);
  console.log(`📱 SMS enabled (${smsKey}):`, settings[smsKey]);
  
  // Check 3: Integration configured?
  const emailIntegration = await getIntegration(storeId, 'EMAIL_SERVICE');
  const smsIntegration = await getIntegration(storeId, 'SMS_PROVIDER');
  console.log('📧 Email integration:', emailIntegration ? 'configured' : 'MISSING');
  console.log('📱 SMS integration:', smsIntegration ? 'configured' : 'MISSING');
  
  // ... rest of logic
}
```

**Common Fixes:**

| Issue | Fix |
|-------|-----|
| No settings record | Create NotificationSettings for store |
| Event disabled | Enable in Settings → Notifications |
| No integration | Configure in Settings → Integrations |
| Wrong API key | Re-enter credentials in integration settings |

#### 2. SMS Delivery Issues (India)

```
SYMPTOM: SMS sent but not received
```

**Checklist:**

- [ ] Phone number format correct? (`+919876543210` or `9876543210`)
- [ ] DLT registration complete? (MSG91 production)
- [ ] Template registered with TRAI?
- [ ] Template variables match exactly?
- [ ] Sender ID approved?
- [ ] Check MSG91/Fast2SMS dashboard for delivery reports

**Debug Script:**

```typescript
// scripts/debug-sms-delivery.ts

async function debugSMSDelivery(messageId: string) {
  // Check MSG91 delivery report
  const response = await fetch(
    `https://control.msg91.com/api/report.php?authkey=${process.env.MSG91_AUTH_KEY}&id=${messageId}`
  );
  
  const report = await response.json();
  console.log('📊 Delivery Report:', JSON.stringify(report, null, 2));
  
  // Possible statuses:
  // - DELIVERED: Received by phone
  // - SUBMITTED: Sent to carrier
  // - FAILED: Rejected by carrier
  // - BLOCKED: DND number
}
```

#### 3. Email Going to Spam

```
SYMPTOM: Emails sent but landing in spam folder
```

**Fixes:**

1. **DNS Setup (Required for production)**
   ```
   # Add these DNS records for your sending domain
   SPF:   v=spf1 include:_spf.resend.com ~all
   DKIM:  (get from Resend dashboard)
   DMARC: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
   ```

2. **Email Best Practices**
   - Use verified domain (not `onboarding@resend.dev`)
   - Include unsubscribe link
   - Maintain low bounce rate
   - Avoid spam trigger words

3. **Test with Mail Tester**
   ```typescript
   // Send test email to mail-tester.com address
   await emailService.send({
     to: 'test-xxxx@mail-tester.com',
     subject: 'Test Email',
     html: yourEmailHtml,
   });
   // Then check score at mail-tester.com
   ```

#### 4. Template Variables Not Replaced

```
SYMPTOM: Email shows "{{customerName}}" instead of actual name
```

**Debug:**

```typescript
// Add logging to template processor
function processTemplate(template, variables) {
  console.log('📝 Template processing:');
  console.log('   Input template:', template.substring(0, 100) + '...');
  console.log('   Variables:', JSON.stringify(variables, null, 2));
  
  // ... processing logic
  
  console.log('   Output:', result.substring(0, 100) + '...');
  return result;
}
```

**Common Causes:**

| Issue | Fix |
|-------|-----|
| Variable name typo | Check `{{customerName}}` vs `{{customer_name}}` |
| Missing variable | Ensure `prepareVariables()` includes all needed vars |
| Nested object | Use `{{customer.name}}` syntax or flatten |

---

## Debug Tools & Scripts

### Notification Tester Script

```typescript
// scripts/test-notification-full-flow.ts
// Run: npx ts-node scripts/test-notification-full-flow.ts

import { notificationService } from '@/lib/notifications/notification-service';

async function testFullFlow() {
  const storeId = process.env.TEST_STORE_ID || 'your-store-id';
  
  console.log('🧪 Testing Full Notification Flow');
  console.log('─'.repeat(50));
  
  // Test ORDER_CONFIRMED
  console.log('\n📦 Testing ORDER_CONFIRMED...');
  try {
    await notificationService.trigger(storeId, 'ORDER_CONFIRMED', {
      order: {
        id: 'test-order-123',
        displayId: 'ORD-TEST123',
        total: 1299,
        itemCount: 2,
        items: [
          { name: 'Test Product 1', quantity: 1, price: 799 },
          { name: 'Test Product 2', quantity: 1, price: 500 },
        ],
        paymentMethod: 'PREPAID',
      },
      customer: {
        name: 'Test User',
        email: process.env.NOTIFICATION_TEST_EMAIL!,
        phone: process.env.NOTIFICATION_TEST_PHONE!,
      },
      store: {
        name: 'Test Store',
        url: 'https://teststore.com',
      },
      trackingUrl: 'https://teststore.com/track/test-123',
    });
    console.log('✅ ORDER_CONFIRMED sent successfully');
  } catch (error) {
    console.log('❌ ORDER_CONFIRMED failed:', error);
  }

  // Test ORDER_SHIPPED
  console.log('\n🚚 Testing ORDER_SHIPPED...');
  try {
    await notificationService.trigger(storeId, 'ORDER_SHIPPED', {
      order: {
        id: 'test-order-123',
        displayId: 'ORD-TEST123',
      },
      customer: {
        name: 'Test User',
        email: process.env.NOTIFICATION_TEST_EMAIL!,
        phone: process.env.NOTIFICATION_TEST_PHONE!,
      },
      shipment: {
        trackingNumber: 'TRACK123456',
        courierName: 'Delhivery',
        trackingUrl: 'https://track.delhivery.com/TRACK123456',
        estimatedDelivery: '25 Feb 2026',
      },
      store: {
        name: 'Test Store',
      },
    });
    console.log('✅ ORDER_SHIPPED sent successfully');
  } catch (error) {
    console.log('❌ ORDER_SHIPPED failed:', error);
  }

  console.log('\n' + '─'.repeat(50));
  console.log('🧪 Test complete! Check your email/phone.');
}

testFullFlow();
```

### View Notification Logs Script

```typescript
// scripts/view-notification-logs.ts

import prismadb from '@/lib/prismadb';

async function viewLogs() {
  const storeId = process.argv[2];
  
  if (!storeId) {
    console.log('Usage: npx ts-node scripts/view-notification-logs.ts <storeId>');
    process.exit(1);
  }

  const logs = await prismadb.notificationLog.findMany({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log(`\n📋 Last 20 Notification Logs for ${storeId}\n`);
  console.log('─'.repeat(80));

  logs.forEach(log => {
    const statusEmoji = {
      PENDING: '⏳',
      SENT: '📤',
      DELIVERED: '✅',
      FAILED: '❌',
      BOUNCED: '🔙',
      REJECTED: '🚫',
    }[log.status];

    console.log(`
${statusEmoji} ${log.type} via ${log.channel}
   To: ${log.recipient}
   Provider: ${log.provider}
   Status: ${log.status}
   ${log.error ? `Error: ${log.error}` : ''}
   Time: ${log.createdAt.toISOString()}
${'─'.repeat(80)}`);
  });
}

viewLogs();
```

### Resend Webhook Debug

```typescript
// src/app/api/webhooks/resend/route.ts

export async function POST(req: Request) {
  const body = await req.json();
  
  // Log webhook for debugging
  console.log('📬 Resend Webhook:', JSON.stringify(body, null, 2));
  
  // Update notification log based on event
  switch (body.type) {
    case 'email.delivered':
      await prismadb.notificationLog.updateMany({
        where: { externalId: body.data.email_id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(body.created_at),
        },
      });
      break;
    
    case 'email.bounced':
      await prismadb.notificationLog.updateMany({
        where: { externalId: body.data.email_id },
        data: {
          status: 'BOUNCED',
          error: body.data.bounce_type,
        },
      });
      break;
    
    case 'email.complained':
      await prismadb.notificationLog.updateMany({
        where: { externalId: body.data.email_id },
        data: {
          status: 'REJECTED',
          error: 'Marked as spam by recipient',
        },
      });
      break;
  }
  
  return new Response('OK');
}
```

---

## Summary

### Testing Checklist

- [ ] Set up test environment variables
- [ ] Configure mock providers for unit tests
- [ ] Write integration tests with test database
- [ ] Test each notification type manually
- [ ] Verify template variable replacement
- [ ] Test failure scenarios
- [ ] Set up monitoring endpoints
- [ ] Configure webhook handling

### Key Files for Testing

| File | Purpose |
|------|---------|
| `__mocks__/mock-sms-provider.ts` | Mock SMS for tests |
| `__mocks__/mock-email-provider.ts` | Mock email for tests |
| `scripts/test-fast2sms.ts` | Test Fast2SMS connectivity |
| `scripts/test-msg91.ts` | Test MSG91 connectivity |
| `scripts/test-notification-full-flow.ts` | End-to-end test |
| `scripts/view-notification-logs.ts` | Debug logs |
| `api/health/notifications/route.ts` | Health check |

---

*Continue to [Part 10: Store Integration Model Analysis](./10_STORE_INTEGRATION_MODEL_ANALYSIS.md)*
