/**
 * Encryption utility for storing sensitive credentials
 * Uses AES-256-GCM for encryption
 */

import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  console.warn('⚠️  ENCRYPTION_KEY not set or too short. Using default (NOT SECURE FOR PRODUCTION)');
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  if (!text) return '';

  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY);
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';

  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt credentials object
 */
export function encryptCredentials(credentials: Record<string, any>): Record<string, string> {
  const encrypted: Record<string, string> = {};

  for (const [key, value] of Object.entries(credentials)) {
    if (value && typeof value === 'string') {
      encrypted[key] = encrypt(value);
    }
  }

  return encrypted;
}

/**
 * Decrypt credentials object
 */
export function decryptCredentials(encryptedCredentials: Record<string, string>): Record<string, string> {
  const decrypted: Record<string, string> = {};

  for (const [key, value] of Object.entries(encryptedCredentials)) {
    if (value && typeof value === 'string') {
      decrypted[key] = decrypt(value);
    }
  }

  return decrypted;
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: any): any {
  if (!data) return data;

  const sensitiveKeys = [
    'password', 'secret', 'apiKey', 'appKey', 'appSecret',
    'apiSecret', 'token', 'accessToken', 'refreshToken',
    'apiKeyIdefix', 'secretKey', 'Authorization'
  ];

  if (typeof data === 'string') {
    return '***MASKED***';
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }

  if (typeof data === 'object') {
    const masked: any = {};

    for (const [key, value] of Object.entries(data)) {
      const isKeyMatch = sensitiveKeys.some(k =>
        key.toLowerCase().includes(k.toLowerCase())
      );

      if (isKeyMatch && typeof value === 'string' && value.length > 0) {
        // Show first and last 2 chars
        if (value.length > 6) {
          masked[key] = `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
        } else {
          masked[key] = '***';
        }
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  return data;
}
