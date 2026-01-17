/**
 * ============================================================================
 * INTEGRATION CONFIGURATIONS - Define All Supported Services
 * ============================================================================
 * 
 * This file defines what fields each third-party service needs.
 * When adding a new service, just add it to INTEGRATION_CONFIGS array.
 * 
 * Why This Approach?
 * - Different services need different fields:
 *   * Razorpay needs: key_id, key_secret, webhook_secret (3 fields)
 *   * MSG91 needs: auth_key, sender_id (2 fields)
 *   * Twilio needs: account_sid, auth_token, phone_number (3 fields)
 * 
 * - This config drives the UI:
 *   * Form automatically generates input fields based on config
 *   * Validation rules come from config
 *   * Help text and placeholders come from config
 * 
 * - Easy to add new services:
 *   * Copy an existing config
 *   * Change provider name and fields
 *   * UI automatically adapts!
 * 
 * ============================================================================
 */

// Import IntegrationType enum from generated Prisma client
import { IntegrationType } from '@/generated/prisma';

/**
 * Defines a single field/input in the integration form
 */
export interface IntegrationFieldConfig {
  name: string;          // Field name in credentials object (e.g., "key_id")
  label: string;         // Display label in form (e.g., "Key ID")
  type: 'text' | 'password' | 'email' | 'url'; // HTML input type
  placeholder?: string;  // Placeholder text
  required: boolean;     // Is this field mandatory?
  helpText?: string;     // Help text below field
  pattern?: string;      // Regex pattern for validation (optional)
}

/**
 * Defines a complete integration provider configuration
 */
export interface IntegrationProviderConfig {
  provider: string;           // Unique identifier (e.g., "razorpay", "stripe")
  displayName: string;        // User-friendly name (e.g., "Razorpay")
  type: IntegrationType;      // Category (PAYMENT_GATEWAY, SMS_PROVIDER, etc.)
  description: string;        // Short description of what this service does
  icon?: string;              // Emoji or icon to display
  fields: IntegrationFieldConfig[];  // Array of fields this service needs
  setupGuideUrl?: string;     // Link to setup documentation
  enabled: boolean;           // Is this provider ready to use?
  comingSoon?: boolean;       // Show "Coming Soon" badge if not enabled
}

/**
 * ============================================================================
 * ALL INTEGRATION CONFIGURATIONS
 * ============================================================================
 * 
 * Add new services here. The UI will automatically adapt.
 * ============================================================================
 */
