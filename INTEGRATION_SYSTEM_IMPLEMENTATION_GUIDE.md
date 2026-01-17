# Integration System Implementation Guide

**Date:** October 14, 2025  
**Focus:** User API Keys Management & Service Implementation  
**Status:** Technical Implementation Guide

---

## Table of Contents
1. [UI Flow Overview](#ui-flow-overview)
2. [Database Schema Explained](#database-schema-explained)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Integration Types Examples](#integration-types-examples)
5. [Code Implementation](#code-implementation)

---

## UI Flow Overview

### Current Flow
```
1. User arrives → Clerk Auth (Sign In/Sign Up)
2. Check if store exists
   ├─ No → Modal: Create Store → Dashboard
   └─ Yes → Dashboard
```

### New Flow with Integrations
```
1. User arrives → Clerk Auth (Sign In/Sign Up)
2. Check if store exists
   ├─ No → Modal: Create Store → Welcome Screen
   └─ Yes → Dashboard

3. Welcome Screen (First Time Setup)
   ┌──────────────────────────────────────────┐
   │  🎉 Welcome to Your Store Dashboard!     │
   │                                          │
   │  Let's set up your store integrations    │
   │                                          │
   │  ⚡ Required (to process orders)         │
   │  ☑ Payment Gateway (Razorpay/Stripe)    │
   │                                          │
   │  📱 Optional (can add later)             │
   │  ☐ SMS Provider (for OTP)               │
   │  ☐ Email Service (for notifications)    │
   │                                          │
   │  [Skip for now]  [Set up Integrations]  │
   └──────────────────────────────────────────┘

4. If "Set up Integrations" → Integration Setup Wizard
5. If "Skip for now" → Dashboard (with banner reminder)

6. Dashboard Navigation
   ├─ Settings → Integrations (can configure anytime)
   └─ Top Banner (if payment not configured)
       "⚠️ Payment gateway not configured. Orders won't work. [Set up now]"
```

---

## Database Schema Explained

### Problem: How to store different services with different numbers of keys?

**Example:**
- **Razorpay** needs: `key_id`, `key_secret`, `webhook_secret` (3 keys)
- **Stripe** needs: `publishable_key`, `secret_key`, `webhook_secret` (3 keys)
- **MSG91** needs: `auth_key`, `sender_id` (2 keys)
- **SendGrid** needs: `api_key`, `from_email` (2 keys)

### Solution: Flexible JSON Schema

Instead of creating rigid columns for each service, we use **JSON/JSONB** to store dynamic key-value pairs.

```prisma
model StoreIntegration {
  id          String   @id @default(uuid())
  storeId     String
  store       Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  // What type of integration (payment, sms, email, etc.)
  type        IntegrationType
  
  // Which specific service (razorpay, stripe, msg91, etc.)
  provider    String
  
  // All the keys for this service stored as encrypted JSON
  credentials String   @db.Text // Encrypted JSON string
  
  // Additional settings (optional)
  config      Json?    // Non-sensitive settings
  
  // Status
  isActive    Boolean  @default(true)
  isDefault   Boolean  @default(false) // If user has multiple payment gateways
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([storeId, type, provider])
  @@index([storeId])
  @@index([type])
}

enum IntegrationType {
  PAYMENT_GATEWAY
  SMS_PROVIDER
  EMAIL_SERVICE
  STORAGE_SERVICE
  ANALYTICS
  SHIPPING
  NOTIFICATION
}
```

### How Credentials are Stored

**Example 1: Razorpay**
```typescript
// What user enters in UI:
{
  key_id: "rzp_test_1234567890",
  key_secret: "abcdefghijklmnopqrstuvwxyz",
  webhook_secret: "whsec_1234567890abcdef"
}

// Stored in database (credentials column):
{
  encrypted: "AES_ENCRYPTED_BLOB_HERE",
  // When decrypted, becomes the object above
}
```

**Example 2: Stripe**
```typescript
// What user enters in UI:
{
  publishable_key: "pk_test_1234567890",
  secret_key: "sk_test_abcdefghijklmn",
  webhook_secret: "whsec_9876543210"
}

// Stored same way - encrypted JSON
```

**Example 3: MSG91**
```typescript
// What user enters in UI:
{
  auth_key: "1234567890ABCDEFGHIJ",
  sender_id: "MSGIND"
}

// Stored same way - encrypted JSON
```

### Why This Works
✅ Flexible - Can add new services without schema changes  
✅ Secure - All credentials encrypted  
✅ Scalable - Works for any number of keys  
✅ Clean - One row per integration  

---

## Step-by-Step Implementation

### Phase 1: Database Setup

#### Step 1.1: Update Prisma Schema

Add to `prisma/schema.prisma`:

```prisma
model Store {
  id               String               @id @default(uuid())
  name             String
  userId           String               @unique
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt
  
  // Existing relations
  billboards       Billboard[]          @relation("StoreToBillboard")
  categories       Category[]           @relation("StoreToCategory")
  sizes            Size[]               @relation("StoreToSize")
  products         Product[]            @relation("StoreToProduct")
  orders           Order[]              @relation("StoreToOrder")
  upcomingProducts UpcomingProduct[]    @relation("StoreToUpcomingProduct")
  mainBillboard    MainBillboard?       @relation("StoreToMainBillboard")
  
  // NEW: Integrations
  integrations     StoreIntegration[]
  
  @@index([userId])
}

model StoreIntegration {
  id          String            @id @default(uuid())
  storeId     String
  store       Store             @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  type        IntegrationType
  provider    String            // "razorpay", "stripe", "msg91", etc.
  credentials String            @db.Text // Encrypted JSON
  config      Json?             // Non-sensitive settings
  
  isActive    Boolean           @default(true)
  isDefault   Boolean           @default(false)
  
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  
  @@unique([storeId, type, provider])
  @@index([storeId])
  @@index([type])
}

enum IntegrationType {
  PAYMENT_GATEWAY
  SMS_PROVIDER
  EMAIL_SERVICE
  STORAGE_SERVICE
  ANALYTICS
  SHIPPING
  NOTIFICATION
}
```

#### Step 1.2: Run Migration

```bash
npx prisma migrate dev --name add_store_integrations
npx prisma generate
```

---

### Phase 2: Encryption Service

Create `src/lib/encryption.ts`:

```typescript
import crypto from 'crypto';

// Generate a key: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
}

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export const encryption = {
  /**
   * Encrypts a JSON object
   * @param data Object to encrypt
   * @returns Encrypted string in format: iv:encryptedData
   */
  encrypt(data: Record<string, any>): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );
    
    const jsonString = JSON.stringify(data);
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  },

  /**
   * Decrypts an encrypted string back to JSON object
   * @param encryptedData Encrypted string in format: iv:encryptedData
   * @returns Decrypted object
   */
  decrypt(encryptedData: string): Record<string, any> {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
};
```

Add to `.env`:
```env
# Generate with: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_64_character_hex_string_here
```

---

### Phase 3: Integration Service

Create `src/lib/integration-service.ts`:

```typescript
import prismadb from '@/lib/prismadb';
import { encryption } from '@/lib/encryption';
import { IntegrationType } from '@prisma/client';

export const integrationService = {
  /**
   * Save integration credentials
   */
  async saveIntegration(params: {
    storeId: string;
    type: IntegrationType;
    provider: string;
    credentials: Record<string, any>;
    config?: Record<string, any>;
    isDefault?: boolean;
  }) {
    const { storeId, type, provider, credentials, config, isDefault } = params;
    
    // Encrypt credentials
    const encryptedCredentials = encryption.encrypt(credentials);
    
    // If this is set as default, unset other defaults of same type
    if (isDefault) {
      await prismadb.storeIntegration.updateMany({
        where: { storeId, type },
        data: { isDefault: false }
      });
    }
    
    // Upsert integration
    return await prismadb.storeIntegration.upsert({
      where: {
        storeId_type_provider: {
          storeId,
          type,
          provider
        }
      },
      update: {
        credentials: encryptedCredentials,
        config: config || undefined,
        isDefault: isDefault || false,
        updatedAt: new Date()
      },
      create: {
        storeId,
        type,
        provider,
        credentials: encryptedCredentials,
        config: config || undefined,
        isDefault: isDefault || false
      }
    });
  },

  /**
   * Get decrypted credentials for a specific integration
   */
  async getCredentials(
    storeId: string,
    type: IntegrationType,
    provider?: string
  ): Promise<Record<string, any> | null> {
    let integration;
    
    if (provider) {
      // Get specific provider
      integration = await prismadb.storeIntegration.findUnique({
        where: {
          storeId_type_provider: { storeId, type, provider }
        }
      });
    } else {
      // Get default provider for this type
      integration = await prismadb.storeIntegration.findFirst({
        where: { storeId, type, isDefault: true, isActive: true }
      });
      
      // If no default, get any active integration of this type
      if (!integration) {
        integration = await prismadb.storeIntegration.findFirst({
          where: { storeId, type, isActive: true }
        });
      }
    }
    
    if (!integration) return null;
    
    // Decrypt and return credentials
    return encryption.decrypt(integration.credentials);
  },

  /**
   * Get all integrations for a store (without decrypting)
   */
  async getIntegrations(storeId: string) {
    const integrations = await prismadb.storeIntegration.findMany({
      where: { storeId },
      select: {
        id: true,
        type: true,
        provider: true,
        config: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true
        // Note: credentials are NOT selected for security
      }
    });
    
    return integrations;
  },

  /**
   * Check if integration exists
   */
  async hasIntegration(
    storeId: string,
    type: IntegrationType,
    provider?: string
  ): Promise<boolean> {
    const count = await prismadb.storeIntegration.count({
      where: {
        storeId,
        type,
        provider,
        isActive: true
      }
    });
    
    return count > 0;
  },

  /**
   * Delete integration
   */
  async deleteIntegration(
    storeId: string,
    type: IntegrationType,
    provider: string
  ) {
    return await prismadb.storeIntegration.delete({
      where: {
        storeId_type_provider: { storeId, type, provider }
      }
    });
  }
};
```

---

### Phase 4: Integration Configuration Definitions

Create `src/lib/integration-configs.ts`:

```typescript
import { IntegrationType } from '@prisma/client';

export interface IntegrationFieldConfig {
  name: string;          // Field name in credentials object
  label: string;         // Display label
  type: 'text' | 'password' | 'email' | 'url';
  placeholder?: string;
  required: boolean;
  helpText?: string;
  pattern?: string;      // Regex for validation
}

export interface IntegrationProviderConfig {
  provider: string;
  displayName: string;
  type: IntegrationType;
  description: string;
  icon?: string;
  fields: IntegrationFieldConfig[];
  setupGuideUrl?: string;
}

/**
 * All integration configurations
 * This defines what fields each service needs
 */
export const INTEGRATION_CONFIGS: IntegrationProviderConfig[] = [
  // PAYMENT GATEWAYS
  {
    provider: 'razorpay',
    displayName: 'Razorpay',
    type: 'PAYMENT_GATEWAY',
    description: 'Accept payments via Razorpay',
    icon: '💳',
    setupGuideUrl: 'https://razorpay.com/docs/api/',
    fields: [
      {
        name: 'key_id',
        label: 'Key ID',
        type: 'text',
        placeholder: 'rzp_test_xxxxx or rzp_live_xxxxx',
        required: true,
        helpText: 'Found in Razorpay Dashboard → Settings → API Keys',
        pattern: '^rzp_(test|live)_[a-zA-Z0-9]+$'
      },
      {
        name: 'key_secret',
        label: 'Key Secret',
        type: 'password',
        placeholder: 'Your secret key',
        required: true,
        helpText: 'Keep this secret! Never share publicly'
      },
      {
        name: 'webhook_secret',
        label: 'Webhook Secret',
        type: 'password',
        placeholder: 'whsec_xxxxx',
        required: false,
        helpText: 'Used to verify webhook authenticity (optional)'
      }
    ]
  },
  {
    provider: 'stripe',
    displayName: 'Stripe',
    type: 'PAYMENT_GATEWAY',
    description: 'Accept payments via Stripe',
    icon: '💳',
    setupGuideUrl: 'https://stripe.com/docs/keys',
    fields: [
      {
        name: 'publishable_key',
        label: 'Publishable Key',
        type: 'text',
        placeholder: 'pk_test_xxxxx or pk_live_xxxxx',
        required: true,
        helpText: 'Safe to use in frontend',
        pattern: '^pk_(test|live)_[a-zA-Z0-9]+$'
      },
      {
        name: 'secret_key',
        label: 'Secret Key',
        type: 'password',
        placeholder: 'sk_test_xxxxx or sk_live_xxxxx',
        required: true,
        helpText: 'Keep this secret!',
        pattern: '^sk_(test|live)_[a-zA-Z0-9]+$'
      },
      {
        name: 'webhook_secret',
        label: 'Webhook Secret',
        type: 'password',
        placeholder: 'whsec_xxxxx',
        required: false,
        helpText: 'For webhook verification'
      }
    ]
  },

  // SMS PROVIDERS
  {
    provider: 'msg91',
    displayName: 'MSG91',
    type: 'SMS_PROVIDER',
    description: 'Send OTP and SMS via MSG91',
    icon: '📱',
    setupGuideUrl: 'https://msg91.com/help/MSG91/getting-started',
    fields: [
      {
        name: 'auth_key',
        label: 'Auth Key',
        type: 'password',
        placeholder: 'Your MSG91 auth key',
        required: true,
        helpText: 'Found in MSG91 Dashboard'
      },
      {
        name: 'sender_id',
        label: 'Sender ID',
        type: 'text',
        placeholder: 'MSGIND',
        required: true,
        helpText: '6 characters sender ID (approved by MSG91)'
      },
      {
        name: 'template_id',
        label: 'OTP Template ID',
        type: 'text',
        placeholder: '1234567890',
        required: false,
        helpText: 'Pre-approved template ID for OTP'
      }
    ]
  },
  {
    provider: 'fast2sms',
    displayName: 'Fast2SMS',
    type: 'SMS_PROVIDER',
    description: 'Send OTP and SMS via Fast2SMS',
    icon: '📱',
    setupGuideUrl: 'https://docs.fast2sms.com/',
    fields: [
      {
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your Fast2SMS API key',
        required: true,
        helpText: 'Found in Fast2SMS Dashboard → Dev API'
      }
    ]
  },
  {
    provider: 'twilio',
    displayName: 'Twilio',
    type: 'SMS_PROVIDER',
    description: 'Send OTP and SMS via Twilio',
    icon: '📱',
    setupGuideUrl: 'https://www.twilio.com/docs/sms',
    fields: [
      {
        name: 'account_sid',
        label: 'Account SID',
        type: 'text',
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        required: true,
        helpText: 'Found in Twilio Console'
      },
      {
        name: 'auth_token',
        label: 'Auth Token',
        type: 'password',
        placeholder: 'Your auth token',
        required: true,
        helpText: 'Keep this secret!'
      },
      {
        name: 'phone_number',
        label: 'Twilio Phone Number',
        type: 'text',
        placeholder: '+1234567890',
        required: true,
        helpText: 'Your Twilio phone number'
      }
    ]
  },

  // EMAIL SERVICES
  {
    provider: 'sendgrid',
    displayName: 'SendGrid',
    type: 'EMAIL_SERVICE',
    description: 'Send emails via SendGrid',
    icon: '📧',
    setupGuideUrl: 'https://sendgrid.com/docs/ui/account-and-settings/api-keys/',
    fields: [
      {
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: 'SG.xxxxx',
        required: true,
        helpText: 'Create in SendGrid Dashboard → Settings → API Keys'
      },
      {
        name: 'from_email',
        label: 'From Email',
        type: 'email',
        placeholder: 'noreply@yourstore.com',
        required: true,
        helpText: 'Must be verified in SendGrid'
      },
      {
        name: 'from_name',
        label: 'From Name',
        type: 'text',
        placeholder: 'Your Store Name',
        required: false,
        helpText: 'Display name for emails'
      }
    ]
  },
  {
    provider: 'aws_ses',
    displayName: 'AWS SES',
    type: 'EMAIL_SERVICE',
    description: 'Send emails via Amazon SES',
    icon: '📧',
    setupGuideUrl: 'https://docs.aws.amazon.com/ses/',
    fields: [
      {
        name: 'access_key_id',
        label: 'Access Key ID',
        type: 'text',
        placeholder: 'AKIAxxxxxxxxxxxxxxxx',
        required: true,
        helpText: 'AWS IAM access key'
      },
      {
        name: 'secret_access_key',
        label: 'Secret Access Key',
        type: 'password',
        placeholder: 'Your secret key',
        required: true,
        helpText: 'Keep this secret!'
      },
      {
        name: 'region',
        label: 'AWS Region',
        type: 'text',
        placeholder: 'us-east-1',
        required: true,
        helpText: 'e.g., us-east-1, ap-south-1'
      },
      {
        name: 'from_email',
        label: 'From Email',
        type: 'email',
        placeholder: 'noreply@yourstore.com',
        required: true,
        helpText: 'Must be verified in SES'
      }
    ]
  }
];

/**
 * Get configuration for a specific provider
 */
export function getIntegrationConfig(provider: string): IntegrationProviderConfig | undefined {
  return INTEGRATION_CONFIGS.find(config => config.provider === provider);
}

/**
 * Get all providers for a specific type
 */
export function getProvidersByType(type: IntegrationType): IntegrationProviderConfig[] {
  return INTEGRATION_CONFIGS.filter(config => config.type === type);
}
```

---

### Phase 5: UI Components

#### 5.1 Integration Card Component

Create `src/components/integration-card.tsx`:

```typescript
"use client";

import { IntegrationProviderConfig } from '@/lib/integration-configs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Settings, Trash2 } from 'lucide-react';

interface IntegrationCardProps {
  config: IntegrationProviderConfig;
  isConfigured: boolean;
  isDefault?: boolean;
  onConfigure: () => void;
  onDelete?: () => void;
}

export function IntegrationCard({
  config,
  isConfigured,
  isDefault,
  onConfigure,
  onDelete
}: IntegrationCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{config.icon}</div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {config.displayName}
                {isConfigured && (
                  <Badge variant={isDefault ? "default" : "secondary"}>
                    {isDefault ? "Default" : "Configured"}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.setupGuideUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(config.setupGuideUrl, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Setup Guide
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isConfigured && onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              onClick={onConfigure}
            >
              <Settings className="mr-2 h-4 w-4" />
              {isConfigured ? "Update" : "Configure"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 5.2 Integration Form Component

Create `src/components/integration-form.tsx`:

```typescript
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { IntegrationProviderConfig } from '@/lib/integration-configs';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useParams } from 'next/navigation';

interface IntegrationFormProps {
  config: IntegrationProviderConfig;
  onSuccess: () => void;
  onCancel: () => void;
  existingCredentials?: Record<string, any>;
  isDefault?: boolean;
}

export function IntegrationForm({
  config,
  onSuccess,
  onCancel,
  existingCredentials,
  isDefault
}: IntegrationFormProps) {
  const params = useParams();
  const [loading, setLoading] = useState(false);

  // Build dynamic schema based on fields
  const schemaFields: Record<string, any> = {};
  config.fields.forEach(field => {
    let fieldSchema = z.string();
    
    if (field.required) {
      fieldSchema = fieldSchema.min(1, `${field.label} is required`);
    } else {
      fieldSchema = fieldSchema.optional();
    }
    
    if (field.pattern) {
      fieldSchema = fieldSchema.regex(
        new RegExp(field.pattern),
        `Invalid ${field.label} format`
      );
    }
    
    if (field.type === 'email') {
      fieldSchema = fieldSchema.email(`Invalid email format`);
    }
    
    schemaFields[field.name] = fieldSchema;
  });

  // Add isDefault field
  schemaFields.isDefault = z.boolean().default(false);

  const formSchema = z.object(schemaFields);

  // Initialize form with existing values
  const defaultValues: Record<string, any> = { isDefault: isDefault || false };
  config.fields.forEach(field => {
    defaultValues[field.name] = existingCredentials?.[field.name] || '';
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);

      const { isDefault: shouldBeDefault, ...credentials } = data;

      await axios.post(`/api/${params.storeId}/integrations`, {
        type: config.type,
        provider: config.provider,
        credentials,
        isDefault: shouldBeDefault
      });

      toast.success(`${config.displayName} configured successfully`);
      onSuccess();
    } catch (error) {
      toast.error('Something went wrong');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          {config.fields.map((field) => (
            <FormField
              key={field.name}
              control={form.control}
              name={field.name}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type={field.type}
                      placeholder={field.placeholder}
                      disabled={loading}
                      {...formField}
                    />
                  </FormControl>
                  {field.helpText && (
                    <FormDescription>{field.helpText}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          <FormField
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Set as default {config.type.toLowerCase().replace('_', ' ')}
                  </FormLabel>
                  <FormDescription>
                    This will be used by default for all transactions
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

---

### Phase 6: API Routes

#### 6.1 Save Integration

Create `src/app/api/[storeId]/integrations/route.ts`:

```typescript
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';
import { integrationService } from '@/lib/integration-service';
import { IntegrationType } from '@prisma/client';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { userId } = await auth();
    const { storeId } = await params;
    const body = await req.json();

    if (!userId) {
      return new NextResponse('Unauthenticated', { status: 401 });
    }

    const { type, provider, credentials, config, isDefault } = body;

    if (!type || !provider || !credentials) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Verify store ownership
    const store = await prismadb.store.findFirst({
      where: { id: storeId, userId }
    });

    if (!store) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // Save integration
    const integration = await integrationService.saveIntegration({
      storeId,
      type: type as IntegrationType,
      provider,
      credentials,
      config,
      isDefault
    });

    return NextResponse.json(integration);
  } catch (error) {
    console.log('[INTEGRATIONS_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { userId } = await auth();
    const { storeId } = await params;

    if (!userId) {
      return new NextResponse('Unauthenticated', { status: 401 });
    }

    // Verify store ownership
    const store = await prismadb.store.findFirst({
      where: { id: storeId, userId }
    });

    if (!store) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // Get all integrations (without credentials)
    const integrations = await integrationService.getIntegrations(storeId);

    return NextResponse.json(integrations);
  } catch (error) {
    console.log('[INTEGRATIONS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
```

#### 6.2 Delete Integration

Create `src/app/api/[storeId]/integrations/[integrationId]/route.ts`:

```typescript
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ storeId: string; integrationId: string }> }
) {
  try {
    const { userId } = await auth();
    const { storeId, integrationId } = await params;

    if (!userId) {
      return new NextResponse('Unauthenticated', { status: 401 });
    }

    // Verify store ownership
    const store = await prismadb.store.findFirst({
      where: { id: storeId, userId }
    });

    if (!store) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // Delete integration
    const integration = await prismadb.storeIntegration.delete({
      where: { id: integrationId, storeId }
    });

    return NextResponse.json(integration);
  } catch (error) {
    console.log('[INTEGRATION_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
```

---

### Phase 7: Integrations Settings Page

Create `src/app/(dashboard)/[storeId]/(routes)/settings/integrations/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IntegrationCard } from '@/components/integration-card';
import { IntegrationForm } from '@/components/integration-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  INTEGRATION_CONFIGS,
  getProvidersByType,
  IntegrationProviderConfig
} from '@/lib/integration-configs';
import { IntegrationType } from '@prisma/client';
import { toast } from 'react-hot-toast';

interface ConfiguredIntegration {
  id: string;
  type: IntegrationType;
  provider: string;
  isDefault: boolean;
  isActive: boolean;
}

export default function IntegrationsPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [configuredIntegrations, setConfiguredIntegrations] = useState<ConfiguredIntegration[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<IntegrationProviderConfig | null>(null);

  const fetchIntegrations = async () => {
    try {
      const response = await axios.get(`/api/${params.storeId}/integrations`);
      setConfiguredIntegrations(response.data);
    } catch (error) {
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleConfigure = (config: IntegrationProviderConfig) => {
    setSelectedConfig(config);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    setSelectedConfig(null);
    fetchIntegrations();
  };

  const handleDelete = async (integrationId: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    try {
      await axios.delete(`/api/${params.storeId}/integrations/${integrationId}`);
      toast.success('Integration deleted');
      fetchIntegrations();
    } catch (error) {
      toast.error('Failed to delete integration');
    }
  };

  const isConfigured = (provider: string, type: IntegrationType) => {
    return configuredIntegrations.find(
      i => i.provider === provider && i.type === type
    );
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading
          title="Integrations"
          description="Manage your store's third-party integrations"
        />
        <Separator />

        <Tabs defaultValue="payment" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payment">Payment Gateways</TabsTrigger>
            <TabsTrigger value="sms">SMS Providers</TabsTrigger>
            <TabsTrigger value="email">Email Services</TabsTrigger>
          </TabsList>

          <TabsContent value="payment" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {getProvidersByType('PAYMENT_GATEWAY').map((config) => {
                const configured = isConfigured(config.provider, config.type);
                return (
                  <IntegrationCard
                    key={config.provider}
                    config={config}
                    isConfigured={!!configured}
                    isDefault={configured?.isDefault}
                    onConfigure={() => handleConfigure(config)}
                    onDelete={configured ? () => handleDelete(configured.id) : undefined}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {getProvidersByType('SMS_PROVIDER').map((config) => {
                const configured = isConfigured(config.provider, config.type);
                return (
                  <IntegrationCard
                    key={config.provider}
                    config={config}
                    isConfigured={!!configured}
                    isDefault={configured?.isDefault}
                    onConfigure={() => handleConfigure(config)}
                    onDelete={configured ? () => handleDelete(configured.id) : undefined}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {getProvidersByType('EMAIL_SERVICE').map((config) => {
                const configured = isConfigured(config.provider, config.type);
                return (
                  <IntegrationCard
                    key={config.provider}
                    config={config}
                    isConfigured={!!configured}
                    isDefault={configured?.isDefault}
                    onConfigure={() => handleConfigure(config)}
                    onDelete={configured ? () => handleDelete(configured.id) : undefined}
                  />
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Configure {selectedConfig?.displayName}
            </DialogTitle>
            <DialogDescription>
              {selectedConfig?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedConfig && (
            <IntegrationForm
              config={selectedConfig}
              onSuccess={handleSuccess}
              onCancel={() => setDialogOpen(false)}
              existingCredentials={undefined}
              isDefault={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

### Phase 8: Update Navigation

Update `src/components/main-nav.tsx` to add Settings link:

```typescript
// Add to routes array
{
  href: `/${params.storeId}/settings`,
  label: 'Settings',
  active: pathname === `/${params.storeId}/settings`,
}
```

Create Settings landing page `src/app/(dashboard)/[storeId]/(routes)/settings/page.tsx`:

```typescript
"use client";

import { redirect } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function SettingsPage() {
  const params = useParams();

  useEffect(() => {
    redirect(`/${params.storeId}/settings/integrations`);
  }, []);

  return null;
}
```

---

## Example Usage: Multiple Payment Gateways

### Scenario: User has both Razorpay and Stripe configured

**Database:**
```json
// Row 1
{
  "storeId": "store-123",
  "type": "PAYMENT_GATEWAY",
  "provider": "razorpay",
  "credentials": "encrypted:{key_id:rzp_test_xxx,key_secret:yyy,webhook_secret:zzz}",
  "isDefault": true,
  "isActive": true
}

// Row 2
{
  "storeId": "store-123",
  "type": "PAYMENT_GATEWAY",
  "provider": "stripe",
  "credentials": "encrypted:{publishable_key:pk_test_xxx,secret_key:sk_test_yyy,webhook_secret:zzz}",
  "isDefault": false,
  "isActive": true
}
```

**Fetching Default Payment Gateway:**
```typescript
// In checkout route
const credentials = await integrationService.getCredentials(
  storeId,
  'PAYMENT_GATEWAY'
  // No provider specified, so it returns the default one (Razorpay)
);

// credentials = { key_id: 'rzp_test_xxx', key_secret: 'yyy', webhook_secret: 'zzz' }
```

**Fetching Specific Provider:**
```typescript
const stripeCredentials = await integrationService.getCredentials(
  storeId,
  'PAYMENT_GATEWAY',
  'stripe'
);

// stripeCredentials = { publishable_key: 'pk_test_xxx', secret_key: 'sk_test_yyy', ... }
```

---

## Complete UI Flow Summary

```
1. User Signs Up
   └─> Clerk Auth

2. Create Store Modal
   └─> Store Created

3. First Time Setup Screen
   ┌────────────────────────────────────────┐
   │  Welcome! Let's set up your store      │
   │                                        │
   │  Required:                             │
   │  [ ] Payment Gateway                   │
   │                                        │
   │  Optional:                             │
   │  [ ] SMS Provider                      │
   │  [ ] Email Service                     │
   │                                        │
   │  [Skip] [Set up Now]                   │
   └────────────────────────────────────────┘

4. If "Set up Now"
   └─> Integration Setup Wizard
       ├─> Step 1: Choose Payment Gateway (Razorpay/Stripe)
       ├─> Step 2: Enter API Keys
       ├─> Step 3: Test Connection
       └─> Step 4: Complete

5. Dashboard
   ├─> Top Banner (if payment not configured)
   │   "⚠️ Set up payment gateway to accept orders [Configure]"
   │
   └─> Settings → Integrations
       ├─> Payment Gateways Tab
       │   ├─> Razorpay Card [Configure]
       │   └─> Stripe Card [Configure]
       │
       ├─> SMS Providers Tab
       │   ├─> MSG91 Card [Configure]
       │   ├─> Fast2SMS Card [Configure]
       │   └─> Twilio Card [Configure]
       │
       └─> Email Services Tab
           ├─> SendGrid Card [Configure]
           └─> AWS SES Card [Configure]
```

---

## Next Steps

1. ✅ Run Prisma migration
2. ✅ Add encryption key to .env
3. ✅ Create encryption service
4. ✅ Create integration service
5. ✅ Add integration configs
6. ✅ Create UI components
7. ✅ Create API routes
8. ✅ Create settings page
9. ✅ Update navigation
10. ⬜ Update checkout to use dynamic credentials (next document)

---

## Summary

**Database Schema:**
- One flexible table `StoreIntegration`
- Stores encrypted JSON credentials
- Supports any number of fields per service
- One row per integration

**Multiple Services:**
- Users can add multiple payment gateways
- Mark one as default
- System uses default unless specified

**Security:**
- All credentials encrypted at rest
- AES-256 encryption
- Decrypted only when needed
- Never returned in API responses

**Flexibility:**
- Easy to add new services (just add to configs)
- No schema changes needed
- Each service defines its own fields

---

This implementation guide focuses purely on the technical aspects of managing user API keys and integrations, without business/subscription concerns!
