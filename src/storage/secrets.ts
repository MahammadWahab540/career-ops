/**
 * Secrets management for portal credentials
 * In production, integrate with AWS KMS, GCP Secret Manager, or HashiCorp Vault
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.SECRETS_ENCRYPTION_KEY;

// Simple AES-256-GCM encryption for local dev
// In production, use a proper secrets manager

export interface SecretReference {
  keyId: string;
  encryptedValue?: string;
  kmsProvider?: 'aws' | 'gcp' | 'vault' | 'local';
}

/**
 * Encrypt a secret value locally (dev only)
 */
export function encryptSecret(value: string): { encrypted: string; iv: string } {
  if (!ENCRYPTION_KEY) {
    // In dev without key, just base64 encode (NOT SECURE - dev only)
    return {
      encrypted: Buffer.from(value).toString('base64'),
      iv: 'dev',
    };
  }

  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(value, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag().toString('base64');
  
  return {
    encrypted: `${encrypted}:${authTag}`,
    iv: iv.toString('hex'),
  };
}

/**
 * Decrypt a secret value locally (dev only)
 */
export function decryptSecret(encrypted: string, iv: string): string {
  if (!ENCRYPTION_KEY || iv === 'dev') {
    // In dev without key, just base64 decode
    return Buffer.from(encrypted, 'base64').toString('utf8');
  }

  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const [ciphertext, authTag] = encrypted.split(':');
  
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  
  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Store a portal credential reference
 * In production, this would call KMS/Secrets Manager API
 */
export async function storeSecret(
  portalId: string,
  secretValue: string
): Promise<SecretReference> {
  // TODO: In production, call AWS Secrets Manager / GCP Secret Manager / Vault
  // For now, encrypt locally and return reference
  
  const { encrypted, iv } = encryptSecret(secretValue);
  
  return {
    keyId: `portal_${portalId}`,
    encryptedValue: `${iv}:${encrypted}`,
    kmsProvider: 'local',
  };
}

/**
 * Retrieve and decrypt a portal credential
 */
export async function retrieveSecret(ref: SecretReference): Promise<string> {
  if (!ref.encryptedValue) {
    throw new Error(`No encrypted value found for secret ${ref.keyId}`);
  }

  // TODO: In production, call KMS/Secrets Manager to decrypt
  const [iv, encrypted] = ref.encryptedValue.split(':');
  return decryptSecret(encrypted, iv);
}

/**
 * Delete a secret
 */
export async function deleteSecret(ref: SecretReference): Promise<void> {
  // TODO: In production, mark secret for deletion in Secrets Manager
  console.log(`Secret ${ref.keyId} marked for deletion`);
}