export const INTEGRATION_CONFIGS: IntegrationProviderConfig[] = [
  
  // ==========================================================================
  // PAYMENT GATEWAYS
  // ==========================================================================
  
  {
    provider: 'razorpay',
    displayName: 'Razorpay',
    type: 'PAYMENT_GATEWAY',
    description: 'Accept payments via Razorpay (Credit/Debit cards, UPI, NetBanking)',
    icon: '💳',
    enabled: true,  // ✅ Razorpay is working
    setupGuideUrl: 'https://razorpay.com/docs/api/',
    fields: [
      {
        name: 'key_id',
        label: 'Key ID',
        type: 'text',
        placeholder: 'rzp_test_xxxxx or rzp_live_xxxxx',
        required: true,
        helpText: 'Found in Razorpay Dashboard → Settings → API Keys',
        // Validates format: rzp_test_xxx or rzp_live_xxx
        pattern: '^rzp_(test|live)_[a-zA-Z0-9]+$'
      },
      {
        name: 'key_secret',
        label: 'Key Secret',
        type: 'password',
        placeholder: 'Your secret key',
        required: true,
        helpText: 'Keep this secret! Never share publicly or commit to git'
      },
      {
        name: 'webhook_secret',
        label: 'Webhook Secret',
        type: 'password',
        placeholder: 'whsec_xxxxx',
        required: false,
        helpText: 'Used to verify webhook authenticity (optional but recommended)'
      }
    ]
  },

  {
    provider: 'stripe',
    displayName: 'Stripe',
    type: 'PAYMENT_GATEWAY',
    description: 'Accept payments via Stripe (Credit/Debit cards, Wallets)',
    icon: '💳',
    enabled: false,  // ❌ Not implemented yet
    comingSoon: true,
    setupGuideUrl: 'https://stripe.com/docs/keys',
    fields: [
      {
        name: 'publishable_key',
        label: 'Publishable Key',
        type: 'text',
        placeholder: 'pk_test_xxxxx or pk_live_xxxxx',
        required: true,
        helpText: 'Safe to use in frontend code',
        pattern: '^pk_(test|live)_[a-zA-Z0-9]+$'
      },
      {
        name: 'secret_key',
        label: 'Secret Key',
        type: 'password',
        placeholder: 'sk_test_xxxxx or sk_live_xxxxx',
        required: true,
        helpText: 'Keep this secret! Only use in backend',
        pattern: '^sk_(test|live)_[a-zA-Z0-9]+$'
      },
      {
        name: 'webhook_secret',
        label: 'Webhook Secret',
        type: 'password',
        placeholder: 'whsec_xxxxx',
        required: false,
        helpText: 'For webhook verification (optional but recommended)'
      }
    ]
  },

  // ==========================================================================
  // SMS PROVIDERS
  // ==========================================================================
  
  {
    provider: 'msg91',
    displayName: 'MSG91',
    type: 'SMS_PROVIDER',
    description: 'Send OTP and promotional SMS via MSG91',
    icon: '📱',
    enabled: false,  // ❌ Not implemented yet
    comingSoon: true,
    setupGuideUrl: 'https://msg91.com/help/MSG91/getting-started',
    fields: [
      {
        name: 'auth_key',
        label: 'Auth Key',
        type: 'password',
        placeholder: 'Your MSG91 auth key',
        required: true,
        helpText: 'Found in MSG91 Dashboard → Settings → API Keys'
      },
      {
        name: 'sender_id',
        label: 'Sender ID',
        type: 'text',
        placeholder: 'MSGIND',
        required: true,
        helpText: '6 characters sender ID (must be approved by MSG91)'
      },
      {
        name: 'template_id',
        label: 'OTP Template ID',
        type: 'text',
        placeholder: '1234567890',
        required: false,
        helpText: 'Pre-approved DLT template ID for OTP messages (required for India)'
      }
    ]
  },

  {
    provider: 'fast2sms',
    displayName: 'Fast2SMS',
    type: 'SMS_PROVIDER',
    description: 'Send bulk SMS and OTP via Fast2SMS',
    icon: '📱',
    enabled: false,  // ❌ Not implemented yet
    comingSoon: true,
    setupGuideUrl: 'https://docs.fast2sms.com/',
    fields: [
      {
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your Fast2SMS API key',
        required: true,
        helpText: 'Found in Fast2SMS Dashboard → Dev API → API Key'
      }
    ]
  },

  {
    provider: 'twilio',
    displayName: 'Twilio',
    type: 'SMS_PROVIDER',
    description: 'Send SMS and WhatsApp messages via Twilio',
    icon: '📱',
    enabled: false,  // ❌ Not implemented yet
    comingSoon: true,
    setupGuideUrl: 'https://www.twilio.com/docs/sms',
    fields: [
      {
        name: 'account_sid',
        label: 'Account SID',
        type: 'text',
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        required: true,
        helpText: 'Found in Twilio Console → Account Info'
      },
      {
        name: 'auth_token',
        label: 'Auth Token',
        type: 'password',
        placeholder: 'Your auth token',
        required: true,
        helpText: 'Keep this secret! Found in Twilio Console'
      },
      {
        name: 'phone_number',
        label: 'Twilio Phone Number',
        type: 'text',
        placeholder: '+1234567890',
        required: true,
        helpText: 'Your Twilio phone number (with country code)'
      }
    ]
  },

  // ==========================================================================
  // EMAIL SERVICES
  // ==========================================================================
  
  {
    provider: 'sendgrid',
    displayName: 'SendGrid',
    type: 'EMAIL_SERVICE',
    description: 'Send transactional and marketing emails via SendGrid',
    icon: '📧',
    enabled: false,  // ❌ Not implemented yet
    comingSoon: true,
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
        helpText: 'Must be verified in SendGrid (Sender Authentication)'
      },
      {
        name: 'from_name',
        label: 'From Name',
        type: 'text',
        placeholder: 'Your Store Name',
        required: false,
        helpText: 'Display name for emails (e.g., "My Store Support")'
      }
    ]
  },

  {
    provider: 'aws_ses',
    displayName: 'AWS SES',
    type: 'EMAIL_SERVICE',
    description: 'Send emails via Amazon Simple Email Service',
    icon: '📧',
    enabled: false,  // ❌ Not implemented yet
    comingSoon: true,
    setupGuideUrl: 'https://docs.aws.amazon.com/ses/',
    fields: [
      {
        name: 'access_key_id',
        label: 'Access Key ID',
        type: 'text',
        placeholder: 'AKIAxxxxxxxxxxxxxxxx',
        required: true,
        helpText: 'AWS IAM access key with SES permissions'
      },
      {
        name: 'secret_access_key',
        label: 'Secret Access Key',
        type: 'password',
        placeholder: 'Your secret key',
        required: true,
        helpText: 'Keep this secret! AWS IAM secret key'
      },
      {
        name: 'region',
        label: 'AWS Region',
        type: 'text',
        placeholder: 'us-east-1',
        required: true,
        helpText: 'AWS region where SES is configured (e.g., us-east-1, ap-south-1)'
      },
      {
        name: 'from_email',
        label: 'From Email',
        type: 'email',
        placeholder: 'noreply@yourstore.com',
        required: true,
        helpText: 'Must be verified in AWS SES'
      }
    ]
  }
];

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Get configuration for a specific provider
 * 
 * Example:
 * ```typescript
 * const razorpayConfig = getIntegrationConfig('razorpay');
 * // Returns the full config object for Razorpay
 * ```
 */
