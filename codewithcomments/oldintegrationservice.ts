/**
 * ============================================================================
 * INTEGRATION SERVICE - Manage Third-Party Service Credentials
 * ============================================================================
 * 
 * This service provides functions to save, retrieve, and manage store-specific
 * integrations (payment gateways, SMS providers, email services, etc.)
 * 
 * Key Features:
 * - Save encrypted credentials to database
 * - Retrieve and decrypt credentials when needed
 * - Handle default provider selection (when multiple providers of same type)
 * - List integrations without exposing credentials
 * 
 * Example Use Cases:
 * 1. User adds Razorpay credentials → Saved encrypted in DB
 * 2. Checkout needs payment keys → Retrieved and decrypted automatically
 * 3. User has both Razorpay & Stripe → Mark Razorpay as default
 * 4. SMS service needs auth key → Retrieved for that specific store
 * 
 * Security:
 * - Credentials always encrypted before storage
 * - Decrypted only when needed (in memory)
 * - Never returned in API responses (getIntegrations excludes credentials)
 * ============================================================================
 */

import prismadb from '@/lib/prismadb';
import { encryption } from '@/lib/encryption';
// Import IntegrationType from generated Prisma client
import { IntegrationType } from '@/generated/prisma';

export const integrationService = {
  /**
   * ============================================================================
   * SAVE INTEGRATION CREDENTIALS
   * ============================================================================
   * 
   * Saves or updates integration credentials for a store.
   * If integration already exists, updates it. If not, creates new.
   * 
   * @param params.storeId - The store these credentials belong to
   * @param params.type - Type of integration (PAYMENT_GATEWAY, SMS_PROVIDER, etc.)
   * @param params.provider - Specific provider name (razorpay, stripe, msg91, etc.)
   * @param params.credentials - Object with API keys/secrets to encrypt and store
   * @param params.config - Optional non-sensitive settings (stored unencrypted)
   * @param params.isDefault - Should this be the default provider for this type?
   * 
   * @returns The saved integration record (without decrypted credentials)
   * 
   * Example Usage:
   * ```typescript
   * await integrationService.saveIntegration({
   *   storeId: "store-123",
   *   type: "PAYMENT_GATEWAY",
   *   provider: "razorpay",
   *   credentials: {
   *     key_id: "rzp_test_1234",
   *     key_secret: "secret123",
   *     webhook_secret: "whsec_xyz"
   *   },
   *   isDefault: true
   * });
   * ```
   * ============================================================================
   */
  async saveIntegration(params: {
    storeId: string;
    type: IntegrationType;
    provider: string;
    credentials: Record<string, string | number | boolean>;
    config?: Record<string, string | number | boolean>;
    isDefault?: boolean;
  }) {
    const { storeId, type, provider, credentials, config, isDefault } = params;
    
    // Step 1: Encrypt credentials before storing
    // This converts the object to an encrypted string
    const encryptedCredentials = encryption.encrypt(credentials);
    
    // Step 2: If this integration is being set as default,
    // unset the default flag on all other integrations of the same type for this store
    // Example: If setting Razorpay as default, unset Stripe's default flag
    if (isDefault) {
      await prismadb.storeIntegration.updateMany({
        where: { 
          storeId, 
          type 
        },
        data: { 
          isDefault: false 
        }
      });
    }
    
    // Step 3: Upsert (Update if exists, Insert if doesn't)
    // The unique constraint is [storeId, type, provider]
    // So one store can't have duplicate Razorpay payment gateway
    return await prismadb.storeIntegration.upsert({
      where: {
        storeId_type_provider: {
          storeId,
          type,
          provider
        }
      },
      // If record exists, update these fields
      update: {
        credentials: encryptedCredentials,
        config: config || undefined,
        isDefault: isDefault || false,
        updatedAt: new Date()
      },
      // If record doesn't exist, create with these fields
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
   * ============================================================================
   * GET DECRYPTED CREDENTIALS
   * ============================================================================
   * 
   * Retrieves and decrypts credentials for a specific integration.
   * Can fetch specific provider or the default one.
   * 
   * @param storeId - The store to get credentials for
   * @param type - Type of integration (PAYMENT_GATEWAY, SMS_PROVIDER, etc.)
   * @param provider - Optional: specific provider (razorpay, stripe, etc.)
   *                   If not provided, returns default provider for that type
   * 
   * @returns Decrypted credentials object or null if not found
   * 
   * Example Usage:
   * ```typescript
   * // Get default payment gateway (e.g., Razorpay if it's default)
   * const creds = await integrationService.getCredentials(
   *   "store-123",
   *   "PAYMENT_GATEWAY"
   * );
   * // Returns: { key_id: "rzp_test_xxx", key_secret: "yyy", ... }
   * 
   * // Get specific provider
   * const stripeCreds = await integrationService.getCredentials(
   *   "store-123",
   *   "PAYMENT_GATEWAY",
   *   "stripe"
   * );
   * // Returns: { publishable_key: "pk_test_xxx", secret_key: "yyy", ... }
   * ```
   * ============================================================================
   */
  async getCredentials(
    storeId: string,
    type: IntegrationType,
    provider?: string
  ): Promise<Record<string, string | number | boolean> | null> {
    let integration;
    
    if (provider) {
      // Case 1: User wants a specific provider (e.g., "stripe")
      integration = await prismadb.storeIntegration.findUnique({
        where: {
          storeId_type_provider: { storeId, type, provider }
        }
      });
    } else {
      // Case 2: User wants the default provider for this type
      
      // First, try to find the one marked as default
      integration = await prismadb.storeIntegration.findFirst({
        where: { 
          storeId, 
          type, 
          isDefault: true, 
          isActive: true 
        }
      });
      
      // If no default found (maybe user forgot to mark one as default),
      // just return any active integration of this type
      if (!integration) {
        integration = await prismadb.storeIntegration.findFirst({
          where: { 
            storeId, 
            type, 
            isActive: true 
          }
        });
      }
    }
    
    // If no integration found, return null
    if (!integration) return null;
    
    // Decrypt the credentials and return them
    // The credentials field in DB is encrypted string
    // This converts it back to the original object
    return encryption.decrypt(integration.credentials);
  },

  /**
   * ============================================================================
   * GET ALL INTEGRATIONS (WITHOUT CREDENTIALS)
   * ============================================================================
   * 
   * Returns list of all integrations for a store WITHOUT decrypting credentials.
   * This is safe to use in API responses as it doesn't expose secrets.
   * 
   * Use this to show user which integrations they have configured.
   * 
   * @param storeId - The store to get integrations for
   * @returns Array of integration records (without credentials field)
   * 
   * Example Usage:
   * ```typescript
   * const integrations = await integrationService.getIntegrations("store-123");
   * // Returns:
   * // [
   * //   { id: "xxx", type: "PAYMENT_GATEWAY", provider: "razorpay", isDefault: true, isActive: true },
   * //   { id: "yyy", type: "SMS_PROVIDER", provider: "msg91", isDefault: true, isActive: true }
   * // ]
   * ```
   * 
   * Use this to:
   * - Show "Configured" badge on integration cards
   * - Display list of active integrations
   * - Check which providers are set up
   * ============================================================================
   */
  async getIntegrations(storeId: string) {
    const integrations = await prismadb.storeIntegration.findMany({
      where: { storeId },
      select: {
        id: true,
        type: true,
        provider: true,
        config: true,          // Non-sensitive config is OK to return
        isActive: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true
        // IMPORTANT: credentials field is NOT selected
        // This keeps API responses secure
      }
    });
    
    return integrations;
  },

  /**
   * ============================================================================
   * CHECK IF INTEGRATION EXISTS
   * ============================================================================
   * 
   * Quick check to see if a store has configured a specific integration.
   * Useful for conditional logic (e.g., show setup banner if payment not configured)
   * 
   * @param storeId - The store to check
   * @param type - Type of integration
   * @param provider - Optional: specific provider to check
   * @returns true if integration exists and is active, false otherwise
   * 
   * Example Usage:
   * ```typescript
   * // Check if store has any payment gateway
   * const hasPayment = await integrationService.hasIntegration(
   *   "store-123",
   *   "PAYMENT_GATEWAY"
   * );
   * 
   * // Check if store specifically has Razorpay
   * const hasRazorpay = await integrationService.hasIntegration(
   *   "store-123",
   *   "PAYMENT_GATEWAY",
   *   "razorpay"
   * );
   * ```
   * ============================================================================
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
        provider, // Optional: if provided, checks for specific provider
        isActive: true
      }
    });
    
    return count > 0;
  },

  /**
   * ============================================================================
   * DELETE INTEGRATION
   * ============================================================================
   * 
   * Removes an integration from the database.
   * This will delete all encrypted credentials permanently.
   * 
   * @param storeId - The store this integration belongs to
   * @param type - Type of integration
   * @param provider - Specific provider to delete
   * @returns The deleted integration record
   * 
   * Example Usage:
   * ```typescript
   * await integrationService.deleteIntegration(
   *   "store-123",
   *   "PAYMENT_GATEWAY",
   *   "razorpay"
   * );
   * ```
   * ============================================================================
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

// ============================================================================
// USAGE FLOW EXAMPLE
// ============================================================================

/*
// SCENARIO 1: User configures Razorpay for their store
// (This happens when user fills form in Settings → Integrations)

await integrationService.saveIntegration({
  storeId: "store-abc123",
  type: "PAYMENT_GATEWAY",
  provider: "razorpay",
  credentials: {
    key_id: "rzp_test_1234567890",
    key_secret: "abcdefghijklmnop",
    webhook_secret: "whsec_xyz123"
  },
  isDefault: true
});

// SCENARIO 2: Customer makes a purchase, checkout needs Razorpay keys
// (This happens in checkout API route)

const razorpayCreds = await integrationService.getCredentials(
  "store-abc123",
  "PAYMENT_GATEWAY"  // No provider specified, gets default (Razorpay)
);

// razorpayCreds is now: { key_id: "rzp_test_1234567890", key_secret: "...", ... }

const razorpayInstance = new Razorpay({
  key_id: razorpayCreds.key_id,
  key_secret: razorpayCreds.key_secret
});

// SCENARIO 3: User wants to add Stripe as well (keep Razorpay as default)

await integrationService.saveIntegration({
  storeId: "store-abc123",
  type: "PAYMENT_GATEWAY",
  provider: "stripe",
  credentials: {
    publishable_key: "pk_test_xxx",
    secret_key: "sk_test_yyy"
  },
  isDefault: false  // Razorpay remains default
});

// SCENARIO 4: Show user which integrations they have configured
// (This happens in Settings → Integrations page)

const integrations = await integrationService.getIntegrations("store-abc123");
// Returns:
// [
//   { type: "PAYMENT_GATEWAY", provider: "razorpay", isDefault: true },
//   { type: "PAYMENT_GATEWAY", provider: "stripe", isDefault: false }
// ]

// Use this to show "Configured" badges and default indicators in UI
*/
