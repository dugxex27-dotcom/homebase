import { z } from "zod";

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
