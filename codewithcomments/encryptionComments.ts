/**
 * ============================================================================
 * ENCRYPTION SERVICE - AES-256-CBC Encryption for Sensitive Data
 * ============================================================================
 * 
 * This service provides secure encryption/decryption for storing sensitive
 * credentials like API keys, secrets, tokens in the database.
 * 
 * Why Encryption?
 * - Database breaches are common
 * - API keys in plain text = instant compromise
 * - Regulatory compliance (GDPR, PCI DSS)
 * 
 * How it Works:
 * 1. Takes a JSON object with credentials
 * 2. Converts to string
 * 3. Encrypts using AES-256-CBC with random IV
 * 4. Returns encrypted string in format: "iv:encryptedData"
 * 5. Stores in database
 * 
 * Decryption reverses the process.
 * 
 * Security Notes:
 * - Uses AES-256-CBC (Advanced Encryption Standard, 256-bit key)
 * - Each encryption uses a unique IV (Initialization Vector)
 * - Same data encrypted twice produces different outputs (good!)
 * - ENCRYPTION_KEY must be kept secret and backed up securely
 * ============================================================================
 */

import crypto from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

// The ENCRYPTION_KEY is a 32-byte (64 hex characters) secret key
// Generate one: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
// Store in .env file and NEVER commit to git
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

// Validate encryption key exists and has correct length
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    'ENCRYPTION_KEY must be 32 bytes (64 hex characters). ' +
    'Generate one with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"'
  );
}

// AES-256-CBC algorithm (industry standard)
const ALGORITHM = 'aes-256-cbc';

// Initialization Vector length (16 bytes for AES)
const IV_LENGTH = 16;

// ============================================================================
// ENCRYPTION SERVICE
// ============================================================================

export const encryption = {
  /**
   * Encrypts a JSON object into an encrypted string
   * 
   * @param data - Object to encrypt (e.g., {key_id: "rzp_test_xxx", key_secret: "yyy"})
   * @returns Encrypted string in format "iv:encryptedData"
   * 
   * Example:
   * const data = { key_id: "rzp_test_1234", key_secret: "secret123" };
   * const encrypted = encryption.encrypt(data);
   * // Result: "a1b2c3d4...16bytes:encrypted_data_here"
   */
  encrypt(data: Record<string, any>): string {
    // Step 1: Generate a random Initialization Vector (IV)
    // Why random? Makes each encryption unique even for same data
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Step 2: Create cipher with our algorithm, key, and IV
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'), // Convert hex string to buffer
      iv
    );
    
    // Step 3: Convert JavaScript object to JSON string
    const jsonString = JSON.stringify(data);
    
    // Step 4: Encrypt the data
    // .update() - encrypts the data
    // .final() - completes encryption and returns remaining data
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Step 5: Return IV and encrypted data together
    // Format: "iv:encryptedData"
    // We need IV later for decryption
    return iv.toString('hex') + ':' + encrypted;
  },

  /**
   * Decrypts an encrypted string back to a JSON object
   * 
   * @param encryptedData - Encrypted string in format "iv:encryptedData"
   * @returns Original decrypted object
   * 
   * Example:
   * const encrypted = "a1b2c3d4...16bytes:encrypted_data_here";
   * const decrypted = encryption.decrypt(encrypted);
   * // Result: { key_id: "rzp_test_1234", key_secret: "secret123" }
   */
  decrypt(encryptedData: string): Record<string, any> {
    // Step 1: Split the encrypted string to extract IV and encrypted data
    // encryptedData = "iv:encryptedText"
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');    // First part is IV
    const encrypted = parts[1];                  // Second part is encrypted data
    
    // Step 2: Create decipher with same algorithm, key, and the stored IV
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );
    
    // Step 3: Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Step 4: Parse JSON string back to object
    return JSON.parse(decrypted);
  }
};

// ============================================================================
// USAGE EXAMPLES (for reference, remove these comments in production)
// ============================================================================

/*
// Encrypting Razorpay credentials
const razorpayData = {
  key_id: "rzp_test_1234567890",
  key_secret: "abcdefghijklmnop",
  webhook_secret: "whsec_xyz123"
};

const encrypted = encryption.encrypt(razorpayData);
console.log(encrypted);
// Output: "a1b2c3d4e5f6...16bytes:long_encrypted_string"

// Store this encrypted string in database

// Later, when you need the credentials:
const decrypted = encryption.decrypt(encrypted);
console.log(decrypted);
// Output: { key_id: "rzp_test_1234567890", key_secret: "...", webhook_secret: "..." }


// Encrypting MSG91 credentials (different number of fields)
const msg91Data = {
  auth_key: "1234567890ABCDEF",
  sender_id: "MSGIND"
};

const encrypted2 = encryption.encrypt(msg91Data);
// Works perfectly! JSON flexibility allows any number of fields
*/
