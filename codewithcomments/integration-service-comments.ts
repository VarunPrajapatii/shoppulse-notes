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
  }) {
    const { storeId, type, provider, credentials, config } = params;
    
    // Step 1: Encrypt credentials before storing
    const encryptedCredentials = encryption.encrypt(credentials);
    
    // Step 2: Upsert - Replace existing integration of this type or create new
    // The unique constraint is [storeId, type]
    // So one store can only have ONE provider per integration type
    // If Razorpay exists and user configures Stripe, Razorpay gets replaced
    return await prismadb.storeIntegration.upsert({
      where: {
        storeId_type: {
          storeId,
          type
        }
      },
      // If record exists (e.g., Razorpay), update to new provider (e.g., Stripe)
      update: {
        provider,  // Switch provider
        credentials: encryptedCredentials,
        config: config || undefined,
        updatedAt: new Date()
      },
      // If no record exists, create new
      create: {
        storeId,
        type,
        provider,
        credentials: encryptedCredentials,
        config: config || undefined
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
   * @returns Object with provider name and decrypted credentials, or null if not found
   * 
   * Example Usage:
   * ```typescript
   * // Get payment gateway credentials (returns whatever provider is configured)
   * const result = await integrationService.getCredentials(
   *   "store-123",
   *   "PAYMENT_GATEWAY"
   * );
   * 
   * if (result) {
   *   console.log(result.provider);     // "razorpay" or "stripe"
   *   console.log(result.credentials);  // { keyId: "xxx", keySecret: "yyy" }
   * }
   * 
   * // Use in checkout
   * const payment = await integrationService.getCredentials(storeId, "PAYMENT_GATEWAY");
   * if (payment?.provider === "razorpay") {
   *   const razorpay = new Razorpay({
   *     key_id: payment.credentials.keyId,
   *     key_secret: payment.credentials.keySecret
   *   });
   * }
   * ```
   * ============================================================================
   */
  async getCredentials(
    storeId: string,
    type: IntegrationType
  ): Promise<{
    provider: string;
    credentials: Record<string, string | number | boolean>;
    config?: Record<string, string | number | boolean>;
  } | null> {
    // Find the integration for this store and type
    // Since we only allow ONE provider per type, no need to specify provider
    const integration = await prismadb.storeIntegration.findUnique({
      where: {
        storeId_type: {
          storeId,
          type
        }
      }
    });
    
    // If no integration found, return null
    if (!integration) return null;
    
    // Decrypt the credentials and return complete info
    const decryptedCredentials = encryption.decrypt(integration.credentials);
    
    return {
      provider: integration.provider,
      credentials: decryptedCredentials,
      config: integration.config as Record<string, string | number | boolean> | undefined
    };
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
   * // Check if store has configured payment gateway
   * const hasPayment = await integrationService.hasIntegration(
   *   "store-123",
   *   "PAYMENT_GATEWAY"
   * );
   * 
   * if (!hasPayment) {
   *   throw new Error("Please configure a payment gateway first");
   * }
   * ```
   * ============================================================================
   */
  async hasIntegration(
    storeId: string,
    type: IntegrationType
  ): Promise<boolean> {
    const count = await prismadb.storeIntegration.count({
      where: {
        storeId,
        type
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
   * // User wants to switch from Razorpay to Stripe
   * // Step 1: Delete current payment gateway
   * await integrationService.deleteIntegration(
   *   "store-123",
   *   "PAYMENT_GATEWAY"
   * );
   * 
   * // Step 2: Add new provider (handled by saveIntegration with replace logic)
   * await integrationService.saveIntegration({
   *   storeId: "store-123",
   *   type: "PAYMENT_GATEWAY",
   *   provider: "stripe",
   *   credentials: { ... }
   * });
   * ```
   * ============================================================================
   */
  async deleteIntegration(
    storeId: string,
    type: IntegrationType
  ) {
    return await prismadb.storeIntegration.delete({
      where: {
        storeId_type: { storeId, type }
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
