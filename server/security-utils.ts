import { z } from "zod";
import crypto from 'crypto';

// Input validation limits to prevent abuse
export const VALIDATION_LIMITS = {
  // Text input limits
  SHORT_TEXT: 100,      // Names, titles, short descriptions
  MEDIUM_TEXT: 500,     // Addresses, descriptions
  LONG_TEXT: 5000,      // Large descriptions, notes
  VERY_LONG_TEXT: 50000, // Rich content, articles
  
  // Numeric limits
  DECIMAL_PRECISION: 10,
  DECIMAL_SCALE: 2,
  
  // File limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// SQL injection pattern detection
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
  /(;|\-\-|\/\*|\*\/|xp_|sp_)/gi,
  /(\bOR\b.*=.*|1\s*=\s*1)/gi,
];

// XSS pattern detection
const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick, onerror, etc.
];

/**
 * Check if string contains potential SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Check if string contains potential XSS patterns
 */
export function containsXss(input: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Sanitize string input for safe database storage
 * This is a basic sanitization - Zod validation and parameterized queries are primary defense
 */
export function sanitizeInput(input: string): string {
  // Trim whitespace
  let sanitized = input.trim();
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Normalize unicode
  sanitized = sanitized.normalize('NFC');
  
  return sanitized;
}

/**
 * Enhanced Zod string validator with security checks
 */
export function secureString(options: {
  minLength?: number;
  maxLength: number;
  allowEmpty?: boolean;
  checkSqlInjection?: boolean;
  checkXss?: boolean;
  fieldName?: string;
}) {
  const {
    minLength = 0,
    maxLength,
    allowEmpty = false,
    checkSqlInjection = false,
    checkXss = false,
    fieldName = 'Input',
  } = options;

  let schema = z.string();

  if (!allowEmpty) {
    schema = schema.min(minLength, `${fieldName} must be at least ${minLength} characters`);
  }

  schema = schema.max(maxLength, `${fieldName} cannot exceed ${maxLength} characters`);

  return schema.refine((val) => {
    if (checkSqlInjection && containsSqlInjection(val)) {
      return false;
    }
    if (checkXss && containsXss(val)) {
      return false;
    }
    return true;
  }, {
    message: `${fieldName} contains invalid characters or patterns`,
  }).transform(sanitizeInput);
}

/**
 * Validate email with additional security checks
 */
export const secureEmail = z
  .string()
  .email('Invalid email format')
  .max(VALIDATION_LIMITS.SHORT_TEXT, 'Email is too long')
  .toLowerCase()
  .transform(sanitizeInput);

/**
 * Validate phone number
 */
export const securePhone = z
  .string()
  .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format')
  .max(20, 'Phone number is too long')
  .transform(sanitizeInput);

/**
 * Validate URL
 */
export const secureUrl = z
  .string()
  .url('Invalid URL format')
  .max(VALIDATION_LIMITS.MEDIUM_TEXT, 'URL is too long')
  .refine((url) => {
    // Only allow http and https protocols
    return url.startsWith('http://') || url.startsWith('https://');
  }, 'Only HTTP and HTTPS URLs are allowed');

/**
 * Validate price/currency values
 */
export const securePrice = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format')
  .refine((val) => {
    const num = parseFloat(val);
    return num >= 0 && num <= 999999999.99;
  }, 'Price must be between 0 and 999,999,999.99');

/**
 * Rate limiting helper - check if IP has exceeded limits
 */
export function isRateLimited(
  attempts: Map<string, { count: number; resetAt: number }>,
  ip: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    // Reset or create new record
    attempts.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (record.count >= maxAttempts) {
    return true;
  }

  record.count++;
  return false;
}

/**
 * Security headers helper
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
} as const;

// ============================================
// Encryption Helpers for Sensitive Data
// ============================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

// Development-only fallback key (NOT secure for production)
const DEV_FALLBACK_KEY = crypto.scryptSync('homebase-dev-only', 'dev-salt-do-not-use', KEY_LENGTH);
let keyWarningLogged = false;

// Get encryption key from environment
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.DATA_ENCRYPTION_KEY;
  
  if (keyEnv) {
    // Validate key length (should be 64 hex characters = 32 bytes)
    if (keyEnv.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyEnv)) {
      console.error('[Security] DATA_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
      throw new Error('Invalid DATA_ENCRYPTION_KEY format');
    }
    return Buffer.from(keyEnv, 'hex');
  }
  
  // In production, require the key
  if (process.env.NODE_ENV === 'production') {
    console.error('[Security] CRITICAL: DATA_ENCRYPTION_KEY must be set in production!');
    throw new Error('DATA_ENCRYPTION_KEY is required in production');
  }
  
  // Development fallback with warning
  if (!keyWarningLogged) {
    console.warn('[Security] WARNING: Using development fallback encryption key. Set DATA_ENCRYPTION_KEY for production.');
    keyWarningLogged = true;
  }
  return DEV_FALLBACK_KEY;
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param plaintext - The data to encrypt
 * @returns Encrypted data as base64 string (IV:AuthTag:Ciphertext)
 */
export function encryptData(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Format: IV:AuthTag:Ciphertext (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption] Error encrypting data:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data using AES-256-GCM
 * @param ciphertext - The encrypted data (IV:AuthTag:Ciphertext format)
 * @returns Decrypted plaintext
 */
export function decryptData(ciphertext: string): string {
  try {
    const key = getEncryptionKey();
    const parts = ciphertext.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Encryption] Error decrypting data:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data (one-way, for comparison)
 * Uses SHA-256 with salt
 */
export function hashSensitiveData(data: string, salt?: string): string {
  const useSalt = salt || process.env.HASH_SALT || 'homebase-hash-salt';
  return crypto
    .createHash('sha256')
    .update(data + useSalt)
    .digest('hex');
}

/**
 * Mask sensitive data for display (e.g., SSN: ***-**-1234)
 */
export function maskSensitiveData(data: string, visibleChars: number = 4, maskChar: string = '*'): string {
  if (data.length <= visibleChars) {
    return maskChar.repeat(data.length);
  }
  
  const masked = maskChar.repeat(data.length - visibleChars);
  const visible = data.slice(-visibleChars);
  return masked + visible;
}

/**
 * Mask email address for display (e.g., j***@example.com)
 */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***@***';
  
  const localPart = parts[0];
  const domain = parts[1];
  
  if (localPart.length <= 2) {
    return `${localPart[0] || '*'}***@${domain}`;
  }
  
  return `${localPart[0]}${'*'.repeat(Math.min(localPart.length - 1, 5))}@${domain}`;
}

/**
 * Mask phone number for display (e.g., ***-***-1234)
 */
export function maskPhoneNumber(phone: string): string {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 4) {
    return '*'.repeat(digits.length);
  }
  
  const lastFour = digits.slice(-4);
  return `***-***-${lastFour}`;
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure OTP (numeric)
 */
export function generateSecureOTP(digits: number = 6): string {
  const max = Math.pow(10, digits);
  const min = Math.pow(10, digits - 1);
  const num = crypto.randomInt(min, max);
  return num.toString();
}

/**
 * Validate that a value looks encrypted (basic format check)
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  
  // Check if parts look like base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return parts.every(part => base64Regex.test(part));
}