export function getIntegrationConfig(provider: string): IntegrationProviderConfig | undefined {
  return INTEGRATION_CONFIGS.find(config => config.provider === provider);
}

/**
 * Get all providers for a specific integration type
 * 
 * Example:
 * ```typescript
 * const paymentProviders = getProvidersByType('PAYMENT_GATEWAY');
 * // Returns: [razorpay config, stripe config, ...]
 * 
 * const smsProviders = getProvidersByType('SMS_PROVIDER');
 * // Returns: [msg91 config, fast2sms config, twilio config, ...]
 * ```
 */
export function getProvidersByType(type: IntegrationType): IntegrationProviderConfig[] {
  return INTEGRATION_CONFIGS.filter(config => config.type === type);
}

/**
 * Get all unique integration types that have providers configured
 * 
 * Example:
 * ```typescript
 * const types = getAvailableTypes();
 * // Returns: ['PAYMENT_GATEWAY', 'SMS_PROVIDER', 'EMAIL_SERVICE']
 * ```
 */
export function getAvailableTypes(): IntegrationType[] {
  const uniqueTypes = new Set(INTEGRATION_CONFIGS.map(config => config.type));
  return Array.from(uniqueTypes);
}

// ============================================================================
// HOW TO ADD A NEW SERVICE
// ============================================================================

/*
To add a new integration service:

1. Copy an existing config that's similar
2. Change the provider, displayName, description
3. Update the fields array with required fields
4. Add setupGuideUrl to service's documentation
5. That's it! The UI will automatically show the new service.

Example - Adding PayPal:

{
  provider: 'paypal',
  displayName: 'PayPal',
  type: 'PAYMENT_GATEWAY',
  description: 'Accept payments via PayPal',
  icon: '💳',
  setupGuideUrl: 'https://developer.paypal.com/docs/api/overview/',
  fields: [
    {
      name: 'client_id',
      label: 'Client ID',
      type: 'text',
      placeholder: 'Your PayPal client ID',
      required: true,
      helpText: 'Found in PayPal Developer Dashboard'
    },
    {
      name: 'client_secret',
      label: 'Client Secret',
      type: 'password',
      placeholder: 'Your PayPal secret',
      required: true,
      helpText: 'Keep this secret!'
    },
    {
      name: 'mode',
      label: 'Mode',
      type: 'text',
      placeholder: 'sandbox or live',
      required: true,
      helpText: 'Use "sandbox" for testing, "live" for production'
    }
  ]
}

Just add this to INTEGRATION_CONFIGS array and you're done!
*/
